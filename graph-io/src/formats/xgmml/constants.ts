/**
 * What the XGMML importer and exporter share: the namespaces, the format facts, the fixed column
 * names, the `meta.extra` key, and the issue and loss code tables (design
 * `design/graph-io/cytoscape-and-obo/design.md` section 1.1).
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

/** The format name. */
export const FORMAT = "xgmml";

/** File extensions (never `.gr`, which DIMACS owns). */
export const EXTENSIONS: readonly string[] = Object.freeze([".xgmml", ".xml"]);

/** MIME types: the draft's (appendix E) and Cytoscape's. */
export const MIME_TYPES: readonly string[] = Object.freeze(["application/xgmml", "text/xgmml", "text/xgmml+xml"]);

/** The XGMML namespace. */
export const XGMML_NAMESPACE = "http://www.cs.rpi.edu/XGMML";

/** Cytoscape's namespace, bound to the `cy` prefix. */
export const CY_NAMESPACE = "http://www.cytoscape.org";

/** The XLink namespace. */
export const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";

/** The `meta.extra` key the importer writes and the exporter reads. */
export const META_KEY = "xgmml";

/** The label column (role label) of node and edge `label` attributes. */
export const LABEL_COLUMN = "label";

/** The edge `id` column (role id, unique). */
export const EDGE_ID_COLUMN = "id";

/** The node position (f32 x3, role position, y up). */
export const POSITION_COLUMN = "position";

/** Cytoscape's stacking order (`NODE_Z_LOCATION`), kept out of the position. */
export const Z_COLUMN = "z";

/** The node, edge and graph json column of a `<graphics>` element's values as written. */
export const GRAPHICS_COLUMN = "graphics";

/** The containing group node (u32, role parent). */
export const PARENT_COLUMN = "parent";

/** Every containing group node of a node that is in several groups (list of u32, role parents). */
export const PARENTS_COLUMN = "parents";

/** The json node column of a group's nested graph id, label and atts. */
export const SUBGRAPH_COLUMN = "xgmml.subgraph";

/** The string node column naming the network a node's nested-network pointer points to. */
export const NESTED_NETWORK_COLUMN = "cytoscape.nestedNetwork";

/** The string node column of a nested-network pointer into another file (`file.xgmml#id`). */
export const NETWORK_POINTER_COLUMN = "xgmml.networkPointer";

/** The list node column of the root-level subgraphs a node belongs to, in a generic document. */
export const NETWORKS_COLUMN = "xgmml.networks";

/** The edge column of Cytoscape's interaction type. */
export const INTERACTION_COLUMN = "interaction";

/** The `origin.namespace` of the columns the importer derives from XGMML structure. */
export const XGMML_ORIGIN_NAMESPACE = "xgmml";

/** The `origin.namespace` of the columns that hold Cytoscape-only data (z, nested networks). */
export const CYTOSCAPE_ORIGIN_NAMESPACE = "cytoscape";

/**
 * The issue codes the XGMML importer records (design section 8.6), by name: the codes shared with
 * the other importers (src/common/codes.ts) and the XGMML-specific ones. A key is the code without
 * its severity and format prefixes.
 */
export const XGMML_ISSUE = Object.freeze({
    ...INPUT_ISSUE,
    /** Fatal: the input is not well-formed XML. */
    XML_SYNTAX: XML_SYNTAX_CODE,
    /** Fatal: the input is empty or whitespace only. */
    EMPTY_INPUT: EMPTY_INPUT_CODE,
    /** Fatal: the input holds invalid UTF-8. */
    INVALID_UTF8: INVALID_UTF8_CODE,
    /** Fatal: bytes invalid in the encoding a BOM, a declaration or the option chose. */
    INVALID_ENCODING: INVALID_ENCODING_CODE,
    /** Undeclared non-UTF-8 bytes were read as windows-1252. */
    ENCODING_FALLBACK: ENCODING_FALLBACK_CODE,
    /** A declared encoding the platform cannot decode was ignored. */
    UNKNOWN_ENCODING: UNKNOWN_ENCODING_CODE,
    /** A declared encoding the byte order mark contradicts (the mark wins). */
    ENCODING_CONFLICT: ENCODING_CONFLICT_CODE,
    /** Fatal: the root element is not `<graph>` (an XHTML page embedding one, a GraphML file). */
    NO_GRAPH: NO_GRAPH_CODE,
    /** Fatal: a session view document (`cy:view="1"`): view SUIDs and no topology. */
    VIEW_DOCUMENT: "E_XGMML_VIEW_DOCUMENT",
    /** A node with neither an id nor a label; it is skipped with its subtree. */
    MISSING_ID: MISSING_ID_CODE,
    /** A node without an id; its label is used as the id. */
    ID_FROM_LABEL: "W_XGMML_ID_FROM_LABEL",
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
    /** A meta-edge the 2.x writer repeats inside a group; the copy is dropped. */
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
    /** A record list, a list of lists, a 2.x map or foreign XML in an att, kept as json. */
    RECORD_LIST: "W_XGMML_RECORD_LIST",
    /** A pointer into another file (`file.xgmml#id`); kept as text. */
    CROSS_FILE_REFERENCE: "W_XGMML_CROSS_FILE_REFERENCE",
    /** A graph nested in an edge's att; there is no model for it. */
    EDGE_NESTED_GRAPH: "W_XGMML_EDGE_NESTED_GRAPH",
    /** Elements of a session network declared outside every registered subnetwork. */
    ROOT_ONLY_ELEMENTS: "W_XGMML_ROOT_ONLY_ELEMENTS",
    /** A value that does not parse as its declared type; the cell is unset. */
    BAD_VALUE: BAD_VALUE_CODE,
    /** A column widened because its values or declared types disagree. */
    WIDENED: WIDENED_CODE,
    /** A long or real beyond what a double holds exactly. */
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
    /** A session network document holds several registered networks; one was read. */
    MULTIPLE_GRAPHS: MULTIPLE_GRAPHS_CODE,
    /** graphIndex / graphName names no network (fatal). */
    GRAPH_NOT_FOUND: GRAPH_NOT_FOUND_CODE,
    /** graphName names several networks (fatal). */
    AMBIGUOUS_GRAPH_NAME: AMBIGUOUS_GRAPH_NAME_CODE,
    /** A column renamed `<name>#<n>` because its name was taken. */
    COLUMN_RENAMED: COLUMN_RENAMED_CODE,
    /** A column declared without its role because the table already holds it. */
    ROLE_TAKEN: ROLE_TAKEN_CODE,
    /** Two id texts merged into one number under ids "number". */
    ID_MERGED: ID_MERGED_CODE,
    /** An option the format has no use for. */
    OPTION_IGNORED: OPTION_IGNORED_CODE,
    /** A builder-policy option the sink does not honour. */
    SINK_OPTION: SINK_OPTION_CODE,
    /** The sink refused the file's direction. */
    DIRECTION_REFUSED: DIRECTION_REFUSED_CODE,
    /** Edges forced to the policy's direction. */
    DIRECTION_FORCED: DIRECTION_FORCED_CODE,
    /** A mixed file under onMixedDirection "error" (fatal). */
    MIXED_DIRECTION: MIXED_DIRECTION_CODE,
});

/**
 * Loss note codes of the XGMML exporter (check()): the XGMML ones and the shared ones its notes
 * can carry. The generic notes of `checkCapabilities()` (dtypes, components, temporal and visual
 * roles, extension tables) are those of `LOSS`.
 */
export const XGMML_LOSS = Object.freeze({
    /** A json or nested-list column written as a string att. */
    JSON_AS_STRING: "W_XGMML_JSON_AS_STRING",
    /** A dtype written as a wider Cytoscape type (f32 as Double, u32 above i32 as Long, u8 as Integer, dict as String). */
    WIDENED_TYPE: "W_XGMML_WIDENED_TYPE",
    /** A string holding a character XML 1.0 cannot carry; export() throws. */
    XML_ILLEGAL_CHAR: XML_ILLEGAL_CHAR_CODE,
    /** A temporal column written as plain numbers. */
    TEMPORAL_DROPPED: TEMPORAL_DROPPED_CODE,
    /** A temporal text companion written as a plain string att. */
    TEMPORAL_TEXT_DROPPED: TEMPORAL_TEXT_DROPPED_CODE,
    /** A role the format has no slot for, written as a plain att. */
    ROLE_DROPPED: ROLE_DROPPED_CODE,
    /** A parents column not written because the snapshot also has a parent column. */
    PARENTS_DROPPED: PARENTS_DROPPED_CODE,
    /** A mutual pair written as two directed edges. */
    MUTUAL_EXPANDED: MUTUAL_EXPANDED_CODE,
    /** Node ids whose text reads back as the other type. */
    ID_TEXT_TYPE: ID_TEXT_TYPE_CODE,
    /** An edge id column of another dtype written as text; it reads back as strings. */
    EDGE_ID_TEXT: "W_XGMML_EDGE_ID_TEXT",
    /** Strings holding a literal backslash-n or backslash-t read back as newline / tab (Cytoscape's escapes). */
    BACKSLASH_ESCAPE: "W_XGMML_BACKSLASH_ESCAPE",
    /** A position that cannot be written as it is: another shape, a non-finite coordinate, a z read back in the z column. */
    POSITION: "W_XGMML_POSITION",
    /** Nodes whose parent chain never reaches a root are written at the top level. */
    PARENT_CYCLE: "W_XGMML_PARENT_CYCLE",
    /** A column named like a column the importer owns reads back renamed. */
    COLUMN_NAME_CHANGED: COLUMN_RENAMED_LOSS_CODE,
    /** A role-less column written into a slot reads back with the slot's role. */
    ROLE_ASSUMED: ROLE_ASSUMED_CODE,
    /** A plain `weight` edge column reads back as THE weight. */
    WEIGHT_KEY_CLASH: WEIGHT_KEY_CLASH_CODE,
    /** A string / dict column that reads back as the other storage class. */
    STORAGE_CLASS_CHANGED: STORAGE_CLASS_CODE,
    /** Edge labels shaped `a (i) b` read back with an `interaction` column (Cytoscape's label alias). */
    INTERACTION_FROM_LABEL: "W_XGMML_INTERACTION_FROM_LABEL",
});
