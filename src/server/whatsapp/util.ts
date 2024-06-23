import axios from "axios";
import fs, { readdirSync, rmdirSync, statSync, unlinkSync } from "fs";
import { join } from "path";

export async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  const writer = fs.createWriteStream(outputPath);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

export function deleteFolderRecursive(dirPath: string): void {
  try {
    // Check if the directory exists
    console.log("deleting", dirPath);
    const stats = statSync(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(`${dirPath} is not a directory.`);
    }

    // Read the contents of the directory
    const files = readdirSync(dirPath);

    // Delete each file or directory
    for (const file of files) {
      const filePath = join(dirPath, file);
      const fileStats = statSync(filePath);

      if (fileStats.isDirectory()) {
        // Recursively delete subdirectories
        deleteFolderRecursive(filePath);
      } else {
        // Delete files
        unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
      }
    }

    // Finally, delete the directory itself
    rmdirSync(dirPath);
    console.log(`Deleted directory: ${dirPath}`);
  } catch (err) {
    console.error("Error deleting folder:", err);
  }
}

export function convertToIST(date: Date): Date {
  // Convert the date to UTC
  const utcDate = new Date(date.toUTCString());

  // IST offset is UTC + 5:30
  const istOffset = 5.5 * 60; // 5 hours and 30 minutes in minutes

  // Create a new Date with the IST offset
  const istDate = new Date(utcDate.getTime() + istOffset * 60 * 1000);

  return istDate;
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
