alter table public.books
  add column if not exists is_public_readable boolean not null default false,
  add column if not exists reading_content text[];

create index if not exists books_public_readable_idx
  on public.books (is_public_readable)
  where is_public_readable = true;

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
    where user_id = v_uid
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
    where user_id = v_uid
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
        where user_id = v_uid
          and book_id = p_book_id
          and status = 'requested'
        order by loaned_at asc
        limit 1
      )
      returning * into v_loan;
  else
    insert into public.loans (user_id, book_id, status)
    values (v_uid, p_book_id, 'active')
    returning * into v_loan;
  end if;

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

grant execute on function public.borrow_book(uuid) to authenticated;
grant execute on function public.request_book(uuid) to authenticated;
grant execute on function public.return_book(uuid) to authenticated;

update public.books
set
  is_public_readable = true,
  reading_content = array[
    $$The codex opens with a page of patient instructions: do not begin with the metals, begin with the sky. In Iris Vale's archive, every recipe is paired with a star chart, as if transformation is less a trick of chemistry and more a discipline of attention. The reader is invited to move slowly, tracing symbols that behave like prayers disguised as diagrams.$$,
    $$A second folio records the labor of unnamed caretakers who copied the text through winters, wars, and monastery fires. Their notes are quiet but revealing. One writes that the true experiment is not turning lead into gold, but turning fear into wonder. Another leaves a margin full of weather marks, proving the book was used beneath an open roof.$$,
    $$Near the center, the codex becomes practical. It teaches how to observe color, heat, and timing without surrendering to superstition. Vale frames the manuscript as a bridge between medieval craft and scientific method, reminding us that curiosity often matures before the language to explain it exists.$$,
    $$The closing passage returns to the night sky. It suggests that all study is a form of alignment: the hand with the page, the page with the lamp, the lamp with the patient orbit of the stars. By the final line, the codex feels less like a relic and more like a living manual for disciplined imagination.$$
  ]
where title = 'The Alchemist''s Codex'
  and author = 'Iris Vale';

update public.books
set
  is_public_readable = true,
  reading_content = array[
    $$Anika Sen begins with a simple observation: the mind rarely suffers from a lack of information. It suffers from scattered attention. Quietude, in her framing, is not silence forced from the outside, but an interior skill built through repeated, ordinary choices.$$,
    $$The book moves between contemplative traditions and cognitive science without turning either into decoration. A breathing exercise is placed beside research on focus. A brief teaching on restraint is paired with a study on habit loops. The effect is gentle and practical, as if the author is arranging a desk before inviting the reader to think.$$,
    $$In the middle chapters, Sen describes discipline as a compassionate architecture. Boundaries are not punishments; they are rooms where thought can finally hear itself. The examples are small and believable: how to begin the morning without panic, how to close a day without replaying every failure, how to carry grief without letting it define the entire horizon.$$,
    $$By the end, quietude becomes less a destination than a trustworthy companion. The reader is not promised perfection. Instead, they are offered a steadier relationship to uncertainty, and the comforting idea that peace can be practiced even when the world refuses to grow calm.$$
  ]
where title = 'Quietude of Mind'
  and author = 'Anika Sen';

insert into public.books (
  title,
  author,
  genre,
  language,
  description,
  cover_url,
  total_copies,
  available_copies,
  is_public_readable,
  reading_content
)
select
  seed.title,
  seed.author,
  seed.genre,
  seed.language,
  seed.description,
  null,
  seed.total_copies,
  seed.available_copies,
  true,
  seed.reading_content
from (
  values
    (
      'Archive Letters from the Steppe',
      'Mara Ellison',
      'History',
      'en',
      'A free-reading archival journey through family letters, trade routes, and memory carried across the grasslands.',
      6,
      6,
      array[
        $$The letters begin with weather. Wind direction, horse fatigue, the shape of clouds above the river crossings. Only slowly do they reveal their second purpose: to preserve a moving world before distance and empire flatten it into a single map.$$,
        $$Ellison arranges each fragment with restraint. A merchant writes home about felt, salt, and rumor. A daughter records the songs used to remember safe wells. A scribe notes how names change from camp to camp, while affection survives every translation.$$,
        $$As the archive deepens, the steppe stops feeling empty to the modern eye. It becomes dense with routes, obligations, and intelligence. Every campfire is a library. Every exchange of directions is also an exchange of ethics: how to host, how to warn, how to remember.$$,
        $$The final pages suggest that movement itself can be a form of scholarship. These letters do not ask for a monument. They ask to be read with the same respect usually reserved for capitals, empires, and stone. In doing so, they restore mobility as a maker of knowledge.$$
      ]::text[]
    ),
    (
      'Quantum Notes for Curious Minds',
      'Leah Moritz',
      'Quantum Physics',
      'en',
      'Short, lucid chapters that turn difficult quantum ideas into readable thought experiments and everyday wonder.',
      7,
      7,
      array[
        $$Leah Moritz opens with a promise she keeps: no theatrics, no false certainty, and no condescension. Quantum theory is introduced as a set of careful discoveries that challenged intuition, not as magic wearing the costume of science.$$,
        $$A page on probability is followed by a story about two musicians improvising from opposite rooms. Entanglement is not reduced to metaphor, but the metaphor helps the reader feel why correlation can be stranger than distance. Moritz consistently turns abstraction into orientation.$$,
        $$The most satisfying chapters are the shortest. One explains measurement by talking about questions that change a room the moment they are asked. Another traces how mathematical elegance earns trust only after experiment answers back. The book keeps wonder tethered to method.$$,
        $$By the last section, the reader is not expected to master the field. They are invited to become a better witness to reality's subtler rules. Curiosity, the book argues, is not a weakness before complexity. It is the correct posture for meeting it.$$
      ]::text[]
    ),
    (
      'Neural Garden Handbook',
      'Owen Park',
      'AI',
      'en',
      'An approachable free guide to machine learning told through the language of cultivation, pruning, feedback, and care.',
      8,
      8,
      array[
        $$Owen Park compares model building to tending a garden, but he avoids the usual laziness of tech metaphors. Soil becomes data quality. Water becomes iteration. Pruning becomes the difficult art of removing what looks impressive but does not actually help the system learn.$$,
        $$The handbook shines when it explains feedback. A model is not praised for complexity; it is measured by whether it responds well to reality. Park returns often to the moral dimension of design, warning that careless datasets grow into careless systems, no matter how elegant the architecture appears.$$,
        $$Several chapters are written for readers who fear mathematics. Rather than pretending formulas do not matter, Park shows what they are for. He treats notation as a tool for precision, not a gate meant to keep newcomers outside.$$,
        $$The final pages imagine responsible AI as a long season rather than a breakthrough moment. Gardens fail when they are rushed. Systems do too. What lasts is not the loudest demo, but the quiet practice of building something that can keep learning without causing harm.$$
      ]::text[]
    ),
    (
      'Stoic Lamps in the Dust',
      'Helena Ward',
      'Philosophy',
      'en',
      'Essays on endurance, grace, and moral clarity written for readers who need steadiness more than slogans.',
      5,
      5,
      array[
        $$Helena Ward writes as though philosophy should be usable by sunset. Her essays are spare, unsentimental, and kind. A lamp on a dusty table becomes her recurring image for wisdom: modest, portable, and most valuable when circumstances are least ideal.$$,
        $$The book does not confuse calm with passivity. Ward argues that inner steadiness should sharpen action, not excuse retreat. To govern the self is presented not as isolation, but as preparation for serving others without collapsing into resentment or noise.$$,
        $$One memorable essay describes dignity as a rhythm of returns: returning to breath, to proportion, to the task immediately in front of you. The insight feels ancient and current at once, especially in chapters about distraction, humiliation, and the temptation to perform certainty.$$,
        $$By the closing essay, the lamp is still small, the dust still everywhere, and yet the room has changed. Ward leaves the reader with a philosophy that does not demand perfection. It asks only for practice, honesty, and the courage to keep a little light alive.$$
      ]::text[]
    )
) as seed(title, author, genre, language, description, total_copies, available_copies, reading_content)
where not exists (
  select 1
  from public.books
  where books.title = seed.title
    and books.author = seed.author
);
