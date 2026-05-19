import { NextResponse } from "next/server";
import { createSupabasePublicServerClient, createSupabaseServerClients, normalizeEmail } from "../auth/_shared/supabaseAuth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

const getNewsletterClient = () => {
  try {
    return createSupabaseServerClients().adminClient;
  } catch {
    return createSupabasePublicServerClient();
  }
};

const mapSubscribeError = (error: { code?: string; message?: string }) => {
  if (error.code === "23505") {
    return json({ error: null, status: "already_subscribed" });
  }

  if (error.code === "42P01") {
    return json(
      {
        error:
          "Newsletter table is missing. Run `npm run db:push` locally or push the latest Supabase migrations to the linked project.",
      },
      500,
    );
  }

  if (error.code === "42501") {
    return json(
      {
        error:
          "Newsletter signup is blocked by database permissions. Apply the newsletter_subscribers insert policy migration.",
      },
      500,
    );
  }

  return json({ error: error.message || "Newsletter signup failed. Please try again." }, 500);
};

export const POST = async (request: Request) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const email = normalizeEmail((payload as { email?: unknown } | null)?.email);

  if (!email || !EMAIL_PATTERN.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  try {
    const { error } = await getNewsletterClient()
      .from("newsletter_subscribers")
      .insert({ email, source: "footer" });

    if (error) {
      return mapSubscribeError(error);
    }

    return json({ error: null, status: "subscribed" });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Newsletter signup failed. Please try again.",
      },
      500,
    );
  }
};
