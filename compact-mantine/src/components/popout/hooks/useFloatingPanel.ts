import { useCallback, useRef, useState } from "react";

import type { PopoutPosition } from "../../../types/popout";

/**
 * Configuration options for the useFloatingPanel hook.
 */
interface UseFloatingPanelOptions {
    /** Whether the panel is currently open */
    isOpen: boolean;
    /** Callback fired when drag starts (e.g., to bring panel to front) */
    onDragStart?: () => void;
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
}

/**
 * Custom hook for drag functionality on popout panels.
 * Provides drag behavior using native pointer events.
 *
 * This hook tracks drag OFFSET, not absolute position.
 * The parent component should calculate the initial position and add
 * the dragOffset to get the final position.
 * @param options - Configuration for the floating panel
 * @returns Props to spread on drag trigger element and current drag offset
 */
export function useFloatingPanel(options: UseFloatingPanelOptions): UseFloatingPanelReturn {
    const { isOpen, onDragStart } = options;

    // Track drag offset (how far user dragged from initial position)
    const [dragOffset, setDragOffset] = useState<PopoutPosition>({ left: 0, top: 0 });

    // Track drag state
    const isDraggingRef = useRef(false);
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

            isDraggingRef.current = true;
            dragStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                offsetLeft: dragOffset.left,
                offsetTop: dragOffset.top,
            };

            // Notify parent that drag is starting (e.g., to bring panel to front)
            onDragStart?.();

            // Capture pointer to track even outside element
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        },
        [dragOffset.left, dragOffset.top, onDragStart],
    );

    // Handle pointer move - update position during drag
    const handlePointerMove = useCallback((e: React.PointerEvent): void => {
        if (!isDraggingRef.current) {return;}

        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        setDragOffset({
            left: dragStartRef.current.offsetLeft + deltaX,
            top: dragStartRef.current.offsetTop + deltaY,
        });
    }, []);

    // Handle pointer up - end drag
    const handlePointerUp = useCallback((e: React.PointerEvent): void => {
        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        }
    }, []);

    // Only return drag-related props when panel is open
    if (!isOpen) {
        return {
            dragTriggerProps: {},
            dragOffset: { left: 0, top: 0 },
            resetDragOffset,
        };
    }

    return {
        dragTriggerProps: {
            "data-drag-trigger": true,
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            style: {
                cursor: "grab",
                userSelect: "none" as const,
                touchAction: "none" as const,
            },
        },
        dragOffset,
        resetDragOffset,
    };
}
