import { get } from "@/lib/db/nodes";
import { NodeSchema } from "@/lib/schemas/node";
import { deleteNode, updateNode } from "@/lib/services/nodeService";
import { z } from "zod";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: nodeId } = await params;
    const node = get(nodeId);

    if (!node) {
      return Response.json(
        { error: `Node with id=${nodeId} not found` },
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
    const { id: nodeId } = await params;
    const deleted = deleteNode(nodeId);

    if (!deleted) {
      return Response.json(
        { error: `Node with id=${nodeId} not found` },
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
    const { id: nodeId } = await params;

    const body = await request.json();

    const validationResult = NodeSchema.safeParse(body);

    if (!validationResult.success) {
      return Response.json(
        { error: z.treeifyError(validationResult.error) },
        { status: 400 },
      );
    }

    const existing = get(nodeId);

    if (!existing) {
      return Response.json(
        { error: `Node with id=${nodeId} not found` },
        { status: 404 },
      );
    }

    const { summary, content } = validationResult.data;

    const node = updateNode(nodeId, { ...existing, content, summary });

    return Response.json(node, { status: 200 });
  } catch (e) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
