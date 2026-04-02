import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import { NavigationProvider } from "@/lib/context/NavigationContext";
import Minimap from "./components/minimap/Minimap";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const lora = Lora({
	variable: "--font-lora",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Conversation Trees",
	description: "Visual conversation tree explorer",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} antialiased`}
			>
				<NavigationProvider>
					{children}
					<Minimap />
				</NavigationProvider>
			</body>
		</html>
	);
}
