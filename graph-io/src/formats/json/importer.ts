/**
 * The JSON importer (design sections 8.2, 8.4 and 8.5): one GraphImporter that sniffs the dialect
 * of a parsed document -- NetworkX node-link (old `links` and new `edges` key forms, graph-level
 * `directed` / `multigraph` / `graph`), the d3 lineage of the same shape (`name` ids, integer
 * index endpoints), JSON Graph Format v2 (nodes keyed by id, per-edge `directed`, hyperedges),
 * Cytoscape.js elements (`data.id` / `data.source` / `data.target`, `position`, `classes`,
 * `data.parent`), graphology serialization (`key` / `attributes`, `undirected` edges, `options`)
 * vis.js (`from` / `to`), and NetworkX adjacency_data (`nodes` + `adjacency`) and tree_data (nested
 * `id` / `children`) -- and pushes it scalar by scalar into the sink.
 *
 * Python's json module writes the bare tokens NaN, Infinity and -Infinity, which strict JSON
 * refuses; they are read as the JavaScript numbers with one warning. An integer literal beyond
 * 2^53 is read as its exact digits (a string, the canonical id rule of the text formats) rather
 * than a rounded float, again with one warning.
 *
 * JSON awaits the whole text (design section 8.4: `JSON.parse` on 100 MB is fine; a streaming
 * tokeniser is a later improvement). The parsed records are iterated in place; the importer never
 * builds an intermediate array of node or edge objects. Ids are coerced per `ids` ("keep" by
 * default: JSON values are already typed); node ids that are JSON `true` / `false` / `null` are
 * reported as `unsupported` and coerced with `String(v)` only under `ids: "string"`. Attribute
 * columns are inferred per column by the sink (design section 5.1); the structural fields of a
 * dialect (Cytoscape `position` / `classes` / `parent`, JGF `label` / `relation`, edge ids) are
 * declared up front with their roles when the file uses them. Direction goes through the
 * DirectionResolver of design section 8.4; per-element errors are aggregated into the ImportReport
 * until the error limit (design section 8.6).
 *
 * Fatal errors (ImportError at once): empty input, invalid JSON, an unrecognised top-level shape, a
 * section that is not an array / object. Recoverable errors (an issue, the element skipped): a
 * missing nodes or edges array, a node without an id, an edge without an endpoint, a bad index
 * endpoint, a declared field of the wrong type, an unknown Cytoscape parent, an id the coercion rule
 * rejects.
 */

import {
    type ColumnDecl,
    type ColumnHandle,
    GraphFormatError,
    type GraphMetaPatch,
    type GraphSink,
    INVALID_INDEX,
    type NodeId,
} from "@graphty/graph-format";

import { uniqueColumnName } from "../../common/attributes.js";
import {
    AMBIGUOUS_GRAPH_NAME_CODE,
    BAD_VALUE_CODE,
    COLUMN_RENAMED_CODE,
    DANGLING_REFERENCE_CODE,
    DUPLICATE_ATTRIBUTE_CODE,
    DUPLICATE_EDGE_ID_CODE,
    DUPLICATE_NODE_CODE,
    ELEMENT_ISSUE,
    EMPTY_COLUMN_DROPPED_CODE,
    EMPTY_INPUT_CODE,
    ENCODING_FALLBACK_CODE,
    GRAPH_NOT_FOUND_CODE,
    HYPEREDGE_CODE,
    INPUT_ISSUE,
    INVALID_ENCODING_CODE,
    INVALID_UTF8_CODE,
    JSON_NONSTANDARD_NUMBER_CODE,
    MISSING_ENDPOINT_CODE,
    MISSING_ID_CODE,
    MULTIPLE_GRAPHS_CODE,
    OPTION_IGNORED_CODE,
    PARENT_CYCLE_CODE,
    PRECISION_CODE,
    ROLE_TAKEN_CODE,
    SYNTAX_CODE,
    TOO_LARGE_CODE,
    UNKNOWN_ELEMENT_CODE,
    UNKNOWN_ENCODING_CODE,
    UNKNOWN_PARENT_CODE,
} from "../../common/codes.js";
import { DirectionResolver, type EdgeKind } from "../../common/direction.js";
import { ID_MERGED_CODE, IdCoercer } from "../../common/ids.js";
import { readText, throwIfAborted } from "../../common/input.js";
import {
    findDuplicateKeys,
    flipY,
    MAYBE_INEXACT_EXPONENT,
    MAYBE_UNSAFE_INTEGER,
    rewriteNumbers,
} from "../../common/json-elements.js";
import {
    chooseGraph,
    graphChosen,
    type ImportFormatDefaults,
    reportSinkOptions,
    reportUnusedOptions,
    type ResolvedImportOptions,
    resolveImportOptions,
    SINK_OPTION_CODE,
} from "../../common/options.js";
import { agree, plural } from "../../common/plural.js";
import { ImportReportBuilder } from "../../common/report.js";
import { weightFromValue } from "../../common/weights.js";
import { headBytes, sniffJsonDialectHead } from "../../sniff.js";
import {
    type CommonImportOptions,
    type GraphChoiceOptions,
    type GraphImporter,
    type GraphListing,
    type ImportInput,
    type ImportReport,
} from "../../types.js";
import {
    CLASSES_COLUMN,
    CYTOSCAPE_ELEMENT_KEYS,
    CYTOSCAPE_STRUCTURAL_KEYS,
    DIALECT_DEFAULT_DIRECTED,
    hasKey,
    isJsonImportDialect,
    isJsonObject,
    JSON_IMPORT_DIALECTS,
    type JsonImportDialect,
    type JsonShapeMeta,
    META_KEY,
    NODE_LINK_SOURCE_KEYS,
    NODE_LINK_TARGET_KEYS,
    PARENT_COLUMN,
    POSITION_COLUMN,
    sniffJsonDialect,
    SUFFIX,
} from "./dialect.js";
import { importObographs } from "./obographs.js";

/**
 * The format-specific options of the JSON importer. `graphIndex` / `graphName` choose one graph of
 * a JGF or OBO Graphs `graphs` array (the first by default); a graph's name is its `id`, else its
 * label.
 * @category Built-in formats
 */
export interface JsonImportOptions extends GraphChoiceOptions, CommonImportOptions {
    /**
     * The dialect to read; "auto" detects it from the document. `jsonShapeOf(snapshot).dialect` is
     * the dialect that was read.
     * @defaultValue "auto"
     */
    dialect?: JsonImportDialect | "auto" | undefined;
    /**
     * node-link, d3, vis, adjacency and tree documents: the node key that holds the id. The default
     * is "id" (for node-link and d3, "name" when no node has an "id").
     * @defaultValue "id"
     */
    nodeIdKey?: string | undefined;
    /**
     * node-link and d3 documents: the top-level key that holds the edges. The default is "edges"
     * when the document has it, else "links".
     * @defaultValue "edges" or "links"
     */
    edgesKey?: string | undefined;
    /**
     * node-link, d3 and vis documents: the edge key that holds the source. The default is the first
     * of "source", "src" and "from" the edges use (vis: "from").
     * @defaultValue "source"
     */
    sourceKey?: string | undefined;
    /**
     * node-link, d3 and vis documents: the edge key that holds the target. The default is the first
     * of "target", "dst" and "to" the edges use (vis: "to").
     * @defaultValue "target"
     */
    targetKey?: string | undefined;
    /**
     * node-link and d3 documents: whether edge ends are positions in the node array rather than
     * ids; "auto" says yes when every end is an integer below the number of nodes and no node id is
     * a number.
     * @defaultValue "auto"
     */
    indexLinks?: boolean | "auto" | undefined;
    /**
     * OBO Graphs documents: "curie" reads `http://purl.obolibrary.org/obo/GO_0008150` as
     * `GO:0008150` and `.../obo/go#regulates` as `regulates`, the ids the `.obo` file of the same
     * ontology uses; "iri" keeps every IRI as written.
     * @defaultValue "curie"
     */
    oboIds?: "curie" | "iri" | undefined;
    /**
     * OBO Graphs documents: "metadata" keeps the relation definitions (PROPERTY nodes, with their
     * subPropertyOf and inverseOf edges) in `snapshot.meta.extra.obographs`, the way the OBO
     * importer keeps `[Typedef]` frames; "nodes" makes them nodes and edges of the graph.
     * @defaultValue "metadata"
     */
    typedefs?: "metadata" | "nodes" | undefined;
    /**
     * node-link, d3, vis and graphology documents: where the node array is, as a dotted path of
     * keys and array positions from the top of the document (`"data.nodes"`, `"graphs.0.nodes"`).
     * The object that holds the array is read as the graph (its `directed`, `multigraph`, `graph`
     * and edge keys). A path that leads nowhere is reported as E_MISSING_SECTION and the graph has
     * no nodes.
     * @defaultValue "nodes"
     */
    nodesPath?: string | undefined;
    /**
     * node-link, d3, vis and graphology documents: where the edge array is, as a dotted path
     * (`"data.links"`). The default is the edges or links key next to the node array. A path that
     * leads nowhere is reported as E_MISSING_SECTION and the graph has no edges.
     * @defaultValue next to the nodes
     */
    edgesPath?: string | undefined;
}

/**
 * The issue codes the JSON importer records, by name: the codes shared with
 * the other importers and the JSON-specific ones. A key is the code without
 * its severity and format prefixes.
 * @category Built-in formats
 */
export const JSON_ISSUE = Object.freeze({
    ...INPUT_ISSUE,
    ...ELEMENT_ISSUE,
    /** The text is empty or whitespace. The import stops. */
    EMPTY_INPUT: EMPTY_INPUT_CODE,
    /** The text is not valid JSON. The import stops. */
    SYNTAX: SYNTAX_CODE,
    /** No dialect matches the document's top-level shape. The import stops. */
    DIALECT: "E_JSON_DIALECT",
    /** A section (nodes, edges, elements, graph) has the wrong JSON type. */
    SHAPE: "E_JSON_SHAPE",
    /**
     * A section the dialect expects is not there: a node-link document without its nodes or its edges array, an
     * adjacency document without lists for some nodes, or a `nodesPath` / `edgesPath` that names nothing. Nothing is
     * skipped: the graph is read without that section (nodes come from the edges, or there are no edges).
     */
    MISSING_SECTION: "W_MISSING_SECTION",
    /** A node record or an element is not an object. */
    BAD_ELEMENT: "E_BAD_ELEMENT",
    /** A node record has no id. */
    MISSING_ID: MISSING_ID_CODE,
    /**
     * A node id is a JSON boolean or null, which graph-io cannot use as an id; the node is skipped. With `ids:
     * "string"` it is read as the text "true", "false" or "null".
     */
    UNSUPPORTED_ID: "E_UNSUPPORTED_ID",
    /** An edge record has no source or no target. */
    MISSING_ENDPOINT: MISSING_ENDPOINT_CODE,
    /** An index endpoint is not an integer below the node count, or names a skipped node. */
    BAD_INDEX: "E_BAD_INDEX",
    /** A declared field has the wrong JSON type (JGF label / relation / metadata, Cytoscape position / classes). */
    BAD_VALUE: BAD_VALUE_CODE,
    /** A graph-level flag (`directed`, `multigraph`, graphology `options`) has the wrong type; the default is used. */
    BAD_FLAG: "W_BAD_FLAG",
    /** A Cytoscape `data.parent` names an unknown node. */
    UNKNOWN_PARENT: UNKNOWN_PARENT_CODE,
    /** A node id repeated by a later record; the records are merged (the later attributes win). */
    DUPLICATE_NODE: DUPLICATE_NODE_CODE,
    /** An edge id (Cytoscape data.id, graphology key, vis id) repeated by a later edge; the edge is skipped. */
    DUPLICATE_EDGE_ID: DUPLICATE_EDGE_ID_CODE,
    /** Two different id texts became the same number because `ids` is "number", so their nodes were merged. */
    ID_MERGED: ID_MERGED_CODE,
    /** Edge ids of mixed JSON types were stored as text. */
    EDGE_ID_STRINGIFIED: "W_EDGE_ID_STRINGIFIED",
    /**
     * The file holds several graphs and only the first was read. It is not added when `graphIndex` or `graphName` chose the graph.
     * `importAllGraphs()` reads every one.
     */
    MULTIPLE_GRAPHS: MULTIPLE_GRAPHS_CODE,
    /**
     * `graphIndex` is past the end of the `graphs` array, or `graphName` matches none of its graphs. The import stops.
     */
    GRAPH_NOT_FOUND: GRAPH_NOT_FOUND_CODE,
    /** `graphName` matches more than one graph of the `graphs` array. The import stops. */
    AMBIGUOUS_GRAPH_NAME: AMBIGUOUS_GRAPH_NAME_CODE,
    /** Obographs: an edge uses the outdated `subj` key of the OBO Graphs README; it is read as `sub`. */
    OBOGRAPHS_SUBJ: "W_JSON_OBOGRAPHS_SUBJ",
    /**
     * Obographs: an edge endpoint missing from `nodes` (a placeholder node is made, or the edge dropped under
     * addMissingNodes false).
     */
    DANGLING_REFERENCE: DANGLING_REFERENCE_CODE,
    /** The document is longer than a JavaScript string can hold. The import stops. */
    TOO_LARGE: TOO_LARGE_CODE,
    /** A JGF hyperedge (an edge with more than two ends) while `hyperedges` is "error". */
    HYPEREDGE: HYPEREDGE_CODE,
    /**
     * JGF hyperedges were skipped, because `hyperedges` is "skip" (the default). Pass "star" or "clique" to keep them.
     */
    HYPEREDGES_SKIPPED: "W_HYPEREDGES_SKIPPED",
    /** A JGF hyperedge with neither a nodes array nor source / target arrays. */
    HYPEREDGE_SHAPE: "E_HYPEREDGE_SHAPE",
    /** The nodes have no id key at all; array positions became the ids. */
    POSITIONAL_NODES: "W_POSITIONAL_NODES",
    /** A node-link / d3 top-level key the importer does not read (the other of edges / links, an unknown key); it is dropped. */
    UNREAD_KEY: "W_JSON_UNREAD_KEY",
    /**
     * You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`,
     * `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.
     */
    SINK_OPTION: SINK_OPTION_CODE,
    /** You set an option this format does not use; it had no effect. The message names the option. */
    OPTION_IGNORED: OPTION_IGNORED_CODE,
    /** The input is not valid UTF-8. The import stops. */
    INVALID_UTF8: INVALID_UTF8_CODE,
    /**
     * Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the
     * `encoding` option). The import stops.
     */
    INVALID_ENCODING: INVALID_ENCODING_CODE,
    /** Bytes that are not UTF-8 and declare no encoding were read as windows-1252. */
    ENCODING_FALLBACK: ENCODING_FALLBACK_CODE,
    /** The document uses the non-standard tokens NaN / Infinity / -Infinity (Python's json writes them); read as numbers. */
    NONSTANDARD_NUMBER: JSON_NONSTANDARD_NUMBER_CODE,
    /** Integer literals beyond 2^53 were read as their exact digits (strings), not as rounded numbers. */
    BIG_INTEGER: "W_JSON_BIG_INTEGER",
    /** A declared encoding the platform cannot decode was ignored. */
    UNKNOWN_ENCODING: UNKNOWN_ENCODING_CODE,
    /** An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit. */
    PRECISION: PRECISION_CODE,
    /**
     * The document contradicts itself: a declared option its edges break (multigraph false with
     * parallel links, graphology's options), a record whose section disagrees with its shape, a
     * JGF inner id other than its key, the two listings of one adjacency edge.
     */
    INCONSISTENT: "W_JSON_INCONSISTENT",
    /** IndexLinks "auto" read integer endpoints as array positions although they also name node ids. */
    INDEX_LINKS: "W_JSON_INDEX_LINKS",
    /** A Cytoscape parent link that would close a cycle; that link is dropped. */
    PARENT_CYCLE: PARENT_CYCLE_CODE,
    /** An attribute key that is null on every element makes no column (NetworkX writes None as null). */
    EMPTY_COLUMN_DROPPED: EMPTY_COLUMN_DROPPED_CODE,
    /** OBO Graphs: a node type or synonym predicate outside the schema's set; kept as written, once per name. */
    UNKNOWN_ELEMENT: UNKNOWN_ELEMENT_CODE,
    /**
     * A key repeated in one JSON object (JSON.parse keeps the last value, the earlier is dropped),
     * or, in OBO Graphs, a single-valued OBO tag given twice in basicPropertyValues (the first is kept).
     */
    DUPLICATE_ATTRIBUTE: DUPLICATE_ATTRIBUTE_CODE,
    /**
     * An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example
     * two attributes declared with the same name.
     */
    COLUMN_RENAMED: COLUMN_RENAMED_CODE,
    /**
     * You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as
     * a plain attribute.
     */
    ROLE_TAKEN: ROLE_TAKEN_CODE,
});

/** The common options the JSON importer reads (the rest is reported by reportUnusedOptions). */
const USED_OPTIONS: ReadonlySet<keyof CommonImportOptions> = new Set<keyof CommonImportOptions>([
    "ids",
    "nodeIdFrom",
    "addMissingNodes",
    "duplicateEdges",
    "selfLoops",
    "onMixedDirection",
    "defaultDirected",
    "weightFrom",
    "weightDtype",
    "hyperedges",
    "errorLimit",
    "signal",
    "onProgress",
]);

const FORMAT_DEFAULTS: ImportFormatDefaults = { ids: "keep", defaultDirected: false, weightFrom: "weight" };

/** Bytes of the head sniff() inspects. */
const SNIFF_BYTES = 4096;

/** How many dangling endpoints the W_DANGLING_REFERENCE message names. */
const DANGLING_SHOWN = 5;

/** Elements pushed between two checks of the cancellation signal (the whole document is one chunk). */
const ABORT_CHECK_INTERVAL = 64;

/** The top-level keys whose presence in the head marks a graph document rather than arbitrary JSON. */
const SNIFF_KEYS: readonly string[] = ['"nodes"', '"links"', '"edges"', '"elements"', '"graph"', '"graphs"'];

const BOM = String.fromCharCode(0xfeff);

/** The JGF edge keys that are not metadata. */
const JGF_EDGE_KEYS: ReadonlySet<string> = new Set([
    "id",
    "source",
    "target",
    "relation",
    "directed",
    "label",
    "metadata",
]);

/** The JGF hyperedge keys that are not metadata. */
const JGF_HYPEREDGE_KEYS: ReadonlySet<string> = new Set([...JGF_EDGE_KEYS, "nodes"]);

/** The JGF node keys that are not metadata. */
const JGF_NODE_KEYS: ReadonlySet<string> = new Set(["label", "metadata"]);

/** The graphology node keys that are not attributes. */
const GRAPHOLOGY_NODE_KEYS: ReadonlySet<string> = new Set(["key", "attributes"]);

/** The graphology edge keys that are not attributes. */
const GRAPHOLOGY_EDGE_KEYS: ReadonlySet<string> = new Set(["key", "source", "target", "attributes", "undirected"]);

/** The vis.js endpoint keys. */
const VIS_SOURCE_KEYS: readonly string[] = Object.freeze(["from"]);
const VIS_TARGET_KEYS: readonly string[] = Object.freeze(["to"]);

export type JsonRecord = Record<string, unknown>;

/** An edge id column declared from a scan of the file's edge ids. */
interface EdgeIdColumn {
    readonly handle: ColumnHandle;
    /** Whether numeric ids are stored as text (the file mixes numbers and strings). */
    readonly stringify: boolean;
    /** The id texts seen so far when the dialect requires unique ids, else null. */
    readonly seen: Set<string> | null;
}

/** The dialects whose node and edge arrays nodesPath and edgesPath can point at. */
const PATH_DIALECTS: ReadonlySet<JsonImportDialect> = new Set<JsonImportDialect>([
    "node-link",
    "d3",
    "vis",
    "graphology",
]);

/** The resolved format-specific options. */
interface ResolvedJsonOptions {
    readonly dialect: JsonImportDialect | "auto";
    readonly nodeIdKey: string | null;
    readonly edgesKey: string | null;
    readonly sourceKey: string | null;
    readonly targetKey: string | null;
    readonly indexLinks: boolean | "auto";
    readonly graphIndex: number;
    /** The caller's graphIndex / graphName, as given, for chooseGraph(). */
    readonly choice: GraphChoiceOptions;
    /** obographs: CURIE or IRI ids. */
    readonly oboIds: "curie" | "iri";
    /** obographs: PROPERTY nodes as metadata or as nodes. */
    readonly typedefs: "metadata" | "nodes";
    /** The dotted path segments of the node array, or null for the root's own nodes key. */
    readonly nodesPath: readonly string[] | null;
    /** The dotted path segments of the edge array, or null for the edges / links key beside the nodes. */
    readonly edgesPath: readonly string[] | null;
    /** Set by importAll(): every graph of a `graphs` array is read, so none is reported as skipped. */
    readonly all?: boolean;
}

/**
 * Check the format-specific options.
 * @param options - the caller's options
 * @returns the resolved options; E_UNSUPPORTED for a bad value
 */
function resolveJsonOptions(options: (JsonImportOptions & CommonImportOptions) | undefined): ResolvedJsonOptions {
    const o = options ?? {};
    const dialect = o.dialect ?? "auto";
    if (dialect !== "auto" && !isJsonImportDialect(dialect)) {
        throw unsupportedOption("dialect", dialect, [...JSON_IMPORT_DIALECTS, "auto"]);
    }
    const indexLinks = o.indexLinks ?? "auto";
    if (indexLinks !== "auto" && typeof indexLinks !== "boolean") {
        throw unsupportedOption("indexLinks", indexLinks, ["true", "false", "auto"]);
    }
    const graphIndex = o.graphIndex ?? 0;
    if (!Number.isInteger(graphIndex) || graphIndex < 0) {
        throw unsupportedOption("graphIndex", graphIndex, ["a non-negative integer"]);
    }
    const oboIds = o.oboIds ?? "curie";
    if (oboIds !== "curie" && oboIds !== "iri") {
        throw unsupportedOption("oboIds", oboIds, ["curie", "iri"]);
    }
    const typedefs = o.typedefs ?? "metadata";
    if (typedefs !== "metadata" && typedefs !== "nodes") {
        throw unsupportedOption("typedefs", typedefs, ["metadata", "nodes"]);
    }
    const nodesPath = pathOption("nodesPath", o.nodesPath);
    const edgesPath = pathOption("edgesPath", o.edgesPath);
    if ((nodesPath !== null || edgesPath !== null) && dialect !== "auto" && !PATH_DIALECTS.has(dialect)) {
        throw unsupportedOption(nodesPath === null ? "edgesPath" : "nodesPath", dialect, [...PATH_DIALECTS]);
    }
    return {
        dialect,
        nodeIdKey: keyOption("nodeIdKey", o.nodeIdKey),
        edgesKey: keyOption("edgesKey", o.edgesKey),
        sourceKey: keyOption("sourceKey", o.sourceKey),
        targetKey: keyOption("targetKey", o.targetKey),
        indexLinks,
        graphIndex,
        choice: { graphIndex: o.graphIndex, graphName: o.graphName },
        oboIds,
        typedefs,
        nodesPath,
        edgesPath,
    };
}

/**
 * Check a dotted path option: object keys joined by dots, none of them empty.
 * @param name - the option name
 * @param value - the caller's value
 * @returns the segments, or null when absent
 */
function pathOption(name: string, value: unknown): readonly string[] | null {
    if (value === undefined) {
        return null;
    }
    const segments = typeof value === "string" ? value.split(".") : [];
    if (segments.length === 0 || segments.some((segment) => segment.length === 0)) {
        throw unsupportedOption(name, value, ["a dotted path of non-empty keys"]);
    }
    return segments;
}

/**
 * The value at a path of object keys and array positions (`graphs.0.nodes`), or undefined when a
 * step is missing.
 * @param root - the document
 * @param segments - the keys; a decimal integer indexes an array
 * @returns the value
 */
function valueAt(root: unknown, segments: readonly string[]): unknown {
    let value = root;
    for (const segment of segments) {
        if (Array.isArray(value) && /^(0|[1-9]\d*)$/.test(segment) && Number(segment) < value.length) {
            value = value[Number(segment)];
        } else if (isJsonObject(value) && hasKey(value, segment)) {
            value = value[segment];
        } else {
            return undefined;
        }
    }
    return value;
}

/**
 * The graph record nodesPath and edgesPath describe: the object holding the node array (the
 * document itself by default) with its nodes key and its edges / links key replaced by the arrays
 * the paths name. A path that names nothing is recorded as E_MISSING_SECTION and stands for an
 * empty array, so the import goes on.
 * @param root - the parsed document
 * @param json - the resolved options
 * @param report - the report
 * @returns the document unchanged when no path is given, else the graph record
 */
function applyPaths(root: unknown, json: ResolvedJsonOptions, report: ImportReportBuilder): unknown {
    const { nodesPath, edgesPath } = json;
    if (nodesPath === null && edgesPath === null) {
        return root;
    }
    const lookup = (option: string, segments: readonly string[]): unknown => {
        const value = valueAt(root, segments);
        if (value === undefined) {
            const path = segments.join(".");
            report.warning(
                "missing-value",
                JSON_ISSUE.MISSING_SECTION,
                `${option} ${JSON.stringify(path)} names nothing in the document`,
                { element: path },
            );
            return [];
        }
        return value;
    };
    const holderPath = nodesPath === null ? [] : nodesPath.slice(0, -1);
    const holder = valueAt(root, holderPath);
    // the keys the paths replace: the nodes key, and every edge key when edgesPath names the edges
    const replaced = new Set<string>();
    if (nodesPath !== null) {
        replaced.add(nodesPath[nodesPath.length - 1]);
    }
    if (edgesPath !== null) {
        replaced.add("edges");
        replaced.add("links");
    }
    let record: JsonRecord = Object.fromEntries(
        Object.entries(isJsonObject(holder) ? holder : {}).filter(([key]) => !replaced.has(key)),
    );
    // edges inside the holder (`data.graph.links` under `data`) leave the holder, and only they do:
    // the rest of the key they sit in (the `graph` attributes) is still read
    if (edgesPath !== null && edgesPath.length > holderPath.length && holderPath.every((k, i) => edgesPath[i] === k)) {
        const rest = withoutPath(record, edgesPath.slice(holderPath.length));
        record = isJsonObject(rest) ? rest : {};
    }
    if (nodesPath !== null) {
        record.nodes = lookup("nodesPath", nodesPath);
    }
    if (edgesPath !== null) {
        record[pathEdgesKey(json, edgesPath)] = lookup("edgesPath", edgesPath);
    }
    return record;
}

/**
 * A value with the entry at a path of object keys removed; undefined when the path is empty (the
 * value itself goes) or nothing but that entry is left.
 * @param value - the value
 * @param segments - the keys down to the entry
 * @returns the value without the entry
 */
function withoutPath(value: unknown, segments: readonly string[]): unknown {
    if (segments.length === 0) {
        return undefined;
    }
    const [head, ...tail] = segments;
    if (!isJsonObject(value) || !hasKey(value, head)) {
        return value;
    }
    // a parsed JSON value is never undefined, so undefined marks the entries to drop
    const entries = Object.entries(value)
        .map(([key, v]) => [key, key === head ? withoutPath(v, tail) : v] as const)
        .filter(([, v]) => v !== undefined);
    return entries.length === 0 ? undefined : Object.fromEntries(entries);
}

/**
 * The key applyPaths() stores the edge array under: the caller's edgesKey, else "links" when
 * edgesPath ends in links (so the d3 sniff still sees it), else "edges".
 * @param json - the resolved options
 * @param edgesPath - the edgesPath segments
 * @returns the key
 */
function pathEdgesKey(json: ResolvedJsonOptions, edgesPath: readonly string[]): string {
    return json.edgesKey ?? (edgesPath[edgesPath.length - 1] === "links" ? "links" : "edges");
}

/**
 * The dialect of a graph record built from nodesPath / edgesPath: the forced one, else the shape
 * rule over the record, else node-link.
 * @param record - the graph record
 * @param forced - the caller's dialect option
 * @param placedEdges - whether edgesPath placed the record's edge array (under links or edges)
 * @returns the dialect
 */
function pathDialect(record: unknown, forced: JsonImportDialect | "auto", placedEdges: boolean): JsonImportDialect {
    if (forced !== "auto") {
        return forced;
    }
    // edgesPath puts the edge array under links only so a bare d3 document stays d3; under edges,
    // vis and graphology edges are told apart from NetworkX links again. A links key the document
    // itself holds is NetworkX's and settles node-link.
    if (placedEdges && isJsonObject(record) && hasKey(record, "links") && !hasKey(record, "edges")) {
        const { links, ...rest } = record;
        const asEdges = sniffJsonDialect({ ...rest, edges: links });
        if (asEdges === "vis" || asEdges === "graphology") {
            return asEdges;
        }
    }
    const sniffed = sniffJsonDialect(record);
    return sniffed !== null && PATH_DIALECTS.has(sniffed) ? sniffed : "node-link";
}

/**
 * The document to read and its dialect: the graph record of nodesPath / edgesPath when either is
 * given, the document itself otherwise.
 * @param parsed - the parsed document
 * @param json - the resolved options
 * @param report - the report
 * @returns the root and its dialect
 */
function documentOf(
    parsed: unknown,
    json: ResolvedJsonOptions,
    report: ImportReportBuilder,
): { readonly root: unknown; readonly dialect: JsonImportDialect } {
    if (json.nodesPath === null && json.edgesPath === null) {
        return { root: parsed, dialect: detectDialect(parsed, json.dialect, report) };
    }
    const root = applyPaths(parsed, json, report);
    const dialect = pathDialect(root, json.dialect, json.edgesPath !== null);
    // vis and graphology read their edges from the edges key only
    if (json.edgesPath !== null && (dialect === "vis" || dialect === "graphology") && isJsonObject(root)) {
        const key = pathEdgesKey(json, json.edgesPath);
        const renamed = Object.fromEntries(Object.entries(root).map(([k, v]) => [k === key ? "edges" : k, v]));
        return { root: renamed, dialect };
    }
    return { root, dialect };
}

/**
 * Check a key-valued option.
 * @param name - the option name
 * @param value - the caller's value
 * @returns the key, or null when absent
 */
function keyOption(name: string, value: unknown): string | null {
    if (value === undefined) {
        return null;
    }
    if (typeof value !== "string" || value.length === 0) {
        throw unsupportedOption(name, value, ["a non-empty key"]);
    }
    return value;
}

/**
 * The E_UNSUPPORTED error of a bad format-specific option (the core's convention, as in the common
 * option module).
 * @param name - the option name
 * @param found - the value
 * @param supported - what is accepted
 * @returns the error
 */
function unsupportedOption(name: string, found: unknown, supported: readonly string[]): GraphFormatError {
    return new GraphFormatError(
        "E_UNSUPPORTED",
        `option ${name}: ${describe(found)} is not one of ${supported.join(", ")}`,
        {
            option: name,
            found: typeof found === "string" ? found : typeof found,
            supported: [...supported],
        },
    );
}

/**
 * A short description of a value for messages.
 * @param value - the value
 * @returns JSON for primitives, "array" or the type name otherwise
 */
function describe(value: unknown): string {
    if (value === null) {
        return "null";
    }
    if (Array.isArray(value)) {
        return "array";
    }
    switch (typeof value) {
        case "string":
        case "number":
        case "boolean":
            return JSON.stringify(value);
        default:
            return typeof value;
    }
}

// ============================================================ attribute writer

/**
 * Writes inferred attribute cells for one table, caching the handle of every column after its
 * first write so the hot loop never looks a column up by name twice. Names that collide with a
 * structural column declared up front are suffixed deterministically (design section 5.6).
 */
class AttributeWriter {
    private readonly sink: GraphSink;

    private readonly domain: "node" | "edge";

    private readonly handles = new Map<string, ColumnHandle>();

    private readonly reservedNames = new Set<string>();

    private readonly report: ImportReportBuilder;

    /** Column names written only with null so far (NetworkX writes None as null). */
    private readonly nullOnly = new Set<string>();

    /**
     * Create a writer.
     * @param sink - the sink
     * @param domain - node or edge
     * @param report - where a refused cell is recorded
     */
    constructor(sink: GraphSink, domain: "node" | "edge", report: ImportReportBuilder) {
        this.sink = sink;
        this.domain = domain;
        this.report = report;
    }

    /**
     * Declare a structural column up front; attribute keys with its name are suffixed from now on.
     * @param decl - the declaration
     * @returns the handle
     */
    declare(decl: ColumnDecl): ColumnHandle {
        this.reservedNames.add(decl.name);
        const handle = this.domain === "node" ? this.sink.declareNodeColumn(decl) : this.sink.declareEdgeColumn(decl);
        this.handles.set(decl.name, handle);
        return handle;
    }

    /**
     * Declare a structural column only when the file uses it.
     * @param decl - the declaration
     * @param present - whether any element carries the field
     * @returns the handle, or INVALID_INDEX when not declared
     */
    declareIf(decl: ColumnDecl, present: boolean): ColumnHandle {
        return present ? this.declare(decl) : (INVALID_INDEX as ColumnHandle);
    }

    /**
     * Whether a name is taken in the sink's table (for the deterministic rename rule).
     * @param name - the column name
     * @returns true when a column of that name exists
     */
    taken(name: string): boolean {
        return this.lookup(name) !== INVALID_INDEX;
    }

    /**
     * Write one attribute cell by its source key; null and undefined leave the row unset. A cell the
     * sink refuses is recorded and skipped, so the element's other keys are still written.
     * @param row - the node or edge index
     * @param key - the source key
     * @param value - the JSON value
     * @param suffix - the suffix applied when the key collides with a structural column
     * @param element - the element name for an issue
     */
    write(row: number, key: string, value: unknown, suffix: string, element: string): void {
        if (value === undefined) {
            return;
        }
        const name = this.reservedNames.has(key) ? `${key}${suffix}` : key;
        if (value === null) {
            this.nullOnly.add(name);
            return;
        }
        try {
            const cached = this.handles.get(name);
            if (cached !== undefined) {
                this.set(cached, row, value);
                return;
            }
            this.set(name, row, value);
        } catch (err) {
            if (!(err instanceof GraphFormatError)) {
                throw err;
            }
            this.report.recordError(err, { element: `${element}.${key}` });
            return;
        }
        const handle = this.lookup(name);
        if (handle !== INVALID_INDEX) {
            this.handles.set(name, handle);
        }
    }

    /**
     * Report the keys that were null on every element that had them: they made no column, so a
     * round trip loses them (W_EMPTY_COLUMN_DROPPED, one warning per table).
     */
    reportNullOnly(): void {
        const names = [...this.nullOnly].filter((name) => this.lookup(name) === INVALID_INDEX);
        if (names.length > 0) {
            this.report.warning(
                "missing-value",
                EMPTY_COLUMN_DROPPED_CODE,
                `${this.domain} key${plural(names.length)} ${names.map((n) => JSON.stringify(n)).join(", ")} ${agree(names.length, "is", "are")} null wherever they appear; no column is made for them`,
                { element: names[0] },
            );
        }
    }

    /**
     * Write through a handle or a name.
     * @param column - the handle or name
     * @param row - the row
     * @param value - the value
     */
    set(column: ColumnHandle | string, row: number, value: unknown): void {
        if (this.domain === "node") {
            this.sink.setNodeValue(column, row, value);
        } else {
            this.sink.setEdgeValue(column, row, value);
        }
    }

    /**
     * Look a column up by name.
     * @param name - the column name
     * @returns the handle, or INVALID_INDEX
     */
    private lookup(name: string): ColumnHandle {
        return this.domain === "node" ? this.sink.nodeColumn(name) : this.sink.edgeColumn(name);
    }
}

// ============================================================ the import context

/**
 * Everything one import call shares between the dialect readers.
 * @category Plugin helpers
 */
export class ImportContext {
    readonly sink: GraphSink;

    readonly report: ImportReportBuilder;

    readonly options: ResolvedImportOptions;

    readonly json: ResolvedJsonOptions;

    readonly ids: IdCoercer;

    readonly direction: DirectionResolver;

    readonly nodes: AttributeWriter;

    readonly edges: AttributeWriter;

    /** Whether the caller passed `defaultDirected` explicitly (then it beats the dialect's convention). */
    readonly explicitDefaultDirected: boolean;

    /** Nodes and edges pushed since the signal was last checked. */
    private elementsSinceCheck = 0;

    /**
     * Create the context.
     * @param sink - the sink
     * @param report - the report
     * @param options - the resolved common options
     * @param json - the resolved format options
     * @param explicitDefaultDirected - whether the caller passed defaultDirected
     */
    constructor(
        sink: GraphSink,
        report: ImportReportBuilder,
        options: ResolvedImportOptions,
        json: ResolvedJsonOptions,
        explicitDefaultDirected: boolean,
    ) {
        this.sink = sink;
        this.report = report;
        this.options = options;
        this.json = json;
        this.ids = new IdCoercer(options.ids);
        this.direction = new DirectionResolver(sink, report, options.onMixedDirection);
        this.nodes = new AttributeWriter(sink, "node", report);
        this.edges = new AttributeWriter(sink, "edge", report);
        this.explicitDefaultDirected = explicitDefaultDirected;
    }

    /**
     * Report a `nodeIdFrom` other than "id" for a dialect whose ids are unambiguous.
     * @param dialect - the dialect
     * @param idField - where the dialect's ids come from, for the message
     */
    reportNodeIdFrom(dialect: JsonImportDialect, idField: string): void {
        if (this.options.nodeIdFrom !== "id") {
            this.report.warning(
                "unsupported",
                JSON_ISSUE.OPTION_IGNORED,
                `nodeIdFrom "${this.options.nodeIdFrom}" does not apply to ${dialect}; ids are read from ${idField}`,
                { element: "nodeIdFrom" },
            );
        }
    }

    /**
     * The direction assumed when the file declares none: the caller's `defaultDirected` when given,
     * else the dialect's convention.
     * @param dialect - the dialect
     * @returns the direction
     */
    defaultDirected(dialect: JsonImportDialect): boolean {
        return this.explicitDefaultDirected ? this.options.defaultDirected : DIALECT_DEFAULT_DIRECTED[dialect];
    }

    /** The direction the file declares (or the default), set by setHeader(). */
    private fileDirected = false;

    /**
     * Rule 1 of design section 8.4: set the sink's direction from the file's header (or the
     * dialect's default) before the first edge, remembering the file's direction for uniformKind().
     * @param directed - the file's direction
     */
    setHeader(directed: boolean): void {
        this.fileDirected = directed;
        this.direction.setHeader(directed);
    }

    /**
     * The edge kind every edge of a dialect without per-edge direction has: the file's direction
     * (the resolver expands it when the sink's direction differs).
     * @returns the kind
     */
    uniformKind(): EdgeKind {
        return this.fileDirected ? "directed" : "undirected";
    }

    /**
     * Coerce a node id value per the `ids` option, reporting what cannot be an id. A JSON boolean or
     * null is `unsupported` unless `ids` is "string" (design section 8.5); anything the rule rejects
     * is recorded through the per-element catch.
     * @param raw - the JSON value; undefined when the record has no id key
     * @param element - the element name for the issue
     * @returns the id, or null when the value was reported and the element must be skipped
     */
    coerceId(raw: unknown, element: string): NodeId | null {
        if (raw === undefined) {
            this.report.error("missing-value", JSON_ISSUE.MISSING_ID, `${element} has no id`, { element });
            return null;
        }
        if ((typeof raw === "boolean" || raw === null) && this.options.ids !== "string") {
            const kind = raw === null ? "null" : "boolean";
            this.report.error(
                "unsupported",
                JSON_ISSUE.UNSUPPORTED_ID,
                `${element}: a JSON ${kind} is not a node id (pass ids: "string" to coerce it)`,
                { element },
            );
            return null;
        }
        let id: NodeId;
        try {
            id = this.ids.value(this.options.ids === "string" && typeof raw === "number" ? String(raw) : raw);
        } catch (err) {
            this.report.recordError(err, { element });
            return null;
        }
        const merge = this.ids.lastMerge;
        if (merge !== null) {
            this.report.warning(
                "coercion",
                JSON_ISSUE.ID_MERGED,
                `id text ${JSON.stringify(merge.text)} merged with ${JSON.stringify(merge.previousText)} as ${merge.id}`,
                { element },
            );
        }
        return id;
    }

    /**
     * Coerce an id that must be valid for the caller to proceed (hyperedge members): the rejections
     * of coerceId() are thrown instead of recorded.
     * @param raw - the JSON value
     * @param element - the element name
     * @returns the id
     */
    requireId(raw: unknown, element: string): NodeId {
        if ((typeof raw === "boolean" || raw === null) && this.options.ids !== "string") {
            const kind = raw === null ? "null" : "boolean";
            throw new GraphFormatError("E_INVALID_ID", `${element}: a JSON ${kind} is not a node id`, {
                reason: "unsupported id",
            });
        }
        return this.ids.value(this.options.ids === "string" && typeof raw === "number" ? String(raw) : raw);
    }

    /**
     * Add a node, counting it or recording the failure.
     * @param id - the node id
     * @param element - the element name
     * @param why - more about a repeated id, for the duplicate warning
     * @returns the node index, or -1 when the sink refused the node
     */
    pushNode(id: NodeId, element: string, why = ""): number {
        this.checkAbort();
        const existing = this.sink.indexOf(id);
        if (existing !== INVALID_INDEX) {
            this.report.warning(
                "merged",
                JSON_ISSUE.DUPLICATE_NODE,
                `${element}: node ${JSON.stringify(id)} already exists${why}; its attributes are merged (the later values win)`,
                { element },
            );
            return existing;
        }
        let index: number;
        try {
            index = this.sink.addNode(id);
        } catch (err) {
            this.skip(err, "node", element);
            return -1;
        }
        this.report.counts.nodes++;
        return index;
    }

    /**
     * Push one edge through the direction resolver, counting every logical edge the sink gained
     * (both halves of an expanded edge, and the mirrors of an in-place expansion).
     * @param source - the source id
     * @param target - the target id
     * @param kind - the edge's direction in the file
     * @param weight - the weight, or undefined
     * @param element - the element name for issues
     * @returns the primary edge index
     */
    pushEdge(source: NodeId, target: NodeId, kind: EdgeKind, weight: number | undefined, element: string): number {
        this.checkAbort();
        const before = this.sink.edgeCount;
        // endpoints the sink creates (addMissingNodes) count as nodes too, and are reported
        const missingSource = this.sink.indexOf(source) === INVALID_INDEX;
        const missingTarget = source !== target && this.sink.indexOf(target) === INVALID_INDEX;
        const edge = this.direction.addEdge(source, target, kind, weight, { element });
        this.report.counts.edges += this.sink.edgeCount - before;
        if (missingSource) {
            this.dangling(source);
        }
        if (missingTarget) {
            this.dangling(target);
        }
        return edge;
    }

    /** Endpoints that named no node and became placeholder nodes, the first few kept for the message. */
    private readonly danglingIds: NodeId[] = [];

    private danglingCount = 0;

    /** Set when the document has no node section: every node comes from an edge (E_MISSING_SECTION says so). */
    nodesFromEdges = false;

    /** Dangling endpoints whose id, as the other JSON type, is a node (`"1"` next to the node 1). */
    private readonly nearMatches: NodeId[] = [];

    /**
     * Count a placeholder node an edge endpoint created.
     * @param id - the endpoint
     */
    private dangling(id: NodeId): void {
        this.report.counts.nodes++;
        this.danglingCount++;
        if (this.danglingIds.length < DANGLING_SHOWN) {
            this.danglingIds.push(id);
        }
        const other = typeof id === "number" ? String(id) : Number(id);
        if (
            this.nearMatches.length < DANGLING_SHOWN &&
            (typeof other === "string" || String(other) === id) &&
            this.sink.indexOf(other) !== INVALID_INDEX
        ) {
            this.nearMatches.push(id);
        }
    }

    /**
     * Report the edge endpoints that named no node (the shared W_DANGLING_REFERENCE, once with the
     * count): each became a placeholder node, which is rarely what the file meant.
     */
    reportDangling(): void {
        if (this.danglingCount === 0 || this.nodesFromEdges) {
            return;
        }
        const shown = this.danglingIds.map((id) => JSON.stringify(id)).join(", ");
        const near =
            this.nearMatches.length > 0
                ? `; ${this.nearMatches.map((id) => JSON.stringify(id)).join(", ")} ${agree(this.nearMatches.length, "names", "name")} a node id of another JSON type (a string next to a number), which is a different id`
                : "";
        this.report.warning(
            "validation-error",
            JSON_ISSUE.DANGLING_REFERENCE,
            `${this.danglingCount} edge endpoint${plural(this.danglingCount)} ${agree(this.danglingCount, "names", "name")} no node and became placeholder nodes: ${shown}${this.danglingCount > DANGLING_SHOWN ? ", ..." : ""}${near}`,
            { element: String(this.danglingIds[0]) },
        );
    }

    /**
     * Check the cancellation signal every ABORT_CHECK_INTERVAL pushed elements, so an abort raised
     * while the whole in-memory document is being walked rejects promptly.
     */
    checkAbort(): void {
        if (++this.elementsSinceCheck >= ABORT_CHECK_INTERVAL) {
            this.elementsSinceCheck = 0;
            throwIfAborted(this.options.signal);
        }
    }

    /**
     * Record a per-element failure and count the skipped element.
     * @param err - the thrown value
     * @param domain - which counter to bump
     * @param element - the element name
     */
    skip(err: unknown, domain: "node" | "edge", element: string): void {
        this.report.recordError(err, { element });
        if (domain === "node") {
            this.report.counts.skippedNodes++;
        } else {
            this.report.counts.skippedEdges++;
        }
    }

    /**
     * Report an element that is not an object and count it as skipped.
     * @param domain - node or edge
     * @param element - the element name
     * @param what - what was expected
     */
    badElement(domain: "node" | "edge", element: string, what = "an object"): void {
        this.report.error("validation-error", JSON_ISSUE.BAD_ELEMENT, `${element} is not ${what}`, { element });
        this.countSkipped(domain);
    }

    /**
     * Count a skipped element whose issue was already recorded.
     * @param domain - node or edge
     */
    countSkipped(domain: "node" | "edge"): void {
        if (domain === "node") {
            this.report.counts.skippedNodes++;
        } else {
            this.report.counts.skippedEdges++;
        }
    }

    /**
     * Report an edge record without an endpoint and count it as skipped.
     * @param element - the element name
     * @param field - the missing field
     */
    missingEndpoint(element: string, field: string): void {
        this.report.error("missing-value", JSON_ISSUE.MISSING_ENDPOINT, `${element} has no ${field}`, { element });
        this.report.counts.skippedEdges++;
    }

    /**
     * Record the shape metadata, the source format and further metadata fields in one setMeta()
     * call (the sink replaces `extra` as a whole).
     * @param shape - the shape record
     * @param patch - further metadata fields
     */
    setMeta(shape: JsonShapeMeta, patch: GraphMetaPatch = {}): void {
        const extra: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(shape)) {
            if (value !== undefined) {
                extra[key] = value;
            }
        }
        this.sink.setMeta({ sourceFormat: "json", ...patch, extra: { [META_KEY]: extra } });
    }

    /**
     * Record which source field the weight came from, so the exporter writes it back under the same
     * key (design section 3.7, `meta.weightOrigin`).
     * @returns the metadata patch, empty for an unweighted import
     */
    weightOriginPatch(): GraphMetaPatch {
        const { weightFrom } = this.options;
        if (weightFrom === null) {
            return {};
        }
        return { weightOrigin: { format: "json", id: weightFrom, title: null, type: null, namespace: null } };
    }

    /**
     * Write the graph-level attributes of a dict (NetworkX `graph`, JGF `metadata`, graphology
     * `attributes`, Cytoscape `data`), one column per key.
     * @param dict - the dict, or anything else (then reported)
     * @param what - the dict's name for the issue
     */
    writeGraphDict(dict: unknown, what: string): void {
        if (dict === undefined || dict === null) {
            return;
        }
        if (!isJsonObject(dict)) {
            this.report.warning("validation-error", JSON_ISSUE.BAD_FLAG, `${what} is not an object; ignored`, {
                element: what,
            });
            return;
        }
        for (const key of Object.keys(dict)) {
            const value = dict[key];
            if (value === undefined || value === null) {
                continue;
            }
            try {
                this.sink.setGraphValue(key, value);
            } catch (err) {
                this.report.recordError(err, { element: `${what}.${key}` });
            }
        }
    }

    /**
     * Read the weight field of an edge record.
     * @param record - the record holding the attributes
     * @returns the weight, or undefined when absent or null; E_INVALID_WEIGHT otherwise
     */
    weightOf(record: JsonRecord): number | undefined {
        const { weightFrom } = this.options;
        if (weightFrom === null || !hasKey(record, weightFrom)) {
            return undefined;
        }
        return weightFromValue(record[weightFrom]);
    }

    /**
     * Write the attributes of a nested dict plus the element-level keys the dialect does not
     * define (kept with the `#element` suffix).
     * @param writer - the table writer
     * @param row - the row
     * @param record - the element record
     * @param dict - the nested attribute dict
     * @param structural - the element keys that are not attributes
     * @param weightFrom - the weight key to skip in the dict, or null
     * @param element - the element name for issues
     */
    writeNested(
        writer: AttributeWriter,
        row: number,
        record: JsonRecord,
        dict: JsonRecord,
        structural: ReadonlySet<string>,
        weightFrom: string | null,
        element: string,
    ): void {
        for (const key of Object.keys(dict)) {
            if (key !== weightFrom) {
                writer.write(row, key, dict[key], SUFFIX.data, element);
            }
        }
        for (const key of Object.keys(record)) {
            if (!structural.has(key)) {
                writer.write(row, `${key}${SUFFIX.element}`, record[key], SUFFIX.data, element);
            }
        }
    }

    /**
     * Write a spec-typed string field (JGF label / relation), reporting a value of another type.
     * @param writer - the table writer
     * @param column - the declared column, or INVALID_INDEX when the file has no such field
     * @param row - the row
     * @param value - the value
     * @param field - the field name
     * @param element - the element name
     */
    writeStringField(
        writer: AttributeWriter,
        column: ColumnHandle,
        row: number,
        value: unknown,
        field: string,
        element: string,
    ): void {
        if (column === INVALID_INDEX || value === undefined || value === null) {
            return;
        }
        if (typeof value !== "string") {
            this.report.error(
                "validation-error",
                JSON_ISSUE.BAD_VALUE,
                `${element}: ${field} must be a string, found ${describe(value)}`,
                { element },
            );
            return;
        }
        writer.set(column, row, value);
    }

    /**
     * Declare an edge id column with role "id" from a scan of the file's edge ids: f64 when every
     * id is a number, string otherwise (numbers are then stored as their text and reported once).
     * @param edges - the edge records
     * @param read - how to read an edge's raw id
     * @param name - the column name
     * @param unique - whether uniqueness is enforced at freeze
     * @returns the column, or null when no edge has an id
     */
    declareEdgeIds(
        edges: readonly unknown[],
        read: (edge: JsonRecord) => unknown,
        name: string,
        unique: boolean,
    ): EdgeIdColumn | null {
        let numbers = 0;
        let strings = 0;
        let others = 0;
        for (const edge of edges) {
            if (!isJsonObject(edge)) {
                continue;
            }
            const raw = read(edge);
            if (typeof raw === "number") {
                numbers++;
            } else if (typeof raw === "string") {
                strings++;
            } else if (raw !== undefined && raw !== null) {
                others++;
            }
        }
        if (numbers + strings + others === 0) {
            return null;
        }
        // ids of no usable type still get a column, so edgeIdValue() reports each instead of dropping it
        const dtype = strings === 0 && numbers > 0 ? "f64" : "string";
        const columnName = uniqueColumnName(name, "id", (candidate) => this.edges.taken(candidate));
        const handle = this.edges.declare({ name: columnName, dtype, role: "id", nullable: true, unique });
        const stringify = strings > 0 && numbers > 0;
        const seen = unique ? new Set<string>() : null;
        if (stringify) {
            this.report.warning(
                "coercion",
                JSON_ISSUE.EDGE_ID_STRINGIFIED,
                `edge ids mix numbers and strings; ${numbers} numeric id${plural(numbers)} stored as text`,
                { element: columnName },
            );
        }
        return { handle, stringify, seen };
    }

    /**
     * The value an edge id column stores for a raw id, checked BEFORE the edge is pushed so a bad
     * id skips the edge without touching the sink (design section 11.1).
     * @param column - the column, or null when the file has no edge ids
     * @param raw - the raw id value
     * @returns the value to store, or null when there is nothing to store
     */
    edgeIdValue(column: EdgeIdColumn | null, raw: unknown): string | number | null {
        if (column === null || raw === undefined || raw === null) {
            return null;
        }
        let value: string | number;
        if (typeof raw === "number") {
            value = column.stringify ? String(raw) : raw;
        } else if (typeof raw === "string") {
            value = raw;
        } else {
            throw new GraphFormatError(
                "E_COLUMN_TYPE",
                `an edge id must be a string or a number, found ${describe(raw)}`,
                { found: typeof raw },
            );
        }
        if (column.seen !== null) {
            const text = String(value);
            if (column.seen.has(text)) {
                throw new GraphFormatError(
                    JSON_ISSUE.DUPLICATE_EDGE_ID,
                    `edge id ${JSON.stringify(value)} is declared more than once; the edge is skipped`,
                    { id: value },
                );
            }
            column.seen.add(text);
        }
        return value;
    }

    /**
     * Write an edge id value from edgeIdValue().
     * @param column - the column, or null
     * @param edge - the edge index
     * @param value - the value, or null for none
     */
    setEdgeId(column: EdgeIdColumn | null, edge: number, value: string | number | null): void {
        if (column !== null && value !== null) {
            this.edges.set(column.handle, edge, value);
        }
    }
}

// ============================================================ document level

/**
 * Parse the whole text; syntax errors and empty input abort the import. A key repeated in one
 * object (which JSON.parse silently reduces to its last value) is reported per repetition.
 * @param text - the decoded text
 * @param report - the report
 * @returns the parsed value
 */
function parseDocument(text: string, report: ImportReportBuilder): unknown {
    if (text.trim().length === 0) {
        report.fail(JSON_ISSUE.EMPTY_INPUT, "the input is empty");
    }
    let root: unknown;
    let syntaxError: string | null = null;
    // the text the syntax error was found in: the rewrite's when it parsed further than the original
    let errorText = text;
    try {
        root = JSON.parse(text) as unknown;
    } catch (err) {
        syntaxError = err instanceof Error ? err.message : String(err);
    }
    // the fast path: strict JSON without a digit run long enough to be an unsafe integer
    if (syntaxError === null && !MAYBE_UNSAFE_INTEGER.test(text) && !MAYBE_INEXACT_EXPONENT.test(text)) {
        reportDuplicateKeys(text, report);
        return root;
    }
    let scan: ReturnType<typeof rewriteNumbers>;
    try {
        scan = rewriteNumbers(text);
        if (scan.tokens.size > 0 || scan.bigIntegers.length > 0) {
            try {
                root = JSON.parse(scan.text, scan.tokens.size > 0 ? scan.revive : undefined) as unknown;
                syntaxError = null;
            } catch (err) {
                if (err instanceof RangeError) {
                    throw err;
                }
                // the rewrite read past the non-standard tokens: its error is the real one
                syntaxError = err instanceof Error ? err.message : String(err);
                errorText = scan.text;
            }
        }
    } catch (err) {
        if (!(err instanceof RangeError)) {
            throw err;
        }
        // the rewrite (quoted big integers, sentinel strings) is longer than one string can hold
        const message = `the document with its numbers rewritten is longer than the most one JavaScript string holds`;
        report.error("unsupported", JSON_ISSUE.TOO_LARGE, message);
        throw report.abort(message, { code: JSON_ISSUE.TOO_LARGE });
    }
    if (syntaxError !== null) {
        return report.fail(JSON_ISSUE.SYNTAX, syntaxMessage(text, syntaxError), {
            line: syntaxLine(errorText, syntaxError),
        });
    }
    reportDuplicateKeys(text, report);
    if (scan.tokens.size > 0) {
        report.warning(
            "coercion",
            JSON_ISSUE.NONSTANDARD_NUMBER,
            `the document uses the non-standard token${plural(scan.tokens.size)} ${[...scan.tokens].join(", ")}, which strict JSON does not allow; read as numbers`,
        );
    }
    if (scan.bigIntegers.length > 0) {
        report.warning(
            "precision",
            JSON_ISSUE.BIG_INTEGER,
            `${scan.bigIntegers.length} integer${plural(scan.bigIntegers.length)} beyond 2^53 kept as text so no digit is lost: ${listed(scan.bigIntegers)}`,
        );
    }
    if (scan.inexact.length > 0) {
        report.warning(
            "precision",
            JSON_ISSUE.PRECISION,
            `${scan.inexact.length} number literal${plural(scan.inexact.length)} no double holds exactly, read as the nearest double (an infinity beyond the range, 0 below it): ${listed(scan.inexact)}`,
        );
    }
    return root;
}

/**
 * The first literals of a list for a message, with the count of the rest.
 * @param literals - the literals
 * @returns the text
 */
function listed(literals: readonly string[]): string {
    const more = literals.length - BIG_INTEGERS_SHOWN;
    return `${literals.slice(0, BIG_INTEGERS_SHOWN).join(", ")}${more > 0 ? ` and ${more} more` : ""}`;
}

/** How many repeated keys are reported one by one before the rest is summed up. */
const DUPLICATE_KEYS_SHOWN = 10;

/**
 * Report every key repeated in one object (JSON.parse keeps the last value, so the earlier one is
 * gone): one warning per repetition up to DUPLICATE_KEYS_SHOWN, then one with the remaining count.
 * @param text - the document text
 * @param report - the report
 */
function reportDuplicateKeys(text: string, report: ImportReportBuilder): void {
    const found = findDuplicateKeys(text);
    let line = 1;
    let counted = 0;
    for (const { key, offset } of found.slice(0, DUPLICATE_KEYS_SHOWN)) {
        line += countLines(text, counted, offset);
        counted = offset;
        report.warning(
            "merged",
            JSON_ISSUE.DUPLICATE_ATTRIBUTE,
            `key ${JSON.stringify(key)} appears twice in one object; the earlier value is dropped (JSON.parse keeps the last)`,
            { line, element: key },
        );
    }
    if (found.length > DUPLICATE_KEYS_SHOWN) {
        report.warning(
            "merged",
            JSON_ISSUE.DUPLICATE_ATTRIBUTE,
            `${found.length - DUPLICATE_KEYS_SHOWN} more repeated key${plural(found.length - DUPLICATE_KEYS_SHOWN)}; each earlier value is dropped`,
        );
    }
}

/**
 * The line breaks in a range of the text.
 * @param text - the text
 * @param from - the start offset
 * @param to - the end offset
 * @returns how many \n the range holds
 */
function countLines(text: string, from: number, to: number): number {
    let lines = 0;
    for (let i = text.indexOf("\n", from); i >= 0 && i < to; i = text.indexOf("\n", i + 1)) {
        lines++;
    }
    return lines;
}

/** The longest text the line of an unpositioned syntax error is searched in (a bisection of JSON.parse calls). */
const SYNTAX_SEARCH_LIMIT = 64 * 1024 * 1024;

/**
 * The 1-based line of a JSON.parse error: from the message's "(line L" or "position N" when the
 * engine gives one, the last line for an unexpected end, else the shortest prefix that fails the
 * same way (V8 names no position for "Unexpected token").
 * @param text - the document
 * @param message - the parser's message
 * @returns the line
 */
function syntaxLine(text: string, message: string): number {
    const line = /\(line (\d+)/.exec(message);
    if (line !== null) {
        return Number(line[1]);
    }
    const position = /position (\d+)/.exec(message);
    if (position !== null) {
        return countLines(text, 0, Number(position[1])) + 1;
    }
    if (!/^Unexpected token/.test(message) || text.length > SYNTAX_SEARCH_LIMIT) {
        // ponytail: an unexpected end (or a huge text) is placed on the last line
        return countLines(text, 0, text.length) + 1;
    }
    // the shortest prefix that holds the offending token: shorter prefixes end early instead
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        let failsOnToken = false;
        try {
            JSON.parse(text.slice(0, mid + 1));
        } catch (err) {
            failsOnToken = err instanceof Error && /^Unexpected token/.test(err.message);
        }
        if (failsOnToken) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    return countLines(text, 0, lo) + 1;
}

/**
 * The E_SYNTAX message: the parser's, with a hint when the text is JSON Lines (one document per
 * line, as apoc.export.json and many loggers write), which this importer does not read.
 * @param text - the document
 * @param message - the parser's message
 * @returns the message
 */
function syntaxMessage(text: string, message: string): string {
    if (looksLikeJsonLines(text)) {
        return `invalid JSON: the input is JSON Lines (one JSON value per line), which is not a graph format graph-io reads; convert it to one JSON document (${message})`;
    }
    return `invalid JSON: ${message}`;
}

/** How many of the integers kept as text the warning lists. */
const BIG_INTEGERS_SHOWN = 10;

/**
 * The dialect to read: the forced one, else the shape rule of sniffJsonDialect(); a document
 * that matches no dialect is a fatal E_JSON_DIALECT.
 * @param root - the parsed document
 * @param forced - the caller's dialect option
 * @param report - the report the failure is recorded in
 * @returns the dialect
 */
function detectDialect(
    root: unknown,
    forced: JsonImportDialect | "auto",
    report: ImportReportBuilder,
): JsonImportDialect {
    if (forced !== "auto") {
        return forced;
    }
    const dialect = sniffJsonDialect(root);
    if (dialect !== null) {
        return dialect;
    }
    if (Array.isArray(root)) {
        return report.fail(
            JSON_ISSUE.DIALECT,
            "a top-level array is only read as Cytoscape elements (objects with a data record)",
        );
    }
    if (!isJsonObject(root)) {
        return report.fail(JSON_ISSUE.DIALECT, `the document is a JSON ${describe(root)}, not a graph object`);
    }
    return report.fail(
        JSON_ISSUE.DIALECT,
        "no known dialect: expected nodes / links / edges (node-link), nodes / adjacency (adjacency), children (tree), elements (Cytoscape) or graph (JGF)",
    );
}

/**
 * A section that must be an array: fail when it is something else.
 * @param value - the section
 * @param what - its name
 * @param report - the report
 * @returns the array, or null when absent
 */
function arraySection(value: unknown, what: string, report: ImportReportBuilder): readonly unknown[] | null {
    if (value === undefined || value === null) {
        return null;
    }
    if (!Array.isArray(value)) {
        return report.fail(JSON_ISSUE.SHAPE, `${what} must be an array, found ${describe(value)}`, { element: what });
    }
    return value;
}

/**
 * A boolean flag with a default and a warning when it has another type.
 * @param value - the flag value
 * @param what - its name
 * @param fallback - the default
 * @param report - the report
 * @returns the flag
 */
function flagOf(value: unknown, what: string, fallback: boolean, report: ImportReportBuilder): boolean {
    if (value === undefined || value === null) {
        return fallback;
    }
    if (typeof value === "boolean") {
        return value;
    }
    report.warning(
        "validation-error",
        JSON_ISSUE.BAD_FLAG,
        `${what} is ${describe(value)}, not a boolean; ${fallback} assumed`,
        { element: what },
    );
    return fallback;
}

/**
 * The endpoint key and value of an edge record: the explicit key when given, else the first of the
 * default keys the record has (a null value counts as absent).
 * @param record - the edge record
 * @param explicit - the caller's key, or null
 * @param defaults - the default keys
 * @returns the key used (null when none) and its value
 */
function endpointOf(
    record: JsonRecord,
    explicit: string | null,
    defaults: readonly string[],
): { readonly key: string | null; readonly value: unknown } {
    if (explicit !== null) {
        return { key: present(record, explicit) ? explicit : null, value: record[explicit] };
    }
    for (const key of defaults) {
        if (present(record, key)) {
            return { key, value: record[key] };
        }
    }
    return { key: null, value: undefined };
}

/**
 * Whether a record has a key with a value other than null: a null endpoint is an absent one.
 * @param record - the record
 * @param key - the key
 * @returns true when the key holds a non-null value
 */
function present(record: JsonRecord, key: string): boolean {
    return hasKey(record, key) && record[key] !== null;
}

/**
 * Report every key of a record the dialect does not read (W_JSON_UNREAD_KEY): it is dropped.
 * @param ctx - the context
 * @param record - the document or graph record
 * @param known - the keys the dialect reads
 * @param prefix - the record's path for the messages (`""` for the document, `"graph."`)
 */
function reportUnreadKeys(ctx: ImportContext, record: JsonRecord, known: ReadonlySet<string>, prefix: string): void {
    for (const key of Object.keys(record)) {
        if (known.has(key)) {
            continue;
        }
        const value = record[key];
        const what = Array.isArray(value)
            ? `${String(value.length)} ${value.length === 1 ? "entry" : "entries"}`
            : describe(value);
        ctx.report.warning(
            "unsupported",
            JSON_ISSUE.UNREAD_KEY,
            `${prefix.length === 0 ? "top-level key" : "key"} ${prefix}${key} (${what}) is not read; dropped`,
            { element: `${prefix}${key}` },
        );
    }
}

/** The keys of a vis.js document the reader reads. */
const VIS_DOCUMENT_KEYS: ReadonlySet<string> = new Set(["nodes", "edges"]);

/** The keys of a graphology serialization the reader reads. */
const GRAPHOLOGY_DOCUMENT_KEYS: ReadonlySet<string> = new Set(["nodes", "edges", "options", "attributes"]);

/** The keys of a JGF graph object the reader reads. */
const JGF_GRAPH_KEYS: ReadonlySet<string> = new Set([
    "id",
    "type",
    "label",
    "directed",
    "metadata",
    "nodes",
    "edges",
    "hyperedges",
]);

/**
 * Whether any object of an array has a key with a non-null value.
 * @param items - the array
 * @param key - the key
 * @returns true when some element carries the field
 */
function anyHas(items: readonly unknown[], key: string): boolean {
    return items.some((item) => isJsonObject(item) && item[key] !== undefined && item[key] !== null);
}

/**
 * Whether a value is a non-negative integer below a bound.
 * @param value - the value
 * @param bound - the exclusive bound
 * @returns true for an index
 */
function isIndexBelow(value: unknown, bound: number): boolean {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < bound;
}

// ============================================================ node-link / d3

/**
 * Read a node-link or d3 document.
 * @param ctx - the context
 * @param root - the document
 * @param dialect - "node-link" or "d3"
 */
function importNodeLink(ctx: ImportContext, root: JsonRecord, dialect: "node-link" | "d3"): void {
    const { report, json } = ctx;
    let { edgesKey } = json;
    if (edgesKey === null) {
        edgesKey = hasKey(root, "edges") || !hasKey(root, "links") ? "edges" : "links";
    }
    const nodes = arraySection(root.nodes, "nodes", report);
    const edges = arraySection(root[edgesKey], edgesKey, report);
    if (nodes === null) {
        report.warning(
            "missing-value",
            JSON_ISSUE.MISSING_SECTION,
            "the document has no nodes array; nodes come from the edges",
            { element: "nodes" },
        );
        ctx.nodesFromEdges = true;
    }
    if (edges === null) {
        report.warning(
            "missing-value",
            JSON_ISSUE.MISSING_SECTION,
            `the document has no ${edgesKey} array; the graph has no edges`,
            { element: edgesKey },
        );
    }
    const directed = flagOf(root.directed, "directed", ctx.defaultDirected(dialect), report);
    const multigraph = hasKey(root, "multigraph") ? flagOf(root.multigraph, "multigraph", false, report) : null;
    ctx.setHeader(directed);
    ctx.writeGraphDict(root.graph, "graph");
    reportUnreadKeys(ctx, root, new Set(["nodes", edgesKey, "directed", "multigraph", "graph"]), "");

    const nodeList = nodes ?? [];
    const edgeList = edges ?? [];
    ctx.sink.reserve(nodeList.length, edgeList.length);

    // the id key: the caller's, else "id" when any node has it, else "name" (d3); nodes without any
    // id key are positional (nodeIdFrom "index", or a d3 v3 file whose nodes carry no id at all)
    let { nodeIdKey } = json;
    let positional = ctx.options.nodeIdFrom === "index";
    if (!positional && nodeIdKey === null) {
        const candidates = ctx.options.nodeIdFrom === "label" ? ["label", "name", "id"] : ["id", "name"];
        nodeIdKey = candidates.find((key) => anyHas(nodeList, key)) ?? null;
        if (ctx.options.nodeIdFrom === "label" && (nodeIdKey === "id" || nodeIdKey === "name")) {
            report.warning(
                "unsupported",
                JSON_ISSUE.OPTION_IGNORED,
                nodeIdKey === "id"
                    ? 'nodeIdFrom "label": no node has a label or name key; ids are read from "id"'
                    : 'nodeIdFrom "label": no node has a "label" key; ids are read from "name"',
                { element: "nodeIdFrom" },
            );
        }
        if (nodeIdKey === null) {
            if (nodeList.length > 0) {
                positional = true;
                report.warning(
                    "missing-value",
                    JSON_ISSUE.POSITIONAL_NODES,
                    "no node has an id or name key; array positions are the node ids",
                    { element: "nodes" },
                );
            } else {
                nodeIdKey = "id";
            }
        }
    }
    if (positional) {
        nodeIdKey = null;
    }
    let indexLinks: boolean;
    if (positional) {
        indexLinks = true;
    } else if (json.indexLinks === "auto") {
        indexLinks = nodeIdKey !== null && looksIndexLinked(nodeList, edgeList, nodeIdKey, json);
    } else {
        ({ indexLinks } = json);
    }
    const positionIds: (NodeId | null)[] | null = indexLinks ? [] : null;
    if (indexLinks && !positional && json.indexLinks === "auto" && nodeIdKey !== null) {
        reportAmbiguousIndexLinks(ctx, nodeList, edgeList, nodeIdKey);
    }

    for (let i = 0; i < nodeList.length; i++) {
        const element = `nodes[${i}]`;
        const record = nodeList[i];
        let pushed: NodeId | null = null;
        if (!isJsonObject(record)) {
            ctx.badElement("node", element);
        } else {
            let id: NodeId | null;
            if (nodeIdKey === null) {
                id = i;
            } else {
                id = ctx.coerceId(hasKey(record, nodeIdKey) ? record[nodeIdKey] : undefined, element);
            }
            if (id === null) {
                ctx.countSkipped("node");
            } else {
                const index = ctx.pushNode(id, element);
                if (index >= 0) {
                    pushed = id;
                    writeFlat(ctx.nodes, index, record, id, (key) => key !== nodeIdKey);
                }
            }
        }
        positionIds?.push(pushed);
    }
    throwIfAborted(ctx.options.signal);
    const endpointKeys = importNodeLinkEdges(ctx, edgeList, edgesKey, positionIds, multigraph);
    ctx.setMeta(
        {
            dialect,
            edgesKey,
            nodeIdKey,
            indexLinks,
            sourceKey: endpointKeys.source ?? undefined,
            targetKey: endpointKeys.target ?? undefined,
        },
        { declaredMultigraph: multigraph, ...ctx.weightOriginPatch() },
    );
}

/**
 * Read the node-link / d3 edge records: endpoints by id or array position, the weight, the other
 * keys as attributes.
 * @param ctx - the context
 * @param edgeList - the edge records
 * @param edgesKey - the top-level key they came from, for issues
 * @param positionIds - the ids by array position under index links, or null
 * @param multigraph - the declared multigraph flag, or null when the document has none
 * @returns the source and target keys the first well-formed edge used (null when none did)
 */
function importNodeLinkEdges(
    ctx: ImportContext,
    edgeList: readonly unknown[],
    edgesKey: string,
    positionIds: readonly (NodeId | null)[] | null,
    multigraph: boolean | null,
): { source: string | null; target: string | null } {
    const { json } = ctx;
    const kind = ctx.uniformKind();
    let sourceKey: string | null = null;
    let targetKey: string | null = null;
    // multigraph false: the pairs seen, to report parallel links; true: the (pair, key) triples, since
    // NetworkX reads a repeated (u, v, key) as one edge
    // ponytail: one string per edge whenever the flag is declared; a hash of the index pair if it shows in profiles
    const pairs = multigraph === null ? null : new Set<string>();
    let parallels = 0;
    for (let i = 0; i < edgeList.length; i++) {
        const element = `${edgesKey}[${i}]`;
        const record = edgeList[i];
        if (!isJsonObject(record)) {
            ctx.badElement("edge", element);
            continue;
        }
        const source = endpointOf(record, json.sourceKey, NODE_LINK_SOURCE_KEYS);
        const target = endpointOf(record, json.targetKey, NODE_LINK_TARGET_KEYS);
        if (source.key === null || target.key === null) {
            ctx.missingEndpoint(element, source.key === null ? "source" : "target");
            continue;
        }
        sourceKey ??= source.key;
        targetKey ??= target.key;
        try {
            const u = resolveEndpoint(ctx, source.value, positionIds, element, "source");
            const v = resolveEndpoint(ctx, target.value, positionIds, element, "target");
            if (u === null || v === null) {
                ctx.countSkipped("edge");
                continue;
            }
            const weight = ctx.weightOf(record);
            if (pairs !== null) {
                const pair = pairKey(u, v, kind === "directed");
                if (multigraph === false) {
                    parallels += pairs.has(pair) ? 1 : 0;
                    pairs.add(pair);
                } else if (hasKey(record, "key")) {
                    const triple = `${pair} ${JSON.stringify(record.key)}`;
                    if (pairs.has(triple)) {
                        throw new GraphFormatError(
                            JSON_ISSUE.DUPLICATE_EDGE_ID,
                            `${element}: key ${JSON.stringify(record.key)} is repeated for the same pair; NetworkX reads it as the same edge, so it is skipped`,
                            { id: String(record.key) },
                        );
                    }
                    pairs.add(triple);
                }
            }
            const edge = ctx.pushEdge(u, v, kind, weight, element);
            const { weightFrom } = ctx.options;
            for (const key of Object.keys(record)) {
                if (key !== source.key && key !== target.key && key !== weightFrom) {
                    ctx.edges.write(edge, key, record[key], SUFFIX.data, element);
                }
            }
        } catch (err) {
            ctx.skip(err, "edge", element);
        }
    }
    if (parallels > 0) {
        ctx.report.warning(
            "validation-error",
            JSON_ISSUE.INCONSISTENT,
            `the document declares multigraph false, but ${parallels} link${plural(parallels)} ${agree(parallels, "repeats", "repeat")} the endpoints of an earlier one; all are kept`,
            { element: edgesKey },
        );
    }
    return { source: sourceKey, target: targetKey };
}

/**
 * The key of an endpoint pair: ordered for a directed edge, unordered for an undirected one.
 * @param u - the source
 * @param v - the target
 * @param directed - whether the order matters
 * @returns the key
 */
function pairKey(u: NodeId, v: NodeId, directed: boolean): string {
    const a = JSON.stringify(u);
    const b = JSON.stringify(v);
    return directed || a <= b ? `${a} ${b}` : `${b} ${a}`;
}

/**
 * Warn when indexLinks "auto" read integer endpoints as array positions although some also equal
 * a node id's text (`"2"`): the file may mean the ids, and the edges are then off by the positions.
 * @param ctx - the context
 * @param nodes - the node records
 * @param edges - the edge records
 * @param nodeIdKey - the node id key
 */
function reportAmbiguousIndexLinks(
    ctx: ImportContext,
    nodes: readonly unknown[],
    edges: readonly unknown[],
    nodeIdKey: string,
): void {
    const ids = new Set<string>();
    for (const node of nodes) {
        if (isJsonObject(node) && typeof node[nodeIdKey] === "string") {
            ids.add(node[nodeIdKey]);
        }
    }
    for (const edge of edges) {
        if (!isJsonObject(edge)) {
            continue;
        }
        for (const value of [
            endpointOf(edge, ctx.json.sourceKey, NODE_LINK_SOURCE_KEYS).value,
            endpointOf(edge, ctx.json.targetKey, NODE_LINK_TARGET_KEYS).value,
        ]) {
            if (typeof value === "number" && ids.has(String(value))) {
                ctx.report.warning(
                    "coercion",
                    JSON_ISSUE.INDEX_LINKS,
                    `integer endpoints are read as array positions, but ${value} is also a node id; pass indexLinks: false to read the endpoints as ids`,
                    { element: "indexLinks" },
                );
                return;
            }
        }
    }
}

/**
 * Write the flat attributes of a node record (every own key the filter keeps).
 * @param writer - the node writer
 * @param index - the node index
 * @param record - the record
 * @param id - the node id, for issues
 * @param keep - which keys are attributes
 */
function writeFlat(
    writer: AttributeWriter,
    index: number,
    record: JsonRecord,
    id: NodeId,
    keep: (key: string) => boolean,
): void {
    for (const key of Object.keys(record)) {
        if (keep(key)) {
            writer.write(index, key, record[key], SUFFIX.data, String(id));
        }
    }
}

/**
 * The d3 index-link heuristic: endpoints are array positions when every endpoint is a number, at
 * least one is a non-negative integer, and no node id is a number (a numeric id would make the endpoints ids;
 * research note 07: d3 links reference nodes by array index and are never coerced to ids). An
 * index at or beyond the node count is then E_BAD_INDEX, never a new numeric node.
 * @param nodes - the node records
 * @param edges - the edge records
 * @param nodeIdKey - the node id key
 * @param json - the format options (endpoint keys)
 * @returns true when endpoints are indices
 */
function looksIndexLinked(
    nodes: readonly unknown[],
    edges: readonly unknown[],
    nodeIdKey: string,
    json: ResolvedJsonOptions,
): boolean {
    if (edges.length === 0 || nodes.length === 0) {
        return false;
    }
    for (const node of nodes) {
        if (isJsonObject(node) && typeof node[nodeIdKey] === "number") {
            return false;
        }
    }
    let seen = 0;
    for (const edge of edges) {
        if (!isJsonObject(edge)) {
            continue;
        }
        const s = endpointOf(edge, json.sourceKey, NODE_LINK_SOURCE_KEYS).value;
        const t = endpointOf(edge, json.targetKey, NODE_LINK_TARGET_KEYS).value;
        // a fractional or negative number is a bad index (E_BAD_INDEX), never a reason to read every
        // other endpoint as an id; a missing endpoint is reported on its own
        if ((s !== undefined && typeof s !== "number") || (t !== undefined && typeof t !== "number")) {
            return false;
        }
        if (isIndexBelow(s, Infinity) || isIndexBelow(t, Infinity)) {
            seen++;
        }
    }
    return seen > 0;
}

/**
 * Resolve one endpoint: a node id through the coercion rule, or an array position through the
 * ids pushed so far under index links.
 * @param ctx - the context
 * @param raw - the endpoint value
 * @param positionIds - the ids by array position under index links, or null
 * @param element - the edge element name
 * @param field - "source" or "target"
 * @returns the id, or null when reported
 */
function resolveEndpoint(
    ctx: ImportContext,
    raw: unknown,
    positionIds: readonly (NodeId | null)[] | null,
    element: string,
    field: string,
): NodeId | null {
    if (positionIds === null) {
        return ctx.coerceId(raw, `${element}.${field}`);
    }
    if (!isIndexBelow(raw, positionIds.length)) {
        ctx.report.error(
            "validation-error",
            JSON_ISSUE.BAD_INDEX,
            `${element}: ${field} ${describe(raw)} is not a node index below ${positionIds.length}`,
            { element },
        );
        return null;
    }
    const id = positionIds[raw as number];
    if (id === null) {
        ctx.report.error("missing-value", JSON_ISSUE.BAD_INDEX, `${element}: ${field} names a node that was skipped`, {
            element,
        });
    }
    return id;
}

// ============================================================ vis.js

/**
 * Read a vis.js document: `nodes` with `id`, `edges` with `from` / `to` and an optional `id`.
 * @param ctx - the context
 * @param root - the document
 */
function importVis(ctx: ImportContext, root: JsonRecord): void {
    const { report, json } = ctx;
    const nodes = arraySection(root.nodes, "nodes", report) ?? [];
    const edges = arraySection(root.edges, "edges", report) ?? [];
    // vis.js options and groups are rendering settings, not graph data
    reportUnreadKeys(ctx, root, VIS_DOCUMENT_KEYS, "");
    ctx.setHeader(ctx.defaultDirected("vis"));
    ctx.sink.reserve(nodes.length, edges.length);
    const nodeIdKey = json.nodeIdKey ?? "id";
    ctx.reportNodeIdFrom("vis", `the ${JSON.stringify(nodeIdKey)} key`);
    for (let i = 0; i < nodes.length; i++) {
        const element = `nodes[${i}]`;
        const record = nodes[i];
        if (!isJsonObject(record)) {
            ctx.badElement("node", element);
            continue;
        }
        const id = ctx.coerceId(hasKey(record, nodeIdKey) ? record[nodeIdKey] : undefined, element);
        if (id === null) {
            ctx.countSkipped("node");
            continue;
        }
        const index = ctx.pushNode(id, element);
        if (index >= 0) {
            writeFlat(ctx.nodes, index, record, id, (key) => key !== nodeIdKey);
        }
    }
    throwIfAborted(ctx.options.signal);
    const ids = ctx.declareEdgeIds(edges, (edge) => edge.id, "id", true);
    const kind = ctx.uniformKind();
    let sourceKey: string | null = null;
    let targetKey: string | null = null;
    for (let i = 0; i < edges.length; i++) {
        const element = `edges[${i}]`;
        const record = edges[i];
        if (!isJsonObject(record)) {
            ctx.badElement("edge", element);
            continue;
        }
        const source = endpointOf(record, json.sourceKey, VIS_SOURCE_KEYS);
        const target = endpointOf(record, json.targetKey, VIS_TARGET_KEYS);
        if (source.key === null || target.key === null) {
            ctx.missingEndpoint(element, source.key === null ? "from" : "to");
            continue;
        }
        sourceKey ??= source.key;
        targetKey ??= target.key;
        try {
            const u = ctx.coerceId(source.value, `${element}.from`);
            const v = ctx.coerceId(target.value, `${element}.to`);
            if (u === null || v === null) {
                ctx.countSkipped("edge");
                continue;
            }
            const idValue = ctx.edgeIdValue(ids, record.id);
            const edge = ctx.pushEdge(u, v, kind, ctx.weightOf(record), element);
            ctx.setEdgeId(ids, edge, idValue);
            const { weightFrom } = ctx.options;
            for (const key of Object.keys(record)) {
                if (key !== source.key && key !== target.key && key !== "id" && key !== weightFrom) {
                    ctx.edges.write(edge, key, record[key], SUFFIX.data, element);
                }
            }
        } catch (err) {
            ctx.skip(err, "edge", element);
        }
    }
    // vis.js draws arrows from the `arrows` edge option; the file declares no graph direction, so the
    // arrows stay an attribute and the graph is read as the dialect's default
    const arrows =
        kind === "undirected"
            ? edges.filter((e) => isJsonObject(e) && e.arrows !== undefined && e.arrows !== null && e.arrows !== "")
                  .length
            : 0;
    if (arrows > 0) {
        report.warning(
            "validation-error",
            JSON_ISSUE.INCONSISTENT,
            `${arrows} edge${plural(arrows)} ${agree(arrows, "carries", "carry")} vis.js arrows but the graph is read undirected; the arrows are kept as an attribute (pass defaultDirected: true to read the edges as directed)`,
            { element: "arrows" },
        );
    }
    ctx.setMeta(
        { dialect: "vis", nodeIdKey, sourceKey: sourceKey ?? undefined, targetKey: targetKey ?? undefined },
        ctx.weightOriginPatch(),
    );
}

// ============================================================ NetworkX adjacency_data / tree_data

/**
 * Read a NetworkX adjacency_data document: `nodes` as in node-link, and `adjacency[i]` the
 * neighbor list of `nodes[i]`, one `{ id, key?, ...attributes }` entry per edge. An undirected
 * file lists every edge from both ends, so an entry whose mirror (the same pair and `key`) was
 * already read is that edge again and is not pushed twice; a self-loop is listed once.
 * @param ctx - the context
 * @param root - the document
 */
function importAdjacency(ctx: ImportContext, root: JsonRecord): void {
    const { report } = ctx;
    const nodes = arraySection(root.nodes, "nodes", report) ?? [];
    const adjacency = arraySection(root.adjacency, "adjacency", report);
    if (adjacency === null) {
        report.warning(
            "missing-value",
            JSON_ISSUE.MISSING_SECTION,
            "the document has no adjacency array; the graph has no edges",
            {
                element: "adjacency",
            },
        );
    }
    const directed = flagOf(root.directed, "directed", ctx.defaultDirected("adjacency"), report);
    const multigraph = hasKey(root, "multigraph") ? flagOf(root.multigraph, "multigraph", false, report) : null;
    ctx.setHeader(directed);
    // adjacency_data writes the graph dict as a list of [key, value] pairs
    ctx.writeGraphDict(isPairList(root.graph) ? Object.fromEntries(root.graph) : root.graph, "graph");
    for (const key of Object.keys(root)) {
        if (key !== "nodes" && key !== "adjacency" && key !== "directed" && key !== "multigraph" && key !== "graph") {
            report.warning(
                "unsupported",
                JSON_ISSUE.UNREAD_KEY,
                `top-level key ${key} (${describe(root[key])}) is not read; dropped`,
                {
                    element: key,
                },
            );
        }
    }
    const lists = adjacency ?? [];
    ctx.sink.reserve(
        nodes.length,
        lists.reduce<number>((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0),
    );
    const idKey = ctx.json.nodeIdKey ?? "id";
    ctx.reportNodeIdFrom("adjacency", `the ${JSON.stringify(idKey)} key`);
    const owners: (NodeId | null)[] = [];
    for (let i = 0; i < nodes.length; i++) {
        const element = `nodes[${i}]`;
        const record = nodes[i];
        let pushed: NodeId | null = null;
        if (!isJsonObject(record)) {
            ctx.badElement("node", element);
        } else {
            const id = ctx.coerceId(hasKey(record, idKey) ? record[idKey] : undefined, element);
            if (id === null) {
                ctx.countSkipped("node");
            } else {
                const index = ctx.pushNode(id, element);
                if (index >= 0) {
                    pushed = id;
                    writeFlat(ctx.nodes, index, record, id, (key) => key !== idKey);
                }
            }
        }
        owners.push(pushed);
    }
    throwIfAborted(ctx.options.signal);
    const kind = ctx.uniformKind();
    const { weightFrom } = ctx.options;
    // undirected: entries read once whose mirror is still to come, by pair and key, with their attributes
    const pending = new Map<string, string[]>();
    let disagreeing = 0;
    for (let i = 0; i < lists.length; i++) {
        const element = `adjacency[${i}]`;
        const list = lists[i];
        if (!Array.isArray(list)) {
            report.error("validation-error", JSON_ISSUE.BAD_ELEMENT, `${element} is not an array`, { element });
            continue;
        }
        const source = i < owners.length ? owners[i] : null;
        if (source === null) {
            const why = i < nodes.length ? `nodes[${i}] was skipped` : `there is no nodes[${i}]`;
            report.error(
                "missing-value",
                JSON_ISSUE.BAD_INDEX,
                `${element}: ${why}; its ${list.length} edge${plural(list.length)} ${agree(list.length, "is", "are")} skipped`,
                {
                    element,
                },
            );
            report.counts.skippedEdges += list.length;
            continue;
        }
        for (let j = 0; j < list.length; j++) {
            const entry = `${element}[${j}]`;
            const record = list[j];
            if (!isJsonObject(record)) {
                ctx.badElement("edge", entry);
                continue;
            }
            if (!hasKey(record, idKey)) {
                ctx.missingEndpoint(entry, idKey);
                continue;
            }
            try {
                const target = ctx.coerceId(record[idKey], `${entry}.${idKey}`);
                if (target === null) {
                    ctx.countSkipped("edge");
                    continue;
                }
                if (!directed) {
                    const mirror = mirroredEntry(pending, source, target, record, idKey);
                    disagreeing += mirror === "disagrees" ? 1 : 0;
                    if (mirror !== "new") {
                        continue;
                    }
                }
                const edge = ctx.pushEdge(source, target, kind, ctx.weightOf(record), entry);
                for (const key of Object.keys(record)) {
                    if (key !== idKey && key !== weightFrom) {
                        ctx.edges.write(edge, key, record[key], SUFFIX.data, element);
                    }
                }
            } catch (err) {
                ctx.skip(err, "edge", entry);
            }
        }
    }
    reportAdjacencyShape(ctx, nodes.length, adjacency === null ? null : lists.length, disagreeing, pending);
    ctx.setMeta({}, { declaredMultigraph: multigraph, ...ctx.weightOriginPatch() });
}

/**
 * Report what an adjacency_data document leaves inconsistent: nodes without an adjacency list
 * (NetworkX writes one per node, so the file was cut), undirected edges whose two listings carry
 * different attributes (the first is kept), and undirected entries whose mirror never came.
 * @param ctx - the context
 * @param nodes - the number of node records
 * @param lists - the number of adjacency lists, or null when the section is missing (reported already)
 * @param disagreeing - the mirrors whose attributes differ
 * @param pending - the entries still awaiting their mirror
 */
function reportAdjacencyShape(
    ctx: ImportContext,
    nodes: number,
    lists: number | null,
    disagreeing: number,
    pending: ReadonlyMap<string, readonly string[]>,
): void {
    const { report } = ctx;
    if (lists !== null && lists < nodes) {
        report.warning(
            "missing-value",
            JSON_ISSUE.MISSING_SECTION,
            `${nodes - lists} node${plural(nodes - lists)} from nodes[${lists}] on ${agree(nodes - lists, "has", "have")} no adjacency list (NetworkX writes one per node); their edges listed elsewhere are kept`,
            { element: "adjacency" },
        );
    }
    if (disagreeing > 0) {
        report.warning(
            "validation-error",
            JSON_ISSUE.INCONSISTENT,
            `the two listings of ${disagreeing} undirected edge${plural(disagreeing)} ${agree(disagreeing, "disagrees", "disagree")} on their attributes; the first listing is kept`,
            { element: "adjacency" },
        );
    }
    let unmatched = 0;
    for (const waiting of pending.values()) {
        unmatched += waiting.length;
    }
    if (unmatched > 0) {
        report.warning(
            "validation-error",
            JSON_ISSUE.INCONSISTENT,
            `${unmatched} undirected adjacency entr(ies) have no mirror in the other node's list; each is read as one edge`,
            { element: "adjacency" },
        );
    }
}

/**
 * A JSON.stringify replacer that writes every object's keys in sorted order.
 * @param _key - the key
 * @param value - the value
 * @returns the value, an object with its keys sorted
 */
function sortedKeys(_key: string, value: unknown): unknown {
    return isJsonObject(value) ? Object.fromEntries(Object.entries(value).sort(([x], [y]) => (x < y ? -1 : 1))) : value;
}

/**
 * Whether an undirected adjacency entry is the mirror of one already read (the same unordered pair
 * and key), consuming it; otherwise the entry is remembered as awaiting its mirror. A self-loop is
 * listed once and never awaits one.
 * @param pending - the entries awaiting their mirror, by owner, other end and key: their attributes
 * @param source - the owner of the list
 * @param target - the entry's node
 * @param record - the entry
 * @param idKey - the entry's id key (not an attribute)
 * @returns "new" for an entry to push, "mirror" for the second listing of one read, "disagrees"
 * for a second listing with other attributes
 */
function mirroredEntry(
    pending: Map<string, string[]>,
    source: NodeId,
    target: NodeId,
    record: JsonRecord,
    idKey: string,
): "new" | "mirror" | "disagrees" {
    const a = JSON.stringify(source);
    const b = JSON.stringify(target);
    if (a === b) {
        return "new";
    }
    const k = JSON.stringify(record.key ?? null);
    // key order is not part of a JSON object, so two listings in another order still agree
    const attributes = JSON.stringify(
        Object.fromEntries(Object.entries(record).filter(([key]) => key !== idKey)),
        sortedKeys,
    );
    // an entry is the mirror of one listed by the other end, never of a parallel entry of its own list
    const waiting = pending.get(`${b} ${a} ${k}`);
    if (waiting !== undefined && waiting.length > 0) {
        const first = waiting.shift();
        return first === attributes ? "mirror" : "disagrees";
    }
    const own = `${a} ${b} ${k}`;
    const list = pending.get(own);
    if (list === undefined) {
        pending.set(own, [attributes]);
    } else {
        list.push(attributes);
    }
    return "new";
}

/**
 * Whether a value is a list of [string, value] pairs, the shape adjacency_data gives the graph dict.
 * @param value - the value
 * @returns true for an array whose items are all two-element arrays with a string first
 */
function isPairList(value: unknown): value is [string, unknown][] {
    return Array.isArray(value) && value.every((p) => Array.isArray(p) && p.length === 2 && typeof p[0] === "string");
}

/**
 * Read a NetworkX tree_data document: a nested record with the node id, its attributes and a
 * `children` array of records of the same shape; every child gets a directed edge from its parent.
 * Walked depth first in document order with an explicit stack. A record without a usable id is
 * reported and skipped, and its children are still read (as roots, without an edge).
 * @param ctx - the context
 * @param root - the root record
 */
function importTree(ctx: ImportContext, root: JsonRecord): void {
    const idKey = ctx.json.nodeIdKey ?? "id";
    ctx.setHeader(ctx.defaultDirected("tree"));
    ctx.reportNodeIdFrom("tree", `the ${JSON.stringify(idKey)} key`);
    const kind = ctx.uniformKind();
    const stack: { record: unknown; element: string; parent: NodeId | null }[] = [
        { record: root, element: "root", parent: null },
    ];
    for (let item = stack.pop(); item !== undefined; item = stack.pop()) {
        const { record, element, parent } = item;
        if (!isJsonObject(record)) {
            ctx.badElement("node", element);
            continue;
        }
        let id = ctx.coerceId(hasKey(record, idKey) ? record[idKey] : undefined, element);
        if (id === null) {
            ctx.countSkipped("node");
        } else if (ctx.pushNode(id, element) < 0) {
            id = null;
        } else {
            writeFlat(ctx.nodes, ctx.sink.indexOf(id), record, id, (key) => key !== idKey && key !== "children");
            if (parent !== null) {
                try {
                    ctx.pushEdge(parent, id, kind, undefined, element);
                } catch (err) {
                    ctx.skip(err, "edge", element);
                }
            }
        }
        const { children } = record;
        if (Array.isArray(children)) {
            for (let k = children.length - 1; k >= 0; k--) {
                stack.push({ record: children[k], element: `${element}.children[${k}]`, parent: id });
            }
        } else if (children !== undefined && children !== null) {
            ctx.report.error(
                "validation-error",
                JSON_ISSUE.BAD_VALUE,
                `${element}: children must be an array, found ${describe(children)}`,
                { element },
            );
        }
    }
    ctx.setMeta({});
}

// ============================================================ graphology

/**
 * Read a graphology serialization: `options.type` decides the header direction ("mixed" or absent:
 * from the edges' `undirected` flags), `options.multi` the declared multigraph flag, node `key`
 * the id, `attributes` the columns, edge `key` the edge id.
 * @param ctx - the context
 * @param root - the document
 */
function importGraphology(ctx: ImportContext, root: JsonRecord): void {
    const { report } = ctx;
    const nodes = arraySection(root.nodes, "nodes", report) ?? [];
    const edges = arraySection(root.edges, "edges", report) ?? [];
    reportUnreadKeys(ctx, root, GRAPHOLOGY_DOCUMENT_KEYS, "");
    const options = isJsonObject(root.options) ? root.options : {};
    if (hasKey(root, "options") && !isJsonObject(root.options)) {
        report.warning("validation-error", JSON_ISSUE.BAD_FLAG, "options is not an object; ignored", {
            element: "options",
        });
    }
    let type: "directed" | "undirected" | "mixed";
    if (options.type === "directed" || options.type === "undirected" || options.type === "mixed") {
        ({ type } = options);
    } else {
        if (options.type !== undefined && options.type !== null) {
            report.warning(
                "validation-error",
                JSON_ISSUE.BAD_FLAG,
                `options.type ${describe(options.type)} is not directed, undirected or mixed; mixed assumed`,
                { element: "options.type" },
            );
        }
        type = "mixed";
    }
    let directed: boolean;
    if (type === "mixed") {
        const objects = edges.filter((edge) => isJsonObject(edge)) as JsonRecord[];
        const undirectedEdges = objects.filter((edge) => edge.undirected === true).length;
        directed = objects.length === 0 ? ctx.defaultDirected("graphology") : undirectedEdges < objects.length;
    } else {
        directed = type === "directed";
    }
    ctx.setHeader(directed);
    const multi = hasKey(options, "multi") ? flagOf(options.multi, "options.multi", false, report) : null;
    const allowSelfLoops = hasKey(options, "allowSelfLoops")
        ? flagOf(options.allowSelfLoops, "options.allowSelfLoops", true, report)
        : undefined;
    ctx.writeGraphDict(root.attributes, "attributes");
    ctx.reportNodeIdFrom("graphology", "the node key");
    ctx.sink.reserve(nodes.length, edges.length);

    for (let i = 0; i < nodes.length; i++) {
        const element = `nodes[${i}]`;
        const record = nodes[i];
        if (!isJsonObject(record)) {
            ctx.badElement("node", element);
            continue;
        }
        const id = ctx.coerceId(hasKey(record, "key") ? record.key : undefined, element);
        if (id === null) {
            ctx.countSkipped("node");
            continue;
        }
        pushNestedNode(ctx, id, record, "attributes", GRAPHOLOGY_NODE_KEYS, element);
    }
    throwIfAborted(ctx.options.signal);

    const ids = ctx.declareEdgeIds(edges, (edge) => edge.key, "key", true);
    // what the edges do against the declared options: graphology itself refuses such a document
    const violations = { selfLoops: 0, parallels: 0, flags: 0 };
    const pairs = multi === false ? new Set<string>() : null;
    for (let i = 0; i < edges.length; i++) {
        const element = `edges[${i}]`;
        const record = edges[i];
        if (!isJsonObject(record)) {
            ctx.badElement("edge", element);
            continue;
        }
        if (!present(record, "source") || !present(record, "target")) {
            ctx.missingEndpoint(element, present(record, "source") ? "target" : "source");
            continue;
        }
        try {
            const u = ctx.coerceId(record.source, `${element}.source`);
            const v = ctx.coerceId(record.target, `${element}.target`);
            if (u === null || v === null) {
                ctx.countSkipped("edge");
                continue;
            }
            let kind: EdgeKind;
            if (type === "mixed") {
                kind = flagOf(record.undirected, `${element}.undirected`, false, report) ? "undirected" : "directed";
            } else {
                kind = type;
                if (typeof record.undirected === "boolean" && record.undirected !== (type === "undirected")) {
                    violations.flags++;
                }
            }
            const { attributes: rawAttributes } = record;
            if (rawAttributes !== undefined && rawAttributes !== null && !isJsonObject(rawAttributes)) {
                report.error(
                    "validation-error",
                    JSON_ISSUE.BAD_VALUE,
                    `${element}: attributes must be an object, found ${describe(rawAttributes)}`,
                    { element },
                );
            }
            const attributes = isJsonObject(rawAttributes) ? rawAttributes : {};
            const idValue = ctx.edgeIdValue(ids, record.key);
            const edge = ctx.pushEdge(u, v, kind, ctx.weightOf(attributes), element);
            ctx.setEdgeId(ids, edge, idValue);
            ctx.writeNested(ctx.edges, edge, record, attributes, GRAPHOLOGY_EDGE_KEYS, ctx.options.weightFrom, element);
            if (allowSelfLoops === false && u === v) {
                violations.selfLoops++;
            }
            if (pairs !== null) {
                const pair = `${kind} ${pairKey(u, v, kind === "directed")}`;
                violations.parallels += pairs.has(pair) ? 1 : 0;
                pairs.add(pair);
            }
        } catch (err) {
            ctx.skip(err, "edge", element);
        }
    }
    reportGraphologyViolations(ctx, violations, type);
    ctx.setMeta({ dialect: "graphology", allowSelfLoops }, { declaredMultigraph: multi, ...ctx.weightOriginPatch() });
}

/**
 * Report the edges that contradict a graphology document's declared options (W_JSON_INCONSISTENT,
 * one warning per kind); they are kept.
 * @param ctx - the context
 * @param violations - the counts
 * @param violations.selfLoops - self-loops under allowSelfLoops false
 * @param violations.parallels - parallel edges under multi false
 * @param violations.flags - per-edge undirected flags against options.type
 * @param type - options.type
 */
function reportGraphologyViolations(
    ctx: ImportContext,
    violations: { readonly selfLoops: number; readonly parallels: number; readonly flags: number },
    type: string,
): void {
    const notes: string[] = [];
    if (violations.selfLoops > 0) {
        notes.push(
            `options.allowSelfLoops is false, but ${violations.selfLoops} self-loop${plural(violations.selfLoops)} ${agree(violations.selfLoops, "is", "are")} listed`,
        );
    }
    if (violations.parallels > 0) {
        notes.push(
            `options.multi is false, but ${violations.parallels} parallel edge${plural(violations.parallels)} ${agree(violations.parallels, "is", "are")} listed`,
        );
    }
    if (violations.flags > 0) {
        notes.push(
            `options.type is ${type}, but ${violations.flags} edge${plural(violations.flags)} ${agree(violations.flags, "carries", "carry")} the other undirected flag; read as ${type}`,
        );
    }
    for (const note of notes) {
        ctx.report.warning("validation-error", JSON_ISSUE.INCONSISTENT, `${note}; every edge is kept`, {
            element: "options",
        });
    }
}

/**
 * Push a node whose attributes live in a nested dict (graphology `attributes`, JGF `metadata`);
 * element-level keys the dialect does not define are kept with the `#element` suffix.
 * @param ctx - the context
 * @param id - the node id
 * @param record - the element record
 * @param dictKey - the key of the nested dict
 * @param structural - the element keys that are not attributes
 * @param element - the element name
 * @returns the node index, or -1 when skipped
 */
function pushNestedNode(
    ctx: ImportContext,
    id: NodeId,
    record: JsonRecord,
    dictKey: string,
    structural: ReadonlySet<string>,
    element: string,
): number {
    const index = ctx.pushNode(id, element);
    if (index < 0) {
        return index;
    }
    try {
        const dict = record[dictKey];
        if (dict !== undefined && dict !== null && !isJsonObject(dict)) {
            ctx.report.error(
                "validation-error",
                JSON_ISSUE.BAD_VALUE,
                `${element}: ${dictKey} must be an object, found ${describe(dict)}`,
                { element },
            );
        }
        ctx.writeNested(ctx.nodes, index, record, isJsonObject(dict) ? dict : {}, structural, null, element);
    } catch (err) {
        ctx.report.recordError(err, { element: String(id) });
    }
    return index;
}

// ============================================================ JSON Graph Format

/**
 * Read a JGF v2 document (`graph` or `graphs[graphIndex]`): nodes keyed by id (or a v1 array with
 * `id`), `label` with role "label", `metadata` as columns, edges with `id` / `relation` /
 * `directed` / `label` / `metadata`, hyperedges per the `hyperedges` option.
 * @param ctx - the context
 * @param root - the document
 */
function importJgf(ctx: ImportContext, root: JsonRecord): void {
    const { report } = ctx;
    const graph = jgfGraphOf(ctx, root);
    const edges = arraySection(graph.edges, "graph.edges", report) ?? [];
    const hyperedges = arraySection(graph.hyperedges, "graph.hyperedges", report) ?? [];
    const nodesRaw: unknown = graph.nodes;
    if (nodesRaw !== undefined && nodesRaw !== null && !isJsonObject(nodesRaw) && !Array.isArray(nodesRaw)) {
        report.fail(
            JSON_ISSUE.SHAPE,
            `graph.nodes must be an object keyed by id or an array, found ${describe(nodesRaw)}`,
        );
    }
    const nodeRecords: readonly unknown[] = Array.isArray(nodesRaw) ? nodesRaw : Object.values(nodesRaw ?? {});

    let directed: boolean;
    if (typeof graph.directed === "boolean") {
        ({ directed } = graph);
    } else if (ctx.explicitDefaultDirected) {
        directed = ctx.options.defaultDirected;
    } else {
        if (graph.directed !== undefined && graph.directed !== null) {
            report.warning(
                "validation-error",
                JSON_ISSUE.BAD_FLAG,
                `graph.directed is ${describe(graph.directed)}, not a boolean`,
                { element: "graph.directed" },
            );
        }
        // the spec default is true; a file whose every edge says directed: false is read as undirected
        const objects = edges.filter((edge) => isJsonObject(edge)) as JsonRecord[];
        directed = objects.length === 0 || !objects.every((edge) => edge.directed === false);
    }
    ctx.setHeader(directed);
    ctx.writeGraphDict(graph.metadata, "graph.metadata");
    const shape: JsonShapeMeta = {
        dialect: "jgf",
        id: typeof graph.id === "string" ? graph.id : undefined,
        type: typeof graph.type === "string" ? graph.type : undefined,
    };
    const label = typeof graph.label === "string" ? graph.label : null;

    ctx.reportNodeIdFrom("jgf", "the node keys");
    ctx.sink.reserve(nodeRecords.length, edges.length);
    const labelColumn = ctx.nodes.declareIf(
        { name: "label", dtype: "string", role: "label", nullable: true },
        anyHas(nodeRecords, "label"),
    );
    if (isJsonObject(nodesRaw)) {
        for (const key of Object.keys(nodesRaw)) {
            const element = `nodes[${JSON.stringify(key)}]`;
            const record = nodesRaw[key];
            if (record !== null && !isJsonObject(record)) {
                ctx.badElement("node", element);
                continue;
            }
            const id = ctx.coerceId(key, element);
            if (id === null) {
                ctx.countSkipped("node");
                continue;
            }
            if (record !== null && hasKey(record, "id") && record.id !== key) {
                report.warning(
                    "validation-error",
                    JSON_ISSUE.INCONSISTENT,
                    `${element}: the inner id ${describe(record.id)} differs from the key; the key is the id, the inner one is kept as id${SUFFIX.element}`,
                    { element },
                );
            }
            pushJgfNode(ctx, id, record ?? {}, labelColumn, element);
        }
    } else {
        for (let i = 0; i < nodeRecords.length; i++) {
            const element = `nodes[${i}]`;
            const record = nodeRecords[i];
            if (!isJsonObject(record)) {
                ctx.badElement("node", element);
                continue;
            }
            const id = ctx.coerceId(hasKey(record, "id") ? record.id : undefined, element);
            if (id === null) {
                ctx.countSkipped("node");
                continue;
            }
            pushJgfNode(ctx, id, record, labelColumn, element);
        }
    }
    throwIfAborted(ctx.options.signal);

    const ids = ctx.declareEdgeIds([...edges, ...hyperedges], (edge) => edge.id, "id", false);
    const relationColumn = ctx.edges.declareIf(
        { name: "relation", dtype: "string", role: "kind", nullable: true },
        anyHas(edges, "relation") || anyHas(hyperedges, "relation"),
    );
    const edgeLabelColumn = ctx.edges.declareIf(
        { name: "label", dtype: "string", role: "label", nullable: true },
        anyHas(edges, "label") || anyHas(hyperedges, "label"),
    );
    const writeJgfEdge = (
        record: JsonRecord,
        u: NodeId,
        v: NodeId,
        kind: EdgeKind,
        element: string,
        structural: ReadonlySet<string> = JGF_EDGE_KEYS,
    ): void => {
        const { metadata } = record;
        const dict = isJsonObject(metadata) ? metadata : {};
        const idValue = ctx.edgeIdValue(ids, record.id);
        const edge = ctx.pushEdge(u, v, kind, ctx.weightOf(dict), element);
        ctx.setEdgeId(ids, edge, idValue);
        ctx.writeStringField(ctx.edges, relationColumn, edge, record.relation, "relation", element);
        ctx.writeStringField(ctx.edges, edgeLabelColumn, edge, record.label, "label", element);
        if (metadata !== undefined && metadata !== null && !isJsonObject(metadata)) {
            report.error("validation-error", JSON_ISSUE.BAD_VALUE, `${element}: metadata must be an object`, {
                element,
            });
        }
        ctx.writeNested(ctx.edges, edge, record, dict, structural, ctx.options.weightFrom, element);
    };

    for (let i = 0; i < edges.length; i++) {
        const element = `edges[${i}]`;
        const record = edges[i];
        if (!isJsonObject(record)) {
            ctx.badElement("edge", element);
            continue;
        }
        if (!present(record, "source") || !present(record, "target")) {
            ctx.missingEndpoint(element, present(record, "source") ? "target" : "source");
            continue;
        }
        try {
            const u = ctx.coerceId(record.source, `${element}.source`);
            const v = ctx.coerceId(record.target, `${element}.target`);
            if (u === null || v === null) {
                ctx.countSkipped("edge");
                continue;
            }
            const edgeDirected = flagOf(record.directed, `${element}.directed`, directed, report);
            writeJgfEdge(record, u, v, edgeDirected ? "directed" : "undirected", element);
        } catch (err) {
            ctx.skip(err, "edge", element);
        }
    }

    importHyperedges(ctx, hyperedges, directed, writeJgfEdge);
    ctx.setMeta(shape, { name: label, ...ctx.weightOriginPatch() });
}

/**
 * The graph object of a JGF document: `graph`, or the graph of `graphs` that graphIndex /
 * graphName choose (chooseGraph()).
 * @param ctx - the context
 * @param root - the document
 * @returns the graph object; the import fails when there is none
 */
function jgfGraphOf(ctx: ImportContext, root: JsonRecord): JsonRecord {
    const single = isJsonObject(root.graph);
    // a document with both graph and graphs is read by its graph; the graphs are not
    reportUnreadKeys(ctx, root, new Set([single ? "graph" : "graphs"]), "");
    const graph = single ? (root.graph as JsonRecord) : chosenGraph(ctx, root, "JGF");
    const prefix = single ? "graph." : `graphs[${(root.graphs as unknown[]).indexOf(graph)}].`;
    reportUnreadKeys(ctx, graph, JGF_GRAPH_KEYS, prefix);
    for (const key of ["id", "type", "label"]) {
        if (graph[key] !== undefined && graph[key] !== null && typeof graph[key] !== "string") {
            ctx.report.error(
                "validation-error",
                JSON_ISSUE.BAD_VALUE,
                `${prefix}${key} must be a string, found ${describe(graph[key])}; ignored`,
                { element: `${prefix}${key}` },
            );
        }
    }
    return graph;
}

/**
 * The graph of a `graphs` array (JGF, OBO Graphs) that graphIndex / graphName choose, with
 * W_MULTIPLE_GRAPHS when the others are skipped; importAll() reads graphs[graphIndex].
 * @param ctx - the context
 * @param root - the document
 * @param what - the dialect's name, for the messages
 * @returns the graph object; the import fails when there is none
 * @category Plugin helpers
 */
export function chosenGraph(ctx: ImportContext, root: JsonRecord, what: string): JsonRecord {
    const { report } = ctx;
    const graphs = arraySection(root.graphs, "graphs", report) ?? [];
    if (graphs.length === 0) {
        report.fail(JSON_ISSUE.SHAPE, `a ${what} document needs a graph object or a non-empty graphs array`);
    }
    const index =
        ctx.json.all === true ? ctx.json.graphIndex : chooseGraph(graphs.map(graphNameOf), ctx.json.choice, report);
    if (graphs.length > 1 && ctx.json.all !== true && !graphChosen(ctx.json.choice)) {
        report.warning(
            "unsupported",
            JSON_ISSUE.MULTIPLE_GRAPHS,
            `the document holds ${graphs.length} graphs; only graphs[${index}] is read (${graphs.length - 1} skipped); importAllGraphs() reads every one`,
            { element: "graphs" },
        );
    }
    const graph = graphs[index];
    if (!isJsonObject(graph)) {
        if (ctx.json.all !== true) {
            return report.fail(JSON_ISSUE.SHAPE, `graphs[${index}] is not an object`);
        }
        // importAll(): one bad graph is that graph's error, read as empty; the others are still read
        report.error("validation-error", JSON_ISSUE.SHAPE, `graphs[${index}] is not an object; it is read as empty`, {
            element: `graphs[${index}]`,
        });
        return {};
    }
    return graph;
}

/**
 * The name a graph of a `graphs` array is listed and chosen by: its `id`, else its `label` (JGF)
 * or `lbl` (OBO Graphs).
 * @param graph - the graph
 * @returns the name, or null
 */
function graphNameOf(graph: unknown): string | null {
    if (!isJsonObject(graph)) {
        return null;
    }
    for (const key of ["id", "label", "lbl"]) {
        if (typeof graph[key] === "string") {
            return graph[key];
        }
    }
    return null;
}

/**
 * How many elements a nodes or edges section holds: an array's length, an object's key count, 0
 * when absent, null for anything else.
 * @param section - the section
 * @returns the count, or null
 */
function countOf(section: unknown): number | null {
    if (section === undefined || section === null) {
        return 0;
    }
    if (Array.isArray(section)) {
        return section.length;
    }
    return isJsonObject(section) ? Object.keys(section).length : null;
}

/**
 * The graphs of a parsed document, for listGraphs(): each entry of a JGF or OBO Graphs `graphs`
 * array with its name and counts; any other document holds one graph.
 * @param root - the parsed document
 * @param dialect - its dialect
 * @returns the listings
 */
function listingsOf(root: unknown, dialect: JsonImportDialect): GraphListing[] {
    if ((dialect === "jgf" || dialect === "obographs") && isJsonObject(root)) {
        if (Array.isArray(root.graphs) && !isJsonObject(root.graph)) {
            return root.graphs.map((graph: unknown, index) => ({
                index,
                name: graphNameOf(graph),
                nodes: isJsonObject(graph) ? countOf(graph.nodes) : null,
                edges: isJsonObject(graph) ? countOf(graph.edges) : null,
            }));
        }
        if (isJsonObject(root.graph)) {
            const { graph } = root;
            return [{ index: 0, name: graphNameOf(graph), nodes: countOf(graph.nodes), edges: countOf(graph.edges) }];
        }
    }
    return [{ index: 0, name: null, nodes: null, edges: null }];
}

/**
 * Whether a text that is not one JSON document is JSON Lines / NDJSON: its first two non-blank
 * lines are each a JSON object or array.
 * @param text - the document
 * @returns true for JSON Lines
 */
function looksLikeJsonLines(text: string): boolean {
    const lines = text
        .slice(0, 64 * 1024)
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .slice(0, 2);
    return (
        lines.length === 2 &&
        lines.every((line) => {
            try {
                const value: unknown = JSON.parse(line);
                return typeof value === "object" && value !== null;
            } catch {
                return false;
            }
        })
    );
}

/**
 * Push a JGF node: `label` into the declared column, `metadata` as attributes.
 * @param ctx - the context
 * @param id - the node id
 * @param record - the node record
 * @param labelColumn - the label column handle, or INVALID_INDEX
 * @param element - the element name
 */
function pushJgfNode(
    ctx: ImportContext,
    id: NodeId,
    record: JsonRecord,
    labelColumn: ColumnHandle,
    element: string,
): void {
    const index = ctx.pushNode(id, element);
    if (index < 0) {
        return;
    }
    try {
        ctx.writeStringField(ctx.nodes, labelColumn, index, record.label, "label", element);
        const { metadata } = record;
        if (metadata !== undefined && metadata !== null && !isJsonObject(metadata)) {
            ctx.report.error("validation-error", JSON_ISSUE.BAD_VALUE, `${element}: metadata must be an object`, {
                element,
            });
        }
        ctx.writeNested(ctx.nodes, index, record, isJsonObject(metadata) ? metadata : {}, JGF_NODE_KEYS, null, element);
    } catch (err) {
        ctx.report.recordError(err, { element: String(id) });
    }
}

/**
 * JGF hyperedges per the `hyperedges` option: "error" aborts, "skip" (default) records a warning
 * and a loss note, "star" and "clique" expand an undirected `{ nodes }` hyperedge into edges from
 * its first node (star) or between every pair (clique); a directed `{ source, target }` hyperedge
 * becomes every source -> target edge under both policies. Every expanded edge carries the
 * hyperedge's id, relation, label and metadata.
 * @param ctx - the context
 * @param hyperedges - the hyperedge records
 * @param directed - the graph's direction
 * @param push - the edge writer of the JGF reader
 */
function importHyperedges(
    ctx: ImportContext,
    hyperedges: readonly unknown[],
    directed: boolean,
    push: (
        record: JsonRecord,
        u: NodeId,
        v: NodeId,
        kind: EdgeKind,
        element: string,
        structural: ReadonlySet<string>,
    ) => void,
): void {
    if (hyperedges.length === 0) {
        return;
    }
    const { report } = ctx;
    const policy = ctx.options.hyperedges;
    if (policy === "error") {
        report.error(
            "unsupported",
            JSON_ISSUE.HYPEREDGE,
            `${hyperedges.length} hyperedge${plural(hyperedges.length)} (hyperedges: "error")`,
            {
                element: "hyperedges",
            },
        );
        throw report.abort("hyperedges refused", { code: JSON_ISSUE.HYPEREDGE, count: hyperedges.length });
    }
    if (policy === "skip") {
        report.warning(
            "unsupported",
            JSON_ISSUE.HYPEREDGES_SKIPPED,
            `${hyperedges.length} hyperedge${plural(hyperedges.length)} skipped`,
            {
                element: "hyperedges",
            },
        );
        report.loss(
            JSON_ISSUE.HYPEREDGES_SKIPPED,
            `${hyperedges.length} hyperedge${plural(hyperedges.length)} ${agree(hyperedges.length, "was", "were")} not imported`,
            null,
            hyperedges.length,
        );
        return;
    }
    // each expanded edge is pushed on its own, so one the sink refuses is reported and counted
    // while the others stay
    const expand = (
        record: JsonRecord,
        pairs: readonly (readonly [NodeId, NodeId])[],
        kind: EdgeKind,
        element: string,
    ): void => {
        for (const [u, v] of pairs) {
            try {
                push(record, u, v, kind, element, JGF_HYPEREDGE_KEYS);
            } catch (err) {
                ctx.skip(err, "edge", element);
            }
        }
    };
    // the edges expanded so far: the cap is on the whole import, so many hyperedges just under it
    // cannot amplify without bound either
    const budget = { used: 0 };
    for (let i = 0; i < hyperedges.length; i++) {
        const element = `hyperedges[${i}]`;
        const record = hyperedges[i];
        if (!isJsonObject(record)) {
            ctx.badElement("edge", element);
            continue;
        }
        try {
            if (Array.isArray(record.nodes)) {
                const members = distinctMembers(
                    ctx,
                    record.nodes.map((raw) => ctx.requireId(raw, element)),
                    element,
                );
                if (members.length < 2) {
                    throw new GraphFormatError(
                        "E_INVALID_ID",
                        `${element}: an undirected hyperedge needs two or more nodes`,
                        { reason: "hyperedge shape" },
                    );
                }
                const n = members.length;
                checkExpansion(policy === "star" ? n - 1 : (n * (n - 1)) / 2, budget, element);
                const pairs: [NodeId, NodeId][] = [];
                if (policy === "star") {
                    for (let k = 1; k < n; k++) {
                        pairs.push([members[0], members[k]]);
                    }
                } else {
                    for (let a = 0; a < n; a++) {
                        for (let b = a + 1; b < n; b++) {
                            pairs.push([members[a], members[b]]);
                        }
                    }
                }
                expand(record, pairs, directed ? "directed" : "undirected", element);
            } else if (Array.isArray(record.source) && Array.isArray(record.target)) {
                const sources = record.source.map((raw) => ctx.requireId(raw, element));
                const targets = record.target.map((raw) => ctx.requireId(raw, element));
                if (sources.length === 0 || targets.length === 0) {
                    throw new GraphFormatError(
                        "E_INVALID_ID",
                        `${element}: a directed hyperedge needs sources and targets`,
                        { reason: "hyperedge shape" },
                    );
                }
                checkExpansion(sources.length * targets.length, budget, element);
                expand(
                    record,
                    sources.flatMap((s) => targets.map((t) => [s, t] as const)),
                    "directed",
                    element,
                );
            } else {
                report.error(
                    "validation-error",
                    JSON_ISSUE.HYPEREDGE_SHAPE,
                    `${element} has neither a nodes array nor source / target arrays`,
                    { element },
                );
                ctx.countSkipped("edge");
            }
        } catch (err) {
            if (err instanceof ExpansionRefused) {
                // one hyperedge over the cap is skipped; the shared E_TOO_LARGE rule would stop the import
                report.error("unsupported", err.code, err.message, { element });
                ctx.countSkipped("edge");
            } else {
                ctx.skip(err, "edge", element);
            }
        }
    }
}

/** A hyperedge whose expansion would pass MAX_HYPEREDGE_EXPANSION: that hyperedge alone is skipped. */
class ExpansionRefused extends GraphFormatError {}

/** The most edges the hyperedges of one import expand into; a 20k-member clique would be 200M edges. */
// ponytail: a fixed cap; make it an option if a real file needs more
const MAX_HYPEREDGE_EXPANSION = 1_000_000;

/**
 * Refuse an expansion that would take the import beyond MAX_HYPEREDGE_EXPANSION expanded edges,
 * before any of it is pushed; otherwise count it against the budget.
 * @param count - the number of edges the expansion makes
 * @param budget - the edges the import's hyperedges expanded into so far
 * @param budget.used - that count, updated
 * @param element - the hyperedge's name
 */
function checkExpansion(count: number, budget: { used: number }, element: string): void {
    if (budget.used + count > MAX_HYPEREDGE_EXPANSION) {
        throw new ExpansionRefused(
            "E_TOO_LARGE",
            `${element}: the expansion makes ${count} edges, which with the ${budget.used} already expanded is more than ${MAX_HYPEREDGE_EXPANSION}; the hyperedge is skipped`,
            { count, used: budget.used, limit: MAX_HYPEREDGE_EXPANSION },
        );
    }
    budget.used += count;
}

/**
 * The members of an undirected hyperedge with repeats removed (a repeat would expand into a
 * self-loop and parallel edges), each repeat reported as E_HYPEREDGE_SHAPE.
 * @param ctx - the context
 * @param members - the members as listed
 * @param element - the hyperedge's name
 * @returns the distinct members in first-listed order
 */
function distinctMembers(ctx: ImportContext, members: readonly NodeId[], element: string): NodeId[] {
    const distinct = [...new Set(members)];
    if (distinct.length < members.length) {
        ctx.report.error(
            "validation-error",
            JSON_ISSUE.HYPEREDGE_SHAPE,
            `${element} lists ${members.length - distinct.length} member${plural(members.length - distinct.length)} more than once; each is read once`,
            { element },
        );
    }
    return distinct;
}

// ============================================================ Cytoscape

/**
 * Read Cytoscape.js elements: `elements.nodes` / `elements.edges`, a flat `elements` array (group
 * from `group` or from the presence of source / target), or a top-level array. `data.id` is the id,
 * `data.parent` the parent (resolved after every node is known), `position` the position column,
 * `classes` the classes list; the other `data` keys are attributes and the element-level keys
 * (selected, locked, ...) are columns of the same name.
 * @param ctx - the context
 * @param root - the document
 */
function importCytoscape(ctx: ImportContext, root: unknown): void {
    const { report } = ctx;
    let elements: unknown;
    let extra: Record<string, unknown> | undefined;
    if (Array.isArray(root)) {
        elements = root;
    } else if (isJsonObject(root)) {
        ({ elements } = root);
        ctx.writeGraphDict(root.data, "data");
        const rest: Record<string, unknown> = {};
        for (const key of Object.keys(root)) {
            if (key !== "elements" && key !== "data") {
                rest[key] = root[key];
            }
        }
        if (Object.keys(rest).length > 0) {
            extra = rest;
        }
    } else {
        report.fail(JSON_ISSUE.SHAPE, `a Cytoscape document must be an object or an array, found ${describe(root)}`);
    }
    const { nodes, edges } = cytoscapeSections(ctx, elements);
    ctx.setHeader(ctx.defaultDirected("cytoscape"));
    ctx.reportNodeIdFrom("cytoscape", "data.id");
    ctx.sink.reserve(nodes.length, edges.length);

    const dataHas = (items: readonly unknown[], key: string): boolean =>
        items.some((item) => isJsonObject(item) && isJsonObject(item.data) && item.data[key] !== undefined);
    const positionColumn = ctx.nodes.declareIf(
        {
            name: POSITION_COLUMN,
            dtype: "f32",
            components: 3,
            role: "position",
            mutable: true,
            nullable: true,
            // 3D layouts written by Cytoscape-compatible tools carry a z
            extra: { sourceDims: nodes.some(hasPositionZ) ? 3 : 2, units: "file" },
            origin: { format: "json", namespace: "cytoscape" },
        },
        anyHas(nodes, "position"),
    );
    const classesColumn = ctx.nodes.declareIf(
        { name: CLASSES_COLUMN, dtype: "list", itemDtype: "string", role: "classes", nullable: true },
        anyHas(nodes, "classes"),
    );
    const parentColumn = ctx.nodes.declareIf(
        { name: PARENT_COLUMN, dtype: "u32", role: "parent", refersTo: "node", nullable: true },
        dataHas(nodes, "parent"),
    );
    const edgeClassesColumn = ctx.edges.declareIf(
        { name: CLASSES_COLUMN, dtype: "list", itemDtype: "string", role: "classes", nullable: true },
        anyHas(edges, "classes"),
    );
    const parents: { index: number; parent: NodeId; element: string }[] = [];
    const point: [number, number, number] = [0, 0, 0];

    for (let i = 0; i < nodes.length; i++) {
        const element = `nodes[${i}]`;
        const record = nodes[i];
        if (!isJsonObject(record) || !isJsonObject(record.data)) {
            ctx.badElement("node", element, "an element with a data object");
            continue;
        }
        const { data } = record;
        const id = ctx.coerceId(hasKey(data, "id") ? data.id : undefined, element);
        if (id === null) {
            ctx.countSkipped("node");
            continue;
        }
        const index = ctx.pushNode(id, element);
        if (index < 0) {
            continue;
        }
        if (present(data, "source") && present(data, "target")) {
            report.warning(
                "validation-error",
                JSON_ISSUE.INCONSISTENT,
                `${element} has data.source and data.target, the shape of an edge, but its section or group says node; read as a node`,
                { element },
            );
        }
        try {
            for (const key of Object.keys(data)) {
                if (key === "id") {
                    continue;
                }
                if (key === "parent") {
                    const raw = data.parent;
                    if (raw !== undefined && raw !== null) {
                        const parent = ctx.coerceId(raw, `${element}.data.parent`);
                        if (parent !== null) {
                            parents.push({ index, parent, element });
                        }
                    }
                    continue;
                }
                ctx.nodes.write(index, key, data[key], SUFFIX.data, element);
            }
            const { position } = record;
            if (position !== undefined && position !== null) {
                const z = isJsonObject(position) ? (position.z ?? 0) : 0;
                if (isJsonObject(position) && isCoordinate(position.x) && isCoordinate(position.y) && isCoordinate(z)) {
                    point[0] = position.x;
                    // Cytoscape's y grows downward; positions are stored y-up (the exporter flips back)
                    point[1] = flipY(position.y);
                    point[2] = z;
                    ctx.nodes.set(positionColumn, index, point);
                } else {
                    report.error(
                        "validation-error",
                        JSON_ISSUE.BAD_VALUE,
                        `${element}: position must be an object with numeric x and y (and z) that are finite and within the f32 range`,
                        { element },
                    );
                }
            }
            writeClasses(ctx, ctx.nodes, classesColumn, index, record.classes, element);
            writeElementKeys(ctx.nodes, index, record, element);
        } catch (err) {
            report.recordError(err, { element: String(id) });
        }
    }
    resolveCytoscapeParents(ctx, parents, parentColumn);
    throwIfAborted(ctx.options.signal);

    importCytoscapeEdges(ctx, edges, edgeClassesColumn);
    ctx.setMeta({ dialect: "cytoscape", cytoscape: extra }, ctx.weightOriginPatch());
}

/** One Cytoscape parent link: the parent's index and id, its document order and element name. */
interface ParentLink {
    readonly parent: number;
    readonly id: NodeId;
    readonly order: number;
    readonly element: string;
}

/**
 * Set the parent of each Cytoscape node once every node is known (a parent may come later): an
 * unknown parent is E_UNKNOWN_PARENT, a link that would make a node its own ancestor E_PARENT_CYCLE
 * (Cytoscape.js refuses those too); either link is dropped and the node kept.
 * @param ctx - the context
 * @param parents - the parent links in document order
 * @param parentColumn - the parent column
 */
function resolveCytoscapeParents(
    ctx: ImportContext,
    parents: readonly { readonly index: number; readonly parent: NodeId; readonly element: string }[],
    parentColumn: ColumnHandle,
): void {
    const { report } = ctx;
    // the last link per child (a duplicate node's later parent wins), child -> its link
    const linkOf = new Map<number, ParentLink>();
    for (let order = 0; order < parents.length; order++) {
        const { index, parent, element } = parents[order];
        const parentIndex = ctx.sink.indexOf(parent);
        if (parentIndex === INVALID_INDEX) {
            report.error(
                "missing-value",
                JSON_ISSUE.UNKNOWN_PARENT,
                `${element}: parent ${JSON.stringify(parent)} is not a node`,
                { element },
            );
            continue;
        }
        linkOf.set(index, { parent: parentIndex, id: parent, order, element });
    }
    // one walk per chain, each node visited once: on a cycle the link that came last in the document
    // (the one that closed it) is dropped
    const done = new Set<number>();
    for (const start of linkOf.keys()) {
        const path: number[] = [];
        const onPath = new Set<number>();
        let node: number | undefined = start;
        while (node !== undefined && !done.has(node) && !onPath.has(node)) {
            path.push(node);
            onPath.add(node);
            node = linkOf.get(node)?.parent;
        }
        if (node !== undefined && onPath.has(node)) {
            let closing: [number, ParentLink] | null = null;
            for (const member of path.slice(path.indexOf(node))) {
                const link = linkOf.get(member);
                if (link !== undefined && (closing === null || link.order > closing[1].order)) {
                    closing = [member, link];
                }
            }
            if (closing !== null) {
                const { id, element } = closing[1];
                report.error(
                    "validation-error",
                    JSON_ISSUE.PARENT_CYCLE,
                    `${element}: parent ${JSON.stringify(id)} would make the node its own ancestor; the link is dropped`,
                    { element },
                );
                linkOf.delete(closing[0]);
            }
        }
        for (const member of path) {
            done.add(member);
        }
    }
    for (const [index, { parent }] of linkOf) {
        ctx.nodes.set(parentColumn, index, parent);
    }
}

/**
 * Read the Cytoscape edge elements: `data.id`, `data.source` / `data.target`, the weight, the
 * other data keys as attributes, `classes` and the element-level keys.
 * @param ctx - the context
 * @param edges - the edge elements
 * @param edgeClassesColumn - the edge classes column, or INVALID_INDEX
 */
function importCytoscapeEdges(ctx: ImportContext, edges: readonly unknown[], edgeClassesColumn: ColumnHandle): void {
    const ids = ctx.declareEdgeIds(edges, (edge) => (isJsonObject(edge.data) ? edge.data.id : undefined), "id", true);
    const kind = ctx.uniformKind();
    for (let i = 0; i < edges.length; i++) {
        const element = `edges[${i}]`;
        const record = edges[i];
        if (!isJsonObject(record) || !isJsonObject(record.data)) {
            ctx.badElement("edge", element, "an element with a data object");
            continue;
        }
        const { data } = record;
        if (!present(data, "source") || !present(data, "target")) {
            ctx.missingEndpoint(element, `data.${present(data, "source") ? "target" : "source"}`);
            continue;
        }
        try {
            const u = ctx.coerceId(data.source, `${element}.data.source`);
            const v = ctx.coerceId(data.target, `${element}.data.target`);
            if (u === null || v === null) {
                ctx.countSkipped("edge");
                continue;
            }
            const idValue = ctx.edgeIdValue(ids, data.id);
            const edge = ctx.pushEdge(u, v, kind, ctx.weightOf(data), element);
            ctx.setEdgeId(ids, edge, idValue);
            const { weightFrom } = ctx.options;
            for (const key of Object.keys(data)) {
                if (key !== "id" && key !== "source" && key !== "target" && key !== weightFrom) {
                    ctx.edges.write(edge, key, data[key], SUFFIX.data, element);
                }
            }
            writeClasses(ctx, ctx.edges, edgeClassesColumn, edge, record.classes, element);
            writeElementKeys(ctx.edges, edge, record, element);
        } catch (err) {
            ctx.skip(err, "edge", element);
        }
    }
}

/**
 * The node and edge element arrays of a Cytoscape `elements` value: an object with `nodes` /
 * `edges`, a flat array split by isNodeElement(), or nothing (reported).
 * @param ctx - the context
 * @param elements - the `elements` value
 * @returns the two arrays; the import fails when elements has another type
 */
function cytoscapeSections(
    ctx: ImportContext,
    elements: unknown,
): { readonly nodes: readonly unknown[]; readonly edges: readonly unknown[] } {
    const { report } = ctx;
    if (Array.isArray(elements)) {
        const nodes: unknown[] = [];
        const edges: unknown[] = [];
        elements.forEach((item: unknown, i) => {
            if (isJsonObject(item) && item.group !== undefined && item.group !== "nodes" && item.group !== "edges") {
                report.error(
                    "validation-error",
                    JSON_ISSUE.BAD_VALUE,
                    `elements[${i}]: group ${describe(item.group)} is neither "nodes" nor "edges"; classed by its endpoints`,
                    { element: `elements[${i}]` },
                );
            }
            // a non-object item stays with the nodes, whose reader reports it as E_BAD_ELEMENT
            (isJsonObject(item) && !isNodeElement(item) ? edges : nodes).push(item);
        });
        return { nodes, edges };
    }
    if (isJsonObject(elements)) {
        return {
            nodes: arraySection(elements.nodes, "elements.nodes", report) ?? [],
            edges: arraySection(elements.edges, "elements.edges", report) ?? [],
        };
    }
    if (elements === undefined || elements === null) {
        report.warning("missing-value", JSON_ISSUE.MISSING_SECTION, "the document has no elements", {
            element: "elements",
        });
        return { nodes: [], edges: [] };
    }
    return report.fail(JSON_ISSUE.SHAPE, `elements must be an object or an array, found ${describe(elements)}`);
}

/**
 * Whether a Cytoscape element's position has a numeric z.
 * @param element - the element
 * @returns true when position.z is a number
 */
function hasPositionZ(element: unknown): boolean {
    return isJsonObject(element) && isJsonObject(element.position) && typeof element.position.z === "number";
}

/** The largest finite f32, the bound of a position coordinate. */
const F32_MAX = 3.4028234663852886e38;

/**
 * Whether a value is a coordinate the f32 position column holds: a finite number within the f32 range.
 * @param value - the value
 * @returns true for a storable coordinate
 */
function isCoordinate(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= F32_MAX;
}

/**
 * Whether a flat Cytoscape element is a node: `group: "nodes"`, or no source / target in its data.
 * @param element - the element
 * @returns true for a node
 */
function isNodeElement(element: JsonRecord): boolean {
    if (element.group === "nodes") {
        return true;
    }
    if (element.group === "edges") {
        return false;
    }
    const { data } = element;
    return !(isJsonObject(data) && hasKey(data, "source") && hasKey(data, "target"));
}

/**
 * Write the classes of an element: a space-separated string or an array of strings.
 * @param ctx - the context
 * @param writer - the table writer
 * @param column - the classes column, or INVALID_INDEX when no element has classes
 * @param row - the row
 * @param raw - the `classes` value
 * @param element - the element name
 */
function writeClasses(
    ctx: ImportContext,
    writer: AttributeWriter,
    column: ColumnHandle,
    row: number,
    raw: unknown,
    element: string,
): void {
    if (column === INVALID_INDEX || raw === undefined || raw === null) {
        return;
    }
    let classes: string[];
    if (typeof raw === "string") {
        classes = raw.split(/\s+/).filter((c) => c.length > 0);
    } else if (Array.isArray(raw) && raw.every((c) => typeof c === "string")) {
        classes = raw;
    } else {
        ctx.report.error(
            "validation-error",
            JSON_ISSUE.BAD_VALUE,
            `${element}: classes must be a string or an array of strings`,
            { element },
        );
        return;
    }
    writer.set(column, row, classes);
}

/**
 * Write the element-level keys of a Cytoscape element other than the structural ones: the known
 * keys under their own name, unknown ones with the `#element` suffix.
 * @param writer - the table writer
 * @param row - the row
 * @param record - the element
 * @param element - the element name for issues
 */
function writeElementKeys(writer: AttributeWriter, row: number, record: JsonRecord, element: string): void {
    for (const key of Object.keys(record)) {
        if (CYTOSCAPE_STRUCTURAL_KEYS.has(key)) {
            continue;
        }
        const name = CYTOSCAPE_ELEMENT_KEYS.has(key) ? key : `${key}${SUFFIX.element}`;
        writer.write(row, name, record[key], SUFFIX.data, element);
    }
}

// ============================================================ the plugin

/**
 * The JSON importer plugin.
 * @category Built-in formats
 */
export const jsonImporter: GraphImporter<JsonImportOptions> = Object.freeze({
    format: "json",
    options: Object.freeze([
        "dialect",
        "edgesKey",
        "edgesPath",
        "indexLinks",
        "nodeIdKey",
        "nodesPath",
        "oboIds",
        "sourceKey",
        "targetKey",
        "typedefs",
    ]),
    extensions: Object.freeze([".json"]),
    mimeTypes: Object.freeze(["application/json"]),

    /**
     * Confidence that the head is a JSON graph document: 0 unless it starts with `{` or `[`, 0.5
     * for any JSON, 0.9 when a graph key (nodes, links, edges, elements, graph, graphs) appears in
     * the head.
     * @param head - the first bytes
     * @returns the confidence
     */
    sniff(head: Uint8Array): number {
        // headBytes transcodes a UTF-16 head with a BOM, which import() decodes too
        const text = new TextDecoder("utf-8").decode(headBytes(head).subarray(0, SNIFF_BYTES));
        const trimmed = (text.startsWith(BOM) ? text.slice(1) : text).trimStart();
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
            return 0;
        }
        const score = SNIFF_KEYS.some((key) => trimmed.includes(key)) ? 0.9 : 0.5;
        // a top-level array is a graph only as Cytoscape.js elements (`[{"data": ...}]`): a CX or
        // CX2 document (`[{"metaData": ...}]`, `[{"CXVersion": ...}]`) is another format's
        return trimmed.startsWith("[") && sniffJsonDialectHead(trimmed) !== "cytoscape" ? Math.min(score, 0.3) : score;
    },

    /**
     * Read a JSON graph document into the sink.
     * @param input - the text, bytes or stream
     * @param sink - the sink
     * @param options - format-specific and common options
     * @returns the import report; ImportError on a fatal error or beyond the error limit
     */
    async import(
        input: ImportInput,
        sink: GraphSink,
        options?: JsonImportOptions & CommonImportOptions,
    ): Promise<ImportReport> {
        const resolved = resolveImportOptions(options, FORMAT_DEFAULTS);
        const json = resolveJsonOptions(options);
        const report = new ImportReportBuilder("json", resolved.errorLimit);
        const text = await readText(input, report, { ...resolved, bomlessUtf16: true });
        const { root, dialect } = documentOf(parseDocument(text, report), json, report);
        readGraph(root, dialect, sink, report, resolved, json, options);
        return report.finish();
    },

    /**
     * List the graphs of a JSON document without importing them: each entry of a JGF or OBO
     * Graphs `graphs` array with its name (`id`, else its label) and node and edge counts; any
     * other document holds one graph.
     * @param input - the text, bytes or stream
     * @param options - format-specific and common options
     * @returns one listing per graph
     */
    async listGraphs(
        input: ImportInput,
        options?: JsonImportOptions & CommonImportOptions,
    ): Promise<readonly GraphListing[]> {
        const resolved = resolveImportOptions(options, FORMAT_DEFAULTS);
        const json = resolveJsonOptions(options);
        const report = new ImportReportBuilder("json", resolved.errorLimit);
        const text = await readText(input, report, { ...resolved, bomlessUtf16: true });
        const { root, dialect } = documentOf(parseDocument(text, report), json, report);
        return listingsOf(root, dialect);
    },

    /**
     * Read every graph of a JSON document: each entry of a JGF `graphs` array into its own sink;
     * any other document holds one graph.
     * @param input - the text, bytes or stream
     * @param sinkFor - the sink of the graph with this index, called before its first push
     * @param options - format-specific and common options
     * @returns one report per graph
     */
    async importAll(
        input: ImportInput,
        sinkFor: (index: number) => GraphSink,
        options?: JsonImportOptions & CommonImportOptions,
    ): Promise<ImportReport[]> {
        const resolved = resolveImportOptions(options, FORMAT_DEFAULTS);
        const json = resolveJsonOptions(options);
        const first = new ImportReportBuilder("json", resolved.errorLimit);
        const text = await readText(input, first, { ...resolved, bomlessUtf16: true });
        const { root, dialect } = documentOf(parseDocument(text, first), json, first);
        const graphs = listingsOf(root, dialect).length;
        const reports: ImportReport[] = [];
        for (let i = 0; i < Math.max(graphs, 1); i++) {
            const report = i === 0 ? first : new ImportReportBuilder("json", resolved.errorLimit);
            readGraph(root, dialect, sinkFor(i), report, resolved, { ...json, graphIndex: i, all: true }, options);
            reports.push(report.finish());
        }
        return reports;
    },
});

/**
 * Read one graph of a parsed document into a sink.
 * @param root - the parsed document
 * @param dialect - its dialect
 * @param sink - the sink
 * @param report - the graph's report
 * @param resolved - the resolved common options
 * @param json - the resolved JSON options (graphIndex picks the JGF graph)
 * @param options - the caller's options, for the sink and unused-option checks
 */
function readGraph(
    root: unknown,
    dialect: JsonImportDialect,
    sink: GraphSink,
    report: ImportReportBuilder,
    resolved: ResolvedImportOptions,
    json: ResolvedJsonOptions,
    options: (JsonImportOptions & CommonImportOptions) | undefined,
): void {
    const ctx = new ImportContext(sink, report, resolved, json, options?.defaultDirected !== undefined);
    // the obographs reader refuses missing endpoints itself, so addMissingNodes false holds on any sink
    reportSinkOptions(sink, options, report, dialect === "obographs");
    reportUnusedOptions(options, report, USED_OPTIONS);
    readDialect(ctx, root, dialect);
    ctx.reportDangling();
    ctx.nodes.reportNullOnly();
    ctx.edges.reportNullOnly();
    throwIfAborted(resolved.signal);
}

/**
 * Read one graph with the reader of its dialect.
 * @param ctx - the import context
 * @param root - the parsed document
 * @param dialect - its dialect
 */
function readDialect(ctx: ImportContext, root: unknown, dialect: JsonImportDialect): void {
    if (dialect === "cytoscape") {
        importCytoscape(ctx, root);
        return;
    }
    const doc = isJsonObject(root)
        ? root
        : ctx.report.fail(JSON_ISSUE.SHAPE, `a ${dialect} document must be a JSON object, found ${describe(root)}`);
    switch (dialect) {
        case "node-link":
        case "d3":
            importNodeLink(ctx, doc, dialect);
            break;
        case "jgf":
            importJgf(ctx, doc);
            break;
        case "graphology":
            importGraphology(ctx, doc);
            break;
        case "vis":
            importVis(ctx, doc);
            break;
        case "adjacency":
            importAdjacency(ctx, doc);
            break;
        case "tree":
            importTree(ctx, doc);
            break;
        case "obographs":
            importObographs(ctx, doc);
            break;
        default: {
            const name: string = dialect;
            throw new GraphFormatError("E_UNSUPPORTED", `unknown dialect ${name}`, {
                option: "dialect",
                found: name,
            });
        }
    }
}
