"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigation } from "@/lib/context/NavigationContext";
import NodeView from "./node/NodeView";
import Minimap from "./minimap/Minimap";
import TranscriptPanel from "./transcript/TranscriptPanel";
import InputView, { type InputPayload } from "./input/InputView";
import SessionControls from "./session/SessionControls";
import WaitingForNodes from "./session/WaitingForNodes";
import type { CTNode } from "@/lib/types/node";
import {
	type AppState,
	type SessionSource,
	createSessionActions,
} from "./session/sessionActions";

const CLIENT_SESSION_STORAGE_KEY = "conversationTrees.clientSessionId";

function getClientSessionId() {
	const existing = sessionStorage.getItem(CLIENT_SESSION_STORAGE_KEY);
	if (existing) return existing;

	const id = crypto.randomUUID();
	sessionStorage.setItem(CLIENT_SESSION_STORAGE_KEY, id);
	return id;
}

export default function App() {
	const { addNode, nodes, currentNodeId, latestNodeId, navigate, reset } = useNavigation();
	const [appState, setAppState] = useState<AppState>("idle");
	const [botId, setBotId] = useState<string | null>(null);
	const [transcriptPanelOpen, setTranscriptPanelOpen] = useState(false);
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
					body: JSON.stringify({
						url: input.url,
						clientSessionId: getClientSessionId(),
					}),
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
			{nodes.size === 0 ? (
				<>
					<SessionControls
						statusText={statusText}
						showStopBot={sessionSource === "url"}
						canStopBot={canStopBot}
						isStopping={appState === "stopping"}
						onHome={handleHome}
						onStopBot={handleStopBot}
					/>
					<WaitingForNodes />
				</>
			) : (
				<div className="flex h-full w-full overflow-hidden">
					<div className="relative flex-1 overflow-hidden">
						<SessionControls
							statusText={statusText}
							showStopBot={sessionSource === "url"}
							canStopBot={canStopBot}
							isStopping={appState === "stopping"}
							onHome={handleHome}
							onStopBot={handleStopBot}
						/>
						{error && (
							<div className="absolute left-1/2 top-20 z-50 -translate-x-1/2 rounded-xl border border-red-100 bg-white px-4 py-2 text-sm text-red-500 shadow-[var(--card-shadow)]">
								{error}
							</div>
						)}
						<NodeView onOpenTranscript={() => setTranscriptPanelOpen(true)} />
						<Minimap />
					</div>
					<TranscriptPanel
						isOpen={transcriptPanelOpen}
						nodes={nodes}
						currentNodeId={currentNodeId}
						latestNodeId={latestNodeId}
						onNavigate={navigate}
						onClose={() => setTranscriptPanelOpen(false)}
					/>
				</div>
			)}
		</div>
	);
}
