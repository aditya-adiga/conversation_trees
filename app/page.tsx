"use client";

import { NavigationProvider } from "@/lib/context/NavigationContext";
import App from "./components/App";

export default function Home() {
	return (
		<NavigationProvider>
			<main className="relative h-screen w-screen overflow-hidden bg-[var(--background)]">
				<App />
			</main>
		</NavigationProvider>
	);
}
