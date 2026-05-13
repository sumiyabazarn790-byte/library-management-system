create temporary table google_free_reader_books (
  title text not null,
  author text not null,
  genre text not null,
  language text not null,
  description text not null,
  total_copies int not null,
  available_copies int not null,
  reading_content text[] not null
) on commit drop;

insert into google_free_reader_books (
  title,
  author,
  genre,
  language,
  description,
  total_copies,
  available_copies,
  reading_content
)
values
  (
    'Jane Eyre',
    'Charlotte Bronte',
    'Classics',
    'en',
    'A public-domain classic available through Google Books, following Jane from a harsh childhood into a life shaped by conscience, love, and self-command.',
    10,
    10,
    array[
      $$Jane Eyre begins as a story of a child who has almost no power but a fierce inward life. The early chapters make loneliness concrete, turning rooms, rules, and family cruelty into the pressure that forms Jane's moral independence.$$,
      $$At Lowood, suffering becomes more than background. It tests friendship, faith, discipline, and the difference between submission and strength. Jane learns that endurance matters, but she never confuses endurance with surrender.$$,
      $$The novel's romance is powerful because it is also an argument about equality. Jane refuses to be absorbed by wealth, charm, or authority, and the book keeps returning to the dignity of a self that will not be purchased.$$,
      $$By the close, love is only acceptable after truth has cleared a path for it. Bronte gives the reader a heroine whose happiness depends on integrity first, and that is why the story still feels alive.$$
    ]::text[]
  ),
  (
    'Moby-Dick',
    'Herman Melville',
    'Adventure',
    'en',
    'A public-domain Google Books seafaring epic about obsession, faith, labor, and the whale ship Pequod''s fateful pursuit.',
    9,
    9,
    array[
      $$Melville opens the sea as both escape and summons. Ishmael's decision to sail is practical on the surface, but the novel quickly turns the voyage into a restless inquiry about fate, work, friendship, and dread.$$,
      $$Aboard the Pequod, the ship becomes a floating world. Sailors from many places bring different beliefs and skills, while the daily labor of whaling gives the book its dense texture of craft, danger, and ritual.$$,
      $$Captain Ahab changes adventure into obsession. His pursuit of the white whale is not simply revenge; it becomes a terrifying example of how one wounded imagination can bend an entire community toward ruin.$$,
      $$The novel keeps widening until the hunt feels cosmic. Sea, sermon, science, comedy, and tragedy all collide, making Moby-Dick less a straight voyage than a storm of human meaning.$$
    ]::text[]
  ),
  (
    'The Time Machine',
    'H. G. Wells',
    'Science Fiction',
    'en',
    'A public-domain Google Books science fiction landmark where a Victorian inventor travels into a distant future divided by class and decay.',
    8,
    8,
    array[
      $$Wells begins with a dinner-table challenge to ordinary reality. The Time Traveller turns theory into machinery, and the book makes speculative science feel immediate by placing impossible travel inside a familiar room.$$,
      $$The future first appears gentle, almost pastoral, but its calm is deceptive. The Eloi and the Morlocks reveal a social nightmare in which comfort, labor, dependence, and fear have hardened into separate forms of life.$$,
      $$The adventure works because its ideas keep moving. Every discovery changes the reader's understanding of progress, and the machine becomes less a toy than a lens for looking back at Victorian inequality.$$,
      $$By the final journey, time itself feels vast and indifferent. Wells leaves behind wonder, but also a chill: human achievement means little if civilization forgets responsibility.$$
    ]::text[]
  ),
  (
    'The War of the Worlds',
    'H. G. Wells',
    'Science Fiction',
    'en',
    'A public-domain Google Books invasion novel that turns Martian arrival into a sharp study of panic, empire, and human fragility.',
    8,
    8,
    array[
      $$The War of the Worlds begins by reversing the gaze of empire. Humans, accustomed to assuming mastery, suddenly become the observed, invaded, and vulnerable species under a colder intelligence.$$,
      $$Wells makes catastrophe feel local before it becomes global. Roads, houses, fields, and railway stations become stages for confusion as ordinary systems fail faster than people can understand them.$$,
      $$The Martians are frightening not only because they are powerful, but because they expose how thin civilization can be. The narrator watches courage, selfishness, denial, and tenderness emerge under pressure.$$,
      $$Its ending is memorable because survival does not arrive through human superiority. The novel humbles its species, leaving readers with both relief and a quieter, more uneasy sense of scale.$$
    ]::text[]
  ),
  (
    'Alice''s Adventures in Wonderland',
    'Lewis Carroll',
    'Fantasy',
    'en',
    'A public-domain Google Books fantasy of logic, nonsense, identity, and a child''s strange journey through Wonderland.',
    8,
    8,
    array[
      $$Alice falls into a world where language misbehaves and rules keep changing shape. Carroll turns childhood curiosity into a structure of puzzles, jokes, and sudden transformations.$$,
      $$Wonderland is funny because it is unstable. Conversations refuse to go straight, authority figures speak in riddles, and Alice must keep asking who she is while size, sense, and manners shift around her.$$,
      $$The book's fantasy is not built from distant kingdoms but from logic turned sideways. Arithmetic, poems, courtrooms, tea parties, and etiquette all become playful traps for expectation.$$,
      $$By the end, the dream has tested the border between order and imagination. Alice returns with the strange confidence of someone who has learned that nonsense can reveal the limits of common sense.$$
    ]::text[]
  ),
  (
    'Treasure Island',
    'Robert Louis Stevenson',
    'Adventure',
    'en',
    'A public-domain Google Books adventure of maps, mutiny, pirates, and a boy learning courage under danger.',
    8,
    8,
    array[
      $$Treasure Island moves with the clean force of a map unfolding. Jim Hawkins begins close to home, but the arrival of a sea chest, a song, and a dangerous secret pulls him toward a larger, riskier world.$$,
      $$Stevenson understands the pleasure of adventure as atmosphere and momentum. Inns, ships, coves, and stockades feel charged because every object might become a clue, a weapon, or a betrayal.$$,
      $$Long John Silver gives the book its enduring tension. He is charming, practical, frightening, and persuasive, making villainy feel less like a mask than a talent for surviving every change of wind.$$,
      $$The treasure matters, but Jim's education matters more. The voyage teaches him to read people as carefully as maps, and the story leaves danger shining with both romance and warning.$$
    ]::text[]
  ),
  (
    'The Picture of Dorian Gray',
    'Oscar Wilde',
    'Classics',
    'en',
    'A public-domain Google Books classic about beauty, influence, secrecy, and a portrait that bears the cost of corruption.',
    8,
    8,
    array[
      $$Wilde begins with beauty treated as revelation and temptation. Dorian Gray enters the novel as an object of admiration, but the attention around him quickly becomes a force that distorts his sense of consequence.$$,
      $$The portrait is one of fiction's sharpest moral devices. It separates appearance from truth, allowing Dorian to remain socially untouched while his hidden life accumulates visible damage elsewhere.$$,
      $$The novel sparkles with wit, but its elegance is edged with dread. Conversation becomes seduction, taste becomes doctrine, and influence becomes dangerous when it frees desire from responsibility.$$,
      $$By the end, the bargain has narrowed into a trap. Wilde's story endures because it understands that a life devoted only to sensation can become strangely empty and finally unbearable.$$
    ]::text[]
  ),
  (
    'The Republic',
    'Plato',
    'Philosophy',
    'en',
    'A public-domain Google Books philosophical dialogue on justice, education, politics, and the shape of a well-ordered soul.',
    7,
    7,
    array[
      $$The Republic begins with a question that refuses to stay small: what is justice? Plato lets the conversation widen from personal conduct into the design of cities, education, desire, and knowledge.$$,
      $$Socrates does not offer a simple rulebook. He tests definitions, exposes contradictions, and turns debate into a method for discovering how easily power and appetite can imitate virtue.$$,
      $$The imagined city is also a mirror for the soul. Guardians, producers, rulers, and laws become ways of asking what should govern a human being when competing impulses all claim authority.$$,
      $$Its famous images still carry force because they make philosophy visible. The cave, the divided line, and the philosopher's ascent all insist that truth requires discipline, not just opinion.$$
    ]::text[]
  ),
  (
    'The Prince',
    'Niccolo Machiavelli',
    'Political Philosophy',
    'en',
    'A public-domain Google Books political classic on power, statecraft, fortune, fear, and the difficult ethics of rule.',
    7,
    7,
    array[
      $$The Prince is short, direct, and intentionally unsentimental. Machiavelli studies rule as it is practiced under pressure, separating political survival from the comforting language rulers often use about themselves.$$,
      $$Its power lies in the tension between realism and moral unease. The book asks what leaders do when danger, loyalty, force, and public perception cannot be managed by good intentions alone.$$,
      $$Fortune and virtue are not abstract decorations here. They describe the unstable relationship between circumstance and skill, between the world a ruler inherits and the choices that might still be made.$$,
      $$Readers continue to argue with The Prince because it refuses to be harmless. It is a manual, a warning, and a provocation about what happens when power becomes its own discipline.$$
    ]::text[]
  ),
  (
    'Leaves of Grass',
    'Walt Whitman',
    'Poetry',
    'en',
    'A public-domain Google Books poetry collection of democratic voice, body, nature, labor, and expansive American song.',
    7,
    7,
    array[
      $$Whitman's poems move by breadth and invitation. Leaves of Grass opens the self outward until identity feels connected to streets, fields, work, bodies, strangers, and the pulse of ordinary life.$$,
      $$The collection's free verse is part of its argument. It resists narrow forms because the voice wants room for catalogues, contradictions, tenderness, swagger, grief, and democratic abundance.$$,
      $$Nature and the body are not separate from thought. Whitman treats sensation as a way of knowing, making grass, breath, touch, and movement carry philosophical weight without losing immediacy.$$,
      $$The result is poetry that feels less like a monument than an ongoing address. It keeps calling the reader into a larger sense of kinship, presence, and shared becoming.$$
    ]::text[]
  ),
  (
    'The Jungle Book',
    'Rudyard Kipling',
    'Children''s Classics',
    'en',
    'A public-domain Google Books collection of animal stories, jungle law, belonging, danger, and childhood courage.',
    8,
    8,
    array[
      $$The Jungle Book gathers stories where the natural world has rules as strict as any human society. Mowgli's childhood among animals becomes a way to think about law, loyalty, skill, and belonging.$$,
      $$Kipling's jungle is vivid because it is not merely decorative. Each creature carries a code of movement, speech, danger, or memory, and the young hero survives by learning those codes carefully.$$,
      $$The stories balance wonder with discipline. Freedom is never lawlessness; it depends on attention, respect, and the ability to understand what different communities demand.$$,
      $$As a children's classic, the book endures through rhythm, danger, and memorable figures. It offers adventure, but also a serious lesson about growing up between worlds.$$
    ]::text[]
  ),
  (
    'Dracula',
    'Bram Stoker',
    'Gothic Horror',
    'en',
    'A public-domain Google Books Gothic horror novel of diaries, letters, pursuit, modern technology, and ancient fear.',
    8,
    8,
    array[
      $$Dracula builds fear through documents: journals, letters, telegrams, and reports that make horror feel assembled from evidence. The form gives the supernatural a chilling air of investigation.$$,
      $$Stoker's count is terrifying because he crosses boundaries: old world and modern city, life and death, invitation and violation. Every threshold in the novel becomes charged with danger.$$,
      $$The human response depends on collaboration. Doctors, friends, lovers, and investigators pool knowledge, showing that the fight against ancient predation requires trust as much as bravery.$$,
      $$Its Gothic power remains strong because it joins atmosphere with pursuit. Castles, ships, bedrooms, and graveyards all become part of a wider struggle over desire, contagion, and will.$$
    ]::text[]
  );

insert into public.books (
  title,
  author,
  genre,
  language,
  description,
  total_copies,
  available_copies,
  borrow_price,
  borrow_currency,
  is_public_readable,
  reading_content
)
select
  seed.title,
  seed.author,
  seed.genre,
  seed.language,
  seed.description,
  seed.total_copies,
  seed.available_copies,
  0,
  'MNT',
  true,
  seed.reading_content
from google_free_reader_books as seed
where not exists (
  select 1
  from public.books
  where lower(trim(books.title)) = lower(trim(seed.title))
    and lower(trim(books.author)) = lower(trim(seed.author))
);

update public.books
set
  genre = seed.genre,
  language = seed.language,
  description = seed.description,
  total_copies = greatest(public.books.total_copies, seed.total_copies),
  available_copies = greatest(public.books.available_copies, seed.available_copies),
  borrow_price = 0,
  borrow_currency = 'MNT',
  is_public_readable = true,
  reading_content = seed.reading_content
from google_free_reader_books as seed
where lower(trim(public.books.title)) = lower(trim(seed.title))
  and lower(trim(public.books.author)) = lower(trim(seed.author));
