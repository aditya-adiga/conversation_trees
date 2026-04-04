import { updateQueue, flushQueue } from "@/lib/services/eventsQueueProcessor";
import { emitter } from "@/lib/emitter/emitter";
import { isConnected } from "@/lib/db/eventQueue";
import { TranscriptDataEventSchema, EventDataSchema } from "@/lib/schemas/event";
import { accumulate, processWindow, drainAndCleanup, forceFlush } from "@/lib/services/windowBuffer";
import { EventData, TranscriptDataEvent } from "@/lib/types/event";

const TERMINAL_EVENTS = ["bot.done", "bot.fatal"];

const receivedCounts = new Map<string, number>();

function dispatch(botId: string, payload: Parameters<typeof emitter.emit>[1]) {
  if (isConnected(botId)) {
    emitter.emit(botId, payload);
  } else {
    updateQueue(botId, payload);
  }
}

function logReceived(botId: string, event: TranscriptDataEvent | EventData) {
  const count = (receivedCounts.get(botId) ?? 0) + 1;
  receivedCounts.set(botId, count);
  console.log(`[Webhook:${botId}] Received event #${count}: ${event.event}`);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.event === "transcript.data") {
      const eventData = TranscriptDataEventSchema.parse(body);
      const botId = eventData.data.bot.id;

      logReceived(botId, body);
      accumulate(botId, eventData);
      processWindow(botId).then((node) => {
        if (node) {
          dispatch(botId, { eventData, node });
        }
      });
    } else {
      const eventData = EventDataSchema.parse(body);
      const botId = eventData.data.bot.id;

      logReceived(botId, eventData);

      if (TERMINAL_EVENTS.includes(eventData.event)) {
        console.log(`[Webhook:${botId}] Terminal event "${eventData.event}". Total events received from Recall: ${receivedCounts.get(botId) ?? 0}`);
        receivedCounts.delete(botId);

        // Force-generate a final node from any remaining unprocessed chunks,
        // then drain in-flight calls, then emit the terminal event and close.
        // We respond 201 immediately so Recall AI does not time out.
        forceFlush(botId).then((node) => {
          if (node) dispatch(botId, { node });
          return drainAndCleanup(botId);
        }).then(() => {
          dispatch(botId, { eventData });
          flushQueue(botId);
          emitter.emit(`${botId}:close`);
        });

        return Response.json({ status: 201 });
      }

      dispatch(botId, { eventData });
    }

    return Response.json({ status: 201 });
  } catch (e) {
    return Response.json({ error: "External server error" }, { status: 500 });
  }
}
