import { mapAuthError } from "./authResult";

describe("auth result mapping", () => {
  it("maps unconfirmed email errors to the shared auth reason", () => {
    expect(mapAuthError("Email not confirmed")).toEqual({
      error: "Please confirm your email before signing in.",
      reason: "email_not_confirmed",
    });
  });

  it("maps duplicate email errors for signup flows", () => {
    expect(mapAuthError("User already registered")).toEqual({
      error: "This email is already registered.",
      reason: "user_already_registered",
    });
  });

  it("maps Supabase API key mismatch errors", () => {
    expect(mapAuthError("Invalid API key")).toEqual({
      error: "Supabase API key and URL do not match. Check your Supabase environment variables and restart the app.",
      reason: "invalid_api_key",
    });
  });

  it("maps auth email rate limit errors", () => {
    expect(mapAuthError("email rate limit exceeded")).toEqual({
      error: "Too many auth emails were requested recently. Wait a bit and try again.",
      reason: "rate_limited",
    });
  });
});
