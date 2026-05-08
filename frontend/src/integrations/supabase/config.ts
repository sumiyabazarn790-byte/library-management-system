type SupabasePublicEnv = Pick<
  NodeJS.ProcessEnv,
  "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
>;

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

const trimEnv = (value: string | undefined) => value?.trim() ?? "";

export const isLoopbackHostname = (value: string | null | undefined) =>
  value ? LOOPBACK_HOSTS.has(value) : false;

export const isLoopbackUrl = (value: string | undefined) => {
  const trimmed = trimEnv(value);

  if (!trimmed) {
    return false;
  }

  try {
    return isLoopbackHostname(new URL(trimmed).hostname);
  } catch {
    return false;
  }
};

export const resolveSupabasePublicConfig = (env: SupabasePublicEnv) => {
  const url = trimEnv(env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = trimEnv(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const anonKey = trimEnv(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const publicKey = publishableKey || anonKey;

  return {
    url,
    publicKey,
    hasConfig: Boolean(url && publicKey),
    isLoopback: isLoopbackUrl(url),
    publicKeyEnvName: publishableKey
      ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      : anonKey
        ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        : null,
  } as const;
};

// Keep NEXT_PUBLIC_* accesses explicit so Next can inline them into the client bundle.
const publicConfig = resolveSupabasePublicConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export const SUPABASE_URL = publicConfig.url;
export const SUPABASE_PUBLISHABLE_KEY = publicConfig.publicKey;
export const hasSupabaseConfig = publicConfig.hasConfig;
export const SUPABASE_URL_IS_LOOPBACK = publicConfig.isLoopback;
export const SUPABASE_PUBLIC_KEY_ENV_NAME = publicConfig.publicKeyEnvName;
export const SUPABASE_PUBLIC_KEY_ENV_LABEL =
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY";
