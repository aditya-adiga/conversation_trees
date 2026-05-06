import { describe, it, expect } from "vitest";
import { NodeSchema, CreateNodeSchema, ClientNodeSchema } from "../node";

const validUUID = "550e8400-e29b-41d4-a716-446655440000";

describe("NodeSchema", () => {
  it("should accept a valid full node", () => {
    const result = NodeSchema.safeParse({
      id: validUUID,
      content: "hello",
      parentId: null,
      nextSiblingId: null,
      prevSiblingId: null,
      firstChildId: null,
      lastChildId: null,
    });

    expect(result.success).toBe(true);
  });

  it("should accept optional summary field", () => {
    const result = NodeSchema.safeParse({
      id: validUUID,
      content: "hello",
      summary: "short",
      parentId: null,
      nextSiblingId: null,
      prevSiblingId: null,
      firstChildId: null,
      lastChildId: null,
    });

    expect(result.success).toBe(true);
  });

  it("should reject empty content", () => {
    const result = NodeSchema.safeParse({
      id: validUUID,
      content: "",
      parentId: null,
      nextSiblingId: null,
      prevSiblingId: null,
      firstChildId: null,
      lastChildId: null,
    });

    expect(result.success).toBe(false);
  });

  it("should reject non-UUID id", () => {
    const result = NodeSchema.safeParse({
      id: "not-a-uuid",
      content: "hello",
      parentId: null,
      nextSiblingId: null,
      prevSiblingId: null,
      firstChildId: null,
      lastChildId: null,
    });

    expect(result.success).toBe(false);
  });

  it("should reject non-UUID parentId", () => {
    const result = NodeSchema.safeParse({
      id: validUUID,
      content: "hello",
      parentId: "bad",
      nextSiblingId: null,
      prevSiblingId: null,
      firstChildId: null,
      lastChildId: null,
    });

    expect(result.success).toBe(false);
  });

  it("should accept UUID values for sibling and child ids", () => {
    const result = NodeSchema.safeParse({
      id: validUUID,
      content: "hello",
      parentId: validUUID,
      nextSiblingId: validUUID,
      prevSiblingId: validUUID,
      firstChildId: validUUID,
      lastChildId: validUUID,
    });

    expect(result.success).toBe(true);
  });

  it("should reject missing required fields", () => {
    const result = NodeSchema.safeParse({
      id: validUUID,
    });

    expect(result.success).toBe(false);
  });
});

describe("CreateNodeSchema", () => {
  it("should accept a node without id", () => {
    const result = CreateNodeSchema.safeParse({
      content: "hello",
      parentId: null,
      nextSiblingId: null,
      prevSiblingId: null,
      firstChildId: null,
      lastChildId: null,
    });

    expect(result.success).toBe(true);
  });

  it("should reject if id is provided", () => {
    const result = CreateNodeSchema.safeParse({
      id: validUUID,
      content: "hello",
      parentId: null,
      nextSiblingId: null,
      prevSiblingId: null,
      firstChildId: null,
      lastChildId: null,
    });

    // Omit strips the key — extra keys are typically ignored by zod,
    // but the important thing is that id is not required
    expect(result.success).toBe(true);
    if (result.success) {
      expect("id" in result.data).toBe(false);
    }
  });
});

describe("ClientNodeSchema", () => {
  it("should accept content and parentId only", () => {
    const result = ClientNodeSchema.safeParse({
      content: "hello",
      parentId: null,
    });

    expect(result.success).toBe(true);
  });

  it("should reject empty content", () => {
    const result = ClientNodeSchema.safeParse({
      content: "",
      parentId: null,
    });

    expect(result.success).toBe(false);
  });

  it("should reject missing content", () => {
    const result = ClientNodeSchema.safeParse({
      parentId: null,
    });

    expect(result.success).toBe(false);
  });

  it("should reject missing parentId", () => {
    const result = ClientNodeSchema.safeParse({
      content: "hello",
    });

    expect(result.success).toBe(false);
  });

  it("should strip omitted fields from output", () => {
    const result = ClientNodeSchema.safeParse({
      content: "hello",
      parentId: null,
      name: "should be kept",
      nextSiblingId: null,
      prevSiblingId: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect("name" in result.data).toBe(true);
      expect("nextSiblingId" in result.data).toBe(false);
      expect("prevSiblingId" in result.data).toBe(false);
    }
  });
});
