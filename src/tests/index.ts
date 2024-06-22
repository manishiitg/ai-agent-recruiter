import sortBy from "lodash/sortBy";
import { get_whatspp_conversations, getPendingNotCompletedCandidates, updateRemainderSent } from "../db/mongo";
import { WhatsAppConversaion, WhatsAppCreds } from "../db/types";
import { getCandidate, process_whatsapp_conversation } from "../server/whatsapp/conversation";
import { convertToIST } from "../server/whatsapp/util";
