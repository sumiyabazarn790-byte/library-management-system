import { useEffect, useState } from "react";
import { Bookmark, Loader2 } from "lucide-react";
import { BookCard } from "./BookCard";
import { useAuth } from "@/contexts/AuthContext";
import { fetchLoanStatusesByBookIds, fetchSavedBooks } from "@/lib/library";
import type { LoanStatus, SavedBookWithBook } from "@/types/library";

type SavedBooksShelfProps = {
  refreshKey?: number;
  onLibraryChange?: () => void;
};

export const SavedBooksShelf = ({ refreshKey, onLibraryChange }: SavedBooksShelfProps) => {
  const { user } = useAuth();
  const [savedBooks, setSavedBooks] = useState<SavedBookWithBook[]>([]);
  const [loanStatusByBookId, setLoanStatusByBookId] = useState<Record<string, LoanStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSavedBooks([]);
      setLoanStatusByBookId({});
      setLoading(false);
      return;
    }

    let canceled = false;

    const run = async () => {
      setLoading(true);

      try {
        const saved = await fetchSavedBooks(user.id, 16);
        let nextLoanStatusByBookId: Record<string, LoanStatus> = {};

        try {
          nextLoanStatusByBookId = saved.length
            ? await fetchLoanStatusesByBookIds(
                user.id,
                saved.map((entry) => entry.book_id),
              )
            : {};
        } catch (loanStatusError) {
          console.warn("saved shelf loan status load failed", loanStatusError);
        }

        if (!canceled) {
          setSavedBooks(saved.filter((entry) => Boolean(entry.book)));
          setLoanStatusByBookId(nextLoanStatusByBookId);
        }
      } catch (error) {
        if (!canceled) {
          console.error("library saved shelf load failed", error);
          setSavedBooks([]);
          setLoanStatusByBookId({});
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

  if (!user) {
    return null;
  }

  return (
    <section id="saved-books" className="scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-3 text-headline-md">
            <Bookmark className="size-6 text-secondary" />
            Saved books
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Books you saved from the catalog now stay together in your Library.
          </p>
        </div>
        {!loading ? (
          <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {savedBooks.length} saved
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-2xl glass p-8 text-sm text-muted-foreground ring-hairline">
          <Loader2 className="mr-2 inline size-4 animate-spin" />
          Loading saved books...
        </div>
      ) : savedBooks.length === 0 ? (
        <div className="rounded-2xl glass p-8 text-center text-sm text-muted-foreground ring-hairline">
          Press Save on any book card and it will appear here.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {savedBooks.map((entry, index) => (
            <BookCard
              key={entry.id}
              book={entry.book}
              index={index}
              loanStatus={loanStatusByBookId[entry.book_id] ?? null}
              isSaved
              onChanged={onLibraryChange}
            />
          ))}
        </div>
      )}
    </section>
  );
};
