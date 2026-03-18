import { describe, it, expect, beforeEach } from "vitest";
import { createNode, updateNode, deleteNode } from "../nodeService";
import { get, getAllNodes } from "../../db/nodes";

function clearStore() {
  const nodes = getAllNodes();
  for (const key of nodes.keys()) {
    nodes.delete(key);
  }
}

describe("nodeService", () => {
  beforeEach(() => {
    clearStore();
  });

  describe("createNode", () => {
    it("should create a root node (no parent)", () => {
      const node = createNode({ content: "root", parentId: null });

      expect(node.id).toBeDefined();
      expect(node.content).toBe("root");
      expect(node.parentId).toBeNull();
      expect(node.prevSiblingId).toBeNull();
      expect(node.nextSiblingId).toBeNull();
      expect(node.firstChildId).toBeNull();
      expect(node.lastChildId).toBeNull();
    });

    it("should create a child node and update parent pointers", () => {
      const parent = createNode({ content: "parent", parentId: null });
      const child = createNode({ content: "child", parentId: parent.id });

      expect(child.parentId).toBe(parent.id);
      expect(child.prevSiblingId).toBeNull();

      const updatedParent = get(parent.id);
      expect(updatedParent?.firstChildId).toBe(child.id);
      expect(updatedParent?.lastChildId).toBe(child.id);
    });

    it("should link siblings when adding multiple children", () => {
      const parent = createNode({ content: "parent", parentId: null });
      const child1 = createNode({ content: "child1", parentId: parent.id });
      const child2 = createNode({ content: "child2", parentId: parent.id });

      // child2 should point back to child1
      expect(child2.prevSiblingId).toBe(child1.id);

      // child1 should now point forward to child2
      const updatedChild1 = get(child1.id);
      expect(updatedChild1?.nextSiblingId).toBe(child2.id);

      // parent pointers
      const updatedParent = get(parent.id);
      expect(updatedParent?.firstChildId).toBe(child1.id);
      expect(updatedParent?.lastChildId).toBe(child2.id);
    });

    it("should correctly link three siblings", () => {
      const parent = createNode({ content: "parent", parentId: null });
      const c1 = createNode({ content: "c1", parentId: parent.id });
      const c2 = createNode({ content: "c2", parentId: parent.id });
      const c3 = createNode({ content: "c3", parentId: parent.id });

      const p = get(parent.id)!;
      expect(p.firstChildId).toBe(c1.id);
      expect(p.lastChildId).toBe(c3.id);

      const n1 = get(c1.id)!;
      expect(n1.prevSiblingId).toBeNull();
      expect(n1.nextSiblingId).toBe(c2.id);

      const n2 = get(c2.id)!;
      expect(n2.prevSiblingId).toBe(c1.id);
      expect(n2.nextSiblingId).toBe(c3.id);

      const n3 = get(c3.id)!;
      expect(n3.prevSiblingId).toBe(c2.id);
      expect(n3.nextSiblingId).toBeNull();
    });

    it("should throw when parent does not exist", () => {
      expect(() =>
        createNode({ content: "orphan", parentId: "nonexistent-uuid" }),
      ).toThrow("Parent node nonexistent-uuid not found");
    });
  });

  describe("updateNode", () => {
    it("should update a node's content", () => {
      const node = createNode({ content: "original", parentId: null });
      const updated = updateNode(node.id, { ...node, content: "modified" });

      expect(updated?.content).toBe("modified");
    });

    it("should return undefined for a non-existent node", () => {
      const result = updateNode("non-existent", {
        id: "non-existent",
        content: "test",
        parentId: null,
        nextSiblingId: null,
        prevSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      });

      expect(result).toBeUndefined();
    });
  });

  describe("deleteNode", () => {
    it("should delete a root node", () => {
      const node = createNode({ content: "root", parentId: null });
      const deleted = deleteNode(node.id);

      expect(deleted).toBe(true);
      expect(get(node.id)).toBeUndefined();
    });

    it("should return false for a non-existent node", () => {
      expect(deleteNode("non-existent")).toBe(false);
    });

    it("should cascade delete all children", () => {
      const parent = createNode({ content: "parent", parentId: null });
      const child = createNode({ content: "child", parentId: parent.id });
      const grandchild = createNode({
        content: "grandchild",
        parentId: child.id,
      });

      deleteNode(parent.id);

      expect(get(parent.id)).toBeUndefined();
      expect(get(child.id)).toBeUndefined();
      expect(get(grandchild.id)).toBeUndefined();
    });

    it("should update sibling links when deleting a middle sibling", () => {
      const parent = createNode({ content: "parent", parentId: null });
      const c1 = createNode({ content: "c1", parentId: parent.id });
      const c2 = createNode({ content: "c2", parentId: parent.id });
      const c3 = createNode({ content: "c3", parentId: parent.id });

      deleteNode(c2.id);

      const updatedC1 = get(c1.id)!;
      expect(updatedC1.nextSiblingId).toBe(c3.id);

      const updatedC3 = get(c3.id)!;
      expect(updatedC3.prevSiblingId).toBe(c1.id);
    });

    it("should update parent's firstChildId when deleting the first child", () => {
      const parent = createNode({ content: "parent", parentId: null });
      const c1 = createNode({ content: "c1", parentId: parent.id });
      const c2 = createNode({ content: "c2", parentId: parent.id });

      deleteNode(c1.id);

      const updatedParent = get(parent.id)!;
      expect(updatedParent.firstChildId).toBe(c2.id);

      const updatedC2 = get(c2.id)!;
      expect(updatedC2.prevSiblingId).toBeNull();
    });

    it("should update parent's lastChildId when deleting the last child", () => {
      const parent = createNode({ content: "parent", parentId: null });
      const c1 = createNode({ content: "c1", parentId: parent.id });
      const c2 = createNode({ content: "c2", parentId: parent.id });

      deleteNode(c2.id);

      const updatedParent = get(parent.id)!;
      expect(updatedParent.lastChildId).toBe(c1.id);

      const updatedC1 = get(c1.id)!;
      expect(updatedC1.nextSiblingId).toBeNull();
    });

    it("should set parent's child pointers to null when deleting the only child", () => {
      const parent = createNode({ content: "parent", parentId: null });
      const child = createNode({ content: "child", parentId: parent.id });

      deleteNode(child.id);

      const updatedParent = get(parent.id)!;
      expect(updatedParent.firstChildId).toBeNull();
      expect(updatedParent.lastChildId).toBeNull();
    });

    it("should cascade delete children of a middle sibling", () => {
      const parent = createNode({ content: "parent", parentId: null });
      const c1 = createNode({ content: "c1", parentId: parent.id });
      const c2 = createNode({ content: "c2", parentId: parent.id });
      const c3 = createNode({ content: "c3", parentId: parent.id });
      const grandchild = createNode({
        content: "grandchild",
        parentId: c2.id,
      });

      deleteNode(c2.id);

      expect(get(c2.id)).toBeUndefined();
      expect(get(grandchild.id)).toBeUndefined();

      // siblings should still be linked
      const updatedC1 = get(c1.id)!;
      const updatedC3 = get(c3.id)!;
      expect(updatedC1.nextSiblingId).toBe(c3.id);
      expect(updatedC3.prevSiblingId).toBe(c1.id);
    });
  });
});
