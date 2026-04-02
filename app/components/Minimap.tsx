"use client";

export default function Minimap() {
	return (
		<div className="fixed bottom-6 right-6 z-50 flex h-80 w-80 items-center justify-center rounded-full border border-stone-200 bg-white shadow-md">
			<span className="font-serif text-xs text-stone-400">Minimap</span>
		</div>
	);
}
