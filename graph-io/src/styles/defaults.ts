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
          /** An edge with no color of its own takes the mix of its two end nodes' colors (Gephi's EdgeColor MIXED). */
          readonly kind: "colorFromEndNodes";
          /** Where the default is stated. */
          readonly source: string;
      }
    | {
          /** An edge with no width of its own is drawn as thick as its weight (1 for an edge with no weight, or a weight of 0 or below). */
          readonly kind: "widthFromWeight";
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
    /**
     * The largest corner radius, in `units`, the program draws on a rounded rectangle whose file gives none. Not a
     * node default: it only bounds the rounding of the shape the file names, so no rule carries it and no writer has
     * to hold it.
     */
    readonly roundedCornerRadius?: ToolDefaultValue<number>;
    /**
     * How big the program draws its filled triangle arrowhead, which it sizes from the line width and its own size
     * setting rather than from the neutral `arrowSize` alone. Not an edge default: the size follows from two
     * properties, so no rule carries it. Absent for a program whose arrowheads graph-io has not measured.
     */
    readonly arrowhead?: ToolArrowhead;
    /**
     * Whether the program draws a node's `borderWidth` in screen pixels, the same at every zoom, rather than as a
     * length that grows and shrinks with the drawing: vis-network divides it by its view's scale. Not a node default:
     * it says how every node's border width is read, so no rule carries it. Absent, a border width is a length.
     */
    readonly nodeBorderOnScreen?: ToolDefaultValue<boolean>;
}

/**
 * How a program sizes its filled triangle arrowhead, in its `units`.
 * @category Styles
 */
export interface ToolArrowhead {
    /**
     * The arrowhead's length along its line.
     * @param arrowSize - the edge's neutral `arrowSize` (1 is the program's normal size)
     * @param width - the edge's line width
     * @param sourceArrow - the arrow at the edge's source end, for a program that sizes both of an edge's arrows by
     * it (Cytoscape desktop); unset where the caller does not know it
     * @returns the length
     */
    readonly length: (arrowSize: number, width: number, sourceArrow?: StyleArrowShape) => number;
    /** Its width across the line as a fraction of its length, which its diamond shares. */
    readonly aspect: number;
    /**
     * Another arrow shape's length along its line as a fraction of the triangle's, and its width as a fraction of
     * its own length, where they differ.
     */
    readonly shapes?: Readonly<
        Partial<
            Record<
                StyleArrowShape,
                {
                    /** The shape's length along its line, as a fraction of the triangle's. */
                    readonly length: number;
                    /** Its width across the line as a fraction of its own length; unset, the triangle's. */
                    readonly aspect?: number;
                }
            >
        >
    >;
    /** Where the rule is stated or measured. */
    readonly source: string;
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
/** Cytoscape desktop's zigzag and sine-wave strokes: both swing 10 px and repeat every 20 px. */
const CY_WAVE =
    "cytoscape-impl ding-presentation-impl 3.10.5 org.cytoscape.ding.impl.strokes: ZigzagStroke (amplitude 10, a turn every 10) and SineWaveStroke (amplitude 10, wavelength 20)";
const CYJS = "cytoscape.js 3.34.3 dist/cytoscape.cjs.js line";
const GV = "graphviz.org/docs/attrs";
const YED_QA = "yEd Q&A, How can I change the default nodes and/or default edges";
const YED_CORPUS = "yEd GraphML corpus, most frequent value";
const YED_EDGE = "yFiles for Java 2.19 EdgeRealizer API docs";
const YED_BG = "yFiles for Java 2.19 DefaultBackgroundRenderer API docs";
const Y3 = "yFiles for HTML API docs,";
const GEPHI = "gephi master 92e503df61a7";
const VIS = "vis-network 10.1.2 vis-network.esm.js";
const VIS9 = "vis-network 9.1.9 standalone/umd/vis-network.js";
const SIGMA = "sigma 3.0.3 packages/sigma/src";
const SIGMA4 = "sigma 4.0.1 dist/types-d8ce3382.esm.js";
const PAJEK = "Pajek 6.02 reference manual";
const OGDF = "ogdf master 1a40505ac006";
const OGDF_SVG =
    "OGDF 2025.10 GraphIO::drawSVG with its default SVGSettings (graph-io/test/fidelity/oracles/gml-specimen-labels-p5.svg: ";
const NX = "networkx 6da4704cbf32 networkx/drawing/nx_pylab.py line";
const MEASURED = "measured in the program's own SVG export (graph-io/test/fidelity/oracles/";
const PAJEK_SVG = `${MEASURED}pajek-`;

/**
 * Cytoscape desktop draws an arrow `EDGE_*_ARROW_SIZE` (6 by default, the neutral arrowSize 1) plus the line width
 * across, a DELTA twice as long, a square, a circle and a half arrow as long as that, and a T bar as wide as the
 * DELTA is long and a tenth of that deep: measured on cx-ndex-90f78bcd (width 1), cx2-u2os-hierarchy (width 2),
 * cx2-signor-aml and cx2-syn-bypass (widths 1 and 7).
 */
const CYTOSCAPE_ARROWHEAD: ToolArrowhead = {
    // both ends of an edge whose source arrow is HALF_TOP or HALF_BOTTOM are EDGE_*_ARROW_SIZE times the width
    // instead (DEdgeDetails.adjustArrowSize; getTargetArrowSize reads the source's shape too)
    length: (size, width, sourceArrow) =>
        2 * (sourceArrow === "half" || sourceArrow === "other:half-bottom" ? 6 * size * width : 6 * size + width),
    aspect: 0.5,
    shapes: {
        square: { length: 0.5, aspect: 1 },
        circle: { length: 0.5, aspect: 1 },
        "circle-open": { length: 0.5, aspect: 1 },
        // HALF_TOP's barb: 1.135 long and 1 to one side of its line
        half: { length: 0.5675, aspect: 0.881 },
        "other:half-bottom": { length: 0.5675, aspect: 0.881 },
        tee: { length: 0.1, aspect: 10 },
        // a square's outline, and a half circle (half a CIRCLE deep, as wide)
        "other:open-square": { length: 0.5, aspect: 1 },
        "other:half-circle": { length: 0.25, aspect: 2 },
        "other:open-half-circle": { length: 0.25, aspect: 2 },
    },
    source: `${MEASURED}cx-ndex-90f78bcd, cx2-u2os-hierarchy, cx2-signor-aml, cx2-syn-bypass, cx-syn-mappings: each arrow's unit glyph; cx2-specimen-arrows: a source half arrow of size 10 on a 1.5 line drawn at 15), Cytoscape 3.10.5 (ding-presentation-impl DEdgeDetails.adjustArrowSize)`,
};

/**
 * Cytoscape desktop draws a node's outline its size less its border's width across and strokes the border along it,
 * so the border's outer edge is the node's size: a 40 x 40 HEXAGON with a border of 1 is a 39-wide path.
 */
/** Cytoscape desktop draws a curved edge through its handles, and the loops it adds itself, through their midpoints. */
const CYTOSCAPE_BEND_CURVE = v(
    "midpoints",
    "cytoscape-impl ding-presentation-impl GraphGraphics.java computeCubicPolyEdgePath (cubic pieces between the handles' midpoints, controls pulled toward each handle by CURVE_ELLIPTICAL)",
);

/**
 * Cytoscape desktop draws a label's background box round its words alone: as wide as the text and one line tall,
 * the font's ascent plus descent (1.164 of a DejaVu Sans font's size), which is also the step between its lines.
 */
const CYTOSCAPE_LABEL_BOX = `${MEASURED}xgmml-specimen-labels: label-background-* boxes and the captions' two lines), Cytoscape 3.10.5`;
const CYTOSCAPE_LABEL_PADDING = v(0, CYTOSCAPE_LABEL_BOX);
const CYTOSCAPE_LABEL_LINE_HEIGHT = v(1, CYTOSCAPE_LABEL_BOX);

const CYTOSCAPE_BORDER_INSIDE = v<"inside">(
    "inside",
    `${MEASURED}cx2-repro-shared-interaction, cys-luad-vest-v2, cx2-synthetic-lethal), Cytoscape 3.10.5`,
);

/**
 * draw.io draws a yEd or yFiles file's arrows `endSize` 6 plus the line width long and as wide; yEd itself could not
 * be run, so draw.io's drawing stands in.
 */
const DRAWIO_ARROWHEAD: ToolArrowhead = {
    length: (size, width) => 6 * size + width,
    aspect: 1,
    source: `${MEASURED}graphml-*, draw.io 32.4.1 standing in for yEd)`,
};

/**
 * The largest corner radius of a rounded rectangle whose file gives none, in the program's units. Cytoscape.js is the
 * one program that publishes its rule (`getRoundRectangleRadius`); the others draw barely rounded corners too, so they
 * get the same 8, and a 513 x 453 group keeps small corners instead of a quarter of its side.
 * @param tool - the program, when it is not Cytoscape.js and so states no radius of its own
 * @returns the default
 */
function cornerCap(tool?: string): ToolDefaultValue<number> {
    const rule = `${CYJS} 4386`;
    return v(8, tool === undefined ? rule : `${rule} (Cytoscape.js's rule; ${tool} states none)`);
}

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
                roundedCornerRadius: cornerCap("cytoscape"),
                arrowhead: CYTOSCAPE_ARROWHEAD,
                node: {
                    fill: v("#89d0f5", `${CY} 382`),
                    fillOpacity: v(1, `${CY} 383`),
                    shape: v("round-rectangle", `${CY} 367`),
                    width: v(75, `${CY} 384`),
                    height: v(35, `${CY} 358`),
                    borderColor: v("#cccccc", `${CY} 392`),
                    borderWidth: v(0, `${CY} 350`),
                    borderStyle: v("solid", `${CY} 366`),
                    borderPosition: CYTOSCAPE_BORDER_INSIDE,
                    borderWaveAmplitude: v(10, CY_WAVE),
                    borderWavePeriod: v(20, CY_WAVE),
                    labelColor: v("#000000", `${CY} 395`),
                    labelFont: v("DejaVu Sans, sans-serif", `${CY} 370 (SansSerif, drawn in Java's face for it)`),
                    labelWeight: v("normal", `${CY} 370`),
                    labelItalic: v(false, `${CY} 370`),
                    labelSize: v(12, `${CY} 371`),
                    labelWrapWidth: v(200, `${CY} 372`),
                    labelWrapTrailingSpace: v(
                        true,
                        `${MEASURED}cx-ndex-90f78bcd: each word is measured with the space after it), Cytoscape 3.10.5`,
                    ),
                    labelPosition: v("center", `${CY} 380`),
                    labelPadding: CYTOSCAPE_LABEL_PADDING,
                    labelLineHeight: CYTOSCAPE_LABEL_LINE_HEIGHT,
                },
                edge: {
                    color: v("#848484", `${CY} 431`),
                    width: v(2, `${CY} 417`),
                    lineStyle: v("solid", `${CY} 438`),
                    waveAmplitude: v(10, CY_WAVE),
                    wavePeriod: v(20, CY_WAVE),
                    opacity: v(1, `${CY} 423`),
                    sourceArrow: v("none", `${CY} 437`),
                    targetArrow: v("none", `${CY} 428`),
                    sourceArrowColor: v("#000000", `${CY} 432`),
                    targetArrowColor: v("#000000", `${CY} 432`),
                    labelColor: v("#000000", `${CY} 415`),
                    labelFont: v("DejaVu Sans, sans-serif", `${CY} 439 (SansSerif, drawn in Java's face for it)`),
                    labelWeight: v("normal", `${CY} 439`),
                    labelItalic: v(false, `${CY} 439`),
                    labelSize: v(10, `${CY} 439`),
                    labelPadding: CYTOSCAPE_LABEL_PADDING,
                    labelLineHeight: CYTOSCAPE_LABEL_LINE_HEIGHT,
                    // EDGE_CURVED is true there, but it only rounds an edge's bends: an edge without bends is straight
                    curved: v(false, `${CY} 422`),
                    bendCurve: CYTOSCAPE_BEND_CURVE,
                },
                graph: { background: v("#ffffff", `${CY} 335`) },
                derived: [{ kind: "labelFromColumn", column: "name", source: `${CY} 406-408` }],
            },
            {
                tool: "cytoscape-fallbacks",
                version: "cytoscape-api develop (3.11)",
                units: "px",
                roundedCornerRadius: cornerCap("cytoscape-fallbacks"),
                arrowhead: CYTOSCAPE_ARROWHEAD,
                node: {
                    fill: v("#c80000", `${CYL} 83`),
                    fillOpacity: v(1, `${CYL} 273`),
                    shape: v("ellipse", `${CYL} 302-303`),
                    width: v(60, `${CYL} 155`),
                    height: v(40, `${CYL} 163`),
                    borderColor: v("#000000", `${CYL} 230`),
                    borderWidth: v(2, `${CYL} 54`),
                    borderPosition: CYTOSCAPE_BORDER_INSIDE,
                    borderWaveAmplitude: v(10, CY_WAVE),
                    borderWavePeriod: v(20, CY_WAVE),
                    labelColor: v("#000000", `${CYL} 91`),
                    labelFont: v("DejaVu Sans, sans-serif", `${CYL} 255 (SansSerif, drawn in Java's face for it)`),
                    labelWeight: v("normal", `${CYL} 255`),
                    labelItalic: v(false, `${CYL} 255`),
                    labelSize: v(12, `${CYL} 55`),
                    labelWrapWidth: v(200, `${CYL} 196`),
                    labelWrapTrailingSpace: v(
                        true,
                        `${MEASURED}cx-ndex-90f78bcd: each word is measured with the space after it), Cytoscape 3.10.5`,
                    ),
                    labelPosition: v("center", `${CYL} 205`),
                    labelPadding: CYTOSCAPE_LABEL_PADDING,
                    labelLineHeight: CYTOSCAPE_LABEL_LINE_HEIGHT,
                },
                edge: {
                    color: v("#404040", `${CYL} 469`),
                    width: v(1, `${CYL} 368`),
                    lineStyle: v("solid", `${CYL} 392`),
                    waveAmplitude: v(10, CY_WAVE),
                    wavePeriod: v(20, CY_WAVE),
                    sourceArrow: v("none", `${CYL} 487`),
                    targetArrow: v("none", `${CYL} 493`),
                    labelColor: v("#000000", `${CYL} 327`),
                    labelFont: v("DejaVu Sans, sans-serif", `${CYL} 408 (SansSerif, drawn in Java's face for it)`),
                    labelWeight: v("normal", `${CYL} 408`),
                    labelItalic: v(false, `${CYL} 408`),
                    labelSize: v(10, `${CYL} 416`),
                    labelPadding: CYTOSCAPE_LABEL_PADDING,
                    labelLineHeight: CYTOSCAPE_LABEL_LINE_HEIGHT,
                    bendCurve: CYTOSCAPE_BEND_CURVE,
                },
                graph: { background: v("#ffffff", `${CYL} 667`) },
                derived: [],
            },
            {
                tool: "cytoscape-js",
                version: "cytoscape.js 3.34.3",
                units: "px",
                roundedCornerRadius: cornerCap(),
                arrowhead: {
                    // getArrowWidth, and the triangle's points at +-0.15, -0.3 of it
                    length: (size, width) => 0.3 * Math.max((width * 13.37) ** 0.9, 29) * size,
                    aspect: 1,
                    // a tee is 0.1 of the arrow width deep, the triangle 0.3 long; triangle-tee reaches back to its bar
                    // at 0.5, circle-triangle to 0.6 and triangle-cross to its cross line at 0.4 plus the line's width
                    shapes: {
                        tee: { length: 1 / 3, aspect: 3 },
                        "other:triangle-tee": { length: 5 / 3, aspect: 0.6 },
                        "other:triangle-cross": { length: 1.5, aspect: 0.66 },
                        "other:circle-triangle": { length: 2, aspect: 0.5 },
                        "other:chevron": { length: 2 / 3, aspect: 1.5 },
                    },
                    source: `${CYJS} 23497 (getArrowWidth), 22714-22716 (triangle), 22813-22814 (tee), 22627 (arrowShapeWidth)`,
                },
                node: {
                    fill: v("#999999", `${CYJS} 18536`),
                    fillOpacity: v(1, `${CYJS} 18538`),
                    shape: v("ellipse", `${CYJS} 18571`),
                    width: v(30, `${CYJS} 18569`),
                    height: v(30, `${CYJS} 18570`),
                    borderColor: v("#000000", `${CYJS} 18555`),
                    borderWidth: v(0, `${CYJS} 18557`),
                    borderStyle: v("solid", `${CYJS} 18558`),
                    borderPosition: v("center", `${CYJS} 18563`),
                    outerBorderColor: v("#999999", `${CYJS} 18564`),
                    // the underlay and the overlay draw nothing until an opacity is set; then these
                    underlayColor: v("#000000", `${CYJS} 18524`),
                    underlayPadding: v(10, `${CYJS} 18525`),
                    underlayShape: v("round-rectangle", `${CYJS} 18526`),
                    overlayColor: v("#000000", `${CYJS} 18519`),
                    overlayPadding: v(10, `${CYJS} 18520`),
                    overlayShape: v("round-rectangle", `${CYJS} 18521`),
                    opacity: v(1, `${CYJS} 18503`),
                    labelColor: v("#000000", `${CYJS} 18474`),
                    labelSize: v(16, `${CYJS} 18496`),
                    labelFont: v("Helvetica Neue, Helvetica, sans-serif", `${CYJS} 18493`),
                    labelWeight: v("normal", `${CYJS} 18495`),
                    labelPosition: v("top", `${CYJS} 18470-18471`),
                    // text-wrap: wrap measures `subline + word + wordSeparator` against text-max-width; ponytail: a
                    // line's last word has no separator there, where graphty counts a space after it too
                    labelWrapTrailingSpace: v(true, `${CYJS} 25218`),
                },
                edge: {
                    color: v("#999999", `${CYJS} 18639`),
                    sourceArrowColor: v("#999999", `${CYJS} 18639`),
                    targetArrowColor: v("#999999", `${CYJS} 18639`),
                    outlineColor: v("#000000", `${CYJS} 18644`),
                    underlayColor: v("#000000", `${CYJS} 18524`),
                    underlayPadding: v(10, `${CYJS} 18525`),
                    overlayColor: v("#000000", `${CYJS} 18519`),
                    overlayPadding: v(10, `${CYJS} 18520`),
                    gradientKind: v("none", `${CYJS} 18640 (line-fill solid)`),
                    midSourceArrowColor: v("#999999", `${CYJS} 18639`),
                    midTargetArrowColor: v("#999999", `${CYJS} 18639`),
                    // an edge's label is centered on the line's middle (recalculateEdgeLabelProjections)
                    labelPosition: v("center", `${CYJS} 24942`),
                    // a source or target label is centered on the line where it leaves its node, unless offset
                    sourceLabelOffset: v(0, `${CYJS} 18511, 18515`),
                    targetLabelOffset: v(0, `${CYJS} 18511, 18515`),
                    width: v(3, `${CYJS} 18711`),
                    lineStyle: v("solid", `${CYJS} 18638`),
                    opacity: v(1, `${CYJS} 18503`),
                    sourceArrow: v("none", `${CYJS} 18670`),
                    targetArrow: v("none", `${CYJS} 18671`),
                    arrowSize: v(1, `${CYJS} 18660`),
                    curved: v(false, `${CYJS} 18658`),
                    // control-point-step-size 40: a quadratic's middle is half as far out as its control point
                    fanSpacing: v(20, `${CYJS} 18647`),
                    labelColor: v("#000000", `${CYJS} 18474`),
                    labelSize: v(16, `${CYJS} 18496`),
                    labelFont: v("Helvetica Neue, Helvetica, sans-serif", `${CYJS} 18493`),
                    labelWeight: v("normal", `${CYJS} 18495`),
                },
                graph: {
                    // the canvas is cleared to transparent, so the page's default white shows through
                    background: v("#ffffff", `${CYJS} 31537 (clearCanvas: clearRect)`),
                },
                derived: [],
            },
            {
                tool: "graphviz",
                version: "graphviz main (16.1.0)",
                units: "px",
                roundedCornerRadius: cornerCap("graphviz"),
                arrowhead: {
                    // ARROW_LENGTH 10 and the normal arrow's half width 0.35 of its length
                    length: (size) => 10 * size,
                    aspect: 0.7,
                    // each arrow type's length factor and the half width its arrow_type_* function draws
                    shapes: {
                        tee: { length: 0.2, aspect: 5 },
                        square: { length: 0.8, aspect: 1 },
                        // obox, the same box outlined
                        "other:open-square": { length: 0.8, aspect: 1 },
                        diamond: { length: 1.2, aspect: 2 / 3 },
                        "diamond-open": { length: 1.2, aspect: 2 / 3 },
                        circle: { length: 0.8, aspect: 1 },
                        "circle-open": { length: 0.8, aspect: 1 },
                        crow: { length: 1, aspect: 0.9 },
                        vee: { length: 1, aspect: 0.9 },
                        // the arc of curve and icurve, a half circle of radius half the arrow's length across its
                        // stem (the stem is the line, carried on to the tip)
                        "other:curve": { length: 0.5, aspect: 2 },
                        "other:inv-curve": { length: 0.5, aspect: 2 },
                    },
                    source: "graphviz lib/common/arrows.c (ARROW_LENGTH 10, Arrowtypes lenfact, arrow_type_normal 0.35, arrow_type_crow 0.45, arrow_type_tee, arrow_type_box 0.4, arrow_type_diamond 1/3, arrow_type_dot, arrow_type_curve)",
                },
                node: {
                    fillOpacity: v(0, `${GV}/style/ (default "", not filled)`),
                    borderColor: v("#000000", `${GV}/color/`),
                    borderWidth: v(1, `${GV}/penwidth/; lib/common/const.h line 77`),
                    borderPosition: v("center", `${MEASURED}dot-synth-nodes), Graphviz strokes the node's own outline`),
                    shape: v("ellipse", `${GV}/shape/; lib/common/const.h line 76`),
                    width: v(54, `${GV}/width/ (0.75 inch); lib/common/const.h line 72`),
                    height: v(36, `${GV}/height/ (0.5 inch); lib/common/const.h line 73`),
                    labelColor: v("#000000", `${GV}/fontcolor/`),
                    labelSize: v(14, `${GV}/fontsize/; lib/common/const.h line 61`),
                    labelFont: v("Times, serif", `${GV}/fontname/ (Times-Roman); lib/common/const.h line 67`),
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
                    labelFont: v("Times, serif", `${GV}/fontname/ (Times-Roman)`),
                },
                graph: {
                    background: v(
                        "#ffffff",
                        `${GV}/bgcolor/ (default unset); lib/common/emit.c emit_background (an unset bgcolor paints the page white)`,
                    ),
                },
                derived: [
                    { kind: "labelFromId", source: String.raw`${GV}/label/ (default \N, the node name)` },
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
                roundedCornerRadius: cornerCap("yed"),
                arrowhead: DRAWIO_ARROWHEAD,
                node: {
                    fill: v("#ffcc00", `${YED_QA}; ${YED_CORPUS} of y:Fill color`),
                    shape: v("rectangle", "yFiles for Java 2.19 ShapeNodeRealizer API docs"),
                    borderColor: v("#000000", `${YED_CORPUS} of y:BorderStyle`),
                    borderWidth: v(1, `${YED_CORPUS} of y:BorderStyle`),
                    borderStyle: v("solid", `${YED_CORPUS} of y:BorderStyle`),
                    borderPosition: v("center", `${MEASURED}graphml-*, draw.io 32.4.1 standing in for yEd)`),
                    labelColor: v("#000000", `${YED_CORPUS} of y:NodeLabel`),
                    labelFont: v("DejaVu Sans, sans-serif", `${YED_CORPUS} of y:NodeLabel (Dialog's face)`),
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
                    labelFont: v("DejaVu Sans, sans-serif", `${YED_CORPUS} of y:EdgeLabel (Dialog's face)`),
                    labelSize: v(12, `${YED_CORPUS} of y:EdgeLabel`),
                },
                graph: {
                    background: v(
                        "#ffffff",
                        `${YED_BG} (setColor: "By default the background color is white"); yEd manual, Preferences, Background tab`,
                    ),
                },
                derived: [],
            },
            {
                tool: "yfiles3",
                version: "yFiles for HTML (API docs retrieved 2026-10-11)",
                units: "px",
                roundedCornerRadius: cornerCap("yfiles3"),
                arrowhead: DRAWIO_ARROWHEAD,
                node: {
                    fill: v("#ffffff", `${Y3} ShapeNodeStyle fill`),
                    borderColor: v("#000000", `${Y3} ShapeNodeStyle stroke`),
                    borderWidth: v(1, `${Y3} ShapeNodeStyle stroke`),
                    borderPosition: v(
                        "center",
                        `${MEASURED}graphml-yfiles-html-*, draw.io 32.4.1 standing in for yFiles)`,
                    ),
                    shape: v("rectangle", `${Y3} ShapeNodeStyle shape`),
                    labelColor: v("#000000", `${Y3} LabelStyle textFill`),
                    labelFont: v("Arial", `${Y3} LabelStyle font`),
                    labelSize: v(12, `${Y3} LabelStyle font`),
                    labelPosition: v(
                        "center",
                        `${Y3} IGraph.nodeDefaults labels layoutParameter (InteriorLabelModel center)`,
                    ),
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
                graph: {
                    background: v("#ffffff", `${Y3} GraphComponent (a transparent canvas over the page's white)`),
                },
                derived: [],
            },
            {
                tool: "gephi",
                version: "gephi 0.11.4-SNAPSHOT",
                units: "relative",
                roundedCornerRadius: cornerCap("gephi"),
                arrowhead: {
                    length: (size, width) => 3.25 * width * size,
                    aspect: 0.9,
                    source: `${MEASURED}gexf-synth-nx-viz, widths 1 to 4), Gephi Toolkit 0.11.3`,
                },
                node: {
                    fill: v("#000000", "gephi/graphstore a4c790b2343e NodeImpl.java line 322"),
                    width: v(20, `${GEPHI} AbstractProcessor.java lines 195-198 (size 10 is a radius)`),
                    height: v(20, `${GEPHI} AbstractProcessor.java lines 195-198 (size 10 is a radius)`),
                    shape: v("ellipse", "GEXF 1.3 viz shape default disc; Preview NodeRenderer"),
                    borderPosition: v(
                        "inside",
                        `${MEASURED}gexf-specimen-node-fills-borders-p3), Gephi Toolkit 0.11.3: the border is stroked on a circle of radius size - border / 2`,
                    ),
                    labelPosition: v(
                        "center",
                        `${GEPHI} NodeLabelRenderer.java (a label is drawn centered on its node)`,
                    ),
                    // a node drawn under another still shows its label (gexf-cns-wos n5 under n109: "Borner, K")
                    labelOnTop: v(
                        true,
                        `${GEPHI} PreviewController (the node label items are drawn after every node); Gephi Toolkit 0.11.3 SVG export: g#node-labels after g#nodes`,
                    ),
                },
                edge: {
                    sourceArrow: v("none", `${GEPHI} DefaultPreset.java line 62`),
                    targetArrow: v("none", `${GEPHI} DefaultPreset.java line 62`),
                    curved: v(true, `${GEPHI} DefaultPreset.java (EDGE_CURVED true); Gephi Toolkit 0.11.3 SVG export`),
                    fanned: v(
                        false,
                        `${GEPHI} EdgeRenderer.java (each curved edge bows left of its own direction, siblings ignored); Gephi Toolkit 0.11.3 SVG export`,
                    ),
                    arcRadius: v(
                        1 / 1.2,
                        `${GEPHI} EdgeRenderer.java (CurvedEdgeRenderer: an arc through both node centers of radius length / ARC_CURVENESS, default 1.2)`,
                    ),
                },
                graph: { background: v("#ffffff", `${GEPHI} VizConfig.java line 111`) },
                derived: [
                    {
                        kind: "colorFromEndNodes",
                        source: `${GEPHI} DefaultPreset.java (EDGE_COLOR EdgeColor.Mode.MIXED); Gephi Toolkit 0.11.3 SVG export`,
                    },
                    {
                        kind: "widthFromWeight",
                        source: `${GEPHI} VizConfig.java lines 136, 144-145; DefaultPreset.java lines 67, 73`,
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
                roundedCornerRadius: cornerCap("vis-network"),
                arrowhead: {
                    // EdgeBase.getArrowData: 15 * scaleFactor + 3 * width; ArrowHead's points at -1, +-0.3
                    length: (size, width) => 15 * size + 3 * width,
                    aspect: 0.6,
                    // its bar is 0.15 of the arrow's length deep and as wide as the arrow is long; its box is 0.6 of the
                    // length square, its circle 0.8 of the length across, and its curve and inv_curve arcs have a
                    // radius of 0.4 of it
                    shapes: {
                        tee: { length: 0.15, aspect: 1 / 0.15 },
                        square: { length: 0.6, aspect: 1 },
                        // Crow: its prongs at -1 and +-0.3, as wide as the arrow
                        crow: { length: 1, aspect: 0.6 },
                        circle: { length: 0.8, aspect: 1 },
                        "other:curve": { length: 0.4, aspect: 2 },
                        "other:inv-curve": { length: 0.4, aspect: 2 },
                    },
                    source: `${VIS} EdgeBase.getArrowData, ArrowHead, Bar, Box, Circle, Curve, InvertedCurve (measured on json-vis-unix, json-vis-world, json-vis-synth)`,
                },
                nodeBorderOnScreen: v(
                    true,
                    `${VIS9} NodeBase.initContextForDraw and performStroke: borderWidth / view.scale, at most the node's width`,
                ),
                node: {
                    fill: v("#97c2fc", `${VIS} lines 32986-33110`),
                    borderColor: v("#2b7ce9", `${VIS} lines 32986-33110`),
                    borderWidth: v(1, `${VIS} lines 32986-33110`),
                    // a canvas stroke along the node's own outline, half in and half out (NodeBase.performStroke)
                    borderPosition: v("center", `${VIS9} NodeBase.performStroke: ctx.stroke() on the shape's own path`),
                    shape: v("ellipse", `${VIS} lines 32986-33110`),
                    labelColor: v("#343434", `${VIS} lines 32986-33110`),
                    labelSize: v(14, `${VIS} lines 32986-33110`),
                    labelFont: v("arial", `${VIS} lines 32986-33110`),
                    labelPosition: v("center", `${VIS} lines 32986-33110`),
                    // Label.draw returns before drawing when the font is under drawThreshold - 1 px on screen
                    labelMinScreenSize: v(4, `${VIS9} Label.draw, nodes scaling.label.drawThreshold 5`),
                },
                edge: {
                    width: v(1, `${VIS} lines 25160-25290`),
                    outlineColor: v("#6f6f6f", `${VIS} lines 25160-25290 (background.color)`),
                    lineStyle: v("solid", `${VIS} lines 25160-25290 (dashes false)`),
                    sourceArrow: v("none", `${VIS} lines 25160-25290`),
                    targetArrow: v("none", `${VIS} lines 25160-25290`),
                    labelColor: v("#343434", `${VIS} lines 25160-25290`),
                    labelSize: v(14, `${VIS} lines 25160-25290`),
                    labelFont: v("arial", `${VIS} lines 25160-25290`),
                    labelMinScreenSize: v(4, `${VIS9} Label.draw, edges scaling.label.drawThreshold 5`),
                    // an edge label is drawn on the line, its letters stroked white 2 px wide (font.strokeWidth 2)
                    labelPosition: v("center", `${VIS9} Edge.drawLabel (the label at the line's middle point)`),
                    labelOutlineColor: v("#ffffff", `${VIS} lines 25160-25290 (font.strokeColor)`),
                    labelOutlineWidth: v(2, `${VIS} lines 25160-25290 (font.strokeWidth)`),
                },
                graph: {
                    background: v(
                        "#ffffff",
                        "vis-network 9.1.9 vis-network.esm.js line 32378 (clearRect: the page's white shows through)",
                    ),
                },
                derived: [
                    { kind: "labelFromColumn", column: "label", source: `${VIS} lines 32986-33110` },
                    { kind: "colorFromSourceNode", source: `${VIS} lines 25160-25290 (color.inherit "from")` },
                ],
            },
            {
                tool: "sigma",
                version: "sigma 4.0.1",
                units: "relative",
                roundedCornerRadius: cornerCap("sigma"),
                node: {
                    fill: v("#666666", `${SIGMA4} DEFAULT_NODE_DISPLAY_DATA (color "#666")`),
                    shape: v("ellipse", `${SIGMA}/settings.ts lines 119-126`),
                    width: v(20, `${SIGMA4} DEFAULT_NODE_DISPLAY_DATA (size 10 is a radius)`),
                    height: v(20, `${SIGMA4} DEFAULT_NODE_DISPLAY_DATA (size 10 is a radius)`),
                    labelColor: v("#000000", `${SIGMA}/settings.ts lines 119-126`),
                    labelFont: v("Arial", `${SIGMA}/settings.ts lines 119-126`),
                    // sigma 4 sets every node's labelSize to 12 before its styles run; the 14 in sigma.esm.js
                    // (`defaultLabelSize`) is only reached by a node whose styles cleared it.
                    labelSize: v(12, `${SIGMA4} DEFAULT_NODE_DISPLAY_DATA (labelSize 12)`),
                    labelWeight: v("normal", `${SIGMA}/settings.ts lines 119-126`),
                    labelPosition: v("right", `${SIGMA4} DEFAULT_NODE_DISPLAY_DATA (labelPosition "right")`),
                    // sigma keeps the largest node's label per 100 px cell of its first framing; it avoids no overlap
                    labelGridCellSize: v(
                        100,
                        `${SIGMA4} LabelGrid.getLabelsToDisplay (labelDensity 1, labelGridCellSize 100)`,
                    ),
                    labelOnTop: v(true, `${SIGMA4} labels are drawn by their own program after every node and edge`),
                    // a node's label is drawn only while its node's rendered size (a radius) is 6 px or more
                    labelMinNodeScreenSize: v(12, `${SIGMA4} renderLabels (labelRenderedSizeThreshold 6, a radius)`),
                },
                edge: {
                    color: v("#cccccc", `${SIGMA}/settings.ts lines 119-126`),
                    // an edge of sigma's default size 1, drawn half as wide as its size (readSigmaRow)
                    width: v(0.5, `${SIGMA4} DEFAULT_EDGE_DISPLAY_DATA (size 1)`),
                    // an edge label (renderEdgeLabels) is drawn at its line's middle, 12 px, in #666
                    labelColor: v("#666666", `${SIGMA4} DEFAULT_EDGE_DISPLAY_DATA (labelColor "#666")`),
                    labelSize: v(12, "sigma 4.0.1 dist/sigma.esm.js line 2816 (DEFAULT_EDGE_LABEL_SIZE)"),
                    labelPosition: v("center", "sigma 4.0.1 dist/sigma.esm.js line 3647 (the middle of its two ends)"),
                    sourceArrow: v("none", `${SIGMA}/settings.ts lines 119-126 (type line)`),
                    targetArrow: v("none", `${SIGMA}/settings.ts lines 119-126 (type line)`),
                    // no edge is drawn thinner on screen, whatever its size (the shader's max(size, minEdgeThickness 1.7),
                    // drawn half as wide as a node of that size is in radius, as readSigmaRow halves a size)
                    minScreenWidth: v(
                        0.85,
                        `${SIGMA4} edge program (pixelsThickness = max(size, minEdgeThickness 1.7))`,
                    ),
                },
                graph: {
                    background: v(
                        "#ffffff",
                        "sigma 4.0.1 dist/sigma.esm.js line 5202 (gl.clear to transparent: the page's white shows through)",
                    ),
                },
                derived: [{ kind: "labelFromColumn", column: "label", source: `${SIGMA}/settings.ts lines 119-126` }],
            },
            {
                tool: "pajek",
                version: "Pajek 6.02",
                // PostScript points, the unit of Pajek's EPS and SVG export (formats/pajek/styles.ts)
                units: "px",
                roundedCornerRadius: cornerCap("pajek"),
                // a line's `s` (arrowSize) scales Pajek's arrowhead whatever its width: 6 x s long (tip to its back
                // corners) and 5 x s wide
                arrowhead: {
                    length: (size) => 6 * size,
                    aspect: 5 / 6,
                    source: `${PAJEK_SVG}specimen-arrows: s 0.5, 1, 2, 3 and 5 draw arrowheads 3, 6, 12, 18 and 30 long, 2.5, 5, 10, 15 and 25 wide; football: s 4 and 9)`,
                },
                node: {
                    shape: v("ellipse", `${PAJEK} p. 85`),
                    opacity: v(1, `${PAJEK} p. 87`),
                    // Pajek 6.02's own defaults, as its SVG export draws a vertex and label the file gives no
                    // parameters for (the manual names these settings but not their values)
                    borderColor: v("#660000", `${PAJEK_SVG}football, kdorola: every vertex without bc)`),
                    borderWidth: v(0.5, `${PAJEK_SVG}football, kdorola: every vertex without bw)`),
                    // an SVG stroke along the vertex's own outline, half in and half out
                    borderPosition: v(
                        "center",
                        `${PAJEK_SVG}specimen-node-fills-borders-p3: bw 8 draws a vertex of size 36 44 across)`,
                    ),
                    width: v(20, `${PAJEK_SVG}football, iliad: a vertex without s_size, x_fact or y_fact)`),
                    height: v(20, `${PAJEK_SVG}football, iliad: a vertex without s_size, x_fact or y_fact)`),
                    fill: v("#ffd9bc", `${PAJEK_SVG}football, kdorola: every vertex without ic)`),
                    labelColor: v("#ad0000", `${PAJEK_SVG}football, 1crn: every label without lc)`),
                    labelSize: v(15, `${PAJEK_SVG}football, 1crn: every label without fos)`),
                    labelFont: v("Arial", `${PAJEK_SVG}football, 1crn: every label without font)`),
                    labelWeight: v("bold", `${PAJEK_SVG}football, 1crn: every label is bold)`),
                    // the text starts 20 from the center at lphi 285 and runs to the right, its baseline through
                    // that point: its left edge's middle at 20 cos 285 across and 20 sin 285 less 0.3465 of its
                    // size down (formats/pajek/styles.ts readLabelPosition)
                    labelPosition: v("center", `${PAJEK_SVG}football, 1crn, specimen-labels: lr 20 lphi 285)`),
                    labelOffsetX: v(5.176380902, `${PAJEK_SVG}football, 1crn, specimen-labels: lr 20 lphi 285)`),
                    labelOffsetY: v(14.121016526, `${PAJEK_SVG}football, 1crn, specimen-labels: lr 20 lphi 285)`),
                    labelShiftX: v(0.5, `${PAJEK_SVG}football, 1crn, specimen-labels: text-anchor start)`),
                },
                edge: {
                    // an edge (undirected) is drawn twice the width of an arc; the arc rule below sets an arc's
                    width: v(2, `${PAJEK_SVG}1crn, lin-rel4, synth-vertices: edges without w; c: w 0.5 drawn 1)`),
                    color: v("#007091", `${PAJEK_SVG}1crn, lin-rel4, c: edges without c)`),
                    lineStyle: v("solid", `${PAJEK} p. 90`),
                    opacity: v(1, `${PAJEK} p. 87`),
                    sourceArrow: v("none", `${PAJEK} p. 91`),
                    targetArrow: v("none", `${PAJEK} p. 91 (edges have none)`),
                },
                graph: {
                    background: v("#ffffff", `${PAJEK}, Draw window (assumed: a white background)`),
                },
                derived: [
                    { kind: "labelFromColumn", column: "label", source: `${PAJEK}, vertex labels (drawn by default)` },
                    { kind: "targetArrowOnDirected", arrow: "triangle", source: `${PAJEK} p. 91 (arcs)` },
                ],
            },
            {
                tool: "ogdf",
                version: "ogdf master 1a40505ac006",
                units: "px",
                roundedCornerRadius: cornerCap("ogdf"),
                // OGDF's arrowhead is three times its line's width long and half as wide as it is long
                arrowhead: {
                    length: (size, width) => 3 * width * size,
                    aspect: 0.5,
                    source: `${MEASURED}gml-specimen-arrows-p5.svg: lineWidth 1, 1.5 and 3 draw arrowheads 3, 4.5 and 9 long, 1.5, 2.25 and 4.5 wide)`,
                },
                node: {
                    fill: v("#ffffff", `${OGDF} LayoutStandards.cpp lines 38-45`),
                    shape: v("rectangle", `${OGDF} LayoutStandards.cpp lines 38-45`),
                    width: v(20, `${OGDF} LayoutStandards.cpp lines 38-45`),
                    height: v(20, `${OGDF} LayoutStandards.cpp lines 38-45`),
                    borderColor: v("#000000", `${OGDF} LayoutStandards.cpp lines 38-45`),
                    borderWidth: v(1, `${OGDF} LayoutStandards.cpp lines 38-45`),
                    borderStyle: v("solid", `${OGDF} LayoutStandards.cpp lines 38-45`),
                    // GraphIO::drawSVG's default SVGSettings: every label in one font, centered on its node
                    labelColor: v("#000000", `${OGDF_SVG}fill #000000)`),
                    labelFont: v("Arial", `${OGDF_SVG}font-family Arial)`),
                    labelSize: v(10, `${OGDF_SVG}font-size 10)`),
                    labelPosition: v("center", `${OGDF_SVG}text-anchor middle at the node's center)`),
                },
                edge: {
                    color: v("#000000", `${OGDF} LayoutStandards.cpp lines 38-45`),
                    width: v(1, `${OGDF} LayoutStandards.cpp lines 38-45`),
                    lineStyle: v("solid", `${OGDF} LayoutStandards.cpp lines 38-45`),
                    labelColor: v("#000000", `${OGDF_SVG}fill #000000)`),
                    labelFont: v("Arial", `${OGDF_SVG}font-family Arial)`),
                    labelSize: v(10, `${OGDF_SVG}font-size 10)`),
                    labelPosition: v("center", `${OGDF_SVG}text-anchor middle on the line, dominant-baseline middle)`),
                },
                graph: { background: v("#ffffff", `${OGDF_SVG}no background: the page's white shows through)`) },
                derived: [],
            },
            {
                tool: "networkx",
                version: "networkx 3.7 (main 6da4704cbf32)",
                units: "px",
                roundedCornerRadius: cornerCap("networkx"),
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
