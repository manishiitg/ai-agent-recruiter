import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

let globalDBConnection: MongoClient | null = null;

export const connectDB = async (): Promise<MongoClient> => {
  const uri = process.env.mongouri;
  console.log("mongo connection uri", uri);
  if (uri) {
    if (globalDBConnection === null) {
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

export const check_whatapp_convsation_exists = async (uid: string) => {
  const client = await connectDB();
  const db = client.db("whatsapp");
  const collection = db.collection("conversation");
  return (await collection.countDocuments({
    "conversation.uid": uid,
  })) > 0
    ? true
    : false;
};
export const save_whatsapp_conversation = async (from: string, messageType: string, content: string, uid: string, body: any) => {
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
        conversation: [
          {
            messageType,
            content,
            uid,
            body,
            created_at: new Date(),
          },
          ...existingConversation.conversation,
        ],
        updated_at: new Date(),
      }
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
          created_at: new Date(),
        },
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
