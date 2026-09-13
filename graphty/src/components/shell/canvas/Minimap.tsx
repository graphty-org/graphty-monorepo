/**
 * The minimap: bottom left of the canvas, 160 x 100 at the shared 12 px inset, flat
 * at radius 4 -- the canvas toolbar is the only overlay that lifts.
 *
 * Build spec 01 sections 1, 2 and 5; ART-MAIN:759; ART-LG minimap block.
 *
 * - It carries NO caption below 10,000 nodes: the drawing names itself (MIN-7). The
 *   caption returns in the heatmap form above that threshold, where the shading is
 *   not self-describing, and reads "Minimap" (ART-LG minimap block).
 * - It HIDES while the data table drawer is open (the legend compacts instead), and
 *   it is never hidden by the two-line reflow -- it rises 48 with the legend.
 * - Click centres the view; drag scrubs it.
 * - Above 10,000 nodes it is a node-density heatmap on a 64 x 32 grid, log-scaled,
 *   rebuilt no more often than once every 500 ms.
 *
 * The DRAWING is a faithful placeholder: it renders the points, the density grid and
 * the viewport rectangle it is handed, in the right box at the right size, but it does
 * not yet project graphty-element's own scene along the current view direction.
 */

import { PANEL_INK } from "@graphty/compact-mantine";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
    CANVAS_TOOLBAR_Z_INDEX,
    MINIMAP_HEATMAP_GRID_COLUMNS,
    MINIMAP_HEATMAP_GRID_ROWS,
    MINIMAP_HEATMAP_NODE_THRESHOLD,
    MINIMAP_HEATMAP_REBUILD_THROTTLE_MS,
    MINIMAP_HEIGHT,
    MINIMAP_WIDTH,
    OVERLAY_INSET,
} from "../constants";
import {
    CANVAS_LEADING,
    CANVAS_METRICS,
    CANVAS_SPACE,
    CANVAS_TYPE,
    heatmapCellOpacity,
    OVERLAY_REFLOW_TRANSITION_MS,
    pointerFractionWithin,
} from "./canvasLayout";

/** One node in the scaled drawing, in graph-space fractions. */
export interface MinimapPoint {
    /** 0 at the graph's left edge, 1 at its right. */
    readonly x: number;
    /** 0 at the graph's top edge, 1 at its bottom. */
    readonly y: number;
}

/** The viewport rectangle, in graph-space fractions. */
export interface MinimapViewport {
    /** The rectangle's left edge. */
    readonly x: number;
    /** The rectangle's top edge. */
    readonly y: number;
    /** The rectangle's width. */
    readonly width: number;
    /** The rectangle's height. */
    readonly height: number;
}

/**
 * Props of the minimap.
 * @public
 */
export interface MinimapProps {
    /** Whether the minimap is drawn at all. The caller applies the drawer rule. */
    readonly visible: boolean;
    /** Whether the two-line rule has raised it onto the second line. */
    readonly raised: boolean;
    /** Its bottom offset, from the bottom stack. */
    readonly bottom: number;
    /** How many nodes the graph holds; above 10,000 the heatmap form takes over. */
    readonly nodeCount: number;
    /** The scaled drawing, below the heatmap threshold. */
    readonly points?: readonly MinimapPoint[];
    /**
     * The heatmap's cell counts, row-major over the 64 x 32 grid. Read only above the
     * threshold, and rebuilt no more often than the 500 ms throttle allows.
     */
    readonly density?: readonly number[];
    /** The viewport rectangle. */
    readonly viewport?: MinimapViewport;
    /** Click centres the view here; drag scrubs it. Both report graph-space fractions. */
    readonly onScrub?: (x: number, y: number) => void;
}

const MINIMAP_LABEL = "Minimap";

/**
 * Holds a value still for a while after it changes, so a rebuild that is expensive
 * runs at most once per interval.
 * @param value - the value to hold.
 * @param intervalMs - the shortest interval between two rebuilds.
 * @returns the held value.
 */
function useThrottledValue<T>(value: T, intervalMs: number): T {
    const [held, setHeld] = useState<T>(value);
    const lastRef = useRef<number>(0);

    useEffect(() => {
        const elapsed = Date.now() - lastRef.current;

        if (elapsed >= intervalMs) {
            lastRef.current = Date.now();
            setHeld(value);

            return undefined;
        }

        const timer = window.setTimeout(() => {
            lastRef.current = Date.now();
            setHeld(value);
        }, intervalMs - elapsed);

        return () => {
            window.clearTimeout(timer);
        };
    }, [intervalMs, value]);

    return held;
}

/**
 * Draws the bottom-left minimap, or nothing when it is not shown.
 * @param props - the visibility, the offset, the node count and the drawing.
 * @returns the minimap element, or null when it is not drawn.
 */
export function Minimap(props: MinimapProps): React.JSX.Element | null {
    const { bottom, density, nodeCount, onScrub, points, raised, viewport, visible } = props;
    const boxRef = useRef<HTMLButtonElement>(null);
    const heatmap = useThrottledValue(density, MINIMAP_HEATMAP_REBUILD_THROTTLE_MS);
    const isHeatmap = nodeCount > MINIMAP_HEATMAP_NODE_THRESHOLD;

    const report = useCallback(
        (clientX: number, clientY: number) => {
            const element = boxRef.current;

            if (element === null || onScrub === undefined) {
                return;
            }

            const fraction = pointerFractionWithin(element.getBoundingClientRect(), clientX, clientY);

            onScrub(fraction.x, fraction.y);
        },
        [onScrub],
    );

    const handlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            report(event.clientX, event.clientY);
        },
        [report],
    );

    const handlePointerMove = useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                return;
            }

            report(event.clientX, event.clientY);
        },
        [report],
    );

    if (!visible) {
        return null;
    }

    const cells = isHeatmap && heatmap !== undefined ? heatmap : [];
    const maxCount = cells.length === 0 ? 0 : Math.max(...cells);

    return (
        <button
            ref={boxRef}
            type="button"
            aria-label={MINIMAP_LABEL}
            data-canvas-overlay="minimap"
            data-raised={raised ? "true" : "false"}
            data-form={isHeatmap ? "heatmap" : "points"}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            style={{
                position: "absolute",
                left: OVERLAY_INSET,
                bottom,
                width: MINIMAP_WIDTH,
                height: MINIMAP_HEIGHT,
                padding: 0,
                borderRadius: "var(--mantine-radius-sm)",
                background: PANEL_INK.PANEL,
                border: `${String(CANVAS_SPACE.HAIRLINE)}px solid ${PANEL_INK.BORDER}`,
                overflow: "hidden",
                cursor: "pointer",
                boxSizing: "border-box",
                zIndex: CANVAS_TOOLBAR_Z_INDEX,
                transition: `bottom ${String(OVERLAY_REFLOW_TRANSITION_MS)}ms ease`,
            }}
        >
            <svg
                aria-hidden="true"
                width="100%"
                height="100%"
                viewBox={`0 0 ${String(MINIMAP_WIDTH)} ${String(MINIMAP_HEIGHT)}`}
                preserveAspectRatio="none"
                style={{ display: "block" }}
            >
                {isHeatmap
                    ? cells.map((count, index) => {
                          const column = index % MINIMAP_HEATMAP_GRID_COLUMNS;
                          const row = Math.floor(index / MINIMAP_HEATMAP_GRID_COLUMNS);
                          const cellWidth = MINIMAP_WIDTH / MINIMAP_HEATMAP_GRID_COLUMNS;
                          const cellHeight = MINIMAP_HEIGHT / MINIMAP_HEATMAP_GRID_ROWS;

                          return (
                              <rect
                                  key={`cell-${String(index)}`}
                                  x={column * cellWidth}
                                  y={row * cellHeight}
                                  width={cellWidth}
                                  height={cellHeight}
                                  fill={PANEL_INK.ACCENT}
                                  fillOpacity={heatmapCellOpacity(count, maxCount)}
                              />
                          );
                      })
                    : (points ?? []).map((point, index) => (
                          <circle
                              key={`node-${String(index)}`}
                              cx={point.x * MINIMAP_WIDTH}
                              cy={point.y * MINIMAP_HEIGHT}
                              r={CANVAS_METRICS.MINIMAP_NODE_RADIUS}
                              fill={PANEL_INK.CHROME}
                          />
                      ))}

                {viewport === undefined ? null : (
                    <rect
                        x={viewport.x * MINIMAP_WIDTH}
                        y={viewport.y * MINIMAP_HEIGHT}
                        width={viewport.width * MINIMAP_WIDTH}
                        height={viewport.height * MINIMAP_HEIGHT}
                        fill="none"
                        stroke={PANEL_INK.ACCENT}
                        strokeWidth={CANVAS_SPACE.HAIRLINE}
                    />
                )}
            </svg>

            {isHeatmap ? (
                <span
                    style={{
                        position: "absolute",
                        left: CANVAS_METRICS.OVERLAY_PAD_X,
                        top: CANVAS_METRICS.OVERLAY_PAD_Y,
                        fontSize: CANVAS_TYPE.SMALL,
                        lineHeight: CANVAS_LEADING.TIGHT,
                        color: PANEL_INK.CHROME,
                    }}
                >
                    {MINIMAP_LABEL}
                </span>
            ) : null}
        </button>
    );
}
