/**
 * How a GML file's `graphics [ x y z ]` positions are spelled, for `extractPositions()`: the node's
 * center in pixels, y growing downward (the GML specification, yFiles and Cytoscape) unless the
 * `Creator` names a y-up tool (Gephi, Tulip).
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { toolOf } from "../../common/units.js";
import { median } from "../../positions/convert.js";
import type { ImporterPositions } from "../../positions/types.js";

/** The json column the importer keeps the rest of each node's graphics record in. */
const GRAPHICS_COLUMN = "graphics";

/**
 * The spelling of a GML file's positions.
 * @param snapshot - the graph the GML importer read
 * @returns the spelling, or null when no node has a position
 */
export function gmlPositions(snapshot: GraphSnapshot): ImporterPositions | null {
    if (snapshot.nodes.byRole("position") === null) {
        return null;
    }
    const tool = toolOf(snapshot.meta.creator);
    return {
        units: "px",
        // a z that is the same on every node collapses to 2D
        sourceDims: 3,
        yAxis: tool === "gephi" || tool === "tulip" ? "up" : "down",
        tool,
        medianNodeSize: graphicsMedian(snapshot),
    };
}

/**
 * The median node diameter from the graphics records' `w` and `h`.
 * @param snapshot - the graph
 * @returns the median of each node's mean of w and h, or null when no node has both
 */
function graphicsMedian(snapshot: GraphSnapshot): number | null {
    const graphics = snapshot.nodes.get(GRAPHICS_COLUMN);
    const sizes: number[] = [];
    for (let row = 0; graphics !== null && row < graphics.length; row++) {
        const g = graphics.isSet(row) ? graphics.value(row) : undefined;
        const { w, h } = typeof g === "object" && g !== null ? (g as Record<string, unknown>) : {};
        if (typeof w === "number" && typeof h === "number") {
            sizes.push((w + h) / 2);
        }
    }
    return median(sizes);
}
