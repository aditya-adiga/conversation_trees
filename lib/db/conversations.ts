import { Conversation, NewConversation } from "../types/conversation";

const conversations = new Map<string, Conversation>();

export function clear() {
  conversations.clear();
}

export function getAll() {
  return conversations;
}

export function get(id: string) {
  if (!conversations.has(id)) {
    return undefined;
  }

  return conversations.get(id);
}

export function remove(id: string) {
  if (!conversations.has(id)) {
    return false;
  }

  conversations.delete(id);

  return true;
}

export function create(data: NewConversation) {
  const id = crypto.randomUUID();

  const newConversation = {
    id,
    createdAt: new Date(),
    ...data,
  };

  conversations.set(id, newConversation);

  return conversations.get(id);
}

export function update(id: string, data: Conversation) {
  if (!conversations.has(id)) {
    return undefined;
  }

  conversations.set(id, data);

  return conversations.get(id);
}
