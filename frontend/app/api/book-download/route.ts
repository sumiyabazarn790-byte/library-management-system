import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getPublicDomainDownloadCandidates } from "@/lib/publicDomainBooks";

export const runtime = "nodejs";

const getEnv = (name: string) => process.env[name]?.trim() || "";

const getSupabaseConfig = () => {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration for secure downloads.");
  }

  return { url, anonKey, serviceRoleKey };
};

const getBearerToken = (request: Request) => {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
};

const sanitizeFileName = (value: string) =>
  value
    .replace(/[<>:"/\\|?*]/g, " ")
    .split("")
    .filter((character) => character >= " " && character !== "\u007F")
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);

const readFirstSuccessfulDownload = async (urls: string[]) => {
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "text/plain; charset=utf-8",
          "User-Agent": "Aetheria Download/1.0",
        },
        next: { revalidate: 86400 },
      });

      if (!response.ok) {
        continue;
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 1000) {
        continue;
      }

      return {
        buffer,
        contentType: response.headers.get("content-type") || "text/plain; charset=utf-8",
      };
    } catch {
      continue;
    }
  }

  return null;
};

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { url, anonKey, serviceRoleKey } = getSupabaseConfig();
    const authClient = createClient(url, anonKey);
    const serviceClient = createClient(url, serviceRoleKey);
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId")?.trim() ?? "";

    if (!bookId) {
      return NextResponse.json({ error: "Missing bookId." }, { status: 400 });
    }

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { data: book, error: bookError } = await serviceClient
      .from("books")
      .select("id, title, author")
      .eq("id", bookId)
      .maybeSingle();

    if (bookError) {
      return NextResponse.json({ error: bookError.message }, { status: 500 });
    }

    if (!book) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    const download = await readFirstSuccessfulDownload(getPublicDomainDownloadCandidates(book));

    if (!download) {
      return NextResponse.json({ error: "Download file is unavailable right now." }, { status: 502 });
    }

    const safeFileName = sanitizeFileName(`${book.title} - ${book.author}`) || "aetheria-book";

    return new Response(download.buffer, {
      status: 200,
      headers: {
        "Content-Type": download.contentType,
        "Content-Disposition": `attachment; filename="${safeFileName}.txt"; filename*=UTF-8''${encodeURIComponent(`${safeFileName}.txt`)}`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed." },
      { status: 500 },
    );
  }
}
