import { NextResponse } from "next/server";
import type { AuthResult } from "@/lib/authResult";
import { createSupabaseServerClients, normalizeEmail, syncAdminRoleForEmail } from "../_shared/supabaseAuth";

export const runtime = "nodejs";

const json = (body: AuthResult, status = body.error ? 400 : 200) =>
  NextResponse.json(body, { status });

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
    return json(
      {
        error: error instanceof Error ? error.message : "Role sync failed.",
        reason: "unknown",
      },
      500,
    );
  }
}
