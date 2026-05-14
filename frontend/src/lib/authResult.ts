export type AuthReason =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "user_already_registered"
  | "provider_not_enabled"
  | "signup_disabled"
  | "invalid_api_key"
  | "unknown";

export type AuthResult = {
  error: string | null;
  reason?: AuthReason | null;
  emailConfirmationRequired?: boolean;
  autoConfirmed?: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
  } | null;
};

export const mapAuthError = (message: string | null | undefined): Pick<AuthResult, "error" | "reason"> => {
  if (!message) {
    return { error: null, reason: null };
  }

  if (/invalid login credentials/i.test(message)) {
    return {
      error: "Invalid email or password.",
      reason: "invalid_credentials",
    };
  }

  if (/email not confirmed/i.test(message)) {
    return {
      error: "Please confirm your email before signing in.",
      reason: "email_not_confirmed",
    };
  }

  if (/user already registered/i.test(message)) {
    return {
      error: "This email is already registered.",
      reason: "user_already_registered",
    };
  }

  if (/provider is not enabled/i.test(message) || /unsupported provider/i.test(message)) {
    return {
      error: "Google login is not enabled in your Supabase project.",
      reason: "provider_not_enabled",
    };
  }

  if (/signup is disabled/i.test(message)) {
    return {
      error: "Signups are currently disabled.",
      reason: "signup_disabled",
    };
  }

  if (/invalid api key/i.test(message)) {
    return {
      error: "Supabase API key and URL do not match. Check your Supabase environment variables and restart the app.",
      reason: "invalid_api_key",
    };
  }

  return {
    error: message,
    reason: "unknown",
  };
};
