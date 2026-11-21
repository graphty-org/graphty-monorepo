/**
 * @file The `data` section codec, version 2: the build stamp, the source records (embedded or
 * referenced), the reader source's operations, the type registry, conversions, data issues, the
 * join history and the merged graph (spec/README.md 4.1). Experimental (`save-files-v2`).
 *
 * Known gaps: what this writes from today's model, which has no data store
 * (design/data/data-store-options.md is not built), and so cannot fill truthfully:
 *
 * - A source's `copy` is the records it supplied as the session holds them now, not its rows as
 *   parsed: the key column is written `id`, the reader's edits made since the open are in the
 *   cells, a record two sources supplied is in both copies, and `mapping.renamed` is never written.
 *   A node several sources supplied when the file was opened is written into each copy with that
 *   source's own values as read (design 3.10), the values the reader changed since in place. An
 *   edge two loads supplied is in the first one's copy only.
 * - Copy ids: a `file`, `url` or `sample` copy id hashes the copy as written, not the bytes as
 *   read. Each copy id, and the build stamp, is kept while what it stands for is unchanged, told
 *   by an in-memory digest of the copy and of the build inputs (never written, never compared by a
 *   reader); after an open, the ids read are kept for the data as the open built it.
 * - Spaces: today's loads share one id system, so every node a load supplied is in the first
 *   load's space `source:<id>` (keys meet across loads as today's ids do); a node read from a
 *   version 2 file keeps the record key it was read with. The reader's nodes are in
 *   `source:reader`, keyed by their ids, their typed ids in the `id` column; one read from an
 *   older file is keyed by a minted ULID, and its session id is that ULID.
 * - The reader source holds the elements no load supplied, each an `add`, and the `edit`s the open
 *   read whose cells still hold their value, as read (`picked` included); edits, removals and
 *   merges made in the session are already in the records, so no other `edit` and no `remove` or
 *   `merge` is ever written (read ones are applied, then baked into the copies).
 * - Types: the registry the last open read, its rules on sources still open or staged, then one
 *   type per today's `kind` value, `schema` `{ "type": "object" }`; each element holds one. Today's
 *   loads reduce repeated edges by pair alone, as the session has no types and one weight meaning.
 *   `joins` is the history the last open read, in its order: each `join.add` of a source still
 *   built, with the choices the open read on it, and the `off` steps of the sources still built or
 *   staged (whose records are written back as read); then one `join.add` per load since.
 *   `annotations`, `metadata`, `license`, `citation`, `mediaType` and `path` are never written.
 * - On read: only `join.add` builds (by key in the mapping's spaces), with its own `duplicateIds`;
 *   every other step that is not `off` (`join.merge`, `join.node-values`, `join.edge-values`,
 *   `join.edges`), a `join.add` with `columns`, and a second `join.add` of one source hold the
 *   section. A referenced source parsed again with a parse option its format does not read holds
 *   it too: `pointer` is read by `json`, `missing` by `csv`, `json` and `xlsx`, and `sheet` by `xlsx`,
 *   and a malformed value of any holds it as well. `repeatedEdges` reduces repeats of one pair and one type
 *   (spec 6.1), and becomes the session's setting; the writer writes the session's setting back. A
 *   node only edges name is supplied by their sources, not a row of their copies. A referenced `file` or `url` source is built from the rows an open read again
 *   (dataFetch.ts); one it could not read supplies nothing, is reported `W_SOURCE_UNAVAILABLE` with
 *   why, and its record is written back as read. Types are kept for the next
 *   save, not applied (today's `kind` column is not written from them). `date` and `category`
 *   conversions leave values as read.
 */

import type { DuplicatePolicy } from "@graphty/graph-format";

import type { EdgeId, NodeId } from "../../../catalog/types";
import { EDGE_ID_CEILING, edgeCounterOf } from "../../../data/edgeIdentity";
import { GraphtyError } from "../../../errors/GraphtyError";
import type { ColumnSettings } from "../../commands/data";
import type { SessionData } from "../../data";
import type { TransactionOptions } from "../../project/Dispatcher";
import { SOURCE_ATTR } from "../../sources/ids";
import { recordOfLedger } from "../../sources/member";
import { causeParams, type ReadCause } from "../../sources/references";
import { keylessEdgeKeys, keylessNodeKeys } from "../../sources/rowKeys";
import type { SourceLoadRecord, SourceRefreshReport } from "../../sources/types";
import type { GraphSession, LoadedSource, TransactionScope } from "../../types";
import { ignorableOf, isExtensions, token } from "../framing";
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
    readerAddKey,
    recordKey,
    referencedOf,
    rememberRead,
    rowTypeOf,
    SOURCE_ID,
    type SourceExtras,
    TIMESTAMP,
    ULID,
} from "./dataRefs";
import { flushHandles } from "./fileHandles";
import { configOf, readsOption } from "./parseOptions";
import { knownOf, rolesAsRead, type TableRoles } from "./roles";
import { mintUlid } from "./viewParts";

// ---------------------------------------------------------------------------------------------
// Closed objects and vocabularies (spec 4.1, 10)
// ---------------------------------------------------------------------------------------------

/** The source kinds this reader knows; `kind` is an open vocabulary (spec 4.1.2, 10). */
const SOURCE_KINDS = new Set(["file", "url", "network", "sample", "derived"]);
/** The kinds whose copy id hashes the bytes; the rest (network, derived, reader) mint a ULID. */
const HASHED_KINDS = new Set(["file", "url", "sample"]);
/** A hashed copy id: `sha256:` and lowercase hex. */
const SHA256 = /^sha256:[0-9a-f]{64}$/;
/** A network source's closed `origin` (spec 4.1.2). */
const NETWORK_ORIGIN = new Set(["copy", "url", "credentials", "ledger"]);
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
/** A network ledger's members (spec 4.1.2 rule 7), and those of its closed sub-objects. */
const LEDGER = new Set([
    "source",
    "sourceVersion",
    "endpoint",
    "params",
    "limits",
    "pages",
    "next",
    "validators",
    "expand",
    "expansions",
]);
const LEDGER_LIMITS = new Set(["maxNodes", "maxEdges", "maxBytes", "maxRequests", "timeoutMs"]);
const VALIDATORS = new Set(["etag", "lastModified", "modified", "serverVersion", "contentHash"]);
const LEDGER_EXPAND = new Set(["depth", "direction", "limit", "relationshipTypes", "layout"]);
const EXPANSION = new Set(["seeds", "depth", "direction", "limit", "at", "next", "validators"]);
const DIRECTIONS = new Set(["out", "in", "both"]);
const isDirection = (value: unknown): boolean => typeof value === "string" && DIRECTIONS.has(value);
const CONTENT_HASH = /^[0-9a-f]{64}$/;
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
    "timeEnd",
    "timeSpells",
    "timeParseZone",
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
    "timeEnd",
    "timeSpells",
    "timeParseZone",
    "renamed",
]);
const SETTINGS = new Set(["duplicateIds", "unmatched"]);
const TYPE_MEMBERS = new Set(["name", "kind", "plainName", "rules", "schema"]);
const RULE_MEMBERS = new Set(["source", "part", "end", "column", "values"]);
const READER_MEMBERS = new Set(["id", "label", "kind", "origin", "copy", "loaded"]);
/** A reader `merge` is reserved (spec 4.1.4): a session's merges are folded into the copies it embeds. */
const OPERATION_MEMBERS: Readonly<Record<string, ReadonlySet<string>>> = {
    remove: new Set(["op", "node", "edge"]),
    add: new Set(["op", "node", "edge", "from", "to", "columns", "dtypes"]),
    edit: new Set(["op", "node", "edge", "column", "value", "was", "picked"]),
};
/**
 * The clash rules a step may name (spec 4.1.8 rule 11): the held value, the incoming one, both, the
 * smallest or largest (numbers and dates), the mean (numbers), the value most sources hold.
 */
const CLASH_RULES = new Set(["keep", "overwrite", "both", "min", "max", "mean", "vote"]);
const NUMERIC = new Set(["f32", "f64", "i32", "u32", "u8"]);
const REPEATED_EDGES = new Set(["keep", "error", "first", "last", "sum", "min", "max"]);

/** The prefix of the space names reserved for combining graphs (spec 6.1). */
const RESERVED_SPACE = "graph:";

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
 * What the closed objects of a data section carry besides their own members (spec 10,
 * "Must-understand members"): never read for meaning, kept for the next save.
 */
interface Extras {
    /** Each object's kept members, its `extensions`, `ignorable` and the members it names, by its pointer. */
    readonly kept: Map<string, JsonObject>;
    /** The pointer of each member ignored because its object's `ignorable` names it. */
    readonly ignored: string[];
}

/**
 * Check that an object has only members a closed set names. Where `extras` is given the object
 * may also carry `extensions`, `ignorable` and the unknown members `ignorable` names, all kept in
 * `extras`; a malformed slot, or any other unknown member, refuses the build.
 * @param value - The object.
 * @param known - The members it may have.
 * @param pointer - Its pointer.
 * @param extras - Collects what it carries besides its members; absent, it carries nothing else.
 */
function closed(
    value: unknown,
    known: ReadonlySet<string>,
    pointer: string,
    extras?: Extras,
): asserts value is JsonObject {
    need(isPlainObject(value), pointer);
    const listed = extras === undefined ? new Set<string>() : ignorableOf(value.ignorable);
    const kept: JsonObject = {};
    for (const name of Object.keys(value)) {
        if (known.has(name)) {
            continue;
        }

        const at = `${pointer}/${token(name)}`;
        if (extras !== undefined && name === "extensions") {
            need(isExtensions(value.extensions), at);
        } else if (extras !== undefined && name === "ignorable") {
            need(listed !== undefined, at);
        } else {
            need(listed?.has(name) === true, at);
            extras?.ignored.push(at);
        }

        kept[name] = value[name];
    }

    if (extras !== undefined && Object.keys(kept).length > 0) {
        extras.kept.set(pointer, kept);
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
    const read = space.normalize("NFC");
    // Reserved for combining graphs (spec 6.1).
    need(!read.startsWith(RESERVED_SPACE), pointer);
    return read;
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
    /** For a referenced source read again: its node rows repeat a key, as `"refuse"` reads them. */
    readonly repeats?: boolean;
    /** For a referenced source not read again: why, and its new byte count when its copy changed. */
    readonly reason?: SourceUnavailableReason;
    readonly size?: number;
    /** For a referenced source whose read failed: what it threw. */
    readonly cause?: ReadCause;
    /** What its record, origin, mapping and settings carry besides their own members. */
    readonly extras: SourceExtras;
}

/**
 * Check a source's `mapping` (spec 4.1.3).
 * @param mapping - The mapping.
 * @param pointer - Its pointer.
 * @param extras - Collects what its objects carry besides their members.
 */
function checkMapping(mapping: unknown, pointer: string, extras: Extras): void {
    closed(mapping, new Set(["nodes", "edges"]), pointer, extras);
    if (mapping.nodes !== undefined) {
        closed(mapping.nodes, NODE_MAPPING, `${pointer}/nodes`, extras);
        need((mapping.nodes.key === undefined) === (mapping.nodes.space === undefined), `${pointer}/nodes`);
        if (mapping.nodes.space !== undefined) {
            spaceOf(mapping.nodes.space, `${pointer}/nodes/space`);
        }
    }

    if (mapping.edges !== undefined) {
        closed(mapping.edges, EDGE_MAPPING, `${pointer}/edges`, extras);
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
 * @param extras - Collects what it carries besides its members.
 */
function checkOperation(operation: unknown, pointer: string, extras: Extras): void {
    need(isPlainObject(operation), pointer);
    const members = OPERATION_MEMBERS[String(operation.op)];
    need(members !== undefined, `${pointer}/op`);
    closed(operation, members, pointer, extras);
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
 * Check the reader source (spec 4.1.4). Its `origin` and `copy` carry nothing else.
 * @param record - The source record.
 * @param pointer - Its pointer.
 * @param extras - Collects what it and its operations carry besides their members.
 * @returns Its operations.
 */
function checkReader(record: JsonObject, pointer: string, extras: Extras): JsonObject[] {
    closed(record, READER_MEMBERS, pointer, extras);
    need(record.id === READER, `${pointer}/id`);
    closed(record.origin, new Set(["copy"]), `${pointer}/origin`);
    need(typeof record.origin.copy === "string" && ULID.test(record.origin.copy), `${pointer}/origin/copy`);
    closed(record.copy, new Set(["operations"]), `${pointer}/copy`);
    const { operations } = record.copy;
    need(Array.isArray(operations), `${pointer}/copy/operations`);
    operations.forEach((operation: unknown, at: number) => {
        checkOperation(operation, `${pointer}/copy/operations/${String(at)}`, extras);
    });
    return operations as JsonObject[];
}

/**
 * What a source's record, origin, mapping and settings carry besides their own members, as
 * `closed` kept them.
 * @param pointer - The record's pointer.
 * @param extras - What the section's closed objects carry.
 * @returns The source's.
 */
function sourceExtrasOf(pointer: string, extras: Extras): SourceExtras {
    const parts = {
        record: pointer,
        origin: `${pointer}/origin`,
        mapping: `${pointer}/mapping`,
        nodes: `${pointer}/mapping/nodes`,
        edges: `${pointer}/mapping/edges`,
        settings: `${pointer}/settings`,
        options: `${pointer}/options`,
        ledger: `${pointer}/origin/ledger`,
    } as const;
    return Object.fromEntries(
        Object.entries(parts).flatMap(([part, at]) => {
            const kept = extras.kept.get(at);
            return kept === undefined ? [] : [[part, kept]];
        }),
    );
}

/**
 * Whether an embedded copy is in the one form this reader reads (spec 4.1.2 rule 3): tables, an
 * object whose members are `nodes` and/or `edges` and nothing else.
 * @param copy - The copy.
 * @returns True for tables.
 */
function isTables(copy: unknown): copy is JsonObject {
    const names = isPlainObject(copy) ? Object.keys(copy) : [];
    return names.length > 0 && names.every((name) => name === "nodes" || name === "edges");
}

/**
 * Check `validators` (spec 4.1.2 rule 7): closed, each a string, `contentHash` lower-case hex.
 * @param value - The validators.
 * @param pointer - Their pointer.
 */
function checkValidators(value: unknown, pointer: string): void {
    closed(value, VALIDATORS, pointer);
    for (const [name, text] of Object.entries(value)) {
        need(typeof text === "string" && (name !== "contentHash" || CONTENT_HASH.test(text)), `${pointer}/${name}`);
    }
}

/**
 * Whether a value is an integer in a range.
 * @param value - The value.
 * @param min - The least.
 * @param max - The most.
 * @returns True for one.
 */
function isInt(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): boolean {
    return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

/**
 * Check one expansion of a ledger (spec 4.1.2 rule 7): closed, its seeds node references.
 * @param value - The expansion.
 * @param pointer - Its pointer.
 */
function checkExpansion(value: unknown, pointer: string): void {
    closed(value, EXPANSION, pointer);
    const { seeds } = value;
    need(
        Array.isArray(seeds) && seeds.length > 0 && seeds.every((seed) => nodeRefOf(seed) !== undefined),
        `${pointer}/seeds`,
    );
    need(isInt(value.depth, 1, 10), `${pointer}/depth`);
    need(isDirection(value.direction), `${pointer}/direction`);
    need(value.limit === undefined || isInt(value.limit, 1), `${pointer}/limit`);
    need(typeof value.at === "string" && TIMESTAMP.test(value.at), `${pointer}/at`);
    need(value.next === null || isPlainObject(value.next), `${pointer}/next`);
    checkValidators(value.validators, `${pointer}/validators`);
}

/**
 * Check a ledger's `expand` (spec 4.1.2 rule 7): closed, with no trigger.
 * @param expand - The expand behavior.
 * @param pointer - Its pointer.
 */
function checkExpand(expand: unknown, pointer: string): void {
    closed(expand, LEDGER_EXPAND, pointer);
    need(expand.depth === undefined || isInt(expand.depth, 1, 10), `${pointer}/depth`);
    need(expand.direction === undefined || isDirection(expand.direction), `${pointer}/direction`);
    need(expand.limit === undefined || isInt(expand.limit, 1), `${pointer}/limit`);
    need(
        expand.relationshipTypes === undefined ||
            (Array.isArray(expand.relationshipTypes) &&
                expand.relationshipTypes.every((name) => typeof name === "string")),
        `${pointer}/relationshipTypes`,
    );
    need(expand.layout === undefined || expand.layout === "continue" || expand.layout === "none", `${pointer}/layout`);
}

/**
 * Check a network source's `origin.ledger` (spec 4.1.2 rule 7): closed, with the closed-object
 * slots at its top level only.
 * @param ledger - The ledger.
 * @param pointer - Its pointer.
 * @param extras - Collects what its top level carries besides its members.
 */
function checkLedger(ledger: unknown, pointer: string, extras: Extras): void {
    closed(ledger, LEDGER, pointer, extras);
    const { source, limits, expand, expansions } = ledger;
    need(typeof source === "string" && source.length > 0 && source.length <= 128, `${pointer}/source`);
    need(isInt(ledger.sourceVersion, 1), `${pointer}/sourceVersion`);
    need(ledger.endpoint === null || typeof ledger.endpoint === "string", `${pointer}/endpoint`);
    need(isPlainObject(ledger.params), `${pointer}/params`);
    if (limits !== undefined) {
        closed(limits, LEDGER_LIMITS, `${pointer}/limits`);
        for (const [name, value] of Object.entries(limits)) {
            need(isInt(value, 1), `${pointer}/limits/${name}`);
        }
    }

    need(isInt(ledger.pages, 1), `${pointer}/pages`);
    need(ledger.next === null || isPlainObject(ledger.next), `${pointer}/next`);
    checkValidators(ledger.validators, `${pointer}/validators`);
    if (expand !== undefined) {
        checkExpand(expand, `${pointer}/expand`);
    }

    need(Array.isArray(expansions), `${pointer}/expansions`);
    expansions.forEach((expansion: unknown, at: number) => {
        checkExpansion(expansion, `${pointer}/expansions/${String(at)}`);
    });
}

/**
 * What a source's parse options or network ledger hold that this reader cannot read (spec 4.1.2
 * rules 7 and 9). They are read only to read the source again, so they fail that source alone
 * (spec 4.1.10): never the section.
 * @param record - The source record.
 * @param pointer - Its pointer.
 * @param extras - Collects what a readable ledger's top level carries besides its members.
 * @returns Why, and the pointer of each member that cannot be read; undefined when all can.
 */
function unreadOf(
    record: JsonObject,
    pointer: string,
    extras: Extras,
): { readonly reason: "options" | "ledger"; readonly pointers: string[] } | undefined {
    if (record.kind === "network") {
        const ledger = isPlainObject(record.origin) ? record.origin.ledger : undefined;
        if (ledger === undefined) {
            return undefined;
        }

        // Kept only when the whole ledger reads.
        const scratch: Extras = { kept: new Map(), ignored: [] };
        try {
            checkLedger(ledger, `${pointer}/origin/ledger`, scratch);
        } catch (error) {
            if (!(error instanceof Unbuildable)) {
                throw error;
            }

            return { reason: "ledger", pointers: [error.pointer] };
        }

        for (const [at, kept] of scratch.kept) {
            extras.kept.set(at, kept);
        }

        extras.ignored.push(...scratch.ignored);
        return undefined;
    }

    const options = record.options ?? {};
    if (!isPlainObject(options)) {
        return { reason: "options", pointers: [`${pointer}/options`] };
    }

    const format = typeof record.format === "string" ? record.format : undefined;
    const pointers = Object.entries(options)
        .filter(([name, value]) => !readsOption(format, name, value))
        .map(([name]) => `${pointer}/options/${token(name)}`);
    return pointers.length === 0 ? undefined : { reason: "options", pointers };
}

/**
 * Keep what an embedded source's options or ledger hold that this reader cannot read: reported
 * `W_UNKNOWN_MEMBER`, and its options written back as read. The source is built from its copy and
 * is not refreshable.
 * @param record - The source record.
 * @param pointer - Its pointer.
 * @param unread - What cannot be read, as `unreadOf` gave it.
 * @param unread.reason - Options or ledger.
 * @param unread.pointers - Each member's pointer.
 * @param extras - Collects them.
 */
function keepUnread(
    record: JsonObject,
    pointer: string,
    unread: { readonly reason: "options" | "ledger"; readonly pointers: string[] },
    extras: Extras,
): void {
    extras.ignored.push(...unread.pointers);
    if (unread.reason === "options" && isPlainObject(record.options)) {
        const format = typeof record.format === "string" ? record.format : undefined;
        extras.kept.set(
            `${pointer}/options`,
            Object.fromEntries(
                Object.entries(record.options).filter(([name, value]) => !readsOption(format, name, value)),
            ),
        );
    }
}

/**
 * Check what a network source record holds besides what every source does (spec 4.1.2 rule 7):
 * no format or parse options, since its request is its ledger, and a closed origin.
 * @param record - The record.
 * @param pointer - Its pointer.
 * @param extras - Collects what its origin carries besides its members.
 */
function checkNetwork(record: JsonObject, pointer: string, extras: Extras): void {
    need(record.format === undefined && record.options === undefined, pointer);
    const { origin } = record;
    closed(origin, NETWORK_ORIGIN, `${pointer}/origin`, extras);
    closed(origin.credentials ?? {}, new Set(["slot"]), `${pointer}/origin/credentials`);
}

/**
 * Check one source record (spec 4.1.2). A kind this reader does not know, or a copy in a form it
 * cannot read, is that source's state, never the section's (spec 10).
 * @param record - The record.
 * @param pointer - Its pointer.
 * @param extras - Collects what its objects carry besides their members.
 * @returns The source.
 */
function checkSource(record: JsonObject, pointer: string, extras: Extras): ReadSource {
    closed(record, SOURCE_MEMBERS, pointer, extras);
    const { id, kind, origin, copy } = record;
    need(typeof id === "string" && SOURCE_ID.test(id), `${pointer}/id`);
    need(typeof kind === "string" && kind !== "", `${pointer}/kind`);
    need(isPlainObject(origin) && typeof origin.copy === "string", `${pointer}/origin`);
    // The copy id's form follows a known kind: a bytes hash, or a ULID (spec 4.1.2); an embedded
    // copy holding the reader's edits has a ULID whatever its kind. An unknown kind may have either.
    const hashed = HASHED_KINDS.has(kind) && !(copy !== undefined && ULID.test(origin.copy));
    const forms = SOURCE_KINDS.has(kind) ? [hashed ? SHA256 : ULID] : [SHA256, ULID];
    need(
        forms.some((form) => form.test(String(origin.copy))),
        `${pointer}/origin/copy`,
    );
    if (kind === "network") {
        checkNetwork(record, pointer, extras);
    }

    checkMapping(record.mapping ?? {}, `${pointer}/mapping`, extras);
    closed(record.settings ?? {}, SETTINGS, `${pointer}/settings`, extras);
    const unread = unreadOf(record, pointer, extras);
    if (copy === undefined) {
        need(kind !== "derived", pointer);
        const held = sourceExtrasOf(pointer, extras);
        // Options or a ledger it cannot read: its bytes alone would not read as they were read, so
        // it is held and its record written back as read.
        return unread === undefined
            ? referencedSource(record, pointer, held)
            : { record, id, pointer, copyId: origin.copy, embedded: false, reason: unread.reason, extras: held };
    }

    if (unread !== undefined) {
        keepUnread(record, pointer, unread, extras);
    }

    const kept = sourceExtrasOf(pointer, extras);

    need(isPlainObject(copy), `${pointer}/copy`);
    if (!isTables(copy)) {
        // A copy form this reader cannot read: the source alone is held, and written back as read.
        return { record, id, pointer, copyId: origin.copy, embedded: false, reason: "copy-form", extras: kept };
    }

    const decls = isPlainObject(record.columns) ? record.columns : {};
    return {
        record,
        id,
        pointer,
        copyId: origin.copy,
        embedded: true,
        extras: kept,
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
 * @param extras - What its objects carry besides their members.
 * @returns The source.
 */
function referencedSource(record: JsonObject, pointer: string, extras: SourceExtras): ReadSource {
    const id = String(record.id);
    const expected = String((record.origin as JsonObject).copy);
    const fetched = refetchedOf(record);
    if (fetched === undefined || "unavailable" in fetched) {
        const fetches = record.kind === "file" || record.kind === "url";
        // A network source gets a new copy on every read, so it is held as changed until refreshed.
        const unread: SourceUnavailableReason = record.kind === "network" ? "copy-changed" : "kind";
        const reason = fetched?.unavailable ?? (fetches ? "needs-file" : unread);
        const size = fetched?.size;
        const cause = fetched?.cause;
        return {
            record,
            id,
            pointer,
            copyId: expected,
            embedded: false,
            reason,
            extras,
            ...(size === undefined ? {} : { size }),
            ...(cause === undefined ? {} : { cause }),
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
        extras,
        rebuilt: { expected, mapping },
        ...(fetched.repeats === true ? { repeats: true } : {}),
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
    /** What its closed objects carry besides their own members. */
    readonly extras: Extras;
    /** The members the reader source's `add`s carry besides their own, by the element each adds. */
    readonly readerAdds: ReadonlyMap<string, JsonObject>;
}

/**
 * Check `{ column, values }` (a step's `rows` or `except`, spec 4.1.8 rule 4).
 * @param value - The member.
 * @param pointer - Its pointer.
 * @param extras - Collects what it carries besides its members.
 */
function checkRows(value: unknown, pointer: string, extras: Extras): void {
    closed(value, new Set(["column", "values"]), pointer, extras);
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
 * @param extras - Collects what it carries besides its members.
 */
function checkRead(read: unknown, op: string, pointer: string, extras: Extras): void {
    closed(read, READ_MEMBERS, pointer, extras);
    need(read.table === undefined || read.table === "nodes" || read.table === "edges", `${pointer}/table`);
    const kept = extras.kept.get(pointer) ?? {};
    for (const [name, value] of Object.entries(read).filter(([each]) => !(each in kept))) {
        const nullable = name === "weight" || name === "time";
        // A role names a column, never ""; a meaning or a unit may be empty.
        const words = name === "weightMeaning" || name === "timeUnit";
        need(
            name === "table" || (nullable && value === null) || (typeof value === "string" && (words || value !== "")),
            `${pointer}/${name}`,
        );
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
 * Check a step's `clash` (spec 4.1.8 rule 11): one rule, or rules keyed by working column name with
 * `"*"` for the rest. A rule this reader does not know holds the section.
 * @param clash - The member.
 * @param pointer - Its pointer.
 */
function checkClash(clash: unknown, pointer: string): void {
    if (clash === undefined || typeof clash === "string") {
        need(clash === undefined || CLASH_RULES.has(clash), pointer);
        return;
    }

    need(isPlainObject(clash) && Object.keys(clash).length > 0, pointer);
    for (const [column, rule] of Object.entries(clash)) {
        need(column !== "" && typeof rule === "string" && CLASH_RULES.has(rule), `${pointer}/${token(column)}`);
    }
}

/**
 * Check the choices that split `join.add` from every other step (spec 4.1.8): `join.add` carries
 * only `clash`, `columns` and `duplicateIds`; `ignoreCase` and `ignoreSpaces` belong to the rest.
 * @param step - The step, closed.
 * @param at - A member's pointer.
 * @param kept - What the step carries besides its members, if anything.
 */
function checkAddChoices(
    step: Readonly<JsonObject>,
    at: (name: string) => string,
    kept: Readonly<JsonObject> = {},
): void {
    if (step.op !== "join.add") {
        need(step.duplicateIds === undefined, at("duplicateIds"));
        for (const name of ["ignoreCase", "ignoreSpaces"]) {
            need(step[name] === undefined || typeof step[name] === "boolean", at(name));
        }

        return;
    }

    for (const name of Object.keys(step)) {
        need(ADD_MEMBERS.has(name) || name in kept, at(name));
    }

    const { duplicateIds } = step;
    need(
        duplicateIds === undefined || (typeof duplicateIds === "string" && DUPLICATE_IDS.has(duplicateIds)),
        at("duplicateIds"),
    );
}

/**
 * Check a join step's `source` and `off`, and, for an `off` step, its `op`: all an off step is
 * checked for (spec 4.1.8 rule 8).
 * @param step - The step.
 * @param pointer - Its pointer.
 * @param sources - The section's sources.
 * @returns Whether the step is off.
 */
function isOffStep(step: Readonly<JsonObject>, pointer: string, sources: ReadonlyMap<string, ReadSource>): boolean {
    need(typeof step.source === "string" && sources.has(step.source), `${pointer}/source`);
    need(step.off === undefined || step.off === true, `${pointer}/off`);
    if (step.off !== true) {
        return false;
    }

    need(typeof step.op === "string" && step.op !== "", `${pointer}/op`);
    return true;
}

/**
 * Check one join step's shape (spec 4.1.8), whether or not this reader builds it. An `off` step is
 * checked only for its `op`, `source` and `off`: it is kept as read and not built, whatever its op.
 * @param step - The step.
 * @param pointer - Its pointer.
 * @param sources - The section's sources.
 * @param extras - Collects what it carries besides its members.
 */
function checkStep(
    step: unknown,
    pointer: string,
    sources: ReadonlyMap<string, ReadSource>,
    extras: Extras,
): asserts step is JsonObject {
    need(isPlainObject(step), pointer);
    if (isOffStep(step, pointer, sources)) {
        return;
    }

    closed(step, JOIN_MEMBERS, pointer, extras);
    const { op } = step;
    need(typeof op === "string" && JOIN_OPS.has(op), `${pointer}/op`);
    const at = (name: string): string => `${pointer}/${name}`;
    checkAddChoices(step, at, extras.kept.get(pointer));
    checkClash(step.clash, at("clash"));
    for (const name of ["edges", "via"]) {
        need(step[name] === undefined || (typeof step[name] === "string" && step[name] !== ""), at(name));
    }

    need(op !== "join.edge-values" || step.edges !== undefined, at("edges"));
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
            (Array.isArray(step.columns) &&
                step.columns.every((each) => typeof each === "string") &&
                new Set(step.columns).size === step.columns.length),
        at("columns"),
    );
    for (const name of ["rows", "except"]) {
        if (step[name] !== undefined) {
            checkRows(step[name], at(name), extras);
        }
    }

    if (step.read !== undefined) {
        checkRead(step.read, op, at("read"), extras);
    }

    // A fan-out translation (`mapping.many`) is reserved (spec 4.1.8 rule 10).
    need(!isPlainObject(step.mapping) || !("many" in step.mapping), at("mapping"));
}

/**
 * Check the join history (spec 4.1.8) and find the steps this reader builds: one `join.add` per
 * built source, carrying no `columns`. Any other step that is not `off` holds the section, since
 * this reader does not build it; an `off` step is checked, kept and not built.
 * @param joins - The history.
 * @param sources - The section's sources.
 * @param extras - Collects what the steps carry besides their members.
 * @returns The `join.add` of each built source.
 */
function checkJoins(
    joins: readonly unknown[],
    sources: ReadonlyMap<string, ReadSource>,
    extras: Extras,
): Map<string, JsonObject> {
    const parts = new Set<string>();
    const adds = new Map<string, JsonObject>();
    joins.forEach((step: unknown, at: number) => {
        const pointer = `/joins/${String(at)}`;
        checkStep(step, pointer, sources, extras);
        if (step.off === true) {
            return;
        }

        if (step.op === "join.edges") {
            // A part names a step among its source's steps (spec 4.1.8 rule 11).
            const part = JSON.stringify([step.source, step.part]);
            need(!parts.has(part), `${pointer}/part`);
            parts.add(part);
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
 * @param extras - Collects what the types and their rules carry besides their members.
 */
function checkRegistry(body: Readonly<JsonObject>, extras: Extras): void {
    need(Array.isArray(body.types), "/types");
    body.types.forEach((type: unknown, at: number) => {
        const pointer = `/types/${String(at)}`;
        closed(type, TYPE_MEMBERS, pointer, extras);
        need(type.kind === "node" || type.kind === "edge", `${pointer}/kind`);
        need(Array.isArray(type.rules), `${pointer}/rules`);
        (type.rules as unknown[]).forEach((rule, index) => {
            const at = `${pointer}/rules/${String(index)}`;
            closed(rule, RULE_MEMBERS, at, extras);
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
    const extras: Extras = { kept: new Map(), ignored: [] };
    checkRegistry(body, extras);
    const sources = new Map<string, ReadSource>();
    const readerAdds = new Map<string, JsonObject>();
    let reader: Checked["reader"];
    body.sources.forEach((record: unknown, at: number) => {
        const pointer = `/sources/${String(at)}`;
        need(isPlainObject(record) && typeof record.kind === "string", pointer);
        if (record.kind === "reader") {
            need(reader === undefined, pointer);
            const operations = checkReader(record, pointer, extras);
            reader = { copyId: String((record.origin as JsonObject).copy), operations };
            keepReaderAdds(operations, pointer, extras, readerAdds);
            return;
        }

        const source = checkSource(record, pointer, extras);
        need(!sources.has(source.id), `${pointer}/id`);
        sources.set(source.id, source);
    });

    // A pick names the source whose value it took (spec 4.1.4).
    reader?.operations.forEach((operation, at) => {
        const { picked } = operation;
        need(
            picked === undefined || (typeof picked === "string" && sources.has(picked)),
            `/sources/reader/copy/operations/${String(at)}/picked`,
        );
    });
    const adds = checkJoins(body.joins, sources, extras);
    return {
        sources,
        ...(reader === undefined ? {} : { reader }),
        types: body.types as JsonObject[],
        joins: body.joins as JsonObject[],
        adds,
        conversions: (body.conversions ?? []) as JsonObject[],
        issues: (body.issues ?? {}) as JsonObject,
        extras,
        readerAdds,
    };
}

/**
 * Keep what each reader `add` carries besides its members, by the element it adds, since a save
 * writes the reader's adds from the session rather than as read (spec 10, rule 5).
 * @param operations - The reader's operations, checked.
 * @param pointer - The reader source's pointer.
 * @param extras - What the closed objects carry.
 * @param into - Collects them, by `readerAddKey`.
 */
function keepReaderAdds(
    operations: readonly JsonObject[],
    pointer: string,
    extras: Extras,
    into: Map<string, JsonObject>,
): void {
    const record = extras.kept.get(pointer);
    if (record !== undefined) {
        into.set(READER, record);
    }

    operations.forEach((operation, at) => {
        const kept = extras.kept.get(`${pointer}/copy/operations/${String(at)}`);
        if (operation.op === "add" && kept !== undefined) {
            into.set(readerAddKey(operation.node, operation.edge), kept);
        }
    });
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
    /** Each source's own value of a column, by column and then source id, in step order. */
    readonly own: Map<string, Map<string, unknown>>;
    /** Supplied by no source's rows: only edges name it, and their sources supply it (spec 4.1.9). */
    named?: boolean;
}

/** An edge being built. */
interface BuiltEdge {
    from: BuiltNode;
    to: BuiltNode;
    columns: JsonObject;
    readonly ref: EdgeRef;
    /** The minting source's `unmatched`. */
    readonly unmatched: string;
    /** The sources whose rows it was reduced from, in step order, the minting source first. */
    readonly loads: string[];
    /** Its row in its source's edge table, for a row a copy built. */
    readonly row?: number;
}

/** An edge reduced from several rows: its columns as reduced, and its rows as read, its own first. */
interface ReducedRows {
    baseline: JsonObject;
    readonly rows: BuiltEdge[];
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
    /** The join history as read, its `off` steps among it (spec 4.1.8 rule 8). */
    readonly joins: readonly JsonObject[];
    /** The choices a built source's `join.add` carries besides its source, by source id. */
    readonly addChoices: readonly (readonly [string, JsonObject])[];
    /** The referenced sources read again, with the `mapping` each record names. */
    readonly referenced: readonly (readonly [string, JsonObject])[];
    /** The edges reduced into another, by their own `edgeKey` (spec 6.1). */
    readonly aliases: ReadonlyMap<string, BuiltEdge>;
    /** Each edge reduced from several rows, and those rows. */
    readonly reduced: ReadonlyMap<BuiltEdge, ReducedRows>;
    /** The graph's `repeatedEdges`. */
    readonly repeatedEdges: DuplicatePolicy;
    /** The `knownFields` settings the built sources' roles give, and the roles they differ on. */
    readonly roles: ReturnType<typeof knownOf>;
    /** Each built source's roles as its mapping names them, by source id. */
    readonly sourceRoles: readonly (readonly [string, TableRoles])[];
    /** The reader's edits applied, each with its cell's value before it. */
    readonly edits: readonly BuiltEdit[];
    /**
     * Each node several sources supply: the columns it shows before the reader's edits, and each
     * source's own row, so a save writes every source's own value back (design 3.10).
     */
    readonly shared: ReadonlyMap<BuiltNode, { readonly baseline: JsonObject; readonly rows: Map<string, JsonObject> }>;
    /** What each source's record, origin, mapping and settings carry besides their members, by source id. */
    readonly extras: readonly (readonly [string, SourceExtras])[];
    /** What the reader source and its `add`s carry besides their members (`readerAddKey`). */
    readonly readerAdds: ReadonlyMap<string, JsonObject>;
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
    /** The edges reduced into another, by their own `edgeKey`: aliases of the edge kept (spec 6.1). */
    readonly aliases: Map<string, BuiltEdge>;
    /** Each edge reduced from several rows, and those rows as read, so a save writes them back. */
    readonly reduced: Map<BuiltEdge, ReducedRows>;
    /** The reader's edits applied, in order, each with the value its cell held before it. */
    readonly edits: BuiltEdit[];
}

/** A reader `edit` the build applied, and the value its cell held before it (undefined: none). */
interface BuiltEdit {
    readonly operation: JsonObject;
    readonly node?: BuiltNode;
    readonly edge?: BuiltEdge;
    readonly column: string;
    readonly before: unknown;
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
        node = { id: cell as NodeId, ref, columns: {}, loads: [], own: new Map() };
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

/** A step's clash rules (spec 4.1.8 rule 11), as a build applies them to one source's rows. */
interface Clash {
    /** The rule for a working column: its own, else `"*"`'s, else `keep`. */
    readonly ruleOf: (column: string) => string;
    /** The step's place in the join history, for reports. */
    readonly step: number;
    /** The cells a number or date rule met another value in, kept held, by column. */
    readonly mistyped: Map<string, number>;
}

/** A date written as text, as a numeric clash rule reads it: an ISO 8601 date or date and time. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/**
 * The value a computing rule (`min`, `max`, `mean`, `vote`) shows over every source's own value of
 * a cell, or undefined when a value does not fit the rule (a number rule meeting text): the held
 * value then stays.
 * @param rule - The rule.
 * @param values - Each source's value, in step order, the held source's first.
 * @returns The value shown.
 */
function computed(rule: string, values: readonly unknown[]): unknown {
    if (rule === "vote") {
        // The value most sources hold; a tie keeps the held value.
        const counts = new Map<string, { value: unknown; count: number }>();
        for (const value of values) {
            const at = canonicalJson(value);
            const entry = counts.get(at) ?? { value, count: 0 };
            entry.count++;
            counts.set(at, entry);
        }

        const ranked = [...counts.values()].sort((a, b) => b.count - a.count);
        return ranked.length > 1 && ranked[0].count === ranked[1].count ? values[0] : ranked[0].value;
    }

    if (values.every((value) => typeof value === "number" && Number.isFinite(value))) {
        const numbers = values as number[];
        if (rule === "mean") {
            return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
        }

        return rule === "min" ? Math.min(...numbers) : Math.max(...numbers);
    }

    const dated = values.every(
        (value) => typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value)),
    );
    if (rule === "mean" || !dated) {
        return undefined;
    }

    const times = values.map((value) => Date.parse(String(value)));
    const best = rule === "min" ? Math.min(...times) : Math.max(...times);
    return values[times.indexOf(best)];
}

/**
 * Give a node a row's columns, its key column included (spec 4.1.9). A cell an earlier source
 * filled is decided by the step's clash rule (spec 4.1.8 rule 11): `keep` (the default) leaves the
 * held value, `overwrite` takes the incoming one, `both` keeps the held value and writes the
 * incoming one as `<column> (<source id>)`, and `min`, `max`, `mean` and `vote` show what they
 * compute over every source's own value of the cell so far. An empty held cell is filled. The
 * source's key column never clashes: the key is what matched the row to the node.
 * @param node - The node.
 * @param values - The row.
 * @param from - The row's source.
 * @param from.source - Its id.
 * @param from.key - Its key column.
 * @param repeated - The source gave the node a row already (`duplicateIds: "merge"`).
 * @param clash - The step's clash rules.
 */
function takeColumns(
    node: BuiltNode,
    values: Readonly<JsonObject>,
    { source, key }: { readonly source: string; readonly key?: string },
    repeated: boolean,
    clash: Clash,
): void {
    for (const [name, value] of Object.entries(values)) {
        const own = node.own.get(name) ?? new Map<string, unknown>();
        node.own.set(name, own);
        if (repeated) {
            // The first row's values stand, as an edge's do; a later row only fills an unset column.
            node.columns[name] ??= value;
            if (own.get(source) === undefined || own.get(source) === null) {
                own.set(source, value);
            }

            continue;
        }

        const held = node.columns[name];
        if (!own.has(source)) {
            own.set(source, value);
        }

        if (held === undefined || held === null) {
            node.columns[name] = value;
            continue;
        }

        if (name !== key) {
            decideClash(node, { name, value, source }, clash);
        }
    }
}

/**
 * Decide one filled cell a later source gives a value for, by the step's rule for its column.
 * @param node - The node.
 * @param cell - The column, the incoming value and its source.
 * @param cell.name - The working column.
 * @param cell.value - The incoming value.
 * @param cell.source - Its source id.
 * @param clash - The step's clash rules.
 */
function decideClash(
    node: BuiltNode,
    { name, value, source }: { readonly name: string; readonly value: unknown; readonly source: string },
    clash: Clash,
): void {
    const rule = clash.ruleOf(name);
    if (rule === "both") {
        // The clash column exists whether or not the values differ, so a refresh never deletes it.
        node.columns[freeColumnName(name, source, (each) => each in node.columns)] = value;
        return;
    }

    if (canonicalJson(node.columns[name]) === canonicalJson(value) || rule === "keep") {
        return;
    }

    const own = [...(node.own.get(name)?.values() ?? [])].filter((each) => each !== undefined && each !== null);
    const shown = rule === "overwrite" ? value : computed(rule, own);
    if (shown === undefined) {
        clash.mistyped.set(name, (clash.mistyped.get(name) ?? 0) + 1);
    } else {
        node.columns[name] = shown;
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
 * Report the rows of a source left out for an empty key or end cell, per column (`W_KEY_EMPTY`).
 * @param into - The build so far.
 * @param source - The source id.
 * @param empty - The rows left out, by the column whose cell was empty.
 */
function reportEmpty(into: Building, source: string, empty: ReadonlyMap<string, number>): void {
    for (const [column, rows] of empty) {
        into.problems.push({ code: "W_KEY_EMPTY", params: { source, column, rows } });
    }
}

/**
 * Build a source's node rows by key in its space. With no key column every row is keyless (spec
 * 4.1.3 rule 2): it is keyed by its content (spec 6.1), in the space `source:<source id>`. A row whose key cell is null
 * or empty is left out and counted (spec 6.1).
 * @param source - The source.
 * @param into - The build so far.
 * @param nodeMap - Its node mapping.
 * @param duplicates - Its `duplicateIds`.
 * @param clash - The step's clash rules.
 */
function buildNodes(source: ReadSource, into: Building, nodeMap: JsonObject, duplicates: string, clash: Clash): void {
    const { id, nodes } = source;
    const keyColumn = typeof nodeMap.key === "string" ? nodeMap.key : undefined;
    const rows = Array.from({ length: nodes?.length ?? 0 }, (_, row) => rowOf(nodes as Table, row));
    const keyless = keyColumn === undefined ? keylessNodeKeys(rows) : [];
    const keyedSpace = keyColumn === undefined ? undefined : String(nodeMap.space).normalize("NFC");
    const seen = new Set<BuiltNode>();
    const empty = new Map<string, number>();
    for (const [row, values] of rows.entries()) {
        const cell = keyColumn === undefined ? undefined : values[keyColumn];
        const keyed = keyText(cell);
        if (keyColumn !== undefined && keyed === undefined) {
            empty.set(keyColumn, (empty.get(keyColumn) ?? 0) + 1);
            continue;
        }

        const ref = keyedRef(keyedSpace, keyed) ?? { space: `source:${id}`, key: keyless[row] };
        supplyNode(nodeAt(into, ref, keyed === undefined ? ref.key : cell), values, id, {
            seen,
            duplicates,
            clash,
            key: keyColumn,
        });
    }

    reportEmpty(into, id, empty);
}

/**
 * Give a node one row of a source: its values and the source, unless the row repeats a key the
 * source gave already under `duplicateIds: "first"`.
 * @param node - The node.
 * @param values - The row.
 * @param source - The source id.
 * @param repeats - What the source gave so far, its `duplicateIds` and the step's clash rules.
 * @param repeats.seen - The nodes the source gave a row already.
 * @param repeats.duplicates - Its `duplicateIds`.
 * @param repeats.clash - The step's clash rules.
 * @param repeats.key - The source's key column.
 */
function supplyNode(
    node: BuiltNode,
    values: Readonly<JsonObject>,
    source: string,
    repeats: {
        readonly seen: Set<BuiltNode>;
        readonly duplicates: string;
        readonly clash: Clash;
        readonly key?: string;
    },
): void {
    const repeated = repeats.seen.has(node);
    if (repeated && repeats.duplicates === "first") {
        return;
    }

    takeColumns(node, values, { source, key: repeats.key }, repeated, repeats.clash);
    repeats.seen.add(node);
    if (!node.loads.includes(source)) {
        node.loads.push(source);
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
    const { id, edges } = source;
    const edgeId = typeof edgeMap.edgeId === "string" ? edgeMap.edgeId : undefined;
    const [from, to] = [String(edgeMap.source), String(edgeMap.target)];
    const rows = Array.from({ length: edges?.length ?? 0 }, (_, row) => rowOf(edges as Table, row));
    const keyless = keylessEdgeKeys(rows, { source: from, target: to, edgeId });
    const [fromSpace, toSpace] = [String(edgeMap.sourceSpace), String(edgeMap.targetSpace)].map((each) =>
        each.normalize("NFC"),
    );
    const own = new Set<BuiltEdge>();
    const empty = new Map<string, number>();
    for (const [row, values] of rows.entries()) {
        const [a, b] = [keyText(values[from]), keyText(values[to])];
        if (a === undefined || b === undefined) {
            // An empty end never becomes a node: the row is left out and counted (spec 6.1).
            const column = a === undefined ? from : to;
            empty.set(column, (empty.get(column) ?? 0) + 1);
            continue;
        }

        const key = (edgeId === undefined ? undefined : keyText(values[edgeId])) ?? String(keyless[row]);
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
                loads: [id],
                row,
            };
            own.add(edge);
            into.edges.set(edgeKey(ref), edge);
        } else if (choices.duplicates === "merge") {
            // The first row's values stand; a later row only fills a column the first left unset.
            Object.entries(columns).forEach(([name, value]) => (existing.columns[name] ??= value));
        }
    }

    reportEmpty(into, id, empty);
}

/**
 * Build one `join.add` step: the source's node rows by key in its space, then its edge rows between
 * the nodes their ends name (spec 4.1.3, 6.1). Repeated keys follow the step's `duplicateIds`, else
 * the source's.
 * @param source - The source.
 * @param into - The build so far.
 * @param step - The step.
 * @param at - Its place in the join history.
 */
function buildSource(source: ReadSource, into: Building, step: Readonly<JsonObject>, at: number): void {
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
    const repeats = source.repeats === true || repeatsKey(source.nodes, keyColumn) || repeatsKey(source.edges, edgeId);
    if (choices.duplicates === "refuse" && repeats) {
        into.problems.push({ code: "W_MEMBER_LEFT_OUT", params: { section: "data", pointer: `/sources/${id}` } });
        return;
    }

    const rules = step.clash as string | Readonly<Record<string, string>> | undefined;
    const clash: Clash = {
        ruleOf: (column) => (typeof rules === "string" ? rules : (rules?.[column] ?? rules?.["*"] ?? "keep")),
        step: at,
        mistyped: new Map(),
    };
    buildNodes(source, into, nodeMap, choices.duplicates, clash);
    // A number or date rule meeting another value keeps the held value, and is counted.
    for (const [column, cells] of clash.mistyped) {
        into.problems.push({
            code: "W_CLASH_RULE_TYPE",
            params: { step: at, column, rule: clash.ruleOf(column), cells },
        });
    }
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
 * Give each node no source's rows supply (only edges name it) the sources whose edges reach it, in
 * step order, as its `_source.loads` (spec 4.1.9). Decided after the build, so load order never
 * changes which source supplies it.
 * @param into - The build so far.
 */
function creditNamed(into: Building): void {
    for (const edge of into.edges.values()) {
        for (const node of [edge.from, edge.to]) {
            node.named ||= node.loads.length === 0;
            for (const load of node.named ? edge.loads : []) {
                if (!node.loads.includes(load)) {
                    node.loads.push(load);
                }
            }
        }
    }
}

/**
 * Keep the rows an edge is reduced from, as read, so a save writes them back (spec 6.1).
 * @param into - The build so far.
 * @param first - The edge kept.
 * @param edge - The edge folded into it.
 * @returns The kept edge's own row's columns, as read.
 */
function keepRows(into: Building, first: BuiltEdge, edge: BuiltEdge): JsonObject {
    let reduced = into.reduced.get(first);
    if (reduced === undefined) {
        reduced = { baseline: {}, rows: [{ ...first, columns: { ...first.columns } }] };
        into.reduced.set(first, reduced);
    }

    reduced.rows.push(edge);
    return reduced.rows[0].columns;
}

/**
 * The columns an edge reduced under `last` takes: the last row's values, but the first row's key,
 * so the edge-id cell stays the first's (spec 6.1).
 * @param edge - The last row's edge.
 * @param own - The kept edge's own row's columns, as read.
 * @param idColumns - The kept edge's and the last row's edge-id columns.
 * @returns The columns.
 */
function lastColumns(edge: BuiltEdge, own: JsonObject, idColumns: readonly (string | undefined)[]): JsonObject {
    const [kept, its] = idColumns;
    const columns = Object.fromEntries(Object.entries(edge.columns).filter(([name]) => name !== its));
    if (kept !== undefined && kept in own) {
        columns[kept] = own[kept];
    }

    return columns;
}

/** The `repeatedEdges` values that combine weights, and so reduce only repeats of one weight meaning. */
const COMBINING: Readonly<Record<string, (held: number, next: number) => number>> = {
    sum: (held, next) => held + next,
    min: Math.min,
    max: Math.max,
};

/**
 * Reduce repeated edges by the graph's `repeatedEdges` (spec 4.1.8 rule 6, 6.1): the edges between
 * one pair of nodes (unordered on an undirected graph), within one step or across sources, fold
 * into the first. Edges of two types never fold, and under `sum`, `min` and `max` neither do edges
 * whose sources' weight meanings differ: only `first` and `last` reduce those. The edge kept keeps
 * the first row's key and load, lists every contributing source, and takes the reduced weight (or,
 * under `last`, the last row's values); each folded edge's reference becomes its alias. `error`
 * with any repeat holds the section, as a load refuses it (`E_DUPLICATE_EDGE`).
 * @param into - The build so far.
 * @param section - The checked section: its types and sources.
 * @param graph - The graph's `repeatedEdges` and direction.
 * @param graph.policy - `repeatedEdges`.
 * @param graph.directed - Whether pairs are ordered.
 */
function reduceRepeats(into: Building, section: Checked, graph: { policy: string; directed: boolean }): void {
    const { policy, directed } = graph;
    if (policy === "keep") {
        return;
    }

    const roles = (load: string): { weight?: string; edgeId?: string; meaning: unknown } => {
        const source = section.sources.get(load);
        const mapping = source?.rebuilt?.mapping ?? source?.record.mapping;
        const edges = isPlainObject(mapping) && isPlainObject(mapping.edges) ? mapping.edges : {};
        return {
            ...(typeof edges.weight === "string" ? { weight: edges.weight } : {}),
            ...(typeof edges.edgeId === "string" ? { edgeId: edges.edgeId } : {}),
            meaning: edges.weightMeaning ?? null,
        };
    };
    const weightOf = (edge: BuiltEdge): number => {
        const { weight } = roles(edge.ref.load);
        const value = weight === undefined ? undefined : edge.columns[weight];
        // An edge with no weight weighs 1, as a load reads it.
        return typeof value === "number" && Number.isFinite(value) ? value : 1;
    };
    const combine = Object.hasOwn(COMBINING, policy) ? COMBINING[policy] : undefined;
    // One pair (unordered on an undirected graph), one type, and under a combining rule one meaning.
    const groupOf = (edge: BuiltEdge): string => {
        const ends = [edge.from, edge.to].map((node) => recordKey(node.ref.space, node.ref.key));
        if (!directed) {
            ends.sort((a, b) => (a < b ? -1 : Number(a > b)));
        }

        const type = rowTypeOf(section.types, "edge", edge.ref.load, edge.columns) ?? null;
        return canonicalJson([...ends, type, combine === undefined ? null : roles(edge.ref.load).meaning]);
    };
    const kept = new Map<string, BuiltEdge>();
    const weights = new Map<BuiltEdge, number>();
    for (const [at, edge] of into.edges) {
        const group = groupOf(edge);
        const first = kept.get(group);
        if (first === undefined) {
            kept.set(group, edge);
            continue;
        }

        need(policy !== "error", "/repeatedEdges");
        into.edges.delete(at);
        into.aliases.set(at, first);
        if (!first.loads.includes(edge.ref.load)) {
            first.loads.push(edge.ref.load);
        }

        const own = keepRows(into, first, edge);
        if (policy === "last") {
            first.columns = lastColumns(edge, own, [roles(first.ref.load).edgeId, roles(edge.ref.load).edgeId]);
        } else if (combine !== undefined) {
            weights.set(first, combine(weights.get(first) ?? weightOf(first), weightOf(edge)));
        }
    }

    for (const [edge, weight] of weights) {
        const column = roles(edge.ref.load).weight;
        if (column !== undefined) {
            edge.columns[column] = weight;
        }
    }

    for (const [edge, reduced] of into.reduced) {
        reduced.baseline = { ...edge.columns };
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

            // Each source's own value converts too (design 3.8), so a save writes it as the shown one.
            const own = "own" in record ? record.own.get(String(name)) : undefined;
            for (const [source, value] of own ?? []) {
                own?.set(source, converted(value, type));
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
        return checked === undefined
            ? undefined
            : (into.edges.get(edgeKey(checked)) ?? into.aliases.get(edgeKey(checked)));
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

        into.edges.set(edgeKey(ref), { from: a, to: b, columns, ref, unmatched: "add", loads: [READER] });
    };
    const edit = (operation: JsonObject, at: number): void => {
        const element = operation.node === undefined ? edgeOf(operation.edge) : nodeOf(operation.node);
        if (element === undefined) {
            absent(at, operation.node ?? operation.edge);
            return;
        }

        const column = String(operation.column);
        into.edits.push({
            operation,
            ...(operation.node === undefined ? { edge: element as BuiltEdge } : { node: element as BuiltNode }),
            column,
            before: element.columns[column],
        });
        element.columns[column] = operation.value;
    };

    const apply = new Map<unknown, (operation: JsonObject, at: number) => void>([
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
    const format = typeof record.format === "string" ? record.format : undefined;
    const options = configOf(format, isPlainObject(record.options) ? record.options : {});
    return {
        key,
        kind: LOAD_KINDS[String(record.kind)] ?? "file",
        name: label,
        ...(format === undefined ? {} : { type: format }),
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
            ...causeParams(source.cause),
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

            buildSource(source, into, step, section.joins.indexOf(step));
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
function joinsKept(section: Checked): Pick<Built, "staged" | "joins" | "addChoices"> {
    return {
        staged: [...section.sources.values()].filter(({ id }) => !section.adds.has(id)).map(({ record }) => record),
        joins: section.joins,
        addChoices: [...section.adds].flatMap(([id, step]) => {
            // Its slots and the members its `ignorable` names go with it (spec 10, rule 5).
            const extras = section.extras.kept.get(`/joins/${String(section.joins.indexOf(step))}`) ?? {};
            const kept = {
                ...Object.fromEntries(
                    ["clash", "duplicateIds"].flatMap((name) => (step[name] === undefined ? [] : [[name, step[name]]])),
                ),
                ...extras,
            };
            return Object.keys(kept).length === 0 ? [] : [[id, kept] as const];
        }),
    };
}

/**
 * The graph-wide settings that are the view of the built sources' roles (spec 4.1.3 rule 7): a
 * role's value when every built source naming it agrees, else null. Roles the sources differ on
 * are reported (`W_ROLES_DIFFER`) and kept for the next save.
 * @param section - The checked section.
 * @param problems - Collects the report.
 * @returns The settings and the roles that differ.
 */
function rolesRead(
    section: Checked,
    problems: DocumentProblem[],
): { roles: ReturnType<typeof knownOf>; sourceRoles: [string, TableRoles][] } {
    const mappings = [...section.adds.keys()].map((id) => {
        const source = section.sources.get(id) as ReadSource;
        const mapping = source.rebuilt?.mapping ?? source.record.mapping;
        return [id, isPlainObject(mapping) ? mapping : {}] as const;
    });
    const roles = knownOf(mappings);
    for (const { table, role, values } of roles.mixed) {
        problems.push({ code: "W_ROLES_DIFFER", params: { table, role, sources: [...values.keys()] } });
    }

    return { roles, sourceRoles: mappings.map(([id, mapping]) => [id, rolesAsRead(mapping)]) };
}

/**
 * The nodes several sources supply, each with its columns as they stand before the reader's
 * edits and each source's own row (design 3.8).
 * @param nodes - The nodes built.
 * @returns The shared nodes.
 */
function sharedNodes(nodes: Iterable<BuiltNode>): Built["shared"] {
    const shared = new Map<BuiltNode, { baseline: JsonObject; rows: Map<string, JsonObject> }>();
    for (const node of nodes) {
        const rows = new Map<string, JsonObject>();
        for (const [column, values] of node.own) {
            for (const [source, value] of values) {
                const row = rows.get(source) ?? {};
                row[column] = value;
                rows.set(source, row);
            }
        }

        if (rows.size > 1) {
            shared.set(node, { baseline: { ...node.columns }, rows });
        }
    }

    return shared;
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
    for (const pointer of section.extras.ignored) {
        problems.push({ code: "W_UNKNOWN_MEMBER", params: { section: "data", pointer } });
    }

    const held = new Set(
        [...section.sources.values()]
            .filter((source) => !source.embedded && section.adds.has(source.id))
            .map(({ id }) => id),
    );
    const into: Building = {
        nodes: new Map(),
        edges: new Map(),
        problems,
        held,
        heldOperations: [],
        aliases: new Map(),
        reduced: new Map(),
        edits: [],
    };

    const { loads, unavailable, copies, referenced, changed, edgeIdColumn } = buildJoins(section, into);
    const edgeIds = savedEdgeIds(body.edgeIds, problems);
    settleEnds(into);
    const repeatedEdges = (body.repeatedEdges ?? "keep") as DuplicatePolicy;
    const { roles, sourceRoles } = rolesRead(section, problems);
    reduceRepeats(into, section, { policy: repeatedEdges, directed: body.directed === true });
    creditNamed(into);
    convert(into, section.conversions);
    const shared = sharedNodes(into.nodes.values());
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
        // An edit applied is written back while its cell holds its value; one that bound nothing
        // was reported.
        folded: (section.reader?.operations ?? [])
            .filter((operation) => !into.heldOperations.includes(operation))
            .map((operation) => String(operation.op))
            .filter((op) => op !== "add" && op !== "edit"),
        edgeIds,
        heldOperations: into.heldOperations,
        aliases: into.aliases,
        reduced: into.reduced,
        repeatedEdges,
        roles,
        sourceRoles,
        edits: into.edits,
        shared,
        extras: [...section.sources.values()].map(({ id, extras }) => [id, extras] as const),
        readerAdds: section.readerAdds,
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
    // The role settings are the view of the sources' roles (spec 4.1.3 rule 7).
    await tx.config.set({
        data: {
            knownFields: {
                ...built.roles.patch,
                // Always: a file with none builds as keep, whatever the session held before.
                repeatedEdges: built.repeatedEdges,
            },
        },
    });

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
 * Each network source's request history, from its record's `origin.ledger` (spec 4.1.2 rule 7),
 * keyed by its source id as the file writes it.
 * @param built - The build.
 * @returns The records, by source id.
 */
function ledgersOf(built: Built): Map<string, SourceLoadRecord> {
    const kinds = new Map(built.kinds);
    const ids = new Map(built.nodes.map((node) => [recordKey(node.ref.space, node.ref.key), node.id]));
    const loaded = new Map(built.loads.map((load) => [load.key, load.loadedAt]));
    const now = new Date().toISOString();
    return new Map(
        built.origins.flatMap(([id, origin]) => {
            const record = { kind: "network", origin };
            // A ledger this reader cannot read leaves its source not refreshable (spec 4.1.10).
            if (
                kinds.get(id) !== "network" ||
                !isPlainObject(origin.ledger) ||
                unreadOf(record, "", { kept: new Map(), ignored: [] }) !== undefined
            ) {
                return [];
            }

            const idOf = (seed: unknown): NodeId | undefined => {
                const ref = nodeRefOf(seed);
                return ref === undefined ? undefined : ids.get(recordKey(ref.space, ref.key));
            };
            return [[id, recordOfLedger(id, origin.ledger, loaded.get(id) ?? now, idOf)] as const];
        }),
    );
}

/**
 * Give the session the loads as the file keeps them: each network source's request history, so a
 * refresh replays it, and each source saved by reference (read again or held) kept as a reference,
 * as `session.data.setCopy` keeps one.
 * @param session - The session.
 * @param built - The build.
 * @param ledgers - The network sources' request histories.
 */
function keepSourceChoices(session: GraphSession, built: Built, ledgers: ReadonlyMap<string, SourceLoadRecord>): void {
    const data = session.data as Partial<Pick<SessionData, "ledger" | "keepReferences">>;
    if (ledgers.size > 0) {
        data.ledger?.fromMember({ version: 1, loads: [...ledgers.values()] });
    }

    const referenced = [...built.referenced.map(([id]) => id), ...built.unavailable.map((record) => String(record.id))];
    data.keepReferences?.(referenced);
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
    // A network source's nodes name its load, as a load the session made does, so `data.refresh`
    // replays the request history its record keeps (spec 4.1.2 rule 7).
    const ledgers = ledgersOf(built);
    // The file does not say which nodes an expansion brought, so each of the source's nodes names
    // its expansions too: the record keeps them while any of its nodes is in the graph.
    const named = (element: { readonly loads: readonly string[] }): JsonObject => {
        const keys = element.loads.flatMap((load) => {
            const ledger = ledgers.get(load);
            return ledger === undefined ? [] : [load, ...ledger.expansions.map((expansion) => expansion.key)];
        });
        return keys.length === 0 ? {} : { [SOURCE_ATTR.loads]: keys };
    };
    await tx.execute({
        op: "data.apply",
        mutation: {
            kind: "add-nodes",
            records: built.nodes.map((node) => ({ ...node.columns, ...named(node), id: node.id })),
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
            records: built.edges.map((edge) => ({
                ...edge.columns,
                ...named(edge),
                source: edge.from.id,
                target: edge.to.id,
            })),
            source: "source",
            target: "target",
            directed: built.directed,
            // The build reduced repeats by the file's own repeatedEdges; the session's never applies.
            repeated: "keep",
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
    // What each source supplied as a load records it: every node its rows built or its edges named,
    // the named ones also as such (spec 3.1), so a session opened from a file holds what one that
    // imported the same rows does.
    type Entry = { nodes: Set<NodeId>; edges: EdgeId[]; named: Set<NodeId> };
    const supplied: Record<string, Entry> = {};
    const entry = (key: string): Entry => (supplied[key] ??= { nodes: new Set(), edges: [], named: new Set() });
    for (const node of built.nodes) {
        for (const load of node.loads.filter((each) => each !== READER)) {
            entry(load).nodes.add(node.id);
            if (node.named === true) {
                entry(load).named.add(node.id);
            }
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
            return;
        }

        // An edge reduced from several sources' rows is supplied by each of them (spec 4.1.9).
        for (const load of edge.loads) {
            entry(load).edges.push(id);
            for (const end of [edge.from, edge.to].filter((node) => !node.loads.includes(load))) {
                entry(load).nodes.add(end.id);
                entry(load).named.add(end.id);
            }
        }
    });
    const provenance = Object.fromEntries(
        Object.entries(supplied).map(([key, { nodes, edges, named }]) => [
            key,
            { nodes: [...nodes], edges, ...(named.size === 0 ? {} : { named: [...named] }) },
        ]),
    );
    const ids = new Map(built.edges.map((edge, at) => [edge, edgeIds[at]]));
    const edgeAliases = [...built.aliases].flatMap(([alias, edge]) => {
        const id = ids.get(edge);
        return id === undefined ? [] : [[alias, id] as const];
    });
    const reduced = [...built.reduced].flatMap(([edge, { baseline, rows }]) => {
        const id = ids.get(edge);
        return id === undefined
            ? []
            : [
                  [
                      id,
                      {
                          baseline,
                          rows: rows.map((row) => ({
                              load: row.ref.load,
                              row: row.row ?? 0,
                              columns: row.columns,
                              source: row.from.id,
                              target: row.to.id,
                          })),
                      },
                  ] as const,
              ];
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
    keepSourceChoices(context.session, built, ledgers);
    rememberRead(context.session, {
        build: built.build,
        copies: built.copies,
        types: built.types,
        nodeRefs: built.nodes.map((node) => [node.id, node.ref] as const),
        origins: built.origins,
        kinds: built.kinds,
        folded: built.folded,
        heldOperations: built.heldOperations,
        refused: built.refused,
        readerEdges,
        edgeAliases,
        reduced,
        unavailable: built.unavailable,
        edgeIds: built.edgeIds,
        referenced: built.referenced,
        staged: built.staged,
        joins: built.joins,
        addChoices: built.addChoices,
        roles: { patch: built.roles.patch, sources: built.sourceRoles },
        extras: built.extras,
        readerAdds: built.readerAdds,
        edits: built.edits.flatMap(({ operation, node, edge, column, before }) => {
            const id = node === undefined ? ids.get(edge as BuiltEdge) : node.id;
            return id === undefined
                ? []
                : [{ operation, kind: node === undefined ? "edge" : "node", id, column, before }];
        }),
        shared: built.nodes.flatMap((node) => {
            const own = built.shared.get(node);
            return own === undefined ? [] : [[node.id, { baseline: { ...own.baseline, id: node.id }, rows: own.rows }]];
        }),
        ...(built.edgeIdColumn === undefined ? {} : { edgeIdColumn: built.edgeIdColumn }),
    });
    context.restored.add("graph");
}

// ---------------------------------------------------------------------------------------------
// The codec
// ---------------------------------------------------------------------------------------------

/** Each body `holds` built, so the open that follows does not build it again. */
const BUILT = new WeakMap<object, { readonly built: Built; readonly problems: DocumentProblem[] }>();

/**
 * The saver's choices per source, as the data body takes them, with where the data was opened
 * from, which every path read is relative to.
 * @param context - The write context.
 * @returns The choices.
 */
function saveChoicesOf(context: WriteContext): Parameters<typeof dataBodyOf>[1] {
    const opened = refetchOptionsOf(context.session)?.location;
    return {
        embed: context.embed,
        paths: context.paths ?? {},
        ...(context.handles === undefined ? {} : { handles: context.handles }),
        ...(context.location === undefined ? {} : { location: context.location }),
        ...(opened === undefined ? {} : { opened }),
    };
}

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
    async write(context: WriteContext) {
        const { body } = dataBodyOf(context.session, saveChoicesOf(context), context.problems);
        await flushHandles();
        return { body };
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
    options: "E_PARSE_FAILED",
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
 *     cannot be fetched or its ledger cannot be read, `E_TOO_LARGE` past the open's size limit,
 *     `E_PARSE_FAILED` when its bytes do not parse or its parse options cannot be read; the
 *     source stays held.
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

    // Parse options or a ledger this reader cannot read: no read of it would read it as saved.
    const unread = unreadOf(held, "", { kept: new Map(), ignored: [] });
    if (unread !== undefined) {
        throw new GraphtyError({
            code: REFRESH_REFUSED[unread.reason] ?? "E_FETCH_FAILED",
            message: `The source ${source} could not be read again (${unread.reason}).`,
            source: "data",
            details: { source, reason: unread.reason },
        });
    }

    // Every other source read by reference is built from its rows as the session holds them now.
    const referenced = referencedOf(session);
    const embed = Object.fromEntries(
        [...referenced.keys()].filter((id) => id !== source).map((id) => [id, "embedded" as const]),
    );
    const { body } = dataBodyOf(session, { embed, paths: {} }, []);
    const record = (body.sources as JsonObject[]).find((each) => each.id === source) as JsonObject;
    const add = (body.joins as JsonObject[]).find((step) => step.op === "join.add" && step.source === source);
    const opened = refetchOptionsOf(session);
    await refetch(
        record,
        {
            ...(opened?.location === undefined ? {} : { location: opened.location }),
            ...(opened?.files === undefined ? {} : { files: opened.files }),
            ...(how.signal === undefined ? {} : { signal: how.signal }),
            fetch: true,
            accept: true,
            limit: opened?.limit ?? Number.POSITIVE_INFINITY,
            builds: () => true,
            scratch: how.scratch,
        },
        add?.duplicateIds,
    );
    const fetched = refetchedOf(record);
    if (fetched !== undefined && "unavailable" in fetched) {
        throw new GraphtyError({
            code: REFRESH_REFUSED[fetched.unavailable] ?? "E_FETCH_FAILED",
            message: `The source ${source} could not be read again (${fetched.unavailable}).`,
            source: "data",
            details: { source, reason: fetched.unavailable, ...causeParams(fetched.cause) },
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
