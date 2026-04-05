import { BotBufferSchema, BotCreationSchema, EventDataSchema, TranscriptDataEventSchema } from "../schemas/event";
import { z } from "zod";

export type EventData = z.infer<typeof EventDataSchema>;
export type BotCreation = z.infer<typeof BotCreationSchema>;
export type TranscriptDataEvent = z.infer<typeof TranscriptDataEventSchema>;
export type BotBuffer = z.infer<typeof BotBufferSchema>;
