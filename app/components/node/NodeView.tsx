"use client";

import { useNavigation } from "@/lib/context/NavigationContext";
import { getChildren, getAllSiblingIds, getSiblings } from "@/lib/utils/nodeUtils";
import { childOpacity, siblingOpacity } from "@/lib/utils/nodeView";
import type { CTNode } from "@/lib/types/node";
import { useEffect, useMemo, useRef } from "react";
import { useSwipe } from "@/lib/hooks/useSwipe";
import NeighbourCard from "./NeighbourCard";

interface NodeViewProps {
	onOpenTranscript?: () => void;
}

export default function NodeView({ onOpenTranscript }: NodeViewProps) {
	const { currentNodeId, latestNodeId, nodes, navigate } = useNavigation();

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

	const containerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLParagraphElement>(null);

	useEffect(() => {
		if (contentRef.current) {
			contentRef.current.scrollTop = 0;
		}
	}, [currentNodeId]);

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

	useSwipe(containerRef, {
		onSwipeUp: () => { if (node?.firstChildId) navigate(node.firstChildId); },
		onSwipeDown: () => { if (node) navigate(node.parentId); },
		onSwipeLeft: () => {
			if (!node || allSiblingIds.length <= 1) return;
			const next =
				siblingIndex < allSiblingIds.length - 1
					? allSiblingIds[siblingIndex + 1]
					: allSiblingIds[0];
			navigate(next);
		},
		onSwipeRight: () => {
			if (!node || allSiblingIds.length <= 1) return;
			const prev =
				siblingIndex > 0
					? allSiblingIds[siblingIndex - 1]
					: allSiblingIds[allSiblingIds.length - 1];
			navigate(prev);
		},
	});

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
		<div ref={containerRef} className="flex h-full w-full flex-col overflow-y-auto px-4 pb-52 pt-20 sm:grid sm:grid-rows-[auto_1fr_auto] sm:overflow-hidden sm:gap-4 sm:px-6 sm:pb-6 sm:pt-20">
			{/* Parent — top center, desktop only */}
			<div className="hidden sm:flex sm:justify-center">
				{parent ? (
					<div className="w-64">
						<NeighbourCard
							node={parent}
							direction="parent"
							onClick={() => navigate(parent.id)}
							opacity={0.6}
							isLatest={parent.id === latestNodeId}
						/>
					</div>
				) : (
					<div className="h-6" />
				)}
			</div>

			{/* Middle row: on mobile flex-1 fills remaining height; on desktop grid */}
			<div className="flex flex-1 items-center justify-center sm:grid sm:grid-cols-[12rem_1fr_12rem] sm:items-center sm:gap-4">
				{/* Siblings before — desktop only; mobile navigates via swipe */}
				<div className="hidden sm:flex sm:flex-col-reverse sm:items-end sm:gap-2">
					{siblingsBefore.map(({ node: s, distance }) => (
						<NeighbourCard
							key={s.id}
							node={s}
							direction="sibling"
							onClick={() => navigate(s.id)}
							opacity={siblingOpacity(distance)}
							isLatest={s.id === latestNodeId}
						/>
					))}
				</div>

				{/* Current node */}
				<div className="flex w-full flex-col items-center justify-center">
					<div className={`w-full max-w-2xl rounded-2xl border p-6 shadow-[var(--card-shadow)] transition-shadow duration-300 hover:shadow-[var(--card-hover-shadow)] sm:p-10 ${node.id === latestNodeId ? "border-[var(--latest)] bg-[var(--latest-bg)]" : "border-[var(--border)] bg-white"}`}>
						<div className="mb-4 flex items-start gap-3">
							<h2 className="flex-1 font-serif text-xl font-semibold tracking-tight text-[var(--text-heading)] sm:text-2xl">
								{node.name || "Untitled"}
							</h2>
							{node.id === latestNodeId && (
								<span className="mt-1.5 flex shrink-0 items-center gap-1 text-xs text-[var(--text-muted)]">
									<span className="h-1.5 w-1.5 rounded-full bg-[var(--latest)] animate-pulse" />
									new
								</span>
							)}
							{latestNodeId && node.id !== latestNodeId && (
								<button
									type="button"
									onClick={() => navigate(latestNodeId)}
									className="mt-0.5 shrink-0 rounded-full border border-[var(--latest)] bg-[var(--latest-bg)] px-3 py-1 text-xs font-medium text-[var(--latest)] transition-colors hover:bg-white"
								>
									Jump to latest
								</button>
							)}
							{onOpenTranscript && (
								<button
									type="button"
									onClick={onOpenTranscript}
									className="mt-0.5 shrink-0 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-body)]"
								>
									Transcript
								</button>
							)}
						</div>
						<p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Summary</p>
						<p ref={contentRef} className="max-h-52 overflow-y-auto text-[15px] leading-relaxed text-[var(--text-body)] sm:max-h-96">
							{node.content}
						</p>
					</div>

				</div>

				{/* Siblings after — desktop only */}
				<div className="hidden sm:flex sm:flex-col sm:items-start sm:gap-2">
					{siblingsAfter.map(({ node: s, distance }) => (
						<NeighbourCard
							key={s.id}
							node={s}
							direction="sibling"
							onClick={() => navigate(s.id)}
							opacity={siblingOpacity(distance)}
							isLatest={s.id === latestNodeId}
						/>
					))}
				</div>
			</div>

			{/* Children — desktop only */}
			<div className="hidden sm:flex sm:justify-center">
				{children.length > 0 && (
					<div className="flex gap-3">
						{children.map((child, i) => (
							<div key={child.id} className="w-48 shrink-0">
								<NeighbourCard
									node={child}
									direction="child"
									onClick={() => navigate(child.id)}
									opacity={childOpacity(i, children.length)}
									isLatest={child.id === latestNodeId}
								/>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
