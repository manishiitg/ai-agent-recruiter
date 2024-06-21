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
    created_at: Date;
    // full_resume_pdf: string;
    full_resume_text: string;
    resume_summary?: string;
  };
}

export interface CandidateInfo {
  current_ctc?: string;
  expected_ctc?: string;
  years_of_experiance?: string;
  phone_no?: string;
  location?: string;
  classified_category?: string;
  email?: string;
  suitable_job_profile?: string;
  hiring_for_job_profile?: boolean;
}

export interface ShortlistReponse {
  shortlisted_for_profile: boolean;
  shortlisted_reason: string;
  llm_response: string;
  job_profile: string;
}

export interface ConversationMessage {
  name: string;
  content: string;
  date: Date;
}