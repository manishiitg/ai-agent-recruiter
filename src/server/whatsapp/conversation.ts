import { generateConversationReply, STAGE_GOT_CTC, STAGE_GOT_REJECTED, STAGE_NEW, STAGE_SHORTLISTED } from "../../agent/recruiter/agent";
import { convertConversationToText, should_do_force_shortlist, shouldExtractInfo } from "../../agent/recruiter/helper";
import {
  classify_conversation,
  CONV_CLASSIFY_CANDIDATE_JOB,
  CONV_CLASSIFY_FRIEND,
  CONV_CLASSIFY_FRIEND_PREFIX,
  CONV_CLASSIFY_INSTITUTE_PLACEMENT,
  CONV_CLASSIFY_INSTITUTE_PLACEMENT_PREFIX,
  CONV_CLASSIFY_WISHES,
  CONV_CLASSIFY_WISHES_PREFIX,
  extractInfo,
} from "../../agent/recruiter/extract_info";
import { get_whatspp_conversations, getCandidateDetailsFromDB, saveCandidateConversationDebugInfoToDB, saveCandidateDetailsToDB } from "../../db/mongo";
import { Candidate, WhatsAppCreds } from "../../db/types";
import { summariseResume } from "../../agent/prompts/summary_resume_prompt";
import { transitionStage } from "../../agent/recruiter/transitions";
import { ConversationMessage } from "../../agent/recruiter/types/conversation";
import { askOptionsFromConsole } from "../../communication/console";
import { rate_resume, shortlist } from "../../agent/prompts/shortlist_prompt";
import { postMessage, postMessageToThread } from "../../communication/slack";

export const getCandidate = async (phoneNo: string) => {
  let candidate: Candidate;
  try {
    candidate = await getCandidateDetailsFromDB(phoneNo);
    console.log("candidate by profile id");
    if (!candidate.conversation) {
      candidate.conversation = {
        started_at: new Date(),
        stage: STAGE_NEW,
        actions_taken: [],
      };
      console.log("update candidate.current_converstaion_id new conversion 2");
    }
  } catch (error) {
    // const classifed_to = await classifyConversation(messageFrom ? messageFrom : "", creds.name, convertConversationToText(conversation));
    // classified_now = true;
    candidate = {
      id: phoneNo,
      conversation: {
        started_at: new Date(),
        stage: STAGE_NEW,
        actions_taken: [],
      },
      meta: {
        process_message: `${new Date().getTime()}`,
      },
    };
    // console.error("candidate mongo", error);
  }
  await saveCandidateDetailsToDB(candidate);
  return candidate;
};

export const process_whatsapp_conversation = async (
  phoneNo: string,
  conversation: ConversationMessage[],
  creds: WhatsAppCreds,
  callback: (reply: string) => void
): Promise<{
  message: string;
  action: string;
  stage: string;
}> => {
  let candidate = await getCandidate(phoneNo);
  if (candidate.conversation && !candidate.conversation?.actions_taken) {
    candidate.conversation.actions_taken = [];
  }

  // if (!classified_now && (candidate.conversation?.classifed_to?.category.includes(CONV_CLASSIFY_OTHERS) || candidate.conversation?.classifed_to?.category.includes(CONV_CLASSIFY_GREETINGS))) {
  //   const classifed_to = await classifyConversation(messageFrom ? messageFrom : "", creds.name, convertConversationToText(conversation));
  //   candidate.conversation.classifed_to = classifed_to;
  //   await saveCandidateDetailsToDB(candidate);
  // }

  if (candidate.conversation?.conversation_completed) {
    console.log("auto message processing completed", candidate.conversation.conversation_completed_reason);
    return { message: "", action: "completed", stage: "completed" };
  }

  console.log("candidate", candidate);

  if (!candidate.conversation) {
    throw new Error("candidate conversion not found!");
  }

  if (candidate.conversation.resume?.full_resume_text && (!candidate.conversation.resume.SUMMARY || candidate.conversation.resume.SUMMARY.length === 0)) {
    callback("Please wait while i go through your resume");
    const summaryResponse = await summariseResume(candidate.conversation.resume?.full_resume_text, phoneNo);
    candidate.conversation.resume = {
      created_at: new Date(),
      SUMMARY: summaryResponse.SUMMARY,
      full_resume_text: candidate.conversation.resume?.full_resume_text,
    };
    await saveCandidateDetailsToDB(candidate);
  }

  if (!candidate.conversation.classifed_to || !candidate.conversation.classifed_to.category.includes(CONV_CLASSIFY_CANDIDATE_JOB)) {
    const classifyResponse = await classify_conversation(phoneNo, convertConversationToText(conversation));
    candidate.conversation.classifed_to = {
      category: classifyResponse.CLASSIFIED_CATEGORY,
      reason: classifyResponse.REASON,
    };
  }

  if (shouldExtractInfo(candidate.conversation?.info) && candidate.conversation.resume && candidate.conversation.resume?.full_resume_text.length > 0) {
    //atleast two messages
    const info = await extractInfo(phoneNo, creds.name, convertConversationToText(conversation), candidate.conversation.resume?.full_resume_text);
    if (info) {
      candidate.conversation.info = info;
      await saveCandidateDetailsToDB(candidate);
    }
  }
  console.log("checking conv category", candidate.conversation?.classifed_to.category);
  if (!candidate.conversation?.classifed_to.category) {
    throw new Error("classification missing!");
  }
  if (
    candidate.conversation?.classifed_to.category.includes(CONV_CLASSIFY_INSTITUTE_PLACEMENT) ||
    candidate.conversation?.classifed_to.category.includes(CONV_CLASSIFY_INSTITUTE_PLACEMENT_PREFIX) ||
    candidate.conversation?.classifed_to.category.includes(CONV_CLASSIFY_WISHES) ||
    candidate.conversation?.classifed_to.category.includes(CONV_CLASSIFY_WISHES_PREFIX) ||
    candidate.conversation?.classifed_to.category.includes(CONV_CLASSIFY_FRIEND) ||
    candidate.conversation?.classifed_to.category.includes(CONV_CLASSIFY_FRIEND_PREFIX)
  ) {
    console.log("conversation type not supported skipping", candidate.conversation?.classifed_to.category);
    return { message: "Sorry this is only regarding job", action: "classify_non_job", stage: "" };
  }

  const new_stage = await transitionStage(candidate.conversation);
  if (new_stage.length) {
    console.log(`changing stage from ${candidate.conversation.stage} to ${new_stage}`);
    candidate.conversation.stage = new_stage;
    await saveCandidateDetailsToDB(candidate);
  }

  let do_forced_shorlist = await should_do_force_shortlist(candidate.conversation);
  let action = "";
  let reply = "";
  let reason = "";
  if (!do_forced_shorlist) {
    const llm = await generateConversationReply(phoneNo, candidate.conversation, creds.name, conversation);
    action = llm.action;
    reply = llm.reply;
    reason = llm.reason;
  } else {
    console.log("do forced shortlist");
    action = "do_shortlist";
  }
  console.log("1. action, reply", action, reply);
  let has_already_asked_user_input = false;
  let user_input_reply = false;

  if (!action.includes("do_shortlist") && !action.includes("do_call_via_human")) {
    has_already_asked_user_input = true;
    user_input_reply = true;
    candidate.conversation.actions_taken.push(action);
    await saveCandidateDetailsToDB(candidate);
    await saveCandidateConversationDebugInfoToDB(candidate, {
      time: new Date(),
      action,
      reply,
      reason,
      conversation,
      info: candidate.conversation.info,
    });
  }

  if (action.includes("ask_ctc")) {
    candidate.conversation.stage = STAGE_GOT_CTC;
    await saveCandidateDetailsToDB(candidate);
  } else if (action.includes("do_shortlist")) {
    console.log("second time genReply");
    let shortlist_reject_text = "";

    if (!candidate.conversation.info || !candidate.conversation.info.suitable_job_profile) {
      throw new Error("cannot shortlist without jobprofile");
    }

    if (candidate.conversation.resume?.full_resume_text.length == 0) {
      throw new Error("cannot shortlist without resume");
    }

    const shortlist_reply = await shortlist(phoneNo, candidate.conversation);
    if (shortlist_reply.is_shortlisted) if (candidate.conversation) candidate.conversation.stage = STAGE_SHORTLISTED;
    if (!shortlist_reply.is_shortlisted)
      if (candidate.conversation) {
        candidate.conversation.stage = STAGE_GOT_REJECTED;

        candidate.conversation.conversation_completed = true;
        candidate.conversation.conversation_completed_reason = action;
      }

    if (candidate.conversation) {
      candidate.conversation.shortlisted = {
        llm_response: shortlist_reply.llm_output,
        shortlisted_for_profile: shortlist_reply.is_shortlisted,
        shortlisted_reason: shortlist_reply.reason,
        job_profile: shortlist_reply.job_profile,
      };
    }

    await saveCandidateDetailsToDB(candidate);

    const llm = await generateConversationReply(phoneNo, candidate.conversation, creds.name, conversation);
    action = llm.action;
    reply = llm.reply;
    reason = llm.reason;
    console.log("2. action, reply", action, reply);
    if (llm.action != "no_action") {
      candidate.conversation.actions_taken.push(llm.action);
      await saveCandidateDetailsToDB(candidate);
    }
    action = llm.action;
    reply = llm.reply;
    reason = llm.reason;
    await saveCandidateConversationDebugInfoToDB(candidate, {
      time: new Date(),
      action,
      reply,
      reason,
      conversation,
      info: candidate.conversation.info,
      shortlist_reject_text,
    });
  }

  if (action.includes("do_call_via_human") || action.includes("rejected") || action.includes("no_job_profile")) {
    candidate.conversation.conversation_completed = true;
    candidate.conversation.conversation_completed_reason = action;
    await saveCandidateDetailsToDB(candidate);
  }
  if (action.includes("do_call_via_human")) {
    callViaHuman(candidate, creds, phoneNo);
  }
  console.log("final action", action);
  if (!action.includes("no_action")) {
    if (!has_already_asked_user_input) {
      user_input_reply = true;
    }
  } else {
    // user_input_reply = false;
    // if process no_action as well
  }

  if (user_input_reply && reply.length) {
    return { message: reply, action, stage: candidate.conversation.stage };
  } else {
    return { message: "", action, stage: candidate.conversation.stage };
  }
};

export const callViaHuman = async (candidate: Candidate, creds: WhatsAppCreds, phoneNo: string) => {
  let context = "";
  const info = candidate.conversation?.info;
  if (info?.current_ctc && info.current_ctc != "no") context += `Current CTC: ${info.current_ctc} \n`;
  if (info?.expected_ctc && info.expected_ctc != "no") context += `Expected CTC: ${info.expected_ctc} \n`;
  if (info?.years_of_experiance && info.years_of_experiance != "no") context += `Year of Experiance ${info.years_of_experiance} \n`;
  if (info?.phone_no && info.phone_no != "no") context += `Phone No ${info.phone_no} \n`;
  if (info?.location && info.location != "no") context += `Current Location ${info.location} \n`;

  // context += `Resume Summary ${candidate.resume?.resume_summary} \n`;
  // context += `Shortlist Reason ${candidate.conversation?.shortlisted?.llm_response} \n`;
  if (creds) context += `Whatsapp Account ${creds.name}`;

  let slack_action_channel_id = process.env.slack_action_channel_id;
  if (slack_action_channel_id) {
    if (candidate.conversation && candidate.conversation.resume) {
      const ratingReply = await rate_resume(candidate.id, candidate.conversation);

      let { slack_thread_id } = await get_whatspp_conversations(phoneNo);
      if (slack_thread_id) {
        await postMessageToThread(
          slack_thread_id,
          `call the candidate ${candidate.id} for job profile ${candidate.conversation?.shortlisted?.job_profile} Resume Rating ${ratingReply.rating}`,
          process.env.slack_action_channel_id,
          true
        );
      } else {
        slack_thread_id = await postMessage(`call the candidate ${candidate.id} for job profile ${candidate.conversation?.shortlisted?.job_profile}`, process.env.slack_action_channel_id);
      }
      // context += `Rating Reason ${ratingReply.reason}`;
      await postMessageToThread(slack_thread_id, context, process.env.slack_action_channel_id);
    } else {
      let { slack_thread_id } = await get_whatspp_conversations(phoneNo);
      if (slack_thread_id) {
        await postMessageToThread(slack_thread_id, `call the candidate ${candidate.id} for job profile ${candidate.conversation?.shortlisted?.job_profile}`, process.env.slack_action_channel_id, true);
      } else {
        slack_thread_id = await postMessage(`call the candidate ${candidate.id} for job profile ${candidate.conversation?.shortlisted?.job_profile}`, process.env.slack_action_channel_id);
      }
      await postMessageToThread(slack_thread_id, context, process.env.slack_action_channel_id);
    }
  }
};
