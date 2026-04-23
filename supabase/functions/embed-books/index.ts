import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Build (or rebuild) embeddings for any books missing one. Idempotent.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: books, error } = await supa
      .from("books")
      .select("id,title,author,genre,description,language")
      .is("embedding", null)
      .limit(50);
    if (error) throw error;
    if (!books?.length) {
      return new Response(JSON.stringify({ updated: 0, message: "Nothing to index" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    for (const b of books) {
      const text = `${b.title} by ${b.author}. Genre: ${b.genre}. Language: ${b.language}. ${b.description}`;
      const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/text-embedding-004", input: text }),
      });
      if (!embRes.ok) {
        console.error("emb fail", b.id, embRes.status, await embRes.text());
        continue;
      }
      const json = await embRes.json();
      const emb = json.data?.[0]?.embedding;
      if (!emb) continue;
      const { error: upErr } = await supa.from("books").update({ embedding: emb }).eq("id", b.id);
      if (upErr) console.error("update fail", b.id, upErr);
      else updated++;
    }

    return new Response(JSON.stringify({ updated, total: books.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("embed-books error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
