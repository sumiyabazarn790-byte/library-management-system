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

    const { adminClient } = createSupabaseServerClients();
    const user = await findUserByEmail({ adminClient, email });
    let autoConfirmed = false;

    if (!user) {
      return json({ error: null, reason: null });
    }

    if (!user.email_confirmed_at) {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });

      if (updateError) {
        return json(
          {
            error: updateError.message,
            reason: "unknown",
          },
          500,
        );
      }

      autoConfirmed = true;
    }

    await syncAdminRoleForEmail({ adminClient, email });

    return json({
      error: null,
      reason: null,
      autoConfirmed,
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
