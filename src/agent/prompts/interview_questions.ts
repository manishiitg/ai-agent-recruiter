import { parseStringPromise } from "xml2js";
import { DEEP_SEEK_V2_CODER } from "./../../llms/deepkseek";
import { callLLM } from "../../llms";

export const ask_question_for_tech_interview = async (hiring_for_profile: string, interview_question_topic: string, previous_questions: string[]) => {
  let llm_output = "";

  const prompt = `You need to generate a interview question for job profile ${hiring_for_profile.length ? `${hiring_for_profile}` : "software development role"} and topic ${interview_question_topic}

    Before providing the question, please show your step-by-step reasoning and analysis of the resume that led you to select those questions. Provide this reasoning inside <SCRATCHPAD> tags.
    Then, based on your analysis, generate 1 short technical interview questions specifically tailored to assess ${interview_question_topic}. 

    Generate a difficult and specific question which candidate should be able to answer if he has good knowedge of the topic.
    Candidate would answer this question over voice call, so it shouldn't not involve any code writing.
    Also the question should be such that answer is short but precise. 

    The question should be short and straight forward and directly judge candidates ability on the topic ${interview_question_topic}. 

    For each question, also provide an example of how the candidate might answer or what a correct answer might contain, inside <EXPECTED_ANSWER_#> tags.
    The answers should not contain any code, but rather should be explained as a candidate might answer over a phone call. 
    Provide clear, detailed and technical answers.

    Previous questions asked
    <previous_questions>
    ${previous_questions.join(",\\n")}
    </previous_questions>
    Do not repeat questions.

    Then, output each of the questions inside its own XML tags, like this:
    Respond with your full output in this XML format:
    <RESPONSE>            
        <SCRATCHPAD>your step by step reasoning</SCRATCHPAD>
        <QUESTION1>
        Question 1 text
        </QUESTION1>
        <EXPECTED_ANSWER_1>
        Expected answer for question1
        </EXPECTED_ANSWER_1>
    </RESPONSE>   `;

  const llm_output_reponse = await callLLM(prompt, "resume_ques_gen", 0.5, DEEP_SEEK_V2_CODER, { type: "resume_ques_gen" }, async (llm_output: string): Promise<Record<string, string>> => {
    const jObj = await parseStringPromise(llm_output, {
      explicitArray: false,
      strict: false,
    });
    return {
      QUESTION1: jObj["RESPONSE"]["QUESTION1"],
    };
  });

  llm_output = llm_output_reponse.response;
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

  return { SCRATCHPAD, QUESTION1, EXPECTED_ANSWER_1, cost: llm_output_reponse.cost };
};
