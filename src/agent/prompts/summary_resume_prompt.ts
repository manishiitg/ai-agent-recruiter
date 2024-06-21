import { parseStringPromise } from "xml2js";

export const summariseResume = async (resume_text: string, profileID: string) => {
  const prompt = `Here is the text of a job candidate's resume:
  
     <resume>${resume_text}</resume>
     
     Please read through the resume carefully. Pay close attention to the candidate's contact information, work experience, educational background, projects, and skills.

    After you have finished reviewing the resume, please identify and extract the most important details about the candidate. At a minimum, be sure to note:
    - The candidate's name, email address and/or phone number
    - The companies they have worked at, the positions they held there, and the main responsibilities of each role
    - The degrees they have earned, the institutions attended, and the fields of study
    - Any key projects, publications, or technical skills that are highlighted

    Once you have gathered this key information, please write a concise summary of the candidate's qualifications and background in just a few sentences. Focus on the main highlights and most relevant points from the categories above. 

    Please put your final summary inside <SUMMARY> tags, like this:

    <RESPONSE>
    <SUMMARY>
    John Doe is a software engineer with 5 years of experience at Microsoft and Google. He earned a BS and MS in Computer Science from Stanford. John has worked on several large-scale projects including leading development of Microsoft's Cortana AI assistant. He is skilled in Python, C++, machine learning, and cloud computing.
    </SUMMARY>
    </RESPONSE>

    Remember, the summary should be high-level and focus on only the most important points. Do not simply restate the entire resume. Aim for concision and clarity.

     Respond only in xml format below:
     <RESPONSE>
      <SUMMARY>summary of candidates resume</SUMMARY>
    </<RESPONSE>`;

  const llm_output = await callLLMHaiku(prompt, profileID, 0, GCP_CLAUDE_HAIKU, { type: "summary" }, async (llm_output: string): Promise<Record<string, string>> => {
    return {};
  });

  const jObj = await parseStringPromise(llm_output, {
    explicitArray: false,
    strict: false,
  });
  if (!("RESPONSE" in jObj)) {
    throw new Error("response not found!");
  }

  const summary = jObj["RESPONSE"]["SUMMARY"];
  // const startKey = "SUMMARY";
  // const endKey = "SUITABLE JOB PROFILE";
  // const pattern = new RegExp(`${startKey}:(.*?)${endKey}:(.*?)(?=${startKey}|$)`, "gs");

  // const matches = [...llm_output.matchAll(pattern)];
  // let summary = "";
  // let jobprofile = "";
  // for (let ix in matches) {
  //   const match = matches[ix];
  //   console.log("======");
  //   console.log(`SUMMARY: ${match[1].trim()}`);
  //   console.log(`SUITABLE JOB PROFILE: ${match[2].trim()}`);
  //   summary = match[1].trim();
  //   jobprofile = match[2].trim();
  //   if (jobprofile == "no job profile") {
  //     jobprofile = "";
  //   }
  //   break;
  // }
  return summary;
};
