"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { articlePath } from "@/lib/article-format";
import { logAudit } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export type ModState = { error?: string; ok?: string } | undefined;

const ACTIONS = { hide: "hidden", restore: "visible", remove: "removed" } as const;

/**
 * Hide, restore or remove an article or comment, or dismiss its reports. Every decision needs a reason,
 * is recorded in moderation_actions, and closes the open reports on that item.
 */
export async function moderate(_prev: ModState, fd: FormData): Promise<ModState> {
  const me = await requireRole(["admin"]);
  const targetType = String(fd.get("target_type"));
  const targetId = String(fd.get("target_id"));
  const action = String(fd.get("action"));
  const reason = String(fd.get("reason") ?? "").trim();
  if (targetType !== "article" && targetType !== "comment") return { error: "Unknown item." };
  if (!/^[0-9a-f-]{36}$/i.test(targetId)) return { error: "Unknown item." };
  if (!(action in ACTIONS) && action !== "dismiss") return { error: "Choose an action." };
  if (reason.length < 3 || reason.length > 500) return { error: "Write a reason (3–500 characters). It's kept in the moderation log." };

  const admin = createAdminClient();
  if (action !== "dismiss") {
    const moderation = ACTIONS[action as keyof typeof ACTIONS];
    if (targetType === "article") {
      const { data: a } = await admin
        .from("articles")
        .update({ moderation, moderation_reason: moderation === "visible" ? null : reason })
        .eq("id", targetId)
        .select("id, short_id, slug")
        .maybeSingle();
      if (!a) return { error: "Article not found." };
      revalidatePath(articlePath(a));
      revalidatePath("/articles");
      revalidatePath("/sitemap.xml");
    } else {
      const { data: c } = await admin.from("article_comments").update({ moderation }).eq("id", targetId).select("article_id").maybeSingle();
      if (!c) return { error: "Comment not found." };
      const { data: a } = await admin.from("articles").select("short_id, slug").eq("id", c.article_id).maybeSingle();
      if (a) revalidatePath(articlePath(a));
    }
  }
  await admin.from("moderation_actions").insert({ actor_id: me.id, target_type: targetType, target_id: targetId, action, reason });
  await admin
    .from("content_reports")
    .update({ status: action === "dismiss" || action === "restore" ? "dismissed" : "actioned", resolved_by: me.id, resolved_at: new Date().toISOString() })
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("status", "open");
  await logAudit(me.id, `moderation.${action}`, targetType, targetId, { reason });
  revalidatePath("/admin/moderation");
  return { ok: action === "dismiss" ? "Reports dismissed." : `Marked ${ACTIONS[action as keyof typeof ACTIONS]}.` };
}

/** Stops an account posting articles, comments and reports (reading still works). */
export async function restrictAccount(_prev: ModState, fd: FormData): Promise<ModState> {
  const me = await requireRole(["admin"]);
  const userId = String(fd.get("user_id"));
  const reason = String(fd.get("reason") ?? "").trim();
  const days = Number(fd.get("days") || 0);
  const lift = fd.get("lift") === "1";
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { error: "Unknown account." };
  if (userId === me.id) return { error: "You can't restrict your own account." };
  if (reason.length < 3 || reason.length > 500) return { error: "Write a reason (3–500 characters)." };
  const admin = createAdminClient();
  if (lift) {
    await admin.from("account_restrictions").delete().eq("user_id", userId);
  } else {
    if (!Number.isInteger(days) || days < 0 || days > 365) return { error: "Days must be 0 (until lifted) to 365." };
    const until = days ? new Date(Date.now() + days * 86400_000).toISOString() : null;
    await admin.from("account_restrictions").upsert({ user_id: userId, reason, until, created_by: me.id }, { onConflict: "user_id" });
  }
  await admin.from("moderation_actions").insert({ actor_id: me.id, target_type: "user", target_id: userId, action: lift ? "unrestrict" : "restrict", reason });
  await logAudit(me.id, lift ? "moderation.unrestrict" : "moderation.restrict", "profile", userId, { reason, days });
  revalidatePath("/admin/moderation");
  return { ok: lift ? "Restriction lifted." : "Account restricted." };
}
