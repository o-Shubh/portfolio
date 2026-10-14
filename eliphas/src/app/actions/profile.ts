"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { INDIAN_STATES } from "@/lib/india";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean } | undefined;

function readProfileFields(formData: FormData) {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();

  if (full_name.length < 2) return { error: "Please enter your full name." } as const;
  if (!city) return { error: "Please enter your city." } as const;
  if (!(INDIAN_STATES as readonly string[]).includes(state)) return { error: "Please choose your state." } as const;
  if (pincode && !/^[1-9]\d{5}$/.test(pincode)) return { error: "PIN code should be 6 digits." } as const;
  return { values: { full_name, city, state, pincode: pincode || null } } as const;
}

/** First-time setup after the first login. */
export async function completeOnboarding(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const parsed = readProfileFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const wantsToPublish = formData.get("publish") === "on";
  const update = {
    ...parsed.values,
    // Readers can upgrade themselves to author. Other roles are set by an admin.
    ...(wantsToPublish && profile.role === "reader" ? { role: "author" as const } : {}),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(update).eq("id", profile.id);
  if (error) return { error: "Could not save. Please try again." };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Edit name, city etc. later from the profile page. */
export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const parsed = readProfileFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.values).eq("id", profile.id);
  if (error) return { error: "Could not save. Please try again." };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** "Start publishing" button for readers. */
export async function becomeAuthor() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "reader") {
    const supabase = await createClient();
    await supabase.from("profiles").update({ role: "author" }).eq("id", profile.id);
    revalidatePath("/", "layout");
  }
  redirect("/author");
}
