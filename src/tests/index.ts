import sortBy from "lodash/sortBy";
import {
  get_whatspp_conversations,
  getCandidateDetailsFromDB,
  getInterviewCandidates,
  getInterviewRemainder,
  getPendingNotCompletedCandidates,
  getSlackTsRead,
  save_whatsapp_conversation,
  saveCandidateInterviewToDB,
  saveSlackTsRead,
  update_interview_transcript,
  update_interview_transcript_completed,
  updateRemainderSent,
} from "../db/mongo";
import { WhatsAppConversaion, WhatsAppCreds } from "../db/types";
import { getCandidate, process_whatsapp_conversation } from "../server/whatsapp/conversation";
import { convertToIST, sleep } from "../server/whatsapp/util";
import { conduct_interview, getInterviewObject } from "../server/whatsapp/interview";
import { getLatestMessagesFromThread, postMessageToThread } from "../communication/slack";
import { transribe_file_assembly_ai } from "../integrations/assembly";
import { transcribe_file_deepgram } from "../integrations/deepgram";
import { rate_interview } from "../agent/prompts/rate_interview";
import { evaluate_hr_screen_interview } from "../server/whatsapp/cron";

(async () => {
  // there is a bug. for ph: 916309891039. he is uploaded his resume but for some reason we havne't processed it so he is stuck in stage New

  await evaluate_hr_screen_interview();

  // for (const candidate of candidates) {
  //   const ph = candidate.unique_id;
  //   // const candidate = await getCandidateDetailsFromDB(ph)
  //   const { slack_thread_id, channel_id } = await get_whatspp_conversations(ph);
  //   if (slack_thread_id && channel_id) {
  //     const msgs = await getLatestMessagesFromThread(channel_id, slack_thread_id, 100);

  //     for (const msg of msgs) {
  //       const text = msg.text;
  //       if (text.includes(process.env.bot_user_id || "<@U017T6CK4ET>")) {
  //         console.log(msg);
  //         console.log("got msg to be sent to user!");
  //         if (msg.bot_id) {
  //           if (await getSlackTsRead(msg.bot_id)) {
  //             //post this msg to user via whatsapp
  //             console.log("12313");
  //             // await saveSlackTsRead(msg.bot_id);
  //           }
  //         }
  //       }
  //     }
  //   }
  // }
  console.log("completed!");

  // const interview_remainder = await getInterviewRemainder();
  // console.log("interview_remainder", interview_remainder.length);
  // for (const candidate of interview_remainder) {
  //   const unique_id = candidate.unique_id;
  //   console.log(candidate);
  //   console.log(convertToIST(candidate.interview.started_at));
  //   const date = candidate.interview.started_at as Date;
  //   const now = new Date();

  //   if (now.getTime() - date.getTime() > 1000 * 60 * 30) {
  //     console.log("shortlisted ", unique_id);
  //   }
  // }

  // const candidates = await getPendingNotCompletedCandidates(false);
  // console.log("getPendingNotCompletedCandidates", candidates.length);
  // for (const candidate of candidates) {
  //   console.log(convertToIST(candidate.conversation.started_at));
  //   const date = convertToIST(candidate.conversation.started_at) as Date;
  //   const now = convertToIST(new Date());
  //   if (candidate.unique_id == "918595848117") {
  //     console.log("found11111", (now.getTime() - date.getTime()) / (1000 * 60), now.getTime() - date.getTime() > 1000 * 60 * 10);
  //   }

  //   if (now.getTime() - date.getTime() > 1000 * 60 * 10) {
  //     //no response in 1hr
  //     const fromNumber = candidate.unique_id;

  //     const { conversation } = await get_whatspp_conversations(fromNumber);
  //     const sortedConversation = sortBy(conversation, (conv: WhatsAppConversaion) => {
  //       return conv.created_at;
  //     });

  //     let should_continue = true;

  //     if (sortedConversation[sortedConversation.length - 1].userType == "agent") {
  //       should_continue = false;
  //     } else {
  //       //we can check here if interview/conversion is completed.
  //       // but that will already be checked so it ineeded?
  //       console.log("should continue", candidate.unique_id);
  //       if (candidate.unique_id == "918595848117") {
  //         console.log("found!!!");
  //         break;
  //       }
  //     }
  //   }
  // }

  // const fromNumber = "919919350969";
  // const { slack_thread_id, conversation } = await get_whatspp_conversations(fromNumber);
  // const sortedConversation = sortBy(conversation, (conv: WhatsAppConversaion) => {
  //   return conv.created_at;
  // });

  // let agentReply: {
  //   message: string;
  //   action: string;
  //   stage: string;
  // };

  // const cred: WhatsAppCreds = {
  //   name: "Mahima",
  //   phoneNo: "917011749960",
  // };

  //   agentReply = await process_whatsapp_conversation(
  //     fromNumber,
  //     sortedConversation.map((conv) => {
  //       return {
  //         name: conv.userType,
  //         content: conv.content,
  //         date: conv.created_at,
  //       };
  //     }),
  //     cred,
  //     (reply: string) => {
  //       (async () => {
  //         console.log("repling through callback");
  //       })();
  //     }
  //   );

  // agentReply = await conduct_interview(
  //   fromNumber,
  //   sortedConversation.map((conv) => {
  //     return {
  //       name: conv.userType,
  //       content: conv.content,
  //       date: conv.created_at,
  //     };
  //   }),
  //   cred
  // );

  // console.log(agentReply);
})();
