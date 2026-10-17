import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type Kind = "new_follower" | "reply" | "verification";

/**
 * One in-app notification. `refId` makes it idempotent: the same follower, comment or decision never
 * notifies twice (the database refuses duplicates). Respects the person's preference and blocks.
 * Never sends SMS, email or push.
 */
export async function notify({ userId, kind, actorId, refId, title, link }: { userId: string; kind: Kind; actorId: string | null; refId: string; title: string; link: string }) {
  if (actorId && actorId === userId) return;
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("notify_followers, notify_replies").eq("id", userId).maybeSingle();
  if (!p) return;
  if (kind === "new_follower" && !p.notify_followers) return;
  if (kind === "reply" && !p.notify_replies) return;
  if (actorId) {
    const { count } = await admin
      .from("user_blocks")
      .select("*", { count: "exact", head: true })
      .or(`and(blocker_id.eq.${userId},blocked_id.eq.${actorId}),and(blocker_id.eq.${actorId},blocked_id.eq.${userId})`);
    if (count) return;
  }
  await admin.from("notifications").upsert({ user_id: userId, kind, actor_id: actorId, ref_id: refId, title: title.slice(0, 140), link }, { onConflict: "user_id,kind,ref_id", ignoreDuplicates: true });
}
