alter table public.books
  add column if not exists borrow_price numeric(10, 2) not null default 3500,
  add column if not exists borrow_currency text not null default 'MNT';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'books_borrow_price_nonnegative'
      and conrelid = 'public.books'::regclass
  ) then
    alter table public.books
      add constraint books_borrow_price_nonnegative
      check (borrow_price >= 0);
  end if;
end
$$;

update public.books
set
  borrow_price = case
    when is_public_readable then 0
    else coalesce(borrow_price, 3500)
  end,
  borrow_currency = coalesce(nullif(trim(borrow_currency), ''), 'MNT')
where is_public_readable = true
   or borrow_price is null
   or borrow_currency is null
   or trim(borrow_currency) = '';

create table if not exists public.borrow_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'MNT',
  created_at timestamptz not null default now()
);

create unique index if not exists borrow_payments_one_per_loan_idx
  on public.borrow_payments (loan_id);

create index if not exists borrow_payments_user_created_idx
  on public.borrow_payments (user_id, created_at desc);

alter table public.borrow_payments enable row level security;

drop policy if exists "Borrow payments selectable by owner" on public.borrow_payments;
drop policy if exists "Borrow payments selectable by admin" on public.borrow_payments;

create policy "Borrow payments selectable by owner"
  on public.borrow_payments for select
  using ((select auth.uid()) = user_id);

create policy "Borrow payments selectable by admin"
  on public.borrow_payments for select
  using ((select public.is_admin()));

create or replace function public.sync_preferred_genre(
  p_user_id uuid,
  p_book_genre text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_book_genre is null or trim(p_book_genre) = '' then
    return;
  end if;

  update public.profiles as p
    set preferred_genres = (
      select array(
        select distinct genre
        from unnest(coalesce(p.preferred_genres, '{}'::text[]) || array[p_book_genre]) as genre
        where genre is not null
        order by genre
      )
    ),
    updated_at = now()
    where p.id = p_user_id;
end;
$$;

create or replace function public.record_borrow_payment(
  p_user_id uuid,
  p_book_id uuid,
  p_loan_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price numeric(10, 2);
  v_currency text;
begin
  if p_user_id is null or p_book_id is null or p_loan_id is null then
    return;
  end if;

  select borrow_price, borrow_currency
    into v_price, v_currency
  from public.books
  where id = p_book_id;

  if v_price is null then
    raise exception 'Book not found';
  end if;

  if coalesce(v_price, 0) <= 0 then
    return;
  end if;

  insert into public.borrow_payments (user_id, book_id, loan_id, amount, currency)
  values (
    p_user_id,
    p_book_id,
    p_loan_id,
    v_price,
    coalesce(nullif(trim(v_currency), ''), 'MNT')
  )
  on conflict (loan_id) do nothing;
end;
$$;

create or replace function public.activate_loan_for_user(
  p_user_id uuid,
  p_book_id uuid
)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans;
  v_book_genre text;
begin
  if p_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select genre
    into v_book_genre
  from public.books
  where id = p_book_id;

  if v_book_genre is null then
    raise exception 'Book not found';
  end if;

  if exists (
    select 1
    from public.loans
    where user_id = p_user_id
      and book_id = p_book_id
      and status = 'active'
  ) then
    raise exception 'Book already borrowed by this user';
  end if;

  update public.books
    set available_copies = available_copies - 1
    where id = p_book_id
      and available_copies > 0;

  if not found then
    raise exception 'No copies available';
  end if;

  if exists (
    select 1
    from public.loans
    where user_id = p_user_id
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
        where user_id = p_user_id
          and book_id = p_book_id
          and status = 'requested'
        order by loaned_at asc
        limit 1
      )
      returning * into v_loan;
  else
    insert into public.loans (user_id, book_id, status)
    values (p_user_id, p_book_id, 'active')
    returning * into v_loan;
  end if;

  perform public.sync_preferred_genre(p_user_id, v_book_genre);

  return v_loan;
end;
$$;

revoke all on function public.sync_preferred_genre(uuid, text) from public, anon, authenticated;
revoke all on function public.record_borrow_payment(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.activate_loan_for_user(uuid, uuid) from public, anon, authenticated;

create or replace function public.borrow_book(p_book_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_price numeric(10, 2);
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select borrow_price
    into v_price
  from public.books
  where id = p_book_id;

  if v_price is null then
    raise exception 'Book not found';
  end if;

  if coalesce(v_price, 0) > 0 then
    raise exception 'Payment required before borrowing';
  end if;

  return public.activate_loan_for_user(v_uid, p_book_id);
end;
$$;

create or replace function public.pay_and_borrow_book(p_book_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_loan public.loans;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  v_loan := public.activate_loan_for_user(v_uid, p_book_id);
  perform public.record_borrow_payment(v_uid, p_book_id, v_loan.id);

  return v_loan;
end;
$$;

create or replace function public.request_book(p_book_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans;
  v_uid uuid := auth.uid();
  v_available_copies int;
  v_borrow_price numeric(10, 2);
begin
  if v_uid is null then
    raise exception 'Not authenticated';
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

  if exists (
    select 1
    from public.loans
    where user_id = v_uid
      and book_id = p_book_id
      and status = 'requested'
  ) then
    raise exception 'Book already requested by this user';
  end if;

  select available_copies, borrow_price
    into v_available_copies, v_borrow_price
  from public.books
  where id = p_book_id;

  if v_available_copies is null then
    raise exception 'Book not found';
  end if;

  if v_available_copies > 0 then
    if coalesce(v_borrow_price, 0) > 0 then
      raise exception 'Book is currently available; pay before borrowing';
    end if;

    raise exception 'Book is currently available; borrow directly';
  end if;

  insert into public.loans (user_id, book_id, status)
  values (v_uid, p_book_id, 'requested')
  returning * into v_loan;

  return v_loan;
end;
$$;

create or replace function public.return_book(p_loan_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans;
  v_uid uuid := auth.uid();
  v_requested public.loans;
  v_book_genre text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.loans
    set status = 'returned', returned_at = now()
    where id = p_loan_id and user_id = v_uid and status = 'active'
    returning * into v_loan;

  if not found then
    raise exception 'Loan not found';
  end if;

  select genre
    into v_book_genre
  from public.books
  where id = v_loan.book_id;

  update public.books
    set available_copies = available_copies + 1
    where id = v_loan.book_id;

  select *
    into v_requested
  from public.loans
  where book_id = v_loan.book_id
    and status = 'requested'
  order by loaned_at asc
  limit 1;

  if found then
    update public.books
      set available_copies = available_copies - 1
      where id = v_loan.book_id and available_copies > 0;

    if found then
      update public.loans
        set status = 'active',
            loaned_at = now(),
            due_date = now() + interval '14 days',
            returned_at = null
        where id = v_requested.id
        returning * into v_requested;

      perform public.sync_preferred_genre(v_requested.user_id, v_book_genre);
      perform public.record_borrow_payment(v_requested.user_id, v_requested.book_id, v_requested.id);
    end if;
  end if;

  return v_loan;
end;
$$;

create or replace function public.admin_update_loan_status(
  p_loan_id uuid,
  p_next_status public.loan_status
)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.loans;
  v_result public.loans;
  v_requested public.loans;
  v_book_genre text;
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required';
  end if;

  select *
    into v_current
  from public.loans
  where id = p_loan_id;

  if not found then
    raise exception 'Loan not found';
  end if;

  select genre
    into v_book_genre
  from public.books
  where id = v_current.book_id;

  if v_current.status = p_next_status then
    return v_current;
  end if;

  if p_next_status = 'active' then
    if v_current.status not in ('requested', 'returned', 'cancelled') then
      raise exception 'Loan cannot be activated from its current status';
    end if;

    update public.books
      set available_copies = available_copies - 1
      where id = v_current.book_id
        and available_copies > 0;

    if not found then
      raise exception 'No copies available';
    end if;

    update public.loans
      set status = 'active',
          loaned_at = now(),
          due_date = now() + interval '14 days',
          returned_at = null
      where id = p_loan_id
      returning * into v_result;

    perform public.sync_preferred_genre(v_result.user_id, v_book_genre);
    perform public.record_borrow_payment(v_result.user_id, v_result.book_id, v_result.id);

    return v_result;
  end if;

  if p_next_status = 'requested' then
    if v_current.status not in ('returned', 'cancelled') then
      raise exception 'Only completed loans can move back to requested';
    end if;

    update public.loans
      set status = 'requested',
          returned_at = null
      where id = p_loan_id
      returning * into v_result;

    return v_result;
  end if;

  if p_next_status in ('returned', 'cancelled') then
    if v_current.status = 'active' then
      update public.books
        set available_copies = available_copies + 1
        where id = v_current.book_id;
    elsif v_current.status <> 'requested' then
      raise exception 'Loan cannot be completed from its current status';
    end if;

    update public.loans
      set status = p_next_status,
          returned_at = case
            when v_current.status = 'active' or p_next_status = 'returned' then now()
            else returned_at
          end
      where id = p_loan_id
      returning * into v_result;

    if v_current.status = 'active' then
      select *
        into v_requested
      from public.loans
      where book_id = v_current.book_id
        and status = 'requested'
      order by loaned_at asc
      limit 1;

      if found then
        update public.books
          set available_copies = available_copies - 1
          where id = v_current.book_id
            and available_copies > 0;

        if found then
          update public.loans
            set status = 'active',
                loaned_at = now(),
                due_date = now() + interval '14 days',
                returned_at = null
            where id = v_requested.id
            returning * into v_requested;

          perform public.sync_preferred_genre(v_requested.user_id, v_book_genre);
          perform public.record_borrow_payment(v_requested.user_id, v_requested.book_id, v_requested.id);
        end if;
      end if;
    end if;

    return v_result;
  end if;

  raise exception 'Unsupported loan status transition';
end;
$$;

grant execute on function public.borrow_book(uuid) to authenticated;
grant execute on function public.request_book(uuid) to authenticated;
grant execute on function public.return_book(uuid) to authenticated;
grant execute on function public.pay_and_borrow_book(uuid) to authenticated;
