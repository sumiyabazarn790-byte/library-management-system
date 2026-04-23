import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Use AI to expand a natural-language query (Mongolian or English) into search terms.
// Returns a list of likely titles, authors, and keywords to feed into fuzzy SQL search.
async function expandQuery(q: string): Promise<string[]> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You translate book search queries (Mongolian Cyrillic OR English) into a JSON array of 3-6 short search terms (title fragments, author names, genres, key topics in BOTH languages when relevant). Output JSON only.",
          },
          { role: "user", content: q },
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
    if (!res.ok) return [];
    const json = await res.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return [];
    const parsed = JSON.parse(args);
    return Array.isArray(parsed.terms) ? parsed.terms : [];
  } catch (e) {
    console.warn("expandQuery failed", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, limit = 16 } = await req.json();
    const q = (query ?? "").toString().trim();
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (!q) {
      const { data } = await supa.from("books").select("*").limit(limit);
      return new Response(JSON.stringify({ results: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Run literal fuzzy search first
    const { data: literal } = await supa.rpc("search_books_fuzzy", { q, lim: limit });

    // If we already have strong matches, return them immediately
    let results: any[] = literal ?? [];

    // For semantic understanding, expand query terms via AI and run fuzzy on each
    if (results.length < Math.max(4, Math.floor(limit / 3))) {
      const terms = await expandQuery(q);
      const seen = new Set(results.map((b) => b.id));
      for (const term of terms) {
        const { data: more } = await supa.rpc("search_books_fuzzy", { q: term, lim: 6 });
        for (const b of more ?? []) {
          if (!seen.has(b.id)) {
            seen.add(b.id);
            results.push(b);
            if (results.length >= limit) break;
          }
        }
        if (results.length >= limit) break;
      }
    }

    return new Response(JSON.stringify({ results: results.slice(0, limit) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
