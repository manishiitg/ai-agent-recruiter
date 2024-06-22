import { getPendingNotCompletedCandidates } from "../db/mongo";
import { convertToIST } from "../server/whatsapp/util";

(async () => {
  const candidates = await getPendingNotCompletedCandidates();
  console.log(candidates.length);
  for (const candidate of candidates) {
    console.log(convertToIST(candidate.conversation.started_at));
    const date = convertToIST(candidate.conversation.started_at) as Date;
    const now = new Date();

    if (now.getTime() - date.getTime() > 1000 * 60 * 10) {
      console.log(candidate._id);
    }
  }
})();
