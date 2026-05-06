-- Simple SQL script to insert demo books
-- Run this in Supabase SQL Editor or via CLI

INSERT INTO public.books (
  title,
  author,
  genre,
  language,
  description,
  total_copies,
  available_copies,
  is_public_readable
)
VALUES
  ('The Midnight Library', 'Matt Haig', 'Fiction', 'en', 'A dazzling novel about all the choices that go into a life well lived.', 5, 5, false),
  ('Project Hail Mary', 'Andy Weir', 'Science Fiction', 'en', 'A lone astronaut must save Earth from extinction.', 6, 6, false),
  ('The House in the Cerulean Sea', 'TJ Klune', 'Fantasy', 'en', 'A cozy fantasy about a caseworker investigating an orphanage for magical children.', 5, 4, true),
  ('Piranesi', 'Susanna Clarke', 'Fantasy', 'en', 'A mysterious novel set in an impossible house of halls and staircases.', 4, 3, true),
  ('The Seven Husbands of Evelyn Hugo', 'Taylor Jenkins Reid', 'Fiction', 'en', 'Old Hollywood glamour meets intrigue as a reclusive actress reveals her past.', 6, 5, false),
  ('The Thursday Murder Club', 'Richard Osman', 'Mystery', 'en', 'Four unlikely friends in a retirement village form a murder club.', 5, 4, false),
  ('A Deadly Education', 'Naomi Novik', 'Fantasy', 'en', 'A dark academia fantasy about surviving magic school.', 4, 4, false),
  ('The Silent Patient', 'Alex Michaelides', 'Thriller', 'en', 'A woman shoots her husband five times then never speaks again.', 6, 6, false),
  ('Educated', 'Tara Westover', 'Memoir', 'en', 'A memoir about leaving a survivalist family to pursue education.', 5, 5, false),
  ('Atomic Habits', 'James Clear', 'Self-Help', 'en', 'Practical advice on how small habits lead to remarkable results.', 8, 6, false),
  ('Sapiens', 'Yuval Noah Harari', 'History', 'en', 'A sweeping history of humankind from the Stone Age to present.', 7, 5, false),
  ('The Innovators', 'Walter Isaacson', 'Technology', 'en', 'Stories of the geniuses behind the digital revolution.', 5, 4, false),
  ('A Brief History of Time', 'Stephen Hawking', 'Science', 'en', 'An exploration of black holes, the Big Bang, and time.', 6, 5, false),
  ('The Selfish Gene', 'Richard Dawkins', 'Science', 'en', 'A revolutionary view of evolution centered on genes.', 4, 4, false),
  ('Braiding Sweetgrass', 'Robin Wall Kimmerer', 'Nature', 'en', 'Indigenous wisdom and botanical science on gratitude and reciprocity.', 5, 3, true),
  ('Pride and Prejudice', 'Jane Austen', 'Classics', 'en', 'A sharp, witty classic about first impressions, family pressures, and a love that learns to deserve itself.', 12, 12, false),
  ('Frankenstein', 'Mary Shelley', 'Classics', 'en', 'A foundational Gothic novel about ambition, responsibility, and the loneliness created when invention outruns compassion.', 10, 10, false),
  ('The Secret Garden', 'Frances Hodgson Burnett', 'Classics', 'en', 'A restorative classic in which grief, friendship, and a neglected garden slowly bring a household back to life.', 9, 9, false),
  ('The Adventures of Sherlock Holmes', 'Arthur Conan Doyle', 'Mystery', 'en', 'Twelve detective adventures filled with deduction, disguises, and the brisk intelligence of Baker Street.', 11, 11, false),
  ('The Wonderful Wizard of Oz', 'L. Frank Baum', 'Fantasy', 'en', 'A bright American fantasy about courage, tenderness, and the strange companions found on the road home.', 8, 8, false),
  ('A Little Princess', 'Frances Hodgson Burnett', 'Classics', 'en', 'A resilient coming-of-age classic about imagination, dignity, and kindness preserved under hardship.', 8, 7, false),
  ('The Poppy War', 'R.F. Kuang', 'Fantasy', 'en', 'A dark ambitious fantasy inspired by Chinese history.', 4, 3, false),
  ('Six of Crows', 'Leigh Bardugo', 'Fantasy', 'en', 'A heist novel set in a fantasy world with unforgettable characters.', 6, 4, false),
  ('Maus', 'Art Spiegelman', 'Graphic Novel', 'en', 'A groundbreaking graphic novel about the Holocaust.', 3, 3, false),
  ('Milk and Honey', 'Rupi Kaur', 'Poetry', 'en', 'Poetry about love, loss, healing, and femininity.', 4, 4, false),
  ('The Haunting of Hill House', 'Shirley Jackson', 'Horror', 'en', 'A masterpiece of psychological horror in a mysterious mansion.', 4, 4, false),
  ('Төрийн мэдээлэл', 'Д. Баатар', 'History', 'mn', 'Монголын хаан улсын үеийн төрийн байгууллага, засаглалын систем.', 4, 4, false),
  ('Эргүүлсэн ойлголт', 'Л. Амарын', 'Philosophy', 'mn', 'Ойлголтын ухаан, логик сэтгэлгэйдэл, далдагдсан үнэн.', 3, 3, false),
  ('Аялал ба авъяас', 'М. Өнөр', 'Travel', 'mn', 'Азиар дамжих аялал ба урлагийн үл үзэгдэх үзүүлэлтүүд.', 5, 2, false)
ON CONFLICT (title, author) DO NOTHING;

UPDATE public.books
SET
  borrow_price = CASE
    WHEN is_public_readable THEN 0
    ELSE COALESCE(borrow_price, 3500)
  END,
  borrow_currency = COALESCE(NULLIF(TRIM(borrow_currency), ''), 'MNT')
WHERE is_public_readable = true
   OR borrow_price IS NULL
   OR borrow_currency IS NULL
   OR TRIM(borrow_currency) = '';

-- Add reading content to public readable books
UPDATE public.books
SET reading_content = array[
  'This is the opening chapter of the book...',
  'Chapter 1: A journey begins...',
  'Chapter 2: Discovery and wonder...'
]
WHERE is_public_readable = true
AND reading_content IS NULL;

UPDATE public.books
SET reading_content = array[
  'Jane Austen opens with a household alert to fortune, status, and the sudden arrival of eligible company. The comedy is immediate, but beneath it sits a precise study of how quickly people turn assumptions into moral verdicts.',
  'Elizabeth Bennet moves through these rooms with intelligence and self-respect, yet the novel never flatters her into infallibility. Austen lets wit sparkle while quietly asking how pride can hide inside discernment and how prejudice can disguise itself as good judgment.',
  'By the final chapters, affection matters less as romance alone than as a form of earned clarity. Austen leaves the reader with the pleasure of resolution and the deeper satisfaction of watching people learn to see one another more truthfully.'
]
WHERE title = 'Pride and Prejudice'
AND author = 'Jane Austen';

UPDATE public.books
SET reading_content = array[
  'Mary Shelley frames discovery as both seduction and warning. Victor Frankenstein pursues knowledge with the fervor of someone who mistakes possibility for permission, and the novel begins asking about consequences long before the creature speaks.',
  'What makes the book endure is not only its storm, secrecy, and dread, but its attention to abandonment. Creation here is not celebrated as a triumph of genius. It becomes a moral test that Victor fails the instant he refuses care.',
  'Frankenstein remains powerful because it insists that innovation without responsibility is not greatness. It is ruin postponed.'
]
WHERE title = 'Frankenstein'
AND author = 'Mary Shelley';

UPDATE public.books
SET reading_content = array[
  'Frances Hodgson Burnett begins with a child made sharp by neglect and sudden loss. Mary arrives at Misselthwaite Manor closed off from warmth, and the novel carefully links her inner barrenness to the locked rooms and winter grounds around her.',
  'The garden changes the pace of everything. Digging, planting, and waiting create a rhythm in which attention itself becomes healing.',
  'By the close, the garden stands as more than a place of beauty. It becomes proof that neglected lives can answer to patience, sunlight, and honest affection.'
]
WHERE title = 'The Secret Garden'
AND author = 'Frances Hodgson Burnett';

UPDATE public.books
SET reading_content = array[
  'Arthur Conan Doyle wastes little time before making observation feel theatrical. A hat, a sleeve, a footprint, or a hesitation in speech becomes enough for Sherlock Holmes to reconstruct entire private histories with unnerving confidence.',
  'Watson''s narration is essential to the pleasure. He gives Holmes an audience sturdy enough for admiration yet human enough for surprise.',
  'The enduring charm lies in the balance between logic and atmosphere, curiosity and a well-placed reveal.'
]
WHERE title = 'The Adventures of Sherlock Holmes'
AND author = 'Arthur Conan Doyle';

UPDATE public.books
SET reading_content = array[
  'Baum sends Dorothy into Oz with the clean logic of a fairy tale and the emotional clarity of a child who simply wants to return home.',
  'Each companion embodies an anxiety already familiar to the reader: not being clever enough, brave enough, or loving enough.',
  'By the ending, home has gained definition through absence, and the road has already taught what magic only confirms.'
]
WHERE title = 'The Wonderful Wizard of Oz'
AND author = 'L. Frank Baum';

UPDATE public.books
SET reading_content = array[
  'Sara Crewe enters school with privilege, intelligence, and an imagination that makes ordinary rooms feel larger than they are.',
  'When fortune collapses, the novel becomes a study in composure under humiliation and the discipline of remaining humane.',
  'Its conclusion restores more than comfort. It restores recognition, affirming that dignity kept in secret often survives long enough to be seen and answered.'
]
WHERE title = 'A Little Princess'
AND author = 'Frances Hodgson Burnett';

UPDATE public.books
SET
  borrow_price = 0,
  borrow_currency = COALESCE(NULLIF(TRIM(borrow_currency), ''), 'MNT'),
  is_public_readable = CASE
    WHEN reading_content IS NOT NULL THEN true
    ELSE is_public_readable
  END;
