"use client";

export default function Minimap() {
	return (
		<div className="fixed bottom-6 right-6 z-50 flex h-40 w-40 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] shadow-[var(--card-shadow)]">
			<span className="font-serif text-xs text-[var(--text-muted)]">Minimap</span>
		</div>
	);
}
