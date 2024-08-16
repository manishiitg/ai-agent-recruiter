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
): Promise<string> {
  if (model === DEEP_SEEK_V2_CODER || model === DEEP_SEEK_V2_CHAT) {
    return callDeepseekMessages(system, messages, user, temperature, model, meta, cb);
  }

  throw new Error(`${model} not found!`);
}

export async function callLLM(prompt: string, user: string, temperature = 0, model = DEEP_SEEK_V2_CODER, meta = {}, cb: (output: string) => Promise<Record<string, string>>) {
  if (model === DEEP_SEEK_V2_CODER || model === DEEP_SEEK_V2_CHAT) {
    return callDeepkSeekLLM(prompt, user, temperature, model, meta, cb);
  }
  throw new Error(`${model} not found!`);
}
