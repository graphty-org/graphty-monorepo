import { type PointerEvent as ReactPointerEvent, useEffect, useRef } from "react";

/** The rate a scrub changes a value at: exactly half a unit per screen pixel (spec 6.1). */
export const SCRUB_UNITS_PER_PX = 0.5;

/** What a scrub reports. Distances run along the text direction: forwards is positive. */
export interface ScrubCallbacks {
    /** the first movement after the press (a press that never moves opens nothing) */
    onStart?: (event: ReactPointerEvent<HTMLElement>) => void;
    /** every movement: `delta` since the previous report, `total` since the press, in px */
    onMove?: (delta: number, total: number, event: ReactPointerEvent<HTMLElement>) => void;
    /** release, cancel, or the capture taken away; only after a start */
    onEnd?: (event: ReactPointerEvent<HTMLElement>) => void;
}

/** The handlers to spread on the scrub handle. */
interface ScrubHandlers {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
    onLostPointerCapture: (event: ReactPointerEvent<HTMLElement>) => void;
}

/**
 * The html and body cursors a drag overrides, so the cursor does not flicker when the pointer
 * leaves the handle. Restored on release.
 * @param on - true while a drag is in progress
 */
function setDragCursor(on: boolean): void {
    for (const el of [document.documentElement, document.body]) {
        el.style.cursor = on ? "ew-resize" : "";
    }
}

/**
 * A horizontal drag on a field's leading slot (the scrub handle).
 *
 * Armed on the press, started on the first movement, so a click on the handle opens no undo
 * transaction. Pointer capture keeps the gesture on the handle when the pointer leaves it; the
 * press is kept off the field (`preventDefault`) and focus moves into the field's input, value
 * selected, only once a scrub ends: a press that never moves leaves focus where it was.
 * @param enabled - whether the handle scrubs at all
 * @param rtl - whether the text runs right to left (dragging left is then forwards)
 * @param callbacks - the gesture reports
 * @returns the handlers to spread on the handle
 */
export function useScrub(enabled: boolean, rtl: boolean, callbacks: ScrubCallbacks): ScrubHandlers | undefined {
    const armed = useRef(false);
    const started = useRef(false);
    const originX = useRef(0);
    const lastX = useRef(0);
    const latest = useRef(callbacks);
    latest.current = callbacks;

    // A field unmounted mid-drag must not leave the page cursor stuck.
    useEffect(
        () => () => {
            if (started.current) {
                setDragCursor(false);
            }
        },
        [],
    );

    if (!enabled) {
        return undefined;
    }

    const end = (event: ReactPointerEvent<HTMLElement>): void => {
        if (!armed.current) {
            return;
        }
        armed.current = false;
        if (started.current) {
            started.current = false;
            setDragCursor(false);
            latest.current.onEnd?.(event);
            // Focus lands in the field after a scrub (flows.md 6), so the arrow keys then edit it.
            const input = event.currentTarget.closest(".cm-input-wrapper")?.querySelector("input");
            if (input && !input.disabled) {
                input.focus({ preventScroll: true });
                // After the commit re-renders the value, which would drop a selection made now.
                requestAnimationFrame(() => {
                    input.select();
                });
            }
        }
    };

    return {
        onPointerDown: (event) => {
            if (event.button !== 0) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            // Guarded: not every environment implements pointer capture, and a synthesized
            // pointer (a test, an automation tool) has no active pointer id to capture.
            try {
                event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
                // Without capture the drag still works while the pointer stays on the handle.
            }
            armed.current = true;
            started.current = false;
            originX.current = event.clientX;
            lastX.current = event.clientX;
        },
        onPointerMove: (event) => {
            if (!armed.current) {
                return;
            }
            const travel = event.clientX - lastX.current;
            if (travel === 0) {
                return;
            }
            lastX.current = event.clientX;
            if (!started.current) {
                started.current = true;
                setDragCursor(true);
                latest.current.onStart?.(event);
            }
            const sign = rtl ? -1 : 1;
            latest.current.onMove?.(sign * travel, sign * (event.clientX - originX.current), event);
        },
        onPointerUp: end,
        onPointerCancel: end,
        onLostPointerCapture: end,
    };
}
