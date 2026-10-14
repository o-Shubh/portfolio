"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { INDIAN_STATES } from "@/lib/india";
import { cleanIndianMobile } from "@/lib/phone";
import {
  printCost,
  RATE_FIELDS,
  validateFees,
  validateRates,
  validateShipping,
  type Fees,
  type PrintRates,
  type Shipping,
} from "@/lib/pricing";
import { getPricingSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: string } | undefined;
const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Every admin action starts here: must be logged in as admin. RLS gives admins full access. */
async function admin() {
  const profile = await requireRole(["admin"]);
  return { profile, supabase: await createClient() };
}

// ---------------------------------------------------------------------------
// Review queue
// ---------------------------------------------------------------------------

export async function approveBook(bookId: string): Promise<ActionState> {
  const { profile, supabase } = await admin();
  const { data: book } = await supabase.from("books").select("*").eq("id", bookId).single();
  if (!book) return { error: "Book not found." };
  if (book.status !== "in_review") return { error: "Only books waiting for review can be approved." };

  const { rates } = await getPricingSettings();
  const cost = book.page_count
    ? printCost(
        {
          page_count: book.page_count,
          trim_size: book.trim_size,
          binding: book.binding,
          interior: book.interior,
          paper: book.paper,
          cover_finish: book.cover_finish,
        },
        rates,
      )
    : null;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("books")
    .update({
      status: "published",
      published_at: book.published_at ?? now,
      reviewed_at: now,
      reviewed_by: profile.id,
      review_note: null,
      ...(cost !== null ? { print_cost: cost } : {}),
    })
    .eq("id", bookId);
  if (error) return { error: "Could not approve. Please try again." };

  revalidatePath("/", "layout");
  return { ok: "Approved. The book is now live in the bookstore." };
}

export async function sendBack(bookId: string, note: string): Promise<ActionState> {
  const { profile, supabase } = await admin();
  const clean = note.trim();
  if (clean.length < 10) return { error: "Please write a clear note for the author (at least 10 characters)." };
  if (clean.length > 2000) return { error: "Note is too long." };

  const { data: book } = await supabase.from("books").select("status").eq("id", bookId).single();
  if (!book) return { error: "Book not found." };
  if (book.status !== "in_review") return { error: "Only books waiting for review can be sent back." };

  const { error } = await supabase
    .from("books")
    .update({
      status: "changes_requested",
      review_note: clean,
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.id,
    })
    .eq("id", bookId);
  if (error) return { error: "Could not send back. Please try again." };

  revalidatePath("/admin", "layout");
  revalidatePath("/author", "layout");
  return { ok: "Sent back to the author with your note." };
}

export async function adminUnpublish(bookId: string, note: string): Promise<ActionState> {
  const { profile, supabase } = await admin();
  const { data: book } = await supabase.from("books").select("status").eq("id", bookId).single();
  if (!book || book.status !== "published") return { error: "This book is not live." };

  const { error } = await supabase
    .from("books")
    .update({
      status: "unpublished",
      review_note: note.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.id,
    })
    .eq("id", bookId);
  if (error) return { error: "Could not unpublish. Please try again." };

  revalidatePath("/", "layout");
  return { ok: "Unpublished. It is hidden from the bookstore." };
}

// ---------------------------------------------------------------------------
// Printers
// ---------------------------------------------------------------------------

export async function savePrinter(printerId: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await admin();

  const name = text(fd, "name");
  const contact_name = text(fd, "contact_name");
  const mobile = cleanIndianMobile(text(fd, "phone"));
  const city = text(fd, "city");
  const state = text(fd, "state");
  const pincode = text(fd, "pincode");
  const address = text(fd, "address");
  const active = fd.get("active") === "on";

  if (name.length < 2) return { error: "Please enter the print shop's name." };
  if (!mobile) return { error: "Enter a valid 10-digit mobile number. The printer logs in with it." };
  if (!city) return { error: "Please enter the city." };
  if (!(INDIAN_STATES as readonly string[]).includes(state)) return { error: "Please choose the state." };
  if (pincode && !/^[1-9]\d{5}$/.test(pincode)) return { error: "PIN code should be 6 digits." };

  const phone = `91${mobile}`; // same format Supabase stores
  const row = {
    name,
    contact_name: contact_name || null,
    phone,
    city,
    state,
    pincode: pincode || null,
    address: address || null,
    active,
  };

  // If the phone number changes, the old login is no longer this printer's.
  if (printerId) {
    const { data: old } = await supabase.from("printers").select("phone").eq("id", printerId).single();
    if (old && old.phone !== phone) Object.assign(row, { user_id: null });
  }

  const result = printerId
    ? await supabase.from("printers").update(row).eq("id", printerId).select("id").single()
    : await supabase.from("printers").insert(row).select("id").single();
  if (result.error) {
    return {
      error: result.error.code === "23505" ? "Another printer already uses this phone number." : "Could not save. Please try again.",
    };
  }

  // Give this phone number the printer role: now if they already have an account,
  // otherwise automatically when they first log in.
  await supabase.from("role_invites").upsert({ phone, role: "printer", note: `Printer: ${name}` });
  let notice = "";
  const { data: person } = await supabase.from("profiles").select("id, role").eq("phone", phone).maybeSingle();
  if (person) {
    if (person.role === "reader" || person.role === "printer") {
      if (person.role === "reader") await supabase.from("profiles").update({ role: "printer" }).eq("id", person.id);
      await supabase.from("printers").update({ user_id: person.id }).eq("id", result.data.id);
    } else {
      notice = ` This number belongs to an ${person.role} account, so its role was not changed and it is not linked.`;
    }
  }

  revalidatePath("/admin/printers", "layout");
  if (!printerId) redirect(`/admin/printers?added=1`);
  return { ok: `Saved.${notice}` };
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

export async function recordPayout(authorId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { profile, supabase } = await admin();
  const amount = Math.round(Number(fd.get("amount")) * 100) / 100;
  const reference = text(fd, "reference");
  const note = text(fd, "note");

  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount above ₹0." };
  if (reference.length < 4) return { error: "Enter the UPI / bank transaction reference (UTR)." };

  // Check against the current balance, not the number shown when the page loaded
  const { data: bal } = await supabase.from("author_balances").select("balance").eq("author_id", authorId).single();
  if (!bal) return { error: "Author not found." };
  if (amount > Number(bal.balance)) return { error: `That's more than the balance of ₹${bal.balance}.` };

  const { error } = await supabase.from("payouts").insert({
    author_id: authorId,
    amount,
    status: "paid",
    reference,
    note: note || null,
    paid_at: new Date().toISOString(),
    created_by: profile.id,
  });
  if (error) return { error: "Could not record the payout. Please try again." };

  revalidatePath("/admin/payouts");
  return { ok: "Payout recorded." };
}

// ---------------------------------------------------------------------------
// Settings (print rates, fees, shipping)
// ---------------------------------------------------------------------------

async function saveSetting(key: string, value: unknown, adminId: string) {
  const supabase = await createClient();
  return supabase
    .from("settings")
    .update({ value: value as NonNullable<Json>, updated_by: adminId })
    .eq("key", key);
}

const n = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? NaN : Number(v);
};

/** The simple form: change numbers and labels of existing options, fees and shipping. */
export async function saveSettingsForm(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { profile } = await admin();
  const current = await getPricingSettings();

  const rates: PrintRates = structuredClone(current.rates);
  rates.is_sample = fd.get("is_sample") === "on";
  rates.min_pages = n(fd, "min_pages");
  rates.max_pages = n(fd, "max_pages");
  rates.cover_bleed_in = n(fd, "cover_bleed_in");
  for (const [group, fields] of Object.entries(RATE_FIELDS) as [keyof typeof RATE_FIELDS, readonly string[]][]) {
    for (const [key, opt] of Object.entries(rates[group]) as [string, Record<string, unknown>][]) {
      const label = text(fd, `${group}|${key}|label`);
      if (label) opt.label = label;
      for (const f of fields) opt[f] = n(fd, `${group}|${key}|${f}`);
    }
  }
  const fees: Fees = {
    platform_fee_per_copy: n(fd, "platform_fee_per_copy"),
    gateway_percent: n(fd, "gateway_percent"),
    gateway_gst_percent: n(fd, "gateway_gst_percent"),
  };
  const shipping: Shipping = { flat: n(fd, "shipping_flat"), free_above: n(fd, "shipping_free_above") };

  const errors = [...validateRates(rates), ...validateFees(fees), ...validateShipping(shipping)];
  if (errors.length) return { error: errors.slice(0, 5).join(" ") };

  for (const [key, value] of [["print_rates", rates], ["fees", fees], ["shipping", shipping]] as const) {
    const { error } = await saveSetting(key, value, profile.id);
    if (error) return { error: `Could not save ${key}.` };
  }
  revalidatePath("/", "layout");
  return { ok: "Saved. New prices apply from now; past orders keep their prices." };
}

/** Advanced: replace the whole print_rates JSON (to add or remove options). */
export async function saveRatesJson(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { profile } = await admin();
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(fd.get("json") ?? ""));
  } catch {
    return { error: "That isn't valid JSON. Check for a missing comma or quote." };
  }
  const errors = validateRates(parsed);
  if (errors.length) return { error: errors.slice(0, 5).join(" ") };

  const { error } = await saveSetting("print_rates", parsed, profile.id);
  if (error) return { error: "Could not save." };
  revalidatePath("/", "layout");
  return { ok: "Print rates saved." };
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/** Send an order to a different printer (only before it has been printed). */
export async function reassignOrder(orderId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await admin();
  const printerId = String(fd.get("printer_id") ?? "");
  const { data: order } = await supabase.from("orders").select("status").eq("id", orderId).single();
  if (!order) return { error: "Order not found." };
  if (!["paid", "printing"].includes(order.status)) return { error: "Only orders not yet printed can be moved." };
  const { data: printer } = await supabase.from("printers").select("id, active").eq("id", printerId).maybeSingle();
  if (!printer?.active) return { error: "Choose an active printer." };

  const { error } = await supabase
    .from("orders")
    .update({ printer_id: printerId, status: "paid", accepted_at: null })
    .eq("id", orderId);
  if (error) return { error: "Could not move the order." };
  revalidatePath("/admin/orders");
  revalidatePath("/printer", "layout");
  return { ok: "Moved. The new printer sees it under New." };
}
