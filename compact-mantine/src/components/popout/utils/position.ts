import { POPOUT_GAP } from "../../../constants/popout";
import type { PopoutAlignment, PopoutPlacement, PopoutPosition } from "../../../types/popout";

/**
 * Options for calculating popout position with placement and alignment.
 */
interface CalculatePositionOptions {
    /** Placement of the panel relative to the anchor. @default "left" */
    placement?: PopoutPlacement;
    /** Alignment along the placement axis. @default "start" */
    alignment?: PopoutAlignment;
    /** Height of the panel (required for center/end alignment on left/right placement) */
    panelHeight?: number;
}

/**
 * Calculates the position for a popout panel relative to an anchor element.
 * Supports configurable placement (left, right, top, bottom) and alignment (start, center, end).
 * @param anchorRect - The bounding rectangle of the anchor element
 * @param panelWidth - The width of the panel in pixels
 * @param gap - The gap between anchor and panel (default: POPOUT_GAP = 8px)
 * @param options - Placement and alignment options
 * @returns The calculated position { left, top }
 */
export function calculatePopoutPosition(
    anchorRect: DOMRect,
    panelWidth: number,
    gap: number = POPOUT_GAP,
    options: CalculatePositionOptions = {},
): PopoutPosition {
    const { placement = "left", alignment = "start", panelHeight = 0 } = options;

    let left: number;
    let top: number;

    // Calculate primary axis position based on placement
    switch (placement) {
        case "left":
            left = anchorRect.left - panelWidth - gap;
            top = calculateVerticalAlignment(anchorRect, alignment, panelHeight);
            break;
        case "right":
            left = anchorRect.right + gap;
            top = calculateVerticalAlignment(anchorRect, alignment, panelHeight);
            break;
        case "top":
            left = calculateHorizontalAlignment(anchorRect, alignment, panelWidth);
            top = anchorRect.top - panelHeight - gap;
            break;
        case "bottom":
            left = calculateHorizontalAlignment(anchorRect, alignment, panelWidth);
            top = anchorRect.bottom + gap;
            break;
        default: {
            // Exhaustive check - TypeScript will error if a case is missing
            const _exhaustive: never = placement;
            throw new Error(`Unknown placement: ${String(_exhaustive)}`);
        }
    }

    return { left, top };
}

/**
 * Calculate vertical position based on alignment for left/right placements.
 * @param anchorRect - The bounding rectangle of the anchor element
 * @param alignment - Alignment option (start, center, end)
 * @param panelHeight - Height of the panel in pixels
 * @returns The top position in pixels
 */
function calculateVerticalAlignment(
    anchorRect: DOMRect,
    alignment: PopoutAlignment,
    panelHeight: number,
): number {
    switch (alignment) {
        case "start":
            return anchorRect.top;
        case "center":
            return anchorRect.top + anchorRect.height / 2 - panelHeight / 2;
        case "end":
            return anchorRect.bottom - panelHeight;
        default: {
            const _exhaustive: never = alignment;
            throw new Error(`Unknown alignment: ${String(_exhaustive)}`);
        }
    }
}

/**
 * Calculate horizontal position based on alignment for top/bottom placements.
 * @param anchorRect - The bounding rectangle of the anchor element
 * @param alignment - Alignment option (start, center, end)
 * @param panelWidth - Width of the panel in pixels
 * @returns The left position in pixels
 */
function calculateHorizontalAlignment(
    anchorRect: DOMRect,
    alignment: PopoutAlignment,
    panelWidth: number,
): number {
    switch (alignment) {
        case "start":
            return anchorRect.left;
        case "center":
            return anchorRect.left + anchorRect.width / 2 - panelWidth / 2;
        case "end":
            return anchorRect.right - panelWidth;
        default: {
            const _exhaustive: never = alignment;
            throw new Error(`Unknown alignment: ${String(_exhaustive)}`);
        }
    }
}
