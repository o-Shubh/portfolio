"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean } | undefined;

function readProfileFields(formData: FormData) {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();

  if (full_name.length < 2) return { error: "Please enter your full name." } as const;
  if (!city) return { error: "Please enter your city." } as const;
  if (city.length > 80) return { error: "City name is too long." } as const;
  if (!state || state.length > 80) return { error: "Please enter your state or region." } as const;
  if (pincode && !/^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/.test(pincode)) return { error: "Please check your postal code." } as const;
  // UPI is only on the form for authors; leave it unchanged when the field isn't there
  const upiField = formData.get("payout_upi");
  const payout_upi = upiField === null ? undefined : String(upiField).trim();
  if (payout_upi && !/^[\w.-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/.test(payout_upi))
    return { error: "UPI ID should look like name@bank." } as const;
  return {
    values: {
      full_name,
      city,
      state,
      pincode: pincode || null,
      ...(payout_upi !== undefined ? { payout_upi: payout_upi || null } : {}),
    },
  } as const;
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
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

/** Edit name, city etc. later from the profile page. */
export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const parsed = readProfileFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  // Bio is only on the form for authors; leave it unchanged when the field isn't there
  const bioField = formData.get("bio");
  const bio = bioField === null || !["author", "admin"].includes(profile.role) ? undefined : String(bioField).trim();
  if (bio && bio.length > 600) return { error: "Keep your bio under 600 characters." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...parsed.values, ...(bio !== undefined ? { bio: bio || null } : {}) })
    .eq("id", profile.id);
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
