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

    it("should call LLM and return undefined when status is accumulating", async () => {
      accumulate("bot-1", makeChunk(["some", "text"]));
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("accumulating") as never,
      );

      const result = await processWindow("bot-1");

      expect(result).toBeUndefined();
      expect(mockedSend).toHaveBeenCalledTimes(1);
      expect(mockedCreateNode).not.toHaveBeenCalled();
    });

    it("should create a node when LLM returns generated status", async () => {
      accumulate("bot-1", makeChunk(["discussing", "architecture"]));
      const nodePayload = {
        content: "discussing architecture",
        summary: "Architecture discussion",
        parentId: null,
      };
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("generated", [nodePayload], 1) as never,
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

    it("should advance the cursor by chunksConsumed after generating a node", async () => {
      accumulate("bot-1", makeChunk(["chunk1"]));
      accumulate("bot-1", makeChunk(["chunk2"]));

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

      accumulate("bot-1", makeChunk(["chunk3"]));
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("accumulating") as never,
      );

      await processWindow("bot-1");

      const fullPrompt =
        mockedSend.mock.calls[1][0].chatGenerationParams.messages[0].content;
      const lines = fullPrompt.trimEnd().split("\n");
      const lastLine = lines[lines.length - 1].trim();
      expect(lastLine).toBe("[1] chunk3");
      // Only check numbered chunk lines (not tree context which may reference node content)
      const chunkLines = lines.filter((l: string) => /^\[\d+\]/.test(l.trim()));
      expect(chunkLines.filter((l: string) => l.includes("chunk1") || l.includes("chunk2"))).toHaveLength(0);
    });

    it("should only advance cursor by chunksConsumed, leaving remaining chunks for next call", async () => {
      accumulate("bot-1", makeChunk(["chunk1"]));
      accumulate("bot-1", makeChunk(["chunk2"]));
      accumulate("bot-1", makeChunk(["chunk3"]));

      // LLM uses only the first 2 of 3 chunks
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

      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("accumulating") as never,
      );
      await processWindow("bot-1");

      const prompt =
        mockedSend.mock.calls[1][0].chatGenerationParams.messages[0].content;
      const lines = prompt.trimEnd().split("\n");
      // chunk3 is the only remaining chunk, numbered [1]
      expect(lines.some((l: string) => l.trim() === "[1] chunk3")).toBe(true);
      // Only check numbered chunk lines (not tree context which may reference node content)
      const chunkLines = lines.filter((l: string) => /^\[\d+\]/.test(l.trim()));
      expect(chunkLines.filter((l: string) => l.includes("chunk1") || l.includes("chunk2"))).toHaveLength(0);
    });

    it("should create multiple nodes when LLM returns more than one", async () => {
      accumulate("bot-1", makeChunk(["topic", "one"]));
      accumulate("bot-1", makeChunk(["topic", "two"]));

      const nodeA = { content: "topic one", summary: "Topic A", parentId: null };
      const nodeB = { content: "topic two", summary: "Topic B", parentId: null };
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("generated", [nodeA, nodeB], 2) as never,
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
      accumulate("bot-1", makeChunk(["parent", "topic"]));
      accumulate("bot-1", makeChunk(["child", "subtopic"]));

      const nodeSpecs = [
        { content: "parent topic", summary: "Parent", parentId: null, parentBatchIndex: null },
        { content: "child subtopic", summary: "Child", parentId: null, parentBatchIndex: 0 },
      ];
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse("generated", nodeSpecs, 2) as never,
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
      accumulate("bot-1", makeChunk(["first", "topic"]));
      mockedSend.mockResolvedValueOnce(
        makeLLMResponse(
          "generated",
          [{ content: "first topic", summary: "Topic one", parentId: null }],
          1,
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

      accumulate("bot-1", makeChunk(["second", "topic"]));
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
      accumulate("bot-1", makeChunk(["", " "]));

      const result = await processWindow("bot-1");

      expect(result).toBeUndefined();
      expect(mockedSend).not.toHaveBeenCalled();
    });

    it("should handle LLM response wrapped in markdown code fences", async () => {
      accumulate("bot-1", makeChunk(["hello"]));
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
      accumulate("bot-1", makeChunk(["hello"]));
      mockedSend.mockResolvedValueOnce({
        choices: [{ message: { content: "not json at all" } }],
      } as never);

      const result = await processWindow("bot-1");

      expect(result).toBeUndefined();
    });

    it("should not crash when LLM response fails schema validation", async () => {
      accumulate("bot-1", makeChunk(["hello"]));
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
      accumulate("bot-1", makeChunk(["hello"]));
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
      accumulate("bot-1", makeChunk(["pending", "work"]));

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
