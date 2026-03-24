import { CreateCTNdodeInput, CTNode } from "../types/node";

const nodes = new Map<string, CTNode>();

export function get(id: string) {
  if (!nodes.has(id)) {
    return undefined;
  }
  return nodes.get(id);
}

export function set(id: string, updatedNode: CTNode) {
  if (!nodes.has(id)) {
    return undefined;
  }
  nodes.set(id, updatedNode);

  return nodes.get(id)
}

export function remove(id: string) {
  if (!nodes.has(id)) {
    return false;
  }
  nodes.delete(id);
  return true;
}

export function getAllNodes() {
  return nodes;
}

export function create(data: CreateCTNdodeInput) {
  const newId = crypto.randomUUID();
  const newNode = {
    id: newId,
    ...data,
  };

  nodes.set(newId, newNode);

  return newNode;
}
