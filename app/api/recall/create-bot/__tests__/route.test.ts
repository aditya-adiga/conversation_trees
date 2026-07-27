import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "../route";
import { emitter } from "@/lib/emitter/emitter";
import { clearCurrentBot } from "@/lib/db/streamSessions";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/recall/create-bot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const MEETING_URL = "https://meet.google.com/abc-defg-hij";
const CLIENT_SESSION_ID = "11111111-1111-4111-8111-111111111111";
const validBody = {
  url: MEETING_URL,
  clientSessionId: CLIENT_SESSION_ID,
};

describe("POST /api/recall/create-bot", () => {
  beforeEach(() => {
    vi.stubEnv("RECALL_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("RECALL_REGION", "us-west-2");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.ngrok.app");
  });

  afterEach(() => {
    clearCurrentBot(CLIENT_SESSION_ID);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

    const res = await POST(makeRequest(validBody));
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

    const res = await POST(makeRequest(validBody));
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

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Bad request" });
  });

  it("returns 400 when clientSessionId is missing", async () => {
    const res = await POST(makeRequest({ url: MEETING_URL }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request body" });
  });

  it("closes the previous stream for the same client session", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/leave_call/")) {
        return Promise.resolve({ ok: true, status: 200 });
      }

      const id =
        fetchMock.mock.calls.filter(([calledUrl]) =>
          String(calledUrl).includes("/api/v1/bot"),
        ).length === 1
          ? "old-bot-id"
          : "new-bot-id";

      return Promise.resolve({
        status: 201,
        json: async () => ({ id, status: "ready" }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const emitSpy = vi.spyOn(emitter, "emit");

    await POST(makeRequest(validBody));
    await POST(makeRequest(validBody));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(emitSpy).toHaveBeenCalledWith("old-bot-id:close");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://us-west-2.recall.ai/api/v1/bot/old-bot-id/leave_call/",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
