import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/services/youtubeService", () => ({
  cancelYouTube: vi.fn(),
}));

import { POST } from "../route";
import { cancelYouTube } from "@/lib/services/youtubeService";

const BOT_ID = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/process-youtube/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/process-youtube/stop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and calls cancelYouTube for a valid botId", async () => {
    const res = await POST(makeRequest({ botId: BOT_ID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "stopped" });
    expect(vi.mocked(cancelYouTube)).toHaveBeenCalledWith(BOT_ID);
  });

  it("returns 400 for a missing botId", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request body" });
    expect(vi.mocked(cancelYouTube)).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-UUID botId", async () => {
    const res = await POST(makeRequest({ botId: "not-a-uuid" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request body" });
    expect(vi.mocked(cancelYouTube)).not.toHaveBeenCalled();
  });
});
