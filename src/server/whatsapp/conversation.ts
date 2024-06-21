import { generateConversationReply, STAGE_GOT_CTC, STAGE_GOT_REJECTED, STAGE_NEW, STAGE_SHORTLISTED } from "../../agent/recruiter/agent";
import { convertConversationToText, should_do_force_shortlist, shouldExtractInfo } from "../../agent/recruiter/helper";
import {
  CONV_CLASSIFY_FRIEND,
  CONV_CLASSIFY_FRIEND_PREFIX,
  CONV_CLASSIFY_INSTITUTE_PLACEMENT,
  CONV_CLASSIFY_INSTITUTE_PLACEMENT_PREFIX,
  CONV_CLASSIFY_WISHES,
  CONV_CLASSIFY_WISHES_PREFIX,
  extractInfo,
} from "../../agent/prompts/extract_info";
import { getCandidateDetailsFromDB, saveCandidateConversationDebugInfoToDB, saveCandidateDetailsToDB } from "../../db/mongo";
import { Candidate, WhatsAppCreds } from "../../db/types";
import { summariseResume } from "../../agent/prompts/summary_resume_prompt";
import { transitionStage } from "../../agent/recruiter/transitions";
import { ConversationMessage } from "../../agent/recruiter/types/conversation";
import { askOptionsFromConsole } from "../../communication/console";
import { shortlist } from "../../agent/prompts/shortlist_prompt";
import { postMessage, postMessageToThread, postMessageWithAttachmentsAndThreadsToSlack } from "../../communication/slack";

export const process_whatsapp_conversation = async (
  phoneNo: string,
  conversation: ConversationMessage[],
  creds: WhatsAppCreds
): Promise<{
  message: string;
}> => {
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
      await saveCandidateDetailsToDB(candidate);
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
    console.error("candidate mongo", error);
  }

  await saveCandidateDetailsToDB(candidate);

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
    return { message: "" };
  }

  console.log("candidate", candidate);

  if (!candidate.conversation) {
    throw new Error("candidate conversion not found!");
  }

  let is_file_found = false;
  let resume_file = "";
  //   if (!candidate.conversation.resume?.full_resume_text) {
  //     console.log("is_file_found", is_file_found);
  //     if (hasAttachment) {
  //       const re = await getCandidateResume(page, resume_path);
  //       resume_file = re.resume_file;
  //       is_file_found = re.is_file_found;
  //     }
  //     if (is_file_found) {
  //       // Extract text from the file
  //       let resume_text: string = await new Promise((resolve, reject) => {
  //         textract.fromFileWithPath(path.join(resume_path, resume_file), { preserveLineBreaks: true }, (error: any, text: string) => {
  //           if (error) {
  //             reject(error);
  //           } else {
  //             resolve(text);
  //           }
  //         });
  //       });

  //       console.log("resume text", resume_text);
  //       if (!resume_text || resume_text.length == 0) {
  //         // how to handle this?
  //         candidate.conversation.conversation_completed = true;
  //         candidate.conversation.conversation_completed_reason = "UNABLE_TO_READ_RESUME_TEXT";
  //         await saveCandidateDetailsToDB(candidate);
  //         console.log("UNABLE TO READ RESUME");

  //         if (id) await moveToOther(page, id);
  //         continue;
  //       }
  //       if (candidate.conversation)
  //         candidate.conversation.resume = {
  //           full_resume_text: resume_text,
  //           created_at: new Date(),
  //         };
  //     }
  //   }

  if (shouldExtractInfo(candidate.conversation?.info)) {
    const info = await extractInfo(phoneNo, creds.name, convertConversationToText(conversation), candidate.conversation.resume?.resume_summary || candidate.profile?.resume_pdf_text);
    if (info) {
      candidate.conversation.info = info;
      await saveCandidateDetailsToDB(candidate);
    }
  }

  if (candidate.conversation.resume?.full_resume_text && (!candidate.conversation.resume.resume_summary || candidate.conversation.resume.resume_summary == null)) {
    const summary = await summariseResume(candidate.conversation.resume?.full_resume_text, phoneNo);
    candidate.conversation.resume = {
      created_at: new Date(),
      full_resume_text: candidate.conversation.resume?.full_resume_text,
      resume_summary: summary,
    };
    await saveCandidateDetailsToDB(candidate);
  }
  console.log("checking conv category", candidate.conversation?.info?.classified_category);
  if (!candidate.conversation?.info?.classified_category) {
    throw new Error("classification missing!");
  }
  if (
    candidate.conversation?.info?.classified_category?.includes(CONV_CLASSIFY_INSTITUTE_PLACEMENT) ||
    candidate.conversation?.info?.classified_category?.includes(CONV_CLASSIFY_INSTITUTE_PLACEMENT_PREFIX) ||
    candidate.conversation?.info?.classified_category?.includes(CONV_CLASSIFY_WISHES) ||
    candidate.conversation?.info?.classified_category?.includes(CONV_CLASSIFY_WISHES_PREFIX) ||
    candidate.conversation?.info?.classified_category?.includes(CONV_CLASSIFY_FRIEND) ||
    candidate.conversation?.info?.classified_category?.includes(CONV_CLASSIFY_FRIEND_PREFIX)
  ) {
    console.log("conversation type not supported skipping", candidate.conversation?.info?.classified_category);
    return { message: "Sorry this is only regarding job" };
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

  let auto_mode = process.env.debug_mode && process.env.debug_mode?.length > 0 ? false : true;

  if (!action.includes("no_action") && !action.includes("do_shortlist") && !action.includes("do_call_via_human")) {
    has_already_asked_user_input = true;
    let ans = "y";
    if (!auto_mode) {
      ans = await askOptionsFromConsole("save to db", [
        {
          name: "yes",
          value: "y",
        },
        {
          name: "no",
          value: "n",
        },
      ]);
    }

    if (ans == "y") {
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
    } else {
      user_input_reply = false;
      return { message: "" };
    }
  }

  if (action.includes("ask_ctc")) {
    candidate.conversation.stage = STAGE_GOT_CTC;
    await saveCandidateDetailsToDB(candidate);
  } else if (action.includes("do_shortlist")) {
    console.log("second time genReply");
    let shortlist_reject_text = "";

    if (!candidate.conversation.info.suitable_job_profile) {
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

  if (action.includes("do_call_via_human") || action.includes("rejected") || action.includes("candidate_no_job_profile") || action.includes("tell_no_recommend_job")) {
    candidate.conversation.conversation_completed = true;
    candidate.conversation.conversation_completed_reason = action;
    await saveCandidateDetailsToDB(candidate);
  }
  if (action.includes("do_call_via_human")) {
    callViaHuman(candidate, creds);
  }
  console.log("final action", action);
  if (!action.includes("no_action")) {
    if (!has_already_asked_user_input) {
      let ans = "y";
      if (!auto_mode) {
        ans = await askOptionsFromConsole("write to candidate: " + reply, [
          {
            name: "yes",
            value: "y",
          },
          {
            name: "no",
            value: "n",
          },
        ]);
      }
      if (ans == "y") {
        user_input_reply = true;
      }
    }
  } else {
    user_input_reply = false;
  }

  if (user_input_reply && reply.length) {
    return { message: reply };
  } else {
    return { message: "" };
  }
};

export const callViaHuman = async (candidate: Candidate, creds?: WhatsAppCreds) => {
  let context = "";
  const info = candidate.conversation?.info;
  if (info?.current_ctc && info.current_ctc != "no") context += `Current CTC: ${info.current_ctc} \n`;
  if (info?.expected_ctc && info.expected_ctc != "no") context += `Expected CTC: ${info.expected_ctc} \n`;
  if (info?.years_of_experiance && info.years_of_experiance != "no") context += `Year of Experiance ${info.years_of_experiance} \n`;
  if (info?.phone_no && info.phone_no != "no") context += `Phone No ${info.phone_no} \n`;
  if (info?.location && info.location != "no") context += `Current Location ${info.location} \n`;

  // context += `Resume Summary ${candidate.resume?.resume_summary} \n`;
  context += `Shortlist Reason ${candidate.conversation?.shortlisted?.llm_response} \n`;
  if (creds) context += `Whatsapp Account ${creds.name}`;

  //   const re = await getCandidateResume(page, resume_path);
  //   context,
  if (process.env.slack_action_channel_id) {
    const ts = await postMessage(`call the candidate ${candidate.id} for job profile ${candidate.conversation?.shortlisted?.job_profile}`, process.env.slack_action_channel_id);
    await postMessageToThread(ts, context, process.env.slack_action_channel_id);
  }
};
