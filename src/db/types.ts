import { Conversation } from "../agent/recruiter/types/conversation";

export interface Candidate {
  id: string;
  conversation?: Conversation;
  whatsapp: string;
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
  body: any;
  created_at: Date;
  conversationType: string;
  userType: "agent" | "candidate";
}
