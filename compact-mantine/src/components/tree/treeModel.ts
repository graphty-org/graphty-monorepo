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
    /** The visible name; also the item's type-ahead key, and its accessible name unless `label` is given. */
    name: string;
    /**
     * The accessible name, when the visible name alone is not enough: "value, edge attribute"
     * where two rows read "value". Start it with the visible name. Defaults to `name`.
     */
    label?: string;
    /** The 16 x 16 type glyph drawn before the name. */
    icon?: React.ReactNode;
    /**
     * The item's children. An item with a `children` array (even an empty one) is a container
     * that other items can be dropped into; one without is a leaf.
     */
    children?: readonly TreeNodeData[];
    /** `"component"` draws the name and glyph in the component (purple) color. */
    tone?: "default" | "component";
    /** A hidden layer: the name and glyph draw in the tertiary color. */
    dimmed?: boolean;
    /**
     * Draw the name at weight 600 with a primary-color glyph. Defaults to true for a top-level
     * item with a `children` array, even an empty one (Figma's top-level frames), false otherwise.
     */
    strong?: boolean;
    /**
     * The row's trailing toggles (lock, eye): the caller's own controls. They stay hidden until
     * the row is hovered or focused; a control with `aria-pressed="true"`, `aria-checked="true"`
     * or `data-pinned` stays visible. A click on passive text here (nothing focusable) counts as a
     * click on the row.
     */
    actions?: React.ReactNode;
    /**
     * A small swatch drawn between the glyph and the name: a color, a ramp. It is decoration;
     * say what it means in `description` if the reader needs to hear it.
     */
    swatch?: React.ReactNode;
    /**
     * A count drawn before the toggles in the secondary ink, always visible (the toggles hide
     * until hover). It joins the row's accessible description, so it is heard as well as seen.
     * Pass a row's quiet text here (a count, a fill, a filter's outcome): it stays whole until
     * it would take more than half the row, and while the name or the count is cut short, the
     * name's tooltip shows both.
     */
    count?: React.ReactNode;
    /**
     * A progress line along the bottom of the row, for an item whose work is running: a
     * fraction from 0 to 1, or `"indeterminate"` when the end is not known. Omit it once the
     * work is done. The line is a `progressbar` named by the row's name.
     */
    progress?: number | "indeterminate";
    /**
     * The row's state in words -- "Running", "Failed: the graph has no edges" -- read by a
     * screen reader after the name (the row's `aria-describedby`) and never drawn. A row's
     * accessible name is only its `name` (or `label`), so anything a glyph or a tooltip says belongs here
     * too.
     */
    description?: string;
    /**
     * Draw `description` as a second line under the name, in the secondary ink, instead of only
     * reading it; the row grows from 32 to 44. For a state the reader must see beside a long
     * name (a filter step's "77 to 26 nodes", "off") where a count would cut the name. Default
     * false.
     */
    descriptionVisible?: boolean;
    /**
     * Whether the item can be picked up and moved (a drag, Alt+ArrowUp / Alt+ArrowDown).
     * Default true. Where an item may land is `Tree`'s `canDrop`.
     */
    movable?: boolean;
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
 * @param childBand - false draws a selected parent like any selected row and never bands its
 *   descendants (for trees where selecting a parent does not select its children)
 * @returns one tint per row
 */
export function rowTints(rows: readonly FlatTreeRow[], selected: ReadonlySet<string>, childBand = true): TreeRowTint[] {
    const tints: TreeRowTint[] = [];
    // The current row's ancestors; the outermost selected one owns the band.
    const stack: { level: number; selected: boolean }[] = [];
    rows.forEach((row, i) => {
        while (stack.length > 0 && stack[stack.length - 1].level >= row.level) {
            stack.pop();
        }
        const band = childBand ? stack.find((a) => a.selected) : undefined;
        const isSelected = selected.has(row.node.id);
        const next = rows[i + 1] as FlatTreeRow | undefined;
        if (isSelected) {
            if (childBand && row.expanded) {
                tints.push("parent");
            } else {
                const prev = rows[i - 1] as FlatTreeRow | undefined;
                const prevJoins = prev !== undefined && selected.has(prev.node.id) && tints[i - 1] !== "parent";
                const nextJoins = next !== undefined && selected.has(next.node.id) && !(childBand && next.expanded);
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
 * where it already is, and for a move `canDrop` refuses.
 * @param rows - the visible rows
 * @param dragId - the item being dragged
 * @param overIndex - the row under the pointer
 * @param fraction - the pointer's height within that row, 0..1
 * @param canDrop - the caller's rule for where an item may land; a refused move is no drop
 * @returns the drop, or null
 */
export function computeDrop(
    rows: readonly FlatTreeRow[],
    dragId: string,
    overIndex: number,
    fraction: number,
    canDrop?: (move: TreeMove) => boolean,
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
    const move = { id: dragId, parentId, index };
    if (canDrop && !canDrop(move)) {
        return null;
    }
    return { move, boxRow, line };
}

/** Where an item sits in the whole tree, collapsed or not. */
interface Located {
    node: TreeNodeData;
    parentId: string | null;
    siblings: readonly TreeNodeData[];
    index: number;
}

/**
 * Find an item anywhere in the tree, including inside collapsed folders.
 * @param items - the top-level items
 * @param id - the item to find
 * @returns the item, its parent's id, its siblings and its index among them, or undefined
 */
export function locateTreeItem(items: readonly TreeNodeData[], id: string): Located | undefined {
    const walk = (nodes: readonly TreeNodeData[], parentId: string | null): Located | undefined => {
        for (let index = 0; index < nodes.length; index++) {
            const node = nodes[index];
            if (node.id === id) {
                return { node, parentId, siblings: nodes, index };
            }
            const found = node.children && walk(node.children, node.id);
            if (found) {
                return found;
            }
        }
        return undefined;
    };
    return walk(items, null);
}

/**
 * Whether a move is a real change the tree allows: the item exists, is movable, lands in a
 * container (or the top level) that is not itself or inside it, at a valid index, somewhere it
 * is not already, and `canDrop` agrees.
 * @param items - the top-level items
 * @param move - the move to check
 * @param canDrop - the caller's rule for where an item may land
 * @returns true when the move may be reported
 */
export function isValidMove(
    items: readonly TreeNodeData[],
    move: TreeMove,
    canDrop?: (move: TreeMove) => boolean,
): boolean {
    const at = locateTreeItem(items, move.id);
    if (!at || at.node.movable === false) {
        return false;
    }
    let siblings: readonly TreeNodeData[] = items;
    if (move.parentId !== null) {
        const parent = locateTreeItem(items, move.parentId);
        if (!parent?.node.children) {
            return false;
        }
        siblings = parent.node.children;
        // Never into itself or its own subtree.
        for (let p: string | null = move.parentId; p !== null; p = locateTreeItem(items, p)?.parentId ?? null) {
            if (p === move.id) {
                return false;
            }
        }
    }
    const count = siblings.filter((n) => n.id !== move.id).length;
    if (move.index < 0 || move.index > count) {
        return false;
    }
    if (at.parentId === move.parentId && at.index === move.index) {
        return false;
    }
    return canDrop?.(move) ?? true;
}

/**
 * The move Alt+ArrowUp, Alt+ArrowDown or Alt+ArrowLeft makes: up or down past the neighboring
 * sibling, or into it when it is a folder (an item with a `children` array) -- as its last child
 * going up, its first going down; out to just after its folder. A move the tree refuses is
 * skipped: a refused move into a folder falls back to stepping past it.
 * @param items - the top-level items
 * @param id - the item to move
 * @param direction - which key: up, down, or out of its folder
 * @param canDrop - the caller's rule for where an item may land
 * @returns the move, or null when there is none
 */
export function keyboardMove(
    items: readonly TreeNodeData[],
    id: string,
    direction: "up" | "down" | "out",
    canDrop?: (move: TreeMove) => boolean,
): TreeMove | null {
    const at = locateTreeItem(items, id);
    if (!at) {
        return null;
    }
    const candidates: TreeMove[] = [];
    if (direction === "out") {
        const parent = at.parentId === null ? undefined : locateTreeItem(items, at.parentId);
        if (parent) {
            candidates.push({ id, parentId: parent.parentId, index: parent.index + 1 });
        }
    } else {
        const step = direction === "up" ? -1 : 1;
        const next = at.siblings[at.index + step] as TreeNodeData | undefined;
        if (next?.children) {
            candidates.push({ id, parentId: next.id, index: step < 0 ? next.children.length : 0 });
        }
        if (next) {
            candidates.push({ id, parentId: at.parentId, index: at.index + step });
        }
    }
    return candidates.find((move) => isValidMove(items, move, canDrop)) ?? null;
}

/**
 * Where a move puts an item, for announcing it: its folder's name (null at the top level), its
 * 1-based position there and how many items the folder then holds. Read before the move is
 * applied.
 * @param items - the top-level items, before the move
 * @param move - the move
 * @returns the item's name and its new place
 */
export function movePlace(
    items: readonly TreeNodeData[],
    move: TreeMove,
): { name: string; parent: string | null; position: number; count: number } {
    const moved = locateTreeItem(items, move.id);
    const parent = move.parentId === null ? undefined : locateTreeItem(items, move.parentId)?.node;
    const siblings = parent ? (parent.children ?? []) : items;
    return {
        name: moved?.node.name ?? move.id,
        parent: parent?.name ?? null,
        position: move.index + 1,
        count: siblings.filter((n) => n.id !== move.id).length + 1,
    };
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
export function renameTreeItem<T extends TreeLike<T> & { name: string }>(
    items: readonly T[],
    id: string,
    name: string,
): T[] {
    return items.map((n) => {
        if (n.id === id) {
            return { ...n, name };
        }
        return n.children ? { ...n, children: renameTreeItem(n.children, id, name) } : n;
    });
}
