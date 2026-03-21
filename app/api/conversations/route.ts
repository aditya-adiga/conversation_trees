import { getAll } from "@/lib/db/conversations";
import { ClientConversationSchema } from "@/lib/schemas/conversation";
import { createConversation } from "@/lib/services/conversationService";
import { z } from "zod";

export async function GET() {
  try {
    const conversations = getAll();
    return Response.json([...conversations.values()], { status: 200 });
  } catch (_e) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = ClientConversationSchema.safeParse(body);

    if (!validationResult.success) {
      return Response.json(
        { error: z.treeifyError(validationResult.error) },
        { status: 400 },
      );
    }

    const conversation = createConversation(validationResult.data.title);

    return Response.json(conversation, { status: 201 });
  } catch (_e) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
