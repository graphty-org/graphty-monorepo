/**
 * @file The parts of the version 1 migration (spec 9.1) that read a version 1 file's own data:
 * plain JSON helpers, the version 1 column encoding, and the data section with the element
 * references every other migrated section names nodes and edges by. Experimental
 * (`save-files-v2`). Pure: no session.
 */

import { GraphtyError } from "../../errors/GraphtyError";
import { sha256Hex } from "../../utils/sha256";
import { canonicalJson as sharedCanonicalJson } from "./codecs/dataRefs";
import type { EdgeRef, JsonObject, NodeRef } from "./types";

// ---------------------------------------------------------------------------------------------
// Plain JSON
// ---------------------------------------------------------------------------------------------

/**
 * Whether a value is a JSON object.
 * @param value - The value.
 * @returns True for a non-null, non-array object.
 */
export function isObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A value's objects, or none.
 * @param value - The value.
 * @returns The objects of an array, else an empty list.
 */
export function objectsOf(value: unknown): JsonObject[] {
    return Array.isArray(value) ? value.filter(isObject) : [];
}

/**
 * A number as a document holds it (spec 11): a non-finite number or an integer beyond 2^53 - 1 as
 * its string.
 * @param value - The value.
 * @returns The value to write.
 */
export function documentValue(value: unknown): unknown {
    if (value === undefined) {
        return null;
    }

    if (typeof value !== "number") {
        return value;
    }

    if (!Number.isFinite(value)) {
        return String(value);
    }

    return Number.isInteger(value) && !Number.isSafeInteger(value) ? BigInt(value).toString() : value;
}

/**
 * RFC 8785 canonical JSON, non-finite numbers as their strings (spec 11): the one rule every
 * section uses.
 * @param value - The value.
 * @returns The canonical text.
 */
function canonicalJson(value: unknown): string {
    return sharedCanonicalJson(value);
}

/**
 * The content hash of a value: `sha256:` and the hex SHA-256 of its canonical JSON.
 * @param value - The value.
 * @returns The hash.
 */
function hashOf(value: unknown): string {
    return `sha256:${sha256Hex(canonicalJson(value))}`;
}

/**
 * A node id as key text (spec 6.1): a string as it is, a number as ECMAScript writes it, a boolean
 * as `true` or `false`.
 * @param id - The id.
 * @returns The key.
 */
export function keyText(id: unknown): string {
    if (typeof id === "string") {
        return id;
    }

    return typeof id === "number" || typeof id === "boolean" ? String(id) : canonicalJson(id);
}

// ---------------------------------------------------------------------------------------------
// The version 1 column encoding (projectFile.ts `encodeColumn`)
// ---------------------------------------------------------------------------------------------

/** Bytes per value, and the reader, of each version 1 dtype. */
const DTYPES: Readonly<Record<string, readonly [number, (view: DataView, at: number) => number]>> = {
    f64: [8, (view, at) => view.getFloat64(at, true)],
    f32: [4, (view, at) => view.getFloat32(at, true)],
    i32: [4, (view, at) => view.getInt32(at, true)],
    u8: [1, (view, at) => view.getUint8(at)],
};

/**
 * A version 1 column as plain values: a JSON list as it is, base64 little-endian numbers decoded,
 * the rows it lists as absent null. The same encoding projectFile.ts's `decodeColumn` reads.
 * @param column - The column as the file holds it.
 * @param length - How many rows it must have, or undefined to take what it holds.
 * @returns The values, or undefined for a column of the wrong shape or length.
 */
export function decodeColumn(column: unknown, length?: number): unknown[] | undefined {
    if (Array.isArray(column)) {
        return length === undefined || column.length === length ? (column as unknown[]) : undefined;
    }

    if (!isObject(column) || typeof column.dtype !== "string" || typeof column.data !== "string") {
        return undefined;
    }

    const reader = DTYPES[column.dtype];
    if (reader === undefined) {
        return undefined;
    }

    const [width, read] = reader;
    let binary: string;
    try {
        binary = atob(column.data);
    } catch {
        return undefined;
    }

    const count = binary.length / width;
    if (!Number.isInteger(count) || (length !== undefined && count !== length)) {
        return undefined;
    }

    const view = new DataView(Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0).buffer);
    const values: unknown[] = Array.from({ length: count }, (_, at) => read(view, at * width));
    for (const at of Array.isArray(column.absent) ? (column.absent as unknown[]) : []) {
        if (Number.isInteger(at) && (at as number) >= 0 && (at as number) < count) {
            values[at as number] = null;
        }
    }

    return values;
}

// ---------------------------------------------------------------------------------------------
// The data section (spec 4.1; design/data/data-store-options.md 4.8, "Version 1 files")
// ---------------------------------------------------------------------------------------------

/** The version 1 members the data section reads. */
export interface DataInputs {
    /** The `graphty-data` member. */
    readonly data: JsonObject;
    /** The `graphty-session` member, if any. */
    readonly session?: JsonObject;
    /** The `graphty-sources` member, if any. */
    readonly sources?: JsonObject;
    /** The writer of the file, for every section's `generator`. */
    readonly generator: JsonObject;
}

/** The migrated data: its section, and the references other sections name elements by. */
export interface MigratedData {
    readonly section: JsonObject;
    /** The data section's `id`, every bound section's `bindsTo.data`. */
    readonly dataId: string;
    /** The results section's `bindsTo.sources` and `bindsTo.fingerprint` (spec 6.4). */
    readonly binding: { readonly sources: Readonly<Record<string, string>>; readonly fingerprint: string };
    /** The reference of a version 1 node id (kept even when the data does not hold it), or undefined for no id. */
    nodeRef(id: unknown): NodeRef | undefined;
    /** The reference of the edge at a position of version 1's `links`. */
    edgeAt(position: number): EdgeRef | undefined;
    /**
     * The reference of an edge a version 1 file names by its ends: by its id when it has one, else
     * by its position among the edges between those ends (`ordinal`).
     */
    edgeBetween(source: unknown, target: unknown, id?: unknown, ordinal?: number): EdgeRef | undefined;
    /** Whether the graph is directed. */
    readonly directed: boolean;
}

/** One table row, by source column name, and where it came from. */
interface Row {
    readonly values: Record<string, unknown>;
    /** Its position in the version 1 list. */
    readonly at: number;
}

/** The copy column holding each row's version 1 `_source.loads` (data-store-options.md 4.8). */
const LOADS_COLUMN = "version-1-loads";

/** The members of a version 1 node or link that are not columns of the copy. */
const PROVENANCE = "_source.loads";

/** The names of the loads' options and mappings that say the loads used kinds. */
const KIND_CHOICES = new Set(["kindIds", "kindName", "kind", "sourceKind", "targetKind"]);

/**
 * Whether a value holds a key naming kinds, at any depth.
 * @param value - The value.
 * @returns True when it does.
 */
function namesKinds(value: unknown): boolean {
    if (Array.isArray(value)) {
        return value.some((entry) => namesKinds(entry));
    }

    return isObject(value) && Object.entries(value).some(([key, entry]) => KIND_CHOICES.has(key) || namesKinds(entry));
}

/**
 * The file-style columns (spec 5 rule 9) a session member's `fileStyles` holds, by element.
 * @param session - The session member.
 * @returns Per node key and per link position, each column's value.
 */
function fileStyleValues(session: JsonObject | undefined): {
    nodes: Map<string, Record<string, unknown>>;
    edges: Map<number, Record<string, unknown>>;
} {
    const nodes = new Map<string, Record<string, unknown>>();
    const edges = new Map<number, Record<string, unknown>>();
    for (const load of objectsOf(session?.fileStyles)) {
        for (const column of objectsOf(load.columns)) {
            const name = `graphty.style.${String(load.namespace)}.${String(column.kind)}.${String(column.key)}`;
            const ids = Array.isArray(column.ids) ? (column.ids as unknown[]) : [];
            const values = Array.isArray(column.values) ? (column.values as unknown[]) : [];
            ids.forEach((id, at) => {
                if (column.kind === "edge" && typeof id === "number" && id >= 0) {
                    edges.set(id, { ...edges.get(id), [name]: values[at] ?? null });
                } else if (column.kind === "node") {
                    nodes.set(keyText(id), { ...nodes.get(keyText(id)), [name]: values[at] ?? null });
                }
            });
        }
    }

    return { nodes, edges };
}

/**
 * A row of a version 1 node or link: its members but provenance, which goes to its own column.
 * @param record - The node or link.
 * @param extra - The file-style values it carries.
 * @returns The row's values.
 */
function rowOf(record: JsonObject, extra: Record<string, unknown> | undefined): Record<string, unknown> {
    const { [PROVENANCE]: loads, ...values } = record;
    return { ...values, ...(Array.isArray(loads) ? { [LOADS_COLUMN]: loads } : {}), ...extra };
}

/**
 * The graph-format dtype of a column's values (graph-format `InferredDtype`, widened in its order).
 * An explicit null makes it json, whose null is literal, as the version 2 writer does.
 * @param values - The values; null for an unset cell.
 * @param explicitNull - Whether a row holds null itself, not merely no value.
 * @returns The dtype.
 */
function dtypeOf(values: readonly unknown[], explicitNull: boolean): string {
    if (explicitNull) {
        return "json";
    }

    const present = values.filter((value) => value !== null && value !== undefined);
    if (present.every((value) => typeof value === "boolean") && present.length > 0) {
        return "bool";
    }

    if (present.every((value) => typeof value === "number")) {
        return present.every((value) => Number.isInteger(value) && Math.abs(value) < 2 ** 31) ? "i32" : "f64";
    }

    return present.every((value) => typeof value === "string") ? "string" : "json";
}

/** The most distinct columns, and cells, a migrated table allocates (data.ts holds the same caps). */
const MAX_COLUMNS = 4096;
const MAX_CELLS = 64 * 1024 * 1024;

/**
 * One table of the copy: its values by column, and its column declarations.
 * @param rows - The rows, in copy order.
 * @returns The table and its declarations.
 */
function tableOf(rows: readonly Row[]): { table: Record<string, unknown[]>; columns: Record<string, JsonObject> } {
    const names = new Set<string>();
    for (const row of rows) {
        for (const name of Object.keys(row.values)) {
            names.add(name);
        }

        if (names.size > MAX_COLUMNS || names.size * rows.length > MAX_CELLS) {
            // A wide, sparse graph would allocate names x rows cells.
            throw new GraphtyError({
                code: "E_TOO_LARGE",
                message: "The graph has too many distinct columns to migrate.",
                source: "data",
                details: { columns: names.size, rows: rows.length },
            });
        }
    }

    const table: Record<string, unknown[]> = {};
    const columns: Record<string, JsonObject> = {};
    for (const name of names) {
        const values = rows.map((row) => (name in row.values ? documentValue(row.values[name]) : null));
        const dtype = dtypeOf(
            values,
            rows.some((row) => name in row.values && row.values[name] === null),
        );
        const unset = dtype === "json" ? rows.flatMap((row, at) => (name in row.values ? [] : [at])) : [];
        table[name] = values;
        columns[name] = { name, dtype, ...(unset.length === 0 ? {} : { unset }) };
    }

    return { table, columns };
}

/**
 * The key of an edge's ends, as an unordered pair on an undirected graph.
 * @param from - The source's key.
 * @param to - The target's key.
 * @param directed - Whether the graph is directed.
 * @returns The key.
 */
function endsKey(from: string, to: string, directed: boolean): string {
    return directed || from <= to ? `${from}\u0000${to}` : `${to}\u0000${from}`;
}

/** What {@link edgeRefs} works out. */
interface EdgeKeys {
    /** Each edge row's reference, in copy order. */
    readonly refs: EdgeRef[];
    /** Each edge row's key, when it has one. */
    readonly keys: (string | undefined)[];
}

/**
 * Every edge's reference (spec 6.2): its own key when the mapping's edge-id column gives one that
 * is unique between its ends, else `h` and `n`.
 * @param rows - The edge rows, in copy order.
 * @param context - The source, its node space, the edge-id column and the direction.
 * @param context.source - The source id.
 * @param context.space - The node space.
 * @param context.edgeId - The edge-id column, if any.
 * @param context.directed - Whether the graph is directed.
 * @returns The references.
 */
function edgeRefs(
    rows: readonly Row[],
    context: { source: string; space: string; edgeId: string | undefined; directed: boolean },
): EdgeKeys {
    const { source, space, edgeId, directed } = context;
    const ends = rows.map((row) => endsKey(keyText(row.values.source), keyText(row.values.target), directed));
    const idOf = (row: Row): string | undefined => {
        const id = edgeId === undefined ? undefined : row.values[edgeId];
        return id === null || id === undefined ? undefined : keyText(id);
    };
    const idCounts = new Map<string, number>();
    rows.forEach((row, at) => {
        const id = idOf(row);
        if (id !== undefined) {
            const counted = `${ends[at]}\u0000${id}`;
            idCounts.set(counted, (idCounts.get(counted) ?? 0) + 1);
        }
    });

    const seen = new Map<string, number>();
    const keys: (string | undefined)[] = [];
    const refs = rows.map((row, at): EdgeRef => {
        const from = { space, key: keyText(row.values.source) };
        const to = { space, key: keyText(row.values.target) };
        const id = idOf(row);
        if (id !== undefined && idCounts.get(`${ends[at]}\u0000${id}`) === 1) {
            keys.push(id);
            return { from, to, key: id };
        }

        keys.push(undefined);
        const hashed = Object.fromEntries(
            Object.entries(row.values).filter(
                ([name, value]) =>
                    name !== "source" &&
                    name !== "target" &&
                    name !== edgeId &&
                    value !== null &&
                    value !== undefined &&
                    !name.startsWith("graphty.") &&
                    !name.startsWith("_source."),
            ),
        );
        const h = hashOf({ source, row: hashed });
        const counted = `${ends[at]}\u0000${h}`;
        const n = seen.get(counted) ?? 0;
        seen.set(counted, n + 1);
        return { from, to, h, n };
    });
    return { refs, keys };
}

/**
 * The type registry (spec 4.1.3) a version 1 file's kinds give, when its loads used kinds: one
 * node type per `kind` value, declared by a rule on the `kind` column, its schema holding what the
 * session declared and converted for the columns its nodes carry.
 * @param rows - The node rows.
 * @param source - The source id.
 * @param session - The session member.
 * @returns The types, and each row's types.
 */
function typesOf(
    rows: readonly Row[],
    source: string,
    session: JsonObject | undefined,
): { types: JsonObject[]; rowTypes: string[][] } {
    const names: string[] = [];
    const rowTypes = rows.map((row) => {
        const { kind } = row.values;
        if (typeof kind !== "string" || kind.length === 0 || kind.includes(":")) {
            return [];
        }

        if (!names.includes(kind)) {
            names.push(kind);
        }

        return [kind];
    });

    const declared = new Map<string, JsonObject>();
    const declarations = isObject(session?.declarations) ? objectsOf(session.declarations.columns) : [];
    for (const column of declarations.filter((each) => each.kind === "node" && typeof each.name === "string")) {
        const { measurement, unit, order } = column;
        declared.set(String(column.name), {
            ...(typeof measurement === "string" ? { measurement } : {}),
            ...(typeof unit === "string" ? { unit } : {}),
            ...(Array.isArray(order) ? { enum: order } : {}),
        });
    }

    const conversions = isObject(session?.columns) && isObject(session.columns.types) ? session.columns.types : {};
    for (const [column, type] of Object.entries(conversions)) {
        const [kind, name] = [column.slice(0, column.indexOf(":")), column.slice(column.indexOf(":") + 1)];
        if (kind === "node" && (type === "number" || type === "string" || type === "boolean")) {
            declared.set(name, { type, ...declared.get(name) });
        }
    }

    const types = names.map((name): JsonObject => {
        const carried = new Set(
            rows.flatMap((row, at) => (rowTypes[at].includes(name) ? Object.keys(row.values) : [])),
        );
        const properties = Object.fromEntries([...declared].filter(([column]) => carried.has(column)));
        return {
            name,
            domain: "node",
            rules: [{ source, column: "kind", values: [name] }],
            schema: { type: "object", ...(Object.keys(properties).length === 0 ? {} : { properties }) },
        };
    });
    return { types, rowTypes };
}

/**
 * The data issues (spec 4.1.6) of a session member's `issues`: the ignored issues by code and
 * column, the kept pairs as node references, the fixes as a record.
 * @param session - The session member.
 * @param nodeRef - A version 1 node id's reference.
 * @returns The issues, or undefined when the file recorded none.
 */
function issuesOf(
    session: JsonObject | undefined,
    nodeRef: (id: unknown) => NodeRef | undefined,
): JsonObject | undefined {
    const issues = session?.issues;
    if (!isObject(issues)) {
        return undefined;
    }

    const issueOf = (id: unknown): JsonObject | undefined => {
        if (typeof id !== "string" || id.length === 0) {
            return undefined;
        }

        const [code, kind, ...rest] = id.split(":");
        const name = rest.join(":");
        return { code, ...((kind === "node" || kind === "edge") && name.length > 0 ? { column: { kind, name } } : {}) };
    };
    const ignored = (Array.isArray(issues.ignored) ? (issues.ignored as unknown[]) : []).flatMap(
        (id) => issueOf(id) ?? [],
    );
    const kept = (Array.isArray(issues.kept) ? (issues.kept as unknown[]) : []).flatMap((pair) => {
        const [from, to] = typeof pair === "string" ? pair.split("\u0000") : [];
        const ends = [nodeRef(from), nodeRef(to)];
        return ends[0] === undefined || ends[1] === undefined ? [] : [{ from: ends[0], to: ends[1] }];
    });
    const fixed = objectsOf(issues.fixed).flatMap((fix) => {
        const issue = typeof fix.code === "string" ? { ...issueOf(fix.id), code: fix.code } : issueOf(fix.id);
        const column = isObject(fix.column) ? { column: { kind: fix.column.kind, name: fix.column.name } } : {};
        return issue === undefined || typeof fix.fixedBy !== "string"
            ? []
            : [{ ...issue, ...column, fixedBy: fix.fixedBy }];
    });
    return { ignored, kept, fixed };
}

/**
 * The merged graph (spec 4.1.5) of the copy: NetworkX node-link JSON, with handles unique in the
 * file, each node's record key and types, and each keyed edge's key.
 * @param tables - The rows, references and types.
 * @param tables.nodes - The node rows.
 * @param tables.edges - The edge rows.
 * @param tables.space - The node space.
 * @param tables.source - The source id.
 * @param tables.rowTypes - Each node row's types.
 * @param tables.edgeKeys - Each edge row's key.
 * @param tables.edgeId - The edge-id column.
 * @param tables.directed - Whether the graph is directed.
 * @param tables.attributes - The version 1 graph-level attributes.
 * @returns The graph.
 */
function mergedGraph(tables: {
    nodes: readonly Row[];
    edges: readonly Row[];
    space: string;
    source: string;
    rowTypes: readonly string[][];
    edgeKeys: readonly (string | undefined)[];
    edgeId: string | undefined;
    directed: boolean;
    attributes: JsonObject;
}): JsonObject {
    const { nodes, edges, space, source, rowTypes, edgeKeys, edgeId, directed } = tables;
    const handle = new Map(nodes.map((row, at) => [keyText(row.values.id), at]));
    const columns = (row: Row, leaveOut: readonly (string | undefined)[]): JsonObject =>
        Object.fromEntries(
            Object.entries(row.values)
                .filter(([name, value]) => !leaveOut.includes(name) && value !== undefined)
                .map(([name, value]) => [name, documentValue(value)]),
        );
    const pairs = new Set<string>();
    let multigraph = false;
    const links = edges.map((row, at): JsonObject => {
        const [from, to] = [keyText(row.values.source), keyText(row.values.target)];
        const pair = endsKey(from, to, directed);
        multigraph ||= pairs.has(pair);
        pairs.add(pair);
        const key = edgeKeys[at];
        return {
            source: handle.get(from) ?? from,
            target: handle.get(to) ?? to,
            ...(key === undefined ? {} : { key }),
            "graphty.types": [],
            "_source.loads": [source],
            ...columns(row, ["source", "target", "key", edgeId]),
        };
    });
    return {
        directed,
        multigraph,
        graph: tables.attributes,
        nodes: nodes.map((row, at) => ({
            id: at,
            "graphty.space": space,
            "graphty.key": keyText(row.values.id),
            "graphty.types": rowTypes[at],
            "_source.loads": [source],
            ...columns(row, ["id"]),
        })),
        links,
    };
}

/**
 * The version 1 data, its loads and its column settings, as one embedded `derived` source
 * (data-store-options.md 4.8): its copy is the version 1 merged graph as tables, its node ids the
 * key column in its own `source:<id>` space, its `metadata` the version 1 load records verbatim.
 * @param inputs - The version 1 members.
 * @returns The data section and the references into it.
 */
export function migrateData(inputs: DataInputs): MigratedData {
    const { data, session, sources } = inputs;
    const graph = isObject(data.graph) ? data.graph : {};
    const directed = graph.directed !== false;
    const styles = fileStyleValues(session);
    const v1Nodes = Array.isArray(graph.nodes) ? (graph.nodes as unknown[]) : [];
    const v1Links = Array.isArray(graph.links) ? (graph.links as unknown[]) : [];
    const order = (key: (row: Row) => unknown) => (left: Row, right: Row) => {
        const [a, b] = [canonicalJson(key(left)), canonicalJson(key(right))];
        return a < b ? -1 : Number(a > b);
    };
    const nodeRows = v1Nodes
        .flatMap((node, at): Row[] =>
            isObject(node) ? [{ values: rowOf(node, styles.nodes.get(keyText(node.id))), at }] : [],
        )
        .sort(order((row) => keyText(row.values.id)));
    const edgeRows = v1Links
        .flatMap((link, at): Row[] => (isObject(link) ? [{ values: rowOf(link, styles.edges.get(at)), at }] : []))
        .sort(order((row) => [keyText(row.values.source), keyText(row.values.target)]));

    const nodeTable = tableOf(nodeRows);
    const edgeTable = tableOf(edgeRows);
    const copy = { nodes: nodeTable.table, edges: edgeTable.table };
    const hash = hashOf(copy);
    const source = `src_v1_${hash.slice(7, 23)}`;
    const space = `source:${source}`;
    const dataId = `data_v1_${hash.slice(7, 39)}`;

    const config = isObject(session?.config) && isObject(session.config.data) ? session.config.data : {};
    const fields = isObject(config.knownFields) ? config.knownFields : {};
    const edgeId =
        typeof fields.edgeIdPath === "string" && fields.edgeIdPath in edgeTable.table ? fields.edgeIdPath : undefined;
    const weight =
        typeof fields.edgeWeightPath === "string" && fields.edgeWeightPath in edgeTable.table
            ? fields.edgeWeightPath
            : undefined;
    const edges = edgeRefs(edgeRows, { source, space, edgeId, directed });
    const usesKinds = namesKinds(data.sources) || namesKinds(sources?.loads);
    const { types, rowTypes } = usesKinds
        ? typesOf(nodeRows, source, session)
        : { types: [], rowTypes: nodeRows.map((): string[] => []) };

    // A node the data does not hold keeps its reference all the same: it binds nowhere, and is kept
    // (spec 6.3).
    const nodeRef = (id: unknown): NodeRef | undefined =>
        typeof id === "string" || typeof id === "number" || typeof id === "boolean"
            ? { space, key: keyText(id) }
            : undefined;
    const byPosition = new Map(edgeRows.map((row, at) => [row.at, edges.refs[at]]));
    const edgeBetween = (from: unknown, to: unknown, id?: unknown, ordinal?: number): EdgeRef | undefined => {
        const ends = endsKey(keyText(from), keyText(to), directed);
        const between = edgeRows
            .map((row, at) => ({ row, at }))
            .filter(({ row }) => endsKey(keyText(row.values.source), keyText(row.values.target), directed) === ends)
            .sort((left, right) => left.row.at - right.row.at);
        // By the file's id; else by position; else, for an id the element minted in a session
        // (`graphty:e<n>`, never in the file), the one edge between those ends.
        const byId =
            id === undefined || id === null || edgeId === undefined
                ? undefined
                : between.find(({ row }) => keyText(row.values[edgeId]) === keyText(id));
        const found =
            byId ??
            (ordinal === undefined ? undefined : between[ordinal]) ??
            (between.length === 1 && ordinal === undefined ? between[0] : undefined);
        return found === undefined ? undefined : edges.refs[found.at];
    };

    const held = {
        "version-1": {
            ...(data.source === undefined ? {} : { source: data.source }),
            ...(data.sources === undefined ? {} : { sources: data.sources }),
            ...(sources === undefined ? {} : { loads: sources }),
            ...(isObject(session?.columns) ? { columns: session.columns } : {}),
            ...(isObject(session?.issues) && session.issues.facts !== undefined ? { facts: session.issues.facts } : {}),
        },
    };
    const mapping = {
        nodes: { key: "id", space },
        edges: { ...(edgeId === undefined ? {} : { edgeId }), source: "source", target: "target" },
    };
    const settings = {
        ...(weight === undefined ? {} : { weight }),
        ...(edgeRows.length === 0 ? {} : { directed }),
        duplicateIds: "first",
        unmatched: "add",
        repeatedEdges: "keep",
    };
    const record = {
        id: source,
        label: "",
        kind: "derived",
        origin: { hash },
        mapping,
        settings,
        ...(Object.keys(held["version-1"]).length === 0 ? {} : { metadata: held }),
        copy,
        columns: { nodes: nodeTable.columns, edges: edgeTable.columns },
    };
    const joins = [{ op: "join.add", source }];
    const issues = issuesOf(session, nodeRef);
    const kept = ((issues?.kept as { from: NodeRef; to: NodeRef }[] | undefined) ?? [])
        .map((pair) => {
            const ends = [pair.from, pair.to].sort((a, b) => (canonicalJson(a) < canonicalJson(b) ? -1 : 1));
            return directed ? pair : { from: ends[0], to: ends[1] };
        })
        .sort((a, b) => (canonicalJson(a) < canonicalJson(b) ? -1 : 1));
    const fingerprint = hashOf({
        sources: { [source]: hash },
        settings: { [source]: { mapping, settings } },
        types: types.map(({ plainName: _plain, ...type }) => type),
        kept,
        joins,
    });

    const section: JsonObject = {
        $schema: "https://graphty.app/schema/documents/graphty-data/v2.json",
        kind: "graphty-data",
        version: 2,
        id: dataId,
        generator: inputs.generator,
        sources: [record],
        types,
        joins,
        graph: mergedGraph({
            nodes: nodeRows,
            edges: edgeRows,
            space,
            source,
            rowTypes,
            edgeKeys: edges.keys,
            edgeId,
            directed,
            attributes: isObject(graph.graph) ? graph.graph : {},
        }),
        ...(issues === undefined ? {} : { issues }),
    };
    return {
        section,
        dataId,
        binding: { sources: { [source]: hash }, fingerprint },
        nodeRef,
        edgeAt: (position) => byPosition.get(position),
        edgeBetween,
        directed,
    };
}
