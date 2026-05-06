create unique index if not exists loans_one_requested_per_user_book_idx
  on public.loans (user_id, book_id)
  where status = 'requested';

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

  select available_copies
    into v_available_copies
  from public.books
  where id = p_book_id;

  if v_available_copies is null then
    raise exception 'Book not found';
  end if;

  if v_available_copies > 0 then
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

    update public.loans
      set status = 'active',
          loaned_at = now(),
          due_date = now() + interval '14 days'
      where id = v_requested.id;
  end if;

  return v_loan;
end;
$$;
