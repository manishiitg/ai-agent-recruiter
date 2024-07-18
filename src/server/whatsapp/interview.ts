import { generateConversationReply } from "../../agent/interviewer/agent";
import { STAGE_COMPLETED, STAGE_INTERVIEW_NOT_DONE, STAGE_NEW, STAGE_TECH_QUES } from "../../agent/interviewer/rule_map";
import { ConversationMessage, Interview } from "../../agent/interviewer/types";
import { get_whatspp_conversations, getCandidateDetailsFromDB, getCandidateInterviewFromDB, saveCandidateInterviewToDB } from "../../db/mongo";
import { WhatsAppConversaion, WhatsAppCreds } from "../../db/types";
import { extractInfo } from "../../agent/interviewer/extract_info";
import { convertConversationToText } from "../../agent/interviewer/helper";
import { transitionStage } from "../../agent/interviewer/transitions";
import { question_to_ask_from_resume, single_question_to_ask_from_resume } from "../../agent/prompts/resume_question";
import { linkedJobProfileRules, NUMBER_OF_INTERVIEW_QUESTIONS } from "../../agent/jobconfig";
import { postAttachment, postMessage, postMessageToThread } from "../../communication/slack";
// import { STAGE_INTRODUCTION } from "../../agent/interviewer/rule_map";
import { ask_question_for_tech_interview } from "../../agent/prompts/interview_questions";
import { rate_tech_answer } from "../../agent/prompts/rate_interview";
import { rate_tech_answer_all_question } from "../../agent/prompts/rate_interview_all_question";
import sortBy from "lodash/sortBy";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { downloadFile } from "./util";
import { converToMp3 } from "../../integrations/mp3";
import { send_whatsapp_text_reply } from "../../integrations/plivo";

export const getInterviewObject = async (phoneNo: string) => {
  let interview: Interview;

  try {
    interview = await getCandidateInterviewFromDB(phoneNo);
  } catch {
    const candidate = await getCandidateDetailsFromDB(phoneNo);
    interview = {
      id: candidate.id,
      interview: {
        actions_taken: [],
        stage: STAGE_NEW,
        started_at: new Date(),
        updated_at: new Date(),
        resume: {
          full_resume_text: candidate.conversation?.resume?.full_resume_text || "",
          created_at: new Date(),
          SUMMARY: candidate.conversation?.resume?.SUMMARY || "",
        },
        info: candidate.conversation?.info,
        shortlisted: candidate.conversation?.shortlisted,
        interview_info: {
          is_interview_ok: 0,
          is_intro_done: 0,
          is_tech_question1_done: 0,
          is_tech_question2_done: 0,
          is_interview_reject: 0,
          is_tech_question3_done: 0,
          got_audio_file: false,
        },
      },
    };

    await saveCandidateInterviewToDB(interview);
  }
  return interview;
};

export const conduct_interview = async (
  phoneNo: string,
  conversation: ConversationMessage[],
  creds: WhatsAppCreds
): Promise<{
  message: string;
  action: string;
  stage: string;
}> => {
  let interview: Interview = await getInterviewObject(phoneNo);

  if (!interview.interview) {
    throw new Error("interview object not found!");
  }
  if (!interview.interview.interview_info) {
    throw new Error("interview info object not found!");
  }
  if (!interview.interview.resume?.full_resume_text) {
    throw new Error("interview resume is required");
  }
  if (!interview.interview.info) {
    throw new Error("interview job profile is required");
  }
  if (interview.interview?.conversation_completed) {
    console.log(phoneNo, "interview message processing completed", interview.interview.conversation_completed_reason);
    return { message: "", action: "completed", stage: "completed" };
  }

  if (interview.interview.info.gender && interview.interview.info.gender?.toLowerCase().includes("female")) {
    interview.interview.conversation_completed = true;
    interview.interview.conversation_completed_reason = "gender";
    await saveCandidateInterviewToDB(interview);
    return { message: "", action: "completed", stage: "completed" };
  }

  let llm = await generateConversationReply(phoneNo, interview, creds.name, conversation);
  let action = llm.action;
  let reply = llm.reply;

  if (interview.interview.actions_taken) {
    interview.interview.actions_taken.push(action);
  } else {
    interview.interview.actions_taken = [action];
  }

  if (action.includes("ask_for_interview")) {
    if (!interview.interview.interview_questions_asked) {
      interview.interview.interview_questions_asked = [
        {
          stage: interview.interview.stage,
          question_asked_to_user: reply,
          topic: "intro",
          expected_answer: "",
          question_generated: "",
        },
      ];
    } else {
      interview.interview.interview_questions_asked.push({
        stage: interview.interview.stage,
        question_asked_to_user: reply,
        topic: "intro",
        expected_answer: "",
        question_generated: "",
      });
    }
  }

  let stage_transition = false;
  if (interview.interview.stage === STAGE_NEW) {
    if (action.includes("candidate_accepted_for_interview")) {
      interview.interview.stage = STAGE_TECH_QUES;
      stage_transition = true;
    } else if (action.includes("candidate_rejected_for_interview")) {
      interview.interview.stage = STAGE_INTERVIEW_NOT_DONE;
      stage_transition = true;
    }
  }

  if (interview.interview.stage !== STAGE_INTERVIEW_NOT_DONE && interview.interview.stage !== STAGE_COMPLETED) {
    if (action.includes("candidate_ready_next_question")) {
      //
      // || action.includes("candidate_provided_wrong_answer")
      if (interview.interview.stage.includes(STAGE_TECH_QUES)) {
        stage_transition = true;
        const round = interview.interview.stage.replace(STAGE_TECH_QUES, "");
        const round_idx = round.length == 0 ? 0 : parseInt(round, 10);
        const next_round_idx = round_idx + 1;
        if (next_round_idx >= NUMBER_OF_INTERVIEW_QUESTIONS) {
          interview.interview.stage = STAGE_COMPLETED;
        } else {
          interview.interview.stage = `${STAGE_TECH_QUES}${next_round_idx}`;
        }
      }
    }
  }
  if (stage_transition) {
    console.log(phoneNo, "got new stage after transition", interview.interview.stage);
  }

  if (interview.interview.stage.includes(STAGE_TECH_QUES) && stage_transition) {
    const classified_job_profile = interview.interview.shortlisted?.job_profile;
    let question_topics: string[] = [];
    let job_criteria = ``;
    if (classified_job_profile) {
      for (const k in linkedJobProfileRules) {
        if (linkedJobProfileRules[k])
          if (classified_job_profile.includes(k) || k == classified_job_profile) {
            question_topics = linkedJobProfileRules[k].questions_to_ask;
            job_criteria = linkedJobProfileRules[k].resume_rating;
            break;
          }
      }
    }
    let topic_to_ask = "";
    let tech_question_to_ask = "";
    let tech_question_expected_answer = "";
    if (question_topics.length > 0) {
      const question_left_ask = question_topics.filter((question) => {
        const index = interview.interview?.interview_questions_asked?.findIndex((row) => row.topic === question);
        if (index === -1) {
          return true;
        } else {
          return false;
        }
      });
      console.log(phoneNo, "question_left_ask", question_left_ask, interview.interview?.interview_questions_asked, question_topics);
      if (question_left_ask.length == 0) {
        const randomIndex = Math.floor(Math.random() * question_topics.length);
        topic_to_ask = question_topics[randomIndex];
      } else {
        topic_to_ask = question_left_ask[0];
      }

      const previous_questions: string[] = [];
      interview.interview?.interview_questions_asked?.forEach((row) => previous_questions.push(row.question_generated));

      const generate_questions = await ask_question_for_tech_interview(classified_job_profile || "", question_left_ask[0], previous_questions);
      tech_question_to_ask = generate_questions.QUESTION1;
      tech_question_expected_answer = generate_questions.EXPECTED_ANSWER_1;
    } else {
      topic_to_ask = "resume_question";
      const generate_questions = await single_question_to_ask_from_resume(interview.interview.resume.full_resume_text, classified_job_profile || "", job_criteria);
      tech_question_to_ask = generate_questions.QUESTION1;
      tech_question_expected_answer = generate_questions.EXPECTED_ANSWER_1;
    }
    interview.interview.interview_info.got_audio_file = false;

    llm = await generateConversationReply(phoneNo, interview, creds.name, conversation, tech_question_to_ask);
    action = llm.action;
    if (interview.interview.actions_taken) {
      interview.interview.actions_taken.push(action);
    } else {
      interview.interview.actions_taken = [action];
    }
    reply = llm.reply;

    if (!interview.interview.interview_questions_asked) {
      interview.interview.interview_questions_asked = [
        {
          stage: interview.interview.stage,
          question_asked_to_user: reply,
          topic: topic_to_ask,
          expected_answer: tech_question_expected_answer,
          question_generated: tech_question_to_ask,
        },
      ];
    } else {
      interview.interview.interview_questions_asked.push({
        stage: interview.interview.stage,
        question_asked_to_user: reply,
        topic: topic_to_ask,
        expected_answer: tech_question_expected_answer,
        question_generated: tech_question_to_ask,
      });
    }
    await saveCandidateInterviewToDB(interview);
  } else if (stage_transition) {
    interview.interview.interview_info.got_audio_file = false;
    llm = await generateConversationReply(phoneNo, interview, creds.name, conversation);
    action = llm.action;
    if (interview.interview.actions_taken) {
      interview.interview.actions_taken.push(action);
    } else {
      interview.interview.actions_taken = [action];
    }
    reply = llm.reply;

    await saveCandidateInterviewToDB(interview);
  }

  if (interview.interview.stage === STAGE_COMPLETED || interview.interview.stage === STAGE_INTERVIEW_NOT_DONE) {
    interview.interview.conversation_completed = true;
    interview.interview.conversation_completed_reason = interview.interview.stage;
    await saveCandidateInterviewToDB(interview);
  }

  if (interview.interview.stage === STAGE_COMPLETED) {
    await callViaHuman(phoneNo, interview);
  }

  await saveCandidateInterviewToDB(interview);

  return { message: reply, action: action, stage: interview.interview?.stage || "" };
};

const callViaHuman = async (phoneNo: string, interview: Interview) => {
  let slack_action_channel_id = process.env.slack_final_action_channel_id || process.env.slack_action_channel_id;
  if (slack_action_channel_id) {
    let { slack_thread_id, channel_id } = await get_whatspp_conversations(phoneNo);
    if (slack_thread_id) {
      if (interview && interview.interview && interview.interview.interview_questions_asked) {
        if (channel_id == process.env.slack_action_channel_id) {
          await postMessageToThread(slack_thread_id, `moving to #whatapp-action-channel`, channel_id || process.env.slack_action_channel_id);
        }
        // let ratings = [];

        let all_questions = [];
        let all_answers = [];
        let all_expected_answers = [];
        for (const question of interview.interview.interview_questions_asked) {
          const audio_files = interview.interview.audio_file;
          const stage = question.stage;
          const audioOfStage = audio_files?.filter((row) => row.stage == stage);
          // await postMessageToThread(slack_thread_id, `Question:${stage}: ${question.question_asked_to_user}`, channel_id || process.env.slack_action_channel_id);
          // await postMessageToThread(slack_thread_id, `Expected Answer:${stage}: ${question.expected_answer}`, channel_id || process.env.slack_action_channel_id);

          all_questions.push(question.question_asked_to_user);
          all_expected_answers.push(question.expected_answer);
          // let answers = "";
          if (audioOfStage) {
            for (const audio of audioOfStage) {
              // await postMessageToThread(slack_thread_id, `Answer:${stage}: ${audio.transcribe}`, channel_id || process.env.slack_action_channel_id);
              // answers = audio.transcribe + "\n";
              all_answers.push(audio.transcribe);
            }
          }

          // const rating = await rate_tech_answer(phoneNo, interview, question.question_asked_to_user, answers);
          // await postMessageToThread(slack_thread_id, `Rating Reasong:${stage}: ${rating.SCRATCHPAD}`, channel_id || process.env.slack_action_channel_id);
          // await postMessageToThread(
          //   slack_thread_id,
          //   `Answer Rating: ${rating.QUESTION_RATING}  Debug: ${parseInt(rating.QUESTION_RATING.trim(), 10)}`,
          //   channel_id || process.env.slack_action_channel_id
          // );
          // ratings.push(rating.QUESTION_RATING);
        }
        let question_rating: string[] = [];
        if (all_questions.length > 0) {
          const rating_response = await rate_tech_answer_all_question(phoneNo, all_questions, all_answers, all_expected_answers);
          question_rating = rating_response.question_rating;
          await postMessageToThread(slack_thread_id, `HR Screening Final Rating: ${JSON.stringify(rating_response)}`, channel_id || process.env.slack_action_channel_id);
        }

        if (process.env.slack_hr_screening_channel_id && !interview.interview.send_on_final_slack) {
          interview.interview.send_on_final_slack = true;
          await saveCandidateInterviewToDB(interview);

          const candidate = await getCandidateDetailsFromDB(interview.id);
          if (candidate.conversation) {
            const msg = `HR Screening Completed ${candidate.id} ${candidate.conversation.info?.name} for job profile ${candidate.conversation?.shortlisted?.job_profile.trim()} Resume Rating ${
              candidate.conversation.resume_ratings
            } ${candidate.conversation.info?.location} ${candidate.conversation.info?.expected_ctc} ${candidate.conversation.info?.years_of_experiance} HR Screening Rating ${question_rating.join(",")}
          `;
            const slack_thread_id = await postMessage(msg, process.env.slack_hr_screening_channel_id);

            let { conversation } = await get_whatspp_conversations(phoneNo);
            const sortedConversation = sortBy(conversation, (conv: WhatsAppConversaion) => {
              return conv.created_at;
            });

            const resume_path = path.join(process.env.dirname ? process.env.dirname : "", phoneNo);
            try {
              for (const conv of sortedConversation) {
                if (conv.messageType == "media" && conv.body) {
                  if ("Media0" in conv.body) {
                    if ("MimeType" in conv.body && conv.body["MimeType"].includes("pdf")) {
                      if (!existsSync(resume_path)) {
                        mkdirSync(resume_path, { recursive: true });
                      }
                      let resume_file = path.join(resume_path, `${phoneNo}_resume.pdf`);
                      await downloadFile(conv.body.Media0, resume_file);
                      await postAttachment(resume_file, process.env.slack_hr_screening_channel_id, slack_thread_id);
                    }
                  }
                } else {
                }
              }
            } catch (error) {
              console.error(error);
            }

            try {
              if (interview.interview.audio_file) {
                let question_for_stage: Record<string, boolean> = {};
                for (const file of interview.interview.audio_file) {
                  for (const asked of interview.interview.interview_questions_asked) {
                    if (file.stage === asked.stage && !question_for_stage[asked.stage]) {
                      await postMessageToThread(slack_thread_id, `${asked.stage}:${asked.question_asked_to_user} : ${asked.topic}`, process.env.slack_hr_screening_channel_id);
                      question_for_stage[asked.stage] = true;
                    }
                  }

                  const resume_file = path.join(resume_path, `${candidate.id}_${file.stage}_audio.ogg`);
                  await downloadFile(file.fileUrl, resume_file);
                  try {
                    const mp3_path = await converToMp3(resume_file);

                    await postAttachment(mp3_path, process.env.slack_hr_screening_channel_id, slack_thread_id);
                  } catch (error) {
                    console.error(error);
                  }
                }
              }
            } catch (error) {
              console.error(error);
            }

            // question_rating
            let total_rating = question_rating.reduce((prev, cur) => {
              return prev + parseInt(cur);
            }, 0);

            await postMessageToThread(slack_thread_id, `Avg Rating ${total_rating / question_rating.length}`, process.env.slack_hr_screening_channel_id);

            const avg_rating = total_rating / question_rating.length;
            interview.interview.avg_rating = avg_rating;
            await saveCandidateInterviewToDB(interview);
          }
        }

        // slack_hr_screening_channel_id
      }

      // await postMessageToThread(slack_thread_id, `Question1: ${interview.interview?.tech_questions?.question1}`, channel_id || process.env.slack_action_channel_id);
      // await postMessageToThread(slack_thread_id, `Answer1: ${interview.interview?.tech_questions?.answer1}`, channel_id || process.env.slack_action_channel_id);
      // await postMessageToThread(slack_thread_id, `Question2: ${interview.interview?.tech_questions?.question2}`, channel_id || process.env.slack_action_channel_id);
      // await postMessageToThread(slack_thread_id, `Answer2: ${interview.interview?.tech_questions?.answer2}`, channel_id || process.env.slack_action_channel_id);
      // await postMessageToThread(slack_thread_id, `Question3: ${interview.interview?.tech_questions?.question3}`, channel_id || process.env.slack_action_channel_id);
      // await postMessageToThread(slack_thread_id, `Answer3: ${interview.interview?.tech_questions?.answer3}`, channel_id || process.env.slack_action_channel_id);
    } else {
      await postMessage(`HR Screening completed!`, channel_id || process.env.slack_action_channel_id);
    }
  }
};
