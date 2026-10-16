import { Bell } from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

/** Bell with the number of unread in-app notifications (new articles from followed authors). */
export async function NotificationBell({ userId, className = "" }: { userId: string; className?: string }) {
  const { count } = await createAdminClient().from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
  const unread = count ?? 0;
  return (
    <Link
      href="/account/notifications"
      className={`relative grid h-10 w-10 place-items-center rounded-full ${className}`}
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      data-testid="bell"
    >
      <Bell className="h-5 w-5" aria-hidden />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[0.7rem] font-bold text-navy tabular-nums" aria-hidden>
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
