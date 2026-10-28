/**
 * The style tree's rows as the Graph place reads them, from graphty-element's `styles.tree()`.
 * The element owns the order, the pins, the locks and the eyes; nothing here orders layers or
 * counts over the graph. The helpers only find a row, read the state its folders pass down, and
 * turn the tree control's top-first move into the element's bottom-first place.
 */

import {
    fileStyleOf,
    type GraphSession,
    type LayerId,
    RESULT_SHAPE_CONTRACTS,
    type RowTarget,
    type Run,
    type StyleRow,
    type StyleRowPlace,
} from "@graphty/graphty-element/session";

import { fileStyleLayerWords } from "../styles/fileStyleWords";

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

/**
 * The tree row of the layer a run paints one group with (a run that paints each group as a layer
 * of its own, in the run's folder), or undefined when the run paints none for it.
 * @param session - the element's session.
 * @param run - the grouping run.
 * @param group - the group's value.
 * @returns the row's id.
 */
export function groupRowOf(session: GraphSession, run: string, group: string | number): string | undefined {
    const owned = session.runs.bindings(run);
    const own = session.styles
        .list()
        .find(
            (layer) =>
                owned.includes(layer.id) &&
                layer.selector.match === "rule" &&
                layer.selector.where.kind === "categories" &&
                layer.selector.where.values.includes(String(group)),
        );
    return own === undefined ? undefined : (own.row ?? own.id);
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
 * Whether a row is the Everything row while it holds the base look (`editableBase`): the app keeps
 * it at the bottom and never deletes it, since without it nothing draws what no other row paints.
 * @param session - the element's session, or null before it comes up.
 * @param id - the row.
 * @returns true for that row.
 */
export function isBaseRow(session: GraphSession | null, id: string): boolean {
    const source = session?.config.editableBase === true ? session.styles.get(id)?.source : undefined;
    return source?.by === "template" && source.templateId === "graphty:starting-everything";
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
 * The words heading the panel of several rows: how many layers an edit there reaches, through
 * folders at every depth, as the panel's scope line counts them ("11 layers").
 * @param session - the element's session.
 * @param ids - the rows' ids.
 * @returns the words.
 */
export function rowsHeading(session: GraphSession, ids: readonly string[]): string {
    const tree = session.styles.tree();
    const known = ids.filter((id) => findTreeRow(tree, id) !== undefined);
    return count(known.length === 0 ? 0 : session.styles.layersUnder(known).length, "layer");
}

/**
 * A tree row's name, or "Gone": for a layer row made from a file's styles, the app's words for
 * its facts (`fileStyleOf`); otherwise the row's own name.
 * @param session - the element's session.
 * @param id - the row's id.
 * @returns the name.
 */
export function rowName(session: GraphSession, id: string): string {
    const found = findTreeRow(session.styles.tree(), id);
    if (found === undefined) {
        return "Gone";
    }
    for (const layerId of found.row.kind === "layer" ? rowLayers(session, id) : []) {
        const layer = session.styles.get(layerId);
        const origin = layer === undefined ? null : fileStyleOf(layer);
        if (origin !== null) {
            const column = session.data.attributes().find((attribute) => attribute.path === origin.column);
            return fileStyleLayerWords(origin, column?.plainName);
        }
    }
    return found.row.name;
}

/**
 * The halves of a layer row that paint: those that set or encode at least one property. A half
 * that is on but writes nothing ("Edges: 0 styles") paints nothing, so it is left out.
 * @param session - the element's session.
 * @param id - the row's id.
 * @returns the painting halves' layer ids.
 */
export function paintingParts(session: GraphSession, id: string): { node?: LayerId; edge?: LayerId } {
    const parts = session.styles.parts(id);
    const writes = (layer: LayerId | undefined): layer is LayerId => {
        const found = layer === undefined ? undefined : session.styles.get(layer);
        return Object.keys(found?.set ?? {}).length + Object.keys(found?.encode ?? {}).length > 0;
    };
    return {
        ...(writes(parts?.node) ? { node: parts.node } : {}),
        ...(writes(parts?.edge) ? { edge: parts.edge } : {}),
    };
}

/**
 * The halves of a layer row the reader is building: those that write a property, and those
 * narrowed by a condition (a layer whose edge card is filled is an edge layer before it sets
 * anything, and stays one when a node look is added); with neither, every half it is on, so a new
 * layer still says what it will paint.
 * @param session - the element's session.
 * @param id - the row's id.
 * @returns the halves' layer ids, empty for a row the stack does not hold.
 */
export function builtParts(session: GraphSession, id: string): { node?: LayerId; edge?: LayerId } {
    const painting = paintingParts(session, id);
    const parts = session.styles.parts(id);
    const built = (layer: LayerId | undefined, writes: LayerId | undefined): layer is LayerId =>
        layer !== undefined && (writes !== undefined || session.styles.get(layer)?.selector.match !== "everything");
    const chosen = {
        ...(built(parts?.node, painting.node) ? { node: parts.node } : {}),
        ...(built(parts?.edge, painting.edge) ? { edge: parts.edge } : {}),
    };
    if (chosen.node !== undefined || chosen.edge !== undefined) {
        return chosen;
    }
    return {
        ...(parts?.node === undefined ? {} : { node: parts.node }),
        ...(parts?.edge === undefined ? {} : { edge: parts.edge }),
    };
}

/**
 * What a layer row paints: nodes, edges or both, counting the halves the reader is building
 * (`builtParts`).
 * @param session - the element's session.
 * @param id - the row's id.
 * @returns the kinds, or undefined for a row the stack does not hold.
 */
export function paintedTarget(session: GraphSession, id: string): RowTarget | undefined {
    const target = session.styles.parts(id)?.target;
    const { node, edge } = builtParts(session, id);
    if (target === undefined || (node === undefined && edge === undefined)) {
        return target;
    }
    if (node !== undefined && edge !== undefined) {
        return "both";
    }
    return node === undefined ? "edge" : "node";
}

/**
 * A layer's kind in words, from what it paints: "Node layer", "Edge layer" or "Node and edge
 * layer". Never where it came from: every layer is equal.
 * @param session - the element's session.
 * @param id - the row's id.
 * @returns the words, or undefined for a row the stack does not hold.
 */
export function layerKindWords(session: GraphSession, id: string): string | undefined {
    const target = paintedTarget(session, id);
    if (target === undefined) {
        return undefined;
    }
    return { node: "Node layer", edge: "Edge layer", both: "Node and edge layer" }[target];
}

/**
 * What a row's kind glyph stands for, as its tooltip says it.
 * @param session - the element's session.
 * @param row - the row.
 * @returns the words.
 */
export function kindGlyphWords(session: GraphSession, row: StyleRow): string {
    if (row.kind === "folder") {
        return "Folder";
    }
    const target = paintedTarget(session, row.id);
    return target === undefined
        ? "Layer"
        : { node: "Paints nodes", edge: "Paints edges", both: "Paints nodes and edges" }[target];
}
