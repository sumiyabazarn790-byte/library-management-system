import { createClient } from "@supabase/supabase-js";
import { searchCatalogBooks } from "../_shared/catalog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_BASE_URL = Deno.env.get("OPENAI_BASE_URL");
const OPENAI_QUERY_MODEL = Deno.env.get("OPENAI_QUERY_MODEL") ?? Deno.env.get("OPENAI_CHAT_MODEL");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, limit = 16 } = await req.json();
    const normalizedQuery = (query ?? "").toString().trim();
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
    const results = await searchCatalogBooks({
      supabase: supa,
      query: normalizedQuery,
      openAiApiKey: OPENAI_API_KEY,
      openAiBaseUrl: OPENAI_BASE_URL,
      openAiQueryModel: OPENAI_QUERY_MODEL,
      lovableApiKey: LOVABLE_API_KEY,
      limit,
    });

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
