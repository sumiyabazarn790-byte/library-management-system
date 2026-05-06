alter table public.borrow_payments
  add column if not exists provider text not null default 'internal',
  add column if not exists provider_invoice_id text,
  add column if not exists provider_payment_id text,
  add column if not exists provider_payload jsonb;

create table if not exists public.qpay_borrow_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  invoice_id text,
  sender_invoice_no text not null unique,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'MNT',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'expired', 'failed')),
  qr_text text,
  qr_image text,
  deeplinks jsonb not null default '[]'::jsonb,
  invoice_payload jsonb not null default '{}'::jsonb,
  payment_payload jsonb,
  payment_id text,
  paid_amount numeric(10, 2),
  paid_at timestamptz,
  activated_loan_id uuid references public.loans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists qpay_borrow_sessions_invoice_id_idx
  on public.qpay_borrow_sessions (invoice_id)
  where invoice_id is not null;

create index if not exists qpay_borrow_sessions_user_created_idx
  on public.qpay_borrow_sessions (user_id, created_at desc);

create index if not exists qpay_borrow_sessions_book_created_idx
  on public.qpay_borrow_sessions (book_id, created_at desc);

alter table public.qpay_borrow_sessions enable row level security;

drop policy if exists "QPay borrow sessions selectable by owner" on public.qpay_borrow_sessions;
drop policy if exists "QPay borrow sessions selectable by admin" on public.qpay_borrow_sessions;

create policy "QPay borrow sessions selectable by owner"
  on public.qpay_borrow_sessions for select
  using ((select auth.uid()) = user_id);

create policy "QPay borrow sessions selectable by admin"
  on public.qpay_borrow_sessions for select
  using ((select public.is_admin()));

create or replace function public.finalize_qpay_borrow_session(
  p_session_id uuid,
  p_payment_id text default null,
  p_paid_amount numeric default null,
  p_payment_payload jsonb default null
)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.qpay_borrow_sessions;
  v_loan public.loans;
begin
  select *
    into v_session
  from public.qpay_borrow_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'QPay session not found';
  end if;

  if v_session.activated_loan_id is not null then
    select *
      into v_loan
    from public.loans
    where id = v_session.activated_loan_id;

    if found then
      return v_loan;
    end if;
  end if;

  if v_session.status <> 'paid' then
    raise exception 'QPay session is not paid';
  end if;

  select *
    into v_loan
  from public.loans
  where user_id = v_session.user_id
    and book_id = v_session.book_id
    and status = 'active'
  order by loaned_at desc
  limit 1;

  if not found then
    v_loan := public.activate_loan_for_user(v_session.user_id, v_session.book_id);
    perform public.record_borrow_payment(v_session.user_id, v_session.book_id, v_loan.id);
  end if;

  update public.borrow_payments
    set provider = 'qpay',
        provider_invoice_id = coalesce(v_session.invoice_id, provider_invoice_id),
        provider_payment_id = coalesce(p_payment_id, provider_payment_id),
        provider_payload = coalesce(p_payment_payload, provider_payload)
  where loan_id = v_loan.id;

  update public.qpay_borrow_sessions
    set payment_id = coalesce(p_payment_id, payment_id),
        paid_amount = coalesce(p_paid_amount, paid_amount),
        payment_payload = coalesce(p_payment_payload, payment_payload),
        paid_at = coalesce(paid_at, now()),
        activated_loan_id = v_loan.id,
        updated_at = now()
  where id = v_session.id;

  return v_loan;
end;
$$;

revoke all on function public.finalize_qpay_borrow_session(uuid, text, numeric, jsonb)
  from public, anon, authenticated;

grant execute on function public.finalize_qpay_borrow_session(uuid, text, numeric, jsonb)
  to service_role;

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

  if coalesce(v_borrow_price, 0) > 0 then
    raise exception 'Paid books cannot be requested while unavailable';
  end if;

  insert into public.loans (user_id, book_id, status)
  values (v_uid, p_book_id, 'requested')
  returning * into v_loan;

  return v_loan;
end;
$$;

revoke execute on function public.pay_and_borrow_book(uuid) from authenticated;
