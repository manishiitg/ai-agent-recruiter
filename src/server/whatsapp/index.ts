import { createRequire } from "module";
// @ts-ignore
const require = createRequire(import.meta.url);

import dotenv from "dotenv";
dotenv.config();

require("newrelic");
import { Request, Response } from "express";
import { convertToIST, downloadFile, formatTime } from "./util";
import {
  add_whatsapp_message_sent_delivery_report,
  check_whatsapp_convsation_exists,
  CONVERSION_TYPE_CANDIDATE,
  CONVERSION_TYPE_INTERVIEW,
  deleteDataForCandidateToDebug,
  get_whatspp_conversations,
  save_whatsapp_conversation,
  saveCandidateDetailsToDB,
  saveCandidateInterviewToDB,
  update_slack_thread_id_for_conversion,
} from "../../db/mongo";
import sortBy from "lodash/sortBy";
import { WhatsAppConversaion, WhatsAppCreds } from "../../db/types";
import { getCandidate, process_whatsapp_conversation } from "./conversation";
import { getLatestMessagesFromThread, postAttachment, postMessage, postMessageToThread } from "../../communication/slack";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { send_whatsapp_text_reply } from "../../integrations/plivo";
import { conduct_interview, getInterviewObject } from "./interview";
import { converToMp3 } from "../../integrations/mp3";
import { transcribe_file_deepgram } from "../../integrations/deepgram";
import { transribe_file_assembly_ai } from "../../integrations/assembly";
var textract = require("textract");

//find whats app creds bsaed on toNumber, for now only a single cred
//its possible user is sending multiple msgs. cannot reply to all of them. need save to db and wait 1min before processing

export const cred: WhatsAppCreds = {
  name: "Mahima",
  phoneNo: "917011749960",
};

const ADMIN_PHNO = "919717071555";

export const queue: Record<
  string,
  {
    status: "RUNNING" | "PENDING";
    ts: NodeJS.Timeout;
    canDelete: boolean;
    startedAt: Date;
  }
> = {};

const DEBOUNCE_TIMEOUT = 30; // no of seconds to wait before processing messages

export const whatsapp_webhook = async (req: Request, res: Response) => {
  const { From, To, ContentType, Context, Button, Media0, Body, MessageUUID } = req.body;
  console.log(req.body);

  const fromNumber = From;
  const toNumber = To;

  const time = formatTime(new Date());
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
          const { slack_thread_id, channel_id } = await get_whatspp_conversations(fromNumber);
          if (slack_thread_id) {
            await postMessageToThread(slack_thread_id, `${fromNumber}: ${text}. Time: ${time}`, channel_id || process.env.slack_action_channel_id);
          } else {
            const ts = await postMessage(`${fromNumber}: ${text}. Time: ${time}`, channel_id || process.env.slack_action_channel_id);
            await update_slack_thread_id_for_conversion(fromNumber, ts, channel_id || process.env.slack_action_channel_id);
          }

          if (queue[fromNumber]) {
            if (queue[fromNumber].status == "PENDING") {
              console.log(fromNumber, "cancelling previous timeout!");
              clearTimeout(queue[fromNumber].ts);
              queue[fromNumber] = {
                ts: setTimeout(() => {
                  schedule_message_to_be_processed(fromNumber, cred, "requeue-text-api");
                }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
                status: "PENDING",
                canDelete: true,
                startedAt: new Date(),
              };
            } else {
              console.log(
                fromNumber,
                `previous msg processing started so not queueing again! ${queue[fromNumber].canDelete} ${queue[fromNumber].status} ${formatTime(convertToIST(queue[fromNumber].startedAt))}`
              );
              queue[fromNumber].canDelete = false;
            }
          } else {
            console.log(fromNumber, "scheduling queue");
            queue[fromNumber] = {
              ts: setTimeout(() => {
                schedule_message_to_be_processed(fromNumber, cred, "first-text-api");
              }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
              status: "PENDING",
              canDelete: true,
              startedAt: new Date(),
            };
          }
        }
        break;
      case "media":
        const caption = Body;
        console.log(`Media Message received - From: ${fromNumber}, To: ${toNumber}, Media Attachment: ${Media0}, Caption: ${caption} ${req.body.MimeType}`);
        if (req.body.MimeType) {
          if (req.body.MimeType.includes("audio")) {
            // TODO: audio files only accept when interview starts not before it

            const interviewObj = await getInterviewObject(fromNumber);
            const resume_path = path.join(process.env.dirname ? process.env.dirname : "", fromNumber);
            if (!existsSync(resume_path)) {
              mkdirSync(resume_path, { recursive: true });
            }

            const { slack_thread_id, channel_id } = await get_whatspp_conversations(fromNumber);

            if (interviewObj.interview && interviewObj.interview.interview_info) {
              interviewObj.interview.interview_info.got_audio_file = true;

              let ai_model = "";
              let text = "";
              try {
                if (new Date().getHours() % 2 === 0 || true) {
                  ai_model = "deepgram";
                  console.log(fromNumber, Media0);
                  text = await transcribe_file_deepgram(Media0);
                }
                // } else {
                //   ai_model = "assemblyai";
                //   text = await transribe_file_assembly_ai(Media0);
                // }
              } catch (error) {
                console.error(error);
              }

              if (text) {
                text = `<audio_recording>${text}</audio_recording>`;
                await save_whatsapp_conversation("candidate", fromNumber, ContentType, text, MessageUUID, req.body);
                await postMessageToThread(slack_thread_id, text, channel_id);
              } else {
                await save_whatsapp_conversation("candidate", fromNumber, ContentType, `Please find attached by audio recording`, MessageUUID, req.body);
              }
              if (!interviewObj.interview.audio_file) {
                interviewObj.interview.audio_file = [
                  {
                    stage: interviewObj.interview.stage,
                    fileUrl: Media0,
                    transcribe: text || "",
                    ai: ai_model,
                  },
                ];
              } else {
                interviewObj.interview.audio_file.push({
                  stage: interviewObj.interview.stage,
                  fileUrl: Media0,
                  transcribe: text || "",
                  ai: ai_model,
                });
              }

              await saveCandidateInterviewToDB(interviewObj);
            }

            const resume_file = path.join(resume_path, `${fromNumber}_${interviewObj.interview?.stage}_audio.ogg`);
            await downloadFile(Media0, resume_file);
            try {
              const mp3_path = await converToMp3(resume_file);
              if (slack_thread_id) {
                await postAttachment(mp3_path, channel_id || process.env.slack_action_channel_id, slack_thread_id);
              } else {
                const ts = await postMessage(`${fromNumber}: Attachment . Time: ${time}`, channel_id || process.env.slack_action_channel_id);
                await update_slack_thread_id_for_conversion(fromNumber, ts, channel_id || process.env.slack_action_channel_id);
                await postAttachment(mp3_path, channel_id || process.env.slack_action_channel_id, ts);
              }
            } catch (error) {
              console.error(error);
              if (slack_thread_id) {
                await postAttachment(resume_file, channel_id || process.env.slack_action_channel_id, slack_thread_id);
              } else {
                const ts = await postMessage(`${fromNumber}: Attachment . Time: ${time}`, channel_id || process.env.slack_action_channel_id);
                await update_slack_thread_id_for_conversion(fromNumber, ts, channel_id || process.env.slack_action_channel_id);
                await postAttachment(resume_file, channel_id || process.env.slack_action_channel_id, ts);
              }
            }

            if (queue[fromNumber]) {
              if (queue[fromNumber].status == "PENDING") {
                console.log(fromNumber, "cancelling previous timeout!");
                clearTimeout(queue[fromNumber].ts);
                queue[fromNumber] = {
                  ts: setTimeout(() => {
                    schedule_message_to_be_processed(fromNumber, cred, "requeue-audio");
                  }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
                  status: "PENDING",
                  canDelete: true,
                  startedAt: new Date(),
                };
              } else {
                // TODO. need to handle this. user has sent another message in between of process.
                // conversation are not valid any. can we cancel and restart?
                console.log(
                  fromNumber,
                  `previous msg processing started so not queueing again! ${queue[fromNumber].canDelete} ${queue[fromNumber].status} ${formatTime(convertToIST(queue[fromNumber].startedAt))}`
                );
                queue[fromNumber].canDelete = false;
              }
            } else {
              queue[fromNumber] = {
                ts: setTimeout(() => {
                  schedule_message_to_be_processed(fromNumber, cred, "first-audio");
                }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
                status: "PENDING",
                canDelete: true,
                startedAt: new Date(),
              };
            }
          } else if (req.body.MimeType.includes("pdf")) {
            const resume_path = path.join(process.env.dirname ? process.env.dirname : "", fromNumber);
            if (!existsSync(resume_path)) {
              mkdirSync(resume_path, { recursive: true });
            }

            const resume_file = path.join(resume_path, "resume.pdf");
            await downloadFile(Media0, resume_file);

            const { slack_thread_id, channel_id } = await get_whatspp_conversations(fromNumber);
            if (slack_thread_id) {
              await postMessageToThread(slack_thread_id, `${fromNumber}: Attachment. Time: ${time}`, channel_id || process.env.slack_action_channel_id);
              await postAttachment(resume_file, channel_id || process.env.slack_action_channel_id, slack_thread_id);
            } else {
              const ts = await postMessage(`${fromNumber}: Attachment . Time: ${time}`, channel_id || process.env.slack_action_channel_id);
              await update_slack_thread_id_for_conversion(fromNumber, ts, channel_id || process.env.slack_action_channel_id);
              await postAttachment(resume_file, channel_id || process.env.slack_action_channel_id, ts);
            }

            let resume_text: string = "";
            // Extract text from the file
            try {
              resume_text = await new Promise((resolve, reject) => {
                textract.fromFileWithPath(resume_file, { preserveLineBreaks: true }, (error: any, text: string) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve(text);
                  }
                });
              });
            } catch (error) {
              console.error(error);
            }

            console.log(fromNumber, "resume text", resume_text);
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
                console.log(fromNumber, "cancelling previous timeout!");
                clearTimeout(queue[fromNumber].ts);
                queue[fromNumber] = {
                  ts: setTimeout(() => {
                    schedule_message_to_be_processed(fromNumber, cred, "requeue-pdf");
                  }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
                  status: "PENDING",
                  canDelete: true,
                  startedAt: new Date(),
                };
              } else {
                // TODO. need to handle this. user has sent another message in between of process.
                // conversation are not valid any. can we cancel and restart?
                console.log(
                  fromNumber,
                  `previous msg processing started so not queueing again! ${queue[fromNumber].canDelete} ${queue[fromNumber].status} ${formatTime(convertToIST(queue[fromNumber].startedAt))}`
                );
                queue[fromNumber].canDelete = false;
              }
            } else {
              queue[fromNumber] = {
                ts: setTimeout(() => {
                  schedule_message_to_be_processed(fromNumber, cred, "first-audio");
                }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
                status: "PENDING",
                canDelete: true,
                startedAt: new Date(),
              };
            }
          } else {
            await send_whatsapp_text_reply("Only PDF Files are accepted.", fromNumber, cred.phoneNo);
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
      console.log(fromNumber, `Context Message UUID: ${contextMessageUUID}`);
    }
  } else {
    console.log(fromNumber, "already recieved before!");
  }
};

export const schedule_message_to_be_processed = async (fromNumber: string, cred: WhatsAppCreds, scheduled_from: string) => {
  if (queue[fromNumber]) queue[fromNumber].status = "RUNNING";
  // agent processing starts
  const { slack_thread_id, conversation } = await get_whatspp_conversations(fromNumber);
  const sortedConversation = sortBy(conversation, (conv: WhatsAppConversaion) => {
    return conv.created_at;
  });

  let agentReply: {
    message: string;
    action: string;
    stage: string;
  };

  const candidateObj = await getCandidate(fromNumber);

  if (candidateObj.conversation?.conversation_completed_reason?.includes("do_call_via_human")) {
    agentReply = await conduct_interview(
      fromNumber,
      sortedConversation
        .filter((row) => row.conversationType == CONVERSION_TYPE_INTERVIEW)
        .map((conv) => {
          return {
            name: conv.userType,
            content: conv.content,
            date: conv.created_at,
          };
        }),
      cred
    );
  } else {
    agentReply = await process_whatsapp_conversation(
      fromNumber,
      sortedConversation
        // .filter((row) => row.conversationType == CONVERSION_TYPE_CANDIDATE)
        .map((conv) => {
          return {
            name: conv.userType,
            content: conv.content,
            date: conv.created_at,
          };
        }),
      cred,
      (reply: string) => {
        (async () => {
          console.log(fromNumber, "repling through callback");
          const response = await send_whatsapp_text_reply(reply, fromNumber, cred.phoneNo);
          const { slack_thread_id, channel_id } = await get_whatspp_conversations(fromNumber);
          if (slack_thread_id) {
            await postMessageToThread(slack_thread_id, `HR: ${reply}.`, channel_id || process.env.slack_action_channel_id);
          }
          const messageUuid = response.messageUuid;
          await save_whatsapp_conversation("agent", fromNumber, "text", reply, "", "");
          await add_whatsapp_message_sent_delivery_report(fromNumber, reply, "text", messageUuid);
        })();
      }
    );
  }

  if (agentReply && agentReply.message) {
    if (agentReply.action.includes("no_action")) {
      const { slack_thread_id, channel_id } = await get_whatspp_conversations(fromNumber);
      if (slack_thread_id) {
        await postMessageToThread(
          slack_thread_id,
          `HR: ${agentReply.message}. Action: ${agentReply.action} Stage: ${agentReply.stage} ${scheduled_from} ${formatTime(convertToIST(new Date()))}`,
          channel_id || process.env.slack_action_channel_id
        );
      } else {
        const ts = await postMessage(`HR: ${agentReply.message}. Action: ${agentReply.action} Stage: ${agentReply.stage}`, channel_id || process.env.slack_action_channel_id);
        await update_slack_thread_id_for_conversion(fromNumber, ts, channel_id || process.env.slack_action_channel_id);
      }
    } else {
      // let should_reply = true;
      // if (queue[fromNumber] && queue[fromNumber].canDelete === false) {
      //   should_reply = false;
      // }
      // if (should_reply) {
      //if not can delete, means there is another process in queue which will run and reply to user
      const response = await send_whatsapp_text_reply(agentReply.message, fromNumber, cred.phoneNo);
      const messageUuid = response.messageUuid;
      console.log(fromNumber, "got messageUuid", messageUuid);
      await save_whatsapp_conversation("agent", fromNumber, "text", agentReply.message, "", "");
      await add_whatsapp_message_sent_delivery_report(fromNumber, agentReply.message, "text", messageUuid);

      const { slack_thread_id, channel_id } = await get_whatspp_conversations(fromNumber);
      if (slack_thread_id) {
        await postMessageToThread(
          slack_thread_id,
          `HR: ${agentReply.message}. Action: ${agentReply.action} Stage: ${agentReply.stage} ${scheduled_from} ${formatTime(convertToIST(new Date()))}`,
          channel_id || process.env.slack_action_channel_id
        );
      } else {
        const ts = await postMessage(`HR: ${agentReply.message}. Action: ${agentReply.action} Stage: ${agentReply.stage}`, channel_id || process.env.slack_action_channel_id);
        await update_slack_thread_id_for_conversion(fromNumber, ts, channel_id || process.env.slack_action_channel_id);
      }
    }
    // }
    // got_shortlisted.do_call_via_human
    if (agentReply.action == "do_call_via_human") {
      setTimeout(() => {
        schedule_message_to_be_processed(fromNumber, cred, "human-interview-start");
      }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000);
    }
  } else {
    console.log(fromNumber, "debug!");
  }
  if (queue[fromNumber] && queue[fromNumber].canDelete) {
    console.log(`${fromNumber} delete queue`);
    delete queue[fromNumber];
  } else {
    if (queue[fromNumber]) {
      //when we get resume/text when previous message is already processing, we set canDelete = false
      console.log(`${fromNumber} scheduing again in queue`);
      queue[fromNumber] = {
        ts: setTimeout(() => {
          schedule_message_to_be_processed(fromNumber, cred, "canDelete=false");
        }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
        status: "PENDING",
        canDelete: true,
        startedAt: new Date(),
      };
    }
  }
  console.log(`${fromNumber} processing completed! ${formatTime(convertToIST(new Date()))}`);
};

export const whatsapp_callback = async (req: Request, res: Response) => {
  const { MessageUUID, To, From, Type, Status, ConversationExpirationTimestamp, ConversationOrigin, ConversationID, Units, TotalRate, TotalAmount, ErrorCode, QueuedTime, SentTime, Sequence } =
    req.body;
  console.log("MessageUUID", MessageUUID, "Status", Status, "To", To, "ErrorCode", ErrorCode);
  //   await update_whatsapp_message_sent_delivery_report(MessageUUID, Status);
  res.sendStatus(200);
};
