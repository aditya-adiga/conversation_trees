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

export const TranscriptDataEventSchema = z.object({
  event: z.literal("transcript.data"),
  data: z.object({
    data: z.object({
      words: z.array(
        z.object({
          text: z.string(),
          start_timestamp: z.object({
            relative: z.number(),
            absolute: z.string(),
          }),
          end_timestamp: z.object({
            relative: z.number(),
            absolute: z.string(),
          }),
        })
      ),
      language_code: z.string(),
      participant: z.object({
        id: z.number(),
        name: z.string(),
        is_host: z.boolean(),
        platform: z.string(),
        extra_data: z.record(z.string(), z.unknown()),
      }),
    }),
    transcript: z.object({
      id: z.string(),
      metadata: z.object({}),
    }),
    realtime_endpoint: z.object({
      id: z.string(),
      metadata: z.object({}),
    }),
    recording: z.object({
      id: z.string(),
      metadata: z.object({}),
    }),
    bot: z.object({
      id: z.string(),
      metadata: z.object({}),
    }),
  }),
});

export const BotBufferSchema = z.object({
  chunks: z.array(TranscriptDataEventSchema),
  cursor: z.number(),
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
