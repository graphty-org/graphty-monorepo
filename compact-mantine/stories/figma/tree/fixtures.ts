/**
 * Shared pieces for the tree package's stories: a 240px panel, a labelled state cell, a way to
 * force a hover or focus look on a component that does not forward `data-state`, and a small
 * layer tree. Written without JSX so the file lints under the stories' plain `.ts` rule.
 */
import React, { createElement as h, useLayoutEffect, useRef } from "react";

import { PANEL_GRID, UiGlyph } from "../../../src";
import type { TreeNodeData } from "../../../src/components/tree";

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

/**
 * Sets `data-state` on the first element matching `selector` inside it, for the stories' forced
 * hover and focus looks (pseudo classes cannot be forced).
 * @param props - Component props
 * @param props.state - The state to force
 * @param props.selector - Which descendant gets it
 * @param props.children - The component
 * @returns The wrapper
 */
export function ForceState({
    state,
    selector,
    children,
}: {
    state: "hover" | "focus";
    selector: string;
    children: React.ReactNode;
}): React.JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        ref.current?.querySelector(selector)?.setAttribute("data-state", state);
    });
    return h("div", { ref }, children);
}

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
 * Remove an item from a nested list and insert it elsewhere: what a caller does with onMove.
 * @param items - the tree
 * @param move - the move the tree reported
 * @param move.id - the item
 * @param move.parentId - the new parent, null for the top level
 * @param move.index - the index among the new parent's children, the item already removed
 * @returns the new tree
 */
export function applyMove(
    items: readonly TreeNodeData[],
    move: { id: string; parentId: string | null; index: number },
): TreeNodeData[] {
    let moved: TreeNodeData | undefined;
    const remove = (list: readonly TreeNodeData[]): TreeNodeData[] =>
        list
            .filter((n) => {
                if (n.id === move.id) {
                    moved = n;
                    return false;
                }
                return true;
            })
            .map((n) => (n.children ? { ...n, children: remove(n.children) } : n));
    const without = remove(items);
    if (!moved) {
        return [...items];
    }
    const item = moved;
    const insert = (list: TreeNodeData[]): TreeNodeData[] => {
        if (move.parentId === null) {
            const out = [...list];
            out.splice(move.index, 0, item);
            return out;
        }
        return list.map((n) => {
            if (n.id === move.parentId) {
                const children = [...(n.children ?? [])];
                children.splice(move.index, 0, item);
                return { ...n, children };
            }
            return n.children ? { ...n, children: insert([...n.children]) } : n;
        });
    };
    return insert(without);
}

/**
 * Rename one item in a nested list.
 * @param items - the tree
 * @param id - the item
 * @param name - its new name
 * @returns the new tree
 */
export function renameItem(items: readonly TreeNodeData[], id: string, name: string): TreeNodeData[] {
    return items.map((n) => {
        if (n.id === id) {
            return { ...n, name };
        }
        return n.children ? { ...n, children: renameItem(n.children, id, name) } : n;
    });
}
