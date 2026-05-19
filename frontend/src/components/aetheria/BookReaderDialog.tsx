import type { ReactNode } from "react";
import { BookOpen, CalendarDays, ExternalLink, Languages, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getBookCover } from "@/lib/bookCovers";
import { ReaderVoiceControls } from "./ReaderVoiceControls";
import {
  buildReadingSections,
  canReadBookNow,
  formatLibraryDate,
  formatLibraryMoney,
  getBookReaderPath,
  getPublicDomainReaderUrl,
  getBorrowCurrency,
  getBorrowPrice,
  requiresBorrowPayment,
} from "@/lib/library";
import type { Book, LoanWithBook } from "@/types/library";

type BookReaderDialogProps = {
  loan?: LoanWithBook;
  book?: Book;
  index?: number;
  label?: string;
  className?: string;
  children?: ReactNode;
};

export const BookReaderDialog = ({
  loan,
  book,
  index = 0,
  label,
  className = "inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10",
  children,
}: BookReaderDialogProps) => {
  const sourceBook = loan?.book ?? book;

  if (!sourceBook) {
    return null;
  }

  const readingSections = buildReadingSections(sourceBook);
  const hasPublicReader = canReadBookNow(sourceBook);
  const borrowedLoan = loan ?? null;
  const isBorrowedReader = Boolean(loan);
  const isCatalogReader = !isBorrowedReader && !hasPublicReader;
  const triggerLabel = label ?? "Read now";
  const accessLabel = isBorrowedReader ? "Borrowed copy" : hasPublicReader ? "Public reader" : "Instant reader";
  const borrowPrice = getBorrowPrice(sourceBook);
  const borrowCurrency = getBorrowCurrency(sourceBook);
  const needsBorrowPayment = requiresBorrowPayment(sourceBook);
  const publicDomainReaderUrl = hasPublicReader ? getPublicDomainReaderUrl(sourceBook) : null;
  const readerNote = isBorrowedReader
    ? "This is your borrowed reading view, so you can continue directly from here."
    : isCatalogReader
      ? "This instant reader opens directly from the catalog and uses the book's available metadata and sample sections for quick reading."
      : publicDomainReaderUrl
        ? "This book opens with its public-domain text inside Aetheria first, with the original source still available when you want it."
        : "This book has public reader access, so you can start reading immediately without borrowing first.";

  const trigger = children ?? (
    <button type="button" className={className}>
      <BookOpen className="size-3.5" />
      {triggerLabel}
    </button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl overflow-hidden border-border/60 bg-surface-elevated p-0 text-foreground sm:max-h-[calc(100dvh-3rem)]">
        <div className="grid max-h-[calc(100dvh-1rem)] overflow-y-auto md:grid-cols-[240px_minmax(0,1fr)] sm:max-h-[calc(100dvh-3rem)]">
          <aside className="hidden flex-col border-r border-border/50 bg-background/70 md:flex">
            <img
              src={getBookCover(sourceBook, index)}
              alt={sourceBook.title}
              className="h-72 w-full object-cover"
            />
            <div className="space-y-3 p-5 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Genre</p>
                <p className="mt-1 font-medium">{sourceBook.genre}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Author</p>
                <p className="mt-1 font-medium">{sourceBook.author}</p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Languages className="size-4" />
                <span>{sourceBook.language === "mn" ? "Mongolian" : "English"}</span>
              </div>
            </div>
          </aside>

          <div className="min-w-0 p-4 sm:p-6 md:p-7">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl leading-tight">{sourceBook.title}</DialogTitle>
              <DialogDescription>
                {sourceBook.author} - {sourceBook.genre}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {borrowedLoan ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary">
                    <CalendarDays className="size-3.5" />
                    Borrowed: {formatLibraryDate(borrowedLoan.loaned_at)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-deep/30 px-3 py-1 text-secondary">
                    <CalendarDays className="size-3.5" />
                    Due: {formatLibraryDate(borrowedLoan.due_date)}
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary">
                  <Sparkles className="size-3.5" />
                  {hasPublicReader ? "Free access" : "Open instantly"}
                </span>
              )}

              <span className="inline-flex rounded-full bg-surface-high px-3 py-1 text-muted-foreground">
                {accessLabel}
              </span>
              {isBorrowedReader && needsBorrowPayment ? (
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-primary">
                  Fee: {formatLibraryMoney(borrowPrice, borrowCurrency)}
                </span>
              ) : null}
            </div>

            {publicDomainReaderUrl ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <DialogClose asChild>
                  <Link
                    to={getBookReaderPath(sourceBook)}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_36px_hsl(var(--primary)/0.45)]"
                  >
                    <BookOpen className="size-3.5" />
                    Open full reader
                  </Link>
                </DialogClose>
                <a
                  href={publicDomainReaderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  <ExternalLink className="size-3.5" />
                  Original source
                </a>
              </div>
            ) : (
              <div className="mt-4">
                <DialogClose asChild>
                  <Link
                    to={getBookReaderPath(sourceBook)}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_36px_hsl(var(--primary)/0.45)]"
                  >
                    <BookOpen className="size-3.5" />
                    Open full reader
                  </Link>
                </DialogClose>
              </div>
            )}

            <ReaderVoiceControls sections={readingSections} language={sourceBook.language} className="mt-4" />

            <ScrollArea className="mt-6 h-[min(45dvh,24rem)] pr-2 sm:h-[55dvh] sm:pr-4">
              <div className="space-y-5">
                <div className="rounded-2xl border border-secondary/20 bg-secondary-deep/10 p-4">
                  <p className="text-sm font-semibold text-foreground">On-site text reader</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    The text below is shown directly inside Aetheria, so users can read it here even without using voice playback.
                  </p>
                </div>

                {readingSections.map((paragraph, paragraphIndex) => (
                  <p
                    key={`${loan?.id ?? sourceBook.id}-${paragraphIndex}`}
                    className="text-sm leading-7 text-foreground/90"
                  >
                    {paragraph}
                  </p>
                ))}

                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <p className="text-sm font-semibold text-primary">Reading note</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{readerNote}</p>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
