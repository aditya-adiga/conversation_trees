import { updateQueue, flushQueue } from "@/lib/services/eventsQueueProcessor";
import { emitter } from "@/lib/emitter/emitter";
import { isConnected } from "@/lib/db/eventQueue";
import { EventDataSchema } from "@/lib/schemas/event";

const TERMINAL_EVENTS = ["bot.done", "bot.fatal"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = EventDataSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    const eventData = parsed.data;
    const botId = eventData.data.bot.id;

    if (isConnected(botId)) {
      emitter.emit(botId, eventData);
      if (TERMINAL_EVENTS.includes(eventData.event)) {
        flushQueue(botId);
        emitter.emit(`${botId}:close`);
      }
    } else {
      updateQueue(botId, eventData);
    }

    return Response.json({ status: 201 });
  } catch (e) {
    return Response.json({ error: "External server error" }, { status: 500 });
  }
}
