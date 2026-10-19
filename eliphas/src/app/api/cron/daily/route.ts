import { isDigestDay, sendWeeklyDigests } from "@/lib/digest";
import { retryEmails } from "@/lib/email";
import { processReferralRewards, releaseHeldCredit } from "@/lib/referrals";

/**
 * The one daily job (see vercel.json; one job fits every Vercel plan): retries failed emails, gives due invite rewards
 * and frees credit held by unpaid checkouts, and on Mondays sends the weekly email. Protected by CRON_SECRET.
 * `?digest=1` sends the weekly email on another day (for a manual run).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const emails = await retryEmails();
  const released = await releaseHeldCredit({ olderThanHours: 24 });
  const referrals = await processReferralRewards();
  const digest = isDigestDay() || new URL(request.url).searchParams.get("digest") === "1" ? await sendWeeklyDigests() : null;
  return Response.json({ emails, referrals: { ...referrals, released }, digest });
}
