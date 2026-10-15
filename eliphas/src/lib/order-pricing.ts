import "server-only";
import { estimateCopy, splitOrder, toRupees, type OrderLineInput, type OrderSplit } from "@/lib/commission";
import type { PlanVersion } from "@/lib/plans";
import { authorRule } from "@/lib/plans";
import { gatewayPercent, printCost, type PricingSettings } from "@/lib/pricing";
import type { Book } from "@/lib/publishing";
import { bookWeightGrams, parcelWeightGrams, quoteShipping, type ParcelSettings, type ShippingQuote } from "@/lib/shipping";
import { createAdminClient } from "@/lib/supabase/admin";

export const MAX_QTY = 10;

/** Loads the admin-managed shipping tables and parcel settings. */
export async function loadShippingConfig() {
  const admin = createAdminClient();
  const [zones, rates, promos, parcel] = await Promise.all([
    admin.from("shipping_zones").select("*"),
    admin.from("shipping_rates").select("*"),
    admin.from("shipping_promotions").select("*"),
    admin.from("settings").select("value").eq("key", "parcel").maybeSingle(),
  ]);
  return {
    zones: zones.data ?? [],
    rates: rates.data ?? [],
    promotions: (promos.data ?? []) as Parameters<typeof quoteShipping>[0]["promotions"],
    parcel: (parcel.data?.value ?? { paper_gsm: 70, cover_grams: { paperback: 20, hardcover: 160 }, packaging_grams: 60 }) as unknown as ParcelSettings,
  };
}

function bookPrintCost(book: Book, s: PricingSettings) {
  if (!book.page_count) return null;
  return printCost(
    {
      page_count: book.page_count,
      trim_size: book.trim_size,
      binding: book.binding,
      interior: book.interior,
      paper: book.paper,
      cover_finish: book.cover_finish,
    },
    s.rates,
  );
}

/** Can this book be bought right now at today's rates without the author losing money? */
export async function canSell(book: Book, s: PricingSettings) {
  if (book.status !== "published" || book.mrp === null) return false;
  const cost = bookPrintCost(book, s);
  if (cost === null) return false;
  const { rule } = await authorRule(book.author_id);
  return estimateCopy(Number(book.mrp) * 100, cost * 100, rule, gatewayPercent(s.fees)).authorEarningPaise >= 100;
}

export type PricedOrder = {
  split: OrderSplit;
  shipping: Extract<ShippingQuote, { serviceable: true }>;
  versions: Record<string, PlanVersion>; // per book id
  books: Record<string, Book>;
};

/**
 * Prices an order on the server from the database: print costs, each author's commission rule
 * at this moment, shipping for the PIN code, and an estimated gateway fee (replaced by the actual
 * fee when the payment is confirmed). All lines ship together from one printer.
 */
export async function priceOrder(
  items: { book: Book; quantity: number }[],
  pincode: string,
  s: PricingSettings,
): Promise<PricedOrder | { error: string }> {
  if (!items.length) return { error: "Your order is empty." };
  const inputs: OrderLineInput[] = [];
  const versions: Record<string, PlanVersion> = {};
  const books: Record<string, Book> = {};
  const weights: { grams: number; quantity: number }[] = [];
  const config = await loadShippingConfig();

  for (const { book, quantity } of items) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) return { error: `Quantity must be between 1 and ${MAX_QTY}.` };
    if (book.status !== "published" || book.mrp === null || !book.page_count) return { error: `"${book.title}" can't be ordered right now.` };
    const cost = bookPrintCost(book, s);
    const trim = s.rates.trim_sizes[book.trim_size];
    if (cost === null || !trim?.width_in || !trim.height_in) return { error: `"${book.title}" can't be ordered right now.` };
    const { rule, version } = await authorRule(book.author_id);
    const pricePaise = Number(book.mrp) * 100;
    // Never sell a copy that would leave the author with nothing
    if (estimateCopy(pricePaise, cost * 100, rule, gatewayPercent(s.fees)).authorEarningPaise < 100) {
      return { error: `"${book.title}" can't be ordered right now. Please try again later.` };
    }
    inputs.push({ key: book.id, authorId: book.author_id, unitPricePaise: pricePaise, quantity, printCostPaise: cost * 100, rule });
    versions[book.id] = version;
    books[book.id] = book;
    weights.push({
      grams: bookWeightGrams({ page_count: book.page_count, width_in: trim.width_in, height_in: trim.height_in, binding: book.binding }, config.parcel),
      quantity,
    });
  }

  const booksPaise = inputs.reduce((a, l) => a + l.unitPricePaise * l.quantity, 0);
  const quote = quoteShipping({
    pincode,
    weightG: parcelWeightGrams(weights, config.parcel),
    booksPaise,
    zones: config.zones,
    rates: config.rates,
    promotions: config.promotions,
  });
  if (!quote.serviceable) return { error: quote.reason };

  const split = splitOrder(inputs, quote.chargePaise, { percent: gatewayPercent(s.fees) });
  return { split, shipping: quote, versions, books };
}

/** order_items rows for a priced order (line totals in rupees, plus the old per-copy columns). */
export function orderItemRows(orderId: string, p: PricedOrder) {
  return p.split.lines.map((l) => {
    const v = p.versions[l.key];
    const b = p.books[l.key];
    return {
      order_id: orderId,
      book_id: l.key,
      author_id: l.authorId,
      quantity: l.quantity,
      unit_price: toRupees(l.unitPricePaise),
      // Per-copy columns kept for older screens; totals below are the source of truth
      print_cost: toRupees(l.printCostPaise),
      platform_fee: toRupees(Math.round(l.commissionPaise / l.quantity)),
      payment_fee: toRupees(Math.round(l.gatewayPaise / l.quantity)),
      author_earning: toRupees(Math.round(l.authorEarningPaise / l.quantity)),
      print_cost_total: toRupees(l.printCostTotalPaise),
      commission: toRupees(l.commissionPaise),
      commission_gst: toRupees(l.commissionGstPaise),
      gateway_allocated: toRupees(l.gatewayPaise),
      author_earning_total: toRupees(l.authorEarningPaise),
      author_plan: v.plan,
      commission_rule: {
        plan: v.plan,
        plan_version_id: v.id,
        version: v.version,
        percent: Number(v.commission_percent),
        min_paise: v.commission_min_paise,
        gst_percent: Number(v.commission_gst_percent),
      },
      sale_channel: "store",
      file_snapshot: { manuscript_path: b.manuscript_path, print_cover_path: b.print_cover_path, cover_path: b.cover_path, book_updated_at: b.updated_at },
    };
  });
}

/**
 * Re-allocates the actual Razorpay fee (when we know it) across the order's lines and shipping.
 * Commission and print cost don't change; only the gateway share and the author's earning do.
 */
export async function applyActualGatewayFee(orderId: string, feePaise: number) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, shipping, order_items(id, book_id, author_id, quantity, unit_price, print_cost_total, print_cost, commission, commission_gst, commission_rule, platform_discount)")
    .eq("id", orderId)
    .single();
  if (!order || !order.order_items.length || order.order_items.some((i) => i.commission === null)) return; // older orders
  const inputs: OrderLineInput[] = order.order_items.map((i) => {
    const r = i.commission_rule as { plan: OrderLineInput["rule"]["plan"]; percent: number; min_paise: number; gst_percent: number };
    return {
      key: i.id,
      authorId: i.author_id,
      unitPricePaise: Math.round(Number(i.unit_price) * 100),
      quantity: i.quantity,
      printCostPaise: Math.round(Number(i.print_cost) * 100),
      rule: { plan: r.plan, percent: Number(r.percent), minPaise: r.min_paise, gstPercent: Number(r.gst_percent) },
      platformDiscountPaise: Math.round(Number(i.platform_discount) * 100),
    };
  });
  const split = splitOrder(inputs, Math.round(Number(order.shipping) * 100), { actualPaise: feePaise });
  for (const l of split.lines) {
    await admin
      .from("order_items")
      .update({
        gateway_allocated: toRupees(l.gatewayPaise),
        author_earning_total: toRupees(l.authorEarningPaise),
        payment_fee: toRupees(Math.round(l.gatewayPaise / l.quantity)),
        author_earning: toRupees(Math.round(l.authorEarningPaise / l.quantity)),
      })
      .eq("id", l.key);
  }
  await admin.from("orders").update({ gateway_fee: toRupees(feePaise), gateway_fee_source: "actual" }).eq("id", orderId);
}
