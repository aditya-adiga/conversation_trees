"use client";

import { useNavigation } from "@/lib/context/NavigationContext";
import { getChildren, getAllSiblingIds, getSiblings } from "@/lib/utils/nodeUtils";
import { childOpacity, siblingOpacity } from "@/lib/utils/nodeView";
import type { CTNode } from "@/lib/types/node";
import { useEffect, useMemo } from "react";
import NeighbourCard from "./NeighbourCard";

export default function NodeView() {
	const { currentNodeId, nodes, navigate } = useNavigation();

	const node = currentNodeId ? nodes.get(currentNodeId) : undefined;
	const parent = node?.parentId ? nodes.get(node.parentId) : undefined;
	const siblings = node ? getSiblings(node, nodes) : [];
	const children = node ? getChildren(node, nodes) : [];
	const allSiblingIds = useMemo(
		() => (node ? getAllSiblingIds(node, nodes) : []),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[node?.id, nodes],
	);
	const siblingIndex = node ? allSiblingIds.indexOf(node.id) : -1;

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (!node) return;
			switch (e.key) {
				case "ArrowUp":
					e.preventDefault();
					navigate(node.parentId);
					break;
				case "ArrowDown":
					e.preventDefault();
					if (node.firstChildId) {
						navigate(node.firstChildId);
					}
					break;
				case "ArrowLeft":
					e.preventDefault();
					if (allSiblingIds.length > 1) {
						// Carousel: wrap to last
						const prev =
							siblingIndex > 0
								? allSiblingIds[siblingIndex - 1]
								: allSiblingIds[allSiblingIds.length - 1];
						navigate(prev);
					}
					break;
				case "ArrowRight":
					e.preventDefault();
					if (allSiblingIds.length > 1) {
						// Carousel: wrap to first
						const next =
							siblingIndex < allSiblingIds.length - 1
								? allSiblingIds[siblingIndex + 1]
								: allSiblingIds[0];
						navigate(next);
					}
					break;
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [node, navigate, siblingIndex, allSiblingIds]);

	if (!node) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<p className="text-[var(--text-muted)]">Node not found</p>
			</div>
		);
	}

	// Split siblings into before/after current, with distance for opacity
	const siblingsBefore: { node: CTNode; distance: number }[] = [];
	const siblingsAfter: { node: CTNode; distance: number }[] = [];

	for (const s of siblings) {
		const idx = allSiblingIds.indexOf(s.id);
		if (idx < siblingIndex) {
			siblingsBefore.push({ node: s, distance: siblingIndex - idx });
		} else {
			siblingsAfter.push({ node: s, distance: idx - siblingIndex });
		}
	}

	// Reverse "before" so nearest sibling is closest to center (bottom of stack)
	siblingsBefore.reverse();

	return (
		<div className="grid h-full w-full grid-rows-[auto_1fr_auto] gap-4 p-6">
			{/* Parent — top center */}
			<div className="flex justify-center">
				{parent ? (
					<div className="w-64">
						<NeighbourCard
							node={parent}
							direction="parent"
							onClick={() => navigate(parent.id)}
							opacity={0.6}
						/>
					</div>
				) : (
					<div className="h-6" />
				)}
			</div>

			{/* Middle row: siblings left | current node | siblings right */}
			<div className="grid grid-cols-[12rem_1fr_12rem] items-center gap-4">
				{/* Siblings before — stacked, nearest at bottom (closest to center) */}
				<div className="flex flex-col-reverse items-end gap-2">
					{siblingsBefore.map(({ node: s, distance }) => (
						<NeighbourCard
							key={s.id}
							node={s}
							direction="sibling"
							onClick={() => navigate(s.id)}
							opacity={siblingOpacity(distance)}
						/>
					))}
				</div>

				{/* Current node — center */}
				<div className="flex h-full items-center justify-center">
					<div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-white p-10 shadow-[var(--card-shadow)] transition-shadow duration-300 hover:shadow-[var(--card-hover-shadow)]">
						<h2 className="mb-4 font-serif text-2xl font-semibold tracking-tight text-[var(--text-heading)]">
							{node.summary || "Untitled"}
						</h2>
						<p className="text-[15px] leading-relaxed text-[var(--text-body)]">
							{node.content}
						</p>
					</div>
				</div>

				{/* Siblings after — stacked, nearest on top */}
				<div className="flex flex-col items-start gap-2">
					{siblingsAfter.map(({ node: s, distance }) => (
						<NeighbourCard
							key={s.id}
							node={s}
							direction="sibling"
							onClick={() => navigate(s.id)}
							opacity={siblingOpacity(distance)}
						/>
					))}
				</div>
			</div>

			{/* Children — horizontal row, fading at edges */}
			<div className="flex justify-center">
				{children.length > 0 && (
					<div className="flex gap-3">
						{children.map((child, i) => (
							<div key={child.id} className="w-48 shrink-0">
								<NeighbourCard
									node={child}
									direction="child"
									onClick={() => navigate(child.id)}
									opacity={childOpacity(i, children.length)}
								/>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
