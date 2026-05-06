update public.books
set reading_content = array[
  $$It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife.$$,
  $$However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.$$,
  $$"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"$$,
  $$"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."$$
]::text[]
where title = 'Pride and Prejudice'
  and author = 'Jane Austen';

update public.books
set reading_content = array[
  $$You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings.$$,
  $$I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.$$,
  $$I am already far north of London, and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves and fills me with delight.$$,
  $$Do you understand this feeling? This breeze, which has travelled from the regions towards which I am advancing, gives me a foretaste of those icy climes.$$
]::text[]
where title = 'Frankenstein'
  and author = 'Mary Shelley';

update public.books
set reading_content = array[
  $$When Mary Lennox was sent to Misselthwaite Manor to live with her uncle everybody said she was the most disagreeable-looking child ever seen.$$,
  $$It was true, too. She had a little thin face and a little thin body, thin light hair and a sour expression.$$,
  $$Her hair was yellow, and her face was yellow because she had been born in India and had always been ill in one way or another.$$,
  $$Her father had held a position under the English Government and had always been busy and ill himself, and her mother had been a great beauty who cared only to go to parties and amuse herself with gay people.$$
]::text[]
where title = 'The Secret Garden'
  and author = 'Frances Hodgson Burnett';

update public.books
set reading_content = array[
  $$To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name.$$,
  $$In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler.$$,
  $$All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind.$$,
  $$He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position.$$
]::text[]
where title = 'The Adventures of Sherlock Holmes'
  and author = 'Arthur Conan Doyle';

update public.books
set reading_content = array[
  $$Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer's wife.$$,
  $$Their house was small, for the lumber to build it had to be carried by wagon many miles.$$,
  $$There were four walls, a floor and a roof, which made one room; and this room contained a rusty looking cookstove, a cupboard for the dishes, a table, three or four chairs, and the beds.$$,
  $$When Aunt Em came there to live she was a young, pretty wife. The sun and wind had changed her, too.$$
]::text[]
where title = 'The Wonderful Wizard of Oz'
  and author = 'L. Frank Baum';

update public.books
set reading_content = array[
  $$Once on a dark winter's day, when the yellow fog hung so thick and heavy in the streets of London that the lamps were lighted and the shop fronts looked as if they were already beginning to prepare for night, there drove up to the door of Miss Minchin's Select Seminary for Young Ladies a rather dingy cab.$$,
  $$It was the arrival of a new pupil who had left India with her papa to be placed at school.$$,
  $$As the big cab drew up, Miss Minchin, who was watching it from the front drawing-room, came out to meet the little girl when she was brought into the house by her father.$$,
  $$Sara Crewe was seven years old. She was a queer little figure, dressed in deep mourning, and holding herself very erect.$$
]::text[]
where title = 'A Little Princess'
  and author = 'Frances Hodgson Burnett';
