import { Home, Compass, BookMarked, Sparkles, Settings } from "lucide-react";

const items = [
  { icon: Home, active: true, label: "Home" },
  { icon: Compass, label: "Discover" },
  { icon: BookMarked, label: "Library" },
  { icon: Sparkles, label: "AI" },
  { icon: Settings, label: "Settings" },
];

export const SideRail = () => {
  return (
    <aside className="hidden lg:flex fixed left-0 top-16 bottom-0 w-14 z-40 flex-col items-center py-8 gap-6 border-r border-border/40 bg-surface/60 backdrop-blur">
      {items.map(({ icon: Icon, active, label }) => (
        <button
          key={label}
          aria-label={label}
          className={`relative size-9 rounded-md flex items-center justify-center transition-all ${
            active
              ? "text-primary bg-primary/10 shadow-glow-soft"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-high"
          }`}
        >
          {active && (
            <span className="absolute -left-px top-1.5 bottom-1.5 w-px bg-primary shadow-glow-primary" />
          )}
          <Icon className="size-[18px]" strokeWidth={1.6} />
        </button>
      ))}
    </aside>
  );
};
