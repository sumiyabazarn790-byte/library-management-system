import { Search, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  loading?: boolean;
};

export const SearchBar = ({ value, onChange, loading }: Props) => {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(t);
  }, [local, onChange]);

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-accent opacity-0 group-focus-within:opacity-30 blur-xl rounded-xl transition-opacity pointer-events-none" />
      <div className="relative flex items-center gap-3 h-14 px-5 rounded-xl glass-strong ring-hairline-strong group-focus-within:ring-1 group-focus-within:ring-primary/60 transition-all">
        <Search className="size-5 text-muted-foreground shrink-0" strokeWidth={1.7} />
        <input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="Гарчиг, зохиолч, утгаар хайх… (Mongol эсвэл English)"
          className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/70 text-[15px]"
        />
        {local && (
          <button
            onClick={() => setLocal("")}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear"
          >
            <X className="size-4" />
          </button>
        )}
        <div className="hidden md:flex items-center gap-1.5 text-label text-primary px-3 py-1.5 rounded-md bg-primary/10 ring-1 ring-primary/20">
          <Sparkles className="size-3.5" />
          {loading ? "Хайж байна…" : "AI Hybrid"}
        </div>
      </div>
    </div>
  );
};
