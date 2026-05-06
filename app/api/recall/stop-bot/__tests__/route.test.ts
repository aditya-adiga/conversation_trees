import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "../route";

const BOT_ID = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/recall/stop-bot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/recall/stop-bot", () => {
  beforeEach(() => {
    vi.stubEnv("RECALL_API_KEY", "test-key");
    vi.stubEnv("RECALL_REGION", "us-west-2");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 200 when Recall removes the bot from the call", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(makeRequest({ botId: BOT_ID }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "stopped" });
    expect(fetchMock).toHaveBeenCalledWith(
      `https://us-west-2.recall.ai/api/v1/bot/${BOT_ID}/leave_call/`,
      {
        method: "POST",
        headers: {
          Authorization: "Token test-key",
        },
      },
    );
  });

  it("returns 400 for a missing botId", async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request body" });
  });

  it("returns 400 for an invalid botId", async () => {
    const res = await POST(makeRequest({ botId: "not-a-uuid" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request body" });
  });

  it("returns Recall's status when stop fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      }),
    );

    const res = await POST(makeRequest({ botId: BOT_ID }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Failed to stop Recall bot" });
  });
});
