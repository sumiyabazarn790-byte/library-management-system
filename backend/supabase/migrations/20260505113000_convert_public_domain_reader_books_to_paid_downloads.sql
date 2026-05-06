update public.books
set
  is_public_readable = false,
  borrow_price = 3500,
  borrow_currency = 'MNT'
where (title, author) in (
  ('Pride and Prejudice', 'Jane Austen'),
  ('Frankenstein', 'Mary Shelley'),
  ('The Secret Garden', 'Frances Hodgson Burnett'),
  ('The Adventures of Sherlock Holmes', 'Arthur Conan Doyle'),
  ('The Wonderful Wizard of Oz', 'L. Frank Baum'),
  ('A Little Princess', 'Frances Hodgson Burnett')
);
