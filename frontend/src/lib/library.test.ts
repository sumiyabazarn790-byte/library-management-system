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

import { canReadBookNow, fetchPublicReadableBooks, searchBooks } from "./library";

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

    await expect(searchBooks("", 5)).resolves.toEqual(fallbackBooks.slice(0, 5));
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

    await expect(searchBooks("Austen", 5)).resolves.toEqual([
      expect.objectContaining({
        title: "Pride and Prejudice",
        author: "Jane Austen",
      }),
    ]);
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
});
