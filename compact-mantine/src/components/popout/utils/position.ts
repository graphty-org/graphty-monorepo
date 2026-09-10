import { POPOUT_GAP } from "../../../constants/popout";
import type {
    PopoutAlignment,
    PopoutPhysicalPlacement,
    PopoutPlacement,
    PopoutPosition,
} from "../../../types/popout";
import { type Direction, isRtl } from "../../../utils/rtl";

// The panel is placed with fixed `left` and `top` rather than with the logical
// `inset-inline-start`. Those two numbers are the output of a geometric
// calculation over viewport coordinates from getBoundingClientRect, which are
// physical in both reading directions; expressing them logically would mean
// converting them back through the viewport width and would move the panel by a
// scrollbar's width. Reading direction is honoured where it actually belongs
// instead: in which side "start" and "end" name, resolved by resolvePlacement
// and applied to the inline axis below.

/**
 * Options for calculating popout position with placement and alignment.
 */
interface CalculatePositionOptions {
    /** Which physical side of the anchor the panel sits on. @default "left" */
    placement?: PopoutPhysicalPlacement;
    /** Alignment along the axis the panel is placed against. @default "start" */
    alignment?: PopoutAlignment;
    /** Height of the panel (required for center/end alignment on left/right placement) */
    panelHeight?: number;
    /**
     * The rectangle the panel aligns along, when that is a different element
     * from the one it is placed against. Defaults to the anchor rectangle, which
     * is the case where one element governs both axes.
     */
    crossAnchorRect?: DOMRect;
    /** The reading direction, which decides which side "start" and "end" name. @default "ltr" */
    direction?: Direction;
}

/**
 * Resolves a placement that may name a reading-direction side into one that
 * names a physical side.
 *
 * `"start"` is the side text begins on -- left where text runs left to right,
 * right where it runs right to left -- and `"end"` is the opposite. The other
 * four values already name a physical side and are returned unchanged.
 * @param placement - The placement to resolve, physical or direction-relative
 * @param direction - The reading direction in force
 * @returns The physical side of the anchor the panel sits on
 */
export function resolvePlacement(
    placement: PopoutPlacement,
    direction: Direction,
): PopoutPhysicalPlacement {
    if (placement === "start") {
        return isRtl(direction) ? "right" : "left";
    }
    if (placement === "end") {
        return isRtl(direction) ? "left" : "right";
    }
    return placement;
}

/**
 * Calculates the position for a popout panel relative to an anchor element.
 *
 * Supports configurable placement (left, right, top, bottom) and alignment
 * (start, center, end). The two axes can be governed by different elements:
 * pass the second element's rectangle as `crossAnchorRect` to align the panel
 * along one element while placing it against another.
 * @param anchorRect - The bounding rectangle of the element the panel is placed against
 * @param panelWidth - The width of the panel in pixels, as it actually renders
 * @param gap - The gap between anchor and panel (default: POPOUT_GAP = 8px)
 * @param options - Placement, alignment, panel height, cross-axis anchor and reading direction
 * @returns The calculated position { left, top }
 */
export function calculatePopoutPosition(
    anchorRect: DOMRect,
    panelWidth: number,
    gap: number = POPOUT_GAP,
    options: CalculatePositionOptions = {},
): PopoutPosition {
    const {
        placement = "left",
        alignment = "start",
        panelHeight = 0,
        crossAnchorRect = anchorRect,
        direction = "ltr",
    } = options;

    let left: number;
    let top: number;

    // Calculate primary axis position based on placement
    switch (placement) {
        case "left":
            left = anchorRect.left - panelWidth - gap;
            top = calculateVerticalAlignment(crossAnchorRect, alignment, panelHeight);
            break;
        case "right":
            left = anchorRect.right + gap;
            top = calculateVerticalAlignment(crossAnchorRect, alignment, panelHeight);
            break;
        case "top":
            left = calculateHorizontalAlignment(crossAnchorRect, alignment, panelWidth, direction);
            top = anchorRect.top - panelHeight - gap;
            break;
        case "bottom":
            left = calculateHorizontalAlignment(crossAnchorRect, alignment, panelWidth, direction);
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
 * @param anchorRect - The bounding rectangle of the element the panel aligns along
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
 *
 * The horizontal axis is the inline one, so "start" and "end" follow the
 * reading direction: a panel aligned to the start of its anchor lines up with
 * the anchor's right edge where text runs right to left.
 * @param anchorRect - The bounding rectangle of the element the panel aligns along
 * @param alignment - Alignment option (start, center, end)
 * @param panelWidth - Width of the panel in pixels
 * @param direction - The reading direction in force
 * @returns The left position in pixels
 */
function calculateHorizontalAlignment(
    anchorRect: DOMRect,
    alignment: PopoutAlignment,
    panelWidth: number,
    direction: Direction,
): number {
    switch (alignment) {
        case "start":
            return isRtl(direction) ? anchorRect.right - panelWidth : anchorRect.left;
        case "center":
            return anchorRect.left + anchorRect.width / 2 - panelWidth / 2;
        case "end":
            return isRtl(direction) ? anchorRect.left : anchorRect.right - panelWidth;
        default: {
            const _exhaustive: never = alignment;
            throw new Error(`Unknown alignment: ${String(_exhaustive)}`);
        }
    }
}
