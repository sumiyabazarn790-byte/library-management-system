import { NextResponse } from "next/server";
import { mapAuthError, type AuthResult } from "@/lib/authResult";
import {
  createSupabaseServerClients,
  normalizeDisplayName,
  normalizeEmail,
  normalizePassword,
  syncAdminRoleForEmail,
} from "../_shared/supabaseAuth";

export const runtime = "nodejs";

const json = (body: AuthResult, status = 200) =>
  NextResponse.json(body, { status });

const SIGN_IN_RETRY_DELAYS_MS = [0, 250, 750, 1500];

const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const email = normalizeEmail(payload?.email);
    const password = normalizePassword(payload?.password);
    const displayName = normalizeDisplayName(payload?.displayName);

    if (!email || !password) {
      return json({ error: "Email and password are required.", reason: "unknown" }, 400);
    }

    const { authClient, adminClient } = createSupabaseServerClients();
    const { error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: displayName ? { display_name: displayName } : undefined,
    });

    if (error) {
      return json(mapAuthError(error.message));
    }

    await syncAdminRoleForEmail({ adminClient, email });

    let session: AuthResult["session"] = null;

    for (const delayMs of SIGN_IN_RETRY_DELAYS_MS) {
      if (delayMs > 0) {
        await wait(delayMs);
      }

      const signInResult = await authClient.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInResult.error && signInResult.data.session) {
        session = {
          access_token: signInResult.data.session.access_token,
          refresh_token: signInResult.data.session.refresh_token,
        };
        break;
      }
    }

    return json({
      error: null,
      reason: null,
      emailConfirmationRequired: false,
      session,
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
