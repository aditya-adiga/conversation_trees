import { z } from "zod";

export const NodeSchema = z.object({
  id: z.uuid(),
  name: z.string().optional(),
  content: z.string().min(1),
  transcript: z.string().optional(),
  parentId: z.uuid().nullable(),
  nextSiblingId: z.uuid().nullable().default(null),
  prevSiblingId: z.uuid().nullable(),
  firstChildId: z.uuid().nullable().default(null),
  lastChildId: z.uuid().nullable(),
});

export const CreateNodeSchema = NodeSchema.omit({
  id: true,
});

export const ClientNodeSchema = NodeSchema.omit({
  id: true,
  nextSiblingId: true,
  prevSiblingId: true,
  firstChildId: true,
  lastChildId: true,
});
