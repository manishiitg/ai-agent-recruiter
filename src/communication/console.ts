import { input, select } from "@inquirer/prompts";

export const askSimpleFromConsole = async (question: string): Promise<string> => {
  return await input({ message: question });
};

export const askOptionsFromConsole = async (
  question: string,
  options: {
    name: string;
    value: string;
  }[]
): Promise<string> => {
  const answer = await select({
    message: question,
    choices: [...options],
  });
  return answer;
};
