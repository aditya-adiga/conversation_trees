import { emitter } from "@/lib/emitter/emitter";
import { isConnected } from "@/lib/db/eventQueue";
import { updateQueue } from "@/lib/services/eventsQueueProcessor";
import {
  accumulate,
  processWindow,
  forceFlush,
  drainAndCleanup,
} from "@/lib/services/windowBuffer";
import type { TranscriptDataEvent } from "@/lib/types/event";

// Match the streaming path: each chunk is ~100 words, window fires at 12 chunks
const WORDS_PER_CHUNK = 100;

function dispatch(botId: string, payload: unknown) {
  if (isConnected(botId)) {
    emitter.emit(botId, payload);
  } else {
    updateQueue(botId, payload);
  }
}

function makeChunkEvent(botId: string, words: string[], now: string): TranscriptDataEvent {
  return {
    event: "transcript.data",
    data: {
      data: {
        words: words.map((word) => ({
          text: word,
          start_timestamp: { relative: 0, absolute: now },
          end_timestamp: { relative: 0, absolute: now },
        })),
        participant: {
          id: 0,
          name: "User",
          is_host: true,
          platform: "text",
          extra_data: {},
        },
      },
      transcript: { id: botId, metadata: {} },
      realtime_endpoint: { id: botId, metadata: {} },
      recording: { id: botId, metadata: {} },
      bot: { id: botId, metadata: {} },
    },
  };
}

export async function processTextAsync(botId: string, text: string) {
  const now = new Date().toISOString();
  const words = text.split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
    const chunk = words.slice(i, i + WORDS_PER_CHUNK);
    accumulate(botId, makeChunkEvent(botId, chunk, now));
    const nodes = await processWindow(botId);
    if (nodes) {
      for (const node of nodes) {
        dispatch(botId, { node });
      }
    }
  }

  const remaining = await forceFlush(botId);
  if (remaining) {
    for (const node of remaining) {
      dispatch(botId, { node });
    }
  }

  await drainAndCleanup(botId);

  dispatch(botId, {
    eventData: {
      event: "bot.done",
      data: { bot: { id: botId, metadata: {} } },
    },
  });

  emitter.emit(`${botId}:close`);
}
