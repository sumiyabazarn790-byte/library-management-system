import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type CatalogBook = {
  id: string;
  title: string;
  author: string;
  genre: string;
  language: string;
  description: string;
  cover_url: string | null;
  total_copies: number;
  available_copies: number;
};

async function expandQuery(query: string): Promise<string[]> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You translate book search queries (Mongolian Cyrillic or English) into a JSON array of 3-6 short search terms. Include likely title fragments, author names, genres, and key topics in both languages when relevant. Output JSON only.",
          },
          { role: "user", content: query },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "search_terms",
              description: "Return search terms for a book search.",
              parameters: {
                type: "object",
                properties: {
                  terms: { type: "array", items: { type: "string" } },
                },
                required: ["terms"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "search_terms" } },
      }),
    });

    if (!response.ok) return [];

    const json = await response.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return [];

    const parsed = JSON.parse(args);
    return Array.isArray(parsed.terms) ? parsed.terms : [];
  } catch (error) {
    console.warn("expandQuery failed", error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, limit = 16 } = await req.json();
    const normalizedQuery = (query ?? "").toString().trim();
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (!normalizedQuery) {
      const { data } = await supa.from("books").select("*").limit(limit);
      return new Response(JSON.stringify({ results: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: literal } = await supa.rpc("search_books_fuzzy", { q: normalizedQuery, lim: limit });
    const results = [...((literal ?? []) as CatalogBook[])];

    if (results.length < Math.max(4, Math.floor(limit / 3))) {
      const terms = await expandQuery(normalizedQuery);
      const seen = new Set(results.map((book) => book.id));

      for (const term of terms) {
        const { data: more } = await supa.rpc("search_books_fuzzy", { q: term, lim: 6 });

        for (const book of ((more ?? []) as CatalogBook[])) {
          if (!seen.has(book.id)) {
            seen.add(book.id);
            results.push(book);
          }

          if (results.length >= limit) {
            break;
          }
        }

        if (results.length >= limit) {
          break;
        }
      }
    }

    return new Response(JSON.stringify({ results: results.slice(0, limit) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("search error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
