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
              ? "Borrow public-domain books first, then read them on site with Mongolian translation."
              : "Sign in first to borrow public-domain books and read them on site."}
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
          <div className="relative mb-5">
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />
            <div className="scrollbar-none flex gap-2 overflow-x-auto rounded-2xl border border-border/55 bg-surface-elevated/45 p-1.5 shadow-card ring-hairline">
              {[ALL_GENRES, ...genreOptions].map((genre) => {
                const count =
                  genre === ALL_GENRES ? books.length : books.filter((book) => book.genre.trim() === genre).length;
                const active = selectedGenre === genre;

                return (
                  <button
                    key={genre}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedGenre(genre)}
                    className={`group inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-all ${
                      active
                        ? "border-primary/60 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-glow-primary"
                        : "border-white/10 bg-white/[0.035] text-foreground/78 hover:border-primary/35 hover:bg-primary/10 hover:text-foreground"
                    }`}
                  >
                    <span className="whitespace-nowrap">{genre}</span>
                    <span
                      className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none ${
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-surface-high text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
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
