import { Play, BookOpen } from "lucide-react";
import heroBg from "@/assets/hero-cosmos.jpg";
import bookCodex from "@/assets/book-codex.jpg";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden rounded-2xl ring-hairline-strong shadow-cinematic">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Cosmic archive backdrop"
          className="h-full w-full object-cover"
          width={1920}
          height={1024}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Glow accents */}
      <div className="absolute -top-32 -right-20 size-[28rem] rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 size-80 rounded-full bg-secondary-deep/30 blur-3xl pointer-events-none" />

      <div className="relative grid md:grid-cols-12 gap-8 px-8 md:px-14 lg:px-20 py-16 md:py-24 min-h-[560px] items-center">
        <div className="md:col-span-7 max-w-2xl animate-fade-up">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-label inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-deep/40 text-secondary border border-secondary/20">
              <span className="size-1.5 rounded-full bg-secondary animate-pulse-glow" />
              Rare Archive
            </span>
            <span className="text-label text-muted-foreground">52 Min Read</span>
          </div>

          <h1 className="text-hero text-foreground mb-5">
            Unlock the<br />
            <span className="text-gradient-accent">Archives of Time</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-lg mb-9 leading-relaxed">
            Journey through the forgotten corridors of human wisdom. Explore our latest exclusive
            curation of medieval cosmological manuscripts and early quantum theories.
          </p>

          <div className="flex flex-wrap gap-3">
            <button className="group inline-flex items-center gap-2 h-12 px-6 rounded-md bg-primary text-primary-foreground font-semibold text-sm shadow-glow-primary hover:shadow-[0_0_60px_hsl(var(--primary)/0.55)] transition-all hover:-translate-y-0.5">
              <Play className="size-4 fill-current" />
              Start Reading
            </button>
            <button className="inline-flex items-center gap-2 h-12 px-6 rounded-md border border-primary/60 text-primary font-semibold text-sm hover:bg-primary/10 hover:border-primary transition-all">
              <BookOpen className="size-4" strokeWidth={1.8} />
              Browse Collection
            </button>
          </div>
        </div>

        {/* Floating book */}
        <div className="md:col-span-5 hidden md:flex justify-center md:justify-end">
          <div className="relative animate-float">
            <div className="absolute -inset-12 bg-gradient-accent opacity-30 blur-3xl rounded-full" />
            <div className="relative w-[260px] aspect-[2/3] rounded-lg overflow-hidden ring-hairline-strong shadow-cinematic rotate-[-6deg]">
              <img
                src={bookCodex}
                alt="The Alchemist's Codex"
                className="h-full w-full object-cover"
                width={520}
                height={780}
              />
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-background via-background/70 to-transparent">
                <p className="font-display text-sm font-semibold leading-tight">The Alchemist's Codex</p>
                <p className="text-label text-primary mt-2">Restored 2024</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
