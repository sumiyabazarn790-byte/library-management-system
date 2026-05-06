const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const UNAVAILABLE_FLAG_KEY = "lumina.supabase.loopback.unavailable";

export const LOCAL_SUPABASE_UNAVAILABLE_MESSAGE =
  "Local Supabase backend is not running. Start Docker Desktop, run `supabase start --workdir backend`, or update frontend/.env.local with your cloud project URL and publishable key.";

const hasWindow = () => typeof window !== "undefined";

const getSupabaseHostname = () => {
  if (!SUPABASE_URL) {
    return null;
  }

  try {
    return new URL(SUPABASE_URL).hostname;
  } catch {
    return null;
  }
};

export const isLoopbackSupabaseUrl = (() => {
  const hostname = getSupabaseHostname();
  return hostname ? LOOPBACK_HOSTS.has(hostname) : false;
})();

const SUPABASE_STORAGE_KEY = (() => {
  const hostname = getSupabaseHostname();
  return hostname ? `sb-${hostname.split(".")[0]}-auth-token` : "sb-local-auth-token";
})();

export const getSupabaseUnavailableReason = () => {
  if (!hasWindow()) {
    return null;
  }

  return window.sessionStorage.getItem(UNAVAILABLE_FLAG_KEY);
};

export const clearPersistedSupabaseSession = () => {
  if (!hasWindow()) {
    return;
  }

  for (const key of [
    SUPABASE_STORAGE_KEY,
    `${SUPABASE_STORAGE_KEY}-code-verifier`,
    `${SUPABASE_STORAGE_KEY}-user`,
  ]) {
    window.localStorage.removeItem(key);
  }
};

export const markSupabaseUnavailable = (
  reason = LOCAL_SUPABASE_UNAVAILABLE_MESSAGE,
) => {
  if (!hasWindow()) {
    return;
  }

  window.sessionStorage.setItem(UNAVAILABLE_FLAG_KEY, reason);
  clearPersistedSupabaseSession();
};

export const clearSupabaseUnavailableMarker = () => {
  if (!hasWindow()) {
    return;
  }

  window.sessionStorage.removeItem(UNAVAILABLE_FLAG_KEY);
};

export const primeSupabaseAvailability = async () => {
  if (!hasWindow() || !SUPABASE_URL || !isLoopbackSupabaseUrl) {
    return { available: true as const, reason: null };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 1500);

  try {
    const healthUrl = new URL("/auth/v1/health", SUPABASE_URL).toString();
    await fetch(healthUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearSupabaseUnavailableMarker();
    return { available: true as const, reason: null };
  } catch {
    markSupabaseUnavailable();
    return {
      available: false as const,
      reason: LOCAL_SUPABASE_UNAVAILABLE_MESSAGE,
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
};
