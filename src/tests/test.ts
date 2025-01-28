// // import { process_whatsapp_conversation } from "../server/whatsapp/conversation"
// // import { ConversationMessage } from "../agent/recruiter/types/conversation"

// // (async () => {
// //     const dummyPhoneNo = "1234567890";
// //     const dummyWhatsApp = "whatsapp:1234567890";
    
// //     const dummyConversation: ConversationMessage[] = [
// //       { name: "candidate", content: "Hi, I am looking for a job.", date: new Date() },
// //       { name: "agent", content: "Please share your resume for evaluation.", date: new Date() }
// //     ];
    
// //     const dummyCreds = { name: "TestBot", phoneNo: dummyPhoneNo };
  
// //     const callback = (reply: string) => {
// //       console.log("Bot reply:", reply);
// //     };
  
// //     try {
// //       const result = await process_whatsapp_conversation(
// //         dummyPhoneNo,
// //         dummyWhatsApp,
// //         dummyConversation,
// //         dummyCreds,
// //         callback
// //       );
// //       console.log("Final Result:", result);
// //     } catch (error : any) {
// //       console.error("Error:", error);
// //     }
// //   })();
  
// import { whatsapp_webhook } from "./../server/whatsapp/index"; // Adjust the path accordingly

// // Helper to simulate mock requests and responses
// class MockRequest {
//   body: any;
//   constructor(body: any) {
//     this.body = body;
//   }
// }

// class MockResponse {
//   statusCode: number = 200;
//   body: any = null;

//   status(code: number) {
//     this.statusCode = code;
//     return this;
//   }

//   json(data: any) {
//     this.body = data;
//     return this;
//   }
// }

// // Test cases
// function test_whatsapp_webhook() {
//   console.log("Running Tests for whatsapp_webhook Function...\n");

//   // Test 1: Handle a text message
//   // const req1 = new MockRequest({
//   //   From: "9876543210",
//   //   To: "0987654321",
//   //   ContentType: "text",
//   //   Context: "context data here",
//   //   Button: null,
//   //   Media0: null,
//   //   Body: "Hello, this is a test message!",
//   //   MessageUUID: "1234-5678-9101",
//   // });
//   // const res1 = new MockResponse();
//   // whatsapp_webhook(req1 as any, res1 as any);
//   // console.log("Test 1 - Text Message:");
//   // console.log(`Status: ${res1.statusCode}`);
//   // console.log(`Response:`, res1.body);

//   // Test 2: Handle a media message
//   const req2 = new MockRequest({
//     From: "1234567890",
//     To: "0987654321",
//     ContentType: "media",
//     Context: "context data here",
//     Button: null,
//     Media0: "https://drive.google.com/uc?export=download&id=1QaYpPhuckLODIVq7pOuq3CQ2h8fZGYhd",
//     Body: "Media caption here",
//     MessageUUID: "5678-9101-1234",
//   });
//   const res2 = new MockResponse();
//   whatsapp_webhook(req2 as any, res2 as any);
//   console.log("\nTest 2 - Media Message:");
//   console.log(`Status: ${res2.statusCode}`);
//   console.log(`Response:`, res2.body);

// //   // Test 3: Handle CLEAR command
// //   const req3 = new MockRequest({
// //     From: "1234567890",
// //     To: "0987654321",
// //     ContentType: "text",
// //     Context: "context data here",
// //     Button: null,
// //     Media0: null,
// //     Body: "CLEAR",
// //     MessageUUID: "4321-5678-9101",
// //   });
// //   const res3 = new MockResponse();
// //   whatsapp_webhook(req3 as any, res3 as any);
// //   console.log("\nTest 3 - CLEAR Command:");
// //   console.log(`Status: ${res3.statusCode}`);
// //   console.log(`Response:`, res3.body);

// //   // Test 4: Invalid data
// //   const req4 = new MockRequest({});
// //   const res4 = new MockResponse();
// //   whatsapp_webhook(req4 as any, res4 as any);
// //   console.log("\nTest 4 - Invalid Data:");
// //   console.log(`Status: ${res4.statusCode}`);
// //   console.log(`Response:`, res4.body);
// }

// // Run the tests
// test_whatsapp_webhook();
