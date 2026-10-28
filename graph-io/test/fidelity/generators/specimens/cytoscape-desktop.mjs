#!/usr/bin/env node
// The Cytoscape desktop specimen sheets (../../specimens/README.md), built INSIDE a running Cytoscape 3.10.5 over
// CyREST and saved by Cytoscape itself as XGMML, CX, CX2 and a session, so every sheet file is one a real user of
// the program would have:
//
//   node cytoscape-desktop.mjs <rest port> [sheet id ...]   build the sheets (default: all) into specimens/{xgmml,cx,cx2,cys}/
//   node cytoscape-desktop.mjs <rest port> --lexicon        re-read the live lexicon into cytoscape-desktop-lexicon.json
//
// The vocabulary is Cytoscape's own: cytoscape-desktop-lexicon.json beside this file is the live CyREST lexicon
// (GET /v1/styles/visualproperties and /values for each), and every enumerated value list below is read from it.
// A build first compares the running program's lexicon with that file and stops on any difference, so a new or
// dropped visual property or value shows up as a new or missing specimen. Every visual property is either set by
// a specimen or listed in SKIPPED with the reason; cytoscape-desktop-coverage.json (written by each build) maps
// every property and value to the specimens that set it.
//
// Every sheet sets every property it does not sweep to the neutral baseline of ../sheet-layout.json through its
// style's defaults, places every element at a fixed position (no layout runs), and has the four anchor-* corner
// nodes and a text-only caption node cap-<specimen id> under each specimen. Specimen values are per-element
// bypasses; the specimen-mappings-bypass pages reach values through the style instead: page 1 mixes defaults,
// discrete, continuous and passthrough mappings and bypasses over mappings, and every later page replays one bypass
// sheet with each bypass turned into a discrete mapping on the name column (Cytoscape matches by name).
import console from "node:console";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { ANCHORS, cells, layout } from "../sheet-layout.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const specimensDir = resolve(here, "../../specimens");
const lexiconFile = join(here, "cytoscape-desktop-lexicon.json");
const coverageFile = join(here, "cytoscape-desktop-coverage.json");

const [port, ...args] = process.argv.slice(2);
if (!port) throw new Error("usage: cytoscape-desktop.mjs <rest port> [--lexicon | sheet id ...]");
const base = `http://localhost:${port}/v1`;
const call = async (method, path, body) => {
    const res = await globalThis.fetch(base + path, {
        method,
        headers: body ? { "content-type": "application/json" } : {},
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 400)}`);
    const out = text ? JSON.parse(text) : null;
    if (out?.errors?.length) throw new Error(`${method} ${path}: ${JSON.stringify(out.errors).slice(0, 400)}`);
    return out;
};
const command = (ns, c, a) => call("POST", `/commands/${ns}/${encodeURIComponent(c)}`, a);

// ------------------------------------------------------------------------------------------------ the lexicon

/** The live lexicon: every visual property with its target, default and (for enumerations) its values, sorted. */
async function liveLexicon() {
    const vps = await call("GET", "/styles/visualproperties");
    const out = [];
    for (const v of vps.sort((a, b) => (a.visualProperty < b.visualProperty ? -1 : 1))) {
        const r = await call("GET", `/styles/visualproperties/${v.visualProperty}/values`).catch(() => null);
        const values = r?.values?.length ? [...r.values].map(String).sort() : null;
        out.push({ id: v.visualProperty, name: v.name, target: v.targetDataType, default: String(v.default), values });
    }
    return out;
}

const version = (await call("GET", "/version")).cytoscapeVersion;
if (args[0] === "--lexicon") {
    const lexicon = {
        program: "Cytoscape desktop",
        version,
        source: `${base}/styles/visualproperties`,
        visualProperties: await liveLexicon(),
    };
    writeFileSync(lexiconFile, `${JSON.stringify(lexicon, null, 2)}\n`);
    console.log(`${lexicon.visualProperties.length} visual properties written to ${lexiconFile}`);
    process.exit(0);
}
const lexicon = JSON.parse(readFileSync(lexiconFile, "utf8"));
{
    const live = JSON.stringify(await liveLexicon());
    if (live !== JSON.stringify(lexicon.visualProperties)) {
        throw new Error(
            `Cytoscape ${version}'s lexicon differs from cytoscape-desktop-lexicon.json (${lexicon.version}): ` +
                "run with --lexicon, then give every new property or value a specimen (or a SKIPPED reason)",
        );
    }
}
const VP = new Map(lexicon.visualProperties.map((v) => [v.id, v]));
const values = (id) => {
    const v = VP.get(id)?.values;
    if (!v) throw new Error(`the lexicon lists no values for ${id}`);
    return v;
};

/** The visual properties no specimen sets, and why. Every other property in the lexicon must have a specimen. */
const SKIPPED = {
    NODE: "the abstract root of the node properties, not a setting",
    EDGE: "the abstract root of the edge properties, not a setting",
    NETWORK: "the abstract root of the network properties, not a setting",
    DING_RENDERING_ENGINE_ROOT: "the renderer's root property, not a setting",
    NODE_SELECTED: "selection state, out of scope (selected-state styles are skipped)",
    EDGE_SELECTED: "selection state, out of scope",
    NODE_SELECTED_PAINT: "selected-state color, out of scope",
    EDGE_SELECTED_PAINT: "selected-state color, out of scope",
    EDGE_STROKE_SELECTED_PAINT: "selected-state color, out of scope",
    EDGE_SOURCE_ARROW_SELECTED_PAINT: "selected-state color, out of scope",
    EDGE_TARGET_ARROW_SELECTED_PAINT: "selected-state color, out of scope",
    NODE_TOOLTIP: "shown on hover only; never drawn in an exported image",
    EDGE_TOOLTIP: "shown on hover only; never drawn in an exported image",
    NODE_DEPTH: "a 3D extent; Cytoscape's 2D renderer (Ding) does not draw it",
    NETWORK_DEPTH: "a 3D extent; Ding does not draw it",
    NETWORK_CENTER_Z_LOCATION: "a 3D camera coordinate; Ding does not draw it",
    NETWORK_CENTER_X_LOCATION: "the camera; the oracle route fits the view to the content",
    NETWORK_CENTER_Y_LOCATION: "the camera; the oracle route fits the view to the content",
    NETWORK_SCALE_FACTOR: "the camera zoom; the oracle route fits the view to the content",
    NETWORK_WIDTH: "the view's pixel size; the oracle route sets it to 1200",
    NETWORK_HEIGHT: "the view's pixel size; the oracle route sets it to 900",
    NETWORK_SIZE: "the view's pixel size; the oracle route sets it",
    NETWORK_TITLE: "the view's window title; never drawn in the view",
    NETWORK_NODE_SELECTION: "whether nodes can be selected (interaction only)",
    NETWORK_EDGE_SELECTION: "whether edges can be selected (interaction only)",
    NETWORK_NODE_LABEL_SELECTION: "whether labels can be selected (interaction only)",
    NETWORK_ANNOTATION_SELECTION: "whether annotations can be selected (interaction only)",
    NETWORK_FORCE_HIGH_DETAIL: "renderer level of detail; an SVG export is always drawn in full detail",
    NODE_NESTED_NETWORK_IMAGE_VISIBLE:
        "needs a nested network (a node pointing at another network), which XGMML, CX and CX2 do not save",
    ...Object.fromEntries(
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [
            `NODE_CUSTOMPAINT_${n}`,
            `the internal parent of NODE_CUSTOMGRAPHICS_${n}; it has no value of its own to set`,
        ]),
    ),
};

// ------------------------------------------------------------------------------------------------ the baseline

const N = layout.neutral;
const font = (size, family = N.fontFamily, style = "plain") => `${family},${style},${size}`;
const NEUTRAL_DEFAULTS = {
    NETWORK_BACKGROUND_PAINT: "#FFFFFF",
    NODE_SHAPE: "ELLIPSE",
    NODE_FILL_COLOR: N.fill.toUpperCase(),
    NODE_TRANSPARENCY: 255,
    NODE_BORDER_PAINT: N.border.toUpperCase(),
    NODE_BORDER_WIDTH: N.borderWidth,
    NODE_BORDER_STROKE: "SOLID",
    NODE_BORDER_TRANSPARENCY: 255,
    NODE_WIDTH: N.size,
    NODE_HEIGHT: N.size,
    NODE_SIZE: N.size,
    NODE_LABEL_COLOR: N.labelColor.toUpperCase(),
    NODE_LABEL_FONT_FACE: font(N.fontSize),
    NODE_LABEL_FONT_SIZE: N.fontSize,
    NODE_LABEL_POSITION: "C,C,c,0.00,0.00",
    NODE_LABEL_TRANSPARENCY: 255,
    NODE_LABEL_WIDTH: 200,
    NODE_LABEL_ROTATION: 0,
    NODE_LABEL_BACKGROUND_SHAPE: "NONE",
    NODE_Z_LOCATION: 0,
    NODE_VISIBLE: true,
    COMPOUND_NODE_SHAPE: "ROUND_RECTANGLE",
    COMPOUND_NODE_PADDING: 10,
    EDGE_STROKE_UNSELECTED_PAINT: N.edgeColor.toUpperCase(),
    EDGE_WIDTH: N.edgeWidth,
    EDGE_LINE_TYPE: "SOLID",
    EDGE_TRANSPARENCY: 255,
    EDGE_SOURCE_ARROW_SHAPE: "NONE",
    EDGE_TARGET_ARROW_SHAPE: "NONE",
    EDGE_SOURCE_ARROW_SIZE: 6,
    EDGE_TARGET_ARROW_SIZE: 6,
    EDGE_SOURCE_ARROW_UNSELECTED_PAINT: N.edgeColor.toUpperCase(),
    EDGE_TARGET_ARROW_UNSELECTED_PAINT: N.edgeColor.toUpperCase(),
    EDGE_CURVED: true,
    EDGE_STACKING: "AUTO_BEND",
    EDGE_STACKING_DENSITY: 0.5,
    EDGE_LABEL_COLOR: N.labelColor.toUpperCase(),
    EDGE_LABEL_FONT_FACE: font(N.fontSize),
    EDGE_LABEL_FONT_SIZE: N.fontSize,
    EDGE_LABEL_TRANSPARENCY: 255,
    EDGE_LABEL_WIDTH: 200,
    EDGE_LABEL_ROTATION: 0,
    EDGE_LABEL_AUTOROTATE: false,
    EDGE_LABEL_BACKGROUND_SHAPE: "NONE",
    EDGE_Z_ORDER: 0,
    EDGE_VISIBLE: true,
};
/**
 * Properties a replayed page keeps as bypasses: Cytoscape 3.10.5 cannot reopen its own CX2 export when the style maps
 * one of them (a NODE_PAINT mapping is written as invalid JSON; an EDGE_BEND, EDGE_LABEL_POSITION or
 * EDGE_LABEL_FONT_FACE mapping is written, but loading the file fails with "Network view is null"), so no oracle
 * could be drawn from that file.
 */
const CX2_CANNOT_MAP = new Set(["NODE_PAINT", "EDGE_BEND", "EDGE_LABEL_POSITION", "EDGE_LABEL_FONT_FACE"]);
const NEUTRAL_DEPENDENCIES = { nodeSizeLocked: false, arrowColorMatchesEdge: false, nodeCustomGraphicsSizeSync: true };

/** The caption node's look: text only (no fill, no border), at the caption font size, wrapped to the cell. */
const CAPTION = {
    NODE_TRANSPARENCY: 0,
    NODE_BORDER_WIDTH: 0,
    NODE_BORDER_TRANSPARENCY: 0,
    NODE_WIDTH: 1,
    NODE_HEIGHT: 1,
    NODE_SIZE: 1,
    NODE_LABEL_FONT_FACE: font(layout.captionFontSize),
    NODE_LABEL_FONT_SIZE: layout.captionFontSize,
    NODE_LABEL_COLOR: "#000000",
    NODE_LABEL_POSITION: "C,C,c,0.00,0.00",
    NODE_LABEL_WIDTH: 108,
};
const ANCHOR = { NODE_WIDTH: layout.anchors.size, NODE_HEIGHT: layout.anchors.size, NODE_SIZE: layout.anchors.size };

/** A caption: the property as Cytoscape names it, less its NODE_ / EDGE_ prefix, `=`, the value; wrapped after `=`. */
function caption(vp, value) {
    const p = vp.replace(/^(NODE|EDGE)_/, "").toLowerCase();
    const v = String(value);
    return `${p}=${p.length + v.length > 18 ? "\n" : ""}${v}`;
}
const slug = (s) =>
    String(s)
        .replace(/^-(?=\d)/, "minus-")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

// ------------------------------------------------------------------------------------------------ specimens
// A specimen: { id, kind, vp, value, set: { VP: value } (the setting), base: { VP: value } (an explicit baseline the
// setting needs to be seen, such as a border width under a border style), label (column value), caption }.
// Kinds: node, edge, diag (an edge from low left to high right), loop, parallel (count edges), group, zpair, annotation.

const nodeSp = (vp, value, extra = {}) => ({
    id: extra.id ?? `${slug(vp.replace(/^(NODE|EDGE)_/, ""))}-${slug(value)}`,
    kind: "node",
    vp,
    value,
    set: { [vp]: value },
    ...extra,
});
const edgeSp = (vp, value, extra = {}) => ({ ...nodeSp(vp, value, extra), kind: extra.kind ?? "edge" });
const dflt = (kind) => ({ id: "default", kind, vp: null, value: null, set: {}, caption: "default" });

const DEJAVU = ["DejaVu Sans", "DejaVu Serif", "DejaVu Sans Mono"];
const JAVA_LOGICAL = ["SansSerif", "Serif", "Monospaced", "Dialog", "DialogInput"];
const FILLS = ["#D62728", "#2CA02C", "#1F77B4", "#FF7F0E", "#9467BD", "#000000", "#FFFFFF", "#FFFF00"];
const ANCHOR_POINTS = ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"];
const IMG = "https://raw.githubusercontent.com/cytoscape/cytoscape.js/master/documentation/img/cytoscape-logo.png";
/**
 * The arrow annotation's heads by the number Cytoscape 3.10.5 saves (ding's ArrowAnnotationImpl.ArrowType, in
 * declaration order; read from its class, ding-presentation-impl-3.10.5.jar).
 */
const ARROW_TYPES = [
    "Circle",
    "Closed Arrow",
    "Concave Arrow",
    "Diamond",
    "Open Arrow",
    "No Arrow",
    "X Arrow",
    "Triangular Head",
    "T-Shape",
];
/** A Java ARGB color as Cytoscape saves an annotation's color: a signed 32-bit integer. */
const javaColor = (hex, alpha = 0xff) => String((alpha << 24) | parseInt(hex.slice(1), 16) | 0);
/**
 * The neutral arrow annotation every arrow specimen changes one field of: a Closed Arrow head at the target only, the
 * neutral edge color. (Cytoscape draws no line at all for an arrow with no head at either end.)
 */
const ARROW_NEUTRAL = {
    sourceType: 5,
    targetType: 1,
    sourceSize: "1.0",
    targetSize: "1.0",
    lineColor: javaColor(layout.neutral.edgeColor),
    sourceColor: javaColor(layout.neutral.edgeColor),
    targetColor: javaColor(layout.neutral.edgeColor),
    lineThickness: "1.0",
    canvas: "foreground",
    rotation: "0.0",
};
const cg = (factory, props) => `org.cytoscape.${factory}:${JSON.stringify(props)}`;
const CHART_DATA = { cy_dataColumns: ["a", "b", "c"], cy_range: [0, 10], cy_colors: ["#D62728", "#2CA02C", "#1F77B4"] };
const HEAT_COLORS = ["#2166AC", "#F7F7F7", "#B2182B"];
const LIST_DATA = { cy_dataColumns: ["series"], cy_range: [0, 10], cy_colors: ["#1F77B4"] };
const GRADIENT = (props) =>
    cg("LinearGradient", {
        cy_angle: 0,
        cy_gradientColors: ["#FFFFFF", "#1F77B4"],
        cy_gradientFractions: [0, 1],
        ...props,
    });
const RADIAL = (props) =>
    cg("RadialGradient", {
        cy_gradientColors: ["#FFFFFF", "#D62728"],
        cy_gradientFractions: [0, 1],
        cy_center: { x: 0.5, y: 0.5 },
        cy_radius: 0.5,
        ...props,
    });
/** The chart and gradient specimens, by id: what NODE_CUSTOMGRAPHICS_1 is set to. */
const CHARTS = {
    pie: cg("PieChart", { ...CHART_DATA, cy_startAngle: 0 }),
    "pie-start-90": cg("PieChart", { ...CHART_DATA, cy_startAngle: 90 }),
    "pie-rotation-clockwise": cg("PieChart", { ...CHART_DATA, cy_startAngle: 0, cy_rotation: "CLOCKWISE" }),
    "pie-border": cg("PieChart", { ...CHART_DATA, cy_startAngle: 0, cy_borderWidth: 2, cy_borderColor: "#000000" }),
    "pie-item-labels": cg("PieChart", {
        ...CHART_DATA,
        cy_startAngle: 0,
        cy_showItemLabels: true,
        cy_itemLabels: ["A", "B", "C"],
    }),
    "pie-item-label-font-size-20": cg("PieChart", {
        ...CHART_DATA,
        cy_startAngle: 0,
        cy_showItemLabels: true,
        cy_itemLabels: ["A", "B", "C"],
        cy_itemLabelFontSize: 20,
    }),
    // cy_values: the numbers written into the graphic itself instead of read from columns
    "pie-values": cg("PieChart", { cy_values: [1, 1, 2], cy_range: [0, 10], cy_colors: CHART_DATA.cy_colors }),
    ring: cg("RingChart", { ...CHART_DATA, cy_startAngle: 0, cy_holeSize: 0.4 }),
    "ring-hole-0-7": cg("RingChart", { ...CHART_DATA, cy_startAngle: 0, cy_holeSize: 0.7 }),
    "ring-hole-0-1": cg("RingChart", { ...CHART_DATA, cy_startAngle: 0, cy_holeSize: 0.1 }),
    "bar-grouped": cg("BarChart", { ...CHART_DATA, cy_type: "GROUPED" }),
    "bar-stacked": cg("BarChart", { ...CHART_DATA, cy_type: "STACKED" }),
    "bar-heat-strips": cg("BarChart", { ...CHART_DATA, cy_type: "HEAT_STRIPS" }),
    "bar-up-down": cg("BarChart", { ...CHART_DATA, cy_range: [-10, 10], cy_type: "UP_DOWN" }),
    "bar-horizontal": cg("BarChart", { ...CHART_DATA, cy_type: "GROUPED", cy_orientation: "HORIZONTAL" }),
    "bar-separation": cg("BarChart", { ...CHART_DATA, cy_type: "GROUPED", cy_separation: 0.5 }),
    "bar-range-axis": cg("BarChart", { ...CHART_DATA, cy_type: "GROUPED", cy_showRangeAxis: true }),
    "bar-domain-axis": cg("BarChart", { ...CHART_DATA, cy_type: "GROUPED", cy_showDomainAxis: true }),
    "bar-border": cg("BarChart", { ...CHART_DATA, cy_type: "GROUPED", cy_borderWidth: 2, cy_borderColor: "#000000" }),
    "bar-zero-baseline": cg("BarChart", {
        ...CHART_DATA,
        cy_range: [-10, 10],
        cy_type: "GROUPED",
        cy_showRangeZeroBaseline: true,
    }),
    "bar-axis-color-width": cg("BarChart", {
        ...CHART_DATA,
        cy_type: "GROUPED",
        cy_showRangeAxis: true,
        cy_axisColor: "#D62728",
        cy_axisWidth: 2,
    }),
    "bar-item-labels": cg("BarChart", {
        ...CHART_DATA,
        cy_type: "GROUPED",
        cy_showItemLabels: true,
        cy_itemLabels: ["A", "B", "C"],
    }),
    "bar-global-range-false": cg("BarChart", { ...CHART_DATA, cy_type: "GROUPED", cy_globalRange: false }),
    // a named color scheme instead of cy_colors (deprecated, still read; RANDOM is left out: not repeatable)
    "bar-color-scheme-contrasting": cg("BarChart", {
        cy_dataColumns: CHART_DATA.cy_dataColumns,
        cy_range: [0, 10],
        cy_type: "GROUPED",
        cy_colorScheme: "CONTRASTING",
    }),
    "bar-color-scheme-rainbow": cg("BarChart", {
        cy_dataColumns: CHART_DATA.cy_dataColumns,
        cy_range: [0, 10],
        cy_type: "GROUPED",
        cy_colorScheme: "RAINBOW",
    }),
    box: cg("BoxChart", LIST_DATA),
    "box-horizontal": cg("BoxChart", { ...LIST_DATA, cy_orientation: "HORIZONTAL" }),
    // Cytoscape's heat strip chart is the HeatMapChart factory (there is no HeatStripChart: that id draws nothing)
    "heat-map": cg("HeatMapChart", { ...CHART_DATA, cy_colors: HEAT_COLORS }),
    "heat-map-horizontal": cg("HeatMapChart", { ...CHART_DATA, cy_colors: HEAT_COLORS, cy_orientation: "HORIZONTAL" }),
    "heat-map-axes": cg("HeatMapChart", {
        ...CHART_DATA,
        cy_colors: HEAT_COLORS,
        cy_showDomainAxis: true,
        cy_showRangeAxis: true,
    }),
    line: cg("LineChart", { ...LIST_DATA, cy_lineWidth: 1 }),
    "line-width-3": cg("LineChart", { ...LIST_DATA, cy_lineWidth: 3 }),
    "line-horizontal": cg("LineChart", { ...LIST_DATA, cy_lineWidth: 1, cy_orientation: "HORIZONTAL" }),
    "linear-gradient": GRADIENT({}),
    "linear-gradient-45": GRADIENT({ cy_angle: 45 }),
    "linear-gradient-90": GRADIENT({ cy_angle: 90 }),
    "linear-gradient-180": GRADIENT({ cy_angle: 180 }),
    "linear-gradient-3-stops": GRADIENT({
        cy_gradientColors: ["#D62728", "#FFFFFF", "#1F77B4"],
        cy_gradientFractions: [0, 0.5, 1],
    }),
    "radial-gradient": RADIAL({}),
    "radial-gradient-center": RADIAL({ cy_center: { x: 0.25, y: 0.25 } }),
    "radial-gradient-radius": RADIAL({ cy_radius: 0.25 }),
    "heat-map-list": cg("HeatMapChart", { ...LIST_DATA, cy_colors: HEAT_COLORS }),
    // no image here: a bypass can only name an image already in the session's image manager (a URL bypassed over
    // CyREST draws Cytoscape's "?" placeholder); the mappings page reaches an image URL through a passthrough mapping
};
/**
 * The chart options the earlier chart pages leave out, read from custom-graphics-internal's AbstractChart and the bar,
 * line and heat map charts: the axis label size, the domain labels' slant (LabelPosition; STANDARD is the default) and
 * labels read from a list column instead of the column names. They go on specimen-images-charts-p7. cy_autoRange is
 * left out: only the chart editor reads it (to fill in cy_range), never the drawing.
 */
// the slant and column specimens also set the axis label size to 10: at the default size the labels are too small to
// see on a 60 node, so the slant or the label text would not show
const AXIS_LABELS = { cy_axisLabelFontSize: 10 };
const BAR_AXES = { ...CHART_DATA, cy_type: "GROUPED", cy_showDomainAxis: true, ...AXIS_LABELS };
const CHARTS_P7 = {
    "bar-axis-label-font-size-20": cg("BarChart", { ...BAR_AXES, cy_showRangeAxis: true, cy_axisLabelFontSize: 20 }),
    "bar-axis-label-font-size-10": cg("BarChart", { ...BAR_AXES, cy_showRangeAxis: true }),
    ...Object.fromEntries(
        ["UP_45", "UP_90", "DOWN_45", "DOWN_90"].map((p) => [
            `bar-domain-label-position-${p.toLowerCase().replace("_", "-")}`,
            cg("BarChart", { ...BAR_AXES, cy_domainLabelPosition: p }),
        ]),
    ),
    "bar-domain-labels-column": cg("BarChart", { ...BAR_AXES, cy_domainLabelsColumn: "chartLabels" }),
    "bar-range-labels-column": cg("BarChart", {
        ...CHART_DATA,
        cy_type: "GROUPED",
        cy_showRangeAxis: true,
        cy_rangeLabelsColumn: "chartLabels",
        ...AXIS_LABELS,
    }),
    "pie-item-labels-column": cg("PieChart", {
        ...CHART_DATA,
        cy_startAngle: 0,
        cy_showItemLabels: true,
        cy_itemLabelsColumn: "chartLabels",
        cy_itemLabelFontSize: 10,
    }),
    "heat-map-item-labels-column": cg("HeatMapChart", {
        ...CHART_DATA,
        cy_colors: HEAT_COLORS,
        cy_showDomainAxis: true,
        cy_itemLabelsColumn: "chartLabels",
        ...AXIS_LABELS,
    }),
    "line-domain-labels-column": cg("LineChart", {
        ...LIST_DATA,
        cy_lineWidth: 1,
        cy_showDomainAxis: true,
        cy_domainLabelsColumn: "chartLabels",
        ...AXIS_LABELS,
    }),
};
/** The chart specimens added after the first chart page was drawn; they go on specimen-images-charts-p5. */
const CHARTS_P5 = new Set([
    "pie-rotation-clockwise",
    "pie-border",
    "pie-item-labels",
    "pie-item-label-font-size-20",
    "pie-values",
    "ring-hole-0-1",
    "bar-zero-baseline",
    "bar-axis-color-width",
    "bar-item-labels",
    "bar-global-range-false",
    "bar-color-scheme-contrasting",
    "bar-color-scheme-rainbow",
    "box-horizontal",
    "heat-map-horizontal",
    "heat-map-axes",
    "line-horizontal",
]);
/** One graphic per slot 2..9 (slot 1 is CHARTS above), small enough that stacked slots stay apart. */
const SLOT_GRAPHICS = ["pie", "ring", "bar-grouped", "linear-gradient", "radial-gradient", "heat-map", "line", "box"];

function sheets() {
    const out = [];
    const add = (id, specimens, options = {}) => out.push({ id, specimens, ...options });

    // node shapes: every NODE_SHAPE, square and wide (wide shows how the shape stretches)
    const shapes = values("NODE_SHAPE");
    add("specimen-node-shapes", [
        dflt("node"),
        ...shapes.map((s) => nodeSp("NODE_SHAPE", s)),
        ...shapes.map((s) =>
            nodeSp("NODE_SHAPE", s, {
                id: `shape-${slug(s)}-wide`,
                caption: `shape=\n${s} 60x30`,
                base: { NODE_WIDTH: 60, NODE_HEIGHT: 30 },
            }),
        ),
    ]);

    // fills and borders
    add("specimen-node-fills-borders", [
        dflt("node"),
        ...FILLS.map((c) => nodeSp("NODE_FILL_COLOR", c)),
        nodeSp("NODE_PAINT", "#D62728"),
        ...["#D62728", "#1F77B4", "#000000", "#FFFFFF"].map((c) =>
            nodeSp("NODE_BORDER_PAINT", c, { base: { NODE_BORDER_WIDTH: 4 } }),
        ),
        ...[0, 0.5, 3, 6, 10].map((w) => nodeSp("NODE_BORDER_WIDTH", w)),
        ...values("NODE_BORDER_STROKE").map((s) => nodeSp("NODE_BORDER_STROKE", s, { base: { NODE_BORDER_WIDTH: 4 } })),
    ]);

    // sizes and opacity: unlocked width and height, then NODE_SIZE under nodeSizeLocked
    const zpair = (vp, value, id) => ({ id, kind: "zpair", vp, value, set: { [vp]: value } });
    add("specimen-node-sizes-opacity", [
        dflt("node"),
        ...[18, 60, 80].map((w) => nodeSp("NODE_WIDTH", w)),
        ...[18, 60, 80].map((h) => nodeSp("NODE_HEIGHT", h)),
        nodeSp("NODE_SIZE", 80, { id: "size-80-unlocked" }),
        ...[0, 64, 128, 192].map((t) => nodeSp("NODE_TRANSPARENCY", t)),
        ...[0, 128].map((t) => nodeSp("NODE_BORDER_TRANSPARENCY", t, { base: { NODE_BORDER_WIDTH: 6 } })),
        nodeSp("NODE_VISIBLE", false),
        zpair("NODE_Z_LOCATION", 10, "z-location-10"),
    ]);
    add(
        "specimen-node-sizes-opacity-p2",
        [
            dflt("node"),
            ...[18, 60, 80].map((s) => nodeSp("NODE_SIZE", s)),
            nodeSp("NODE_WIDTH", 80, { id: "width-80-locked" }),
            nodeSp("NODE_HEIGHT", 80, { id: "height-80-locked" }),
        ],
        { dependencies: { nodeSizeLocked: true } },
    );

    // labels
    const L = { label: "Label" };
    const lab = (vp, value, extra = {}) => nodeSp(vp, value, { ...L, ...extra });
    add("specimen-labels", [
        { ...dflt("node"), ...L },
        lab("NODE_LABEL", "Text", { id: "label-text" }),
        lab("NODE_LABEL", "A longer label text", { id: "label-long" }),
        lab("NODE_LABEL", "Two\nlines", { id: "label-two-lines" }),
        ...["#D62728", "#1F77B4", "#FFFFFF"].map((c) => lab("NODE_LABEL_COLOR", c)),
        ...[6, 8, 14, 20, 28].map((s) => lab("NODE_LABEL_FONT_SIZE", s)),
        ...[...JAVA_LOGICAL, ...DEJAVU.slice(1)].map((f) =>
            lab("NODE_LABEL_FONT_FACE", font(N.fontSize, f), { id: `font-face-${slug(f)}` }),
        ),
        ...["bold", "italic", "bolditalic"].map((s) =>
            lab("NODE_LABEL_FONT_FACE", font(N.fontSize, `${N.fontFamily}`, s === "bolditalic" ? "bold,italic" : s), {
                id: `font-face-dejavu-sans-${s}`,
            }),
        ),
        ...["bold", "italic"].map((s) =>
            lab("NODE_LABEL_FONT_FACE", font(N.fontSize, `SansSerif.${s}`, s), { id: `font-face-sansserif-${s}` }),
        ),
        ...[0, 64, 128, 192].map((t) => lab("NODE_LABEL_TRANSPARENCY", t)),
        ...[30, 90, -45, 180].map((r) => lab("NODE_LABEL_ROTATION", r)),
        ...[30, 80].map((w) => lab("NODE_LABEL_WIDTH", w, { label: "Wrap this label" })),
        ...["RECTANGLE", "ROUND_RECTANGLE"].map((s) => lab("NODE_LABEL_BACKGROUND_SHAPE", s)),
        lab("NODE_LABEL_BACKGROUND_COLOR", "#FFFF66", { base: { NODE_LABEL_BACKGROUND_SHAPE: "RECTANGLE" } }),
        lab("NODE_LABEL_BACKGROUND_TRANSPARENCY", 100, {
            base: { NODE_LABEL_BACKGROUND_SHAPE: "RECTANGLE", NODE_LABEL_BACKGROUND_COLOR: "#FFFF66" },
        }),
    ]);
    // every node anchor against every label anchor (9 x 9), then justification and offsets
    const pos = (n, l, j = "c", dx = 0, dy = 0) => `${n},${l},${j},${dx.toFixed(2)},${dy.toFixed(2)}`;
    const positions = ANCHOR_POINTS.flatMap((n) => ANCHOR_POINTS.map((l) => pos(n, l)));
    const posSp = (p, label = "Label") =>
        lab("NODE_LABEL_POSITION", p, {
            id: `label-position-${slug(p.replace(/\.00/g, ""))}`,
            label,
            base: { NODE_WIDTH: 30, NODE_HEIGHT: 30 },
        });
    add("specimen-labels-p2", [{ ...dflt("node"), ...L }, ...positions.slice(0, 41).map((p) => posSp(p))]);
    add("specimen-labels-p3", [{ ...dflt("node"), ...L }, ...positions.slice(41).map((p) => posSp(p))]);
    add(
        "specimen-labels-p4",
        [
            { ...dflt("node"), ...L },
            ...["c", "l", "r"].flatMap((j) =>
                [
                    ["C", "C"],
                    ["E", "W"],
                    ["W", "E"],
                ].map(([n, l]) => posSp(pos(n, l, j), "Two\nlonger lines")),
            ),
            ...[
                [10, 0],
                [0, 10],
                [-10, -10],
                [20, 20],
                [-20, 0],
                [0, -25],
            ].map(([dx, dy]) => posSp(pos("C", "C", "c", dx, dy))),
        ],
        { columns: 5 },
    );

    // edges and lines
    const E = (vp, value, extra) => edgeSp(vp, value, extra);
    add(
        "specimen-edges-lines",
        [
            dflt("edge"),
            ...values("EDGE_LINE_TYPE").map((t) => E("EDGE_LINE_TYPE", t, { base: { EDGE_WIDTH: 3 } })),
            ...[0.5, 1, 3, 6, 10].map((w) => E("EDGE_WIDTH", w)),
            ...["#D62728", "#2CA02C", "#1F77B4", "#000000"].map((c) => E("EDGE_STROKE_UNSELECTED_PAINT", c)),
            E("EDGE_UNSELECTED_PAINT", "#D62728"),
            E("EDGE_PAINT", "#D62728"),
            ...[0, 64, 128, 192].map((t) => E("EDGE_TRANSPARENCY", t, { base: { EDGE_WIDTH: 3 } })),
            E("EDGE_VISIBLE", false),
            E("EDGE_BEND", "0.0,1.0,0.5", { id: "bend-one-handle" }),
            E("EDGE_BEND", "0.7071,-0.7071,0.3|0.7071,0.7071,0.7", { id: "bend-two-handles" }),
            E("EDGE_CURVED", false, { id: "curved-false-bend", base: { EDGE_BEND: "0.0,1.0,0.5" } }),
            { id: "loop", kind: "loop", vp: null, value: null, set: {}, caption: "self-loop" },
            { id: "loop-two", kind: "loop", count: 2, vp: null, value: null, set: {}, caption: "two self-loops" },
            {
                id: "parallel-2",
                kind: "parallel",
                count: 2,
                vp: null,
                value: null,
                set: {},
                caption: "2 parallel edges",
            },
            {
                id: "parallel-3",
                kind: "parallel",
                count: 3,
                vp: null,
                value: null,
                set: {},
                caption: "3 parallel edges",
            },
            ...values("EDGE_STACKING")
                .filter((s) => s !== "AUTO_BEND")
                .map((s) => ({ ...E("EDGE_STACKING", s), kind: "parallel", count: 3 })),
            ...[0.1, 0.9].map((d) => ({ ...E("EDGE_STACKING_DENSITY", d), kind: "parallel", count: 3 })),
            { ...E("EDGE_CURVED", false, { id: "curved-false-parallel" }), kind: "parallel", count: 3 },
            { ...E("EDGE_Z_ORDER", 10), kind: "zpair" },
        ],
        { edgeSheet: true },
    );

    // arrows: every shape at each end, then size and color
    const arrows = values("EDGE_TARGET_ARROW_SHAPE");
    const A = { EDGE_TARGET_ARROW_SIZE: 10, EDGE_SOURCE_ARROW_SIZE: 10 };
    add(
        "specimen-arrows",
        [
            dflt("edge"),
            ...arrows.filter((a) => a !== "NONE").map((a) => E("EDGE_TARGET_ARROW_SHAPE", a, { base: A })),
            ...values("EDGE_SOURCE_ARROW_SHAPE")
                .filter((a) => a !== "NONE")
                .map((a) => E("EDGE_SOURCE_ARROW_SHAPE", a, { base: A })),
        ],
        { edgeSheet: true },
    );
    add(
        "specimen-arrows-p2",
        [
            dflt("edge"),
            E("EDGE_TARGET_ARROW_SHAPE", "NONE", { id: "target-arrow-shape-none" }),
            ...[3, 6, 10, 16, 24].map((s) =>
                E("EDGE_TARGET_ARROW_SIZE", s, { base: { EDGE_TARGET_ARROW_SHAPE: "DELTA" } }),
            ),
            ...[6, 16].map((s) => E("EDGE_SOURCE_ARROW_SIZE", s, { base: { EDGE_SOURCE_ARROW_SHAPE: "DELTA" } })),
            ...["#D62728", "#1F77B4"].map((c) =>
                E("EDGE_TARGET_ARROW_UNSELECTED_PAINT", c, {
                    base: { EDGE_TARGET_ARROW_SHAPE: "DELTA", EDGE_TARGET_ARROW_SIZE: 10 },
                }),
            ),
            ...["#D62728", "#1F77B4"].map((c) =>
                E("EDGE_SOURCE_ARROW_UNSELECTED_PAINT", c, {
                    base: { EDGE_SOURCE_ARROW_SHAPE: "DELTA", EDGE_SOURCE_ARROW_SIZE: 10 },
                }),
            ),
            E("EDGE_STROKE_UNSELECTED_PAINT", "#D62728", {
                id: "arrow-paint-separate-from-edge",
                base: { EDGE_TARGET_ARROW_SHAPE: "DELTA", EDGE_TARGET_ARROW_SIZE: 10 },
            }),
            E("EDGE_WIDTH", 6, {
                id: "arrow-on-wide-edge",
                base: { EDGE_TARGET_ARROW_SHAPE: "DELTA", EDGE_TARGET_ARROW_SIZE: 10 },
            }),
        ],
        { edgeSheet: true },
    );

    // edge labels
    const EL = { label: "edge label" };
    const el = (vp, value, extra = {}) => E(vp, value, { ...EL, ...extra });
    add(
        "specimen-edge-labels",
        [
            { ...dflt("edge"), ...EL },
            el("EDGE_LABEL", "Text", { id: "label-text" }),
            el("EDGE_LABEL", "Two\nlines", { id: "label-two-lines" }),
            ...["#D62728", "#1F77B4"].map((c) => el("EDGE_LABEL_COLOR", c)),
            ...[6, 14, 20].map((s) => el("EDGE_LABEL_FONT_SIZE", s)),
            ...["Serif", "Monospaced", "DejaVu Serif"].map((f) =>
                el("EDGE_LABEL_FONT_FACE", font(N.fontSize, f), { id: `font-face-${slug(f)}` }),
            ),
            el("EDGE_LABEL_FONT_FACE", font(N.fontSize, N.fontFamily, "bold"), { id: "font-face-dejavu-sans-bold" }),
            ...[64, 160].map((t) => el("EDGE_LABEL_TRANSPARENCY", t)),
            ...[45, 90].map((r) => el("EDGE_LABEL_ROTATION", r)),
            { ...el("EDGE_LABEL_ROTATION", 45, { id: "label-rotation-45-diagonal" }), kind: "diag" },
            { ...el("EDGE_LABEL_AUTOROTATE", true), kind: "diag" },
            { ...el("EDGE_LABEL_AUTOROTATE", false), kind: "diag" },
            el("EDGE_LABEL_WIDTH", 30, { label: "edge label that wraps" }),
            ...["RECTANGLE", "ROUND_RECTANGLE"].map((s) => el("EDGE_LABEL_BACKGROUND_SHAPE", s)),
            el("EDGE_LABEL_BACKGROUND_COLOR", "#FFFF66", { base: { EDGE_LABEL_BACKGROUND_SHAPE: "RECTANGLE" } }),
            el("EDGE_LABEL_BACKGROUND_TRANSPARENCY", 100, {
                base: { EDGE_LABEL_BACKGROUND_SHAPE: "RECTANGLE", EDGE_LABEL_BACKGROUND_COLOR: "#FFFF66" },
            }),
            ...["N,S,c,0.00,0.00", "S,N,c,0.00,0.00", "C,C,c,0.00,-15.00", "W,E,r,0.00,0.00", "E,W,l,0.00,0.00"].map(
                (p) => el("EDGE_LABEL_POSITION", p, { id: `label-position-${slug(p.replace(/\.00/g, ""))}` }),
            ),
        ],
        { edgeSheet: true, columns: 6 },
    );

    // groups. How Cytoscape draws a group is the group's view type (CyGroupSettingsManager.GroupViewType): "None",
    // "Compound Node", "Show Group Node" or "Single Node". Cytoscape keeps a group's own view type in the group node's
    // __ViewSettings column, which every file it writes carries, so the group-view-type specimens set it there. But
    // 3.10.5 applies it when the network is added, before its view exists, so a loaded file's groups are drawn with
    // the reader's preference: an expanded group is its members only, with no group node, whatever the column says
    // (checked for XGMML, CX, CX2 and sessions). So the compound properties are set (through the style, on the
    // group's name) but never drawn, and the group node's own look is set on collapsed groups.
    const COMPOUND = "Compound Node";
    const G = (vp, value, extra = {}) => ({ ...nodeSp(vp, value, extra), kind: "group" });
    const C = (vp, value, extra = {}) => G(vp, value, { collapse: true, ...extra });
    const viewType = (t) => ({
        id: `group-view-type-${slug(t)}`,
        kind: "group",
        viewType: t,
        vp: null,
        value: null,
        set: {},
        caption: `groupViewType=\n${t}`,
    });
    add("specimen-groups", [
        { ...dflt("group"), kind: "group", caption: "expanded group" },
        ...["None", COMPOUND, "Show Group Node", "Single Node"].map(viewType),
        ...values("COMPOUND_NODE_SHAPE").map((s) => G("COMPOUND_NODE_SHAPE", s)),
        ...[0, 25].map((p) => G("COMPOUND_NODE_PADDING", p)),
        {
            id: "group-nested",
            kind: "group",
            nested: true,
            vp: null,
            value: null,
            set: {},
            caption: "nested group",
        },
        {
            id: "group-collapsed",
            kind: "group",
            collapse: true,
            vp: null,
            value: null,
            set: {},
            caption: "collapsed group",
        },
        C("NODE_FILL_COLOR", "#AEC7E8", { id: "collapsed-fill-color" }),
        C("NODE_BORDER_PAINT", "#D62728", { id: "collapsed-border-paint", base: { NODE_BORDER_WIDTH: 3 } }),
        C("NODE_LABEL", "Group", { id: "collapsed-label" }),
        C("NODE_SHAPE", "DIAMOND", { id: "collapsed-shape-diamond" }),
        C("NODE_WIDTH", 60, { id: "collapsed-width-60" }),
        C("NODE_TRANSPARENCY", 80, { id: "collapsed-transparency-80" }),
    ]);

    // images and charts: slot 1, then slots 2..9, then sizes and positions with nodeCustomGraphicsSizeSync off
    const CG = { base: { NODE_WIDTH: 60, NODE_HEIGHT: 60 } };
    const chartSp = ([id, v]) => nodeSp("NODE_CUSTOMGRAPHICS_1", v, { id, caption: `customgraphics_1=\n${id}`, ...CG });
    add("specimen-images-charts", [
        dflt("node"),
        ...Object.entries(CHARTS)
            .filter(([id]) => !CHARTS_P5.has(id))
            .map(chartSp),
    ]);
    const slots = [2, 3, 4, 5, 6, 7, 8, 9];
    add("specimen-images-charts-p2", [
        dflt("node"),
        ...slots.map((n, i) =>
            nodeSp(`NODE_CUSTOMGRAPHICS_${n}`, CHARTS[SLOT_GRAPHICS[i]], {
                id: `customgraphics-${n}-${SLOT_GRAPHICS[i]}`,
                caption: `customgraphics_${n}=\n${SLOT_GRAPHICS[i]}`,
                ...CG,
            }),
        ),
        nodeSp("NODE_CUSTOMGRAPHICS_2", CHARTS.pie, {
            id: "customgraphics-1-and-2-stacked",
            caption: "customgraphics_1+2=\ngradient+pie",
            base: { ...CG.base, NODE_CUSTOMGRAPHICS_1: CHARTS["linear-gradient"] },
        }),
        nodeSp("NODE_CUSTOMGRAPHICS_1", CHARTS.pie, {
            id: "pie-on-rectangle",
            caption: "customgraphics_1=pie\non RECTANGLE",
            base: { ...CG.base, NODE_SHAPE: "RECTANGLE" },
        }),
        nodeSp("NODE_CUSTOMGRAPHICS_1", CHARTS["linear-gradient"], {
            id: "gradient-on-diamond",
            caption: "customgraphics_1=\ngradient on DIAMOND",
            base: { ...CG.base, NODE_SHAPE: "DIAMOND" },
        }),
    ]);
    add(
        "specimen-images-charts-p3",
        [
            dflt("node"),
            ...[1, ...slots].map((n) =>
                nodeSp(`NODE_CUSTOMGRAPHICS_SIZE_${n}`, 30, {
                    id: `customgraphics-size-${n}-30`,
                    base: { ...CG.base, [`NODE_CUSTOMGRAPHICS_${n}`]: CHARTS.pie },
                }),
            ),
            ...[1, ...slots].map((n, i) => {
                const p = ["NW,NW", "N,N", "NE,NE", "W,W", "E,E", "SW,SW", "S,S", "SE,SE", "C,NW"][i];
                return nodeSp(`NODE_CUSTOMGRAPHICS_POSITION_${n}`, `${p},c,0.00,0.00`, {
                    id: `customgraphics-position-${n}-${slug(p)}`,
                    base: {
                        ...CG.base,
                        [`NODE_CUSTOMGRAPHICS_${n}`]: CHARTS.pie,
                        [`NODE_CUSTOMGRAPHICS_SIZE_${n}`]: 24,
                    },
                });
            }),
        ],
        { dependencies: { nodeCustomGraphicsSizeSync: false } },
    );

    // annotations: the network's own drawings (text, bounded text, shapes, images), placed in the cells
    const ann = (type, args, id, cap) => ({
        id,
        kind: "annotation",
        type,
        args,
        vp: null,
        value: null,
        set: {},
        caption: cap,
    });
    // ShapeAnnotation.ShapeType (Cytoscape's API): the command takes each shape's display name
    const SHAPES_ANN = [
        "Rectangle",
        "Rounded Rectangle",
        "Ellipse",
        "Triangle",
        "Pentagon",
        "5-Pointed Star",
        "Hexagon",
        "6-Pointed Star",
        "Octagon",
        "Parallelogram",
        "Diamond",
    ];
    add("specimen-images-charts-p4", [
        dflt("node"),
        ann("text", { text: "Text", fontSize: "12" }, "annotation-text", "text"),
        ann("text", { text: "Big", fontSize: "20" }, "annotation-text-font-size-20", "text fontSize=20"),
        ann("text", { text: "Red", fontSize: "12", color: "#D62728" }, "annotation-text-color", "text color"),
        ann("text", { text: "Bold", fontSize: "12", fontStyle: "bold" }, "annotation-text-bold", "text bold"),
        ann("text", { text: "Serif", fontSize: "12", fontFamily: "Serif" }, "annotation-text-serif", "text Serif"),
        ann("text", { text: "Turned", fontSize: "12", angle: "45" }, "annotation-text-angle-45", "text angle=45"),
        ...SHAPES_ANN.map((t) =>
            ann(
                "shape",
                {
                    type: t,
                    width: "50",
                    height: "40",
                    fillColor: "#AEC7E8",
                    borderColor: "#505050",
                    borderThickness: "1",
                },
                `annotation-shape-${slug(t)}`,
                `shape=${t}`,
            ),
        ),
        ann(
            "shape",
            { type: "RECTANGLE", width: "50", height: "40", fillColor: "#D62728", opacity: "40" },
            "annotation-shape-opacity-40",
            "shape opacity=40",
        ),
        ann(
            "shape",
            { type: "RECTANGLE", width: "50", height: "40", borderColor: "#1F77B4", borderThickness: "4" },
            "annotation-shape-border",
            "shape border=4",
        ),
        ann(
            "shape",
            { type: "RECTANGLE", width: "50", height: "40", fillColor: "#AEC7E8", canvas: "background" },
            "annotation-shape-background",
            "shape background",
        ),
        ann(
            "bounded text",
            {
                text: "Bounded",
                type: "ROUNDEDRECTANGLE",
                width: "70",
                height: "34",
                fillColor: "#FFFF99",
                borderColor: "#505050",
                borderThickness: "1",
                fontSize: "11",
            },
            "annotation-bounded-text",
            "bounded text",
        ),
        ann(
            "bounded text",
            {
                text: "Ellipse",
                type: "ELLIPSE",
                width: "70",
                height: "34",
                fillColor: "#FFFFFF",
                borderColor: "#D62728",
                borderThickness: "2",
                fontSize: "11",
            },
            "annotation-bounded-text-ellipse",
            "bounded text ellipse",
        ),
        ann("image", { url: IMG, width: "70", height: "40" }, "annotation-image", "image"),
        ann(
            "image",
            { url: IMG, width: "70", height: "40", opacity: "40" },
            "annotation-image-opacity-40",
            "image opacity=40",
        ),
        ann(
            "image",
            { url: IMG, width: "70", height: "40", borderColor: "#D62728", borderThickness: "3" },
            "annotation-image-border",
            "image border",
        ),
    ]);

    // later additions, on pages of their own so the sheets above keep their layout: more edge label positions, and
    // the chart properties of Cytoscape's chart source (custom-graphics-internal .../charts) the first page leaves out
    add(
        "specimen-edge-labels-p2",
        [
            { ...dflt("edge"), ...EL },
            ...[
                "NW,SE,c,0.00,0.00",
                "SE,NW,c,0.00,0.00",
                "NE,SW,c,0.00,0.00",
                "SW,NE,c,0.00,0.00",
                "C,C,c,15.00,0.00",
                "C,C,c,0.00,0.00",
            ].map((p) => el("EDGE_LABEL_POSITION", p, { id: `label-position-${slug(p.replace(/\.00/g, ""))}` })),
        ],
        { edgeSheet: true },
    );
    add("specimen-images-charts-p5", [
        dflt("node"),
        ...Object.entries(CHARTS)
            .filter(([id]) => CHARTS_P5.has(id))
            .map(chartSp),
    ]);

    // more annotations: the arrow annotation (every head at each end, its colors, width and size, and what it points
    // at) and the annotation arguments the first annotation page leaves out (rotation, border opacity, italic text,
    // bounded text color and style, image brightness and contrast). Each arrow leaves a small neutral shape.
    const arrowSp = (id, fields, cap, target = "point") => ({
        id,
        kind: "arrow",
        target,
        fields,
        vp: null,
        value: null,
        set: {},
        caption: cap,
    });
    const BOX = { width: "50", height: "40", fillColor: "#AEC7E8", borderColor: "#505050", borderThickness: "1" };
    add("specimen-images-charts-p6", [
        dflt("node"),
        arrowSp("arrow-default", {}, "arrow\n(Closed Arrow)"),
        ...ARROW_TYPES.map((t, i) =>
            arrowSp(`arrow-target-type-${slug(t)}`, { targetType: i }, `arrow targetType=\n${t}`),
        ).filter((sp) => sp.fields.targetType !== ARROW_NEUTRAL.targetType),
        ...ARROW_TYPES.map((t, i) =>
            arrowSp(`arrow-source-type-${slug(t)}`, { sourceType: i }, `arrow sourceType=\n${t}`),
        ).filter((sp) => sp.fields.sourceType !== ARROW_NEUTRAL.sourceType),
        arrowSp("arrow-line-color", { lineColor: javaColor("#D62728") }, "arrow lineColor"),
        arrowSp("arrow-line-color-alpha-40", { lineColor: javaColor("#D62728", 0x66) }, "arrow lineColor\nalpha=40%"),
        arrowSp("arrow-line-thickness-4", { lineThickness: "4.0" }, "arrow\nlineThickness=4"),
        arrowSp("arrow-target-size-2", { targetSize: "2.0" }, "arrow targetSize=2\n(Closed Arrow)"),
        arrowSp("arrow-source-size-2", { sourceType: 1, sourceSize: "2.0" }, "arrow sourceSize=2\n(Closed Arrow)"),
        arrowSp("arrow-target-color", { targetColor: javaColor("#1F77B4") }, "arrow targetColor\n(Closed Arrow)"),
        arrowSp(
            "arrow-source-color",
            { sourceType: 1, sourceColor: javaColor("#1F77B4") },
            "arrow sourceColor\n(Closed Arrow)",
        ),
        arrowSp("arrow-to-node", {}, "arrow to a node", "node"),
        arrowSp("arrow-to-annotation", {}, "arrow to an\nannotation", "annotation"),
        arrowSp("arrow-anchor-center", { anchorType: "CENTER" }, "arrow\nanchorType=CENTER", "annotation"),
        arrowSp("arrow-background", { canvas: "background" }, "arrow background"),
        ann("shape", { type: "V", ...BOX }, "annotation-shape-v", "shape=V"),
        ann("shape", { type: "RECTANGLE", ...BOX, angle: "30" }, "annotation-shape-angle-30", "shape angle=30"),
        ann(
            "shape",
            { type: "RECTANGLE", ...BOX, borderColor: "#1F77B4", borderThickness: "4", borderOpacity: "40" },
            "annotation-shape-border-opacity-40",
            "shape border\nopacity=40",
        ),
        ann("text", { text: "Italic", fontSize: "12", fontStyle: "italic" }, "annotation-text-italic", "text italic"),
        ann(
            "text",
            { text: "BoldItalic", fontSize: "12", fontStyle: "bolditalic" },
            "annotation-text-bold-italic",
            "text bolditalic",
        ),
        ...[
            ["color", { color: "#D62728" }, "bounded text\ncolor"],
            ["bold", { fontStyle: "bold" }, "bounded text\nbold"],
            ["angle-30", { angle: "30" }, "bounded text\nangle=30"],
        ].map(([s, extra, cap]) =>
            ann(
                "bounded text",
                {
                    text: "Bounded",
                    type: "RECTANGLE",
                    width: "70",
                    height: "34",
                    fillColor: "#FFFF99",
                    borderColor: "#505050",
                    borderThickness: "1",
                    fontSize: "11",
                    ...extra,
                },
                `annotation-bounded-text-${s}`,
                cap,
            ),
        ),
        ...[
            ["brightness-50", { brightness: "50" }, "image\nbrightness=50"],
            ["contrast-50", { contrast: "50" }, "image\ncontrast=50"],
            ["angle-30", { angle: "30" }, "image angle=30"],
        ].map(([s, extra, cap]) =>
            ann("image", { url: IMG, width: "70", height: "40", ...extra }, `annotation-image-${s}`, cap),
        ),
        // a chart placed beside its node and moved by an offset (the position page uses only matching anchors)
        ...["E,W,c,0.00,0.00", "C,C,c,12.00,-8.00"].map((p) =>
            nodeSp("NODE_CUSTOMGRAPHICS_POSITION_1", p, {
                id: `customgraphics-position-1-${slug(p.replace(/\.00/g, ""))}`,
                base: { ...CG.base, NODE_CUSTOMGRAPHICS_1: CHARTS.pie },
            }),
        ),
        // the chart color schemes the chart pages leave out: MODULATED, and two of the named gradients
        // (custom-graphics-internal's ColorGradient: BLUE_RED, YL_OR_RD, ...) cy_colorScheme also takes
        ...["MODULATED", "BLUE_RED", "YL_OR_RD"].map((scheme) =>
            chartSp([
                `bar-color-scheme-${slug(scheme)}`,
                cg("BarChart", {
                    cy_dataColumns: CHART_DATA.cy_dataColumns,
                    cy_range: [0, 10],
                    cy_type: "GROUPED",
                    cy_colorScheme: scheme,
                }),
            ]),
        ),
    ]);

    add("specimen-images-charts-p7", [dflt("node"), ...Object.entries(CHARTS_P7).map(chartSp)]);

    // mappings: the same kinds of value reached through the style (defaults, discrete, continuous, passthrough),
    // and per-element bypasses over a mapping
    add("specimen-mappings-bypass", MAPPED_SPECIMENS, {
        style: MAPPED_STYLE,
        dependencies: { arrowColorMatchesEdge: true },
    });

    // the bypass sheets replayed through discrete mappings on the name column
    const replayed = out.filter((s) => !/groups|images-charts-p[467]|mappings/.test(s.id));
    replayed.forEach(({ id, specimens, ...rest }, i) =>
        add(`specimen-mappings-bypass-p${i + 2}`, specimens, { ...rest, replayOf: id, mapped: true }),
    );
    // the mapping kinds the first mappings page leaves out: a continuous mapping with a step (different lesser,
    // equal and greater at a point) and, on the next page, one onto a discrete property, discrete mappings on Boolean and Double keys,
    // and passthrough mappings onto a number, a line type, a font and a label color
    add(`specimen-mappings-bypass-p${replayed.length + 2}`, MAPPED_SPECIMENS_2, { style: MAPPED_STYLE_2 });
    add(`specimen-mappings-bypass-p${replayed.length + 3}`, MAPPED_SPECIMENS_3, {
        style: { mappings: [CONTINUOUS_SHAPE, ...MAPPED_STYLE_2.mappings] },
        formats: ["cys", "xgmml", "cx"],
    });
    return out;
}

// The specimen-mappings-bypass page 1: columns on each element, the style maps them.
const MAPPED_STYLE = {
    defaults: { NETWORK_BACKGROUND_PAINT: "#F4F1E8", NODE_FILL_COLOR: "#9EDAE5" },
    mappings: [
        {
            mappingType: "discrete",
            mappingColumn: "kind",
            mappingColumnType: "String",
            visualProperty: "NODE_SHAPE",
            map: [
                ["box", "RECTANGLE"],
                ["gem", "DIAMOND"],
                ["hex", "HEXAGON"],
            ],
        },
        {
            mappingType: "continuous",
            mappingColumn: "score",
            mappingColumnType: "Double",
            visualProperty: "NODE_FILL_COLOR",
            points: [
                [0, "#2166AC", "#2166AC", "#2166AC"],
                [0.5, "#F7F7F7"],
                [1, "#B2182B", "#B2182B", "#B2182B"],
            ],
        },
        {
            mappingType: "continuous",
            mappingColumn: "rank",
            mappingColumnType: "Double",
            visualProperty: "NODE_WIDTH",
            points: [
                [0, 20],
                [10, 70],
            ],
        },
        {
            mappingType: "discrete",
            mappingColumn: "grp",
            mappingColumnType: "String",
            visualProperty: "NODE_BORDER_PAINT",
            map: [
                ["alpha", "#D62728"],
                ["beta", "#1F77B4"],
            ],
        },
        {
            mappingType: "discrete",
            mappingColumn: "tier",
            mappingColumnType: "Integer",
            visualProperty: "NODE_BORDER_STROKE",
            map: [
                [1, "EQUAL_DASH"],
                [2, "DOT"],
            ],
        },
        {
            mappingType: "passthrough",
            mappingColumn: "label",
            mappingColumnType: "String",
            visualProperty: "NODE_LABEL",
        },
        {
            mappingType: "passthrough",
            mappingColumn: "labelColor",
            mappingColumnType: "String",
            visualProperty: "NODE_LABEL_COLOR",
        },
        {
            mappingType: "continuous",
            mappingColumn: "alpha",
            mappingColumnType: "Double",
            visualProperty: "NODE_TRANSPARENCY",
            points: [
                [0, 40],
                [1, 255],
            ],
        },
        {
            mappingType: "passthrough",
            mappingColumn: "edgeColor",
            mappingColumnType: "String",
            visualProperty: "EDGE_STROKE_UNSELECTED_PAINT",
        },
        {
            mappingType: "continuous",
            mappingColumn: "weight",
            mappingColumnType: "Double",
            visualProperty: "EDGE_WIDTH",
            points: [
                [0, 1],
                [1, 8],
            ],
        },
        {
            mappingType: "discrete",
            mappingColumn: "interaction",
            mappingColumnType: "String",
            visualProperty: "EDGE_LINE_TYPE",
            map: [
                ["dashed", "EQUAL_DASH"],
                ["dotted", "DOT"],
            ],
        },
        {
            mappingType: "discrete",
            mappingColumn: "interaction",
            mappingColumnType: "String",
            visualProperty: "EDGE_TARGET_ARROW_SHAPE",
            map: [
                ["dashed", "DELTA"],
                ["dotted", "CIRCLE"],
                ["arrow", "DELTA"],
            ],
        },
        {
            mappingType: "passthrough",
            mappingColumn: "elabel",
            mappingColumnType: "String",
            visualProperty: "EDGE_LABEL",
        },
        {
            mappingType: "passthrough",
            mappingColumn: "chart",
            mappingColumnType: "String",
            visualProperty: "NODE_CUSTOMGRAPHICS_1",
        },
    ],
};
const mapped = (id, cols, cap, extra = {}) => ({
    id,
    kind: "node",
    vp: null,
    value: null,
    set: {},
    cols,
    caption: cap,
    ...extra,
});
const mappedEdge = (id, cols, cap, extra = {}) => ({ ...mapped(id, cols, cap, extra), kind: "edge" });
const MAPPED_SPECIMENS = [
    mapped("default", {}, "default"),
    mapped("default-fill-color", { score: null }, "fill_color default\n(no score)"),
    ...[
        ["box", "RECTANGLE"],
        ["gem", "DIAMOND"],
        ["hex", "HEXAGON"],
    ].map(([k]) => mapped(`discrete-shape-${k}`, { kind: k }, `shape discrete\nkind=${k}`)),
    mapped("discrete-shape-unmapped", { kind: "other" }, "shape discrete\nkind=other"),
    ...[-0.5, 0, 0.25, 0.5, 0.75, 1, 1.5].map((s) =>
        mapped(`continuous-fill-${slug(s)}`, { score: s }, `fill continuous\nscore=${s}`),
    ),
    ...[0, 5, 10, 20].map((r) => mapped(`continuous-width-${r}`, { rank: r }, `width continuous\nrank=${r}`)),
    ...["alpha", "beta"].map((g) =>
        mapped(`discrete-border-${g}`, { grp: g }, `border_paint discrete\ngrp=${g}`, {
            base: { NODE_BORDER_WIDTH: 4 },
        }),
    ),
    ...[1, 2].map((t) =>
        mapped(`discrete-border-stroke-${t}`, { tier: t }, `border_stroke discrete\ntier=${t}`, {
            base: { NODE_BORDER_WIDTH: 4 },
        }),
    ),
    mapped("passthrough-label", { label: "Mapped" }, "label passthrough"),
    mapped("passthrough-label-color", { label: "Red", labelColor: "#D62728" }, "label_color\npassthrough"),
    ...[0, 0.5].map((a) =>
        mapped(`continuous-transparency-${slug(a)}`, { alpha: a }, `transparency\ncontinuous alpha=${a}`),
    ),
    mapped("passthrough-image-url", { chart: IMG }, "customgraphics_1\npassthrough URL"),
    mapped(
        "passthrough-chart",
        { a: 3, b: 5, c: 2, chart: cg("PieChart", { ...CHART_DATA, cy_startAngle: 0 }) },
        "customgraphics_1\npassthrough",
    ),
    mapped("bypass-over-discrete", { kind: "gem" }, "shape bypass\nover discrete", {
        set: { NODE_SHAPE: "TRIANGLE" },
        vp: "NODE_SHAPE",
        value: "TRIANGLE",
    }),
    mapped("bypass-over-continuous", { score: 0 }, "fill bypass\nover continuous", {
        set: { NODE_FILL_COLOR: "#2CA02C" },
        vp: "NODE_FILL_COLOR",
        value: "#2CA02C",
    }),
    mapped("bypass-over-passthrough", { label: "Mapped" }, "label bypass\nover passthrough", {
        set: { NODE_LABEL: "Bypass" },
        vp: "NODE_LABEL",
        value: "Bypass",
    }),
    mapped("bypass-over-default", {}, "fill bypass\nover default", {
        set: { NODE_FILL_COLOR: "#FF7F0E" },
        vp: "NODE_FILL_COLOR",
        value: "#FF7F0E",
    }),
    mappedEdge("edge-default", {}, "edge default"),
    ...["#D62728", "#1F77B4"].map((c) =>
        mappedEdge(
            `passthrough-edge-color-${slug(c)}`,
            { edgeColor: c, interaction: "arrow" },
            `edge color\npassthrough ${c}`,
        ),
    ),
    ...[0, 0.5, 1].map((w) =>
        mappedEdge(`continuous-edge-width-${slug(w)}`, { weight: w }, `edge width\ncontinuous ${w}`),
    ),
    ...["dashed", "dotted"].map((i) =>
        mappedEdge(`discrete-line-type-${i}`, { interaction: i }, `line_type discrete\n${i}`),
    ),
    mappedEdge("passthrough-edge-label", { elabel: "mapped" }, "edge label\npassthrough"),
    mappedEdge("arrow-color-matches-edge", { interaction: "arrow", edgeColor: "#2CA02C" }, "arrowColorMatchesEdge\non"),
    mappedEdge(
        "bypass-over-edge-passthrough",
        { edgeColor: "#D62728", interaction: "arrow" },
        "edge color bypass\nover passthrough",
        {
            set: { EDGE_STROKE_UNSELECTED_PAINT: "#9467BD" },
            vp: "EDGE_STROKE_UNSELECTED_PAINT",
            value: "#9467BD",
        },
    ),
];

// ------------------------------------------------------------------------------------------------ building

const END = { NODE_WIDTH: 12, NODE_HEIGHT: 12, NODE_SIZE: 12 };
const CHILD = { NODE_WIDTH: 16, NODE_HEIGHT: 16, NODE_SIZE: 16 };
/** Column types: Cytoscape would guess a JSON number's type from its first value, so every column is declared. */
const MAPPED_SPECIMENS_2 = [
    mapped("default", {}, "default"),
    ...[2.5, 7.5].map((v) =>
        mapped(`continuous-step-fill-${slug(v)}`, { step: v }, `fill continuous\nstep at 5, step=${v}`),
    ),
    ...[true, false].map((v) =>
        mapped(`discrete-boolean-border-${v}`, { flag: v }, `border_paint\ndiscrete flag=${v}`),
    ),
    mapped("discrete-boolean-border-unset", {}, "border_paint\ndiscrete flag unset"),
    ...[1.5, 2, 3].map((v) => mapped(`discrete-double-height-${slug(v)}`, { dkey: v }, `height discrete\ndkey=${v}`)),
    ...[20, 60].map((v) => mapped(`passthrough-width-${v}`, { size: v }, `width passthrough\nsize=${v}`)),
    ...["DOT", "LONG_DASH", "bogus"].map((v) =>
        mapped(`passthrough-border-stroke-${slug(v)}`, { shp: v }, `border_stroke\npassthrough ${v}`),
    ),
    mapped("passthrough-font-face", { font: "Serif,bold,12", label: "Font" }, "font_face passthrough\nSerif,bold,12"),
    ...["#D62728", "not-a-color"].map((v) =>
        mapped(`passthrough-label-color-${slug(v)}`, { fillHex: v, label: "Color" }, `label_color\npassthrough ${v}`),
    ),
];
/**
 * A continuous mapping onto a shape (a discrete property), on both sides of its point and exactly at it, and the
 * value exactly at the fill mapping's step. Cytoscape 3.10.5's CX2 writer drops a point's `equal` value (each range
 * excludes the point), and loading that CX2 file fails on the null shape, so this page is saved as XGMML, CX and a
 * session only.
 */
const MAPPED_SPECIMENS_3 = [
    mapped("default", {}, "default"),
    ...[0, 5, 10].map((v) => mapped(`continuous-shape-${v}`, { sc2: v }, `shape continuous\nsc2=${v}`)),
    mapped("continuous-step-fill-5", { step: 5 }, "fill continuous\nstep at 5, step=5"),
];
/** A continuous mapping onto a shape, with a different shape below, at and above its one point. */
const CONTINUOUS_SHAPE = {
    mappingType: "continuous",
    mappingColumn: "sc2",
    visualProperty: "NODE_SHAPE",
    points: [[5, "ELLIPSE", "DIAMOND", "RECTANGLE"]],
};
const MAPPED_STYLE_2 = {
    mappings: [
        {
            mappingType: "continuous",
            mappingColumn: "step",
            visualProperty: "NODE_FILL_COLOR",
            points: [
                [0, "#1F77B4"],
                [5, "#D62728", "#FFFFFF", "#2CA02C"],
                [10, "#FFFF00"],
            ],
        },
        {
            mappingType: "discrete",
            mappingColumn: "flag",
            mappingColumnType: "Boolean",
            visualProperty: "NODE_BORDER_PAINT",
            map: [
                [true, "#D62728"],
                [false, "#1F77B4"],
            ],
        },
        {
            mappingType: "discrete",
            mappingColumn: "dkey",
            mappingColumnType: "Double",
            visualProperty: "NODE_HEIGHT",
            map: [
                [1.5, 60],
                [2, 18],
            ],
        },
        {
            mappingType: "passthrough",
            mappingColumn: "size",
            mappingColumnType: "Double",
            visualProperty: "NODE_WIDTH",
        },
        {
            mappingType: "passthrough",
            mappingColumn: "shp",
            mappingColumnType: "String",
            visualProperty: "NODE_BORDER_STROKE",
        },
        {
            mappingType: "passthrough",
            mappingColumn: "font",
            mappingColumnType: "String",
            visualProperty: "NODE_LABEL_FONT_FACE",
        },
        {
            mappingType: "passthrough",
            mappingColumn: "fillHex",
            mappingColumnType: "String",
            visualProperty: "NODE_LABEL_COLOR",
        },
    ],
};
const NODE_COLUMNS = {
    label: "String",
    labelColor: "String",
    kind: "String",
    grp: "String",
    tier: "Integer",
    score: "Double",
    rank: "Double",
    alpha: "Double",
    chart: "String",
    sc2: "Double",
    step: "Double",
    flag: "Boolean",
    dkey: "Double",
    size: "Double",
    shp: "String",
    font: "String",
    fillHex: "String",
    a: "Double",
    b: "Double",
    c: "Double",
};
const EDGE_COLUMNS = { label: "String", edgeColor: "String", weight: "Double", elabel: "String" };
/** Every node of a chart sheet carries the chart data, so a chart specimen has values to draw. */
const CHART_VALUES = { a: 3, b: 5, c: 2, series: [2, 5, 3, 8, 4], chartLabels: ["X", "Y", "Z"] };
/** The list columns charts read, with their element type. */
const LIST_COLUMNS = { series: "Double", chartLabels: "String" };

/**
 * As many columns as the widest caption line leaves room for (about 5.6 px a character at the caption size), at
 * most the layout's 10 and at least enough for 8 rows.
 * @param sheet - the sheet
 * @returns the column count
 */
function columnsFor(sheet) {
    const n = sheet.specimens.length;
    const widest = Math.max(
        ...sheet.specimens.flatMap((sp) =>
            String(sp.caption ?? caption(sp.vp, sp.value))
                .split("\n")
                .map((l) => l.length),
        ),
    );
    const fit = Math.floor((layout.area.x1 - layout.area.x0) / (widest * 5.6 + 10));
    return Math.min(layout.columns, Math.max(Math.ceil(n / 8), fit));
}

/**
 * A sheet's elements at their fixed positions: nodes and edges with their columns and bypasses, groups, annotations.
 * @param sheet - the sheet
 * @returns the elements
 */
function place(sheet) {
    const nodes = [];
    const edges = [];
    const groups = [];
    const annotations = [];
    const arrows = []; // arrow annotations as Cytoscape saves them, "@name" standing for another annotation's uuid
    const styled = []; // [vp, name, value]: set through a discrete mapping on the name column
    const charts = /images-charts/.test(sheet.replayOf ?? sheet.id);
    // `spec` marks the elements that carry a specimen's look (the rest is scaffolding: anchors, captions, end nodes)
    const node = (name, x, y, bypass = {}, cols = {}) =>
        nodes.push({
            name,
            x,
            y,
            bypass,
            cols: { ...(charts ? CHART_VALUES : {}), ...cols },
            spec:
                cols !== undefined &&
                bypass !== END &&
                bypass !== CHILD &&
                bypass !== CAPTION &&
                bypass !== ANCHOR &&
                !name.endsWith("-under"),
        });
    const edge = (name, source, target, bypass = {}, cols = {}) =>
        edges.push({ name, source, target, bypass, cols, spec: !name.endsWith("-under") });
    for (const a of ANCHORS) node(a.id, a.x, a.y, ANCHOR);
    const grid = cells(sheet.specimens.length, sheet.columns ?? columnsFor(sheet));
    sheet.specimens.forEach((sp, i) => {
        const c = grid[i];
        const look = { ...sp.base, ...sp.set };
        const cols = { ...(sp.label === undefined ? {} : { label: sp.label }), ...sp.cols };
        const s = `${sp.id}-s`;
        const t = `${sp.id}-t`;
        switch (sp.kind) {
            case "node":
                node(sp.id, c.x, c.y, look, cols);
                break;
            case "zpair":
                if (sp.vp === "EDGE_Z_ORDER") {
                    node(s, c.source.x, c.y, END);
                    node(t, c.target.x, c.y, END);
                    edge(sp.id, s, t, look, cols);
                    node(`${sp.id}-under-s`, c.x, c.y - 30, END);
                    node(`${sp.id}-under-t`, c.x, c.y + 30, END);
                    edge(`${sp.id}-under`, `${sp.id}-under-s`, `${sp.id}-under-t`, {
                        EDGE_WIDTH: 6,
                        EDGE_STROKE_UNSELECTED_PAINT: "#000000",
                    });
                } else {
                    node(sp.id, c.x - 7, c.y - 7, look, cols);
                    node(`${sp.id}-under`, c.x + 7, c.y + 7, { NODE_FILL_COLOR: "#000000" });
                }
                break;
            case "edge":
            case "diag": {
                // Cytoscape 3.10.5's SVG export writes NaN for the y of a label on an exactly horizontal edge, so an
                // edge that carries a label is tilted 4 px each way
                const labelled =
                    sp.label !== undefined || sp.cols?.elabel !== undefined || sp.set?.EDGE_LABEL !== undefined;
                const dy = sp.kind === "diag" ? 20 : labelled ? 4 : 0;
                node(s, c.source.x, c.y + dy, END);
                node(t, c.target.x, c.y - dy, END);
                edge(sp.id, s, t, look, cols);
                break;
            }
            case "loop":
                node(s, c.x, c.y, END);
                for (let k = 0; k < (sp.count ?? 1); k++) edge(k ? `${sp.id}-${k + 1}` : sp.id, s, s, look, cols);
                break;
            case "parallel":
                node(s, c.source.x, c.y, END);
                node(t, c.target.x, c.y, END);
                for (let k = 0; k < sp.count; k++) edge(`${sp.id}-${"abcdef"[k]}`, s, t, look, cols);
                break;
            case "group": {
                const dy = sp.nested ? -8 : 0;
                node(`${sp.id}-a`, c.x - 20, c.y + dy, CHILD);
                node(`${sp.id}-b`, c.x + 20, c.y + dy, CHILD);
                if (sp.nested) {
                    node(`${sp.id}-c`, c.x, c.y + 22, CHILD);
                    groups.push({
                        name: `${sp.id}-inner`,
                        members: [`${sp.id}-a`, `${sp.id}-b`],
                        bypass: {},
                        viewType: sp.viewType,
                    });
                    groups.push({
                        name: sp.id,
                        members: [`${sp.id}-inner`, `${sp.id}-c`],
                        bypass: look,
                        viewType: sp.viewType,
                    });
                } else {
                    groups.push({
                        name: sp.id,
                        members: [`${sp.id}-a`, `${sp.id}-b`],
                        bypass: look,
                        collapse: sp.collapse,
                        viewType: sp.viewType,
                    });
                }
                // an expanded group's node is not in the view, so its look can only be reached through the style
                if (!sp.collapse) for (const [vp, v] of Object.entries(look)) styled.push([vp, sp.id, v]);
                break;
            }
            case "annotation": {
                const w = Number(sp.args.width ?? 0);
                const h = Number(sp.args.height ?? 0);
                annotations.push({
                    type: sp.type,
                    args: { ...sp.args, x: String(c.x - w / 2), y: String(c.y - h / 2), newName: sp.id },
                });
                break;
            }
            case "arrow": {
                // a small neutral shape at the cell's source point, the arrow leaving it toward the target point
                const box = (name, x) =>
                    annotations.push({
                        type: "shape",
                        args: {
                            type: "Rectangle",
                            width: "14",
                            height: "10",
                            fillColor: layout.neutral.fill,
                            borderColor: layout.neutral.border,
                            borderThickness: "1",
                            x: String(x - 7),
                            y: String(c.y - 5),
                            newName: name,
                        },
                    });
                box(`${sp.id}-src`, c.source.x);
                const to = { x: c.target.x, y: c.y };
                const xy = (p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                const end = { targetPoint: xy(to) };
                if (sp.target === "node") {
                    node(t, to.x, to.y, END);
                    Object.assign(end, { targetPoint: undefined, targetNode: xy(to) });
                } else if (sp.target === "annotation") {
                    box(`${sp.id}-dst`, to.x);
                    Object.assign(end, { targetPoint: undefined, targetAnnotation: `@${sp.id}-dst` });
                }
                arrows.push({
                    type: "org.cytoscape.view.presentation.annotations.ArrowAnnotation",
                    uuid: `00000000-0000-4000-8000-${String(arrows.length + 1).padStart(12, "0")}`,
                    name: sp.id,
                    sourceAnnotation: `@${sp.id}-src`,
                    ...end,
                    ...ARROW_NEUTRAL,
                    ...sp.fields,
                    x: c.source.x.toFixed(1),
                    y: c.y.toFixed(1),
                    z: String(arrows.length),
                });
                break;
            }
            default:
                throw new Error(`unknown specimen kind ${sp.kind}`);
        }
        node(`cap-${sp.id}`, c.caption.x, c.caption.y, CAPTION, { label: sp.caption ?? caption(sp.vp, sp.value) });
    });
    const names = [...nodes, ...edges].map((e) => e.name);
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) throw new Error(`${sheet.id}: two elements are named ${dup}`);
    for (const n of names) if (!/^[a-z0-9-]+$/.test(n)) throw new Error(`${sheet.id}: ${n} is not a setting id`);
    return { nodes, edges, groups, annotations, arrows, styled };
}

const discrete = (vp, column, type, pairs) => ({
    mappingType: "discrete",
    mappingColumn: column,
    mappingColumnType: type,
    visualProperty: vp,
    map: pairs.map(([key, value]) => ({ key: String(key), value: String(value) })),
});
const continuous = (vp, column, points) => ({
    mappingType: "continuous",
    mappingColumn: column,
    mappingColumnType: "Double",
    visualProperty: vp,
    points: points.map(([value, lesser, equal, greater]) => ({
        value,
        lesser: String(lesser),
        equal: String(equal ?? lesser),
        greater: String(greater ?? equal ?? lesser),
    })),
});
const asMapping = (m) =>
    m.mappingType === "discrete"
        ? discrete(m.visualProperty, m.mappingColumn, m.mappingColumnType, m.map)
        : m.mappingType === "continuous"
          ? continuous(m.visualProperty, m.mappingColumn, m.points)
          : m;

/**
 * The sheet's style: the neutral defaults (plus the sheet's own), a passthrough label from the label column, and
 * on a replayed page every specimen bypass as a discrete mapping on the name column.
 * @returns { style, bypasses } where bypasses are what is still set per element
 */
function styleOf(sheet, placed) {
    const defaults = { ...NEUTRAL_DEFAULTS, ...sheet.style?.defaults };
    const mappings = (sheet.style?.mappings ?? []).map(asMapping);
    const have = new Set(mappings.map((m) => m.visualProperty));
    for (const [vp, col] of [
        ["NODE_LABEL", "label"],
        ["EDGE_LABEL", "label"],
    ]) {
        if (!have.has(vp))
            mappings.push({
                mappingType: "passthrough",
                mappingColumn: col,
                mappingColumnType: "String",
                visualProperty: vp,
            });
    }
    if (sheet.mapped) {
        // every specimen element's look becomes a discrete mapping keyed by name; scaffolding stays a bypass
        for (const [kind, list] of [
            ["NODE", placed.nodes],
            ["EDGE", placed.edges],
        ]) {
            const byVp = new Map();
            for (const e of list) {
                if (!e.spec) continue;
                const kept = {};
                for (const [vp, v] of Object.entries(e.bypass)) {
                    if (vp === `${kind}_LABEL`) {
                        e.cols.label = v; // a label is already passed through from the label column
                    } else if (CX2_CANNOT_MAP.has(vp)) {
                        kept[vp] = v;
                    } else {
                        if (!byVp.has(vp)) byVp.set(vp, []);
                        byVp.get(vp).push([e.name, v]);
                    }
                }
                e.bypass = kept;
            }
            for (const [vp, pairs] of byVp) mappings.push(discrete(vp, "name", "String", pairs));
        }
    }
    const byName = new Map();
    for (const [vp, name, v] of placed.styled) {
        if (!byName.has(vp)) byName.set(vp, []);
        byName.get(vp).push([name, v]);
    }
    for (const [vp, pairs] of byName) mappings.push(discrete(vp, "name", "String", pairs));
    return {
        title: sheet.id,
        defaults: Object.entries(defaults).map(([visualProperty, value]) => ({ visualProperty, value })),
        mappings,
    };
}

/** Waits until a new session has re-registered the built-in styles (they land a moment after `session new`). */
async function builtInStyles() {
    let last = "";
    for (let i = 0; i < 80; i++) {
        const now = JSON.stringify((await call("GET", "/styles")).sort());
        if (now.includes('"Marquee"') && now === last) return;
        last = now;
        await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error("the new session's built-in styles never appeared");
}

/** Declares the columns and writes every element's values. */
async function writeColumns(net, table, columns, rows) {
    const used = Object.keys(columns).filter((c) => rows.some((r) => r.cols[c] !== undefined && r.cols[c] !== null));
    const list = Object.keys(LIST_COLUMNS).filter((c) => rows.some((r) => r.cols[c]));
    const decl = [
        ...used.map((name) => ({ name, type: columns[name] })),
        ...list.map((name) => ({ name, type: LIST_COLUMNS[name], list: true })),
    ];
    if (decl.length) await call("POST", `/networks/${net}/tables/${table}/columns`, decl);
    const data = rows
        .map((r) => ({
            SUID: r.suid,
            ...Object.fromEntries(
                [...used, ...list]
                    .filter((c) => r.cols[c] !== undefined && r.cols[c] !== null)
                    .map((c) => [c, r.cols[c]]),
            ),
        }))
        .filter((d) => Object.keys(d).length > 1);
    if (data.length) await call("PUT", `/networks/${net}/tables/${table}`, { key: "SUID", dataKey: "SUID", data });
}

const view = (bypass) => Object.entries(bypass).map(([visualProperty, value]) => ({ visualProperty, value }));

async function build(sheet) {
    const placed = place(sheet);
    const style = styleOf(sheet, placed);
    await command("session", "new", { destroyCurrentSession: true });
    await builtInStyles();
    const created = await call("POST", `/networks?format=cyjs&collection=${encodeURIComponent(sheet.id)}`, {
        data: { name: sheet.id },
        elements: {
            nodes: placed.nodes.map((n) => ({ data: { id: n.name, name: n.name } })),
            edges: placed.edges.map((e) => ({
                data: {
                    id: e.name,
                    name: e.name,
                    source: e.source,
                    target: e.target,
                    interaction: e.cols.interaction ?? "specimen",
                },
            })),
        },
    });
    const net = created.networkSUID ?? created[0]?.networkSUID ?? created;
    let views = await call("GET", `/networks/${net}/views`);
    if (views.length === 0) {
        await call("POST", `/networks/${net}/views`);
        views = await call("GET", `/networks/${net}/views`);
    }
    const viewId = views[0];
    const suids = async (table) =>
        new Map((await call("GET", `/networks/${net}/tables/${table}/rows`)).map((r) => [r.name, r.SUID]));
    const nodeSuid = await suids("defaultnode");
    const edgeSuid = await suids("defaultedge");
    for (const n of placed.nodes) n.suid = nodeSuid.get(n.name);
    for (const e of placed.edges) e.suid = edgeSuid.get(e.name);
    if ([...placed.nodes, ...placed.edges].some((e) => e.suid === undefined))
        throw new Error(`${sheet.id}: an element lost its name`);
    // the edge names Cytoscape gives on import ("a (interaction) b") are replaced by the setting ids
    await call("PUT", `/networks/${net}/tables/defaultedge`, {
        key: "SUID",
        dataKey: "SUID",
        data: placed.edges.map((e) => ({ SUID: e.suid, name: e.name, "shared name": e.name })),
    });
    await writeColumns(net, "defaultnode", NODE_COLUMNS, placed.nodes);
    await writeColumns(net, "defaultedge", EDGE_COLUMNS, placed.edges);
    await call(
        "PUT",
        `/networks/${net}/views/${viewId}/nodes`,
        placed.nodes.map((n) => ({ SUID: n.suid, view: view({ NODE_X_LOCATION: n.x, NODE_Y_LOCATION: n.y }) })),
    );
    await call("POST", "/styles", style);
    const deps = { ...NEUTRAL_DEPENDENCIES, ...sheet.dependencies };
    await call(
        "PUT",
        `/styles/${encodeURIComponent(sheet.id)}/dependencies`,
        Object.entries(deps).map(([visualPropertyDependency, enabled]) => ({ visualPropertyDependency, enabled })),
    );
    await call("GET", `/apply/styles/${encodeURIComponent(sheet.id)}/${net}`);
    const nb = placed.nodes
        .filter((n) => Object.keys(n.bypass).length)
        .map((n) => ({ SUID: n.suid, view: view(n.bypass) }));
    if (nb.length) await call("PUT", `/networks/${net}/views/${viewId}/nodes?bypass=true`, nb);
    const eb = placed.edges
        .filter((e) => Object.keys(e.bypass).length)
        .map((e) => ({ SUID: e.suid, view: view(e.bypass) }));
    if (eb.length) await call("PUT", `/networks/${net}/views/${viewId}/edges?bypass=true`, eb);
    const viewTypes = [];
    for (const g of placed.groups) {
        const nodeList = g.members.map((m) => `SUID:${nodeSuid.get(m) ?? m}`).join(",");
        const made = await command("group", "create", { groupName: g.name, nodeList, network: `SUID:${net}` }).catch(
            (e) => {
                throw new Error(`${sheet.id}: group ${g.name} (${nodeList}): ${e.message}`);
            },
        );
        const suid = made.data?.group ?? made.data?.SUID ?? (await suids("defaultnode")).get(g.name);
        nodeSuid.set(g.name, suid);
        await call("PUT", `/networks/${net}/tables/defaultnode`, {
            key: "SUID",
            dataKey: "SUID",
            data: [{ SUID: suid, name: g.name, "shared name": g.name }],
        });
        if (g.viewType) viewTypes.push([suid, g.viewType]);
        if (g.collapse) await command("group", "collapse", { groupList: `SUID:${suid}`, network: `SUID:${net}` });
        if (g.collapse && Object.keys(g.bypass).length) {
            await call("PUT", `/networks/${net}/views/${viewId}/nodes?bypass=true`, [
                { SUID: suid, view: view(g.bypass) },
            ]);
        }
    }
    if (viewTypes.length) {
        // each group's own settings, in the form Cytoscape writes them (CyGroupSettingsImpl.updateSettingsInTable),
        // written after every group exists: a __ViewSettings column present while groups are still being made
        // breaks the making of a group around another group ("node is null")
        await call("POST", `/networks/${net}/tables/defaultnode/columns`, {
            name: "__ViewSettings",
            type: "String",
            list: true,
        });
        await call("PUT", `/networks/${net}/tables/defaultnode`, {
            key: "SUID",
            dataKey: "SUID",
            data: viewTypes.map(([SUID, t]) => ({
                SUID,
                __ViewSettings: [
                    "doubleClickAction=Expand/Contract",
                    "useNestedNetworks=false",
                    `groupViewType=${t}`,
                    "groupNodeOpacity=100.0",
                ],
            })),
        });
    }
    for (const a of placed.annotations) {
        await command("annotation", `add ${a.type}`, { view: `SUID:${viewId}`, ...a.args });
    }
    if (placed.annotations.length) {
        // the network's __Annotations column, which XGMML and CX write, is filled when the annotations are listed
        const listed = (await command("annotation", "list", { network: `SUID:${net}` })).data ?? [];
        if (listed.length !== placed.annotations.length) {
            throw new Error(`${sheet.id}: ${listed.length} annotations made of ${placed.annotations.length}`);
        }
    }
    if (placed.arrows.length) return { ...(await addArrows(sheet, net, placed.arrows)), placed };
    return { net, view: viewId, placed };
}

/**
 * Cytoscape's commands make no arrow annotation, so a sheet with arrows is saved as a session, the arrows are added
 * to its network's __Annotations column as Cytoscape 3.10.5 saves them (cys_add_annotations.py), and the session is
 * opened again: Cytoscape reads the arrows as it reads any session's, and every file is then saved from it.
 * @param sheet - the sheet
 * @param net - its network
 * @param arrows - the arrows' fields
 * @returns the reopened network and view
 */
async function addArrows(sheet, net, arrows) {
    const dir = mkdtempSync(join(tmpdir(), "cytoscape-arrows-"));
    const before = join(dir, "before.cys");
    const after = join(dir, "after.cys");
    const entries = join(dir, "arrows.json");
    await command("session", "save as", { file: before });
    const strings = arrows.map((a) =>
        Object.entries(a)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${k}=${v}`)
            .join("|"),
    );
    writeFileSync(entries, JSON.stringify(strings));
    execFileSync("python3", ["-I", join(here, "cys_add_annotations.py"), before, after, entries]);
    await command("session", "open", { file: after });
    const nets = await call("GET", "/networks");
    if (nets.length !== 1) throw new Error(`${sheet.id}: ${nets.length} networks after reopening`);
    const views = await call("GET", `/networks/${nets[0]}/views`);
    // the column is written again from the annotations Cytoscape holds when a session is saved
    await command("session", "save as", { file: before });
    const column = (await call("GET", `/networks/${nets[0]}/tables/defaultnetwork/rows`))[0].__Annotations ?? [];
    const read = column.filter((s) => s.includes("ArrowAnnotation")).length;
    if (process.env.KEEP_ARROWS) console.log(dir);
    else rmSync(dir, { recursive: true, force: true });
    if (read !== arrows.length) throw new Error(`${sheet.id}: Cytoscape read ${read} of ${arrows.length} arrows`);
    return { net: nets[0], view: views[0] };
}

// The session is saved first: saving it writes the annotations into the network's __Annotations column, which the
// XGMML and CX writers read (saved before it, those files have no annotations).
const FORMATS = [
    ["cys", "cys"],
    ["xgmml", "xgmml"],
    ["cx", "cx"],
    ["cx2", "cx2"],
];
async function save(sheet, net, viewId) {
    const written = [];
    for (const [fmt, ext] of FORMATS.filter(([f]) => !sheet.formats || sheet.formats.includes(f))) {
        const dir = join(specimensDir, fmt);
        mkdirSync(dir, { recursive: true });
        const file = join(dir, `${sheet.id}.${ext}`);
        rmSync(file, { force: true });
        rmSync(`${file}.gz`, { force: true });
        if (fmt === "xgmml") {
            // `network export` writes no <graphics>; the view route writes network and view, as "Export Network and View" does
            await call("GET", `/networks/${net}/views/${viewId}?file=${encodeURIComponent(file)}`);
        } else if (fmt === "cys") {
            await command("session", "save as", { file });
        } else {
            await command("network", "export", {
                network: `SUID:${net}`,
                options: fmt.toUpperCase(),
                outputFile: file,
            });
        }
        // a sheet over 256 KB is stored gzip-compressed (../../specimens/README.md)
        if (statSync(file).size > 256 * 1024) {
            writeFileSync(`${file}.gz`, gzipSync(readFileSync(file), { level: 9 }));
            rmSync(file);
            written.push(`${file}.gz`);
            continue;
        }
        written.push(file);
    }
    return written;
}

// ------------------------------------------------------------------------------------------------ coverage

function coverage(all) {
    const out = {};
    const hit = (vp, value, sample) => {
        const e = (out[vp] ??= { values: {} });
        (e.values[String(value)] ??= []).push(sample);
    };
    for (const sheet of all) {
        for (const sp of sheet.specimens) {
            const look = sp.set ?? {};
            for (const [vp, v] of Object.entries(look)) hit(vp, v, `${sheet.id}#${sp.id}`);
            if (sp.label !== undefined || sp.cols?.label !== undefined)
                hit("NODE_LABEL", "(text)", `${sheet.id}#${sp.id}`);
        }
        for (const [vp, v] of Object.entries(sheet.style?.defaults ?? {})) hit(vp, v, `${sheet.id} (style default)`);
        for (const m of sheet.style?.mappings ?? []) hit(m.visualProperty, `(${m.mappingType} mapping)`, sheet.id);
        if (sheet.mapped) hit("(discrete mapping on name)", sheet.replayOf, sheet.id);
    }
    hit("NODE_X_LOCATION", "(every node)", "*");
    hit("NODE_Y_LOCATION", "(every node)", "*");
    hit("EDGE_LABEL", "(text)", "specimen-edge-labels");
    // the neutral baseline is what every sheet's "default" specimen shows
    for (const [vp, v] of Object.entries(NEUTRAL_DEFAULTS)) hit(vp, v, "(every sheet's default specimen)");
    const report = {};
    let covered = 0;
    const missing = [];
    for (const v of lexicon.visualProperties) {
        const got = out[v.id];
        if (SKIPPED[v.id]) {
            report[v.id] = { skipped: SKIPPED[v.id] };
            continue;
        }
        if (!got) {
            missing.push(v.id);
            report[v.id] = { missing: true };
            continue;
        }
        const missingValues = (v.values ?? []).filter((x) => !got.values[x]);
        covered += v.values ? v.values.length - missingValues.length : Object.keys(got.values).length;
        report[v.id] = { ...got, ...(missingValues.length ? { missingValues } : {}) };
    }
    return { covered, missing, report };
}

// ------------------------------------------------------------------------------------------------ main

const ALL = sheets();
const wanted = new Set(args);
const unknown = [...wanted].filter((w) => !ALL.some((s) => s.id === w));
if (unknown.length) throw new Error(`no such sheet: ${unknown.join(" ")}`);
for (const sheet of ALL.filter((s) => wanted.size === 0 || wanted.has(s.id))) {
    if (sheet.specimens.length > layout.maxSpecimens)
        throw new Error(`${sheet.id}: ${sheet.specimens.length} specimens`);
    const { net, view: viewId } = await build(sheet);
    const files = await save(sheet, net, viewId);
    console.log(
        `${sheet.id}\t${sheet.specimens.length} specimens\t${files.map((f) => f.split("/").slice(-2).join("/")).join(" ")}`,
    );
}
const cov = coverage(ALL);
writeFileSync(
    coverageFile,
    `${JSON.stringify(
        {
            program: `Cytoscape desktop ${lexicon.version}`,
            sheets: ALL.map((s) => ({
                id: s.id,
                specimens: s.specimens.length,
                ...(s.replayOf ? { replayOf: s.replayOf } : {}),
            })),
            valuesCovered: cov.covered,
            uncovered: cov.missing,
            visualProperties: cov.report,
        },
        null,
        2,
    )}\n`,
);
console.log(`${cov.covered} values covered; uncovered properties: ${cov.missing.join(" ") || "none"}`);
if (cov.missing.length) process.exitCode = 1;
