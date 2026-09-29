#!/usr/bin/env node
// Builds the five screen mocks behind storyboards/failure-and-recovery.html, and the filtered
// Les Miserables drawings they use:
//   screens/weight-role-trap.html, closeness-variant.html, filter-step-recovery.html,
//   gpu-lost-run.html, selection-over-cap.html; screens/img/lesmis-*.svg
// Run from design/ui/prototype/: node screens/failure-and-recovery.gen.mjs
//
// Each page stacks its states (labeled), light or dark by the switch at the top, with an
// annotation layer. A storyboard frame loads one state alone with a hash: weight-role-trap.html#a2.
// Numbers: kit/fixtures.json, plus screens/failure-and-recovery-numbers.py for the weighted and
// filtered runs the fixtures do not hold. Plain ASCII only.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toShell } from "../kit/shell.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const proto = join(here, "..");
// Every number on these pages: screens/failure-and-recovery-numbers.py writes it (NetworkX, the
// published Les Miserables graph); nothing below is typed by hand.
const N = JSON.parse(readFileSync(join(here, "../kit/fixtures.json"), "utf8")).scenarios.failureAndRecovery;
const WV = N.withoutValjean;
// The citation graph's costly run: the default sample is the largest that fits the time limit, read
// directed (kit/fixtures.json, datasets.citations), the same run the options form offers.
const COST = JSON.parse(readFileSync(join(here, "../kit/fixtures.json"), "utf8")).datasets.citations.betweennessCost;
const K = COST.largestKWithinBudget;
const KBIG = COST.sampled.at(-1); // the largest sample the options form lists, past the time limit
const ord = (k) => `${k}${k % 100 >= 11 && k % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][k % 10] ?? "th"}`;
const fx = JSON.parse(readFileSync(join(proto, "kit/fixtures.json"), "utf8")).datasets;
const GEN = "screens/failure-and-recovery.gen.mjs";

// ---------------------------------------------------------------- drawings
// Positions and colors come from the kit's own drawing, so a filtered graph sits where the
// full one does.
function lesmisDrawings() {
    const raw = JSON.parse(readFileSync(join(proto, "../../../graph-io/test/corpus/json/miserables.json"), "utf8"));
    const names = raw.nodes.map((n) => n.name);
    // The published edge list, as kit/gen-canvas.mjs reads it: Old Man's edge goes to Myriel.
    const at = (n) => names.indexOf(n);
    for (const l of raw.links) if (l.source === at("Myriel") && l.target === at("Myriel")) l.source = at("OldMan");
    const links = raw.links.map((l) => [l.source, l.target]);
    const variants = {
        all: () => true,
        // Filter out Valjean alone (branch B)
        f1: (n) => n !== "Valjean",
        // Filter out Valjean; Largest component; Filter out Javert (numbers script, "all three steps")
        f123: (n) => !["Valjean", "Javert", "Champtercier", "Count", "CountessdeLo", "Cravatte", "Geborand", "Gervais", "Isabeau", "Labarre", "Mlle.Baptistine", "Mme.Magloire", "Mme.deR", "Myriel", "Napoleon", "OldMan", "Scaufflaire"].includes(n),
        // the same with Largest component turned off
        f13: (n) => !["Valjean", "Javert"].includes(n),
    };
    mkdirSync(join(here, "img"), { recursive: true });
    for (const theme of ["light", "dark"]) {
        const svg = readFileSync(join(proto, `kit/canvas/lesmis-groups-${theme}.svg`), "utf8");
        // The kit draws circles in size order, but its lines in link order, so a node's position
        // comes from its first line; its size and color from the circle at that position. The
        // spare-circle fallback below is for a node with no line (the published graph has none).
        const drawn = new Map([...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="(#[0-9A-Fa-f]{6})"\/>/g)]
            .map((m) => [`${m[1]},${m[2]}`, { x: +m[1], y: +m[2], r: +m[3], fill: m[4] }]));
        const circles = [];
        [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"\/>/g)].forEach((m, i) => {
            const [s, t] = links[i];
            circles[s] ??= drawn.get(`${m[1]},${m[2]}`);
            circles[t] ??= drawn.get(`${m[3]},${m[4]}`);
        });
        const used = new Set(circles.filter(Boolean));
        const spare = [...drawn.values()].filter((c) => !used.has(c));
        names.forEach((_, i) => { circles[i] ??= spare.shift(); });
        const bg = theme === "light" ? "#F5F5F5" : "#1E1E1E";
        const ink = theme === "light" ? "#1A1A1A" : "#F0F0F0";
        for (const [v, keep] of Object.entries(variants)) {
            const kept = new Set(names.map((n, i) => (keep(n) ? i : -1)).filter((i) => i >= 0));
            const edges = links.filter(([s, t]) => kept.has(s) && kept.has(t));
            const deg = new Map([...kept].map((i) => [i, 0]));
            edges.forEach(([s, t]) => { deg.set(s, deg.get(s) + 1); deg.set(t, deg.get(t) + 1); });
            const labeled = [...kept].sort((a, b) => deg.get(b) - deg.get(a)).slice(0, 18); // the label budget
            const out = [
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800" role="img" aria-label="Les Miserables, ${kept.size} of 77 characters, colored by group">`,
                `<rect width="1200" height="800" fill="${bg}"/>`,
                `<g stroke="#808080" stroke-width="1" stroke-opacity="0.55" stroke-linecap="round">`,
                ...edges.map(([s, t]) => `<line x1="${circles[s].x}" y1="${circles[s].y}" x2="${circles[t].x}" y2="${circles[t].y}"/>`),
                `</g><g>`,
                ...[...kept].map((i) => `<circle cx="${circles[i].x}" cy="${circles[i].y}" r="${circles[i].r}" fill="${circles[i].fill}"/>`),
                `</g><g font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="12" fill="${ink}" stroke="${bg}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">`,
                ...labeled.map((i) => `<text x="${(circles[i].x + circles[i].r + 4).toFixed(1)}" y="${(circles[i].y + 4).toFixed(1)}">${names[i]}</text>`),
                `</g></svg>`,
            ];
            writeFileSync(join(here, `img/lesmis-${v}-${theme}.svg`), out.join("\n") + "\n");
        }
    }
}
lesmisDrawings();

// ---------------------------------------------------------------- small builders
const I = (name, cls = "") => `<svg class="k-i ${cls}"><use href="../kit/icons.svg#${name}"/></svg>`;
const GC = Object.fromEntries(Object.entries(fx.lesmis.groupColors).map(([g, c]) => [g, c]));
const chit = (c) => `<span class="k-chit" style="background:${c}"></span>`;
// data-sb names a region the storyboard crops to (storyboards/failure-and-recovery.gen.mjs).
const sb = (name) => (name ? ` data-sb="${name}"` : "");

// The rail. badge: the count of results that failed or are out of date, on the Results button
// (figma-crosswalk 4.1, "Library updates wait behind one badged button"; state-matrix, Rail button).
function rail(active, badge = 0) {
    const b = (icon, label, extra = "") => {
        const count = label === "Results" && badge ? `<span class="k-rail-badge k-num"${sb("badge")}>${badge}</span>` : "";
        return `<div class="k-rail-btn"${active === label ? ' aria-pressed="true"' : ""}${extra}><span class="k-rail-pill">${I(icon)}${count}</span>${label}</div>`;
    };
    return `<nav class="k-rail" aria-label="Main"><div class="k-rail-btn"><span class="k-rail-pill">${I("menu")}</span></div><div class="k-rail-sep"></div>${b("network", "Graph")}<div class="k-rail-btn k-asst-off" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div>${b("flask-conical", "Results")}${b("sticky-note", "Notes")}</nav>`;
}
function head(project, chip, expanded = false) {
    const filtered = chip !== "Full graph";
    return `<div class="k-panel-head"><div class="k-title-line"><span class="k-project">${project}</span>${I("chevron-down", "k-i-sm k-secondary")}</div><a class="k-privacy">Nothing has been sent from this project</a><span class="k-chip${filtered ? " fr-chip-on" : ""}"${expanded ? ' aria-expanded="true"' : ""}${sb("chip")}>${I("funnel", "k-i-sm")}<span class="k-num">${chip}</span>${filtered ? I("chevron-down", "k-i-sm") : ""}</span></div>`;
}
// A result row (compact-mantine ActionRow): name line, then at most one state line.
// open: its editor popover is open, the only time the row takes the selected fill (a result is a
// definition; definitions do not take the canvas selection).
function res({ name, icon = "sigma", trail = "", sub = "", open = false, focus = false, hover = false, variant = "", id = "" }) {
    const v = variant ? ` <span class="fr-variant">${variant}</span>` : "";
    return `<div class="fr-res${focus ? " fr-focus" : ""}"${open ? ' aria-selected="true"' : ""}${hover ? " data-hover" : ""}${sb(id)}><div class="fr-res-line">${I(icon, "k-secondary")}<span class="k-grow k-ellipsis">${name}${v}</span>${trail}</div>${sub ? `<div class="fr-res-sub">${sub}</div>` : ""}</div>`;
}
const catalog = (rows) => `<section class="k-section"><div class="k-section-head">Catalog<span class="k-grow"></span><span class="k-icon-btn">${I("list-filter")}</span></div><div class="fr-family">Centrality</div>${rows}</section>`;
const catRow = (name, trail = "", hover = false, id = "") => `<div class="k-row"${hover ? " data-hover" : ""}${sb(id)}><span class="k-grow">${name}</span>${trail}<span class="k-icon-btn k-secondary">${I("info", "k-i-sm")}</span></div>`;

function resultsPanel(project, chip, projectRows, cat = "", chipOpen = false) {
    return `<aside class="k-panel" aria-label="Results">${head(project, chip, chipOpen)}<div class="fr-title">Results</div><div class="k-search"><span class="k-field" data-placeholder>${I("search", "k-i-sm")}Find a run or a measure</span></div><div class="k-scroll"><div class="fr-cap k-secondary">Every run of a measure, with its settings and date.</div><section class="k-section"${projectRows ? "" : " data-empty"}><div class="k-section-head">Runs</div>${projectRows || `<div class="fr-cap k-secondary">None yet</div>`}</section>${cat}</div></aside>`;
}
function graphPanel(project, chip, sets) {
    return `<aside class="k-panel" aria-label="Graph">${head(project, chip)}<div class="k-scroll"><section class="k-section"><div class="k-section-head">Graphs<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div><ul class="k-list"><li class="k-item" aria-selected="true">${I("network")}<span class="k-grow k-ellipsis">Transfers</span><span class="k-trail k-num">3,000 nodes</span></li></ul></section><section class="k-section"${sets ? "" : " data-empty"}${sb("sets")}><div class="k-section-head">Sets and paths<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div><ul class="k-list">${sets}</ul></section><section class="k-section"><div class="k-section-head">Styles<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div><ul class="k-list"><li class="k-item"><span class="k-chit" style="background:#D55E00"></span><span class="k-ellipsis">Flagged accounts</span></li><li class="k-item"><span class="k-chit" style="background:#808080"></span><span class="k-ellipsis">Density</span><span class="k-kind">base</span></li></ul></section></div></aside>`;
}
const toolbar = `<div class="k-toolbar" role="toolbar"><span class="k-tool" aria-pressed="true">${I("mouse-pointer-2", "k-i-lg")}</span><span class="k-tool-caret">${I("chevron-down", "k-i-sm")}</span><span class="k-tool">${I("route", "k-i-lg")}</span><span class="k-tool">${I("sticky-note", "k-i-lg")}</span><span class="k-toolbar-sep"></span><span class="k-tool">${I("zap", "k-i-lg")}</span></div>`;
function canvas({ img, alt = "", legend = "", stage = "", toast = "" }) {
    const pic = img ? `<img class="k-light-only" src="${img.replace("{t}", "light")}" alt="${alt}"><img class="k-dark-only" src="${img.replace("{t}", "dark")}" alt="${alt}">` : "";
    return `<div class="k-canvas">${img || stage ? `<div class="k-stage">${pic}${stage}</div>` : ""}${legend ? `<div class="k-legend-card">${legend}</div>` : ""}<div class="k-toolbar-dock"${sb("dock")}>${toast}${toolbar}</div><span class="k-help">${I("circle-help")}</span></div>`;
}
const groupLegend = (extra = "") => `<div class="k-lg-title">Group color <span class="k-secondary">group</span></div><div class="k-lg-row">${chit(GC[2])}2<span class="k-value">14</span></div><div class="k-lg-row">${chit(GC[8])}8<span class="k-value">13</span></div><div class="k-lg-row">${chit(GC[4])}4<span class="k-value">11</span></div><div class="k-lg-row">${chit(GC[1])}1<span class="k-value">10</span></div><div class="k-lg-row k-secondary">6 more</div>${extra}`;

function table({ tabs = "Nodes", scope, cols, rows }) {
    const th = cols.map((c) => `<th${c.n ? ' class="k-n"' : ""}>${c.name}${c.profile ? ` <span class="k-profile">${c.profile}</span>` : ""}</th>`).join("");
    const tr = rows.map((r) => `<tr${r.sel ? ' aria-selected="true"' : ""}${r.hover ? " data-hover" : ""}>${r.cells.map((c, i) => `<td${cols[i].n ? ' class="k-n"' : i === 0 ? ' class="k-id"' : ""}>${c}</td>`).join("")}</tr>`).join("");
    return `<section class="k-dock" aria-label="Table"${sb("table")}><div class="k-dock-tabs"><span class="k-tab" aria-selected="true">${tabs}</span><span class="k-tab">Edges</span><span class="k-grow"></span><span class="k-icon-btn">${I("search")}</span><span class="k-icon-btn">${I("ellipsis")}</span></div><div class="k-scope">${scope}</div><div class="k-table-wrap"><table class="k-table"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div></section>`;
}
function right(typerow, sections) {
    return `<aside class="k-right" aria-label="Inspector"><div class="k-header1"><span class="k-avatar">A</span><span class="k-grow"></span><span class="k-btn">Export files...</span></div><div class="k-header2"><span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">100%${I("chevron-down", "k-i-sm")}</span></div><div class="k-typerow">${typerow}</div><div class="k-scroll">${sections}</div></aside>`;
}
const sec = (title, body, trail = "", id = "") => `<section class="k-section"${sb(id)}><div class="k-section-head">${title}<span class="k-grow"></span>${trail}</div>${body}</section>`;
const data = (name, value, extra = "") => `<div class="k-data"${extra}><span class="k-name">${name}</span><span class="k-value">${value}</span></div>`;

function app(left, main, rightCol, badge = 0) {
    const active = left.includes('aria-label="Results"') ? "Results" : "Graph";
    return `<div class="k-app">${rail(active, badge)}${left}<main class="k-main">${main}</main>${rightCol}</div>`;
}
// Annotation layer: [x, y, text, width] in px of the 1440 x 900 screen; text cites the framework
// section and names the compact-mantine component.
const ann = (notes) => notes.map(([x, y, t, w = 240]) => `<div class="k-annot-note fr-ann" style="left:${x}px;top:${y}px;max-width:${w}px">${t}</div>`).join("");
// A result row sits in the inspector's Results section, so its editor opens to the inspector's left.
const EDX = (w) => 1440 - 241 - 8 - w;
const at = (x, y, html) => `<div class="fr-abs" style="left:${x}px;top:${y}px">${html}</div>`;

// ---------------------------------------------------------------- page
function page(file, title, lede, states) {
    if (process.env.ONLY && process.env.ONLY !== file) return; // ONLY=gpu-lost-run.html writes that page alone
    const index = states.map((s) => `<a href="#${s.id}">${s.id.toUpperCase()}</a>`).join(" ");
    const body = states.map((s) => `<section class="fr-state" id="${s.id}"><h2 class="fr-label">${s.id.toUpperCase()}. ${s.title}</h2><p class="fr-sub">${s.sub}</p><div class="fr-screen">${s.html}${ann(s.notes ?? [])}</div></section>`).join("\n");
    const html = `<!doctype html>
<!-- THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT ${GEN} -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<link rel="stylesheet" href="failure-and-recovery.css">
</head>
<body>
<div class="fr-bar">
  <a href="../index.html">Gallery</a>
  <b>${title}</b>
  <span class="fr-sep"></span>
  <span>Theme <label><input type="radio" name="fr-th" checked> system</label> <label><input type="radio" name="fr-th" id="fr-th-light"> light</label> <label><input type="radio" name="fr-th" id="fr-th-dark"> dark</label></span>
  <label><input type="checkbox" id="fr-ann"> Annotations: framework section and compact-mantine component</label>
  <span class="fr-sep"></span>
  <span>States: ${index}</span>
  <a href="../storyboards/failure-and-recovery.html">Storyboard</a>
</div>
<p class="fr-lede">${lede}</p>
${body}
</body>
</html>
`;
    writeFileSync(join(here, file), toShell(html)); // the current frame: kit/shell.mjs
    console.log(join(here, file));
}

// ---------------------------------------------------------------- shared Les Miserables pieces
const LM = "Les Miserables";
const lmImg = (v) => `img/lesmis-${v}-{t}.svg`;
const lmCols = (metric, profile) => [{ name: "label" }, { name: "group", profile: "10 values" }, { name: "degree", n: true }, { name: metric, n: true, profile }];
const lmRow = (label, g, deg, val, o = {}) => ({ cells: [label, `${chit(GC[g])}${g}`, deg, val], ...o });
const wrong = N.asDistance.map((r) => lmRow(r.label, r.group, r.degree, r.value));
const right_ = N.asSimilarity.map((r) => lmRow(r.label, r.group, r.degree, r.value));
const graphRow = `${I("network")}<span class="k-name">Co-appearances</span><span class="k-secondary">Graph</span>`;
// The graph's Statistics. The same six rows in every Les Miserables frame; only the values change.
// Nodes shows the count alone while filtered (principles 1: the chip alone marks the node count);
// Edges carries its own "of". The weight column's row describes only the data: what a bigger value
// means is never a property of the column, it is asked by each run that reads it.
const WCOL = `value, shared scenes, ${N.valueRange[0]} to ${N.valueRange[1]}`;
function lmStats({ nodes = String(N.full.nodes), edges = String(N.full.edges), comps = String(N.full.components), iso = String(N.full.isolated) } = {}) {
    return sec("Statistics", data("Nodes", nodes) + data("Edges", edges) + data("Direction", "undirected") +
        data("Weight", WCOL, sb("weightrow")) +
        data("Components", comps) + data("Isolated nodes", iso), "", "stats");
}
const lmCatalog = (hoverCloseness = false, closenessMark = "", hoverBtw = false) => catalog(
    catRow("Betweenness", "", hoverBtw, "btwcat") + catRow("Closeness", closenessMark, hoverCloseness, "closeness") + catRow("Harmonic centrality") + catRow("PageRank") + catRow("Eigenvector centrality"));
const btw = (o = {}) => res({ name: "Betweenness", id: "btw", ...o });
// The run's state line names the conversion it used.
const CONV = { distance: "Distance = value", similarity: "Distance = 1 / value" };
const reading = (role) => `<span class="fr-reading"${sb("reading")}>${CONV[role]}</span>`;
const outOfDate = `<span class="fr-state-word">${I("triangle-alert", "k-i-sm")}Out of date</span>`; // its editor is open, so the one verb, Re-run (keeps Run 1), is in the editor's header
// The run's own question. choice: "" (unanswered: Choose..., Run disabled), "distance", "similarity".
const ANSWER = { distance: "a longer or costlier step", similarity: "a closer or stronger link" };
function weightAsk(choice = "", { focus = false } = {}) {
    const f = choice
        ? `<span class="k-field k-span"${focus ? " data-focus" : ""}>${ANSWER[choice]}${I("chevron-down", "k-i-sm k-caret")}</span>`
        : `<span class="k-field k-span" data-placeholder${focus ? " data-focus" : ""}>Choose...${I("chevron-down", "k-i-sm k-caret")}</span>`;
    return `<div class="fr-hot"${sb("weight")}><div class="k-fieldrow"><span class="k-legend">Weight</span><div class="k-fields"><span class="k-field k-span">value${I("chevron-down", "k-i-sm k-caret")}</span></div></div>
        <div class="k-fieldrow"><span class="k-legend fr-ask">In this run, a bigger value means:</span><div class="k-fields">${f}</div></div></div>`;
}
// A betweenness form: the Catalog's run form (new) or the result's editor (open).
function btwForm({ choice = "", focus = false, runOff = false, top = "", verb = "Run" } = {}) {
    return `<div class="k-popover" style="position:static;width:248px"${sb("editor")}><div class="k-popover-head">Betweenness<span class="k-grow"></span><span class="k-btn${runOff ? "" : " k-btn-secondary"}"${runOff ? ' aria-disabled="true"' : ""}${sb("run")}>${verb}</span><span class="k-icon-btn">${I("x")}</span></div><div class="k-popover-body">
        <div class="k-fieldrow"><span class="k-legend">Scope</span><div class="k-fields"><span class="k-field k-span">Full graph<span class="k-grow"></span><span class="k-secondary k-num">77</span></span></div></div>
        ${weightAsk(choice, { focus })}
        <div class="k-fieldrow"><span class="k-legend">Normalized</span><div class="k-fields"><span class="k-switch" aria-checked="true"></span></div></div>
        ${top}</div></div>`;
}
const topNodes = (rows, headText = "Top nodes") => `<div class="fr-mini-head">${headText}</div>${rows.slice(0, 5).map((x) => data(x.label, x.value)).join("")}<div class="k-row k-secondary">Details${I("chevron-right", "k-i-sm")}</div>`;
const FORMX = 306, FORMY = 200;

// ---------------------------------------------------------------- A: the quiet trap
const a = [];
a.push({
    id: "a1", title: "The load step describes value and asks nothing about its meaning",
    sub: "miserables.json dropped on a blank project. The load step shows the edge column value as data only: whole numbers, their range and their spread. What a bigger value means is not a property of the column; each run that reads value asks it. The project keeps its blank name until Load commits.",
    html: app(resultsPanel("Untitled project", "Full graph", "", lmCatalog()),
        canvas({}) + table({ scope: "", cols: [{ name: "label" }], rows: [] }),
        right(`${I("network")}<span class="k-name">Untitled project</span>`, "")) +
        `<div class="k-backdrop"><div class="k-modal k-modal-wide"${sb("modal")}><div class="k-modal-head">Open miserables.json</div><div class="k-modal-body">
        ${data("Read as", "JSON, nodes and links")}${data("Nodes", String(N.full.nodes))}${data("Edges", `${N.full.edges}, undirected`)}${data("Isolated nodes", String(N.full.isolated))}
        <div class="fr-q"${sb("question")}><div class="fr-q-head"><span class="k-strong">Edge attribute value</span><span class="k-secondary k-num">whole numbers, ${N.valueRange[0]} to ${N.valueRange[1]}; most edges 1 to 3</span></div>
        <div class="k-hist fr-hist">${N.valueBars.map((h) => `<i style="height:${h ? `${h}%` : 0}"></i>`).join("")}</div>
        <div class="k-secondary">A measure that reads value asks, each time it runs, what a bigger value means.</div>
        </div></div><div class="k-modal-foot"><span class="k-btn k-btn-secondary">Cancel</span><span class="k-btn">Load</span></div></div></div>`,
    notes: [[1080, 300, "Load step: a modal step (interaction-patterns 3.5 level 5). compact-mantine: modal with ModalFooter; DataRow for the counts."], [1080, 430, "The column is described by its data only. No role question at load, and no default the runs inherit: the meaning has one home, the run (proposed; graph-conventions 2 keeps 'no role guessed')."], [1080, 560, "Value histogram: ChartRow. Most edges 1 to 3: the fixture's own value counts."]],
});
a.push({
    id: "a2", title: "The run asks what a bigger value means, and waits",
    sub: "Alex clicks Betweenness in the Catalog. Its run form reads the weight column value and asks \"In this run, a bigger value means:\" with nothing chosen. Run stays disabled until he answers. The graph's Statistics describe value only by its data.",
    html: app(resultsPanel(LM, "Full graph", "", lmCatalog(false, "", true)),
        canvas({ img: lmImg("all"), alt: "Les Miserables colored by group", legend: groupLegend() }) + table({ scope: "Full graph: 77 nodes. Sorted by degree.", cols: lmCols("betweenness", ""), rows: N.asDistance.map((r) => lmRow(r.label, r.group, r.degree, "")) }),
        right(graphRow, lmStats())) +
        at(FORMX, FORMY, btwForm({ runOff: true })) +
        at(FORMX + 96, FORMY - 34, `<div class="k-tooltip" style="position:static;max-width:230px">Choose what a bigger value means first</div>`),
    notes: [[570, 150, "Run form: interaction-pattern-entries 6.2; interface-templates 10 (Weight after the scope). compact-mantine: Popout with FieldRow; Select with a placeholder; Button disabled with a TooltipShortcut naming why."], [570, 420, "The question is a run option owned by graphty-element, asked in every run that reads a weight, with no prefill from the column (proposed). If the extra click costs too much, the prefill can come back."], [960, 390, "Weight column: DataRow. Name, unit and range; it claims no meaning, so there is nothing on the column to change."]],
});
a.push({
    id: "a3", title: "Three answers, each naming its conversion",
    sub: "Alex opens Choose... Each answer carries one line saying how the run will turn value into a length. He thinks of a number on an edge as a length and picks a longer or costlier step.",
    html: app(resultsPanel(LM, "Full graph", "", lmCatalog(false, "", true)),
        canvas({ img: lmImg("all"), alt: "", legend: groupLegend() }) + table({ scope: "Full graph: 77 nodes. Sorted by degree.", cols: lmCols("betweenness", ""), rows: N.asDistance.map((r) => lmRow(r.label, r.group, r.degree, "")) }),
        right(graphRow, lmStats())) +
        at(FORMX, FORMY, btwForm({ runOff: true, focus: true })) +
        at(FORMX + 16, FORMY + 190, `<div class="k-menu" style="position:static;min-width:236px"${sb("answers")}>
        <div class="k-menu-item" data-described data-hover><span class="k-check-col"></span><span>a longer or costlier step<span class="k-menu-desc">Distance = value</span></span></div>
        <div class="k-menu-item" data-described><span class="k-check-col"></span><span>a closer or stronger link<span class="k-menu-desc">Distance = 1 / value, such as a count of shared scenes</span></span></div></div>`),
    notes: [[620, 150, "Select with described options (kit k-menu-desc, proposed to compact-mantine as an option description slot). Glossary 11 answers; 'more can pass through' is offered only by flow measures, which read value as capacity. Not weighting at all is the Weight field's own choice, None for this run, so it is not a third answer here."], [620, 470, "Each option's line is its conversion, the same words the result's state line will show. No list of the measures that read each role."]],
});
a.push({
    id: "a4", title: "A plausible ranking, and no error",
    sub: "Betweenness ran at once. It read value as a length, so the heaviest co-appearances count as the longest ties and paths go around them. The result's state line names the conversion it used: Distance = value.",
    html: app(resultsPanel(LM, "Full graph", btw({ trail: `<span class="k-secondary k-num">10:12</span>`, sub: `<span class="k-num">Run 1.</span> ${reading("distance")}` }), lmCatalog()),
        canvas({ img: lmImg("all"), alt: "", legend: groupLegend() }) + table({ scope: "Full graph: 77 nodes. Sorted by betweenness.", cols: lmCols("betweenness", `0 to ${N.asDistance[0].value}`), rows: wrong }),
        right(graphRow, lmStats())),
    notes: [[320, 150, "Run row: ActionRow (interface-templates 3), its time at the end of the name line. The state line names the conversion ('Distance = value'), next to the Weight column row that says value counts shared scenes (proposed)."], [770, 620, `Table: DataTable. ${N.asDistance[1].label} second and ${N.asDistance[2].label} third read as plausible; nothing on screen is wrong-looking.`]],
});
a.push({
    id: "a5", title: "The trust check: change the answer where it was given",
    sub: "Alex opens the result. Its editor shows the same question with his answer. He changes it to a closer or stronger link. This run's option changed, so Run 1 is Out of date at once, with one verb, Re-run (keeps Run 1); its numbers stay, marked, until he asks. Nothing on the column changed, and no other result is touched.",
    html: app(resultsPanel(LM, "Full graph", btw({ open: true, trail: `<span class="k-secondary k-num">10:12</span>`, sub: `<span class="k-num">Run 1.</span> ${outOfDate}` }), lmCatalog()),
        canvas({ img: lmImg("all"), alt: "", legend: groupLegend() }) + table({ scope: "Full graph: 77 nodes. Sorted by betweenness.", cols: lmCols("betweenness", "Out of date"), rows: wrong }),
        right(graphRow, lmStats()), 1) +
        at(FORMX, FORMY, btwForm({ choice: "similarity", focus: true, verb: "Re-run (keeps Run 1)", top: topNodes(N.asDistance, "Top nodes, Run 1 (Distance = value)") })),
    notes: [[570, 150, "Result editor: interaction-pattern-entries 6.2; the same form as the run; its verb is Re-run. compact-mantine: Popout, FieldRow, Select."], [570, 560, "Out of date and its one verb Re-run (keeps Run 1) (glossary 10; interaction-pattern-entries 7.2). The table's column header carries the state too (7.2 Feedback); old values stay until the new run lands (7.1). Undo label 'Change weight meaning' (content-design 3)."]],
});
a.push({
    id: "a6", title: "Re-run: the ranking the data supports",
    sub: `Read as a closer link, strong ties are short. Marius climbs from ${ord(N.rankAsDistance.Marius)} to ${ord(N.rankAsSimilarity.Marius)}; Javert falls from ${ord(N.rankAsDistance.Javert)} to ${ord(N.rankAsSimilarity.Javert)}. Run 2's state line names the new conversion, Distance = 1 / value; Run 1 stays in the list under it with its own.`,
    html: app(resultsPanel(LM, "Full graph", btw({ trail: `<span class="k-secondary k-num">10:15</span>`, sub: `<span class="k-num">Run 2.</span> ${reading("similarity")}` }) + btw({ trail: `<span class="k-secondary k-num">10:12</span>`, sub: `<span class="k-num">Run 1.</span> ${reading("distance")}` }), lmCatalog()),
        canvas({ img: lmImg("all"), alt: "", legend: groupLegend() }) + table({ scope: "Full graph: 77 nodes. Sorted by betweenness, Run 2.", cols: lmCols("betweenness", `0 to ${N.asSimilarity[0].value}`), rows: right_ }),
        right(graphRow, lmStats())),
    notes: [[770, 620, "Numbers: screens/failure-and-recovery-numbers.py (NetworkX betweenness, 1/value lengths). Undo label of the run: 'Re-run betweenness'."]],
});
page("weight-role-trap.html", "The quiet trap: a weight read the wrong way", "Les Miserables, 77 characters and 254 co-appearances. The edge column value counts shared scenes. Read as a length it gives a believable, wrong betweenness ranking with no error. What a bigger value means is asked by each run, never set on the column. Six states: the load step, the run's question, its answers, the wrong result, the change and the re-run.", a);

// ---------------------------------------------------------------- B: the variant trap
const f1Stats = lmStats({ role: "similarity", nodes: String(WV.nodes), edges: `${WV.edges} of ${N.full.edges}`, comps: String(WV.components), iso: String(WV.isolated) });
const f1Chip = "76 of 77 nodes &middot; 1 step";
const btwF1 = btw({ sub: reading("similarity") });
const b = [];
b.push({
    id: "b1", title: "Closeness names its formula before it runs",
    sub: `Alex has filtered out Valjean. Without him the graph falls into ${WV.components} components: the bishop's household of ${WV.household} is cut off, and ${WV.alone} characters are left alone. The Catalog row carries the variant closeness will use; its tooltip says why, before any click.`,
    html: app(resultsPanel(LM, f1Chip, btwF1, lmCatalog(true, `<span class="fr-mark">WF-corrected</span>`)),
        canvas({ img: lmImg("f1"), alt: "Les Miserables without Valjean, 76 characters", legend: groupLegend() }) + table({ scope: "Filtered graph: 76 of 77 nodes. Sorted by degree.", cols: lmCols("closeness", ""), rows: [lmRow("Gavroche", 8, 21, ""), lmRow("Marius", 8, 18, ""), lmRow("Javert", 4, 16, ""), lmRow("Thenardier", 4, 15, ""), lmRow("Enjolras", 8, 14, ""), lmRow("Fantine", 3, 14, "")] }),
        right(graphRow, f1Stats)) +
        at(683, 150, `<div class="k-tooltip" style="position:static;max-width:260px"${sb("tip")}><b>Closeness</b><br><span class="k-secondary">${WV.components} components: each score is scaled by the share of the graph the node can reach (Wasserman-Faust).</span></div>`),
    notes: [[580, 330, "A variant is named before the run: principles 1 (the mark form, on the run control); on a Catalog row it is its plain word, dotted-underlined as a control (proposed, 'a variant word and a violated precondition look different'). compact-mantine: ActionRow trailing slot, TooltipShortcut. Whether 'WF-corrected' means anything to an operations analyst is a study probe, not assumed."]],
});
const wfRows = N.withoutValjean.closenessWF.map((r) => lmRow(r.label, r.group, r.degree, r.value));
b.push({
    id: "b2", title: "The result's name carries the variant, and the word is a control",
    sub: `Closeness (WF-corrected): ${WV.closenessWF.slice(0, 5).map((x) => x.label).join(", ")}. The bishop's household sits low: Myriel is ${ord(WV.myriel.rank)}, at ${WV.myriel.value}. The name is the column header too. Clicking the variant word offers the one alternative that needs no correction, Harmonic centrality, as a new sibling result.`,
    html: app(resultsPanel(LM, f1Chip, btwF1 + res({ name: "Closeness", variant: "(WF-corrected)", id: "closeres", sub: reading("similarity") }), lmCatalog()),
        canvas({ img: lmImg("f1"), alt: "", legend: groupLegend() }) + table({ scope: "Filtered graph: 76 of 77 nodes. Sorted by closeness (WF-corrected).", cols: lmCols("closeness (WF-corrected)", `0 to ${WV.closenessWF[0].value}`), rows: wfRows }),
        right(graphRow, f1Stats)) +
        at(955, 400, `<div class="k-menu" style="position:static;min-width:236px"${sb("variantmenu")}><div class="k-menu-label">Scaled for ${WV.components} components</div><div class="k-menu-item" data-hover><span class="k-check-col"></span>Harmonic centrality</div></div>`),
    notes: [[400, 330, "Variant word as a control: principles 1 ('closeness (WF-corrected)' offers Harmonic centrality); graph-conventions 2. compact-mantine: ContextMenu with one item."], [770, 620, "Values near and above 1: the lengths are 1 / value, under 1 for every tie of 2 or more scenes. Numbers: screens/failure-and-recovery-numbers.py, 'B'."]],
});
page("closeness-variant.html", "The variant trap: closeness on a graph in pieces", `Les Miserables with Valjean filtered out: ${WV.nodes} characters in ${WV.components} components. Closeness then needs a correction, and without it the bishop's cut-off household of ${WV.household} would rank first. The name of the result says which formula it used.`, b);

// ---------------------------------------------------------------- C: the wrong middle step
const c = [];
const cRows60 = N.allThreeSteps.betweenness.map((r) => lmRow(r.label, r.group, r.degree, r.value));
const cRows75 = N.largestOff.betweenness.map((r) => lmRow(r.label, r.group, r.degree, r.value));
const LC = "Filter to Largest component";
const VJ = "label = Valjean", JV = "label = Javert";
// A filter step row, as the filter-chip mock draws it: the checkbox, the outcome word in secondary
// text, the rule, and the number of nodes left after the step ('--' while it is off).
const step = (outcome, rule, left, { off = false, hover = false, focus = false } = {}) => `<li class="k-item fr-step${focus ? " fr-focus" : ""}"${off ? " data-off" : ""}${hover ? " data-hover" : ""}${sb(rule === "Largest component" ? "lcstep" : "")}><span class="k-check"${off ? "" : ' aria-checked="true"'}></span><span class="k-grow k-ellipsis"><span class="k-secondary">${outcome}</span> ${rule}</span><span class="k-trail k-num">${off ? "--" : left}</span></li>`;
const stepsPop = (rows, z = 80) => `<div class="fr-abs" style="left:66px;top:58px;z-index:${z}"><div class="k-popover" style="position:static;width:240px"${sb("steps")}><div class="k-popover-head">Filter steps<span class="k-grow"></span><span class="k-icon-btn">${I("x")}</span></div><div class="k-popover-body"><ul class="k-list">${rows}</ul><div class="k-row k-secondary">${I("plus", "k-i-sm")}Add step</div></div></div></div>`;
const stats60 = lmStats({ role: "similarity", nodes: String(N.allThreeSteps.nodes), edges: `${N.allThreeSteps.edges} of ${N.full.edges}`, comps: String(N.allThreeSteps.components), iso: String(N.allThreeSteps.isolated) });
const stats75 = lmStats({ role: "similarity", nodes: String(N.largestOff.nodes), edges: `${N.largestOff.edges} of ${N.full.edges}`, comps: String(N.largestOff.components), iso: String(N.largestOff.isolated) });
const lmBtwTable = (scope, profile, rows) => table({ scope, cols: lmCols("betweenness", profile), rows });
const on60 = `<span class="fr-state-word">on 60 of 77</span><span class="k-grow"></span><span class="k-btn k-btn-secondary"${sb("rerun")}>Re-run</span>`;
c.push({
    id: "c1", title: "Fewer characters than expected",
    sub: `Alex asked who holds the story together without Valjean and Javert. The chip says ${N.allThreeSteps.nodes} of ${N.full.nodes} nodes, 3 steps, not the ${N.largestOff.nodes} he expected, and ${N.allThreeSteps.betweenness[1].label} is second.`,
    html: app(resultsPanel(LM, "60 of 77 nodes &middot; 3 steps", btw({ sub: reading("similarity") }), lmCatalog()),
        canvas({ img: lmImg("f123"), alt: "Les Miserables, 60 of 77 characters", legend: groupLegend() }) + lmBtwTable("Filtered graph: 60 of 77 nodes. Sorted by betweenness.", `0 to ${N.allThreeSteps.betweenness[0].value}`, cRows60),
        right(graphRow, stats60)),
    notes: [[90, 64, "Filter chip: message graphty.filter.chip, with the step count the studio proposes ('the chip carries both counts, and drops words to fit'): 'Filtered:' is the first word dropped when the text does not fit, as here; principles 1 (the chip alone marks the node count, so Statistics shows Nodes as 60 and only Edges carries its 'of'). compact-mantine: missing (interface-specification 7.3).", 280], [770, 620, "Scope line: message graphty.table.scope. Every centrality here is on 60 nodes."]],
});
c.push({
    id: "c2", title: `The steps say where the ${N.largestOff.nodes - N.allThreeSteps.nodes} went`,
    sub: `The chip opens its three steps, each with the number of nodes left after it: ${WV.nodes}, ${WV.nodes - WV.leftOutByLargest}, ${N.allThreeSteps.nodes}. Filter to Largest component, meant to drop the ${WV.alone} characters left alone once Valjean was gone, also took the bishop's household of ${WV.household}, cut off by the same removal; its tooltip names whom.`,
    html: app(resultsPanel(LM, "60 of 77 nodes &middot; 3 steps", btw({ sub: reading("similarity") }), lmCatalog(), true),
        canvas({ img: lmImg("f123"), alt: "", legend: groupLegend() }) + lmBtwTable("Filtered graph: 60 of 77 nodes. Sorted by betweenness.", `0 to ${N.allThreeSteps.betweenness[0].value}`, cRows60),
        right(graphRow, stats60)) +
        stepsPop(step("Filter out", VJ, 76) + step("Filter to", "Largest component", 61, { hover: true }) + step("Filter out", JV, 60)) +
        at(312, 124, `<div class="k-tooltip" style="position:static;max-width:280px"${sb("tip")}>61 left. Took out 15: Myriel, Mlle.Baptistine, Mme.Magloire, Champtercier, Count and 10 more</div>`),
    notes: [[680, 60, "Filter steps: a Tree row per step with its checkbox (interaction-pattern-entries 6.5, 6.9); the count left after each step and the Took out tooltip are the studio's proposal ('the step row carries one count, and names what it took out on hover'), read from the element's per-step membership (implementation-mapping 6). compact-mantine: Popout, Tree, CompactCheckboxIcon."], [680, 220, "The step's name is the command that made it, content-design 3 ({Verb} {object}): the outcome word and the rule, the same words in the list, the undo labels and Undo history."]],
});
const editMenu = ({ undo, redo = "", history = false, prev = true, prevHover = false, redoHover = false, extras = "" }) => at(60, 8, `<div class="k-menu" style="position:static;min-width:190px"><div class="k-menu-item"><span class="k-check-col"></span>Quick actions...<span class="k-shortcut">Ctrl+K</span></div><div class="k-menu-sep"></div><div class="k-menu-item"><span class="k-check-col"></span>File<span class="k-sub">${I("chevron-right", "k-i-sm")}</span></div><div class="k-menu-item" data-hover><span class="k-check-col"></span>Edit<span class="k-sub">${I("chevron-right", "k-i-sm")}</span></div><div class="k-menu-item"><span class="k-check-col"></span>View<span class="k-sub">${I("chevron-right", "k-i-sm")}</span></div><div class="k-menu-item"><span class="k-check-col"></span>Selection<span class="k-sub">${I("chevron-right", "k-i-sm")}</span></div><div class="k-menu-item"><span class="k-check-col"></span>Algorithms<span class="k-sub">${I("chevron-right", "k-i-sm")}</span></div><div class="k-menu-item"><span class="k-check-col"></span>Recipes<span class="k-sub">${I("chevron-right", "k-i-sm")}</span></div><div class="k-menu-sep"></div><div class="k-menu-item"><span class="k-check-col"></span>Preferences...</div><div class="k-menu-item"><span class="k-check-col"></span>Help<span class="k-sub">${I("chevron-right", "k-i-sm")}</span></div></div>`) +
    at(252, 65, `<div class="k-menu" style="position:static;min-width:300px"${sb("menu")}><div class="k-menu-item"${sb("undo")}><span class="k-check-col"></span>${undo}<span class="k-shortcut">Ctrl+Z</span></div><div class="k-menu-item"${redo ? (redoHover ? " data-hover" : "") : ' aria-disabled="true"'}${sb("redo")}><span class="k-check-col"></span>${redo || "Redo"}<span class="k-shortcut">Ctrl+Shift+Z</span></div><div class="k-menu-item"${history ? " data-hover" : ""}><span class="k-check-col"></span>Undo history<span class="k-sub">${I("chevron-right", "k-i-sm")}</span></div><div class="k-menu-sep"></div><div class="k-menu-item"><span class="k-check-col"></span>Select all<span class="k-shortcut">Ctrl+A</span></div><div class="k-menu-item"><span class="k-check-col"></span>Copy ids</div></div>`) + extras;
c.push({
    id: "c3", title: "Undo walks back from the newest change, not from the wrong one",
    sub: "Edit names the next undo: Undo Re-run betweenness. The wrong step is third from the top, so undoing back to it also throws away Filter out label = Javert and the run. Undo history, a temporary list, shows that order; the labels alone say the same thing one press at a time.",
    html: app(resultsPanel(LM, "60 of 77 nodes &middot; 3 steps", btw({ sub: reading("similarity") }), lmCatalog()),
        canvas({ img: lmImg("f123"), alt: "", legend: groupLegend() }) + lmBtwTable("Filtered graph: 60 of 77 nodes. Sorted by betweenness.", `0 to ${N.allThreeSteps.betweenness[0].value}`, cRows60),
        right(graphRow, stats60)) +
        editMenu({ undo: "Undo Re-run betweenness", history: true, prev: false, extras: at(556, 113, `<div class="k-menu" style="position:static;min-width:260px"${sb("history")}>${[["Re-run betweenness"], [`Filter out ${JV}`], [LC, true], [`Filter out ${VJ}`]].map(([name, hover], i) => `<div class="k-menu-item" data-described${hover ? " data-hover" : ""}><span class="k-check-col"></span><span class="k-grow">${name}</span></div>`).join("")}</div>`) }),
    notes: [[850, 60, "Undo label reads history.nextUndo (interaction-patterns 3.4; content-design 3). compact-mantine: ContextMenu, TooltipShortcut."], [850, 180, "Undo history is temporary: it stays only until graphty-element restores a canceled run on Redo, then it is removed (glossary, Undo history; decided-doors). Figma has no such list. Nothing in this branch depends on it: pressing Undo three times, each press labeled, reaches the same state."]],
});
c.push({
    id: "c4", title: "Way back: turn the middle step off",
    sub: "One click on its checkbox. The step stays in the list with -- for its count; the rows below it recount and the chip reads 75 of 77, 2 of 3 steps, at once. Betweenness keeps its scope and says so: on 60 of 77, with Re-run. Undo label: Turn off step Filter to Largest component.",
    html: app(resultsPanel(LM, "75 of 77 nodes &middot; 2 of 3 steps", btw({ sub: on60 }), lmCatalog(), true),
        canvas({ img: lmImg("f13"), alt: "Les Miserables, 75 of 77 characters", legend: groupLegend() }) + lmBtwTable("Filtered graph: 75 of 77 nodes. Sorted by betweenness.", "on 60 of 77", cRows60),
        right(graphRow, stats75)) +
        stepsPop(step("Filter out", VJ, 76) + step("Filter to", "Largest component", 0, { off: true, focus: true }) + step("Filter out", JV, 75)),
    notes: [[680, 60, "Row toggle: interaction-pattern-entries 6.5, a filter step's checkbox (not an eye) turns it off and keeps it; one undo step."], [320, 330, "Scope, not freshness: a run keeps its scope after a filter change (principles 1 'Decides'). 'on 60 of 77' is not Out of date, so its row carries no mark. compact-mantine: ActionRow state slot."], [770, 640, "Myriel and the 14 others are back in the table, with no betweenness value until Re-run."]],
});
c.push({
    id: "c5", title: "Or delete it: the step is gone, in sight",
    sub: "With the step's row focused, Delete removes it at once, no question. The list closes up to two steps, focus moves to the next row, and the chip reads 75 of 77. Everything happened in sight, so there is no notice.",
    html: app(resultsPanel(LM, "75 of 77 nodes &middot; 2 steps", btw({ sub: on60 }), lmCatalog(), true),
        canvas({ img: lmImg("f13"), alt: "", legend: groupLegend() }) + lmBtwTable("Filtered graph: 75 of 77 nodes. Sorted by betweenness.", "on 60 of 77", cRows60),
        right(graphRow, stats75)) +
        stepsPop(step("Filter out", VJ, 76) + step("Filter out", JV, 75, { focus: true })),
    notes: [[680, 60, "Delete: interaction-pattern-entries 6.4, removes at once, no question; a notice only when out of sight or dependents were detached. Focus moves to the next row."], [680, 200, "Undo label now 'Undo Delete step Filter to Largest component' (content-design 3), shown in the next state."]],
});
c.push({
    id: "c5e", title: "The same moment in Edit: the delete has its own way back",
    sub: "Edit now reads Undo Delete step Filter to Largest component.",
    html: app(resultsPanel(LM, "75 of 77 nodes &middot; 2 steps", btw({ sub: on60 }), lmCatalog()),
        canvas({ img: lmImg("f13"), alt: "", legend: groupLegend() }) + lmBtwTable("Filtered graph: 75 of 77 nodes. Sorted by betweenness.", "on 60 of 77", cRows60),
        right(graphRow, stats75)) +
        editMenu({ undo: `Undo Delete step ${LC}`, prev: false }),
    notes: [[600, 60, "Undo label per content-design 3: 'Undo {name}'. compact-mantine: ContextMenu."]],
});
// The undo line (kit toast, message graphty.undo.done): it clears when the reader moves to another
// node or another filter step, not on "the next action".
const undoLine = (text) => `<div class="k-toast" role="status" aria-live="polite"${sb("undoline")}>${text}<span class="k-toast-action" role="button" tabindex="0">Show in steps</span></div>`;
c.push({
    id: "c5u", title: "Undo puts the step back, and one line says so",
    sub: `He presses Ctrl+Z to be sure the delete can come back. ${LC} is back in the list, the chip reads ${N.allThreeSteps.nodes} of ${N.full.nodes}, 3 steps, and betweenness is current again. One line above the toolbar names what was reversed, with Show in steps. It stays while he stays on this step, even through other clicks.`,
    html: app(resultsPanel(LM, "60 of 77 nodes &middot; 3 steps", btw({ sub: reading("similarity") }), lmCatalog()),
        canvas({ img: lmImg("f123"), alt: "", legend: groupLegend(), toast: undoLine(`Undone: Delete step ${LC}`) }) + lmBtwTable("Filtered graph: 60 of 77 nodes. Sorted by betweenness.", `0 to ${N.allThreeSteps.betweenness[0].value}`, cRows60),
        right(graphRow, stats60)),
    notes: [[560, 640, "Undo line: message graphty.undo.done, announced politely, never takes focus. It clears when the reader moves to another node or another filter step; Show in steps opens the list at this step's row, which does not clear it. The rule 'until the next action' is gone: in alert triage one alert's line greeted the next alert. compact-mantine: Notification (kit toast)."]],
});
c.push({
    id: "c5m", title: "He moves to another step: the line clears",
    sub: `He opens the list and moves to Filter out ${JV}. The line is gone: it named a change to the step he left, so it does not follow him. Edit still offers Redo Delete step ${LC}, and Delete on the middle row does it again.`,
    html: app(resultsPanel(LM, "60 of 77 nodes &middot; 3 steps", btw({ sub: reading("similarity") }), lmCatalog(), true),
        canvas({ img: lmImg("f123"), alt: "", legend: groupLegend() }) + lmBtwTable("Filtered graph: 60 of 77 nodes. Sorted by betweenness.", `0 to ${N.allThreeSteps.betweenness[0].value}`, cRows60),
        right(graphRow, stats60)) +
        stepsPop(step("Filter out", VJ, 76) + step("Filter to", "Largest component", 61) + step("Filter out", JV, 60, { focus: true })),
    notes: [[680, 60, "Moving to another filter step (or selecting another node) clears the undo line. Redo stays on Edit and its keys, so nothing is lost with the line."]],
});
c.push({
    id: "c6", title: "Re-run on the graph he meant",
    sub: "He deletes the middle step again and presses Re-run. 75 characters. The order holds, Marius first, but every value is lower: on 60 nodes each path was shared among fewer pairs. The numbers now describe the question he asked.",
    html: app(resultsPanel(LM, "75 of 77 nodes &middot; 2 steps", btw({ sub: reading("similarity") }), lmCatalog()),
        canvas({ img: lmImg("f13"), alt: "", legend: groupLegend() }) + lmBtwTable("Filtered graph: 75 of 77 nodes. Sorted by betweenness.", `0 to ${N.largestOff.betweenness[0].value}`, cRows75),
        right(graphRow, stats75)),
    notes: [[770, 620, "Numbers: screens/failure-and-recovery-numbers.py, 'Largest component off'."]],
});
// The export preview: the open step's edges, heaviest first, from the published graph.
const lmEdges = (() => {
    const raw = JSON.parse(readFileSync(join(proto, "../../../graph-io/test/corpus/json/miserables.json"), "utf8"));
    const nm = raw.nodes.map((n) => n.name);
    // The published edge list, as kit/gen-canvas.mjs reads it: Old Man's edge goes to Myriel.
    const out = raw.links.map((l) => ({ s: l.source === l.target && nm[l.source] === "Myriel" ? "OldMan" : nm[l.source], t: nm[l.target], w: l.value })).filter((e) => ![e.s, e.t].some((n) => n === "Valjean" || n === "Javert"));
    if (out.length !== N.largestOff.edges) throw new Error(`edges without Valjean and Javert: ${out.length}, fixtures say ${N.largestOff.edges}`);
    return out.sort((a, b) => b.w - a.w);
})();
c.push({
    id: "c7", title: "Export with a step open: the step's edges come first",
    sub: `The list is open on Filter out ${JV}. He opens Export. Table (.csv) is already on its Edges tab and starts from that step: ${N.largestOff.edges} of ${N.full.edges} rows, filtered, among ${N.largestOff.nodes} characters, previewed before anything is written. The whole graph and the selection are one choice away in From.`,
    html: app(resultsPanel(LM, "75 of 77 nodes &middot; 2 steps", btw({ sub: reading("similarity") }), lmCatalog(), true),
        canvas({ img: lmImg("f13"), alt: "", legend: groupLegend() }) + lmBtwTable("Filtered graph: 75 of 77 nodes. Sorted by betweenness.", `0 to ${N.largestOff.betweenness[0].value}`, cRows75),
        right(graphRow, stats75)) +
        stepsPop(step("Filter out", VJ, 76) + step("Filter out", JV, 75, { focus: true }), 60) +
        `<div class="k-backdrop"><div class="k-modal k-modal-wide"${sb("export")}><div class="k-modal-head">Export<span class="k-grow"></span><span class="k-icon-btn">${I("x")}</span></div><div class="k-modal-body"><section class="k-section"><div class="k-section-head"><span class="k-check" aria-checked="true"></span>&nbsp;Table (.csv)</div><div class="k-fieldrow"><span class="k-legend">Tab</span><div class="k-fields" style="grid-template-columns:1fr"><span class="k-seg k-seg-fill"><span>Nodes</span><span aria-pressed="true">Edges</span></span></div></div><div class="k-fieldrow"><span class="k-legend">From</span><div class="k-fields" style="grid-template-columns:1fr"><span class="k-field">2 filter steps, through Filter out ${JV}${I("chevron-down", "k-i-sm k-caret")}</span></div></div><div class="k-fieldrow"><span class="k-legend">Rows</span><div class="k-fields" style="grid-template-columns:1fr"><span class="k-fact k-num">${N.largestOff.edges} of ${N.full.edges} rows, filtered</span></div></div><div class="k-fieldrow"><span class="k-legend">Methods</span><div class="k-fields" style="grid-template-columns:1fr"><span>Always written beside it</span></div></div><div class="k-table-wrap" style="margin:0 16px 8px;border:1px solid var(--cm-border);border-radius:4px"><table class="k-table"><thead><tr><th>source</th><th>target</th><th class="k-n">value</th></tr></thead><tbody>${lmEdges.slice(0, 5).map((e) => `<tr><td class="k-id">${e.s}</td><td class="k-id">${e.t}</td><td class="k-n">${e.w}</td></tr>`).join("")}<tr><td class="k-secondary" colspan="3">and ${lmEdges.length - 5} more</td></tr></tbody></table></div></section><section class="k-section"><div class="k-section-head"><span class="k-check"></span>&nbsp;Findings report (.html)</div></section></div><div class="k-modal-foot"><span class="k-grow"></span><span class="k-btn k-btn-secondary">Cancel</span><span class="k-btn">Export</span></div></div></div>`,
    notes: [[900, 60, "The same Export dialog as screens/export-dialog.html, its Table (.csv) row: From defaults to the open filter step when a step is open; otherwise to the selection, then the whole graph. Rows are stated first, the methods file is always written beside it. compact-mantine: Modal, SegmentedControl, Select, Table."]],
});
page("filter-step-recovery.html", "The wrong middle step: three ways back", "Three filter steps on Les Miserables. The middle one, Filter to Largest component, did more than intended because of the step before it. The ways back are turning the step off, deleting it, and undo; undo's line clears when he moves to another step, and Export starts from the step he has open.", c);

// ---------------------------------------------------------------- D: GPU lost, costly run canceled
// Drawn on the Results rail place (screens/navigation.html): the panel lists every run of a measure,
// newest first, each named by the options that differ plus its date; opening a run shows its record
// in place of the list, with a way back.
const CT = "Patent citations";
const cit = fx.citations;
const notDrawn = `<div class="k-notdrawn" style="border:0;margin:0;padding:0">${cit.notDrawnLine}. <a>Narrow the graph...</a></div>`;
const citRight = (engine) => right(`${I("network")}<span class="k-name">Citations</span><span class="k-secondary">Graph</span>`,
    sec("Statistics", data("Nodes", "124,318") + data("Edges", "1,480,221") + data("Direction", "directed") + data("Components", "not computed") + data("Engine", engine)));
const citMain = (toast = "") => canvas({ legend: notDrawn, toast });
const runsHead = `<div class="k-panel-head"><div class="k-title-line"><span class="k-project">${CT}</span><span class="k-icon-btn" aria-label="Project menu">${I("chevron-down", "k-i-sm")}</span></div><a class="k-privacy">Nothing has been sent from this project</a><span class="k-chip k-chip-btn" role="button" aria-expanded="false"${sb("chip")}>${I("funnel", "k-i-sm")}Full graph${I("chevron-down", "k-i-sm k-caret")}</span></div>`;
// The list: every run, newest first. A row is name, date, then its state or settings line.
// A row with its own buttons is not itself a button (a control may not hold controls): its name opens the record.
const run = ({ name, date, sub = "", acts = "", focus = false, hover = false, id = "" }) => `<div class="fr-run${focus ? " fr-focus" : ""}"${acts ? "" : ' role="button"'}${hover ? " data-hover" : ""}${sb(id)}>${I("flask-conical")}<span class="k-ellipsis"${acts ? ' role="button"' : ""}>${name}</span><span class="fr-run-sub"><span class="k-num">${date}.</span> ${sub}</span>${acts ? `<span class="fr-run-acts">${acts}</span>` : ""}</div>`;
const runsPanel = (rows) => `<aside class="k-panel" aria-label="Results">${runsHead}<div class="fr-title">Results<span class="k-grow"></span><span class="k-btn k-btn-secondary">${I("plus", "k-i-sm")}Run a measure...</span></div><div class="k-scroll"><div class="fr-cap k-secondary">Every run of a measure, with its settings and date.</div><section class="k-section"><div class="k-section-head">Newest first</div>${rows}</section></div></aside>`;
// A run's record, opened in place of the list. Its one commit verb leads the actions row.
const record = (name, date, body, when = "Started") => `<aside class="k-panel" aria-label="Results">${runsHead}<div class="fr-title"${sb("editor")}><span class="k-icon-btn" role="button" aria-label="Back to Results">${I("arrow-left")}</span><span class="k-ellipsis">${name}</span></div><div class="k-scroll"><div class="fr-cap k-secondary k-num">${when} ${date}</div>${body}</div></aside>`;
const acts = (...btns) => `<div class="fr-acts">${btns.join("")}</div>`;
const tryGpu = (extra = "") => `<span class="k-btn k-btn-secondary" data-tip="Asks the browser for the GPU again. If it answers, the next run uses WebGPU; nothing is re-run by itself."${extra}${sb("trygpu")}>${I("refresh-cw", "k-i-sm")}Try WebGPU again</span>`;
const SHOWING = "Showing Run 1 (damping 0.85). Run 2 wrote nothing.";
const inDegree = run({ name: "In-degree", date: "27 Sep, 16:40", sub: "Full graph. CPU." });
const pr1 = run({ name: "PageRank, damping 0.85", date: "today, 09:40", sub: "Run 1. Full graph. WebGPU." });
const pr3 = run({ name: "PageRank, damping 0.5", date: "today, 10:22", sub: "Run 3. Full graph. CPU." });
const refusedRow = run({ name: "Betweenness", date: "today, 10:31", sub: "Not run: would take hours.", id: "refused" });
const sampledRow = (o) => run({ name: `Betweenness <span class="fr-variant">(sampled)</span>`, date: "today, 10:32", id: "sampled", ...o });
const d = [];
d.push({
    id: "d1", title: "A re-run on WebGPU, the old values still shown",
    sub: "Emma set damping to 0.5 and pressed Re-run. The run's record is open in Results: progress, the engine, and Cancel as its one verb. Run 1's values stay in the inspector and the table until Run 2 lands, and the record says whose they are. The one running notice repeats the run over the canvas.",
    html: app(record("PageRank, damping 0.5", "today, 10:14",
        `<div class="k-prose">Running, 62%, on: full graph, 124,318 nodes. WebGPU.</div><div class="fr-cap"><div class="k-progress"><i style="width:62%"></i></div></div>${acts(`<span class="k-btn k-btn-secondary">Cancel</span>`)}
        <section class="k-section"><div class="k-section-head">Settings</div><div class="k-fieldrow"><span class="k-legend">Damping</span><div class="k-fields"><span class="k-field k-num">0.5</span></div></div><div class="fr-cap"${sb("kept")}>Showing Run 1 (damping 0.85) until this run finishes.</div><div class="k-row k-secondary">Details${I("chevron-right", "k-i-sm")}</div></section>`),
        citMain(`<div class="k-toast">Running PageRank<div class="k-progress"><i style="width:62%"></i></div><span class="k-toast-action">Cancel</span></div>`),
        citRight("WebGPU")),
    notes: [[320, 110, "Running result: state-matrix 3 (Result row, Running: progress, the engine; the previous value visible); interaction-pattern-entries 7.1. The run's record opens in place in Results (the rail place); its one verb (Cancel) leads the actions row. compact-mantine: Progress, Button."], [320, 300, "'Showing Run 1 (damping 0.85)' names whose values are shown, by run number and the option that differs."], [560, 700, "Running notice: interaction-patterns 3.5, the one toast slot. compact-mantine: Toast."], [1000, 40, "Past the node drawing limit nothing is drawn; the not-drawn line is the only canvas text (state-matrix 4.2)."]],
});
d.push({
    id: "d2", title: "The GPU is lost: a failed run, never a quiet CPU finish",
    sub: "The browser dropped the WebGPU device mid-run. The record gives the cause and says whose values are on screen: Run 1's, because Run 2 wrote nothing. Re-run on CPU names the path the next run takes, and its tooltip gives the cost. Try WebGPU again asks graphty-element to reach the GPU again; it re-runs nothing by itself. The code is the last line of Details.",
    html: app(record("PageRank, damping 0.5", "today, 10:14",
        `<div class="fr-error"><b>Could not run PageRank: WebGPU lost; new runs use the CPU.</b></div><div class="fr-cap k-strong"${sb("kept")}>${SHOWING}</div>${acts(`<span class="k-btn" data-hover data-tip="Takes a few minutes on the CPU"${sb("rerunbtn")}>Re-run on CPU</span>`, tryGpu())}
        <section class="k-section"><div class="k-section-head">Settings</div><div class="k-fieldrow"><span class="k-legend">Damping</span><div class="k-fields"><span class="k-field k-num">0.5</span></div></div>
        <div class="k-row k-secondary">Details${I("chevron-down", "k-i-sm")}</div>${data("Engine", "CPU; WebGPU lost")}${data("Run 2", "failed at 62%")}${data("Code", '<span class="k-mono">E_DEVICE_LOST</span>')}</section>`),
        citMain(), citRight("CPU; WebGPU lost")) +
        at(176, 258, `<div class="k-tooltip" style="position:static;white-space:nowrap">Takes a few minutes on the CPU</div>`),
    notes: [[320, 110, "Error at the smallest scope: interaction-pattern-entries 8.1 (a GPU failure never finishes on the CPU; Re-run names its path, glossary 9). Cause: message-catalog graphty.cause.E_DEVICE_LOST. compact-mantine: the FieldRow error slot; Button with Tooltip."], [320, 250, "Try WebGPU again is graphty-element's retry of the device, not a fallback: the app shows the button and the element decides. If the GPU answers, Statistics reads Engine: WebGPU and the next run uses it."], [320, 400, "The raw code sits at the end of Details (content-design 4, Errors). Engine line: message graphty.capability.engine."]],
});
d.push({
    id: "d2b", title: "The record closed: the row alone says whose values are shown",
    sub: "Emma goes back to the list before deciding. The failed run's row keeps its cause and the same line, 'Showing Run 1 (damping 0.85). Run 2 wrote nothing.', with both verbs on the row, so the list answers the question without opening anything.",
    html: app(runsPanel(run({ name: "PageRank, damping 0.5", date: "today, 10:14", id: "pr", focus: true, sub: `<span class="fr-state-word k-danger">${I("circle-x", "k-i-sm")}Failed: WebGPU lost</span><br><span${sb("kept")}>${SHOWING}</span>`, acts: `<span class="k-btn k-btn-secondary" data-tip="Takes a few minutes on the CPU">Re-run on CPU</span>${tryGpu()}` }) + pr1 + inDegree),
        citMain(), citRight("CPU; WebGPU lost")),
    notes: [[320, 150, "With the record closed the verbs are on the row (proposed, 'while a result's editor is open, its one verb is in the editor's header'). The line under Failed is the same words as in the record."], [320, 300, "Results is open, so the rail's failed mark is cleared (proposed, 'An unseen failure marks the Results rail button')."]],
});
const routes = `<div class="fr-routes"${sb("routes")}><div class="fr-sub-head">Fits the time limit</div><div class="k-row fr-route fr-focus" aria-selected="true"><span class="k-ellipsis k-grow">Sampled, ${K} sources</span><span class="k-secondary">under a minute</span></div><div class="k-row fr-route"><span class="k-grow">Exact, on the 5,318 nodes in Drug patents granted in 2001.<br><span class="k-secondary">This is a different graph.</span></span><span class="k-secondary">under a minute</span></div><div class="fr-sub-head">Past the time limit</div><div class="k-row fr-route"><span class="k-ellipsis k-grow">Exact, on the full graph</span><span class="k-secondary">hours</span></div></div>`;
d.push({
    id: "d3", title: "A costly run is refused before it starts",
    sub: "PageRank has re-run on the CPU as Run 3. Emma asks for Betweenness. With WebGPU lost every run goes to the CPU, where the element estimates exact betweenness at hours, past the 30-second time limit. The run is not started; its record lists the ways forward cheapest first. The first, Sampled, is the default: it is focused, the one verb names it, and Enter runs it. Try WebGPU again sits beside the cause, because the GPU is what made it hours.",
    html: app(record("Betweenness", "today, 10:31",
        `<div class="fr-error fr-refused"><b>Not run: would take hours. The time limit is 30 seconds.</b><span class="k-secondary">Engine: CPU; WebGPU lost</span>${tryGpu()}</div>${acts(`<span class="k-btn">Run sampled</span>`)}${routes}`, "Asked"),
        citMain(), citRight("CPU; WebGPU lost")),
    notes: [[320, 150, "Refused by the gate: state-matrix 3, Result row, with Run exactly, the sampled method and the fitting scopes, each with its band. Cheapest first, focus on the first route, so Sampled is the default. compact-mantine: ActionRow routes, Button."], [320, 400, "The fitting scope here is a kept set that fits the time limit (the fixture's 'Drug patents granted in 2001', 5,318 nodes). The cap is a setting, so a clock time is allowed there. No clock estimate for the run itself."]],
});
d.push({
    id: "d4", title: "The sampled run starts at once; Emma cancels it from the notice",
    sub: `Enter ran the default. Betweenness (sampled) runs at once on the CPU, ${K} sources. Her own baseline for this graph used ${KBIG.k} sources, and the refusal offered only the default sample size, so she cancels from the running notice to set it.`,
    html: app(runsPanel(sampledRow({ sub: `<span class="fr-state-word k-num">18%.</span> <span class="k-secondary">${K} sources. CPU.</span>`, acts: `<span class="k-btn k-btn-secondary">Cancel</span>` }) + refusedRow + pr3 + pr1 + inDegree),
        citMain(`<div class="k-toast">Running Betweenness (sampled)<div class="k-progress"><i style="width:18%"></i></div><span class="k-toast-action">Cancel</span></div>`),
        citRight("CPU; WebGPU lost")) + `<span class="k-cursor" style="left:896px;top:808px"></span>`,
    notes: [[320, 330, "Run sampled creates the sibling result 'Betweenness (sampled)' and runs it (proposed). The variant word is part of the name (principles 1). The refused run stays in the list as Not run, with no failure mark."], [980, 690, "Cancel discards the run and leaves no undo step (interaction-pattern-entries 7.1)."]],
});
d.push({
    id: "d5", title: "Canceled: the row with nothing run, and focus on it",
    sub: "Nothing is kept from the canceled first run, so the row is Not run with Run, as a result created unrun is. The notice is gone, and keyboard focus lands on the row rather than on the page: its focus ring is visible, and Enter opens its record.",
    html: app(runsPanel(sampledRow({ focus: true, sub: "Not run.", acts: `<span class="k-btn k-btn-secondary">Run</span>` }) + refusedRow + pr3 + pr1 + inDegree),
        citMain(), citRight("CPU; WebGPU lost")),
    notes: [[320, 330, "A canceled first run leaves the result with no run: Not run, verb Run (state-matrix 3.3, Cross/CancelFirstRun; glossary 10). 'Canceled' is a log word, never a row state."], [320, 430, "Focus goes to the row because the notice that held Cancel is gone (interaction-patterns 3.6 says only 'never to the page'; the row is proposed). The page announces 'Betweenness (sampled) canceled. Run' in the polite region."]],
});
d.push({
    id: "d6", title: "Enter opens the record; the sample size says what fits",
    sub: `Emma presses Enter on the focused row, tabs to Sample size and types ${KBIG.k}. Under the field: about ${K} fits the time limit; ${KBIG.k} takes ${KBIG.band} and runs in the background. Run starts it.`,
    html: app(record(`Betweenness <span class="fr-variant">(sampled)</span>`, "today, 10:32",
        `<div class="k-prose">Not run, on: full graph, 124,318 nodes. Directed.</div>${acts(`<span class="k-btn">Run</span>`)}
        <section class="k-section"><div class="k-section-head">Settings</div><div class="k-fieldrow"><span class="k-legend">Sample size</span><div class="k-fields"><span class="k-field k-num" data-focus${sb("sample")}>${KBIG.k}</span></div></div><div class="fr-cap k-secondary">About ${K} fits the time limit; ${KBIG.k} takes ${KBIG.band} and runs in the background.</div>
        <div class="k-fieldrow"><span class="k-legend">Seed</span><div class="k-fields"><span class="k-field k-num">7</span></div></div></section>`, "Created"),
        citMain(), citRight("CPU; WebGPU lost")),
    notes: [[320, 250, "Sample size and its bound: the studio's proposals 'The sample-size field says how large a sample fits the budget' and 'Betweenness declares its sampled method'. compact-mantine: NumberInput in a FieldRow, Button."]],
});
page("gpu-lost-run.html", "When the GPU is lost, and when a costly run is canceled", "Patent citations, 124,318 patents and 1,480,221 citations: past the drawing limit, so nothing is drawn and the inspector and the table carry the work. Runs live in Results on the rail. A WebGPU run fails visibly, keeps the values before it and says so, and offers to try WebGPU again; with WebGPU gone, exact betweenness is refused at hours, the sampled default starts, is canceled, and is set up again from the keyboard.", d);

// ---------------------------------------------------------------- E: selection past the cap
const tx = fx.transactions;
const flagged = [...tx.flaggedAccounts].sort((p, q) => q.riskScore - p.riskScore);
const txTable = (scope) => table({
    scope, cols: [{ name: "id (account)" }, { name: "kind", profile: "3 values" }, { name: "country" }, { name: "total degree", n: true }, { name: "riskScore", n: true, profile: "0 to 98" }],
    rows: flagged.slice(0, 7).map((f) => ({ cells: [f.id, f.kind, f.country, String(f.degree), String(f.riskScore)], sel: true })),
});
const setRow = `<li class="k-item"${sb("set")}>${I("group")}<span class="k-ellipsis">Mule ring</span><span class="k-kind">frozen</span><span class="k-trail k-num">14</span></li>`;
const txLegend = `<div class="k-lg-title">Flagged accounts <span class="k-secondary">flagged</span></div><div class="k-lg-row">${chit("#D55E00")}true<span class="k-value">14</span></div><div class="k-lg-row">${chit("#808080")}false, as density<span class="k-value">2,986</span></div>`;
const sel14 = right(`${I("circle-dot")}<span class="k-name k-num">14 nodes</span><span class="k-secondary">Selection</span>`, sec("Attributes", data("kind", "personal") + data("flagged", "true") + data("riskScore", "88 to 98") + data("total degree", "7 to 12")));
const selAll = right(`${I("circle-dot")}<span class="k-name k-num">3,000 nodes, 9,113 edges</span>`, sec("Attributes", data("kind", "3 values") + data("flagged", "14 true") + data("riskScore", "0 to 98")));
// One selection-banded hull around everything drawn, with its count badge (canvas-drawing 6).
const hullPath = "M600 58 C 760 50 900 150 950 300 C 990 430 960 560 870 650 C 790 730 650 750 560 735 C 420 715 300 640 262 520 C 230 410 245 290 320 190 C 390 105 480 62 600 58 Z";
const hull = `<svg viewBox="0 0 1200 800" class="fr-hull" aria-hidden="true"><path d="${hullPath}" fill="none" stroke="var(--fr-band-out)" stroke-width="6"/><path d="${hullPath}" fill="none" stroke="var(--fr-band-in)" stroke-width="2"/></svg><span class="fr-badge k-num" style="left:79%;top:14%"${sb("hullcount")}>12,113</span>`;
const TR = "Transfers, March 2026";
const allCanvas = canvas({ img: "../kit/canvas/transactions-density-{t}.svg", alt: "3,000 accounts as density, all selected, drawn as one hull", legend: txLegend, stage: hull }) + txTable("Selected: 3,000 nodes. Sorted by riskScore.");
const e = [];
e.push({
    id: "e1", title: "Fourteen accounts, each with its own ring",
    sub: "Sarah has the 14 flagged mule-ring accounts selected and has just kept them as a set. Every selected node carries its selection ring.",
    html: app(graphPanel(TR, "Full graph", setRow),
        canvas({ img: "../kit/canvas/transactions-flagged-{t}.svg", alt: "3,000 accounts as density, 14 flagged accounts selected", legend: txLegend }) + txTable("Selected: 14 nodes. Sorted by riskScore."),
        sel14),
    notes: [[330, 150, "Set row: Tree row with its kind and count (interface-specification 2.2). Undo label of the last command: 'Create set Mule ring'."], [700, 120, "Selection ring per element (canvas-drawing 6, ring 1)."]],
});
e.push({
    id: "e2", title: "Select all: one hull and a count, not 12,113 rings",
    sub: "Out of spreadsheet habit Sarah presses Ctrl+A on the canvas. 3,000 accounts and 9,113 transfers are selected, past the cap of 5,000, so the canvas draws one selection-banded hull with the count. Every id is held; the table and inspector lead.",
    html: app(graphPanel(TR, "Full graph", setRow), allCanvas, selAll),
    notes: [[330, 150, "Over the selection cap: interaction-pattern-entries 4.1 exceptions; scale-levels 2 (Selection mark); canvas-drawing 6 (hull in the ring-1 band, count badge). The element today truncates instead: element-needs, 'A selection over the cap holds every id'."], [1000, 500, "Announcement: message graphty.selection.count, '12,113 selected'."]],
});
e.push({
    id: "e3", title: "The spreadsheet reflex: Ctrl+Z deletes the set",
    sub: "Sarah presses Ctrl+Z to get her fourteen back. Selecting is not an undo step, so Undo reverses her last command, Create set Mule ring: the set's row disappears from Sets and paths, and everything is still selected. The row was in sight, so there is no notice.",
    html: app(graphPanel(TR, "Full graph", ""), allCanvas, selAll),
    notes: [[330, 150, "Undo reverses commands, never a selection (conceptual-model: selection stays out of undo; interaction-patterns 3.4). No notice, because the step's row was in sight (3.4). Whether she sees the row go while looking at the canvas is the study's question for this branch."]],
});
e.push({
    id: "e4", title: "Redo brings the set back",
    sub: "She opens Edit. Redo names what it would restore: Redo Create set Mule ring.",
    html: app(graphPanel(TR, "Full graph", ""), allCanvas, selAll) +
        editMenu({ undo: "Undo Add style layer Flagged accounts", redo: "Redo Create set Mule ring", redoHover: true }),
    notes: [[600, 60, "Redo label reads 'Redo {name}' (content-design 3). compact-mantine: ContextMenu, TooltipShortcut."]],
});
e.push({
    id: "e5", title: "Select members on the set, not undo, brings back the 14",
    sub: "The set is back, and Undo reads Undo Create set Mule ring again. She chooses Select members on the Mule ring row, and the 14 accounts are selected. Ctrl+Z would not do it: it brings back only a selection that Esc or a click on empty canvas cleared, and Select all replaced the 14 rather than clearing them.",
    html: app(graphPanel(TR, "Full graph", setRow), allCanvas, selAll) +
        editMenu({ undo: "Undo Create set Mule ring", prevHover: true }),
    notes: [[600, 60, "Select members is the set row's first verb (interface-specification.md 4.2). The Edit menu has no separate restore command: Ctrl+Z restores only a cleared selection (framework-changes.md, \"Ctrl+Z restores a cleared selection\")."]],
});
page("selection-over-cap.html", "A selection past the cap", "Card and transfer transactions for March 2026: 3,000 accounts and 9,113 transfers. Select all passes the selection cap of 5,000 elements; the canvas draws one hull with a count. Ctrl+Z, the reflex, deletes the set she just made; Redo returns it, and Select members on the kept set is the way back to the 14.", e);
