function getRecallConfig() {
  const { RECALL_API_KEY, RECALL_REGION } = process.env;

  if (!RECALL_API_KEY || !RECALL_REGION) {
    return {
      ok: false as const,
      error: `Missing required configuration: ${[
        !RECALL_API_KEY ? "RECALL_API_KEY" : null,
        !RECALL_REGION ? "RECALL_REGION" : null,
      ]
        .filter(Boolean)
        .join(", ")}`,
    };
  }

  return {
    ok: true as const,
    apiKey: RECALL_API_KEY,
    region: RECALL_REGION,
  };
}

export async function stopRecallBot(botId: string) {
  const config = getRecallConfig();
  if (!config.ok) {
    return { ok: false as const, status: 503, error: config.error };
  }

  const response = await fetch(
    `https://${config.region}.recall.ai/api/v1/bot/${botId}/leave_call/`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${config.apiKey}`,
      },
    },
  );

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      error: "Failed to stop Recall bot",
    };
  }

  return { ok: true as const };
}
