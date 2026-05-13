import { useEffect, useMemo, useState } from "react";
import { Bell, LogOut, Menu, Search, Shield, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchLoans } from "@/lib/library";
import { SECTION_CHANGE_EVENT, focusCatalogSearch, navSections, scrollToSection } from "@/lib/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { LoanWithBook } from "@/types/library";

export const TopNav = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState(() => {
    const defaultSection = user ? "browse" : "home";
    if (typeof window === "undefined") return defaultSection;
    return window.location.hash.replace("#", "") || defaultSection;
  });
  const [catalogCount, setCatalogCount] = useState(0);
  const [activeLoans, setActiveLoans] = useState<LoanWithBook[]>([]);

  const availableSections = useMemo(() => {
    const sections: Array<{ label: string; id: string }> = user
      ? navSections.filter((section) => section.id !== "home").map((section) => ({ ...section }))
      : [...navSections];

    if (user) {
      sections.splice(3, 0, { label: "Profile", id: "profile" });
    }

    if (isAdmin) {
      sections.push({ label: "Admin", id: "admin" });
    }

    return sections;
  }, [isAdmin, user]);

  const metadataDisplayName =
    typeof user?.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "";
  const profileLabel = profile?.display_name?.trim() || metadataDisplayName || user?.email?.split("@")[0] || "Profile";
  const metadataAvatarUrl =
    typeof user?.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url.trim()
      : typeof user?.user_metadata?.picture === "string"
        ? user.user_metadata.picture.trim()
        : "";
  const profileAvatarUrl = profile ? (profile.avatar_url?.trim() ?? "") : metadataAvatarUrl;
  const profileInitials = profileLabel
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      try {
        const { count } = await supabase.from("books").select("*", { count: "exact", head: true });
        if (!canceled) {
          setCatalogCount(count ?? 0);
        }
      } catch (error) {
        console.error("catalog count load failed", error);
      }

      if (!user) {
        if (!canceled) {
          setActiveLoans([]);
        }
        return;
      }

      try {
        const loans = await fetchLoans(user.id, { statuses: ["active"], limit: 3 });
        if (!canceled) {
          setActiveLoans(loans);
        }
      } catch (error) {
        console.error("notification loan load failed", error);
      }
    };

    void run();
    return () => {
      canceled = true;
    };
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!window.location.hash) {
      setActiveId(user ? "browse" : "home");
    }
  }, [user]);

  useEffect(() => {
    const handleSectionChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      setActiveId(customEvent.detail?.id ?? (user ? "browse" : "home"));
    };

    window.addEventListener(SECTION_CHANGE_EVENT, handleSectionChange);

    return () => {
      window.removeEventListener(SECTION_CHANGE_EVENT, handleSectionChange);
    };
  }, [user]);

  const handleSectionClick = (sectionId: string) => {
    if (location.pathname !== "/app") {
      navigate(sectionId === "home" ? "/" : `/app#${sectionId}`);
      return;
    }

    setActiveId(sectionId);
    scrollToSection(sectionId);
  };

  const handleSearch = () => {
    if (location.pathname !== "/app") {
      navigate("/app#browse");
      return;
    }

    setActiveId("browse");
    focusCatalogSearch();
  };

  const handleSignOut = async () => {
    await signOut();
    setActiveId("home");
    navigate("/", { replace: true });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-full items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-12">
        <Link to={user ? "/app#browse" : "/"} className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[radial-gradient(circle_at_22%_18%,hsl(var(--primary)/0.22),transparent_55%),radial-gradient(circle_at_78%_82%,hsl(var(--accent)/0.16),transparent_58%)] ring-1 ring-white/8 transition-all duration-300 group-hover:ring-primary/30 group-hover:shadow-[0_0_36px_hsl(var(--primary)/0.16)] sm:h-12 sm:w-12">
            <img src="/aetheria-mark.svg" alt="Aetheria logo" className="h-8 w-8 select-none sm:h-10 sm:w-10" draggable="false" />
          </div>
          <div className="hidden sm:block">
            <span className="font-display text-lg font-bold tracking-tight text-gradient-accent">AETHERIA</span>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.24em] text-muted-foreground/80">Archive of Time</p>
          </div>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {availableSections.map((link) => (
            <li key={link.id}>
              <button
                onClick={() => handleSectionClick(link.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeId === link.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-surface-high/50 hover:text-foreground"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {link.id === "admin" ? <Shield className="size-4" /> : null}
                  {link.label}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-surface-high/70 hover:text-foreground lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" strokeWidth={1.7} />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[min(22rem,calc(100vw-1rem))] border-border/60 bg-surface-elevated/95 p-0 text-foreground backdrop-blur-xl"
            >
              <SheetHeader className="border-b border-border/50 px-5 py-5 text-left">
                <SheetTitle className="font-display text-xl text-gradient-accent">AETHERIA</SheetTitle>
                <SheetDescription>
                  Browse the archive, jump between sections, and keep reading comfortably on smaller screens.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-5 py-6">
                <div className="space-y-2">
                  {availableSections.map((link) => (
                    <SheetClose asChild key={link.id}>
                      <button
                        onClick={() => handleSectionClick(link.id)}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                          activeId === link.id
                            ? "bg-primary/10 text-primary"
                            : "bg-surface-high/40 text-foreground hover:bg-surface-high/70"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          {link.id === "admin" ? <Shield className="size-4" /> : null}
                          {link.label}
                        </span>
                        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {activeId === link.id ? "Open" : "Go"}
                        </span>
                      </button>
                    </SheetClose>
                  ))}
                </div>

                <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Quick actions</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <SheetClose asChild>
                      <button
                        onClick={handleSearch}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-surface-high/70 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high"
                      >
                        <Search className="size-4" />
                        Search catalog
                      </button>
                    </SheetClose>

                    {user ? (
                      <SheetClose asChild>
                        <button
                          onClick={() => handleSectionClick("profile")}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-surface-high/70 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high"
                        >
                          <User className="size-4" />
                          {profileLabel}
                        </button>
                      </SheetClose>
                    ) : (
                      <SheetClose asChild>
                        <Link
                          to="/auth"
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30"
                        >
                          <User className="size-4" />
                          Sign in
                        </Link>
                      </SheetClose>
                    )}
                  </div>
                </div>

                {user ? (
                  <SheetClose asChild>
                    <button
                      onClick={() => void handleSignOut()}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border/60 bg-background/30 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high/60"
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </button>
                  </SheetClose>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>

          <button
            onClick={handleSearch}
            className="hidden rounded-lg p-2.5 text-muted-foreground transition-colors duration-200 hover:bg-surface-high/70 hover:text-foreground sm:inline-flex"
            aria-label="Search"
          >
            <Search className="size-5" strokeWidth={1.5} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative rounded-lg p-2.5 text-muted-foreground transition-colors duration-200 hover:bg-surface-high/70 hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="size-5" strokeWidth={1.5} />
                {activeLoans.length > 0 && (
                  <span className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-primary" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-border/60 bg-surface-elevated p-4 text-foreground sm:w-80"
            >
              <div className="space-y-3">
                <div className="border-b border-border/50 pb-3">
                  <p className="font-display text-base font-semibold">Notifications</p>
                  <p className="mt-1 text-xs text-muted-foreground">Aetheria updates</p>
                </div>

                <button
                  onClick={() => handleSectionClick("browse")}
                  className="w-full rounded-lg bg-surface-high/50 px-3 py-3 text-left transition-colors hover:bg-surface-high"
                >
                  <p className="text-sm font-semibold text-foreground">{catalogCount} new books</p>
                  <p className="mt-1 text-xs text-muted-foreground">Browse our latest additions</p>
                </button>

                {user ? (
                  activeLoans.length ? (
                    activeLoans.map((loan) => (
                      <button
                        key={loan.id}
                        onClick={() => handleSectionClick("library")}
                        className="w-full rounded-lg border border-accent/20 bg-accent/10 px-3 py-3 text-left transition-colors hover:bg-accent/20"
                      >
                        <p className="truncate text-sm font-semibold text-foreground">{loan.book.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due: {new Date(loan.due_date).toLocaleDateString()}
                        </p>
                      </button>
                    ))
                  ) : (
                    <button
                      onClick={() => handleSectionClick("library")}
                      className="w-full rounded-lg bg-surface-high/50 px-3 py-3 text-left transition-colors hover:bg-surface-high"
                    >
                      <p className="text-sm font-semibold text-foreground">No active loans</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Browse and borrow books from our collection
                      </p>
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleSectionClick("ai-insights")}
                    className="w-full rounded-lg bg-surface-high/50 px-3 py-3 text-left transition-colors hover:bg-surface-high"
                  >
                    <p className="text-sm font-semibold text-foreground">Sign in for recommendations</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Get AI-powered book suggestions personalized for you
                    </p>
                  </button>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <>
              <button
                onClick={() => handleSectionClick("profile")}
                className="hidden h-10 max-w-48 items-center gap-2 rounded-lg bg-surface-high/70 px-2.5 pr-3.5 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-surface-high md:flex"
                aria-label="Open profile"
              >
                <Avatar className="size-7 border border-primary/25 bg-background">
                  {profileAvatarUrl ? (
                    <AvatarImage src={profileAvatarUrl} alt={`${profileLabel} profile photo`} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-gradient-accent text-[10px] font-semibold text-primary-foreground">
                    {profileInitials || <User className="size-3.5" />}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{profileLabel}</span>
              </button>
              <button
                onClick={() => void handleSignOut()}
                className="hidden h-10 items-center gap-2 rounded-lg bg-surface-high/70 px-3.5 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-surface-high sm:inline-flex"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="hidden h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 hover:shadow-primary/50 sm:inline-flex"
            >
              <User className="size-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};
