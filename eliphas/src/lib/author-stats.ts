import "server-only";
import { createClient } from "@/lib/supabase/server";

const IST = "Asia/Kolkata";
export const monthShort = (d: string) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { month: "short", timeZone: IST });
export const monthLong = (d: string) =>
  new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: IST });

/** Everything the author dashboard shows, for the logged-in author only. */
export async function getAuthorStats(profileId: string, months: number) {
  const supabase = await createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1), 1);
  since.setHours(0, 0, 0, 0);

  const [balance, profile, byMonth, byCity, byBook, recent, payouts] = await Promise.all([
    supabase.rpc("my_balance").single(),
    supabase.from("profiles").select("payout_upi").eq("id", profileId).single(),
    supabase.rpc("my_sales_by_month", { months }),
    supabase.rpc("my_sales_by_city", { since: since.toISOString() }),
    supabase.rpc("my_sales_by_book"),
    supabase.rpc("my_book_orders", { max_rows: 5, skip: 0 }),
    supabase.from("payouts").select("id, amount, reference, paid_at, created_at").eq("author_id", profileId).eq("status", "paid").order("created_at", { ascending: false }).limit(5),
  ]);

  const monthRows = byMonth.data ?? [];
  const thisMonth = monthRows.at(-1);
  return {
    totals: {
      earned: Number(balance.data?.earned ?? 0),
      paid: Number(balance.data?.paid ?? 0),
      balance: Number(balance.data?.balance ?? 0),
      copies: Number(balance.data?.copies_sold ?? 0),
      upi: profile.data?.payout_upi ?? null,
      monthCopies: Number(thisMonth?.copies ?? 0),
      monthEarnings: Number(thisMonth?.earnings ?? 0),
    },
    byMonth: monthRows.map((r) => ({ month: r.month, copies: Number(r.copies), earnings: Number(r.earnings) })),
    byCity: (byCity.data ?? []).map((r) => ({ city: r.city, state: r.state, copies: Number(r.copies), earnings: Number(r.earnings) })),
    byBook: new Map((byBook.data ?? []).map((r) => [r.book_id, { copies: Number(r.copies), earnings: Number(r.earnings) }])),
    recent: recent.data ?? [],
    payouts: payouts.data ?? [],
  };
}
