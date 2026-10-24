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
