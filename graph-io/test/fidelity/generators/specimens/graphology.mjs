#!/usr/bin/env node
// The graphology specimen sheets (graphology-sigma family): one graphology serialization document per sheet page in
// graph-io/test/fidelity/specimens/graphology/, written by graphology's own graph.export(), and the vocabulary they
// cover.
//
//   node graphology.mjs               write every sheet, pages.json and graphology-coverage.json
//   node graphology.mjs --vocabulary  rewrite graphology-vocabulary.json from the live libraries first
//
// The vocabulary is what the pinned sigma.js 4 (../../oracles/tools/graphIo) reads and draws of a graphology file: the
// attributes its DEFAULT_STYLES bind (node x, y, size, color, label; edge size, color, label), its default node
// shapes and edge paths (DEFAULT_PRIMITIVES), the color syntaxes and the 148 color names of its color parser
// (sigma/utils parseColor, HTML_COLORS), the settings that change what a default drawing shows, and graphology's
// serialization options (https://graphology.github.io/serialization.html). It is read from the libraries on every
// run and compared with graphology-vocabulary.json beside this script: an entry that appears or disappears in a new
// version fails the run until --vocabulary rewrites the file. The attributes sigma.js v3 read and graphology files
// in the wild still carry (type, hidden, forceLabel, zIndex, highlighted, image, border*; edge types line, arrow,
// curvedArrow, curve) are a fixed list (LEGACY below): sigma 4's defaults ignore them, and the specimens show it.
// Every entry has a specimen or a NOT_DRAWN reason, or the run fails.
//
// sigma.js keeps at most one node label per 100 px cell of its screen (labelGridCellSize 100, labelDensity 1), the
// largest node's, and draws no label on a node drawn smaller than 6 px (labelRenderedSizeThreshold). So captions are
// labels of transparent nodes 7 units in radius, five columns to a sheet, and the run fails when two labeled nodes
// would share a grid cell (except on the specimen that shows the grid).
import { execFileSync } from "node:child_process";
import console from "node:console";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { ANCHORS, caption, cells, layout } from "../sheet-layout.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../specimens/graphology");
const VOCAB = join(here, "graphology-vocabulary.json");
const COVERAGE = join(here, "graphology-coverage.json");
const graphIo = resolve(here, "../../../.."); // its devDependencies pin the oracle libraries
const req = createRequire(join(graphIo, "package.json"));
const versionOf = (pkg) => JSON.parse(readFileSync(join(graphIo, "node_modules", pkg, "package.json"), "utf8")).version;
const PINNED = { sigma: "4.0.1", graphology: "0.26.0" };
for (const [pkg, v] of Object.entries(PINNED)) {
    if (versionOf(pkg) !== v)
        throw new Error(`graphology.mjs: ${pkg} ${versionOf(pkg)}, the sheets are made with ${v}`);
}
// sigma's modules touch WebGL constants when they load; nothing here draws.
globalThis.WebGL2RenderingContext ??= new Proxy({}, { get: () => 0 });
const Graph = req("graphology");
const sigma = req("sigma");
const primitives = req("sigma/primitives");
const { HTML_COLORS } = req("sigma/utils");
const { DEFAULT_SETTINGS } = req("sigma/settings");
const N = layout.neutral;
const DOC_SERIAL = "https://graphology.github.io/serialization.html";
const DOC_SIGMA = "https://www.sigmajs.org/get-started/quickstart/";

// ------------------------------------------------------------------ the vocabulary, from the live libraries

/** The attribute names a sigma style rule binds, found anywhere in the rule ({ attribute } at any depth). */
function boundAttributes(rule) {
    const found = {};
    for (const [prop, value] of Object.entries(rule)) {
        const walk = (v) => {
            if (v && typeof v === "object") {
                if (typeof v.attribute === "string") (found[prop] ??= new Set()).add(v.attribute);
                Object.values(v).forEach(walk);
            }
        };
        walk(value);
    }
    return Object.fromEntries(Object.entries(found).map(([k, s]) => [k, [...s]]));
}

/** The settings that change what a default drawing of a file shows (the rest are interaction and debugging). */
const DRAWING_SETTINGS = [
    "renderLabels",
    "renderEdgeLabels",
    "edgeLabelAnchors",
    "stagePadding",
    "minEdgeThickness",
    "itemSizesReference",
    "autoRescale",
    "autoRescaleContent",
    "labelDensity",
    "labelGridCellSize",
    "labelRenderedSizeThreshold",
];

function liveVocabulary() {
    const nodes = boundAttributes(sigma.DEFAULT_STYLES.nodes);
    const edges = boundAttributes(sigma.DEFAULT_STYLES.edges);
    return {
        nodeAttributes: Object.values(nodes).flat().sort(),
        edgeAttributes: Object.values(edges).flat().sort(),
        nodeShapes: primitives.DEFAULT_NODE_PRIMITIVES.shapes.map((s) => s.name),
        edgePaths: primitives.DEFAULT_EDGE_PRIMITIVES.paths.map((p) => p.name),
        edgeExtremities: primitives.DEFAULT_EDGE_PRIMITIVES.extremities.map((x) => x.name),
        colorNames: Object.keys(HTML_COLORS).sort(),
        settings: Object.fromEntries(
            DRAWING_SETTINGS.map((k) => {
                const v = DEFAULT_SETTINGS[k];
                return [k, typeof v === "function" ? `function ${v.name}` : v];
            }),
        ),
    };
}

/**
 * graphology's serialization (DOC_SERIAL) and the syntaxes of sigma's color parser (sigma/utils parseColor: names,
 * "transparent", #rgb, #rrggbb, #rrggbbaa, rgb() and rgba() with integer channels; anything else is black).
 */
const FIXED = {
    graphOptions: { type: ["mixed", "directed", "undirected"], multi: [true, false], allowSelfLoops: [true, false] },
    edgeKeys: ["undirected", "absent"],
    colorSyntaxes: ["name", "name-mixed-case", "transparent", "hex3", "hex6", "hex6-upper", "hex8", "rgb", "rgba"],
    coordinateSyntaxes: ["number", "numeric-string"],
};

/** What sigma.js v3 read, which graphology files in the wild carry; sigma 4's DEFAULT_STYLES read none of it. */
const LEGACY = {
    doc: "https://github.com/jacomyal/sigma.js/blob/v3.0.2/packages/sigma/src/types.ts (NodeDisplayData, EdgeDisplayData) and the @sigma/node-image, @sigma/node-border and @sigma/edge-curve packages",
    node: {
        type: ["circle", "point", "image", "border", "square"],
        hidden: [true],
        forceLabel: [true],
        zIndex: ["number"],
        highlighted: [true],
        image: ["url"],
        borderColor: ["color"],
        borderSize: ["number"],
    },
    edge: { type: ["line", "arrow", "curvedArrow", "curve"], hidden: [true], forceLabel: [true], zIndex: ["number"] },
};

/**
 * sigma 4's own display-data field names (NodeDisplayData, EdgeDisplayData: what a style rule writes), which a file
 * may carry as attributes, written by an application that stored its display data. sigma 4's DEFAULT_STYLES bind none
 * of them to an attribute (its `visibility` comes from the element's isHidden state, never from the file), so a
 * default drawing ignores them; the specimens show it.
 */
const DISPLAY = {
    doc: "https://www.sigmajs.org/concepts/styles-and-primitives/ and sigma 4.0.1's DEFAULT_NODE_DISPLAY_DATA / DEFAULT_EDGE_DISPLAY_DATA",
    node: {
        visibility: ["hidden"],
        shape: ["square"],
        opacity: ["number"],
        labelColor: ["color"],
        labelSize: ["number"],
    },
    edge: { visibility: ["hidden"], opacity: ["number"], path: ["curved"], head: ["arrow"] },
};

/**
 * Keys other programs write into graphology files, which sigma 4 does not read: a 3D layout's `z`, d3-force's simulation
 * keys (`index`, `vx`, `vy`, `fx`, `fy`) and vis-network's `physics`. sigma draws such a file from x and y alone, y up;
 * the specimens show it (each key is on a page of its own kind, as one such key changes how a reader takes the whole
 * file).
 */
const FOREIGN = {
    doc: "https://d3js.org/d3-force/simulation#simulation_nodes and https://visjs.github.io/vis-network/docs/network/nodes.html",
    node: {
        z: ["number"],
        index: ["number"],
        vx: ["number"],
        vy: ["number"],
        fx: ["number"],
        fy: ["number"],
        physics: ["boolean"],
    },
};

const live = liveVocabulary();
const program = `sigma.js ${versionOf("sigma")}, graphology ${versionOf("graphology")}`;
if (process.argv.includes("--vocabulary")) {
    writeFileSync(
        VOCAB,
        `${JSON.stringify(
            {
                about: "The graphology format's style vocabulary as sigma.js 4 draws it: the attributes sigma's DEFAULT_STYLES bind, its default node shapes, edge paths and edge extremities (DEFAULT_PRIMITIVES), its color parser's names (sigma/utils HTML_COLORS) and the default values of the settings that change a drawing, read from the pinned libraries by graphology.mjs --vocabulary; graphology.mjs fails when they differ, so a new version shows up as a new or missing specimen. The serialization options, color syntaxes and sigma v3's legacy attributes are fixed lists in graphology.mjs.",
                program,
                doc: [DOC_SERIAL, DOC_SIGMA, "https://www.sigmajs.org/reference/settings/"],
                ...live,
            },
            null,
            4,
        )}\n`,
    );
}
const committed = JSON.parse(readFileSync(VOCAB, "utf8"));
for (const k of Object.keys(live)) {
    if (JSON.stringify(committed[k]) !== JSON.stringify(live[k])) {
        throw new Error(
            `graphology.mjs: ${k} differs from graphology-vocabulary.json; run with --vocabulary, then give every new entry a specimen (or a NOT_DRAWN reason)`,
        );
    }
}

/** Every vocabulary entry as one key: what a specimen covers. */
const ENTRIES = [
    ...live.nodeAttributes.map((a) => `node.${a}`),
    ...live.edgeAttributes.map((a) => `edge.${a}`),
    ...live.nodeShapes.map((s) => `node.shape:${s}`),
    ...live.edgePaths.map((p) => `edge.path:${p}`),
    ...live.edgeExtremities.map((x) => `edge.extremity:${x}`),
    ...live.colorNames.map((c) => `color.name:${c}`),
    ...FIXED.colorSyntaxes.map((c) => `color.syntax:${c}`),
    ...FIXED.coordinateSyntaxes.map((c) => `position.syntax:${c}`),
    ...Object.keys(live.settings).map((s) => `setting.${s}`),
    ...Object.entries(FIXED.graphOptions).flatMap(([k, vs]) => vs.map((v) => `graph.${k}:${v}`)),
    ...FIXED.edgeKeys.map((k) => `edge.key:${k}`),
    ...Object.entries(LEGACY.node).flatMap(([k, vs]) => vs.map((v) => `legacy.node.${k}:${v}`)),
    ...Object.entries(LEGACY.edge).flatMap(([k, vs]) => vs.map((v) => `legacy.edge.${k}:${v}`)),
    ...Object.entries(DISPLAY.node).flatMap(([k, vs]) => vs.map((v) => `display.node.${k}:${v}`)),
    ...Object.entries(DISPLAY.edge).flatMap(([k, vs]) => vs.map((v) => `display.edge.${k}:${v}`)),
    ...Object.entries(FOREIGN.node).flatMap(([k, vs]) => vs.map((v) => `foreign.node.${k}:${v}`)),
];

const NOT_DRAWN = {
    "setting.renderLabels":
        "a sigma setting, not part of the file; off it hides every label, captions included, so no sheet is drawn under it",
    "setting.stagePadding": "frames the sheet (30 px) on every sheet; the anchors fix where",
    "setting.minEdgeThickness": "applies on every sheet; edge-size-0-5 and edge-size-1 are drawn at it",
    "setting.itemSizesReference": "on every sheet: sizes are in position units, scaled with the sheet",
    "setting.autoRescale": "on every sheet: the anchors' box is fitted to the canvas",
    "setting.autoRescaleContent": "on every sheet",
    "setting.labelDensity": "on every sheet; label-grid-larger / label-grid-smaller show the grid it sets",
    "setting.labelGridCellSize": "on every sheet; label-grid-larger / label-grid-smaller show the grid it sets",
    "graph.multi:false": "every sheet is multi so parallel edges can be drawn; a non-multi graph draws the same",
    "graph.allowSelfLoops:false": "every sheet allows self loops; disallowing them only rejects the file",
    "position.syntax:numeric-string":
        'sigma throws on a node whose x or y is a string ("could not find a valid position"), numeric or not',
};

// ------------------------------------------------------------------ specimens

const NEUTRAL_NODE = { size: N.size / 2, color: N.fill }; // sigma's size is a radius
const END_NODE = { size: 5, color: N.fill };
const NEUTRAL_EDGE = { size: N.edgeWidth, color: N.edgeColor };
const CAPTION_SIZE = 7; // a node drawn under 6 px keeps no label (labelRenderedSizeThreshold)
const COLUMNS = 5; // one caption per 100 px label grid cell, captions about 200 px wide

/** A node specimen: the neutral node plus `attrs`; `{}` for the default specimen (nothing set). */
const node = (id, prop, value, attrs, covers, neutral = NEUTRAL_NODE) => ({
    id,
    caption: caption(prop, value),
    covers,
    build: (c, g) => g.addNode(id, { x: c.x, y: c.y, ...neutral, ...attrs }),
});
/** An edge specimen between two neutral end nodes, the neutral edge plus `attrs`. */
const edge = (id, prop, value, attrs, covers, opts = {}) => ({
    id,
    caption: caption(prop, value),
    covers,
    build: (c, g) => {
        // opts.ends: labeled end nodes this far from the cell center (sigma draws an edge label only where both
        // end nodes show theirs, under its default edgeLabelAnchors "nodeLabels")
        const span = opts.ends ?? c.target.x - c.x;
        const label =
            opts.ends && !opts.bare
                ? (end) => ({ label: end, size: CAPTION_SIZE })
                : () => (opts.endSize ? { size: opts.endSize } : {});
        g.addNode(`${id}-s`, { x: c.x - span, y: c.y, ...END_NODE, ...label("s") });
        g.addNode(`${id}-t`, { x: c.x + span, y: c.y, ...END_NODE, ...label("t") });
        const e = { ...(opts.neutral ?? NEUTRAL_EDGE), ...attrs };
        if (opts.undirected) g.addUndirectedEdgeWithKey(id, `${id}-s`, `${id}-t`, e);
        else g.addDirectedEdgeWithKey(id, `${id}-s`, `${id}-t`, e);
    },
});
const colorSpecimen = (id, value, covers) => node(id, "color", value, { color: value }, covers);

const NAME_PAGE = 30;
const namePages = [];
for (let i = 0; i < live.colorNames.length; i += NAME_PAGE) {
    namePages.push(
        live.colorNames
            .slice(i, i + NAME_PAGE)
            .map((name) => colorSpecimen(`color-${name}`, name, [`color.name:${name}`, "node.color"])),
    );
}

const SHEETS = [
    {
        id: "specimen-node-shapes",
        specimens: [
            node("default", "nothing", "set", {}, ["node.shape:circle"], {}),
            node("shape-circle", "neutral", "circle", {}, [
                "node.shape:circle",
                "node.x",
                "node.y",
                "position.syntax:number",
            ]),
            ...LEGACY.node.type.map((t) => node(`type-${t}`, "type", t, { type: t }, [`legacy.node.type:${t}`])),
            node("shape-square", "shape", "square", { shape: "square" }, ["display.node.shape:square"]),
        ],
    },
    {
        id: "specimen-node-fills-borders",
        specimens: [
            node("default", "nothing", "set", {}, ["node.color"], {}),
            colorSpecimen("color-name-red", "red", ["color.syntax:name"]),
            colorSpecimen("color-name-mixed-case", "CornflowerBlue", ["color.syntax:name-mixed-case"]),
            colorSpecimen("color-transparent", "transparent", ["color.syntax:transparent"]),
            colorSpecimen("color-hex3", "#f80", ["color.syntax:hex3"]),
            colorSpecimen("color-hex6", "#2a9d8f", ["color.syntax:hex6"]),
            colorSpecimen("color-hex6-upper", "#E76F51", ["color.syntax:hex6-upper"]),
            colorSpecimen("color-hex8-alpha-80", "#1d3557cc", ["color.syntax:hex8"]),
            colorSpecimen("color-hex8-alpha-33", "#e6394655", ["color.syntax:hex8"]),
            colorSpecimen("color-rgb", "rgb(106,76,147)", ["color.syntax:rgb"]),
            colorSpecimen("color-rgb-spaces", "rgb( 25 , 130 , 196 )", ["color.syntax:rgb"]),
            colorSpecimen("color-rgba-half", "rgba(255,0,0,0.5)", ["color.syntax:rgba"]),
            colorSpecimen("color-rgba-zero", "rgba(0,128,0,0)", ["color.syntax:rgba"]),
            // what sigma's parser does not read: each is black (or garbled) in sigma
            colorSpecimen("color-hex4", "#f80c", ["color.syntax:hex3"]),
            colorSpecimen("color-rgb-percent", "rgb(100%,50%,0%)", ["color.syntax:rgb"]),
            colorSpecimen("color-rgb-decimal", "rgb(10.5,200.5,90.5)", ["color.syntax:rgb"]),
            colorSpecimen("color-hsl", "hsl(120,100%,25%)", ["color.syntax:rgb"]),
            colorSpecimen("color-unknown-name", "notacolor", ["color.syntax:name"]),
            colorSpecimen("color-empty", "", ["node.color"]),
            node("border-color-red", "borderColor", "red", { borderColor: "red" }, ["legacy.node.borderColor:color"]),
            node("border-size-4", "borderSize", 4, { borderSize: 4, borderColor: "#000000" }, [
                "legacy.node.borderSize:number",
            ]),
        ],
    },
    ...namePages.map((specimens, i) => ({ id: `specimen-node-fills-borders-p${i + 2}`, specimens })),
    {
        id: "specimen-node-sizes-opacity",
        specimens: [
            node("default", "nothing", "set", {}, ["node.size"], {}),
            ...[1, 3, 6, 10, 18, 25, 32].map((s) => node(`size-${s}`, "size", s, { size: s }, ["node.size"])),
            node("size-0", "size", 0, { size: 0 }, ["node.size"]),
            node("size-0-5", "size", 0.5, { size: 0.5 }, ["node.size"]),
            node("size-negative", "size", -10, { size: -10 }, ["node.size"]),
            node("size-string", "size", '"24"', { size: "24" }, ["node.size"]),
            colorSpecimen("color-alpha-half", "rgba(0,0,255,0.5)", ["color.syntax:rgba"]),
            node("hidden-true", "hidden", true, { hidden: true }, ["legacy.node.hidden:true"]),
            node("hidden-false", "hidden", false, { hidden: false }, ["legacy.node.hidden:true"]),
            node("highlighted-true", "highlighted", true, { highlighted: true }, ["legacy.node.highlighted:true"]),
            node("visibility-hidden", "visibility", "hidden", { visibility: "hidden" }, [
                "display.node.visibility:hidden",
            ]),
            node("opacity-0-3", "opacity", 0.3, { opacity: 0.3 }, ["display.node.opacity:number"]),
            {
                // two overlapping nodes: the first added says zIndex 10 (red), the second zIndex 0 (blue)
                id: "zindex",
                caption: caption("zIndex", "10 red, 0 blue"),
                covers: ["legacy.node.zIndex:number"],
                build: (c, g) => {
                    g.addNode("zindex-10", { x: c.x - 8, y: c.y, ...NEUTRAL_NODE, color: "#d62728", zIndex: 10 });
                    g.addNode("zindex-0", { x: c.x + 8, y: c.y, ...NEUTRAL_NODE, color: "#1f77b4", zIndex: 0 });
                },
            },
        ],
    },
    {
        // a z on any node makes some readers take the whole file as a 3D drawing; sigma draws x and y only
        id: "specimen-node-sizes-opacity-p2",
        specimens: [
            node("default", "nothing", "set", {}, [], {}),
            node("z-200", "z", 200, { z: 200 }, ["foreign.node.z:number"]),
            node("z-negative", "z", -200, { z: -200 }, ["foreign.node.z:number"]),
        ],
    },
    {
        // d3-force's simulation keys (and vis-network's physics) on any node make some readers take the whole file
        // as drawn y down in pixels; sigma draws every graphology file y up
        id: "specimen-node-sizes-opacity-p3",
        specimens: [
            node("default", "nothing", "set", {}, [], {}),
            node("index-3", "index", 3, { index: 3 }, ["foreign.node.index:number"]),
            node("vx-1", "vx", 1, { vx: 1 }, ["foreign.node.vx:number"]),
            node("vy-1", "vy", 1, { vy: 1 }, ["foreign.node.vy:number"]),
            node("fx-100", "fx", 100, { fx: 100 }, ["foreign.node.fx:number"]),
            node("fy-100", "fy", 100, { fy: 100 }, ["foreign.node.fy:number"]),
            node("physics-false", "physics", false, { physics: false }, ["foreign.node.physics:boolean"]),
        ],
    },
    {
        id: "specimen-labels",
        labeled: true,
        specimens: [
            node("default", "nothing", "set", {}, ["node.label"], {}),
            node("label-text", "label", "Text", { label: "Text" }, ["node.label"]),
            node("label-long", "label", "long", { label: "A longer label text" }, ["node.label"]),
            node("label-multiline", "label", "two lines", { label: "Line one\nLine two" }, ["node.label"]),
            node("label-spaces", "label", "padded", { label: "  padded  " }, ["node.label"]),
            node("label-empty", "label", '""', { label: "" }, ["node.label"]),
            node("label-null", "label", "null", { label: null }, ["node.label"]),
            node("label-on-colored", "label", "on red", { label: "On red", color: "#d62728" }, ["node.label"]),
            node("label-size-below-threshold", "label", "size 3", { label: "Small", size: 3 }, [
                "node.label",
                "setting.labelRenderedSizeThreshold",
            ]),
            node("label-size-at-threshold", "label", "size 7", { label: "Seven", size: 7 }, ["node.label"]),
            node("force-label-small", "forceLabel", true, { label: "Forced", size: 3, forceLabel: true }, [
                "legacy.node.forceLabel:true",
            ]),
            node("label-hidden-node", "hidden", true, { label: "Hidden", hidden: true }, ["legacy.node.hidden:true"]),
            node("label-color-blue", "labelColor", "#1f77b4", { label: "Blue", labelColor: "#1f77b4" }, [
                "display.node.labelColor:color",
            ]),
            node("label-size-24", "labelSize", 24, { label: "Large", labelSize: 24 }, [
                "display.node.labelSize:number",
            ]),
            {
                // two labeled nodes in one 100 px label grid cell: sigma keeps the larger node's label
                id: "label-grid",
                caption: caption("label grid", "one per cell"),
                covers: ["setting.labelGridCellSize", "setting.labelDensity"],
                gridCollision: ["label-grid-larger", "label-grid-smaller"],
                build: (c, g) => {
                    // the pair 40 units apart, moved until both fall in one grid cell
                    const dx = [0, -20, 20, -40, 40].find(
                        (d) => cellOf(c.x + d - 20, c.y) === cellOf(c.x + d + 20, c.y),
                    );
                    g.addNode("label-grid-larger", {
                        x: c.x + dx - 20,
                        y: c.y,
                        ...NEUTRAL_NODE,
                        size: 12,
                        label: "Big",
                    });
                    g.addNode("label-grid-smaller", {
                        x: c.x + dx + 20,
                        y: c.y,
                        ...NEUTRAL_NODE,
                        size: 8,
                        label: "Small",
                    });
                },
            },
        ],
    },
    {
        id: "specimen-edges-lines",
        specimens: [
            edge("default", "nothing", "set", {}, ["edge.color", "edge.size", "edge.path:straight"], { neutral: {} }),
            edge("edge-color-red", "color", "red", { color: "red" }, ["edge.color"]),
            edge("edge-color-hex6", "color", "#2a9d8f", { color: "#2a9d8f" }, ["edge.color"]),
            edge("edge-color-rgba", "color", "rgba(0,0,255,0.4)", { color: "rgba(0,0,255,0.4)" }, ["edge.color"]),
            edge("edge-color-hex8", "color", "#e76f5180", { color: "#e76f5180" }, ["edge.color"]),
            edge("edge-color-transparent", "color", "transparent", { color: "transparent" }, ["edge.color"]),
            ...[0, 0.5, 1, 3, 6, 10].map((s) =>
                edge(`edge-size-${String(s).replace(".", "-")}`, "size", s, { size: s }, ["edge.size"]),
            ),
            edge("edge-undirected", "undirected", true, {}, ["edge.key:undirected", "graph.type:mixed"], {
                undirected: true,
            }),
            edge("edge-hidden", "hidden", true, { hidden: true }, ["legacy.edge.hidden:true"]),
            edge("edge-visibility-hidden", "visibility", "hidden", { visibility: "hidden" }, [
                "display.edge.visibility:hidden",
            ]),
            edge("edge-opacity-0-3", "opacity", 0.3, { opacity: 0.3 }, ["display.edge.opacity:number"]),
            edge("edge-path-curved", "path", "curved", { path: "curved" }, ["display.edge.path:curved"]),
            ...LEGACY.edge.type.map((t) =>
                edge(`edge-type-${t.toLowerCase()}`, "type", t, { type: t }, [`legacy.edge.type:${t}`]),
            ),
            {
                id: "self-loop",
                caption: caption("self loop", "source = target"),
                covers: ["edge.path:loop", "graph.allowSelfLoops:true"],
                build: (c, g) => {
                    g.addNode("self-loop-n", { x: c.x, y: c.y, ...END_NODE, size: 8 });
                    g.addDirectedEdgeWithKey("self-loop", "self-loop-n", "self-loop-n", NEUTRAL_EDGE);
                },
            },
            {
                id: "parallel",
                caption: caption("parallel", "2 edges"),
                covers: ["graph.multi:true"],
                build: (c, g) => {
                    g.addNode("parallel-s", { x: c.source.x, y: c.source.y, ...END_NODE });
                    g.addNode("parallel-t", { x: c.target.x, y: c.target.y, ...END_NODE });
                    g.addDirectedEdgeWithKey("parallel-a", "parallel-s", "parallel-t", {
                        ...NEUTRAL_EDGE,
                        color: "#d62728",
                    });
                    g.addDirectedEdgeWithKey("parallel-b", "parallel-s", "parallel-t", {
                        ...NEUTRAL_EDGE,
                        color: "#1f77b4",
                    });
                },
            },
            {
                id: "reciprocal",
                caption: caption("reciprocal", "s->t, t->s"),
                covers: ["graph.multi:true"],
                build: (c, g) => {
                    g.addNode("reciprocal-s", { x: c.source.x, y: c.source.y, ...END_NODE });
                    g.addNode("reciprocal-t", { x: c.target.x, y: c.target.y, ...END_NODE });
                    g.addDirectedEdgeWithKey("reciprocal-a", "reciprocal-s", "reciprocal-t", {
                        ...NEUTRAL_EDGE,
                        color: "#d62728",
                    });
                    g.addDirectedEdgeWithKey("reciprocal-b", "reciprocal-t", "reciprocal-s", {
                        ...NEUTRAL_EDGE,
                        color: "#1f77b4",
                    });
                },
            },
            {
                // two crossing edges: the first added says zIndex 10 (red), the second zIndex 0 (blue)
                id: "edge-zindex",
                caption: caption("zIndex", "10 red, 0 blue"),
                covers: ["legacy.edge.zIndex:number"],
                build: (c, g) => {
                    const at = (k, dx, dy) => g.addNode(k, { x: c.x + dx, y: c.y + dy, ...END_NODE });
                    at("edge-zindex-a", -30, -25);
                    at("edge-zindex-b", 30, 25);
                    at("edge-zindex-c", -30, 25);
                    at("edge-zindex-d", 30, -25);
                    g.addDirectedEdgeWithKey("edge-zindex-10", "edge-zindex-a", "edge-zindex-b", {
                        size: 6,
                        color: "#d62728",
                        zIndex: 10,
                    });
                    g.addDirectedEdgeWithKey("edge-zindex-0", "edge-zindex-c", "edge-zindex-d", {
                        size: 6,
                        color: "#1f77b4",
                        zIndex: 0,
                    });
                },
            },
        ],
    },
    {
        // the color syntaxes of node-fills-borders and the size edge cases of node-sizes-opacity, on an edge: graph-io
        // reads an edge's keys on their own path, so each is drawn on an edge too
        id: "specimen-edges-lines-p2",
        specimens: [
            edge("default", "nothing", "set", {}, ["edge.color", "edge.size"], { neutral: {} }),
            ...[
                ["edge-color-name-mixed-case", "CornflowerBlue", "color.syntax:name-mixed-case"],
                ["edge-color-hex3", "#f80", "color.syntax:hex3"],
                ["edge-color-hex6-upper", "#E76F51", "color.syntax:hex6-upper"],
                ["edge-color-rgb", "rgb(106,76,147)", "color.syntax:rgb"],
                ["edge-color-rgba-zero", "rgba(0,128,0,0)", "color.syntax:rgba"],
                // what sigma's parser does not read: each is black (or garbled) in sigma
                ["edge-color-hex4", "#f80c", "color.syntax:hex3"],
                ["edge-color-rgb-spaces", "rgb( 25 , 130 , 196 )", "color.syntax:rgb"],
                ["edge-color-rgb-percent", "rgb(100%,50%,0%)", "color.syntax:rgb"],
                ["edge-color-hsl", "hsl(120,100%,25%)", "color.syntax:rgb"],
                ["edge-color-unknown-name", "notacolor", "color.syntax:name"],
                ["edge-color-empty", "", "edge.color"],
            ].map(([id, value, covers]) =>
                edge(id, "color", value, { color: value, size: 3 }, [covers, "edge.color"], {
                    neutral: { size: 3, color: N.edgeColor },
                }),
            ),
            edge("edge-size-negative", "size", -4, { size: -4 }, ["edge.size"]),
            edge("edge-size-string", "size", '"6"', { size: "6" }, ["edge.size"]),
            // graphology's serialization makes an edge's key optional (graph.import generates one); graph.export()
            // always writes it, so the key is taken off this edge after the export
            edge("edge-no-key", "key", "none", {}, ["edge.key:absent"]),
        ],
        stripKeys: ["edge-no-key"],
    },
    ...[
        ["specimen-arrows", "directed"],
        ["specimen-arrows-p2", "undirected"],
    ].map(([id, type]) => ({
        id,
        options: { type },
        specimens: [
            edge("default", "graph type", type, {}, [`graph.type:${type}`], {
                neutral: {},
                undirected: type === "undirected",
            }),
            edge("edge-plain", "graph type", type, {}, [`graph.type:${type}`], { undirected: type === "undirected" }),
            ...LEGACY.edge.type.map((t) =>
                edge(`edge-type-${t.toLowerCase()}`, "type", t, { type: t }, [`legacy.edge.type:${t}`], {
                    undirected: type === "undirected",
                }),
            ),
            edge("edge-size-6", "size", 6, { size: 6 }, ["edge.size"], { undirected: type === "undirected" }),
            edge("edge-head-arrow", "head", "arrow", { head: "arrow" }, ["display.edge.head:arrow"], {
                undirected: type === "undirected",
            }),
        ],
    })),
    ...[
        ["specimen-edge-labels", {}],
        ["specimen-edge-labels-p2", { renderEdgeLabels: true }],
        ["specimen-edge-labels-p3", { renderEdgeLabels: true, edgeLabelAnchors: "allNodes" }],
    ].map(([id, settings]) => ({
        id,
        file: "specimen-edge-labels",
        settings,
        labeled: true,
        specimens: [
            edge("default", "nothing", "set", {}, ["edge.label"], { neutral: {}, ends: 60 }),
            edge("edge-label-text", "label", "Text", { label: "Text" }, ["edge.label", "setting.renderEdgeLabels"], {
                ends: 60,
            }),
            edge("edge-label-long", "label", "long", { label: "A longer edge label" }, ["edge.label"], { ends: 60 }),
            edge("edge-label-empty", "label", '""', { label: "" }, ["edge.label"], { ends: 60 }),
            edge(
                "edge-label-colored",
                "label",
                "on red",
                { label: "Red edge", color: "red", size: 3 },
                ["edge.label"],
                {
                    ends: 60,
                },
            ),
            edge(
                "edge-force-label",
                "forceLabel",
                true,
                { label: "Forced", forceLabel: true },
                ["legacy.edge.forceLabel:true"],
                { ends: 60 },
            ),
            edge("edge-label-hidden", "hidden", true, { label: "Hidden", hidden: true }, ["legacy.edge.hidden:true"], {
                ends: 60,
            }),
            // unlabeled end nodes: no edge label under edgeLabelAnchors "nodeLabels", one under "allNodes"
            edge(
                "edge-label-unlabeled-ends",
                "label",
                "bare ends",
                { label: "Bare ends" },
                ["setting.edgeLabelAnchors"],
                { ends: 60, bare: true, endSize: CAPTION_SIZE },
            ),
        ],
    })),
    {
        id: "specimen-images-charts",
        specimens: [
            node("default", "nothing", "set", {}, [], {}),
            node("type-image-with-image", "type,image", "image,svg", { type: "image", image: IMG() }, [
                "legacy.node.type:image",
                "legacy.node.image:url",
            ]),
            node("image-without-type", "image", "svg", { image: IMG() }, ["legacy.node.image:url"]),
            node("type-image-without-image", "type", "image", { type: "image" }, ["legacy.node.type:image"]),
        ],
    },
];

/** A small self-contained image (an orange disc on a blue square), as a data URI. */
function IMG() {
    const svg =
        "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='32' height='32' fill='#1f77b4'/><circle cx='16' cy='16' r='10' fill='#ff7f0e'/></svg>";
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** What sigma.js 4.0.1 does with these sheets that its documentation does not say; graph-io must match each. */
const QUIRKS = [
    "sigma 4's default styles read only node x, y, size, color, label and edge size, color, label: node type, hidden, forceLabel, zIndex, highlighted, image and border attributes and edge type, hidden, forceLabel and zIndex (sigma v3's vocabulary) are ignored, and so are sigma 4's own display-data names stored as attributes (visibility, shape, opacity, labelColor, labelSize; edge visibility, opacity, path, head), so every node is a plain filled circle, hidden elements are drawn, z order is the order of the file, and no edge has an arrowhead or a curve, in a directed graph too",
    "every node competes in the label grid (one label per 100 px screen cell, the largest node's), labeled or not: an unlabeled node hides the label of a smaller node in its cell",
    "a node drawn smaller than 6 px shows no label (labelRenderedSizeThreshold)",
    "a label's newline (any ASCII whitespace: the canvas's text preparation) is drawn as a space, on one line; leading and trailing spaces are kept",
    "a node whose x or y is a string, even a numeric one, makes sigma throw while drawing",
    "a node's z (a 3D layout's), d3-force's simulation keys (index, vx, vy, fx, fy) and vis-network's physics are ignored: the file is drawn from x and y, y up",
    "a non-string label (a number or a boolean) or a non-string color (a number) makes sigma throw while drawing, so those specimens are not on the sheets",
    "colors: #rgb, #rrggbb, #rrggbbaa, rgb() and rgba() with integer channels, the 148 names of HTML_COLORS (any case) and transparent are read; rgb() with a space before ')', percent or decimal channels, hsl(), an unknown name and \"\" are drawn black; a 4-digit hex (#f80c) is read as #f80c00 (red)",
    "size is a radius in position units (itemSizesReference positions); 0 and negative sizes draw no node, but an edge of size 0 or below is drawn minEdgeThickness wide; a numeric string size is read as its number",
    "an edge without a key (graphology's serialization makes it optional) is drawn like any other, under the key graph.import generates",
    "edge sizes below 1.7 px are drawn 1.7 px wide (minEdgeThickness); parallel and reciprocal edges are drawn on top of each other (no parallel spread without a parallel path); a self loop is a small circle",
    "edge labels are drawn only with renderEdgeLabels on, over the line, clipped to the edge's length, and (edgeLabelAnchors nodeLabels) only where both end nodes show their labels; with edgeLabelAnchors allNodes also between unlabeled ends",
    "@sigma/export-image's temporary renderer reports 'Container has no width' once after the export when edge labels are on; the exported PNG is complete",
];

const ABSENT = {
    "specimen-groups": {
        reason: "graphology's serialization has nodes, edges and attributes only, and sigma.js draws no groups, clusters or compound nodes.",
        doc: DOC_SERIAL,
    },
    "specimen-mappings-bypass": {
        reason: "A graphology file carries each element's attributes only; sigma.js's styles and attribute bindings are code in the application, never part of the file, so there is no default, mapping or per-element layer to reach the same values another way.",
        doc: "https://www.sigmajs.org/concepts/styles-and-primitives/",
    },
};

// ------------------------------------------------------------------ the sigma label grid check

// Where sigma puts a sheet point in its label grid (null-camera viewport pixels): the anchors' box fitted to the canvas,
// centered, at the scale sigma 4.0.1 draws these sheets (anchor-nw at 40, 34.8 and anchor-se at 1160, 865.2 in every
// oracle's drawn record). sigma adds EVERY node to its grid, labeled or not (an unlabeled node's display label is ""),
// keeps the largest node of each 100 px cell, and draws that node's label only if it has one: an unlabeled node hides
// the label of any smaller node in its cell.
const AX = ANCHORS[0].x;
const AY = ANCHORS[0].y;
const AW = ANCHORS[1].x - AX;
const AH = ANCHORS[2].y - AY;
const K = 1120 / 1160;
const screen = (x, y) => ({
    x: layout.canvas.width / 2 + (x - AX - AW / 2) * K,
    y: layout.canvas.height / 2 + (y - AY - AH / 2) * K,
});
const cellOf = (x, y) => {
    const p = screen(x, y);
    const s = DEFAULT_SETTINGS.labelGridCellSize;
    return `${Math.floor(p.x / s)},${Math.floor(p.y / s)}`;
};
const textWidth = (t) => t.length * 6.8; // 12 px DejaVu Sans, an average glyph

// ------------------------------------------------------------------ write

mkdirSync(out, { recursive: true });
const pages = [];
const coverage = Object.fromEntries(ENTRIES.map((e) => [e, []]));
for (const sheet of SHEETS) {
    if (sheet.specimens.length > layout.maxSpecimens) throw new Error(`${sheet.id}: too many specimens`);
    const g = new Graph({ type: sheet.options?.type ?? "mixed", multi: true, allowSelfLoops: true });
    g.setAttribute("name", sheet.id);
    for (const a of ANCHORS) g.addNode(a.id, { x: a.x, y: a.y, size: a.size / 2, color: N.fill });
    const grid = cells(sheet.specimens.length, COLUMNS);
    const ids = new Set();
    sheet.specimens.forEach((sp, i) => {
        if (ids.has(sp.id)) throw new Error(`${sheet.id}: two specimens ${sp.id}`);
        ids.add(sp.id);
        sp.build(grid[i], g);
        for (const k of sp.covers) {
            if (!(k in coverage)) throw new Error(`${sheet.id} ${sp.id}: covers unknown entry ${k}`);
            if (coverage[k].length < 6) coverage[k].push(`${sheet.id}#${sp.id}`);
        }
    });
    // every labeled specimen node is the largest node of its grid cell (else sigma shows another node's label, or
    // none, there), except the specimens that show the grid itself
    const allowed = new Set(sheet.specimens.flatMap((s) => s.gridCollision ?? []));
    const byCell = new Map();
    g.forEachNode((key, a) => {
        const cell = cellOf(a.x, a.y);
        byCell.set(cell, [
            ...(byCell.get(cell) ?? []),
            { key, size: a.size ?? 10, labeled: typeof a.label === "string" && a.label !== "" },
        ]);
    });
    for (const [cell, list] of byCell) {
        for (const n of list.filter((m) => m.labeled && !allowed.has(m.key))) {
            const rival = list.find((m) => m !== n && (m.size >= n.size || m.labeled));
            if (rival) throw new Error(`${sheet.id}: ${n.key} shares sigma label grid cell ${cell} with ${rival.key}`);
        }
    }
    // each caption below its specimen, moved down or above where its cell holds a labeled node or one as large as the
    // caption's; its label starts right of its node (labelPosition "right"), so the node sits half the text's width
    // left of center
    const free = (cell) => !(byCell.get(cell) ?? []).some((m) => m.labeled || m.size >= CAPTION_SIZE);
    sheet.specimens.forEach((sp, i) => {
        const c = grid[i];
        const x0 = c.caption.x - textWidth(sp.caption) / 2 - CAPTION_SIZE;
        const tries = [0, 18, 32, -2 * layout.captionDy].flatMap((dy) => [0, -30, 30, -60].map((dx) => [dx, dy]));
        const at = tries.find(([dx, dy]) => free(cellOf(x0 + dx, c.caption.y + dy)));
        if (at === undefined) throw new Error(`${sheet.id}: no free label grid cell for cap-${sp.id}`);
        const x = x0 + at[0];
        const y = c.caption.y + at[1];
        byCell.set(cellOf(x, y), [{ key: `cap-${sp.id}`, size: CAPTION_SIZE, labeled: true }]);
        g.addNode(`cap-${sp.id}`, { x, y, size: CAPTION_SIZE, color: "transparent", label: sp.caption });
    });
    // sheet y down -> graphology / sigma y up
    g.updateEachNodeAttributes((_, a) => ({ ...a, y: layout.canvas.height - a.y }));
    const file = `${sheet.file ?? sheet.id}.json`;
    if (!sheet.file || sheet.file === sheet.id) {
        const doc = g.export();
        for (const e of doc.edges) if (sheet.stripKeys?.includes(e.key)) delete e.key;
        writeFileSync(join(out, file), `${JSON.stringify(doc, null, 4)}\n`);
    }
    pages.push({ id: sheet.id, file, settings: sheet.settings ?? {}, specimens: sheet.specimens.length });
}
writeFileSync(
    join(out, "pages.json"),
    `${JSON.stringify(
        {
            about: "The graphology specimen pages: each sheet file drawn by sigma.js with its default settings plus `settings` (a sigma setting is the application's, never part of the file, so a page that varies one shares its first page's file). Written by graph-io/test/fidelity/generators/specimens/graphology.mjs.",
            pages,
            absent: ABSENT,
            quirks: QUIRKS,
        },
        null,
        4,
    )}\n`,
);

const missing = ENTRIES.filter((e) => coverage[e].length === 0 && !NOT_DRAWN[e]);
if (missing.length) throw new Error(`graphology.mjs: no specimen and no NOT_DRAWN reason for ${missing.join(", ")}`);
writeFileSync(
    COVERAGE,
    `${JSON.stringify(
        {
            program,
            about: "Which specimen draws each entry of graphology-vocabulary.json and graphology.mjs's fixed lists (at most six named each), or why none does; written by graphology.mjs.",
            entries: ENTRIES.length,
            covered: ENTRIES.filter((e) => coverage[e].length > 0).length,
            sheets: pages.map((p) => ({ id: p.id, specimens: p.specimens })),
            coverage: Object.fromEntries(
                ENTRIES.map((e) => [e, coverage[e].length ? coverage[e] : { notDrawn: NOT_DRAWN[e] }]),
            ),
        },
        null,
        4,
    )}\n`,
);
// in the repository's JSON style, so the committed bytes (which the oracles' fileSha256 names) stay as written here
execFileSync(
    "npx",
    [
        "prettier",
        "--write",
        "--log-level",
        "warn",
        VOCAB,
        COVERAGE,
        join(out, "pages.json"),
        ...new Set(pages.map((p) => join(out, p.file))),
    ],
    { stdio: "inherit" },
);
console.log(`graphology.mjs: ${pages.length} pages, ${ENTRIES.length} vocabulary entries (${missing.length} missing)`);
