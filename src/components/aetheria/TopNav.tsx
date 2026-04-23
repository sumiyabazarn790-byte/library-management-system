import { Search, Bell, User } from "lucide-react";

const links = ["Home", "Browse", "Library", "Collections", "AI Insights"];

export const TopNav = () => {
  return (
    <header className="fixed top-0 inset-x-0 z-50 glass-strong">
      <nav className="max-w-[1440px] mx-auto flex items-center justify-between px-6 lg:px-12 h-16">
        <div className="flex items-center gap-12">
          <a href="#" className="font-display font-bold tracking-tight text-lg text-gradient-accent">
            AETHERIA
          </a>
          <ul className="hidden md:flex items-center gap-8 text-label text-muted-foreground">
            {links.map((l, i) => (
              <li key={l}>
                <a
                  href="#"
                  className={
                    i === 1
                      ? "text-primary transition-colors"
                      : "hover:text-foreground transition-colors"
                  }
                >
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors" aria-label="Search">
            <Search className="size-[18px]" strokeWidth={1.6} />
          </button>
          <button className="p-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors" aria-label="Notifications">
            <Bell className="size-[18px]" strokeWidth={1.6} />
          </button>
          <button className="ml-2 size-8 rounded-full bg-gradient-accent ring-hairline-strong flex items-center justify-center text-primary-foreground" aria-label="Account">
            <User className="size-4" strokeWidth={2} />
          </button>
        </div>
      </nav>
    </header>
  );
};
