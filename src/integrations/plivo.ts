// import dotenv from "dotenv";
// dotenv.config();

// import { createRequire } from "module";
// import { join } from "path";
// // @ts-ignore
// const require = createRequire(import.meta.url);
// let plivo = require("plivo");
// let client = new plivo.Client(process.env.plivo_auth_id, process.env.plivo_auth_token);

// export const send_whatsapp_text_reply = async (
//   text: string,
//   to: string,
//   from: string,
//   callback_url = process.env.whatapp_message_delivery_report_url
// ): Promise<{ messageUuid: string; apiId: string; message: string }> => {
//   //temp code
//   if (!from || from.length === 0) {
//     from = "917011749960";
//   }
//   return new Promise((res, rej) => {
//     client.messages
//       .create({
//         src: from,
//         dst: to,
//         type: "whatsapp",
//         text: text,
//         url: callback_url,
//       })
//       .then(function (response: any) {
//         console.log(response);
//         res(response);
//       })
//       .catch((err: any) => {
//         console.error(err);
//         rej(err);
//       });
//   });
// };
import dotenv from "dotenv";
dotenv.config();

import { createRequire } from "module";
const require = createRequire(import.meta.url);
let plivo: any;
let client: any;

if (process.env.plivo_auth_id && process.env.plivo_auth_token) {
  plivo = require("plivo");
  client = new plivo.Client(process.env.plivo_auth_id, process.env.plivo_auth_token);
} else {
  console.warn("Plivo credentials are not set. Skipping client initialization.");
}

export const send_whatsapp_text_reply = async (
  text: string,
  to: string,
  from: string,
  callback_url = process.env.whatapp_message_delivery_report_url
): Promise<{ messageUuid: string; apiId: string; message: string }> => {
  if (!client) {
    throw new Error("Plivo client is not initialized. Please check your credentials.");
  }

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
      .then((response: any) => {
        console.log(response);
        res(response);
      })
      .catch((err: any) => {
        console.error(err);
        rej(err);
      });
  });
};

