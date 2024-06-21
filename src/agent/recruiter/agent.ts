import { linkedJobProfileRules } from "./jobconfig";
import { callDeepkSeek, callDeepseekViaMessages, DEEP_SEEK_V2_CODER } from "../../llms/deepkseek";
import { STAGE_RULE_MAP } from "./rule_map";
import { parseStringPromise } from "xml2js";
import { convertConversationToText } from "./helper";
import { Conversation, ConversationMessage } from "./types/conversation";

export const STAGE_NEW = "new";
export const STAGE_GOT_RESUME = "got_resume";

export const STAGE_GOT_CTC = "got_ctc";
export const STAGE_SHORTLISTED = "got_shortlisted";
export const STAGE_GOT_REJECTED = "got_rejected";

// people ask update on when you will call, can we handle it?
// do a partial shortlisting based on only resume or only expected ctc?
// people leave msgs after rejection as well... should i proceed?

// candidate asks for job description
// candidate says he found a job and not looking anymore
// current ctc issue is still not fixed
// if job profile gets closed? // need to get extra info, all the time?

// how to optimized extractInfo() right its called
// see fix on how to fix asking current ctc for freshres.

//. candidte asks for location..

// for Anushri Jain 1st degree connection, some how, action taken == greeting is set.
// but messgesa sent are 0. should fix this.

// many times we send a msg will call you soon, in do_schedule_call, but there is no human action.

export const generateConversationReply = async (
  profileID: string,
  conversationObj: Conversation,
  me: string,
  conversation: ConversationMessage[],
  type: "gmail" | "linkedin" | "whatsapp" = "whatsapp"
): Promise<{
  action: string;
  reply: string;
  reason: string;
}> => {
  const stage = conversationObj.stage;
  const actions_taken = conversationObj.actions_taken;
  const extraInfo = conversationObj.info;
  const context = get_context(conversationObj);

  let shortlist_reject_text = "";
  if (conversationObj.shortlisted) {
    shortlist_reject_text = `Candidate is shortlisted for profile ${conversationObj.shortlisted?.job_profile}\n`;
    if (!conversationObj.shortlisted?.shortlisted_for_profile) {
      shortlist_reject_text = `Candidate is rejected for profile ${conversationObj.shortlisted?.job_profile}. Rejection Reason ${conversationObj.shortlisted?.shortlisted_reason} \n`;
    }
  }

  let open_jobs = "";
  let ix = 1;
  for (const k in linkedJobProfileRules) {
    if (linkedJobProfileRules[k].is_open)
      if (conversationObj.shortlisted) {
        if (k !== conversationObj.shortlisted?.job_profile) {
          continue;
        }
      }
    open_jobs += `
                    <job${ix}>
                      <name>${k}</name>
                      <job_description>${linkedJobProfileRules[k].job_description}</job_description>
                    </job${ix}>
                    `;

    ix++;
  }

  let closed_jobs = "";
  ix = 1;
  for (const k in linkedJobProfileRules) {
    if (!linkedJobProfileRules[k].is_open)
      closed_jobs += `
        <closed_job${ix}>
          <name>${k}</name>
        </closed_job${ix}>`;
    ix++;
  }

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
    console.log("actions taken", conversationObj.actions_taken, `${stage}.${action}`, actions_taken.includes(`${stage}.${action}`));
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

  if (pending_actions.length == 0) {
    console.log("all possible actions completed!", stage);
    if (stage == STAGE_SHORTLISTED) {
      return { action: `${stage}.do_call_via_human_no_pending_actions`, reply: "", reason: "" };
    } else if (stage == STAGE_GOT_REJECTED) {
      return { action: `${stage}.no_action`, reply: "", reason: "" };
    } else {
      throw new Error("debug"); //TODO
    }
  }

  const prompt = `
  You are an AI assistant acting as an HR recruiter for Excellence Technologies. Your task is to engage in a conversation with a job seeker on ${type}.
  Your name is ${me}.

  1. Company Information:
  <company_information>
  COMPANY NAME: Excellence Technologies
  COMPANY LOCATION: Noida
  </company_information>
    
  2. Context and Conversation History:
  <context>
  ${context}
  ${shortlist_reject_text ? shortlist_reject_text : ""}
  </context>

  3. Open Job Profiles:
  <open_job_profiles>
  ${open_jobs}
  </open_job_profiles>

  ${
    closed_jobs.length > 0
      ? `4. Closed Job Profiles (if any): <closed_job_profiles>
  ${closed_jobs}</closed_job_profiles>`
      : ""
  }
  
  5. Priority Rules:
  <priority_rules>
  ${priority_rules}
  </priority_rules>

  6. Other Rules (if any):

  ${other_rules ? `<other_rules>${other_rules}</other_rules>` : ""}
  
  ${extraInfo?.years_of_experiance?.length == 0 ? "Since candidate doesn't have any work experiance, Don't ask current CTC from this candidate in <MESSAGE>" : ""}


  8. Rule Analysis and Selection:
  - Carefully analyze all provided rules priority_rules and other_rules, giving higher priority to recent conversations over older ones.
  - Select the best fitting rule based on the conversation and context.
  - If no actions are applicable, reply with "no_action" and do not create new actions.
  - Prioritize using the <priority_rules> first, and only use <other_rules> if the priority rules are not applicable.
  - Provide a step-by-step analysis of every rule in the <scratchpad> tag.
  - Give a detailed reason for selecting the final rule in the <FINAL_REASON> tag.
  
  9. Response Guidelines:
- Generate a suitable response based on the selected rule, conversation/context, and the final selected action <response_rule>.
- Do not mention the context or conversation explicitly in the final response.
- Whenever possible ask candidate for resume, if you don't have candidate's resume already

  10. Output Structure:
  Provide your response in the following XML format:

<RESPONSE>
  <scratchpad>
  [Provide step-by-step analysis of every rule, including rule names in format <action_name>analysis</action_name>]
  </scratchpad>
  <FINAL_REASON>
  [Detailed reason for selecting the rule]
  </FINAL_REASON>
  <ACTION>
  [Action exactly as mentioned in the selected rule]
  </ACTION>
  <MESSAGE>
  [Short response based response_rule of the selected action]
  </MESSAGE>
</RESPONSE>

Remember to check all rules before selecting the final one, and ensure that your response is appropriate for an HR recruiter interacting with a job seeker.`;

  // Rule: If we don't know for which job profile he is intersted to apply for and candidate has provided his resume suggest him suitable job based on his resume.
  // Response: Ask if he is interested on suitable job profile based on his resume/conversion.
  // Action: "tell_job_opening_suitable"

  // REASON: [<think step by step and mention why specific rule was selected or not selected, rule1, rule2, etc>]
  const messages: {
    content: string;
    role: "user" | "assistant";
  }[] = [];

  console.log("prompt", prompt);
  console.log("conversation", conversation);

  if (true) {
    // deepseek supports llm supports system prompt. claude doesnt
    if (conversation.length > 0) {
      let previousUser = conversation[0].name;
      let previousContent = conversation[0].content + ".";
      let i = 0;
      for (const conv of conversation) {
        i++;
        if (i == 1) continue;

        if (conv.name == "agent") {
          previousContent += `\n ${conv.content}.`;
          continue;
        } else {
          messages.push({
            role: previousUser == me ? "assistant" : "user",
            content: previousContent,
          });
          previousUser = conv.name;
          previousContent = conv.content;
        }
      }
      messages.push({
        role: previousUser == me ? "assistant" : "user",
        content: previousContent,
      });
    } else {
      messages.push({
        role: "user",
        content: "Hi",
      });
    }
  } else {
    messages.push({
      role: "user",
      content: `Below is the conversation till now. Conversion are sorted from first conversion to most recent. 

      <conversation>
      ${convertConversationToText(conversation)}
      </conversation>

      Think step by step.
      `,
    });
  }
  console.log("messages", messages);

  const llm_output = await callDeepseekViaMessages(prompt, messages, profileID, 0, DEEP_SEEK_V2_CODER, { type: "reply" }, async (llm_output: string): Promise<Record<string, string>> => {
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
  return { action, reply, reason };
};

export const get_context = (conversationObj: Conversation) => {
  const suitable_job_profile = conversationObj.info?.suitable_job_profile ? conversationObj.info?.suitable_job_profile : "";

  let context = "";
  if (conversationObj.resume && conversationObj.resume.SUMMARY && conversationObj.resume.SUMMARY.length) {
    context += `<candidate_resume>
      <work_experiance>${conversationObj.resume.WORK_EXP}</work_experiance>
      <projects>${conversationObj.resume.PROJECTS}</projects>
      <technical_skills>${conversationObj.resume.TECHNICAL_SKILLS}</technical_skills>
    </candidate_resume>`;
  } else {
    context += `Candidates has not provided his resume\n`;
  }
  if (suitable_job_profile.length > 0) {
    context += `Suitable Job Profile Based on Resume: ${suitable_job_profile}\n`;
  }
  if (conversationObj.info?.hiring_for_job_profile === false) {
    context += `We are current not hiring for ${suitable_job_profile}\n`;
  }

  const info = conversationObj.info;
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
