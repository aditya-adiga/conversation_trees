import { emitter } from "../emitter/emitter";
import { flush, update } from "../db/eventQueue";

export function flushQueue(botId: string) {
  const queueData = flush(botId);

  if (!queueData?.length) {
    return;
  }

  for (const payload of queueData) {
    emitter.emit(botId, payload);
  }
}

export function updateQueue(botId: string, payload: unknown) {
  update(botId, payload);
}
