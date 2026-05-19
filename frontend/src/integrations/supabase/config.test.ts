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

  it("migrates known stale hosted projects to the active production Supabase project", () => {
    expect(
      resolveSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://zqzfbksoryafdymzrord.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_tDHilTgQswgrwopphkumAA_k--8ExEN",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      url: "https://origwdglnvvkilfuvrpa.supabase.co",
      publicKey: "sb_publishable_3FHQqosmVQiCDT46oHC17A_B19S8Arl",
      hasConfig: true,
      isLoopback: false,
      publicKeyEnvName: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    });
  });

  it("keeps local loopback config on loopback even when it is paired with a hosted key", () => {
    expect(
      resolveSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_tDHilTgQswgrwopphkumAA_k--8ExEN",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      url: "http://127.0.0.1:54321",
      publicKey: "sb_publishable_tDHilTgQswgrwopphkumAA_k--8ExEN",
      hasConfig: true,
      isLoopback: true,
      publicKeyEnvName: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    });
  });

  it("prefers the local anon key when loopback config also has a hosted publishable key", () => {
    expect(
      resolveSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_tDHilTgQswgrwopphkumAA_k--8ExEN",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-anon-jwt",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      url: "http://127.0.0.1:54321",
      publicKey: "local-anon-jwt",
      hasConfig: true,
      isLoopback: true,
      publicKeyEnvName: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    });
  });

  it("keeps local loopback development config untouched with a local anon key", () => {
    expect(
      resolveSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-anon-jwt",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      url: "http://127.0.0.1:54321",
      publicKey: "local-anon-jwt",
      hasConfig: true,
      isLoopback: true,
      publicKeyEnvName: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    });
  });
});
