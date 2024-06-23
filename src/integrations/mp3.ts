import ffmpeg from "fluent-ffmpeg";
import { createReadStream, createWriteStream } from "fs";

import { createRequire } from "module";
// @ts-ignore
const require = createRequire(import.meta.url);

// Ensure the path to ffmpeg is set correctly
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
console.log("ffmpegPath", ffmpegPath);
ffmpeg.setFfmpegPath(ffmpegPath);

export const converToMp3 = async (inputFilePath: string): Promise<string> => {
  const outputFilePath = inputFilePath.replace(".ogg", ".mp3");
  const inputStream = createReadStream(inputFilePath);

  const outputStream = createWriteStream(outputFilePath);

  return new Promise((resolve, reject) => {
    // Use fluent-ffmpeg to convert the audio
    ffmpeg(inputStream)
      .toFormat("mp3")
      .on("end", () => {
        console.log("Conversion completed successfully");
        resolve(outputFilePath);
      })
      .on("error", (err) => {
        console.error("Error during conversion", err);
        reject(err);
      })
      .pipe(outputStream, { end: true });
  });
};
