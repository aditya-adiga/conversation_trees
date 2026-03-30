import { updateQueue, flushQueue } from "@/lib/services/eventsQueueProcessor";
import { emitter } from "@/lib/emitter/emitter";
import { isConnected } from "@/lib/db/eventQueue";
import { EventData } from "@/lib/types/event";

const TERMINAL_EVENTS = ["bot.done", "bot.fatal"];

export async function POST(request: Request) {
  try {
    const eventData: EventData = await request.json();

    const botId = eventData.data.bot.id;

    if (TERMINAL_EVENTS.includes(eventData.event)) {
      flushQueue(botId);
      emitter.emit(`${botId}:close`);
    }

    if (isConnected(botId)) {
      emitter.emit(botId, eventData);
    } else {
      updateQueue(botId, eventData);
    }

    return Response.json({ status: 201 });
  } catch (e) {
    return Response.json({ error: "External server error" }, { status: 500 });
  }
}
