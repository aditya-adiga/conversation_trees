import { randomUUID } from "crypto";
import { processYouTube } from "@/lib/services/youtubeService";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (typeof body?.url !== "string" || body.url.trim().length === 0) {
      return Response.json({ error: "url is required" }, { status: 400 });
    }

    const botId = randomUUID();

    processYouTube(body.url.trim(), botId).catch((e) => {
      console.error(`[YouTube:${botId}] Processing failed:`, e);
    });

    return Response.json({ botId }, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
