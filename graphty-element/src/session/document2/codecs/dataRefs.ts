/**
 * @file The open data as version 2 names it (spec 4.1, 6): its sources, record keys, element
 * references both ways, content hashes and the fingerprint. Owned by the data codec, used by every
 * bound section through the framing's context. Experimental (`save-files-v2`).
 *
 * Everything here is derived from today's model (`session.data`), never from the data store of
 * design/data/data-store-options.md, which is not built. data.ts lists what that leaves out.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { EdgeId, NodeId } from "../../../catalog/types";
import { sha256Hex } from "../../../utils/sha256";
import { redactedParams } from "../../sources/member";
import type { EdgeRecord, GraphSession, LoadedSource, NodeRecord } from "../../types";
import type { DocumentProblem, EdgeRef, ElementRefs, JsonObject, NodeRef, SourceStorage } from "../types";

// ---------------------------------------------------------------------------------------------
// Canonical JSON, hashes and key text
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
 * `sha256:` plus the hex SHA-256 of a value's canonical JSON (spec 4.1.1 rule 6).
 * @param value - The value.
 * @returns The hash.
 */
export function hashOf(value: unknown): string {
    return `sha256:${sha256Hex(canonicalJson(value))}`;
}

/**
 * A value as key text (spec 6.1): a string as it is (NFC), a number as ECMAScript writes it, a
 * boolean as `true` or `false`.
 * @param value - The cell.
 * @returns The key text, or undefined for a value that cannot be a key.
 */
export function keyText(value: unknown): string | undefined {
    if (typeof value === "string") {
        return value.normalize("NFC");
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }

    return typeof value === "boolean" ? String(value) : undefined;
}

/**
 * One map key for a record key.
 * @param space - The space.
 * @param key - The key text.
 * @returns The map key.
 */
export function recordKey(space: string, key: string): string {
    return `${space.normalize("NFC")}\u0000${key.normalize("NFC")}`;
}

/**
 * The map key of an edge's two ends: ordered on a directed graph, an unordered pair otherwise.
 * @param from - The edge's from end.
 * @param to - The edge's to end.
 * @param directed - Whether the graph is directed.
 * @returns The map key.
 */
export function endsKey(from: NodeRef, to: NodeRef, directed: boolean): string {
    const a = recordKey(from.space, from.key);
    const b = recordKey(to.space, to.key);
    return directed || a <= b ? `${a}\u0001${b}` : `${b}\u0001${a}`;
}

/**
 * Whether a column name is reserved (spec 6.2 rule 3).
 * @param name - The column.
 * @returns True for a `graphty.` or `_source.` column.
 */
const RESERVED = (name: string): boolean => name.startsWith("graphty.") || name.startsWith("_source.");

/**
 * The `h` of an edge (spec 6.2 rule 3): its row as parsed, by source column name, without its
 * edge-id and end columns, unset cells and reserved columns.
 * @param source - The minting source's id.
 * @param row - The row.
 * @param skip - The edge-id, source and target column names.
 * @returns The hash.
 */
export function edgeRowHash(source: string, row: Readonly<JsonObject>, skip: ReadonlySet<string>): string {
    const values: JsonObject = {};
    for (const [name, value] of Object.entries(row)) {
        if (!skip.has(name) && !RESERVED(name) && value !== null && value !== undefined) {
            values[name] = value;
        }
    }

    return hashOf({ source, row: values });
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
 * An edge reference read from a file, checked (spec 6.2 rule 2): `from`, `to` and either `key`,
 * or `h` and `n`. Any other shape is unbound.
 * @param value - What the file holds.
 * @returns The reference, or undefined.
 */
export function edgeRefOf(value: unknown): EdgeRef | undefined {
    if (!isPlainObject(value)) {
        return undefined;
    }

    const from = nodeRefOf(value.from);
    const to = nodeRefOf(value.to);
    const names = Object.keys(value).sort().join(","); // NOSONAR(S2871): a fixed spelling to compare
    if (from === undefined || to === undefined) {
        return undefined;
    }

    if (names === "from,key,to" && typeof value.key === "string") {
        return { from, to, key: value.key.normalize("NFC") };
    }

    const { h, n } = value;
    return names === "from,h,n,to" && typeof h === "string" && Number.isInteger(n) && (n as number) >= 0
        ? { from, to, h, n: n as number }
        : undefined;
}

// ---------------------------------------------------------------------------------------------
// The data as version 2 names it, from today's model
// ---------------------------------------------------------------------------------------------

/** The reader source's id. */
export const READER = "reader";

/** One source of the open data, from today's load record. */
export interface ModelSource {
    readonly id: string;
    /** Today's load, or undefined for the reader source. */
    readonly load?: LoadedSource;
    /** The node records this source supplied, in graph order. */
    readonly nodes: NodeRecord[];
    /** The edge records this source minted (the first load that supplied each), in graph order. */
    readonly edges: EdgeRecord[];
    /** The node keys an earlier source in join order already gave, so its step merges. */
    merges: boolean;
}

/** The open data, named. */
export interface DataModel {
    readonly directed: boolean;
    /** The sources in join order; the reader source, when there is one, last. */
    readonly sources: readonly ModelSource[];
    readonly nodes: readonly NodeRecord[];
    readonly edges: readonly EdgeRecord[];
    /** Each node's source ids, join order. */
    readonly nodeLoads: ReadonlyMap<NodeId, readonly string[]>;
    /** Each edge's source ids, join order. */
    readonly edgeLoads: ReadonlyMap<EdgeId, readonly string[]>;
    /** The edge-id column, when one names each edge's own key. */
    readonly edgeIdColumn?: string;
    readonly nodeRefs: ReadonlyMap<NodeId, NodeRef>;
    readonly edgeRefs: ReadonlyMap<EdgeId, EdgeRef>;
}

/** The edge-id column the last data section read named, per session, until settings say one. */
const READ_EDGE_ID = new WeakMap<GraphSession, string>();

/**
 * Remember the edge-id column a data section read named, so references keep binding by key
 * before (or without) a settings section naming it.
 * @param session - The session.
 * @param column - The column, or undefined for none.
 */
export function rememberEdgeIdColumn(session: GraphSession, column: string | undefined): void {
    if (column === undefined) {
        READ_EDGE_ID.delete(session);
    } else {
        READ_EDGE_ID.set(session, column);
    }
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

    return READ_EDGE_ID.get(session);
}

/**
 * A load key as a source id: unique, never `reader`, without `:`.
 * @param key - The load key.
 * @param taken - The ids already given.
 * @returns The id.
 */
function sourceIdOf(key: string, taken: Set<string>): string {
    const base = key.replaceAll(":", "_") || "source";
    let id = base === READER ? `${base}_1` : base;
    let at = 2;
    while (taken.has(id)) {
        id = `${base}_${String(at)}`;
        at++;
    }

    taken.add(id);
    return id;
}

/**
 * The attributes of an edge record that make up its row: everything but its element id.
 * @param edge - The record.
 * @returns The row by column name.
 */
export function edgeRowOf(edge: EdgeRecord): JsonObject {
    const { id: _id, ...row } = edge;
    return row;
}

/**
 * Build the edge references of a graph (spec 6.2): by `key` when the edge's key is unique among
 * the edges between its ends, otherwise by `h` and `n`.
 * @param edges - Each edge's ends, key text, minting source and hash, in build order.
 * @param directed - Whether ends are ordered.
 * @returns The references, in the same order.
 */
export function edgeRefsOf(
    edges: readonly {
        readonly from: NodeRef;
        readonly to: NodeRef;
        readonly key?: string;
        readonly source: string;
        readonly h: () => string;
    }[],
    directed: boolean,
): EdgeRef[] {
    const keyCounts = new Map<string, number>();
    for (const edge of edges) {
        if (edge.key !== undefined) {
            const at = `${endsKey(edge.from, edge.to, directed)}\u0002${edge.key}`;
            keyCounts.set(at, (keyCounts.get(at) ?? 0) + 1);
        }
    }

    const seen = new Map<string, number>();
    return edges.map((edge) => {
        const ends = endsKey(edge.from, edge.to, directed);
        if (edge.key !== undefined && keyCounts.get(`${ends}\u0002${edge.key}`) === 1) {
            return { from: edge.from, to: edge.to, key: edge.key };
        }

        const h = edge.h();
        const group = `${edge.source}\u0002${ends}\u0002${h}`;
        const n = seen.get(group) ?? 0;
        seen.set(group, n + 1);
        return { from: edge.from, to: edge.to, h, n };
    });
}

/** Each node's record key as the data section that loaded it named it, per session. */
const READ_NODE_REFS = new WeakMap<GraphSession, Map<NodeId, NodeRef>>();

/**
 * Remember the record keys a data section gave the nodes it loaded, so references to them bind and
 * are written back in the file's spaces rather than `source:<id>` (types place nodes in spaces the
 * session has no model of yet).
 * @param session - The session.
 * @param refs - Each loaded node's id and record key.
 * @param replace - Whether the load replaced the data (forget the keys of the data before).
 */
export function rememberNodeRefs(
    session: GraphSession,
    refs: Iterable<readonly [NodeId, NodeRef]>,
    replace: boolean,
): void {
    const known = replace ? new Map<NodeId, NodeRef>() : (READ_NODE_REFS.get(session) ?? new Map());
    for (const [id, ref] of refs) {
        known.set(id, ref);
    }

    READ_NODE_REFS.set(session, known);
}

/**
 * The open data as version 2 names it: sources in join order, each node's record key and each
 * edge's reference, from today's loads and records.
 * @param session - The session.
 * @returns The model.
 */
export function dataModelOf(session: GraphSession): DataModel {
    const taken = new Set<string>([READER]);
    const loads = session.data.sources();
    const byKey = new Map<string, ModelSource>();
    const sources: ModelSource[] = loads.map((load) => {
        const source: ModelSource = { id: sourceIdOf(load.key, taken), load, nodes: [], edges: [], merges: false };
        byKey.set(load.key, source);
        return source;
    });
    const reader: ModelSource = { id: READER, nodes: [], edges: [], merges: false };
    const order = new Map(sources.map((source, at) => [source.id, at]));
    const loadsOf = (keys: readonly string[]): ModelSource[] =>
        keys
            .map((key) => byKey.get(key))
            .filter((source): source is ModelSource => source !== undefined)
            .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    const nodes = session.data.nodes().map(withoutSourceColumns);
    const edges = session.data.edges().map(withoutSourceColumns);
    const nodeLoads = new Map<NodeId, string[]>();
    const nodeRefs = new Map<NodeId, NodeRef>();
    for (const node of nodes) {
        const supplied = loadsOf(session.data.sourcesOf(node.id));
        const owners = supplied.length === 0 ? [reader] : supplied;
        for (const [at, owner] of owners.entries()) {
            owner.nodes.push(node);
            owner.merges ||= at > 0;
        }

        nodeLoads.set(
            node.id,
            owners.map((owner) => owner.id),
        );
        nodeRefs.set(
            node.id,
            READ_NODE_REFS.get(session)?.get(node.id) ?? {
                space: `source:${owners[0].id}`,
                key: keyText(node.id) ?? String(node.id),
            },
        );
    }

    const { directed } = session.status;
    const edgeIdColumn = edgeIdColumnOf(session);
    const skip = new Set(["source", "target", ...(edgeIdColumn === undefined ? [] : [edgeIdColumn])]);
    const edgeLoads = new Map<EdgeId, string[]>();
    const named = edges.map((edge) => {
        const supplied = loadsOf(session.data.sourcesOf(edge.id, { kind: "edge" }));
        const minting = supplied[0] ?? reader;
        minting.edges.push(edge);
        edgeLoads.set(edge.id, supplied.length === 0 ? [READER] : supplied.map((source) => source.id));
        const row = edgeRowOf(edge);
        const key = edgeIdColumn === undefined ? undefined : keyText(row[edgeIdColumn]);
        return {
            from: nodeRefs.get(edge.source) ?? { space: `source:${minting.id}`, key: String(edge.source) },
            to: nodeRefs.get(edge.target) ?? { space: `source:${minting.id}`, key: String(edge.target) },
            ...(key === undefined ? {} : { key }),
            source: minting.id,
            h: () => edgeRowHash(minting.id, row, skip),
        };
    });
    const refs = edgeRefsOf(named, directed);
    const edgeRefs = new Map<EdgeId, EdgeRef>(edges.map((edge, at) => [edge.id, refs[at]]));

    return {
        directed,
        sources: reader.nodes.length + reader.edges.length > 0 ? [...sources, reader] : sources,
        nodes,
        edges,
        nodeLoads,
        edgeLoads,
        ...(edgeIdColumn === undefined ? {} : { edgeIdColumn }),
        nodeRefs,
        edgeRefs,
    };
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

// ---------------------------------------------------------------------------------------------
// The data body, written
// ---------------------------------------------------------------------------------------------

/** Today's load kinds as version 2 source kinds. A joined table's own origin is not kept. */
const KINDS: Readonly<Record<LoadedSource["kind"], string>> = {
    file: "file",
    url: "url",
    server: "network",
    sample: "sample",
    join: "file",
};

/** The graph-format dtype of a column whose set cells are all of one JavaScript type. */
const DTYPES = { number: "f64", boolean: "bool", string: "string" } as const;

/**
 * Compare two values by their canonical JSON, as UTF-16 code units.
 * @param x - One value.
 * @param y - The other.
 * @returns Negative, zero or positive.
 */
export function byCanonical(x: unknown, y: unknown): number {
    const p = canonicalJson(x);
    const q = canonicalJson(y);
    if (p === q) {
        return 0;
    }

    return p < q ? -1 : 1;
}

/** A timestamp as `toISOString` writes it (spec 3.5). */
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/;

/**
 * A graph-format column declaration for a column's values (spec 4.1.1, `columns`).
 * @param name - The column.
 * @param values - Its cells, `undefined` for unset.
 * @returns The declaration and the cells as written.
 */
function columnOf(name: string, values: readonly unknown[]): { decl: JsonObject; cells: unknown[] } {
    const set = values.filter((value) => value !== undefined);
    const dtype = (["number", "boolean", "string"] as const).find((type) =>
        set.every((value) => typeof value === type),
    );
    if (dtype === undefined || set.includes(null)) {
        // A json column's null is literal; its unset rows are listed.
        const unset = values.flatMap((value, at) => (value === undefined ? [at] : []));
        return {
            decl: { name, dtype: "json", nullable: true, ...(unset.length === 0 ? {} : { unset }) },
            cells: values.map((value) => (value === undefined ? null : jsonSafe(value))),
        };
    }

    return {
        decl: { name, dtype: DTYPES[dtype], nullable: set.length < values.length },
        cells: values.map((value) => (value === undefined ? null : jsonSafe(value))),
    };
}

/**
 * One table of a copy: equal-length value arrays by column, the given columns first.
 * @param rows - The rows.
 * @param first - The columns written first.
 * @param leaveOut - Columns not written.
 * @returns The table and its column declarations.
 */
function tableOf(
    rows: readonly Readonly<JsonObject>[],
    first: readonly string[],
    leaveOut: ReadonlySet<string>,
): { table: JsonObject; columns: JsonObject } {
    const names = new Set(first);
    for (const row of rows) {
        for (const name of Object.keys(row)) {
            if (!leaveOut.has(name)) {
                names.add(name);
            }
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
 * The type names a record's `kind` gives it: today's kinds are the only declared types.
 * @param record - The record.
 * @returns The type name, or undefined.
 */
export function kindOf(record: Readonly<JsonObject>): string | undefined {
    const { kind } = record;
    return typeof kind === "string" && kind.length > 0 && kind.length <= 256 && !kind.includes(":") ? kind : undefined;
}

/** What writing the data body reports and gives. */
export interface DataBody {
    readonly body: JsonObject;
    /** Each source's content hash, by id. */
    readonly hashes: Readonly<Record<string, string>>;
}

/**
 * One source record (spec 4.1.1), from its load.
 * @param source - The source.
 * @param model - The model.
 * @param storage - Embedded or referenced.
 * @param problems - Collects `W_SOURCE_NO_PATH`.
 * @returns The record and its hash.
 */
function sourceRecordOf(
    source: ModelSource,
    model: DataModel,
    storage: SourceStorage,
    problems: DocumentProblem[],
): { record: JsonObject; hash: string } {
    const load = source.load as LoadedSource;
    const nodes = source.nodes.length > 0 ? tableOf(source.nodes, ["id"], new Set()) : undefined;
    const edges =
        source.edges.length > 0
            ? tableOf(source.edges.map(edgeRowOf), ["source", "target"], new Set(["id"]))
            : undefined;
    const copy: JsonObject = {
        ...(nodes === undefined ? {} : { nodes: nodes.table }),
        ...(edges === undefined ? {} : { edges: edges.table }),
    };
    if (nodes === undefined && edges === undefined) {
        copy.nodes = { id: [] };
    }

    const hash = hashOf(copy);
    const kind = KINDS[load.kind];
    const options = redactedParams(load.config ?? {});
    delete options.url;
    const origin: JsonObject = {
        hash,
        ...(load.fileName === undefined ? {} : { name: load.fileName }),
        ...(load.url === undefined ? {} : { url: load.url }),
        ...(load.size === undefined ? {} : { size: load.size }),
    };
    const { edgeIdColumn } = model;
    const hasEdgeId = edgeIdColumn !== undefined && source.edges.some((edge) => edge[edgeIdColumn] !== undefined);
    const mapping: JsonObject = {
        ...(copy.nodes === undefined ? {} : { nodes: { key: "id", space: `source:${source.id}`, renamed: {} } }),
        ...(edges === undefined
            ? {}
            : {
                  edges: {
                      ...(hasEdgeId ? { edgeId: edgeIdColumn } : {}),
                      source: "source",
                      target: "target",
                      renamed: {},
                  },
              }),
    };
    const { choices } = load;
    const settings: JsonObject = {
        ...(model.edges.length === 0 ? {} : { directed: model.directed }),
        duplicateIds: choices?.duplicateIds ?? "first",
        unmatched: choices?.unmatched ?? "add",
        repeatedEdges: "keep",
    };
    if (storage === "referenced" && kind === "file") {
        problems.push({ code: "W_SOURCE_NO_PATH", params: { source: source.id } });
    }

    const record: JsonObject = {
        id: source.id,
        label: load.name ?? load.fileName ?? source.id,
        kind,
        ...(load.type === undefined ? {} : { format: load.type }),
        ...(Object.keys(options).length === 0 ? {} : { options: jsonSafe(options) }),
        origin,
        mapping,
        settings,
        ...(storage === "embedded"
            ? {
                  copy,
                  columns: {
                      ...(copy.nodes === undefined
                          ? {}
                          : { nodes: nodes?.columns ?? { id: { name: "id", dtype: "string", nullable: false } } }),
                      ...(edges === undefined ? {} : { edges: edges.columns }),
                  },
              }
            : {}),
        ...(load.loadedAt !== undefined && TIMESTAMP.test(load.loadedAt) ? { loaded: load.loadedAt } : {}),
    };
    return { record, hash };
}

/**
 * The reader source (spec 4.1.1 rule 7): today, only the elements no load supplied, as `added`.
 * @param source - The reader's rows.
 * @param model - The model.
 * @returns The record and its hash.
 */
function readerRecordOf(source: ModelSource, model: DataModel): { record: JsonObject; hash: string } {
    const added = [
        ...source.nodes.map((node) => {
            const { id: _id, ...columns } = node;
            return { node: model.nodeRefs.get(node.id), columns: jsonSafe(columns) };
        }),
        ...source.edges.map((edge) => {
            const { id: _id, source: _from, target: _to, ...columns } = edge;
            return { edge: model.edgeRefs.get(edge.id), columns: jsonSafe(columns) };
        }),
    ];
    const copy = { edits: [], added, removed: [], merges: [] };
    const sortedBy = (rows: readonly JsonObject[]): JsonObject[] =>
        [...rows].sort((a, b) => byCanonical(a.node ?? a.edge ?? a.nodes, b.node ?? b.edge ?? b.nodes));
    const hash = hashOf({ edits: [], added: sortedBy(added), removed: [], merges: [] });
    return {
        record: { id: READER, label: READER, kind: "reader", origin: { hash }, copy },
        hash,
    };
}

/**
 * The merged graph's nodes (node-link JSON), each one some embedded source supplied, and each
 * node's place among them.
 * @param model - The model.
 * @param embedded - The ids of the embedded sources.
 * @param typesFor - A node's type names.
 * @returns The nodes and their places by node id.
 */
function graphNodesOf(
    model: DataModel,
    embedded: ReadonlySet<string>,
    typesFor: (node: Readonly<JsonObject>) => string[],
): { handles: Map<NodeId, number>; graphNodes: JsonObject[] } {
    const handles = new Map<NodeId, number>();
    const graphNodes: JsonObject[] = [];
    for (const node of model.nodes) {
        const loads = model.nodeLoads.get(node.id) ?? [];
        if (!loads.some((id) => embedded.has(id))) {
            continue;
        }

        const ref = model.nodeRefs.get(node.id) as NodeRef;
        const { id: _id, ...columns } = node;
        handles.set(node.id, graphNodes.length);
        graphNodes.push({
            id: graphNodes.length,
            "graphty.space": ref.space,
            "graphty.key": ref.key,
            "graphty.types": typesFor(node),
            "_source.loads": loads.filter((id) => id !== READER),
            ...(jsonSafe(
                withoutNodeLink(columns, ["id", "graphty.space", "graphty.key", "graphty.types"]),
            ) as JsonObject),
        });
    }

    return { handles, graphNodes };
}

/**
 * The data section's body (spec 4.1), from today's model.
 * @param session - The session.
 * @param embed - Embedded or referenced, per source id; embedded when absent.
 * @param problems - Collects what the save reports.
 * @returns The body and each source's hash.
 */
export function dataBodyOf(
    session: GraphSession,
    embed: Readonly<Record<string, SourceStorage>>,
    problems: DocumentProblem[],
): DataBody {
    const model = dataModelOf(session);
    const records: JsonObject[] = [];
    const hashes: Record<string, string> = {};
    const embedded = new Set<string>([READER]);
    for (const source of model.sources) {
        const storage: SourceStorage = embed[source.id] ?? "embedded";
        if (storage === "embedded") {
            embedded.add(source.id);
        }

        const { record, hash } =
            source.load === undefined
                ? readerRecordOf(source, model)
                : sourceRecordOf(source, model, storage, problems);
        hashes[source.id] = hash;
        // The reader source is first in the list, as it is first in precedence.
        if (source.load === undefined) {
            records.unshift(record);
        } else {
            records.push(record);
        }
    }

    const types: JsonObject[] = typesOf(model);
    const typeNames = new Set(types.map((type) => `${String(type.domain)}:${String(type.name)}`));
    const typesFor = (domain: string, record: Readonly<JsonObject>): string[] => {
        const kind = kindOf(record);
        return kind !== undefined && typeNames.has(`${domain}:${kind}`) ? [kind] : [];
    };

    const { handles, graphNodes } = graphNodesOf(model, embedded, (node) => typesFor("node", node));

    const links: JsonObject[] = [];
    const pairs = new Map<string, number>();
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
        const { id: _id, source: _source, target: _target, ...columns } = edge;
        const skip = [
            "source",
            "target",
            "key",
            "graphty.types",
            ...(model.edgeIdColumn === undefined ? [] : [model.edgeIdColumn]),
        ];
        links.push({
            source: from,
            target: to,
            ...("key" in ref ? { key: ref.key } : {}),
            "graphty.types": typesFor("edge", edge),
            "_source.loads": loads.filter((id) => id !== READER),
            ...(jsonSafe(withoutNodeLink(columns, skip)) as JsonObject),
        });
    }

    const joins = model.sources
        .filter((source) => source.load !== undefined)
        .map((source) => ({ op: source.merges ? "join.merge" : "join.add", source: source.id }));
    return {
        body: {
            sources: records,
            types,
            joins,
            graph: {
                directed: model.directed,
                multigraph: [...pairs.values()].some((count) => count > 1),
                graph: {},
                nodes: graphNodes,
                links,
            },
        },
        hashes,
    };
}

/**
 * A record's columns without the members node-link holds itself.
 * @param columns - The record's columns.
 * @param leaveOut - The names not written.
 * @returns The columns.
 */
function withoutNodeLink(columns: Readonly<JsonObject>, leaveOut: readonly string[]): JsonObject {
    const out: JsonObject = {};
    for (const [name, value] of Object.entries(columns)) {
        if (!leaveOut.includes(name) && value !== undefined) {
            out[name] = value;
        }
    }

    return out;
}

/**
 * The type registry (spec 4.1.3) from today's kinds: one entry per node or edge kind, in the order
 * the graph first shows it, each declared by the sources whose rows carry it in their `kind` column.
 * @param model - The model.
 * @returns The entries.
 */
function typesOf(model: DataModel): JsonObject[] {
    const entries = new Map<string, { name: string; domain: string; sources: string[] }>();
    const note = (domain: string, record: Readonly<JsonObject>, source: string): void => {
        const kind = kindOf(record);
        if (kind === undefined || source === READER) {
            return;
        }

        const at = `${domain}:${kind}`;
        const entry = entries.get(at) ?? { name: kind, domain, sources: [] };
        entries.set(at, entry);
        if (!entry.sources.includes(source)) {
            entry.sources.push(source);
        }
    };
    for (const node of model.nodes) {
        for (const source of model.nodeLoads.get(node.id) ?? []) {
            note("node", node, source);
        }
    }

    for (const source of model.sources) {
        for (const edge of source.edges) {
            note("edge", edge, source.id);
        }
    }

    return [...entries.values()].map((entry) => ({
        name: entry.name,
        domain: entry.domain,
        rules: entry.sources.map((source) => ({ source, column: "kind", values: [entry.name] })),
        schema: { type: "object" },
    }));
}

/**
 * The fingerprint of a data body (spec 6.4): over each source's hash, its reading settings, the
 * types without `plainName`, the kept pairs and the join history.
 * @param body - A data section's body.
 * @returns `bindsTo.sources` and `bindsTo.fingerprint`.
 */
export function bindingOfBody(body: Readonly<JsonObject>): { sources: Record<string, string>; fingerprint: string } {
    const records = (Array.isArray(body.sources) ? body.sources : []).filter(isPlainObject);
    const sources: Record<string, string> = {};
    const settings: JsonObject = {};
    for (const source of records) {
        const id = String(source.id);
        const origin = isPlainObject(source.origin) ? source.origin : {};
        sources[id] = String(origin.hash);
        if (source.kind !== "reader") {
            const entry: JsonObject = {};
            for (const name of ["format", "options", "mapping", "settings"]) {
                if (source[name] !== undefined) {
                    entry[name] = source[name];
                }
            }

            settings[id] = entry;
        }
    }

    const types = (Array.isArray(body.types) ? body.types : [])
        .filter(isPlainObject)
        .map(({ plainName: _plainName, ...rest }) => rest);
    const fingerprint = hashOf({ sources, settings, types, kept: keptPairsOf(body), joins: body.joins ?? [] });
    return { sources, fingerprint };
}

/**
 * A data body's kept pairs as the fingerprint reads them: each undirected pair's ends in canonical
 * order, the pairs sorted.
 * @param body - A data section's body.
 * @returns The pairs.
 */
function keptPairsOf(body: Readonly<JsonObject>): JsonObject[] {
    const issues = isPlainObject(body.issues) ? body.issues : {};
    const directed = isPlainObject(body.graph) && body.graph.directed === true;
    return (Array.isArray(issues.kept) ? issues.kept : [])
        .filter(isPlainObject)
        .map((pair) => {
            if (directed) {
                return pair;
            }

            const [a, b] = [pair.from, pair.to].sort(byCanonical);
            return { from: a, to: b };
        })
        .sort(byCanonical);
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
        edges.set(edgeLookupKey(ref, model.directed), id);
    }

    // A key unique among its ends binds by key even where it is written as `h` (a later save).
    const { edgeIdColumn } = model;
    if (edgeIdColumn !== undefined) {
        for (const edge of model.edges) {
            const key = keyText(edge[edgeIdColumn]);
            const ref = model.edgeRefs.get(edge.id);
            if (key !== undefined && ref !== undefined) {
                const at = edgeLookupKey({ from: ref.from, to: ref.to, key }, model.directed);
                if (!edges.has(at)) {
                    edges.set(at, edge.id);
                }
            }
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
            return checked === undefined ? undefined : edges.get(edgeLookupKey(checked, model.directed));
        },
    };
}

/**
 * One map key for an edge reference.
 * @param ref - The reference.
 * @param directed - Whether ends are ordered.
 * @returns The key.
 */
export function edgeLookupKey(ref: EdgeRef, directed: boolean): string {
    const ends = endsKey(ref.from, ref.to, directed);
    return "key" in ref ? `${ends}\u0002k\u0002${ref.key}` : `${ends}\u0002h\u0002${ref.h}\u0002${String(ref.n)}`;
}

/**
 * The content hash of every source, the reader source included, and the fingerprint (spec 6.4).
 * @param session - The session.
 * @returns `bindsTo.sources` and `bindsTo.fingerprint` of a results section.
 */
export function dataBindingOf(
    session: GraphSession,
): Promise<{ readonly sources: Readonly<Record<string, string>>; readonly fingerprint: string }> {
    // The hashes do not depend on embedding: every source hashes the copy it would write.
    return Promise.resolve(bindingOfBody(dataBodyOf(session, {}, []).body));
}
