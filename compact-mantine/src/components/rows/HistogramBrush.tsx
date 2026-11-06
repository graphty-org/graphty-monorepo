import { Box } from "@mantine/core";
import React, { useRef, useState } from "react";

import { RangeSlider } from "../Slider";

/**
 * A range brush on a histogram's horizontal scale: two thumbs (Mantine's RangeSlider) and a body
 * between them that moves both ends at once.
 */
export interface HistogramBrushProps {
    /** The scale's start: the left edge of the plot. */
    min: number;
    /** The scale's end: the right edge of the plot. */
    max: number;
    /** How far a thumb, the body or an arrow key moves at a time. */
    step: number;
    /** The range, `[start, end]`. */
    value: readonly [number, number];
    /** Every move while a thumb or the body is dragged. */
    onChange?: (value: [number, number]) => void;
    /** The move a gesture ends on: a release, a key, a click on a bar outside the range. */
    onChangeEnd?: (value: [number, number]) => void;
    /** Each thumb's value in words, its `aria-valuetext`. */
    valueText?: (value: number, thumb: 0 | 1) => string;
    /** The whole range in words, the body's `aria-valuetext`. */
    rangeText?: (value: readonly [number, number]) => string;
    /** What a thumb shows while it is focused, hovered or dragged, such as the bar under it. */
    thumbLabel?: (value: number, thumb: 0 | 1) => React.ReactNode;
    /** The start thumb's accessible name. */
    startLabel: string;
    /** The end thumb's accessible name. */
    endLabel: string;
    /** The body's accessible name. */
    bodyLabel: string;
}

/** How far the pointer moves before a press on the body is a drag. */
const DRAG_SLOP = 3;

/** The brush row's height: one slider at the small size. */
export const BRUSH_ROW_HEIGHT = 16;

/**
 * A range moved by a distance, its width kept, stopped at the scale's ends.
 * @param range - The range.
 * @param by - How far.
 * @param brush - The brush.
 * @returns The moved range.
 */
function shiftRange(range: readonly [number, number], by: number, brush: HistogramBrushProps): [number, number] {
    const delta = Math.max(brush.min - range[0], Math.min(brush.max - range[1], by));
    return [range[0] + delta, range[1] + delta];
}

/**
 * Where a value sits on the scale, in percent of the plot's width.
 * @param value - The value.
 * @param brush - The brush.
 * @returns The percentage.
 */
export function placeOf(value: number, brush: Pick<HistogramBrushProps, "min" | "max">): number {
    return brush.max === brush.min ? 0 : ((value - brush.min) / (brush.max - brush.min)) * 100;
}

/**
 * The brush row: the two thumbs under the plot, and the body over the plot and the row.
 * @param props - Component props
 * @param props.brush - The brush.
 * @param props.plotHeight - How far above the row the plot reaches, so the body covers it.
 * @returns The row.
 */
export function HistogramBrush({
    brush,
    plotHeight,
}: Readonly<{ brush: HistogramBrushProps; plotHeight: number | string }>): React.JSX.Element {
    const [dragged, setDragged] = useState<[number, number] | null>(null);
    const plotTop = typeof plotHeight === "number" ? `${String(plotHeight)}px` : plotHeight;
    // The range the gesture is at, read on release: the drawn `dragged` can be a render behind
    // when moves arrive faster than React draws them (a quick flick, a finger).
    const press = useRef<{
        x: number;
        start: readonly [number, number];
        moved: boolean;
        width: number;
        at: [number, number] | null;
    } | null>(null);
    const range = dragged ?? brush.value;
    const left = placeOf(range[0], brush);
    const right = placeOf(range[1], brush);

    const move = (next: [number, number]): void => {
        setDragged(next);
        brush.onChange?.(next);
    };

    return (
        <Box data-testid="histogram-brush" style={{ position: "relative", height: BRUSH_ROW_HEIGHT }}>
            <Box
                data-testid="histogram-brush-body"
                role="slider"
                tabIndex={0}
                aria-label={brush.bodyLabel}
                aria-valuemin={brush.min}
                aria-valuemax={brush.max}
                aria-valuenow={range[0]}
                aria-valuetext={brush.rangeText?.(range)}
                className="cm-histogram-brush-body"
                style={{
                    position: "absolute",
                    left: `${String(left)}%`,
                    width: `${String(Math.max(0, right - left))}%`,
                    top: `calc(-1 * ${plotTop})`,
                    bottom: 0,
                    zIndex: 2,
                    touchAction: "none",
                }}
                onPointerDown={(event) => {
                    if (event.button !== 0) {
                        return;
                    }

                    const scale = event.currentTarget.parentElement?.getBoundingClientRect().width ?? 1;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    press.current = { x: event.clientX, start: brush.value, moved: false, width: scale, at: null };
                }}
                onPointerMove={(event) => {
                    const held = press.current;
                    if (held === null) {
                        return;
                    }

                    const dx = event.clientX - held.x;
                    if (!held.moved && Math.abs(dx) < DRAG_SLOP) {
                        return;
                    }

                    held.moved = true;
                    // Whole steps either way; shiftRange stops the range at the scale's ends.
                    const by = Math.round(((dx / held.width) * (brush.max - brush.min)) / brush.step) * brush.step;
                    held.at = shiftRange(held.start, by, brush);
                    move(held.at);
                }}
                onPointerUp={() => {
                    const held = press.current;
                    press.current = null;
                    if (held?.moved === true && held.at !== null) {
                        brush.onChangeEnd?.(held.at);
                    }

                    setDragged(null);
                }}
                onPointerCancel={() => {
                    press.current = null;
                    setDragged(null);
                }}
                onKeyDown={(event) => {
                    const keys: Record<string, number> = {
                        ArrowLeft: -brush.step,
                        ArrowDown: -brush.step,
                        ArrowRight: brush.step,
                        ArrowUp: brush.step,
                        PageDown: -10 * brush.step,
                        PageUp: 10 * brush.step,
                        Home: brush.min - brush.value[0],
                        End: brush.max - brush.value[1],
                    };
                    const by = keys[event.key];
                    if (by === undefined) {
                        return;
                    }

                    event.preventDefault();
                    const next = shiftRange(brush.value, by, brush);
                    brush.onChange?.(next);
                    brush.onChangeEnd?.(next);
                }}
            />
            <RangeSlider
                className="cm-histogram-brush-thumbs"
                min={brush.min}
                max={brush.max}
                step={brush.step}
                minRange={brush.step}
                value={[range[0], range[1]]}
                label={brush.thumbLabel === undefined ? null : (value: number) => brush.thumbLabel?.(value, 0)}
                thumbFromLabel={brush.startLabel}
                thumbToLabel={brush.endLabel}
                thumbProps={(index: 0 | 1) => ({ "aria-valuetext": brush.valueText?.(range[index], index) })}
                // The track spans the plot exactly, so a thumb's x is its value's place on the bars.
                style={{ marginInline: "calc(var(--slider-size) * -1)", zIndex: 3 }}
                onChange={(value) => {
                    move(value);
                }}
                onChangeEnd={(value) => {
                    setDragged(null);
                    brush.onChangeEnd?.(value);
                }}
            />
        </Box>
    );
}
