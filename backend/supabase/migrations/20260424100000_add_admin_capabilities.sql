do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'profile_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.profile_role as enum ('member', 'admin');
  end if;
end
$$;

alter table public.profiles
  add column if not exists role public.profile_role not null default 'member';

update public.profiles
set role = 'admin',
    updated_at = now()
where id = (
  select id
  from public.profiles
  order by created_at asc, id asc
  limit 1
)
and not exists (
  select 1
  from public.profiles
  where role = 'admin'
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.profile_role := 'member';
begin
  if not exists (
    select 1
    from public.profiles
    where role = 'admin'
  ) then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    v_role
  );

  return new;
end;
$$;

create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if not public.is_admin() then
      raise exception 'Admin privileges required';
    end if;

    if old.role = 'admin'
       and new.role <> 'admin'
       and not exists (
         select 1
         from public.profiles
         where role = 'admin'
           and id <> old.id
       ) then
      raise exception 'At least one admin account must remain';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists on_profile_role_change on public.profiles;

create trigger on_profile_role_change
  before update on public.profiles
  for each row execute function public.guard_profile_role_change();

drop policy if exists "Profiles viewable by owner" on public.profiles;
drop policy if exists "Profiles insert by owner" on public.profiles;
drop policy if exists "Profiles update by owner" on public.profiles;
drop policy if exists "Loans insert by owner" on public.loans;
drop policy if exists "Loans update by owner" on public.loans;
drop policy if exists "Sale listings insert by owner" on public.sale_listings;
drop policy if exists "Sale listings update by owner" on public.sale_listings;

create policy "Profiles selectable by owner or admin"
  on public.profiles for select
  using (
    (select auth.uid()) = id
    or (select public.is_admin())
  );

create policy "Profiles insert by owner or admin"
  on public.profiles for insert
  with check (
    (select auth.uid()) = id
    or (select public.is_admin())
  );

create policy "Profiles update by owner or admin"
  on public.profiles for update
  using (
    (select auth.uid()) = id
    or (select public.is_admin())
  )
  with check (
    (select auth.uid()) = id
    or (select public.is_admin())
  );

create policy "Books insert by admin"
  on public.books for insert
  with check ((select public.is_admin()));

create policy "Books update by admin"
  on public.books for update
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Books delete by admin"
  on public.books for delete
  using ((select public.is_admin()));

create policy "Loans selectable by admin"
  on public.loans for select
  using ((select public.is_admin()));

create policy "Loans update by admin"
  on public.loans for update
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Loans delete by admin"
  on public.loans for delete
  using ((select public.is_admin()));

create policy "Sale listings selectable by admin"
  on public.sale_listings for select
  using ((select public.is_admin()));

create policy "Sale listings update by admin"
  on public.sale_listings for update
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Sale listings delete by admin"
  on public.sale_listings for delete
  using ((select public.is_admin()));

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
            where id = v_requested.id;
        end if;
      end if;
    end if;

    return v_result;
  end if;

  raise exception 'Unsupported loan status transition';
end;
$$;
