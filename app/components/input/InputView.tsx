"use client";

import { useState } from "react";

type Tab = "url" | "text";

export type InputPayload =
	| { type: "url"; url: string }
	| { type: "text"; text: string };

interface InputViewProps {
	onSubmit: (input: InputPayload) => void;
	status: "idle" | "connecting" | "error";
	error?: string;
}

const tabLabel: Record<Tab, string> = {
	url: "Google Meet",
	text: "Paste Text",
};

export default function InputView({ onSubmit, status, error }: InputViewProps) {
	const [tab, setTab] = useState<Tab>("url");
	const [url, setUrl] = useState("");
	const [text, setText] = useState("");

	const isLoading = status === "connecting";

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (tab === "url") {
			onSubmit({ type: "url", url: url.trim() });
		} else {
			onSubmit({ type: "text", text: text.trim() });
		}
	}

	return (
		<div className="flex h-full w-full items-center justify-center">
			<div className="w-full max-w-lg rounded-2xl bg-[var(--card)] p-6 shadow-[var(--card-shadow)] sm:p-10">
				{/* Header */}
				<h1 className="mb-1 font-serif text-2xl font-semibold tracking-tight text-[var(--text-heading)]">
					Conversation Trees
				</h1>
				<p className="mb-8 text-sm text-[var(--text-muted)]">
					Join a live meeting or paste a transcript to build your tree.
				</p>

				{/* Tab toggle */}
				<div className="mb-6 flex gap-1 rounded-xl bg-[var(--background)] p-1">
					{(["url", "text"] as Tab[]).map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => setTab(t)}
							className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-all duration-150 ${
								tab === t
									? "bg-[var(--card)] text-[var(--text-heading)] shadow-[var(--card-shadow)]"
									: "text-[var(--text-muted)] hover:text-[var(--text-body)]"
							}`}
						>
							{tabLabel[t]}
						</button>
					))}
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					{tab === "url" ? (
						<input
							type="url"
							placeholder="https://meet.google.com/abc-defg-hij"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							required
							className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-body)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)] focus:ring-0"
						/>
					) : (
						<textarea
							placeholder="Paste your transcript or conversation here…"
							value={text}
							onChange={(e) => setText(e.target.value)}
							required
							rows={8}
							className="w-full resize-none rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-body)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)] focus:ring-0"
						/>
					)}

					{/* Error */}
					{status === "error" && error && (
						<p className="text-xs text-red-500">{error}</p>
					)}

					{/* Submit */}
					<button
						type="submit"
						disabled={isLoading}
						className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--foreground)] py-3 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-80 disabled:opacity-50"
					>
						{isLoading ? (
							<>
								<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
								{tab === "url" ? "Connecting…" : "Processing…"}
							</>
						) : (
							tab === "url" ? "Join Meeting" : "Build Tree"
						)}
					</button>
				</form>
			</div>
		</div>
	);
}
