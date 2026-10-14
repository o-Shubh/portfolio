-- Default settings. These are SAMPLE print rates until real printer rates arrive.
-- Change them any time in Supabase: Table Editor -> settings -> edit the "value" JSON
-- (or from the admin screens in Milestone 4). No code change or redeploy needed.
--
-- Print cost per copy =
--     binding.base + cover_finish.extra
--   + page_count * (interior.per_page + paper.per_page_extra) * trim_size.page_multiplier
--   rounded up to the next rupee.
--
-- Author earning per copy =
--     MRP - print cost - fees.platform_fee_per_copy
--   - payment charges (MRP * gateway_percent% plus gateway_gst_percent% GST on that charge)

insert into public.settings (key, value, description) values
(
  'print_rates',
  '{
    "is_sample": true,
    "min_pages": 24,
    "max_pages": 800,
    "trim_sizes": {
      "5x8":     { "label": "5 × 8 in (novel)",           "page_multiplier": 1.00 },
      "5.5x8.5": { "label": "5.5 × 8.5 in (digest)",      "page_multiplier": 1.05 },
      "a5":      { "label": "A5 (148 × 210 mm)",           "page_multiplier": 1.05 },
      "6x9":     { "label": "6 × 9 in (non-fiction)",      "page_multiplier": 1.15 },
      "8.5x11":  { "label": "8.5 × 11 in (workbook)",      "page_multiplier": 1.90 }
    },
    "interior": {
      "bw":    { "label": "Black & white", "per_page": 0.45 },
      "color": { "label": "Full colour",   "per_page": 2.80 }
    },
    "paper": {
      "cream": { "label": "Cream 70 GSM", "per_page_extra": 0.00 },
      "white": { "label": "White 80 GSM", "per_page_extra": 0.05 }
    },
    "binding": {
      "paperback": { "label": "Paperback", "base": 30 },
      "hardcover": { "label": "Hardcover", "base": 140 }
    },
    "cover_finish": {
      "matte": { "label": "Matte", "extra": 0 },
      "gloss": { "label": "Gloss", "extra": 0 }
    }
  }'::jsonb,
  'Per-copy print rates (SAMPLE values). Used by the earnings calculator and checkout.'
),
(
  'fees',
  '{
    "platform_fee_per_copy": 15,
    "gateway_percent": 2,
    "gateway_gst_percent": 18
  }'::jsonb,
  'Platform fee per copy (Rs) and Razorpay charges (% of MRP, plus GST on the charge).'
),
(
  'shipping',
  '{
    "flat": 60,
    "free_above": 499
  }'::jsonb,
  'Shipping charged to readers (Rs). Free when the order subtotal is at or above free_above.'
)
on conflict (key) do nothing;
