import "server-only";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createClient, type User } from "@supabase/supabase-js";
import { resolveSupabasePublicConfig } from "@/integrations/supabase/config";

type LocalEnvCache = {
  path: string | null;
  mtimeMs: number;
  values: Record<string, string>;
};

const LOCAL_ENV_FILE_CANDIDATES = [".env.local", path.join("frontend", ".env.local")];
const ENV_ASSIGNMENT_PATTERN = /^([\w.-]+)\s*=\s*(.*)$/;

let localEnvCache: LocalEnvCache | null = null;

const stripWrappingQuotes = (value: string) => {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const parseDotenv = (contents: string) => {
  const values: Record<string, string> = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(ENV_ASSIGNMENT_PATTERN);

    if (!match) {
      continue;
    }

    values[match[1]] = stripWrappingQuotes(match[2]);
  }

  return values;
};

const loadLocalEnvOverrides = () => {
  for (const relativePath of LOCAL_ENV_FILE_CANDIDATES) {
    const absolutePath = path.resolve(process.cwd(), relativePath);

    try {
      if (!existsSync(absolutePath)) {
        continue;
      }

      const { mtimeMs } = statSync(absolutePath);

      if (localEnvCache?.path === absolutePath && localEnvCache.mtimeMs === mtimeMs) {
        return localEnvCache.values;
      }

      const values = parseDotenv(readFileSync(absolutePath, "utf8"));
      localEnvCache = {
        path: absolutePath,
        mtimeMs,
        values,
      };

      return values;
    } catch {
      continue;
    }
  }

  localEnvCache = {
    path: null,
    mtimeMs: 0,
    values: {},
  };

  return localEnvCache.values;
};

const getEnv = (name: string) =>
  loadLocalEnvOverrides()[name]?.trim() || process.env[name]?.trim() || "";

const getResolvedSupabasePublicConfig = () => {
  const config = resolveSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  });

  if (!config.url || !config.publicKey) {
    throw new Error("Missing Supabase public configuration.");
  }

  return config;
};

const getSupabasePublicConfig = () => {
  const { url, publicKey } = getResolvedSupabasePublicConfig();
  return { url, publicKey };
};

const getSupabaseServiceRoleKey = () =>
  getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SECRET_KEY");

const createServerAuthClient = (key: string) => {
  const { url } = getSupabasePublicConfig();

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

export const createSupabaseServerClients = () => {
  const { publicKey } = getSupabasePublicConfig();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.");
  }

  return {
    authClient: createServerAuthClient(publicKey),
    adminClient: createServerAuthClient(serviceRoleKey),
  };
};

export const createSupabasePublicServerClient = () => {
  const { publicKey } = getSupabasePublicConfig();

  return createServerAuthClient(publicKey);
};

export const isLoopbackSupabaseServerConfig = () =>
  getResolvedSupabasePublicConfig().isLoopback;

export const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const normalizePassword = (value: unknown) =>
  typeof value === "string" ? value : "";

export const normalizeDisplayName = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const getAdminEmailAllowlist = () =>
  new Set(
    getEnv("ADMIN_EMAILS")
      .split(/[,\n;]+/)
      .map((value) => normalizeEmail(value))
      .filter(Boolean),
  );

export const isAdminBootstrapEmail = (email: string) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  return getAdminEmailAllowlist().has(normalizedEmail);
};

export const findUserByEmail = async ({
  adminClient,
  email,
  pageSize = 200,
}: {
  adminClient: ReturnType<typeof createServerAuthClient>;
  email: string;
  pageSize?: number;
}): Promise<User | null> => {
  let page = 1;

  while (true) {
    const result = await adminClient.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });

    if (result.error) {
      throw result.error;
    }

    const users: User[] = result.data.users;
    const match = users.find((user) => user.email?.trim().toLowerCase() === email);

    if (match) {
      return match;
    }

    if (users.length < pageSize) {
      return null;
    }

    page += 1;
  }
};

export const syncAdminRoleForEmail = async ({
  adminClient,
  email,
}: {
  adminClient: ReturnType<typeof createServerAuthClient>;
  email: string;
}) => {
  const normalizedEmail = normalizeEmail(email);

  if (!isAdminBootstrapEmail(normalizedEmail)) {
    return false;
  }

  const user = await findUserByEmail({ adminClient, email: normalizedEmail });

  if (!user) {
    return false;
  }

  const { error } = await adminClient
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", user.id)
    .neq("role", "admin");

  if (error) {
    throw error;
  }

  return true;
};
