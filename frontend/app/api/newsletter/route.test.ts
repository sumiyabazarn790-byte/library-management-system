import { POST } from "./route";
import { createSupabasePublicServerClient, createSupabaseServerClients } from "../auth/_shared/supabaseAuth";

vi.mock("../auth/_shared/supabaseAuth", () => ({
  createSupabasePublicServerClient: vi.fn(),
  createSupabaseServerClients: vi.fn(),
  normalizeEmail: (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : ""),
}));

const request = (body: unknown) =>
  new Request("http://localhost/api/newsletter", {
    method: "POST",
    body: JSON.stringify(body),
  });

const mockInsert = (result: unknown) => {
  const insert = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ insert });

  vi.mocked(createSupabaseServerClients).mockReturnValue({
    adminClient: { from },
  } as never);

  return { from, insert };
};

describe("newsletter route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid email addresses", async () => {
    const response = await POST(request({ email: "not-an-email" }));

    expect(response.status).toBe(400);
    expect(vi.mocked(createSupabaseServerClients)).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Please enter a valid email address.",
    });
  });

  it("subscribes with a normalized email address", async () => {
    const { from, insert } = mockInsert({ error: null });

    const response = await POST(request({ email: " Reader@Example.COM " }));

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("newsletter_subscribers");
    expect(insert).toHaveBeenCalledWith({
      email: "reader@example.com",
      source: "footer",
    });
    await expect(response.json()).resolves.toEqual({
      error: null,
      status: "subscribed",
    });
  });

  it("treats duplicate emails as an already subscribed success", async () => {
    mockInsert({ error: { code: "23505", message: "duplicate key value violates unique constraint" } });

    const response = await POST(request({ email: "reader@example.com" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      error: null,
      status: "already_subscribed",
    });
  });

  it("falls back to the public server client when no admin client is configured", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });

    vi.mocked(createSupabaseServerClients).mockImplementation(() => {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.");
    });
    vi.mocked(createSupabasePublicServerClient).mockReturnValue({ from } as never);

    const response = await POST(request({ email: "reader@example.com" }));

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("newsletter_subscribers");
  });
});
