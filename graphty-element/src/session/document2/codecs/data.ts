/**
 * @file The `data` section codec, version 2: the build stamp, the source records (embedded or
 * referenced), the reader source's operations, the type registry, conversions, data issues, the
 * join history and the merged graph (spec/README.md 4.1). Experimental (`save-files-v2`).
 *
 * Known gaps: what this writes from today's model, which has no data store
 * (design/data/data-store-options.md is not built), and so cannot fill truthfully:
 *
 * - A source's `copy` is the records it supplied as the session holds them now, not its rows as
 *   parsed: the key column is written `id`, the reader's edits are in the cells, a record two
 *   sources supplied is in both copies, and `mapping.renamed` is never written. An edge two loads
 *   supplied is in the first one's copy only.
 * - Copy ids: a `file`, `url` or `sample` copy id hashes the copy as written, not the bytes as
 *   read. Each copy id, and the build stamp, is kept while what it stands for is unchanged, told
 *   by an in-memory digest of the copy and of the build inputs (never written, never compared by a
 *   reader); after an open, the ids read are kept for the data as the open built it.
 * - Spaces: today's loads share one id system, so every node a load supplied is in the first
 *   load's space `source:<id>` (keys meet across loads as today's ids do); a node read from a
 *   version 2 file keeps the record key it was read with. The reader's nodes are in
 *   `source:reader`, keyed by minted ULIDs; reopened, such a node's session id is that ULID.
 * - The reader source holds only the elements no load supplied, each an `add`; today's edits,
 *   removals and merges are already in the records, so no `edit`, `remove` or `merge` operation is
 *   ever written (read ones are applied, then baked into the copies).
 * - Types: the registry the last open read, its rules on sources still open, then one type per
 *   today's `kind` value, `schema` `{ "type": "object" }`. `joins` is one `join.add` per load.
 *   `annotations`, `metadata`, `license`, `citation`, `mediaType` and `path` are never written.
 * - On read: only `join.add` and `join.merge` build (both by key in the mapping's spaces); the
 *   other known shapes hold the section. `repeatedEdges` other than `keep` is built as `keep` and
 *   reported. A referenced source cannot be fetched again yet: it supplies nothing, is reported
 *   `W_SOURCE_UNAVAILABLE`, and its record is written back as read. Types are kept for the next
 *   save, not applied (today's `kind` column is not written from them). `date` and `category`
 *   conversions leave values as read.
 */

import type { EdgeId, NodeId } from "../../../catalog/types";
import type { ColumnSettings } from "../../commands/data";
import type { LoadedSource, TransactionScope } from "../../types";
import type {
    DocumentProblem,
    EdgeRef,
    JsonObject,
    NodeRef,
    ReadContext,
    ReadSection,
    SectionCodec,
    WriteContext,
} from "../types";
import {
    canonicalJson,
    dataBodyOf,
    edgeKey,
    edgeRefOf,
    isPlainObject,
    keyText,
    nodeRefOf,
    numericCell,
    READER,
    recordKey,
    rememberRead,
    SOURCE_ID,
    ULID,
} from "./dataRefs";

// ---------------------------------------------------------------------------------------------
// Closed objects and vocabularies (spec 4.1, 10)
// ---------------------------------------------------------------------------------------------

const SOURCE_KINDS = new Set(["file", "url", "network", "sample", "derived"]);
/** The kinds whose copy id hashes the bytes; the rest (network, derived, reader) mint a ULID. */
const HASHED_KINDS = new Set(["file", "url", "sample"]);
/** A hashed copy id: `sha256:` and lowercase hex. */
const SHA256 = /^sha256:[0-9a-f]{64}$/;
/** A network source's closed `origin` (spec 4.1.2). */
const NETWORK_ORIGIN = new Set(["copy", "url", "credentials", "etag", "lastModified", "ledger"]);
/** The join shapes of version 2; only the first two are built by this reader. */
const JOIN_OPS = new Set(["join.add", "join.merge", "join.node-values", "join.edge-values", "join.edges"]);
const BUILT_OPS = new Set(["join.add", "join.merge"]);
const JOIN_MEMBERS = new Set([
    "op",
    "source",
    "edges",
    "via",
    "clash",
    "repeated",
    "lookup",
    "mapping",
    "aggregate",
    "unmatchedFrom",
    "unmatchedRows",
    "compare",
    "membership",
    "names",
]);
const SOURCE_MEMBERS = new Set([
    "id",
    "label",
    "kind",
    "format",
    "options",
    "origin",
    "mapping",
    "settings",
    "annotations",
    "metadata",
    "license",
    "citation",
    "copy",
    "columns",
    "loaded",
]);
const NODE_MAPPING = new Set([
    "key",
    "space",
    "weight",
    "weightMeaning",
    "time",
    "timeUnit",
    "latitude",
    "longitude",
    "coordinates",
    "country",
    "region",
    "city",
    "renamed",
]);
const EDGE_MAPPING = new Set([
    "edgeId",
    "source",
    "sourceSpace",
    "target",
    "targetSpace",
    "weight",
    "weightMeaning",
    "time",
    "timeUnit",
    "renamed",
]);
const SETTINGS = new Set(["duplicateIds", "unmatched"]);
const TYPE_MEMBERS = new Set(["name", "kind", "plainName", "rules", "schema"]);
const RULE_MEMBERS = new Set(["source", "end", "column", "values"]);
const READER_MEMBERS = new Set(["id", "label", "kind", "origin", "copy", "loaded"]);
const OPERATION_MEMBERS: Readonly<Record<string, ReadonlySet<string>>> = {
    merge: new Set(["op", "into", "from"]),
    remove: new Set(["op", "node", "edge"]),
    add: new Set(["op", "node", "edge", "from", "to", "columns", "dtypes"]),
    edit: new Set(["op", "node", "edge", "column", "value", "was"]),
};
const NUMERIC = new Set(["f32", "f64", "i32", "u32", "u8"]);
const REPEATED_EDGES = new Set(["keep", "error", "first", "last", "sum", "min", "max"]);

/** Why a data section cannot be built whole; held, and reported, by its pointer. */
class Unbuildable extends Error {
    constructor(readonly pointer: string) {
        super(pointer);
    }
}

/**
 * Refuse the build unless a condition holds.
 * @param ok - The condition.
 * @param pointer - Where the file breaks it.
 */
function need(ok: boolean, pointer: string): asserts ok {
    if (!ok) {
        throw new Unbuildable(pointer);
    }
}

/**
 * Check that an object has only members a closed set names.
 * @param value - The object.
 * @param known - The members it may have.
 * @param pointer - Its pointer.
 */
function closed(value: unknown, known: ReadonlySet<string>, pointer: string): asserts value is JsonObject {
    need(isPlainObject(value), pointer);
    for (const name of Object.keys(value)) {
        need(known.has(name), `${pointer}/${name}`);
    }
}

/**
 * A space as read: a non-empty string, NFC normalized (spec 6.1). Never parsed.
 * @param space - The space.
 * @param pointer - Its pointer.
 * @returns The space.
 */
function spaceOf(space: unknown, pointer: string): string {
    need(typeof space === "string" && space.length > 0, pointer);
    return space.normalize("NFC");
}

// ---------------------------------------------------------------------------------------------
// The section, checked
// ---------------------------------------------------------------------------------------------

/** One table of a copy, read: its columns by name, the column declarations and their unset rows. */
interface Table {
    readonly cells: Readonly<Record<string, readonly unknown[]>>;
    readonly decls: Readonly<JsonObject>;
    readonly length: number;
    /** Each json column's `unset` rows, as a set. */
    readonly unset: ReadonlyMap<string, ReadonlySet<number>>;
}

/**
 * A table of a copy, checked: equal-length arrays.
 * @param value - What the copy holds for the table.
 * @param decls - Its column declarations.
 * @param pointer - Its pointer.
 * @returns The table, or undefined when the copy has none.
 */
function tableOf(value: unknown, decls: unknown, pointer: string): Table | undefined {
    if (value === undefined) {
        return undefined;
    }

    need(isPlainObject(value), pointer);
    const lengths = new Set<number>();
    for (const [name, cells] of Object.entries(value)) {
        need(Array.isArray(cells), `${pointer}/${name}`);
        lengths.add(cells.length);
    }

    need(lengths.size <= 1, pointer);
    const length = [...lengths][0] ?? 0;
    const declared = isPlainObject(decls) ? decls : {};
    const unset = new Map<string, Set<number>>();
    for (const [name, decl] of Object.entries(declared)) {
        if (isPlainObject(decl) && decl.dtype === "json" && decl.unset !== undefined) {
            need(Array.isArray(decl.unset), `${pointer}/${name}/unset`);
            const rows = new Set<number>();
            for (const row of decl.unset as unknown[]) {
                need(
                    Number.isInteger(row) && (row as number) >= 0 && (row as number) < length,
                    `${pointer}/${name}/unset`,
                );
                rows.add(row as number);
            }

            unset.set(name, rows);
        }
    }

    return { cells: value as Record<string, unknown[]>, decls: declared, length, unset };
}

/**
 * A cell as the session holds it: a numeric column's string form read back as the number
 * (spec 11), a non-json column's null as unset.
 * @param table - The table.
 * @param name - The column.
 * @param row - The row.
 * @returns The value, or undefined for unset.
 */
function cellOf(table: Table, name: string, row: number): unknown {
    const value = table.cells[name][row];
    const decl = table.decls[name];
    const dtype = isPlainObject(decl) ? decl.dtype : undefined;
    if (dtype === "json") {
        return table.unset.get(name)?.has(row) === true ? undefined : value;
    }

    if (value === null) {
        return undefined;
    }

    return typeof value === "string" && NUMERIC.has(String(dtype)) ? numericCell(value) : value;
}

/**
 * A row of a table, by working column name.
 * @param table - The table.
 * @param row - The row.
 * @returns The values; unset cells left out.
 */
function rowOf(table: Table, row: number): JsonObject {
    const values: JsonObject = {};
    for (const name of Object.keys(table.cells)) {
        const value = cellOf(table, name, row);
        if (value !== undefined) {
            values[name] = value;
        }
    }

    return values;
}

/**
 * The columns a reader `add` gives, read through its declared dtypes as a copy's cells are.
 * @param operation - The checked `add`.
 * @returns The values; unset cells left out.
 */
function addedColumns(operation: JsonObject): JsonObject {
    const given = (operation.columns ?? {}) as JsonObject;
    const dtypes = operation.dtypes as JsonObject;
    const table: Table = {
        cells: Object.fromEntries(Object.entries(given).map(([name, value]) => [name, [value]])),
        decls: Object.fromEntries(Object.keys(given).map((name) => [name, { dtype: dtypes[name] }])),
        length: 1,
        unset: new Map(),
    };
    return rowOf(table, 0);
}

/** A source record read, checked. */
interface ReadSource {
    readonly record: JsonObject;
    readonly id: string;
    readonly copyId: string;
    /** Absent for a referenced source. */
    readonly nodes?: Table;
    readonly edges?: Table;
    readonly embedded: boolean;
}

/**
 * Check a source's `mapping` (spec 4.1.3).
 * @param mapping - The mapping.
 * @param pointer - Its pointer.
 */
function checkMapping(mapping: unknown, pointer: string): void {
    closed(mapping, new Set(["nodes", "edges"]), pointer);
    if (mapping.nodes !== undefined) {
        closed(mapping.nodes, NODE_MAPPING, `${pointer}/nodes`);
        need((mapping.nodes.key === undefined) === (mapping.nodes.space === undefined), `${pointer}/nodes`);
        if (mapping.nodes.space !== undefined) {
            spaceOf(mapping.nodes.space, `${pointer}/nodes/space`);
        }
    }

    if (mapping.edges !== undefined) {
        closed(mapping.edges, EDGE_MAPPING, `${pointer}/edges`);
        for (const role of ["source", "target"]) {
            need(typeof mapping.edges[role] === "string", `${pointer}/edges/${role}`);
            spaceOf(mapping.edges[`${role}Space`], `${pointer}/edges/${role}Space`);
        }
    }
}

/**
 * Check one reader operation: its closed members per `op` (spec 4.1.4).
 * @param operation - The operation.
 * @param pointer - Its pointer.
 */
function checkOperation(operation: unknown, pointer: string): void {
    need(isPlainObject(operation), pointer);
    const members = OPERATION_MEMBERS[String(operation.op)];
    need(members !== undefined, `${pointer}/op`);
    closed(operation, members, pointer);
    if (operation.op === "add") {
        const node = operation.node === undefined ? undefined : nodeRefOf(operation.node);
        const edge = operation.edge === undefined ? undefined : edgeRefOf(operation.edge);
        need(node === undefined || ULID.test(node.key), `${pointer}/node`);
        need(edge === undefined || (edge.load === READER && ULID.test(edge.key)), `${pointer}/edge`);
        need((node === undefined) !== (edge === undefined), pointer);
        need(operation.columns === undefined || isPlainObject(operation.columns), `${pointer}/columns`);
        // Every column the add gives declares its dtype, so a number's string form reads back as one.
        const { dtypes } = operation;
        need(isPlainObject(dtypes), `${pointer}/dtypes`);
        for (const name of Object.keys(operation.columns ?? {})) {
            need(typeof dtypes[name] === "string", `${pointer}/dtypes/${name}`);
        }
    }
}

/**
 * Check the reader source (spec 4.1.4).
 * @param record - The source record.
 * @param pointer - Its pointer.
 * @returns Its operations.
 */
function checkReader(record: JsonObject, pointer: string): JsonObject[] {
    closed(record, READER_MEMBERS, pointer);
    need(record.id === READER, `${pointer}/id`);
    closed(record.origin, new Set(["copy"]), `${pointer}/origin`);
    need(typeof record.origin.copy === "string" && ULID.test(record.origin.copy), `${pointer}/origin/copy`);
    closed(record.copy, new Set(["operations"]), `${pointer}/copy`);
    const { operations } = record.copy;
    need(Array.isArray(operations), `${pointer}/copy/operations`);
    operations.forEach((operation: unknown, at: number) => {
        checkOperation(operation, `${pointer}/copy/operations/${String(at)}`);
    });
    return operations as JsonObject[];
}

/**
 * Check one source record (spec 4.1.2).
 * @param record - The record.
 * @param pointer - Its pointer.
 * @returns The source.
 */
function checkSource(record: JsonObject, pointer: string): ReadSource {
    closed(record, SOURCE_MEMBERS, pointer);
    const { id, kind, origin, copy } = record;
    need(typeof id === "string" && SOURCE_ID.test(id), `${pointer}/id`);
    need(typeof kind === "string" && SOURCE_KINDS.has(kind), `${pointer}/kind`);
    need(isPlainObject(origin) && typeof origin.copy === "string", `${pointer}/origin`);
    // The copy id's form follows the kind: a bytes hash, or a ULID (spec 4.1.2); an embedded copy
    // holding the reader's edits has a ULID whatever its kind.
    const hashed = HASHED_KINDS.has(kind) && !(copy !== undefined && ULID.test(origin.copy));
    need((hashed ? SHA256 : ULID).test(origin.copy), `${pointer}/origin/copy`);
    if (kind === "network") {
        closed(origin, NETWORK_ORIGIN, `${pointer}/origin`);
        closed(origin.credentials ?? {}, new Set(["slot"]), `${pointer}/origin/credentials`);
    }

    checkMapping(record.mapping ?? {}, `${pointer}/mapping`);
    closed(record.settings ?? {}, SETTINGS, `${pointer}/settings`);
    if (copy === undefined) {
        need(kind !== "derived" && record.columns === undefined, pointer);
        return { record, id, copyId: origin.copy, embedded: false };
    }

    // Tables, or an unknown copy form.
    closed(copy, new Set(["nodes", "edges"]), `${pointer}/copy`);
    const decls = isPlainObject(record.columns) ? record.columns : {};
    return {
        record,
        id,
        copyId: origin.copy,
        embedded: true,
        nodes: tableOf(copy.nodes, decls.nodes, `${pointer}/copy/nodes`),
        edges: tableOf(copy.edges, decls.edges, `${pointer}/copy/edges`),
    };
}

/** A data section, checked. */
interface Checked {
    readonly sources: ReadonlyMap<string, ReadSource>;
    readonly reader?: { readonly copyId: string; readonly operations: readonly JsonObject[] };
    readonly types: readonly JsonObject[];
    readonly joins: readonly JsonObject[];
    readonly conversions: readonly JsonObject[];
    readonly issues: JsonObject;
}

/**
 * Check the types, conversions and issues: their closed members.
 * @param body - The section's body.
 */
function checkRegistry(body: Readonly<JsonObject>): void {
    need(Array.isArray(body.types), "/types");
    body.types.forEach((type: unknown, at: number) => {
        const pointer = `/types/${String(at)}`;
        closed(type, TYPE_MEMBERS, pointer);
        need(type.kind === "node" || type.kind === "edge", `${pointer}/kind`);
        need(Array.isArray(type.rules), `${pointer}/rules`);
        (type.rules as unknown[]).forEach((rule, index) => {
            closed(rule, RULE_MEMBERS, `${pointer}/rules/${String(index)}`);
        });
    });
    need(Array.isArray(body.conversions ?? []), "/conversions");
    ((body.conversions ?? []) as unknown[]).forEach((conversion, at) => {
        closed(conversion, new Set(["kind", "name", "type"]), `/conversions/${String(at)}`);
    });
    closed(body.issues ?? {}, new Set(["ignored", "kept"]), "/issues");
    const issues = (body.issues ?? {}) as JsonObject;
    for (const [list, members] of [
        ["ignored", ["code", "kind", "name"]],
        ["kept", ["from", "to"]],
    ] as const) {
        need(Array.isArray(issues[list] ?? []), `/issues/${list}`);
        ((issues[list] ?? []) as unknown[]).forEach((entry, at) => {
            closed(entry, new Set(members), `/issues/${list}/${String(at)}`);
        });
    }
}

/**
 * Check every closed object and vocabulary of a data section before anything is applied
 * (spec 4.1.10).
 * @param body - The section's body.
 * @returns The section, checked.
 */
function checked(body: Readonly<JsonObject>): Checked {
    need(typeof body.build === "string" && ULID.test(body.build), "/build");
    need(typeof body.directed === "boolean", "/directed");
    need(
        body.repeatedEdges === undefined ||
            (typeof body.repeatedEdges === "string" && REPEATED_EDGES.has(body.repeatedEdges)),
        "/repeatedEdges",
    );
    need(Array.isArray(body.sources), "/sources");
    need(Array.isArray(body.joins), "/joins");
    checkRegistry(body);
    const sources = new Map<string, ReadSource>();
    let reader: Checked["reader"];
    body.sources.forEach((record: unknown, at: number) => {
        const pointer = `/sources/${String(at)}`;
        need(isPlainObject(record) && typeof record.kind === "string", pointer);
        if (record.kind === "reader") {
            need(reader === undefined, pointer);
            const operations = checkReader(record, pointer);
            reader = { copyId: String((record.origin as JsonObject).copy), operations };
            return;
        }

        const source = checkSource(record, pointer);
        need(!sources.has(source.id), `${pointer}/id`);
        sources.set(source.id, source);
    });

    body.joins.forEach((step: unknown, at: number) => {
        const pointer = `/joins/${String(at)}`;
        closed(step, JOIN_MEMBERS, pointer);
        need(typeof step.op === "string" && JOIN_OPS.has(step.op), `${pointer}/op`);
        // A known shape this reader does not build cannot be built whole either.
        need(BUILT_OPS.has(step.op), `${pointer}/op`);
        need(typeof step.source === "string" && sources.has(step.source), `${pointer}/source`);
    });

    return {
        sources,
        ...(reader === undefined ? {} : { reader }),
        types: body.types as JsonObject[],
        joins: body.joins as JsonObject[],
        conversions: (body.conversions ?? []) as JsonObject[],
        issues: (body.issues ?? {}) as JsonObject,
    };
}

// ---------------------------------------------------------------------------------------------
// Building the graph from the sources
// ---------------------------------------------------------------------------------------------

/** A node being built. */
interface BuiltNode {
    id: NodeId;
    readonly ref: NodeRef;
    readonly columns: JsonObject;
    readonly loads: string[];
}

/** An edge being built. */
interface BuiltEdge {
    from: BuiltNode;
    to: BuiltNode;
    readonly columns: JsonObject;
    readonly ref: EdgeRef;
    /** The minting source's `unmatched`. */
    readonly unmatched: string;
}

/** What the build gives. */
interface Built {
    readonly build: string;
    readonly nodes: BuiltNode[];
    readonly edges: BuiltEdge[];
    readonly loads: LoadedSource[];
    readonly directed: boolean;
    readonly edgeIdColumn?: string;
    readonly copies: Record<string, string>;
    readonly types: readonly JsonObject[];
    readonly conversions: readonly JsonObject[];
    readonly issues: JsonObject;
    readonly unavailable: JsonObject[];
    /** Whether the build left out a part of the section, so a re-save writes other data than it read. */
    readonly refused: boolean;
    /** Each source's `origin` as read, by source id. */
    readonly origins: readonly (readonly [string, JsonObject])[];
    /** Each source's `kind` as read, by source id. */
    readonly kinds: readonly (readonly [string, string])[];
    /** The reader operations read that are not `add`s, by `op`, in order. */
    readonly folded: readonly string[];
}

/** The build so far. */
interface Building {
    readonly nodes: Map<string, BuiltNode>;
    readonly edges: Map<string, BuiltEdge>;
    readonly problems: DocumentProblem[];
}

/**
 * The node a record key names, made (named only, supplied by nothing) when there is none.
 * @param into - The build so far.
 * @param ref - The record key.
 * @param cell - The cell it was read from, the node's session id in a `source:` space.
 * @returns The node.
 */
function nodeAt(into: Building, ref: NodeRef, cell: unknown): BuiltNode {
    const at = recordKey(ref.space, ref.key);
    let node = into.nodes.get(at);
    if (node === undefined) {
        node = { id: cell as NodeId, ref, columns: {}, loads: [] };
        into.nodes.set(at, node);
    }

    return node;
}

/**
 * Whether a table repeats a key in a column (for `duplicateIds: "refuse"`).
 * @param table - The table.
 * @param column - The key column.
 * @returns True when a key repeats.
 */
function repeatsKey(table: Table | undefined, column: string | undefined): boolean {
    if (table === undefined || column === undefined || !(column in table.cells)) {
        return false;
    }

    const keys = table.cells[column].map(keyText).filter((key) => key !== undefined);
    return new Set(keys).size < keys.length;
}

/**
 * Give a node a row's columns, its key column included (spec 4.1.9). A value an earlier source gave
 * differently is kept beside it as `<column> (<source id>)` (spec 4.1.8 rule 3).
 * @param node - The node.
 * @param values - The row.
 * @param source - The row's source id.
 * @param row - Whether the source gave the node a row already, and whether a repeat merges.
 * @param row.repeated - The source gave the node a row already.
 * @param row.merge - A repeat merges (`duplicateIds: "merge"`).
 */
function takeColumns(
    node: BuiltNode,
    values: Readonly<JsonObject>,
    source: string,
    row: { readonly repeated: boolean; readonly merge: boolean },
): void {
    for (const [name, value] of Object.entries(values)) {
        if (row.repeated && row.merge) {
            // The first row's values stand, as an edge's do; a later row only fills an unset column.
            node.columns[name] ??= value;
        } else if (!(name in node.columns)) {
            node.columns[name] = value;
        } else if (!row.repeated && canonicalJson(node.columns[name]) !== canonicalJson(value)) {
            node.columns[`${name} (${source})`] = value;
        }
    }
}

/** One source's per-load choices, as a build reads them. */
interface Choices {
    readonly duplicates: string;
    readonly unmatched: string;
}

/**
 * A keyed row's record key, or undefined for a keyless one.
 * @param space - The source's node space, undefined when it maps no key.
 * @param key - The row's key text, undefined for a null or empty cell.
 * @returns The record key.
 */
function keyedRef(space: string | undefined, key: string | undefined): NodeRef | undefined {
    return space === undefined || key === undefined ? undefined : { space, key };
}

/**
 * Build a source's node rows by key in its space. A row with no key, or a null or empty key cell,
 * is keyless (spec 4.1.4): it keeps its row, in the space `source:<source id>`.
 * @param source - The source.
 * @param into - The build so far.
 * @param nodeMap - Its node mapping.
 * @param duplicates - Its `duplicateIds`.
 */
function buildNodes(source: ReadSource, into: Building, nodeMap: JsonObject, duplicates: string): void {
    const { id, copyId, nodes } = source;
    const keyColumn = typeof nodeMap.key === "string" ? nodeMap.key : undefined;
    const keyedSpace = keyColumn === undefined ? undefined : String(nodeMap.space).normalize("NFC");
    const seen = new Set<BuiltNode>();
    for (let row = 0; nodes !== undefined && row < nodes.length; row++) {
        const values = rowOf(nodes, row);
        const cell = keyColumn === undefined ? undefined : values[keyColumn];
        const keyed = keyedSpace === undefined ? undefined : keyText(cell);
        const ref = keyedRef(keyedSpace, keyed) ?? { space: `source:${id}`, key: `${copyId}#${String(row)}` };
        const node = nodeAt(into, ref, keyed === undefined ? ref.key : cell);
        const repeated = seen.has(node);
        if (repeated && duplicates === "first") {
            continue;
        }

        takeColumns(node, values, id, { repeated, merge: duplicates === "merge" });
        seen.add(node);
        if (!node.loads.includes(id)) {
            node.loads.push(id);
        }
    }
}

/**
 * Build a source's edge rows between the nodes their ends name. An edge from several rows keeps
 * the first row's values, and so its type; under `merge` a later row only fills a column the first
 * left unset (spec 4.1.8).
 * @param source - The source.
 * @param into - The build so far.
 * @param edgeMap - Its edge mapping.
 * @param choices - Its `duplicateIds` and `unmatched`.
 */
function buildEdges(source: ReadSource, into: Building, edgeMap: JsonObject, choices: Choices): void {
    const { id, copyId, edges } = source;
    const edgeId = typeof edgeMap.edgeId === "string" ? edgeMap.edgeId : undefined;
    const [from, to] = [String(edgeMap.source), String(edgeMap.target)];
    const [fromSpace, toSpace] = [String(edgeMap.sourceSpace), String(edgeMap.targetSpace)].map((each) =>
        each.normalize("NFC"),
    );
    const own = new Set<BuiltEdge>();
    for (let row = 0; edges !== undefined && row < edges.length; row++) {
        const values = rowOf(edges, row);
        const [a, b] = [keyText(values[from]), keyText(values[to])];
        if (a === undefined || b === undefined) {
            continue;
        }

        const key = (edgeId === undefined ? undefined : keyText(values[edgeId])) ?? `${copyId}#${String(row)}`;
        const ref: EdgeRef = { load: id, key };
        // Every working column is the edge's, its end columns included (spec 4.1.9).
        const columns: JsonObject = { ...values };
        const existing = into.edges.get(edgeKey(ref));
        if (existing === undefined || !own.has(existing)) {
            const edge: BuiltEdge = {
                from: nodeAt(into, { space: fromSpace, key: a }, values[from]),
                to: nodeAt(into, { space: toSpace, key: b }, values[to]),
                columns,
                ref,
                unmatched: choices.unmatched,
            };
            own.add(edge);
            into.edges.set(edgeKey(ref), edge);
        } else if (choices.duplicates === "merge") {
            for (const [name, value] of Object.entries(columns)) {
                existing.columns[name] ??= value;
            }
        }
    }
}

/**
 * Build one `join.add` or `join.merge` step: the source's node rows by key in its space, then its
 * edge rows between the nodes their ends name (spec 4.1.3, 6.1).
 * @param source - The source.
 * @param into - The build so far.
 */
function buildSource(source: ReadSource, into: Building): void {
    const { record, id } = source;
    const mapping = isPlainObject(record.mapping) ? record.mapping : {};
    const settings = isPlainObject(record.settings) ? record.settings : {};
    const choices: Choices = {
        duplicates: typeof settings.duplicateIds === "string" ? settings.duplicateIds : "first",
        unmatched: typeof settings.unmatched === "string" ? settings.unmatched : "add",
    };
    const nodeMap = isPlainObject(mapping.nodes) ? mapping.nodes : {};
    const edgeMap = isPlainObject(mapping.edges) ? mapping.edges : undefined;
    const keyColumn = typeof nodeMap.key === "string" ? nodeMap.key : undefined;
    const edgeId = typeof edgeMap?.edgeId === "string" ? edgeMap.edgeId : undefined;
    if (choices.duplicates === "refuse" && (repeatsKey(source.nodes, keyColumn) || repeatsKey(source.edges, edgeId))) {
        into.problems.push({ code: "W_MEMBER_LEFT_OUT", params: { section: "data", pointer: `/sources/${id}` } });
        return;
    }

    buildNodes(source, into, nodeMap, choices.duplicates);
    if (edgeMap !== undefined) {
        buildEdges(source, into, edgeMap, choices);
    }
}

/**
 * Leave out the edges a `leave-out` source made whose end no source supplies, then the named-only
 * nodes no edge names any more (spec 4.1.3; data-store-options.md 4.6 step 3), reporting both.
 * @param into - The build so far.
 */
function settleEnds(into: Building): void {
    const missing = new Map<string, number>();
    const namedOnly = new Map<string, Set<BuiltNode>>();
    for (const [at, edge] of into.edges) {
        const ends = [edge.from, edge.to].filter((node) => node.loads.length === 0);
        if (ends.length === 0) {
            continue;
        }

        if (edge.unmatched === "leave-out") {
            into.edges.delete(at);
            missing.set(edge.ref.load, (missing.get(edge.ref.load) ?? 0) + 1);
        } else {
            const set = namedOnly.get(edge.ref.load) ?? new Set();
            ends.forEach((node) => set.add(node));
            namedOnly.set(edge.ref.load, set);
        }
    }

    const named = new Set([...into.edges.values()].flatMap((edge) => [edge.from, edge.to]));
    for (const [at, node] of into.nodes) {
        if (node.loads.length === 0 && !named.has(node)) {
            into.nodes.delete(at);
        }
    }

    for (const [source, count] of missing) {
        into.problems.push({ code: "W_EDGE_END_MISSING", params: { source, count } });
    }

    for (const [source, nodes] of namedOnly) {
        into.problems.push({ code: "W_NODE_NAMED_ONLY", params: { source, count: nodes.size } });
    }
}

/**
 * A value converted to a type as graphty-element's `setType` does it, closely enough: a value that
 * does not convert is null (spec 4.1.6).
 * @param value - The value.
 * @param type - The type.
 * @returns The value.
 */
function converted(value: unknown, type: unknown): unknown {
    if (value === undefined || value === null) {
        return value;
    }

    const text = typeof value === "string" ? value.trim() : JSON.stringify(value);
    switch (type) {
        case "number": {
            const number = typeof value === "number" ? value : Number(text);
            return typeof value === "boolean" || text === "" || Number.isNaN(number) ? null : number;
        }
        case "text":
            return typeof value === "string" ? value : JSON.stringify(value);
        case "boolean": {
            const lower = text.toLowerCase();
            if (["true", "yes", "1"].includes(lower)) {
                return true;
            }

            return ["false", "no", "0"].includes(lower) ? false : null;
        }
        default:
            return value;
    }
}

/**
 * Apply the conversions, in list order, to every node or edge column they name.
 * @param into - The build so far.
 * @param conversions - The conversions.
 */
function convert(into: Building, conversions: readonly JsonObject[]): void {
    for (const { kind, name, type } of conversions) {
        const records = kind === "node" ? into.nodes.values() : into.edges.values();
        for (const record of records) {
            if (String(name) in record.columns) {
                record.columns[String(name)] = converted(record.columns[String(name)], type);
            }
        }
    }
}

/**
 * Apply the reader source's operations, in order (spec 4.1.4). An operation naming an absent
 * element applies to nothing and is reported.
 * @param operations - The operations.
 * @param into - The build so far.
 */
function applyOperations(operations: readonly JsonObject[], into: Building): void {
    const nodeOf = (ref: unknown): BuiltNode | undefined => {
        const checked = nodeRefOf(ref);
        return checked === undefined ? undefined : into.nodes.get(recordKey(checked.space, checked.key));
    };
    const edgeOf = (ref: unknown): BuiltEdge | undefined => {
        const checked = edgeRefOf(ref);
        return checked === undefined ? undefined : into.edges.get(edgeKey(checked));
    };
    const absent = (at: number, ref: unknown): void => {
        into.problems.push({
            code: "W_REFERENCE_UNBOUND",
            params: {
                section: "data",
                pointer: `/sources/reader/copy/operations/${String(at)}`,
                ref: canonicalJson(ref),
            },
        });
    };
    const removeNode = (node: BuiltNode): void => {
        into.nodes.delete(recordKey(node.ref.space, node.ref.key));
        for (const [at, edge] of into.edges) {
            if (edge.from === node || edge.to === node) {
                into.edges.delete(at);
            }
        }
    };

    operations.forEach((operation, at) => {
        const target = operation.node ?? operation.edge;
        switch (operation.op) {
            case "merge": {
                const [kept, gone] = [nodeOf(operation.into), nodeOf(operation.from)];
                if (kept === undefined || gone === undefined) {
                    absent(at, kept === undefined ? operation.into : operation.from);
                    return;
                }

                if (kept === gone) {
                    return;
                }

                for (const [name, value] of Object.entries(gone.columns)) {
                    if (!(name in kept.columns)) {
                        kept.columns[name] = value;
                    }
                }

                gone.loads.forEach((load) => !kept.loads.includes(load) && kept.loads.push(load));
                for (const edge of into.edges.values()) {
                    edge.from = edge.from === gone ? kept : edge.from;
                    edge.to = edge.to === gone ? kept : edge.to;
                }

                into.nodes.delete(recordKey(gone.ref.space, gone.ref.key));
                return;
            }
            case "remove": {
                const node = operation.node === undefined ? undefined : nodeOf(operation.node);
                const edge = operation.edge === undefined ? undefined : edgeOf(operation.edge);
                if (node !== undefined) {
                    removeNode(node);
                } else if (edge !== undefined) {
                    into.edges.delete(edgeKey(edge.ref));
                } else {
                    absent(at, target);
                }

                return;
            }
            case "add": {
                const columns = addedColumns(operation);
                const node = nodeRefOf(operation.node);
                if (node !== undefined) {
                    const added = nodeAt(into, node, node.key);
                    Object.assign(added.columns, columns);
                    added.loads.push(READER);
                    return;
                }

                const [a, b] = [nodeOf(operation.from), nodeOf(operation.to)];
                const ref = edgeRefOf(operation.edge) as EdgeRef;
                if (a === undefined || b === undefined) {
                    absent(at, a === undefined ? operation.from : operation.to);
                    return;
                }

                into.edges.set(edgeKey(ref), { from: a, to: b, columns, ref, unmatched: "add" });
                return;
            }
            default: {
                const element = operation.node === undefined ? edgeOf(operation.edge) : nodeOf(operation.node);
                if (element === undefined) {
                    absent(at, target);
                    return;
                }

                element.columns[String(operation.column)] = operation.value;
            }
        }
    });
}

/** Version 2 source kinds as today's load kinds. */
const LOAD_KINDS: Readonly<Record<string, LoadedSource["kind"]>> = {
    file: "file",
    url: "url",
    network: "server",
    sample: "sample",
    derived: "file",
};

/**
 * A source record as today's load record.
 * @param record - The source record.
 * @param key - Its id, the load's key.
 * @param added - How many nodes and edges it added.
 * @param added.nodes - Nodes.
 * @param added.edges - Edges.
 * @returns The load.
 */
function loadOf(record: JsonObject, key: string, added: { nodes: number; edges: number }): LoadedSource {
    const origin = isPlainObject(record.origin) ? record.origin : {};
    const settings = isPlainObject(record.settings) ? record.settings : {};
    const label = typeof record.label === "string" ? record.label : key;
    const options = isPlainObject(record.options) ? record.options : {};
    return {
        key,
        kind: LOAD_KINDS[String(record.kind)] ?? "file",
        name: label,
        ...(typeof record.format === "string" ? { type: record.format } : {}),
        config: typeof origin.url === "string" ? { ...options, url: origin.url } : options,
        ...(typeof origin.name === "string" ? { fileName: origin.name } : {}),
        ...(typeof origin.size === "number" ? { size: origin.size } : {}),
        ...(typeof origin.url === "string" ? { url: origin.url } : {}),
        ...(typeof record.loaded === "string" ? { loadedAt: record.loaded } : {}),
        tables: [label],
        added,
        counts: added,
        choices: settings,
    };
}

/**
 * Build every node and edge the sources supply, in join order, then the conversions and the
 * reader's operations, without touching the session.
 * @param body - The section's body.
 * @param problems - Collects what the build reports.
 * @returns The build.
 */
function build(body: Readonly<JsonObject>, problems: DocumentProblem[]): Built {
    const section = checked(body);
    const before = problems.length;
    const into: Building = { nodes: new Map(), edges: new Map(), problems };
    const loads: LoadedSource[] = [];
    const unavailable: JsonObject[] = [];
    const copies: Record<string, string> = {};
    let edgeIdColumn: string | undefined;
    const named = new Set(section.joins.map((step) => String(step.source)));
    for (const [at, id] of [...section.sources.keys()].entries()) {
        if (!named.has(id)) {
            // A source no step names is not built (spec 4.1.8 rule 1).
            problems.push({
                code: "W_MEMBER_LEFT_OUT",
                params: { section: "data", pointer: `/sources/${String(at)}` },
            });
        }
    }

    for (const step of section.joins) {
        const source = section.sources.get(String(step.source)) as ReadSource;
        const before = { nodes: into.nodes.size, edges: into.edges.size };
        if (source.embedded) {
            buildSource(source, into);
            copies[source.id] = source.copyId;
            const edges = (source.record.mapping as JsonObject | undefined)?.edges;
            edgeIdColumn ??= isPlainObject(edges) && typeof edges.edgeId === "string" ? edges.edgeId : undefined;
        } else {
            // Not fetched again yet: it supplies nothing, and its record is written back as read.
            problems.push({ code: "W_SOURCE_UNAVAILABLE", params: { source: source.id } });
            unavailable.push(source.record);
        }

        loads.push(
            loadOf(source.record, source.id, {
                nodes: into.nodes.size - before.nodes,
                edges: into.edges.size - before.edges,
            }),
        );
    }

    if (body.repeatedEdges !== undefined && body.repeatedEdges !== "keep") {
        problems.push({ code: "W_MEMBER_LEFT_OUT", params: { section: "data", pointer: "/repeatedEdges" } });
    }

    settleEnds(into);
    convert(into, section.conversions);
    if (section.reader !== undefined) {
        applyOperations(section.reader.operations, into);
        copies[READER] = section.reader.copyId;
    }

    return {
        build: body.build as string,
        nodes: [...into.nodes.values()],
        edges: [...into.edges.values()],
        loads,
        directed: body.directed as boolean,
        ...(edgeIdColumn === undefined ? {} : { edgeIdColumn }),
        copies,
        types: section.types,
        conversions: section.conversions,
        issues: section.issues,
        unavailable,
        origins: [...section.sources.values()].flatMap(({ id, record }) =>
            isPlainObject(record.origin) ? [[id, record.origin] as const] : [],
        ),
        kinds: [...section.sources.values()].map(({ id, record }) => [id, String(record.kind)] as const),
        folded: (section.reader?.operations ?? [])
            .map((operation) => String(operation.op))
            .filter((op) => op !== "add"),
        refused: problems
            .slice(before)
            .some((problem) => problem.code === "W_MEMBER_LEFT_OUT" && problem.params.section === "data"),
    };
}

// ---------------------------------------------------------------------------------------------
// Into the session
// ---------------------------------------------------------------------------------------------

/**
 * Give every built node a session id: a `source:` key keeps the cell it was read from (so `34`
 * stays a number), any other space `<name>:<key>`; a clash takes `<space>:<key>`.
 * @param nodes - The nodes.
 */
function assignIds(nodes: readonly BuiltNode[]): void {
    const used = new Set<NodeId>();
    for (const node of nodes) {
        const { space, key } = node.ref;
        const named = space.startsWith("shared:") ? space.slice("shared:".length) : space;
        let id: NodeId = space.startsWith("source:") ? node.id : `${named}:${key}`;
        if (used.has(id)) {
            id = `${space}:${key}`;
        }

        let at = 2;
        while (used.has(id)) {
            id = `${space}:${key}#${String(at)}`;
            at++;
        }

        used.add(id);
        node.id = id;
    }
}

/**
 * Restore the ignored issues and kept pairs (spec 4.1.7), and the conversions as today's column
 * settings, once the nodes have their session ids.
 * @param built - The build.
 * @param tx - The open's transaction.
 */
async function restoreSettings(built: Built, tx: TransactionScope): Promise<void> {
    const byRef = new Map(built.nodes.map((node) => [recordKey(node.ref.space, node.ref.key), node.id]));
    const idOf = (ref: unknown): NodeId | undefined => {
        const checked = nodeRefOf(ref);
        return checked === undefined ? undefined : byRef.get(recordKey(checked.space, checked.key));
    };
    const ignored = ((built.issues.ignored ?? []) as JsonObject[]).map((issue) =>
        [issue.code, issue.kind, ...(issue.name === undefined ? [] : [issue.name])].map(String).join(":"),
    );
    const kept = ((built.issues.kept ?? []) as JsonObject[]).flatMap((pair) => {
        const ends = [idOf(pair.from), idOf(pair.to)].map(String);
        if (ends.includes("undefined")) {
            return [];
        }

        if (!built.directed) {
            ends.sort(); // NOSONAR(S2871): code-unit order, as the element's pair key sorts
        }

        return [JSON.stringify(ends)];
    });
    if (ignored.length + kept.length > 0) {
        await tx.execute({ op: "data.issues", state: { facts: {}, ignored, kept } });
    }

    if (built.conversions.length > 0) {
        const types = Object.fromEntries(
            built.conversions.map((conversion) => [
                `${String(conversion.kind)}:${String(conversion.name)}`,
                conversion.type,
            ]),
        );
        await tx.execute({
            op: "data.columns",
            settings: { hidden: [], types, renamed: {} } as unknown as ColumnSettings,
        });
    }
}

/**
 * Put a build into the session through the open's transaction, replacing the open data.
 * @param built - The build.
 * @param context - The open's context.
 */
async function apply(built: Built, context: ReadContext): Promise<void> {
    const { tx } = context;
    await tx.data.clear();
    assignIds(built.nodes);
    await tx.execute({
        op: "data.apply",
        mutation: {
            kind: "add-nodes",
            records: built.nodes.map((node) => ({ ...node.columns, id: node.id })),
            idPath: "id",
        },
    });
    const edgesBefore = tx.data.edges().length;
    await tx.execute({
        op: "data.apply",
        mutation: {
            kind: "add-edges",
            records: built.edges.map((edge) => ({ ...edge.columns, source: edge.from.id, target: edge.to.id })),
            source: "source",
            target: "target",
            directed: built.directed,
        },
    });
    const edgeIds = tx.data
        .edges()
        .slice(edgesBefore)
        .map((edge) => edge.id);
    const provenance: Record<string, { nodes: NodeId[]; edges: EdgeId[] }> = {};
    const entry = (key: string): { nodes: NodeId[]; edges: EdgeId[] } => (provenance[key] ??= { nodes: [], edges: [] });
    for (const node of built.nodes) {
        for (const load of node.loads.filter((each) => each !== READER)) {
            entry(load).nodes.push(node.id);
        }
    }

    const readerEdges: [EdgeId, string][] = [];
    built.edges.forEach((edge, at) => {
        const id = edgeIds[at];
        if (id === undefined) {
            return;
        }

        if (edge.ref.load === READER) {
            readerEdges.push([id, edge.ref.key]);
        } else {
            entry(edge.ref.load).edges.push(id);
        }
    });

    const last = built.loads.at(-1);
    if (last !== undefined) {
        await tx.execute({
            op: "data.setSource",
            source: {
                ...(last.type === undefined ? {} : { type: last.type }),
                name: last.name,
                config: last.config ?? {},
            },
            sources: built.loads,
            provenance,
        });
    }

    await restoreSettings(built, tx);
    rememberRead(context.session, {
        build: built.build,
        copies: built.copies,
        types: built.types,
        nodeRefs: built.nodes.map((node) => [node.id, node.ref] as const),
        namedOnly: built.nodes.filter((node) => node.loads.length === 0).map((node) => node.id),
        origins: built.origins,
        kinds: built.kinds,
        folded: built.folded,
        refused: built.refused,
        readerEdges,
        unavailable: built.unavailable,
        ...(built.edgeIdColumn === undefined ? {} : { edgeIdColumn: built.edgeIdColumn }),
    });
    context.restored.add("graph");
}

// ---------------------------------------------------------------------------------------------
// The codec
// ---------------------------------------------------------------------------------------------

/** Each body `holds` built, so the open that follows does not build it again. */
const BUILT = new WeakMap<object, { readonly built: Built; readonly problems: DocumentProblem[] }>();

/** The `graphty-data` section, version 2. */
export const dataCodec: SectionCodec = {
    section: "data",
    version: 2,
    reads: [2],
    bound: false,
    members: ["build", "directed", "repeatedEdges", "sources", "types", "conversions", "issues", "joins", "graph"],
    write(context: WriteContext) {
        return Promise.resolve({ body: dataBodyOf(context.session, context.embed, context.problems).body });
    },
    holds(section: ReadSection, problems: DocumentProblem[]) {
        const found: DocumentProblem[] = [];
        try {
            BUILT.set(section.body, { built: build(section.body, found), problems: found });
            return false;
        } catch (error) {
            if (!(error instanceof Unbuildable)) {
                throw error;
            }

            problems.push(...found);
            return true;
        }
    },
    async read(section: ReadSection, context: ReadContext) {
        if (context.dataMode === "add") {
            // A loaded data section replaces the open data; adding one is refused (spec 8.2 rule 5).
            context.problems.push({
                code: "W_SECTION_KEPT",
                params: { section: "data", version: section.header.version, reason: "add" },
            });
            return;
        }

        let built: Built;
        let problems: DocumentProblem[] = [];
        try {
            const cached = BUILT.get(section.body);
            BUILT.delete(section.body);
            if (cached === undefined) {
                built = build(section.body, problems);
            } else {
                ({ built, problems } = cached);
            }
        } catch (error) {
            if (!(error instanceof Unbuildable)) {
                throw error;
            }

            // Built whole or not at all (spec 4.1.10): nothing is applied. An open holds it before
            // anything is applied (`holds`); this is a codec read on its own.
            context.problems.push(...problems, {
                code: "W_SECTION_KEPT",
                params: { section: "data", version: section.header.version, reason: "data" },
            });
            return;
        }

        context.problems.push(...problems);
        await apply(built, context);
    },
};
