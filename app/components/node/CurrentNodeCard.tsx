import type { CTNode } from "@/lib/types/node";

interface CurrentNodeCardProps {
	node: CTNode;
}

export default function CurrentNodeCard({ node }: CurrentNodeCardProps) {
	return (
		<div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-10 shadow-[var(--card-shadow)] transition-shadow duration-300 hover:shadow-[var(--card-hover-shadow)]">
			<h2 className="mb-4 font-serif text-2xl font-semibold tracking-tight text-[var(--text-heading)]">
				{node.summary || "Untitled"}
			</h2>
			<p className="text-[15px] leading-relaxed text-[var(--text-body)]">
				{node.content}
			</p>
		</div>
	);
}
