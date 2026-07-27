"use client";

interface SessionControlsProps {
  statusText: string;
  showStopBot: boolean;
  canStopBot: boolean;
  isStopping: boolean;
  onHome: () => void;
  onStopBot: () => void;
}

export default function SessionControls({
  statusText,
  showStopBot,
  canStopBot,
  isStopping,
  onHome,
  onStopBot,
}: SessionControlsProps) {
  return (
    <div className="fixed left-4 right-4 top-4 z-50 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/85 px-4 py-3 shadow-[var(--card-shadow)] backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[var(--text-muted)]" />
        <p className="truncate text-sm text-[var(--text-body)]">{statusText}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showStopBot && (
          <button
            type="button"
            onClick={onStopBot}
            disabled={!canStopBot}
            className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-body)] transition-colors hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isStopping ? "Stopping..." : "Stop bot"}
          </button>
        )}
        <button
          type="button"
          onClick={onHome}
          className="rounded-xl bg-[var(--foreground)] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-80"
        >
          Home
        </button>
      </div>
    </div>
  );
}
