import sortBy from "lodash/sortBy";
import { get_whatspp_conversations, getPendingNotCompletedCandidates, save_whatsapp_conversation, updateRemainderSent } from "../db/mongo";
import { WhatsAppConversaion, WhatsAppCreds } from "../db/types";
import { getCandidate, process_whatsapp_conversation } from "../server/whatsapp/conversation";
import { convertToIST } from "../server/whatsapp/util";
import { conduct_interview } from "../server/whatsapp/interview";

(async () => {
  // there is a bug. for ph: 916309891039. he is uploaded his resume but for some reason we havne't processed it so he is stuck in stage New

  const candidates = await getPendingNotCompletedCandidates(false);
  console.log("getPendingNotCompletedCandidates", candidates.length);
  for (const candidate of candidates) {
    console.log(convertToIST(candidate.conversation.started_at));
    const date = convertToIST(candidate.conversation.started_at) as Date;
    const now = convertToIST(new Date());
    if (candidate.unique_id == "917359945967") {
      console.log("found11111", (now.getTime() - date.getTime()) / (1000 * 60), now.getTime() - date.getTime() > 1000 * 60 * 10);
    }

    if (now.getTime() - date.getTime() > 1000 * 60 * 10) {
      //no response in 1hr
      const fromNumber = candidate.unique_id;

      const { conversation } = await get_whatspp_conversations(fromNumber);
      const sortedConversation = sortBy(conversation, (conv: WhatsAppConversaion) => {
        return conv.created_at;
      });

      let should_continue = true;

      if (sortedConversation[sortedConversation.length - 1].userType == "agent") {
        should_continue = false;
      } else {
        //we can check here if interview/conversion is completed.
        // but that will already be checked so it ineeded?
        console.log("should continue", candidate.unique_id);
        if (candidate.unique_id == "917359945967") {
          console.log("found!!!");
          break;
        }
      }
    }
  }

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
