export interface Conversation {
  started_at: Date;
  stage: string;
  classifed_to?: {
    reason: string;
    category: string;
  };
  conversation_completed?: boolean;
  conversation_completed_reason?: string;
  shortlisted?: ShortlistReponse;
  info?: CandidateInfo;
  actions_taken: string[];
  resume?: {
    created_at?: Date;
    SUMMARY?: string;
    // CONTACT_INFO?: string;
    // WORK_EXP?: string;
    // PROJECTS?: string;
    // EDUCATION?: string;
    // TECHNICAL_SKILLS?: string;
    full_resume_text: string;
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
