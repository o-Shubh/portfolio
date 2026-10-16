-- Service portfolio update.
-- 1. New catalogue versions with clearer deliverables, scope and exclusions, and the bundle shown as
--    "Book Design & Launch Bundle". Service codes stay the same. Prices, GST and revision rounds are
--    copied from the current version (never overwritten), and existing orders keep the version they
--    were placed on.
-- 2. Bundle upgrades: a bundle request can replace earlier requests for parts of it. Admin reviews what
--    was paid and issues an itemised quote; unpaid earlier requests are closed when the upgrade is paid,
--    so nothing is charged twice.

insert into public.service_catalog
  (code, version, name, pricing, price_paise, min_paise, max_paise, gst_percent, revision_rounds,
   deliverables, scope, exclusions, requires, sort, active)
select c.code, c.version + 1, v.name, c.pricing, c.price_paise, c.min_paise, c.max_paise, c.gst_percent, c.revision_rounds,
       v.deliverables, v.scope, v.exclusions, c.requires, c.sort, c.active
from public.current_service_catalog c
join (values
  ('basic_cover', 'Basic Book Cover',
   array['One cover concept',
         'Front, spine and back-cover design',
         'Final print-ready cover PDF',
         'Front-cover image for your book page',
         'One book mockup image'],
   'One cover concept developed into a full paperback wrap. Before the final wrap we confirm your printer''s trim size, bleed, paper and final page count, so the spine is exact.',
   array['Editing and proofreading', 'Printing and shipping', 'Paid advertising', 'Guaranteed sales',
         'Custom illustration', 'Stock images beyond our licensed library', 'Editable source files unless agreed']),
  ('formatting', 'Interior Formatting',
   array['Title and copyright-page layout',
         'Contents page where appropriate',
         'Chapter headings',
         'Consistent fonts, margins and page numbers',
         'Print-ready interior PDF'],
   'Typesetting your finished manuscript into a print-ready interior. We quote a fixed price after reviewing your manuscript''s length and complexity.',
   array['Editing and proofreading', 'Rewriting or translation', 'Printing and shipping', 'Paid advertising', 'Guaranteed sales',
         'Complex tables, equations or heavy illustrations unless quoted']),
  ('launch_kit', 'Launch Kit',
   array['Five creatives: cover reveal, launch announcement, quote card, book introduction and buy-now post',
         'Five captions, one for each creative',
         'Feed and story versions of each creative'],
   'Five coordinated designs for your launch, each supplied in two sizes (feed and story). That is five creatives in two formats, not ten different designs.',
   array['Editing and proofreading', 'Printing and shipping', 'Paid advertising', 'Guaranteed sales',
         'Posting or managing your accounts', 'Video']),
  ('bundle', 'Book Design & Launch Bundle',
   array['Basic cover: one concept with front, spine and back',
         'Interior formatting up to 200 final pages of simple text',
         'Five launch creatives with captions, in feed and story sizes',
         'Two consolidated revision rounds'],
   'Cover, formatting and launch creatives together. We check your manuscript length and files before you pay; if it is longer than 200 pages or complex, you get a revised quote first.',
   array['Editing and proofreading', 'Printing and shipping', 'Paid advertising', 'Guaranteed sales',
         'Complex tables, equations, heavy illustrations or custom illustration', 'Marketplace distribution',
         'New manuscript content after approval (needs a revised quote)'])
) as v(code, name, deliverables, scope, exclusions) on v.code = c.code;

-- Earlier requests a bundle upgrade replaces, and itemised quote lines (bundle price, credits)
alter table public.service_orders add column upgrade_from uuid[];
alter table public.service_quotes add column line_items jsonb;
create index service_orders_upgrade_idx on public.service_orders using gin (upgrade_from);

-- Same as before, plus: when a bundle upgrade is paid, earlier requests it replaces that were never paid
-- are closed (not charged). Paid earlier requests stay as they are; admin credits them in the quote.
create or replace function public.pay_service_quote(p_payment uuid, p_razorpay_payment_id text, p_fee_paise integer default null)
returns public.service_orders language plpgsql security definer set search_path = public as $$
declare
  pay public.payments;
  q public.service_quotes;
  so public.service_orders;
  prior public.service_orders;
begin
  select * into pay from public.payments where id = p_payment for update;
  if pay.id is null or pay.purpose <> 'service' then raise exception 'service payment not found'; end if;
  select * into q from public.service_quotes where id = pay.service_quote_id for update;
  select * into so from public.service_orders where id = q.service_order_id for update;
  if pay.status = 'paid' then return so; end if;            -- already done

  update public.payments
     set status = 'paid', paid_at = now(), razorpay_payment_id = coalesce(p_razorpay_payment_id, razorpay_payment_id),
         fee_paise = coalesce(p_fee_paise, fee_paise),
         receipt_number = coalesce(receipt_number, 'EIP-R-' || lpad(nextval('public.receipt_seq')::text, 6, '0'))
   where id = p_payment;
  update public.service_quotes set status = 'paid' where id = q.id;

  if so.status = 'payment_pending' then
    update public.service_orders
       set status = 'queued',
           revisions_allowed = case when q.kind = 'additional' then revisions_allowed + q.revisions else q.revisions end
     where id = so.id
    returning * into so;
    insert into public.service_events (service_order_id, from_status, to_status, note)
    values (so.id, 'payment_pending', 'queued', 'Payment received. Work starts once requirements are complete.');

    if so.upgrade_from is not null then
      for prior in
        select * from public.service_orders
         where id = any(so.upgrade_from)
           and status in ('requirements_pending', 'scope_review', 'quote_awaiting_acceptance', 'payment_pending')
         for update
      loop
        update public.service_orders
           set status = 'cancelled', cancelled_at = now(), cancel_reason = 'Replaced by bundle upgrade ' || so.order_number
         where id = prior.id;
        update public.service_quotes set status = 'superseded' where service_order_id = prior.id and status in ('issued', 'accepted');
        insert into public.service_events (service_order_id, from_status, to_status, note)
        values (prior.id, prior.status, 'cancelled', 'Replaced by bundle upgrade ' || so.order_number || '. Not charged.');
      end loop;
    end if;
  else
    -- Paid after the order was cancelled: keep the record so admin can refund it
    insert into public.service_events (service_order_id, from_status, to_status, note)
    values (so.id, so.status, so.status, 'Payment received for an order that is no longer awaiting payment. Refund needed.');
  end if;
  return so;
end $$;
revoke execute on function public.pay_service_quote(uuid, text, integer) from public, anon, authenticated;
