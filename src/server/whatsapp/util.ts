import dotenv from "dotenv";
dotenv.config();

import { createRequire } from "module";
// @ts-ignore
const require = createRequire(import.meta.url);
let plivo = require("plivo");
let client = new plivo.Client(process.env.plivo_auth_id, process.env.plivo_auth_token);

export const send_whatsapp_text_reply = async (
  text: string,
  to: string,
  from: string,
  callback_url = "https://local.excellencetechnologies.in/whatsapp_callback/"
): Promise<{ messageUuid: string; apiId: string; message: string }> => {
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
