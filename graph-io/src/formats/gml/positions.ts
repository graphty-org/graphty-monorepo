/**
 * How a GML file's `graphics [ x y z ]` positions are spelled, for `extractPositions()`: the node's
 * center in pixels, y growing downward (the GML specification, yFiles and Cytoscape) unless the
 * `Creator` names a y-up tool (Gephi, Tulip).
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { type GraphTool, toolOf } from "../../common/units.js";
import { median, respelledPositions } from "../../positions/convert.js";
import type { ImporterPositions, YAxis } from "../../positions/types.js";
import { gmlGroupBounds } from "./groups.js";

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
    const { tool, yAxis } = gmlYAxis(snapshot);
    return {
        units: "px",
        // a z that is the same on every node collapses to 2D
        sourceDims: 3,
        yAxis,
        tool,
        medianNodeSize: graphicsMedian(snapshot, tool === "gephi"),
        ...yedGroups(snapshot),
    };
}

/**
 * Which way y grows in a GML file holding this graph, as the GML importer decides it from what the file says wrote it
 * (`gmlYAxisOf`). The GML writer writes the graph's `Creator` back, so it spells its coordinates by the same rule.
 * @param snapshot - the graph read from, or written to, a GML file
 * @param snapshot.meta - its metadata, for the creator
 * @param snapshot.graph - its graph attributes, for an in-graph Creator and gv2gml's version
 * @returns the tool that wrote the file and which way its y grows
 */
function gmlYAxis(snapshot: Pick<GraphSnapshot, "meta" | "graph">): { tool: GraphTool | null; yAxis: YAxis } {
    return gmlYAxisOf(...writerFacts(snapshot));
}

/**
 * The node position column's rows as a GML file of this graph spells them (`respelledPositions` to `gmlYAxis`), or
 * null when the column is already spelled that way or there is none: what the GML writer writes as `graphics x y z`.
 * @param snapshot - the graph being written
 * @returns x, y, z per node, or null to write the column as stored
 */
export function gmlWrittenPositions(snapshot: GraphSnapshot): Float64Array | null {
    const column = snapshot.nodes.byRole("position");
    return column === null ? null : respelledPositions(snapshot, column, { yAxis: gmlYAxis(snapshot).yAxis });
}

/**
 * What a GML graph says about the program that wrote it.
 * @param snapshot - the graph
 * @param snapshot.meta - its metadata
 * @param snapshot.graph - its graph attributes
 * @returns the top-level Creator (or null), the in-graph Creator and the graph's version (undefined when absent)
 */
function writerFacts(snapshot: Pick<GraphSnapshot, "meta" | "graph">): [string | null, unknown, unknown] {
    const { graph } = snapshot;
    return [
        snapshot.meta.creator ?? null,
        graph.has("Creator") ? graph.value("Creator", 0) : undefined,
        graph.has("version") ? graph.value("version", 0) : undefined,
    ];
}

/**
 * Which way y grows in a GML file: up when the `Creator` (top-level or, as Gephi writes it, inside the graph) names
 * Gephi or Tulip, or Graphviz's gv2gml wrote it; down otherwise (the GML specification, yFiles, Cytoscape).
 * @param creator - the top-level `Creator`, or null
 * @param graphCreator - the graph block's `Creator` value, or undefined without one
 * @param version - the graph block's `version` value, or undefined without one
 * @returns the tool that wrote the file and which way its y grows
 */
export function gmlYAxisOf(
    creator: string | null,
    graphCreator: unknown,
    version: unknown,
): { tool: GraphTool | null; yAxis: YAxis } {
    const gv2gml = isGv2gml(creator, graphCreator, version);
    const tool = gv2gml ? "graphviz" : toolOf(creator ?? (typeof graphCreator === "string" ? graphCreator : null));
    // gv2gml writes Graphviz's own coordinates, y up
    return { tool, yAxis: tool === "gephi" || tool === "tulip" || gv2gml ? "up" : "down" };
}

/**
 * Whether Graphviz's gv2gml wrote a GML file: no `Creator` line, and the `version 2` it writes first in the graph
 * (cmd/tools/gv2gml.c gv_to_gml).
 * @param creator - the top-level `Creator`, or null
 * @param graphCreator - the graph block's `Creator` value, or undefined without one
 * @param version - the graph block's `version` value, or undefined without one
 * @returns true for gv2gml's GML
 */
function isGv2gml(creator: string | null, graphCreator: unknown, version: unknown): boolean {
    return creator === null && graphCreator === undefined && version !== undefined && Number(version) === 2;
}

/**
 * The boxes yEd draws the file's open groups in, round their members (`gmlGroupBounds`), centered as the coordinates.
 * @param snapshot - the graph
 * @returns the hook's `groups`, or nothing without an open group
 */
function yedGroups(snapshot: GraphSnapshot): Pick<ImporterPositions, "groups"> {
    const groups = [...gmlGroupBounds(snapshot)].map(([node, [x0, y0, x1, y1]]) => ({
        node,
        box: { x: (x0 + x1) / 2, y: (y0 + y1) / 2, width: x1 - x0, height: y1 - y0 },
    }));
    return groups.length === 0 ? {} : { groups };
}

/**
 * Whether Graphviz's gv2gml wrote a GML file (`isGv2gml`).
 * @param snapshot - the graph the GML importer read
 * @returns true for gv2gml's GML
 */
export function writtenByGv2gml(snapshot: Pick<GraphSnapshot, "meta" | "graph">): boolean {
    return isGv2gml(...writerFacts(snapshot));
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
