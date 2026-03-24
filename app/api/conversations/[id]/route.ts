import { get, remove } from "@/lib/db/conversations";
import { updateConversation } from "@/lib/services/conversationService";
import { parseId } from "@/lib/api/utils";
import { ClientConversationSchema } from "@/lib/schemas/conversation";
import { z } from "zod";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!parseId(id).success) {
      return Response.json({ error: `Invalid id: ${id}` }, { status: 400 });
    }

    const conversation = get(id);

    if (!conversation) {
      return Response.json(
        { error: `Conversation with id=${id} not found` },
        { status: 404 },
      );
    }

    return Response.json(conversation, { status: 200 });
  } catch (_e) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!parseId(id).success) {
      return Response.json({ error: `Invalid id: ${id}` }, { status: 400 });
    }

    const existing = get(id);

    if (!existing) {
      return Response.json(
        { error: `Conversation with id=${id} not found` },
        { status: 404 },
      );
    }

    const body = await request.json();

    const validationResult = ClientConversationSchema.safeParse(body);

    if (!validationResult.success) {
      return Response.json(
        { error: z.treeifyError(validationResult.error) },
        { status: 400 },
      );
    }

    const conversation = updateConversation(id, { ...existing, ...validationResult.data });

    return Response.json(conversation, { status: 200 });
  } catch (_e) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!parseId(id).success) {
      return Response.json({ error: `Invalid id: ${id}` }, { status: 400 });
    }

    const deleted = remove(id);

    if (!deleted) {
      return Response.json(
        { error: `Conversation with id=${id} not found` },
        { status: 404 },
      );
    }

    return new Response(null, { status: 204 });
  } catch (_e) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
