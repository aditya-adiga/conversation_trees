"use client";

import { useState, useEffect } from "react";
import { useNavigation } from "@/lib/context/NavigationContext";
import NodeView from "./node/NodeView";
import Minimap from "./minimap/Minimap";
import type { CTNode } from "@/lib/types/node";

export type AppState = "idle" | "connecting" | "streaming" | "done";

export default function App() {
	const { addNode } = useNavigation();
	const [appState, setAppState] = useState<AppState>("idle");
	const [botId, setBotId] = useState<string | null>(null);
	const [error, setError] = useState<string | undefined>();

	useEffect(() => {
		if (!botId) return;

		const es = new EventSource(`/api/recall/stream/${botId}`);

		es.onmessage = (e) => {
			const data = JSON.parse(e.data);
			if (data.node) addNode(data.node as CTNode);
			if (
				data.eventData?.event === "bot.done" ||
				data.eventData?.event === "bot.fatal"
			) {
				setAppState("done");
				es.close();
			}
		};

		es.onerror = () => {
			setError("Stream connection lost. Please try again.");
			setAppState("idle");
			es.close();
		};

		return () => es.close();
	}, [botId, addNode]);

	// InputView replaces this placeholder in Phase 5/6
	if (appState === "idle" || appState === "connecting") {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-[var(--text-muted)]">{error ?? "Ready"}</p>
			</div>
		);
	}

	return (
		<>
			<NodeView />
			<Minimap />
		</>
	);
}
