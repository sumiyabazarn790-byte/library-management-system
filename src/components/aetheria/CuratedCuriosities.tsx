import quantum from "@/assets/curio-quantum.jpg";
import stoic from "@/assets/curio-stoic.jpg";
import rare from "@/assets/curio-rare.jpg";
import modern from "@/assets/curio-modern.jpg";

type Tile = { img: string; tag: string; title: string; span?: string };

const tiles: Tile[] = [
  { img: quantum, tag: "12 Exclusive Volumes", title: "Quantum Physics", span: "md:col-span-8" },
  { img: stoic, tag: "Sage Collection", title: "Stoic Philosophy", span: "md:col-span-4" },
  { img: rare, tag: "13th Century", title: "Rare Archives", span: "md:col-span-4" },
  { img: modern, tag: "Visual Theory Series", title: "Modern Aesthetics", span: "md:col-span-8" },
];

export const CuratedCuriosities = () => {
  return (
    <section>
      <div className="text-center mb-10">
        <h2 className="font-display text-2xl md:text-3xl font-light tracking-[0.3em] uppercase">
          Curated <span className="text-gradient-accent">Curiosities</span>
        </h2>
        <div className="mt-4 mx-auto h-px w-24 bg-gradient-accent opacity-60" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 auto-rows-[200px]">
        {tiles.map((t) => (
          <article
            key={t.title}
            className={`group cursor-pointer relative row-span-1 md:row-span-2 overflow-hidden rounded-xl ring-hairline shadow-card transition-all duration-500 hover:ring-hairline-strong hover:shadow-cinematic ${t.span ?? ""}`}
          >
            <img
              src={t.img}
              alt={t.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-background/85 via-background/30 to-transparent" />
            <div className="absolute inset-0 p-7 flex flex-col justify-end">
              <h3 className="font-display text-2xl md:text-3xl font-semibold leading-tight">
                {t.title}
              </h3>
              <span className="text-label text-primary mt-2">{t.tag}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
