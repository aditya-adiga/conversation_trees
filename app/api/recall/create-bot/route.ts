import { BotCreation } from "@/lib/types/event";
import { validateEnv } from "@/lib/api/utils";
import { CreateBotRequestSchema } from "@/lib/schemas/event";

export async function POST(request: Request) {
  const envError = validateEnv();
  if (envError) return envError;

  try {
    const parsed = CreateBotRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
    const body = parsed.data;

    const response = await fetch(
      `https://${process.env.RECALL_REGION}.recall.ai/api/v1/bot`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.RECALL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meeting_url: body.url,
          bot_name: "Recall AI",
          recording_config: {
            transcript: {
              provider: {
                recallai_streaming: {
                  mode: "prioritize_low_latency",
                  language_code: "en",
                },
              },
            },
            realtime_endpoints: [
              {
                type: "webhook",
                url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/recall/stream`,
                events: ["transcript.data"],
              },
            ],
          },
        }),
      },
    );

    const data: BotCreation = await response.json();

    if (response.status >= 500) {
      console.error(data);
      return Response.json(
        { error: "Recall service unavailable" },
        { status: 502 },
      );
    }

    if (response.status >= 400) {
      console.error(data);
      return Response.json(
        { error: "Bad request" },
        { status: response.status },
      );
    }

    return Response.json(data, { status: 201 });
  } catch {
    return Response.json(
      { error: "Network error. Please try again later" },
      { status: 500 },
    );
  }
}
