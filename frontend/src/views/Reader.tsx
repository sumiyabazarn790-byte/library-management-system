import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Languages,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TopNav } from "@/components/aetheria/TopNav";
import { ReaderVoiceControls } from "@/components/aetheria/ReaderVoiceControls";
import { getBookCover } from "@/lib/bookCovers";
import {
  buildReadingSections,
  canReadBookNow,
  fetchBookById,
  getPublicDomainReaderUrl,
  getPublicDomainTextApiPath,
  hasPublicDomainTextSource,
} from "@/lib/library";
import { cn } from "@/lib/utils";
import type { Book } from "@/types/library";

type ReaderViewport = {
  width: number;
  height: number;
};

const getViewport = (): ReaderViewport => {
  if (typeof window === "undefined") {
    return { width: 1366, height: 900 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getReaderLayout = (width: number, height: number) => {
  const spread = width >= 1280 ? 2 : 1;
  const lineCount = width >= 1280 ? 30 : width >= 1024 ? 32 : width >= 768 ? 26 : 18;
  const charsPerLine = width >= 1280 ? 40 : width >= 1024 ? 50 : width >= 768 ? 42 : 29;
  const heightScale = clamp(height / 900, 0.72, 1.18);

  return {
    spread,
    maxCharsPerPage: Math.max(420, Math.round(lineCount * charsPerLine * heightScale)),
    maxParagraphsPerPage: spread === 2 ? 5 : width >= 768 ? 6 : 5,
  };
};

const splitByWords = (value: string, maxChars: number) => {
  const words = value.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
      continue;
    }

    chunks.push(current);
    current = word;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
};

const splitParagraphIntoBlocks = (paragraph: string, maxChars: number) => {
  const normalized = paragraph.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const sentences = normalized.split(/(?<=[.!?])\s+/u).filter(Boolean);
  if (sentences.length <= 1) {
    return splitByWords(normalized, maxChars);
  }

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;

    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    if (sentence.length > maxChars) {
      chunks.push(...splitByWords(sentence, maxChars));
      current = "";
      continue;
    }

    current = sentence;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
};

const paginateReaderSections = (
  sections: string[],
  maxCharsPerPage: number,
  maxParagraphsPerPage: number,
) => {
  const blockLimit = Math.max(280, Math.floor(maxCharsPerPage * 0.72));
  const blocks = sections.flatMap((section) => splitParagraphIntoBlocks(section, blockLimit));
  if (!blocks.length) return [];

  const pages: string[][] = [];
  let currentPage: string[] = [];
  let currentPageChars = 0;

  for (const block of blocks) {
    const spacingPenalty = currentPage.length ? 48 : 0;
    const nextTotal = currentPageChars + spacingPenalty + block.length;
    const shouldStartNewPage =
      currentPage.length > 0 &&
      (nextTotal > maxCharsPerPage || currentPage.length >= maxParagraphsPerPage);

    if (shouldStartNewPage) {
      pages.push(currentPage);
      currentPage = [block];
      currentPageChars = block.length;
      continue;
    }

    currentPage.push(block);
    currentPageChars = nextTotal;
  }

  if (currentPage.length) {
    pages.push(currentPage);
  }

  return pages;
};

const Reader = () => {
  const navigate = useNavigate();
  const { bookId = "" } = useParams();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [displaySections, setDisplaySections] = useState<string[]>([]);
  const [fullTextLoading, setFullTextLoading] = useState(false);
  const [fullTextLoaded, setFullTextLoaded] = useState(false);
  const [fullTextSourceUrl, setFullTextSourceUrl] = useState("");
  const [fullTextErrorMessage, setFullTextErrorMessage] = useState("");
  const [viewport, setViewport] = useState<ReaderViewport>(getViewport);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => setViewport(getViewport());
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const nextBook = await fetchBookById(bookId);

        if (!canceled) {
          if (!nextBook) {
            setBook(null);
            setErrorMessage("This reader title could not be found.");
          } else {
            setBook(nextBook);
          }
        }
      } catch (error) {
        if (!canceled) {
          setBook(null);
          setErrorMessage(error instanceof Error ? error.message : "Reader failed to load.");
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      canceled = true;
    };
  }, [bookId]);

  useEffect(() => {
    if (!book) {
      setDisplaySections([]);
      setFullTextLoaded(false);
      setFullTextLoading(false);
      setFullTextSourceUrl("");
      setFullTextErrorMessage("");
      return;
    }

    let canceled = false;
    const previewSections = buildReadingSections(book);

    setDisplaySections(previewSections);
    setFullTextLoaded(false);
    setFullTextSourceUrl("");
    setFullTextErrorMessage("");

    if (!hasPublicDomainTextSource(book)) {
      setFullTextLoading(false);
      return;
    }

    const run = async () => {
      setFullTextLoading(true);

      try {
        const response = await fetch(getPublicDomainTextApiPath(book));
        const data = (await response.json()) as {
          error?: string;
          sections?: string[];
          sourceUrl?: string;
          readerUrl?: string;
          fallback?: boolean;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "Full reader text could not be loaded.");
        }

        if (!canceled && Array.isArray(data.sections) && data.sections.length) {
          setDisplaySections(data.sections);
          setFullTextLoaded(!data.fallback);
          setFullTextSourceUrl(data.sourceUrl || data.readerUrl || "");
          setFullTextErrorMessage(data.fallback ? data.message || "Built-in preview text is being used right now." : "");
        }
      } catch (error) {
        if (!canceled) {
          setFullTextErrorMessage(error instanceof Error ? error.message : "Full reader text could not be loaded.");
        }
      } finally {
        if (!canceled) {
          setFullTextLoading(false);
        }
      }
    };

    void run();

    return () => {
      canceled = true;
    };
  }, [book]);

  const publicDomainReaderUrl = book ? getPublicDomainReaderUrl(book) : null;
  const hasBuiltInReader = book ? canReadBookNow(book) : false;
  const readerLayout = useMemo(
    () => getReaderLayout(viewport.width, viewport.height),
    [viewport.height, viewport.width],
  );
  const readerPages = useMemo(
    () =>
      paginateReaderSections(
        displaySections,
        readerLayout.maxCharsPerPage,
        readerLayout.maxParagraphsPerPage,
      ),
    [displaySections, readerLayout.maxCharsPerPage, readerLayout.maxParagraphsPerPage],
  );
  const visiblePageCount = readerLayout.spread;
  const totalPages = readerPages.length;
  const totalSpreads = totalPages ? Math.ceil(totalPages / visiblePageCount) : 0;
  const lastSpreadStart = totalPages
    ? Math.floor((totalPages - 1) / visiblePageCount) * visiblePageCount
    : 0;
  const safePageIndex = totalPages ? Math.min(pageIndex, lastSpreadStart) : 0;
  const visiblePages = readerPages.slice(safePageIndex, safePageIndex + visiblePageCount);
  const currentPageStart = totalPages ? safePageIndex + 1 : 0;
  const currentPageEnd = totalPages ? Math.min(safePageIndex + visiblePageCount, totalPages) : 0;
  const currentSpread = totalPages ? Math.floor(safePageIndex / visiblePageCount) + 1 : 0;
  const progressPercent = totalPages ? Math.round((currentPageEnd / totalPages) * 100) : 0;
  const canGoPrevious = safePageIndex > 0;
  const canGoNext = safePageIndex < lastSpreadStart;

  useEffect(() => {
    setPageIndex(0);
  }, [book?.id, fullTextLoaded]);

  useEffect(() => {
    setPageIndex((current) => {
      if (!readerPages.length) return 0;
      const aligned = Math.floor(current / visiblePageCount) * visiblePageCount;
      return Math.min(aligned, lastSpreadStart);
    });
  }, [lastSpreadStart, readerPages.length, visiblePageCount]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
      ) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "PageDown") {
        if (!canGoNext) return;
        event.preventDefault();
        setPageIndex((current) => Math.min(lastSpreadStart, current + visiblePageCount));
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        if (!canGoPrevious) return;
        event.preventDefault();
        setPageIndex((current) => Math.max(0, current - visiblePageCount));
      }

      if (event.key === "Home") {
        event.preventDefault();
        setPageIndex(0);
      }

      if (event.key === "End") {
        event.preventDefault();
        setPageIndex(lastSpreadStart);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canGoNext, canGoPrevious, lastSpreadStart, visiblePageCount]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/app#browse");
  };

  const handlePreviousPage = () => {
    setPageIndex((current) => Math.max(0, current - visiblePageCount));
  };

  const handleNextPage = () => {
    setPageIndex((current) => Math.min(lastSpreadStart, current + visiblePageCount));
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background))_38%,hsl(var(--surface-elevated)))] text-foreground">
      <TopNav />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:px-12">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        {loading ? (
          <section className="mt-8 rounded-[28px] border border-border/50 bg-surface-elevated/70 p-6 text-center shadow-card sm:p-10">
            <Loader2 className="mx-auto size-6 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Opening the in-site reader...</p>
          </section>
        ) : !book ? (
          <section className="mt-8 rounded-[28px] border border-border/50 bg-surface-elevated/70 p-6 shadow-card sm:p-10">
            <p className="text-lg font-semibold text-foreground">Reader unavailable</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {errorMessage || "This title is not available inside the reader yet."}
            </p>
            <Link
              to="/app#browse"
              className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow-primary"
            >
              Return to catalog
            </Link>
          </section>
        ) : (
          <section className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="rounded-[28px] border border-border/50 bg-surface-elevated/80 p-4 shadow-card lg:sticky lg:top-28 lg:h-fit">
              <div className="overflow-hidden rounded-[22px] ring-hairline">
                <img
                  src={getBookCover(book, 0)}
                  alt={book.title}
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Title</p>
                  <p className="mt-1 font-display text-xl font-semibold leading-tight">{book.title}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Author</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{book.author}</p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Languages className="size-4" />
                  <span>{book.language === "mn" ? "Mongolian reader" : "English reader"}</span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary">
                    <BookOpen className="size-3.5" />
                    {fullTextLoaded
                      ? "Full book on site"
                      : hasBuiltInReader
                        ? "In-site reading enabled"
                        : "Preview on site"}
                  </span>
                  <span className="inline-flex rounded-full bg-surface-high px-3 py-1 text-muted-foreground">
                    {book.genre}
                  </span>
                </div>

                {publicDomainReaderUrl ? (
                  <a
                    href={fullTextSourceUrl || publicDomainReaderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary/25 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                  >
                    <ExternalLink className="size-4" />
                    Original source
                  </a>
                ) : null}
              </div>
            </aside>

            <div className="rounded-[32px] border border-border/50 bg-surface-elevated/80 p-4 shadow-cinematic sm:p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.28em] text-primary/80">Aetheria Reader</p>
                  <h1 className="mt-3 font-display text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">{book.title}</h1>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {hasBuiltInReader
                      ? "This edition now reads page by page inside Aetheria, so the experience feels closer to a real book than a long scrolling article."
                      : "Aetheria is showing the available preview text and metadata here while a full source text is not linked yet."}
                  </p>
                </div>

                <div className="w-full rounded-2xl border border-secondary/20 bg-secondary-deep/15 px-4 py-3 text-sm text-secondary lg:w-auto">
                  <p className="flex items-center gap-2 font-semibold text-foreground">
                    <Sparkles className="size-4 text-secondary" />
                    Reader note
                  </p>
                  <p className="mt-1 leading-6">
                    Turn pages with the arrows below or your keyboard. Audio still works without leaving the site.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-primary/15 bg-primary/5 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Reading Mode</p>
                    <h2 className="mt-2 font-display text-xl font-semibold text-foreground sm:text-2xl">Page-by-page reader</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {fullTextLoaded
                        ? "The full text is loaded and split into readable pages, so the book feels calmer and easier to continue inside Aetheria."
                        : hasPublicDomainTextSource(book)
                          ? "Aetheria is loading the linked public-domain text and arranging it into pages for uninterrupted reading."
                          : "The available reading text is presented as pages, so the preview feels closer to a proper reading session."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3 text-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Layout</p>
                    <p className="mt-1 font-medium text-foreground">
                      {visiblePageCount === 2 ? "Two-page spread" : "Single-page focus"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {visiblePageCount === 2
                        ? "Wider screens show facing pages like an open book."
                        : "Compact screens keep one page at a time for comfort."}
                    </p>
                  </div>
                </div>
              </div>

              {displaySections.length ? (
                <ReaderVoiceControls sections={displaySections} language={book.language} className="mt-5" />
              ) : null}

              <section className="mt-8 overflow-hidden rounded-[32px] border border-border/50 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_36%),linear-gradient(180deg,rgba(10,15,19,0.8),rgba(9,13,17,0.96))] p-3 shadow-cinematic sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Book Pages</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {fullTextLoading
                        ? "Loading the full in-site edition and repaginating it now..."
                        : fullTextLoaded
                          ? "The full book is now arranged into pages directly inside Aetheria."
                          : hasBuiltInReader
                            ? "The available on-site text is arranged into pages for a cleaner reading rhythm."
                            : "The preview text is being shown in pages while a full digital source is not linked yet."}
                    </p>
                    {fullTextErrorMessage ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Full book load is unavailable right now, so Aetheria is showing the available in-site text instead.
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-[220px] rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      <span>
                        {totalPages ? `Pages ${currentPageStart}-${currentPageEnd}` : "No pages yet"}
                      </span>
                      <span>{totalPages ? `${progressPercent}%` : ""}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {totalPages
                        ? `Spread ${currentSpread} of ${totalSpreads}`
                        : "Reader pages will appear here once text is ready."}
                    </p>
                  </div>
                </div>

                {readerPages.length ? (
                  <>
                    <div className={cn("mt-5 grid gap-4", visiblePageCount === 2 && "xl:grid-cols-2")}>
                      {visiblePages.map((pageParagraphs, visibleIndex) => {
                        const absolutePageNumber = safePageIndex + visibleIndex + 1;
                        return (
                          <article
                            key={`${book.id}-page-${absolutePageNumber}`}
                            className="relative overflow-hidden rounded-[28px] border border-[#d7c3a0]/70 bg-[linear-gradient(180deg,#fbf6ea_0%,#f5ecd7_100%)] px-5 py-6 text-stone-900 shadow-[0_30px_80px_rgba(0,0,0,0.26)] sm:px-8 sm:py-8"
                          >
                            <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-[linear-gradient(90deg,rgba(111,78,55,0.14),transparent)]" />
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),transparent_70%)] opacity-80" />

                            <div className="relative flex min-h-[56vh] flex-col sm:min-h-[62vh] lg:min-h-[66vh]">
                              <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.28em] text-stone-500">
                                <span className="truncate">{book.author}</span>
                                <span>Page {absolutePageNumber}</span>
                              </div>

                              <div className="mt-6 flex-1 space-y-5">
                                {pageParagraphs.map((paragraph, paragraphIndex) => (
                                  <p
                                    key={`${book.id}-page-${absolutePageNumber}-paragraph-${paragraphIndex}`}
                                    className={cn(
                                      "text-[15px] leading-8 text-stone-800 sm:text-base",
                                      absolutePageNumber === 1 &&
                                        paragraphIndex === 0 &&
                                        "first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-display first-letter:text-4xl first-letter:leading-none sm:first-letter:text-5xl",
                                    )}
                                  >
                                    {paragraph}
                                  </p>
                                ))}
                              </div>

                              <div className="mt-6 flex items-center justify-between border-t border-stone-300/80 pt-4 text-xs text-stone-500">
                                <span className="truncate">{book.title}</span>
                                <span>{absolutePageNumber}</span>
                              </div>
                            </div>
                          </article>
                        );
                      })}

                      {visiblePageCount === 2 && visiblePages.length === 1 ? (
                        <div className="relative overflow-hidden rounded-[28px] border border-dashed border-white/14 bg-white/[0.03] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                          <div className="flex min-h-[56vh] flex-col items-center justify-center rounded-[22px] border border-white/8 bg-background/20 px-6 text-center sm:min-h-[62vh] lg:min-h-[66vh]">
                            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">End of loaded text</p>
                            <p className="mt-4 max-w-xs font-display text-2xl leading-tight text-foreground">
                              The remaining side of this spread stays quiet until the next text is loaded.
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-3 sm:p-4">
                      <button
                        type="button"
                        onClick={handlePreviousPage}
                        disabled={!canGoPrevious}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <ChevronLeft className="size-4" />
                        Previous {visiblePageCount === 2 ? "spread" : "page"}
                      </button>

                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">
                          {totalPages
                            ? `Page ${currentPageStart}${currentPageEnd > currentPageStart ? `-${currentPageEnd}` : ""} of ${totalPages}`
                            : "No page loaded"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Tip: use the left and right arrow keys to turn pages.</p>
                      </div>

                      <button
                        type="button"
                        onClick={handleNextPage}
                        disabled={!canGoNext}
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_36px_hsl(var(--primary)/0.42)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
                      >
                        Next {visiblePageCount === 2 ? "spread" : "page"}
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-5 rounded-[28px] border border-dashed border-white/12 bg-white/[0.03] p-6 text-center text-sm text-muted-foreground">
                    Reader pages will appear here once the text is ready.
                  </div>
                )}
              </section>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Reader;
