/**
 * Drags a row by its handle: the pointer is captured on press, and on release the row moves to where the pointer is
 * among its list's rows. Near the top or bottom edge of a scrolling list, a drag scrolls it, so a row can reach a
 * place that is out of view. Shared by the shader rows and the parallel list lines (a pie's slices, stripes).
 */

import { useState } from "react";

/** How near an edge, in pixels, a dragged pointer scrolls its list, and how far each move scrolls it. */
const EDGE = 16;
const STEP = 8;

/**
 * The nearest ancestor that scrolls up and down.
 * @param element - where to start.
 * @returns the scroller, or null.
 */
function scrollerOf(element: HTMLElement | null): HTMLElement | null {
    for (let at = element?.parentElement ?? null; at !== null; at = at.parentElement) {
        if (at.scrollHeight > at.clientHeight && /(auto|scroll)/.test(getComputedStyle(at).overflowY)) {
            return at;
        }
    }
    return null;
}

/**
 * See the file header.
 * @param box - the row.
 * @param index - the row's index.
 * @param onMove - moves it.
 * @param rowsOf - the list's rows, in order, from the row.
 * @returns the handle's pointer handlers, and whether a drag is under way.
 */
export function useRowDrag(
    box: React.RefObject<HTMLElement | null>,
    index: number,
    onMove: (from: number, to: number) => void,
    rowsOf: (row: HTMLElement) => readonly HTMLElement[],
): { dragging: boolean; handlers: React.HTMLAttributes<HTMLElement> } {
    const [dragging, setDragging] = useState(false);
    const handlers: React.HTMLAttributes<HTMLElement> = {
        onPointerDown: (event) => {
            if (event.button !== 0) {
                return;
            }
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
        },
        onPointerMove: (event) => {
            if (!dragging) {
                return;
            }
            const scroller = scrollerOf(box.current);
            if (scroller === null) {
                return;
            }
            const rect = scroller.getBoundingClientRect();
            if (event.clientY < rect.top + EDGE) {
                scroller.scrollTop -= STEP;
            } else if (event.clientY > rect.bottom - EDGE) {
                scroller.scrollTop += STEP;
            }
        },
        onPointerUp: (event) => {
            if (!dragging) {
                return;
            }
            setDragging(false);
            const rows = box.current === null ? [] : rowsOf(box.current);
            // The row goes where the pointer is: before the first row whose middle is below it.
            const below = rows.findIndex((row) => {
                const rect = row.getBoundingClientRect();
                return event.clientY < rect.top + rect.height / 2;
            });
            const slot = below < 0 ? rows.length : below;
            const to = slot > index ? slot - 1 : slot;
            if (to !== index) {
                onMove(index, to);
            }
        },
        onPointerCancel: () => {
            setDragging(false);
        },
    };
    return { dragging, handlers };
}

/**
 * A row's key handler that moves it by one on Alt+ArrowUp and Alt+ArrowDown, from any of its own controls. A key
 * from the row's pop-outs reaches it through React's portal and is not the row's.
 * @param box - the row.
 * @param move - moves it by -1 or 1.
 * @returns the handler.
 */
export function altArrowMove(
    box: React.RefObject<HTMLElement | null>,
    move: (by: -1 | 1) => void,
): React.KeyboardEventHandler<HTMLElement> {
    return (event) => {
        if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) {
            return;
        }
        if (!box.current?.contains(event.target as Node)) {
            return;
        }
        event.preventDefault();
        move(event.key === "ArrowUp" ? -1 : 1);
    };
}
