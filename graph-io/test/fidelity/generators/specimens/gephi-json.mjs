#!/usr/bin/env node
// The Gephi JSON specimen sheets (gephi-json family): one file per sheet in graph-io/test/fidelity/specimens/gephi-json/,
// written the way the Gephi JSON Exporter plugin writes them, and drawn by sigma.js (oracles/tools/web/web-oracle.mjs sigma).
//
//   node gephi-json.mjs               write every sheet
//   node gephi-json.mjs --vocabulary  rewrite the sigmaSettings values of gephi-json-vocabulary.json from the pinned sigma first
//
// The vocabulary (gephi-json-vocabulary.json beside this script) is every key the plugin's model classes write. Every
// node and edge key there has a specimen below or a reason in NOT_DRAWN, or the run fails; the pinned sigma's live
// DEFAULT_SETTINGS must still equal the recorded ones, so a new sigma shows up here first.
//
// The files are what the plugin writes: Gson's compact output of a HashMap (edges before nodes), each node's keys in
// the order Gson writes the model's fields (label, x, y, id, attributes, color, size), doubles with a decimal point,
// HTML characters escaped (= as =), a null label left out, colors rgb(r,g,b) of 0..255 integers, y up.
//
// Sheet rules (../../specimens/README.md) as this format allows them: a caption is a node too (Gephi JSON has no text
// element), so cap-* nodes are white rgb(255,255,255) discs of size 7 -- just over sigma's labelRenderedSizeThreshold
// of 6 rendered pixels, below which sigma draws no label -- listed first so every specimen draws over them. sigma
// draws at most one label per 100-px cell of its label grid (labelDensity 1, labelGridCellSize 100): the largest
// node's, and every node competes, labelled or not (sigma's display label defaults to ""), so a larger unlabelled
// specimen in the same cell hides its caption. So the sheets use 5 columns (one caption per grid cell across, and
// room for the caption's text, which sigma writes to the right of its node), and the node sheets use rows 0, 2, 4
// and 6 of an 8-row grid, where every specimen and every caption has a grid cell to itself (checked below for every
// sheet; the oracle's drawn labels confirm it). Node size is sigma's radius: the neutral 36-px disc is size 18.
import console from "node:console";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { ANCHORS, caption, cells, layout } from "../sheet-layout.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../specimens/gephi-json");
const VOCAB = join(here, "gephi-json-vocabulary.json");
const graphIo = resolve(here, "../../../.."); // its devDependencies pin the oracle libraries
const vocabulary = JSON.parse(readFileSync(VOCAB, "utf8"));

// ------------------------------------------------------------------ the pinned sigma's settings

const sigmaVersion = JSON.parse(readFileSync(join(graphIo, "node_modules/sigma/package.json"), "utf8")).version;
const settingsUrl = pathToFileURL(createRequire(join(graphIo, "package.json")).resolve("sigma/settings"));
const { DEFAULT_SETTINGS } = await import(settingsUrl.href);
const recorded = vocabulary.sigmaSettings;
const liveValues = Object.fromEntries(Object.keys(recorded.values).map((k) => [k, DEFAULT_SETTINGS[k]]));
if (process.argv.includes("--vocabulary")) {
    vocabulary.sigmaSettings = { ...recorded, version: sigmaVersion, values: liveValues };
    writeFileSync(VOCAB, `${JSON.stringify(vocabulary, null, 4)}\n`);
} else if (sigmaVersion !== recorded.version || JSON.stringify(liveValues) !== JSON.stringify(recorded.values)) {
    throw new Error(
        `gephi-json.mjs: sigma ${sigmaVersion}'s settings ${JSON.stringify(liveValues)} differ from the recorded ${recorded.version} ones; rerun with --vocabulary and review the sheets`,
    );
}

// ------------------------------------------------------------------ Gson's output

const dbl = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));
const GSON_HTML = { "<": "\\u003c", ">": "\\u003e", "&": "\\u0026", "=": "\\u003d", "'": "\\u0027" };
const str = (s) => JSON.stringify(s).replace(/[<>&=']/g, (c) => GSON_HTML[c]);
const obj = (pairs) =>
    `{${pairs
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${str(k)}:${v}`)
        .join(",")}}`;
const attrs = (a) => obj(Object.entries(a ?? {}).map(([k, v]) => [k, str(v)]));
const nodeJson = (n) =>
    obj([
        ["label", n.label === undefined ? undefined : str(n.label)],
        ["x", dbl(n.x)],
        ["y", dbl(-n.y)], // sheet y is down; Gephi's (and sigma's) graph y is up
        ["id", str(n.id)],
        ["attributes", attrs(n.attributes)], // always written, as the plugin does (even for "default")
        ["color", n.color === undefined ? undefined : str(n.color)],
        ["size", n.size === undefined ? undefined : dbl(n.size)],
    ]);
const edgeJson = (e) =>
    obj([
        ["label", e.label === undefined ? undefined : str(e.label)],
        ["source", str(e.source)],
        ["target", str(e.target)],
        ["id", str(e.id)],
        ["attributes", attrs(e.attributes)],
        ["color", e.color === undefined ? undefined : str(e.color)],
        ["size", e.size === undefined ? undefined : dbl(e.size)],
    ]);

// ------------------------------------------------------------------ the sheets

const rgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",")})`;
const N = layout.neutral;
const FILL = rgb(N.fill);
const EDGE = rgb(N.edgeColor);
const SIZE = N.size / 2;
const CAPTION = { color: "rgb(255,255,255)", size: 7 };
const END = 6; // the neutral end nodes of an edge specimen: small, so the edge between them shows

/** A specimen: id, the setting's key and value as the caption shows them, and the element's own keys. */
const s = (id, key, value, set) => ({ id, key, value, set });

const COLORS = [
    ["#000000", "black"],
    ["#ffffff", "white"],
    ["#ff0000", "red"],
    ["#00ff00", "green"],
    ["#0000ff", "blue"],
    ["#ffff00", "yellow"],
    ["#00ffff", "cyan"],
    ["#ff00ff", "magenta"],
    ["#808080", "gray"],
    ["#999999", "gephi-default"], // Gephi's default node color, 0.6 per channel
    ["#e543a4", "worldcup"], // a color from the corpus's gephi-worldcup export
    ["#010203", "near-black"],
    ["#fefdfc", "near-white"],
    ["#7f3f1f", "brown"],
];
const colorId = (hex) => `color-rgb-${rgb(hex).slice(4, -1).replaceAll(",", "-")}`;
const num = (v) => String(v).replace(".", "-").replace(/^-/, "neg-");

const UNI = `Z${String.fromCharCode(0xfc)}rich`;
const NODE_GRID = { count: 40, columns: 5, rows: [0, 2, 4, 6] };
const SHEETS = {
    "specimen-node-fills-borders": {
        kind: "node",
        grid: NODE_GRID,
        specimens: [
            ...COLORS.map(([hex]) => s(colorId(hex), "color", rgb(hex), { color: rgb(hex) })),
            // a Gephi column titled "color" lands in attributes: data, never the drawn color
            s("attr-color", "attributes.color", "rgb(255,0,0)", { attributes: { color: "rgb(255,0,0)" } }),
            // a column titled "type" (common: a bipartite network's node kind) is sigma's node program key
            s("attr-type", "attributes.type", "square", { attributes: { type: "square" } }),
        ],
    },
    "specimen-node-sizes-opacity": {
        kind: "node",
        grid: NODE_GRID,
        specimens: [
            ...[0, 0.5, 1, 2, 4, 6, 8, 10, 14, 18, 24, 30].map((v) => s(`size-${num(v)}`, "size", v, { size: v })),
            // Gephi columns titled like a sigma display key land in attributes: data, never drawn
            s("attr-size", "attributes.size", "30", { attributes: { size: "30" } }),
            s("attr-visibility", "attributes.visibility", "hidden", { attributes: { visibility: "hidden" } }),
            s("attr-x", "attributes.x", "0", { attributes: { x: "0", y: "0" } }),
            s("attr-hidden", "attributes.hidden", "true", { attributes: { hidden: "true" } }),
            s("attr-zindex", "attributes.zIndex", "-1", { attributes: { zIndex: "-1" } }),
        ],
    },
    "specimen-labels": {
        kind: "node",
        grid: NODE_GRID,
        specimens: [
            s("label-plain", "label", "Label", { label: "Label" }),
            s("label-one-char", "label", "A", { label: "A" }),
            s("label-long", "label", "A much longer label", { label: "A much longer label" }),
            s("label-digits", "label", "12345", { label: "12345" }),
            s("label-spaces", "label", "two  words", { label: "two  words" }),
            s("label-unicode", "label", UNI, { label: UNI }),
            s("label-html-chars", "label", "a<b & c>d", { label: "a<b & c>d" }),
            s("label-empty", "label", '""', { label: "" }),
            s("label-newline", "label", "two\\nlines", { label: "two\nlines" }),
            s("label-quotes", "label", 'say "hi"', { label: 'say "hi"' }),
            s("label-apostrophe", "label", "it's", { label: "it's" }),
            // a Gephi column titled "label" (the exporter skips only the column whose id is label)
            s("attr-label", "attributes.label", "Column", { attributes: { label: "Column" } }),
            s("label-small-node", "label", "Small (size=4)", { label: "Small", size: 4 }),
            // sigma's forceLabel key as a Gephi column: data, so the small node's label stays hidden
            s("attr-forcelabel", "attributes.forceLabel", "true", {
                label: "Forced",
                size: 4,
                attributes: { forceLabel: "true" },
            }),
        ],
    },
    "specimen-edges-lines": {
        kind: "edge",
        specimens: [
            ...COLORS.slice(0, 9).map(([hex]) => s(`edge-${colorId(hex)}`, "color", rgb(hex), { color: rgb(hex) })),
            ...[-1, 0, 0.5, 1, 1.5, 2, 3, 5, 8, 20].map((v) => s(`edge-size-${num(v)}`, "size", v, { size: v })),
            s("edge-self-loop", "source", "target", { loop: true }),
            s("edge-parallel", "parallel", "2 edges", { parallel: true }),
            s("edge-mutual", "mutual", "a-b and b-a", { mutual: true }),
            // Gephi edge columns titled like a sigma display key land in attributes: data, never drawn
            s("edge-attr-color", "attributes.color", "rgb(255,0,0)", { attributes: { color: "rgb(255,0,0)" } }),
            s("edge-attr-size", "attributes.size", "8", { attributes: { size: "8" } }),
            s("edge-attr-type", "attributes.type", "arrow", { attributes: { type: "arrow" } }),
            s("edge-attr-hidden", "attributes.hidden", "true", { attributes: { hidden: "true" } }),
            // the weight column: an older plugin build wrote it as "Weight" (the corpus's gephi-worldcup export);
            // the edge's drawn width is its size key, never this column
            s("edge-attr-weight", "attributes.Weight", "8.0", { attributes: { Weight: "8.0" } }),
        ],
    },
    "specimen-edge-labels": {
        kind: "edge",
        specimens: [
            s("edge-label-plain", "label", "Label", { label: "Label" }),
            s("edge-label-one-char", "label", "A", { label: "A" }),
            s("edge-label-long", "label", "A much longer label", { label: "A much longer label" }),
            s("edge-label-digits", "label", "12345", { label: "12345" }),
            s("edge-label-unicode", "label", UNI, { label: UNI }),
            s("edge-label-html-chars", "label", "a<b & c>d", { label: "a<b & c>d" }),
            s("edge-label-empty", "label", '""', { label: "" }),
            s("edge-label-spaces", "label", "two  words", { label: "two  words" }),
            s("edge-label-newline", "label", "two\\nlines", { label: "two\nlines" }),
            s("edge-label-quotes", "label", 'say "hi"', { label: 'say "hi"' }),
            s("edge-label-apostrophe", "label", "it's", { label: "it's" }),
            // a Gephi edge column titled "label" (the exporter skips only the label property)
            s("edge-attr-label", "attributes.label", "Column", { attributes: { label: "Column" } }),
        ],
    },
};

/** Vocabulary keys drawn by no specimen, and why. */
const NOT_DRAWN = {
    "node.id": "every element has one; specimen ids are setting ids",
    "node.x": "every specimen's position",
    "node.y": "every specimen's position",
    "node.attributes": "data columns; sigma draws none of them",
    "edge.id": "every element has one",
    "edge.source": "every edge specimen",
    "edge.target": "every edge specimen",
    "edge.attributes": "data columns; sigma draws none of them",
};

// sigma's label grid, as sigma frames this sheet: the anchors' extent (dx, dy) normalized by max(dx, dy) and fitted
// to the smaller view side less the stage padding on both sides, stretched by the view's aspect (measured: anchor-nw
// at 40, 34.8 and anchor-se at 1160, 865.2), then 100-px cells
const { width: W, height: H } = layout.canvas;
const xs = ANCHORS.map((a) => a.x);
const ys = ANCHORS.map((a) => a.y);
const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
const pad = recorded.values.stagePadding;
const k = ((Math.min(W, H) - 2 * pad) / Math.min(W, H)) * (Math.max(W, H) / span);
const view = (v, mid, half) => half + (v - mid) * k;
const gridCell = (n) =>
    [
        Math.floor(view(n.x, (Math.max(...xs) + Math.min(...xs)) / 2, W / 2) / recorded.values.labelGridCellSize),
        Math.floor(view(n.y, (Math.max(...ys) + Math.min(...ys)) / 2, H / 2) / recorded.values.labelGridCellSize),
    ].join(",");

/** Fails unless every caption and every labelled specimen is the largest node of its label-grid cell. */
function checkLabelGrid(id, nodes) {
    const byCell = new Map();
    for (const n of nodes) byCell.set(gridCell(n), [...(byCell.get(gridCell(n)) ?? []), n]);
    for (const n of nodes) {
        if (!n.label) continue;
        const rivals = byCell.get(gridCell(n)).filter((o) => o !== n && (o.size ?? 10) >= (n.size ?? 10));
        if (rivals.length && !(n.size < recorded.values.labelRenderedSizeThreshold)) {
            throw new Error(
                `${id}: sigma would hide the label of ${n.id} behind ${rivals.map((o) => o.id).join(", ")}`,
            );
        }
    }
}

function build(id, sheet) {
    const g = sheet.grid;
    const all = cells(g ? g.count : sheet.specimens.length + 1, g ? g.columns : 5);
    const used = g ? all.filter((c) => g.rows.includes(Math.floor(c.index / g.columns))) : all;
    if (used.length < sheet.specimens.length + 1) throw new Error(`${id}: not enough cells`);
    const nodes = [];
    const caps = [];
    const edges = [];
    const neutralNode = (nid, x, y, size = SIZE) => ({ id: nid, x, y, color: FILL, size });
    const place = (spec, c) => {
        caps.push({
            id: `cap-${spec.id}`,
            x: c.caption.x,
            y: c.caption.y,
            label: caption(spec.key, spec.value),
            ...CAPTION,
        });
        if (sheet.kind === "node") {
            const { label, color, size, attributes } = spec.set;
            nodes.push(
                spec.default
                    ? { id: spec.id, x: c.x, y: c.y, default: true }
                    : {
                          label,
                          ...neutralNode(spec.id, c.x, c.y),
                          ...(color ? { color } : {}),
                          ...(size !== undefined ? { size } : {}),
                          ...(attributes ? { attributes } : {}),
                      },
            );
            return;
        }
        const sId = `${spec.id}-s`;
        const tId = `${spec.id}-t`;
        const edge = (eid, source, target) =>
            spec.default
                ? { id: eid, source, target, default: true }
                : { id: eid, source, target, color: EDGE, size: N.edgeWidth, ...spec.set };
        if (spec.set?.loop) {
            nodes.push(neutralNode(sId, c.x, c.y, END));
            edges.push({ ...edge(spec.id, sId, sId), loop: undefined });
            return;
        }
        nodes.push(neutralNode(sId, c.source.x, c.source.y, END), neutralNode(tId, c.target.x, c.target.y, END));
        const one = edge(spec.id, sId, tId);
        delete one.loop;
        delete one.parallel;
        delete one.mutual;
        edges.push(one);
        if (spec.set?.parallel) edges.push({ ...one, id: `${spec.id}-2` });
        if (spec.set?.mutual) edges.push({ ...one, id: `${spec.id}-2`, source: tId, target: sId });
    };
    const specimens = [
        { id: "default", key: "default", value: "nothing set", default: true, set: {} },
        ...sheet.specimens,
    ];
    specimens.forEach((spec, i) => place(spec, used[i]));
    const anchors = ANCHORS.map((a) => ({ id: a.id, x: a.x, y: a.y, color: FILL, size: a.size / 2 }));
    const all_nodes = [...caps, ...anchors, ...nodes];
    checkLabelGrid(id, all_nodes);
    return `{"edges":[${edges.map(edgeJson).join(",")}],"nodes":[${all_nodes.map(nodeJson).join(",")}]}`;
}

// every vocabulary key accounted for
const used = new Set();
for (const sheet of Object.values(SHEETS)) {
    for (const spec of sheet.specimens) for (const key of Object.keys(spec.set)) used.add(`${sheet.kind}.${key}`);
}
const missing = ["node", "edge"]
    .flatMap((kind) => Object.keys(vocabulary[kind]).map((key) => `${kind}.${key}`))
    .filter((key) => !used.has(key) && !NOT_DRAWN[key]);
if (missing.length)
    throw new Error(`gephi-json.mjs: vocabulary keys with no specimen and no reason: ${missing.join(", ")}`);

mkdirSync(out, { recursive: true });
let total = 0;
for (const [id, sheet] of Object.entries(SHEETS)) {
    writeFileSync(join(out, `${id}.json`), `${build(id, sheet)}\n`);
    total += sheet.specimens.length + 1;
    console.log(`${id}: ${sheet.specimens.length + 1} specimens`);
}
console.log(`gephi-json.mjs: ${total} specimens on ${Object.keys(SHEETS).length} sheets`);
