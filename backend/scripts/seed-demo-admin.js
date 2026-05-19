#!/usr/bin/env node

/**
 * Seed a confirmed demo admin user into Supabase.
 * Usage: node backend/scripts/seed-demo-admin.js
 *
 * Optional env overrides:
 *   DEMO_ADMIN_EMAIL
 *   DEMO_ADMIN_PASSWORD
 *   DEMO_ADMIN_DISPLAY_NAME
 */

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

for (const envPath of [
  path.resolve(__dirname, "../../frontend/.env.local"),
  path.resolve(__dirname, "../.env"),
]) {
  dotenv.config({ path: envPath, override: false });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();

const DEMO_ADMIN_EMAIL = (process.env.DEMO_ADMIN_EMAIL || "admin@lumina.local").trim().toLowerCase();
const DEMO_ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || "LuminaAdmin123!";
const DEMO_ADMIN_DISPLAY_NAME = process.env.DEMO_ADMIN_DISPLAY_NAME || "Lumina Demo Admin";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing Supabase admin configuration.");
  console.error(`  SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? "ok" : "missing"}`);
  console.error(`  SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY: ${SERVICE_ROLE_KEY ? "ok" : "missing"}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const findUserByEmail = async (email) => {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const user = data.users.find((candidate) => candidate.email?.trim().toLowerCase() === email);

    if (user || data.users.length < perPage) {
      return user ?? null;
    }

    page += 1;
  }
};

const ensureDemoAdmin = async () => {
  const existingUser = await findUserByEmail(DEMO_ADMIN_EMAIL);
  const userMetadata = { display_name: DEMO_ADMIN_DISPLAY_NAME };

  const { data, error } = existingUser
    ? await supabase.auth.admin.updateUserById(existingUser.id, {
        password: DEMO_ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: userMetadata,
      })
    : await supabase.auth.admin.createUser({
        email: DEMO_ADMIN_EMAIL,
        password: DEMO_ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: userMetadata,
      });

  if (error) {
    throw error;
  }

  const user = data.user;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: DEMO_ADMIN_DISPLAY_NAME,
      role: "admin",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw profileError;
  }

  return { created: !existingUser, userId: user.id };
};

ensureDemoAdmin()
  .then(({ created, userId }) => {
    console.log(`${created ? "Created" : "Updated"} demo admin user.`);
    console.log(`  Email: ${DEMO_ADMIN_EMAIL}`);
    console.log(`  Password: ${DEMO_ADMIN_PASSWORD}`);
    console.log(`  User ID: ${userId}`);
  })
  .catch((error) => {
    console.error("Failed to seed demo admin user.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
