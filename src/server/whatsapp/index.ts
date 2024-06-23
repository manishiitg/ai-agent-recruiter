import { Request, Response } from "express";
import { convertToIST, deleteFolderRecursive, downloadFile, sleep } from "./util";
import {
  add_whatsapp_message_sent_delivery_report,
  check_whatsapp_convsation_exists,
  deleteDataForCandidateToDebug,
  get_whatspp_conversations,
  getInterviewRemainder,
  getPendingNotCompletedCandidates,
  getShortlistedCandidates,
  isInterviewStarted,
  save_whatsapp_conversation,
  saveCandidateDetailsToDB,
  update_slack_thread_id_for_conversion,
  update_whatsapp_message_sent_delivery_report,
  updateInterviewRemainderSent,
  updateRemainderSent,
} from "../../db/mongo";
import sortBy from "lodash/sortBy";
import { WhatsAppConversaion, WhatsAppCreds } from "../../db/types";
import { getCandidate, process_whatsapp_conversation } from "./conversation";
import { postAttachment, postMessage, postMessageToThread } from "../../communication/slack";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { createRequire } from "module";
import { send_whatsapp_text_reply } from "./plivo";
import { conduct_interview, getInterviewObject } from "./interview";
import { converToMp3 } from "./mp3";
// @ts-ignore
const require = createRequire(import.meta.url);
var textract = require("textract");

//find whats app creds bsaed on toNumber, for now only a single cred
//its possible user is sending multiple msgs. cannot reply to all of them. need save to db and wait 1min before processing

const cred: WhatsAppCreds = {
  name: "Mahima",
  phoneNo: "917011749960",
};

const ADMIN_PHNO = "919717071555";

const queue: Record<
  string,
  {
    status: "RUNNING" | "PENDING";
    ts: NodeJS.Timeout;
    canDelete: boolean;
  }
> = {};

const DEBOUNCE_TIMEOUT = 60; // no of seconds to wait before processing messages

function formatTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

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
              console.log("cancelling previous timeout!");
              clearTimeout(queue[fromNumber].ts);
              queue[fromNumber] = {
                ts: setTimeout(() => {
                  schedule_message_to_be_processed(fromNumber, cred);
                }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
                status: "PENDING",
                canDelete: true,
              };
            } else {
              console.log("previous msg processing started so not queueing again!");
              queue[fromNumber] = {
                ts: setTimeout(() => {
                  schedule_message_to_be_processed(fromNumber, cred);
                }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
                status: "RUNNING",
                canDelete: false,
              };
            }
          } else {
            console.log("scheduling queue");
            queue[fromNumber] = {
              ts: setTimeout(() => {
                schedule_message_to_be_processed(fromNumber, cred);
              }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
              status: "PENDING",
              canDelete: true,
            };
          }
        }
        break;
      case "media":
        const caption = Body;
        console.log(`Media Message received - From: ${fromNumber}, To: ${toNumber}, Media Attachment: ${Media0}, Caption: ${caption}`);
        if (req.body.MimeType) {
          if (req.body.MimeType.includes("audio")) {
            // TODO: audio files only accept when interview starts not before it

            const interviewObj = await getInterviewObject(fromNumber);
            const resume_path = path.join(process.env.dirname ? process.env.dirname : "", fromNumber);
            if (!existsSync(resume_path)) {
              mkdirSync(resume_path, { recursive: true });
            }
            queue[fromNumber] = {
              ts: setTimeout(() => {}, 1000),
              status: "RUNNING",
              canDelete: true,
            };

            const resume_file = path.join(resume_path, `${fromNumber}_${interviewObj.interview?.stage}_audio.ogg`);
            await downloadFile(Media0, resume_file);
            const { slack_thread_id, channel_id } = await get_whatspp_conversations(fromNumber);
            if (slack_thread_id) {
              await postAttachment(resume_file, channel_id || process.env.slack_action_channel_id, slack_thread_id);
            } else {
              const ts = await postMessage(`${fromNumber}: Attachment . Time: ${time}`, channel_id || process.env.slack_action_channel_id);
              await update_slack_thread_id_for_conversion(fromNumber, ts, channel_id || process.env.slack_action_channel_id);
              await postAttachment(resume_file, channel_id || process.env.slack_action_channel_id, ts);
            }
            try {
              const mp3_path = await converToMp3(resume_file);
              if (slack_thread_id) {
                await postAttachment(mp3_path, channel_id || process.env.slack_action_channel_id, slack_thread_id);
              }
            } catch (error) {
              console.error(error);
            }

            await save_whatsapp_conversation("candidate", fromNumber, ContentType, "Please find attached my recording", MessageUUID, req.body);

            if (queue[fromNumber]) {
              if (queue[fromNumber].status == "PENDING") {
                console.log("cancelling previous timeout!");
                clearTimeout(queue[fromNumber].ts);
                queue[fromNumber] = {
                  ts: setTimeout(() => {
                    schedule_message_to_be_processed(fromNumber, cred);
                  }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
                  status: "PENDING",
                  canDelete: true,
                };
              } else {
                // TODO. need to handle this. user has sent another message in between of process.
                // conversation are not valid any. can we cancel and restart?
                console.log("previous msg processing started so not queueing again!");
                queue[fromNumber] = {
                  ts: setTimeout(() => {
                    schedule_message_to_be_processed(fromNumber, cred);
                  }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
                  status: "RUNNING",
                  canDelete: false,
                };
              }
            } else {
              queue[fromNumber] = {
                ts: setTimeout(() => {
                  schedule_message_to_be_processed(fromNumber, cred);
                }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
                status: "PENDING",
                canDelete: true,
              };
            }
          } else if (req.body.MimeType.includes("pdf")) {
            const resume_path = path.join(process.env.dirname ? process.env.dirname : "", fromNumber);
            if (!existsSync(resume_path)) {
              mkdirSync(resume_path, { recursive: true });
            }
            queue[fromNumber] = {
              ts: setTimeout(() => {}, 1000),
              status: "RUNNING",
              canDelete: true,
            };

            const resume_file = path.join(resume_path, "resume.pdf");
            await downloadFile(Media0, resume_file);

            const { slack_thread_id, channel_id } = await get_whatspp_conversations(fromNumber);
            if (slack_thread_id) {
              await postAttachment(resume_file, channel_id || process.env.slack_action_channel_id, slack_thread_id);
            } else {
              const ts = await postMessage(`${fromNumber}: Attachment . Time: ${time}`, channel_id || process.env.slack_action_channel_id);
              await update_slack_thread_id_for_conversion(fromNumber, ts, channel_id || process.env.slack_action_channel_id);
              await postAttachment(resume_file, channel_id || process.env.slack_action_channel_id, ts);
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
                  }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
                  status: "PENDING",
                  canDelete: true,
                };
              } else {
                // TODO. need to handle this. user has sent another message in between of process.
                // conversation are not valid any. can we cancel and restart?
                console.log("previous msg processing started so not queueing again!");
                queue[fromNumber] = {
                  ts: setTimeout(() => {
                    schedule_message_to_be_processed(fromNumber, cred);
                  }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
                  status: "RUNNING",
                  canDelete: false,
                };
              }
            } else {
              queue[fromNumber] = {
                ts: setTimeout(() => {
                  schedule_message_to_be_processed(fromNumber, cred);
                }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000),
                status: "PENDING",
                canDelete: true,
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
      console.log(`Context Message UUID: ${contextMessageUUID}`);
    }
  } else {
    console.log("already recieved before!");
  }
};

const schedule_message_to_be_processed = async (fromNumber: string, cred: WhatsAppCreds) => {
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
      sortedConversation.map((conv) => {
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
    const response = await send_whatsapp_text_reply(agentReply.message, fromNumber, cred.phoneNo);
    const messageUuid = response.messageUuid;
    console.log("got messageUuid", messageUuid);
    await save_whatsapp_conversation("agent", fromNumber, "text", agentReply.message, "", "");
    await add_whatsapp_message_sent_delivery_report(fromNumber, agentReply.message, "text", messageUuid);

    const { slack_thread_id, channel_id } = await get_whatspp_conversations(fromNumber);
    if (slack_thread_id) {
      await postMessageToThread(slack_thread_id, `HR: ${agentReply.message}. Action: ${agentReply.action} Stage: ${agentReply.stage}`, channel_id || process.env.slack_action_channel_id);
    } else {
      const ts = await postMessage(`HR: ${agentReply.message}. Action: ${agentReply.action} Stage: ${agentReply.stage}`, channel_id || process.env.slack_action_channel_id);
      await update_slack_thread_id_for_conversion(fromNumber, ts, channel_id || process.env.slack_action_channel_id);
    }
    // got_shortlisted.do_call_via_human
    if (agentReply.action == "do_call_via_human") {
      setTimeout(() => {
        schedule_message_to_be_processed(fromNumber, cred);
      }, (fromNumber === ADMIN_PHNO ? 5 : DEBOUNCE_TIMEOUT) * 1000);
    }
  } else {
    console.log("debug!");
  }
  if (queue[fromNumber] && queue[fromNumber].canDelete) delete queue[fromNumber];
};

export const whatsapp_callback = async (req: Request, res: Response) => {
  console.log("whatsapp_callback");
  const { MessageUUID, To, From, Type, Status, ConversationExpirationTimestamp, ConversationOrigin, ConversationID, Units, TotalRate, TotalAmount, ErrorCode, QueuedTime, SentTime, Sequence } =
    req.body;
  console.log("MessageUUID", MessageUUID, "Status", Status, "To", To);
  //   await update_whatsapp_message_sent_delivery_report(MessageUUID, Status);
  res.sendStatus(200);
};

const remind_candidates = async (remainders: boolean) => {
  const candidates = await getPendingNotCompletedCandidates(remainders);
  console.log("getPendingNotCompletedCandidates", candidates.length);
  for (const candidate of candidates) {
    console.log(convertToIST(candidate.conversation.started_at));
    const date = convertToIST(candidate.conversation.started_at) as Date;
    const now = convertToIST(new Date());

    if (now.getTime() - date.getTime() > 1000 * 60 * 30) {
      //no response in 1hr
      console.log(candidate.unique_id);
      const fromNumber = candidate.unique_id;
      const { conversation } = await get_whatspp_conversations(fromNumber);
      const sortedConversation = sortBy(conversation, (conv: WhatsAppConversaion) => {
        return conv.created_at;
      });

      let should_continue = true;
      if (!remainders) {
        if (sortedConversation[sortedConversation.length - 1].userType == "agent") {
          should_continue = false;
        }
      }

      if (should_continue) {
        await schedule_message_to_be_processed(fromNumber, cred);
        await updateRemainderSent(fromNumber);
        await sleep(5000);
      }
    }
  }
};
setInterval(() => {
  //send remainders to candidate on same day
  (async () => {
    await remind_candidates(false);
    await remind_candidates(true);
    await get_pending_hr_screening_candidates();
  })();
}, 1000 * 60 * 30); //30min

const get_pending_hr_screening_candidates = async () => {
  const candidates = await getShortlistedCandidates();
  console.log("get_pending_hr_screening_candidates", candidates.length);
  for (const candidate of candidates) {
    const unique_id = candidate.unique_id;
    if (!(await isInterviewStarted(unique_id))) {
      await schedule_message_to_be_processed(unique_id, cred);
      await sleep(5000);
    }
  }
  const interview_remainder = await getInterviewRemainder();
  console.log("interview_remainder", interview_remainder.length);
  for (const candidate of interview_remainder) {
    const unique_id = candidate.unique_id;
    console.log(candidate);
    console.log(convertToIST(candidate.interview.started_at));
    const date = convertToIST(candidate.interview.started_at) as Date;
    const now = convertToIST(new Date());

    if (now.getTime() - date.getTime() > 1000 * 60 * 30) {
      await schedule_message_to_be_processed(unique_id, cred);
      await updateInterviewRemainderSent(unique_id);
      await sleep(5000);
    }
  }
};

get_pending_hr_screening_candidates();
remind_candidates(false);
remind_candidates(true);
