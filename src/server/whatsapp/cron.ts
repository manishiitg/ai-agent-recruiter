import dotenv from "dotenv";
dotenv.config();

import { convertToIST, formatTime, sleep } from "./util";
import {
  add_whatsapp_message_sent_delivery_report,
  get_whatspp_conversations,
  getCandidateDetailsFromDB,
  getCandidateInterviewFromDB,
  getInterviewCandidatesForSlackThread,
  getInterviewCompletedCandidates,
  getInterviewCompletedCandidatesRatingNotSent,
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
import { queue, schedule_message_to_be_processed } from ".";
import { transcribe_file_deepgram } from "../../integrations/deepgram";
import { transribe_file_assembly_ai } from "../../integrations/assembly";
import { rate_interview } from "../../agent/prompts/rate_interview";

export const remind_candidates = async (remainders: boolean) => {
  const candidates = await getPendingNotCompletedCandidates(remainders);
  console.log("getPendingNotCompletedCandidates", candidates.length);
  for (const candidate of candidates) {
    console.log(convertToIST(candidate.conversation.started_at));
    const date = convertToIST(candidate.conversation.started_at) as Date;
    const now = convertToIST(new Date());

    let shouldContinue = false;

    let from_candidate = false;
    const { slack_thread_id, conversation } = await get_whatspp_conversations(candidate.unique_id);
    const sortedConversation = sortBy(conversation, (conv: WhatsAppConversaion) => {
      return conv.created_at;
    });
    if (sortedConversation.length > 0) {
      if (sortedConversation[sortedConversation.length - 1].userType == "candidate") {
        shouldContinue = now.getTime() - convertToIST(sortedConversation[sortedConversation.length - 1].created_at).getTime() > 1000 * 60 * 5;
        from_candidate = true;
        //if last conversion was sent by candidate and we didn't reply for 5min
        console.log(
          `${candidate.unique_id} last conversation sent by candidate ${shouldContinue} now: ${formatTime(now)}  sent at ${formatTime(
            convertToIST(sortedConversation[sortedConversation.length - 1].created_at)
          )} `
        );
      } else {
        console.log(
          `${candidate.unique_id} last conversation sent by agent now: ${formatTime(now)}  sent at ${formatTime(convertToIST(sortedConversation[sortedConversation.length - 1].created_at))} `
        );
        if (now.getTime() - convertToIST(sortedConversation[sortedConversation.length - 1].created_at).getTime() > 1000 * 60 * 30) {
          shouldContinue = true;
        }
      }
    }

    if (candidate.unique_id) {
      if (await isInterviewStarted(candidate.unique_id)) {
        const interObj = await getInterviewObject(candidate.unique_id);
        if (interObj.interview?.stage.includes("candidate_will_answer_at_a_later_time")) {
          if (now.getTime() - convertToIST(sortedConversation[sortedConversation.length - 1].created_at).getTime() < 1000 * 60 * 60 * 5) {
            console.log(candidate.unique_id, "skipping interview for candidate as stage is candidate_will_answer_at_a_later_time");
            shouldContinue = false;
          }
        }
      }
    }

    try {
      const candidateObj = await getCandidateDetailsFromDB(candidate.unique_id);
      if (candidateObj.conversation?.stage.includes("got_rejected")) {
        shouldContinue = false;
      }
    } catch (error) {}

    if (shouldContinue) {
      const fromNumber = candidate.unique_id;

      if (!remainders) {
        if (sortedConversation[sortedConversation.length - 1].userType == "agent") {
          console.log(`${candidate.unique_id} last conversation sent by agent so won't continue`);
          shouldContinue = false;
        }
      }

      if (shouldContinue) {
        if (!queue[fromNumber]) {
          //if message is already queue don't remind
          await schedule_message_to_be_processed(
            fromNumber,
            candidate.whatsapp,
            `remind-${remainders}-${formatTime(convertToIST(sortedConversation[sortedConversation.length - 1].created_at))}-${
              now.getTime() - convertToIST(sortedConversation[sortedConversation.length - 1].created_at).getTime()
            }--${formatTime(now)}`
          );
          if (!from_candidate) await updateRemainderSent(fromNumber);
          await sleep(5000);
        } else {
          console.log(`${candidate.unique_id} queue still in progress!  ${formatTime(convertToIST(queue[fromNumber].startedAt))} ${queue[fromNumber].canDelete} ${queue[fromNumber].status} `);
        }
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
      await schedule_message_to_be_processed(unique_id, candidate.whatsapp, `pending-hr-screening-remind`);
      await sleep(5000);
    }
  }
  const interview_remainder = await getInterviewRemainder();
  console.log("interview_remainder", interview_remainder.length);
  for (const candidate of interview_remainder) {
    const unique_id = candidate.unique_id;
    const now = convertToIST(new Date());

    const { conversation } = await get_whatspp_conversations(unique_id);
    const sortedConversation = sortBy(conversation, (conv: WhatsAppConversaion) => {
      return conv.created_at;
    });

    if (now.getTime() - convertToIST(sortedConversation[sortedConversation.length - 1].created_at).getTime() > 1000 * 60 * 20) {
      if (unique_id) {
        const interObj = await getInterviewObject(unique_id);
        if (interObj.interview?.stage.includes("candidate_will_answer_at_a_later_time")) {
          if (now.getTime() - convertToIST(sortedConversation[sortedConversation.length - 1].created_at).getTime() < 1000 * 60 * 60 * 5) {
            console.log(unique_id, "skipping interview for candidate as stage is candidate_will_answer_at_a_later_time");
            continue;
          }
        }
      }

      await schedule_message_to_be_processed(
        unique_id,
        candidate.whatsapp,
        `pending-hr-interview-remind-${formatTime(convertToIST(sortedConversation[sortedConversation.length - 1].created_at))}---${
          now.getTime() - convertToIST(sortedConversation[sortedConversation.length - 1].created_at).getTime()
        }--${formatTime(now)}`
      );
      await updateInterviewRemainderSent(unique_id);
      await sleep(5000);
    }
  }
};

const check_slack_thread_for_manual_msgs = async () => {
  const candidates = await getInterviewCandidatesForSlackThread();
  console.log("interview candidates", candidates.length, process.env.bot_user_id);

  for (const candidate of candidates) {
    const fromNumber = candidate.unique_id;
    const toNumber = candidate.whatsapp;
    const { slack_thread_id, channel_id } = await get_whatspp_conversations(candidate.unique_id);
    if (slack_thread_id && channel_id) {
      const msgs = await getLatestMessagesFromThread(channel_id, slack_thread_id, 500);
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

              const response = await send_whatsapp_text_reply(text_to_send, fromNumber, toNumber);
              const messageUuid = response.messageUuid;
              await save_whatsapp_conversation("agent", fromNumber, toNumber, "text", fromNumber, text_to_send, "");
              await add_whatsapp_message_sent_delivery_report(fromNumber, text_to_send, "text", messageUuid);
              await postMessageToThread(slack_thread_id, `HR: ${text_to_send}. Action: ${"manual"} Stage: ${"slack"}`, channel_id);
              await saveSlackTsRead(msg.ts);

              try {
                const candidate = await getCandidateDetailsFromDB(fromNumber);
                if (candidate.conversation) {
                  candidate.conversation.conversation_completed = true;
                  candidate.conversation.conversation_completed_reason = "manual_msg";
                  await saveCandidateInterviewToDB(candidate);
                }
              } catch (error) {}

              try {
                const interv = await getCandidateInterviewFromDB(fromNumber);
                if (interv.interview) {
                  interv.interview.conversation_completed = true;
                  interv.interview.conversation_completed_reason = "manual_msg";
                  await saveCandidateInterviewToDB(interv);
                }
              } catch (error) {}
            }
          }
        }
      }
    }
    await sleep(1000);
  }
};

export const evaluate_hr_screen_interview = async () => {
  const candidates = await getInterviewCompletedCandidatesRatingNotSent();
  for (const candidate of candidates) {
    const ph = candidate.unique_id;

    const interview = await getCandidateInterviewFromDB(ph);
    if (interview.interview?.avg_rating) {
      const { slack_thread_id, channel_id, conversation } = await get_whatspp_conversations(ph);
      if (interview.interview.avg_rating < 6) {
        const text_to_send = `You scored a rating of ${
          Math.round(interview.interview.avg_rating * 10) / 10
        } out of 10 based on your anwers. This score is lower than avg rating we are expecting for the interview. We will still manually go through your recording once.`;

        const response = await send_whatsapp_text_reply(text_to_send, ph, candidate.whatsapp);
        const messageUuid = response.messageUuid;
        await save_whatsapp_conversation("agent", ph, candidate.whatsapp, "text", ph, text_to_send, "");
        await add_whatsapp_message_sent_delivery_report(ph, text_to_send, "text", messageUuid);
        await postMessageToThread(slack_thread_id, `HR: ${text_to_send}. Action: ${"manual"} Stage: ${"interview review"}`, channel_id);
      } else {
        const text_to_send = `You scored a rating of ${
          Math.round(interview.interview.avg_rating * 10) / 10
        } out of 10 based on your anwers. This is good score so our HR team will reach out to you soon!`;

        const response = await send_whatsapp_text_reply(text_to_send, ph, candidate.whatsapp);
        const messageUuid = response.messageUuid;
        await save_whatsapp_conversation("agent", ph, candidate.whatsapp, "text", ph, text_to_send, "");
        await add_whatsapp_message_sent_delivery_report(ph, text_to_send, "text", messageUuid);
        await postMessageToThread(slack_thread_id, `HR: ${text_to_send}. Action: ${"manual"} Stage: ${"interview review"}`, channel_id);
      }
    }
  }
};

const keep_conversation_warm = async () => {
  //whatsapp doesn't allow message to be sent after 24hrs. so send an update to candidate every 12hrs?

  const candidates = await getInterviewCompletedCandidates();
  const now = convertToIST(new Date());
  for (const candidate of candidates) {
    const ph = candidate.unique_id;

    const { slack_thread_id, channel_id, conversation } = await get_whatspp_conversations(ph);
    const sortedConversation = sortBy(conversation, (conv: WhatsAppConversaion) => {
      return conv.created_at;
    });
    if (sortedConversation.length > 0) {
      let shouldContinue = now.getTime() - convertToIST(sortedConversation[sortedConversation.length - 1].created_at).getTime() > 1000 * 60 * 60 * 20;
      if (sortedConversation[sortedConversation.length - 1].userType == "candidate") {
        if (sortedConversation[sortedConversation.length - 1].content.indexOf("You are still in our shortlist, didn't get time to review interview recordings yet") !== -1) {
          shouldContinue = false;
        }
      }
      if (now.getTime() - convertToIST(sortedConversation[sortedConversation.length - 1].created_at).getTime() > 1000 * 60 * 60 * 24) {
        shouldContinue = false;
      }
      if (shouldContinue) {
        const candidate = await getCandidateDetailsFromDB(ph);
        const text_to_send = "You are still in our shortlist, didn't get time to review interview recordings yet";

        const response = await send_whatsapp_text_reply(text_to_send, ph, candidate.whatsapp);
        const messageUuid = response.messageUuid;
        await save_whatsapp_conversation("agent", ph, candidate.whatsapp, "text", ph, text_to_send, "");
        await add_whatsapp_message_sent_delivery_report(ph, text_to_send, "text", messageUuid);
        await postMessageToThread(slack_thread_id, `HR: ${text_to_send}. Action: ${"manual"} Stage: ${"12hr-updated"}`, channel_id);
      }
      // }
    }
  }
};

export const start_cron = async () => {
  await evaluate_hr_screen_interview();
  check_slack_thread_for_manual_msgs();
  await get_pending_hr_screening_candidates();

  await remind_candidates(false); //send remainder to candidate who's conversation is not completed.. if last message was sent by agent, dont send remainder
  await remind_candidates(true); //send remainder to candidate who's conversation is not completed

  setInterval(async () => {
    //send remainders to candidate on same day
    await check_slack_thread_for_manual_msgs();
    // await keep_conversation_warm();
    await evaluate_hr_screen_interview();
  }, 1000 * 60 * 30); //30min

  setInterval(() => {
    (async () => {
      await get_pending_hr_screening_candidates(); // candidate who's shortlisted i.e do_human_call but interview didn't start
      await remind_candidates(false); //send remainder to candidate who's conversation is not completed.. if last message was sent by agent, dont send remainder
      await remind_candidates(true); //send remainder to candidate who's conversation is not completed
    })();
  }, 1000 * 60 * 5);
};
