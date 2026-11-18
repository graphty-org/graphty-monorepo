/**
 * @file The one place a load's stored node positions come from.
 *
 * Every format spells coordinates its own way: y up or y down, the node's center or its top-left
 * corner, a 2D file Pajek pads with z = 0.5. graph-io's `extractPositions` reads them all into one
 * form -- each node's center, y up, in the file's own unit -- and graph-io's `placeRecords` writes
 * that form onto the node records as `position`, which seeds the layout (and is what the `fixed`
 * layout draws). No reader handles positions on its own.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import type { GraphImporter, ImportReport } from "@graphty/graph-io";
import { extractPositions, type FilePositions, writtenPositions as writtenFor } from "@graphty/graph-io/positions";

/** What a position read needs: the importer that read the file, its snapshot and its report. */
export interface PositionSource {
    readonly importer: GraphImporter;
    readonly snapshot: GraphSnapshot;
    readonly report: ImportReport;
}

/**
 * The file's stored positions, in graph-io's neutral form.
 * @param imported - the import
 * @returns the positions, or null when the file stores none
 */
export function filePositionsOf(imported: PositionSource): FilePositions | null {
    return extractPositions(imported.importer, imported.snapshot, imported.report);
}

/**
 * Node coordinates in the neutral form (center, y up, file units) as a format's writer expects
 * them, so a file loaded and saved is drawn the same way when loaded again: graph-io's
 * `writtenPositions`.
 * @param format - the format being written
 * @param coords - x, y, z per node; NaN for a node with no position
 * @returns the coordinates to write (the same array when the format needs no conversion)
 */
export function writtenPositions(format: string | undefined, coords: Float64Array): Float64Array {
    return format === undefined ? coords : writtenFor(format, coords);
}
