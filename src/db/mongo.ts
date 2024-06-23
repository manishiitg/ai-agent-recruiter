import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
import { Candidate, WhatsAppConversaion } from "./types";
import { threadId } from "worker_threads";
import { Interview } from "../agent/interviewer/types";
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
  await db.collection("interviews").deleteOne({
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
    return { slack_thread_id: doc.slack_thread_id, channel_id: doc.channel_id, conversation: doc.conversation as WhatsAppConversaion[] };
  } else {
    return { slack_thread_id: undefined, conversation: [] };
  }
};

export const update_slack_thread_id_for_conversion = async (from: string, thread_ts: string, channel_id: string) => {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const collection = db.collection("conversation");
  await collection.updateOne(
    { from },
    {
      $set: {
        slack_thread_id: thread_ts,
        channel_id,
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

export async function saveCandidateInterviewToDB(interview: Interview) {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const unique_id = interview.id;

  await db.collection("interviews").updateOne({ unique_id: unique_id }, { $set: { ...interview, updated_at: new Date() } }, { upsert: true });
}

export async function getCandidateInterviewFromDB(unique_id: string): Promise<Interview> {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const data = await db.collection("interviews").findOne({ unique_id: unique_id });
  if (data) {
    let obj: Interview = {
      id: data.unique_id,
      ...data,
    };
    return obj;
  } else {
    throw new Error("interview not found in db");
  }
}

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

  await db.collection("candidates").updateOne({ unique_id: unique_id }, { $set: { ...candidate, updated_at: new Date() } }, { upsert: true });
}

export async function saveCandidateConversationDebugInfoToDB(candidate: Candidate, info: any) {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const unique_id = candidate.id;
  await db.collection("candidates").updateOne({ unique_id: unique_id }, { $set: { "conversation.progress": info, updated_at: new Date() } }, { upsert: true });
}

export async function updateRemainderSent(unique_id: string) {
  const client = await connectDB();
  const db = client.db("whatsapp");
  await db.collection("candidates").updateOne(
    { unique_id },
    {
      $set: {
        "conversation.remainder_sent": true,
        updated_at: new Date(),
      },
    }
  );
}

export async function getInterviewRemainder() {
  const client = await connectDB();
  const db = client.db("whatsapp");

  // Get the current date
  let currentDate = new Date();

  // Set the time to the start of the day (00:00:00.000)
  let startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

  // Set the time to the start of the next day (00:00:00.000)
  let startOfNextDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);

  return await db
    .collection("interviews")
    .find(
      {
        "interview.remainder_sent": { $exists: false },
        $or: [{ "interview.conversation_completed": false }, { "interview.conversation_completed": { $exists: false } }],
        "interview.started_at": {
          $gte: startOfDay,
          $lt: startOfNextDay,
        },
      },
      {
        projection: {
          unique_id: 1,
          "interview.started_at": 1,
        },
        sort: {
          "interview.started_at": -1,
        },
      }
    )
    .toArray();
}

export async function updateInterviewRemainderSent(unique_id: string) {
  const client = await connectDB();
  const db = client.db("whatsapp");
  await db.collection("interviews").updateOne(
    { unique_id },
    {
      $set: {
        "interview.remainder_sent": true,
        updated_at: new Date(),
      },
    }
  );
}

export async function getPendingNotCompletedCandidates(remainders: boolean) {
  const client = await connectDB();
  const db = client.db("whatsapp");

  // Get the current date
  let currentDate = new Date();

  // Set the time to the start of the day (00:00:00.000)
  let startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

  // Set the time to the start of the next day (00:00:00.000)
  let startOfNextDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);

  if (remainders) {
    return await db
      .collection("candidates")
      .find(
        {
          "conversation.remainder_sent": { $exists: false },
          $or: [{ "conversation.conversation_completed": false }, { "conversation.conversation_completed": { $exists: false } }],
          "conversation.started_at": {
            $gte: startOfDay,
            $lt: startOfNextDay,
          },
        },
        {
          projection: {
            unique_id: 1,
            "conversation.started_at": 1,
          },
          sort: {
            "conversation.started_at": -1,
          },
        }
      )
      .toArray();
  } else {
    return await db
      .collection("candidates")
      .find(
        {
          $or: [
            { "conversation.conversation_completed": false },
            { "conversation.conversation_completed": { $exists: false } },
            { "conversation.conversation_completed_reason": "got_shortlisted.do_call_via_human" }, // need to now check even for interview
          ],
          "conversation.started_at": {
            $gte: startOfDay,
            $lt: startOfNextDay,
          },
        },
        {
          projection: {
            unique_id: 1,
            "conversation.started_at": 1,
          },
          sort: {
            "conversation.started_at": -1,
          },
        }
      )
      .toArray();
  }
}

export async function saveSlackTsRead(ts: string) {
  const client = await connectDB();
  const db = client.db("whatsapp");
  await db.collection("slack_channel_temp").insertOne({
    ts,
  });
}

export async function getSlackTsRead(ts: string) {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const row = await db.collection("slack_channel_temp").findOne({
    ts,
  });
  if (row) {
    return true;
  } else {
    return false;
  }
}

export const getShortlistedCandidates = async () => {
  const client = await connectDB();
  const db = client.db("whatsapp");

  // Get the current date
  let currentDate = new Date();

  // Set the time to the start of the day (00:00:00.000)
  let startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

  // Set the time to the start of the next day (00:00:00.000)
  let startOfNextDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);

  return await db
    .collection("candidates")
    .find(
      {
        "conversation.conversation_completed_reason": "got_shortlisted.do_call_via_human",
        "conversation.started_at": {
          $gte: startOfDay,
          $lt: startOfNextDay,
        },
      },
      {
        projection: {
          unique_id: 1,
        },
      }
    )
    .limit(50)
    .toArray();
};

export const isInterviewStarted = async (phoneNo: string) => {
  const client = await connectDB();
  const db = client.db("whatsapp");
  return (await db.collection("interviews").countDocuments({
    id: phoneNo,
  })) > 0
    ? true
    : false;
};

export const getInterviewCandidates = async () => {
  const client = await connectDB();
  const db = client.db("whatsapp");

  // Get the current date
  let currentDate = new Date();

  // Set the time to the start of the day (00:00:00.000)
  let startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

  // Set the time to the start of the next day (00:00:00.000)
  let startOfNextDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);

  return await db
    .collection("interviews")
    .find(
      {
        "interview.started_at": {
          $gte: startOfDay,
          $lt: startOfNextDay,
        },
      },
      {
        projection: {
          unique_id: 1,
          "interview.started_at": 1,
        },
        sort: {
          "interview.started_at": -1,
        },
      }
    )
    .toArray();
};

export const update_interview_transcript = async (ph: string, uid: string, text: string) => {
  const client = await connectDB();
  const db = client.db("whatsapp");
  await db.collection("interviews").updateOne(
    {
      id: ph,
    },
    {
      //@ts-ignore
      $push: {
        "interview.transcribe": {
          uid: uid,
          text,
        },
      },
    }
  );
};

export const update_interview_transcript_completed = async (ph: string) => {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const resp = await db.collection("interviews").updateOne(
    {
      id: ph,
    },
    {
      $set: {
        "interview.transcribe_completed": true,
      },
    }
  );
  console.log(resp);
};
