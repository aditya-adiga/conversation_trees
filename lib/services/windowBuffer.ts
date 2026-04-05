import { z } from "zod";
import { BotBuffer, TranscriptDataEvent } from "../types/event";
import { openRouter } from "./openRouter";
import { createNode } from "./nodeService";

const LLMResponseSchema = z.object({
  status: z.enum(["generated", "accumulating"]),
  node: z
    .object({
      content: z.string(),
      summary: z.string(),
      parentId: z.string().uuid().nullable(),
    })
    .nullable(),
});

// Stores transcription, calls LLM to generate new nodes, saves new nodes to in-memory db
const windowBuffer = new Map<string, BotBuffer>();
const locks = new Map<string, Promise<void>>();
// skip queueing a new LLM call while one is already in-flight. New chunks are accumulated in the buffer and picked up by the next call
const inflight = new Set<string>();

// Each call chains onto the previous one's promise, so concurrent webhook requests queue up rather than racing to read and update the buffer.
function withLock<T>(botId: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(botId) ?? Promise.resolve();
  const current = prev.then(() => fn());
  locks.set(
    botId,
    current.then(
      () => {},
      () => {},
    ),
  );
  return current;
}

export function accumulate(
  botId: string,
  transcript_chunk: TranscriptDataEvent,
) {
  const buffer = windowBuffer.get(botId);

  const text = transcript_chunk.data.data.words.map((w) => w.text).join(" ");
  const chunkIndex = (buffer?.chunks.length ?? 0);
  console.log(`[WindowBuffer:${botId}] Accumulated chunk #${chunkIndex}: "${text}"`);

  windowBuffer.set(botId, {
    chunks: [...(buffer?.chunks ?? []), transcript_chunk],
    cursor: buffer?.cursor ?? 0,
    nodes: buffer?.nodes ?? [],
  });
}

function prepareChunks(buffer: BotBuffer) {
  const window = buffer?.chunks.slice(buffer.cursor);
  const windowSize = window?.length;
  const accumulated_context = window
    ?.map((chunk) => {
      const text = chunk.data.data.words.map((word) => word.text).join(" ");
      return text;
    })
    .join("\n");

  return { accumulated_context, windowSize };
}

export function cleanupBuffer(botId: string) {
  windowBuffer.delete(botId);
  locks.delete(botId);
  inflight.delete(botId);
}

// Waits for all queued processWindow calls to finish, then cleans up.
// Use this on terminal events so in-flight LLM results are not lost.
export async function drainAndCleanup(botId: string): Promise<void> {
  const pending = locks.get(botId);
  if (pending) {
    console.log(
      `[WindowBuffer:${botId}] Draining ${locks.size} pending processWindow call(s)...`,
    );
    await pending;
    console.log(`[WindowBuffer:${botId}] Drain complete`);
  }
  cleanupBuffer(botId);
}

function buildTreeContext(nodes: BotBuffer["nodes"]): string {
  if (nodes.length === 0) return "";

  const reversed = [...nodes].reverse();
  const lines = reversed.map(
    (n) =>
      `- Node ${n.id} (parent: ${n.parentId ?? "root"})\n  Summary: ${n.summary}\n  Content: ${n.content}`,
  );

  return `\n\nExisting conversation tree nodes (most recent first):\n${lines.join("\n")}\n`;
}

async function processWindowInner(botId: string, opts: { force?: boolean } = {}) {
  const buffer = windowBuffer.get(botId);

  if (!buffer) return;

  const { accumulated_context, windowSize } = prepareChunks(buffer);

  if (!windowSize || !accumulated_context.trim()) return;

  try {
    const treeContext = buildTreeContext(buffer.nodes);

    const forceNote = opts.force
      ? "\n\nIMPORTANT: This is the final chunk of the conversation. You MUST generate a node now — do not return \"accumulating\"."
      : "";

    const completion = await openRouter.chat.send({
      chatGenerationParams: {
        model: process.env.INFERENCE_MODEL,
        messages: [
          {
            role: "user",
            content: PROMPT + forceNote + treeContext + accumulated_context,
          },
        ],
        stream: false,
      },
    });

    const raw = completion.choices[0].message.content;
    const stripped = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const response = LLMResponseSchema.parse(JSON.parse(stripped));
    console.log(response.status)

    if (response.status === "accumulating") {
      return;
    }

    const { content, summary, parentId } = response.node!;
    const node = createNode({ content, summary, parentId });

    const current = windowBuffer.get(botId)!;
    windowBuffer.set(botId, {
      chunks: current.chunks,
      cursor: buffer.cursor + windowSize,
      nodes: [
        ...current.nodes,
        { id: node.id, content, summary, parentId },
      ],
    });

    return node;
  } catch (_e) {
    console.log(_e);
  }
}

export function processWindow(botId: string) {
  if (inflight.has(botId)) return Promise.resolve(undefined);
  inflight.add(botId);
  return withLock(botId, async () => {
    try {
      return await processWindowInner(botId);
    } finally {
      inflight.delete(botId);
    }
  });
}

// Forces a final node generation from any remaining unprocessed chunks.
export function forceFlush(botId: string) {
  return withLock(botId, () => processWindowInner(botId, { force: true }));
}

const PROMPT = `
  You are a professional conversation analytic, which specialises in clear presentation of information that was discussed during the conversation.

  THE GOAL:
  You are building the conversation tree in realtime with a limited amount of context. The tree allows user to navigate past conversations and have a reference to what they were talking about.
  The tree has nodes - conversation insights - organized as a tree.
  Every time you will be provided with a chunk of conversation and your task is to decide whether this chunk should be converted into a clear insight or more context accumulation is needed.

  What is insight?
  Insight is a 1 sentence summary of what the conversation participants were talking about.

  TREE STRUCTURE & PARENT SELECTION:
  The conversation tree represents topic threads. Each linear chain of nodes (parent → child → grandchild) is one continuous topic.
  When generating a new node, you must decide its parentId:
  - If there are no existing nodes yet, set parentId to null (this is the root node).
  - If the current chunk continues the same topic as the most recent node, set parentId to that most recent node's ID (extending the topic line).
  - If the conversation has shifted to a different topic or gone on a tangent, set parentId to the node where the conversation diverged from — this creates a new branch in the tree.
  The existing nodes are listed from most recent to oldest so you can quickly see what was just discussed.

  Output:
  Always return ONLY JSON. For status parameter use only "generated" - if you decided to generate a new node, or "accumulating" - if you decided to skip generation this time.
  Leave node as null when no node was generated.

  {
    "status": "generated/accumulating",
    "node": {
      "content": "Copy verbatim ALL words from every chunk provided below, in order. Do not skip, paraphrase, or omit any words — even from chunks you previously decided to accumulate.",
      "summary": "Short gist of the insight",
      "parentId": "UUID of the parent node, or null if this is the first node"
    }
  }

  Below is a current chunk of conversation:
`;
