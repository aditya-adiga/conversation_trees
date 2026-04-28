import type { CTNode } from "../types/node";

// Node IDs
const ROOT = "00000000-0000-0000-0000-000000000001";
const CHILD_A = "00000000-0000-0000-0000-000000000002";
const CHILD_B = "00000000-0000-0000-0000-000000000003";
const CHILD_C = "00000000-0000-0000-0000-000000000004";
const CHILD_B1 = "00000000-0000-0000-0000-000000000005";
const CHILD_B2 = "00000000-0000-0000-0000-000000000006";
const CHILD_A1 = "00000000-0000-0000-0000-000000000007";
const CHILD_C1 = "00000000-0000-0000-0000-000000000008";

export const ROOT_NODE_ID = ROOT;

const nodes = new Map<string, CTNode>([
	[
		ROOT,
		{
			id: ROOT,
			content:
				"This is the root of the conversation. It sets up the initial context and framing for everything that follows. Think of it as the trunk of a tree from which all branches grow.",
			summary: "Root — the starting point",
			parentId: null,
			prevSiblingId: null,
			nextSiblingId: null,
			firstChildId: CHILD_A,
			lastChildId: CHILD_C,
		},
	],
	[
		CHILD_A,
		{
			id: CHILD_A,
			content:
				"Branch A takes the original premise and pushes it in one particular direction, examining the implications carefully.",
			summary: "Branch A — first direction",
			parentId: ROOT,
			prevSiblingId: null,
			nextSiblingId: CHILD_B,
			firstChildId: CHILD_A1,
			lastChildId: CHILD_A1,
		},
	],
	[
		CHILD_B,
		{
			id: CHILD_B,
			content:
				"Branch B takes a different angle. Rather than following the path of Branch A, it considers an alternative interpretation and builds on that instead.",
			summary: "Branch B — alternative angle",
			parentId: ROOT,
			prevSiblingId: CHILD_A,
			nextSiblingId: CHILD_C,
			firstChildId: CHILD_B1,
			lastChildId: CHILD_B2,
		},
	],
	[
		CHILD_C,
		{
			id: CHILD_C,
			content:
				"Branch C is the third perspective. It synthesises elements from the previous branches while introducing a new consideration that neither addressed.",
			summary: "Branch C — synthesis",
			parentId: ROOT,
			prevSiblingId: CHILD_B,
			nextSiblingId: null,
			firstChildId: CHILD_C1,
			lastChildId: CHILD_C1,
		},
	],
	[
		CHILD_A1,
		{
			id: CHILD_A1,
			content:
				"A deeper elaboration on Branch A. This node digs into the specifics and provides concrete examples to support the direction taken above.",
			summary: "A1 — deeper into Branch A",
			parentId: CHILD_A,
			prevSiblingId: null,
			nextSiblingId: null,
			firstChildId: null,
			lastChildId: null,
		},
	],
	[
		CHILD_B1,
		{
			id: CHILD_B1,
			content:
				"The first sub-branch of B. It picks up the alternative interpretation and tests it against a specific scenario to see how well it holds.",
			summary: "B1 — testing the alternative",
			parentId: CHILD_B,
			prevSiblingId: null,
			nextSiblingId: CHILD_B2,
			firstChildId: null,
			lastChildId: null,
		},
	],
	[
		CHILD_B2,
		{
			id: CHILD_B2,
			content:
				"The second sub-branch of B. It challenges the first sub-branch and proposes a refinement that accounts for edge cases.",
			summary: "B2 — refinement of B1",
			parentId: CHILD_B,
			prevSiblingId: CHILD_B1,
			nextSiblingId: null,
			firstChildId: null,
			lastChildId: null,
		},
	],
	[
		CHILD_C1,
		{
			id: CHILD_C1,
			content:
				"A continuation of the synthesis from Branch C. It wraps together the insights gathered so far and points toward a possible conclusion.",
			summary: "C1 — toward a conclusion",
			parentId: CHILD_C,
			prevSiblingId: null,
			nextSiblingId: null,
			firstChildId: null,
			lastChildId: null,
		},
	],
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
