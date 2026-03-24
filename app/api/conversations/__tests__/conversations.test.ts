import { beforeEach, describe, expect, it } from "vitest";
import { DELETE, GET, PUT } from "@/app/api/conversations/[id]/route";
import {
  GET as LIST,
  POST,
} from "@/app/api/conversations/route";
import { clear } from "@/lib/db/conversations";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  clear();
});

describe("POST /api/conversations", () => {
  it("creates a conversation and returns 201", async () => {
    const res = await POST(makeRequest({ title: "My conversation" }));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.title).toBe("My conversation");
    expect(body.rootNodeId).toBeNull();
    expect(body.createdAt).toBeDefined();
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("ignores extra fields", async () => {
    const res = await POST(makeRequest({ title: "Test", foo: "bar" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.foo).toBeUndefined();
  });
});

describe("GET /api/conversations", () => {
  it("returns empty array when no conversations", async () => {
    const res = await LIST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns all conversations", async () => {
    await POST(makeRequest({ title: "First" }));
    await POST(makeRequest({ title: "Second" }));

    const res = await LIST();
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body.map((c: { title: string }) => c.title)).toEqual(
      expect.arrayContaining(["First", "Second"]),
    );
  });
});

describe("GET /api/conversations/:id", () => {
  it("returns the conversation", async () => {
    const created = await (await POST(makeRequest({ title: "Test" }))).json();

    const res = await GET(new Request("http://localhost"), makeParams(created.id));
    expect(res.status).toBe(200);
    expect((await res.json()).title).toBe("Test");
  });

  it("returns 404 for unknown id", async () => {
    const res = await GET(
      new Request("http://localhost"),
      makeParams("00000000-0000-0000-0000-000000000000"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const res = await GET(new Request("http://localhost"), makeParams("not-a-uuid"));
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/conversations/:id", () => {
  it("updates the title", async () => {
    const created = await (await POST(makeRequest({ title: "Old" }))).json();

    const res = await PUT(
      makeRequest({ title: "New" }),
      makeParams(created.id),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).title).toBe("New");
  });

  it("returns 404 for unknown id", async () => {
    const res = await PUT(
      makeRequest({ title: "New" }),
      makeParams("00000000-0000-0000-0000-000000000000"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid body", async () => {
    const created = await (await POST(makeRequest({ title: "Test" }))).json();
    const res = await PUT(makeRequest({ title: "" }), makeParams(created.id));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/conversations/:id", () => {
  it("deletes the conversation and returns 204", async () => {
    const created = await (await POST(makeRequest({ title: "To delete" }))).json();

    const res = await DELETE(new Request("http://localhost"), makeParams(created.id));
    expect(res.status).toBe(204);

    const getRes = await GET(new Request("http://localhost"), makeParams(created.id));
    expect(getRes.status).toBe(404);
  });

  it("returns 404 for unknown id", async () => {
    const res = await DELETE(
      new Request("http://localhost"),
      makeParams("00000000-0000-0000-0000-000000000000"),
    );
    expect(res.status).toBe(404);
  });
});
