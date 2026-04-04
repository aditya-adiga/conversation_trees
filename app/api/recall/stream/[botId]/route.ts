import { emitter } from "@/lib/emitter/emitter";
import { flushQueue } from "@/lib/services/eventsQueueProcessor";
import { registerConnection, unregisterConnection } from "@/lib/db/eventQueue";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ botId: string }> },
) {
  const { botId } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const listener = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const closeListener = () => {
        unregisterConnection(botId);
        emitter.off(botId, listener);
        emitter.off(`${botId}:close`, closeListener);
        controller.close();
      };

      registerConnection(botId);
      emitter.on(botId, listener);
      emitter.on(`${botId}:close`, closeListener);

      flushQueue(botId);

      request.signal.addEventListener("abort", () => {
        unregisterConnection(botId);
        emitter.off(botId, listener);
        emitter.off(`${botId}:close`, closeListener);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
