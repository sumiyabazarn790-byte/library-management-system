import {
  isLoopbackHostname,
  SUPABASE_PUBLIC_KEY_ENV_LABEL,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  SUPABASE_URL_IS_LOOPBACK,
} from "./config";

const UNAVAILABLE_FLAG_KEY = "lumina.supabase.loopback.unavailable";
export const SUPABASE_AVAILABILITY_CHANGE_EVENT = "lumina:supabase-availability-change";

export const LOCAL_SUPABASE_UNAVAILABLE_MESSAGE =
  "Local Supabase backend is not running. Start Docker Desktop, run `supabase start --workdir backend`, or update frontend/.env.local with your cloud project URL and publishable key.";
export const DEPLOYED_LOOPBACK_SUPABASE_MESSAGE =
  "This deployed app is still pointing at a local Supabase URL. In Render or Vercel, set NEXT_PUBLIC_SUPABASE_URL to your cloud Supabase project URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your public key, then redeploy.";
export const CLOUD_SUPABASE_UNAVAILABLE_MESSAGE =
  "Supabase project URL could not be reached. Check NEXT_PUBLIC_SUPABASE_URL, confirm the project still exists, or switch frontend/.env.local to your local Supabase URL.";
export const MISSING_SUPABASE_CONFIG_MESSAGE =
  `Missing NEXT_PUBLIC_SUPABASE_URL or a public Supabase key. Add ${SUPABASE_PUBLIC_KEY_ENV_LABEL} in your deployment environment settings.`;

const hasWindow = () => typeof window !== "undefined";
const isLoopbackBrowserHost = () => hasWindow() && isLoopbackHostname(window.location.hostname);
const getSupabaseConfigReason = () => {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return MISSING_SUPABASE_CONFIG_MESSAGE;
  }

  if (SUPABASE_URL_IS_LOOPBACK && hasWindow() && !isLoopbackBrowserHost()) {
    return DEPLOYED_LOOPBACK_SUPABASE_MESSAGE;
  }

  return null;
};

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
  return isLoopbackHostname(hostname);
})();

export const getDefaultSupabaseUnavailableMessage = () =>
  isLoopbackSupabaseUrl
    ? !hasWindow() || isLoopbackBrowserHost()
      ? LOCAL_SUPABASE_UNAVAILABLE_MESSAGE
      : DEPLOYED_LOOPBACK_SUPABASE_MESSAGE
    : CLOUD_SUPABASE_UNAVAILABLE_MESSAGE;

const SUPABASE_STORAGE_KEY = (() => {
  const hostname = getSupabaseHostname();
  return hostname ? `sb-${hostname.split(".")[0]}-auth-token` : "sb-local-auth-token";
})();

const dispatchAvailabilityChange = (reason: string | null) => {
  if (!hasWindow()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SUPABASE_AVAILABILITY_CHANGE_EVENT, {
      detail: { reason },
    }),
  );
};

export const getSupabaseUnavailableReason = () => {
  const configReason = getSupabaseConfigReason();
  if (configReason) {
    return configReason;
  }

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
  reason = getDefaultSupabaseUnavailableMessage(),
) => {
  if (!hasWindow()) {
    return;
  }

  window.sessionStorage.setItem(UNAVAILABLE_FLAG_KEY, reason);
  clearPersistedSupabaseSession();
  dispatchAvailabilityChange(reason);
};

export const clearSupabaseUnavailableMarker = () => {
  if (!hasWindow()) {
    return;
  }

  window.sessionStorage.removeItem(UNAVAILABLE_FLAG_KEY);
  dispatchAvailabilityChange(null);
};

export const primeSupabaseAvailability = async () => {
  const configReason = getSupabaseConfigReason();

  if (configReason) {
    return {
      available: false as const,
      reason: configReason,
    };
  }

  if (!hasWindow()) {
    return { available: true as const, reason: null };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 1500);

  try {
    const healthUrl = new URL("/auth/v1/health", SUPABASE_URL).toString();
    const response = await fetch(healthUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Supabase auth health check failed with status ${response.status}`);
    }

    clearSupabaseUnavailableMarker();
    return { available: true as const, reason: null };
  } catch {
    const reason = getDefaultSupabaseUnavailableMessage();
    markSupabaseUnavailable(reason);
    return {
      available: false as const,
      reason,
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
};
