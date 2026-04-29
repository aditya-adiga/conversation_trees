"use client";

import { useState, useEffect } from "react";
import { useNavigation } from "@/lib/context/NavigationContext";
import NodeView from "./node/NodeView";
import Minimap from "./minimap/Minimap";
import InputView, { type InputPayload } from "./input/InputView";
import type { CTNode } from "@/lib/types/node";

type AppState = "idle" | "connecting" | "streaming" | "done";

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

	async function handleSubmit(input: InputPayload) {
		setError(undefined);
		setAppState("connecting");

		try {
			let id: string;

			if (input.type === "url") {
				const res = await fetch("/api/recall/create-bot", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ url: input.url }),
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error ?? "Failed to create bot");
				id = data.id;
			} else {
				const res = await fetch("/api/process-text", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ text: input.text }),
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error ?? "Failed to process text");
				id = data.botId;
			}

			setBotId(id);
			setAppState("streaming");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Something went wrong");
			setAppState("idle");
		}
	}

	if (appState === "idle" || appState === "connecting") {
		return (
			<InputView
				onSubmit={handleSubmit}
				status={error ? "error" : appState}
				error={error}
			/>
		);
	}

	return (
		<>
			<NodeView />
			<Minimap />
		</>
	);
}
