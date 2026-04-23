import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, mode = "hybrid", limit = 12 } = await req.json();
    const q = (query ?? "").toString().trim();
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (!q) {
      const { data } = await supa.from("books").select("*").limit(limit);
      return new Response(JSON.stringify({ results: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Always run fuzzy (typo-tolerant) search
    const { data: fuzzy, error: fuzzyErr } = await supa.rpc("search_books_fuzzy", { q, lim: limit });
    if (fuzzyErr) console.error("fuzzy err", fuzzyErr);

    let semantic: any[] = [];
    if (mode !== "fuzzy") {
      try {
        const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/text-embedding-004", input: q }),
        });
        if (embRes.ok) {
          const embJson = await embRes.json();
          const emb = embJson.data?.[0]?.embedding;
          if (emb) {
            const { data: matches } = await supa.rpc("match_books", {
              query_embedding: emb,
              match_count: limit,
            });
            semantic = matches ?? [];
          }
        }
      } catch (e) {
        console.warn("semantic search skipped", e);
      }
    }

    // Merge: fuzzy first (exact-ish), then semantic, dedup by id
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const b of [...(fuzzy ?? []), ...semantic]) {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        merged.push(b);
      }
    }

    return new Response(JSON.stringify({ results: merged.slice(0, limit) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
