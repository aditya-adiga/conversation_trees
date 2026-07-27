const SIBLING_OPACITY_ADJACENT = 0.7;
const SIBLING_OPACITY_NEAR = 0.45;
const SIBLING_OPACITY_FAR = 0.25;

export function siblingOpacity(distance: number): number {
	if (distance === 1) return SIBLING_OPACITY_ADJACENT;
	if (distance === 2) return SIBLING_OPACITY_NEAR;
	return SIBLING_OPACITY_FAR;
}

const CHILD_OPACITY_MIN = 0.3;
const CHILD_OPACITY_MAX = 0.85;
const CHILD_OPACITY_FALLOFF = 0.55;

export function childOpacity(index: number, total: number): number {
	const center = (total - 1) / 2;
	const dist = Math.abs(index - center);
	const maxDist = Math.max(center, 1);
	return Math.max(CHILD_OPACITY_MIN, CHILD_OPACITY_MAX - (dist / maxDist) * CHILD_OPACITY_FALLOFF);
}
