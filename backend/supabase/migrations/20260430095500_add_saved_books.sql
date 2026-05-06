create table if not exists public.saved_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists saved_books_user_book_idx
  on public.saved_books (user_id, book_id);

create index if not exists saved_books_user_created_at_idx
  on public.saved_books (user_id, created_at desc);

alter table public.saved_books enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_books'
      and policyname = 'Saved books selectable by owner or admin'
  ) then
    create policy "Saved books selectable by owner or admin"
      on public.saved_books for select
      using (
        (select auth.uid()) = user_id
        or (select public.is_admin())
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_books'
      and policyname = 'Saved books insert by owner or admin'
  ) then
    create policy "Saved books insert by owner or admin"
      on public.saved_books for insert
      with check (
        (select auth.uid()) = user_id
        or (select public.is_admin())
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_books'
      and policyname = 'Saved books delete by owner or admin'
  ) then
    create policy "Saved books delete by owner or admin"
      on public.saved_books for delete
      using (
        (select auth.uid()) = user_id
        or (select public.is_admin())
      );
  end if;
end
$$;
