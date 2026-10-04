/**
 * The GEXF subpath entry (`@graphty/graph-io/gexf`): the importer and exporter
 * objects with their format-specific option types, the exporter's loss-note codes and the
 * importer's issue codes grouped in one table.
 */

import {
    BAD_DEFAULT_CODE,
    BAD_OPTIONS_CODE,
    BAD_VALUE_CODE,
    COLUMN_RENAMED_CODE,
    COUNT_HINT_CODE,
    COUNT_MISMATCH_CODE,
    DIRECTION_FORCED_CODE,
    DIRECTION_REFUSED_CODE,
    DUPLICATE_ATTRIBUTE_CODE,
    DUPLICATE_EDGE_ID_CODE,
    DUPLICATE_NODE_CODE,
    EMPTY_INPUT_CODE,
    ENCODING_CONFLICT_CODE,
    ENCODING_FALLBACK_CODE,
    ID_MERGED_CODE,
    INPUT_ISSUE,
    INVALID_ENCODING_CODE,
    INVALID_UTF8_CODE,
    MISSING_ENDPOINT_CODE,
    MISSING_ID_CODE,
    MIXED_DIRECTION_CODE,
    MULTIPLE_GRAPHS_CODE,
    NO_GRAPH_CODE,
    OPTION_IGNORED_CODE,
    PARENT_CYCLE_CODE,
    PRECISION_CODE,
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
import {
    ATTRIBUTE_ID_CODE,
    ATTRIBUTE_TYPE_CODE,
    ATTRIBUTES_CLASS_CODE,
    ATTVALUE_SHAPE_CODE,
    EDGE_TYPE_CODE,
    HEADER_VALUE_CODE,
    MISSING_NODES_CODE,
    NOT_GEXF_CODE,
    OPEN_BOUND_CONFLICT_CODE,
    SPELL_OPEN_CODE,
    TIMED_STATIC_CODE,
    TIMESTAMP_CONFLICT_CODE,
    UNKNOWN_ATTRIBUTE_CODE,
    VALUE_OUTSIDE_OPTIONS_CODE,
    VIZ_DYNAMIC_CODE,
    VIZ_SKIPPED_CODE,
    VIZ_VALUE_CODE,
    WEIGHT_IGNORED_CODE,
} from "./importer.js";

export { GEXF_1_2_CAPABILITIES, GEXF_LOSS, gexfExporter, type GexfExportOptions } from "./exporter.js";
export { gexfImporter, type GexfImportOptions } from "./importer.js";
export { type GexfVersion } from "./schema.js";

/**
 * The issue codes the GEXF importer records, by name: the codes shared with
 * the other importers and the GEXF-specific ones. A key is the code without
 * its severity and format prefixes.
 * @category Built-in formats
 */
export const GEXF_ISSUE = Object.freeze({
    ...INPUT_ISSUE,
    /** The XML is not well-formed (fatal). */
    XML_SYNTAX: XML_SYNTAX_CODE,
    /** The input holds invalid UTF-8 (fatal). */
    INVALID_UTF8: INVALID_UTF8_CODE,
    /** Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal). */
    INVALID_ENCODING: INVALID_ENCODING_CODE,
    /** Bytes that are not UTF-8 and declare no encoding were read as windows-1252. */
    ENCODING_FALLBACK: ENCODING_FALLBACK_CODE,
    /** A declared encoding the platform cannot decode was ignored. */
    UNKNOWN_ENCODING: UNKNOWN_ENCODING_CODE,
    /** A declared encoding the byte order mark contradicts (the mark wins). */
    ENCODING_CONFLICT: ENCODING_CONFLICT_CODE,
    /** The input holds no markup at all: empty, whitespace or a byte order mark only (fatal). */
    EMPTY_INPUT: EMPTY_INPUT_CODE,
    /** The root element is not `<gexf>` (fatal). */
    NOT_GEXF: NOT_GEXF_CODE,
    /** The document has no `<graph>` (fatal). */
    NO_GRAPH: NO_GRAPH_CODE,
    /**
     * The file holds several graphs and only one was read: the first, or the one `graphIndex` or `graphName` chose.
     * `importAllGraphs()` reads every one.
     */
    MULTIPLE_GRAPHS: MULTIPLE_GRAPHS_CODE,
    /** `<edges>` without `<nodes>`. */
    MISSING_NODES: MISSING_NODES_CODE,
    /** A node without an id. */
    MISSING_ID: MISSING_ID_CODE,
    /** An edge without a source or target. */
    MISSING_ENDPOINT: MISSING_ENDPOINT_CODE,
    /** An edge endpoint that names no declared node (addMissingNodes false, the GEXF default). */
    UNKNOWN_NODE: "E_UNKNOWN_NODE",
    /** An edge `type` outside directed / undirected / mutual. */
    EDGE_TYPE: EDGE_TYPE_CODE,
    /** A `pid` / `<parent for>` naming an unknown node, a `<parent>` without for, or the children of a skipped node. */
    UNKNOWN_PARENT: UNKNOWN_PARENT_CODE,
    /** A `pid` / nested containment that would close a parent cycle; that link is dropped. */
    PARENT_CYCLE: PARENT_CYCLE_CODE,
    /** An inverted interval (start after end) of an element, a spell or a value; it is not kept. */
    BAD_VALUE: BAD_VALUE_CODE,
    /** An `<attributes class>` outside node / edge. */
    ATTRIBUTES_CLASS: ATTRIBUTES_CLASS_CODE,
    /** An `<attribute>` without an id. */
    ATTRIBUTE_ID: ATTRIBUTE_ID_CODE,
    /** A `<graph>` header attribute with an unknown value. */
    HEADER_VALUE: HEADER_VALUE_CODE,
    /**
     * A node or edge count the file announces is too large to reserve room for; it is ignored and the elements are
     * read as they come.
     */
    COUNT_HINT: COUNT_HINT_CODE,
    /** A `count` hint that disagrees with the elements of its section. */
    COUNT_MISMATCH: COUNT_MISMATCH_CODE,
    /** A node id declared twice. */
    DUPLICATE_NODE: DUPLICATE_NODE_CODE,
    /** An edge id declared twice (the second edge is skipped). */
    DUPLICATE_EDGE_ID: DUPLICATE_EDGE_ID_CODE,
    /** An attribute id declared twice in one class. */
    DUPLICATE_ATTRIBUTE: DUPLICATE_ATTRIBUTE_CODE,
    /** An attribute type the importer maps to string. */
    ATTRIBUTE_TYPE: ATTRIBUTE_TYPE_CODE,
    /** A declared type the format does not define (kept as string). */
    UNKNOWN_ATTR_TYPE: UNKNOWN_ATTR_TYPE_CODE,
    /** A default that does not parse as the declared type. */
    BAD_DEFAULT: BAD_DEFAULT_CODE,
    /** Options that do not parse as the declared type. */
    BAD_OPTIONS: BAD_OPTIONS_CODE,
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
    /** An `<attvalue for>` naming an undeclared attribute. */
    UNKNOWN_ATTRIBUTE: UNKNOWN_ATTRIBUTE_CODE,
    /** An `<attvalue>` without a value. */
    ATTVALUE_SHAPE: ATTVALUE_SHAPE_CODE,
    /** A timed value on an attribute of a static group. */
    TIMED_VALUE_ON_STATIC: TIMED_STATIC_CODE,
    /** An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit. */
    PRECISION: PRECISION_CODE,
    /** Two id texts merged into one number under ids "number". */
    ID_MERGED: ID_MERGED_CODE,
    /** The XML weight attribute ignored under weightFrom null. */
    WEIGHT_IGNORED: WEIGHT_IGNORED_CODE,
    /** viz elements skipped under viz: false. */
    VIZ_SKIPPED: VIZ_SKIPPED_CODE,
    /** A 1.2 dynamic viz element whose bounds were dropped. */
    VIZ_DYNAMIC_DROPPED: VIZ_DYNAMIC_CODE,
    /** Deprecated and no longer recorded: open spells are kept in the spells.open column. */
    SPELL_OPEN_DROPPED: SPELL_OPEN_CODE,
    /** A viz value that could not be read. */
    VIZ_VALUE: VIZ_VALUE_CODE,
    /** Both `start` and `startopen` (or `end` and `endopen`) on one element. */
    OPEN_BOUND_CONFLICT: OPEN_BOUND_CONFLICT_CODE,
    /** Both `timestamp` and `start` / `end` on one element or value. */
    TIMESTAMP_CONFLICT: TIMESTAMP_CONFLICT_CODE,
    /** A value outside the declared `<options>` (kept). */
    VALUE_OUTSIDE_OPTIONS: VALUE_OUTSIDE_OPTIONS_CODE,
    /** An element GEXF does not define at that place was skipped. */
    UNKNOWN_ELEMENT: UNKNOWN_ELEMENT_CODE,
    /** An XML attribute GEXF does not define on that element was ignored. */
    UNKNOWN_XML_ATTRIBUTE: UNKNOWN_XML_ATTRIBUTE_CODE,
    /** Text where GEXF allows only elements was ignored. */
    STRAY_TEXT: STRAY_TEXT_CODE,
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
    /** Edges forced to the policy's direction. */
    DIRECTION_FORCED: DIRECTION_FORCED_CODE,
    /**
     * The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a
     * format that holds one direction per file fails with E_DIRECTED. Pass "directed" or "undirected" to read or write
     * it anyway.
     */
    MIXED_DIRECTION: MIXED_DIRECTION_CODE,
});
