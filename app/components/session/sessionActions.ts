import type { Dispatch, SetStateAction } from "react";

export type AppState =
  | "idle"
  | "connecting"
  | "streaming"
  | "stopping"
  | "stopped"
  | "done";
export type SessionSource = "url" | "text";

interface CreateSessionActionsArgs {
  appState: AppState;
  botId: string | null;
  closeStream: () => void;
  nodeCount: number;
  resetNavigation: () => void;
  sessionSource: SessionSource | null;
  setAppState: Dispatch<SetStateAction<AppState>>;
  setBotId: Dispatch<SetStateAction<string | null>>;
  setError: Dispatch<SetStateAction<string | undefined>>;
  setSessionSource: Dispatch<SetStateAction<SessionSource | null>>;
}

export function createSessionActions({
  appState,
  botId,
  closeStream,
  nodeCount,
  resetNavigation,
  sessionSource,
  setAppState,
  setBotId,
  setError,
  setSessionSource,
}: CreateSessionActionsArgs) {
  function handleHome() {
    closeStream();
    resetNavigation();
    setBotId(null);
    setSessionSource(null);
    setError(undefined);
    setAppState("idle");
  }

  async function handleStopBot() {
    if (!botId || sessionSource !== "url") return;

    setError(undefined);
    setAppState("stopping");

    try {
      const res = await fetch("/api/recall/stop-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to stop bot");

      closeStream();
      setAppState("stopped");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to stop bot");
      setAppState("streaming");
    }
  }

  const statusText =
    appState === "stopping"
      ? "Politely escorting the bot out of the call..."
      : appState === "stopped"
        ? "Bot removed from the call."
        : appState === "done"
          ? "Conversation complete."
          : nodeCount === 0
            ? "Waiting for enough conversation crumbs to grow a node..."
            : "Listening for more transcript...";

  const canStopBot =
    sessionSource === "url" &&
    !!botId &&
    appState !== "stopping" &&
    appState !== "stopped" &&
    appState !== "done";

  return {
    canStopBot,
    handleHome,
    handleStopBot,
    statusText,
  };
}
