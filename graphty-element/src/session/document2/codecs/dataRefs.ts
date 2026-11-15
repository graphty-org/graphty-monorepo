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

import type { EdgeId, NodeId } from "../../../catalog/types";
import { sha256Hex } from "../../../utils/sha256";
import { COLUMNS_VALUE, type ColumnSettings } from "../../commands/data";
import { dispatcherOf } from "../../dispatchers";
import { ISSUES_VALUE, type IssueState } from "../../issues";
import { redactedParams } from "../../sources/member";
import { SOURCE_ID } from "../../styles/fileStyles/path";
import type { EdgeRecord, GraphSession, LoadedSource, NodeRecord } from "../../types";
import { projectMemory } from "../memory";
import type { BuildStamp, DocumentProblem, EdgeRef, ElementRefs, JsonObject, NodeRef, SourceStorage } from "../types";
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
        return `[${safe.map(canonicalJson).join(",")}]`;
    }

    const record = safe as JsonObject;
    // The default sort compares UTF-16 code units, as RFC 8785 asks.
    const names = Object.keys(record).sort(); // NOSONAR(S2871): code-unit order is the rule
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
    return `sha256:${sha256Hex(canonicalJson(value))}`;
}

/** A ULID: 26 Crockford base-32 characters. */
export const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/** A source id: `src_` plus a ULID, the same one a file-style path names. */
export { SOURCE_ID };

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
        return String(value);
    }

    return typeof value === "boolean" ? String(value) : undefined;
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
    /** Each network source's `origin` as read, by source id, until the session records its own load. */
    readonly origins: Map<string, JsonObject>;
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
    /** Each network source's `origin` as read, by source id. */
    readonly origins?: readonly (readonly [string, JsonObject])[];
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
}

/**
 * A record without the `_source.*` columns today keeps provenance in.
 * @param record - The record.
 * @returns The record.
 */
function withoutSourceColumns<T extends Readonly<JsonObject>>(record: T): T {
    if (!Object.keys(record).some((name) => name.startsWith("_source."))) {
        return record;
    }

    return Object.fromEntries(Object.entries(record).filter(([name]) => !name.startsWith("_source."))) as T;
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

/** Today's load kinds as version 2 source kinds. A joined table's own origin is not kept. */
const KINDS: Readonly<Record<LoadedSource["kind"], string>> = {
    file: "file",
    url: "url",
    server: "network",
    sample: "sample",
    join: "file",
};

/** The source kinds whose copy id is the digest of the copy, not a minted ULID. */
const HASHED_KINDS = new Set(["file", "url", "sample"]);

/**
 * A source's copy: its node and edge tables, with the copy id this writer gives it.
 * @param source - The source.
 * @param refs - The node references.
 * @param memory - The memory.
 * @returns The copy.
 */
function copyOf(source: ModelSource, refs: ReadonlyMap<NodeId, NodeRef>, memory: DataMemory): Copy {
    const nodes =
        source.nodes.length > 0
            ? tableOf(
                  source.nodes.map((node) => ({ ...node, id: keyCellOf(refs.get(node.id), node.id) })),
                  ["id"],
              )
            : undefined;
    const edges =
        source.edges.length > 0
            ? tableOf(
                  source.edges.map(({ id: _id, ...edge }) => ({
                      ...edge,
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
    // ponytail: a file, url or sample copy id hashes the copy as written, not the bytes as read,
    // since today's model keeps no bytes; hash them once loads keep their bytes' digest.
    const hashed = HASHED_KINDS.has(KINDS[source.load.kind]);
    const { copy } = stableId(memory.copies.get(source.id), digest, () => (hashed ? digest : mintUlid()));
    memory.copies.set(source.id, { digest, copy });
    return { tables, columns, digest, copy };
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
 * A node's source ids and record key: the sources that supplied it; else, for a node only an edge
 * named, none and the key an open read (spec 4.1.9); else the reader's, its key minted once.
 * @param id - The node.
 * @param supplied - The sources that supplied it, in join order.
 * @param memory - The memory.
 * @param shared - The space today's loads share.
 * @returns Its source ids, its key, and whether the reader added it.
 */
function nameNode(
    id: NodeId,
    supplied: readonly ModelSource[],
    memory: DataMemory,
    shared: string,
): { readonly loads: string[]; readonly ref: NodeRef; readonly reader: boolean } {
    const known = memory.nodeRefs.get(id);
    if (supplied.length > 0) {
        const ref = known ?? { space: shared, key: keyText(id) ?? String(id) };
        return { loads: supplied.map((source) => source.id), ref, reader: false };
    }

    if (known !== undefined && memory.namedOnly.has(id)) {
        return { loads: [], ref: known, reader: false };
    }

    const key = known !== undefined && ULID.test(known.key) ? known.key : readerKeyOf(memory, `n:${id}`);
    return { loads: [READER], ref: { space: known?.space ?? `source:${READER}`, key }, reader: true };
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

    const nodes = session.data.nodes().map(withoutSourceColumns);
    const edges = session.data.edges().map(withoutSourceColumns);
    const nodeLoads = new Map<NodeId, string[]>();
    const nodeRefs = new Map<NodeId, NodeRef>();
    const readerNodes: NodeRecord[] = [];
    for (const node of nodes) {
        const supplied = loadsOf(session.data.sourcesOf(node.id));
        for (const source of supplied) {
            source.nodes.push(node);
        }

        const named = nameNode(node.id, supplied, memory, shared);
        nodeLoads.set(node.id, named.loads);
        nodeRefs.set(node.id, named.ref);
        if (named.reader) {
            readerNodes.push(node);
        }
    }

    const edgeLoads = new Map<EdgeId, string[]>();
    const readerEdges: EdgeRecord[] = [];
    for (const edge of edges) {
        const supplied = loadsOf(session.data.sourcesOf(edge.id, { kind: "edge" }));
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

    const copies = new Map(sources.map((source) => [source.id, copyOf(source, nodeRefs, memory)]));
    const edgeIdColumn = edgeIdColumnOf(session);
    const edgeRefs = new Map<EdgeId, EdgeRef>();
    for (const source of sources) {
        const copy = copies.get(source.id) as Copy;
        source.edges.forEach((edge, row) => {
            const key = edgeIdColumn === undefined ? undefined : keyText(edge[edgeIdColumn]);
            edgeRefs.set(edge.id, { load: source.id, key: key ?? `${copy.copy}#${String(row)}` });
        });
    }

    for (const edge of readerEdges) {
        edgeRefs.set(edge.id, { load: READER, key: readerKeyOf(memory, `e:${edge.id}`) });
    }

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
        ...(reader === undefined ? {} : { reader }),
        unavailable: memory.unavailable,
    };
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
        ...nodes.map(({ id, ...columns }) => ({ op: "add", node: nodeRefs.get(id), columns: jsonSafe(columns) })),
        ...edges.map(({ id, source, target, ...columns }) => ({
            op: "add",
            edge: edgeRefs.get(id),
            from: nodeRefs.get(source),
            to: nodeRefs.get(target),
            columns: jsonSafe(columns),
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
 * A network source's closed `origin` (spec 4.1.2 rule 8): its address, credential slot, HTTP
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
 * One source record (spec 4.1.2), from its load.
 * @param source - The source.
 * @param model - The model.
 * @param storage - Embedded or referenced.
 * @param problems - Collects `W_SOURCE_NO_PATH`.
 * @returns The record.
 */
function sourceRecordOf(
    source: ModelSource,
    model: DataModel,
    storage: SourceStorage,
    problems: DocumentProblem[],
): JsonObject {
    const { load } = source;
    const copy = model.copies.get(source.id) as Copy;
    const kind = KINDS[load.kind];
    const options = redactedParams(load.config ?? {});
    delete options.url;
    const origin: JsonObject =
        kind === "network"
            ? networkOrigin(source, model, copy.copy)
            : {
                  copy: copy.copy,
                  ...(load.fileName === undefined ? {} : { name: load.fileName }),
                  ...(load.url === undefined ? {} : { url: load.url }),
                  ...(load.size === undefined ? {} : { size: load.size }),
              };
    const { choices } = load;
    if (storage === "referenced" && kind === "file") {
        problems.push({ code: "W_SOURCE_NO_PATH", params: { source: source.id } });
    }

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
    for (const source of model.sources) {
        for (const node of source.nodes) {
            for (const type of nodeTypes) {
                if (rulesOf(type).some((rule) => ruleMatches(rule, source.id, node))) {
                    add(node.id, String(type.name));
                }
            }
        }

        for (const edge of source.edges) {
            for (const type of nodeTypes) {
                for (const end of ["source", "target"] as const) {
                    if (rulesOf(type).some((rule) => ruleMatches(rule, source.id, edge, end))) {
                        add(edge[end], String(type.name));
                    }
                }
            }

            const first = edgeTypes.find((type) => rulesOf(type).some((rule) => ruleMatches(rule, source.id, edge)));
            edges.set(edge.id, first === undefined ? [] : [String(first.name)]);
        }
    }

    return { nodes, edges };
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

/** The node-link members graphty writes itself, never a working column of that name. */
const NODE_MEMBERS = ["id", "graphty.space", "graphty.key", "graphty.types", "_source.loads"];
const LINK_MEMBERS = ["source", "target", "key", "id", "graphty.load", "graphty.key", "graphty.types", "_source.loads"];

/**
 * A record's columns without the members node-link holds itself.
 * @param columns - The record's columns.
 * @param leaveOut - The names not written.
 * @returns The columns.
 */
function userColumns(columns: Readonly<JsonObject>, leaveOut: readonly string[]): JsonObject {
    const out: JsonObject = {};
    for (const [name, value] of Object.entries(columns)) {
        // File-style columns are never written into the graph (spec 4.1.2 rule 7).
        if (!leaveOut.includes(name) && !name.startsWith("graphty.style.") && value !== undefined) {
            out[name] = jsonSafe(value);
        }
    }

    return out;
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
            ...userColumns(node, NODE_MEMBERS),
        });
    }

    const links: JsonObject[] = [];
    const pairs = new Map<string, number>();
    // Every working column is written, the edge-id column included (spec 4.1.9).
    const leaveOut = LINK_MEMBERS;
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
            ...userColumns(edge, leaveOut),
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
        records.push({
            id: READER,
            label: "Your changes",
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

        const storage: SourceStorage = embed[source.id] ?? "embedded";
        if (storage === "embedded") {
            embedded.add(source.id);
        }

        records.push(sourceRecordOf(source, model, storage, problems));
    }

    return { records, embedded };
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
