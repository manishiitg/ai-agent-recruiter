import { Conversation } from "../agent/recruiter/types/conversation";

export interface Candidate {
  id: string;
  profile?: {
    resume_pdf_text: string;
    created_at: Date;
    llm_output?: string;
    is_shortlisted?: boolean;
    aboutme?: string;
    education?: string;
    workExp?: string;
    location?: string;
    tagLine?: string;
    feedTimeline?: {
      time: string | undefined;
      content: string | undefined;
    }[];
    candidate_type?: string;
  };
  conversation?: Conversation;
  meta?: Record<string, string>;
}

export interface WhatsAppCreds {
  name: string;
  phoneNo: string;
}

export interface WhatsAppConversaion {
  messageType: string;
  content: string;
  uid: string;
  body: string;
  created_at: Date;
  userType: "agent" | "candidate";
}
