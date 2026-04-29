import { z } from "zod";

export const CreateBotRequestSchema = z.object({
  url: z.url(),
});

export const StopBotRequestSchema = z.object({
  botId: z.uuid(),
});
