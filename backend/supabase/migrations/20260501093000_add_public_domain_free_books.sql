insert into public.books (
  title,
  author,
  genre,
  language,
  description,
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
  seed.total_copies,
  seed.available_copies,
  true,
  seed.reading_content
from (
  values
    (
      'Pride and Prejudice',
      'Jane Austen',
      'Classics',
      'en',
      'A sharp, witty classic about first impressions, family pressures, and a love that learns to deserve itself.',
      12,
      12,
      array[
        $$Jane Austen opens with a household alert to fortune, status, and the sudden arrival of eligible company. The comedy is immediate, but beneath it sits a precise study of how quickly people turn assumptions into moral verdicts.$$,
        $$Elizabeth Bennet moves through these rooms with intelligence and self-respect, yet the novel never flatters her into infallibility. Austen lets wit sparkle while quietly asking how pride can hide inside discernment and how prejudice can disguise itself as good judgment.$$,
        $$The middle of the book widens from drawing-room flirtation into questions of family duty, vulnerability, and character proven under pressure. Politeness becomes a social instrument that can protect, mislead, or expose depending on who is using it.$$,
        $$By the final chapters, affection matters less as romance alone than as a form of earned clarity. Austen leaves the reader with the pleasure of resolution and the deeper satisfaction of watching people learn to see one another more truthfully.$$
      ]::text[]
    ),
    (
      'Frankenstein',
      'Mary Shelley',
      'Classics',
      'en',
      'A foundational Gothic novel about ambition, responsibility, and the loneliness created when invention outruns compassion.',
      10,
      10,
      array[
        $$Mary Shelley frames discovery as both seduction and warning. Victor Frankenstein pursues knowledge with the fervor of someone who mistakes possibility for permission, and the novel begins asking about consequences long before the creature speaks.$$,
        $$What makes the book endure is not only its storm, secrecy, and dread, but its attention to abandonment. Creation here is not celebrated as a triumph of genius. It becomes a moral test that Victor fails the instant he refuses care.$$,
        $$When the creature tells his own story, the emotional balance of the novel shifts. Shelley gives him language, memory, and longing, forcing the reader to confront how cruelty is often manufactured by exclusion before it erupts into violence.$$,
        $$The ending does not offer clean punishment so much as a frozen reckoning. Frankenstein remains powerful because it insists that innovation without responsibility is not greatness. It is ruin postponed.$$
      ]::text[]
    ),
    (
      'The Secret Garden',
      'Frances Hodgson Burnett',
      'Classics',
      'en',
      'A restorative classic in which grief, friendship, and a neglected garden slowly bring a household back to life.',
      9,
      9,
      array[
        $$Frances Hodgson Burnett begins with a child made sharp by neglect and sudden loss. Mary arrives at Misselthwaite Manor closed off from warmth, and the novel carefully links her inner barrenness to the locked rooms and winter grounds around her.$$,
        $$The garden changes the pace of everything. Digging, planting, and waiting create a rhythm in which attention itself becomes healing. Burnett never turns nature into magic alone; she shows restoration as daily practice shared among children who begin to trust one another.$$,
        $$Dickon brings gentleness, Colin brings wounded pride, and Mary slowly discovers that care can be learned even after a loveless start. Their companionship gives the book its warmth, making transformation feel communal rather than sentimental.$$,
        $$By the close, the garden stands as more than a place of beauty. It becomes proof that neglected lives can answer to patience, sunlight, and honest affection, and that renewal often begins in hidden places.$$
      ]::text[]
    ),
    (
      'The Adventures of Sherlock Holmes',
      'Arthur Conan Doyle',
      'Mystery',
      'en',
      'Twelve detective adventures filled with deduction, disguises, and the brisk intelligence of Baker Street.',
      11,
      11,
      array[
        $$Arthur Conan Doyle wastes little time before making observation feel theatrical. A hat, a sleeve, a footprint, or a hesitation in speech becomes enough for Sherlock Holmes to reconstruct entire private histories with unnerving confidence.$$,
        $$Watson's narration is essential to the pleasure. He gives Holmes an audience sturdy enough for admiration yet human enough for surprise, so each case becomes not just a puzzle but a performance measured against ordinary perception.$$,
        $$Across the collection, London feels crowded with codes, disguises, inheritance anxieties, and social masks. Doyle keeps the prose quick and exact, making even the strangest plots feel grounded by method and momentum.$$,
        $$The enduring charm lies in the balance between logic and atmosphere. Holmes solves what others cannot see, but the stories remain enjoyable because they never forget curiosity, suspense, and the thrill of a well-placed reveal.$$
      ]::text[]
    ),
    (
      'The Wonderful Wizard of Oz',
      'L. Frank Baum',
      'Fantasy',
      'en',
      'A bright American fantasy about courage, tenderness, and the strange companions found on the road home.',
      8,
      8,
      array[
        $$Baum sends Dorothy into Oz with the clean logic of a fairy tale and the emotional clarity of a child who simply wants to return home. The journey begins in upheaval, but the book quickly turns displacement into discovery.$$,
        $$Each companion embodies an anxiety already familiar to the reader: not being clever enough, brave enough, or loving enough. What gives the story heart is that the travelers repeatedly practice the very virtues they think they lack.$$,
        $$Oz itself is colorful without becoming shapeless. Strange cities, dangerous fields, and theatrical rulers all serve the deeper pattern of the quest, keeping wonder tied to movement and choice.$$,
        $$By the ending, home has gained definition through absence. Baum leaves behind a cheerful but durable lesson: what people seek from authority or magic often begins as an undeclared strength already traveling with them.$$
      ]::text[]
    ),
    (
      'A Little Princess',
      'Frances Hodgson Burnett',
      'Classics',
      'en',
      'A resilient coming-of-age classic about imagination, dignity, and kindness preserved under hardship.',
      8,
      7,
      array[
        $$Sara Crewe enters school with privilege, intelligence, and an imagination that makes ordinary rooms feel larger than they are. Burnett establishes early that storytelling is not escape alone, but a moral habit that helps Sara preserve generosity.$$,
        $$When fortune collapses, the novel becomes a study in composure under humiliation. Sara suffers, but the book's emphasis falls on the discipline of remaining humane when circumstances invite bitterness.$$,
        $$The boarding-school setting sharpens every contrast between cruelty and kindness, display and inner worth. Small mercies matter immensely, and Burnett understands how hunger, cold, and loneliness alter the scale of a child's world.$$,
        $$Its conclusion satisfies because it restores more than comfort. It restores recognition, affirming that dignity kept in secret often survives long enough to be seen and answered.$$
      ]::text[]
    )
) as seed(title, author, genre, language, description, total_copies, available_copies, reading_content)
where not exists (
  select 1
  from public.books
  where books.title = seed.title
    and books.author = seed.author
);
