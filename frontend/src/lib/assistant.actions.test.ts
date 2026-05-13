import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Book, LoanWithBook, Profile } from "@/types/library";

const libraryMocks = vi.hoisted(() => ({
  canReadBookNow: vi.fn(() => false),
  fetchLoans: vi.fn(),
  fetchPublicReadableBooks: vi.fn(),
  fetchRecommendedBooks: vi.fn(),
  formatLibraryDate: vi.fn(() => "2026-05-11"),
  resolveBookId: vi.fn(),
  searchBooks: vi.fn(),
  toFriendlyLibraryError: vi.fn((message: string) => message),
}));

const availabilityMocks = vi.hoisted(() => ({
  getReason: vi.fn(() => null),
}));

const supabaseMocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/lib/library", () => ({
  canReadBookNow: libraryMocks.canReadBookNow,
  fetchLoans: libraryMocks.fetchLoans,
  fetchPublicReadableBooks: libraryMocks.fetchPublicReadableBooks,
  fetchRecommendedBooks: libraryMocks.fetchRecommendedBooks,
  formatLibraryDate: libraryMocks.formatLibraryDate,
  resolveBookId: libraryMocks.resolveBookId,
  searchBooks: libraryMocks.searchBooks,
  toFriendlyLibraryError: libraryMocks.toFriendlyLibraryError,
}));

vi.mock("@/integrations/supabase/availability", () => ({
  getSupabaseUnavailableReason: availabilityMocks.getReason,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: supabaseMocks.rpc,
  },
}));

type AssistantModule = typeof import("./assistant");

let assistant: AssistantModule;

const baseBook = (overrides: Partial<Book> = {}): Book => ({
  id: "book-1",
  title: "Atomic Habits",
  author: "James Clear",
  genre: "Self-Help",
  language: "en",
  description: "A practical book about habit systems and change.",
  cover_url: null,
  total_copies: 6,
  available_copies: 4,
  borrow_price: 0,
  borrow_currency: "MNT",
  is_public_readable: false,
  reading_content: null,
  ...overrides,
});

const activeLoan = (book: Book, overrides: Partial<LoanWithBook> = {}): LoanWithBook => ({
  id: "loan-1",
  user_id: "user-1",
  book_id: book.id,
  status: "active",
  loaned_at: "2026-05-01T00:00:00.000Z",
  due_date: "2026-05-11T00:00:00.000Z",
  returned_at: null,
  book,
  ...overrides,
});

const baseProfile: Profile = {
  id: "user-1",
  display_name: "Reader",
  preferred_genres: ["Science Fiction"],
  role: "member",
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
};

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
  assistant = await import("./assistant");
});

describe("assistant action handling", () => {
  beforeEach(() => {
    libraryMocks.canReadBookNow.mockReset();
    libraryMocks.canReadBookNow.mockReturnValue(false);
    libraryMocks.fetchLoans.mockReset();
    libraryMocks.fetchPublicReadableBooks.mockReset();
    libraryMocks.fetchPublicReadableBooks.mockResolvedValue([]);
    libraryMocks.fetchRecommendedBooks.mockReset();
    libraryMocks.formatLibraryDate.mockReset();
    libraryMocks.formatLibraryDate.mockReturnValue("2026-05-11");
    libraryMocks.resolveBookId.mockReset();
    libraryMocks.resolveBookId.mockResolvedValue("book-1");
    libraryMocks.searchBooks.mockReset();
    libraryMocks.toFriendlyLibraryError.mockReset();
    libraryMocks.toFriendlyLibraryError.mockImplementation((message: string) => message);
    availabilityMocks.getReason.mockReset();
    availabilityMocks.getReason.mockReturnValue(null);
    supabaseMocks.rpc.mockReset();
    supabaseMocks.rpc.mockResolvedValue({ error: null });
  });

  it("answers greetings without catalog search", async () => {
    const reply = await assistant.resolveLocalAssistantReply({
      text: "hi",
      userId: "user-1",
      profile: baseProfile,
    });

    expect(reply.handled).toBe(true);
    expect(reply.reply).toContain("Hi!");
    expect(libraryMocks.searchBooks).not.toHaveBeenCalled();
  });

  it("returns catalog matches for search prompts", async () => {
    libraryMocks.searchBooks.mockResolvedValue([
      baseBook(),
      baseBook({
        id: "book-2",
        title: "Project Hail Mary",
        author: "Andy Weir",
        genre: "Science Fiction",
      }),
    ]);

    const reply = await assistant.resolveLocalAssistantReply({
      text: "find books about habit change",
      history: [],
    });

    expect(reply.handled).toBe(true);
    expect(reply.reply).toContain("Atomic Habits");
    expect(libraryMocks.searchBooks).toHaveBeenCalledWith("habit change", 4);
  });

  it("lists books that can be read right away", async () => {
    libraryMocks.fetchPublicReadableBooks.mockResolvedValue([
      baseBook({
        id: "book-read-1",
        title: "Sherlock Holmes",
        author: "Arthur Conan Doyle",
        available_copies: 1,
        is_public_readable: true,
        reading_content: ["A long readable opening section that is definitely long enough to count as reader content."],
      }),
    ]);

    const reply = await assistant.resolveLocalAssistantReply({
      text: "show books I can read now",
      history: [],
    });

    expect(reply.handled).toBe(true);
    expect(reply.reply).toContain("Sherlock Holmes");
    expect(libraryMocks.fetchPublicReadableBooks).toHaveBeenCalledWith(6);
  });

  it("shows the user's current loans", async () => {
    const book = baseBook();
    libraryMocks.fetchLoans.mockResolvedValue([activeLoan(book)]);

    const reply = await assistant.resolveLocalAssistantReply({
      text: "minii loans",
      userId: "user-1",
      history: [],
    });

    expect(reply.handled).toBe(true);
    expect(reply.reply).toContain("Atomic Habits");
    expect(libraryMocks.fetchLoans).toHaveBeenCalledWith("user-1", {
      statuses: ["active", "requested"],
      limit: 8,
    });
  });

  it("builds personalized recommendations", async () => {
    libraryMocks.fetchRecommendedBooks.mockResolvedValue({
      books: [
        baseBook({
          id: "book-3",
          title: "Project Hail Mary",
          author: "Andy Weir",
          genre: "Science Fiction",
        }),
      ],
      genres: ["Science Fiction"],
    });

    const reply = await assistant.resolveLocalAssistantReply({
      text: "recommend me books",
      userId: "user-1",
      profile: baseProfile,
      history: [],
    });

    expect(reply.handled).toBe(true);
    expect(reply.reply).toContain("Project Hail Mary");
    expect(reply.reply).toContain("Science Fiction");
  });

  it("borrows available books through RPC", async () => {
    const book = baseBook();
    libraryMocks.searchBooks.mockResolvedValue([book]);

    const reply = await assistant.resolveLocalAssistantReply({
      text: "borrow atomic habits",
      userId: "user-1",
      history: [],
    });

    expect(reply.handled).toBe(true);
    expect(supabaseMocks.rpc).toHaveBeenCalledWith("borrow_book", { p_book_id: "book-1" });
    expect(reply.reply).toContain("Atomic Habits");
  });

  it("borrows a referenced follow-up option from the previous assistant list", async () => {
    const firstBook = baseBook({
      id: "book-10",
      title: "Atomic Habits",
      author: "James Clear",
    });
    const secondBook = baseBook({
      id: "book-11",
      title: "Project Hail Mary",
      author: "Andy Weir",
      genre: "Science Fiction",
    });

    libraryMocks.searchBooks.mockResolvedValue([secondBook]);
    libraryMocks.resolveBookId.mockResolvedValue("book-11");

    const reply = await assistant.resolveLocalAssistantReply({
      text: "borrow the second one",
      userId: "user-1",
      history: [
        { role: "user", content: "science fiction" },
        {
          role: "assistant",
          content: [
            'I found these catalog matches for "science fiction":',
            `\u2022 ${firstBook.title} \u2014 ${firstBook.author} (${firstBook.genre}, ${firstBook.available_copies}/${firstBook.total_copies} available)`,
            `\u2022 ${secondBook.title} \u2014 ${secondBook.author} (${secondBook.genre}, ${secondBook.available_copies}/${secondBook.total_copies} available)`,
            'If you want one, say "borrow <title>" or "request <title>".',
          ].join("\n"),
        },
      ],
    });

    expect(reply.handled).toBe(true);
    expect(libraryMocks.searchBooks).toHaveBeenCalledWith("Project Hail Mary", 5);
    expect(supabaseMocks.rpc).toHaveBeenCalledWith("borrow_book", { p_book_id: "book-11" });
    expect(reply.reply).toContain("Project Hail Mary");
  });

  it("requests unavailable books through RPC", async () => {
    const book = baseBook({
      id: "book-4",
      title: "Sapiens",
      author: "Yuval Noah Harari",
      available_copies: 0,
    });
    libraryMocks.searchBooks.mockResolvedValue([book]);
    libraryMocks.resolveBookId.mockResolvedValue("book-4");

    const reply = await assistant.resolveLocalAssistantReply({
      text: "request sapiens",
      userId: "user-1",
      history: [],
    });

    expect(reply.handled).toBe(true);
    expect(supabaseMocks.rpc).toHaveBeenCalledWith("request_book", { p_book_id: "book-4" });
    expect(reply.reply).toContain("Sapiens");
  });

  it("returns active loans through RPC", async () => {
    const book = baseBook();
    libraryMocks.fetchLoans.mockResolvedValue([activeLoan(book)]);

    const reply = await assistant.resolveLocalAssistantReply({
      text: "return atomic habits",
      userId: "user-1",
      history: [],
    });

    expect(reply.handled).toBe(true);
    expect(supabaseMocks.rpc).toHaveBeenCalledWith("return_book", { p_loan_id: "loan-1" });
    expect(reply.reply).toContain("Atomic Habits");
  });
});
