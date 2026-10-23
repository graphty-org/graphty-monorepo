/**
 * @file The style tree: the layers of the stack as rows, with folders, pins, a reader's lock and
 * an eye.
 *
 * THE TREE ORDER IS THE PAINT ORDER. Flattening the tree, bottom first, gives the consumer's layers
 * in exactly the order the stack paints them, so a folder moved below a layer takes every layer in
 * it below that layer. The element's own layers (the base and the selection layer) are not rows:
 * they are the floor, and they keep their places in the stack.
 *
 * A PIN IS A BAND. Within one list of siblings, rows pinned to the bottom come first, then the
 * unpinned rows, then the rows pinned to the top, each band keeping its own order. Every edit ends
 * by restoring that, so a layer added later lands above a row pinned to the bottom and below a row
 * pinned to the top, and a pinned row moved out of its band goes back into it.
 *
 * A FOLDER'S EYE AND LOCK REACH ITS ROWS. A row paints only when neither it nor any folder holding
 * it is hidden, and a layer refuses an edit when it or any folder holding it is locked. The reader's
 * lock is not {@link Layer.locked}, which says the element owns a layer.
 *
 * WHERE IT LIVES. The rows travel with the `styles` slice of project state, as a property of the
 * frozen stack array, so every undo, redo and rollback that puts a stack back puts its rows back
 * with it. A stack carrying no rows reads as one row per consumer layer, in stack order, with
 * nothing pinned, locked or hidden -- which is every stack written before the tree existed.
 *
 * A LAYER ROW IS ONE ROW OF THE STACK. A row that paints nodes and edges is two layers carrying
 * the same `row` id (`styles.addRow`); the tree holds one row for the pair, keyed by that id, and
 * the pair moves, hides and locks as one.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { LayerId, StyleDocumentRow } from "../../catalog/types";
import type { CompiledLayer } from "./Layer";

/** A row's id: its layer's id for a layer row, an element-minted `folder:` id for a folder. */
export type StyleRowId = string; // NOSONAR(S6564): public API name in api/session.api.md, removing it is breaking

/** Where a row is pinned among its siblings. */
export type StyleRowPin = "top" | "bottom" | "none";

/** One row of {@link StylesApi.tree}. Data: change it through the styles verbs. */
export interface StyleRow {
    /** The layer's id for a layer row; a folder's own id for a folder. */
    readonly id: StyleRowId;
    /** What the row is. */
    readonly kind: "layer" | "folder";
    /** The layer's name, or the folder's. */
    readonly name: string;
    /** Where the row is pinned among its siblings. */
    readonly pin: StyleRowPin;
    /** The reader's lock on this row itself; a folder's lock also reaches every row in it. */
    readonly locked: boolean;
    /** Whether this row itself is hidden; a folder's eye also reaches every row in it. */
    readonly hidden: boolean;
    /** A folder's rows, BOTTOM FIRST; empty for a layer row. */
    readonly children: readonly StyleRow[];
}

/** Where a row goes: a folder (or the top level) and a place among its rows. */
export interface StyleRowPlace {
    /** The folder to put it in; null or absent for the top level. */
    readonly parent?: StyleRowId | null;
    /**
     * Its index among that folder's rows, BOTTOM FIRST, counted without the row itself. Absent
     * means the top of the unpinned rows. Clamped into range, and then into the row's pin band.
     */
    readonly index?: number;
}

/** One row as the stack holds it. A layer row is named by its layer, so it holds no name. */
export interface RowNode {
    readonly id: StyleRowId;
    readonly kind: "layer" | "folder";
    /** A folder's name. */
    readonly name?: string;
    readonly pin: StyleRowPin;
    readonly locked: boolean;
    readonly hidden: boolean;
    /** A folder's rows, bottom first. */
    readonly children?: readonly RowNode[];
}

/** The rows of a stack, bottom first. */
export type Rows = readonly RowNode[];

/** The property of the frozen stack array that carries its rows. */
const STYLE_ROWS: unique symbol = Symbol("graphty.styleRows");

/** A stack as the `styles` slice holds it. */
type RowedStack = readonly CompiledLayer[] & { readonly [STYLE_ROWS]?: Rows };

/**
 * The key a layer's tree row is known by: its row's id when it is one part of a two-kind row.
 * @param entry - A layer in the stack.
 * @returns The key.
 */
export function rowKeyOf(entry: CompiledLayer): LayerId {
    return entry.layer.row ?? entry.layer.id;
}

/**
 * The tree keys of a stack's consumer layers, once each, bottom first.
 * @param stack - The stack.
 * @returns The keys.
 */
function liveKeys(stack: readonly CompiledLayer[]): LayerId[] {
    return [...new Set(stack.filter((entry) => !entry.layer.locked).map(rowKeyOf))];
}

/** The rows a stack without any reads as, kept per stack so the same array comes back. */
const flatRows = new WeakMap<readonly CompiledLayer[], Rows>();

/**
 * A layer row with nothing pinned, locked or hidden.
 * @param id - The layer.
 * @returns The row.
 */
export function layerRow(id: LayerId): RowNode {
    return Object.freeze({ id, kind: "layer", pin: "none", locked: false, hidden: false });
}

/**
 * The rows a stack carries, when it carries any: only a tree with a folder, a pin, a lock or a
 * hidden row is carried.
 * @param stack - The stack.
 * @returns Its rows, or undefined.
 */
export function ownRows(stack: readonly CompiledLayer[]): Rows | undefined {
    return (stack as RowedStack)[STYLE_ROWS];
}

/**
 * The rows of a stack.
 * @param stack - The stack, as the `styles` slice holds it.
 * @returns Its rows, bottom first.
 */
export function rowsOf(stack: readonly CompiledLayer[]): Rows {
    const own = (stack as RowedStack)[STYLE_ROWS];
    if (own !== undefined) {
        return own;
    }

    let flat = flatRows.get(stack);
    if (flat === undefined) {
        flat = Object.freeze(liveKeys(stack).map(layerRow));
        flatRows.set(stack, flat);
    }

    return flat;
}

/**
 * Whether rows say nothing a plain stack does not: no folder, and nothing pinned, locked or hidden.
 * @param rows - The rows.
 * @returns True when they are plain.
 */
function plain(rows: Rows): boolean {
    return rows.every((row) => row.kind === "layer" && row.pin === "none" && !row.locked && !row.hidden);
}

/**
 * Every layer id under some rows, bottom first, which is paint order.
 * @param rows - The rows.
 * @returns The layer ids.
 */
export function layerIdsOf(rows: Rows): LayerId[] {
    return rows.flatMap((row) => (row.kind === "layer" ? [row.id] : layerIdsOf(row.children ?? [])));
}

/**
 * The stack the rows say: the element's layers keep their places, and the consumer's layers fill
 * the other places in the rows' order. The rows ride along on the array.
 * @param stack - The stack whose layers are arranged.
 * @param rows - The rows; every consumer layer of the stack appears in them once.
 * @returns The stack, frozen.
 */
export function arrange(stack: readonly CompiledLayer[], rows: Rows): readonly CompiledLayer[] {
    const parts = new Map<LayerId, CompiledLayer[]>();
    for (const entry of stack) {
        if (!entry.layer.locked) {
            const key = rowKeyOf(entry);
            parts.set(key, [...(parts.get(key) ?? []), entry]);
        }
    }

    const order = layerIdsOf(rows).flatMap((key) => parts.get(key) ?? []);
    let next = 0;
    const arranged = stack.map((entry) => (entry.layer.locked ? entry : (order[next++] ?? entry)));

    if (!plain(rows)) {
        Object.defineProperty(arranged, STYLE_ROWS, { value: rows, enumerable: false });
    }

    return Object.freeze(arranged);
}

/**
 * Put each list of siblings into its pin bands: bottom, unpinned, top, each in its own order.
 * @param rows - The rows.
 * @returns The rows, the same array when nothing moved.
 */
export function normalize(rows: Rows): Rows {
    let changed = false;
    const inner = rows.map((row) => {
        if (row.children === undefined) {
            return row;
        }

        const children = normalize(row.children);
        if (children === row.children) {
            return row;
        }

        changed = true;
        return Object.freeze({ ...row, children });
    });
    const band = (pin: StyleRowPin): RowNode[] => inner.filter((row) => row.pin === pin);
    const sorted = [...band("bottom"), ...band("none"), ...band("top")];

    if (!changed && sorted.every((row, at) => row === rows[at])) {
        return rows;
    }

    return Object.freeze(sorted);
}

/** Where a row sits: the row, the folders holding it (outermost first), and its siblings' index. */
interface Found {
    readonly row: RowNode;
    readonly ancestors: readonly RowNode[];
    readonly index: number;
}

/**
 * Find a row.
 * @param rows - The rows.
 * @param id - The row's id.
 * @param ancestors - The folders holding `rows`, outermost first.
 * @returns Where it sits, or undefined.
 */
export function findRow(rows: Rows, id: StyleRowId, ancestors: readonly RowNode[] = []): Found | undefined {
    for (const [index, row] of rows.entries()) {
        if (row.id === id) {
            return { row, ancestors, index };
        }

        if (row.children !== undefined) {
            const found = findRow(row.children, id, [...ancestors, row]);
            if (found !== undefined) {
                return found;
            }
        }
    }

    return undefined;
}

/**
 * Whether a layer is locked by the reader, on its own row or on a folder holding it.
 * @param rows - The rows.
 * @param id - The layer.
 * @returns True when it is.
 */
export function lockedByReader(rows: Rows, id: LayerId): boolean {
    const found = findRow(rows, id);
    return found !== undefined && [...found.ancestors, found.row].some((row) => row.locked);
}

/**
 * The layers that paint nothing because their row, or a folder holding it, is hidden.
 * @param rows - The rows.
 * @param hidden - Whether a folder holding `rows` is hidden.
 * @param into - Where to collect them.
 * @returns The layer ids.
 */
function hiddenLayers(rows: Rows, hidden = false, into = new Set<LayerId>()): Set<LayerId> {
    for (const row of rows) {
        const off = hidden || row.hidden;
        if (row.children !== undefined) {
            hiddenLayers(row.children, off, into);
        } else if (off) {
            into.add(row.id);
        }
    }

    return into;
}

/**
 * The layers a hidden row, or a hidden folder above one, keeps from painting.
 * @param stack - The stack.
 * @returns The row keys ({@link rowKeyOf}) of the hidden layers.
 */
export function hiddenRowKeys(stack: readonly CompiledLayer[]): ReadonlySet<LayerId> {
    return hiddenLayers(rowsOf(stack));
}

/** The stack as it paints, per stack, so the same array comes back until the stack changes. */
const paintedStacks = new WeakMap<readonly CompiledLayer[], readonly CompiledLayer[]>();
/** A hidden layer's disabled stand-in, per layer, so a repaint sees it as unchanged. */
const standIns = new WeakMap<CompiledLayer, CompiledLayer>();

/**
 * The stack as it paints: a layer whose row is hidden reads as disabled, keeping its place.
 *
 * What the repaint, the legend and an explanation read, while `styles.list()` keeps answering with
 * the layers as their authors wrote them, each marked `hidden` while its row is.
 * @param stack - The stack.
 * @returns The stack itself when nothing is hidden.
 */
export function paintedStack(stack: readonly CompiledLayer[]): readonly CompiledLayer[] {
    const hidden = hiddenRowKeys(stack);
    if (hidden.size === 0) {
        return stack;
    }

    let painted = paintedStacks.get(stack);
    if (painted === undefined) {
        painted = Object.freeze(
            stack.map((entry) => {
                if (!hidden.has(rowKeyOf(entry)) || !entry.layer.enabled) {
                    return entry;
                }

                let standIn = standIns.get(entry);
                if (standIn === undefined) {
                    standIn = Object.freeze({ ...entry, layer: Object.freeze({ ...entry.layer, enabled: false }) });
                    standIns.set(entry, standIn);
                }

                return standIn;
            }),
        );
        paintedStacks.set(stack, painted);
    }

    return painted;
}

/**
 * Change one row.
 * @param rows - The rows.
 * @param id - The row.
 * @param change - What to make of it.
 * @returns The rows with it changed.
 */
export function mapRow(rows: Rows, id: StyleRowId, change: (row: RowNode) => RowNode): Rows {
    return Object.freeze(
        rows.map((row) => {
            if (row.id === id) {
                return Object.freeze(change(row));
            }

            return row.children === undefined
                ? row
                : Object.freeze({ ...row, children: mapRow(row.children, id, change) });
        }),
    );
}

/**
 * Take the rows a test accepts out, wherever they sit.
 * @param rows - The rows.
 * @param drop - Which rows to take out (a folder taken out takes its rows with it).
 * @returns The rows without them.
 */
export function pruneRows(rows: Rows, drop: (row: RowNode) => boolean): Rows {
    return Object.freeze(
        rows
            .filter((row) => !drop(row))
            .map((row) =>
                row.children === undefined ? row : Object.freeze({ ...row, children: pruneRows(row.children, drop) }),
            ),
    );
}

/**
 * Put a row into a folder, or the top level.
 * @param rows - The rows.
 * @param parent - The folder, or null for the top level.
 * @param index - Its index among that folder's rows, bottom first; clamped into range.
 * @param row - The row.
 * @returns The rows with it in place.
 */
export function insertRow(rows: Rows, parent: StyleRowId | null, index: number, row: RowNode): Rows {
    if (parent === null) {
        const at = Math.max(0, Math.min(index, rows.length));
        return Object.freeze([...rows.slice(0, at), row, ...rows.slice(at)]);
    }

    return mapRow(rows, parent, (folder) => ({
        ...folder,
        children: insertRow(folder.children ?? [], null, index, row),
    }));
}

/**
 * Bring rows in line with a stack another verb planned: drop the rows of layers that are gone,
 * and place each layer that has no row next to its neighbors in the stack.
 *
 * A new layer goes into the deepest folder holding both the layer beneath it and the layer above
 * it in the stack, just above the row holding the layer beneath it. So a layer added inside a
 * folder's run stays in that folder, and one added at the top of the stack lands at the top level.
 * @param rows - The rows before the edit.
 * @param planned - The stack the edit planned.
 * @param moved - A layer the edit moved, which is placed again like a new one.
 * @returns The rows, banded by pin; the same array when nothing changed.
 */
export function reconcile(rows: Rows, planned: readonly CompiledLayer[], moved?: LayerId): Rows {
    const live = liveKeys(planned);
    const alive = new Set(live);
    const had = new Set(layerIdsOf(rows));

    if (moved === undefined && live.every((id) => had.has(id)) && had.size === alive.size) {
        return rows;
    }

    let next = pruneRows(rows, (row) => row.kind === "layer" && (!alive.has(row.id) || row.id === moved));
    const placed = new Set(layerIdsOf(next));

    for (const [at, id] of live.entries()) {
        if (placed.has(id)) {
            continue;
        }

        const below = live
            .slice(0, at)
            .reverse()
            .find((each) => placed.has(each));
        const above = live.slice(at + 1).find((each) => placed.has(each));
        next = placeBetween(next, id, below, above);
        placed.add(id);
    }

    return normalize(next);
}

/**
 * Place a new layer row just above the row holding `below`, in the deepest folder holding both
 * neighbors.
 * @param rows - The rows.
 * @param id - The new layer.
 * @param below - The nearest placed layer beneath it in the stack, if any.
 * @param above - The nearest placed layer above it in the stack, if any.
 * @returns The rows with it placed.
 */
function placeBetween(rows: Rows, id: LayerId, below: LayerId | undefined, above: LayerId | undefined): Rows {
    if (below === undefined) {
        return insertRow(rows, null, 0, layerRow(id));
    }

    const low = findRow(rows, below);
    const high = above === undefined ? undefined : findRow(rows, above);
    const lowPath = [...(low?.ancestors ?? []), ...(low === undefined ? [] : [low.row])];
    const highPath = high === undefined ? [] : [...high.ancestors, high.row];
    let depth = 0;
    while (depth < lowPath.length - 1 && lowPath[depth] === highPath[depth]) {
        depth++;
    }

    const container = depth === 0 ? null : (lowPath[depth - 1] ?? null);
    const siblings = container === null ? rows : (container.children ?? []);
    const index = lowPath[depth] === undefined ? -1 : siblings.indexOf(lowPath[depth]);

    return insertRow(rows, container?.id ?? null, index + 1, layerRow(id));
}

/**
 * The rows as a consumer reads them.
 * @param rows - The rows.
 * @param nameOf - A layer's name.
 * @returns The rows, frozen.
 */
export function publicRows(rows: Rows, nameOf: (id: LayerId) => string): readonly StyleRow[] {
    return Object.freeze(rows.map((row) => publicRow(row, nameOf)));
}

/**
 * One row as a consumer reads it.
 * @param row - The row.
 * @param nameOf - A layer's name.
 * @returns The row, frozen.
 */
export function publicRow(row: RowNode, nameOf: (id: LayerId) => string): StyleRow {
    return Object.freeze({
        id: row.id,
        kind: row.kind,
        name: row.kind === "folder" ? (row.name ?? "") : nameOf(row.id),
        pin: row.pin,
        locked: row.locked,
        hidden: row.hidden,
        children: publicRows(row.children ?? [], nameOf),
    });
}

/**
 * The flags of a row a document writes: only the ones that are on.
 * @param row - The row.
 * @returns The flags.
 */
function flagsOf(row: RowNode): Pick<StyleDocumentRow, "pin" | "locked" | "hidden"> {
    return {
        ...(row.pin === "none" ? {} : { pin: row.pin }),
        ...(row.locked ? { locked: true } : {}),
        ...(row.hidden ? { hidden: true } : {}),
    };
}

/**
 * The rows as a style document writes them, naming each layer by its place in the document.
 * @param rows - The rows.
 * @param placeOf - The place in the document's `layers` of the layer a row is keyed by.
 * @returns The document's rows, or undefined when they are plain (a document then saves what it
 *   saved before the tree existed).
 */
export function documentRows(rows: Rows, placeOf: (id: LayerId) => number): readonly StyleDocumentRow[] | undefined {
    if (plain(rows)) {
        return undefined;
    }

    const write = (list: Rows): readonly StyleDocumentRow[] =>
        list.map((row) =>
            row.kind === "layer"
                ? { layer: placeOf(row.id), ...flagsOf(row) }
                : { folder: row.name ?? "", ...flagsOf(row), children: write(row.children ?? []) },
        );

    return write(rows);
}

/**
 * Rows read back from a document.
 * @param written - The document's rows.
 * @param layerAt - The id of the layer at a place in the document, or undefined when there is none.
 * @param mintFolder - A new folder id.
 * @returns The rows, or null when a row names a layer the document does not hold or names one twice.
 */
export function readDocumentRows(
    written: readonly StyleDocumentRow[],
    layerAt: (index: number) => LayerId | undefined,
    mintFolder: (name: string) => StyleRowId,
): Rows | null {
    const used = new Set<number>();
    const read = (list: readonly StyleDocumentRow[]): RowNode[] | null => {
        const out: RowNode[] = [];
        for (const row of list) {
            const flags = { pin: row.pin ?? "none", locked: row.locked === true, hidden: row.hidden === true } as const;
            if ("layer" in row) {
                const id = layerAt(row.layer);
                if (id === undefined || used.has(row.layer)) {
                    return null;
                }

                used.add(row.layer);
                out.push(Object.freeze({ id, kind: "layer", ...flags }));
            } else {
                const children = read(row.children);
                if (children === null) {
                    return null;
                }

                out.push(
                    Object.freeze({
                        id: mintFolder(row.folder),
                        kind: "folder",
                        name: row.folder,
                        ...flags,
                        children: Object.freeze(children),
                    }),
                );
            }
        }

        return out;
    };

    const rows = read(written);
    return rows === null ? null : Object.freeze(rows);
}

/**
 * Every folder id in some rows.
 * @param rows - The rows.
 * @returns The ids.
 */
export function folderIdsOf(rows: Rows): StyleRowId[] {
    return rows.flatMap((row) => (row.kind === "folder" ? [row.id, ...folderIdsOf(row.children ?? [])] : []));
}
