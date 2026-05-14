create temporary table allowed_free_reader_books (
  title text not null,
  author text not null
) on commit drop;

insert into allowed_free_reader_books (title, author)
values
  ('Pride and Prejudice', 'Jane Austen'),
  ('Frankenstein', 'Mary Shelley'),
  ('The Secret Garden', 'Frances Hodgson Burnett'),
  ('The Adventures of Sherlock Holmes', 'Arthur Conan Doyle'),
  ('The Wonderful Wizard of Oz', 'L. Frank Baum'),
  ('A Little Princess', 'Frances Hodgson Burnett'),
  ('Jane Eyre', 'Charlotte Bronte'),
  ('Moby-Dick', 'Herman Melville'),
  ('The Time Machine', 'H. G. Wells'),
  ('The War of the Worlds', 'H. G. Wells'),
  ('Alice''s Adventures in Wonderland', 'Lewis Carroll'),
  ('Treasure Island', 'Robert Louis Stevenson'),
  ('The Picture of Dorian Gray', 'Oscar Wilde'),
  ('The Republic', 'Plato'),
  ('The Prince', 'Niccolo Machiavelli'),
  ('Leaves of Grass', 'Walt Whitman'),
  ('The Jungle Book', 'Rudyard Kipling'),
  ('Dracula', 'Bram Stoker'),
  ('Монголын нууц товчоо', 'Unknown');

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
  'Монголын нууц товчоо',
  'Unknown',
  'History',
  'mn',
  'Монголын эртний түүх, төр улс бүрэлдсэн замнал, нүүдэлчдийн ёс заншил, дурсамжийг өгүүлсэн шастир.',
  10,
  10,
  0,
  'MNT',
  true,
  array[
    $$Монголын нууц товчоо нь Тэмүүжин хэрхэн овог аймгийн задрал, урвалт, эвслийн дундуур өөрийн байр суурийг бэхжүүлж, хүмүүсийн үнэнч байдал ба эрх мэдлийн үнээр төр улсыг байгуулсан тухай өргөн хүрээтэй өгүүлдэг. Нэг хүний замналын цаана бүхэл бүтэн нүүдэлчдийн ертөнцийн ёс заншил, ахуй, улс төрийн хэлбэр амьсгалж байдаг.$$,
    $$Энэ шастирын хүч нь зөвхөн түүхэн мэдээлэлдээ биш, харин дуу хоолойндоо байдаг. Эцэг өвгөдийн нэр, андгай тангараг, гашуудал, ялалт, цээрлэл бүгд аман уламжлалын хэмнэлтэйгээр урагшилж, уншигчид XIII зууны Монголын сэтгэлгээний ойролцоо очих боломж өгдөг. Тиймээс уг бүтээл бол архивын баримт төдий бус, соёлын ой санамжийн хэлбэр юм.$$,
    $$Тэмүүжиний өсөлттэй хамт нөхөрлөл ба урвалт хоёр байнга зэрэгцэн гарч ирдэг. Хүний зан чанар, овгийн ашиг сонирхол, дайны шаардлага гурав мөргөлдөх үед ямар шийдвэр гарч байсныг текст маш тод харуулдаг. Энэ нь Чингис хааны дүрийг домог болгож хэт энгийнчлэхгүй, харин түүхийн дотоод зөрчилтэй орчинд тавьж ойлгуулахад тусалдаг.$$,
    $$Өнөөдөр Монголын нууц товчоог уншихад зөвхөн эх сурвалжийн үнэ цэнэ биш, үндэстний өөрийгөө ойлгох хэлбэр ч мэдрэгддэг. Хэл найруулга, үйл явдлын дараалал, хүний холбоо харилцааны зураглал нь төр, гэр бүл, анд нөхөр, дайсны тухай ойлголтууд хэрхэн бүтээгдэж ирснийг харуулж, орчин үеийн уншигчидтай ч холбогдох асуултуудыг нээж өгдөг.$$
  ]::text[]
where not exists (
  select 1
  from public.books
  where lower(trim(books.title)) = lower(trim('Монголын нууц товчоо'))
    and lower(trim(books.author)) = lower(trim('Unknown'))
);

update public.books
set
  genre = 'History',
  language = 'mn',
  description = 'Монголын эртний түүх, төр улс бүрэлдсэн замнал, нүүдэлчдийн ёс заншил, дурсамжийг өгүүлсэн шастир.',
  total_copies = 10,
  available_copies = 10,
  borrow_price = 0,
  borrow_currency = 'MNT',
  is_public_readable = true,
  reading_content = array[
    $$Монголын нууц товчоо нь Тэмүүжин хэрхэн овог аймгийн задрал, урвалт, эвслийн дундуур өөрийн байр суурийг бэхжүүлж, хүмүүсийн үнэнч байдал ба эрх мэдлийн үнээр төр улсыг байгуулсан тухай өргөн хүрээтэй өгүүлдэг. Нэг хүний замналын цаана бүхэл бүтэн нүүдэлчдийн ертөнцийн ёс заншил, ахуй, улс төрийн хэлбэр амьсгалж байдаг.$$,
    $$Энэ шастирын хүч нь зөвхөн түүхэн мэдээлэлдээ биш, харин дуу хоолойндоо байдаг. Эцэг өвгөдийн нэр, андгай тангараг, гашуудал, ялалт, цээрлэл бүгд аман уламжлалын хэмнэлтэйгээр урагшилж, уншигчид XIII зууны Монголын сэтгэлгээний ойролцоо очих боломж өгдөг. Тиймээс уг бүтээл бол архивын баримт төдий бус, соёлын ой санамжийн хэлбэр юм.$$,
    $$Тэмүүжиний өсөлттэй хамт нөхөрлөл ба урвалт хоёр байнга зэрэгцэн гарч ирдэг. Хүний зан чанар, овгийн ашиг сонирхол, дайны шаардлага гурав мөргөлдөх үед ямар шийдвэр гарч байсныг текст маш тод харуулдаг. Энэ нь Чингис хааны дүрийг домог болгож хэт энгийнчлэхгүй, харин түүхийн дотоод зөрчилтэй орчинд тавьж ойлгуулахад тусалдаг.$$,
    $$Өнөөдөр Монголын нууц товчоог уншихад зөвхөн эх сурвалжийн үнэ цэнэ биш, үндэстний өөрийгөө ойлгох хэлбэр ч мэдрэгддэг. Хэл найруулга, үйл явдлын дараалал, хүний холбоо харилцааны зураглал нь төр, гэр бүл, анд нөхөр, дайсны тухай ойлголтууд хэрхэн бүтээгдэж ирснийг харуулж, орчин үеийн уншигчидтай ч холбогдох асуултуудыг нээж өгдөг.$$
  ]::text[]
where lower(trim(public.books.title)) = lower(trim('Монголын нууц товчоо'))
  and lower(trim(public.books.author)) = lower(trim('Unknown'));

update public.books
set
  borrow_price = 0,
  borrow_currency = 'MNT',
  is_public_readable = true
where exists (
  select 1
  from allowed_free_reader_books as allowed
  where lower(trim(public.books.title)) = lower(trim(allowed.title))
    and lower(trim(public.books.author)) = lower(trim(allowed.author))
);

delete from public.books
where not exists (
  select 1
  from allowed_free_reader_books as allowed
  where lower(trim(public.books.title)) = lower(trim(allowed.title))
    and lower(trim(public.books.author)) = lower(trim(allowed.author))
);
