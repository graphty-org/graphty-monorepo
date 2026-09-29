// Writes storyboards/weekly-return.html and screens/weekly-return.html from kit/fixtures.json, so
// every number on both pages is the kit's (March: datasets.transactions; April:
// datasets.transactionsApril and its weekly-return extras, all made by kit/gen-canvas.mjs).
// Run from design/ui/prototype/:  node storyboards/weekly-return.gen.mjs
// The screen states are built once and drawn several times: full size on the screens page, scaled
// into the storyboard's frames, and cropped 1:1 into each frame's close-ups, so a frame can never
// drift from its mock.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toShell } from "../kit/shell.mjs";

const proto = join(dirname(fileURLToPath(import.meta.url)), "..");
const fx = JSON.parse(readFileSync(join(proto, "kit/fixtures.json"), "utf8"));
const M = fx.datasets.transactions;
const A = fx.datasets.transactionsApril;
const L = A.louvain;
const D = A.versionDiff;
const W = A.watchlist;
const P = A.path;
const PR = A.pagerank;
const F = A.files;
const Z = A.dormant;
const AG = A.agreement;
const NF = A.newAccountFlows;
const UP = A.upstream;
const ringC = L.ringCommunity;

const num = (x) => Number(x).toLocaleString("en-US");
const usd = (x) => "$" + Number(x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sig = (x, d = 2) => Number(x.toPrecision(d)).toString();
const f2 = (x) => x.toFixed(2);
const i = (name, cls = "") => `<svg class="k-i ${cls}"><use href="../kit/icons.svg#${name}"/></svg>`;
const img = (name, alt) =>
    `<img class="k-light-only" src="../kit/canvas/${name}-light.svg" alt="${alt}"><img class="k-dark-only" src="../kit/canvas/${name}-dark.svg" alt="${alt}">`;

const WHO = "Sarah";
const PROJECT = "Case 0314, mule ring";
const SET = "Ring community, April";
const BASELINE = "Modularity vs randomized baseline";
const PATHNAME = `${P.from} to ${P.to}`;
const SCOPE = `${SET} and 2 steps in`;
const marchCommunities = L.march.communities;
const aprilCommunities = L.april.communities;
const matched = L.matchedPairs;
const passThrough = NF.accounts.filter((a) => a.in > 0);
const shopper = NF.accounts.find((a) => a.in === 0);
const nfTotal = Math.round((NF.inSum + NF.outSum) * 100) / 100;
const range2 = (xs) => [Math.min(...xs), Math.max(...xs)];
const ptIn = range2(passThrough.map((a) => a.inSum));
const upDom = UP.fittedDomain;
const prRange = `${sig(upDom[0])} to ${sig(upDom[1])}`;
const fullPrRange = `${sig(PR.domain[0])} to ${sig(PR.domain[1])}`;
const cashOut = NF.cashOut;
// Group counts, each with its own noun: groups, matched groups, new groups, lost groups.
const ST = AG.stayTogether;
const inTen = ([a, b]) => (a === b ? `${a} in 10` : `${a} to ${b} in 10`);
const lostGroups = L.unmatchedMarch;
if (marchCommunities + L.unmatchedApril - lostGroups.length !== aprilCommunities) throw new Error("group counts do not reconcile");
const recon = `${marchCommunities} groups in March, ${aprilCommunities} in April: ${L.unmatchedApril} new, ${lostGroups.length} lost`;
const lostNames = `Communities ${lostGroups.map((g) => g.name.replace("Community ", "")).join(", ")}`;
const stayLine = `${ST.monthsInTen} in 10 pairs of accounts that shared a group in March still share one in April`;
const top2 = UP.top[1];

// ---------- chrome ----------
function rail(active, badge = 0) {
    const b = (key, icon, label, extra = "") =>
        `<div class="k-rail-btn"${active === key ? ' aria-pressed="true"' : ""}${extra}><span class="k-rail-pill">${i(icon)}${key === "results" && badge ? `<span class="k-rail-badge k-num">${badge}</span>` : ""}</span>${label}</div>`;
    return `<nav class="k-rail" aria-label="Main">${b("menu", "menu", "")}<div class="k-rail-sep"></div>${b("graph", "network", "Graph")}<div class="k-rail-btn k-asst-off" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div>${b("results", "flask-conical", "Results")}${b("notes", "sticky-note", "Notes")}</nav>`;
}
function head(chip = "Full graph") {
    return `<div class="k-panel-head"><div class="k-title-line"><span class="k-project">${PROJECT}</span>${i("chevron-down", "k-i-sm k-secondary")}</div><span class="k-chip">${i("funnel", "k-i-sm")}${chip}</span></div>`;
}
const FILTERED = `Filtered: ${UP.accounts} of ${num(A.nodes)} nodes`;
const stackChip = `<span class="k-stack"><span class="k-chit" style="background:#009E73"></span><span class="k-chit" style="background:#56B4E9"></span><span class="k-chit" style="background:#E69F00"></span></span>`;
const sizeChip = `<svg class="k-sizechip" viewBox="0 0 16 12"><circle cx="3" cy="8" r="2" fill="#808080"/><circle cx="10" cy="6" r="5" fill="#808080"/></svg>`;
const rampChip = `<span class="k-ramp" style="width:16px"></span>`;
const dashChip = `<span class="wr-dash"></span>`;
// The Graph panel. One treatment for the current graph (Figma's current page: aria-current, never
// the selection); at most one selected row per list.
function graphPanel({ april = false, ring = false, keptPath = false, styles = "base", sel = null, chip = "Full graph" }) {
    const n = april ? A.nodes : M.nodes;
    const watch = april
        ? `<span class="k-kind">frozen</span><span class="k-trail"><span class="k-warn-glyph" title="2 members not in this data">!</span><span class="k-num">${W.inCurrentData} of ${W.members}</span></span>`
        : `<span class="k-kind">frozen</span><span class="k-trail"><span class="k-paint-slot"></span><span class="k-num">${W.members}</span></span>`;
    const setRows = [`<li class="k-item">${i("group")}<span class="k-ellipsis">Watchlist</span>${watch}</li>`];
    if (ring) setRows.push(`<li class="k-item"${sel === "set" ? ' aria-selected="true"' : ""}>${i("group")}<span class="k-ellipsis">${SET}</span><span class="k-kind">frozen</span><span class="k-trail"><span class="k-paint-slot"></span><span class="k-num">${ringC.aprilSize}</span></span></li>`);
    if (keptPath) setRows.push(`<li class="k-item"${sel === "path" ? ' aria-selected="true"' : ""}>${i("route")}<span class="k-ellipsis k-id">${PATHNAME}</span><span class="k-kind">path</span><span class="k-trail"><span class="k-paint-slot"></span><span class="k-num">${P.hops + 1}</span></span></li>`);
    const layer = (mark, name, kind = "") => `<li class="k-item">${mark}<span class="k-ellipsis">${name}</span>${kind ? `<span class="k-kind">${kind}</span>` : ""}</li>`;
    const rows = [];
    if (styles === "path") rows.push(layer(dashChip, "Shortest path", "run"));
    if (styles !== "base") rows.push(layer(rampChip, "PageRank color"));
    rows.push(layer(sizeChip, "Size: degree"));
    rows.push(layer(stackChip, "Community color"));
    return `<aside class="k-panel" aria-label="Graph">${head(chip)}<div class="k-scroll">
      <section class="k-section"><div class="k-section-head">Graphs<span class="k-grow"></span><span class="k-icon-btn">${i("search")}</span><span class="k-icon-btn">${i("plus")}</span></div>
        <ul class="k-list"><li class="k-item" aria-current="page">${i("network")}<span class="k-grow k-ellipsis">Transfers</span><span class="k-trail k-num">${num(n)} accounts</span></li></ul></section>
      <section class="k-section"><div class="k-section-head">Sets and paths<span class="k-grow"></span><span class="k-icon-btn">${i("plus")}</span></div><ul class="k-list">${setRows.join("")}</ul></section>
      <section class="k-section"><div class="k-section-head">Styles<span class="k-grow"></span><span class="k-icon-btn">${i("plus")}</span></div><ul class="k-list">${rows.join("")}</ul></section>
      <section class="k-section" data-collapsed><div class="k-section-head">Views <span class="k-count k-num">1</span></div></section>
    </div></aside>`;
}
function resultsPanel({ rows, pinned = false, extra = "", chip = "Full graph" }) {
    return `<aside class="k-panel" aria-label="Results">${head(chip)}<div class="k-search"><span class="k-field">${i("search", "k-i-sm")}Find a result or algorithm</span></div>
      ${pinned ? `<div class="wr-pinned"><span class="k-warn-glyph">!</span><span class="k-grow">1 out of date</span><span class="k-btn k-btn-secondary">Review</span></div>` : ""}
      <div class="k-scroll"><section class="k-section"><div class="k-section-head">In this project</div><ul class="k-list">${rows.join("")}</ul></section>
      <section class="k-section" data-collapsed><div class="k-section-head">Catalog <span class="k-count k-num">98</span></div></section></div>${extra}</aside>`;
}
const rrow = (icon, name, state, line = "", attrs = "") =>
    `<li class="k-item wr-rr"${attrs}>${i(icon)}<span class="k-ellipsis">${name}</span><span class="k-trail">${state}</span></li>${line ? `<li class="wr-rr-line">${line}</li>` : ""}`;
const cur = `<span class="k-secondary">current</span>`;
function headerRows({ two = "", one = "" } = {}) {
    return `<div class="k-header1"><span class="k-grow"></span>${one}</div>
      <div class="k-header2">${two || `<span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">100%${i("chevron-down", "k-i-sm")}</span>`}</div>`;
}
// The graph's inspector (nothing selected), in interface-specification.md 4.1's order.
function graphInspector({ april = false, notes = 1, layout = "" }) {
    const d = april ? A : M;
    const nw = (t) => `<span class="wr-nw">${t}</span>`;
    const files = april ? `${nw(F.accounts.file)}, ${nw(F.transfers.file)}` : `${nw(F.marchAccounts)}, ${nw(M.file)}`;
    const lastImport = april ? `April data: ${files}. Today 09:14` : `March data: ${files}. Apr 3`;
    return `<aside class="k-right" aria-label="Inspector">${headerRows()}
      <div class="k-typerow">${i("network")}<span class="k-name">Transfers</span><span class="k-secondary">Graph</span><span class="k-grow"></span><span class="k-icon-btn">${i("palette")}</span></div>
      <div class="k-scroll">
        <section class="k-section"><div class="k-row"><span class="k-secondary wr-lbl">Background</span><span class="k-grow">Light canvas</span></div>
          <div class="k-row"><span class="k-secondary wr-lbl">Layout</span><span class="k-grow">ForceAtlas2${layout}</span><span class="k-btn k-btn-ghost">Run</span></div></section>
        <section class="k-section"><div class="k-section-head">Statistics</div>
          <div class="k-row"><span class="k-grow" style="white-space:nowrap">Overview: General</span><span class="k-btn k-btn-ghost" style="padding-inline:4px">Change overview...</span></div>
          <div class="k-metrics"><div class="k-metric"><span class="k-secondary">accounts</span><span class="k-big">${num(d.nodes)}</span></div><div class="k-metric"><span class="k-secondary">transfers</span><span class="k-big">${num(d.edges)}</span></div></div>
          <div class="k-data"><span class="k-name">components</span><span class="k-value">${d.stats.components}, weakly</span></div>
          ${april ? `<div class="k-data"><span class="k-name">isolated</span><span class="k-value">${Z.count}</span></div>` : ""}
          <div class="k-row wr-import">${i("history")}<span class="k-grow wr-wrap">Last import: ${lastImport}</span></div>
          <div class="k-row"><span class="k-grow">Edges: directed</span></div>
          <div class="k-row"><span class="k-grow">9 attributes</span>${i("chevron-right", "k-i-sm k-secondary")}</div></section>
        <section class="k-section"><div class="k-section-head">Notes <span class="k-count k-num">${notes}</span></div></section>
        <section class="k-section" data-empty><div class="k-section-head">Export<span class="k-grow"></span><span class="k-icon-btn">${i("plus")}</span></div></section>
      </div></aside>`;
}
function toolbar(pathTool = false, bar = "") {
    const sec = pathTool
        ? `<div class="k-secondary-bar"><span class="k-secondary">From</span><span class="k-field k-id">${P.from}</span><span class="k-secondary">To</span><span class="k-field k-id">${P.to}</span><span class="k-field">Filtered graph${i("chevron-down", "k-i-sm k-caret")}</span><span class="k-btn">Run</span></div>`
        : bar;
    return `${sec}<div class="k-toolbar" role="toolbar"><span class="k-tool"${pathTool ? "" : ' aria-pressed="true"'}>${i("mouse-pointer-2", "k-i-lg")}</span><span class="k-tool-caret">${i("chevron-down", "k-i-sm")}</span><span class="k-tool"${pathTool ? ' aria-pressed="true"' : ""}>${i("route", "k-i-lg")}</span><span class="k-tool">${i("sticky-note", "k-i-lg")}</span><span class="k-toolbar-sep"></span><span class="k-tool">${i("zap", "k-i-lg")}</span><span class="k-toolbar-sep"></span><span class="k-tool">${i("square", "k-i-lg")}</span><span class="k-tool-caret">${i("chevron-down", "k-i-sm")}</span></div>`;
}
// Legends run top-first, in the Styles list's order (Figma lists top-first), in every frame.
const sizeKey = (marks, note) =>
    `<div class="k-lg-title">Size: degree <span class="k-secondary">degree</span></div><div class="k-size-marks">${marks.map((m) => { const r = Math.min(12, 1.8 + Math.sqrt(m) * 0.35) * 2; return `<div><b style="width:${f2(r)}px;height:${f2(r)}px"></b>${num(m)}</div>`; }).join("")}</div>${note ? `<div class="k-lg-row k-secondary">${note}</div>` : ""}`;
function commLegend(which) {
    const lg = A.legends[which];
    const max = which === "march" ? M.stats.maxDegree : A.stats.maxDegree;
    const lo = which === "march" ? 1 : 0;
    const rows = lg.rows.map((r) => `<div class="k-lg-row"><span class="k-chit" style="background:${r.color}"></span>${r.name}<span class="k-value">${num(r.count)}</span></div>`).join("");
    return `${sizeKey([lo, 10, 100, max], `domain ${lo} to ${num(max)}`)}
      <div class="k-lg-title" style="margin-top:4px">Community color <span class="k-secondary">Louvain community</span></div>${rows}
      <div class="k-lg-row"><span class="k-chit" style="background:#505050"></span>Other, ${lg.other.communities} communities<span class="k-value">${num(lg.other.count)}</span></div>`;
}
const prBlock = `<div class="k-lg-title">PageRank color <span class="k-secondary">PageRank, log scale</span></div>
      <div class="k-ramp k-ramp-wide"></div><div class="k-lg-row k-secondary"><span>${sig(upDom[0])}</span><span class="k-grow"></span><span>${sig(upDom[1])}</span></div>
      <div class="k-lg-row k-secondary">domain fitted to this filter; computed on the full graph</div>`;
function prLegend(path = false) {
    return `${path ? `<div class="k-lg-title">${dashChip} Shortest path <span class="k-secondary">highlight 1, ${P.hops} hops</span></div>` : ""}
      <div${path ? ' style="margin-top:4px"' : ""}>${prBlock}</div>
      <div style="margin-top:4px">${sizeKey([1, 10, 40], `domain 0 to ${num(A.stats.maxDegree)}, full graph`)}</div>
      <div class="k-lg-row k-secondary">1 more: Community color, painted over everywhere</div>`;
}
function canvas({ drawing, alt, legend, pathTool = false, overlay = "", dock = "", bar = "", extra = "" }) {
    return `<main class="k-main"><div class="k-canvas"><div class="k-stage">${img(drawing, alt)}</div>
      <div class="k-legend-card">${legend}</div>${extra}
      <div class="k-toolbar-dock">${overlay}${toolbar(pathTool, bar)}</div><span class="k-help">${i("circle-help")}</span></div>${dock}</main>`;
}
const app = (parts, attrs = "") => `<div class="k-app"${attrs}>${parts.join("")}</div>`;
const toast = (text, action = "", progress = "") => `<div class="k-toast wr-toast">${text}${progress}${action ? `<span class="k-toast-action">${action}</span>` : ""}</div>`;

// ---------- the states ----------
// Each: title, say, html, notes ([[x, y, w, h], what and why, framework, compact-mantine]),
// waits (graphty-element needs this state depends on; interface-specification.md 7.4).
const S = {};
S.start = {
    title: "Monday: the start screen, Recent projects",
    say: "graphty opens on Recent projects. Last month's case project is first, its thumbnail the graph as it was on screen.",
    html: `<div class="wr-startpage"><div class="k-start">
      <h1>Recent projects</h1>
      <div class="k-thumbs">
        <div class="k-thumb" data-hover>${img("transactions-march-communities", `${PROJECT}: March transfers colored by community`)}<div class="k-thumb-label"><b>${PROJECT}</b><br><span class="k-secondary">Transfers, ${num(M.nodes)} accounts. Edited Apr 3</span></div></div>
        <div class="k-thumb">${img("transactions-flagged", "Case 0287")}<div class="k-thumb-label"><b>Case 0287, bust-out</b><br><span class="k-secondary">1 graph. Edited Mar 20</span></div></div>
        <div class="k-thumb">${img("transactions-density", "Card testing")}<div class="k-thumb-label"><b>Card testing, Q1</b><br><span class="k-secondary">1 graph. Edited Feb 27</span></div></div>
      </div>
      <div class="wr-start-actions"><span class="k-btn k-btn-secondary">${i("folder-open")}Open...</span><span class="k-btn k-btn-secondary">Open sample</span><span class="k-btn k-btn-secondary">${i("plug")}Connect to data source...</span></div>
    </div></div>`,
    notes: [
        [[280, 118, 300, 240], "Recent projects is the one door back; the thumbnail is the graph as it was on screen, so the analyst recognizes the case before opening it.", "task-flows.md 2.2; interface-templates.md 19", "ActionRow with a thumbnail"],
        [[280, 380, 560, 40], "The start screen's other doors. Nothing here starts work: opening a project shows it.", "interface-templates.md 19; message-catalog.md graphty.start.empty", "ActionRow"],
    ],
    waits: [],
};
// The selection she closed on: the 14 flagged accounts. The project file saves the selection when it
// closes, and reopening restores it (decided on the owner's behalf; framework-changes.md).
const FL = M.flaggedAccounts;
const flDeg = range2(FL.map((a) => a.degree));
const flRisk = range2(FL.map((a) => a.riskScore));
const flKinds = [...new Set(FL.map((a) => a.kind))];
const flCountries = new Set(FL.map((a) => a.country)).size;
const RESTORED = `Selection restored (${FL.length} nodes)`;
const restoredInspector = `<aside class="k-right" aria-label="Inspector">${headerRows()}
  <div class="k-typerow">${i("circle-dot")}<span class="k-name">${FL.length} selected</span><span class="k-secondary">Nodes</span></div>
  <div class="k-scroll wr-dw"><section class="k-section"><div class="k-section-head">Statistics</div>
    <div class="k-data"><span class="k-name">degree</span><span class="k-value">${flDeg[0]} to ${flDeg[1]}</span></div></section>
  <section class="k-section"><div class="k-section-head">Attributes</div>
    <div class="k-data"><span class="k-name">kind</span><span class="k-value">${flKinds.length === 1 ? flKinds[0] : `${flKinds.length} differ`}</span></div>
    <div class="k-data"><span class="k-name">flagged</span><span class="k-value">true</span></div>
    <div class="k-data"><span class="k-name">riskScore</span><span class="k-value">${flRisk[0]} to ${flRisk[1]}</span></div>
    <div class="k-data"><span class="k-name">country</span><span class="k-value">${flCountries} differ</span></div></section>
  <section class="k-section"><div class="k-section-head">Appearance</div><div class="k-row">${stackChip}<span class="k-grow">Community color</span></div></section>
  <section class="k-section" data-empty><div class="k-section-head">Export<span class="k-grow"></span><span class="k-icon-btn">${i("plus")}</span></div></section></div></aside>`;
S.reopened = {
    title: "Monday: the project reopened exactly as left, her selection restored",
    say: `Filter chip, style layers and layout as saved, and the selection she closed on: the ${FL.length} flagged accounts carry the selection ring, the inspector describes them, and the state line at the foot of the canvas says "${RESTORED}".`,
    html: app([rail("graph"), graphPanel({}), canvas({ drawing: "transactions-march-communities-sel", alt: `March transfers colored by Louvain community, sized by degree; the ${FL.length} flagged accounts selected`, legend: commLegend("march"), overlay: toast(RESTORED, "Clear") }), restoredInspector]),
    notes: [
        [[57, 0, 241, 65], "The filter chip reads Full graph, as saved: the first trust check on reopening, what every number is computed on.", "task-flows.md 2.2, trust check; interface-templates.md 7", "Pill (filter chip, missing: interface-specification.md 7.3)"],
        [[57, 235, 241, 115], "Style layers exactly as last month, top first. The restored selection is not a layer and adds no row here.", "state-matrix.md 3, reopened; interface-templates.md 9", "Tree"],
        [[1199, 90, 241, 300], `The inspector follows the restored selection: Several elements, ${FL.length} nodes, as it was when the project closed.`, "interface-specification.md 4.1, Several elements; framework-changes.md, the selection saved in the project file", "DataRow"],
        [[590, 775, 300, 60], `The state line says the selection came back and how big it is. Clear, or Esc on the canvas, empties it; Ctrl+Z brings it back. Restoring it on opening is not an undo step.`, "framework-changes.md, the selection saved in the project file; message-catalog.md selection.cleared", "Notification (compact), Button"],
    ],
    waits: ["the saved selection: an optional field in the project file (framework-changes.md, the selection saved in the project file)"],
};
S["reopened-rest"] = {
    title: "Monday: Esc, and the inspector rests on the graph",
    say: "Esc clears the restored selection (Ctrl+Z brings it back); the inspector rests on the graph, and its Last import row names March's two files.",
    html: app([rail("graph"), graphPanel({}), canvas({ drawing: "transactions-march-communities", alt: "March transfers colored by Louvain community, sized by degree", legend: commLegend("march") }), graphInspector({})]),
    notes: [
        [[57, 0, 241, 65], "The filter chip reads Full graph, as saved: the first trust check on reopening, what every number is computed on.", "task-flows.md 2.2, trust check; interface-templates.md 7", "Pill (filter chip, missing: interface-specification.md 7.3)"],
        [[57, 70, 241, 80], "The current graph keeps Figma's current-page treatment (tinted, weight 550) whatever is selected; it is not a selection.", "interface-templates.md 2; figma study, left-sidebar current page", "PageList, PageRow"],
        [[57, 235, 241, 115], "Style layers exactly as last month, top first. Nothing is selected, so nothing points anywhere the analyst did not ask.", "state-matrix.md 3, reopened; interface-templates.md 9", "Tree"],
        [[1199, 365, 241, 50], "The Last import row names the data version and both of its files; it opens Version history, the answer to 'is this last month's state?'", "interface-specification.md 4.1, Nothing; interface-templates.md 17", "ActionRow"],
        [[310, 578, 212, 312], "The legend is derived from the layers and runs in the same order as the Styles list, top first: the size key, then the community colors with Other counted.", "options-and-encodings.md 6; framework-changes.md, legend order", "legend (graphty-element)"],
    ],
    waits: ["the Last import row and Version history: data versions (element-needs.md, 'Not yet in the element at all')"],
};
// Monday's first two steps drawn on screen: the File menu, then the browser's file picker. Round 1's
// weekly-refresh sessions failed because neither was ever shown, and Add data was the only door seen.
const mItem = (label, extra = "", attrs = "") => `<div class="k-menu-item"${attrs}><span class="k-check-col"></span>${label}${extra}</div>`;
const mDesc = (label, desc, attrs = "") => `<div class="k-menu-item" data-described${attrs}><span class="k-check-col"></span><span>${label}<span class="k-menu-desc">${desc}</span></span></div>`;
const sub = `<span class="k-sub">${i("chevron-right", "k-i-sm")}</span>`;
const fileMenu = `<div class="k-menu" style="left:52px;top:36px;width:220px">
    ${mItem("Quick actions...", `<span class="k-shortcut">Ctrl+K</span>`)}<div class="k-menu-sep"></div>
    ${mItem("File", sub, " data-hover")}${mItem("Edit", sub)}${mItem("View", sub)}${mItem("Selection", sub)}${mItem("Algorithms", sub)}${mItem("Recipes", sub)}<div class="k-menu-sep"></div>${mItem("Preferences...")}${mItem("Help", sub)}</div>
  <div class="k-menu" style="left:276px;top:77px;width:340px">
    ${mItem("New project")}${mItem("Open...", `<span class="k-shortcut">Ctrl+O</span>`)}${mItem("Recent projects", sub)}<div class="k-menu-sep"></div>
    ${mDesc("Update with new data...", "New files under this analysis; March kept as a version. 1 slow result will wait for Re-run", ' data-hover aria-describedby="wr-rd"')}
    ${mDesc("Add data...", "More rows on top of the data loaded now")}
    ${mItem("Add as another graph...")}${mItem("Join...")}${mItem("Connect to data source...")}${mItem("Load set collection...")}<div class="k-menu-sep"></div>
    ${mItem("Export...", `<span class="k-shortcut">Ctrl+Shift+E</span>`)}${mItem("Version history")}</div>`;
S.menu = {
    title: "Monday: File, Update with new data...",
    say: "The main menu's File group. Update with new data... sits directly under Open..., above Add data..., and each of the two carries one line saying what it will leave: new files under the same analysis, or more rows on top.",
    html: app([rail("menu"), graphPanel({}), canvas({ drawing: "transactions-march-communities", alt: "March transfers colored by Louvain community, behind the File menu", legend: commLegend("march") }), graphInspector({}), fileMenu]),
    notes: [
        [[0, 0, 57, 52], "The main menu button at the top of the rail: File, Edit, View and the rest. The only home of Update with new data... besides a file dropped on the canvas.", "information-architecture.md, the main menu outline; output-homes.md 3", "NavRail, Menu"],
        [[276, 170, 340, 104], "Update with new data... and Add data... side by side, each with the one line that tells them apart. Replace comes first: for a project reopened on a new export it is the likely verb, and round 1 showed Add data taken for it.", "task-flows.md 8, choose; framework-changes.md, 'the File menu tells Replace data from Add data'", "Menu, Menu.Item with a description line"],
        [[1199, 365, 241, 50], "The Last import row still names March's files, so what is about to be replaced is on screen when she chooses.", "interface-specification.md 4.1, Nothing", "ActionRow"],
    ],
    waits: ["Replace data: data versions ('Not yet in the element at all')"],
};
const pickFile = (name, date, size, sel) => `<div class="k-item wr-pick"${sel ? ' aria-selected="true"' : ""}>${i("file")}<span class="k-grow k-id">${name}</span><span class="k-secondary wr-pick-d">${date}</span><span class="k-secondary k-num wr-pick-s">${size}</span></div>`;
const picker = `<div class="k-backdrop"><div class="k-modal wr-modal-pick" role="dialog" aria-label="Choose files">
    <div class="k-modal-head">Choose files for Update with new data<span class="k-grow"></span><span class="k-secondary" style="font-weight:450">this computer</span></div>
    <div class="k-modal-body"><div class="k-row"><span class="k-secondary">Case 0314</span>${i("chevron-right", "k-i-sm k-secondary")}<span>statements</span></div>
      ${pickFile(F.accounts.file, "today 08:40", `${num(F.accounts.rows)} rows`, true)}${pickFile(F.transfers.file, "today 08:40", `${num(F.transfers.rows)} rows`, true)}
      ${pickFile(F.marchAccounts, "Apr 2", `${num(M.nodes)} rows`, false)}${pickFile(M.file, "Apr 2", `${num(M.edges)} rows`, false)}
      <div class="k-prose k-tertiary">2 selected. The files are read on this computer; nothing is sent.</div></div>
    <div class="k-modal-foot"><span class="k-grow"></span><span class="k-btn k-btn-secondary">Cancel</span><span class="k-btn" data-focus-ring>Open</span></div></div></div>`;
S.picker = {
    title: "Monday: the two April files in the file picker",
    say: "The browser's own file picker, drawn here only so the step is on screen: both April files selected at once, the March files beside them.",
    html: app([rail("graph"), graphPanel({}), canvas({ drawing: "transactions-march-communities", alt: "March transfers behind the file picker", legend: commLegend("march") }), graphInspector({}), picker]),
    notes: [
        [[400, 300, 640, 300], "The browser's file picker, not graphty's: both files of a two-file version are picked together, so the load step can match accounts and transfers in one preview.", "task-flows.md 8, choose (File picker)", "none: the browser's own dialog"],
    ],
    waits: [],
};
const addCols = `<div class="k-section-head">Files</div>
        <div class="k-data"><span class="k-name k-id">${F.accounts.file}</span><span class="k-value">nodes, CSV; ${F.accounts.columns.length} of ${F.accounts.columns.length} columns matched</span></div>
        <div class="k-data"><span class="k-name k-id">${F.transfers.file}</span><span class="k-value">edges, CSV; ${F.transfers.columns.length} of ${F.transfers.columns.length} columns matched</span></div>
        <div class="k-prose k-tertiary">Roles as the project has them: id is the key, from_account and to_account the ends.</div>`;
const mergedNodes = M.nodes + D.accountsAdded;
const mergedEdges = M.edges + A.edges;
const addDialog = `<div class="k-backdrop"><div class="k-modal wr-modal-load">
    <div class="k-modal-head">Add data: April files<span class="k-grow"></span><span class="k-icon-btn">${i("x")}</span></div>
    <div class="k-modal-body wr-load">
      <div>${addCols}
        <div class="k-section-head">Issues <span class="k-count k-num">1</span></div>
        <div class="k-row wr-issue wr-same" aria-selected="true"><span class="k-warn-glyph">!</span><div class="wr-ib"><b>Same columns as ${F.marchAccounts} and ${M.file}, the data already loaded</b><span class="k-secondary">Add data keeps March and puts April on top of it: ${num(mergedNodes)} accounts and ${num(mergedEdges)} transfers, and the ${num(D.accountsRemoved)} accounts not in April stay in. To see April alone, replace March with it: ${num(A.nodes)} accounts, ${num(A.edges)} transfers.</span><span><span class="k-btn k-btn-secondary" data-focus-ring>Replace data instead</span></span></div></div>
      </div>
      <div>
        <div class="k-section-head">Accounts in the files</div>
        <div class="k-metrics"><div class="k-metric"><span class="k-secondary">matched</span><span class="k-big k-num">${num(D.accountsKept)}</span></div><div class="k-metric"><span class="k-secondary">new</span><span class="k-big k-num">${num(D.accountsAdded)}</span></div><div class="k-metric"><span class="k-secondary">not in April</span><span class="k-big k-num">${num(D.accountsRemoved)}</span></div></div>
        <div class="k-section-head">After the merge</div>
        <div class="k-metrics"><div class="k-metric"><span class="k-secondary">accounts</span><span class="k-big k-num" data-fx="datasets.transactionsApril.stackedOnMarch.accounts">${num(mergedNodes)}</span></div><div class="k-metric"><span class="k-secondary">transfers</span><span class="k-big k-num" data-fx="datasets.transactionsApril.stackedOnMarch.transfers">${num(mergedEdges)}</span></div></div>
        <div class="k-prose k-secondary">Adds ${num(D.accountsAdded)} accounts and ${num(A.edges)} transfers to ${num(M.nodes)} and ${num(M.edges)}.</div>
      </div>
    </div>
    <div class="k-modal-foot"><span class="k-grow"></span><span class="k-btn k-btn-secondary">Cancel</span><span class="k-btn">Add data</span></div>
  </div></div>`;
S.adddata = {
    title: "Monday, the other door: Add data warns that the files have March's columns",
    say: `Had she clicked Add data..., the same step opens titled Add data and leads with a warning: the files have the loaded data's columns, so they are most likely the next export. It gives what each verb would leave in counts (${num(mergedEdges)} transfers stacked, or ${num(A.edges)} for April alone), and focus opens on Replace data instead.`,
    html: app([rail("graph"), graphPanel({}), canvas({ drawing: "transactions-march-communities", alt: "March transfers behind the Add data step", legend: commLegend("march") }), graphInspector({}), addDialog]),
    notes: [
        [[240, 455, 480, 132], "The same-columns warning: what Add data and Replace data would each leave, in counts, and the button that turns this same step into Replace data with nothing read again. A warning, not a block: stacking two months on purpose is legitimate.", "framework-changes.md, 'Add data warns when the file has the loaded data's columns'; interface-templates.md 20a, issues", "DataRow with a severity glyph, Button"],
        [[720, 315, 480, 245], "The match counts now include the accounts not in the new files, the number a manager asks about first; the size after the merge is where the stacked total shows.", "message-catalog.md, graphty.load.merged; state-matrix.md 4.3", "MetricRow"],
        [[1050, 598, 150, 44], "Add data stays the commit; focus is on Replace data instead, because Enter on the default commit is exactly the mistake the study saw.", "interface-templates.md 20a, tab order (proposed departure)", "ModalFooter, Button"],
    ],
    waits: ["the load preview (element-needs.md, 'A load preview before commit')", "Add data's match counts against the loaded data: the same preview"],
};
const loadDialog =`<div class="k-backdrop"><div class="k-modal wr-modal-load">
    <div class="k-modal-head">Update with new data: April files<span class="k-grow"></span><span class="k-icon-btn">${i("x")}</span></div>
    <div class="k-modal-body wr-load">
      <div>
        <div class="k-section-head">Files</div>
        <div class="k-data"><span class="k-name k-id">${F.accounts.file}</span><span class="k-value">nodes, CSV; ${F.accounts.columns.length} of ${F.accounts.columns.length} columns matched</span></div>
        <div class="wr-cols"><span class="k-badge">id: key</span>${F.accounts.columns.slice(1).map((c) => `<span class="k-badge">${c}</span>`).join("")}</div>
        <div class="k-data"><span class="k-name k-id">${F.transfers.file}</span><span class="k-value">edges, CSV; ${F.transfers.columns.length} of ${F.transfers.columns.length} columns matched</span></div>
        <div class="wr-cols"><span class="k-badge">from_account: source</span><span class="k-badge">to_account: target</span><span class="k-badge">amount</span><span class="k-badge">timestamp</span></div>
        <div class="k-prose k-tertiary">Every column has the name it had in March, so no binding step opens.</div>
        <div class="k-section-head">Issues</div>
        <div class="k-row wr-issue"><span class="k-warn-glyph">!</span><span class="k-grow wr-wrap">${Z.count} accounts have no transfers in April. All ${Z.count} were in March; none is new. Each will be a component of its own.</span><span class="k-btn k-btn-ghost">Show rows</span></div>
      </div>
      <div>
        <div class="k-section-head">Counts, against March</div>
        <table class="k-table wr-mini"><thead><tr><th><span class="cm-visually-hidden">Count</span></th><th class="k-n">April</th><th class="k-n">March</th></tr></thead><tbody>
          <tr><td>accounts</td><td class="k-n">${num(A.nodes)}</td><td class="k-n">${num(M.nodes)}</td></tr>
          <tr><td>found by id</td><td class="k-n">${num(D.accountsKept)}</td><td class="k-n"></td></tr>
          <tr><td>new</td><td class="k-n">${num(D.accountsAdded)}</td><td class="k-n"></td></tr>
          <tr><td>not in April</td><td class="k-n"></td><td class="k-n">${num(D.accountsRemoved)}</td></tr>
          <tr><td>with no transfers</td><td class="k-n">${Z.count}</td><td class="k-n">0</td></tr>
          <tr><td>transfers</td><td class="k-n">${num(A.edges)}</td><td class="k-n">${num(M.edges)}</td></tr>
          <tr><td>same pair as March</td><td class="k-n">${num(D.transfersBoth)}</td><td class="k-n"></td></tr>
          <tr><td>rows dropped</td><td class="k-n">0</td><td class="k-n">0</td></tr></tbody></table>
        <div class="k-section-head">What replays</div>
        <div class="k-data"><span class="k-name">Degree; Louvain with its 5 seeded re-runs</span><span class="k-value">seconds</span></div>
        <div class="k-data"><span class="k-name">${BASELINE}</span><span class="k-value">a few minutes: waits</span></div>
        <div class="k-data"><span class="k-name">2 style layers, the layout, 1 set, 1 note</span><span class="k-value">carried over</span></div>
      </div>
    </div>
    <div class="k-modal-foot"><span class="k-btn k-btn-ghost">Choose other files</span><span class="k-grow"></span><span class="k-btn k-btn-secondary">Cancel</span><span class="k-btn" data-focus>Load</span></div>
  </div></div>`;
S.load = {
    title: "Monday: the load step for the April files",
    say: "Update with new data..., the two April files, then Load: three steps. Before anything changes, the step shows how the files matched, what looks odd, and what will replay at what cost.",
    html: app([rail("graph"), graphPanel({}), canvas({ drawing: "transactions-march-communities", alt: "March transfers behind the load step", legend: commLegend("march") }), graphInspector({}), loadDialog]),
    notes: [
        [[240, 255, 480, 160], "Two files, as in March: an account table read as nodes and a transfer list read as edges, source and target bound by name. The binding step opens only when a name does not match.", "interface-templates.md 20a, mapping rows; task-flows.md 8", "Modal, ComboInput type slots, Badge"],
        [[240, 425, 480, 70], "The issues list: accounts with no transfers this month, counted before commit, with the rows one click away. Isolated nodes are a trust check.", "interface-templates.md 20a, issues; top-tasks.md 1", "DataRow with a severity glyph"],
        [[720, 255, 480, 265], "Counts against March, before commit: found by id, new, gone, silent. The unmatched counts are the trust check.", "task-flows.md 8, load step; state-matrix.md 4.3", "DataTable (compact)"],
        [[720, 525, 480, 100], "The combined cost of the replay shows first; a result estimated at a few minutes or more is not started, it waits Out of date for Re-run.", "principles.md 7; interaction-patterns.md 3.3", "DataRow"],
        [[720, 640, 480, 50], "Load commits: one undo entry, 'Replace data with the April files'. Cancel or Esc returns to the project unchanged.", "output-homes.md 3.1; interaction-patterns.md 3.6", "ModalFooter"],
    ],
    waits: ["the load preview (element-needs.md, 'A load preview before commit')", "Replace data and data versions ('Not yet in the element at all')"],
};
const reportPanel = `<aside class="k-right" aria-label="Version history">${headerRows({ two: `<span class="k-tabs"><span class="k-tab" aria-selected="true">Version history</span></span><span class="k-grow"></span><span class="k-btn k-btn-secondary">Done</span>` })}
    <div class="k-scroll">
      <ul class="k-list" style="padding-top:8px"><li class="k-item" aria-selected="true">${i("database")}<span class="k-ellipsis">April data</span><span class="k-trail">today 09:14</span></li><li class="k-item">${i("database")}<span class="k-ellipsis">March data</span><span class="k-trail">Apr 3</span></li></ul>
      <section class="k-section"><div class="k-section-head">Replay report</div>
        <div class="k-caption wr-cap">Accounts</div>
        <div class="k-data"><span class="k-name">found by id</span><span class="k-value">${num(D.accountsKept)} of ${num(M.nodes)}</span></div>
        <div class="k-data"><span class="k-name">new accounts</span><span class="k-value">${num(D.accountsAdded)}</span></div>
        <div class="k-data"><span class="k-name">accounts not in April</span><span class="k-value">${num(D.accountsRemoved)} <span class="wr-link">List</span></span></div>
        <div class="k-data"><span class="k-name">no transfers in April</span><span class="k-value">${Z.count} <span class="wr-link">Select</span></span></div>
        <div class="k-prose">Components: ${M.stats.components} to ${A.stats.components}. One holds ${num(Z.largestComponent)} accounts; the other ${Z.count} are the accounts with no transfers.</div>
        <div class="k-caption wr-cap">Results</div>
        <div class="k-prose">2 of 3 replayed. <span class="wr-lead">Louvain: ${recon}.</span> ${Z.singletonCommunities} of the new groups are single accounts with no April transfers. Lost, their accounts now in other groups: ${lostNames}.</div>
        <div class="k-prose"><span class="k-warn-glyph">!</span> Not replayed: ${BASELINE}, a few minutes. It waits in Results.</div>
        <div class="k-caption wr-cap">Sets and notes</div>
        <div class="k-prose">Watchlist: ${W.inCurrentData} of ${W.members} members in April; <span class="k-id">${W.notInCurrentData.join(", ")}</span> are not in this data. 1 note carried over by id.</div>
        <div class="k-caption wr-cap">Style layers and positions</div>
        <div class="k-prose">Community color: the ${matched} matched groups keep their March name and color by overlap; the new groups take the next names. Size: degree: domain refit to April, 0 to ${num(A.stats.maxDegree)}, was 1 to ${num(M.stats.maxDegree)}. Positions kept; ${D.accountsAdded} new accounts placed beside their counterparties; the ${Z.count} with no transfers keep their March places.</div>
      </section></div></aside>`;
S.replay = {
    title: "Monday: the replay report, what did not replay",
    say: "The notice counts the replay; Show report opens it in Version history. It names the result that did not replay, the accounts that went silent, and the two Watchlist accounts not in April.",
    html: app([
        rail("results", 1),
        resultsPanel({
            pinned: true,
            rows: [
                rrow("chart-column", "Degree", cur, "Replayed"),
                rrow("group", "Louvain communities", cur, `Replayed; ${aprilCommunities} groups, was ${marchCommunities}`),
                rrow("sigma", BASELINE, `<span class="k-warn-glyph">!</span><span class="k-btn k-btn-secondary">Re-run</span>`, "Out of date; a few minutes", " data-hover"),
            ],
        }),
        canvas({ drawing: "transactions-april-communities", alt: "April transfers colored by community, March colors carried over", legend: commLegend("april") }),
        reportPanel,
    ]),
    notes: [
        [[0, 190, 57, 56], "The Results rail button carries the count of results out of date, so the state is findable from any panel.", "interaction-pattern-entries.md 7.2", "NavRail button with an indicator"],
        [[65, 285, 225, 48], "The one row that did not replay: its state word, its band and its one verb. The report names it but does not repeat the verb: one Re-run per screen.", "glossary.md 10, Out of date; interaction-patterns.md 3.3", "ActionRow state and actions"],
        [[1199, 205, 241, 165], "Accounts: found, new, gone, and the ones with no transfers, with the component count that explains itself. Nothing is dropped silently.", "task-flows.md 8, Claim; conceptual-model.md 7.3", "DataRow, ProseBlock"],
        [[1199, 380, 241, 140], "Results: one sentence reconciles March's groups with April's (new and lost), says how many new groups are single silent accounts, and names the lost groups; then the one result that waits.", "task-flows.md 8, read the replay", "ProseBlock"],
        [[1199, 610, 241, 145], "Style layers: names and colors carried by overlap, and the size layer's domain refit to April, both said.", "framework-changes.md, carry-over and domain refit", "ProseBlock"],
    ],
    waits: ["Version history and the replay report: data versions ('Not yet in the element at all')", "names carried by overlap: 'item attributes and Carry over to new run'"],
};
S.rerun = {
    title: "Monday: Re-run the out-of-date result",
    say: "Re-run starts the baseline in the background. The running notice carries Cancel and sits clear of the legend; the row says Running on its second line; the rail badge clears.",
    html: app([
        rail("results"),
        resultsPanel({
            rows: [
                rrow("chart-column", "Degree", cur),
                rrow("group", "Louvain communities", cur),
                rrow("sigma", BASELINE, `<span class="k-btn k-btn-ghost">Cancel</span>`, "Running; a few minutes", ' aria-selected="true"'),
            ],
        }),
        canvas({
            drawing: "transactions-april-communities",
            alt: "April transfers colored by community",
            legend: commLegend("april"),
            overlay: toast(`Running ${BASELINE}`, "Cancel", `<div class="k-progress"><i style="width:28%"></i></div>`),
        }),
        graphInspector({ april: true }),
    ]),
    notes: [
        [[65, 203, 225, 45], "Re-run is one undo step ('Re-run Modularity vs randomized baseline'); the undo chord cancels it while it runs.", "output-homes.md 3.5; interaction-pattern-entries.md 7.1", "ActionRow busy state"],
        [[535, 785, 430, 52], "One running notice for the earliest-started run, with Cancel, placed above the toolbar and clear of the legend.", "principles.md 7; interaction-patterns.md 3.5", "Toast"],
        [[1199, 335, 241, 100], "The graph's Statistics now read April: 27 components and 26 isolated, the mark row present because it is not zero.", "interface-specification.md 4.1, Nothing", "MetricRow, DataRow"],
    ],
    waits: ["Out of date after a data swap: data versions ('Not yet in the element at all')"],
};
const pickPopover = `<div class="k-popover" style="left:306px;top:161px"><div class="k-popover-head">Compare Louvain communities with<span class="k-grow"></span><span class="k-icon-btn">${i("x")}</span></div>
  <div class="k-popover-body"><div class="k-search"><span class="k-field">${i("search", "k-i-sm")}Find</span></div>
  <div class="k-group-head">Earlier runs</div><div class="k-result" aria-selected="true">March data, Apr 3<span class="k-grow"></span><span class="k-secondary k-num">${marchCommunities}</span></div>
  <div class="k-group-head">Partitions on April data</div><div class="k-result">Weakly connected components<span class="k-grow"></span><span class="k-secondary k-num">${A.stats.components}</span></div><div class="k-result">kind (attribute)<span class="k-grow"></span><span class="k-secondary k-num">3</span></div>
  <div class="k-prose k-tertiary wr-wrap">Both runs keep the 5 seeded re-runs made with them (seeds 12 to 16); the comparison reads those and runs nothing.</div></div></div>`;
S["compare-pick"] = {
    title: "Wednesday: Compare with... on the Louvain result",
    say: "On the Louvain row, Compare with... lists the run on the March data first, because Update with new data keeps it for this question. The picker says the comparison runs nothing new.",
    html: app([
        rail("results"),
        resultsPanel({
            rows: [rrow("chart-column", "Degree", cur), rrow("group", "Louvain communities", `<span class="k-icon-btn" data-hover>${i("git-compare-arrows")}</span>`, `${aprilCommunities} groups`, ' aria-selected="true"'), rrow("sigma", BASELINE, cur)],
            extra: pickPopover,
        }),
        canvas({ drawing: "transactions-april-communities", alt: "April transfers colored by community", legend: commLegend("april") }),
        graphInspector({ april: true }),
    ]),
    notes: [
        [[65, 170, 225, 50], "Compare with... is one of the result row's actions, also in its context menu and in Quick actions.", "task-flows.md 8.2; interface-templates.md 3", "ActionRow actions, ActionIcon"],
        [[306, 161, 240, 330], "The picker lists what a partition can be compared with, the earlier run first, and says where the noise floor comes from: the seeded re-runs each run already has.", "task-flows.md 8.2; graph-conventions.md 4", "Popover, SearchInput, ResultRow, ProseBlock"],
    ],
    waits: ["Compare with...: the comparison surface (interface-specification.md 7.4)", "the seeded re-runs: 'A partition-similarity measure ... and a multi-seed stability run'"],
};
const grewRows = L.grew
    .map((r) => `<tr${r.name === ringC.name ? ' aria-selected="true"' : ""}><td>${r.name}</td><td class="k-n">${num(r.marchSize)}</td><td class="k-n">${num(r.aprilSize)}</td><td class="k-n">+${r.change}</td><td class="k-n">+${r.pctChange}%</td><td class="k-n">${r.newAccounts}</td><td class="k-n">${f2(r.holdsInReruns)}</td></tr>`)
    .join("");
const cmpDock = `<section class="k-dock wr-cmpdock" aria-label="Differences"><div class="k-dock-tabs"><span class="k-tab" aria-selected="true">Grew</span><span class="k-tab">Shrank</span><span class="k-tab">New in April</span><span class="k-grow"></span><span class="k-icon-btn">${i("ellipsis")}</span></div>
  <div class="k-scope">${matched} matched groups; the ${L.grew.length} that grew most. Sorted by change. Selecting a row selects its accounts on both sides.</div>
  <div class="k-table-wrap"><table class="k-table wr-tight"><thead><tr><th>community</th><th class="k-n">March</th><th class="k-n">April</th><th class="k-n">change</th><th class="k-n">change %</th><th class="k-n">new</th><th class="k-n">holds in April's re-runs <span class="k-profile">0 to 1</span></th></tr></thead><tbody>${grewRows}</tbody></table></div></section>`;
const side = (drawing, label, count, alt) =>
    `<div class="k-canvas"><div class="wr-cmp-head"><b>${label}</b><span class="k-secondary">${count}</span></div><div class="k-stage">${img(drawing, alt)}</div></div>`;
const cmpMain = `<main class="k-main"><div class="wr-cmp">${side("transactions-compare-march-sel", "A: March data", `${ringC.name}: ${ringC.marchSize} selected, ${A.compareSelection.inViewMarch} in view. 300%, one camera`, `March, the ${ringC.marchSize} accounts of ${ringC.name} selected`)}<div class="wr-cmp-handle"></div>${side("transactions-compare-april-sel", "B: April data", `${ringC.name}: ${ringC.aprilSize} selected, ${A.compareSelection.inViewApril} in view`, `April, the ${ringC.aprilSize} accounts of ${ringC.name} selected, new accounts marked`)}
  <div class="k-legend-card" style="left:12px;bottom:12px"><div class="k-lg-title">Only on one side</div><div class="k-lg-row"><span class="wr-semi wr-semi-l"></span>only in March<span class="k-value">${num(D.accountsRemoved)}</span></div><div class="k-lg-row"><span class="wr-semi wr-semi-r"></span>only in April<span class="k-value">${num(D.accountsAdded)}</span></div><div class="k-lg-row k-secondary">in both: unmarked</div><div class="k-lg-row k-secondary">2 more: Size: degree, Community color (one domain on both sides)</div></div></div>${cmpDock}</main>`;
const cmpRight = `<aside class="k-right" aria-label="Comparison">${headerRows({ one: `<span class="k-btn k-btn-secondary">Save comparison</span><span class="k-btn">Done</span>`, two: `<span class="k-tabs"><span class="k-tab" aria-selected="true">Comparison</span></span><span class="k-grow"></span>` })}
  <div class="k-typerow">${i("git-compare-arrows")}<span class="k-name k-ellipsis">Louvain communities, March and April</span></div>
  <div class="k-scroll wr-dw"><section class="k-section"><div class="k-section-head">Groups</div>
    <div class="k-prose wr-wrap wr-lead">${recon}.</div>
    <div class="k-data"><span class="k-name">matched groups</span><span class="k-value">${matched}</span></div>
    <div class="k-data"><span class="k-name">new groups</span><span class="k-value">${L.unmatchedApril}</span></div>
    <div class="k-data"><span class="k-name">lost groups (listed below)</span><span class="k-value">${lostGroups.length}</span></div>
    <div class="k-prose wr-wrap k-secondary">${Z.singletonCommunities} of the new groups are single accounts with no April transfers.</div></section>
  <section class="k-section"><div class="k-section-head">Agreement</div>
    <div class="k-prose wr-wrap wr-lead">${stayLine}, on the ${num(AG.accountsInBoth)} accounts in both.</div>
    <div class="k-data"><span class="k-name">without the ${Z.count} silent in April</span><span class="k-value">${ST.monthsWithoutDormantInTen} in 10</span></div>
    <div class="k-data"><span class="k-name">two runs on March's data</span><span class="k-value">${inTen(ST.marchRerunInTen)}</span></div>
    <div class="k-data"><span class="k-name">two runs on April's data</span><span class="k-value">${inTen(ST.aprilRerunInTen)}</span></div></section>
  <section class="k-section"><div class="k-section-head">${ringC.name}</div>
    <div class="k-data"><span class="k-name">March to April</span><span class="k-value">${ringC.marchSize} to ${ringC.aprilSize}</span></div>
    <div class="k-data"><span class="k-name">new in April</span><span class="k-value">${ringC.newAccounts}</span></div>
    <div class="k-data"><span class="k-name">Watchlist members in it</span><span class="k-value">${W.inCurrentData} of ${W.members}</span></div>
    <div class="k-data"><span class="k-name">holds in April's 5 re-runs</span><span class="k-value">${f2(ringC.holdsInReruns)}</span></div>
    <div class="k-row"><span class="k-btn k-btn-secondary">Create set</span><span class="k-btn k-btn-ghost">Add note...</span></div></section>
  <section class="k-section"><div class="k-section-head">Lost groups</div>
    <div class="k-prose wr-wrap k-secondary">March groups with no April match; their accounts are now in other groups.</div>
    <table class="k-table wr-tight wr-lost"><thead><tr><th>March group</th><th class="k-n">accounts</th><th>most now in</th></tr></thead><tbody>${lostGroups.map((g) => `<tr><td>${g.name}</td><td class="k-n">${g.marchSize}</td><td>${g.mostlyTo}</td></tr>`).join("")}</tbody></table></section></div></aside>`;
// The same panel scrolled to its Lost groups section, for the storyboard's close-up.
const lostSec = cmpRight.slice(cmpRight.indexOf(`  <section class="k-section"><div class="k-section-head">Lost groups`), cmpRight.lastIndexOf("</div></aside>"));
const cmpRightLost = cmpRight.replace(lostSec, "").replace(`<div class="k-scroll wr-dw">`, `<div class="k-scroll wr-dw">${lostSec}`);
S.compare = {
    title: "Wednesday: the comparison surface, March against April",
    say: `${ringC.name} is selected in the difference list, so its ${ringC.marchSize} March accounts and ${ringC.aprilSize} April accounts carry the selection ring on each side, and accounts only in April carry the right half-ring. The agreement rows say what they are computed on.`,
    html: app([rail("results"), resultsPanel({ rows: [rrow("chart-column", "Degree", cur), rrow("group", "Louvain communities", `<span class="k-secondary">comparing</span>`, "", ' aria-selected="true"'), rrow("sigma", BASELINE, cur)] }), cmpMain, cmpRight]),
    notes: [
        [[1199, 90, 241, 450], "The group counts reconcile in one sentence, each count with its own noun, and the lost groups are listed with where their accounts went. Agreement is said as what it means, beside the same without the silent accounts and what two runs on one month's data give. Numbers, never a verdict.", "task-flows.md 8.2, the three checks; graph-conventions.md 4", "DataRow, ProseBlock"],
        [[298, 540, 901, 360], `The difference list: ${ringC.name} is ninth by change, selected; selecting a row selects its accounts on both sides, matched by id. 'holds in April's re-runs' is a proposed column.`, "interaction-pattern-entries.md 4.9; framework-changes.md, the difference list", "DataTable"],
        [[298, 0, 901, 40], "Each side names its data version and what is selected; both share one drawing budget and one color domain.", "state-matrix.md 4.6; interface-templates.md 18", "split canvas container (missing), ResizeHandle"],
        [[310, 392, 212, 136], "Only-on-one-side is a form, not a hue: a half-ring left for March only, right for April only; in both is unmarked.", "canvas-drawing.md 6, ring 3; 11", "legend (graphty-element)"],
        [[1199, 0, 241, 48], "Save comparison is one undo step; Done is the only exit, and Esc moves focus to Done.", "interface-templates.md 18; interaction-patterns.md 3.6", "Button"],
    ],
    waits: ["the whole surface: the comparison row (interface-specification.md 7.4)", "the agreement and the seeded re-runs: 'A partition-similarity measure'", "the half-ring: 'A comparison's membership ... published as a categorical attribute'"],
};
// Wednesday's follow-up: the seven new accounts selected, their transfers in the table.
const flowRows = NF.rows
    .slice(0, 9)
    .map((r, k) => `<tr${k === 0 ? ' data-hover' : ""}><td class="k-id">${r.from}</td><td>${r.fromKind}</td><td class="k-id">${r.to}</td><td>${r.toKind}</td><td class="k-n">${usd(r.amount)}</td></tr>`)
    .join("");
const followDock = `<section class="k-dock wr-cmpdock" aria-label="Table"><div class="k-dock-tabs"><span class="k-tab">Nodes</span><span class="k-tab" aria-selected="true">Edges</span><span class="k-grow"></span><span class="k-icon-btn">${i("download")}</span></div>
  <div class="k-scope">Selected: ${NF.accounts.length} nodes. ${NF.transfers} edges with an end in it. Sorted by amount.</div>
  <div class="k-table-wrap"><table class="k-table wr-tight"><thead><tr><th>from_account</th><th>kind</th><th>to_account</th><th>kind</th><th class="k-n">amount <span class="k-profile">sum ${usd(nfTotal)}</span></th></tr></thead><tbody>${flowRows}</tbody></table></div></section>`;
const severalInspector = `<aside class="k-right" aria-label="Inspector">${headerRows()}
  <div class="k-typerow">${i("circle-dot")}<span class="k-name">${NF.accounts.length} selected</span><span class="k-secondary">Nodes</span></div>
  <div class="k-scroll wr-dw"><section class="k-section"><div class="k-section-head">Statistics</div>
    <div class="k-data"><span class="k-name">transfers in</span><span class="k-value">${passThrough.reduce((a, x) => a + x.in, 0)}, ${usd(NF.inSum)}</span></div>
    <div class="k-data"><span class="k-name">transfers out</span><span class="k-value">${NF.accounts.reduce((a, x) => a + x.out, 0)}, ${usd(NF.outSum)}</span></div></section>
  <section class="k-section"><div class="k-section-head">Attributes</div>
    <div class="k-data"><span class="k-name">kind</span><span class="k-value">personal</span></div>
    <div class="k-data"><span class="k-name">Louvain, March and April</span><span class="k-value">only in April</span></div>
    <div class="k-data"><span class="k-name">country</span><span class="k-value">3 differ</span></div></section>
  <section class="k-section"><div class="k-section-head">Appearance</div><div class="k-row">${stackChip}<span class="k-grow">Community color</span><span class="k-secondary">1 color</span></div></section>
  <section class="k-section" data-empty><div class="k-section-head">Export<span class="k-grow"></span><span class="k-icon-btn">${i("plus")}</span></div></section></div></aside>`;
S.followup = {
    title: "Wednesday: why it grew, the new accounts' transfers",
    say: `She selects the ${NF.accounts.length} new accounts of the set and reads their ${NF.transfers} transfers in the table. ${passThrough.length} of them each take about ${usd(ptIn[0]).replace(/\.\d+$/, "")} to ${usd(ptIn[1]).replace(/\.\d+$/, "")} from two ring accounts and send it on to ${cashOut.id} and a ring account; the seventh made two small payments.`,
    html: app([rail("graph"), graphPanel({ april: true, ring: true, sel: null }), canvas({ drawing: "transactions-april-ring-new", alt: `April transfers colored by community; the ${NF.accounts.length} new accounts of the ring's community selected`, legend: commLegend("april"), dock: followDock }), severalInspector]),
    notes: [
        [[298, 545, 901, 355], "The Edges tab follows the selection: every transfer with an end in it, sorted by amount. The amount column's profile gives the sum over the rows in scope, which is the number an analyst checks against a pivot table.", "interface-templates.md 16; framework-changes.md, a column's sum", "DataTable, column profile"],
        [[1199, 136, 241, 110], "Several elements: in and out, counted and summed over the selection.", "interface-specification.md 4.1, Several elements", "DataRow"],
        [[1199, 250, 241, 120], "Shared attributes, including the comparison's membership, which the saved comparison publishes as an attribute.", "canvas-drawing.md 11; interface-specification.md 4.1", "DataRow"],
    ],
    waits: ["the membership attribute: 'A comparison's membership ... published as a categorical attribute'", "the column sum: proposed (framework-changes.md)"],
};
const noteText = `${ringC.name} grew from ${ringC.marchSize} to ${ringC.aprilSize} accounts since March; ${ringC.newAccounts} are new. ${passThrough.length} of the new ones each took about $18k to $19k from two ring accounts and passed it on to ${cashOut.id} (merchant) and a ring account: pass-through. ${shopper.id} made two small payments (${usd(shopper.outSum)}) and looks like a shopper. Ask payments about the ${passThrough.length} before Friday.`;
S.note = {
    title: "Wednesday: a note on the set she kept",
    say: "She kept the community as a set from the comparison, and now writes what she found and why the set exists, citing the saved comparison.",
    html: app([
        rail("graph"),
        graphPanel({ april: true, ring: true, sel: "set" }),
        canvas({ drawing: "transactions-compare-april", alt: `April transfers, the ${ringC.aprilSize} members of ${SET} carrying the member ring`, legend: commLegend("april") }),
        `<aside class="k-right" aria-label="Inspector">${headerRows()}
          <div class="wr-typerow2">${i("group")}<span class="k-name">${SET}</span><div class="wr-line2"><span class="k-secondary">${ringC.aprilSize}; frozen set</span><span class="k-grow"></span><span class="k-icon-btn" title="Select members">${i("mouse-pointer-2")}</span><span class="k-icon-btn" title="Filter to">${i("funnel")}</span><span class="k-icon-btn" title="Add to set">${i("plus")}</span><span class="k-icon-btn">${i("ellipsis")}</span></div></div>
          <div class="k-scroll"><section class="k-section"><div class="k-row"><span class="k-secondary wr-lbl">Created from</span><span class="k-grow wr-wrap">${ringC.name}, Louvain on April data, in the comparison with March</span></div></section>
          <section class="k-section"><div class="k-section-head">Members</div><div class="k-data"><span class="k-name">accounts</span><span class="k-value">${ringC.aprilSize}; ${ringC.newAccounts} new in April</span></div></section>
          <section class="k-section"><div class="k-section-head">Appearance<span class="k-grow"></span><span class="k-icon-btn">${i("plus")}</span></div>
            <div class="k-row wr-routed">${stackChip}<span class="k-grow">Community color</span><span class="k-secondary">paints ${ringC.aprilSize}</span></div>
            <div class="k-row wr-routed">${sizeChip}<span class="k-grow">Size: degree</span><span class="k-secondary">paints ${ringC.aprilSize}</span></div></section>
          <section class="k-section"><div class="k-section-head">Notes <span class="k-count">1</span></div>
            <div class="wr-note-edit" data-focus>${noteText}<span class="wr-caret"></span></div>
            <div class="wr-cites"><span class="k-badge">${i("git-compare-arrows", "k-i-sm")} Comparison: Louvain, March and April</span></div>
            <div class="k-prose k-tertiary">Enter, new line. Ctrl+Enter adds the note.</div></section>
          <section class="k-section"><div class="k-section-head">Used by</div><div class="k-row"><span class="k-grow">Comparison: Louvain, March and April</span></div></section>
          <section class="k-section" data-empty><div class="k-section-head">Export<span class="k-grow"></span><span class="k-icon-btn">${i("plus")}</span></div></section></div></aside>`,
    ]),
    notes: [
        [[57, 155, 241, 100], "The kept set, selected: the only selected row in the panel. The current graph keeps its current-page tint.", "interface-templates.md 2; output-homes.md 3.3", "Tree, PageRow"],
        [[1199, 88, 241, 60], "The set's type row: name, then its size and kind with Select members, Filter to and Add to set.", "interface-specification.md 4.2", "type row (missing: 7.3)"],
        [[1199, 300, 241, 100], "Appearance: the set's own row is its header with '+' (it has no layer yet); beneath, read-only routed rows for each layer that paints its members, each opening that layer.", "interface-specification.md 3.1, a kept set; 4.1", "ControlSection, ActionRow"],
        [[1199, 420, 241, 300], "The note is anchored to the set and cites the saved comparison. Ctrl+Enter adds it: one undo entry, 'Add note'.", "task-flows.md 7; interface-templates.md 10, Note", "ProseBlock editor, Badge"],
    ],
    waits: ["the set's inspector: object selection (door 39, interface-specification.md 4.0)", "the set's own Appearance row: the own row (7.4)", "Notes: 'A notes collection with targets, citations and quoted values'"],
};
// Friday.
const editor = `<div class="k-popover wr-editor" style="left:306px;top:233px"><div class="k-popover-head">PageRank<span class="k-grow"></span><span class="k-btn k-btn-secondary">Run</span><span class="k-icon-btn">${i("x")}</span></div>
  <div class="k-popover-body">
    <div class="k-prose k-secondary wr-wrap">Scores each node by how much of the graph's flow lands on it, following edge direction.</div>
    <div class="k-prose">Current. Ran today 09:06 on April data.</div>
    <div class="k-data"><span class="k-name">Scope</span><span class="k-value">Full graph, ${num(A.nodes)}</span></div>
    <div class="k-data"><span class="k-name">Direction</span><span class="k-value">follow transfers</span></div>
    <div class="k-data"><span class="k-name">Weight</span><span class="k-value">none</span></div>
    <div class="k-data"><span class="k-name">damping</span><span class="k-value">0.85</span></div>
    <div class="k-section-head">Appearance</div>
    <div class="k-row">${i("eye")}<span class="k-grow">PageRank sizes</span><span class="k-secondary">run</span></div>
    <div class="k-prose k-secondary">Size set by Size: degree. <span class="wr-link">Apply anyway</span></div>
    <div class="k-row wr-verbs"><span class="k-btn k-btn-ghost" data-hover>Color by</span><span class="k-btn k-btn-ghost">Size by</span><span class="k-btn k-btn-ghost">Label with</span></div>
    <div class="k-section-head">Top nodes</div>
    ${PR.top.slice(0, 3).map((r) => `<div class="k-data"><span class="k-name"><span class="k-id">${r.id}</span> <span class="k-secondary">${r.kind}</span></span><span class="k-value">${r.pagerank.toFixed(4)}</span></div>`).join("")}
    <div class="k-prose"><span class="wr-link">${num(A.nodes - 3)} more</span></div>
  </div></div>`;
const encoding = `<div class="k-popover" style="left:554px;top:520px;width:260px"><div class="k-popover-head"><span class="k-ellipsis">PageRank -&gt; Color</span><span class="k-grow"></span><span class="k-icon-btn">${i("x")}</span></div>
  <div class="k-popover-body">
    <div class="k-prose k-secondary">New layer: PageRank color</div>
    <div class="k-fieldrow"><span class="k-legend">Scale</span><div class="k-fields"><span class="k-field k-span">Log<svg class="k-i k-i-sm k-caret"><use href="../kit/icons.svg#chevron-down"/></svg></span></div></div>
    <div class="k-prose k-tertiary wr-wrap">Log is the default for a heavy-tailed measure (options-and-encodings 5).</div>
    <div class="k-fieldrow"><span class="k-legend">Domain</span><div class="k-hist wr-hist"><i style="height:90%"></i><i style="height:70%"></i><i style="height:44%"></i><i style="height:25%"></i><i style="height:12%"></i><i style="height:6%"></i><i style="height:3%"></i><i style="height:2%"></i></div></div>
    <div class="k-data"><span class="k-name">fitted to this filter</span><span class="k-value">${prRange}</span></div>
    <div class="k-prose k-tertiary wr-wrap">Full graph: ${fullPrRange}. <span class="wr-link">Use the result's scope</span></div>
    <div class="k-data"><span class="k-name">Palette</span><span class="k-value"><span class="k-ramp" style="width:64px"></span></span></div>
    <div class="k-data"><span class="k-name">No value</span><span class="k-value">0</span></div>
  </div></div>`;
S.pagerank = {
    title: "Friday: filtered to the ring, PageRank, Color by",
    say: `The graph is filtered to the ring's community and two steps upstream (${UP.accounts} accounts) and laid out again. PageRank runs on the full graph; Color by opens the encoding popover, where the log scale is the default and she fits the domain to the filter.`,
    html: app([
        rail("results"),
        resultsPanel({ chip: FILTERED, rows: [rrow("chart-column", "Degree", cur), rrow("group", "Louvain communities", cur), rrow("sigma", BASELINE, cur), rrow("chart-column", "PageRank", cur, "", ' aria-selected="true"')], extra: editor + encoding }),
        canvas({ drawing: "transactions-april-upstream-pagerank", alt: `The ring's community and two steps upstream, ${UP.accounts} accounts, colored by PageRank`, legend: prLegend() }),
        graphInspector({ april: true, layout: "; run on the filter" }),
    ]),
    notes: [
        [[57, 35, 241, 32], `The chip says the graph is filtered: ${UP.accounts} of ${num(A.nodes)} accounts, one step (the set's members and two steps in, Filter to).`, "interface-templates.md 7", "Pill (filter chip)"],
        [[306, 233, 240, 500], "The result editor, top-aligned to the PageRank row, right of the left panel. Scope is the full graph on purpose: PageRank of a cut-out graph would be a different measure.", "interface-templates.md 10, Result; top-aligned rule", "Popout, DataRow"],
        [[314, 553, 224, 32], "The encoding verbs are three plain commands, not a mode: each adds a style layer bound to this result.", "interface-templates.md 10; options-and-encodings.md 4", "Button (ghost)"],
        [[554, 520, 260, 345], "The encoding popover in the nested-picker slot, headed with the channel and the new layer. The domain is pinned to the result's scope; Fit to current scope moved it, one undo step, and the legend says so.", "options-and-encodings.md 5, domain pinned; interface-templates.md 10, Encoding", "Popout, CompactSelect, histogram"],
    ],
    waits: ["Run layout on the filtered graph: 'A layout scope carried in the one layout settings per graph'"],
};
const foundInspector = `<aside class="k-right" aria-label="Inspector">${headerRows()}
  <div class="wr-typerow2">${i("route")}<span class="k-name">Found path</span><div class="wr-line2"><span class="k-secondary">${P.hops} hops</span><span class="k-grow"></span><span class="k-btn k-btn-secondary wr-mini-btn" data-hover>Keep path</span><span class="k-icon-btn" title="Select members">${i("mouse-pointer-2")}</span><span class="k-icon-btn" title="Filter to">${i("funnel")}</span><span class="k-icon-btn">${i("ellipsis")}</span></div></div>
  <div class="k-scroll"><section class="k-section"><div class="k-row"><span class="k-secondary wr-lbl">Created from</span><span class="k-grow wr-wrap">Shortest path, directed, unweighted, on the filter (${UP.accounts} accounts), April data; the only shortest path</span></div></section>
  <section class="k-section"><div class="k-section-head">Attributes</div><div class="k-data"><span class="k-name">hops</span><span class="k-value">${P.hops}</span></div></section>
  <section class="k-section"><div class="k-section-head">Members</div>${P.nodes.map((n) => `<div class="k-data"><span class="k-name k-id">${n.id}</span><span class="k-value">${n.kind}, ${n.country}${n.community === ringC.name ? ", in the set" : ""}</span></div>`).join("")}</section>
  <section class="k-section"><div class="k-section-head">Appearance</div><div class="k-row"><span class="k-btn k-btn-secondary">Keep path</span></div>
    <div class="k-row wr-routed">${dashChip}<span class="k-grow">Shortest path</span><span class="k-secondary">run</span></div>
    <div class="k-row wr-routed">${rampChip}<span class="k-grow">PageRank color</span><span class="k-secondary">paints ${P.hops + 1}</span></div></section>
  <section class="k-section" data-empty><div class="k-section-head">Export<span class="k-grow"></span><span class="k-icon-btn">${i("plus")}</span></div></section></div></aside>`;
S.path = {
    title: "Friday: a found path stacks on top and paints only itself",
    say: `The Path tool finds the route from ${P.from} into the ring: ${P.hops} hops, the only shortest one. It is offered, not kept: its type row reads Found path, and its only Appearance control is Keep path. The Shortest path run's automatic layer sits on top of the Styles list and paints only the path.`,
    html: app([
        rail("graph"),
        graphPanel({ april: true, ring: true, styles: "path", chip: FILTERED }),
        canvas({ drawing: "transactions-april-upstream-path", alt: `Colored by PageRank; the shortest path ${P.from} to ${P.to} selected and highlighted`, legend: prLegend(true), pathTool: true }),
        foundInspector,
    ]),
    notes: [
        [[57, 275, 241, 160], "The Styles list, top first: the Shortest path run's automatic layer (marked run), PageRank color, Size: degree, Community color. The found path itself has no row: it stays in the run's item tab until kept.", "interface-templates.md 9; interaction-patterns.md 3.2", "Tree"],
        [[1199, 88, 241, 60], "The offered state: 'Found path', its hops, and Keep path in the first slot, because it is gone at the next run unless kept.", "interface-specification.md 4.0, 4.2, the offered path", "type row (missing: 7.3)"],
        [[1199, 445, 241, 130], "Appearance on an offered path: the one control Keep path, then the layers that paint its members.", "interface-specification.md 3.1, offered", "Button, ActionRow"],
        [[440, 370, 200, 140], "The highlight writes only its own mark on the path's accounts and transfers. Every other account keeps PageRank's color.", "canvas-drawing.md 5, 6; CLAUDE.md, Algorithm Styles", "canvas (graphty-element)"],
        [[535, 790, 425, 46], "The Path tool's bar: From, To, Scope, Run. Its keyboard route is Quick actions.", "task-flows.md 10.2; interface-templates.md 14", "SecondaryToolbar, ComboInput"],
    ],
    waits: ["the found path's inspector: object selection (door 39); until then it is kept from its row's menu (interface-specification.md 4.0)"],
};
S["path-kept"] = {
    title: "Friday: after Keep path, the path is kept",
    say: `Keep path keeps it: one undo entry, "Keep path ${PATHNAME}". It joins Sets and paths, selected; next month's replay will carry it by id.`,
    html: app([
        rail("graph"),
        graphPanel({ april: true, ring: true, keptPath: true, styles: "path", sel: "path", chip: FILTERED }),
        canvas({ drawing: "transactions-april-upstream-path", alt: `The kept path ${PATHNAME} selected and highlighted`, legend: prLegend(true) }),
        `<aside class="k-right" aria-label="Inspector">${headerRows()}
          <div class="wr-typerow2">${i("route")}<span class="k-name k-id">${PATHNAME}</span><div class="wr-line2"><span class="k-secondary">Simple path; ${P.hops} hops</span><span class="k-grow"></span><span class="k-icon-btn">${i("mouse-pointer-2")}</span><span class="k-icon-btn">${i("funnel")}</span><span class="k-icon-btn">${i("group")}</span><span class="k-icon-btn">${i("ellipsis")}</span></div></div>
          <div class="k-scroll"><section class="k-section"><div class="k-row"><span class="k-secondary wr-lbl">Created from</span><span class="k-grow wr-wrap">Shortest path, directed, unweighted, on the filter, April data</span></div></section>
          <section class="k-section"><div class="k-section-head">Members</div>${P.nodes.map((n) => `<div class="k-data"><span class="k-name k-id">${n.id}</span><span class="k-value">${n.kind}, ${n.country}</span></div>`).join("")}</section>
          <section class="k-section"><div class="k-section-head">Appearance<span class="k-grow"></span><span class="k-icon-btn">${i("plus")}</span></div>
            <div class="k-row wr-routed">${dashChip}<span class="k-grow">Shortest path</span><span class="k-secondary">run</span></div>
            <div class="k-row wr-routed">${rampChip}<span class="k-grow">PageRank color</span><span class="k-secondary">paints ${P.hops + 1}</span></div></section>
          <section class="k-section" data-empty><div class="k-section-head">Export<span class="k-grow"></span><span class="k-icon-btn">${i("plus")}</span></div></section></div></aside>`,
    ]),
    notes: [
        [[57, 155, 241, 140], "The kept path is a row in Sets and paths, selected: the one selected row. Its own layer does not exist until the analyst styles it ('+').", "output-homes.md 3.3; interface-specification.md 3.1", "Tree"],
        [[1199, 88, 241, 60], "Kept: the type row names it and its derived kind; Select members leads.", "interface-specification.md 4.2, Path", "type row"],
    ],
    waits: ["the path's inspector: object selection (door 39)"],
};
const legendExport = `<div class="wr-prev-legend">
  <div class="wr-pl-t">${dashChip} Shortest path, highlight 1</div><div class="wr-pl-s">${P.from} to ${P.to}, ${P.hops} hops; start and end marked</div>
  <div class="wr-pl-t">PageRank color, log scale</div><div class="wr-pl-ramp"></div><div class="wr-pl-s wr-pl-ends"><span>${sig(upDom[0])}</span><span>${sig(upDom[1])}</span></div><div class="wr-pl-s">fitted to these ${UP.accounts} accounts; PageRank on the full graph</div>
  <div class="wr-pl-t">Size: degree</div><div class="k-size-marks wr-pl-marks">${[1, 10, 40].map((m) => { const r = Math.min(12, 1.8 + Math.sqrt(m) * 0.35) * 2; return `<div><b style="width:${f2(r)}px;height:${f2(r)}px"></b>${m}</div>`; }).join("")}</div><div class="wr-pl-s">domain 0 to ${num(A.stats.maxDegree)}, full graph</div>
</div>`;
const caption = `Transfers, April data (${F.accounts.file}, ${F.transfers.file}). ${SCOPE}: ${UP.accounts} of ${num(A.nodes)} accounts, ${UP.transfers} transfers.`;
const methods = `Transfers, April data: ${F.accounts.file} (${num(A.nodes)} accounts) and ${F.transfers.file} (${num(A.edges)} transfers), directed. Scope: ${SET} (${ringC.name} of Louvain communities on April data, ${ringC.aprilSize} accounts) and two steps upstream along transfers: ${UP.accounts} accounts, ${UP.transfers} transfers. Layout: ForceAtlas2, run on that scope. PageRank on the full graph, directed, unweighted, damping 0.85, 100 iterations; colored on a log scale fitted to the scope, ${prRange}. Sized by degree on the full graph, 0 to ${num(A.stats.maxDegree)}. Shortest path ${PATHNAME}, directed, unweighted, on the scope: ${P.hops} hops, the only shortest path. Louvain: weighted by amount, direction ignored, seed 11, with 5 seeded re-runs (seeds 12 to 16). Not on the figure: Community color, painted over everywhere. graphty-element 2.0.`;
const exportDialog = `<div class="k-backdrop"><div class="k-modal wr-modal-export">
  <div class="k-modal-head">Export<span class="k-grow"></span><span class="k-icon-btn">${i("x")}</span></div>
  <div class="k-modal-body"><div class="wr-export">
    <div class="wr-preview"><div class="wr-prev-fig">${`<img src="../kit/canvas/transactions-april-upstream-path-light.svg" alt="Preview of the figure">`}${legendExport}</div><div class="wr-prev-cap">${caption}</div>
      <div class="wr-prev-file">${i("file", "k-i-sm")} case-0314-april-methods.txt<div class="wr-prev-methods">${methods}</div></div></div>
    <div>
      <section class="k-section"><div class="k-section-head">Figures</div>
        <div class="k-row"><span class="k-check" aria-checked="true"></span><span class="k-grow">Current view</span></div>
        <div class="k-fieldrow"><div class="k-fields"><span class="k-field">2x${i("chevron-down", "k-i-sm k-caret")}</span><span class="k-field">PNG${i("chevron-down", "k-i-sm k-caret")}</span><span class="k-icon-btn">${i("ellipsis")}</span></div></div>
        <div class="k-data"><span class="k-name">Background</span><span class="k-value">Light canvas</span></div>
        <div class="k-data"><span class="k-name">Size</span><span class="k-value">2,400 by 1,600 px</span></div>
        <div class="k-row"><span class="k-btn k-btn-ghost">${i("copy")}Copy as PNG</span></div></section>
      <section class="k-section"><div class="k-section-head">Methods text</div><div class="k-row"><span class="k-check" aria-checked="true"></span><span class="k-grow">One text file beside the figure</span></div></section>
      <section class="k-section"><div class="k-section-head">Tables</div><div class="k-row"><span class="k-check"></span><span class="k-grow">Nodes, ${UP.accounts} rows</span></div><div class="k-row"><span class="k-check"></span><span class="k-grow">Edges, ${UP.transfers} rows</span></div></section>
      <section class="k-section"><div class="k-section-head">Share the setup, without data</div><div class="k-row"><span class="k-check"></span><span class="k-grow">Recipe</span></div><div class="k-row"><span class="k-check"></span><span class="k-grow">Style</span></div></section>
    </div></div></div>
  <div class="k-modal-foot"><span class="k-btn k-btn-ghost">${i("copy")}Copy methods text</span><span class="k-grow"></span><span class="k-btn k-btn-secondary">Cancel</span><span class="k-btn">Export</span></div></div></div>`;
S.export = {
    title: "Friday: the figure with its legend, caption and methods text",
    say: "The Export dialog has one section per kind, each item with a checkbox and its own setting row. The preview is the file: the legend in full, top first, and a caption line with the graph, data version and scope.",
    html: app([rail("graph"), graphPanel({ april: true, ring: true, keptPath: true, styles: "path", chip: FILTERED }), canvas({ drawing: "transactions-april-upstream-path", alt: "The figure being exported", legend: prLegend(true) }), graphInspector({ april: true, notes: 2, layout: "; run on the filter" }), exportDialog]),
    notes: [
        [[150, 140, 652, 470], "The preview is the file: legend drawn in, in full and top first, with the ramp's domain and scale, the size key and the path entry; the caption line names graph, data version and scope. A figure that loses its legend is the flow's first failure.", "canvas-drawing.md 13; options-and-encodings.md 6 items 7 and 9; task-flows.md 9", "Modal, preview (graphty-element figure export)"],
        [[812, 146, 472, 190], "Figures: the current view, checked, with its setting row (scale and format), background and size. PNG is the only format until vector output lands; blocked parts are absent.", "interface-templates.md 20, Export...; canvas-drawing.md 13", "ControlSection, CompactCheckboxIcon, CompactSelect"],
        [[812, 340, 472, 300], "The other kinds, one section each, unchecked unless asked. The methods text is a file beside the figure.", "interface-templates.md 20; framework-changes.md, methods text", "ControlSection"],
        [[150, 615, 652, 135], "The methods text, written from the records: data files, scope, layout, each run with its settings and seeds, and the layer that is not on the figure.", "glossary.md 5, methods text; options-and-encodings.md 6 item 7", "ProseBlock"],
    ],
    waits: ["the legend drawn into the figure: 'Exported figures' (element-needs.md)"],
};

// ---------- pages ----------
const css = `
  .k-rail-pill { position: relative; }
  .k-item[aria-current="page"]::before { background: var(--cm-bg-secondary); }
  .k-item[aria-current="page"] { font-weight: 550; }
  .wr-pinned { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 8px 0 16px; background: var(--cm-bg-secondary); border-bottom: 1px solid var(--cm-border); }
  .wr-rr .k-trail { gap: 6px; }
  .wr-rr-line { list-style: none; padding: 0 8px 6px 32px; margin-top: -6px; color: var(--cm-text-secondary); }
  .wr-link { color: var(--cm-text-brand); text-decoration: none; }
  .wr-cap { padding: 8px 16px 0; }
  .wr-lead { color: var(--cm-text); font-weight: 550; }
  .wr-lost { margin: 0 8px 8px 16px; width: calc(100% - 24px); }
  .wr-lost th, .wr-lost td { padding-left: 0; padding-right: 4px; }
  .wr-wrap { white-space: normal; line-height: 16px; padding-top: 4px; padding-bottom: 4px; }
  .wr-nw { white-space: nowrap; }
  .wr-dw .k-data { height: auto; min-height: 28px; align-items: flex-start; padding-top: 5px; padding-bottom: 5px; }
  .wr-dw .k-data .k-name { white-space: normal; overflow: visible; line-height: 16px; }
  .wr-dw .k-data .k-value { line-height: 16px; white-space: nowrap; }
  .wr-lbl { width: 72px; flex: none; }
  .wr-import { align-items: flex-start; padding-top: 4px; }
  .wr-import > svg { margin-top: 4px; }
  .wr-cols { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 16px 8px; }
  .wr-mini { margin: 0 16px; width: calc(100% - 32px); }
  .wr-mini th, .wr-mini td { height: 24px; }
  .wr-tight th, .wr-tight td { height: 26px; }
  .wr-modal-load { width: 960px; }
  .wr-modal-pick { width: 640px; }
  .wr-pick { margin: 0 8px; }
  .wr-pick-d { width: 88px; text-align: right; }
  .wr-pick-s { width: 80px; text-align: right; }
  .wr-ib { display: flex; flex-direction: column; gap: 4px; min-width: 0; white-space: normal; line-height: 16px; padding: 5px 0 8px; }
  .wr-same { height: auto; }
  .wr-load { display: grid; grid-template-columns: 1fr 1fr; gap: 0 8px; }
  .wr-issue { align-items: flex-start; }
  .wr-issue .k-warn-glyph { margin-top: 6px; }
  .wr-dash { display: inline-block; width: 16px; height: 4px; flex: none; background: repeating-linear-gradient(90deg, var(--cm-text) 0 6px, transparent 6px 9px); box-shadow: 0 0 0 1px var(--cm-bg); vertical-align: middle; }
  .wr-semi { display: inline-block; width: 12px; height: 12px; flex: none; border: 2px solid var(--cm-text); border-radius: 50%; box-sizing: border-box; }
  .wr-semi-l { border-right-color: transparent; border-top-color: transparent; transform: rotate(45deg); }
  .wr-semi-r { border-left-color: transparent; border-bottom-color: transparent; transform: rotate(45deg); }
  .wr-cmp { position: relative; flex: 1 1 auto; display: grid; grid-template-columns: 1fr 1px 1fr; min-height: 0; }
  .wr-cmp > .k-canvas { height: 100%; }
  .wr-cmp-handle { background: var(--cm-border-strong); }
  .wr-cmp-head { position: absolute; left: 0; right: 0; top: 0; z-index: 5; display: flex; gap: 8px; align-items: center; height: 40px; padding: 0 12px; background: var(--cm-bg); border-bottom: 1px solid var(--cm-border); }
  .wr-cmpdock { flex-basis: 40%; }
  .wr-cmpdock .k-table { width: auto; }
  .wr-typerow2 { display: grid; grid-template-columns: 16px 1fr; align-items: center; gap: 0 8px; padding: 8px 8px 4px 16px; border-bottom: 1px solid var(--cm-border); }
  .wr-typerow2 .k-name { font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .wr-line2 { grid-column: 1 / span 2; display: flex; align-items: center; gap: 2px; height: 32px; min-width: 0; }
  .wr-line2 > .k-secondary { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .wr-mini-btn { height: 24px; }
  .wr-routed { padding-inline-start: 24px; }
  .wr-verbs { gap: 4px; }
  .wr-hist { height: 32px; margin: 0 8px 0 0; }
  .wr-note-edit { margin: 0 8px 0 16px; padding: 6px 8px; border-radius: 5px; background: var(--cm-bg-secondary); outline: 1px solid var(--cm-border-selected); outline-offset: -1px; line-height: 16px; }
  .wr-caret { display: inline-block; width: 1px; height: 13px; background: var(--cm-text); vertical-align: -2px; margin-inline-start: 1px; }
  .wr-cites { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px 8px 4px 16px; }
  .wr-cites .k-badge { gap: 4px; height: auto; min-height: 16px; padding: 2px 4px; }
  .wr-startpage { width: 1440px; height: 900px; background: var(--cm-bg); }
  .wr-startpage .k-start { max-width: 880px; padding-top: 96px; }
  .wr-start-actions { display: flex; gap: 8px; margin-top: 24px; }
  .wr-toast .k-progress { width: 64px; }
  .wr-modal-export { width: 1160px; }
  .wr-export { display: grid; grid-template-columns: 640px 1fr; gap: 16px; padding: 8px 16px 0; }
  .wr-prev-fig { position: relative; aspect-ratio: 3 / 2; box-shadow: 0 0 0 1px var(--cm-border); border-radius: 5px 5px 0 0; overflow: hidden; background: #F5F5F5; }
  .wr-prev-fig > img { width: 100%; height: 100%; display: block; }
  .wr-prev-legend { position: absolute; right: 8px; top: 8px; width: 196px; padding: 6px 8px; border-radius: 6px; background: #fff; box-shadow: 0 0 0 1px #ddd; color: #1a1a1a; font-size: 10px; line-height: 13px; }
  .wr-pl-t { font-weight: 600; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
  .wr-pl-t:first-child { margin-top: 0; }
  .wr-pl-s { color: #555; }
  .wr-pl-ramp { height: 8px; margin: 3px 0 1px; border-radius: 2px; background: linear-gradient(90deg, #440154, #3b528b, #21918c, #5ec962, #fde725); }
  .wr-pl-ends { display: flex; justify-content: space-between; }
  .wr-pl-marks, .wr-pl-marks div { color: #1a1a1a !important; }
  .wr-pl-marks b { background: #808080 !important; }
  .wr-prev-legend .wr-dash { background: repeating-linear-gradient(90deg, #1a1a1a 0 6px, transparent 6px 9px); box-shadow: none; }
  .wr-prev-cap { padding: 4px 8px 6px; border-radius: 0 0 5px 5px; box-shadow: 0 0 0 1px var(--cm-border); background: #F5F5F5; color: #1a1a1a; font-size: 10px; line-height: 14px; }
  .wr-prev-file { margin-top: 8px; padding: 6px 8px; border-radius: 5px; background: var(--cm-bg-secondary); color: var(--cm-text); }
  .wr-prev-methods { margin-top: 4px; font-size: var(--k-caption-fs); line-height: var(--k-caption-lh); color: var(--cm-text-secondary); }
  .k-secondary-bar .k-field { min-width: 88px; }
  .k-legend-card { max-width: 212px; }
  .wr-screen { position: relative; width: 1440px; height: 900px; overflow: hidden; transform: translateZ(0); background: var(--cm-bg); }
  .wr-screen > .k-app { width: 1440px; height: 900px; }
`;
const annot = (notes) =>
    notes.map(([[x, y, w, h]], k) => `<span class="k-annot-box an" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></span><span class="k-step an" style="position:absolute;z-index:92;left:${x + w - 10}px;top:${Math.max(0, y - 10)}px">${k + 1}</span>`).join("");
const WARN = "<!-- THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT storyboards/weekly-return.gen.mjs (numbers: kit/gen-canvas.mjs) AND RUN node storyboards/weekly-return.gen.mjs -->";
const waitsLine = (w) => (w.length ? `<p class="st-waits"><b>Waits on graphty-element:</b> ${w.join("; ")}. Absent until each lands (interface-specification.md 7.4).</p>` : "");

const order = ["start", "reopened", "reopened-rest", "menu", "picker", "adddata", "load", "replay", "rerun", "compare-pick", "compare", "followup", "note", "pagerank", "path", "path-kept", "export"];
const screens = `<!doctype html>
<html lang="en">
${WARN}
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440">
<title>The weekly return: screens</title>
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>${css}
  body { background: var(--cm-bg-secondary); }
  .pg-head { max-width: 1440px; padding: 24px 24px 8px; font-size: 13px; line-height: 20px; }
  .pg-head h1 { font-size: 24px; line-height: 32px; margin: 0 0 8px; font-weight: 600; }
  .pg-head p { max-width: 90ch; margin: 0 0 8px; color: var(--cm-text-secondary); }
  .pg-head a, .st a { color: var(--cm-text-brand); }
  .pg-toc { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 8px 0; }
  .an-off { display: none; }
  #notes:target ~ .pg-head .an-on { display: none; }
  #notes:target ~ .pg-head .an-off { display: inline; }
  .st { padding: 24px 0 16px; }
  .st-head { padding: 0 24px 12px; font-size: 13px; line-height: 20px; }
  .st-head h2 { font-size: 15px; line-height: 25px; margin: 0; font-weight: 600; }
  .st-head p { margin: 0; color: var(--cm-text-secondary); max-width: 110ch; }
  .st-head .st-waits { color: var(--cm-text); margin-top: 4px; }
  .an { display: none !important; }
  #notes:target ~ .states .an { display: inline-grid !important; }
  #notes:target ~ .states .k-annot-box.an { display: block !important; }
  .st-notes { display: none; margin: 12px 24px 0; padding: 0; list-style: none; max-width: 1392px; font-size: 12px; line-height: 18px; }
  #notes:target ~ .states .st-notes { display: grid; grid-template-columns: 28px 1fr 1fr 240px; gap: 6px 12px; }
  .st-notes .h { color: var(--cm-text-secondary); font-weight: 600; }
</style>
</head>
<body>
<span id="notes"></span>
<header class="pg-head">
  <h1>The weekly return: screens</h1>
  <p>Every screen of the storyboard <a href="../storyboards/weekly-return.html">The weekly return, on a monthly export</a>, full size at 1440 by 900: ${WHO}, a fraud investigator, reopens last month's case project, replaces March's account and transfer files with April's, compares the two months, follows up on the new accounts and keeps a set with a note, then filters to the ring, colors by PageRank, keeps a path and exports the figure. Every number comes from the kit's March and April data. The same flow with the binding step and a recipe is <a href="replace-and-recipe.html">Update with new data, apply a recipe</a>.</p>
  <p>Each state says which graphty-element capabilities it waits on; those parts are absent from the product until the element has them.</p>
  <p><a class="an-on" href="#notes">Show annotations</a><a class="an-off" href="#">Hide annotations</a> -- numbered boxes over each state, with the framework section behind each element and the compact-mantine component it would be built with.</p>
  <nav class="pg-toc">${order.map((id, k) => `<a href="#${id}">${k + 1}. ${S[id].title}</a>`).join("")}</nav>
</header>
<div class="states">
${order
    .map(
        (id, k) => `<section class="st" id="${id}"><div class="st-head"><h2>${k + 1}. ${S[id].title}</h2><p>${S[id].say}</p>${waitsLine(S[id].waits)}</div>
  <div class="wr-screen" data-kit-frame>${S[id].html}${annot(S[id].notes)}</div>
  <ol class="st-notes"><li class="h">#</li><li class="h">What and why</li><li class="h">Framework</li><li class="h">compact-mantine</li>${S[id].notes.map(([, t, f, c], n) => `<li><span class="k-step">${n + 1}</span></li><li>${t}</li><li>${f}</li><li>${c}</li>`).join("")}</ol></section>`,
    )
    .join("\n")}
</div>
</body>
</html>
`;
writeFileSync(join(proto, "screens/weekly-return.html"), toShell(screens)); // the current frame: kit/shell.mjs

// ---------- the storyboard ----------
// A frame's picture: the whole screen small (with its attention boxes), then each attention
// region cropped from the same screen at up to full size, so the words in it can be read.
const TW = 576;
const CW = 656; // the crops column beside the thumbnail
const box = (x, y, w, h, k) => `<span class="k-annot-box" style="left:${(x / 1440) * 100}%;top:${(y / 900) * 100}%;width:${(w / 1440) * 100}%;height:${(h / 900) * 100}%"></span><span class="wr-tag" style="left:${((x + w) / 1440) * 100}%;top:${(y / 900) * 100}%">${k}</span>`;
const cursor = (x, y) => `<span class="k-cursor" style="left:${(x / 1440) * 100}%;top:${(y / 900) * 100}%"></span>`;
const crop = (html, [x, y, w, h], k, maxW = CW) => {
    const s = Math.min(1, maxW / w, 520 / h);
    return `<div class="wr-crop" style="width:${Math.round(w * s)}px;height:${Math.round(h * s)}px"><div class="wr-screen" data-kit-frame style="transform:scale(${s.toFixed(3)}) translate(${-x}px,${-y}px)">${html}</div>${k ? `<span class="wr-croptag">${k}</span>` : ""}</div>`;
};
function shot(id, regions, { cur: c = null, extras = [] } = {}) {
    const st = S[id];
    const boxes = regions.map(([x, y, w, h], k) => box(x, y, w, h, k + 1)).join("");
    const main = `<a class="wr-thumb" href="../screens/weekly-return.html#${id}" title="Open this screen full size"><div class="wr-screen" data-kit-frame>${st.html}</div>${boxes}${c ? cursor(...c) : ""}${st.waits.length ? `<span class="k-annot-tag wr-waitflag">waits on graphty-element</span>` : ""}</a>`;
    const crops = regions.map((r, k) => crop(st.html, r, k + 1)).join("");
    return `${main}<div class="wr-crops">${crops}${extras.join("")}</div>`;
}
const between = (when, lines, card) => `<div class="wr-thumb wr-between"><div class="wr-when">${when}</div>${card}<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul></div>`;
const noticeInset = (label, text, action) => `<div class="wr-inset"><div class="wr-inset-label">${label}</div><div class="wr-inset-body">${toast(text, action)}</div></div>`;

if (!S.compare.html.includes(cmpRight)) throw new Error("the comparison panel is not in its screen");
const frames = [
    {
        day: "Monday",
        pic: `<a class="wr-thumb wr-thumb-crop" href="../screens/weekly-return.html#start" title="Open this screen full size">${crop(S.start.html, [260, 70, 920, 430], 0, TW)}</a>`,
        where: "Monday 08:52, at her desk. The start screen.",
        does: `April's statements for the case landed at 08:40: <span class="k-id">${F.accounts.file}</span> and <span class="k-id">${F.transfers.file}</span>. She opens graphty and clicks last month's project in Recent projects: one step.`,
        sees: "The thumbnail is the graph as she left it, colored by community.",
        trust: "Is this last month's state?",
        said: "Case 0314. Please just be how I left it.",
        happens: `The project opens. Opening runs nothing; it brings back what she left, down to the ${FL.length} accounts she had selected.`,
        link: ["start"],
    },
    {
        day: "Monday",
        pic: shot("reopened", [[57, 0, 241, 360], [1199, 90, 241, 300], [590, 775, 300, 60]], { extras: [crop(S["reopened-rest"].html, [1199, 215, 241, 265], "d")] }),
        where: "Monday 08:53. The project, as she closed it.",
        does: `She reads before she acts. Then Esc, to see the graph itself (close-up d).`,
        sees: `Full graph on the filter chip; Size: degree and Community color, in last month's order; the Watchlist of ${W.members} accounts; the ${FL.length} flagged accounts still selected, the inspector on them, and the state line "${RESTORED}". After Esc, the inspector rests on the graph and its Last import row names March's two files and the date.`,
        trust: "Is this last week's state?",
        said: "There's my ring, still selected. That's where I stopped. Which export is this, though -- before or after they fixed the dates?",
        answered: "The state line says the selection is the one she closed on; after Esc, the Last import row names both files and the day they were read, and the history icon opens every version.",
        happens: "Nothing changes on opening. Esc clears the selection; Ctrl+Z would bring it back.",
        link: ["reopened", "reopened-rest"],
    },
    {
        day: "Monday",
        pic: shot("menu", [[276, 170, 340, 104]], { cur: [420, 190], extras: [crop(S.picker.html, [400, 300, 640, 300], "b")] }),
        where: "Monday 08:55. The main menu, File, then the browser's file picker.",
        does: "The main menu, File, Update with new data... (step 1). In the file picker she selects both April files together and clicks Open (step 2; close-up b).",
        sees: "Update with new data... directly under Open..., with one line: new files under this analysis, March kept as a version, 1 slow result will wait for Re-run. Add data... is the next item, and its line says it puts more rows on top.",
        trust: null,
        said: "Replace, not add. The line under it says March stays as a version -- good, because Wednesday I need March.",
        answered: "The two lines under Update with new data... and Add data... are the only place the menu tells them apart; which one she reads first is a study question.",
        happens: "Nothing changes yet: choosing a command and picking files are not undo steps.",
        link: ["menu", "picker"],
    },
    {
        day: "Monday",
        branch: true,
        pic: shot("adddata", [[240, 455, 480, 132], [720, 315, 480, 245]], { cur: [380, 570] }),
        where: "The other door, Monday 08:55. Had she clicked Add data... in the same menu.",
        does: "Picks the same two April files, but through Add data.... The step opens titled Add data: April files.",
        sees: `A warning leads the issues: same columns as March's two files, the data already loaded. Add data would leave ${num(mergedNodes)} accounts and ${num(mergedEdges)} transfers, with the ${num(D.accountsRemoved)} accounts not in April still in; April alone is ${num(A.nodes)} and ${num(A.edges)}. Focus is on Replace data instead.`,
        trust: "What is this number computed on?",
        said: `Seventeen thousand transfers? The April file has eight thousand. That's two months stacked. No.`,
        answered: "Replace data instead turns this same step into the Update with new data step of the next frame, with nothing read again; Enter takes it because focus is already there.",
        happens: `Replace data instead: the title becomes "Update with new data: April files", the commit Load, the undo label "Replace data with the April files". Add data would still commit if she meant to stack the months.`,
        link: ["adddata"],
    },
    {
        day: "Monday",
        pic: shot("load", [[240, 255, 480, 245], [720, 255, 480, 375]], { cur: [1162, 668] }),
        where: "Monday 08:56. The load step for the April files.",
        does: "The load step opens on both files. She checks the counts and presses Load: the third step.",
        sees: `Both files matched by column name, so no binding step. ${num(D.accountsKept)} accounts found by id, ${num(D.accountsAdded)} new, ${num(D.accountsRemoved)} March accounts gone, and one issue: ${Z.count} accounts with no transfers in April, all of them March accounts. Transfers down from ${num(M.edges)} to ${num(A.edges)}. Degree and Louvain replay in seconds; the randomized baseline would take a few minutes, so it will wait.`,
        trust: "Did every rule, run and layer replay, and what did not?",
        said: `Twenty-six accounts with no transfers? Gone quiet, or did the export drop them? I want to see those before I trust the rest.`,
        answered: "The issue row says all 26 were in March and none is new, and Show rows opens them before anything is committed.",
        happens: `One undo entry: "Replace data with the April files".`,
        link: ["load"],
    },
    {
        day: "Monday",
        pic: shot("replay", [[1199, 195, 241, 325], [57, 90, 241, 245]], {
            extras: [noticeInset("Just before: the notice when the replay ends", "Data replaced: 2 of 3 results replayed", "Show report")],
        }),
        where: "Monday 08:56. The replay notice, then Results and the replay report in Version history.",
        does: "The notice says 2 of 3 results replayed; she clicks Show report.",
        sees: `Louvain replayed, in one sentence: ${recon}. ${Z.singletonCommunities} of the new groups are single accounts with no April transfers, and the lost groups are named. Components ${M.stats.components} to ${A.stats.components} for the same reason. The randomized baseline did not replay and waits in Results. The Watchlist has ${W.inCurrentData} of ${W.members} members in April. The size layer's domain was refit to April.`,
        trust: "Did every rule, run and layer replay, and what did not?",
        said: "Thirty-nine new, nine lost: that gets me from thirty-five to sixty-five without a sticky note. And twenty-six of the new ones are the dead accounts, so the real change is smaller than it looks.",
        open: "The report orders its lines by kind (accounts, results, sets, layers), not by surprise. Whether an analyst wants the largest change first is a question for the study.",
        happens: "Nothing is dropped silently: the two missing Watchlist members stay in the set, marked. The Results rail button carries a badge of 1.",
        link: ["replay"],
    },
    {
        day: "Monday",
        pic: shot("rerun", [[57, 140, 241, 120], [520, 778, 460, 64], [1199, 285, 241, 160]], {
            extras: [noticeInset("09:02, while she is away", `${BASELINE} is current`, "")],
        }),
        where: "Monday 08:57. Results panel.",
        does: "Re-run on the baseline row, then Done in Version history. She goes back to her other cases.",
        sees: "The row's second line says Running, a few minutes, with Cancel; one notice carries the progress, clear of the legend. The rail badge clears.",
        trust: null,
        said: "A few minutes is fine as long as I'm not watching a bar.",
        happens: `One undo entry, "Re-run ${BASELINE}". It finishes out of sight at 09:02 and a notice says so. The project autosaves.`,
        link: ["rerun"],
    },
    {
        day: "between",
        pic: between(
            "Tuesday 16:05",
            ["The app is closed. The project autosaved on Monday with both data versions: March's runs are kept until the next Update with new data, for exactly this question.", "Nothing to do in graphty until she returns."],
            `<div class="wr-msg"><b>Priya, financial crime team lead</b><br>Did the 0314 ring grow since March? And where is its money coming in from? Case review is Friday 11:00 -- one slide, the picture and how you got it.</div>`,
        ),
        where: "Between sittings: Tuesday afternoon, a chat message.",
        does: "Replies she will look on Wednesday.",
        sees: "Two questions: did it grow, and who feeds it.",
        trust: null,
        said: "Two months side by side. Last time that was two pivot tables and a VLOOKUP.",
        happens: "The questions set Wednesday's and Friday's work.",
        link: [],
    },
    {
        day: "Wednesday",
        pic: shot("compare", [[1199, 90, 241, 450], [298, 540, 660, 360]], {
            extras: [crop(S.compare.html.replace(cmpRight, cmpRightLost), [1199, 90, 241, 400], "d"), crop(S.compare.html, [298, 120, 450, 300], "b", 322), crop(S.compare.html, [749, 120, 450, 300], "c", 322), crop(S["compare-pick"].html, [306, 161, 240, 330], "a")],
        }),
        where: "Wednesday 10:20. Results panel, then the comparison surface.",
        does: `On the Louvain row, Compare with..., then March data, Apr 3 (close-up a): two steps. She clicks the row for ${ringC.name}, the one holding her Watchlist.`,
        sees: `${ringC.name} grew from ${ringC.marchSize} to ${ringC.aprilSize} accounts, ${ringC.newAccounts} of them new, and holds together in all of April's re-runs. Its accounts carry the selection ring on both sides; on April, the new ones carry the right half-ring too (close-ups b and c, March and April at 300%). The grouping as a whole: ${stayLine}, and two runs on March's own data keep ${inTen(ST.marchRerunInTen)}. The ${lostGroups.length} lost groups are listed with where most of their accounts went (close-up d, the panel scrolled).`,
        trust: "Is a community difference larger than a re-run on the same data produces?",
        said: "Three in ten I can say in a meeting. Is that low just because of the dead accounts again? And what I'll actually use is 22 to 32 and the seven names.",
        answered: `The row beneath it: without the ${Z.count} silent accounts it is still ${ST.monthsWithoutDormantInTen} in 10, so they do not explain it.`,
        happens: `Create set in the ${ringC.name} section keeps the community as "${SET}" (one undo entry), Save comparison keeps the comparison (one more), Done leaves.`,
        link: ["compare-pick", "compare"],
    },
    {
        day: "Wednesday",
        pic: shot("followup", [[298, 545, 660, 320], [1199, 136, 241, 235]]),
        where: "Wednesday 10:34. The Graph panel, the table's Edges tab.",
        does: `On the set: Select members; in the table's Nodes tab she sorts by the comparison's column and selects the ${NF.accounts.length} "only in April" rows; then the Edges tab. She checks the total against her pivot of the April transfer file.`,
        sees: `${NF.transfers} transfers, ${usd(nfTotal)} in all. ${passThrough.length} of the new accounts each took two transfers of about $9,000 to $9,900 from ring accounts and sent it on to ${cashOut.id}, a merchant, and to a ring account. <span class="k-id">${shopper.id}</span> made two small payments, ${usd(shopper.outSum)}.`,
        trust: "What is this number computed on?",
        said: "Twenty-six transfers, two hundred twenty-eight thousand three sixty-two seventy-nine. My pivot says the same to the cent. OK -- now I'll believe the rest of it.",
        happens: "Nothing is changed: selecting and sorting are not undo steps.",
        link: ["followup"],
    },
    {
        day: "Wednesday",
        pic: shot("note", [[57, 155, 241, 100], [1199, 88, 241, 62], [1199, 290, 241, 440]]),
        where: "Wednesday 10:41. The set's inspector.",
        does: "Selects the set, Add note, types what she found. Ctrl+Enter adds it.",
        sees: "The set's Appearance: its own row is a header with '+', and the layers painting it are listed beneath. The note cites the saved comparison.",
        trust: "Will the note still explain it next week?",
        said: `By Monday I won't remember why ${shopper.id} is in here and isn't a mule. Now it's written down next to it.`,
        happens: `One undo entry, "Add note". The note is anchored to the set, not to a spot on the canvas, so a relayout cannot orphan it.`,
        link: ["note"],
    },
    {
        day: "between",
        pic: between(
            "Thursday 17:30",
            ["The project holds two data versions, the saved comparison, the set and its note.", "She has asked payments about the six pass-through accounts; no answer yet. The figure is Friday's job."],
            `<div class="wr-msg"><b>Calendar</b><br>Fri 11:00 -- Case review, 0314. Template: one slide, the figure on the left, three findings on the right. It is printed for the file.</div>`,
        ),
        where: "Between sittings: Thursday evening.",
        does: "Blocks 09:00 to 10:00 on Friday for the figure.",
        sees: "The deliverable: one picture that stands alone on a printed slide, and the method behind it.",
        trust: null,
        said: "Last time the legend didn't come out with the picture and I rebuilt it in PowerPoint. And it gets printed in gray.",
        happens: "Nothing.",
        link: [],
    },
    {
        day: "Friday",
        pic: shot("pagerank", [[57, 0, 241, 70], [306, 233, 240, 500], [554, 520, 260, 345]]),
        where: "Friday 09:05. The set, the Filter chip, Results and the encoding popover.",
        does: `On the set: Select members, Select neighbors (2 steps, incoming), Filter to: the chip reads ${UP.accounts} of ${num(A.nodes)}. Layout, Run, on the filter. Then PageRank from the catalog on the full graph, and in its editor, Color by; in the encoding popover, Fit to current scope.`,
        sees: `The filter keeps the ring's ${ringC.aprilSize} accounts, the ${UP.payers} that pay them and the ${UP.payersOfPayers} that pay those. On the log ramp the brightest are ${cashOut.id}, the merchant the new accounts pay, and ${top2.id}, a ${top2.country} merchant inside the same community.`,
        trust: "What is this number computed on?",
        said: `PageRank? I'd never have clicked that; the line under it says what I want, the name doesn't. And ${top2.id} lights up too -- a shop with ordinary customers. I'd have to rule it out before it goes anywhere.`,
        open: "An algorithm name an investigator would not pick. Whether the catalog's one-line description is enough for a non-specialist to choose it is untested.",
        happens: `Undo entries: "Filter to 157 selected", "Run layout", "Run PageRank", "Color by PageRank", "Fit domain to current scope". The new layer lands on top of the Styles list; Community color is painted over everywhere and the legend says so.`,
        link: ["pagerank"],
    },
    {
        day: "Friday",
        pic: shot("path", [[57, 275, 241, 160], [1199, 88, 241, 490], [420, 340, 300, 200]], {
            extras: [crop(S["path-kept"].html, [57, 155, 241, 140], "c")],
        }),
        where: "Friday 09:20. The Path tool, the found path's inspector, then Keep path.",
        does: `With the Path tool: From <span class="k-id">${P.from}</span>, a business account, To <span class="k-id">${P.to}</span>, a ring account; Run. Then Keep path, so next month's replay keeps it (close-up c).`,
        sees: `Found path, ${P.hops} hops, the only shortest path: ${P.nodes.map((n) => `${n.id} (${n.kind})`).join(", ")}. It is drawn as a dashed highlight on top of the stack; every other account keeps its PageRank color. The Styles list shows the Shortest path run's layer at the top.`,
        trust: "What is this number computed on?",
        said: "One route. The panel will ask how many look like this, and nothing here counts them. I'd do that part in Excel.",
        open: `No count of routes of this shape (business, then a personal account, then the ring). The filter holds ${UP.businesses} business accounts; whether graphty should answer "how many" is an open finding.`,
        happens: `Undo entries: "Shortest path ${PATHNAME}", then "Keep path ${PATHNAME}". The run's automatic layer writes only the highlight mark on its ${P.hops + 1} accounts and ${P.hops} transfers.`,
        link: ["path", "path-kept"],
    },
    {
        day: "Friday",
        pic: shot("export", [[150, 140, 652, 470], [812, 146, 472, 190]], { cur: [1258, 786] }),
        where: "Friday 09:31. Export..., the Export dialog.",
        does: "Export... in the project-name menu; the current view is checked with the methods text; she sets 2x for print. Export.",
        sees: "The preview is the file: the legend in full, top first (the path, the PageRank ramp with its domain and log scale, the size key), and the caption line with the graph, the April files and the scope. The methods text is written beside it.",
        trust: "Does the figure carry its scope and legend?",
        said: "Legend's on it, scope's under it. I can't set the shape, though -- if the template were 16:9 I'd be cropping in PowerPoint again.",
        open: "The figure takes the canvas's shape. A figure size set to a slide template's box is not in the design.",
        happens: `The notice: "Exported 2 files: figure, methods text". Not an undo step: the files are outside the project, and the project stays live.`,
        link: ["export"],
    },
];
const board = frames
    .map((f, k) => {
        const lines = [`<dt>Does</dt><dd>${f.does}</dd>`, `<dt>Sees</dt><dd>${f.sees}</dd>`];
        if (f.trust) lines.push(`<dt>Her question</dt><dd>${f.trust}</dd>`);
        lines.push(`<dt>Happens</dt><dd>${f.happens}</dd>`);
        const st = f.link.length ? S[f.link[f.link.length - 1]] : null;
        const waits = [...new Set(f.link.flatMap((id) => S[id].waits))];
        return `<figure class="wr-frame${f.day === "between" ? " wr-frame-between" : ""}${f.branch ? " wr-frame-branch" : ""}" id="frame-${k + 1}">
  <div class="wr-where"><span class="k-step">${k + 1}</span>${f.where}</div>
  <div class="wr-pic">${f.pic}</div>
  <figcaption><dl>${lines.join("")}</dl>
    <div><div class="wr-guess"><span class="wr-guess-h">Our guess at her reaction, for the study to test:</span> "${f.said}"</div>
    ${f.answered ? `<div class="wr-answer"><b>Where the design answers it:</b> ${f.answered}</div>` : ""}
    ${f.open ? `<div class="wr-answer wr-open-finding"><b>Open finding:</b> ${f.open}</div>` : ""}
    ${waits.length ? `<div class="wr-answer"><b>Waits on graphty-element:</b> ${waits.join("; ")}.</div>` : ""}
    ${f.link.length ? `<div class="wr-open">Screen: ${f.link.map((id) => `<a href="../screens/weekly-return.html#${id}">${S[id].title}</a>`).join("; ")}</div>` : ""}</div></figcaption>
</figure>`;
    })
    .reduce((acc, html, k) => {
        const day = frames[k].day;
        const prev = frames.slice(0, k).map((g) => g.day).filter((d) => d !== "between").pop() ?? null;
        const heads = { Monday: "Monday: same analysis, new data", Wednesday: "Wednesday: what changed, and why", Friday: "Friday: the figure" };
        if (day !== prev && heads[day]) acc.push(`<h2 class="wr-day">${heads[day]}</h2>`);
        acc.push(html);
        return acc;
    }, [])
    .join("\n");
const bullets = [
    `${ringC.name}, the ring's community, grew from ${ringC.marchSize} to ${ringC.aprilSize} accounts since March; ${ringC.newAccounts} are new.`,
    `${passThrough.length} new accounts each received about $18,000 to $19,000 from two ring accounts and passed it on to ${cashOut.id} (merchant) and a ring account.`,
    `One route in, shown: business ${P.from} to ${P.nodes[1].id} to ring account ${P.to}. How many routes like it exist is not yet counted.`,
];
const slide = (gray) => `<div class="wr-slide${gray ? " wr-gray" : ""}"><div class="wr-slide-title">Case 0314: mule ring, April</div>
  <div class="wr-slide-body"><div class="wr-slide-fig"><div class="wr-prev-fig"><img src="../kit/canvas/transactions-april-upstream-path-light.svg" alt="The exported figure">${legendExport}</div><div class="wr-prev-cap">${caption}</div></div>
  <ul class="wr-slide-list">${bullets.map((b) => `<li>${b}</li>`).join("")}</ul></div>
  <div class="wr-slide-foot">Financial crime case review, Friday 11:00. Speaker notes: the methods text.</div></div>`;
const story = `<!doctype html>
<html lang="en">
${WARN}
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The weekly return</title>
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>${css}
  /* The page's own document styles, so nothing leaks into the embedded screens (k-doc styles
     every table cell and list item beneath it, which would reflow the mocks). */
  .wr-doc { max-width: 1280px; margin: 0 auto; padding: 32px 24px 64px; font-size: 13px; line-height: 20px; letter-spacing: -0.003px; }
  .wr-doc > h1 { font-size: 24px; line-height: 32px; font-weight: 600; margin: 0 0 8px; }
  .wr-doc h2 { font-size: 15px; line-height: 25px; font-weight: 600; margin: 32px 0 8px; }
  .wr-doc > p, .wr-doc > ul > li, .wr-outcome > p { max-width: 90ch; }
  .wr-doc a { color: var(--cm-text-brand); }
  .wr-doc .k-lede { font-size: 15px; line-height: 24px; color: var(--cm-text-secondary); max-width: 80ch; }
  .wr-doc .wr-screen { font-size: 11px; line-height: 16px; letter-spacing: 0.055px; }
  .wr-frame { margin: 0 0 48px; }
  .wr-pic { display: flex; gap: 16px; align-items: flex-start; }
  .wr-pic > .wr-thumb { flex: none; }
  .wr-frame figcaption { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 12px; }
  .wr-doc a.wr-thumb { color: var(--cm-text); text-decoration: none; }
  .wr-thumb { display: block; position: relative; width: ${TW}px; height: 360px; overflow: hidden; border-radius: 8px; box-shadow: 0 0 0 1px var(--cm-border); background: var(--cm-bg); }
  .wr-thumb > .wr-screen { transform: scale(0.4); transform-origin: 0 0; pointer-events: none; }
  .wr-thumb-crop { height: auto; box-shadow: none; }
  .wr-thumb .k-annot-box { border-width: 2px; }
  .wr-tag, .wr-croptag { position: absolute; z-index: 93; transform: translate(-60%, -50%); min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px; background: var(--k-annot); color: #fff; font-size: 11px; line-height: 18px; font-weight: 600; text-align: center; }
  .wr-croptag { left: 4px; top: 4px; transform: none; }
  .wr-waitflag { position: absolute; right: 6px; top: 6px; z-index: 94; }
  .wr-crops { display: flex; flex-wrap: wrap; gap: 12px; width: ${CW}px; align-items: flex-start; }
  .wr-crop { position: relative; overflow: hidden; border-radius: 6px; box-shadow: 0 0 0 2px var(--k-annot); background: var(--cm-bg); }
  .wr-crop > .wr-screen { transform-origin: 0 0; pointer-events: none; }
  .wr-inset { width: ${CW}px; box-sizing: border-box; padding: 8px 12px 12px; border-radius: 6px; box-shadow: 0 0 0 1px var(--cm-border); background: var(--cm-bg-secondary); }
  .wr-inset-label { color: var(--cm-text-secondary); font-size: 12px; margin-bottom: 6px; }
  .wr-inset-body { display: flex; justify-content: center; }
  .wr-between { padding: 24px 28px; background: var(--cm-bg-secondary); color: var(--cm-text); font-size: 13px; line-height: 20px; }
  .wr-between ul { margin: 16px 0 0; padding-inline-start: 18px; color: var(--cm-text-secondary); }
  .wr-when { font-size: 20px; line-height: 28px; font-weight: 600; margin-bottom: 16px; }
  .wr-msg { max-width: 460px; padding: 12px 16px; border-radius: 12px; background: var(--cm-bg); box-shadow: var(--cm-elevation-200); }
  .wr-frame figcaption { font-size: 13px; line-height: 20px; }
  .wr-where { font-weight: 600; margin-bottom: 8px; font-size: 14px; }
  .wr-where .k-step { margin-inline-end: 8px; }
  .wr-frame dl { display: grid; grid-template-columns: 96px 1fr; gap: 4px 12px; margin: 0; }
  .wr-frame dt { color: var(--cm-text-secondary); }
  .wr-frame dd { margin: 0; }
  .wr-guess { margin-top: 0; padding: 8px 12px; border-left: 3px solid var(--cm-border-strong); color: var(--cm-text-secondary); font-style: italic; }
  .wr-guess-h { font-style: normal; font-size: 12px; display: block; }
  .wr-answer { margin-top: 8px; }
  .wr-open-finding b { color: var(--cm-text); }
  .wr-open { margin-top: 8px; }
  .wr-frame-branch { margin-inline-start: 32px; padding-inline-start: 16px; border-inline-start: 3px dashed var(--cm-border-strong); }
  .wr-day { border-top: 1px solid var(--cm-border); padding-top: 16px; }
  .wr-outcome { padding: 16px 20px; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--cm-border); }
  .wr-slides { display: grid; grid-template-columns: 1fr; gap: 16px; margin: 16px 0; }
  .wr-slide { width: 1000px; max-width: 100%; aspect-ratio: 16 / 9; box-sizing: border-box; padding: 28px 32px; background: #fff; color: #1a1a1a; box-shadow: 0 0 0 1px var(--cm-border), var(--cm-elevation-200); display: flex; flex-direction: column; font-size: 14px; line-height: 20px; }
  .wr-slide.wr-gray { width: 500px; padding: 14px 16px; font-size: 7px; line-height: 10px; filter: grayscale(1); }
  .wr-gray .wr-slide-title { font-size: 12px; line-height: 16px; margin-bottom: 6px; }
  .wr-gray .wr-prev-legend { transform: scale(0.5); transform-origin: top right; }
  .wr-gray .wr-prev-cap { font-size: 5px; line-height: 7px; padding: 2px 4px; }
  .wr-slide-title { font-size: 24px; line-height: 32px; font-weight: 600; margin-bottom: 14px; }
  .wr-slide-body { display: grid; grid-template-columns: 62% 1fr; gap: 20px; flex: 1; min-height: 0; }
  .wr-slide-list { margin: 0; padding-inline-start: 18px; }
  .wr-slide-list li { margin-bottom: 10px; }
  .wr-slide-foot { color: #666; font-size: 0.8em; margin-top: 8px; }
  @media (max-width: 1260px) { .wr-pic, .wr-frame figcaption { display: block; } .wr-crops { margin-top: 12px; width: auto; } }
</style>
</head>
<body>
<div class="wr-doc">
  <h1>The weekly return, on a monthly export: same analysis, new data, Friday's figure</h1>
  <p class="k-lede">${WHO}, a fraud investigator, keeps a mule-ring case under review: each month the bank's statement export for the case's accounts goes through the same analysis. On Monday she reopens last month's project and puts April's files under it; on Wednesday she asks what changed and why, and keeps what matters; on Friday she makes one figure for the case review. ${frames.length === 15 ? "Fifteen" : frames.length} frames over three sittings in one week (one of them the other door, Add data, drawn indented), with the gaps between them drawn too, because the design's promise is what survives a gap.</p>
  <p>This is journey 2, "The weekly return", of the framework's user-journeys.md (design/ui/framework/). Journeys are cut by rhythm, not by persona; the rhythm here is the working week, while the data arrives monthly. The protagonist is the fraud investigator (<a href="../study/personas/fraud-analyst.md">persona</a>), because the kit's data is a payments network. The journey's named persona, Analyst Alex, works on supplier and depot networks; his telling (his NetworkX check, his team's Gephi-built deck) needs a supplier fixture the kit does not have yet.</p>
  <p>Each frame shows the real screen small, with magenta boxes where her attention goes, and beside it the same boxes cropped from the same screen at up to full size, so the words can be read. Click a screen to open the full-size mock with its annotations (<a href="../screens/weekly-return.html">all screens</a>). A magenta tag marks a screen that waits on graphty-element. Every count is from the kit's March and April data: ${num(M.nodes)} and ${num(A.nodes)} accounts, ${num(M.edges)} and ${num(A.edges)} transfers.</p>
  <p><b>About the quoted reactions.</b> They are the design team's guesses, written in the persona's register (blunt, compares everything to Excel, warms up only when a number matches hers) so that the user study can refute them. None is evidence. Where a guess is a doubt, the frame says where the design answers it, or records it as an open finding.</p>
${board}
  <h2>Outcome</h2>
  <div class="wr-outcome">
    <p>${WHO} brings one slide to the case review. It is drawn below as her team's template would hold it, full size and printed in gray, so it can be judged on whether it stands alone.</p>
    <div class="wr-slides">${slide(false)}${slide(true)}</div>
    <p>What the figure shows: the ring's community and the two steps of accounts that pay into it, colored by where transfers collect, with one route in highlighted, its legend and its scope on it. What she can say from the numbers: the community grew from ${ringC.marchSize} to ${ringC.aprilSize} accounts; ${passThrough.length} of the ${ringC.newAccounts} new accounts behave as pass-through accounts, and she checked their transfer total against her own pivot. What the numbers do not settle: the month-to-month agreement (${ST.monthsInTen} in 10 pairs of accounts still grouped together) is lower than two runs on either month (${inTen(ST.marchRerunInTen)} and ${inTen(ST.aprilRerunInTen)}), but that is a statement about the whole grouping, part of which is accounts that joined, left or went quiet; it does not by itself say how much of the change is real. The claim about the ring rests on the ${ringC.newAccounts} names and their transfers, not on the agreement score.</p>
    <p>The project holds both data versions, the saved comparison, the set with its note and the kept path, so next month starts the same way this one did.</p>
    <p><b>Steps.</b> Reopen: 1. Update with new data: 3 (Update with new data..., the files, Load); by Add data by mistake, 4 (Add data..., the files, Replace data instead, Load). Re-run: 1. Compare: 2, then Create set 1, Save comparison 1, Done 1. Follow-up: Select members 1, sort 1, select the rows 2, Edges tab 1. Note: 2 plus typing. Figure: scope 3 (Select members, Select neighbors, Filter to) and Run layout 1; PageRank 1, Color by 1, Fit to current scope 1; the path 4 (Path tool, From, To, Run) and Keep path 1; Export 3 (Export..., 2x, Export).</p>
    <p><b>Waits on graphty-element.</b> Frames 2 to 7 need data versions, Replace data and the load preview; frame 9 needs the comparison surface, a partition-similarity measure with its seeded re-runs, and comparison membership as an attribute; frames 10 and 11 need that attribute, object selection for the set's inspector, and notes; frame 13 needs a layout scope for Run layout on a filter; frame 14 needs object selection for the found path's inspector; frame 15 needs the legend drawn into the exported figure. Each is absent from the product until it lands (interface-specification.md 7.4); everything else is buildable now.</p>
    <p><b>Not drawn here.</b> Esc or Cancel on the load step (the project returns unchanged, focus back on the File menu); a note's quoted value marked when the live value later differs; the Compare with... picker once the earlier run has been discarded by a later Update with new data; the gray check beyond the slide above.</p>
    <p><b>On a 14-inch laptop.</b> At 1366 by 768 (<a href="../shots/screens__weekly-return--compare-1366.png">screenshot of the comparison</a>) both sides and the difference list still fit, but each side is 413 px wide with a drawing 275 px tall, the legend covers about a third of side A, the side headers wrap to two lines, and the selected row, ninth by change, sits below the fold. Proposed: close the left panel on entry below 1440 px, keep side headers to one line, scroll the selected row into view, and fold the legend to its title on a narrow side.</p>
  </div>
  <h2>Open findings for the study</h2>
  <ul>
    ${frames.filter((f) => f.open).map((f) => `<li>Frame ${frames.indexOf(f) + 1}: ${f.open}</li>`).join("\n    ")}
    <li>Whether "${ST.monthsInTen} in 10 pairs still grouped together" is something an investigator will repeat in a report, or whether she still leans only on the names and amounts beneath it.</li>
  </ul>
  <p class="k-secondary">Proposed changes to the framework that this storyboard needed are in <a href="../framework-changes.md">framework-changes.md</a> (entries headed "Weekly return").</p>
</div>
</body>
</html>
`;
writeFileSync(join(proto, "storyboards/weekly-return.html"), toShell(story));
console.log("wrote screens/weekly-return.html and storyboards/weekly-return.html");
