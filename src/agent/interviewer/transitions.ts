import { STAGE_COMPLETED, STAGE_GENERATE_QUES, STAGE_INTERVIEW_NOT_DONE, STAGE_INTRODUCTION, STAGE_NEW, STAGE_TECH_QUES } from "./rule_map";
import { Interview } from "./types";

// TODO: can be a state machine later on
export const transitionStage = (interview: Interview) => {
  let stage = "";
  if (interview.interview?.stage == STAGE_NEW) {
    if (interview.interview?.interview_info?.is_interview_ok === 1) {
      stage = STAGE_INTRODUCTION;
    }
    if (interview.interview?.interview_info?.is_interview_reject === 1) {
      stage = STAGE_INTERVIEW_NOT_DONE;
    }
  }
  // if (interview.interview?.stage == STAGE_INTRODUCTION) {
  //   if (interview.interview?.interview_info?.is_intro_done === 1 && interview.interview.interview_info.got_audio_file === true) {
  //     stage = STAGE_TECH_QUES;
  //   }
  // }
  // if (interview.interview?.stage == STAGE_TECH_QUES) {
  //   if (interview.interview?.interview_info?.is_tech_question1_done === 1 && interview.interview.interview_info.got_audio_file === true) {
  //     stage = STAGE_GENERATE_QUES;
  //   }
  // }
  return stage;
};
