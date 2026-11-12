#!/usr/bin/env node
// The Cytoscape.js specimen sheets (cytoscapejs family): one cy.json() document per sheet page in
// graph-io/test/fidelity/specimens/cytoscapejs/, written by Cytoscape.js itself, and the vocabulary they cover.
//
//   node cytoscapejs.mjs               write every sheet and cytoscapejs-coverage.json
//   node cytoscapejs.mjs --vocabulary  rewrite cytoscapejs-vocabulary.json from the live property table first
//
// The vocabulary is Cytoscape.js's own style property table (cy.style().properties, the table its parser checks
// every stylesheet value against), read from the pinned Cytoscape.js 3.34.3 of graph-io's devDependencies on every run
// and compared with cytoscapejs-vocabulary.json beside this script: a property or enumerated value that appears
// or disappears in a new version fails the run until --vocabulary rewrites the file. Every property, and every
// enumerated value, has a specimen or a NOT_DRAWN reason, or the run fails.
//
// Each sheet is built in a headless Cytoscape.js instance (elements at fixed positions, the sheet's stylesheet) and
// saved with cy.json(), so the file is what Cytoscape.js writes, compound (parent) positions included. Element style
// bypasses (the `style` key of an element definition, which cy.json() does not write back) are added to the saved
// elements afterwards, on the mappings-bypass sheets only. cy.json() also writes every rule in Cytoscape.js's own
// spelling (every color as rgb(r,g,b), an alias under the property it points to, an invalid value dropped), so a
// specimen about how a value is SPELLED (`raw`: hex, named and hsl colors, aliases, camelCase names, values
// Cytoscape.js refuses) has its rule written back as authored, the way hand-written files and Cytoscape desktop's
// style export carry it. Each specimen is one stylesheet rule `#<id> { ... }`:
// the setting, plus the prerequisite it needs to show at all (a dash offset needs a dashed line), named in the caption.
import { execFileSync } from "node:child_process";
import console from "node:console";
import { deflateSync, crc32 } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { ANCHORS, caption, cells, layout } from "../sheet-layout.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../specimens/cytoscapejs");
const VOCAB = join(here, "cytoscapejs-vocabulary.json");
const COVERAGE = join(here, "cytoscapejs-coverage.json");
const PINNED = "3.34.3";
const req = createRequire(resolve(here, "../../../../package.json"));
const cytoscape = req("cytoscape");
const version = cytoscape.version;
if (version !== PINNED) throw new Error(`cytoscapejs.mjs: Cytoscape.js ${version}, the sheets are made with ${PINNED}`);
const N = layout.neutral;
const DOC = "https://js.cytoscape.org/#style";

// ------------------------------------------------------------------ the vocabulary, from the live table

function liveVocabulary() {
    const cy = cytoscape({ headless: true, styleEnabled: true });
    const props = cy
        .style()
        .properties.filter((p) => !p.alias)
        .map((p) => ({
            name: p.name,
            group: p.groupKey,
            ...(p.type?.enums ? { enums: [...new Set(p.type.enums.map(String))] } : {}),
            kinds: Object.entries({
                number: p.type?.number,
                color: p.type?.color,
                multiple: p.type?.multiple,
                string: p.type?.string,
                url: p.type?.regexes && p.name.includes("image"),
            })
                .filter(([, v]) => v)
                .map(([k]) => k),
            ...(p.type?.units ? { units: String(p.type.units) } : {}),
        }));
    cy.destroy();
    return props;
}
const live = liveVocabulary();
if (process.argv.includes("--vocabulary")) {
    writeFileSync(
        VOCAB,
        `${JSON.stringify(
            {
                about: "Cytoscape.js's style vocabulary: every non-alias property of cy.style().properties (the table its stylesheet parser checks values against), its group and its enumerated values, read from the pinned Cytoscape.js by cytoscapejs.mjs --vocabulary. cytoscapejs.mjs fails when the live table differs, so a new version shows up as a new or missing specimen.",
                program: `Cytoscape.js ${version}`,
                doc: DOC,
                properties: live,
            },
            null,
            4,
        )}\n`,
    );
}
const vocabulary = JSON.parse(readFileSync(VOCAB, "utf8"));
if (JSON.stringify(vocabulary.properties) !== JSON.stringify(live)) {
    throw new Error(
        "cytoscapejs.mjs: Cytoscape.js's property table differs from cytoscapejs-vocabulary.json; run with --vocabulary, then give every new property or value a specimen (or a NOT_DRAWN reason)",
    );
}

/** Properties or values a static drawing cannot show, and why. Key: a property, or `property=value`. */
const NOT_DRAWN = {
    events: "interaction only: whether the element answers mouse and touch events; draws nothing",
    "text-events": "interaction only: whether a label answers events; draws nothing",
    "box-selection": "interaction only: how a box selection picks elements; draws nothing",
    "box-select-labels": "interaction only: whether a box selection counts labels; draws nothing",
    "transition-property": "animation only: which properties animate when a style changes; a still drawing has none",
    "transition-duration": "animation only",
    "transition-delay": "animation only",
    "transition-timing-function": "animation only: the easing of a style transition",
    position:
        "parsed and never read: Cytoscape.js 3.34.3's renderer and bounds code never look the property up (no pstyle('position') call); it draws nothing",
    "selection-box-color": "core, interaction only: the drag box of a box selection, drawn only while dragging",
    "selection-box-opacity": "core, interaction only (box selection drag box)",
    "selection-box-border-color": "core, interaction only (box selection drag box)",
    "selection-box-border-width": "core, interaction only (box selection drag box)",
    "active-bg-color": "core, interaction only: the touch circle drawn while a tap is held on the background",
    "active-bg-opacity": "core, interaction only (touch circle)",
    "active-bg-size": "core, interaction only (touch circle)",
    "outside-texture-bg-color": "core, interaction only: the background drawn while a textured viewport pans",
    "outside-texture-bg-opacity": "core, interaction only (textured viewport)",
};

// ------------------------------------------------------------------ images (data URIs, so the file is self-contained)

/** Four colored quadrants, 24 x 24, as an SVG data URI: where the image sits and how it is cut shows. */
const QUADRANTS =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="12" height="12" fill="#e41a1c"/><rect x="12" width="12" height="12" fill="#377eb8"/><rect y="12" width="12" height="12" fill="#4daf4a"/><rect x="12" y="12" width="12" height="12" fill="#ffd700"/></svg>`,
    );
/** A 12 x 6 wide SVG image: fit and size relative to the node show. */
const WIDE =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="6" viewBox="0 0 12 6"><rect width="6" height="6" fill="#984ea3"/><rect x="6" width="6" height="6" fill="#ff7f00"/></svg>`,
    );
/**
 * A PNG as a data URI.
 * @param w - width
 * @param h - height
 * @param px - (x, y) => [r, g, b]
 * @returns the data URI
 */
function png(w, h, px) {
    const chunk = (type, data) => {
        const b = Buffer.alloc(12 + data.length);
        b.writeUInt32BE(data.length, 0);
        b.write(type, 4, "ascii");
        data.copy(b, 8);
        b.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
        return b;
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr.set([8, 2, 0, 0, 0], 8);
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) raw.set(px(x, y), y * (w * 3 + 1) + 1 + x * 3);
    }
    const file = Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk("IHDR", ihdr),
        chunk("IDAT", deflateSync(raw)),
        chunk("IEND", Buffer.alloc(0)),
    ]);
    return `data:image/png;base64,${file.toString("base64")}`;
}
/** A 4 x 4 checkerboard PNG: smoothing on blurs it when it is scaled up, off keeps the squares. */
const CHECKER = png(4, 4, (x, y) => ((x + y) % 2 ? [0x37, 0x7e, 0xb8] : [0xff, 0xd7, 0x00]));
const PALETTE = [
    "#e41a1c",
    "#377eb8",
    "#4daf4a",
    "#984ea3",
    "#ff7f00",
    "#ffff33",
    "#a65628",
    "#f781bf",
    "#999999",
    "#66c2a5",
    "#fc8d62",
    "#8da0cb",
    "#e78ac3",
    "#a6d854",
    "#ffd92f",
    "#1b9e77",
];

// ------------------------------------------------------------------ the neutral baseline every sheet starts from

const BASE = [
    {
        selector: "node",
        style: {
            shape: "ellipse",
            width: N.size,
            height: N.size,
            "background-color": N.fill,
            "background-opacity": 1,
            "border-color": N.border,
            "border-width": N.borderWidth,
            "border-style": "solid",
            "border-opacity": 1,
            label: "",
            color: N.labelColor,
            "font-family": N.fontFamily,
            "font-size": N.fontSize,
            "font-style": "normal",
            "font-weight": "normal",
            "text-valign": "center",
            "text-halign": "center",
            opacity: 1,
        },
    },
    {
        selector: "node:parent",
        style: {
            shape: "rectangle",
            padding: 10,
            "background-color": "#eeeeee",
            "border-color": N.border,
            "border-width": N.borderWidth,
            "text-valign": "top",
            "text-halign": "center",
        },
    },
    {
        selector: "edge",
        style: {
            width: N.edgeWidth,
            "line-color": N.edgeColor,
            "line-style": "solid",
            "line-opacity": 1,
            "curve-style": "straight",
            "source-arrow-shape": "none",
            "target-arrow-shape": "none",
            "mid-source-arrow-shape": "none",
            "mid-target-arrow-shape": "none",
            "source-arrow-color": N.edgeColor,
            "target-arrow-color": N.edgeColor,
            "mid-source-arrow-color": N.edgeColor,
            "mid-target-arrow-color": N.edgeColor,
            "arrow-scale": 1,
            label: "",
            color: N.labelColor,
            "font-family": N.fontFamily,
            "font-size": N.fontSize,
            opacity: 1,
        },
    },
    { selector: "node.end", style: { width: 8, height: 8 } },
    { selector: "node.child", style: { width: 14, height: 14 } },
    { selector: "node.anchor", style: { width: layout.anchors.size, height: layout.anchors.size } },
    {
        selector: "node.cap",
        style: {
            width: 1,
            height: 1,
            "background-opacity": 0,
            "border-width": 0,
            label: "data(label)",
            "font-size": layout.captionFontSize,
            "text-valign": "bottom",
            "text-halign": "center",
            "text-wrap": "wrap",
            "text-max-width": 104,
            "text-overflow-wrap": "anywhere",
        },
    },
];

// ------------------------------------------------------------------ specimen builders

/** A node specimen: `style` on `#id`; the caption names `key` (default: the first property). */
const node = (id, style, o = {}) => ({ kind: "node", id, style, ...o });
/** An edge specimen between `<id>-s` and `<id>-t`. o.ends: style for both ends; o.dy: target lower by dy; o.parallel: count. */
const edge = (id, style, o = {}) => ({ kind: "edge", id, style, ...o });
/** A self loop on `<id>-s`. */
const loop = (id, style, o = {}) => ({
    kind: "loop",
    id,
    style: { "curve-style": "bezier", ...style },
    key: Object.keys(style)[0],
    ...o,
});
/** A compound `id` holding `<id>-a` and `<id>-b`; o.nested: a compound inside it. */
const group = (id, style, o = {}) => ({ kind: "group", id, style, ...o });

/**
 * The text under a specimen: its key setting.
 * @param s - the specimen
 * @returns the caption
 */
function captionOf(s) {
    if (s.cap) return s.cap;
    if (s.id === "default") return "default";
    const k = s.key ?? Object.keys(s.style ?? s.bypass ?? {})[0];
    const v = (s.style ?? s.bypass ?? {})[k];
    return caption(k, Array.isArray(v) ? v.join(" ") : v);
}

/**
 * The elements and rules of one sheet page.
 * @param specs - the page's specimens
 * @returns { elements: element definitions, rules: stylesheet rules after BASE, bypass: { id: style } }
 */
function place(specs) {
    const nodes = [];
    const edges = [];
    const rules = [];
    const bypass = {};
    const raw = {};
    const n = (id, x, y, cls = "", extra = {}) =>
        nodes.push({ group: "nodes", data: { id, ...extra.data }, position: { x, y }, classes: cls, ...extra.el });
    for (const a of ANCHORS) n(a.id, a.x, a.y, "anchor");
    cells(specs.length).forEach((c, i) => {
        const s = specs[i];
        const extra = Array.from({ length: (s.parallel ?? 1) - 1 }, (_, k) => `#${s.id}-${k + 2}`);
        const sel = [`#${s.id}`, ...extra].join(", ");
        if (s.style && Object.keys(s.style).length) {
            rules.push({ selector: sel, style: s.style });
            if (s.raw) raw[sel] = s.style;
        }
        if (s.rules) rules.push(...s.rules);
        if (s.bypass) bypass[s.id] = s.bypass;
        n(`cap-${s.id}`, c.caption.x, c.caption.y, "cap", { data: { label: captionOf(s) } });
        const data = s.data ?? {};
        if (s.kind === "node") {
            n(s.id, c.x + (s.dx ?? 0), c.y, s.classes ?? "", { data: { ...data }, el: s.el });
            for (const [i2, o] of (s.others ?? []).entries()) {
                n(`${s.id}-o${i2 + 1}`, c.x + o.dx, c.y + o.dy, o.classes ?? "", { data: o.data ?? {} });
            }
        } else if (s.kind === "edge") {
            const dy = s.dy ?? 0;
            const [from, to] = s.swap ? [c.target, c.source] : [c.source, c.target];
            n(`${s.id}-s`, from.x, from.y - dy / 2, "end");
            n(`${s.id}-t`, to.x, to.y + dy / 2, "end");
            if (s.ends) rules.push({ selector: `#${s.id}-s, #${s.id}-t`, style: s.ends });
            const ids = [s.id, ...Array.from({ length: (s.parallel ?? 1) - 1 }, (_, k) => `${s.id}-${k + 2}`)];
            for (const e of ids) {
                edges.push({
                    group: "edges",
                    data: { id: e, source: `${s.id}-s`, target: `${s.id}-t`, ...data },
                    classes: s.classes ?? "",
                    ...s.el,
                });
            }
        } else if (s.kind === "loop") {
            n(`${s.id}-s`, c.x, c.y + 8, "end");
            rules.push({ selector: `#${s.id}-s`, style: { width: 16, height: 16 } });
            edges.push({
                group: "edges",
                data: { id: s.id, source: `${s.id}-s`, target: `${s.id}-s`, ...data },
                classes: s.classes ?? "",
                ...s.el,
            });
        } else if (s.kind === "group") {
            nodes.push({ group: "nodes", data: { id: s.id, ...data }, classes: s.classes ?? "" });
            const inner = s.nested ? `${s.id}-in` : s.id;
            if (s.nested) nodes.push({ group: "nodes", data: { id: inner, parent: s.id }, classes: "" });
            const kids = s.children ?? [
                [-14, -4],
                [14, 8],
            ];
            kids.forEach(([dx, dy], k) =>
                n(`${s.id}-${"abcd"[k]}`, c.x + dx, c.y + dy, `child ${s.childClasses ?? ""}`.trim(), {
                    data: { parent: inner, ...(s.childData?.[k] ?? {}) },
                }),
            );
            for (const [i2, o] of (s.others ?? []).entries()) {
                n(`${s.id}-o${i2 + 1}`, c.x + o.dx, c.y + o.dy, o.classes ?? "", { data: o.data ?? {} });
            }
            if (s.innerEdge)
                edges.push({ group: "edges", data: { id: `${s.id}-e`, source: `${s.id}-a`, target: `${s.id}-b` } });
            if (s.outerEdge)
                edges.push({ group: "edges", data: { id: `${s.id}-e`, source: s.id, target: `${s.id}-o1` } });
        }
    });
    return { elements: [...nodes, ...edges], rules, bypass, raw };
}

// ------------------------------------------------------------------ the sheets

const vocab = Object.fromEntries(vocabulary.properties.map((p) => [p.name, p]));
/** Cytoscape.js's property aliases (cy.style().properties entries with pointsTo), read from the live table. */
const ALIASES = Object.fromEntries(
    cytoscape({ headless: true, styleEnabled: true })
        .style()
        .properties.filter((p) => p.alias)
        .map((p) => [p.name, p.pointsTo.name]),
);
/**
 * The property a written name sets: camelCase in dash form, an alias as the property it points to.
 * @param name - the name as written
 * @returns the property name
 */
function canonicalName(name) {
    const dashed = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    return ALIASES[dashed] ?? dashed;
}
const E = (name) => vocab[name].enums;
const slug = (v) =>
    String(v)
        .toLowerCase()
        .replace(/%/g, "pct")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
/** One specimen per enumerated value of `prop`, ids `<prop>-<value>`. */
const sweep = (make, prop, extra = {}, values = E(prop)) =>
    values.map((v) => make(`${prop}-${slug(v)}`, { ...extra, [prop]: v }, { key: prop }));

const NODE_DEFAULT = node("default", {});
/** Larger, see-through end nodes, for the specimens about where an edge meets its node. */
const BIG_ENDS = { width: 24, height: 24, "background-opacity": 0.35 };
const EDGE_DEFAULT = edge("default", {});

const SHEETS = {
    "specimen-node-shapes": [
        NODE_DEFAULT,
        ...sweep(node, "shape"),
        node(
            "shape-polygon-points-arrow",
            { shape: "polygon", "shape-polygon-points": "-1 -0.5 0.2 -0.5 0.2 -1 1 0 0.2 1 0.2 0.5 -1 0.5" },
            { key: "shape-polygon-points", cap: "shape-polygon-points=arrow" },
        ),
        node(
            "shape-polygon-points-triangle",
            { shape: "polygon", "shape-polygon-points": "-1 1 0 -1 1 1" },
            { key: "shape-polygon-points", cap: "shape-polygon-points=-1 1 0 -1 1 1" },
        ),
        node("corner-radius-auto", { shape: "round-rectangle", "corner-radius": "auto" }, { key: "corner-radius" }),
        node("corner-radius-4", { shape: "round-rectangle", "corner-radius": 4 }, { key: "corner-radius" }),
        node("corner-radius-14", { shape: "round-rectangle", "corner-radius": 14 }, { key: "corner-radius" }),
        node(
            "corner-radius-8-round-triangle",
            { shape: "round-triangle", "corner-radius": 8 },
            { key: "corner-radius", cap: "corner-radius=8 (round-triangle)" },
        ),
        node(
            "corner-radius-10-cut-rectangle",
            { shape: "cut-rectangle", "corner-radius": 10 },
            { key: "corner-radius", cap: "corner-radius=10 (cut-rectangle)" },
        ),
        node("shape-ellipse-wide", { shape: "ellipse", width: 60, height: 30 }, { cap: "shape=ellipse 60x30" }),
        node("shape-star-wide", { shape: "star", width: 60, height: 30 }, { cap: "shape=star 60x30" }),
        node(
            "shape-round-rectangle-tall",
            { shape: "round-rectangle", width: 24, height: 50 },
            { cap: "shape=round-rectangle 24x50" },
        ),
    ],
    "specimen-node-fills-borders": [
        NODE_DEFAULT,
        ...[
            "red",
            "#0a0",
            "#1f77b4",
            "rgb(255,127,14)",
            "rgba(148,103,189,0.5)",
            "hsl(120,60%,40%)",
            "hsla(300,70%,50%,0.6)",
            "transparent",
        ].map((c) => node(`background-color-${slug(c)}`, { "background-color": c }, { raw: true })),
        node("background-opacity-0-5", { "background-opacity": 0.5 }),
        node("background-opacity-0", { "background-opacity": 0 }),
        node("background-blacken-0-5", { "background-blacken": 0.5 }),
        node("background-blacken-neg-0-5", { "background-blacken": -0.5 }),
        ...sweep(node, "background-fill", { "background-gradient-stop-colors": "#e41a1c #ffd700 #377eb8" }),
        node(
            "background-gradient-stop-colors",
            { "background-fill": "linear-gradient", "background-gradient-stop-colors": "cyan magenta yellow" },
            { key: "background-gradient-stop-colors" },
        ),
        node(
            "background-gradient-stop-positions",
            {
                "background-fill": "linear-gradient",
                "background-gradient-stop-colors": "cyan magenta yellow",
                "background-gradient-stop-positions": "0% 20% 100%",
            },
            { key: "background-gradient-stop-positions" },
        ),
        ...sweep(node, "background-gradient-direction", {
            "background-fill": "linear-gradient",
            "background-gradient-stop-colors": "#e41a1c #377eb8",
        }),
        node("border-color-red", { "border-color": "red", "border-width": 3 }),
        node("border-width-0", { "border-width": 0 }),
        node("border-width-3", { "border-width": 3 }),
        node("border-width-6", { "border-width": 6 }),
        node("border-opacity-0-3", { "border-opacity": 0.3, "border-width": 6 }),
        ...sweep(node, "border-style", { "border-width": 4 }),
        ...sweep(node, "border-cap", { "border-width": 6, "border-style": "dashed" }),
        ...sweep(node, "border-join", { "border-width": 6, shape: "rectangle" }),
        node("border-dash-pattern", { "border-dash-pattern": "10 3 2 3", "border-style": "dashed", "border-width": 3 }),
        node("border-dash-offset", { "border-dash-offset": 6, "border-style": "dashed", "border-width": 3 }),
        ...sweep(node, "border-position", { "border-width": 6, "border-color": "#1f77b4" }),
        node("outline-width-3", { "outline-width": 3 }),
        node("outline-color-red", { "outline-color": "red", "outline-width": 3 }),
        node("outline-opacity-0-3", { "outline-opacity": 0.3, "outline-width": 3 }),
        node("outline-offset-4", { "outline-offset": 4, "outline-width": 3 }),
        ...sweep(node, "outline-style", { "outline-width": 4 }),
    ],
    "specimen-node-sizes-opacity": [
        NODE_DEFAULT,
        node("width-20", { width: 20 }),
        node("width-70", { width: 70 }),
        node("height-20", { height: 20 }),
        node("height-60", { height: 60 }),
        node("width-2em", { width: "2em" }),
        node("width-label", { width: "label", label: "wide label" }, { key: "width" }),
        node("height-label", { height: "label", label: "Label" }, { key: "height" }),
        node("padding-6", { padding: 6 }),
        node("padding-relative-pct", { padding: "20%" }, { cap: "padding=20%" }),
        node("bounds-expansion-20", { "bounds-expansion": 20 }),
        node("opacity-0-5", { opacity: 0.5 }),
        node("opacity-0-15", { opacity: 0.15 }),
        ...sweep(node, "visibility"),
        ...sweep(node, "display"),
        node("ghost-yes", { ghost: "yes", "ghost-offset-x": 6, "ghost-offset-y": 6, "ghost-opacity": 0.4 }),
        node("ghost-no", { ghost: "no", "ghost-offset-x": 6, "ghost-offset-y": 6, "ghost-opacity": 0.4 }),
        node("ghost-offset-x-12", { "ghost-offset-x": 12, ghost: "yes", "ghost-offset-y": 0, "ghost-opacity": 0.4 }),
        node("ghost-offset-y-12", { "ghost-offset-y": 12, ghost: "yes", "ghost-offset-x": 0, "ghost-opacity": 0.4 }),
        node("ghost-opacity-0-9", { "ghost-opacity": 0.9, ghost: "yes", "ghost-offset-x": 6, "ghost-offset-y": 6 }),
        node("underlay-opacity-0-5", { "underlay-opacity": 0.5, "underlay-color": "#4daf4a", "underlay-padding": 6 }),
        node("underlay-color-red", { "underlay-color": "red", "underlay-opacity": 0.5, "underlay-padding": 6 }),
        node("underlay-padding-14", { "underlay-padding": 14, "underlay-opacity": 0.5, "underlay-color": "#4daf4a" }),
        ...sweep(node, "underlay-shape", {
            "underlay-opacity": 0.5,
            "underlay-color": "#4daf4a",
            "underlay-padding": 8,
        }),
        node("underlay-corner-radius-auto", {
            "underlay-corner-radius": "auto",
            "underlay-shape": "round-rectangle",
            "underlay-opacity": 0.5,
            "underlay-color": "#4daf4a",
            "underlay-padding": 8,
        }),
        node("underlay-corner-radius-2", {
            "underlay-corner-radius": 2,
            "underlay-shape": "round-rectangle",
            "underlay-opacity": 0.5,
            "underlay-color": "#4daf4a",
            "underlay-padding": 8,
        }),
        node("overlay-opacity-0-5", { "overlay-opacity": 0.5, "overlay-color": "#377eb8", "overlay-padding": 6 }),
        node("overlay-color-red", { "overlay-color": "red", "overlay-opacity": 0.5, "overlay-padding": 6 }),
        node("overlay-padding-14", { "overlay-padding": 14, "overlay-opacity": 0.5, "overlay-color": "#377eb8" }),
        ...sweep(node, "overlay-shape", { "overlay-opacity": 0.5, "overlay-color": "#377eb8", "overlay-padding": 8 }),
        node("overlay-corner-radius-auto", {
            "overlay-corner-radius": "auto",
            "overlay-shape": "round-rectangle",
            "overlay-opacity": 0.5,
            "overlay-color": "#377eb8",
            "overlay-padding": 8,
        }),
        node("overlay-corner-radius-2", {
            "overlay-corner-radius": 2,
            "overlay-shape": "round-rectangle",
            "overlay-opacity": 0.5,
            "overlay-color": "#377eb8",
            "overlay-padding": 8,
        }),
        // z-index: the specimen is drawn before its overlapping neighbor -o1 (element order), so only z-index lifts it
        ...[
            ["z-index-10", { "z-index": 10, "background-color": "#377eb8" }],
            ["z-index-compare-auto", { "z-index-compare": "auto", "background-color": "#377eb8" }],
            ["z-index-compare-manual", { "z-index-compare": "manual", "z-index": 10, "background-color": "#377eb8" }],
        ].map(([id, st]) => node(id, st, { dx: -8, others: [{ dx: 8, dy: 8 }] })),
    ],
    "specimen-labels": [
        node("default", { label: "Label" }, { cap: "label=Label" }),
        ...E("text-valign").flatMap((v) =>
            E("text-halign").map((h) =>
                node(
                    `text-align-${v}-${h}`,
                    { label: "Label", "text-valign": v, "text-halign": h },
                    { cap: `text-valign=${v} text-halign=${h}` },
                ),
            ),
        ),
        ...["DejaVu Serif", "DejaVu Sans Mono", "serif", "sans-serif", "monospace", "Lato", "Bitstream Charter"].map(
            (f) => node(`font-family-${slug(f)}`, { "font-family": f, label: "Label" }, { key: "font-family" }),
        ),
        ...sweep(node, "font-style", { label: "Label" }),
        // numeric weights as numbers, as a stylesheet author writes them; cy.json() saves them as strings, and
        // Cytoscape.js 3.34.3 rejects the string "700" (only) when it reads the saved file back
        ...sweep(
            node,
            "font-weight",
            { label: "Label", "font-family": "Lato" },
            E("font-weight").map((v) => (/^\d+$/.test(v) ? Number(v) : v)),
        ),
        node("font-size-6", { "font-size": 6, label: "Label" }),
        node("font-size-16", { "font-size": 16, label: "Label" }),
        node("color-red", { color: "red", label: "Label" }),
        node("text-opacity-0-4", { "text-opacity": 0.4, label: "Label" }),
        ...sweep(node, "text-transform", { label: "Mixed Case" }),
        node("min-zoomed-font-size-12", { "min-zoomed-font-size": 12, label: "Label" }),
        ...sweep(node, "text-metrics", {
            label: "Label",
            "text-background-opacity": 1,
            "text-background-color": "#ffd700",
        }),
        ...sweep(node, "text-wrap", { label: "a long label that wraps", "text-max-width": 60 }),
        node("text-max-width-30", { "text-max-width": 30, "text-wrap": "wrap", label: "a long label that wraps" }),
        ...sweep(node, "text-overflow-wrap", {
            label: "unbreakablewordlabel",
            "text-wrap": "wrap",
            "text-max-width": 50,
        }),
        node("label-newline", { label: "two\nlines", "text-wrap": "wrap" }, { cap: "label=two\\nlines" }),
        node("line-height-2", { "line-height": 2, label: "two\nlines", "text-wrap": "wrap" }),
        ...sweep(node, "text-justification", {
            label: "a long label\nshort",
            "text-wrap": "wrap",
            "text-halign": "right",
        }),
        node("text-outline-width-2", {
            "text-outline-width": 2,
            "text-outline-color": "#000000",
            color: "#ffffff",
            label: "Label",
        }),
        node("text-outline-color-red", { "text-outline-color": "red", "text-outline-width": 2, label: "Label" }),
        node("text-outline-opacity-0-3", {
            "text-outline-opacity": 0.3,
            "text-outline-width": 2,
            "text-outline-color": "red",
            label: "Label",
        }),
        node("text-background-color-yellow", {
            "text-background-color": "yellow",
            "text-background-opacity": 1,
            label: "Label",
        }),
        node("text-background-opacity-0-4", {
            "text-background-opacity": 0.4,
            "text-background-color": "#377eb8",
            label: "Label",
        }),
        node("text-background-padding-4", {
            "text-background-padding": 4,
            "text-background-opacity": 1,
            "text-background-color": "yellow",
            label: "Label",
        }),
        ...sweep(node, "text-background-shape", {
            "text-background-opacity": 1,
            "text-background-color": "yellow",
            "text-background-padding": 3,
            label: "Label",
        }),
        node("text-border-width-1", { "text-border-width": 1, "text-border-opacity": 1, label: "Label" }),
        node("text-border-color-red", {
            "text-border-color": "red",
            "text-border-width": 1,
            "text-border-opacity": 1,
            label: "Label",
        }),
        node("text-border-opacity-0-3", { "text-border-opacity": 0.3, "text-border-width": 2, label: "Label" }),
        ...sweep(node, "text-border-style", { "text-border-width": 2, "text-border-opacity": 1, label: "Label" }),
        node("text-margin-x-12", { "text-margin-x": 12, label: "Label" }),
        node("text-margin-y-neg-12", { "text-margin-y": -12, label: "Label" }),
        node("text-rotation-30deg", { "text-rotation": "30deg", label: "Label" }),
        ...sweep(node, "text-rotation", { label: "Label" }),
        node("label-empty", { label: "" }, { cap: 'label=""' }),
    ],
    "specimen-edges-lines": [
        EDGE_DEFAULT,
        edge("line-color-red", { "line-color": "red" }),
        edge("width-0-5", { width: 0.5 }),
        edge("width-5", { width: 5 }),
        edge("line-opacity-0-3", { "line-opacity": 0.3, width: 4 }),
        edge("opacity-0-3", { opacity: 0.3, width: 4 }),
        ...sweep(edge, "line-style", { width: 2 }),
        edge("line-dash-pattern", { "line-dash-pattern": "12 3 2 3", "line-style": "dashed", width: 2 }),
        edge("line-dash-offset", { "line-dash-offset": 6, "line-style": "dashed", width: 2 }),
        ...sweep(edge, "line-cap", { width: 8 }),
        ...sweep(edge, "line-fill", { width: 6, "line-gradient-stop-colors": "#e41a1c #ffd700 #377eb8" }),
        edge("line-gradient-stop-colors", {
            "line-gradient-stop-colors": "cyan magenta",
            "line-fill": "linear-gradient",
            width: 6,
        }),
        edge("line-gradient-stop-positions", {
            "line-gradient-stop-positions": "0% 80%",
            "line-gradient-stop-colors": "cyan magenta",
            "line-fill": "linear-gradient",
            width: 6,
        }),
        edge("line-outline-width-2", { "line-outline-width": 2, width: 3 }),
        edge("line-outline-color-red", { "line-outline-color": "red", "line-outline-width": 2, width: 3 }),
        ...sweep(edge, "curve-style", {}, [
            "straight",
            "straight-triangle",
            "haystack",
            "bezier",
            "unbundled-bezier",
            "segments",
            "round-segments",
        ]),
        edge("curve-style-taxi", { "curve-style": "taxi" }, { dy: 40, key: "curve-style" }),
        edge("curve-style-round-taxi", { "curve-style": "round-taxi" }, { dy: 40, key: "curve-style" }),
        edge(
            "width-6-straight-triangle",
            { width: 6, "curve-style": "straight-triangle" },
            { cap: "width=6 (straight-triangle)" },
        ),
        edge("haystack-radius-0-8", { "haystack-radius": 0.8, "curve-style": "haystack" }, { ends: BIG_ENDS }),
        edge("bezier-parallel-3", { "curve-style": "bezier" }, { parallel: 3, cap: "curve-style=bezier x3 parallel" }),
        edge("control-point-step-size-12", { "control-point-step-size": 12, "curve-style": "bezier" }, { parallel: 3 }),
        edge(
            "straight-parallel-2",
            { "curve-style": "straight" },
            { parallel: 2, cap: "curve-style=straight x2 parallel" },
        ),
        edge(
            "haystack-parallel-2",
            { "curve-style": "haystack" },
            { parallel: 2, cap: "curve-style=haystack x2 parallel" },
        ),
        edge(
            "control-point-distances",
            {
                "control-point-distances": "20 -20",
                "control-point-weights": "0.25 0.75",
                "curve-style": "unbundled-bezier",
            },
            { cap: "control-point-distances=20 -20" },
        ),
        edge(
            "control-point-weights",
            { "control-point-weights": 0.2, "control-point-distances": 24, "curve-style": "unbundled-bezier" },
            { cap: "control-point-weights=0.2" },
        ),
        edge(
            "segment-distances",
            { "segment-distances": "20 -20", "segment-weights": "0.25 0.75", "curve-style": "segments" },
            { cap: "segment-distances=20 -20" },
        ),
        edge(
            "segment-weights",
            { "segment-weights": 0.2, "segment-distances": 24, "curve-style": "segments" },
            { cap: "segment-weights=0.2" },
        ),
        edge("segment-radii-12", {
            "segment-radii": 12,
            "segment-distances": "24 -24",
            "segment-weights": "0.3 0.7",
            "curve-style": "round-segments",
        }),
        ...sweep(edge, "radius-type", {
            "segment-radii": 12,
            "segment-distances": "24 -24",
            "segment-weights": "0.3 0.7",
            "curve-style": "round-segments",
        }),
        ...E("taxi-direction").map((d) =>
            edge(
                `taxi-direction-${d}`,
                { "taxi-direction": d, "curve-style": "taxi" },
                { dy: 40, key: "taxi-direction" },
            ),
        ),
        // leftward / rightward (upward / downward) only differ from horizontal (vertical) when the target lies
        // on the other side, so each is drawn again with the target left of (above) the source
        ...["leftward", "rightward"].map((d) =>
            edge(
                `taxi-direction-${d}-target-left`,
                { "taxi-direction": d, "curve-style": "taxi" },
                { dy: -40, swap: true, key: "taxi-direction", cap: `taxi-direction=${d} (target left)` },
            ),
        ),
        ...["upward", "downward"].map((d) =>
            edge(
                `taxi-direction-${d}-target-above`,
                { "taxi-direction": d, "curve-style": "taxi" },
                { dy: -40, key: "taxi-direction", cap: `taxi-direction=${d} (target above)` },
            ),
        ),
        edge(
            "taxi-turn-20pct",
            { "taxi-turn": "20%", "curve-style": "taxi", "taxi-direction": "horizontal" },
            { dy: 40, cap: "taxi-turn=20%" },
        ),
        edge("taxi-turn-10", { "taxi-turn": 10, "curve-style": "taxi", "taxi-direction": "horizontal" }, { dy: 40 }),
        edge(
            "taxi-turn-min-distance-60",
            { "taxi-turn-min-distance": 60, "curve-style": "taxi", "taxi-direction": "vertical" },
            { dy: 40 },
        ),
        edge(
            "taxi-radius-4",
            { "taxi-radius": 4, "curve-style": "round-taxi", "taxi-direction": "horizontal" },
            { dy: 40 },
        ),
        ...sweep(edge, "edge-distances", { "curve-style": "bezier" }, E("edge-distances")).map((s) => ({
            ...s,
            parallel: 2,
            ends: BIG_ENDS,
        })),
        ...[...E("source-endpoint"), "90deg", "-50% 0%"].map((v) =>
            edge(
                `source-endpoint-${slug(v)}`,
                { "source-endpoint": v },
                { ends: BIG_ENDS, dy: 16, key: "source-endpoint" },
            ),
        ),
        ...[...E("target-endpoint"), "270deg", "50% 0%"].map((v) =>
            edge(
                `target-endpoint-${slug(v)}`,
                { "target-endpoint": v },
                { ends: BIG_ENDS, dy: 16, key: "target-endpoint" },
            ),
        ),
        edge("source-distance-from-node-8", { "source-distance-from-node": 8 }, { ends: BIG_ENDS }),
        edge("target-distance-from-node-8", { "target-distance-from-node": 8 }, { ends: BIG_ENDS }),
        loop("loop", {}, { cap: "self loop" }),
        loop("loop-direction-90deg", { "loop-direction": "90deg" }),
        loop("loop-sweep-30deg", { "loop-sweep": "30deg" }),
        loop("loop-control-point-step-size-60", { "control-point-step-size": 60 }, { key: "control-point-step-size" }),
        // hiding on an edge, and what hiding an end node does to its edge: display: none on a node removes its edges
        // too, visibility: hidden does not
        edge("edge-visibility-hidden", { visibility: "hidden" }),
        edge("edge-display-none", { display: "none" }),
        edge(
            "target-display-none",
            {},
            {
                rules: [{ selector: "#target-display-none-t", style: { display: "none" } }],
                cap: "target node display=none",
            },
        ),
        edge(
            "target-visibility-hidden",
            {},
            {
                rules: [{ selector: "#target-visibility-hidden-t", style: { visibility: "hidden" } }],
                cap: "target node visibility=hidden",
            },
        ),
        // an edge's underlay and overlay follow its line, not a node box
        edge(
            "edge-underlay-opacity-0-5",
            { "underlay-opacity": 0.5, "underlay-color": "#2ca02c", "underlay-padding": 6 },
            { key: "underlay-opacity" },
        ),
        edge(
            "edge-overlay-opacity-0-5",
            { "overlay-opacity": 0.5, "overlay-color": "#1f77b4", "overlay-padding": 6 },
            { key: "overlay-opacity" },
        ),
    ],
    "specimen-arrows": [
        EDGE_DEFAULT,
        ...["target", "source", "mid-target", "mid-source"].flatMap((pos) => sweep(edge, `${pos}-arrow-shape`)),
        ...["target", "source", "mid-target", "mid-source"].flatMap((pos) =>
            E(`${pos}-arrow-fill`).map((f) =>
                edge(`${pos}-arrow-fill-${f}`, { [`${pos}-arrow-fill`]: f, [`${pos}-arrow-shape`]: "triangle" }),
            ),
        ),
        // hollow is drawn per shape: the outline of a circle, square and diamond, not only of a triangle
        ...["circle", "square", "diamond"].map((shape) =>
            edge(
                `target-arrow-fill-hollow-${shape}`,
                { "target-arrow-fill": "hollow", "target-arrow-shape": shape },
                { cap: `target-arrow-fill=hollow (${shape})` },
            ),
        ),
        ...["target", "source", "mid-target", "mid-source"].map((pos) =>
            edge(`${pos}-arrow-color-red`, { [`${pos}-arrow-color`]: "red", [`${pos}-arrow-shape`]: "triangle" }),
        ),
        ...["target", "source", "mid-target", "mid-source"].map((pos) =>
            edge(`${pos}-arrow-width-match-line`, {
                [`${pos}-arrow-width`]: "match-line",
                [`${pos}-arrow-shape`]: "square",
                width: 6,
            }),
        ),
        edge("target-arrow-width-10", { "target-arrow-width": 10, "target-arrow-shape": "square" }),
        edge("arrow-scale-2", { "arrow-scale": 2, "target-arrow-shape": "triangle" }),
        edge("arrow-scale-0-5", { "arrow-scale": 0.5, "target-arrow-shape": "triangle" }),
        edge(
            "width-5-target-arrow",
            { width: 5, "target-arrow-shape": "triangle" },
            { cap: "width=5 (arrow follows)" },
        ),
        edge(
            "arrow-on-bezier",
            { "target-arrow-shape": "triangle", "mid-target-arrow-shape": "triangle", "curve-style": "bezier" },
            { parallel: 2, cap: "arrows on bezier x2" },
        ),
        edge(
            "arrow-on-segments",
            {
                "target-arrow-shape": "triangle",
                "mid-target-arrow-shape": "triangle",
                "curve-style": "segments",
                "segment-distances": 20,
            },
            { cap: "arrows on segments" },
        ),
        loop("arrow-on-loop", { "target-arrow-shape": "triangle" }, { cap: "target arrow on a loop" }),
        edge(
            "arrow-on-taxi",
            { "target-arrow-shape": "triangle", "curve-style": "taxi", "taxi-direction": "horizontal" },
            { dy: 40, cap: "target arrow on taxi" },
        ),
        edge(
            "arrow-on-haystack",
            { "target-arrow-shape": "triangle", "curve-style": "haystack" },
            { cap: "target arrow on haystack (none drawn)" },
        ),
        edge(
            "arrow-on-unbundled-bezier",
            {
                "target-arrow-shape": "triangle",
                "curve-style": "unbundled-bezier",
                "control-point-distances": 20,
                "control-point-weights": 0.5,
            },
            { cap: "target arrow on unbundled-bezier" },
        ),
    ],
    "specimen-edge-labels": [
        edge("default", { label: "Label" }, { cap: "label=Label" }),
        edge("font-size-14", { "font-size": 14, label: "Label" }),
        edge("color-red", { color: "red", label: "Label" }),
        edge("font-family-dejavu-serif", { "font-family": "DejaVu Serif", label: "Label" }),
        edge("font-weight-bold", { "font-weight": "bold", label: "Label" }),
        edge("font-style-italic", { "font-style": "italic", label: "Label" }),
        edge("text-rotation-autorotate", { "text-rotation": "autorotate", label: "Label" }, { dy: 40 }),
        edge("text-rotation-none", { "text-rotation": "none", label: "Label" }, { dy: 40 }),
        edge("text-rotation-30deg", { "text-rotation": "30deg", label: "Label" }),
        edge("text-margin-y-neg-10", { "text-margin-y": -10, label: "Label" }),
        edge("text-margin-x-20", { "text-margin-x": 20, label: "Label" }),
        edge("text-background-opacity-1", {
            "text-background-opacity": 1,
            "text-background-color": "yellow",
            label: "Label",
        }),
        edge("text-background-padding-3", {
            "text-background-padding": 3,
            "text-background-opacity": 1,
            "text-background-color": "yellow",
            label: "Label",
        }),
        edge("text-background-shape-round-rectangle", {
            "text-background-shape": "round-rectangle",
            "text-background-opacity": 1,
            "text-background-color": "yellow",
            "text-background-padding": 3,
            label: "Label",
        }),
        edge("text-border-width-1", { "text-border-width": 1, "text-border-opacity": 1, label: "Label" }),
        edge("text-outline-width-2", { "text-outline-width": 2, "text-outline-color": "#ffffff", label: "Label" }),
        edge("text-wrap-wrap", { "text-wrap": "wrap", "text-max-width": 40, label: "edge label wraps" }),
        edge(
            "label-on-bezier",
            { label: "Label", "curve-style": "bezier" },
            { parallel: 2, cap: "label on bezier x2" },
        ),
        edge(
            "label-on-segments",
            { label: "Label", "curve-style": "segments", "segment-distances": 20 },
            { cap: "label on segments" },
        ),
        edge("source-label", { "source-label": "Src" }),
        edge("target-label", { "target-label": "Tgt" }),
        edge("source-text-offset-30", { "source-text-offset": 30, "source-label": "Src" }),
        edge("target-text-offset-30", { "target-text-offset": 30, "target-label": "Tgt" }),
        edge("source-text-margin-x-10", { "source-text-margin-x": 10, "source-label": "Src" }),
        edge("source-text-margin-y-neg-10", { "source-text-margin-y": -10, "source-label": "Src" }),
        edge("target-text-margin-x-neg-10", { "target-text-margin-x": -10, "target-label": "Tgt" }),
        edge("target-text-margin-y-neg-10", { "target-text-margin-y": -10, "target-label": "Tgt" }),
        ...E("source-text-rotation").map((v) =>
            edge(`source-text-rotation-${v}`, { "source-text-rotation": v, "source-label": "Src" }, { dy: 40 }),
        ),
        edge("source-text-rotation-45deg", { "source-text-rotation": "45deg", "source-label": "Src" }),
        ...E("target-text-rotation").map((v) =>
            edge(`target-text-rotation-${v}`, { "target-text-rotation": v, "target-label": "Tgt" }, { dy: 40 }),
        ),
        edge("target-text-rotation-45deg", { "target-text-rotation": "45deg", "target-label": "Tgt" }),
        edge(
            "all-three-labels",
            { label: "Mid", "source-label": "S", "target-label": "T" },
            { cap: "label + source-label + target-label" },
        ),
        loop("label-on-loop", { label: "Loop" }, { cap: "label on a loop" }),
        edge("text-opacity-0-4", { "text-opacity": 0.4, label: "Label" }),
        edge("text-transform-uppercase", { "text-transform": "uppercase", label: "Label" }),
        edge("text-wrap-ellipsis", { "text-wrap": "ellipsis", "text-max-width": 40, label: "a long edge label" }),
        edge("line-height-2", { "line-height": 2, "text-wrap": "wrap", label: "two\nlines" }),
        edge("text-justification-left", {
            "text-justification": "left",
            "text-wrap": "wrap",
            label: "a long line\nshort",
        }),
        edge("text-outline-color-red", { "text-outline-color": "red", "text-outline-width": 2, label: "Label" }),
        edge("text-border-style-dashed", {
            "text-border-style": "dashed",
            "text-border-width": 1,
            "text-border-opacity": 1,
            label: "Label",
        }),
        edge("text-background-shape-circle", {
            "text-background-shape": "circle",
            "text-background-opacity": 1,
            "text-background-color": "yellow",
            label: "Label",
        }),
        edge(
            "label-on-taxi",
            { label: "Label", "curve-style": "taxi", "taxi-direction": "horizontal" },
            { dy: 40, cap: "label on taxi" },
        ),
        edge(
            "label-on-unbundled-bezier",
            { label: "Label", "curve-style": "unbundled-bezier", "control-point-distances": 20 },
            { cap: "label on unbundled-bezier" },
        ),
        edge("label-on-haystack", { label: "Label", "curve-style": "haystack" }, { cap: "label on haystack" }),
        edge(
            "label-autorotate-on-bezier",
            { label: "Label", "text-rotation": "autorotate", "curve-style": "bezier" },
            { parallel: 2, cap: "autorotate on bezier x2" },
        ),
    ],
    "specimen-groups": [
        group("default", {}),
        group("label-group", { label: "Group" }, { cap: "label=Group" }),
        ...sweep(group, "text-valign", { label: "Group" }, ["top", "center", "bottom"]).map((s) => ({
            ...s,
            id: `group-${s.id}`,
        })),
        group("group-shape-round-rectangle", { shape: "round-rectangle" }, { key: "shape" }),
        ...["ellipse", "cut-rectangle", "barrel", "bottom-round-rectangle", "diamond"].map((v) =>
            group(`group-shape-${v}`, { shape: v }, { key: "shape" }),
        ),
        group("group-background-color", { "background-color": "#c6dbef" }),
        group("group-background-opacity-0", { "background-opacity": 0 }),
        group("group-border-style-dashed", { "border-style": "dashed", "border-width": 2 }),
        group("padding-0", { padding: 0 }),
        group("padding-20", { padding: 20 }),
        ...E("padding-relative-to").map((v) =>
            group(
                `padding-relative-to-${v}`,
                { "padding-relative-to": v, padding: "20%" },
                {
                    key: "padding-relative-to",
                    children: [
                        [-20, 0],
                        [20, 0],
                    ],
                },
            ),
        ),
        // children close together, so the minimum size and its bias stay inside the cell
        ...[
            ["min-width-80", { "min-width": 80 }, undefined],
            ["min-width-bias-left", { "min-width-bias-left": "80%", "min-width": 80 }, "min-width-bias-left=80%"],
            ["min-width-bias-right", { "min-width-bias-right": "80%", "min-width": 80 }, "min-width-bias-right=80%"],
        ].map(([id, st, cap]) =>
            group(id, st, {
                cap,
                children: [
                    [-6, -4],
                    [6, 8],
                ],
            }),
        ),
        ...[
            ["min-height-64", { "min-height": 64 }, undefined],
            ["min-height-bias-top", { "min-height-bias-top": "80%", "min-height": 64 }, "min-height-bias-top=80%"],
            [
                "min-height-bias-bottom",
                { "min-height-bias-bottom": "80%", "min-height": 64 },
                "min-height-bias-bottom=80%",
            ],
        ].map(([id, st, cap]) =>
            group(id, st, {
                cap,
                children: [
                    [-14, -10],
                    [14, -2],
                ],
            }),
        ),
        ...E("compound-sizing-wrt-labels").map((v) =>
            group(
                `compound-sizing-wrt-labels-${v}`,
                { "compound-sizing-wrt-labels": v },
                {
                    key: "compound-sizing-wrt-labels",
                    rules: [
                        {
                            selector: `#compound-sizing-wrt-labels-${v}-b`,
                            style: { label: "child", "text-valign": "bottom" },
                        },
                    ],
                },
            ),
        ),
        group("nested", {}, { nested: true, cap: "nested compound" }),
        group("one-child", {}, { children: [[0, 0]], cap: "one child" }),
        ...E("z-compound-depth").map((v) =>
            group(
                `z-compound-depth-${v}`,
                { "z-compound-depth": v },
                { key: "z-compound-depth", others: [{ dx: 18, dy: 0 }] },
            ),
        ),
        group("edge-inside-group", {}, { cap: "edge between children", innerEdge: true }),
        ...["left", "right"].map((v) =>
            group(
                `group-text-halign-${v}`,
                { "text-halign": v, "text-valign": "center", label: "Group" },
                { key: "text-halign" },
            ),
        ),
        group("group-border-color-red", { "border-color": "red", "border-width": 2 }),
        group("group-border-width-4", { "border-width": 4 }),
        group("group-font-size-14", { label: "Group", "font-size": 14 }, { key: "font-size" }),
        group(
            "edge-to-group",
            {},
            { cap: "edge from a compound to a node", outerEdge: true, others: [{ dx: 46, dy: 0, classes: "child" }] },
        ),
    ],
    "specimen-images-charts": [
        NODE_DEFAULT,
        node("background-image", { "background-image": QUADRANTS }, { cap: "background-image=quadrants.svg" }),
        node(
            "background-image-png",
            { "background-image": CHECKER, "background-fit": "cover" },
            { cap: "background-image=checker.png" },
        ),
        ...sweep(node, "background-fit", { "background-image": QUADRANTS }),
        ...sweep(node, "background-repeat", {
            "background-image": QUADRANTS,
            "background-width": 12,
            "background-height": 12,
        }),
        ...sweep(node, "background-clip", {
            "background-image": QUADRANTS,
            "background-width": 50,
            "background-height": 50,
        }),
        ...sweep(node, "background-image-containment", {
            "background-image": QUADRANTS,
            "background-fit": "contain",
            padding: 8,
        }),
        ...sweep(node, "background-image-smoothing", { "background-image": CHECKER, "background-fit": "cover" }),
        ...sweep(node, "background-image-crossorigin", { "background-image": QUADRANTS }),
        node("background-image-opacity-0-4", { "background-image-opacity": 0.4, "background-image": QUADRANTS }),
        node("background-width-auto", { "background-width": "auto", "background-image": WIDE }),
        node("background-width-30", { "background-width": 30, "background-image": QUADRANTS }),
        node(
            "background-width-50pct",
            { "background-width": "50%", "background-image": QUADRANTS },
            { cap: "background-width=50%" },
        ),
        node("background-height-auto", { "background-height": "auto", "background-image": WIDE }),
        node("background-height-30", { "background-height": 30, "background-image": QUADRANTS }),
        ...sweep(node, "background-width-relative-to", {
            "background-image": QUADRANTS,
            "background-width": "100%",
            padding: 8,
        }),
        ...sweep(node, "background-height-relative-to", {
            "background-image": QUADRANTS,
            "background-height": "100%",
            padding: 8,
        }),
        node(
            "background-position-x-0pct",
            { "background-position-x": "0%", "background-image": QUADRANTS },
            { cap: "background-position-x=0%" },
        ),
        node(
            "background-position-x-100pct",
            { "background-position-x": "100%", "background-image": QUADRANTS },
            { cap: "background-position-x=100%" },
        ),
        node(
            "background-position-y-0pct",
            { "background-position-y": "0%", "background-image": QUADRANTS },
            { cap: "background-position-y=0%" },
        ),
        node(
            "background-position-y-100pct",
            { "background-position-y": "100%", "background-image": QUADRANTS },
            { cap: "background-position-y=100%" },
        ),
        node("background-offset-x-8", { "background-offset-x": 8, "background-image": QUADRANTS }),
        node("background-offset-y-8", { "background-offset-y": 8, "background-image": QUADRANTS }),
        node(
            "background-image-two-layers",
            { "background-image": `${QUADRANTS} ${WIDE}`, "background-fit": "none contain" },
            { cap: "background-image=two layers" },
        ),
        node(
            "background-image-on-rectangle",
            { "background-image": QUADRANTS, "background-fit": "cover", shape: "rectangle" },
            { cap: "background-image on rectangle" },
        ),
        node(
            "pie-16-slices",
            Object.fromEntries(
                PALETTE.flatMap((c, i) => [
                    [`pie-${i + 1}-background-color`, c],
                    [`pie-${i + 1}-background-size`, "6.25%"],
                ]),
            ),
            { cap: "pie-1..16-background-color/size" },
        ),
        node("pie-three-slices", pie3(), { cap: "pie 30% 50% 20%" }),
        node(
            "pie-partial",
            { "pie-1-background-color": "#e41a1c", "pie-1-background-size": "40%" },
            { cap: "pie-1-background-size=40%" },
        ),
        node("pie-size-60pct", { "pie-size": "60%", ...pie3() }, { cap: "pie-size=60%" }),
        node("pie-hole-50pct", { "pie-hole": "50%", ...pie3() }, { cap: "pie-hole=50%" }),
        node("pie-start-angle-90deg", { "pie-start-angle": "90deg", ...pie3() }),
        node(
            "pie-background-opacity-0-4",
            Object.fromEntries(
                PALETTE.flatMap((c, i) => [
                    [`pie-${i + 1}-background-opacity`, 0.4],
                    [`pie-${i + 1}-background-color`, c],
                    [`pie-${i + 1}-background-size`, "6.25%"],
                ]),
            ),
            { cap: "pie-1..16-background-opacity=0.4" },
        ),
        node("pie-on-rectangle", { shape: "rectangle", ...pie3() }, { cap: "pie on rectangle" }),
        node(
            "stripe-16",
            Object.fromEntries(
                PALETTE.flatMap((c, i) => [
                    [`stripe-${i + 1}-background-color`, c],
                    [`stripe-${i + 1}-background-size`, "6.25%"],
                ]),
            ),
            { cap: "stripe-1..16-background-color/size" },
        ),
        node("stripe-three", stripe3(), { cap: "stripe 30% 50% 20%" }),
        ...sweep(node, "stripe-direction", stripe3()),
        node("stripe-size-60pct", { "stripe-size": "60%", ...stripe3() }, { cap: "stripe-size=60%" }),
        node(
            "stripe-background-opacity-0-4",
            Object.fromEntries(
                PALETTE.flatMap((c, i) => [
                    [`stripe-${i + 1}-background-opacity`, 0.4],
                    [`stripe-${i + 1}-background-color`, c],
                    [`stripe-${i + 1}-background-size`, "6.25%"],
                ]),
            ),
            { cap: "stripe-1..16-background-opacity=0.4" },
        ),
    ],
    "specimen-mappings-bypass": [
        NODE_DEFAULT,
        node("fill-by-id", { "background-color": "#1f77b4" }, { cap: "#id { background-color }" }),
        node(
            "fill-by-class",
            {},
            {
                classes: "blue",
                cap: ".class { background-color }",
                rules: [{ selector: "node.blue", style: { "background-color": "#1f77b4" } }],
            },
        ),
        node(
            "fill-by-attribute",
            {},
            {
                data: { kind: "blue" },
                cap: "[kind = 'blue'] { background-color }",
                rules: [{ selector: "node[kind = 'blue']", style: { "background-color": "#1f77b4" } }],
            },
        ),
        node(
            "fill-by-data",
            { "background-color": "data(fill)" },
            { data: { fill: "#1f77b4" }, cap: "background-color=data(fill)" },
        ),
        node(
            "fill-by-mapdata-lo",
            { "background-color": "mapData(score, 0, 10, #1f77b4, #d62728)" },
            { data: { score: 0 }, cap: "mapData(score 0 of 0..10) blue..red" },
        ),
        node(
            "fill-by-mapdata-mid",
            { "background-color": "mapData(score, 0, 10, #1f77b4, #d62728)" },
            { data: { score: 5 }, cap: "mapData(score 5 of 0..10) blue..red" },
        ),
        node(
            "fill-by-mapdata-hi",
            { "background-color": "mapData(score, 0, 10, #1f77b4, #d62728)" },
            { data: { score: 10 }, cap: "mapData(score 10 of 0..10) blue..red" },
        ),
        node(
            "fill-by-mapdata-clamped",
            { "background-color": "mapData(score, 0, 10, #1f77b4, #d62728)" },
            { data: { score: 20 }, cap: "mapData(score 20 of 0..10) clamps" },
        ),
        {
            kind: "node",
            id: "fill-by-bypass",
            cap: "element style { background-color }",
            bypass: { "background-color": "#1f77b4" },
        },
        {
            kind: "node",
            id: "bypass-over-rule",
            cap: "bypass over #id rule (red)",
            style: { "background-color": "red" },
            bypass: { "background-color": "#1f77b4" },
        },
        node(
            "later-rule-wins",
            { "background-color": "red" },
            {
                cap: "two rules: later (blue) wins",
                rules: [{ selector: "#later-rule-wins", style: { "background-color": "#1f77b4" } }],
            },
        ),
        node(
            "class-rule-after-id",
            { "background-color": "red" },
            {
                classes: "blue-late",
                cap: "#id red, then .class blue",
                rules: [{ selector: "node.blue-late", style: { "background-color": "#1f77b4" } }],
            },
        ),
        node("size-by-data", { width: "data(w)", height: "data(w)" }, { data: { w: 24 }, cap: "width=data(w) w=24" }),
        node(
            "size-by-mapdata-lo",
            { width: "mapData(score, 0, 10, 16, 56)", height: "mapData(score, 0, 10, 16, 56)" },
            { data: { score: 0 }, cap: "width=mapData(score 0, 16..56)" },
        ),
        node(
            "size-by-mapdata-hi",
            { width: "mapData(score, 0, 10, 16, 56)", height: "mapData(score, 0, 10, 16, 56)" },
            { data: { score: 10 }, cap: "width=mapData(score 10, 16..56)" },
        ),
        node(
            "border-width-by-mapdata",
            { "border-width": "mapData(score, 0, 10, 0, 8)" },
            { data: { score: 5 }, cap: "border-width=mapData(score 5, 0..8)" },
        ),
        node(
            "shape-by-data",
            { shape: "data(shape)" },
            { data: { shape: "diamond" }, cap: "shape=data(shape) diamond" },
        ),
        node(
            "shape-by-attribute",
            {},
            {
                data: { kind: "d" },
                cap: "[kind = 'd'] { shape: diamond }",
                rules: [{ selector: "node[kind = 'd']", style: { shape: "diamond" } }],
            },
        ),
        node("shape-by-bypass", {}, { cap: "element style { shape: diamond }", bypass: { shape: "diamond" } }),
        node("label-by-data", { label: "data(name)" }, { data: { name: "Named" }, cap: "label=data(name)" }),
        node("label-data-missing", { label: "data(missing)" }, { cap: "label=data(missing)" }),
        node("label-by-bypass", {}, { cap: "element style { label }", bypass: { label: "Bypassed" } }),
        node(
            "border-by-bool",
            {},
            {
                data: { flag: true },
                cap: "[?flag] { border-style: dashed }",
                rules: [{ selector: "node[?flag]", style: { "border-style": "dashed", "border-width": 3 } }],
            },
        ),
        node(
            "fill-by-numeric-attribute",
            {},
            {
                data: { deg: 7 },
                cap: "[deg >= 5] { background-color }",
                rules: [{ selector: "node[deg >= 5]", style: { "background-color": "#1f77b4" } }],
            },
        ),
        node(
            "fill-by-prefix-attribute",
            {},
            {
                data: { name: "Nine" },
                cap: "[name ^= 'Ni'] { background-color }",
                rules: [{ selector: "node[name ^= 'Ni']", style: { "background-color": "#1f77b4" } }],
            },
        ),
        node(
            "fill-by-degree",
            {},
            {
                cap: "[[degree = 0]] { background-color }",
                rules: [{ selector: "#fill-by-degree[[degree = 0]]", style: { "background-color": "#1f77b4" } }],
            },
        ),
        node(
            "pie-by-mapdata",
            {
                "pie-1-background-color": "#e41a1c",
                "pie-1-background-size": "mapData(a, 0, 100, 0, 100)",
                "pie-2-background-color": "#377eb8",
                "pie-2-background-size": "mapData(b, 0, 100, 0, 100)",
            },
            { data: { a: 30, b: 50 }, cap: "pie sizes = mapData(a 30, b 50)" },
        ),
        node(
            "opacity-by-mapdata",
            { opacity: "mapData(score, 0, 10, 0.1, 1)" },
            { data: { score: 3 }, cap: "opacity=mapData(score 3, 0.1..1)" },
        ),
        edge(
            "edge-color-by-data",
            { "line-color": "data(color)" },
            { data: { color: "#1f77b4" }, cap: "line-color=data(color)" },
        ),
        edge(
            "edge-width-by-mapdata",
            { width: "mapData(weight, 0, 10, 1, 9)" },
            { data: { weight: 5 }, cap: "width=mapData(weight 5, 1..9)" },
        ),
        edge(
            "edge-color-by-mapdata",
            { "line-color": "mapData(weight, 0, 10, #1f77b4, #d62728)" },
            { data: { weight: 10 }, cap: "line-color=mapData(weight 10)" },
        ),
        edge("edge-label-by-data", { label: "data(name)" }, { data: { name: "Named" }, cap: "label=data(name)" }),
        edge(
            "edge-by-class",
            {},
            { classes: "thick", cap: ".thick { width: 5 }", rules: [{ selector: "edge.thick", style: { width: 5 } }] },
        ),
        {
            kind: "edge",
            id: "edge-by-bypass",
            cap: "element style { line-color }",
            bypass: { "line-color": "#1f77b4", width: 4 },
        },
        edge(
            "edge-arrow-by-attribute",
            {},
            {
                data: { directed: true },
                cap: "edge[?directed] { target-arrow }",
                rules: [{ selector: "edge[?directed]", style: { "target-arrow-shape": "triangle" } }],
            },
        ),
        node(
            "selector-childless",
            {},
            {
                classes: "cl",
                cap: "node:childless.cl { background }",
                rules: [{ selector: "node.cl:childless", style: { "background-color": "#1f77b4" } }],
            },
        ),
        // element state saved by cy.json() (selected, selectable, locked, grabbable) and the selectors that read it
        node("state-selected-no-rule", {}, { el: { selected: true }, cap: "selected: true, no :selected rule" }),
        ...[
            ["selected", { selected: true }],
            ["unselectable", { selectable: false }],
            ["locked", { locked: true }],
            ["ungrabbable", { grabbable: false }],
        ].map(([state, el]) =>
            node(
                `state-${state}`,
                {},
                {
                    el,
                    classes: `st-${state}`,
                    cap: `${Object.keys(el)[0]}: ${Object.values(el)[0]}, node.st:${state} { blue }`,
                    rules: [{ selector: `node.st-${state}:${state}`, style: { "background-color": "#1f77b4" } }],
                },
            ),
        ),
        {
            kind: "edge",
            id: "edge-state-selected",
            el: { selected: true },
            cap: "edge selected: true, edge.st:selected { blue }",
            classes: "st-edge",
            rules: [{ selector: "edge.st-edge:selected", style: { "line-color": "#1f77b4", width: 4 } }],
        },
        // the data selector operators the docs list (https://js.cytoscape.org/#selectors/data), each scoped to its node
        ...[
            ["selector-not-equal", "[score != 3]", { score: 4 }],
            ["selector-less-than", "[score < 3]", { score: 1 }],
            ["selector-less-or-equal", "[score <= 3]", { score: 3 }],
            ["selector-greater-than", "[score > 3]", { score: 4 }],
            ["selector-contains", "[name *= 'ic']", { name: "Nick" }],
            ["selector-suffix", "[name $= 'ck']", { name: "Nick" }],
            ["selector-case-insensitive", "[name @= 'nick']", { name: "NICK" }],
            ["selector-not-prefix", "[name !^= 'Zz']", { name: "Nick" }],
            ["selector-falsy", "[!flag]", { flag: false }],
            ["selector-undefined", "[^missing]", {}],
            ["selector-defined", "[name]", { name: "Nick" }],
            ["selector-indegree", "[[indegree = 0]]", {}],
        ].map(([id, q, data]) =>
            node(
                id,
                {},
                {
                    data,
                    cap: `${q} { background-color }`,
                    rules: [{ selector: `#${id}${q}`, style: { "background-color": "#1f77b4" } }],
                },
            ),
        ),
        node(
            "selector-two-classes",
            {},
            {
                classes: "ka kb",
                cap: "node.ka.kb { background-color }",
                rules: [{ selector: "node.ka.kb", style: { "background-color": "#1f77b4" } }],
            },
        ),
        node(
            "selector-list",
            {},
            {
                cap: "#nothing, #id { background-color }",
                rules: [{ selector: "#nothing, #selector-list", style: { "background-color": "#1f77b4" } }],
            },
        ),
        node(
            "selector-no-match",
            {},
            {
                data: { score: 1 },
                cap: "[score > 3] (score 1) { red }: no match",
                rules: [{ selector: "#selector-no-match[score > 3]", style: { "background-color": "red" } }],
            },
        ),
        {
            kind: "loop",
            id: "selector-loop",
            style: { "curve-style": "bezier" },
            classes: "lp",
            cap: "edge.lp:loop { line-color }",
            rules: [{ selector: "edge.lp:loop", style: { "line-color": "#1f77b4", width: 3 } }],
        },
        edge(
            "edge-by-source",
            {},
            {
                cap: "edge[source = id] { line-color }",
                rules: [
                    { selector: 'edge[source = "edge-by-source-s"]', style: { "line-color": "#1f77b4", width: 3 } },
                ],
            },
        ),
    ],
    // How a value is spelled: the color syntaxes Cytoscape.js's color2tuple reads or refuses, its property aliases
    // (cy.style().properties entries with pointsTo), camelCase names and angle units. Every rule is written as
    // authored (`raw`), since cy.json() would respell it.
    "specimen-mappings-bypass-p2": [
        ...[
            ["uppercase-hex", "#1F77B4"],
            ["uppercase-short-hex", "#F80"],
            ["named-steelblue", "steelblue"],
            ["named-mixed-case", "SteelBlue"],
            ["rgb-percent", "rgb(100%,50%,0%)"],
            ["rgb-spaces", "rgb( 44 , 160 , 44 )"],
            ["rgba-alpha-0", "rgba(31,119,180,0)"],
            ["hsl-negative-hue", "hsl(-60,70%,50%)"],
            ["hsl-hue-420", "hsl(420,70%,50%)"],
            ["invalid-rgb-mixed-percent", "rgb(100%,127,0)"],
            ["invalid-rgb-300", "rgb(300,0,0)"],
            ["invalid-rebeccapurple", "rebeccapurple"],
            ["invalid-8-digit-hex", "#1f77b4cc"],
            ["invalid-hsl-no-percent", "hsl(120,60,40)"],
            ["invalid-word", "notacolor"],
        ].map(([id, c]) =>
            node(`background-color-${id}`, { "background-color": c }, { raw: true, cap: `background-color=${c}` }),
        ),
        node("border-color-hex", { "border-color": "#D62728", "border-width": 3 }, { raw: true }),
        node("color-named", { color: "crimson", label: "Label" }, { raw: true }),
        node(
            "gradient-stop-colors-mixed-syntax",
            { "background-fill": "linear-gradient", "background-gradient-stop-colors": "#e41a1c gold rgb(55,126,184)" },
            { raw: true, key: "background-gradient-stop-colors" },
        ),
        edge("line-color-hex", { "line-color": "#D62728", width: 3 }, { raw: true }),
        edge(
            "target-arrow-color-named",
            { "target-arrow-color": "crimson", "target-arrow-shape": "triangle" },
            { raw: true },
        ),
        node("background-color-camel-case", { backgroundColor: "#1f77b4" }, { raw: true }),
        node("border-width-camel-case", { borderWidth: 5 }, { raw: true }),
        node("width-number", { width: 20 }, { raw: true, cap: "width=20 (a JSON number)" }),
        node("width-px-string", { width: "20px" }, { raw: true }),
        node("text-rotation-0-5rad", { "text-rotation": "0.5rad", label: "Label" }, { raw: true }),
        node("content", { content: "Label" }, { raw: true }),
        edge("content-edge", { content: "Label" }, { raw: true, cap: "content=Label (edge)" }),
        ...["padding-left", "padding-right", "padding-top", "padding-bottom"].map((a) =>
            node(a, { [a]: 12 }, { raw: true }),
        ),
        edge(
            "control-point-distance",
            { "control-point-distance": 24, "control-point-weight": 0.5, "curve-style": "unbundled-bezier" },
            { raw: true },
        ),
        edge(
            "control-point-weight",
            { "control-point-weight": 0.2, "control-point-distances": 24, "curve-style": "unbundled-bezier" },
            { raw: true },
        ),
        edge(
            "segment-distance",
            { "segment-distance": 24, "segment-weights": 0.5, "curve-style": "segments" },
            { raw: true },
        ),
        edge(
            "segment-weight",
            { "segment-weight": 0.2, "segment-distances": 24, "curve-style": "segments" },
            { raw: true },
        ),
        edge(
            "segment-radius",
            {
                "segment-radius": 12,
                "segment-distances": "24 -24",
                "segment-weights": "0.3 0.7",
                "curve-style": "round-segments",
            },
            { raw: true },
        ),
        edge("edge-text-rotation", { "edge-text-rotation": "30deg", label: "Label" }, { raw: true }),
    ],
};
/** Three pie slices 30% 50% 20%. */
function pie3() {
    return {
        "pie-1-background-color": "#e41a1c",
        "pie-1-background-size": "30%",
        "pie-2-background-color": "#377eb8",
        "pie-2-background-size": "50%",
        "pie-3-background-color": "#4daf4a",
        "pie-3-background-size": "20%",
    };
}
/** Three stripes 30% 50% 20%. */
function stripe3() {
    return {
        "stripe-1-background-color": "#e41a1c",
        "stripe-1-background-size": "30%",
        "stripe-2-background-color": "#377eb8",
        "stripe-2-background-size": "50%",
        "stripe-3-background-color": "#4daf4a",
        "stripe-3-background-size": "20%",
    };
}

// ------------------------------------------------------------------ writing

/**
 * A sheet's pages: at most layout.maxSpecimens specimens each.
 * @param id - the category
 * @param specs - its specimens
 * @returns [[pageId, specs]]
 */
function pages(id, specs) {
    const per = layout.maxSpecimens;
    const count = Math.ceil(specs.length / per);
    const size = Math.ceil(specs.length / count);
    return Array.from({ length: count }, (_, i) => [i ? `${id}-p${i + 1}` : id, specs.slice(i * size, (i + 1) * size)]);
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
mkdirSync(out, { recursive: true });
const coverage = {}; // property -> { value -> [sheet#specimen] }
const written = [];
for (const [category, specs] of Object.entries(SHEETS)) {
    for (const [sheet, list] of pages(category, specs)) {
        const seen = new Set();
        for (const s of list) {
            if (!ID.test(s.id) || seen.has(s.id)) throw new Error(`${sheet}: bad or repeated specimen id ${s.id}`);
            seen.add(s.id);
        }
        const { elements, rules, bypass, raw } = place(list);
        const cy = cytoscape({
            headless: true,
            styleEnabled: true,
            elements,
            style: [...BASE, ...rules],
            layout: { name: "preset" },
        });
        const json = cy.json();
        cy.destroy();
        // a `raw` specimen's rule as authored: in place when cy.json() kept the rule, else appended (a rule whose
        // every value Cytoscape.js refused is not written at all); its selector is unique, so its place is free
        const keep = new Set(Object.keys(raw));
        json.style = json.style.map((r) => (keep.delete(r.selector) ? { ...r, style: raw[r.selector] } : r));
        for (const sel of keep) json.style.push({ selector: sel, style: raw[sel] });
        const doc = {
            elements: {
                nodes: json.elements.nodes.map((n) => (bypass[n.data.id] ? { ...n, style: bypass[n.data.id] } : n)),
                edges: (json.elements.edges ?? []).map((e) =>
                    bypass[e.data.id] ? { ...e, style: bypass[e.data.id] } : e,
                ),
            },
            style: json.style,
            zoom: json.zoom,
            pan: json.pan,
            data: {
                sheet,
                about: `Cytoscape.js style specimen sheet ${sheet}: one setting per element, caption nodes cap-<id> name it; written by graph-io/test/fidelity/generators/specimens/cytoscapejs.mjs with cy.json() of Cytoscape.js ${version}`,
            },
        };
        writeFileSync(join(out, `${sheet}.json`), `${JSON.stringify(doc, null, 4)}\n`);
        written.push({ id: sheet, specimens: list.length });
        // coverage: every property a specimen's own rule or bypass sets, and its value(s)
        for (const s of list) {
            const sets = [s.style, s.bypass, ...(s.rules ?? []).map((r) => r.style)].filter(Boolean);
            for (const st of sets) {
                for (const [k0, v] of Object.entries(st)) {
                    const k = canonicalName(k0);
                    const at = `${sheet}#${s.id}`;
                    const p = (coverage[k] ??= { specimens: new Set(), values: {} });
                    p.specimens.add(at);
                    if (vocab[k]?.enums) {
                        for (const one of String(v).split(/\s+/)) {
                            if (vocab[k].enums.includes(one)) (p.values[one] ??= new Set()).add(at);
                        }
                    }
                }
            }
        }
    }
}

const uncovered = [];
const report = {};
let valuesCovered = 0;
let propertiesCovered = 0;
for (const p of vocabulary.properties) {
    const c = coverage[p.name];
    if (NOT_DRAWN[p.name]) {
        report[p.name] = { notDrawn: NOT_DRAWN[p.name] };
        continue;
    }
    if (!c) {
        uncovered.push(p.name);
        continue;
    }
    propertiesCovered++;
    const entry = { specimens: [...c.specimens].slice(0, 6) };
    if (p.enums) {
        entry.values = {};
        for (const v of p.enums) {
            if (c.values[v]) {
                entry.values[v] = [...c.values[v]].slice(0, 3);
                valuesCovered++;
            } else if (NOT_DRAWN[`${p.name}=${v}`]) entry.values[v] = { notDrawn: NOT_DRAWN[`${p.name}=${v}`] };
            else uncovered.push(`${p.name}=${v}`);
        }
    }
    report[p.name] = entry;
}
for (const k of Object.keys(coverage)) if (!vocab[k]) uncovered.push(`${k} (not in the vocabulary)`);
writeFileSync(
    COVERAGE,
    `${JSON.stringify(
        {
            program: `Cytoscape.js ${version}`,
            about: "Which specimen draws each property and enumerated value of cytoscapejs-vocabulary.json (at most a few named each), or why none can; written by cytoscapejs.mjs.",
            sheets: written,
            propertiesCovered,
            propertiesNotDrawn: Object.keys(NOT_DRAWN).filter((k) => !k.includes("=")).length,
            valuesCovered,
            uncovered,
            properties: report,
        },
        null,
        4,
    )}\n`,
);
console.log(
    `cytoscapejs.mjs: ${written.length} sheets, ${written.reduce((a, s) => a + s.specimens, 0)} specimens; ${propertiesCovered} properties and ${valuesCovered} enumerated values covered, ${Object.keys(NOT_DRAWN).length} not drawn`,
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
