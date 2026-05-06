import { Eye } from "lucide-react";
import codex from "@/assets/book-codex.jpg";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const ArchiveSpotlight = () => {
  const codexSrc = codex.src;

  return (
    <section className="relative overflow-hidden rounded-2xl ring-hairline glass">
      <div className="grid items-center gap-8 p-6 md:grid-cols-2 md:p-8">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl ring-hairline">
          <img
            src={codexSrc}
            alt="Leonardo's Flight Codex Leicester"
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-background/70 via-transparent to-primary/10" />
          <div className="absolute left-5 top-5 rounded-full bg-background/70 px-3 py-1.5 text-label text-secondary backdrop-blur">
            Archive Feature
          </div>
        </div>

        <div>
          <span className="text-label text-primary">Archive Spotlight</span>
          <h2 className="mt-4 text-headline-lg">
            Leonardo&apos;s Flight:
            <br />
            Codex <span className="text-gradient-accent">Leicester</span>
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
            Explore the manuscript with curator notes, high-resolution preview pages, and a cleaner
            reading-focused presentation.
          </p>

          <Dialog>
            <DialogTrigger asChild>
              <button className="mt-8 inline-flex h-11 items-center gap-2 rounded-full glass-strong px-5 text-sm font-semibold text-foreground transition-colors hover:text-primary">
                <Eye className="size-4" strokeWidth={1.7} />
                View Digital Archive
              </button>
            </DialogTrigger>
            <DialogContent className="border-border/60 bg-surface-elevated text-foreground">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Codex Leicester Preview</DialogTitle>
                <DialogDescription>
                  High-resolution archive overview, curator notes, and the restored manuscript story.
                </DialogDescription>
              </DialogHeader>

              <div className="grid items-start gap-5 md:grid-cols-[1.1fr_0.9fr]">
                <img
                  src={codexSrc}
                  alt="Codex Leicester preview"
                  className="w-full rounded-xl object-cover ring-hairline"
                />
                <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    This edition focuses on motion, water, flight, and celestial observation across
                    Leonardo&apos;s notes and sketches.
                  </p>
                  <p>
                    The current build includes discovery, borrowing, AI guidance, and archive browsing
                    in a calmer reading-first layout.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
};
