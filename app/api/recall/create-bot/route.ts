import { BotCreation } from "@/lib/types/event";

export type CreateBotRequest = {
  url: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch("https://us-east-1.recall.ai/api/v1/bot", {
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
    });

    const data: BotCreation = await response.json();

    if (response.status >= 500) {
      console.log(data);
      return Response.json(
        { error: "Recall service unavailable" },
        { status: 502 },
      );
    }

    if (response.status >= 400) {
      console.log(data);
      return Response.json(
        { error: "Bad request" },
        { status: response.status },
      );
    }

    return Response.json(data, { status: 201 });
  } catch (e) {
    return Response.json(
      { error: "Network error. Please try again later" },
      { status: 500 },
    );
  }
}
