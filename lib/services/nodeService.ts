import { ClientCTNodeInput, CreateCTNdodeInput, CTNode } from "../types/node";
import { create, get, remove, set } from "../db/nodes";

export function createNode(nodeData: ClientCTNodeInput): CTNode {
  let parent = null;
  let prevSiblingId = null;

  if (nodeData.parentId) {
    parent = get(nodeData.parentId);

    if (!parent) throw new Error(`Parent node ${nodeData.parentId} not found`);

    prevSiblingId = parent.lastChildId || null;
  }

  const fullNode: CreateCTNdodeInput = {
    ...nodeData,
    prevSiblingId,
    nextSiblingId: null,
    firstChildId: null,
    lastChildId: null,
  };

  const node = create(fullNode);

  if (parent?.lastChildId) {
    const lastChildNode = get(parent.lastChildId);

    if (!lastChildNode)
      throw new Error(`Last child node ${parent.lastChildId} not found`);

    set(parent.lastChildId, {
      ...lastChildNode,
      nextSiblingId: node.id,
    });
  }

  if (parent) {
    set(parent.id, {
      ...parent,
      lastChildId: node.id,
      firstChildId: parent.firstChildId || node.id,
    });
  }

  return node;
}

export function updateNode(
  id: string,
  updatedNode: CTNode,
): CTNode | undefined {
  return set(id, updatedNode);
}

function cascadeDelete(id: string): boolean {
  const node = get(id);
  if (!node) return false;

  let childId = node.firstChildId;
  while (childId) {
    const child = get(childId);
    const nextSiblingId = child?.nextSiblingId ?? null;
    if (!cascadeDelete(childId)) return false;
    childId = nextSiblingId;
  }

  return remove(id);
}

export function deleteNode(id: string): boolean {
  const nodeToDelete = get(id);
  if (!nodeToDelete) return false;

  let childId = nodeToDelete.firstChildId;
  while (childId) {
    const child = get(childId);
    const nextSiblingId = child?.nextSiblingId ?? null;
    if (!cascadeDelete(childId)) return false;
    childId = nextSiblingId;
  }

  const deleted = remove(id);

  if (deleted) {
    const { prevSiblingId, nextSiblingId, parentId } = nodeToDelete;

    if (prevSiblingId) {
      const prevSibling = get(prevSiblingId);

      if (!prevSibling) throw new Error(`Node ${prevSiblingId} not found`);

      set(prevSiblingId, {
        ...prevSibling,
        nextSiblingId: nextSiblingId || null,
      });
    }

    if (nextSiblingId) {
      const nextSibling = get(nextSiblingId);

      if (!nextSibling) throw new Error(`Node ${nextSiblingId} not found`);

      set(nextSiblingId, {
        ...nextSibling,
        prevSiblingId: prevSiblingId || null,
      });
    }

    if (parentId) {
      const parent = get(parentId);

      if (!parent) throw new Error(`Node ${parentId} not found`);

      set(parentId, {
        ...parent,
        firstChildId:
          parent.firstChildId === id
            ? (nextSiblingId ?? null)
            : parent.firstChildId,
        lastChildId:
          parent.lastChildId === id
            ? (prevSiblingId ?? null)
            : parent.lastChildId,
      });
    }
  }

  return deleted;
}
