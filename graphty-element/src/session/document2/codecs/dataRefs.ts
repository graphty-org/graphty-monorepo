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
import { COLUMNS_VALUE, type ColumnSettings } from "../../commands/data";
import { dispatcherOf } from "../../dispatchers";
import { expandedGraph } from "../../groups";
import { ISSUES_VALUE, type IssueState } from "../../issues";
import { type LoadFacts, redactedParams } from "../../sources/member";
import { type Provenance, PROVENANCE_VALUE, provenanceIndex } from "../../sources/provenance";
import { fileStylePath } from "../../styles/fileStyles/path";
import {
    asFileStyleStore,
    FILE_STYLES_VALUE,
    FILE_TEMPLATE_PREFIX,
    type FileStyleStore,
} from "../../styles/fileStyles/store";
import { quotePath, renamePaths } from "../../styles/predicate";
import type { EdgeRecord, GraphSession, LoadedSource, NodeRecord } from "../../types";
import { projectMemory } from "../memory";
import type { BuildStamp, DocumentProblem, EdgeRef, ElementRefs, JsonObject, NodeRef, SourceStorage } from "../types";
import { columnSchema } from "./recipeCommands";
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
    /** The nodes only an edge named: supplied by no source, and not the reader's (spec 4.1.9). */
    readonly namedOnly: Set<NodeId>;
    /** Each source's `origin` as read, by source id, until the session records its own load. */
    readonly origins: Map<string, JsonObject>;
    /** Each source's `kind` as read, by source id. */
    readonly kinds: Map<string, string>;
    /** The reader's edits, removes and merges the last read applied, by `op`. */
    folded: readonly string[];
    /** The edge-id column the last data section read named, until settings say one. */
    edgeIdColumn?: string;
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
            namedOnly: new Set(),
            origins: new Map(),
            kinds: new Map(),
            folded: [],
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

/** What a data section read leaves the session to remember. */
export interface DataRead {
    readonly build: string;
    /** Each source's copy id as read. */
    readonly copies: Readonly<Record<string, string>>;
    readonly types: readonly JsonObject[];
    /** Each node's record key. */
    readonly nodeRefs: readonly (readonly [NodeId, NodeRef])[];
    /** The nodes only an edge named. */
    readonly namedOnly: readonly NodeId[];
    /** Whether the read left out part of the section. */
    readonly refused: boolean;
    /** Each source's `origin` as read, by source id. */
    readonly origins?: readonly (readonly [string, JsonObject])[];
    /** Each source's `kind` as read, by source id. */
    readonly kinds?: readonly (readonly [string, string])[];
    /** The reader operations read that are not `add`s, by `op`. */
    readonly folded?: readonly string[];
    /** Each reader-added edge's key, by its session id. */
    readonly readerEdges: readonly (readonly [EdgeId, string])[];
    /** The records of the sources that could not be fetched. */
    readonly unavailable: readonly JsonObject[];
    readonly edgeIdColumn?: string;
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

    for (const id of read.namedOnly) {
        memory.namedOnly.add(id);
    }

    for (const [id, key] of read.readerEdges) {
        memory.readerKeys.set(`e:${id}`, key);
    }

    for (const record of read.unavailable) {
        memory.unavailable.set(String(record.id), record);
    }

    memory.types = read.types;
    memory.folded = read.folded ?? [];
    memory.edgeIdColumn = read.edgeIdColumn;
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
    // ponytail: reader edits are baked into the copies on open, so the reader copy id the file
    // stamped is kept as read until the build changes, rather than derived from the session.
    memory.build = {
        digest: bodyOf(dataModelOf(session), {}, []).digest,
        build: read.build,
        sources: { ...read.copies },
        ...(read.refused ? { written: mintUlid() } : {}),
    };
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
    /** The nodes a load held with no key of their own: their key cells (null or empty). */
    readonly keyless: ReadonlyMap<NodeId, unknown>;
    /** The reader source, when the reader added anything. */
    readonly reader?: ReaderCopy;
    /** The sources that could not be fetched: their records as read. */
    readonly unavailable: ReadonlyMap<string, JsonObject>;
    /** The working columns a reserved prefix left out, as `<kind>:<column>`. */
    readonly reserved: ReadonlySet<string>;
    /** Temporary, with loadedLooksAsColumns (issue 8259): the look values a load kept, as columns. */
    readonly looks: LoadedLooks;
}

/** The `_source.*` columns graphty-element keeps provenance in: its own, written as `_source.loads`. */
const PROVENANCE = new Set(["_source.loads", "_source.expansion", "_source.next"]);

/**
 * Whether a column name has a reserved prefix (spec 11): `graphty.` or `_source.`.
 * @param name - The column.
 * @returns True when no working column may have it.
 */
function isReserved(name: string): boolean {
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
 * A source's copy: its node and edge tables, with the copy id this writer gives it.
 * @param source - The source.
 * @param refs - The node references.
 * @param memory - The memory.
 * @param facts - What its load read.
 * @param folded - Whether the session holds the reader's edits, removes or merges.
 * @param edgeIdColumn - The edge-id column, if any.
 * @param keyless - The keyless nodes' key cells (null or empty), by node.
 * @returns The copy.
 */
function copyOf(
    source: ModelSource,
    refs: ReadonlyMap<NodeId, NodeRef>,
    memory: DataMemory,
    facts: LoadFacts | undefined,
    folded: boolean,
    edgeIdColumn: string | undefined,
    keyless: ReadonlyMap<NodeId, unknown>,
): Copy {
    const repeated = repeatedEdgeRows(source, edgeIdColumn);
    const cellOf = (id: NodeId): unknown => (keyless.has(id) ? keyless.get(id) : keyCellOf(refs.get(id), id));
    const nodes =
        source.nodes.length > 0
            ? tableOf(
                  source.nodes.map((node) => ({ ...node, id: cellOf(node.id) })),
                  ["id"],
              )
            : undefined;
    const edges =
        source.edges.length > 0
            ? tableOf(
                  source.edges.map(({ id: _id, ...edge }, row) => ({
                      ...edge,
                      ...(repeated.has(row) && edgeIdColumn !== undefined ? { [edgeIdColumn]: undefined } : {}),
                      source: keyCellOf(refs.get(edge.source), edge.source),
                      target: keyCellOf(refs.get(edge.target), edge.target),
                  })),
                  ["source", "target"],
              )
            : undefined;
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
 * @param source - The source.
 * @param edgeIdColumn - The edge-id column, if any.
 * @returns The rows.
 */
function repeatedEdgeRows(source: ModelSource, edgeIdColumn: string | undefined): Set<number> {
    const rows = new Set<number>();
    if (edgeIdColumn === undefined || source.load.choices?.duplicateIds === "merge") {
        return rows;
    }

    const seen = new Set<string>();
    source.edges.forEach((edge, row) => {
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
 * A node's source ids and record key: the sources that supplied it; else, for a node only an edge
 * named, none and the key an open read (spec 4.1.9); else the reader's, keyed by its id unless
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

    if (known !== undefined && memory.namedOnly.has(id)) {
        return { loads: [], ref: known, reader: false };
    }

    // Keyed by its own id, as a source row is, so the id is the same after a reopen.
    const own = keyText(id);
    const key =
        known?.key ?? (own === undefined || taken.has(own) ? readerKeyOf(memory, `n:${typeof id}:${String(id)}`) : own);
    taken.add(key);
    return { loads: [READER], ref: { space: known?.space ?? `source:${READER}`, key }, reader: true };
}

/** The id a load gives a node row with no key of its own (`#<n>`). */
const KEYLESS_ID = /^#\d+$/;

/**
 * The nodes a load held with no key of their own: the session gave each an id, and its record
 * keeps the null or empty id cell its row had. A node a file named already keeps that name.
 * @param session - The session.
 * @param memory - The memory.
 * @returns Each such node's key cell, by node.
 */
function keylessCells(session: GraphSession, memory: DataMemory): Map<NodeId, unknown> {
    const cells = new Map<NodeId, unknown>();
    const path = session.config.data.knownFields.nodeIdPath;
    if (typeof path !== "string" || !/^[A-Za-z_][\w-]*$/.test(path)) {
        return cells;
    }

    for (const [id, record] of dispatcherOf(session).state.graph.nodes) {
        const cell: unknown = record[path];
        if (KEYLESS_ID.test(String(id)) && keyText(cell) === undefined && !memory.nodeRefs.has(id)) {
            cells.set(id, cell ?? null);
        }
    }

    return cells;
}

/**
 * Name each node a source supplied with no key (an empty id) as its keyless row:
 * `<copy id>#<row>` in the space `source:<source id>` (spec 6.1), so its key holds across saves;
 * the edge rows that name it name that key.
 * @param sources - The sources, in join order.
 * @param copies - Their copies.
 * @param nodeRefs - Each node's reference, named here for the keyless ones.
 * @param memory - The memory: a node already named by the file it was read from keeps that name.
 * @param cells - The nodes a load held with no key of their own.
 */
function nameKeyless(
    sources: readonly ModelSource[],
    copies: ReadonlyMap<string, Copy>,
    nodeRefs: Map<NodeId, NodeRef>,
    memory: DataMemory,
    cells: ReadonlyMap<NodeId, unknown>,
): void {
    const keyless = new Set<NodeId>();
    for (const source of sources) {
        const copy = copies.get(source.id) as Copy;
        source.nodes.forEach((node, row) => {
            const unkeyed = cells.has(node.id) || (keyText(node.id) === undefined && !memory.nodeRefs.has(node.id));
            if (unkeyed && !keyless.has(node.id)) {
                keyless.add(node.id);
                nodeRefs.set(node.id, { space: `source:${source.id}`, key: `${copy.copy}#${String(row)}` });
            }
        });
    }

    for (const source of sources) {
        const edges = (copies.get(source.id) as Copy).tables.edges as Record<string, unknown[]> | undefined;
        source.edges.forEach((edge, row) => {
            for (const end of ["source", "target"] as const) {
                if (edges !== undefined && keyless.has(edge[end])) {
                    edges[end][row] = nodeRefs.get(edge[end])?.key;
                }
            }
        });
    }
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
    // Temporary, with loadedLooksAsColumns (issue 8259): delete with it.
    const looks = loadedLooksAsColumns(session);
    const withLooks = <T extends NodeRecord | EdgeRecord>(record: T, extra: JsonObject | undefined): T =>
        extra === undefined ? record : { ...record, ...extra };
    // The whole graph, whatever the filter shows: a save writes every element. With a group
    // collapsed it is the graph expanded, the collapse being view's decision (spec 4.7 rule 8),
    // and a member out of the graph is named by the loads that supplied it.
    const expanded = expandedGraph(session);
    const nodes = (expanded?.nodes ?? session.data.nodes({ scope: "graph" })).map((node) =>
        withLooks(withoutReserved(node, "node", reserved), looks.nodes.get(node.id)),
    );
    const edges = (
        expanded?.edges.map(({ id, record }) => ({ ...record, id }) as EdgeRecord) ??
        session.data.edges({ scope: "graph" })
    ).map((edge) => withLooks(withoutReserved(edge, "edge", reserved), looks.edges.get(edge.id)));
    const loadIndex = expanded === null ? undefined : suppliedIndex(session);
    const sourcesOf = (id: NodeId | EdgeId, kind: "node" | "edge"): readonly string[] => {
        if (loadIndex === undefined) {
            return session.data.sourcesOf(id, { kind });
        }

        const held = kind === "node" ? loadIndex.nodes.get(id) : loadIndex.edges.get(String(id));
        return held ?? [];
    };
    const nodeLoads = new Map<NodeId, string[]>();
    const nodeRefs = new Map<NodeId, NodeRef>();
    const readerNodes: NodeRecord[] = [];
    // The keys an open read for reader nodes are theirs, whatever order the nodes come in.
    const readerKeys = new Set(
        [...memory.nodeRefs.values()].filter((ref) => ref.space === `source:${READER}`).map((ref) => ref.key),
    );
    for (const node of nodes) {
        const supplied = loadsOf(sourcesOf(node.id, "node"));
        for (const source of supplied) {
            source.nodes.push(node);
        }

        const named = nameNode(node.id, supplied, memory, shared, readerKeys);
        nodeLoads.set(node.id, named.loads);
        nodeRefs.set(node.id, named.ref);
        if (named.reader) {
            readerNodes.push(node);
        }
    }

    const edgeLoads = new Map<EdgeId, string[]>();
    const readerEdges: EdgeRecord[] = [];
    for (const edge of edges) {
        const supplied = loadsOf(sourcesOf(edge.id, "edge"));
        if (supplied.length === 0) {
            readerEdges.push(edge);
            edgeLoads.set(edge.id, [READER]);
        } else {
            supplied[0].edges.push(edge);
            edgeLoads.set(
                edge.id,
                supplied.map((source) => source.id),
            );
        }
    }

    const folded = foldedOperations(session).size > 0;
    const edgeIdColumn = edgeIdColumnOf(session);
    const keyless = keylessCells(session, memory);
    const copies = new Map(
        sources.map((source) => [
            source.id,
            copyOf(source, nodeRefs, memory, factsOf(session, source.load.key), folded, edgeIdColumn, keyless),
        ]),
    );
    nameKeyless(sources, copies, nodeRefs, memory, keyless);
    const edgeRefs = new Map<EdgeId, EdgeRef>();
    for (const source of sources) {
        const copy = copies.get(source.id) as Copy;
        source.edges.forEach((edge, row) => {
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

    const reader = readerCopyOf(readerNodes, readerEdges, { nodeRefs, edgeRefs, memory });
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
        keyless,
        ...(reader === undefined ? {} : { reader }),
        unavailable: memory.unavailable,
        reserved,
        looks,
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
 * @returns The reader copy, or undefined when the reader added nothing.
 */
function readerCopyOf(
    nodes: readonly NodeRecord[],
    edges: readonly EdgeRecord[],
    named: {
        nodeRefs: ReadonlyMap<NodeId, NodeRef>;
        edgeRefs: ReadonlyMap<EdgeId, EdgeRef>;
        memory: DataMemory;
    },
): ReaderCopy | undefined {
    if (nodes.length + edges.length === 0) {
        return undefined;
    }

    const { nodeRefs, edgeRefs, memory } = named;
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
 * @returns The record.
 */
function sourceRecordOf(source: ModelSource, model: DataModel, storage: SourceStorage): JsonObject {
    const { load } = source;
    const copy = model.copies.get(source.id) as Copy;
    const kind = kindOfSource(source, memoryOf(model.session));
    const options = redactedParams(load.config ?? {});
    delete options.url;
    const origin: JsonObject =
        kind === "network" ? networkOrigin(source, model, copy.copy) : originOf(source, model, kind, copy.copy);
    const { choices } = load;
    return {
        id: source.id,
        label: load.name ?? load.fileName ?? source.id,
        kind,
        ...(load.type === undefined ? {} : { format: load.type }),
        ...(Object.keys(options).length === 0 ? {} : { options: jsonSafe(options) }),
        origin,
        mapping: mappingOf(source, model, copy),
        settings: { duplicateIds: choices?.duplicateIds ?? "first", unmatched: choices?.unmatched ?? "add" },
        ...(storage === "embedded" ? { copy: copy.tables, columns: copy.columns } : {}),
        ...(load.loadedAt !== undefined && TIMESTAMP.test(load.loadedAt) ? { loaded: load.loadedAt } : {}),
    };
}

/**
 * The type names a record's `kind` column gives it: today's kinds are the only types the session
 * makes itself.
 * @param record - The record.
 * @returns The type name, or undefined.
 */
function kindOf(record: Readonly<JsonObject>): string | undefined {
    const { kind } = record;
    return typeof kind === "string" && kind.length > 0 && kind.length <= 256 && !kind.includes(":") ? kind : undefined;
}

/**
 * The type registry (spec 4.1.5): the types the last data section read declared, their rules on
 * sources still open, then one type per node or edge `kind` value no read type names, each
 * declared by the sources whose rows carry it in their `kind` column.
 * @param model - The model.
 * @returns The entries.
 */
function typesOf(model: DataModel): JsonObject[] {
    const open = new Set(model.sources.map((source) => source.id));
    const read = memoryOf(model.session).types.flatMap((type): JsonObject[] => {
        const rules = (Array.isArray(type.rules) ? type.rules : []).filter(
            (rule) => isPlainObject(rule) && open.has(String(rule.source)),
        );
        return rules.length === 0 ? [] : [{ ...type, rules }];
    });
    const taken = new Set(read.map((type) => `${String(type.kind)}:${String(type.name)}`));
    const entries = new Map<string, { name: string; kind: string; sources: string[] }>();
    const note = (kind: string, record: Readonly<JsonObject>, source: string): void => {
        const name = kindOf(record);
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
 * Whether a type rule matches a row of a source (spec 4.1.5).
 * @param rule - The rule.
 * @param source - The source the row came from.
 * @param row - The row.
 * @param end - `source` or `target` for an edge row read for its end, else undefined.
 * @returns True when it matches.
 */
function ruleMatches(rule: unknown, source: string, row: Readonly<JsonObject>, end?: string): boolean {
    if (!isPlainObject(rule) || rule.source !== source || rule.end !== end) {
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
 * An edge row's type: the first in registry order its row matches.
 * @param edgeTypes - The edge types, in registry order.
 * @param source - The row's source id.
 * @param edge - The row.
 * @returns The type, as the one-entry list an edge holds, or empty.
 */
function edgeTypeOf(edgeTypes: readonly JsonObject[], source: string, edge: Readonly<JsonObject>): string[] {
    const first = edgeTypes.find(
        (type) => Array.isArray(type.rules) && type.rules.some((rule) => ruleMatches(rule, source, edge)),
    );
    return first === undefined ? [] : [String(first.name)];
}

/**
 * Each element's types: a node every type a row supplying or naming it matches, an edge the first
 * type in registry order its row matches.
 * @param model - The model.
 * @param types - The registry.
 * @returns The types of each node and each edge.
 */
function elementTypesOf(
    model: DataModel,
    types: readonly JsonObject[],
): { nodes: Map<NodeId, string[]>; edges: Map<EdgeId, string[]> } {
    const nodes = new Map<NodeId, string[]>();
    const edges = new Map<EdgeId, string[]>();
    const add = (id: NodeId, name: string): void => {
        const list = nodes.get(id) ?? [];
        nodes.set(id, list.includes(name) ? list : [...list, name]);
    };
    const rulesOf = (type: JsonObject): unknown[] => (Array.isArray(type.rules) ? type.rules : []);
    const nodeTypes = types.filter((type) => type.kind === "node");
    const edgeTypes = types.filter((type) => type.kind === "edge");
    const nodeTypesOf = (source: string, row: Readonly<JsonObject>, end?: string): string[] =>
        nodeTypes
            .filter((type) => rulesOf(type).some((rule) => ruleMatches(rule, source, row, end)))
            .map((type) => String(type.name));
    for (const source of model.sources) {
        for (const node of source.nodes) {
            for (const name of nodeTypesOf(source.id, node)) {
                add(node.id, name);
            }
        }

        for (const edge of source.edges) {
            for (const end of ["source", "target"] as const) {
                for (const name of nodeTypesOf(source.id, edge, end)) {
                    add(edge[end], name);
                }
            }

            // An edge built from several rows takes the type of the first row read (spec 4.1.8).
            edges.set(edge.id, edges.get(edge.id) ?? edgeTypeOf(edgeTypes, source.id, edge));
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
 * A node's key column as the graph writes it: as its copy writes it for a node a load supplied (a
 * keyless node's null or empty cell included), none for one the reader added or only an edge named.
 * @param model - The model.
 * @param id - The node.
 * @param ref - Its reference.
 * @param loads - Its source ids.
 * @returns The cell, or undefined.
 */
function keyColumnOf(model: DataModel, id: NodeId, ref: NodeRef, loads: readonly string[]): unknown {
    if (!loads.some((load) => load !== READER)) {
        return undefined;
    }

    return model.keyless.has(id) ? model.keyless.get(id) : keyCellOf(ref, id);
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
    for (const node of model.nodes) {
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
 * How a source is saved: as asked, except that one no reference can stand for is embedded (spec
 * 4.1.2 rules 4 and 6): a derived source, one holding the reader's edits, and a file source whose
 * `path` the session does not know, which the save reports.
 * @param source - The source.
 * @param model - The model.
 * @param asked - What the caller asked for.
 * @param problems - Collects `W_SOURCE_NO_PATH`.
 * @returns Embedded or referenced.
 */
function storageOf(
    source: ModelSource,
    model: DataModel,
    asked: SourceStorage,
    problems: DocumentProblem[],
): SourceStorage {
    if (asked === "embedded") {
        return asked;
    }

    const memory = memoryOf(model.session);
    const kind = kindOfSource(source, memory);
    if (kind === "file" && typeof memory.origins.get(source.id)?.path !== "string") {
        problems.push({ code: "W_SOURCE_NO_PATH", params: { source: source.id } });
        return "embedded";
    }

    return kind === "derived" || (model.copies.get(source.id) as Copy).embedOnly ? "embedded" : asked;
}

/**
 * Every source record, the reader source first, and the ids of the embedded ones.
 * @param model - The model.
 * @param embed - Embedded or referenced, per source id; embedded when absent.
 * @param problems - Collects what the save reports.
 * @returns The records and the embedded ids.
 */
function sourceRecordsOf(
    model: DataModel,
    embed: Readonly<Record<string, SourceStorage>>,
    problems: DocumentProblem[],
): { records: JsonObject[]; embedded: Set<string> } {
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
            // Never fetched: written back as read, its reference kept.
            records.push(unavailable);
            continue;
        }

        const storage = storageOf(source, model, embed[source.id] ?? "embedded", problems);
        if (storage === "embedded") {
            embedded.add(source.id);
        } else {
            // Temporary, with loadedLooksAsColumns (issue 8259): reading the source again does not
            // give the look values a load kept outside the data, so a reference leaves them out.
            for (const column of new Set(model.looks.bySource.get(source.id))) {
                problems.push({
                    code: "W_MEMBER_LEFT_OUT",
                    params: { section: "data", pointer: `/sources/${source.id}`, field: column },
                });
            }
        }

        records.push(sourceRecordOf(source, model, storage));
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
 * @returns The operations.
 */
function foldedOperations(session: GraphSession): Set<string> {
    const { history } = session;
    const applied = history.steps.slice(0, history.position);
    const ops = new Set(memoryOf(session).folded);
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

    // ponytail: the session keeps no log of the reader's edits, removes and merges, only their
    // result, so the reader source writes `add`s alone; keep a log in the data store to write them.
    for (const op of foldedOperations(model.session)) {
        problems.push({
            code: "W_MEMBER_LEFT_OUT",
            params: { section: "data", pointer: "/sources/reader/copy/operations", field: op },
        });
    }
}

/**
 * The data section's body (spec 4.1) from a model, with its build stamp: the one remembered while
 * the build inputs are unchanged, else a newly minted one.
 * @param model - The model.
 * @param embed - Embedded or referenced, per source id; embedded when absent.
 * @param problems - Collects what the save reports.
 * @returns The body, its digest and its stamp.
 */
function bodyOf(
    model: DataModel,
    embed: Readonly<Record<string, SourceStorage>>,
    problems: DocumentProblem[],
): WrittenBody {
    const { records, embedded } = sourceRecordsOf(model, embed, problems);
    reportLeftOut(model, problems);
    const types = typesOf(model);
    const conversions = conversionsOf(model.session);
    const issues = issuesOf(model);
    const joins = model.sources.map((source) => ({ op: "join.add", source: source.id }));
    const digest = digestOf({
        directed: model.directed,
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
    for (const record of records) {
        if (!model.unavailable.has(String(record.id)) || embedded.has(String(record.id))) {
            sources[String(record.id)] = String((record.origin as JsonObject).copy);
        }
    }

    const body: JsonObject = {
        build: memory.build.written ?? memory.build.build,
        directed: model.directed,
        sources: records,
        types,
        ...(conversions.length === 0 ? {} : { conversions }),
        ...(issues === undefined ? {} : { issues }),
        joins,
        graph: graphOf(model, embedded, types),
    };
    return { body, digest, stamp: { build: memory.build.build, sources: memory.build.sources ?? sources } };
}

/**
 * The data section's body (spec 4.1), from today's model.
 * @param session - The session.
 * @param embed - Embedded or referenced, per source id; embedded when absent.
 * @param problems - Collects what the save reports.
 * @returns The body and its build stamp.
 */
export function dataBodyOf(
    session: GraphSession,
    embed: Readonly<Record<string, SourceStorage>>,
    problems: DocumentProblem[],
): { readonly body: JsonObject; readonly stamp: BuildStamp } {
    const { body, stamp } = bodyOf(dataModelOf(session), embed, problems);
    return { body, stamp };
}

/**
 * The name a column takes beside another column of the same name that a different source gave
 * (spec 4.1.8 rule 3): `<column> (<source id>)`.
 * @param column - The column.
 * @param source - The source id.
 * @returns The name.
 */
function besideName(column: string, source: string): string {
    return `${column} (${source})`;
}

// ---------------------------------------------------------------------------------------------
// Look values a file gave, as ordinary columns (the version 1 migration and, temporarily, a save)
// ---------------------------------------------------------------------------------------------

/**
 * The names a per-element value of a load may never take, because an element record already holds
 * them as its own fields: a node's `id`; an edge's `id`, `source` and `target` (spec 4.1.8 rule 3).
 */
export const LOOK_TAKEN = { node: ["id"], edge: ["id", "source", "target"] } as const;

/**
 * A column's name (spec 4.1.8 rule 3): the key itself when free, else `<key> (<source id>)`, else
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

    const beside = besideName(key, source);
    let name = beside;
    let n = 2;
    while (taken(name)) {
        name = `${beside} ${String(n)}`;
        n++;
    }

    return name;
}

/**
 * A rewrite of the paths a file's look values were read at (`graphty.style.<namespace>.<kind>.<key>`)
 * to the ordinary columns that hold them now (`data.<column>`), in every string of a section body:
 * a path field, or an expression naming the path. A layer's `userData` is the reader's own and is
 * never touched.
 *
 * The version 1 migration keeps using this after issue 8259; the save's use of it goes with
 * `loadedLooksAsColumns`.
 * @param paths - From each old path to its `data.<column>`.
 * @returns The rewrite.
 */
export function lookPathsRewrite(paths: ReadonlyMap<string, string>): <T>(value: T) => T {
    if (paths.size === 0) {
        return (value) => value;
    }

    const rename = (text: string): string => {
        const literal = paths.get(text);
        if (literal !== undefined || !text.includes("graphty.style.")) {
            return literal ?? text;
        }

        try {
            return renamePaths(text, (path) => {
                const to = paths.get(path);
                return to === undefined ? undefined : quotePath(to);
            });
        } catch {
            // Not an expression: words, not a path.
            return text;
        }
    };
    const rewrite = (value: unknown): unknown => {
        if (typeof value === "string") {
            return rename(value);
        }

        if (Array.isArray(value)) {
            return value.map((each) => rewrite(each));
        }

        if (!isPlainObject(value)) {
            return value;
        }

        return Object.fromEntries(
            Object.entries(value).map(([name, each]) => [name, name === "userData" ? each : rewrite(each)]),
        );
    };
    return <T>(value: T) => rewrite(value) as T;
}

/** The look values a load kept, as ordinary columns, and the rewrite of what reads them. */
export interface LoadedLooks {
    /** Each element's extra columns, by node id. */
    readonly nodes: ReadonlyMap<NodeId | EdgeId, JsonObject>;
    /** Each element's extra columns, by edge id. */
    readonly edges: ReadonlyMap<NodeId | EdgeId, JsonObject>;
    /** The columns each source id holds, as `<node|edge>:<name>`. */
    readonly bySource: ReadonlyMap<string, readonly string[]>;
    /** Each column's JSON Schema type, as `<node|edge>:<name>`, as a session attribute's would be. */
    readonly schemas: ReadonlyMap<string, JsonObject>;
    /** A value (a section body) with every path to a look value reading its column, `data.<column>`. */
    readonly rewrite: <T>(value: T) => T;
    /**
     * Whether a layer's `source` is the template of a load these columns came from: such a layer
     * writes no source, as a layer the reader made does, since nothing can make it again.
     */
    readonly madeByLoad: (source: unknown) => boolean;
}

/** No look values: nothing to add, nothing to rewrite. */
const NO_LOOKS: LoadedLooks = {
    nodes: new Map(),
    edges: new Map(),
    bySource: new Map(),
    schemas: new Map(),
    rewrite: (value) => value,
    madeByLoad: () => false,
};

/**
 * The JSON Schema of a look column: the one type every value has, or none.
 * @param values - The values.
 * @returns The schema.
 */
function lookSchema(values: readonly unknown[]): JsonObject {
    const set = values.filter((value) => value !== null && value !== undefined);
    const type = (["number", "boolean", "string"] as const).find((each) => set.every((value) => typeof value === each));
    return set.length === 0 || type === undefined ? {} : columnSchema(type, undefined);
}

/**
 * Which load gave a file's look values, part of {@link loadedLooksAsColumns} and temporary with it.
 * The session does not record it, so the load is the one that supplied every element they cover
 * that the session still holds; of several, the earliest no earlier values took.
 * @param session - The session.
 * @param load - The stored look values.
 * @param held - Whether the session still holds an element.
 * @param order - The session's load keys, earliest first.
 * @param used - The load keys earlier values took.
 * @returns The load key, or undefined when no element they cover is held.
 */
function loadKeyOf(
    session: GraphSession,
    load: FileStyleStore["loads"][number],
    held: (kind: "node" | "edge", id: NodeId | EdgeId) => boolean,
    order: readonly string[],
    used: ReadonlySet<string>,
): string | undefined {
    let candidates: readonly string[] | undefined;
    for (const { kind, ids } of load.values.columns) {
        for (const id of ids.filter((each) => held(kind, each))) {
            const of = new Set(session.data.sourcesOf(id, { kind }));
            candidates = (candidates ?? order).filter((key) => of.has(key));
        }
    }

    return candidates?.find((key) => !used.has(key)) ?? candidates?.at(-1);
}

/**
 * TEMPORARY until graphty-element writes loaded look values as ordinary columns at load time
 * (issue https://github.com/graphty-org/graphty-monorepo/issues/8259), then delete this function
 * and its callers.
 *
 * Today a load that reads looks from a file (a color, a size per element) keeps the values outside
 * the data, read by layers at `graphty.style.<namespace>.<kind>.<key>`, and files the layers it
 * makes under its own template. A save writes the values as ordinary columns of the source the
 * load made, named as any column is (spec 4.1.8 rule 3: the key, or `<key> (<source id>)` when an
 * element they cover already holds a different value of that name, or an element they do not
 * cover holds that name at all), every path that reads them as `data.<column>`, and those layers with no
 * source. Reopened, the session holds plain columns and plain layers.
 * @param session - The session.
 * @returns The columns and the rewrite.
 */
export function loadedLooksAsColumns(session: GraphSession): LoadedLooks {
    const store = asFileStyleStore(dispatcherOf(session).state.graph.values.get(FILE_STYLES_VALUE));
    if (store.loads.length === 0) {
        return NO_LOOKS;
    }

    const memory = memoryOf(session);
    const order = session.data.sources().map((load) => load.key);
    const records = {
        node: new Map<NodeId | EdgeId, Readonly<JsonObject>>(
            session.data.nodes({ scope: "graph" }).map((node) => [node.id, node]),
        ),
        edge: new Map<NodeId | EdgeId, Readonly<JsonObject>>(
            session.data.edges({ scope: "graph" }).map((edge) => [edge.id, edge]),
        ),
    };
    const values = { node: new Map<NodeId | EdgeId, JsonObject>(), edge: new Map<NodeId | EdgeId, JsonObject>() };
    // The row an element holds under a name so far, its record's or an earlier look's.
    const rowWith = (kind: "node" | "edge", id: NodeId | EdgeId, name: string): Readonly<JsonObject> | undefined => {
        const looked = values[kind].get(id);
        if (looked !== undefined && name in looked) {
            return looked;
        }

        const record = records[kind].get(id);
        return record !== undefined && name in record ? record : undefined;
    };
    const paths = new Map<string, string>();
    const bySource = new Map<string, string[]>();
    const schemas = new Map<string, JsonObject>();
    const used = new Set<string>();
    for (const load of store.loads) {
        const loadKey = loadKeyOf(session, load, (kind, id) => records[kind].has(id), order, used);
        if (loadKey !== undefined) {
            used.add(loadKey);
        }

        const source = loadKey === undefined ? READER : sourceIdOf(loadKey, memory);
        for (const { kind, key, ids, values: cells } of load.values.columns) {
            const covered = new Map<NodeId | EdgeId, unknown>();
            ids.forEach((id, at) => {
                if (records[kind].has(id) && cells[at] !== null) {
                    covered.set(id, cells[at]);
                }
            });
            // Taken when an element the look covers holds a different value under the name, or any
            // element it does not cover holds the name at all (a layer reading the column would
            // paint that element too).
            const taken = (name: string): boolean =>
                (LOOK_TAKEN[kind] as readonly string[]).includes(name) ||
                [...covered].some(([id, value]) => {
                    const row = rowWith(kind, id, name);
                    return row !== undefined && canonicalJson(row[name]) !== canonicalJson(value);
                }) ||
                [...records[kind].keys()].some((id) => !covered.has(id) && rowWith(kind, id, name) !== undefined);
            const name = freeColumnName(key, source, taken);
            paths.set(fileStylePath(load.values.namespace, kind, key), `data.${name}`);
            bySource.set(source, [...(bySource.get(source) ?? []), `${kind}:${name}`]);
            schemas.set(`${kind}:${name}`, lookSchema([...covered.values()]));
            for (const [id, value] of covered) {
                values[kind].set(id, { ...values[kind].get(id), [name]: value });
            }
        }
    }

    const templates = new Set(store.loads.map((load) => `${FILE_TEMPLATE_PREFIX}${load.values.importId}`));
    return {
        nodes: values.node,
        edges: values.edge,
        bySource,
        schemas,
        rewrite: lookPathsRewrite(paths),
        madeByLoad: (layerSource) =>
            isPlainObject(layerSource) &&
            layerSource.by === "template" &&
            typeof layerSource.templateId === "string" &&
            templates.has(layerSource.templateId),
    };
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
            return checked === undefined ? undefined : edges.get(edgeKey(checked));
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
    return Promise.resolve(dataBodyOf(session, {}, []).stamp);
}
