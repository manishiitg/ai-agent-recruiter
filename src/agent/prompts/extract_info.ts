import { callDeepkSeek, DEEP_SEEK_V2_CODER } from "../../llms/deepkseek";
import { parseStringPromise } from "xml2js";
import { linkedJobProfileRules } from "../recruiter/jobconfig";
import { CandidateInfo } from "../recruiter/types/conversation";
import { validateEmail } from "../recruiter/helper";

export const CONV_CLASSIFY_CANDIDATE_JOB_PREFIX = "1";
export const CONV_CLASSIFY_CANDIDATE_JOB = `${CONV_CLASSIFY_CANDIDATE_JOB_PREFIX}. Candidate applying or enquiring for job`;
export const CONV_CLASSIFY_INSTITUTE_PLACEMENT_PREFIX = "2";
export const CONV_CLASSIFY_INSTITUTE_PLACEMENT = `${CONV_CLASSIFY_INSTITUTE_PLACEMENT_PREFIX}. Institute promoting their candidates`;

export const CONV_CLASSIFY_WISHES_PREFIX = "3";
export const CONV_CLASSIFY_WISHES = `${CONV_CLASSIFY_WISHES_PREFIX}. Wishing regarding birthdays, anniversary or other occasion`;

export const CONV_CLASSIFY_FRIEND_PREFIX = "4";
export const CONV_CLASSIFY_FRIEND = `${CONV_CLASSIFY_WISHES_PREFIX}. Applying job for friend`;

export const CONV_CLASSIFY_RESIGN_PREFIX = "5";
export const CONV_CLASSIFY_RESIGN = `${CONV_CLASSIFY_RESIGN_PREFIX}. Others`;

export const CONV_CLASSIFY_OTHERS_PREFIX = "6";
export const CONV_CLASSIFY_OTHERS = `${CONV_CLASSIFY_OTHERS_PREFIX}. Others`;

export const extractInfo = async (
  profileID: string,
  me: string,
  conversation: string,
  short_profile?: string,
  type: "gmail" | "linkedin" = "linkedin",
  most_recent_message?: string
): Promise<CandidateInfo> => {
  let open_jobs = "";
  let ix = 1;
  for (const k in linkedJobProfileRules) {
    open_jobs += `${ix}. ${k}\n`;
    ix++;
  }

  const prompt = `You are an HR recruiter on ${type}.
  You are having a conversation with a person on ${type}. 

  Your Name is: ${me}

  ${short_profile ? `<short_profile>${short_profile}<short_profile>` : ""}
  

  Below is the conversation till now. Conversion are sorted from first conversion to most recent. 
  <conversation>${conversation}</conversation>  

  ${most_recent_message ? `<most_recent_message>${most_recent_message}</most_recent_message>` : ""}

  Job Profiles we are hiring for right now:
  <open_jobs>${open_jobs}</open_jobs>


  You need to extract the following information from the <conversation>${short_profile ? "/<short_profile>" : ""} and also
  You need to classify this conversation into any of the categories below

  Categories
  ${CONV_CLASSIFY_CANDIDATE_JOB}
  ${CONV_CLASSIFY_INSTITUTE_PLACEMENT}  
  ${CONV_CLASSIFY_WISHES}
  ${CONV_CLASSIFY_FRIEND}
  ${CONV_CLASSIFY_RESIGN}
  ${CONV_CLASSIFY_OTHERS}
  

  Information To Extract:
  1. CURRENT_CTC: if candidate has mentioned his current ctc
  2. EXPECTED_CTC: If candidate has written his expected ctc in conversion, or if candidate has written in conversion candidate doesn't have an expected ctc or if has mentioned in conversation expected ctc is negotiable.
  3. YEARS_OF_EXPERIANCE: if candidate has mentioned no of years of experiance
  4. PHONE_NO: if candidate has provided phone no
  5. LOCATION: candidates current location, give priority to <conversation> when fetching location.
  6. EMAIL: email of the candidate
  7. SUITABLE_JOB_PROFILE: select closest matching job profile we are hiring for only from open jobs, if no job profile match return "no_profile"
  8. Name: name of candidate

  Make sure to select suitable job from <open_jobs> only, don't make up a job profile.
  To determine if company is hiring for a job profile, only look at <open_jobs> don't see conversation

  mention "no" if information doesn't exist, don't make up any information outside the conversion
  expected ctc should be extracted only from conversion

  Think step by step before you answer
  Reply in xml format below:

  <RESPONSE>
    <CLASSIFIED_CATEGORY>full selected classified category with its number</CLASSIFIED_CATEGORY>
    <REASON_FOR_SELECTING_JOB_PROFILE>reason for selecting job profile and are we hiring for this job profile</REASON_FOR_SELECTING_JOB_PROFILE>
    <SUITABLE_JOB_PROFILE>select a single job profile most suitable based on resume from open job profiles</SUITABLE_JOB_PROFILE>
    <HIRING_FOR_JOB_PROFILE>are we hiring for the job profile yes or no</HIRING_FOR_JOB_PROFILE>
    <CURRENT_CTC>current ctc if any</CURRENT_CTC>
    <EXPECTED_CTC>expected ctc if any<EXPECTED_CTC>
    <YEARS_OF_EXPERIANCE>years of experiance if any</YEARS_OF_EXPERIANCE>
    <PHONE_NO>phone no if any</PHONE_NO>
    <LOCATION>location if any</LOCATION>
    <EMAIL>email address</EMAIL>
    <NAME>name of candidate</NAME>
  </RESPONSE>
  `;

  const llm_output = await callDeepkSeek(prompt, profileID, 0, DEEP_SEEK_V2_CODER, { type: "extractinfo" }, async (llm_output: string): Promise<Record<string, string>> => {
    const jObj = await parseStringPromise(llm_output, {
      explicitArray: false,
      strict: false,
    });
    let obj = jObj["RESPONSE"];
    delete obj.REASON_FOR_SELECTING_JOB_PROFILE;
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

  let info: CandidateInfo = {};
  if ("CURRENT_CTC" in extractedFields) {
    info.current_ctc = extractedFields["CURRENT_CTC"];
    if (info.current_ctc == "no") {
      info.current_ctc = "";
    }
  }
  if ("EXPECTED_CTC" in extractedFields) {
    info.expected_ctc = extractedFields["EXPECTED_CTC"];
    if (info.expected_ctc == "no") {
      info.expected_ctc = "";
    }
  }
  if ("YEARS_OF_EXPERIANCE" in extractedFields) {
    info.years_of_experiance = extractedFields["YEARS_OF_EXPERIANCE"];
    if (info.years_of_experiance == "no") {
      info.years_of_experiance = "";
    }
  }
  if ("PHONE_NO" in extractedFields) {
    info.phone_no = extractedFields["PHONE_NO"];
    if (info.phone_no == "no") {
      info.phone_no = "";
    }
  }
  if ("LOCATION" in extractedFields) {
    info.location = extractedFields["LOCATION"];
    if (info.location == "no") {
      info.location = "";
    }
  }
  if ("CLASSIFIED_CATEGORY" in extractedFields) {
    info.classified_category = extractedFields["CLASSIFIED_CATEGORY"];
    if (info.classified_category == "no") {
      info.classified_category = "";
    }
  }
  if ("EMAIL" in extractedFields) {
    info.email = extractedFields["EMAIL"];
    if (info.email == "no") {
      info.email = "";
    }
    if (!validateEmail(info.email)) {
      info.email = "";
    }
  }
  if ("SUITABLE_JOB_PROFILE" in extractedFields) {
    info.suitable_job_profile = extractedFields["SUITABLE_JOB_PROFILE"];
    if (info.suitable_job_profile == "no job profile" || info.suitable_job_profile == "no") {
      info.suitable_job_profile = "";
    }
  }
  if ("HIRING_FOR_JOB_PROFILE" in extractedFields) {
    if (extractedFields["HIRING_FOR_JOB_PROFILE"].toLowerCase().includes("yes")) {
      info.hiring_for_job_profile = true;
    } else {
      info.hiring_for_job_profile = false;
    }
  }
  if ("NAME" in extractedFields) {
    info.name = extractedFields["NAME"];
  }

  return info;
};
