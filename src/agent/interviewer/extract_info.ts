import { callDeepkSeek, DEEP_SEEK_V2_CODER } from "../../llms/deepkseek";
import { parseStringPromise } from "xml2js";
import { CandidateInfo } from "./types";

export const extractInfo = async (profileID: string, me: string, conversation: string, type: "gmail" | "linkedin" | "whatsapp" = "whatsapp") => {
  const prompt = `You are an HR recruiter on ${type}.
  You are having a conversation with a person on ${type}. 

  Your Name is: ${me}

  Below is the conversation till now. Conversion are sorted from first conversion to most recent. 
  <conversation>${conversation}</conversation>  
  
  Information To Extract:
  1. CANDIDATE_ACCEPTED_INTERVIEW: if we have asked the candidate to conduct interview specifically on whatsapp and he is agreed to them same.
  2. CANDIDATE_REJECTED_INTERVIEW: if doesn't want to do interview on whatsapp
  3. CANDIDATE_READY_FOR_NEXT_QUESTION: if we have asked candidate if he is ready for next question in the most recent conversation and he has mentioned yes.

  mention "no" if information doesn't exist, don't make up any information outside the conversion

  Think step by step before you answer
  Reply in xml format below:

  <RESPONSE>
    <REASON>your step by step reasoning for every information you extract.</REASON>
    <CANDIDATE_ACCEPTED_INTERVIEW>yes or no if candidate accepted to start the interview</CANDIDATE_ACCEPTED_INTERVIEW>
    <CANDIDATE_REJECTED_INTERVIEW>yes or no if candidate rejected to start the interview</CANDIDATE_REJECTED_INTERVIEW>
  </RESPONSE>
  `;

  const llm_output = await callDeepkSeek(prompt, profileID, 0, DEEP_SEEK_V2_CODER, { type: "extractinterviewinfo" }, async (llm_output: string): Promise<Record<string, string>> => {
    const jObj = await parseStringPromise(llm_output, {
      explicitArray: false,
      strict: false,
    });
    let obj = jObj["RESPONSE"];
    delete obj.REASON;
    return obj;
  });
  console.log("LLM Output:", llm_output);

  const jObj = await parseStringPromise(llm_output, {
    explicitArray: false,
    strict: false,
  });
  if (!("RESPONSE" in jObj)) {
    throw new Error("response not found!");
  }
  let extractedFields: Record<string, string> = jObj["RESPONSE"];

  let start_interview = 0;
  if ("CANDIDATE_ACCEPTED_INTERVIEW" in extractedFields) {
    if (extractedFields["CANDIDATE_ACCEPTED_INTERVIEW"].toLowerCase().includes("yes")) {
      start_interview = 1;
    }
    if (extractedFields["CANDIDATE_ACCEPTED_INTERVIEW"].toLowerCase().includes("no")) {
      start_interview = -1;
    }
  }

  let reject_interview = 0;
  if ("CANDIDATE_REJECTED_INTERVIEW" in extractedFields) {
    if (extractedFields["CANDIDATE_REJECTED_INTERVIEW"].toLowerCase().includes("yes")) {
      reject_interview = 1;
    }
    if (extractedFields["CANDIDATE_REJECTED_INTERVIEW"].toLowerCase().includes("no")) {
      reject_interview = -1;
    }
  }

  return { llm_output, start_interview, reject_interview };
};
