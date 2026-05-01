import { emitter } from "../emitter/emitter";
import { flush, update } from "../db/eventQueue";

export function flushQueue(botId: string) {
  const queueData = flush(botId);

  console.log(`[Queue:${botId}] flushing ${queueData?.length ?? 0} event(s)`);

  if (!queueData?.length) {
    return;
  }

  for (const payload of queueData) {
    emitter.emit(botId, payload);
  }
}

export function updateQueue(botId: string, payload: unknown) {
  console.log(`[Queue:${botId}] queued event`);
  update(botId, payload);
}
