import { StopBotRequestSchema } from "@/lib/schemas/bot";
import { cancelYouTube } from "@/lib/services/youtubeService";

export async function POST(request: Request) {
  try {
    const parsed = StopBotRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    cancelYouTube(parsed.data.botId);

    return Response.json({ status: "stopped" }, { status: 200 });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
