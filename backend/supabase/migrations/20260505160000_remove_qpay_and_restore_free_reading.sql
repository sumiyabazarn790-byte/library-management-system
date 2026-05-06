update public.books
set
  borrow_price = 0,
  borrow_currency = coalesce(nullif(trim(borrow_currency), ''), 'MNT'),
  is_public_readable = case
    when reading_content is not null and coalesce(array_length(reading_content, 1), 0) > 0 then true
    else is_public_readable
  end;

update public.books
set
  is_public_readable = true,
  borrow_price = 0,
  borrow_currency = 'MNT'
where (title, author) in (
  ('Pride and Prejudice', 'Jane Austen'),
  ('Frankenstein', 'Mary Shelley'),
  ('The Secret Garden', 'Frances Hodgson Burnett'),
  ('The Adventures of Sherlock Holmes', 'Arthur Conan Doyle'),
  ('The Wonderful Wizard of Oz', 'L. Frank Baum'),
  ('A Little Princess', 'Frances Hodgson Burnett'),
  ('Quietude of Mind', 'Anika Sen'),
  ('The Alchemist''s Codex', 'Iris Vale'),
  ('Archive Letters from the Steppe', 'Mara Ellison'),
  ('Quantum Notes for Curious Minds', 'Leah Moritz'),
  ('Neural Garden Handbook', 'Owen Park'),
  ('Stoic Lamps in the Dust', 'Helena Ward')
);

create or replace function public.borrow_book(p_book_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
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
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  return public.activate_loan_for_user(v_uid, p_book_id);
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

grant execute on function public.borrow_book(uuid) to authenticated;
grant execute on function public.request_book(uuid) to authenticated;
grant execute on function public.return_book(uuid) to authenticated;
grant execute on function public.pay_and_borrow_book(uuid) to authenticated;
