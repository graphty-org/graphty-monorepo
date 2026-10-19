/**
 * How a JSON file's positions are spelled, for `extractPositions()`. A Cytoscape `elements`
 * document has a role-`position` column the importer already flipped to y up. A plain
 * `{ nodes: [{ x, y }] }` file is read as graphty-element's own convention (center, y up, file
 * units) and never flipped, unless it carries a positive marker of a y-down tool: d3-force's
 * simulation keys (`vx`, `vy`, `fx`, `fy`, `index`) or vis's `physics`. A vis-network document
 * (edges with `from` / `to`) is always y down in canvas px: vis-network draws `x` / `y` straight onto
 * its canvas. A Cytoscape compound node's saved position is not read: Cytoscape.js draws a compound
 * around its children.
 */

import type { Column, GraphSnapshot } from "@graphty/graph-format";

import type { ImporterPositions, ViewerFit } from "../../positions/types.js";
import { jsonShapeOf } from "./dialect.js";

/**
 * How sigma.js fits a graphology graph into its canvas: the bounding box of the positions, 30 px in
 * from each side, with node sizes in the positions' unit and label sizes in the canvas's px
 * (sigma 4.0.1 settings: `stagePadding: 30`, `itemSizesReference: "positions"`, `autoRescale: true`).
 */
const SIGMA_FIT: ViewerFit = { padding: 30 };

/** Node keys that mark a y-down drawing. */
const Y_DOWN_MARKERS = ["vx", "vy", "fx", "fy", "index", "physics"] as const;

/**
 * The spelling of a JSON file's positions.
 * @param snapshot - the graph the JSON importer read
 * @returns the plain x / y columns, the role-`position` column's spelling, or null to read that column as declared
 */
export function jsonPositions(snapshot: GraphSnapshot): ImporterPositions | null {
    if (snapshot.nodes.byRole("position") !== null) {
        // cy.json() saves a compound node's position too, but Cytoscape.js draws the compound around its children
        return jsonShapeOf(snapshot)?.dialect === "cytoscape" ? { containersFollowChildren: true } : null;
    }
    const x = numeric(snapshot.nodes.get("x"));
    const y = numeric(snapshot.nodes.get("y"));
    if (x === null || y === null) {
        return null;
    }
    const z = numeric(snapshot.nodes.get("z"));
    // a z means a 3D drawing (3d-force-graph), drawn y up even with the d3 keys
    const dialect = jsonShapeOf(snapshot)?.dialect;
    // sigma.js draws every graphology file y up: d3-force's keys in one do not make it a d3 drawing
    // (graphology-specimen-node-sizes-opacity-p3)
    const markers = dialect !== "graphology" && Y_DOWN_MARKERS.some((name) => snapshot.nodes.get(name) !== null);
    const down = z === null && (dialect === "vis" || markers);
    return {
        x: x.meta.name,
        y: y.meta.name,
        ...(z === null ? {} : { z: z.meta.name }),
        yAxis: down ? "down" : "up",
        units: down ? "px" : "file",
        ...(dialect === "graphology" ? { viewerFit: SIGMA_FIT } : {}),
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
