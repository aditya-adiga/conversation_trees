const globalForStreamSessions = globalThis as typeof globalThis & {
  __conversationTreeStreamSessions?: Map<string, string>;
};

const streamSessions =
  globalForStreamSessions.__conversationTreeStreamSessions ??=
    new Map<string, string>();

export function replaceCurrentBot(
  clientSessionId: string,
  botId: string,
): string | undefined {
  const previousBotId = streamSessions.get(clientSessionId);
  streamSessions.set(clientSessionId, botId);
  return previousBotId === botId ? undefined : previousBotId;
}

export function getCurrentBot(clientSessionId: string): string | undefined {
  return streamSessions.get(clientSessionId);
}

export function clearCurrentBot(clientSessionId: string) {
  streamSessions.delete(clientSessionId);
}
