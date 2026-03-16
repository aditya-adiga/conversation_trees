import { createNode, getAllNodes } from "@/lib/db/nodes";

// TODO: Add siblings, summary, update parent and siblings on the backend side
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.content) {
      return Response.json({ error: "content is required" }, { status: 400 });
    }

    const node = createNode(body);

    if (!node) {
      return;
    }

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
