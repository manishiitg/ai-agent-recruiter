import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { captureException } from "@sentry/node";
import qs from "qs";
dotenv.config();

export async function downloadSlackFile(fileId: string, outputPath: string): Promise<void> {
  const slackToken = process.env.slack_token ? process.env.slack_token : "";

  const headers = {
    Authorization: `Bearer ${slackToken}`,
  };

  try {
    // First, get the file info to get the download URL
    const fileInfoResponse = await axios.get(`https://slack.com/api/files.info`, {
      headers,
      params: {
        file: fileId,
      },
    });

    if (!fileInfoResponse.data.ok) {
      throw new Error(`Error fetching file info: ${fileInfoResponse.data.error}`);
    }

    const fileInfo = fileInfoResponse.data.file;
    const downloadUrl = fileInfo.url_private;

    // Then, download the file
    const fileResponse = await axios.get(downloadUrl, {
      responseType: "stream",
      headers,
    });

    // Save the file to the specified output path
    const writer = fs.createWriteStream(outputPath);
    fileResponse.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error; // Rethrow the error to be handled by the caller
  }
}

async function uploadFileToSlack(token: string, channel: string, filePath: string, threadTs?: string) {
  try {
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;

    // Step 1: Get an upload URL
    const uploadUrlResponse = await axios.post(
      "https://slack.com/api/files.getUploadURLExternal",
      {
        files: [
          {
            filename: fileName,
            length: fileSize,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!uploadUrlResponse.data.ok) {
      console.error("Error details:", uploadUrlResponse.data);
      throw new Error("Failed to get upload URL: " + uploadUrlResponse.data.error);
    }

    const { upload_url, file_id } = uploadUrlResponse.data.file;

    // Step 2: Upload the file to the provided URL
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    await axios.post(upload_url, form, {
      headers: form.getHeaders(),
    });

    // Step 3: Complete the upload
    const completeResponse = await axios.post(
      "https://slack.com/api/files.completeUploadExternal",
      {
        files: [
          {
            id: file_id,
            title: fileName,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!completeResponse.data.ok) {
      console.error("Error details:", completeResponse.data);
      throw new Error("Failed to complete upload: " + completeResponse.data.error);
    }

    // Send a message to the channel with the file
    const messageResponse = await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: channel,
        text: `File uploaded: ${fileName}`,
        thread_ts: threadTs,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!messageResponse.data.ok) {
      console.error("Error details:", messageResponse.data);
      throw new Error("Failed to send message: " + messageResponse.data.error);
    }

    return file_id;
  } catch (error) {
    console.error(error);
    throw new Error("File upload failed: " + error);
  }
}

// Function to post a message to a Slack channel
async function postMessageToSlack(token: string, channel: string, text: string): Promise<string> {
  const response = await axios.post(
    "https://slack.com/api/chat.postMessage",
    {
      channel: channel,
      text: text,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.ts; // Timestamp of the message
}

export async function postMessageToThread(messageTs: string, text: string, channel_id: string, reply_broadcast = false) {
  try {
    const token = process.env.slack_token ? process.env.slack_token : "";
    let channel = process.env.slack_channel_id ? process.env.slack_channel_id : "";
    if (channel_id) {
      channel = channel_id;
    }
    const threadResponse = await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: channel,
        text: text,
        thread_ts: messageTs,
        reply_broadcast: reply_broadcast,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (threadResponse.data.ok) {
      console.log("Message and threads posted successfully!");
    } else {
      console.error("postMessageToThread: Error posting message and threads:", threadResponse.data.error);
    }
  } catch (error) {
    captureException(error);
    console.error("postMessageToThread: Error posting message and threads:", error);
  }
}

export async function postAttachment(screenshotPath: string, channel_id?: string, thread_ts?: string): Promise<string> {
  try {
    // Replace with your Bot User OAuth Token
    const token = process.env.slack_token ? process.env.slack_token : "";
    // Replace with the ID of the channel you want to post to
    let channel = process.env.slack_channel_id ? process.env.slack_channel_id : "";
    if (channel_id) {
      channel = channel_id;
    }

    const messageTs = await uploadFileToSlack(token, channel, screenshotPath, thread_ts);

    return messageTs;
  } catch (error) {
    captureException(error);
    console.error("postAttachment: Error posting message and threads:", error);
    throw error;
  }
}

export async function postMessageWithAttachment(screenshotPath: string, text: string, channel_id?: string): Promise<string> {
  try {
    // Replace with your Bot User OAuth Token
    const token = process.env.slack_token ? process.env.slack_token : "";
    // Replace with the ID of the channel you want to post to
    let channel = process.env.slack_channel_id ? process.env.slack_channel_id : "";
    if (channel_id) {
      channel = channel_id;
    }
    // Upload the screenshot and PDF files
    if (screenshotPath) await uploadFileToSlack(token, channel, screenshotPath);

    // Post the initial message with the screenshot
    const messageTs = await postMessageToSlack(token, channel, text);
    return messageTs;
  } catch (error) {
    captureException(error);
    console.error("postMessageWithAttachment: Error posting message and threads:", error);
    throw error;
  }
}
export async function postMessage(text: string, channel_id?: string): Promise<string> {
  try {
    const token = process.env.slack_token ? process.env.slack_token : "";
    let channel = process.env.slack_channel_id ? process.env.slack_channel_id : "";
    if (channel_id) {
      channel = channel_id;
    }

    // Post the initial message with the screenshot
    const messageTs = await postMessageToSlack(token, channel, text);
    return messageTs;
  } catch (error) {
    captureException(error);
    console.error("postMessage: Error posting message and threads:", error);
    throw error;
  }
}

const global_user_map: Record<string, SlackUser> = {};

export async function getUserInfo(userId: string): Promise<SlackUser | null> {
  if (global_user_map[userId]) {
    return global_user_map[userId];
  }
  const slackToken = process.env.slack_token ? process.env.slack_token : "";
  const url = `https://slack.com/api/users.info`;
  const headers = {
    Authorization: `Bearer ${slackToken}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const data = {
    user: userId,
  };

  try {
    const response = await axios.post(url, qs.stringify(data), { headers });
    if (response.data.ok) {
      const user = response.data.user;
      const obj = {
        id: user.id,
        name: user.name,
        email: user.profile.email,
      };
      global_user_map[userId] = obj;
      return obj;
    } else {
      throw new Error(`Error fetching user info: ${response.data.error}`);
    }
  } catch (error) {
    console.error("Error:", error);
    throw error; // Rethrow the error to be handled by the caller
  }
}

// Define the SlackUser type based on the actual response structure
interface SlackUser {
  id: string;
  name: string;
  email: string;
}

interface SlackMessage {
  text: string;
  user: string;
  type: string;
  ts: string;
  time: Date;
  bot_id?: string;
  files?: {
    id: string;
    name: string;
  }[];
}
function convertSlackTimestampToDate(slackTimestamp: string): Date {
  const [seconds, milliseconds] = slackTimestamp.split(".");
  const date = new Date(parseInt(seconds, 10) * 1000);
  if (milliseconds) {
    const fractionOfSecond = parseInt(milliseconds, 10) / Math.pow(10, milliseconds.length);
    date.setMilliseconds(fractionOfSecond * 1000);
  }

  return date;
}

export async function getThreadMessages(channelId: string, threadTs: string): Promise<SlackMessage[]> {
  const slackToken = process.env.slack_token ? process.env.slack_token : "";
  const url = `https://slack.com/api/conversations.replies`;
  const headers = {
    Authorization: `Bearer ${slackToken}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const data = {
    channel: channelId,
    ts: threadTs,
  };
  const serializedData = qs.stringify(data);

  try {
    const response = await axios.post(url, serializedData, { headers });
    if (response.data.ok) {
      const messages = response.data.messages;
      // console.log(messages);
      return messages.map((message: any) => {
        // console.log("files", message.files);
        return {
          text: message.text,
          user: message.user,
          type: message.type,
          ts: message.ts,
          time: convertSlackTimestampToDate(message.ts),
          bot_id: message.bot_id,
          files: message.files?.map((file: any) => {
            return {
              id: file.id,
              name: file.name,
            };
          }),
          // Map other properties as needed
        };
      });
    } else {
      throw new Error(`Error fetching messages: ${response.data.error}`);
    }
  } catch (error) {
    console.error("Error:", error);
    throw error; // Rethrow the error to be handled by the caller
  }
}

export async function getLatestMessagesFromSlackChannel(channelId: string, count: number = 20): Promise<SlackMessage[]> {
  const slackToken = process.env.slack_token ? process.env.slack_token : "";
  const url = `https://slack.com/api/conversations.history`;
  const headers = {
    Authorization: `Bearer ${slackToken}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const data = {
    channel: channelId,
    count: count,
  };
  const serializedData = qs.stringify(data);

  try {
    const response = await axios.post(url, serializedData, { headers });
    if (response.data.ok) {
      const messages = response.data.messages;
      return messages.map((message: any) => {
        return {
          text: message.text,
          user: message.user,
          type: message.type,
          ts: message.ts,
          time: convertSlackTimestampToDate(message.ts),
          bot_id: message.bot_id,
          files: message.files?.map((file: any) => {
            return {
              id: file.id,
              name: file.name,
            };
          }),
          // Map other properties as needed
        };
      });
    } else {
      throw new Error(`Error fetching messages: ${response.data.error}`);
    }
  } catch (error) {
    console.error("Error:", error);
    throw error; // Rethrow the error to be handled by the caller
  }
}

export async function getLatestMessagesFromThread(channelId: string, ts: string, count = 100): Promise<SlackMessage[]> {
  const slackToken = process.env.slack_token ? process.env.slack_token : "";
  const url = `https://slack.com/api/conversations.replies`;
  const headers = {
    Authorization: `Bearer ${slackToken}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const data = {
    channel: channelId,
    ts: ts,
    inclusive: true,
    count: count,
  };
  const serializedData = qs.stringify(data);

  try {
    const response = await axios.post(url, serializedData, { headers });
    if (response.data.ok) {
      const messages = response.data.messages;
      return messages.map((message: any) => {
        return {
          text: message.text,
          user: message.user,
          type: message.type,
          ts: message.ts,
          time: convertSlackTimestampToDate(message.ts),
          bot_id: message.bot_id,
          files: message.files?.map((file: any) => {
            return {
              id: file.id,
              name: file.name,
            };
          }),
          // Map other properties as needed
        };
      });
    } else {
      throw new Error(`Error fetching messages: ${response.data.error} ${channelId} ${ts}`);
    }
  } catch (error) {
    console.error("Error:", error);
    throw error; // Rethrow the error to be handled by the caller
  }
}
