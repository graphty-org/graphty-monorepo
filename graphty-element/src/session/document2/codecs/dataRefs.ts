/**
 * @file The open data as version 2 names it (spec/README.md 4.1, 6): its sources and their copy
 * ids, the build stamp, record keys and element references both ways. Owned by the data codec,
 * used by every bound section through the framing's context. Experimental (`save-files-v2`).
 *
 * Everything here is derived from today's model (`session.data`), never from the data store of
 * design/data/data-store-options.md, which is not built. data.ts lists what that leaves out.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { sha256HexSync } from "@graphty/graph-io";

import type { EdgeId, NodeId } from "../../../catalog/types";
import { recordType } from "../../../data/edgeIdentity";
import { GraphtyError } from "../../../errors/GraphtyError";
import { COLUMNS_VALUE, type ColumnSettings, SOURCES_VALUE } from "../../commands/data";
import { dispatcherOf } from "../../dispatchers";
import { expandedGraph } from "../../groups";
import { ISSUES_VALUE, type IssueState } from "../../issues";
import { type LoadFacts, redactedParams } from "../../sources/member";
import { type Provenance, PROVENANCE_VALUE, provenanceIndex } from "../../sources/provenance";
import type { EdgeRecord, GraphSession, LoadedSource, NodeRecord } from "../../types";
import { projectMemory } from "../memory";
import type {
    BuildStamp,
    DocumentProblem,
    EdgeRef,
    ElementRefs,
    JsonObject,
    NodeRef,
    SourceEmbeddedReason,
    SourceStorage,
} from "../types";
import { keepHandle, keptHandle, type ProjectFileHandle } from "./fileHandles";
import { ROLE_FIELDS, rolesOf, sourceRoles, type TableRoles } from "./roles";
import { mintUlid } from "./viewParts";

// ---------------------------------------------------------------------------------------------
// Plain JSON, key text and ids
// ---------------------------------------------------------------------------------------------

/**
 * A value as a document writes it (spec 11): a non-finite number as its string form, an integer
 * beyond +/-(2^53 - 1) as its decimal string, `undefined` members left out.
 * @param value - The value.
 * @returns The value JSON can carry.
 */
export function jsonSafe(value: unknown): unknown {
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            return String(value);
        }

        return Number.isInteger(value) && !Number.isSafeInteger(value) ? BigInt(value).toString() : value;
    }

    if (Array.isArray(value)) {
        return value.map((each) => (each === undefined ? null : jsonSafe(each)));
    }

    if (typeof value === "object" && value !== null) {
        const out: JsonObject = {};
        for (const [name, each] of Object.entries(value)) {
            if (each !== undefined) {
                out[name] = jsonSafe(each);
            }
        }

        return out;
    }

    return value;
}

/**
 * RFC 8785 canonical JSON: members sorted by UTF-16 code units, numbers as ECMAScript writes them.
 * Used to compare values, never written into a file and never a build input.
 * @param value - A JSON value; non-finite numbers are written as their string forms first.
 * @returns The canonical text.
 */
export function canonicalJson(value: unknown): string {
    const safe = jsonSafe(value);
    if (safe === null || typeof safe !== "object") {
        return JSON.stringify(safe ?? null);
    }

    if (Array.isArray(safe)) {
        return `[${safe.map((each) => canonicalJson(each)).join(",")}]`;
    }

    const record = safe as JsonObject;
    // The default sort compares UTF-16 code units, as RFC 8785 asks.
    const names = Object.keys(record).sort((a, b) => (a < b ? -1 : Number(a > b))); // code-unit order is the rule
    const members = names.map((name) => `${JSON.stringify(name)}:${canonicalJson(record[name])}`);
    return `{${members.join(",")}}`;
}

/**
 * `sha256:` plus the hex SHA-256 of a value's canonical JSON: what tells this writer a copy or a
 * build input changed since it last minted an id for it. Never compared by a reader.
 * @param value - The value.
 * @returns The digest.
 */
function digestOf(value: unknown): string {
    return `sha256:${sha256HexSync(canonicalJson(value))}`;
}

/** A ULID: 26 Crockford base-32 characters. */
export const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/** A source id: `src_` plus a ULID. */
export const SOURCE_ID = /^src_[0-9A-HJKMNP-TV-Z]{26}$/;

/**
 * A value as key text (spec 11): a string as it is (NFC), a number as ECMAScript writes it, a
 * boolean as `true` or `false`.
 * @param value - The cell.
 * @returns The key text, or undefined for a value that cannot be a key (null, the empty string).
 */
export function keyText(value: unknown): string | undefined {
    if (typeof value === "string") {
        return value === "" ? undefined : value.normalize("NFC");
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        // An integer too big to hold exactly is its exact decimal string, never "1e+21" (spec 11).
        return Number.isInteger(value) && !Number.isSafeInteger(value) ? BigInt(value).toString() : String(value);
    }

    return typeof value === "boolean" ? String(value) : undefined;
}

/** The strings spec 11 writes for the non-finite numbers. */
const NON_FINITE = new Set(["Infinity", "-Infinity", "NaN"]);
/** An integer written as its decimal string because it is too big to hold exactly. */
const BIG_INTEGER = /^-?\d{16,}$/;

/**
 * A string cell of a number column read back (spec 11): `"Infinity"`, `"-Infinity"` and `"NaN"`
 * become those numbers, and so does an integer too big to hold exactly written as its decimal
 * string; any other string stays the string it is.
 * @param value - The cell.
 * @returns The number, or the string.
 */
export function numericCell(value: string): number | string {
    return NON_FINITE.has(value) || BIG_INTEGER.test(value) ? Number(value) : value;
}

/**
 * One map key for a node's record key.
 * @param space - The space.
 * @param key - The key text.
 * @returns The map key.
 */
export function recordKey(space: string, key: string): string {
    return `${space.normalize("NFC")}\u0000${key.normalize("NFC")}`;
}

/**
 * One map key for an edge's record key.
 * @param ref - The reference.
 * @returns The map key.
 */
export function edgeKey(ref: EdgeRef): string {
    return `${ref.load}\u0000${ref.key.normalize("NFC")}`;
}

/**
 * Whether a value is a plain object.
 * @param value - The value.
 * @returns True for `{...}`.
 */
export function isPlainObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A node reference read from a file, checked: exactly `space` and `key`, both strings (closed).
 * @param value - What the file holds.
 * @returns The reference, NFC normalized, or undefined.
 */
export function nodeRefOf(value: unknown): NodeRef | undefined {
    if (!isPlainObject(value) || Object.keys(value).length !== 2) {
        return undefined;
    }

    const { space, key } = value;
    return typeof space === "string" && typeof key === "string" && space.length > 0
        ? { space: space.normalize("NFC"), key: key.normalize("NFC") }
        : undefined;
}

/**
 * An edge reference read from a file, checked (spec 6.2): exactly `load` and `key`, both strings.
 * @param value - What the file holds.
 * @returns The reference, or undefined.
 */
export function edgeRefOf(value: unknown): EdgeRef | undefined {
    if (!isPlainObject(value) || Object.keys(value).length !== 2) {
        return undefined;
    }

    const { load, key } = value;
    return typeof load === "string" && typeof key === "string" && load.length > 0
        ? { load, key: key.normalize("NFC") }
        : undefined;
}

// ---------------------------------------------------------------------------------------------
// What a session remembers between an open and the next save
// ---------------------------------------------------------------------------------------------

/** The reader source's id. */
export const READER = "reader";

/** The ids this writer minted or read for a session, so a save that changes nothing changes no id. */
interface DataMemory {
    /** Each load key's source id, when the key is not one already. */
    readonly sourceIds: Map<string, string>;
    /** Each source's copy id, and the digest of the copy it was given for. */
    readonly copies: Map<string, { readonly digest: string; readonly copy: string }>;
    /** Each reader-added element's minted key, by `n:<id>` or `e:<id>`. */
    readonly readerKeys: Map<string, string>;
    /**
     * The build stamp, and the digest of the build inputs it was given for; after a read, the copy
     * ids the read file stamped, kept while the build is.
     */
    build?: {
        readonly digest: string;
        readonly build: string;
        readonly sources?: Readonly<Record<string, string>>;
        /**
         * The stamp the data section writes when it differs from the one runs bind to: newly minted
         * when the open left out part of what it read, since what a save writes then differs from
         * what the file holds (spec 8.1 rule 2).
         */
        readonly written?: string;
    };
    /** The type registry the last data section read held. */
    types: readonly JsonObject[];
    /** The records of the sources the last read could not fetch, written back as read. */
    readonly unavailable: Map<string, JsonObject>;
    /** Each node's record key as the data section that loaded it named it. */
    readonly nodeRefs: Map<NodeId, NodeRef>;
    /** Each source's `origin` as read, by source id, until the session records its own load. */
    readonly origins: Map<string, JsonObject>;
    /** Each source's `kind` as read, by source id. */
    readonly kinds: Map<string, string>;
    /** The reader's edits, removes and merges the last read applied, by `op`. */
    folded: readonly string[];
    /** The reader operations on what a held source supplies, written back as read. */
    heldOperations: readonly JsonObject[];
    /** The edge-id column the last data section read named, until settings say one. */
    edgeIdColumn?: string;
    /** Each edge's saved id the last data section read, by load and then key (spec 6.2). */
    edgeIds: ReadonlyMap<string, ReadonlyMap<string, EdgeId>>;
    /**
     * The sources the last read rebuilt from their files, with the `mapping` each was read with, so
     * a save that asks nothing keeps each referenced (spec 8.1 rule 5) and read the same way.
     */
    readonly referenced: Map<string, JsonObject>;
    /** The records of the sources no step built, written back as read (spec 4.1.8 rule 1). */
    staged: readonly JsonObject[];
    /** The join history the last read held, written back in its order (spec 4.1.8). */
    joins: readonly JsonObject[];
    /** The choices each built source's `join.add` carried besides its source, by source id. */
    readonly addChoices: Map<string, JsonObject>;
    /** The edge each reduced edge's reference is an alias of, by that reference's `edgeKey` (spec 6.1). */
    readonly edgeAliases: Map<string, EdgeId>;
    /** Each edge the last read reduced from several rows, and those rows (spec 6.1). */
    readonly reduced: Map<EdgeId, ReducedEdge>;
    /** The settings the last read set from its sources' roles, and each source's roles as read. */
    roles: { readonly patch: Readonly<JsonObject>; readonly sources: ReadonlyMap<string, TableRoles> };
    /** The reader's edits the last read applied, in order (spec 4.1.4). */
    edits: readonly ReadEdit[];
    /** Each node the last read's sources shared: its columns then and each source's own row. */
    shared: ReadonlyMap<NodeId, SharedNode>;
}

/** A reader `edit` an open applied: written back as read while its cell holds the value it set. */
export interface ReadEdit {
    readonly operation: JsonObject;
    readonly kind: "node" | "edge";
    readonly id: NodeId | EdgeId;
    readonly column: string;
    /** The cell's value before the edit, undefined when it held none. */
    readonly before: unknown;
}

/** A node several sources supply: its columns before the reader's edits, and each source's own row. */
export interface SharedNode {
    readonly baseline: JsonObject;
    readonly rows: ReadonlyMap<string, JsonObject>;
}

const MEMORY = projectMemory<DataMemory>();

/**
 * A session's data memory, made on first use.
 * @param session - The session.
 * @returns The memory.
 */
function memoryOf(session: GraphSession): DataMemory {
    let memory = MEMORY.get(session);
    if (memory === undefined) {
        memory = {
            sourceIds: new Map(),
            copies: new Map(),
            readerKeys: new Map(),
            types: [],
            unavailable: new Map(),
            nodeRefs: new Map(),
            origins: new Map(),
            kinds: new Map(),
            folded: [],
            heldOperations: [],
            edgeIds: new Map(),
            referenced: new Map(),
            staged: [],
            joins: [],
            addChoices: new Map(),
            edgeAliases: new Map(),
            reduced: new Map(),
            roles: { patch: {}, sources: new Map() },
            edits: [],
            shared: new Map(),
        };
        MEMORY.set(session, memory);
    }

    return memory;
}

/**
 * The id remembered for a digest, or a newly minted one remembered from now on.
 * @param remembered - What is remembered.
 * @param digest - The digest now.
 * @param mint - Mints an id.
 * @returns The id and what to remember.
 */
function stableId(
    remembered: { readonly digest: string; readonly copy: string } | undefined,
    digest: string,
    mint: () => string,
): { readonly digest: string; readonly copy: string } {
    return remembered?.digest === digest ? remembered : { digest, copy: mint() };
}

/** One row an edge was reduced from, as its source's copy holds it. */
export interface ReducedRow {
    readonly load: string;
    /** Its row in its source's edge table. */
    readonly row: number;
    readonly columns: JsonObject;
    readonly source: NodeId;
    readonly target: NodeId;
}

/** An edge reduced from several rows: its columns as reduced, and its rows, its own first. */
export interface ReducedEdge {
    readonly baseline: JsonObject;
    readonly rows: readonly ReducedRow[];
}

/** What a data section read leaves the session to remember. */
export interface DataRead {
    readonly build: string;
    /** Each source's copy id as read. */
    readonly copies: Readonly<Record<string, string>>;
    readonly types: readonly JsonObject[];
    /** Each node's record key. */
    readonly nodeRefs: readonly (readonly [NodeId, NodeRef])[];
    /** Whether the read left out part of the section. */
    readonly refused: boolean;
    /** Each source's `origin` as read, by source id. */
    readonly origins?: readonly (readonly [string, JsonObject])[];
    /** Each source's `kind` as read, by source id. */
    readonly kinds?: readonly (readonly [string, string])[];
    /** The reader operations read that are not `add`s, by `op`. */
    readonly folded?: readonly string[];
    /** The reader operations on what a held source supplies, kept as read. */
    readonly heldOperations?: readonly JsonObject[];
    /** Each reader-added edge's key, by its session id. */
    readonly readerEdges: readonly (readonly [EdgeId, string])[];
    /** The edge each reduced edge's reference is an alias of, by that reference's `edgeKey`. */
    readonly edgeAliases?: readonly (readonly [string, EdgeId])[];
    /** Each edge reduced from several rows, and those rows. */
    readonly reduced?: readonly (readonly [EdgeId, ReducedEdge])[];
    /** The records of the sources that could not be fetched. */
    readonly unavailable: readonly JsonObject[];
    readonly edgeIdColumn?: string;
    /** Each edge's saved id, by load and then key. */
    readonly edgeIds?: ReadonlyMap<string, ReadonlyMap<string, EdgeId>>;
    /** The sources rebuilt from their files, with the `mapping` each was read with, by source id. */
    readonly referenced?: readonly (readonly [string, JsonObject])[];
    /** The records of the sources no step built. */
    readonly staged?: readonly JsonObject[];
    /** The join history read. */
    readonly joins?: readonly JsonObject[];
    /** The choices each built source's `join.add` carried besides its source, by source id. */
    readonly addChoices?: readonly (readonly [string, JsonObject])[];
    /** The settings the built sources' roles set, and each built source's roles, by source id. */
    readonly roles?: {
        readonly patch: Readonly<JsonObject>;
        readonly sources: readonly (readonly [string, TableRoles])[];
    };
    /** The reader's edits applied, in order. */
    readonly edits?: readonly ReadEdit[];
    /** Each node several sources supply, by its id. */
    readonly shared?: Iterable<readonly [NodeId, SharedNode]>;
}

/**
 * Remember what a data section read named, once its build is in the session: the record keys,
 * the types and the sources it could not fetch, and its build stamp and copy ids for the data as
 * the session now holds it, so a save that changes nothing writes them back unchanged.
 * @param session - The session.
 * @param read - What the read named.
 */
export function rememberRead(session: GraphSession, read: DataRead): void {
    MEMORY.delete(session);
    const memory = memoryOf(session);
    for (const [id, ref] of read.nodeRefs) {
        memory.nodeRefs.set(id, ref);
    }

    for (const [id, origin] of read.origins ?? []) {
        memory.origins.set(id, origin);
    }

    for (const [id, kind] of read.kinds ?? []) {
        memory.kinds.set(id, kind);
    }

    for (const [id, key] of read.readerEdges) {
        memory.readerKeys.set(`e:${id}`, key);
    }

    for (const record of read.unavailable) {
        memory.unavailable.set(String(record.id), record);
    }

    for (const [id, mapping] of read.referenced ?? []) {
        memory.referenced.set(id, mapping);
    }

    for (const [id, choices] of read.addChoices ?? []) {
        memory.addChoices.set(id, choices);
    }

    for (const [alias, id] of read.edgeAliases ?? []) {
        memory.edgeAliases.set(alias, id);
    }

    for (const [id, reduced] of read.reduced ?? []) {
        memory.reduced.set(id, reduced);
    }

    memory.shared = new Map(read.shared);
    memory.roles = { patch: read.roles?.patch ?? {}, sources: new Map(read.roles?.sources ?? []) };
    memory.edits = read.edits ?? [];
    memory.staged = read.staged ?? [];
    memory.joins = read.joins ?? [];
    memory.types = read.types;
    memory.folded = read.folded ?? [];
    memory.heldOperations = read.heldOperations ?? [];
    memory.edgeIdColumn = read.edgeIdColumn;
    memory.edgeIds = read.edgeIds ?? new Map();
    const model = dataModelOf(session);
    for (const [id, copy] of model.copies) {
        const known = read.copies[id];
        if (known !== undefined) {
            memory.copies.set(id, { digest: copy.digest, copy: known });
        }
    }

    const reader = read.copies[READER];
    if (reader !== undefined && model.reader !== undefined) {
        memory.copies.set(READER, { digest: model.reader.digest, copy: reader });
    }

    // Built again, so the digest reads the copy ids just remembered.
    // ponytail: removes and merges are baked into the copies on open, so the reader copy id the
    // file stamped is kept as read until the build changes, rather than derived from the session.
    memory.build = {
        digest: bodyOf(dataModelOf(session), { embed: {}, paths: {} }, []).digest,
        build: read.build,
        sources: { ...read.copies },
        ...(read.refused ? { written: mintUlid() } : {}),
    };
}

/**
 * The record of a source the last open held (`W_SOURCE_UNAVAILABLE`), while it still supplies
 * nothing: what `data.refresh` reads again.
 * @param session - The session.
 * @param id - The source id.
 * @returns The record as read, or undefined when the source is not held.
 */
export function heldRecordOf(session: GraphSession, id: string): JsonObject | undefined {
    const record = memoryOf(session).unavailable.get(id);
    if (record === undefined) {
        return undefined;
    }

    const source = dataModelOf(session).sources.find((each) => each.id === id);
    return source !== undefined && source.nodes.length + source.edges.length === 0 ? record : undefined;
}

/**
 * The sources the last read rebuilt from their files, with the `mapping` each was read with.
 * @param session - The session.
 * @returns A copy, by source id.
 */
export function referencedOf(session: GraphSession): ReadonlyMap<string, JsonObject> {
    return new Map(memoryOf(session).referenced);
}

/**
 * Keep what a rebuild for a refresh read from embedded copies: the sources saved by reference, and
 * the refreshed source's record as the open read it, so an undo of the refresh holds it again.
 * @param session - The session.
 * @param referenced - The sources and their mappings, by source id.
 * @param held - The refreshed source's record as read; it counts as held only while the source
 *     supplies nothing (`heldRecordOf`).
 */
export function keepReferenced(
    session: GraphSession,
    referenced: ReadonlyMap<string, JsonObject>,
    held: JsonObject,
): void {
    const memory = memoryOf(session);
    for (const [id, mapping] of referenced) {
        if (!memory.referenced.has(id)) {
            memory.referenced.set(id, mapping);
        }
    }

    if (!memory.unavailable.has(String(held.id))) {
        memory.unavailable.set(String(held.id), held);
    }
}

/**
 * The id an edge was saved with in the data section the session last read, for an edge added
 * again after the data is built (one added to a node standing in for a group).
 * @param session - The session.
 * @param ref - The edge's reference.
 * @returns The id, or undefined.
 */
export function savedEdgeId(session: GraphSession, ref: EdgeRef): EdgeId | undefined {
    return MEMORY.get(session)?.edgeIds.get(ref.load)?.get(ref.key);
}

/**
 * The `edgeIds` member (spec 6.2): every edge's element-assigned id by its load and key, in graph
 * order, so an open gives each edge the id it had. A source that could not be fetched keeps the
 * ids it was read with.
 * @param model - The model.
 * @returns The member, or undefined when there are no edges.
 */
function edgeIdsOf(model: DataModel): JsonObject | undefined {
    const byLoad = new Map<string, Map<string, EdgeId>>();
    for (const [id, ref] of model.edgeRefs) {
        let ids = byLoad.get(ref.load);
        if (ids === undefined) {
            ids = new Map();
            byLoad.set(ref.load, ids);
        }

        if (!ids.has(ref.key)) {
            ids.set(ref.key, id);
        }
    }

    const read = memoryOf(model.session).edgeIds;
    for (const load of model.unavailable.keys()) {
        const kept = read.get(load);
        if (kept !== undefined && !byLoad.has(load)) {
            byLoad.set(load, new Map(kept));
        }
    }

    return byLoad.size === 0
        ? undefined
        : Object.fromEntries([...byLoad].map(([load, ids]) => [load, Object.fromEntries(ids)]));
}

/**
 * The column that holds each edge's own id: the configured `edgeIdPath` when it is a plain name,
 * else the one the last data section read named.
 * @param session - The session.
 * @returns The column, or undefined.
 */
function edgeIdColumnOf(session: GraphSession): string | undefined {
    const configured = session.config.data.knownFields.edgeIdPath;
    if (typeof configured === "string" && /^[A-Za-z_][\w-]*$/.test(configured)) {
        return configured;
    }

    return MEMORY.get(session)?.edgeIdColumn;
}

/**
 * A load's source id: the key itself when it is one (a source read from a version 2 file), else
 * one minted once per load and remembered.
 * @param key - The load key.
 * @param memory - The memory.
 * @returns The id.
 */
function sourceIdOf(key: string, memory: DataMemory): string {
    if (SOURCE_ID.test(key)) {
        return key;
    }

    let id = memory.sourceIds.get(key);
    if (id === undefined) {
        id = `src_${mintUlid()}`;
        memory.sourceIds.set(key, id);
    }

    return id;
}

// ---------------------------------------------------------------------------------------------
// The open data, named
// ---------------------------------------------------------------------------------------------

/** One source of the open data, from today's load record. */
interface ModelSource {
    readonly id: string;
    readonly load: LoadedSource;
    /** The node records this source supplied, in graph order. */
    readonly nodes: NodeRecord[];
    /** The edge records this source made (the first load that supplied each), in graph order. */
    readonly edges: EdgeRecord[];
}

/** A source's copy as this writer writes it: its tables, their declarations, its copy id. */
interface Copy {
    readonly tables: JsonObject;
    readonly columns: JsonObject;
    readonly digest: string;
    readonly copy: string;
    /**
     * Whether no bytes stand for it, so it is always embedded: it holds rows the reader edited,
     * removed or merged, or it was generated, or its bytes were never digested.
     */
    readonly embedOnly: boolean;
    /** The edge rows whose edge id an earlier row of the source already gave: written keyless. */
    readonly repeated: ReadonlySet<number>;
}

/** The reader source: its operations and copy id. */
interface ReaderCopy {
    readonly operations: JsonObject[];
    readonly digest: string;
    readonly copy: string;
}

/** The open data, named. */
interface DataModel {
    readonly session: GraphSession;
    readonly directed: boolean;
    /** The loads' sources, in join order. */
    readonly sources: readonly ModelSource[];
    readonly nodes: readonly NodeRecord[];
    readonly edges: readonly EdgeRecord[];
    /** Each node's source ids, join order; `reader` for a node no load supplied. */
    readonly nodeLoads: ReadonlyMap<NodeId, readonly string[]>;
    /** Each edge's source ids, join order; `reader` for an edge no load supplied. */
    readonly edgeLoads: ReadonlyMap<EdgeId, readonly string[]>;
    readonly edgeIdColumn?: string;
    readonly nodeRefs: ReadonlyMap<NodeId, NodeRef>;
    readonly edgeRefs: ReadonlyMap<EdgeId, EdgeRef>;
    /** Each load source's copy, by source id. */
    readonly copies: ReadonlyMap<string, Copy>;
    /** The reader source, when the reader added anything. */
    readonly reader?: ReaderCopy;
    /** The sources that could not be fetched: their records as read. */
    readonly unavailable: ReadonlyMap<string, JsonObject>;
    /** The working columns a reserved prefix left out, as `<kind>:<column>`. */
    readonly reserved: ReadonlySet<string>;
    /** The nodes no source's rows supply, which edges only name (spec 3.1). */
    readonly namedOnly: ReadonlySet<NodeId>;
    /** Whether a reader edit the last open read is not written back as read. */
    readonly editsLost: boolean;
}

/** The `_source.*` columns graphty-element keeps provenance in: its own, written as `_source.loads`. */
const PROVENANCE = new Set(["_source.loads", "_source.expansion", "_source.next"]);

/**
 * Whether a column name has a reserved prefix (spec 11): `graphty.` or `_source.`.
 * @param name - The column.
 * @returns True when no working column may have it.
 */
export function isReserved(name: string): boolean {
    return name.startsWith("graphty.") || name.startsWith("_source.");
}

/**
 * A record without the columns a reserved prefix keeps out: graphty-element's own provenance,
 * and any working column so named, which is noted to be reported.
 * @param record - The record.
 * @param kind - `node` or `edge`.
 * @param refused - Collects `<kind>:<column>` for each working column left out.
 * @returns The record.
 */
function withoutReserved<T extends Readonly<JsonObject>>(record: T, kind: string, refused: Set<string>): T {
    if (!Object.keys(record).some((name) => isReserved(name))) {
        return record;
    }

    return Object.fromEntries(
        Object.entries(record).filter(([name]) => {
            if (!isReserved(name)) {
                return true;
            }

            if (!PROVENANCE.has(name)) {
                refused.add(`${kind}:${name}`);
            }

            return false;
        }),
    ) as T;
}

/**
 * The graph-format dtype of a column whose set cells are all of one JavaScript type.
 */
const DTYPES = { number: "f64", boolean: "bool", string: "string" } as const;

/**
 * A graph-format column declaration for a column's values (spec 4.1.2 rule 3).
 * @param name - The column.
 * @param values - Its cells, `undefined` for unset.
 * @returns The declaration and the cells as written.
 */
function columnOf(name: string, values: readonly unknown[]): { decl: JsonObject; cells: unknown[] } {
    const set = values.filter((value) => value !== undefined);
    const dtype = (["number", "boolean", "string"] as const).find((type) =>
        set.every((value) => typeof value === type),
    );
    const cells = values.map((value) => (value === undefined ? null : jsonSafe(value)));
    if (dtype === undefined || set.includes(null)) {
        // A json column's null is literal; its unset rows are listed.
        const unset = values.flatMap((value, at) => (value === undefined ? [at] : []));
        return { decl: { name, dtype: "json", nullable: true, ...(unset.length === 0 ? {} : { unset }) }, cells };
    }

    return { decl: { name, dtype: DTYPES[dtype], nullable: set.length < values.length }, cells };
}

/**
 * One table of a copy: equal-length value arrays by column, the given columns first.
 * @param rows - The rows.
 * @param first - The columns written first.
 * @returns The table and its column declarations.
 */
function tableOf(
    rows: readonly Readonly<JsonObject>[],
    first: readonly string[],
): { table: JsonObject; columns: JsonObject } {
    const names = new Set(first);
    for (const row of rows) {
        for (const name of Object.keys(row)) {
            names.add(name);
        }
    }

    const table: JsonObject = {};
    const columns: JsonObject = {};
    for (const name of names) {
        const { decl, cells } = columnOf(
            name,
            rows.map((row) => row[name]),
        );
        table[name] = cells;
        columns[name] = decl;
    }

    return { table, columns };
}

/**
 * A node's key cell as a copy writes it: the session's id in a `source:` space (so `34` stays a
 * number), its record key in any other space.
 * @param ref - The node's record key.
 * @param id - The node's id.
 * @returns The cell.
 */
function keyCellOf(ref: NodeRef | undefined, id: unknown): unknown {
    return ref === undefined || ref.space.startsWith("source:") ? id : ref.key;
}

/**
 * Today's load kinds as version 2 source kinds. A joined table holds no bytes of its own that the
 * session keeps, so it is a derived source.
 */
const KINDS: Readonly<Record<LoadedSource["kind"], string>> = {
    file: "file",
    url: "url",
    server: "network",
    sample: "sample",
    join: "derived",
};

/** The source kinds whose copy id is the digest of the bytes read, not a minted ULID. */
const HASHED_KINDS = new Set(["file", "url", "sample"]);

/**
 * What a load read, as the session recorded it.
 * @param session - The session.
 * @param key - The load's key.
 * @returns The facts, or undefined.
 */
function factsOf(session: GraphSession, key: string): LoadFacts | undefined {
    const data = session.data as Partial<{ loadFactsOf(key: string): LoadFacts | undefined }>;
    return typeof data.loadFactsOf === "function" ? data.loadFactsOf(key) : undefined;
}

/**
 * The digest of the bytes a load read, as a copy id: `sha256:` and lowercase hex.
 * @param facts - The load's facts.
 * @returns The copy id, or undefined when the session kept no digest.
 */
function bytesCopyId(facts: LoadFacts | undefined): string | undefined {
    const hex = facts?.file?.sha256 ?? facts?.url?.sha256;
    return hex === undefined ? undefined : `sha256:${hex.replace(/^sha256:/, "").toLowerCase()}`;
}

/**
 * A source's kind: as the file it was read from said, else from its load.
 * @param source - The source.
 * @param memory - The memory.
 * @returns The kind.
 */
function kindOfSource(source: ModelSource, memory: DataMemory): string {
    return memory.kinds.get(source.id) ?? KINDS[source.load.kind];
}

/**
 * A copy's tables and their column declarations (spec 4.1.2 rule 3), from its rows as a copy writes
 * them: a node's key cell `id`, an edge's ends `source` and `target`, every other key a column.
 * @param nodeRows - The node rows.
 * @param edgeRows - The edge rows.
 * @returns The tables and the declarations.
 */
export function copyTables(
    nodeRows: readonly Readonly<JsonObject>[],
    edgeRows: readonly Readonly<JsonObject>[],
): { tables: JsonObject; columns: JsonObject } {
    const nodes = nodeRows.length > 0 ? tableOf(nodeRows, ["id"]) : undefined;
    const edges = edgeRows.length > 0 ? tableOf(edgeRows, ["source", "target"]) : undefined;
    const tables: JsonObject = {
        ...(nodes === undefined ? {} : { nodes: nodes.table }),
        ...(edges === undefined ? {} : { edges: edges.table }),
    };
    const columns: JsonObject = {
        ...(nodes === undefined ? {} : { nodes: nodes.columns }),
        ...(edges === undefined ? {} : { edges: edges.columns }),
    };
    if (nodes === undefined && edges === undefined) {
        tables.nodes = { id: [] };
        columns.nodes = { id: { name: "id", dtype: "string", nullable: false } };
    }

    return { tables, columns };
}

/**
 * A source's copy: its node and edge tables, with the copy id this writer gives it.
 * @param source - The source.
 * @param refs - The node references.
 * @param memory - The memory.
 * @param facts - What its load read.
 * @param folded - Whether the session holds the reader's edits, removes or merges.
 * @param edgeIdColumn - The edge-id column, if any.
 * @returns The copy.
 */
function copyOf(
    source: ModelSource,
    refs: ReadonlyMap<NodeId, NodeRef>,
    memory: DataMemory,
    facts: LoadFacts | undefined,
    folded: boolean,
    edgeIdColumn: string | undefined,
): Copy {
    const repeated = repeatedEdgeRows(source.edges, edgeIdColumn, source.load.choices?.duplicateIds === "merge");
    const { tables, columns } = copyTables(
        source.nodes.map((node) => ({ ...node, id: keyCellOf(refs.get(node.id), node.id) })),
        source.edges.map(({ id: _id, ...edge }, row) => ({
            ...edge,
            ...(repeated.has(row) && edgeIdColumn !== undefined ? { [edgeIdColumn]: undefined } : {}),
            source: keyCellOf(refs.get(edge.source), edge.source),
            target: keyCellOf(refs.get(edge.target), edge.target),
        })),
    );
    const digest = digestOf(tables);
    const { copy, embedOnly } = copyIdOf(source, memory, { digest, facts, folded });
    memory.copies.set(source.id, { digest, copy });
    return { tables, columns, digest, copy, embedOnly, repeated };
}

/**
 * A copy's id (spec 4.1.2 rule 1), and whether no bytes stand for it.
 * @param source - The source.
 * @param memory - The memory.
 * @param copy - The copy.
 * @param copy.digest - The digest of its tables.
 * @param copy.facts - What its load read.
 * @param copy.folded - Whether the session holds the reader's edits, removes or merges.
 * @returns The copy id, and whether a hashed source has no bytes to stand for it.
 */
function copyIdOf(
    source: ModelSource,
    memory: DataMemory,
    { digest, facts, folded }: { digest: string; facts: LoadFacts | undefined; folded: boolean },
): { copy: string; embedOnly: boolean } {
    const remembered = memory.copies.get(source.id);
    if (!HASHED_KINDS.has(kindOfSource(source, memory))) {
        return { copy: stableId(remembered, digest, mintUlid).copy, embedOnly: false };
    }

    // The digest of the bytes as read, whatever the reader changed since: the load's own, else the
    // one the file it was opened from stamped. A copy saved with a ULID keeps it.
    const minted = remembered !== undefined && ULID.test(remembered.copy) ? remembered : undefined;
    const bytes = bytesCopyId(facts) ?? (minted === undefined ? remembered?.copy : undefined);
    if (folded || bytes === undefined) {
        // A generated sample, or a load whose bytes the session never digested, has no bytes, and
        // a source the reader changed is no longer its bytes: a ULID, and always embedded.
        // ponytail: until the session keeps a log of the reader's edits, removes and merges, any of
        // them marks every hashed source so. Keep the log to mark only the sources it touched.
        return { copy: stableId(minted, digest, mintUlid).copy, embedOnly: true };
    }

    return { copy: bytes, embedOnly: false };
}

/**
 * The rows of a source's edges whose edge id an earlier row already gave. Unless the source merges
 * repeats, each is written keyless (`<copy id>#<row>`), so no two edges share a key (spec 6.1).
 * @param edges - The source's edge rows, in order.
 * @param edgeIdColumn - The edge-id column, if any.
 * @param merges - Whether the source merges repeats (`duplicateIds: "merge"`).
 * @returns The rows.
 */
export function repeatedEdgeRows(
    edges: readonly Readonly<JsonObject>[],
    edgeIdColumn: string | undefined,
    merges: boolean,
): Set<number> {
    const rows = new Set<number>();
    if (edgeIdColumn === undefined || merges) {
        return rows;
    }

    const seen = new Set<string>();
    edges.forEach((edge, row) => {
        const key = keyText(edge[edgeIdColumn]);
        if (key !== undefined && seen.has(key)) {
            rows.add(row);
        } else if (key !== undefined) {
            seen.add(key);
        }
    });
    return rows;
}

/**
 * A reader-added element's key: the one it was read with or given, else a newly minted ULID.
 * @param memory - The memory.
 * @param slot - `n:<id>` or `e:<id>`.
 * @returns The key.
 */
function readerKeyOf(memory: DataMemory, slot: string): string {
    let key = memory.readerKeys.get(slot);
    if (key === undefined) {
        key = mintUlid();
        memory.readerKeys.set(slot, key);
    }

    return key;
}

/**
 * Remember the key a reader-added edge was read with, so the next save writes the same one.
 * @param session - The session.
 * @param id - The edge.
 * @param key - Its key.
 */
export function rememberReaderEdge(session: GraphSession, id: EdgeId, key: string): void {
    memoryOf(session).readerKeys.set(`e:${id}`, key);
}

/**
 * A node's source ids and record key: the sources that supplied it, which for a node only edges
 * name are the sources of those edges, with the key an open read (spec 4.1.9); else the reader's,
 * keyed by its id unless
 * another reader node's id prints the same (1 and "1"), then by a ULID minted once.
 * @param id - The node.
 * @param supplied - The sources that supplied it, in join order.
 * @param memory - The memory.
 * @param shared - The space today's loads share.
 * @param taken - The reader keys named so far, this one added.
 * @returns Its source ids, its key, and whether the reader added it.
 */
function nameNode(
    id: NodeId,
    supplied: readonly ModelSource[],
    memory: DataMemory,
    shared: string,
    taken: Set<string>,
): { readonly loads: string[]; readonly ref: NodeRef; readonly reader: boolean } {
    const known = memory.nodeRefs.get(id);
    if (supplied.length > 0) {
        const ref = known ?? { space: shared, key: keyText(id) ?? String(id) };
        return { loads: supplied.map((source) => source.id), ref, reader: false };
    }

    // Keyed by its own id, as a source row is, so the id is the same after a reopen.
    const own = keyText(id);
    const key =
        known?.key ?? (own === undefined || taken.has(own) ? readerKeyOf(memory, `n:${typeof id}:${String(id)}`) : own);
    taken.add(key);
    return { loads: [READER], ref: { space: known?.space ?? `source:${READER}`, key }, reader: true };
}

/**
 * Every element's loads, members of a collapsed group (out of the graph) included.
 * @param session - The session.
 * @returns The loads by id.
 */
function suppliedIndex(session: GraphSession): ReturnType<typeof provenanceIndex> {
    return provenanceIndex(dispatcherOf(session).state.graph.values.get(PROVENANCE_VALUE) as Provenance | undefined);
}

/**
 * The nodes each load only named by an edge end, by load key (spec 3.1).
 * @param session - The session.
 * @returns The nodes by load key.
 */
function namedIndex(session: GraphSession): Map<string, ReadonlySet<NodeId>> {
    const provenance = dispatcherOf(session).state.graph.values.get(PROVENANCE_VALUE) as Provenance | undefined;
    return new Map(Object.entries(provenance ?? {}).map(([key, supplied]) => [key, new Set(supplied.named ?? [])]));
}

/**
 * A reduced edge's own row as its copy writes it: the row as read, with each value the reader
 * changed since the open (one that differs from the reduced value) in place of the row's.
 * @param edge - The edge as the session holds it.
 * @param reduced - Its rows and its columns as reduced.
 * @param held - The columns a reader edit written back sets, whose row value stays.
 * @returns The row, with the edge's id and ends.
 */
function keptRow(edge: EdgeRecord, reduced: ReducedEdge, held: ReadonlyMap<string, unknown> | undefined): EdgeRecord {
    const row: JsonObject = { ...reduced.rows[0].columns };
    for (const [name, value] of Object.entries(edge)) {
        if (held?.has(name) !== true && canonicalJson(value) !== canonicalJson(reduced.baseline[name])) {
            row[name] = value;
        }
    }

    return { ...row, id: edge.id, source: edge.source, target: edge.target };
}

/** The reader's edits a save writes back as read, and the cells they set. */
interface KeptEdits {
    /** The operations, in the order read. */
    readonly operations: readonly JsonObject[];
    /** The value each cell held before its edits, by {@link elementKey} and then column. */
    readonly held: ReadonlyMap<string, ReadonlyMap<string, unknown>>;
    /** Whether an edit read is not written back, its cell having changed since. */
    readonly lost: boolean;
}

/**
 * A key for a node or an edge, a numeric id apart from the text that prints the same.
 * @param kind - Node or edge.
 * @param id - Its id.
 * @returns The key.
 */
function elementKey(kind: "node" | "edge", id: NodeId | EdgeId): string {
    return JSON.stringify([kind, typeof id, String(id)]);
}

/**
 * The reader's edits the last open applied that a save writes back as read (spec 4.1.4): those of
 * each cell that still holds the value its last edit set, so a source's copy keeps its own value
 * and the edit stays the reader's, `picked` included (design 3.10); a pick of a source no longer
 * built loses its `picked` and stays the reader's value. An edit whose cell changed since is not
 * written back: the cell's value is the session's, written into the copies.
 * @param edits - The edits read.
 * @param records - The session's nodes and edges, by {@link elementKey}.
 * @param sources - The ids of the sources built now.
 * @returns The edits kept.
 */
function keptEdits(
    edits: readonly ReadEdit[],
    records: ReadonlyMap<string, Readonly<JsonObject>>,
    sources: ReadonlySet<string>,
): KeptEdits {
    const cellOf = (edit: ReadEdit): string => JSON.stringify([elementKey(edit.kind, edit.id), edit.column]);
    const last = new Map(edits.map((edit) => [cellOf(edit), edit]));
    const kept = new Set(
        [...last]
            .filter(([, edit]) => {
                const record = records.get(elementKey(edit.kind, edit.id));
                return (
                    record !== undefined && canonicalJson(record[edit.column]) === canonicalJson(edit.operation.value)
                );
            })
            .map(([cell]) => cell),
    );
    const operations: JsonObject[] = [];
    const held = new Map<string, Map<string, unknown>>();
    for (const edit of edits.filter((each) => kept.has(cellOf(each)))) {
        const columns = held.get(elementKey(edit.kind, edit.id)) ?? new Map<string, unknown>();
        if (!columns.has(edit.column)) {
            columns.set(edit.column, edit.before);
        }

        held.set(elementKey(edit.kind, edit.id), columns);
        const { picked, ...rest } = edit.operation;
        operations.push(typeof picked === "string" && !sources.has(picked) ? rest : edit.operation);
    }

    return { operations, held, lost: operations.length < edits.length };
}

/**
 * A record with each cell a reader edit written back sets put back to its value before the edit.
 * @param record - The record as the session holds it.
 * @param held - The cells' values before their edits.
 * @returns The record its source writes.
 */
function restored<T extends JsonObject>(record: T, held: ReadonlyMap<string, unknown> | undefined): T {
    if (held === undefined) {
        return record;
    }

    const row = Object.fromEntries(
        Object.entries(record).filter(([name]) => !held.has(name) || held.get(name) !== undefined),
    );
    for (const [name, before] of held) {
        if (before !== undefined) {
            row[name] = before;
        }
    }

    return row as T;
}

/**
 * A node's row in one supplying source's copy. A node several sources supplied when the last open
 * read them writes that source's own row as read, with each value the reader changed since the
 * open (one that differs from what it showed then) in place, so whatever a clash rule shows, every
 * source keeps its own value and the rule computes the same on reopen (design 3.10); a clash
 * column is no source's own and is computed again. Any other node writes the session's record.
 * @param node - The node as the session holds it.
 * @param load - The source's load key.
 * @param shared - What the open read of a node several sources supplied.
 * @param held - The cells a reader edit written back sets, with their values before it.
 * @returns The row.
 */
function nodeRow(
    node: NodeRecord,
    load: string,
    shared: SharedNode | undefined,
    held: ReadonlyMap<string, unknown> | undefined,
): NodeRecord {
    const own = shared?.rows.get(load);
    if (shared === undefined || own === undefined) {
        return restored(node, held);
    }

    const changed = (name: string): boolean =>
        held?.has(name) !== true && canonicalJson(node[name]) !== canonicalJson(shared.baseline[name]);
    // A column the reader removed since is left out; one changed takes the session's value.
    const row = Object.fromEntries(Object.entries(own).filter(([name]) => name in node || !changed(name)));
    for (const name of Object.keys(node).filter((each) => changed(each))) {
        row[name] = node[name];
    }

    return { ...row, id: node.id };
}

/**
 * Give each edge to the first source that supplied it, a reduced edge as its rows as read: its own
 * row where the edge is, the rows folded into it back where they were read, so a reopen reduces
 * them again and every row's key stays an alias (spec 6.1).
 * @param edges - The edges.
 * @param sources - The sources, in join order.
 * @param memory - The memory.
 * @param suppliersOf - The sources that supplied an edge, in join order.
 * @param held - The cells reader edits written back set, by {@link elementKey}.
 * @returns Each edge's source ids, the reader's edges, the sources whose edges reach each node,
 *     and the folded rows put back (which are no edge of the session).
 */
function placeEdges(
    edges: readonly EdgeRecord[],
    sources: readonly ModelSource[],
    memory: DataMemory,
    suppliersOf: (id: EdgeId) => ModelSource[],
    held: KeptEdits["held"],
): {
    edgeLoads: Map<EdgeId, string[]>;
    readerEdges: EdgeRecord[];
    reach: Map<NodeId, Set<string>>;
    folds: Set<Readonly<JsonObject>>;
} {
    const edgeLoads = new Map<EdgeId, string[]>();
    const readerEdges: EdgeRecord[] = [];
    const reach = new Map<NodeId, Set<string>>();
    const foldedRows: { readonly id: EdgeId; readonly row: ReducedRow }[] = [];
    for (const edge of edges) {
        const supplied = suppliersOf(edge.id);
        const edited = held.get(elementKey("edge", edge.id));
        if (supplied.length === 0) {
            readerEdges.push(restored(edge, edited));
            edgeLoads.set(edge.id, [READER]);
            continue;
        }

        const reduced = memory.reduced.get(edge.id);
        const own = reduced?.rows[0];
        if (reduced !== undefined && own?.source === edge.source && own.target === edge.target) {
            supplied[0].edges.push(keptRow(edge, reduced, edited));
            reduced.rows.slice(1).forEach((row) => foldedRows.push({ id: edge.id, row }));
        } else {
            supplied[0].edges.push(restored(edge, edited));
        }

        const ids = supplied.map((source) => source.id);
        edgeLoads.set(edge.id, ids);
        for (const end of [edge.source, edge.target]) {
            reach.set(end, new Set([...(reach.get(end) ?? []), ...ids]));
        }
    }

    const folds = new Set<Readonly<JsonObject>>();
    foldedRows.sort((a, b) => a.row.row - b.row.row);
    for (const { id, row } of foldedRows) {
        const source = sources.find((each) => each.id === row.load);
        if (source !== undefined) {
            const record = { ...row.columns, id, source: row.source, target: row.target } as EdgeRecord;
            source.edges.splice(Math.min(row.row, source.edges.length), 0, record);
            folds.add(record);
        }
    }

    return { edgeLoads, readerEdges, reach, folds };
}

/**
 * The sources that supply a node (spec 3.1): those whose rows built it; else, for a node only
 * edges name, the sources whose edges reach it, and it is no row of their copies; else, once no
 * edge reaches it or once it holds a value (the reader's edits are baked into the copies), the
 * sources that named it, as rows, so a reopen keeps it.
 * ponytail: until the reader source holds edits, an edit makes a named node a row.
 * @param node - The node.
 * @param supplied - The sources its load provenance lists, in join order.
 * @param index - What the sources named and reach.
 * @param index.named - The nodes each load only named, by load key.
 * @param index.reach - The sources whose edges reach each node.
 * @param index.sources - The sources, in join order.
 * @returns Its sources, and whether it is named only.
 */
function suppliersOf(
    node: NodeRecord,
    supplied: readonly ModelSource[],
    index: {
        readonly named: ReadonlyMap<string, ReadonlySet<NodeId>>;
        readonly reach: ReadonlyMap<NodeId, ReadonlySet<string>>;
        readonly sources: readonly ModelSource[];
    },
): { readonly loads: readonly ModelSource[]; readonly named: boolean } {
    const rows = supplied.filter((source) => index.named.get(source.load.key)?.has(node.id) !== true);
    if (rows.length > 0) {
        return { loads: rows, named: false };
    }

    const bare = Object.keys(node).every((name) => name === "id");
    const reaching = index.sources.filter((source) => index.reach.get(node.id)?.has(source.id) === true);
    return bare && reaching.length > 0 ? { loads: reaching, named: true } : { loads: supplied, named: false };
}

/**
 * The open data as version 2 names it: sources in join order, their copies and copy ids, each
 * node's record key and each edge's reference, from today's loads and records.
 * @param session - The session.
 * @returns The model.
 */
function dataModelOf(session: GraphSession): DataModel {
    const memory = memoryOf(session);
    const loads = session.data.sources();
    const byKey = new Map<string, ModelSource>();
    const sources: ModelSource[] = loads.map((load) => {
        const source: ModelSource = { id: sourceIdOf(load.key, memory), load, nodes: [], edges: [] };
        byKey.set(load.key, source);
        return source;
    });
    const order = new Map(sources.map((source, at) => [source.id, at]));
    const loadsOf = (keys: readonly string[]): ModelSource[] =>
        keys
            .map((key) => byKey.get(key))
            .filter((source): source is ModelSource => source !== undefined)
            .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    // Today's loads share one id system: every node a load supplied is in the first load's space,
    // so keys meet across loads exactly as today's ids do.
    const shared = sources.length === 0 ? `source:${READER}` : `source:${sources[0].id}`;

    const reserved = new Set<string>();
    // The whole graph, whatever the filter shows: a save writes every element. With a group
    // collapsed it is the graph expanded, the collapse being view's decision (spec 4.7 rule 8),
    // and a member out of the graph is named by the loads that supplied it.
    const expanded = expandedGraph(session);
    const nodes = (expanded?.nodes ?? session.data.nodes({ scope: "graph" })).map((node) =>
        withoutReserved(node, "node", reserved),
    );
    const edges = (
        expanded?.edges.map(({ id, record }) => ({ ...record, id }) as EdgeRecord) ??
        session.data.edges({ scope: "graph" })
    ).map((edge) => withoutReserved(edge, "edge", reserved));
    const loadIndex = expanded === null ? undefined : suppliedIndex(session);
    const sourcesOf = (id: NodeId | EdgeId, kind: "node" | "edge"): readonly string[] => {
        if (loadIndex === undefined) {
            return session.data.sourcesOf(id, { kind });
        }

        const held = kind === "node" ? loadIndex.nodes.get(id) : loadIndex.edges.get(String(id));
        return held ?? [];
    };
    const edits = keptEdits(
        memory.edits,
        new Map<string, Readonly<JsonObject>>([
            ...nodes.map((node) => [elementKey("node", node.id), node] as const),
            ...edges.map((edge) => [elementKey("edge", edge.id), edge] as const),
        ]),
        new Set(sources.map((source) => source.id)),
    );
    const { edgeLoads, readerEdges, reach, folds } = placeEdges(
        edges,
        sources,
        memory,
        (id) => loadsOf(sourcesOf(id, "edge")),
        edits.held,
    );
    const named = namedIndex(session);
    const nodeLoads = new Map<NodeId, string[]>();
    const nodeRefs = new Map<NodeId, NodeRef>();
    const namedOnly = new Set<NodeId>();
    const readerNodes: NodeRecord[] = [];
    // The keys an open read for reader nodes are theirs, whatever order the nodes come in.
    const readerKeys = new Set(
        [...memory.nodeRefs.values()].filter((ref) => ref.space === `source:${READER}`).map((ref) => ref.key),
    );
    for (const node of nodes) {
        const supplier = suppliersOf(node, loadsOf(sourcesOf(node.id, "node")), { named, reach, sources });
        const edited = edits.held.get(elementKey("node", node.id));
        if (supplier.named) {
            namedOnly.add(node.id);
        } else {
            const own = memory.shared.get(node.id);
            supplier.loads.forEach((source) => source.nodes.push(nodeRow(node, source.load.key, own, edited)));
        }

        const name = nameNode(node.id, supplier.loads, memory, shared, readerKeys);
        nodeLoads.set(node.id, name.loads);
        nodeRefs.set(node.id, name.ref);
        if (name.reader) {
            readerNodes.push(restored(node, edited));
        }
    }

    const folded = foldedOperations(session, edits.lost).size > 0;
    const edgeIdColumn = edgeIdColumnOf(session);
    const copies = new Map(
        sources.map((source) => [
            source.id,
            copyOf(source, nodeRefs, memory, factsOf(session, source.load.key), folded, edgeIdColumn),
        ]),
    );
    const edgeRefs = new Map<EdgeId, EdgeRef>();
    for (const source of sources) {
        const copy = copies.get(source.id) as Copy;
        source.edges.forEach((edge, row) => {
            if (folds.has(edge)) {
                return;
            }

            const id = edgeIdColumn === undefined || copy.repeated.has(row) ? undefined : edge[edgeIdColumn];
            const key = keyText(id);
            edgeRefs.set(edge.id, { load: source.id, key: key ?? `${copy.copy}#${String(row)}` });
        });
    }

    // A reader edge is keyed by its edge-id cell, as a source row is, when no other reader edge
    // repeats it; else by a ULID minted once. An edge added to a node standing in for a group is
    // a reader edge too, written by view with its collapse (spec 4.7 rule 8), not in this copy.
    const allReader = [...readerEdges.map((edge) => ({ id: edge.id, record: edge })), ...(expanded?.added ?? [])];
    const readerEdgeIds = allReader.map(({ record }) =>
        edgeIdColumn === undefined ? undefined : keyText(record[edgeIdColumn]),
    );
    const counts = new Map<string | undefined, number>();
    for (const own of readerEdgeIds) {
        counts.set(own, (counts.get(own) ?? 0) + 1);
    }

    allReader.forEach(({ id }, at) => {
        const own = readerEdgeIds[at];
        const unique = own !== undefined && counts.get(own) === 1;
        edgeRefs.set(id, { load: READER, key: unique ? own : readerKeyOf(memory, `e:${id}`) });
    });

    const reader = readerCopyOf(readerNodes, readerEdges, { nodeRefs, edgeRefs, memory, edits: edits.operations });
    return {
        session,
        directed: session.status.directed,
        sources,
        nodes,
        edges,
        nodeLoads,
        edgeLoads,
        ...(edgeIdColumn === undefined ? {} : { edgeIdColumn }),
        nodeRefs,
        edgeRefs,
        copies,
        ...(reader === undefined ? {} : { reader }),
        unavailable: memory.unavailable,
        reserved,
        namedOnly,
        editsLost: edits.lost,
    };
}

/**
 * A reader `add`'s `columns` and the `dtypes` they are declared with (spec 4.1.4), each cell
 * written as a copy's is, so a non-finite number reads back as a number.
 * @param values - The element's columns.
 * @returns `columns` and `dtypes`.
 */
export function addedColumns(values: Readonly<JsonObject>): { columns: JsonObject; dtypes: JsonObject } {
    const columns: JsonObject = {};
    const dtypes: JsonObject = {};
    for (const [name, value] of Object.entries(values)) {
        if (value !== undefined) {
            const { decl, cells } = columnOf(name, [value]);
            columns[name] = cells[0];
            dtypes[name] = decl.dtype;
        }
    }

    return { columns, dtypes };
}

/**
 * The reader source's operations: today, only the elements no load supplied, each an `add`.
 * @param nodes - The nodes no load supplied.
 * @param edges - The edges no load supplied.
 * @param named - The references and the memory.
 * @param named.nodeRefs - Each node's reference.
 * @param named.edgeRefs - Each edge's reference.
 * @param named.memory - The memory.
 * @param named.edits - The reader's edits an open read, written back as read.
 * @returns The reader copy, or undefined when the reader added nothing.
 */
function readerCopyOf(
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    named: {
        nodeRefs: ReadonlyMap<NodeId, NodeRef>;
        edgeRefs: ReadonlyMap<EdgeId, EdgeRef>;
        memory: DataMemory;
        edits: readonly JsonObject[];
    },
): ReaderCopy | undefined {
    const { nodeRefs, edgeRefs, memory, edits } = named;
    if (nodes.length + edges.length + edits.length + memory.heldOperations.length === 0) {
        return undefined;
    }

    const operations: JsonObject[] = [
        // The id is kept as the `id` column, typed, so a numeric id reads back as a number.
        ...nodes.map((node) => ({ op: "add", node: nodeRefs.get(node.id), ...addedColumns(node) })),
        ...edges.map(({ id, source, target, ...columns }) => ({
            op: "add",
            edge: edgeRefs.get(id),
            from: nodeRefs.get(source),
            to: nodeRefs.get(target),
            ...addedColumns(columns),
        })),
        ...edits,
        // What a held source supplies is not in the session: the operations on it as read.
        ...memory.heldOperations,
    ];
    const digest = digestOf(operations);
    const { copy } = stableId(memory.copies.get(READER), digest, mintUlid);
    memory.copies.set(READER, { digest, copy });
    return { operations, digest, copy };
}

// ---------------------------------------------------------------------------------------------
// The data body, written
// ---------------------------------------------------------------------------------------------

/** A timestamp as `toISOString` writes it (spec 3.5). */
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/;

/**
 * The space most of a list of references name, or undefined for none.
 * @param refs - The references.
 * @returns The space.
 */
function spaceOf(refs: readonly (NodeRef | undefined)[]): string | undefined {
    // ponytail: a source whose rows name nodes in several spaces writes the first one; today's
    // model never makes one, since every load shares one space.
    return refs.find((ref) => ref !== undefined)?.space;
}

/**
 * A source's `mapping` (spec 4.1.3): its node key and space, and its edge columns and end spaces.
 * @param source - The source.
 * @param model - The model.
 * @param copy - Its copy.
 * @returns The mapping.
 */
function mappingOf(source: ModelSource, model: DataModel, copy: Copy): JsonObject {
    const { edgeIdColumn, nodeRefs } = model;
    const own = spaceOf(source.nodes.map((node) => nodeRefs.get(node.id))) ?? `source:${model.sources[0].id}`;
    const hasEdgeId =
        edgeIdColumn !== undefined && source.edges.some((edge) => keyText(edge[edgeIdColumn]) !== undefined);
    return {
        ...(copy.tables.nodes === undefined ? {} : { nodes: { key: "id", space: own } }),
        ...(source.edges.length === 0
            ? {}
            : {
                  edges: {
                      ...(hasEdgeId ? { edgeId: edgeIdColumn } : {}),
                      source: "source",
                      sourceSpace: spaceOf(source.edges.map((edge) => nodeRefs.get(edge.source))) ?? own,
                      target: "target",
                      targetSpace: spaceOf(source.edges.map((edge) => nodeRefs.get(edge.target))) ?? own,
                  },
              }),
    };
}

/**
 * A mapping with the source's weight, time and location roles (spec 4.1.3 rule 7): a source the
 * last open read keeps its roles as read while their settings are what the open set; otherwise
 * the graph-wide settings are written as the roles of each table whose rows carry their column.
 * @param mapping - The mapping, its roles as read replaced.
 * @param source - The source.
 * @param model - The model.
 * @returns The mapping.
 */
function withRoles(mapping: JsonObject, source: ModelSource, model: DataModel): JsonObject {
    const rows = { nodes: source.nodes, edges: source.edges } as const;
    const read = memoryOf(model.session).roles;
    const own = read.sources.get(source.id);
    const roles = sourceRoles(
        model.session.config.data.knownFields,
        (table, column) => rows[table].some((row) => row[column] !== undefined),
        own === undefined ? undefined : { roles: own, patch: read.patch },
    );
    const out: JsonObject = {};
    for (const table of ["nodes", "edges"] as const) {
        const members = mapping[table] as JsonObject | undefined;
        if (members !== undefined) {
            const kept = Object.fromEntries(
                Object.entries(members).filter(
                    ([name]) => !ROLE_FIELDS.some((each) => each.table === table && each.role === name),
                ),
            );
            out[table] = { ...kept, ...roles[table] };
        }
    }

    return out;
}

/**
 * A referenced source's `mapping` (spec 4.1.3): the roles its file's rows are read with. A graph
 * file's format sets them, and names them as a copy does; a table's are the columns its load read
 * as the key or the ends, which the one an open read keeps.
 * @param source - The source.
 * @param model - The model.
 * @param copy - Its copy.
 * @returns The mapping.
 */
function readMappingOf(source: ModelSource, model: DataModel, copy: Copy): JsonObject {
    const read = memoryOf(model.session).referenced.get(source.id);
    if (read !== undefined) {
        return read;
    }

    const mapping = mappingOf(source, model, copy);
    const [table] = Object.values(source.load.mapping?.tables ?? {});
    // A CSV read with no roles named was read by the header columns its reader chose.
    const by = table ?? readByOf(model.session, source.load.key);
    if (by === undefined) {
        return mapping;
    }

    const key = "key" in by && typeof by.key === "string" ? by.key : undefined;
    const ends =
        table === undefined
            ? (by as { source?: string; target?: string })
            : { source: table.source?.column, target: table.target?.column };
    const nodes = mapping.nodes as JsonObject | undefined;
    const edges = mapping.edges as JsonObject | undefined;
    return {
        ...(nodes === undefined ? {} : { nodes: { ...nodes, ...(key === undefined ? {} : { key }) } }),
        ...(edges === undefined || ends.source === undefined || ends.target === undefined
            ? {}
            : { edges: { ...edges, source: ends.source, target: ends.target } }),
    };
}

/** The header columns a CSV table was read by, as its load's stored entry keeps them. */
type ReadBy = { readonly source: string; readonly target: string } | { readonly key: string };

/**
 * The header columns a load's CSV table was read by when no roles were named, from its stored
 * entry.
 * @param session - The session.
 * @param key - The load's key.
 * @returns The columns, or undefined when the load kept none.
 */
function readByOf(session: GraphSession, key: string): ReadBy | undefined {
    const stored = dispatcherOf(session).state.graph.values.get(SOURCES_VALUE) as
        readonly { readonly key?: string; readonly readBy?: ReadBy }[] | undefined;
    return stored?.find((entry) => entry.key === key)?.readBy;
}

/**
 * The style choices a load was given, kept on its stored entry, as source options.
 * @param session - The session.
 * @param key - The load's key.
 * @returns `styles` and `styleOptions`, or nothing.
 */
function drawnOf(session: GraphSession, key: string): JsonObject {
    const stored = dispatcherOf(session).state.graph.values.get(SOURCES_VALUE) as
        readonly { readonly key?: string; readonly drawn?: JsonObject }[] | undefined;
    return stored?.find((entry) => entry.key === key)?.drawn ?? {};
}

/**
 * A network source's closed `origin` (spec 4.1.2 rule 7): its address, credential slot, HTTP
 * validators and `ledger`, the session's record of the load (its request history) keyed by the
 * source id; the origin an open read while the session records no load of its own.
 * @param source - The source.
 * @param model - The model.
 * @param copy - Its copy id.
 * @returns The origin.
 */
function networkOrigin(source: ModelSource, model: DataModel, copy: string): JsonObject {
    const live = model.session.data.loads().find((record) => record.key === source.load.key);
    const read = memoryOf(model.session).origins.get(source.id);
    if (live === undefined && read !== undefined) {
        return { ...read, copy };
    }

    const slot = live?.credential?.slot;
    const { etag, lastModified } = live?.validators ?? {};
    return {
        copy,
        ...(source.load.url === undefined ? {} : { url: source.load.url }),
        ...(slot === undefined ? {} : { credentials: { slot } }),
        ...(etag === undefined ? {} : { etag }),
        ...(lastModified === undefined ? {} : { lastModified }),
        ...(live === undefined ? {} : { ledger: jsonSafe({ ...live, key: source.id }) }),
    };
}

/**
 * A file, url, sample or derived source's `origin` (spec 4.1.2): a file's name, size and media
 * type; a URL's address, size, media type and HTTP validators; a sample's dataset and version.
 * What the load read wins; else what the file it was opened from said.
 * @param source - The source.
 * @param model - The model.
 * @param kind - Its kind.
 * @param copy - Its copy id.
 * @returns The origin.
 */
function originOf(source: ModelSource, model: DataModel, kind: string, copy: string): JsonObject {
    const { load } = source;
    const facts = factsOf(model.session, load.key);
    const { copy: _copy, ...read } = memoryOf(model.session).origins.get(source.id) ?? {};
    const sample = facts?.sample;
    const live: JsonObject = {
        ...(load.fileName === undefined ? {} : { name: load.fileName }),
        ...(load.url === undefined ? {} : { url: load.url }),
        ...(load.size === undefined ? {} : { size: load.size }),
        ...(jsonSafe({
            size: facts?.file?.size ?? facts?.url?.size,
            mediaType: facts?.file?.mediaType,
            etag: facts?.url?.etag,
            lastModified: facts?.url?.lastModified,
            dataset: typeof sample?.dataset === "string" ? sample.dataset : undefined,
            version: typeof sample?.version === "string" ? sample.version : undefined,
            // A generated sample's call: what a refresh runs again, never its copy id.
            generator: typeof sample?.generator === "string" ? sample.generator : undefined,
            params: typeof sample?.generator === "string" ? sample.params : undefined,
        }) as JsonObject),
    };
    // A derived source holds only its copy id; the details belong to the kinds that read bytes.
    return kind === "derived" ? { copy } : { copy, ...read, ...live };
}

/**
 * One source record (spec 4.1.2), from its load.
 * @param source - The source.
 * @param model - The model.
 * @param storage - Embedded or referenced.
 * @param path - A file source's path, if it has one: the saver's, else the one read, rebased.
 * @returns The record.
 */
function sourceRecordOf(
    source: ModelSource,
    model: DataModel,
    storage: SourceStorage,
    path: string | undefined,
): JsonObject {
    const { load } = source;
    const copy = model.copies.get(source.id) as Copy;
    const kind = kindOfSource(source, memoryOf(model.session));
    // The style choices decide which columns a read makes, so they are options the file is read
    // again with (spec 4.1.2 rule 5).
    const options = { ...redactedParams(load.config ?? {}), ...drawnOf(model.session, load.key) };
    delete options.url;
    const origin: JsonObject =
        kind === "network" ? networkOrigin(source, model, copy.copy) : originOf(source, model, kind, copy.copy);
    if (kind === "file") {
        delete origin.path;
        if (path !== undefined) {
            origin.path = path;
        }
    }

    const { choices } = load;
    return {
        id: source.id,
        label: load.name ?? load.fileName ?? source.id,
        kind,
        ...(load.type === undefined ? {} : { format: load.type }),
        ...(Object.keys(options).length === 0 ? {} : { options: jsonSafe(options) }),
        origin,
        mapping: withRoles(
            storage === "embedded" ? mappingOf(source, model, copy) : readMappingOf(source, model, copy),
            source,
            model,
        ),
        settings: { duplicateIds: choices?.duplicateIds ?? "first", unmatched: choices?.unmatched ?? "add" },
        // A referenced source keeps its columns too: what an open checks the rows it reads against.
        ...(storage === "embedded" ? { copy: copy.tables } : {}),
        columns: copy.columns,
        ...(load.loadedAt !== undefined && TIMESTAMP.test(load.loadedAt) ? { loaded: load.loadedAt } : {}),
    };
}

/**
 * The type registry (spec 4.1.5): the types the last data section read declared, their rules on
 * sources still open, then one type per node or edge `kind` value no read type names, each
 * declared by the sources whose rows carry it in their `kind` column.
 * @param model - The model.
 * @returns The entries.
 */
function typesOf(model: DataModel): JsonObject[] {
    // A staged source is written back with its record, so its rules stay too (spec 4.1.8 rule 1).
    const open = new Set([
        ...model.sources.map((source) => source.id),
        ...memoryOf(model.session).staged.map((record) => String(record.id)),
    ]);
    const read = memoryOf(model.session).types.flatMap((type): JsonObject[] => {
        const rules = (Array.isArray(type.rules) ? type.rules : []).filter(
            (rule) => isPlainObject(rule) && open.has(String(rule.source)),
        );
        return rules.length === 0 ? [] : [{ ...type, rules }];
    });
    const taken = new Set(read.map((type) => `${String(type.kind)}:${String(type.name)}`));
    const entries = new Map<string, { name: string; kind: string; sources: string[] }>();
    const note = (kind: string, record: Readonly<JsonObject>, source: string): void => {
        const name = recordType(record);
        const at = `${kind}:${String(name)}`;
        if (name === undefined || taken.has(at)) {
            return;
        }

        const entry = entries.get(at) ?? { name, kind, sources: [] };
        entries.set(at, entry);
        if (!entry.sources.includes(source)) {
            entry.sources.push(source);
        }
    };
    for (const source of model.sources) {
        for (const node of source.nodes) {
            note("node", node, source.id);
        }

        for (const edge of source.edges) {
            note("edge", edge, source.id);
        }
    }

    return [
        ...read,
        ...[...entries.values()].map((entry) => ({
            name: entry.name,
            kind: entry.kind,
            rules: entry.sources.map((source) => ({ source, column: "kind", values: [entry.name] })),
            schema: { type: "object" },
        })),
    ];
}

/**
 * Whether a type rule matches a row of a source (spec 4.1.5). A rule naming a `part` reads only that
 * `join.edges` step's rows, never a `join.add`'s.
 * @param rule - The rule.
 * @param source - The source the row came from.
 * @param row - The row.
 * @param end - `source` or `target` for an edge row read for its end, else undefined.
 * @returns True when it matches.
 */
function ruleMatches(rule: unknown, source: string, row: Readonly<JsonObject>, end?: string): boolean {
    if (!isPlainObject(rule) || rule.source !== source || rule.end !== end || rule.part !== undefined) {
        return false;
    }

    if (typeof rule.column !== "string") {
        return true;
    }

    const cell = keyText(row[rule.column]);
    return (
        Array.isArray(rule.values) &&
        rule.values.some((value) => typeof value === "string" && value.normalize("NFC") === cell)
    );
}

/**
 * The one type a row of a source gives an element (spec 4.1.5): among the types of its kind whose
 * rules match the row, one matched by a rule with `column` and `values` beats one matched only by a
 * whole-source or whole-end rule, then the first in registry order wins.
 * @param types - The registry, in order.
 * @param kind - `node` or `edge`.
 * @param source - The row's source id.
 * @param row - The row.
 * @param end - `source` or `target` for an edge row read for the node at that end.
 * @returns The type's name, or undefined for the default type.
 */
export function rowTypeOf(
    types: readonly JsonObject[],
    kind: "node" | "edge",
    source: string,
    row: Readonly<JsonObject>,
    end?: string,
): string | undefined {
    let whole: string | undefined;
    for (const type of types) {
        const matched = (type.kind === kind && Array.isArray(type.rules) ? type.rules : []).filter((rule) =>
            ruleMatches(rule, source, row, end),
        );
        if (matched.some((rule) => isPlainObject(rule) && typeof rule.column === "string")) {
            return String(type.name);
        }

        if (matched.length > 0) {
            whole ??= String(type.name);
        }
    }

    return whole;
}

/**
 * Each element's one type (spec 4.1.5): the first step in build order to give a node a type sets
 * it, a source's node rows before its edge ends; an edge takes its own row's type. An element no
 * rule types has the default type, an empty list.
 * @param model - The model.
 * @param types - The registry.
 * @returns The types of each node and each edge, each list holding at most one name.
 */
function elementTypesOf(
    model: DataModel,
    types: readonly JsonObject[],
): { nodes: Map<NodeId, string[]>; edges: Map<EdgeId, string[]> } {
    const nodes = new Map<NodeId, string[]>();
    const edges = new Map<EdgeId, string[]>();
    const give = (id: NodeId, name: string | undefined): void => {
        if (name !== undefined && !nodes.has(id)) {
            nodes.set(id, [name]);
        }
    };
    for (const source of model.sources) {
        for (const node of source.nodes) {
            give(node.id, rowTypeOf(types, "node", source.id, node));
        }

        for (const edge of source.edges) {
            for (const end of ["source", "target"] as const) {
                give(edge[end], rowTypeOf(types, "node", source.id, edge, end));
            }

            const name = rowTypeOf(types, "edge", source.id, edge);
            edges.set(edge.id, edges.get(edge.id) ?? (name === undefined ? [] : [name]));
        }
    }

    return { nodes, edges };
}

/**
 * The open data's elements that have any of the named types (spec 4.1.5), as the registry the last
 * data section read assigns them: what a `type` selector or a `{ types }` scope names.
 * ponytail: the ids as the data stands now; a style or run reading them does not follow later
 * changes to the data. Give the session a type predicate to keep them live.
 * @param session - The session.
 * @param names - The type names.
 * @returns The node and edge ids, in data order.
 */
export function typedIds(session: GraphSession, names: readonly string[]): { nodes: NodeId[]; edges: EdgeId[] } {
    const wanted = new Set(names);
    const { nodes, edges } = elementTypesOf(dataModelOf(session), memoryOf(session).types);
    const pick = <T>(typed: Map<T, string[]>): T[] =>
        [...typed].filter(([, types]) => types.some((type) => wanted.has(type))).map(([id]) => id);
    return { nodes: pick(nodes), edges: pick(edges) };
}

/**
 * The type conversions (spec 4.1.6): each converted column's type, from today's column settings.
 * @param session - The session.
 * @returns The conversions.
 */
function conversionsOf(session: GraphSession): JsonObject[] {
    const settings = dispatcherOf(session).state.graph.values.get(COLUMNS_VALUE) as ColumnSettings | undefined;
    return Object.entries(settings?.types ?? {}).flatMap(([column, type]) => {
        const at = column.indexOf(":");
        const kind = column.slice(0, at);
        return kind === "node" || kind === "edge" ? [{ kind, name: column.slice(at + 1), type }] : [];
    });
}

/**
 * The data issues (spec 4.1.7): the ignored issues by the parts of their ids, and the kept pairs
 * as node references.
 * @param model - The model.
 * @returns The issues, or undefined when nothing was ignored or kept.
 */
function issuesOf(model: DataModel): JsonObject | undefined {
    const state = dispatcherOf(model.session).state.graph.values.get(ISSUES_VALUE) as IssueState | undefined;
    const ignored = (state?.ignored ?? []).flatMap((id) => {
        const [code, kind, ...rest] = id.split(":");
        if (kind !== "node" && kind !== "edge") {
            return [];
        }

        const name = rest.join(":");
        return [{ code, kind, ...(name.length === 0 ? {} : { name }) }];
    });
    const kept = (state?.kept ?? []).flatMap((pair) => {
        let ends: unknown;
        try {
            ends = JSON.parse(pair) as unknown;
        } catch {
            return [];
        }

        const [from, to] = Array.isArray(ends) ? ends : [];
        const refs = [from, to].map((end) => model.nodes.find((node) => String(node.id) === String(end)));
        const a = refs[0] === undefined ? undefined : model.nodeRefs.get(refs[0].id);
        const b = refs[1] === undefined ? undefined : model.nodeRefs.get(refs[1].id);
        return a === undefined || b === undefined ? [] : [{ from: a, to: b }];
    });
    return ignored.length + kept.length === 0 ? undefined : { ignored, kept };
}

/** The node-link handles: a working column of one of these names is written `<name> (column)`. */
const HANDLES = new Set(["id", "source", "target", "key"]);

/**
 * A record's working columns as node-link graph attributes (spec 4.1.9): a column named like a
 * node-link handle as `<name> (column)`, whatever its value.
 * @param columns - The record's columns.
 * @returns The attributes.
 */
function userColumns(columns: Readonly<JsonObject>): JsonObject {
    const out: JsonObject = {};
    for (const [name, value] of Object.entries(columns)) {
        if (value !== undefined) {
            out[HANDLES.has(name) ? `${name} (column)` : name] = jsonSafe(value);
        }
    }

    return out;
}

/**
 * A node's key column as the graph writes it: as its copy writes it for a node a load supplied,
 * none for one the reader added or only edges name.
 * @param model - The model.
 * @param id - The node.
 * @param ref - Its reference.
 * @param loads - Its source ids.
 * @returns The cell, or undefined.
 */
function keyColumnOf(model: DataModel, id: NodeId, ref: NodeRef, loads: readonly string[]): unknown {
    if (!loads.some((load) => load !== READER) || model.namedOnly.has(id)) {
        return undefined;
    }

    return keyCellOf(ref, id);
}

/**
 * An edge's end columns as its copy writes them, or none for a reader-added edge.
 * @param edge - The edge.
 * @param ref - Its reference.
 * @param nodeRefs - Each node's reference.
 * @returns The `source` and `target` columns.
 */
function endColumns(edge: EdgeRecord, ref: EdgeRef, nodeRefs: ReadonlyMap<NodeId, NodeRef>): JsonObject {
    return ref.load === READER
        ? { source: undefined, target: undefined }
        : {
              source: keyCellOf(nodeRefs.get(edge.source), edge.source),
              target: keyCellOf(nodeRefs.get(edge.target), edge.target),
          };
}

/**
 * The nodes in the order an open builds them: each source's node rows, then the nodes its edges
 * name, in join order; then the reader's. So a session opened from the file writes the same graph
 * as the session that saved it, whatever order its loads put the nodes in.
 * @param model - The model.
 * @returns The nodes.
 */
function buildOrder(model: DataModel): NodeRecord[] {
    const rank = new Map<NodeId, number>();
    const see = (id: NodeId): void => {
        if (!rank.has(id)) {
            rank.set(id, rank.size);
        }
    };
    for (const source of model.sources) {
        for (const node of source.nodes) {
            see(node.id);
        }

        for (const edge of source.edges) {
            see(edge.source);
            see(edge.target);
        }
    }

    for (const node of model.nodes) {
        see(node.id);
    }

    const ordered = [...model.nodes];
    ordered.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    return ordered;
}

/**
 * The merged graph (spec 4.1.9): NetworkX node-link JSON of the elements an embedded source, or
 * the reader, supplied.
 * @param model - The model.
 * @param embedded - The ids of the embedded sources, the reader's included.
 * @param types - The registry.
 * @returns The graph.
 */
function graphOf(model: DataModel, embedded: ReadonlySet<string>, types: readonly JsonObject[]): JsonObject {
    const typed = elementTypesOf(model, types);
    const handles = new Map<NodeId, number>();
    const namedByEmbedded = new Set(
        model.edges
            .filter((edge) => (model.edgeLoads.get(edge.id) ?? []).some((id) => embedded.has(id)))
            .flatMap((edge) => [edge.source, edge.target]),
    );
    const nodes: JsonObject[] = [];
    for (const node of buildOrder(model)) {
        const loads = model.nodeLoads.get(node.id) ?? [];
        if (!loads.some((id) => embedded.has(id)) && !(loads.length === 0 && namedByEmbedded.has(node.id))) {
            continue;
        }

        const ref = model.nodeRefs.get(node.id) as NodeRef;
        handles.set(node.id, nodes.length);
        nodes.push({
            id: nodes.length,
            "graphty.space": ref.space,
            "graphty.key": ref.key,
            "graphty.types": typed.nodes.get(node.id) ?? [],
            "_source.loads": loads,
            // A node a load supplied has its key column, `id` in the copy, as the copy writes it; one
            // the reader added or only an edge named has no row, so its session id is no column.
            ...userColumns({
                ...node,
                id: keyColumnOf(model, node.id, ref, loads),
            }),
        });
    }

    const links: JsonObject[] = [];
    const pairs = new Map<string, number>();
    // Every working column is written, the edge-id column included (spec 4.1.9).
    for (const edge of model.edges) {
        const loads = model.edgeLoads.get(edge.id) ?? [];
        const from = handles.get(edge.source);
        const to = handles.get(edge.target);
        if (!loads.some((id) => embedded.has(id)) || from === undefined || to === undefined) {
            continue;
        }

        const ref = model.edgeRefs.get(edge.id) as EdgeRef;
        const pair = model.directed || from <= to ? `${String(from)}>${String(to)}` : `${String(to)}>${String(from)}`;
        pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
        links.push({
            source: from,
            target: to,
            "graphty.load": ref.load,
            "graphty.key": ref.key,
            "graphty.types": typed.edges.get(edge.id) ?? [],
            "_source.loads": loads,
            // The edge's session id is no working column; its end columns are, as the copy writes
            // them, for an edge a load supplied, and a reader-added edge has no row at all.
            ...userColumns({ ...edge, id: undefined, ...endColumns(edge, ref, model.nodeRefs) }),
        });
    }

    return {
        directed: model.directed,
        multigraph: [...pairs.values()].some((count) => count > 1),
        graph: {},
        nodes,
        links,
    };
}

/** The data body as written, the digest of its build inputs, and its build stamp. */
interface WrittenBody {
    readonly body: JsonObject;
    readonly digest: string;
    readonly stamp: BuildStamp;
}

/**
 * Why a source asked to be referenced cannot be: its rows are not its bytes alone (spec 4.1.2).
 * `edited`: the reader edited, removed or merged rows; `bytes`: the session kept no digest of the
 * bytes it read; `rows`: another load also supplied one of its nodes or edges; `mapping`: its read
 * has no spelling in a mapping (several tables, or ids scoped by kind).
 * @param source - The source.
 * @param model - The model.
 * @returns The reason, or undefined when a reference can stand for it.
 */
function embedReason(source: ModelSource, model: DataModel): SourceEmbeddedReason | undefined {
    if ((model.copies.get(source.id) as Copy).embedOnly) {
        return foldedOperations(model.session, model.editsLost).size > 0 ? "edited" : "bytes";
    }

    const shared = (loads: readonly string[] | undefined): boolean => (loads?.length ?? 0) > 1;
    if (
        source.nodes.some((node) => shared(model.nodeLoads.get(node.id))) ||
        source.edges.some((edge) => shared(model.edgeLoads.get(edge.id)))
    ) {
        return "rows";
    }

    const tables = Object.keys(source.load.mapping?.tables ?? {}).length;
    // A CSV this session read whose roles were neither named nor read by its header columns has no
    // spelling. ponytail: one opened from an embedded copy keeps the copy's role names, right only
    // for a `source,target` header; keep the header columns in the embedded record to know them.
    const unnamed =
        source.load.type === "csv" &&
        tables === 0 &&
        !memoryOf(model.session).origins.has(source.id) &&
        readByOf(model.session, source.load.key) === undefined;
    return tables > 1 || unnamed || source.load.choices?.kindIds === "scoped" ? "mapping" : undefined;
}

/** The saver's choices per source, each by source id or load key. */
interface SourceChoices {
    /** Embedded or referenced; embedded when absent. */
    readonly embed: Readonly<Record<string, SourceStorage>>;
    /** A file source's path relative to the folder the file is saved in. */
    readonly paths: Readonly<Record<string, string>>;
    /** A file source's browser file handle, referenced with no `path`. */
    readonly handles?: Readonly<Record<string, ProjectFileHandle>>;
    /** The URL of the file being saved, which every path read is rebased to. */
    readonly location?: string;
    /** The URL of the file the data was opened from, which every path read is relative to. */
    readonly opened?: string;
}

/**
 * A path read relative to the file the data was opened from, written relative to the file being
 * saved (spec 4.1.2 rule 6). Without both locations it is written as read.
 * @param path - The path as read.
 * @param opened - The URL of the file it was read from.
 * @param location - The URL of the file being saved.
 * @returns The path, or undefined when the file is not in or below the saved file's folder.
 */
export function rebasedPath(
    path: string,
    opened: string | undefined,
    location: string | undefined,
): string | undefined {
    if (opened === undefined || location === undefined) {
        return path;
    }

    try {
        // The path is POSIX, not a URL: each segment is encoded so `%`, `#`, `?` and backslash stay
        // part of the name.
        const posix = path
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/");
        const target = new URL(posix, opened);
        const folder = new URL(".", location);
        if (target.origin !== folder.origin || !target.pathname.startsWith(folder.pathname)) {
            return undefined;
        }

        const rest = decodeURIComponent(target.pathname.slice(folder.pathname.length));
        return rest === "" ? undefined : rest;
    } catch {
        return undefined;
    }
}

/**
 * A record written back as read with its `path` rebased (spec 3.11 of the design: a held copy
 * keeps its path), or with none when the file is outside the saved file's folder, reported.
 * @param record - The record.
 * @param choices - The saver's choices.
 * @param problems - Collects `W_SOURCE_NO_PATH`.
 * @returns The record.
 */
export function rebasedRecord(
    record: JsonObject,
    choices: Pick<SourceChoices, "location" | "opened">,
    problems: DocumentProblem[],
): JsonObject {
    const origin = isPlainObject(record.origin) ? record.origin : undefined;
    if (record.kind !== "file" || typeof origin?.path !== "string") {
        return record;
    }

    const path = rebasedPath(origin.path, choices.opened, choices.location);
    if (path === origin.path) {
        return record;
    }

    const { path: _path, ...rest } = origin;
    if (path === undefined) {
        problems.push({ code: "W_SOURCE_NO_PATH", params: { source: String(record.id) } });
    }

    return { ...record, origin: path === undefined ? rest : { ...rest, path } };
}

/**
 * A choice the saver made for a source, by its source id or, failing that, its load key.
 * @param choices - The choices.
 * @param source - The source.
 * @returns The choice, if any.
 */
function chosenFor<T>(choices: Readonly<Record<string, T>>, source: ModelSource): T | undefined {
    return choices[source.id] ?? choices[source.load.key];
}

/**
 * Refuse a choice that names no source, which would otherwise be dropped silently, and a path
 * that is not relative to the folder the file is saved in (spec 4.1.2 rule 6).
 * @param model - The model.
 * @param choices - The choices.
 * @throws A `GraphtyError` with `E_OPTION_RANGE` (`details.option`, `details.value`).
 */
function checkChoices(model: DataModel, choices: SourceChoices): void {
    const named = new Set([READER, ...model.sources.flatMap((source) => [source.id, source.load.key])]);
    for (const option of ["embed", "paths", "handles"] as const) {
        const unknown = Object.keys(choices[option] ?? {}).find((key) => !named.has(key));
        if (unknown !== undefined) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                source: "data",
                message: `The ${option} option names ${JSON.stringify(unknown)}, which is no source of the open data.`,
                details: { option, value: unknown },
            });
        }
    }

    for (const path of Object.values(choices.paths)) {
        const parts = path.split("/");
        if (path === "" || path.startsWith("/") || path.includes("\\") || parts.includes("..")) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                source: "data",
                message: `The path ${JSON.stringify(path)} is not relative to the folder the file is saved in.`,
                details: { option: "paths", value: path },
            });
        }
    }
}

/** The kinds an open reads again (spec 8.3): the others are embedded when asked to be referenced. */
const REFETCHED_KINDS = new Set(["file", "url"]);

/**
 * How a source is saved: as asked, except that one no reference can stand for is embedded (spec
 * 4.1.2 rules 4 and 6): a derived source silently, as it has no bytes; a file source whose `path`
 * neither the saver nor the file it was opened from gives, reported `W_SOURCE_NO_PATH`; a kind no
 * open reads again, and one whose rows are not its bytes alone, reported `W_SOURCE_EMBEDDED` with
 * the reason.
 * @param source - The source.
 * @param model - The model.
 * @param asked - What the caller asked for.
 * @param path - The path written, if any: the saver's, else the one read, rebased.
 * @param problems - Collects `W_SOURCE_NO_PATH` and `W_SOURCE_EMBEDDED`.
 * @param handled - Whether a browser file handle names it.
 * @returns Embedded or referenced.
 */
function storageOf(
    source: ModelSource,
    model: DataModel,
    asked: SourceStorage,
    path: string | undefined,
    problems: DocumentProblem[],
    handled = false,
): SourceStorage {
    if (asked === "embedded") {
        return asked;
    }

    const memory = memoryOf(model.session);
    const kind = kindOfSource(source, memory);
    if (kind === "derived") {
        return "embedded";
    }

    if (kind === "file" && path === undefined && !handled) {
        problems.push({ code: "W_SOURCE_NO_PATH", params: { source: source.id } });
        return "embedded";
    }

    const reason = embedReason(source, model) ?? (REFETCHED_KINDS.has(kind) ? undefined : "kind");
    if (reason !== undefined) {
        problems.push({ code: "W_SOURCE_EMBEDDED", params: { source: source.id, reason } });
        return "embedded";
    }

    return asked;
}

/**
 * Where a source's file is named in the save: the saver's path, else the path read rebased to the
 * file being saved, and the saver's browser file handle, else the one kept for its copy.
 * @param source - The source.
 * @param model - The model.
 * @param choices - The saver's choices.
 * @returns The path, the handle and the copy id.
 */
function locatorOf(
    source: ModelSource,
    model: DataModel,
    choices: Partial<SourceChoices>,
): { path?: string; handle?: ProjectFileHandle; copyId: string } {
    const readPath = memoryOf(model.session).origins.get(source.id)?.path;
    const path =
        chosenFor(choices.paths ?? {}, source) ??
        (typeof readPath === "string" ? rebasedPath(readPath, choices.opened, choices.location) : undefined);
    const copyId = (model.copies.get(source.id) as Copy).copy;
    const handle = chosenFor(choices.handles ?? {}, source) ?? keptHandle(source.id, copyId);
    return { ...(path === undefined ? {} : { path }), ...(handle === undefined ? {} : { handle }), copyId };
}

/**
 * Every source record, the reader source first, and the ids of the embedded ones.
 * @param model - The model.
 * @param choices - The saver's choices per source.
 * @param problems - Collects what the save reports.
 * @returns The records and the embedded ids.
 */
function sourceRecordsOf(
    model: DataModel,
    choices: SourceChoices,
    problems: DocumentProblem[],
): { records: JsonObject[]; embedded: Set<string> } {
    checkChoices(model, choices);
    const records: JsonObject[] = [];
    const embedded = new Set<string>([READER]);
    if (model.reader !== undefined) {
        // The reader source has no label unless a caller gives one: graphty-element writes no words.
        records.push({
            id: READER,
            kind: "reader",
            origin: { copy: model.reader.copy },
            copy: { operations: model.reader.operations },
        });
    }

    for (const source of model.sources) {
        const unavailable = model.unavailable.get(source.id);
        if (unavailable !== undefined && source.nodes.length + source.edges.length === 0) {
            // Never fetched: written back as read, its reference kept, its path rebased.
            records.push(rebasedRecord(unavailable, choices, problems));
            continue;
        }

        // A source read by reference stays one unless the caller asks otherwise (spec 8.1 rule 5).
        const memory = memoryOf(model.session);
        const read = memory.referenced.has(source.id);
        const asked = chosenFor(choices.embed, source) ?? (read ? "referenced" : "embedded");
        const { path, handle, copyId } = locatorOf(source, model, choices);
        const storage = storageOf(source, model, asked, path, problems, handle !== undefined);
        if (storage === "embedded") {
            embedded.add(source.id);
        } else if (path === undefined && handle !== undefined) {
            // A handle cannot be written: the element keeps it, and the record names no path.
            keepHandle(source.id, copyId, handle);
        }

        records.push(sourceRecordOf(source, model, storage, path));
    }

    return { records, embedded };
}

/** The history facts of the reader's own edits, removes and merges, by the operation each is. */
const FOLDED_STEPS: Readonly<Record<string, string>> = {
    "data.edit": "edit",
    "data.remove-nodes": "remove",
    "data.remove-edges": "remove",
    "data.merge-nodes": "merge",
};

/** The history facts that start the open data over: what came before them is not the reader's now. */
const LOAD_STEPS = new Set(["data.import", "data.import-source", "data.set", "data.clear"]);

/**
 * The reader's edits, removes and merges the session holds, by `op`: those an open read, and those
 * made since the data was last loaded, as the history records them.
 * @param session - The session.
 * @param editsLost - Whether an edit an open read is not written back as read.
 * @returns The operations.
 */
function foldedOperations(session: GraphSession, editsLost: boolean): Set<string> {
    const { history } = session;
    const applied = history.steps.slice(0, history.position);
    const ops = new Set(memoryOf(session).folded);
    if (editsLost) {
        ops.add("edit");
    }

    // Walked newest first, up to the last load.
    for (let at = applied.length - 1; at >= 0 && !LOAD_STEPS.has(applied[at].fact.code); at--) {
        const op = FOLDED_STEPS[applied[at].fact.code];
        if (op !== undefined) {
            ops.add(op);
        }
    }

    return ops;
}

/**
 * Report what the save cannot write as the spec spells it: each working column a reserved prefix
 * keeps out (spec 11), and each kind of reader operation the reader source cannot hold yet,
 * whose result is written into the source copies instead (spec 4.1.4).
 * @param model - The model.
 * @param problems - Collects the reports.
 */
function reportLeftOut(model: DataModel, problems: DocumentProblem[]): void {
    for (const column of model.reserved) {
        problems.push({ code: "W_MEMBER_LEFT_OUT", params: { section: "data", field: column } });
    }

    // An edge id an earlier row of its source gave is left out of the later row, which is keyless.
    for (const source of model.sources) {
        for (const row of (model.copies.get(source.id) as Copy).repeated) {
            problems.push({
                code: "W_MEMBER_LEFT_OUT",
                params: {
                    section: "data",
                    pointer: `/sources/${source.id}/copy/edges/${String(model.edgeIdColumn)}/${String(row)}`,
                },
            });
        }
    }

    // A whole-location column read as "auto" names no kind of place a role can say.
    for (const field of rolesOf(model.session.config.data.knownFields, () => true).leftOut) {
        problems.push({ code: "W_MEMBER_LEFT_OUT", params: { section: "data", field: `data.knownFields.${field}` } });
    }

    // ponytail: the session keeps no log of the reader's edits, removes and merges, only their
    // result, so the reader source writes `add`s alone; keep a log in the data store to write them.
    for (const op of foldedOperations(model.session, model.editsLost)) {
        problems.push({
            code: "W_MEMBER_LEFT_OUT",
            params: { section: "data", pointer: "/sources/reader/copy/operations", field: op },
        });
    }
}

/**
 * The join history (spec 4.1.8) in the order the last open read it: each `join.add` of a source
 * still built, with the choices the open read on it, and each `off` step of a source still built or
 * staged; then one `join.add` per source loaded since.
 * @param model - The model.
 * @returns The steps.
 */
function joinsOf(model: DataModel): JsonObject[] {
    const { joins, staged, addChoices } = memoryOf(model.session);
    const built = new Set(model.sources.map((source) => source.id));
    const kept = new Set([...built, ...staged.map((record) => String(record.id))]);
    const added = new Set<string>();
    const addOf = (id: string): JsonObject => {
        added.add(id);
        return { op: "join.add", source: id, ...addChoices.get(id) };
    };
    const read = joins.flatMap((step): JsonObject[] => {
        const id = String(step.source);
        if (step.off === true) {
            return kept.has(id) ? [step] : [];
        }

        return step.op === "join.add" && built.has(id) && !added.has(id) ? [addOf(id)] : [];
    });
    return [...read, ...model.sources.filter((source) => !added.has(source.id)).map((source) => addOf(source.id))];
}

/**
 * The data section's body (spec 4.1) from a model, with its build stamp: the one remembered while
 * the build inputs are unchanged, else a newly minted one.
 * @param model - The model.
 * @param choices - The saver's choices per source.
 * @param problems - Collects what the save reports.
 * @returns The body, its digest and its stamp.
 */
function bodyOf(model: DataModel, choices: SourceChoices, problems: DocumentProblem[]): WrittenBody {
    const { records, embedded } = sourceRecordsOf(model, choices, problems);
    reportLeftOut(model, problems);
    const types = typesOf(model);
    const conversions = conversionsOf(model.session);
    const issues = issuesOf(model);
    const joins = joinsOf(model);
    const { staged } = memoryOf(model.session);
    records.push(...staged);
    const edgeIds = edgeIdsOf(model);
    const { repeatedEdges } = model.session.config.data.knownFields;
    const repeated = repeatedEdges === "keep" ? {} : { repeatedEdges };
    const digest = digestOf({
        directed: model.directed,
        ...repeated,
        sources: records.map(({ label: _label, loaded: _loaded, ...record }) => ({
            ...record,
            copy: (record.origin as JsonObject).copy,
            columns: undefined,
        })),
        types: types.map(({ plainName: _plainName, ...type }) => type),
        conversions,
        kept: issues?.kept,
        joins,
    });
    const memory = memoryOf(model.session);
    if (memory.build?.digest !== digest) {
        memory.build = { digest, build: mintUlid() };
    }

    const sources: Record<string, string> = {};
    for (const record of records.slice(0, records.length - staged.length)) {
        if (!model.unavailable.has(String(record.id)) || embedded.has(String(record.id))) {
            sources[String(record.id)] = String((record.origin as JsonObject).copy);
        }
    }

    const body: JsonObject = {
        build: memory.build.written ?? memory.build.build,
        directed: model.directed,
        ...repeated,
        sources: records,
        types,
        ...(conversions.length === 0 ? {} : { conversions }),
        ...(issues === undefined ? {} : { issues }),
        joins,
        ...(edgeIds === undefined ? {} : { edgeIds }),
        graph: graphOf(model, embedded, types),
    };
    return { body, digest, stamp: { build: memory.build.build, sources: memory.build.sources ?? sources } };
}

/**
 * The data section's body (spec 4.1), from today's model.
 * @param session - The session.
 * @param choices - The saver's choices per source, each by source id or load key.
 * @param problems - Collects what the save reports.
 * @returns The body and its build stamp.
 */
export function dataBodyOf(
    session: GraphSession,
    choices: SourceChoices,
    problems: DocumentProblem[],
): { readonly body: JsonObject; readonly stamp: BuildStamp } {
    const { body, stamp } = bodyOf(dataModelOf(session), choices, problems);
    return { body, stamp };
}

/** One source of the open data as a version 2 save would keep it, before the save (`project.describe`). */
export interface SourceChoiceFacts {
    readonly id: string;
    readonly key?: string;
    readonly name: string;
    readonly kind: string;
    readonly format?: string;
    readonly storage: SourceStorage;
    readonly referable: boolean;
    readonly refused?: DocumentProblem;
    readonly nodes: number;
    readonly edges: number;
    readonly operations?: number;
}

/**
 * Every source of the open data, the reader source first, with how a save keeps it when not told
 * (`storage`) and whether asking for a reference would hold: the refusal a save would report, else
 * none. Asks `storageOf` itself, so the answer is the save's.
 * @param session - The session.
 * @param choices - The paths, handles and location a save would be given, per source id or load key.
 * @returns The sources.
 */
export function sourceChoicesOf(
    session: GraphSession,
    choices: Partial<Omit<SourceChoices, "embed">> = {},
): SourceChoiceFacts[] {
    const model = dataModelOf(session);
    const memory = memoryOf(session);
    const out: SourceChoiceFacts[] = [];
    if (model.reader !== undefined) {
        out.push({
            id: READER,
            name: READER,
            kind: "reader",
            storage: "embedded",
            referable: false,
            nodes: 0,
            edges: 0,
            operations: model.reader.operations.length,
        });
    }

    const locator = (source: ModelSource): ReturnType<typeof locatorOf> => locatorOf(source, model, choices);
    for (const source of model.sources) {
        const kind = kindOfSource(source, memory);
        const { load } = source;
        const neverFetched = model.unavailable.has(source.id) && source.nodes.length + source.edges.length === 0;
        const problems: DocumentProblem[] = [];
        const asked =
            neverFetched || kind === "derived"
                ? undefined
                : storageOf(
                      source,
                      model,
                      "referenced",
                      locator(source).path,
                      problems,
                      locator(source).handle !== undefined,
                  );
        out.push({
            id: source.id,
            key: load.key,
            name: load.name ?? load.fileName ?? source.id,
            kind,
            ...(load.type === undefined ? {} : { format: load.type }),
            storage: memory.referenced.has(source.id) || neverFetched ? "referenced" : "embedded",
            referable: neverFetched || asked === "referenced",
            ...(problems.length === 0 ? {} : { refused: problems[0] }),
            nodes: source.nodes.length,
            edges: source.edges.length,
        });
    }

    return out;
}

/**
 * A column's name (spec 4.1.8 rule 11): the key itself when free, else `<key> (<source id>)`, else
 * that name followed by ` 2`, ` 3`, ... until free.
 * @param key - The wanted name.
 * @param source - The source id the column belongs to.
 * @param taken - Whether a name is taken.
 * @returns The name.
 */
export function freeColumnName(key: string, source: string, taken: (name: string) => boolean): string {
    if (!taken(key)) {
        return key;
    }

    const beside = `${key} (${source})`;
    let name = beside;
    let n = 2;
    while (taken(name)) {
        name = `${beside} ${String(n)}`;
        n++;
    }

    return name;
}

// ---------------------------------------------------------------------------------------------
// The two entry points every bound codec and the framing call
// ---------------------------------------------------------------------------------------------

/**
 * Element references for the session's data as it is now (spec 6.1 to 6.3).
 * @param session - The session.
 * @returns The references, both ways.
 */
export function elementRefsOf(session: GraphSession): ElementRefs {
    const model = dataModelOf(session);
    const nodes = new Map<string, NodeId>();
    for (const [id, ref] of model.nodeRefs) {
        nodes.set(recordKey(ref.space, ref.key), id);
    }

    const edges = new Map<string, EdgeId>();
    for (const [id, ref] of model.edgeRefs) {
        const at = edgeKey(ref);
        if (!edges.has(at)) {
            edges.set(at, id);
        }
    }

    return {
        nodeRef: (id) => model.nodeRefs.get(id),
        edgeRef: (id) => model.edgeRefs.get(id),
        node(ref) {
            const checked = nodeRefOf(ref);
            return checked === undefined ? undefined : nodes.get(recordKey(checked.space, checked.key));
        },
        edge(ref) {
            const checked = edgeRefOf(ref);
            if (checked === undefined) {
                return undefined;
            }

            // A reduced edge's own reference is an alias of the edge it was reduced into.
            const alias = memoryOf(session).edgeAliases.get(edgeKey(checked));
            return (
                edges.get(edgeKey(checked)) ?? (alias !== undefined && model.edgeRefs.has(alias) ? alias : undefined)
            );
        },
    };
}

/**
 * The open data's build stamp and each available source's copy id, the reader source included
 * (spec 6.4): a results run's `bindsTo`.
 * @param session - The session.
 * @returns The stamp.
 */
export function dataBindingOf(session: GraphSession): Promise<BuildStamp> {
    return Promise.resolve(dataBodyOf(session, { embed: {}, paths: {} }, []).stamp);
}
