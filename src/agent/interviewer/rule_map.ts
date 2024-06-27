export const STAGE_NEW = "new";
export const STAGE_INTRODUCTION = "introduction";
export const STAGE_TECH_QUES = "tech";
export const STAGE_TECH_QUES1 = "tech1";
export const STAGE_TECH_QUES2 = "tech2";
export const STAGE_TECH_QUES3 = "tech3";
export const STAGE_TECH_QUES4 = "tech4";
export const STAGE_TECH_QUES5 = "tech5";
export const STAGE_GENERATE_QUES = "generate_tech";
export const STAGE_COMPLETED = "completed";
export const STAGE_INTERVIEW_NOT_DONE = "interview_not_done";

const STAGE_RULE_MAP: Record<
  string,
  Record<
    string,
    {
      rule: string;
      response: string;
      to_remove_once_used?: boolean;
    }
  >
> = {
  new: {
    ask_for_interview: {
      rule: "Ask candidate to conduct interview on whatsapp",
      response: `Inform the candidate you would like to conduct basic HR screening on whatsapp itself. 
        This would require candidate to answer some basic HR and technical question via whatsapp audio recording. 
        Also inform candidate can they can send multiple audio recording to answer their question and but keep the recordings short.
        If he okey with the same, reply yes.
        Keep it short and to the point.`,
      to_remove_once_used: true,
    },
    remainder: {
      rule: "If already asked candidate to start interview but candidate has not replied",
      response: "send a remainder asking to start interview on whatsapp",
    },
    how_this_works: {
      rule: "If candidate asks how this works",
      response:
        "explain him the process. i will ask you some technical questions, you will provie answers via whatsapp audio. then we our HR team will listen to the audio response and evaluate your profile.",
    },
    general_message_or_question: {
      rule: "If candidate gave a general message like ok, yes or asking a question",
      response: "reply accordingly",
    },
  },
  introduction: {
    ask_for_introduction: {
      rule: "If candidate has given go ahead to start with his interview on whatsapp",
      response:
        "Ask candidate to give a brief introduction about himself, his project/work experiance for the job profile by recording a audio on whatsapp and sending it. Ask basic HR questions suitable for the job profile and candidates resume.",
      to_remove_once_used: true,
    },
    general_message_or_question: {
      rule: "If candidate gave a general message like ok, yes or asking a question",
      response: "ask candidate to reply with a very short message",
    },
    candidate_send_audio_later: {
      rule: "If candidate wants to send audio recording later on",
      response: "Candidate can send audio at his convinience",
    },
    candidate_doesnt_understand: {
      rule: "If candidate doesn't understand how to record on whatsapp",
      response: "Inform candidate to use the whatsapp voice recording feature and give a short introduction. Also inform he can send multiple recordings as well if needed.",
    },
    candidate_answered_sent_recording: {
      rule: "If candidate answered question and send recording based on <REASON_IF_AUDIO_RECORDING_SENT>",
      response: "Ask candidate if he wants to share any more recordings or if he is completed and ready for the tech questions",
    },
    candidate_answered_didnt_send_recording: {
      rule: "If candidate answered question",
      response: "ask candidate to send audio recording only and don't reply via text",
    },
    no_action: {
      rule: "If no response needed to be sent",
      response: "send remainder again to answer question",
    },
    remainder: {
      rule: "If already asked candidate about introduction but candidate has not replied",
      response: "send a remainder asking to give introduction on whatsapp",
    },
  },
  tech: {
    general_message_or_question: {
      rule: "If candidate gave a general message like ok, yes or asking a question",
      response: "reply accordingly a very short answer",
    },
    ask_tech_question: {
      rule: "If candidate has completed introduction",
      response: "Ask the tech question generated from <tech_question> tag. Explain question if needed.",
      to_remove_once_used: true,
    },
    remainder: {
      rule: "If already asked candidate about tech question 1 but candidate has not replied",
      response: "send a remainder asking to reply to tech question",
    },
    candidate_doesnt_understand: {
      rule: "If candidate doesn't understand how to record on whatsapp",
      response: "Inform candidate to use the whatsapp voice recording feature and give a short introduction. Also inform he can send multiple recordings as well if needed.",
    },
    candidate_answered_sent_recording: {
      rule: "If candidate answered question",
      response: "Ask candidate if he wants to share any more recordings or if he is completed and ready for the next question",
    },
    candidate_answered_didnt_send_recording: {
      rule: "If candidate answered question",
      response: "ask candidate to send audio recording only and don't reply via text",
    },
    ask_about_next_question: {
      rule: "If candidate has given audio recording and completed answer for question",
      response: "Are you ready for the next question?",
      to_remove_once_used: true,
    },
  },
  interview_not_done: {
    inform: {
      rule: "If candidate is not agreed to take give interview on whatsapp audio",
      response: "Inform candidate, its ok and hr's will reach out when possible",
    },
  },
};

export const getRuleMap = () => {
  STAGE_RULE_MAP["tech1"] = STAGE_RULE_MAP["tech"];
  STAGE_RULE_MAP["tech2"] = STAGE_RULE_MAP["tech"];
  STAGE_RULE_MAP["tech3"] = STAGE_RULE_MAP["tech"];
  STAGE_RULE_MAP["tech4"] = STAGE_RULE_MAP["tech"];
  STAGE_RULE_MAP["tech5"] = STAGE_RULE_MAP["tech"];

  return STAGE_RULE_MAP;
};
