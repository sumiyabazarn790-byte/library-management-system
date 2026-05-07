type SupabasePublicEnv = Pick<
  NodeJS.ProcessEnv,
  "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
>;

const trimEnv = (value: string | undefined) => value?.trim() ?? "";

export const resolveSupabasePublicConfig = (env: SupabasePublicEnv) => {
  const url = trimEnv(env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = trimEnv(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const anonKey = trimEnv(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const publicKey = publishableKey || anonKey;

  return {
    url,
    publicKey,
    hasConfig: Boolean(url && publicKey),
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
export const SUPABASE_PUBLIC_KEY_ENV_NAME = publicConfig.publicKeyEnvName;
export const SUPABASE_PUBLIC_KEY_ENV_LABEL =
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY";
