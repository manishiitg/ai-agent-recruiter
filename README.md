# ai-agent-recruiter

Building an AI Agent which can talk to candidate on whatsapp, process his resume for a job and conduct a basic interview!

This agent is live, try it out by sending "Hi" at 91-7011749960

Stack

- Using LLM's (DeepSeekV2, Claude (in-progress))
- Langfuse for observability
- Plivo for whatsapp
- MongoDB for database

It will reach out the candidate on whatsapp based on this resume and phone no.
Do END-END shortlisting and conduct a basic whatsapp audio based interview

**Whatsapp Agent**

- Check if candidate is available by sending a curated message on whatsapp
- Based on his reply
- Ask few basic screening round questions like salary, location, etc
- Based on predefined rules, if all OK
- Ask basic technical questions to the candidate on whatsapps and ask candidate to reply via message
- This allows candidate to quickly respond to question and we are able to analyze his communication skills as
- Shortlist candidate for technical round

Keep sending status to recrutiers on slack

- Keep candidate communications updated on slack so recruiters can manually view it
- Recruiters can anytime take over the conversion via slack and stop the automated bot replies


Agent Architecture
======================

Agent has a STATE (s) , STATE TRANSITION (s) and RULE (s)

- Based on the conversation I extract certain key information regarding by agent using LLMs. this can be seen in extractInfo()

- Based on this information, we do STATE Transition and move user to a specific state. these states can be seen in rule_map

- For every state, based on the conversation there are rules defined which allow agent to generated specific output

- Agent generates a specific output which is sent to the user and also generations an action

- Based on the action I update state. 

- User responds 

- This LOOP is repeated

