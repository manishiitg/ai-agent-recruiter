import dotenv from "dotenv";
dotenv.config();

import { convertToIST, sleep } from "./util";
import {
  add_whatsapp_message_sent_delivery_report,
  get_whatspp_conversations,
  getInterviewCandidates,
  getInterviewRemainder,
  getPendingNotCompletedCandidates,
  getShortlistedCandidates,
  getSlackTsRead,
  isInterviewStarted,
  save_whatsapp_conversation,
  saveSlackTsRead,
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
import { send_whatsapp_text_reply } from "./plivo";
import { conduct_interview, getInterviewObject } from "./interview";
import { converToMp3 } from "./mp3";
import { cred, schedule_message_to_be_processed } from ".";
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

    if (now.getTime() - date.getTime() > 1000 * 60 * 60 * 2) {
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

      if (should_continue) {
        await schedule_message_to_be_processed(fromNumber, cred);
        await updateRemainderSent(fromNumber);
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
      await schedule_message_to_be_processed(unique_id, cred);
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

    if (now.getTime() - date.getTime() > 1000 * 60 * 60 * 2) {
      await schedule_message_to_be_processed(unique_id, cred);
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

export const start_cron = () => {
  get_pending_hr_screening_candidates();
  remind_candidates(false);
  remind_candidates(true);
  check_slack_thread_for_manual_msgs();

  setInterval(() => {
    //send remainders to candidate on same day
    remind_candidates(false);
    remind_candidates(true);
    get_pending_hr_screening_candidates();
    check_slack_thread_for_manual_msgs();
  }, 1000 * 60 * 30); //30min
};
