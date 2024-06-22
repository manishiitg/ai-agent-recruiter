import { Request, Response } from "express";
import { deleteFolderRecursive, downloadFile } from "./util";
import {
  add_whatsapp_message_sent_delivery_report,
  check_whatsapp_convsation_exists,
  deleteDataForCandidateToDebug,
  get_whatspp_conversations,
  save_whatsapp_conversation,
  saveCandidateDetailsToDB,
  update_slack_thread_id_for_conversion,
  update_whatsapp_message_sent_delivery_report,
} from "../../db/mongo";
import sortBy from "lodash/sortBy";
import { WhatsAppConversaion, WhatsAppCreds } from "../../db/types";
import { getCandidate, process_whatsapp_conversation } from "./conversation";
import { postAttachment, postMessage, postMessageToThread } from "../../communication/slack";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { createRequire } from "module";
import { send_whatsapp_text_reply } from "./plivo";
// @ts-ignore
const require = createRequire(import.meta.url);
var textract = require("textract");

const queue: Record<
  string,
  {
    status: "RUNNING" | "PENDING";
    ts: NodeJS.Timeout;
  }
> = {};

const DEBOUNCE_TIMEOUT = 15; // no of seconds to wait before processing messages

export const whatsapp_webhook = async (req: Request, res: Response) => {
  const { From, To, ContentType, Context, Button, Media0, Body, MessageUUID } = req.body;
  console.log(req.body);

  const fromNumber = From;
  const toNumber = To;

  //find whats app creds bsaed on toNumber, for now only a single cred
  //its possible user is sending multiple msgs. cannot reply to all of them. need save to db and wait 1min before processing

  const cred: WhatsAppCreds = {
    name: "Mahima",
    phoneNo: "917011749960",
  };

  //ACK
  res.sendStatus(200);

  if (!(await check_whatsapp_convsation_exists(MessageUUID))) {
    console.log("ContentType", ContentType);

    switch (ContentType) {
      case "text":
        const text = Body;
        console.log(`Text Message received - From: ${fromNumber}, To: ${toNumber}, Text: ${text}`);
        if (text == "CLEAR") {
          // only for debugging/ remove in production
          await deleteDataForCandidateToDebug(fromNumber);
          await send_whatsapp_text_reply("DEBUG: YOUR CONVERSION HISTORY IS DELETED. START FRESH!.", fromNumber, cred.phoneNo);
        } else {
          await save_whatsapp_conversation("candidate", fromNumber, ContentType, text, MessageUUID, req.body);
          const { slack_thread_id } = await get_whatspp_conversations(fromNumber);
          if (slack_thread_id) {
            await postMessageToThread(slack_thread_id, `${fromNumber}: ${text}`, process.env.slack_action_channel_id);
          } else {
            const ts = await postMessage(`${fromNumber}: ${text}`, process.env.slack_action_channel_id);
            await update_slack_thread_id_for_conversion(fromNumber, ts);
          }

          if (queue[fromNumber]) {
            if (queue[fromNumber].status == "PENDING") {
              console.log("cancelling previous timeout!");
              clearTimeout(queue[fromNumber].ts);
              queue[fromNumber] = {
                ts: setTimeout(() => {
                  schedule_message_to_be_processed(fromNumber, cred);
                }, DEBOUNCE_TIMEOUT * 1000),
                status: "PENDING",
              };
            } else {
              console.log("previous msg processing started so not queueing again!");
            }
          } else {
            queue[fromNumber] = {
              ts: setTimeout(() => {
                schedule_message_to_be_processed(fromNumber, cred);
              }, DEBOUNCE_TIMEOUT * 1000),
              status: "PENDING",
            };
          }
        }
        break;
      case "media":
        const caption = Body;
        console.log(`Media Message received - From: ${fromNumber}, To: ${toNumber}, Media Attachment: ${Media0}, Caption: ${caption}`);
        if (req.body.MimeType) {
          if (!req.body.MimeType.includes("pdf")) {
            await send_whatsapp_text_reply("Only PDF Files are accepted.", fromNumber, cred.phoneNo);
          } else {
            const resume_path = path.join(process.env.dirname ? process.env.dirname : "", fromNumber);
            if (!existsSync(resume_path)) {
              mkdirSync(resume_path, { recursive: true });
            }

            const resume_file = path.join(resume_path, "resume.pdf");
            await downloadFile(Media0, resume_file);

            const { slack_thread_id } = await get_whatspp_conversations(fromNumber);
            if (slack_thread_id) {
              await postAttachment(resume_file, process.env.slack_action_channel_id, slack_thread_id);
            } else {
              const ts = await postMessage(`${fromNumber}: Attachment`, process.env.slack_action_channel_id);
              await update_slack_thread_id_for_conversion(fromNumber, ts);
              await postAttachment(resume_file, process.env.slack_action_channel_id, ts);
            }

            // Extract text from the file
            let resume_text: string = await new Promise((resolve, reject) => {
              textract.fromFileWithPath(resume_file, { preserveLineBreaks: true }, (error: any, text: string) => {
                if (error) {
                  reject(error);
                } else {
                  resolve(text);
                }
              });
            });

            console.log("resume text", resume_text);
            if (!resume_text || resume_text.length == 0) {
              await send_whatsapp_text_reply("Unable to open your resume, please share resume which is ATS friendly..", fromNumber, cred.phoneNo);
            }

            await save_whatsapp_conversation("candidate", fromNumber, ContentType, "Please find attached my resume", MessageUUID, req.body);

            const candidate = await getCandidate(fromNumber);
            if (candidate.conversation)
              candidate.conversation.resume = {
                full_resume_text: resume_text,
                created_at: new Date(),
              };
            await saveCandidateDetailsToDB(candidate);

            if (queue[fromNumber]) {
              if (queue[fromNumber].status == "PENDING") {
                console.log("cancelling previous timeout!");
                clearTimeout(queue[fromNumber].ts);
                queue[fromNumber] = {
                  ts: setTimeout(() => {
                    schedule_message_to_be_processed(fromNumber, cred);
                  }, DEBOUNCE_TIMEOUT * 1000),
                  status: "PENDING",
                };
              } else {
                console.log("previous msg processing started so not queueing again!");
              }
            } else {
              queue[fromNumber] = {
                ts: setTimeout(() => {
                  schedule_message_to_be_processed(fromNumber, cred);
                }, DEBOUNCE_TIMEOUT * 1000),
                status: "PENDING",
              };
            }
          }
        }

        break;
      case "button":
        const buttonText = Button.Text;
        const buttonPayload = Button.Payload;
        console.log(`Button Message received - From: ${fromNumber}, To: ${toNumber}, Button Text: ${buttonText}, Button Payload: ${buttonPayload}`);
        break;
    }

    if (Context && Context.MessageUUID) {
      const contextMessageUUID = Context.MessageUUID;
      console.log(`Context Message UUID: ${contextMessageUUID}`);
    }
  } else {
    console.log("already recieved before!");
  }
};

const schedule_message_to_be_processed = async (fromNumber: string, cred: WhatsAppCreds) => {
  queue[fromNumber].status = "RUNNING";
  // agent processing starts
  const { slack_thread_id, conversation } = await get_whatspp_conversations(fromNumber);
  const sortedConversation = sortBy(conversation, (conv: WhatsAppConversaion) => {
    return conv.created_at;
  });

  console.log(sortedConversation);

  const agentReply = await process_whatsapp_conversation(
    fromNumber,
    sortedConversation.map((conv) => {
      return {
        name: conv.userType,
        content: conv.content,
        date: conv.created_at,
      };
    }),
    cred,
    (reply: string) => {
      (async () => {
        console.log("repling through callback");
        const response = await send_whatsapp_text_reply(reply, fromNumber, cred.phoneNo);
        const messageUuid = response.messageUuid;
        await save_whatsapp_conversation("agent", fromNumber, "text", reply, "", "");
        await add_whatsapp_message_sent_delivery_report(fromNumber, reply, "text", messageUuid);
      })();
    }
  );

  if (agentReply.message) {
    const response = await send_whatsapp_text_reply(agentReply.message, fromNumber, cred.phoneNo);
    const messageUuid = response.messageUuid;
    console.log("got messageUuid", messageUuid);
    await save_whatsapp_conversation("agent", fromNumber, "text", agentReply.message, "", "");
    await add_whatsapp_message_sent_delivery_report(fromNumber, agentReply.message, "text", messageUuid);

    if (slack_thread_id) {
      await postMessageToThread(slack_thread_id, `HR: ${agentReply.message}`, process.env.slack_action_channel_id);
    } else {
      const ts = await postMessage(`HR: ${agentReply.message}`, process.env.slack_action_channel_id);
      await update_slack_thread_id_for_conversion(fromNumber, ts);
    }
  } else {
    console.log("debug!");
  }
  delete queue[fromNumber];
};

export const whatsapp_callback = async (req: Request, res: Response) => {
  console.log("whatsapp_callback");
  const { MessageUUID, To, From, Type, Status, ConversationExpirationTimestamp, ConversationOrigin, ConversationID, Units, TotalRate, TotalAmount, ErrorCode, QueuedTime, SentTime, Sequence } =
    req.body;
  console.log("MessageUUID", MessageUUID, "Status", Status, "To", To);
  //   await update_whatsapp_message_sent_delivery_report(MessageUUID, Status);
  res.sendStatus(200);
};
