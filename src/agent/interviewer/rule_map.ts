import { NUMBER_OF_INTERVIEW_QUESTIONS } from "../jobconfig";
import { Interview } from "./types";

export const STAGE_NEW = "new";
// export const STAGE_INTRODUCTION = "introduction";
export const STAGE_TECH_QUES = "tech";
// export const STAGE_TECH_QUES1 = "tech1";
// export const STAGE_TECH_QUES2 = "tech2";
// export const STAGE_TECH_QUES3 = "tech3";
// export const STAGE_TECH_QUES4 = "tech4";
// export const STAGE_TECH_QUES5 = "tech5";
export const STAGE_COMPLETED = "completed";
export const STAGE_INTERVIEW_NOT_DONE = "interview_not_done";

const STAGE_RULE_MAP: Record<
  string,
  Record<
    string,
    {
      rule: string;
      response: string;
      should_render?: (obj: Interview, current_stage: string, current_action: string) => boolean;
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
      should_render: (obj: Interview, current_stage: string, current_action: string) => {
        if (obj.interview?.actions_taken.includes(`${current_stage}.${current_action}`)) {
          return false;
        }
        return true;
      },
    },
    remainder: {
      rule: "If already asked candidate to start interview but candidate has not replied",
      response: "send a remainder if candidate is ready to start an interview",
    },
    how_this_works: {
      rule: "If candidate asks how this works",
      response:
        "explain him the process. i will ask you some technical questions, you will provie answers via whatsapp audio. then we our HR team will listen to the audio response and evaluate your profile.",
    },
    candidate_will_answer_at_a_later_time: {
      rule: "If candidate has he can answer at a later time",
      response: "Reply its alright and let me know when you are ready to start",
    },
    candidate_accepted_for_interview: {
      rule: "if we have asked the candidate to conduct interview specifically on whatsapp and he is agreed to them same.",
      response: "short reply",
      should_render: (obj: Interview, current_stage: string, current_action: string) => {
        const hasInterviewStageQuestions = obj.interview?.interview_questions_asked?.filter((row) => row.stage === current_stage);
        if (hasInterviewStageQuestions && hasInterviewStageQuestions?.length > 0) {
          return true;
        }
        return false;
      },
    },
    candidate_rejected_for_interview: {
      rule: "if doesn't want to do interview on whatsapp",
      response: "short reply",
      should_render: (obj: Interview, current_stage: string, current_action: string) => {
        const hasInterviewStageQuestions = obj.interview?.interview_questions_asked?.filter((row) => row.stage === current_stage);
        if (hasInterviewStageQuestions && hasInterviewStageQuestions?.length > 0) {
          return true;
        }
        return false;
      },
    },
    general_message_or_question: {
      rule: "If candidate gave a general message like ok, yes or asking a question",
      response: "reply accordingly",
    },
  },
  // introduction: {
  //   ask_for_introduction: {
  //     rule: "If candidate has given go ahead to start with his interview on whatsapp",
  //     response:
  //       "Ask candidate to give a brief introduction about himself, his project/work experiance for the job profile by recording a audio on whatsapp and sending it. Ask basic HR questions suitable for the job profile and candidates resume.",
  //     should_render: (obj: Interview, current_stage: string, current_action: string) => {
  //       if (obj.interview?.actions_taken.includes(`${current_stage}.${current_action}`)) {
  //         return false;
  //       }
  //       return true;
  //     },
  //   },
  //   candidate_ready_next_question: {
  //     rule: "If we have asked if he ready for next question and he has replied yes",
  //     response: "reply accordingly a very short answer",
  //     should_render: (obj: Interview, current_stage: string, current_action: string) => {
  //       const hasInterviewStageQuestions = obj.interview?.interview_questions_asked?.filter((row) => row.stage === current_stage);
  //       const hasAudio = obj.interview?.interview_info.got_audio_file;
  //       if (hasInterviewStageQuestions && hasInterviewStageQuestions?.length > 0 && hasAudio) {
  //         return true;
  //       } else {
  //         return false;
  //       }
  //     },
  //   },
  //   candidate_answered_sent_recording: {
  //     rule: "If candidate answered question and send recording based on <REASON_IF_AUDIO_RECORDING_SENT>",
  //     response: "Ask candidate if he wants to share any more recordings or if he is completed and ready for the tech questions",
  //     should_render: (obj: Interview, current_stage: string, current_action: string) => {
  //       const hasAudio = obj.interview?.interview_info.got_audio_file;
  //       if (hasAudio) {
  //         return true;
  //       } else {
  //         return false;
  //       }
  //     },
  //   },
  //   candidate_send_audio_later: {
  //     rule: "If candidate wants to send audio recording later on",
  //     response: "Candidate can send audio at his convinience",
  //   },
  //   candidate_doesnt_understand: {
  //     rule: "If candidate doesn't understand how to record on whatsapp",
  //     response: "Inform candidate to use the whatsapp voice recording feature and give a short introduction. Also inform he can send multiple recordings as well if needed.",
  //   },
  //   candidate_answered_didnt_send_recording: {
  //     rule: "If candidate answered question but didn't send audio recording",
  //     response: "ask candidate to send audio recording only and don't reply via text",
  //     should_render: (obj: Interview, current_stage: string, current_action: string) => {
  //       const hasInterviewStageQuestions = obj.interview?.interview_questions_asked?.filter((row) => row.stage === current_stage);
  //       const hasAudio = obj.interview?.interview_info.got_audio_file;
  //       if (hasInterviewStageQuestions && hasInterviewStageQuestions?.length > 0 && !hasAudio) {
  //         return true;
  //       } else {
  //         return false;
  //       }
  //     },
  //   },
  //   general_message_or_question: {
  //     rule: "If candidate gave a general message like ok, yes or asking a question",
  //     response: "ask candidate to reply with a very short message",
  //   },
  //   remainder: {
  //     rule: "If already asked candidate about introduction but candidate has not replied",
  //     response: "send a remainder asking to give introduction on whatsapp",
  //   },
  // },
  tech: {
    candidate_ready_next_question: {
      rule: "If we have asked if he ready for next question and he has replied yes he is ready",
      response: "ask if he is ready for next question",
      should_render: (obj: Interview, current_stage: string, current_action: string) => {
        const hasInterviewStageQuestions = obj.interview?.interview_questions_asked?.filter((row) => row.stage === current_stage);
        const hasAudio = obj.interview?.interview_info.got_audio_file;
        if (hasInterviewStageQuestions && hasInterviewStageQuestions?.length > 0 && hasAudio) {
          return true;
        } else {
          return false;
        }
      },
    },
    candidate_provided_wrong_answer: {
      rule: "If candidate replied with answer but its not correct or he doesn't konw the answer",
      response: "reply accordingly a very short answer",
      should_render: (obj: Interview, current_stage: string, current_action: string) => {
        const hasInterviewStageQuestions = obj.interview?.interview_questions_asked?.filter((row) => row.stage === current_stage);
        const hasAudio = obj.interview?.interview_info.got_audio_file;
        if (hasInterviewStageQuestions && hasInterviewStageQuestions?.length > 0 && hasAudio) {
          return true;
        } else {
          return false;
        }
      },
    },
    ask_tech_question: {
      rule: "If candidate has completed introduction or previous tech question and ready for next one",
      response: "Ask the tech question generated from <tech_question> tag. Explain question if needed, ask him to provide a detailed answer",
      should_render: (obj: Interview, current_stage: string, current_action: string) => {
        if (obj.interview?.actions_taken.includes(`${current_stage}.${current_action}`)) {
          return false;
        }
        const hasInterviewStageQuestions = obj.interview?.interview_questions_asked?.filter((row) => row.stage === current_stage);
        if (hasInterviewStageQuestions?.length == 0) {
          return true;
        } else {
          return false;
        }
      },
    },
    remainder: {
      rule: "If already asked candidate about tech question but candidate has not replied",
      response: "send a remainder asking to reply to tech question",
      should_render: (obj: Interview, current_stage: string, current_action: string) => {
        const hasInterviewStageQuestions = obj.interview?.interview_questions_asked?.filter((row) => row.stage === current_stage);
        if (hasInterviewStageQuestions && hasInterviewStageQuestions?.length > 0) {
          return true;
        } else {
          return false;
        }
      },
    },
    candidate_will_answer_at_a_later_time: {
      rule: "If candidate has he can answer at a later time",
      response: "Reply its alright",
    },
    candidate_doesnt_understand: {
      rule: "If candidate doesn't understand how to record on whatsapp",
      response: "Inform candidate to use the whatsapp voice recording feature and give a short introduction. Also inform he can send multiple recordings as well if needed.",
    },
    candidate_answered_sent_recording: {
      rule: "If candidate answered question",
      response: "Ask candidate if he wants to share any more recordings or if he is completed and ready for the next question",
      should_render: (obj: Interview, current_stage: string, current_action: string) => {
        const hasAudio = obj.interview?.interview_info.got_audio_file;
        if (hasAudio) {
          return true;
        } else {
          return false;
        }
      },
    },
    candidate_answered_didnt_send_recording: {
      rule: "If candidate answered question but didn't send audio recording",
      response: "ask candidate to send audio recording only and don't reply via text",
      should_render: (obj: Interview, current_stage: string, current_action: string) => {
        const hasInterviewStageQuestions = obj.interview?.interview_questions_asked?.filter((row) => row.stage === current_stage);
        if (hasInterviewStageQuestions && hasInterviewStageQuestions?.length > 0) {
          return true;
        } else {
          return false;
        }
      },
    },
    // general_message_or_question: {
    //   rule: "If candidate gave a general message like ok, yes or asking a question",
    //   response: "reply accordingly a very short answer",
    // },
  },
  completed: {
    inform: {
      rule: "Inform candidate his interview is completed",
      response: "Inform candidate his interview is completed and we will get back soon",
    },
  },
  interview_not_done: {
    inform: {
      rule: "If candidate is not agreed to take give interview on whatsapp audio",
      response: "Inform candidate, its ok and hr's will reach out when possible",
    },
  },
};

export const getRuleMap = (no_of_questions = NUMBER_OF_INTERVIEW_QUESTIONS) => {
  for (let i = 1; i < no_of_questions; i++) {
    STAGE_RULE_MAP[`tech${i}`] = STAGE_RULE_MAP["tech"];
  }
  return STAGE_RULE_MAP;
};
