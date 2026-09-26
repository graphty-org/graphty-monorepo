/**
 * The pure half of the layer tree: flattening the visible rows, working out which fill each row
 * draws, and turning a pointer position into a drop. Kept apart from the component so each rule
 * is testable without a DOM.
 */
import type React from "react";

/** One item of a Tree. Nest items through `children`. */
export interface TreeNodeData {
    /** Stable, unique across the whole tree. */
    id: string;
    /** The visible name; also the item's accessible name and its type-ahead key. */
    name: string;
    /** The 16 x 16 type glyph drawn before the name. */
    icon?: React.ReactNode;
    /**
     * The item's children. An item with a `children` array (even an empty one) is a container
     * that other items can be dropped into; one without is a leaf.
     */
    children?: readonly TreeNodeData[];
    /** `"component"` draws the name and glyph in the component (purple) colour. */
    tone?: "default" | "component";
    /** A hidden layer: the name and glyph draw in the tertiary colour. */
    dimmed?: boolean;
    /**
     * Draw the name at weight 600 with a primary-colour glyph. Defaults to true for a top-level
     * item with a `children` array, even an empty one (Figma's top-level frames), false otherwise.
     */
    strong?: boolean;
    /**
     * The row's trailing toggles (lock, eye): the caller's own controls. They stay hidden until
     * the row is hovered or focused; a control with `aria-pressed="true"`, `aria-checked="true"`
     * or `data-pinned` stays visible.
     */
    actions?: React.ReactNode;
}

/** One visible row. */
export interface FlatTreeRow {
    node: TreeNodeData;
    /** 1 for a top-level row. */
    level: number;
    parentId: string | null;
    /** 1-based position among its siblings. */
    posInSet: number;
    setSize: number;
    hasChildren: boolean;
    expanded: boolean;
}

/**
 * The rows a reader can see, in document order: every item whose ancestors are all expanded.
 * @param items - the top-level items
 * @param expanded - ids of expanded items
 * @returns the visible rows
 */
export function flattenTree(items: readonly TreeNodeData[], expanded: ReadonlySet<string>): FlatTreeRow[] {
    const out: FlatTreeRow[] = [];
    const walk = (nodes: readonly TreeNodeData[], level: number, parentId: string | null): void => {
        nodes.forEach((node, i) => {
            const hasChildren = (node.children?.length ?? 0) > 0;
            const isOpen = hasChildren && expanded.has(node.id);
            out.push({
                node,
                level,
                parentId,
                posInSet: i + 1,
                setSize: nodes.length,
                hasChildren,
                expanded: isOpen,
            });
            if (isOpen && node.children) {
                walk(node.children, level + 1, node.id);
            }
        });
    };
    walk(items, 1, null);
    return out;
}

/**
 * The fill a row draws (design/figma-spec.md 10.1):
 * - `selected`: a lone selected row;
 * - `first` / `middle` / `last`: a run of adjacent selected rows, drawn as one block;
 * - `parent`: a selected, expanded parent (its pill runs into the band below);
 * - `child` / `child-last`: the band behind a selected parent's visible descendants;
 * - `none`.
 */
export type TreeRowTint = "none" | "selected" | "first" | "middle" | "last" | "parent" | "child" | "child-last";

/**
 * Work out every row's fill.
 * @param rows - the visible rows
 * @param selected - the selected ids
 * @returns one tint per row
 */
export function rowTints(rows: readonly FlatTreeRow[], selected: ReadonlySet<string>): TreeRowTint[] {
    const tints: TreeRowTint[] = [];
    // The current row's ancestors; the outermost selected one owns the band.
    const stack: { level: number; selected: boolean }[] = [];
    rows.forEach((row, i) => {
        while (stack.length > 0 && stack[stack.length - 1].level >= row.level) {
            stack.pop();
        }
        const band = stack.find((a) => a.selected);
        const isSelected = selected.has(row.node.id);
        const next = rows[i + 1] as FlatTreeRow | undefined;
        if (isSelected) {
            if (row.expanded) {
                tints.push("parent");
            } else {
                const prev = rows[i - 1] as FlatTreeRow | undefined;
                const prevJoins = prev !== undefined && selected.has(prev.node.id) && tints[i - 1] !== "parent";
                const nextJoins = next !== undefined && selected.has(next.node.id) && !next.expanded;
                if (prevJoins && nextJoins) {
                    tints.push("middle");
                } else if (nextJoins) {
                    tints.push("first");
                } else if (prevJoins) {
                    tints.push("last");
                } else {
                    tints.push("selected");
                }
            }
        } else if (band) {
            tints.push(next === undefined || next.level <= band.level ? "child-last" : "child");
        } else {
            tints.push("none");
        }
        stack.push({ level: row.level, selected: isSelected });
    });
    return tints;
}

/** Where a drop lands. `index` counts the parent's children with the moved item already removed. */
export interface TreeMove {
    id: string;
    parentId: string | null;
    index: number;
}

/** A computed drop: the move, and what to draw. */
export interface TreeDrop {
    move: TreeMove;
    /** Row index to box (the container receiving the item), or null. */
    boxRow: number | null;
    /** Row boundary (0 = above the first row) and depth for the insertion line, or null. */
    line: { boundary: number; level: number } | null;
}

/**
 * Turn a pointer over a row into a drop: top quarter = before it, middle half = into it (a
 * container) or the nearer edge (a leaf), bottom quarter = its first child when it is expanded,
 * else after it. Returns null for a drop onto the dragged item, into its own subtree, or back
 * where it already is.
 * @param rows - the visible rows
 * @param dragId - the item being dragged
 * @param overIndex - the row under the pointer
 * @param fraction - the pointer's height within that row, 0..1
 * @returns the drop, or null
 */
export function computeDrop(
    rows: readonly FlatTreeRow[],
    dragId: string,
    overIndex: number,
    fraction: number,
): TreeDrop | null {
    const over = rows[overIndex] as FlatTreeRow | undefined;
    const dragged = rows.find((r) => r.node.id === dragId);
    if (!over || !dragged) {
        return null;
    }
    const isContainer = over.node.children !== undefined;
    let parentId: string | null;
    let index: number;
    let boxRow: number | null = null;
    let line: TreeDrop["line"] = null;
    const lastDescendant = (i: number): number => {
        let j = i;
        while (j + 1 < rows.length && rows[j + 1].level > rows[i].level) {
            j++;
        }
        return j;
    };

    let zone: "before" | "after" | "into" | "first";
    if (fraction < 0.25) {
        zone = "before";
    } else if (fraction > 0.75) {
        zone = over.expanded ? "first" : "after";
    } else if (isContainer) {
        zone = "into";
    } else {
        zone = fraction < 0.5 ? "before" : "after";
    }

    if (zone === "into") {
        parentId = over.node.id;
        index = 0;
        boxRow = overIndex;
    } else if (zone === "first") {
        parentId = over.node.id;
        index = 0;
        line = { boundary: overIndex + 1, level: over.level + 1 };
        boxRow = overIndex;
    } else {
        ({ parentId } = over);
        index = zone === "before" ? over.posInSet - 1 : over.posInSet;
        line = {
            boundary: zone === "before" ? overIndex : lastDescendant(overIndex) + 1,
            level: over.level,
        };
        const parentRow = parentId === null ? -1 : rows.findIndex((r) => r.node.id === parentId);
        boxRow = parentRow >= 0 ? parentRow : null;
    }

    // No drop into itself or its own subtree.
    const parentOf = new Map(rows.map((r) => [r.node.id, r.parentId]));
    for (let p: string | null = parentId; p !== null; p = parentOf.get(p) ?? null) {
        if (p === dragId) {
            return null;
        }
    }
    if (dragged.parentId === parentId && dragged.posInSet - 1 < index) {
        index -= 1;
    }
    if (dragged.parentId === parentId && dragged.posInSet - 1 === index) {
        return null;
    }
    return { move: { id: dragId, parentId, index }, boxRow, line };
}

/**
 * Where an item's glyph starts, px from the row's start, at a depth.
 * @param level - the depth, 1 for a top-level row
 * @returns the x offset in px
 */
export function iconOffset(level: number): number {
    return 16 + 24 * (level - 1);
}

/** Anything a tree can hold: an id, and optionally children of the same shape. */
interface TreeLike<T> {
    id: string;
    children?: readonly T[];
}

/**
 * Apply a move that `Tree`'s `onMove` reported: take the item out of the list and insert it at
 * `index` among `parentId`'s children (the top level when `parentId` is null). Works on your own
 * item type, so every other field comes through untouched. Returns a new list; an unknown id
 * returns a copy of the list unchanged.
 * @param items - the tree, top level first
 * @param move - the move `onMove` reported
 * @returns the moved tree
 * @example
 * ```tsx
 * <Tree items={items} label="Layers" onMove={(move) => setItems(moveTreeItem(items, move))} />
 * ```
 */
export function moveTreeItem<T extends TreeLike<T>>(items: readonly T[], move: TreeMove): T[] {
    let moved: T | undefined;
    const remove = (list: readonly T[]): T[] =>
        list.flatMap((n) => {
            if (n.id === move.id) {
                moved = n;
                return [];
            }
            return [n.children ? { ...n, children: remove(n.children) } : n];
        });
    const without = remove(items);
    const item = moved;
    if (item === undefined) {
        return [...items];
    }
    const into = (list: readonly T[] | undefined): T[] => {
        const out = [...(list ?? [])];
        out.splice(move.index, 0, item);
        return out;
    };
    const insert = (list: readonly T[]): T[] =>
        list.map((n) => {
            if (n.id === move.parentId) {
                return { ...n, children: into(n.children) };
            }
            return n.children ? { ...n, children: insert(n.children) } : n;
        });
    return move.parentId === null ? into(without) : insert(without);
}

/**
 * Apply a rename that `Tree`'s `onRename` reported. Returns a new list.
 * @param items - the tree, top level first
 * @param id - the renamed item
 * @param name - its new name
 * @returns the renamed tree
 */
export function renameTreeItem<T extends TreeLike<T> & { name: string }>(items: readonly T[], id: string, name: string): T[] {
    return items.map((n) => {
        if (n.id === id) {
            return { ...n, name };
        }
        return n.children ? { ...n, children: renameTreeItem(n.children, id, name) } : n;
    });
}
