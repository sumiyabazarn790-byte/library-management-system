import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type CatalogBook = {
  id: string;
  title: string;
  author: string;
  genre: string;
  language: string;
  description: string;
  available_copies: number;
  total_copies: number;
};

const SYSTEM_PROMPT = `You are Aetheria, an erudite multilingual librarian for a digital archive.
You speak fluently in Mongolian (Cyrillic) AND English. ALWAYS detect the user's language and respond in the same language.
You also understand Mongolian written in Latin transliteration such as "minii zeelsen nom" and should answer in natural Mongolian when users write that way.

You help readers:
- discover books by title, author, topic, or meaning
- tolerate typos and fuzzy search queries
- support semantic search and keyword search
- borrow, request, and return books
- check personal loans
- get personalized recommendations based on preferred genres
- answer general knowledge and literary questions

If the user asks what you can do, answer with a short bullet list covering:
- search books by title or author
- borrow or request books
- view the user's loans
- recommend books based on preferred genres
- find books even with typos using fuzzy search
- search by meaning using semantic search
- understand both Mongolian and English

When recommending books from the catalog context, include the book TITLE in **bold** with the author.
Be warm, concise, cinematic. Never invent books that are not in the provided context - if no catalog matches, say so.`;

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!lovableApiKey || !supabaseUrl || !serviceRole) {
      return jsonResponse(
        {
          error:
            "Chat function is missing required server secrets. Set LOVABLE_API_KEY, SUPABASE_URL, and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) before invoking AI chat.",
        },
        { status: 500 },
      );
    }

    const { messages } = await req.json() as { messages: ChatMessage[] };
    const lastUser = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";

    let context = "";

    try {
      const supa = createClient(supabaseUrl, serviceRole);
      const { data: matches } = await supa.rpc("search_books_fuzzy", { q: lastUser, lim: 8 });
      const books = [...((matches ?? []) as CatalogBook[])];

      if (books.length < 4) {
        const { data: extra } = await supa.from("books").select("*").limit(8);
        const seen = new Set(books.map((book) => book.id));

        for (const book of ((extra ?? []) as CatalogBook[])) {
          if (!seen.has(book.id)) {
            seen.add(book.id);
            books.push(book);
          }
        }
      }

      if (books.length) {
        context = "Available books in the Aetheria catalog (use these when recommending):\n" +
          books
            .slice(0, 10)
            .map(
              (book, index) =>
                `${index + 1}. "${book.title}" - ${book.author} [${book.genre}, ${book.language}] - ${book.description} (${book.available_copies}/${book.total_copies} available)`,
            )
            .join("\n");
      }
    } catch (error) {
      console.warn("context build failed", error);
    }

    const systemMessages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
    if (context) systemMessages.push({ role: "system", content: context });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [...systemMessages, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse({ error: "Too many requests were sent to the AI service. Please try again shortly." }, {
          status: 429,
        });
      }

      if (response.status === 402) {
        return jsonResponse({ error: "AI credit is currently unavailable." }, {
          status: 402,
        });
      }

      const text = await response.text();
      console.error("AI gateway error:", response.status, text);

      return jsonResponse({ error: "The AI service returned an error." }, {
        status: 500,
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("chat error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown" }, {
      status: 500,
    });
  }
});
