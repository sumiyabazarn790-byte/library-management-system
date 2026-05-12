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
});
