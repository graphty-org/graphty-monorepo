/**
 * The States stories of the selection controls (design/figma-spec.md 16): every state of a
 * component side by side, in whichever theme and contrast the toolbar selects. Hover and pressed
 * cannot be forced with a pseudo class, so those cells pass `data-cm-state="hover" | "pressed"`,
 * which the stylesheet draws exactly as the real state; keyboard focus is real, put on the cell
 * marked `data-story-focus` by the play function.
 *
 * Plain `createElement` rather than JSX so the file lints under the stories' `.ts` rule set.
 */
import { userEvent } from "@storybook/test";
import { createElement, type ReactNode } from "react";

import { PANEL_INK } from "../../../src/constants/panel";

/** One labelled cell of a state grid. */
export type StateCell = readonly [label: string, content: ReactNode];

/**
 * A grid of labelled states.
 * @param props - the cells
 * @param props.cells - label and content per state
 * @param props.columns - the column width, px
 * @param props.hug - size each control to its content instead of stretching it to the cell
 *   (controls that are as wide as their content in Figma: segmented tracks, links)
 * @returns the grid
 */
export function StateGrid({
    cells,
    columns = 140,
    hug = false,
}: {
    cells: readonly StateCell[];
    columns?: number;
    hug?: boolean;
}): ReactNode {
    return createElement(
        "div",
        {
            style: {
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, minmax(${String(columns)}px, 1fr))`,
                gap: 16,
                alignItems: "start",
            },
        },
        cells.map(([label, content]) =>
            createElement(
                "div",
                {
                    key: label,
                    style: { display: "flex", flexDirection: "column", gap: 4, alignItems: hug ? "flex-start" : undefined },
                },
                createElement("span", { style: { fontSize: 9, lineHeight: "14px", color: PANEL_INK.CHROME } }, label),
                content,
            ),
        ),
    );
}

/**
 * Play function: press Tab until the element marked `data-story-focus` (or a control inside
 * it) has keyboard focus, so its `:focus-visible` ring is drawn.
 * @param context - the story context
 * @param context.canvasElement - the story's root element
 */
export async function focusMarked({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> {
    const target = canvasElement.querySelector("[data-story-focus]");
    if (!target) {
        return;
    }
    for (let i = 0; i < 60; i++) {
        const active = canvasElement.ownerDocument.activeElement;
        if (active && (active === target || target.contains(active))) {
            return;
        }
        await userEvent.tab();
    }
}
