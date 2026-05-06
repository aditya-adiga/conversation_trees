import { StopBotRequestSchema } from "@/lib/schemas/bot";
import { stopRecallBot } from "@/lib/services/recallBotService";

export async function POST(request: Request) {
  try {
    const parsed = StopBotRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const result = await stopRecallBot(parsed.data.botId);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ status: "stopped" }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Network error. Please try again later" },
      { status: 500 },
    );
  }
}
