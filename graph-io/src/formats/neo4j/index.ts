/**
 * The `@graphty/graph-io/neo4j` subpath: the Neo4j importer and exporter with their option types,
 * the names of the reserved columns and the issue and loss-note codes
 * grouped in two tables.
 * @module @graphty/graph-io/neo4j
 */

import {
    COLUMN_RENAMED_CODE,
    ELEMENT_ISSUE,
    ENCODING_FALLBACK_CODE,
    INPUT_ISSUE,
    INVALID_ENCODING_CODE,
    INVALID_UTF8_CODE,
    MUTUAL_EXPANDED_CODE,
    OPTION_IGNORED_CODE,
    PRECISION_CODE,
    ROLE_DROPPED_CODE,
    SINK_OPTION_CODE,
    UNKNOWN_ATTR_TYPE_CODE,
    UNKNOWN_ENCODING_CODE,
    WEIGHT_KEY_CLASH_CODE,
} from "../../common/codes.js";
import { BAD_QUOTE_CODE, UNCLOSED_QUOTE_CODE } from "../csv/records.js";
import {
    ARRAY_DELIMITER_LOSS,
    DECLARED_TYPE_CHANGED_LOSS,
    ID_COLUMN_TAKEN_LOSS,
    ID_TEXT_COLLISION_LOSS,
    ID_TEXT_TYPE_LOSS,
    MULTIPLE_ID_PROPERTIES_LOSS,
    UNDIRECTED_LOSS,
    WEIGHT_COLUMN_TAKEN_LOSS,
} from "./exporter.js";
import {
    COLUMN_COUNT_CODE,
    DANGLING_REFERENCE_CODE,
    DUPLICATE_NODE_CODE,
    ENDPOINT_SPACE_CODE,
    HEADER_CODE,
    HEADER_OPTION_CODE,
    ID_MERGED_CODE,
    ID_SPACE_COLLISION_CODE,
    IGNORED_COLUMNS_LOSS,
    MISSING_ENDPOINT_CODE,
    MISSING_ID_CODE,
    MISSING_TYPE_CODE,
    ROLE_TAKEN_CODE,
    SECTION_KIND_CODE,
} from "./importer.js";

export { NEO4J_CAPABILITIES, neo4jExporter, type Neo4jExportOptions } from "./exporter.js";
export {
    ID_SPACE_COLUMN,
    LABELS_COLUMN,
    neo4jImporter,
    type Neo4jImportOptions,
    ORIGINAL_ID_COLUMN,
    TYPE_COLUMN,
} from "./importer.js";

/**
 * The issue codes the Neo4j importer records, by name: the codes shared with
 * the other importers and the Neo4j-specific ones.
 * A key is the code without its severity and format prefixes.
 * @category Built-in formats
 */
export const NEO4J_ISSUE = Object.freeze({
    ...INPUT_ISSUE,
    ...ELEMENT_ISSUE,
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
    /** A quoted field is never closed. The import stops. */
    CSV_UNCLOSED_QUOTE: UNCLOSED_QUOTE_CODE,
    /**
     * There is text after a closing quote, such as `"a"b`. Inside a quoted field, write a quote as two quotes. The
     * import stops.
     */
    CSV_QUOTE: BAD_QUOTE_CODE,
    /** The file has no header, or a header neo4j-admin would refuse. The import stops. */
    HEADER: HEADER_CODE,
    /** A row with a different field count than the header. */
    COLUMN_COUNT: COLUMN_COUNT_CODE,
    /** A node row without an id. */
    MISSING_ID: MISSING_ID_CODE,
    /** A relationship row without a start or end id. */
    MISSING_ENDPOINT: MISSING_ENDPOINT_CODE,
    /** A node id repeated in one id space (last write wins). */
    DUPLICATE_NODE: DUPLICATE_NODE_CODE,
    /** A spaced node id `Space:id` that equals the text of an id declared without a space. */
    ID_SPACE_COLLISION: ID_SPACE_COLLISION_CODE,
    /** A spaced relationship endpoint `Space:id` that names a node declared without a space; the row is skipped. */
    ENDPOINT_SPACE: ENDPOINT_SPACE_CODE,
    /** Two different id texts became the same number because `ids` is "number", so their nodes were merged. */
    ID_MERGED: ID_MERGED_CODE,
    /** A header brace option the importer does not apply. */
    HEADER_OPTION_IGNORED: HEADER_OPTION_CODE,
    /** A declared type the format does not define (kept as string). */
    UNKNOWN_ATTR_TYPE: UNKNOWN_ATTR_TYPE_CODE,
    /** An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit. */
    PRECISION: PRECISION_CODE,
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
    /** You set an option this format does not use; it had no effect. The message names the option. */
    OPTION_IGNORED: OPTION_IGNORED_CODE,
    /**
     * You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`,
     * `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.
     */
    SINK_OPTION: SINK_OPTION_CODE,
    /** A relationship with an empty :TYPE cell (neo4j-admin requires one); kept without a type. */
    MISSING_TYPE: MISSING_TYPE_CODE,
    /** A file under the nodes option holds a relationship header, or the reverse; read by its header. */
    SECTION_KIND: SECTION_KIND_CODE,
    /** Relationship endpoints no node row declares became nodes (neo4j-admin refuses them). */
    DANGLING_REFERENCE: DANGLING_REFERENCE_CODE,
});

/**
 * The loss-note codes of the Neo4j importer (report.lossy) and exporter (check()), by name: the
 * Neo4j ones and, aliased, the shared ones it records (`LOSS` holds the generic pre-flight's).
 * @category Built-in formats
 */
export const NEO4J_LOSS = Object.freeze({
    /** `:IGNORE` columns skipped on import. */
    IGNORED_COLUMNS: IGNORED_COLUMNS_LOSS,
    /**
     * Neo4j relationships are always directed, so the edges of an undirected graph, and the undirected edges of a
     * mixed graph, read back as directed.
     */
    UNDIRECTED_AS_DIRECTED: UNDIRECTED_LOSS,
    /** A mutual pair written as two directed relationships without its mark. */
    MUTUAL_EXPANDED: MUTUAL_EXPANDED_CODE,
    /** An attribute with a role the format has no place for is written as a plain attribute; the role is lost. */
    ROLE_DROPPED: ROLE_DROPPED_CODE,
    /**
     * An attribute named `weight` without the weight role reads back as the edge weight, because GEXF reads weights
     * from `weight` by default.
     */
    WEIGHT_KEY_CLASH: WEIGHT_KEY_CLASH_CODE,
    /**
     * A node id that reads back as a different type, such as the text "7" as the number 7. Read the file with `ids:
     * "string"` or `ids: "keep"` to keep the type.
     */
    ID_TEXT_TYPE: ID_TEXT_TYPE_LOSS,
    /** Two node ids would be written as the same text (the number 5 and the text "5"); the save fails with E_INVALID_ID. */
    ID_TEXT_COLLISION: ID_TEXT_COLLISION_LOSS,
    /** The `weightColumn` name is already an edge attribute; the save fails. */
    WEIGHT_COLUMN_TAKEN: WEIGHT_COLUMN_TAKEN_LOSS,
    /** The `idColumn` name is already a node attribute; the save fails. */
    ID_COLUMN_TAKEN: ID_COLUMN_TAKEN_LOSS,
    /** Several stored-id properties; one becomes the `:ID` column. */
    MULTIPLE_ID_PROPERTIES: MULTIPLE_ID_PROPERTIES_LOSS,
    /** An integer-typed column with non-integral values written as double. */
    DECLARED_TYPE_CHANGED: DECLARED_TYPE_CHANGED_LOSS,
    /** A list item containing the array delimiter, which Neo4j cannot escape. */
    ARRAY_DELIMITER: ARRAY_DELIMITER_LOSS,
});
