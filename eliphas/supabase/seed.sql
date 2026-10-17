-- LOCAL DEVELOPMENT ONLY (runs on `npx supabase db reset`). Never run this on production.
-- Test phone numbers (OTP is always 123456, see supabase/config.toml):
--   +91 90000 00001 -> admin
--   +91 90000 00002 -> author
--   +91 90000 00003 -> printer
--   +91 90000 00004 -> reader
insert into public.role_invites (phone, role, note) values
  ('919000000001', 'admin',   'local test admin'),
  ('919000000002', 'author',  'local test author'),
  ('919000000003', 'printer', 'local test printer')
on conflict (phone) do nothing;

insert into public.printers (name, contact_name, phone, city, state, pincode, address) values
  ('Sample Press Delhi', 'Test Printer', '919000000003', 'New Delhi', 'Delhi', '110020', 'Okhla Industrial Area (sample)')
on conflict (phone) do nothing;

-- Sample authors and published books for the bookstore (local only).
insert into auth.users (instance_id, id, aud, role, phone, phone_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000011', 'authenticated', 'authenticated', '919000000011', now(), now(), now(), '{"provider":"phone","providers":["phone"]}', '{}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000012', 'authenticated', 'authenticated', '919000000012', now(), now(), now(), '{"provider":"phone","providers":["phone"]}', '{}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000013', 'authenticated', 'authenticated', '919000000013', now(), now(), now(), '{"provider":"phone","providers":["phone"]}', '{}', '', '', '', '')
on conflict (id) do nothing;

update public.profiles set role = 'author', full_name = v.name, city = v.city, state = v.state
from (values
  ('00000000-0000-4000-a000-000000000011'::uuid, 'Meera Iyer', 'Kochi', 'Kerala'),
  ('00000000-0000-4000-a000-000000000012'::uuid, 'Sunita Verma', 'Varanasi', 'Uttar Pradesh'),
  ('00000000-0000-4000-a000-000000000013'::uuid, 'Kabir Negi', 'Dehradun', 'Uttarakhand')
) as v(id, name, city, state)
where profiles.id = v.id;

insert into public.books (author_id, slug, title, subtitle, author_name, language, genre, page_count, trim_size,
  binding, interior, paper, mrp, print_cost, description, published_at)
values
  ('00000000-0000-4000-a000-000000000011', 'monsoon-letters', 'Monsoon Letters', 'A novel in seasons', 'Meera Iyer', 'en', 'Fiction', 248, '5x8', 'paperback', 'bw', 'cream', 299, 142, 'Two sisters, one Konkan house and forty years of letters that were never posted. When the monsoon floods the old storeroom, Nandini finds the bundle her mother hid — and a family story nobody told her.', now() - interval '0 days'),
  ('00000000-0000-4000-a000-000000000012', 'dhoop-ki-chitthiyan', 'धूप की चिट्ठियाँ', 'कविता संग्रह', 'राकेश तिवारी', 'hi', 'Poetry', 120, '5x8', 'paperback', 'bw', 'cream', 199, 84, 'छोटे शहरों की सुबह, माँ की रसोई और बिछड़े दोस्तों की याद — सत्तर कविताएँ जो रोज़मर्रा की ज़िंदगी में छिपी रोशनी को पकड़ती हैं।', now() - interval '3 days'),
  ('00000000-0000-4000-a000-000000000013', 'the-deodar-trail', 'The Deodar Trail', 'Walking the Western Himalaya', 'Kabir Negi', 'en', 'Travel', 312, '6x9', 'paperback', 'bw', 'white', 449, 210, 'Eleven treks through Himachal and Uttarakhand, from shepherd routes above Chamba to forgotten temple paths near Joshimath. Maps, homestay notes and the people you meet on the way.', now() - interval '6 days'),
  ('00000000-0000-4000-a000-000000000012', 'gaon-ki-pagdandi', 'गाँव की पगडंडी', 'कहानियाँ', 'सुनीता वर्मा', 'hi', 'Stories', 180, '5.5x8.5', 'paperback', 'bw', 'cream', 249, 116, 'पूर्वांचल के एक गाँव की बारह कहानियाँ — खेत, मेले, चुनाव और वो लोग जो शहर चले गए पर लौटना नहीं भूले।', now() - interval '9 days'),
  ('00000000-0000-4000-a000-000000000011', 'startup-on-a-shoestring', 'Startup on a Shoestring', 'Building a business from a small Indian town', 'Arjun Mehta', 'en', 'Business', 220, '6x9', 'paperback', 'bw', 'white', 399, 157, 'A practical guide for first-time founders outside the metros: finding your first hundred customers, GST basics, hiring locally and growing without investors.', now() - interval '12 days'),
  ('00000000-0000-4000-a000-000000000012', 'maa-ke-haath-ka-khana', 'माँ के हाथ का खाना', 'घर की रसोई से 60 व्यंजन', 'सुनीता वर्मा', 'hi', 'Cooking', 120, 'a5', 'paperback', 'color', 'white', 699, 390, 'दाल-बाटी से लेकर आम का अचार तक — घर के आसान व्यंजन, रंगीन तस्वीरों और नानी के नुस्खों के साथ।', now() - interval '15 days'),
  ('00000000-0000-4000-a000-000000000013', 'midnight-at-marine-drive', 'Midnight at Marine Drive', 'A Mumbai thriller', 'Kabir Negi', 'en', 'Thriller', 352, '5x8', 'paperback', 'bw', 'cream', 349, 189, 'A missing journalist, a cricket betting ring and one rain-soaked night along the Queen’s Necklace. Inspector Farah Khan has until sunrise.', now() - interval '18 days'),
  ('00000000-0000-4000-a000-000000000012', 'chunnu-munnu-ki-kahaniyan', 'चुन्नू-मुन्नू की कहानियाँ', 'बच्चों के लिए', 'राकेश तिवारी', 'hi', 'Children', 48, '5.5x8.5', 'paperback', 'color', 'white', 299, 174, 'दो शरारती भाइयों की रंग-बिरंगी कहानियाँ, 4 से 8 साल के बच्चों के लिए। हर कहानी के साथ एक छोटी सीख।', now() - interval '21 days'),
  ('00000000-0000-4000-a000-000000000011', 'notes-from-a-small-town-library', 'Notes from a Small Town Library', null, 'Meera Iyer', 'en', 'Memoir', 200, '5.5x8.5', 'hardcover', 'bw', 'cream', 599, 235, 'Thirty years behind the issue desk of a district library in Kerala — the readers, the regulars and the books that changed them.', now() - interval '24 days'),
  ('00000000-0000-4000-a000-000000000013', 'yog-aur-man', 'योग और मन', 'रोज़ के लिए 21 अभ्यास', 'कबीर नेगी', 'hi', 'Self-help', 144, '5x8', 'paperback', 'bw', 'cream', 199, 95, 'सुबह के दस मिनट में करने लायक सरल योग और ध्यान अभ्यास, शुरुआत करने वालों के लिए।', now() - interval '27 days')
on conflict (slug) do nothing;

-- Mark them published (the status guard allows this because seed runs without a logged-in user)
update public.books set status = 'published', submitted_at = published_at, reviewed_at = published_at
where author_id in ('00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000012', '00000000-0000-4000-a000-000000000013');

-- ---------------------------------------------------------------------------
-- Sample reader and ~80 past orders over the last 6 months, for the payouts
-- screen and the author dashboard. Money split uses the default fees.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, phone, phone_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000021', 'authenticated', 'authenticated',
  '919000000021', now(), now(), now(), '{"provider":"phone","providers":["phone"]}', '{}', '', '', '', '')
on conflict (id) do nothing;
-- Meera is a verified author (Sunita and Kabir are left for the admin's existing-author review)
update public.profiles set verified_author_at = now() where id = '00000000-0000-4000-a000-000000000011';

update public.profiles set full_name = 'Sample Reader', city = 'Mumbai', state = 'Maharashtra'
where id = '00000000-0000-4000-a000-000000000021';

do $$
declare
  cities text[][] := array[
    ['Mumbai', 'Maharashtra', '400001'], ['Delhi', 'Delhi', '110001'], ['Bengaluru', 'Karnataka', '560001'],
    ['Lucknow', 'Uttar Pradesh', '226001'], ['Jaipur', 'Rajasthan', '302001'], ['Patna', 'Bihar', '800001'],
    ['Pune', 'Maharashtra', '411001'], ['Kolkata', 'West Bengal', '700001'], ['Bhopal', 'Madhya Pradesh', '462001'],
    ['Varanasi', 'Uttar Pradesh', '221001']];
  b record;
  i int;
  c int;
  q int;
  days int;
  st public.order_status;
  sub numeric;
  ship numeric;
  oid uuid;
  fee numeric;
  printer uuid := (select id from public.printers order by created_at limit 1);
begin
  for i in 1..80 loop
    select * into b from public.books where status = 'published' order by slug offset ((i * 7) % 10) limit 1;
    -- busier cities appear more often
    c := 1 + (case when i % 3 = 0 then 0 when i % 5 = 0 then 1 else (i * 3) % 10 end);
    q := case when i % 6 = 0 then 2 else 1 end;
    days := (i * 173) % 180;
    st := case when days < 2 then 'paid' when days < 4 then 'printing' when days < 6 then 'printed'
               when days < 10 then 'shipped' else 'delivered' end;
    sub := b.mrp * q;
    ship := case when sub >= 499 then 0 else 60 end;
    fee := round(b.mrp * 0.02 * 1.18, 2);

    insert into public.orders (buyer_id, status, subtotal, shipping, total, razorpay_order_id, razorpay_payment_id,
      ship_name, ship_phone, ship_line1, ship_city, ship_state, ship_pincode, printer_id,
      courier, tracking_number, paid_at, printed_at, shipped_at, delivered_at, created_at)
    values ('00000000-0000-4000-a000-000000000021', st, sub, ship, sub + ship, 'seed_order_' || i, 'seed_pay_' || i,
      'Sample Reader', '919000000021', 'Sample address ' || i, cities[c][1], cities[c][2], cities[c][3],
      case when st = 'paid' then null else printer end,
      case when st in ('shipped', 'delivered') then 'India Post' end,
      case when st in ('shipped', 'delivered') then 'EE' || lpad(i::text, 9, '0') || 'IN' end,
      now() - make_interval(days => days),
      case when st in ('printed', 'shipped', 'delivered') then now() - make_interval(days => greatest(days - 2, 0)) end,
      case when st in ('shipped', 'delivered') then now() - make_interval(days => greatest(days - 3, 0)) end,
      case when st = 'delivered' then now() - make_interval(days => greatest(days - 8, 0)) end,
      now() - make_interval(days => days))
    returning id into oid;

    insert into public.order_items (order_id, book_id, author_id, quantity, unit_price, print_cost, platform_fee,
      payment_fee, author_earning, created_at)
    values (oid, b.id, b.author_id, q, b.mrp, b.print_cost, 15, fee, b.mrp - b.print_cost - 15 - fee,
      now() - make_interval(days => days));
  end loop;
end $$;

-- One past payout, so the payouts screen shows history
insert into public.payouts (author_id, amount, status, reference, note, paid_at, created_at)
values ('00000000-0000-4000-a000-000000000011', 1000, 'paid', 'UTR-SAMPLE-0001', 'Sample payout',
  now() - interval '45 days', now() - interval '45 days');
