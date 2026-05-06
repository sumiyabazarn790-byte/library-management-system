import { useEffect, useState } from "react";
import { SearchBar } from "./SearchBar";
import { BookCard } from "./BookCard";
import type { Book, LoanStatus } from "@/types/library";
import { fetchLoanStatusesByBookIds, fetchSavedStatusesByBookIds, searchBooks } from "@/lib/library";
import { useAuth } from "@/contexts/AuthContext";
import { getBookCover } from "@/lib/bookCovers";
import { cn } from "@/lib/utils";

const genreDescriptions: Record<string, string> = {
  "Rare Archives": "Recovered manuscripts, sealed letters, and quiet artifacts from vanished institutions.",
  Philosophy: "Inner discipline, ethics, and questions that stay useful long after the page ends.",
  History: "Trade routes, memory, cities, and the human forces hidden behind official timelines.",
  Anthropology: "Ritual, kinship, storytelling, and the living architecture of culture.",
  "Quantum Physics": "Elegant uncertainty, paradox, and experiments that reshape how reality is described.",
  Cosmology: "Galaxies, dark matter, and large-scale maps of the universe.",
  AI: "Machine learning, language systems, and the responsibilities carried by modern models.",
  Mythology: "Sky legends, symbolic worlds, and stories that cultures keep returning to.",
  Literature: "Novels, letters, and crafted prose shaped by memory, place, and emotional precision.",
  Poetry: "Compressed language, image-rich attention, and books that move by cadence as much as thought.",
  Psychology: "Habit, grief, perception, and the inner patterns that quietly shape human life.",
  Economics: "Trade, value, institutions, and the lived realities behind systems and markets.",
  Design: "Typography, interfaces, objects, and thoughtful systems made for human use.",
  Ecology: "Rivers, forests, climate, and the moral imagination required to live inside ecosystems.",
  Linguistics: "Language, naming, grammar, and the movement of meaning across cultures.",
  Mathematics: "Proof, abstraction, beauty, and the patient elegance of exact thinking.",
  Biography: "Lives reconstructed through letters, archives, struggle, and unfinished ambitions.",
  Architecture: "Light, material, cities, and the spatial ethics of how people dwell together.",
  Technology: "Clouds, machines, infrastructure, and the cultural consequences of technical design.",
  Spirituality: "Attention, practice, devotion, and the disciplines of an interior life.",
};

export const Catalog = ({
  refreshKey,
  onLibraryChange,
}: {
  refreshKey?: number;
  onLibraryChange?: () => void;
}) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState("");
  const [loanStatusByBookId, setLoanStatusByBookId] = useState<Record<string, LoanStatus>>({});
  const [savedByBookId, setSavedByBookId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const data = await searchBooks(query, query.trim() ? 48 : 64);
        const bookIds = data.map((book) => book.id);
        const [nextLoanStatusByBookId, nextSavedByBookId] =
          user && data.length
            ? await Promise.all([
                fetchLoanStatusesByBookIds(user.id, bookIds).catch(() => ({})),
                fetchSavedStatusesByBookIds(user.id, bookIds).catch(() => ({})),
              ])
            : [{}, {}];

        if (!canceled) {
          setResults(data);
          setLoanStatusByBookId(nextLoanStatusByBookId);
          setSavedByBookId(nextSavedByBookId);
        }
      } catch (error) {
        if (!canceled) {
          setResults([]);
          setLoanStatusByBookId({});
          setSavedByBookId({});
          setErrorMessage(error instanceof Error ? error.message : "Catalog could not be loaded.");
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      canceled = true;
    };
  }, [query, refreshKey, user]);

  const genreGroups = results.reduce<Record<string, Book[]>>((groups, book) => {
    if (!groups[book.genre]) {
      groups[book.genre] = [];
    }

    groups[book.genre].push(book);
    return groups;
  }, {});

  const genres = Object.keys(genreGroups).sort(
    (left, right) =>
      genreGroups[right].length - genreGroups[left].length || left.localeCompare(right),
  );

  useEffect(() => {
    if (!genres.length) {
      if (activeGenre) {
        setActiveGenre("");
      }
      return;
    }

    if (!activeGenre || !genres.includes(activeGenre)) {
      setActiveGenre(genres[0]);
    }
  }, [activeGenre, genres]);

  const selectedGenre = activeGenre && genres.includes(activeGenre) ? activeGenre : genres[0] ?? "";
  const selectedBooks = selectedGenre ? genreGroups[selectedGenre] ?? [] : [];
  const hasQuery = Boolean(query.trim());

  return (
    <section id="browse" className="scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:gap-6">
        <div>
          <h2 className="text-headline-md">Explore the archive</h2>
        </div>
      </div>

      <SearchBar value={query} onChange={setQuery} loading={loading} />

      {errorMessage && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      {!errorMessage && results.length > 0 && (
        <>
          <div className="scrollbar-none mt-6 overflow-x-auto pb-2">
            <div className="flex min-w-max gap-4">
              {genres.map((genre, genreIndex) => {
                const genreBooks = genreGroups[genre];
                const coverBook = genreBooks[0];
                const isActive = genre === selectedGenre;

                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setActiveGenre(genre)}
                    className={cn(
                      "group relative w-[260px] overflow-hidden rounded-[28px] text-left transition-all sm:w-[300px] md:w-[320px]",
                      isActive ? "scale-[1.01]" : "hover:-translate-y-1",
                    )}
                    aria-pressed={isActive}
                  >
                    <div
                      className={cn(
                        "relative h-[200px] overflow-hidden rounded-[28px] ring-1 transition-all sm:h-[220px] md:h-[236px]",
                        isActive
                          ? "ring-primary/50 shadow-[0_20px_60px_hsl(var(--primary)/0.18)]"
                          : "ring-white/10 group-hover:ring-white/20",
                      )}
                    >
                      <img
                        src={getBookCover(coverBook, genreIndex)}
                        alt={genre}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,12,0.18)_0%,rgba(10,10,12,0.42)_38%,rgba(10,10,12,0.92)_100%)]" />

                      <div className="absolute left-4 top-4">
                        <span className="rounded-full bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90 ring-1 ring-white/10">
                          {genre}
                        </span>
                      </div>

                      <div className="absolute right-4 top-4 rounded-full bg-primary/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary ring-1 ring-primary/20">
                        {genreBooks.length} books
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                        <p className="max-w-[24ch] text-sm leading-relaxed text-white/78 sm:text-base">
                          {genreDescriptions[genre] ?? "Open this shelf to explore the full collection."}
                        </p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/92">
                          {isActive ? "Opened shelf" : "Tap to open"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedGenre ? (
            <div className="mt-8 rounded-[30px] glass p-4 ring-hairline sm:p-6 md:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-label uppercase tracking-[0.22em] text-primary/80">
                    {hasQuery ? "Selected results" : "Selected shelf"}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold leading-tight sm:text-3xl">{selectedGenre}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {genreDescriptions[selectedGenre] ?? "A focused collection gathered around one genre and its recurring ideas."}
                  </p>
                </div>

                <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary ring-1 ring-primary/15">
                  {selectedBooks.length} {selectedBooks.length === 1 ? "book" : "books"}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {selectedBooks.map((book, index) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    index={index}
                    loanStatus={loanStatusByBookId[book.id] ?? null}
                    isSaved={savedByBookId[book.id] ?? false}
                    onChanged={onLibraryChange}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      {!loading && !errorMessage && results.length === 0 && (
        <p className="mt-12 text-center text-muted-foreground">No results found.</p>
      )}
    </section>
  );
};
