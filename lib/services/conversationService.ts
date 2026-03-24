import { create, update } from "@/lib/db/conversations";
import { Conversation } from "@/lib/types/conversation";

export function createConversation(title: string) {
  return create({ title, rootNodeId: null });
}

export function updateConversation(id: string, data: Conversation) {
  return update(id, data);
}
