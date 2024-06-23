import { parseStringPromise } from "xml2js";
import { Conversation } from "../recruiter/types/conversation";
import { get_context } from "./../recruiter/agent";
import { linkedJobProfileRules } from "../jobconfig";
import { callDeepkSeek, DEEP_SEEK_V2_CODER } from "../../llms/deepkseek";

export const rate_resume = async (profileID: string, conversationObj: Conversation) => {
  const classified_job_profile = conversationObj.info?.suitable_job_profile;
  let job_description = "";

  console.log("candidate shortling existing", classified_job_profile);
  if (classified_job_profile) {
    for (const k in linkedJobProfileRules) {
      if (linkedJobProfileRules[k].is_open)
        if (classified_job_profile.includes(k) || k == classified_job_profile) {
          job_description = linkedJobProfileRules[k].full_criteria;
          break;
        }
    }
  }
  let llm_output = "";
  const prompt = `Your task is to rate a job applicant's resume based on how well it fits a reference job description. I will provide you with the full text of the applicant's resume, as well as the job description. Your goal is to carefully review the resume and evaluate it on several key criteria to determine an overall fit score.

  Here is the applicant's resume:
  <CANDIDATE_RESUME>
    ${conversationObj.resume?.full_resume_text}
  </CANDIDATE_RESUME>

  And here is the job description to evaluate the resume against:
  <JOB_TITLE>
  ${classified_job_profile}
  </JOB_TITLE>
  <JOB_CRITERIA>
  ${job_description}
  </JOB_CRITERIA>
  
  Please read through the resume and job criteria carefully. Once you have reviewed them, I would like you to evaluate the resume on the following criteria:
  - Relevant technical skills the applicant possesses based on the job requirements. 
  - Difficulty, complexity and impact of projects the applicant has completed that are relevant to the role. Give high rating only if worked on complex projects.

  Give a rating of more than 5 only if candidate has worked on complex projects and has worked on multiple complex projects related to job criteria.

  For each of the projects, please write a analysis inside <PROJECT_ANALYSIS> tags that examines how technically difficult is the project. Cite specific examples from the resume and job description in your analysis.

  For each of these criteria, please write a analysis inside <analysis> tags that examines how well the applicant meets that criterion based on their resume. Cite specific examples from the resume and job description in your analysis.

  After you have completed your analysis of the three criteria, please provide an overall score from 1 to 10 indicating how good of a fit the applicant is for this specific role based on their resume. In this scoring system, a 1 means the applicant is a very poor fit, and a 5 means the applicant is an excellent fit. Provide your overall score inside <RATING> tags.

  Please be objective in your analysis and base your evaluation only on the contents of the applicant's resume and how it compares to the job description. Do not make inferences or assumptions that are not directly supported by the resume or job description.
  Remember to provide your analysis for each criterion inside <ANALYSIS> tags first, and then provide the overall score inside <RATING> tags at the end of your response.


Respond only in xml format as below.
  <RESPONSE>
    <PROJECT_ANALYSIS>step by step reasoning for project analysis</PROJECT_ANALYSIS>
    <ANALYSIS>Step-by-step reasoning for rating</ANALYSIS>
    <RATING>final rating</RATING>
  </RESPONSE>`;

  llm_output = await callDeepkSeek(prompt, profileID, 0, DEEP_SEEK_V2_CODER, { type: "rate_resume" }, async (llm_output: string): Promise<Record<string, string>> => {
    const jObj = await parseStringPromise(llm_output, {
      explicitArray: false,
      strict: false,
    });
    return {
      RATING: jObj["RESPONSE"]["RATING"],
    };
  });

  let reason = "";
  let rating = "";
  const jObj = await parseStringPromise(llm_output, {
    explicitArray: false,
    strict: false,
  });
  if (!("RESPONSE" in jObj)) {
    throw new Error("response not found!");
  }
  rating = jObj["RESPONSE"]["RATING"].trim();
  reason = jObj["RESPONSE"]["ANALYSIS"] + jObj["RESPONSE"]["PROJECT_ANALYSIS"];

  return { rating, reason };
};

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
  
  Your entire response should be formatted like this, with no extra tags or placeholders:
  <RESPONSE>
    <CTC_CALCULATION>Candidate's expected CTC per month vs. job's CTC criteria</CTC_CALCULATION>
    <JOB_PROFILE>Job profile name</JOB_PROFILE>
    <REASON>Brief Step-by-step reasoning and rule checking based on candidate's resume</REASON>
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
