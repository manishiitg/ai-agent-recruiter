import dotenv from "dotenv";
dotenv.config();
import { AssemblyAI } from "assemblyai";

const client = new AssemblyAI({
  apiKey: process.env.assembly_ai_api_key ? process.env.assembly_ai_api_key : "",
});

export const transribe_file_assembly_ai = async (file_url: string) => {
  // You can also transcribe a local file by passing in a file path
  // const FILE_URL = './path/to/file.mp3';
  const data = {
    audio_url: file_url,
  };

  const transcript = await client.transcripts.transcribe(data);
  console.log("transcript", transcript);
  return transcript.text;
};
