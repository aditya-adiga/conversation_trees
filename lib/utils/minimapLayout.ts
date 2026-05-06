import type { CTNode } from "@/lib/types/node";
import { getChildren } from "@/lib/utils/nodeUtils";

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

export interface MinimapPoint {
	x: number;
	y: number;
}

export interface MinimapViewport {
	width: number;
	height: number;
	center: MinimapPoint;
}

interface RectLike {
	left: number;
	top: number;
	width: number;
	height: number;
}

export function getMinimapViewport(viewBox: string): MinimapViewport {
	const [, , width, height] = viewBox.split(" ").map((part) => Number(part));

	return {
		width,
		height,
		center: { x: width / 2, y: height / 2 },
	};
}

export function clampMinimapZoom(value: number, minZoom: number, maxZoom: number) {
	return Math.min(maxZoom, Math.max(minZoom, value));
}

export function getAutoPan(
	layoutNodes: LayoutNode[],
	latestNodeId: string | null,
	zoom: number,
	center: MinimapPoint,
): MinimapPoint {
	const latestNode = latestNodeId
		? layoutNodes.find((node) => node.id === latestNodeId)
		: undefined;

	if (!latestNode) return { x: 0, y: 0 };

	return {
		x: center.x - latestNode.x * zoom,
		y: center.y - latestNode.y * zoom,
	};
}

export function getVisiblePan(
	hasUserMoved: boolean,
	pan: MinimapPoint,
	autoPan: MinimapPoint,
) {
	return hasUserMoved ? pan : autoPan;
}

export function getZoomedPan(
	nextZoom: number,
	currentZoom: number,
	point: MinimapPoint,
	pan: MinimapPoint,
) {
	const contentX = (point.x - pan.x) / currentZoom;
	const contentY = (point.y - pan.y) / currentZoom;

	return {
		x: point.x - contentX * nextZoom,
		y: point.y - contentY * nextZoom,
	};
}

export function getSvgPoint(
	clientX: number,
	clientY: number,
	rect: RectLike | undefined,
	viewport: MinimapViewport,
) {
	if (!rect) return viewport.center;

	return {
		x: ((clientX - rect.left) / rect.width) * viewport.width,
		y: ((clientY - rect.top) / rect.height) * viewport.height,
	};
}

export function getZoomScaledRadius(radius: number, zoom: number) {
	return radius / zoom;
}

function buildTree(
	nodeId: string,
	depth: number,
	nodes: Map<string, CTNode>,
): LayoutNode | null {
	const node = nodes.get(nodeId);
	if (!node) return null;

	const layoutChildren: LayoutNode[] = [];
	for (const child of getChildren(node, nodes)) {
		const lc = buildTree(child.id, depth + 1, nodes);
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

function collectEdges(node: LayoutNode): { from: LayoutNode; to: LayoutNode }[] {
	const edges: { from: LayoutNode; to: LayoutNode }[] = [];
	for (const child of node.children) {
		edges.push({ from: node, to: child });
		edges.push(...collectEdges(child));
	}
	return edges;
}

export function buildMinimapLayout(nodes: Map<string, CTNode>): MinimapLayout {
	const roots = [...nodes.values()].filter((n) => n.parentId === null);
	if (roots.length === 0) return { nodes: [], edges: [], viewBox: "0 0 100 100" };

	// Build one layout tree per root, place them side by side
	const counter = { value: 0 };
	const layoutRoots: LayoutNode[] = [];
	for (const root of roots) {
		const tree = buildTree(root.id, 0, nodes);
		if (tree) {
			assignX(tree, counter);
			layoutRoots.push(tree);
		}
	}

	const allNodes = layoutRoots.flatMap(flatten);
	const allEdges = layoutRoots.flatMap(collectEdges);

	if (allNodes.length === 0) return { nodes: [], edges: [], viewBox: "0 0 100 100" };

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
