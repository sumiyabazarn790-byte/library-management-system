import { useEffect, useMemo, useState } from "react";
import { BookOpen, Calendar, Loader2, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { LoanWithBook, SaleListing } from "@/types/library";
import {
  fetchLoans,
  fetchSaleListings,
  formatLibraryDate,
  getBookReaderPath,
  hasBookDownloadSource,
  saleListingsFeatureEnabled,
  toFriendlyLibraryError,
} from "@/lib/library";
import { getBookCover } from "@/lib/bookCovers";
import { BookPreviewDialog } from "./BookPreviewDialog";
import { DownloadBookButton } from "./DownloadBookButton";
import { SellBookDialog } from "./SellBookDialog";

export const MyLoans = ({
  refreshKey,
  onLibraryChange,
}: {
  refreshKey?: number;
  onLibraryChange?: () => void;
}) => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanWithBook[]>([]);
  const [saleListings, setSaleListings] = useState<SaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const saleListingsByBook = useMemo(
    () => Object.fromEntries(saleListings.map((listing) => [listing.book_id, listing])),
    [saleListings],
  );

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      if (!user) {
        setLoans([]);
        setSaleListings([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const loanData = await fetchLoans(user.id, { statuses: ["active", "requested"] });
        const listingData = saleListingsFeatureEnabled
          ? await fetchSaleListings(user.id).catch((error) => {
              console.warn("sale listings load skipped", error);
              return [];
            })
          : [];

        if (!canceled) {
          setLoans(loanData);
          setSaleListings(listingData);
        }
      } catch (error) {
        if (!canceled) {
          console.error("loan load failed", error);
          setLoans([]);
          setSaleListings([]);
          toast.error("Зээлсэн номын жагсаалт ачаалж чадсангүй.");
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

  const returnBook = async (loan: LoanWithBook) => {
    if (loan.status !== "active") {
      return;
    }

    setBusyId(loan.id);
    const { error } = await supabase.rpc("return_book", { p_loan_id: loan.id });
    setBusyId(null);

    if (error) {
      toast.error(toFriendlyLibraryError(error.message));
      return;
    }

    setLoans((current) => current.filter((item) => item.id !== loan.id));
    toast.success(`"${loan.book.title}" ном амжилттай буцаагдлаа.`);
    onLibraryChange?.();
  };

  if (!user) {
    return (
      <section className="rounded-2xl glass p-6 text-center ring-hairline sm:p-10">
        <h3 className="text-headline-md">Зээлсэн номоо харахын тулд нэвтэрнэ үү</h3>
        <Link
          to="/auth"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow-primary sm:w-auto"
        >
          Нэвтрэх
        </Link>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-label uppercase tracking-[0.22em] text-primary/80">Library account</p>
          <h2 className="mt-2 text-headline-md">Миний зээлүүд</h2>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          Идэвхтэй зээлсэн номоо эндээс уншиж, татаж эсвэл буцааж болно.
        </p>
      </div>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground">
          <Loader2 className="inline size-5 animate-spin" />
        </div>
      ) : loans.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 bg-surface-elevated/30 px-4 py-10 text-center text-muted-foreground">
          Одоогоор зээл эсвэл захиалга алга. Каталогоос ном сонгоод зээлээрэй.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {loans.map((loan, index) => {
            const dueDate = new Date(loan.due_date);
            const overdue = loan.status === "active" && dueDate < new Date();
            const isRequested = loan.status === "requested";
            const activeListing = saleListingsByBook[loan.book_id] ?? null;
            const hasDownloadSource = hasBookDownloadSource(loan.book);
            const isReturning = busyId === loan.id;

            return (
              <article
                key={loan.id}
                className="flex flex-col gap-4 rounded-xl bg-surface-elevated/60 p-4 ring-hairline transition-all hover:ring-hairline-strong sm:flex-row"
              >
                <img
                  src={getBookCover(loan.book, index)}
                  alt={loan.book.title}
                  className="mx-auto h-40 w-28 rounded-md object-cover ring-hairline sm:mx-0 sm:h-28 sm:w-20"
                />

                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 font-display font-semibold leading-tight">{loan.book.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{loan.book.author}</p>

                  <div className="mt-3 flex items-start gap-2 text-xs">
                    <Calendar className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span className={overdue ? "text-destructive" : "text-muted-foreground"}>
                      {isRequested
                        ? `Захиалсан: ${formatLibraryDate(loan.loaned_at)} · боломжтой болохыг хүлээж байна`
                        : `Зээлсэн: ${formatLibraryDate(loan.loaned_at)} · Дуусах: ${formatLibraryDate(loan.due_date)}`}
                    </span>
                  </div>

                  {activeListing && (
                    <div className="mt-3 rounded-lg border border-secondary/20 bg-secondary-deep/20 px-3 py-2 text-xs text-secondary">
                      Sale listing: {Number(activeListing.price).toLocaleString("en-US")} {activeListing.currency}
                    </div>
                  )}

                  <div className="mt-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <span
                      className={`rounded px-2 py-1 text-label ${
                        loan.status === "active"
                          ? "bg-primary/15 text-primary"
                          : loan.status === "returned"
                            ? "bg-muted text-muted-foreground"
                            : "bg-secondary-deep/40 text-secondary"
                      }`}
                    >
                      {loan.status === "active"
                        ? "Идэвхтэй"
                        : loan.status === "requested"
                          ? "Захиалсан"
                          : loan.status === "returned"
                            ? "Буцаасан"
                            : loan.status}
                    </span>

                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                      {loan.status !== "requested" && hasDownloadSource ? <DownloadBookButton book={loan.book} /> : null}

                      {loan.status === "active" ? (
                        <Link
                          to={getBookReaderPath(loan.book)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_32px_hsl(var(--primary)/0.38)]"
                        >
                          <BookOpen className="size-3.5" />
                          Унших
                        </Link>
                      ) : (
                        <BookPreviewDialog book={loan.book} index={index} loanStatus={loan.status}>
                          <button
                            type="button"
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                          >
                            Preview
                          </button>
                        </BookPreviewDialog>
                      )}

                      {saleListingsFeatureEnabled && loan.status !== "requested" && (
                        <SellBookDialog loan={loan} existingListing={activeListing} onSubmitted={onLibraryChange} />
                      )}

                      {loan.status === "active" && (
                        <button
                          type="button"
                          onClick={() => void returnBook(loan)}
                          disabled={isReturning}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isReturning ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />}
                          Ном буцаах
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
