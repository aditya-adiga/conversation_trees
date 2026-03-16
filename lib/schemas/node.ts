import { z } from "zod";

export const NodeSchema = z.object({
  id: z.uuid(),
  content: z.string().min(1),
  summary: z.string().optional(),
  parentId: z.uuid().nullable(),
  nextSibling: z.uuid(),
  prevSibling: z.uuid(),
});

export const CreateNodeSchema = NodeSchema.omit({ id: true });
