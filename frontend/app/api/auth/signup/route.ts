import { NextResponse } from "next/server";
import { mapAuthError, type AuthResult } from "@/lib/authResult";
import {
  createSupabasePublicServerClient,
  createSupabaseServerClients,
  isLoopbackSupabaseServerConfig,
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

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "";

const isAdminClientUnavailableError = (error: unknown) =>
  /invalid api key|missing supabase_service_role_key|missing supabase_secret_key/i.test(getErrorMessage(error));

const getLocalAdminSignupError = (error: unknown) => {
  if (!isAdminClientUnavailableError(error)) {
    return null;
  }

  try {
    if (!isLoopbackSupabaseServerConfig()) {
      return null;
    }
  } catch {
    return null;
  }

  return "Local signup needs a working Supabase admin key. Add SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) to frontend/.env.local. If you changed backend/supabase/config.toml, restart local Supabase and try again.";
};

const signUpWithPublicClient = async ({
  email,
  password,
  displayName,
}: {
  email: string;
  password: string;
  displayName: string;
}) => {
  const authClient = createSupabasePublicServerClient();
  const { data, error } = await authClient.auth.signUp({
    email,
    password,
    options: displayName ? { data: { display_name: displayName } } : undefined,
  });

  if (error) {
    return json(mapAuthError(error.message));
  }

  return json({
    error: null,
    reason: null,
    emailConfirmationRequired: !data.session,
    session: data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }
      : null,
  });
};

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const email = normalizeEmail(payload?.email);
    const password = normalizePassword(payload?.password);
    const displayName = normalizeDisplayName(payload?.displayName);

    if (!email || !password) {
      return json({ error: "Email and password are required.", reason: "unknown" }, 400);
    }

    let authClient: ReturnType<typeof createSupabasePublicServerClient>;
    let adminClient: ReturnType<typeof createSupabaseServerClients>["adminClient"];

    try {
      ({ authClient, adminClient } = createSupabaseServerClients());
    } catch (error) {
      const localAdminSignupError = getLocalAdminSignupError(error);

      if (localAdminSignupError) {
        return json({ error: localAdminSignupError, reason: "unknown" }, 500);
      }

      if (isAdminClientUnavailableError(error)) {
        return signUpWithPublicClient({ email, password, displayName });
      }

      throw error;
    }

    const { error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: displayName ? { display_name: displayName } : undefined,
    });

    if (error) {
      const localAdminSignupError = getLocalAdminSignupError(error);

      if (localAdminSignupError) {
        return json({ error: localAdminSignupError, reason: "unknown" }, 500);
      }

      if (isAdminClientUnavailableError(error)) {
        return signUpWithPublicClient({ email, password, displayName });
      }

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
      manualSignInRequired: !session,
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
