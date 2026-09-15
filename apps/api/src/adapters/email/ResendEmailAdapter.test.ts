import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ResendEmailAdapter } from "./ResendEmailAdapter";

describe("ResendEmailAdapter", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("POSTs to Resend's API with the expected headers and body", async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 200 }));

    const adapter = new ResendEmailAdapter("re_test_key", "Nouveau <onboarding@nouveau.example>");
    await adapter.send({ to: "user@example.com", subject: "Hi", text: "Hello there" });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(global.fetch).mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer re_test_key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init?.body as string)).toEqual({
      from: "Nouveau <onboarding@nouveau.example>",
      to: "user@example.com",
      subject: "Hi",
      text: "Hello there",
    });
  });

  it("resolves without throwing on a 2xx response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 202 }));
    const adapter = new ResendEmailAdapter("re_test_key", "from@example.com");

    await expect(adapter.send({ to: "user@example.com", subject: "s", text: "t" })).resolves.toBeUndefined();
  });

  it("throws on a non-ok response without leaking the API key or response body", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "invalid api key re_test_key" }), { status: 401 })
    );
    const adapter = new ResendEmailAdapter("re_test_key", "from@example.com");

    await expect(adapter.send({ to: "user@example.com", subject: "s", text: "t" })).rejects.toThrow(
      "Resend email send failed with status 401"
    );

    try {
      await adapter.send({ to: "user@example.com", subject: "s", text: "t" });
    } catch (err) {
      expect((err as Error).message).not.toContain("re_test_key");
    }
  });
});
