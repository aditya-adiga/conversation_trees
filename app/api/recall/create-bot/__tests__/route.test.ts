import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "../route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/recall/create-bot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const MEETING_URL = "https://meet.google.com/abc-defg-hij";

describe("POST /api/recall/create-bot", () => {
  beforeEach(() => {
    vi.stubEnv("RECALL_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("RECALL_REGION", "us-west-2");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.ngrok.app");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 201 with a bot object containing an id", async () => {
    const mockBot = { id: "bot-abc123", status: "ready" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 201,
        json: async () => mockBot,
      }),
    );

    const res = await POST(makeRequest({ url: MEETING_URL }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
  });

  it("returns 401 with { error: 'Bad request' } for an invalid token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 401,
        json: async () => ({ detail: "Invalid token." }),
      }),
    );

    const res = await POST(makeRequest({ url: MEETING_URL }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Bad request" });
  });

  it("returns 400 with { error: 'Bad request' } for a bad request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 400,
        json: async () => ({ detail: "Invalid meeting URL." }),
      }),
    );

    const res = await POST(makeRequest({ url: MEETING_URL }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Bad request" });
  });
});
