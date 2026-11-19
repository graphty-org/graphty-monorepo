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
 *   `source:reader`, keyed by their ids, their typed ids in the `id` column; one read from an
 *   older file is keyed by a minted ULID, and its session id is that ULID.
 * - The reader source holds only the elements no load supplied, each an `add`; today's edits,
 *   removals and merges are already in the records, so no `edit`, `remove` or `merge` operation is
 *   ever written (read ones are applied, then baked into the copies).
 * - Types: the registry the last open read, its rules on sources still open, then one type per
 *   today's `kind` value, `schema` `{ "type": "object" }`. `joins` is one `join.add` per load,
 *   with the `duplicateIds` the open read on it, each followed by the `off` steps of its source
 *   (not where they were read); then the `off` steps of the sources no step builds, whose records
 *   are written back as read.
 *   `annotations`, `metadata`, `license`, `citation`, `mediaType` and `path` are never written.
 * - On read: only `join.add` builds (by key in the mapping's spaces), with its own `duplicateIds`;
 *   every other step that is not `off` (`join.merge`, `join.node-values`, `join.edge-values`,
 *   `join.edges`), a `join.add` with `columns`, and a second `join.add` of one source hold the
 *   section. A referenced source parsed again with a `pointer`, `sheet` or `missing` option holds
 *   it too: no parser here reads them. `repeatedEdges` other than `keep` is built as `keep` and
 *   reported. A referenced `file` or `url` source is built from the rows an open read again
 *   (dataFetch.ts); one it could not read supplies nothing, is reported `W_SOURCE_UNAVAILABLE` with
 *   why, and its record is written back as read. Types are kept for the next
 *   save, not applied (today's `kind` column is not written from them). `date` and `category`
 *   conversions leave values as read.
 */

import type { EdgeId, NodeId } from "../../../catalog/types";
import { EDGE_ID_CEILING, edgeCounterOf } from "../../../data/edgeIdentity";
import { GraphtyError } from "../../../errors/GraphtyError";
import type { ColumnSettings } from "../../commands/data";
import type { TransactionOptions } from "../../project/Dispatcher";
import type { SourceRefreshReport } from "../../sources/types";
import type { GraphSession, LoadedSource, TransactionScope } from "../../types";
import { token } from "../framing";
import type {
    DocumentProblem,
    EdgeRef,
    JsonObject,
    NodeRef,
    ReadContext,
    ReadSection,
    SectionCodec,
    SourceUnavailableReason,
    WriteContext,
} from "../types";
import { refetch, refetchedOf, refetchOptionsOf } from "./dataFetch";
import {
    canonicalJson,
    dataBodyOf,
    edgeKey,
    edgeRefOf,
    freeColumnName,
    heldRecordOf,
    isPlainObject,
    keepReferenced,
    keyText,
    nodeRefOf,
    numericCell,
    READER,
    recordKey,
    referencedOf,
    rememberRead,
    SOURCE_ID,
    ULID,
} from "./dataRefs";
import { mintUlid } from "./viewParts";

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
/** The join shapes of version 2; only `join.add` is built by this reader (spec 4.1.8). */
const JOIN_OPS = new Set(["join.add", "join.merge", "join.node-values", "join.edge-values", "join.edges"]);
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
    "read",
    "part",
    "columns",
    "rows",
    "except",
    "viaEnd",
    "off",
    "ignoreCase",
    "ignoreSpaces",
    "duplicateIds",
]);
/** What a `join.add` may carry (spec 4.1.8): it reads every table through the source's mapping. */
const ADD_MEMBERS = new Set(["op", "source", "off", "clash", "columns", "duplicateIds"]);
/** A step's own roles (spec 4.1.8 rule 2), closed. */
const READ_MEMBERS = new Set([
    "table",
    "key",
    "space",
    "edgeId",
    "source",
    "sourceSpace",
    "target",
    "targetSpace",
    "weight",
    "weightMeaning",
    "time",
    "timeUnit",
]);
/** The `read` members only a `join.edges` step may carry; `weight` and `time` may be null. */
const EDGE_READ = new Set(["weight", "weightMeaning", "time", "timeUnit"]);
/** Each column role of `read` and the space written exactly when it is. */
const READ_SPACES = [
    ["key", "space"],
    ["source", "sourceSpace"],
    ["target", "targetSpace"],
] as const;
const DUPLICATE_IDS = new Set(["first", "merge", "refuse"]);
/** Parse options this reader's parsers do not read (spec 4.1.2 rule 9): a source parsed again with one is held. */
const UNREAD_OPTIONS = ["pointer", "sheet", "missing"];
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
const RULE_MEMBERS = new Set(["source", "part", "end", "column", "values"]);
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
export function addedValues(operation: JsonObject): JsonObject {
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
    /** Its pointer in the section. */
    readonly pointer: string;
    readonly copyId: string;
    /** Absent for a referenced source not read again. */
    readonly nodes?: Table;
    readonly edges?: Table;
    /** Whether it has rows to build: an embedded copy, or a referenced source read again. */
    readonly embedded: boolean;
    /** For a referenced source read again: the copy id its record names, and the roles its rows are built with. */
    readonly rebuilt?: { readonly expected: string; readonly mapping: JsonObject };
    /** For a referenced source not read again: why, and its new byte count when its copy changed. */
    readonly reason?: SourceUnavailableReason;
    readonly size?: number;
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
        need(edge === undefined || edge.load === READER, `${pointer}/edge`);
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
        need(kind !== "derived", pointer);
        return referencedSource(record, pointer);
    }

    // Tables, or an unknown copy form.
    closed(copy, new Set(["nodes", "edges"]), `${pointer}/copy`);
    const decls = isPlainObject(record.columns) ? record.columns : {};
    return {
        record,
        id,
        pointer,
        copyId: origin.copy,
        embedded: true,
        nodes: tableOf(copy.nodes, decls.nodes, `${pointer}/copy/nodes`),
        edges: tableOf(copy.edges, decls.edges, `${pointer}/copy/edges`),
    };
}

/**
 * A referenced source (spec 8.3): the rows an open read again, built as an embedded copy's are with
 * the roles a copy names (`id`, `source`, `target`) in the record's spaces; or, when the open could
 * not read it, none, and why.
 * @param record - The checked record.
 * @param pointer - Its pointer.
 * @returns The source.
 */
function referencedSource(record: JsonObject, pointer: string): ReadSource {
    const id = String(record.id);
    const expected = String((record.origin as JsonObject).copy);
    const fetched = refetchedOf(record);
    if (fetched === undefined || "unavailable" in fetched) {
        const fetches = record.kind === "file" || record.kind === "url";
        // A network source gets a new copy on every read, so it is held as changed until refreshed.
        const unread: SourceUnavailableReason = record.kind === "network" ? "copy-changed" : "kind";
        const reason = fetched?.unavailable ?? (fetches ? "needs-file" : unread);
        const size = fetched?.size;
        return {
            record,
            id,
            pointer,
            copyId: expected,
            embedded: false,
            reason,
            ...(size === undefined ? {} : { size }),
        };
    }

    const roles = isPlainObject(record.mapping) ? record.mapping : {};
    const nodes = isPlainObject(roles.nodes) ? roles.nodes : undefined;
    const edges = isPlainObject(roles.edges) ? roles.edges : undefined;
    const space = nodes?.space ?? edges?.sourceSpace;
    const mapping: JsonObject = {
        ...(space === undefined ? {} : { nodes: { key: "id", space } }),
        ...(edges === undefined ? {} : { edges: { ...edges, source: "source", target: "target" } }),
    };
    const { tables, columns } = fetched;
    return {
        record,
        id,
        pointer,
        copyId: fetched.copyId,
        embedded: true,
        rebuilt: { expected, mapping },
        nodes: tableOf(tables.nodes, columns.nodes, `${pointer}/copy/nodes`),
        edges: tableOf(tables.edges, columns.edges, `${pointer}/copy/edges`),
    };
}

/**
 * Report each column a referenced source was saved with that the rows read again lack (spec 8.3),
 * and tell whether its bytes changed since the save (only a refresh reads changed bytes).
 * @param source - The source read again.
 * @param problems - Collects the reports.
 * @returns Whether its bytes changed.
 */
function checkRebuilt(source: ReadSource, problems: DocumentProblem[]): boolean {
    const saved = isPlainObject(source.record.columns) ? source.record.columns : {};
    for (const [table, read] of [
        ["nodes", source.nodes],
        ["edges", source.edges],
    ] as const) {
        const names = isPlainObject(saved[table]) ? Object.keys(saved[table]) : [];
        for (const name of names.filter((each) => read === undefined || !(each in read.cells))) {
            problems.push({
                code: "W_MEMBER_LEFT_OUT",
                params: { section: "data", pointer: `${source.pointer}/columns/${table}/${token(name)}` },
            });
        }
    }

    const expected = source.rebuilt?.expected;
    return expected !== undefined && expected !== source.copyId;
}

/** A data section, checked. */
interface Checked {
    readonly sources: ReadonlyMap<string, ReadSource>;
    readonly reader?: { readonly copyId: string; readonly operations: readonly JsonObject[] };
    readonly types: readonly JsonObject[];
    readonly joins: readonly JsonObject[];
    /** The `join.add` step that builds each built source, by source id, in join order. */
    readonly adds: ReadonlyMap<string, JsonObject>;
    readonly conversions: readonly JsonObject[];
    readonly issues: JsonObject;
}

/**
 * Check `{ column, values }` (a step's `rows` or `except`, spec 4.1.8 rule 4).
 * @param value - The member.
 * @param pointer - Its pointer.
 */
function checkRows(value: unknown, pointer: string): void {
    closed(value, new Set(["column", "values"]), pointer);
    need(typeof value.column === "string" && value.column !== "", `${pointer}/column`);
    need(Array.isArray(value.values) && value.values.every((each) => typeof each === "string"), `${pointer}/values`);
}

/**
 * Check a step's own roles (spec 4.1.8 rule 2): closed, each role a working column name (`weight`
 * and `time` may be null), each column role's space written exactly when it is, the edge roles on
 * `join.edges` only.
 * @param read - The member.
 * @param op - The step's op.
 * @param pointer - Its pointer.
 */
function checkRead(read: unknown, op: string, pointer: string): void {
    closed(read, READ_MEMBERS, pointer);
    need(read.table === undefined || read.table === "nodes" || read.table === "edges", `${pointer}/table`);
    for (const [name, value] of Object.entries(read)) {
        const nullable = name === "weight" || name === "time";
        need(name === "table" || (nullable && value === null) || typeof value === "string", `${pointer}/${name}`);
        need(op === "join.edges" || !EDGE_READ.has(name), `${pointer}/${name}`);
    }

    for (const [column, space] of READ_SPACES) {
        need((read[column] === undefined) === (read[space] === undefined), `${pointer}/${space}`);
        if (read[space] !== undefined) {
            spaceOf(read[space], `${pointer}/${space}`);
        }
    }
}

/**
 * Check the choices that split `join.add` from every other step (spec 4.1.8): `join.add` carries
 * only `clash`, `columns` and `duplicateIds`; `ignoreCase` and `ignoreSpaces` belong to the rest.
 * @param step - The step, closed.
 * @param at - A member's pointer.
 */
function checkAddChoices(step: Readonly<JsonObject>, at: (name: string) => string): void {
    if (step.op !== "join.add") {
        need(step.duplicateIds === undefined, at("duplicateIds"));
        for (const name of ["ignoreCase", "ignoreSpaces"]) {
            need(step[name] === undefined || typeof step[name] === "boolean", at(name));
        }

        return;
    }

    for (const name of Object.keys(step)) {
        need(ADD_MEMBERS.has(name), at(name));
    }

    const { duplicateIds } = step;
    need(
        duplicateIds === undefined || (typeof duplicateIds === "string" && DUPLICATE_IDS.has(duplicateIds)),
        at("duplicateIds"),
    );
}

/**
 * Check one join step's shape (spec 4.1.8), whether or not this reader builds it.
 * @param step - The step.
 * @param pointer - Its pointer.
 * @param sources - The section's sources.
 */
function checkStep(
    step: unknown,
    pointer: string,
    sources: ReadonlyMap<string, ReadSource>,
): asserts step is JsonObject {
    closed(step, JOIN_MEMBERS, pointer);
    const { op } = step;
    need(typeof op === "string" && JOIN_OPS.has(op), `${pointer}/op`);
    need(typeof step.source === "string" && sources.has(step.source), `${pointer}/source`);
    need(step.off === undefined || step.off === true, `${pointer}/off`);
    const at = (name: string): string => `${pointer}/${name}`;
    checkAddChoices(step, at);
    const edges = op === "join.edges";
    need(edges === (step.part !== undefined), at("part"));
    need(step.part === undefined || (Number.isSafeInteger(step.part) && Number(step.part) >= 1), at("part"));
    need(step.viaEnd === undefined || (edges && (step.viaEnd === "source" || step.viaEnd === "target")), at("viaEnd"));
    const repeated = edges ? ["first", "last", "both"] : ["first", "last"];
    need(
        step.repeated === undefined || (typeof step.repeated === "string" && repeated.includes(step.repeated)),
        at("repeated"),
    );
    need(
        step.unmatchedRows === undefined ||
            ((edges || op === "join.node-values") &&
                (step.unmatchedRows === "add" || step.unmatchedRows === "leave-out")),
        at("unmatchedRows"),
    );
    need(
        step.columns === undefined ||
            (Array.isArray(step.columns) && step.columns.every((each) => typeof each === "string")),
        at("columns"),
    );
    for (const name of ["rows", "except"]) {
        if (step[name] !== undefined) {
            checkRows(step[name], at(name));
        }
    }

    if (step.read !== undefined) {
        checkRead(step.read, op, at("read"));
    }
}

/**
 * Check the join history (spec 4.1.8) and find the steps this reader builds: one `join.add` per
 * built source, carrying no `columns`. Any other step that is not `off` holds the section, since
 * this reader does not build it; an `off` step is checked, kept and not built.
 * @param joins - The history.
 * @param sources - The section's sources.
 * @returns The `join.add` of each built source.
 */
function checkJoins(joins: readonly unknown[], sources: ReadonlyMap<string, ReadSource>): Map<string, JsonObject> {
    const parts = new Set<string>();
    const adds = new Map<string, JsonObject>();
    joins.forEach((step: unknown, at: number) => {
        const pointer = `/joins/${String(at)}`;
        checkStep(step, pointer, sources);
        if (step.op === "join.edges") {
            // A part names a step among its source's steps (spec 4.1.8 rule 11).
            const part = JSON.stringify([step.source, step.part]);
            need(!parts.has(part), `${pointer}/part`);
            parts.add(part);
        }

        if (step.off === true) {
            return;
        }

        need(step.op === "join.add", `${pointer}/op`);
        need(step.columns === undefined, `${pointer}/columns`);
        need(!adds.has(String(step.source)), `${pointer}/source`);
        adds.set(String(step.source), step);
    });
    return adds;
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
            const at = `${pointer}/rules/${String(index)}`;
            closed(rule, RULE_MEMBERS, at);
            // A part names one `join.edges` step of the rule's source (spec 4.1.5).
            need(rule.part === undefined || (Number.isSafeInteger(rule.part) && Number(rule.part) >= 1), `${at}/part`);
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

    const adds = checkJoins(body.joins, sources);
    for (const id of adds.keys()) {
        const { record, pointer } = sources.get(id) as ReadSource;
        const options = isPlainObject(record.options) ? record.options : {};
        // Parsed again with an option its parser does not read, it would build another graph.
        if (record.copy === undefined) {
            for (const name of UNREAD_OPTIONS) {
                need(!(name in options), `${pointer}/options/${name}`);
            }
        }
    }

    return {
        sources,
        ...(reader === undefined ? {} : { reader }),
        types: body.types as JsonObject[],
        joins: body.joins as JsonObject[],
        adds,
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
    /** The reader operations on what a held source supplies, kept as read. */
    readonly heldOperations: readonly JsonObject[];
    /** Each edge's saved element-assigned id, by its load and then its key (spec 6.2). */
    readonly edgeIds: SavedEdgeIds;
    /** The records of the sources no step builds, kept as read (spec 4.1.8 rule 1). */
    readonly staged: readonly JsonObject[];
    /** The `off` steps, kept as read (spec 4.1.8 rule 8). */
    readonly offSteps: readonly JsonObject[];
    /** The choices a built source's `join.add` carries besides its source, by source id. */
    readonly addChoices: readonly (readonly [string, JsonObject])[];
    /** The referenced sources read again, with the `mapping` each record names. */
    readonly referenced: readonly (readonly [string, JsonObject])[];
}

/** Saved edge ids, by load and then key. */
type SavedEdgeIds = ReadonlyMap<string, ReadonlyMap<string, EdgeId>>;

/** The build so far. */
interface Building {
    readonly nodes: Map<string, BuiltNode>;
    readonly edges: Map<string, BuiltEdge>;
    readonly problems: DocumentProblem[];
    /** The sources held (not read again), by id. */
    readonly held: Set<string>;
    /** The reader operations on what a held source supplies, kept as read for the next save. */
    readonly heldOperations: JsonObject[];
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

    const keys = table.cells[column].map((cell) => keyText(cell)).filter((key) => key !== undefined);
    return new Set(keys).size < keys.length;
}

/**
 * Give a node a row's columns, its key column included (spec 4.1.9). A value an earlier source gave
 * differently is kept beside it as `<column> (<source id>)` (spec 4.1.8 rule 11).
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
            node.columns[freeColumnName(name, source, (each) => each in node.columns)] = value;
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
 * Build one `join.add` step: the source's node rows by key in its space, then its edge rows between
 * the nodes their ends name (spec 4.1.3, 6.1). Repeated keys follow the step's `duplicateIds`, else
 * the source's.
 * @param source - The source.
 * @param into - The build so far.
 * @param step - The step.
 */
function buildSource(source: ReadSource, into: Building, step: Readonly<JsonObject>): void {
    const { record, id } = source;
    const mapping = source.rebuilt?.mapping ?? (isPlainObject(record.mapping) ? record.mapping : {});
    const settings = isPlainObject(record.settings) ? record.settings : {};
    const duplicates = step.duplicateIds ?? settings.duplicateIds;
    const choices: Choices = {
        duplicates: typeof duplicates === "string" ? duplicates : "first",
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
 * Whether a reference may name what a held source supplies: its own space or load, or, while any
 * source is held, a shared space.
 * @param ref - A node or edge reference.
 * @param held - The held sources.
 * @returns Whether it may.
 */
function heldRef(ref: unknown, held: ReadonlySet<string>): boolean {
    if (held.size === 0 || !isPlainObject(ref)) {
        return false;
    }

    if (typeof ref.load === "string") {
        return held.has(ref.load);
    }

    // ponytail: a shared space does not say which source supplied a key; any held source may.
    const space = String(ref.space);
    return !space.startsWith("source:") || held.has(space.slice("source:".length));
}

/**
 * Apply the reader source's operations, in order (spec 4.1.4). An operation naming an absent
 * element applies to nothing and is reported, unless the element may be a held source's: that
 * operation, its `was` included, is kept as read for the next save and a refresh.
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
        if (heldRef(ref, into.held)) {
            into.heldOperations.push(operations[at]);
            return;
        }

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

    const merge = (operation: JsonObject, at: number): void => {
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
    };
    const remove = (operation: JsonObject, at: number): void => {
        const node = operation.node === undefined ? undefined : nodeOf(operation.node);
        const edge = operation.edge === undefined ? undefined : edgeOf(operation.edge);
        if (node !== undefined) {
            removeNode(node);
        } else if (edge !== undefined) {
            into.edges.delete(edgeKey(edge.ref));
        } else {
            absent(at, operation.node ?? operation.edge);
        }
    };
    const add = (operation: JsonObject, at: number): void => {
        const columns = addedValues(operation);
        const node = nodeRefOf(operation.node);
        if (node !== undefined) {
            const added = nodeAt(into, node, columns.id ?? node.key);
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
    };
    const edit = (operation: JsonObject, at: number): void => {
        const element = operation.node === undefined ? edgeOf(operation.edge) : nodeOf(operation.node);
        if (element === undefined) {
            absent(at, operation.node ?? operation.edge);
            return;
        }

        element.columns[String(operation.column)] = operation.value;
    };

    const apply = new Map<unknown, (operation: JsonObject, at: number) => void>([
        ["merge", merge],
        ["remove", remove],
        ["add", add],
    ]);
    operations.forEach((operation, at) => {
        (apply.get(operation.op) ?? edit)(operation, at);
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
 * The `edgeIds` member (spec 6.2): each edge's element-assigned id by its load and key. A value
 * that is not an element-assigned id, one at or above {@link EDGE_ID_CEILING}, or one an earlier
 * edge already names is left out and reported; a file without the member gives none.
 * @param value - The member.
 * @param problems - Collects what is left out.
 * @returns The ids.
 */
function savedEdgeIds(value: unknown, problems: DocumentProblem[]): SavedEdgeIds {
    const saved = new Map<string, Map<string, EdgeId>>();
    if (value === undefined) {
        return saved;
    }

    if (!isPlainObject(value)) {
        problems.push({ code: "W_MEMBER_LEFT_OUT", params: { section: "data", pointer: "/edgeIds" } });
        return saved;
    }

    const named = new Set<string>();
    for (const [load, keys] of Object.entries(value)) {
        if (!isPlainObject(keys)) {
            problems.push({
                code: "W_MEMBER_LEFT_OUT",
                params: { section: "data", pointer: `/edgeIds/${token(load)}` },
            });
            continue;
        }

        const ids = new Map<string, EdgeId>();
        saved.set(load, ids);
        for (const [key, id] of Object.entries(keys)) {
            // Every edge has its own id: one the file names twice goes to the first edge only.
            if (typeof id === "string" && edgeCounterOf(id) < EDGE_ID_CEILING && !named.has(id)) {
                named.add(id);
                ids.set(key, id);
            } else {
                problems.push({
                    code: "W_MEMBER_LEFT_OUT",
                    params: { section: "data", pointer: edgeIdPointer(load, key) },
                });
            }
        }
    }

    return saved;
}

/**
 * The pointer of one saved edge id.
 * @param load - Its load.
 * @param key - Its key.
 * @returns The pointer.
 */
function edgeIdPointer(load: string, key: string): string {
    return `/edgeIds/${token(load)}/${token(key)}`;
}

/**
 * The report of a held source: `W_SOURCE_UNAVAILABLE` with why, and its new size when its copy changed.
 * @param source - The source, not read again.
 * @returns The problem.
 */
function unavailableProblem(source: ReadSource): DocumentProblem {
    return {
        code: "W_SOURCE_UNAVAILABLE",
        params: {
            source: source.id,
            ...(source.reason === undefined ? {} : { reason: source.reason }),
            ...(source.size === undefined ? {} : { size: source.size }),
        },
    };
}

/** What building the join steps gives. */
interface Joined {
    readonly loads: LoadedSource[];
    readonly unavailable: JsonObject[];
    readonly copies: Record<string, string>;
    readonly referenced: [string, JsonObject][];
    /** Whether a referenced source read again has other bytes than saved. */
    readonly changed: boolean;
    readonly edgeIdColumn?: string;
}

/**
 * Build each join step's source, in join order: an embedded or read-again source's rows, or, for a
 * referenced source not read again, nothing, reported.
 * @param section - The checked section.
 * @param into - The build so far.
 * @returns The loads and what each step gave.
 */
function buildJoins(section: Checked, into: Building): Joined {
    const { problems } = into;
    const joined: Joined & { changed: boolean; edgeIdColumn?: string } = {
        loads: [],
        unavailable: [],
        copies: {},
        referenced: [],
        changed: false,
    };
    for (const [id, step] of section.adds) {
        const source = section.sources.get(id) as ReadSource;
        const before = { nodes: into.nodes.size, edges: into.edges.size };
        if (source.embedded) {
            if (source.rebuilt !== undefined) {
                joined.changed = checkRebuilt(source, problems) || joined.changed;
                joined.referenced.push([source.id, source.record.mapping as JsonObject]);
            }

            buildSource(source, into, step);
            joined.copies[source.id] = source.copyId;
            const edges = (source.record.mapping as JsonObject | undefined)?.edges;
            joined.edgeIdColumn ??= isPlainObject(edges) && typeof edges.edgeId === "string" ? edges.edgeId : undefined;
        } else {
            // Not read again: it supplies nothing, its edges' saved ids stay reserved, and its record
            // is written back as read.
            problems.push(unavailableProblem(source));
            joined.unavailable.push(source.record);
        }

        joined.loads.push(
            loadOf(source.record, source.id, {
                nodes: into.nodes.size - before.nodes,
                edges: into.edges.size - before.edges,
            }),
        );
    }

    return joined;
}

/**
 * What the join history keeps that this build does not use, for the next save (spec 4.1.8 rules
 * 1 and 8): each source no step builds (staged, or named only by `off` steps) as its record was
 * read, every `off` step, and the choices each built source's `join.add` carries besides its source.
 * @param section - The checked section.
 * @returns The kept parts.
 */
function joinsKept(section: Checked): Pick<Built, "staged" | "offSteps" | "addChoices"> {
    return {
        staged: [...section.sources.values()].filter(({ id }) => !section.adds.has(id)).map(({ record }) => record),
        offSteps: section.joins.filter((step) => step.off === true),
        addChoices: [...section.adds].flatMap(([id, step]) =>
            step.duplicateIds === undefined ? [] : [[id, { duplicateIds: step.duplicateIds }] as const],
        ),
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
    const held = new Set(
        [...section.sources.values()]
            .filter((source) => !source.embedded && section.adds.has(source.id))
            .map(({ id }) => id),
    );
    const into: Building = { nodes: new Map(), edges: new Map(), problems, held, heldOperations: [] };

    const { loads, unavailable, copies, referenced, changed, edgeIdColumn } = buildJoins(section, into);
    if (body.repeatedEdges !== undefined && body.repeatedEdges !== "keep") {
        problems.push({ code: "W_MEMBER_LEFT_OUT", params: { section: "data", pointer: "/repeatedEdges" } });
    }

    const edgeIds = savedEdgeIds(body.edgeIds, problems);
    settleEnds(into);
    convert(into, section.conversions);
    if (section.reader !== undefined) {
        applyOperations(section.reader.operations, into);
        copies[READER] = section.reader.copyId;
    }

    return {
        // A source whose bytes changed is a new build input (spec 4.1.1).
        build: changed ? mintUlid() : (body.build as string),
        referenced,
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
            .filter((operation) => !into.heldOperations.includes(operation))
            .map((operation) => String(operation.op))
            .filter((op) => op !== "add"),
        edgeIds,
        heldOperations: into.heldOperations,
        ...joinsKept(section),
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
            ends.sort((a, b) => (a < b ? -1 : Number(a > b))); // code-unit order, as the element's pair key sorts
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
async function apply(
    built: Built,
    context: Pick<ReadContext, "session" | "tx" | "problems" | "restored">,
): Promise<void> {
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
    const edgesBefore = tx.data.edges({ scope: "graph" }).length;
    // Each edge takes the id it was saved with; a file saved before ids were kept names none.
    const wanted = built.edges.map((edge) => built.edgeIds.get(edge.ref.load)?.get(edge.ref.key));
    // No edge given a fresh id may take one the file names for a later edge, a group's edge or a
    // source that could not be fetched (whose ids the next save keeps).
    const reserve = [...built.edgeIds.values()].flatMap((ids) => [...ids.values()]);
    await tx.execute({
        op: "data.apply",
        mutation: {
            kind: "add-edges",
            records: built.edges.map((edge) => ({ ...edge.columns, source: edge.from.id, target: edge.to.id })),
            source: "source",
            target: "target",
            directed: built.directed,
            ...(wanted.some((id) => id !== undefined) ? { ids: wanted } : {}),
            ...(reserve.length === 0 ? {} : { reserve }),
        },
    });
    const edgeIds = tx.data
        .edges({ scope: "graph" })
        .slice(edgesBefore)
        .map((edge) => edge.id);
    built.edges.forEach((edge, at) => {
        // Two edges saved with one id: the later gets a fresh one, and its saved id is reported.
        if (wanted[at] !== undefined && edgeIds[at] !== wanted[at]) {
            context.problems.push({
                code: "W_MEMBER_LEFT_OUT",
                params: { section: "data", pointer: edgeIdPointer(edge.ref.load, edge.ref.key) },
            });
        }
    });
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
        heldOperations: built.heldOperations,
        refused: built.refused,
        readerEdges,
        unavailable: built.unavailable,
        edgeIds: built.edgeIds,
        referenced: built.referenced,
        staged: built.staged,
        offSteps: built.offSteps,
        addChoices: built.addChoices,
        ...(built.edgeIdColumn === undefined ? {} : { edgeIdColumn: built.edgeIdColumn }),
    });
    context.restored.add("graph");
}

// ---------------------------------------------------------------------------------------------
// The codec
// ---------------------------------------------------------------------------------------------

/** Each body `holds` built, so the open that follows does not build it again. */
const BUILT = new WeakMap<object, { readonly built: Built; readonly problems: DocumentProblem[] }>();

/** The bodies a read built under a new build stamp, as a referenced source changed since the save. */
const CHANGED = new WeakSet();

/** The `graphty-data` section, version 2. */
export const dataCodec: SectionCodec = {
    section: "data",
    version: 2,
    reads: [2],
    bound: false,
    members: [
        "build",
        "directed",
        "repeatedEdges",
        "sources",
        "types",
        "conversions",
        "issues",
        "joins",
        "edgeIds",
        "graph",
    ],
    write(context: WriteContext) {
        return Promise.resolve({
            body: dataBodyOf(context.session, { embed: context.embed, paths: context.paths ?? {} }, context.problems)
                .body,
        });
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
        if (built.build !== section.body.build) {
            CHANGED.add(section.body);
        }

        await apply(built, context);
    },
    standsAsRead(section: ReadSection) {
        return !CHANGED.has(section.body);
    },
};

// ---------------------------------------------------------------------------------------------
// Refreshing a held source
// ---------------------------------------------------------------------------------------------

/**
 * Rebuild the open data keeping what the reader arranged on it: the collapsed groups are expanded
 * first (so the data holds every member), every node's coordinates and pin are kept, and once the
 * data is rebuilt they are put back and the groups collapsed again in their order. A node the
 * rebuild no longer holds is left out.
 * @param tx - The refresh's transaction.
 * @param rebuild - Rebuilds the data.
 */
async function rebuildKeepingPlaces(tx: TransactionScope, rebuild: () => Promise<void>): Promise<void> {
    const collapsed = tx.groups.list().map(({ groupBy, group }) => ({ groupBy, group }));
    for (const ref of [...collapsed].reverse()) {
        await tx.groups.expand(ref);
    }

    const { order, xyz } = tx.positions.snapshot();
    const mask = tx.positions.pinnedMask();
    await rebuild();
    const held = new Set(tx.data.nodes({ scope: "graph" }).map((node) => node.id));
    const kept = order.flatMap((id, at) => (held.has(id) ? [at] : []));
    if (kept.length > 0) {
        await tx.positions.restore({
            order: kept.map((at) => order[at]),
            xyz: Float32Array.from(kept.flatMap((at) => [xyz[at * 3], xyz[at * 3 + 1], xyz[at * 3 + 2]])),
        });
    }

    const pinned = kept.filter((at) => mask[at] === 1).map((at) => order[at]);
    if (pinned.length > 0) {
        await tx.positions.pin(pinned);
    }

    for (const ref of collapsed) {
        await tx.groups.collapse(ref);
    }
}

/** The error code a refresh that still cannot read a held source rejects with, by why. */
const REFRESH_REFUSED: Readonly<Record<string, "E_TOO_LARGE" | "E_PARSE_FAILED" | "E_FETCH_FAILED">> = {
    "too-large": "E_TOO_LARGE",
    read: "E_PARSE_FAILED",
};

/**
 * Refresh a source a version 2 open held (`W_SOURCE_UNAVAILABLE`; spec 8.3): fetch it, with the
 * permission the call gives, read its new bytes with its saved roles, and build the open data again
 * with it, the reader's operations on what it supplies applied (their `was` as read), as one
 * undoable step. The build gets a new stamp, so a run on the old data goes stale and a save binds it
 * `W_DATA_CHANGED`. Every other source keeps its rows, edge ids and how it is saved.
 * @param session - The session.
 * @param source - The held source's id.
 * @param how - A scratch session to read it in, and the caller's signal.
 * @param how.scratch - Makes the scratch session.
 * @param how.signal - Aborts the fetch.
 * @returns What the refresh added, or undefined when the source is not held.
 * @throws A `GraphtyError`: `E_FETCH_FAILED` (`details.source`, `details.reason`) when it still
 *     cannot be fetched, `E_TOO_LARGE` past the open's size limit, `E_PARSE_FAILED` when its bytes
 *     do not parse; the source stays held.
 */
export async function refreshHeldSource(
    session: GraphSession,
    source: string,
    how: { readonly scratch: () => GraphSession; readonly signal?: AbortSignal },
): Promise<SourceRefreshReport | undefined> {
    const held = heldRecordOf(session, source);
    if (held === undefined) {
        return undefined;
    }

    // Every other source read by reference is built from its rows as the session holds them now.
    const referenced = referencedOf(session);
    const embed = Object.fromEntries(
        [...referenced.keys()].filter((id) => id !== source).map((id) => [id, "embedded" as const]),
    );
    const { body } = dataBodyOf(session, { embed, paths: {} }, []);
    const record = (body.sources as JsonObject[]).find((each) => each.id === source) as JsonObject;
    const opened = refetchOptionsOf(session);
    await refetch(record, {
        ...(opened?.location === undefined ? {} : { location: opened.location }),
        ...(opened?.files === undefined ? {} : { files: opened.files }),
        ...(how.signal === undefined ? {} : { signal: how.signal }),
        fetch: true,
        accept: true,
        limit: opened?.limit ?? Number.POSITIVE_INFINITY,
        builds: () => true,
        scratch: how.scratch,
    });
    const fetched = refetchedOf(record);
    if (fetched !== undefined && "unavailable" in fetched) {
        throw new GraphtyError({
            code: REFRESH_REFUSED[fetched.unavailable] ?? "E_FETCH_FAILED",
            message: `The source ${source} could not be read again (${fetched.unavailable}).`,
            source: "data",
            details: { source, reason: fetched.unavailable },
        });
    }

    const problems: DocumentProblem[] = [];
    const built = build(body, problems);
    const added = {
        nodes: Math.max(0, built.nodes.length - session.data.nodes({ scope: "graph" }).length),
        edges: Math.max(0, built.edges.length - session.data.edges({ scope: "graph" }).length),
    };
    const none = { nodes: 0, edges: 0 };
    let applied = false;
    const options: TransactionOptions = {
        fact: {
            code: "data.replace-source",
            params: { key: source, name: null, added: added.nodes + added.edges, removed: 0, changed: 0 },
        },
    };
    await session.transaction(
        "Refresh source",
        async (tx) => {
            // A save or another refresh may have run while it fetched; held no longer, it is done.
            if (heldRecordOf(session, source) === undefined) {
                return;
            }

            await rebuildKeepingPlaces(tx, () => apply(built, { session, tx, problems, restored: new Set() }));
            keepReferenced(session, referenced, held);
            applied = true;
        },
        options,
    );
    const counts = applied ? added : none;
    return {
        added: counts,
        removed: none,
        updated: none,
        fact: {
            code: applied ? "I_SOURCE_REFRESHED" : "I_SOURCE_UNCHANGED",
            params: { added: [counts.nodes, counts.edges], removed: [0, 0], updated: [0, 0] },
        },
    };
}
