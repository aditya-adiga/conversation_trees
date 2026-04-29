import type { CTNode } from "@/lib/types/node";

export function getChildren(node: CTNode, nodes: Map<string, CTNode>): CTNode[] {
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

function getRootNodes(nodes: Map<string, CTNode>): CTNode[] {
	return [...nodes.values()].filter((n) => n.parentId === null);
}

export function getAllSiblingIds(node: CTNode, nodes: Map<string, CTNode>): string[] {
	if (!node.parentId) return getRootNodes(nodes).map((n) => n.id);
	const parent = nodes.get(node.parentId);
	if (!parent) return [node.id];
	return getChildren(parent, nodes).map((n) => n.id);
}

export function getSiblings(node: CTNode, nodes: Map<string, CTNode>): CTNode[] {
	if (!node.parentId) return getRootNodes(nodes).filter((n) => n.id !== node.id);
	const parent = nodes.get(node.parentId);
	if (!parent) return [];
	return getChildren(parent, nodes).filter((n) => n.id !== node.id);
}
