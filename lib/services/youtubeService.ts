import { YoutubeTranscript } from "youtube-transcript";
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

const WORDS_PER_CHUNK = 100;

const cancelledSessions = new Set<string>();

export function cancelYouTube(botId: string) {
  cancelledSessions.add(botId);
}

function extractVideoId(url: string): string {
  const patterns = [
    /[?&]v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  throw new Error("Could not extract video ID from URL");
}

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
          name: "YouTube",
          is_host: true,
          platform: "youtube",
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

export async function processYouTube(url: string, botId: string): Promise<void> {
  const videoId = extractVideoId(url);
  const segments = await YoutubeTranscript.fetchTranscript(videoId);

  const now = new Date().toISOString();
  const words = segments.flatMap((seg) =>
    seg.text.trim().split(/\s+/).filter(Boolean),
  );

  for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
    if (cancelledSessions.has(botId)) break;
    const chunk = words.slice(i, i + WORDS_PER_CHUNK);
    accumulate(botId, makeChunkEvent(botId, chunk, now));
    const nodes = await processWindow(botId);
    if (nodes) {
      for (const node of nodes) {
        dispatch(botId, { node });
      }
    }
  }

  const cancelled = cancelledSessions.has(botId);
  cancelledSessions.delete(botId);

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
