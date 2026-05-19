import { NextResponse } from "next/server";
import type { AuthResult } from "@/lib/authResult";
import { createSupabaseServerClients, normalizeEmail, syncAdminRoleForEmail } from "../_shared/supabaseAuth";

export const runtime = "nodejs";

const json = (body: AuthResult, status = body.error ? 400 : 200) =>
  NextResponse.json(body, { status });

const isOptionalAdminSyncError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : String(error ?? "");

  return /invalid api key|bad_jwt|jwt|service role|supabase_service_role_key|supabase_secret_key/i.test(message);
};

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const email = normalizeEmail(payload?.email);

    if (!email) {
      return json({ error: null, reason: null });
    }

    const { adminClient } = createSupabaseServerClients();
    await syncAdminRoleForEmail({ adminClient, email });

    return json({ error: null, reason: null });
  } catch (error) {
    if (isOptionalAdminSyncError(error)) {
      console.warn("admin role sync skipped", error);
      return json({ error: null, reason: null });
    }

    return json(
      {
        error: error instanceof Error ? error.message : "Role sync failed.",
        reason: "unknown",
      },
      500,
    );
  }
}
