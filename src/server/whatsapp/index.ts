import { Request, Response } from "express";
import { send_whatsapp_text_reply } from "./util";
import {
  add_whatsapp_message_sent_delivery_report,
  check_whatsapp_convsation_exists,
  get_whatspp_conversations,
  save_whatsapp_conversation,
  update_whatsapp_message_sent_delivery_report,
} from "../../db/mongo";
import sortBy from "lodash/sortBy";
import { WhatsAppConversaion, WhatsAppCreds } from "../../db/types";
import { process_whatsapp_conversation } from "./conversation";

const queue: Record<string, NodeJS.Timeout> = {};

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

  if (!(await check_whatsapp_convsation_exists(MessageUUID))) {
    console.log("ContentType", ContentType);

    switch (ContentType) {
      case "text":
        const text = Body;
        console.log(`Text Message received - From: ${fromNumber}, To: ${toNumber}, Text: ${text}`);
        await save_whatsapp_conversation("candidate", fromNumber, ContentType, text, MessageUUID, req.body);

        if (queue[fromNumber]) {
          clearTimeout(queue[fromNumber]);
        }
        queue[fromNumber] = setTimeout(() => {
          schedule_message_to_be_processed(fromNumber, cred);
        }, 5 * 1000);

        break;
      case "media":
        const caption = Body;
        console.log(`Media Message received - From: ${fromNumber}, To: ${toNumber}, Media Attachment: ${Media0}, Caption: ${caption}`);
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
  res.status(200).send("Message Received");
};

const schedule_message_to_be_processed = async (fromNumber: string, cred: WhatsAppCreds) => {
  delete queue[fromNumber];
  // agent processing starts
  const conversations = await get_whatspp_conversations(fromNumber);
  const sortedConversation = sortBy(conversations, (conv: WhatsAppConversaion) => {
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
    cred
  );

  if (agentReply.message) {
    const response = await send_whatsapp_text_reply(agentReply.message, fromNumber, cred.phoneNo);
    const messageUuid = response.messageUuid;
    console.log("got messageUuid", messageUuid);
    await save_whatsapp_conversation("agent", fromNumber, "text", agentReply.message, "", "");
    await add_whatsapp_message_sent_delivery_report(fromNumber, agentReply.message, "text", messageUuid);
  } else {
    console.log("debug!");
  }
};

export const whatsapp_callback = async (req: Request, res: Response) => {
  console.log("whatsapp_callback");
  const { MessageUUID, To, From, Type, Status, ConversationExpirationTimestamp, ConversationOrigin, ConversationID, Units, TotalRate, TotalAmount, ErrorCode, QueuedTime, SentTime, Sequence } =
    req.body;
  console.log("MessageUUID", MessageUUID, "Status", Status, "To", To);
  //   await update_whatsapp_message_sent_delivery_report(MessageUUID, Status);
  res.send(200);
};

/**
 * lets start with a simple whatsapp flow first
 * 1. from linkedin and gmail lets start to diver few users to whatsapp. asking them to reply as Hi, Hello on no.
 * 2. for this we need users phone no and resume mapped.
 * 3. need to to be able to verify if user is the same, or someone else. its possible person has mention some other phone no of resume and other on whatsapp.
 * 4. start the bot flow directly from here?
 *
 *
 * other option is simply reply to users on linkedin/gmail to reply "Hi" on whatsapp and start conversation from there?
 * 1. ask users to upload their resume's on whatapp? or share existing resume and check if its the latest resume.
 * 2. start bot flow?
 *
 *
 *
 *
 * one issue is that lot of people will start to call on the number? we should make number non anwerable?
 */
