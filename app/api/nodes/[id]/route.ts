import { get } from "@/lib/db/nodes";
import { NodeSchema } from "@/lib/schemas/node";
import { deleteNode, updateNode } from "@/lib/services/nodeService";
import { z } from "zod";

function parseNodeId(id: string) {
  return z.uuid().safeParse(id);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!parseNodeId(id).success) {
      return Response.json({ error: "Invalid node id" }, { status: 400 });
    }

    const node = get(id);

    if (!node) {
      return Response.json(
        { error: `Node with id=${id} not found` },
        { status: 404 },
      );
    }

    return Response.json(node, { status: 200 });
  } catch (e) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!parseNodeId(id).success) {
      return Response.json({ error: "Invalid node id" }, { status: 400 });
    }
    const deleted = deleteNode(id);

    if (!deleted) {
      return Response.json(
        { error: `Node with id=${id} not found` },
        { status: 404 },
      );
    }

    return new Response(null, { status: 204 });
  } catch (e) {
    console.log(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!parseNodeId(id).success) {
      return Response.json({ error: "Invalid node id" }, { status: 400 });
    }

    const body = await request.json();

    const validationResult = NodeSchema.safeParse(body);

    if (!validationResult.success) {
      return Response.json(
        { error: z.treeifyError(validationResult.error) },
        { status: 400 },
      );
    }

    const existing = get(id);

    if (!existing) {
      return Response.json(
        { error: `Node with id=${id} not found` },
        { status: 404 },
      );
    }

    const { summary, content } = validationResult.data;

    const node = updateNode(id, { ...existing, content, summary });

    return Response.json(node, { status: 200 });
  } catch (e) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
