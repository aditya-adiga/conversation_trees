import z from "zod";

export function parseId(id: string) {
  return z.uuid().safeParse(id);
}

const requiredEnvVars = ["RECALL_API_KEY", "OPENROUTER_API_KEY"] as const;

export function validateEnv(): Response | null {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    return Response.json(
      { error: `Missing required configuration: ${missing.join(", ")}` },
      { status: 503 },
    );
  }

  return null;
}
