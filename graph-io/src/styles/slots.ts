/**
 * Which imported columns hold a format's own style slots rather than data.
 */

import type { ColumnMeta } from "@graphty/graph-format";

// spelled out here rather than imported, so the styles entry loads no format module
/** The origin namespaces of the columns the CX and CX2 importers read a file's bypasses into. */
const BYPASS_NAMESPACES: ReadonlySet<string> = new Set(["cx.bypass", "cx2.bypass"]);

/**
 * Whether an imported column holds the file's own style slots rather than data: the bypasses of a CX or CX2 file,
 * and the `<graphics>` block of an XGMML element (or a Cytoscape session's). An application that draws the file's
 * styles from `extractStyles()` leaves these columns off its records, since the styles carry them.
 * @param meta - the column's metadata
 * @returns true for a style slot
 * @category Styles
 */
export function isStyleSlotColumn(meta: ColumnMeta): boolean {
    const { origin } = meta;
    return (
        (typeof origin?.namespace === "string" && BYPASS_NAMESPACES.has(origin.namespace)) ||
        (meta.dtype === "json" && origin?.type === "graphics" && origin.namespace === "xgmml")
    );
}
