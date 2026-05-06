create or replace function public.borrow_book(p_book_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans;
  v_uid uuid := auth.uid();
  v_book_genre text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.books
    where id = p_book_id
  ) then
    raise exception 'Book not found';
  end if;

  if exists (
    select 1
    from public.loans
    where user_id = v_uid
      and book_id = p_book_id
      and status = 'active'
  ) then
    raise exception 'Book already borrowed by this user';
  end if;

  update public.books
    set available_copies = available_copies - 1
    where id = p_book_id
      and available_copies > 0
    returning genre into v_book_genre;

  if not found then
    raise exception 'No copies available';
  end if;

  if exists (
    select 1
    from public.loans
    where user_id = v_uid
      and book_id = p_book_id
      and status = 'requested'
  ) then
    update public.loans
      set status = 'active',
          loaned_at = now(),
          due_date = now() + interval '14 days',
          returned_at = null
      where id = (
        select id
        from public.loans
        where user_id = v_uid
          and book_id = p_book_id
          and status = 'requested'
        order by loaned_at asc
        limit 1
      )
      returning * into v_loan;
  else
    insert into public.loans (user_id, book_id, status)
    values (v_uid, p_book_id, 'active')
    returning * into v_loan;
  end if;

  update public.profiles as p
    set preferred_genres = (
      select array(
        select distinct genre
        from unnest(coalesce(p.preferred_genres, '{}'::text[]) || array[v_book_genre]) as genre
        where genre is not null
        order by genre
      )
    ),
    updated_at = now()
    where p.id = v_uid;

  return v_loan;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'sale_listing_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.sale_listing_status as enum ('active', 'sold', 'cancelled');
  end if;
end
$$;

create table if not exists public.sale_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  price numeric(10, 2) not null check (price > 0),
  currency text not null default 'MNT',
  note text,
  status public.sale_listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sale_listings_one_active_per_user_book_idx
  on public.sale_listings (user_id, book_id)
  where status = 'active';

alter table public.sale_listings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sale_listings'
      and policyname = 'Sale listings selectable by owner'
  ) then
    create policy "Sale listings selectable by owner"
      on public.sale_listings for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sale_listings'
      and policyname = 'Sale listings insert by owner'
  ) then
    create policy "Sale listings insert by owner"
      on public.sale_listings for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sale_listings'
      and policyname = 'Sale listings update by owner'
  ) then
    create policy "Sale listings update by owner"
      on public.sale_listings for update
      using (auth.uid() = user_id);
  end if;
end
$$;

create or replace function public.sell_book(
  p_book_id uuid,
  p_price numeric,
  p_note text default null
)
returns public.sale_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.sale_listings;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_price is null or p_price <= 0 then
    raise exception 'Price must be greater than zero';
  end if;

  if not exists (
    select 1
    from public.books
    where id = p_book_id
  ) then
    raise exception 'Book not found';
  end if;

  if not exists (
    select 1
    from public.loans
    where user_id = v_uid
      and book_id = p_book_id
      and status in ('active', 'returned')
  ) then
    raise exception 'Borrow or return the book before listing it for sale';
  end if;

  if exists (
    select 1
    from public.sale_listings
    where user_id = v_uid
      and book_id = p_book_id
      and status = 'active'
  ) then
    raise exception 'Book already listed for sale';
  end if;

  insert into public.sale_listings (user_id, book_id, price, note)
  values (v_uid, p_book_id, p_price, nullif(trim(coalesce(p_note, '')), ''))
  returning * into v_listing;

  return v_listing;
end;
$$;
