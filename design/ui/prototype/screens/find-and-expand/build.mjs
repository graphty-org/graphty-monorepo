#!/usr/bin/env node
// Writes screens/find-and-expand.html: the "Find, inspect, expand, next seed" screen mock, twelve
// states of the app at 1440 x 900 on the transaction graph (drawn) and the patent-citation graph
// (past the drawing limit). Every count comes from numbers.json (run gen.mjs first).
//
//   node screens/find-and-expand/build.mjs        (from design/ui/prototype/)
//
// Edit this file, not the HTML it writes.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toShell } from "../../kit/shell.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const N = JSON.parse(readFileSync(join(here, "numbers.json"), "utf8"));
const FX = JSON.parse(readFileSync(join(here, "../../kit/fixtures.json"), "utf8"));
const T = N.transactions;
const C = N.citations;
const fmt = (x) => x.toLocaleString("en-US");
const pctOf = (a, b) => Math.round((a / b) * 100);
const A = "find-and-expand"; // asset folder, relative to screens/

// ---------- small parts ----------
const icon = (name, cls = "") => `<svg class="k-i ${cls}"><use href="../kit/icons.svg#${name}"/></svg>`;
const ibtn = (name, attrs = "") => `<span class="k-icon-btn" ${attrs}>${icon(name)}</span>`;
const FLAG = "#D55E00";
const chit = (c) => `<span class="k-chit" style="background:${c}"></span>`;
const drawing = (name, alt) => {
    const src = name.startsWith("../") ? name : `${A}/${name}`;
    return `<img class="k-light-only" src="${src}-light.svg" alt="${alt}"><img class="k-dark-only" src="${src}-dark.svg" alt="${alt}">`;
};

const rail = () => `
  <nav class="k-rail" aria-label="Main">
    <div class="k-rail-btn"><span class="k-rail-pill">${icon("menu")}</span></div>
    <div class="k-rail-sep"></div>
    <div class="k-rail-btn" aria-pressed="true"><span class="k-rail-pill">${icon("network")}</span>Graph</div>
    <div class="k-rail-btn" aria-disabled="true"><span class="k-rail-pill">${icon("sparkles")}</span>Assistant</div>
    <div class="k-rail-btn"><span class="k-rail-pill">${icon("flask-conical")}</span>Results</div>
    <div class="k-rail-btn"><span class="k-rail-pill">${icon("sticky-note")}</span>Notes</div>
  </nav>`;

const head = (project, chip, open = false) => `
    <div class="k-panel-head">
      <div class="k-title-line"><span class="k-project">${project}</span>${icon("chevron-down", "k-i-sm k-secondary")}</div>
      <span class="k-chip"${open ? ' aria-expanded="true"' : ""}>${icon("funnel", "k-i-sm")}<span class="k-num">${chip}</span></span>
    </div>`;

// The Graph panel's lists (Find closed).
const lists = ({ graph, count, sets = [], styles, views = 1 }) => `
    <div class="k-scroll">
      <section class="k-section">
        <div class="k-section-head">Graphs<span class="k-grow"></span>${ibtn("search")}${ibtn("plus")}</div>
        <ul class="k-list"><li class="k-item" aria-selected="true">${icon("network")}<span class="k-grow k-ellipsis">${graph}</span><span class="k-trail k-num">${count}</span></li></ul>
      </section>
      <section class="k-section"${sets.length ? "" : " data-empty"}>
        <div class="k-section-head">Sets and paths<span class="k-grow"></span>${ibtn("plus")}</div>
        ${sets.length ? `<ul class="k-list">${sets.join("")}</ul>` : ""}
      </section>
      <section class="k-section">
        <div class="k-section-head">Styles<span class="k-grow"></span>${ibtn("plus")}</div>
        <ul class="k-list">${styles}</ul>
      </section>
      <section class="k-section" data-collapsed><div class="k-section-head">Views <span class="k-count k-num">${views}</span></div></section>
    </div>`;
const txStyles = `<li class="k-item">${chit(FLAG)}<span class="k-ellipsis">Flagged accounts</span></li>
          <li class="k-item">${chit("#808080")}<span class="k-ellipsis">Base style</span></li>`;
const ctStyles = `<li class="k-item">${chit("#808080")}<span class="k-ellipsis">Base style</span></li>`;

// Find, open in place of the lists.
const find = (query, groups, total = "3,000") => `
    <div class="fe-findbar">
      <span class="k-field fe-q" data-focus>${icon("search", "k-i-sm k-secondary")}<span class="k-id">${query}</span><span class="k-grow"></span>${icon("x", "k-i-sm k-secondary")}</span>
    </div>
    <div class="fe-findbar2"><span class="k-field fe-scope">This graph${icon("chevron-down", "k-i-sm k-caret")}</span><span class="k-grow"></span>${ibtn("ellipsis")}</div>
    <div class="k-scroll fe-hits">${groups}<div class="fe-foot k-secondary">Enter goes to it; Enter again selects it. Searching the full graph: ${total} nodes.</div></div>`;

// ---------- canvas ----------
const canvas = ({ img, alt, overlays = "", legend = "", toast = "", notdrawn = "", empty = false }) => `
    <div class="k-canvas">
      ${empty ? "" : `<div class="k-stage">${drawing(img, alt)}${overlays}</div>`}
      ${legend || notdrawn ? `<div class="k-legend-card">${legend}${notdrawn}</div>` : ""}
      <div class="k-toolbar-dock">${toast}
        <div class="k-toolbar" role="toolbar">
          <span class="k-tool" aria-pressed="true">${icon("mouse-pointer-2", "k-i-lg")}</span><span class="k-tool-caret">${icon("chevron-down", "k-i-sm")}</span>
          <span class="k-tool">${icon("route", "k-i-lg")}</span>
          
          <span class="k-toolbar-sep"></span>
          <span class="k-tool">${icon("zap", "k-i-lg")}</span>
          <span class="k-toolbar-sep"></span>
          <span class="k-tool">${icon("square", "k-i-lg")}</span><span class="k-tool-caret">${icon("chevron-down", "k-i-sm")}</span>
        </div>
      </div>
      <span class="k-help">${icon("circle-help")}</span>
    </div>`;
const flagLegend = (n) => `<div class="k-lg-title">Flagged accounts <span class="k-secondary">flagged</span></div>
        <div class="k-lg-row">${chit(FLAG)}true<span class="k-value k-num">${fmt(n)}</span></div>`;

// ---------- dock ----------
const txCols = `<th>id</th><th>kind <span class="k-profile">3 values</span></th><th>country</th><th class="k-n">riskScore <span class="k-profile">0 to 98, sorted</span></th><th>flagged</th><th class="k-n">degree</th>`;
const txRow = (r, attrs = "") =>
    `<tr ${attrs}><td class="k-id">${r.id}</td><td>${r.kind}</td><td>${r.country}</td><td class="k-n">${r.riskScore}</td><td>${r.flagged ? `${chit(FLAG)}true` : `${chit("#808080")}false`}</td><td class="k-n">${fmt(r.degree)}</td></tr>`;
const ctCols = `<th>id</th><th class="k-n">grantYear</th><th>category <span class="k-profile">6 values</span></th><th class="k-n">citationsReceived <span class="k-profile">sorted</span></th>`;
const ctRow = (r, attrs = "") =>
    `<tr ${attrs}><td class="k-id">${r.id}</td><td class="k-n">${r.grantYear}</td><td>${r.category}</td><td class="k-n">${fmt(r.citationsReceived)}</td></tr>`;
const dock = ({ scope, cols, rows, tall = false }) => `
    <section class="k-dock${tall ? " fe-dock-tall" : ""}" aria-label="Table">
      <div class="k-dock-tabs"><span class="k-tab" aria-selected="true">Nodes</span><span class="k-tab">Edges</span><span class="k-grow"></span>${ibtn("search")}${ibtn("ellipsis")}</div>
      <div class="k-scope">${scope}</div>
      <div class="k-table-wrap"><table class="k-table"><thead><tr>${cols}</tr></thead><tbody>${rows}</tbody></table></div>
    </section>`;

// ---------- inspector ----------
const right = (body) => `
  <aside class="k-right" aria-label="Inspector">
    <div class="k-header1"><span class="k-avatar">S</span><span class="k-grow"></span><span class="k-btn">Export...</span></div>
    <div class="k-header2"><span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">100%${icon("chevron-down", "k-i-sm")}</span></div>
    ${body}
  </aside>`;
// The two-line type row (interface-specification 4.2): name over the kind word, verbs, overflow.
const typerow = ({ glyph = "circle-dot", name, kind, stepper = "", verbs, pressed = "" }) => `
    <div class="fe-type">
      <div class="fe-type1">${icon(glyph)}<span class="k-name k-id k-ellipsis">${name}</span></div>
      <div class="fe-type2"><span class="k-secondary k-ellipsis">${kind}</span>${stepper ? `<span class="fe-stepper">${icon("chevron-left", "k-i-sm")}<span class="k-num">${stepper}</span>${icon("chevron-right", "k-i-sm")}</span>` : ""}<span class="k-grow"></span>${verbs(pressed)}${ibtn("ellipsis")}</div>
    </div>`;
const nodeVerbs = (pressed) =>
    `<span class="fe-split"${pressed === "neighbors" ? ' data-open' : ""}><span class="fe-nbmain" role="button" aria-label="Neighbors: filter to neighbors, 1 hop" title="Filter to neighbors, 1 hop  Shift+N">${icon("waypoints", "k-i-sm")}Neighbors</span><span class="fe-split-caret">${icon("chevron-down", "k-i-sm")}</span></span>` +
    ibtn("funnel", 'title="Filter to"') +
    ibtn("pin", 'title="Pin"');
const severalVerbs = (pressed) =>
    `<span class="fe-split"${pressed === "neighbors" ? ' data-open' : ""}><span class="fe-nbmain" role="button" aria-label="Neighbors: filter to neighbors, 1 hop" title="Filter to neighbors, 1 hop  Shift+N">${icon("waypoints", "k-i-sm")}Neighbors</span><span class="fe-split-caret">${icon("chevron-down", "k-i-sm")}</span></span>` +
    ibtn("funnel", 'title="Filter to"') +
    ibtn("group", 'title="Create set"');
const data = (name, value, extra = "") =>
    `<div class="k-data"><span class="k-name">${name}</span><span class="k-value">${value}</span></div>` + (extra ? `<div class="fe-rankline k-secondary k-num">${extra}</div>` : "");
const section = (title, body, attrs = "") => `<section class="k-section" ${attrs}><div class="k-section-head">${title}</div>${body}</section>`;
const connSection = (c, { scope = "", full = null, inWord = "In", outWord = "Out" } = {}) =>
    section(`Connections${scope ? `<span class="k-secondary fe-scopeword">${scope}</span>` : ""}`, `
      <div class="fe-conn"><span></span><span class="k-secondary">${inWord}</span><span class="k-secondary">${outWord}</span><span class="k-secondary">All</span>
        <span>Neighbors</span><span class="k-num fe-link">${fmt(c.nIn)}</span><span class="k-num fe-link">${fmt(c.nOut)}</span><span class="k-num fe-link">${fmt(c.nAll)}</span>
        <span>Edges</span><span class="k-num fe-link">${fmt(c.eIn)}</span><span class="k-num fe-link">${fmt(c.eOut)}</span><span class="k-num fe-link">${fmt(c.eAll)}</span></div>` +
      (full ? `<div class="k-data"><span class="k-name k-secondary">Full graph</span><span class="k-value k-secondary k-num">${fmt(full.nAll)} neighbors, ${fmt(full.eAll)} edges</span></div>` : ""));
const exportSection = `<section class="k-section" data-empty><div class="k-section-head">Export<span class="k-grow"></span>${ibtn("plus")}</div></section>`;
const txNode = ({ r, rank, conn, connScope = "", connFull = null, stepper = "", note = "", pressed = "", outsideStep = "" }) =>
    right(`
    ${typerow({ name: r.id, kind: "Node", stepper, verbs: nodeVerbs, pressed })}
    <div class="k-scroll">
      ${outsideStep ? `<div class="fe-stateline">${icon("funnel", "k-i-sm")}<span>Not in the filtered graph: left out by ${outsideStep}. Not drawn; not in any count.</span></div>` : ""}
      ${section("Attributes", data("flagged", `${chit(r.flagged ? FLAG : "#808080")} ${r.flagged}`) + data("riskScore", r.riskScore, rank) + data("kind", r.kind) + data("country", r.country) + `<div class="k-row k-secondary">1 more</div>`)}
      ${connSection(conn, { scope: connScope, full: connFull })}
      ${section("Memberships", `<div class="k-row k-secondary">In no sets</div>`)}
      ${section("Appearance", `<div class="k-fieldrow"><span class="k-legend">Color <span class="k-tertiary">-- ${r.flagged ? "Flagged accounts" : "Base style"}</span></span><div class="k-fields"><span class="k-field k-span">${chit(r.flagged ? FLAG : "#808080")}${r.flagged ? "D55E00" : "808080"}</span></div></div>`)}
      ${exportSection}
      ${note}
    </div>`);

// "#3 of 5,310" and a tie "#3 to #5 of 5,310" (content-design 5, ranks).
function rankIn(r, rows) {
    const above = rows.filter((x) => x.riskScore > r.riskScore).length;
    const same = rows.filter((x) => x.riskScore === r.riskScore).length;
    return same > 1 ? `#${above + 1} to #${above + same} of ${rows.length}` : `#${above + 1} of ${rows.length}`;
}

// ---------- overlays ----------
// The Neighbors split button's menu (interface-specification 4.2; interaction-pattern-entries
// 4.6). Hop rows and Follow rows are checkable and keep the menu open; each shows the size its
// choice would give. The two command rows commit and close it, each with its own count. A dark Menu,
// as Figma's split-button options: no close button, no primary.
const mi = ({ label, count = "", on = false, hover = false, off = false, cls = "" }) =>
    `<div class="k-menu-item${cls ? " " + cls : ""}"${hover ? " data-hover" : ""}${off ? ' aria-disabled="true"' : ""}><span class="k-check-col">${on ? "&#10003;" : ""}</span>${label}<span class="k-shortcut k-num">${count}</span></div>`;
const growMenu = ({ left, top, of, hops, dirs, note = "", warn = "", cmds }) => `
  <div class="k-menu fe-menu" style="left:${left}px;top:${top}px">
    <div class="k-menu-label">Hops from ${of}</div>
    ${hops.map(mi).join("")}
    ${mi({ label: "More hops..." })}
    <div class="k-menu-sep"></div>
    <div class="k-menu-label">Follow</div>
    ${dirs.map(mi).join("")}
    ${note ? `<div class="fe-menu-note">${note}</div>` : ""}
    ${warn ? `<div class="fe-menu-warn"><span class="k-warn-glyph">!</span><span>${warn}</span></div>` : ""}
    <div class="k-menu-sep"></div>
    ${cmds.map(mi).join("")}
  </div>`;

// ---------- the frame ----------
const note = (n, x, y) => `<span class="fe-pin" style="left:${x}px;top:${y}px">${n}</span>`;
function frame(s) {
    const pins = s.notes.map((nt, i) => note(i + 1, nt.x, nt.y)).join("");
    const list = s.notes.map((nt, i) => `<li><span class="k-step">${i + 1}</span><span>${nt.text}</span></li>`).join("");
    return `
<section class="fe-state" id="${s.id}" aria-label="${s.title}">
<i class="fe-notes-anchor" id="${s.id}-notes"></i>
<div class="k-app" ${s.appAttrs ?? ""}>
  ${rail()}
  <aside class="k-panel" aria-label="Graph">${s.left}</aside>
  <main class="k-main">${s.main}</main>
  ${s.right}
</div>
${s.overlays ?? ""}
<div class="fe-caption"><span class="k-step">${s.n}</span><b>${s.title}</b><span>${s.graphName}</span></div>
<div class="fe-notes">${pins}<ol class="fe-notelist"${s.notesTop ? ` style="top:${s.notesTop}px"` : ""}>${list}</ol></div>
</section>`;
}

// ---------- data for the transaction states ----------
const seed = T.seed;
const hit = T.hit;
const B0 = T.boundary.slice().sort((a, b) => b.riskScore - a.riskScore || a.id.localeCompare(b.id));
const B1 = [...B0, hit].sort((a, b) => b.riskScore - a.riskScore || a.id.localeCompare(b.id));
const G = T.grownRows;
const STEP = "ACC-233575 and neighbors";
const txProject = "March transfers";
const txGraph = "Transfers";
const full = `Filtered: ${B0.length} of 3,000 nodes`;
const fullTable = T.ranked.slice(0, 8);
const at = (name, id) => T.anchors[name][id];
const hood = T.seedHood;
// A drawing anchor (percent of the 3:2 drawing) in app pixels: the canvas column is x 298 to 1199
// and y 0 to 594 above the 34% dock; the stage is the largest 3:2 box centered in it.
const sp = (a) => { const w = Math.min(901, 594 * 1.5), h = w / 1.5; return { x: Math.round(298 + (901 - w) / 2 + (w * a.x) / 100), y: Math.round((594 - h) / 2 + (h * a.y) / 100) }; };

// canvas region in app pixels, for pins: x 298..1199, y 0..594 (dock 34%)
const S = [];
const CN = T.conn;
const M = T.merchantIn;
const NX = T.next;
const NXSTEP = `${NX.id} and neighbors`;
const findFoot = "Enter goes to it; Enter again selects it. Searching the full graph: 3,000 nodes.";
// The filter step's record: what made it, then each addition, each with its arguments.
const record = [`${B0.length} by Filter to neighbors, all, 1 hop, from ${seed.id}`, "+1 by Add selection to step, from 1 node", `+${T.grow.out - B1.length} by Filter to neighbors, out, 1 hop, from ${B1.length} nodes`];
const MENU = { left: 872, top: 96 };

S.push({
    id: "t-find", n: 1, notesTop: 300, title: "Find the seed", graphName: "Transactions, 3,000 accounts, drawn as density",
    left: head(txProject, "Full graph") + find("233575", `
      <div class="k-group-head">Nodes <span class="k-secondary k-num">&nbsp;1</span></div>
      <div class="k-result" aria-selected="true">${icon("circle-dot")}<span class="k-id"><b>ACC-233575</b></span><span class="k-grow"></span><span class="k-secondary">riskScore 98</span></div>`),
    main: canvas({ img: "seed-hover", alt: "3,000 accounts as density, ACC-233575 drawn as a point with the hover mark" }) +
        dock({ scope: "Full graph: 3,000 nodes. Sorted by riskScore.", cols: txCols, rows: fullTable.map((r) => txRow(r)).join("") }),
    right: right(`
    ${typerow({ glyph: "network", name: txGraph, kind: "Graph", verbs: () => "" })}
    <div class="k-scroll">
      ${section("Statistics", data("Overview", "General") + `<div class="k-metrics"><div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big">3,000</span></div><div class="k-metric"><span class="k-secondary">edges</span><span class="k-big">9,113</span></div></div>` + data("Edges", "directed") + data("components", "1") + data("density", "0.00101") + data("Attributes", `<span data-fx="datasets.transactions.frame.attributes">${FX.datasets.transactions.frame.attributes}</span>`))}
      ${section("Layout", `<div class="k-row"><span class="k-grow">Force-directed</span><span class="k-btn k-btn-secondary">Run</span></div>`)}
      ${exportSection}
    </div>`),
    notes: [
        { x: 132, y: 72, text: "Find replaces the lists while open; one field over nodes, edges and every named object (information-architecture 7; interface-templates 2a). <b>SearchInput</b>." },
        { x: 250, y: 142, text: "Hits grouped by kind, exact id first. <b>ResultRow</b> under a group header. Up and Down move the highlight while focus stays in the field." },
        { x: 150, y: 235, text: "The list ends by naming what Find searched: the full graph, whatever the filter (proposed with screens/find.html). The analyst never wonders whether a hit was missed." },
        { ...sp(at("seed-selected", "ACC-233575")), text: "The highlighted hit is marked on the canvas before Enter, with the hover mark: one hairline ring after a gap, as Figma's Find highlights a match in place (canvas-drawing 6). At this size the accounts draw as density, so the hit is drawn as a point over it (proposed with the alert-triage screens)." },
        { x: 1300, y: 150, text: "Rest: the inspector describes the graph (state-matrix 3.2). <b>FieldRow</b>, <b>DataRow</b>, <b>ActionRow</b>." },
    ],
});

S.push({
    id: "t-inspect", n: 2, notesTop: 300, title: "Inspect the hit", graphName: "Transactions, 3,000 accounts, drawn as density",
    left: head(txProject, "Full graph") + lists({ graph: txGraph, count: "3,000 nodes", styles: txStyles }),
    main: canvas({ img: "seed-selected", alt: "3,000 accounts as density, ACC-233575 selected", legend: flagLegend(14),
            overlays: `<div class="k-tooltip" style="left:${at("seed-selected", "ACC-233575").x}%;top:${at("seed-selected", "ACC-233575").y}%;transform:translate(14px,-130%)"><b>ACC-233575</b><br><span class="k-secondary">riskScore 98, 8 neighbors</span></div>` }) +
        dock({ scope: "Full graph: 3,000 nodes. Sorted by riskScore.", cols: txCols, rows: fullTable.map((r, i) => txRow(r, i === 0 ? 'aria-selected="true"' : "")).join("") }),
    right: txNode({ r: seed, rank: "#1 of 3,000", conn: CN.seed }),
    notes: [
        { x: 1215, y: 108, text: "Two-line type row: the name, then the kind word and the three verbs a node carries, Neighbors (a labeled split button whose main part filters), Filter to and Pin, then the overflow (interface-specification 4.2). <b>SplitButton</b>, <b>ActionIcon</b>; the two-line row is missing from compact-mantine (7.3)." },
        { x: 1215, y: 190, text: "The rank beside the value, #1 of 3,000 (content-design 5). It names no scope because the scope is the chip's." },
        { x: 1215, y: 360, text: "Connections as the spec draws them: neighbors and edges, each In, Out and All on a directed graph (interface-specification 4.2). Each count selects what it counts. Read over the chip's scope, here the full graph. <b>ActionRow</b> counts in a grid." },
        { ...sp(at("seed-selected", "ACC-233575")), text: "Enter on the hit closed Find, panned the least distance to bring it into view and put the keyboard focus on it, selecting nothing; a second Enter (or a click on it) selected it, and the mark became the two-tone selection ring (canvas-drawing 6). Find and Quick actions' Go to never select on their own, so a found node never replaces a selection by accident." },
        { x: 330, y: 632, text: "The table shares the selection; its scope line says what it lists (information-architecture 8.1). <b>DataTable</b>." },
    ],
});

S.push({
    id: "t-size", n: 3, title: "See the size before growing", graphName: "Transactions, 3,000 accounts, drawn as density",
    left: head(txProject, "Full graph") + lists({ graph: txGraph, count: "3,000 nodes", styles: txStyles }),
    main: canvas({ img: "seed-selected", alt: "3,000 accounts as density, ACC-233575 selected", legend: flagLegend(14) }) +
        dock({ scope: "Full graph: 3,000 nodes. Sorted by riskScore.", cols: txCols, rows: fullTable.map((r, i) => txRow(r, i === 0 ? 'aria-selected="true"' : "")).join("") }),
    right: txNode({ r: seed, rank: "#1 of 3,000", conn: CN.seed, pressed: "neighbors" }),
    overlays: growMenu({
        ...MENU, of: seed.id,
        hops: [{ label: "1 hop", count: `${hood.all1} nodes` }, { label: "2 hops", count: `${fmt(hood.all2)} nodes`, on: true, hover: true }, { label: "3 hops", count: `${fmt(hood.all3)} nodes` }],
        dirs: [{ label: "In: paid by", count: `${hood.in2} nodes` }, { label: "Out: paid to", count: `${hood.out2} nodes` }, { label: "All", count: `${fmt(hood.all2)} nodes`, on: true }],
        warn: `${fmt(hood.all2)} is a third of the graph. Two hops pass through merchants: ACC-393859 alone has 907 counterparties.`,
        cmds: [{ label: "Select neighbors", count: `${fmt(hood.all2)} nodes` }, { label: "Filter to neighbors", count: `${fmt(hood.all2)} nodes` }],
    }),
    notes: [
        { x: 1150, y: 108, text: "The caret on Neighbors opens its menu, Hops from the node: hops, direction, then Filter to neighbors and Select neighbors (interface-specification 4.2). A plain press of Neighbors, the main part, filters to neighbors at the hop count and direction last used: one undoable filter step, shown on the chip; pressed again on the same node it adds the next hop to that step. Its tooltip names the command, the count and Shift+N. Select neighbors is only in the menu. (interaction-pattern-entries 4.6; proposed, study round 2). <b>SplitButton</b> with a dark <b>Menu</b>." },
        { x: 894, y: 150, text: "Hop rows are checkable and keep the menu open; each shows the size its choice would give, so the jump from 9 to 975 is seen before any choice (state-matrix 4.4). Past 3, More hops... takes a typed number." },
        { x: 894, y: 250, text: "Follow, in the order In, Out, All (interaction-pattern-entries 4.6), worded from the edge's role, each with its count at the chosen hops. Out: paid to is the small route: 14 nodes. The graph has one edge type, so the edge-type rows are left out." },
        { x: 894, y: 340, text: "The first failure: two hops take a third of the graph. The warning names the hub, read from the element (proposed). No row is emphasized, as in Figma's menus: nothing invites the large commit." },
        { x: 894, y: 408, text: "The two commands each state their count: Select neighbors changes only the selection; Filter to neighbors changes what every number describes. <b>Menu.Item</b> with a right section." },
    ],
});

// A canvas click inside the filtered 9, where accounts draw as points: the merchant receives only.
const rkM = rankIn(M, B0);
S.push({
    id: "t-click", n: 4, notesTop: 330, title: "Click an account; a direction with none", graphName: `Transactions, filtered to ${B0.length} accounts`,
    left: head(txProject, full) + lists({ graph: txGraph, count: "3,000 nodes", styles: txStyles }),
    main: canvas({ img: "boundary-merchant", alt: `The ${B0.length} accounts of the first step, ${M.id} selected`, legend: flagLegend(5) }) +
        dock({ scope: `Filtered graph: ${B0.length} of ${fmt(T.total)} nodes. Sorted by riskScore.`, cols: txCols, rows: B0.map((r) => txRow(r, r.id === M.id ? 'aria-selected="true"' : "")).join("") }),
    right: txNode({ r: M, rank: rkM, conn: CN.merchantInB0, connFull: CN.merchant, pressed: "neighbors" }),
    overlays: growMenu({
        ...MENU, of: M.id,
        hops: [{ label: "1 hop", count: "none", on: true, off: true }, { label: "2 hops", count: "none", off: true }, { label: "3 hops", count: "none", off: true }],
        dirs: [{ label: "In: paid by", count: `${M.hoodIn1} nodes` }, { label: "Out: paid to", count: "none", on: true, hover: true }, { label: "All", count: `${M.hoodAll1} nodes` }],
        note: `Counted on the graph before ${STEP}.`,
        warn: `${M.id} sent no transfers: Out finds nothing. In: paid by reaches ${M.hoodIn1 - 1} accounts.`,
        cmds: [{ label: "Filter to neighbors", count: "none", off: true }, { label: "Select neighbors", count: "none", off: true }],
    }),
    notes: [
        { x: 190, y: 38, text: `The first step is made: Filter to neighbors, all, 1 hop, from ${seed.id}. Filtered: ${B0.length} of 3,000 nodes (message graphty.filter.chip). One undo entry.` },
        { ...sp(at("boundary-merchant", M.id)), text: "Once filtered to nine, the accounts draw as points, so a canvas click picks one: this is the flow's click branch. The view fitted the nine once; positions did not move." },
        { x: 880, y: 301, text: "A direction with nothing in it says so: Out reads none, and the hop rows and both commands are off with the reason in words. It is not a zero-node commit." },
        { x: 880, y: 356, text: "Inside a filter the rows count what Filter to neighbors would read: the graph before the step, so neighbors the step leaves out can be reached (interaction-pattern-entries 6.9)." },
        { x: 1215, y: 360, text: `Connections read the filtered graph, the chip's scope: paid by 5 of the nine. One row under them gives the full-graph count, 37, so neither number misleads alone (proposed with the alert-triage screens).` },
    ],
});

const hitRowOutside = `
      <div class="k-result fe-hit2" aria-selected="true" data-hover>${icon("circle-dot")}<span class="fe-hit-text"><span class="k-id"><b>ACC-782213</b></span><span class="k-secondary fe-outside">${icon("funnel", "k-i-sm")}<span>Left out by <span class="fe-nb">${seed.id}</span> and neighbors</span></span></span><span class="k-grow"></span><span class="k-icon-btn fe-hit-add" data-hover title="Add selection to step">${icon("plus")}</span></div>`;
S.push({
    id: "t-outside", n: 5, title: "A hit the filter leaves out", graphName: `Transactions, filtered to ${B0.length} accounts`,
    left: head(txProject, full) + find("782213", `
      <div class="k-group-head">Nodes <span class="k-secondary k-num">&nbsp;1</span></div>${hitRowOutside}`),
    overlays: `<div class="k-tooltip" style="left:252px;top:206px;white-space:nowrap;max-width:none">Add selection to step<br><span class="k-secondary">1 node, to ${STEP}</span></div>`,
    main: canvas({ img: "boundary", alt: `${seed.id} and its 8 neighbors`, legend: flagLegend(5), notdrawn: `<div class="k-notdrawn">1 selected node not drawn: left out by the filter. <a>Add selection to step</a></div>` }) +
        dock({ scope: `Filtered graph: ${B0.length} of ${fmt(T.total)} nodes. Sorted by riskScore.`, cols: txCols, rows: B0.map((r) => txRow(r)).join("") }),
    right: txNode({ r: hit, rank: "#2 to #3 of 3,000, on: full graph", conn: CN.hit, connScope: "on: full graph", outsideStep: STEP }),
    notes: [
        { x: 190, y: 38, text: "The chip states the scope every number describes: Filtered: 9 of 3,000 nodes (interface-templates 7). Missing from compact-mantine (interface-specification 7.3); Mantine <b>Pill</b> with a Light popover." },
        { x: 250, y: 150, text: "Find searches the full graph, so the hit is listed; its second line names the step that leaves it out, and wraps rather than being cut by the row's button (proposed). The + shows only on hover and focus. <b>ResultRow</b>, trailing <b>ActionIcon</b>." },
        { x: 150, y: 283, text: "The list still ends by naming what Find searched: the full graph, 3,000 nodes, although the chip reads 9." },
        { x: 1215, y: 172, text: "Selected but not drawn: a state line says why. The rank and Connections both name their scope, on: full graph, because it differs from the chip (content-design 5)." },
        { x: 540, y: 552, text: "The legend's not-drawn line counts the selected node the filter leaves out, with Add selection to step (proposed with screens/find.html)." },
    ],
});

S.push({
    id: "t-grow", n: 6, title: "Select all, then grow the step one hop out", graphName: `Transactions, filtered to ${B1.length} accounts`,
    left: head(txProject, `Filtered: ${B1.length} of 3,000 nodes`) + lists({ graph: txGraph, count: "3,000 nodes", styles: txStyles }),
    main: canvas({ img: "boundary-hit-all", alt: `The ${B1.length} accounts of the step, all selected`, legend: flagLegend(6) }) +
        dock({ scope: `Filtered graph: ${B1.length} of ${fmt(T.total)} nodes, all selected. Sorted by riskScore.`, cols: txCols, rows: B1.map((r) => txRow(r, 'aria-selected="true"')).join("") }),
    right: right(`
    ${typerow({ glyph: "circle-dot", name: `${B1.length} selected`, kind: "Nodes", verbs: severalVerbs, pressed: "neighbors" })}
    <div class="k-scroll">
      ${section("Statistics", data("nodes", String(B1.length)) + data("flagged: true", "6") + data("riskScore", "0 to 98") + data("edges among them", String(T.edgesB1)))}
      ${exportSection}
    </div>`),
    overlays: growMenu({
        ...MENU, of: `${B1.length} selected nodes`,
        hops: [{ label: "1 hop", count: `${T.grow.out} nodes`, on: true }, { label: "2 hops", count: `${T.grow.out2} nodes` }, { label: "3 hops", count: `${T.grow.out3} nodes` }],
        dirs: [{ label: "In: paid by", count: `${fmt(T.grow.in)} nodes` }, { label: "Out: paid to", count: `${T.grow.out} nodes`, on: true }, { label: "All", count: `${fmt(T.grow.all)} nodes` }],
        note: `Counted on the graph before ${STEP}.`,
        cmds: [{ label: "Select neighbors", count: "none inside the filter", off: true }, { label: "Filter to neighbors", count: `${T.grow.out} nodes, +${T.grow.out - B1.length}`, hover: true }],
    }),
    notes: [
        { x: 190, y: 38, text: "ACC-782213 was added from Find: Filtered: 10 of 3,000 nodes, one undo entry, &quot;Add selection to step, 1 node&quot; (interaction-pattern-entries 6.9)." },
        { ...sp(at("boundary-hit-all", "ACC-233575")), text: "Select all (Mod+A on the canvas, or Edit, Select all) selected the 10: it reads the filtered graph, never the 3,000. One step, not an undo entry (output-homes 3)." },
        { x: 894, y: 250, text: "Out: paid to follows the money: 34 nodes. All would reach 977 through the merchants. Every count shows before committing (state-matrix 4.4)." },
        { x: 894, y: 408, text: "Select neighbors reads the filtered graph, where the 10 already are all there is, so it says so and is off. Filter to neighbors reads the graph before the step and adds to it: 34 nodes, +24. The two are never taken for each other." },
        { x: 1215, y: 108, text: "Several elements: the type row reads 10 selected, with Neighbors, Filter to and Create set (interface-specification 4.2)." },
    ],
});

const stepPopover = ({ left, top, name, count, lines, menu = "" }) => `
  <div class="k-popover fe-pop fe-steps" style="left:${left}px;top:${top}px">
    <div class="k-popover-head">Filter steps<span class="k-grow"></span><span class="k-btn k-btn-ghost">Create rule set</span></div>
    <div class="k-popover-body">
      <ul class="k-list"><li class="k-item" aria-selected="true"><span class="k-check" aria-checked="true"></span><span class="k-ellipsis">${name}</span><span class="k-trail k-num">${count}</span></li></ul>
      ${lines.map((l) => `<div class="fe-stepline k-secondary k-num">${l.replace(/(ACC-\d+)/g, '<span class="fe-nb">$1</span>')}</div>`).join("")}
      <div class="k-row k-secondary">${icon("plus")}Add filter step</div>
    </div>
    ${menu}
  </div>`;
S.push({
    id: "t-grown", n: 7, title: "The step, grown", graphName: `Transactions, filtered to ${G.length} accounts`,
    left: head(txProject, `Filtered: ${G.length} of 3,000 nodes`, true) + lists({ graph: txGraph, count: "3,000 nodes", styles: txStyles }),
    main: canvas({ img: "grown", alt: `The step grown one hop along outgoing transfers: ${G.length} accounts`, legend: flagLegend(T.grownFlagged) }) +
        dock({ scope: `Filtered graph: ${G.length} of ${fmt(T.total)} nodes. Sorted by riskScore.`, cols: txCols, rows: G.slice(0, 8).map((r) => txRow(r, r.id === seed.id ? 'aria-selected="true"' : "")).join("") }),
    right: txNode({ r: seed, rank: `#1 of ${G.length}`, conn: CN.seedInGrown, connFull: CN.seed }),
    overlays: stepPopover({ left: 306, top: 56, name: STEP, count: G.length, lines: record }),
    notes: [
        { x: 190, y: 38, text: "The chip, open: its popover lists the steps (interface-templates 7). <b>Tree</b> rows with a checkbox." },
        { x: 330, y: 150, text: "The step lists what made it and each addition, each with its command and its arguments: direction, hops, from what (message graphty.step.added; proposed: the arguments). This is the record the claim is checked against." },
        { x: 1215, y: 190, text: "The rank reads over the filtered graph, #1 of 34, with no scope words because the scope is the chip's (content-design 5)." },
        { x: 1215, y: 360, text: "Connections read the same 34; the full-graph row shows they are all the seed's neighbors anyway." },
        { ...sp(at("grown", "ACC-782213")), text: "The view fits what is left once, as an instant cut; positions do not move. 11 of the 14 flagged accounts are now inside." },
    ],
});

const grownRank = (r) => rankIn(r, G);
const t577 = G.find((r) => r.id === "ACC-577269");
S.push({
    id: "t-triage", n: 8, title: "Triage the ranked list", graphName: `Transactions, filtered to ${G.length} accounts`,
    left: head(txProject, `Filtered: ${G.length} of 3,000 nodes`) + lists({ graph: txGraph, count: "3,000 nodes", styles: txStyles }),
    main: canvas({ img: "grown-577269", alt: "The grown step, ACC-577269 selected", legend: flagLegend(T.grownFlagged),
            overlays: `<div class="k-tooltip" style="left:${at("grown", "ACC-577269").x}%;top:${at("grown", "ACC-577269").y}%;transform:translate(14px,-130%)"><b>ACC-577269</b><br><span class="k-secondary">riskScore 97, 2 of ${G.length}</span></div>` }) +
        dock({ scope: `Filtered graph: ${G.length} of ${fmt(T.total)} nodes. Sorted by riskScore, a stored attribute.`, cols: txCols, rows: G.slice(0, 8).map((r) => txRow(r, r.id === "ACC-577269" ? 'aria-selected="true" class="fe-focus"' : "")).join("") }),
    right: txNode({ r: t577, rank: grownRank(t577), conn: CN.t577InGrown, connFull: CN.t577, stepper: `2 of ${G.length}` }),
    notes: [
        { x: 330, y: 700, text: "In a list of findings the selection follows focus: each Down arrow selects the next account and brings it into view with the smallest pan (interaction-pattern-entries 4.8). <b>DataTable</b> row keyboard." },
        { x: 600, y: 626, text: "The failure this step guards against is a column computed on another scope. riskScore is stored in the file, so it has no scope; a measure run before the filter would carry on: full graph in its header and on its rank." },
        { x: 1215, y: 128, text: "The sibling stepper names the place in the list, 2 of 34; Next finding and Previous finding step the same list from the canvas (interaction-pattern-entries 4.8). Waits on the element." },
        { x: 1215, y: 190, text: "A tie reads as a tie: #2 to #3 of 34 (content-design 5). ACC-782213 shares the score." },
        { x: 1215, y: 360, text: "Connections inside the 34: 5 of its 8 neighbors; the full-graph row says 8." },
    ],
});

const stepMenu = `
    <div class="k-menu" style="left:120px;top:78px;min-width:260px;white-space:nowrap">
      <div class="k-menu-item"><span class="k-check-col"></span>Create set<span class="k-shortcut">Ctrl+G</span></div>
      <div class="k-menu-item"><span class="k-check-col"></span>Add note...</div>
      <div class="k-menu-sep"></div>
      <div class="k-menu-item"><span class="k-check-col"></span>Rename<span class="k-shortcut">Ctrl+R</span></div>
      <div class="k-menu-item"><span class="k-check-col"></span>Duplicate<span class="k-shortcut">Ctrl+D</span></div>
      <div class="k-menu-item" data-hover><span class="k-check-col"></span>Delete<span class="k-shortcut">Delete</span></div>
    </div>`;
const keptSet = `<li class="k-item">${icon("group")}<span class="k-ellipsis">${STEP}</span><span class="k-kind">frozen</span><span class="k-trail"><span class="k-paint-slot">${icon("sticky-note", "k-i-sm k-secondary")}</span><span class="k-num">${G.length}</span></span></li>`;
S.push({
    id: "t-keep", n: 9, title: "Keep it with a note, then delete the step", graphName: `Transactions, filtered to ${G.length} accounts`,
    left: head(txProject, `Filtered: ${G.length} of 3,000 nodes`, true) + lists({ graph: txGraph, count: "3,000 nodes", styles: txStyles, sets: [keptSet] }),
    main: canvas({ img: "grown", alt: `The grown step, ${G.length} accounts`, legend: flagLegend(T.grownFlagged) }) +
        dock({ scope: `Filtered graph: ${G.length} of ${fmt(T.total)} nodes. Sorted by riskScore.`, cols: txCols, rows: G.slice(0, 8).map((r) => txRow(r)).join("") }),
    right: right(`
    ${typerow({ glyph: "network", name: txGraph, kind: "Graph", verbs: () => "" })}
    <div class="k-scroll">
      ${section("Statistics", data("Overview", "General") + `<div class="k-metrics"><div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big">${G.length}</span></div><div class="k-metric"><span class="k-secondary">of</span><span class="k-big">3,000</span></div></div>` + data("flagged: true", String(T.grownFlagged)))}
      ${exportSection}
    </div>`),
    overlays: stepPopover({ left: 306, top: 56, name: STEP, count: G.length, lines: record, menu: stepMenu }),
    notes: [
        { x: 190, y: 160, text: "Kept first: Create set on the step made a frozen set of the 34 in Sets and paths, and Add note put the reason on it (its mark on the row). Two undo entries. Views are not used: they are the report's pages (task-flows 6.2). <b>Tree</b>." },
        { x: 420, y: 176, text: "The step's context menu: Delete removes the step at once, no question, because undo covers it (interaction-pattern-entries 6.4). Add note waits on the element's notes collection. <b>Menu</b> (dark)." },
        { x: 1215, y: 108, text: "Nothing selected: the inspector is the graph's, reading the filtered scope." },
    ],
});

S.push({
    id: "t-next", n: 10, title: "The next seed, its first step made", graphName: `Transactions, filtered to ${NX.hood.all1} accounts`,
    left: head(txProject, `Filtered: ${NX.hood.all1} of 3,000 nodes`, true) + lists({ graph: txGraph, count: "3,000 nodes", styles: txStyles, sets: [keptSet] }),
    main: canvas({ img: "next-boundary", alt: `${NX.id} and its ${NX.hood.all1 - 1} neighbors, the next case`, legend: flagLegend(0) }) +
        dock({ scope: `Filtered graph: ${NX.hood.all1} of ${fmt(T.total)} nodes. Sorted by riskScore.`, cols: txCols, rows: NX.rows.map((r) => txRow(r, r.id === NX.id ? 'aria-selected="true"' : "")).join("") }),
    right: txNode({ r: NX, rank: `#1 of ${NX.hood.all1}`, conn: CN.next, connFull: CN.next }),
    overlays: stepPopover({ left: 306, top: 56, name: NXSTEP, count: NX.hood.all1, lines: [`${NX.hood.all1} by Filter to neighbors, all, 1 hop, from ${NX.id}`] }),
    notes: [
        { x: 190, y: 38, text: `After Delete the chip read Full graph. Find, the name, the hit, then Filter to neighbors from the menu (size first: ${NX.hood.all1} at 1 hop, ${NX.hood.all2} at 2) made a new step on the new seed: Filtered: ${NX.hood.all1} of 3,000 nodes. The new alert shares no account with the kept case.` },
        { x: 330, y: 150, text: "The new step is named after its seed and records what made it, with its arguments." },
        { x: 190, y: 240, text: "The kept set stays in Sets and paths with its note mark; it is a frozen set and does not follow the filter." },
        { x: 1215, y: 190, text: `The rank reads over the new step: #1 of ${NX.hood.all1}. On the full graph ${NX.id} is #${NX.rankByRisk} of 3,000; the table and the chip say which scope is live.` },
    ],
});

// ---------- citations (past the drawing limit) ----------
const ctProject = "Patent citations";
const ctGraph = "Citations";
const cs = C.seed;
const ctNode = ({ pressed = "", rank = `#${cs.rank} of 124,318`, conn = C.conn.full, connFull = null } = {}) =>
    right(`
    ${typerow({ name: cs.id, kind: "Node", verbs: nodeVerbs, pressed })}
    <div class="k-scroll">
      ${section("Attributes", data("grantYear", cs.grantYear) + data("category", `<span class="k-ellipsis fe-cat">${cs.category}</span>`) + data("citationsReceived", fmt(cs.citationsReceived), rank))}
      ${connSection(conn, { full: connFull, inWord: "Cited by", outWord: "Cites" })}
      ${section("Memberships", `<div class="k-row k-secondary">In no sets</div>`)}
      ${section("Appearance", `<div class="k-fieldrow"><span class="k-legend">Color <span class="k-tertiary">-- Base style</span></span><div class="k-fields"><span class="k-field k-span">${chit("#808080")}808080</span></div></div>`)}
      ${exportSection}
    </div>`);
const notDrawn = `<div class="k-notdrawn" style="border:0;margin:0;padding:0">124,318 nodes not drawn. <a>Narrow the graph...</a></div>`;
const ctFullRows = C.fullTop.map((r) => ctRow(r, r.id === cs.id ? 'aria-selected="true"' : "")).join("");
const ctGraphName = "Patent citations, 124,318 patents, not drawn";
S.push({
    id: "c-find", n: 11, title: "Find a seed in a graph that is not drawn", graphName: ctGraphName,
    left: head(ctProject, "Full graph") + find(cs.id, `
      <div class="k-group-head">Nodes <span class="k-secondary k-num">&nbsp;1</span></div>
      <div class="k-result" aria-selected="true">${icon("circle-dot")}<span class="k-id"><b>${cs.id}</b></span><span class="k-grow"></span><span class="k-secondary">2000</span></div>`, "124,318"),
    main: canvas({ empty: true, notdrawn: notDrawn }) +
        dock({ tall: true, scope: "Full graph: 124,318 nodes. Sorted by citationsReceived.", cols: ctCols, rows: ctFullRows }),
    right: ctNode(),
    notes: [
        { x: 440, y: 270, text: "Past the drawing limit nothing is drawn until a filter step narrows it; the not-drawn line states the count with one action (state-matrix 4.2; message graphty.drawn.not). No canvas click is possible, so Find leads." },
        { x: 132, y: 72, text: "Find behaves the same at this size, except that the walk cannot go to a node that is not drawn, so Enter on the hit selects it (as a table row does), and the list ends by naming the 124,318 nodes it searched (information-architecture 7)." },
        { x: 600, y: 350, text: "The table opens at two thirds of the canvas column as the working surface, following the selection (state-matrix 4.2). <b>DataTable</b>." },
        { x: 1215, y: 360, text: "Connections on a citation graph use the edge's own words: Cites and Cited by, each with neighbors and edges." },
    ],
});

S.push({
    id: "c-count", n: 12, title: "A count still being measured", graphName: ctGraphName,
    left: head(ctProject, "Full graph") + lists({ graph: ctGraph, count: "124,318 nodes", styles: ctStyles }),
    main: canvas({ empty: true, notdrawn: notDrawn }) +
        dock({ tall: true, scope: "Full graph: 124,318 nodes. Sorted by citationsReceived.", cols: ctCols, rows: ctFullRows }),
    right: ctNode({ pressed: "neighbors" }),
    overlays: growMenu({
        ...MENU, of: cs.id,
        hops: [{ label: "1 hop", count: `${fmt(C.hood.all1)} nodes` }, { label: "2 hops", count: "not yet measured", on: true, hover: true }, { label: "3 hops", count: "not yet measured" }],
        dirs: [{ label: "In: cited by", count: "not yet measured" }, { label: "Out: cites", count: `${C.hood.out2} nodes` }, { label: "All", count: "not yet measured", on: true }],
        note: `Counting two hops over 1,480,221 edges. Esc closes the menu and stops counting.<div class="k-progress fe-menu-progress"><i style="width:35%"></i></div>`,
        cmds: [{ label: "Filter to neighbors", count: "2 hops" }, { label: "Select neighbors", count: "2 hops" }],
    }),
    notes: [
        { x: 894, y: 150, text: "A count still being computed reads not yet measured (glossary; state-matrix 3), never a blank or a spinner in place of the number. Counts that are ready show at once: one hop, and two hops along Cites." },
        { x: 894, y: 350, text: "The progress line says what is being counted and how to stop: Esc closes the menu and cancels the count; nothing was selected (interaction-patterns 3.4)." },
        { x: 894, y: 408, text: "The commands stay usable while counting and name their hops instead of a count; the notice that follows a commit reports the size." },
    ],
});

S.push({
    id: "c-size", n: 13, title: "Two hops would not draw", graphName: ctGraphName,
    left: head(ctProject, "Full graph") + lists({ graph: ctGraph, count: "124,318 nodes", styles: ctStyles }),
    main: canvas({ empty: true, notdrawn: notDrawn }) +
        dock({ tall: true, scope: "Full graph: 124,318 nodes. Sorted by citationsReceived.", cols: ctCols, rows: ctFullRows }),
    right: ctNode({ pressed: "neighbors" }),
    overlays: growMenu({
        ...MENU, of: cs.id,
        hops: [{ label: "1 hop", count: `${fmt(C.hood.all1)} nodes` }, { label: "2 hops", count: `${fmt(C.hood.all2)} nodes`, on: true }, { label: "3 hops", count: `${fmt(C.hood.all3)} nodes` }],
        dirs: [{ label: "In: cited by", count: `${fmt(C.hood.in2)} nodes` }, { label: "Out: cites", count: `${C.hood.out2} nodes`, hover: true }, { label: "All", count: `${fmt(C.hood.all2)} nodes`, on: true }],
        warn: `${fmt(C.hood.all2)} nodes with ${fmt(C.hood.all2Edges)} edges: the edges will not be drawn (limit ${fmt(C.limits.edgesDrawn)}). Cites, two hops back, is ${C.hood.out2} patents.`,
        cmds: [{ label: "Select neighbors", count: `${fmt(C.hood.all2)} nodes` }, { label: "Filter to neighbors", count: `${fmt(C.hood.all2)}, edges not drawn` }],
    }),
    notes: [
        { x: 894, y: 150, text: "The same menu at any size. The count names the limit the result would cross, from the element's level (state-matrix 4.4)." },
        { x: 894, y: 280, text: "One direction is the route that fits: Cites, two hops back, is the prior art, 148 patents. Choosing it only sets the row; nothing commits until a command." },
        { x: 894, y: 408, text: "The commands carry their consequence (edges not drawn), and neither is emphasized, so the large result is never the default." },
    ],
});

const ctHoodRows = C.hoodRows.slice(0, 8).map((r) => ctRow(r, r.id === cs.id ? 'aria-selected="true"' : "")).join("");
S.push({
    id: "c-bounded", n: 14, title: "The prior art, drawn", graphName: `Patent citations, filtered to ${C.hood.out2} patents`,
    left: head(ctProject, `Filtered: ${C.hood.out2} of 124,318 nodes`) + lists({ graph: ctGraph, count: "124,318 nodes", styles: ctStyles }),
    main: canvas({ img: "citations-seed", alt: `Patent ${cs.id} and the ${C.hood.out2 - 1} patents of its prior art`, legend: `<div class="k-lg-title">Base style</div><div class="k-lg-row">${chit("#808080")}every node<span class="k-value k-num">${C.hood.out2}</span></div>` }) +
        dock({ scope: `Filtered graph: ${C.hood.out2} of 124,318 nodes. Sorted by citationsReceived.`, cols: ctCols, rows: ctHoodRows }),
    right: ctNode({ rank: `#1 of ${C.hood.out2}`, conn: C.conn.inPriorArt, connFull: C.conn.full }),
    notes: [
        { x: 190, y: 38, text: `One Filter to neighbors (Cites, 2 hops) made the first step: Filtered: ${C.hood.out2} of 124,318 nodes, recorded as &quot;${C.hood.out2} by Filter to neighbors, out, 2 hops, from ${cs.id}&quot;. One undo entry. No whole-graph layout ran (state-matrix 4.2).` },
        { ...sp(C.anchors.seed), text: "Drawn: a first layout over the 148 patents, the seed selected, labels within the label budget (canvas-drawing)." },
        { x: 1215, y: 360, text: "Inside the prior art nothing cites the seed (every citing patent is newer), so Cited by reads 0; the full-graph row keeps the 1,397 in view." },
        { x: 1215, y: 190, text: "From here the loop is the drawn one: grow, triage, keep, next seed (states 6 to 10)." },
    ],
});

// ---------- page ----------
const css = `
  body { overflow: auto; }
  .fe-state { position: relative; width: 1440px; height: 900px; display: none; overflow: hidden; }
  .fe-state .k-app { width: 1440px; height: 900px; }
  .fe-state:first-of-type { display: block; }
  body:has(.fe-state:target) .fe-state, body:has(.fe-notes-anchor:target) .fe-state { display: none; }
  .fe-state:target, .fe-state:has(.fe-notes-anchor:target) { display: block !important; }
  .fe-notes-anchor { position: absolute; top: 0; }
  /* annotation layer: the toggle in the switcher, or a #<state>-notes link */
  .fe-notes { display: none; }
  body:has(#fe-ann:checked) .fe-notes, .fe-state:has(.fe-notes-anchor:target) .fe-notes { display: block; }
  .fe-pin { position: absolute; z-index: 95; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 10px; background: var(--k-annot); color: #fff; font-size: 11px; font-weight: 600; box-shadow: 0 0 0 2px var(--cm-bg); transform: translate(-50%, -50%); }
  .fe-notelist { position: absolute; z-index: 96; left: 330px; top: 48px; width: 520px; margin: 0; padding: 8px 12px; list-style: none; border-radius: 8px; background: var(--k-annot-bg); border-inline-start: 3px solid var(--k-annot); box-shadow: var(--cm-elevation-300); font-size: 12px; line-height: 17px; }
  .fe-notelist li { display: flex; gap: 8px; padding: 3px 0; }
  .fe-caption { position: absolute; z-index: 97; left: 50%; top: 8px; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 4px 12px 4px 6px; border-radius: 14px; background: var(--k-annot-bg); border: 1px solid var(--k-annot); font-size: 12px; white-space: nowrap; }
  .fe-caption span:last-child { color: var(--cm-text-secondary); }
  .fe-switch { position: fixed; z-index: 99; left: 6px; bottom: 8px; width: 44px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 2px; border-radius: 14px; background: var(--k-annot-bg); border: 1px solid var(--k-annot); font-size: 11px; }
  .fe-switch a { display: grid; place-items: center; min-width: 24px; height: 24px; border-radius: 12px; color: var(--k-annot-ink); text-decoration: none; font-weight: 600; }
  .fe-switch a:hover { background: var(--k-annot); color: #fff; }
  .fe-switch label { margin-top: 4px; color: var(--k-annot-ink); font-weight: 600; display: flex; flex-direction: column; align-items: center; font-size: 11px; line-height: 14px; }
  .fe-switch .fe-sep { width: 20px; height: 1px; background: var(--k-annot); margin: 2px 0; opacity: .5; }
  /* the two-line type row (interface-specification 4.2; missing from compact-mantine, 7.3) */
  .fe-type { padding: 8px 8px 8px 16px; border-bottom: 1px solid var(--cm-border); flex: none; }
  .fe-type1 { display: flex; align-items: center; gap: 8px; height: 24px; }
  .fe-type1 .k-name { font-weight: 550; }
  .fe-type2 { display: flex; align-items: center; gap: 2px; height: 24px; margin-top: 4px; }
  .fe-type2 > .k-secondary { flex: none; }
  .fe-rankline { text-align: end; padding: 0 8px 4px 16px; margin-top: -4px; }
  .fe-stateline { display: flex; gap: 8px; align-items: flex-start; margin: 8px 8px 0 16px; padding: 6px 8px; border-radius: 5px; background: var(--cm-bg-secondary); color: var(--cm-text-secondary); }
  .fe-stateline .k-i { margin-top: 2px; }
  .fe-cat { display: inline-block; max-width: 150px; vertical-align: bottom; }
  .k-item .k-trail { white-space: nowrap; }
  .fe-stepper { display: inline-flex; align-items: center; gap: 2px; margin-inline-start: 8px; color: var(--cm-text-secondary); white-space: nowrap; }
  .fe-split { display: inline-flex; align-items: center; border-radius: 5px; }
  .fe-split .fe-split-caret { display: grid; place-items: center; width: 12px; height: 24px; color: var(--cm-icon-secondary); border-radius: 0 5px 5px 0; }
  .fe-split[data-open] { background: var(--cm-bg-selected); }
  .fe-split[data-open] .k-icon-btn, .fe-split[data-open] .fe-split-caret { color: var(--cm-icon-brand); }
  .fe-link { color: var(--cm-text-brand); }
  .fe-count .k-num { min-width: 32px; text-align: end; }
  /* Find */
  .fe-findbar { padding: 8px 8px 4px 16px; }
  .fe-findbar .k-field { width: 100%; }
  .fe-findbar2 { display: flex; align-items: center; gap: 4px; padding: 0 8px 8px 16px; border-bottom: 1px solid var(--cm-border); }
  .fe-scope { width: 120px; }
  .fe-hits { position: relative; padding-top: 8px; }
  .fe-hit2 { height: auto; min-height: 48px; align-items: flex-start; padding-top: 8px; padding-bottom: 8px; }
  .fe-hit2 > .k-i { margin-top: 2px; }
  .fe-hit2::before { inset: 4px 8px; }
  .fe-hit-text { display: flex; flex-direction: column; min-width: 0; }
  .fe-outside { display: flex; align-items: flex-start; gap: 4px; white-space: normal; line-height: 16px; }
  .fe-outside .k-i { flex: none; margin-top: 2px; }
  .fe-nb { white-space: nowrap; }
  .fe-foot { padding: 12px 16px; border-top: 1px solid var(--cm-border); margin-top: 8px; }
  .fe-conn { display: grid; grid-template-columns: 1fr auto auto auto; column-gap: 16px; row-gap: 4px; white-space: nowrap; align-items: center; padding: 4px 16px 8px; }
  .fe-conn > span:nth-child(n+2) { text-align: end; }
  .fe-conn > span:nth-child(4n+1) { text-align: start; }
  .fe-scopeword { margin-inline-start: 8px; font-weight: 400; }
  .fe-menu { width: 320px; white-space: nowrap; }
  .fe-menu-note, .fe-menu-warn { padding: 4px 16px; color: var(--k-menu-ink2); white-space: normal; font-size: 11px; line-height: 16px; }
  .fe-menu-warn { display: flex; gap: 8px; align-items: flex-start; color: inherit; }
  .fe-menu-progress { margin-top: 6px; }
  .fe-hint { padding: 8px 16px; }
  /* popovers */
  .fe-pop .k-prose { padding-bottom: 8px; }
  .fe-steps { width: 300px; overflow: visible; }
  .fe-stepline { padding: 2px 8px 2px 40px; }
  .fe-dock-tall { flex-basis: 66%; }
  .k-table tr.fe-focus td:first-child { box-shadow: inset 2px 0 0 var(--cm-border-selected-strong); }
`;

const switcher = `
<nav class="fe-switch" aria-label="States">
  ${S.map((s) => `<a href="#${s.id}" title="${s.n}. ${s.title}">${s.n}</a>${s.id === "t-next" ? '<span class="fe-sep"></span>' : ""}`).join("")}
  <label><input type="checkbox" id="fe-ann"> Notes</label>
</nav>`;

const html = `<!doctype html>
<!-- THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT screens/find-and-expand/build.mjs -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440">
<title>Find, inspect, expand, next seed</title>
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>${css}</style>
</head>
<body>
${S.map(frame).join("\n")}
${switcher}
</body>
</html>
`;
writeFileSync(join(here, "..", "find-and-expand.html"), toShell(html)); // the current frame: kit/shell.mjs
writeFileSync(join(here, "states.json"), JSON.stringify(S.map((s) => ({ id: s.id, n: s.n, title: s.title, graph: s.graphName })), null, 1));
console.log(`wrote screens/find-and-expand.html, ${S.length} states`);

// =====================================================================================
// Part 2: flows/find-and-expand.html, the flow diagrams and step tables.
// =====================================================================================
const SCR = "../screens/find-and-expand.html";
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
// Node kinds follow task-flows.md 1: place (rectangle), device (stadium), ask (diamond),
// check (hexagon, a trust check), commit (parallelogram), and gap (dashed: waits on the element).
function diagram({ id, title, w, h, nodes, edges, extra = "" }) {
    const NW = 220, NH = 56, DH = 80;
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const half = (n) => [NW / 2, (n.kind === "ask" ? DH : NH) / 2];
    const side = ([nid, s, off = 0]) => {
        const n = byId[nid];
        const [hw, hh] = half(n);
        return { t: [n.x + off, n.y - hh], b: [n.x + off, n.y + hh], l: [n.x - hw, n.y + off], r: [n.x + hw, n.y + off] }[s];
    };
    const shape = (n) => {
        const [hw, hh] = half(n);
        const { x, y } = n;
        const cls = `n${n.gap ? " gap" : ""}${n.kind === "check" ? " chk" : ""}${n.prop ? " prop" : ""}`;
        if (n.kind === "ask") return `<polygon class="${cls}" points="${x},${y - hh} ${x + hw},${y} ${x},${y + hh} ${x - hw},${y}"/>`;
        if (n.kind === "check") return `<polygon class="${cls}" points="${x - hw + 14},${y - hh} ${x + hw - 14},${y - hh} ${x + hw},${y} ${x + hw - 14},${y + hh} ${x - hw + 14},${y + hh} ${x - hw},${y}"/>`;
        if (n.kind === "commit") return `<polygon class="${cls}" points="${x - hw + 12},${y - hh} ${x + hw},${y - hh} ${x + hw - 12},${y + hh} ${x - hw},${y + hh}"/>`;
        return `<rect class="${cls}" x="${x - hw}" y="${y - hh}" width="${NW}" height="${2 * hh}" rx="${n.kind === "device" ? hh : 3}"/>`;
    };
    const text = (n) => {
        const lines = n.label.split("\n");
        const y0 = n.y - ((lines.length - 1) * 15) / 2 + 4;
        return `<text class="t" text-anchor="middle">${lines.map((l, i) => `<tspan x="${n.x}" y="${y0 + i * 15}">${esc(l)}</tspan>`).join("")}</text>`;
    };
    const E = edges.map((e) => {
        const pts = [side(e.a), ...(e.via ?? []), side(e.b)];
        const d = "M" + pts.map((p) => p.join(" ")).join(" L");
        const lab = e.label ? e.label.split("\n").map((l, i) => `<text class="l${e.cls === "err" ? " errl" : ""}" x="${e.lx}" y="${e.ly + i * 13}"${e.anchor ? ` text-anchor="${e.anchor}"` : ""}>${esc(l)}</text>`).join("") : "";
        return `<path class="e${e.cls ? " " + e.cls : ""}" d="${d}" marker-end="url(#ah-${id})"/>${lab}`;
    }).join("\n");
    const N = nodes.map((n) => (n.href ? `<a href="${n.href}">${shape(n)}${text(n)}</a>` : `<g>${shape(n)}${text(n)}</g>`)).join("\n");
    return `<svg class="flowsvg" viewBox="0 0 ${w} ${h}" role="group" aria-labelledby="${id}-t">
<title id="${id}-t">${esc(title)}</title>
<defs><marker id="ah-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ahp"/></marker></defs>
${E}
${extra}
${N}
</svg>`;
}

const d6 = diagram({
    id: "d6", w: 1120, h: 1090,
    title: "Find, inspect and grow: from rest, Find (or a click where accounts draw as points) reaches the node's inspector; the Neighbors menu shows each size before committing; Filter to neighbors makes a filter step; then grow it, include a hit from outside it, or move on",
    nodes: [
        { id: "R", x: 440, y: 40, kind: "place", label: "Inspector: nothing selected\n(rest)", href: `${SCR}#t-find` },
        { id: "Z", x: 800, y: 150, kind: "ask", label: "Accounts drawn\nas points?" },
        { id: "NM", x: 140, y: 260, kind: "place", label: "Find: 0 matches;\nClosest: the nearest id" },
        { id: "FD", x: 440, y: 260, kind: "device", gap: true, label: "Find, in the left panel", href: `${SCR}#t-find` },
        { id: "CV", x: 800, y: 260, kind: "place", label: "Canvas: click an account", href: `${SCR}#t-click` },
        { id: "IN", x: 440, y: 370, kind: "place", gap: true, label: "Inspector, node: its rank,\nConnections", href: `${SCR}#t-inspect` },
        { id: "SZ", x: 440, y: 480, kind: "check", gap: true, label: "Neighbors menu:\neach size before committing", href: `${SCR}#t-size` },
        { id: "Q", x: 440, y: 600, kind: "ask", label: "Count only these\nfrom now on?" },
        { id: "C1", x: 440, y: 710, kind: "commit", gap: true, label: "Filter to neighbors:\na new filter step", href: `${SCR}#t-click` },
        { id: "T2", x: 440, y: 810, kind: "check", label: "Chip: Filtered: 9 of\n3,000 nodes", href: `${SCR}#t-click` },
        { id: "G", x: 440, y: 920, kind: "ask", label: "Grow it, look for\nmore, or done?" },
        { id: "C3", x: 112, y: 920, kind: "commit", gap: true, label: "The step grows by\nthe chosen hops", href: `${SCR}#t-grown` },
        { id: "H", x: 800, y: 920, kind: "ask", label: "Is the hit outside\nthe filter?", href: `${SCR}#t-outside` },
        { id: "C2", x: 800, y: 810, kind: "commit", gap: true, label: "The step includes\nthe hit", href: `${SCR}#t-grow` },
        { id: "OUT", x: 440, y: 1045, kind: "place", label: "Triage, the next seed,\na note, export", href: "#triage" },
    ],
    edges: [
        { a: ["R", "b"], b: ["FD", "t"], label: "Find", lx: 448, ly: 150 },
        { a: ["R", "r"], via: [[800, 40]], b: ["Z", "t"] },
        { a: ["Z", "b"], b: ["CV", "t"], label: "yes: click one", lx: 808, ly: 205 },
        { a: ["Z", "l"], via: [[640, 150], [640, 250]], b: ["FD", "r", -10], label: "no: density,", lx: 648, ly: 180 },
        { a: ["FD", "l", -8], b: ["NM", "r", -8], cls: "err", label: "no match", lx: 290, ly: 244, anchor: "middle" },
        { a: ["NM", "r", 12], b: ["FD", "l", 12], label: "the candidate", lx: 290, ly: 290, anchor: "middle" },
        { a: ["FD", "b"], b: ["IN", "t"], label: "Enter, Enter", lx: 448, ly: 322 },
        { a: ["CV", "b"], via: [[800, 356]], b: ["IN", "r", -14], label: "Select", lx: 808, ly: 322 },
        { a: ["IN", "b"], b: ["SZ", "t"], label: "Select neighbors", lx: 448, ly: 432 },
        { a: ["SZ", "b"], b: ["Q", "t"] },
        { a: ["Q", "l"], via: [[250, 600], [250, 480]], b: ["SZ", "l"], label: "too big: fewer hops,\nor one direction", lx: 258, ly: 548 },
        { a: ["Q", "r"], via: [[660, 600], [660, 384]], b: ["IN", "r", 14], cls: "err", label: "no: back to the node", lx: 668, ly: 500 },
        { a: ["Q", "b"], b: ["C1", "t"], label: "yes: Filter to neighbors", lx: 448, ly: 664 },
        { a: ["C1", "b"], b: ["T2", "t"] },
        { a: ["T2", "b"], b: ["G", "t"] },
        { a: ["G", "l"], b: ["C3", "r"], label: "grow: Select all,\nFilter to neighbors", lx: 272, ly: 942, anchor: "middle" },
        { a: ["C3", "t"], via: [[112, 810]], b: ["T2", "l"] },
        { a: ["G", "r"], b: ["H", "l"], label: "look: Find", lx: 620, ly: 912, anchor: "middle" },
        { a: ["H", "t"], b: ["C2", "b"], label: "yes: Add selection to step", lx: 808, ly: 862 },
        { a: ["C2", "l"], b: ["T2", "r"] },
        { a: ["H", "r"], via: [[1010, 920], [1010, 370]], b: ["IN", "r"], label: "no, inside:", lx: 1018, ly: 640 },
        { a: ["G", "b"], b: ["OUT", "t"], label: "done", lx: 448, ly: 998 },
        { a: ["T2", "r", 10], via: [[600, 820], [600, 740]], b: ["C1", "r", 30], cls: "err", label: "Undo", lx: 606, ly: 790 },
    ],
    extra: `<text class="l" x="648" y="193">or not drawn</text><text class="l" x="1018" y="653">Select</text>`,
});

const d61 = diagram({
    id: "d61", w: 1120, h: 690,
    title: "Triage a ranked list: from a sorted table column or a result's top nodes, check the column was computed on the chip's scope, then each Next finding selects the next account and shows its place in the list; one worth a closer look goes to Find, inspect and grow, or is cleared with a note",
    nodes: [
        { id: "TB", x: 300, y: 40, kind: "place", label: "Table: a column sorted\n(riskScore, highest first)", href: `${SCR}#t-triage` },
        { id: "RM", x: 760, y: 40, kind: "device", label: "A result's editor:\nTop nodes" },
        { id: "X", x: 530, y: 170, kind: "ask", label: "Computed on the\nchip's scope?" },
        { id: "W", x: 880, y: 170, kind: "check", label: "Column and rank say\non: full graph" },
        { id: "IN", x: 530, y: 290, kind: "place", gap: true, label: "Inspector: the finding,\nselected and in view", href: `${SCR}#t-triage` },
        { id: "RK", x: 530, y: 400, kind: "check", gap: true, label: "Place in the list: 2 of 34;\nrank #2 to #3 of 34", href: `${SCR}#t-triage` },
        { id: "END", x: 880, y: 400, kind: "place", label: "Last of 34: stays on\nthe last, says so" },
        { id: "D", x: 530, y: 520, kind: "ask", label: "Worth a closer\nlook?" },
        { id: "F6", x: 230, y: 640, kind: "place", label: "Find, inspect and grow,\nfrom this node", href: "#expand" },
        { id: "F7", x: 530, y: 640, kind: "place", label: "Take a note: clear it\nwith a reason", href: "take-a-note.html" },
    ],
    edges: [
        { a: ["TB", "b"], via: [[300, 170]], b: ["X", "l"] },
        { a: ["RM", "b"], via: [[760, 100], [530, 100]], b: ["X", "t"] },
        { a: ["X", "b"], b: ["IN", "t"], label: "yes: Next finding", lx: 538, ly: 240 },
        { a: ["X", "r"], b: ["W", "l"], cls: "err", label: "no, computed", lx: 705, ly: 150, anchor: "middle" },
        { a: ["W", "b"], via: [[880, 290]], b: ["IN", "r"], label: "Next finding", lx: 888, ly: 240 },
        { a: ["IN", "b"], b: ["RK", "t"] },
        { a: ["RK", "b"], b: ["D", "t"] },
        { a: ["RK", "r"], b: ["END", "l"], label: "Next finding,", lx: 705, ly: 392, anchor: "middle" },
        { a: ["D", "l"], via: [[220, 520], [220, 304]], b: ["IN", "l", 14], label: "no: Next finding", lx: 228, ly: 420 },
        { a: ["D", "b"], via: [[530, 590], [230, 590]], b: ["F6", "t"], label: "yes", lx: 360, ly: 582 },
        { a: ["D", "b"], b: ["F7", "t"], label: "clear it with a reason", lx: 538, ly: 600 },
    ],
    extra: `<text class="l errl" x="705" y="192" text-anchor="middle">before the filter</text><text class="l" x="705" y="418" text-anchor="middle">at the end</text>`,
});

const d62 = diagram({
    id: "d62", w: 1120, h: 1000,
    title: "The next seed: a referred case is kept as a set with a note, a cleared one is exported or dropped; the step is deleted; Find the next seed, see its size in the Select neighbors menu, and Filter to neighbors makes a new step on it",
    nodes: [
        { id: "WS", x: 530, y: 40, kind: "place", label: "Filter chip: Filtered:\n34 of 3,000 nodes", href: `${SCR}#t-grown` },
        { id: "K", x: 530, y: 160, kind: "ask", label: "Keep this case to\ncome back to?" },
        { id: "C1", x: 230, y: 280, kind: "commit", gap: true, label: "Create set; Add note:\nthe set kept, with a note", href: `${SCR}#t-keep` },
        { id: "F9", x: 760, y: 280, kind: "place", label: "Export the evidence", href: "export.html" },
        { id: "PR", x: 995, y: 390, kind: "commit", prop: true, gap: true, label: "Awaiting study: Create\nset, then delete" },
        { id: "DEL", x: 530, y: 390, kind: "commit", gap: true, label: "Delete the step", href: `${SCR}#t-keep` },
        { id: "U", x: 180, y: 510, kind: "ask", label: "Not kept, and\nwanted after all?" },
        { id: "FD", x: 530, y: 510, kind: "device", gap: true, label: "Find the next seed", href: `${SCR}#t-find` },
        { id: "SZ", x: 530, y: 620, kind: "check", gap: true, label: "Neighbors menu:\neach size before committing", href: `${SCR}#t-size` },
        { id: "C2", x: 530, y: 730, kind: "commit", gap: true, label: "Filter to neighbors: a\nnew step on the new seed", href: `${SCR}#t-next` },
        { id: "T1", x: 530, y: 840, kind: "check", label: "Chip: Filtered: 4 of\n3,000 nodes", href: `${SCR}#t-next` },
        { id: "F6", x: 530, y: 950, kind: "place", label: "Find, inspect and grow,\nto expand", href: "#expand" },
    ],
    edges: [
        { a: ["WS", "b"], b: ["K", "t"] },
        { a: ["K", "l"], via: [[230, 160]], b: ["C1", "t"], label: "yes, referred:", lx: 238, ly: 200 },
        { a: ["K", "r"], via: [[760, 160]], b: ["F9", "t"], label: "export the evidence first", lx: 768, ly: 200 },
        { a: ["K", "r"], via: [[995, 160]], b: ["PR", "t"], cls: "prop", label: "yes, referred, if the", lx: 1003, ly: 290 },
        { a: ["K", "b"], b: ["DEL", "t"], label: "no, cleared", lx: 538, ly: 300 },
        { a: ["C1", "b"], via: [[230, 390]], b: ["DEL", "l"] },
        { a: ["F9", "b"], via: [[760, 390]], b: ["DEL", "r"] },
        { a: ["DEL", "b"], b: ["FD", "t"], label: "Find", lx: 538, ly: 462 },
        { a: ["DEL", "l", 14], via: [[180, 404]], b: ["U", "t"], cls: "err", label: "the first failure", lx: 188, ly: 446 },
        { a: ["U", "l"], via: [[40, 510], [40, 40]], b: ["WS", "l"], cls: "err", label: "yes: Undo", lx: 48, ly: 270 },
        { a: ["U", "r"], b: ["FD", "l"], label: "no", lx: 355, ly: 502, anchor: "middle" },
        { a: ["FD", "b"], b: ["SZ", "t"], label: "Select", lx: 538, ly: 572 },
        { a: ["SZ", "b"], b: ["C2", "t"], label: "Filter to neighbors", lx: 538, ly: 682 },
        { a: ["C2", "b"], b: ["T1", "t"] },
        { a: ["T1", "b"], b: ["F6", "t"] },
        { a: ["PR", "b"], via: [[995, 510]], b: ["FD", "r"], cls: "prop" },
    ],
    extra: `<text class="l" x="238" y="213">Create set; Add note</text><text class="l" x="1003" y="303">study shows a stall:</text><text class="l" x="1003" y="316">one entry, note asked</text>`,
});

const shot = (id, cap) => `<figure><a href="${SCR}#${id}"><img src="../shots/screens__find-and-expand--${id}.png" alt="${esc(cap)}" width="1440" height="900"></a><figcaption>${cap}</figcaption></figure>`;
const need = (t) => `<span class="need">${t}</span>`;
const st = Object.fromEntries(S.map((s) => [s.id, s]));
const link = (id) => `<a href="${SCR}#${id}">${st[id].n}. ${esc(st[id].title)}</a>`;
const table = (rows) => `<table class="steps">
<tr><th>Step</th><th>Place</th><th>Command</th><th>Pattern</th><th>Undo label</th><th>Trust check</th><th>Built by</th><th>Element need</th></tr>
${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("\n")}
</table>`;
const miss = (row) => `<b>missing</b>: &quot;${row}&quot;`;
const facts = (rows) => `<table class="facts">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>`;

const flowHtml = `<!doctype html>
<!-- THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT screens/find-and-expand/build.mjs -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Find, inspect, expand, next seed</title>
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>
.flowsvg { width: 100%; max-width: 1120px; height: auto; display: block; margin: 8px 0 16px; }
.flowsvg .n { fill: var(--cm-bg); stroke: var(--cm-text); stroke-width: 1.2; }
.flowsvg .n.chk { stroke-width: 2; }
.flowsvg .n.gap { stroke-dasharray: 5 4; }
.flowsvg .n.prop { stroke: var(--k-annot); fill: var(--k-annot-bg); }
.flowsvg a:hover .n { fill: var(--cm-bg-hover); }
.flowsvg a .t { fill: var(--cm-text-brand); }
.flowsvg .t { font-size: 12px; fill: var(--cm-text); }
.flowsvg .l { font-size: 11px; fill: var(--cm-text-secondary); }
.flowsvg .l.errl { fill: var(--k-annot-ink); }
.flowsvg .e { fill: none; stroke: var(--cm-text-secondary); stroke-width: 1.2; }
.flowsvg .e.err { stroke: var(--k-annot); stroke-dasharray: 2 3; }
.flowsvg .e.prop { stroke: var(--k-annot); stroke-dasharray: 6 4; }
.flowsvg .ahp { fill: var(--cm-text-secondary); }
.keyrow { display: flex; flex-wrap: wrap; gap: 8px 20px; color: var(--cm-text-secondary); }
.keyrow svg { vertical-align: middle; margin-right: 6px; }
.keyrow .blue { color: var(--cm-text-brand); }
.k-doc table.steps { font-size: 12px; line-height: 18px; }
.k-doc .facts th { width: 150px; }
.need { display: inline-block; padding: 0 6px; margin: 1px 0; border-radius: 4px; box-shadow: inset 0 0 0 1px var(--cm-border-strong); font-size: 11px; }
.shots { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.shots figure { margin: 0; }
.shots img { width: 100%; height: auto; display: block; border-radius: 6px; box-shadow: 0 0 0 1px var(--cm-border); }
.shots figcaption { margin-top: 6px; }
.study li { margin-bottom: 6px; }
</style>
</head>
<body>
<div class="k-doc">
<p><a href="../index.html">Design gallery</a></p>
<h1>Find, inspect, expand, next seed</h1>
<p class="k-lede">An analyst starts from one flagged account, reads it, makes the accounts around it the only ones every number counts, grows that set one hop at a time with the size shown before each step, triages what is inside, then keeps the case and starts the next alert. Drawn on two graphs: 3,000 bank accounts, which the canvas draws as density until a filter narrows them, and 124,318 patents, which it does not draw at all. Shapes with blue text open the screen they show.</p>

${facts([
    ["Who", `Sarah, the fraud investigator of the study's personas, has an escalated alert on account ACC-233575 (risk score 98, the highest of the 3,000 accounts in March's transfers). She handles fifty alerts a day and must be able to say that each count she writes down describes exactly her case. The graph too large to draw is worked by Dr. Mara Lindqvist, the study's Gephi holdout persona, who brings citation networks: she traces the prior art of patent 6061722 in a 124,318-patent sample.`],
    ["Graphs", `Find works the same at every size. A canvas click needs the accounts drawn as points: the 3,000 accounts draw as density at first, so Find leads; once a filter narrows them to nine, a click picks one (${link("t-click")}). The patent graph draws nothing until a filter step narrows it (${link("c-find")}).`],
    ["Claim at the end", `"ACC-233575 and its neighbors in both directions, ACC-782213, and every account those ten sent money to -- 34 accounts -- are my case's boundary, and every number I quote describes them."`],
    ["What is recorded", `One filter step, named after its seed, with a line for what made it and one per addition, each naming its command and arguments: &quot;9 by Filter to neighbors, all, 1 hop, from ACC-233575&quot;; &quot;+1 by Add selection to step, from 1 node&quot;; &quot;+24 by Filter to neighbors, out, 1 hop, from 10 nodes&quot;. Each is one undo entry with the same words. Then the kept set and its note.`],
    ["Compared with Figma", "Figma's Find: the name, then Enter selects and zooms, 2 steps; graphty's takes 3: the name, Enter to go there, Enter to select. The extra Enter is what stops a found node replacing a selection the analyst built (a keyboard participant ended with three nodes selected when Find selected). Growing by neighbors has no Figma counterpart; its extra step is the size check before committing, which is a trust check. Figma's split-button menus are the model for the Select neighbors menu: one click commits, nothing is primary, Esc or a click outside closes it."],
    ["How steps are counted", "A <b>step</b> is one command given or one choice made: a name typed, a hit picked, a value chosen. A <b>place visited</b> is a click that only reaches a step: opening Find, a menu, the chip. Counts start from rest."],
    ["Needs graphty-element", `Every dashed shape waits on graphty-element: ${["Paged id listings over a scope", "Scoped reads for the inspector", "Rank over the run's scope", "An exact neighborhood count", "Per-step filter membership", "Ordered filter steps", "Add selection to step from outside the step", "Undo slices for graph entries", "Next finding and Previous finding", "A notes collection"].map(need).join(" ")}, and one proposed here, ${need("Name the node that contributes most to a neighborhood count")}.`],
])}

<div class="keyrow">
<span><svg width="34" height="16"><rect x="1" y="1" width="32" height="14" rx="2" fill="none" stroke="currentColor"/></svg>a place in the app</span>
<span><svg width="34" height="16"><rect x="1" y="1" width="32" height="14" rx="7" fill="none" stroke="currentColor"/></svg>a device: Find, a menu</span>
<span><svg width="24" height="18"><polygon points="12,1 23,9 12,17 1,9" fill="none" stroke="currentColor"/></svg>a decision</span>
<span><svg width="34" height="16"><polygon points="6,1 28,1 33,8 28,15 6,15 1,8" fill="none" stroke="currentColor" stroke-width="2"/></svg>a trust check the analyst sees</span>
<span><svg width="34" height="16"><polygon points="6,1 33,1 28,15 1,15" fill="none" stroke="currentColor"/></svg>a committed change (one undo entry)</span>
<span><svg width="34" height="16"><rect x="1" y="1" width="32" height="14" rx="2" fill="none" stroke="currentColor" stroke-dasharray="4 3"/></svg>waits on graphty-element</span>
<span><svg width="34" height="10"><line x1="0" y1="5" x2="34" y2="5" stroke="var(--k-annot)" stroke-dasharray="2 3"/></svg>an error or a way back</span>
<span><svg width="34" height="10"><line x1="0" y1="5" x2="34" y2="5" stroke="var(--k-annot)" stroke-dasharray="6 4"/></svg>proposed, not in the framework</span>
<span class="blue">blue text: opens the screen</span>
</div>
<p class="k-secondary">Pattern numbers are sections of interaction-pattern-entries.md. Built by: <b>Element</b> is graphty-element alone; <b>Surfaced</b> is graphty-element's call shown by the app; <b>App</b> is chrome only.</p>

<h2 id="expand">Find, inspect and grow</h2>
${facts([
    ["Task", "Find and explore, the fourth of the seven top tasks."],
    ["Serves", "The alert investigation: Find the seed; Expand. Also The first look (Sample) and The weekly return (Follow up)."],
    ["Start", "Rest: the inspector describes the graph and nothing is selected; or a finding from the ranked list below."],
    ["Re-entry", "The filter step, or rest."],
])}
${d6}

${table([
    ["find", "Find; the canvas where accounts draw as points", "Select (the hit)", "Select, 4.1", "no undo entry", "a hit a step leaves out says so on its second line; the list ends &quot;Searching the full graph: 3,000 nodes&quot;", "Surfaced", `<code>session.selection.apply</code>; ${miss("Paged id listings over a scope")}`],
    ["read", "Inspector, node; the table, the same row selected", "--", "--", "no undo entry", "the node's rank; Connections over the chip's scope", "Surfaced", `<code>session.data.node</code>; ${miss("Scoped reads for the inspector")}; rank ${miss("Rank over the run's scope")}`],
    ["size first", "The Select neighbors menu (the split button's caret)", "-- (a hop row, a Follow row)", "Grow the selection, 4.6", "no undo entry", "the size of each hop and direction before committing; the hub named", "Surfaced", `${miss("An exact neighborhood count")}; the hub: proposed, &quot;Name the node that contributes most to a neighborhood count&quot;`],
    ["bound", "The same menu", "Filter to neighbors", "Narrow, grow and hide, 6.9", "&quot;Filter to neighbors, all, 1 hop&quot;", "the chip reads Filtered: 9 of 3,000 nodes", "Surfaced", `${miss("Per-step filter membership")}; undo ${miss("Undo slices for graph entries")}`],
    ["include", "Find hits", "Add selection to step", "Narrow, grow and hide, 6.9", "&quot;Add selection to step, 1 node&quot;", "the hit's line &quot;Left out by ACC-233575 and neighbors&quot;; the legend's not-drawn line", "Surfaced", miss("Add selection to step from outside the step")],
    ["select all", "The canvas; Edit menu", "Select all", "Select, 4.1", "no undo entry (Select members on a kept set returns an earlier selection)", "the type row reads 10 selected; the table's scope line says all selected", "Surfaced", "<code>session.selection.apply</code>"],
    ["grow the step", "The Select neighbors menu", "Filter to neighbors", "Narrow, grow and hide, 6.9", "&quot;Filter to neighbors, out, 1 hop&quot;", "&quot;34 nodes, +24&quot; before committing; the chip after", "Surfaced", miss("Ordered filter steps")],
])}
<h3>What the analyst sees</h3>
<ul>
<li><b>find</b>: one hit, exact id first, marked on the canvas with the hover mark before Enter: ${link("t-find")}. Past the drawing limit the same: ${link("c-find")}.</li>
<li><b>read</b>: risk score 98, #1 of 3,000; Connections: neighbors In 3, Out 5, All 8, and edges the same: ${link("t-inspect")}.</li>
<li><b>size first</b>: hop rows 9, 975 and 2,356 nodes; Follow rows In 9, Out 14, All 975; the warning names the merchant with 907 counterparties; each command says its count: ${link("t-size")}. On the patent graph the count is first not yet measured (${link("c-count")}), then names the edge limit it would cross (${link("c-size")}). A direction with nothing in it says none, and both commands are off: ${link("t-click")}.</li>
<li><b>bound</b>: Filtered: 9 of 3,000 nodes; canvas, table and counts read the 9, and the accounts now draw as points: ${link("t-click")}. On the patent graph the first step draws: ${link("c-bounded")}.</li>
<li><b>include</b>: the hit row names the step that leaves it out; the inspector says it is not drawn and not counted, and its rank and Connections say on: full graph: ${link("t-outside")}.</li>
<li><b>select all</b> and <b>grow the step</b>: 10 selected; Out, 1 hop: Filter to neighbors, 34 nodes, +24; Select neighbors is off because inside the filter there is nothing more: ${link("t-grow")}. After, the step lists what made it and each addition: ${link("t-grown")}.</li>
</ul>
<p><b>Keyboard.</b> Mod+F opens Find with focus in the field; Up and Down move the highlight while focus stays there; Enter closes Find and puts the keyboard focus on the hit, on the canvas, selecting nothing; Enter again adds it to the selection; Esc closes Find and returns focus to where it was. F6, the region key, reaches the inspector's type row, where Select neighbors is; Tab from the canvas goes to the table, on the hit's row. The caret opens the menu with focus on the checked hop row; Up and Down move through the rows and each count is announced politely; Space checks a hop or Follow row and keeps the menu open; Enter on a command commits and closes; Esc closes it and returns focus to the caret. A plain press of the split button's main part still grows one hop with the direction last used, and its tooltip carries that count. Mod+A on the canvas is Select all. Every command is also in Quick actions.</p>
<p><b>Steps.</b> Find and read: 2 steps (the name; the hit), 1 place visited (Find). The first step: 1 step (Filter to neighbors), 1 place (the caret), plus 1 step per hop or Follow row changed; Sarah tried 2 hops and went back to 1, so 3 steps. Including a hit from outside: 3 steps (the name; the hit; Add selection to step), 1 place (Find). Each growth round: 3 steps (Select all; a Follow row; Filter to neighbors), 1 place (the caret). Sarah's whole case: 11 steps, 4 places visited.</p>
<p><b>First failure.</b> Two hops through a merchant take a third of the graph. The count shows before anything is selected, with the merchant named and the one-direction route counted on its own row. No command in the menu is emphasized, so the large result is never the default: ${link("t-size")}.</p>
<p><b>Ways back.</b> Esc closes the menu without selecting anything, and stops a count still being measured. A stray click or Esc that clears a hard-built selection is recovered with Ctrl+Z, which brings the cleared selection back before any filter change while nothing else has changed since. Undo reverses each filter change one step at a time.</p>

<h2 id="triage">Triage the ranked list</h2>
${facts([
    ["Task", "Find and explore, over the findings of a ranking or a rule set."],
    ["Serves", "The alert investigation: Triage the matches."],
    ["Start", "A sorted table column, a result's Top nodes, or Find's hits."],
    ["Figma route", "Find's next and previous match: 1 step per match. graphty's is the same."],
    ["Claim", `"I looked at the 34 accounts by risk score, and these 3 need a closer look."`],
    ["Record", "The notes and sets made on the way; stepping is not a step."],
    ["Re-entry", "The list, at the finding last selected."],
])}
${d61}
${table([
    ["step", "The table, sorted by riskScore; the canvas", "Next finding; Previous finding", "Step through findings, 4.8", "no undo entry", "the place in the list, 2 of 34; the rank, #2 to #3 of 34", "Surfaced", `${miss("Next finding and Previous finding")}; rank ${miss("Rank over the run's scope")}`],
])}
<p><b>What the analyst sees.</b> The next account selected and brought into view; &quot;2 of 34&quot; on the type row; &quot;#2 to #3 of 34&quot; beside the score, a tie with ACC-782213; Connections inside the 34, with the full-graph count under them: ${link("t-triage")}.</p>
<p><b>Keyboard.</b> In the table the selection follows focus, so each Down arrow is Next finding; on the canvas Next finding and Previous finding step the same list by their chords.</p>
<p><b>Steps.</b> 1 step per finding, no places visited once the list has focus: 34 findings, 34 steps.</p>
<p><b>First failure.</b> Stepping through a list sorted on a column computed on another scope: a PageRank run on the full graph before the filter would rank the 34 among 3,000 while the chip says 34. Its header and every rank then say on: full graph, and the analyst re-runs it on the filter or reads it knowingly. riskScore is stored in the file and has no scope, so Sarah's list cannot hit this; the diagram draws the branch. <b>At the end of the list</b> the selection stays on the last finding and &quot;Last of 34&quot; is announced; it does not wrap, so the count of findings reviewed stays true.</p>

<h2 id="next">The next seed</h2>
${facts([
    ["Task", "Find and explore."],
    ["Serves", "The alert investigation: The next alert."],
    ["Start", "A filter step from Find, inspect and grow."],
    ["Figma route", "None: Figma keeps no working set to replace."],
    ["Claim", `"The previous case is kept as a set with a note; this one starts from ACC-175569." A cleared alert keeps only its evidence file; a referred one also keeps the set and its note.`],
    ["Record", "The kept set, its note, and the undo entries for Delete and Filter to neighbors."],
    ["Re-entry", "Find, inspect and grow."],
])}
${d62}
${table([
    ["keep", "The filter step's menu, in the chip's popover", "Create set; Add note", "Add with defaults, 6.1", "&quot;Create set ACC-233575 and neighbors&quot;; &quot;Add note&quot;", "the set and its note mark in Sets and paths", "Surfaced", `<code>session.sets.createFrom</code>; notes ${miss("A notes collection")}`],
    ["clear", "The same menu", "Delete", "Delete, 6.4", "&quot;Delete step ACC-233575 and neighbors&quot;", "the chip reads Full graph", "Surfaced", `${miss("Per-step filter membership")}; undo ${miss("Undo slices for graph entries")}`],
    ["next seed", "Find; the Select neighbors menu", "Select (the hit); Filter to neighbors", "Select, 4.1; Narrow, grow and hide, 6.9", "&quot;Filter to neighbors, all, 1 hop&quot;", "the size before committing (4 at 1 hop, 55 at 2); the chip reads Filtered: 4 of 3,000 nodes", "Surfaced", `${miss("An exact neighborhood count")}; ${miss("Ordered filter steps")}`],
])}
<p><b>What the analyst sees.</b> The set of 34 in Sets and paths with its note mark, then the step's menu with Delete: ${link("t-keep")}. After Find, the new seed's size in the menu, and Filter to neighbors makes a new step named after ACC-175569, an account that shares no neighbor with the kept case: ${link("t-next")}. The new seed never stands alone in a scope of one node, so no rank reads &quot;#1 of 1&quot;.</p>
<p><b>Keyboard.</b> Mod+G and Delete on the focused step row; Add note from the row's menu; then Find and the Select neighbors menu as above.</p>
<p><b>Steps.</b> Counted from a grown step to the next one started, on the rules above. With the note, as the claim needs: 6 steps (Create set; Add note; Delete; the name; the hit; Filter to neighbors) and 6 places visited (the chip; the step's menu three times; Find; the caret). Without the note, for a cleared alert: 5 steps. The framework's own count for this route is 4 steps plus 2 to keep, also 6 with the note: it counts opening Find as a step and leaves out picking the hit, which cancel out.</p>
<p><b>The budget of 3.</b> The framework caps this at 3 steps &quot;to keep the previous boundary and start the next&quot;, to be measured in the prototype sessions. Read over the whole route, no design meets it: picking the new seed alone is 2 steps (the name; the hit). Read as the keep-and-clear steps only, today's route meets it with the note (Create set; Add note; Delete: 3). So no new command is proposed. If sessions show analysts stalling or deleting before keeping, the fallback the framework names is one undoable macro, built from existing words: a &quot;Create set, then delete&quot; entry on the step's menu that asks for the note inside it. It is drawn dashed in color above and marked awaiting study.</p>
<p><b>First failure.</b> Deleting a case that was never kept. Undo brings the step back whole with its additions.</p>

<h2>How it behaves</h2>
<h3>Selection and scope</h3>
<ul>
<li>Find always searches the full graph, and its list ends by saying so: &quot;Searching the full graph: 3,000 nodes&quot;. A hit the filter leaves out is listed, and its second line says which step leaves it out, in words, wrapping rather than being cut by the row's button.</li>
<li>Selecting a node the filter leaves out is allowed: it is selected, not drawn, and a state line at the top of the inspector says so. Its rank and its Connections name their scope (&quot;on: full graph&quot;) because it differs from the chip.</li>
<li>Everywhere else the rank and Connections read the chip's scope and add no words; while a filter is on, one row under Connections gives the full-graph count.</li>
<li>Select neighbors changes only the selection and reads the filtered graph; Filter to neighbors changes what every number describes, reads the graph as it was before the newest filter step, and adds to that step. They are two commands in the same menu, each with its own count, so neither is taken for the other.</li>
<li>Select all reads the filtered graph: it selects the step's nodes, never the 3,000.</li>
</ul>
<h3>The Select neighbors menu</h3>
<ul>
<li>One menu, from the split button's caret: the hops (1, 2, 3, then More hops... for a typed number), the direction in the order In, Out, All with the words of the edge's role, then Select neighbors and Filter to neighbors. The graph of transfers has one edge type, so the edge-type rows are not shown; a graph with several lists them after the direction.</li>
<li>Hop and Follow rows are checkable and keep the menu open; each shows the size its choice would give. The commands commit and close the menu.</li>
<li>A count still being computed reads not yet measured, with a progress line; the commands stay usable and name their hops instead. A direction with no neighbors reads none, and the commands say none and are off.</li>
<li>A plain press of the main part still grows one hop with the direction last used; its tooltip carries the count.</li>
</ul>
<h3>Feedback</h3>
<ul>
<li>Counts before commits: every hop, every direction and each command's result show before anything acts. When a result would cross a drawing limit the warning says which, and the command carries it (&quot;edges not drawn&quot;).</li>
<li>After a filter change the view fits what is left once, as an instant cut; node positions do not move.</li>
<li>No notices: every change in this flow happens in sight. The chip's new count is announced politely.</li>
</ul>
<h3>Focus</h3>
<ul>
<li>Opening Find puts focus in its field; the list is reached with the arrows without leaving the field.</li>
<li>Opening the Select neighbors menu puts focus on its checked hop row; closing it returns focus to the caret.</li>
<li>After Filter to neighbors, focus returns to the caret; after Delete on a step row, focus moves to the next row, else to the chip.</li>
</ul>

<h2 id="study">For the study sessions: where the analyst may stall</h2>
<p>Tasks to give each participant, worded so they do not name the control that answers them. What to watch for follows each.</p>
<ol class="study">
<li>&quot;Before changing anything, find out how many accounts are within two transfers of ACC-233575.&quot; Watch whether they open the Select neighbors menu, and whether they read the count before choosing.</li>
<li>&quot;Make the accounts connected to this one the only ones your numbers count.&quot; Watch whether they reach for Select neighbors, which changes only the selection, instead of Filter to neighbors.</li>
<li>&quot;ACC-782213 came up in a note from a colleague. Is it part of what your numbers describe right now? If not, make it part.&quot; Watch whether the hit's second line is read as outside.</li>
<li>&quot;Go through the accounts from the highest risk down, and tell me where the third one stands among them.&quot; Watch whether they trust the rank's scope.</li>
<li>&quot;This case is being referred. Keep what you have so you can come back to it, then start on ACC-175569.&quot; Count the steps, and note whether they delete before keeping. This measures the budget of 3.</li>
</ol>

<h2>The screens</h2>
<p>The screen mock holds fourteen states, each at 1440 by 900 in light and dark, with a notes layer that cites the framework section behind each element and names the compact-mantine component it is built with. Open <a href="${SCR}">the screen mock</a> and use the numbers down the left edge, or the Notes box.</p>
<div class="shots">
${S.map((s) => shot(s.id, `${s.n}. ${s.title}. ${s.graphName}.`)).join("\n")}
</div>

<h2>Proposed to the framework, not yet tested with users</h2>
<p>Recorded with the old text, the new text and the reason in <a href="../framework-changes.md">framework-changes.md</a>, under &quot;Find, inspect, expand, next seed&quot;.</p>
<ul>
<li>The Select neighbors menu, one design: hop and Follow rows that show their sizes, two commands each with a count, nothing emphasized, not yet measured while counting, none for an empty direction. It replaces the two earlier forms drawn on the inspector and alert-triage screens.</li>
<li>The size check names what makes a hop large (the hub) and counts one direction as well as fewer hops.</li>
<li>A Find hit outside the filter says in words which step leaves it out, on a line that wraps; the inspector of a node outside the filter says it is not drawn and not counted.</li>
<li>A filter step's record lines and undo labels carry their arguments (direction, hops, from what), and Add selection to step keeps its own name in all three places.</li>
<li>Connections in the one-node inspector: neighbors and edges, In, Out and All, over the chip's scope, naming a scope only when it differs.</li>
<li>A step made from a node's neighborhood is named after that node, and lists what made it as well as its additions.</li>
<li>After a filter change the view fits the result once; positions do not move.</li>
<li>Next finding stops at the end of the list and says so.</li>
<li>Held, awaiting study: a &quot;Create set, then delete&quot; entry on the step's menu, only if sessions show the next seed stalls.</li>
</ul>
</div>
</body>
</html>
`;
writeFileSync(join(here, "..", "..", "flows", "find-and-expand.html"), toShell(flowHtml));
console.log("wrote flows/find-and-expand.html");
