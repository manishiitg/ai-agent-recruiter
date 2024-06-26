import { ConversationMessage } from "./types";

export const convertConversationToText = (conversation: ConversationMessage[]): string => {
  let text = ``;
  for (const conv of conversation) {
    text += `${conv.name === "agent" ? "You" : "Candidate:"}: ${conv.content} \n `;
  }
  return text;
};
