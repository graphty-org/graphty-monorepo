/**
 * @file The layers a data source's removal leaves with nothing to read: those whose every data
 * binding reads a column only the removed records held. Any source, a file or not, and any layer,
 * whoever made it: nothing records which layers a load added.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { LayerId } from "../../catalog/types";
import type { GraphRecord } from "../project/state";
import type { CompiledLayer } from "./Layer";

/** The record keys every element has, which no one source owns. */
const SHARED_KEYS: ReadonlySet<string> = new Set(["id", "source", "target"]);

/** The columns per kind. */
export type ColumnsByKind = Readonly<Record<"node" | "edge", ReadonlySet<string>>>;

/**
 * The columns some records hold.
 * @param records - The records.
 * @returns Their keys, less the id and the ends every element has.
 */
export function columnsOf(records: Iterable<GraphRecord>): Set<string> {
    const out = new Set<string>();
    for (const record of records) {
        for (const key of Object.keys(record)) {
            if (!SHARED_KEYS.has(key)) {
                out.add(key);
            }
        }
    }

    return out;
}

/**
 * The column a `data.` path reads: its first segment, quoted or not.
 * @param path - The path.
 * @returns The column, or null for a path that reads no data column.
 */
function columnOf(path: string): string | null {
    if (!path.startsWith("data.")) {
        return null;
    }

    const rest = path.slice("data.".length);
    if (rest.startsWith('"')) {
        const end = rest.indexOf('"', 1);
        return end === -1 ? null : rest.slice(1, end);
    }

    return rest.split(".")[0];
}

/**
 * The layers whose every data binding reads one of the gone columns: a layer that reads no data
 * column, or any column still held, stays.
 * @param stack - The style stack.
 * @param gone - The columns the removed records held and no record left holds, per kind.
 * @returns The layers to remove, bottom first.
 */
export function layersReadingOnly(stack: readonly CompiledLayer[], gone: ColumnsByKind): LayerId[] {
    const out: LayerId[] = [];
    for (const { layer, reads } of stack) {
        const columns = reads.map((path) => columnOf(path)).filter((column): column is string => column !== null);
        const kinds = layer.target === undefined ? (["node", "edge"] as const) : [layer.target];
        if (columns.length > 0 && columns.every((column) => kinds.some((kind) => gone[kind].has(column)))) {
            out.push(layer.id);
        }
    }

    return out;
}

/**
 * What a layer does, less the values it paints with: the elements it selects and, per channel it
 * writes, the column it reads. Two layers with the same key paint the same channels of the same
 * elements from the same columns, so the later one restates the earlier.
 * @param layer - The layer.
 * @returns The key.
 */
function shapeOf(layer: CompiledLayer["layer"]): string {
    const encode = Object.entries(layer.encode ?? {})
        .map(([channel, binding]) => [channel, (binding as { by?: unknown } | undefined)?.by] as const)
        .sort(([a], [b]) => a.localeCompare(b));
    const set = Object.keys(layer.set ?? {}).sort((a, b) => a.localeCompare(b));
    return JSON.stringify([layer.kind, layer.target, layer.selector, set, encode]);
}

/**
 * The earlier layers a replacing load leaves without purpose: those whose every data binding reads
 * a column the new graph no longer holds, and those of the same shape as a layer the load itself
 * added -- the same elements, channels and columns (the load's copy stays, so loading the same data
 * twice keeps one, and a newer version's values replace the older). Every other layer stays,
 * whoever made it: nothing records which layers a load added, only what each layer reads and does.
 * @param stack - The style stack after the load.
 * @param earlier - The ids of the layers the stack held before the load.
 * @param gone - The columns the earlier graph held and the new one does not, per kind.
 * @returns The layers to remove, bottom first.
 */
export function layersAReloadReplaces(
    stack: readonly CompiledLayer[],
    earlier: ReadonlySet<LayerId>,
    gone: ColumnsByKind,
): LayerId[] {
    const old = stack.filter(({ layer }) => earlier.has(layer.id));
    const added = new Set(stack.filter(({ layer }) => !earlier.has(layer.id)).map(({ layer }) => shapeOf(layer)));
    const stale = new Set(layersReadingOnly(old, gone));
    return old.filter(({ layer }) => stale.has(layer.id) || added.has(shapeOf(layer))).map(({ layer }) => layer.id);
}
