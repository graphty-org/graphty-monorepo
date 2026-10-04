/**
 * The issue and loss codes shared by more than one format: one constant per condition, aliased by every format's
 * `<FMT>_ISSUE` / `<FMT>_LOSS` table, so a consumer can switch on a condition without knowing the
 * format and two importers never spell the same condition differently. A condition specific to one
 * format keeps that format's own `E_<FMT>_` / `W_<FMT>_` code next to its importer or exporter.
 *
 * Naming scheme: `E_` for an issue recorded with severity "error" (or a loss note whose export()
 * throws), `W_` for a warning; a table key is the code without the severity prefix and without the
 * format prefix.
 */

import type { GraphFormatErrorCode } from "@graphty/graph-format";

// ============================================================ importer issues

/**
 * Issue code: the URL could not be fetched (network failure, CORS refusal or a non-2xx status).
 * @category Issue and loss codes
 */
export const FETCH_CODE = "E_FETCH";

/**
 * The element (node, attribute, key, ...) has no id where the format requires one.
 * @category Issue and loss codes
 */
export const MISSING_ID_CODE = "E_MISSING_ID";

/**
 * An edge has no source or no target.
 * @category Issue and loss codes
 */
export const MISSING_ENDPOINT_CODE = "E_MISSING_ENDPOINT";

/**
 * A node id declared twice; the second declaration merges into the first.
 * @category Issue and loss codes
 */
export const DUPLICATE_NODE_CODE = "W_DUPLICATE_NODE";

/**
 * The document declares no graph at all (fatal).
 * @category Issue and loss codes
 */
export const NO_GRAPH_CODE = "E_NO_GRAPH";

/**
 * The file holds several graphs and only one was read: the first, or the one `graphIndex` or `graphName` chose.
 * `importAllGraphs()` reads every one.
 * @category Issue and loss codes
 */
export const MULTIPLE_GRAPHS_CODE = "W_MULTIPLE_GRAPHS";

/**
 * The input is empty (fatal).
 * @category Issue and loss codes
 */
export const EMPTY_INPUT_CODE = "E_EMPTY_INPUT";

/**
 * The text grammar of the format is violated (fatal; the message carries the detail).
 * @category Issue and loss codes
 */
export const SYNTAX_CODE = "E_SYNTAX";

/**
 * The XML is not well-formed (fatal; the message carries the detail and the line).
 * @category Issue and loss codes
 */
export const XML_SYNTAX_CODE = "E_XML_SYNTAX";

/**
 * An element the format does not define at that place was skipped.
 * @category Issue and loss codes
 */
export const UNKNOWN_ELEMENT_CODE = "W_UNKNOWN_ELEMENT";

/**
 * Text where the format allows only elements was ignored.
 * @category Issue and loss codes
 */
export const STRAY_TEXT_CODE = "W_STRAY_TEXT";

/**
 * A `pid` / parent reference names a node the document never declares.
 * @category Issue and loss codes
 */
export const UNKNOWN_PARENT_CODE = "E_UNKNOWN_PARENT";

/**
 * A hyperedge under the `hyperedges: "error"` policy (fatal).
 * @category Issue and loss codes
 */
export const HYPEREDGE_CODE = "E_HYPEREDGE";

/**
 * A declaration's key / attribute id is declared twice.
 * @category Issue and loss codes
 */
export const DUPLICATE_KEY_CODE = "E_DUPLICATE_KEY";

/**
 * An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a repeated
 * column header.
 * @category Issue and loss codes
 */
export const COLUMN_RENAMED_CODE = "W_COLUMN_RENAMED";

/** A node or edge attribute is not written, because the format has nowhere to put it. */
export const COLUMN_DROPPED_CODE = "W_COLUMN_DROPPED";

/**
 * You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a
 * plain attribute.
 * @category Issue and loss codes
 */
export const ROLE_TAKEN_CODE = "W_ROLE_TAKEN";

/**
 * An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.
 * @category Issue and loss codes
 */
export const PRECISION_CODE = "W_PRECISION";

/**
 * Two distinct id texts became one number under ids "number".
 * @category Issue and loss codes
 */
export const ID_MERGED_CODE = "W_ID_MERGED";

/**
 * You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`,
 * `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.
 * @category Issue and loss codes
 */
export const SINK_OPTION_CODE = "W_SINK_OPTION";

/**
 * You set an option this format does not use; it had no effect. The message names the option.
 * @category Issue and loss codes
 */
export const OPTION_IGNORED_CODE = "W_OPTION_IGNORED";

/**
 * An invalid UTF-8 sequence in the input (fatal).
 * @category Issue and loss codes
 */
export const INVALID_UTF8_CODE = "E_INVALID_UTF8";

/**
 * Bytes that are not valid in the encoding a BOM, a declaration or the `encoding` option chose (fatal).
 * @category Issue and loss codes
 */
export const INVALID_ENCODING_CODE = "E_INVALID_ENCODING";

/**
 * Bytes that are not valid UTF-8 (and declare no other encoding) were read as windows-1252.
 * @category Issue and loss codes
 */
export const ENCODING_FALLBACK_CODE = "W_ENCODING_FALLBACK";

/**
 * The file declares an encoding the platform's TextDecoder does not know; the declaration is ignored.
 * @category Issue and loss codes
 */
export const UNKNOWN_ENCODING_CODE = "W_UNKNOWN_ENCODING";

/**
 * A byte order mark, the `encoding` option and the encoding the file declares disagree, or the file
 * declares UTF-16 over bytes that are not UTF-16; the message names which one applied (a BOM wins
 * over the option and the declaration, the option over the declaration).
 * @category Issue and loss codes
 */
export const ENCODING_CONFLICT_CODE = "W_ENCODING_CONFLICT";

/**
 * The text holds a control character (C0 other than TAB, LF, FF and CR; DEL; C1) or a stray U+FEFF
 * that is kept in the id or value it is part of, or a trailing Ctrl-Z end-of-file marker that was
 * ignored; recorded once per import.
 * @category Issue and loss codes
 */
export const CONTROL_CHARACTER_CODE = "W_CONTROL_CHARACTER";

/**
 * The input is a known file type that is no graph format at all (an HTML page, a PDF, gzip or zip
 * data, a PNG image), so it is not read as the format asked for (fatal).
 * @category Issue and loss codes
 */
export const FOREIGN_FORMAT_CODE = "E_FOREIGN_FORMAT";

/**
 * More warnings of one code than a report keeps: the first ones are kept and this one warning (the
 * suppressed code as its element) counts the rest.
 * @category Issue and loss codes
 */
export const ISSUES_SUPPRESSED_CODE = "W_ISSUES_SUPPRESSED";

/**
 * An XML attribute the format does not define (or does not keep) on that element; it is not kept.
 * @category Issue and loss codes
 */
export const UNKNOWN_XML_ATTRIBUTE_CODE = "W_UNKNOWN_XML_ATTRIBUTE";

/**
 * You read into a graph builder whose direction is already set, or which already holds edges, so the file is read with
 * the builder's direction instead of its own.
 * @category Issue and loss codes
 */
export const DIRECTION_REFUSED_CODE = "W_DIRECTION_REFUSED";

/**
 * Edges of the other direction were forced to the policy's direction.
 * @category Issue and loss codes
 */
export const DIRECTION_FORCED_CODE = "W_DIRECTION_FORCED";

/**
 * The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a
 * format that holds one direction per file fails with E_DIRECTED. Pass "directed" or "undirected" to read or write it
 * anyway.
 */
export const MIXED_DIRECTION_CODE = "E_MIXED_DIRECTION";

/**
 * A node or edge count the file announces is too large to reserve room for; it is ignored and the elements are read as
 * they come.
 * @category Issue and loss codes
 */
export const COUNT_HINT_CODE = "W_COUNT_HINT";

/**
 * The declared type is not one the format defines; the column is kept as string.
 * @category Issue and loss codes
 */
export const UNKNOWN_ATTR_TYPE_CODE = "W_UNKNOWN_ATTR_TYPE";

/**
 * The declared default does not parse as the declared type; the column has no default.
 * @category Issue and loss codes
 */
export const BAD_DEFAULT_CODE = "W_BAD_DEFAULT";

/**
 * A declared option does not parse as the declared type; the options are dropped.
 * @category Issue and loss codes
 */
export const BAD_OPTIONS_CODE = "W_BAD_OPTIONS";

/**
 * A repeated edge id in a format whose edge ids are unique; the second edge is skipped.
 * @category Issue and loss codes
 */
export const DUPLICATE_EDGE_ID_CODE = "E_DUPLICATE_EDGE_ID";

/**
 * A value does not parse as its declared type; the cell is left unset.
 * @category Issue and loss codes
 */
export const BAD_VALUE_CODE = "E_BAD_VALUE";

/**
 * An attribute's type was widened because a later value did not fit: an integer above 2^31 in an integer column, or
 * two declared types for one attribute.
 * @category Issue and loss codes
 */
export const WIDENED_CODE = "W_WIDENED";

/**
 * A reference that is not a containment link (an attribute's element id, a layout or bypass
 * entry, a subnetwork member, a view's network, an undeclared target) names nothing; reported
 * once per kind with the count.
 * @category Issue and loss codes
 */
export const DANGLING_REFERENCE_CODE = "W_DANGLING_REFERENCE";

/**
 * The same attribute twice on one element; one value is kept (the later, unless the format's specification says the first).
 * @category Issue and loss codes
 */
export const DUPLICATE_ATTRIBUTE_CODE = "W_DUPLICATE_ATTRIBUTE";

/**
 * A containment link would close a parent cycle; that one link is dropped.
 * @category Issue and loss codes
 */
export const PARENT_CYCLE_CODE = "E_PARENT_CYCLE";

/**
 * A formula (Cytoscape's `=ABS($x)`) is kept as its text; it is never evaluated.
 * @category Issue and loss codes
 */
export const EQUATION_AS_TEXT_CODE = "W_EQUATION_AS_TEXT";

/**
 * The file's style rules (defaults, mappings, dependencies, visual property aspects) are not
 * applied to the snapshot; recorded once per import, the message names what was not applied.
 * @category Issue and loss codes
 */
export const STYLES_NOT_IMPORTED_CODE = "W_STYLES_NOT_IMPORTED";

/**
 * A CX array member that is not a one-key object holding an array or an object; the block is skipped.
 * @category Issue and loss codes
 */
export const BAD_ASPECT_BLOCK_CODE = "E_BAD_ASPECT_BLOCK";

/**
 * A CX array member holding several aspects (`{"nodes": [...], "edges": [...]}`); each array-valued key is read as its own fragment.
 * @category Issue and loss codes
 */
export const MULTI_ASPECT_FRAGMENT_CODE = "W_MULTI_ASPECT_FRAGMENT";

/**
 * A CX aspect, an array of elements, written as one object (`{"nodes": {"@id": 1}}`); read as one element.
 * @category Issue and loss codes
 */
export const SINGLE_OBJECT_ASPECT_CODE = "W_SINGLE_OBJECT_ASPECT";

/**
 * The document uses the bare tokens NaN, Infinity or -Infinity (Python's json writes them), which
 * strict JSON does not allow; read as the numbers.
 * @category Issue and loss codes
 */
export const JSON_NONSTANDARD_NUMBER_CODE = "W_JSON_NONSTANDARD_NUMBER";

/**
 * A CX aspect out of its place (after the post-metadata, a status that is not last, a block buffered for what it depends on).
 * @category Issue and loss codes
 */
export const ASPECT_ORDER_CODE = "W_ASPECT_ORDER";

/**
 * A declared element count disagrees with what was read.
 * @category Issue and loss codes
 */
export const COUNT_MISMATCH_CODE = "W_COUNT_MISMATCH";

/**
 * The producer marked the document as failed (CX `status.success: false`): it is incomplete (fatal).
 * @category Issue and loss codes
 */
export const STATUS_FAILED_CODE = "E_STATUS_FAILED";

/**
 * The producer marked the document as successful but attached an error text.
 * @category Issue and loss codes
 */
export const STATUS_WARNING_CODE = "W_STATUS_WARNING";

/**
 * The input is beyond a size limit (a zip's uncompressed total or ratio, a document longer than
 * one string); the same string as graph-format's E_TOO_LARGE, recorded with category "unsupported".
 * @category Issue and loss codes
 */
export const TOO_LARGE_CODE = "E_TOO_LARGE";

/**
 * `graphIndex` is beyond the graphs of the input, or `graphName` names none of them (fatal).
 * @category Issue and loss codes
 */
export const GRAPH_NOT_FOUND_CODE = "E_GRAPH_NOT_FOUND";

/**
 * `graphName` names more than one graph of the input; the message lists their indexes (fatal).
 * @category Issue and loss codes
 */
export const AMBIGUOUS_GRAPH_NAME_CODE = "E_AMBIGUOUS_GRAPH_NAME";

/**
 * A second edge between the same two nodes under `duplicateEdges: "error"`; the import stops.
 * @category Issue and loss codes
 */
export const DUPLICATE_EDGE_CODE = "E_DUPLICATE_EDGE" satisfies GraphFormatErrorCode;

/**
 * An edge from a node to itself under `selfLoops: "error"`; the import stops.
 * @category Issue and loss codes
 */
export const SELF_LOOP_CODE = "E_SELF_LOOP" satisfies GraphFormatErrorCode;

/**
 * The `duplicateEdges` option merged parallel edges into one edge per pair, so whatever told them apart (an OBO
 * relation, a label) is lost. Recorded once, with the number merged.
 * @category Issue and loss codes
 */
export const EDGES_MERGED_CODE = "W_EDGES_MERGED";

/**
 * Self-loops were removed by the `selfLoops: "drop"` option. Recorded once by importGraph() with the
 * number removed.
 * @category Issue and loss codes
 */
export const SELF_LOOPS_DROPPED_CODE = "W_SELF_LOOPS_DROPPED";

// ============================================================ exporter loss notes

/** An attribute with a role the format has no place for is written as a plain attribute; the role is lost. */
export const ROLE_DROPPED_CODE = "W_ROLE_DROPPED";

/**
 * A parents (multi-parent) column in a format with single containment only.
 * @category Issue and loss codes
 */
export const PARENTS_DROPPED_CODE = "W_PARENTS_DROPPED";

/**
 * A start / end / timestamp column in a format without temporal support.
 * @category Issue and loss codes
 */
export const TEMPORAL_DROPPED_CODE = "W_TEMPORAL_DROPPED";

/**
 * A mutual pair is written as two directed edges without the mutual mark.
 * @category Issue and loss codes
 */
export const MUTUAL_EXPANDED_CODE = "W_MUTUAL_EXPANDED";

/**
 * A mutual pair is written as one undirected edge; the pair reads back undirected, the mark is lost.
 * @category Issue and loss codes
 */
export const MUTUAL_AS_UNDIRECTED_CODE = "W_MUTUAL_AS_UNDIRECTED";

/**
 * Node ids whose written text reads back as the other type under the importer's id rule.
 * @category Issue and loss codes
 */
export const ID_TEXT_TYPE_CODE = "W_ID_TEXT_TYPE";

/**
 * Two node ids would be written as the same text (the number 5 and the text "5"); the save fails with E_INVALID_ID.
 * @category Issue and loss codes
 */
export const ID_TEXT_COLLISION_CODE = "E_ID_TEXT_COLLISION";

/**
 * A `<column>.text` companion the format cannot carry.
 * @category Issue and loss codes
 */
export const TEMPORAL_TEXT_DROPPED_CODE = "W_TEMPORAL_TEXT_DROPPED";

/**
 * A plain column named like the importer's weight key reads back as THE weight.
 * @category Issue and loss codes
 */
export const WEIGHT_KEY_CLASH_CODE = "W_WEIGHT_KEY_CLASH";

/**
 * An attribute without a role is written where the format keeps a role (a `name` column as the label, say), and reads
 * back with that role.
 */
export const ROLE_ASSUMED_CODE = "W_ROLE_ASSUMED";

/**
 * An attribute with a role (the label, say) is written where the format keeps that role, and reads back under the name
 * the format's importer gives it.
 */
export const COLUMN_RENAMED_LOSS_CODE = "W_COLUMN_NAME_CHANGED";

/**
 * A declared column whose every row is unset is not written by a format without declarations.
 * @category Issue and loss codes
 */
export const EMPTY_COLUMN_DROPPED_CODE = "W_EMPTY_COLUMN_DROPPED";

/**
 * A text attribute reads back as a dictionary attribute, or the reverse, because the importer chooses by how often its
 * values repeat. The values are the same.
 * @category Issue and loss codes
 */
export const STORAGE_CLASS_CODE = "W_STORAGE_CLASS_CHANGED";

/**
 * A number attribute whose values are all whole numbers reads back as integers, because the format does not record the
 * type.
 * @category Issue and loss codes
 */
export const INTEGRAL_F64_CODE = "W_INTEGRAL_F64_AS_I32";

/**
 * A text value that reads back as a number or a boolean, because the format does not record that it was text (the text
 * "42" reads back as the number 42).
 */
export const TEXT_INFERRED_CODE = "W_TEXT_INFERRED";

/**
 * A text value holds a character XML 1.0 forbids (most control characters); the save fails with E_COLUMN_TYPE.
 * @category Issue and loss codes
 */
export const XML_ILLEGAL_CHAR_CODE = "E_XML_ILLEGAL_CHAR";

/**
 * An ontology exporter (OBO, OBO Graphs) writes a node column outside its vocabulary as property values; it reads back inside the `property_value` column.
 * @category Issue and loss codes
 */
export const COLUMN_AS_PROPERTY_VALUE_CODE = "W_COLUMN_AS_PROPERTY_VALUE";

/**
 * An ontology exporter writes an edge without a relation as `is_a` (or the relation the caller chose).
 * @category Issue and loss codes
 */
export const RELATION_ASSUMED_CODE = "W_RELATION_ASSUMED";

/**
 * An ontology exporter writes Typedef (property) nodes; they read back as nodes only under the importer's `typedefs: "nodes"`.
 * @category Issue and loss codes
 */
export const TYPEDEF_NODES_CODE = "W_TYPEDEF_NODES";

/**
 * A graph column is written into the file's metadata and reads back in `meta.extra`, not as a column.
 * @category Issue and loss codes
 */
export const GRAPH_COLUMN_AS_METADATA_CODE = "W_GRAPH_COLUMN_AS_METADATA";

/**
 * The file cannot record direction: an undirected graph's edges read back as directed, or the whole graph reads back
 * with the importer's default direction.
 */
export const DIRECTION_DROPPED_CODE = "W_DIRECTION_DROPPED";

/**
 * NaN and the infinities cannot be written; they are written as null and read back unset.
 * @category Issue and loss codes
 */
export const NONFINITE_AS_NULL_CODE = "W_NONFINITE_AS_NULL";

/** The nodes read back in a different order. */
export const NODE_ORDER_CODE = "W_NODE_ORDER";

/**
 * A dictionary attribute without a declared list of allowed values gains one, its distinct values, on re-import.
 * @category Issue and loss codes
 */
export const OPTIONS_GAINED_CODE = "W_OPTIONS_GAINED";

// ============================================================ the input layer

/**
 * The issue codes every importer can record for input it cannot read (empty, too large, invalid
 * bytes, not a graph file), by name; every format's `<FMT>_ISSUE` table includes them.
 * @category Issue and loss codes
 */
export const INPUT_ISSUE = Object.freeze({
    /** The input is empty or holds only whitespace (fatal). */
    EMPTY_INPUT: EMPTY_INPUT_CODE,
    /** The input is longer than one JavaScript string, or holds a line that is (fatal). */
    TOO_LARGE: TOO_LARGE_CODE,
    /** A byte order mark, the encoding option and the declared encoding disagree. */
    ENCODING_CONFLICT: ENCODING_CONFLICT_CODE,
    /** A control character or a stray U+FEFF in the text, or an ignored trailing Ctrl-Z. */
    CONTROL_CHARACTER: CONTROL_CHARACTER_CODE,
    /** The input is an HTML page, a PDF, compressed or archived data or an image (fatal). */
    FOREIGN_FORMAT: FOREIGN_FORMAT_CODE,
    /** Warnings of one code beyond the number a report keeps, counted in one warning. */
    ISSUES_SUPPRESSED: ISSUES_SUPPRESSED_CODE,
});
