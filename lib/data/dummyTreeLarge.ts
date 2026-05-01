import type { CTNode } from "../types/node";

const N = (n: number) =>
	`00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

const ROOT = N(1);
const A = N(2),  A1  = N(3),  A2  = N(4),  A3  = N(5);
const A1a = N(6),  A1b = N(7),  A3a = N(8),  A3b = N(9);
const B = N(10), B1  = N(11), B2  = N(12), B3  = N(13), B4  = N(14);
const B2a = N(15), B2b = N(16), B2a1 = N(17), B2a2 = N(18);
const C = N(19), C1  = N(20), C2  = N(21);
const C1a = N(22), C1b = N(23), C1c = N(24);
const C2a = N(25), C2b = N(26), C2b1 = N(27), C2b2 = N(28);
const D = N(29);
const E = N(30), E1  = N(31), E2  = N(32), E3  = N(33);
const E2a = N(34), E2b = N(35);

export const ROOT_NODE_ID_LARGE = ROOT;

const nodes = new Map<string, CTNode>([
	[ROOT, {
		id: ROOT, parentId: null, summary: "Root",
		content: "This is the root node of a large synthetic conversation tree, created specifically to stress-test the minimap layout and rendering components. It sits at depth zero and anchors the entire structure below it. From here, five major branches extend outward — each representing a distinct line of reasoning that emerged from this opening premise. Branch A pursues the first logical direction and grows two levels deep. Branch B is the widest and deepest path in the tree, reaching four levels at its maximum extent through the B2a sub-branch. Branch C synthesises ideas from the earlier branches and introduces speculative conclusions. Branch D is a short dead-end that was explored briefly before being abandoned. Branch E revisits the core question from a completely fresh perspective. Together these branches form a tree of 35 nodes spread across five depth levels, giving the minimap enough complexity to reveal how it handles both width and depth simultaneously.",
		prevSiblingId: null, nextSiblingId: null,
		firstChildId: A, lastChildId: E,
	}],

	// ── Depth 1 ────────────────────────────────────────────────────────────────
	[A, {
		id: A, parentId: ROOT, summary: "Branch A",
		content: "Branch A explores the first major direction.",
		prevSiblingId: null, nextSiblingId: B,
		firstChildId: A1, lastChildId: A3,
	}],
	[B, {
		id: B, parentId: ROOT, summary: "Branch B",
		content: "Branch B takes a wider approach with four sub-branches.",
		prevSiblingId: A, nextSiblingId: C,
		firstChildId: B1, lastChildId: B4,
	}],
	[C, {
		id: C, parentId: ROOT, summary: "Branch C",
		content: "Branch C synthesises the ideas from A and B.",
		prevSiblingId: B, nextSiblingId: D,
		firstChildId: C1, lastChildId: C2,
	}],
	[D, {
		id: D, parentId: ROOT, summary: "Branch D — leaf",
		content: "Branch D is a dead-end exploration that didn't pan out.",
		prevSiblingId: C, nextSiblingId: E,
		firstChildId: null, lastChildId: null,
	}],
	[E, {
		id: E, parentId: ROOT, summary: "Branch E",
		content: "Branch E revisits the problem from a fresh angle.",
		prevSiblingId: D, nextSiblingId: null,
		firstChildId: E1, lastChildId: E3,
	}],

	// ── A subtree (depth 2–3) ──────────────────────────────────────────────────
	[A1, {
		id: A1, parentId: A, summary: "A1",
		content: "A1 digs into the first nuance of Branch A.",
		prevSiblingId: null, nextSiblingId: A2,
		firstChildId: A1a, lastChildId: A1b,
	}],
	[A2, {
		id: A2, parentId: A, summary: "A2 — leaf",
		content: "A2 is a quick tangent that reached a natural end.",
		prevSiblingId: A1, nextSiblingId: A3,
		firstChildId: null, lastChildId: null,
	}],
	[A3, {
		id: A3, parentId: A, summary: "A3",
		content: "A3 picks up where A1 left off with a parallel approach.",
		prevSiblingId: A2, nextSiblingId: null,
		firstChildId: A3a, lastChildId: A3b,
	}],
	[A1a, {
		id: A1a, parentId: A1, summary: "A1a — leaf",
		content: "A1a provides a concrete example supporting A1.",
		prevSiblingId: null, nextSiblingId: A1b,
		firstChildId: null, lastChildId: null,
	}],
	[A1b, {
		id: A1b, parentId: A1, summary: "A1b — leaf",
		content: "A1b provides a counter-example that refines A1.",
		prevSiblingId: A1a, nextSiblingId: null,
		firstChildId: null, lastChildId: null,
	}],
	[A3a, {
		id: A3a, parentId: A3, summary: "A3a — leaf",
		content: "A3a confirms the parallel approach with evidence.",
		prevSiblingId: null, nextSiblingId: A3b,
		firstChildId: null, lastChildId: null,
	}],
	[A3b, {
		id: A3b, parentId: A3, summary: "A3b — leaf",
		content: "A3b pushes the parallel approach to its limit.",
		prevSiblingId: A3a, nextSiblingId: null,
		firstChildId: null, lastChildId: null,
	}],

	// ── B subtree (depth 2–4) ──────────────────────────────────────────────────
	[B1, {
		id: B1, parentId: B, summary: "B1 — leaf",
		content: "B1 is the simplest sub-branch of B.",
		prevSiblingId: null, nextSiblingId: B2,
		firstChildId: null, lastChildId: null,
	}],
	[B2, {
		id: B2, parentId: B, summary: "B2",
		content: "B2 is the deepest path in the tree.",
		prevSiblingId: B1, nextSiblingId: B3,
		firstChildId: B2a, lastChildId: B2b,
	}],
	[B3, {
		id: B3, parentId: B, summary: "B3 — leaf",
		content: "B3 is a brief detour from B2.",
		prevSiblingId: B2, nextSiblingId: B4,
		firstChildId: null, lastChildId: null,
	}],
	[B4, {
		id: B4, parentId: B, summary: "B4 — leaf",
		content: "B4 closes out Branch B with a final observation.",
		prevSiblingId: B3, nextSiblingId: null,
		firstChildId: null, lastChildId: null,
	}],
	[B2a, {
		id: B2a, parentId: B2, summary: "B2a",
		content: "B2a is the main thread of the deep path.",
		prevSiblingId: null, nextSiblingId: B2b,
		firstChildId: B2a1, lastChildId: B2a2,
	}],
	[B2b, {
		id: B2b, parentId: B2, summary: "B2b — leaf",
		content: "B2b is an alternative to B2a that was abandoned.",
		prevSiblingId: B2a, nextSiblingId: null,
		firstChildId: null, lastChildId: null,
	}],
	[B2a1, {
		id: B2a1, parentId: B2a, summary: "B2a1 — leaf",
		content: "B2a1 is the first leaf at maximum depth.",
		prevSiblingId: null, nextSiblingId: B2a2,
		firstChildId: null, lastChildId: null,
	}],
	[B2a2, {
		id: B2a2, parentId: B2a, summary: "B2a2 — leaf",
		content: "B2a2 is the second leaf at maximum depth.",
		prevSiblingId: B2a1, nextSiblingId: null,
		firstChildId: null, lastChildId: null,
	}],

	// ── C subtree (depth 2–4) ──────────────────────────────────────────────────
	[C1, {
		id: C1, parentId: C, summary: "C1",
		content: "C1 expands the synthesis with three concrete points.",
		prevSiblingId: null, nextSiblingId: C2,
		firstChildId: C1a, lastChildId: C1c,
	}],
	[C2, {
		id: C2, parentId: C, summary: "C2",
		content: "C2 takes the synthesis in a more speculative direction.",
		prevSiblingId: C1, nextSiblingId: null,
		firstChildId: C2a, lastChildId: C2b,
	}],
	[C1a, {
		id: C1a, parentId: C1, summary: "C1a — leaf",
		content: "C1a: first concrete point of the synthesis.",
		prevSiblingId: null, nextSiblingId: C1b,
		firstChildId: null, lastChildId: null,
	}],
	[C1b, {
		id: C1b, parentId: C1, summary: "C1b — leaf",
		content: "C1b: second concrete point of the synthesis.",
		prevSiblingId: C1a, nextSiblingId: C1c,
		firstChildId: null, lastChildId: null,
	}],
	[C1c, {
		id: C1c, parentId: C1, summary: "C1c — leaf",
		content: "C1c: third concrete point, wrapping up C1.",
		prevSiblingId: C1b, nextSiblingId: null,
		firstChildId: null, lastChildId: null,
	}],
	[C2a, {
		id: C2a, parentId: C2, summary: "C2a — leaf",
		content: "C2a tests the speculative direction against reality.",
		prevSiblingId: null, nextSiblingId: C2b,
		firstChildId: null, lastChildId: null,
	}],
	[C2b, {
		id: C2b, parentId: C2, summary: "C2b",
		content: "C2b goes deeper into the speculative direction.",
		prevSiblingId: C2a, nextSiblingId: null,
		firstChildId: C2b1, lastChildId: C2b2,
	}],
	[C2b1, {
		id: C2b1, parentId: C2b, summary: "C2b1 — leaf",
		content: "C2b1: first speculative conclusion.",
		prevSiblingId: null, nextSiblingId: C2b2,
		firstChildId: null, lastChildId: null,
	}],
	[C2b2, {
		id: C2b2, parentId: C2b, summary: "C2b2 — leaf",
		content: "C2b2: second speculative conclusion.",
		prevSiblingId: C2b1, nextSiblingId: null,
		firstChildId: null, lastChildId: null,
	}],

	// ── E subtree (depth 2–3) ──────────────────────────────────────────────────
	[E1, {
		id: E1, parentId: E, summary: "E1 — leaf",
		content: "E1 is the quickest path in Branch E.",
		prevSiblingId: null, nextSiblingId: E2,
		firstChildId: null, lastChildId: null,
	}],
	[E2, {
		id: E2, parentId: E, summary: "E2",
		content: "E2 develops the fresh angle further.",
		prevSiblingId: E1, nextSiblingId: E3,
		firstChildId: E2a, lastChildId: E2b,
	}],
	[E3, {
		id: E3, parentId: E, summary: "E3 — leaf",
		content: "E3 closes Branch E with a summary observation.",
		prevSiblingId: E2, nextSiblingId: null,
		firstChildId: null, lastChildId: null,
	}],
	[E2a, {
		id: E2a, parentId: E2, summary: "E2a — leaf",
		content: "E2a supports the fresh angle with a case study.",
		prevSiblingId: null, nextSiblingId: E2b,
		firstChildId: null, lastChildId: null,
	}],
	[E2b, {
		id: E2b, parentId: E2, summary: "E2b — leaf",
		content: "E2b challenges the fresh angle, adding nuance.",
		prevSiblingId: E2a, nextSiblingId: null,
		firstChildId: null, lastChildId: null,
	}],
]);

export function getNode(id: string): CTNode | undefined {
	return nodes.get(id);
}

export function getChildren(node: CTNode): CTNode[] {
	const children: CTNode[] = [];
	let childId = node.firstChildId;
	while (childId) {
		const child = nodes.get(childId);
		if (!child) break;
		children.push(child);
		childId = child.nextSiblingId;
	}
	return children;
}

export function getSiblings(node: CTNode): CTNode[] {
	if (!node.parentId) return [];
	const parent = nodes.get(node.parentId);
	if (!parent) return [];
	return getChildren(parent).filter((n) => n.id !== node.id);
}

export function getAllSiblingIds(node: CTNode): string[] {
	if (!node.parentId) return [node.id];
	const parent = nodes.get(node.parentId);
	if (!parent) return [node.id];
	return getChildren(parent).map((n) => n.id);
}
