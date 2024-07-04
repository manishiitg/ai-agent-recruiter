import { STAGE_GOT_CTC, STAGE_GOT_REJECTED, STAGE_GOT_RESUME, STAGE_NEW } from "./agent";
import { Conversation } from "./types/conversation";

export const transitionStage = async (conversation: Conversation) => {
  if (conversation.stage !== STAGE_GOT_REJECTED) {
    if (conversation?.resume?.full_resume_text) {
      if (conversation?.stage == STAGE_NEW && conversation.resume?.full_resume_text?.length > 0) {
        return STAGE_GOT_RESUME;
      }
    }
    const info = conversation?.info;
    if (info?.expected_ctc && info.expected_ctc != "no") {
      if (conversation && conversation.resume?.full_resume_text && conversation) {
        return STAGE_GOT_CTC;
      }
    }
  }
  return "";
};
