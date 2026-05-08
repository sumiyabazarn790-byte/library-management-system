import { resolveSupabasePublicConfig } from "./config";

describe("resolveSupabasePublicConfig", () => {
  it("prefers NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY when both keys are present", () => {
    expect(
      resolveSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      url: "https://demo.supabase.co",
      publicKey: "publishable-key",
      hasConfig: true,
      isLoopback: false,
      publicKeyEnvName: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    });
  });

  it("falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY when the publishable key is absent", () => {
    expect(
      resolveSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      url: "https://demo.supabase.co",
      publicKey: "anon-key",
      hasConfig: true,
      isLoopback: false,
      publicKeyEnvName: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    });
  });

  it("reports missing config when the URL or public key is blank", () => {
    expect(
      resolveSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "   ",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "   ",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      url: "",
      publicKey: "",
      hasConfig: false,
      isLoopback: false,
      publicKeyEnvName: null,
    });
  });

  it("marks loopback Supabase URLs so hosted deployments can block them", () => {
    expect(
      resolveSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      url: "http://127.0.0.1:54321",
      publicKey: "publishable-key",
      hasConfig: true,
      isLoopback: true,
      publicKeyEnvName: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    });
  });
});
