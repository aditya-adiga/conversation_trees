import { describe, it, expect } from "vitest";
import { buildMinimapLayout } from "../minimapLayout";
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

describe("buildMinimapLayout", () => {
	it("returns an empty layout for an empty nodes map", () => {
		const layout = buildMinimapLayout(new Map());
		expect(layout.nodes).toHaveLength(0);
		expect(layout.edges).toHaveLength(0);
		expect(layout.viewBox).toBe("0 0 100 100");
	});

	it("lays out a single root node with no children", () => {
		const nodes = new Map([["root", makeNode({ id: "root" })]]);
		const layout = buildMinimapLayout(nodes);

		expect(layout.nodes).toHaveLength(1);
		expect(layout.nodes[0].id).toBe("root");
		expect(layout.edges).toHaveLength(0);
	});

	it("assigns correct depth (y) to each level", () => {
		// root → child → grandchild
		const nodes = new Map([
			["root", makeNode({ id: "root", firstChildId: "child", lastChildId: "child" })],
			["child", makeNode({ id: "child", parentId: "root", firstChildId: "gc", lastChildId: "gc" })],
			["gc", makeNode({ id: "gc", parentId: "child" })],
		]);
		const layout = buildMinimapLayout(nodes);

		const byId = Object.fromEntries(layout.nodes.map((n) => [n.id, n]));
		expect(byId["root"].y).toBeLessThan(byId["child"].y);
		expect(byId["child"].y).toBeLessThan(byId["gc"].y);
	});

	it("produces edges for every parent → child relationship", () => {
		const nodes = new Map([
			["root", makeNode({ id: "root", firstChildId: "A", lastChildId: "B" })],
			["A", makeNode({ id: "A", parentId: "root", nextSiblingId: "B" })],
			["B", makeNode({ id: "B", parentId: "root", prevSiblingId: "A" })],
		]);
		const layout = buildMinimapLayout(nodes);

		expect(layout.edges).toHaveLength(2);
		const edgePairs = layout.edges.map(({ from, to }) => [from.id, to.id]);
		expect(edgePairs).toContainEqual(["root", "A"]);
		expect(edgePairs).toContainEqual(["root", "B"]);
	});

	it("places sibling nodes at the same depth but different x positions", () => {
		const nodes = new Map([
			["root", makeNode({ id: "root", firstChildId: "A", lastChildId: "B" })],
			["A", makeNode({ id: "A", parentId: "root", nextSiblingId: "B" })],
			["B", makeNode({ id: "B", parentId: "root", prevSiblingId: "A" })],
		]);
		const layout = buildMinimapLayout(nodes);

		const byId = Object.fromEntries(layout.nodes.map((n) => [n.id, n]));
		expect(byId["A"].y).toBe(byId["B"].y);
		expect(byId["A"].x).not.toBe(byId["B"].x);
	});

	it("centers a parent node over its children horizontally", () => {
		const nodes = new Map([
			["root", makeNode({ id: "root", firstChildId: "A", lastChildId: "B" })],
			["A", makeNode({ id: "A", parentId: "root", nextSiblingId: "B" })],
			["B", makeNode({ id: "B", parentId: "root", prevSiblingId: "A" })],
		]);
		const layout = buildMinimapLayout(nodes);

		const byId = Object.fromEntries(layout.nodes.map((n) => [n.id, n]));
		const mid = (byId["A"].x + byId["B"].x) / 2;
		expect(byId["root"].x).toBeCloseTo(mid);
	});

	it("handles multiple root nodes (forest)", () => {
		const nodes = new Map([
			["root1", makeNode({ id: "root1" })],
			["root2", makeNode({ id: "root2" })],
		]);
		const layout = buildMinimapLayout(nodes);

		expect(layout.nodes).toHaveLength(2);
		expect(layout.edges).toHaveLength(0);

		const ids = layout.nodes.map((n) => n.id);
		expect(ids).toContain("root1");
		expect(ids).toContain("root2");

		// Both roots are at the same depth
		const byId = Object.fromEntries(layout.nodes.map((n) => [n.id, n]));
		expect(byId["root1"].y).toBe(byId["root2"].y);
		// But at different x positions
		expect(byId["root1"].x).not.toBe(byId["root2"].x);
	});

	it("all node positions are within the viewBox bounds", () => {
		const nodes = new Map([
			["root", makeNode({ id: "root", firstChildId: "A", lastChildId: "C" })],
			["A", makeNode({ id: "A", parentId: "root", nextSiblingId: "B" })],
			["B", makeNode({ id: "B", parentId: "root", prevSiblingId: "A", nextSiblingId: "C" })],
			["C", makeNode({ id: "C", parentId: "root", prevSiblingId: "B" })],
		]);
		const layout = buildMinimapLayout(nodes);

		const [, , w, h] = layout.viewBox.split(" ").map(Number);
		for (const n of layout.nodes) {
			expect(n.x).toBeGreaterThan(0);
			expect(n.y).toBeGreaterThan(0);
			expect(n.x).toBeLessThanOrEqual(w);
			expect(n.y).toBeLessThanOrEqual(h);
		}
	});

	it("includes all nodes from the map in the output", () => {
		const nodes = new Map([
			["root", makeNode({ id: "root", firstChildId: "A", lastChildId: "A" })],
			["A", makeNode({ id: "A", parentId: "root", firstChildId: "B", lastChildId: "B" })],
			["B", makeNode({ id: "B", parentId: "A" })],
		]);
		const layout = buildMinimapLayout(nodes);

		expect(layout.nodes).toHaveLength(3);
		const ids = layout.nodes.map((n) => n.id);
		expect(ids).toContain("root");
		expect(ids).toContain("A");
		expect(ids).toContain("B");
	});
});
