import { buildAuthRedirectUrl, resolveSiteUrl } from "./auth";

describe("auth URL helpers", () => {
  it("prefers the active browser origin over env configuration", () => {
    expect(
      resolveSiteUrl({
        browserOrigin: "http://127.0.0.1:3001",
        envUrl: "http://localhost:3000",
      }),
    ).toBe("http://127.0.0.1:3001/");
  });

  it("falls back to configured env URLs when no browser origin is available", () => {
    expect(
      resolveSiteUrl({
        envUrl: "archive.example.com",
      }),
    ).toBe("https://archive.example.com/");
  });

  it("builds callback URLs against the resolved site origin", () => {
    expect(buildAuthRedirectUrl("/auth/callback", "http://127.0.0.1:3001/")).toBe(
      "http://127.0.0.1:3001/auth/callback",
    );
  });
});
