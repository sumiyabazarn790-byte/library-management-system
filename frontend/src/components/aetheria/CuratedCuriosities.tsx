import { ArrowRight, BookOpen, Search, Sparkles } from "lucide-react";
import quantum from "@/assets/curio-quantum.jpg";
import stoic from "@/assets/curio-stoic.jpg";
import rare from "@/assets/curio-rare.jpg";
import modern from "@/assets/curio-modern.jpg";
import heroCosmos from "@/assets/hero-cosmos.jpg";
import bookCodex from "@/assets/book-codex.jpg";
import trendPhilosophy from "@/assets/trend-philosophy.jpg";
import trendHuman from "@/assets/trend-human.jpg";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { focusCatalogSearch, openAIAssistant } from "@/lib/navigation";
import { applyImageFallback, resolveAssetSrc, type StaticAsset } from "@/lib/utils";

type Tile = {
  image: StaticAsset;
  fallbacks: StaticAsset[];
  tag: string;
  title: string;
  description: string;
  searchQuery: string;
  assistantPrompt: string;
  notes: string[];
  span?: string;
};

const tiles: Tile[] = [
  {
    image: quantum,
    fallbacks: [heroCosmos, trendHuman, stoic],
    tag: "12 Exclusive Volumes",
    title: "Quantum Physics",
    description:
      "A focused route through paradox, cosmology, uncertainty, and the experiments that reshaped modern thought.",
    searchQuery: "Quantum Physics",
    assistantPrompt: "Recommend readable Quantum Physics books from the Aetheria catalog.",
    notes: ["Start with accessible theory before deeper mathematical texts.", "Useful for readers who like science, cosmology, and philosophical uncertainty."],
    span: "md:col-span-8",
  },
  {
    image: stoic,
    fallbacks: [trendPhilosophy, rare, bookCodex],
    tag: "Sage Collection",
    title: "Stoic Philosophy",
    description:
      "A practical shelf for discipline, ethics, reflection, and older texts that still feel useful in daily life.",
    searchQuery: "Philosophy",
    assistantPrompt: "Find Stoic Philosophy and practical ethics books in Aetheria.",
    notes: ["Good first stop for habit, patience, and self-command.", "Pairs well with history and biography collections."],
    span: "md:col-span-4",
  },
  {
    image: rare,
    fallbacks: [bookCodex, stoic, trendPhilosophy],
    tag: "13th Century",
    title: "Rare Archives",
    description:
      "Recovered manuscripts, archive fragments, letters, and unusual works gathered for slow discovery.",
    searchQuery: "Rare Archives",
    assistantPrompt: "Show me rare archive-style books and manuscripts I can explore.",
    notes: ["Best for browsing by mood rather than by one exact subject.", "Includes historical, manuscript, and restored-text style titles."],
    span: "md:col-span-4",
  },
  {
    image: modern,
    fallbacks: [trendHuman, heroCosmos, bookCodex],
    tag: "Visual Theory Series",
    title: "Modern Aesthetics",
    description:
      "A visual-thinking path through design, architecture, taste, interfaces, and the language of modern form.",
    searchQuery: "Design",
    assistantPrompt: "Recommend books about design, aesthetics, architecture, and visual theory.",
    notes: ["A strong fit for readers who think through images and spaces.", "Try this alongside technology and architecture shelves."],
    span: "md:col-span-8",
  },
];

export const CuratedCuriosities = () => {
  return (
    <section id="collections" className="scroll-mt-24">
      <div className="mb-10 text-center">
        <h2 className="font-display text-2xl font-light uppercase tracking-[0.3em] md:text-3xl">
          Curated <span className="text-gradient-accent">Curiosities</span>
        </h2>
        <div className="mx-auto mt-4 h-px w-24 bg-gradient-accent opacity-60" />
      </div>

      <div className="grid auto-rows-[200px] grid-cols-1 gap-5 md:grid-cols-12">
        {tiles.map((tile) => (
          <Dialog key={tile.title}>
            <DialogTrigger asChild>
              <button
                type="button"
                className={`group relative row-span-1 overflow-hidden rounded-xl text-left ring-hairline shadow-card transition-all duration-500 hover:ring-hairline-strong hover:shadow-cinematic focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 md:row-span-2 ${tile.span ?? ""}`}
                aria-label={`Open ${tile.title} collection`}
              >
                <img
                  src={resolveAssetSrc(tile.image)}
                  alt={tile.title}
                  loading="lazy"
                  onError={(event) => applyImageFallback(event, tile.fallbacks.map(resolveAssetSrc))}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-background/85 via-background/30 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-7">
                  <h3 className="font-display text-2xl font-semibold leading-tight md:text-3xl">{tile.title}</h3>
                  <span className="mt-2 text-label text-primary">{tile.tag}</span>
                  <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur transition-colors group-hover:border-primary/35 group-hover:text-primary">
                    <BookOpen className="size-3.5" />
                    Open collection
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            </DialogTrigger>

            <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl overflow-y-auto border-border/60 bg-surface-elevated p-0 text-foreground sm:max-h-[calc(100dvh-3rem)]">
              <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(280px,0.82fr)]">
                <div className="relative min-h-[240px] overflow-hidden md:min-h-full">
                  <img
                    src={resolveAssetSrc(tile.image)}
                    alt={`${tile.title} collection preview`}
                    onError={(event) => applyImageFallback(event, tile.fallbacks.map(resolveAssetSrc))}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5">
                    <p className="text-label text-primary">{tile.tag}</p>
                    <p className="mt-2 font-display text-3xl font-semibold leading-tight text-white">{tile.title}</p>
                  </div>
                </div>

                <div className="min-w-0 p-5 sm:p-6 md:p-7">
                  <DialogHeader>
                    <DialogTitle className="font-display text-2xl leading-tight">{tile.title}</DialogTitle>
                    <DialogDescription>{tile.description}</DialogDescription>
                  </DialogHeader>

                  <div className="mt-5 space-y-3">
                    {tile.notes.map((note) => (
                      <div key={note} className="rounded-2xl border border-border/55 bg-background/35 p-4 text-sm leading-6 text-muted-foreground">
                        {note}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <DialogClose asChild>
                      <button
                        type="button"
                        onClick={() => focusCatalogSearch(tile.searchQuery)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_36px_hsl(var(--primary)/0.42)]"
                      >
                        <Search className="size-4" />
                        Browse matching books
                      </button>
                    </DialogClose>

                    <DialogClose asChild>
                      <button
                        type="button"
                        onClick={() => openAIAssistant(tile.assistantPrompt)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                      >
                        <Sparkles className="size-4" />
                        Ask AI
                      </button>
                    </DialogClose>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </section>
  );
};
