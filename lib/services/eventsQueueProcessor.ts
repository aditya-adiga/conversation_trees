import { emitter } from "../emitter/emitter";
import { flush, update } from "../db/eventQueue";
import { EventData } from "../types/event";

export function flushQueue(botId: string) {
  const queueData = flush(botId);

  if (!queueData?.length) {
    return;
  }

  emitter.emit(botId, queueData);
}

export function updateQueue(botId: string, eventData: EventData) {
  const updated = update(botId, eventData);

  if (!updated) {
    return;
  }

  emitter.emit(botId, eventData);
}
