import { Request, Response } from "express";
import { send_whatsapp_text_reply } from "./util";
import { add_whatsapp_message_sent_delivery_report, check_whatapp_convsation_exists, save_whatsapp_conversation, update_whatsapp_message_sent_delivery_report } from "../../db/mongo";

export const whatsapp_webhook = async (req: Request, res: Response) => {
  const { From, To, ContentType, Context, Button, Media0, Body, MessageUUID } = req.body;
  console.log(req.body);

  const fromNumber = From;
  const toNumber = To;

  if (!(await check_whatapp_convsation_exists(MessageUUID))) {
    console.log("ContentType", ContentType);

    switch (ContentType) {
      case "text":
        const text = Body;
        console.log(`Text Message received - From: ${fromNumber}, To: ${toNumber}, Text: ${text}`);
        const messageToSend = `Echo: ${text}`;
        const response = await send_whatsapp_text_reply(messageToSend, fromNumber, toNumber);
        const messageUuid = response.messageUuid;
        console.log("got messageUuid", messageUuid);
        await save_whatsapp_conversation(fromNumber, ContentType, text, MessageUUID, req.body);
        await add_whatsapp_message_sent_delivery_report(toNumber, messageToSend, "text", messageUuid);
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
