#!/usr/bin/env node
// Writes screens/styles-list.html from kit/fixtures.json (the 300-protein network): the style stack
// in the right panel (the inspector's Style stack section with nothing selected, its Appearance
// section with something selected), its editors, the color picker, the Look control and the
// canvas legend. The placement study's pages (study/style-stack-arm-a.html, -b.html) are the
// record of what participants saw and are no longer written here.
// Run from design/ui/prototype/:
//   node screens/styles-list.gen.mjs && node kit/shoot.mjs screens/styles-list.html
// Popovers, tooltips and annotation marks are placed against the rows they belong to with CSS
// anchor positioning in a first pass; the generator then renders that pass in Chromium, reads
// where each landed, and writes plain pixel positions, so the pages work in any browser. The same
// pass measures the laptop frames (rows in view, where Attributes starts) and prints the numbers
// into their notes.
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { toShell } from "../kit/shell.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const proto = resolve(here, "..");
const fx = JSON.parse(readFileSync(join(proto, "kit/fixtures.json"), "utf8"));
const ppi = fx.datasets.ppi;
const bcEnc = ppi.encodings.betweenness;
const sizeBins = ppi.encodings.sizeByDegree.bins;
const path = ppi.encodings.path;
const tp53 = ppi.topByDegree.find((r) => r.id === "TP53");
const hubs = bcEnc.hubLabels;
const expr = ppi.expression;
const modCounts = ppi.attributes.find((a) => a.name === "module").values;
const modColors = ppi.moduleColors;
const tp53Neighbors = ppi.tp53Slice.nodes - 1;
const below0 = ppi.encodings.foldChange.below0;
const above0 = ppi.encodings.foldChange.above0;
const [p2, p3] = bcEnc.morePaths;
const N = ppi.nodes;
const E = ppi.edges;
const nf = (n) => n.toLocaleString("en-US");
const minus = (s) => String(s).replace(/^-/, "&minus;");
const hubsDrawn = 10; // labels the drawing keeps after collision culling (kit/canvas/ppi-stacked-*.svg)

const I = (name, cls = "k-i") => `<svg class="${cls}"><use href="../kit/icons.svg#${name}"/></svg>`;

// One-line meanings, shown on hover and keyboard focus of every statistic and step label.
// Proposed as glossary.md 12's reader line (framework-changes.md, "Every statistic says what it means").
const MEAN = {
    median: "The middle value: half the proteins are above it, half below.",
    iqr: "Interquartile range: where the middle half of the values lie, from the 25th to the 75th percentile.",
    r: "Effect size, -1 to 1: how far this group's values sit above (+) or below (-) the rest's. Near 0, they overlap.",
    degree: "How many interactions a protein has.",
    betweenness: "How often a protein lies on the shortest paths between other proteins.",
    pagerank: "How much a protein matters, counting how much its neighbors matter.",
    log2FoldChange: "A column from your file. graphty does not know what it measures.",
    density: "The share of the possible connections that exist.",
    components: "Pieces of the graph with no connection between them.",
    edgesInside: "Interactions with both ends in this group.",
    edgesOut: "Interactions from this group to a protein outside it.",
    seed: "The starting number for a method that uses chance. The same seed gives the same groups.",
    community: "A group found by a community-detection method.",
};
const mt = (label, key) => `<span class="mt" tabindex="0" data-tip="${MEAN[key]}">${label}</span>`;

// ---------------------------------------------------------------- chips (canvas-drawing.md 3)
const ramp = (w = 16) => `<span class="k-ramp k-ramp-measure" style="width:${w}px"></span>`;
const rbRamp = (w = 16) => `<span class="k-ramp k-ramp-bluered" style="width:${w}px"></span>`;
const sizechip = `<svg class="sizechip" viewBox="0 0 16 12"><circle cx="3" cy="8" r="2" fill="#808080"/><circle cx="10" cy="6" r="5" fill="#808080"/></svg>`;
const dash = `<span class="dashchip"></span>`;
const textchip = `<span class="textchip">Aa</span>`;
const chit = (c) => `<span class="k-chit" style="background:${c}"></span>`;
const ringchip = `<svg class="sizechip" viewBox="0 0 16 12"><circle cx="8" cy="6" r="4.5" fill="none" stroke="#808080" stroke-width="1.5"/></svg>`;
const linechip = (op = 1) => `<svg class="sizechip" viewBox="0 0 16 12"><line x1="1" y1="9" x2="15" y2="3" stroke="#808080" stroke-width="1.5" stroke-opacity="${op}"/></svg>`;
const modSorted = Object.entries(modCounts).sort((a, b) => b[1] - a[1]);
const modStack = `<span class="k-stack">${modSorted.slice(0, 3).reverse().map(([m]) => chit(modColors[m])).join("")}</span>`;

// ---------------------------------------------------------------- style layers
// by: "run" and "recipe" carry an origin word; a layer made here carries none (framework-changes.md,
// "Only a layer that was not made here carries an origin word"). count is the trailing-slot count.
const LY = {
    path: { chip: dash, name: `Shortest path ${path.from} to ${path.to}`, by: "run", count: `${path.nodes.length}`, tip: `Marks ${path.nodes.length} proteins and ${path.hops} interactions, with their names` },
    bc: { chip: ramp(), name: "Betweenness color", by: "run", count: nf(N), tip: `Colors ${N} of ${N} proteins` },
    hub: { chip: textchip, name: "Hub labels", count: `${hubs.count}`, tip: `Names the top ${hubs.count} of ${N} proteins by degree` },
    size: { chip: sizechip, name: "Size: degree", count: nf(N), tip: `Sizes ${N} of ${N} proteins` },
    module: { chip: modStack, name: "Module color", count: "0", covered: "Betweenness color", tip: `Colors ${N} of ${N} proteins` },
    fcsize: { chip: sizechip, name: "Size: |log2FoldChange|", count: "0", covered: "Size: degree" },
    pagerank: { chip: sizechip, name: "Size: pagerank", by: "run", count: nf(N), off: true },
    closeness: { chip: ramp(), name: "Closeness color", by: "run", count: nf(N), off: true },
    louvain: { chip: `<span class="k-stack">${chit("#009E73")}${chit("#56B4E9")}${chit("#E69F00")}</span>`, name: "Louvain color", by: "run", count: nf(N), off: true },
    eigen: { chip: sizechip, name: "Eigenvector size", by: "run", count: nf(N), off: true },
    clustering: { chip: ramp(), name: "Clustering color", by: "run", count: nf(N), off: true },
    harmonic: { chip: sizechip, name: "Harmonic size", by: "run", count: nf(N), off: true },
    kinase: { chip: ringchip, name: "Kinase outline", by: "recipe", count: "0", nomatch: true },
    tumor: { chip: linechip(), name: "Tumor-only interactions", by: "recipe", count: "0", nomatch: true },
    drug: { chip: textchip, name: "Drug target labels", by: "recipe", count: "0", nomatch: true },
    qpcr: { chip: rbRamp(), name: "qPCR log2FC color", count: `${expr.matched}`, off: true },
    faint: { chip: linechip(0.35), name: "Faint interactions", count: nf(E) },
    edgecolor: { chip: linechip(), name: "Interaction color", count: nf(E) },
    labelsize: { chip: textchip, name: "Label size", count: nf(N) },
    hubcolor: { chip: chit("#D55E00"), name: "Hub color", count: `${hubs.count}` },
    sel: { chip: `<span class="k-chit nochit"></span>`, name: "TP53", count: "0" },
    // Added from the "+" menu's suggestion "Mute categories under this scale": an ordinary layer made here.
    mute: { chip: `<span class="k-stack">${chit("#d0d0d0")}${chit("#bdbdbd")}${chit("#e3e3e3")}</span>`, name: "Modules in gray", count: `${N - expr.matched}` },
};
const FOUR = ["path", "bc", "hub", "size"];
// The heavy session: 14 layers, top first. Module color sits under Betweenness color, so it paints nothing.
const FOURTEEN = ["path", "bc", "hub", "pagerank", "closeness", "kinase", "tumor", "drug", "qpcr", "module", "faint", "edgecolor", "labelsize", "size"];
const FOURTEEN_DROPPED = ["path", "module", "bc", "hub", "pagerank", "closeness", "kinase", "tumor", "drug", "qpcr", "faint", "edgecolor", "labelsize", "size"];

// ---------------------------------------------------------------- frame bookkeeping
// Every frame registers named anchors (data-a) and overlays placed against them (data-o).
let F = null; // the frame being built
const A = (name) => ` data-a="${name}"`;
function place(oid, a, { x = "right", dx = 0, y = "top", dy = 0, clamp = false } = {}) {
    F.place.push({ oid, a, x, dx, y, dy, clamp });
    return ` data-o="${oid}"${clamp ? ` data-clamp="${clamp === true ? 8 : clamp}"` : ""}`;
}

// ---------------------------------------------------------------- rows
// A style-layer row, visual-language.md A7: drag handle, chip, name, origin word; the trailing slot
// (count, Select painted, eye) on hover and focus; an off layer keeps its closed eye pinned.
// A layer covered everywhere by one above it (it is on, but paints nothing) takes a second line,
// "Covered by {layer} above", and a Move above button in place of the trailing slot, always shown:
// people read a silent layer as a broken tool (study decision, framework-changes.md).
// sel: with something selected (the Appearance section), { wins: "color" } highlights a row that
// paints the selection and names what it wins; { lost: "label", by: "Layer" } marks a row whose
// write on the selection is covered by a layer above, so the overridden layer stays in view.
const grip = `<span class="grip" aria-hidden="true">${I("grip-vertical", "k-i k-i-sm")}</span>`;
function stackRow(key, { focus = false, hover = false, off = null, anchor = "", coveredOverride, drag = false, sel = null } = {}) {
    const l = LY[key];
    const isOff = off ?? !!l.off;
    const covered = isOff ? null : coveredOverride !== undefined ? coveredOverride : l.covered || null;
    const kind = l.nomatch && !isOff ? "matches no protein" : l.by || "";
    const showTrail = hover || focus;
    const two = covered || sel;
    const attrs = [focus ? ' class="k-item focusrow' : ' class="k-item', two ? " covrow" : "", sel?.wins ? " winsrow" : "", '"', hover ? " data-hover" : "", isOff ? " data-off" : "", drag ? " data-dragsrc" : "", anchor ? A(anchor) : ""].join("");
    if (covered) {
        return `<li${attrs}>${grip}<span class="chipslot">${l.chip}</span><span class="k-ellipsis nm">${l.name}</span><span class="k-trail"><span class="k-btn k-btn-secondary movebtn"${A(`move-${key}`)}>Move above</span></span><span class="covline k-fact">Covered by ${covered} above</span></li>`;
    }
    const trail = showTrail
        ? `<span class="k-trail"><span class="k-num">${l.count}</span><span class="k-icon-btn" title="Select painted">${I("scan")}</span><span class="k-icon-btn" title="${isOff ? "Show" : "Hide"}">${I(isOff ? "eye-off" : "eye")}</span></span>`
        : isOff ? `<span class="k-trail"><span class="k-icon-btn" title="Show">${I("eye-off")}</span></span>` : "";
    const selLine = sel ? `<span class="covline ${sel.wins ? "k-fact winline" : "k-fact lostline"}">${sel.wins ? `Wins ${sel.wins}` : `${sel.lost}: covered by ${sel.by} above`}</span>` : "";
    return `<li${attrs}>${grip}<span class="chipslot">${l.chip}</span><span class="k-ellipsis nm">${l.name}</span>${kind && !showTrail ? `<span class="k-kind">${kind}</span>` : ""}${trail}${selLine}</li>`;
}
const baseRow = (anchor = "base", sel = null) => `<li class="k-item${sel ? " covrow winsrow" : ""}"${A(anchor)}><span class="grip"></span>${chit("#808080")}<span class="k-ellipsis nm">Base style</span><span class="k-trail k-tertiary">pinned</span>${sel ? `<span class="covline k-fact winline">Wins ${sel}</span>` : ""}</li>`;
const moreRow = (n, anchor = "more") => `<li class="k-item k-secondary"${A(anchor)}>${I("chevron-down", "k-i k-i-sm")}<span>${n} more</span></li>`;
const nothingRow = (n, anchor = "nothing") => `<li class="k-item"${A(anchor)}>${I("chevron-right", "k-i k-i-sm")}<span>${n} layers match no protein</span></li>`;

// The stack list. atRest: past 4 layers, four rows at rest (the top layers and Base style) and "N more"
// (state-matrix.md 7). Expanded: every row, with a run of two or more layers that match nothing
// collapsed into one row (interaction-pattern-entries.md 6.8). A covered layer is never collapsed:
// each has its own fix, Move above. covered: { key: "Layer above" or null } overrides LY.
function stackList(order, { expanded = false, focus = [], hover = null, off = {}, anchors = {}, covered = {}, drop = null, dragKey = null, sel = {}, baseSel = null } = {}) {
    const row = (k) => stackRow(k, { focus: focus.includes(k), hover: hover === k, off: off[k] ?? null, anchor: anchors[k] || "", coveredOverride: k in covered ? covered[k] : undefined, drag: dragKey === k, sel: sel[k] || null });
    let rows = [];
    if (order.length <= 4) rows = order.map(row);
    else if (!expanded) rows = [...order.slice(0, 3).map(row), moreRow(order.length - 3)];
    else {
        for (let k = 0; k < order.length; ) {
            const isNothing = (j) => j < order.length && !!LY[order[j]].nomatch && !(off[order[j]] ?? LY[order[j]].off);
            let j = k;
            while (isNothing(j)) j++;
            if (j - k >= 2) { rows.push(nothingRow(j - k)); k = j; continue; }
            if (drop === k) rows.push(`<li class="dropline" aria-hidden="true"${A("drop")}></li>`);
            rows.push(row(order[k]));
            k++;
        }
    }
    return `<ul class="k-list stack">${rows.join("")}${baseRow("base", baseSel)}</ul>`;
}

// ---------------------------------------------------------------- chrome
// The rail after round 3: main menu, Graph, Data, Notes, Assistant (information-architecture.md 5,
// framework-changes.md "After round 3"). Results is an inspector section; styles live in the right panel.
const rail = `<nav class="k-rail" aria-label="Main">
      <div class="k-rail-btn" aria-label="Main menu"${A("mainmenu")}><span class="k-rail-pill">${I("menu")}</span></div>
      <div class="k-rail-sep"></div>
      <div class="k-rail-btn" aria-pressed="true"><span class="k-rail-pill">${I("network")}</span>Graph</div>
      <div class="k-rail-btn"><span class="k-rail-pill">${I("database")}</span>Data</div>
      <div class="k-rail-btn"><span class="k-rail-pill">${I("sticky-note")}</span>Notes</div>
      <div class="k-rail-btn k-asst-off" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div>
    </nav>`;
const setRow = (glyph, name, n, kind = "") => `<li class="k-item">${I(glyph)}<span class="k-ellipsis nm">${name}</span>${kind ? `<span class="k-kind">${kind}</span>` : ""}<span class="k-trail k-num">${n}</span></li>`;
const pathRow = (p) => setRow("waypoints", `${p.from} to ${p.to}`, p.nodes.length);
const SETS4 = [
    setRow("group", "Hubs, degree 17 to 34", hubs.count, "rule"),
    setRow("group", "TP53 neighbors", tp53Neighbors),
    setRow("group", "Down in stress", below0, "rule"),
    pathRow({ from: path.from, to: path.to, nodes: path.nodes }),
];
// 5 sets and 3 paths.
const SETS8 = [
    setRow("group", "Hubs, degree 17 to 34", hubs.count, "rule"),
    setRow("group", "TP53 neighbors", tp53Neighbors),
    setRow("group", "Down in stress", below0, "rule"),
    setRow("group", "qPCR hits", expr.matched),
    setRow("group", "DNA repair module", modCounts["DNA repair"], "rule"),
    pathRow({ from: path.from, to: path.to, nodes: path.nodes }),
    pathRow(p2),
    pathRow(p3),
];
// The laptop fixture: 20 sets (state-matrix.md 8, Window/LaptopLeftPanel).
const SETS20 = [
    ...SETS8,
    setRow("group", "Up in stress", above0, "rule"),
    setRow("group", "MAPK1 neighbors", ppi.topByDegree[0].degree),
    setRow("group", "Top 10 by betweenness", 10),
    setRow("group", "Isolated proteins", ppi.stats.isolated, "rule"),
    ...["Ribosome", "Proteasome", "Complex I", "Spliceosome", "MAPK signaling", "Cell cycle", "TGF-beta", "Unassigned"].map((m) => setRow("group", `${m} module`, modCounts[m], "rule")),
];

// The Graph panel: Graphs, Sets and paths, Views collapsed. The privacy line sits under the project
// name. styles: true draws the superseded placement (the stack as the panel's Styles section, under
// Sets and paths through the split handle), kept for one comparison frame only.
function leftPanel({ sets = SETS4, styles = false, list = "", handleFocus = false } = {}) {
    return `<aside class="k-panel" aria-label="Graph">
      <div class="k-panel-head">
        <div class="k-title-line"><span class="k-project">Stress response study</span>${I("chevron-down", "k-i k-i-sm k-secondary")}</div>
        <a class="k-privacy">Nothing has been sent from this project</a>
        <span class="k-chip k-chip-btn" role="button">${I("funnel", "k-i k-i-sm")}Full graph${I("chevron-down", "k-i k-i-sm k-caret")}</span>
      </div>
      <div class="lp-body">
        <section class="k-section lp-fixed">
          <div class="k-section-head">Graphs<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
          <ul class="k-list"><li class="k-item" aria-selected="true">${I("network")}<span class="k-grow k-ellipsis">ppi-core-300</span><span class="k-trail k-num">${N} nodes</span></li></ul>
        </section>
        <section class="k-section lp-sets${styles ? "" : " lp-grow"}"${A("sets")}>
          <div class="k-section-head">Sets and paths<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
          <ul class="k-list">${sets.join("")}</ul>
        </section>
        ${styles ? `<div class="split${handleFocus ? " split-focus" : ""}" role="separator" aria-label="Resize Sets and paths and Styles"${A("split")}></div>
        <section class="k-section lp-styles"${A("styles")}>
          <div class="k-section-head">Styles<span class="k-grow"></span><span class="k-icon-btn">${I("ellipsis")}</span><span class="k-icon-btn">${I("plus")}</span></div>
          ${list}
        </section>` : ""}
        <section class="k-section lp-fixed" data-collapsed><div class="k-section-head">Views</div></section>
      </div>
    </aside>`;
}
const toolbar = `<div class="k-toolbar-dock"><div class="k-toolbar" role="toolbar">
          <span class="k-tool" aria-pressed="true">${I("mouse-pointer-2", "k-i k-i-lg")}</span><span class="k-tool-caret">${I("chevron-down", "k-i k-i-sm")}</span>
          <span class="k-tool">${I("route", "k-i k-i-lg")}</span>
          <span class="k-tool">${I("sticky-note", "k-i k-i-lg")}</span>
          <span class="k-toolbar-sep"></span>
          <span class="k-tool">${I("zap", "k-i k-i-lg")}</span>
        </div></div>`;

// ---------------------------------------------------------------- legend (graphty-element's, options-and-encodings.md 6)
const ticks = `<div class="ticks"><span style="left:0">0</span>${bcEnc.ticks.map((t) => `<span class="mid" style="left:${(t.at * 100).toFixed(1)}%">${t.value}</span>`).join("")}</div>`;
const sizeMarks = `<div class="size-marks">${sizeBins.map((b, k) => `<div><b style="width:${[6, 9, 12, 16, 21][k]}px;height:${[6, 9, 12, 16, 21][k]}px"></b>${b.from} to ${b.to}</div>`).join("")}</div>`;
// Size by a signed column: the magnitude |log2FoldChange| over 0 to the largest magnitude, in five
// equal steps (options-and-encodings.md 5, the Signed column of the default-scale table).
const fcMax = Math.max(...ppi.encodings.foldChange.domain.map(Math.abs));
// ponytail: edges shown to one decimal, the last as the exact maximum; the element owns the real edges
const fcBins = [0, 1, 2, 3, 4].map((k) => [k ? ((fcMax * k) / 5).toFixed(1) : "0", k === 4 ? `${fcMax}` : ((fcMax * (k + 1)) / 5).toFixed(1)]);
const fcMarks = (px = [6, 9, 12, 16, 21]) => `<div class="size-marks">${fcBins.map(([a, b], k) => `<div><b style="width:${px[k]}px;height:${px[k]}px"></b>${a} to ${b}</div>`).join("")}</div>`;
// Legend titles name the channel and what it encodes in words, then the column; every range names its
// column (study decision: "Size: degree").
const LG = {
    path: `<div class="k-lg-title">Highlight: path ${path.from} to ${path.to}</div><div class="k-lg-row">${dash}${path.nodes.length} proteins, ${path.hops} interactions</div>`,
    bc: `<div class="k-lg-title">Color: betweenness</div><span class="k-ramp k-ramp-wide k-ramp-measure" style="margin-top:4px"></span>${ticks}<div class="k-fact">betweenness, 0 to ${bcEnc.domain[1]}, log scale; ${bcEnc.zeros} at 0, lightest</div>`,
    hubcolor: `<div class="k-lg-title">Color: hubs</div><div class="k-lg-row">${chit("#D55E00")}Hubs, degree 17 to 34<span class="k-value">${hubs.count}</span></div>`,
    hub: `<div class="k-lg-title">Labels: top ${hubs.count} by degree</div><div class="k-lg-row">${textchip}names<span class="k-value">${hubs.count}</span></div><div class="k-fact">${hubs.count - hubsDrawn} hidden where labels overlap</div>`,
    size: `<div class="k-lg-title">Size: degree</div>${sizeMarks}`,
    fcsize: `<div class="k-lg-title">Size: size of change, |log2FoldChange|</div>${fcMarks()}<div class="k-fact">|log2FoldChange|, 0 to ${fcMax}; by magnitude, sign not shown</div>`,
    module: `<div class="k-lg-title">Color: module</div>${modSorted.slice(0, 5).map(([m, c]) => `<div class="k-lg-row">${chit(modColors[m])}${m}<span class="k-value">${c}</span></div>`).join("")}<div class="k-lg-row k-secondary">4 more</div>`,
    faint: `<div class="k-secondary">Interactions drawn faint (30%)</div>`,
    qpcr: `<div class="k-lg-title">Color: this week's change, log2FC</div><span class="k-ramp k-ramp-wide k-ramp-bluered" style="margin-top:4px"></span><div class="k-fact">log2FC, ${expr.range[0]} to ${expr.range[1]}, 0 in the middle; ${expr.matched} of ${N} proteins</div>`,
    mute: `<div class="k-lg-title">Gray: module, where log2FC has no value</div><div class="k-fact">${N - expr.matched} proteins, in grays so none reads as up or down</div>`,
};
function legend(keys, { right = false, more = "" } = {}) {
    return `<div class="k-legend-card${right ? " lg-right" : ""}" style="width:236px"${A("legend")}>${keys.map((k) => LG[k]).join('<div class="lg-gap"></div>')}${more ? `<div class="lg-gap"></div><div class="k-lg-row k-fact">${more}</div>` : ""}</div>`;
}
function canvas(drawing, alt, lg = "") {
    return `<div class="k-canvas"${A("canvas")}>
        <div class="k-stage"${A("stage")}><img class="k-light-only" src="../kit/canvas/${drawing}-light.svg" alt="${alt}"><img class="k-dark-only" src="../kit/canvas/${drawing}-dark.svg" alt="${alt}"></div>
        ${lg}
        ${toolbar}
        <span class="k-help">${I("circle-help")}</span>
      </div>`;
}

// ---------------------------------------------------------------- inspector (the right panel)
// No avatar and no Export button after round 3: the header holds the zoom menu only.
const head12 = `<div class="k-header1"><span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">100%${I("chevron-down", "k-i k-i-sm")}</span></div>`;
const TP = ppi.inspector.tp53;
const overview = `<section class="k-section"${A("stats")}><div class="k-section-head">Overview</div>
          <div class="k-metrics"><div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big">${N}</span></div><div class="k-metric"><span class="k-secondary">edges</span><span class="k-big">${nf(E)}</span></div><div class="k-metric"><span class="k-secondary">${mt("components", "components")}</span><span class="k-big">${ppi.stats.components}</span></div><div class="k-metric"><span class="k-secondary">${mt("density", "density")}</span><span class="k-big">${ppi.stats.density}</span></div></div>
        </section>`;
// Precedence, said once at the top of the stack in both sections.
const prec = `<div class="prec"${A("prec")}>${I("arrow-up-down", "k-i k-i-sm")}Top wins each property it sets</div>`;
// The Look control: a visible label and a select, in the Style stack header (owner review 2).
const lookCtl = (open) => `<span class="look-l">Look</span><span class="k-field look-sel" role="button" aria-haspopup="menu"${open ? ' aria-expanded="true" data-focus' : ""}${A("look")}>Screen${I("chevron-down", "k-i k-i-sm k-caret")}</span>`;
// Runs, newest first, as the Results section lists them with nothing selected.
const RUNS = {
    path: `<li class="k-item">${I("waypoints")}<span class="k-ellipsis nm">Shortest path ${path.from} to ${path.to}</span><span class="k-trail k-num">${path.nodes.length} proteins</span></li>`,
    bc: `<li class="k-item">${I("sigma")}<span class="k-ellipsis nm">Betweenness</span><span class="k-trail k-num">${N} proteins</span></li>`,
    louvain: `<li class="k-item">${I("group")}<span class="k-ellipsis nm">Louvain</span><span class="k-trail k-num">${ppi.louvain.communities} communities</span></li>`,
};
const results = (runs) => runs.length ? `<section class="k-section"${A("results")}><div class="k-section-head">Results</div><ul class="k-list">${runs.map((r) => RUNS[r]).join("")}</ul></section>` : "";
// Nothing selected: Overview, Style stack (the whole ordered stack, precedence, the legend, the Look
// control), Results.
function inspectorGraph({ list = "", lookOpen = false, empty = false, runs = ["path", "bc"], legendOn = true, stack = true, plusOpen = false } = {}) {
    return `<aside class="k-right" aria-label="Inspector"${A("insp")}>
      ${head12}
      <div class="k-typerow">${I("network")}<span class="k-name">ppi-core-300</span><span class="k-secondary">Graph</span></div>
      <div class="k-scroll">
        ${overview}
        ${stack ? `<section class="k-section"${A("instack")}>
          <div class="k-section-head"${A("stackhead")}>Style stack<span class="k-grow"></span>${lookCtl(lookOpen)}<span class="k-icon-btn" aria-label="Add a style layer" aria-haspopup="menu"${plusOpen ? ' aria-expanded="true" aria-pressed="true"' : ""}${A("plus")}>${I("plus")}</span></div>
          ${empty ? "" : prec}
          ${list}
          ${empty ? `<div class="k-prose empty-line">No style layers yet. Add one with +, or with Color by or Size by on any attribute.</div>` : ""}
          <div class="k-row legendrow"${A("legendrow")}><span>Legend</span><span class="k-grow"></span><span class="k-secondary">on the canvas</span><span class="k-switch" role="switch" aria-checked="${legendOn}" aria-label="Show the legend on the canvas"></span></div>
        </section>` : ""}
        ${results(runs)}
      </div>
    </aside>`;
}
// Something selected: readings first, then Appearance (the same whole stack, what paints the
// selection highlighted and marked with what it wins; "+" adds a layer scoped to the selection),
// then the selection's value in each run.
function inspectorTp53({ list, runs = ["path", "bc"] }) {
    const perRun = {
        path: `<div class="k-data"><span class="k-name">Shortest path ${path.from} to ${path.to}</span><span class="k-value">start</span></div>`,
        bc: `<div class="k-data"><span class="k-name">${mt("Betweenness", "betweenness")}</span><span class="k-value">${TP.betweenness}, rank ${TP.betweennessRank.from}</span></div>`,
    };
    return `<aside class="k-right" aria-label="Inspector"${A("insp")}>
      ${head12}
      <div class="k-typerow">${I("circle-dot")}<span class="k-name k-id">TP53</span><span class="k-secondary">Node</span></div>
      <div class="k-scroll">
        <section class="k-section"${A("attrs")}>
          <div class="k-section-head">Attributes</div>
          <div class="k-data"><span class="k-name">module</span><span class="k-value">${tp53.module}</span></div>
          <div class="k-data"><span class="k-name">${mt("degree", "degree")}</span><span class="k-value">${tp53.degree}</span></div>
          <div class="k-data"><span class="k-name">log2FoldChange</span><span class="k-value">${minus(tp53.log2FoldChange)}</span></div>
        </section>
        <section class="k-section"${A("appearance")}>
          <div class="k-section-head">Appearance<span class="k-grow"></span><span class="k-icon-btn" aria-label="Add a style layer for TP53"${A("applus")}>${I("plus")}</span></div>
          ${prec}
          ${list}
        </section>
        ${runs.length ? `<section class="k-section"${A("results")}><div class="k-section-head">Results</div>${runs.map((r) => perRun[r]).join("")}</section>` : ""}
      </div>
    </aside>`;
}
// What wins TP53, per layer, with every layer on (conceptual-model.md 5.1: top wins each channel it writes).
const SEL_ALL_ON = {
    path: { wins: "highlight and label" },
    bc: { wins: `color: betweenness ${TP.betweenness}` },
    hub: { lost: "Label", by: `Shortest path ${path.from} to ${path.to}` },
    size: { wins: `size: degree ${tp53.degree}` },
};
// The same with the two run layers off: their rows paint nothing, so they carry no mark.
const SEL_RUNS_OFF = { hub: { wins: "label" }, size: { wins: `size: degree ${tp53.degree}` } };

// ---------------------------------------------------------------- editor popovers (interface-templates.md 10)
// One width, 240 (PANEL_GRID.POPOVER_WIDTH). The header names the target in full, wrapping to two
// lines before it is cut, then the eye, Move up, Move down and close.
function editorHead(name, { off = false } = {}) {
    return `<div class="k-popover-head ed-head"><span class="k-icon-btn"${off ? ' aria-pressed="true"' : ""}>${I(off ? "eye-off" : "eye")}</span><span class="ed-name">${name}</span><span class="k-icon-btn">${I("chevron-up")}</span><span class="k-icon-btn">${I("chevron-down")}</span><span class="k-icon-btn">${I("x")}</span></div>`;
}
const roLine = `<div class="k-row" style="min-height:28px"><span class="ro">${I("lock", "k-i k-i-sm")}written by the run</span><span class="k-grow"></span><span class="k-btn k-btn-secondary">Edit a copy</span></div>`;
const fr = (legendTxt, field, extra = "") => `<div class="k-fieldrow"><span class="k-legend">${legendTxt}</span><div class="k-fields">${field}${extra}</div></div>`;
const dataRow = (name, value, anchor = "") => `<div class="k-data"${anchor ? A(anchor) : ""}><span class="k-name">${name}</span><span class="k-value">${value}</span></div>`;
const lgRow = (inner) => `<div class="k-fieldrow"><span class="k-legend">Legend</span><div class="ed-legend">${inner}</div></div>`;
const tail = (notes = "none") => dataRow("notes", `<span class="k-secondary">${notes}</span>`) + dataRow("used by", `<span class="k-secondary">no view</span>`);

function bcEditor(pl) {
    return `<div class="k-popover ed"${pl}${A("ed")}>
    ${editorHead("Betweenness color")}
    <div class="k-popover-body">
      ${roLine}
      ${fr("Applies to", `<span class="k-field k-span3" data-readonly>has a betweenness value: ${N} proteins</span>`)}
      <div class="k-section-head" style="height:32px">Fill</div>
      <div${A("edcolor")}>${fr("Color", `<span class="k-field k-span"><span class="k-pill">${ramp()}betweenness</span></span>`, `<span class="k-icon-btn" aria-pressed="true">${I("sliders-horizontal")}</span>`)}</div>
      ${lgRow(`${ramp(48)}<span class="k-fact">betweenness, 0 to ${bcEnc.domain[1]}, log scale</span>`)}
      ${dataRow("paints", `${N} of ${N} proteins`, "edpaints")}
      ${dataRow("no value", "0 proteins")}
      ${tail()}
    </div>
  </div>`;
}
function pathEditor(pl) {
    return `<div class="k-popover ed"${pl}${A("ed")}>
    ${editorHead(LY.path.name)}
    <div class="k-popover-body">
      ${roLine}
      ${fr("Applies to", `<span class="k-field k-span3" data-readonly>on this path: ${path.nodes.length} proteins, ${path.hops} interactions</span>`)}
      ${fr("Highlight", `<span class="k-field k-span3" data-readonly>${dash}long dash</span>`)}
      ${fr("Label", `<span class="k-field k-span3" data-readonly>${textchip}name</span>`)}
      ${lgRow(`${dash}<span class="k-secondary">${path.nodes.length} proteins, ${path.hops} interactions</span>`)}
      ${dataRow("paints", `${path.nodes.length} of ${N} proteins`, "edpaints")}
      ${dataRow("", `${path.hops} of ${nf(E)} interactions`)}
      ${dataRow("no value", "0")}
      ${tail()}
    </div>
  </div>`;
}
function sizeEditor(pl) {
    return `<div class="k-popover ed"${pl}${A("ed")}>
    ${editorHead("Size: degree")}
    <div class="k-popover-body">
      ${fr("Applies to", `<span class="k-field k-span3">All proteins${I("chevron-down", "k-i k-i-sm k-caret")}</span>`)}
      <div class="k-section-head" style="height:32px">Size<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
      <div${A("edsize")}>${fr("Size", `<span class="k-field k-span" data-focus><span class="k-pill">${sizechip}degree</span></span>`, `<span class="k-icon-btn">${I("sliders-horizontal")}</span>`)}</div>
      <div class="k-section-head" style="height:32px;color:var(--cm-text-secondary)">Fill<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
      <div class="k-section-head" style="height:32px;color:var(--cm-text-secondary)">Label<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
      ${lgRow(`<div class="size-marks sm">${sizeBins.map((b, k) => `<div><b style="width:${[4, 6, 8, 10, 13][k]}px;height:${[4, 6, 8, 10, 13][k]}px"></b>${b.from} to ${b.to}</div>`).join("")}</div><span class="k-fact">degree</span>`)}
      ${dataRow("paints", `${N} of ${N} proteins`, "edpaints")}
      ${dataRow("no value", "0 proteins")}
      ${tail("1 note")}
    </div>
  </div>`;
}
function qpcrEditor(pl) {
    return `<div class="k-popover ed"${pl}${A("ed")}>
    ${editorHead("qPCR log2FC color", { off: true })}
    <div class="k-popover-body">
      ${fr("Applies to", `<span class="k-field k-span3">All proteins${I("chevron-down", "k-i k-i-sm k-caret")}</span>`)}
      <div class="k-section-head" style="height:32px">Fill<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
      ${fr("Color", `<span class="k-field k-span"><span class="k-pill">${rbRamp()}log2FC</span></span>`, `<span class="k-icon-btn">${I("sliders-horizontal")}</span>`)}
      ${lgRow(`${rbRamp(48)}<span class="k-fact">log2FC, ${expr.range[0]} to ${expr.range[1]}, 0 in the middle</span>`)}
      ${dataRow("paints", "none while off", "edpaints")}
      ${dataRow("", `${expr.matched} of ${N} proteins when on`)}
      <div${A("ednovalue")}>${dataRow("no value", `${N - expr.matched} proteins`)}</div>
      <div class="k-prose ed-note">Their color comes from the layers beneath: the qPCR file named ${expr.matched} of the ${N} proteins.</div>
      ${tail()}
    </div>
  </div>`;
}
// A layer covered by one above: size bound to a signed column, drawn by its magnitude. The editor
// says what covers it and carries the same Move above as the row.
function fcsizeEditor(pl) {
    return `<div class="k-popover ed"${pl}${A("ed")}>
    ${editorHead("Size: |log2FoldChange|")}
    <div class="k-popover-body">
      <div class="covbox"${A("edcov")}><span class="k-fact">Covered by Size: degree above: it sets the size of all ${N} proteins, so this layer paints none.</span><span class="k-btn k-btn-secondary movebtn">Move above</span></div>
      ${fr("Applies to", `<span class="k-field k-span3">All proteins${I("chevron-down", "k-i k-i-sm k-caret")}</span>`)}
      <div class="k-section-head" style="height:32px">Size<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
      <div${A("edsize")}>${fr("Size", `<span class="k-field k-span"><span class="k-pill">${sizechip}|log2FoldChange|</span></span>`, `<span class="k-icon-btn">${I("sliders-horizontal")}</span>`)}</div>
      <div class="k-prose ed-note k-fact"${A("edsign")}>By magnitude, sign not shown: ${below0} proteins went down and ${above0} went up. Color by log2FoldChange to show the direction.</div>
      ${lgRow(`${fcMarks([4, 6, 8, 10, 13]).replace('class="size-marks"', 'class="size-marks sm"')}`)}
      ${dataRow("paints", `0 of ${N} proteins`, "edpaints")}
      ${dataRow("no value", "0 proteins")}
      ${tail()}
    </div>
  </div>`;
}
// "Label with" asks which elements second: the top N by an attribute, as the layer's selector
// (options-and-encodings.md 4; the sets design's threshold leaf, on master since 2.6.0).
function hubEditor(pl) {
    return `<div class="k-popover ed"${pl}${A("ed")}>
    ${editorHead("Hub labels")}
    <div class="k-popover-body">
      <div${A("edapplies")}>${fr("Applies to", `<span class="k-field k-span3 topn"><span class="k-secondary">Top</span><span class="k-field k-num" data-focus>${hubs.count}</span><span class="k-secondary">by</span><span class="k-field">degree${I("chevron-down", "k-i k-i-sm k-caret")}</span></span>`)}</div>
      <div class="k-prose ed-note">${hubs.ids.slice(0, 5).join(", ")} and ${hubs.count - 5} more.</div>
      <div class="k-section-head" style="height:32px">Label<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
      <div${A("edlabel")}>${fr("Text", `<span class="k-field k-span"><span class="k-pill">${textchip}name</span></span>`, `<span class="k-icon-btn">${I("sliders-horizontal")}</span>`)}</div>
      ${lgRow(`${textchip}<span class="k-fact">names, top ${hubs.count} by degree</span>`)}
      ${dataRow("paints", `${hubs.count} of ${N} proteins`, "edpaints")}
      ${dataRow("hidden", `${hubs.count - hubsDrawn} where labels overlap`)}
      ${tail()}
    </div>
  </div>`;
}
// The Look menu: a dark Menu of radio items from the Look select in the Style stack header, each Look
// described in words (study: "palettes labeled in words"). Screen, Print, High contrast (owner review 2);
// Print meets both the gray and the color-blind constraint and shows sign with shape.
function lookMenu(pl) {
    const item = (on, name, desc, hover = false) => `<div class="k-menu-item" role="menuitemradio" aria-checked="${on}" data-described${hover ? " data-hover" : ""}><span class="k-check-col">${on ? I("check", "k-i k-i-sm") : ""}</span><span>${name}<span class="k-menu-desc">${desc}</span></span></div>`;
    return `<div class="k-menu" style="width:288px" role="menu"${pl}${A("lookmenu")}>
    <div class="k-menu-label">Look for the whole project</div>
    ${item(true, "Screen", "The palettes each layer chose.")}
    ${item(false, "Print", "Reads in gray on white paper and for color-blind readers. Where a color shows a direction, a shape shows it too.", true)}
    ${item(false, "High contrast", "Every color clears 3:1 against the canvas it is drawn on.")}
    <div class="k-menu-sep"></div>
    <div class="k-menu-label">Colors you set by hand are kept.</div>
  </div>`;
}

// A new layer scoped to the selection, from the Appearance header's "+": it writes nothing until a
// channel is added. Its Fill was just added with + and has no color yet.
function newLayerEditor(pl) {
    return `<div class="k-popover ed"${pl}${A("ed")}>
    ${editorHead("TP53")}
    <div class="k-popover-body">
      <div${A("edapplies")}>${fr("Applies to", `<span class="k-field k-span3">TP53 (the selection)${I("chevron-down", "k-i k-i-sm k-caret")}</span>`)}</div>
      <div class="k-section-head" style="height:32px">Fill<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
      <div${A("edfill")}>${fr("Color", `<span class="k-field k-span" data-focus><span class="k-chit nochit" role="button" aria-label="Open color picker" aria-expanded="true"></span><span class="k-secondary">Pick a color</span></span>`, `<span class="k-icon-btn" aria-label="Remove fill">${I("minus")}</span>`)}</div>
      <div class="k-section-head" style="height:32px;color:var(--cm-text-secondary)">Size<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
      <div class="k-section-head" style="height:32px;color:var(--cm-text-secondary)">Label<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
      ${dataRow("paints", `nothing yet`, "edpaints")}
      ${tail()}
    </div>
  </div>`;
}
// The Style stack's "+" menu: an empty layer, the recipe route, and the layers graphty-element suggests
// for this graph. A suggestion is only offered; picking it adds an ordinary layer, one undo step.
const shapeTop = modSorted.slice(0, 5);
const shapeRest = modSorted.slice(5);
function plusMenu(pl) {
    const it = (name, desc, o = {}) => `<div class="k-menu-item" data-described${o.hover ? " data-hover" : ""}${o.a ? A(o.a) : ""}><span class="k-check-col"></span><span class="k-grow">${name}<span class="k-menu-desc">${desc}</span></span></div>`;
    return `<div class="k-menu" style="width:288px" role="menu"${pl}${A("plusmenu")}>
    ${it("Empty layer", "On top, with its editor open. Nothing changes until you give it a color, size or label.", { a: "pm-empty" })}
    ${it("From a recipe or file...", "The style layers a recipe brings, from a .graphty file or one in this project. Your data stays here.", { a: "pm-recipe" })}
    <div class="k-menu-sep"></div>
    <div class="k-menu-label"${A("pm-sugg")}>Suggested for this graph</div>
    ${it("Mute categories under this scale", `Grays for Module color on the ${N - expr.matched} proteins qPCR log2FC color leaves, so no module reads as up or down.`, { hover: 1, a: "pm-mute" })}
    ${it("Shape by kind: module", `A shape for each of the 5 largest modules, one shape for the other ${shapeRest.length} (Other).`, { a: "pm-shape" })}
    <div class="k-menu-sep"></div>
    <div class="k-menu-label">A suggestion is added only when you pick it.</div>
  </div>`;
}
// The layer the mute suggestion added: made here, scoped to the proteins the scale leaves, and editable.
function muteEditor(pl) {
    const grays = `<span class="k-stack">${chit("#d0d0d0")}${chit("#bdbdbd")}${chit("#e3e3e3")}</span>`;
    return `<div class="k-popover ed"${pl}${A("ed")}>
    ${editorHead("Modules in gray")}
    <div class="k-popover-body">
      <div${A("edapplies")}>${fr("Applies to", `<span class="k-field k-span3">No value for log2FC${I("chevron-down", "k-i k-i-sm k-caret")}</span>`)}</div>
      <div class="k-section-head" style="height:32px">Fill<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
      <div${A("edfill")}>${fr("Color", `<span class="k-field k-span"><span class="k-pill">${grays}module</span></span>`, `<span class="k-icon-btn">${I("sliders-horizontal")}</span>`)}</div>
      ${lgRow(`${grays}<span class="k-fact">module, in grays: no hue, so none reads as up or down</span>`)}
      ${dataRow("paints", `${N - expr.matched} of ${N} proteins`, "edpaints")}
      ${tail()}
    </div>
  </div>`;
}
// The color picker (compact-mantine ColorPickerPanel, figma-spec 7.3): Custom and Libraries tabs.
const SWATCHES = [...fx.canvas.categorical, "#808080"];
function colorPicker(pl, tab = "custom") {
    const tabs = `<span class="k-tabs" role="tablist"><span class="k-tab" role="tab" aria-selected="${tab === "custom"}">Custom</span><span class="k-tab" role="tab" aria-selected="${tab === "libraries"}"${A("libtab")}>Libraries</span></span>`;
    const head = `<div class="k-popover-head cp-head">${tabs}<span class="k-grow"></span><span class="k-icon-btn" aria-label="Close">${I("x")}</span></div>`;
    const custom = `<div class="cp-body">
      <div class="cp-sb"><span class="cp-reticle"></span></div>
      <div class="cp-slider cp-hue"><span style="left:4%"></span></div>
      <div class="cp-slider cp-alpha"><span style="left:96%"></span></div>
      <div class="cp-val"><span class="k-field cp-fmt">Hex${I("chevron-down", "k-i k-i-sm k-caret")}</span><span class="k-field cp-hex" data-placeholder>Pick a color</span><span class="k-field cp-op k-num">100 %</span></div>
      <div class="cp-sw"${A("swatches")}>${SWATCHES.map((c) => `<span class="k-chit" style="background:${c}" role="button" aria-label="${c}"></span>`).join("")}</div>
    </div>`;
    const pal = (name, chips, desc) => `<li class="k-item cp-lib">${chips}<span class="k-ellipsis nm">${name}</span><span class="k-trail k-tertiary">${desc}</span></li>`;
    const lyr = (key, from) => `<li class="k-item cp-lib"><span class="chipslot">${LY[key].chip}</span><span class="k-ellipsis nm">${LY[key].name}</span><span class="k-trail k-tertiary">${from}</span></li>`;
    const libraries = `<div class="cp-body cp-libs">
      <div class="k-search"><span class="k-field" data-placeholder>${I("search", "k-i k-i-sm")}Find a palette or layer</span></div>
      <div class="k-group-head cp-gh"${A("libpal")}>Palettes</div>
      <ul class="k-list">
        ${pal("Okabe-Ito", `<span class="k-stack">${chit("#009E73")}${chit("#56B4E9")}${chit("#E69F00")}</span>`, "categories")}
        ${pal("Orange to brown", ramp(), "ramp")}
        ${pal("Viridis", `<span class="k-ramp" style="width:16px"></span>`, "ramp")}
        ${pal("Blue to red", rbRamp(), "diverging")}
      </ul>
      <div class="k-group-head cp-gh"${A("liblayers")}>Style layers</div>
      <div class="cp-src k-secondary">From the recipe Stress response</div>
      <ul class="k-list">${lyr("kinase", "outline")}${lyr("drug", "labels")}</ul>
      <div class="cp-src k-secondary">From the recipe Protein triage</div>
      <ul class="k-list">${lyr("tumor", "edges")}${lyr("hubcolor", "color")}</ul>
    </div>`;
    return `<div class="k-popover cp"${pl}${A("picker")}>${head}${tab === "custom" ? custom : libraries}</div>`;
}

// The encoding popover, read only from a run's layer (framework-changes.md, "the encoding popover opens read only").
function encodingPopover(pl) {
    const hist = bcEnc.histogram12Transformed;
    const max = Math.max(...hist);
    return `<div class="k-popover" style="width:272px"${pl}${A("enc")}>
    <div class="k-popover-head">Betweenness as color<span class="k-grow"></span><span class="k-secondary" style="font-weight:450">read only</span></div>
    <div class="k-popover-body">
      ${fr("Scale", `<span class="k-field k-span3" data-readonly>Log</span>`)}
      <div class="k-prose ed-note">Each value is divided by ${bcEnc.c}, the smallest above 0, before the log.</div>
      ${fr(`Palette <span class="k-tertiary">-- sequential, 5 steps</span>`, `<span class="k-field k-span3" data-readonly>${ramp(24)}Orange to brown</span>`)}
      <div class="k-legend" style="padding-left:16px;margin:4px 0 0">Domain <span class="k-tertiary">-- ${N} proteins, drawn on the scale</span></div>
      <div class="k-hist" style="height:48px;margin-bottom:0">${hist.map((h) => `<i style="height:${Math.max(2, Math.round((h / max) * 100))}%"></i>`).join("")}</div>
      <div style="padding:0 8px 0 16px"><span class="k-ramp k-ramp-wide k-ramp-measure"></span>${ticks}</div>
      ${dataRow("at 0", `${bcEnc.zeros} proteins, lightest`)}
      ${dataRow("no value", "0 proteins")}
      <div class="k-prose">On a straight scale ${bcEnc.linearFifths[0]} of ${N} proteins would share the lightest of the 5 colors.</div>
    </div>
  </div>`;
}
const tip = (pl, key, extra = "") => {
    const l = LY[key];
    return `<div class="k-tooltip" style="width:232px;white-space:normal"${pl}><b>${l.name}</b> <span class="k-secondary">${l.by || "made here"}</span><br>${l.tip}${extra}</div>`;
};

// ---------------------------------------------------------------- frames
const pages = { screen: [] };
function frame(page, { id, title, sub = "", w = 1440, h = 900, dark = false, gray = false, app, overlays = () => "", marks = [], notes = [], appAttrs = "" }) {
    F = { id, w, h, place: [], marks: [] };
    const appHtml = app();
    const ovHtml = overlays();
    // marks: [anchorName, dx, dy] placed at the anchor's top-left plus the offset, or [x, y] in frame pixels
    const markHtml = marks.map((m, k) => {
        if (typeof m[0] === "number") return `<span class="an k-step" style="left:${m[0]}px;top:${m[1]}px">${k + 1}</span>`;
        const [a, dx = -10, dy = 6, x = "left"] = m;
        if (typeof a === "string" && a.startsWith("row-") && dx === 2) return `<span class="an k-step"${place(`m${k}`, a, { x, dx: -18, dy })}>${k + 1}</span>`;
        return `<span class="an k-step"${place(`m${k}`, a, { x, dx, dy })}>${k + 1}</span>`;
    }).join("\n  ");
    const f = { ...F, page, title, sub, dark, gray, html: "" };
    f.render = (pos, meas) => {
        const n = pages[page].indexOf(f) + 1;
        const css = f.place.map((p) => {
            const sel = `#${id} [data-o="${p.oid}"]`;
            if (pos && pos[p.oid]) return `${sel} { left: ${pos[p.oid].left}px; top: ${pos[p.oid].top}px; }`;
            return `#${id} [data-a="${p.a}"] { anchor-name: --${id}-${p.a}; } ${sel} { position-anchor: --${id}-${p.a}; left: calc(anchor(${p.x}) + ${p.dx}px); top: calc(anchor(${p.y}) + ${p.dy}px); }`;
        }).join("\n");
        const noteHtml = notes.map((t) => `<li>${typeof t === "function" ? t(meas || {}) : t}</li>`).join("\n    ");
        return `<section class="st${dark ? " st-dark" : ""}${gray ? " st-gray" : ""}" id="${id}">
  <style>${css}</style>
  <h2 class="st-label">${n}. ${title}${sub ? ` <span>-- ${sub}</span>` : ""}</h2>
  <div class="st-frame" style="width:${w}px;height:${h}px">
  <div class="k-app" style="width:${w}px;height:${h}px"${appAttrs}>${appHtml}</div>
  ${ovHtml}
  ${markHtml}
  </div>
  ${notes.length ? `<ol class="an-list">\n    ${noteHtml}\n  </ol>` : ""}
</section>`;
    };
    pages[page].push(f);
    F = null;
}
const cm = (t) => ` <span class="cm">${t}</span>`;
const blk = `<span class="k-annot-tag blk">needs graphty-element</span> `;
const main = (c) => `<main class="k-main">${c}</main>`;

// Placement of an editor opened from a row of the right panel: to the left of the inspector,
// top-aligned to its row (interface-templates.md 10: "left of the inspector from an inspector row").
// A row sits 8 px inside the inspector, so -256 puts the 240-wide editor 8 px clear of its border.
const edAt = (row) => place("ed", row, { x: "left", dx: -256, dy: -4, clamp: true });
const RIGHT = "the right panel";

// 1. Color by a result
frame("screen", {
    id: "result",
    title: "Color by a result",
    sub: "nothing is selected, so the inspector shows the graph and its Style stack. Betweenness has run; its automatic layer colors every protein, because every protein has a betweenness value. The layer's editor is open, with its scale read only beside it",
    app: () => rail + leftPanel()
        + main(canvas("ppi-betweenness", "300 proteins colored orange to brown by betweenness, sized by degree, hubs labeled", legend(["bc", "hub", "size"]))) + inspectorGraph({ list: stackList(["bc", "hub", "size"], { focus: ["bc"], anchors: { bc: "row-bc", hub: "row-hub" } }), runs: ["bc"] }),
    overlays: () => bcEditor(edAt("row-bc")) + encodingPopover(place("enc", "edcolor", { x: "left", dx: -280, dy: -8, clamp: 76 })),
    marks: [["stackhead", -10, 8], ["prec", -10, 4], ["row-bc", 2, 6], ["row-hub", 2, 6], ["ed", -10, 8], ["edpaints", -10, 2], ["enc", -10, 8], ["legendrow", -10, 4], ["legend", -10, 8]],
    notes: [
        `With nothing selected the inspector shows the graph: Overview, then the Style stack section, then Results. Styles are no longer in the Graph panel; the left panel lists graphs, sets and paths, and views. Nothing selected shows the project's styles, as Figma's right panel shows local styles when nothing is selected.${cm("framework-changes.md, \"Interface specification: the rail, the header and the inspector's sections\" (after round 3); interface-specification.md 4.1. compact-mantine: <code>ControlSection</code>.")}`,
        `Precedence is said once, at the top of the stack: "Top wins each property it sets". The newest layer lands on top.${cm("conceptual-model.md 5.1 (top wins each channel it writes); interface-templates.md 9. compact-mantine: <code>Text</code> size xs with an icon.")}`,
        `A layer row: drag handle, chip, name, origin word. The chip is the strip it paints; "run" says a run added it. The row with its editor open is the focused row (the selected-secondary fill), never the canvas selection. The handle is shown at rest, because people looked for a way to reorder.${cm("visual-language.md A7; interaction-pattern-entries.md 9.1; framework-changes.md, \"Style stack rows show a drag handle at rest\" (new). compact-mantine: <code>Tree</code> row with a drag handle, a need.")}`,
        `Layers made here carry no origin word, so the one row that did not come from the analyst stands out.${cm("framework-changes.md, \"Only a layer that was not made here carries an origin word\".")}`,
        `The editor opens to the left of the inspector, top-aligned to its row, 240 wide, over the canvas and never over chrome. The header names the layer in full, then the eye, Move up, Move down and close. A run's layer is read only; Edit a copy puts one of the analyst's own in its place.${cm("interface-templates.md 10 (Style layer; placement from an inspector row); figma-crosswalk.md 4.2. compact-mantine: <code>Popout.Panel</code> with <code>PopoutHeaderConfig</code>.")}`,
        `${blk}The painted count ("paints 300 of 300 proteins") is blocked until graphty-element reports what each layer paints.${cm("interface-templates.md 9, 10; interface-specification.md 7.4, the painted row.")}`,
        `The scale opens beside the bound Color row, further left, read only because the layer is a run's. It says what it does: log, divided first by the smallest value above 0, and that a straight scale would put ${bcEnc.linearFifths[0]} of ${N} proteins in the lightest color.${cm("interface-templates.md 10 (Encoding), 12; options-and-encodings.md 5, rule 3. compact-mantine: <code>Popout</code>, <code>HistogramRow</code>, <code>RampRow</code>.")}`,
        `The legend's home is the foot of the Style stack: one switch puts it on the canvas or takes it off. Its blocks follow the stack order, so the key and the stack read the same way.${cm("options-and-encodings.md 6, item 7; framework-changes.md, \"The legend's switch sits at the foot of the Style stack\" (new). compact-mantine: <code>SwitchRow</code>.")}`,
        `The canvas legend stays at the bottom left. Editors now open from the right, so the legend no longer has to move aside while one is open.${cm("state-matrix.md 8 (legend and toolbar never overlap). Drawn by graphty-element.")}`,
    ],
});

// 2. Stacked algorithms
frame("screen", {
    id: "stacked",
    title: "Stacked algorithms",
    sub: `a shortest-path run lands on top of Betweenness color. Its layer marks ${path.nodes.length} proteins and ${path.hops} interactions; the other ${N - path.nodes.length} keep the color, size and labels the layers beneath gave them`,
    app: () => rail + leftPanel()
        + main(canvas("ppi-stacked", "Betweenness colors, degree sizes and hub labels unchanged; the path TP53, MSH2, UBB, SMAD3 carries a dashed two-tone mark", legend(["path", "bc", "hub", "size"]))) + inspectorGraph({ list: stackList(FOUR, { focus: ["path"], anchors: { path: "row-path", bc: "row-bc" } }) }),
    overlays: () => pathEditor(edAt("row-path")),
    marks: [["row-path", 2, 6], ["row-bc", 2, 6], ["ed", -10, 8], ["edpaints", -10, 2], [666, 420], ["legend", -10, 8], ["results", -10, 8]],
    notes: [
        `The path run's automatic layer, a highlight, lands directly on top of the stack.${cm("interface-templates.md 9; interaction-pattern-entries.md 6.1; canvas-drawing.md 5. compact-mantine: <code>Tree</code> row.")}`,
        `Runs and the analyst's own layers interleave by time: nothing is grouped or moved by source, and the list never moves on its own. The analyst reorders by the handle, dropping at a flat position with no "into" zone (frame 11), or with Move up and Move down (Ctrl+] and Ctrl+[). Top to bottom is precedence.${cm("interface-templates.md 9; interaction-pattern-entries.md 6.8; information-architecture.md 11. compact-mantine: <code>Tree</code>, its \"into\" zone disabled.")}`,
        `The path layer's editor, same width and order as every style-layer editor. The path's steps are not here; they belong to the path, in Sets and paths.${cm("interface-templates.md 10. compact-mantine: <code>Popout.Panel</code>, <code>FieldRow</code>, <code>DataRow</code>.")}`,
        `${blk}The painted count is the layer's reach: ${path.nodes.length} of ${N} proteins and ${path.hops} of ${nf(E)} interactions.${cm("interface-specification.md 7.4; root CLAUDE.md, Algorithm Styles.")}`,
        `On the canvas the path wears highlight 1. Every other protein keeps what the layers beneath gave it; the algorithm dims nothing it did not select.${cm("canvas-drawing.md 5, 6; root CLAUDE.md, Algorithm Styles. Drawn by graphty-element.")}`,
        `The legend follows the stack. The Hub labels block says that ${hubs.count - hubsDrawn} of its ${hubs.count} names are hidden where labels overlap.${cm("options-and-encodings.md 6, items 7 and 9; canvas-drawing.md 8.")}`,
        `Results, under the stack, lists the runs newest first. A run and its layer are two things: turning the layer off keeps the run.${cm("framework-changes.md, \"Rules for growth: only Graph never leaves the rail\" (Results as an inspector section). compact-mantine: <code>Tree</code> rows.")}`,
    ],
});

// 3. Hovering a layer row
const hoverFrame = (id, dark = false) => frame("screen", {
    id,
    dark,
    title: dark ? "Hovering a layer, dark" : "Hovering a layer shows what it paints",
    sub: dark ? "frame 3 on the dark canvas" : `the pointer rests on Hub labels. Its ${hubs.count} proteins take the hover mark on the canvas, and the tooltip names the layer's origin and reach`,
    app: () => rail + leftPanel()
        + main(canvas("ppi-stacked-hubhover", dark ? "Dark theme: the four layers; the 12 hubs carry the hover hairline" : "The four layers; the 12 hub proteins carry the one-tone hover hairline", legend(["path", "bc", "hub", "size"]))) + inspectorGraph({ list: stackList(FOUR, { hover: "hub", anchors: { hub: "row-hub" } }) }),
    overlays: () => tip(place("tip", "row-hub", { x: "left", dx: -256, dy: 0 }), "hub"),
    marks: dark ? [[724, 270], [666, 420]] : [["row-hub", 2, 6], ["row-hub", 150, 6], [724, 270]],
    notes: dark ? [
        `Measured: the ramp's darkest step, the highest betweenness, is ${bcEnc.contrast.dark[4]}:1 against the dark canvas, under the 3:1 floor for non-text marks; its lightest step is ${bcEnc.contrast.light[0]}:1 against the light canvas. Both canvases draw every node with the fill edge (5.92:1 dark, 4.17:1 light), which keeps MAPK1, TP53 and CDK1 visible here.${cm("canvas-drawing.md 4; framework-changes.md, \"the default measurement ramp needs a form for the dark canvas\". graphty-element: YLORBR_COLORS.")}`,
        `The hover hairline and the highlight's two-tone band swap their tones on the dark canvas, so the band with more contrast is always outside.${cm("canvas-drawing.md 2, 6.")}`,
    ] : [
        `Hover (and row focus) shows the trailing slot: the count it paints, Select painted and the eye. The slot covers the origin word, which moves to the tooltip with the reach sentence. The tooltip opens to the left, over the canvas.${cm("visual-language.md A7; framework-changes.md, \"The origin word yields to the trailing slot on hover\". compact-mantine: <code>TrailingSlot</code>, <code>ActionIcon</code>, <code>Tooltip</code> position left.")}`,
        `${blk}Select painted selects the ${hubs.count} proteins this layer paints. Both it and the count are blocked until graphty-element reports what a layer paints.${cm("interface-templates.md 9; interface-specification.md 7.4.")}`,
        `${blk}Every protein the hovered layer paints takes the hover mark, as hovering a style in Figma's Selection colors marks what uses it. Two of the ${hubs.count} names stay hidden, because they would overlap a higher-degree protein's.${cm("figma-crosswalk.md 4.2; canvas-drawing.md 6, 9; scale-levels.md 2.")}`,
    ],
});
hoverFrame("hover");

// 4. Editing a layer the analyst made
frame("screen", {
    id: "authored",
    title: "Editing a layer the analyst made",
    sub: "Size: degree is the analyst's own, so its editor is live: the bound Size pill, its scale button, and empty channel groups with + to add to them",
    app: () => rail + leftPanel()
        + main(canvas("ppi-stacked", "The four layers, nothing selected", legend(["path", "bc", "hub", "size"]))) + inspectorGraph({ list: stackList(FOUR, { focus: ["size"], anchors: { size: "row-size" } }) }),
    overlays: () => sizeEditor(edAt("row-size")),
    marks: [["row-size", 2, 6], ["ed", -10, 8], ["edsize", -10, 4], ["edpaints", -10, 2]],
    notes: [
        `The row is focused, its editor open to its left. The editor sits top-aligned to its row but moves up to stay inside the window, as every popover does.${cm("interface-templates.md 10 (placement).")}`,
        `No read-only line and no Edit a copy: the analyst made this layer. Applies to is a live choice (All proteins, a set, a rule).${cm("interface-templates.md 10. compact-mantine: <code>StyleSelect</code>, <code>ToggleIconButton</code>.")}`,
        `Size is bound to degree: the pill names the attribute where the value would be, and the scale button opens the encoding popover. Fill and Label are empty channel groups: the header in secondary ink with +.${cm("interface-templates.md 10, 11. compact-mantine: <code>VariablePill</code>, <code>ControlSection</code> empty state.")}`,
        `${blk}The painted count, then No value, Notes and Used by.${cm("interface-templates.md 10; interface-specification.md 7.4.")}`,
    ],
});

// 5. TP53 selected: Appearance is the same stack, what paints TP53 highlighted
const appearanceFrame = (id, dark = false) => frame("screen", {
    id,
    dark,
    title: dark ? "TP53 selected, dark" : "TP53 selected: the same stack, with what paints it highlighted",
    sub: dark ? "frame 5 on the dark canvas" : "the analyst clicked TP53. The inspector turns to the protein; its Appearance section is the whole stack, unchanged in order, with the layers that paint TP53 highlighted and each marked with what it wins",
    app: () => rail + leftPanel()
        + main(canvas("ppi-stacked-tp53", "The four layers, TP53 selected with the two-tone selection ring", legend(["path", "bc", "hub", "size"]))) + inspectorTp53({ list: stackList(FOUR, { sel: SEL_ALL_ON, anchors: { path: "row-path", bc: "row-bc", hub: "row-hub", size: "row-size" } }) }),
    marks: dark ? [] : [["appearance", -10, 10], ["row-bc", 2, 6], ["row-hub", 2, 6], ["row-path", 2, 6], ["applus", -12, 4], ["results", -10, 8], [622, 452]],
    notes: dark ? [`The highlight and its bar keep their contrast on the dark panel; the wins lines stay in body ink.${cm("visual-language.md (dark); framework-changes.md, \"A fact the reader acts on is never caption gray\".")}`] : [
        `Appearance is the Style stack with a selection: the same rows in the same order, not a filtered list. Filtering would hide the layer that lost, and precedence can only be read with every row in place. Because both states render one stack, a canvas click in the middle of a drag never unmounts the row being dragged.${cm("framework-changes.md, \"Interface specification: the rail, the header and the inspector's sections\" (after round 3); conceptual-model.md 5.1. compact-mantine: the same <code>Tree</code>, one instance.")}`,
        `A layer that paints TP53 is highlighted (a bar and a tint) and says what it wins, with the value that drove it: "Wins color: betweenness ${TP.betweenness}". This answers "which layer makes TP53 dark brown?"${cm("interaction-pattern-entries.md 4.7; interface-specification.md 3.1. compact-mantine: <code>Tree</code> row with a description line, a need.")}`,
        `A layer that writes TP53 but is covered stays in view, unhighlighted, and says by what: "Label: covered by Shortest path ${path.from} to ${path.to} above". This is the answer to "why is this protein not labeled the way I expected?"; filtering to the winners would have hidden it.${cm("framework-changes.md, \"Appearance marks a covered write on the selection\" (new). Needs graphty-element's per-channel explanation.")}`,
        `The path layer wins TP53's highlight and label: TP53 is both a hub and the path's start, and the path sits above Hub labels.${cm("conceptual-model.md 5.1.")}`,
        `"+" in the Appearance header adds a layer scoped to the selection, as "+" in Figma's Selection colors adds a paint (frame 8).${cm("figma-crosswalk.md, styles in the right panel recorded as a closer copy of Figma; task-flows.md (first write). compact-mantine: <code>ActionIcon</code>.")}`,
        `Results gives TP53's value and rank in each run, so the number the color stands for is one glance away.${cm("framework-changes.md (the inspector's Results section with a selection).")}`,
        `The selection ring sits inside the path's dashed ring; the two marks do not collide.${cm("canvas-drawing.md 2, 5, 6. Drawn by graphty-element.")}`,
    ],
});
appearanceFrame("appearance");

// 6. Two run layers row-selected, TP53 selected
frame("screen", {
    id: "row-selection",
    title: "Two run layers row-selected, TP53 still selected",
    sub: "the analyst wants to see TP53 without the runs' paint. Ctrl+click on the two run rows focuses both; TP53 stays selected on the canvas and in the inspector",
    app: () => rail + leftPanel()
        + main(canvas("ppi-stacked-tp53", "The four layers, TP53 selected with the two-tone selection ring", legend(["path", "bc", "hub", "size"]))) + inspectorTp53({ list: stackList(FOUR, { focus: ["path", "bc"], sel: SEL_ALL_ON, anchors: { path: "row-path", bc: "row-bc" } }) }),
    overlays: () => `<span class="k-cursor"${place("cur", "row-bc", { x: "left", dx: 100, dy: 14 })}></span>`,
    marks: [["row-path", 2, 6], ["row-bc", 2, 6]],
    notes: [
        `A row selection: Ctrl+click adds a row to the focus without touching the canvas selection. Both rows show their trailing slots over the origin word. The canvas selection is announced "on canvas", so the two are told apart by ear too.${cm("interaction-patterns.md 3.1; interaction-pattern-entries.md 6.8, 9.1. compact-mantine: <code>Tree</code> multi-select, a need.")}`,
        `Either focused row's eye now acts on both: one press, one undo step (frame 7). The focus tint and the wins highlight can sit on the same row: the bar keeps saying the row paints TP53.${cm("interaction-pattern-entries.md 6.8, Bulk.")}`,
    ],
});

// 7. Two run layers off
frame("screen", {
    id: "runs-off",
    title: "Two run layers off, TP53 still selected",
    sub: "one press on either eye turned both off. The highlights move: Base style now wins TP53's color and Hub labels its label",
    app: () => rail + leftPanel()
        + main(canvas("ppi-base-hubs-tp53", "Gray proteins sized by degree, hubs labeled, TP53 selected; no path mark", legend(["hub", "size"]))) + inspectorTp53({ list: stackList(FOUR, { focus: ["path", "bc"], off: { path: true, bc: true }, sel: SEL_RUNS_OFF, baseSel: "color: unstyled gray", anchors: { path: "row-path", bc: "row-bc", hub: "row-hub" } }) }),
    marks: [["row-path", 2, 6], ["row-hub", 2, 6], ["base", 2, 6], ["legend", -10, 8]],
    notes: [
        `An off layer: its name and chip in tertiary ink, its closed eye pinned. It paints nothing, so it carries no highlight; it keeps its place. One eye press switched both focused rows, one undo step named for both layers.${cm("visual-language.md A7; interaction-pattern-entries.md 6.8, Bulk; content-design.md (undo labels).")}`,
        `Hub labels, covered on TP53 a moment ago, now wins its label. The highlight moved with no row moving.${cm("conceptual-model.md 5.1.")}`,
        `${blk}Color falls to Base style, the floor of the stack, pinned last with no handle, highlighted and named, never left blank.${cm("canvas-drawing.md 3; interface-specification.md 7.4 (the Base style row).")}`,
        `The legend drops the path and betweenness blocks; an exported legend would too.${cm("options-and-encodings.md 6, item 7.")}`,
    ],
});

// 8. "+" adds a layer scoped to the selection; the swatch opens the color picker
const SEL_NEW = { ...SEL_ALL_ON };
frame("screen", {
    id: "add-to-selection",
    title: "Adding a layer for the selection, and the color picker",
    sub: "the analyst wants TP53 to stand out. \"+\" in Appearance adds a layer named TP53 on top, scoped to the selection, with its editor open; she added a Fill and pressed its swatch",
    app: () => rail + leftPanel()
        + main(canvas("ppi-stacked-tp53", "The four layers, TP53 selected", legend(["path", "bc", "hub", "size"]))) + inspectorTp53({ list: stackList(["sel", ...FOUR], { expanded: true, focus: ["sel"], sel: SEL_NEW, anchors: { sel: "row-sel" } }) }),
    overlays: () => newLayerEditor(edAt("row-sel")) + colorPicker(place("picker", "edfill", { x: "left", dx: -248, dy: -8, clamp: 76 })),
    marks: [["applus", -12, 4], ["row-sel", 2, 6], ["edapplies", -10, 4], ["edfill", -10, 4], ["picker", -10, 8], ["swatches", -10, 2]],
    notes: [
        `"+" in the Appearance header, as "+" in Figma's Selection colors.${cm("figma-crosswalk.md (styles in the right panel, a closer copy of Figma). compact-mantine: <code>ActionIcon</code>.")}`,
        `The new layer lands on top, named for what it applies to, and writes nothing yet, so it wins nothing and the canvas has not changed. Undo removes it in one step. The stack is shown in full: in Appearance a row that paints the selection is never folded behind "N more".${cm("task-flows.md (first write: \"Add style layer\"); interaction-patterns.md 3.4.")}`,
        `Applies to is the selection, frozen at the moment of "+": TP53 by id, not "whatever is selected", so selecting another protein later does not repaint. A set or a rule can replace it.${cm("interface-templates.md 10; framework-changes.md, \"A layer added from Appearance applies to the selection as it was\" (new). compact-mantine: <code>StyleSelect</code>.")}`,
        `The Fill row's swatch has no color yet ("Pick a color"), so the layer still paints nothing; pressing the swatch opens the picker.${cm("figma-spec 7.1, 7.2 (the chit opens the picker). compact-mantine: <code>CompactColorInput</code>.")}`,
        `The color picker opens to the left of the editor, with Custom and Libraries tabs. Custom is Figma's: the saturation field, hue and opacity, the value row and swatches. It stays open while other rows are clicked; Esc returns focus to the swatch.${cm("framework-changes.md (the color picker's Custom and Libraries tabs, after round 3); figma-spec 7.3. compact-mantine: <code>ColorPickerPanel</code>.")}`,
        `The swatches are the categorical palette the canvas uses, then the unstyled gray.${cm("canvas-drawing.md 3. compact-mantine: <code>SWATCH_COLORS_HEXA</code>, set by the caller.")}`,
    ],
});

// 9. The Libraries tab
frame("screen", {
    id: "libraries",
    title: "The color picker's Libraries tab",
    sub: "the same moment, with Libraries open: the palettes, and the style layers that came with the applied recipes",
    app: () => rail + leftPanel()
        + main(canvas("ppi-stacked-tp53", "The four layers, TP53 selected", legend(["path", "bc", "hub", "size"]))) + inspectorTp53({ list: stackList(["sel", ...FOUR], { expanded: true, focus: ["sel"], sel: SEL_NEW, anchors: { sel: "row-sel" } }) }),
    overlays: () => newLayerEditor(edAt("row-sel")) + colorPicker(place("picker", "edfill", { x: "left", dx: -248, dy: -8, clamp: 76 }), "libraries"),
    marks: [["libtab", -10, 4], ["libpal", -10, 4], ["liblayers", -10, 4]],
    notes: [
        `Libraries is Figma's second tab, under Figma's own word. It appears only when a palette or a library layer exists; with none the picker is titled Color.${cm("figma-spec 7.3, item 1; framework-changes.md, \"Libraries, only as the color picker's tab\" (new: the glossary rejects the word elsewhere). compact-mantine: <code>ColorPickerPanel</code> tabs.")}`,
        `Palettes, named in words. Picking a categorical palette offers its colors as swatches; a ramp is offered when the Fill is bound to a value.${cm("options-and-encodings.md 4a, 5. compact-mantine: <code>Tree</code> rows with chips.")}`,
        `Style layers from each applied recipe, grouped by the recipe they came from. Picking one adds it on top of the stack, applied to the selection, in place of the empty layer; it keeps its name and origin word.${cm("glossary.md (recipe); interface-templates.md 20 (Apply recipe); framework-changes.md, \"Libraries holds palettes and library style layers\" (new).")}`,
    ],
});

// 10. Fourteen layers at rest
frame("screen", {
    id: "fourteen",
    title: "Fourteen layers at rest",
    sub: "a heavy session after several rankings, nothing selected. The Style stack shows its top three layers and Base style, and the other eleven behind one row",
    app: () => rail + leftPanel({ sets: SETS8 })
        + main(canvas("ppi-stacked", "The same drawing: the eleven layers behind the cut are off, painted over, or paint nothing visible", legend(["path", "bc", "hub", "faint"], { more: "1 more: Size: degree" }))) + inspectorGraph({ list: stackList(FOURTEEN), runs: ["path", "bc"] }),
    marks: [["more", 2, 6], ["base", 2, 6], ["legend", -10, 8]],
    notes: [
        `Past four layers the stack rests at four rows, the top three and Base style, with "11 more" between them, as Figma collapses Selection colors. Enter or a click expands it in place; Esc collapses it. The cut never reorders anything.${cm("state-matrix.md 7 (Count/Layers/Fourteen); interaction-pattern-entries.md 6.8. compact-mantine: <code>Tree</code>, a \"N more\" row, a need.")}`,
        `${blk}Base style is pinned last and always visible.${cm("interface-templates.md 9; interface-specification.md 7.4.")}`,
        `The legend lists what wins paint on the canvas; layers that are off or painted over add nothing.${cm("options-and-encodings.md 6, items 7 and 9.")}`,
    ],
});

// 11. Fourteen expanded, dragging Module color
frame("screen", {
    id: "drag",
    title: "Fourteen layers expanded, Module color dragged above Betweenness color",
    sub: "the analyst wants her module colors to win. She drags the row by its handle; the insertion line shows where it will land",
    app: () => rail + leftPanel({ sets: SETS8 })
        + main(canvas("ppi-stacked", "Unchanged while the drag is in progress", legend(["path", "bc", "hub", "faint"], { more: "1 more: Size: degree" }))) + inspectorGraph({ list: stackList(FOURTEEN, { expanded: true, drop: 1, dragKey: "module", anchors: { module: "row-module", bc: "row-bc", qpcr: "row-qpcr" } }) }),
    overlays: () => `<div class="dragghost"${place("ghost", "drop", { x: "left", dx: 20, dy: -8 })}>${grip}<span class="chipslot">${LY.module.chip}</span><span>Module color</span></div><span class="k-cursor"${place("cur", "drop", { x: "left", dx: 30, dy: 2 })}></span>`,
    marks: [["drop", -10, -9], ["row-module", 2, 6], ["nothing", 2, 6], ["row-qpcr", 2, 6]],
    notes: [
        `The insertion line between two rows: a drop lands at that flat position. There is no "into" zone, because a style layer holds no other layers.${cm("interface-templates.md 9; interface-specification.md 7.2. compact-mantine: <code>Tree</code> drag, variant.")}`,
        `The dragged row stays in place, faded, until the drop. It says why it paints nothing, "Covered by Betweenness color above"; its Move above button does in one press what this drag does.${cm("framework-changes.md, \"Styles list: a layer that paints nothing says what covers it\".")}`,
        `${blk}Three recipe layers whose attributes this network does not have form one row that says why: "3 layers match no protein". It expands in place; a covered layer is never folded into it.${cm("interaction-pattern-entries.md 6.8; interface-templates.md 9.")}`,
        `An off layer in the long list: closed eye pinned, tertiary ink.${cm("visual-language.md A7.")}`,
    ],
});

// 12. After the drop
frame("screen", {
    id: "dropped",
    title: "After the drop: module colors win",
    sub: "Module color is second from the top. Every protein takes its module's color; Betweenness color below it is now covered and says so",
    app: () => rail + leftPanel({ sets: SETS8 })
        + main(canvas("ppi-stacked-modules", "Proteins colored by module, sized by degree, hubs labeled, path highlighted", legend(["path", "module", "faint"], { more: "3 more: Labels, Size: degree; Color by betweenness, covered" }))) + inspectorGraph({ list: stackList(FOURTEEN_DROPPED, { expanded: true, focus: ["module"], covered: { module: null, bc: "Module color" }, anchors: { module: "row-module", bc: "row-bc" } }) }),
    marks: [["row-module", 2, 6], ["row-bc", 2, 6], ["legend", -10, 8]],
    notes: [
        `The dropped row keeps focus. The drop is one undo step, "Move Module color above Betweenness color".${cm("interface-templates.md 9; content-design.md (undo labels).")}`,
        `${blk}Betweenness color now reads "Covered by Module color above", in body ink, with Move above: its run is kept, only its paint is covered.${cm("framework-changes.md, \"Styles list: a layer that paints nothing says what covers it\".")}`,
        `The legend puts the blocks that win paint first, in stack order, and folds the covered betweenness block behind "3 more" with its reason.${cm("options-and-encodings.md 6, item 7; state-matrix.md 7. Drawn by graphty-element.")}`,
    ],
});

// 13. A layer most proteins have no value for
frame("screen", {
    id: "no-value",
    title: "A layer most proteins have no value for",
    sub: `qPCR log2FC color reads this week's qPCR file, which names ${expr.matched} of the ${N} proteins. The layer is off; its editor is open`,
    app: () => rail + leftPanel({ sets: SETS8 })
        + main(canvas("ppi-stacked-modules", "Proteins colored by module, sized by degree, hubs labeled, path highlighted", legend(["path", "module", "faint"], { more: "3 more: Labels, Size: degree; Color by betweenness, covered" }))) + inspectorGraph({ list: stackList(FOURTEEN_DROPPED, { expanded: true, focus: ["qpcr"], covered: { module: null, bc: "Module color" }, anchors: { qpcr: "row-qpcr" } }) }),
    overlays: () => qpcrEditor(edAt("row-qpcr")),
    marks: [["row-qpcr", 2, 6], ["ed", -10, 8], ["edpaints", -10, 2], ["ednovalue", -10, 2]],
    notes: [
        `An off layer's editor opens like any other; its header eye shows the closed state, pressed.${cm("interface-templates.md 10 (header: eye).")}`,
        `${blk}An off layer paints nothing now; the count says what it would paint when on.${cm("interface-specification.md 7.4.")}`,
        `No value counts the proteins the bound attribute has nothing for, ${N - expr.matched} of ${N}. They take no paint from this layer, so the layers beneath show through.${cm("interface-templates.md 10; canvas-drawing.md 3; options-and-encodings.md 6, item 9. compact-mantine: <code>DataRow</code>, <code>ProseBlock</code>.")}`,
    ],
});

// 14. Empty stack
frame("screen", {
    id: "empty",
    title: "No layers yet: Base style only",
    sub: "a freshly loaded network, nothing selected. The Style stack shows the floor of the stack and how to add a layer",
    app: () => rail + leftPanel({ sets: [] })
        + main(canvas("ppi-plain", "300 gray proteins, unstyled")) + inspectorGraph({ list: `<ul class="k-list stack">${baseRow()}</ul>`, empty: true, runs: [], legendOn: false }),
    marks: [["plus", -26, 2], ["base", 2, 6], ["legendrow", -10, 4]],
    notes: [
        `The creation verb is the section header's +. Its menu starts with Empty layer, which adds a layer on top with its editor open, then From a recipe or file... (frame 28). The line under Base style names the other way in, Color by or Size by on any attribute.${cm("information-architecture.md 11; flows/colour-by-value.html; content-design.md (empty states). compact-mantine: <code>ControlSection</code> empty state, <code>ProseBlock</code>.")}`,
        `${blk}Base style is present from the start, in the unstyled gray. The precedence line waits for a second row, since there is nothing to win over.${cm("interface-templates.md 9; interface-specification.md 7.4.")}`,
        `With nothing bound there is no legend to show; the switch is off and turns on with the first bound layer.${cm("options-and-encodings.md 6.")}`,
    ],
});

// 15. A layer covered by one above
const FIVE = [...FOUR, "fcsize"];
const coveredFrame = (id, dark = false) => frame("screen", {
    id,
    dark,
    title: dark ? "A layer covered by one above, dark" : "A layer covered by one above",
    sub: dark ? "frame 15 on the dark canvas" : `the analyst wants the proteins that changed most to be largest, so she switched on Size: |log2FoldChange|. Size: degree above it already sets every protein's size, so nothing on the canvas moved. The row says why, and Move above fixes it in one step`,
    app: () => rail + leftPanel()
        + main(canvas("ppi-stacked", "Unchanged: betweenness colors, degree sizes, hub labels and the path; the covered layer adds nothing", legend(["path", "bc", "size"], { more: "2 more: Labels, top 12 by degree; Size by |log2FoldChange|, covered" }))) + inspectorGraph({ list: stackList(FIVE, { expanded: true, focus: ["fcsize"], anchors: { fcsize: "row-fc", size: "row-size" } }) }),
    overlays: () => fcsizeEditor(edAt("row-fc")),
    marks: dark ? [] : [["row-fc", 2, 6], ["move-fcsize", -10, 4], ["edcov", -10, 4], ["edsize", -10, 4], ["edsign", -10, 2], ["edpaints", -10, 2], ["legend", -10, 8]],
    notes: dark ? [`The covered line and Move above keep body ink on the dark panel.${cm("framework-changes.md, \"A fact the reader acts on is never caption gray\".")}`] : [
        `A layer that is on but paints nothing takes a second line, "Covered by Size: degree above", in body ink. Without it people concluded the tool was broken: "I clicked it, nothing moved. That's the moment I stop."${cm("framework-changes.md, \"Styles list: a layer that paints nothing says what covers it\". compact-mantine: <code>Tree</code> row with a description line, a need.")}`,
        `${blk}Move above puts this layer directly above the one that covers it: one press, one undo step. It is always shown on a covered row.${cm("interface-templates.md 9; interaction-patterns.md 3.4. compact-mantine: <code>Button</code> size xs.")}`,
        `The editor opens with the same sentence and the same button above Applies to.${cm("interface-templates.md 10.")}`,
        `The Size pill states what is drawn: <span class="k-mono">|log2FoldChange|</span>. A size cannot be negative, so size shows the magnitude.${cm("options-and-encodings.md 5, rule 2. compact-mantine: <code>VariablePill</code>.")}`,
        `"By magnitude, sign not shown", with the split it hides (${below0} down, ${above0} up) and the way to carry the sign.${cm("message-catalog.md, graphty.legend.signNotShown; options-and-encodings.md 5, rule 2.")}`,
        `${blk}Paints 0 of ${N} proteins: the number the covered line explains.${cm("interface-specification.md 7.4.")}`,
        `The legend names what each channel encodes in words, then its column; the covered block goes behind "2 more" with its reason.${cm("options-and-encodings.md 6, items 2, 7 and 9. Drawn by graphty-element.")}`,
    ],
});
coveredFrame("covered");

// 16. Label with: the top N as a layer's selector
frame("screen", {
    id: "top-n",
    title: "Labels on the top 12 by degree",
    sub: `Hub labels was made with Label with on the degree column. It asked which proteins second and offered the top N by an attribute, so the layer's Applies to is "Top ${hubs.count} by degree", editable in place`,
    app: () => rail + leftPanel()
        + main(canvas("ppi-stacked", "Betweenness colors, degree sizes, the path, and names on the 12 best-connected proteins", legend(["path", "bc", "hub", "size"]))) + inspectorGraph({ list: stackList(FOUR, { focus: ["hub"], anchors: { hub: "row-hub" } }) }),
    overlays: () => hubEditor(edAt("row-hub")),
    marks: [["row-hub", 2, 6], ["edapplies", -10, 4], ["edlabel", -10, 4], ["edpaints", -10, 2], ["legend", -10, 8]],
    notes: [
        `A layer the analyst made with Label with. Its row has no origin word.${cm("options-and-encodings.md 4; interface-templates.md 9.")}`,
        `Applies to is the top-N rule: Top, a number field, by, an attribute. Changing 12 to 20 relabels at once and is one undo step. The names it picks are listed under it.${cm("options-and-encodings.md 4; scale-levels.md 2. compact-mantine: <code>FieldRow</code> with <code>NumberInput</code> and <code>StyleSelect</code>.")}`,
        `The Label group with its bound Text pill: the name column.${cm("options-and-encodings.md 3. compact-mantine: <code>VariablePill</code>.")}`,
        `${blk}Paints ${hubs.count} of ${N}, and the ${hubs.count - hubsDrawn} names the drawing hides where labels would overlap.${cm("canvas-drawing.md 8; interface-specification.md 7.4.")}`,
        `The legend block is titled by its rule, "Labels: top ${hubs.count} by degree".${cm("options-and-encodings.md 6, item 9.")}`,
    ],
});

// 17. The Look control
frame("screen", {
    id: "looks",
    title: "Choosing a Look: Screen, Print or High contrast",
    sub: "nothing is selected. The Look control sits in the Style stack header with its label in words; its menu describes each Look, so a figure can be made for a gray printout or for color-blind readers before it is exported",
    app: () => rail + leftPanel()
        + main(canvas("ppi-stacked", "The four layers, nothing selected", legend(["path", "bc", "hub", "size"]))) + inspectorGraph({ list: stackList(FOUR), lookOpen: true }),
    overlays: () => lookMenu(place("menu", "look", { x: "right", dx: -288, y: "bottom", dy: 4 })),
    marks: [["look", -12, 4], ["lookmenu", -10, 40], ["lookmenu", -10, 96]],
    notes: [
        `The Look control is a labeled select in the Style stack header: "Look", then the Look in force. It was an unlabeled palette icon on the graph's header, and people did not find it. A Look changes the whole stack, so it sits on the stack.${cm("framework-changes.md, \"Interface specification ...\" (after round 3: the Look control with a visible label); interface-specification.md 4.1. compact-mantine: <code>StyleSelect</code> with a <code>ControlSection</code> header slot.")}`,
        `Three Looks, each with one plain sentence. Print is the one Look for both a gray printout and color-blind readers: where a color shows a direction (up or down), a shape shows it too. A Look swaps palettes and nothing else.${cm("canvas-drawing.md 4a (framework-changes.md, \"the Print look carries sign with shape\"); options-and-encodings.md 4a. compact-mantine: <code>Menu</code> (dark), items with a description, a need.")}`,
        `${blk}Colors set by hand stay as set, and the menu says so. Once a Look other than Screen is in force the legend names it on its first line. The Looks are the element's registered list.${cm("options-and-encodings.md 6, item 8; element-needs.md, \"Registered recipes, Looks and samples\".")}`,
    ],
});

// 18. Laptop, the stack in the inspector (the build)
frame("screen", {
    id: "laptop-inspector",
    title: "Laptop, 1366 by 768: 20 sets and 14 layers",
    sub: "the build at a laptop size, nothing selected: the Style stack in the inspector, the whole left panel for Sets and paths",
    w: 1366, h: 768,
    app: () => rail + leftPanel({ sets: SETS20 })
        + main(canvas("ppi-stacked", "The four layers, nothing selected", legend(["path", "bc", "faint"], { more: "2 more: Labels, Size: degree" }))) + inspectorGraph({ list: stackList(FOURTEEN) }),
    marks: [["sets", 2, 12], ["instack", 2, 12], ["legend", -10, 8]],
    notes: [
        (m) => `Measured on this frame: Sets and paths shows ${m.laptopSets ?? "?"} of its 20 rows in full, with no split handle to share the panel.${cm("state-matrix.md 8 (Window/LaptopLeftPanel: at least four set rows).")}`,
        (m) => `The Style stack shows ${m.laptopStyles ?? "?"} rows in view at rest: the top three layers, "11 more" and Base style, with its legend switch; Results is ${m.laptopResults ?? "?"}.${cm("state-matrix.md 7, 8.")}`,
        (m) => `The legend and the toolbar do not overlap: the legend ends ${m.laptopGap ?? "?"} px left of the toolbar.${cm("state-matrix.md 8 (the canvas furniture).")}`,
    ],
});

// 19. Superseded: the stack in the left panel
frame("screen", {
    id: "laptop-left",
    title: "For comparison: the stack in the left panel, 1366 by 768",
    sub: "the placement this design replaces, with the same 20 sets and 14 layers: the Styles section under Sets and paths, sharing the panel through a split handle",
    w: 1366, h: 768,
    app: () => rail + leftPanel({ sets: SETS20, styles: true, list: stackList(FOURTEEN), handleFocus: true })
        + main(canvas("ppi-stacked", "The four layers, nothing selected", legend(["path", "bc", "faint"], { more: "2 more: Labels, Size: degree" }))) + inspectorGraph({ list: "", stack: false }),
    marks: [["sets", 2, 12], ["styles", 2, 12], ["split", 180, -10]],
    notes: [
        (m) => `Measured: Sets and paths shows ${m.laptopBSets ?? "?"} of 20 rows in full here, against ${m.laptopSets ?? "?"} with the stack in the inspector.${cm("state-matrix.md 8.")}`,
        `Styles as a Graph panel section: the same rows, cut the same way. It fails the right panel's test: a style layer paints the selection, so it belongs where the selection is read, and the Graph panel lists the project's objects.${cm("framework-changes.md, \"Navigation model: one sentence per region\" (after round 3); information-architecture.md 11.")}`,
        `The split handle every left-panel placement needed; the right-panel placement has none.${cm("compact-mantine: <code>ResizeHandle</code>.")}`,
    ],
});

// 20 and 21. Dark
appearanceFrame("dark", true);
coveredFrame("covered-dark", true);
hoverFrame("hover-dark", true);

// ---------------------------------------------------------------- group comparison and the method catalog
// A finished Louvain run (datasets.ppi.louvain) and its biggest community compared with the rest
// (scenarios.groupCompare, written by screens/group-compare-numbers.mjs). Descriptive only.
const LVG = ppi.louvain;
const C1 = LVG.groups[0];
const GC = fx.scenarios.groupCompare;
if (GC.community !== C1.community || GC.size !== C1.size) throw new Error("scenarios.groupCompare is stale: run node screens/group-compare-numbers.mjs");
const lvColor = (c) => fx.canvas.categorical[c - 1] ?? "#505050";

// Where each protein sits on the Louvain drawing (screens/img/results-panel-louvain-*.svg, written by
// screens/results-panel.py): its 300 filled circles are the proteins in louvain.community order.
const LVPOS = (() => {
    const svg = readFileSync(join(here, "img/results-panel-louvain-light.svg"), "utf8");
    const c = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="#[0-9A-Fa-f]{6}"\/>/g)].map((m) => m.slice(1, 4).map(Number));
    const names = Object.keys(LVG.community);
    if (c.length !== names.length) throw new Error(`Louvain drawing has ${c.length} nodes, expected ${names.length}`);
    return Object.fromEntries(names.map((n, k) => [n, c[k]]));
})();
const TONE = { light: { outer: "#1A1A1A", inner: "#FFFFFF", canvas: "#F5F5F5" }, dark: { outer: "#FFFFFF", inner: "#1A1A1A", canvas: "#1E1E1E" } };
const circ = (x, y, r, c, w) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
const memberOverlay = (t) => C1.members.map((m) => { const [x, y, r] = LVPOS[m]; return circ(x, y, r + 0.5, TONE[t].inner, 1) + circ(x, y, r + 1.5, TONE[t].outer, 1); }).join("");
function lvCanvas(alt, lg, members = true) {
    const ov = (t) => (members ? `<svg class="k-${t}-only" viewBox="0 0 1200 800" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%">${memberOverlay(t)}</svg>` : "");
    return `<div class="k-canvas"${A("canvas")}>
        <div class="k-stage"${A("stage")}><img class="k-light-only" src="img/results-panel-louvain-light.svg" alt="${alt}"><img class="k-dark-only" src="img/results-panel-louvain-dark.svg" alt="${alt}">${ov("light")}${ov("dark")}</div>
        ${lg}
        ${toolbar}
        <span class="k-help">${I("circle-help")}</span>
      </div>`;
}
LG.louvain = `<div class="k-lg-title">Color: Louvain community</div>${LVG.groups.slice(0, 4).map((g) => `<div class="k-lg-row">${chit(lvColor(g.community))}Community ${g.community}<span class="k-value">${g.size}</span></div>`).join("")}<div class="k-lg-row k-secondary">${LVG.communities - 4} more</div>`;
const LV_STACK = ["louvain", "size"];

// A box plot with the values as a strip over it: Community 1 on top in its color, the rest in the
// unstyled gray. Betweenness uses the same log scale as its color legend, so the two agree.
const bcT = (v) => Math.log1p(v / bcEnc.c) / Math.log1p(bcEnc.domain[1] / bcEnc.c);
const SCALES = {
    log2FoldChange: { lo: ppi.encodings.foldChange.domain[0], hi: ppi.encodings.foldChange.domain[1], ticks: [-2, -1, 0, 1, 2, 3], fmt: (v) => minus(v.toFixed(2)), name: "linear" },
    degree: { lo: 0, hi: ppi.stats.maxDegree, ticks: [0, 10, 20, 30], fmt: (v) => `${Math.round(v)}`, name: "linear" },
    betweenness: { t: bcT, ticks: [0, ...bcEnc.ticks.map((x) => x.value)], fmt: (v) => v.toFixed(4), name: "log" },
    pagerank: { lo: 0, hi: 0.012, ticks: [0, 0.004, 0.008, 0.012], fmt: (v) => v.toFixed(5), name: "linear" },
};
function boxPlot(key) {
    const c = GC.columns[key], s = SCALES[key];
    const x0 = 4, x1 = 204;
    const t = s.t ?? ((v) => (v - s.lo) / (s.hi - s.lo));
    const X = (v) => (x0 + (x1 - x0) * t(v)).toFixed(1);
    const jit = (k) => (((k * 0.618034) % 1) - 0.5) * 12; // ponytail: golden-ratio jitter, deterministic; the element owns the real strip layout
    const row = (b, vals, y, cls) => `${vals.map((v, k) => `<circle class="${cls}-dot" cx="${X(v)}" cy="${(y + jit(k)).toFixed(1)}" r="1.6"/>`).join("")}
        <line class="bp-wh" x1="${X(b.whiskerLow)}" x2="${X(b.q1)}" y1="${y}" y2="${y}"/><line class="bp-wh" x1="${X(b.q3)}" x2="${X(b.whiskerHigh)}" y1="${y}" y2="${y}"/>
        <rect class="bp-box ${cls}-box" x="${X(b.q1)}" y="${y - 7}" width="${Math.max(1, X(b.q3) - X(b.q1)).toFixed(1)}" height="14" rx="1"/>
        <line class="bp-med" x1="${X(b.median)}" x2="${X(b.median)}" y1="${y - 8}" y2="${y + 8}"/>`;
    const ticks = s.ticks.map((v) => `<line class="bp-tick" x1="${X(v)}" x2="${X(v)}" y1="48" y2="51"/><text class="bp-tl" x="${X(v)}" y="61" text-anchor="middle">${key === "betweenness" ? v : minus(v)}</text>`).join("");
    return `<svg class="bp" viewBox="0 0 208 64" role="img" aria-label="${key}: Community ${GC.community} median ${s.fmt(c.group.median)}, the rest ${s.fmt(c.rest.median)}">
      <style>.g-dot{fill:${lvColor(GC.community)};fill-opacity:.75}.r-dot{fill:#808080;fill-opacity:.35}</style>
      ${row(c.group, c.groupValues, 10, "g")}${row(c.rest, c.restValues, 34, "r")}<line class="bp-axis" x1="${x0}" x2="${x1}" y1="48" y2="48"/>${ticks}</svg>`;
}
function cmpBlock(key) {
    const c = GC.columns[key], s = SCALES[key];
    const r = c.rankBiserial;
    return `<div class="cmp"${A(`cmp-${key}`)}>
      <div class="cmp-name">${mt(key, key)}<span class="k-tertiary">${s.name} scale</span></div>
      ${boxPlot(key)}
      <table class="cmp-t"><thead><tr><th><span class="k-sr">side</span></th><th>${mt("median", "median")}</th><th>${mt("IQR", "iqr")}</th></tr></thead><tbody>
        <tr><td>${chit(lvColor(GC.community))}group</td><td>${s.fmt(c.group.median)}</td><td>${s.fmt(c.group.q1)} to ${s.fmt(c.group.q3)}</td></tr>
        <tr><td>${chit("#808080")}rest</td><td>${s.fmt(c.rest.median)}</td><td>${s.fmt(c.rest.q1)} to ${s.fmt(c.rest.q3)}</td></tr>
      </tbody></table>
      <div class="cmp-r"${A(`r-${key}`)}${key === "degree" && F.openR ? " data-focusr" : ""}>${mt("rank-biserial r", "r")} <b class="k-num">${minus(r.toFixed(2))}</b><br><span class="k-fact">effect size, not a significance test</span></div>
    </div>`;
}
// The group inspector: Community 1 selected (as a group offered by the run), its facts, then the
// comparison with the rest on the columns the reader chose.
function inspectorGroup(cols, { scrolled = false, menuOpen = false } = {}) {
    return `<aside class="k-right" aria-label="Inspector">
      ${head12}
      <div class="k-typerow">${I("group")}<span class="k-name" style="white-space:nowrap">Community ${C1.community}</span><span class="k-secondary">${mt("Community", "community")}</span><span class="k-grow"></span><span class="k-icon-btn" aria-label="Create set">${I("bookmark-plus")}</span></div>
      <div class="k-scroll">
        ${scrolled ? "" : `<section class="k-section"${A("gfacts")}>
          ${dataRow("created from", `Louvain run, ${mt(`seed ${LVG.seed}`, "seed")}`)}
          ${dataRow("size", `${C1.size} proteins`)}
          ${dataRow(mt("edges inside", "edgesInside"), `${C1.edgesInside}`)}
          ${dataRow(mt("edges out", "edgesOut"), `${C1.edgesOut}`)}
          ${dataRow(mt("density", "density"), `${C1.density}`)}
        </section>`}
        <section class="k-section"${A("cmpsec")}>
          <div class="k-section-head">Compared with the rest<span class="k-grow"></span><span class="k-icon-btn" aria-label="Choose columns"${menuOpen ? ' aria-expanded="true" data-hover' : ""}${A("cols")}>${I("sliders-horizontal")}</span></div>
          <div class="k-prose k-fact cmp-lead"${A("descr")}><b>Descriptive only; no statistical test.</b><br><span data-fx="scenarios.groupCompare.size">${GC.size}</span> proteins in Community ${GC.community}, <span data-fx="scenarios.groupCompare.restSize">${GC.restSize}</span> in the rest.</div>
          ${cols.map(cmpBlock).join("")}
          <div class="k-prose cmp-enr"${A("enr")}>Enrichment analysis isn't part of graphty.</div>
          <div class="cmp-copy"><span class="k-btn k-btn-secondary"${A("copy")}>${I("copy", "k-i k-i-sm")}Copy members</span></div>
        </section>
        <section class="k-section"><div class="k-section-head">Appearance<span class="k-grow"></span><span class="k-icon-btn" aria-label="Add a style layer for Community ${C1.community}">${I("plus")}</span></div>
          ${prec}${stackList(LV_STACK, { off: { louvain: false }, sel: { louvain: { wins: `color: Community ${C1.community}` }, size: { wins: "size: degree" } } })}
        </section>
      </div>
    </aside>`;
}
function columnMenu(pl) {
    const item = (on, name, hover = false) => `<div class="k-menu-item" role="menuitemcheckbox" aria-checked="${on}"${hover ? " data-hover" : ""}><span class="k-check-col">${on ? I("check", "k-i k-i-sm") : ""}</span><span>${name}</span></div>`;
    return `<div class="k-menu" style="width:200px" role="menu"${pl}${A("colmenu")}>
    <div class="k-menu-label">Compare on</div>
    ${item(true, "log2FoldChange")}${item(true, "degree")}${item(true, "betweenness", true)}${item(false, "pagerank")}
    <div class="k-menu-sep"></div>
    <div class="k-menu-label">Number columns only</div>
  </div>`;
}
const lvStack = () => leftPanel();
const groupAlt = `300 proteins colored by Louvain community, sized by degree; the ${C1.size} members of Community ${C1.community} carry the member ring`;
const CMP_NOTES = [
    `The group inspector for a community the run offered. The count rows are facts about the group; <b>density</b> and <b>edges out</b> say what they mean on hover and keyboard focus, as every statistic on this page does (frame 26).${cm("interface-specification.md 2 (a group); glossary.md 12. compact-mantine: <code>DataRow</code>, <code>Tooltip</code>.")}`,
    `The section says what it is before any number: "Descriptive only; no statistical test." It compares the group with the rest of the graph, never group against group, and shows no p-value. With many columns and ten groups, uncorrected tests would hand out false findings; an effect size says how big a difference is without claiming it is real.${cm("framework-changes.md, \"Groups: compared with the rest, descriptive only\". Proposed. compact-mantine: <code>ControlSection</code>, <code>ProseBlock</code>.")}`,
    `The reader chooses the columns (the sliders button, frame 24). Each column is a box plot with the values drawn as a strip over it: Community 1 in its color, the rest in the unstyled gray, on the column's own scale; betweenness uses the log scale of its legend.${cm("options-and-encodings.md 5 (the scale follows the encoding); canvas-drawing.md 3 (the unstyled gray). compact-mantine: a need, a box-plot row built like <code>HistogramRow</code>.")}`,
    `Median and IQR for each side, then one effect size, rank-biserial r, with the words "effect size, not a significance test" under it. Here r is near 0 on both columns: the biggest group barely differs from the rest on log2FoldChange or degree. That is a finding too, and the page does not dress it up.${cm("framework-changes.md, \"Groups: compared with the rest, descriptive only\". compact-mantine: <code>Table</code> (compact), <code>Text</code>.")}`,
    `One plain line for what is out of scope, then Copy members, which copies the ${C1.size} gene symbols one per line, the form an enrichment tool takes.${cm("user-journeys.md W21 (enrichment is an outside step); message-catalog.md (new row, proposed). compact-mantine: <code>Button</code> variant default, size xs.")}`,
];
const cmpFrame = (id, dark = false) => frame("screen", {
    id, dark,
    title: dark ? "Comparing a group with the rest, dark" : "Comparing a group with the rest",
    sub: dark ? "frame 23 on the dark canvas" : `Louvain found ${LVG.communities} communities. The analyst selected the biggest, Community ${C1.community} (${C1.size} proteins), to see what makes it different, and chose two columns to compare it on`,
    app: () => rail + lvStack() + main(lvCanvas(groupAlt, legend(["louvain", "size"]))) + inspectorGroup(["log2FoldChange", "degree"]),
    marks: dark ? [] : [["gfacts", -10, 8], ["descr", -10, 2], ["cols", -12, 4], ["r-degree", -10, 2], ["enr", -10, 2]],
    notes: dark ? [`The strip, the boxes and the effect-size line keep their inks on the dark panel; the gray of the rest is the same unstyled gray the canvas uses.${cm("canvas-drawing.md 3; visual-language.md (dark).")}`] : CMP_NOTES,
});
cmpFrame("group-compare");

// 20. Choosing the columns
frame("screen", {
    id: "group-columns",
    title: "Choosing the columns to compare",
    sub: "the analyst adds betweenness. The menu stays open for another pick; the new column is appended below the others, and the inspector has scrolled to it",
    app: () => rail + lvStack() + main(lvCanvas(groupAlt, legend(["louvain", "size"]))) + inspectorGroup(["log2FoldChange", "degree", "betweenness"], { scrolled: true, menuOpen: true }),
    overlays: () => columnMenu(place("menu", "cols", { x: "right", dx: -200, y: "bottom", dy: 4 })),
    marks: [["colmenu", -10, 30], ["cmp-betweenness", -10, 6]],
    notes: [
        `A menu of checkbox items: every number column the graph has, the run's results included. It stays open while the reader picks, and each pick is one undo step. A category column is not offered here; its counts per group are the communities table's.${cm("interaction-pattern-entries.md (checkbox menus); framework-changes.md, \"Groups: compared with the rest, descriptive only\". compact-mantine: <code>Menu</code> with <code>closeOnItemClick</code> off, checkbox items.")}`,
        `Betweenness on its legend's log scale, so the plot and the canvas read the same values the same way. Its r is small and positive: members sit a little more often between other proteins than non-members do.${cm("options-and-encodings.md 5, rule 3 (log for a skewed measure).")}`,
    ],
});

// 21. The method catalog
const CATALOG = [
    ["Centrality", [
        ["Degree", "Who has the most connections", { start: true, trail: "already counted" }],
        ["Betweenness", "Who sits between groups"],
        ["Closeness", "Who reaches everyone in fewest steps"],
        ["Eigenvector", "Who knows the well-connected"],
        ["Harmonic centrality", "Closeness for a graph in pieces"],
        ["HITS", "Good sources, and who points to them"],
        ["Katz", "Influence through longer chains"],
        ["PageRank", "Linked to by nodes that matter"],
    ]],
    ["Community", [
        ["Girvan-Newman", "Groups by cutting bridges; slow"],
        ["Label propagation", "Quick, rough groups for huge graphs"],
        ["Leiden", "Groups tighter inside than out", { start: true }],
        ["Louvain", "Like Leiden; a group may split apart"],
    ]],
    ["Path", [
        ["All-pairs distance", "Steps between every pair"],
        ["Breadth-first search", "Everything within N steps"],
        ["Depth-first search", "Everything reachable, branch by branch"],
        ["Shortest path", "Fewest steps between two nodes", { start: true }],
    ]],
];
function catRow([name, task, o = {}], anchor) {
    return `<li class="k-item catrow"${anchor ? A(anchor) : ""}><span class="cat-n">${name}${o.start ? ` <span class="k-badge startbadge">Start here</span>` : ""}</span>${o.trail ? `<span class="k-trail k-tertiary">${o.trail}</span>` : ""}<span class="cat-task">${task}</span></li>`;
}
// The catalog after round 3: Results left the rail, and runs start from Quick actions and the main
// menu's Algorithms submenu, which lists the catalog with each method's task line.
function mainMenu(pl) {
    const it = (t, o = {}) => `<div class="k-menu-item"${o.hover ? " data-hover" : ""}${o.a ? A(o.a) : ""}><span class="k-check-col"></span><span class="k-grow">${t}</span>${o.sub ? `<span class="k-shortcut">${I("chevron-right", "k-i k-i-sm")}</span>` : ""}${o.key ? `<span class="k-shortcut">${o.key}</span>` : ""}</div>`;
    return `<div class="k-menu" style="width:200px" role="menu"${pl}>${it("Quick actions...", { key: "Ctrl+K" })}<div class="k-menu-sep"></div>${it("File", { sub: 1 })}${it("Edit", { sub: 1 })}${it("View", { sub: 1 })}${it("Selection", { sub: 1 })}${it("Algorithms", { sub: 1, hover: 1, a: "mm-alg" })}${it("Recipes", { sub: 1 })}<div class="k-menu-sep"></div>${it("Preferences...")}${it("Help", { sub: 1 })}</div>`;
}
function catalogMenu(pl) {
    const anchors = { Degree: "cat-degree", Leiden: "cat-leiden", Betweenness: "cat-bc", Louvain: "cat-louvain" };
    const it = ([name, task, o = {}]) => `<div class="k-menu-item" data-described${anchors[name] ? A(anchors[name]) : ""}><span class="k-check-col"></span><span class="k-grow">${name}${o.start ? ` <span class="startbadge">Start here</span>` : ""}<span class="k-menu-desc">${task}${o.trail ? `; ${o.trail}` : ""}</span></span></div>`;
    return `<div class="k-menu catmenu" style="width:272px" role="menu"${pl}${A("catalog")}>${CATALOG.map(([fam, rows]) => `<div class="k-menu-label">${fam}</div>${rows.map(it).join("")}`).join('<div class="k-menu-sep"></div>')}</div>`;
}
frame("screen", {
    id: "catalog",
    title: "The method catalog: what each method is for",
    sub: "after the Louvain run, the analyst opens the main menu's Algorithms. Every method says in one plain line what question it answers; one method per family is marked Start here; Degree is listed, and opens what is already counted",
    app: () => rail + leftPanel() + main(lvCanvas("300 proteins colored by Louvain community, sized by degree", legend(["louvain", "size"]), false)) + inspectorGraph({ list: stackList(LV_STACK, { off: { louvain: false } }), runs: ["louvain"] }),
    overlays: () => mainMenu(place("mm", "mainmenu", { x: "right", dx: 4, y: "top", dy: 0 })) + catalogMenu(place("cat", "mm-alg", { x: "right", dx: 4, y: "top", dy: -140, clamp: 8 })),
    marks: [["cat-bc", -10, 4], ["cat-degree", -10, 4], ["cat-leiden", -10, 4], ["cat-louvain", -10, 4], ["results", -10, 8]],
    notes: [
        `Each method carries one task line under its name: the question it answers, in the reader's words. People picked Louvain "because it's what I know" and wished for "a line that just said use this one if you don't know".${cm("framework-changes.md, \"Catalog: a task line per method, and Start here\". compact-mantine: <code>Menu</code> (dark), items with a description, a need.")}`,
        `Degree is in the catalog, first under Centrality, because readers look for it there. It runs nothing: degree is already counted, so it opens the degree chart in Overview and the Nodes table's degree column. Its trailing words say so.${cm("framework-changes.md, \"Catalog: Degree routes to what is already counted\".")}`,
        `"Start here" marks one method per family. In Community it is Leiden: it finds groups like Louvain's and never leaves one in disconnected pieces. Which method carries the mark is catalog data from graphty-element.${cm("element-needs.md (a catalog flag, proposed). compact-mantine: <code>Badge</code>.")}`,
        `Louvain's line names the one thing Leiden fixes. The catalog opens from the main menu's Algorithms and from Quick actions (Ctrl+K); the Results panel it used to live in is now the inspector's Results section.${cm("framework-changes.md, \"Rules for growth: only Graph never leaves the rail\"; figma-crosswalk.md 6 (Plugins becomes Algorithms).")}`,
        `Results, with nothing selected: the runs of this project, newest first.${cm("framework-changes.md (the inspector's Results section).")}`,
    ],
});

// 22. A statistic's meaning on hover and focus
frame("screen", {
    id: "meanings",
    title: "Every statistic says what it means",
    sub: "keyboard focus on \"rank-biserial r\" under degree. Its one-line meaning shows, as it does on hover, for every statistic and step label on the page",
    app: () => { F.openR = true; return rail + lvStack() + main(lvCanvas(groupAlt, legend(["louvain", "size"]))) + inspectorGroup(["log2FoldChange", "degree"]); },
    overlays: () => `<div class="k-tooltip" style="width:220px"${place("mtip", "r-degree", { x: "left", dx: -8, y: "top", dy: -62 })}>${MEAN.r}</div>`,
    marks: [["r-degree", -10, 2]],
    notes: [
        `Statistic names and step labels have a dotted underline and are Tab stops. Hover or focus shows the meaning in one line, taken from the glossary's reader line for that term; Esc hides it. In this mock the tooltips work: hover any dotted label.${cm("glossary.md 12 (each term defined by an (i)); framework-changes.md, \"Every statistic says what it means\". Proposed. compact-mantine: <code>Tooltip</code> on focus and hover.")}`,
    ],
});

cmpFrame("group-compare-dark", true);

// 28. The "+" menu: an empty layer, a recipe, or a suggested layer
const QPCR = ["path", "qpcr", "module", "hub", "size"];
const QPCR_ON = { off: { qpcr: false }, covered: { module: null } };
const qpcrAlt = `${expr.matched} proteins colored by this week's log2 fold change, red up and blue down, over module colors on the other ${N - expr.matched}; hubs labeled, path highlighted`;
frame("screen", {
    id: "plus-menu",
    title: "The + menu: an empty layer, a recipe, or a suggested layer",
    sub: `qPCR log2FC color is on above Module color. The qPCR file names ${expr.matched} of the ${N} proteins, so the other ${N - expr.matched} still show their module colors, some in the same pale blues and salmons as a small change. The analyst presses + in the Style stack header`,
    app: () => rail + leftPanel({ sets: SETS8 })
        + main(canvas("ppi-qpcr-modules", qpcrAlt, legend(["path", "qpcr", "module"]))) + inspectorGraph({ list: stackList(QPCR, { expanded: true, ...QPCR_ON, anchors: { qpcr: "row-qpcr", module: "row-module" } }), plusOpen: true }),
    overlays: () => plusMenu(place("pmenu", "plus", { x: "right", dx: -288, y: "bottom", dy: 4 })),
    marks: [["plus", -26, 2], ["pm-empty", -12, 4], ["pm-recipe", -12, 4], ["pm-sugg", -12, 0], ["pm-shape", -12, 4], ["row-module", 2, 6]],
    notes: [
        `"+" in the Style stack header opens a menu instead of adding a layer at once. People looking for a colleague's styles went to + as often as to the main menu, so the recipe route is here too.${cm("framework-changes.md (Style stack: \"+\" offers a recipe and suggested layers). compact-mantine: <code>ActionIcon</code> opening a <code>Menu</code>.")}`,
        `Empty layer is what + did before: a layer on top with its editor open, painting nothing until it has a property.${cm("interface-templates.md 9; task-flows.md (first write: \"Add style layer\").")}`,
        `From a recipe or file... opens the one Apply dialog, the same one the main menu's Recipes and the Data panel open. One noun, recipe: a .graphty file that holds only styles is a recipe too. Only the styles are offered from here; the dialog says what each of the reader's layers it would replace.${cm("glossary.md (recipe); interface-templates.md 20 (Apply recipe); <a href=\"replace-and-recipe.html\">Applying styles from a recipe</a>. compact-mantine: <code>Menu.Item</code>.")}`,
        `${blk}Suggested for this graph lists layers graphty-element offers because of what the stack and the columns hold. Nothing is styled until the reader picks one, and each is an ordinary layer they can edit, move, switch off or delete. Here a signed scale sits above a category color that still paints the ${N - expr.matched} proteins it leaves, so Mute categories under this scale is offered.${cm("CLAUDE.md, \"Graph Styling\" (appearance only through a layer); element-needs.md (suggested layers from the stack and the columns, new).")}`,
        `${blk}Shape by kind is offered for a category column: up to 5 shapes, because more cannot be told apart at node size, and one shape, Other, for the rest. Module has ${modSorted.length} values, so the 5 largest (${shapeTop.map(([m]) => m).join(", ")}) get a shape each and the other ${shapeRest.length} share Other. It is never applied on load.${cm("canvas-drawing.md 3; options-and-encodings.md 3 (shape).")}`,
        `Module color is on and not covered: qPCR log2FC color above it paints only the ${expr.matched} proteins the file names, so module colors show through on the rest.${cm("conceptual-model.md 5.1; options-and-encodings.md 6, item 9.")}`,
    ],
});

// 29. The suggestion added
frame("screen", {
    id: "muted",
    title: "After picking Mute categories under this scale",
    sub: `the suggestion added one layer on top, Modules in gray, with its editor open. It applies only to the ${N - expr.matched} proteins with no log2FC, so the ${expr.matched} colored by the scale are untouched. Ctrl+Z takes it out in one step`,
    app: () => rail + leftPanel({ sets: SETS8 })
        + main(canvas("ppi-qpcr-grays", `${expr.matched} proteins colored by this week's log2 fold change, red up and blue down; the other ${N - expr.matched} in light grays; hubs labeled, path highlighted`, legend(["path", "qpcr", "mute"], { more: "1 more: Color: module, covered by Modules in gray" }))) + inspectorGraph({ list: stackList(["mute", ...QPCR], { expanded: true, focus: ["mute"], off: { qpcr: false }, covered: { module: "Modules in gray" }, anchors: { mute: "row-mute", module: "row-module" } }) }),
    overlays: () => muteEditor(edAt("row-mute")),
    marks: [["row-mute", 2, 6], ["edapplies", -10, 4], ["edfill", -10, 4], ["edpaints", -10, 2], ["row-module", 2, 6], ["legend", -10, 8]],
    notes: [
        `The new layer lands on top like any other and is the analyst's own: no origin word. Its name says what it draws. The undo label is "Add Modules in gray".${cm("framework-changes.md, \"Only a layer that was not made here carries an origin word\"; content-design.md (undo labels).")}`,
        `Applies to is the proteins with no log2FC, a rule, not a list: when next week's file names more proteins they leave the gray and take the scale. Because of that scope it can sit on top without covering a single colored protein.${cm("CLAUDE.md, \"Algorithm Styles\" (scope a layer with a selector); interface-templates.md 10. compact-mantine: <code>StyleSelect</code>.")}`,
        `The Fill keeps module as its column and draws it in grays half-way to the canvas: no hue, so a gray protein cannot be read as a small change. The reader can swap the grays for outlines or another palette like any bound color.${cm("options-and-encodings.md 4a, 5. compact-mantine: <code>VariablePill</code>.")}`,
        `${blk}Paints ${N - expr.matched} of ${N}: the proteins the file does not name.${cm("interface-specification.md 7.4.")}`,
        `${blk}Module color is now covered on every protein it painted and says so, with Move above. Nothing was removed.${cm("framework-changes.md, \"Styles list: a layer that paints nothing says what covers it\".")}`,
        `The legend names the gray block by its rule and folds the covered module block behind "1 more" with its reason.${cm("options-and-encodings.md 6, items 7 and 9. Drawn by graphty-element.")}`,
    ],
});

// ---------------------------------------------------------------- pages
const blockedList = "the painted count and Select painted, the hover mark on what a layer paints, the collapsed \"N layers match no protein\" row, the name of the layer that covers a covered one (\"Covered by ... above\"), what each layer wins on the selection and what covers it there, the Look menu's registered Looks, the Base style row, and the Overrides row, which this session does not use";
const STYLE = `
  body { background: var(--cm-bg-secondary); }
  .pagehead { max-width: 1440px; margin: 0 auto; padding: 24px 16px 8px; box-sizing: border-box; }
  .pagehead h1 { font-size: 24px; line-height: 32px; font-weight: 600; margin: 0 0 4px; }
  .pagehead p { font-size: 13px; line-height: 20px; color: var(--cm-text-secondary); margin: 0 0 8px; max-width: 110ch; }
  .pagehead nav { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 13px; line-height: 24px; }
  .pagehead a, .an-list a { color: var(--cm-text-brand); text-decoration: underline; text-underline-offset: 2px; }
  .toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; margin-top: 8px; }
  .toggle input { width: 16px; height: 16px; margin: 4px; }
  .st { width: max-content; margin: 24px auto 40px; }
  .st-label { font-size: 15px; line-height: 24px; font-weight: 600; margin: 0 0 8px; max-width: 1440px; }
  .st-label span { font-weight: 450; color: var(--cm-text-secondary); }
  .st-frame { position: relative; overflow: hidden; box-shadow: 0 0 0 1px var(--cm-border); background: var(--cm-bg); color: var(--cm-text); }
  body:has(.st:target) .st:not(:target), body:has(.st:target) .pagehead { display: none; }
  .st:target { margin: 0; }
  .st:target .st-label, .st:target .an-list { display: none; }
  .st:target .st-frame { box-shadow: none; }
  .st-dark .st-frame { color-scheme: dark; }
  .st-dark .st-frame .k-dark-only { display: revert !important; }
  .st-dark .st-frame .k-light-only { display: none !important; }
  .st-gray .st-frame { filter: grayscale(1); }

  .an, .an-list { display: none; }
  body:has(#annot:checked) .an { display: inline-grid; }
  body:has(#annot:checked) .an-list { display: block; }
  .an { position: absolute; z-index: 96; box-shadow: 0 0 0 2px var(--cm-bg); }
  .an-list { margin: 8px 0 0; padding: 12px 16px 12px 40px; background: var(--cm-bg); box-shadow: 0 0 0 1px var(--cm-border); font-size: 12px; line-height: 18px; max-width: 1400px; }
  .an-list li { margin: 2px 0; }
  .an-list li::marker { color: var(--k-annot-ink); font-weight: 600; }
  .an-list .cm { color: var(--cm-text-secondary); }

  /* The left panel's regions: Graphs fixed; Sets and paths over Styles through the split handle */
  .lp-body { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
  .lp-fixed { flex: none; }
  .lp-sets { flex: 0 1 auto; min-height: 72px; overflow: hidden; display: flex; flex-direction: column; border-bottom: 0; }
  .lp-sets .k-list { overflow: hidden; min-height: 0; }
  .lp-sets .k-section-head { flex: none; }
  .lp-styles { flex: 1 0 auto; overflow: hidden; }
  .split { position: relative; flex: none; height: 1px; background: var(--cm-border); }
  .split-focus::after { content: ""; position: absolute; left: 50%; top: -2px; width: 120px; height: 4px; margin-left: -60px; border-radius: 2px; background: var(--cm-border-selected); }
  .empty-line { padding: 4px 16px 0 16px; color: var(--cm-text-secondary); }

  /* Style-layer rows */
  .stack { position: relative; }
  .chipslot { display: inline-grid; place-items: center; width: 16px; flex: none; }
  .k-item .nm { flex: 0 1 auto; min-width: 0; }
  .k-item .k-kind { flex: none; white-space: nowrap; margin-inline-start: auto; }
  .k-item .k-trail { flex: none; }
  .focusrow::before { background: var(--cm-bg-selected-secondary) !important; }
  .k-item[data-off] .chipslot { opacity: 0.4; }
  .k-item[data-dragsrc] { color: var(--cm-text-secondary); outline: 1px dashed var(--cm-border-strong); outline-offset: -1px; }
  .k-item[data-dragsrc] .chipslot { opacity: 0.4; }
  /* A covered layer: a second line saying what covers it, and Move above always shown */
  .grip { display: inline-grid; place-items: center; width: 12px; flex: none; color: var(--cm-icon-secondary); }
  .k-item.covrow { display: grid; grid-template-columns: 12px 16px minmax(0, 1fr) auto auto; column-gap: 8px; height: auto; padding-bottom: 8px; }
  .covrow > .chipslot, .covrow > .k-trail, .covrow > .grip, .covrow > .k-kind { height: 32px; display: inline-flex; align-items: center; }
  .covrow > .chipslot { justify-content: center; }
  .covrow > .nm { line-height: 32px; }
  .covline { grid-column: 3 / 6; margin-top: -8px; line-height: 16px; white-space: normal; }
  .movebtn { height: 20px; padding: 0 6px; }
  .covbox { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; margin: 4px 8px 4px 8px; padding: 8px; border-radius: 5px; background: var(--cm-bg-secondary); }
  .topn { display: flex; align-items: center; gap: 6px; padding-inline: 8px 4px; }
  .topn .k-field { height: 20px; padding: 0 6px; display: inline-flex; align-items: center; gap: 4px; }
  .topn .k-num { width: 28px; justify-content: flex-end; }
  .dropline { position: relative; height: 0; list-style: none; }
  .dropline::before { content: ""; position: absolute; left: 4px; right: 0; top: -1px; height: 2px; background: var(--cm-border-selected); }
  .dropline::after { content: ""; position: absolute; left: 0; top: -4px; width: 6px; height: 6px; border-radius: 50%; box-shadow: inset 0 0 0 2px var(--cm-border-selected); background: var(--cm-bg); }
  .dragghost { position: absolute; z-index: 40; display: flex; align-items: center; gap: 8px; height: 24px; padding: 0 12px 0 8px; border-radius: 5px; background: var(--cm-bg); box-shadow: var(--cm-elevation-300); opacity: 0.92; }

  /* Editor popovers */
  .ed-head { height: auto; min-height: 40px; padding: 8px 8px 8px 8px; align-items: flex-start; }
  .ed-head .ed-name { flex: 1 1 auto; min-width: 0; line-height: 24px; white-space: normal; }
  .ed-legend { display: flex; align-items: center; gap: 8px; min-height: 20px; }
  .ed-note { padding: 0 8px 4px 16px; color: var(--cm-text-secondary); }
  .size-marks.sm { gap: 4px 8px; flex-wrap: wrap; }
  .size-marks.sm div { white-space: nowrap; font-size: var(--k-caption-fs); line-height: var(--k-caption-lh); }
  .ro { display: inline-flex; align-items: center; gap: 4px; height: 16px; padding: 0 4px; border-radius: 5px; background: var(--cm-bg-secondary); color: var(--cm-text-secondary); font-weight: 450; }

  /* The Style stack section: precedence, the Look control, the legend switch */
  .prec { display: flex; align-items: center; gap: 6px; height: 20px; margin-top: -8px; padding: 0 8px 0 16px; color: var(--cm-text-secondary); }
  .look-l { color: var(--cm-text-secondary); font-weight: 450; margin-inline-end: 2px; }
  .look-sel { display: inline-flex; align-items: center; gap: 2px; height: 24px; padding: 0 2px 0 8px; font-weight: 450; margin-inline-end: 4px; }
  .legendrow { margin-top: 4px; }
  .lp-grow { flex: 1 1 auto; }
  /* With a selection: a row that paints it is highlighted (a bar and a tint) and says what it wins */
  .winsrow::before { background: var(--cm-bg-secondary); }
  .winsrow::after { content: ""; position: absolute; left: 0; top: 6px; bottom: 6px; width: 2px; border-radius: 1px; background: var(--cm-border-selected); z-index: 1; }
  .nochit { background: repeating-conic-gradient(var(--cm-bg-tertiary) 0 25%, var(--cm-bg) 0 50%) 0 0 / 6px 6px; box-shadow: inset 0 0 0 1px var(--cm-border-strong); }

  /* The color picker (compact-mantine ColorPickerPanel) */
  .k-popover.cp { width: 240px; }
  .cp-head { gap: 4px; padding-inline: 8px; }
  .cp-body { padding: 8px 0 0; }
  .cp-sb { position: relative; width: 208px; height: 208px; margin: 0 16px; border-radius: 5px; background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(24deg 100% 50%)); }
  .cp-reticle { position: absolute; left: 80%; top: 18%; width: 12px; height: 12px; margin: -6px; border-radius: 50%; box-shadow: 0 0 0 2px #fff, 0 0 0 3px rgba(0,0,0,.25); }
  .cp-slider { position: relative; height: 16px; margin: 8px 16px 0 44px; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--cm-border-translucent-strong); }
  .cp-hue { background: linear-gradient(90deg, red, yellow, lime, cyan, blue, magenta, red); }
  .cp-alpha { background: linear-gradient(90deg, transparent, hsl(24deg 100% 50%)), repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px; }
  .cp-slider span { position: absolute; top: 0; width: 16px; height: 16px; margin-left: -8px; border-radius: 50%; box-shadow: inset 0 0 0 4px #fff, 0 0 0 1px rgba(0,0,0,.2); }
  .cp-val { display: flex; gap: 4px; margin: 8px 8px 0 16px; }
  .cp-val .k-field { height: 24px; display: inline-flex; align-items: center; gap: 2px; padding: 0 6px; }
  .cp-fmt { width: 55px; flex: none; } .cp-hex { flex: 1 1 auto; min-width: 0; } .cp-op { width: 44px; flex: none; }
  .cp-sw { display: grid; grid-template-columns: repeat(9, 16px); gap: 8px; margin-top: 8px; padding: 8px 16px; border-top: 1px solid var(--cm-border); }
  .cp-sw .k-chit { width: 16px; height: 16px; border-radius: 3px; }
  .cp-libs { padding: 4px 0 8px; }
  .cp-libs .k-search { padding: 0 8px; }
  .cp-gh { margin-top: 4px; }
  .cp-src { padding: 0 16px; line-height: 20px; }
  .catmenu .startbadge { display: inline-block; margin-inline-start: 4px; padding: 0 4px; border-radius: 3px; font-size: var(--k-caption-fs); line-height: var(--k-caption-lh); box-shadow: inset 0 0 0 1px currentColor; vertical-align: 1px; }

  /* Chips and legend marks from the element's resolved paint (canvas-drawing.md 3) */
  .k-ramp-measure { background: linear-gradient(90deg, ${bcEnc.palette.join(", ")}); box-shadow: inset 0 0 0 1px var(--cm-border-translucent); }
  .sizechip { width: 16px; height: 12px; flex: none; }
  .dashchip { width: 16px; height: 6px; flex: none; border-radius: 1px; background: repeating-linear-gradient(90deg, var(--k-canvas-ink) 0 5px, var(--k-canvas) 5px 8px); box-shadow: 0 0 0 1px var(--k-canvas-ink); }
  .textchip { width: 16px; flex: none; font-size: 11px; line-height: 12px; font-weight: 550; text-align: center; color: var(--cm-text); }
  .ticks { position: relative; height: 16px; color: var(--cm-text-secondary); font-variant-numeric: tabular-nums; }
  .ticks span { position: absolute; top: 0; transform: translateX(-50%); }
  .ticks span:first-child { transform: none; }
  .ticks .mid::before { content: ""; position: absolute; left: 50%; top: -4px; height: 4px; border-left: 1px solid var(--cm-text-secondary); }
  .size-marks { display: flex; align-items: flex-end; gap: 6px; padding: 2px 0; }
  .size-marks div { white-space: nowrap; display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); font-variant-numeric: tabular-nums; }
  .size-marks b { display: block; border-radius: 50%; background: var(--k-node-gray); }
  .lg-gap { height: 6px; }

  /* Meanings: a statistic or step label with its one-line meaning on hover and focus */
  .mt { text-decoration: underline dotted; text-decoration-color: var(--cm-text-tertiary); text-underline-offset: 3px; cursor: help; border-radius: 3px; }
  .mt:focus-visible { outline: 2px solid var(--cm-border-selected); outline-offset: 1px; }

  /* Group comparison */
  .cmp-lead { padding: 0 8px 8px 16px; color: var(--cm-text); }
  [data-focusr] > .mt:first-child { outline: 2px solid var(--cm-border-selected); outline-offset: 1px; }
  .cmp { padding: 4px 8px 8px 16px; border-top: 1px solid var(--cm-border); }
  .cmp-name { display: flex; align-items: baseline; justify-content: space-between; height: 24px; line-height: 24px; font-weight: 550; }
  .cmp-name .k-tertiary { font-weight: 450; }
  .bp { display: block; width: 208px; height: 64px; overflow: visible; }
  .bp-box { fill: none; stroke: var(--cm-text); stroke-width: 1.25; }
  .bp-med { stroke: var(--cm-text); stroke-width: 2; }
  .bp-wh, .bp-axis, .bp-tick { stroke: var(--cm-text-secondary); stroke-width: 1; }
  .bp-tl { fill: var(--cm-text-secondary); font-size: var(--k-caption-fs); font-variant-numeric: tabular-nums; }
  .cmp-t { width: 208px; border-collapse: collapse; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .cmp-t th { font-weight: 450; color: var(--cm-text-secondary); text-align: end; height: 20px; }
  .cmp-t td { height: 20px; text-align: end; white-space: nowrap; }
  .cmp-t td:first-child, .cmp-t th:first-child { text-align: start; }
  .cmp-t td:first-child .k-chit { margin-inline-end: 3px; vertical-align: -1px; width: 8px; height: 8px; }
  .cmp-r { margin-top: 4px; line-height: 18px; }
  .cmp-enr { padding: 8px 8px 4px 16px; border-top: 1px solid var(--cm-border); }
  .cmp-copy { padding: 0 8px 8px 16px; }
  .cmp-copy .k-btn { gap: 4px; }

  /* Catalog rows: the name, then one task line */
  .catfam { list-style: none; padding: 8px 8px 0; height: 24px; line-height: 16px; color: var(--cm-text-secondary); }
  .k-item.catrow { display: grid; grid-template-columns: minmax(0, 1fr) auto; height: auto; padding-top: 4px; padding-bottom: 4px; row-gap: 0; }
  .catrow .cat-n { line-height: 20px; }
  .catrow .cat-task { grid-column: 1 / 3; line-height: 16px; color: var(--cm-text-secondary); }
  .startbadge { margin-inline-start: 4px; font-size: var(--k-caption-fs); line-height: var(--k-caption-lh); vertical-align: 1px; }
`;
function pageHtml(title, head, frames, pos, meas) {
    return `<!doctype html>
<!-- THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT screens/styles-list.gen.mjs -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>${STYLE}</style>
</head>
<body>

<div class="pagehead">
${head}
  <nav>
    ${frames.map((f, k) => `<a href="#${f.id}">${k + 1}. ${f.title}</a>`).join("\n    ")}
  </nav>
</div>

${frames.map((f) => f.render(pos, meas)).join("\n\n")}

</body>
</html>
`;
}
const heads = {
    screen: `  <h1>Styles list, editor and legend</h1>
  <p>Dr. Chen's 300-protein interaction network, styled by a stack of layers: two added by runs (betweenness, and a shortest path from TP53 to SMAD3) and two she made (degree as size, names on the top 12 by degree). A run's layer paints only what carries its result.</p>
  <p><b>New after the third study and the owner's review: the stack lives in the right panel.</b> With nothing selected, the inspector's Style stack section is the whole ordered stack, with drag handles, "top wins" and the legend's switch, and the Look control labeled in its header (frames 1 to 4, 10 to 17). With a protein selected, its Appearance section is the same stack in the same order: the layers that paint the protein are highlighted and say what they win, a layer that is covered on it says by what, and "+" adds a layer for the selection (frames 5 to 9). The color picker has Custom and Libraries tabs; Libraries holds palettes and the style layers of applied recipes (8 and 9).</p>
  <p><b>New after the fourth study:</b> the Style stack's + opens a menu with Empty layer, From a recipe or file..., and layers suggested for this graph, such as Mute categories under this scale and Shape by kind. A .graphty file of styles is a recipe too, under the same one word. A suggestion is only offered: nothing is styled until the reader picks it, and what it adds is an ordinary layer (28 and 29).</p>
  <p> Frame 18 measures the build at a laptop size; frame 19 is the left-panel placement it replaces, for comparison. 20 to 22 and 27 are dark.</p>
  <p>Kept from earlier rounds: a layer that paints nothing says which layer covers it and offers Move above (12 and 15); size by a signed column says it shows the magnitude (15); labels on the top N by a column (16); legend titles say what each channel encodes; comparing a group with the rest, descriptive only (23 to 27); the method catalog's plain task lines, now in the main menu's Algorithms (25). Colors by category and by a signed value are in <a href="colour-by-value.html">Color or size by a value</a>.</p>
  <p><b>Waiting on graphty-element</b>, drawn here but unable to ship until it lands, and tagged in the notes: ${blockedList}.</p>
  <label class="toggle"><input type="checkbox" id="annot"> Show annotations: the framework section behind each element and the compact-mantine component it is built with</label>`,
};

// ---------------------------------------------------------------- write, place, measure, write again
const out = { screen: join(here, "styles-list.html") };
const titles = { screen: "Styles list, editor and legend" };
const headOf = { screen: heads.screen };
for (const k of Object.keys(out)) writeFileSync(out[k], toShell(pageHtml(titles[k], headOf[k], pages[k], null, null))); // the current frame: kit/shell.mjs

const TYPES = { ".html": "text/html", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
    const p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, "");
    try { res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" }).end(readFileSync(join(proto, p))); } catch { res.writeHead(404).end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
process.env.FC_FONTATIONS = "1";
const { chromium } = await import(resolve(proto, "../../../node_modules/playwright/index.mjs"));
const browser = await chromium.launch();
const pw = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await pw.goto(`http://127.0.0.1:${server.address().port}/screens/styles-list.html`, { waitUntil: "networkidle" });
await pw.evaluate(() => document.fonts.ready);
const { pos, meas } = await pw.evaluate(() => {
    document.getElementById("annot").checked = true; // marks take no box while hidden
    const pos = {};
    for (const st of document.querySelectorAll(".st")) {
        const fr = st.querySelector(".st-frame").getBoundingClientRect();
        for (const el of st.querySelectorAll("[data-clamp]")) {
            const r = el.getBoundingClientRect();
            const top = Math.max(8, Math.min(Math.round(r.top - fr.top), Math.round(fr.height - r.height - Number(el.dataset.clamp))));
            const left = Math.min(Math.round(r.left - fr.left), Math.round(fr.width - r.width - 8));
            el.style.left = left + "px";
            el.style.top = top + "px";
        }
    }
    const legends = {};
    for (const st of document.querySelectorAll(".st")) {
        const lg = st.querySelector(".k-legend-card"), cv = st.querySelector(".k-canvas");
        if (lg) legends[st.id] = `${Math.round(lg.getBoundingClientRect().height)} of cap ${Math.round(cv.getBoundingClientRect().height / 3)}`;
    }
    for (const st of document.querySelectorAll(".st")) {
        const fr = st.querySelector(".st-frame").getBoundingClientRect();
        for (const el of st.querySelectorAll("[data-o]")) {
            const r = el.getBoundingClientRect();
            let left = Math.round(r.left - fr.left), top = Math.round(r.top - fr.top);
            pos[el.dataset.o] = pos[el.dataset.o] || {};
            pos[el.dataset.o] = { left, top };
            pos[`${st.id}:${el.dataset.o}`] = { left, top };
        }
    }
    const fullRows = (container, sel = "li") => {
        const c = container.getBoundingClientRect();
        return [...container.querySelectorAll(sel)].filter((li) => { const r = li.getBoundingClientRect(); return r.height > 0 && r.top >= c.top - 1 && r.bottom <= c.bottom + 1; }).length;
    };
    const B = document.querySelector("#laptop-inspector"), L = document.querySelector("#laptop-left");
    const bf = B.querySelector(".st-frame").getBoundingClientRect();
    const lg = B.querySelector(".k-legend-card").getBoundingClientRect(), tb = B.querySelector(".k-toolbar").getBoundingClientRect();
    // The shell keeps no Results section in the graph's inspector (runs live on the Results rail place).
    const resEl = B.querySelector('[data-a="results"]');
    const resTop = resEl ? Math.round(resEl.getBoundingClientRect().top - bf.top) : null;
    return {
        pos,
        meas: {
            legends,
            laptopSets: fullRows(B.querySelector(".lp-sets .k-list")),
            laptopStyles: fullRows(B.querySelector(".k-right .k-scroll"), ".stack > li"),
            laptopResults: resTop === null ? "on the rail, not in the inspector" : resTop + 40 <= bf.height ? `in view below it, ${Math.round(bf.height - resTop)} px from the bottom of the window` : "below the fold, a scroll away",
            laptopGap: Math.round(tb.left - lg.right),
            laptopBSets: fullRows(L.querySelector(".lp-sets .k-list")),
        },
    };
});
await browser.close();
server.close();
// Positions are per frame: re-key them for render.
const posOf = (f) => Object.fromEntries(Object.entries(pos).filter(([k]) => k.startsWith(`${f.id}:`)).map(([k, v]) => [k.slice(f.id.length + 1), v]));
for (const k of Object.keys(out)) {
    const frames = pages[k];
    // Render each frame with its own positions.
    const body = frames.map((f) => f.render(posOf(f), meas)).join("\n\n");
    const full = pageHtml(titles[k], headOf[k], frames, null, meas);
    const start = full.indexOf(frames[0] ? `<section class="st` : "</body>");
    const end = full.lastIndexOf("</section>") + "</section>".length;
    writeFileSync(out[k], toShell(frames.length ? full.slice(0, start) + body + full.slice(end) : full));
}
console.log("wrote screens/styles-list.html");
console.log(JSON.stringify(meas));
