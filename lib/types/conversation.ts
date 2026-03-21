import { ClientConversationSchema, ConversationSchema, CreateConversationSchema } from "../schemas/conversation";
import { z } from "zod"

export type Conversation = z.infer<typeof ConversationSchema>
export type NewConversation = z.infer<typeof CreateConversationSchema>
export type ClientConversation = z.infer<typeof ClientConversationSchema>