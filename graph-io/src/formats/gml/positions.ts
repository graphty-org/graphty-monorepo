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
    const gv2gml = writtenByGv2gml(snapshot);
    const graphCreator = typeof inGraph === "string" ? inGraph : null;
    const tool = gv2gml ? "graphviz" : toolOf(snapshot.meta.creator ?? graphCreator);
    return {
        units: "px",
        // a z that is the same on every node collapses to 2D
        sourceDims: 3,
        // gv2gml writes Graphviz's own coordinates, y up
        yAxis: tool === "gephi" || tool === "tulip" || gv2gml ? "up" : "down",
        tool,
        medianNodeSize: graphicsMedian(snapshot, tool === "gephi"),
    };
}

/**
 * Whether Graphviz's gv2gml wrote a GML file: no `Creator` line, and the `version 2` it writes first in the graph
 * (cmd/tools/gv2gml.c gv_to_gml).
 * @param snapshot - the graph the GML importer read
 * @returns true for gv2gml's GML
 */
export function writtenByGv2gml(snapshot: GraphSnapshot): boolean {
    if ((snapshot.meta.creator ?? null) !== null || snapshot.graph.has("Creator") || !snapshot.graph.has("version")) {
        return false;
    }
    return Number(snapshot.graph.value("version", 0)) === 2;
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
        const { w, h, H } = typeof g === "object" && g !== null ? (g as Record<string, unknown>) : {};
        if (gephi && typeof w === "number") {
            sizes.push(2 * w);
        } else if (typeof w === "number" && typeof (h ?? H) === "number") {
            // gv2gml writes the height as H
            sizes.push((w + Number(h ?? H)) / 2);
        }
    }
    return median(sizes);
}
