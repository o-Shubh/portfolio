import { processReferralRewards, releaseHeldCredit } from "@/lib/referrals";

/**
 * Daily referral job (see vercel.json): gives the invite rewards that are due, and frees credit held by checkouts
 * that weren't paid within a day. Protected like the email job by "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const released = await releaseHeldCredit({ olderThanHours: 24 });
  return Response.json({ ...(await processReferralRewards()), released });
}
