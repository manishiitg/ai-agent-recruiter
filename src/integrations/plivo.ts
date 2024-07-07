import dotenv from "dotenv";
dotenv.config();

import { createRequire } from "module";
import { join } from "path";
// @ts-ignore
const require = createRequire(import.meta.url);
let plivo = require("plivo");
let client = new plivo.Client(process.env.plivo_auth_id, process.env.plivo_auth_token);

export const send_whatsapp_text_reply = async (
  text: string,
  to: string,
  from: string,
  callback_url = process.env.whatapp_message_delivery_report_url
): Promise<{ messageUuid: string; apiId: string; message: string }> => {
  if (!from || from.length === 0) {
    from = "917011749960";
  }
  return new Promise((res, rej) => {
    client.messages
      .create({
        src: from,
        dst: to,
        type: "whatsapp",
        text: text,
        url: callback_url,
      })
      .then(function (response: any) {
        console.log(response);
        res(response);
      })
      .catch((err: any) => {
        console.error(err);
        rej(err);
      });
  });
};
