/**
 * @file The `data` section codec, version 2: the sources (embedded or referenced), the reader
 * source, the type registry, data issues, the join history and the merged graph (spec 4.1).
 * Experimental (`save-files-v2`).
 *
 * Known gaps: what this writes from today's model, which has no data store
 * (design/data/data-store-options.md is not built), and so cannot fill truthfully:
 *
 * - A source's `copy` is the merged records it supplied, not its rows as parsed: today keeps no
 *   per-source rows. A record two sources supplied is in both copies with every column the graph
 *   holds; `renamed` is always `{}` (column renames are not split out of the records).
 * - An edge two loads supplied is written in the first one's copy only, and comes back supplied by
 *   that one alone.
 * - `origin.hash` of a `file` or `url` source hashes the canonical JSON of its copy, not the bytes
 *   as read; no source's rows are put in record-key order first. `origin.path` and `mediaType`
 *   are never known, so a referenced file source always reports `W_SOURCE_NO_PATH`.
 * - Spaces: every node is in `source:<id>` of the first source that supplied it; `idPrefix` and
 *   `kindIds: "scoped"` ids keep their prefix inside the key. A later source holding a key an
 *   earlier one gave writes `join.merge`.
 * - Types come only from today's `kind` column: each type's `schema` is `{ "type": "object" }`
 *   (no column schemas, measurements or units), its `rules` are `{ source, column: "kind", values }`.
 * - `joins` is `join.add` or `join.merge` per source; a joined table's join shape and choices
 *   (`JoinRecord`) are not written, and its source kind is written `file`.
 * - The reader source holds only the elements no load supplied (`added`); reader `edits`,
 *   `removed` and `merges` are always empty: today's edits are in the records themselves. So an
 *   unkeyed edge's `h` hashes its row as it is now, reader edits included: editing a cell of such
 *   an edge changes its `h`, and a notes or view section file saved before the edit no longer
 *   binds to it (`W_REFERENCE_UNBOUND`), against spec 6.2 rule 3, until the reader source carries
 *   `edits` with `was`.
 * - `issues` (ignored, kept, fixed) and `rekeys` are left out; source `settings` carry no
 *   `weight`, `time` or location roles; `annotations`, `metadata`, `license`, `citation` are
 *   never written.
 * - On read: only `join.add` and `join.merge` build; any other join shape, a `link:` space or a
 *   reader `merges` row holds the section. A referenced source is reported `W_SOURCE_UNAVAILABLE`
 *   and holds the whole section (no refetch through the network consent path yet), so its record
 *   is written back; `project.save` refuses to write one. Types are read only
 *   to place node rows in their space; today's `kind` column is not written from them.
 */

import type { EdgeId, NodeId } from "../../../catalog/types";
import type { LoadedSource, TransactionScope } from "../../types";
import type {
    DocumentProblem,
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
    edgeLookupKey,
    edgeRefOf,
    edgeRefsOf,
    edgeRowHash,
    hashOf,
    isPlainObject,
    keyText,
    nodeRefOf,
    READER,
    recordKey,
    rememberEdgeIdColumn,
    rememberNodeRefs,
} from "./dataRefs";

// ---------------------------------------------------------------------------------------------
// Closed objects and vocabularies (spec 4.1.7, 10)
// ---------------------------------------------------------------------------------------------

const SOURCE_KINDS = new Set(["file", "url", "network", "sample", "derived", "reader"]);
/** The join shapes of version 2; only the first two are built by this reader. */
const JOIN_OPS = new Set(["join.add", "join.merge", "join.node-values", "join.edge-values", "join.edges", "join.link"]);
const BUILT_OPS = new Set(["join.add", "join.merge"]);
const JOIN_MEMBERS = new Set([
    "op",
    "source",
    "via",
    "clash",
    "repeated",
    "lookup",
    "mapping",
    "aggregate",
    "link",
    "unmatchedFrom",
    "unmatchedRows",
    "unknownEnds",
    "compare",
    "membership",
    "names",
]);
const NODE_MAPPING = new Set(["key", "space", "renamed"]);
const EDGE_MAPPING = new Set(["edgeId", "source", "sourceSpace", "target", "targetSpace", "renamed"]);
const SETTINGS = new Set([
    "weight",
    "weightMeaning",
    "time",
    "timeUnit",
    "location",
    "latitude",
    "longitude",
    "directed",
    "duplicateIds",
    "unmatched",
    "repeatedEdges",
]);
const TYPE_MEMBERS = new Set(["name", "domain", "plainName", "rules", "schema"]);
const RULE_MEMBERS = new Set(["source", "column", "values"]);
const READER_MEMBERS = new Set(["id", "label", "kind", "origin", "copy", "loaded"]);
const READER_COPY = new Set(["edits", "added", "removed", "merges"]);
const READER_ROW = new Set(["node", "edge", "columns"]);
const NUMERIC = new Set(["f32", "f64", "i32", "u32", "u8"]);

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
 * Check a space's prefix (spec 6.1): a type name, `shared:`, `source:`; `link:` is known but not built.
 * @param space - The space.
 * @param pointer - Its pointer.
 */
function checkSpace(space: unknown, pointer: string): void {
    need(typeof space === "string" && space.length > 0, pointer);
    const colon = space.indexOf(":");
    need(colon === -1 || ["shared", "source"].includes(space.slice(0, colon)), pointer);
}

// ---------------------------------------------------------------------------------------------
// Building the graph from the sources
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
 * The most distinct columns, and cells, a `copy: "graph"` rebuild allocates; a wider or larger graph
 * holds the section. ponytail: fixed caps; derive them from the file-size limit if one ever binds.
 */
const MAX_COLUMNS = 4096;
const MAX_CELLS = 64 * 1024 * 1024;

/** A node being built. */
interface BuiltNode {
    id: NodeId;
    readonly ref: NodeRef;
    readonly columns: JsonObject;
    readonly loads: string[];
}

/** An edge being built. */
interface BuiltEdge {
    readonly from: BuiltNode;
    readonly to: BuiltNode;
    readonly columns: JsonObject;
    readonly source: string;
    readonly row: JsonObject;
    readonly key?: string;
    readonly skip: ReadonlySet<string>;
}

/** What the build gives: the records, by build order, and the loads. */
interface Built {
    readonly nodes: BuiltNode[];
    readonly edges: BuiltEdge[];
    readonly loads: LoadedSource[];
    readonly directed?: boolean;
    readonly edgeIdColumn?: string;
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

    return typeof value === "string" && NUMERIC.has(String(dtype)) ? Number(value) : value;
}

/**
 * The copy of a `copy: "graph"` source (spec 4.1.2): the merged graph's rows, each node's
 * `graphty.key` as its id.
 * @param graph - The data section's graph.
 * @returns The copy and its declarations.
 */
function copyFromGraph(graph: unknown): { copy: JsonObject; columns: JsonObject } {
    need(isPlainObject(graph) && Array.isArray(graph.nodes) && Array.isArray(graph.links), "/graph");
    const keys = new Map<unknown, unknown>();
    const nodes: JsonObject[] = graph.nodes.filter(isPlainObject).map((node) => {
        keys.set(node.id, node["graphty.key"]);
        const out: JsonObject = { id: node["graphty.key"] };
        for (const [name, value] of Object.entries(node)) {
            if (name !== "id" && !name.startsWith("graphty.") && !name.startsWith("_source.")) {
                out[name] = value;
            }
        }

        return out;
    });
    const edges: JsonObject[] = graph.links.filter(isPlainObject).map((link) => {
        const out: JsonObject = { source: keys.get(link.source), target: keys.get(link.target) };
        for (const [name, value] of Object.entries(link)) {
            if (!["source", "target"].includes(name) && !name.startsWith("graphty.") && !name.startsWith("_source.")) {
                out[name] = value;
            }
        }

        return out;
    });
    const columnar = (rows: JsonObject[]): JsonObject => {
        const names = new Set<string>();
        for (const row of rows) {
            for (const name of Object.keys(row)) {
                names.add(name);
            }

            // A wide, sparse graph would allocate names x rows cells: held instead.
            need(names.size <= MAX_COLUMNS, "/graph");
        }

        need(names.size * rows.length <= MAX_CELLS, "/graph");
        return Object.fromEntries([...names].map((name) => [name, rows.map((row) => row[name] ?? null)]));
    };
    return { copy: { nodes: columnar(nodes), edges: columnar(edges) }, columns: {} };
}

/** A source record read, checked. */
interface ReadSource {
    readonly record: JsonObject;
    readonly id: string;
    readonly nodes?: Table;
    readonly edges?: Table;
    readonly copyHash?: string;
}

/**
 * Check the reader source: its closed members and rows, and no merges (this reader does not build
 * them).
 * @param record - The source record.
 * @param pointer - Its pointer.
 */
function checkReader(record: JsonObject, pointer: string): void {
    closed(record, READER_MEMBERS, pointer);
    closed(record.copy, READER_COPY, `${pointer}/copy`);
    for (const list of READER_COPY) {
        const rows = record.copy[list] ?? [];
        need(Array.isArray(rows), `${pointer}/copy/${list}`);
        need(list !== "merges" || rows.length === 0, `${pointer}/copy/merges`);
        rows.forEach((row: unknown, index: number) => {
            const at = `${pointer}/copy/${list}/${String(index)}`;
            closed(row, READER_ROW, at);
            const columns = isPlainObject(row.columns) ? row.columns : {};
            need(!Object.keys(columns).some((name) => name.startsWith("graphty.")), `${at}/columns`);
        });
    }
}

/**
 * Check a source's `mapping`: its closed members and the spaces it names.
 * @param mapping - The mapping.
 * @param pointer - Its pointer.
 */
function checkMapping(mapping: unknown, pointer: string): void {
    closed(mapping, new Set(["nodes", "edges"]), pointer);
    if (mapping.nodes !== undefined) {
        closed(mapping.nodes, NODE_MAPPING, `${pointer}/nodes`);
        if (mapping.nodes.space !== undefined) {
            checkSpace(mapping.nodes.space, `${pointer}/nodes/space`);
        }
    }

    if (mapping.edges !== undefined) {
        closed(mapping.edges, EDGE_MAPPING, `${pointer}/edges`);
        for (const end of ["sourceSpace", "targetSpace"]) {
            if (mapping.edges[end] !== undefined) {
                checkSpace(mapping.edges[end], `${pointer}/edges/${end}`);
            }
        }
    }
}

/**
 * Check every closed object and vocabulary of a data section before anything is applied.
 * @param body - The section's body.
 * @returns The sources by id, the types and the joins.
 */
function checked(body: Readonly<JsonObject>): {
    sources: Map<string, ReadSource>;
    types: JsonObject[];
    joins: JsonObject[];
} {
    need(Array.isArray(body.sources), "/sources");
    need(Array.isArray(body.types), "/types");
    need(Array.isArray(body.joins), "/joins");
    const sources = new Map<string, ReadSource>();
    // Rebuilt once, however many sources say `copy: "graph"`.
    let fromGraph: { copy: JsonObject; columns: unknown; hash: string } | undefined;
    body.sources.forEach((record: unknown, at: number) => {
        const pointer = `/sources/${String(at)}`;
        need(isPlainObject(record), pointer);
        const { id, kind } = record;
        need(typeof id === "string" && id.length > 0 && !id.includes(":") && !sources.has(id), `${pointer}/id`);
        need(typeof kind === "string" && SOURCE_KINDS.has(kind), `${pointer}/kind`);
        if (kind === "reader") {
            checkReader(record, pointer);
            sources.set(id, { record, id });
            return;
        }

        checkMapping(record.mapping ?? {}, `${pointer}/mapping`);

        closed(record.settings ?? {}, SETTINGS, `${pointer}/settings`);
        const { copy } = record;
        let form: { copy: JsonObject; columns: unknown; hash?: string } | undefined;
        if (copy === "graph") {
            if (fromGraph === undefined) {
                const graph = copyFromGraph(body.graph);
                fromGraph = { ...graph, hash: hashOf(graph.copy) };
            }

            form = fromGraph;
        } else if (copy !== undefined) {
            closed(copy, new Set(["nodes", "edges"]), `${pointer}/copy`);
            form = { copy, columns: record.columns };
        }

        const decls = isPlainObject(form?.columns) ? form.columns : {};
        sources.set(id, {
            record,
            id,
            ...(form === undefined
                ? {}
                : {
                      copyHash: form.hash ?? hashOf(form.copy),
                      nodes: tableOf(form.copy.nodes, decls.nodes, `${pointer}/copy/nodes`),
                      edges: tableOf(form.copy.edges, decls.edges, `${pointer}/copy/edges`),
                  }),
        });
    });

    body.types.forEach((type: unknown, at: number) => {
        const pointer = `/types/${String(at)}`;
        closed(type, TYPE_MEMBERS, pointer);
        need(Array.isArray(type.rules ?? []), `${pointer}/rules`);
        ((type.rules ?? []) as unknown[]).forEach((rule, index) => {
            closed(rule, RULE_MEMBERS, `${pointer}/rules/${String(index)}`);
        });
    });

    const named = new Set<string>();
    body.joins.forEach((step: unknown, at: number) => {
        const pointer = `/joins/${String(at)}`;
        closed(step, JOIN_MEMBERS, pointer);
        need(typeof step.op === "string" && JOIN_OPS.has(step.op), `${pointer}/op`);
        // A known shape this reader does not build cannot be built whole either.
        need(BUILT_OPS.has(step.op), `${pointer}/op`);
        need(typeof step.source === "string" && sources.has(step.source), `${pointer}/source`);
        named.add(step.source);
    });
    for (const [id, source] of sources) {
        need(source.record.kind === "reader" || named.has(id), "/joins");
    }

    return { sources, types: body.types as JsonObject[], joins: body.joins as JsonObject[] };
}

/**
 * The space a node row is in when its mapping names none: the first type in registry order whose
 * rules match it (spec 4.1.3, 6.1), else the source's own.
 * @param types - The registry.
 * @param source - The source id.
 * @param row - The row by source column name.
 * @returns The space.
 */
function rowSpace(types: readonly JsonObject[], source: string, row: Readonly<JsonObject>): string {
    for (const type of types) {
        if (type.domain !== "node" || typeof type.name !== "string") {
            continue;
        }

        const rules = Array.isArray(type.rules) ? type.rules.filter(isPlainObject) : [];
        const matches = rules.some(
            (rule) =>
                rule.source === source &&
                (rule.column === undefined ||
                    (Array.isArray(rule.values) &&
                        rule.values.some(
                            (value) =>
                                typeof value === "string" &&
                                value.normalize("NFC") === keyText(row[String(rule.column)]),
                        ))),
        );
        if (matches) {
            return type.name;
        }
    }

    return `source:${source}`;
}

/**
 * Build every node and edge the sources supply, in join order, without touching the session.
 * @param body - The section's body.
 * @param problems - Collects `W_SOURCE_UNAVAILABLE`.
 * @returns The build.
 */
function build(body: Readonly<JsonObject>, problems: DocumentProblem[]): Built {
    const { sources, types, joins } = checked(body);
    const byKey = new Map<string, BuiltNode>();
    const byText = new Map<string, BuiltNode>();
    const nodes: BuiltNode[] = [];
    const edges: BuiltEdge[] = [];
    const loads: LoadedSource[] = [];
    let directed: boolean | undefined;
    let edgeIdColumn: string | undefined;

    const nodeAt = (ref: NodeRef, cell: unknown): BuiltNode => {
        const at = recordKey(ref.space, ref.key);
        let node = byKey.get(at);
        if (node === undefined) {
            node = { id: cell as NodeId, ref, columns: {}, loads: [] };
            byKey.set(at, node);
            nodes.push(node);
            if (!byText.has(ref.key)) {
                byText.set(ref.key, node);
            }
        }

        return node;
    };

    for (const step of joins) {
        const source = sources.get(String(step.source)) as ReadSource;
        const { record, id } = source;
        const mapping = isPlainObject(record.mapping) ? record.mapping : {};
        const settings = isPlainObject(record.settings) ? record.settings : {};
        if (typeof settings.directed === "boolean") {
            directed ??= settings.directed;
        }

        if (source.copyHash === undefined) {
            // A referenced source cannot be fetched again yet: built whole or not at all, so the
            // section is held and written back with the reference, never half applied.
            problems.push({ code: "W_SOURCE_UNAVAILABLE", params: { source: id } });
            throw new Unbuildable(`/sources/${id}`);
        }

        const merge = step.op === "join.merge";
        const own = new Map<string, BuiltNode>();
        let added = 0;
        const nodeMap = isPlainObject(mapping.nodes) ? mapping.nodes : {};
        const renamed = isPlainObject(nodeMap.renamed) ? nodeMap.renamed : {};
        const table = source.nodes;
        const keyColumn = typeof nodeMap.key === "string" ? nodeMap.key : undefined;
        for (let row = 0; table !== undefined && row < table.length; row++) {
            const values: JsonObject = {};
            for (const name of Object.keys(table.cells)) {
                values[name] = cellOf(table, name, row);
            }

            const cell = keyColumn === undefined ? undefined : values[keyColumn];
            const key =
                keyColumn === undefined ? `${source.copyHash.slice("sha256:".length)}#${String(row)}` : keyText(cell);
            if (key === undefined) {
                continue;
            }

            const space =
                typeof nodeMap.space === "string" ? nodeMap.space.normalize("NFC") : rowSpace(types, id, values);
            const existing = merge ? byText.get(key) : undefined;
            const node = existing ?? nodeAt({ space, key }, cell ?? key);
            if (node.loads.length === 0 && existing === undefined) {
                added++;
            }

            for (const [name, value] of Object.entries(values)) {
                const working = typeof renamed[name] === "string" ? renamed[name] : name;
                if (name !== keyColumn && value !== undefined && !(working in node.columns)) {
                    node.columns[working] = value;
                }
            }

            if (!node.loads.includes(id)) {
                node.loads.push(id);
            }

            own.set(key, node);
        }

        const edgeMap = isPlainObject(mapping.edges) ? mapping.edges : {};
        const edgeRenamed = isPlainObject(edgeMap.renamed) ? edgeMap.renamed : {};
        const from = typeof edgeMap.source === "string" ? edgeMap.source : "source";
        const to = typeof edgeMap.target === "string" ? edgeMap.target : "target";
        const edgeId = typeof edgeMap.edgeId === "string" ? edgeMap.edgeId : undefined;
        const workingEdgeId = edgeId === undefined ? undefined : edgeRenamed[edgeId];
        edgeIdColumn ??= typeof workingEdgeId === "string" ? workingEdgeId : edgeId;
        const skip = new Set([from, to, ...(edgeId === undefined ? [] : [edgeId])]);
        const end = (cell: unknown, spaceName: unknown): BuiltNode | undefined => {
            const key = keyText(cell);
            if (key === undefined) {
                return undefined;
            }

            if (typeof spaceName === "string") {
                return nodeAt({ space: spaceName.normalize("NFC"), key }, cell);
            }

            return own.get(key) ?? byText.get(key) ?? nodeAt({ space: `source:${id}`, key }, cell);
        };
        const edgeTable = source.edges;
        let addedEdges = 0;
        for (let row = 0; edgeTable !== undefined && row < edgeTable.length; row++) {
            const values: JsonObject = {};
            for (const name of Object.keys(edgeTable.cells)) {
                values[name] = cellOf(edgeTable, name, row);
            }

            const a = end(values[from], edgeMap.sourceSpace);
            const b = end(values[to], edgeMap.targetSpace);
            if (a === undefined || b === undefined) {
                continue;
            }

            const columns: JsonObject = {};
            for (const [name, value] of Object.entries(values)) {
                if (name !== from && name !== to && value !== undefined) {
                    columns[typeof edgeRenamed[name] === "string" ? edgeRenamed[name] : name] = value;
                }
            }

            const key = edgeId === undefined ? undefined : keyText(values[edgeId]);
            edges.push({
                from: a,
                to: b,
                columns,
                source: id,
                row: values,
                skip,
                ...(key === undefined ? {} : { key }),
            });
            addedEdges++;
        }

        loads.push(loadOf(record, id, { nodes: added, edges: addedEdges }));
    }

    const resolved = directed ?? graphDirected(body);
    const reader = [...sources.values()].find((source) => source.record.kind === "reader");
    if (reader !== undefined) {
        applyReader(reader.record, { nodes, edges, nodeAt, byKey, directed: resolved });
    }

    return {
        nodes,
        edges,
        loads,
        ...(resolved === undefined ? {} : { directed: resolved }),
        ...(edgeIdColumn === undefined ? {} : { edgeIdColumn }),
    };
}

/**
 * The graph's `directed`, when the section has one.
 * @param body - The body.
 * @returns It, or undefined.
 */
function graphDirected(body: Readonly<JsonObject>): boolean | undefined {
    return isPlainObject(body.graph) && typeof body.graph.directed === "boolean" ? body.graph.directed : undefined;
}

/**
 * The elements the reader source added: each node row merged into its node, each edge row a new
 * edge.
 * @param rows - The `added` rows.
 * @param into - The build so far.
 * @param into.edges - The edges.
 * @param into.nodeAt - Makes or finds a node by record key.
 */
function addReaderRows(
    rows: readonly JsonObject[],
    into: { edges: BuiltEdge[]; nodeAt: (ref: NodeRef, cell: unknown) => BuiltNode },
): void {
    for (const row of rows) {
        const columns = isPlainObject(row.columns) ? row.columns : {};
        const node = nodeRefOf(row.node);
        const edge = edgeRefOf(row.edge);
        if (node !== undefined) {
            Object.assign(into.nodeAt(node, node.key).columns, columns);
        } else if (edge !== undefined) {
            into.edges.push({
                from: into.nodeAt(edge.from, edge.from.key),
                to: into.nodeAt(edge.to, edge.to.key),
                columns: { ...columns },
                source: READER,
                row: { ...columns },
                skip: new Set(),
                ...("key" in edge ? { key: edge.key } : {}),
            });
        }
    }
}

/**
 * Apply the reader source's rows (spec 4.1.1 rule 7): added elements, edits and removals.
 * @param record - The reader source.
 * @param into - The build so far.
 * @param into.nodes - The nodes.
 * @param into.edges - The edges.
 * @param into.nodeAt - Makes or finds a node by record key.
 * @param into.byKey - The nodes by record key.
 * @param into.directed - Whether ends are ordered.
 */
function applyReader(
    record: JsonObject,
    into: {
        nodes: BuiltNode[];
        edges: BuiltEdge[];
        nodeAt: (ref: NodeRef, cell: unknown) => BuiltNode;
        byKey: ReadonlyMap<string, BuiltNode>;
        directed: boolean | undefined;
    },
): void {
    const copy = record.copy as JsonObject;
    const rows = (name: string): JsonObject[] => (Array.isArray(copy[name]) ? copy[name] : []).filter(isPlainObject);
    addReaderRows(rows("added"), into);

    const directed = into.directed ?? true;
    const edgeBinding = (): Map<string, BuiltEdge> => {
        const refs = edgeRefsOf(
            into.edges.map((edge) => ({
                from: edge.from.ref,
                to: edge.to.ref,
                ...(edge.key === undefined ? {} : { key: edge.key }),
                source: edge.source,
                h: () => edgeRowHash(edge.source, edge.row, edge.skip),
            })),
            directed,
        );
        return new Map(refs.map((ref, at) => [edgeLookupKey(ref, directed), into.edges[at]]));
    };
    const bindEdges =
        rows("edits").some((row) => row.edge !== undefined) || rows("removed").some((row) => row.edge !== undefined);
    const edgesByRef = bindEdges ? edgeBinding() : new Map<string, BuiltEdge>();
    const target = (row: JsonObject): { columns: JsonObject } | undefined => {
        const node = nodeRefOf(row.node);
        if (node !== undefined) {
            return into.byKey.get(recordKey(node.space, node.key));
        }

        const edge = edgeRefOf(row.edge);
        return edge === undefined ? undefined : edgesByRef.get(edgeLookupKey(edge, directed));
    };
    for (const row of rows("edits")) {
        const bound = target(row);
        for (const [name, change] of Object.entries(isPlainObject(row.columns) ? row.columns : {})) {
            if (bound !== undefined && isPlainObject(change)) {
                bound.columns[name] = change.value;
            }
        }
    }

    const removed = new Set(
        rows("removed")
            .map(target)
            .filter((each) => each !== undefined),
    );
    if (removed.size > 0) {
        const keep = <T>(list: T[], drop: (each: T) => boolean): void => {
            const kept = list.filter((each) => !drop(each));
            list.splice(0, list.length, ...kept);
        };
        keep(into.edges, (edge) => removed.has(edge) || removed.has(edge.from) || removed.has(edge.to));
        keep(into.nodes, (node) => removed.has(node));
    }
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
    };
}

/**
 * Give every built node a session id: a `source:` key keeps the cell it was read from (so `34`
 * stays a number), any other space `<name>:<key>`; a clash takes `<space>:<key>`.
 * @param nodes - The nodes.
 * @param held - Ids the session already holds that a new node must not take (add mode).
 */
function assignIds(nodes: readonly BuiltNode[], held: ReadonlySet<NodeId>): void {
    const used = new Set<NodeId>(held);
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
 * Today's provenance of the sources already open, so an add keeps it.
 * @param tx - The transaction.
 * @returns Each load's nodes and edges.
 */
function provenanceOf(tx: TransactionScope): Record<string, { nodes: NodeId[]; edges: EdgeId[] }> {
    const out: Record<string, { nodes: NodeId[]; edges: EdgeId[] }> = {};
    const entry = (key: string): { nodes: NodeId[]; edges: EdgeId[] } => (out[key] ??= { nodes: [], edges: [] });
    for (const node of tx.data.nodes()) {
        for (const key of tx.data.sourcesOf(node.id)) {
            entry(key).nodes.push(node.id);
        }
    }

    for (const edge of tx.data.edges()) {
        for (const key of tx.data.sourcesOf(edge.id, { kind: "edge" })) {
            entry(key).edges.push(edge.id);
        }
    }

    return out;
}

/**
 * Put a build into the session through the open's transaction.
 * @param built - The build.
 * @param context - The open's context.
 */
async function apply(built: Built, context: ReadContext): Promise<void> {
    const { tx } = context;
    const adding = context.dataMode === "add";
    const before = adding ? tx.data.sources() : [];
    const provenance = adding ? provenanceOf(tx) : {};
    if (!adding) {
        await tx.data.clear();
    }

    // In add mode a source id an open load already has takes a fresh key.
    const keys = new Set(before.map((load) => load.key));
    const renamed = new Map<string, string>();
    for (const load of built.loads) {
        let { key } = load;
        let at = 2;
        while (keys.has(key)) {
            key = `${load.key}_${String(at)}`;
            at++;
        }

        keys.add(key);
        renamed.set(load.key, key);
    }

    assignIds(built.nodes, adding ? new Set(tx.data.nodes().map((node) => node.id)) : new Set());
    rememberNodeRefs(
        context.session,
        built.nodes.map((node) => [node.id, node.ref] as const),
        !adding,
    );
    const edgesBefore = tx.data.edges().length;
    await tx.execute({
        op: "data.apply",
        mutation: {
            kind: "add-nodes",
            records: built.nodes.map((node) => ({ ...node.columns, id: node.id })),
            idPath: "id",
        },
    });
    await tx.execute({
        op: "data.apply",
        mutation: {
            kind: "add-edges",
            records: built.edges.map((edge) => ({ ...edge.columns, source: edge.from.id, target: edge.to.id })),
            source: "source",
            target: "target",
            ...(built.directed === undefined ? {} : { directed: built.directed }),
        },
    });
    const edgeIds = tx.data
        .edges()
        .slice(edgesBefore)
        .map((edge) => edge.id);
    const entry = (key: string): { nodes: NodeId[]; edges: EdgeId[] } => (provenance[key] ??= { nodes: [], edges: [] });
    for (const node of built.nodes) {
        for (const load of node.loads) {
            entry(renamed.get(load) ?? load).nodes.push(node.id);
        }
    }

    built.edges.forEach((edge, at) => {
        const id = edgeIds[at];
        if (id !== undefined && edge.source !== READER) {
            entry(renamed.get(edge.source) ?? edge.source).edges.push(id);
        }
    });

    const loads = [...before, ...built.loads.map((load) => ({ ...load, key: renamed.get(load.key) ?? load.key }))];
    const last = loads.at(-1);
    if (last !== undefined) {
        await tx.execute({
            op: "data.setSource",
            source: {
                ...(last.type === undefined ? {} : { type: last.type }),
                name: last.name,
                config: last.config ?? {},
            },
            sources: loads,
            provenance: provenance,
        });
    }

    rememberEdgeIdColumn(context.session, built.edgeIdColumn);
    context.restored.add("graph");
}

/**
 * Compare a loaded recipe's combine steps with the data's join history (spec 4.1.4).
 * @param joins - The data's join history.
 * @param context - The open's context.
 */
function compareRecipe(joins: unknown, context: ReadContext): void {
    const recipe = context.other("recipe");
    const commands = recipe?.body.commands;
    if (!Array.isArray(commands)) {
        return;
    }

    const steps = commands.filter((command) => isPlainObject(command) && String(command.op).startsWith("join."));
    if (steps.length > 0 && canonicalJson(steps) !== canonicalJson(joins)) {
        context.problems.push({ code: "W_JOIN_HISTORY_DIFFERS", params: { section: "data" } });
    }
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
    members: ["sources", "types", "issues", "joins", "rekeys", "graph"],
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

            // Built whole or not at all (spec 4.1.7): nothing is applied. An open holds it before
            // anything is applied (`holds`); this is a codec read on its own.
            context.problems.push(...problems, {
                code: "W_SECTION_KEPT",
                params: { section: "data", version: section.header.version, reason: "data" },
            });
            return;
        }

        context.problems.push(...problems);
        compareRecipe(section.body.joins, context);
        await apply(built, context);
    },
};
