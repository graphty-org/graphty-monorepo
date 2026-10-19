/**
 * @file The file-style store: the per-element style values a file's layers read, kept per load and
 * keyed by element id, beside the data and never in it.
 *
 * The store is one graph-level value of the project (`graph.values`, under
 * {@link FILE_STYLES_VALUE}), so it is written in the same undoable step as the load that made it,
 * undone and redone with it, and swept when the data is cleared or replaced. It never reaches a
 * data record, so data tables, pages, filters over `data.*` and an export's attribute columns
 * never see it. A layer reads it through the `graphty.style.<namespace>.<kind>.<key>` paths of
 * `./path`.
 *
 * The store value is immutable: every write builds a new one, so its identity is the cache key a
 * reader needs.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { EdgeId, NodeId } from "../../../catalog/types";
import { GraphtyError } from "../../../errors/GraphtyError";
import { type FileStyleKind, isFileStyleNamespace } from "./path";

/** The name the store is kept under among the graph-level values. */
export const FILE_STYLES_VALUE = "fileStyles";

/** One value a file-style column holds for an element. */
export type FileStyleScalar = string | number | boolean;

/**
 * One column of a load's style values, as plain data: what a project file saves and the
 * `data.setFileStyles` command carries. `ids[i]` holds `values[i]`; a null value holds nothing.
 */
export interface FileStyleColumnValues {
    /** Nodes or edges. */
    readonly kind: FileStyleKind;
    /** The column's key, read at `graphty.style.<namespace>.<kind>.<key>`. */
    readonly key: string;
    /** The elements, by node id or edge id. */
    readonly ids: readonly (NodeId | EdgeId)[];
    /** One value per id. */
    readonly values: readonly (FileStyleScalar | null)[];
}

/** The style values of one load, as plain data. */
export interface FileStyleLoadValues {
    /** The load, as its layers' `templateId` names it (`file:<importId>`). */
    readonly importId: string;
    /** The path namespace its values are read under: `gexf`, `cytoscape-js`, `gexf-2`. */
    readonly namespace: string;
    /** The graph-io format id or JSON dialect the file was read as. */
    readonly format: string;
    /** Its columns. */
    readonly columns: readonly FileStyleColumnValues[];
}

/** One load, held. */
export interface StoredFileStyleLoad {
    /** What it was written from, normalised. */
    readonly values: FileStyleLoadValues;
    /** Its columns by `<kind>:<key>`, each by element id. */
    readonly columns: ReadonlyMap<string, ReadonlyMap<NodeId | EdgeId, FileStyleScalar>>;
}

/** The store. */
export interface FileStyleStore {
    /** The loads, in the order they were written. */
    readonly loads: readonly StoredFileStyleLoad[];
    /** The loads by namespace. */
    readonly byNamespace: ReadonlyMap<string, StoredFileStyleLoad>;
}

/** The longest column key the store takes. */
const MAX_KEY_LENGTH = 256;

/** The store with nothing in it. */
export const EMPTY_FILE_STYLES: FileStyleStore = Object.freeze({ loads: Object.freeze([]), byNamespace: new Map() });

/**
 * A refusal of a malformed store.
 * @param reason - What is wrong, as a code-like word.
 * @param details - The values it is about.
 * @returns The error.
 */
function malformed(reason: string, details: Readonly<Record<string, unknown>> = {}): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message: `File style values are malformed (${reason}).`,
        source: "data",
        details: { reason, ...details },
    });
}

/**
 * Whether a value is a plain object.
 * @param value - The value.
 * @returns True for `{...}`.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check and hold one column. Untrusted input: a project file or a command from anywhere.
 * @param column - The column.
 * @param at - Its position, for the refusal.
 * @returns Its key in the load and its values by id.
 */
function holdColumn(
    column: unknown,
    at: number,
): {
    readonly values: FileStyleColumnValues;
    readonly key: string;
    readonly byId: Map<NodeId | EdgeId, FileStyleScalar>;
} {
    if (!isRecord(column) || (column.kind !== "node" && column.kind !== "edge")) {
        throw malformed("column-kind", { column: at });
    }

    const { key, ids, values } = column;
    if (typeof key !== "string" || key === "" || key.length > MAX_KEY_LENGTH) {
        throw malformed("column-key", { column: at });
    }

    if (!Array.isArray(ids) || !Array.isArray(values) || ids.length !== values.length) {
        throw malformed("column-values", { column: at });
    }

    const byId = new Map<NodeId | EdgeId, FileStyleScalar>();
    const keptIds: (NodeId | EdgeId)[] = [];
    const keptValues: FileStyleScalar[] = [];
    for (let row = 0; row < ids.length; row++) {
        const id: unknown = ids[row];
        const value: unknown = values[row];
        if (typeof id !== "string" && typeof id !== "number") {
            throw malformed("column-id", { column: at, row });
        }

        if (value === null || value === undefined) {
            continue;
        }

        if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
            throw malformed("column-value", { column: at, row });
        }

        byId.set(id, value);
        keptIds.push(id);
        keptValues.push(value);
    }

    return {
        key: `${column.kind}:${key}`,
        byId,
        values: Object.freeze({
            kind: column.kind,
            key,
            ids: Object.freeze(keptIds),
            values: Object.freeze(keptValues),
        }),
    };
}

/**
 * Check and hold one load.
 * @param load - The load.
 * @param at - Its position, for the refusal.
 * @returns The held load.
 */
function holdLoad(load: unknown, at: number): StoredFileStyleLoad {
    if (!isRecord(load)) {
        throw malformed("load", { load: at });
    }

    const { importId, namespace, format, columns } = load;
    if (typeof importId !== "string" || importId === "" || typeof format !== "string") {
        throw malformed("load-id", { load: at });
    }

    if (typeof namespace !== "string" || !isFileStyleNamespace(namespace)) {
        throw malformed("load-namespace", { load: at, namespace });
    }

    if (!Array.isArray(columns)) {
        throw malformed("load-columns", { load: at });
    }

    const byKey = new Map<string, ReadonlyMap<NodeId | EdgeId, FileStyleScalar>>();
    const kept: FileStyleColumnValues[] = [];
    columns.forEach((column: unknown, index) => {
        const held = holdColumn(column, index);
        if (byKey.has(held.key)) {
            throw malformed("column-repeated", { load: at, column: index });
        }

        byKey.set(held.key, held.byId);
        kept.push(held.values);
    });

    return Object.freeze({
        values: Object.freeze({ importId, namespace, format, columns: Object.freeze(kept) }),
        columns: byKey,
    });
}

/**
 * Build a store from plain values, checking every field.
 * @param loads - The loads, as a project file or a command carries them.
 * @returns The store.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` for a malformed load, column, id or value, and for
 *     two loads naming one namespace or one import.
 */
export function fileStyleStoreOf(loads: unknown): FileStyleStore {
    if (!Array.isArray(loads)) {
        throw malformed("loads");
    }

    if (loads.length === 0) {
        return EMPTY_FILE_STYLES;
    }

    const held: StoredFileStyleLoad[] = [];
    const byNamespace = new Map<string, StoredFileStyleLoad>();
    const imports = new Set<string>();
    loads.forEach((load: unknown, at) => {
        const one = holdLoad(load, at);
        if (byNamespace.has(one.values.namespace) || imports.has(one.values.importId)) {
            throw malformed("load-repeated", { load: at });
        }

        byNamespace.set(one.values.namespace, one);
        imports.add(one.values.importId);
        held.push(one);
    });

    return Object.freeze({ loads: Object.freeze(held), byNamespace });
}

/**
 * The store a graph-level value holds.
 * @param value - What `graph.values` holds under {@link FILE_STYLES_VALUE}.
 * @returns The store, or the empty store when none was written.
 */
export function asFileStyleStore(value: unknown): FileStyleStore {
    return isRecord(value) && Array.isArray(value.loads) && value.byNamespace instanceof Map
        ? (value as unknown as FileStyleStore)
        : EMPTY_FILE_STYLES;
}

/**
 * The store as plain values, for a project file.
 * @param store - The store.
 * @returns Its loads.
 */
export function fileStyleValuesOf(store: FileStyleStore): readonly FileStyleLoadValues[] {
    return store.loads.map((load) => load.values);
}

/**
 * The values one column holds, by element id.
 * @param store - The store.
 * @param namespace - The load's namespace.
 * @param kind - Nodes or edges.
 * @param key - The column's key.
 * @returns The values, or undefined when the store holds no such column.
 */
export function fileStyleColumn(
    store: FileStyleStore,
    namespace: string,
    kind: FileStyleKind,
    key: string,
): ReadonlyMap<NodeId | EdgeId, FileStyleScalar> | undefined {
    return store.byNamespace.get(namespace)?.columns.get(`${kind}:${key}`);
}
