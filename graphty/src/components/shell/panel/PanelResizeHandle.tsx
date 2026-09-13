import { PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";
import { Box } from "@mantine/core";
import React, { useRef } from "react";

import { ACTIVITY_PANEL_MAX_WIDTH, ACTIVITY_PANEL_MIN_WIDTH } from "../constants";

/**
 * Width of the drag strip laid over the panel's canvas-facing boundary.
 *
 * The boundary itself is the 1px border of spec 03 section 1.1; a 1px pointer
 * target is not usable, so the strip takes the 8px the grid already spends
 * between a row's body and its trailing slot. The strip paints nothing: the
 * panel's own border stays the only rule on screen.
 */
const HANDLE_WIDTH = PANEL_GRID.TRAIL_GAP;

/**
 * How far one arrow press moves the boundary.
 *
 * The 8px step of the spacing scale (spec 04 section 3.4), so a keyboard drag
 * lands on the same positions a pointer drag settles on.
 */
const KEYBOARD_STEP = PANEL_GRID.TRAIL_GAP;

/**
 * The handle's accessible name. The APG window-splitter pattern needs one, and
 * the control has no drawn text of its own.
 *
 * The one home for the name, so anything finding the splitter by its accessible name quotes it.
 * @public
 */
export const PANEL_RESIZE_LABEL = "Resize the panel";

/**
 * Props of the activity panel's boundary drag.
 * @public
 */
export interface PanelResizeHandleProps {
    /** The panel's current width, already clamped by the store. */
    readonly width: number;
    /**
     * Reports the width the drag asked for. The clamp is the store's: a region
     * never clamps a width itself, so the canvas minimum is applied once, in
     * `clampActivityPanelWidth`, and the panel renders what comes back.
     */
    readonly onWidthChange: (width: number) => void;
}

/**
 * The panel / canvas boundary, as an APG window splitter.
 *
 * Dragging it asks the store for a new width; the store clamps the request so
 * the live canvas never falls below `CANVAS_MIN_WIDTH` (spec 03 section 1.1).
 * Arrow keys move the boundary as well as the pointer, and the press is
 * consumed here -- `preventDefault` is what keeps the shell's single dispatcher
 * from also reading the arrow as a canvas pan.
 * @param props - the handle's props.
 * @returns the boundary drag strip.
 */
export function PanelResizeHandle(props: PanelResizeHandleProps): React.JSX.Element {
    const { width, onWidthChange } = props;

    const dragRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
        if (event.button !== 0) {
            return;
        }

        dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: width };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
        const drag = dragRef.current;

        if (drag === null || drag.pointerId !== event.pointerId) {
            return;
        }

        onWidthChange(drag.startWidth + (event.clientX - drag.startX));
    };

    const endDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
        const drag = dragRef.current;

        if (drag === null || drag.pointerId !== event.pointerId) {
            return;
        }

        dragRef.current = null;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
            return;
        }

        // Consumed here, so the shell dispatcher does not also read it as a pan.
        event.preventDefault();
        onWidthChange(width + (event.key === "ArrowRight" ? KEYBOARD_STEP : -KEYBOARD_STEP));
    };

    return (
        <Box
            role="separator"
            tabIndex={0}
            aria-orientation="vertical"
            aria-label={PANEL_RESIZE_LABEL}
            aria-valuenow={width}
            aria-valuemin={ACTIVITY_PANEL_MIN_WIDTH}
            aria-valuemax={ACTIVITY_PANEL_MAX_WIDTH}
            data-testid="panel-resize-handle"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={handleKeyDown}
            style={{
                position: "absolute",
                insetBlock: 0,
                insetInlineEnd: 0,
                width: HANDLE_WIDTH,
                cursor: "col-resize",
                background: "transparent",
                // The panel's own 1px border is the drawn rule; the strip is the
                // target around it, and the focus ring is what makes it visible
                // to the keyboard.
                outlineColor: PANEL_INK.ACCENT,
                touchAction: "none",
            }}
        />
    );
}
