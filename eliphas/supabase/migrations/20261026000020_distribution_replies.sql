-- Distribution requests, part 2: the author is notified of each review and can reply to "Needs information".
-- Still intake only: nothing is submitted to a retailer or charged.

-- 1. In-app notification when our team reviews a request
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('new_article', 'new_post', 'new_follower', 'reply', 'verification', 'distribution'));

-- 2. The author's latest reply
alter table public.distribution_requests
  add column author_reply      text not null default '' check (length(author_reply) <= 2000),
  add column author_replied_at timestamptz;

-- Only an admin's save counts as a review; every save still gets a fresh updated_at (stale-edit protection)
create or replace function public.stamp_distribution_review()
returns trigger language plpgsql as $$
begin
  -- clock_timestamp(), not now(): two saves in one transaction still get different values
  new.updated_at = clock_timestamp();
  if public.is_admin() then
    new.reviewed_at = new.updated_at;
    new.reviewed_by = auth.uid();
  end if;
  return new;
end $$;

-- 3. Reply to "Needs information": own request only, only in that status, and only if nobody changed it meanwhile.
-- The request goes back to "requested" so it appears in the team's open queue. Returns false if nothing matched.
create function public.reply_to_distribution_review(
  p_id uuid, p_previous timestamptz, p_reply text, p_markets text, p_residence text
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  found_id uuid;
begin
  if length(btrim(coalesce(p_reply, ''))) not between 5 and 2000
     or length(btrim(coalesce(p_markets, ''))) not between 2 and 200
     or length(btrim(coalesce(p_residence, ''))) not between 2 and 80 then
    raise exception 'Invalid reply';
  end if;
  update public.distribution_requests
     set author_reply = btrim(p_reply),
         author_replied_at = clock_timestamp(),
         markets = btrim(p_markets),
         residence_country = btrim(p_residence),
         status = 'requested'
   where id = p_id
     and author_id = auth.uid()
     and status = 'needs_information'
     and updated_at = p_previous
  returning id into found_id;
  return found_id is not null;
end $$;
revoke execute on function public.reply_to_distribution_review(uuid, timestamptz, text, text, text) from public, anon;
grant execute on function public.reply_to_distribution_review(uuid, timestamptz, text, text, text) to authenticated;
