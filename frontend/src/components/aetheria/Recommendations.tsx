import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Book, LoanStatus } from "@/types/library";
import {
  fetchLoanStatusesByBookIds,
  fetchRecommendedBooks,
  fetchSavedStatusesByBookIds,
} from "@/lib/library";
import { BookCard } from "./BookCard";

export const Recommendations = ({
  refreshKey,
  onLibraryChange,
}: {
  refreshKey?: number;
  onLibraryChange?: () => void;
}) => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [loanStatusByBookId, setLoanStatusByBookId] = useState<Record<string, LoanStatus>>({});
  const [savedByBookId, setSavedByBookId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      try {
        const recommendation = await fetchRecommendedBooks({
          userId: user?.id,
          limit: 4,
        });
        const finalBooks = recommendation.books;
        const bookIds = finalBooks.map((book) => book.id);

        const [nextLoanStatusByBookId, nextSavedByBookId] =
          user && finalBooks.length
            ? await Promise.all([
                fetchLoanStatusesByBookIds(user.id, bookIds).catch(() => ({})),
                fetchSavedStatusesByBookIds(user.id, bookIds).catch(() => ({})),
              ])
            : [{}, {}];

        if (!canceled) {
          setGenres(recommendation.genres);
          setBooks(finalBooks);
          setLoanStatusByBookId(nextLoanStatusByBookId);
          setSavedByBookId(nextSavedByBookId);
        }
      } catch (error) {
        if (!canceled) {
          console.error("recommendations load failed:", error instanceof Error ? error.message : JSON.stringify(error));
          setBooks([]);
        }
      }
    };

    void run();
    return () => {
      canceled = true;
    };
  }, [refreshKey, user]);

  return (
    <section id="ai-insights" className="scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="flex items-center gap-3 text-headline-md">
            <Sparkles className="size-6 text-primary" />
            AI recommendations
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {genres.length ? (
              <>
                Tuned to your interests: <span className="text-primary">{genres.slice(0, 3).join(", ")}</span>
              </>
            ) : (
              "New suggestions shaped by your reading pattern and active catalog inventory."
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
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
    </section>
  );
};
