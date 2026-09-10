import type { PopoutAnchorTarget } from "../../../types/popout";

// The two axes are resolved separately because one element rarely governs both.
// A panel opened from a row in a sidebar wants its inline edge on the sidebar
// (or on the panel it opened from, when there is one) and its block position on
// the row that opened it. Before the split, one anchor supplied both, so
// aligning to a sidebar edge forced alignment to the sidebar's top and
// "level with the trigger" could not be expressed at all.

/**
 * The elements a pop-out panel can align to, gathered from the panel's own
 * surroundings.
 */
export interface PopoutAnchorElements {
    /** The control that opened the panel. */
    trigger: HTMLElement | null;
    /** The pop-out panel this one opened from, for a nested panel. */
    parent: HTMLElement | null;
    /** The container marked with `Popout.Anchor`, such as a sidebar. */
    panel: HTMLElement | null;
    /** The element named by the deprecated `anchorRef` prop, if any. */
    explicit: HTMLElement | null;
}

/**
 * Finds a rendered pop-out panel by the identifier it carries in the DOM.
 * @param popoutId - The identifier of the pop-out whose panel to find
 * @param root - Where to search, which defaults to the whole document
 * @returns The panel element, or null when that pop-out is not open
 */
export function findPanelElement(
    popoutId: string | null,
    root: Document | HTMLElement = document,
): HTMLElement | null {
    if (popoutId === null) {
        return null;
    }
    return root.querySelector<HTMLElement>(`[data-popout-id="${popoutId}"]`);
}

/**
 * Works out which element one axis of a pop-out panel lines up with.
 *
 * With no target given, the horizontal axis prefers the panel this one opened
 * from, then a container marked with `Popout.Anchor`, then the trigger -- so a
 * nested panel steps out from its parent even inside an anchored sidebar. The
 * vertical axis prefers the trigger, so a panel opens level with the row that
 * opened it.
 * @param target - What the axis should line up with, or undefined to use the default order
 * @param axis - Which axis is being resolved: "x" the horizontal position, "y" the vertical one
 * @param elements - The elements available to align to
 * @returns The element to measure, or null when none of the candidates exist
 */
export function resolveAnchorElement(
    target: PopoutAnchorTarget | undefined,
    axis: "x" | "y",
    elements: PopoutAnchorElements,
): HTMLElement | null {
    const {
        trigger, parent, panel, explicit,
    } = elements;

    if (target !== undefined) {
        if (typeof target === "object") {
            return target.current;
        }
        switch (target) {
            case "parent":
                return parent ?? panel ?? trigger;
            case "panel":
                return panel ?? parent ?? trigger;
            case "trigger":
                return trigger;
            default: {
                const _exhaustive: never = target;
                throw new Error(`Unknown anchor target: ${String(_exhaustive)}`);
            }
        }
    }

    // An explicitly named element governs both axes, which is what the
    // superseded anchorRef prop meant.
    if (explicit) {
        return explicit;
    }

    if (axis === "x") {
        return parent ?? panel ?? trigger;
    }

    return trigger ?? parent ?? panel;
}
