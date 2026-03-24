import z from "zod";

export const ConversationSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  createdAt: z.date(),
  rootNodeId: z.uuid().nullable(),
});

export const CreateConversationSchema = ConversationSchema.omit({ id: true, createdAt: true });

export const ClientConversationSchema = ConversationSchema.omit({
  id: true,
  createdAt: true,
  rootNodeId: true,
});
