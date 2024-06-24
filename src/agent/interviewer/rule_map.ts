export const STAGE_NEW = "new";
export const STAGE_INTRODUCTION = "introduction";
export const STAGE_TECH_QUES1 = "tech1";
export const STAGE_TECH_QUES2 = "tech2";
export const STAGE_TECH_QUES3 = "tech3";
export const STAGE_COMPLETED = "completed";
export const STAGE_INTERVIEW_NOT_DONE = "interview_not_done";

export const STAGE_RULE_MAP: Record<
  string,
  Record<
    string,
    {
      rule: string;
      response: string;
      condition_ctc_response?: {
        true: string;
        false: string;
      };
    }
  >
> = {
  new: {
    ask_for_interview: {
      rule: "Ask candidate to conduct interview on whatsapp",
      response: `Inform the candidate you would like to conduct basic HR screening on whatsapp itself. 
        This would require candidate to answer some basic HR and technical question via whatsapp audio recording. 
        Also inform candidate can they can send multiple audio recording to answer their question and but keep the recordings short.
        If he okey with the same, reply yes.`,
    },
    remainder: {
      rule: "If already asked candidate to start interview but candidate has not replied",
      response: "send a remainder asking to start interview on whatsapp",
    },
  },
  introduction: {
    general_message: {
      rule: "If candidate gave a general message like ok, yes",
      response: "reply accordingly a very short answer",
    },
    ask_for_introduction: {
      rule: "If candidate has given go ahead to start with his interview on whatsapp",
      response:
        "Ask candidate to give a brief introduction about himself, his project/work experiance for the job profile by recording a audio on whatsapp and sending it. Ask basic HR questions suitable for the job profile and candidates resume.",
    },
    canddate_send_audio_later: {
      rule: "If candidate wants to send audio recording later on",
      response: "Candidate can send audio at his convinience",
    },
    remainder: {
      rule: "If already asked candidate about introduction but candidate has not replied",
      response: "send a remainder asking to give introduction on whatsapp",
    },
    candidate_doesnt_understand: {
      rule: "If candidate doesn't understand how to record on whatsapp",
      response: "Inform candidate to use the whatsapp voice recording feature and give a short introduction. Also inform he can send multiple recordings as well if needed.",
    },
    candidate_sent_recording: {
      rule: "If candidate has given recording",
      response: "Ask candidate if he wants to share any more recordings or if he is completed and ready for the next question",
    },
  },
  tech1: {
    general_message: {
      rule: "If candidate gave a general message like ok, yes",
      response: "reply accordingly a very short answer",
    },
    ask_tech_question: {
      rule: "If candidate has completed introduction",
      response: "Ask the tech question generated from <tech_question> tag. Explain question if needed.",
    },
    remainder: {
      rule: "If already asked candidate about tech question 1 but candidate has not replied",
      response: "send a remainder asking to reply to tech question",
    },
    candidate_doesnt_understand: {
      rule: "If candidate doesn't understand how to record on whatsapp",
      response: "Inform candidate to use the whatsapp voice recording feature and give a short introduction. Also inform he can send multiple recordings as well if needed.",
    },
    candidate_sent_recording: {
      rule: "If candidate has given recording",
      response: "Ask candidate if he wants to share any more recordings or if he is completed and ready for the next question",
    },
  },
  tech2: {
    general_message: {
      rule: "If candidate gave a general message like ok, yes",
      response: "reply accordingly a very short answer",
    },
    ask_tech_question: {
      rule: "If candidate has completed introduction",
      response: "Ask the tech question generated from <tech_question> tag. Explain question if needed.",
    },
    remainder: {
      rule: "If already asked candidate about tech question 2 but candidate has not replied",
      response: "send a remainder asking to reply to tech question",
    },
    candidate_doesnt_understand: {
      rule: "If candidate doesn't understand how to record on whatsapp",
      response: "Inform candidate to use the whatsapp voice recording feature and give a short introduction. Also inform he can send multiple recordings as well if needed.",
    },
    candidate_sent_recording: {
      rule: "If candidate has given recording",
      response: "Ask candidate if he wants to share any more recordings or if he is completed and ready for the next question",
    },
  },
  tech3: {
    general_message: {
      rule: "If candidate gave a general message like ok, yes",
      response: "reply accordingly a very short answer",
    },
    ask_tech_question: {
      rule: "If candidate has completed introduction",
      response: "Ask the tech question generated from <tech_question> tag. Explain question if needed.",
    },
    remainder: {
      rule: "If already asked candidate about tech question 3 but candidate has not replied",
      response: "send a remainder asking to reply to tech question",
    },
    candidate_doesnt_understand: {
      rule: "If candidate doesn't understand how to record on whatsapp",
      response: "Inform candidate to use the whatsapp voice recording feature and give a short introduction. Also inform he can send multiple recordings as well if needed.",
    },
    candidate_sent_recording: {
      rule: "If candidate has given recording",
      response: "Ask candidate if he wants to share any more recordings or if he is completed and ready for the next question",
    },
  },
  completed: {
    ask_for_introduction: {
      rule: "Inform candidate interview is completed",
      response: "Inform candidate interview is completed. Thanks for his time, we will review the recordings and get back asap.",
    },
  },
  interview_not_done: {
    inform: {
      rule: "If candidate is not agreed to take give interview on whatsapp audio",
      response: "Inform candidate, its ok and hr's will reach out when possible",
    },
  },
};
