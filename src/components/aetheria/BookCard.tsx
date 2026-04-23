import { BookOpen, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Book } from "@/types/library";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const fallback = (i: number) => {
  const set = [
    "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600",
    "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600",
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600",
    "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600",
  ];
  return set[i % set.length];
};

export const BookCard = ({ book, index = 0, onChanged }: { book: Book; index?: number; onChanged?: () => void }) => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  const borrow = async () => {
    if (!user) { nav("/auth"); return; }
    if (book.available_copies <= 0) {
      toast.error("Хувь дууссан байна");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("borrow_book", { p_book_id: book.id });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`"${book.title}" зээлэгдлээ`);
      onChanged?.();
    }
  };

  return (
    <article className="group rounded-xl overflow-hidden ring-hairline bg-surface-elevated/50 hover:ring-hairline-strong hover:bg-surface-high/50 transition-all hover:-translate-y-1 hover:shadow-cinematic flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={book.cover_url ?? fallback(index)}
          alt={book.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallback(index); }}
        />
        <div className="absolute inset-0 bg-gradient-card-fade" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="text-label px-2.5 py-1 rounded-full glass text-foreground/90">{book.genre}</span>
        </div>
        <div className="absolute top-3 right-3">
          <span className={`text-label px-2.5 py-1 rounded-full ${book.language === "mn" ? "bg-secondary-deep/60 text-secondary" : "bg-primary/15 text-primary"}`}>
            {book.language === "mn" ? "MN" : "EN"}
          </span>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-display font-semibold leading-tight line-clamp-2">{book.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{book.author}</p>
        <p className="text-[13px] text-muted-foreground/80 mt-3 line-clamp-2 leading-relaxed flex-1">{book.description}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-label text-muted-foreground">
            {book.available_copies}/{book.total_copies} боломжтой
          </span>
          <button
            onClick={borrow}
            disabled={busy || book.available_copies <= 0}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold shadow-glow-primary disabled:opacity-50 disabled:shadow-none hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] transition-all"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <BookOpen className="size-3.5" />}
            Зээлэх
          </button>
        </div>
      </div>
    </article>
  );
};
