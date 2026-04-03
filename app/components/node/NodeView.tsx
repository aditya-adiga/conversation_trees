"use client";

import { OPACITY } from "@/lib/constants/layout";
import {
	getAllSiblingIds,
	getChildren,
	getNode,
	getSiblings,
	ROOT_NODE_ID,
} from "@/lib/data/dummyTree";
import type { CTNode } from "@/lib/types/node";
import { useCallback, useEffect, useState } from "react";
import CurrentNodeCard from "./CurrentNodeCard";
import NeighbourCard from "./NeighbourCard";

function siblingOpacity(distance: number): number {
	if (distance === 1) return OPACITY.SIBLING.NEAR;
	if (distance === 2) return OPACITY.SIBLING.MEDIUM;
	return OPACITY.SIBLING.FAR;
}

function childOpacity(index: number, total: number): number {
	const center = (total - 1) / 2;
	const dist = Math.abs(index - center);
	const maxDist = Math.max(center, 1);
	return Math.max(
		OPACITY.CHILD.MIN,
		OPACITY.CHILD.MAX - (dist / maxDist) * OPACITY.CHILD.SPREAD,
	);
}

export default function NodeView() {
	const [currentNodeId, setCurrentNodeId] = useState(ROOT_NODE_ID);

	const node = getNode(currentNodeId);
	const parent = node?.parentId ? getNode(node.parentId) : undefined;
	const siblings = node ? getSiblings(node) : [];
	const children = node ? getChildren(node) : [];
	const allSiblingIds = node ? getAllSiblingIds(node) : [];
	const siblingIndex = node ? allSiblingIds.indexOf(node.id) : -1;

	const navigate = useCallback((targetId: string | null | undefined) => {
		if (targetId) setCurrentNodeId(targetId);
	}, []);

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
							opacity={OPACITY.PARENT}
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
					<CurrentNodeCard node={node} />
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
