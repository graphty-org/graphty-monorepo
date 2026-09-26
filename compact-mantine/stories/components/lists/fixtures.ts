/**
 * Shared pieces for the Lists and trees stories: a 240px panel, a small layer tree and a flat
 * list of style layers. Written without JSX so the file lints under the stories' plain `.ts`
 * rule.
 */
import React, { createElement as h } from "react";

import { PANEL_GRID, type TreeNodeData, UiGlyph } from "../../../src";

/**
 * A 240px panel on the panel ground, like Figma's sidebars.
 * @param props - Component props
 * @param props.children - The panel content
 * @param props.label - A caption above the panel
 * @returns The panel
 */
export function Panel({ children, label }: { children: React.ReactNode; label?: string }): React.JSX.Element {
    return h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 4 } },
        label === undefined ? null : h("div", { style: { fontSize: 11, color: "var(--cm-text-secondary)" } }, label),
        h(
            "div",
            { style: { width: PANEL_GRID.WIDTH, background: "var(--cm-bg)", outline: "1px solid var(--cm-border)" } },
            children,
        ),
    );
}

Panel.displayName = "Panel";

/** A small document: two frames, a component, a nested frame, a text and some shapes. */
export const LAYERS: TreeNodeData[] = [
    {
        id: "frame",
        name: "Checkout",
        icon: h(UiGlyph, { name: "frame", size: 16 }),
        children: [
            { id: "button", name: "Button", tone: "component", icon: h(UiGlyph, { name: "component", size: 16 }) },
            {
                id: "card",
                name: "Card",
                icon: h(UiGlyph, { name: "frame", size: 16 }),
                children: [
                    { id: "title", name: "Title", icon: h(UiGlyph, { name: "text", size: 16 }) },
                    { id: "price", name: "Price", icon: h(UiGlyph, { name: "text", size: 16 }) },
                ],
            },
            { id: "bg", name: "Background", icon: h(UiGlyph, { name: "rectangle", size: 10 }) },
        ],
    },
    {
        id: "frame2",
        name: "Receipt",
        icon: h(UiGlyph, { name: "frame", size: 16 }),
        children: [{ id: "logo", name: "Logo", icon: h(UiGlyph, { name: "ellipse", size: 12 }) }],
    },
    { id: "note", name: "Sticky note", icon: h(UiGlyph, { name: "rectangle", size: 10 }) },
];

/**
 * A flat list of style layers, topmost first: the shape of the graphty app's style layer list.
 * No item has `children`, so a drop can only reorder, never nest.
 */
export const STYLE_LAYERS: TreeNodeData[] = [
    { id: "selection", name: "Selection highlight" },
    { id: "degree", name: "Degree colour" },
    { id: "labels", name: "Node labels" },
    { id: "base", name: "Base style" },
];
