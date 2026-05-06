"use client";

import { useRef, useState } from "react";
import { useNavigation } from "@/lib/context/NavigationContext";
import {
	buildMinimapLayout,
	clampMinimapZoom,
	getAutoPan,
	getMinimapViewport,
	getSvgPoint,
	getVisiblePan,
	getZoomedPan,
	getZoomScaledRadius,
} from "@/lib/utils/minimapLayout";

const NODE_RADIUS = 2.5;
const CURRENT_NODE_RADIUS = NODE_RADIUS + 1;
const NODE_HIT_RADIUS = NODE_RADIUS + 5;
const PING_RING_RADIUS = NODE_RADIUS + 2.5;
const PING_RING_MAX_RADIUS = PING_RING_RADIUS + 2;
const PING_OPACITY = 0.35;
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export default function Minimap() {
	const { currentNodeId, latestNodeId, nodes, navigate } = useNavigation();
	const { nodes: layoutNodes, edges, viewBox } = buildMinimapLayout(nodes);
	const svgRef = useRef<SVGSVGElement>(null);
	const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
	const hasDraggedRef = useRef(false);
	const [zoom, setZoom] = useState(1);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [hasUserMoved, setHasUserMoved] = useState(false);

	const viewport = getMinimapViewport(viewBox);
	const autoPan = getAutoPan(layoutNodes, latestNodeId, zoom, viewport.center);
	const visiblePan = getVisiblePan(hasUserMoved, pan, autoPan);
	const visibleNodeHitRadius = getZoomScaledRadius(NODE_HIT_RADIUS, zoom);

	function zoomAroundPoint(nextZoom: number, point: { x: number; y: number }) {
		const clampedZoom = clampMinimapZoom(nextZoom, MIN_ZOOM, MAX_ZOOM);

		setZoom(clampedZoom);
		setPan(getZoomedPan(clampedZoom, zoom, point, visiblePan));
	}

	function handleNodeClick(nodeId: string) {
		if (hasDraggedRef.current) {
			hasDraggedRef.current = false;
			return;
		}
		navigate(nodeId);
	}

	if (layoutNodes.length === 0) return null;

	return (
		<div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 flex flex-col items-center sm:left-auto sm:right-4 sm:block sm:translate-x-0">
			<div className="h-40 w-40 overflow-hidden rounded-full border border-[var(--border)] bg-white/90 shadow-lg backdrop-blur-sm sm:h-45 sm:w-45">
				<svg
					ref={svgRef}
					viewBox={viewBox}
					preserveAspectRatio="xMidYMid meet"
					className="h-full w-full touch-none cursor-grab active:cursor-grabbing"
					onWheel={(event) => {
						event.preventDefault();
						setHasUserMoved(true);
						const direction = event.deltaY > 0 ? -1 : 1;
						zoomAroundPoint(
							zoom + direction * ZOOM_STEP,
							getSvgPoint(
								event.clientX,
								event.clientY,
								svgRef.current?.getBoundingClientRect(),
								viewport,
							),
						);
					}}
					onPointerDown={(event) => {
						svgRef.current?.setPointerCapture(event.pointerId);
						hasDraggedRef.current = false;
						dragStartRef.current = {
							x: event.clientX,
							y: event.clientY,
							panX: visiblePan.x,
							panY: visiblePan.y,
						};
					}}
					onPointerMove={(event) => {
						const dragStart = dragStartRef.current;
						const rect = svgRef.current?.getBoundingClientRect();
						if (!dragStart || !rect) return;

						if (
							Math.abs(event.clientX - dragStart.x) > 3 ||
							Math.abs(event.clientY - dragStart.y) > 3
						) {
							hasDraggedRef.current = true;
						}
						setHasUserMoved(true);
						setPan({
							x:
								dragStart.panX +
								((event.clientX - dragStart.x) / rect.width) * viewport.width,
							y:
								dragStart.panY +
								((event.clientY - dragStart.y) / rect.height) * viewport.height,
						});
					}}
					onPointerUp={(event) => {
						svgRef.current?.releasePointerCapture(event.pointerId);
						dragStartRef.current = null;
					}}
					onPointerCancel={() => {
						dragStartRef.current = null;
					}}
				>
					<g
						transform={`matrix(${zoom} 0 0 ${zoom} ${visiblePan.x} ${visiblePan.y})`}
					>
						{edges.map(({ from, to }) => (
							<line
								key={`${from.id}-${to.id}`}
								x1={from.x}
								y1={from.y}
								x2={to.x}
								y2={to.y}
								stroke="var(--border)"
								strokeWidth={0.4}
							/>
						))}

						{layoutNodes.map((n) => {
							const isCurrent = n.id === currentNodeId;
							const isLatest = n.id === latestNodeId;

							return (
								<g
									key={n.id}
									onPointerDown={(event) => event.stopPropagation()}
									onClick={() => handleNodeClick(n.id)}
									className="cursor-pointer"
								>
									<circle
										cx={n.x}
										cy={n.y}
										r={visibleNodeHitRadius}
										fill="transparent"
										pointerEvents="all"
									/>
									{isLatest && (
										<circle
											cx={n.x}
											cy={n.y}
											r={PING_RING_RADIUS}
											fill="none"
											stroke="var(--latest)"
											strokeWidth={0.5}
											opacity={PING_OPACITY}
										>
											<animate
												attributeName="r"
												values={`${PING_RING_RADIUS};${PING_RING_MAX_RADIUS};${PING_RING_RADIUS}`}
												dur="1.4s"
												repeatCount="indefinite"
											/>
											<animate
												attributeName="opacity"
												values={`${PING_OPACITY};0.08;${PING_OPACITY}`}
												dur="1.4s"
												repeatCount="indefinite"
											/>
										</circle>
									)}
									<circle
										cx={n.x}
										cy={n.y}
										r={isCurrent ? CURRENT_NODE_RADIUS : NODE_RADIUS}
										fill={
											isLatest
												? "var(--latest)"
												: isCurrent
													? "var(--text-heading)"
													: "white"
										}
										stroke={
											isLatest
												? "var(--latest)"
												: isCurrent
													? "var(--text-heading)"
													: "var(--text-muted)"
										}
										strokeWidth={isCurrent ? 0.6 : 0.4}
										className="transition-all duration-200"
									/>
								</g>
							);
						})}
					</g>
				</svg>
			</div>
			{/* Zoom controls — horizontal below on mobile, vertical left on desktop */}
			<div className="mt-2 flex overflow-hidden rounded-full border border-[var(--border)] bg-white/95 shadow-[var(--card-shadow)] sm:absolute sm:-left-3 sm:top-1/2 sm:mt-0 sm:-translate-x-full sm:-translate-y-1/2 sm:flex-col">
				<button
					type="button"
					onClick={() => {
						setHasUserMoved(true);
						zoomAroundPoint(zoom + ZOOM_STEP, viewport.center);
					}}
					className="px-2 py-1 text-xs text-[var(--text-heading)] hover:bg-[var(--latest-bg)]"
					aria-label="Zoom minimap in"
				>
					+
				</button>
				<button
					type="button"
					onClick={() => {
						setHasUserMoved(true);
						zoomAroundPoint(zoom - ZOOM_STEP, viewport.center);
					}}
					className="border-x border-[var(--border)] px-2 py-1 text-xs text-[var(--text-heading)] hover:bg-[var(--latest-bg)] sm:border-x-0 sm:border-y"
					aria-label="Zoom minimap out"
				>
					-
				</button>
				<button
					type="button"
					onClick={() => {
						setZoom(1);
						setPan({ x: 0, y: 0 });
						setHasUserMoved(false);
					}}
					className="px-2 py-1 text-xs text-[var(--text-heading)] hover:bg-[var(--latest-bg)]"
					aria-label="Reset minimap view"
				>
					Reset
				</button>
			</div>
		</div>
	);
}
