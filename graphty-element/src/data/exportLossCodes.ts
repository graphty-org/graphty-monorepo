/**
 * Every code a built-in writer reports among `ExportResult.losses`, as a runtime list, so an
 * application that words losses can check it has words for each one.
 */

import {
    CSV_LOSS,
    CX_LOSS,
    CX2_LOSS,
    CYS_LOSS,
    DOT_LOSS,
    GEXF_LOSS,
    GML_LOSS,
    GRAPHML_LOSS,
    JSON_LOSS,
    LOSS,
    NEO4J_LOSS,
    PAJEK_LOSS,
    XGMML_LOSS,
} from "@graphty/graph-io";

import { EXPORT_STYLE_LOSS_CODES } from "../session/styles/fileStyles/codes";
import type { ExportLossCode } from "./export";

/** The codes graphty-element adds to graph-io's own. */
const ELEMENT_LOSS_CODES = [
    "W_GRAPHTY_COLUMN_DROPPED",
    "W_GRAPHTY_NOTES",
    "W_GRAPHTY_TRUNCATED",
    "W_GRAPHTY_CSV_NEUTRALIZED",
    "W_WEIGHT_NOT_NUMERIC",
    "W_RESULT_FIELD_DROPPED",
] as const satisfies readonly ExportLossCode[];

/**
 * The codes of losses that are a format's normal behavior: a kind of information the format (or
 * the table chosen) has no place for at all, so every graph that holds it loses it there, such as
 * positions in CSV or styles in a format that writes none. The nodes, edges, ids and attribute
 * values the file does hold are written as they are. Every other code changes or drops part of
 * the data itself (ids rewritten, edges or columns dropped, values that read back differently)
 * or refuses the export. `ExportLoss.expected` reads this list.
 */
export const EXPECTED_EXPORT_LOSS_CODES: ReadonlySet<string> = new Set([
    "W_POSITIONS_DROPPED",
    "W_VIZ_DROPPED",
    "W_GRAPH_ATTRIBUTES_DROPPED",
    "W_DEFAULT_DROPPED",
    "W_OPTIONS_DROPPED",
    "W_EDGE_IDS_DROPPED",
    "W_EDGE_IDS_GENERATED",
    "W_NODE_ORDER",
    "W_CSV_NODE_TABLE",
    "W_CSV_ISOLATED_NODES",
    "W_CSV_DIRECTION_DROPPED",
    "W_GRAPHTY_COLUMN_DROPPED",
    "W_GRAPHTY_NOTES",
    "W_STYLES_NOT_EXPORTED",
    "W_STYLE_NOT_WRITTEN",
    "W_STYLE_RULES_NOT_KEPT",
] as const satisfies readonly ExportLossCode[]);

/**
 * Every `ExportLossCode` a built-in writer can report, each once. A writer registered with
 * `registerFormatWriter` reports its own codes, which this list does not hold.
 */
export const EXPORT_LOSS_CODES: readonly ExportLossCode[] = Object.freeze([
    ...new Set<ExportLossCode>([
        ...Object.values(LOSS),
        ...Object.values(CSV_LOSS),
        ...Object.values(CX_LOSS),
        ...Object.values(CX2_LOSS),
        ...Object.values(CYS_LOSS),
        ...Object.values(DOT_LOSS),
        ...Object.values(GEXF_LOSS),
        ...Object.values(GML_LOSS),
        ...Object.values(GRAPHML_LOSS),
        ...Object.values(JSON_LOSS),
        ...Object.values(NEO4J_LOSS),
        ...Object.values(PAJEK_LOSS),
        ...Object.values(XGMML_LOSS),
        ...ELEMENT_LOSS_CODES,
        ...EXPORT_STYLE_LOSS_CODES,
    ]),
]);
