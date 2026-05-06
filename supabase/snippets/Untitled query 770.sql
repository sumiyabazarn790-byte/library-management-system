-- saved_books хүснэгтийг үүсгэх
create table public.saved_books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  
  -- Нэг хэрэглэгч нэг номыг олон дахин хадгалахаас сэргийлнэ
  unique(user_id, book_id)
);

-- Row Level Security (RLS) идэвхжүүлэх
alter table public.saved_books enable row level security;

-- Зөвхөн өөрийн хадгалсан номыг харах боломжтой болгох бодлого (Policy)
create policy "Users can view their own saved books"
  on saved_books for select
  using (auth.uid() = user_id);

-- Зөвхөн өөрийн нэр дээр ном хадгалах боломжтой болгох бодлого
create policy "Users can insert their own saved books"
  on saved_books for insert
  with check (auth.uid() = user_id);

-- Зөвхөн өөрийн хадгалсан номыг устгах боломжтой болгох бодлого
create policy "Users can delete their own saved books"
  on saved_books for delete
  using (auth.uid() = user_id);