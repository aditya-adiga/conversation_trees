import { z } from "zod";

const RecallEntitySchema = z.object({
  id: z.string(),
  metadata: z.object({}),
});

export const EventDataSchema = z.object({
  event: z.string(),
  data: z.object({
    bot: RecallEntitySchema,
    data: z
      .object({
        code: z.string(),
        sub_code: z.string().nullable(),
        updated_at: z.string(),
      })
      .optional(),
    recording: RecallEntitySchema.optional(),
    transcript: RecallEntitySchema.optional(),
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
        }),
      ),
      language_code: z.string().optional(),
      participant: z.object({
        id: z.number(),
        name: z.string(),
        is_host: z.boolean(),
        platform: z.string(),
        extra_data: z.record(z.string(), z.unknown()),
      }),
    }),
    transcript: RecallEntitySchema,
    realtime_endpoint: RecallEntitySchema,
    recording: RecallEntitySchema,
    bot: RecallEntitySchema,
  }),
});

export const BufferNodeSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  summary: z.string(),
  parentId: z.string().uuid().nullable(),
});

export const BotBufferSchema = z.object({
  chunks: z.array(TranscriptDataEventSchema),
  cursor: z.number(),
  nodes: z.array(BufferNodeSchema),
});

export const BotCreationSchema = z.object({
  event: z.string(),
  data: z.object({
    data: z.object({
      code: z.string(),
      sub_code: z.string().nullable(),
      updated_at: z.string(),
    }),
    bot: RecallEntitySchema,
  }),
});

export const CreateBotRequestSchema = z.object({
  url: z.url(),
  clientSessionId: z.uuid(),
});
