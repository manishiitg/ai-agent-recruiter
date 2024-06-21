import { Conversation } from "../agent/recruiter/types/conversation";

export interface Candidate {
  id: string;
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
