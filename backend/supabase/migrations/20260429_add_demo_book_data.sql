-- Add comprehensive demo book data for library testing
-- This migration populates the books table with diverse demo data

insert into public.books (
  title,
  author,
  genre,
  language,
  description,
  total_copies,
  available_copies,
  is_public_readable
)
select
  seed.title,
  seed.author,
  seed.genre,
  seed.language,
  seed.description,
  seed.total_copies,
  seed.available_copies,
  seed.is_public_readable
from (
  values
    -- Fiction
    (
      'The Midnight Library',
      'Matt Haig',
      'Fiction',
      'en',
      'A dazzling novel about all the choices that go into a life well lived, where an endless library of alternate realities stands waiting.',
      5,
      5,
      false
    ),
    (
      'Project Hail Mary',
      'Andy Weir',
      'Science Fiction',
      'en',
      'A lone astronaut must save Earth from extinction. An incredible journey filled with humor, heart, and science.',
      6,
      6,
      false
    ),
    (
      'The House in the Cerulean Sea',
      'TJ Klune',
      'Fantasy',
      'en',
      'A cozy fantasy about a caseworker who investigates an orphanage for magical children. Heartwarming and wonderfully written.',
      5,
      4,
      false
    ),
    (
      'Piranesi',
      'Susanna Clarke',
      'Fantasy',
      'en',
      'A mysterious novel set in an impossible house of halls and staircases, exploring memory, identity, and magic.',
      4,
      3,
      false
    ),
    (
      'The Seven Husbands of Evelyn Hugo',
      'Taylor Jenkins Reid',
      'Fiction',
      'en',
      'Old Hollywood glamour meets intrigue as a reclusive actress reveals her scandalous past to an unknown reporter.',
      6,
      5,
      false
    ),
    
    -- Mystery/Thriller
    (
      'The Thursday Murder Club',
      'Richard Osman',
      'Mystery',
      'en',
      'Four unlikely friends in a retirement village form a murder club. A witty, warm mystery with depth.',
      5,
      4,
      false
    ),
    (
      'A Deadly Education',
      'Naomi Novik',
      'Fantasy',
      'en',
      'A dark academia fantasy about a girl trying to survive magic school while being surrounded by deadly hazards.',
      4,
      4,
      false
    ),
    (
      'The Silent Patient',
      'Alex Michaelides',
      'Thriller',
      'en',
      'A woman shoots her husband five times then never speaks again. A psychotherapist becomes obsessed with uncovering why.',
      6,
      6,
      false
    ),
    
    -- Non-Fiction
    (
      'Educated',
      'Tara Westover',
      'Memoir',
      'en',
      'A memoir about a young woman who leaves her survivalist family to pursue education. Extraordinary and moving.',
      5,
      5,
      false
    ),
    (
      'Atomic Habits',
      'James Clear',
      'Self-Help',
      'en',
      'Practical advice on how small habits lead to remarkable results. Clear, actionable, and transformative.',
      8,
      6,
      false
    ),
    (
      'Sapiens',
      'Yuval Noah Harari',
      'History',
      'en',
      'A sweeping history of humankind from the Stone Age to the present. Thought-provoking and fascinating.',
      7,
      5,
      false
    ),
    (
      'The Innovators',
      'Walter Isaacson',
      'Technology',
      'en',
      'The stories of the geniuses behind the digital revolution. How technology changed the world.',
      5,
      4,
      false
    ),
    
    -- Science & Nature
    (
      'A Brief History of Time',
      'Stephen Hawking',
      'Science',
      'en',
      'An accessible exploration of black holes, the Big Bang, and the nature of time itself.',
      6,
      5,
      false
    ),
    (
      'The Selfish Gene',
      'Richard Dawkins',
      'Science',
      'en',
      'A revolutionary view of evolution centered on genes rather than organisms. Challenges conventional thinking.',
      4,
      4,
      false
    ),
    (
      'Braiding Sweetgrass',
      'Robin Wall Kimmerer',
      'Nature',
      'en',
      'Indigenous wisdom and botanical science weave together in this meditation on gratitude and reciprocity with nature.',
      5,
      3,
      true
    ),
    
    -- Mongolian Titles (Additional)
    (
      'Төрийн мэдээлэл',
      'Д. Баатар',
      'History',
      'mn',
      'Монголын хаан улсын үеийн төрийн байгууллага, засаглалын систем, дипломатын холбоог орхины хөдөлмөрөө.',
      4,
      4,
      false
    ),
    (
      'Эргүүлсэн ойлголт',
      'Л. Амарын',
      'Philosophy',
      'mn',
      'Шавь сэтгэлгүйгээр ойлголтын ухаан, логик сэтгэлгэйдэл, далдагдсан үнэн рүүд дээр сэтгүүлэх бүтээл.',
      3,
      3,
      false
    ),
    (
      'Аялал ба авъяас',
      'М. Өнөр',
      'Travel',
      'mn',
      'Азиар дамжих аялал, уг замдын урлагийн үл үзэгдэх үзүүлэлт, ахуй соёл, түүхэн дурсгал бүхэлтгэлүүдийн цуглуулга.',
      5,
      2,
      false
    ),
    
    -- Young Adult
    (
      'The Poppy War',
      'R.F. Kuang',
      'Fantasy',
      'en',
      'A dark, ambitious fantasy inspired by Chinese history. Epic, violent, and unforgettable.',
      4,
      3,
      false
    ),
    (
      'Six of Crows',
      'Leigh Bardugo',
      'Fantasy',
      'en',
      'A heist novel set in a fantasy world. Witty, thrilling, with unforgettable characters.',
      6,
      4,
      false
    ),
    
    -- Graphic Novels
    (
      'Maus',
      'Art Spiegelman',
      'Graphic Novel',
      'en',
      'A groundbreaking graphic novel about the author''s father and the Holocaust. Powerful and emotional.',
      3,
      3,
      false
    ),
    
    -- Poetry
    (
      'Milk and Honey',
      'Rupi Kaur',
      'Poetry',
      'en',
      'A collection of poetry about love, loss, healing, and femininity. Illustrated and deeply personal.',
      4,
      4,
      false
    ),
    
    -- Short Stories
    (
      'The Haunting of Hill House',
      'Shirley Jackson',
      'Horror',
      'en',
      'A masterpiece of psychological horror. Four seekers encounter something terrifying in a mysterious mansion.',
      4,
      4,
      false
    )
) as seed(title, author, genre, language, description, total_copies, available_copies, is_public_readable)
where not exists (
  select 1
  from public.books
  where books.title = seed.title
    and books.author = seed.author
);

-- Set some books as public readable for the public catalog
update public.books
set is_public_readable = true
where title in (
  'Braiding Sweetgrass',
  'The House in the Cerulean Sea',
  'Piranesi',
  'The Midnight Library'
)
and is_public_readable = false;

-- Add some reading content samples to public readable books
update public.books
set reading_content = array[
  'This is the opening chapter of the book...',
  'Chapter 1: A journey begins...',
  'Chapter 2: Discovery and wonder...'
]
where is_public_readable = true
and reading_content is null;
