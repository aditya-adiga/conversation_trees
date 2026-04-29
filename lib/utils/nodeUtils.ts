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

export function getAllSiblingIds(node: CTNode, nodes: Map<string, CTNode>): string[] {
	if (!node.parentId) return [node.id];
	const parent = nodes.get(node.parentId);
	if (!parent) return [node.id];
	return getChildren(parent, nodes).map((n) => n.id);
}

export function getSiblings(node: CTNode, nodes: Map<string, CTNode>): CTNode[] {
	if (!node.parentId) return [];
	const parent = nodes.get(node.parentId);
	if (!parent) return [];
	return getChildren(parent, nodes).filter((n) => n.id !== node.id);
}
