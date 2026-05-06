import { Search, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
};

export const SearchBar = ({ value, onChange, loading }: Props) => {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => onChange(local), 300);
    return () => window.clearTimeout(timeoutId);
  }, [local, onChange]);

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-accent opacity-0 pointer-events-none rounded-xl blur-xl transition-opacity group-focus-within:opacity-30" />
      <div className="relative flex h-14 items-center gap-3 rounded-xl glass-strong px-5 ring-hairline-strong transition-all group-focus-within:ring-1 group-focus-within:ring-primary/60">
        <Search className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.7} />
        <input
          id="catalog-search"
          value={local}
          onChange={(event) => setLocal(event.target.value)}
          placeholder="Search by title, author, genre, or meaning..."
          className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        {local && (
          <button
            onClick={() => setLocal("")}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear"
          >
            <X className="size-4" />
          </button>
        )}
        <div className="hidden items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-label text-primary ring-1 ring-primary/20 md:flex">
          <Sparkles className="size-3.5" />
          {loading ? "Searching..." : "Fuzzy + Semantic"}
        </div>
      </div>
    </div>
  );
};
