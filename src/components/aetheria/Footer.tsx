import { ArrowRight } from "lucide-react";

const cols = [
  { h: "Discovery", links: ["Latest Additions", "Master Archives", "Audio Insights", "Visual Essays"] },
  { h: "Ecosystem", links: ["Membership Tiers", "Corporate Reels", "Institutional Access", "Preservation Lab"] },
];

export const Footer = () => {
  return (
    <footer className="border-t border-border/40 mt-12 pt-16 pb-10">
      <div className="grid md:grid-cols-12 gap-10">
        <div className="md:col-span-4">
          <h3 className="font-display font-bold text-lg text-gradient-accent">AETHERIA</h3>
          <p className="text-sm text-muted-foreground mt-4 max-w-xs leading-relaxed">
            The premier digital vault for human knowledge. High-resolution preservation of rare manuscripts
            and curated intellectual pathways for the curious mind.
          </p>
        </div>

        {cols.map((c) => (
          <div key={c.h} className="md:col-span-2">
            <h4 className="text-label text-primary mb-5">{c.h}</h4>
            <ul className="space-y-3">
              {c.links.map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="md:col-span-4">
          <h4 className="text-label text-primary mb-5">Connect</h4>
          <p className="text-sm text-muted-foreground mb-4">Join the dispatch.</p>
          <form className="flex gap-2">
            <input
              type="email"
              placeholder="you@archive.com"
              className="flex-1 h-11 px-4 rounded-md bg-surface-elevated border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm placeholder:text-muted-foreground/60 transition-colors"
            />
            <button
              type="submit"
              aria-label="Subscribe"
              className="h-11 w-11 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-glow-primary hover:shadow-[0_0_50px_hsl(var(--primary)/0.55)] transition-all"
            >
              <ArrowRight className="size-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="mt-14 pt-6 border-t border-border/40 flex flex-wrap gap-4 justify-between text-xs text-muted-foreground">
        <p>© 2024 Aetheria Knowledge Systems. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-foreground transition-colors">Privacy Codex</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms of Access</a>
          <a href="#" className="hover:text-foreground transition-colors">Research Ethics</a>
        </div>
      </div>
    </footer>
  );
};
