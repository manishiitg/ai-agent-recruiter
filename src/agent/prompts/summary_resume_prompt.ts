import { parseStringPromise } from "xml2js";
import { DEEP_SEEK_V2_CODER } from "../../llms/deepkseek";
import { callLLM } from "../../llms";

export const summariseResume = async (resume_text: string, profileID: string) => {
  const prompt = `
You are tasked with analyzing a job candidate's resume and providing a concise summary of their qualifications. Follow these steps carefully:

1. First, you will be provided with the text of a resume. Read it thoroughly and pay close attention to all details.

  <resume>${resume_text}</resume>
  
2. After reading the resume, carefully analyze its contents. Focus on identifying the following key information:
- The candidate's name, email address, and/or phone number, location
- Work experience: companies/internships, positions held, and main responsibilities
- Educational background: degrees earned, institutions attended, and fields of study
- Notable projects the candidate has worked on
- Any key publications or technical skills highlighted in the resume

3. Extract and organize the most important details from each of these categories. Be thorough in your analysis, ensuring you don't miss any crucial information.

4. Once you have gathered all the key information, compose a concise summary of the candidate's qualifications and background. This summary should:
   - Focus on the main highlights and most relevant points from the categories mentioned above
   - Provide a clear and comprehensive overview of the candidate's professional profile


Present your final output in the following XML format:
<RESPONSE>
  <SCRATCHPAD>
  [Use this space to organize your thoughts and the key information you've extracted from the resume. This will not be included in the final output.]
  </SCRATCHPAD>
  <SUMMARY>
  [Insert your summary here]
  </SUMMARY>
</RESPONSE>

Remember to be objective and accurate in your analysis and summary. Do not include any personal opinions or judgments about the candidate's qualifications.`;

  const llm_output = await callLLM(prompt, profileID, 0, DEEP_SEEK_V2_CODER, { type: "summary" }, async (llm_output: string): Promise<Record<string, string>> => {
    return {};
  });

  const jObj = await parseStringPromise(llm_output, {
    explicitArray: false,
    strict: false,
  });
  if (!("RESPONSE" in jObj)) {
    throw new Error("response not found!");
  }

  const SUMMARY = jObj["RESPONSE"]["SUMMARY"];
  return { SUMMARY };
};

export const extractResume = async (resume_text: string, profileID: string) => {
  const prompt = `
You are tasked with analyzing a job candidate's resume and providing a concise summary of their qualifications. Follow these steps carefully:

1. First, you will be provided with the text of a resume. Read it thoroughly and pay close attention to all details.

  <resume>${resume_text}</resume>
  
2. After reading the resume, carefully analyze its contents. Focus on identifying the following key information:
- The candidate's name, email address, and/or phone number, location
- Work experience: companies/internships, positions held, and main responsibilities
- Educational background: degrees earned, institutions attended, and fields of study
- Notable projects the candidate has worked on
- Any key publications or technical skills highlighted in the resume

3. Extract and organize the most important details from each of these categories. Be thorough in your analysis, ensuring you don't miss any crucial information.

4. Once you have gathered all the key information, compose a summary of the candidate's qualifications and background.
   - Focus on the main highlights and most relevant points from the categories mentioned above
   - Provide a clear and comprehensive overview of the candidate's professional profile

Present your final output in the following XML format:

<RESPONSE>
  <SCRATCHPAD>
  [Use this space to organize your thoughts and the key information you've extracted from the resume. This will not be included in the final output.]
  </SCRATCHPAD>
  <CONTACT_INFO>candidates contact information</CONTACT_INFO>
  <WORK_EXP>candidates work experiance in detail in format company name, technical skills used, description of work done</WORK_EXP>
  <PROJECTS>candidates projects/internship in detail in format project_name, project description, project tech stack used</PROJECTS>
  <EDUCATION>candidates educational details</EDUCATION>
  <TECHNICAL_SKILLS>candidates technical skills</TECHNICAL_SKILLS>
</RESPONSE>

Remember to be objective and accurate in your analysis and summary. Do not include any personal opinions or judgments about the candidate's qualifications.`;

  const llm_output = await callLLM(prompt, profileID, 0, DEEP_SEEK_V2_CODER, { type: "extract_resume" }, async (llm_output: string): Promise<Record<string, string>> => {
    return {};
  });

  const jObj = await parseStringPromise(llm_output, {
    explicitArray: false,
    strict: false,
  });
  if (!("RESPONSE" in jObj)) {
    throw new Error("response not found!");
  }

  const SUMMARY = jObj["RESPONSE"]["SUMMARY"];
  const CONTACT_INFO = jObj["RESPONSE"]["CONTACT_INFO"];
  const WORK_EXP = jObj["RESPONSE"]["WORK_EXP"];
  const PROJECTS = jObj["RESPONSE"]["PROJECTS"];
  const EDUCATION = jObj["RESPONSE"]["EDUCATION"];
  const TECHNICAL_SKILLS = jObj["RESPONSE"]["TECHNICAL_SKILLS"];
  return { SUMMARY, CONTACT_INFO, WORK_EXP, PROJECTS, EDUCATION, TECHNICAL_SKILLS };
};
