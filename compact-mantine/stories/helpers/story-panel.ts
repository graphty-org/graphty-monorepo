/**
 * Layout helpers for the chrome package's States stories. Plain `createElement` rather than JSX
 * so the file lints under the stories' `.ts` rule set.
 */
import { createElement, type ReactNode } from "react";

import { PANEL_GRID } from "../../src/constants/panel";

/**
 * A 240px panel painted with the panel ground, the way the app lays rows out. `padded` gives
 * rows the 16 | 8 inline padding a section's content gives them; a section draws its own.
 * @param props - Component props
 * @param props.children - The rows or sections
 * @param props.padded - Pad the content band like a section's rows
 * @returns The panel
 */
export function StoryPanel({ children, padded = false }: { children: ReactNode; padded?: boolean }): ReactNode {
    return createElement(
        "div",
        {
            style: {
                width: PANEL_GRID.WIDTH,
                boxSizing: "border-box",
                background: "var(--cm-bg)",
                color: "var(--cm-text)",
                paddingInlineStart: padded ? PANEL_GRID.PAD_LEFT : 0,
                paddingInlineEnd: padded ? PANEL_GRID.PAD_RIGHT : 0,
            },
        },
        children,
    );
}

/**
 * One state of a States story: a caption, then the component in that state. `force` sets the
 * `data-cm-force` hook (src/theme/css/chrome.css.ts) that draws a pointer or focus state, since
 * a story cannot hold a real `:hover` or `:focus-visible`.
 * @param props - Component props
 * @param props.name - The state's name
 * @param props.force - The state to force on the subtree
 * @param props.padded - Pad the content band like a section's rows
 * @param props.children - The component in that state
 * @returns The labeled state
 */
export function StoryState({
    name,
    force,
    padded,
    children,
}: {
    name: string;
    force?: "hover" | "focus";
    padded?: boolean;
    children: ReactNode;
}): ReactNode {
    return createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 4 } },
        createElement(
            "div",
            { style: { font: "500 9px/14px var(--cm-font-family)", color: "var(--cm-text-secondary)" } },
            name,
        ),
        createElement("div", { "data-cm-force": force }, createElement(StoryPanel, { padded, children })),
    );
}

/**
 * Lays States side by side, wrapping.
 * @param props - Component props
 * @param props.children - The StoryState entries
 * @returns The grid
 */
export function StoryStates({ children }: { children: ReactNode }): ReactNode {
    return createElement(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" } },
        children,
    );
}
