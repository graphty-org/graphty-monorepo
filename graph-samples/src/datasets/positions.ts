/**
 * The datasets whose plain columns are node positions, and what kind: each one's download gains a
 * role-`position` column built from them, its coordinate system described, so a consumer finds the
 * positions without knowing the dataset. The plain columns stay as they are.
 */

import { type CoordinateSystemInput, type GraphSnapshot } from "@graphty/graph-format";

/** Which columns hold a dataset's positions, in the order of its coordinate system, and that system. */
interface PositionSource {
    /** x and y, or longitude and latitude. */
    readonly columns: readonly [string, string];
    readonly coordinates: CoordinateSystemInput;
}

/** A saved drawing: the file's own unit, y growing upward. */
const DRAWING: CoordinateSystemInput = { kind: "cartesian", dims: 2, units: "file", yAxis: "up" };

/** The datasets with positions, by name. */
const POSITIONS: ReadonlyMap<string, PositionSource> = new Map<string, PositionSource>([
    // each airport's place on the Earth, in degrees on WGS 84 (OpenFlights' own datum)
    ["openflights", { columns: ["longitude", "latitude"], coordinates: { kind: "geographic", dims: 2 } }],
    // the published drawings, their y already turned to grow upward by graph-io's CX2 and .cys importers
    ...["wikipathways-senescence-autophagy", "bioplex3-hct116", "stelzl-interactome", "yeast-perturbation"].map(
        (name): [string, PositionSource] => [name, { columns: ["x", "y"], coordinates: DRAWING }],
    ),
]);

/**
 * A downloaded dataset with its position column, when it has positions: x, y, 0 (longitude, latitude, 0) per node,
 * NaN where the dataset gives no value.
 * @param name - the dataset name
 * @param snapshot - the decoded dataset
 * @returns the snapshot with a `position` column, or the snapshot itself
 */
export function withPositions(name: string, snapshot: GraphSnapshot): GraphSnapshot {
    const source = POSITIONS.get(name);
    const a = source === undefined ? null : snapshot.nodes.get(source.columns[0]);
    const b = source === undefined ? null : snapshot.nodes.get(source.columns[1]);
    if (source === undefined || a === null || b === null || snapshot.nodes.byRole("position") !== null) {
        return snapshot;
    }
    const data = new Float64Array(3 * snapshot.nodeCount);
    for (let i = 0; i < snapshot.nodeCount; i++) {
        data[3 * i] = a.isSet(i) ? Number(a.value(i)) : Number.NaN;
        data[3 * i + 1] = b.isSet(i) ? Number(b.value(i)) : Number.NaN;
    }
    return snapshot.withColumns({
        position: {
            data,
            decl: { dtype: "f64", components: 3, role: "position", coordinates: source.coordinates },
        },
    });
}
