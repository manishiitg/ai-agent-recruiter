import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { whatsapp_callback, whatsapp_webhook } from "./server/whatsapp";
import { deleteFolderRecursive } from "./server/whatsapp/util";
import { mkdirSync } from "fs";

//@ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

process.env.dirname = path.join(__dirname, "images");
deleteFolderRecursive(process.env.dirname);
mkdirSync(process.env.dirname, { recursive: true });

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send("Hello!");
});

app.post("/whatsapp-webhook", whatsapp_webhook);
app.post("/whatsapp_callback", whatsapp_callback);

// 404 route
app.use((req: Request, res: Response) => {
  console.log(`Not Found: ${req.originalUrl} ${req.method}`);
  res.status(404).send(`Not Found: ${req.originalUrl}`);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

console.log(`server started ${port}`);
