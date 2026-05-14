import { POST } from "./route";
import {
  createSupabasePublicServerClient,
  createSupabaseServerClients,
  isLoopbackSupabaseServerConfig,
} from "../_shared/supabaseAuth";

vi.mock("../_shared/supabaseAuth", () => ({
  createSupabasePublicServerClient: vi.fn(),
  createSupabaseServerClients: vi.fn(),
  isLoopbackSupabaseServerConfig: vi.fn(),
  normalizeDisplayName: (value: unknown) => (typeof value === "string" ? value.trim() : ""),
  normalizeEmail: (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : ""),
  normalizePassword: (value: unknown) => (typeof value === "string" ? value : ""),
  syncAdminRoleForEmail: vi.fn(),
}));

describe("signup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an actionable local error when the admin client is unavailable on loopback supabase", async () => {
    vi.mocked(createSupabaseServerClients).mockImplementation(() => {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.");
    });
    vi.mocked(isLoopbackSupabaseServerConfig).mockReturnValue(true);

    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          password: "password123",
          displayName: "Tester",
        }),
      }),
    );

    expect(response.status).toBe(500);
    expect(vi.mocked(createSupabasePublicServerClient)).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error:
        "Local signup needs a working Supabase admin key. Add SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) to frontend/.env.local. If you changed backend/supabase/config.toml, restart local Supabase and try again.",
      reason: "unknown",
    });
  });

  it("keeps the hosted-project fallback to public signup", async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    vi.mocked(createSupabaseServerClients).mockImplementation(() => {
      throw new Error("Invalid API key");
    });
    vi.mocked(isLoopbackSupabaseServerConfig).mockReturnValue(false);
    vi.mocked(createSupabasePublicServerClient).mockReturnValue({
      auth: { signUp },
    } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          password: "password123",
          displayName: "Tester",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
      options: {
        data: {
          display_name: "Tester",
        },
      },
    });
    await expect(response.json()).resolves.toEqual({
      error: null,
      reason: null,
      emailConfirmationRequired: true,
      session: null,
    });
  });
});
