import quantum from "@/assets/curio-quantum.jpg";
import stoic from "@/assets/curio-stoic.jpg";
import rare from "@/assets/curio-rare.jpg";
import modern from "@/assets/curio-modern.jpg";
import heroCosmos from "@/assets/hero-cosmos.jpg";
import bookCodex from "@/assets/book-codex.jpg";
import trendPhilosophy from "@/assets/trend-philosophy.jpg";
import trendHuman from "@/assets/trend-human.jpg";
import { applyImageFallback, resolveAssetSrc, type StaticAsset } from "@/lib/utils";

type Tile = {
  image: StaticAsset;
  fallbacks: StaticAsset[];
  tag: string;
  title: string;
  span?: string;
};

const tiles: Tile[] = [
  {
    image: quantum,
    fallbacks: [heroCosmos, trendHuman, stoic],
    tag: "12 Exclusive Volumes",
    title: "Quantum Physics",
    span: "md:col-span-8",
  },
  {
    image: stoic,
    fallbacks: [trendPhilosophy, rare, bookCodex],
    tag: "Sage Collection",
    title: "Stoic Philosophy",
    span: "md:col-span-4",
  },
  {
    image: rare,
    fallbacks: [bookCodex, stoic, trendPhilosophy],
    tag: "13th Century",
    title: "Rare Archives",
    span: "md:col-span-4",
  },
  {
    image: modern,
    fallbacks: [trendHuman, heroCosmos, bookCodex],
    tag: "Visual Theory Series",
    title: "Modern Aesthetics",
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
          <article
            key={tile.title}
            className={`group relative row-span-1 cursor-pointer overflow-hidden rounded-xl ring-hairline shadow-card transition-all duration-500 hover:ring-hairline-strong hover:shadow-cinematic md:row-span-2 ${tile.span ?? ""}`}
          >
            <img
              src={resolveAssetSrc(tile.image)}
              alt={tile.title}
              loading="lazy"
              onError={(event) => applyImageFallback(event, tile.fallbacks.map(resolveAssetSrc))}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-background/85 via-background/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-7">
              <h3 className="font-display text-2xl font-semibold leading-tight md:text-3xl">{tile.title}</h3>
              <span className="mt-2 text-label text-primary">{tile.tag}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
