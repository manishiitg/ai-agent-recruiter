import { generateConversationReply } from "../../agent/interviewer/agent";
import {
  STAGE_COMPLETED,
  STAGE_GENERATE_QUES,
  STAGE_INTERVIEW_NOT_DONE,
  STAGE_NEW,
  STAGE_TECH_QUES,
  STAGE_TECH_QUES1,
  STAGE_TECH_QUES2,
  STAGE_TECH_QUES3,
  STAGE_TECH_QUES4,
  STAGE_TECH_QUES5,
} from "../../agent/interviewer/rule_map";
import { ConversationMessage, Interview } from "../../agent/interviewer/types";
import { get_whatspp_conversations, getCandidateDetailsFromDB, getCandidateInterviewFromDB, saveCandidateInterviewToDB } from "../../db/mongo";
import { WhatsAppCreds } from "../../db/types";
import { extractInfo } from "../../agent/interviewer/extract_info";
import { convertConversationToText } from "../../agent/interviewer/helper";
import { transitionStage } from "../../agent/interviewer/transitions";
import { question_to_ask_from_resume, single_question_to_ask_from_resume } from "../../agent/prompts/resume_question";
import { linkedJobProfileRules } from "../../agent/jobconfig";
import { postMessage, postMessageToThread } from "../../communication/slack";
import { STAGE_INTRODUCTION } from "../../agent/interviewer/rule_map";
import { ask_question_for_tech_interview } from "../../agent/prompts/interview_questions";

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
    console.log("interview message processing completed", interview.interview.conversation_completed_reason);
    return { message: "", action: "completed", stage: "completed" };
  }
  // console.log("interview", interview);

  if (interview.interview.stage === STAGE_NEW || interview.interview.stage == STAGE_INTRODUCTION) {
    const info = await extractInfo(phoneNo, creds.name, convertConversationToText(conversation));
    await saveCandidateInterviewToDB(interview);
    if (info.start_interview) {
      if (interview.interview.interview_info) {
        interview.interview.interview_info.is_interview_ok = info.start_interview as 0 | 1 | -1;
      }
    }
    if (info.reject_interview) {
      if (interview.interview.interview_info) {
        interview.interview.interview_info.is_interview_reject = info.reject_interview as 0 | 1 | -1;
      }
    }
  }

  const newStage = transitionStage(interview);
  console.log("got new stage after transition", newStage);
  if (newStage.length && newStage != interview.interview.stage) {
    interview.interview.stage = newStage;
    if (newStage == STAGE_INTRODUCTION) {
      interview.interview.interview_info.got_audio_file = false;
    }
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

  let llm = await generateConversationReply(phoneNo, interview, creds.name, conversation);
  let action = llm.action;
  let reply = llm.reply;

  if (interview.interview.actions_taken) {
    interview.interview.actions_taken.push(action);
  } else {
    interview.interview.actions_taken = [action];
  }

  if (action == "ask_for_introduction") {
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

  if (action.includes("candidate_ready_next_question") || action.includes("candidate_answered_sent_recording")) {
    if (interview.interview.stage == STAGE_TECH_QUES5) {
      interview.interview.stage = STAGE_COMPLETED;
    } else if (interview.interview.stage === STAGE_TECH_QUES4) {
      interview.interview.stage = STAGE_TECH_QUES5;
    } else if (interview.interview.stage === STAGE_TECH_QUES3) {
      interview.interview.stage = STAGE_TECH_QUES4;
    } else if (interview.interview.stage === STAGE_TECH_QUES2) {
      interview.interview.stage = STAGE_TECH_QUES3;
    } else if (interview.interview.stage === STAGE_TECH_QUES1) {
      interview.interview.stage = STAGE_TECH_QUES2;
    } else if (interview.interview.stage === STAGE_TECH_QUES) {
      interview.interview.stage = STAGE_TECH_QUES1;
    } else if (interview.interview.stage === STAGE_INTRODUCTION) {
      interview.interview.stage = STAGE_TECH_QUES;
    }

    if (interview.interview.stage !== STAGE_COMPLETED) {
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
          const index = interview.interview?.interview_questions_asked?.findIndex((row) => {
            row.topic == question;
          });
          if (index === -1) {
            return true;
          } else {
            return false;
          }
        });
        if (question_left_ask.length == 0) {
          const randomIndex = Math.floor(Math.random() * question_topics.length);
          topic_to_ask = question_topics[randomIndex];
        } else {
          topic_to_ask = question_left_ask[0];
        }

        const generate_questions = await ask_question_for_tech_interview(classified_job_profile || "", question_left_ask[0]);
        tech_question_to_ask = generate_questions.QUESTION1;
        tech_question_expected_answer = generate_questions.EXPECTED_ANSWER_1;
      } else {
        topic_to_ask = "resume_question";
        const generate_questions = await single_question_to_ask_from_resume(interview.interview.resume.full_resume_text, classified_job_profile || "", job_criteria);
        tech_question_to_ask = generate_questions.QUESTION1;
        tech_question_expected_answer = generate_questions.EXPECTED_ANSWER_1;
      }

      llm = await generateConversationReply(phoneNo, interview, creds.name, conversation);
      let action = llm.action;
      if (interview.interview.actions_taken) {
        interview.interview.actions_taken.push(action);
      } else {
        interview.interview.actions_taken = [action];
      }
      let reply = llm.reply;

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
    }
  }

  await saveCandidateInterviewToDB(interview);

  return { message: reply, action: action, stage: interview.interview?.stage || "" };
};

export const callViaHuman = async (phoneNo: string, interview: Interview) => {
  let slack_action_channel_id = process.env.slack_final_action_channel_id || process.env.slack_action_channel_id;
  if (slack_action_channel_id) {
    let { slack_thread_id, channel_id } = await get_whatspp_conversations(phoneNo);
    if (slack_thread_id) {
      await postMessageToThread(slack_thread_id, `Question1: ${interview.interview?.tech_questions?.question1}`, channel_id || process.env.slack_action_channel_id);
      await postMessageToThread(slack_thread_id, `Answer1: ${interview.interview?.tech_questions?.answer1}`, channel_id || process.env.slack_action_channel_id);
      await postMessageToThread(slack_thread_id, `Question2: ${interview.interview?.tech_questions?.question2}`, channel_id || process.env.slack_action_channel_id);
      await postMessageToThread(slack_thread_id, `Answer2: ${interview.interview?.tech_questions?.answer2}`, channel_id || process.env.slack_action_channel_id);
      await postMessageToThread(slack_thread_id, `Question3: ${interview.interview?.tech_questions?.question3}`, channel_id || process.env.slack_action_channel_id);
      await postMessageToThread(slack_thread_id, `Answer3: ${interview.interview?.tech_questions?.answer3}`, channel_id || process.env.slack_action_channel_id);
      await postMessageToThread(slack_thread_id, `HR Screening completed!`, channel_id || process.env.slack_action_channel_id, true);
    } else {
      await postMessage(`HR Screening completed!`, channel_id || process.env.slack_action_channel_id);
    }
  }
};
