/**
 * @file The style value store: per-element values that style layers read, kept in named sets and
 * keyed by element id, beside the data and never in it.
 *
 * The store is one graph-level value of the project (`graph.values`, under
 * {@link STYLE_VALUES_VALUE}), written by the public `data.setStyleValues` command, so it is
 * written in the same undoable step as whatever wrote it, undone and redone with it, and swept
 * when the data is cleared or replaced. It never reaches a data record, so data tables, pages,
 * filters over `data.*` and an export's attribute columns never see it. A layer reads it through
 * the `graphty.style.<set>.<kind>.<key>` paths of `./path`.
 *
 * The store value is immutable: every write builds a new one, so its identity is the cache key a
 * reader needs.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { AttributeDescriptor, EdgeId, NodeId } from "../../../catalog/types";
import { GraphtyError } from "../../../errors/GraphtyError";
import { describeRows } from "../../attributes";
import { type FileStyleKind, fileStylePath, isFileStyleNamespace } from "./path";

/** The name the store is kept under among the graph-level values. */
export const STYLE_VALUES_VALUE = "styleValues";

/** The name older projects kept the store under; read and rewritten as {@link STYLE_VALUES_VALUE}. */
export const LEGACY_STYLE_VALUES_VALUE = "fileStyles";

/**
 * One value a style value column holds for an element.
 * @experimental file-styles
 */
export type FileStyleScalar = string | number | boolean;

/**
 * One column of a set of style values, as plain data: what a project file saves and the
 * `data.setStyleValues` command carries. `ids[i]` holds `values[i]`; a null value holds nothing.
 * @experimental file-styles
 */
export interface StyleValueColumn {
    /** Nodes or edges. */
    readonly kind: FileStyleKind;
    /** The column's key, read at `graphty.style.<set>.<kind>.<key>`. */
    readonly key: string;
    /** The elements, by node id or edge id. */
    readonly ids: readonly (NodeId | EdgeId)[];
    /** One value per id. */
    readonly values: readonly (FileStyleScalar | null)[];
}

/**
 * One named set of style values, as plain data.
 * @experimental file-styles
 */
export interface StyleValueSet {
    /** The set's name, the path segment its values are read under: `values`, `values-2`. */
    readonly name: string;
    /** Its columns. */
    readonly columns: readonly StyleValueColumn[];
}

/** One set, held. */
interface StoredStyleValueSet {
    /** What it was written from, normalised. */
    readonly values: StyleValueSet;
    /** Its columns by `<kind>:<key>`, each by element id. */
    readonly columns: ReadonlyMap<string, ReadonlyMap<NodeId | EdgeId, FileStyleScalar>>;
}

/** The store. */
export interface StyleValueStore {
    /** The sets, in the order they were written. */
    readonly sets: readonly StoredStyleValueSet[];
    /** The sets by name. */
    readonly byName: ReadonlyMap<string, StoredStyleValueSet>;
}

/** The longest column key the store takes. */
const MAX_KEY_LENGTH = 256;

/** The store with nothing in it. */
const EMPTY_STORE: StyleValueStore = Object.freeze({ sets: Object.freeze([]), byName: new Map() });

/**
 * A refusal of a malformed store.
 * @param reason - What is wrong, as a code-like word.
 * @param details - The values it is about.
 * @returns The error.
 */
function malformed(reason: string, details: Readonly<Record<string, unknown>> = {}): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message: `Style values are malformed (${reason}).`,
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
 * @returns Its key in the set and its values by id.
 */
function holdColumn(
    column: unknown,
    at: number,
): {
    readonly values: StyleValueColumn;
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
 * Check and hold one set.
 * @param set - The set.
 * @param at - Its position, for the refusal.
 * @returns The held set.
 */
function holdSet(set: unknown, at: number): StoredStyleValueSet {
    if (!isRecord(set)) {
        throw malformed("set", { set: at });
    }

    const { name, columns } = set;
    if (typeof name !== "string" || !isFileStyleNamespace(name)) {
        throw malformed("set-name", { set: at, name });
    }

    if (!Array.isArray(columns)) {
        throw malformed("set-columns", { set: at });
    }

    const byKey = new Map<string, ReadonlyMap<NodeId | EdgeId, FileStyleScalar>>();
    const kept: StyleValueColumn[] = [];
    columns.forEach((column: unknown, index) => {
        const held = holdColumn(column, index);
        if (byKey.has(held.key)) {
            throw malformed("column-repeated", { set: at, column: index });
        }

        byKey.set(held.key, held.byId);
        kept.push(held.values);
    });

    return Object.freeze({
        values: Object.freeze({ name, columns: Object.freeze(kept) }),
        columns: byKey,
    });
}

/**
 * Build a store from plain values, checking every field.
 * @param sets - The sets, as a project file or a command carries them.
 * @returns The store.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` for a malformed set, column, id or value, and for
 *     two sets of one name.
 */
export function styleValueStoreOf(sets: unknown): StyleValueStore {
    if (!Array.isArray(sets)) {
        throw malformed("sets");
    }

    if (sets.length === 0) {
        return EMPTY_STORE;
    }

    const held: StoredStyleValueSet[] = [];
    const byName = new Map<string, StoredStyleValueSet>();
    sets.forEach((set: unknown, at) => {
        const one = holdSet(set, at);
        if (byName.has(one.values.name)) {
            throw malformed("set-repeated", { set: at });
        }

        byName.set(one.values.name, one);
        held.push(one);
    });

    return Object.freeze({ sets: Object.freeze(held), byName });
}

/**
 * The store a graph-level value holds.
 * @param value - What `graph.values` holds under {@link STYLE_VALUES_VALUE}.
 * @returns The store, or the empty store when none was written.
 */
export function asStyleValueStore(value: unknown): StyleValueStore {
    return isRecord(value) && Array.isArray(value.sets) && value.byName instanceof Map
        ? (value as unknown as StyleValueStore)
        : EMPTY_STORE;
}

/**
 * The store as plain values, for a project file.
 * @param store - The store.
 * @returns Its sets.
 */
export function styleValueSetsOf(store: StyleValueStore): readonly StyleValueSet[] {
    return store.sets.map((set) => set.values);
}

/**
 * The values one column holds, by element id.
 * @param store - The store.
 * @param name - The set's name.
 * @param kind - Nodes or edges.
 * @param key - The column's key.
 * @returns The values, or undefined when the store holds no such column.
 */
export function styleValueColumn(
    store: StyleValueStore,
    name: string,
    kind: FileStyleKind,
    key: string,
): ReadonlyMap<NodeId | EdgeId, FileStyleScalar> | undefined {
    return store.byName.get(name)?.columns.get(`${kind}:${key}`);
}

/**
 * The name a new set takes: `values`, or the first of `values-2`, `values-3`... that no set holds.
 * @param taken - The names the store already holds.
 * @returns The name.
 */
export function nextStyleValueSetName(taken: ReadonlySet<string>): string {
    if (!taken.has("values")) {
        return "values";
    }

    let n = 2;
    while (taken.has(`values-${String(n)}`)) {
        n++;
    }

    return `values-${String(n)}`;
}

/**
 * The sets an older project saved, in today's shape: each saved load (`{ importId, namespace,
 * format, columns }`) becomes a set named in order (`values`, `values-2`...), and the saved name it
 * had is mapped to its new one so the paths that read it can be rewritten. Today's sets pass
 * through unchanged.
 * @param saved - The sets or loads as the project file holds them.
 * @returns The sets, and each old name's new one (empty when nothing was renamed).
 */
export function upgradeStyleValueSets(saved: readonly unknown[]): {
    readonly sets: readonly unknown[];
    readonly renamed: ReadonlyMap<string, string>;
} {
    const renamed = new Map<string, string>();
    const taken = new Set<string>();
    for (const set of saved) {
        if (isRecord(set) && typeof set.name === "string") {
            taken.add(set.name);
        }
    }

    const sets = saved.map((set) => {
        if (!isRecord(set) || typeof set.name === "string" || typeof set.namespace !== "string") {
            return set;
        }

        const name = nextStyleValueSetName(taken);
        taken.add(name);
        renamed.set(set.namespace, name);
        return { name, columns: set.columns };
    });
    return { sets, renamed };
}

/**
 * Each column the store holds, described as a data column is, so a picker lists it beside the
 * data and a layer anyone makes can bind it: named by its key, read at its
 * `graphty.style.<set>.<kind>.<key>` path.
 * @param store - The store.
 * @param counts - How many nodes and edges the graph holds, for each column's completeness.
 * @param counts.node - The node count.
 * @param counts.edge - The edge count.
 * @returns The descriptors, in set and column order.
 */
export function styleValueAttributes(
    store: StyleValueStore,
    counts: { readonly node: number; readonly edge: number },
): readonly AttributeDescriptor[] {
    const out: AttributeDescriptor[] = [];
    for (const set of store.sets) {
        for (const column of set.values.columns) {
            const rows: Record<string, unknown>[] = column.values.map((value) => ({ [column.key]: value }));
            while (rows.length < counts[column.kind]) {
                rows.push({});
            }

            const [described] = describeRows(rows, column.kind, [column.key]);
            const path = fileStylePath(set.values.name, column.kind, column.key);
            out.push(
                Object.freeze({
                    ...described,
                    path,
                    token: `[${path}]`,
                    name: column.key,
                    plainName: column.key,
                    technicalName: column.key,
                }),
            );
        }
    }

    return Object.freeze(out);
}
