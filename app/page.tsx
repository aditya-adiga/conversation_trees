import NodeView from "./components/node/NodeView";

export default function Home() {
	return (
		<main className="relative h-screen w-screen overflow-hidden bg-[var(--background)]">
			<NodeView />
		</main>
	);
}
