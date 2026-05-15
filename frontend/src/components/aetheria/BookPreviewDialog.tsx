import type { ReactNode } from "react";
import { BookOpen, Languages, LibraryBig, Sparkles } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { buildSignInPath } from "@/lib/auth";
import { getBookCover } from "@/lib/bookCovers";
import { buildReadingSections, canReadBookNow, getBookReaderPath, isUuid } from "@/lib/library";
import type { Book, LoanStatus } from "@/types/library";

type BookPreviewDialogProps = {
  book: Book;
  children: ReactNode;
  index?: number;
  loanStatus?: LoanStatus | null;
};

const getStatusLabel = (loanStatus: LoanStatus | null) => {
  if (loanStatus === "active") return "Tanii library-d baina";
  if (loanStatus === "requested") return "Zahialsan";
  if (loanStatus === "returned") return "Omno unshsan";
  return null;
};

export const BookPreviewDialog = ({
  book,
  children,
  index = 0,
  loanStatus = null,
}: BookPreviewDialogProps) => {
  const { user } = useAuth();
  const previewSections = buildReadingSections(book).slice(0, 3);
  const canReadImmediately = canReadBookNow(book);
  const canOpenReader = canReadImmediately || loanStatus === "active";
  const hasCanonicalBookId = isUuid(book.id);
  const statusLabel = getStatusLabel(loanStatus);
  const readerPath = getBookReaderPath(book);
  const readerActionPath = user ? readerPath : buildSignInPath(readerPath);
  const readerActionLabel = user
    ? loanStatus === "active"
      ? "Read borrowed copy"
      : "Open text reader"
    : "Sign in to read";
  const accessHint =
    loanStatus === "active"
      ? "Tanii library-s unshina"
      : canReadImmediately
        ? user
          ? "Shuud unshij bolno"
          : "Nevtreed unshina"
        : hasCanonicalBookId
          ? "Zeelej baij unshina"
          : "Preview-only catalog";
  const accessType =
    loanStatus === "active"
      ? "Borrowed reader"
      : canReadImmediately
        ? "Free read"
        : hasCanonicalBookId
          ? "Library borrow"
          : "Preview only";
  const accessDescription =
    loanStatus === "active"
      ? "This title is already in your Library. Open the reader here or from My loans and continue inside Aetheria."
      : canReadImmediately
        ? user
          ? "This title is public-readable, so you can open it from the catalog without borrowing first."
          : "This title becomes readable right after you sign in. Borrowing is not required."
        : !hasCanonicalBookId
          ? "This title is currently shown as a local preview card only. Borrow and save actions are disabled until it is added to the database catalog."
          : book.available_copies > 0
            ? "This title can be borrowed for free from the catalog."
            : "This title is currently unavailable, so you can place a free request and borrow it once a copy returns.";

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-4xl overflow-hidden border-border/60 bg-surface-elevated p-0 text-foreground sm:max-h-[calc(100vh-3rem)]">
        <div className="grid md:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden border-r border-border/50 bg-background/70 md:block">
            <img
              src={getBookCover(book, index)}
              alt={book.title}
              className="h-80 w-full object-cover"
            />
            <div className="space-y-4 p-5 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Author</p>
                <p className="mt-1 font-medium">{book.author}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Genre</p>
                <p className="mt-1 font-medium">{book.genre}</p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Languages className="size-4" />
                <span>{book.language === "mn" ? "Mongol" : "English"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <LibraryBig className="size-4" />
                <span>
                  {book.available_copies}/{book.total_copies} available
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Access</p>
                <p className="mt-1 font-medium">{accessType}</p>
              </div>
            </div>
          </aside>

          <div className="p-4 sm:p-6 md:p-7">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl leading-tight">{book.title}</DialogTitle>
              <DialogDescription>
                {book.author} · {book.genre}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary">
                <BookOpen className="size-3.5" />
                {accessHint}
              </span>
              {statusLabel ? (
                <span className="inline-flex rounded-full bg-secondary-deep/30 px-3 py-1 text-secondary">
                  {statusLabel}
                </span>
              ) : null}
              <span className="inline-flex rounded-full bg-surface-high px-3 py-1 text-muted-foreground">
                {accessType}
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="size-4 text-primary" />
                Nomiin taniltsuulga
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {book.description.trim() || "Ene nomiin tovch taniltsuulga odoogoor baihgui baina."}
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-secondary/20 bg-secondary-deep/10 p-4">
              <p className="text-sm font-semibold text-foreground">
                {canOpenReader ? "Reader access" : "Borrow access"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {accessDescription}
              </p>

              {canOpenReader ? (
                <DialogClose asChild>
                  <Link
                    to={readerActionPath}
                    className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_36px_hsl(var(--primary)/0.45)]"
                  >
                    <BookOpen className="size-3.5" />
                    {readerActionLabel}
                  </Link>
                </DialogClose>
              ) : null}
            </div>

            <ScrollArea className="mt-6 h-[48vh] pr-2 sm:pr-4">
              <div className="space-y-4">
                {previewSections.map((paragraph, paragraphIndex) => (
                  <p key={`${book.id}-preview-${paragraphIndex}`} className="text-sm leading-7 text-foreground/90">
                    {paragraph}
                  </p>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
