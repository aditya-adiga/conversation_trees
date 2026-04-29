"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { CTNode } from "@/lib/types/node";

interface NavigationContextValue {
	currentNodeId: string | null;
	nodes: Map<string, CTNode>;
	navigate: (targetId: string | null | undefined) => void;
	addNode: (node: CTNode) => void;
	reset: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
	const [nodes, setNodes] = useState<Map<string, CTNode>>(new Map());

	const navigate = useCallback((targetId: string | null | undefined) => {
		if (targetId) setCurrentNodeId(targetId);
	}, []);

	const addNode = useCallback((node: CTNode) => {
		setNodes((prev) => {
			const next = new Map(prev);
			next.set(node.id, node);

			// Mirror the two mutations nodeService.createNode() made on the server:
			// 1. Patch prev sibling's nextSiblingId
			if (node.prevSiblingId) {
				const prevSib = next.get(node.prevSiblingId);
				if (prevSib) next.set(node.prevSiblingId, { ...prevSib, nextSiblingId: node.id });
			}
			// 2. Patch parent's lastChildId (and firstChildId if this is the first child)
			if (node.parentId) {
				const parent = next.get(node.parentId);
				if (parent) {
					next.set(node.parentId, {
						...parent,
						lastChildId: node.id,
						firstChildId: parent.firstChildId ?? node.id,
					});
				}
			}

			return next;
		});

		// Auto-navigate to the first node that arrives
		setCurrentNodeId((prev) => prev ?? node.id);
	}, []);

	const reset = useCallback(() => {
		setCurrentNodeId(null);
		setNodes(new Map());
	}, []);

	return (
		<NavigationContext.Provider value={{ currentNodeId, nodes, navigate, addNode, reset }}>
			{children}
		</NavigationContext.Provider>
	);
}

export function useNavigation() {
	const ctx = useContext(NavigationContext);
	if (!ctx) throw new Error("useNavigation must be used within NavigationProvider");
	return ctx;
}
