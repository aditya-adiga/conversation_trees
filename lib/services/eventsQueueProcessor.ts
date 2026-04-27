import { emitter } from "../emitter/emitter";
import { flush, update } from "../db/eventQueue";
import { EventData } from "../types/event";

export function flushQueue(botId: string) {
  const queueData = flush(botId);

  if (!queueData?.length) {
    return;
  }

  for (const eventData of queueData) {
    emitter.emit(botId, eventData);
  }
}

export function updateQueue(botId: string, eventData: EventData) {
  update(botId, eventData);
}
