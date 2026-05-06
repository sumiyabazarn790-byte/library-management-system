import { Play, BookOpen } from "lucide-react";
import heroBg from "@/assets/hero-cosmos.jpg";
import bookCodex from "@/assets/book-codex.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { scrollToSection } from "@/lib/navigation";

export const Hero = () => {
  const { user } = useAuth();
  const heroBgSrc = heroBg.src;
  const bookCodexSrc = bookCodex.src;

  const handleStartReading = () => {
    if (!user) {
      scrollToSection("free-reading");
      return;
    }

    scrollToSection("library");
  };

  return (
    <section id="home" className="relative w-full overflow-hidden scroll-mt-24">
      <div className="absolute inset-0 z-0">
        <img
          src={heroBgSrc}
          alt="Cosmic archive backdrop"
          className="h-full w-full object-cover"
          width={1920}
          height={1200}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
      </div>

      <div className="pointer-events-none absolute -right-32 -top-40 size-[24rem] animate-pulse rounded-full bg-primary/15 blur-3xl sm:size-[32rem]" />
      <div
        className="pointer-events-none absolute -bottom-20 left-1/4 size-72 animate-pulse rounded-full bg-secondary-deep/20 blur-3xl sm:size-96"
        style={{ animationDelay: "1s" }}
      />
      <div
        className="pointer-events-none absolute right-1/3 top-1/3 size-64 animate-pulse rounded-full bg-accent/10 blur-3xl sm:size-80"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center px-4 py-20 sm:min-h-[680px] sm:px-6 sm:py-24 md:py-32 lg:px-12">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
            <div className="max-w-2xl space-y-7 sm:space-y-8">
              <div className="inline-flex flex-wrap items-center gap-3 animate-fade-in">
                <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary-deep/50 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                  <span className="size-2 animate-pulse-glow rounded-full bg-secondary" />
                  <span className="text-secondary">Curated Archive</span>
                </div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Explore Wisdom</span>
              </div>

              <div className="space-y-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl md:text-6xl lg:text-7xl">
                  <span className="block text-foreground">Unlock the</span>
                  <span className="block bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                    Archives of Time
                  </span>
                </h1>
              </div>

              <p
                className="max-w-xl animate-fade-up text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl"
                style={{ animationDelay: "0.2s" }}
              >
                Journey through centuries of forgotten wisdom. Discover exclusive curations of medieval manuscripts,
                quantum theories, and intellectual treasures that shape our world.
              </p>

              <div
                className="flex flex-col gap-3 animate-fade-up pt-2 sm:flex-row sm:gap-4 sm:pt-4"
                style={{ animationDelay: "0.3s" }}
              >
                <button
                  onClick={handleStartReading}
                  className="group inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-primary to-accent px-6 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/60 sm:h-auto sm:w-auto sm:px-8 sm:py-4 md:text-lg"
                >
                  <Play className="size-5 fill-current transition-transform group-hover:scale-110" />
                  <span>{user ? "Your Library" : "Start Reading"}</span>
                </button>
                <button
                  onClick={() => scrollToSection("browse")}
                  className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg border-2 border-primary/60 px-6 text-base font-semibold text-primary transition-all duration-300 hover:-translate-y-1 hover:bg-primary/10 sm:h-auto sm:w-auto sm:px-8 sm:py-4 md:text-lg"
                >
                  <BookOpen className="size-5" strokeWidth={1.8} />
                  <span>Browse Catalog</span>
                </button>
              </div>

              <div
                className="grid grid-cols-1 gap-4 border-t border-border/40 pt-8 animate-fade-up sm:grid-cols-3 sm:gap-6"
                style={{ animationDelay: "0.4s" }}
              >
                <div className="space-y-2 rounded-2xl border border-white/8 bg-black/15 p-4 backdrop-blur-sm sm:border-none sm:bg-transparent sm:p-0">
                  <div className="text-3xl font-bold text-primary">200+</div>
                  <p className="text-sm text-muted-foreground">Books & Manuscripts</p>
                </div>
                <div className="space-y-2 rounded-2xl border border-white/8 bg-black/15 p-4 backdrop-blur-sm sm:border-none sm:bg-transparent sm:p-0">
                  <div className="text-3xl font-bold text-accent">150+</div>
                  <p className="text-sm text-muted-foreground">Active Members</p>
                </div>
                <div className="space-y-2 rounded-2xl border border-white/8 bg-black/15 p-4 backdrop-blur-sm sm:border-none sm:bg-transparent sm:p-0">
                  <div className="text-3xl font-bold text-secondary">50+</div>
                  <p className="text-sm text-muted-foreground">Curated Collections</p>
                </div>
              </div>
            </div>

            <div className="hidden items-center justify-center md:flex md:h-[480px] lg:h-[600px]">
              <div className="relative w-full max-w-[15rem] animate-float lg:max-w-xs">
                <div className="absolute -inset-16 rounded-3xl bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/10 blur-3xl" />

                <div className="group relative">
                  <div className="aspect-[2/3] rotate-3 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 transition-transform duration-500 group-hover:rotate-0">
                    <img
                      src={bookCodexSrc}
                      alt="The Alchemist's Codex"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 rounded-b-2xl bg-gradient-to-t from-black/80 to-transparent p-5 lg:p-6">
                    <p className="font-display text-xl font-bold leading-tight text-white">The Alchemist's Codex</p>
                    <p className="mt-2 text-sm text-primary">Restored 2024</p>
                    <p className="mt-1 text-xs text-gray-400">Medieval wisdom meets modern discovery</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </section>
  );
};
