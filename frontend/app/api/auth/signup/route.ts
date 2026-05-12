import { NextResponse } from "next/server";
import { mapAuthError, type AuthResult } from "@/lib/authResult";
import {
  createSupabaseServerClients,
  normalizeDisplayName,
  normalizeEmail,
  normalizePassword,
} from "../_shared/supabaseAuth";

export const runtime = "nodejs";

const json = (body: AuthResult, status = body.error ? 400 : 200) =>
  NextResponse.json(body, { status });

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const email = normalizeEmail(payload?.email);
    const password = normalizePassword(payload?.password);
    const displayName = normalizeDisplayName(payload?.displayName);

    if (!email || !password) {
      return json({ error: "Email and password are required.", reason: "unknown" }, 400);
    }

    const { adminClient } = createSupabaseServerClients();
    const { error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: displayName ? { display_name: displayName } : undefined,
    });

    if (error) {
      return json(mapAuthError(error.message));
    }

    return json({
      error: null,
      reason: null,
      emailConfirmationRequired: false,
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Signup failed.",
        reason: "unknown",
      },
      500,
    );
  }
}
