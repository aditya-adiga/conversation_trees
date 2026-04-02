"use client";

import { useNavigation } from "@/lib/context/NavigationContext";
import { buildMinimapLayout } from "@/lib/utils/minimapLayout";

// Computed once — tree data is static
const layout = buildMinimapLayout();

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
