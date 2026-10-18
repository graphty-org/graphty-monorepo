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
    // Gephi writes its Creator line inside the graph
    const inGraph = snapshot.graph.has("Creator") ? snapshot.graph.value("Creator", 0) : null;
    const tool = toolOf(snapshot.meta.creator ?? (typeof inGraph === "string" ? inGraph : null));
    return {
        units: "px",
        // a z that is the same on every node collapses to 2D
        sourceDims: 3,
        yAxis: tool === "gephi" || tool === "tulip" ? "up" : "down",
        tool,
        medianNodeSize: graphicsMedian(snapshot, tool === "gephi"),
    };
}

/**
 * The median node diameter from the graphics records' `w` and `h`.
 * @param snapshot - the graph
 * @param gephi - whether Gephi wrote the file: its `w` is a node's size, a radius, and its `h` is ignored
 * @returns the median of each node's mean of w and h, or null when no node has both
 */
function graphicsMedian(snapshot: GraphSnapshot, gephi: boolean): number | null {
    const graphics = snapshot.nodes.get(GRAPHICS_COLUMN);
    const sizes: number[] = [];
    for (let row = 0; graphics !== null && row < graphics.length; row++) {
        const g = graphics.isSet(row) ? graphics.value(row) : undefined;
        const { w, h } = typeof g === "object" && g !== null ? (g as Record<string, unknown>) : {};
        if (gephi && typeof w === "number") {
            sizes.push(2 * w);
        } else if (typeof w === "number" && typeof h === "number") {
            sizes.push((w + h) / 2);
        }
    }
    return median(sizes);
}
