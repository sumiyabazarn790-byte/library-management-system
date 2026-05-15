import { useEffect, useState } from "react";
import { BookOpen, Calendar, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Book, LoanWithBook } from "@/types/library";
import { canReadBookNow, fetchLoans, formatLibraryDate, getBookReaderPath } from "@/lib/library";
import { getBookCover } from "@/lib/bookCovers";
import { scrollToSection } from "@/lib/navigation";
import {
  getReadingProgressEntries,
  READING_PROGRESS_UPDATED_EVENT,
  type ReadingProgressEntry,
} from "@/lib/readingProgress";

type ContinueReadingItem = {
  key: string;
  book: Book;
  progressPercent: number;
  eyebrow: string;
  detail: string;
  updatedAt: string;
  loan?: LoanWithBook;
};

const getLoanProgress = (loanedAt: string, dueDate: string) => {
  const start = new Date(loanedAt).getTime();
  const end = new Date(dueDate).getTime();
  const now = Date.now();
  const total = Math.max(end - start, 1);
  const elapsed = Math.min(Math.max(now - start, 0), total);

  return Math.max(8, Math.round((elapsed / total) * 100));
};

const clampProgress = (value: number) => Math.min(99, Math.max(4, Math.round(value)));

const toProgressItem = (entry: ReadingProgressEntry): ContinueReadingItem => ({
  key: `progress-${entry.book.id}`,
  book: entry.book,
  progressPercent: clampProgress(entry.progressPercent),
  eyebrow: entry.readerTextMode === "mn" ? "Mongolian reader" : "Original reader",
  detail: entry.totalPages
    ? `Page ${Math.min(entry.pageIndex + 1, entry.totalPages)} of ${entry.totalPages}`
    : "Reading in progress",
  updatedAt: entry.updatedAt,
});

const toLoanItem = (loan: LoanWithBook): ContinueReadingItem => ({
  key: `loan-${loan.id}`,
  book: loan.book,
  loan,
  progressPercent: getLoanProgress(loan.loaned_at, loan.due_date),
  eyebrow: "Active loan",
  detail: `Due ${formatLibraryDate(loan.due_date)}`,
  updatedAt: loan.loaned_at,
});

export const ContinueReading = ({ refreshKey }: { refreshKey?: number }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<ContinueReadingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const progressItems = getReadingProgressEntries(user.id)
          .filter((entry) => !entry.completed && canReadBookNow(entry.book))
          .map(toProgressItem);
        let loanItems: ContinueReadingItem[] = [];

        try {
          const loans = await fetchLoans(user.id, { statuses: ["active"], limit: 8 });
          loanItems = loans.filter((loan) => canReadBookNow(loan.book)).map(toLoanItem);
        } catch (loanError) {
          console.warn("continue reading loan load failed", loanError);
        }

        const seenBookIds = new Set<string>();
        const mergedItems: ContinueReadingItem[] = [];

        for (const item of [...progressItems, ...loanItems]) {
          if (seenBookIds.has(item.book.id)) {
            continue;
          }

          seenBookIds.add(item.book.id);
          mergedItems.push(item);
        }

        if (!canceled) {
          setItems(
            mergedItems
              .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
              .slice(0, 4),
          );
        }
      } catch (error) {
        if (!canceled) {
          console.error("continue reading load failed", error);
          setItems([]);
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    void run();

    if (typeof window === "undefined") {
      return () => {
        canceled = true;
      };
    }

    const handleProgressUpdate = () => {
      void run();
    };

    window.addEventListener(READING_PROGRESS_UPDATED_EVENT, handleProgressUpdate);
    window.addEventListener("storage", handleProgressUpdate);

    return () => {
      canceled = true;
      window.removeEventListener(READING_PROGRESS_UPDATED_EVENT, handleProgressUpdate);
      window.removeEventListener("storage", handleProgressUpdate);
    };
  }, [refreshKey, user]);

  if (!user) {
    return (
      <section id="library" className="rounded-2xl glass ring-hairline p-6 md:p-10 scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-headline-md">Continue reading</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Sign in to reveal your active loans, reading progress, and due-date timeline here.
            </p>
          </div>
          <Link
            to="/auth"
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow-primary sm:w-auto"
          >
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section id="library" className="scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-md">Continue reading</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Unfinished reader sessions and active digital loans.
          </p>
        </div>
        <button
          type="button"
          onClick={() => scrollToSection("browse")}
          className="text-sm font-semibold text-primary transition-colors hover:text-primary-glow"
        >
          Go to catalog
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground">
          <Loader2 className="inline size-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl glass ring-hairline p-8 text-center text-muted-foreground">
          Open any in-site reader book and your unfinished place will appear here.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item, index) => (
            <article key={item.key} className="group">
              <Link to={getBookReaderPath(item.book)} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg ring-hairline shadow-card transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-cinematic group-hover:ring-hairline-strong">
                  <img
                    src={getBookCover(item.book, index)}
                    alt={item.book.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-card-fade" />
                  <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
                    {item.progressPercent}%
                  </div>
                  <div className="absolute inset-x-3 bottom-3">
                    <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-white/85">
                      <span className="line-clamp-1">{item.eyebrow}</span>
                      <BookOpen className="size-3.5" />
                    </div>
                    <div className="h-[3px] overflow-hidden rounded-full bg-foreground/15">
                      <div
                        className="h-full bg-gradient-accent shadow-glow-primary"
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>

              <div className="mt-3 px-0.5">
                <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-tight">
                  {item.book.title}
                </h3>
                <p className="mt-1 text-[13px] text-muted-foreground">{item.book.author}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  {item.detail}
                </div>
                {item.loan ? (
                  <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" />
                    Borrowed: {formatLibraryDate(item.loan.loaned_at)}
                  </div>
                ) : null}
                <div className="mt-3">
                  <Link
                    to={getBookReaderPath(item.book)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    Continue reading
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
