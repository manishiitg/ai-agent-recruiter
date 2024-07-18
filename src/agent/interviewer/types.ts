import { ObjectId } from "mongodb";

export interface Interview {
  id: string;
  interview?: {
    avg_rating?: number;
    avg_rating_sent?: boolean;
    started_at: Date;
    updated_at: Date;
    stage: string;
    info?: CandidateInfo;
    interview_info: {
      is_interview_ok: 0 | -1 | 1; // default 0, 1 is accepted, -1 is rejected
      is_interview_reject: 0 | -1 | 1; // default 0, 1 is accepted, -1 is rejected
      is_intro_done: 0 | -1 | 1; // default 0, 1 is accepted, -1 is rejected
      is_tech_question1_done: 0 | -1 | 1; // default 0, 1 is accepted, -1 is rejected
      is_tech_question2_done: 0 | -1 | 1; // default 0, 1 is accepted, -1 is rejected
      is_tech_question3_done: 0 | -1 | 1; // default 0, 1 is accepted, -1 is rejected
      got_audio_file: boolean;
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
      scratchpad: string;
      question1: string;
      answer1: string;
      question2: string;
      answer2: string;
      question3: string;
      answer3: string;
    };
    interview_questions_asked?: [
      {
        stage: string;
        question_asked_to_user: string;
        topic: string;
        question_generated: string;
        expected_answer: string;
      }
    ];
    audio_file?: [
      {
        fileUrl: string;
        stage: string;
        transcribe: string;
        ai: string;
      }
    ];
    transcribe?: [
      {
        uid: string;
        text: string;
      }
    ];
    transcribe_completed?: boolean;
    interview_rating?: {
      SCRATCHPAD: any;
      HR_QUESTION_RATING: any;
      TECH_QUESTION1_RATING: any;
      TECH_QUESTION2_RATING: any;
      TECH_QUESTION3_RATING: any;
    };
    send_on_final_slack?: boolean
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
  gender?: string;
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
