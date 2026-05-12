import { NextResponse } from "next/server";
import {
  getPublicDomainFallbackSections,
  getPublicDomainReaderUrl,
  getPublicDomainTextCandidates,
} from "@/lib/publicDomainBooks";

export const runtime = "nodejs";

const MIN_FULL_TEXT_LENGTH = 2500;
const MAX_SECTION_LENGTH = 1600;
const MAX_SECTIONS = 180;
const TEXT_FETCH_TIMEOUT_MS = 3500;
const TEXT_HEADERS = {
  Accept: "text/plain; charset=utf-8",
  "User-Agent": "Aetheria Reader/1.0",
};

const GUTENBERG_START_PATTERNS = [/^\*{3}\s*start of/i, /^start of (?:the|this) project gutenberg/i];
const GUTENBERG_END_PATTERNS = [/^\*{3}\s*end of/i, /^end of (?:the|this) project gutenberg/i];
const SECTION_HEADING_PATTERN = /^(chapter|book|part|letter|preface|introduction|prologue|epilogue)\b/i;

const normalizeText = (value: string) =>
  value
    .replace(/\uFEFF/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const trimProjectGutenbergBoilerplate = (value: string) => {
  const lines = normalizeText(value).split("\n");
  const startIndex = lines.findIndex((line) =>
    GUTENBERG_START_PATTERNS.some((pattern) => pattern.test(line.trim())),
  );
  const trimmedStart = startIndex >= 0 ? lines.slice(startIndex + 1) : lines;
  const endIndex = trimmedStart.findIndex((line) =>
    GUTENBERG_END_PATTERNS.some((pattern) => pattern.test(line.trim())),
  );

  return normalizeText((endIndex >= 0 ? trimmedStart.slice(0, endIndex) : trimmedStart).join("\n"));
};

const splitLongParagraph = (paragraph: string) => {
  if (paragraph.length <= MAX_SECTION_LENGTH) {
    return [paragraph];
  }

  const sentences = paragraph.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((sentence) => sentence.trim()) ?? [paragraph];
  const chunks: string[] = [];
  let current = "";

  const pushChunk = () => {
    const normalized = current.trim();
    if (normalized) {
      chunks.push(normalized);
    }
    current = "";
  };

  for (const sentence of sentences) {
    if (!sentence) {
      continue;
    }

    if (!current) {
      current = sentence;
      continue;
    }

    if (`${current} ${sentence}`.length > MAX_SECTION_LENGTH) {
      pushChunk();
      current = sentence;
      continue;
    }

    current = `${current} ${sentence}`;
  }

  pushChunk();

  return chunks.length ? chunks : [paragraph];
};

const toReaderSections = (value: string) =>
  normalizeText(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length >= 60 || SECTION_HEADING_PATTERN.test(paragraph))
    .flatMap(splitLongParagraph)
    .slice(0, MAX_SECTIONS);

const readTextCandidate = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TEXT_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: TEXT_HEADERS,
      next: { revalidate: 86400 },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    if (normalizeText(text).length < MIN_FULL_TEXT_LENGTH) {
      return null;
    }

    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const readFirstSuccessfulText = async (urls: string[]) => {
  const results = await Promise.all(urls.map((url) => readTextCandidate(url)));
  return results.find((value): value is string => Boolean(value)) ?? null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim() ?? "";
  const author = searchParams.get("author")?.trim() ?? "";

  if (!title || !author) {
    return NextResponse.json({ error: "Missing title or author." }, { status: 400 });
  }

  const sourceBook = { title, author };
  const candidateUrls = getPublicDomainTextCandidates(sourceBook);
  const readerUrl = getPublicDomainReaderUrl(sourceBook);
  const fallbackSections = getPublicDomainFallbackSections(sourceBook);

  if (!candidateUrls.length || !readerUrl) {
    return NextResponse.json({ error: "No public-domain text source is configured for this book." }, { status: 404 });
  }

  const fullText = await readFirstSuccessfulText(candidateUrls);

  if (!fullText) {
    if (fallbackSections?.length) {
      return NextResponse.json({
        sections: fallbackSections,
        sourceUrl: readerUrl,
        readerUrl,
        fallback: true,
        message: "Original source timed out, so Aetheria is using the built-in preview text for now.",
      });
    }

    return NextResponse.json({ error: "Full reader text could not be loaded right now." }, { status: 502 });
  }

  const sections = toReaderSections(trimProjectGutenbergBoilerplate(fullText));

  if (!sections.length) {
    if (fallbackSections?.length) {
      return NextResponse.json({
        sections: fallbackSections,
        sourceUrl: readerUrl,
        readerUrl,
        fallback: true,
        message: "Original source returned unusable text, so Aetheria is using the built-in preview text for now.",
      });
    }

    return NextResponse.json({ error: "Reader text was fetched, but no readable sections were found." }, { status: 502 });
  }

  return NextResponse.json({
    sections,
    sourceUrl: readerUrl,
    readerUrl,
  });
}
