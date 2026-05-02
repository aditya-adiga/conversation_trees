"use client";

import { useRef, useEffect, useState } from "react";
import type { CTNode } from "@/lib/types/node";

interface TranscriptPanelProps {
	isOpen: boolean;
	nodes: Map<string, CTNode>;
	currentNodeId: string | null;
	latestNodeId: string | null;
	onNavigate: (id: string | null) => void;
	onClose: () => void;
}

export default function TranscriptPanel({
	isOpen,
	nodes,
	currentNodeId,
	latestNodeId,
	onNavigate,
	onClose,
}: TranscriptPanelProps) {
	const [syncToLatest, setSyncToLatest] = useState(false);
	const highlightedRef = useRef<HTMLDivElement>(null);
	const prevLatestRef = useRef<string | null>(null);

	// Auto-navigate to latest node when sync is on and a new node arrives
	useEffect(() => {
		if (!syncToLatest || !latestNodeId) return;
		if (latestNodeId !== prevLatestRef.current) {
			prevLatestRef.current = latestNodeId;
			onNavigate(latestNodeId);
		}
	}, [syncToLatest, latestNodeId, onNavigate]);

	useEffect(() => {
		if (syncToLatest && currentNodeId !== latestNodeId) {
			queueMicrotask(() => {
				setSyncToLatest(false);
			});
		}
	}, [currentNodeId]);

	// Scroll highlighted segment into view when current node changes
	useEffect(() => {
		highlightedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
	}, [currentNodeId]);

	const orderedNodes = [...nodes.values()];

	return (
		<div
			className={`flex h-full shrink-0 flex-col overflow-hidden border-l border-[var(--border)] bg-white transition-[width] duration-300 ease-in-out ${isOpen ? "w-[360px]" : "w-0 border-l-0"}`}
		>
			<div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
				<span className="text-sm font-semibold text-[var(--text-heading)]">Transcript</span>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => {
							setSyncToLatest((s) => {
								if (!s && latestNodeId) {
									prevLatestRef.current = latestNodeId;
									onNavigate(latestNodeId);
								}
								return !s;
							});
						}}
						className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
							syncToLatest
								? "bg-[var(--latest)] text-white"
								: "border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text-body)]"
						}`}
					>
						{syncToLatest ? "Synced ●" : "Sync to latest"}
					</button>
					<button
						type="button"
						onClick={onClose}
						className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-body)]"
						aria-label="Close transcript"
					>
						✕
					</button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-3 py-4">
				{orderedNodes.map((node) => {
					const isActive = node.id === currentNodeId;
					const text = node.transcript || node.content;
					return (
						<div
							key={node.id}
							ref={isActive ? highlightedRef : null}
							onClick={() => onNavigate(node.id)}
							className={`mb-1 cursor-pointer rounded-lg px-3 py-2 text-[13px] leading-relaxed transition-colors ${
								isActive
									? "bg-amber-50 text-[var(--text-body)] ring-1 ring-amber-200"
									: "text-[var(--text-muted)] hover:bg-stone-50 hover:text-[var(--text-body)]"
							}`}
						>
							{text}
						</div>
					);
				})}
			</div>
		</div>
	);
}
