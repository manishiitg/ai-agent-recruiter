import { parseStringPromise } from "xml2js";
import { callDeepkSeek, DEEP_SEEK_V2_CODER } from "./../../llms/deepkseek";


export const single_question_to_ask_from_resume = async (resume: string, hiring_for_profile: string, job_criteria: string) => {
  let llm_output = "";

  const prompt = `Here is the resume of a candidate for a ${hiring_for_profile.length ? `${hiring_for_profile}` : "software development role"}:

    <resume>
    ${resume}
    </resume>

    Please read through the resume carefully. As you do, think step-by-step about what technical skills, knowledge, and experience are demonstrated or implied by the content of the resume. 

    Then, based on your analysis of the resume, please generate 3 technical interview questions that would allow you to assess the candidate's proficiency in the most important technical skills required for a ${
      hiring_for_profile.length ? `${hiring_for_profile}` : "software development"
    } role. 

    ${job_criteria.length > 0 ? `Question should judge candidate on the critira <job_criteria>${job_criteria}</job_criteria>` : ""}

    The questions should be specifically tailored to the candidate's work experiance and projects mentioned in his resume.

    Before providing the questions, please show your step-by-step reasoning and analysis of the resume that led you to select those questions. Provide this reasoning inside <SCRATCHPAD> tags.
    Then, based on your analysis, generate 3 technical interview questions specifically tailored to assess the candidate's proficiency in the most important skills you identified from their resume. 

    The 3 question should be the most difficult question.

    For each question, also provide an example of how the candidate might answer or what a correct answer might contain, inside <EXPECTED_ANSWER_#> tags.
    The answers should not contain any code, but rather should be explained as a candidate might answer over a phone call. 
    Provide clear, detailed and technical answers.

    Then, output each of the 3 questions inside its own XML tags, like this:
    Respond with your full output in this XML format:
    <RESPONSE>            
        <SCRATCHPAD>your step by step reasoning</SCRATCHPAD>
        <QUESTION1>
        Question 1 text
        </QUESTION1>
        <EXPECTED_ANSWER_1>
        Expected answer for question1
        </EXPECTED_ANSWER_1>
    </RESPONSE>   

    Remember, the questions should assess the key technical competencies based on candidates projects/work experiance mentioned in resume and required for a ${
      hiring_for_profile.length ? `${hiring_for_profile}` : "software development role"
    }. Aim is to ask questions that will give you meaningful signal about the candidate's technical abilities.
          `;

  llm_output = await callDeepkSeek(prompt, "resume_ques_gen", 0, DEEP_SEEK_V2_CODER, { type: "resume_ques_gen_single" }, async (llm_output: string): Promise<Record<string, string>> => {
    const jObj = await parseStringPromise(llm_output, {
      explicitArray: false,
      strict: false,
    });
    return {
      QUESTION1: jObj["RESPONSE"]["QUESTION1"],
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

  const QUESTION1 = jObj["RESPONSE"]["QUESTION1"];
  const EXPECTED_ANSWER_1 = jObj["RESPONSE"]["EXPECTED_ANSWER_1"];

  return { SCRATCHPAD, QUESTION1, EXPECTED_ANSWER_1 };
};


export const question_to_ask_from_resume = async (resume: string, hiring_for_profile: string, job_criteria: string) => {
  let llm_output = "";

  const prompt = `Here is the resume of a candidate for a ${hiring_for_profile.length ? `${hiring_for_profile}` : "software development role"}:

    <resume>
    ${resume}
    </resume>

    Please read through the resume carefully. As you do, think step-by-step about what technical skills, knowledge, and experience are demonstrated or implied by the content of the resume. 

    Then, based on your analysis of the resume, please generate 3 technical interview questions that would allow you to assess the candidate's proficiency in the most important technical skills required for a ${
      hiring_for_profile.length ? `${hiring_for_profile}` : "software development"
    } role. 

    ${job_criteria.length > 0 ? `Question should judge candidate on the critira <job_criteria>${job_criteria}</job_criteria>` : ""}

    The questions should be specifically tailored to the candidate's work experiance and projects mentioned in his resume.

    Before providing the questions, please show your step-by-step reasoning and analysis of the resume that led you to select those questions. Provide this reasoning inside <SCRATCHPAD> tags.
    Then, based on your analysis, generate 3 technical interview questions specifically tailored to assess the candidate's proficiency in the most important skills you identified from their resume. 

    The 3 question should be the most difficult question.

    For each question, also provide an example of how the candidate might answer or what a correct answer might contain, inside <EXPECTED_ANSWER_#> tags.
    The answers should not contain any code, but rather should be explained as a candidate might answer over a phone call. 
    Provide clear, detailed and technical answers.

    Then, output each of the 3 questions inside its own XML tags, like this:
    Respond with your full output in this XML format:
    <RESPONSE>            
        <SCRATCHPAD>your step by step reasoning</SCRATCHPAD>
        <QUESTION1>
        Question 1 text
        </QUESTION1>
        <EXPECTED_ANSWER_1>
        Expected answer for question1
        </EXPECTED_ANSWER_1>

        <QUESTION2>
        Question 2 text 
        </QUESTION2>
        <EXPECTED_ANSWER_2>
        Expected answer for question2
        </EXPECTED_ANSWER_2>

        <QUESTION3>
        Question 3 text 
        </QUESTION3>
        <EXPECTED_ANSWER_3>
        Expected answer for question3
        </EXPECTED_ANSWER_3>
    </RESPONSE>   

    Remember, the questions should assess the key technical competencies based on candidates projects/work experiance mentioned in resume and required for a ${
      hiring_for_profile.length ? `${hiring_for_profile}` : "software development role"
    }. Aim is to ask questions that will give you meaningful signal about the candidate's technical abilities.
          `;

  llm_output = await callDeepkSeek(prompt, "resume_ques_gen", 0, DEEP_SEEK_V2_CODER, { type: "resume_ques_gen" }, async (llm_output: string): Promise<Record<string, string>> => {
    const jObj = await parseStringPromise(llm_output, {
      explicitArray: false,
      strict: false,
    });
    return {
      QUESTION1: jObj["RESPONSE"]["QUESTION1"],
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

  const QUESTION1 = jObj["RESPONSE"]["QUESTION1"];
  const EXPECTED_ANSWER_1 = jObj["RESPONSE"]["EXPECTED_ANSWER_1"];

  const QUESTION2 = jObj["RESPONSE"]["QUESTION2"];
  const EXPECTED_ANSWER_2 = jObj["RESPONSE"]["EXPECTED_ANSWER_2"];

  const QUESTION3 = jObj["RESPONSE"]["QUESTION3"];
  const EXPECTED_ANSWER_3 = jObj["RESPONSE"]["EXPECTED_ANSWER_3"];

  return { SCRATCHPAD, QUESTION1, QUESTION2, EXPECTED_ANSWER_1, EXPECTED_ANSWER_2, QUESTION3, EXPECTED_ANSWER_3 };
};
