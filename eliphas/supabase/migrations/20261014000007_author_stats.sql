-- Milestone 6: author dashboard numbers.
-- Authors may not read the orders table (it holds buyers' names, phones and
-- addresses). These functions give an author only their OWN sales, and only
-- the parts they need: month, city, quantity, earnings and status.
-- They count paid orders only (paid → delivered), never unpaid or cancelled ones.

-- Copies sold and earnings per month, last `months` months including this one
create function public.my_sales_by_month(months int default 12)
returns table (month date, copies bigint, earnings numeric)
language sql stable security definer set search_path = public as $$
  with m as (
    select generate_series(
      date_trunc('month', now() at time zone 'Asia/Kolkata') - make_interval(months => greatest(months, 1) - 1),
      date_trunc('month', now() at time zone 'Asia/Kolkata'),
      interval '1 month'
    )::date as month
  )
  select m.month,
         coalesce(sum(oi.quantity), 0)::bigint,
         coalesce(sum(oi.quantity * oi.author_earning), 0)::numeric(12, 2)
  from m
  left join public.orders o
    on date_trunc('month', o.paid_at at time zone 'Asia/Kolkata')::date = m.month
   and public.is_earning_status(o.status)
  left join public.order_items oi
    on oi.order_id = o.id and oi.author_id = auth.uid()
  group by m.month
  order by m.month
$$;

-- Copies sold per delivery city (all time, or since `since`)
create function public.my_sales_by_city(since timestamptz default null)
returns table (city text, state text, copies bigint, earnings numeric)
language sql stable security definer set search_path = public as $$
  select initcap(trim(o.ship_city)), o.ship_state,
         sum(oi.quantity)::bigint, sum(oi.quantity * oi.author_earning)::numeric(12, 2)
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.author_id = auth.uid()
    and public.is_earning_status(o.status)
    and (since is null or o.paid_at >= since)
  group by 1, 2
  order by 3 desc, 1
$$;

-- Copies and earnings per book (all time)
create function public.my_sales_by_book()
returns table (book_id uuid, copies bigint, earnings numeric)
language sql stable security definer set search_path = public as $$
  select oi.book_id, sum(oi.quantity)::bigint, sum(oi.quantity * oi.author_earning)::numeric(12, 2)
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.author_id = auth.uid() and public.is_earning_status(o.status)
  group by oi.book_id
$$;

-- Recent orders of the author's books, for tracking (no buyer name, phone or address)
create function public.my_book_orders(max_rows int default 50, skip int default 0)
returns table (
  order_item_id uuid, order_number text, paid_at timestamptz, status public.order_status,
  ship_city text, ship_state text, book_title text, quantity int, earning numeric,
  shipped_at timestamptz, delivered_at timestamptz, total_count bigint
)
language sql stable security definer set search_path = public as $$
  select oi.id, o.order_number, o.paid_at, o.status, initcap(trim(o.ship_city)), o.ship_state,
         b.title, oi.quantity, (oi.quantity * oi.author_earning)::numeric(12, 2),
         o.shipped_at, o.delivered_at, count(*) over ()
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.books b on b.id = oi.book_id
  where oi.author_id = auth.uid() and public.is_earning_status(o.status)
  order by o.paid_at desc
  limit least(greatest(max_rows, 1), 200) offset greatest(skip, 0)
$$;

-- The author's own totals. (The author_balances view can't be used by authors:
-- it reads the orders table, which only admins may see in full.)
create function public.my_balance()
returns table (earned numeric, copies_sold bigint, paid numeric, balance numeric)
language sql stable security definer set search_path = public as $$
  with e as (
    select coalesce(sum(oi.quantity * oi.author_earning), 0) as earned, coalesce(sum(oi.quantity), 0) as copies
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.author_id = auth.uid() and public.is_earning_status(o.status)
  ), p as (
    select coalesce(sum(amount), 0) as paid from public.payouts where author_id = auth.uid() and status = 'paid'
  )
  select e.earned::numeric(12, 2), e.copies::bigint, p.paid::numeric(12, 2), (e.earned - p.paid)::numeric(12, 2)
  from e, p
$$;

-- Only logged-in users may call these (each returns the caller's own data)
revoke execute on function public.my_sales_by_month(int) from public, anon;
revoke execute on function public.my_sales_by_city(timestamptz) from public, anon;
revoke execute on function public.my_sales_by_book() from public, anon;
revoke execute on function public.my_book_orders(int, int) from public, anon;
revoke execute on function public.my_balance() from public, anon;
grant execute on function public.my_balance() to authenticated;
grant execute on function public.my_sales_by_month(int) to authenticated;
grant execute on function public.my_sales_by_city(timestamptz) to authenticated;
grant execute on function public.my_sales_by_book() to authenticated;
grant execute on function public.my_book_orders(int, int) to authenticated;
