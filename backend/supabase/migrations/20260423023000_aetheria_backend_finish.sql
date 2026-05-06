create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text default 'footer',
  created_at timestamptz not null default now()
);

create unique index if not exists newsletter_subscribers_email_idx
  on public.newsletter_subscribers (lower(email));

alter table public.newsletter_subscribers enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'newsletter_subscribers'
      and policyname = 'Anyone can subscribe to newsletter'
  ) then
    create policy "Anyone can subscribe to newsletter"
      on public.newsletter_subscribers
      for insert
      with check (true);
  end if;
end
$$;

create index if not exists books_genre_idx on public.books (genre);

create unique index if not exists loans_one_active_per_user_book_idx
  on public.loans (user_id, book_id)
  where status = 'active';

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

  insert into public.loans (user_id, book_id, status)
  values (v_uid, p_book_id, 'active')
  returning * into v_loan;

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

insert into public.books (
  title,
  author,
  genre,
  language,
  description,
  cover_url,
  total_copies,
  available_copies
)
select
  seed.title,
  seed.author,
  seed.genre,
  seed.language,
  seed.description,
  null,
  seed.total_copies,
  seed.available_copies
from (
  values
    (
      'The Alchemist''s Codex',
      'Iris Vale',
      'Rare Archives',
      'en',
      'A restored mystical manuscript that blends alchemy, astronomy, and symbolic diagrams from a lost monastery collection.',
      3,
      3
    ),
    (
      'Beyond the Event Horizon',
      'Marcus Thorne',
      'Quantum Physics',
      'en',
      'A cinematic exploration of black holes, paradoxes, and the edges of modern cosmology.',
      4,
      4
    ),
    (
      'Echoes of Ancient Rome',
      'Dr. Elena Rossi',
      'History',
      'en',
      'Political memory, civic ritual, and daily life inside the Roman Empire told through archived letters and public records.',
      4,
      4
    ),
    (
      'The Singularity Myth',
      'Julian Vance',
      'Technology',
      'en',
      'An accessible critique of techno-utopian promises, AI acceleration, and the stories people tell about the future.',
      5,
      5
    ),
    (
      'Neural Architectures',
      'Sarah Chen',
      'AI',
      'en',
      'A visual guide to learning systems, model design, and the philosophical questions beneath machine intelligence.',
      5,
      5
    ),
    (
      'Quietude of Mind',
      'Anika Sen',
      'Philosophy',
      'en',
      'Meditative traditions, inner discipline, and consciousness studies brought into dialogue with modern cognitive science.',
      4,
      4
    ),
    (
      'Global Synapse',
      'Noah Kestrel',
      'Cybernetics',
      'en',
      'A systems-level view of networks, coordination, and emergent behavior in technical and social ecosystems.',
      4,
      4
    ),
    (
      'The Human Matrix',
      'Amara Levin',
      'Anthropology',
      'en',
      'Identity, ritual, and collective memory studied through comparative anthropology and oral archive fragments.',
      3,
      3
    ),
    (
      'Сансрын судар',
      'Ц. Одбаяр',
      'Cosmology',
      'mn',
      'Ертөнцийн бүтэц, одон орны домог, тэнгэрийн бичвэрүүдийг орчин үеийн тайлбартай нэгтгэсэн цуглуулга.',
      3,
      3
    ),
    (
      'Нүүдэлчдийн оюуны өв',
      'Б. Сувд',
      'History',
      'mn',
      'Нүүдэлчдийн мэдлэг, аман уламжлал, бичгийн дурсгалын сан хөмрөгийг нэг дор харуулсан бүтээл.',
      4,
      4
    ),
    (
      'Бодь сэтгэлийн зам',
      'Д. Ариун',
      'Philosophy',
      'mn',
      'Дотоод сахилга, энэрэл, бясалгалын уламжлалыг орчин үеийн уншигчдад зориулан тайлбарласан философийн ном.',
      4,
      4
    ),
    (
      'Квантын хил хязгаар',
      'Э. Тэнүүн',
      'Quantum Physics',
      'mn',
      'Квантын онолын үндэс, тайлбарууд, хүний ойлголтын хил хязгаарыг энгийн өгүүлэмжээр тайлбарлана.',
      3,
      3
    )
) as seed(title, author, genre, language, description, total_copies, available_copies)
where not exists (
  select 1
  from public.books
);
