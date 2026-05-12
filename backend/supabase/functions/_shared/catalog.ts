import type { SupabaseClient } from "@supabase/supabase-js";

export type CatalogBook = {
  id: string;
  title: string;
  author: string;
  genre: string;
  language: string;
  description: string;
  cover_url: string | null;
  total_copies: number;
  available_copies: number;
  borrow_price?: number | null;
  borrow_currency?: string | null;
  is_public_readable?: boolean;
  reading_content?: string[] | null;
};

const QUERY_EXPANSION_PROMPT =
  "You translate book search queries (Mongolian Cyrillic or English) into a JSON array of 3-6 short search terms. Include likely title fragments, author names, genres, themes, and bilingual synonyms when helpful. Output JSON only.";

const MIN_QUERY_TERM_LENGTH = 2;
const DEFAULT_CATALOG_SCAN_LIMIT = 250;

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenizeSearchText = (value: string) =>
  normalizeSearchText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= MIN_QUERY_TERM_LENGTH);

const uniqueTerms = (values: string[]) => {
  const seen = new Set<string>();
  const normalizedValues: string[] = [];

  for (const value of values) {
    const normalized = normalizeSearchText(value);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    normalizedValues.push(normalized);
  }

  return normalizedValues;
};

const dedupeBooks = (books: CatalogBook[]) => {
  const seen = new Set<string>();
  const unique: CatalogBook[] = [];

  for (const book of books) {
    if (!book?.id || seen.has(book.id)) {
      continue;
    }

    seen.add(book.id);
    unique.push(book);
  }

  return unique;
};

const scoreField = (fieldValue: string, term: string, exactWeight: number, containsWeight: number) => {
  if (!fieldValue || !term) {
    return 0;
  }

  if (fieldValue === term) {
    return exactWeight;
  }

  if (fieldValue.includes(term)) {
    return containsWeight;
  }

  return 0;
};

const scoreCatalogBook = (book: CatalogBook, query: string, expandedTerms: string[]) => {
  const normalizedQuery = normalizeSearchText(query);
  const title = normalizeSearchText(book.title);
  const author = normalizeSearchText(book.author);
  const genre = normalizeSearchText(book.genre);
  const description = normalizeSearchText(book.description);

  let score = 0;

  score += scoreField(title, normalizedQuery, 280, 180);
  score += scoreField(author, normalizedQuery, 220, 150);
  score += scoreField(genre, normalizedQuery, 170, 120);

  if (description.includes(normalizedQuery) && normalizedQuery.length >= MIN_QUERY_TERM_LENGTH) {
    score += 110;
  }

  for (const term of expandedTerms) {
    score += scoreField(title, term, 80, 42);
    score += scoreField(author, term, 72, 36);
    score += scoreField(genre, term, 60, 28);

    if (description.includes(term)) {
      score += 18;
    }
  }

  const queryTokens = uniqueTerms([normalizedQuery, ...expandedTerms, ...tokenizeSearchText(query)]);
  const searchableText = `${title} ${author} ${genre} ${description}`;
  const overlapCount = queryTokens.filter((token) => searchableText.includes(token)).length;
  score += overlapCount * 8;

  if (book.available_copies > 0) {
    score += 4;
  }

  return score;
};

export const expandCatalogQuery = async (query: string, lovableApiKey?: string | null): Promise<string[]> => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery || !lovableApiKey) {
    return [];
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: QUERY_EXPANSION_PROMPT,
          },
          { role: "user", content: normalizedQuery },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "search_terms",
              description: "Return short catalog search terms for a book search query.",
              parameters: {
                type: "object",
                properties: {
                  terms: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["terms"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "search_terms" } },
      }),
    });

    if (!response.ok) {
      return [];
    }

    const json = await response.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;

    if (!args) {
      return [];
    }

    const parsed = JSON.parse(args);
    const terms = Array.isArray(parsed?.terms) ? parsed.terms.filter((value) => typeof value === "string") : [];
    return uniqueTerms(terms).slice(0, 6);
  } catch (error) {
    console.warn("expandCatalogQuery failed", error);
    return [];
  }
};

export const searchCatalogBooks = async ({
  supabase,
  query,
  lovableApiKey,
  limit = 16,
  catalogScanLimit = DEFAULT_CATALOG_SCAN_LIMIT,
}: {
  supabase: SupabaseClient;
  query: string;
  lovableApiKey?: string | null;
  limit?: number;
  catalogScanLimit?: number;
}): Promise<CatalogBook[]> => {
  const normalizedQuery = query.trim();
  const safeLimit = Math.max(1, limit);

  if (!normalizedQuery) {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      throw error;
    }

    return (data ?? []) as CatalogBook[];
  }

  const fuzzyLimit = Math.max(safeLimit, 8);
  const { data: fuzzyMatches, error: fuzzyError } = await supabase.rpc("search_books_fuzzy", {
    q: normalizedQuery,
    lim: fuzzyLimit,
  });

  if (fuzzyError) {
    throw fuzzyError;
  }

  const expandedTerms = await expandCatalogQuery(normalizedQuery, lovableApiKey);
  const queryTerms = uniqueTerms([
    normalizedQuery,
    ...expandedTerms,
    ...tokenizeSearchText(normalizedQuery),
  ]);

  const { data: catalog, error: catalogError } = await supabase
    .from("books")
    .select("*")
    .limit(Math.max(catalogScanLimit, safeLimit));

  if (catalogError) {
    throw catalogError;
  }

  const rankedBooks = ((catalog ?? []) as CatalogBook[])
    .map((book) => ({
      book,
      score: scoreCatalogBook(book, normalizedQuery, queryTerms),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.book);

  return dedupeBooks([...(fuzzyMatches ?? []) as CatalogBook[], ...rankedBooks]).slice(0, safeLimit);
};
