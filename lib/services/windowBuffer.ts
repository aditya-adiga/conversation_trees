import { z } from "zod";
import { BotBuffer, TranscriptDataEvent } from "../types/event";
import { openRouter } from "./openRouter";
import { createNode } from "./nodeService";

const PROMPT = `
  You are a professional conversation analytic, which specialises in clear presentation of information that was discussed during the conversation.

  THE GOAL:
  You are building the conversation tree in realtime with a limited amount of context. The tree allows user to navigate past conversations and have a reference to what they were talking about.
  The tree has nodes - conversation insights - organized as a tree.
  Every time you will be provided with a numbered list of transcript chunks and your task is to decide whether to generate one or more insights, or wait for more context.

  What is insight?
  Insight is a 1 sentence summary of what the conversation participants were talking about.

  TREE STRUCTURE & PARENT SELECTION:
  A parent → child relationship means: "this child topic was introduced AS PART OF the parent topic's discussion."
  The tree encodes TOPICAL STRUCTURE, not just chronological order.

  Decision process — ask these questions in order:
  1. What is this chunk specifically about? (one phrase)
  2. Scan the tree from bottom to top. Which node represents the context in which THIS topic was introduced?
  3. That node is the parent. It does NOT necessarily have to be the most recently added node.

  Specific rules:
  - DIRECT CONTINUATION: The chunk deepens or elaborates the exact same point as the most recent node → parentId = most recent node (extend the chain downward).
  - TOPIC SHIFT / ZOOM OUT: The conversation moves away from a specific sub-topic to something broader or different → find the ancestor node whose topic best matches where this new discussion belongs, and use THAT as the parent. Do NOT keep going deeper.
  - COMPLETELY NEW THREAD: The topic is unrelated to anything in the tree → parentId = null (new root).

  The correct shape for a conversation that covers several topics looks like:
  A (opening / context)
  ├── B (first topic)
  │   └── C (detail about B)
  └── D (second topic, introduced after B was done)
      ├── E (detail about D)
      └── F (another angle on D)

  Before setting parentId, ask: "Is this chunk still drilling into the most recent node's specific point, or is it starting something that belongs higher up the tree?"

  MULTIPLE NODES:
  You may generate more than one node if the provided chunks cover multiple distinct topics or a clear topic shift.
  Return nodes in chronological order (earliest topic first).

  PARTIAL CONSUMPTION:
  The chunks are numbered [1], [2], [3], … You do not have to consume all of them if you do not need them.
  Set chunksConsumed to the number of chunks (from [1] onwards) that your nodes cover.
  Remaining chunks will be carried over to the next call.
  Set chunksConsumed to 0 when accumulating.

  INTRA-BATCH PARENT REFERENCES:
  If a node you are generating should be a child of another node you are also generating in this same response,
  set parentBatchIndex to the 0-based index of that parent node within the nodes array (instead of a UUID).
  Otherwise set parentBatchIndex to null and use parentId for an existing node UUID (or null for the root).

  Output:
  Always return ONLY JSON. For status parameter use only "generated" - if you decided to generate at least one node, or "accumulating" - if you decided to skip generation this time.

  {
    "status": "generated/accumulating",
    "nodes": [
      {
        "content": "Copy verbatim ALL words from every chunk this node covers, in order. Do not skip, paraphrase, or omit any words.",
        "summary": "Short gist of the insight",
        "parentId": "UUID of an existing parent node, or null if this is the first node",
        "parentBatchIndex": null
      }
    ],
    "chunksConsumed": 3
  }

  Below is a current chunk of conversation:
`;

const FORCE_NOTE =
  '\n\nIMPORTANT: This is the final chunk of the conversation. You MUST generate a node now — do not return "accumulating".';

const LLMNodeSchema = z.object({
  content: z.string(),
  summary: z.string(),
  parentId: z.string().uuid().nullable(),
  parentBatchIndex: z.number().int().min(0).nullable().optional(),
});

const LLMResponseSchema = z.object({
  status: z.enum(["generated", "accumulating"]),
  nodes: z.array(LLMNodeSchema),
  chunksConsumed: z.number().int().min(0),
});

// Stores transcription, calls LLM to generate new nodes, saves new nodes to in-memory db
const windowBuffer = new Map<string, BotBuffer>();
const locks = new Map<string, Promise<void>>();
// Skip queueing a new LLM call while one is already in-flight.
// New chunks are accumulated in the buffer and picked up by the next call.
const inflight = new Set<string>();

// Each call chains onto the previous one's promise, so concurrent webhook
// requests queue up rather than racing to read and update the buffer.
function withLock<T>(botId: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(botId) ?? Promise.resolve();
  const current = prev.then(() => fn());
  locks.set(botId, current.then(() => {}, () => {}));
  return current;
}

export function accumulate(
  botId: string,
  transcript_chunk: TranscriptDataEvent,
) {
  const buffer = windowBuffer.get(botId);

  const text = transcript_chunk.data.data.words.map((w) => w.text).join(" ");
  console.log(`[WindowBuffer:${botId}] Accumulated chunk #${buffer?.chunks.length ?? 0}: "${text}"`);

  windowBuffer.set(botId, {
    chunks: [...(buffer?.chunks ?? []), transcript_chunk],
    cursor: buffer?.cursor ?? 0,
    nodes: buffer?.nodes ?? [],
  });
}

function prepareChunks(buffer: BotBuffer) {
  const window = buffer.chunks.slice(buffer.cursor);
  const windowSize = window.length;
  const texts = window.map((chunk) =>
    chunk.data.data.words.map((word) => word.text).join(" "),
  );
  const hasContent = texts.some((t) => t.trim() !== "");
  const accumulated_context = texts
    .map((text, i) => `[${i + 1}] ${text}`)
    .join("\n");

  return { accumulated_context, windowSize, hasContent };
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

  const childrenMap = new Map<string | null, BotBuffer["nodes"]>();
  for (const n of nodes) {
    const key = n.parentId ?? null;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(n);
  }

  const lines: string[] = [];
  function render(parentId: string | null, indent: string) {
    for (const n of childrenMap.get(parentId) ?? []) {
      lines.push(`${indent}[${n.id}] ${n.summary}`);
      render(n.id, `${indent}  `);
    }
  }
  render(null, "");

  const last = nodes[nodes.length - 1];

  return (
    `\n\nCurrent conversation tree (indented = child of the node above it):` +
    `\n${lines.join("\n")}` +
    `\n\nMost recently added node: [${last.id}] "${last.summary}"\n`
  );
}

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function buildPrompt(opts: { force?: boolean }, treeContext: string, accumulatedContext: string): string {
  const parts = [PROMPT];
  if (opts.force) parts.push(FORCE_NOTE);
  parts.push(treeContext, accumulatedContext);
  return parts.join("");
}

async function processWindowInner(botId: string, opts: { force?: boolean } = {}) {
  const buffer = windowBuffer.get(botId);

  if (!buffer) return;

  const { accumulated_context, windowSize, hasContent } = prepareChunks(buffer);

  if (!windowSize || !hasContent) return;

  try {
    const treeContext = buildTreeContext(buffer.nodes);

    const completion = await openRouter.chat.send({
      chatGenerationParams: {
        model: process.env.INFERENCE_MODEL,
        messages: [
          {
            role: "user",
            content: buildPrompt(opts, treeContext, accumulated_context),
          },
        ],
        stream: false,
      },
    });

    const raw = completion.choices[0].message.content;
    const response = LLMResponseSchema.parse(JSON.parse(stripCodeFences(raw)));

    if (response.status === "accumulating" || response.nodes.length === 0) {
      return;
    }

    const bufferNodes: BotBuffer["nodes"] = [];
    const createdNodes: ReturnType<typeof createNode>[] = [];

    for (const spec of response.nodes) {
      const batchIndex = spec.parentBatchIndex ?? null;
      const resolvedParentId =
        batchIndex !== null && batchIndex < bufferNodes.length
          ? bufferNodes[batchIndex].id
          : spec.parentId;

      const node = createNode({ content: spec.content, summary: spec.summary, parentId: resolvedParentId });
      bufferNodes.push({ id: node.id, content: spec.content, summary: spec.summary, parentId: resolvedParentId });
      createdNodes.push(node);
    }

    // If LLM forgot to set chunksConsumed, fall back to consuming the full window.
    const chunksConsumed = response.chunksConsumed > 0
      ? Math.min(response.chunksConsumed, windowSize)
      : windowSize;

    const current = windowBuffer.get(botId)!;
    windowBuffer.set(botId, {
      chunks: current.chunks,
      cursor: buffer.cursor + chunksConsumed,
      nodes: [...current.nodes, ...bufferNodes],
    });

    return createdNodes;
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
