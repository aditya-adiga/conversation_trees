import { getChildren, getNode, ROOT_NODE_ID_LARGE as ROOT_NODE_ID } from "@/lib/data/dummyTreeLarge";

export interface LayoutNode {
	id: string;
	x: number;
	y: number;
	children: LayoutNode[];
}

export interface MinimapLayout {
	nodes: LayoutNode[];
	edges: { from: LayoutNode; to: LayoutNode }[];
	viewBox: string;
}

function buildTree(nodeId: string, depth: number): LayoutNode | null {
	const node = getNode(nodeId);
	if (!node) return null;

	const children = getChildren(node);
	const layoutChildren: LayoutNode[] = [];
	for (const child of children) {
		const lc = buildTree(child.id, depth + 1);
		if (lc) layoutChildren.push(lc);
	}

	return { id: node.id, x: 0, y: depth, children: layoutChildren };
}

// Assign x positions using leaf-counting so spacing is proportional to tree width
function assignX(node: LayoutNode, counter: { value: number }) {
	if (node.children.length === 0) {
		node.x = counter.value++;
		return;
	}
	for (const child of node.children) {
		assignX(child, counter);
	}
	const first = node.children[0].x;
	const last = node.children[node.children.length - 1].x;
	node.x = (first + last) / 2;
}

function flatten(node: LayoutNode): LayoutNode[] {
	return [node, ...node.children.flatMap(flatten)];
}

function collectEdges(
	node: LayoutNode,
): { from: LayoutNode; to: LayoutNode }[] {
	const edges: { from: LayoutNode; to: LayoutNode }[] = [];
	for (const child of node.children) {
		edges.push({ from: node, to: child });
		edges.push(...collectEdges(child));
	}
	return edges;
}

export function buildMinimapLayout(): MinimapLayout {
	const root = buildTree(ROOT_NODE_ID, 0);
	if (!root) return { nodes: [], edges: [], viewBox: "0 0 100 100" };

	assignX(root, { value: 0 });

	const allNodes = flatten(root);
	const allEdges = collectEdges(root);

	const maxX = Math.max(...allNodes.map((n) => n.x));
	const maxY = Math.max(...allNodes.map((n) => n.y));

	const cols = maxX + 1;
	const rows = maxY + 1;
	const hGap = 100 / (cols + 1);
	const vGap = 100 / (rows + 1);

	for (const n of allNodes) {
		n.x = (n.x + 1) * hGap;
		n.y = (n.y + 0.5) * vGap;
	}

	return {
		nodes: allNodes,
		edges: allEdges,
		viewBox: `0 0 100 ${rows * vGap + vGap * 0.5}`,
	};
}
