/**
 * How a GraphML file's positions are spelled, for `extractPositions()`: yEd's and yFiles' geometry
 * (`yfilesPositions()`), else Gephi's plain `x`, `y` (and `z`) keys. Gephi writes its own drawing,
 * y up, in its own unit; a file is Gephi's when its nodes carry Gephi's `r`, `g` and `b` color keys
 * beside them. Plain `x` / `y` keys in any other file are not read (`W_POSITIONS_NOT_READ`).
 */

import type { Column, GraphSnapshot } from "@graphty/graph-format";

import type { ImporterPositions } from "../../positions/types.js";
import { yfilesPositions } from "./yfiles.js";

/**
 * The spelling of a GraphML file's positions.
 * @param snapshot - the graph the GraphML importer read
 * @returns yEd's geometry, Gephi's x / y (/ z) keys, or null
 */
export function graphmlPositions(snapshot: GraphSnapshot): ImporterPositions | null {
    const yfiles = yfilesPositions(snapshot);
    if (yfiles !== null || snapshot.nodes.byRole("position") !== null) {
        return yfiles;
    }
    const { nodes } = snapshot;
    const float = (name: string): Column | null => {
        const column = nodes.get(name);
        return column !== null && column.meta.components === 1 && (column.dtype === "f64" || column.dtype === "f32")
            ? column
            : null;
    };
    const gephi = nodes.has("r") && nodes.has("g") && nodes.has("b");
    if (!gephi || float("x") === null || float("y") === null) {
        return null;
    }
    return { x: "x", y: "y", ...(float("z") === null ? {} : { z: "z" }), yAxis: "up", units: "file", tool: "gephi" };
}
