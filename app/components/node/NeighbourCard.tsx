"use client";

import { OPACITY } from "@/lib/constants/layout";
import type { CTNode } from "@/lib/types/node";

type Direction = "parent" | "child" | "sibling";

interface NeighbourCardProps {
	node: CTNode;
	direction: Direction;
	onClick: () => void;
	opacity?: number;
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
	opacity = OPACITY.DEFAULT_CARD,
}: NeighbourCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{ opacity }}
			className="w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left shadow-[var(--card-shadow)] transition-all duration-200 hover:opacity-100 hover:shadow-[var(--card-hover-shadow)]"
		>
			<div className="mb-1.5 flex items-center gap-1.5">
				<span className="text-xs text-[var(--text-muted)]">
					{directionHint[direction]}
				</span>
				<h3 className="truncate font-serif text-sm font-semibold tracking-tight text-[var(--text-heading)]">
					{node.summary || "Untitled"}
				</h3>
			</div>
			<p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
				{node.content}
			</p>
		</button>
	);
}
