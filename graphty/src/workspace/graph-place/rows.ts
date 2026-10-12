/**
 * The style tree's rows as the Graph place reads them, from graphty-element's `styles.tree()`.
 * The element owns the order, the pins, the locks and the eyes; nothing here orders layers or
 * counts over the graph. The helpers only find a row, read the state its folders pass down, and
 * turn the tree control's top-first move into the element's bottom-first place.
 */

import {
    type GraphSession,
    RESULT_SHAPE_CONTRACTS,
    type Run,
    type StyleRow,
    type StyleRowPlace,
} from "@graphty/graphty-element/session";

/**
 * A run's kind, the one the inspector's header reads: a grouping, or a run whose primary field is
 * not one value per element (a path, a set), is a run row; one value per element is a measure row.
 * @param run - the run.
 * @returns the kind.
 */
export function runRowKind(run: Run): "measure-row" | "run-row" {
    if (run.record.summary?.groups !== undefined) {
        return "run-row";
    }
    return RESULT_SHAPE_CONTRACTS[run.shape].primaryField === "value" ? "measure-row" : "run-row";
}

/** A row found in the tree, with the folders holding it, outermost first. */
export interface FoundRow {
    readonly row: StyleRow;
    readonly folders: readonly StyleRow[];
}

/**
 * Finds a row anywhere in the tree.
 * @param rows - the rows (either order).
 * @param id - the row's id.
 * @param folders - the folders holding `rows`, outermost first.
 * @returns the row and the folders holding it, or undefined.
 */
export function findTreeRow(
    rows: readonly StyleRow[],
    id: string,
    folders: readonly StyleRow[] = [],
): FoundRow | undefined {
    for (const row of rows) {
        if (row.id === id) {
            return { row, folders };
        }
        const inner = findTreeRow(row.children, id, [...folders, row]);
        if (inner !== undefined) {
            return inner;
        }
    }
    return undefined;
}

/**
 * Whether a row paints nothing because it, or a folder holding it, is hidden.
 * @param found - the row.
 * @returns true when hidden.
 */
export function isHidden(found: FoundRow): boolean {
    return found.row.hidden || found.folders.some((folder) => folder.hidden);
}

/**
 * Whether a row refuses edits because it, or a folder holding it, is locked.
 * @param found - the row.
 * @returns true when locked.
 */
export function isLocked(found: FoundRow): boolean {
    return found.row.locked || found.folders.some((folder) => folder.locked);
}

/**
 * How many layer rows a folder holds, at any depth.
 * @param row - the folder.
 * @returns the count.
 */
export function layerCount(row: StyleRow): number {
    return row.children.reduce((sum, child) => sum + (child.kind === "layer" ? 1 : layerCount(child)), 0);
}

/** A move as the tree control reports it: `index` counts the new parent's rows top first, without the row. */
export interface TopFirstMove {
    readonly id: string;
    readonly parentId: string | null;
    readonly index: number;
}

/**
 * Where a move the tree control reports lands in the element's terms (bottom first), or
 * undefined for a move it would refuse or clamp: into a layer, or out of the row's pin band. An
 * unpinned row may not land among rows pinned to the top or the bottom, and a pinned row stays in
 * its own band, so a drop is either exactly where the element puts it or no drop at all.
 * @param tree - the element's tree, bottom first.
 * @param move - the move, top first.
 * @returns the place, or undefined.
 */
export function placeOf(tree: readonly StyleRow[], move: TopFirstMove): StyleRowPlace | undefined {
    const moving = findTreeRow(tree, move.id);
    const parent = move.parentId === null ? undefined : findTreeRow(tree, move.parentId);
    if (moving === undefined || (move.parentId !== null && parent?.row.kind !== "folder")) {
        return undefined;
    }
    const others = (parent?.row.children ?? tree).filter((row) => row.id !== move.id);
    const index = others.length - move.index;
    const bottom = others.filter((row) => row.pin === "bottom").length;
    const top = others.filter((row) => row.pin === "top").length;
    const { pin } = moving.row;
    let fits: boolean;
    if (pin === "bottom") {
        fits = index <= bottom;
    } else if (pin === "top") {
        fits = index >= others.length - top;
    } else {
        fits = index >= bottom && index <= others.length - top;
    }
    return fits && index >= 0 && index <= others.length ? { parent: move.parentId, index } : undefined;
}

/**
 * The layers a layer row paints with: both parts of a row on nodes and edges, else its one layer.
 * @param session - the element's session.
 * @param id - the row's id.
 * @returns the layer ids, or empty when the stack holds no such row.
 */
export function rowLayers(session: GraphSession, id: string): string[] {
    const parts = session.styles.parts(id);
    if (parts === undefined) {
        return [];
    }
    return [parts.node, parts.edge].filter((layer): layer is string => layer !== undefined);
}

/**
 * A count with its noun, "1 node" or "77 nodes".
 * @param n - the count.
 * @param noun - the singular noun.
 * @returns the words.
 */
export function count(n: number, noun: string): string {
    return `${n.toLocaleString()} ${noun}${n === 1 ? "" : "s"}`;
}

/**
 * The words heading the panel of several rows: "2 layers", or "3 rows" when a folder is among
 * them.
 * @param session - the element's session.
 * @param ids - the rows' ids.
 * @returns the words.
 */
export function rowsHeading(session: GraphSession, ids: readonly string[]): string {
    const tree = session.styles.tree();
    const folders = ids.some((id) => findTreeRow(tree, id)?.row.kind === "folder");
    return count(ids.length, folders ? "row" : "layer");
}

/**
 * The name the inspector heads a tree row with, or "Gone".
 * @param session - the element's session.
 * @param id - the row's id.
 * @returns the name.
 */
export function rowName(session: GraphSession, id: string): string {
    return findTreeRow(session.styles.tree(), id)?.row.name ?? "Gone";
}
