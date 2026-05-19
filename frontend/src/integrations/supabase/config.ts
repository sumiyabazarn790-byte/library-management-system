type SupabasePublicEnv = Partial<
  Record<"NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | "NEXT_PUBLIC_SUPABASE_ANON_KEY", string>
>;

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const CURRENT_SUPABASE_URL = "https://origwdglnvvkilfuvrpa.supabase.co";
const CURRENT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3FHQqosmVQiCDT46oHC17A_B19S8Arl";
const STALE_HOSTED_SUPABASE_URLS = new Set([
  "https://niizgpjrogivqtxjqedp.supabase.co",
  "https://zqzfbksoryafdymzrord.supabase.co",
]);
const STALE_HOSTED_SUPABASE_PUBLIC_KEYS = new Set([
  "sb_publishable_tDHilTgQswgrwopphkumAA_k--8ExEN",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxemZia3NvcnlhZmR5bXpyb3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5OTAwNjEsImV4cCI6MjA5MDU2NjA2MX0.qD2ut1ZeY2bVRrV6LQv3wlMauoRFvN3td6U1joM1q3A",
]);

const trimEnv = (value: string | undefined) => value?.trim() ?? "";
const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const isKnownHostedPublicKey = (publicKey: string) =>
  publicKey === CURRENT_SUPABASE_PUBLISHABLE_KEY || STALE_HOSTED_SUPABASE_PUBLIC_KEYS.has(publicKey);

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

const resolveHostedProjectMigration = ({
  url,
  publicKey,
}: {
  url: string;
  publicKey: string;
}) => {
  const normalizedUrl = trimTrailingSlash(url);
  const isLoopback = isLoopbackUrl(normalizedUrl);
  const isHostedUrl = Boolean(normalizedUrl) && !isLoopback;
  const shouldMigrate =
    STALE_HOSTED_SUPABASE_URLS.has(normalizedUrl) ||
    (isHostedUrl && STALE_HOSTED_SUPABASE_PUBLIC_KEYS.has(publicKey));

  if (!shouldMigrate) {
    return {
      url: normalizedUrl,
      publicKey,
    };
  }

  return {
    url: CURRENT_SUPABASE_URL,
    publicKey: CURRENT_SUPABASE_PUBLISHABLE_KEY,
  };
};

export const resolveSupabasePublicConfig = (env: SupabasePublicEnv) => {
  const url = trimTrailingSlash(trimEnv(env.NEXT_PUBLIC_SUPABASE_URL));
  const publishableKey = trimEnv(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const anonKey = trimEnv(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const shouldPreferLocalAnonKey = isLoopbackUrl(url) && Boolean(anonKey) && isKnownHostedPublicKey(publishableKey);
  const envPublicKey = shouldPreferLocalAnonKey ? anonKey : publishableKey || anonKey;
  const { url: resolvedUrl, publicKey } = resolveHostedProjectMigration({
    url,
    publicKey: envPublicKey,
  });

  return {
    url: resolvedUrl,
    publicKey,
    hasConfig: Boolean(resolvedUrl && publicKey),
    isLoopback: isLoopbackUrl(resolvedUrl),
    publicKeyEnvName: shouldPreferLocalAnonKey
      ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      : publishableKey
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
