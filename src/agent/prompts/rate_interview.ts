import { parseStringPromise } from "xml2js";
import { Conversation } from "../recruiter/types/conversation";
import { linkedJobProfileRules } from "../jobconfig";
import { callDeepkSeek, DEEP_SEEK_V2_CHAT, DEEP_SEEK_V2_CODER } from "../../llms/deepkseek";
import { Interview } from "../interviewer/types";

export const rate_interview = async (profileID: string, interviewObj: Interview) => {
  const classified_job_profile = interviewObj.interview?.info?.suitable_job_profile;
  let job_criteria = "";

  console.log("candidate shortling existing", classified_job_profile);
  if (classified_job_profile) {
    for (const k in linkedJobProfileRules) {
      if (linkedJobProfileRules[k].is_open)
        if (classified_job_profile.includes(k) || k == classified_job_profile) {
          job_criteria = linkedJobProfileRules[k].resume_rating;
          break;
        }
    }
  }

  let llm_output = "";
  const prompt = `You are an AI assistant tasked with evaluating a job applicant's interview performance. You will be provided with the job details, interview questions, best expected answers, and the candidate's actual responses. Your goal is to carefully review this information and provide ratings for each answer, as well as an assessment of the candidate's communication skills.

First, review the job details:

  <JOB_TITLE>
  ${classified_job_profile}
  </JOB_TITLE>

  <JOB_CRITERIA>
  ${job_criteria}
  </JOB_CRITERIA>

  Now, here are the interview questions and their best expected answers:

  HR Question: Give a brief introduction about yourself and your projects.

  Technical Question1: ${interviewObj.interview?.tech_questions?.question1}
  Best Expected Answer1: ${interviewObj.interview?.tech_questions?.answer1}

  Technical Question2: ${interviewObj.interview?.tech_questions?.question2}
  Best Expected Answer2: ${interviewObj.interview?.tech_questions?.answer2}

  Technical Question3: ${interviewObj.interview?.tech_questions?.question3}
  Best Expected Answer3: ${interviewObj.interview?.tech_questions?.answer3}

  Here are the answers given by the candidate:
  ${interviewObj.interview?.transcribe?.map((el, idx) => {
    return `<candidate_answer${idx}>${el.text}</candidate_answer${idx}>\n`;
  })}
  
  
Your task is to rate each of the candidate's answers on a scale of 0 to 10, where 0 is completely incorrect or irrelevant, and 10 is a perfect match to the best expected answer. Additionally, you should rate the candidate's overall communication skills based on their responses.
For each question, follow these steps:
1. Carefully compare the candidate's answer to the best expected answer.
2. Consider the relevance, accuracy, and completeness of the candidate's response.
3. Evaluate how well the answer aligns with the job criteria and requirements.
4. Provide a detailed reasoning for your rating in the <scratchpad> section.
5. Assign a final rating from 0 to 10.

For the communication skills rating, consider the following:
1. Clarity and coherence of the candidate's responses
2. Use of appropriate technical language and terminology
3. Ability to explain complex concepts simply
4. Overall structure and organization of their answers

After completing your evaluation, provide your response in the following XML format:

<RESPONSE>
  <SCRATCHPAD>
    [Provide your step-by-step reasoning for each question here]
  </SCRATCHPAD>
  <HR_QUESTION_RATING>final rating</HR_QUESTION_RATING>
  <TECH_QUESTION1_RATING>final rating</TECH_QUESTION1_RATING>
  <TECH_QUESTION2_RATING>final rating</TECH_QUESTION2_RATING>
  <TECH_QUESTION3_RATING>final rating</TECH_QUESTION3_RATING>
  <COMMUNICATION_SKILLS_RATING>final rating</COMMUNICATION_SKILLS_RATING>
</RESPONSE>

Remember to provide thorough reasoning in the <SCRATCHPAD> section before giving your final ratings. Your evaluation should be fair, objective, and based solely on the information provided.`;

  llm_output = await callDeepkSeek(prompt, profileID, 0, DEEP_SEEK_V2_CHAT, { type: "rate_resume" }, async (llm_output: string): Promise<Record<string, string>> => {
    const jObj = await parseStringPromise(llm_output, {
      explicitArray: false,
      strict: false,
    });
    return {
      RATING: jObj["RESPONSE"]["COMMUNICATION_SKILLS_RATING"],
    };
  });

  const jObj = await parseStringPromise(llm_output, {
    explicitArray: false,
    strict: false,
  });
  if (!("RESPONSE" in jObj)) {
    throw new Error("response not found!");
  }
  const SCRATCHPAD = jObj["RESPONSE"]["SCRATCHPAD"];
  const COMMUNICATION_SKILLS_RATING = jObj["RESPONSE"]["COMMUNICATION_SKILLS_RATING"];
  const HR_QUESTION_RATING = jObj["RESPONSE"]["HR_QUESTION_RATING"];
  const TECH_QUESTION1_RATING = jObj["RESPONSE"]["TECH_QUESTION1_RATING"];
  const TECH_QUESTION2_RATING = jObj["RESPONSE"]["TECH_QUESTION2_RATING"];
  const TECH_QUESTION3_RATING = jObj["RESPONSE"]["TECH_QUESTION3_RATING"];

  return { SCRATCHPAD, COMMUNICATION_SKILLS_RATING, HR_QUESTION_RATING, TECH_QUESTION1_RATING, TECH_QUESTION2_RATING, TECH_QUESTION3_RATING };
};
