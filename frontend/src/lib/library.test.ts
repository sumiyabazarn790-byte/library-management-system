import { beforeEach, describe, expect, it, vi } from "vitest";
import { fallbackBooks } from "./fallbackBooks";

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  invoke: vi.fn(),
  rpc: vi.fn(),
}));

const availabilityMocks = vi.hoisted(() => ({
  getReason: vi.fn(() => null),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: supabaseMocks.from,
    functions: {
      invoke: supabaseMocks.invoke,
    },
    rpc: supabaseMocks.rpc,
  },
}));

vi.mock("@/integrations/supabase/availability", () => ({
  getSupabaseUnavailableReason: availabilityMocks.getReason,
  isLoopbackSupabaseUrl: false,
}));

import { canReadBookNow, fetchBookById, fetchPublicReadableBooks, searchBooks } from "./library";

describe("library fallbacks", () => {
  beforeEach(() => {
    supabaseMocks.from.mockReset();
    supabaseMocks.invoke.mockReset();
    supabaseMocks.rpc.mockReset();
    availabilityMocks.getReason.mockReset();
    availabilityMocks.getReason.mockReturnValue(null);
  });

  it("falls back to built-in books when the hosted catalog select is denied", async () => {
    supabaseMocks.from.mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(async () => ({
            data: null,
            error: { code: "42501", message: "permission denied for table books" },
          })),
        })),
      })),
    });

    await expect(searchBooks("", 5)).resolves.toEqual(
      fallbackBooks.filter((book) => canReadBookNow(book)).slice(0, 5),
    );
  });

  it("falls back to built-in search results when the fuzzy search function is out of date", async () => {
    supabaseMocks.invoke.mockResolvedValue({
      data: null,
      error: { message: "edge function is not deployed" },
    });
    supabaseMocks.rpc.mockResolvedValue({
      data: null,
      error: {
        code: "42804",
        message: "structure of query does not match function result type",
      },
    });

    await expect(searchBooks("Austen", 5)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Pride and Prejudice",
          author: "Jane Austen",
        }),
        expect.objectContaining({
          title: "Sense and Sensibility",
          author: "Jane Austen",
        }),
      ]),
    );
  });

  it("falls back to built-in public books when public-readable rows cannot be queried", async () => {
    supabaseMocks.from.mockReturnValue({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(async () => ({
              data: null,
              error: {
                code: "42501",
                message: "permission denied for table books",
              },
            })),
          })),
        })),
      })),
    });

    const expected = fallbackBooks.filter((book) => canReadBookNow(book)).slice(0, 3);
    await expect(fetchPublicReadableBooks(3)).resolves.toEqual(expected);
  });

  it("fills the public reader shelf from built-in books when hosted rows are sparse", async () => {
    supabaseMocks.from.mockReturnValue({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(async () => ({
              data: [],
              error: null,
            })),
          })),
        })),
      })),
    });

    await expect(fetchPublicReadableBooks(8)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Sense and Sensibility",
          author: "Jane Austen",
        }),
      ]),
    );
  });

  it("filters unreadable rows out of direct catalog results", async () => {
    supabaseMocks.from.mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(async () => ({
            data: [
              {
                id: "book-1",
                title: "Pride and Prejudice",
                author: "Jane Austen",
                genre: "Classics",
                description: "Readable public-domain title.",
                language: "en",
                total_copies: 12,
                available_copies: 12,
                reading_content: ["Short preview only"],
              },
              {
                id: "book-2",
                title: "The Midnight Library",
                author: "Matt Haig",
                genre: "Fiction",
                description: "Unreadable in-site preview.",
                language: "en",
                total_copies: 5,
                available_copies: 5,
                reading_content: null,
              },
            ],
            error: null,
          })),
        })),
      })),
    });

    await expect(searchBooks("", 5)).resolves.toEqual([
      expect.objectContaining({
        title: "Pride and Prejudice",
        author: "Jane Austen",
      }),
    ]);
  });

  it("hides unreadable books when fetched directly by id", async () => {
    supabaseMocks.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: {
              id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
              title: "The Midnight Library",
              author: "Matt Haig",
              genre: "Fiction",
              description: "Unreadable in-site preview.",
              language: "en",
              total_copies: 5,
              available_copies: 5,
              reading_content: null,
            },
            error: null,
          })),
        })),
      })),
    });

    await expect(fetchBookById("3fa85f64-5717-4562-b3fc-2c963f66afa6")).resolves.toBeNull();
  });
});
