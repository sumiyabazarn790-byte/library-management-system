import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `You are Aetheria, an erudite multilingual librarian for a digital archive.
You speak fluently in Mongolian (Cyrillic) AND English. ALWAYS detect the user's language and respond in the same language.

You help readers:
- discover books (semantic, keyword, fuzzy/typo-tolerant search)
- borrow and return books
- check personal loans
- get personalized recommendations based on preferred genres
- answer general knowledge & literary questions

When recommending books from the catalog context, include the book TITLE in **bold** with the author.
Be warm, concise, cinematic. Never invent books that are not in the provided context — if no catalog matches, say so.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const lastUser = [...messages].reverse().find((m: any) => m.role === "user")?.content ?? "";

    // Build catalog context using the search-books fuzzy expansion logic inline
    let context = "";
    try {
      const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data: matches } = await supa.rpc("search_books_fuzzy", { q: lastUser, lim: 8 });
      let books = matches ?? [];
      // If thin, also pull a small recent-popular slice
      if (books.length < 4) {
        const { data: extra } = await supa.from("books").select("*").limit(8);
        const seen = new Set(books.map((b: any) => b.id));
        for (const b of extra ?? []) if (!seen.has(b.id)) books.push(b);
      }
      if (books.length) {
        context = "Available books in the Aetheria catalog (use these when recommending):\n" +
          books.slice(0, 10).map((b: any, i: number) =>
            `${i + 1}. "${b.title}" — ${b.author} [${b.genre}, ${b.language}] — ${b.description} (${b.available_copies}/${b.total_copies} available)`,
          ).join("\n");
      }
    } catch (e) {
      console.warn("context build failed", e);
    }

    const systemMessages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
    if (context) systemMessages.push({ role: "system", content: context });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [...systemMessages, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Хэт олон хүсэлт. Түр хүлээгээд дахин оролдоно уу." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI кредит дууссан. Workspace Settings → Usage руу нэмнэ үү." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI алдаа гарлаа" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
