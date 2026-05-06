import { ArrowRight } from "lucide-react";
import human from "@/assets/trend-human.jpg";
import quantum from "@/assets/curio-quantum.jpg";
import philosophy from "@/assets/trend-philosophy.jpg";
import global from "@/assets/trend-global.jpg";

const items = [
  { img: human.src, tag: "Anthropology", title: "The Human Matrix" },
  { img: quantum.src, tag: "Quantum", title: "Entangled Realities" },
  { img: philosophy.src, tag: "Philosophy", title: "Quietude of Mind" },
  { img: global.src, tag: "Cybernetics", title: "Global Synapse" },
];

export const TrendingNow = () => {
  return (
    <section>
      <div className="flex items-end justify-between mb-6 gap-6">
        <div>
          <h2 className="text-headline-md">Trending Now</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Most discussed intellectual masterpieces this week
          </p>
        </div>
        <a
          href="#"
          className="text-label text-primary hover:text-primary-glow inline-flex items-center gap-1.5 transition-colors"
        >
          View All Trends <ArrowRight className="size-3.5" />
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {items.map((t) => (
          <article
            key={t.title}
            className="group cursor-pointer relative aspect-square overflow-hidden rounded-lg ring-hairline shadow-card transition-all duration-500 hover:ring-hairline-strong hover:shadow-cinematic hover:-translate-y-1"
          >
            <img
              src={t.img}
              alt={t.title}
              loading="lazy"
              width={640}
              height={640}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
            <div className="absolute inset-x-5 bottom-5">
              <span className="text-label text-primary">{t.tag}</span>
              <h3 className="font-display font-semibold text-xl mt-2 leading-tight">{t.title}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
