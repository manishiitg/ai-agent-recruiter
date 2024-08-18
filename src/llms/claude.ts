import dotenv from "dotenv";
dotenv.config();
import { Langfuse } from "langfuse";
import { v4 as uuidv4 } from "uuid";
import Anthropic from "@anthropic-ai/sdk";
import { MessageParam, TextBlock } from "@anthropic-ai/sdk/resources";

export const CLAUDE_HAIKU = "claude-3-haiku-20240307";
export const CLAUDE_SONNET = "claude-3-sonnet-20240229	";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const langfuse = new Langfuse({
  secretKey: process.env.langfuse_secretKey,
  publicKey: process.env.langfuse_publicKey,
  baseUrl: "https://cloud.langfuse.com",
});

const sessionID = uuidv4();

export async function callClaudeViaMessages(
  system: string,
  messages: {
    content: string;
    role: "user" | "assistant";
  }[],
  user: string,
  temperature = 0,
  model = CLAUDE_HAIKU,
  meta = {},
  cb: (output: string) => Promise<Record<string, string>>
): Promise<{
  response: string;
  cost: number;
}> {
  const ttl = new Date().getTime();
  const trace = langfuse.trace({
    name: user,
    sessionId: sessionID,
    input: JSON.stringify(messages),
    //@ts-ignore
    userId: meta.hasOwnProperty("type") ? meta["type"] : "no-type",
    version: model,
  });

  const max_tokens = 4096;
  const generation = trace.generation({
    name: "chat-completion",
    model: model,
    modelParameters: {
      temperature: temperature,
      maxTokens: max_tokens,
    },
    input: [{ role: "system", content: system }, ...messages],
  });

  const response = await anthropic.beta.promptCaching.messages.create({
    max_tokens: 4096,
    temperature: 0,
    system: [{ text: system, type: "text", cache_control: { type: "ephemeral" } }],
    messages: messages,
    model: model,
  });

  const responseData = (response.content[0] as TextBlock).text;
  let responseText = responseData.replace("```", "");
  responseText = responseText.replace("```", "");
  responseText = responseText.replace("xml", "");
  responseText = responseText.trim();
  console.log(`claude ${model} system response`, (new Date().getTime() - ttl) / 1000);
  console.log(responseText);

  let metadata: Record<string, string> = {};
  if (cb) {
    metadata = await cb(responseText);
  }

  trace.update({
    output: responseText,
    metadata: metadata,
  });

  let input_cost = model === CLAUDE_HAIKU ? 0.25 : 3;
  let output_cost = model === CLAUDE_HAIKU ? 1.25 : 15;
  let caching_write_cost = model === CLAUDE_HAIKU ? 0.3 : 3.75;
  let caching_read_costs = model === CLAUDE_HAIKU ? 0.3 : 0.3;

  generation.end({
    output: responseData,
    usage: {
      inputCost:
        response.usage.input_tokens * input_cost + (response.usage.cache_creation_input_tokens || 0) * caching_read_costs + (response.usage.cache_creation_input_tokens || 0) * caching_write_cost,
      outputCost: response.usage.output_tokens * output_cost,
      totalCost:
        response.usage.input_tokens * input_cost +
        response.usage.output_tokens * output_cost +
        (response.usage.cache_creation_input_tokens || 0) * caching_read_costs +
        (response.usage.cache_creation_input_tokens || 0) * caching_write_cost,
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
    },
    version: model,
  });

  const cost =
    response.usage.input_tokens * input_cost +
    (response.usage.cache_creation_input_tokens || 0) * caching_read_costs +
    (response.usage.cache_creation_input_tokens || 0) * caching_write_cost +
    response.usage.output_tokens * output_cost;
  console.log("typedData.usage", response.usage);
  console.log(`claude ${model} system costs`, cost);
  return {
    response: responseText,
    cost: cost,
  };
}

export async function callClaudeLLM(
  prompt: string,
  user: string,
  temperature = 0,
  model = CLAUDE_HAIKU,
  meta = {},
  cb: (output: string) => Promise<Record<string, string>>
): Promise<{ response: string; cost: number }> {
  const ttl = new Date().getTime();
  prompt = prompt.replace(/[^\x00-\x7F]/g, "");
  const trace = langfuse.trace({
    name: user,
    sessionId: sessionID,
    input: prompt,
    //@ts-ignore
    userId: meta.hasOwnProperty("type") ? `${meta["type"]}` : "no-type",
    version: model,
  });

  const messages: MessageParam[] = [
    {
      content: prompt,
      role: "user",
    },
  ];
  const max_tokens = 4096;
  const generation = trace.generation({
    name: "chat-completion",
    model: model,
    modelParameters: {
      temperature: temperature,
      maxTokens: max_tokens,
    },
    input: messages,
  });

  const response = await anthropic.beta.promptCaching.messages.create({
    max_tokens: 4096,
    temperature: 0,
    messages: messages,
    model: model,
  });

  const responseData = (response.content[0] as TextBlock).text;
  let responseText = responseData.replace("```", "");
  responseText = responseText.replace("```", "");
  responseText = responseText.replace("xml", "");
  responseText = responseText.trim();
  console.log(`claude ${model} response time taken`, (new Date().getTime() - ttl) / 1000);
  console.log(responseText);

  let metadata: Record<string, string> = {};
  if (cb) {
    metadata = await cb(responseText);
  }
  trace.update({
    output: responseText,
    metadata: metadata,
  });

  let input_cost = model === CLAUDE_HAIKU ? 0.25 : 3;
  let output_cost = model === CLAUDE_HAIKU ? 1.25 : 15;
  let caching_write_cost = model === CLAUDE_HAIKU ? 0.3 : 3.75;
  let caching_read_costs = model === CLAUDE_HAIKU ? 0.3 : 0.3;

  generation.end({
    output: responseData,
    usage: {
      inputCost:
        response.usage.input_tokens * input_cost + (response.usage.cache_creation_input_tokens || 0) * caching_read_costs + (response.usage.cache_creation_input_tokens || 0) * caching_write_cost,
      outputCost: response.usage.output_tokens * output_cost,
      totalCost: response.usage.input_tokens * input_cost + response.usage.output_tokens * output_cost,
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
    },
    version: model,
  });

  const cost =
    response.usage.input_tokens * input_cost +
    (response.usage.cache_creation_input_tokens || 0) * caching_read_costs +
    (response.usage.cache_creation_input_tokens || 0) * caching_write_cost +
    response.usage.output_tokens * output_cost;
  console.log("typedData.usage", response.usage);
  console.log(`claude ${model} costs ${cost}`);
  return {
    response: responseText,
    cost: cost,
  };
}
