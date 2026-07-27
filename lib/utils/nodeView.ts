import { OPACITY } from "@/lib/constants/layout";

export function siblingOpacity(distance: number): number {
	if (distance === 1) return OPACITY.SIBLING.NEAR;
	if (distance === 2) return OPACITY.SIBLING.MEDIUM;
	return OPACITY.SIBLING.FAR;
}

export function childOpacity(index: number, total: number): number {
	const center = (total - 1) / 2;
	const dist = Math.abs(index - center);
	const maxDist = Math.max(center, 1);
	return Math.max(
		OPACITY.CHILD.MIN,
		OPACITY.CHILD.MAX - (dist / maxDist) * OPACITY.CHILD.SPREAD,
	);
}
