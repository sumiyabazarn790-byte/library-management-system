import { Search, Bell, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const links = ["Home", "Browse", "Library", "Collections", "AI Insights"];

export const TopNav = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="fixed top-0 inset-x-0 z-50 glass-strong">
      <nav className="max-w-[1440px] mx-auto flex items-center justify-between px-6 lg:px-12 h-16">
        <div className="flex items-center gap-12">
          <Link to="/app" className="font-display font-bold tracking-tight text-lg text-gradient-accent">
            AETHERIA
          </Link>
          <ul className="hidden md:flex items-center gap-8 text-label text-muted-foreground">
            {links.map((l, i) => (
              <li key={l}>
                <a href="#catalog" className={i === 1 ? "text-primary transition-colors" : "hover:text-foreground transition-colors"}>
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
          {user ? (
            <button
              onClick={signOut}
              className="ml-2 inline-flex items-center gap-2 h-9 px-3 rounded-md bg-surface-high text-foreground text-xs font-semibold ring-hairline hover:bg-surface-elevated transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="size-3.5" />
              Гарах
            </button>
          ) : (
            <Link
              to="/auth"
              className="ml-2 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold shadow-glow-primary hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] transition-all"
            >
              <User className="size-3.5" />
              Нэвтрэх
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};
