import dotenv from "dotenv";
dotenv.config();
import { Langfuse } from "langfuse";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

export const DEEP_SEEK_V2_CODER = "deepseek-v2-coder";
export const DEEP_SEEK_V2_CHAT = "deepseek-v2-chat";

const langfuse = new Langfuse({
  secretKey: process.env.langfuse_secretKey,
  publicKey: process.env.langfuse_publicKey,
  baseUrl: "https://cloud.langfuse.com",
});

const sessionID = uuidv4();

interface ChatCompletion {
  id: string;
  choices: {
    index: number;
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
    logprobs: null;
  }[];
  created: number;
  model: string;
  system_fingerprint: string;
  object: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_cache_hit_tokens: number;
    prompt_cache_miss_tokens: number;
  };
}

export async function callDeepseekMessages(
  system: string,
  messages: {
    content: string;
    role: "user" | "assistant";
  }[],
  user: string,
  temperature = 0,
  model = DEEP_SEEK_V2_CODER,
  meta = {},
  cb: (output: string) => Promise<Record<string, string>>
): Promise<string> {
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

  let data = JSON.stringify({
    messages: [{ role: "system", content: system }, ...messages],
    model: DEEP_SEEK_V2_CODER ? "deepseek-coder" : "deepseek-chat",
    frequency_penalty: 0,
    max_tokens: max_tokens,
    presence_penalty: 0,
    stop: null,
    stream: false,
    temperature: 0,
    top_p: 1,
    logprobs: false,
    top_logprobs: null,
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.deepseek.com/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${process.env.deepseek_token}`,
    },
    data: data,
  };

  const response = await axios(config);
  const typedData = response.data as ChatCompletion;
  const responseData = typedData.choices[0].message;
  let responseText = responseData.content.replace("```", "");
  responseText = responseText.replace("```", "");
  responseText = responseText.replace("xml", "");
  responseText = responseText.trim();
  console.log("deepakseek system response", (new Date().getTime() - ttl) / 1000);
  console.log(responseText);

  let metadata: Record<string, string> = {};
  if (cb) {
    metadata = await cb(responseText);
  }

  trace.update({
    output: responseText,
    metadata: metadata,
  });

  let input_costs = 0.14;
  let output_costs = 0.28;
  let cache_hit_costs = 0.014;

  generation.end({
    output: responseData,
    usage: {
      inputCost: typedData.usage.prompt_cache_hit_tokens * cache_hit_costs + typedData.usage.prompt_cache_miss_tokens * input_costs,
      outputCost: typedData.usage.completion_tokens * output_costs,
      totalCost: typedData.usage.prompt_cache_hit_tokens * cache_hit_costs + typedData.usage.prompt_cache_miss_tokens * input_costs + typedData.usage.completion_tokens * output_costs,
      promptTokens: typedData.usage.prompt_tokens,
      completionTokens: typedData.usage.completion_tokens,
      totalTokens: typedData.usage.total_tokens,
    },
    version: model,
  });
  console.log("typedData.usage", typedData.usage);
  console.log(
    "deepseek system costs",
    (typedData.usage.prompt_cache_hit_tokens * cache_hit_costs + typedData.usage.prompt_cache_miss_tokens * input_costs) / 1000000 + (typedData.usage.completion_tokens * output_costs) / 1000000
  );
  return responseText;
}

export async function callDeepkSeekLLM(prompt: string, user: string, temperature = 0, model = DEEP_SEEK_V2_CODER, meta = {}, cb: (output: string) => Promise<Record<string, string>>) {
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

  const messages = [
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

  // console.log("messages", messages);

  let data = JSON.stringify({
    messages: messages,
    model: DEEP_SEEK_V2_CODER ? "deepseek-coder" : "deepseek-chat",
    frequency_penalty: 0,
    max_tokens: max_tokens,
    presence_penalty: 0,
    stop: null,
    stream: false,
    temperature: 0,
    top_p: 1,
    logprobs: false,
    top_logprobs: null,
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.deepseek.com/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${process.env.deepseek_token}`,
    },
    data: data,
  };

  const response = await axios(config);
  const typedData = response.data as ChatCompletion;
  const responseData = typedData.choices[0].message;
  let responseText = responseData.content.replace("```", "");
  responseText = responseText.replace("```", "");
  responseText = responseText.replace("xml", "");
  responseText = responseText.trim();
  console.log("deepakseek response time taken", (new Date().getTime() - ttl) / 1000);
  console.log(responseText);

  let metadata: Record<string, string> = {};
  if (cb) {
    metadata = await cb(responseText);
  }
  trace.update({
    output: responseText,
    metadata: metadata,
  });

  generation.end({
    output: responseData,
    usage: {
      inputCost: typedData.usage.prompt_tokens * 0.14,
      outputCost: typedData.usage.completion_tokens * 0.28,
      totalCost: typedData.usage.prompt_tokens * 0.14 + typedData.usage.completion_tokens * 0.28,
      promptTokens: typedData.usage.prompt_tokens,
      completionTokens: typedData.usage.completion_tokens,
      totalTokens: typedData.usage.total_tokens,
    },
    version: model,
  });

  console.log("typedData.usage", typedData.usage);
  console.log("deepseek costs", (typedData.usage.prompt_tokens * 0.14) / 1000000 + (typedData.usage.completion_tokens * 0.28) / 1000000);
  return responseText;
}
