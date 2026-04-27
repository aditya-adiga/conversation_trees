import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/services/eventsQueueProcessor", () => ({
  flushQueue: vi.fn(),
  updateQueue: vi.fn(),
}));

import { POST } from "../route";
import { emitter } from "@/lib/emitter/emitter";
import { registerConnection, unregisterConnection } from "@/lib/db/eventQueue";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/webhooks/recall/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const BOT_ID = "bot-123";
const validPayload = {
  event: "transcript.data",
  data: { bot: { id: BOT_ID, metadata: {} } },
};

describe("POST /api/webhooks/recall/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    unregisterConnection(BOT_ID);
  });

  // Test 1 — Malformed webhook payload (issue #4)
  it("returns 400 for a malformed payload", async () => {
    const res = await POST(makeRequest({ garbage: true }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid payload" });
  });

  // Test 2 — Valid webhook payload
  it("returns 200 with { status: 201 } for a valid payload", async () => {
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 201 });
  });

  // Test 3 — Terminal event ordering (issue #3)
  it("emits event data before the close signal for a connected client", async () => {
    registerConnection(BOT_ID);

    const emitOrder: string[] = [];
    const spy = vi.spyOn(emitter, "emit").mockImplementation(
      (event: string | symbol) => {
        emitOrder.push(event as string);
        return true;
      },
    );

    await POST(
      makeRequest({ event: "bot.done", data: { bot: { id: BOT_ID, metadata: {} } } }),
    );

    const dataIdx = emitOrder.indexOf(BOT_ID);
    const closeIdx = emitOrder.indexOf(`${BOT_ID}:close`);

    expect(dataIdx).toBeGreaterThanOrEqual(0);
    expect(closeIdx).toBeGreaterThanOrEqual(0);
    expect(dataIdx).toBeLessThan(closeIdx);

    spy.mockRestore();
  });
});
