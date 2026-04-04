import { z } from "zod";

export const EventDataSchema = z.object({
  event: z.string(),
  data: z.object({
    bot: z.object({
      id: z.string(),
      metadata: z.object({}),
    }),
    data: z.object({
      code: z.string(),
      sub_code: z.string().nullable(),
      updated_at: z.string(),
    }).optional(),
    recording: z.object({
      id: z.string(),
      metadata: z.object({}),
    }).optional(),
    transcript: z.object({
      id: z.string(),
      metadata: z.object({}),
    }).optional(),
  }),
});

export const BotCreationSchema = z.object({
  event: z.string(),
  data: z.object({
    data: z.object({
      code: z.string(),
      sub_code: z.string().nullable(),
      updated_at: z.string(),
    }),
    bot: z.object({
      id: z.string(),
      metadata: z.object({}),
    }),
  }),
});
