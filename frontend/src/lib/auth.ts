const LOCAL_SITE_URL = "http://localhost:3000/";
export const DEFAULT_POST_LOGIN_PATH = "/app#browse";

const normalizeBaseUrl = (value: string) => {
  const withProtocol =
    value.startsWith("http://") || value.startsWith("https://")
      ? value
      : `https://${value}`;

  return withProtocol.endsWith("/") ? withProtocol : `${withProtocol}/`;
};

type SiteUrlOptions = {
  browserOrigin?: string | null;
  envUrl?: string | null;
  vercelUrl?: string | null;
};

export const resolveSiteUrl = ({
  browserOrigin,
  envUrl,
  vercelUrl,
}: SiteUrlOptions = {}) => {
  if (browserOrigin) {
    return normalizeBaseUrl(browserOrigin);
  }

  const configuredUrl = envUrl ?? vercelUrl ?? "";

  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl);
  }

  return LOCAL_SITE_URL;
};

export const getSiteUrl = () => {
  return resolveSiteUrl({
    browserOrigin: typeof window !== "undefined" ? window.location.origin : null,
    envUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
  });
};

export const buildAuthRedirectUrl = (path = "/", baseUrl = getSiteUrl()) =>
  new URL(path.replace(/^\//, ""), baseUrl).toString();

const isSafeInternalPath = (value: string) => value.startsWith("/") && !value.startsWith("//");

export const resolvePostLoginPath = (nextPath?: string | null, fallback = DEFAULT_POST_LOGIN_PATH) => {
  const trimmed = nextPath?.trim();

  if (!trimmed || !isSafeInternalPath(trimmed)) {
    return fallback;
  }

  return trimmed;
};

export const buildSignInPath = (nextPath = DEFAULT_POST_LOGIN_PATH) => {
  const resolvedNextPath = resolvePostLoginPath(nextPath);

  if (resolvedNextPath === DEFAULT_POST_LOGIN_PATH) {
    return "/auth";
  }

  return `/auth?next=${encodeURIComponent(resolvedNextPath)}`;
};

export const buildAuthCallbackPath = (nextPath = DEFAULT_POST_LOGIN_PATH) => {
  const resolvedNextPath = resolvePostLoginPath(nextPath);

  if (resolvedNextPath === DEFAULT_POST_LOGIN_PATH) {
    return "/auth/callback";
  }

  return `/auth/callback?next=${encodeURIComponent(resolvedNextPath)}`;
};

export const getAuthCallbackError = () => {
  if (typeof window === "undefined") {
    return null;
  }

  for (const params of [
    new URLSearchParams(window.location.hash.replace(/^#/, "")),
    new URLSearchParams(window.location.search),
  ]) {
    const message = params.get("error_description") ?? params.get("error");
    if (message) {
      return message;
    }
  }

  return null;
};
