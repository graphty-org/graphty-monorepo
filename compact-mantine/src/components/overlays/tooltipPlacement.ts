/**
 * Where a tooltip opens: on the side its caller asked for, unless the bubble would cover another
 * control or a field's error line there. Then it tries the opposite side and the two sides across,
 * and takes the first that covers nothing; when every side covers something, the side that covers
 * the least. A tooltip is read beside what it names, so it never hides the control the reader
 * reaches for next.
 *
 * It rides on floating-ui's own flip middleware, whose options may be derived from the placement
 * it is trying: a side that would cover a control is given a boundary that its bubble overflows by
 * a penalty that grows with the area covered, so flip moves on, and its best-fit fallback picks
 * the side that covers least. Running off the window costs more than covering: a bubble stays
 * whole on screen first.
 */

/** What a tooltip must not cover: the controls a reader acts on, and a field's error line. */
const OBSTACLES = [
    "button",
    "a[href]",
    'input:not([type="hidden"])',
    "select",
    "textarea",
    '[role="button"]',
    '[role="combobox"]',
    '[role="checkbox"]',
    '[role="switch"]',
    '[role="radio"]',
    '[role="tab"]',
    '[role="slider"]',
    '[role="spinbutton"]',
    '[role="treeitem"]',
    '[role="alert"]',
    ".cm-field-error",
].join(", ");

/** The covered area, in px^2, at which a side's penalty is halfway between its least and most. */
const COVER_SCALE = 2000;

/** Far enough that a boundary edge set this far out never limits a bubble. */
const FAR = 100_000;

/** A box in viewport pixels. */
interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** The part of floating-ui's middleware state the placement reads. */
interface PlacementState {
    x: number;
    y: number;
    placement: string;
    initialPlacement: string;
    rects: { reference: Box; floating: Box };
    elements: { reference: unknown; floating: HTMLElement };
}

const OPPOSITE: Record<string, string> = { top: "bottom", bottom: "top", left: "right", right: "left" };

/**
 * The sides a tooltip may fall back to: the opposite side, then the two across.
 * @param initial - the placement the caller asked for ("bottom", "top-start", ...)
 * @returns the fallback placements, in order
 */
function fallbacksFor(initial: string): string[] {
    const [side, align] = initial.split("-");
    const opposite = OPPOSITE[side] ?? "top";
    const across = side === "top" || side === "bottom" ? ["right", "left"] : ["bottom", "top"];
    return [align ? `${opposite}-${align}` : opposite, ...across];
}

/**
 * How much of what the bubble would cover at this place is a control or an error line, in px of
 * area. The trigger, what holds it and what it holds never count, nor does anything another layer
 * hides at its center.
 * @param bubble - the bubble's box, in viewport pixels
 * @param reference - the trigger
 * @param floating - the bubble
 * @returns the area covered
 */
function coveredArea(bubble: Box, reference: Element, floating: HTMLElement): number {
    let area = 0;
    for (const element of document.querySelectorAll(OBSTACLES)) {
        if (element.contains(reference) || reference.contains(element) || floating.contains(element)) {
            continue;
        }
        const box = element.getBoundingClientRect();
        const width = Math.min(bubble.x + bubble.width, box.right) - Math.max(bubble.x, box.left);
        const height = Math.min(bubble.y + bubble.height, box.bottom) - Math.max(bubble.y, box.top);
        if (width <= 1 || height <= 1 || box.width <= 1 || box.height <= 1) {
            continue;
        }
        // Drawn on top at its center, not under a panel or another overlay.
        const top = document
            .elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2)
            .find((hit) => !floating.contains(hit));
        if (top && (element.contains(top) || top.contains(element))) {
            area += width * height;
        }
    }
    return area;
}

/**
 * The flip options for one placement floating-ui tries (its derivable form).
 * @param state - floating-ui's middleware state
 * @returns the flip options
 */
export function tooltipFlip(state: PlacementState): Record<string, unknown> {
    const options: Record<string, unknown> = { fallbackPlacements: fallbacksFor(state.initialPlacement) };
    const { reference, floating } = state.elements;
    if (!(reference instanceof Element)) {
        return options;
    }
    // x and y are in the frame floating-ui positions in; the trigger's two boxes give the shift
    // to the viewport.
    const client = reference.getBoundingClientRect();
    const bubble: Box = {
        x: state.x + client.left - state.rects.reference.x,
        y: state.y + client.top - state.rects.reference.y,
        width: state.rects.floating.width,
        height: state.rects.floating.height,
    };
    const area = coveredArea(bubble, reference, floating);
    if (area === 0) {
        return options;
    }
    // A boundary the bubble overflows on its own side by the penalty and nowhere else. The penalty
    // stays under 2px for any bubble, so a side that covers a control still beats one that runs a
    // few pixels off the window, and among sides that all cover something the least covered wins.
    const penalty = 1 + area / (area + COVER_SCALE);
    const side = state.placement.split("-")[0];
    const left = side === "left" ? bubble.x + penalty : bubble.x - FAR;
    const right = side === "right" ? bubble.x + bubble.width - penalty : bubble.x + bubble.width + FAR;
    const top = side === "top" ? bubble.y + penalty : bubble.y - FAR;
    const bottom = side === "bottom" ? bubble.y + bubble.height - penalty : bubble.y + bubble.height + FAR;
    return { ...options, boundary: { x: left, y: top, width: right - left, height: bottom - top } };
}
