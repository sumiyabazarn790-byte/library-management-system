import { useEffect, useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { LoanWithBook } from "@/types/library";
import { canReadBookNow, fetchLoans, formatLibraryDate, getBookReaderPath } from "@/lib/library";
import { getBookCover } from "@/lib/bookCovers";
import { scrollToSection } from "@/lib/navigation";

const getLoanProgress = (loanedAt: string, dueDate: string) => {
  const start = new Date(loanedAt).getTime();
  const end = new Date(dueDate).getTime();
  const now = Date.now();
  const total = Math.max(end - start, 1);
  const elapsed = Math.min(Math.max(now - start, 0), total);

  return Math.max(8, Math.round((elapsed / total) * 100));
};

export const ContinueReading = ({ refreshKey }: { refreshKey?: number }) => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanWithBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      if (!user) {
        setLoans([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await fetchLoans(user.id, { statuses: ["active"], limit: 8 });

        if (!canceled) {
          setLoans(data.filter((loan) => canReadBookNow(loan.book)).slice(0, 4));
        }
      } catch (error) {
        if (!canceled) {
          console.error("continue reading load failed", error);
          setLoans([]);
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
          <p className="mt-2 text-sm text-muted-foreground">Your currently active reading selections.</p>
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
      ) : loans.length === 0 ? (
        <div className="rounded-2xl glass ring-hairline p-8 text-center text-muted-foreground">
          No active digital reading yet. Books without a built-in reader still appear in My loans.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {loans.map((loan, index) => (
            <article key={loan.id} className="group">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg ring-hairline shadow-card transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-cinematic group-hover:ring-hairline-strong">
                <img
                  src={getBookCover(loan.book, index)}
                  alt={loan.book.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-card-fade" />
                <div className="absolute inset-x-3 bottom-3">
                  <div className="h-[3px] overflow-hidden rounded-full bg-foreground/15">
                    <div
                      className="h-full bg-gradient-accent shadow-glow-primary"
                      style={{ width: `${getLoanProgress(loan.loaned_at, loan.due_date)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 px-0.5">
                <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-tight">{loan.book.title}</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">{loan.book.author}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  Borrowed: {formatLibraryDate(loan.loaned_at)}
                </div>
                <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  Due: {formatLibraryDate(loan.due_date)}
                </div>
                <div className="mt-3">
                  <Link
                    to={getBookReaderPath(loan.book)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    Open text reader
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
