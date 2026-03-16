import { createNode, getAllNodes } from "@/lib/db/nodes";
import { CreateNodeSchema } from "@/lib/schemas/node";
import { CTNode } from "@/lib/types/node";
import { z } from "zod";

// TODO: Add siblings, summary, update parent and siblings on the backend side
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = CreateNodeSchema.safeParse(body);

    if (!validationResult.success) {
      return Response.json(
        { error: z.treeifyError(validationResult.error) },
        { status: 400 },
      );
    }

    const node: CTNode = createNode(validationResult.data);

    return Response.json(node, { status: 201 });
  } catch (e) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const nodes = getAllNodes();

    return Response.json(nodes, { status: 200 });
  } catch (e) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
