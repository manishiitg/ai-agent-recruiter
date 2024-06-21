import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
import { Candidate, WhatsAppConversaion } from "./types";
import { threadId } from "worker_threads";
dotenv.config();

let globalDBConnection: MongoClient | null = null;

export const connectDB = async (): Promise<MongoClient> => {
  const uri = process.env.mongouri;
  if (uri) {
    if (globalDBConnection === null) {
      console.log("mongo connection uri", uri);
      const client = new MongoClient(uri, {
        // serverApi: {
        //   version: ServerApiVersion.v1,
        //   strict: true,
        //   deprecationErrors: true,
        // },
      });
      globalDBConnection = client;
    }
    return globalDBConnection;
  } else {
    throw new Error("unable to connect to db");
  }
};

async function run() {
  const client = await connectDB();
  //   try {
  // Connect the client to the server	(optional starting in v4.7)
  await client.connect();
  // Send a ping to confirm a successful connection
  await client.db("admin").command({ ping: 1 });
  console.log("Pinged your deployment. You successfully connected to MongoDB!");
  //   } finally {
  //     // Ensures that the client will close when you finish/error
  //     await client.close();
  //   }
}
run().catch(console.dir);

// only for debugging purposes
export const deleteDataForCandidateToDebug = async (from: string) => {
  const client = await connectDB();
  const db = client.db("whatsapp");
  await db.collection("conversation").deleteOne({
    from,
  });
  await db.collection("candidates").deleteOne({
    unique_id: from,
  });
};

export const check_whatsapp_convsation_exists = async (uid: string) => {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const collection = db.collection("conversation");
  return (await collection.countDocuments({
    "conversation.uid": uid,
  })) > 0
    ? true
    : false;
};

export const get_whatspp_conversations = async (from: string) => {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const collection = db.collection("conversation");
  const doc = await collection.findOne({
    from: from,
  });
  if (doc) {
    return { slack_thread_id: doc.slack_thread_id, conversation: doc.conversation as WhatsAppConversaion[] };
  } else {
    return { slack_thread_id: undefined, conversation: [] };
  }
};

export const update_slack_thread_id_for_conversion = async (from: string, thread_ts: string) => {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const collection = db.collection("conversation");
  await collection.updateOne(
    { from },
    {
      $set: {
        slack_thread_id: thread_ts,
      },
    },
    { upsert: true }
  );
};
export const save_whatsapp_conversation = async (type: "agent" | "candidate", from: string, messageType: string, content: string, uid: string, body: any) => {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const collection = db.collection("conversation");
  // Check if the conversation already exists for the given 'from'
  const existingConversation = await collection.findOne({ from });

  if (existingConversation) {
    // If the conversation exists, update it by adding the new message
    await collection.updateOne(
      { _id: existingConversation._id },
      {
        //@ts-ignore
        $push: {
          conversation: {
            messageType,
            content,
            uid,
            body,
            userType: type,
            created_at: new Date(),
          } as WhatsAppConversaion,
        },
        $set: {
          updated_at: new Date(),
        },
      },
      { upsert: true }
    );
  } else {
    // If the conversation does not exist, create a new one
    await collection.insertOne({
      from,
      conversation: [
        {
          messageType,
          content,
          uid,
          body,
          userType: type,
          created_at: new Date(),
        } as WhatsAppConversaion,
      ],
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
};

export const add_whatsapp_message_sent_delivery_report = async (to: string, message: string, message_type: string, uid: string) => {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const collection = db.collection("delivery_report");
  await collection.insertOne({
    uid,
    to,
    message,
    message_type,
    created_at: new Date(),
  });
};

export const update_whatsapp_message_sent_delivery_report = async (uid: string, status: string) => {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const collection = db.collection("delivery_report");
  await collection.updateOne(
    {
      uid,
    },
    {
      $set: {
        status: status,
        updated_at: new Date(),
      },
    },
    {
      upsert: false,
    }
  );
};

export async function getCandidateDetailsFromDB(unique_id: string): Promise<Candidate> {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const data = await db.collection("candidates").findOne({ unique_id: unique_id });
  if (data) {
    let obj: Candidate = {
      id: data.unique_id,
      ...data,
    };
    return obj;
  } else {
    throw new Error("candidate not found in db");
  }
}

export async function saveCandidateDetailsToDB(candidate: Candidate) {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const unique_id = candidate.id;

  await db.collection("candidates").updateOne({ unique_id: unique_id }, { $set: { ...candidate } }, { upsert: true });
}

export async function saveCandidateConversationDebugInfoToDB(candidate: Candidate, info: any) {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const unique_id = candidate.id;
  await db.collection("candidates").updateOne({ unique_id: unique_id }, { $set: { "conversation.progress": info } }, { upsert: true });
}
