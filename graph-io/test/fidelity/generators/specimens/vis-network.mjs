#!/usr/bin/env node
// The vis-network specimen sheets (vis-network family): one `{ nodes, edges, options }` document per sheet page in
// graph-io/test/fidelity/specimens/vis-network/, and the vocabulary they cover.
//
//   node vis-network.mjs               write every sheet and vis-network-coverage.json
//   node vis-network.mjs --vocabulary  rewrite vis-network-vocabulary.json from the live option table first
//
// The vocabulary is vis-network's own option table (`networkOptions.allOptions`, the table its option validator
// checks every option against: each node, edge and group option, its accepted types and its enumerated values),
// read from the pinned vis-network 9.1.9 of graph-io's devDependencies on every run and compared with
// vis-network-vocabulary.json beside this script: an option or value that appears or disappears in a new version
// fails the run until --vocabulary rewrites the file. Options the table types only as "string" but whose values the
// documentation lists (node font.align, heightConstraint.valign, font.multi) are added from DOC_VALUES. Every
// option, and every enumerated value, has a specimen or a NOT_DRAWN reason, or the run fails.
//
// vis-network has no file writer: a vis-network document is the `{ nodes, edges, options }` a page hands to
// `new vis.Network(container, { nodes, edges }, options)`, so the sheets are written here per its documentation
// (https://visjs.github.io/vis-network/docs/network/). Every sheet turns physics off (`options.physics: false`) and
// stores every node's x and y, so vis-network draws the nodes where the file puts them. Each specimen node or edge
// carries the neutral baseline of sheet-layout.json explicitly (NODE_BASE, EDGE_BASE) with its one setting on top;
// the `default` specimens set nothing at all. The mappings-bypass sheet reaches the same values through the global
// `options.nodes` / `options.edges`, through `options.groups`, and per element.
import { execFileSync } from "node:child_process";
import console from "node:console";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { ANCHORS, caption, cells, layout } from "../sheet-layout.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../specimens/vis-network");
const VOCAB = join(here, "vis-network-vocabulary.json");
const COVERAGE = join(here, "vis-network-coverage.json");
const PINNED = "9.1.9";
const web = resolve(here, "../../../../node_modules/vis-network"); // pinned in graph-io's devDependencies
const version = JSON.parse(readFileSync(join(web, "package.json"), "utf8")).version;
if (version !== PINNED) throw new Error(`vis-network.mjs: vis-network ${version}, the sheets are made with ${PINNED}`);
const { networkOptions } = await import(pathToFileURL(join(web, "standalone/esm/vis-network.js")).href);
const N = layout.neutral;
const DOC = "https://visjs.github.io/vis-network/docs/network/";

// ------------------------------------------------------------------ the vocabulary, from the live option table

/**
 * Every option under `tree` as { path, types, enums? }; an object option is listed itself (with the non-object
 * types it also accepts, such as `color` as a string or `shadow` as a boolean) and then its fields.
 * @param tree - an allOptions subtree
 * @param prefix - its dotted path
 * @returns the options
 */
function flatten(tree, prefix) {
    const list = [];
    for (const [k, v] of Object.entries(tree)) {
        if (k === "__type__" || k === "__any__") continue;
        const path = `${prefix}.${k}`;
        const leaf = !("__type__" in v);
        const spec = leaf ? v : v.__type__;
        const types = Object.keys(spec).filter((t) => !(leaf ? false : t === "object"));
        const enums = Object.values(spec).find(Array.isArray);
        list.push({ path, types: leaf ? Object.keys(spec) : types, ...(enums ? { enums } : {}) });
        if (!leaf) list.push(...flatten(v, path));
    }
    return list;
}
/** Values the documentation lists for options the table types only as "string" or "boolean". */
const DOC_VALUES = {
    "nodes.font.align": ["center", "left", "right"],
    "nodes.heightConstraint.valign": ["top", "middle", "bottom"],
    "nodes.font.multi": ["false", "true", "html", "markdown"],
    "edges.font.multi": ["false", "true", "html", "markdown"],
};
function liveVocabulary() {
    const o = networkOptions.allOptions;
    const list = [
        ...flatten(o.nodes, "nodes"),
        ...flatten(o.edges, "edges"),
        { path: "groups.useDefaultGroups", types: Object.keys(o.groups.useDefaultGroups) },
        {
            path: "groups.<name>",
            types: ["object"],
            about: "a group: any node option, applied to nodes with group <name>",
        },
        ...Object.keys(o)
            .filter((k) => !["nodes", "edges", "groups", "__type__"].includes(k))
            .map((k) => ({ path: k, types: Object.keys(o[k].__type__ ?? o[k]) })),
    ];
    for (const p of list) if (DOC_VALUES[p.path]) p.docValues = DOC_VALUES[p.path];
    return list;
}
const live = liveVocabulary();
if (process.argv.includes("--vocabulary")) {
    writeFileSync(
        VOCAB,
        `${JSON.stringify(
            {
                about: "vis-network's option vocabulary: every node, edge and group option of networkOptions.allOptions (the table its option validator checks options against), the types it accepts and its enumerated values, plus the top-level option groups; read from the pinned vis-network by vis-network.mjs --vocabulary. docValues are values the documentation lists for an option the table types only as a string. vis-network.mjs fails when the live table differs, so a new version shows up as a new or missing specimen.",
                program: `vis-network ${version}`,
                doc: DOC,
                options: live,
            },
            null,
            4,
        )}\n`,
    );
}
const vocabulary = JSON.parse(readFileSync(VOCAB, "utf8"));
if (JSON.stringify(vocabulary.options) !== JSON.stringify(live)) {
    throw new Error(
        "vis-network.mjs: vis-network's option table differs from vis-network-vocabulary.json; run with --vocabulary, then give every new option or value a specimen (or a NOT_DRAWN reason)",
    );
}

/** Options or values a still drawing of a document cannot show, and why. Key: a path, or `path=value`. */
const NOT_DRAWN = {
    "nodes.borderWidthSelected": "selection only: the border width of a selected node",
    "nodes.chosen": "interaction only: how a node changes when selected or hovered (a boolean or a function)",
    "nodes.chosen.label": "interaction only",
    "nodes.chosen.node": "interaction only",
    "nodes.color.highlight": "selection only: the colors of a selected node",
    "nodes.color.highlight.border": "selection only",
    "nodes.color.highlight.background": "selection only",
    "nodes.color.hover": "hover only: the colors of a node under the pointer",
    "nodes.color.hover.border": "hover only",
    "nodes.color.hover.background": "hover only",
    "nodes.fixed": "physics only: whether the simulation may move the node",
    "nodes.fixed.x": "physics only",
    "nodes.fixed.y": "physics only",
    "nodes.id": "structural: the node's id (every specimen has one; ids are the specimen ids)",
    "nodes.image.selected": "selection only: the image of a selected node",
    "nodes.labelHighlightBold": "selection only: a selected node's label turns bold",
    "nodes.level":
        "hierarchical layout only: the level a hierarchical layout puts the node on; the sheets store positions",
    "nodes.mass": "physics only",
    "nodes.physics": "physics only",
    "nodes.title": "tooltip only: HTML shown on hover",
    "nodes.ctxRenderer":
        "a JavaScript function (the custom shape's renderer); a document cannot hold one, so a file cannot draw it",
    "nodes.shape=custom": "draws with nodes.ctxRenderer, a function a document cannot hold",
    "nodes.scaling.customScalingFunction": "a JavaScript function; a document cannot hold one",
    "nodes.x": "position: every specimen stores one (covered by every sheet)",
    "nodes.y": "position: every specimen stores one (covered by every sheet)",
    "edges.chosen": "interaction only: how an edge changes when selected or hovered",
    "edges.chosen.label": "interaction only",
    "edges.chosen.edge": "interaction only",
    "edges.color.highlight": "selection only: the color of a selected edge",
    "edges.color.hover": "hover only: the color of an edge under the pointer",
    "edges.hoverWidth": "hover only: extra width under the pointer",
    "edges.labelHighlightBold": "selection only: a selected edge's label turns bold",
    "edges.length": "physics only: the spring length",
    "edges.physics": "physics only",
    "edges.selectionWidth": "selection only: extra width of a selected edge",
    "edges.title": "tooltip only",
    "edges.scaling.customScalingFunction": "a JavaScript function; a document cannot hold one",
    configure: "DOM only: the option editor vis-network builds next to the canvas",
    interaction: "interaction only (drag, zoom, hover, navigation buttons as DOM elements, keyboard, tooltips)",
    layout: "layout only: the sheets store positions and turn physics off (a hierarchical layout would move them)",
    manipulation: "DOM only: the edit toolbar",
    physics: "physics only; every sheet sets physics: false so the stored positions stand",
    autoResize: "DOM only: whether the canvas follows its container's size",
    clickToUse: "interaction only",
    locale: "DOM only: the language of the edit toolbar",
    locales: "DOM only: the edit toolbar's strings",
    height: "DOM only: the canvas element's CSS height (the oracle draws 1200 x 900)",
    width: "DOM only: the canvas element's CSS width (the oracle draws 1200 x 900)",
};

// ------------------------------------------------------------------ images (data URIs, so the file is self-contained)

const svgUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
/** Four colored quadrants, 24 x 24: where the image sits and how it is cut shows. */
const QUADRANTS = svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="12" height="12" fill="#e41a1c"/><rect x="12" width="12" height="12" fill="#377eb8"/><rect y="12" width="12" height="12" fill="#4daf4a"/><rect x="12" y="12" width="12" height="12" fill="#ffd700"/></svg>`,
);
/** A 48 x 24 wide image: its own aspect ratio and size show. */
const WIDE = svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="24" viewBox="0 0 48 24"><rect width="24" height="24" fill="#984ea3"/><rect x="24" width="24" height="24" fill="#ff7f00"/></svg>`,
);
/** A 4 x 4 checkerboard: smoothing (interpolation) shows when it is drawn large. */
const CHECKER = svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4" shape-rendering="crispEdges"><rect width="4" height="4" fill="#ffffff"/><rect width="2" height="2" fill="#000000"/><rect x="2" y="2" width="2" height="2" fill="#000000"/></svg>`,
);
/** A small arrowhead image for an image arrow, pointing right. */
const ARROW_IMG = svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M0 0 L16 8 L0 16 Z" fill="#d62728"/></svg>`,
);
/** Not an image: loading it fails, so brokenImage is drawn. */
const BROKEN = "data:image/png;base64,AAAA";

// ------------------------------------------------------------------ the neutral baseline

const FONT = { size: N.fontSize, face: N.fontFamily, color: N.labelColor, strokeWidth: 0, background: "none" };
const NODE_BASE = {
    shape: "dot",
    size: N.size / 2,
    color: { background: N.fill, border: N.border },
    borderWidth: N.borderWidth,
    opacity: 1,
    shadow: false,
    font: FONT,
};
const EDGE_BASE = {
    color: { color: N.edgeColor, inherit: false, opacity: 1 },
    width: N.edgeWidth,
    dashes: false,
    smooth: { enabled: false },
    arrows: { to: { enabled: false }, middle: { enabled: false }, from: { enabled: false } },
    shadow: false,
    font: { ...FONT, align: "horizontal" },
};
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
/**
 * `over` on top of `base`: objects merge, anything else replaces.
 * @param base - the baseline
 * @param over - the setting
 * @returns the merged options
 */
function merge(base, over) {
    const o = { ...base };
    for (const [k, v] of Object.entries(over ?? {})) o[k] = isObj(v) && isObj(base?.[k]) ? merge(base[k], v) : v;
    return o;
}
/**
 * `base` without the keys `drop` names (dotted), so a group or the global options can supply them.
 * @param base - the baseline
 * @param drop - dotted paths
 * @returns the baseline without them
 */
function without(base, drop = []) {
    const o = structuredClone(base);
    for (const p of drop) {
        const keys = p.split(".");
        const last = keys.pop();
        let at = o;
        for (const k of keys) at = at?.[k];
        if (at) delete at[last];
    }
    return o;
}

// ------------------------------------------------------------------ specimen builders

/** A node specimen: `set` on the neutral node; o.omit: baseline paths left out; o.raw: no baseline at all. */
const node = (id, set, o = {}) => ({ kind: "node", id, set, ...o });
/** An edge specimen between `<id>-s` and `<id>-t`. o.ends: options for both ends; o.dy: target lower by dy; o.parallel. */
const edge = (id, set, o = {}) => ({ kind: "edge", id, set, ...o });
/** A self loop on `<id>-s`. */
const loop = (id, set, o = {}) => ({ kind: "loop", id, set, ...o });

/** The last dotted leaf of an options object, and its value: the setting (a label or shape before it is a prerequisite). */
function lastLeaf(set, prefix = "") {
    for (const [k, v] of Object.entries(set ?? {}).reverse()) {
        if (isObj(v)) {
            const r = lastLeaf(v, `${prefix}${k}.`);
            if (r) return r;
        } else return [`${prefix}${k}`, v];
    }
    return undefined;
}
/**
 * The text under a specimen: its key setting.
 * @param s - the specimen
 * @returns the caption
 */
function captionOf(s) {
    if (s.cap) return s.cap;
    if (s.id === "default") return "default";
    const [k, v] = lastLeaf(s.set) ?? ["", ""];
    return caption(
        k,
        Array.isArray(v) ? `[${v.join(",")}]` : typeof v === "string" && v.startsWith("data:") ? "<image>" : v,
    );
}

const nodeAt = (id, x, y, set) => ({ id, x, y, ...set });
/** How far a node whose label vis-network draws below it is lifted, so the label clears the caption. */
const LIFT = 34;
/** Shapes vis-network draws their label inside. */
const LABEL_INSIDE = ["ellipse", "circle", "database", "box", "text"];
const labelBelow = (o) => o.label !== undefined && !LABEL_INSIDE.includes(o.shape ?? "ellipse");
const END = merge(NODE_BASE, { size: 4 });

/**
 * The nodes and edges of one sheet page.
 * @param specs - the page's specimens
 * @returns { nodes, edges }
 */
function place(specs) {
    const nodes = [];
    const edges = [];
    for (const a of ANCHORS) nodes.push(nodeAt(a.id, a.x, a.y, merge(NODE_BASE, { size: a.size / 2 })));
    cells(specs.length).forEach((c, i) => {
        const s = specs[i];
        nodes.push(
            nodeAt(`cap-${s.id}`, c.caption.x, c.caption.y, {
                shape: "text",
                label: captionOf(s),
                font: { ...FONT, size: layout.captionFontSize },
                widthConstraint: { maximum: 104 },
            }),
        );
        const own = s.id === "default" || s.raw ? (s.set ?? {}) : null;
        if (s.kind === "node") {
            const opts = own ?? merge(without(NODE_BASE, s.omit), s.set);
            nodes.push(nodeAt(s.id, c.x + (s.dx ?? 0), c.y + (s.dy ?? (labelBelow(opts) ? -LIFT : 0)), opts));
            for (const [k, o] of (s.others ?? []).entries()) {
                nodes.push(
                    nodeAt(`${s.id}-o${k + 1}`, c.x + o.dx, c.y + o.dy, merge(without(NODE_BASE, o.omit), o.set)),
                );
            }
        } else if (s.kind === "edge") {
            const dy = s.dy ?? 0;
            // an end in a group leaves its color to the group
            const ends = merge(s.ends?.group === undefined ? END : without(END, ["color"]), s.ends);
            nodes.push(nodeAt(`${s.id}-s`, c.source.x, c.source.y - dy / 2, ends));
            nodes.push(nodeAt(`${s.id}-t`, c.target.x, c.target.y + dy / 2, merge(ends, s.targetEnd)));
            const ids = [s.id, ...Array.from({ length: (s.parallel ?? 1) - 1 }, (_, k) => `${s.id}-${k + 2}`)];
            for (const e of ids) {
                edges.push({
                    id: e,
                    from: `${s.id}-s`,
                    to: `${s.id}-t`,
                    ...(own ?? merge(without(EDGE_BASE, s.omit), s.set)),
                });
            }
        } else if (s.kind === "loop") {
            nodes.push(nodeAt(`${s.id}-s`, c.x, c.y + 10, merge(NODE_BASE, { size: 8 })));
            edges.push({ id: s.id, from: `${s.id}-s`, to: `${s.id}-s`, ...merge(without(EDGE_BASE, s.omit), s.set) });
        }
    });
    return { nodes, edges };
}

// ------------------------------------------------------------------ the sheets

const vocab = Object.fromEntries(vocabulary.options.map((p) => [p.path, p]));
const E = (path) => vocab[path].enums ?? vocab[path].docValues;
const slug = (v) =>
    String(v)
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
const IMAGE_SHAPES = { image: { image: QUADRANTS }, circularImage: { image: QUADRANTS } };
const ICON = { face: N.fontFamily, code: "A", size: 30, color: "#1f77b4" };

/** The multi-font modifiers and a label that uses each. */
const MULTI_TEXT = [
    ["bold", "<b>B</b> x"],
    ["ital", "<i>I</i> x"],
    ["boldital", "<b><i>BI</i></b> x"],
    ["mono", "<code>M</code> x"],
];

const SHEETS = {
    "specimen-node-shapes": [
        node("default", {}),
        ...E("nodes.shape")
            .filter((v) => v !== "custom")
            .map((v) =>
                node(`shape-${slug(v)}`, {
                    ...(IMAGE_SHAPES[v] ?? {}),
                    ...(v === "icon" ? { icon: ICON } : {}),
                    shape: v,
                }),
            ),
        ...LABEL_INSIDE.map((v) =>
            node(`shape-${slug(v)}-label`, { shape: v, label: "Label" }, { cap: `shape=${v} label=Label` }),
        ),
        ...["dot", "square", "star", "triangle", "diamond", "hexagon", "triangleDown"].map((v) =>
            node(`shape-${slug(v)}-label-below`, { shape: v, label: "Label" }, { cap: `shape=${v} label=Label` }),
        ),
        node(
            "border-radius-0",
            { shape: "box", label: "Box", shapeProperties: { borderRadius: 0 } },
            { cap: "borderRadius=0" },
        ),
        node(
            "border-radius-12",
            { shape: "box", label: "Box", shapeProperties: { borderRadius: 12 } },
            { cap: "borderRadius=12" },
        ),
        node("shape-box-multiline", { shape: "box", label: "Two\nlines" }, { cap: "shape=box label=Two\\nlines" }),
        node("shape-circle-long", { shape: "circle", label: "Longer" }, { cap: "shape=circle label=Longer" }),
        node("shape-ellipse-long", { shape: "ellipse", label: "A longer label" }, { cap: "shape=ellipse long label" }),
        node("shape-database-long", { shape: "database", label: "Database" }, { cap: "shape=database label" }),
    ],
    "specimen-node-fills-borders": [
        node("default", {}),
        node("color-hex", { color: "#1f77b4" }),
        node("color-hex-short", { color: "#f80" }),
        node("color-rgb", { color: "rgb(44,160,44)" }),
        node("color-rgba", { color: "rgba(214,39,40,0.5)" }),
        node("color-named", { color: "purple" }),
        node("color-hex-alpha", { color: "#1f77b480" }),
        node("color-hsl", { color: "hsl(30,100%,50%)" }),
        node("color-background", { color: { background: "#ff7f0e" } }),
        node("color-border", { color: { border: "#d62728" } }),
        node(
            "color-background-border",
            { color: { background: "#9467bd", border: "#2ca02c" } },
            { cap: "color={background,border}" },
        ),
        node("color-on-box", { shape: "box", label: "Box", color: "#17becf" }, { cap: "shape=box color=#17becf" }),
        node(
            "color-on-ellipse",
            { shape: "ellipse", label: "Ell", color: { background: "#bcbd22" } },
            { cap: "shape=ellipse background" },
        ),
        node("color-on-star", { shape: "star", color: { background: "#e377c2" } }, { cap: "shape=star background" }),
        ...[0, 2, 4, 8].map((w) => node(`border-width-${w}`, { borderWidth: w })),
        node("border-width-4-box", { shape: "box", label: "Box", borderWidth: 4 }, { cap: "shape=box borderWidth=4" }),
        node("border-width-4-square", { shape: "square", borderWidth: 4 }, { cap: "shape=square borderWidth=4" }),
        node(
            "border-dashes-true",
            { borderWidth: 2, shapeProperties: { borderDashes: true } },
            { cap: "borderDashes=true" },
        ),
        node(
            "border-dashes-array",
            { borderWidth: 2, shapeProperties: { borderDashes: [8, 3] } },
            { cap: "borderDashes=[8,3]" },
        ),
        node(
            "border-dashes-dots",
            { borderWidth: 2, shapeProperties: { borderDashes: [2, 2] } },
            { cap: "borderDashes=[2,2]" },
        ),
        node(
            "border-dashes-box",
            { shape: "box", label: "Box", borderWidth: 2, shapeProperties: { borderDashes: [5, 5] } },
            { cap: "shape=box borderDashes=[5,5]" },
        ),
        node("shadow-true", { shadow: true }),
        node("shadow-color", { shadow: { enabled: true, color: "#d62728" } }, { cap: "shadow.color=#d62728" }),
        node("shadow-size-20", { shadow: { enabled: true, size: 20 } }, { cap: "shadow.size=20" }),
        node("shadow-offset", { shadow: { enabled: true, x: 10, y: -10 } }, { cap: "shadow.x=10 y=-10" }),
        node("shadow-box", { shape: "box", label: "Box", shadow: true }, { cap: "shape=box shadow=true" }),
        node("color-transparent", { color: { background: "rgba(0,0,0,0)" } }, { cap: "background=transparent" }),
    ],
    "specimen-node-sizes-opacity": [
        node("default", {}),
        ...[5, 10, 25, 40].map((v) => node(`size-${v}`, { size: v }, v === 40 ? { dy: -22 } : {})),
        node("size-30-square", { shape: "square", size: 30 }, { dy: -12, cap: "shape=square size=30" }),
        node("size-30-star", { shape: "star", size: 30 }, { cap: "shape=star size=30" }),
        node("size-30-box", { shape: "box", label: "Box", size: 30 }, { cap: "shape=box size=30 (ignored)" }),
        node("size-30-circle", { shape: "circle", label: "C", size: 30 }, { cap: "shape=circle size=30" }),
        ...[1, 4, 7, 10].map((v) => node(`value-${v}`, { value: v }, { cap: `value=${v} (of 1..10)` })),
        node("scaling-min-max", { value: 7, scaling: { min: 2, max: 50 } }, { dy: -20, cap: "value=7 scaling 2..50" }),
        node(
            "scaling-label",
            { value: 10, label: "Scaled", scaling: { label: { enabled: true, min: 8, max: 24 } } },
            { dy: -56, cap: "scaling.label 8..24 value=10" },
        ),
        node("scaling-box", { shape: "box", label: "Box", value: 10 }, { cap: "shape=box value=10" }),
        ...[0, 0.25, 0.5, 0.75, 1].map((v) => node(`opacity-${slug(v)}`, { opacity: v })),
        node("opacity-box", { shape: "box", label: "Box", opacity: 0.4 }, { cap: "shape=box opacity=0.4" }),
        node("color-alpha", { color: { background: "rgba(31,119,180,0.3)" } }, { cap: "background alpha 0.3" }),
        node("hidden-true", { hidden: true }),
        node(
            "width-constraint-min",
            { shape: "box", label: "W", widthConstraint: { minimum: 80 } },
            { cap: "widthConstraint.minimum=80" },
        ),
        node(
            "width-constraint-number",
            { shape: "box", label: "W", widthConstraint: 60 },
            { cap: "widthConstraint=60" },
        ),
        node(
            "width-constraint-max",
            { shape: "box", label: "a long box label", widthConstraint: { maximum: 50 } },
            { cap: "widthConstraint.maximum=50" },
        ),
        node(
            "height-constraint-min",
            { shape: "box", label: "H", heightConstraint: { minimum: 50 } },
            { dy: -10, cap: "heightConstraint.minimum=50" },
        ),
        node(
            "height-constraint-number",
            { shape: "box", label: "H", heightConstraint: 40 },
            { cap: "heightConstraint=40" },
        ),
        ...E("nodes.heightConstraint.valign").map((v) =>
            node(
                `valign-${v}`,
                { shape: "box", label: "V", heightConstraint: { minimum: 56, valign: v } },
                { dy: -12, cap: `heightConstraint.valign=${v}` },
            ),
        ),
        node("margin-0", { shape: "box", label: "M", margin: 0 }),
        node("margin-15", { shape: "box", label: "M", margin: 15 }),
        node(
            "margin-sides",
            { shape: "box", label: "M", margin: { top: 2, right: 20, bottom: 12, left: 4 } },
            { cap: "margin={2,20,12,4}" },
        ),
        node("size-30-diamond", { shape: "diamond", size: 30 }, { dy: -12, cap: "shape=diamond size=30" }),
        node("size-30-triangle", { shape: "triangle", size: 30 }, { dy: -12, cap: "shape=triangle size=30" }),
        node("size-30-database", { shape: "database", label: "D", size: 30 }, { cap: "shape=database size=30" }),
    ],
    "specimen-labels": [
        node("default", {}, { set: { label: "Label" }, raw: true, cap: "label only" }),
        node("label-dot", { label: "Below" }, { cap: "label (dot: below)" }),
        node("label-box", { shape: "box", label: "Inside" }, { cap: "label (box: inside)" }),
        node("label-multiline", { shape: "box", label: "One\nTwo\nThree" }, { cap: "label with \\n" }),
        ...[3, 6, 14, 20, 40].map((v) => node(`font-size-${v}`, { label: "Aa", font: { size: v } })),
        ...["DejaVu Serif", "DejaVu Sans Mono", "Liberation Sans", "arial"].map((v) =>
            node(`font-face-${slug(v)}`, { label: "Face", font: { face: v } }),
        ),
        node("font-color", { label: "Color", font: { color: "#d62728" } }),
        node("font-background", { label: "Back", font: { background: "#ffd700" } }),
        node(
            "font-stroke",
            { label: "Stroke", font: { strokeWidth: 3, strokeColor: "#ff7f0e" } },
            { cap: "font.strokeWidth=3 strokeColor" },
        ),
        node("font-stroke-default-color", { label: "Stroke", font: { strokeWidth: 3 } }, { cap: "font.strokeWidth=3" }),
        node("font-vadjust-neg", { label: "Up", font: { vadjust: -12 } }),
        node("font-vadjust-pos", { label: "Down", font: { vadjust: 12 } }),
        ...E("nodes.font.align").map((v) =>
            node(
                `font-align-${v}`,
                { shape: "box", label: "wide line\nab", font: { align: v } },
                { cap: `font.align=${v}` },
            ),
        ),
        // vis-network splits the shorthand on single spaces into size, face and color, so the face is one word: with a
        // two-word face the third word is an invalid color, which the canvas ignores, keeping the previous label's
        // color, so that drawing depends on draw order and has no specimen (ISSUES.md, vis-network)
        node("font-shorthand", { label: "Short", font: "18px arial #2ca02c" }, { cap: "font=18px arial green" }),
        node("font-multi-true", { label: "<b>Bold</b> plain", font: { multi: true } }, { cap: "font.multi=true" }),
        node(
            "font-multi-html",
            { label: "<b>B</b> <i>I</i> <code>M</code>", font: { multi: "html" } },
            { cap: "font.multi=html" },
        ),
        node(
            "font-multi-markdown",
            { label: "*B* _I_ `M`", font: { multi: "markdown" } },
            { cap: "font.multi=markdown" },
        ),
        node(
            "font-multi-boldital",
            { label: "<b><i>BI</i></b> x", font: { multi: "html" } },
            { cap: "multi=html bold+ital" },
        ),
        node("font-multi-false", { label: "<b>raw</b>", font: { multi: false } }, { cap: "font.multi=false" }),
        ...["bold", "ital", "boldital", "mono"].flatMap((m) => {
            const text = {
                bold: "<b>B</b> x",
                ital: "<i>I</i> x",
                boldital: "<b><i>BI</i></b> x",
                mono: "<code>M</code> x",
            }[m];
            return [
                node(
                    `font-${m}-color`,
                    { label: text, font: { multi: "html", [m]: { color: "#d62728" } } },
                    { cap: `font.${m}.color` },
                ),
                node(
                    `font-${m}-size`,
                    { label: text, font: { multi: "html", [m]: { size: 16 } } },
                    { cap: `font.${m}.size=16` },
                ),
                node(
                    `font-${m}-face`,
                    { label: text, font: { multi: "html", [m]: { face: "DejaVu Serif" } } },
                    { cap: `font.${m}.face=Serif` },
                ),
                node(
                    `font-${m}-mod`,
                    { label: text, font: { multi: "html", [m]: { mod: "" } } },
                    { cap: `font.${m}.mod=""` },
                ),
                node(
                    `font-${m}-vadjust`,
                    { label: text, font: { multi: "html", [m]: { vadjust: 6 } } },
                    { cap: `font.${m}.vadjust=6` },
                ),
            ];
        }),
        node(
            "font-bold-shorthand",
            { label: "<b>B</b> x", font: { multi: "html", bold: "18px arial #2ca02c" } },
            { cap: "font.bold=18px arial green" },
        ),
        node(
            "label-wrap",
            { label: "wraps at the width", widthConstraint: { maximum: 60 } },
            { cap: "widthConstraint.maximum=60" },
        ),
        node(
            "draw-threshold",
            { label: "Hidden?", font: { size: 8 }, scaling: { label: { drawThreshold: 12 } } },
            { cap: "drawThreshold=12 size=8" },
        ),
        node(
            "max-visible",
            { label: "Cap", font: { size: 30 }, scaling: { label: { maxVisible: 12 } } },
            { cap: "maxVisible=12 size=30" },
        ),
        node("label-diamond", { shape: "diamond", label: "Below" }, { cap: "shape=diamond label" }),
        node("label-image", { shape: "image", image: QUADRANTS, label: "Below" }, { cap: "shape=image label" }),
        node("label-icon", { shape: "icon", icon: ICON, label: "Below" }, { cap: "shape=icon label" }),
        node("label-text-shape", { shape: "text", label: "Text only" }, { cap: "shape=text label" }),
        // a shape that holds its label grows with the font
        node("font-size-24-box", { shape: "box", label: "Big", font: { size: 24 } }, { cap: "shape=box font.size=24" }),
    ],
    "specimen-edges-lines": [
        edge("default", {}),
        edge("color-hex", { color: "#1f77b4" }),
        edge("color-rgb", { color: "rgb(44,160,44)" }),
        edge("color-rgba", { color: "rgba(214,39,40,0.5)" }),
        edge("color-named", { color: "purple" }),
        edge("color-object", { color: { color: "#ff7f0e" } }),
        edge("color-opacity", { color: { opacity: 0.3 } }),
        ...E("edges.color.inherit")
            .concat([true, false])
            .map((v) =>
                edge(
                    `inherit-${slug(v)}`,
                    { color: { inherit: v } },
                    {
                        ends: { color: { background: "#1f77b4", border: "#1f77b4" } },
                        targetEnd: { color: { background: "#d62728", border: "#d62728" } },
                        omit: ["color.color"],
                    },
                ),
            ),
        edge(
            "inherit-default",
            {},
            {
                omit: ["color"],
                ends: { color: { background: "#1f77b4", border: "#1f77b4" } },
                targetEnd: { color: { background: "#d62728", border: "#d62728" } },
                cap: "color unset (inherit default)",
            },
        ),
        ...[0.5, 1, 3, 6, 10].map((v) => edge(`width-${slug(v)}`, { width: v })),
        edge("dashes-true", { dashes: true }),
        edge("dashes-array", { dashes: [10, 5] }),
        edge("dashes-dots", { dashes: [2, 3] }),
        edge("dashes-pattern", { dashes: [12, 3, 3, 3] }),
        edge("dashes-wide", { dashes: true, width: 4 }, { cap: "dashes=true width=4" }),
        edge("smooth-true", { smooth: true }, { dy: 40 }),
        edge("smooth-false", { smooth: false }, { dy: 40 }),
        ...E("edges.smooth.type").map((v) =>
            edge(`smooth-${slug(v)}`, { smooth: { enabled: true, type: v } }, { dy: 40, cap: `smooth.type=${v}` }),
        ),
        ...[0.1, 0.9].map((r) =>
            edge(
                `roundness-${slug(r)}`,
                { smooth: { enabled: true, type: "curvedCW", roundness: r } },
                { dy: 40, cap: `curvedCW roundness=${r}` },
            ),
        ),
        ...E("edges.smooth.forceDirection").map((v) =>
            edge(
                `force-direction-${v}`,
                { smooth: { enabled: true, type: "cubicBezier", forceDirection: v } },
                { dy: 40, cap: `cubicBezier forceDirection=${v}` },
            ),
        ),
        edge(
            "force-direction-false",
            { smooth: { enabled: true, type: "cubicBezier", forceDirection: false } },
            { dy: 40, cap: "forceDirection=false" },
        ),
        edge("background", { background: { enabled: true } }, { cap: "background.enabled=true" }),
        edge("background-color", { background: { enabled: true, color: "#ffd700" } }),
        edge(
            "background-curved",
            { smooth: { enabled: true, type: "curvedCW" }, background: { enabled: true, color: "#ffd700", size: 10 } },
            { dy: 40, cap: "background on curvedCW" },
        ),
        edge(
            "background-dashes-curved",
            {
                smooth: { enabled: true, type: "curvedCCW" },
                background: { enabled: true, color: "#9edae5", size: 8, dashes: [6, 4] },
            },
            { dy: 40, cap: "background.dashes curvedCCW" },
        ),
        edge("background-dashes", { background: { enabled: true, dashes: [6, 4] } }),
        edge("shadow-true", { shadow: true }),
        edge("shadow-color", { shadow: { enabled: true, color: "#d62728" } }),
        loop("self-loop", {}, { cap: "self loop" }),
        loop("self-reference-size", { selfReference: { size: 25 } }, { cap: "selfReference.size=25" }),
        loop("self-reference-angle", { selfReference: { angle: 1.57 } }, { cap: "selfReference.angle=1.57" }),
        loop(
            "self-reference-front",
            { selfReference: { renderBehindTheNode: false } },
            { cap: "renderBehindTheNode=false" },
        ),
        loop("self-reference-size-legacy", { selfReferenceSize: 25 }, { cap: "selfReferenceSize=25" }),
        edge("parallel-2", {}, { parallel: 2, cap: "2 parallel edges" }),
        edge(
            "parallel-3-smooth",
            { smooth: { enabled: true, type: "dynamic" } },
            { parallel: 3, cap: "3 parallel smooth" },
        ),
        edge("hidden-true", { hidden: true }),
        edge("width-on-dashes", { width: 6, dashes: [4, 4] }, { cap: "width=6 dashes" }),
    ],
    // edges with a value: vis-network resets every edge WITHOUT a value to the global width once any edge has one
    // (Edge.baseWidth is taken from the defaults and never from the edge's own width), so they get their own page
    "specimen-edges-lines-p2": [
        edge("default", {}),
        ...[1, 4, 10].map((v) => edge(`value-${v}`, { value: v }, { cap: `value=${v} (of 1..10)` })),
        edge("scaling-min-max", { value: 7, scaling: { min: 1, max: 4 } }, { cap: "value=7 scaling 1..4" }),
        edge(
            "label-scaling",
            { label: "Sc", value: 10, scaling: { label: { enabled: true, min: 8, max: 20 } } },
            { cap: "scaling.label value=10" },
        ),
        edge("width-6-reset", { width: 6 }, { cap: "width=6 beside valued edges" }),
        edge("width-6-value", { width: 6, value: 1 }, { cap: "width=6 value=1" }),
    ],
    // one background field at a time on a curved edge (vis-network draws a background only on a smooth edge), the
    // other shadow fields, roundness on every smooth type that reads it, and two more color syntaxes
    "specimen-edges-lines-p3": [
        edge("default", {}),
        ...[
            ["enabled", { enabled: true }],
            ["color", { enabled: true, color: "#ffd700" }],
            ["size", { enabled: true, size: 4 }],
            ["dashes", { enabled: true, dashes: [6, 4] }],
        ].map(([k, bg]) =>
            edge(
                `background-curved-${k}`,
                { smooth: { enabled: true, type: "curvedCW" }, background: bg },
                { dy: 40, cap: `curvedCW background.${k}=${Array.isArray(bg[k]) ? `[${bg[k].join(",")}]` : bg[k]}` },
            ),
        ),
        edge("shadow-size", { shadow: { enabled: true, size: 20 } }, { cap: "shadow.size=20" }),
        edge("shadow-offset", { shadow: { enabled: true, x: 10, y: -10 } }, { cap: "shadow.x=10 y=-10" }),
        ...[
            "curvedCCW",
            "cubicBezier",
            "horizontal",
            "vertical",
            "diagonalCross",
            "straightCross",
            "continuous",
            "discrete",
        ].map((t) =>
            edge(
                `roundness-0-9-${slug(t)}`,
                { smooth: { enabled: true, type: t, roundness: 0.9 } },
                { dy: 40, cap: `${t} roundness=0.9` },
            ),
        ),
        edge("color-hsl", { color: "hsl(120,60%,40%)" }),
        edge("color-hex-alpha", { color: "#1f77b480" }),
    ],
    "specimen-arrows": [
        edge("default", { arrows: "to" }, { raw: true, cap: "arrows=to only" }),
        ...["to", "middle", "from"].flatMap((at) =>
            E(`edges.arrows.${at}.type`).map((t) =>
                edge(
                    `arrow-${at}-${slug(t)}`,
                    {
                        arrows: {
                            [at]: {
                                enabled: true,
                                type: t,
                                ...(t === "image" ? { src: ARROW_IMG, imageWidth: 16, imageHeight: 16 } : {}),
                            },
                        },
                    },
                    { cap: `arrows.${at}.type=${t}` },
                ),
            ),
        ),
        edge("arrows-string-to", { arrows: "to" }),
        edge("arrows-string-from", { arrows: "from" }),
        edge("arrows-string-middle", { arrows: "middle" }),
        edge("arrows-string-to-from", { arrows: "to, from" }),
        edge("arrows-to-true", { arrows: { to: true } }, { cap: "arrows.to=true" }),
        edge(
            "arrows-enabled-false",
            { arrows: { to: { enabled: false, type: "bar" } } },
            { cap: "arrows.to.enabled=false" },
        ),
        ...[0.5, 2].map((v) =>
            edge(
                `scale-factor-${slug(v)}`,
                { arrows: { to: { enabled: true, scaleFactor: v } } },
                { cap: `arrows.to.scaleFactor=${v}` },
            ),
        ),
        edge(
            "scale-factor-middle",
            { arrows: { middle: { enabled: true, scaleFactor: 2 } } },
            { cap: "arrows.middle.scaleFactor=2" },
        ),
        edge(
            "scale-factor-from",
            { arrows: { from: { enabled: true, scaleFactor: 2 } } },
            { cap: "arrows.from.scaleFactor=2" },
        ),
        edge(
            "arrow-image-size",
            { arrows: { to: { enabled: true, type: "image", src: ARROW_IMG, imageWidth: 28, imageHeight: 12 } } },
            { cap: "image 28x12" },
        ),
        edge("arrow-color", { color: "#d62728", arrows: "to" }, { cap: "color=#d62728 arrows=to" }),
        edge("arrow-width-4", { width: 4, arrows: "to" }, { cap: "width=4 arrows=to" }),
        edge(
            "strikethrough-false",
            { width: 4, arrows: "to", arrowStrikethrough: false },
            { cap: "arrowStrikethrough=false" },
        ),
        edge(
            "end-point-offset",
            { arrows: "to, from", endPointOffset: { from: 8, to: 12 } },
            { cap: "endPointOffset 8,12" },
        ),
        edge(
            "arrow-curved",
            { arrows: "to, middle", smooth: { enabled: true, type: "curvedCW" } },
            { dy: 40, cap: "curvedCW arrows" },
        ),
        edge("arrow-dashed", { arrows: "to", dashes: true }, { cap: "dashes arrows=to" }),
        edge("arrow-box-node", { arrows: "to" }, { ends: { shape: "box", label: "B" }, cap: "arrows=to box ends" }),
        edge("arrow-opacity", { arrows: "to", color: { opacity: 0.3 } }, { cap: "arrows color.opacity=0.3" }),
        edge("arrows-from-true", { arrows: { from: true } }, { cap: "arrows.from=true" }),
        edge("arrows-middle-true", { arrows: { middle: true } }, { cap: "arrows.middle=true" }),
    ],
    // the multi-font text form (`font.<mod>: "size face color"`) of the modifiers labels and labels-p2 hold as objects
    "specimen-labels-p3": [
        node("default", {}, { set: { label: "Label" }, raw: true, cap: "label only" }),
        ...MULTI_TEXT.slice(1).map(([m, text]) =>
            node(
                `font-${m}-shorthand`,
                { label: text, font: { multi: "html", [m]: "18px arial #2ca02c" } },
                { cap: `font.${m}=18px arial green` },
            ),
        ),
    ],
    "specimen-edge-labels-p2": [
        edge("default", { label: "Label" }, { raw: true, cap: "label only" }),
        ...MULTI_TEXT.map(([m, text]) =>
            edge(
                `font-${m}-shorthand`,
                { label: text, font: { multi: "html", [m]: "18px arial #2ca02c" } },
                { cap: `font.${m}=18px arial green` },
            ),
        ),
    ],
    "specimen-edge-labels": [
        edge("default", { label: "Label" }, { raw: true, cap: "label only" }),
        edge("label", { label: "Label" }),
        edge("label-multiline", { label: "One\nTwo" }, { cap: "label with \\n" }),
        ...[6, 14, 20].map((v) => edge(`font-size-${v}`, { label: "Aa", font: { size: v } })),
        ...["DejaVu Serif", "DejaVu Sans Mono"].map((v) =>
            edge(`font-face-${slug(v)}`, { label: "Face", font: { face: v } }),
        ),
        edge("font-color", { label: "Color", font: { color: "#d62728" } }),
        edge("font-background", { label: "Back", font: { background: "#ffd700" } }),
        edge(
            "font-stroke",
            { label: "Stroke", font: { strokeWidth: 3, strokeColor: "#ff7f0e" } },
            { cap: "font.strokeWidth=3 color" },
        ),
        edge(
            "font-stroke-default",
            { label: "Stroke", font: { strokeWidth: 2, strokeColor: "#ffffff" } },
            { cap: "strokeWidth=2 white" },
        ),
        edge("font-vadjust", { label: "Adj", font: { vadjust: -10 } }),
        ...E("edges.font.align").map((v) =>
            edge(`font-align-${v}`, { label: "Along", font: { align: v } }, { dy: 50, cap: `font.align=${v}` }),
        ),
        // vis-network draws no edge label whose font is text (ISSUES.md, vis-network)
        edge("font-shorthand", { label: "Short", font: "18px arial #2ca02c" }, { cap: "font=18px arial green" }),
        edge(
            "font-multi-html",
            { label: "<b>B</b> <i>I</i> <code>M</code>", font: { multi: "html" } },
            { cap: "font.multi=html" },
        ),
        edge(
            "font-multi-markdown",
            { label: "*B* _I_ `M`", font: { multi: "markdown" } },
            { cap: "font.multi=markdown" },
        ),
        edge("font-multi-true", { label: "<b>B</b> x", font: { multi: true } }, { cap: "font.multi=true" }),
        edge("font-multi-false", { label: "<b>raw</b>", font: { multi: false } }, { cap: "font.multi=false" }),
        ...["bold", "ital", "boldital", "mono"].flatMap((m) => {
            const text = {
                bold: "<b>B</b> x",
                ital: "<i>I</i> x",
                boldital: "<b><i>BI</i></b> x",
                mono: "<code>M</code> x",
            }[m];
            return [
                edge(
                    `font-${m}-color`,
                    { label: text, font: { multi: "html", [m]: { color: "#d62728" } } },
                    { cap: `font.${m}.color` },
                ),
                edge(
                    `font-${m}-size`,
                    { label: text, font: { multi: "html", [m]: { size: 16 } } },
                    { cap: `font.${m}.size=16` },
                ),
                edge(
                    `font-${m}-face`,
                    { label: text, font: { multi: "html", [m]: { face: "DejaVu Serif" } } },
                    { cap: `font.${m}.face=Serif` },
                ),
                edge(
                    `font-${m}-mod`,
                    { label: text, font: { multi: "html", [m]: { mod: "" } } },
                    { cap: `font.${m}.mod=""` },
                ),
                edge(
                    `font-${m}-vadjust`,
                    { label: text, font: { multi: "html", [m]: { vadjust: 6 } } },
                    { cap: `font.${m}.vadjust=6` },
                ),
            ];
        }),
        edge(
            "label-curved",
            { label: "Curve", smooth: { enabled: true, type: "curvedCW" } },
            { dy: 40, cap: "label on curvedCW" },
        ),
        edge("label-loop", { label: "Loop" }, { kind: "loop", cap: "label on self loop" }),
        edge(
            "width-constraint",
            { label: "a long edge label", widthConstraint: { maximum: 40 } },
            { cap: "widthConstraint.maximum=40" },
        ),
        edge(
            "width-constraint-number",
            { label: "a long edge label", widthConstraint: 40 },
            { cap: "widthConstraint=40" },
        ),
        edge(
            "draw-threshold",
            { label: "Hidden?", font: { size: 8 }, scaling: { label: { drawThreshold: 12 } } },
            { cap: "drawThreshold=12 size=8" },
        ),
        edge(
            "max-visible",
            { label: "Cap", font: { size: 30 }, scaling: { label: { maxVisible: 12 } } },
            { cap: "maxVisible=12 size=30" },
        ),
        edge("label-steep", { label: "Steep", font: { align: "top" } }, { dy: 90, cap: "align=top steep" }),
    ],
    "specimen-groups": [
        node("default", {}),
        ...Array.from({ length: 22 }, (_, i) =>
            node(
                `default-group-${i + 1}`,
                { group: `palette-${i + 1}` },
                { omit: ["color"], cap: `group=palette-${i + 1}` },
            ),
        ),
        node("group-color", { group: "g-color" }, { omit: ["color"], cap: "groups.g-color.color" }),
        node("group-shape", { group: "g-shape" }, { omit: ["shape"], cap: "groups.g-shape.shape=diamond" }),
        node("group-size", { group: "g-size" }, { omit: ["size"], cap: "groups.g-size.size=30" }),
        node(
            "group-border",
            { group: "g-border" },
            { omit: ["borderWidth", "color.border"], cap: "groups.g-border border" },
        ),
        node("group-font", { group: "g-font", label: "Font" }, { omit: ["font"], cap: "groups.g-font.font" }),
        node(
            "group-label-shape",
            { group: "g-box", label: "Box" },
            { omit: ["shape", "color"], cap: "groups.g-box box+color" },
        ),
        node("group-image", { group: "g-image" }, { omit: ["shape"], cap: "groups.g-image image" }),
        node("group-number", { group: 7 }, { omit: ["color"], cap: "group=7 (a number)" }),
        node("group-shared-1", { group: "g-color" }, { omit: ["color"], cap: "group=g-color again" }),
        node("group-opacity", { group: "g-opacity" }, { omit: ["opacity"], cap: "groups.g-opacity opacity" }),
        node("group-shadow", { group: "g-shadow" }, { omit: ["shadow"], cap: "groups.g-shadow shadow" }),
        node("group-all-per-node", { group: "g-color" }, { cap: "group + every option per node" }),
    ],
    "specimen-images-charts": [
        node("default", { shape: "image", image: QUADRANTS }, { raw: true, cap: "shape=image only" }),
        node("image", { shape: "image", image: QUADRANTS }, { cap: "shape=image" }),
        node("circular-image", { shape: "circularImage", image: QUADRANTS }, { cap: "shape=circularImage" }),
        node("image-wide", { shape: "image", image: WIDE }, { cap: "image 48x24" }),
        node("circular-image-wide", { shape: "circularImage", image: WIDE }, { cap: "circularImage 48x24" }),
        node("image-size-10", { shape: "image", image: QUADRANTS, size: 10 }, { cap: "image size=10" }),
        node("image-size-35", { shape: "image", image: QUADRANTS, size: 35 }, { cap: "image size=35" }),
        node("image-object", { shape: "image", image: { unselected: QUADRANTS } }, { cap: "image.unselected" }),
        node(
            "use-image-size",
            { shape: "image", image: WIDE, shapeProperties: { useImageSize: true } },
            { cap: "useImageSize=true" },
        ),
        node(
            "use-image-size-circular",
            { shape: "circularImage", image: WIDE, shapeProperties: { useImageSize: true } },
            { cap: "circular useImageSize" },
        ),
        node(
            "use-border-with-image",
            { shape: "image", image: QUADRANTS, borderWidth: 3, shapeProperties: { useBorderWithImage: true } },
            { cap: "useBorderWithImage=true" },
        ),
        node(
            "image-border-no-flag",
            { shape: "image", image: QUADRANTS, borderWidth: 3 },
            { cap: "image borderWidth=3" },
        ),
        node(
            "circular-border-4",
            { shape: "circularImage", image: QUADRANTS, borderWidth: 4 },
            { cap: "circularImage border=4" },
        ),
        node(
            "interpolation-false",
            { shape: "image", image: CHECKER, size: 35, shapeProperties: { interpolation: false } },
            { cap: "interpolation=false" },
        ),
        node(
            "interpolation-true",
            { shape: "image", image: CHECKER, size: 35, shapeProperties: { interpolation: true } },
            { cap: "interpolation=true" },
        ),
        ...E("nodes.shapeProperties.coordinateOrigin").map((v) =>
            node(
                `coordinate-origin-${v}`,
                { shape: "image", image: QUADRANTS, shapeProperties: { coordinateOrigin: v } },
                { cap: `coordinateOrigin=${v}` },
            ),
        ),
        node(
            "coordinate-origin-circular",
            { shape: "circularImage", image: QUADRANTS, shapeProperties: { coordinateOrigin: "top-left" } },
            { cap: "circular top-left" },
        ),
        node("image-padding", { shape: "circularImage", image: QUADRANTS, imagePadding: 8 }, { cap: "imagePadding=8" }),
        node(
            "image-padding-sides",
            {
                shape: "image",
                image: QUADRANTS,
                imagePadding: { top: 2, right: 10, bottom: 6, left: 0 },
                shapeProperties: { useBorderWithImage: true },
            },
            { cap: "imagePadding={2,10,6,0}" },
        ),
        node("broken-image", { shape: "image", image: BROKEN, brokenImage: QUADRANTS }, { cap: "brokenImage" }),
        node("broken-image-none", { shape: "image", image: BROKEN }, { cap: "image fails, no brokenImage" }),
        node(
            "image-background",
            {
                shape: "image",
                image: WIDE,
                color: { background: "#ffd700" },
                shapeProperties: { useBorderWithImage: true },
            },
            { cap: "image + background" },
        ),
        node("image-opacity", { shape: "image", image: QUADRANTS, opacity: 0.4 }, { cap: "image opacity=0.4" }),
        node(
            "image-label",
            { shape: "circularImage", image: QUADRANTS, label: "Below" },
            { cap: "circularImage label" },
        ),
        node("icon", { shape: "icon", icon: ICON }, { cap: "icon code=A" }),
        node("icon-size", { shape: "icon", icon: { ...ICON, size: 50 } }, { cap: "icon.size=50" }),
        node("icon-color", { shape: "icon", icon: { ...ICON, color: "#d62728" } }, { cap: "icon.color=#d62728" }),
        node(
            "icon-face",
            { shape: "icon", icon: { ...ICON, face: "DejaVu Serif" } },
            { cap: "icon.face=DejaVu Serif" },
        ),
        node("icon-weight", { shape: "icon", icon: { ...ICON, weight: "bold" } }, { cap: "icon.weight=bold" }),
        node("icon-weight-number", { shape: "icon", icon: { ...ICON, weight: 900 } }, { cap: "icon.weight=900" }),
        node("icon-code", { shape: "icon", icon: { ...ICON, code: "#" } }, { cap: "icon.code=#" }),
    ],
    "specimen-mappings-bypass": [
        node("default", {}, { cap: "nothing set (global options)" }),
        node("global-shape", {}, { omit: ["shape"], cap: "shape from options.nodes" }),
        node("bypass-shape", { shape: "square" }, { cap: "shape=square per node" }),
        node("group-shape", { group: "m-shape" }, { omit: ["shape"], cap: "shape=square from group" }),
        node("global-color", {}, { omit: ["color"], cap: "color from options.nodes" }),
        node("bypass-color", { color: { background: "#1f77b4", border: "#08306b" } }, { cap: "color per node" }),
        node("group-color", { group: "m-color" }, { omit: ["color"], cap: "color from group" }),
        node("global-border-width", {}, { omit: ["borderWidth"], cap: "borderWidth from options.nodes" }),
        node("bypass-border-width", { borderWidth: 4 }, { cap: "borderWidth=4 per node" }),
        node("group-border-width", { group: "m-border" }, { omit: ["borderWidth"], cap: "borderWidth from group" }),
        node("global-size", {}, { omit: ["size"], cap: "size from options.nodes" }),
        node("bypass-size", { size: 10 }, { cap: "size=10 per node" }),
        node("group-size", { group: "m-size" }, { omit: ["size"], cap: "size from group" }),
        node("global-font", { label: "Font" }, { omit: ["font"], cap: "font from options.nodes" }),
        node("bypass-font", { label: "Font", font: { color: "#d62728", size: 14 } }, { cap: "font per node" }),
        node("group-font", { group: "m-font", label: "Font" }, { omit: ["font"], cap: "font from group" }),
        node("group-over-global", { group: "m-shape" }, { omit: ["shape", "color"], cap: "group shape, global color" }),
        node(
            "bypass-over-group",
            { group: "m-color", color: { background: "#2ca02c", border: N.border } },
            { cap: "node color over group" },
        ),
        node(
            "global-partial-color",
            { color: { border: N.border } },
            { omit: ["color.background"], cap: "border per node, fill global" },
        ),
        node("value-min", { value: 1 }, { cap: "value=1 (of 1..9)" }),
        node("value-mid", { value: 5 }, { cap: "value=5 (of 1..9)" }),
        node("value-max", { value: 9 }, { cap: "value=9 (of 1..9)" }),
        node("global-scaling", { value: 5 }, { omit: ["size"], cap: "value=5 global scaling" }),
        edge("default", {}, { raw: true, id: "edge-default", cap: "edge nothing set" }),
        edge("edge-global-color", {}, { omit: ["color"], cap: "color from options.edges" }),
        edge("edge-bypass-color", { color: { color: "#9467bd" } }, { cap: "color per edge" }),
        edge("edge-global-width", {}, { omit: ["width"], cap: "width from options.edges" }),
        edge("edge-bypass-width", { width: 4 }, { cap: "width=4 per edge" }),
        edge("edge-global-dashes", {}, { omit: ["dashes"], cap: "dashes from options.edges" }),
        edge("edge-bypass-dashes", { dashes: [6, 3] }, { cap: "dashes per edge" }),
        edge("edge-global-arrows", {}, { omit: ["arrows"], cap: "arrows from options.edges" }),
        edge("edge-bypass-arrows", { arrows: { to: { enabled: true, type: "circle" } } }, { cap: "arrows per edge" }),
        edge("edge-global-smooth", {}, { omit: ["smooth"], dy: 40, cap: "smooth from options.edges" }),
        edge("edge-global-font", { label: "Lbl" }, { omit: ["font"], cap: "font from options.edges" }),
        edge(
            "edge-inherit-from-group",
            { color: { inherit: "from" } },
            { omit: ["color"], ends: { group: "m-color" }, cap: "inherit=from, end in a group" },
        ),
    ],
};

/** Sheet-wide options (beside `physics: false`): groups and the global node and edge options. */
const SHEET_OPTIONS = {
    "specimen-groups": {
        groups: {
            "g-color": { color: { background: "#ff7f0e", border: "#7f3f00" } },
            "g-shape": { shape: "diamond" },
            "g-size": { size: 30 },
            "g-border": { borderWidth: 4, color: { border: "#d62728" } },
            "g-font": { font: { color: "#2ca02c", size: 16, face: "DejaVu Serif" } },
            "g-box": { shape: "box", color: { background: "#9edae5", border: "#17becf" } },
            "g-image": { shape: "image", image: QUADRANTS },
            "g-opacity": { opacity: 0.3 },
            "g-shadow": { shadow: { enabled: true, color: "#d62728" } },
        },
    },
    "specimen-mappings-bypass": {
        nodes: {
            shape: "square",
            size: 10,
            color: { background: "#1f77b4", border: "#08306b" },
            borderWidth: 4,
            font: { color: "#d62728", size: 14, face: N.fontFamily },
            scaling: { min: 4, max: 26 },
        },
        edges: {
            color: { color: "#9467bd", inherit: false },
            width: 4,
            dashes: [6, 3],
            arrows: { to: { enabled: true, type: "circle" } },
            smooth: { enabled: true, type: "curvedCW" },
            font: { color: "#d62728", size: 14, face: N.fontFamily },
        },
        groups: {
            "m-shape": { shape: "square" },
            "m-color": { color: { background: "#1f77b4", border: "#08306b" } },
            "m-border": { borderWidth: 4 },
            "m-size": { size: 10 },
            "m-font": { font: { color: "#d62728", size: 14 } },
        },
    },
};
/** Categories whose specimens need more room than a full sheet gives (labels up to 40 px), so fewer per page. */
const PAGE_SIZE = { "specimen-labels": 30 };
/** Sheets drawn again under another value of a global option: [sheet id, page id, options]. */
const VARIANTS = [["specimen-groups", "specimen-groups-p2", { groups: { useDefaultGroups: false } }]];

// ------------------------------------------------------------------ writing

/**
 * A sheet's pages: at most layout.maxSpecimens specimens each.
 * @param id - the category
 * @param specs - its specimens
 * @returns [[pageId, specs]]
 */
function pages(id, specs) {
    const per = PAGE_SIZE[id] ?? layout.maxSpecimens;
    const [first, ...rest] = specs;
    // every page repeats the category's `default` specimen (one per sheet, the sheet rules), so it is not counted
    const own = first?.id === "default" ? rest : specs;
    const count = Math.ceil(own.length / (own === rest ? per - 1 : per));
    const size = Math.ceil(own.length / count);
    return Array.from({ length: count }, (_, i) => {
        const page = own.slice(i * size, (i + 1) * size);
        return [i ? `${id}-p${i + 1}` : id, own === rest ? [first, ...page] : page];
    });
}

/**
 * Every dotted option path an options object sets, with its leaf value(s).
 * @param o - options
 * @param prefix - path so far
 * @param acc - [path, value] pairs
 * @returns acc
 */
function paths(o, prefix, acc = []) {
    for (const [k, v] of Object.entries(o ?? {})) {
        const p = `${prefix}.${k}`;
        acc.push([p, v]);
        if (isObj(v)) paths(v, p, acc);
    }
    return acc;
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
mkdirSync(out, { recursive: true });
const coverage = {}; // path -> { specimens, values }
const written = [];
const note = (path, value, at) => {
    const c = (coverage[path] ??= { specimens: new Set(), values: {} });
    c.specimens.add(at);
    const values = vocab[path]?.enums ?? vocab[path]?.docValues;
    if (values && !isObj(value)) {
        const parts = typeof value === "string" && path === "edges.arrows" ? value.split(/[,;\s]+/) : [value];
        for (const one of parts)
            if (values.map(String).includes(String(one))) (c.values[String(one)] ??= new Set()).add(at);
    }
};
const plan = [];
for (const [category, specs] of Object.entries(SHEETS)) {
    for (const [sheet, list] of pages(category, specs)) plan.push([sheet, list, SHEET_OPTIONS[category] ?? {}]);
}
for (const [base, page, extra] of VARIANTS) {
    const [, list, opts] = plan.find(([id]) => id === base);
    plan.push([page, list, merge(opts, extra)]);
}
for (const [sheet, list, sheetOptions] of plan) {
    const seen = new Set();
    for (const s of list) {
        if (!ID.test(s.id) || seen.has(s.id)) throw new Error(`${sheet}: bad or repeated specimen id ${s.id}`);
        seen.add(s.id);
    }
    const { nodes, edges } = place(list);
    const all = new Set();
    for (const e of [...nodes, ...edges]) {
        if (all.has(e.id)) throw new Error(`${sheet}: repeated element id ${e.id}`);
        all.add(e.id);
    }
    const doc = { nodes, edges, options: { physics: false, ...sheetOptions } };
    writeFileSync(join(out, `${sheet}.json`), `${JSON.stringify(doc, null, 4)}\n`);
    written.push({ id: sheet, specimens: list.length });
    for (const s of list) {
        const at = `${sheet}#${s.id}`;
        const root = s.kind === "node" ? "nodes" : "edges";
        for (const [p, v] of paths(s.set, root)) note(p, v, at);
        if (s.set?.group !== undefined) note("groups.<name>", s.set.group, at);
    }
    for (const [p, v] of paths(sheetOptions.nodes, "nodes")) note(p, v, `${sheet}#options.nodes`);
    for (const [p, v] of paths(sheetOptions.edges, "edges")) note(p, v, `${sheet}#options.edges`);
    for (const g of Object.values(sheetOptions.groups ?? {})) {
        if (isObj(g)) for (const [p, v] of paths(g, "nodes")) note(p, v, `${sheet}#options.groups`);
    }
    if (sheetOptions.groups && "useDefaultGroups" in sheetOptions.groups) {
        note("groups.useDefaultGroups", sheetOptions.groups.useDefaultGroups, `${sheet}#options.groups`);
    }
}
// useDefaultGroups true is vis-network's default: the groups sheet's palette nodes draw it
note("groups.useDefaultGroups", true, "specimen-groups#default-group-1");

const uncovered = [];
const report = {};
let valuesCovered = 0;
let optionsCovered = 0;
for (const p of vocabulary.options) {
    const c = coverage[p.path];
    if (NOT_DRAWN[p.path]) {
        report[p.path] = { notDrawn: NOT_DRAWN[p.path] };
        continue;
    }
    if (!c) {
        uncovered.push(p.path);
        continue;
    }
    optionsCovered++;
    const entry = { specimens: [...c.specimens].slice(0, 6) };
    const values = p.enums ?? p.docValues;
    if (values) {
        entry.values = {};
        for (const v of values.map(String)) {
            if (c.values[v]) {
                entry.values[v] = [...c.values[v]].slice(0, 3);
                valuesCovered++;
            } else if (NOT_DRAWN[`${p.path}=${v}`]) entry.values[v] = { notDrawn: NOT_DRAWN[`${p.path}=${v}`] };
            else uncovered.push(`${p.path}=${v}`);
        }
    }
    report[p.path] = entry;
}
for (const k of Object.keys(coverage)) if (!vocab[k]) uncovered.push(`${k} (not in the vocabulary)`);
writeFileSync(
    COVERAGE,
    `${JSON.stringify(
        {
            program: `vis-network ${version}`,
            about: "Which specimen draws each option and enumerated value of vis-network-vocabulary.json (at most a few named each), or why none can; written by vis-network.mjs.",
            sheets: written,
            optionsCovered,
            optionsNotDrawn: Object.keys(NOT_DRAWN).filter((k) => !k.includes("=")).length,
            valuesCovered,
            uncovered,
            options: report,
        },
        null,
        4,
    )}\n`,
);
console.log(
    `vis-network.mjs: ${written.length} sheets, ${written.reduce((a, s) => a + s.specimens, 0)} specimens; ${optionsCovered} options and ${valuesCovered} enumerated values covered, ${Object.keys(NOT_DRAWN).length} not drawn`,
);
// the repository's prettier, as the pre-commit hook would, so a rerun writes the committed bytes (the oracles record
// each sheet's sha256)
execFileSync(
    "npx",
    ["prettier", "--write", "--log-level", "warn", VOCAB, COVERAGE, ...written.map((s) => join(out, `${s.id}.json`))],
    { stdio: "inherit" },
);
if (uncovered.length) {
    console.error(`no specimen and no NOT_DRAWN reason: ${uncovered.join(", ")}`);
    process.exit(1);
}
process.exit(0);
