import { Eye } from "lucide-react";
import codex from "@/assets/spotlight-codex.jpg";

export const ArchiveSpotlight = () => {
  return (
    <section className="relative overflow-hidden rounded-2xl ring-hairline glass">
      <div className="absolute -top-20 -left-20 size-[20rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="grid md:grid-cols-2 gap-10 p-8 md:p-12 items-center">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl ring-hairline-strong shadow-cinematic">
          <img
            src={codex}
            alt="Leonardo's Flight Codex Leicester"
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <span className="text-label text-primary">Archive Spotlight</span>
          <h2 className="text-headline-lg mt-4">
            Leonardo's Flight: The<br /> Codex <span className="text-gradient-accent">Leicester</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed mt-5 max-w-md">
            Experience history in ultra-high resolution. Our team of curators and digital conservators
            have restored Da Vinci's most famous notebook. Delve into the mind of a polymath with
            interactive mirror-text translation and 3D diagram visualizations.
          </p>
          <button className="mt-8 inline-flex items-center gap-2 h-11 px-5 rounded-full glass-strong text-foreground hover:bg-primary/10 hover:text-primary border border-primary/30 transition-all text-sm font-semibold">
            <Eye className="size-4" strokeWidth={1.7} />
            View Digital Archive
          </button>
        </div>
      </div>
    </section>
  );
};
