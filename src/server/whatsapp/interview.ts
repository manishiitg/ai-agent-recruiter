import { generateConversationReply } from "../../agent/interviewer/agent";
import { STAGE_NEW } from "../../agent/interviewer/rule_map";
import { ConversationMessage, Interview } from "../../agent/interviewer/types";
import { getCandidateDetailsFromDB, getCandidateInterviewFromDB, saveCandidateInterviewToDB } from "../../db/mongo";
import { WhatsAppCreds } from "../../db/types";

export const conduct_interview = async (
  phoneNo: string,
  conversation: ConversationMessage[],
  creds: WhatsAppCreds
): Promise<{
  message: string;
  action: string;
  stage: string;
}> => {
  let interview: Interview;

  try {
    interview = await getCandidateInterviewFromDB(phoneNo);
  } catch {
    const candidate = await getCandidateDetailsFromDB(phoneNo);
    interview = {
      id: candidate.id,
      interview: {
        actions_taken: [],
        stage: STAGE_NEW,
        started_at: new Date(),
        resume: {
          full_resume_text: candidate.conversation?.resume?.full_resume_text || "",
          created_at: new Date(),
          SUMMARY: candidate.conversation?.resume?.SUMMARY || "",
        },
      },
    };

    await saveCandidateInterviewToDB(interview);
  }

  if (interview.interview?.conversation_completed) {
    console.log("interview message processing completed", interview.interview.conversation_completed_reason);
    return { message: "", action: "completed", stage: "completed" };
  }
  console.log("interview", interview);

  const llm = await generateConversationReply(phoneNo, interview, creds.name, conversation);
  let action = llm.action;
  let reply = llm.reply;

  return { message: reply, action: action, stage: interview.interview?.stage || "" };
};
