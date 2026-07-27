import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/services/textProcessor", () => ({
  processTextAsync: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "../route";
import { processTextAsync } from "@/lib/services/textProcessor";

const mockedProcessTextAsync = vi.mocked(processTextAsync);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/process-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("POST /api/process-text", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedProcessTextAsync.mockResolvedValue(undefined);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it("returns 400 when text field is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "text is required" });
  });

  it("returns 400 when text is an empty string", async () => {
    const res = await POST(makeRequest({ text: "" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "text is required" });
  });

  it("returns 400 when text is only whitespace", async () => {
    const res = await POST(makeRequest({ text: "   \n\t  " }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "text is required" });
  });

  it("returns 400 when text is not a string", async () => {
    const res = await POST(makeRequest({ text: 42 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "text is required" });
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/process-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request body" });
  });

  it("does not call processTextAsync for invalid input", async () => {
    await POST(makeRequest({ text: "" }));
    expect(mockedProcessTextAsync).not.toHaveBeenCalled();
  });

  // ── Response shape ────────────────────────────────────────────────────────

  it("returns 201 with a botId for valid text", async () => {
    const res = await POST(makeRequest({ text: "Hello world." }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.botId).toBeDefined();
  });

  it("returns a valid UUID as botId", async () => {
    const res = await POST(makeRequest({ text: "Hello world." }));
    const { botId } = await res.json();
    expect(UUID_RE.test(botId)).toBe(true);
  });

  it("each request gets a unique botId", async () => {
    const [r1, r2] = await Promise.all([
      POST(makeRequest({ text: "first" })),
      POST(makeRequest({ text: "second" })),
    ]);
    const { botId: id1 } = await r1.json();
    const { botId: id2 } = await r2.json();
    expect(id1).not.toBe(id2);
  });

  it("responds immediately — before processing completes", async () => {
    let resolveProcess!: () => void;
    mockedProcessTextAsync.mockReturnValue(
      new Promise((r) => { resolveProcess = r; }),
    );

    const res = await POST(makeRequest({ text: "Hello world." }));
    expect(res.status).toBe(201);

    resolveProcess();
    await flushPromises();
  });

  // ── Service call ──────────────────────────────────────────────────────────

  it("calls processTextAsync with the botId and trimmed text", async () => {
    const res = await POST(makeRequest({ text: "  hello world  " }));
    const { botId } = await res.json();
    await flushPromises();

    expect(mockedProcessTextAsync).toHaveBeenCalledOnce();
    expect(mockedProcessTextAsync).toHaveBeenCalledWith(botId, "hello world");
  });

  it("does not crash the server when processTextAsync rejects", async () => {
    mockedProcessTextAsync.mockRejectedValue(new Error("LLM timeout"));

    const res = await POST(makeRequest({ text: "some text" }));
    expect(res.status).toBe(201);
    await flushPromises();
  });
});
