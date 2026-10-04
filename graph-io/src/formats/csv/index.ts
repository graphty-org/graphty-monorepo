/**
 * The CSV / TSV importer and exporter of @graphty/graph-io: the subpath entry `@graphty/graph-io/csv`.
 * @module @graphty/graph-io/csv
 */

import {
    COLUMN_RENAMED_CODE,
    DIRECTION_FORCED_CODE,
    DIRECTION_REFUSED_CODE,
    ENCODING_FALLBACK_CODE,
    INPUT_ISSUE,
    INVALID_ENCODING_CODE,
    INVALID_UTF8_CODE,
    MIXED_DIRECTION_CODE,
    OPTION_IGNORED_CODE,
    PRECISION_CODE,
    SINK_OPTION_CODE,
    UNKNOWN_ENCODING_CODE,
} from "../../common/codes.js";
import { WIDENING_UNSUPPORTED_CODE } from "../../common/text.js";
import {
    AMBIGUOUS_COLUMN_CODE,
    BAD_TYPE_CODE,
    COLUMN_MISSING_CODE,
    COMMENT_DIRECTION_CODE,
    COMMENT_LIKE_RECORD_CODE,
    DUPLICATE_EDGE_ID_CODE,
    DUPLICATE_NODE_CODE,
    EMPTY_INPUT_CODE,
    FIELD_COUNT_CODE,
    ID_MERGED_CODE,
    MISSING_ENDPOINT_CODE,
    MISSING_ID_CODE,
    NO_DATA_ROWS_CODE,
    NO_ENDPOINT_COLUMNS_CODE,
    NO_ID_COLUMN_CODE,
    OTHER_FORMAT_CODE,
    PADDED_ID_CODE,
    ROLE_TAKEN_CODE,
    SINGLE_COLUMN_CODE,
    STRAY_QUOTE_CODE,
    TRAILING_DELIMITER_CODE,
    TRAILING_HEADER_DELIMITER_CODE,
    TYPE_COLUMN_IGNORED_CODE,
    WEIGHT_AS_ATTRIBUTE_CODE,
} from "./importer.js";
import { BAD_QUOTE_CODE, UNCLOSED_QUOTE_CODE } from "./records.js";

export { CSV_CAPABILITIES, CSV_LOSS, csvExporter, type CsvExportOptions } from "./exporter.js";
export { type CsvColumnRef } from "./header.js";
export { csvImporter, type CsvImportOptions } from "./importer.js";

/**
 * The issue codes the CSV importer records, by name: the codes shared with
 * the other importers and the CSV-specific ones. A key is the code without
 * its severity and format prefixes.
 * @category Built-in formats
 */
export const CSV_ISSUE = Object.freeze({
    ...INPUT_ISSUE,
    /** An integer beyond 2^53 was stored as the nearest 64-bit float; reported once per column. */
    PRECISION: PRECISION_CODE,
    /** The input is empty. The import stops. */
    EMPTY_INPUT: EMPTY_INPUT_CODE,
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
    /**
     * The header names no source and target columns and no id column. Pass `sourceColumn` and `targetColumn` to name
     * the columns. The import stops.
     */
    NO_ENDPOINT_COLUMNS: NO_ENDPOINT_COLUMNS_CODE,
    /**
     * The node table has no id column. Pass `idColumn` to name it, or `rowNumberIds: true` to number the rows. The
     * import stops.
     */
    NO_ID_COLUMN: NO_ID_COLUMN_CODE,
    /** A row with a different field count than the header. */
    FIELD_COUNT: FIELD_COUNT_CODE,
    /** An edge row with a blank source or target. */
    MISSING_ENDPOINT: MISSING_ENDPOINT_CODE,
    /** A node row with a blank id. */
    MISSING_ID: MISSING_ID_CODE,
    /** A Type cell outside Directed / Undirected / Mutual. */
    BAD_TYPE: BAD_TYPE_CODE,
    /** A quoted field is never closed. The import stops. */
    UNCLOSED_QUOTE: UNCLOSED_QUOTE_CODE,
    /**
     * There is text after a closing quote, such as `"a"b`. Inside a quoted field, write a quote as two quotes. The
     * import stops.
     */
    QUOTE: BAD_QUOTE_CODE,
    /** A header and no data rows. */
    NO_DATA_ROWS: NO_DATA_ROWS_CODE,
    /** A node table row repeating an id. */
    DUPLICATE_NODE: DUPLICATE_NODE_CODE,
    /** An edge row repeating an edge id (skipped). */
    DUPLICATE_EDGE_ID: DUPLICATE_EDGE_ID_CODE,
    /** Two different id cells became the same number because `ids` is "number", so their nodes were merged. */
    ID_MERGED: ID_MERGED_CODE,
    /** An explicitly named weight column the file does not have. */
    COLUMN_MISSING: COLUMN_MISSING_CODE,
    /**
     * You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as
     * a plain attribute.
     */
    ROLE_TAKEN: ROLE_TAKEN_CODE,
    /**
     * An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a
     * repeated column header.
     */
    COLUMN_RENAMED: COLUMN_RENAMED_CODE,
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
     * Your graph builder cannot change an attribute's type after its first value, so a text column keeps the type of
     * its first values.
     */
    WIDENING_UNSUPPORTED: WIDENING_UNSUPPORTED_CODE,
    /** The input starts like another format (XML or HTML, JSON, GML, DOT or Pajek), not CSV. The import stops. */
    OTHER_FORMAT: OTHER_FORMAT_CODE,
    /**
     * A quote inside a field that does not start with a quote is kept as part of the text. Reported once per import.
     */
    STRAY_QUOTE: STRAY_QUOTE_CODE,
    /** A leading comment's direction disagrees with defaultDirected or an earlier comment. */
    COMMENT_DIRECTION: COMMENT_DIRECTION_CODE,
    /**
     * A column named like `Type` holds direction words (Directed, Undirected), but graph-io reads direction only from
     * a `Type` column beside `Source` and `Target`, or from the `typeColumn` option. Reported once per import.
     */
    TYPE_COLUMN_IGNORED: TYPE_COLUMN_IGNORED_CODE,
    /** The header ends in a delimiter; rows without the empty last cell are complete. */
    TRAILING_HEADER_DELIMITER: TRAILING_HEADER_DELIMITER_CODE,
    /** Every row is one cell another delimiter would split (a likely wrong delimiter option). */
    SINGLE_COLUMN: SINGLE_COLUMN_CODE,
    /** Several header columns name one role; the one not chosen is a plain attribute. */
    AMBIGUOUS_COLUMN: AMBIGUOUS_COLUMN_CODE,
    /**
     * An id that is not quoted has spaces at its start or end; they are kept, so it is a different id from the trimmed
     * text. Reported once per import.
     */
    PADDED_ID: PADDED_ID_CODE,
    /** A leading # / % line skipped as a comment has the fields of a record. */
    COMMENT_LIKE_RECORD: COMMENT_LIKE_RECORD_CODE,
    /** Every data row ends in one extra delimiter; the empty last cell is dropped. Reported once per import. */
    TRAILING_DELIMITER: TRAILING_DELIMITER_CODE,
    /**
     * In a file without a header, the third column holds text, so it is read as an attribute, not as the edge weight.
     * Reported once per import.
     */
    WEIGHT_AS_ATTRIBUTE: WEIGHT_AS_ATTRIBUTE_CODE,
});
