import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookCopy,
  Clock3,
  Loader2,
  Mail,
  Save,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchLoanStatusesByBookIds, fetchLoans, fetchSavedBooks, formatLibraryDate } from "@/lib/library";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroCosmos from "@/assets/hero-cosmos.jpg";
import curioStoic from "@/assets/curio-stoic.jpg";
import curioModern from "@/assets/curio-modern.jpg";
import bookCodex from "@/assets/book-codex.jpg";
import trendPhilosophy from "@/assets/trend-philosophy.jpg";
import trendHuman from "@/assets/trend-human.jpg";
import { applyImageFallback, resolveAssetSrc, type StaticAsset } from "@/lib/utils";
import type { LoanStatus, SavedBookWithBook } from "@/types/library";
import { BookCard } from "./BookCard";

type UserProfilePanelProps = {
  onProfileChange?: () => void;
  refreshKey?: number;
};

type CollectionCard = {
  title: string;
  eyebrow: string;
  image: StaticAsset;
  fallbacks: StaticAsset[];
  accentClass: string;
  layoutClass: string;
};

const normalizeGenres = (value: string) =>
  Array.from(
    new Set(
      value
        .split(",")
        .map((genre) => genre.trim())
        .filter(Boolean),
    ),
  );

const fallbackGenres = ["Quantum Physics", "Stoic Philosophy", "Rare Archives"];

const resolveCollectionCard = (genre: string, index: number): CollectionCard => {
  const normalized = genre.toLowerCase();

  if (normalized.includes("quantum") || normalized.includes("physics")) {
    return {
      title: genre,
      eyebrow: "12 EXCLUSIVE VOLUMES",
      image: heroCosmos,
      fallbacks: [trendHuman, curioModern, curioStoic],
      accentClass: "text-sky-300",
      layoutClass: index === 0 ? "lg:col-span-2 lg:min-h-[360px]" : "min-h-[240px]",
    };
  }

  if (normalized.includes("philosophy") || normalized.includes("stoic")) {
    return {
      title: genre,
      eyebrow: "SAGE COLLECTION",
      image: curioStoic,
      fallbacks: [trendPhilosophy, bookCodex, heroCosmos],
      accentClass: "text-fuchsia-300",
      layoutClass: "min-h-[240px]",
    };
  }

  if (normalized.includes("history") || normalized.includes("archive")) {
    return {
      title: genre,
      eyebrow: "ARCHIVE EDITION",
      image: bookCodex,
      fallbacks: [curioStoic, trendPhilosophy, heroCosmos],
      accentClass: "text-amber-200",
      layoutClass: index === 0 ? "lg:col-span-2 lg:min-h-[360px]" : "min-h-[240px]",
    };
  }

  if (normalized.includes("ai") || normalized.includes("machine")) {
    return {
      title: genre,
      eyebrow: "NEURAL SHELF",
      image: trendHuman,
      fallbacks: [heroCosmos, curioModern, trendPhilosophy],
      accentClass: "text-cyan-300",
      layoutClass: "min-h-[240px]",
    };
  }

  return {
    title: genre,
    eyebrow: index % 2 === 0 ? "CURATED ATLAS" : "PRIVATE STACK",
    image: index % 2 === 0 ? curioModern : trendPhilosophy,
    fallbacks: index % 2 === 0 ? [trendHuman, heroCosmos, bookCodex] : [curioStoic, heroCosmos, bookCodex],
    accentClass: index % 2 === 0 ? "text-emerald-200" : "text-rose-200",
    layoutClass: index === 0 ? "lg:col-span-2 lg:min-h-[360px]" : "min-h-[240px]",
  };
};

export const UserProfilePanel = ({ onProfileChange, refreshKey }: UserProfilePanelProps) => {
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [preferredGenres, setPreferredGenres] = useState("");
  const [saving, setSaving] = useState(false);
  const [loanStats, setLoanStats] = useState({ active: 0, requested: 0, total: 0 });
  const [savedBooks, setSavedBooks] = useState<SavedBookWithBook[]>([]);
  const [savedLoanStatusByBookId, setSavedLoanStatusByBookId] = useState<Record<string, LoanStatus>>({});
  const [savedLoading, setSavedLoading] = useState(true);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setPreferredGenres((profile?.preferred_genres ?? []).join(", "));
  }, [profile]);

  useEffect(() => {
    if (!user) {
      setLoanStats({ active: 0, requested: 0, total: 0 });
      return;
    }

    let canceled = false;

    const run = async () => {
      try {
        const loans = await fetchLoans(user.id);

        if (!canceled) {
          setLoanStats({
            active: loans.filter((loan) => loan.status === "active").length,
            requested: loans.filter((loan) => loan.status === "requested").length,
            total: loans.length,
          });
        }
      } catch (error) {
        if (!canceled) {
          console.warn("profile loan summary load failed", error);
          setLoanStats({ active: 0, requested: 0, total: 0 });
        }
      }
    };

    void run();

    return () => {
      canceled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSavedBooks([]);
      setSavedLoanStatusByBookId({});
      setSavedLoading(false);
      return;
    }

    let canceled = false;

    const run = async () => {
      setSavedLoading(true);

      try {
        const saved = await fetchSavedBooks(user.id, 6);
        const nextLoanStatusByBookId = saved.length
          ? await fetchLoanStatusesByBookIds(
              user.id,
              saved.map((entry) => entry.book_id),
            )
          : {};

        if (!canceled) {
          setSavedBooks(saved);
          setSavedLoanStatusByBookId(nextLoanStatusByBookId);
        }
      } catch (error) {
        if (!canceled) {
          console.error("saved shelf load failed:", error instanceof Error ? error.message : JSON.stringify(error));
          setSavedBooks([]);
          setSavedLoanStatusByBookId({});
        }
      } finally {
        if (!canceled) {
          setSavedLoading(false);
        }
      }
    };

    void run();

    return () => {
      canceled = true;
    };
  }, [refreshKey, user]);

  const initials = useMemo(() => {
    const source = profile?.display_name?.trim() || user?.email?.trim() || "Aetheria";
    const tokens = source.split(/\s+/).filter(Boolean);
    return tokens
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [profile?.display_name, user?.email]);

  const profileName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "Aetheria Reader";
  const joinedLabel = profile ? formatLibraryDate(profile.created_at) : "Unknown";
  const genreList = (profile?.preferred_genres ?? []).filter((genre): genre is string => Boolean(genre));

  const collectionCards = useMemo(() => {
    const source = genreList.length ? genreList.slice(0, 3) : fallbackGenres;
    return source.map((genre, index) => resolveCollectionCard(genre, index));
  }, [genreList]);

  const joinedYear = profile?.created_at ? new Date(profile.created_at).getFullYear() : null;
  const profileTagline = genreList.length
    ? `${genreList.slice(0, 3).join(" • ")}`
    : "Rare Archives • Philosophy • Future Thought";

  if (!user) {
    return null;
  }

  const handleSaveProfile = async () => {
    setSaving(true);

    try {
      const nextDisplayName = displayName.trim() || null;
      const nextGenres = normalizeGenres(preferredGenres);

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: nextDisplayName,
          preferred_genres: nextGenres,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      await refreshProfile();
      onProfileChange?.();
      toast.success("Profile мэдээлэл хадгалагдлаа.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Profile save failed";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="profile" className="scroll-mt-24">
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-primary/80">Private Reading Atlas</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Миний Profile
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.26em] text-white/80">
            {isAdmin ? <Shield className="size-3.5 text-primary" /> : <Sparkles className="size-3.5 text-primary" />}
            <span>{isAdmin ? "Admin Account" : "Member Account"}</span>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_minmax(320px,0.8fr)]">
          <article className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#07101b] shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
            <img
              src={heroCosmos.src}
              alt="Profile cosmic atlas background"
              className="absolute inset-0 h-full w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(3,7,18,0.88),rgba(3,7,18,0.34)_44%,rgba(12,28,54,0.78))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(96,165,250,0.22),transparent_42%),radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.16),transparent_24%)]" />

            <div className="relative flex min-h-[360px] flex-col justify-between p-5 sm:p-7 md:min-h-[420px] md:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/80 backdrop-blur">
                  Reading Persona
                </div>
                <div className="rounded-full border border-white/15 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.26em] text-white/70 backdrop-blur">
                  {joinedYear ? `Member Since ${joinedYear}` : "Archive Member"}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar className="size-20 border border-white/20 bg-white/10 text-white shadow-[0_0_45px_rgba(96,165,250,0.22)]">
                    <AvatarFallback className="bg-gradient-accent text-xl font-semibold text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm uppercase tracking-[0.26em] text-sky-200/80">Profile Signature</p>
                    <h3 className="mt-2 font-display text-3xl font-semibold leading-none text-white md:text-5xl">
                      {profileName}
                    </h3>
                    <p className="mt-3 flex items-center gap-2 text-sm text-white/75">
                      <Mail className="size-4 text-sky-300" />
                      <span className="truncate">{user.email}</span>
                    </p>
                  </div>
                </div>

                <div className="max-w-2xl space-y-3">
                  <p className="text-sm uppercase tracking-[0.26em] text-sky-200/80">Reading DNA</p>
                  <p className="text-base leading-7 text-white/88 md:text-xl md:leading-8">
                    {profileTagline}
                  </p>
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-6">
            <article className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(10,14,24,0.98))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/80">Reading Pulse</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <BookCopy className="size-4 text-sky-300" />
                    Active loans
                  </div>
                  <p className="mt-4 font-display text-4xl font-semibold text-white">{loanStats.active}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Clock3 className="size-4 text-fuchsia-300" />
                    Requested
                  </div>
                  <p className="mt-4 font-display text-4xl font-semibold text-white">{loanStats.requested}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Sparkles className="size-4 text-amber-200" />
                    Genres
                  </div>
                  <p className="mt-4 font-display text-4xl font-semibold text-white">{genreList.length}</p>
                </div>
              </div>
            </article>

            <article className="overflow-hidden rounded-[28px] border border-primary/20 bg-primary/[0.08] p-6 shadow-[0_24px_60px_rgba(14,165,233,0.12)]">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/80">Archive Notes</p>
              <p className="mt-4 text-2xl font-semibold leading-tight text-foreground">
                {isAdmin ? "You curate the archive as well as read it." : "Your profile now feels like a private shelf."}
              </p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Joined on <span className="font-medium text-foreground">{joinedLabel}</span>. Save your preferred
                genres below and recommendation хэсэг танд илүү таарсан ном санал болгоно.
              </p>
            </article>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_minmax(320px,0.92fr)]">
          <div className="space-y-6">
            <div className="grid auto-rows-fr gap-6 md:grid-cols-2 xl:grid-cols-3">
              {collectionCards.map((card) => (
                <article
                  key={card.title}
                  className={`group relative overflow-hidden rounded-[30px] border border-white/10 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.32)] ${card.layoutClass}`}
                >
                  <img
                    src={resolveAssetSrc(card.image)}
                    alt={card.title}
                    onError={(event) => applyImageFallback(event, card.fallbacks.map(resolveAssetSrc))}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(3,7,18,0.78)_68%,rgba(3,7,18,0.96))]" />

                  <div className="relative flex h-full min-h-[240px] flex-col justify-end p-6 md:p-8">
                    <p className={`text-sm font-semibold uppercase tracking-[0.28em] ${card.accentClass}`}>
                      {card.eyebrow}
                    </p>
                    <h3 className="mt-3 font-display text-3xl font-semibold leading-tight text-white md:text-4xl">
                      {card.title}
                    </h3>
                  </div>
                </article>
              ))}
            </div>

            <article className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,14,24,0.98),rgba(15,20,31,0.95))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.3)] sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Saved Shelf</p>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-white">Books You Want To Keep Close</h3>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/60">
                  {savedBooks.length} saved
                </div>
              </div>

              {savedLoading ? (
                <div className="mt-6 flex items-center gap-3 text-sm text-white/60">
                  <Loader2 className="size-4 animate-spin" />
                  Loading saved shelf...
                </div>
              ) : savedBooks.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-5 text-sm leading-7 text-white/58">
                  Book card deer `Save` darsnaar end tani hadgalsan nomnuud shuud garj irne.
                </p>
              ) : (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 2xl:grid-cols-3">
                  {savedBooks.map((entry, index) => (
                    <BookCard
                      key={entry.id}
                      book={entry.book}
                      index={index}
                      loanStatus={savedLoanStatusByBookId[entry.book_id] ?? null}
                      isSaved
                      onChanged={onProfileChange}
                    />
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,12,21,0.98),rgba(16,20,31,0.94))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.3)] sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Taste Atlas</p>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-white">Preferred Genre Constellation</h3>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/60">
                  <ArrowUpRight className="size-3.5 text-primary" />
                  Personal shelf
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {(genreList.length ? genreList : fallbackGenres).map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/80 backdrop-blur"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </article>
          </div>

          <article className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,39,0.98),rgba(10,14,22,0.98))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Profile Settings</p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-white sm:text-3xl">Edit your reader identity</h3>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/60">
                {isAdmin ? "Admin Mode" : "Reader Mode"}
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-white/55">Display name</label>
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Таны харагдах нэр"
                  className="h-12 border-white/10 bg-white/[0.04] text-white placeholder:text-white/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-white/55">Email</label>
                <Input
                  value={user.email ?? ""}
                  disabled
                  className="h-12 border-white/10 bg-white/[0.04] text-white/65"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-white/55">Preferred genres</label>
                <Input
                  value={preferredGenres}
                  onChange={(event) => setPreferredGenres(event.target.value)}
                  placeholder="History, Philosophy, Science Fiction"
                  className="h-12 border-white/10 bg-white/[0.04] text-white placeholder:text-white/30"
                />
                <p className="text-xs leading-6 text-white/45">Genre-үүдээ comma-аар салгаж бичнэ үү.</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => void handleSaveProfile()} disabled={saving} className="h-11 px-5">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Хадгалах
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDisplayName(profile?.display_name ?? "");
                  setPreferredGenres((profile?.preferred_genres ?? []).join(", "));
                }}
                className="h-11 border-white/15 bg-transparent px-5 text-white hover:bg-white/[0.06]"
              >
                Буцаах
              </Button>
            </div>

            <div className="mt-8 rounded-[26px] border border-primary/20 bg-primary/[0.08] p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <User className="size-4 text-primary" />
                Personalization note
              </p>
              <p className="mt-3 text-sm leading-7 text-white/62">
                Дуртай genre-үүдийг хадгалснаар recommendation хэсэг танд илүү тохирсон ном санал болгож, AI assistant ч
                таны уншлагын өнгө аясыг илүү сайн барьж эхэлнэ.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};
