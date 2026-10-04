/**
 * What the XGMML importer and exporter share: the namespaces, the format facts, the fixed column
 * names, the `meta.extra` key, and the issue and loss code tables.
 */

import {
    AMBIGUOUS_GRAPH_NAME_CODE,
    BAD_VALUE_CODE,
    COLUMN_RENAMED_CODE,
    COLUMN_RENAMED_LOSS_CODE,
    DANGLING_REFERENCE_CODE,
    DIRECTION_FORCED_CODE,
    DIRECTION_REFUSED_CODE,
    DUPLICATE_ATTRIBUTE_CODE,
    DUPLICATE_EDGE_ID_CODE,
    DUPLICATE_NODE_CODE,
    ELEMENT_ISSUE,
    EMPTY_INPUT_CODE,
    ENCODING_CONFLICT_CODE,
    ENCODING_FALLBACK_CODE,
    EQUATION_AS_TEXT_CODE,
    GRAPH_NOT_FOUND_CODE,
    ID_MERGED_CODE,
    ID_TEXT_TYPE_CODE,
    INPUT_ISSUE,
    INVALID_ENCODING_CODE,
    INVALID_UTF8_CODE,
    MISSING_ENDPOINT_CODE,
    MISSING_ID_CODE,
    MIXED_DIRECTION_CODE,
    MULTIPLE_GRAPHS_CODE,
    MUTUAL_EXPANDED_CODE,
    NO_GRAPH_CODE,
    OPTION_IGNORED_CODE,
    PARENT_CYCLE_CODE,
    PARENTS_DROPPED_CODE,
    PRECISION_CODE,
    ROLE_ASSUMED_CODE,
    ROLE_DROPPED_CODE,
    ROLE_TAKEN_CODE,
    SINK_OPTION_CODE,
    STORAGE_CLASS_CODE,
    STRAY_TEXT_CODE,
    TEMPORAL_DROPPED_CODE,
    TEMPORAL_TEXT_DROPPED_CODE,
    UNKNOWN_ATTR_TYPE_CODE,
    UNKNOWN_ELEMENT_CODE,
    UNKNOWN_ENCODING_CODE,
    UNKNOWN_PARENT_CODE,
    WEIGHT_KEY_CLASH_CODE,
    WIDENED_CODE,
    XML_ILLEGAL_CHAR_CODE,
    XML_SYNTAX_CODE,
} from "../../common/codes.js";

/**
 * The format name.
 * @category Plugin helpers
 */
export const FORMAT = "xgmml";

/**
 * File extensions (never `.gr`, which DIMACS owns).
 * @category Plugin helpers
 */
export const EXTENSIONS: readonly string[] = Object.freeze([".xgmml", ".xml"]);

/**
 * MIME types: the draft's (appendix E) and Cytoscape's.
 * @category Plugin helpers
 */
export const MIME_TYPES: readonly string[] = Object.freeze(["application/xgmml", "text/xgmml", "text/xgmml+xml"]);

/**
 * The XGMML namespace.
 * @category Plugin helpers
 */
export const XGMML_NAMESPACE = "http://www.cs.rpi.edu/XGMML";

/**
 * Cytoscape's namespace, bound to the `cy` prefix.
 * @category Plugin helpers
 */
export const CY_NAMESPACE = "http://www.cytoscape.org";

/**
 * The XLink namespace.
 * @category Plugin helpers
 */
export const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";

/**
 * The `meta.extra` key the importer writes and the exporter reads.
 * @category Plugin helpers
 */
export const META_KEY = "xgmml";

/**
 * The label column (role label) of node and edge `label` attributes.
 * @category Plugin helpers
 */
export const LABEL_COLUMN = "label";

/**
 * The edge `id` column (role id, unique).
 * @category Plugin helpers
 */
export const EDGE_ID_COLUMN = "id";

/**
 * The node position (f32 x3, role position, y up).
 * @category Plugin helpers
 */
export const POSITION_COLUMN = "position";

/**
 * Cytoscape's stacking order (`NODE_Z_LOCATION`), kept out of the position.
 * @category Plugin helpers
 */
export const Z_COLUMN = "z";

/**
 * The node, edge and graph json column of a `<graphics>` element's values as written.
 * @category Plugin helpers
 */
export const GRAPHICS_COLUMN = "graphics";

/**
 * The containing group node (u32, role parent).
 * @category Plugin helpers
 */
export const PARENT_COLUMN = "parent";

/**
 * Every containing group node of a node that is in several groups (list of u32, role parents).
 * @category Plugin helpers
 */
export const PARENTS_COLUMN = "parents";

/**
 * The json node column of a group's nested graph id, label and atts.
 * @category Plugin helpers
 */
export const SUBGRAPH_COLUMN = "xgmml.subgraph";

/**
 * The string node column naming the network a node's nested-network pointer points to.
 * @category Plugin helpers
 */
export const NESTED_NETWORK_COLUMN = "cytoscape.nestedNetwork";

/**
 * The string node column of a nested-network pointer into another file (`file.xgmml#id`).
 * @category Plugin helpers
 */
export const NETWORK_POINTER_COLUMN = "xgmml.networkPointer";

/**
 * The list node column of the root-level subgraphs a node belongs to, in a generic document.
 * @category Plugin helpers
 */
export const NETWORKS_COLUMN = "xgmml.networks";

/**
 * The edge column of Cytoscape's interaction type.
 * @category Plugin helpers
 */
export const INTERACTION_COLUMN = "interaction";

/**
 * The `origin.namespace` of the columns the importer derives from XGMML structure.
 * @category Plugin helpers
 */
export const XGMML_ORIGIN_NAMESPACE = "xgmml";

/**
 * The `origin.namespace` of the columns that hold Cytoscape-only data (z, nested networks).
 * @category Plugin helpers
 */
export const CYTOSCAPE_ORIGIN_NAMESPACE = "cytoscape";

/**
 * The issue codes the XGMML importer records, by name: the codes shared with
 * the other importers and the XGMML-specific ones. A key is the code without
 * its severity and format prefixes.
 * @category Built-in formats
 */
export const XGMML_ISSUE = Object.freeze({
    ...INPUT_ISSUE,
    ...ELEMENT_ISSUE,
    /** The input is not well-formed XML. The import stops. */
    XML_SYNTAX: XML_SYNTAX_CODE,
    /** The input is empty or whitespace only. The import stops. */
    EMPTY_INPUT: EMPTY_INPUT_CODE,
    /** The input is not valid UTF-8. The import stops. */
    INVALID_UTF8: INVALID_UTF8_CODE,
    /**
     * Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the
     * `encoding` option). The import stops.
     */
    INVALID_ENCODING: INVALID_ENCODING_CODE,
    /** Undeclared non-UTF-8 bytes were read as windows-1252. */
    ENCODING_FALLBACK: ENCODING_FALLBACK_CODE,
    /** A declared encoding the platform cannot decode was ignored. */
    UNKNOWN_ENCODING: UNKNOWN_ENCODING_CODE,
    /** A declared encoding the byte order mark contradicts (the mark wins). */
    ENCODING_CONFLICT: ENCODING_CONFLICT_CODE,
    /**
     * The root element is not `<graph>` (it may be an XHTML page with a graph inside, or a GraphML file). The import
     * stops.
     */
    NO_GRAPH: NO_GRAPH_CODE,
    /**
     * The file is a Cytoscape session view (`cy:view="1"`), which holds only view settings and no nodes or edges. The
     * import stops.
     */
    VIEW_DOCUMENT: "E_XGMML_VIEW_DOCUMENT",
    /** A node with neither an id nor a label; it is skipped with its subtree. */
    MISSING_ID: MISSING_ID_CODE,
    /** A node without an id; its label is used as the id. */
    ID_FROM_LABEL: "W_XGMML_ID_FROM_LABEL",
    /** A node or edge with both an id and an `xlink:href`; it is read as the reference. */
    ID_AND_HREF: "W_XGMML_ID_AND_HREF",
    /** An edge without a source or a target that no label alias resolves. */
    MISSING_ENDPOINT: MISSING_ENDPOINT_CODE,
    /** An edge endpoint that names no node (addMissingNodes false); the edge is skipped. */
    UNKNOWN_NODE: "E_UNKNOWN_NODE",
    /** Endpoints resolved through Cytoscape's `"a (pp) b"` label aliases; interactions filled from labels. */
    LABEL_ALIAS: "W_XGMML_LABEL_ALIAS",
    /** A node id declared twice; the declarations are merged. */
    DUPLICATE_NODE: DUPLICATE_NODE_CODE,
    /** An edge id used twice; the second edge is skipped. */
    DUPLICATE_EDGE_ID: DUPLICATE_EDGE_ID_CODE,
    /**
     * Cytoscape 2.x writes each edge of a group a second time, inside the group. The repeats are dropped, so every edge
     * is read once; nothing is lost.
     */
    GROUP_DUPLICATE_EDGE: "W_XGMML_GROUP_DUPLICATE_EDGE",
    /** A `directed` or `cy:directed` value other than 0 / 1. */
    BAD_DIRECTED: "W_XGMML_BAD_DIRECTED",
    /** A `documentVersion` that does not parse; the dialect is chosen from the content. */
    DOCUMENT_VERSION: "W_XGMML_DOCUMENT_VERSION",
    /** A root `<graph>` with neither the XGMML namespace nor an XGMML DOCTYPE. */
    NO_NAMESPACE: "W_XGMML_NO_NAMESPACE",
    /** A malformed `<att>`: a list with a value, a scalar with child atts, an att with no name. */
    BAD_ATT: "W_XGMML_BAD_ATT",
    /** A bare `&` read as `&amp;` under repairBareAmpersands. */
    AMPERSAND_REPAIRED: "W_XGMML_AMPERSAND_REPAIRED",
    /** Two surrogate character references joined under pairSurrogateReferences. */
    SURROGATE_PAIRED: "W_XGMML_SURROGATE_PAIRED",
    /** An empty list whose element type nothing states; a list of strings is assumed. */
    EMPTY_LIST_TYPE: "W_XGMML_EMPTY_LIST_TYPE",
    /**
     * An attribute holds a structure a single column cannot (a list of records, a list of lists, a Cytoscape 2.x map
     * or XML from another tool). Its value is kept as a JSON value, which a save as XGMML writes back.
     */
    RECORD_LIST: "W_XGMML_RECORD_LIST",
    /** A pointer into another file (`file.xgmml#id`); kept as text. */
    CROSS_FILE_REFERENCE: "W_XGMML_CROSS_FILE_REFERENCE",
    /** A graph nested in an edge's att; there is no model for it. */
    EDGE_NESTED_GRAPH: "W_XGMML_EDGE_NESTED_GRAPH",
    /**
     * Some nodes or edges of a Cytoscape session belong to none of its networks (Cytoscape keeps group meta-edges and
     * the members of collapsed groups this way). They are not read; the message counts them.
     */
    ROOT_ONLY_ELEMENTS: "W_XGMML_ROOT_ONLY_ELEMENTS",
    /** A value that does not parse as its declared type; the cell is unset. */
    BAD_VALUE: BAD_VALUE_CODE,
    /**
     * An attribute's type was widened because a later value did not fit: an integer above 2^31 in an integer column,
     * or two declared types for one attribute.
     */
    WIDENED: WIDENED_CODE,
    /** An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit. */
    PRECISION: PRECISION_CODE,
    /** A reference (xlink:href, nested-network pointer) that names nothing. */
    DANGLING_REFERENCE: DANGLING_REFERENCE_CODE,
    /** The same attribute twice on one element; the later value wins. */
    DUPLICATE_ATTRIBUTE: DUPLICATE_ATTRIBUTE_CODE,
    /** A group membership naming no node. */
    UNKNOWN_PARENT: UNKNOWN_PARENT_CODE,
    /** A group membership that would close a parent cycle; that link is dropped. */
    PARENT_CYCLE: PARENT_CYCLE_CODE,
    /** A Cytoscape formula kept as its text. */
    EQUATION_AS_TEXT: EQUATION_AS_TEXT_CODE,
    /** An att type XGMML and Cytoscape do not define; kept as text. */
    UNKNOWN_ATTR_TYPE: UNKNOWN_ATTR_TYPE_CODE,
    /** An element XGMML does not define at that place; skipped with its subtree. */
    UNKNOWN_ELEMENT: UNKNOWN_ELEMENT_CODE,
    /** Character data where XGMML allows only elements, or inside an att. */
    STRAY_TEXT: STRAY_TEXT_CODE,
    /**
     * The file holds several graphs and only the first was read. It is not added when `graphIndex` or `graphName` chose the graph.
     * `importAllGraphs()` reads every one.
     */
    MULTIPLE_GRAPHS: MULTIPLE_GRAPHS_CODE,
    /** `graphIndex` or `graphName` matches no network in the session. The import stops. */
    GRAPH_NOT_FOUND: GRAPH_NOT_FOUND_CODE,
    /** `graphName` matches several networks in the session. The import stops. */
    AMBIGUOUS_GRAPH_NAME: AMBIGUOUS_GRAPH_NAME_CODE,
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
    /** Two different id texts became the same number because `ids` is "number", so their nodes were merged. */
    ID_MERGED: ID_MERGED_CODE,
    /** You set an option this format does not use; it had no effect. The message names the option. */
    OPTION_IGNORED: OPTION_IGNORED_CODE,
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
    /** Edges of the other direction were read with the direction `onMixedDirection` chose. */
    DIRECTION_FORCED: DIRECTION_FORCED_CODE,
    /**
     * The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a
     * format that holds one direction per file fails with E_DIRECTED. Pass "directed" or "undirected" to read or write
     * it anyway.
     */
    MIXED_DIRECTION: MIXED_DIRECTION_CODE,
});

/**
 * Loss note codes of the XGMML exporter (check()): the XGMML ones and the shared ones its notes
 * can carry. The generic notes of `checkCapabilities()` (dtypes, components, temporal and visual
 * roles, extension tables) are those of `LOSS`.
 * @category Built-in formats
 */
export const XGMML_LOSS = Object.freeze({
    /** A json or nested-list column written as a string att. */
    JSON_AS_STRING: "W_XGMML_JSON_AS_STRING",
    /**
     * An attribute type Cytoscape does not have is written as a wider one (a 32-bit float as Double, a large unsigned
     * integer as Long, a byte as Integer, a dictionary as String).
     */
    WIDENED_TYPE: "W_XGMML_WIDENED_TYPE",
    /** A text value holds a character XML 1.0 forbids (most control characters); the save fails with E_COLUMN_TYPE. */
    XML_ILLEGAL_CHAR: XML_ILLEGAL_CHAR_CODE,
    /** A temporal column written as plain numbers. */
    TEMPORAL_DROPPED: TEMPORAL_DROPPED_CODE,
    /** A temporal text companion written as a plain string att. */
    TEMPORAL_TEXT_DROPPED: TEMPORAL_TEXT_DROPPED_CODE,
    /** An attribute with a role the format has no place for is written as a plain attribute; the role is lost. */
    ROLE_DROPPED: ROLE_DROPPED_CODE,
    /**
     * A `parents` attribute (several parents per node) is not written because the graph also has a `parent` attribute.
     */
    PARENTS_DROPPED: PARENTS_DROPPED_CODE,
    /** A mutual pair written as two directed edges. */
    MUTUAL_EXPANDED: MUTUAL_EXPANDED_CODE,
    /** Node ids whose text reads back as the other type. */
    ID_TEXT_TYPE: ID_TEXT_TYPE_CODE,
    /** Edge ids that are not text are written as text and read back as text. */
    EDGE_ID_TEXT: "W_XGMML_EDGE_ID_TEXT",
    /** Strings holding a literal backslash-n or backslash-t read back as newline / tab (Cytoscape's escapes). */
    BACKSLASH_ESCAPE: "W_XGMML_BACKSLASH_ESCAPE",
    /** A position that cannot be written as it is: another shape, a non-finite coordinate, a z read back in the z column. */
    POSITION: "W_XGMML_POSITION",
    /** Nodes whose parent chain never reaches a root are written at the top level. */
    PARENT_CYCLE: "W_XGMML_PARENT_CYCLE",
    /**
     * An attribute with a role (the label, say) is written where the format keeps that role, and reads back under the
     * name the format's importer gives it.
     */
    COLUMN_NAME_CHANGED: COLUMN_RENAMED_LOSS_CODE,
    /**
     * An attribute without a role is written where the format keeps a role (a `name` column as the label, say), and
     * reads back with that role.
     */
    ROLE_ASSUMED: ROLE_ASSUMED_CODE,
    /** An attribute named `weight` without the weight role reads back as the edge weight. */
    WEIGHT_KEY_CLASH: WEIGHT_KEY_CLASH_CODE,
    /**
     * A text attribute reads back as a dictionary attribute, or the reverse, because the importer chooses by how often
     * its values repeat. The values are the same.
     */
    STORAGE_CLASS_CHANGED: STORAGE_CLASS_CODE,
    /** Edge labels shaped `a (i) b` read back with an `interaction` column (Cytoscape's label alias). */
    INTERACTION_FROM_LABEL: "W_XGMML_INTERACTION_FROM_LABEL",
});
