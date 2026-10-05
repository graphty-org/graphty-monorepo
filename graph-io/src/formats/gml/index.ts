/**
 * The `@graphty/graph-io/gml` subpath: the GML importer and exporter, their
 * option types, and their issue and loss-note codes grouped in two tables.
 * @module @graphty/graph-io/gml
 */

import {
    AMBIGUOUS_GRAPH_NAME_CODE,
    COLUMN_RENAMED_CODE,
    DIRECTION_FORCED_CODE,
    DIRECTION_REFUSED_CODE,
    ELEMENT_ISSUE,
    ENCODING_FALLBACK_CODE,
    GRAPH_NOT_FOUND_CODE,
    ID_MERGED_CODE,
    INPUT_ISSUE,
    INVALID_ENCODING_CODE,
    INVALID_UTF8_CODE,
    MIXED_DIRECTION_CODE,
    OPTION_IGNORED_CODE,
    SINK_OPTION_CODE,
    SYNTAX_CODE,
    UNKNOWN_ENCODING_CODE,
} from "../../common/codes.js";
import {
    GRAPHICS_CONFLICT_CODE,
    GRAPHICS_OVERRIDDEN_CODE,
    INVALID_KEY_CODE,
    JSON_ARRAY_CODE,
    KEY_MANGLED_CODE,
    NESTED_ARRAY_CODE,
    POSITION_COMPONENTS_CODE,
    RECORD_BOOLEAN_CODE,
    RECORD_NULL_CODE,
    RECORD_NUMBER_TYPE_CODE,
    RESERVED_KEY_CODE,
} from "./exporter.js";
import {
    DUPLICATE_NODE_CODE,
    ELEMENT_TYPE_CODE,
    FLAG_TYPE_CODE,
    FLAG_VALUE_CODE,
    GRAPHICS_CODE,
    GROUPS_CODE,
    ID_DROPPED_CODE,
    ID_TYPE_CODE,
    MISSING_ENDPOINT_CODE,
    MISSING_ID_CODE,
    MISSING_LABEL_CODE,
    NESTED_ELEMENT_CODE,
    NO_GRAPH_CODE,
    PRECISION_CODE,
    REPEATED_KEY_CODE,
    ROLE_TAKEN_CODE,
    SECOND_GRAPH_CODE,
    STRING_ID_CODE,
    UNKNOWN_ENTITY_CODE,
    WIDENED_CODE,
} from "./importer.js";

export { gmlExporter, type GmlExportOptions } from "./exporter.js";
export { gmlImporter, type GmlImportOptions } from "./importer.js";

/**
 * The issue codes the GML importer records, by name: the codes shared with
 * the other importers and the GML-specific ones. A key is the code without
 * its severity and format prefixes.
 * @category Built-in formats
 */
export const GML_ISSUE = Object.freeze({
    ...INPUT_ISSUE,
    ...ELEMENT_ISSUE,
    /**
     * The text breaks GML's syntax: a word that is not a key or a value, an unclosed string or `[`, a stray `]`, or a
     * key without a value. The import stops.
     */
    SYNTAX: SYNTAX_CODE,
    /** The input is not valid UTF-8. The import stops. */
    INVALID_UTF8: INVALID_UTF8_CODE,
    /**
     * Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the
     * `encoding` option). The import stops.
     */
    INVALID_ENCODING: INVALID_ENCODING_CODE,
    /** Bytes that are not UTF-8 and declare no encoding were read as windows-1252. */
    ENCODING_FALLBACK: ENCODING_FALLBACK_CODE,
    /** A declared encoding the platform cannot decode was ignored. */
    UNKNOWN_ENCODING: UNKNOWN_ENCODING_CODE,
    /** There is no `graph [` block. The import stops. */
    NO_GRAPH: NO_GRAPH_CODE,
    /** The file holds more than one `graph` block and only the first was read. It is not added when `graphIndex` or `graphName` chose the graph. */
    MULTIPLE_GRAPHS: SECOND_GRAPH_CODE,
    /** `graphIndex` or `graphName` names no graph of the file; the message lists the graphs it holds. The import stops. */
    GRAPH_NOT_FOUND: GRAPH_NOT_FOUND_CODE,
    /** `graphName` matches more than one graph; pass `graphIndex`. The import stops. */
    AMBIGUOUS_GRAPH_NAME: AMBIGUOUS_GRAPH_NAME_CODE,
    /** A node without an `id`. */
    MISSING_ID: MISSING_ID_CODE,
    /** A node without a `label` under nodeIdFrom "label". */
    MISSING_LABEL: MISSING_LABEL_CODE,
    /** An edge without `source` or `target`. */
    MISSING_ENDPOINT: MISSING_ENDPOINT_CODE,
    /** A node id, source or target that is neither an integer nor a string. */
    ID_TYPE: ID_TYPE_CODE,
    /**
     * Node ids, sources or targets are text, where GML expects integers. They are read under the `ids` option.
     * Reported once per file.
     */
    STRING_ID: STRING_ID_CODE,
    /** A node id declared twice (later keys overwrite). */
    DUPLICATE_NODE: DUPLICATE_NODE_CODE,
    /** A structural key repeated in one element. */
    REPEATED_KEY: REPEATED_KEY_CODE,
    /** A `node` / `edge` key whose value is not a record. */
    ELEMENT_TYPE: ELEMENT_TYPE_CODE,
    /** A `directed` / `multigraph` flag that is not an integer. */
    FLAG_TYPE: FLAG_TYPE_CODE,
    /** A `directed` / `multigraph` flag outside 0 / 1, or repeated. */
    FLAG_VALUE: FLAG_VALUE_CODE,
    /** A named entity no table decodes, or a numeric reference beyond U+10FFFF; kept as written. */
    UNKNOWN_ENTITY: UNKNOWN_ENTITY_CODE,
    /** An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit. */
    PRECISION: PRECISION_CODE,
    /** A node's graphics value that cannot give a position as written; kept in the graphics json column. */
    GRAPHICS: GRAPHICS_CODE,
    /** A graph, node or edge record nested in a node or edge; kept as json, not read as structure. */
    NESTED_ELEMENT: NESTED_ELEMENT_CODE,
    /** YEd's isGroup / gid keys, kept as plain columns; the hierarchy is not read as containment. */
    GROUPS: GROUPS_CODE,
    /**
     * An attribute's type was widened because a later value did not fit: an integer above 2^31 in an integer column,
     * or two declared types for one attribute.
     */
    WIDENED: WIDENED_CODE,
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
    /**
     * Under `nodeIdFrom: "label"` or `"index"` the file's integer ids are not kept. It is listed in `report.lossy`, not
     * in `report.issues`.
     */
    ID_DROPPED: ID_DROPPED_CODE,
});

/**
 * The loss-note codes the GML exporter's check() reports beyond the shared LOSS table, by name.
 * @category Built-in formats
 */
export const GML_LOSS = Object.freeze({
    /** A json column holds numbers; GML records cannot keep int versus real. */
    RECORD_NUMBER_TYPE: RECORD_NUMBER_TYPE_CODE,
    /** A json column holds booleans, written 1 / 0. */
    RECORD_BOOLEAN: RECORD_BOOLEAN_CODE,
    /** A json column holds nulls, omitted. */
    RECORD_NULL: RECORD_NULL_CODE,
    /** An attribute holds an array inside an array, which GML cannot write; the save fails. */
    NESTED_ARRAY: NESTED_ARRAY_CODE,
    /** A json row that is an array, written as repeated keys. */
    JSON_ARRAY: JSON_ARRAY_CODE,
    /**
     * An attribute name GML cannot use as a key (keys are letters and digits, starting with a letter). The save fails
     * unless `sanitizeKeys` is "mangle".
     */
    INVALID_KEY: INVALID_KEY_CODE,
    /** A column named like a structural key. */
    RESERVED_KEY: RESERVED_KEY_CODE,
    /** A key rewritten under sanitizeKeys "mangle". */
    KEY_MANGLED: KEY_MANGLED_CODE,
    /** A position column with more than three components. */
    POSITION_COMPONENTS: POSITION_COMPONENTS_CODE,
    /** A graphics record whose x / y / z the position column overrides. */
    GRAPHICS_OVERRIDDEN: GRAPHICS_OVERRIDDEN_CODE,
    /** A graphics record that cannot hold the position. */
    GRAPHICS_CONFLICT: GRAPHICS_CONFLICT_CODE,
});
