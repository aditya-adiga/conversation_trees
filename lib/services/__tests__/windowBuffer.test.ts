import { describe, it, expect, beforeEach, vi } from "vitest";
import type { TranscriptDataEvent } from "../../types/event";

vi.mock("../openRouter", () => ({
  openRouter: {
    chat: {
      send: vi.fn(),
    },
  },
}));

vi.mock("../nodeService", () => ({
  createNode: vi.fn(),
}));

import { openRouter } from "../openRouter";
import { createNode } from "../nodeService";
import {
  accumulate,
  cleanupBuffer,
  processWindow,
  forceFlush,
  drainAndCleanup,
} from "../windowBuffer";

const mockedSend = vi.mocked(openRouter.chat.send);
const mockedCreateNode = vi.mocked(createNode);
const MIN_CHUNKS_FOR_SEGMENTATION = 12;

function makeChunk(words: string[], botId = "bot-1"): TranscriptDataEvent {
  return {
    event: "transcript.data" as const,
    data: {
      data: {
        words: words.map((text) => ({
          text,
          start_timestamp: { relative: 0, absolute: "2026-01-01T00:00:00Z" },
          end_timestamp: { relative: 1, absolute: "2026-01-01T00:00:01Z" },
        })),
        language_code: "en",
        participant: {
          id: 1,
          name: "Alice",
          is_host: true,
          platform: "zoom",
          extra_data: {},
        },
      },
      transcript: { id: "t-1", metadata: {} },
      realtime_endpoint: { id: "re-1", metadata: {} },
      recording: { id: "r-1", metadata: {} },
      bot: { id: botId, metadata: {} },
    },
  };
}

type LLMNode = {
  content: string;
  summary: string;
  parentId: string | null;
  parentBatchIndex?: number | null;
};

function makeLLMResponse(
  status: "generated" | "accumulating",
  nodes: LLMNode[] = [],
  chunksConsumed = 0,
) {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({ status, nodes, chunksConsumed }),
        },
      },
    ],
  };
}

function accumulateChunks(
  count = MIN_CHUNKS_FOR_SEGMENTATION,
  prefix = "chunk",
  botId = "bot-1",
) {
  for (let i = 1; i <= count; i += 1) {
    accumulate(botId, makeChunk([`${prefix}${i}`], botId));
  }
}

describe("windowBuffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanupBuffer("bot-1");
    cleanupBuffer("bot-2");
  });

  describe("accumulate", () => {
    it("should create a new buffer entry for a new botId", () => {
      const chunk = makeChunk(["hello", "world"]);

      accumulate("bot-1", chunk);

      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("accumulating") as never,
      );
      const result = processWindow("bot-1");
      expect(result).resolves.toBeUndefined();
    });

    it("should append chunks to an existing buffer", async () => {
      const chunk1 = makeChunk(["hello"]);
      const chunk2 = makeChunk(["world"]);

      accumulate("bot-1", chunk1);
      accumulate("bot-1", chunk2);
      accumulateChunks(10, "extra");

      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("accumulating") as never,
      );
      await processWindow("bot-1");

      expect(mockedSend).toHaveBeenCalledTimes(1);
      const prompt =
        mockedSend.mock.calls[0][0].chatGenerationParams.messages[0].content;
      expect(prompt).toContain("hello");
      expect(prompt).toContain("world");
    });

    it("should keep buffers separate per botId", async () => {
      const chunkA = makeChunk(["alpha"], "bot-1");
      const chunkB = makeChunk(["beta"], "bot-2");

      accumulate("bot-1", chunkA);
      accumulate("bot-2", chunkB);
      accumulateChunks(11, "bot-one-extra", "bot-1");
      accumulateChunks(11, "bot-two-extra", "bot-2");

      mockedSend.mockResolvedValue(
        makeLLMResponse("accumulating") as never,
      );

      await processWindow("bot-1");
      await processWindow("bot-2");

      expect(mockedSend).toHaveBeenCalledTimes(2);
      const prompt1 =
        mockedSend.mock.calls[0][0].chatGenerationParams.messages[0].content;
      const prompt2 =
        mockedSend.mock.calls[1][0].chatGenerationParams.messages[0].content;
      expect(prompt1).toContain("alpha");
      expect(prompt1).not.toContain("beta");
      expect(prompt2).toContain("beta");
      expect(prompt2).not.toContain("alpha");
    });
  });

  describe("processWindow", () => {
    it("should return undefined when no buffer exists for botId", async () => {
      const result = await processWindow("bot-1");

      expect(result).toBeUndefined();
      expect(mockedSend).not.toHaveBeenCalled();
    });

    it("should not call LLM before 12 transcript chunks have accumulated", async () => {
      accumulateChunks(MIN_CHUNKS_FOR_SEGMENTATION - 1);

      const result = await processWindow("bot-1");

      expect(result).toBeUndefined();
      expect(mockedSend).not.toHaveBeenCalled();
      expect(mockedCreateNode).not.toHaveBeenCalled();
    });

    it("should call LLM and return undefined when status is accumulating", async () => {
      accumulateChunks();
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("accumulating") as never,
      );

      const result = await processWindow("bot-1");

      expect(result).toBeUndefined();
      expect(mockedSend).toHaveBeenCalledTimes(1);
      expect(mockedCreateNode).not.toHaveBeenCalled();
    });

    it("should compact an accumulating batch so it does not rerun immediately", async () => {
      accumulateChunks();
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("accumulating") as never,
      );

      await processWindow("bot-1");
      await processWindow("bot-1");

      expect(mockedSend).toHaveBeenCalledTimes(1);
    });

    it("should create a node when LLM returns generated status", async () => {
      accumulateChunks();
      const nodePayload = {
        content: "discussing architecture",
        summary: "Architecture discussion",
        parentId: null,
      };
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("generated", [nodePayload], MIN_CHUNKS_FOR_SEGMENTATION) as never,
      );
      const fakeNode = {
        id: "node-uuid-1",
        ...nodePayload,
        prevSiblingId: null,
        nextSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      };
      mockedCreateNode.mockReturnValueOnce(fakeNode);

      const result = await processWindow("bot-1");

      expect(result).toEqual([fakeNode]);
      expect(mockedCreateNode).toHaveBeenCalledWith(nodePayload);
    });

    it("should remove fully consumed chunks before the next LLM call", async () => {
      accumulateChunks(MIN_CHUNKS_FOR_SEGMENTATION, "first");

      mockedSend.mockResolvedValueOnce(
        makeLLMResponse(
          "generated",
          [{ content: "first batch", summary: "First node", parentId: null }],
          MIN_CHUNKS_FOR_SEGMENTATION,
        ) as never,
      );
      mockedCreateNode.mockReturnValueOnce({
        id: "node-1",
        content: "first batch",
        summary: "First node",
        parentId: null,
        prevSiblingId: null,
        nextSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      });

      await processWindow("bot-1");

      accumulateChunks(MIN_CHUNKS_FOR_SEGMENTATION, "second");
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("accumulating") as never,
      );

      await processWindow("bot-1");

      const fullPrompt =
        mockedSend.mock.calls[1][0].chatGenerationParams.messages[0].content;
      const lines = fullPrompt.trimEnd().split("\n");
      const lastLine = lines[lines.length - 1].trim();
      expect(lastLine).toBe("[12] second12");
      // Only check numbered chunk lines (not tree context which may reference node content)
      const chunkLines = lines.filter((l: string) => /^\[\d+\]/.test(l.trim()));
      expect(chunkLines.filter((l: string) => l.includes("first"))).toHaveLength(0);
    });

    it("should compact unconsumed chunks into one chunk for the next batch", async () => {
      accumulateChunks();

      // LLM uses only the first two chunks, leaving the rest as carryover.
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse(
          "generated",
          [{ content: "chunk1 chunk2", summary: "First node", parentId: null }],
          2,
        ) as never,
      );
      mockedCreateNode.mockReturnValueOnce({
        id: "node-1",
        content: "chunk1 chunk2",
        summary: "First node",
        parentId: null,
        prevSiblingId: null,
        nextSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      });

      await processWindow("bot-1");

      accumulateChunks(MIN_CHUNKS_FOR_SEGMENTATION - 1, "next");
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("accumulating") as never,
      );
      await processWindow("bot-1");

      const prompt =
        mockedSend.mock.calls[1][0].chatGenerationParams.messages[0].content;
      const lines = prompt.trimEnd().split("\n");
      // Remaining chunks from the processed batch are merged into one numbered item.
      expect(
        lines.some((l: string) =>
          l.trim().startsWith("[1] chunk3 chunk4 chunk5"),
        ),
      ).toBe(true);
      // Only check numbered chunk lines (not tree context which may reference node content)
      const chunkLines = lines.filter((l: string) => /^\[\d+\]/.test(l.trim()));
      expect(
        chunkLines.filter(
          (l: string) => /\bchunk1\b|\bchunk2\b/.test(l),
        ),
      ).toHaveLength(0);
    });

    it("should create multiple nodes when LLM returns more than one", async () => {
      accumulateChunks();

      const nodeA = { content: "topic one", summary: "Topic A", parentId: null };
      const nodeB = { content: "topic two", summary: "Topic B", parentId: null };
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("generated", [nodeA, nodeB], MIN_CHUNKS_FOR_SEGMENTATION) as never,
      );
      const fakeNodeA = {
        id: "node-a",
        ...nodeA,
        prevSiblingId: null,
        nextSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      };
      const fakeNodeB = {
        id: "node-b",
        ...nodeB,
        prevSiblingId: null,
        nextSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      };
      mockedCreateNode
        .mockReturnValueOnce(fakeNodeA)
        .mockReturnValueOnce(fakeNodeB);

      const result = await processWindow("bot-1");

      expect(result).toEqual([fakeNodeA, fakeNodeB]);
      expect(mockedCreateNode).toHaveBeenCalledTimes(2);
      expect(mockedCreateNode).toHaveBeenNthCalledWith(1, nodeA);
      expect(mockedCreateNode).toHaveBeenNthCalledWith(2, nodeB);
    });

    it("should resolve parentBatchIndex for intra-batch parent references", async () => {
      accumulateChunks();

      const nodeSpecs = [
        { content: "parent topic", summary: "Parent", parentId: null, parentBatchIndex: null },
        { content: "child subtopic", summary: "Child", parentId: null, parentBatchIndex: 0 },
      ];
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("generated", nodeSpecs, MIN_CHUNKS_FOR_SEGMENTATION) as never,
      );
      const fakeParent = {
        id: "parent-id",
        content: "parent topic",
        summary: "Parent",
        parentId: null,
        prevSiblingId: null,
        nextSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      };
      const fakeChild = {
        id: "child-id",
        content: "child subtopic",
        summary: "Child",
        parentId: "parent-id",
        prevSiblingId: null,
        nextSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      };
      mockedCreateNode
        .mockReturnValueOnce(fakeParent)
        .mockReturnValueOnce(fakeChild);

      const result = await processWindow("bot-1");

      expect(result).toEqual([fakeParent, fakeChild]);
      expect(mockedCreateNode).toHaveBeenNthCalledWith(1, {
        content: "parent topic",
        summary: "Parent",
        parentId: null,
      });
      // Second node's parentId is resolved to the first node's real ID
      expect(mockedCreateNode).toHaveBeenNthCalledWith(2, {
        content: "child subtopic",
        summary: "Child",
        parentId: "parent-id",
      });
    });

    it("should include tree context from previously generated nodes", async () => {
      accumulateChunks(MIN_CHUNKS_FOR_SEGMENTATION, "first");
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse(
          "generated",
          [{ content: "first topic", summary: "Topic one", parentId: null }],
          MIN_CHUNKS_FOR_SEGMENTATION,
        ) as never,
      );
      mockedCreateNode.mockReturnValueOnce({
        id: "node-aaa",
        content: "first topic",
        summary: "Topic one",
        parentId: null,
        prevSiblingId: null,
        nextSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      });
      await processWindow("bot-1");

      accumulateChunks(MIN_CHUNKS_FOR_SEGMENTATION, "second");
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("accumulating") as never,
      );

      await processWindow("bot-1");

      const prompt =
        mockedSend.mock.calls[1][0].chatGenerationParams.messages[0].content;
      expect(prompt).toContain("node-aaa");
      expect(prompt).toContain("Topic one");
    });

    it("should skip LLM call when buffer has only empty/whitespace chunks", async () => {
      for (let i = 0; i < MIN_CHUNKS_FOR_SEGMENTATION; i += 1) {
        accumulate("bot-1", makeChunk(["", " "]));
      }

      const result = await processWindow("bot-1");

      expect(result).toBeUndefined();
      expect(mockedSend).not.toHaveBeenCalled();
    });

    it("should handle LLM response wrapped in markdown code fences", async () => {
      accumulateChunks();
      const nodePayload = {
        content: "hello",
        summary: "Greeting",
        parentId: null,
      };
      mockedSend.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: `\`\`\`json\n${JSON.stringify({ status: "generated", nodes: [nodePayload], chunksConsumed: 1 })}\n\`\`\``,
            },
          },
        ],
      } as never);
      mockedCreateNode.mockReturnValueOnce({
        id: "node-stripped",
        ...nodePayload,
        prevSiblingId: null,
        nextSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      });

      const result = await processWindow("bot-1");

      expect(result).toBeDefined();
      expect(result![0].id).toBe("node-stripped");
    });

    it("should not crash when LLM returns invalid JSON", async () => {
      accumulateChunks();
      mockedSend.mockResolvedValueOnce({
        choices: [{ message: { content: "not json at all" } }],
      } as never);

      const result = await processWindow("bot-1");

      expect(result).toBeUndefined();
    });

    it("should not crash when LLM response fails schema validation", async () => {
      accumulateChunks();
      mockedSend.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({ status: "unknown", nodes: [], chunksConsumed: 0 }),
            },
          },
        ],
      } as never);

      const result = await processWindow("bot-1");

      expect(result).toBeUndefined();
    });

    it("should deduplicate concurrent calls via inflight guard", async () => {
      accumulateChunks();
      mockedSend.mockResolvedValue(
        makeLLMResponse("accumulating") as never,
      );

      const p1 = processWindow("bot-1");
      const p2 = processWindow("bot-1");

      await Promise.all([p1, p2]);

      expect(mockedSend).toHaveBeenCalledTimes(1);
    });
  });

  describe("forceFlush", () => {
    it("should include force note in the LLM prompt", async () => {
      accumulate("bot-1", makeChunk(["final", "words"]));
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse(
          "generated",
          [{ content: "final words", summary: "Closing", parentId: null }],
          1,
        ) as never,
      );
      mockedCreateNode.mockReturnValueOnce({
        id: "forced-node",
        content: "final words",
        summary: "Closing",
        parentId: null,
        prevSiblingId: null,
        nextSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      });

      await forceFlush("bot-1");

      const prompt =
        mockedSend.mock.calls[0][0].chatGenerationParams.messages[0].content;
      expect(prompt).toContain("IMPORTANT");
      expect(prompt).toContain("You MUST generate a node now");
    });

    it("should return undefined when buffer is empty", async () => {
      const result = await forceFlush("bot-1");

      expect(result).toBeUndefined();
      expect(mockedSend).not.toHaveBeenCalled();
    });

    it("should return an array of nodes", async () => {
      accumulate("bot-1", makeChunk(["final", "words"]));
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse(
          "generated",
          [{ content: "final words", summary: "Closing", parentId: null }],
          1,
        ) as never,
      );
      const fakeNode = {
        id: "forced-node",
        content: "final words",
        summary: "Closing",
        parentId: null,
        prevSiblingId: null,
        nextSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      };
      mockedCreateNode.mockReturnValueOnce(fakeNode);

      const result = await forceFlush("bot-1");

      expect(result).toEqual([fakeNode]);
    });
  });

  describe("cleanupBuffer", () => {
    it("should remove all state for a botId", async () => {
      accumulate("bot-1", makeChunk(["data"]));

      cleanupBuffer("bot-1");

      const result = await processWindow("bot-1");
      expect(result).toBeUndefined();
      expect(mockedSend).not.toHaveBeenCalled();
    });
  });

  describe("drainAndCleanup", () => {
    it("should wait for pending processWindow calls then cleanup", async () => {
      accumulateChunks(MIN_CHUNKS_FOR_SEGMENTATION, "pending");

      let resolveOuter!: () => void;
      const blockingPromise = new Promise<void>((r) => {
        resolveOuter = r;
      });

      mockedSend.mockImplementationOnce(async () => {
        await blockingPromise;
        return makeLLMResponse("accumulating") as never;
      });

      const pw = processWindow("bot-1");
      const drain = drainAndCleanup("bot-1");

      resolveOuter();
      await pw;
      await drain;

      const result = await processWindow("bot-1");
      expect(result).toBeUndefined();
      expect(mockedSend).toHaveBeenCalledTimes(1);
    });

    it("should handle drain when no pending calls exist", async () => {
      await expect(drainAndCleanup("bot-1")).resolves.toBeUndefined();
    });
  });
});
