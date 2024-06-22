import { STAGE_SHORTLISTED } from "./agent";
import { CandidateInfo, Conversation, ConversationMessage } from "./types/conversation";

export const convertConversationToText = (conversation: ConversationMessage[]): string => {
  let text = ``;
  for (const conv of conversation) {
    text += `${conv.name === "agent" ? "You" : "Candidate:"}: ${conv.content} \n `;
  }
  return text;
};

export const shouldExtractInfo = (info?: CandidateInfo) => {
  if (!info) {
    return true;
  }
  let extract = false;
  if (!info.suitable_job_profile || info.suitable_job_profile.length == 0 || info.suitable_job_profile == "no") {
    extract = true;
  }
  if (!info.current_ctc || info.current_ctc.length == 0 || info.current_ctc == "no") {
    extract = true;
  }
  if (!info.email || info.email.length == 0 || info.email == "no") {
    extract = true;
  }
  if (!info.expected_ctc || info.expected_ctc.length == 0 || info.expected_ctc == "no") {
    extract = true;
  }
  if (!info.location || info.location.length == 0 || info.location == "no") {
    extract = true;
  }
  if (!info.name || info.name.length == 0 || info.name == "no") {
    extract = true;
  }
  if (!info.phone_no || info.phone_no.length == 0 || info.phone_no == "no") {
    extract = true;
  }
  if (!info.years_of_experiance || info.years_of_experiance.length == 0 || info.years_of_experiance == "no") {
    extract = true;
  }
  return extract;
};

export const should_do_force_shortlist = async (conversation: Conversation) => {
  let do_forced_shorlist = false;
  if (conversation.resume?.full_resume_text && conversation?.info?.suitable_job_profile && (conversation?.info?.expected_ctc || conversation.info?.current_ctc)) {
    if (!conversation?.shortlisted && conversation?.info.expected_ctc != "no") {
      if (conversation.info.suitable_job_profile != "no_profile") {
        do_forced_shorlist = true;
      }
    }
  }
  if (conversation?.stage == STAGE_SHORTLISTED && !conversation?.shortlisted) {
    do_forced_shorlist = true;
  }
  return do_forced_shorlist;
};

export function validateEmail(email: string) {
  var re = /\S+@\S+\.\S+/;
  return re.test(String(email).toLowerCase());
}
