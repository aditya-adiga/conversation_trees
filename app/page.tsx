"use client";

import { NavigationProvider } from "@/lib/context/NavigationContext";
import NodeView from "./components/node/NodeView";
import Minimap from "./components/minimap/Minimap";

export default function Home() {
	return (
		<NavigationProvider>
			<main className="relative h-screen w-screen overflow-hidden bg-[var(--background)]">
				<NodeView />
				<Minimap />
			</main>
		</NavigationProvider>
	);
}
