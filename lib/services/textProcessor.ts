import { emitter } from "@/lib/emitter/emitter";
import { isConnected } from "@/lib/db/eventQueue";
import { updateQueue } from "@/lib/services/eventsQueueProcessor";
import {
  accumulate,
  forceFlush,
  drainAndCleanup,
} from "@/lib/services/windowBuffer";
import type { TranscriptDataEvent } from "@/lib/types/event";

function dispatch(botId: string, payload: unknown) {
  if (isConnected(botId)) {
    emitter.emit(botId, payload);
  } else {
    updateQueue(botId, payload);
  }
}

export async function processTextAsync(botId: string, text: string) {
  const now = new Date().toISOString();

  const event: TranscriptDataEvent = {
    event: "transcript.data",
    data: {
      data: {
        words: text.split(/\s+/).map((word) => ({
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

  accumulate(botId, event);

  const nodes = await forceFlush(botId);
  if (nodes) {
    for (const node of nodes) {
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
