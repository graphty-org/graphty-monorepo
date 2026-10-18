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

/**
 * One sheet's GEXF text.
 * @param nodes - [{ id, x, y, label?, color?: [r,g,b,a?] | { hex, a? }, size?, shape?, uri?, z?, pos?: false, children?, pid? }]
 * @param edges - [{ id, source, target, type?, kind?, label?, weight?, color?, thickness?, shape? }]
 * @param defaultedgetype - the graph's default edge type
 * @param about - the sheet's description, written into <meta>
 * @returns the file's text
 */
function gexf(nodes, edges, defaultedgetype, about) {
    const L = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">',
        '  <meta lastmodifieddate="2026-10-18">',
        "    <creator>graphty gexf-gephi specimen generator</creator>",
        `    <description>${esc(about)}</description>`,
        "  </meta>",
        `  <graph mode="static" defaultedgetype="${defaultedgetype}">`,
        "    <nodes>",
    ];
    const writeNode = (n, indent) => {
        const attrs = [`id="${esc(n.id)}"`];
        if (n.label !== undefined) attrs.push(`label="${esc(n.label)}"`);
        if (n.pid !== undefined) attrs.push(`pid="${esc(n.pid)}"`);
        L.push(`${indent}<node ${attrs.join(" ")}>`);
        if (n.color !== undefined) {
            const c = n.color;
            if (Array.isArray(c)) {
                const a = c.length > 3 ? ` a="${c[3]}"` : "";
                L.push(`${indent}  <viz:color r="${c[0]}" g="${c[1]}" b="${c[2]}"${a}/>`);
            } else {
                L.push(
                    `${indent}  <viz:color ${Object.entries(c)
                        .map(([k, v]) => `${k}="${esc(v)}"`)
                        .join(" ")}/>`,
                );
            }
        }
        if (n.pos !== false) {
            const z = n.z === undefined ? "" : ` z="${num(n.z)}"`;
            L.push(`${indent}  <viz:position x="${num(n.x)}" y="${num(H - n.y)}"${z}/>`);
        }
        if (n.size !== undefined) L.push(`${indent}  <viz:size value="${n.size}"/>`);
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
        for (const k of ["type", "kind", "label", "weight"]) if (e[k] !== undefined) attrs.push(`${k}="${esc(e[k])}"`);
        const viz = [];
        if (e.color !== undefined) {
            const c = e.color;
            viz.push(
                Array.isArray(c)
                    ? `<viz:color r="${c[0]}" g="${c[1]}" b="${c[2]}"${c.length > 3 ? ` a="${c[3]}"` : ""}/>`
                    : `<viz:color ${Object.entries(c)
                          .map(([k, v]) => `${k}="${esc(v)}"`)
                          .join(" ")}/>`,
            );
        }
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
 * @param specs - [{ id, prop, value, node: (overrides of the neutral node), radius? }]
 * @param [columns] - grid columns (default the layout's)
 * @returns the sheet's nodes and edges
 */
function nodeSheet(specs, columns = undefined) {
    const cs = cells(specs.length, columns);
    const nodes = anchors();
    specs.forEach((s, i) => {
        const c = cs[i];
        const node = s.id === "default" ? { id: "default", x: c.x, y: c.y } : neutralNode(s.id, c.x, c.y, s.node);
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

SHEETS["specimen-edges-lines"] = {
    about: "Edges: weight (which Gephi draws as width), viz:thickness, viz:color, viz:shape, end node colors (Gephi mixes them), self-loops and parallel edges.",
    defaultedgetype: "undirected",
    ...edgeSheet([
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
    ]),
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
    about: "GEXF 1.3's node hierarchy: nodes nested in a node's <nodes>, and pid. GEXF stores no group box.",
    defaultedgetype: "undirected",
    ...(() => {
        const specs = [
            { id: "default", prop: "hierarchy", value: "none" },
            { id: "group-nested", prop: "nodes", value: "nested" },
            { id: "group-pid", prop: "pid", value: "parent id" },
            { id: "group-deep", prop: "nodes", value: "3 levels" },
            { id: "group-empty", prop: "nodes", value: "empty" },
            { id: "group-edge-in", prop: "edge", value: "child-child" },
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

// ------------------------------------------------------------------ the pages: each file under each Preview setting

/** The Preview every page starts from: Gephi's defaults with node labels shown and label overlap avoidance off. */
const BASE = { "node.label.show": "true", "node.label.avoidOverlap": "false" };

/** Per category: the sheet files (pages under BASE) and the Preview settings drawn as further pages. */
const PAGES = {
    "specimen-node-shapes": [{}, { "node.per.node.opacity": "true" }],
    "specimen-node-fills-borders": [
        {},
        { "node.border.width": "0.0" },
        { "node.border.width": "4.0" },
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
    ],
    "specimen-groups": [{}],
    "specimen-images-charts": [{}, { "node.per.node.opacity": "true" }],
};

/** Preview properties no page sets, and why. */
const NOT_PAGED = {
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
    writeFileSync(join(out, file), gexf(sheet.nodes, sheet.edges, sheet.defaultedgetype, sheet.about));
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
    "dynamics (spells, start/end, timeformat)":
        "the dynamics module changes what exists when, not how it looks; Gephi's Preview draws a static graph",
};
writeFileSync(
    join(here, "gexf-gephi-vocabulary.json"),
    `${JSON.stringify({ about: "The GEXF style vocabulary the gexf-gephi specimen sheets cover: the GEXF 1.3 schema's values and Gephi 0.11.3's Preview properties, each with the specimens or pages that draw it. Written by gexf-gephi.mjs from viz.xsd, gexf.xsd and gexf-gephi-preview-properties.json.", ...vocab }, null, 4)}\n`,
);
console.log(`gexf-gephi: ${Object.keys(SHEETS).length} files, ${pages.length} pages, ${all.length} elements`);
