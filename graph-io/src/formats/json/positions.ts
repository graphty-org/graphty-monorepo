/**
 * How a JSON file's positions are spelled, for `extractPositions()`. A Cytoscape `elements`
 * document has a role-`position` column the importer already flipped to y up. A plain
 * `{ nodes: [{ x, y }] }` file is read as graphty-element's own convention (center, y up, file
 * units) and never flipped, unless it carries a positive marker of a y-down tool: d3-force's
 * simulation keys (`vx`, `vy`, `fx`, `fy`, `index`) or vis's `physics`.
 */

import type { Column, GraphSnapshot } from "@graphty/graph-format";

import type { ImporterPositions } from "../../positions/types.js";

/** Node keys that mark a y-down drawing. */
const Y_DOWN_MARKERS = ["vx", "vy", "fx", "fy", "index", "physics"] as const;

/**
 * The spelling of a JSON file's positions.
 * @param snapshot - the graph the JSON importer read
 * @returns the plain x / y columns, or null to read the role-`position` column as declared
 */
export function jsonPositions(snapshot: GraphSnapshot): ImporterPositions | null {
    if (snapshot.nodes.byRole("position") !== null) {
        return null;
    }
    const x = numeric(snapshot.nodes.get("x"));
    const y = numeric(snapshot.nodes.get("y"));
    if (x === null || y === null) {
        return null;
    }
    const z = numeric(snapshot.nodes.get("z"));
    // a z means a 3D drawing (3d-force-graph), drawn y up even with the d3 keys
    const down = z === null && Y_DOWN_MARKERS.some((name) => snapshot.nodes.get(name) !== null);
    return {
        x: x.meta.name,
        y: y.meta.name,
        ...(z === null ? {} : { z: z.meta.name }),
        yAxis: down ? "down" : "up",
        units: down ? "px" : "file",
    };
}

/**
 * A column when it holds one number per node.
 * @param column - the column, or null
 * @returns the column, or null when it is missing or not numeric
 */
function numeric(column: Column | null): Column | null {
    const numericDtypes: readonly string[] = ["f64", "f32", "i32", "u32", "u8"];
    return column !== null && column.meta.components === 1 && numericDtypes.includes(column.dtype) ? column : null;
}
