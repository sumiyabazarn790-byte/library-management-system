import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Sparkles, Search, Library, Brain, Globe2, ArrowRight, Play } from "lucide-react";
import landingHero from "@/assets/landing-hero.jpg";
import bookCodex from "@/assets/book-codex.jpg";
import bookNeural from "@/assets/book-neural.jpg";
import bookCandle from "@/assets/book-candle.jpg";

const features = [
  {
    icon: Search,
    title: "Ухаалаг хайлт",
    desc: "Гарчиг, зохиолч, эсвэл санаагаар нь хайна. Буруу бичсэн ч олдоно.",
  },
  {
    icon: Brain,
    title: "Утгаар хайх (Semantic)",
    desc: "“Ганцаардлын тухай гүн ухаан” гэх мэт байгалийн хэлээр асуу.",
  },
  {
    icon: Globe2,
    title: "Монгол / Англи",
    desc: "Хоёр хэлээр бичсэн ч AI таны санааг ойлгоно.",
  },
  {
    icon: Sparkles,
    title: "AI санал болголт",
    desc: "Таны уншсан genre дээр үндэслэсэн хувийн зөвлөмж.",
  },
  {
    icon: Library,
    title: "Зээлэх / захиалах",
    desc: "Ганц товчоор номоо зээлж, өөрийн loans-оо хянана.",
  },
  {
    icon: BookOpen,
    title: "Cinematic архив",
    desc: "Ховор гар бичмэлүүд кино шиг туршлагаар.",
  },
];

const Landing = () => {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 glass-strong">
        <nav className="max-w-[1440px] mx-auto flex items-center justify-between px-6 lg:px-12 h-16">
          <Link to="/" className="font-display font-bold tracking-tight text-lg text-gradient-accent">
            AETHERIA
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="hidden sm:inline-flex items-center h-9 px-4 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Нэвтрэх
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold shadow-glow-primary hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] transition-all"
            >
              Эхлэх
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="absolute inset-0 -z-10">
          <img
            src={landingHero.src}
            alt="Cosmic library backdrop"
            className="h-full w-full object-cover opacity-50"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 size-[40rem] rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 size-[30rem] rounded-full bg-secondary-deep/30 blur-3xl pointer-events-none" />

        <div className="relative max-w-[1440px] mx-auto px-6 lg:px-12 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-deep/40 text-secondary border border-secondary/20 text-label mb-8">
            <span className="size-1.5 rounded-full bg-secondary animate-pulse-glow" />
            AI-аар тэжээгдсэн дижитал архив
          </span>

          <h1 className="text-hero text-foreground mb-6 max-w-4xl mx-auto">
            Цаг хугацааны<br />
            <span className="text-gradient-accent">архивыг нээ</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Аетериа нь сонгомол номын сан — semantic хайлт, AI зөвлөмж, fuzzy
            typo-tolerant хайлт, монгол/англи хоёр хэлийг бүрэн ойлгодог.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 h-12 px-7 rounded-md bg-primary text-primary-foreground font-semibold text-sm shadow-glow-primary hover:shadow-[0_0_60px_hsl(var(--primary)/0.55)] transition-all hover:-translate-y-0.5"
            >
              <Play className="size-4 fill-current" />
              Үнэгүй эхлэх
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 h-12 px-7 rounded-md border border-primary/60 text-primary font-semibold text-sm hover:bg-primary/10 hover:border-primary transition-all"
            >
              <BookOpen className="size-4" strokeWidth={1.8} />
              Боломжуудыг үзэх
            </a>
          </div>

          {/* Floating books preview */}
          <div className="relative mx-auto max-w-3xl">
            <div className="absolute -inset-12 bg-gradient-accent opacity-20 blur-3xl rounded-full" />
            <div className="relative grid grid-cols-3 gap-6">
              {[bookCodex, bookNeural, bookCandle].map((image, i) => (
                <div
                  key={i}
                  className={`relative aspect-[2/3] rounded-lg overflow-hidden ring-hairline-strong shadow-cinematic ${
                    i === 1 ? "translate-y-[-20px] animate-float" : i === 0 ? "rotate-[-4deg]" : "rotate-[4deg]"
                  }`}
                >
                  <img src={image.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 md:py-32">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <span className="text-label text-primary">ЯАГААД АЕТЕРИА?</span>
            <h2 className="text-headline-lg mt-3 max-w-2xl mx-auto">
              Сонгодог архивын <span className="text-gradient-accent">шинэ үе</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative glass rounded-xl p-7 ring-hairline hover:ring-hairline-strong transition-all hover:-translate-y-1"
              >
                <div className="size-11 rounded-md bg-gradient-accent flex items-center justify-center shadow-glow-primary mb-5">
                  <f.icon className="size-5 text-primary-foreground" strokeWidth={1.8} />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <div className="relative overflow-hidden rounded-2xl ring-hairline-strong glass-strong p-12 md:p-16 text-center">
            <div className="absolute -top-32 -right-20 size-[28rem] rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-10 size-80 rounded-full bg-secondary-deep/30 blur-3xl pointer-events-none" />

            <h2 className="relative text-headline-lg mb-5">
              Архив <span className="text-gradient-accent">таныг хүлээж байна</span>
            </h2>
            <p className="relative text-base text-muted-foreground max-w-xl mx-auto mb-8">
              Бүртгүүлээд хэдхэн секундийн дараа AI-тай ярилцаж, эхний номоо зээлж аваарай.
            </p>
            <Link
              to="/auth"
              className="relative inline-flex items-center gap-2 h-12 px-8 rounded-md bg-primary text-primary-foreground font-semibold text-sm shadow-glow-primary hover:shadow-[0_0_60px_hsl(var(--primary)/0.55)] transition-all hover:-translate-y-0.5"
            >
              Бүртгэл үүсгэх
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-wrap items-center justify-between gap-4">
          <p className="font-display font-bold text-sm text-gradient-accent">AETHERIA</p>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Цаг хугацааны архив.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
