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
        const columns = reads.map(columnOf).filter((column): column is string => column !== null);
        const kinds = layer.target === undefined ? (["node", "edge"] as const) : [layer.target];
        if (columns.length > 0 && columns.every((column) => kinds.some((kind) => gone[kind].has(column)))) {
            out.push(layer.id);
        }
    }

    return out;
}
