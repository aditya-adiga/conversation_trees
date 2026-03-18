import { describe, it, expect, beforeEach } from "vitest";
import { create, get, set, remove, getAllNodes } from "../nodes";

// Reset the in-memory store between tests by removing all nodes
function clearStore() {
  const nodes = getAllNodes();
  for (const key of nodes.keys()) {
    nodes.delete(key);
  }
}

describe("db/nodes", () => {
  beforeEach(() => {
    clearStore();
  });

  describe("create", () => {
    it("should create a node and return it with a generated id", () => {
      const node = create({
        content: "hello",
        parentId: null,
        nextSiblingId: null,
        prevSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      });

      expect(node.id).toBeDefined();
      expect(node.content).toBe("hello");
      expect(node.parentId).toBeNull();
    });

    it("should store the node so it can be retrieved with get", () => {
      const node = create({
        content: "stored",
        parentId: null,
        nextSiblingId: null,
        prevSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      });

      const retrieved = get(node.id);
      expect(retrieved).toEqual(node);
    });
  });

  describe("get", () => {
    it("should return undefined for a non-existent id", () => {
      expect(get("non-existent-id")).toBeUndefined();
    });
  });

  describe("set", () => {
    it("should update an existing node", () => {
      const node = create({
        content: "original",
        parentId: null,
        nextSiblingId: null,
        prevSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      });

      const updated = set(node.id, { ...node, content: "updated" });
      expect(updated?.content).toBe("updated");
      expect(get(node.id)?.content).toBe("updated");
    });

    it("should return undefined when updating a non-existent node", () => {
      const result = set("non-existent", {
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

  describe("remove", () => {
    it("should remove an existing node and return true", () => {
      const node = create({
        content: "to-delete",
        parentId: null,
        nextSiblingId: null,
        prevSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      });

      expect(remove(node.id)).toBe(true);
      expect(get(node.id)).toBeUndefined();
    });

    it("should return false for a non-existent node", () => {
      expect(remove("non-existent")).toBe(false);
    });
  });

  describe("getAllNodes", () => {
    it("should return all stored nodes", () => {
      create({
        content: "node-1",
        parentId: null,
        nextSiblingId: null,
        prevSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      });
      create({
        content: "node-2",
        parentId: null,
        nextSiblingId: null,
        prevSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      });

      const all = getAllNodes();
      expect(all.size).toBe(2);
    });
  });
});
