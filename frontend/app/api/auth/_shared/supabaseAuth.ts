import "server-only";
import { createClient, type User } from "@supabase/supabase-js";
import { resolveSupabasePublicConfig } from "@/integrations/supabase/config";

const getEnv = (name: string) => process.env[name]?.trim() || "";

const getSupabasePublicConfig = () => {
  const { url, publicKey } = resolveSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  });

  if (!url || !publicKey) {
    throw new Error("Missing Supabase public configuration.");
  }

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

export const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const normalizePassword = (value: unknown) =>
  typeof value === "string" ? value : "";

export const normalizeDisplayName = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

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
