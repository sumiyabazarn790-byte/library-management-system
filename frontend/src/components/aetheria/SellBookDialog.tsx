import { useState } from "react";
import { BadgeDollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createSaleListing, formatLibraryDate, toFriendlyLibraryError } from "@/lib/library";
import type { LoanWithBook, SaleListing } from "@/types/library";

type SellBookDialogProps = {
  loan: LoanWithBook;
  existingListing?: SaleListing | null;
  onSubmitted?: () => void;
};

export const SellBookDialog = ({ loan, existingListing, onSubmitted }: SellBookDialogProps) => {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const normalizedPrice = Number(price);

    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      toast.error("Зарах үнэ 0-ээс их байх ёстой.");
      return;
    }

    setSubmitting(true);

    try {
      await createSaleListing({
        bookId: loan.book_id,
        price: normalizedPrice,
        note,
      });

      toast.success(`"${loan.book.title}" номын sale listing үүслээ.`);
      setOpen(false);
      setPrice("");
      setNote("");
      onSubmitted?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sale listing үүсгэж чадсангүй.";
      toast.error(toFriendlyLibraryError(message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-secondary/40 text-secondary text-xs font-semibold hover:bg-secondary/10 transition-colors"
        >
          <BadgeDollarSign className="size-3.5" />
          {existingListing ? "Зарагдаж байна" : "Зарах"}
        </button>
      </DialogTrigger>

      <DialogContent className="border-border/60 bg-surface-elevated text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{loan.book.title}</DialogTitle>
          <DialogDescription>
            Энэ урсгал нь таны өөрийн хувийг sale listing хэлбэрээр байршуулна.
          </DialogDescription>
        </DialogHeader>

        {existingListing ? (
          <div className="space-y-3 rounded-2xl border border-secondary/20 bg-secondary-deep/20 p-4">
            <p className="text-sm font-semibold text-secondary">Идэвхтэй sale listing байна</p>
            <p className="text-sm text-foreground/90">
              Үнэ: {Number(existingListing.price).toLocaleString("en-US")} {existingListing.currency}
            </p>
            <p className="text-sm text-muted-foreground">
              Үүсгэсэн: {formatLibraryDate(existingListing.created_at)}
            </p>
            {existingListing.note ? (
              <p className="text-sm text-muted-foreground">Тэмдэглэл: {existingListing.note}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Тэмдэглэл нэмээгүй байна.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor={`sale-price-${loan.id}`} className="text-sm font-medium">
                Үнэ
              </label>
              <Input
                id={`sale-price-${loan.id}`}
                type="number"
                min="1"
                step="100"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="Жишээ: 25000"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor={`sale-note-${loan.id}`} className="text-sm font-medium">
                Тэмдэглэл
              </label>
              <Input
                id={`sale-note-${loan.id}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Хувийн copy, маш цэвэрхэн гэх мэт"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {!existingListing ? (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 font-semibold text-primary-foreground shadow-glow-primary disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <BadgeDollarSign className="size-4" />}
              Listing үүсгэх
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium"
            >
              Хаах
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
