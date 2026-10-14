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
