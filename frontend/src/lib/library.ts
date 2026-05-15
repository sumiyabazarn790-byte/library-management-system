import { supabase } from "@/integrations/supabase/client";
import {
  getSupabaseUnavailableReason,
  isLoopbackSupabaseUrl,
} from "@/integrations/supabase/availability";
import { fallbackBooks } from "@/lib/fallbackBooks";
import {
  getPublicDomainDownloadApiPath as resolvePublicDomainDownloadApiPath,
  getPublicDomainReaderUrl as resolvePublicDomainReaderUrl,
  getPublicDomainTextApiPath as resolvePublicDomainTextApiPath,
  hasPublicDomainSource as resolveHasPublicDomainSource,
} from "@/lib/publicDomainBooks";
import type {
  Book,
  LoanStatus,
  LoanWithBook,
  SaleListing,
  SaleListingStatus,
  SavedBookWithBook,
} from "@/types/library";

type FetchLoansOptions = {
  statuses?: LoanStatus[];
  limit?: number;
};

type CreateSaleListingInput = {
  bookId: string;
  price: number;
  note?: string;
};

type LoanGenreRow = {
  book: {
    genre: string | null;
  } | null;
};

const LOAN_STATUS_PRIORITY: Record<LoanStatus, number> = {
  active: 3,
  requested: 2,
  returned: 1,
  cancelled: 0,
};

export const saleListingsFeatureEnabled = process.env.NEXT_PUBLIC_ENABLE_SALE_LISTINGS === "true";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value: string | null | undefined) =>
  Boolean(value && UUID_PATTERN.test(value.trim()));

const recoverableLibraryErrorCodes = new Set(["42P01", "42501", "42703", "42804", "42883"]);

const recoverableLibraryErrorPatterns = [
  /Local Supabase backend is not running/i,
  /Failed to fetch/i,
  /fetch failed/i,
  /network/i,
  /relation .*books/i,
  /Could not find the table ['"]public\.books['"]/i,
  /column .*is_public_readable/i,
  /column .*reading_content/i,
  /column .*borrow_price/i,
  /column .*borrow_currency/i,
  /column .*created_at/i,
  /search_books_fuzzy/i,
  /Could not find the function public\.search_books_fuzzy/i,
  /permission denied/i,
  /insufficient privilege/i,
  /row-level security/i,
  /structure of query does not match function result type/i,
  /returned record type does not match expected/i,
  /relation .*saved_books/i,
  /Could not find the table ['"]public\.saved_books['"]/i,
];

const isRecoverableLibraryError = (error: unknown) => {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code.toUpperCase()
      : null;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return Boolean(code && recoverableLibraryErrorCodes.has(code)) ||
    recoverableLibraryErrorPatterns.some((pattern) => pattern.test(message));
};

const READER_PLACEHOLDER_PATTERNS = [
  /^chapter\s+\d+/i,
  /^entry\s+\d+/i,
  /^part\s+\d+/i,
  /^introduction$/i,
  /^this is the opening chapter/i,
  /^\d+-Ñ€ Ð±Ò¯Ð»ÑÐ³/i,
];

const hasSubstantiveReadingContent = (book: Pick<Book, "reading_content">) =>
  Boolean(
    book.reading_content?.some((section) => {
      const trimmed = section.trim();
      return trimmed.length >= 80 && !READER_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
    }),
  );

const isReadableBook = (book: Pick<Book, "title" | "author" | "reading_content">) =>
  hasSubstantiveReadingContent(book) || resolveHasPublicDomainSource(book);

const filterReadableBooks = <T extends Pick<Book, "title" | "author" | "reading_content">>(books: T[]) =>
  books.filter((book) => isReadableBook(book));

const filterFallbackBooks = (query: string, limit: number, publicOnly = false) => {
  const normalized = query.trim().toLowerCase();
  const readableFallbackBooks = filterReadableBooks(fallbackBooks);
  const source = publicOnly ? readableFallbackBooks : readableFallbackBooks;

  if (!normalized) {
    return source.slice(0, limit);
  }

  return source
    .filter((book) =>
      [book.title, book.author, book.genre, book.description].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    )
    .slice(0, limit);
};

const filterFallbackBooksByGenres = (genres: string[], limit: number) => {
  const normalizedGenres = new Set(
    genres
      .map((genre) => genre.trim().toLowerCase())
      .filter(Boolean),
  );

  if (!normalizedGenres.size) {
    return filterFallbackBooks("", limit);
  }

  return filterReadableBooks(fallbackBooks)
    .filter((book) => normalizedGenres.has(book.genre.trim().toLowerCase()))
    .slice(0, limit);
};

const findFallbackBookById = (bookId: string) =>
  filterReadableBooks(fallbackBooks).find((book) => book.id === bookId) ?? null;

const mergeBooks = (primary: Book[], secondary: Book[], limit: number) => {
  const seen = new Set<string>();
  const merged: Book[] = [];

  for (const book of [...primary, ...secondary]) {
    const key = `${book.title.trim().toLowerCase()}::${book.author.trim().toLowerCase()}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(book);

    if (merged.length >= limit) {
      break;
    }
  }

  return merged;
};

const shouldPreferFallbackData = () => Boolean(getSupabaseUnavailableReason());

export const searchBooks = async (query: string, limit = 16): Promise<Book[]> => {
  const normalized = query.trim();

  if (shouldPreferFallbackData()) {
    return filterFallbackBooks(normalized, limit);
  }

  if (!normalized) {
    try {
      const queryLimit = Math.max(limit * 3, 24);
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(queryLimit);

      if (error) throw error;

      const books = (data ?? []) as Book[];
      return filterReadableBooks(books).slice(0, limit);
    } catch (error) {
      if (isRecoverableLibraryError(error)) {
        return filterFallbackBooks(normalized, limit);
      }

      throw error;
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke("search-books", {
      body: { query: normalized, limit },
    });

    if (!error && Array.isArray(data?.results)) {
      return filterReadableBooks(data.results as Book[]).slice(0, limit);
    }
  } catch (error) {
    console.warn("search-books edge function unavailable, falling back to direct search", error);
  }

  try {
    const { data, error } = await supabase.rpc("search_books_fuzzy", {
      q: normalized,
      lim: limit,
    });

    if (error) throw error;

    const books = (data ?? []) as Book[];
    return filterReadableBooks(books).slice(0, limit);
  } catch (error) {
    if (isRecoverableLibraryError(error)) {
      return filterFallbackBooks(normalized, limit);
    }

    throw error;
  }
};

export const fetchLoans = async (
  userId: string,
  options: FetchLoansOptions = {},
): Promise<LoanWithBook[]> => {
  let query = supabase
    .from("loans")
    .select("*, book:books(*)")
    .eq("user_id", userId)
    .order("loaned_at", { ascending: false });

  if (options.statuses?.length === 1) {
    query = query.eq("status", options.statuses[0]);
  } else if (options.statuses?.length) {
    query = query.in("status", options.statuses);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as unknown as LoanWithBook[];
};

export const fetchLoanStatusesByBookIds = async (
  userId: string,
  bookIds: string[],
): Promise<Record<string, LoanStatus>> => {
  const uniqueBookIds = Array.from(new Set(bookIds.filter(isUuid)));

  if (!uniqueBookIds.length) {
    return {};
  }

  const { data, error } = await supabase
    .from("loans")
    .select("book_id, status")
    .eq("user_id", userId)
    .in("book_id", uniqueBookIds)
    .in("status", ["active", "requested", "returned", "cancelled"]);

  if (error) throw error;

  const loanStateByBookId: Record<string, LoanStatus> = {};

  for (const row of (data ?? []) as Array<{ book_id: string; status: LoanStatus }>) {
    const current = loanStateByBookId[row.book_id];

    if (!current || LOAN_STATUS_PRIORITY[row.status] > LOAN_STATUS_PRIORITY[current]) {
      loanStateByBookId[row.book_id] = row.status;
    }
  }

  return loanStateByBookId;
};

export const fetchPublicReadableBooks = async (limit = 8): Promise<Book[]> => {
  if (shouldPreferFallbackData()) {
    return filterFallbackBooks("", limit, true);
  }

  try {
    const queryLimit = Math.max(limit * 3, 24);
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .or("is_public_readable.eq.true,reading_content.not.is.null")
      .order("created_at", { ascending: false })
      .limit(queryLimit);

    if (error) throw error;

    const books = ((data ?? []) as Book[]).filter((book) => canReadBookNow(book));
    return mergeBooks(books, filterFallbackBooks("", limit, true), limit);
  } catch (error) {
    if (isRecoverableLibraryError(error)) {
      return filterFallbackBooks("", limit, true);
    }

    throw error;
  }
};

export const fetchBookById = async (bookId: string): Promise<Book | null> => {
  const normalizedBookId = decodeURIComponent(bookId.trim());

  if (!normalizedBookId) {
    return null;
  }

  const fallbackBook = findFallbackBookById(normalizedBookId);

  if (fallbackBook) {
    return fallbackBook;
  }

  if (!isUuid(normalizedBookId) || shouldPreferFallbackData()) {
    return null;
  }

  try {
    const { data, error } = await supabase.from("books").select("*").eq("id", normalizedBookId).maybeSingle();

    if (error) throw error;

    const book = (data as Book | null) ?? null;
    return book && isReadableBook(book) ? book : null;
  } catch (error) {
    if (isRecoverableLibraryError(error)) {
      return fallbackBook;
    }

    throw error;
  }
};

export const fetchSavedStatusesByBookIds = async (
  userId: string,
  bookIds: string[],
): Promise<Record<string, boolean>> => {
  const uniqueBookIds = Array.from(new Set(bookIds.filter(isUuid)));

  if (!uniqueBookIds.length || shouldPreferFallbackData()) {
    return {};
  }

  try {
    const { data, error } = await supabase
      .from("saved_books")
      .select("book_id")
      .eq("user_id", userId)
      .in("book_id", uniqueBookIds);

    if (error) throw error;

    return Object.fromEntries(((data ?? []) as Array<{ book_id: string }>).map((row) => [row.book_id, true]));
  } catch (error) {
    if (isRecoverableLibraryError(error)) {
      return {};
    }

    throw error;
  }
};

export const fetchSavedBooks = async (userId: string, limit = 8): Promise<SavedBookWithBook[]> => {
  if (shouldPreferFallbackData()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("saved_books")
      .select("*, book:books(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []) as unknown as SavedBookWithBook[];
  } catch (error) {
    if (isRecoverableLibraryError(error)) {
      return [];
    }

    throw error;
  }
};

export type RecommendedBooksResult = {
  books: Book[];
  genres: string[];
};

export const fetchRecommendedBooks = async ({
  userId,
  preferredGenres,
  limit = 4,
}: {
  userId?: string | null;
  preferredGenres?: string[] | null;
  limit?: number;
} = {}): Promise<RecommendedBooksResult> => {
  const safeLimit = Math.max(1, limit);
  const mergedGenres = new Set(
    (preferredGenres ?? [])
      .map((genre) => genre?.trim())
      .filter((genre): genre is string => Boolean(genre)),
  );

  if (shouldPreferFallbackData()) {
    return {
      books: filterFallbackBooksByGenres(Array.from(mergedGenres), safeLimit),
      genres: Array.from(mergedGenres),
    };
  }

  try {
    if (userId) {
      if (!mergedGenres.size) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("preferred_genres")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) throw profileError;

        for (const genre of profile?.preferred_genres ?? []) {
          const normalized = genre?.trim();
          if (normalized) {
            mergedGenres.add(normalized);
          }
        }
      }

      const { data: loans, error: loansError } = await supabase
        .from("loans")
        .select("book:books(genre)")
        .eq("user_id", userId)
        .limit(20);

      if (loansError) throw loansError;

      for (const loan of (loans ?? []) as LoanGenreRow[]) {
        const genre = loan.book?.genre?.trim();
        if (genre) {
          mergedGenres.add(genre);
        }
      }
    }

    let query = supabase
      .from("books")
      .select("*")
      .gt("available_copies", 0)
      .limit(Math.max(safeLimit * 2, 8));

    const genres = Array.from(mergedGenres);

    if (genres.length) {
      query = query.in("genre", genres);
    }

    const { data, error } = await query;
    if (error) throw error;

    const books = filterReadableBooks([ ...((data ?? []) as Book[]) ]);

    if (books.length < Math.min(4, safeLimit)) {
      const { data: extra, error: extraError } = await supabase
        .from("books")
        .select("*")
        .gt("available_copies", 0)
        .limit(Math.max(safeLimit * 2, 8));

      if (extraError) throw extraError;

      const merged = mergeBooks(books, filterReadableBooks((extra ?? []) as Book[]), safeLimit);
      return { books: merged, genres };
    }

    return { books: books.slice(0, safeLimit), genres };
  } catch (error) {
    if (isRecoverableLibraryError(error)) {
      return {
        books: filterFallbackBooksByGenres(Array.from(mergedGenres), safeLimit),
        genres: Array.from(mergedGenres),
      };
    }

    throw error;
  }
};

export const fetchSaleListings = async (
  userId: string,
  statuses: SaleListingStatus[] = ["active"],
): Promise<SaleListing[]> => {
  if (!saleListingsFeatureEnabled) {
    return [];
  }

  let query = supabase
    .from("sale_listings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (statuses.length === 1) {
    query = query.eq("status", statuses[0]);
  } else if (statuses.length) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query;
  if (error) {
    if (
      error.code === "42P01" ||
      /relation .*sale_listings/i.test(error.message) ||
      /Could not find the table ['"]public\.sale_listings['"]/i.test(error.message)
    ) {
      return [];
    }

    throw error;
  }

  return (data ?? []) as SaleListing[];
};

export const createSaleListing = async ({
  bookId,
  price,
  note,
}: CreateSaleListingInput): Promise<SaleListing> => {
  if (!saleListingsFeatureEnabled) {
    throw new Error("Sale listings feature is disabled");
  }

  const { data, error } = await supabase.rpc("sell_book", {
    p_book_id: bookId,
    p_price: price,
    p_note: note?.trim() || undefined,
  });

  if (error) throw error;
  return data as SaleListing;
};

export const saveBookForUser = async (userId: string, book: Pick<Book, "id" | "title" | "author">) => {
  const canonicalBookId = await resolveBookId(book);
  const { error } = await supabase
    .from("saved_books")
    .upsert({ user_id: userId, book_id: canonicalBookId }, { onConflict: "user_id,book_id" });

  if (error) throw error;
};

export const removeSavedBookForUser = async (userId: string, book: Pick<Book, "id" | "title" | "author">) => {
  const canonicalBookId = await resolveBookId(book);
  const { error } = await supabase
    .from("saved_books")
    .delete()
    .eq("user_id", userId)
    .eq("book_id", canonicalBookId);

  if (error) throw error;
};

export const resolveBookId = async (book: Pick<Book, "id" | "title" | "author">) => {
  const unavailableReason = getSupabaseUnavailableReason();
  if (unavailableReason) {
    throw new Error(unavailableReason);
  }

  if (isUuid(book.id)) {
    return book.id;
  }

  const trimmedTitle = book.title.trim();
  const trimmedAuthor = book.author.trim();

  let query = supabase.from("books").select("id, title, author").eq("title", trimmedTitle).limit(8);

  if (trimmedAuthor) {
    query = query.eq("author", trimmedAuthor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const exactMatch = (data ?? []).find((candidate) => isUuid(candidate.id));
  if (exactMatch?.id) {
    return exactMatch.id;
  }

  const { data: fuzzyMatches, error: fuzzyError } = await supabase.rpc("search_books_fuzzy", {
    q: trimmedTitle,
    lim: 8,
  });

  if (fuzzyError) throw fuzzyError;

  const fuzzyCandidate = ((fuzzyMatches ?? []) as Book[]).find(
    (candidate) =>
      isUuid(candidate.id) &&
      candidate.title.trim().toLowerCase() === trimmedTitle.toLowerCase() &&
      (!trimmedAuthor || candidate.author.trim().toLowerCase() === trimmedAuthor.toLowerCase()),
  );

  if (fuzzyCandidate?.id) {
    return fuzzyCandidate.id;
  }

  const firstValidCandidate = ((fuzzyMatches ?? []) as Book[]).find((candidate) => isUuid(candidate.id));
  if (firstValidCandidate?.id) {
    return firstValidCandidate.id;
  }

  throw new Error(`Could not resolve canonical book id for "${book.title}"`);
};

export const formatLibraryDate = (value: string | Date) =>
  new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value instanceof Date ? value : new Date(value));

export const getBorrowPrice = (book: Pick<Book, "borrow_price" | "is_public_readable">) => {
  const fallbackPrice = book.is_public_readable ? 0 : 3500;
  const resolvedPrice = Number(book.borrow_price ?? fallbackPrice);

  if (!Number.isFinite(resolvedPrice)) {
    return fallbackPrice;
  }

  return Math.max(0, resolvedPrice);
};

export const getBorrowCurrency = (book: Pick<Book, "borrow_currency">) => {
  const normalizedCurrency = book.borrow_currency?.trim().toUpperCase();
  return normalizedCurrency || "MNT";
};

export const formatLibraryMoney = (amount: number, currency: string) => {
  const hasFraction = Math.abs(amount % 1) > Number.EPSILON;

  return `${new Intl.NumberFormat("mn-MN", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(amount)} ${currency}`;
};

export const requiresBorrowPayment = (_book: Pick<Book, "borrow_price" | "is_public_readable">) =>
  false;

export const hasReadingContent = (book: Pick<Book, "reading_content">) =>
  hasSubstantiveReadingContent(book);

export const canReadBookNow = (book: Pick<Book, "title" | "author" | "reading_content">) =>
  isReadableBook(book);

export const buildReadingSections = (book: Book) => {
  if (book.reading_content?.length) {
    return book.reading_content;
  }

  const localizedSummary = book.description.trim() ||
    "Энэ бүтээлийн metadata одоогоор товч байгаа ч үндсэн санаа нь судалгааны уншлагад чиглэсэн.";
  const localizedLanguageLabel = book.language === "mn" ? "монгол" : "англи";
  const localizedSections = [
    `${book.title} бол ${book.genre.toLowerCase()} чиглэлийн ${localizedLanguageLabel} хэл дээрх бүтээл юм. ${localizedSummary}`,
    `${book.author}-ын энэ бүтээлд уншигч тухайн сэдвийн үндсэн ухагдахуун, түүхэн нөхцөл, мөн архивын үнэ цэнийг нэг дороос харах боломжтой. Reader preview нь бүтээлийн агуулгад орохын өмнөх чиглүүлэгч танилцуулга болж өгнө.`,
    "Хэрэв та энэ номыг цааш үргэлжлүүлэн судлах бол AI туслах дээрээс ижил төрлийн ном, тухайн genre-ийн бусад бүтээл, эсвэл гол санааг илүү энгийнээр тайлбарлуулж болно.",
  ];

  if (localizedSections.length) {
    return localizedSections;
  }

  const languageLabel = book.language === "mn" ? "монгол" : "англи";
  const summary =
    book.description.trim() ||
    "Энэ бүтээлийн metadata одоогоор товч байгаа ч үндсэн санаа нь судалгааны уншлагад чиглэсэн.";

  return [
    `${book.title} бол ${book.genre.toLowerCase()} чиглэлийн ${languageLabel} хэл дээрх бүтээл юм. ${summary}`,
    `${book.author}-ын энэ бүтээлд уншигч тухайн сэдвийн үндсэн ухагдахуун, түүхэн нөхцөл, мөн архивын үнэ цэнийг нэг дороос харах боломжтой. Reader preview нь бүтээлийн агуулгад орохын өмнөх чиглүүлэгч танилцуулга болж өгнө.`,
    `Хэрэв та энэ номыг цааш үргэлжлүүлэн судлах бол AI туслах дээрээс ижил төрлийн ном, тухайн genre-ийн бусад бүтээл, эсвэл гол санааг илүү энгийнээр тайлбарлуулж болно.`,
  ];
};

export const getPublicDomainReaderUrl = (book: Pick<Book, "title" | "author">) => {
  return resolvePublicDomainReaderUrl(book);
};

export const getBookReaderPath = (book: Pick<Book, "id">) => `/reader/${encodeURIComponent(book.id)}`;

export const hasPublicDomainTextSource = (book: Pick<Book, "title" | "author">) =>
  resolveHasPublicDomainSource(book);

export const getPublicDomainTextApiPath = (
  book: Pick<Book, "title" | "author">,
  options?: {
    language?: "original" | "mn";
  },
) => resolvePublicDomainTextApiPath(book, options);

export const hasBookDownloadSource = (book: Pick<Book, "title" | "author">) =>
  resolveHasPublicDomainSource(book);

export const getBookDownloadApiPath = (book: Pick<Book, "id">) =>
  resolvePublicDomainDownloadApiPath(book);

export const toFriendlyLibraryError = (message: string) => {
  if (/Local Supabase backend is not running/i.test(message)) return message;
  if (/loans_user_id_fkey|violates foreign key constraint ["']loans_user_id_fkey["']/i.test(message)) {
    return "Таны local session хуучирсан байна. Дахин нэвтэрч байж ном зээлнэ үү.";
  }
  if (/Not authenticated/i.test(message)) return "Үйлдэл хийхийн тулд эхлээд нэвтэрнэ үү.";
  if (/No copies available/i.test(message)) return "Энэ номын боломжит хувь дууссан байна.";
  if (/Payment required before borrowing/i.test(message)) {
    return "Backend borrow rule huuchin baina. Hamgiin suuliin migration-aa apply hiigeed dahin oroldooroi.";
  }
  if (/Payment is not required for this book/i.test(message)) {
    return "Ene nom unegui access-tai baina.";
  }
  if (/Paid books cannot be requested while unavailable/i.test(message)) {
    return "Ene nomiig odoo requestlehgui. Huvi orj irvel shuud borrow hiine.";
  }
  if (/pay before borrowing/i.test(message)) {
    return "Ene nom odoo available baina. Shuud borrow hiigeerei.";
  }
  if (/Book is currently available/i.test(message)) return "Энэ ном одоогоор боломжтой байна. Шууд зээлж болно.";
  if (/already borrowed/i.test(message)) return "Та энэ номыг аль хэдийн идэвхтэй зээлсэн байна.";
  if (/already requested/i.test(message)) return "Та энэ номыг аль хэдийн захиалсан байна.";
  if (/Loan not found/i.test(message)) return "Зээлийн мэдээлэл олдсонгүй.";
  if (/Book not found/i.test(message)) return "Номын мэдээлэл олдсонгүй.";
  if (/Price must be greater than zero/i.test(message)) return "Зарах үнэ 0-ээс их байх ёстой.";
  if (/already listed for sale/i.test(message)) return "Энэ номын идэвхтэй sale listing аль хэдийн үүссэн байна.";
  if (/Admin privileges required/i.test(message)) return "Энэ үйлдлийг зөвхөн admin хийнэ.";
  if (/At least one admin account must remain/i.test(message)) return "Системд дор хаяж нэг admin үлдэх ёстой.";
  if (/Unsupported loan status transition/i.test(message)) return "Энэ loan status шилжилт дэмжигдэхгүй.";
  if (/Loan cannot be activated from its current status/i.test(message)) {
    return "Энэ loan-ыг энэ төлвөөс active болгох боломжгүй.";
  }
  if (/Only completed loans can move back to requested/i.test(message)) {
    return "Зөвхөн completed loan-ыг requested рүү буцааж болно.";
  }
  if (/Loan cannot be completed from its current status/i.test(message)) {
    return "Энэ loan-ыг энэ төлвөөс хаах боломжгүй.";
  }
  if (/Borrow or return the book before listing it for sale/i.test(message)) {
    return "Зарахаасаа өмнө энэ номыг дор хаяж нэг удаа зээлсэн байх шаардлагатай.";
  }
  if (/Could not find the function public\.(borrow_book|pay_and_borrow_book|request_book|return_book|sell_book)/i.test(message)) {
    return "Backend migration дутуу байна. Supabase migration-уудаа apply хийгээд дахин оролдоно уу.";
  }
  if (/structure of query does not match function result type|returned record type does not match expected/i.test(message)) {
    return "Backend RPC хуучин хувилбараар ажиллаж байна. Шинэ Supabase migration-аа apply хийх хэрэгтэй.";
  }
  if (/invalid input syntax for type uuid/i.test(message)) {
    return "Номын ID буруу ирсэн байна. Catalog data-г зөв UUID-р дахин холбох шаардлагатай.";
  }
  if (/Could not resolve canonical book id/i.test(message)) {
    return "Энэ номын жинхэнэ ID-г каталогоос олж чадсангүй. Номын өгөгдлөө шалгаад дахин оролдоно уу.";
  }
  if (/Sale listings feature is disabled/i.test(message)) {
    return "Зарах feature одоогоор идэвхгүй байна. Backend migration deploy хийсний дараа асаана.";
  }

  if (/Missing QPay configuration/i.test(message)) {
    return "QPay ene build deer ashiglakhgui. Hervee ene aldaa garch baival backend-ee suuliin migration-aar shinechleerei.";
  }
  if (/QPay token request failed|QPay request failed/i.test(message)) {
    return "QPay code huuchin environment deer ajillaj baina. Suuliin migration-aa apply hiigeed dahin asaana uu.";
  }

  return message;
};
