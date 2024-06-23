import { ObjectId } from "mongodb";

export interface Interview {
  id: string;
  interview?: {
    started_at: Date;
    stage: string;
    info?: CandidateInfo;
    interview_info: {
      is_interview_ok: 0 | -1 | 1; // default 0, 1 is accepted, -1 is rejected
      is_interview_reject: 0 | -1 | 1; // default 0, 1 is accepted, -1 is rejected
      is_intro_done: 0 | -1 | 1; // default 0, 1 is accepted, -1 is rejected
      is_tech_question1_done: 0 | -1 | 1; // default 0, 1 is accepted, -1 is rejected
      is_tech_question2_done: 0 | -1 | 1; // default 0, 1 is accepted, -1 is rejected
    };
    conversation_completed?: boolean;
    conversation_completed_reason?: string;
    shortlisted?: ShortlistReponse;
    actions_taken: string[];
    resume?: {
      created_at?: Date;
      SUMMARY?: string;
      full_resume_text: string;
    };
    tech_questions?: {
      question1: string;
      question2: string;
    };
  };
}

export interface CandidateInfo {
  current_ctc?: string;
  expected_ctc?: string;
  years_of_experiance?: string;
  phone_no?: string;
  location?: string;
  email?: string;
  suitable_job_profile?: string;
  hiring_for_job_profile?: boolean;
  name?: string;
}

export interface ShortlistReponse {
  shortlisted_for_profile: boolean;
  shortlisted_reason: string;
  llm_response: string;
  job_profile: string;
}

export interface ConversationMessage {
  name: "agent" | "candidate";
  content: string;
  date: Date;
}
