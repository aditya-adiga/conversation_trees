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
      let sentCount = 0;

      const listener = (data: unknown) => {
        sentCount++;
        const eventType =
          (data as { eventData?: { event?: string } })?.eventData?.event ??
          "unknown";
        console.log(`[SSE:${botId}] Sending event #${sentCount}: ${eventType}`);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const closeListener = () => {
        console.log(
          `[SSE:${botId}] Connection closed. Total events sent to client: ${sentCount}`,
        );
        unregisterConnection(botId);
        emitter.off(botId, listener);
        emitter.off(`${botId}:close`, closeListener);
        controller.close();
      };

      console.log(`[SSE:${botId}] Client connected`);
      registerConnection(botId);
      emitter.on(botId, listener);
      emitter.on(`${botId}:close`, closeListener);

      flushQueue(botId);

      request.signal.addEventListener("abort", () => {
        console.log(
          `[SSE:${botId}] Client disconnected (abort). Total events sent to client: ${sentCount}`,
        );
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
