"use client";

import { getChildren, getNode, ROOT_NODE_ID } from "@/lib/data/dummyTree";
import { useNavigation } from "@/lib/context/NavigationContext";

interface LayoutNode {
	id: string;
	x: number;
	y: number;
	children: LayoutNode[];
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

	return {
		id: node.id,
		x: 0,
		y: depth,
		children: layoutChildren,
	};
}

// Assign x positions using leaf-counting so spacing is proportional to tree width
function assignX(node: LayoutNode, counter: { value: number }) {
	if (node.children.length === 0) {
		node.x = counter.value;
		counter.value++;
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

function buildLayout() {
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

// Computed once — tree data is static
const layout = buildLayout();

export default function Minimap() {
	const { currentNodeId, navigate } = useNavigation();
	const { nodes, edges, viewBox } = layout;

	const r = 2.5;

	return (
		<div className="fixed bottom-4 right-4 z-50 h-36 w-36 overflow-hidden rounded-full border border-[var(--border)] bg-white/90 shadow-lg backdrop-blur-sm">
			<svg
				viewBox={viewBox}
				preserveAspectRatio="xMidYMid meet"
				className="h-full w-full"
			>
				{edges.map(({ from, to }) => (
					<line
						key={`${from.id}-${to.id}`}
						x1={from.x}
						y1={from.y}
						x2={to.x}
						y2={to.y}
						stroke="var(--border)"
						strokeWidth={0.4}
					/>
				))}

				{nodes.map((n) => {
					const isCurrent = n.id === currentNodeId;
					return (
						<g
							key={n.id}
							onClick={() => navigate(n.id)}
							className="cursor-pointer"
						>
							<circle
								cx={n.x}
								cy={n.y}
								r={isCurrent ? r + 1 : r}
								fill={isCurrent ? "var(--text-heading)" : "white"}
								stroke={isCurrent ? "var(--text-heading)" : "var(--text-muted)"}
								strokeWidth={isCurrent ? 0.6 : 0.4}
								className="transition-all duration-200"
							/>
						</g>
					);
				})}
			</svg>
		</div>
	);
}
