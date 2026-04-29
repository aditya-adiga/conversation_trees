"use client";

import type { CTNode } from "@/lib/types/node";

type Direction = "parent" | "child" | "sibling";

interface NeighbourCardProps {
	node: CTNode;
	direction: Direction;
	onClick: () => void;
	opacity?: number;
	isLatest?: boolean;
}

const directionHint: Record<Direction, string> = {
	parent: "↑",
	child: "↓",
	sibling: "←→",
};

export default function NeighbourCard({
	node,
	direction,
	onClick,
	opacity = 0.7,
	isLatest = false,
}: NeighbourCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{ opacity }}
			className={`w-full cursor-pointer rounded-xl border p-4 text-left shadow-[var(--card-shadow)] transition-all duration-200 hover:opacity-100 hover:shadow-[var(--card-hover-shadow)] ${isLatest ? "border-l-2 border-[var(--latest)] bg-[var(--latest-bg)]" : "border-[var(--border)] bg-white"}`}
		>
			<div className="mb-1.5 flex items-center gap-1.5">
				<span className="text-xs text-[var(--text-muted)]">
					{directionHint[direction]}
				</span>
				<h3 className="truncate font-serif text-sm font-semibold tracking-tight text-[var(--text-heading)]">
					{node.summary || "Untitled"}
				</h3>
				{isLatest && (
					<span className="ml-auto shrink-0 h-1.5 w-1.5 rounded-full bg-[var(--latest)] animate-pulse" />
				)}
			</div>
			<p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
				{node.content}
			</p>
		</button>
	);
}
