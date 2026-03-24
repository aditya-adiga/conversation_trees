import { describe, it, expect, beforeEach } from "vitest";
import { POST, GET } from "../route";
import { getAllNodes } from "@/lib/db/nodes";

function clearStore() {
  const nodes = getAllNodes();
  for (const key of nodes.keys()) {
    nodes.delete(key);
  }
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/nodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/nodes", () => {
  beforeEach(() => {
    clearStore();
  });

  it("should create a root node and return 201", async () => {
    const res = await POST(jsonRequest({ content: "root", parentId: null }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBeDefined();
    expect(body.content).toBe("root");
    expect(body.parentId).toBeNull();
  });

  it("should create a child node with valid parentId", async () => {
    const parentRes = await POST(
      jsonRequest({ content: "parent", parentId: null }),
    );
    const parent = await parentRes.json();

    const childRes = await POST(
      jsonRequest({ content: "child", parentId: parent.id }),
    );
    const child = await childRes.json();

    expect(childRes.status).toBe(201);
    expect(child.parentId).toBe(parent.id);
  });

  it("should return 400 for missing content", async () => {
    const res = await POST(jsonRequest({ parentId: null }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("should return 400 for empty content", async () => {
    const res = await POST(jsonRequest({ content: "", parentId: null }));

    expect(res.status).toBe(400);
  });

  it("should return 400 for missing parentId", async () => {
    const res = await POST(jsonRequest({ content: "hello" }));

    expect(res.status).toBe(400);
  });

  it("should return 500 when parent does not exist", async () => {
    const res = await POST(
      jsonRequest({
        content: "orphan",
        parentId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    );

    expect(res.status).toBe(500);
  });
});

describe("GET /api/nodes", () => {
  beforeEach(() => {
    clearStore();
  });

  it("should return an empty array when no nodes exist", async () => {
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });

  it("should return all created nodes", async () => {
    await POST(jsonRequest({ content: "node1", parentId: null }));
    await POST(jsonRequest({ content: "node2", parentId: null }));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
  });
});
