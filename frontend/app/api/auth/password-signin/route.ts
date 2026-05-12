import { NextResponse } from "next/server";
import type { AuthResult } from "@/lib/authResult";
import {
  createSupabaseServerClients,
  findUserByEmail,
  normalizeEmail,
  normalizePassword,
  syncAdminRoleForEmail,
} from "../_shared/supabaseAuth";

export const runtime = "nodejs";

const json = (body: AuthResult, status = 200) =>
  NextResponse.json(body, { status });

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const email = normalizeEmail(payload?.email);
    const password = normalizePassword(payload?.password);

    if (!email || !password) {
      return json({ error: "Email and password are required.", reason: "unknown" }, 400);
    }

    let autoConfirmed = false;
    try {
      const { adminClient } = createSupabaseServerClients();
      const user = await findUserByEmail({ adminClient, email });

      if (user) {
        if (!user.email_confirmed_at) {
          const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
            email_confirm: true,
          });

          if (updateError) {
            throw updateError;
          }

          autoConfirmed = true;
        }

        await syncAdminRoleForEmail({ adminClient, email });
      }
    } catch (error) {
      console.warn("password-signin preflight skipped", error);
    }

    return json({
      error: null,
      reason: null,
      autoConfirmed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in failed.";
    console.error("password-signin route failed", error);
    return json(
      {
        error: message,
        reason: "unknown",
      },
      500,
    );
  }
}
