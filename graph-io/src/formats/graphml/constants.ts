/**
 * What the GraphML importer and exporter share: the namespace, the format facts, the reserved
 * column names of the XML-attribute-derived columns, the `meta.extra`
 * keys the importer records for the exporter, and the issue and loss codes.
 */

import {
    BAD_DEFAULT_CODE,
    COLUMN_RENAMED_CODE,
    COUNT_HINT_CODE,
    COUNT_MISMATCH_CODE,
    DANGLING_REFERENCE_CODE,
    DIRECTION_FORCED_CODE,
    DIRECTION_REFUSED_CODE,
    DUPLICATE_ATTRIBUTE_CODE,
    DUPLICATE_EDGE_ID_CODE,
    DUPLICATE_KEY_CODE,
    DUPLICATE_NODE_CODE,
    EMPTY_INPUT_CODE,
    ENCODING_CONFLICT_CODE,
    ENCODING_FALLBACK_CODE,
    HYPEREDGE_CODE,
    ID_MERGED_CODE,
    ID_TEXT_TYPE_CODE,
    INPUT_ISSUE,
    INVALID_ENCODING_CODE,
    INVALID_UTF8_CODE,
    MISSING_ENDPOINT_CODE,
    MISSING_ID_CODE,
    MIXED_DIRECTION_CODE,
    MULTIPLE_GRAPHS_CODE,
    MUTUAL_AS_UNDIRECTED_CODE,
    NO_GRAPH_CODE,
    OPTION_IGNORED_CODE,
    PARENTS_DROPPED_CODE,
    PRECISION_CODE,
    ROLE_DROPPED_CODE,
    ROLE_TAKEN_CODE,
    SINK_OPTION_CODE,
    STRAY_TEXT_CODE,
    UNKNOWN_ATTR_TYPE_CODE,
    UNKNOWN_ELEMENT_CODE,
    UNKNOWN_ENCODING_CODE,
    UNKNOWN_PARENT_CODE,
    UNKNOWN_XML_ATTRIBUTE_CODE,
    XML_SYNTAX_CODE,
} from "../../common/codes.js";

/**
 * The GraphML namespace.
 * @category Plugin helpers
 */
export const GRAPHML_NAMESPACE = "http://graphml.graphdrawing.org/xmlns";

/**
 * The yFiles extension namespace, declared as `xmlns:y` when a yfiles column is written.
 * @category Plugin helpers
 */
export const YFILES_NAMESPACE = "http://www.yworks.com/xml/graphml";

/**
 * The XML Schema instance namespace and the schema location the exporter writes.
 * @category Plugin helpers
 */
export const XSI_NAMESPACE = "http://www.w3.org/2001/XMLSchema-instance";

/**
 * The GraphML schema location written by the exporter.
 * @category Plugin helpers
 */
export const SCHEMA_LOCATION =
    "http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd";

/**
 * The format name.
 * @category Plugin helpers
 */
export const FORMAT = "graphml";

/**
 * File extensions.
 * @category Plugin helpers
 */
export const EXTENSIONS: readonly string[] = Object.freeze([".graphml", ".xml"]);

/**
 * MIME types.
 * @category Plugin helpers
 */
export const MIME_TYPES: readonly string[] = Object.freeze(["application/graphml+xml", "application/xml", "text/xml"]);

/**
 * The `attr.name` of the node key that carries ids rewritten by `sanitizeIds: "mangle"`.
 * @category Plugin helpers
 */
export const ORIGINAL_ID_ATTRIBUTE = "graphty:originalId";

/**
 * The node column that keeps original ids when `restoreMangledIds` is off.
 * @category Plugin helpers
 */
export const ORIGINAL_ID_COLUMN = "graphty.originalId";

/**
 * The edge column of the `id` XML attribute (role id, unique).
 * @category Plugin helpers
 */
export const EDGE_ID_COLUMN = "id";

/**
 * The edge columns of the `sourceport` / `targetport` XML attributes (roles sourcePort / targetPort).
 * @category Plugin helpers
 */
export const SOURCE_PORT_COLUMN = "sourceport";

/**
 * The edge column of the `targetport` XML attribute.
 * @category Plugin helpers
 */
export const TARGET_PORT_COLUMN = "targetport";

/**
 * The node column of the containing node of a nested graph (u32, role parent, refersTo node).
 * @category Plugin helpers
 */
export const PARENT_COLUMN = "parent";

/**
 * The bool node column marking the hub nodes synthesized for hyperedges under `hyperedges: "star"`.
 * @category Plugin helpers
 */
export const HYPEREDGE_HUB_COLUMN = "graphty.hyperedge";

/**
 * The column name a node key titled `label` receives the `label` role under.
 * @category Plugin helpers
 */
export const LABEL_COLUMN = "label";

/**
 * Edge column names reserved for the XML-attribute-derived columns; a key titled like one is renamed `<name>#<id>`.
 * @category Plugin helpers
 */
export const RESERVED_EDGE_NAMES: ReadonlySet<string> = new Set([
    EDGE_ID_COLUMN,
    SOURCE_PORT_COLUMN,
    TARGET_PORT_COLUMN,
]);

/**
 * Node column names reserved for the XML-derived columns.
 * @category Plugin helpers
 */
export const RESERVED_NODE_NAMES: ReadonlySet<string> = new Set([PARENT_COLUMN]);

/**
 * The `meta.extra` key under which the importer records what the exporter needs.
 * @category Plugin helpers
 */
export const META_KEY = "graphml";

/**
 * What the importer stores under `meta.extra.graphml`.
 * @category Plugin helpers
 */
export interface GraphmlMeta {
    /** The top-level `<graph id>`, or null. */
    readonly graphId: string | null;
    /** The top-level `edgedefault` as written, so a mixed file re-exports with the same layout. */
    readonly edgedefault: "directed" | "undirected" | null;
    /** The `xmlns:<prefix>` declarations of the root element (yFiles and the like). */
    readonly namespaces: Readonly<Record<string, string>>;
}

/**
 * The issue codes the GraphML importer records, by name: the codes shared
 * with the other importers and the GraphML-specific ones. A key is the code
 * without its severity and format prefixes.
 * @category Built-in formats
 */
export const GRAPHML_ISSUE = Object.freeze({
    ...INPUT_ISSUE,
    /** Fatal: the input is not well-formed XML. */
    XML_SYNTAX: XML_SYNTAX_CODE,
    /** Fatal: the input holds invalid UTF-8. */
    INVALID_UTF8: INVALID_UTF8_CODE,
    /** Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal). */
    INVALID_ENCODING: INVALID_ENCODING_CODE,
    /** Bytes that are not UTF-8 and declare no encoding were read as windows-1252. */
    ENCODING_FALLBACK: ENCODING_FALLBACK_CODE,
    /** A declared encoding the platform cannot decode was ignored. */
    UNKNOWN_ENCODING: UNKNOWN_ENCODING_CODE,
    /** A declared encoding the byte order mark contradicts (the mark wins). */
    ENCODING_CONFLICT: ENCODING_CONFLICT_CODE,
    /** Fatal: the input holds no markup at all (empty, whitespace or a byte order mark only). */
    EMPTY_INPUT: EMPTY_INPUT_CODE,
    /** Fatal: the root element is not `<graphml>`. */
    NOT_GRAPHML: "E_NOT_GRAPHML",
    /** The `<graphml>` root is in a namespace other than GraphML's; it is read as GraphML. */
    NAMESPACE: "W_GRAPHML_NAMESPACE",
    /** Fatal: the document has no `<graph>`. */
    NO_GRAPH: NO_GRAPH_CODE,
    /** A `<key>` without an id. */
    KEY_MISSING_ID: "E_GRAPHML_KEY_MISSING_ID",
    /** Two `<key>` elements with the same id. */
    DUPLICATE_KEY: DUPLICATE_KEY_CODE,
    /** A key declared for hyperedges, ports or endpoints (never used). */
    KEY_DOMAIN_UNSUPPORTED: "W_GRAPHML_KEY_DOMAIN_UNSUPPORTED",
    /** A `<node>` without an id. */
    MISSING_ID: MISSING_ID_CODE,
    /** An `<edge>` without a source or a target. */
    MISSING_ENDPOINT: MISSING_ENDPOINT_CODE,
    /** An edge endpoint that names no declared node under `addMissingNodes: false`; the edge is skipped. */
    UNKNOWN_NODE: "E_UNKNOWN_NODE",
    /** An edge endpoint that names a nested `<graph>`, not a node; a node of that id is created. */
    GRAPH_ENDPOINT: "W_GRAPHML_GRAPH_ENDPOINT",
    /** The nodes of a nested graph whose container node was skipped lose their parent. */
    UNKNOWN_PARENT: UNKNOWN_PARENT_CODE,
    /** Two `<data>` of one key on one element, two `<default>` in one key, or two weight keys; one is kept. */
    DUPLICATE_ATTRIBUTE: DUPLICATE_ATTRIBUTE_CODE,
    /** A `<data>` whose key was never declared. */
    UNKNOWN_KEY: "E_GRAPHML_UNKNOWN_KEY",
    /** A `<key>` declared after `<data>` that used it; those values were already reported and dropped. */
    KEY_DECLARED_LATE: "W_GRAPHML_KEY_DECLARED_LATE",
    /** A `<data>` whose key is declared for another domain. */
    KEY_DOMAIN: "W_GRAPHML_KEY_DOMAIN",
    /** A `<data>` without a key attribute. */
    DATA_MISSING_KEY: "E_GRAPHML_DATA_MISSING_KEY",
    /** A `<key>` whose `for` is not a GraphML domain. */
    KEY_FOR_INVALID: "E_GRAPHML_KEY_FOR_INVALID",
    /** Data of a nested `<graph>`; only the top-level graph has attributes. */
    NESTED_GRAPH_DATA: "W_GRAPHML_NESTED_GRAPH_DATA",
    /** Data of a hyperedge expanded to a star or clique. */
    HYPEREDGE_DATA_DROPPED: "W_GRAPHML_HYPEREDGE_DATA_DROPPED",
    /** Nested elements in the `<data>` of a typed (non-yfiles) key. */
    DATA_NESTED: "E_GRAPHML_DATA_NESTED",
    /** A `<node>` declared twice. */
    DUPLICATE_NODE: DUPLICATE_NODE_CODE,
    /** An edge id already used by another edge. */
    DUPLICATE_EDGE_ID: DUPLICATE_EDGE_ID_CODE,
    /** A `directed` attribute that is neither true nor false. */
    INVALID_DIRECTED: "E_GRAPHML_INVALID_DIRECTED",
    /** An `edgedefault` that is neither directed nor undirected. */
    INVALID_EDGEDEFAULT: "E_GRAPHML_INVALID_EDGEDEFAULT",
    /** A `<graph>` without edgedefault; the `defaultDirected` option applies. */
    EDGEDEFAULT_MISSING: "W_GRAPHML_EDGEDEFAULT_MISSING",
    /**
     * The file holds several graphs and only one was read: the first, or the one `graphIndex` or `graphName` chose.
     * `importAllGraphs()` reads every one.
     */
    MULTIPLE_GRAPHS: MULTIPLE_GRAPHS_CODE,
    /**
     * A node or edge count the file announces is too large to reserve room for; it is ignored and the elements are
     * read as they come.
     */
    COUNT_HINT: COUNT_HINT_CODE,
    /** A `parse.nodes` / `parse.edges` hint that disagrees with what the graph holds. */
    COUNT_MISMATCH: COUNT_MISMATCH_CODE,
    /** A hyperedge under `hyperedges: "error"`. */
    HYPEREDGE: HYPEREDGE_CODE,
    /** Hyperedges skipped under `hyperedges: "skip"`. */
    HYPEREDGE_SKIPPED: "W_GRAPHML_HYPEREDGE_SKIPPED",
    /** An endpoint of a hyperedge without a node, or with an unknown type. */
    HYPEREDGE_ENDPOINT: "E_GRAPHML_HYPEREDGE_ENDPOINT",
    /** `<port>` declarations (and their data) are not kept; sourceport / targetport edge attributes are. */
    PORT_DECLARATION: "W_GRAPHML_PORT_DECLARATION",
    /** A `sourceport` / `targetport` naming a port its node does not declare (once, with the count). */
    DANGLING_REFERENCE: DANGLING_REFERENCE_CODE,
    /** A `<graph>` inside an `<edge>` (legal GraphML): it and the nodes and edges it holds are dropped. */
    EDGE_GRAPH_DROPPED: "W_GRAPHML_EDGE_GRAPH_DROPPED",
    /** A `<node>` whose id is that of a hub `hyperedges: "star"` created; the node is merged into the hub. */
    HUB_ID_CLASH: "W_GRAPHML_HUB_ID_CLASH",
    /** A `graphty:originalId` value that is not text, or arrives after the node was added (after its nested graph). */
    ORIGINAL_ID_IGNORED: "W_GRAPHML_ORIGINAL_ID_IGNORED",
    /** A yFiles graphics value (a geometry coordinate, a width) that is not a number; it is not mapped. */
    YFILES_VALUE: "W_GRAPHML_YFILES_VALUE",
    /** A GraphML `parse.*` hint on `<graph>`, `<node>` or `<edge>` the importer does not act on (parse.nodeids, parse.order, ...). */
    PARSE_HINT_IGNORED: "W_GRAPHML_PARSE_HINT_IGNORED",
    /** An XML attribute GraphML does not define (or the importer does not keep) on an element; it is not kept. */
    UNKNOWN_XML_ATTRIBUTE: UNKNOWN_XML_ATTRIBUTE_CODE,
    /** A `<locator>` element. */
    LOCATOR_DROPPED: "W_GRAPHML_LOCATOR_DROPPED",
    /** A `<desc>` of a node, an edge or a hyperedge. */
    DESC_DROPPED: "W_GRAPHML_DESC_DROPPED",
    /** An element the GraphML schema does not define at that place. */
    UNKNOWN_ELEMENT: UNKNOWN_ELEMENT_CODE,
    /** Non-whitespace text where the schema allows only elements. */
    STRAY_TEXT: STRAY_TEXT_CODE,
    /** Two distinct id texts merged into one number under `ids: "number"`. */
    ID_MERGED: ID_MERGED_CODE,
    /** You set an option this format does not use; it had no effect. The message names the option. */
    OPTION_IGNORED: OPTION_IGNORED_CODE,
    /** A yFiles key under `yfiles: "skip"`. */
    YFILES_SKIPPED: "W_GRAPHML_YFILES_SKIPPED",
    /**
     * An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a
     * repeated column header.
     */
    COLUMN_RENAMED: COLUMN_RENAMED_CODE,
    /**
     * You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as
     * a plain attribute.
     */
    ROLE_TAKEN: ROLE_TAKEN_CODE,
    /** A declared type the format does not define (kept as string). */
    UNKNOWN_ATTR_TYPE: UNKNOWN_ATTR_TYPE_CODE,
    /** A default that does not parse as the declared type. */
    BAD_DEFAULT: BAD_DEFAULT_CODE,
    /** An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit. */
    PRECISION: PRECISION_CODE,
    /**
     * You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`,
     * `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.
     */
    SINK_OPTION: SINK_OPTION_CODE,
    /**
     * You read into a graph builder whose direction is already set, or which already holds edges, so the file is read
     * with the builder's direction instead of its own.
     */
    DIRECTION_REFUSED: DIRECTION_REFUSED_CODE,
    /** Edges forced to the policy's direction. */
    DIRECTION_FORCED: DIRECTION_FORCED_CODE,
    /**
     * The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a
     * format that holds one direction per file fails with E_DIRECTED. Pass "directed" or "undirected" to read or write
     * it anyway.
     */
    MIXED_DIRECTION: MIXED_DIRECTION_CODE,
});

/**
 * Loss note codes of the GraphML importer (report.lossy) and exporter (check()): the GraphML
 * ones; the generic ones (dtypes, lists, json text, positions, visual and temporal roles,
 * extension tables, id charsets, the weight key clash, name changes) are those of `LOSS`.
 * @category Built-in formats
 */
export const GRAPHML_LOSS = Object.freeze({
    /** yFiles nested XML kept as a JSON tree: structure preserved, not byte-exact. */
    YFILES_JSON: "W_GRAPHML_YFILES_JSON",
    /** A mutual pair written as one undirected edge; the mark is lost. */
    MUTUAL_AS_UNDIRECTED: MUTUAL_AS_UNDIRECTED_CODE,
    /** A `parents` (multi-parent) column cannot be written as nested graphs. */
    PARENTS_DROPPED: PARENTS_DROPPED_CODE,
    /** An attribute with a role the format has no place for is written as a plain attribute; the role is lost. */
    ROLE_DROPPED: ROLE_DROPPED_CODE,
    /** Containment order differs from index order; node indices change after a round trip. */
    HIERARCHY_REORDERED: "W_GRAPHML_HIERARCHY_REORDERED",
    /** Nodes whose parent chain never reaches a root are written at the top level. */
    PARENT_CYCLE: "W_GRAPHML_PARENT_CYCLE",
    /** Node ids that change type after a round trip under the canonical rule. */
    ID_TEXT_TYPE: ID_TEXT_TYPE_CODE,
    /** A numeric edge id column reads back as string. */
    EDGE_ID_TEXT: "W_GRAPHML_EDGE_ID_TEXT",
    /** A `yfiles.*` graphics column that no longer matches its yFiles tree: only the tree is written. */
    YFILES_GRAPHICS_STALE: "W_GRAPHML_YFILES_GRAPHICS_STALE",
    /** A yEd graphics value that is not valid XML; the save fails with E_COLUMN_TYPE. */
    YFILES_TREE: "E_GRAPHML_YFILES_TREE",
});
