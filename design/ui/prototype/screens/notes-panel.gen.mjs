#!/usr/bin/env node
// Builds screens/notes-panel.html: the Notes panel (interface-templates.md 4) in eleven states.
// Run from design/ui/prototype/: node screens/notes-panel.gen.mjs
// Every number is from kit/fixtures.json (datasets.ppi). Node positions for the canvas marks are
// read from the drawing itself (kit/canvas/ppi-betweenness-light.svg): TP53 by its label, its 32
// neighbors as the far ends of its edges, CDK1 by its position.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toShell } from "../kit/shell.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const P = JSON.parse(readFileSync(join(here, "../kit/fixtures.json"), "utf8")).datasets.ppi;
const svg = readFileSync(join(here, "../kit/canvas/ppi-betweenness-light.svg"), "utf8");
const fmt = (n) => n.toLocaleString("en-US");
const I = (name, cls = "") => `<svg class="k-i${cls ? " " + cls : ""}"><use href="../kit/icons.svg#${name}"/></svg>`;

// ---------- facts, checked against the fixture ----------
const BT = P.encodings.betweenness;
const tp53Bt = BT.top.find((r) => r.id === "TP53").betweenness;
if (BT.top[0].id !== "MAPK1" || BT.top[1].id !== "TP53") throw new Error("betweenness order changed");
const modOf = (id) => P.topByBetweenness.find((x) => x.id === id).module;
if (BT.top.filter((r) => modOf(r.id) === "DNA repair").map((r) => r.id).join() !== "TP53") throw new Error("TP53 is no longer the only DNA repair protein in the top five");
const S = P.tp53Slice;
const nbrs = S.neighborsOf.TP53;
if (nbrs.length !== 32 || S.nodes !== 33 || S.anchor.degree !== 32) throw new Error("TP53 slice changed");
if (nbrs.some((n) => n.id === "CDK1")) throw new Error("CDK1 is now a TP53 neighbor; the filtered state is wrong");
const members = [{ id: "TP53", degree: S.anchor.degree }, ...nbrs].sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id));
const cdk1Fc = P.topByDegree.find((r) => r.id === "CDK1").log2FoldChange;
if (cdk1Fc !== Math.min(...P.topByDegree.filter((r) => r.degree >= 17).map((r) => r.log2FoldChange))) throw new Error("CDK1 is no longer the most down-regulated hub");
const dnaCount = P.attributes.find((a) => a.name === "module").values["DNA repair"];

// ---------- positions from the drawing (percent of its 1200 x 800 box) ----------
const circles = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="#/g)].map((m) => ({ x: +m[1], y: +m[2], r: +m[3] }));
const label = (id) => { const m = svg.match(new RegExp(`<text x="([\\d.]+)" y="([\\d.]+)">${id}</text>`)); return { x: +m[1], y: +m[2] }; };
const nearest = (x, y) => circles.reduce((b, c) => (Math.hypot(c.x - x, c.y - y) < Math.hypot(b.x - x, b.y - y) ? c : b));
const byLabel = (id) => { const l = label(id); return nearest(l.x - 14.6, l.y - 4.2); };
// CDK1's label is culled on the current drawing, so its node is named by position: the seeded layout
// puts it at (583.6, 211.6), read from an earlier render that labeled it; checked to be a hub here.
const tp = byLabel("TP53"), cdk = nearest(583.6, 211.6);
if (Math.hypot(cdk.x - 583.6, cdk.y - 211.6) > 0.5 || cdk.r !== tp.r) throw new Error("no hub at CDK1's position; the layout changed");
const lines = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)].map((m) => m.slice(1).map(Number));
const ends = new Map();
for (const [a, b, c, d] of lines) {
    if (a === tp.x && b === tp.y) ends.set(`${c},${d}`, [c, d]);
    else if (c === tp.x && d === tp.y) ends.set(`${a},${b}`, [a, b]);
}
if (ends.size !== 32) throw new Error("TP53 has " + ends.size + " edges on the drawing, expected 32");
const setNodes = [tp, ...[...ends.values()].map(([x, y]) => nearest(x, y))];
const pct = (n) => ({ x: +(n.x / 12).toFixed(2), y: +(n.y / 8).toFixed(2), d: +((2 * n.r) / 12).toFixed(3) });
const TP = pct(tp), CD = pct(cdk);

// Marks over the drawing, placed in percent of the stage so they stay on their nodes at any size
const marks = (nodes, cls) => nodes.map((n) => { const p = pct(n); return `<i class="${cls}" style="left:${p.x}%;top:${p.y}%;width:${p.d}%"></i>`; }).join("");
const hover33 = marks(setNodes, "rk rk-hover");
const member33 = marks(setNodes, "rk rk-member");
const marker = (p, n, { hot = false, label: l } = {}) => `<span class="nm${hot ? " nm-hot" : ""}" style="left:${p.x}%;top:${p.y}%" title="${l}">${I("sticky-note", "k-i-sm")}${n}</span>`;
const markerTP = (hot) => marker(TP, 1, { hot, label: "1 note, about TP53 neighborhood" });
// A node with a note marker is marked, so it keeps its label (canvas-drawing.md 9): CDK1's label,
// culled on the drawing by MAPK1's, is drawn here on its left, where nothing collides
const markerCD = marker(CD, 1, { label: "1 note, about CDK1" }) + `<span class="lb" style="left:${CD.x}%;top:${CD.y}%">CDK1</span>`;

// ---------- the notes ----------
// A citation names the cited run with its settings, as screens/take-a-note.html's chip does, and as
// the table's column-group header names the same run (screens/table-dock.html)
const RUN_SETTINGS = "full graph, exact, unweighted";
const N = {
    set: { glyph: "group", about: "About TP53 neighborhood, 33 proteins", by: "Adam Powers", at: "Sep 28 2026, 10:14",
        text: `TP53 is the only DNA repair protein in the top five by betweenness (${tp53Bt}, after MAPK1). Its 32 partners are the knockdown panel.`,
        cites: `Cites Betweenness (${RUN_SETTINGS})` },
    result: { glyph: "flask-conical", about: `About Betweenness (${RUN_SETTINGS})`, by: "Adam Powers", at: "Sep 28 2026, 10:09",
        text: `Unweighted. ${BT.zeros} proteins score 0, including the ${P.stats.isolated} isolated ones.` },
    node: { glyph: "circle-dot", about: "About CDK1", id: true, by: "Lin Chen", at: "Sep 27 2026, 16:42",
        text: `Most down-regulated of the ten best-connected proteins (log2 fold change ${cdk1Fc}). Check against the second replicate before it goes in the figure.` },
    layer: { chit: "#D55E00", about: "About Module color", by: "Lin Chen", at: "Sep 24 2026, 11:30",
        text: "Okabe-Ito in module order, so DNA repair stays vermilion in every figure of the paper." },
    graph: { glyph: "network", about: "About the graph Human protein interactions", by: "Adam Powers", at: "Sep 24 2026, 09:05",
        text: `${P.file}. Edge scores are combined confidence, already cut at 0.4 upstream.` },
    gone: { glyph: "group", about: `About DNA repair, ${dnaCount} proteins`, by: "Adam Powers", at: "Sep 24 2026, 11:47",
        text: "Rule set on module = DNA repair: the candidate list for the replicate screen." },
};

// One note row: the Tree row variant with a multi-line body (proposed; needs compact-mantine work)
// Author and full date and time. The author (the project's author setting as given when the note was
// written) shows only when the project holds notes by more than one author; `solo` draws the
// one-author project, where the line is the date and time alone. There is no avatar anywhere.
const when = (n, solo) => `<div class="nt-when k-num">${solo ? n.at : `${n.by}, ${n.at}`}</div>`;
const row = (n, { hover, sel, focus, menu, mark, citeMark, hit, dim, readOnly, solo } = {}) => {
    const lead = n.chit ? `<span class="nt-lead"><span class="k-chit" style="background:${n.chit}"></span></span>` : `<span class="nt-lead">${I(n.glyph, "k-i-sm")}</span>`;
    const hl = (s) => (hit ? s.replace(new RegExp(`(${hit})`, "gi"), "<mark>$1</mark>") : s);
    const trail = readOnly ? "" : `<span class="nt-trail"><span class="k-icon-btn"${menu ? ' aria-pressed="true"' : ""} title="Note menu">${I("ellipsis")}</span></span>`;
    // A mark with an explanation puts its verb on its own line after it: "Bring back ..." is long
    const markLine = (m) => m[2]
        ? `<div class="nt-mark"><span class="k-warn-glyph">!</span><span class="nt-state">${m[0]}</span></div><div class="nt-explain">${m[2]}</div><div class="nt-explain nt-verb">${m[1]}</div>`
        : `<div class="nt-mark"><span class="k-warn-glyph">!</span><span class="nt-state">${m[0]}</span>${m[1] ? `<span class="nt-verb">${m[1]}</span>` : ""}</div>`;
    return `<div class="nt-row" role="treeitem"${hover ? " data-hover" : ""}${sel ? ' aria-selected="true"' : ""}${focus ? " data-focus" : ""}${dim ? " data-dim" : ""}>
        <div class="nt-about">${lead}<span class="nt-about-t${n.id ? " k-id" : ""}">${hl(n.about)}</span>${trail}</div>
        ${when(n, solo)}
        ${mark ? markLine(mark) : ""}
        <div class="nt-body">${hl(n.text)}</div>
        ${n.cites ? `<div class="nt-cites">${hl(n.cites)}</div>` : ""}
        ${citeMark ? markLine(citeMark) : ""}
      </div>`;
};

// ---------- the frame ----------
// The shell's frame (kit/template.html): the rail in its order with Notes pressed; no avatar anywhere
const railBtn = (icon, word, on = false) => `<div class="k-rail-btn" role="button" aria-pressed="${on}"><span class="k-rail-pill">${I(icon)}</span>${word}</div>`;
const rail = `<nav class="k-rail" aria-label="Main">
    <div class="k-rail-btn" role="button" aria-label="Main menu"><span class="k-rail-pill">${I("menu")}</span></div>
    <div class="k-rail-sep"></div>
    ${railBtn("network", "Graph")}${railBtn("database", "Data")}${railBtn("flask-conical", "Results")}${railBtn("sticky-note", "Notes", true)}
    <div class="k-rail-btn k-asst-off" role="button" aria-pressed="false" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div>
  </nav>`;

const notesPanel = ({ rows = "", find = "", chip = "Full graph", viewOnly = false }) => `<aside class="k-panel" aria-label="Notes">
    <div class="k-panel-head">
      <div class="k-title-line"><span class="k-project">Human protein interactions</span>${viewOnly ? '<span class="vo">View only</span>' : ""}${I("chevron-down", "k-i-sm k-secondary")}</div>
      <a class="k-privacy">Nothing has been sent from this project</a>
      <span class="k-chip k-chip-btn" role="button" aria-expanded="false">${I("funnel", "k-i-sm")}${chip}${I("chevron-down", "k-i-sm k-caret")}</span>
    </div>
    ${find === null ? `<div class="nt-empty"><div>No notes yet.</div><div>A note can be about a selection, a set, a result or the whole graph.</div><div><span class="k-btn k-btn-secondary">${I("sticky-note", "k-i-sm")}Add note...</span></div><div class="k-secondary">Notes are saved in the project and travel in project files and findings reports.</div></div>` : `<div class="k-search"><span class="k-field"${find ? " data-focus" : " data-placeholder"}>${I("search", "k-i-sm")}${find ? `<span>${find}</span><span class="nt-caret"></span><span class="k-grow"></span>${I("x", "k-i-sm k-secondary")}` : "Find in notes"}</span></div>`}
    <div class="k-scroll" role="tree" aria-label="Notes, newest first">
      ${rows}
    </div>
  </aside>`;

const toolbar = (viewOnly) => `<div class="k-toolbar" role="toolbar">
        <span class="k-tool" aria-pressed="true">${I("mouse-pointer-2", "k-i-lg")}</span><span class="k-tool-caret">${I("chevron-down", "k-i-sm")}</span>
        ${viewOnly ? "" : `<span class="k-tool">${I("route", "k-i-lg")}</span>`}
        <span class="k-toolbar-sep"></span><span class="k-tool">${I("zap", "k-i-lg")}</span>
        <span class="k-toolbar-sep"></span><span class="k-tool">${I("square", "k-i-lg")}</span><span class="k-tool-caret">${I("chevron-down", "k-i-sm")}</span>
      </div>`;

// The Betweenness color legend, as screens/styles-list.html draws it
const legendBt = `<div class="k-legend-card" style="width:236px"><div class="k-lg-title">Betweenness color <span class="k-secondary">betweenness</span></div>
          <span class="k-ramp k-ramp-wide k-ramp-measure" style="margin-top:4px"></span>
          <div class="ticks"><span style="left:0">0</span>${BT.ticks.map((t) => `<span class="mid" style="left:${(t.at * 100).toFixed(1)}%">${t.value}</span>`).join("")}</div>
          <div class="k-secondary">Log scale over x / ${BT.c.toFixed(6)}; the ${BT.zeros} proteins at 0 take the lightest color.</div><div class="lg-gap"></div><div class="k-lg-title">Hub labels</div>
          <div class="k-lg-row"><span class="textchip">Aa</span>Labels on ${BT.hubLabels.rule}<span class="k-value">${BT.hubLabels.count}</span></div><div class="lg-gap"></div><div class="k-lg-title">Size: degree <span class="k-secondary">degree</span></div>
          <div class="size-marks"><div><b style="width:6px;height:6px"></b>0 to 1</div><div><b style="width:9px;height:9px"></b>2 to 3</div><div><b style="width:12px;height:12px"></b>4 to 7</div><div><b style="width:16px;height:16px"></b>8 to 16</div><div><b style="width:21px;height:21px"></b>17 to 34</div></div></div>`;

// The filtered drawing without its TP53 selection ring, so the canvas agrees with a nothing-selected inspector
for (const theme of ["light", "dark"]) {
    const src = readFileSync(join(here, `../kit/canvas/ppi-tp53-${theme}.svg`), "utf8");
    const out = src.replace(/<circle [^>]*fill="none"[^>]*stroke-width="2"\/>/g, "").replace(", TP53 selected", ", nothing selected");
    if (out.length === src.length) throw new Error("no selection ring found in ppi-tp53-" + theme);
    writeFileSync(join(here, `img/notes-ppi-tp53-${theme}.svg`), out);
}

const canvas = ({ drawing = "ppi-betweenness", dir = "../kit/canvas/", alt, stage = "", over = "", legend = legendBt, viewOnly = false }) => `<main class="k-main">
    <div class="k-canvas">
      <div class="k-stage">
        <img class="k-light-only" src="${dir}${drawing}-light.svg" alt="${alt}">
        <img class="k-dark-only" src="${dir}${drawing}-dark.svg" alt="${alt}">
        ${stage}
      </div>
      ${over}
      ${legend}
      <div class="k-toolbar-dock">${toolbar(viewOnly)}</div>
      <span class="k-help">${I("circle-help")}</span>
    </div>
  </main>`;

// One header row: zoom at the right; no Export button, no avatar
const rightHead = `<div class="k-header1"><span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">100%${I("chevron-down", "k-i-sm")}</span></div>`;

// The inspector's Notes section: always there, header and "+" (none while View only); rows under it
const inspNote = (n, sel, solo) => `<div class="nt-irow"${sel ? ' aria-selected="true"' : ""}><div class="nt-body">${n.text}</div>${when(n, solo)}</div>`;
const notesSection = (rows, viewOnly) => `<section class="k-section"${rows.length ? "" : " data-empty"}><div class="k-section-head">Notes${rows.length ? ` <span class="k-count k-num">${rows.length}</span>` : ""}<span class="k-grow"></span>${viewOnly ? "" : `<span class="k-icon-btn" title="Add note...">${I("plus")}</span>`}</div>
        ${rows.join("\n        ")}
      </section>`;
// The graph's Style stack (as screens/frame-at-rest.html), top layer first; the stack the drawing shows
const SIZE_CHIP = '<svg class="k-sizechip" viewBox="0 0 16 12"><circle cx="3" cy="8" r="2" fill="#808080"/><circle cx="10" cy="6" r="5" fill="#808080"/></svg>';
const STACKS = {
    betweenness: [`${SIZE_CHIP}<span class="k-ellipsis">Size: degree</span>`, `<span class="textchip">Aa</span><span class="k-ellipsis">Hub labels</span>`,
        `<span class="k-ramp k-ramp-measure" style="width:16px"></span><span class="k-ellipsis">Betweenness color</span>`],
    module: [`<span class="k-stack"><span class="k-chit" style="background:#009E73"></span><span class="k-chit" style="background:#56B4E9"></span><span class="k-chit" style="background:#D55E00"></span></span><span class="k-ellipsis">Module color</span>`],
    plain: [],
};
const stackSection = (stack, viewOnly) => `<section class="k-section"><div class="k-section-head">Style stack<span class="k-grow"></span>${viewOnly ? "" : `<span class="k-icon-btn" title="Add style layer">${I("plus")}</span>`}</div>
        <ul class="k-list">${[...STACKS[stack], '<span class="k-chit" style="background:#808080"></span><span class="k-ellipsis">Base style</span>'].map((r) => `<li class="k-item">${r}</li>`).join("")}</ul>
      </section>`;

// Nothing selected: the graph (interface-specification.md 4.1, Nothing), as screens/frame-at-rest.html
const graphInspector = ({ notes = [], viewOnly = false, filtered = false, stack = "betweenness" } = {}) => `<aside class="k-right" aria-label="Inspector">
    ${rightHead}
    <div class="k-scroll">
      <section class="k-section">
        <div class="k-section-head">Graph<span class="k-grow"></span><span class="k-icon-btn" title="Look: Default">${I("palette")}</span></div>
        <div class="k-fieldrow"><span class="k-legend">Background</span>
          <div class="k-fields"><span class="k-field k-span"><span class="bgsw"></span>Theme</span></div></div>
        <div class="k-fieldrow"><span class="k-legend">Layout</span>
          <div class="k-fields"><span class="k-field k-span">Force-directed${I("chevron-down", "k-i-sm k-caret")}</span>${viewOnly ? "" : `<span class="k-icon-btn" title="Run layout">${I("play")}</span>`}</div></div>
      </section>
      <section class="k-section">
        <div class="k-section-head">Statistics</div>
        <div class="k-row"><span class="k-grow" style="white-space:nowrap">Overview: General</span>${viewOnly ? "" : '<span class="k-btn k-btn-ghost" style="padding-inline:4px">Change overview...</span>'}</div>
        <div class="sr"><span class="n">Nodes</span><span class="v">${filtered ? S.nodes : P.nodes}</span></div>
        <div class="sr"><span class="n">Edges</span><span class="v">${fmt(filtered ? S.edges : P.edges)}</span><span class="sub">undirected; <span class="k-id">confidence</span>, not used yet</span></div>
        ${filtered ? "" : `<div class="sr"><span class="n">Density</span>${I("info", "ii")}<span class="v">${P.stats.density}</span></div>
        <div class="sr"><span class="n">Connected components</span>${I("info", "ii")}<span class="v">${P.stats.components} (${P.stats.isolated} isolates)</span></div>`}
        <div class="k-row"><span class="k-grow">Attributes</span><span class="rt">${P.attributes.filter((a) => !a.name.includes("(edge)")).length}</span></div>
      </section>
      ${stackSection(stack, viewOnly)}
      ${notesSection(notes, viewOnly)}
    </div>
  </aside>`;

// The TP53 neighborhood selected (interface-specification.md 4.1, Set)
const setInspector = ({ notes }) => `<aside class="k-right" aria-label="Inspector">
    ${rightHead}
    <div class="k-typerow">${I("group")}<span class="k-grow tr2"><span class="k-name">TP53 neighborhood</span><span class="k-secondary">Frozen set</span></span>
      <span class="k-icon-btn">${I("users")}</span><span class="k-icon-btn">${I("funnel")}</span><span class="k-icon-btn">${I("plus")}</span><span class="k-icon-btn">${I("ellipsis")}</span></div>
    <div class="k-scroll">
      <section class="k-section">
        <div class="k-row"><span class="k-secondary" style="width:88px">Created from</span><span class="k-grow">Neighbors of <span class="k-id">TP53</span></span></div>
      </section>
      <section class="k-section"><div class="k-section-head">Statistics</div>
        <div class="k-metrics"><div class="k-metric"><span class="k-secondary">proteins</span><span class="k-big">${S.nodes}</span></div><div class="k-metric"><span class="k-secondary">interactions</span><span class="k-big">${S.edges}</span></div></div>
      </section>
      <section class="k-section"><div class="k-section-head">Members <span class="k-count k-num">${S.nodes}</span></div>
        ${members.slice(0, 5).map((m) => `<div class="k-data"><span class="k-name k-id" style="color:var(--cm-text)">${m.id}</span><span class="k-value">degree ${m.degree}</span></div>`).join("\n        ")}
        <div class="k-row k-secondary">${S.nodes - 5} more</div>
      </section>
      ${notesSection(notes)}
    </div>
  </aside>`;

// The Note editor, reading the chosen note beside its targets (take-a-note.html's PopoutPanel)
const editor = `<div class="k-popover ne" style="left:618px;top:118px">
        <div class="k-popover-head">Note<span class="k-grow"></span><span class="k-icon-btn">${I("ellipsis")}</span><span class="k-icon-btn">${I("x")}</span></div>
        <div class="ne-body">
          <div class="ne-about">${I("group", "k-i-sm")}<span>About TP53 neighborhood, 33 proteins</span></div>
          <div class="k-secondary">Adam Powers, Sep 28 2026, 10:14</div>
          <div class="nt-read">${N.set.text}</div>
          <div class="nt-line"><span class="k-caption">Cites</span><span class="k-pill nt-cite">${I("flask-conical", "k-i-sm")}<span><span class="k-strong">Betweenness</span><br><span class="k-secondary">${RUN_SETTINGS}</span></span></span></div>
          <div class="nt-line"><span class="k-caption">Quotes</span><span class="k-pill"><span class="k-id">TP53</span>&nbsp;betweenness ${tp53Bt}</span></div>
        </div>
      </div>`;

const rowMenu = (top) => `<div class="k-menu" style="left:268px;top:${top}px;width:180px" role="menu">
  <div class="k-menu-item" data-hover><span class="k-check-col"></span>Edit note</div>
  <div class="k-menu-item"><span class="k-check-col"></span>Delete note<span class="k-shortcut">Delete</span></div>
</div>`;

// ---------- states ----------
const states = [];
const state = (id, label, app, overlay, notes) => states.push({ id, label, html: `<section class="sv" id="${id}"><i class="aon" id="${id}a"></i>
<div class="k-app">
  ${rail}
  ${app}
</div>
${overlay}
<div class="an">
${notes}
</div>
</section>` });

const allRows = (o = {}) => [
    row(N.set, o.set), row(N.result, o.result), row(N.node, o.node), row(N.layer, o.layer), row(N.graph, o.graph),
].join("\n      ");
const graphNote = inspNote(N.graph);
const bothMarkers = (hot) => markerTP(hot) + markerCD;
const altAll = "300 proteins colored by betweenness, the 12 hubs labeled; note markers at TP53 and CDK1";
const NEEDS = '<span class="k-annot-tag needs">Needs graphty-element work</span>';
const NEEDS_CM = '<span class="k-annot-tag needs">Needs compact-mantine work</span>';

// 1. Empty
state("s1", "1 Empty", `${notesPanel({ find: null })}
  ${canvas({ drawing: "ppi-plain", alt: "300 human proteins and 1,262 interactions, first render, nothing styled", legend: "" })}
  ${graphInspector({ stack: "plain" })}`, "",
`  <span class="k-annot-box" style="left:58px;top:90px;width:240px;height:806px"></span>
  <div class="k-annot-note" style="left:312px;top:60px;max-width:320px"><b>Empty panel:</b> three sentences, one button, no Find. "No notes yet." says the panel is not loading or broken; "A note can be about a selection, a set, a result or the whole graph." says what a note can be attached to, without implying that something is selected; <b>Add note...</b> opens the Note editor beside the selection, or, with nothing selected, asks first what the note is about (state 10). It is the one command the empty-surface rule allows; there is no Note tool in the toolbar. The third sentence says where notes live and that they leave with the project and its findings reports. Find appears with the first note. Text on the empty surface departs from content-design.md 4 (Empty surface); proposed in framework-changes.md, "Notes panel: the empty panel says what a note is for". <b>Text</b> and a secondary <b>Button</b> in the panel body.</div>
  <div class="k-annot-note" style="left:312px;top:392px;max-width:320px"><b>Where notes are made</b> (output-homes.md 3.7, Add note): this button, an object's overflow, the graph's type-row menu, Selection in the main menu, and the "+" of a Notes section. All of them open the same Note editor (framework-changes.md, "Take a note: a note is written in the Note editor").</div>
  <div class="k-annot-note" style="left:312px;top:520px;max-width:320px"><b>Why the sentences.</b> In the user study, all three readers given "You want to remember why TP53 matters for next week's meeting. Record that in graphty." read the blank panel as loading or broken and did not know where the first note goes, or whether notes are saved or exported. The next round measures first click and time on this panel again.</div>
  <span class="k-annot-box" style="left:1199px;top:534px;width:241px;height:34px"></span>
  <div class="k-annot-note" style="left:930px;top:560px;max-width:260px"><b>Notes, empty:</b> its header and "+", nothing under it, after the Style stack. state-matrix.md 4.9. The specification hides it until a note exists (interface-specification.md 3); that conflict is resolved in framework-changes.md ("The inspector's Notes section is always there"). <b>ControlSection</b>.<br>${NEEDS}</div>
  <div class="k-annot-note" style="left:930px;top:100px;max-width:260px"><b>Nothing selected:</b> the graph's own inspector, copied from the main frame at rest. interface-specification.md 4.1, Nothing.</div>
  <div class="k-annot-note" style="left:900px;top:770px;max-width:250px"><b>No Note tool.</b> The toolbar holds Select and Path only; a note starts from Add note... interface-templates.md 14. <b>ToolButton</b> in <b>ToolGroup</b>.</div>`);

// 2. With notes, first row hovered: the linked hover on the canvas
state("s2", "2 Hover", `${notesPanel({ rows: allRows({ set: { hover: true } }) })}
  ${canvas({ alt: altAll + "; the 33 proteins of TP53 neighborhood carry the hover hairline", stage: hover33 + bothMarkers(true) })}
  ${graphInspector({ notes: [graphNote] })}`, `<span class="k-cursor" style="left:268px;top:160px"></span>`,
`  <span class="k-annot-box" style="left:58px;top:124px;width:240px;height:143px"></span>
  <div class="k-annot-note" style="left:312px;top:40px;max-width:330px"><b>A note row</b> (proposed anatomy, framework-changes.md, "Notes panel: what a note's row shows"): one leading glyph, the kind of what the note is about; "About {targets}"; under it, the author and the full date and time, "Adam Powers, Sep 28 2026, 10:14", recorded automatically from the project's author setting. The name shows only because this project holds notes by two people; with one author the line is the date and time alone (state 11). No avatar: the app has no accounts. Then the text, three lines, and the citation. The row is a <b>Tree</b> row with a multi-line body, which compact-mantine's Tree does not have yet.<br>${NEEDS_CM}</div>
  <div class="k-annot-note" style="left:700px;top:40px;max-width:300px"><b>The citation carries the run's settings:</b> "Cites Betweenness (full graph, exact, unweighted)", the same words as that run's column header in the table, so a reader can tell which Betweenness the note relied on without opening anything. In the fourth study a note citing only "PageRank, full graph" left readers unable to say which damping, weight or direction it meant. The line wraps rather than cutting the settings off.</div>
  <div class="k-annot-note" style="left:312px;top:296px;max-width:330px"><b>Hovered:</b> the row's background, and its overflow at the end of the About line (Edit note, Delete note; state 4); the date line under it is never covered. On the canvas, the linked hover: each of the 33 proteins carries the ring-5 hairline and the note's marker turns solid, so the reader sees where the note points before clicking. canvas-drawing.md 6 (ring 5, "hover, linked hover").<br>${NEEDS}</div>
  <div class="k-annot-note" style="left:312px;top:470px;max-width:330px"><b>Rows about a definition</b> -- a run, a style layer, the graph -- light nothing on the canvas, because they have no place there. When the note is about a run and cites the same run, the row folds the two into its About line, which keeps the run's settings ("About Betweenness (full graph, exact, unweighted)").</div>
  <div class="k-annot-note" style="left:700px;top:520px;max-width:250px"><b>Note markers</b> in note ink, never a data color, one per note target: at CDK1, and for the 33-protein set at its anchor member, the member with the most edges inside the set (here TP53, joined to all 32). Proposed (framework-changes.md, "Where a set's note marker sits"). canvas-drawing.md 6 and 12.<br>${NEEDS}</div>
  <div class="k-annot-note" style="left:930px;top:640px;max-width:250px"><b>The graph's own note</b> in the nothing-selected inspector's Notes section. output-homes.md 3 ("the graph's own notes"). <b>Tree</b> row in a <b>ControlSection</b>.</div>
  <div class="k-annot-note" style="left:700px;top:240px;max-width:300px"><b>Keyboard:</b> Tab goes Find, then the list (one tab stop; arrows move between rows), then the focused row's overflow. Enter on a row does what a click does. interface-templates.md 4 ("Tab order: field; list"); interaction-pattern-entries.md 9.</div>`);

// 3. Row chosen: targets selected, brought into view, the note opens beside them
state("s3", "3 Chosen", `${notesPanel({ rows: allRows({ set: { sel: true } }) })}
  ${canvas({ alt: "300 proteins colored by betweenness; the 33 proteins of TP53 neighborhood selected, each with the member ring; the note open to the right", stage: member33 + bothMarkers(true), over: editor })}
  ${setInspector({ notes: [inspNote(N.set, true)] })}`, "",
`  <div class="k-annot-note" style="left:312px;top:40px;max-width:290px"><b>A click on the row</b> selects the note's targets and brings them into view: the set is the selection, the inspector shows it, and its Notes section shows this note, highlighted. output-homes.md 4 ("selecting a note selects its targets"). Selecting is not an undo step.</div>
  <div class="k-annot-note" style="left:312px;top:176px;max-width:290px"><b>The note opens beside its targets</b> in the Note editor, clear of them, with the full text, its citation and its quoted value. The citation chip names the run and, under it, its settings; a click on it opens that run's details. interaction-patterns.md 2, note [c]. <b>PopoutPanel</b>.</div>
  <div class="k-annot-note" style="left:312px;top:600px;max-width:290px"><b>The 33 proteins carry the member ring,</b> the precedence rule's form when no hull is drawn: a hull around members spread over half the canvas would cross most of the graph. canvas-drawing.md 6, Precedence.<br>${NEEDS}</div>
  <div class="k-annot-note" style="left:930px;top:640px;max-width:250px"><b>Set inspector:</b> Created from, Statistics, Members (five by degree, then the rest), Notes. interface-specification.md 4.1, Set.</div>
  <div class="k-annot-note" style="left:930px;top:380px;max-width:250px"><b>Other rows go elsewhere:</b> a run's note opens that run's editor at its Notes row; a style layer's, the layer's editor; the graph's, nothing selected. output-homes.md 4.</div>`);

// 4. Row menu
state("s4", "4 Row menu", `${notesPanel({ rows: allRows({ set: { hover: true, menu: true } }) })}
  ${canvas({ alt: altAll + "; the 33 proteins of TP53 neighborhood carry the hover hairline", stage: hover33 + bothMarkers(true) })}
  ${graphInspector({ notes: [graphNote] })}`, rowMenu(152) + `<span class="k-cursor" style="left:392px;top:176px"></span>`,
`  <div class="k-annot-note" style="left:470px;top:120px;max-width:300px"><b>The row's overflow</b> holds the note's two verbs, as Figma's comment row offers Edit and Delete: <b>Edit note</b> opens the note in the Note editor with its text focused; <b>Delete note</b> (also the Delete key on a focused row) removes it as one undo step, "Delete note", with no confirmation. Proposed (framework-changes.md, "Notes panel: a row's overflow holds Edit note and Delete note"). <b>ActionIcon</b> opening a <b>Menu</b>.<br>${NEEDS}</div>`);

// 5. Find with a query
const findRows = [row(N.set, { hit: "Betweenness" }), row(N.result, { hit: "Betweenness" })].join("\n      ");
state("s5", "5 Find", `${notesPanel({ find: "Betweenness", rows: findRows })}
  ${canvas({ alt: altAll, stage: bothMarkers(false) })}
  ${graphInspector({ notes: [graphNote] })}`, "",
`  <span class="k-annot-box" style="left:58px;top:90px;width:240px;height:30px"></span>
  <div class="k-annot-note" style="left:312px;top:60px;max-width:320px"><b>Find</b> matches a note's text, the names of what it is about and the runs it cites, so "Betweenness" finds the note about the run and the note that cites it. The list narrows in place, newest first; matches are marked. interface-templates.md 4. <b>SearchInput</b>.</div>
  <div class="k-annot-note" style="left:312px;top:210px;max-width:320px"><b>No kind filter.</b> Typing a run's, a set's or a protein's name already narrows the list by what notes are about, at the few dozen notes a project holds. A separate filter by kind is withdrawn until a study session shows readers failing to find notes by kind at 50 or more (framework-changes.md, "Notes panel: the target filter's choices").</div>`);

// 6. Find, no hits
state("s6", "6 No hits", `${notesPanel({ find: "MDM2", rows: "" })}
  ${canvas({ alt: altAll, stage: bothMarkers(false) })}
  ${graphInspector({ notes: [graphNote] })}`, "",
`  <span class="k-annot-box" style="left:58px;top:124px;width:240px;height:772px"></span>
  <div class="k-annot-note" style="left:312px;top:130px;max-width:320px"><b>No hits:</b> the list is blank. No sentence, no "No results": the query in the field is the explanation, and its x clears it. content-design.md 4 (Empty surface); interaction-pattern-entries.md 6.8.</div>`);

// 7. After Betweenness was re-run, and a set was deleted
const staleRows = [
    row(N.set, { citeMark: ["Earlier run", "Add current value"] }),
    row(N.result, { mark: ["Earlier run", "Add current value"] }),
    row(N.node), row(N.layer), row(N.graph),
    row(N.gone, { mark: ["Detached", `Bring back DNA repair (${dnaCount} proteins, as kept Sep 24)`, "The set this note pointed to was changed."] }),
].join("\n      ");
state("s7", "7 Out of date", `${notesPanel({ rows: staleRows })}
  ${canvas({ alt: altAll, stage: bothMarkers(false) })}
  ${graphInspector({ notes: [graphNote] })}`, "",
`  <div class="k-annot-note" style="left:312px;top:40px;max-width:330px"><b>Betweenness was re-run</b> with confidence as the weight, so the run both notes relied on is no longer current. Both citations still read "unweighted", so the reader sees at once that the current run (weighted by confidence) is not the one relied on. The first note's Cites line carries the mark; the second note is about that same run, so the mark sits under its folded About line. The mark is the glossary's "Earlier run" (glossary.md 10); its one verb is Add current value, which adds the current run's citation beside the earlier one and keeps the earlier run and the value it quoted, as one undo step, "Edit note". It never rewrites what the note relied on (framework-changes.md, "Renamed strings on published keys"). (The canvas still shows the unweighted drawing; the kit has no weighted one.)<br>${NEEDS}</div>
  <div class="k-annot-note" style="left:700px;top:40px;max-width:300px"><b>The quoted value</b> (TP53 betweenness ${tp53Bt}) is not on the row; the Note editor marks it "now {value}" when the live value differs (screens/take-a-note.html, state 8). The row's text stays as written: a note is evidence and is never rewritten.</div>
  <span class="k-annot-box" style="left:58px;top:710px;width:240px;height:172px"></span>
  <div class="k-annot-note" style="left:312px;top:410px;max-width:330px"><b>A deleted target keeps its note.</b> The set "DNA repair" was deleted; its note is marked "Detached", the line under it says what happened, "The set this note pointed to was changed.", and the verb says exactly what it brings back: "Bring back DNA repair (${dnaCount} proteins, as kept Sep 24)", the members as they were when the note was written. The note still says what it was about. conceptual-model.md 6; glossary.md 10; framework-changes.md, "Notes panel: Detached says what happened, and every time gives its full date". When a row has several marks it shows the most urgent one; a mark sits under the line it qualifies.<br>${NEEDS}</div>`);

// 8. Graph filtered to TP53 and its neighbors: every note still listed, CDK1's marked
const filtRows = [
    row(N.set), row(N.result), row(N.node, { mark: ["filtered out, Neighbors of TP53"], dim: true }), row(N.layer), row(N.graph),
].join("\n      ");
const tpSlice = S.anchors.TP53;
state("s8", "8 Filtered", `${notesPanel({ rows: filtRows, chip: `Filtered: ${S.nodes} of ${P.nodes} nodes` })}
  ${canvas({ drawing: "notes-ppi-tp53", dir: "img/", alt: "The protein graph filtered to TP53 and its 32 neighbors, colored by module; a note marker at TP53", legend: "",
      stage: marker({ x: tpSlice.x, y: tpSlice.y }, 1, { label: "1 note, about TP53 neighborhood" }) })}
  ${graphInspector({ notes: [graphNote], filtered: true, stack: "module" })}`, "",
`  <span class="k-annot-box" style="left:58px;top:54px;width:240px;height:30px"></span>
  <div class="k-annot-note" style="left:312px;top:40px;max-width:330px"><b>The filter chip scopes the graph, not the list.</b> Every note stays listed whatever the filter; a note whose element targets the filter leaves out entirely carries the glossary's mark "filtered out", naming the step, and reads in secondary ink. Its click opens the note; its marker is not drawn. Proposed (framework-changes.md, "Notes panel: the filter chip does not hide notes").</div>
  <div class="k-annot-note" style="left:312px;top:220px;max-width:330px">Notes about definitions (a run, a style layer, the graph) are never filtered out. A set partly left out keeps no mark: here all 33 are kept.</div>
  <div class="k-annot-note" style="left:930px;top:520px;max-width:250px">The inspector's Statistics read the filtered graph, ${S.nodes} proteins and ${S.edges} interactions, as every number on screen does under the chip (interface-templates.md 7). Its other readings are left out of this mock.</div>`);

// 9. View only
state("s9", "9 View only", `${notesPanel({ rows: allRows({ set: { hover: true, readOnly: true }, result: { readOnly: true }, node: { readOnly: true }, layer: { readOnly: true }, graph: { readOnly: true } }), viewOnly: true })}
  ${canvas({ alt: altAll + "; the 33 proteins of TP53 neighborhood carry the hover hairline", stage: hover33 + bothMarkers(true), viewOnly: true })}
  ${graphInspector({ notes: [graphNote], viewOnly: true })}`, "",
`  <div class="k-annot-note" style="left:312px;top:40px;max-width:330px"><b>View only</b> (an earlier data version, or a shared read-only project): the chip beside the name, and no edit affordances. Gone, not disabled: the Path tool from the toolbar, the "+" of the Style stack and Notes sections, Run layout and the Overview's Replace, and the row's overflow with Edit note and Delete note. Rows still open their notes and select their targets. state-matrix.md, Notes panel, Read-only; framework-changes.md, "the canvas shows the project without editing tools".</div>`);

// 10. Add note... with nothing selected: the Note editor opens asking what the note is about
const aboutEditor = `<div class="k-popover ne" style="left:617px;top:56px">
        <div class="k-popover-head">New note<span class="k-grow"></span><span class="k-icon-btn">${I("x")}</span></div>
        <div class="ne-body">
          <div class="nt-line"><span class="k-caption">About:</span><span class="k-field k-grow" data-focus>${I("network", "k-i-sm")}the graph Human protein interactions<span class="k-grow"></span>${I("chevron-down", "k-i-sm k-caret")}</span></div>
          <div class="k-field ne-text" data-placeholder>Write a note</div>
        </div>
      </div>
      <div class="k-menu" style="left:625px;top:150px;width:272px" role="listbox" aria-label="About">
        <div class="k-menu-item" data-hover><span class="k-check-col">${I("check", "k-i-sm")}</span>${I("network", "k-i-sm")}The graph</div>
        <div class="k-menu-sep"></div>
        <div class="k-menu-label">Kept sets</div>
        <div class="k-menu-item"><span class="k-check-col"></span>${I("group", "k-i-sm")}TP53 neighborhood<span class="k-shortcut">33 proteins</span></div>
        <div class="k-menu-item"><span class="k-check-col"></span>${I("group", "k-i-sm")}DNA repair<span class="k-shortcut">${dnaCount} proteins</span></div>
        <div class="k-menu-sep"></div>
        <div class="k-menu-item"><span class="k-check-col"></span>${I("mouse-pointer-2", "k-i-sm")}Select something first</div>
      </div>`;
state("s10", "10 About first", `${notesPanel({ find: null })}
  ${canvas({ drawing: "ppi-plain", alt: "300 human proteins and 1,262 interactions, nothing selected; a new note asks what it is about", legend: "", over: aboutEditor })}
  ${graphInspector({ stack: "plain" })}`, "",
`  <div class="k-annot-note" style="left:312px;top:60px;max-width:330px"><b>Add note... with nothing selected</b> opens the Note editor at the canvas's top right with focus on <b>About:</b> and its list open, before a word is typed: the whole graph, each kept set with its member count, and <b>Select something first</b>, which closes the editor and leaves the canvas to pick from. Arrow keys and Enter choose; Tab moves on to the text with the graph kept. A note meant for a set therefore cannot land on the whole graph unseen. <b>Popover</b> with a <b>Select</b> (its dropdown grouped: the graph, Kept sets, the escape).<br>${NEEDS}</div>
  <div class="k-annot-note" style="left:312px;top:300px;max-width:330px"><b>The next Add note... keeps the same subject.</b> After a note about TP53 neighborhood is added, the next Add note... with nothing selected opens with About: already reading TP53 neighborhood, focus still on it, so a run of notes about one set costs one choice. A selection always wins over the remembered subject. Proposed in framework-changes.md, "Notes: Add a note with nothing selected asks what the note is about".</div>
  <div class="k-annot-note" style="left:312px;top:470px;max-width:330px"><b>Why.</b> In the third study the empty panel's button, read with nothing selected, wrote a note about the whole graph for 1 of 2 first-click participants, and another pinned his reason to one member when he meant the kept set. "Kept sets" uses the same word as the rest of the app: a set is kept, and a frozen set is one kind of kept set.</div>`);

// 11. A project whose notes all have one author: no name on any row
const soloRows = [row(N.set, { solo: true }), row(N.result, { solo: true }), row({ ...N.node, by: "Adam Powers" }, { solo: true }), row({ ...N.layer, by: "Adam Powers" }, { solo: true }), row(N.graph, { solo: true })].join("\n      ");
state("s11", "11 One author", `${notesPanel({ rows: soloRows })}
  ${canvas({ alt: altAll, stage: bothMarkers(false) })}
  ${graphInspector({ notes: [inspNote(N.graph, false, true)] })}`, "",
`  <span class="k-annot-box" style="left:58px;top:112px;width:240px;height:560px"></span>
  <div class="k-annot-note" style="left:312px;top:60px;max-width:330px"><b>One author: no names.</b> The same notes in a project where every note was written under the same author setting. Each row's second line is the date and time alone, "Sep 28 2026, 10:14", and so is the inspector's. The name appears on every row as soon as a note by a second author arrives, for example when a colleague's project file is merged or a shared project is edited under another author setting. A note written with no author setting counts as a blank author, so a project with only blank authors shows no names either.</div>
  <div class="k-annot-note" style="left:312px;top:330px;max-width:330px"><b>Where the name is always seen:</b> the Note editor says "Saving as: {author}. Change..." while a note is written (screens/take-a-note.html), so the writer can check the setting without every row repeating one name. Owner decision, 2026-09-28 (owner-feedback.md): each note records its author and time from the project's author setting as given, and the author is shown only when a project holds more than one.</div>`);

// ---------- the page ----------
const sw = states.map((s) => `<a href="#${s.id}">${s.label}</a>`).join("");
const swOn = states.map((s) => `  body:has(#${s.id}:target, #${s.id}a:target) .sw a[href="#${s.id}"]`).join(",\n");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Notes panel</title>
<!-- Built by screens/notes-panel.gen.mjs from kit/fixtures.json and the protein drawing; edit the script, then run it. -->
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>
  /* States: one full app per state; the address fragment (#s1 to #s${states.length}) picks one, #s1 by default.
     #s1a to #s${states.length}a show the same state with the owner notes on. No script. */
  body { overflow: hidden; }
  .sv { display: none; position: relative; width: 100vw; height: 100vh; }
  .sv:target, .sv:has(:target) { display: block; }
  body:not(:has(:target)) .sv:first-of-type { display: block; }
  .sv > .k-app { position: absolute; inset: 0; }

  /* The state switcher and the owner-notes toggle: annotation ink, not product UI */
  .sw { position: fixed; z-index: 200; top: 8px; left: 748px; transform: translateX(-50%); display: flex; align-items: center; gap: 1px;
        padding: 3px; border-radius: 14px; background: var(--k-annot-bg); box-shadow: 0 0 0 1px var(--k-annot); font-size: 11px; white-space: nowrap; }
  .sw a { padding: 2px 6px; border-radius: 11px; color: var(--cm-text); text-decoration: none; }
  .sw label { display: inline-flex; align-items: center; gap: 4px; padding: 0 8px 0 6px; color: var(--k-annot-ink); font-weight: 600; }
  .sw input { margin: 0; accent-color: var(--k-annot); }
  body:not(:has(:target)) .sw a[href="#s1"],
${swOn} { background: var(--k-annot); color: #fff; font-weight: 600; }

  .an { display: none; }
  body:has(#owner:checked) .an, .sv:has(.aon:target) .an { display: block; }
  .k-annot-note b { color: var(--k-annot-ink); }
  .needs { margin-top: 3px; }

  /* A note row: the leading slot holds the kind glyph of what the note is about; the lines under it
     indent to the text column */
  .nt-row { position: relative; padding: 6px 8px 8px 16px; }
  .nt-row[data-hover], .nt-row[data-focus] { background: var(--cm-bg-hover, var(--cm-bg-secondary)); }
  .nt-row[aria-selected="true"] { background: var(--cm-bg-selected); }
  .nt-row[data-focus] { outline: 2px solid var(--cm-border-selected); outline-offset: -2px; }
  .nt-row[data-dim] .nt-body, .nt-row[data-dim] .nt-about-t { color: var(--cm-text-secondary); }
  .nt-about { display: flex; align-items: flex-start; gap: 6px; min-height: 18px; line-height: 16px; }
  .nt-lead { display: grid; place-items: center; width: 16px; height: 16px; flex: none; color: var(--cm-icon, var(--cm-text-secondary)); }
  .nt-lead .k-chit { width: 10px; height: 10px; }
  .nt-about-t { flex: 1 1 auto; min-width: 0; font-weight: 550; }
  .nt-when { margin: 0 0 0 22px; line-height: 16px; color: var(--cm-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nt-irow .nt-when { margin: 0; }
  .nt-trail { display: none; flex: none; margin: -3px -4px -3px 0; }
  .nt-row[data-hover] .nt-trail, .nt-row[data-focus] .nt-trail { display: block; }
  .nt-body { margin: 2px 0 0 22px; line-height: 16px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .nt-cites { margin: 2px 0 0 22px; line-height: 16px; color: var(--cm-text-secondary); }
  .nt-mark { display: flex; align-items: center; gap: 6px; margin: 2px 0 0 22px; line-height: 16px; }
  .nt-state { color: var(--cm-text); font-weight: 550; }
  .nt-verb { color: var(--cm-text-brand); }
  .nt-row mark { background: var(--cm-bg-selected); color: inherit; border-radius: 2px; }
  .nt-explain { margin: 0 0 0 22px; line-height: 16px; color: var(--cm-text-secondary); }
  .nt-explain.nt-verb { color: var(--cm-text-brand); }
  .nt-empty .k-btn { margin: 4px 0; }
  .nt-empty { padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; line-height: 16px; }
  .nt-caret { display: inline-block; width: 1px; height: 13px; margin-left: 1px; background: var(--cm-text); vertical-align: -2px; }
  /* The inspector's note rows: time, then the text clamped to two lines */
  .nt-irow { padding: 4px 8px 6px 16px; line-height: 16px; }
  .nt-irow[aria-selected="true"] { background: var(--cm-bg-selected); }
  .nt-irow .nt-body { margin: 0; -webkit-line-clamp: 2; }
  .vo { display: inline-flex; align-items: center; height: 18px; padding: 0 6px; margin-left: 4px; border-radius: 9px; background: var(--cm-bg-secondary); color: var(--cm-text); font-size: 11px; font-weight: 500; white-space: nowrap; flex: none; }
  .k-panel-head .k-project { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .k-panel-head .k-title-line > svg { flex: none; }
  .tr2 .k-name { overflow: hidden; text-overflow: ellipsis; }
  .tr2 { display: flex; flex-direction: column; line-height: 16px; min-width: 0; white-space: nowrap; }

  /* The Note editor (as screens/take-a-note.html) */
  .ne { width: 272px; }
  .ne-body { padding: 8px 12px 12px 16px; display: flex; flex-direction: column; gap: 4px; }
  .ne-about { display: flex; align-items: center; gap: 6px; min-height: 20px; color: var(--cm-text-secondary); }
  .nt-read { line-height: 16px; }
  .nt-line { display: flex; align-items: center; gap: 4px; min-height: 24px; flex-wrap: wrap; }
  .nt-line .k-caption { width: 44px; flex: none; }
  .ne-text { height: 56px; align-items: flex-start; padding-top: 4px; }
  .ne .nt-line .k-field { min-width: 0; white-space: nowrap; overflow: hidden; }
  /* The citation chip carries the cited run's settings under its name (as screens/take-a-note.html) */
  .nt-cite { height: auto; padding: 2px 6px 2px 3px; align-items: flex-start; flex: 1 1 0; min-width: 0; white-space: normal; line-height: 16px; }
  .nt-cite > .k-i { margin-top: 2px; }

  /* Nothing-selected inspector rows, as screens/frame-at-rest.html */
  .sr { display: flex; flex-wrap: wrap; align-items: center; gap: 0 4px; min-height: 26px; padding: 4px 8px 4px 16px; }
  .sr .n { color: var(--cm-text-secondary); white-space: nowrap; }
  .sr .v { margin-inline-start: auto; font-variant-numeric: tabular-nums; white-space: nowrap; text-align: end; }
  .sr .ii { color: var(--cm-icon-secondary); width: 12px; height: 12px; stroke-width: 2; flex: none; }
  .sr .sub { color: var(--cm-text-secondary); flex-basis: 100%; text-align: end; }
  .k-row .rt { color: var(--cm-text-secondary); font-variant-numeric: tabular-nums; }
  .bgsw { display: inline-block; width: 12px; height: 12px; border-radius: 2px; flex: none; background: linear-gradient(135deg, #F5F5F5 0 50%, #1E1E1E 50% 100%); box-shadow: inset 0 0 0 1px var(--cm-border-translucent); }

  /* The legend, as screens/styles-list.html */
  .k-ramp-measure { background: linear-gradient(90deg, ${BT.palette.join(", ")}); box-shadow: inset 0 0 0 1px var(--cm-border-translucent); }
  .ticks { position: relative; height: 16px; color: var(--cm-text-secondary); font-variant-numeric: tabular-nums; }
  .ticks span { position: absolute; top: 0; transform: translateX(-50%); }
  .ticks span:first-child { transform: none; }
  .ticks .mid::before { content: ""; position: absolute; left: 50%; top: -4px; height: 4px; border-left: 1px solid var(--cm-text-secondary); }
  .textchip { width: 16px; flex: none; font-size: 11px; line-height: 12px; font-weight: 550; text-align: center; color: var(--cm-text); }
  .size-marks { display: flex; align-items: flex-end; gap: 6px; padding: 2px 0; }
  .size-marks div { white-space: nowrap; display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); font-variant-numeric: tabular-nums; }
  .size-marks b { display: block; border-radius: 50%; background: var(--k-node-gray); }
  .lg-gap { height: 6px; }

  /* Canvas marks over the drawing (canvas-drawing.md 6): ring 5, the one-tone hairline after a 2 px
     gap (hover, linked hover); the member ring, a thin two-tone band */
  .rk { position: absolute; aspect-ratio: 1; border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; }
  .rk-hover { box-shadow: 0 0 0 2px var(--k-canvas), 0 0 0 3px var(--k-canvas-ink); }
  .rk-member { box-shadow: 0 0 0 1px var(--k-canvas), 0 0 0 2px var(--k-canvas-ink); }
  /* Note marker: a callout in note ink (the canvas ink), never a data color; its point on the node */
  .nm { position: absolute; display: inline-flex; align-items: center; gap: 3px; height: 20px; padding: 0 6px 0 4px; border-radius: 10px 10px 2px 10px;
        background: var(--k-canvas); color: var(--k-canvas-ink); box-shadow: 0 0 0 1.5px var(--k-canvas-ink); font-size: 11px; font-weight: 600;
        transform: translate(calc(-100% - 4px), calc(-100% - 4px)); }
  .lb { position: absolute; transform: translate(calc(-100% - 11px), -50%); font-size: 9px; font-weight: 400; color: var(--k-canvas-ink);
        -webkit-text-stroke: 2.5px var(--k-canvas); paint-order: stroke fill; white-space: nowrap; }
  .nm-hot { background: var(--k-canvas-ink); color: var(--k-canvas); }
</style>
</head>
<body>

<nav class="sw" aria-label="States of this mock">
  ${sw}
  <label><input type="checkbox" id="owner">Owner notes</label>
</nav>

${states.map((s) => `<!-- ============================ ${s.label} ============================ -->\n${s.html}`).join("\n\n")}

</body>
</html>
`;
if (/[^\x00-\x7F]/.test(html)) throw new Error("non-ASCII in output");
writeFileSync(join(here, "notes-panel.html"), toShell(html)); // the current frame: kit/shell.mjs
console.log(`wrote screens/notes-panel.html, ${states.length} states; TP53 at ${TP.x},${TP.y}; CDK1 at ${CD.x},${CD.y}`);
