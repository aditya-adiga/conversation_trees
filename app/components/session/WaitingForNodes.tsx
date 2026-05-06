"use client";

export default function WaitingForNodes() {
  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <div className="max-w-md rounded-2xl border border-[var(--border)] bg-white/80 p-8 text-center shadow-[var(--card-shadow)] backdrop-blur-sm">
        <div className="mx-auto mb-5 h-10 w-10 animate-pulse rounded-full border border-[var(--border)] bg-[var(--background)]" />
        <h2 className="mb-2 font-serif text-xl font-semibold text-[var(--text-heading)]">
          Growing the first branch
        </h2>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          The bot is collecting transcript crumbs. Once there are enough, the tree
          will sprout here.
        </p>
      </div>
    </div>
  );
}
