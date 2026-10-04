/**
 * The issue and loss codes shared by more than one format (design section 8.6: "a stable code
 * such as E_UNKNOWN_NODE or W_WIDENED"): one constant per condition, aliased by every format's
 * `<FMT>_ISSUE` / `<FMT>_LOSS` table, so a consumer can switch on a condition without knowing the
 * format and two importers never spell the same condition differently. A condition specific to one
 * format keeps that format's own `E_<FMT>_` / `W_<FMT>_` code next to its importer or exporter.
 *
 * Naming scheme: `E_` for an issue recorded with severity "error" (or a loss note whose export()
 * throws), `W_` for a warning; a table key is the code without the severity prefix and without the
 * format prefix.
 */

// ============================================================ importer issues

/** The element (node, attribute, key, ...) has no id where the format requires one. */
export const MISSING_ID_CODE = "E_MISSING_ID";

/** An edge has no source or no target. */
export const MISSING_ENDPOINT_CODE = "E_MISSING_ENDPOINT";

/** A node id declared twice; the second declaration merges into the first. */
export const DUPLICATE_NODE_CODE = "W_DUPLICATE_NODE";

/** The document declares no graph at all (fatal). */
export const NO_GRAPH_CODE = "E_NO_GRAPH";

/** A second graph in one document is merged into the first. */
export const MULTIPLE_GRAPHS_CODE = "W_MULTIPLE_GRAPHS";

/** The input is empty (fatal). */
export const EMPTY_INPUT_CODE = "E_EMPTY_INPUT";

/** The text grammar of the format is violated (fatal; the message carries the detail). */
export const SYNTAX_CODE = "E_SYNTAX";

/** The XML is not well-formed (fatal; the message carries the detail and the line). */
export const XML_SYNTAX_CODE = "E_XML_SYNTAX";

/** An element the format does not define at that place was skipped. */
export const UNKNOWN_ELEMENT_CODE = "W_UNKNOWN_ELEMENT";

/** Text where the format allows only elements was ignored. */
export const STRAY_TEXT_CODE = "W_STRAY_TEXT";

/** A `pid` / parent reference names a node the document never declares. */
export const UNKNOWN_PARENT_CODE = "E_UNKNOWN_PARENT";

/** A hyperedge under the `hyperedges: "error"` policy (fatal). */
export const HYPEREDGE_CODE = "E_HYPEREDGE";

/** A declaration's key / attribute id is declared twice. */
export const DUPLICATE_KEY_CODE = "E_DUPLICATE_KEY";

/**
 * A column was renamed `<name>#<origin.id>` because the name was taken in the sink's table
 * (design section 5.6).
 */
export const COLUMN_RENAMED_CODE = "W_COLUMN_RENAMED";

/** A column's role was dropped because another column of the table already holds it (design section 5.5). */
export const ROLE_TAKEN_CODE = "W_ROLE_TAKEN";

/** A long value beyond 2^53 was stored as the nearest f64 (design section 5.1). */
export const PRECISION_CODE = "W_PRECISION";

/** Two distinct id texts became one number under ids "number" (design section 4.1). */
export const ID_MERGED_CODE = "W_ID_MERGED";

/** A builder-policy option the caller asked for that the sink does not honour (design section 8.4). */
export const SINK_OPTION_CODE = "W_SINK_OPTION";

/** A common option the format has no use for (or cannot honour) was given a non-default value (design section 8.4). */
export const OPTION_IGNORED_CODE = "W_OPTION_IGNORED";

/** An invalid UTF-8 sequence in the input (fatal). */
export const INVALID_UTF8_CODE = "E_INVALID_UTF8";

/** Bytes that are not valid in the encoding a BOM, a declaration or the `encoding` option chose (fatal). */
export const INVALID_ENCODING_CODE = "E_INVALID_ENCODING";

/** Bytes that are not valid UTF-8 (and declare no other encoding) were read as windows-1252. */
export const ENCODING_FALLBACK_CODE = "W_ENCODING_FALLBACK";

/** The file declares an encoding the platform's TextDecoder does not know; the declaration is ignored. */
export const UNKNOWN_ENCODING_CODE = "W_UNKNOWN_ENCODING";

/**
 * A byte order mark, the `encoding` option and the encoding the file declares disagree, or the file
 * declares UTF-16 over bytes that are not UTF-16; the message names which one applied (a BOM wins
 * over the option and the declaration, the option over the declaration).
 */
export const ENCODING_CONFLICT_CODE = "W_ENCODING_CONFLICT";

/**
 * The text holds a control character (C0 other than TAB, LF, FF and CR; DEL; C1) or a stray U+FEFF
 * that is kept in the id or value it is part of, or a trailing Ctrl-Z end-of-file marker that was
 * ignored; recorded once per import.
 */
export const CONTROL_CHARACTER_CODE = "W_CONTROL_CHARACTER";

/**
 * The input is a known file type that is no graph format at all (an HTML page, a PDF, gzip or zip
 * data, a PNG image), so it is not read as the format asked for (fatal).
 */
export const FOREIGN_FORMAT_CODE = "E_FOREIGN_FORMAT";

/**
 * More warnings of one code than a report keeps: the first ones are kept and this one warning (the
 * suppressed code as its element) counts the rest.
 */
export const ISSUES_SUPPRESSED_CODE = "W_ISSUES_SUPPRESSED";

/** An XML attribute the format does not define (or does not keep) on that element; it is not kept. */
export const UNKNOWN_XML_ATTRIBUTE_CODE = "W_UNKNOWN_XML_ATTRIBUTE";

/** The sink refused the file's direction (locked or non-empty); the file is read as the sink's. */
export const DIRECTION_REFUSED_CODE = "W_DIRECTION_REFUSED";

/** Edges of the other direction were forced to the policy's direction. */
export const DIRECTION_FORCED_CODE = "W_DIRECTION_FORCED";

/** A mixed-direction file under onMixedDirection "error" (import), or a mixed snapshot under the same export policy. */
export const MIXED_DIRECTION_CODE = "E_MIXED_DIRECTION";

/** A `count` / `parse.nodes` hint the sink cannot reserve (ignored). */
export const COUNT_HINT_CODE = "W_COUNT_HINT";

/** The declared type is not one the format defines; the column is kept as string. */
export const UNKNOWN_ATTR_TYPE_CODE = "W_UNKNOWN_ATTR_TYPE";

/** The declared default does not parse as the declared type; the column has no default. */
export const BAD_DEFAULT_CODE = "W_BAD_DEFAULT";

/** A declared option does not parse as the declared type; the options are dropped. */
export const BAD_OPTIONS_CODE = "W_BAD_OPTIONS";

/** A repeated edge id in a format whose edge ids are unique; the second edge is skipped. */
export const DUPLICATE_EDGE_ID_CODE = "E_DUPLICATE_EDGE_ID";

/** A value does not parse as its declared type; the cell is left unset. */
export const BAD_VALUE_CODE = "E_BAD_VALUE";

/**
 * A column's dtype was widened (design section 5.1) because a later value did not fit: an i32
 * column meeting a value above 2^31, two declared types for one attribute.
 */
export const WIDENED_CODE = "W_WIDENED";

/**
 * A reference that is not a containment link (an attribute's element id, a layout or bypass
 * entry, a subnetwork member, a view's network, an undeclared target) names nothing; reported
 * once per kind with the count.
 */
export const DANGLING_REFERENCE_CODE = "W_DANGLING_REFERENCE";

/** The same attribute twice on one element; one value is kept (the later, unless the format's specification says the first). */
export const DUPLICATE_ATTRIBUTE_CODE = "W_DUPLICATE_ATTRIBUTE";

/** A containment link would close a parent cycle; that one link is dropped. */
export const PARENT_CYCLE_CODE = "E_PARENT_CYCLE";

/** A formula (Cytoscape's `=ABS($x)`) is kept as its text; it is never evaluated. */
export const EQUATION_AS_TEXT_CODE = "W_EQUATION_AS_TEXT";

/**
 * The file's style rules (defaults, mappings, dependencies, visual property aspects) are not
 * applied to the snapshot; recorded once per import, the message names what was not applied.
 */
export const STYLES_NOT_IMPORTED_CODE = "W_STYLES_NOT_IMPORTED";

/** A CX array member that is not a one-key object holding an array or an object; the block is skipped. */
export const BAD_ASPECT_BLOCK_CODE = "E_BAD_ASPECT_BLOCK";

/** A CX array member holding several aspects (`{"nodes": [...], "edges": [...]}`); each array-valued key is read as its own fragment. */
export const MULTI_ASPECT_FRAGMENT_CODE = "W_MULTI_ASPECT_FRAGMENT";

/** A CX aspect, an array of elements, written as one object (`{"nodes": {"@id": 1}}`); read as one element. */
export const SINGLE_OBJECT_ASPECT_CODE = "W_SINGLE_OBJECT_ASPECT";

/**
 * The document uses the bare tokens NaN, Infinity or -Infinity (Python's json writes them), which
 * strict JSON does not allow; read as the numbers.
 */
export const JSON_NONSTANDARD_NUMBER_CODE = "W_JSON_NONSTANDARD_NUMBER";

/** A CX aspect out of its place (after the post-metadata, a status that is not last, a block buffered for what it depends on). */
export const ASPECT_ORDER_CODE = "W_ASPECT_ORDER";

/** A declared element count disagrees with what was read. */
export const COUNT_MISMATCH_CODE = "W_COUNT_MISMATCH";

/** The producer marked the document as failed (CX `status.success: false`): it is incomplete (fatal). */
export const STATUS_FAILED_CODE = "E_STATUS_FAILED";

/** The producer marked the document as successful but attached an error text. */
export const STATUS_WARNING_CODE = "W_STATUS_WARNING";

/**
 * The input is beyond a size limit (a zip's uncompressed total or ratio, a document longer than
 * one string); the same string as graph-format's E_TOO_LARGE, recorded with category "unsupported".
 */
export const TOO_LARGE_CODE = "E_TOO_LARGE";

/** `graphIndex` is beyond the graphs of the input, or `graphName` names none of them (fatal). */
export const GRAPH_NOT_FOUND_CODE = "E_GRAPH_NOT_FOUND";

/** `graphName` names more than one graph of the input; the message lists their indexes (fatal). */
export const AMBIGUOUS_GRAPH_NAME_CODE = "E_AMBIGUOUS_GRAPH_NAME";

// ============================================================ exporter loss notes

/** A role column the format has no slot for is written as a plain attribute (the role is lost). */
export const ROLE_DROPPED_CODE = "W_ROLE_DROPPED";

/** A parents (multi-parent) column in a format with single containment only. */
export const PARENTS_DROPPED_CODE = "W_PARENTS_DROPPED";

/** A start / end / timestamp column in a format without temporal support. */
export const TEMPORAL_DROPPED_CODE = "W_TEMPORAL_DROPPED";

/** A mutual pair is written as two directed edges without the mutual mark. */
export const MUTUAL_EXPANDED_CODE = "W_MUTUAL_EXPANDED";

/** A mutual pair is written as one undirected edge; the pair reads back undirected, the mark is lost. */
export const MUTUAL_AS_UNDIRECTED_CODE = "W_MUTUAL_AS_UNDIRECTED";

/** Node ids whose written text reads back as the other type under the importer's id rule. */
export const ID_TEXT_TYPE_CODE = "W_ID_TEXT_TYPE";

/** Two node ids share one written text; export() throws E_INVALID_ID. */
export const ID_TEXT_COLLISION_CODE = "E_ID_TEXT_COLLISION";

/** A `<column>.text` companion (design section 5.1) the format cannot carry. */
export const TEMPORAL_TEXT_DROPPED_CODE = "W_TEMPORAL_TEXT_DROPPED";

/** A plain column named like the importer's weight key reads back as THE weight. */
export const WEIGHT_KEY_CLASH_CODE = "W_WEIGHT_KEY_CLASH";

/** A role-less column whose written name the importer maps to a role. */
export const ROLE_ASSUMED_CODE = "W_ROLE_ASSUMED";

/** A role column written into the format's slot reads back under the importer's fixed name. */
export const COLUMN_RENAMED_LOSS_CODE = "W_COLUMN_NAME_CHANGED";

/** A declared column whose every row is unset is not written by a format without declarations. */
export const EMPTY_COLUMN_DROPPED_CODE = "W_EMPTY_COLUMN_DROPPED";

/** A string / dict column whose cardinality makes the importer read it back as the other storage class. */
export const STORAGE_CLASS_CODE = "W_STORAGE_CLASS_CHANGED";

/** An f64 column whose set values are all integral reads back as i32 through an untyped format. */
export const INTEGRAL_F64_CODE = "W_INTEGRAL_F64_AS_I32";

/** A text cell that reads back as a number or boolean under the 5.1 grammar (its lexical form may change). */
export const TEXT_INFERRED_CODE = "W_TEXT_INFERRED";

/** A string cell holding a character XML 1.0 forbids; export() throws E_COLUMN_TYPE. */
export const XML_ILLEGAL_CHAR_CODE = "E_XML_ILLEGAL_CHAR";

/** A dict column without declared options gains one from its dictionary on re-import. */
export const OPTIONS_GAINED_CODE = "W_OPTIONS_GAINED";


// ============================================================ the input layer

/**
 * The issue codes the shared input layer (src/common/input.ts and the report) records for every
 * text importer, by name; each format's `<FMT>_ISSUE` table spreads it, so these codes are members
 * of every table.
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
