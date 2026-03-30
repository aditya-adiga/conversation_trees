import z from "zod";

export function parseId(id: string) {
  return z.uuid().safeParse(id);
}
