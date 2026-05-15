import { useEffect, useMemo, useState } from "react";
import { BookMarked } from "lucide-react";
import { BookCard } from "./BookCard";
import { fetchLoanStatusesByBookIds, fetchPublicReadableBooks, fetchSavedStatusesByBookIds } from "@/lib/library";
import { useAuth } from "@/contexts/AuthContext";
import type { Book, LoanStatus } from "@/types/library";

const ALL_GENRES = "All";
const FREE_READER_LIMIT = 48;

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
  const [selectedGenre, setSelectedGenre] = useState(ALL_GENRES);

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      setLoading(true);

      try {
        // Primary data: the books themselves
        const readableBooks = await fetchPublicReadableBooks(FREE_READER_LIMIT);
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

  const genreOptions = useMemo(
    () => Array.from(new Set(books.map((book) => book.genre.trim()).filter(Boolean))).sort(),
    [books],
  );
  const visibleBooks = useMemo(
    () => (selectedGenre === ALL_GENRES ? books : books.filter((book) => book.genre.trim() === selectedGenre)),
    [books, selectedGenre],
  );

  useEffect(() => {
    if (selectedGenre !== ALL_GENRES && !genreOptions.includes(selectedGenre)) {
      setSelectedGenre(ALL_GENRES);
    }
  }, [genreOptions, selectedGenre]);

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
              ? "Open public-domain books on site, sorted by genre, with Mongolian translation in the reader."
              : "Sign in first to read public-domain books on site with Mongolian translation."}
          </p>
        </div>
        {!loading && books.length ? (
          <p className="text-sm font-medium text-muted-foreground">
            {visibleBooks.length} of {books.length} free titles
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-2xl glass p-8 text-sm text-muted-foreground ring-hairline">Loading free books...</div>
      ) : books.length === 0 ? (
        <div className="rounded-2xl glass p-8 text-sm text-muted-foreground ring-hairline">
          Public reader books will appear here after the latest migration is applied.
        </div>
      ) : (
        <>
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {[ALL_GENRES, ...genreOptions].map((genre) => {
              const count =
                genre === ALL_GENRES ? books.length : books.filter((book) => book.genre.trim() === genre).length;
              const active = selectedGenre === genre;

              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors ${
                    active
                      ? "border-primary/40 bg-primary text-primary-foreground shadow-glow-primary"
                      : "border-border/70 bg-surface-elevated/60 text-muted-foreground hover:bg-surface-high hover:text-foreground"
                  }`}
                >
                  <span>{genre}</span>
                  <span className={active ? "text-primary-foreground/75" : "text-muted-foreground/70"}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {visibleBooks.map((book, index) => (
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
        </>
      )}
    </section>
  );
};
