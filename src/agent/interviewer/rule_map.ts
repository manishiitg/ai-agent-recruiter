export const STAGE_NEW = "new";
export const STAGE_INTRODUCTION = "introduction";
export const STAGE_COMPLETED = "completed";
export const STAGE_REJECTED = "rejected";

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
      response:
        "Inform the candidate you would like to conduct basic HR screening on whatsapp itself. This would require candidate to answer some basic HR and technical question via whatsapp audio recording. If he okey with the same, reply yes.",
    },
  },
  introduction: {
    ask_for_introduction: {
      rule: "If candidate has not given his introduction",
      response: "Ask candidate to give a brief introduction about himself by recording a audio on whatsapp and sending it",
    },
  },
  completed: {
    ask_for_introduction: {
      rule: "Inform candidate interview is completed",
      response: "Inform candidate interview is completed. Thanks for his time, we will review the recordings and get back asap.",
    },
  },
  rejected: {
    rejected: {
      rule: "If Candidate is rejected based on context",
      response: "Inform candidate he is rejected and also mention reason in a polite way. Don't mention about other job profiles",
    },
    rejected_reason: {
      rule: "If candiate is asking for reason for reason",
      response: "Inform candidate reason in a polite way. Don't mention about other job profiles",
    },
    no_action: {
      rule: "If candiate is not asking for reason but responding with a general message",
      response: "take no action",
    },
  },
};
