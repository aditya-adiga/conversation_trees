import { z } from "zod";
import { CreateNodeSchema, NodeSchema } from "../schemas/node";

export type CTNode = z.infer<typeof NodeSchema>;
export type CreateCTNdodeInput = z.infer<typeof CreateNodeSchema>;
