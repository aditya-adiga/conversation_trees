import { EventData } from "../types/event";

const eventQueue = new Map<string, EventData[]>();
const activeConnections = new Set<string>();

export function registerConnection(botId: string) {
  activeConnections.add(botId);
}

export function unregisterConnection(botId: string) {
  activeConnections.delete(botId);
}

export function isConnected(botId: string) {
  return activeConnections.has(botId);
}

export function update(botId: string, eventData: EventData) {
  const existing = eventQueue.get(botId) ?? [];
  eventQueue.set(botId, [...existing, eventData]);

  return true;
}

export function flush(botId: string) {
  if (!eventQueue.has(botId)) {
    return [];
  }
  const events = eventQueue.get(botId);
  eventQueue.delete(botId);

  return events;
}
