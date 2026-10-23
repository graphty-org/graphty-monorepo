#!/usr/bin/env node
// The GEXF specimen sheets (gexf-gephi family): one GEXF 1.3 file per sheet category in
// graph-io/test/fidelity/specimens/gexf/, the sheet pages (a file drawn under one Gephi Preview setting each) in
// specimens/gexf/pages.json, and the vocabulary they cover in gexf-gephi-vocabulary.json beside this script.
//
//   node gexf-gephi.mjs
//
// The vocabulary comes from its authoritative sources, read each run: the viz module's enumerations from the GEXF
// 1.3 schema (graph-io/test/conformance/schemas/gexf-1.3/viz.xsd, gexf.xsd) and Gephi's Preview properties from
// the Gephi Toolkit itself (gexf-gephi-preview-properties.json, written by
// `java ... GephiExport.java --props`). A schema value or a Preview property with no specimen or page, and no
// recorded reason, fails the run, so a new version shows up here.
//
// GEXF stores positions y up (Gephi draws y = -file y); the sheet layout is y down, so a node at sheet (x, y) is
// written at (x, 900 - y). Gephi's GEXF importer quirks the sheets show are recorded in ../../oracles/ISSUES.md.
import console from "node:console";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ANCHORS, caption, cells, layout } from "../sheet-layout.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../specimens/gexf");
const schemas = resolve(here, "../../../conformance/schemas/gexf-1.3");
const H = layout.canvas.height;
const N = layout.neutral;
const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const NEUTRAL_FILL = rgb(N.fill);
const NEUTRAL_EDGE = rgb(N.edgeColor);
/** A specimen node's viz size: GEXF's size is a radius (Gephi draws a circle 2 x size wide). */
const NODE_SIZE = N.size / 2;
/** An edge specimen's end nodes: small and neutral. */
const END_SIZE = 4;
/** A caption node's size: Gephi draws a label 0.6 x its node's size high, so 14 gives about 8 px text. */
const CAPTION_SIZE = 14;
const CAPTION_FILL = [255, 255, 255];

const esc = (s) =>
    String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/\n/g, "&#10;");
const num = (v) => String(Math.round(v * 100) / 100);

// ------------------------------------------------------------------ the vocabulary, from the sources

const enumOf = (xsd, type) => {
    const text = readFileSync(join(schemas, xsd), "utf8");
    const block = new RegExp(`<xs:simpleType name="${type}">([\\s\\S]*?)</xs:simpleType>`).exec(text)?.[1];
    if (!block) throw new Error(`${xsd} has no ${type}`);
    return [...block.matchAll(/<xs:enumeration value="([^"]+)"/g)].map((m) => m[1]);
};
const SCHEMA = {
    "viz:shape (node)": enumOf("viz.xsd", "node-shape-type"),
    "viz:shape (edge)": enumOf("viz.xsd", "edge-shape-type"),
    "edge type": enumOf("gexf.xsd", "edgetype-type"),
    defaultedgetype: enumOf("gexf.xsd", "defaultedgetype-type"),
};
const PREVIEW = JSON.parse(readFileSync(join(here, "gexf-gephi-preview-properties.json"), "utf8"));

// ------------------------------------------------------------------ writing a sheet

/** The namespaces and version attribute of each GEXF version the sheets are written in. */
const VERSIONS = {
    1.3: { ns: "http://gexf.net/1.3", viz: "http://gexf.net/1.3/viz", version: "1.3" },
    "1.2draft": { ns: "http://www.gexf.net/1.2draft", viz: "http://www.gexf.net/1.2draft/viz", version: "1.2" },
    "1.1draft": { ns: "http://www.gexf.net/1.1draft", viz: "http://www.gexf.net/1.1draft/viz", version: "1.1" },
};
/**
 * A time interval's attributes.
 * @param t - { start?, end?, startopen?, endopen? (1.2draft open bounds), timestamp?, timestamps? }
 * @returns the attribute text, starting with a space when non-empty
 */
const span = (t) =>
    ["start", "end", "startopen", "endopen", "timestamp", "timestamps"]
        .map((k) => (t[k] === undefined ? "" : ` ${k}="${t[k]}"`))
        .join("");
/**
 * One viz:color element.
 * @param c - [r,g,b,a?] | { hex, a? }, with an optional time interval as c.start / c.end on the object form
 * @param [t] - a time interval
 * @returns the element
 */
const vizColor = (c, t = {}) =>
    Array.isArray(c)
        ? `<viz:color r="${c[0]}" g="${c[1]}" b="${c[2]}"${c.length > 3 ? ` a="${c[3]}"` : ""}${span(t)}/>`
        : `<viz:color ${Object.entries(c)
              .map(([k, v]) => `${k}="${esc(v)}"`)
              .join(" ")}${span(t)}/>`;

/**
 * One sheet's GEXF text.
 * @param nodes - [{ id, x, y, label?, color?: [r,g,b,a?] | { hex, a? }, size?, shape?, uri?, z?, pos?: false, children?, pid?,
 *   parents?: [id], start?, end?, spells?: [{ start, end }], colors? / sizes? / positions?: [{ value, start, end }] (timed viz values, written in order) }]
 * @param edges - [{ id, source, target, type?, kind?, label?, weight?, color?, thickness?, shape?, start?, end?,
 *   timestamps?, attvalues?: [{ for, value, start?, end? }] }]
 * @param defaultedgetype - the graph's default edge type
 * @param about - the sheet's description, written into <meta>
 * @param [opts] - { version: a VERSIONS key (default 1.3), dynamic: true for mode="dynamic" timeformat="double",
 *   timestamps: true for timerepresentation="timestamp", slice: a time for mode="slice" with that graph timestamp,
 *   attributes: <attributes> element lines }
 * @returns the file's text
 */
function gexf(nodes, edges, defaultedgetype, about, opts = {}) {
    const v = VERSIONS[opts.version ?? "1.3"];
    let mode = 'mode="static"';
    if (opts.dynamic)
        mode = `mode="dynamic" timeformat="double"${opts.timestamps ? ' timerepresentation="timestamp"' : ""}`;
    if (opts.slice !== undefined) mode = `mode="slice" timeformat="double" timestamp="${opts.slice}"`;
    const L = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<gexf xmlns="${v.ns}" xmlns:viz="${v.viz}" version="${v.version}">`,
        '  <meta lastmodifieddate="2026-10-18">',
        "    <creator>graphty gexf-gephi specimen generator</creator>",
        `    <description>${esc(about)}</description>`,
        "  </meta>",
        `  <graph ${mode} defaultedgetype="${defaultedgetype}">`,
        ...(opts.attributes ?? []).map((l) => `    ${l}`),
        "    <nodes>",
    ];
    const writeNode = (n, indent) => {
        const attrs = [`id="${esc(n.id)}"`];
        if (n.label !== undefined) attrs.push(`label="${esc(n.label)}"`);
        if (n.pid !== undefined) attrs.push(`pid="${esc(n.pid)}"`);
        L.push(`${indent}<node ${attrs.join(" ")}${span(n)}>`);
        if (n.spells) {
            L.push(
                `${indent}  <spells>`,
                ...n.spells.map((t) => `${indent}    <spell${span(t)}/>`),
                `${indent}  </spells>`,
            );
        }
        if (n.parents) {
            L.push(
                `${indent}  <parents>`,
                ...n.parents.map((p) => `${indent}    <parent for="${esc(p)}"/>`),
                `${indent}  </parents>`,
            );
        }
        if (n.color !== undefined) L.push(`${indent}  ${vizColor(n.color)}`);
        for (const t of n.colors ?? []) L.push(`${indent}  ${vizColor(t.value, t)}`);
        if (n.pos !== false) {
            const z = n.z === undefined ? "" : ` z="${num(n.z)}"`;
            L.push(`${indent}  <viz:position x="${num(n.x)}" y="${num(H - n.y)}"${z}/>`);
        }
        for (const t of n.positions ?? [])
            L.push(`${indent}  <viz:position x="${num(t.value.x)}" y="${num(H - t.value.y)}"${span(t)}/>`);
        if (n.size !== undefined) L.push(`${indent}  <viz:size value="${n.size}"/>`);
        for (const t of n.sizes ?? []) L.push(`${indent}  <viz:size value="${t.value}"${span(t)}/>`);
        if (n.shape !== undefined) {
            const uri = n.uri === undefined ? "" : ` uri="${esc(n.uri)}"`;
            L.push(`${indent}  <viz:shape value="${n.shape}"${uri}/>`);
        }
        if (n.children) {
            L.push(`${indent}  <nodes>`);
            for (const c of n.children) writeNode(c, `${indent}    `);
            L.push(`${indent}  </nodes>`);
        }
        L.push(`${indent}</node>`);
    };
    for (const n of nodes) writeNode(n, "      ");
    L.push("    </nodes>", "    <edges>");
    for (const e of edges) {
        const attrs = [`id="${esc(e.id)}"`, `source="${esc(e.source)}"`, `target="${esc(e.target)}"`];
        for (const k of [
            "type",
            "kind",
            "label",
            "weight",
            "start",
            "end",
            "startopen",
            "endopen",
            "timestamp",
            "timestamps",
        ])
            if (e[k] !== undefined) attrs.push(`${k}="${esc(e[k])}"`);
        const viz = [];
        if (e.attvalues) {
            viz.push(
                "<attvalues>",
                ...e.attvalues.map((v) => `  <attvalue for="${esc(v.for)}" value="${esc(v.value)}"${span(v)}/>`),
                "</attvalues>",
            );
        }
        if (e.color !== undefined) viz.push(vizColor(e.color));
        if (e.thickness !== undefined) viz.push(`<viz:thickness value="${e.thickness}"/>`);
        if (e.shape !== undefined) viz.push(`<viz:shape value="${e.shape}"/>`);
        if (viz.length === 0) {
            L.push(`      <edge ${attrs.join(" ")}/>`);
        } else {
            L.push(`      <edge ${attrs.join(" ")}>`, ...viz.map((v) => `        ${v}`), "      </edge>");
        }
    }
    L.push("    </edges>", "  </graph>", "</gexf>", "");
    return L.join("\n");
}

const anchors = () =>
    ANCHORS.map((a) => ({ id: a.id, x: a.x, y: a.y, color: NEUTRAL_FILL, size: a.size / 2, shape: "disc" }));
const neutralNode = (id, x, y, extra = {}) => ({
    id,
    x,
    y,
    color: NEUTRAL_FILL,
    size: NODE_SIZE,
    shape: "disc",
    ...extra,
});
const captionNode = (id, x, y, text) => ({
    id: `cap-${id}`,
    x,
    y,
    label: text,
    color: CAPTION_FILL,
    size: CAPTION_SIZE,
    shape: "disc",
});
/**
 * Where a caption goes: captionDy below the specimen, further for a node too big for that.
 * @param cell - the specimen's cell
 * @param [radius] - the specimen node's radius
 * @returns the caption's y
 */
const captionY = (cell, radius = NODE_SIZE) => cell.y + Math.max(layout.captionDy, radius + CAPTION_SIZE + 4);

/**
 * A node sheet: one node per specimen, each the neutral node with one setting.
 * @param specs - [{ id, prop, value, node: (overrides of the neutral node, or a function of the cell giving them), radius? }]
 * @param [columns] - grid columns (default the layout's)
 * @param [count] - grid cells (default one per specimen; more leaves cells for specimens added after)
 * @returns the sheet's nodes and edges
 */
function nodeSheet(specs, columns = undefined, count = specs.length) {
    const cs = cells(count, columns);
    const nodes = anchors();
    specs.forEach((s, i) => {
        const c = cs[i];
        const extra = typeof s.node === "function" ? s.node(c) : s.node;
        const node = s.id === "default" ? { id: "default", x: c.x, y: c.y } : neutralNode(s.id, c.x, c.y, extra);
        nodes.push(node, captionNode(s.id, c.x, captionY(c, s.radius), caption(s.prop, s.value)));
        for (const extra of s.extra?.(c) ?? []) nodes.push(extra);
    });
    return { nodes, edges: [] };
}

const endNode = (id, p, color = NEUTRAL_FILL, size = END_SIZE) => ({ id, x: p.x, y: p.y, color, size, shape: "disc" });
/** The neutral edge: weight and thickness 1.5, the neutral color, solid. */
const NEUTRAL_EDGE_VIZ = { weight: N.edgeWidth, thickness: N.edgeWidth, color: NEUTRAL_EDGE, shape: "solid" };

/**
 * An edge sheet: one edge per specimen between its own two neutral end nodes `<id>-s` and `<id>-t`.
 * @param specs - [{ id, prop, value, edge: (overrides of the neutral edge), ends?: { s, t } (end node overrides), more?: (cell) => { nodes, edges } }]
 * @param [columns] - grid columns (default the layout's)
 * @returns the sheet's nodes and edges
 */
function edgeSheet(specs, columns = undefined) {
    const cs = cells(specs.length, columns);
    const nodes = anchors();
    const edges = [];
    specs.forEach((s, i) => {
        const c = cs[i];
        const sId = `${s.id}-s`;
        const tId = `${s.id}-t`;
        if (!s.noEdge) {
            nodes.push({ ...endNode(sId, c.source), ...s.ends?.s });
            if (!s.loop) nodes.push({ ...endNode(tId, c.target), ...s.ends?.t });
            const base = s.id === "default" ? {} : NEUTRAL_EDGE_VIZ;
            edges.push({ id: s.id, source: sId, target: s.loop ? sId : tId, ...base, ...s.edge });
        }
        const more = s.more?.(c, sId, tId) ?? { nodes: [], edges: [] };
        nodes.push(...more.nodes);
        edges.push(...more.edges);
        nodes.push(captionNode(s.id, c.x, captionY(c, END_SIZE), caption(s.prop, s.value)));
    });
    return { nodes, edges };
}

// ------------------------------------------------------------------ the sheets

const HUES = {
    red: [255, 0, 0],
    green: [0, 128, 0],
    blue: [0, 0, 255],
    yellow: [255, 255, 0],
    cyan: [0, 255, 255],
    magenta: [255, 0, 255],
    orange: [255, 128, 0],
    purple: [128, 0, 128],
    white: [255, 255, 255],
    black: [0, 0, 0],
    gray: [128, 128, 128],
    brown: [139, 69, 19],
};
const RED = HUES.red;
const BLUE = HUES.blue;

/** The sheet categories (graph-io/test/fidelity/specimens/sheets.ts); a SHEETS key is one, or one with a suffix. */
const CATEGORIES = [
    "specimen-node-shapes",
    "specimen-node-fills-borders",
    "specimen-node-sizes-opacity",
    "specimen-labels",
    "specimen-edges-lines",
    "specimen-arrows",
    "specimen-edge-labels",
    "specimen-groups",
    "specimen-images-charts",
];
const SHEETS = {};

SHEETS["specimen-node-shapes"] = {
    about: "Every viz:shape a GEXF node can have (image is on the images sheet).",
    defaultedgetype: "undirected",
    ...nodeSheet([
        { id: "default", prop: "shape", value: "unset" },
        ...SCHEMA["viz:shape (node)"]
            .filter((v) => v !== "image")
            .map((v) => ({ id: `shape-${v}`, prop: "shape", value: v, node: { shape: v } })),
    ]),
};

SHEETS["specimen-node-fills-borders"] = {
    about: "viz:color on nodes: hues as r/g/b, and each color syntax. GEXF has no node border: Gephi draws one from its Preview settings (the pages).",
    defaultedgetype: "undirected",
    ...nodeSheet([
        { id: "default", prop: "color", value: "unset" },
        ...Object.entries(HUES).map(([name, c]) => ({
            id: `fill-${name}`,
            prop: "rgb",
            value: c.join(","),
            node: { color: c },
        })),
        { id: "color-hex-lower", prop: "hex", value: "#e41a1c", node: { color: { hex: "#e41a1c" } } },
        { id: "color-hex-upper", prop: "hex", value: "#377EB8", node: { color: { hex: "#377EB8" } } },
        { id: "color-hex-short", prop: "hex", value: "#f80", node: { color: { hex: "#f80" } } },
        { id: "color-hex-alpha", prop: "hex", value: "#4daf4a80", node: { color: { hex: "#4daf4a80" } } },
        { id: "color-hex-nohash", prop: "hex", value: "984ea3", node: { color: { hex: "984ea3" } } },
        { id: "color-rgb-a-1", prop: "rgba", value: "0,0,255,1", node: { color: [0, 0, 255, 1] } },
        {
            id: "color-hex-and-rgb",
            prop: "rgb+hex",
            value: "255,0,0+#0000ff",
            node: { color: { r: 255, g: 0, b: 0, hex: "#0000ff" } },
        },
    ]),
};

SHEETS["specimen-node-sizes-opacity"] = {
    about: "viz:size (a radius), viz:color's alpha, viz:position z, and a node with no position.",
    defaultedgetype: "undirected",
    ...nodeSheet([
        { id: "default", prop: "size", value: "unset" },
        ...[0, 1, 2, 4, 8, 12.5, 18, 25, 35].map((v) => ({
            id: `size-${String(v).replace(".", "-")}`,
            prop: "size",
            value: v,
            node: { size: v },
            radius: v,
        })),
        ...[0, 0.25, 0.5, 0.75].map((a) => ({
            id: `alpha-${String(a).replace(".", "-")}`,
            prop: "a",
            value: a,
            node: { color: [...RED, a] },
        })),
        { id: "alpha-1", prop: "a", value: 1, node: { color: [...RED, 1] } },
        { id: "position-z", prop: "z", value: 100, node: { z: 100 } },
        { id: "position-none", prop: "position", value: "unset", node: { pos: false } },
    ]),
};

/**
 * 33 characters: Gephi's shorten cuts a label only when it is at least max-char + 3 long (30 + 3 by default), to
 * its first max-char characters and "...". Short enough to fit a 5-column cell.
 */
const LONG = "a label of thirty-three chars ok!";
SHEETS["specimen-labels"] = {
    about: "Node labels: the label attribute's text, and its size, which Gephi derives from the node's size. Font, color, outline and box are Gephi Preview settings (the pages).",
    defaultedgetype: "undirected",
    ...nodeSheet(
        [
            { id: "default", prop: "label", value: "unset" },
            { id: "label-text", prop: "label", value: "Label", node: { label: "Label" } },
            { id: "label-empty", prop: "label", value: "empty", node: { label: "" } },
            { id: "label-words", prop: "label", value: "two words", node: { label: "two words" } },
            { id: "label-entity", prop: "label", value: "entities", node: { label: "a & b <c>" } },
            { id: "label-digits", prop: "label", value: "12345", node: { label: "12345" } },
            { id: "label-newline", prop: "label", value: "newline", node: { label: "line one\nline two" } },
            { id: "label-long", prop: "label", value: "33 chars", node: { label: LONG } },
            ...[5, 10, 25].map((v) => ({
                id: `label-node-size-${v}`,
                prop: "size",
                value: v,
                node: { label: "Label", size: v },
                radius: v,
            })),
            { id: "label-on-red", prop: "fill", value: "red", node: { label: "Label", color: RED } },
            {
                id: "label-overlap",
                prop: "overlap",
                value: "two labels",
                node: { label: "larger node label", size: NODE_SIZE },
                extra: (c) => [
                    neutralNode("label-overlap-small", c.x + 8, c.y + 6, { label: "smaller node label", size: 8 }),
                ],
            },
        ],
        5,
    ),
};

const EDGE_LINE_SPECS = [
    { id: "default", prop: "edge", value: "unset" },
    ...[0.5, 1, 2, 4, 8].map((v) => ({
        id: `weight-${String(v).replace(".", "-")}`,
        prop: "weight",
        value: v,
        edge: { weight: v },
    })),
    ...[1, 4, 8].map((v) => ({ id: `thickness-${v}`, prop: "thickness", value: v, edge: { thickness: v } })),
    { id: "color-red", prop: "rgb", value: "255,0,0", edge: { color: RED } },
    { id: "color-blue", prop: "rgb", value: "0,0,255", edge: { color: BLUE } },
    { id: "color-hex", prop: "hex", value: "#00a000", edge: { color: { hex: "#00a000" } } },
    { id: "color-alpha-0-5", prop: "a", value: 0.5, edge: { color: [...RED, 0.5] } },
    { id: "end-colors", prop: "ends", value: "red,blue", ends: { s: { color: RED }, t: { color: BLUE } } },
    ...SCHEMA["viz:shape (edge)"].map((v) => ({ id: `shape-${v}`, prop: "shape", value: v, edge: { shape: v } })),
    { id: "self-loop", prop: "loop", value: "self", loop: true },
    {
        id: "parallel-same",
        prop: "parallel",
        value: "2 same",
        more: (c, s, t) => ({
            nodes: [],
            edges: [{ id: "parallel-same-2", source: s, target: t, ...NEUTRAL_EDGE_VIZ }],
        }),
    },
    {
        id: "parallel-kind",
        prop: "parallel",
        value: "2 kinds",
        edge: { kind: "a" },
        more: (c, s, t) => ({
            nodes: [],
            edges: [{ id: "parallel-kind-2", source: s, target: t, kind: "b", ...NEUTRAL_EDGE_VIZ }],
        }),
    },
    {
        id: "reverse-pair",
        prop: "pair",
        value: "a-b b-a",
        more: (c, s, t) => ({
            nodes: [],
            edges: [{ id: "reverse-pair-2", source: t, target: s, ...NEUTRAL_EDGE_VIZ }],
        }),
    },
];
SHEETS["specimen-edges-lines"] = {
    about: "Edges: weight (which Gephi draws as width), viz:thickness, viz:color, viz:shape, end node colors (Gephi mixes them), self-loops and parallel edges.",
    defaultedgetype: "undirected",
    ...edgeSheet(EDGE_LINE_SPECS),
};

/**
 * The arrows sheet's specimens, under one graph default edge type.
 * @param dflt - the graph's defaultedgetype
 * @returns the specimens
 */
const arrowSpecs = (dflt) => [
    { id: "default", prop: "edge", value: "unset" },
    ...SCHEMA["edge type"].map((v) => ({ id: `type-${v}`, prop: "type", value: v, edge: { type: v } })),
    { id: "type-default", prop: "type", value: `default (${dflt})` },
    {
        id: "reverse-pair",
        prop: "pair",
        value: "a-b b-a",
        more: (c, s, t) => ({
            nodes: [],
            edges: [{ id: "reverse-pair-2", source: t, target: s, ...NEUTRAL_EDGE_VIZ }],
        }),
    },
    ...[0.5, 4].map((w) => ({
        id: `weight-${String(w).replace(".", "-")}`,
        prop: "weight",
        value: w,
        edge: { weight: w },
    })),
    { id: "target-size-12", prop: "target size", value: 12, ends: { t: { size: 12 } } },
    { id: "self-loop", prop: "loop", value: "self", loop: true },
    { id: "color-red", prop: "rgb", value: "255,0,0", edge: { color: RED } },
];
/**
 * The arrows sheet: "type-default" is the neutral edge with no type attribute, so the graph's default applies.
 * @param dflt - the graph's defaultedgetype
 * @returns the sheet's nodes and edges
 */
const arrowSheet = (dflt) => edgeSheet(arrowSpecs(dflt));
SHEETS["specimen-edges-lines-nonpositive"] = {
    about: "Edge weights of 0 and below: when the smallest weight is 0 or less, Gephi adds |smallest| + 1 to every edge's weight, so they are on a sheet of their own.",
    varies: "weights 0 and -2 on one sheet",
    defaultedgetype: "undirected",
    ...edgeSheet([
        { id: "default", prop: "edge", value: "unset" },
        ...[1, 4, 0, -2].map((v) => ({
            id: `weight-${String(v).replace("-", "minus-")}`,
            prop: "weight",
            value: v,
            edge: { weight: v },
        })),
    ]),
};

SHEETS["specimen-arrows"] = {
    about: "Arrowheads: GEXF has no arrow vocabulary; an edge's type (and the graph's defaultedgetype) decides whether Gephi draws one, at the target.",
    defaultedgetype: "directed",
    ...arrowSheet("directed"),
};
SHEETS["specimen-arrows-undirected"] = {
    about: "The arrows sheet with defaultedgetype=undirected.",
    defaultedgetype: "undirected",
    ...arrowSheet("undirected"),
};
SHEETS["specimen-arrows-mutual"] = {
    about: "The arrows sheet with defaultedgetype=mutual.",
    defaultedgetype: "mutual",
    ...arrowSheet("mutual"),
};

SHEETS["specimen-edge-labels"] = {
    about: "Edge labels: the label attribute. Gephi's Preview hides edge labels unless edge.label.show is on (the pages).",
    defaultedgetype: "undirected",
    ...edgeSheet(
        [
            { id: "default", prop: "label", value: "unset" },
            { id: "label-text", prop: "label", value: "Label", edge: { label: "Label" } },
            { id: "label-empty", prop: "label", value: "empty", edge: { label: "" } },
            { id: "label-entity", prop: "label", value: "entities", edge: { label: "a & b <c>" } },
            { id: "label-long", prop: "label", value: "33 chars", edge: { label: LONG } },
            { id: "label-on-red", prop: "rgb", value: "255,0,0", edge: { label: "Label", color: RED } },
            { id: "label-on-weight-4", prop: "weight", value: 4, edge: { label: "Label", weight: 4 } },
            { id: "label-on-loop", prop: "loop", value: "self", loop: true, edge: { label: "Label" } },
        ],
        5,
    ),
};

/**
 * A group specimen: a parent at the cell's center and children around it.
 * @param id - the node's id
 * @param x - sheet x
 * @param y - sheet y
 * @param [extra] - overrides of the neutral child
 * @returns the node
 */
const kid = (id, x, y, extra = {}) => neutralNode(id, x, y, { size: 6, ...extra });
SHEETS["specimen-groups"] = {
    about: "GEXF 1.3's node hierarchy: nodes nested in a node's <nodes>, pid, and <parents>. GEXF stores no group box.",
    defaultedgetype: "undirected",
    ...(() => {
        const specs = [
            { id: "default", prop: "hierarchy", value: "none" },
            { id: "group-nested", prop: "nodes", value: "nested" },
            { id: "group-pid", prop: "pid", value: "parent id" },
            { id: "group-deep", prop: "nodes", value: "3 levels" },
            { id: "group-empty", prop: "nodes", value: "empty" },
            { id: "group-edge-in", prop: "edge", value: "child-child" },
            { id: "group-parents", prop: "parents", value: "2 parents" },
        ];
        const cs = cells(specs.length);
        const nodes = anchors();
        const edges = [];
        specs.forEach((s, i) => {
            const c = cs[i];
            const p = { ...neutralNode(s.id, c.x, c.y), size: 12 };
            if (s.id === "default") {
                nodes.push({ id: "default", x: c.x, y: c.y });
            } else if (s.id === "group-nested" || s.id === "group-edge-in") {
                p.children = [kid(`${s.id}-a`, c.x - 25, c.y - 10), kid(`${s.id}-b`, c.x + 25, c.y - 10)];
                nodes.push(p);
                if (s.id === "group-edge-in")
                    edges.push({ id: `${s.id}-e`, source: `${s.id}-a`, target: `${s.id}-b`, ...NEUTRAL_EDGE_VIZ });
            } else if (s.id === "group-pid") {
                nodes.push(
                    p,
                    kid(`${s.id}-a`, c.x - 25, c.y - 10, { pid: s.id }),
                    kid(`${s.id}-b`, c.x + 25, c.y - 10, { pid: s.id }),
                );
            } else if (s.id === "group-deep") {
                p.children = [
                    {
                        ...kid(`${s.id}-a`, c.x - 25, c.y - 10, { size: 8 }),
                        children: [kid(`${s.id}-a-a`, c.x - 25, c.y - 30, { size: 4 })],
                    },
                ];
                nodes.push(p);
            } else if (s.id === "group-parents") {
                // GEXF 1.3's <parents>: one child of two parents (the parent and a second, smaller one beside it)
                nodes.push(
                    p,
                    kid(`${s.id}-q`, c.x + 30, c.y + 10),
                    kid(`${s.id}-a`, c.x, c.y - 25, { parents: [s.id, `${s.id}-q`] }),
                );
            } else if (s.id === "group-empty") {
                p.children = [];
                nodes.push(p);
            }
            nodes.push(captionNode(s.id, c.x, captionY(c, 12), caption(s.prop, s.value)));
        });
        return { nodes, edges };
    })(),
};

/** A 16 x 16 red PNG, as a data: URI. */
const RED_PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGP8z4AfMBGQZxhVMKqAAgEARzQBH0x8VawAAAAASUVORK5CYII=";
SHEETS["specimen-images-charts"] = {
    about: "viz:shape image with its uri (a data: URI and a web URL), and image with no uri. GEXF has no charts.",
    defaultedgetype: "undirected",
    ...nodeSheet([
        { id: "default", prop: "shape", value: "unset" },
        { id: "image-data-uri", prop: "image", value: "data: png", node: { shape: "image", uri: RED_PNG } },
        {
            id: "image-url",
            prop: "image",
            value: "https url",
            node: { shape: "image", uri: "https://graphty.app/favicon.png" },
        },
        { id: "image-no-uri", prop: "image", value: "no uri", node: { shape: "image" } },
    ]),
};

/**
 * The node colors sheet's r/g/b and a specimens (hex is GEXF 1.3's), for the sheets in the older GEXF versions.
 * @returns the specimens
 */
const rgbSpecs = () => [
    { id: "default", prop: "color", value: "unset" },
    ...Object.entries(HUES).map(([name, c]) => ({
        id: `fill-${name}`,
        prop: "rgb",
        value: c.join(","),
        node: { color: c },
    })),
    { id: "color-rgb-a-1", prop: "rgba", value: "0,0,255,1", node: { color: [0, 0, 255, 1] } },
    { id: "size-25", prop: "size", value: 25, node: { size: 25 }, radius: 25 },
    { id: "shape-square", prop: "shape", value: "square", node: { shape: "square" } },
];
SHEETS["specimen-node-fills-borders-gexf12"] = {
    about: "The node colors sheet written in GEXF 1.2draft (namespace http://www.gexf.net/1.2draft and its viz module), the version most files in the wild use. 1.2draft has no hex colors.",
    varies: "GEXF 1.2draft namespaces",
    defaultedgetype: "undirected",
    version: "1.2draft",
    ...nodeSheet(rgbSpecs()),
};
SHEETS["specimen-node-fills-borders-gexf11"] = {
    about: "The node colors sheet written in GEXF 1.1draft (namespace http://www.gexf.net/1.1draft and its viz module).",
    varies: "GEXF 1.1draft namespaces",
    defaultedgetype: "undirected",
    version: "1.1draft",
    ...nodeSheet(rgbSpecs()),
};

/**
 * A dynamic graph's timed viz values. Gephi's Preview draws a static graph: every node and edge whatever its time
 * interval, and of several timed values of one viz element the one listed last in the file (not the latest in time).
 */
SHEETS["specimen-node-sizes-opacity-dynamic"] = {
    about: "A dynamic GEXF (mode=dynamic, timeformat=double): nodes and edges with time intervals, and viz values listed several times with their own intervals.",
    varies: "mode=dynamic: time intervals and timed viz values",
    defaultedgetype: "undirected",
    dynamic: true,
    ...(() => {
        const timed = (value, start, end) => ({ value, start, end });
        const sheet = nodeSheet(
            [
                { id: "default", prop: "spells", value: "none" },
                {
                    id: "color-timed-in-order",
                    prop: "colors",
                    value: "red 1-3, blue 3-5",
                    node: { color: undefined, colors: [timed(RED, 1, 3), timed(BLUE, 3, 5)] },
                },
                {
                    id: "color-timed-last-earlier",
                    prop: "colors",
                    value: "blue 3-5, red 1-3",
                    node: { color: undefined, colors: [timed(BLUE, 3, 5), timed(RED, 1, 3)] },
                },
                {
                    id: "size-timed",
                    prop: "sizes",
                    value: "6 1-2, 18 2-3",
                    node: { size: undefined, sizes: [timed(6, 1, 2), timed(18, 2, 3)] },
                    radius: 18,
                },
                {
                    id: "position-timed",
                    prop: "positions",
                    value: "60px up 1-2, here 2-3",
                    node: (c) => ({
                        pos: false,
                        positions: [timed({ x: c.x, y: c.y - 60 }, 1, 2), timed({ x: c.x, y: c.y }, 2, 3)],
                    }),
                },
                { id: "node-interval", prop: "start-end", value: "1-2", node: { start: 1, end: 2 } },
                {
                    id: "node-spells",
                    prop: "spells",
                    value: "1-2, 4-5",
                    node: {
                        spells: [
                            { start: 1, end: 2 },
                            { start: 4, end: 5 },
                        ],
                    },
                },
            ],
            undefined,
            8,
        );
        // one edge specimen in the next cell: an edge with a time interval between two neutral end nodes
        const c = cells(8)[7];
        sheet.nodes.push(
            endNode("edge-interval-s", c.source),
            endNode("edge-interval-t", c.target),
            captionNode("edge-interval", c.x, captionY(c, END_SIZE), caption("edge start-end", "1-2")),
        );
        sheet.edges.push({
            id: "edge-interval",
            source: "edge-interval-s",
            target: "edge-interval-t",
            start: 1,
            end: 2,
            ...NEUTRAL_EDGE_VIZ,
        });
        return sheet;
    })(),
};

/** The edges sheet in GEXF 1.2draft, the version most files in the wild use (1.2draft has no hex colors). */
SHEETS["specimen-edges-lines-gexf12"] = {
    about: "The edges sheet written in GEXF 1.2draft (namespace http://www.gexf.net/1.2draft and its viz module): weight, viz:thickness, viz:color, viz:shape, loops and parallel edges. 1.2draft has no hex colors.",
    varies: "GEXF 1.2draft namespaces",
    defaultedgetype: "undirected",
    version: "1.2draft",
    ...edgeSheet(EDGE_LINE_SPECS.filter((s) => s.id !== "color-hex")),
};

/**
 * A dynamic edge weight: the attribute "weight" declared mode="dynamic" with timed attvalues. Gephi then reads every
 * edge's weight from its attvalues (an edge's static weight attribute is not read).
 */
SHEETS["specimen-edges-lines-dynamic-weight"] = {
    about: "A dynamic GEXF whose edge weight is a dynamic attribute (<attributes class=edge mode=dynamic>, attribute id weight) with timed attvalues, and edges with only a static weight attribute or none.",
    varies: "dynamic edge weight (timed attvalues)",
    defaultedgetype: "undirected",
    dynamic: true,
    attributes: [
        '<attributes class="edge" mode="dynamic">',
        '  <attribute id="weight" title="Weight" type="float"/>',
        "</attributes>",
    ],
    ...(() => {
        const timed = (...vs) => vs.map(([value, start, end]) => ({ for: "weight", value, start, end }));
        return edgeSheet([
            { id: "default", prop: "edge", value: "unset" },
            { id: "weight-static-4", prop: "weight", value: "4, no attvalues", edge: { weight: 4 } },
            {
                id: "weight-timed",
                prop: "weights",
                value: "8 1-2, 1 2-3",
                edge: { weight: undefined, attvalues: timed([8, 1, 2], [1, 2, 3]) },
            },
            {
                id: "weight-timed-last-earlier",
                prop: "weights",
                value: "1 2-3, 8 1-2",
                edge: { weight: undefined, attvalues: timed([1, 2, 3], [8, 1, 2]) },
            },
            {
                id: "weight-timed-one",
                prop: "weights",
                value: "4 1-3",
                edge: { weight: undefined, attvalues: timed([4, 1, 3]) },
            },
        ]);
    })(),
};

/** A dynamic graph in timerepresentation="timestamp": element timestamps and timestamped viz values. */
SHEETS["specimen-node-sizes-opacity-timestamps"] = {
    about: "A dynamic GEXF with timerepresentation=timestamp (timeformat=double): nodes and edges with timestamp / timestamps, a timestamped spell, and viz values listed several times with their own timestamps.",
    varies: "timerepresentation=timestamp: timestamps and timestamped viz values",
    defaultedgetype: "undirected",
    dynamic: true,
    timestamps: true,
    ...(() => {
        const at = (value, timestamp) => ({ value, timestamp });
        const sheet = nodeSheet(
            [
                { id: "default", prop: "timestamps", value: "none" },
                { id: "node-timestamp", prop: "timestamp", value: "2", node: { timestamp: 2 } },
                { id: "node-timestamps", prop: "timestamps", value: "[1,3]", node: { timestamps: "[1,3]" } },
                {
                    id: "node-spell-timestamp",
                    prop: "spell timestamp",
                    value: "5",
                    node: { spells: [{ timestamp: 5 }] },
                },
                {
                    id: "color-timestamped",
                    prop: "colors",
                    value: "red @1, blue @4",
                    node: { color: undefined, colors: [at(RED, 1), at(BLUE, 4)] },
                },
                {
                    id: "color-timestamped-last-earlier",
                    prop: "colors",
                    value: "blue @4, red @1",
                    node: { color: undefined, colors: [at(BLUE, 4), at(RED, 1)] },
                },
                {
                    id: "size-timestamped",
                    prop: "sizes",
                    value: "6 @1, 18 @2",
                    node: { size: undefined, sizes: [at(6, 1), at(18, 2)] },
                    radius: 18,
                },
            ],
            undefined,
            8,
        );
        const c = cells(8)[7];
        sheet.nodes.push(
            endNode("edge-timestamps-s", c.source),
            endNode("edge-timestamps-t", c.target),
            captionNode("edge-timestamps", c.x, captionY(c, END_SIZE), caption("edge timestamps", "[2]")),
        );
        sheet.edges.push({
            id: "edge-timestamps",
            source: "edge-timestamps-s",
            target: "edge-timestamps-t",
            timestamps: "[2]",
            ...NEUTRAL_EDGE_VIZ,
        });
        return sheet;
    })(),
};

/**
 * GEXF 1.2draft's open interval bounds (`startopen` / `endopen` on a node, an edge and a spell), which Gephi 0.11.3
 * reports as deprecated and still draws: every element is drawn, as in a closed-interval dynamic graph.
 */
SHEETS["specimen-node-sizes-opacity-gexf12-open"] = {
    about: "A dynamic GEXF 1.2draft (mode=dynamic, timeformat=double) whose nodes, spell and edge have open interval bounds (startopen / endopen).",
    varies: "GEXF 1.2draft open interval bounds (startopen, endopen)",
    defaultedgetype: "undirected",
    version: "1.2draft",
    dynamic: true,
    ...(() => {
        const sheet = nodeSheet(
            [
                { id: "default", prop: "interval", value: "none" },
                { id: "node-startopen", prop: "startopen-end", value: "1-2", node: { startopen: 1, end: 2 } },
                { id: "node-endopen", prop: "start-endopen", value: "1-2", node: { start: 1, endopen: 2 } },
                {
                    id: "node-spell-open",
                    prop: "spell startopen-endopen",
                    value: "1-2",
                    node: { spells: [{ startopen: 1, endopen: 2 }] },
                },
            ],
            undefined,
            5,
        );
        const c = cells(5)[4];
        sheet.nodes.push(
            endNode("edge-startopen-s", c.source),
            endNode("edge-startopen-t", c.target),
            captionNode("edge-startopen", c.x, captionY(c, END_SIZE), caption("edge startopen-end", "1-2")),
        );
        sheet.edges.push({
            id: "edge-startopen",
            source: "edge-startopen-s",
            target: "edge-startopen-t",
            startopen: 1,
            end: 2,
            ...NEUTRAL_EDGE_VIZ,
        });
        return sheet;
    })(),
};

/** GEXF 1.3's mode="slice": one time slice of a graph (the graph's timestamp), with element intervals outside it. */
SHEETS["specimen-node-sizes-opacity-slice"] = {
    about: "A GEXF 1.3 slice (mode=slice, timeformat=double, graph timestamp 3): a node and an edge whose intervals lie outside the slice, and one inside it.",
    varies: "mode=slice (graph timestamp 3)",
    defaultedgetype: "undirected",
    slice: 3,
    ...(() => {
        const sheet = nodeSheet(
            [
                { id: "default", prop: "interval", value: "none" },
                { id: "node-in-slice", prop: "start-end", value: "2-4", node: { start: 2, end: 4 } },
                { id: "node-outside-slice", prop: "start-end", value: "5-6", node: { start: 5, end: 6 } },
            ],
            undefined,
            4,
        );
        const c = cells(4)[3];
        sheet.nodes.push(
            endNode("edge-outside-slice-s", c.source),
            endNode("edge-outside-slice-t", c.target),
            captionNode("edge-outside-slice", c.x, captionY(c, END_SIZE), caption("edge start-end", "5-6")),
        );
        sheet.edges.push({
            id: "edge-outside-slice",
            source: "edge-outside-slice-s",
            target: "edge-outside-slice-t",
            start: 5,
            end: 6,
            ...NEUTRAL_EDGE_VIZ,
        });
        return sheet;
    })(),
};

// ------------------------------------------------------------------ the pages: each file under each Preview setting

/** The Preview every page starts from: Gephi's defaults with node labels shown and label overlap avoidance off. */
const BASE = { "node.label.show": "true", "node.label.avoidOverlap": "false" };

/** Per category: the sheet files (pages under BASE) and the Preview settings drawn as further pages. */
const PAGES = {
    "specimen-node-shapes": [{}, { "node.per.node.opacity": "true" }],
    "specimen-node-fills-borders": [
        {},
        // the width is read only with node.border.fixed (SizeUtils.getBorderWidth); otherwise it is 0.08 x the node's size
        { "node.border.fixed": "true", "node.border.width": "0.0" },
        { "node.border.fixed": "true", "node.border.width": "4.0" },
        { "node.border.color": "#ff0000" },
        { "node.border.color": "parent" },
        { "node.border.color": "lighter" },
        { "node.border.fixed": "true" },
    ],
    "specimen-node-sizes-opacity": [{}, { "node.per.node.opacity": "true" }, { "node.opacity": "40.0" }],
    "specimen-labels": [
        {},
        { "node.label.show": "false" },
        { "node.label.proportinalSize": "false" },
        { "node.label.color": "parent" },
        { "node.label.color": "original" },
        { "node.label.color": "#ff0000" },
        { "node.label.shorten": "true" },
        { "node.label.shorten": "true", "node.label.max-char": "8" },
        { "node.label.outline.size": "4.0", "node.label.outline.color": "#ff8000" },
        {
            "node.label.outline.size": "4.0",
            "node.label.outline.color": "#ff8000",
            "node.label.outline.opacity": "30.0",
        },
        { "node.label.box": "true" },
        { "node.label.box": "true", "node.label.box.color": "#ffff00" },
        { "node.label.box": "true", "node.label.box.opacity": "40.0" },
        { "node.label.customFont": "true", "node.label.font": "DejaVu Serif,bold,12" },
        { "node.label.avoidOverlap": "true" },
        { "node.label.avoidOverlap": "true", "node.label.overlapGridSize": "40" },
        // the other modes of the DependantColor outline and box colors, and the other Font styles
        ...["parent", "darker", "lighter"].map((m) => ({
            "node.label.outline.size": "4.0",
            "node.label.outline.color": m,
        })),
        ...["darker", "lighter"].map((m) => ({ "node.label.box": "true", "node.label.box.color": m })),
        ...["italic", "bolditalic"].map((st) => ({
            "node.label.customFont": "true",
            "node.label.font": `DejaVu Serif,${st},12`,
        })),
        // a plain custom font, at a size other than the default's
        { "node.label.customFont": "true", "node.label.font": "DejaVu Serif,plain,24" },
    ],
    "specimen-edges-lines": [
        {},
        { "edge.curved": "false" },
        { "edge.color": "source" },
        { "edge.color": "target" },
        { "edge.color": "original" },
        { "edge.color": "#ff0000" },
        { "edge.opacity": "40.0" },
        { "edge.use-weight": "false" },
        { "edge.thickness": "3.0" },
        { "edge.rescale-weight": "true" },
        { "edge.rescale-weight": "true", "edge.rescale-weight.min": "2.0", "edge.rescale-weight.max": "4.0" },
        { "edge.show": "false" },
    ],
    "specimen-arrows": [
        {},
        { "arrow.size": "8.0" },
        { "arrow.size": "0.0" },
        { "edge.radius": "10.0" },
        { "edge.curved": "false" },
    ],
    "specimen-arrows-undirected": [{}],
    "specimen-arrows-mutual": [{}],
    "specimen-edges-lines-nonpositive": [{}],
    "specimen-edge-labels": [
        {},
        { "edge.label.show": "true" },
        { "edge.label.show": "true", "edge.label.color": "#ff0000" },
        { "edge.label.show": "true", "edge.label.color": "parent" },
        { "edge.label.show": "true", "edge.label.outline.size": "3.0", "edge.label.outline.color": "#ff8000" },
        {
            "edge.label.show": "true",
            "edge.label.outline.size": "3.0",
            "edge.label.outline.color": "#ff8000",
            "edge.label.outline.opacity": "30.0",
        },
        { "edge.label.show": "true", "edge.label.shorten": "true", "edge.label.max-char": "8" },
        { "edge.label.show": "true", "edge.label.customFont": "true", "edge.label.font": "DejaVu Serif,italic,14" },
        // the other modes of the DependantColor outline color, edge labels on straight edges, the other Font styles
        ...["parent", "darker", "lighter"].map((m) => ({
            "edge.label.show": "true",
            "edge.label.outline.size": "3.0",
            "edge.label.outline.color": m,
        })),
        { "edge.label.show": "true", "edge.curved": "false" },
        ...["bold", "bolditalic"].map((st) => ({
            "edge.label.show": "true",
            "edge.label.customFont": "true",
            "edge.label.font": `DejaVu Serif,${st},14`,
        })),
        { "edge.label.show": "true", "edge.label.customFont": "true", "edge.label.font": "DejaVu Serif,plain,20" },
    ],
    "specimen-groups": [{}],
    "specimen-node-fills-borders-gexf12": [{}],
    "specimen-node-fills-borders-gexf11": [{}],
    "specimen-node-sizes-opacity-dynamic": [{}],
    "specimen-images-charts": [{}, { "node.per.node.opacity": "true" }],
    "specimen-edges-lines-gexf12": [{}],
    "specimen-edges-lines-dynamic-weight": [{}],
    "specimen-node-sizes-opacity-timestamps": [{}],
    "specimen-node-sizes-opacity-gexf12-open": [{}],
    "specimen-node-sizes-opacity-slice": [{}],
};

/** Preview properties no page sets, and why. */
const NOT_PAGED = {
    "node.border.width":
        "drawn with node.border.fixed (its only effect: unfixed, the border is 0.08 x the node's size)",
    "node.label.max-char": "drawn with node.label.shorten (its only effect)",
    "edge.label.max-char": "drawn with edge.label.shorten (its only effect)",
    "edge.rescale-weight.min": "drawn with edge.rescale-weight (its only effect)",
    "edge.rescale-weight.max": "drawn with edge.rescale-weight (its only effect)",
    "node.label.overlapGridSize": "drawn with node.label.avoidOverlap (its only effect)",
    "node.label.outline.color": "drawn with node.label.outline.size (invisible at size 0)",
    "node.label.outline.opacity": "drawn with node.label.outline.size (invisible at size 0)",
    "node.label.box.color": "drawn with node.label.box",
    "node.label.box.opacity": "drawn with node.label.box",
    "node.label.font": "drawn with node.label.customFont",
    "edge.label.outline.color": "drawn with edge.label.outline.size (invisible at size 0)",
    "edge.label.outline.opacity": "drawn with edge.label.outline.size (invisible at size 0)",
    "edge.label.font": "drawn with edge.label.customFont",
    "edge.label.color": "paged with edge.label.show",
    "edge.label.shorten": "paged with edge.label.show",
    "edge.label.customFont": "paged with edge.label.show",
    "edge.label.outline.size": "paged with edge.label.show",
};

// ------------------------------------------------------------------ write

mkdirSync(out, { recursive: true });
const pages = [];
const pageNo = {};
for (const [key, sheet] of Object.entries(SHEETS)) {
    const file = `${key}.gexf`;
    writeFileSync(
        join(out, file),
        gexf(sheet.nodes, sheet.edges, sheet.defaultedgetype, sheet.about, {
            version: sheet.version,
            dynamic: sheet.dynamic,
            timestamps: sheet.timestamps,
            slice: sheet.slice,
            attributes: sheet.attributes,
        }),
    );
    const category = CATEGORIES.find((c) => key === c || key.startsWith(`${c}-`));
    for (const p of PAGES[key]) {
        const n = (pageNo[category] = (pageNo[category] ?? 0) + 1);
        const id = n === 1 ? category : `${category}-p${n}`;
        const setting = Object.entries(p)
            .map(([k, v]) => `${k}=${v}`)
            .join(" ");
        pages.push({
            id,
            file,
            preview: { ...BASE, ...p },
            varies:
                setting ||
                sheet.varies ||
                (key === category ? "Gephi's defaults" : `defaultedgetype=${sheet.defaultedgetype}`),
        });
    }
}
writeFileSync(
    join(out, "pages.json"),
    `${JSON.stringify(
        {
            about: "The GEXF specimen pages: each sheet file drawn by Gephi under one Preview setting (preview: every property gephi.mjs sets; Gephi's default for the rest). Written by graph-io/test/fidelity/generators/specimens/gexf-gephi.mjs.",
            pages,
        },
        null,
        4,
    )}\n`,
);

// ------------------------------------------------------------------ the vocabulary and its coverage

const specimenIds = (key) => SHEETS[key].nodes.map((n) => n.id).concat(SHEETS[key].edges.map((e) => e.id));
const all = Object.keys(SHEETS).flatMap((k) => specimenIds(k).map((id) => `${k}#${id}`));
const covering = (re) => all.filter((s) => re.test(s.split("#")[1]));
const vocab = { schema: {}, previewProperties: {} };
for (const [what, values] of Object.entries(SCHEMA)) {
    vocab.schema[what] = Object.fromEntries(
        values.map((v) => {
            const re = {
                "viz:shape (node)": v === "image" ? /^image-/ : new RegExp(`^shape-${v}$`),
                "viz:shape (edge)": new RegExp(`^shape-${v}$`),
                "edge type": new RegExp(`^type-${v}$`),
                defaultedgetype: /^type-default$/,
            }[what];
            const hits =
                what === "defaultedgetype"
                    ? Object.keys(SHEETS).filter(
                          (k) => SHEETS[k].defaultedgetype === v && k.startsWith("specimen-arrows"),
                      )
                    : covering(re);
            if (hits.length === 0) throw new Error(`no specimen for ${what} ${v}`);
            return [v, hits];
        }),
    );
}
vocab.schema["viz:color"] = covering(/^(fill|color|alpha)-/);
vocab.schema["viz:size"] = covering(/^size-|^label-node-size-/);
vocab.schema["viz:position"] = covering(/^position-/);
vocab.schema["viz:thickness"] = covering(/^thickness-/);
vocab.schema["edge weight"] = covering(/^weight-/);
vocab.schema["node label"] = covering(/^label-/).filter((s) => !s.startsWith("specimen-edge-labels"));
vocab.schema["edge label"] = covering(/^label-/).filter((s) => s.startsWith("specimen-edge-labels"));
vocab.schema["edge kind"] = covering(/^parallel-kind/);
vocab.schema["node pid / nested nodes"] = covering(/^group-/);
for (const p of PREVIEW.properties) {
    const pagesSetting = pages
        .filter((pg) => pg.varies.split(" ").some((kv) => kv.startsWith(`${p.name}=`)))
        .map((pg) => pg.id);
    const reason = NOT_PAGED[p.name];
    if (pagesSetting.length === 0 && reason === undefined && !(p.name in BASE))
        throw new Error(`no page sets Preview property ${p.name}`);
    vocab.previewProperties[p.name] = {
        type: p.type,
        default: p.default,
        pages: pagesSetting,
        ...(reason ? { note: reason } : {}),
        ...(p.name in BASE ? { base: BASE[p.name] } : {}),
    };
}
vocab.notCovered = {
    "viz:color hex with a":
        'Gephi 0.11.3\'s GEXF importer throws on <viz:color hex=... a=...> ("Color parameter outside of expected range: Green") and opens nothing, so no sheet holding it has an oracle',
    "viz:color r/g/b with a channel missing":
        "schema-valid but Gephi throws the same way; left out for the same reason",
    "Preview simple values background-color and margin":
        "not drawn into the SVG: Gephi's SVG export has no background, and margin only pads the canvas, which the comparator fits on the anchors",
    "Preview simple values edge.arc-curveness and edge.bezier-curveness":
        "not in Gephi's Preview settings (no UI; code only); node.scale.factor, edge.scale.factor, node.label.scale and edge.label.scale are set by refreshPreview from the Overview, not by the user",
    "Preview simple values directed, visibility-ratio and canvas.moving":
        "not style settings: refreshPreview sets directed from the graph, visibility-ratio is an export-time option that drops a share of the nodes (1.0 keeps all), and canvas.moving only skips labels while the interactive preview is dragged",
};
vocab.schema["dynamics (mode=dynamic, start/end, spells, timed viz values)"] = Object.keys(SHEETS)
    .filter((k) => SHEETS[k].dynamic)
    .flatMap((k) => specimenIds(k).map((id) => `${k}#${id}`))
    .filter((s) => !/#(cap-|anchor-)/.test(s));
vocab.schema["node parents"] = covering(/^group-parents$/);
vocab.schema["timerepresentation=timestamp (timestamp, timestamps, timestamped viz values)"] = Object.keys(SHEETS)
    .filter((k) => SHEETS[k].timestamps)
    .flatMap((k) => specimenIds(k).map((id) => `${k}#${id}`))
    .filter((s) => !/#(cap-|anchor-)/.test(s));
vocab.schema["dynamic edge weight (attvalue start/end)"] = covering(/^weight-timed/);
vocab.schema["1.2draft open interval bounds (startopen, endopen)"] = covering(
    /^(node|edge)-(startopen|endopen|spell-open)$/,
);
vocab.schema["mode=slice (graph timestamp)"] = Object.keys(SHEETS)
    .filter((k) => SHEETS[k].slice !== undefined)
    .flatMap((k) => specimenIds(k).map((id) => `${k}#${id}`))
    .filter((s) => !/#(cap-|anchor-)/.test(s));
vocab.schema["GEXF version (namespaces)"] = Object.fromEntries(
    Object.keys(VERSIONS).map((ver) => [ver, Object.keys(SHEETS).filter((k) => (SHEETS[k].version ?? "1.3") === ver)]),
);
writeFileSync(
    join(here, "gexf-gephi-vocabulary.json"),
    `${JSON.stringify({ about: "The GEXF style vocabulary the gexf-gephi specimen sheets cover: the GEXF 1.3 schema's values and Gephi 0.11.3's Preview properties, each with the specimens or pages that draw it. Written by gexf-gephi.mjs from viz.xsd, gexf.xsd and gexf-gephi-preview-properties.json.", ...vocab }, null, 4)}\n`,
);
console.log(`gexf-gephi: ${Object.keys(SHEETS).length} files, ${pages.length} pages, ${all.length} elements`);
