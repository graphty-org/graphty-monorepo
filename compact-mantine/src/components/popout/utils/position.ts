import { POPOUT_GAP } from "../../../constants/popout";
import type { PopoutPosition } from "../../../types/popout";

/**
 * Calculates the position for a popout panel relative to its trigger element.
 * The panel is positioned to the left of the trigger with the specified gap.
 * @param triggerRect - The bounding rectangle of the trigger element
 * @param panelWidth - The width of the panel in pixels
 * @param gap - The gap between trigger and panel (default: POPOUT_GAP = 8px)
 * @returns The calculated position { left, top }
 */
export function calculatePopoutPosition(
    triggerRect: DOMRect,
    panelWidth: number,
    gap: number = POPOUT_GAP,
): PopoutPosition {
    return {
        left: triggerRect.left - panelWidth - gap,
        top: triggerRect.top,
    };
}
