"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { ROOT_NODE_ID } from "@/lib/data/dummyTree";

interface NavigationContextValue {
	currentNodeId: string;
	navigate: (targetId: string | null | undefined) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
	const [currentNodeId, setCurrentNodeId] = useState(ROOT_NODE_ID);

	const navigate = useCallback((targetId: string | null | undefined) => {
		if (targetId) setCurrentNodeId(targetId);
	}, []);

	return (
		<NavigationContext.Provider value={{ currentNodeId, navigate }}>
			{children}
		</NavigationContext.Provider>
	);
}

export function useNavigation() {
	const ctx = useContext(NavigationContext);
	if (!ctx) throw new Error("useNavigation must be used within NavigationProvider");
	return ctx;
}
