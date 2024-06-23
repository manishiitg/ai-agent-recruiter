import exp from "constants";
import { generateConversationReply } from "../../agent/interviewer/agent";
import { STAGE_COMPLETED, STAGE_INTERVIEW_NOT_DONE, STAGE_NEW, STAGE_TECH_QUES1 } from "../../agent/interviewer/rule_map";
import { ConversationMessage, Interview } from "../../agent/interviewer/types";
import { get_whatspp_conversations, getCandidateDetailsFromDB, getCandidateInterviewFromDB, saveCandidateInterviewToDB } from "../../db/mongo";
import { WhatsAppCreds } from "../../db/types";
import { extractInfo } from "../../agent/interviewer/extract_info";
import { convertConversationToText } from "../../agent/interviewer/helper";
import { transitionStage } from "../../agent/interviewer/transitions";
import { question_to_ask_from_resume } from "../../agent/prompts/resume_question";
import { linkedJobProfileRules } from "../../agent/recruiter/jobconfig";
import { postMessage, postMessageToThread } from "../../communication/slack";

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
  console.log("interview", interview);

  const info = await extractInfo(phoneNo, creds.name, convertConversationToText(conversation));
  if (interview.interview.debug) {
    interview.interview.debug.push(info.llm_output);
  } else {
    interview.interview.debug = [info.llm_output];
  }
  await saveCandidateInterviewToDB(interview);
  if (info.start_interview) {
    if (interview.interview.interview_info) {
      interview.interview.interview_info.is_interview_ok = info.start_interview as 0 | 1 | -1;
    }
  }
  if (info.introduction_done) {
    if (interview.interview.interview_info) {
      interview.interview.interview_info.is_intro_done = info.introduction_done as 0 | 1 | -1;
    }
  }
  if (info.first_tech_done) {
    if (interview.interview.interview_info) {
      interview.interview.interview_info.is_tech_question1_done = info.first_tech_done as 0 | 1 | -1;
    }
  }
  if (info.second_tech_done) {
    if (interview.interview.interview_info) {
      interview.interview.interview_info.is_tech_question2_done = info.second_tech_done as 0 | 1 | -1;
    }
  }
  if (info.reject_interview) {
    if (interview.interview.interview_info) {
      interview.interview.interview_info.is_interview_reject = info.reject_interview as 0 | 1 | -1;
    }
  }

  const newStage = transitionStage(interview);
  console.log("got new stage after transition", newStage);
  if (newStage.length) {
    interview.interview.stage = newStage;
    await saveCandidateInterviewToDB(interview);
  }

  if (interview.interview.stage == STAGE_TECH_QUES1 && !interview.interview.tech_questions) {
    let job_criteria = "";
    if (interview.interview.info?.suitable_job_profile) {
      for (const k in linkedJobProfileRules) {
        if (linkedJobProfileRules[k].is_open)
          if (interview.interview.info?.suitable_job_profile.includes(k) || k == interview.interview.info?.suitable_job_profile) {
            job_criteria += `Job Profile: ${k} \n Shortlisting Criteria: ${linkedJobProfileRules[k].full_criteria} \n\n`;
            break;
          }
      }
    }

    const questionsReply = await question_to_ask_from_resume(interview.interview.resume?.full_resume_text, interview.interview.info?.suitable_job_profile || "", job_criteria);
    interview.interview.tech_questions = {
      scratchpad: questionsReply.SCRATCHPAD,
      question1: questionsReply.QUESTION1,
      question2: questionsReply.QUESTION2,
      answer1: questionsReply.EXPECTED_ANSWER_1,
      answer2: questionsReply.EXPECTED_ANSWER_2,
    };
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

  const llm = await generateConversationReply(phoneNo, interview, creds.name, conversation);
  let action = llm.action;
  let reply = llm.reply;

  return { message: reply, action: action, stage: interview.interview?.stage || "" };
};

export const callViaHuman = async (phoneNo: string, interview: Interview) => {
  let slack_action_channel_id = process.env.slack_final_action_channel_id || process.env.slack_action_channel_id;
  if (slack_action_channel_id) {
    let { slack_thread_id, channel_id } = await get_whatspp_conversations(phoneNo);
    if (slack_thread_id) {
      await postMessageToThread(slack_thread_id, `HR Screening completed!`, channel_id || process.env.slack_action_channel_id, true);
      await postMessageToThread(slack_thread_id, `Question1: ${interview.interview?.tech_questions?.question1}`, channel_id || process.env.slack_action_channel_id);
      await postMessageToThread(slack_thread_id, `Answer1: ${interview.interview?.tech_questions?.answer1}`, channel_id || process.env.slack_action_channel_id);
      await postMessageToThread(slack_thread_id, `Question2: ${interview.interview?.tech_questions?.question2}`, channel_id || process.env.slack_action_channel_id);
      await postMessageToThread(slack_thread_id, `Answer2: ${interview.interview?.tech_questions?.answer2}`, channel_id || process.env.slack_action_channel_id);
    } else {
      await postMessage(`HR Screening completed!`, channel_id || process.env.slack_action_channel_id);
    }
  }
};
