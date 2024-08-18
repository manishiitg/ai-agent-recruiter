import { callClaudeLLM, callClaudeViaMessages, CLAUDE_HAIKU, CLAUDE_SONNET } from "./claude";
import { callDeepkSeekLLM, callDeepseekMessages, DEEP_SEEK_V2_CHAT, DEEP_SEEK_V2_CODER } from "./deepkseek";

export async function callViaMessages(
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
): Promise<{ response: string; cost: number }> {
  if (model === DEEP_SEEK_V2_CODER || model === DEEP_SEEK_V2_CHAT) {
    return callDeepseekMessages(system, messages, user, temperature, model, meta, cb);
  } else if (model == CLAUDE_HAIKU || model == CLAUDE_SONNET) {
    return callClaudeViaMessages(system, messages, user, temperature, model, meta, cb);
  }

  throw new Error(`${model} not found!`);
}

export async function callLLM(
  prompt: string,
  user: string,
  temperature = 0,
  model = DEEP_SEEK_V2_CODER,
  meta = {},
  cb: (output: string) => Promise<Record<string, string>>
): Promise<{ response: string; cost: number }> {
  if (model === DEEP_SEEK_V2_CODER || model === DEEP_SEEK_V2_CHAT) {
    return callDeepkSeekLLM(prompt, user, temperature, model, meta, cb);
  } else if (model == CLAUDE_HAIKU || model == CLAUDE_SONNET) {
    return callClaudeLLM(prompt, user, temperature, model, meta, cb);
  }
  throw new Error(`${model} not found!`);
}
