/**
 * @file The one place a load's stored node positions come from.
 *
 * Every format spells coordinates its own way: y up or y down, the node's center or its top-left
 * corner, a 2D file Pajek pads with z = 0.5. graph-io's `extractPositions` reads them all into one
 * form -- each node's center, y up, in the file's own unit -- and this writes that form onto the
 * node records as `position`, which seeds the layout (and is what the `fixed` layout draws). No
 * reader handles positions on its own.
 */

import type { GraphSnapshot, NodeId } from "@graphty/graph-format";
import type { GraphImporter, ImportReport } from "@graphty/graph-io";
import { extractPositions, type FilePositions } from "@graphty/graph-io/positions";

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
 * Write each node's stored position onto its record as `position: { x, y, z }`, in file units
 * (the element applies `data.knownFields.positionScale`). A node the file gave no position keeps
 * whatever its record already holds; nothing is deleted.
 * @param records - the node records, each holding its `id`
 * @param positions - the file's positions, or null
 * @param indexOf - a node id's row in the snapshot the positions were read from
 */
export function applyFilePositions(
    records: readonly Record<string, unknown>[],
    positions: FilePositions | null,
    indexOf: (id: NodeId) => number,
): void {
    if (positions?.usable !== true) {
        return;
    }

    const { coords } = positions;
    for (const record of records) {
        const row = indexOf(record.id as NodeId);
        const x = row < 0 ? Number.NaN : coords[3 * row];
        if (!Number.isNaN(x)) {
            record.position = { x, y: coords[3 * row + 1], z: coords[3 * row + 2] };
        }
    }
}
