/**
 * A row of labelled cells for the input family's `States` stories: every state side by side, in
 * whatever colour scheme and contrast the Storybook toolbar selects. Hover and focus that a
 * pointer cannot hold still are forced with `data-state` (src/theme/css/inputs.css.ts).
 *
 * Written without JSX so it is a plain `.ts` module the stories import (the lint setup types only
 * `*.stories.tsx` and `stories/**\/*.ts`).
 */
import { Stack, Text, type TextProps } from "@mantine/core";
import { createElement, type FC, type ReactElement, type ReactNode } from "react";

// Mantine's Text is polymorphic, which createElement's overloads cannot resolve; this is the
// same component typed as the plain paragraph it renders here.
const Caption = Text as unknown as FC<TextProps & { children?: ReactNode }>;

/** One labelled cell. */
export interface StateCell {
    /** The state's name, drawn above the cell. */
    state: string;
    /** The component in that state. */
    node: ReactNode;
}

/**
 * Draw the cells in a wrapping row.
 * @param props - the cells and an optional title
 * @param props.cells - the cells
 * @param props.title - a heading for the row
 * @returns the row
 */
export function StateGrid({ cells, title }: { cells: StateCell[]; title?: string }): ReactElement {
    const heading = title === undefined ? null : createElement(Caption, { size: "sm", fw: 550, children: title });
    const row = createElement(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" } },
        cells.map((cell) =>
            createElement(
                "div",
                { key: cell.state, "data-testid": `state-${cell.state}`, style: { display: "grid", gap: 4 } },
                createElement(Caption, { size: "xs", c: "dimmed", children: cell.state }),
                cell.node,
            ),
        ),
    );
    return createElement(Stack, { gap: 8, p: 16 }, heading, row);
}
