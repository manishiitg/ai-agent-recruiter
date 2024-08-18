import { DEEP_SEEK_V2_CHAT } from "../../llms/deepkseek";
import { getRuleMap, STAGE_COMPLETED, STAGE_NEW, STAGE_TECH_QUES } from "./rule_map";
import { parseStringPromise } from "xml2js";
import { ConversationMessage, Interview } from "./types";
import { convertConversationToText } from "./helper";
import { companyInfo, NUMBER_OF_INTERVIEW_QUESTIONS } from "../jobconfig";
import { callViaMessages } from "../../llms";

export const generateConversationReply = async (
  profileID: string,
  conversationObj: Interview,
  me: string,
  conversation: ConversationMessage[],
  tech_question_to_ask = "",
  type: "gmail" | "linkedin" | "whatsapp" = "whatsapp"
): Promise<{
  action: string;
  reply: string;
  reason: string;
  output: string;
  cost: number;
}> => {
  let stage = conversationObj.interview?.stage || STAGE_NEW;
  const actions_taken = conversationObj.interview?.actions_taken || [];
  const context = get_context(conversationObj);

  const RULE_MAP = getRuleMap(NUMBER_OF_INTERVIEW_QUESTIONS);

  console.log("got candidate stage", stage);
  if (!RULE_MAP[stage]) {
    console.log("got candidate stage", stage, RULE_MAP);
    // throw new Error("stage not found");
    stage = STAGE_COMPLETED;
  }

  let priority_rules = ``;
  let other_rules = ``;

  const pending_actions: string[] = [];
  for (const action in RULE_MAP[stage]) {
    let response = RULE_MAP[stage][action].response;

    if (RULE_MAP[stage][action].should_render !== undefined) {
      // @ts-ignore
      if (!RULE_MAP[stage][action].should_render(conversationObj, stage, action)) {
        console.log(`not rendering ${stage}:${action}`);
        continue;
      }
    }
    // if (conversationObj.interview?.interview_info.got_audio_file) {
    //   if (conversationObj.interview.interview_info.got_audio_file === true) {
    //     if (action === "candidate_answered_didnt_send_recording") {
    //       console.log("skipping candidate_answered_didnt_send_recording");
    //       continue;
    //     }
    //   } else {
    //     if (action === "candidate_answered_sent_recording") {
    //       console.log("skipping candidate_answered_sent_recording");
    //       continue;
    //     }
    //   }
    // }

    // console.log("actions taken", conversationObj.interview?.actions_taken, `${stage}.${action}`, actions_taken.includes(`${stage}.${action}`));
    if (actions_taken.includes(`${stage}.${action}`)) {
      // console.log("skipping action", action);

      other_rules += `
        <rule_description>
        <action>${action}</action>
          <rule>${RULE_MAP[stage][action].rule}</rule>
          <response_rule>${response}</response_rule>
        </rule_description>
        `;

      continue;
    }

    priority_rules += `
    <rule_description>
      <action>${action}</action>
      <rule>${RULE_MAP[stage][action].rule}</rule>
      <response_rule>${response}</response_rule>
    </rule_description>
    `;
    pending_actions.push(action);
  }

  const prompt = `
  You are an AI assistant acting as an Technical recruiter for Excellence Technologies. 
  Your task is to conduct an online interview for a job seeker on ${type}.
  Your name is ${me}.

  1. Company Information:
  <company_information>
  ${companyInfo}
  </company_information>
    
  2. Context and Conversation History:
  <context>
  ${context}
  </context>

  3. Priority Rules:
  <priority_rules>
  ${priority_rules}
  </priority_rules>

  4. Other Rules (if any):
  ${other_rules ? `<other_rules>${other_rules}</other_rules>` : ""}

  ${tech_question_to_ask.length ? `<tech_question>${tech_question_to_ask}</tech_question>` : ""}
  ${
    conversationObj.interview?.interview_info.got_audio_file === true
      ? `<has_sent_recording>Yes candidate has sent recording.<has_sent_recording>`
      : `<has_sent_recording>No, candidate has not sent any recordings<has_sent_recording>`
  }

  5. Rule Analysis and Selection:
  - Carefully analyze all provided rules priority_rules and other_rules, giving higher priority to recent conversations over older ones.
  - When you analyze ever rule, provide explanation for the rule based on the conditions mentioned.
  - Select the best fitting rule based on the conversation and context.
  - If no actions are applicable, reply with "no_action" and do not create new actions.
  - Prioritize using the <priority_rules> first, and only use <other_rules> if the priority rules are not applicable.
  - Give a detailed reason for selecting the final rule in the <FINAL_REASON> tag.

  6. Analyse if candidate has sent audio recording or not only based on the tag <has_sent_recording>.
  Very Important, Do not look at previous conversion when check if audio recording has been sent.
  Add your reasoning to <REASON_IF_AUDIO_RECORDING_SENT> tag.
  
  7. Response Guidelines:
- Generate a suitable response based on the selected rule, conversation/context, and the final selected action <response_rule>.
- Do not mention the context or conversation explicitly in the final response.
- Use candidate's name to personalise response when available

  8. Output Structure:
  Provide your response in the following XML format:

<RESPONSE>
  <REASON_IF_AUDIO_RECORDING_SENT>analysis of if audio recording is sent or not</REASON_IF_AUDIO_RECORDING_SENT>
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

  // 5. - Provide a step-by-step analysis of every rule in the <scratchpad> tag.
  // <scratchpad>
  // Provide step-by-step analysis of every rule, including rule names in format 
  // <action_name></action_name> <rule_condition></rule_condition><analysis>reason if/why action sould be executed</analysis>
  // </scratchpad>

  console.log(profileID, "prompt", prompt);

  messages.push({
    role: "user",
    content: `Below is the conversation till now. Conversion are sorted from first conversion to most recent.
      <conversation>
      ${convertConversationToText(conversation)}
      </conversation>
      Think step by step.
      `,
  });

  console.log(profileID, "messages", messages);

  const llm_output = await callViaMessages(prompt, messages, profileID, 0, DEEP_SEEK_V2_CHAT, { type: "reply_interview" }, async (llm_output: string): Promise<Record<string, string>> => {
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

  const jObj = await parseStringPromise(llm_output.response, {
    explicitArray: false,
    strict: false,
  });
  if (!("RESPONSE" in jObj)) {
    throw new Error("response not found!");
  }

  console.log(jObj);

  reason = jObj["RESPONSE"]["FINAL_REASON"];
  reply = jObj["RESPONSE"]["MESSAGE"].trim();
  action = jObj["RESPONSE"]["ACTION"].trim();
  action = `${stage}.${action}`;

  console.log(profileID, "got final action", action);
  console.log(profileID, "actions already taken", actions_taken);
  console.log(profileID, "got candidate stage", stage);
  return { action, reply, reason, output: llm_output.response, cost: llm_output.cost };
};

export const get_context = (conversationObj: Interview) => {
  const suitable_job_profile = conversationObj.interview?.info?.suitable_job_profile ? conversationObj.interview?.info?.suitable_job_profile : "";

  let context = "";
  if (conversationObj.interview && conversationObj.interview.resume?.full_resume_text && conversationObj.interview.resume.full_resume_text.length) {
    context += `<candidate_resume>
      ${conversationObj.interview.resume.full_resume_text}
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
  if (info?.gender && info.gender != "no") context += `Gender: ${info.gender} \n`;

  return context;
};
