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
  borrow_price?: number | null;
  borrow_currency?: string | null;
  is_public_readable?: boolean;
  reading_content?: string[] | null;
};

export type ProfileRole = "member" | "admin";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  preferred_genres: string[] | null;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
};

export type LoanStatus = "requested" | "active" | "returned" | "cancelled";

export type Loan = {
  id: string;
  user_id: string;
  book_id: string;
  status: LoanStatus;
  loaned_at: string;
  due_date: string;
  returned_at: string | null;
};

export type LoanWithBook = Loan & { book: Book };

export type SaleListingStatus = "active" | "sold" | "cancelled";

export type SaleListing = {
  id: string;
  user_id: string;
  book_id: string;
  price: number;
  currency: string;
  note: string | null;
  status: SaleListingStatus;
  created_at: string;
  updated_at: string;
};

export type SavedBook = {
  id: string;
  user_id: string;
  book_id: string;
  created_at: string;
};

export type SavedBookWithBook = SavedBook & { book: Book };
