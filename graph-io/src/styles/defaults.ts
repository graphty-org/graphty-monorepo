/**
 * The defaults of the programs that write graph files: what each program draws for a property the file leaves
 * unset. A style reader adds them as one rule at the bottom (origin "tool"), so an imported graph looks the way it
 * does in the program that made it. Only values a primary source states are here; every value names its source.
 */

import type { EdgeStyleValues, GraphStyleValues, NodeStyleValues, StyleArrowShape, StyleTool } from "./types.js";

/**
 * One default value and where it is stated.
 * @category Styles
 */
export interface ToolDefaultValue<V> {
    /** The canonical value. */
    readonly value: V;
    /** The primary source: a file and line of the tool's code or documentation. */
    readonly source: string;
}

/**
 * Default values per property, each with its source.
 * @category Styles
 */
export type ToolDefaultValues<T> = { readonly [K in keyof T]?: ToolDefaultValue<T[K]> };

/**
 * A default that is a rule rather than a constant. Open union.
 * @category Styles
 */
export type ToolDerivedDefault =
    | {
          /** Nodes are labeled with the value of a column (Cytoscape's `name` passthrough). */
          readonly kind: "labelFromColumn";
          /** The column. */
          readonly column: string;
          /** Where the default is stated. */
          readonly source: string;
      }
    | {
          /** Nodes are labeled with their id (Graphviz's `\N`). */
          readonly kind: "labelFromId";
          /** Where the default is stated. */
          readonly source: string;
      }
    | {
          /** An edge with no color of its own takes its source node's color. */
          readonly kind: "colorFromSourceNode";
          /** Where the default is stated. */
          readonly source: string;
      }
    | {
          /** A directed edge gets an arrow at its target end; an undirected edge keeps the constant default. */
          readonly kind: "targetArrowOnDirected";
          /** The arrow. */
          readonly arrow: StyleArrowShape;
          /** Where the default is stated. */
          readonly source: string;
      };

/**
 * The defaults of one program.
 * @category Styles
 */
export interface ToolDefaults {
    /** The program's id. */
    readonly tool: StyleTool;
    /** The version of the program the values were read from. */
    readonly version: string;
    /** The unit of the lengths below: pixels (or points), or the program's relative size factor. */
    readonly units: "px" | "relative";
    /** Node defaults. */
    readonly node: ToolDefaultValues<NodeStyleValues>;
    /** Edge defaults. */
    readonly edge: ToolDefaultValues<EdgeStyleValues>;
    /** Graph defaults. */
    readonly graph: ToolDefaultValues<GraphStyleValues>;
    /** Defaults that are rules, applied above the constants. */
    readonly derived: readonly ToolDerivedDefault[];
}

/**
 * A value with its source.
 * @param value - the value
 * @param source - where it is stated
 * @returns the entry
 */
function v<V>(value: V, source: string): ToolDefaultValue<V> {
    return { value, source };
}

const CY = "cytoscape-impl vizmap-gui-impl default_vizmap.xml, style default, line";
const CYL = "cytoscape-api BasicVisualLexicon.java line";
const CYJS = "cytoscape.js 3.34.3 dist/cytoscape.cjs.js line";
const GV = "graphviz.org/docs/attrs";
const YED_QA = "yEd Q&A, How can I change the default nodes and/or default edges";
const YED_CORPUS = "yEd GraphML corpus, most frequent value";
const YED_EDGE = "yFiles for Java 2.19 EdgeRealizer API docs";
const Y3 = "yFiles for HTML API docs,";
const GEPHI = "gephi master 92e503df61a7";
const VIS = "vis-network 10.1.2 vis-network.esm.js";
const SIGMA = "sigma 3.0.3 packages/sigma/src";
const PAJEK = "Pajek 6.02 reference manual";
const OGDF = "ogdf master 1a40505ac006";
const NX = "networkx 6da4704cbf32 networkx/drawing/nx_pylab.py line";

/**
 * The defaults of every program graph-io recognizes as a file's writer, by tool id.
 * @category Styles
 */
export const TOOL_DEFAULTS: ReadonlyMap<StyleTool, ToolDefaults> = new Map<StyleTool, ToolDefaults>(
    (
        [
            {
                tool: "cytoscape",
                version: "cytoscape-impl develop 6c63e97c5152 (3.11)",
                units: "px",
                node: {
                    fill: v("#89d0f5", `${CY} 382`),
                    fillOpacity: v(1, `${CY} 383`),
                    shape: v("round-rectangle", `${CY} 367`),
                    width: v(75, `${CY} 384`),
                    height: v(35, `${CY} 358`),
                    borderColor: v("#cccccc", `${CY} 392`),
                    borderWidth: v(0, `${CY} 350`),
                    borderStyle: v("solid", `${CY} 366`),
                    labelColor: v("#000000", `${CY} 395`),
                    labelFont: v("SansSerif", `${CY} 370`),
                    labelWeight: v("normal", `${CY} 370`),
                    labelSize: v(12, `${CY} 371`),
                    labelPosition: v("center", `${CY} 380`),
                },
                edge: {
                    color: v("#848484", `${CY} 431`),
                    width: v(2, `${CY} 417`),
                    lineStyle: v("solid", `${CY} 438`),
                    opacity: v(1, `${CY} 423`),
                    sourceArrow: v("none", `${CY} 437`),
                    targetArrow: v("none", `${CY} 428`),
                    sourceArrowColor: v("#000000", `${CY} 432`),
                    targetArrowColor: v("#000000", `${CY} 432`),
                    labelColor: v("#000000", `${CY} 415`),
                    labelFont: v("Dialog", `${CY} 439`),
                    labelWeight: v("normal", `${CY} 439`),
                    labelSize: v(10, `${CY} 439`),
                    curved: v(true, `${CY} 422`),
                },
                graph: { background: v("#ffffff", `${CY} 335`) },
                derived: [{ kind: "labelFromColumn", column: "name", source: `${CY} 406-408` }],
            },
            {
                tool: "cytoscape-fallbacks",
                version: "cytoscape-api develop (3.11)",
                units: "px",
                node: {
                    fill: v("#c80000", `${CYL} 83`),
                    fillOpacity: v(1, `${CYL} 273`),
                    shape: v("ellipse", `${CYL} 302-303`),
                    width: v(60, `${CYL} 155`),
                    height: v(40, `${CYL} 163`),
                    borderColor: v("#000000", `${CYL} 230`),
                    borderWidth: v(2, `${CYL} 54`),
                    labelColor: v("#000000", `${CYL} 91`),
                    labelFont: v("SansSerif", `${CYL} 255`),
                    labelSize: v(12, `${CYL} 55`),
                    labelPosition: v("center", `${CYL} 205`),
                },
                edge: {
                    color: v("#404040", `${CYL} 469`),
                    width: v(1, `${CYL} 368`),
                    lineStyle: v("solid", `${CYL} 392`),
                    sourceArrow: v("none", `${CYL} 487`),
                    targetArrow: v("none", `${CYL} 493`),
                    labelColor: v("#000000", `${CYL} 327`),
                    labelFont: v("SansSerif", `${CYL} 408`),
                    labelSize: v(10, `${CYL} 416`),
                },
                graph: { background: v("#ffffff", `${CYL} 667`) },
                derived: [],
            },
            {
                tool: "cytoscape-js",
                version: "cytoscape.js 3.34.3",
                units: "px",
                node: {
                    fill: v("#999999", `${CYJS} 18536`),
                    fillOpacity: v(1, `${CYJS} 18538`),
                    shape: v("ellipse", `${CYJS} 18571`),
                    width: v(30, `${CYJS} 18569`),
                    height: v(30, `${CYJS} 18570`),
                    borderColor: v("#000000", `${CYJS} 18555`),
                    borderWidth: v(0, `${CYJS} 18557`),
                    borderStyle: v("solid", `${CYJS} 18558`),
                    opacity: v(1, `${CYJS} 18503`),
                    labelColor: v("#000000", `${CYJS} 18474`),
                    labelSize: v(16, `${CYJS} 18496`),
                    labelFont: v("Helvetica Neue, Helvetica, sans-serif", `${CYJS} 18493`),
                    labelWeight: v("normal", `${CYJS} 18495`),
                    labelPosition: v("top", `${CYJS} 18470-18471`),
                },
                edge: {
                    color: v("#999999", `${CYJS} 18639`),
                    sourceArrowColor: v("#999999", `${CYJS} 18639`),
                    targetArrowColor: v("#999999", `${CYJS} 18639`),
                    width: v(3, `${CYJS} 18711`),
                    lineStyle: v("solid", `${CYJS} 18638`),
                    opacity: v(1, `${CYJS} 18503`),
                    sourceArrow: v("none", `${CYJS} 18670`),
                    targetArrow: v("none", `${CYJS} 18671`),
                    arrowSize: v(1, `${CYJS} 18660`),
                    curved: v(false, `${CYJS} 18658`),
                    labelColor: v("#000000", `${CYJS} 18474`),
                    labelSize: v(16, `${CYJS} 18496`),
                    labelFont: v("Helvetica Neue, Helvetica, sans-serif", `${CYJS} 18493`),
                    labelWeight: v("normal", `${CYJS} 18495`),
                },
                graph: {},
                derived: [],
            },
            {
                tool: "graphviz",
                version: "graphviz main (16.1.0)",
                units: "px",
                node: {
                    fillOpacity: v(0, `${GV}/style/ (default "", not filled)`),
                    borderColor: v("#000000", `${GV}/color/`),
                    borderWidth: v(1, `${GV}/penwidth/; lib/common/const.h line 77`),
                    shape: v("ellipse", `${GV}/shape/; lib/common/const.h line 76`),
                    width: v(54, `${GV}/width/ (0.75 inch); lib/common/const.h line 72`),
                    height: v(36, `${GV}/height/ (0.5 inch); lib/common/const.h line 73`),
                    labelColor: v("#000000", `${GV}/fontcolor/`),
                    labelSize: v(14, `${GV}/fontsize/; lib/common/const.h line 61`),
                    labelFont: v("Times-Roman", `${GV}/fontname/; lib/common/const.h line 67`),
                    labelPosition: v("center", `${GV}/labelloc/`),
                },
                edge: {
                    color: v("#000000", `${GV}/color/`),
                    width: v(1, `${GV}/penwidth/`),
                    lineStyle: v("solid", `${GV}/style/`),
                    sourceArrow: v("none", `${GV}/dir/`),
                    targetArrow: v("none", `${GV}/dir/ (none in a graph)`),
                    arrowSize: v(1, `${GV}/arrowsize/`),
                    labelColor: v("#000000", `${GV}/fontcolor/`),
                    labelSize: v(14, `${GV}/fontsize/`),
                    labelFont: v("Times-Roman", `${GV}/fontname/`),
                },
                graph: {},
                derived: [
                    { kind: "labelFromId", source: `${GV}/label/ (default \\N, the node name)` },
                    {
                        kind: "targetArrowOnDirected",
                        arrow: "triangle",
                        source: `${GV}/dir/ (forward in a digraph); ${GV}/arrowhead/ (normal)`,
                    },
                ],
            },
            {
                tool: "yed",
                version: "yEd / yFiles for Java 2.19",
                units: "px",
                node: {
                    fill: v("#ffcc00", `${YED_QA}; ${YED_CORPUS} of y:Fill color`),
                    shape: v("rectangle", "yFiles for Java 2.19 ShapeNodeRealizer API docs"),
                    borderColor: v("#000000", `${YED_CORPUS} of y:BorderStyle`),
                    borderWidth: v(1, `${YED_CORPUS} of y:BorderStyle`),
                    borderStyle: v("solid", `${YED_CORPUS} of y:BorderStyle`),
                    labelColor: v("#000000", `${YED_CORPUS} of y:NodeLabel`),
                    labelFont: v("Dialog", `${YED_CORPUS} of y:NodeLabel`),
                    labelSize: v(12, `${YED_CORPUS} of y:NodeLabel`),
                    labelWeight: v("normal", `${YED_CORPUS} of y:NodeLabel`),
                    labelPosition: v("center", `${YED_CORPUS} of y:NodeLabel`),
                },
                edge: {
                    color: v("#000000", `${YED_EDGE} (line color defaults to Color.black)`),
                    width: v(1, `${YED_EDGE} (line type defaults to LineType.LINE_1)`),
                    lineStyle: v("solid", `${YED_EDGE} (line type defaults to LineType.LINE_1)`),
                    sourceArrow: v("none", `${YED_EDGE} (defaults to Arrow.NONE)`),
                    targetArrow: v("none", `${YED_EDGE} (defaults to Arrow.NONE)`),
                    labelColor: v("#000000", `${YED_CORPUS} of y:EdgeLabel`),
                    labelFont: v("Dialog", `${YED_CORPUS} of y:EdgeLabel`),
                    labelSize: v(12, `${YED_CORPUS} of y:EdgeLabel`),
                },
                graph: {},
                derived: [],
            },
            {
                tool: "yfiles3",
                version: "yFiles for HTML (API docs retrieved 2026-10-11)",
                units: "px",
                node: {
                    fill: v("#ffffff", `${Y3} ShapeNodeStyle fill`),
                    borderColor: v("#000000", `${Y3} ShapeNodeStyle stroke`),
                    borderWidth: v(1, `${Y3} ShapeNodeStyle stroke`),
                    shape: v("rectangle", `${Y3} ShapeNodeStyle shape`),
                    labelColor: v("#000000", `${Y3} LabelStyle textFill`),
                    labelFont: v("Arial", `${Y3} LabelStyle font`),
                    labelSize: v(12, `${Y3} LabelStyle font`),
                },
                edge: {
                    color: v("#000000", `${Y3} PolylineEdgeStyle stroke`),
                    width: v(1, `${Y3} PolylineEdgeStyle stroke`),
                    sourceArrow: v("none", `${Y3} PolylineEdgeStyle sourceArrow`),
                    targetArrow: v("none", `${Y3} PolylineEdgeStyle targetArrow`),
                    labelColor: v("#000000", `${Y3} LabelStyle textFill`),
                    labelFont: v("Arial", `${Y3} LabelStyle font`),
                    labelSize: v(12, `${Y3} LabelStyle font`),
                },
                graph: {},
                derived: [],
            },
            {
                tool: "gephi",
                version: "gephi 0.11.4-SNAPSHOT",
                units: "relative",
                node: {
                    fill: v("#000000", "gephi/graphstore a4c790b2343e NodeImpl.java line 322"),
                    width: v(10, `${GEPHI} AbstractProcessor.java lines 195-198`),
                    height: v(10, `${GEPHI} AbstractProcessor.java lines 195-198`),
                    shape: v("ellipse", "GEXF 1.3 viz shape default disc; Preview NodeRenderer"),
                },
                edge: {
                    sourceArrow: v("none", `${GEPHI} DefaultPreset.java line 62`),
                    targetArrow: v("none", `${GEPHI} DefaultPreset.java line 62`),
                },
                graph: { background: v("#ffffff", `${GEPHI} VizConfig.java line 111`) },
                derived: [
                    {
                        kind: "colorFromSourceNode",
                        source: `${GEPHI} VizConfig.java line 119 (EdgeColorMode.SOURCE)`,
                    },
                    {
                        kind: "targetArrowOnDirected",
                        arrow: "triangle",
                        source: `${GEPHI} DefaultPreset.java line 62`,
                    },
                ],
            },
            {
                tool: "vis-network",
                version: "vis-network 10.1.2",
                units: "px",
                node: {
                    fill: v("#97c2fc", `${VIS} lines 32986-33110`),
                    borderColor: v("#2b7ce9", `${VIS} lines 32986-33110`),
                    borderWidth: v(1, `${VIS} lines 32986-33110`),
                    shape: v("ellipse", `${VIS} lines 32986-33110`),
                    labelColor: v("#343434", `${VIS} lines 32986-33110`),
                    labelSize: v(14, `${VIS} lines 32986-33110`),
                    labelFont: v("arial", `${VIS} lines 32986-33110`),
                    labelPosition: v("center", `${VIS} lines 32986-33110`),
                },
                edge: {
                    width: v(1, `${VIS} lines 25160-25290`),
                    lineStyle: v("solid", `${VIS} lines 25160-25290 (dashes false)`),
                    sourceArrow: v("none", `${VIS} lines 25160-25290`),
                    targetArrow: v("none", `${VIS} lines 25160-25290`),
                    labelColor: v("#343434", `${VIS} lines 25160-25290`),
                    labelSize: v(14, `${VIS} lines 25160-25290`),
                    labelFont: v("arial", `${VIS} lines 25160-25290`),
                },
                graph: {},
                derived: [
                    { kind: "labelFromColumn", column: "label", source: `${VIS} lines 32986-33110` },
                    { kind: "colorFromSourceNode", source: `${VIS} lines 25160-25290 (color.inherit "from")` },
                ],
            },
            {
                tool: "sigma",
                version: "sigma 3.0.3",
                units: "relative",
                node: {
                    fill: v("#999999", `${SIGMA}/settings.ts lines 119-126`),
                    shape: v("ellipse", `${SIGMA}/settings.ts lines 119-126`),
                    width: v(2, `${SIGMA}/sigma.ts line 76`),
                    height: v(2, `${SIGMA}/sigma.ts line 76`),
                    labelColor: v("#000000", `${SIGMA}/settings.ts lines 119-126`),
                    labelFont: v("Arial", `${SIGMA}/settings.ts lines 119-126`),
                    labelSize: v(14, `${SIGMA}/settings.ts lines 119-126`),
                    labelWeight: v("normal", `${SIGMA}/settings.ts lines 119-126`),
                },
                edge: {
                    color: v("#cccccc", `${SIGMA}/settings.ts lines 119-126`),
                    width: v(0.5, `${SIGMA}/sigma.ts line 100`),
                    sourceArrow: v("none", `${SIGMA}/settings.ts lines 119-126 (type line)`),
                    targetArrow: v("none", `${SIGMA}/settings.ts lines 119-126 (type line)`),
                },
                graph: {},
                derived: [{ kind: "labelFromColumn", column: "label", source: `${SIGMA}/settings.ts lines 119-126` }],
            },
            {
                tool: "pajek",
                version: "Pajek 6.02",
                units: "relative",
                node: {
                    shape: v("ellipse", `${PAJEK} p. 85`),
                    opacity: v(1, `${PAJEK} p. 87`),
                },
                edge: {
                    color: v("#000000", `${PAJEK} p. 90`),
                    lineStyle: v("solid", `${PAJEK} p. 90`),
                    opacity: v(1, `${PAJEK} p. 87`),
                    sourceArrow: v("none", `${PAJEK} p. 91`),
                    targetArrow: v("none", `${PAJEK} p. 91 (edges have none)`),
                },
                graph: {},
                derived: [{ kind: "targetArrowOnDirected", arrow: "triangle", source: `${PAJEK} p. 91 (arcs)` }],
            },
            {
                tool: "ogdf",
                version: "ogdf master 1a40505ac006",
                units: "px",
                node: {
                    fill: v("#ffffff", `${OGDF} LayoutStandards.cpp lines 38-45`),
                    shape: v("rectangle", `${OGDF} LayoutStandards.cpp lines 38-45`),
                    width: v(20, `${OGDF} LayoutStandards.cpp lines 38-45`),
                    height: v(20, `${OGDF} LayoutStandards.cpp lines 38-45`),
                    borderColor: v("#000000", `${OGDF} LayoutStandards.cpp lines 38-45`),
                    borderWidth: v(1, `${OGDF} LayoutStandards.cpp lines 38-45`),
                    borderStyle: v("solid", `${OGDF} LayoutStandards.cpp lines 38-45`),
                },
                edge: {
                    color: v("#000000", `${OGDF} LayoutStandards.cpp lines 38-45`),
                    width: v(1, `${OGDF} LayoutStandards.cpp lines 38-45`),
                    lineStyle: v("solid", `${OGDF} LayoutStandards.cpp lines 38-45`),
                },
                graph: {},
                derived: [],
            },
            {
                tool: "networkx",
                version: "networkx 3.7 (main 6da4704cbf32)",
                units: "px",
                node: {
                    fill: v("#1f78b4", `${NX} 1378`),
                    fillOpacity: v(1, `${NX} 549`),
                    shape: v("ellipse", `${NX} 1379 (node_shape "o")`),
                    // node_size 300 is a marker area in points squared (matplotlib scatter): diameter sqrt(300)
                    width: v(17.3205, `${NX} 1377 (node_size 300, points squared)`),
                    height: v(17.3205, `${NX} 1377 (node_size 300, points squared)`),
                    labelColor: v("#000000", `${NX} 2143`),
                    labelSize: v(12, `${NX} 2142`),
                    labelFont: v("sans-serif", `${NX} 2144`),
                    labelWeight: v("normal", `${NX} 2145`),
                    labelPosition: v("center", `${NX} 2148-2149`),
                },
                edge: {
                    color: v("#000000", `${NX} 1768 (edge_color "k")`),
                    width: v(1, `${NX} 1767`),
                    lineStyle: v("solid", `${NX} 1769`),
                    opacity: v(1, `${NX} 568`),
                    sourceArrow: v("none", `${NX} 1848-1849`),
                    targetArrow: v("none", `${NX} 1849 (undirected graphs draw "-")`),
                    labelColor: v("#000000", `${NX} 557`),
                    labelSize: v(12, `${NX} 556`),
                    labelFont: v("sans-serif", `${NX} 558`),
                    labelWeight: v("normal", `${NX} 559`),
                },
                graph: {},
                derived: [
                    {
                        kind: "targetArrowOnDirected",
                        arrow: "triangle",
                        source: `${NX} 1848 (arrowstyle "-|>" for directed graphs)`,
                    },
                ],
            },
        ] satisfies ToolDefaults[]
    ).map((d): [StyleTool, ToolDefaults] => [d.tool, d]),
);

/**
 * The defaults of one program.
 * @param tool - the program's id
 * @returns its defaults, or null when graph-io has none for it
 * @category Styles
 */
export function toolDefaults(tool: StyleTool): ToolDefaults | null {
    return TOOL_DEFAULTS.get(tool) ?? null;
}
