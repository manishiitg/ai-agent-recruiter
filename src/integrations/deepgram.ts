import { createRequire } from "module";
// @ts-ignore
const require = createRequire(import.meta.url);

const { createClient } = require("@deepgram/sdk");
require("dotenv").config();

export const transcribe_file_deepgram = async (file_url: string) => {
  // STEP 1: Create a Deepgram client using the API key
  const deepgram = createClient(process.env.deepgram_ai_api_key);

  // STEP 2: Call the transcribeUrl method with the audio payload and options
  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    {
      url: file_url,
    },
    // STEP 3: Configure Deepgram options for audio analysis
    {
      model: "nova-2",
      smart_format: true,
    }
  );

  if (error) throw error;
  // STEP 4: Print the results
  if (!error) {
    // console.log(result.results.channels);
    // console.log(result.results.channels[0]);
    // console.log(result.results.channels[0].alternatives.transcript);
    return result.results.channels[0].alternatives[0].transcript;
  }
};
