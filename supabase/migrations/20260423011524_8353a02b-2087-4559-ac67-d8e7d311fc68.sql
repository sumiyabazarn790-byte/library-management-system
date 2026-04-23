-- Enable pgvector for semantic search
create extension if not exists vector;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_genres text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles insert by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Profiles update by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Books
create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  genre text not null,
  language text not null default 'en',
  description text not null default '',
  cover_url text,
  total_copies int not null default 1,
  available_copies int not null default 1,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

alter table public.books enable row level security;

create policy "Books are public"
  on public.books for select
  using (true);

-- Trigram for fuzzy search
create extension if not exists pg_trgm;
create index books_title_trgm on public.books using gin (title gin_trgm_ops);
create index books_author_trgm on public.books using gin (author gin_trgm_ops);
create index books_embedding_idx on public.books using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Loans
create type loan_status as enum ('requested', 'active', 'returned', 'cancelled');

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  status loan_status not null default 'requested',
  loaned_at timestamptz not null default now(),
  due_date timestamptz not null default (now() + interval '14 days'),
  returned_at timestamptz
);

alter table public.loans enable row level security;

create policy "Loans selectable by owner"
  on public.loans for select
  using (auth.uid() = user_id);

create policy "Loans insert by owner"
  on public.loans for insert
  with check (auth.uid() = user_id);

create policy "Loans update by owner"
  on public.loans for update
  using (auth.uid() = user_id);

-- Profile auto-create trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Fuzzy search RPC
create or replace function public.search_books_fuzzy(q text, lim int default 20)
returns setof public.books
language sql
stable
security definer
set search_path = public
as $$
  select * from public.books
  where q is null or q = ''
     or title ilike '%' || q || '%'
     or author ilike '%' || q || '%'
     or similarity(title, q) > 0.2
     or similarity(author, q) > 0.2
  order by greatest(similarity(title, q), similarity(author, q)) desc nulls last
  limit lim;
$$;

-- Semantic search RPC
create or replace function public.match_books(query_embedding vector(1536), match_count int default 10)
returns table (
  id uuid, title text, author text, genre text, language text,
  description text, cover_url text, total_copies int, available_copies int,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.title, b.author, b.genre, b.language, b.description,
         b.cover_url, b.total_copies, b.available_copies,
         1 - (b.embedding <=> query_embedding) as similarity
  from public.books b
  where b.embedding is not null
  order by b.embedding <=> query_embedding
  limit match_count;
$$;

-- Borrow/return RPCs (atomic copy mgmt)
create or replace function public.borrow_book(p_book_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  update public.books
    set available_copies = available_copies - 1
    where id = p_book_id and available_copies > 0
    returning * into v_loan;

  if not found then raise exception 'No copies available'; end if;

  insert into public.loans (user_id, book_id, status)
  values (v_uid, p_book_id, 'active')
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
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  update public.loans
    set status = 'returned', returned_at = now()
    where id = p_loan_id and user_id = v_uid and status = 'active'
    returning * into v_loan;

  if not found then raise exception 'Loan not found'; end if;

  update public.books set available_copies = available_copies + 1
    where id = v_loan.book_id;

  return v_loan;
end;
$$;
