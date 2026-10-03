/**
 * What the Cytoscape session importer's modules share: the format facts, the column and metadata
 * names it adds, and its issue code table (design `design/graph-io/cytoscape-and-obo/design.md`
 * sections 1.4 and 3).
 */

import {
    AMBIGUOUS_GRAPH_NAME_CODE,
    DANGLING_REFERENCE_CODE,
    EMPTY_INPUT_CODE,
    GRAPH_NOT_FOUND_CODE,
    MULTIPLE_GRAPHS_CODE,
    NO_GRAPH_CODE,
    STYLES_NOT_IMPORTED_CODE,
    TOO_LARGE_CODE,
} from "../../common/codes.js";
import { XGMML_ISSUE } from "../xgmml/constants.js";

/** The format name. */
export const FORMAT = "cys";

/** File extensions. */
export const EXTENSIONS: readonly string[] = Object.freeze([".cys"]);

/** MIME types: Cytoscape declares none, so the generic zip type. */
export const MIME_TYPES: readonly string[] = Object.freeze(["application/zip"]);

/** The `meta.extra` key of the session facts. */
export const META_KEY = "cytoscape";

/** The origin namespace of the columns the session importer adds (selection, hidden state). */
export const CYTOSCAPE_NAMESPACE = "cytoscape";

/** The 2.x selected state (bool node and edge column). */
export const SELECTED_COLUMN = "cytoscape.selected";

/** The 2.x hidden state (bool node and edge column). */
export const HIDDEN_COLUMN = "cytoscape.hidden";

/** The prefix of the node columns of a second and further view's positions (`position@2`). */
export const VIEW_POSITION_PREFIX = "position@";

/** The default total of uncompressed bytes one import may inflate (2 GiB). */
export const DEFAULT_MAX_UNCOMPRESSED = 2 * 1024 * 1024 * 1024;

/** The largest uncompressed-to-compressed ratio an entry may have (real sessions reach 30:1). */
export const MAX_RATIO = 1000;

/**
 * The XGMML codes the session importer relays from the network and view files inside, keyed as
 * every table is (the code without its `E_` / `W_` prefix).
 */
const RELAYED: Readonly<Record<string, string>> = Object.fromEntries(
    Object.values(XGMML_ISSUE).map((code) => [code.replace(/^[EW]_/, ""), code]),
);

/**
 * Issue codes of the Cytoscape session importer: its own, the shared ones it records and the
 * XGMML codes it relays from the files inside (with the entry name in the message).
 */
export const CYS_ISSUE = Object.freeze({
    ...RELAYED,
    /** The input is not a zip archive (or is text). */
    NOT_ZIP: "E_CYS_NOT_ZIP",
    /** The archive is damaged: no end record, offsets outside the file, a bad CRC, truncated data. */
    CORRUPT: "E_CYS_CORRUPT",
    /** A zip without a session marker (`<x.y.z>.version` or `cysession.xml`). */
    NOT_SESSION: "E_CYS_NOT_SESSION",
    /** A zip feature the reader does not support: encryption, a compression method, split archives. */
    UNSUPPORTED: "E_CYS_UNSUPPORTED",
    /** A session version graph-io cannot read: a major above 3, or the 2011 3.0 pre-release layout. */
    VERSION: "E_CYS_VERSION",
    /** A table or a virtual column that cannot be read at all; it is skipped. */
    TABLE: "E_CYS_TABLE",
    /** Table rows with too few or too many cells, a repeated key, or a key matching no element. */
    TABLE_ROW: "W_CYS_TABLE_ROW",
    /** A collapsed group's members are not in the network; they are recorded in meta.extra. */
    COLLAPSED_GROUP: "W_CYS_COLLAPSED_GROUP",
    /** Entries the importer does not read (apps, global tables, properties, images, thumbnails). */
    ENTRY_SKIPPED: "W_CYS_ENTRY_SKIPPED",
    /** Two entries with one name; the first is read. */
    DUPLICATE_ENTRY: "W_CYS_DUPLICATE_ENTRY",
    /** The archive inflates beyond maxUncompressedBytes, or an entry beyond the ratio limit. */
    TOO_LARGE: TOO_LARGE_CODE,
    /** The session's styles are not applied (issue #706). */
    STYLES_NOT_IMPORTED: STYLES_NOT_IMPORTED_CODE,
    /** A view, table or network the session names but does not hold. */
    DANGLING_REFERENCE: DANGLING_REFERENCE_CODE,
    /** The input is empty. */
    EMPTY_INPUT: EMPTY_INPUT_CODE,
    /** The session holds no network. */
    NO_GRAPH: NO_GRAPH_CODE,
    /** The session holds several networks; one was read. */
    MULTIPLE_GRAPHS: MULTIPLE_GRAPHS_CODE,
    /** graphIndex / graphName names no network (fatal). */
    GRAPH_NOT_FOUND: GRAPH_NOT_FOUND_CODE,
    /** graphName names several networks (fatal). */
    AMBIGUOUS_GRAPH_NAME: AMBIGUOUS_GRAPH_NAME_CODE,
});
