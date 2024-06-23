import { callDeepseekViaMessages, DEEP_SEEK_V2_CHAT } from "../../llms/deepkseek";
import { STAGE_NEW, STAGE_RULE_MAP, STAGE_TECH_QUES1, STAGE_TECH_QUES2 } from "./rule_map";
import { parseStringPromise } from "xml2js";
import { ConversationMessage, Interview } from "./types";
import { convertConversationToText } from "./helper";

export const generateConversationReply = async (
  profileID: string,
  conversationObj: Interview,
  me: string,
  conversation: ConversationMessage[],
  type: "gmail" | "linkedin" | "whatsapp" = "whatsapp"
): Promise<{
  action: string;
  reply: string;
  reason: string;
  output: string;
}> => {
  const stage = conversationObj.interview?.stage || STAGE_NEW;
  const actions_taken = conversationObj.interview?.actions_taken || [];
  const extraInfo = conversationObj.interview?.info;
  const context = get_context(conversationObj);

  console.log("got candidate stage", stage);
  if (!STAGE_RULE_MAP[stage]) {
    throw new Error("stage not found");
  }

  let priority_rules = ``;
  let other_rules = ``;

  const pending_actions: string[] = [];
  for (const action in STAGE_RULE_MAP[stage]) {
    let response = STAGE_RULE_MAP[stage][action].response;
    if (STAGE_RULE_MAP[stage][action].condition_ctc_response) {
      if (extraInfo?.years_of_experiance?.length) {
        response = STAGE_RULE_MAP[stage][action].condition_ctc_response.true;
      } else {
        response = STAGE_RULE_MAP[stage][action].condition_ctc_response.false;
      }
    }
    console.log("actions taken", conversationObj.interview?.actions_taken, `${stage}.${action}`, actions_taken.includes(`${stage}.${action}`));
    if (actions_taken.includes(`${stage}.${action}`)) {
      // || actions_taken.includes(`${action}`)
      console.log("skipping action", action);
      other_rules += `
        <rule_description>
          <rule>${STAGE_RULE_MAP[stage][action].rule}</rule>
          <response_rule>${response}</response_rule>
          <action>${action}</action>
        </rule_description>
        `;
      continue;
    }

    priority_rules += `
    <rule_description>
      <rule>${STAGE_RULE_MAP[stage][action].rule}</rule>
      <response_rule>${response}</response_rule>
      <action>${action}</action>
    </rule_description>
    `;
    pending_actions.push(action);
  }

  let tech_question_to_ask = "";
  if (conversationObj.interview?.stage == STAGE_TECH_QUES1) {
    if (conversationObj.interview?.tech_questions) {
      tech_question_to_ask = conversationObj.interview.tech_questions.question1;
    }
  }
  if (conversationObj.interview?.stage == STAGE_TECH_QUES2) {
    if (conversationObj.interview?.tech_questions) {
      tech_question_to_ask = conversationObj.interview.tech_questions.question2;
    }
  }

  const prompt = `
  You are an AI assistant acting as an Technical recruiter for Excellence Technologies. 
  Your task is to conduct an online interview for a job seeker on ${type}.
  Your name is ${me}.

  1. Company Information:
  <company_information>
  COMPANY NAME: Excellence Technologies
  COMPANY LOCATION: Noida
  </company_information>
    
  2. Context and Conversation History:
  <context>
  ${context}
  </context>

  3. Priority Rules:
  <priority_rules>
  ${priority_rules}
  </priority_rules>

  ${tech_question_to_ask.length ? `<tech_question>${tech_question_to_ask}</tech_question>` : ""}

  4. Other Rules (if any):
  ${other_rules ? `<other_rules>${other_rules}</other_rules>` : ""}


  5. Rule Analysis and Selection:
  - Carefully analyze all provided rules priority_rules and other_rules, giving higher priority to recent conversations over older ones.
  - When you analyze ever rule, provide explanation for the rule based on the conditions mentioned.
  - Select the best fitting rule based on the conversation and context.
  - If no actions are applicable, reply with "no_action" and do not create new actions.
  - Prioritize using the <priority_rules> first, and only use <other_rules> if the priority rules are not applicable.
  - Provide a step-by-step analysis of every rule in the <scratchpad> tag.
  - Give a detailed reason for selecting the final rule in the <FINAL_REASON> tag.
  
  9. Response Guidelines:
- Generate a suitable response based on the selected rule, conversation/context, and the final selected action <response_rule>.
- Do not mention the context or conversation explicitly in the final response.
- Use candidate's name to personalise response when available

  10. Output Structure:
  Provide your response in the following XML format:

<RESPONSE>
  <scratchpad>
  Provide step-by-step analysis of every rule, including rule names in format 
  <action_name></action_name> <rule_condition></rule_condition><analysis>reason if/why action sould be executed</analysis>
  </scratchpad>
  <FINAL_REASON>
  Detailed reason for selecting the rule
  </FINAL_REASON>
  <ACTION>
  Action exactly as mentioned in the selected rule
  </ACTION>
  <MESSAGE>
  Response to send on ${type} based response_rule of the selected action
  </MESSAGE>
</RESPONSE>

Remember to check all rules before selecting the final one, and ensure that your response is appropriate for an HR recruiter interacting with a job seeker.`;
  const messages: {
    content: string;
    role: "user" | "assistant";
  }[] = [];

  console.log("prompt", prompt);

  messages.push({
    role: "user",
    content: `Below is the conversation till now. Conversion are sorted from first conversion to most recent. 

      <conversation>
      ${convertConversationToText(conversation)}
      </conversation>

      Think step by step.
      `,
  });

  console.log("messages", messages);

  const llm_output = await callDeepseekViaMessages(prompt, messages, profileID, 0, DEEP_SEEK_V2_CHAT, { type: "reply_interview" }, async (llm_output: string): Promise<Record<string, string>> => {
    const jObj = await parseStringPromise(llm_output, {
      explicitArray: false,
      strict: false,
    });
    return {
      ACTION: jObj["RESPONSE"]["ACTION"],
    };
  });
  let reply = "";
  let action = "";
  let reason = "";

  const jObj = await parseStringPromise(llm_output, {
    explicitArray: false,
    strict: false,
  });
  if (!("RESPONSE" in jObj)) {
    throw new Error("response not found!");
  }

  reason = jObj["RESPONSE"]["FINAL_REASON"].trim();
  reply = jObj["RESPONSE"]["MESSAGE"].trim();
  action = jObj["RESPONSE"]["ACTION"].trim();
  action = `${stage}.${action}`;

  console.log("got final action", action);
  console.log("actions taken", actions_taken);
  console.log("got candidate stage", stage);
  return { action, reply, reason, output: llm_output };
};

export const get_context = (conversationObj: Interview) => {
  const suitable_job_profile = conversationObj.interview?.info?.suitable_job_profile ? conversationObj.interview?.info?.suitable_job_profile : "";

  let context = "";
  if (conversationObj.interview && conversationObj.interview.resume?.full_resume_text && conversationObj.interview.resume.full_resume_text.length) {
    context += `<candidate_resume>
      ${conversationObj.interview.resume.SUMMARY || conversationObj.interview.resume.full_resume_text}
    </candidate_resume>\n`;
  }
  if (suitable_job_profile.length > 0) {
    context += `<suitable_job_profile>Suitable Job Profile Based on Resume: ${suitable_job_profile}</suitable_job_profile>\n`;
  }

  const info = conversationObj.interview?.info;
  if (info?.current_ctc && info.current_ctc != "no") context += `Current CTC: ${info.current_ctc} \n`;
  if (info?.expected_ctc && info.expected_ctc != "no") {
    context += `Expected CTC: ${info.expected_ctc} \n`;
  }
  if (info?.years_of_experiance && info.years_of_experiance != "no") context += `Year of Experiance ${info.years_of_experiance} \n`;
  if (info?.phone_no && info.phone_no != "no") context += `Phone No ${info.phone_no} \n`;
  if (info?.location && info.location != "no") context += `Current Location ${info.location} \n`;
  if (info?.name && info.name != "no") context += `Candidate Name: ${info.name} \n`;

  return context;
};
