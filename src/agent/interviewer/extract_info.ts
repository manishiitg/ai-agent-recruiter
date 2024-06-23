import { callDeepkSeek, DEEP_SEEK_V2_CODER } from "../../llms/deepkseek";
import { parseStringPromise } from "xml2js";
import { CandidateInfo } from "./types";

export const extractInfo = async (
  profileID: string,
  me: string,
  conversation: string,
  type: "gmail" | "linkedin" | "whatsapp" = "whatsapp"
): Promise<{ llm_output: string; start_interview: number; introduction_done: number; first_tech_done: number; second_tech_done: number; reject_interview: number }> => {
  const prompt = `You are an HR recruiter on ${type}.
  You are having a conversation with a person on ${type}. 

  Your Name is: ${me}

  Below is the conversation till now. Conversion are sorted from first conversion to most recent. 
  <conversation>${conversation}</conversation>  
  
  Information To Extract:
  1. CANDIDATE_ACCEPTED_INTERVIEW: if candidate wants to start interview
  2. CANDIDATE_REJECTED_INTERVIEW: if doesn't want to do interview on whatsapp
  3. CANDIATE_COMPLETED_INTRODUCTION: if candidate has completed his introduction and sent his introduction recordingds on whatsapp
  4. CANDIATE_COMPLETED_FIRST_TECH_QUESTION: if candidate has completed the first technical question asked
  5. CANDIATE_COMPLETED_SECOND_TECH_QUESTION: if candidate has completed the second technical question asked

  mention "no" if information doesn't exist, don't make up any information outside the conversion

  Think step by step before you answer
  Reply in xml format below:

  <RESPONSE>
    <REASON>your step by step reasoning</REASON>
    <CANDIDATE_ACCEPTED_INTERVIEW>yes or no if candidate accepted to start the interview</CANDIDATE_ACCEPTED_INTERVIEW>
    <CANDIDATE_REJECTED_INTERVIEW>yes or no if candidate rejected to start the interview</CANDIDATE_REJECTED_INTERVIEW>
    <CANDIATE_COMPLETED_INTRODUCTION>yes or no</CANDIATE_COMPLETED_INTRODUCTION>
    <CANDIATE_COMPLETED_FIRST_TECH_QUESTION>yes or no</CANDIATE_COMPLETED_FIRST_TECH_QUESTION>
    <CANDIATE_COMPLETED_SECOND_TECH_QUESTION>yes or no</CANDIATE_COMPLETED_SECOND_TECH_QUESTION>
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

  let introduction_done = 0;
  if ("CANDIATE_COMPLETED_INTRODUCTION" in extractedFields) {
    if (extractedFields["CANDIATE_COMPLETED_INTRODUCTION"].toLowerCase().includes("yes")) {
      introduction_done = 1;
    }
    if (extractedFields["CANDIATE_COMPLETED_INTRODUCTION"].toLowerCase().includes("no")) {
      introduction_done = -1;
    }
  }

  let first_tech_done = 0;
  if ("CANDIATE_COMPLETED_FIRST_TECH_QUESTION" in extractedFields) {
    if (extractedFields["CANDIATE_COMPLETED_FIRST_TECH_QUESTION"].toLowerCase().includes("yes")) {
      first_tech_done = 1;
    }
    if (extractedFields["CANDIATE_COMPLETED_FIRST_TECH_QUESTION"].toLowerCase().includes("no")) {
      first_tech_done = -1;
    }
  }
  let second_tech_done = 0;
  if ("CANDIATE_COMPLETED_SECOND_TECH_QUESTION" in extractedFields) {
    if (extractedFields["CANDIATE_COMPLETED_SECOND_TECH_QUESTION"].toLowerCase().includes("yes")) {
      second_tech_done = 1;
    }
    if (extractedFields["CANDIATE_COMPLETED_SECOND_TECH_QUESTION"].toLowerCase().includes("no")) {
      second_tech_done = -1;
    }
  }

  return { llm_output, start_interview, introduction_done, first_tech_done, second_tech_done, reject_interview };
};
