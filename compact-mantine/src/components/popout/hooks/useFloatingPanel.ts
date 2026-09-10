import { useCallback, useRef, useState } from "react";

import type { GestureChangeHandler, GestureEndHandler, GestureStartHandler } from "../../../types/events";
import type { PopoutPosition } from "../../../types/popout";

// How far the pointer must travel before a press counts as a drag rather than a
// click, in pixels. Anything smaller is the hand shake that every pointer has
// between pressing and releasing.
//
// This threshold is also what keeps a drag from closing the panel's children: a
// pointer release ends the drag by producing a click, and the panel's click
// handler treats a click on itself as a click outside its children. The hook
// records that the gesture was a drag so the panel can ignore that one click.
const DRAG_THRESHOLD = 3;

/**
 * Configuration options for the useFloatingPanel hook.
 */
interface UseFloatingPanelOptions {
    /** Whether the panel is currently open */
    isOpen: boolean;
    /**
     * Called on the press that may become a drag, before any movement, with
     * the event that pressed. No handler in this package is a bare callback:
     * the event is what lets a caller read a modifier key or find the element.
     */
    onPress?: GestureStartHandler;
    /** Called once the pointer has moved far enough for the press to be a drag. */
    onDragStart?: GestureStartHandler;
    /** Called on every movement of a drag, with the offset from where the panel opened. */
    onDrag?: GestureChangeHandler<PopoutPosition>;
    /** Called when a drag finishes or is cancelled. */
    onDragEnd?: GestureEndHandler;
}

/**
 * Return type for the useFloatingPanel hook.
 */
interface UseFloatingPanelReturn {
    /** Props to spread on the drag trigger element (header) */
    dragTriggerProps: Record<string, unknown>;
    /** Current drag offset from initial position */
    dragOffset: PopoutPosition;
    /** Reset the drag offset to zero */
    resetDragOffset: () => void;
    /** Whether the panel has been moved from where it opened */
    hasDragged: boolean;
    /**
     * Whether the click now being handled came from the end of a drag, clearing
     * the record as it answers so that the next click is treated normally.
     */
    consumeDragClick: () => boolean;
}

/**
 * Custom hook for drag functionality on popout panels.
 * Provides drag behavior using native pointer events.
 *
 * This hook tracks drag OFFSET, not absolute position.
 * The parent component should calculate the initial position and add
 * the dragOffset to get the final position.
 * @param options - Configuration for the floating panel
 * @returns Props to spread on drag trigger element, the current drag offset, and the drag state a click handler needs
 */
export function useFloatingPanel(options: UseFloatingPanelOptions): UseFloatingPanelReturn {
    const {
        isOpen, onPress, onDragStart, onDrag, onDragEnd,
    } = options;

    // Track drag offset (how far user dragged from initial position)
    const [dragOffset, setDragOffset] = useState<PopoutPosition>({ left: 0, top: 0 });

    // Track drag state
    const isPressedRef = useRef(false);
    const isDraggingRef = useRef(false);
    const suppressClickRef = useRef(false);
    const dragStartRef = useRef<{ x: number; y: number; offsetLeft: number; offsetTop: number }>({
        x: 0,
        y: 0,
        offsetLeft: 0,
        offsetTop: 0,
    });

    // Reset drag offset
    const resetDragOffset = useCallback((): void => {
        setDragOffset({ left: 0, top: 0 });
    }, []);

    const consumeDragClick = useCallback((): boolean => {
        const wasDrag = suppressClickRef.current;
        suppressClickRef.current = false;
        return wasDrag;
    }, []);

    // Handle pointer down - start drag
    const handlePointerDown = useCallback(
        (e: React.PointerEvent): void => {
            // Don't start drag if clicking on interactive elements
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.tagName === "BUTTON" ||
                target.tagName === "SELECT" ||
                target.closest("button") ||
                target.closest("input") ||
                target.closest("textarea") ||
                target.closest("select")
            ) {
                return;
            }

            isPressedRef.current = true;
            isDraggingRef.current = false;
            suppressClickRef.current = false;
            dragStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                offsetLeft: dragOffset.left,
                offsetTop: dragOffset.top,
            };

            // Tells the panel it was pressed, which is what raises it above the
            // others whether or not the press becomes a drag.
            onPress?.(e);

            try {
                // Capture the pointer so the drag survives the pointer leaving
                // the header.
                target.setPointerCapture(e.pointerId);
            } catch {
                // A pointer that is not physically down cannot be captured, which
                // is the case for a pointer event dispatched by a test and for a
                // pointer released between the event and this handler. Capture
                // only widens where the drag keeps working, so a drag without it
                // is still a drag.
            }
        },
        [dragOffset.left, dragOffset.top, onPress],
    );

    // Handle pointer move - update position during drag
    const handlePointerMove = useCallback(
        (e: React.PointerEvent): void => {
            if (!isPressedRef.current) {
                return;
            }

            const deltaX = e.clientX - dragStartRef.current.x;
            const deltaY = e.clientY - dragStartRef.current.y;

            if (!isDraggingRef.current) {
                // Written as "has it moved far enough" rather than "is it still
                // close", so that a pointer event carrying no coordinates at all
                // counts as no movement instead of as an unmeasurable drag.
                const movedFarEnough =
                    Math.abs(deltaX) >= DRAG_THRESHOLD || Math.abs(deltaY) >= DRAG_THRESHOLD;
                if (!movedFarEnough) {
                    return;
                }
                isDraggingRef.current = true;
                onDragStart?.(e);
            }

            const nextOffset: PopoutPosition = {
                left: dragStartRef.current.offsetLeft + deltaX,
                top: dragStartRef.current.offsetTop + deltaY,
            };

            setDragOffset(nextOffset);
            onDrag?.(nextOffset, e);
        },
        [onDrag, onDragStart],
    );

    // Handle pointer up - end drag
    const handlePointerUp = useCallback(
        (e: React.PointerEvent): void => {
            if (!isPressedRef.current) {
                return;
            }

            isPressedRef.current = false;

            const target = e.target as HTMLElement;
            if (target.hasPointerCapture(e.pointerId)) {
                target.releasePointerCapture(e.pointerId);
            }

            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                // The release produces a click. Record that it belongs to a drag
                // so the panel does not treat it as a click on itself.
                suppressClickRef.current = true;
                onDragEnd?.(e);
            }
        },
        [onDragEnd],
    );

    const hasDragged = dragOffset.left !== 0 || dragOffset.top !== 0;

    // Only return drag-related props when panel is open
    if (!isOpen) {
        return {
            dragTriggerProps: {},
            dragOffset: { left: 0, top: 0 },
            resetDragOffset,
            hasDragged: false,
            consumeDragClick,
        };
    }

    return {
        dragTriggerProps: {
            "data-drag-trigger": true,
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onPointerCancel: handlePointerUp,
            style: {
                cursor: "grab",
                userSelect: "none" as const,
                touchAction: "none" as const,
            },
        },
        dragOffset,
        resetDragOffset,
        hasDragged,
        consumeDragClick,
    };
}
