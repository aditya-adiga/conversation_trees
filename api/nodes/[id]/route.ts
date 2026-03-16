import { createNode, deleteNode, getNode, setNode } from "@/lib/db/nodes";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const node = getNode(params.id);

    if (!node) {
      return Response.json(
        { error: `Node with id=${params.id} not found` },
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
  { params }: { params: { id: string } },
) {
  try {
    const deleted = deleteNode(params.id);

    if (!deleted) {
      return Response.json(
        { error: `Node with id=${params.id} not found` },
        { status: 404 },
      );
    }

    return Response.json(null, { status: 204 });
  } catch (e) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();

    if (!body.content) {
      return Response.json(
        { error: "Content field is required" },
        { status: 400 },
      );
    }

    const node = setNode(params.id, body);

    if (!node) {
      return Response.json(
        { error: `Node with id=${params.id} not found` },
        { status: 404 },
      );
    }

    return Response.json(node, { status: 200 });
  } catch (e) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
