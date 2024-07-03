import { parseStringPromise } from "xml2js";
import { Conversation } from "../recruiter/types/conversation";
import { get_context } from "./../recruiter/agent";
import { linkedJobProfileRules } from "../jobconfig";
import { callDeepkSeek, DEEP_SEEK_V2_CODER } from "../../llms/deepkseek";


export const shortlist = async (
  profileID: string,
  conversationObj: Conversation
): Promise<{
  is_shortlisted: boolean;
  reason: string;
  llm_output: string;
  job_profile: string;
}> => {
  const classified_job_profile = conversationObj.info?.suitable_job_profile;
  const full_resume_text = conversationObj.resume?.full_resume_text;
  const context = get_context(conversationObj);
  let shortlisting = "";

  console.log("candidate shortling existing", classified_job_profile);
  if (classified_job_profile) {
    for (const k in linkedJobProfileRules) {
      if (linkedJobProfileRules[k].is_open)
        if (classified_job_profile.includes(k) || k == classified_job_profile) {
          shortlisting += `Job Profile: ${k} \n Shortlisting Criteria: ${linkedJobProfileRules[k].full_criteria} \n\n`;
          break;
        }
    }
  }
  if (shortlisting.length == 0) {
    for (const k in linkedJobProfileRules) {
      if (linkedJobProfileRules[k].is_open) shortlisting += `Job Profile: ${k} \n Shortlisting Criteria: ${linkedJobProfileRules[k].full_criteria} \n\n`;
    }
  }

  let llm_output = "";
  const prompt = `You will be acting as an HR recruiter tasked with shortlisting or rejecting a job candidate based on their resume and profile. I will provide you with the following information to make your decision:

  <RULES_FOR_SHORTLISTING>
  ${shortlisting}
  </RULES_FOR_SHORTLISTING>
  
  <CANDIDATE_CURRENT_DATA>
  ${context}
  </CANDIDATE_CURRENT_DATA>
  
  Your task is to determine if the candidate meets the criteria to be shortlisted for this specific job profile:
  <CLASSIFIED_JOB_PROFILE>
  ${classified_job_profile}
  </CLASSIFIED_JOB_PROFILE>
  
  To make your decision, carefully review the candidate's resume and current data against all of the shortlisting rules provided for the job profile. The candidate must meet every rule in order to be shortlisted.
  
  In your response, show your reasoning and calculations step-by-step:
  - In <CTC_CALCULATION> tags, note the candidate's expected CTC converted to per month, and compare it to the CTC criteria for the job profile. If the candidate's CTC is in lacs, that is per year, so divide by 12 to get the monthly amount. If in thousands, that is already per month.
  - In <REASON> tags, go through each shortlisting rule one by one. For each rule, explain whether the candidate meets that specific requirement based on their resume and data. Cite the relevant info from the candidate's profile. Create only a single <REASON> tag.
  
  After you have checked all the shortlisting rules, make a final decision on whether to shortlist the candidate or not:
  - In <SHORTLIST> tags, write "YES" if the candidate meets all the rules and should be shortlisted, or "NO" if the candidate fails to meet any of the rules and should be rejected. 
  - In <FINAL_REASON> tags, summarize the key reasons for your decision in 1-2 concise sentences.
  
  If any information is missing and you are unable to evaluate a critira, that should not result in rejection a candidate.
  If information is missing, assume the rule gets passed.

  Your entire response should be formatted like this, with no extra tags or placeholders:
  <RESPONSE>
    <CTC_CALCULATION>Candidate's expected CTC per month vs. job's CTC criteria</CTC_CALCULATION>
    <JOB_PROFILE>Job profile name</JOB_PROFILE>
    <REASON>Step-by-step reasoning for every rule</REASON>
    <SHORTLIST>YES or NO</SHORTLIST>
  </RESPONSE>
  
  Remember, the candidate must meet ALL of the job's shortlisting rules to be accepted, otherwise they must be rejected. Review the candidate's information carefully and make your decision based solely on the facts provided. Do not make any assumptions that are not supported by the candidate's resume or data.`;

  llm_output = await callDeepkSeek(prompt, profileID, 0, DEEP_SEEK_V2_CODER, { type: "shortlist" }, async (llm_output: string): Promise<Record<string, string>> => {
    const jObj = await parseStringPromise(llm_output, {
      explicitArray: false,
      strict: false,
    });
    return {
      SHORTLIST: jObj["RESPONSE"]["SHORTLIST"],
      JOB_PROFILE: jObj["RESPONSE"]["JOB_PROFILE"],
    };
  });

  let is_shortlisted = false;
  let reason = "";
  let job_profile = "";
  let shortlist_reject_text = "";
  const jObj = await parseStringPromise(llm_output, {
    explicitArray: false,
    strict: false,
  });
  if (!("RESPONSE" in jObj)) {
    throw new Error("response not found!");
  }

  job_profile = jObj["RESPONSE"]["JOB_PROFILE"];
  const SHORTLIST = jObj["RESPONSE"]["SHORTLIST"];
  if (SHORTLIST.includes("NO")) {
    is_shortlisted = false;
  } else {
    is_shortlisted = true;
  }
  reason = `Full Reasoning: ${jObj["RESPONSE"]["REASON"]}. Final Reason: ${jObj["RESPONSE"]["FINAL_REASON"]}`;

  return { job_profile, is_shortlisted, reason, llm_output };
};
