import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "../route";
import { update, flush, unregisterConnection } from "@/lib/db/eventQueue";
import { EventData } from "@/lib/types/event";

const BOT_ID = "bot-456";

const event1: EventData = {
  event: "transcript.data",
  data: { bot: { id: BOT_ID, metadata: {} } },
};
const event2: EventData = {
  event: "transcript.data",
  data: { bot: { id: BOT_ID, metadata: {} } },
};

describe("GET /api/recall/stream/:botId", () => {
  beforeEach(() => {
    flush(BOT_ID);
    unregisterConnection(BOT_ID);
  });

  afterEach(() => {
    flush(BOT_ID);
    unregisterConnection(BOT_ID);
  });

  it("sends queued events as first chunk when client connects", async () => {
    update(BOT_ID, event1);
    update(BOT_ID, event2);

    const abortController = new AbortController();
    const request = new Request(
      `http://localhost/api/recall/stream/${BOT_ID}`,
      { signal: abortController.signal },
    );

    const response = await GET(request, {
      params: Promise.resolve({ botId: BOT_ID }),
    });

    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    const { value: value1 } = await reader.read();
    const chunk1 = decoder.decode(value1);
    const { value: value2 } = await reader.read();
    const chunk2 = decoder.decode(value2);

    reader.cancel().catch(() => {});

    expect(chunk1).toMatch(/^data: /);
    expect(chunk2).toMatch(/^data: /);
    const payload1 = JSON.parse(chunk1.replace(/^data: /, "").trim());
    const payload2 = JSON.parse(chunk2.replace(/^data: /, "").trim());
    expect(payload1).toEqual(event1);
    expect(payload2).toEqual(event2);
  });
});
