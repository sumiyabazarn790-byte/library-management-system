import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Book } from "@/types/library";
import { BookCard } from "./BookCard";
import { Sparkles } from "lucide-react";

export const Recommendations = ({ refreshKey }: { refreshKey?: number }) => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    const run = async () => {
      let preferred: string[] = [];
      if (user) {
        // Derive preferred genres from past loans
        const { data: loans } = await supabase
          .from("loans")
          .select("book:books(genre)")
          .eq("user_id", user.id)
          .limit(20);
        preferred = Array.from(new Set((loans ?? []).map((l: any) => l.book?.genre).filter(Boolean)));
      }
      setGenres(preferred);

      let query = supabase.from("books").select("*").gt("available_copies", 0).limit(8);
      if (preferred.length) query = query.in("genre", preferred);
      const { data } = await query;
      let list = (data as Book[]) ?? [];
      if (list.length < 4) {
        const { data: extra } = await supabase.from("books").select("*").limit(8);
        const seen = new Set(list.map((b) => b.id));
        for (const b of (extra as Book[]) ?? []) if (!seen.has(b.id)) list.push(b);
      }
      setBooks(list.slice(0, 4));
    };
    run();
  }, [user, refreshKey]);

  return (
    <section>
      <div className="flex items-end justify-between mb-6 gap-6 flex-wrap">
        <div>
          <h2 className="text-headline-md flex items-center gap-3">
            <Sparkles className="size-6 text-primary" />
            Танд зориулсан
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            {genres.length
              ? <>Таны сонирхдог: <span className="text-primary">{genres.slice(0, 3).join(", ")}</span></>
              : "AI санал болгосон номнууд"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {books.map((b, i) => (
          <BookCard key={b.id} book={b} index={i} />
        ))}
      </div>
    </section>
  );
};
