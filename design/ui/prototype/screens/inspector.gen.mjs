#!/usr/bin/env node
// Builds screens/inspector.html: the inspector (interface-templates.md 8), its selection kinds and
// its degraded states. Run from design/ui/prototype/: node screens/inspector.gen.mjs
// Every number is read from kit/fixtures.json; the inspector-specific ones (hop counts, the 12 equal
// shortest paths, the DNA repair set, the two-hop selection) are computed by kit/gen-canvas.mjs into
// datasets.ppi.inspector and datasets.transactions.inspector.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toShell } from "../kit/shell.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FIX = JSON.parse(readFileSync(join(here, "../kit/fixtures.json"), "utf8"));
const fx = FIX.datasets;
// Louvain colors as screens/results-panel.py draws them: the categorical palette by community number.
const lvColor = (c) => FIX.canvas.categorical[c - 1] ?? "#BDBDBD";
const ppi = fx.ppi;
const tx = fx.transactions;
const PI = ppi.inspector;
const TI = tx.inspector;
const MOD = ppi.moduleColors;
const fmt = (n) => n.toLocaleString("en-US");
const minus = (s) => String(s).replace("-", "&minus;");
const rank = (r, of) => (r.from === r.to ? `#${r.from} of ${fmt(of)}` : `#${r.from} to #${r.to} of ${fmt(of)}`);
const R = (r) => rank(r, ppi.nodes);

// ---------- small builders ----------
const I = (name, cls = "") => `<svg class="k-i ${cls}" aria-hidden="true"><use href="../kit/icons.svg#${name}"/></svg>`;
// Accessible names (study round 1: a screen reader read raw markup for inspector rows). Every row
// and icon button carries a name in words; glyphs, chits and marks are aria-hidden.
const plain = (s) =>
    String(s).replace(/<[^>]*>/g, " ").replace(/&minus;/g, "-").replace(/&middot;/g, ",").replace(/&quot;/g, "'").replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ").trim();
const speakRank = (s) => plain(s).replace(/#(\d+) to #(\d+) of/, "rank $1 to $2 (tied) of").replace(/#(\d+) of/, "rank $1 of");
const aria = (...parts) => `aria-label="${parts.map((p) => speakRank(p)).filter(Boolean).join(", ")}"`;
const btn = (icon, label, extra = "") => `<span class="k-icon-btn" role="button" aria-label="${label}" title="${label}" ${extra}>${I(icon)}</span>`;
// The Neighbors split button (study round 2): labeled, and its main part always does one thing,
// Filter to neighbors at the hop count and direction last used, at every graph size. Select
// neighbors and the hop counts are in the caret's menu.
const nbSplit = (extra = "") =>
    `<span class="ins-split ins-nb" ${extra}><span class="ins-nbmain" role="button" aria-label="Neighbors: filter to neighbors, 1 hop" title="Filter to neighbors, 1 hop  Shift+N">${I("waypoints", "k-i-sm")}Neighbors</span><span class="ins-caret" role="button" aria-haspopup="menu" aria-label="Neighbors options" title="Neighbors options">${I("chevron-down", "k-i-sm")}</span></span>`;
// Path to... on one node (study round 2): a labeled line under the type row, the one-node twin of
// the two-node Paths between... line. It opens a pick mode for the end node.
const pathToLine = (open = false) =>
    `<div class="ins-l3"><span class="k-btn k-btn-secondary k-btn-block ins-paths" role="button"${open ? ' aria-pressed="true" data-open' : ""} aria-label="Path to another node">${I("route")}Path to...</span></div>`;
// Notes beside the inspector (x 906) stack in one column in reading order, so they never overlap.
const ann = (x, y, w, text) =>
    x === 906 ? `<div class="k-annot-note ins-rc">${text}</div>` : `<div class="k-annot-note ins-ann" style="left:${x}px;top:${y}px;max-width:${w}px">${text}</div>`;
const section = (head, body, { empty = false, trail = "" } = {}) =>
    `<section class="k-section"${empty ? " data-empty" : ""}><div class="k-section-head">${head}<span class="k-grow"></span>${trail}</div>${body}</section>`;
const chev = I("chevron-right", "k-i-sm k-secondary");
// ActionRow: an optional label column, the value, one route or action.
// A row whose trailing slot is its own button keeps the two targets side by side: the label and
// value are one button, the trailing icon button its sibling (a button may not hold a button).
const act = (label, value, trail = chev, attrs = "") => {
    const main = `${label ? `<span class="ins-lab">${label}</span>` : ""}<span class="k-grow k-ellipsis">${value}</span>`;
    return /k-icon-btn|k-btn/.test(trail)
        ? `<div class="k-row ins-act" ${attrs}><span class="ins-main" role="button" ${aria(label, value)}>${main}</span>${trail}</div>`
        : `<div class="k-row ins-act" role="button" ${aria(label, value)} ${attrs}>${main}${trail}</div>`;
};
// DataRow, Attributes form: the rank is a second line under the value. The row is one button that
// opens the attribute's menu (Style by this first); hovered or focused, it shows Style by this as
// its trailing action. { hover: true } draws that state.
const styleBy = (name) => `<span class="k-icon-btn ins-sb" role="button" aria-label="Style by ${plain(name)}" title="Style by this">${I("palette")}</span>`;
// { from } is the attribute's provenance (round 3: "riskScore 62 -- scale of what? Who computed
// it?"): every attribute says where its value came from, a file column or graphty's own count,
// on the second line at the left, beside the rank at the right.
const data = (name, value, second = "", lead = "", { hover = false, menu = true, from = "" } = {}) => {
    const tail = (from ? `<span class="ins-prov${second ? "" : " ins-prov-wide"}">${from}</span>` : "") + (second ? `<span class="ins-rank k-num">${second}</span>` : "");
    const label = aria(name, value, second, from);
    return hover && menu
        ? `<div class="ins-dr" data-hover><span class="ins-main" role="button" aria-haspopup="menu" ${label}><span class="k-name">${lead}${name}</span><span class="k-value k-num">${value}</span></span>${styleBy(name)}${tail}</div>`
        : `<div class="ins-dr"${menu ? ' role="button" aria-haspopup="menu"' : ' role="group"'} ${label}${hover ? " data-hover" : ""}><span class="k-name">${lead}${name}</span><span class="k-value k-num">${value}</span>${hover ? styleBy(name) : ""}${tail}</div>`;
};
// Provenance words (content-design: say where a number came from, in the reader's words).
const PPI_FILE = "ppi-core-300.graphml";
const fromFile = (f) => `from ${f}`;
const COUNTED = "counted by graphty";
// The style stack, one list in both states (round 3, owner review): with nothing selected it is the
// Style stack section; with a selection it is Appearance, the same rows, the ones that paint the
// selection highlighted and marked with the property each wins. Top wins.
// layer: { mark, name, value, wins, legend, off }
const stackRow = ({ mark, name, value = "", wins = "", off = false }, { grip = true, hover = false } = {}) =>
    `<li class="k-item ins-stk" role="treeitem" aria-label="${plain(name)}${wins ? `, paints this selection's ${wins}` : ""}${off ? ", off" : ""}"${wins ? " data-wins" : ""}${hover ? " data-hover" : ""}${off ? " data-off" : ""}>${grip ? `<svg class="k-i k-i-sm ins-grip" aria-hidden="true"><use href="../kit/icons.svg#grip-vertical"/></svg>` : ""}${mark}<span class="k-ellipsis k-grow">${name}</span>${value ? `<span class="k-secondary k-num ins-sv">${value}</span>` : ""}${wins ? `<span class="ins-wins">${wins}</span>` : ""}</li>`;
const stackList = (layers, opts = {}) => `<ul class="k-list ins-stack" role="tree">${layers.map((l) => stackRow(l, opts) + (l.legend ?? "")).join("")}</ul>`;
const topWins = `<span class="k-count">top wins</span>`;
const appearance = (layers, { own = "", add = "Add a layer for this selection" } = {}) =>
    section(`Appearance ${topWins}`, (own ? `<div class="ins-own">${own}</div>` : "") + stackList(layers), { trail: add ? btn("plus", add) : "" });
// Results with a selection: the selection's value and rank per run; a row opens that result.
const resultsSection = (rows, trail = "") => section("Results", rows, { trail });
// A Memberships row of a selection: the set and how much of the selection it holds.
const mship = (set, text) =>
    `<div class="ins-dr" role="button" ${aria(set, text)}><span class="k-name">${I("group", "k-i-sm")}${set}</span><span class="k-value k-secondary">${text}</span></div>`;
// DataRow, Members form: the rank is a RankChip after the value.
const member = (name, value, r, lead = "") =>
    `<div class="ins-mr" role="button" ${aria(name, value, r)}><span class="k-name">${lead}${name}</span><span class="k-value k-num">${value}</span>${r ? `<span class="ins-rankchip k-num" aria-hidden="true">${r}</span>` : ""}</div>`;
const more = (text, icon = chev) => `<div class="k-row ins-more" role="button" aria-label="${text}"><span>${text}</span>${icon}</div>`;
// The inspector has no Export section (framework-changes, "an object's own Export section in the inspector is withdrawn"): export has one dialog with three ways in.
const exportSection = "";
// Notes, on every inspector (study round 1: the first note had no obvious place to go). A labeled
// row, never a bare "+"; it opens the Note editor beside what is selected.
const notesSection = section("Notes", `<div class="k-row ins-add" role="button" aria-label="Add note...">${I("plus", "k-i-sm")}<span>Add note...</span></div>`);
const chit = (c) => `<span class="k-chit" style="background:${c}"></span>`;
const sizeGlyph = `<svg class="k-sizechip" viewBox="0 0 16 12"><circle cx="3" cy="8" r="2" fill="#808080"/><circle cx="10" cy="6" r="5" fill="#808080"/></svg>`;
const ramp = (bg, w = 16) => `<span class="k-ramp" style="width:${w}px;background:${bg}"></span>`;
const FC_RAMP = "linear-gradient(90deg,#67001f,#d6604d,#fddbc7,#f7f7f7,#d1e5f0,#4393c3,#053061)";
const target = btn("crosshair", "Select painted");
// A channel bound to an attribute on one element (interface-specification 2.3): legend, then a
// VariablePill field spanning the whole row, because there is no trailing slot.
const boundRow = (channel, layer, mark, attr) =>
    `<div class="k-fieldrow" role="group" aria-label="${channel} by ${plain(attr)}, from ${layer}"><span class="k-legend">${channel} <span class="k-tertiary">-- ${layer}</span></span><div class="k-fields"><span class="k-field k-span3"><span class="k-pill">${mark}${attr}</span></span></div></div>`;
// A read-only routed style row (3.1): Figma's style-row look, no field border.
const styleRow = (mark, value, layer) =>
    `<div class="ins-style"><span class="ins-main" role="button" ${aria(value, "from " + layer)}>${mark}<span class="k-num ins-sv">${value}</span><span class="k-grow k-ellipsis k-secondary">${layer}</span></span>${target}</div>`;
// The object's own row for a channel its layer does not write: the channel's header with "+".
const chanHead = (channel, what) => `<div class="ins-chan"><span>${channel}</span><span class="k-grow"></span>${btn("plus", `Add ${what}`)}</div>`;
const tip = (x, y, text, kbd = "") =>
    `<div class="k-tooltip ins-tip" style="left:${x}px;top:${y}px">${text}${kbd ? ` <span class="k-kbd">${kbd}</span>` : ""}</div>`;

function typeRow({ glyph, name, nameClass = "k-id", kind, extra = "", extra1 = "", verbs, line3 = "" }) {
    return `<div class="ins-type" role="group" aria-label="${plain(name)}, ${plain(kind)}">
  <div class="ins-l1">${I(glyph)}<span class="k-name ${nameClass}">${name}</span>${extra1}${btn("ellipsis", "More actions")}</div>
  <div class="ins-l2"><span class="k-secondary k-ellipsis">${kind}</span>${extra}<span class="k-grow"></span>${verbs}</div>${line3}
</div>`;
}

// The rail after round 3: main menu, Graph, Data, Notes, the Assistant. Results left the rail for
// the inspector; styles left the Graph panel for the inspector (framework-changes, "After round 3").
const rail = `<nav class="k-rail" aria-label="Main">
  <div class="k-rail-btn" aria-label="Main menu"><span class="k-rail-pill">${I("menu")}</span></div><div class="k-rail-sep"></div>
  <div class="k-rail-btn" aria-pressed="true"><span class="k-rail-pill">${I("network")}</span>Graph</div>
  <div class="k-rail-btn"><span class="k-rail-pill">${I("database")}</span>Data</div>
  <div class="k-rail-btn"><span class="k-rail-pill">${I("sticky-note")}</span>Notes</div>
  <div class="k-rail-btn k-asst-off" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div>
</nav>`;
const privacy = `<a class="k-privacy">Nothing has been sent from this project</a>`;

const toolbar = `<div class="k-toolbar-dock"><div class="k-toolbar" role="toolbar">
  <span class="k-tool" aria-pressed="true">${I("mouse-pointer-2", "k-i-lg")}</span><span class="k-tool-caret">${I("chevron-down", "k-i-sm")}</span>
  <span class="k-tool">${I("route", "k-i-lg")}</span>
  <span class="k-toolbar-sep"></span><span class="k-tool">${I("zap", "k-i-lg")}</span>
</div></div><span class="k-help">${I("circle-help")}</span>`;

// No avatar (graphty has no accounts) and no Export button (export starts from the project-name
// menu, the Data panel and the table): the header keeps only the zoom menu.
const header = `<div class="k-header1"><span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">100%${I("chevron-down", "k-i-sm")}</span></div>`;

// ---------- the protein network ----------
const conic = `conic-gradient(${MOD["Ribosome"]} 0 25%,${MOD["Proteasome"]} 0 50%,${MOD["Complex I"]} 0 75%,${MOD["DNA repair"]} 0)`;
const DR = PI.dnaRepair;
// The filter chip is a button with a caret (study round 2); it names the step's result.
const chipHtml = (text) => `<span class="k-chip" role="button" aria-haspopup="dialog">${I("funnel", "k-i-sm")}<span class="k-num">${text}</span>${I("chevron-down", "k-i-sm")}</span>`;
// The Graph panel after round 3: graphs, the sets and paths kept on them, and views. The style
// stack is the inspector's now. "fixed" on screen reads "frozen" (content design, after round 3).
function ppiPanel({ sel = "", keptPath = false, chip = "Full graph" } = {}) {
    const s = (id) => (sel === id ? ' aria-selected="true"' : "");
    return `<aside class="k-panel" aria-label="Graph">
  <div class="k-panel-head"><div class="k-title-line"><span class="k-project">Human protein interactions</span>${I("chevron-down", "k-i-sm k-secondary")}</div>
    ${privacy}${chipHtml(chip)}</div>
  <div class="k-scroll">
    ${section("Graphs", `<ul class="k-list"><li class="k-item"${sel ? "" : ' aria-selected="true"'}>${I("network")}<span class="k-grow k-ellipsis">Interactions</span><span class="k-trail k-num">${ppi.nodes} nodes</span></li></ul>`, { trail: btn("plus", "Add graph") })}
    ${section("Sets and paths", `<ul class="k-list">
      <li class="k-item"${s("set")}>${I("group")}<span class="k-ellipsis">DNA repair</span><span class="k-kind">rule</span><span class="k-trail"><span class="k-paint-slot"></span><span class="k-num">${DR.members}</span></span></li>
      <li class="k-item">${I("group")}<span class="k-ellipsis">TP53 partners</span><span class="k-kind">frozen</span><span class="k-trail"><span class="k-paint-slot"></span><span class="k-num">${ppi.tp53Slice.nodes}</span></span></li>
      ${keptPath ? `<li class="k-item"${s("path")}>${I("waypoints")}<span class="k-ellipsis">TP53 to SMAD3</span><span class="k-kind">path</span><span class="k-trail"><span class="k-paint-slot"></span><span class="k-num">${PI.path.hops + 1}</span></span></li>` : ""}
    </ul>`, { trail: btn("plus", "Create set") })}
    <section class="k-section" data-collapsed><div class="k-section-head">Views <span class="k-count k-num">0</span></div></section>
  </div>
</aside>`;
}

const moduleLegend = `<div class="k-legend-card">
  <div class="k-lg-title">Module color <span class="k-secondary">module</span></div>
  ${["Ribosome", "Proteasome", "Complex I", "Spliceosome", "DNA repair"].map((m) => `<div class="k-lg-row">${chit(MOD[m])}${m}<span class="k-value">${ppi.attributes[1].values[m]}</span></div>`).join("")}
  <div class="k-lg-row k-secondary">4 more</div>
</div>`;
const fcLegend = `<div class="k-legend-card" style="width:224px"><div class="k-lg-title">log2FoldChange color <span class="k-secondary">log2FoldChange</span></div>
  <span class="k-ramp k-ramp-wide" style="margin-top:4px;background:${FC_RAMP}"></span>
  <div class="k-lg-row k-secondary"><span class="k-num">${minus(ppi.encodings.foldChange.domain[0])}</span><span class="k-grow"></span><span class="k-num">${ppi.encodings.foldChange.domain[1]}</span></div></div>`;

function stage(drawing, alt, overlayLight = "", overlayDark = "", extra = "") {
    const svg = (body, cls) => (body ? `<svg class="${cls}" viewBox="0 0 1200 800" aria-hidden="true">${body}</svg>` : "");
    const src = drawing.includes("/") ? drawing : `../kit/canvas/${drawing}`;
    return `<div class="k-stage"><img class="k-light-only" src="${src}-light.svg" alt="${alt}"><img class="k-dark-only" src="${src}-dark.svg" alt="${alt}">${svg(overlayLight, "k-light-only")}${svg(overlayDark, "k-dark-only")}${extra}</div>`;
}

// Canvas mark colors (kit/gen-canvas.mjs THEMES): the two tones of every state mark.
const TONE = { light: { outer: "#1A1A1A", inner: "#FFFFFF", canvas: "#F5F5F5" }, dark: { outer: "#FFFFFF", inner: "#1A1A1A", canvas: "#1E1E1E" } };
const circ = (x, y, r, c, w) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
const memberRing = (x, y, r, t) => circ(x, y, r + 0.5, TONE[t].inner, 1) + circ(x, y, r + 1.5, TONE[t].outer, 1);
const selRing = (x, y, r, t) => circ(x, y, r + 1, TONE[t].inner, 2) + circ(x, y, r + 3, TONE[t].outer, 2);
const dot = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
// A node label redrawn over an overlay: 12 px, a halo in the canvas color (canvas-drawing labels).
const INK = { light: "#1A1A1A", dark: "#F0F0F0" };
const label = (name, t) => { const [x, y, r] = AT[name]; return `<text x="${x + r + 4}" y="${y + 4}" font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="12" fill="${INK[t]}" stroke="${TONE[t].canvas}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${name}</text>`; };
const casing = (pts, t) => {
    const d = pts.map(([x, y], k) => `${k ? "L" : "M"}${x} ${y}`).join(" ");
    return `<path d="${d}" fill="none" stroke="${TONE[t].outer}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${TONE[t].inner}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
};

// Nodes on the module drawing: [x, y, radius] in drawing pixels (radius 3 + 1.4 sqrt(degree)).
const AT = { TP53: [472.9, 416.2, 10.9], BRCA1: [432.8, 458.2, 8], WRN: [449.5, 449.8, 8] };
const DRPOS = [["TP53",472.9,416.2,10.9],["MDM2",471.9,472.7,6.4],["BRCA1",432.8,458.2,8],["BRCA2",474.1,444.2,6.1],["ATM",415.1,464.6,7],["ATR",409.8,495.4,7.4],["CHEK1",456,492.8,7],["CHEK2",420.8,478.3,6.7],["RAD51",441.3,437.7,6.1],["RAD50",439.5,492.6,7.4],["MRE11",466.7,457.5,6.1],["NBN",395.3,490.8,6.4],["XRCC1",441.6,484.5,6.7],["XRCC5",459.9,441,7.2],["XRCC6",415.8,507.1,6.4],["PARP1",405.1,484.1,6.4],["MLH1",446.3,508,7],["MSH2",478.4,461.9,7],["MSH6",509.5,435.2,5.4],["PALB2",430,476.1,6.1],["FANCD2",448.6,475,7.8],["BLM",427.8,438,6.7],["WRN",449.5,449.8,8],["H2AX",402.8,438,6.4],["MDC1",466.3,506.3,6.1],["53BP1",465.1,476.1,6.7],["RPA1",486.3,472.1,6.7],["RPA2",448.2,464.6,7.6],["PCNA",408,458.2,7.8],["LIG4",389.5,510.4,6.1]];
const [TX, TY, TR] = AT.TP53;
const DRC = MOD["DNA repair"];
// The module drawing has TP53's selection ring drawn in; a state that does not select TP53 paints
// the ring out in the canvas color and redraws the node.
const unselectTP53 = (t) => circ(TX, TY, TR + 2.5, TONE[t].canvas, 3.4) + dot(TX, TY, TR, DRC);
const setOverlay = (t) => unselectTP53(t) + DRPOS.map(([, x, y, r]) => memberRing(x, y, r, t)).join("") + label("TP53", t) + label("BRCA1", t);
const edgeOverlay = (t) => unselectTP53(t) + casing([[TX, TY], [AT.BRCA1[0], AT.BRCA1[1]]], t) + dot(AT.BRCA1[0], AT.BRCA1[1], 8, DRC) + dot(TX, TY, TR, DRC) + label("TP53", t) + label("BRCA1", t);
const mixedOverlay = (t) => casing([[TX, TY], [AT.BRCA1[0], AT.BRCA1[1]]], t) + dot(AT.BRCA1[0], AT.BRCA1[1], 8, DRC) + selRing(AT.BRCA1[0], AT.BRCA1[1], 8, t) + dot(TX, TY, TR, DRC) + selRing(TX, TY, TR, t) + label("TP53", t) + label("BRCA1", t);
const S3N = ppi.encodings.path.nodes[3];
const S3AT = [S3N.x * 12, S3N.y * 8, 3 + 1.4 * Math.sqrt(S3N.degree)];
AT.SMAD3 = S3AT;
const twoOverlay = (t) => selRing(S3AT[0], S3AT[1], S3AT[2], t) + label("TP53", t) + label("SMAD3", t);
const trioOverlay = (t) => ["BRCA1", "WRN"].map((g) => dot(AT[g][0], AT[g][1], 8, DRC) + selRing(AT[g][0], AT[g][1], 8, t)).join("") + label("BRCA1", t);

// The path TP53, MSH2, UBB, SMAD3 on the fold-change drawing (fixtures ppi.encodings.path), with
// its end badges and travel chevrons (canvas-drawing 6).
const path = ppi.encodings.path;
const radiusOf = (deg) => ppi.encodings.sizeByDegree.bins.find((b) => deg >= b.from && deg <= b.to).radius;
const PP = path.nodes.map((n) => [n.x * 12, n.y * 8, radiusOf(n.degree)]);
function endBadge([x, y, r], t, kind) {
    const bx = x - r - 9, by = y - r - 9;
    const glyph = kind === "start"
        ? `<path d="M${bx - 2.5} ${by - 3.5} L${bx + 3.5} ${by} L${bx - 2.5} ${by + 3.5} Z" fill="${TONE[t].inner}"/>`
        : `<rect x="${bx - 3}" y="${by - 3}" width="6" height="6" fill="${TONE[t].inner}"/>`;
    return `<circle cx="${bx}" cy="${by}" r="7.5" fill="${TONE[t].outer}" stroke="${TONE[t].inner}" stroke-width="1.5"/>${glyph}`;
}
function chevron([x1, y1], [x2, y2], t) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, a = Math.atan2(y2 - y1, x2 - x1);
    const p = (dx, dy) => `${(mx + dx * Math.cos(a) - dy * Math.sin(a)).toFixed(1)} ${(my + dx * Math.sin(a) + dy * Math.cos(a)).toFixed(1)}`;
    return `<path d="M${p(-4, -5)} L${p(3, 0)} L${p(-4, 5)}" fill="none" stroke="${TONE[t].outer}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const pathOverlay = (t) =>
    casing(PP.map(([x, y]) => [x, y]), t) +
    PP.slice(1).map((p, k) => chevron(PP[k], p, t)).join("") +
    PP.map(([x, y, r]) => memberRing(x, y, r, t)).join("") +
    endBadge(PP[0], t, "start") + endBadge(PP[PP.length - 1], t, "end");

// ---------- the inspectors ----------
const tp = PI.tp53;
const oneNodeVerbs = (hover = "") => nbSplit(hover) + btn("pin", "Pin");
// Style layers on the protein graph, top first. A layer that paints the selection carries the
// property it wins there.
const L = {
    module: (value = "", wins = "") => ({ mark: `<span class="k-chit" style="background:${conic}"></span>`, name: "Module color", value, wins }),
    fc: (value = "", wins = "") => ({ mark: ramp(FC_RAMP), name: "log2FoldChange color", value, wins }),
    louvain: (value = "", wins = "") => ({ mark: `<span class="k-stack">${[4, 3, 2, 1].map((c) => chit(lvColor(c))).join("")}</span>`, name: "Louvain color", value, wins }),
    degree: (value = "", wins = "") => ({ mark: sizeGlyph, name: "Size: degree", value, wins }),
    base: (value = "", wins = "") => ({ mark: chit("#808080"), name: "Base style", value, wins }),
};
const tpStack = [L.module("DNA repair", "color"), L.degree(tp.degree, "size"), L.base("", "shape")];
// Runs on the protein graph, newest first: Louvain (the groups run), PageRank, Betweenness.
const LVR = ppi.louvain;
const resultsHead = `Results <span class="k-count">full graph</span>`;
const tpResults = (hover = "") =>
    data("Louvain", `Community ${LVR.community.TP53}`, `${LVR.groups[LVR.community.TP53 - 1].size} nodes`) +
    data("PageRank", tp.pagerank.toFixed(5), R(tp.pagerankRank), "", { hover: hover === "pagerank" }) +
    data("Betweenness", tp.betweenness.toFixed(4), R(tp.betweennessRank), "", { hover: hover === "betweenness" });
function oneNodeInspector({ splitAttrs = "", memberships = "rest", attrs = null, conn = null, state = "", name = "TP53", kind = "Node", verbs = null, props = null, appearance: app = null, results = null, resultsTitle = resultsHead, hoverAttr = "", pathOpen = false } = {}) {
    const mem =
        memberships === "open"
            ? act("In", "2 sets", I("chevron-down", "k-i-sm k-secondary")) +
              `<div class="ins-dr ins-in" role="button" aria-label="DNA repair, rule set, ${DR.members} nodes"><span class="k-name">${I("group", "k-i-sm")}DNA repair</span><span class="k-value k-secondary">rule, ${DR.members}</span></div>` +
              `<div class="ins-dr ins-in" role="button" aria-label="TP53 partners, frozen set, ${ppi.tp53Slice.nodes} nodes"><span class="k-name">${I("group", "k-i-sm")}TP53 partners</span><span class="k-value k-secondary">frozen, ${ppi.tp53Slice.nodes}</span></div>`
            : memberships === "rest"
              ? act("In", "2 sets")
              : memberships;
    return `${header}
${typeRow({ glyph: "circle-dot", name, kind, verbs: verbs ?? oneNodeVerbs(splitAttrs), line3: pathToLine(pathOpen) })}
${state}
<div class="k-scroll">
  <section class="k-section ins-props">${props ?? act("Position", "Free")}</section>
  ${section("Attributes",
      attrs ??
      data("module", tp.module, "", chit(DRC) + " ", { from: fromFile(PPI_FILE) }) +
      data("degree", tp.degree, R(tp.degreeRank), sizeGlyph + " ", { from: COUNTED }) +
      data("log2FoldChange", minus(tp.log2FoldChange.toFixed(2)), "", "", { from: fromFile(PPI_FILE) }))}
  ${section(resultsTitle, results ?? tpResults(hoverAttr))}
  ${section("Connections", conn ?? act("", `${tp.degree} neighbors`))}
  ${section("Memberships", mem)}
  ${app ?? appearance(tpStack)}
  ${notesSection}
  ${exportSection}
</div>`;
}

const edgeInspector = `${header}
${typeRow({ glyph: "spline", name: `<a>TP53</a> -- <a>BRCA1</a>`, kind: "Edge", verbs: nbSplit() + btn("funnel", "Filter to") + btn("group", "Create set") })}
<div class="k-scroll">
  <section class="k-section ins-props">${act("Endpoints", "TP53, BRCA1")}</section>
  ${section("Attributes", data("confidence", PI.edge.confidence.toFixed(2), "", "", { from: fromFile(PPI_FILE) + "; no run has used it" }))}
  ${section("Memberships", act("In", '<span class="k-secondary">no set</span>', ""))}
  ${appearance([L.module(), L.degree(), L.base("808080", "color, width")])}
  ${notesSection}
  ${exportSection}
</div>`;

const trio = PI.trio;
// A selection's value per run: the range over the selected nodes, from the table dock's rows.
const TDR = Object.fromEntries(FIX.scenarios.tableDock.ppi.rows.map(([id, , degree, betweenness, pagerank]) => [id, { degree, betweenness, pagerank }]));
const rangeOf = (ids, key, d) => { const v = ids.map((i) => TDR[i][key]); return `${Math.min(...v).toFixed(d)} to ${Math.max(...v).toFixed(d)}`; };
const selResults = (ids) =>
    data("Louvain", `${new Set(ids.map((i) => LVR.community[i])).size === 1 ? `Community ${LVR.community[ids[0]]}` : `${new Set(ids.map((i) => LVR.community[i])).size} communities`}`) +
    data("PageRank", rangeOf(ids, "pagerank", 5)) +
    data("Betweenness", rangeOf(ids, "betweenness", 4));
const trioInspector = `${header}
${typeRow({ glyph: "scan", name: "3 selected", nameClass: "k-num", kind: "Nodes", verbs: nbSplit() + btn("funnel", "Filter to") + btn("group", "Create set") })}
<div class="k-scroll">
  ${section("Statistics", `<div class="k-metrics"><div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big">3</span></div><div class="k-metric"><span class="k-secondary">edges inside</span><span class="k-big">${trio.edgesAmong}</span></div></div>` +
      data("degree", `${Math.min(...trio.degrees)} to ${Math.max(...trio.degrees)}`, "", "", { from: COUNTED }), { trail: btn("ellipsis", "Statistics menu") })}
  ${section("Attributes",
      data("module", trio.sharedModule, "", chit(DRC) + " ", { from: fromFile(PPI_FILE) }) +
      act("", `${trio.differ.length} differ <span class="k-secondary">${trio.differ.join(", ")}</span>`, I("table", "k-i-sm k-secondary")))}
  ${resultsSection(selResults(trio.ids))}
  ${section("Memberships",
      mship("DNA repair", `holds 3 of 3 nodes`) +
      mship("TP53 partners", `holds 3 of 3 nodes`))}
  ${appearance([L.module("DNA repair", "color"), L.degree(`${Math.min(...trio.degrees)} to ${Math.max(...trio.degrees)}`, "size"), L.base("", "shape")])}
  ${notesSection}
  ${exportSection}
</div>`;

// Exactly two nodes: Paths between... (study round 1) arms the Path tool with both ends filled in.
// Its bar is the one screens/sets-and-paths.html draws: From, To, Run; Scope and Weight under them.
const S3 = path.nodes.find((n) => n.id === "SMAD3");
const pathsBtn = (open = false) =>
    `<div class="ins-l3"><span class="k-btn k-btn-secondary k-btn-block ins-paths" role="button"${open ? ' aria-pressed="true" data-open' : ""} aria-label="Paths between TP53 and SMAD3">${I("route")}Paths between...</span></div>`;
const twoIds = ["TP53", "SMAD3"];
const twoInspector = (open = false) => `${header}
${typeRow({ glyph: "scan", name: "2 selected", nameClass: "k-num", kind: "Nodes", verbs: nbSplit() + btn("funnel", "Filter to") + btn("group", "Create set"), line3: pathsBtn(open) })}
<div class="k-scroll">
  ${section("Statistics", `<div class="k-metrics"><div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big">2</span></div><div class="k-metric"><span class="k-secondary">edges between</span><span class="k-big">0</span></div></div>` +
      data("degree", `${S3.degree} to ${tp.degree}`, "", "", { from: COUNTED }), { trail: btn("ellipsis", "Statistics menu") })}
  ${section("Attributes", act("", `3 differ <span class="k-secondary">module, degree, log2FoldChange</span>`, I("table", "k-i-sm k-secondary")))}
  ${resultsSection(selResults(twoIds))}
  ${section("Memberships", mship("DNA repair", "holds 1 of 2 nodes") + mship("TP53 partners", "holds 1 of 2 nodes"))}
  ${appearance([L.module("2 values", "color"), L.degree(`${S3.degree} to ${tp.degree}`, "size"), L.base("", "shape")])}
  ${notesSection}
  ${exportSection}
</div>`;
// The Path tool's bar, as sets-and-paths draws it, armed from Paths between... with both ends.
// A run's weight is its own record ("none, hops counted"); the graph states only that each run asks.
const confState = "none, hops counted";
const graphWeight = "confidence: asked by each run";
const pathBar = ({ to = `<span class="k-field k-id" style="width:140px">SMAD3</span>`, run = true, state = "" } = {}) => `<div class="ins-pbar" role="group" aria-label="Path tool">
  <div class="ins-pbar-row"><span class="ins-plbl">From</span><span class="k-field k-id" style="width:140px">TP53</span><span class="ins-plbl">To</span>${to}<span class="k-btn"${run ? "" : ' aria-disabled="true"'} role="button">Run</span></div>
  <div class="ins-pbar-row"><span class="ins-plbl">Scope</span><span class="k-field" style="width:110px">Full graph${I("chevron-down", "k-i-sm k-caret")}</span><span class="ins-plbl">Weight</span><span class="k-field" style="width:162px">${confState}${I("chevron-down", "k-i-sm k-caret")}</span></div>${state}
</div>`;
const barDock = (bar, pathTool = true) => `<div class="k-toolbar-dock">${bar}<div class="k-toolbar" role="toolbar">
  <span class="k-tool"${pathTool ? "" : ' aria-pressed="true"'} aria-label="Select">${I("mouse-pointer-2", "k-i-lg")}</span><span class="k-tool-caret" aria-label="More tools">${I("chevron-down", "k-i-sm")}</span>
  <span class="k-tool"${pathTool ? ' aria-pressed="true"' : ""} aria-label="Path">${I("route", "k-i-lg")}</span>
  <span class="k-toolbar-sep"></span><span class="k-tool" aria-label="Quick actions">${I("zap", "k-i-lg")}</span>
</div></div><span class="k-help">${I("circle-help")}</span>`;
// Show as style layer, from a Results row (study round 1's Style by this, on a result).
const styleMenu = `<div class="k-menu ins-menu" role="menu" aria-label="Betweenness" style="left:958px;top:514px;width:236px">
  <div class="k-menu-label">Betweenness</div>
  <div class="k-menu-item" role="menuitem" data-hover data-described><span class="k-check-col">${I("palette", "k-i-sm")}</span><span>Show as style layer<span class="k-menu-desc">Adds a layer on top of the stack that colors every protein by betweenness. Its editor opens.</span></span></div>
  <div class="k-menu-item" role="menuitem"><span class="k-check-col">${I("sigma", "k-i-sm")}</span>Open the result</div>
  <div class="k-menu-item" role="menuitem"><span class="k-check-col">${I("table", "k-i-sm")}</span>Show in table, sorted</div>
  <div class="k-menu-item" role="menuitem"><span class="k-check-col">${I("copy", "k-i-sm")}</span>Copy value</div>
</div>`;

const members3 = DR.byDegree.slice(0, 3);
// A kept object's Appearance: the whole stack, its members' layers highlighted, and "+" adding a
// layer scoped to it.
const setInspector = (statsBody = null) => `${header}
${typeRow({ glyph: "group", name: "DNA repair", nameClass: "", kind: `${DR.members} nodes, Rule set`, verbs: btn("scan", "Select members") + btn("funnel", "Filter to") + btn("snowflake", "Freeze") })}
<div class="k-scroll">
  <section class="k-section ins-props">
    ${act("Layout", "Force-directed", btn("play", "Run layout"))}
    ${act("Rule", "module = DNA repair")}
    ${act("Created from", "Same value as TP53")}
  </section>
  ${section("Statistics", statsBody ?? `<div class="k-metrics">
      <div class="k-metric"><span class="k-secondary">edges inside</span><span class="k-big">${DR.edgesInside}</span></div>
      <div class="k-metric"><span class="k-secondary">edges out</span><span class="k-big">${DR.edgesOut}</span></div>
      <div class="k-metric"><span class="k-secondary">neighbors out</span><span class="k-big">${DR.neighborsOut}</span></div>
      <div class="k-metric"><span class="k-secondary">average degree</span><span class="k-big">${DR.averageDegree}</span></div></div>`,
      { trail: btn("ellipsis", "Statistics menu") })}
  ${section('Members <span class="k-count">by degree</span>',
      members3.map((m) => member(m.id, m.degree, R(m.rank))).join("") + more(`${DR.members - 3} more members`))}
  ${resultsSection(act("", `3 runs <span class="k-secondary">a value per member, in the table</span>`, I("table", "k-i-sm k-secondary")))}
  ${appearance([L.module("DNA repair", "color"), L.degree(`${DR.degreeRange[0]} to ${DR.degreeRange[1]}`, "size"), L.base("", "shape")], { add: "Add a layer for DNA repair" })}
  ${notesSection}
  ${section("Used by", act("", '<span class="k-secondary">Nothing yet</span>', ""))}
  ${exportSection}
</div>`;

const mixedInspector = `${header}
${typeRow({ glyph: "scan", name: "3 selected", nameClass: "k-num", kind: "Nodes and edges", verbs: btn("funnel", "Filter to") + btn("group", "Create set") })}
<div class="k-scroll">
  ${section("Statistics", `<div class="k-metrics">
      <div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big">2</span></div>
      <div class="k-metric"><span class="k-secondary">edges</span><span class="k-big">1</span></div></div>` +
      data("degree, nodes", `${PI.brca1.degree} to ${tp.degree}`, "", "", { from: COUNTED }) + data("module, nodes", "DNA repair", "", "", { from: fromFile(PPI_FILE) }),
      { trail: btn("ellipsis", "Statistics menu") })}
  ${section("Attributes", act("Nodes", "3 attributes", I("table", "k-i-sm k-secondary")) + act("Edges", "1 attribute", I("table", "k-i-sm k-secondary")))}
  ${resultsSection(selResults(["TP53", "BRCA1"]))}
  ${section("Memberships",
      mship("DNA repair", `holds 2 of 2 nodes`) +
      mship("TP53 partners", `holds 2 of 2 nodes`))}
  ${appearance([L.module("DNA repair", "color"), L.degree(`${PI.brca1.degree} to ${tp.degree}`, "size"), L.base("2 kinds", "shape, edge")])}
  ${notesSection}
  ${exportSection}
</div>`;

const fc = (id) => minus(path.nodes.find((n) => n.id === id).log2FoldChange.toFixed(2));
const hop = (c) => `<div class="ins-hop"><span class="ins-hop-line"></span><span class="k-tertiary">edge confidence</span><span class="k-grow"></span><span class="k-num k-tertiary">${c}</span></div>`;
const PC = PI.path.confidences;
const hopsSection = section('Members <span class="k-count">walk order</span>',
    path.nodes.map((n, k) => member(n.id, fc(n.id), "", I("circle-dot", "k-i-sm") + " ") + (k < PC.length ? hop(PC[k].toFixed(2)) : "")).join("") +
    `<div class="k-prose ins-note">Node values are log2FoldChange. Edge confidence is shown, not used.</div>`);
const fcRange = [Math.min(...path.nodes.map((n) => n.log2FoldChange)), Math.max(...path.nodes.map((n) => n.log2FoldChange))];
const degRange = [Math.min(...path.nodes.map((n) => n.degree)), Math.max(...path.nodes.map((n) => n.degree))];
const pathStack = [L.fc(`${minus(fcRange[0].toFixed(2))} to ${fcRange[1].toFixed(2)}`, "color"), L.degree(`${degRange[0]} to ${degRange[1]}`, "size"), L.base("", "shape")];
// The found path, as screens/sets-and-paths.html draws it: "(unweighted)" beside the name, how it
// was found as data rows (query, scope, weight and what the weight did, ties), then its endpoints
// and its members in walk order. The keep verb is Keep path (content design, after round 3).
const keepPath = (focus = false) => `<span class="k-btn k-btn-secondary ins-keep" role="button"${focus ? " data-focus-ring" : ""} aria-label="Keep path">${I("bookmark-plus", "k-i-sm")}Keep path</span>`;
const pathInspector = `${header}
${typeRow({
    glyph: "waypoints", name: `Found path <span class="k-secondary ins-unw">(unweighted)</span>`, nameClass: "",
    kind: `${PI.path.hops} hops`,
    verbs: keepPath(true) + btn("scan", "Select members") + btn("funnel", "Filter to"),
})}
<div class="k-scroll">
  ${section("Created from",
      data("Query", "Shortest path", "", "", { menu: false }) +
      data("Scope", `Full graph, ${ppi.nodes}`, "", "", { menu: false }) +
      data("Weight", confState, "", "", { menu: true }) +
      `<div class="k-prose ins-note ins-fact">Paths ignore confidence: hops were counted.</div>` +
      `<div class="ins-dr" role="group" aria-label="Ties, 1 of ${PI.path.equalPaths} as short"><span class="k-name">Ties</span><span class="k-value"><span class="ins-stepper">${btn("chevron-left", "Previous path")}<span class="k-num">1 of ${PI.path.equalPaths} as short</span>${btn("chevron-right", "Next path")}</span></span></div>`)}
  ${section("Endpoints",
      `<div class="k-row k-id ins-end"><span class="k-badge">start</span>TP53</div><div class="k-row k-id ins-end"><span class="k-badge">end</span>SMAD3</div>`)}
  ${hopsSection}
  ${appearance(pathStack, { own: `<span class="k-btn k-btn-secondary k-btn-block" role="button">Keep path</span>`, add: "" })}
  ${notesSection}
  ${exportSection}
</div>`;

const keptPathInspector = `${header}
${typeRow({ glyph: "waypoints", name: "TP53 to SMAD3", nameClass: "", kind: `Simple path, ${PI.path.hops} hops`, verbs: btn("scan", "Select members") + btn("funnel", "Filter to") + btn("group", "Create set") })}
<div class="k-scroll">
  <section class="k-section ins-props">
    ${act("Created from", "Shortest path, hops counted")}
    ${act("Layout", "Force-directed", btn("play", "Run layout"))}
  </section>
  ${section("Endpoints",
      `<div class="k-row k-id ins-end"><span class="k-badge">start</span>TP53</div><div class="k-row k-id ins-end"><span class="k-badge">end</span>SMAD3</div>`)}
  ${hopsSection}
  ${appearance(pathStack, { add: "Add a layer for TP53 to SMAD3" })}
  ${notesSection}
  ${section("Used by", act("", '<span class="k-secondary">Nothing yet</span>', ""))}
  ${exportSection}
</div>`;

// ---------- the transaction network, past the selection cap ----------
const TW = TI.twoHop;
const hullPts = (() => {
    const cx = TW.hull.reduce((a, p) => a + p[0], 0) / TW.hull.length, cy = TW.hull.reduce((a, p) => a + p[1], 0) / TW.hull.length;
    return TW.hull.map(([x, y]) => {
        const dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy);
        return [Math.round(x + (dx / L) * 12), Math.round(y + (dy / L) * 12)];
    });
})();
const hullOverlay = (t) => {
    const d = "M" + hullPts.map((p) => p.join(" ")).join(" L") + " Z";
    return `<path d="${d}" fill="none" stroke="${TONE[t].outer}" stroke-width="6" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${TONE[t].inner}" stroke-width="2" stroke-linejoin="round"/>`;
};
const top = hullPts.reduce((a, p) => (p[1] < a[1] ? p : a));
const badge = `<span class="ins-badge k-num" style="left:${(top[0] / 12).toFixed(1)}%;top:${(top[1] / 8).toFixed(1)}%">${fmt(TW.elements)} selected</span>`;
// The transfers' style stack: Flagged (a rule layer on flagged == true, painting only the accounts
// that carry the flag), then Base style. `on` false draws Flagged turned off, as the cap state's
// unstyled drawing shows it.
const FLAG = "#D55E00";
const TXSTACK = (inSel = false, on = false) => [
    { mark: chit(FLAG), name: "Flagged", value: on ? "true" : "off", wins: on && inSel ? "color" : "", off: !on },
    { mark: chit("#808080"), name: "Base style", value: "", wins: inSel ? (on ? "size, shape" : "color, size, shape") : "" },
];
const txPanel = `<aside class="k-panel" aria-label="Graph">
  <div class="k-panel-head"><div class="k-title-line"><span class="k-project">Transfers, March 2026</span>${I("chevron-down", "k-i-sm k-secondary")}</div>
    ${privacy}${chipHtml("Full graph")}</div>
  <div class="k-scroll">
    ${section("Graphs", `<ul class="k-list"><li class="k-item" aria-selected="true">${I("network")}<span class="k-grow k-ellipsis">${tx.graphName}</span><span class="k-trail k-num">${fmt(tx.nodes)} nodes</span></li></ul>`, { trail: btn("plus", "Add graph") })}
    ${section("Sets and paths", `<ul class="k-list"><li class="k-item">${I("group")}<span class="k-ellipsis">Flagged</span><span class="k-kind">rule</span><span class="k-trail k-num">${tx.flaggedAccounts.length}</span></li><li class="k-item">${I("group")}<span class="k-ellipsis">Mule ring</span><span class="k-kind">frozen</span><span class="k-trail k-num">${TW.ring}</span></li></ul>`, { trail: btn("plus", "Create set") })}
    <section class="k-section" data-collapsed><div class="k-section-head">Views <span class="k-count k-num">0</span></div></section>
  </div>
</aside>`;
const txDock = `<section class="k-dock ins-dock" aria-label="Table">
  <div class="k-dock-tabs"><span class="k-tab" aria-selected="true">Nodes</span><span class="k-tab">Edges</span><span class="k-grow"></span>${btn("search", "Find in table")}${btn("ellipsis", "Table menu")}</div>
  <div class="k-scope">Selected: ${fmt(TW.nodes)} nodes. Sorted by degree.<span class="k-grow"></span><span class="k-secondary k-num">Rows 1 to 7 of ${fmt(TW.nodes)}</span></div>
  <div class="k-table-wrap ins-tw"><table class="k-table">
    <thead><tr><th>id (account)</th><th>kind</th><th>country</th><th class="k-n">total degree</th><th class="k-n">riskScore</th><th>flagged</th></tr></thead>
    <tbody>${TW.topRows.map((r) => `<tr aria-selected="true"><td class="k-id">${r.id}</td><td>${r.kind}</td><td>${r.country}</td><td class="k-n">${fmt(r.degree)}</td><td class="k-n">${r.riskScore}</td><td>${r.flagged}</td></tr>`).join("")}</tbody>
  </table><span class="ins-thumb" style="height:${Math.max(6, Math.round((8 / TW.nodes) * 100))}%"></span></div>
</section>`;
const capInspector = `${header}
${typeRow({ glyph: "scan", name: `${fmt(TW.elements)} selected`, nameClass: "k-num", kind: "Nodes and edges", verbs: btn("funnel", "Filter to") + btn("group", "Create set") })}
<div class="k-scroll">
  ${section("Statistics", `<div class="k-metrics">
      <div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big">${fmt(TW.nodes)}</span></div>
      <div class="k-metric"><span class="k-secondary">edges</span><span class="k-big">${fmt(TW.edges)}</span></div></div>` +
      `<div class="ins-compound"><span class="k-name">kind, nodes</span><span class="ins-segs k-num">${Object.entries(TW.byKind).map(([k, v]) => `<span>${k} <b>${fmt(v)}</b></span>`).join("")}</span></div>`,
      { trail: btn("ellipsis", "Statistics menu") })}
  ${section("Attributes", act("Nodes", "6 attributes", I("table", "k-i-sm k-secondary")) + act("Edges", "2 attributes", I("table", "k-i-sm k-secondary")))}
  ${resultsSection(act("PageRank", `${fmt(TW.nodes)} values`, I("table", "k-i-sm k-secondary")))}
  ${section("Memberships", mship("Mule ring", `holds ${TW.ringInside} of ${fmt(TW.nodes)} nodes`))}
  ${appearance(TXSTACK(true))}
  ${notesSection}
  ${exportSection}
</div>`;

// ---------- the grow menu and the main part's tooltip ----------
const NW = PI.neighborhood.nodesWithin;
const growMenu = `<div class="k-menu ins-menu" role="menu" aria-label="Hops from TP53" style="left:958px;top:150px;width:236px">
  <div class="k-menu-label">Hops from TP53</div>
  <div class="k-menu-item" role="menuitemradio" aria-checked="true" data-hover><span class="k-check-col">&#10003;</span>1 hop<span class="k-shortcut k-num">${NW[0]} nodes</span></div>
  <div class="k-menu-item" role="menuitemradio" aria-checked="false"><span class="k-check-col"></span>2 hops<span class="k-shortcut k-num">${NW[1]} nodes</span></div>
  <div class="k-menu-item" role="menuitemradio" aria-checked="false"><span class="k-check-col"></span>3 hops<span class="k-shortcut k-num">${NW[2]} nodes</span></div>
  <div class="k-menu-sep"></div>
  <div class="k-menu-item" role="menuitem"><span class="k-check-col">${I("funnel", "k-i-sm")}</span>Filter to neighbors<span class="k-shortcut k-num">${NW[0]} nodes</span></div>
  <div class="k-menu-item" role="menuitem"><span class="k-check-col">${I("scan", "k-i-sm")}</span>Select neighbors<span class="k-shortcut k-num">${NW[0]} nodes</span></div>
</div>`;
const growTip = tip(912, 122, `Filter to neighbors, 1 hop: ${NW[0]} nodes. Ctrl+Z undoes it.`, "Shift+N");

// ---------- after Neighbors: the protein graph filtered to TP53 and its neighbors ----------
const SL = ppi.tp53Slice;
const slModules = Object.entries(SL.neighborsOf.TP53.reduce((a, x) => ((a[x.module] = (a[x.module] ?? 0) + 1), a), { [tp.module]: 1 }))
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
const sliceLegend = `<div class="k-legend-card">
  <div class="k-lg-title">Module color <span class="k-secondary">module</span></div>
  ${slModules.slice(0, 4).map(([m, n]) => `<div class="k-lg-row">${chit(MOD[m] ?? "#BDBDBD")}${m}<span class="k-value k-num">${n}</span></div>`).join("")}
  <div class="k-lg-row k-secondary">${slModules.length - 4} more</div>
</div>`;
const staleRow = (name, value) =>
    `<div class="ins-dr" role="group" aria-label="${name}, ${value}, out of date"><span class="k-name">${name}</span><span class="k-value k-num">${value}</span><span class="ins-rank ins-mark">Out of date &middot; <a>Re-run</a></span></div>`;
const filteredInspector = oneNodeInspector({
    attrs: data("module", tp.module, "", chit(DRC) + " ", { from: fromFile(PPI_FILE) }) +
        data("degree", tp.degree, `#1 of ${SL.nodes}`, sizeGlyph + " ", { from: "counted inside the filter" }) +
        data("log2FoldChange", minus(tp.log2FoldChange.toFixed(2)), "", "", { from: fromFile(PPI_FILE) }),
    results: staleRow("Louvain", `Community ${LVR.community.TP53}`) + staleRow("PageRank", tp.pagerank.toFixed(5)) + staleRow("Betweenness", tp.betweenness.toFixed(4)),
    conn: act("", `${tp.degree} neighbors`),
});
const undoToast = `<div class="k-toast">Filter to neighbors, 1 hop: ${SL.nodes} nodes<span class="k-toast-action">Undo</span></div>`;
const sliceCanvas = `<div class="k-canvas">${stage("ppi-tp53", `TP53 and its ${SL.nodes - 1} neighbors, ${SL.edges} interactions, colored by module; TP53 selected`)}${sliceLegend}<div class="k-toolbar-dock"><div style="margin-bottom:8px">${undoToast}</div><div class="k-toolbar" role="toolbar">
  <span class="k-tool" aria-pressed="true">${I("mouse-pointer-2", "k-i-lg")}</span><span class="k-tool-caret">${I("chevron-down", "k-i-sm")}</span>
  <span class="k-tool">${I("route", "k-i-lg")}</span>
  <span class="k-toolbar-sep"></span><span class="k-tool">${I("zap", "k-i-lg")}</span>
</div></div><span class="k-help">${I("circle-help")}</span></div>`;

// ---------- Path to...: picking the end node ----------
// The Path tool's bar (the one sets-and-paths draws) with From filled and To waiting for a pick.
const pickBar = pathBar({ to: `<span class="k-field" data-placeholder data-focus style="width:140px">Pick the end node</span>`, run: false });
const pickCanvas = `<div class="k-canvas">${stage("ppi-modules", "300 proteins colored by module and sized by degree; TP53 selected")}${moduleLegend}${barDock(pickBar)}<div class="k-tooltip ins-pickhint" style="left:50%;top:12px;transform:translateX(-50%)">Pick the end node: click, or find it by name (Ctrl+K). Esc cancels.</div></div>`;

// ---------- a group: Community 4 of the finished Louvain run ----------
const LV = ppi.louvain;
const C4 = LV.groups[3];
const C4C = lvColor(C4.community);
// Every protein's measures (the table dock's scenario rows), ranked over the 300 with ties as ranges.
const TD = FIX.scenarios.tableDock.ppi.rows.map(([id, module, degree, betweenness, pagerank]) => ({ id, module, degree, betweenness, pagerank }));
const rankOf = (key, v) => ({ from: 1 + TD.filter((r) => r[key] > v).length, to: TD.filter((r) => r[key] >= v).length });
const byId = Object.fromEntries(TD.map((r) => [r.id, r]));
const c4Rows = C4.members.map((m) => byId[m]).sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id));
// Node positions on the Louvain drawing (screens/img/results-panel-louvain-*.svg, written by
// screens/results-panel.py): its 300 filled circles are the proteins in louvain.community order.
const LVPOS = (() => {
    const svg = readFileSync(join(here, "img/results-panel-louvain-light.svg"), "utf8");
    const circles = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="#[0-9A-Fa-f]{6}"\/>/g)].map((m) => m.slice(1, 4).map(Number));
    const names = Object.keys(LV.community);
    if (circles.length !== names.length) throw new Error(`Louvain drawing has ${circles.length} nodes, expected ${names.length}`);
    return Object.fromEntries(names.map((n, k) => [n, circles[k]]));
})();
const lvLabel = (name, t) => { const [x, y, r] = LVPOS[name]; return `<text x="${x + r + 4}" y="${y + 4}" font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="12" fill="${INK[t]}" stroke="${TONE[t].canvas}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${name}</text>`; };
const groupOverlay = (t) => C4.members.map((m) => memberRing(...LVPOS[m], t)).join("") + lvLabel(C4.hub, t) + lvLabel("PRPF8", t);
const rowOverlay = (t) => selRing(...LVPOS.PRPF8, t) + lvLabel("PRPF8", t);
const lvLegend = (selected = 0) => `<div class="k-legend-card" style="width:224px"><div class="k-lg-title">Louvain color <span class="k-secondary">community</span></div>
  ${LV.groups.slice(0, 4).map((g) => `<div class="k-lg-row${g.community === selected ? " ins-lgsel" : ""}"${g.community === selected ? ' aria-selected="true"' : ""}>${chit(lvColor(g.community))}Community ${g.community}<span class="k-value k-num">${g.size}</span></div>`).join("")}
  <div class="k-lg-row k-secondary">${LV.groups.length - 4} more</div></div>`;
const lvCanvas = (overlay, dock = "") => `<div class="k-canvas">${stage("img/results-panel-louvain", "300 proteins colored by Louvain community, sized by degree", overlay("light"), overlay("dark"))}${lvLegend(overlay === groupOverlay ? C4.community : 0)}${toolbar}</div>${dock}`;
const signed = (v) => (v > 0 ? "+" : v < 0 ? "&minus;" : "") + Math.abs(v).toFixed(2);
const measureBy = `<span class="ins-by" role="button" aria-haspopup="menu" aria-label="Members by degree">by degree${I("chevron-down", "k-i-sm")}</span>`;
const groupInspector = `${header}
${typeRow({
    glyph: "group", name: `Community ${C4.community}`, nameClass: "",
    kind: "Community",
    extra1: `<span class="ins-stepper">${btn("chevron-left", "Previous community")}<span class="k-num">${C4.community} of ${LV.communities}</span>${btn("chevron-right", "Next community")}</span>`,
    verbs: btn("bookmark-plus", "Keep as set") + btn("scan", "Select members") + btn("funnel", "Filter to"),
})}
<div class="k-scroll">
  <section class="k-section ins-props">${act("Created from", "Louvain run, confidence used as similarity")}</section>
  ${section("Attributes",
      data("size", `${C4.size} nodes`) +
      data("edges inside", C4.edgesInside) +
      data("edges out", C4.edgesOut) +
      data("log2FoldChange", signed(C4.meanLog2FoldChange), `mean; rest of graph ${signed(C4.meanLog2FoldChangeRest)}`) +
      more("3 more attributes"))}
  ${section(`Members ${measureBy}`,
      c4Rows.slice(0, 3).map((r) => member(r.id, r.degree, R(rankOf("degree", r.degree)))).join("") + more(`${C4.size - 3} more members`),
      { trail: btn("copy", "Copy ids") })}
  ${appearance([L.louvain(`Community ${C4.community}`, "color"), L.degree(`${Math.min(...c4Rows.map((r) => r.degree))} to ${c4Rows[0].degree}`, "size"), L.base("", "shape")], { own: `<span class="k-btn k-btn-secondary k-btn-block" role="button">Keep as set</span>`, add: "" })}
  ${notesSection}
  ${exportSection}
</div>`;
// The table after "33 more members": the group's rows, one of them selected.
const P8 = byId.PRPF8;
const c4Dock = `<section class="k-dock ins-dock" aria-label="Table">
  <div class="k-dock-tabs"><span class="k-tab" aria-selected="true">Nodes</span><span class="k-tab">Edges</span><span class="k-tab">Communities: Louvain</span><span class="k-grow"></span>${btn("search", "Find in table")}${btn("ellipsis", "Table menu")}</div>
  <div class="k-scope">Community ${C4.community}: ${C4.size} nodes, 1 selected. Sorted by degree.<span class="k-grow"></span><a class="ins-scopelink">Show filtered graph</a></div>
  <div class="k-table-wrap ins-tw"><table class="k-table">
    <thead><tr><th>id (gene symbol)</th><th>community</th><th>module</th><th class="k-n">degree</th><th class="k-n">betweenness</th><th class="k-n">pagerank</th></tr></thead>
    <tbody>${c4Rows.slice(0, 7).map((r) => `<tr${r.id === "PRPF8" ? ' aria-selected="true"' : ""}><td class="k-id">${r.id}</td><td>${chit(C4C)} Community ${C4.community}</td><td>${r.module}</td><td class="k-n">${r.degree}</td><td class="k-n">${r.betweenness.toFixed(4)}</td><td class="k-n">${r.pagerank.toFixed(5)}</td></tr>`).join("")}</tbody>
  </table><span class="ins-thumb" style="height:${Math.round((7 / C4.size) * 100)}%"></span></div>
</section>`;
const rowInspector = oneNodeInspector({
    name: "PRPF8",
    attrs: data("module", P8.module, "", chit(MOD[P8.module] ?? "#BDBDBD") + " ", { from: fromFile(PPI_FILE) }) + data("degree", P8.degree, R(rankOf("degree", P8.degree)), sizeGlyph + " ", { from: COUNTED }) + more("1 more attribute"),
    results: data("Louvain", `Community ${C4.community}`, `${C4.size} nodes`, chit(C4C) + " ") + data("PageRank", P8.pagerank.toFixed(5), R(rankOf("pagerank", P8.pagerank))) + data("Betweenness", P8.betweenness.toFixed(4), R(rankOf("betweenness", P8.betweenness))),
    conn: act("", `${P8.degree} neighbors`),
    memberships: `<div class="ins-dr" role="button" aria-label="Community ${C4.community}, Louvain community, ${C4.size} nodes"><span class="k-name">${I("group", "k-i-sm")}Community ${C4.community}</span><span class="k-value k-secondary">Louvain, ${C4.size}</span></div>`,
    appearance: appearance([L.louvain(`Community ${C4.community}`, "color"), L.degree(P8.degree, "size"), L.base("", "shape")]),
});

// ---------- the flagged account: provenance on every attribute, money in and out ----------
const FA = tx.flaggedAccounts[0];
const SI = FIX.scenarios.inspector;
const ACC = tx.accountsFile;
const txAttr = (n) => tx.attributes.find((a) => a.name === n);
const usd = (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const txRank = (() => {
    const T = FIX.scenarios.tableDock, pr = T.pagerankRaw, i = T.rows.findIndex((r) => r[0] === FA.id), v = pr[i];
    return { from: 1 + pr.filter((x) => x > v).length, to: pr.filter((x) => x >= v).length, community: T.rows[i][6] };
})();
const alertWhen = FA.alertTime.replace("T", " ").replace(/:00Z$/, " UTC");
// A long text value: its own line under the name, wrapping, never truncated.
const longData = (name, value, from) =>
    `<div class="ins-dr ins-long" role="button" aria-haspopup="menu" ${aria(name, value, from)}><span class="k-name">${name}</span><span class="ins-longv">${value}</span><span class="ins-prov ins-prov-wide">${from}</span></div>`;
// Totals over the amount column: weighted in- and out-strength, proposed to graphty-element.
const moneyRows = (s) =>
    `<div class="ins-compound ins-proposed" role="group" aria-label="Money in ${usd(s.inAmount)} over ${s.inTransfers} transfers, Money out ${usd(s.outAmount)} over ${s.outTransfers} transfers; proposed"><span class="k-name">Totals <span class="k-annot-tag">proposed</span></span><span class="ins-segs k-num"><span>Money in <b>${usd(s.inAmount)}</b></span><span>Money out <b>${usd(s.outAmount)}</b></span></span><span class="ins-prov">summed by graphty from ${tx.file}</span></div>`;
const dirRows = (inN, outN, s) =>
    `<div class="ins-compound"><span class="k-name">Neighbors</span><span class="ins-segs k-num"><span>In <b>${fmt(s.inAccounts)}</b></span><span>Out <b>${fmt(s.outAccounts)}</b></span><span>All <b>${fmt(s.inAccounts + s.outAccounts)}</b></span></span></div>` +
    `<div class="ins-compound"><span class="k-name">Transfers</span><span class="ins-segs k-num"><span>In <b>${fmt(inN)}</b></span><span>Out <b>${fmt(outN)}</b></span><span>All <b>${fmt(inN + outN)}</b></span></span></div>` +
    moneyRows(s);
const flaggedInspector = oneNodeInspector({
    name: FA.id,
    attrs:
        data("flagged", String(FA.flagged), "", chit(FLAG) + " ", { from: fromFile(ACC) }) +
        longData("alertRule", FA.alertRule, fromFile(ACC)) +
        data("alertTime", alertWhen, "", "", { from: fromFile(ACC) }) +
        data("riskScore", FA.riskScore, "", "", { from: txAttr("riskScore").sourceNote }) +
        data("kind", FA.kind, "", "", { from: fromFile(ACC) }) +
        data("country", FA.country, "", "", { from: fromFile(ACC) }) +
        more("Show fewer", I("chevron-up", "k-i-sm k-secondary")),
    results: data("Louvain", `Community ${txRank.community}`) + data("PageRank", FA.pagerank.toFixed(6), rank(txRank, tx.nodes)),
    conn: dirRows(SI.flagged.inTransfers, SI.flagged.outTransfers, SI.flagged),
    memberships: act("In", "2 sets"),
    appearance: appearance(TXSTACK(true, true)),
});
const flagOverlay = (t) => {
    const at = (a) => [a.x * 12, a.y * 8];
    const dots = tx.anchors.flagged.map((a) => dot(...at(a), 4, FLAG)).join("");
    const [x, y] = at(tx.anchors.flagged[0]);
    return dots + selRing(x, y, 4, t) + `<text x="${x + 10}" y="${y + 4}" font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="12" fill="${INK[t]}" stroke="${TONE[t].canvas}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${FA.id}</text>`;
};
const flagLegend = `<div class="k-legend-card"><div class="k-lg-title">Flagged <span class="k-secondary">flagged</span></div>
  <div class="k-lg-row">${chit(FLAG)}true<span class="k-value k-num">${txAttr("flagged").values.true}</span></div>
  <div class="k-lg-row">${chit("#808080")}false, shown as density<span class="k-value k-num">${fmt(txAttr("flagged").values.false)}</span></div></div>`;
const flagCanvas = `<div class="k-canvas">${stage("transactions-density", `${fmt(tx.nodes)} accounts shown as density, the ${tx.flaggedAccounts.length} flagged accounts drawn over it, ${FA.id} selected`, flagOverlay("light"), flagOverlay("dark"))}${flagLegend}${toolbar}</div>`;
const txPanelSel = txPanel;

// ---------- a result as its own inspector kind: Betweenness ----------
const BE = ppi.encodings.betweenness;
const hist = (bins) => { const m = Math.max(...bins); return `<div class="k-hist ins-hist" role="img" aria-label="Distribution of betweenness over ${ppi.nodes} proteins, on a log scale">${bins.map((b) => `<i style="height:${Math.max(4, Math.round((b / m) * 100))}%"></i>`).join("")}</div>`; };
const resultInspector = `${header}
${typeRow({
    glyph: "sigma", name: "Betweenness", nameClass: "", kind: "Result",
    verbs: btn("refresh-cw", "Re-run") + btn("table", "Show in table, sorted"),
    line3: `<div class="ins-l3 ins-l3two"><span class="k-btn k-btn-secondary k-btn-block" role="button">${I("git-compare-arrows", "k-i-sm")}Compare with another run...</span><span class="k-btn k-btn-secondary k-btn-block" role="button">${I("palette", "k-i-sm")}Show as style layer</span></div>`,
})}
<div class="ins-state-line ins-ok" role="status">${I("circle-check", "k-i-sm")}<span>Finished. Current: the graph has not changed since it ran.</span></div>
<div class="k-scroll">
  ${section("Run",
      data("Scope", `Full graph, ${ppi.nodes}`, "", "", { menu: false }) +
      data("Weight", confState, "", "", { menu: true }) +
      `<div class="k-prose ins-note ins-fact">Shortest paths counted hops; confidence was not used.</div>` +
      data("Normalized", "yes", "", "", { menu: false }))}
  ${section('Values <span class="k-count">log scale</span>',
      hist(BE.histogram12Transformed) +
      `<div class="ins-axis k-num k-secondary"><span>0</span><span class="k-grow"></span><span>${BE.domain[1]}</span></div>` +
      data("median", BE.median.toFixed(4), "", "", { menu: false }) + data("zero", `${BE.zeros} proteins`, "", "", { menu: false }))}
  ${section('Highest <span class="k-count">of 300</span>',
      ppi.topByBetweenness.slice(0, 3).map((n, k) => member(n.id, n.betweenness.toFixed(4), `#${k + 1}`)).join("") + more(`${ppi.nodes - 3} more, in the table`))}
  ${section("Runs", act("", `1 run <span class="k-secondary">this one, on the full graph</span>`, ""))}
  ${notesSection}
</div>`;

// ---------- nothing selected: Overview, Style stack, Results ----------
const FR = ppi.frame;
const legendRows = (rows, n) => rows.slice(0, n).map((r) => `<li class="k-item ins-lgrow" data-level="2" role="treeitem" aria-label="${r.label}, ${r.count}">${chit(r.color)}<span class="k-ellipsis k-grow">${r.label}</span><span class="k-num k-secondary">${r.count}</span></li>`).join("") +
    `<li class="k-item ins-lgrow ins-lgmore" data-level="2" role="treeitem"><span class="k-ellipsis k-grow">${rows.length - n + 1} more</span></li>`;
const restStack = [
    { ...L.module(), legend: legendRows(FR.legend.rows, 3) },
    { ...L.degree(`${FR.sizeMarks[0].degree} to ${FR.sizeMarks[FR.sizeMarks.length - 1].degree}`), legend: "" },
    L.base(),
];
const lookRow = `<div class="k-fieldrow ins-look"><span class="k-legend">Look</span><div class="k-fields"><span class="k-field k-span">Default${I("chevron-down", "k-i-sm k-caret")}</span></div></div>`;
const runRow = (glyph, name, sum, extra = "") =>
    `<div class="k-row ins-run" role="button" aria-label="${plain(name)}, ${plain(sum)}${extra ? ", " + plain(extra) : ""}">${I(glyph, "k-i-sm")}<span class="ins-runtxt"><span class="k-strong">${name}</span><span class="k-secondary">${sum}</span></span>${extra ? `<span class="ins-runmark">${extra}</span>` : ""}${chev}</div>`;
const restResults = (strip = "") => section(`Results <span class="k-count">newest first</span>`,
    strip +
    runRow("group", "Louvain", `${LVR.communities} communities, confidence used as similarity`, stale ? "Out of date" : "") +
    runRow("sigma", "PageRank", `full graph, unweighted`, stale ? "Out of date" : "") +
    runRow("sigma", "Betweenness", "full graph, hops counted", stale ? "Out of date" : ""),
    { trail: btn("plus", "Run...") });
let stale = false;
const restInspector = ({ chip = false } = {}) => {
    stale = chip;
    const strip = chip ? `<div class="ins-strip" role="status">${I("triangle-alert", "k-i-sm")}<span class="k-grow">3 results are out of date: a filter step was added after they ran.</span><span class="k-btn k-btn-secondary" role="button">Re-run all</span></div>` : "";
    const out = `${header}
${typeRow({ glyph: "network", name: "Interactions", nameClass: "", kind: "Graph", verbs: "" })}
<div class="k-scroll">
  ${section("Overview",
      act("", "Overview: General", `<span class="k-btn k-btn-ghost ins-chg" role="button">Change overview...</span>`) +
      `<div class="k-metrics"><div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big">${chip ? `${SL.nodes} of ${ppi.nodes}` : ppi.nodes}</span></div><div class="k-metric"><span class="k-secondary">edges</span><span class="k-big">${chip ? `${SL.edges} of ${fmt(ppi.edges)}` : fmt(ppi.edges)}</span></div></div>` +
      (chip ? `<div class="k-prose ins-note ins-fact">Of the filtered graph: TP53 and neighbors.</div>` : data("density", FR.density, "", "", { menu: false }) + data("components", FR.components, "", "", { menu: false })) +
      data("Edges", "undirected", "", "", { menu: false }) + data("Weight", graphWeight, "", "", { menu: false }) + act("Attributes", `${FR.attributes} attributes`, I("table", "k-i-sm k-secondary")) +
      act("Layout", "Force-directed", btn("play", "Run layout")),
      { trail: btn("ellipsis", "Overview menu") })}
  ${section(`Style stack ${topWins}`, stackList(restStack) + lookRow, { trail: btn("plus", "Add a style layer") })}
  ${restResults(strip)}
  ${notesSection}
  ${exportSection}
</div>`;
    stale = false;
    return out;
};

// ---------- the states ----------
const frame = (panel, main, inspector, extra = "") => {
    const rc = extra.match(/<div class="k-annot-note ins-rc">[\s\S]*?<\/div>/g) ?? [];
    const rest = rc.reduce((e, n) => e.replace(n, ""), extra);
    const col = rc.length ? `<div class="ins-ann ins-anncol">${rc.join("")}</div>` : "";
    return `<div class="ins-screen" data-kit-frame><div class="k-app">${rail}${panel}<main class="k-main">${main}</main><aside class="k-right ins-right" aria-label="Inspector">${inspector}</aside></div>${rest}${col}</div>`;
};
const ppiCanvas = (overlay = null, drawing = "ppi-modules") =>
    `<div class="k-canvas">${stage(drawing, "300 proteins colored by module and sized by degree", overlay ? overlay("light") : "", overlay ? overlay("dark") : "")}${moduleLegend}${toolbar}</div>`;
const fcCanvas = `<div class="k-canvas">${stage("ppi-foldchange-degree", "300 proteins colored by log2 fold change, sized by degree; the path TP53, MSH2, UBB, SMAD3 marked, with its start and end", pathOverlay("light"), pathOverlay("dark"))}${fcLegend}${toolbar}</div>`;

// ---------- degraded states, as inspector crops ----------
const skel = (w) => `<span class="ins-skel" style="width:${w}px"></span>`;
const crop = (id, title, sub, column) =>
    `<figure class="ins-crop" id="${id}"><figcaption><b>${title}</b><span class="k-secondary">${sub}</span></figcaption><aside class="k-right ins-col" aria-label="Inspector">${column}</aside></figure>`;
const smad3 = path.nodes.find((n) => n.id === "SMAD3");
const seed = TI.seed;
const skelRow = (name, w) => `<div class="ins-dr"><span class="k-name">${name}</span><span class="k-value">${skel(w)}</span></div>`;
const staleRes = (name, value) =>
    `<div class="ins-dr" role="group" aria-label="${name}, ${value}, out of date"><span class="k-name">${name}</span><span class="k-value k-num">${value}</span><span class="ins-rank ins-mark">Out of date &middot; <a>Re-run</a></span></div>`;
const crops = [
    crop("c-open", "Memberships opened", "The node's one Memberships row, opened in place: the two sets that hold TP53.", oneNodeInspector({ memberships: "open" })),
    crop("c-loading", "Loading", "Just after the file opened: the counts the element is still computing read &quot;not yet measured&quot;; results still running are skeleton rows.",
        oneNodeInspector({
            results: skelRow("PageRank", 56) + skelRow("Betweenness", 48),
            conn: act("", '<span class="k-secondary">Neighbors not yet measured</span>', ""),
            memberships: act("In", '<span class="k-secondary">not yet measured</span>', ""),
        })),
    crop("c-error", "Error, inside the failing section", "The set's Statistics could not be read; the section says why and offers its one verb. The rest of the inspector is unaffected.",
        setInspector(`<div class="ins-err">${I("triangle-alert", "k-i-sm")}<span>Statistics could not be read: the graph changed while they were counted.</span></div><div class="ins-own"><span class="k-btn k-btn-secondary" role="button">Re-run</span></div>`)),
    crop("c-stale", "Not current", "A filter step was added after Betweenness ran, so its value in Results carries the freshness mark and the glossary's verb.",
        oneNodeInspector({
            results: data("Louvain", `Community ${LVR.community.TP53}`, `${LVR.groups[LVR.community.TP53 - 1].size} nodes`) + data("PageRank", tp.pagerank.toFixed(5), R(tp.pagerankRank)) + staleRes("Betweenness", tp.betweenness.toFixed(4)),
        })),
    crop("c-rest-stale", "Nothing selected, after a filter step", "The graph's inspector once the filter TP53 and neighbors is on: the Overview names its scope, and Results leads with one strip saying which results are out of date and why, with one verb for all of them.",
        restInspector({ chip: true })),
    crop("c-partial", "Partial: selected, but filtered out", "Found with Find while the step &quot;TP53 and neighbors&quot; is on. SMAD3 is three hops out, so it is not drawn and not counted.",
        oneNodeInspector({
            name: "SMAD3",
            state: `<div class="ins-state-line">${I("eye-off", "k-i-sm")}<span>Not in the filtered graph: left out by TP53 and neighbors. Not drawn; not in any count.</span></div><div class="ins-own"><span class="k-btn k-btn-secondary k-btn-block" role="button">Add selection to step</span></div>`,
            attrs: data("module", smad3.module, "", chit(MOD[smad3.module]) + " ", { from: fromFile(PPI_FILE) }) + data("degree", smad3.degree, '<span class="ins-mark">outside scope</span>', sizeGlyph + " ", { from: COUNTED }) +
                data("log2FoldChange", smad3.log2FoldChange.toFixed(2), "", "", { from: fromFile(PPI_FILE) }),
            results: data("Betweenness", '<span class="k-secondary">outside scope</span>') + data("PageRank", '<span class="k-secondary">outside scope</span>'),
            conn: act("", '<span class="k-secondary">outside scope</span>', ""),
            memberships: act("In", "no set", ""),
            appearance: appearance([L.module(smad3.module, "color"), L.degree(smad3.degree, "size"), L.base("", "shape")]),
        })),
    crop("c-directed", "Directed and weighted, pinned, a result not computed", "The busiest merchant in the transfer graph, pinned in place. Connections split In, Out and All, and the amount column is totalled as Money in and Money out (proposed to graphty-element); Betweenness has not been asked for.",
        oneNodeInspector({
            name: seed.id,
            kind: "Node, Pinned",
            verbs: nbSplit() + btn("pin", "Unpin", 'aria-pressed="true"'),
            props: act("Position", "Pinned"),
            attrs: data("total degree", fmt(seed.degree), rank({ from: 1, to: 1 }, tx.nodes), "", { from: COUNTED }) +
                data("kind", seed.kind, "", "", { from: fromFile(ACC) }) + data("riskScore", seed.riskScore, "", "", { from: txAttr("riskScore").sourceNote }) + more("3 more attributes"),
            results: data("PageRank", seed.pagerank.toFixed(6), rank({ from: seed.pagerankRank, to: seed.pagerankRank }, tx.nodes)) +
                `<div class="ins-dr"><span class="k-name">Betweenness</span><span class="k-value k-secondary">Not computed</span><span class="ins-rank">under a minute &middot; <a>Run</a></span></div>`,
            conn: dirRows(SI.merchant.inTransfers, SI.merchant.outTransfers, SI.merchant),
            memberships: act("In", "no set", ""),
            appearance: appearance(TXSTACK(true, true).map((l, k) => (k === 0 ? { ...l, wins: "" } : { ...l, wins: "color, size, shape" }))),
        })),
];

const restCanvas = `<div class="k-canvas">${stage("ppi-modules-rest", "300 proteins colored by module and sized by degree, nothing selected")}${moduleLegend}${toolbar}</div>`;
const twoCanvas = `<div class="k-canvas">${stage("ppi-modules", "300 proteins colored by module and sized by degree; TP53 and SMAD3 selected", twoOverlay("light"), twoOverlay("dark"))}${moduleLegend}${barDock(pathBar())}</div>`;
const RIGHT = "Every inspector ends with Notes and Export.";
const states = [
    {
        id: "rest",
        title: "Nothing selected: Overview, Style stack, Results",
        sub: `The graph's own inspector, before anything is clicked. Overview reads the graph (${ppi.nodes} proteins, ${fmt(ppi.edges)} interactions, what the edges carry). Style stack is the whole ordered list of style layers, top wins, each with its legend, and the Look under it. Results lists every run on this graph, newest first; a row opens that result. The left panel holds only the project's objects: graphs, sets and paths, views.`,
        html: frame(ppiPanel(), restCanvas, restInspector(),
            ann(906, 60, 280, "<b>Nothing selected</b> has three sections, Overview, Style stack and Results (proposed after round 3, owner review: styles and results belong where the selection is read). The first line names the graph; it has no verbs (interface-specification 4.2, Nothing).") +
            ann(906, 120, 280, "<b>Overview</b>: the Overview row with Change overview..., the headline readings (MetricRow), then the Edges row and the weight in the words decided after round 6, &quot;confidence: asked by each run&quot; (a column's meaning as a weight is asked by each run, never set on the data), the Attributes row opening the table, and Layout with Run layout. ActionRow, MetricRow.") +
            ann(906, 330, 280, "<b>Style stack</b>: every layer, top first, with a drag handle and the caption &quot;top wins&quot;; each layer's legend nests under it (Module color's five largest modules, then &quot;5 more&quot;). The <b>Look</b> row has a visible label. &quot;+&quot; adds a layer to the top. Tree (treegrid mode), Select.") +
            ann(906, 560, 280, "<b>Results</b>, newest first: each run with its one-line summary in the weight's words. A row opens the result as its own inspector (the Betweenness state). A needs-action strip leads the section when a run is out of date (the crop further down). &quot;+&quot; is Run..., the catalog. ActionRow.") +
            ann(330, 60, 280, "<b>Rail</b>: main menu, Graph, Data, Notes, Assistant; Results left the rail. <b>Graph panel</b>: graphs, sets and paths, views -- no Styles. Under the project name, the privacy line links to Data, Sent and saved. The header has no avatar and no Export button.")),
    },
    {
        id: "one-node",
        title: "One node: TP53, at rest",
        sub: `A biologist clicked TP53 and points at Neighbors. The first line names the protein and says what its buttons do in words: Neighbors, and under it Path to... The tooltip says what a press will do and its size before she presses: filter to TP53 and its neighbors, one hop, 33 nodes, undone by Ctrl+Z. Every attribute says where it came from: module and log2FoldChange from the file, degree counted by graphty. Results gives TP53's value and rank in each run. Appearance is the same style stack, with the layers that paint TP53 marked with what each wins.`,
        html: frame(ppiPanel(), ppiCanvas(), oneNodeInspector({ splitAttrs: "data-hover" }),
            growTip +
            ann(906, 60, 280, "<b>First line</b>: name over the kind word; <b>Neighbors</b>, a labeled SplitButton whose main part always filters to neighbors (study round 2); Pin (ActionIcon); overflow. The main part's tooltip carries the result's size, the undo and Shift+N (interaction-pattern-entries 4.6). <b>Path to...</b> on a third line opens a pick mode for the end node.") +
            ann(906, 200, 280, "<b>Attributes</b> with provenance on every row (proposed after round 3: &quot;riskScore 62 -- scale of what? Who computed it?&quot;): the second line names the file column, or &quot;counted by graphty from the edges&quot;, at the left; the rank at the right. DataRow with a description line.") +
            ann(906, 330, 280, "<b>Results</b>, per run: TP53's value and its rank among the 300 (&quot;#2 of 300&quot;, content-design 5); the header names the scope, full graph. A row opens that result. Computed values moved here from Attributes, so a file's columns and graphty's runs are never mixed.") +
            ann(906, 450, 280, "<b>Connections</b>: &quot;32 neighbors&quot;, selecting them. <b>Memberships</b>: one row with its count (4.1a).") +
            ann(906, 540, 280, "<b>Appearance</b> is the style stack itself, the rows that paint TP53 highlighted and marked with the property each wins: Module color its color, Size: degree its size, Base style its shape. Top wins. &quot;+&quot; adds a layer scoped to this selection. One stack in both states, so a canvas click never unmounts a drag (proposed after round 3).") +
            ann(560, 470, 220, "Selection: the two-tone ring (canvas-drawing 6, ring 1). Nothing on the canvas uses the accent blue.")),
    },
    {
        id: "grow",
        title: "The Neighbors menu: hops, sizes, and Select neighbors",
        sub: `She opens the caret. Every hop states its size before she commits: ${NW[0]} proteins within one hop (TP53 and its 32 neighbors), ${NW[1]} within two, ${NW[2]} of ${ppi.nodes} within three. Under them are the two commands at the checked hop count: Filter to neighbors, which is what the main part does, and Select neighbors, which only changes the selection.`,
        html: frame(ppiPanel(), ppiCanvas(), oneNodeInspector({ splitAttrs: "data-open" }), growMenu +
            ann(640, 150, 300, "<b>Count before commit</b> (interaction-pattern-entries 4.6; state-matrix 4.4): each hop row is checkable, keeps the menu open, and shows the size its choice gives, the seed included. The graph is undirected with one edge type, so the direction and edge-type rows are absent. Mantine Menu (dark) from the SplitButton's caret.") +
            ann(640, 330, 300, "<b>Filter to neighbors</b> makes the neighborhood the investigation's boundary, one undoable filter step shown on the chip; it is the main part's action, so it is listed first. <b>Select neighbors</b> changes only the selection, and lives only here (study round 2).")),
    },
    {
        id: "filtered",
        title: "After Neighbors: TP53 and its 32 neighbors, on the chip and undoable",
        sub: `She pressed Neighbors. The graph is now one filter step, TP53 and neighbors: ${SL.nodes} proteins and ${SL.edges} interactions, every one labeled. The chip says so, the notice offers Undo, and TP53 stays selected. Degree now counts inside the filter; the three results ran on the full graph, so each says it is out of date.`,
        html: frame(ppiPanel({ chip: `Filtered: ${SL.nodes} of ${ppi.nodes} nodes` }), sliceCanvas, filteredInspector,
            ann(330, 60, 280, "<b>The chip</b> names the step's result and is a button with a caret (study round 2), opening the steps list. Undo in the notice, Ctrl+Z or the step's checkbox takes it back. Built with: Chip (compact-mantine Button, subtle) and Notification.") +
            ann(906, 60, 280, "<b>The same first line</b>: Neighbors again would add the next hop to the step, never a second step.") +
            ann(906, 200, 280, "<b>Degree names its scope</b>: &quot;#1 of 33&quot;, counted inside the filter. <b>Results</b> ran on the full graph: each carries the freshness mark and Re-run (content design after round 3: every number names its scope).")),
    },
    {
        id: "path-to",
        title: "Path to...: pick the end node",
        sub: "From TP53 she presses Path to... The Path tool arms with From filled in, in the same bar the Path tool always uses, and the canvas says what to do next in words: click the end node, or find it by name. Esc cancels, and focus returns to Path to...",
        html: frame(ppiPanel(), pickCanvas, oneNodeInspector({ pathOpen: true }),
            ann(330, 60, 280, "<b>Pick mode</b> (study round 2): the Path tool's bar as sets-and-paths draws it -- From, To and Run, then Scope and Weight -- with To waiting and Run disabled, and one line of instruction at the top of the canvas. A pick runs the search; the found path is the Found path state. SecondaryToolbar; a Tooltip-styled status line (role status, polite).") +
            ann(906, 60, 280, "<b>Path to...</b> is drawn pressed while the pick is armed. It is also in Quick actions (Ctrl+K) with the selected node as From.")),
    },
    {
        id: "style-by",
        title: "Show as style layer, from a Results row",
        sub: "She wants to see where the other brokers are. Hovering TP53's Betweenness row shows its palette button; the same command leads the row's menu, which a click or Shift+F10 opens. Show as style layer adds a Betweenness layer to the top of the style stack, colors every protein by betweenness, and opens the layer's editor.",
        html: frame(ppiPanel(), ppiCanvas(), oneNodeInspector({ hoverAttr: "betweenness" }), styleMenu +
            ann(330, 90, 300, "<b>Show as style layer</b> (study round 1's Style by this, now on a Results row): the hovered row shows a palette ActionIcon as its trailing action; the row's Menu leads with the same command and says what it will do. It creates a style layer through the StyleManager, never paints the element directly. The same command is on the result's own inspector. An attribute row keeps Style by this.") +
            ann(906, 60, 280, "<b>Accessible name</b> of the hovered row: &quot;Betweenness, 0.1139, rank 2 of 300&quot;, a button that opens a menu.")),
    },
    {
        id: "edge",
        title: "One edge: TP53 -- BRCA1",
        sub: "She clicks the line between TP53 and BRCA1. Line 1 names both ends, each a link that selects that protein; the edge's one attribute is its confidence score, from the file and not used by any run yet.",
        html: frame(ppiPanel(), ppiCanvas(edgeOverlay), edgeInspector,
            ann(906, 60, 280, "<b>First line</b> of an edge: &quot;A -- B&quot; on an undirected graph, each end a link; Neighbors, Filter to, Create set (interface-specification 4.2).") +
            ann(906, 180, 280, "<b>Endpoints</b>: the property row (4.1). <b>Attributes</b>: confidence, with where it came from and the weight's state in the same words as everywhere else (content design after round 3).") +
            ann(906, 330, 280, "<b>Appearance</b>: the whole stack; only Base style paints edges, so it alone is highlighted, winning color and width. Module color and Size: degree paint nodes and stay unmarked.") +
            ann(500, 500, 240, "The selected edge carries the two-tone casing (canvas-drawing 6, ring 1); its ends are not selected.")),
    },
    {
        id: "several",
        title: "Several nodes: TP53, BRCA1 and WRN",
        sub: "She shift-clicks BRCA1 and WRN. All three are DNA repair proteins, so module is a shared value; the attributes whose values differ are one row that opens the table on these three. Results gives each run's range over the three.",
        html: frame(ppiPanel(), ppiCanvas(trioOverlay), trioInspector,
            ann(906, 60, 280, "<b>First line</b>: &quot;3 selected&quot;, kind word Nodes; Neighbors, Filter to, Create set (4.2).") +
            ann(906, 160, 280, "<b>Statistics</b> of the selection (selection.statistics()); degree says it is counted by graphty. <b>Attributes</b>: shared values with their source, then one &quot;N differ&quot; row opening the table.") +
            ann(906, 330, 280, "<b>Results</b> of a selection: per run, the one value all share or the range across them (proposed after round 3). Blocked on scoped reads in graphty-element.") +
            ann(906, 450, 280, "<b>Appearance</b>: the stack, Module color winning one color (all three are DNA repair), Size: degree a range.")),
    },
    {
        id: "two",
        title: "Two nodes: TP53 and SMAD3, Paths between...",
        sub: `She wants to know how TP53 reaches SMAD3. With exactly two nodes selected, the first line gains a labeled button, Paths between... It arms the Path tool with From and To already filled in, TP53 and SMAD3, in the order she selected them. The bar is the Path tool's own: Scope is the full graph, and Weight says none, so the search will count hops. Run finds every shortest path.`,
        html: frame(ppiPanel(), twoCanvas, twoInspector(true),
            ann(906, 60, 280, "<b>Paths between...</b> (study round 1): a secondary Button on a third line, shown only when the selection is exactly two nodes. It arms the Path tool; it no longer opens a form beside the inspector, so there is one way a path search looks, the one in sets-and-paths.") +
            ann(330, 560, 300, "<b>The Path tool's bar</b> (interface-templates 14; sets-and-paths): From and To filled from the selection in selection order; Scope, the one control for where the search runs; Weight reads &quot;none, hops counted&quot;; choosing confidence there asks what a higher confidence means, on this run (load step after round 3). SecondaryToolbar, SearchInput, StyleSelect.") +
            ann(906, 200, 280, "<b>Statistics</b>: the two are not adjacent, so edges between reads 0. <b>Attributes</b>: nothing is shared, so one &quot;N differ&quot; row. <b>Results</b>: per run, a range, or two communities.")),
    },
    {
        id: "mixed",
        title: "A mixed selection: two nodes and the edge between them",
        sub: "She shift-clicks BRCA1 and the edge joining it to TP53. The first line counts the selection and offers only what makes sense for nodes and edges together.",
        html: frame(ppiPanel(), ppiCanvas(mixedOverlay), mixedInspector,
            ann(906, 60, 280, "<b>First line</b>: &quot;3 selected&quot;, kind word Nodes and edges; only Filter to and Create set (interface-specification 4.2).") +
            ann(906, 170, 280, "<b>Statistics</b> reads selection.statistics(); its attribute readings cover nodes only, so each names its kind and its source.") +
            ann(906, 330, 280, "<b>Attributes</b>: one ActionRow per kind, each opening the table on that kind. <b>Results</b>: node results only, a range over the two proteins.") +
            ann(906, 520, 280, "<b>Appearance</b>: the stack; Base style also paints the edge, so its mark says &quot;shape, edge&quot;.") +
            ann(470, 610, 240, "The selected edge carries the casing; both proteins the selection ring (canvas-drawing 6).")),
    },
    {
        id: "set",
        title: "A set: DNA repair",
        sub: "She selects the DNA repair row in the left panel. The set's first line leads with Select members; its layout, rule and origin follow, then its readings, its members by degree, its results as one row into the table, and the style stack with the layers that paint its members marked.",
        html: frame(ppiPanel({ sel: "set" }), ppiCanvas(setOverlay), setInspector(),
            ann(906, 60, 280, "<b>First line</b> of a rule set: name; size and kind; Select members first, Filter to, Freeze (4.2; the verb is Freeze and a frozen copy is a &quot;frozen set&quot;, content design after round 3), drawn with a snowflake.") +
            ann(906, 176, 280, "<b>Property rows</b>: Layout with Run layout, Rule, Created from. ActionRow.") +
            ann(906, 290, 280, "<b>Statistics</b> of the set: readings, never fields. MetricRow. Blocked on scoped reads.") +
            ann(906, 400, 280, "<b>Members</b>, by degree, each with a RankChip; &quot;27 more members&quot; opens the table. <b>Results</b> of a set: one row, a value per member in the table.") +
            ann(906, 560, 280, "<b>Appearance</b> of a kept set: the stack with the layers that paint its members marked; &quot;+&quot; adds a layer scoped to DNA repair, which replaces the own-row-per-channel form (proposed after round 3). <b>Used by</b>: one ActionRow.") +
            ann(520, 600, 240, "No layer draws a hull for this set, so each member carries the thin member ring (canvas-drawing 6, precedence).")),
    },
    {
        id: "path",
        title: "A found path: TP53 to SMAD3",
        sub: `She switched the color layer to log2FoldChange, then ran the Path tool: a shortest path of ${PI.path.hops} hops from TP53 to SMAD3, one of ${PI.path.equalPaths} as short. The inspector says how it was found, as sets-and-paths does: the query, its scope, the weight and what the weight did (hops were counted, not confidence), and the ties with a stepper through them. It is offered, not kept: Keep path keeps it.`,
        html: frame(ppiPanel(), fcCanvas, pathInspector,
            ann(906, 60, 280, "<b>First line</b> of a found path, as sets-and-paths draws it: &quot;Found path (unweighted)&quot;, its hops; the keep verb leads, labeled <b>Keep path</b> (content design after round 3 replaces &quot;Create path to style&quot;), focused when the run hands back, then Select members and Filter to.") +
            ann(906, 200, 280, "<b>Created from</b>, as DataRows: Query, Scope, Weight in the weight's words, one line on what the weight did, and Ties, &quot;1 of 12 as short&quot;, with the sibling stepper moved here from the first line. Dashed in sets-and-paths: the tie count waits on graphty-element.") +
            ann(906, 360, 280, "<b>Endpoints</b>: start and end badges, the same marks the canvas draws. <b>Members</b> in walk order, node rows with an inset edge row between; edge confidence in tertiary ink because it did not choose the route.") +
            ann(906, 620, 280, "<b>Appearance</b>: until kept, its own control is <b>Keep path</b>; then the stack with what paints the path marked. Used by is absent until graphty-element can say what reads an offered path.") +
            ann(430, 200, 260, "The offered path: two-tone casing on its edges with chevrons for the direction of travel, the member ring on its nodes, a start badge on TP53 and an end badge on SMAD3 (canvas-drawing 6).")),
    },
    {
        id: "kept-path",
        title: "The same path, kept",
        sub: "She pressed Keep path. The path is now a row in Sets and paths, named from its ends, and its inspector is a kept object's: Select members leads, Layout joins the property rows, and Appearance offers a layer scoped to the path.",
        html: frame(ppiPanel({ keptPath: true, sel: "path" }), fcCanvas, keptPathInspector,
            ann(906, 60, 280, "<b>First line</b> of a kept path: its name; derived kind and hops (4.2, Path); Select members, Filter to, Create set.") +
            ann(906, 176, 280, "<b>Property rows</b>: Created from, naming how it was found, then Layout with Run layout (blocked on layout scope). <b>Endpoints</b> and <b>Members</b> as on the found path.") +
            ann(906, 560, 280, "<b>Appearance</b> of a kept path: the stack, and &quot;+&quot; adding a layer scoped to TP53 to SMAD3. <b>Used by</b>: one ActionRow.")),
    },
    {
        id: "group",
        title: `A group: Community ${C4.community}, from the Louvain run`,
        sub: `She clicks Community ${C4.community} in the legend. The run's group is selected as a whole: its ${C4.size} proteins carry the member ring, and the inspector shows what the run says about it -- ${C4.edgesInside} interactions inside and ${C4.edgesOut} out, and its members by degree, starting with the hub ${C4.hub}. Copy ids takes all ${C4.size} names; Keep as set keeps the group past the next run.`,
        html: frame(ppiPanel(), lvCanvas(groupOverlay), groupInspector,
            ann(906, 60, 280, "<b>First line</b> of an offered group: its name with the sibling stepper beside it, the kind word Community; the keep verb, Keep as set, leads (the same word as Keep path; proposed), then Select members and Filter to.") +
            ann(906, 176, 280, "<b>Created from</b> names the run and how it read the weight. <b>Attributes</b> are the item's, from the run's Communities table, the fold-change mean beside the rest of the graph.") +
            ann(906, 330, 280, "<b>Members</b>, by a measure the reader chooses (study round 2); <b>Copy ids</b> in the header copies all 36.") +
            ann(906, 520, 280, "<b>Appearance</b> of an offered group: the one control Keep as set, then the stack with Louvain color marked.") +
            ann(330, 60, 260, "The legend entry's label is the group's handle: clicking it selects the group; its swatch, a separate control, opens the color picker (as on the colour-by-value page). No hull is drawn, so each member carries the thin member ring (canvas-drawing 6).")),
    },
    {
        id: "group-row",
        title: "The same group in the table, after a row is selected",
        sub: `She opened the ${C4.size - 3} more members: the table lists Community ${C4.community}'s ${C4.size} rows, sorted by degree. She clicks PRPF8. PRPF8 is now the selection -- ring, inspector and row agree -- and the table keeps the group's rows. Its Louvain community is a result, so it is in Results, not Attributes. Clicking Community ${C4.community} in the legend again goes back to the whole group.`,
        html: frame(ppiPanel(), lvCanvas(rowOverlay, c4Dock), rowInspector,
            ann(330, 60, 280, "<b>The table keeps the group</b> (study round 2): a table opened on a group or set is scoped to it, &quot;Community 4: 36 nodes, 1 selected&quot;. DataTable row selection.") +
            ann(906, 60, 280, "<b>One node</b>, the same inspector as TP53's, with Neighbors and Path to...") +
            ann(906, 200, 280, "<b>Attributes</b> from the file and graphty's count; <b>Results</b> leads with the run whose color layer paints the node, Louvain, then the other runs with ranks over all 300.")),
    },
    {
        id: "result",
        title: "A result as its own inspector: Betweenness",
        sub: `She clicks Betweenness in Results. The inspector becomes the result's: a state line saying it is finished and current, how it ran (scope, and what it did with the weight), the distribution of its ${ppi.nodes} values, the highest proteins, and its runs. Compare with another run... and Show as style layer are labeled buttons. Esc, or a click on empty canvas, returns to TP53, which stayed selected on the canvas.`,
        html: frame(ppiPanel(), ppiCanvas(), resultInspector,
            ann(906, 60, 280, "<b>A result is its own inspector kind</b> (proposed after round 3): first line, the method's name over the kind word Result; Re-run and Show in table as ActionIcons; <b>Compare with another run...</b> and <b>Show as style layer</b> as labeled secondary Buttons on a third line.") +
            ann(906, 180, 280, "<b>State line</b>: finished, running, failed or out of date, with its reason (state-matrix, Result). One line under the type row, role status.") +
            ann(906, 250, 280, "<b>Run</b>: Scope and the weight in its three-state words, with one line on what the weight did (content design after round 3). Weight opens the meaning question.") +
            ann(906, 380, 280, "<b>Values</b>: the distribution on the scale the automatic layer uses (log, heavy tail), median and the count at zero. <b>Highest</b>: the top three with ranks, each selecting its protein; the rest in the table. <b>Runs</b>: every run of this method, one here.") +
            ann(560, 470, 240, "The canvas keeps TP53 selected: a result is read here, not selected on the canvas. Esc returns the inspector to TP53.")),
    },
    {
        id: "flagged",
        title: `A flagged account: ${FA.id}, and why it was alerted`,
        sub: `A fraud investigator opens the account the alert named. Its attributes say where each value came from: the alert's rule and time are the bank's own columns in ${ACC}, and riskScore is the bank's score, not graphty's. On a directed, weighted graph, Connections splits in and out, and totals the amount each way: ${usd(SI.flagged.inAmount)} in over ${SI.flagged.inTransfers} transfers, ${usd(SI.flagged.outAmount)} out over ${SI.flagged.outTransfers}.`,
        html: frame(txPanel, flagCanvas, flaggedInspector,
            ann(906, 60, 280, "<b>Attributes</b>, expanded past the cap of 4 because the reader opened &quot;N more&quot; for accounts this session (4.1a). flagged first (the Flagged layer reads it), then the alert's own columns, then riskScore.") +
            ann(906, 140, 280, "<b>Provenance</b> on every row: alertRule and alertTime &quot;from accounts-2026-03.csv&quot; -- the bank's alert, carried as columns of the file, not a graphty feature; riskScore &quot;not computed by graphty: the bank's own score, 0 to 100&quot; (round 3: &quot;scale of what? Who computed it?&quot;). A long text value wraps on its own line.") +
            ann(906, 400, 280, "<b>Results</b>: Louvain community and PageRank with its rank among 3,000.") +
            ann(906, 470, 280, "<b>Connections</b> on a directed graph: Neighbors and Transfers split In, Out and All, and <b>Money in</b> and <b>Money out</b> (the money words used in the table and the catalog) -- weighted in-strength and out-strength over the amount column, <b>proposed to graphty-element</b> (framework-changes, graphty-element proposals), drawn as a proposal. CompoundRow.") +
            ann(906, 640, 280, "<b>Appearance</b>: the transfers' stack; the Flagged layer wins this account's color.") +
            ann(560, 640, 300, "Drawn: the density drawing with the 14 flagged accounts over it in the Flagged layer's color; ACC-365386 with the selection ring and its label.")),
    },
    {
        id: "cap",
        title: "Past the selection cap: one outline and a count",
        sub: `A fraud investigator selects two hops out from the busiest merchant, ${seed.id}, then the transfers among those accounts: ${fmt(TW.nodes)} accounts and ${fmt(TW.edges)} transfers, ${fmt(TW.elements)} elements, past the selection cap of 5,000. Every account and transfer is still drawn; the selection is one outline with its count instead of ${fmt(TW.elements)} rings. Every id is held, and the table lists the selected rows. The same state from Select all is in <a href="selection-over-cap.html#e2">the selection-over-cap mock</a>.`,
        html: frame(txPanel,
            `<div class="k-canvas">${stage("transactions-plain", `${fmt(tx.nodes)} accounts and ${fmt(tx.edges)} transfers, unstyled; ${fmt(TW.elements)} selected elements outlined with a count`, hullOverlay("light"), hullOverlay("dark"), badge)}${toolbar}</div>${txDock}`,
            capInspector,
            ann(330, 60, 280, "<b>Over the selection cap</b> (5,000 elements in graphty-element today): every node and edge is drawn as usual; the selection is one outline in the selection band with a count badge, nothing truncated (canvas-drawing 6; interaction-pattern-entries 4.1). Element need: a selection over the cap holds every id.") +
            ann(906, 60, 280, "<b>The same inspector</b> as any several-element selection: the count, the kind word, Filter to and Create set.") +
            ann(906, 190, 280, "<b>Statistics</b>: the counts, then one CompoundRow for the node attribute kind. <b>Results</b>: one row, a value per selected account in the table.") +
            ann(906, 400, 280, "<b>Memberships</b>: 13 of the mule ring's 14 accounts are in this neighborhood. <b>Appearance</b>: the Flagged layer is turned off in this view, so Base style paints everything.") +
            ann(560, 640, 300, "<b>The table</b> lists the selected rows, virtualized; the scope line and the scroll thumb show that 7 rows of 1,863 are in view (scale-levels, Selection mark). DataTable.")),
    },
];

const html = `<!doctype html>
<!-- THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT screens/inspector.gen.mjs -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Inspector</title>
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>
/* Page: stacked, labeled states */
.ins-bar { position: sticky; top: 0; z-index: 300; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; padding: 8px 16px; background: var(--cm-bg); border-bottom: 1px solid var(--cm-border); font-size: 12px; }
.ins-bar a, .ins-lede a, .ins-sub a { color: var(--cm-text-brand); }
.ins-bar input { vertical-align: -2px; margin: 0 2px 0 6px; }
.ins-sep { flex: 1; }
.ins-lede { max-width: 110ch; margin: 16px; font-size: 13px; line-height: 20px; color: var(--cm-text-secondary); }
.ins-state { padding: 16px 16px 24px; }
.ins-label { margin: 0 0 4px; font-size: 15px; line-height: 24px; font-weight: 600; }
.ins-sub { max-width: 1440px; margin: 0 0 8px; font-size: 13px; line-height: 20px; color: var(--cm-text-secondary); }
.ins-screen { position: relative; width: 1440px; height: 900px; overflow: hidden; box-shadow: 0 0 0 1px var(--cm-border); transform: translateZ(0); background: var(--cm-bg); }
.ins-screen > .k-app { width: 1440px; height: 900px; }
.ins-ann { display: none; }
.ins-anncol { position: absolute; left: 894px; top: 52px; width: 296px; z-index: 60; }
.ins-anncol .k-annot-note { position: static; max-width: none; margin-bottom: 6px; }
body:has(#ins-ann:checked) .ins-ann, body:has(#annotated:target) .ins-ann { display: block; }
/* page.html#grow shows that one state alone, for a storyboard frame */
body:has(.ins-state:target) .ins-bar, body:has(.ins-state:target) .ins-lede, body:has(.ins-state:target) .ins-label,
body:has(.ins-state:target) .ins-sub, body:has(.ins-state:target) .ins-state:not(:target) { display: none; }
body:has(.ins-state:target) .ins-state { padding: 0; }
body:has(.ins-state:target) .ins-screen { box-shadow: none; }
:root:has(#ins-th-dark:checked) { color-scheme: dark; }
:root:has(#ins-th-light:checked) { color-scheme: light; }
:root:has(#ins-th-dark:checked) .k-dark-only, :root:has(#ins-th-light:checked) .k-light-only { display: revert !important; }
:root:has(#ins-th-dark:checked) .k-light-only, :root:has(#ins-th-light:checked) .k-dark-only { display: none !important; }

/* The inspector's two-line type row (interface-specification 4.2; not yet a compact-mantine part) */
.ins-type { flex: none; padding: 4px 8px 4px 16px; border-bottom: 1px solid var(--cm-border); }
.ins-l1, .ins-l2 { display: flex; align-items: center; gap: 6px; height: 28px; }
.ins-l1 .k-name { flex: 1 1 auto; min-width: 0; font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ins-l1 .k-name a { color: inherit; text-decoration: underline; text-decoration-color: var(--cm-border-strong); text-underline-offset: 3px; }
.ins-l2 .k-ellipsis { min-width: 0; }
.ins-split { display: inline-flex; align-items: center; border-radius: 5px; }
.ins-split .k-icon-btn { border-radius: 5px 0 0 5px; }
.ins-caret { display: inline-grid; place-items: center; width: 24px; padding-inline-end: 12px; height: 24px; border-radius: 0 5px 5px 0; color: var(--cm-icon-secondary); }
.ins-split[data-open] { background: var(--cm-bg-selected); }
.ins-split[data-open] .ins-caret { color: var(--cm-icon-brand); }
.ins-split[data-hover] > .k-icon-btn { background: var(--cm-bg-hover); }
/* Neighbors: a labeled split button, bordered like a secondary Button (study round 2) */
.ins-nb { box-shadow: inset 0 0 0 1px var(--cm-border-strong); height: 24px; }
.ins-nbmain { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 6px; border-radius: 5px 0 0 5px; white-space: nowrap; }
.ins-nb .ins-caret { width: 24px; padding: 0; border-inline-start: 1px solid var(--cm-border-strong); }
.ins-nb[data-hover] > .ins-nbmain { background: var(--cm-bg-hover); }
.ins-by { display: inline-flex; align-items: center; gap: 2px; margin-inline-start: 6px; font-weight: 400; color: var(--cm-text-secondary); }
.ins-lgsel { background: var(--cm-bg-selected); border-radius: 3px; }
.ins-pickhint { position: absolute; z-index: 70; white-space: nowrap; max-width: none; }
.ins-scopelink { color: var(--cm-text-brand); }
.ins-stepper { display: inline-flex; align-items: center; gap: 0; color: var(--cm-text-secondary); white-space: nowrap; }
.ins-stepper .k-icon-btn { width: 16px; }

/* Rows */
.ins-props { padding: 4px 0; }
.ins-act { gap: 8px; }
.ins-act .ins-lab { width: 84px; flex: none; color: var(--cm-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ins-act .k-chit { vertical-align: -1px; }
.ins-dr, .ins-mr { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 8px; align-items: baseline; min-height: 24px; padding: 4px 8px 4px 16px; }
.ins-mr { grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; }
.ins-dr .k-name, .ins-mr .k-name { display: flex; align-items: center; gap: 6px; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--cm-text-secondary); }
.ins-dr .k-value, .ins-mr .k-value { text-align: end; white-space: nowrap; }
.ins-rank { grid-column: 2; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); text-align: end; }
.ins-rank a, .ins-mark a { color: var(--cm-text-brand); }
.ins-rankchip { font-size: 11px; line-height: 16px; padding: 0 6px; border-radius: 8px; background: var(--cm-bg-secondary); color: var(--cm-text-secondary); white-space: nowrap; }
.ins-mark { color: var(--cm-text-secondary); }
.ins-in { padding-inline-start: 32px; }
.ins-dr[data-hover] { grid-template-columns: minmax(0, 1fr) auto 24px; background: var(--cm-bg-hover); }
.ins-dr .ins-sb { grid-row: 1; grid-column: 3; align-self: center; width: 24px; height: 24px; }
.ins-add { gap: 6px; color: var(--cm-text-secondary); }
.ins-l3 { padding: 2px 0 4px; }
.ins-paths { gap: 6px; }
.ins-paths[data-open] { background: var(--cm-bg-selected); box-shadow: inset 0 0 0 1px var(--cm-border-selected-strong); }
.ins-form .k-popover-body { max-height: none; }
.ins-run { padding-top: 8px; }
.ins-more { color: var(--cm-text-secondary); min-height: 28px; }
.ins-more > span:first-child { flex: 1; }
.ins-hop { display: flex; align-items: center; gap: 6px; height: 20px; padding: 0 8px 0 40px; font-size: 11px; position: relative; }
.ins-hop-line { position: absolute; left: 22px; top: -4px; bottom: -4px; width: 1px; background: var(--cm-border-strong); }
.ins-note { padding: 4px 8px 4px 16px; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); }
.ins-own { display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 0 8px 4px 16px; }
.ins-chan { display: flex; align-items: center; gap: 8px; min-height: 28px; padding: 0 8px 0 16px; color: var(--cm-text-secondary); }
.ins-style { display: flex; align-items: center; gap: 8px; min-height: 28px; padding: 0 8px 0 16px; }
/* The button part of a row that also holds its own trailing button: laid out as the row was. */
.ins-style .ins-main, .ins-act .ins-main { display: flex; align-items: center; gap: 8px; flex: 1 1 auto; min-width: 0; align-self: stretch; }
.ins-dr .ins-main { display: grid; grid-column: 1 / 3; grid-row: 1; grid-template-columns: subgrid; align-items: baseline; }
.ins-style .ins-sv { white-space: nowrap; }
.ins-right .k-fieldrow .k-field { gap: 6px; }
.ins-compound { display: grid; gap: 2px; padding: 4px 8px 4px 16px; }
.ins-compound .k-name { color: var(--cm-text-secondary); }
.ins-segs { display: flex; flex-wrap: wrap; gap: 2px 12px; }
.ins-segs b { font-weight: 550; }
.ins-skel { display: inline-block; height: 10px; border-radius: 3px; background: var(--cm-bg-secondary); vertical-align: middle; }
.ins-err, .ins-state-line { display: flex; gap: 8px; align-items: flex-start; padding: 6px 8px 6px 16px; font-size: 11px; line-height: 16px; }
.ins-err { color: var(--cm-text-danger, var(--cm-text)); }
.ins-err .k-i, .ins-state-line .k-i { flex: none; margin-top: 3px; }
.ins-state-line { border-bottom: 1px solid var(--cm-border); color: var(--cm-text-secondary); }

/* Provenance: where an attribute's value came from, the second line's left (after round 3) */
.ins-prov { grid-column: 1; grid-row: 2; min-width: 0; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); overflow-wrap: anywhere; }
.ins-prov-wide { grid-column: 1 / -1; }
.ins-dr .ins-rank { grid-row: 2; }
.ins-long { grid-template-columns: minmax(0, 1fr); }
.ins-longv { grid-column: 1 / -1; font-size: 11px; line-height: 16px; color: var(--cm-text); }
.ins-long .ins-prov { grid-row: auto; }
/* The style stack, one list in both states; a layer that paints the selection is highlighted and
   names the property it wins there */
.ins-stack { padding-bottom: 4px; }
.ins-stk { gap: 6px; }
.ins-stk[data-wins] { background: var(--cm-bg-selected-secondary, var(--cm-bg-selected)); }
.ins-grip { color: var(--cm-icon-secondary); flex: none; margin-inline-start: -10px; }
.ins-stk .ins-sv { white-space: nowrap; }
.ins-wins { flex: none; font-size: 11px; line-height: 16px; padding: 0 6px; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--cm-border-strong); color: var(--cm-text); white-space: nowrap; }
.ins-lgrow { gap: 6px; min-height: 24px; }
.ins-lgmore { color: var(--cm-text-secondary); }
.ins-look { padding-top: 4px; }
.ins-own { padding-top: 4px; }
/* Results with nothing selected: runs newest first, a needs-action strip on top */
.ins-run { gap: 8px; min-height: 40px; align-items: center; }
.ins-runtxt { display: grid; flex: 1 1 auto; min-width: 0; line-height: 16px; }
.ins-runtxt .k-secondary { font-size: 11px; }
.ins-runmark { font-size: 11px; color: var(--cm-text); white-space: nowrap; }
.ins-strip { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin: 0 8px 4px 16px; padding: 6px 8px; border-radius: 5px; background: var(--cm-bg-secondary); font-size: 11px; line-height: 16px; }
.ins-strip .k-i { flex: none; }
.ins-chg { padding-inline: 4px; }
.ins-fact { color: var(--cm-text); }
/* A result's inspector */
.ins-l3two { display: grid; gap: 4px; }
.ins-l3two .k-btn { gap: 6px; }
.ins-ok { color: var(--cm-text); }
.ins-hist { height: 40px; margin: 4px 8px 0 16px; }
.ins-axis { display: flex; padding: 0 8px 2px 16px; font-size: 11px; }
/* The found path, as sets-and-paths draws it */
.ins-unw { font-weight: 400; }
.ins-keep { gap: 4px; height: 24px; padding-inline: 6px; white-space: nowrap; }
.ins-end { gap: 8px; }
.ins-dr .ins-stepper .k-icon-btn { width: 20px; }
/* The Path tool's bar (sets-and-paths) */
.ins-pbar { display: flex; flex-direction: column; gap: 4px; width: 404px; margin-bottom: 8px; padding: 8px; border-radius: 13px; background: var(--cm-bg); box-shadow: var(--cm-elevation-200); }
.ins-pbar-row { display: flex; align-items: center; gap: 8px; height: 24px; }
.ins-pbar .k-field { min-width: 0; }
.ins-plbl { color: var(--cm-text-secondary); width: 40px; flex: none; }
/* A proposal drawn in the product: a dashed edge, like the sets-and-paths mock's "not yet possible" */
.ins-proposed { outline: 1.5px dashed var(--k-annot); outline-offset: -2px; }
.ins-compound .ins-prov { grid-row: auto; }

/* The dock: a full, scrolling table with its scroll position */
.ins-dock .k-scope { display: flex; }
.ins-tw { position: relative; overflow: hidden; }
.ins-thumb { position: absolute; right: 2px; top: 30px; width: 6px; border-radius: 3px; background: var(--cm-border-strong); }

/* Canvas: the count badge on the outline of a selection past the cap (canvas-drawing 6) */
.ins-badge { position: absolute; transform: translate(-50%, -140%); padding: 2px 8px; border-radius: 10px; background: var(--k-mark-out); color: var(--k-mark-in); font-size: 11px; font-weight: 550; white-space: nowrap; box-shadow: 0 0 0 2px var(--k-mark-in); }
.ins-menu .k-menu-label { font-weight: 550; }
.ins-tip { position: absolute; z-index: 70; white-space: nowrap; max-width: none; }

/* Degraded states: right-column crops */
.ins-crops { display: grid; grid-template-columns: repeat(3, 440px); gap: 24px 32px; padding: 0 16px 32px; }
.ins-crop { margin: 0; display: grid; grid-template-columns: 241px 1fr; gap: 16px; align-items: start; }
.ins-crop figcaption { order: 2; display: grid; gap: 4px; font-size: 13px; line-height: 20px; }
.ins-col { height: 900px; box-shadow: 0 0 0 1px var(--cm-border); }
</style>
</head>
<body>
<span id="annotated"></span>
<div class="ins-bar">
  <a href="../index.html">Gallery</a>
  <b>Inspector</b>
  <span class="ins-sep"></span>
  <span>Theme <label><input type="radio" name="ins-th" checked> system</label> <label><input type="radio" name="ins-th" id="ins-th-light"> light</label> <label><input type="radio" name="ins-th" id="ins-th-dark"> dark</label></span>
  <label><input type="checkbox" id="ins-ann"> Annotations: framework section and compact-mantine component</label>
  <span class="ins-sep"></span>
  <span>States: ${states.map((s, k) => `<a href="#${s.id}">${k + 1}</a>`).join(" ")} <a href="#degraded">crops</a></span>
</div>
<p class="ins-lede">The right-hand column describes whatever is selected, and nothing else. With nothing selected it is the graph's: Overview, the Style stack and Results. With a selection it describes that selection, and every attribute says where its value came from -- a column of the file, or graphty's own count; the selection's value and rank in each run sit in Results; and Appearance is the same style stack with the layers that paint the selection marked. A result opened from Results is an inspector of its own. The states, on real data: nothing selected; one protein, its Neighbors menu, what one press of Neighbors does, Path to..., and Show as style layer from a result; one edge; several proteins; two proteins with Paths between...; a mixed selection; a set; a found path and the same path kept; a community from a Louvain run and a table row chosen from it; the Betweenness result; a flagged account, with the alert's own columns and its money in and out; and a selection of ${fmt(TW.elements)} transfers and accounts too large to ring one by one. Below them, right-column crops show the opened Memberships and the degraded states. Each state is the full app at 1440 by 900. Turn on the annotations to see which part of the framework each row follows and the compact-mantine component it would be built with; add #annotated to the address to open the page with them on.</p>
${states.map((s) => `<section class="ins-state" id="${s.id}"><h2 class="ins-label">${states.indexOf(s) + 1}. ${s.title}</h2><p class="ins-sub">${s.sub}</p>${s.html}</section>`).join("\n")}
<section id="degraded"><h2 class="ins-label" style="margin:16px">${states.length + 1}. Degraded states and the opened Memberships, right column only</h2>
<p class="ins-sub" style="margin:0 16px 16px">The rest of the frame does not change in these states, so each is the inspector column alone, at its real 240 px width.</p>
<div class="ins-crops">${crops.join("\n")}</div></section>
</body>
</html>
`;
if (/[^\x00-\x7F]/.test(html)) throw new Error("non-ASCII in output");
writeFileSync(join(here, "inspector.html"), toShell(html)); // the current frame: kit/shell.mjs
console.log("wrote screens/inspector.html");
