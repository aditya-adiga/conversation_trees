import { describe, it, expect, beforeEach } from "vitest";
import { GET, DELETE, PUT } from "../route";
import { POST } from "../../route";
import { getAllNodes } from "@/lib/db/nodes";

function clearStore() {
  const nodes = getAllNodes();
  for (const key of nodes.keys()) {
    nodes.delete(key);
  }
}

function createRequest(
  method: string,
  body?: unknown,
): Request {
  const init: RequestInit = { method };
  if (body) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new Request("http://localhost/api/nodes/123", init);
}

function withParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

async function createNode(content: string, parentId: string | null = null) {
  const res = await POST(
    new Request("http://localhost/api/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    }),
  );
  return res.json();
}

describe("GET /api/nodes/[id]", () => {
  beforeEach(() => {
    clearStore();
  });

  it("should return a node by id", async () => {
    const node = await createNode("test node");

    const res = await GET(createRequest("GET"), withParams(node.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe(node.id);
    expect(body.content).toBe("test node");
  });

  it("should return 404 for non-existent node", async () => {
    const res = await GET(
      createRequest("GET"),
      withParams("550e8400-e29b-41d4-a716-446655440000"),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("not found");
  });
});

describe("DELETE /api/nodes/[id]", () => {
  beforeEach(() => {
    clearStore();
  });

  it("should delete a node and return 204", async () => {
    const node = await createNode("to delete");

    const res = await DELETE(createRequest("DELETE"), withParams(node.id));

    expect(res.status).toBe(204);
  });

  it("should return 404 for non-existent node", async () => {
    const res = await DELETE(
      createRequest("DELETE"),
      withParams("550e8400-e29b-41d4-a716-446655440000"),
    );

    expect(res.status).toBe(404);
  });

  it("should cascade delete children", async () => {
    const parent = await createNode("parent");
    const child = await createNode("child", parent.id);

    const deleteRes = await DELETE(
      createRequest("DELETE"),
      withParams(parent.id),
    );
    expect(deleteRes.status).toBe(204);

    const getChildRes = await GET(createRequest("GET"), withParams(child.id));
    expect(getChildRes.status).toBe(404);
  });
});

describe("PUT /api/nodes/[id]", () => {
  beforeEach(() => {
    clearStore();
  });

  it("should update a node's content and return 200", async () => {
    const node = await createNode("original");

    const res = await PUT(
      createRequest("PUT", {
        ...node,
        content: "updated",
      }),
      withParams(node.id),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.content).toBe("updated");
  });

  it("should update summary field", async () => {
    const node = await createNode("content");

    const res = await PUT(
      createRequest("PUT", {
        ...node,
        summary: "a summary",
      }),
      withParams(node.id),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary).toBe("a summary");
  });

  it("should return 404 for non-existent node", async () => {
    const fakeId = "550e8400-e29b-41d4-a716-446655440000";
    const res = await PUT(
      createRequest("PUT", {
        id: fakeId,
        content: "test",
        parentId: null,
        nextSiblingId: null,
        prevSiblingId: null,
        firstChildId: null,
        lastChildId: null,
      }),
      withParams(fakeId),
    );

    expect(res.status).toBe(404);
  });

  it("should return 400 for invalid body", async () => {
    const node = await createNode("original");

    const res = await PUT(
      createRequest("PUT", { content: "" }),
      withParams(node.id),
    );

    expect(res.status).toBe(400);
  });
});
