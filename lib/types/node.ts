import { z } from "zod";
import {
  ClientNodeSchema,
  CreateNodeSchema,
  NodeSchema,
} from "../schemas/node";

export type CTNode = z.infer<typeof NodeSchema>;
export type CreateCTNdodeInput = z.infer<typeof CreateNodeSchema>;
export type ClientCTNodeInput = z.infer<typeof ClientNodeSchema>;
