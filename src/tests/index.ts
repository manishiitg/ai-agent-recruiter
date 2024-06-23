import sortBy from "lodash/sortBy";
import { get_whatspp_conversations, getPendingNotCompletedCandidates, save_whatsapp_conversation, updateRemainderSent } from "../db/mongo";
import { WhatsAppConversaion, WhatsAppCreds } from "../db/types";
import { getCandidate, process_whatsapp_conversation } from "../server/whatsapp/conversation";
import { convertToIST } from "../server/whatsapp/util";
import { conduct_interview } from "../server/whatsapp/interview";

(async () => {
  //   const fromNumber = "916309891039";

  // there is a bug. for ph: 916309891039. he is uploaded his resume but for some reason we havne't processed it so he is stuck in stage New

  const fromNumber = "919919350969";

  // await save_whatsapp_conversation("candidate", fromNumber, "text", `i am ready for the next question`, "", {});

  const { slack_thread_id, conversation } = await get_whatspp_conversations(fromNumber);
  const sortedConversation = sortBy(conversation, (conv: WhatsAppConversaion) => {
    return conv.created_at;
  });

  let agentReply: {
    message: string;
    action: string;
    stage: string;
  };

  const cred: WhatsAppCreds = {
    name: "Mahima",
    phoneNo: "917011749960",
  };

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

  agentReply = await conduct_interview(
    fromNumber,
    sortedConversation.map((conv) => {
      return {
        name: conv.userType,
        content: conv.content,
        date: conv.created_at,
      };
    }),
    cred
  );

  console.log(agentReply);
})();
