import { useEffect, useRef } from "react";

const SWIPE_THRESHOLD = 40;

interface SwipeHandlers {
	onSwipeUp?: () => void;
	onSwipeDown?: () => void;
	onSwipeLeft?: () => void;
	onSwipeRight?: () => void;
}

export function useSwipe(
	ref: React.RefObject<HTMLElement | null>,
	handlers: SwipeHandlers,
) {
	// Keep a stable ref to handlers so the effect never needs to re-run
	const handlersRef = useRef(handlers);
	handlersRef.current = handlers;

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		let startX = 0;
		let startY = 0;

		function onTouchStart(e: TouchEvent) {
			startX = e.touches[0].clientX;
			startY = e.touches[0].clientY;
		}

		function onTouchEnd(e: TouchEvent) {
			const dx = e.changedTouches[0].clientX - startX;
			const dy = e.changedTouches[0].clientY - startY;
			const absDx = Math.abs(dx);
			const absDy = Math.abs(dy);

			if (Math.max(absDx, absDy) < SWIPE_THRESHOLD) return;

			if (absDx > absDy) {
				if (dx < 0) handlersRef.current.onSwipeLeft?.();
				else handlersRef.current.onSwipeRight?.();
			} else {
				if (dy < 0) handlersRef.current.onSwipeUp?.();
				else handlersRef.current.onSwipeDown?.();
			}
		}

		el.addEventListener("touchstart", onTouchStart, { passive: true });
		el.addEventListener("touchend", onTouchEnd, { passive: true });

		return () => {
			el.removeEventListener("touchstart", onTouchStart);
			el.removeEventListener("touchend", onTouchEnd);
		};
	}, [ref]);
}
