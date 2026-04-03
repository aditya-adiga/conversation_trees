import { z } from "zod";
import { BotBuffer, TranscriptDataEvent } from "../types/event";
import { openRouter } from "./openRouter";

const LLMResponseSchema = z.object({
  status: z.enum(["generated", "accumulating"]),
  node: z
    .object({
      content: z.string(),
      summary: z.string(),
    })
    .nullable(),
});

// Per bot conversation chunks storage, accumulator and insights generator
const windowBuffer = new Map<string, BotBuffer>();
const locks = new Map<string, Promise<void>>();

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

async function processWindowInner(botId: string, force = false) {
  const buffer = windowBuffer.get(botId);

  if (!buffer) return;

  const { accumulated_context, windowSize } = prepareChunks(buffer);

  if (!windowSize) return;

  try {
    const completion = await openRouter.chat.send({
      chatGenerationParams: {
        model: process.env.INFERENCE_MODEL,
        messages: [
          {
            role: "user",
            content: PROMPT + accumulated_context,
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

    const current = windowBuffer.get(botId)!;
    windowBuffer.set(botId, {
      chunks: current.chunks,
      cursor: buffer.cursor + windowSize,
    });

    return response.node;
  } catch (_e) {
    console.log(_e);
  }
}

export function processWindow(botId: string) {
  return withLock(botId, () => processWindowInner(botId));
}

const PROMPT = `
  You are a professional conversation analytic, which specialises in clear presentation of information that was discussed during the conversation. 

  THE GOAL:
  You are building the conversation tree in realtime with a limited amount of context. The tree allows user to navigate past conversations and have a reference to what they were talking about.
  The tree has leaves - conversation insights.
  Every time you will be provided with a chunk of conversation and your task is to decide whether this chunk should be converted into the clear insight or more context accumulation is needed.


  What is insight?
  Insight is a 1 sentence summary of what the conversation participants were talking about. 

  Output:
  Always return ONLY JSON schema. For status parameter use only "generated" - if you decided to generate a new node, or "accumulating" - if you decided to skip generation this time.
  Leave node to null, when no node was generated

  {
    status: "generated/accumulating",
    node: {
      content: "Copy verbatim ALL words from every chunk provided below, in order. Do not skip, paraphrase, or omit any words — even from chunks you previously decided to accumulate.",
      summary: "Short gist of the insight"
  }

  Belaow is a current chunk of conversation:
`;
