import { emitter } from "@/lib/emitter/emitter";
import { isConnected } from "@/lib/db/eventQueue";
import { updateQueue } from "@/lib/services/eventsQueueProcessor";
import {
  accumulate,
  processWindow,
  forceFlush,
  drainAndCleanup,
} from "@/lib/services/windowBuffer";
import { CHUNK_PRESETS, type ChunkPreset } from "@/lib/constants/chunking";
import type { TranscriptDataEvent } from "@/lib/types/event";

interface Participant {
  name: string;
  platform: string;
}

interface ProcessWordsInChunksOptions {
  botId: string;
  words: string[];
  chunkPreset: ChunkPreset;
  participant: Participant;
  isCancelled?: (botId: string) => boolean;
  clearCancelled?: (botId: string) => void;
}

function dispatch(botId: string, payload: unknown) {
  if (isConnected(botId)) {
    emitter.emit(botId, payload);
  } else {
    updateQueue(botId, payload);
  }
}

function makeChunkEvent(
  botId: string,
  words: string[],
  now: string,
  participant: Participant,
): TranscriptDataEvent {
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
          name: participant.name,
          is_host: true,
          platform: participant.platform,
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

// Shared by textProcessor and youtubeService: splits words into chunks sized
// by the given preset, feeds them through the window buffer, and dispatches
// resulting nodes plus the terminal bot.done/close events.
export async function processWordsInChunks({
  botId,
  words,
  chunkPreset,
  participant,
  isCancelled,
  clearCancelled,
}: ProcessWordsInChunksOptions): Promise<void> {
  const now = new Date().toISOString();
  const wordsPerChunk = CHUNK_PRESETS[chunkPreset].wordsPerChunk;

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    if (isCancelled?.(botId)) break;
    const chunk = words.slice(i, i + wordsPerChunk);
    accumulate(botId, makeChunkEvent(botId, chunk, now, participant));
    const nodes = await processWindow(botId);
    if (nodes) {
      for (const node of nodes) {
        dispatch(botId, { node });
      }
    }
  }

  const cancelled = isCancelled?.(botId) ?? false;
  clearCancelled?.(botId);

  if (!cancelled) {
    const remaining = await forceFlush(botId);
    if (remaining) {
      for (const node of remaining) {
        dispatch(botId, { node });
      }
    }
  }

  await drainAndCleanup(botId);

  if (!cancelled) {
    dispatch(botId, {
      eventData: {
        event: "bot.done",
        data: { bot: { id: botId, metadata: {} } },
      },
    });
  }

  emitter.emit(`${botId}:close`);
}
