-- Invoices and credit notes.
-- Every paid book order and every paid Pro or service payment gets an invoice, issued by the database in the same
-- transaction that marks it paid, so no payment path can miss one. Every processed refund gets a credit note.
-- Numbers run without gaps per series and financial year (April to March, India time), e.g. EIP/26-27/00001.
-- Test payments use their own series (TST, TCN) so they never use up real numbers. Until an admin turns on
-- "Payments are live" (Admin → Invoices) every invoice is a test document: Razorpay test-mode payments look real.
-- Invoices never change once issued: a refund or correction is a credit note pointing to the invoice.
-- The document is titled "Tax invoice" only when GST registration is on and a GSTIN is set (Admin → Plans and
-- Settings); a GST-registered seller's exempt sale (e.g. printed books) is a "Bill of supply"; otherwise "Invoice".
-- Tax rates and HSN/SAC codes are settings for the business's accountant to confirm.

-- ---------------------------------------------------------------------------
-- 1. Settings
-- ---------------------------------------------------------------------------
insert into public.settings (key, value, description) values (
  'invoicing',
  '{"live_payments": false, "seller_state": "", "book_hsn": "4901", "book_gst_percent": 0, "shipping_gst_percent": 0,
    "service_sac": "", "subscription_sac": "", "footer_note": ""}'::jsonb,
  'Invoices: whether payments are live (until then invoices are test documents), the seller''s state (used when no GSTIN is set), HSN/SAC codes, GST on books and shipping (included in the price), and a note printed on every invoice. Confirm with your accountant.'
) on conflict (key) do nothing;

-- Buyers who buy as a GST-registered business can add their GSTIN (shown on their invoices)
alter table public.profiles
  add column gstin text check (gstin ~ '^[0-9]{2}[0-9A-Z]{13}$');

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
create table public.invoice_counters (
  series         text not null,
  financial_year text not null,
  last_number    integer not null,
  primary key (series, financial_year)
);
alter table public.invoice_counters enable row level security;
revoke all on public.invoice_counters from anon, authenticated;

create table public.invoices (
  id                  uuid primary key default gen_random_uuid(),
  number              text not null unique,                       -- at most 16 characters (GST rule)
  kind                text not null check (kind in ('invoice', 'credit_note')),
  title               text not null check (title in ('Tax invoice', 'Bill of supply', 'Invoice', 'Credit note')),
  is_test             boolean not null default false,
  financial_year      text not null,
  issued_at           timestamptz not null default now(),
  order_id            uuid references public.orders (id),
  payment_id          uuid references public.payments (id),
  payment_refund_id   uuid unique references public.payment_refunds (id),
  original_invoice_id uuid references public.invoices (id),
  buyer_id            uuid references public.profiles (id) on delete set null,
  buyer               jsonb not null,    -- name, address, city, state, pincode, gstin, email
  seller              jsonb not null,    -- legal_name, address, gstin, state, state_code, email, phone
  gst_registered      boolean not null,
  place_of_supply     text,
  inter_state         boolean not null default false,
  lines               jsonb not null,    -- description, code, quantity, unit_paise, discount_paise, taxable_paise, rate, cgst/sgst/igst_paise, total_paise
  taxable_paise       integer not null,
  cgst_paise          integer not null default 0,
  sgst_paise          integer not null default 0,
  igst_paise          integer not null default 0,
  total_paise         integer not null check (total_paise > 0),
  credit_paise        integer not null default 0,   -- paid with (or returned to) Eliphas credit
  paid_paise          integer not null default 0,   -- paid (or refunded) online
  payment_reference   text,
  reason              text,
  footer_note         text,
  created_at          timestamptz not null default now(),
  check (total_paise = taxable_paise + cgst_paise + sgst_paise + igst_paise),
  check (total_paise = credit_paise + paid_paise),
  check (num_nonnulls(order_id, payment_id) = 1),
  check ((kind = 'credit_note') = (original_invoice_id is not null)),
  check ((kind = 'credit_note') = (title = 'Credit note'))
);
create unique index invoices_one_per_order on public.invoices (order_id) where kind = 'invoice';
create unique index invoices_one_per_payment on public.invoices (payment_id) where kind = 'invoice';
create unique index invoices_one_credit_note_per_order on public.invoices (order_id) where kind = 'credit_note';
create index invoices_buyer_idx on public.invoices (buyer_id, issued_at desc);
create index invoices_issued_idx on public.invoices (issued_at desc);

alter table public.invoices enable row level security;
revoke all on public.invoices from anon, authenticated;
grant select on public.invoices to authenticated;
create policy "invoices: buyer reads own" on public.invoices for select to authenticated using (buyer_id = auth.uid());
create policy "invoices: admin reads" on public.invoices for select to authenticated using (public.is_admin());

-- Issued documents are final
create function public.invoices_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'Invoices and credit notes cannot be changed or deleted. Issue a credit note instead.';
end $$;
create trigger invoices_immutable before update or delete on public.invoices
  for each row execute function public.invoices_immutable();

-- Something went wrong while issuing (the payment itself is never held up): shown in Admin → Invoices to retry
create table public.invoice_failures (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references public.orders (id) on delete cascade,
  payment_id  uuid references public.payments (id) on delete cascade,
  refund_id   uuid references public.payment_refunds (id) on delete cascade,
  kind        text not null check (kind in ('invoice', 'credit_note')),
  error       text not null,
  created_at  timestamptz not null default now()
);
alter table public.invoice_failures enable row level security;
revoke all on public.invoice_failures from anon, authenticated;
grant select on public.invoice_failures to authenticated;
create policy "invoice failures: admin reads" on public.invoice_failures for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------------
-- GST state codes (first two digits of a GSTIN)
create function public.gst_state_name(p_code text) returns text language sql immutable as $$
  select case p_code
    when '01' then 'Jammu and Kashmir' when '02' then 'Himachal Pradesh' when '03' then 'Punjab' when '04' then 'Chandigarh'
    when '05' then 'Uttarakhand' when '06' then 'Haryana' when '07' then 'Delhi' when '08' then 'Rajasthan'
    when '09' then 'Uttar Pradesh' when '10' then 'Bihar' when '11' then 'Sikkim' when '12' then 'Arunachal Pradesh'
    when '13' then 'Nagaland' when '14' then 'Manipur' when '15' then 'Mizoram' when '16' then 'Tripura'
    when '17' then 'Meghalaya' when '18' then 'Assam' when '19' then 'West Bengal' when '20' then 'Jharkhand'
    when '21' then 'Odisha' when '22' then 'Chhattisgarh' when '23' then 'Madhya Pradesh' when '24' then 'Gujarat'
    when '25' then 'Dadra and Nagar Haveli and Daman and Diu' when '26' then 'Dadra and Nagar Haveli and Daman and Diu'
    when '27' then 'Maharashtra' when '29' then 'Karnataka' when '30' then 'Goa' when '31' then 'Lakshadweep'
    when '32' then 'Kerala' when '33' then 'Tamil Nadu' when '34' then 'Puducherry' when '35' then 'Andaman and Nicobar Islands'
    when '36' then 'Telangana' when '37' then 'Andhra Pradesh' when '38' then 'Ladakh'
  end
$$;

create function public.gst_state_code(p_state text) returns text language sql immutable as $$
  select case lower(trim(coalesce(p_state, '')))
    when 'jammu and kashmir' then '01' when 'himachal pradesh' then '02' when 'punjab' then '03' when 'chandigarh' then '04'
    when 'uttarakhand' then '05' when 'haryana' then '06' when 'delhi' then '07' when 'rajasthan' then '08'
    when 'uttar pradesh' then '09' when 'bihar' then '10' when 'sikkim' then '11' when 'arunachal pradesh' then '12'
    when 'nagaland' then '13' when 'manipur' then '14' when 'mizoram' then '15' when 'tripura' then '16'
    when 'meghalaya' then '17' when 'assam' then '18' when 'west bengal' then '19' when 'jharkhand' then '20'
    when 'odisha' then '21' when 'chhattisgarh' then '22' when 'madhya pradesh' then '23' when 'gujarat' then '24'
    when 'dadra and nagar haveli and daman and diu' then '26' when 'maharashtra' then '27' when 'karnataka' then '29'
    when 'goa' then '30' when 'lakshadweep' then '31' when 'kerala' then '32' when 'tamil nadu' then '33'
    when 'puducherry' then '34' when 'andaman and nicobar islands' then '35' when 'telangana' then '36'
    when 'andhra pradesh' then '37' when 'ladakh' then '38'
  end
$$;

-- Financial year in India time, e.g. 2026-10-27 → '26-27', 2027-02-01 → '26-27'
create function public.financial_year(p_at timestamptz) returns text language sql immutable as $$
  select to_char(make_date(y, 1, 1), 'YY') || '-' || to_char(make_date(y + 1, 1, 1), 'YY')
    from (select case when extract(month from (p_at at time zone 'Asia/Kolkata')) >= 4
                      then extract(year from (p_at at time zone 'Asia/Kolkata'))::int
                      else extract(year from (p_at at time zone 'Asia/Kolkata'))::int - 1 end as y) s
$$;

-- The next number in a series. The counter row is locked until the transaction ends, so numbers never repeat,
-- and a transaction that fails gives its number back (no gaps).
create function public.next_invoice_number(p_series text, p_at timestamptz) returns text
language plpgsql security definer set search_path = public as $$
declare
  fy text := public.financial_year(p_at);
  n integer;
begin
  insert into public.invoice_counters (series, financial_year, last_number) values (p_series, fy, 1)
  on conflict (series, financial_year) do update set last_number = invoice_counters.last_number + 1
  returning last_number into n;
  return p_series || '/' || fy || '/' || lpad(n::text, 5, '0');
end $$;

-- Test document unless the payment is a mock one... or payments aren't switched to live yet
create function public.invoice_is_test(p_mode text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(p_mode = 'mock', false)
      or not coalesce((select (value ->> 'live_payments')::boolean from public.settings where key = 'invoicing'), false)
$$;

-- The seller as printed on the invoice, and whether GST registration is on
create function public.invoice_seller() returns jsonb language sql stable security definer set search_path = public as $$
  with b as (select coalesce((select value from public.settings where key = 'business'), '{}'::jsonb) as v),
       i as (select coalesce((select value from public.settings where key = 'invoicing'), '{}'::jsonb) as v),
       t as (select coalesce((select value from public.settings where key = 'tax'), '{}'::jsonb) as v),
       s as (
         select b.v, i.v as inv, t.v as tax, upper(nullif(trim(b.v ->> 'gstin'), '')) as gstin from b, i, t
       )
  select jsonb_build_object(
    'legal_name', coalesce(nullif(trim(v ->> 'legal_name'), ''), 'Eliphas Indicus Publications'),
    'address', coalesce(v ->> 'address', ''),
    'email', coalesce(v ->> 'email', ''),
    'phone', coalesce(v ->> 'phone', ''),
    'gstin', gstin,
    -- The GSTIN's state wins; otherwise the state set in Admin → Invoices
    'state', coalesce(public.gst_state_name(left(gstin, 2)), nullif(trim(inv ->> 'seller_state'), '')),
    'state_code', coalesce(left(gstin, 2), public.gst_state_code(inv ->> 'seller_state')),
    'registered', coalesce((tax ->> 'gst_registered')::boolean, false) and gstin is not null,
    'footer_note', nullif(trim(inv ->> 'footer_note'), '')
  ) from s
$$;

-- One invoice line. Prices include GST (books, shipping): the taxable value is worked back from the price.
-- p_tax_paise, when given, is the GST already charged on top (services, Pro) and p_gross is the price before it.
create function public.invoice_line(
  p_description text, p_code text, p_quantity integer, p_unit_paise integer, p_discount_paise integer,
  p_rate numeric, p_inter boolean, p_tax_paise integer default null
) returns jsonb language plpgsql immutable as $$
declare
  gross integer := p_unit_paise * p_quantity - p_discount_paise;
  taxable integer;
  tax integer;
  half integer;
begin
  if p_tax_paise is null then
    taxable := round(gross * 100.0 / (100 + coalesce(p_rate, 0)));
    tax := gross - taxable;
  else
    taxable := gross;
    tax := p_tax_paise;
  end if;
  half := floor(tax / 2.0);
  return jsonb_build_object(
    'description', p_description, 'code', nullif(p_code, ''), 'quantity', p_quantity, 'unit_paise', p_unit_paise,
    'discount_paise', p_discount_paise, 'taxable_paise', taxable, 'rate', coalesce(p_rate, 0),
    'cgst_paise', case when p_inter then 0 else half end,
    'sgst_paise', case when p_inter then 0 else tax - half end,
    'igst_paise', case when p_inter then tax else 0 end,
    'total_paise', taxable + tax
  );
end $$;

create function public.invoice_title(p_registered boolean, p_lines jsonb) returns text language sql immutable as $$
  select case
    when not p_registered then 'Invoice'
    when exists (select 1 from jsonb_array_elements(p_lines) l where (l ->> 'rate')::numeric > 0) then 'Tax invoice'
    else 'Bill of supply'
  end
$$;

-- Inserts an invoice row from its lines (sums the lines; numbers it)
create function public.insert_invoice(
  p_kind text, p_series text, p_at timestamptz, p_is_test boolean, p_order uuid, p_payment uuid, p_refund uuid,
  p_original uuid, p_buyer_id uuid, p_buyer jsonb, p_seller jsonb, p_pos text, p_inter boolean, p_lines jsonb,
  p_credit integer, p_reference text, p_reason text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  taxable integer; cgst integer; sgst integer; igst integer; total integer;
begin
  select coalesce(sum((l ->> 'taxable_paise')::int), 0), coalesce(sum((l ->> 'cgst_paise')::int), 0),
         coalesce(sum((l ->> 'sgst_paise')::int), 0), coalesce(sum((l ->> 'igst_paise')::int), 0)
    into taxable, cgst, sgst, igst
    from jsonb_array_elements(p_lines) l;
  total := taxable + cgst + sgst + igst;
  insert into public.invoices (
    number, kind, title, is_test, financial_year, issued_at, order_id, payment_id, payment_refund_id, original_invoice_id,
    buyer_id, buyer, seller, gst_registered, place_of_supply, inter_state, lines,
    taxable_paise, cgst_paise, sgst_paise, igst_paise, total_paise, credit_paise, paid_paise, payment_reference, reason, footer_note
  ) values (
    public.next_invoice_number(p_series, p_at), p_kind,
    case when p_kind = 'credit_note' then 'Credit note' else public.invoice_title((p_seller ->> 'registered')::boolean, p_lines) end,
    p_is_test, public.financial_year(p_at), p_at, p_order, p_payment, p_refund, p_original,
    p_buyer_id, p_buyer, p_seller - 'footer_note' - 'registered', (p_seller ->> 'registered')::boolean, p_pos, p_inter, p_lines,
    taxable, cgst, sgst, igst, total, least(p_credit, total), total - least(p_credit, total), p_reference, p_reason, p_seller ->> 'footer_note'
  ) returning id into new_id;
  return new_id;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Book orders
-- ---------------------------------------------------------------------------
create function public.issue_order_invoice(p_order uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  existing uuid;
  seller jsonb := public.invoice_seller();
  inv jsonb := coalesce((select value from public.settings where key = 'invoicing'), '{}'::jsonb);
  book_rate numeric := coalesce((inv ->> 'book_gst_percent')::numeric, 0);
  ship_rate numeric := coalesce((inv ->> 'shipping_gst_percent')::numeric, 0);
  inter boolean;
  lines jsonb := '[]'::jsonb;
  discount_left integer;
  books_gross integer;
  item record;
  share integer;
  n integer := 0;
  item_count integer;
  buyer_gstin text;
begin
  select * into o from public.orders where id = p_order;
  if o.id is null or o.paid_at is null or o.replacement_of is not null then return null; end if;
  if round((o.total + o.credit_used) * 100) <= 0 then return null; end if;
  select id into existing from public.invoices where order_id = p_order and kind = 'invoice';
  if existing is not null then return existing; end if;

  inter := coalesce(seller ->> 'state', '') <> '' and lower(seller ->> 'state') <> lower(o.ship_state);
  select gstin into buyer_gstin from public.profiles where id = o.buyer_id;

  -- The invite discount lowers the price (shared across the books by value); Eliphas credit is a way of paying
  discount_left := round(o.referral_discount * 100);
  select coalesce(sum(round(unit_price * 100) * quantity), 0) into books_gross from public.order_items where order_id = p_order;
  select count(*) into item_count from public.order_items where order_id = p_order;
  for item in
    select i.quantity, round(i.unit_price * 100)::int as unit_paise, b.title, b.isbn
      from public.order_items i join public.books b on b.id = i.book_id
     where i.order_id = p_order order by i.created_at, i.id
  loop
    n := n + 1;
    share := case when n = item_count then discount_left
                  when books_gross > 0 then round(round(o.referral_discount * 100) * (item.unit_paise * item.quantity)::numeric / books_gross)
                  else 0 end;
    share := least(share, discount_left);
    discount_left := discount_left - share;
    lines := lines || jsonb_build_array(public.invoice_line(
      item.title || coalesce(' (ISBN ' || item.isbn || ')', ''), inv ->> 'book_hsn', item.quantity, item.unit_paise, share, book_rate, inter));
  end loop;
  if round(o.shipping * 100) > 0 then
    lines := lines || jsonb_build_array(public.invoice_line('Shipping', null, 1, round(o.shipping * 100)::int, 0, ship_rate, inter));
  end if;

  return public.insert_invoice(
    'invoice', case when public.invoice_is_test(o.payment_mode) then 'TST' else 'EIP' end, o.paid_at, public.invoice_is_test(o.payment_mode),
    o.id, null, null, null, o.buyer_id,
    jsonb_build_object('name', o.ship_name, 'address', concat_ws(', ', o.ship_line1, o.ship_line2), 'city', o.ship_city,
                       'state', o.ship_state, 'state_code', public.gst_state_code(o.ship_state), 'pincode', o.ship_pincode,
                       'gstin', buyer_gstin, 'email', o.contact_email, 'order_number', o.order_number),
    seller, o.ship_state, inter, lines, round(o.credit_used * 100)::int,
    coalesce(o.razorpay_payment_id, case when o.total = 0 then 'Paid with Eliphas credit' end), null
  );
end $$;

-- The refund of a book order reverses the whole invoice (the card refund plus the credit returned)
create function public.issue_order_credit_note(p_order uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  orig public.invoices;
  existing uuid;
  reversed jsonb;
begin
  select * into o from public.orders where id = p_order;
  select * into orig from public.invoices where order_id = p_order and kind = 'invoice';
  if o.id is null or orig.id is null then return null; end if;
  select id into existing from public.invoices where order_id = p_order and kind = 'credit_note';
  if existing is not null then return existing; end if;
  reversed := orig.lines;
  return public.insert_invoice(
    'credit_note', case when orig.is_test then 'TCN' else 'ECN' end, coalesce(o.refunded_at, now()), orig.is_test,
    o.id, null, null, orig.id, orig.buyer_id, orig.buyer,
    orig.seller || jsonb_build_object('registered', orig.gst_registered, 'footer_note', orig.footer_note),
    orig.place_of_supply, orig.inter_state, reversed, orig.credit_paise, o.refund_id,
    coalesce(nullif(o.cancel_reason, ''), 'Order refunded')
  );
end $$;

-- ---------------------------------------------------------------------------
-- 5. Pro and service payments
-- ---------------------------------------------------------------------------
create function public.issue_payment_invoice(p_payment uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  p public.payments;
  pr public.profiles;
  existing uuid;
  seller jsonb := public.invoice_seller();
  inv jsonb := coalesce((select value from public.settings where key = 'invoicing'), '{}'::jsonb);
  pos text;
  inter boolean;
begin
  select * into p from public.payments where id = p_payment;
  if p.id is null or p.paid_at is null or p.amount_paise <= 0 then return null; end if;
  select id into existing from public.invoices where payment_id = p_payment and kind = 'invoice';
  if existing is not null then return existing; end if;
  select * into pr from public.profiles where id = p.payer_id;
  -- Place of supply: the buyer's GSTIN state, else their profile state, else the seller's state
  pos := coalesce(public.gst_state_name(left(pr.gstin, 2)), nullif(trim(pr.state), ''), seller ->> 'state');
  inter := coalesce(seller ->> 'state', '') <> '' and pos is not null and lower(seller ->> 'state') <> lower(pos);
  return public.insert_invoice(
    'invoice', case when public.invoice_is_test(p.mode) then 'TST' else 'EIP' end, p.paid_at, public.invoice_is_test(p.mode),
    null, p.id, null, null, p.payer_id,
    jsonb_build_object('name', coalesce(pr.full_name, ''), 'address', '', 'city', coalesce(pr.city, ''), 'state', pos,
                       'state_code', public.gst_state_code(pos), 'pincode', coalesce(pr.pincode, ''), 'gstin', pr.gstin,
                       'email', pr.email),
    seller, pos, inter,
    jsonb_build_array(public.invoice_line(
      p.description, case p.purpose when 'service' then inv ->> 'service_sac' else inv ->> 'subscription_sac' end,
      1, p.base_paise, 0, p.gst_percent, inter, p.gst_paise)),
    0, p.razorpay_payment_id, null
  );
end $$;

-- A refund of a Pro or service payment (full or part): a credit note for that amount, tax in proportion
create function public.issue_payment_credit_note(p_refund uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r public.payment_refunds;
  orig public.invoices;
  existing uuid;
  line jsonb;
  taxable integer;
  tax integer;
  half integer;
begin
  select * into r from public.payment_refunds where id = p_refund;
  if r.id is null or r.status <> 'processed' then return null; end if;
  select id into existing from public.invoices where payment_refund_id = p_refund;
  if existing is not null then return existing; end if;
  select * into orig from public.invoices where payment_id = r.payment_id and kind = 'invoice';
  if orig.id is null then return null; end if;
  taxable := round(orig.taxable_paise * r.amount_paise::numeric / orig.total_paise);
  tax := r.amount_paise - taxable;
  half := floor(tax / 2.0);
  line := (orig.lines -> 0) || jsonb_build_object(
    'unit_paise', taxable, 'quantity', 1, 'discount_paise', 0, 'taxable_paise', taxable,
    'cgst_paise', case when orig.inter_state then 0 else half end,
    'sgst_paise', case when orig.inter_state then 0 else tax - half end,
    'igst_paise', case when orig.inter_state then tax else 0 end,
    'total_paise', r.amount_paise);
  return public.insert_invoice(
    'credit_note', case when orig.is_test then 'TCN' else 'ECN' end, coalesce(r.processed_at, now()), orig.is_test,
    null, r.payment_id, r.id, orig.id, orig.buyer_id, orig.buyer,
    orig.seller || jsonb_build_object('registered', orig.gst_registered, 'footer_note', orig.footer_note),
    orig.place_of_supply, orig.inter_state, jsonb_build_array(line), 0, r.razorpay_refund_id,
    coalesce(nullif(r.reason, ''), 'Payment refunded')
  );
end $$;

-- ---------------------------------------------------------------------------
-- 6. Triggers: issue automatically; a problem is logged, never blocks the payment
-- ---------------------------------------------------------------------------
create function public.log_invoice_failure(p_kind text, p_order uuid, p_payment uuid, p_refund uuid, p_error text) returns void
language sql security definer set search_path = public as $$
  insert into public.invoice_failures (kind, order_id, payment_id, refund_id, error) values (p_kind, p_order, p_payment, p_refund, left(p_error, 1000));
$$;

create function public.orders_issue_invoice() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.paid_at is not null and (tg_op = 'INSERT' or old.paid_at is null) then
    begin
      perform public.issue_order_invoice(new.id);
    exception when others then
      perform public.log_invoice_failure('invoice', new.id, null, null, sqlerrm);
    end;
  end if;
  if tg_op = 'UPDATE'
     and ((new.refund_status = 'processed' and old.refund_status is distinct from 'processed')
          or (new.status = 'cancelled' and old.status <> 'cancelled' and new.total = 0)) then
    begin
      perform public.issue_order_credit_note(new.id);
    exception when others then
      perform public.log_invoice_failure('credit_note', new.id, null, null, sqlerrm);
    end;
  end if;
  return null;
end $$;
create trigger orders_issue_invoice after insert or update of paid_at, refund_status, status on public.orders
  for each row execute function public.orders_issue_invoice();

create function public.payments_issue_invoice() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.paid_at is not null and old.paid_at is null then
    begin
      perform public.issue_payment_invoice(new.id);
    exception when others then
      perform public.log_invoice_failure('invoice', null, new.id, null, sqlerrm);
    end;
  end if;
  return null;
end $$;
create trigger payments_issue_invoice after update of paid_at on public.payments
  for each row execute function public.payments_issue_invoice();

create function public.payment_refunds_issue_credit_note() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'processed' and old.status <> 'processed' then
    begin
      perform public.issue_payment_credit_note(new.id);
    exception when others then
      perform public.log_invoice_failure('credit_note', null, new.payment_id, new.id, sqlerrm);
    end;
  end if;
  return null;
end $$;
create trigger payment_refunds_issue_credit_note after update of status on public.payment_refunds
  for each row execute function public.payment_refunds_issue_credit_note();

-- Only the server (service role) issues documents
revoke execute on function public.next_invoice_number(text, timestamptz) from public, anon, authenticated;
revoke execute on function public.invoice_seller() from public, anon, authenticated;
revoke execute on function public.invoice_is_test(text) from public, anon, authenticated;
revoke execute on function public.insert_invoice(text, text, timestamptz, boolean, uuid, uuid, uuid, uuid, uuid, jsonb, jsonb, text, boolean, jsonb, integer, text, text) from public, anon, authenticated;
revoke execute on function public.issue_order_invoice(uuid) from public, anon, authenticated;
revoke execute on function public.issue_order_credit_note(uuid) from public, anon, authenticated;
revoke execute on function public.issue_payment_invoice(uuid) from public, anon, authenticated;
revoke execute on function public.issue_payment_credit_note(uuid) from public, anon, authenticated;
revoke execute on function public.log_invoice_failure(text, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.issue_order_invoice(uuid) to service_role;
grant execute on function public.issue_order_credit_note(uuid) to service_role;
grant execute on function public.issue_payment_invoice(uuid) to service_role;
grant execute on function public.issue_payment_credit_note(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 7. Past payments and refunds: issue in the order they were paid (as test documents: payments aren't live yet)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select 'order' as src, id, paid_at as at from public.orders where paid_at is not null and replacement_of is null and total + credit_used > 0
    union all
    select 'payment', id, paid_at from public.payments where paid_at is not null
    order by at, id
  loop
    begin
      if r.src = 'order' then perform public.issue_order_invoice(r.id); else perform public.issue_payment_invoice(r.id); end if;
    exception when others then  -- shown in Admin → Invoices to retry; never stops the migration
      perform public.log_invoice_failure('invoice', case when r.src = 'order' then r.id end, case when r.src = 'payment' then r.id end, null, sqlerrm);
    end;
  end loop;
  for r in
    select 'order' as src, id, coalesce(refunded_at, updated_at) as at from public.orders
     where refund_status = 'processed' or (status = 'cancelled' and paid_at is not null and total = 0)
    union all
    select 'refund', id, coalesce(processed_at, updated_at) from public.payment_refunds where status = 'processed'
    order by at, id
  loop
    begin
      if r.src = 'order' then perform public.issue_order_credit_note(r.id); else perform public.issue_payment_credit_note(r.id); end if;
    exception when others then
      perform public.log_invoice_failure('credit_note', case when r.src = 'order' then r.id end, null, case when r.src = 'refund' then r.id end, sqlerrm);
    end;
  end loop;
end $$;
