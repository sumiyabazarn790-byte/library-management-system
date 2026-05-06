import { BookMarked, BookOpen, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Book, LoanStatus } from "@/types/library";
import { useAuth } from "@/contexts/AuthContext";
import { getBookCover } from "@/lib/bookCovers";
import {
  canReadBookNow,
  getBookReaderPath,
  removeSavedBookForUser,
  resolveBookId,
  saveBookForUser,
  toFriendlyLibraryError,
} from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";
import { BookReaderDialog } from "./BookReaderDialog";
import { BookPreviewDialog } from "./BookPreviewDialog";

type BookCardProps = {
  book: Book;
  index?: number;
  loanStatus?: LoanStatus | null;
  isSaved?: boolean;
  onChanged?: () => void;
};

export const BookCard = ({ book, index = 0, loanStatus = null, isSaved = false, onChanged }: BookCardProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const staleBorrowSessionPattern = /loans_user_id_fkey|violates foreign key constraint ["']loans_user_id_fkey["']/i;

  const canReadFree = canReadBookNow(book);
  const isActive = loanStatus === "active";
  const isRequested = loanStatus === "requested";

  const primaryLabel = useMemo(() => {
    if (canReadFree) return "Read on site";
    if (isActive) return "Borrowed";
    if (isRequested) return "Requested";
    return book.available_copies > 0 ? "Borrow" : "Request";
  }, [book.available_copies, canReadFree, isActive, isRequested]);

  const completeBorrowFlow = async (borrowMode: "borrow" | "request") => {
    if (!user) {
      navigate("/auth");
      return false;
    }

    if (isActive || isRequested) {
      onChanged?.();
      return false;
    }

    setBusy(true);

    try {
      const canonicalBookId = await resolveBookId(book);

      const { error } =
        borrowMode === "borrow"
          ? await supabase.rpc("borrow_book", { p_book_id: canonicalBookId })
          : await supabase.rpc("request_book", { p_book_id: canonicalBookId });

      if (error) {
        if (staleBorrowSessionPattern.test(error.message)) {
          await signOut();
          toast.error("Your local session expired. Please sign in again before borrowing.");
          navigate("/auth");
          return false;
        }

        if (/already borrowed|already requested/i.test(error.message)) {
          onChanged?.();
        }

        toast.error(toFriendlyLibraryError(error.message));
        return false;
      }

      toast.success(
        borrowMode !== "request"
          ? `"${book.title}" borrowed successfully.`
          : `"${book.title}" request submitted. It will activate when available.`,
      );
      onChanged?.();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Borrow request failed";

      if (staleBorrowSessionPattern.test(message)) {
        await signOut();
        toast.error("Your local session expired. Please sign in again before borrowing.");
        navigate("/auth");
        return false;
      }

      toast.error(toFriendlyLibraryError(message));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handlePrimaryAction = async () => {
    const nextBorrowMode = book.available_copies > 0 ? "borrow" : "request";
    await completeBorrowFlow(nextBorrowMode);
  };

  const handleSaveToggle = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setSaveBusy(true);

    try {
      if (isSaved) {
        await removeSavedBookForUser(user.id, book);
        toast.success(`"${book.title}" removed from your saved shelf.`);
      } else {
        await saveBookForUser(user.id, book);
        toast.success(`"${book.title}" saved to your shelf.`);
      }

      onChanged?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save request failed";

      if (staleBorrowSessionPattern.test(message)) {
        await signOut();
        toast.error("Your local session expired. Please sign in again before saving.");
        navigate("/auth");
        return;
      }

      toast.error(toFriendlyLibraryError(message));
    } finally {
      setSaveBusy(false);
    }
  };

  const cardTrigger = (
    <button
      type="button"
      className="flex flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      aria-label={canReadFree ? `${book.title} open reader` : `${book.title} open preview`}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={getBookCover(book, index)}
          alt={book.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(event) => {
            (event.currentTarget as HTMLImageElement).src = getBookCover(
              { title: book.title, cover_url: null, id: book.id, genre: book.genre },
              index,
            );
          }}
        />
        <div className="absolute inset-0 bg-gradient-card-fade" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full glass px-2.5 py-1 text-label text-foreground/90">{book.genre}</span>
          {canReadFree ? (
            <span className="rounded-full bg-secondary-deep/70 px-2.5 py-1 text-label text-secondary">Free read</span>
          ) : null}
        </div>
        <div className="absolute right-3 top-3">
          <span
            className={`rounded-full px-2.5 py-1 text-label ${
              book.language === "mn" ? "bg-secondary-deep/60 text-secondary" : "bg-primary/15 text-primary"
            }`}
          >
            {book.language === "mn" ? "MN" : "EN"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 font-display font-semibold leading-tight">{book.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
        <p className="mt-3 flex-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground/80">
          {book.description}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="block text-label text-muted-foreground">
              {book.available_copies}/{book.total_copies} available
            </span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            {canReadFree ? "Read now" : "Preview"}
          </span>
        </div>
      </div>
    </button>
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl bg-surface-elevated/50 ring-hairline transition-all hover:-translate-y-1 hover:bg-surface-high/50 hover:shadow-cinematic hover:ring-hairline-strong">
      {canReadFree ? (
        <BookReaderDialog book={book} index={index}>
          {cardTrigger}
        </BookReaderDialog>
      ) : (
        <BookPreviewDialog book={book} index={index} loanStatus={loanStatus}>
          {cardTrigger}
        </BookPreviewDialog>
      )}

      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => void handleSaveToggle()}
            disabled={saveBusy}
            className={`inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border px-3.5 text-xs font-semibold transition-colors sm:w-auto ${
              isSaved
                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-border/70 text-muted-foreground hover:bg-surface-high hover:text-foreground"
            } disabled:opacity-50`}
          >
            {saveBusy ? <Loader2 className="size-3.5 animate-spin" /> : <BookMarked className="size-3.5" />}
            {isSaved ? "Saved" : "Save"}
          </button>

          {canReadFree ? (
            <BookPreviewDialog book={book} index={index} loanStatus={loanStatus}>
              <button
                type="button"
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-secondary/40 px-3.5 text-xs font-semibold text-secondary transition-colors hover:bg-secondary-deep/30 sm:w-auto"
              >
                <BookOpen className="size-3.5" />
                Details
              </button>
            </BookPreviewDialog>
          ) : (
            <BookPreviewDialog book={book} index={index} loanStatus={loanStatus}>
              <button
                type="button"
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-primary/30 px-3.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 sm:w-auto"
              >
                <BookOpen className="size-3.5" />
                Preview
              </button>
            </BookPreviewDialog>
          )}

          {canReadFree ? (
            <Link
              to={getBookReaderPath(book)}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] sm:w-auto"
            >
              <BookOpen className="size-3.5" />
              {primaryLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void handlePrimaryAction()}
              disabled={busy || isActive || isRequested}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] disabled:opacity-50 disabled:shadow-none sm:w-auto"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <BookOpen className="size-3.5" />}
              {primaryLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
