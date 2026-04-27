import { BotCreationSchema, EventDataSchema } from "../schemas/event";
import { z } from "zod";

export type EventData = z.infer<typeof EventDataSchema>;
export type BotCreation = z.infer<typeof BotCreationSchema>;
