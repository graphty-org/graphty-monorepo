import { Box } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { forwardRef, useRef } from "react";

import { useCompactStyles } from "../../theme/useCompactStyles";
import { isRtl, useDirection } from "../../utils/rtl";

// Figma's panel resize handle (design/figma-spec.md 9.9, components.md 54; captures
// left-sidebar/resize-handle-focus, left-sidebar/split-handle-keyboard-focus,
// right-sidebar-selection/resize-panel-min|max): an 8px strip straddling a panel edge, with no
// visible hover or drag indicator. Keyboard focus draws a grip pill in the focus color, 4 wide
// and up to 500 tall on a vertical handle, 120 x 4 on a horizontal one. The look is the
// cm-resize-handle rules in src/theme/css/chrome.css.ts.
//
// Accessibility: the WAI-ARIA "Window Splitter" pattern -- a focusable role="separator" with a
// value. Figma exposes a slider; the separator is the role the pattern names for this.

/** Which edge of its panel the handle sits on. The panel must be positioned (relative). */
export type ResizeHandleEdge = "start" | "end" | "top" | "bottom";

/** The size range, handed to `valueText`. */
export interface ResizeHandleBounds {
    min: number;
    max: number;
}

/**
 * Props for the ResizeHandle component. Every other `div` prop is forwarded.
 */
export interface ResizeHandleProps
    extends Omit<React.ComponentPropsWithoutRef<"div">, "onChange" | "defaultValue" | "children"> {
    /**
     * The panel edge the handle straddles: `"end"` for a panel on the leading side of the
     * window (its trailing edge is dragged), `"start"` for a panel on the trailing side, `"top"`
     * or `"bottom"` for a vertical split. Start and end follow the text direction.
     * @default "end"
     */
    edge?: ResizeHandleEdge;
    /** The panel's size in pixels, when you drive it from your own state. */
    value?: number;
    /**
     * The size it starts at when it keeps its own state, and the size a double-click resets
     * to. Defaults to `min`.
     */
    defaultValue?: number;
    /** The smallest size, in pixels. */
    min: number;
    /** The largest size, in pixels. */
    max: number;
    /** Called with every new size, live while dragging and on each key press. */
    onChange?: (value: number) => void;
    /** Called once the size settles: on pointer release, after a key press, after a reset. */
    onChangeEnd?: (value: number) => void;
    /**
     * The handle's accessible name.
     * @default "Resize panel"
     */
    label?: string;
    /**
     * How the size is read out. Defaults to `"240 pixels"`, with `" (min)"` or `" (max)"` at
     * the ends of the range.
     */
    valueText?: (value: number, bounds: ResizeHandleBounds) => string;
}

/** Arrow key steps in px (spec 9.9): 1 per press, Shift for 10 (ours; Figma steps 1 only). */
const STEP = 1;
const SHIFT_STEP = 10;

/**
 * The default reading of the size.
 * @param value - The size in pixels
 * @param bounds - The size range
 * @param bounds.min - The smallest size
 * @param bounds.max - The largest size
 * @returns For example "240 pixels (min)"
 */
function defaultValueText(value: number, { min, max }: ResizeHandleBounds): string {
    let end = "";
    if (value <= min) {
        end = " (min)";
    } else if (value >= max) {
        end = " (max)";
    }

    return `${String(value)} pixels${end}`;
}

/**
 * A handle that resizes a panel by dragging, by the arrow keys, or back to its default size by
 * a double-click.
 *
 * Put it inside the panel it resizes, which must be `position: relative`; it places itself
 * across the named edge. It draws nothing until it has keyboard focus, like Figma's.
 *
 * - Drag: the size follows the pointer live (`onChange`) and settles on release (`onChangeEnd`).
 * - Keys: the arrows along the handle's axis change the size by 1px, in the direction the
 *   edge moves (ArrowRight grows a leading-side panel); Shift moves 10px; Home and End jump to
 *   `min` and `max`.
 * - Double-click resets to `defaultValue`.
 *
 * The cursor says which ways the edge can still move: `e-resize` or `w-resize` at the ends of
 * the range and `ew-resize` between them; `ns-resize` on a split.
 * @param props - Component props
 * @param props.edge - Which panel edge the handle straddles
 * @param props.value - The panel's size, when controlled
 * @param props.defaultValue - The starting size when uncontrolled, and the double-click reset size
 * @param props.min - The smallest size
 * @param props.max - The largest size
 * @param props.onChange - Called with every new size
 * @param props.onChangeEnd - Called once a size settles
 * @param props.label - The accessible name
 * @param props.valueText - How the size is read out
 * @returns The resize handle
 * @example
 * ```tsx
 * <Box pos="relative" w={width}>
 *     <ResizeHandle edge="end" value={width} min={240} max={500} defaultValue={240} onChange={setWidth} />
 * </Box>
 * ```
 */
export const ResizeHandle = forwardRef<HTMLDivElement, ResizeHandleProps>(function ResizeHandle(
    {
        edge = "end",
        value,
        defaultValue,
        min,
        max,
        onChange,
        onChangeEnd,
        label = "Resize panel",
        valueText = defaultValueText,
        style,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
        onKeyDown,
        onDoubleClick,
        ...rest
    },
    ref,
): React.JSX.Element {
    useCompactStyles();
    const rtl = isRtl(useDirection());
    const reset = defaultValue ?? min;
    const [size, setSize] = useUncontrolled<number>({ value, defaultValue, finalValue: min, onChange });
    const drag = useRef<{ start: number; from: number; last: number } | null>(null);

    const horizontalAxis = edge === "start" || edge === "end";
    // +1 when moving the pointer (or pressing the arrow) towards +x / +y grows the panel.
    const endward = edge === "end" ? 1 : -1;
    let sign = edge === "bottom" ? 1 : -1;
    if (horizontalAxis) {
        sign = rtl ? -endward : endward;
    }

    const clamp = (n: number): number => Math.min(max, Math.max(min, Math.round(n)));

    const commit = (next: number, end: boolean): void => {
        const clamped = clamp(next);
        if (clamped !== size) {
            setSize(clamped);
        }
        if (end) {
            onChangeEnd?.(clamped);
        }
    };

    let cursor = "ns-resize";
    if (horizontalAxis) {
        const grow = sign > 0 ? "e" : "w";
        const shrink = sign > 0 ? "w" : "e";
        cursor = "ew-resize";
        if (size <= min) {
            cursor = `${grow}-resize`;
        } else if (size >= max) {
            cursor = `${shrink}-resize`;
        }
    }

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
        onPointerDown?.(event);
        if (event.defaultPrevented || event.button !== 0) {
            return;
        }
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const start = horizontalAxis ? event.clientX : event.clientY;
        drag.current = { start, from: size, last: size };
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
        onPointerMove?.(event);
        const d = drag.current;
        if (!d) {
            return;
        }
        const at = horizontalAxis ? event.clientX : event.clientY;
        d.last = clamp(d.from + (at - d.start) * sign);
        commit(d.last, false);
    };

    const endDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
        const d = drag.current;
        drag.current = null;
        if (d) {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
            onChangeEnd?.(d.last);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        onKeyDown?.(event);
        if (event.defaultPrevented) {
            return;
        }
        const step = event.shiftKey ? SHIFT_STEP : STEP;
        const keys: Record<string, number> = horizontalAxis
            ? { ArrowRight: step, ArrowLeft: -step }
            : { ArrowDown: step, ArrowUp: -step };
        let next: number | undefined;
        if (event.key in keys) {
            next = size + keys[event.key] * sign;
        } else if (event.key === "Home") {
            next = min;
        } else if (event.key === "End") {
            next = max;
        }
        if (next !== undefined) {
            event.preventDefault();
            commit(next, true);
        }
    };

    const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>): void => {
        onDoubleClick?.(event);
        commit(reset, true);
    };

    return (
        <Box
            ref={ref}
            role="separator"
            tabIndex={0}
            aria-label={label}
            // The orientation of the separator line: a handle on a side edge is a vertical line.
            aria-orientation={horizontalAxis ? "vertical" : "horizontal"}
            aria-valuenow={size}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuetext={valueText(size, { min, max })}
            data-testid="resize-handle"
            data-edge={edge}
            className="cm-resize-handle"
            {...rest}
            style={{ cursor, ...style }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => {
                onPointerUp?.(event);
                endDrag(event);
            }}
            onPointerCancel={(event) => {
                onPointerCancel?.(event);
                endDrag(event);
            }}
            onKeyDown={handleKeyDown}
            onDoubleClick={handleDoubleClick}
        />
    );
});
