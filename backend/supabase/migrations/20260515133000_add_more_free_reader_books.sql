create temporary table more_free_reader_books (
  title text not null,
  author text not null,
  genre text not null,
  language text not null default 'en',
  description text not null,
  total_copies int not null,
  available_copies int not null,
  reading_content text[]
) on commit drop;

insert into more_free_reader_books (
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
  ('Sense and Sensibility', 'Jane Austen', 'Classics', 'en', $$Austen's elegant study of sisters, feeling, restraint, and the social pressure surrounding love and money.$$, 10, 10, null),
  ('Emma', 'Jane Austen', 'Classics', 'en', $$A witty comedy of misread intentions, class confidence, and the slow education of a clever heroine.$$, 10, 10, null),
  ('Persuasion', 'Jane Austen', 'Classics', 'en', $$A quiet, mature romance about regret, second chances, and the courage to trust an old feeling again.$$, 9, 9, null),
  ('Great Expectations', 'Charles Dickens', 'Classics', 'en', $$Dickens follows ambition, shame, money, and loyalty through one of fiction's great coming-of-age arcs.$$, 12, 12, null),
  ('A Tale of Two Cities', 'Charles Dickens', 'Historical Fiction', 'en', $$A revolutionary-era novel of sacrifice, terror, memory, and private devotion under public violence.$$, 12, 12, null),
  ('Oliver Twist', 'Charles Dickens', 'Classics', 'en', $$A social novel about childhood vulnerability, criminal networks, and the hunger for safety and belonging.$$, 10, 10, null),
  ('Wuthering Heights', 'Emily Bronte', 'Gothic', 'en', $$A fierce Gothic novel of obsession, inheritance, landscape, and love that refuses to become gentle.$$, 10, 10, null),
  ('Little Women', 'Louisa May Alcott', 'Classics', 'en', $$A beloved family novel about sisters, work, art, moral growth, and the intimate heroism of ordinary life.$$, 11, 11, null),
  ('Anne of Green Gables', 'L. M. Montgomery', 'Children''s Literature', 'en', $$A radiant coming-of-age story about imagination, belonging, friendship, and the making of a home.$$, 10, 10, null),
  ('The Wind in the Willows', 'Kenneth Grahame', 'Children''s Literature', 'en', $$A riverbank classic of friendship, restlessness, hospitality, and the gentle comedy of creaturely life.$$, 8, 8, null),
  ('Peter Pan', 'J. M. Barrie', 'Fantasy', 'en', $$A dreamlike fantasy about childhood, danger, play, and the ache hidden inside never growing up.$$, 9, 9, null),
  ('The Call of the Wild', 'Jack London', 'Adventure', 'en', $$A lean adventure of instinct, survival, violence, and the pull of an older wilderness.$$, 8, 8, null),
  ('White Fang', 'Jack London', 'Adventure', 'en', $$London reverses the wilderness journey in a story about fear, discipline, trust, and domestication.$$, 8, 8, null),
  ('Around the World in Eighty Days', 'Jules Verne', 'Adventure', 'en', $$A brisk global race built from timetables, chance, loyalty, and the pleasures of precise adventure.$$, 9, 9, null),
  ('Twenty Thousand Leagues under the Seas', 'Jules Verne', 'Science Fiction', 'en', $$A submarine voyage through wonder, science, isolation, and Captain Nemo's wounded mystery.$$, 9, 9, null),
  ('Flatland', 'Edwin A. Abbott', 'Science Fiction', 'en', $$A mathematical satire that turns geometry into social critique, wonder, and dimensional imagination.$$, 7, 7, null),
  ('The Strange Case of Dr. Jekyll and Mr. Hyde', 'Robert Louis Stevenson', 'Gothic', 'en', $$A compact Gothic classic about divided identity, secrecy, reputation, and moral self-deception.$$, 9, 9, null),
  ('The Hound of the Baskervilles', 'Arthur Conan Doyle', 'Mystery', 'en', $$A moody Sherlock Holmes mystery where rational detection moves through legend, fog, and fear.$$, 10, 10, null),
  ('The Memoirs of Sherlock Holmes', 'Arthur Conan Doyle', 'Mystery', 'en', $$A sharp collection of Holmes cases showing disguise, deduction, professional rivalry, and danger.$$, 10, 10, null),
  ('The Moonstone', 'Wilkie Collins', 'Mystery', 'en', $$A landmark detective novel of testimony, suspicion, imperial loot, and a jewel that unsettles everyone near it.$$, 8, 8, null),
  ('The Woman in White', 'Wilkie Collins', 'Mystery', 'en', $$A sensation novel of identity, conspiracy, inheritance, and testimony assembled with tightening suspense.$$, 8, 8, null),
  ('The Turn of the Screw', 'Henry James', 'Gothic', 'en', $$An ambiguous ghost story about perception, authority, innocence, and the terror of uncertain evidence.$$, 7, 7, null),
  ('The Awakening', 'Kate Chopin', 'Fiction', 'en', $$A spare, intense novel about desire, selfhood, marriage, and the cost of awakening in a narrow world.$$, 8, 8, null),
  ('The Yellow Wallpaper', 'Charlotte Perkins Gilman', 'Fiction', 'en', $$A brief and devastating story about confinement, medical authority, voice, and psychological collapse.$$, 7, 7, null),
  ('Crime and Punishment', 'Fyodor Dostoyevsky', 'Classics', 'en', $$A psychological novel of guilt, poverty, pride, suffering, and the search for moral regeneration.$$, 10, 10, null),
  ('War and Peace', 'Leo Tolstoy', 'Classics', 'en', $$Tolstoy's vast novel of families, war, history, love, and the limits of individual command.$$, 12, 12, null),
  ('Anna Karenina', 'Leo Tolstoy', 'Classics', 'en', $$A sweeping novel of marriage, desire, society, agriculture, faith, and the consequences of divided lives.$$, 11, 11, null),
  ('The Odyssey', 'Homer', 'Epic Poetry', 'en', $$An ancient homecoming epic of cunning, longing, hospitality, violence, and the pull of Ithaca.$$, 10, 10, null),
  ('The Art of War', 'Sun Tzu', 'Strategy', 'en', $$A compact strategic classic about perception, timing, discipline, and winning before conflict hardens.$$, 9, 9, null),
  ('Meditations', 'Marcus Aurelius', 'Philosophy', 'en', $$Private Stoic reflections on attention, mortality, duty, self-command, and meeting the day honestly.$$, 9, 9, null),
  ('Walden', 'Henry David Thoreau', 'Nature', 'en', $$A reflective experiment in simple living, observation, labor, solitude, and the moral pressure of nature.$$, 8, 8, null),
  ('The Souls of Black Folk', 'W. E. B. Du Bois', 'History', 'en', $$A foundational work of history, sociology, music, and political thought on Black life after Reconstruction.$$, 8, 8, null),
  ('Narrative of the Life of Frederick Douglass', 'Frederick Douglass', 'History', 'en', $$A powerful autobiography of enslavement, literacy, resistance, and the claim to human freedom.$$, 8, 8, null),
  ('Incidents in the Life of a Slave Girl', 'Harriet Jacobs', 'History', 'en', $$A vital slave narrative centered on motherhood, survival, concealment, and the violence of ownership.$$, 8, 8, null),
  ('The Importance of Being Earnest', 'Oscar Wilde', 'Drama', 'en', $$A sparkling comedy of names, manners, masks, and social absurdity sharpened into perfect farce.$$, 7, 7, null),
  ('Grimms'' Fairy Tales', 'Jacob Grimm and Wilhelm Grimm', 'Fairy Tales', 'en', $$A classic collection of enchanted bargains, forest trials, transformations, danger, and folk justice.$$, 9, 9, null),
  ('Andersen''s Fairy Tales', 'Hans Christian Andersen', 'Fairy Tales', 'en', $$Tender and strange literary fairy tales about longing, beauty, sacrifice, and difficult wonder.$$, 9, 9, null);

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
from more_free_reader_books as seed
where not exists (
  select 1
  from public.books
  where lower(trim(public.books.title)) = lower(trim(seed.title))
    and lower(trim(public.books.author)) = lower(trim(seed.author))
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
  reading_content = coalesce(public.books.reading_content, seed.reading_content)
from more_free_reader_books as seed
where lower(trim(public.books.title)) = lower(trim(seed.title))
  and lower(trim(public.books.author)) = lower(trim(seed.author));
