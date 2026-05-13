import { useEffect, useState } from "react";
import { BookMarked } from "lucide-react";
import { BookCard } from "./BookCard";
import { fetchLoanStatusesByBookIds, fetchPublicReadableBooks, fetchSavedStatusesByBookIds } from "@/lib/library";
import { useAuth } from "@/contexts/AuthContext";
import type { Book, LoanStatus } from "@/types/library";

export const FreeReadingShelf = ({
  refreshKey,
  onLibraryChange,
}: {
  refreshKey?: number;
  onLibraryChange?: () => void;
}) => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [loanStatusByBookId, setLoanStatusByBookId] = useState<Record<string, LoanStatus>>({});
  const [savedByBookId, setSavedByBookId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      setLoading(true);

      try {
        // Primary data: the books themselves
        const readableBooks = await fetchPublicReadableBooks(12);
        const bookIds = readableBooks.map((book) => book.id);

        // Secondary data: user-specific statuses
        // We catch errors individually so a missing 'saved_books' table
        // doesn't crash the whole shelf.
        const [loanStatusResult, savedStatusResult] =
          user && readableBooks.length
            ? await Promise.all([
                fetchLoanStatusesByBookIds(user.id, bookIds)
                  .then((data) => ({ data, failed: false as const }))
                  .catch((error) => ({ data: {}, failed: true as const, error })),
                fetchSavedStatusesByBookIds(user.id, bookIds)
                  .then((data) => ({ data, failed: false as const }))
                  .catch((error) => ({ data: {}, failed: true as const, error })),
              ])
            : [
                { data: {}, failed: false as const },
                { data: {}, failed: false as const },
              ];

        const nextLoanStatusByBookId = loanStatusResult.data;
        const nextSavedByBookId = savedStatusResult.data;

        if (!canceled) {
          if (savedStatusResult.failed) {
            console.warn(
              "Could not load saved statuses.",
              savedStatusResult.error instanceof Error
                ? savedStatusResult.error.message
                : savedStatusResult.error,
            );
          }
          setBooks(readableBooks);
          setLoanStatusByBookId(nextLoanStatusByBookId);
          setSavedByBookId(nextSavedByBookId);
        }
      } catch (error) {
        if (!canceled) {
          console.error("free reading load failed:", error instanceof Error ? error.message : JSON.stringify(error));
          setBooks([]);
          setLoanStatusByBookId({});
          setSavedByBookId({});
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      canceled = true;
    };
  }, [refreshKey, user]);

  return (
    <section id="free-reading" className="scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="flex items-center gap-3 text-headline-md">
            <BookMarked className="size-6 text-secondary" />
            Free reading shelf
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {user
              ? "Open these public books on site without borrowing first."
              : "Sign in first to open these public books on site without borrowing."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl glass p-8 text-sm text-muted-foreground ring-hairline">Loading free books...</div>
      ) : books.length === 0 ? (
        <div className="rounded-2xl glass p-8 text-sm text-muted-foreground ring-hairline">
          Public reader books will appear here after the latest migration is applied.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {books.map((book, index) => (
            <BookCard
              key={book.id}
              book={book}
              index={index}
              loanStatus={loanStatusByBookId[book.id] ?? null}
              isSaved={savedByBookId[book.id] ?? false}
              onChanged={onLibraryChange}
            />
          ))}
        </div>
      )}
    </section>
  );
};
