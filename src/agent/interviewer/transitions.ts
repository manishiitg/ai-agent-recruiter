import { STAGE_COMPLETED, STAGE_INTERVIEW_NOT_DONE, STAGE_INTRODUCTION, STAGE_NEW, STAGE_TECH_QUES1, STAGE_TECH_QUES2, STAGE_TECH_QUES3 } from "./rule_map";
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
  if (interview.interview?.stage == STAGE_INTRODUCTION) {
    if (interview.interview?.interview_info?.is_intro_done === 1) {
      stage = STAGE_TECH_QUES1;
    }
  }
  if (interview.interview?.stage == STAGE_TECH_QUES1) {
    if (interview.interview?.interview_info?.is_tech_question1_done === 1) {
      stage = STAGE_TECH_QUES2;
    }
  }
  if (interview.interview?.stage == STAGE_TECH_QUES2) {
    if (interview.interview?.interview_info?.is_tech_question2_done === 1) {
      stage = STAGE_TECH_QUES3;
    }
  }
  if (interview.interview?.stage == STAGE_TECH_QUES3) {
    if (interview.interview?.interview_info?.is_tech_question3_done === 1) {
      stage = STAGE_COMPLETED;
    }
  }
  return stage;
};
