import { NextResponse } from "next/server";
import { mapAuthError, type AuthResult } from "@/lib/authResult";
import {
  createSupabaseServerClients,
  findUserByEmail,
  normalizeEmail,
  normalizePassword,
  syncAdminRoleForEmail,
} from "../_shared/supabaseAuth";

export const runtime = "nodejs";

const json = (body: AuthResult, status = body.error ? 400 : 200) =>
  NextResponse.json(body, { status });

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const email = normalizeEmail(payload?.email);
    const password = normalizePassword(payload?.password);

    if (!email || !password) {
      return json({ error: "Email and password are required.", reason: "unknown" }, 400);
    }

    const { authClient, adminClient } = createSupabaseServerClients();
    const firstAttempt = await authClient.auth.signInWithPassword({ email, password });

    if (!firstAttempt.error) {
      await syncAdminRoleForEmail({ adminClient, email });
      return json({ error: null, reason: null });
    }

    const initialResult = mapAuthError(firstAttempt.error.message);

    if (initialResult.reason !== "email_not_confirmed") {
      return json(initialResult);
    }

    const user = await findUserByEmail({ adminClient, email });

    if (!user) {
      return json(initialResult);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (updateError) {
      return json(mapAuthError(updateError.message), 500);
    }

    const secondAttempt = await authClient.auth.signInWithPassword({ email, password });

    if (secondAttempt.error) {
      return json(mapAuthError(secondAttempt.error.message));
    }

    await syncAdminRoleForEmail({ adminClient, email });

    return json({
      error: null,
      reason: null,
      autoConfirmed: true,
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Sign in failed.",
        reason: "unknown",
      },
      500,
    );
  }
}
