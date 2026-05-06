import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/services/windowBuffer", () => ({
  accumulate: vi.fn(),
  processWindow: vi.fn(),
  forceFlush: vi.fn(),
  drainAndCleanup: vi.fn(),
}));

vi.mock("@/lib/emitter/emitter", () => ({
  emitter: { emit: vi.fn() },
}));

vi.mock("@/lib/db/eventQueue", () => ({
  isConnected: vi.fn(),
}));

vi.mock("@/lib/services/eventsQueueProcessor", () => ({
  updateQueue: vi.fn(),
}));

import { processTextAsync } from "../textProcessor";
import { accumulate, processWindow, forceFlush, drainAndCleanup } from "@/lib/services/windowBuffer";
import { emitter } from "@/lib/emitter/emitter";
import { isConnected } from "@/lib/db/eventQueue";
import { updateQueue } from "@/lib/services/eventsQueueProcessor";

const mockedAccumulate = vi.mocked(accumulate);
const mockedProcessWindow = vi.mocked(processWindow);
const mockedForceFlush = vi.mocked(forceFlush);
const mockedDrainAndCleanup = vi.mocked(drainAndCleanup);
const mockedIsConnected = vi.mocked(isConnected);
const mockedUpdateQueue = vi.mocked(updateQueue);
const mockedEmit = vi.mocked(emitter.emit);

const BOT_ID = "test-bot-id";

function makeFakeNode(id: string) {
  return {
    id,
    content: "some content",
    name: "some name",
    parentId: null,
    prevSiblingId: null,
    nextSiblingId: null,
    firstChildId: null,
    lastChildId: null,
  };
}

describe("processTextAsync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedProcessWindow.mockResolvedValue(undefined);
    mockedDrainAndCleanup.mockResolvedValue(undefined);
    mockedForceFlush.mockResolvedValue(undefined);
    mockedIsConnected.mockReturnValue(false);
  });

  // ── TranscriptDataEvent construction ──────────────────────────────────────

  it("passes a TranscriptDataEvent with text split into words", async () => {
    await processTextAsync(BOT_ID, "hello world foo");

    expect(mockedAccumulate).toHaveBeenCalledTimes(1);
    const [calledBotId, event] = mockedAccumulate.mock.calls[0];
    expect(calledBotId).toBe(BOT_ID);
    expect(event.event).toBe("transcript.data");
    const words = event.data.data.words.map((w: { text: string }) => w.text);
    expect(words).toEqual(["hello", "world", "foo"]);
  });

  it("sets bot.id in the TranscriptDataEvent to the botId", async () => {
    await processTextAsync(BOT_ID, "test text");

    const [, event] = mockedAccumulate.mock.calls[0];
    expect(event.data.bot.id).toBe(BOT_ID);
  });

  it("splits on multiple consecutive spaces", async () => {
    await processTextAsync(BOT_ID, "word1  word2   word3");

    const [, event] = mockedAccumulate.mock.calls[0];
    const words = event.data.data.words.map((w: { text: string }) => w.text);
    expect(words).toEqual(["word1", "word2", "word3"]);
  });

  // ── Chunking ──────────────────────────────────────────────────────────────

  it("splits text above 100 words into multiple chunks", async () => {
    const words = Array.from({ length: 250 }, (_, i) => `word${i}`).join(" ");

    await processTextAsync(BOT_ID, words);

    // 250 words → chunks of 100, 100, 50 → 3 accumulate calls
    expect(mockedAccumulate).toHaveBeenCalledTimes(3);
    const firstChunk = mockedAccumulate.mock.calls[0][1].data.data.words;
    const secondChunk = mockedAccumulate.mock.calls[1][1].data.data.words;
    const thirdChunk = mockedAccumulate.mock.calls[2][1].data.data.words;
    expect(firstChunk).toHaveLength(100);
    expect(secondChunk).toHaveLength(100);
    expect(thirdChunk).toHaveLength(50);
  });

  it("calls processWindow once per chunk", async () => {
    const words = Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ");

    await processTextAsync(BOT_ID, words);

    expect(mockedProcessWindow).toHaveBeenCalledTimes(2);
    expect(mockedProcessWindow).toHaveBeenCalledWith(BOT_ID);
  });

  it("dispatches nodes returned by processWindow", async () => {
    const fakeNode = makeFakeNode("node-from-window");
    mockedProcessWindow.mockResolvedValueOnce([fakeNode] as never);
    mockedIsConnected.mockReturnValue(true);

    // Use enough words to trigger processWindow (short text still calls it once)
    await processTextAsync(BOT_ID, "some text");

    expect(mockedEmit).toHaveBeenCalledWith(BOT_ID, { node: fakeNode });
  });

  // ── Pipeline ordering ─────────────────────────────────────────────────────

  it("calls accumulate → processWindow → forceFlush → drainAndCleanup in order", async () => {
    const callOrder: string[] = [];
    mockedAccumulate.mockImplementation(() => { callOrder.push("accumulate"); });
    mockedProcessWindow.mockImplementation(async () => { callOrder.push("processWindow"); return undefined; });
    mockedForceFlush.mockImplementation(async () => { callOrder.push("forceFlush"); return undefined; });
    mockedDrainAndCleanup.mockImplementation(async () => { callOrder.push("drainAndCleanup"); });

    await processTextAsync(BOT_ID, "ordered test");

    expect(callOrder).toEqual(["accumulate", "processWindow", "forceFlush", "drainAndCleanup"]);
  });

  it("calls forceFlush with the correct botId", async () => {
    await processTextAsync(BOT_ID, "some text");
    expect(mockedForceFlush).toHaveBeenCalledWith(BOT_ID);
  });

  it("calls drainAndCleanup with the correct botId", async () => {
    await processTextAsync(BOT_ID, "some text");
    expect(mockedDrainAndCleanup).toHaveBeenCalledWith(BOT_ID);
  });

  // ── Node dispatch — connected client ──────────────────────────────────────

  it("emits nodes directly via emitter when client is connected", async () => {
    const fakeNode = makeFakeNode("node-1");
    mockedForceFlush.mockResolvedValue([fakeNode] as never);
    mockedIsConnected.mockReturnValue(true);

    await processTextAsync(BOT_ID, "some text");

    expect(mockedEmit).toHaveBeenCalledWith(BOT_ID, { node: fakeNode });
    expect(mockedUpdateQueue).not.toHaveBeenCalledWith(BOT_ID, { node: fakeNode });
  });

  it("does not call updateQueue for node payloads when client is connected", async () => {
    mockedForceFlush.mockResolvedValue([makeFakeNode("n1")] as never);
    mockedIsConnected.mockReturnValue(true);

    await processTextAsync(BOT_ID, "some text");

    const nodeQueueCalls = mockedUpdateQueue.mock.calls.filter(
      ([, p]) => (p as { node?: unknown })?.node !== undefined,
    );
    expect(nodeQueueCalls).toHaveLength(0);
  });

  // ── Node dispatch — disconnected client ───────────────────────────────────

  it("queues nodes via updateQueue when client is not connected", async () => {
    const fakeNode = makeFakeNode("node-2");
    mockedForceFlush.mockResolvedValue([fakeNode] as never);
    mockedIsConnected.mockReturnValue(false);

    await processTextAsync(BOT_ID, "some text");

    expect(mockedUpdateQueue).toHaveBeenCalledWith(BOT_ID, { node: fakeNode });
    expect(mockedEmit).not.toHaveBeenCalledWith(BOT_ID, { node: fakeNode });
  });

  it("does not emit node payloads via emitter when client is not connected", async () => {
    mockedForceFlush.mockResolvedValue([makeFakeNode("n2")] as never);
    mockedIsConnected.mockReturnValue(false);

    await processTextAsync(BOT_ID, "some text");

    const nodeEmitCalls = mockedEmit.mock.calls.filter(
      ([e, p]) => e === BOT_ID && (p as { node?: unknown })?.node !== undefined,
    );
    expect(nodeEmitCalls).toHaveLength(0);
  });

  // ── Empty / no nodes from forceFlush ─────────────────────────────────────

  it("dispatches no nodes when forceFlush returns undefined", async () => {
    mockedForceFlush.mockResolvedValue(undefined);
    mockedIsConnected.mockReturnValue(true);

    await processTextAsync(BOT_ID, "some text");

    const nodeEmitCalls = mockedEmit.mock.calls.filter(
      ([, p]) => (p as { node?: unknown })?.node !== undefined,
    );
    expect(nodeEmitCalls).toHaveLength(0);
    expect(mockedUpdateQueue).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ node: expect.anything() }),
    );
  });

  it("dispatches no nodes when forceFlush returns an empty array", async () => {
    mockedForceFlush.mockResolvedValue([] as never);
    mockedIsConnected.mockReturnValue(true);

    await processTextAsync(BOT_ID, "some text");

    const nodeEmitCalls = mockedEmit.mock.calls.filter(
      ([, p]) => (p as { node?: unknown })?.node !== undefined,
    );
    expect(nodeEmitCalls).toHaveLength(0);
  });

  // ── Ordering: nodes before terminal, terminal before close ───────────────

  it("dispatches all nodes before the terminal event", async () => {
    const nodeA = makeFakeNode("node-a");
    const nodeB = makeFakeNode("node-b");
    mockedForceFlush.mockResolvedValue([nodeA, nodeB] as never);
    mockedIsConnected.mockReturnValue(true);

    const emitOrder: unknown[] = [];
    mockedEmit.mockImplementation((_event, payload) => {
      emitOrder.push(payload);
      return true;
    });

    await processTextAsync(BOT_ID, "two topics");

    const nodeAIdx = emitOrder.findIndex(
      (p) => (p as { node?: { id: string } })?.node?.id === "node-a",
    );
    const nodeBIdx = emitOrder.findIndex(
      (p) => (p as { node?: { id: string } })?.node?.id === "node-b",
    );
    const terminalIdx = emitOrder.findIndex(
      (p) => (p as { eventData?: { event: string } })?.eventData?.event === "bot.done",
    );

    expect(nodeAIdx).toBeGreaterThanOrEqual(0);
    expect(nodeBIdx).toBeGreaterThanOrEqual(0);
    expect(terminalIdx).toBeGreaterThanOrEqual(0);
    expect(nodeAIdx).toBeLessThan(terminalIdx);
    expect(nodeBIdx).toBeLessThan(terminalIdx);
  });

  it("emits terminal bot.done event with the correct botId", async () => {
    mockedIsConnected.mockReturnValue(true);

    await processTextAsync(BOT_ID, "closing");

    expect(mockedEmit).toHaveBeenCalledWith(BOT_ID, {
      eventData: {
        event: "bot.done",
        data: { bot: { id: BOT_ID, metadata: {} } },
      },
    });
  });

  it("queues the terminal event when client is not connected", async () => {
    mockedIsConnected.mockReturnValue(false);

    await processTextAsync(BOT_ID, "closing");

    expect(mockedUpdateQueue).toHaveBeenCalledWith(BOT_ID, {
      eventData: {
        event: "bot.done",
        data: { bot: { id: BOT_ID, metadata: {} } },
      },
    });
  });

  it("emits the close signal after the terminal event", async () => {
    mockedIsConnected.mockReturnValue(true);

    const emitCalls: Array<[string | symbol, unknown?]> = [];
    mockedEmit.mockImplementation((event, payload) => {
      emitCalls.push([event, payload]);
      return true;
    });

    await processTextAsync(BOT_ID, "closing up");

    const terminalIdx = emitCalls.findIndex(
      ([, p]) => (p as { eventData?: { event: string } })?.eventData?.event === "bot.done",
    );
    const closeIdx = emitCalls.findIndex(([e]) => e === `${BOT_ID}:close`);

    expect(terminalIdx).toBeGreaterThanOrEqual(0);
    expect(closeIdx).toBeGreaterThanOrEqual(0);
    expect(terminalIdx).toBeLessThan(closeIdx);
  });

  it("always emits the close signal even when forceFlush returns no nodes", async () => {
    mockedForceFlush.mockResolvedValue(undefined);

    await processTextAsync(BOT_ID, "some text");

    expect(mockedEmit).toHaveBeenCalledWith(`${BOT_ID}:close`);
  });
});
