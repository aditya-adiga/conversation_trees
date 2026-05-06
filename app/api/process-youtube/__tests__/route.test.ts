import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/services/youtubeService", () => ({
  processYouTube: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "../route";
import { processYouTube } from "@/lib/services/youtubeService";

const mockedProcessYouTube = vi.mocked(processYouTube);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/process-youtube", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("POST /api/process-youtube", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedProcessYouTube.mockResolvedValue(undefined);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it("returns 400 when url field is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "url is required" });
  });

  it("returns 400 when url is an empty string", async () => {
    const res = await POST(makeRequest({ url: "" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "url is required" });
  });

  it("returns 400 when url is only whitespace", async () => {
    const res = await POST(makeRequest({ url: "   " }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "url is required" });
  });

  it("returns 400 when url is not a string", async () => {
    const res = await POST(makeRequest({ url: 123 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "url is required" });
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/process-youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request body" });
  });

  it("does not call processYouTube for invalid input", async () => {
    await POST(makeRequest({ url: "" }));
    expect(mockedProcessYouTube).not.toHaveBeenCalled();
  });

  // ── Response shape ────────────────────────────────────────────────────────

  it("returns 201 with a botId for a valid url", async () => {
    const res = await POST(makeRequest({ url: YOUTUBE_URL }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.botId).toBeDefined();
  });

  it("returns a valid UUID as botId", async () => {
    const res = await POST(makeRequest({ url: YOUTUBE_URL }));
    const { botId } = await res.json();
    expect(UUID_RE.test(botId)).toBe(true);
  });

  it("each request gets a unique botId", async () => {
    const [r1, r2] = await Promise.all([
      POST(makeRequest({ url: YOUTUBE_URL })),
      POST(makeRequest({ url: YOUTUBE_URL })),
    ]);
    const { botId: id1 } = await r1.json();
    const { botId: id2 } = await r2.json();
    expect(id1).not.toBe(id2);
  });

  it("responds immediately — before processing completes", async () => {
    let resolveProcess!: () => void;
    mockedProcessYouTube.mockReturnValue(
      new Promise((r) => { resolveProcess = r; }),
    );

    const res = await POST(makeRequest({ url: YOUTUBE_URL }));
    expect(res.status).toBe(201);

    resolveProcess();
    await flushPromises();
  });

  // ── Service call ──────────────────────────────────────────────────────────

  it("calls processYouTube with the trimmed url and botId", async () => {
    const res = await POST(makeRequest({ url: `  ${YOUTUBE_URL}  ` }));
    const { botId } = await res.json();
    await flushPromises();

    expect(mockedProcessYouTube).toHaveBeenCalledOnce();
    expect(mockedProcessYouTube).toHaveBeenCalledWith(YOUTUBE_URL, botId);
  });

  it("does not crash the server when processYouTube rejects", async () => {
    mockedProcessYouTube.mockRejectedValue(new Error("Transcript unavailable"));

    const res = await POST(makeRequest({ url: YOUTUBE_URL }));
    expect(res.status).toBe(201);
    await flushPromises();
  });
});
