import { BookMarked, BookOpen, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Book, LoanStatus } from "@/types/library";
import { useAuth } from "@/contexts/AuthContext";
import { buildSignInPath } from "@/lib/auth";
import { getBookCover } from "@/lib/bookCovers";
import {
  canReadBookNow,
  getBookReaderPath,
  isUuid,
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
  const hasCanonicalBookId = isUuid(book.id);
  const isActive = loanStatus === "active";
  const isRequested = loanStatus === "requested";
  const readerPath = getBookReaderPath(book);

  const primaryLabel = useMemo(() => {
    if (canReadFree) return user ? "Read on site" : "Sign in to read";
    if (!hasCanonicalBookId) return "Preview only";
    if (isActive) return "Borrowed";
    if (isRequested) return "Requested";
    return book.available_copies > 0 ? "Borrow" : "Request";
  }, [book.available_copies, canReadFree, hasCanonicalBookId, isActive, isRequested, user]);

  const completeBorrowFlow = async (borrowMode: "borrow" | "request") => {
    if (!user) {
      navigate("/auth");
      return false;
    }

    if (!hasCanonicalBookId) {
      toast.message("Ene preview nom local catalog-d l baina. Database-d burtgeltei huvilbar deer borrow hiih bolno.");
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

  const handleReaderSignIn = () => {
    navigate(buildSignInPath(readerPath));
  };

  const handleSaveToggle = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!hasCanonicalBookId) {
      toast.message("Ene preview nom local catalog-d l baina. Database-d burtgeltei nomuudiig save hiij bolno.");
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

  const renderCardTrigger = (options?: { onClick?: () => void; ariaLabel?: string }) => (
    <button
      type="button"
      onClick={options?.onClick}
      className="flex flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      aria-label={options?.ariaLabel ?? (canReadFree ? `${book.title} open reader` : `${book.title} open preview`)}
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
        <div className="absolute left-2.5 top-2.5 flex max-w-[calc(100%-3.5rem)] flex-wrap gap-1.5 sm:left-3 sm:top-3 sm:gap-2">
          <span className="max-w-full truncate rounded-full glass px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/90 sm:px-2.5 sm:text-label">
            {book.genre}
          </span>
          {canReadFree ? (
            <span className="rounded-full bg-secondary-deep/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary sm:px-2.5 sm:text-label">
              Free read
            </span>
          ) : null}
        </div>
        <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3">
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] sm:px-2.5 sm:text-label ${
              book.language === "mn" ? "bg-secondary-deep/60 text-secondary" : "bg-primary/15 text-primary"
            }`}
          >
            {book.language === "mn" ? "MN" : "EN"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        <h3 className="min-h-[2.45rem] text-[15px] font-display font-semibold leading-tight sm:min-h-0 sm:text-base">
          <span className="line-clamp-2">{book.title}</span>
        </h3>
        <p className="mt-1 line-clamp-1 text-[12px] text-muted-foreground sm:text-sm">{book.author}</p>
        <p className="mt-2 flex-1 line-clamp-2 text-[12px] leading-5 text-muted-foreground/80 sm:mt-3 sm:text-[13px] sm:leading-relaxed">
          {book.description}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2 sm:mt-4 sm:gap-3">
          <div className="space-y-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-label">
              {book.available_copies}/{book.total_copies} available
            </span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/80 sm:text-[11px] sm:tracking-[0.18em]">
            {canReadFree ? (user ? "Read now" : "Sign in") : "Preview"}
          </span>
        </div>
      </div>
    </button>
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-[18px] bg-surface-elevated/50 ring-hairline transition-all hover:-translate-y-1 hover:bg-surface-high/50 hover:shadow-cinematic hover:ring-hairline-strong sm:rounded-xl">
      {canReadFree ? (
        user ? (
          <BookReaderDialog book={book} index={index}>
            {renderCardTrigger()}
          </BookReaderDialog>
        ) : (
          renderCardTrigger({
            onClick: handleReaderSignIn,
            ariaLabel: `${book.title} sign in to open reader`,
          })
        )
      ) : (
        <BookPreviewDialog book={book} index={index} loanStatus={loanStatus}>
          {renderCardTrigger()}
        </BookPreviewDialog>
      )}

      <div className="px-2.5 pb-2.5 sm:px-4 sm:pb-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => void handleSaveToggle()}
            disabled={saveBusy || !hasCanonicalBookId}
            className={`inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition-colors sm:h-9 sm:w-auto sm:px-3.5 sm:text-xs ${
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
                className="hidden h-9 items-center justify-center gap-1.5 rounded-md border border-secondary/40 px-3.5 text-xs font-semibold text-secondary transition-colors hover:bg-secondary-deep/30 sm:inline-flex"
              >
                <BookOpen className="size-3.5" />
                Details
              </button>
            </BookPreviewDialog>
          ) : (
            <BookPreviewDialog book={book} index={index} loanStatus={loanStatus}>
              <button
                type="button"
                className="hidden h-9 items-center justify-center gap-1.5 rounded-md border border-primary/30 px-3.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 sm:inline-flex"
              >
                <BookOpen className="size-3.5" />
                Preview
              </button>
            </BookPreviewDialog>
          )}

          {canReadFree ? (
            user ? (
              <Link
                to={readerPath}
                className="inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md bg-primary px-2 text-[11px] font-semibold text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] sm:h-9 sm:w-auto sm:px-3.5 sm:text-xs"
              >
                <BookOpen className="size-3.5" />
                {primaryLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleReaderSignIn}
                className="inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md bg-primary px-2 text-[11px] font-semibold text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] sm:h-9 sm:w-auto sm:px-3.5 sm:text-xs"
              >
                <BookOpen className="size-3.5" />
                {primaryLabel}
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => void handlePrimaryAction()}
              disabled={busy || isActive || isRequested || !hasCanonicalBookId}
              className="inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md bg-primary px-2 text-[11px] font-semibold text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] disabled:opacity-50 disabled:shadow-none sm:h-9 sm:w-auto sm:px-3.5 sm:text-xs"
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
