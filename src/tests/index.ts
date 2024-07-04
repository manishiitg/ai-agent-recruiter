import sortBy from "lodash/sortBy";
import {
  CONVERSION_TYPE_INTERVIEW,
  get_whatspp_conversations,
  getCandidateDetailsFromDB,
  getInterviewRemainder,
  getPendingNotCompletedCandidates,
  getSlackTsRead,
  isInterviewStarted,
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
import { ask_question_for_tech_interview } from "../agent/prompts/interview_questions";
import { send_whatsapp_text_reply } from "../integrations/plivo";

(async () => {
  // there is a bug. for ph: 916309891039. he is uploaded his resume but for some reason we havne't processed it so he is stuck in stage New

  // const ph = "919262378726";
  // const inter = await getInterviewObject(ph);

  // const reply = await ask_question_for_tech_interview("jr python developer", "Django");

  // await evaluate_hr_screen_interview();

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
  //   if (candidate.unique_id == "919043237743") {
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
  //       if (candidate.unique_id == "919043237743") {
  //         console.log("found!!!");
  //         break;
  //       }
  //     }
  //     const candObj = await getCandidateDetailsFromDB(candidate.unique_id);
  //     if (candidate.unique_id == "919043237743") {
  //       console.log("candObj.conversation?.conversation_completed_reason", candObj.conversation?.conversation_completed_reason);
  //     }
  //     if (candObj.conversation?.conversation_completed_reason?.includes("call_via_human")) {
  //       if (!(await isInterviewStarted(candidate.unique_id))) {
  //         should_continue = true;
  //         console.log("should continue non interview", candidate.unique_id);
  //         if (candidate.unique_id == "919043237743") {
  //           console.log("found!!!");
  //           break;
  //         }
  //       }
  //     }
  //   }
  // }

  let agentReply: {
    message: string;
    action: string;
    stage: string;
  };

  const cred: WhatsAppCreds = {
    name: "Mahima",
    phoneNo: "917011749960",
  };

  // agentReply = await process_whatsapp_conversation(
  //   fromNumber,
  //   sortedConversation.map((conv) => {
  //     return {
  //       name: conv.userType,
  //       content: conv.content,
  //       date: conv.created_at,
  //     };
  //   }),
  //   cred,
  //   (reply: string) => {
  //     (async () => {
  //       console.log("repling through callback");
  //     })();
  //   }
  // );

  const fromNumber = "919717071555";

  await save_whatsapp_conversation("candidate", fromNumber, "", "i am ready", "", "");

  // await save_whatsapp_conversation("candidate", fromNumber, "", "<audio_recording>yes my name is manish and i am full stack developer</audio_recording>", "", "");

  // await save_whatsapp_conversation("candidate", fromNumber, "", "<audio_recording>i have 3 years of experiance with nodejs projects</audio_recording>", "", "");

  // await save_whatsapp_conversation("candidate", fromNumber, "", "<audio_recording>i dont know what is expressjs middleware</audio_recording>", "", "");

  // await save_whatsapp_conversation("candidate", fromNumber, "", "i dont know the answer", "", "");

  // await save_whatsapp_conversation("candidate", fromNumber, "", "but i have sent you the recording", "", "");

  // await save_whatsapp_conversation("candidate", fromNumber, "", "ok", "", "");

  // await save_whatsapp_conversation("candidate", fromNumber, "", "yes", "", "");

  // await save_whatsapp_conversation("candidate", fromNumber, "", "no", "", "");

  // await save_whatsapp_conversation("candidate", fromNumber, "", "how does it work?", "", "");

  const inter = await getInterviewObject(fromNumber);
  if (inter.interview && inter.interview.interview_info) {
    inter.interview.interview_info.got_audio_file = true;
    await saveCandidateInterviewToDB(inter);
  }

  const { slack_thread_id, conversation } = await get_whatspp_conversations(fromNumber);
  const sortedConversation = sortBy(conversation, (conv: WhatsAppConversaion) => {
    return conv.created_at;
  });

  agentReply = await conduct_interview(
    fromNumber,
    sortedConversation
      .filter((row) => row.conversationType == CONVERSION_TYPE_INTERVIEW)
      .map((conv) => {
        return {
          name: conv.userType,
          content: conv.content,
          date: conv.created_at,
        };
      }),
    cred
  );

  console.log(agentReply);
  if (agentReply && agentReply.message) {
    await save_whatsapp_conversation("agent", fromNumber, "text", agentReply.message, "", "");

    if (false) {
      await save_whatsapp_conversation("candidate", fromNumber, "text", "ok", "", "");

      const { slack_thread_id, conversation } = await get_whatspp_conversations(fromNumber);
      const sortedConversation = sortBy(conversation, (conv: WhatsAppConversaion) => {
        return conv.created_at;
      });

      agentReply = await conduct_interview(
        fromNumber,
        sortedConversation
          .filter((row) => row.conversationType == CONVERSION_TYPE_INTERVIEW)
          .map((conv) => {
            return {
              name: conv.userType,
              content: conv.content,
              date: conv.created_at,
            };
          }),
        cred
      );
      console.log(agentReply);

      await save_whatsapp_conversation("agent", fromNumber, "text", agentReply.message, "", "");
    }
  }
  console.log("completed!");
})();
