-- New printer steps: paid → accepted → printing → packed → shipped → delivered.
-- Kept in its own file: Postgres can't use a new enum value in the same transaction that adds it.
-- 'printed' stays for orders created before this change.
alter type public.order_status add value if not exists 'accepted' after 'paid';
alter type public.order_status add value if not exists 'packed' after 'printed';
