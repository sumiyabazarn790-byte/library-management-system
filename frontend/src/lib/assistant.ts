import { getSupabaseUnavailableReason } from "@/integrations/supabase/availability";
import { supabase } from "@/integrations/supabase/client";
import {
  canReadBookNow,
  fetchLoans,
  fetchRecommendedBooks,
  formatLibraryDate,
  resolveBookId,
  searchBooks,
  toFriendlyLibraryError,
} from "@/lib/library";
import type { Book, LoanWithBook, Profile } from "@/types/library";

type AssistantLanguage = "mn" | "en";

export type AssistantIntentKind =
  | "capabilities"
  | "loans"
  | "recommend"
  | "borrow"
  | "request"
  | "return"
  | "search"
  | "unknown";

export type AssistantIntent = {
  kind: AssistantIntentKind;
  query: string;
};

export type AssistantConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type LocalAssistantReply = {
  handled: boolean;
  reply?: string;
  shouldSignOut?: boolean;
};

const STALE_AUTH_SESSION_PATTERN =
  /user from sub claim in jwt does not exist|session from session_id claim in jwt does not exist|invalid refresh token|refresh token not found|loans_user_id_fkey|violates foreign key constraint ["']loans_user_id_fkey["']/i;

export const MONGOLIAN_CAPABILITIES_REPLY = [
  "Юу хийж чадах вэ:",
  "AI",
  "",
  "• Ном хайх (title/author-аар)",
  "• Зээлэх / захиалах",
  "• Өөрийн loans үзэх",
  "• Санал болгох (таны genre-ийн дагуу)",
  "• Буруу бичсэн ч олох (fuzzy/typo-tolerant)",
  "• Утгаар хайх (semantic search)",
  "• Монгол/Англи хоёуланг ойлгох",
].join("\n");

export const ENGLISH_CAPABILITIES_REPLY = [
  "What I can help with:",
  "AI",
  "",
  "• Search books by title or author",
  "• Borrow or request books",
  "• Show your current loans",
  "• Recommend books based on your genres",
  "• Find books even with typos (fuzzy search)",
  "• Search by meaning (semantic search)",
  "• Understand both Mongolian and English",
].join("\n");

const ACTION_CAPTURE_PATTERNS = {
  borrow: [
    /(?:borrow|take out|loan)\s+(?:the\s+)?(?:book\s+)?(.+)/i,
    /(?:ном\s+)?зээл(?:эх|мээр байна|ж өг|ж og|e?h)\s+(.+)/i,
    /zeel(?:eh|e)?\s+(.+)/i,
  ],
  request: [
    /(?:request|reserve|hold)\s+(?:the\s+)?(?:book\s+)?(.+)/i,
    /(?:ном\s+)?захиал(?:ах|маар байна|ж өг|j og|a?h)\s+(.+)/i,
    /zahial(?:ah|a)?\s+(.+)/i,
  ],
  return: [
    /(?:return|bring back)\s+(?:the\s+)?(?:book\s+)?(.+)/i,
    /(?:ном\s+)?буцаа(?:х|маар байна|ж өг|j og)?\s+(.+)/i,
    /butsaa(?:h)?\s+(.+)/i,
  ],
  recommend: [
    /(?:recommend|suggest)(?:\s+me)?(?:\s+(?:a|some))?(?:\s+books?)?(?:\s+(?:about|for|on|in))?\s*(.*)/i,
    /(?:ямар|өөр)\s+ном/i,
    /санал\s+болго(?:х|од өг|oroi|j og)?\s*(.*)/i,
    /sanal\s+bolgo(?:h|oroi|j og)?\s*(.*)/i,
  ],
  search: [
    /(?:search|find|look for|show)(?:\s+me)?(?:\s+(?:a|some))?(?:\s+books?)?(?:\s+(?:about|by|for|on))?\s+(.+)/i,
    /(?:book|books)\s+by\s+(.+)/i,
    /(?:book|books)\s+about\s+(.+)/i,
    /(?:ном\s+)?хай(?:х|ж өг|j og|gaad)?\s+(.+)/i,
    /(?:ном\s+)?ол(?:ох|ж өг|j og)?\s+(.+)/i,
    /hai(?:h)?\s+(.+)/i,
    /ol(?:oh)?\s+(.+)/i,
  ],
} satisfies Record<Exclude<AssistantIntentKind, "capabilities" | "loans" | "unknown">, RegExp[]>;

const isMongolian = (text: string) => /[\u0400-\u04FF]/.test(text);

const ROMANIZED_MONGOLIAN_TOKENS = [
  "minii",
  "namaig",
  "nadad",
  "bidend",
  "tand",
  "ta",
  "ooriin",
  "yu",
  "yuu",
  "uu",
  "ve",
  "be",
  "bgaa",
  "baigaa",
  "bna",
  "baina",
  "bn",
  "loan",
  "nom",
  "nomoo",
  "nomnuud",
  "zohiolch",
  "garig",
  "genre",
  "hai",
  "haij",
  "ol",
  "oldoh",
  "sanal",
  "bolgo",
  "ogooch",
  "zeel",
  "zeelsen",
  "zahial",
  "zahialsan",
  "butsaa",
  "tailbar",
  "tusal",
  "hiij",
  "chadah",
  "hairiin",
  "tuhai",
  "bichsen",
];

const ENGLISH_LANGUAGE_HINTS = /\b(what|which|where|when|why|how|show|find|search|borrow|request|return|book|books|author|title|topic)\b/i;

const canonicalizeIntentWord = (word: string) => {
  const collapsed = word.replace(/([a-z])\1{2,}/g, "$1$1");

  if (/^min+i+$/.test(collapsed)) return "minii";
  if (/^loan?s$/.test(collapsed)) return "loan";
  if (/^books?$/.test(collapsed)) return "book";
  if (/^zee+l+(?:e+h)?$/.test(collapsed)) return "zeel";
  if (/^zee+l+s?e*n+$/.test(collapsed)) return "zeelsen";
  if (/^zahia+l+(?:a+h)?$/.test(collapsed)) return "zahial";
  if (/^zahia+l+s?a*n+$/.test(collapsed)) return "zahialsan";
  if (/^nom(?:oo)?$/.test(collapsed)) return "nom";
  if (/^nom+n?u+u+d+(?:aa|ee|oo)?$/.test(collapsed)) return "nom";

  return collapsed;
};

const isRomanizedMongolian = (text: string) => {
  const normalized = normalizeIntentText(text);
  const words = normalized.split(" ").filter(Boolean);
  const matchedTokenCount = words.filter((word) => ROMANIZED_MONGOLIAN_TOKENS.includes(word)).length;

  if (matchedTokenCount >= 2) {
    return true;
  }

  if (matchedTokenCount >= 1 && !ENGLISH_LANGUAGE_HINTS.test(normalized)) {
    return true;
  }

  return /\b(minii|namaig|nadad|ooriin|loan|zeel|zeelsen|zahial|zahialsan|butsaa|nom|genre|yuu|hiij|chadah|tusal|sanal|hai|ol|ogooch)\b/i.test(
    normalized,
  );
};

const normalizeAssistantText = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ");

const normalizeIntentText = (text: string) =>
  normalizeAssistantText(text)
    .split(" ")
    .filter(Boolean)
    .map(canonicalizeIntentWord)
    .join(" ");

const tokenizeIntentText = (text: string) => normalizeIntentText(text).split(" ").filter(Boolean);

const cleanupExtractedQuery = (query: string) =>
  query
    .trim()
    .replace(/^[\s:;,.!?-]+/, "")
    .replace(/[\s:;,.!?-]+$/, "")
    .replace(/^(?:nom|book|books)\s+/i, "")
    .trim();

const extractQuotedQuery = (text: string) => {
  const match = text.match(/["“](.+?)["”]/);
  return cleanupExtractedQuery(match?.[1] ?? "");
};

const extractQueryByPatterns = (text: string, patterns: RegExp[]) => {
  const quoted = extractQuotedQuery(text);
  if (quoted) {
    return quoted;
  }

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const extracted = cleanupExtractedQuery(match?.[1] ?? "");

    if (extracted) {
      return extracted;
    }
  }

  return "";
};

const isCapabilityQuestion = (text: string) =>
  /(юу хийж чад|юу чаддаг|чадвар|тусал|how can you help|what can you do|what do you do|capabilities|help me use|help$)/i.test(
    text,
  );

const isLoanOverviewQuestion = (text: string) =>
  /(миний\s+(?:loan|loans|зээл|зээлсэн|захиалсан)|өөрийн\s+loans|show\s+my\s+loans|my\s+(?:loans|borrowed books|requested books)|current\s+loans|list\s+my\s+loans|minii\s+(?:loan|loans|zeelsen|zahialsan)|due\s+books)/i.test(
    text,
  );

const LOAN_OVERVIEW_PRONOUNS = new Set(["minii", "my", "nadad", "namaig"]);
const LOAN_OVERVIEW_MARKERS = new Set(["loan", "borrowed", "requested", "due", "zeelsen", "zahialsan"]);
const LOAN_OVERVIEW_STEMS = new Set(["zeel", "zahial"]);
const LOAN_OVERVIEW_BOOK_WORDS = new Set(["nom", "book"]);

const hasLoanOverviewHint = (text: string) => {
  const words = tokenizeIntentText(text);
  const hasPronoun = words.some((word) => LOAN_OVERVIEW_PRONOUNS.has(word));
  const hasMarker = words.some((word) => LOAN_OVERVIEW_MARKERS.has(word));
  const hasLoanStem = words.some((word) => LOAN_OVERVIEW_STEMS.has(word));
  const hasBookWord = words.some((word) => LOAN_OVERVIEW_BOOK_WORDS.has(word));

  return (hasPronoun && (hasMarker || hasLoanStem)) || (hasMarker && hasBookWord);
};

const isRecommendationQuestion = (text: string) =>
  /(recommend|suggest|санал\s+болго|sanal\s+bolgo|what should i read|ямар ном унш)/i.test(text);

const hasSearchSignal = (text: string) =>
  /(search|find|look for|book by|book about|author|title|genre|catalog|library|ном|зохиолч|гарчиг|genre|hai|ol)/i.test(
    text,
  );

const isShortCatalogQuery = (text: string) => {
  const normalized = normalizeAssistantText(text);
  const words = normalized.split(" ").filter(Boolean);

  if (!normalized || words.length > 6) {
    return false;
  }

  if (/[?]/.test(text)) {
    return false;
  }

  return !/(what|why|how|when|where|who|яагаад|хэзээ|хаана|хэн)/i.test(normalized);
};

export const detectAssistantLanguage = (text: string): AssistantLanguage =>
  isMongolian(text) || isRomanizedMongolian(text) ? "mn" : "en";

export const buildCapabilitiesReply = (language: AssistantLanguage) =>
  language === "mn" ? MONGOLIAN_CAPABILITIES_REPLY : ENGLISH_CAPABILITIES_REPLY;

const extractCatalogTitlesFromAssistantMessage = (content: string) =>
  content
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.match(/^•\s+(.+?)\s+[—-]\s+.+\(.+\)$/)?.[1]?.trim() ?? "")
    .filter(Boolean);

export const detectAssistantIntent = (text: string): AssistantIntent => {
  const normalized = normalizeAssistantText(text);

  if (!normalized) {
    return { kind: "unknown", query: "" };
  }

  if (isCapabilityQuestion(text)) {
    return { kind: "capabilities", query: "" };
  }

  if (isLoanOverviewQuestion(text) || hasLoanOverviewHint(text)) {
    return { kind: "loans", query: "" };
  }

  const returnQuery = extractQueryByPatterns(text, ACTION_CAPTURE_PATTERNS.return);
  if (returnQuery) {
    return { kind: "return", query: returnQuery };
  }
  if (/(?:\breturn\b|bring back|буцаа|butsaa)/i.test(text)) {
    return { kind: "return", query: "" };
  }

  const requestQuery = extractQueryByPatterns(text, ACTION_CAPTURE_PATTERNS.request);
  if (requestQuery) {
    return { kind: "request", query: requestQuery };
  }
  if (/(?:\brequest\b|reserve|hold|захиал|zahial)/i.test(text)) {
    return { kind: "request", query: "" };
  }

  const borrowQuery = extractQueryByPatterns(text, ACTION_CAPTURE_PATTERNS.borrow);
  if (borrowQuery) {
    return { kind: "borrow", query: borrowQuery };
  }
  if (/(?:\bborrow\b|take out|loan\b|зээл|zeel)/i.test(text)) {
    return { kind: "borrow", query: "" };
  }

  if (isRecommendationQuestion(text)) {
    return {
      kind: "recommend",
      query: extractQueryByPatterns(text, ACTION_CAPTURE_PATTERNS.recommend),
    };
  }

  const searchQuery = extractQueryByPatterns(text, ACTION_CAPTURE_PATTERNS.search);
  if (searchQuery) {
    return { kind: "search", query: searchQuery };
  }

  const quoted = extractQuotedQuery(text);
  if (quoted) {
    return { kind: "search", query: quoted };
  }

  if (hasSearchSignal(text) || isShortCatalogQuery(text)) {
    return { kind: "search", query: cleanupExtractedQuery(text) };
  }

  return { kind: "unknown", query: "" };
};

export const inferFollowUpTargetFromHistory = ({
  text,
  intentKind,
  history = [],
}: {
  text: string;
  intentKind: AssistantIntentKind;
  history?: AssistantConversationMessage[];
}) => {
  const normalizedCurrentText = normalizeAssistantText(text);

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index];

    if (message.role !== "assistant") {
      continue;
    }

    const titles = extractCatalogTitlesFromAssistantMessage(message.content);

    if (titles.length === 1) {
      return {
        query: titles[0],
        options: [] as string[],
      };
    }

    if (titles.length > 1 && (intentKind === "borrow" || intentKind === "request" || intentKind === "return")) {
      return {
        query: "",
        options: titles,
      };
    }
  }

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index];

    if (message.role !== "user") {
      continue;
    }

    const normalizedMessage = normalizeAssistantText(message.content);

    if (!normalizedMessage || normalizedMessage === normalizedCurrentText) {
      continue;
    }

    const previousIntent = detectAssistantIntent(message.content);

    if (previousIntent.query) {
      return {
        query: previousIntent.query,
        options: [] as string[],
      };
    }

    if (isShortCatalogQuery(message.content)) {
      return {
        query: cleanupExtractedQuery(message.content),
        options: [] as string[],
      };
    }
  }

  return {
    query: "",
    options: [] as string[],
  };
};

const buildSignInReply = (language: AssistantLanguage) =>
  language === "mn"
    ? "Энэ үйлдлийг хийхийн тулд эхлээд нэвтэрнэ үү."
    : "Please sign in first so I can do that for your account.";

const buildUnavailableReply = (language: AssistantLanguage, reason: string) =>
  language === "mn"
    ? `Одоогоор library backend холбогдохгүй байна: ${reason}`
    : `The library backend is unavailable right now: ${reason}`;

const formatBookLine = (book: Book, language: AssistantLanguage) =>
  `• ${book.title} — ${book.author} (${book.genre}, ${book.available_copies}/${book.total_copies} ${
    language === "mn" ? "боломжтой" : "available"
  })`;

const scoreBookCandidate = (book: Book, query: string) => {
  const normalizedQuery = normalizeAssistantText(query);
  const title = normalizeAssistantText(book.title);
  const author = normalizeAssistantText(book.author);
  const genre = normalizeAssistantText(book.genre);
  const description = normalizeAssistantText(book.description);

  let score = 0;

  if (title === normalizedQuery) score += 120;
  if (title.includes(normalizedQuery)) score += 90;
  if (normalizedQuery.includes(title)) score += 70;
  if (author === normalizedQuery) score += 80;
  if (author.includes(normalizedQuery) || normalizedQuery.includes(author)) score += 55;
  if (genre.includes(normalizedQuery) || normalizedQuery.includes(genre)) score += 35;
  if (description.includes(normalizedQuery)) score += 20;
  if (book.available_copies > 0) score += 8;

  return score;
};

const pickBestBook = (books: Book[], query: string) =>
  [...books].sort((left, right) => scoreBookCandidate(right, query) - scoreBookCandidate(left, query))[0] ?? null;

const pickBestLoan = (loans: LoanWithBook[], query: string) =>
  [...loans].sort((left, right) => scoreBookCandidate(right.book, query) - scoreBookCandidate(left.book, query))[0] ?? null;

const buildSearchReply = async (query: string, language: AssistantLanguage): Promise<LocalAssistantReply> => {
  const books = await searchBooks(query, 4);

  if (!books.length) {
    return {
      handled: true,
      reply:
        language === "mn"
          ? `Каталогоос "${query}"-тэй ойролцоо ном олдсонгүй. Гарчиг, зохиолч, эсвэл сэдвээр нь арай өөрөөр асуугаад үзээрэй.`
          : `I could not find a catalog match for "${query}". Try another title, author, or topic.`,
    };
  }

  return {
    handled: true,
    reply: [
      language === "mn"
        ? `Каталогоос "${query}"-д тохирох дараах номуудыг оллоо:`
        : `I found these catalog matches for "${query}":`,
      ...books.map((book) => formatBookLine(book, language)),
      language === "mn"
        ? 'Хүсвэл "зээлэх <номын нэр>" эсвэл "захиалах <номын нэр>" гэж үргэлжлүүлж болно.'
        : 'If you want one, say "borrow <title>" or "request <title>".',
    ].join("\n"),
  };
};

const buildLoansReply = async (userId: string | undefined, language: AssistantLanguage): Promise<LocalAssistantReply> => {
  if (!userId) {
    return { handled: true, reply: buildSignInReply(language) };
  }

  const loans = await fetchLoans(userId, { statuses: ["active", "requested"], limit: 8 });

  if (!loans.length) {
    return {
      handled: true,
      reply:
        language === "mn"
          ? "Танд одоогоор идэвхтэй эсвэл захиалсан ном алга."
          : "You do not have any active or requested books right now.",
    };
  }

  return {
    handled: true,
    reply: [
      language === "mn" ? "Таны одоогийн loans:" : "Here are your current loans:",
      ...loans.map((loan) => {
        const statusLabel =
          loan.status === "requested"
            ? language === "mn"
              ? "захиалсан"
              : "requested"
            : language === "mn"
              ? "идэвхтэй"
              : "active";

        const duePart =
          loan.status === "active"
            ? language === "mn"
              ? ` • буцаах: ${formatLibraryDate(loan.due_date)}`
              : ` • due: ${formatLibraryDate(loan.due_date)}`
            : "";

        return `• ${loan.book.title} — ${loan.book.author} (${statusLabel}${duePart})`;
      }),
    ].join("\n"),
  };
};

const buildRecommendationReply = async ({
  userId,
  profile,
  query,
  language,
}: {
  userId?: string;
  profile?: Profile | null;
  query?: string;
  language: AssistantLanguage;
}): Promise<LocalAssistantReply> => {
  if (query) {
    const books = await searchBooks(query, 4);

    if (!books.length) {
      return {
        handled: true,
        reply:
          language === "mn"
            ? `"${query}" чиглэлээр санал болгох ном олдсонгүй. Өөр genre эсвэл сэдэв хэлээд үзээрэй.`
            : `I could not find a recommendation set for "${query}". Try another genre or topic.`,
      };
    }

    return {
      handled: true,
      reply: [
        language === "mn"
          ? `"${query}" чиглэлээр танд тохирох номууд:`
          : `Here are a few books for "${query}":`,
        ...books.map((book) => formatBookLine(book, language)),
      ].join("\n"),
    };
  }

  const recommendation = await fetchRecommendedBooks({
    userId,
    preferredGenres: profile?.preferred_genres ?? [],
    limit: 4,
  });

  if (!recommendation.books.length) {
    return {
      handled: true,
      reply:
        language === "mn"
          ? "Одоогоор recommendation гаргахад хангалттай catalog data алга."
          : "There is not enough catalog data to build recommendations right now.",
    };
  }

  return {
    handled: true,
    reply: [
      recommendation.genres.length
        ? language === "mn"
          ? `Таны сонирхдог genre дээр тулгуурласан санал: ${recommendation.genres.slice(0, 3).join(", ")}`
          : `Recommendations shaped by your genres: ${recommendation.genres.slice(0, 3).join(", ")}`
        : language === "mn"
          ? "Одоогийн каталогоос санал болгож болох номууд:"
          : "Here are a few books from the current catalog:",
      ...recommendation.books.map((book) => formatBookLine(book, language)),
    ].join("\n"),
  };
};

const buildActionErrorReply = (error: unknown, language: AssistantLanguage): LocalAssistantReply => {
  const message = error instanceof Error ? error.message : "Unknown error";

  return {
    handled: true,
    shouldSignOut: STALE_AUTH_SESSION_PATTERN.test(message),
    reply: STALE_AUTH_SESSION_PATTERN.test(message)
      ? language === "mn"
        ? "Таны session хуучирсан байна. Дахин нэвтэрч ороод оролдоно уу."
        : "Your local session has expired. Please sign in again and try once more."
      : toFriendlyLibraryError(message),
  };
};

const buildBorrowOrRequestReply = async ({
  requestedKind,
  query,
  userId,
  language,
}: {
  requestedKind: "borrow" | "request";
  query: string;
  userId?: string;
  language: AssistantLanguage;
}): Promise<LocalAssistantReply> => {
  if (!userId) {
    return { handled: true, reply: buildSignInReply(language) };
  }

  const unavailableReason = getSupabaseUnavailableReason();
  if (unavailableReason) {
    return { handled: true, reply: buildUnavailableReply(language, unavailableReason) };
  }

  if (!query) {
    return {
      handled: true,
      reply:
        language === "mn"
          ? `Ямар ном ${requestedKind === "borrow" ? "зээлэх" : "захиалах"} гэж байгаагаа нэрээр нь хэлээрэй.`
          : `Tell me which title you want to ${requestedKind}.`,
    };
  }

  try {
    const books = await searchBooks(query, 5);
    const book = pickBestBook(books, query);

    if (!book) {
      return {
        handled: true,
        reply:
          language === "mn"
            ? `"${query}" нэртэй ном каталогоос олдсонгүй.`
            : `I could not find "${query}" in the catalog.`,
      };
    }

    if (canReadBookNow(book)) {
      return {
        handled: true,
        reply:
          language === "mn"
            ? `"${book.title}" нь site дээр шууд уншигддаг ном байна. Card дээрээс нь "Read on site" гэж нээж болно.`
            : `"${book.title}" is already available to read on site. You can open it directly from the catalog card.`,
      };
    }

    const actualKind = book.available_copies > 0 ? "borrow" : "request";
    const canonicalBookId = await resolveBookId(book);
    const rpcName = actualKind === "borrow" ? "borrow_book" : "request_book";
    const { error } = await supabase.rpc(rpcName, { p_book_id: canonicalBookId });

    if (error) {
      return buildActionErrorReply(error, language);
    }

    if (actualKind === "borrow") {
      return {
        handled: true,
        reply:
          requestedKind === "request"
            ? language === "mn"
              ? `"${book.title}" одоо боломжтой байсан тул танд шууд зээллээ.`
              : `"${book.title}" was available, so I borrowed it for you right away.`
            : language === "mn"
              ? `"${book.title}" амжилттай зээлэгдлээ.`
              : `"${book.title}" has been borrowed successfully.`,
      };
    }

    return {
      handled: true,
      reply:
        requestedKind === "borrow"
          ? language === "mn"
            ? `"${book.title}" одоогоор боломжгүй тул захиалга болгон бүртгэлээ.`
            : `"${book.title}" is not available right now, so I placed a request instead.`
          : language === "mn"
            ? `"${book.title}" захиалгад орлоо. Боломжтой болмогц идэвхжинэ.`
            : `"${book.title}" has been requested and will activate when it becomes available.`,
    };
  } catch (error) {
    return buildActionErrorReply(error, language);
  }
};

const buildReturnReply = async ({
  query,
  userId,
  language,
}: {
  query: string;
  userId?: string;
  language: AssistantLanguage;
}): Promise<LocalAssistantReply> => {
  if (!userId) {
    return { handled: true, reply: buildSignInReply(language) };
  }

  const unavailableReason = getSupabaseUnavailableReason();
  if (unavailableReason) {
    return { handled: true, reply: buildUnavailableReply(language, unavailableReason) };
  }

  try {
    const loans = await fetchLoans(userId, { statuses: ["active"], limit: 20 });

    if (!loans.length) {
      return {
        handled: true,
        reply:
          language === "mn"
            ? "Буцаах идэвхтэй ном алга."
            : "You do not have any active books to return.",
      };
    }

    if (!query && loans.length > 1) {
      return {
        handled: true,
        reply: [
          language === "mn"
            ? "Ямар ном буцаахаа тодруулна уу. Одоогоор танд эдгээр идэвхтэй номууд байна:"
            : "Tell me which title to return. These are your current active books:",
          ...loans.slice(0, 5).map((loan) => `• ${loan.book.title} — ${loan.book.author}`),
        ].join("\n"),
      };
    }

    const loan = query ? pickBestLoan(loans, query) : loans[0];

    if (!loan) {
      return {
        handled: true,
        reply:
          language === "mn"
            ? `"${query}" нэртэй идэвхтэй зээл олдсонгүй.`
            : `I could not find an active loan for "${query}".`,
      };
    }

    const { error } = await supabase.rpc("return_book", { p_loan_id: loan.id });
    if (error) {
      return buildActionErrorReply(error, language);
    }

    return {
      handled: true,
      reply:
        language === "mn"
          ? `"${loan.book.title}" амжилттай буцаагдлаа.`
          : `"${loan.book.title}" has been returned successfully.`,
    };
  } catch (error) {
    return buildActionErrorReply(error, language);
  }
};

const buildOfflineUnknownReply = (language: AssistantLanguage) =>
  language === "mn"
    ? "Одоогоор AI backend холбогдохгүй байна. Та номын нэр, зохиолч, эсвэл `миний loans` гэж асуувал би catalog талын тусламж үзүүлж чадна."
    : "The AI backend is unavailable right now. If you ask for a title, author, or say `my loans`, I can still help with catalog actions.";

export const resolveLocalAssistantReply = async ({
  text,
  userId,
  profile,
  history = [],
  forceOfflineFallback = false,
}: {
  text: string;
  userId?: string;
  profile?: Profile | null;
  history?: AssistantConversationMessage[];
  forceOfflineFallback?: boolean;
}): Promise<LocalAssistantReply> => {
  const language = detectAssistantLanguage(text);
  const intent = detectAssistantIntent(text);
  const followUpTarget =
    !intent.query && (intent.kind === "borrow" || intent.kind === "request" || intent.kind === "return")
      ? inferFollowUpTargetFromHistory({
          text,
          intentKind: intent.kind,
          history,
        })
      : { query: "", options: [] as string[] };

  if (!intent.query && followUpTarget.options.length > 1) {
    return {
      handled: true,
      reply: [
        language === "mn"
          ? "Яг аль ном дээр үйлдэл хийхээ тодруулна уу:"
          : "Please tell me which title you want:",
        ...followUpTarget.options.map((option) => `• ${option}`),
      ].join("\n"),
    };
  }

  const resolvedQuery = intent.query || followUpTarget.query;

  switch (intent.kind) {
    case "capabilities":
      return { handled: true, reply: buildCapabilitiesReply(language) };
    case "loans":
      return buildLoansReply(userId, language);
    case "recommend":
      return buildRecommendationReply({ userId, profile, query: resolvedQuery, language });
    case "borrow":
      return buildBorrowOrRequestReply({ requestedKind: "borrow", query: resolvedQuery, userId, language });
    case "request":
      return buildBorrowOrRequestReply({ requestedKind: "request", query: resolvedQuery, userId, language });
    case "return":
      return buildReturnReply({ query: resolvedQuery, userId, language });
    case "search":
      return buildSearchReply(resolvedQuery, language);
    case "unknown":
    default:
      if (forceOfflineFallback) {
        return { handled: true, reply: buildOfflineUnknownReply(language) };
      }

      return { handled: false };
  }
};
