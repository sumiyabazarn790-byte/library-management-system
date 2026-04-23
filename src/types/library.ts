export type Book = {
  id: string;
  title: string;
  author: string;
  genre: string;
  language: string;
  description: string;
  cover_url: string | null;
  total_copies: number;
  available_copies: number;
};

export type Loan = {
  id: string;
  user_id: string;
  book_id: string;
  status: "requested" | "active" | "returned" | "cancelled";
  loaned_at: string;
  due_date: string;
  returned_at: string | null;
};
