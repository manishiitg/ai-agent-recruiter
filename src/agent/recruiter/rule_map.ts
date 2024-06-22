export const STAGE_RULE_MAP: Record<
  string,
  Record<
    string,
    {
      rule: string;
      response: string;
      condition_ctc_response?: {
        true: string;
        false: string;
      };
    }
  >
> = {
  new: {
    greeting: {
      rule: "If conversation is just a greeting, like Hello, How are you, etc and nothing else.",
      response: "introduce yourself and ask his resume for job application",
    },
    tell_job_profiles: {
      rule: "If candidate is asking about open job profiles",
      response: "tell about open job profiles closest matching to candidate profile based on <context>. tell maximum 1-2 profiles only relevent to candidate",
    },
    ask_resume: {
      rule: "If candidate has mentioned interest in a job profile in his conversation and if it is matching our open job profile",
      response: "",
      condition_ctc_response: {
        true: "ask his resume and expected and current CTC and current location",
        false: "ask his resume and current location",
      },
    },
    ask_resume_messages: {
      rule: "If candidate is asking for email to send resume",
      response: "ask candidate to reply here on conversion",
    },
    tell_no_recommend_job: {
      rule: "If candidate has mentioned interest in a job profile in his conversation and if it is not similar to our open job profiles",
      response: "Tell we don't have an open job profile matching his interest",
    },
    tell_no_recommend_not_hiring: {
      rule: "If candidate has mentioned interest in a job profile in his conversation which are not hiring for",
      response: "Tell him we are not hiring for the job profile he is interesting in",
    },
    tell_no_recommend_job_closed: {
      rule: "If candidate has mentioned interest in a job profile in his conversation and if it is similar to a <closed_jobs> profile",
      response: "Tell we don't have an open job profile matching his interest and suggest open job profiles we have",
    },
    tell_job_profile_specific: {
      rule: "candidate is asking about a specific job profile",
      response: "check our open/closed jobs profiles and respond to him accordingly closest matching to candidate profile and make sure to ask his resume",
    },
    tell_job_opening: {
      rule: "If candidate has not mentioned which job profile candidate is interested in",
      response: "Suggest the a single most suitable <open_job> profile based this conversation/context and ask if he is interested for the same",
    },
    tell_job_description: {
      rule: "if candidate is specifically about job description in conversation",
      response: "tell him job description based on the job profile he is asking about",
    },
    candidate_no_job_profile: {
      rule: "if candidate is not interested in the job profile anymore",
      response: "acknowledge the same and thank him for his time",
    },
  },
  got_resume: {
    ask_job_profile: {
      rule: "If candidate has not provided the job profile he is looking for and we don't have a suitable job profile",
      response: "ask candidate about job profile he wants to apply for",
    },
    ask_ctc_location: {
      rule: "If candidate has not provided his expected CTC, we need to ask him",
      response: "",
      condition_ctc_response: {
        true: "ask him about his expected and current CTC and current location",
        false: "ask him about his expected CTC and current location",
      },
    },
    ask_location: {
      rule: "If candidate has not provided his current location in conversation",
      response: "ask his current location",
    },
    tell_job_profiles: {
      rule: "If candidate is asking about open job profiles",
      response: "tell about open job profiles closest matching to candidate profile. tell maximum 1-2 profiles only relevent to candidate",
    },
    do_shortlist: {
      rule: "If candidate has not provided his expected ctc but has clearly mentioned his CTC is negotiable in conversation or has clearly mentioned in conversation he doesn't have any CTC expectations",
      response: "Tell him you are evaluating his resume and profile",
    },
    do_shortlist_still: {
      rule: "If candidate has provided his expected CTC",
      response: "Tell him you are evaluating his resume and profile",
    },
    tell_no_recommend_not_hiring: {
      rule: "If candidate has mentioned interest in a job profile in his conversation which are not hiring for",
      response: "Tell him we are not hiring for the job profile he is interesting in",
    },
    candidate_no_job_profile: {
      rule: "if candidate is not interested in the job profile anymore",
      response: "acknowledge the same and thank him for his time",
    },
    job_closed: {
      rule: "if the job profile the candidate is interested in got closed",
      response: "inform him that the job profile is closed now and suggest him alternative suitable open jobs",
    },
  },
  got_ctc: {
    ask_ctc_again: {
      rule: "If candidate is asking about for budget for a role or salary/stipend for a role and has not mentioned his expected CTC",
      response: "",
      condition_ctc_response: {
        true: "ask him about his expected CTC, current ctc and explicitly mention we cannot disclouse our compensation",
        false: "ask him about his expected CTC and explicitly mention we cannot disclouse our compensation",
      },
    },
    ask_location: {
      rule: "If candidate has not provided his current location in conversation",
      response: "ask his current location",
    },
    ask_resume: {
      rule: "If candidate has not provided his resume",
      response: "ask his resume",
    },
    do_shortlist: {
      rule: "If candidate has not provided his expected ctc but has mentioned his CTC is negotiable or has mentioned he doesn't have any CTC expectations",
      response: "Tell him you are evaluating his resume and profile",
    },
    do_shortlist_again: {
      rule: "If candidate has provide his expected ctc and provided his resume",
      response: "Tell him you are evaluating his resume and profile",
    },
    tell_job_description: {
      rule: "if candidate is specifically about job description in conversation",
      response: "tell him job description based on the job profile he is asking about",
    },
    candidate_no_job_profile: {
      rule: "if candidate is not interested in the job profile anymore",
      response: "acknowledge the same and thank him for his time",
    },
    job_closed: {
      rule: "If the job profile the candidate is interested in got closed",
      response: "inform him the same and mention we will contact him again when the job profile opens",
    },
  },
  got_shortlisted: {
    schedule_call: {
      rule: "if candidate has not provided his phone number",
      response: "ask candidate for phone number and available time",
    },
    schedule_call_availablity: {
      rule: "if candidate has not provided his availablity but has provided his phone number",
      response: "ask candidate for phone number and available time",
    },
    do_call_via_human: {
      rule: "if candidate has provided his phone number and also provided his availability",
      response: "mention i will call you in sometime and mention his phone no",
    },
    tell_job_description: {
      rule: "if candidate is specifically about job description in conversation",
      response: "tell him job description based on the job profile he is asking about",
    },
    candidate_no_job_profile: {
      rule: "if candidate is not interested in the job profile anymore",
      response: "acknowledge the same and thank him for his time",
    },
    job_closed: {
      rule: "If the job profile the candidate is interested in got closed",
      response: "inform him the same and mention we will contact him again when the job profile opens",
    },
  },
  got_rejected: {
    rejected: {
      rule: "If Candidate is rejected based on context",
      response: "Inform candidate he is rejected and also mention reason in a polite way. Don't mention about other job profiles",
    },
    rejected_reason: {
      rule: "If candiate is asking for reason for reason",
      response: "Inform candidate reason in a polite way. Don't mention about other job profiles",
    },
    no_action: {
      rule: "If candiate is not asking for reason but responding with a general message",
      response: "take no action",
    },
  },
};
