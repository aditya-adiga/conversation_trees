const globalForEvents = globalThis as typeof globalThis & {
  __conversationTreeEventQueue?: Map<string, unknown[]>;
  __conversationTreeActiveConnections?: Set<string>;
};

const eventQueue =
  globalForEvents.__conversationTreeEventQueue ??= new Map<string, unknown[]>();
const activeConnections =
  globalForEvents.__conversationTreeActiveConnections ??= new Set<string>();

export function registerConnection(botId: string) {
  activeConnections.add(botId);
}

export function unregisterConnection(botId: string) {
  activeConnections.delete(botId);
}

export function isConnected(botId: string) {
  return activeConnections.has(botId);
}

export function update(botId: string, payload: unknown) {
  const existing = eventQueue.get(botId) ?? [];
  eventQueue.set(botId, [...existing, payload]);
}

export function flush(botId: string) {
  if (!eventQueue.has(botId)) {
    return [];
  }
  const events = eventQueue.get(botId);
  eventQueue.delete(botId);

  return events;
}
