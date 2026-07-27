"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigation } from "@/lib/context/NavigationContext";
import NodeView from "./node/NodeView";
import Minimap from "./minimap/Minimap";
import InputView, { type InputPayload } from "./input/InputView";
import SessionControls from "./session/SessionControls";
import WaitingForNodes from "./session/WaitingForNodes";
import type { CTNode } from "@/lib/types/node";
import {
	type AppState,
	type SessionSource,
	createSessionActions,
} from "./session/sessionActions";

export default function App() {
	const { addNode, nodes, reset } = useNavigation();
	const [appState, setAppState] = useState<AppState>("idle");
	const [botId, setBotId] = useState<string | null>(null);
	const [sessionSource, setSessionSource] = useState<SessionSource | null>(null);
	const [error, setError] = useState<string | undefined>();
	const eventSourceRef = useRef<EventSource | null>(null);

	useEffect(() => {
		if (!botId) return;

		const es = new EventSource(`/api/recall/stream/${botId}`);
		eventSourceRef.current = es;

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

		return () => {
			es.close();
			if (eventSourceRef.current === es) eventSourceRef.current = null;
		};
	}, [botId, addNode]);

	function closeStream() {
		eventSourceRef.current?.close();
		eventSourceRef.current = null;
	}

	async function handleSubmit(input: InputPayload) {
		setError(undefined);
		setAppState("connecting");
		setSessionSource(input.type);

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

	const { canStopBot, handleHome, handleStopBot, statusText } =
		createSessionActions({
			appState,
			botId,
			closeStream,
			nodeCount: nodes.size,
			resetNavigation: reset,
			sessionSource,
			setAppState,
			setBotId,
			setError,
			setSessionSource,
		});

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
		<div className="relative h-full w-full">
			<SessionControls
				statusText={statusText}
				showStopBot={sessionSource === "url"}
				canStopBot={canStopBot}
				isStopping={appState === "stopping"}
				onHome={handleHome}
				onStopBot={handleStopBot}
			/>

			{error && (
				<div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-xl border border-red-100 bg-white px-4 py-2 text-sm text-red-500 shadow-[var(--card-shadow)]">
					{error}
				</div>
			)}

			{nodes.size === 0 ? (
				<WaitingForNodes />
			) : (
				<>
					<NodeView />
					<Minimap />
				</>
			)}
		</div>
	);
}
