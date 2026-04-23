create or replace function public.search_books_fuzzy(q text, lim int default 20)
returns setof public.books
language sql
stable
security definer
set search_path = public, extensions
as $$
  select * from public.books
  where q is null or q = ''
     or title ilike '%' || q || '%'
     or author ilike '%' || q || '%'
     or genre ilike '%' || q || '%'
     or description ilike '%' || q || '%'
     or extensions.similarity(title, q) > 0.2
     or extensions.similarity(author, q) > 0.2
  order by greatest(
    extensions.similarity(title, q),
    extensions.similarity(author, q),
    case when title ilike '%' || q || '%' then 0.9 else 0 end,
    case when author ilike '%' || q || '%' then 0.9 else 0 end
  ) desc nulls last
  limit lim;
$$;