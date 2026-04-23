import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SearchBar } from "./SearchBar";
import { BookCard } from "./BookCard";
import type { Book } from "@/types/library";

export const Catalog = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancel = false;
    const run = async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("search-books", {
        body: { query, limit: 16 },
      });
      if (!cancel) {
        if (!error && data?.results) setResults(data.results as Book[]);
        setLoading(false);
      }
    };
    run();
    return () => { cancel = true; };
  }, [query, reloadKey]);

  return (
    <section id="catalog">
      <div className="flex items-end justify-between mb-6 gap-6 flex-wrap">
        <div>
          <h2 className="text-headline-md">Архивыг судлах</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Гарчиг, зохиолч, утгаар хайна уу. AI fuzzy + semantic хослуулсан.
          </p>
        </div>
      </div>

      <SearchBar value={query} onChange={setQuery} loading={loading} />

      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {results.map((b, i) => (
          <BookCard key={b.id} book={b} index={i} onChanged={() => setReloadKey((k) => k + 1)} />
        ))}
      </div>

      {!loading && results.length === 0 && (
        <p className="mt-12 text-center text-muted-foreground">Илэрц олдсонгүй.</p>
      )}
    </section>
  );
};
