/**
 * The routes a reference scene can come from, and each route's deficiency ledger: which properties
 * it carries faithfully ("yes"), loses ("no") or changes ("altered"), and why -- the converter or
 * the intermediate format at fault. The extractors stamp a scene's `canCarry` from this table, and
 * the comparer takes each property from the highest-ranked route that carries it.
 *
 * The extractors in `references/` import this file directly (Node strips its types), so it holds
 * data only and imports types only.
 */
import type { Carry, Property } from "./scene.js";

export type RouteId =
    | "graphviz-json"
    | "graphviz-n2"
    | "gephi-noscale"
    | "sigma"
    | "yed-file"
    | "drawio"
    | "cytoscape-gml"
    | "gml2gv"
    | "pajek-file"
    | "cytoscape-desktop"
    | "cyjs-hop"
    | "cyjs-computed"
    | "graphty";

interface RouteLedger {
    /** "direct": the writing program, or the file's own values read independently; "multi-hop": through a converter. */
    kind: "direct" | "multi-hop" | "subject";
    /** What draws or reads the file on this route. */
    tool: string;
    /** Properties this route cannot carry as written, with the cause. Anything not listed is carried. */
    deficits: Partial<Record<Property, { carry: Exclude<Carry, "yes">; cause: string }>>;
}

const no = (cause: string): { carry: "no"; cause: string } => ({ carry: "no", cause });
const altered = (cause: string): { carry: "altered"; cause: string } => ({ carry: "altered", cause });

const ROUTES: Record<RouteId, RouteLedger> = {
    "graphviz-json": {
        kind: "direct",
        tool: "@hpcc-js/wasm-graphviz 1.29.2 (Graphviz 16.1.0), -Tjson",
        deficits: {},
    },
    "graphviz-n2": {
        kind: "multi-hop",
        tool: "Graphviz neato -n2 -Tjson over a DOT file pinning the reference positions",
        deficits: {
            fill: no("the DOT written for the hop carries geometry only"),
            borderColor: no("the DOT written for the hop carries geometry only"),
            labelColor: no("the DOT written for the hop carries geometry only"),
            fontSize: no("the DOT written for the hop carries geometry only"),
            edgeColor: no("the DOT written for the hop carries geometry only"),
            size: altered("Graphviz grows a node to fit its label"),
        },
    },
    "gephi-noscale": {
        kind: "direct",
        tool: "Gephi Toolkit 0.11.3 preview model (autoscale off)",
        deficits: {
            shape: no("Gephi's preview draws every node as a circle"),
            fillOpacity: no("Gephi's preview ignores viz:color alpha"),
            edgeOpacity: no("Gephi's preview ignores viz:color alpha"),
            edgeColor: altered("Gephi's preview blends the endpoint colors unless the edge color mode is original"),
            edgePath: altered("Gephi's preview draws curved edges by default"),
            edgeWidth: altered("viz:thickness is rescaled by the preview's edge thickness setting"),
            fontSize: altered("the font family depends on the machine, so label metrics vary"),
            // GEXF has no node border: the outline in Gephi's drawing is the preview's own default
            // (a darker shade of the fill), so it says nothing about the file.
            borderColor: altered(
                "Gephi's preview draws its default outline, a darker shade of the fill; GEXF has no border",
            ),
            borderWidth: altered("Gephi's preview draws its default outline width; GEXF has no border"),
        },
    },
    sigma: {
        kind: "multi-hop",
        tool: "graphology-gexf 0.13.2 (the reader sigma 4.0.1 draws from)",
        deficits: {
            shape: no("sigma draws circles only"),
            borderColor: no("sigma has no node border"),
            borderWidth: no("sigma has no node border"),
            fillOpacity: no("graphology-gexf keeps alpha in the color string; sigma ignores it"),
            edgeWidth: no("viz:thickness is not drawn as a pixel width"),
        },
    },
    "yed-file": {
        kind: "direct",
        tool: "the file's own stored geometry and style, read independently of graph-io",
        deficits: {},
    },
    drawio: {
        kind: "multi-hop",
        tool: "draw.io 32.4.1 mxGraphMlCodec (patched to keep parents unextended), in Chromium",
        deficits: {
            fillOpacity: altered("mxGraphMlCodec drops the alpha of #rrggbbaa colors"),
            edgeOpacity: altered("mxGraphMlCodec drops the alpha of #rrggbbaa colors"),
            edgePath: altered("QuadCurveEdge waypoints become straight polyline points"),
            edgeWidth: altered("framed edges are written with draw.io's own stroke width"),
            fill: altered("BPMN Artifact fill and border are replaced; SVGNode becomes an image"),
        },
    },
    "cytoscape-gml": {
        kind: "multi-hop",
        tool: "Cytoscape 3.10.5 GML reader over CyREST",
        deficits: {
            edgePath: no("Cytoscape's GML reader drops Line points (bends)"),
            borderWidth: altered("an implicit border width is drawn 0 by Cytoscape, 1 by yEd"),
            edgeWidth: altered("an implicit edge width becomes Cytoscape's default 2.0"),
            fontSize: altered("unproven: yEd's value equals Cytoscape's default, so a loss cannot be seen"),
        },
    },
    gml2gv: {
        kind: "multi-hop",
        tool: "Graphviz 14.1.2 gml2gv, then neato -n2 -Tjson",
        deficits: {
            fill: no("gml2gv writes the fill as a stroke color"),
            fontSize: no("gml2gv drops the label font size"),
            edgePath: no("bends are drawn straight or as Bezier control points"),
            size: altered("Graphviz grows a node to fit its label"),
            arrows: altered(
                "gml2gv writes a digraph for `directed 1`, so Graphviz draws an arrowhead on every edge where yEd draws none",
            ),
        },
    },
    "pajek-file": {
        kind: "direct",
        tool: "an independent tokenizer of each Pajek line's own keys, dvips colors from dvipsnam.def",
        deficits: {
            size: altered("Pajek's base vertex size is a viewer setting; only the size factors are in the file"),
        },
    },
    "cytoscape-desktop": {
        kind: "direct",
        tool: "Cytoscape 3.10.5 over CyREST (JDK 17), the network view's resolved visual properties",
        deficits: {},
    },
    "cyjs-hop": {
        kind: "multi-hop",
        tool: "Cytoscape desktop's Cytoscape.js export, drawn by Cytoscape.js 3.34.3",
        deficits: {
            edgePath: no("the Cytoscape.js export drops the curve style and edge bends"),
            annotations: no("the Cytoscape.js export has no annotations"),
            size: altered("session (.cys) node sizes export as a flat 50"),
            fontSize: altered("session (.cys) font sizes are not carried"),
        },
    },
    "cyjs-computed": {
        kind: "direct",
        tool: "Cytoscape.js 3.34.3 in Chromium (renderedBoundingBox, style(), rscratch)",
        deficits: {},
    },
    graphty: {
        kind: "subject",
        tool: "graphty-element through its public API",
        deficits: {},
    },
};

/**
 * A route's `canCarry` for a scene: "yes" for every property its ledger does not list.
 *
 * @param route - the route
 * @param properties - every property name
 * @returns the property-to-carry map
 */
export function canCarry(route: RouteId, properties: readonly Property[]): Partial<Record<Property, Carry>> {
    const out: Partial<Record<Property, Carry>> = {};
    for (const p of properties) {
        out[p] = ROUTES[route].deficits[p]?.carry ?? "yes";
    }
    return out;
}
