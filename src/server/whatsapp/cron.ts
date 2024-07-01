import dotenv from "dotenv";
dotenv.config();

import { convertToIST, sleep } from "./util";
import {
  add_whatsapp_message_sent_delivery_report,
  get_whatspp_conversations,
  getCandidateDetailsFromDB,
  getInterviewCandidates,
  getInterviewCompletedCandidates,
  getInterviewRemainder,
  getPendingNotCompletedCandidates,
  getShortlistedCandidates,
  getSlackTsRead,
  isInterviewStarted,
  save_whatsapp_conversation,
  saveCandidateInterviewToDB,
  saveSlackTsRead,
  update_interview_transcript,
  update_interview_transcript_completed,
  updateInterviewRemainderSent,
  updateRemainderSent,
} from "../../db/mongo";
import sortBy from "lodash/sortBy";
import { WhatsAppConversaion, WhatsAppCreds } from "../../db/types";
import { getCandidate, process_whatsapp_conversation } from "./conversation";
import { getLatestMessagesFromThread, postAttachment, postMessage, postMessageToThread } from "../../communication/slack";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { createRequire } from "module";
import { send_whatsapp_text_reply } from "../../integrations/plivo";
import { conduct_interview, getInterviewObject } from "./interview";
import { converToMp3 } from "../../integrations/mp3";
import { cred, schedule_message_to_be_processed } from ".";
import { transcribe_file_deepgram } from "../../integrations/deepgram";
import { transribe_file_assembly_ai } from "../../integrations/assembly";
import { rate_interview } from "../../agent/prompts/rate_interview";
// @ts-ignore
const require = createRequire(import.meta.url);
var textract = require("textract");

const remind_candidates = async (remainders: boolean) => {
  const candidates = await getPendingNotCompletedCandidates(remainders);
  console.log("getPendingNotCompletedCandidates", candidates.length);
  for (const candidate of candidates) {
    console.log(convertToIST(candidate.conversation.started_at));
    const date = convertToIST(candidate.conversation.started_at) as Date;
    const now = convertToIST(new Date());

    let shouldContinue = now.getTime() - date.getTime() > 1000 * 60 * 30;

    let from_candidate = false;
    const { slack_thread_id, conversation } = await get_whatspp_conversations(candidate.unique_id);
    if (conversation.length > 0) {
      if (conversation[conversation.length - 1].userType == "candidate") {
        shouldContinue = now.getTime() - conversation[conversation.length - 1].created_at.getTime() > 1000 * 60 * 5;
        from_candidate = true;
        //if last conversion was sent by candidate and we didn't reply for 5min
      }
    }

    if (shouldContinue) {
      //no response in 1hr
      console.log(candidate.unique_id);
      const fromNumber = candidate.unique_id;
      const { conversation } = await get_whatspp_conversations(fromNumber);
      const sortedConversation = sortBy(conversation, (conv: WhatsAppConversaion) => {
        return conv.created_at;
      });

      let should_continue = true;
      if (!remainders) {
        if (sortedConversation[sortedConversation.length - 1].userType == "agent") {
          should_continue = false;
        }
      }
      if (!should_continue) {
        const candObj = await getCandidateDetailsFromDB(candidate.unique_id);
        if (candObj.conversation?.conversation_completed_reason?.includes("call_via_human")) {
          if (!(await isInterviewStarted(candidate.unique_id))) {
            should_continue = true;
          }
        }
      }

      if (should_continue) {
        await schedule_message_to_be_processed(fromNumber, cred, `remind-${remainders}`);
        if (!from_candidate) await updateRemainderSent(fromNumber);
        await sleep(5000);
      }
    }
  }
};
const get_pending_hr_screening_candidates = async () => {
  const candidates = await getShortlistedCandidates();
  console.log("get_pending_hr_screening_candidates", candidates.length);
  for (const candidate of candidates) {
    const unique_id = candidate.unique_id;
    if (!(await isInterviewStarted(unique_id))) {
      await schedule_message_to_be_processed(unique_id, cred, "pending-hr-screening");
      await sleep(5000);
    }
  }
  const interview_remainder = await getInterviewRemainder();
  console.log("interview_remainder", interview_remainder.length);
  for (const candidate of interview_remainder) {
    const unique_id = candidate.unique_id;
    console.log(candidate);
    console.log(convertToIST(candidate.interview.started_at));
    const date = convertToIST(candidate.interview.started_at) as Date;
    const now = convertToIST(new Date());

    if (now.getTime() - date.getTime() > 1000 * 60 * 30) {
      await schedule_message_to_be_processed(unique_id, cred, "pending-hr-interview");
      await updateInterviewRemainderSent(unique_id);
      await sleep(5000);
    }
  }
};

const check_slack_thread_for_manual_msgs = async () => {
  const candidates = await getInterviewCandidates();
  console.log("interview candidates", candidates.length, process.env.bot_user_id);

  for (const candidate of candidates) {
    const fromNumber = candidate.unique_id;
    const { slack_thread_id, channel_id } = await get_whatspp_conversations(candidate.unique_id);
    if (slack_thread_id && channel_id) {
      const msgs = await getLatestMessagesFromThread(channel_id, slack_thread_id, 100);
      console.log(`got msgs from slack for ${fromNumber} ${msgs.length}`);

      for (const msg of msgs) {
        const text = msg.text;
        if (text.includes(process.env.bot_user_id || "<@U017T6CK4ET>")) {
          console.log(msg);
          console.log("got msg to be sent to user!", msg);
          if (msg.ts) {
            console.log("await getSlackTsRead(msg.bot_id))", await getSlackTsRead(msg.ts));
            if (!(await getSlackTsRead(msg.ts))) {
              //post this msg to user via whatsapp
              console.log("sending to user!");
              let text_to_send = text.replace(process.env.bot_user_id || "<@U017T6CK4ET>", "");
              text_to_send = text_to_send.trim();

              const response = await send_whatsapp_text_reply(text_to_send, fromNumber, cred.phoneNo);
              const messageUuid = response.messageUuid;
              await save_whatsapp_conversation("agent", fromNumber, "text", fromNumber, "", "");
              await add_whatsapp_message_sent_delivery_report(fromNumber, fromNumber, "text", messageUuid);
              await postMessageToThread(slack_thread_id, `HR: ${text_to_send}. Action: ${"manual"} Stage: ${"slack"}`, channel_id);
              await saveSlackTsRead(msg.ts);
            }
          }
        }
      }
    }
    await sleep(1000);
  }
};

export const evaluate_hr_screen_interview = async () => {
  const candidates = await getInterviewCompletedCandidates();
  for (const candidate of candidates) {
    const ph = candidate.unique_id;

    const inter = await getInterviewObject(ph);
    if (inter.interview?.conversation_completed && !inter.interview.transcribe_completed) {
      const { conversation } = await get_whatspp_conversations(ph);
      const audioConversation = conversation.filter((conv) => {
        if (conv.messageType == "media" && conv.body) {
          if ("Media0" in conv.body) {
            if (conv.body.MimeType.includes("audio")) {
              return true;
            }
          }
        }
        return false;
      });
      // console.log("audioConversation", audioConversation.length);

      let no_trans = 0;
      for (const conv of audioConversation) {
        if (conv.messageType == "media" && conv.body) {
          const idx = inter.interview.transcribe?.findIndex((file) => file.uid === conv.uid);
          console.log("idx", idx, conv.uid);
          if (idx == -1 || idx === undefined) {
            const MessageUUID = conv.uid;
            let ai_model = "";
            let text: string | null | undefined = null;
            try {
              if (new Date().getHours() % 2 === 0 || true) {
                ai_model = "deepgram";
                console.log(conv.body.Media0);
                text = await transcribe_file_deepgram(conv.body.Media0);
              } else {
                ai_model = "assemblyai";
                text = await transribe_file_assembly_ai(conv.body.Media0);
              }
            } catch (error) {
              console.error(error);
            }

            console.log("text", text, ai_model);
            console.log(ph);
            if (text?.length) {
              await update_interview_transcript(ph, MessageUUID, text);
              const { slack_thread_id, channel_id } = await get_whatspp_conversations(ph);
              if (slack_thread_id) {
                await postMessageToThread(slack_thread_id, `Transcription: ${text} Model ${ai_model}`, channel_id || process.env.slack_action_channel_id);
                no_trans++;
              }
            } else {
              await update_interview_transcript(ph, MessageUUID, "");
            }
          } else {
            no_trans++;
          }
        }
      }
      console.log("no_trans == audioConversation.length", no_trans, audioConversation.length);
      if (no_trans == audioConversation.length && no_trans != 0) {
        await update_interview_transcript_completed(ph);
        let inter = await getInterviewObject(ph);

        let interviewRating:
          | {
              SCRATCHPAD: any;
              HR_QUESTION_RATING: any;
              TECH_QUESTION1_RATING: any;
              TECH_QUESTION2_RATING: any;
              TECH_QUESTION3_RATING: any;
            }
          | undefined = inter.interview?.interview_rating;

        if (!interviewRating) {
          interviewRating = await rate_interview(ph, inter);
          if (inter.interview) {
            inter.interview.interview_rating = interviewRating;
          }
          console.log(interviewRating);
          await saveCandidateInterviewToDB(inter);
          const { slack_thread_id, channel_id } = await get_whatspp_conversations(ph);
          if (slack_thread_id) {
            await postMessageToThread(slack_thread_id, `HR Interview Rating Reason: ${JSON.stringify(interviewRating.SCRATCHPAD)}`, channel_id || process.env.slack_action_channel_id);
            await postMessageToThread(
              slack_thread_id,
              `HR_QUESTION_RATING: ${interviewRating.HR_QUESTION_RATING} TECH_QUESTION1_RATING: ${interviewRating.TECH_QUESTION1_RATING} TECH_QUESTION2_RATING: ${interviewRating.TECH_QUESTION2_RATING} TECH_QUESTION3_RATING ${interviewRating.TECH_QUESTION3_RATING}`,
              channel_id || process.env.slack_action_channel_id,
              true
            );
          }
        }
      }
      console.log("completed ph");
    }
  }
};

export const start_cron = () => {
  evaluate_hr_screen_interview();
  get_pending_hr_screening_candidates();
  (async () => {
    await remind_candidates(false); //send remainder to candidate who's conversation is not completed.. if last message was sent by agent, dont send remainder
    await remind_candidates(true); //send remainder to candidate who's conversation is not completed
  })();
  check_slack_thread_for_manual_msgs();

  setInterval(() => {
    //send remainders to candidate on same day
    get_pending_hr_screening_candidates(); // candidate who's shortlisted i.e do_human_call but interview didn't start
    check_slack_thread_for_manual_msgs();
    evaluate_hr_screen_interview();
  }, 1000 * 60 * 30); //30min

  setInterval(() => {
    (async () => {
      await remind_candidates(false); //send remainder to candidate who's conversation is not completed.. if last message was sent by agent, dont send remainder
      await remind_candidates(true); //send remainder to candidate who's conversation is not completed
    })();
  }, 1000 * 60 * 5);
};
