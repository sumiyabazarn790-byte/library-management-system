import { Brain, ScrollText, Sparkles, ArrowRight } from "lucide-react";

const paths = [
  {
    icon: Brain,
    title: "Biological Augmentation",
    desc: "A deep dive into the future of CRISPR and the future of human evolution.",
  },
  {
    icon: ScrollText,
    title: "The Decline of Empire",
    desc: "Comparative analysis of the fall of Rome and the British Empire.",
  },
  {
    icon: Sparkles,
    title: "Consciousness Redefined",
    desc: "Exploring the intersection of neuroscience and Eastern meditation practices.",
  },
];

export const CuratedForYou = () => {
  return (
    <section className="rounded-2xl glass ring-hairline p-8 md:p-12">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div>
          <h2 className="text-headline-md">Curated for Your Mind</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-xl">
            Based on your interest in <span className="text-primary">Transhumanism</span> and{" "}
            <span className="text-primary">Classical History</span>, our AI recommends these pathways.
          </p>
        </div>
        <div className="size-12 rounded-full bg-gradient-accent shadow-glow-primary opacity-80" aria-hidden />
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {paths.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="group rounded-xl bg-surface-elevated/60 ring-hairline p-6 hover:ring-hairline-strong hover:bg-surface-high/70 transition-all"
          >
            <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-5">
              <Icon className="size-[18px]" strokeWidth={1.7} />
            </div>
            <h3 className="font-display font-semibold text-lg leading-snug">{title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{desc}</p>
            <a
              href="#"
              className="mt-5 inline-flex items-center gap-1.5 text-label text-primary group-hover:gap-2.5 transition-all"
            >
              Begin Pathway <ArrowRight className="size-3.5" />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
};
