/** @type {import('next').NextConfig} */
const isVercelBuild = process.env.VERCEL === "1";
const isHostedBuild = Boolean(process.env.VERCEL) || Boolean(process.env.RENDER);
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

const getHostname = (value) => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
};

const isLoopbackUrl = (value) => {
  const hostname = getHostname(value?.trim());
  return hostname ? LOOPBACK_HOSTS.has(hostname) : false;
};

const validateHostedSupabaseEnv = () => {
  if (!isHostedBuild || process.env.SKIP_DEPLOY_ENV_VALIDATION === "1") {
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    "";
  const issues = [];

  if (!supabaseUrl) {
    issues.push("Missing NEXT_PUBLIC_SUPABASE_URL.");
  } else if (isLoopbackUrl(supabaseUrl)) {
    issues.push(
      `NEXT_PUBLIC_SUPABASE_URL points to a local address (${supabaseUrl}). Use your cloud Supabase URL when deploying.`,
    );
  }

  if (!publicKey) {
    issues.push("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  }

  if (issues.length > 0) {
    throw new Error(
      `Invalid hosted Supabase configuration:\n- ${issues.join("\n- ")}\nSet the values in Render/Vercel and redeploy.`,
    );
  }
};

validateHostedSupabaseEnv();

const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  ...(isVercelBuild ? {} : { output: "standalone" }),
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
