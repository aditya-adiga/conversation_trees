import { describe, it, expect } from "vitest";
import { getChildren, getAllSiblingIds, getSiblings } from "../nodeUtils";
import type { CTNode } from "@/lib/types/node";

function makeNode(overrides: Partial<CTNode> & { id: string }): CTNode {
	return {
		content: "content",
		summary: "summary",
		parentId: null,
		prevSiblingId: null,
		nextSiblingId: null,
		firstChildId: null,
		lastChildId: null,
		...overrides,
	};
}

// ── Fixture: a small tree
//
//   root
//   ├── A ← → B ← → C
//   │   └── A1
//   └── (B, C are siblings)
//
function makeTree(): Map<string, CTNode> {
	const root = makeNode({ id: "root", firstChildId: "A", lastChildId: "C" });
	const otherRoot = makeNode({ id: "other-root" });
	const A = makeNode({ id: "A", parentId: "root", nextSiblingId: "B", firstChildId: "A1", lastChildId: "A1" });
	const B = makeNode({ id: "B", parentId: "root", prevSiblingId: "A", nextSiblingId: "C" });
	const C = makeNode({ id: "C", parentId: "root", prevSiblingId: "B" });
	const A1 = makeNode({ id: "A1", parentId: "A" });

	return new Map([
		["root", root],
		["other-root", otherRoot],
		["A", A],
		["B", B],
		["C", C],
		["A1", A1],
	]);
}

describe("getChildren", () => {
	it("returns an empty array for a leaf node", () => {
		const nodes = makeTree();
		expect(getChildren(nodes.get("A1")!, nodes)).toEqual([]);
	});

	it("returns an empty array for a node with no children", () => {
		const nodes = makeTree();
		expect(getChildren(nodes.get("B")!, nodes)).toEqual([]);
	});

	it("returns all children in sibling-chain order", () => {
		const nodes = makeTree();
		const children = getChildren(nodes.get("root")!, nodes);
		expect(children.map((n) => n.id)).toEqual(["A", "B", "C"]);
	});

	it("returns a single child correctly", () => {
		const nodes = makeTree();
		const children = getChildren(nodes.get("A")!, nodes);
		expect(children.map((n) => n.id)).toEqual(["A1"]);
	});

	it("stops early if a child id is missing from the map", () => {
		const nodes = makeTree();
		// Break the chain by removing B
		nodes.delete("B");
		// A → B (missing) → chain stops
		const children = getChildren(nodes.get("root")!, nodes);
		expect(children.map((n) => n.id)).toEqual(["A"]);
	});

	it("returns an empty array when firstChildId is null", () => {
		const node = makeNode({ id: "lone" });
		const nodes = new Map([["lone", node]]);
		expect(getChildren(node, nodes)).toEqual([]);
	});
});

describe("getAllSiblingIds", () => {
	it("returns all root ids for a root node", () => {
		const nodes = makeTree();
		expect(getAllSiblingIds(nodes.get("root")!, nodes)).toEqual(["root", "other-root"]);
		expect(getAllSiblingIds(nodes.get("other-root")!, nodes)).toEqual(["root", "other-root"]);
	});

	it("returns [nodeId] when parent is not found in the map", () => {
		const orphan = makeNode({ id: "orphan", parentId: "ghost" });
		const nodes = new Map([["orphan", orphan]]);
		expect(getAllSiblingIds(orphan, nodes)).toEqual(["orphan"]);
	});

	it("returns all sibling ids including the node itself, in order", () => {
		const nodes = makeTree();
		expect(getAllSiblingIds(nodes.get("A")!, nodes)).toEqual(["A", "B", "C"]);
		expect(getAllSiblingIds(nodes.get("B")!, nodes)).toEqual(["A", "B", "C"]);
		expect(getAllSiblingIds(nodes.get("C")!, nodes)).toEqual(["A", "B", "C"]);
	});

	it("returns [nodeId] for a lone child", () => {
		const nodes = makeTree();
		expect(getAllSiblingIds(nodes.get("A1")!, nodes)).toEqual(["A1"]);
	});
});

describe("getSiblings", () => {
	it("returns other root nodes as siblings for a root node", () => {
		const nodes = makeTree();
		expect(getSiblings(nodes.get("root")!, nodes).map((n) => n.id)).toEqual(["other-root"]);
		expect(getSiblings(nodes.get("other-root")!, nodes).map((n) => n.id)).toEqual(["root"]);
	});

	it("returns an empty array when parent is not found in the map", () => {
		const orphan = makeNode({ id: "orphan", parentId: "ghost" });
		const nodes = new Map([["orphan", orphan]]);
		expect(getSiblings(orphan, nodes)).toEqual([]);
	});

	it("returns an empty array for a lone child", () => {
		const nodes = makeTree();
		expect(getSiblings(nodes.get("A1")!, nodes)).toEqual([]);
	});

	it("excludes the node itself from the result", () => {
		const nodes = makeTree();
		const siblings = getSiblings(nodes.get("A")!, nodes);
		expect(siblings.map((n) => n.id)).not.toContain("A");
	});

	it("returns all siblings in sibling-chain order", () => {
		const nodes = makeTree();
		expect(getSiblings(nodes.get("A")!, nodes).map((n) => n.id)).toEqual(["B", "C"]);
		expect(getSiblings(nodes.get("B")!, nodes).map((n) => n.id)).toEqual(["A", "C"]);
		expect(getSiblings(nodes.get("C")!, nodes).map((n) => n.id)).toEqual(["A", "B"]);
	});
});
