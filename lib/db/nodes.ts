import { CreateCTNdodeInput, CTNode } from "../types/node";

const nodes = new Map<string, CTNode>();

export function getNode(id: string) {
  if (!nodes.has(id)) {
    return undefined;
  }
  return nodes.get(id);
}

export function setNode(id: string, updatedNode: CTNode) {
  if (!nodes.has(id)) {
    return undefined;
  }
  nodes.set(id, updatedNode);
}

export function deleteNode(id: string) {
  if (!nodes.has(id)) {
    return false;
  }
  nodes.delete(id);
  return true;
}

export function getAllNodes() {
  return nodes;
}

export function createNode(data: CreateCTNdodeInput) {
  const newId = crypto.randomUUID();
  const newNode = {
    id: newId,
    ...data,
  };

  nodes.set(newId, newNode);

  return newNode;
}
