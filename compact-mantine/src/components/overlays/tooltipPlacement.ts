/**
 * Where a tooltip opens: on the side its caller asked for (below by default, as Figma places
 * them), flipping to the opposite side only when the bubble would run off the window there.
 *
 * It rides on floating-ui's own flip middleware, whose options may be derived from the placement
 * it is trying; the derived form is also where each tooltip's trigger is recorded.
 */

/** The part of floating-ui's middleware state the placement reads. */
interface PlacementState {
    initialPlacement: string;
    elements: { reference: unknown; floating: HTMLElement };
}

const OPPOSITE: Record<string, string> = { top: "bottom", bottom: "top", left: "right", right: "left" };

/**
 * Each tooltip's trigger, as floating-ui positions them. The trigger's aria-describedby is not
 * enough to find it: a control may write its own over the tooltip's (a Mantine text input does).
 */
const triggers = new WeakMap<Element, Element>();

/**
 * The control a tooltip belongs to, once it has been placed.
 * @param tooltip - a cm-tooltip element
 * @returns its trigger, or null
 */
export function tooltipTrigger(tooltip: Element): Element | null {
    return triggers.get(tooltip) ?? null;
}

/**
 * The flip options for one placement floating-ui tries (its derivable form): the opposite side
 * is the only fallback.
 * @param state - floating-ui's middleware state
 * @returns the flip options
 */
export function tooltipFlip(state: PlacementState): Record<string, unknown> {
    const { reference, floating } = state.elements;
    if (reference instanceof Element) {
        triggers.set(floating, reference);
    }
    const [side, align] = state.initialPlacement.split("-");
    const opposite = OPPOSITE[side] ?? "top";
    return { fallbackPlacements: [align ? `${opposite}-${align}` : opposite] };
}
