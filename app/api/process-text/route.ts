import { randomUUID } from "crypto";
import { processTextAsync } from "@/lib/services/textProcessor";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (typeof body?.text !== "string" || body.text.trim().length === 0) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const botId = randomUUID();

    processTextAsync(botId, body.text.trim()).catch((e) => {
      console.error(`[ProcessText:${botId}] Unhandled error`, e);
    });

    return Response.json({ botId }, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
