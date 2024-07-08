import { parseStringPromise } from "xml2js";
import { Conversation } from "../recruiter/types/conversation";
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
          job_description = linkedJobProfileRules[k].resume_rating;
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
  - Difficulty, complexity and impact of internships/ work experiance / training the applicant has completed that are relevant to the role. Give high rating only if worked on complex .

  Give a rating of more than 5 only if candidate has worked on complex internships/ work experiance / training and has worked on multiple complex  / internships/ work experiance / training related to job criteria.

  For each of the internships/ work experiance / training, please write a analysis inside <INTERNSHIP_WORK_TRAINING_ANALYSIS> tags that examines how technically difficult is the project. Cite specific examples from the resume and job description in your analysis. Do not assume difficulty level based on the title of the project as candidates lie a lot on resume. Actually check the project description mentioned by candidates in their resule and if they have used multiple tech stacks or written some complex problems they have solved in the project.  Complex project should involved multiple technologies or complex problems they have solved and should be mentioned in resume. In your analysis reference lines from candidate to justify difficulty level on project and don't know make up difficulty level yourself. Rating of more than 5 should be given only if candidate has used multiple technologies in a project.

  For each of these criteria, please write a analysis inside <analysis> tags that examines how complex / difficult is the project. Cite specific examples from the resume and job description in your analysis.

  After you have completed your analysis of the three criteria, please provide an overall score from 1 to 10 indicating how good of a fit the applicant is for this specific role based on their resume. In this scoring system, a 1 means the applicant is a very poor fit, and a 5 means the applicant is an excellent fit. Provide your overall score inside <RATING> tags.

  Please be objective in your analysis and base your evaluation only on the contents of the applicant's resume and how it compares to the job description. Do not make inferences or assumptions that are not directly supported by the resume or job description.
  Remember to provide your analysis for each criterion inside <ANALYSIS> tags first, and then provide the overall score inside <RATING> tags at the end of your response.


Respond only in xml format as below.
  <RESPONSE>
    <INTERNSHIP_WORK_TRAINING_ANALYSIS>step by step reasoning for project analysis and provide rating for every project done</INTERNSHIP_WORK_TRAINING_ANALYSIS>
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
  reason = jObj["RESPONSE"]["ANALYSIS"] + jObj["RESPONSE"]["INTERNSHIP_WORK_TRAINING_ANALYSIS"];

  return { rating, reason };
};
