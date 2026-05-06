export function siblingOpacity(distance: number): number {
	if (distance === 1) return 0.7;
	if (distance === 2) return 0.45;
	return 0.25;
}

export function childOpacity(index: number, total: number): number {
	const center = (total - 1) / 2;
	const dist = Math.abs(index - center);
	const maxDist = Math.max(center, 1);
	return Math.max(0.3, 0.85 - (dist / maxDist) * 0.55);
}
