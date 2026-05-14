import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getPublicDomainFallbackSections,
  getPublicDomainReaderUrl,
  getPublicDomainTextCandidates,
} from "@/lib/publicDomainBooks";

export const runtime = "nodejs";

type SourceBook = {
  title: string;
  author: string;
};

type RequestedReaderLanguage = "original" | "mn";

type TranslationResult = {
  sections: string[];
  translated: boolean;
  displayLanguage: RequestedReaderLanguage;
  message?: string;
};

const MIN_FULL_TEXT_LENGTH = 2500;
const MAX_SECTION_LENGTH = 1600;
const MAX_SECTIONS = 180;
const TEXT_FETCH_TIMEOUT_MS = 3500;
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_TRANSLATE_MODEL = "gpt-4.1-mini";
const DEFAULT_GEMINI_TRANSLATE_MODEL = "gemini-2.5-flash-lite";
const MAX_TRANSLATION_BATCH_SECTIONS = 12;
const MAX_TRANSLATION_BATCH_CHARS = 7200;
const OPENAI_TRANSLATION_BATCH_CONCURRENCY = 2;
const GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";
const GOOGLE_TRANSLATE_BATCH_SECTIONS = 6;
const GOOGLE_TRANSLATE_BATCH_CHARS = 2200;
const GOOGLE_TRANSLATION_BATCH_CONCURRENCY = 4;
const GOOGLE_SECTION_BREAK = "\n\n[[AETHERIA_SECTION_BREAK]]\n\n";
const TEXT_HEADERS = {
  Accept: "text/plain; charset=utf-8",
  "User-Agent": "Aetheria Reader/1.0",
};
const READER_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};
const FALLBACK_READER_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=300, s-maxage=600",
};

const LOCAL_ENV_CANDIDATES = [
  path.join(process.cwd(), ".env.local"),
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), "..", "backend", ".env"),
];

const GUTENBERG_START_PATTERNS = [/^\*{3}\s*start of/i, /^start of (?:the|this) project gutenberg/i];
const GUTENBERG_END_PATTERNS = [/^\*{3}\s*end of/i, /^end of (?:the|this) project gutenberg/i];
const SECTION_HEADING_PATTERN = /^(chapter|book|part|letter|preface|introduction|prologue|epilogue)\b/i;

const envFileCache = new Map<string, Map<string, string>>();
const translationCache = (
  globalThis as typeof globalThis & {
    __aetheriaReaderTranslationCache?: Map<string, string[]>;
  }
).__aetheriaReaderTranslationCache ?? new Map<string, string[]>();

(
  globalThis as typeof globalThis & {
    __aetheriaReaderTranslationCache?: Map<string, string[]>;
  }
).__aetheriaReaderTranslationCache = translationCache;

const normalizeText = (value: string) =>
  value
    .replace(/\uFEFF/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const isGoogleOpenAiCompatibleBaseUrl = (value: string | null | undefined) =>
  /generativelanguage\.googleapis\.com\/v1beta\/openai/i.test(value ?? "");

const getDefaultTranslateModel = (baseUrl: string) =>
  isGoogleOpenAiCompatibleBaseUrl(baseUrl) ? DEFAULT_GEMINI_TRANSLATE_MODEL : DEFAULT_OPENAI_TRANSLATE_MODEL;

const mergeMessages = (...messages: Array<string | undefined>) =>
  messages
    .map((message) => message?.trim())
    .filter((message): message is string => Boolean(message))
    .join(" ");

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error ?? "Unknown error"));

const parseEnvFile = (filePath: string) => {
  const cached = envFileCache.get(filePath);
  if (cached) {
    return cached;
  }

  const parsed = new Map<string, string>();

  try {
    const contents = readFileSync(filePath, "utf8");

    for (const rawLine of contents.split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }

      parsed.set(key, value);
    }
  } catch {
    // Ignore missing local env files and keep looking at the next candidate.
  }

  envFileCache.set(filePath, parsed);
  return parsed;
};

const getPrivateEnv = (key: string) => {
  const directValue = process.env[key]?.trim();
  if (directValue) {
    return directValue;
  }

  for (const candidatePath of LOCAL_ENV_CANDIDATES) {
    const candidateValue = parseEnvFile(candidatePath).get(key)?.trim();
    if (candidateValue) {
      return candidateValue;
    }
  }

  return "";
};

const parseJsonObject = (value: string) => {
  const trimmed = value.trim();
  const rawJson = trimmed.startsWith("{") ? trimmed : trimmed.match(/\{[\s\S]*\}/u)?.[0];

  if (!rawJson) {
    return null;
  }

  try {
    return JSON.parse(rawJson) as { sections?: unknown };
  } catch {
    return null;
  }
};

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

const chunkSections = (sections: string[], maxSectionCount: number, maxChars: number) => {
  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentBatchChars = 0;

  for (const section of sections) {
    const sectionChars = section.trim().length;
    const exceedsBatchLimit =
      currentBatch.length > 0 &&
      (currentBatch.length >= maxSectionCount || currentBatchChars + sectionChars > maxChars);

    if (exceedsBatchLimit) {
      batches.push(currentBatch);
      currentBatch = [section];
      currentBatchChars = sectionChars;
      continue;
    }

    currentBatch.push(section);
    currentBatchChars += sectionChars;
  }

  if (currentBatch.length) {
    batches.push(currentBatch);
  }

  return batches;
};

const chunkSectionsForTranslation = (sections: string[]) =>
  chunkSections(sections, MAX_TRANSLATION_BATCH_SECTIONS, MAX_TRANSLATION_BATCH_CHARS);

const chunkSectionsForGoogleTranslation = (sections: string[]) =>
  chunkSections(sections, GOOGLE_TRANSLATE_BATCH_SECTIONS, GOOGLE_TRANSLATE_BATCH_CHARS);

const translateBatchesWithConcurrency = async (
  batches: string[][],
  concurrency: number,
  translateBatch: (sections: string[]) => Promise<string[]>,
) => {
  const translatedBatches = new Array<string[]>(batches.length);
  let nextBatchIndex = 0;

  const runWorker = async () => {
    while (nextBatchIndex < batches.length) {
      const batchIndex = nextBatchIndex;
      nextBatchIndex += 1;

      const batch = batches[batchIndex];
      if (!batch) {
        continue;
      }

      translatedBatches[batchIndex] = await translateBatch(batch);
    }
  };

  const workerCount = Math.min(Math.max(1, concurrency), batches.length);
  await Promise.all(Array.from({ length: workerCount }, runWorker));

  return translatedBatches.flatMap((batch) => batch ?? []);
};

const buildTranslationCacheKey = (sourceBook: SourceBook, sections: string[]) => {
  const firstSection = sections[0]?.replace(/\s+/g, " ").slice(0, 140) ?? "";
  const lastSection = sections.at(-1)?.replace(/\s+/g, " ").slice(-140) ?? "";

  return [
    sourceBook.author.trim().toLowerCase(),
    sourceBook.title.trim().toLowerCase(),
    sections.length,
    firstSection,
    lastSection,
  ].join("::");
};

const translateSectionBatch = async (sections: string[], sourceBook: SourceBook) => {
  const openAiApiKey = getPrivateEnv("OPENAI_API_KEY");
  if (!openAiApiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const openAiBaseUrl = normalizeBaseUrl(getPrivateEnv("OPENAI_BASE_URL") || DEFAULT_OPENAI_BASE_URL);
  const openAiModel =
    getPrivateEnv("OPENAI_READER_TRANSLATE_MODEL") ||
    getPrivateEnv("OPENAI_QUERY_MODEL") ||
    getPrivateEnv("OPENAI_CHAT_MODEL") ||
    getDefaultTranslateModel(openAiBaseUrl);

  const response = await fetch(`${openAiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiModel,
      temperature: 0.2,
      max_tokens: 7000,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            'Translate each array item from English into fluent Mongolian Cyrillic. Preserve the array length, order, headings, numbering, and paragraph meaning. Do not summarize or omit anything. Return JSON only in the form {"sections":["..."]}.',
        },
        {
          role: "user",
          content: JSON.stringify({
            title: sourceBook.title,
            author: sourceBook.author,
            sections,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI translation failed with ${response.status}: ${errorBody.slice(0, 240)}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  const parsed = typeof content === "string" ? parseJsonObject(content) : null;
  const translatedSections = Array.isArray(parsed?.sections)
    ? parsed.sections.filter((value): value is string => typeof value === "string").map((value) => normalizeText(value))
    : [];

  if (translatedSections.length !== sections.length || translatedSections.some((section) => !section.trim())) {
    throw new Error("OpenAI translation returned an unexpected section payload.");
  }

  return translatedSections;
};

const translateSectionsWithOpenAI = async (sections: string[], sourceBook: SourceBook) =>
  translateBatchesWithConcurrency(
    chunkSectionsForTranslation(sections),
    OPENAI_TRANSLATION_BATCH_CONCURRENCY,
    (batch) => translateSectionBatch(batch, sourceBook),
  );

const extractGoogleTranslatedText = (payload: unknown) => {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    return null;
  }

  return payload[0]
    .map((chunk) => (Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : ""))
    .join("");
};

const translateSectionBatchWithGoogle = async (sections: string[]) => {
  const params = new URLSearchParams({
    client: "gtx",
    sl: "en",
    tl: "mn",
    dt: "t",
    q: sections.join(GOOGLE_SECTION_BREAK),
  });

  const response = await fetch(`${GOOGLE_TRANSLATE_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; Aetheria Reader/1.0)",
    },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google translation failed with ${response.status}: ${errorBody.slice(0, 240)}`);
  }

  const payload = await response.json();
  const translatedText = extractGoogleTranslatedText(payload);

  if (!translatedText) {
    throw new Error("Google translation returned an empty payload.");
  }

  const translatedSections = translatedText.split(GOOGLE_SECTION_BREAK).map((section) => normalizeText(section));

  if (translatedSections.length !== sections.length || translatedSections.some((section) => !section.trim())) {
    throw new Error("Google translation returned an unexpected section payload.");
  }

  return translatedSections;
};

const translateSectionsWithGoogle = async (sections: string[]) =>
  translateBatchesWithConcurrency(
    chunkSectionsForGoogleTranslation(sections),
    GOOGLE_TRANSLATION_BATCH_CONCURRENCY,
    translateSectionBatchWithGoogle,
  );

const translateSectionsToMongolian = async (
  sections: string[],
  sourceBook: SourceBook,
): Promise<TranslationResult> => {
  if (!sections.length) {
    return {
      sections,
      translated: false,
      displayLanguage: "original",
    };
  }

  const cacheKey = buildTranslationCacheKey(sourceBook, sections);
  const cachedSections = translationCache.get(cacheKey);

  if (cachedSections?.length === sections.length) {
    return {
      sections: cachedSections,
      translated: true,
      displayLanguage: "mn",
    };
  }

  try {
    const translatedSections = await translateSectionsWithGoogle(sections);
    translationCache.set(cacheKey, translatedSections);

    return {
      sections: translatedSections,
      translated: true,
      displayLanguage: "mn",
    };
  } catch (googleError) {
    console.warn("Google reader translation failed, trying OpenAI fallback", toErrorMessage(googleError));

    try {
      const translatedSections = await translateSectionsWithOpenAI(sections, sourceBook);
      translationCache.set(cacheKey, translatedSections);

      return {
        sections: translatedSections,
        translated: true,
        displayLanguage: "mn",
      };
    } catch (openAiError) {
      console.warn("OpenAI reader translation fallback failed", toErrorMessage(openAiError));

      return {
        sections,
        translated: false,
        displayLanguage: "original",
        message: "Mongolian translation is unavailable right now, so Aetheria is showing the original text.",
      };
    }
  }
};

const buildResponse = async ({
  sourceBook,
  sections,
  readerUrl,
  requestedLanguage,
  fallback = false,
  message,
}: {
  sourceBook: SourceBook;
  sections: string[];
  readerUrl: string;
  requestedLanguage: RequestedReaderLanguage;
  fallback?: boolean;
  message?: string;
}) => {
  const translation =
    requestedLanguage === "mn"
      ? await translateSectionsToMongolian(sections, sourceBook)
      : {
          sections,
          translated: false,
          displayLanguage: "original" as const,
        };

  return NextResponse.json(
    {
      sections: translation.sections,
      sourceUrl: readerUrl,
      readerUrl,
      fallback,
      requestedLanguage,
      displayLanguage: translation.displayLanguage,
      translated: translation.translated,
      message: mergeMessages(message, translation.message),
    },
    {
      headers: fallback ? FALLBACK_READER_CACHE_HEADERS : READER_CACHE_HEADERS,
    },
  );
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim() ?? "";
  const author = searchParams.get("author")?.trim() ?? "";
  const requestedLanguage = searchParams.get("language")?.trim().toLowerCase() === "mn" ? "mn" : "original";

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
      return buildResponse({
        sourceBook,
        sections: fallbackSections,
        readerUrl,
        requestedLanguage,
        fallback: true,
        message: "Original source timed out, so Aetheria is using the built-in preview text for now.",
      });
    }

    return NextResponse.json({ error: "Full reader text could not be loaded right now." }, { status: 502 });
  }

  const sections = toReaderSections(trimProjectGutenbergBoilerplate(fullText));

  if (!sections.length) {
    if (fallbackSections?.length) {
      return buildResponse({
        sourceBook,
        sections: fallbackSections,
        readerUrl,
        requestedLanguage,
        fallback: true,
        message: "Original source returned unusable text, so Aetheria is using the built-in preview text for now.",
      });
    }

    return NextResponse.json({ error: "Reader text was fetched, but no readable sections were found." }, { status: 502 });
  }

  return buildResponse({
    sourceBook,
    sections,
    readerUrl,
    requestedLanguage,
  });
}
