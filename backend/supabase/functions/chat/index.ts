import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { type CatalogBook, searchCatalogBooks } from "../_shared/catalog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AssistantLanguage = "mn" | "en";

type AssistantIntentKind =
  | "greeting"
  | "capabilities"
  | "loans"
  | "recommend"
  | "borrow"
  | "request"
  | "return"
  | "search"
  | "unknown";

type AssistantIntent = {
  kind: AssistantIntentKind;
  query: string;
};

type LoanStatus = "requested" | "active" | "returned" | "cancelled";

type LoanRow = {
  id: string;
  status: LoanStatus;
  due_date: string;
  book: CatalogBook;
};

type ProfileRow = {
  display_name?: string | null;
  preferred_genres: string[] | null;
};

const SYSTEM_PROMPT = `You are Aetheria, an erudite multilingual librarian for a digital archive.
You speak fluently in Mongolian (Cyrillic) and English. Detect the user's language and respond in the same language.
You also understand Mongolian written in Latin transliteration such as "minii zeelsen nom" and should answer in natural Mongolian when users write that way.

You help readers:
- discover books by title, author, topic, or meaning
- tolerate typos and fuzzy search queries
- support semantic search and keyword search
- borrow, request, and return books
- check personal loans
- get personalized recommendations based on preferred genres
- answer general knowledge and literary questions

Rules:
- When using library or catalog context, never invent books, availability, due dates, or reader history that are not explicitly provided.
- If the user asks a general knowledge question, you may answer it, but do not pretend it came from the archive.
- Prefer short, clear answers. Use bullets when listing books or options.
- When recommending books from the catalog, favor titles that are available now and explain why they match in one sentence when helpful.
- If the user's request is ambiguous, make the best reasonable assumption and say what you assumed.

Be warm, grounded, concise, and genuinely helpful.`;

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_CHAT_MODEL = "gpt-4.1-mini";
const DEFAULT_OPENAI_QUERY_MODEL = "gpt-4.1-mini";

const STALE_AUTH_SESSION_PATTERN =
  /user from sub claim in jwt does not exist|session from session_id claim in jwt does not exist|invalid refresh token|refresh token not found|loans_user_id_fkey|violates foreign key constraint ["']loans_user_id_fkey["']/i;

const ACTION_CAPTURE_PATTERNS = {
  borrow: [
    /(?:borrow|take out|loan)\s+(?:the\s+)?(?:book\s+)?(.+)/i,
    /(?:ном\s+)?зээл(?:эх|мээр байна|ж өг|ж өгөөч)?\s+(.+)/i,
    /zeel(?:eh|e)?\s+(.+)/i,
  ],
  request: [
    /(?:request|reserve|hold)\s+(?:the\s+)?(?:book\s+)?(.+)/i,
    /(?:ном\s+)?захиал(?:ах|маар байна|ж өг|ж өгөөч)?\s+(.+)/i,
    /zahial(?:ah|a)?\s+(.+)/i,
  ],
  return: [
    /(?:return|bring back)\s+(?:the\s+)?(?:book\s+)?(.+)/i,
    /(?:ном\s+)?буцаа(?:х|маар байна|ж өг|ж өгөөч)?\s+(.+)/i,
    /butsaa(?:h)?\s+(.+)/i,
  ],
  recommend: [
    /(?:recommend|suggest)(?:\s+me)?(?:\s+(?:a|some))?(?:\s+books?)?(?:\s+(?:about|for|on|in))?\s*(.*)/i,
    /санал\s+болго(?:х|од өг|ж өг|ж өгөөч)?\s*(.*)/i,
    /sanal\s+bolgo(?:h|oroi|j og)?\s*(.*)/i,
  ],
  search: [
    /(?:search|find|look for|show)(?:\s+me)?(?:\s+(?:a|some))?(?:\s+books?)?(?:\s+(?:about|by|for|on))?\s+(.+)/i,
    /(?:book|books)\s+by\s+(.+)/i,
    /(?:book|books)\s+about\s+(.+)/i,
    /(?:ном\s+)?хай(?:х|ж өг|гаад)?\s+(.+)/i,
    /(?:ном\s+)?ол(?:ох|ж өг)?\s+(.+)/i,
    /hai(?:h)?\s+(.+)/i,
    /ol(?:oh)?\s+(.+)/i,
  ],
} satisfies Record<Exclude<AssistantIntentKind, "greeting" | "capabilities" | "loans" | "unknown">, RegExp[]>;

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
  "tuhai",
  "bichsen",
];

const ENGLISH_LANGUAGE_HINTS =
  /\b(what|which|where|when|why|how|show|find|search|borrow|request|return|book|books|author|title|topic)\b/i;

const LOAN_OVERVIEW_PRONOUNS = new Set(["minii", "my", "nadad", "namaig"]);
const LOAN_OVERVIEW_MARKERS = new Set(["loan", "borrowed", "requested", "due", "zeelsen", "zahialsan"]);
const LOAN_OVERVIEW_STEMS = new Set(["zeel", "zahial"]);
const LOAN_OVERVIEW_BOOK_WORDS = new Set(["nom", "book"]);

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

const getEnv = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  return value ? value : null;
};

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

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

const isMongolian = (text: string) => /[\u0400-\u04FF]/.test(text);

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

const detectLanguage = (text: string): AssistantLanguage =>
  isMongolian(text) || isRomanizedMongolian(text) ? "mn" : "en";

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

const isGreeting = (text: string) => {
  const normalized = normalizeIntentText(text).replace(/[!?.]+$/g, "");

  return /^(?:hi|hello|hey|yo|good morning|good afternoon|good evening|sain uu|sain baina uu|sain bnu|sainuu|sn uu|\u0441\u0430\u0439\u043d \u0443\u0443|\u0441\u0430\u0439\u043d \u0431\u0430\u0439\u043d\u0430 \u0443\u0443)$/.test(
    normalized,
  );
};

const isLoanOverviewQuestion = (text: string) =>
  /(миний\s+(?:loan|loans|зээл|зээлсэн|захиалсан)|өөрийн\s+loans|show\s+my\s+loans|my\s+(?:loans|borrowed books|requested books)|current\s+loans|list\s+my\s+loans|minii\s+(?:loan|loans|zeelsen|zahialsan)|due\s+books)/i.test(
    text,
  );

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
  /(search|find|look for|book by|book about|author|title|genre|catalog|library|ном|зохиолч|гарчиг|hai|ol)/i.test(
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

  if (isGreeting(text)) {
    return false;
  }

  return !/(what|why|how|when|where|who|яагаад|хэзээ|хаана|хэн)/i.test(normalized);
};

const detectAssistantIntent = (text: string): AssistantIntent => {
  const normalized = normalizeAssistantText(text);

  if (!normalized) {
    return { kind: "unknown", query: "" };
  }

  if (isGreeting(text)) {
    return { kind: "greeting", query: "" };
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

const buildCapabilitiesReply = (language: AssistantLanguage) =>
  language === "mn"
    ? [
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
      ].join("\n")
    : [
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

const buildGreetingReply = (language: AssistantLanguage) =>
  language === "mn"
    ? "\u0421\u0430\u0439\u043d \u0443\u0443! \u0411\u0438 Aetheria AI. \u041d\u043e\u043c \u0445\u0430\u0439\u0445, \u0441\u0430\u043d\u0430\u043b \u0431\u043e\u043b\u0433\u043e\u0445, \u0437\u044d\u044d\u043b\u044d\u0445, \u044d\u0441\u0432\u044d\u043b \u0442\u0430\u043d\u044b loans-\u0438\u0439\u0433 \u0445\u0430\u0440\u0430\u0445\u0430\u0434 \u0442\u0443\u0441\u0430\u043b\u0436 \u0447\u0430\u0434\u043d\u0430."
    : "Hi! I am Aetheria AI. I can help you search books, get recommendations, borrow titles, or check your loans.";

const buildSignInReply = (language: AssistantLanguage) =>
  language === "mn"
    ? "Энэ үйлдлийг хийхийн тулд эхлээд нэвтэрнэ үү."
    : "Please sign in first so I can do that for your account.";

const buildBackendUnavailableReply = (language: AssistantLanguage) =>
  language === "mn"
    ? "AI library backend одоогоор бүрэн холбогдохгүй байна. Түр хүлээгээд дахин оролдоно уу."
    : "The AI library backend is not fully available right now. Please try again shortly.";

const formatBookLine = (book: CatalogBook, language: AssistantLanguage) =>
  `• ${book.title} — ${book.author} (${book.genre}, ${book.available_copies}/${book.total_copies} ${
    language === "mn" ? "боломжтой" : "available"
  })`;

const hasReadableContent = (book: CatalogBook) =>
  Boolean(book.is_public_readable) ||
  Boolean(book.reading_content?.some((section) => section.trim().length >= 80));

const scoreBookCandidate = (book: CatalogBook, query: string) => {
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

const pickBestBook = (books: CatalogBook[], query: string) =>
  [...books].sort((left, right) => scoreBookCandidate(right, query) - scoreBookCandidate(left, query))[0] ?? null;

const pickBestLoan = (loans: LoanRow[], query: string) =>
  [...loans].sort((left, right) => scoreBookCandidate(right.book, query) - scoreBookCandidate(left.book, query))[0] ?? null;

const buildSearchReply = (query: string, books: CatalogBook[], language: AssistantLanguage) => {
  if (!books.length) {
    return language === "mn"
      ? `Каталогоос "${query}"-тэй ойролцоо ном олдсонгүй. Гарчиг, зохиолч, эсвэл сэдвээр нь арай өөрөөр асуугаад үзээрэй.`
      : `I could not find a catalog match for "${query}". Try another title, author, or topic.`;
  }

  return [
    language === "mn"
      ? `Каталогоос "${query}"-д тохирох дараах номуудыг оллоо:`
      : `I found these catalog matches for "${query}":`,
    ...books.map((book) => formatBookLine(book, language)),
    language === "mn"
      ? 'Хүсвэл "зээлэх <номын нэр>" эсвэл "захиалах <номын нэр>" гэж үргэлжлүүлж болно.'
      : 'If you want one, say "borrow <title>" or "request <title>".',
  ].join("\n");
};

const buildLoansReply = (loans: LoanRow[], language: AssistantLanguage) => {
  if (!loans.length) {
    return language === "mn"
      ? "Танд одоогоор идэвхтэй эсвэл захиалсан ном алга."
      : "You do not have any active or requested books right now.";
  }

  return [
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
            ? ` • буцаах: ${new Date(loan.due_date).toLocaleDateString("mn-MN")}`
            : ` • due: ${new Date(loan.due_date).toLocaleDateString("en-US")}`
          : "";

      return `• ${loan.book.title} — ${loan.book.author} (${statusLabel}${duePart})`;
    }),
  ].join("\n");
};

const buildActionErrorReply = (error: unknown, language: AssistantLanguage) => {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

  if (STALE_AUTH_SESSION_PATTERN.test(message)) {
    return language === "mn"
      ? "Таны session хуучирсан байна. Дахин нэвтэрч ороод оролдоно уу."
      : "Your session has expired. Please sign in again and try once more.";
  }

  if (/Not authenticated/i.test(message)) {
    return buildSignInReply(language);
  }

  if (/No copies available/i.test(message)) {
    return language === "mn"
      ? "Энэ номын боломжит хувь дууссан байна."
      : "There are no available copies for this book right now.";
  }

  if (/Book is currently available/i.test(message)) {
    return language === "mn"
      ? "Энэ ном одоогоор боломжтой байна. Шууд зээлж болно."
      : "This book is available right now, so it can be borrowed directly.";
  }

  if (/already borrowed/i.test(message)) {
    return language === "mn"
      ? "Та энэ номыг аль хэдийн идэвхтэй зээлсэн байна."
      : "You already have this book borrowed.";
  }

  if (/already requested/i.test(message)) {
    return language === "mn"
      ? "Та энэ номыг аль хэдийн захиалсан байна."
      : "You already requested this book.";
  }

  if (/Loan not found/i.test(message)) {
    return language === "mn"
      ? "Зээлийн мэдээлэл олдсонгүй."
      : "I could not find that loan.";
  }

  if (/Book not found/i.test(message)) {
    return language === "mn"
      ? "Номын мэдээлэл олдсонгүй."
      : "I could not find that book.";
  }

  if (/Could not find the function public\.(borrow_book|request_book|return_book)/i.test(message)) {
    return language === "mn"
      ? "Backend migration дутуу байна. Supabase migration-уудаа apply хийсний дараа дахин оролдоно уу."
      : "The backend migrations are out of date. Apply the latest Supabase migrations and try again.";
  }

  return language === "mn" ? `Алдаа гарлаа: ${message}` : `I ran into an error: ${message}`;
};

const getSupabaseClients = (req: Request) => {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRole = getEnv("SUPABASE_SECRET_KEY") ?? getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = getEnv("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRole) {
    throw new Error(
      "Chat function is missing required Supabase secrets. Set SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceClient = createClient(supabaseUrl, serviceRole);
  const userClient = anonKey
    ? createClient(supabaseUrl, anonKey, {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
      })
    : null;

  return { supabaseUrl, serviceClient, userClient };
};

const getAuthenticatedUser = async (userClient: SupabaseClient | null) => {
  if (!userClient) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
};

const fetchLoans = async ({
  userClient,
  userId,
  statuses,
  limit,
}: {
  userClient: SupabaseClient;
  userId: string;
  statuses: LoanStatus[];
  limit: number;
}) => {
  let query = userClient
    .from("loans")
    .select("id, status, due_date, book:books(*)")
    .eq("user_id", userId)
    .order("loaned_at", { ascending: false });

  if (statuses.length === 1) {
    query = query.eq("status", statuses[0]);
  } else if (statuses.length > 1) {
    query = query.in("status", statuses);
  }

  if (limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as LoanRow[];
};

const fetchRecommendationGenres = async ({
  userClient,
  user,
}: {
  userClient: SupabaseClient | null;
  user: User | null;
}) => {
  const genreSet = new Set<string>();

  if (!userClient || !user) {
    return genreSet;
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("preferred_genres")
    .eq("id", user.id)
    .maybeSingle();

  for (const genre of ((profile as ProfileRow | null)?.preferred_genres ?? [])) {
    const normalized = genre?.trim();

    if (normalized) {
      genreSet.add(normalized);
    }
  }

  const { data: loans } = await userClient
    .from("loans")
    .select("book:books(genre)")
    .eq("user_id", user.id)
    .limit(20);

  for (const loan of (loans ?? []) as Array<{ book: { genre: string | null } | null }>) {
    const genre = loan.book?.genre?.trim();

    if (genre) {
      genreSet.add(genre);
    }
  }

  return genreSet;
};

const fetchChatProfile = async ({
  userClient,
  user,
}: {
  userClient: SupabaseClient | null;
  user: User | null;
}) => {
  if (!userClient || !user) {
    return null;
  }

  const { data, error } = await userClient
    .from("profiles")
    .select("display_name, preferred_genres")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("chat profile context load failed", error);
    return null;
  }

  return (data ?? null) as ProfileRow | null;
};

const buildUserContextMessage = ({
  profile,
  loans,
}: {
  profile: ProfileRow | null;
  loans: LoanRow[];
}) => {
  if (!profile && !loans.length) {
    return "";
  }

  const lines = ["Authenticated reader context:"];

  if (profile?.display_name?.trim()) {
    lines.push(`- Reader display name: ${profile.display_name.trim()}`);
  }

  const preferredGenres = (profile?.preferred_genres ?? [])
    .map((genre) => genre?.trim())
    .filter((genre): genre is string => Boolean(genre));

  if (preferredGenres.length) {
    lines.push(`- Preferred genres: ${preferredGenres.slice(0, 6).join(", ")}`);
  }

  if (loans.length) {
    lines.push("- Current loans:");
    lines.push(
      ...loans.slice(0, 6).map((loan) => {
        const duePart = loan.status === "active" ? `, due ${new Date(loan.due_date).toLocaleDateString("en-US")}` : "";
        return `  * ${loan.book.title} — ${loan.book.author} (${loan.status}${duePart})`;
      }),
    );
  }

  return lines.join("\n");
};

const buildCatalogContextMessage = (books: CatalogBook[]) => {
  if (!books.length) {
    return "";
  }

  return "Relevant catalog context:\n" +
    books
      .slice(0, 8)
      .map((book, index) => {
        const readerState = hasReadableContent(book) ? "readable on site" : "borrow/request only";
        return `${index + 1}. "${book.title}" — ${book.author} [${book.genre}, ${book.language}] (${book.available_copies}/${book.total_copies} available, ${readerState})\n   ${book.description}`;
      })
      .join("\n");
};

const buildRecommendationReply = async ({
  serviceClient,
  userClient,
  user,
  language,
  query,
  openAiApiKey,
  openAiBaseUrl,
  openAiQueryModel,
  lovableApiKey,
}: {
  serviceClient: SupabaseClient;
  userClient: SupabaseClient | null;
  user: User | null;
  language: AssistantLanguage;
  query: string;
  openAiApiKey?: string | null;
  openAiBaseUrl?: string | null;
  openAiQueryModel?: string | null;
  lovableApiKey?: string | null;
}) => {
  if (query) {
    const books = await searchCatalogBooks({
      supabase: serviceClient,
      query,
      openAiApiKey,
      openAiBaseUrl,
      openAiQueryModel,
      lovableApiKey,
      limit: 4,
    });

    if (!books.length) {
      return language === "mn"
        ? `"${query}" чиглэлээр санал болгох ном олдсонгүй. Өөр genre эсвэл сэдэв хэлээд үзээрэй.`
        : `I could not find a recommendation set for "${query}". Try another genre or topic.`;
    }

    return [
      language === "mn"
        ? `"${query}" чиглэлээр танд тохирох номууд:`
        : `Here are a few books for "${query}":`,
      ...books.map((book) => formatBookLine(book, language)),
    ].join("\n");
  }

  const preferredGenres = await fetchRecommendationGenres({ userClient, user });
  const genres = Array.from(preferredGenres);

  const { data, error } = await serviceClient
    .from("books")
    .select("*")
    .gt("available_copies", 0)
    .limit(80);

  if (error) {
    throw error;
  }

  const books = ((data ?? []) as CatalogBook[])
    .map((book) => ({
      book,
      score: (genres.includes(book.genre) ? 100 : 0) + book.available_copies,
    }))
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.book)
    .slice(0, 4);

  if (!books.length) {
    return language === "mn"
      ? "Одоогоор recommendation гаргахад хангалттай catalog data алга."
      : "There is not enough catalog data to build recommendations right now.";
  }

  return [
    genres.length
      ? language === "mn"
        ? `Таны сонирхдог genre дээр тулгуурласан санал: ${genres.slice(0, 3).join(", ")}`
        : `Recommendations shaped by your genres: ${genres.slice(0, 3).join(", ")}`
      : language === "mn"
        ? "Одоогийн каталогоос санал болгож болох номууд:"
        : "Here are a few books from the current catalog:",
    ...books.map((book) => formatBookLine(book, language)),
  ].join("\n");
};

const buildHandledReply = async ({
  intent,
  language,
  serviceClient,
  userClient,
  user,
  openAiApiKey,
  openAiBaseUrl,
  openAiQueryModel,
  lovableApiKey,
}: {
  intent: AssistantIntent;
  language: AssistantLanguage;
  serviceClient: SupabaseClient;
  userClient: SupabaseClient | null;
  user: User | null;
  openAiApiKey?: string | null;
  openAiBaseUrl?: string | null;
  openAiQueryModel?: string | null;
  lovableApiKey?: string | null;
}) => {
  switch (intent.kind) {
    case "greeting":
      return buildGreetingReply(language);
    case "capabilities":
      return buildCapabilitiesReply(language);
    case "search": {
      const books = await searchCatalogBooks({
        supabase: serviceClient,
        query: intent.query,
        openAiApiKey,
        openAiBaseUrl,
        openAiQueryModel,
        lovableApiKey,
        limit: 4,
      });
      return buildSearchReply(intent.query, books, language);
    }
    case "loans": {
      if (!userClient || !user) {
        return buildSignInReply(language);
      }

      const loans = await fetchLoans({
        userClient,
        userId: user.id,
        statuses: ["active", "requested"],
        limit: 8,
      });
      return buildLoansReply(loans, language);
    }
    case "recommend":
      return await buildRecommendationReply({
        serviceClient,
        userClient,
        user,
        language,
        query: intent.query,
        openAiApiKey,
        openAiBaseUrl,
        openAiQueryModel,
        lovableApiKey,
      });
    case "borrow":
    case "request": {
      if (!userClient || !user) {
        return buildSignInReply(language);
      }

      if (!intent.query) {
        return language === "mn"
          ? `Ямар ном ${intent.kind === "borrow" ? "зээлэх" : "захиалах"} гэж байгаагаа нэрээр нь хэлээрэй.`
          : `Tell me which title you want to ${intent.kind}.`;
      }

      const books = await searchCatalogBooks({
        supabase: serviceClient,
        query: intent.query,
        openAiApiKey,
        openAiBaseUrl,
        openAiQueryModel,
        lovableApiKey,
        limit: 5,
      });
      const book = pickBestBook(books, intent.query);

      if (!book) {
        return language === "mn"
          ? `"${intent.query}" нэртэй ном каталогоос олдсонгүй.`
          : `I could not find "${intent.query}" in the catalog.`;
      }

      if (hasReadableContent(book)) {
        return language === "mn"
          ? `"${book.title}" нь site дээр шууд уншигддаг ном байна. Card дээрээс нь "Read on site" гэж нээгээд үргэлжлүүлж болно.`
          : `"${book.title}" is already available to read on site. You can open it directly from the catalog card.`;
      }

      const actualKind = book.available_copies > 0 ? "borrow" : "request";
      const rpcName = actualKind === "borrow" ? "borrow_book" : "request_book";
      const { error } = await userClient.rpc(rpcName, { p_book_id: book.id });

      if (error) {
        return buildActionErrorReply(error, language);
      }

      if (actualKind === "borrow") {
        return intent.kind === "request"
          ? language === "mn"
            ? `"${book.title}" одоо боломжтой байсан тул танд шууд зээллээ.`
            : `"${book.title}" was available, so I borrowed it for you right away.`
          : language === "mn"
            ? `"${book.title}" амжилттай зээлэгдлээ.`
            : `"${book.title}" has been borrowed successfully.`;
      }

      return intent.kind === "borrow"
        ? language === "mn"
          ? `"${book.title}" одоогоор боломжгүй тул захиалга болгон бүртгэлээ.`
          : `"${book.title}" is not available right now, so I placed a request instead.`
        : language === "mn"
          ? `"${book.title}" захиалгад орлоо. Боломжтой болмогц идэвхжинэ.`
          : `"${book.title}" has been requested and will activate when it becomes available.`;
    }
    case "return": {
      if (!userClient || !user) {
        return buildSignInReply(language);
      }

      const loans = await fetchLoans({
        userClient,
        userId: user.id,
        statuses: ["active"],
        limit: 20,
      });

      if (!loans.length) {
        return language === "mn"
          ? "Буцаах идэвхтэй ном алга."
          : "You do not have any active books to return.";
      }

      if (!intent.query && loans.length > 1) {
        return [
          language === "mn"
            ? "Ямар ном буцаахаа тодруулна уу. Одоогоор танд эдгээр идэвхтэй номууд байна:"
            : "Tell me which title to return. These are your current active books:",
          ...loans.slice(0, 5).map((loan) => `• ${loan.book.title} — ${loan.book.author}`),
        ].join("\n");
      }

      const loan = intent.query ? pickBestLoan(loans, intent.query) : loans[0];

      if (!loan) {
        return language === "mn"
          ? `"${intent.query}" нэртэй идэвхтэй зээл олдсонгүй.`
          : `I could not find an active loan for "${intent.query}".`;
      }

      const { error } = await userClient.rpc("return_book", { p_loan_id: loan.id });

      if (error) {
        return buildActionErrorReply(error, language);
      }

      return language === "mn"
        ? `"${loan.book.title}" амжилттай буцаагдлаа.`
        : `"${loan.book.title}" has been returned successfully.`;
    }
    case "unknown":
    default:
      return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = getEnv("LOVABLE_API_KEY");
    const openAiApiKey = getEnv("OPENAI_API_KEY");
    const openAiBaseUrl = getEnv("OPENAI_BASE_URL") ?? DEFAULT_OPENAI_BASE_URL;
    const openAiChatModel = getEnv("OPENAI_CHAT_MODEL") ?? DEFAULT_OPENAI_CHAT_MODEL;
    const openAiQueryModel = getEnv("OPENAI_QUERY_MODEL") ?? getEnv("OPENAI_CHAT_MODEL") ?? DEFAULT_OPENAI_QUERY_MODEL;
    const { serviceClient, userClient } = getSupabaseClients(req);
    const user = await getAuthenticatedUser(userClient);
    const { messages } = await req.json() as { messages: ChatMessage[] };
    const lastUser = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
    const language = detectLanguage(lastUser);
    const intent = detectAssistantIntent(lastUser);

    if (intent.kind !== "unknown") {
      try {
        const reply = await buildHandledReply({
          intent,
          language,
          serviceClient,
          userClient,
          user,
          openAiApiKey,
          openAiBaseUrl,
          openAiQueryModel,
          lovableApiKey,
        });

        if (reply) {
          return jsonResponse({ reply });
        }
      } catch (error) {
        console.error("chat capability error", error);
        return jsonResponse({ reply: buildActionErrorReply(error, language) });
      }
    }

    if (!openAiApiKey && !lovableApiKey) {
      return jsonResponse({ reply: buildBackendUnavailableReply(language) });
    }

    let catalogContext = "";
    let userContext = "";

    try {
      const books = await searchCatalogBooks({
        supabase: serviceClient,
        query: lastUser,
        openAiApiKey,
        openAiBaseUrl,
        openAiQueryModel,
        lovableApiKey,
        limit: 8,
      });

      catalogContext = buildCatalogContextMessage(books);
    } catch (error) {
      console.warn("context build failed", error);
    }

    try {
      const profile = await fetchChatProfile({ userClient, user });
      const loans =
        userClient && user
          ? await fetchLoans({
              userClient,
              userId: user.id,
              statuses: ["active", "requested"],
              limit: 6,
            })
          : [];
      userContext = buildUserContextMessage({ profile, loans });
    } catch (error) {
      console.warn("user context build failed", error);
    }

    const systemMessages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];

    if (userContext) {
      systemMessages.push({ role: "system", content: userContext });
    }

    if (catalogContext) {
      systemMessages.push({ role: "system", content: catalogContext });
    }

    const response = openAiApiKey
      ? await fetch(`${normalizeBaseUrl(openAiBaseUrl)}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: openAiChatModel,
            messages: [...systemMessages, ...messages],
            temperature: 0.55,
            stream: true,
          }),
        })
      : await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [...systemMessages, ...messages],
            stream: true,
          }),
        });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse(
          { error: "Too many requests were sent to the AI service. Please try again shortly." },
          { status: 429 },
        );
      }

      if (response.status === 402) {
        return jsonResponse({ error: "AI credit is currently unavailable." }, { status: 402 });
      }

      const text = await response.text();
      console.error(openAiApiKey ? "OpenAI error:" : "AI gateway error:", response.status, text);

      return jsonResponse({ error: "The AI service returned an error." }, { status: 500 });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("chat error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
});
