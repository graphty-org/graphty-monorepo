#!/usr/bin/env node
// States 10 (two authors on the transfers), 11 (a citation opens the run's Details) and 12 (the findings report in the Export dialog) were added to screens/take-a-note.html by hand, as were later edits there (the Cites chip's tooltip): port them before running this script.
// Builds screens/take-a-note.html: writing and reading a note (task-flows.md 7) in nine states.
// Run from design/ui/prototype/: node screens/take-a-note.gen.mjs
// Every number is from kit/fixtures.json: the March transfers (transactions), the mule ring's
// accounts and their positions (transactions.anchors.flagged), and the same accounts' PageRank in
// April's data (transactionsApril.pagerank.ring).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toShell } from "../kit/shell.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "../kit/fixtures.json"), "utf8")).datasets;
const M = fx.transactions;
const A = fx.transactionsApril;
const fmt = (n) => n.toLocaleString("en-US");
const acc = (id) => M.flaggedAccounts.find((r) => r.id === id);
const at = (id) => M.anchors.flagged.find((r) => r.id === id);
const aprilPR = (id) => A.pagerank.ring.find((r) => r.id === id).pagerank;
const GRAPH = M.graphName;
const COLLECTOR = "ACC-753261";
const TOP_NOTE = "Highest riskScore in the ring. Request the KYC file before the SAR goes out.";
const TOP = "ACC-233575";
const quote = `${COLLECTOR} PageRank ${acc(COLLECTOR).pagerank}`;
const noteText = `Referred for a SAR. 14 personal accounts in 7 countries, riskScore 88 to 98. ${COLLECTOR} ranks highest in the ring by PageRank: likely the collector.`;
const riskRange = `${Math.min(...M.flaggedAccounts.map((r) => r.riskScore))} to ${Math.max(...M.flaggedAccounts.map((r) => r.riskScore))}`;
if (riskRange !== "88 to 98") throw new Error("the note's text no longer matches the fixture: " + riskRange);
const topRing = [...M.flaggedAccounts].sort((a, b) => b.pagerank - a.pagerank)[0].id;
if (topRing !== COLLECTOR) throw new Error("the ring's top PageRank account changed: " + topRing);
const topRingApril = [...A.pagerank.ring].sort((a, b) => b.pagerank - a.pagerank)[0];

const I = (name, cls = "") => `<svg class="k-i${cls ? " " + cls : ""}"><use href="../kit/icons.svg#${name}"/></svg>`;

// ---------- the frame ----------
const rail = (on) => `<nav class="k-rail" aria-label="Main">
    <div class="k-rail-btn"><span class="k-rail-pill">${I("menu")}</span></div>
    <div class="k-rail-sep"></div>
    <div class="k-rail-btn"${on === "graph" ? ' aria-pressed="true"' : ""}><span class="k-rail-pill">${I("network")}</span>Graph</div>
    <div class="k-rail-btn k-asst-off" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div>
    <div class="k-rail-btn"><span class="k-rail-pill">${I("flask-conical")}</span>Results</div>
    <div class="k-rail-btn"${on === "notes" ? ' aria-pressed="true"' : ""}><span class="k-rail-pill">${I("sticky-note")}</span>Notes</div>
  </nav>`;

const panelHead = `<div class="k-panel-head">
      <div class="k-title-line"><span class="k-project">March transfers</span>${I("chevron-down", "k-i-sm k-secondary")}</div>
      <span class="k-chip">${I("funnel", "k-i-sm")}Full graph</span>
    </div>`;

const graphPanel = ({ setSelected, nodes = M.nodes }) => `<aside class="k-panel" aria-label="Graph">
    ${panelHead}
    <div class="k-scroll">
      <section class="k-section"><div class="k-section-head">Graphs<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
        <ul class="k-list"><li class="k-item">${I("network")}<span class="k-grow k-ellipsis">${GRAPH}</span><span class="k-trail k-num">${fmt(nodes)}</span></li></ul></section>
      <section class="k-section"><div class="k-section-head">Sets and paths<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
        <ul class="k-list"><li class="k-item"${setSelected ? ' aria-selected="true"' : ""}>${I("group")}<span class="k-ellipsis">Mule ring</span><span class="k-kind">frozen</span><span class="k-trail"><span class="k-paint-slot"></span><span class="k-num">14</span></span></li></ul></section>
      <section class="k-section"><div class="k-section-head">Styles<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
        <ul class="k-list">
          <li class="k-item"><span class="k-chit" style="background:#D55E00"></span><span class="k-ellipsis">Flagged accounts</span></li>
          <li class="k-item"><span class="k-chit" style="background:#808080"></span><span class="k-ellipsis">Base style</span></li>
        </ul></section>
      <section class="k-section" data-collapsed><div class="k-section-head">Views</div></section>
    </div>
  </aside>`;

// A row of the Notes panel (framework-changes.md, "Notes panel: what a note's row shows").
const panelRow = ({ sel, when, text, glyph, about, cites, state, verb, id }) => `<div class="nt-row"${sel ? ' aria-selected="true"' : ""}>
        <div class="nt-by"><span class="k-secondary k-grow">${when}</span></div>
        <div class="nt-body nt-clamp">${text}</div>
        <div class="nt-meta${id ? " k-id" : ""}">${I(glyph, "k-i-sm")}About ${about}</div>
        ${cites ? `<div class="nt-meta">${I("flask-conical", "k-i-sm")}Cites ${cites}</div>` : ""}
        ${state ? `<div class="nt-meta" style="padding-left:16px"><span class="k-warn-glyph">!</span><span class="nt-state">${state}</span></div>` : ""}
        ${verb ? `<div style="display:flex;gap:8px;margin-top:2px"><span class="nt-state">Detached</span><span class="k-secondary">The set this note pointed to was changed.</span></div><div><span class="nt-verb">${verb}</span></div>` : ""}
      </div>`;

const WHEN_RING = "Sep 28 2026, 10:42", WHEN_TOP = "Sep 28 2026, 10:44";
const notesPanel = ({ selected, when2 = "Sep 20 2026, 16:05", when3 = "Sep 19 2026, 09:40", citeState = "" }) => `<aside class="k-panel" aria-label="Notes">
    ${panelHead}
    <div class="k-search"><span class="k-field" data-placeholder>${I("search", "k-i-sm")}Find in notes</span><span class="k-icon-btn">${I("list-filter")}</span></div>
    <div class="k-scroll">
      ${panelRow({ when: WHEN_TOP, text: TOP_NOTE, glyph: "circle-dot", about: TOP, id: true })}
      ${panelRow({ sel: selected === "ring", when: WHEN_RING, text: noteText, glyph: "group", about: "Mule ring, 14 accounts", cites: `${RUN} (${RUN_SETTINGS})`, state: citeState })}
      ${panelRow({ when: when2, text: `Busiest merchant (degree ${M.topByDegree[0].degree}). Payroll processor; leave it out of ring reviews.`, glyph: "circle-dot", about: M.topByDegree[0].id, id: true })}
      ${panelRow({ sel: selected === "pagerank", when: when2, text: "Damping 0.85, the team default, so scores compare with last month's case.", glyph: "flask-conical", about: "PageRank" })}
      ${panelRow({ when: when3, text: "First pass, before the riskScore cut. Kept for the audit trail.", glyph: "group", about: "Suspects, first pass", verb: `Bring back Suspects, first pass (as kept ${when3.split(" 20")[0]})` })}
      ${panelRow({ when: when3, text: "March export from the card platform. Transfers under $10 are cut upstream.", glyph: "network", about: `the graph ${GRAPH}` })}
    </div>
  </aside>`;

const legend = (other = M.nodes - 14) => `<div class="k-legend-card">
        <div class="k-lg-title">Flagged accounts <span class="k-secondary">flagged</span></div>
        <div class="k-lg-row"><span class="k-chit" style="background:#D55E00"></span>true<span class="k-value">14</span></div>
        <div class="k-lg-row"><span class="k-chit" style="background:#808080"></span>other accounts, as density<span class="k-value">${fmt(other)}</span></div>
      </div>`;

// No Note tool: notes start from Add note (owner-feedback.md, 2026-09-28).
const toolbar = () => `<div class="k-toolbar" role="toolbar">
        <span class="k-tool" aria-pressed="true">${I("mouse-pointer-2", "k-i-lg")}</span><span class="k-tool-caret">${I("chevron-down", "k-i-sm")}</span>
        <span class="k-tool">${I("route", "k-i-lg")}</span>
        <span class="k-toolbar-sep"></span><span class="k-tool">${I("zap", "k-i-lg")}</span>
        <span class="k-toolbar-sep"></span><span class="k-tool">${I("square", "k-i-lg")}</span><span class="k-tool-caret">${I("chevron-down", "k-i-sm")}</span>
      </div>`;

const canvas = ({ drawing, alt, stage = "", over = "", legendOther }) => `<main class="k-main">
    <div class="k-canvas">
      <div class="k-stage">
        <img class="k-light-only" src="../kit/canvas/${drawing}-light.svg" alt="${alt}">
        <img class="k-dark-only" src="../kit/canvas/${drawing}-dark.svg" alt="${alt}">
        ${stage}
      </div>
      ${over}
      ${legendOther === null ? "" : legend(legendOther)}
      <div class="k-toolbar-dock">${toolbar()}</div>
      <span class="k-help">${I("circle-help")}</span>
    </div>
  </main>`;

const rightHead = `<div class="k-header1"><span class="k-avatar">S</span><span class="k-grow"></span><span class="k-btn">Export files...</span></div>
    <div class="k-header2"><span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">100%${I("chevron-down", "k-i-sm")}</span></div>`;

// The inspector's Notes section: rows and "+" only; a note is written and read in the Note editor.
const notesSection = (rows) => `<section class="k-section"><div class="k-section-head">Notes <span class="k-count k-num">${rows.length}</span><span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
        ${rows.join("\n")}
      </section>`;
const inspRow = ({ sel, when, text }) => `<div class="nt-row"${sel ? ' aria-selected="true"' : ""}>
          <div class="nt-by"><span class="k-secondary k-grow">${when}</span></div>
          <div class="nt-body nt-clamp">${text}</div>
        </div>`;

const setInspector = ({ overflowOpen = false, members = "top5", notes = [] }) => {
    const top = [...M.flaggedAccounts].sort((a, b) => b.riskScore - a.riskScore || a.id.localeCompare(b.id)).slice(0, 5);
    return `<aside class="k-right" aria-label="Inspector">
    ${rightHead}
    <div class="k-typerow">${I("group")}<span class="k-grow tr2"><span class="k-name">Mule ring</span><span class="k-secondary">Frozen set</span></span>
      <span class="k-icon-btn">${I("users")}</span><span class="k-icon-btn">${I("funnel")}</span><span class="k-icon-btn">${I("plus")}</span><span class="k-icon-btn"${overflowOpen ? ' aria-pressed="true"' : ""}>${I("ellipsis")}</span></div>
    <div class="k-scroll">
      <section class="k-section"><div class="k-section-head">Statistics</div>
        <div class="k-metrics"><div class="k-metric"><span class="k-secondary">accounts</span><span class="k-big">14</span></div><div class="k-metric"><span class="k-secondary">countries</span><span class="k-big">7</span></div></div>
        <div class="k-data"><span class="k-name">riskScore</span><span class="k-value">${riskRange}</span></div>
      </section>
      ${members === "top5"
          ? `<section class="k-section"><div class="k-section-head">Members <span class="k-count k-num">14</span></div>
        ${top.map((r) => `<div class="k-data"><span class="k-name k-id" style="color:var(--cm-text)">${r.id}</span><span class="k-value">riskScore ${r.riskScore}</span></div>`).join("\n        ")}
        <div class="k-row k-secondary">9 more</div>
      </section>`
          : `<section class="k-section" data-collapsed><div class="k-section-head">Members <span class="k-count k-num">14</span></div></section>`}
      <section class="k-section"><div class="k-section-head">Appearance</div>
        <div class="k-fieldrow"><span class="k-legend">Color <span class="k-tertiary">-- Flagged accounts</span></span>
          <div class="k-fields"><span class="k-field k-span"><span class="k-chit" style="background:#D55E00"></span>D55E00</span></div></div>
      </section>
      ${notes.length ? notesSection(notes) : ""}
    </div>
  </aside>`;
};

const graphInspector = ({ overflowOpen = false, stats = M.stats, nodes = M.nodes, edges = M.edges, notes = [] }) => `<aside class="k-right" aria-label="Inspector">
    ${rightHead}
    <div class="k-typerow">${I("network")}<span class="k-grow tr2"><span class="k-name">${GRAPH}</span><span class="k-secondary">Graph, directed</span></span>
      <span class="k-icon-btn"${overflowOpen ? ' aria-pressed="true"' : ""}>${I("ellipsis")}</span></div>
    <div class="k-scroll">
      <section class="k-section"><div class="k-section-head">Statistics</div>
        <div class="k-metrics"><div class="k-metric"><span class="k-secondary">accounts</span><span class="k-big">${fmt(nodes)}</span></div><div class="k-metric"><span class="k-secondary">transfers</span><span class="k-big">${fmt(edges)}</span></div></div>
        <div class="k-data"><span class="k-name">components</span><span class="k-value">${stats.components}</span></div>
        <div class="k-data"><span class="k-name">density</span><span class="k-value">${stats.density}</span></div>
        <div class="k-data"><span class="k-name">average total degree</span><span class="k-value">${stats.averageDegree}</span></div>
      </section>
      <section class="k-section" data-collapsed><div class="k-section-head">Attributes</div></section>
      <section class="k-section" data-collapsed><div class="k-section-head">Layout</div></section>
      ${notes.length ? notesSection(notes) : ""}
    </div>
  </aside>`;

// ---------- the Note editor (one PopoutPanel for writing and reading) ----------
// Canvas coordinates: the stage is the canvas width (901) by 3:2, centered in 900 of height.
const CW = 901, CH = 900, SH = CW * 2 / 3, SY = (CH - SH) / 2;
const px = (a) => ({ x: Math.round(a.x / 100 * CW), y: Math.round(SY + a.y / 100 * SH) });

const aboutLine = (glyph, text, id) => `<div class="nt-about">${I(glyph, "k-i-sm")}<span${id ? ' class="k-id"' : ""}>${text}</span></div>`;
const editor = ({ x, y, head, about, body, cites = "", quotes = "", foot = "", extra = "", tail }) => `<div class="k-popover ne" style="left:${x}px;top:${y}px">
        ${tail ? `<span class="ne-tail" style="top:${tail}px"></span>` : ""}
        <div class="k-popover-head">${head}<span class="k-grow"></span><span class="k-icon-btn">${I("ellipsis")}</span><span class="k-icon-btn">${I("x")}</span></div>
        <div class="ne-body">
          ${about}
          ${body}
          ${cites}
          ${quotes}
          ${foot}
        </div>
        ${extra}
      </div>`;
const byline = (when) => `<div class="nt-by"><span class="k-secondary">${when}</span></div>`;
// Writing: Enter makes a new line and Ctrl+Enter (Cmd+Enter on a Mac) adds the note, said under the box.
// The author line is the project's author setting as given; it shows here, in the editor, and nowhere else.
const AUTHOR = "Marcus";
const keyHint = `<div class="nt-hint k-tertiary">Enter, new line. Ctrl+Enter adds the note.</div>`;
const typing = (text) => `<div class="nt-text" data-focus>${text}<span class="nt-caret"></span></div>
          ${keyHint}`;
const hint = `<div class="nt-foot"><span class="k-secondary k-grow">Saving as: ${AUTHOR}. <span class="nt-link">Change...</span></span><span class="k-btn">Add</span></div>`;
// A citation is there only when the writer added one; its chip carries the cited run's settings.
const RUN = "PageRank", RUN_SETTINGS = "full graph, directed, damping 0.85, unweighted";
const citeAdd = `<div class="nt-line"><span class="k-caption">Cites</span><span class="nt-link">Cite a run...</span></div>`;
const citeRow = (state = "") => `<div class="nt-line"><span class="k-caption">Cites</span><span class="k-pill nt-cite">${I("flask-conical", "k-i-sm")}<span><span class="k-strong">${RUN}</span><br><span class="k-secondary">${RUN_SETTINGS}</span></span></span>${state && !state.includes("nt-state") ? state : ""}</div>${state.includes("nt-state") ? `<div class="nt-sub">${state}</div>` : ""}`;
const quoteRow = (inner, sub = "") => `<div class="nt-line"><span class="k-caption">Quotes</span>${inner}</div>${sub ? `<div class="nt-sub">${sub}</div>` : ""}`;

const ring = px(M.anchors.flaggedCenter);
const top = px(at(TOP));
const EX = 612; // the editor's left edge: clear of the ring's right-most account (ACC-233575)

// ---------- states ----------
const states = [];
const state = (id, label, app, overlay, notes) => states.push({ id, label, html: `<section class="st" id="${id}"><i class="aon" id="${id}a"></i>
<div class="k-app">
  ${app}
</div>
${overlay}
<div class="an">
${notes}
</div>
</section>` });

// 1. Add note from the set's overflow
state("s1", "1 Add note", `${rail("graph")}
  ${graphPanel({ setSelected: true })}
  ${canvas({ drawing: "transactions-flagged", alt: "3,000 accounts as density; the 14 accounts of Mule ring selected" })}
  ${setInspector({ overflowOpen: true })}`,
`<div class="k-menu" style="left:1196px;top:132px;width:232px" role="menu">
  <div class="k-menu-item" role="menuitem"><span class="k-check-col"></span>Compare with the rest</div>
  <div class="k-menu-item" role="menuitem"><span class="k-check-col"></span>Collapse</div>
  <div class="k-menu-item" role="menuitem"><span class="k-check-col"></span>Hide on canvas</div>
  <div class="k-menu-item" role="menuitem"><span class="k-check-col"></span>Run layout</div>
  <div class="k-menu-item" role="menuitem"><span class="k-check-col"></span>Extract as graph</div>
  <div class="k-menu-sep"></div>
  <div class="k-menu-item" data-hover role="menuitem"><span class="k-check-col"></span>Add note...</div>
</div>
<span class="k-cursor" style="left:1262px;top:318px"></span>`,
`  <span class="k-annot-box" style="left:1196px;top:300px;width:232px;height:30px"></span>
  <div class="k-annot-note" style="left:900px;top:258px"><b>Add note</b> is in the set's overflow with the other rarer verbs, not in the type row's three. interface-specification.md 4.2 (Set); output-homes.md 3.7. compact-mantine <b>ContextMenu</b>.</div>
  <span class="k-annot-box" style="left:1306px;top:92px;width:126px;height:40px"></span>
  <div class="k-annot-note" style="left:900px;top:92px">Type row: kind glyph, name, kind word, three frequent verbs (Select members, Filter to, Add to set), then the overflow. interface-specification.md 4.2. <b>ActionIcon</b> buttons.</div>
  <span class="k-annot-box" style="left:64px;top:208px;width:228px;height:30px"></span>
  <div class="k-annot-note" style="left:310px;top:196px">The set row is selected because the set is the canvas selection; the inspector shows it and only it. interaction-patterns.md 3.1. <b>Tree</b> row.</div>
  <div class="k-annot-note" style="left:560px;top:640px">Its 14 members carry the selection ring. No note marker yet: the set has no note. canvas-drawing.md 6.</div>`);

// 2. Writing, with the quote picker open
const picker = `<div class="qp" role="listbox" aria-label="Quote a value">
          <div class="qp-field"><span class="k-field" data-focus>${I("search", "k-i-sm")}<span class="k-id">753</span><span class="nt-caret"></span></span></div>
          <div class="qp-group k-caption">PageRank (cited)</div>
          <div class="qp-opt" aria-selected="true"><span class="k-id k-grow">${COLLECTOR}</span><span class="k-num">${acc(COLLECTOR).pagerank}</span></div>
          <div class="qp-group k-caption">Attributes</div>
          <div class="qp-opt"><span class="k-id k-grow">${COLLECTOR}</span><span class="k-secondary">riskScore</span><span class="k-num">${acc(COLLECTOR).riskScore}</span></div>
          <div class="qp-opt"><span class="k-id k-grow">${COLLECTOR}</span><span class="k-secondary">country</span><span>${acc(COLLECTOR).country}</span></div>
          <div class="qp-foot k-tertiary">Values of this note's 14 accounts</div>
        </div>`;
state("s2", "2 Writing", `${rail("graph")}
  ${graphPanel({ setSelected: true })}
  ${canvas({ drawing: "transactions-flagged", alt: "3,000 accounts as density; the 14 accounts of Mule ring selected, a new note open beside them",
      over: editor({ x: EX, y: 150, tail: ring.y - 150 - 6, head: "New note", about: aboutLine("group", "About Mule ring, 14 accounts"),
        body: `<div class="nt-text">${noteText}</div>
          ${keyHint}`,
        cites: citeRow(`<span class="k-grow"></span><span class="k-icon-btn k-secondary">${I("x", "k-i-sm")}</span>`),
        quotes: quoteRow(`<span class="nt-link" data-focus>Quote a value...</span>`), foot: hint, extra: picker }) })}
  ${setInspector({})}`, "",
`  <div class="k-annot-note" style="left:330px;top:70px"><b>Written where it will be read.</b> The Note editor opens beside its targets, as Figma's comment composer opens at its pin and its thread opens in the same spot. It never covers them. interaction-patterns.md 2, note [c]; proposed for writing too (framework-changes.md). compact-mantine <b>PopoutPanel</b>.</div>
  <span class="k-annot-box" style="left:${298 + EX + 8}px;top:${150 + 44}px;width:256px;height:26px"></span>
  <div class="k-annot-note" style="left:330px;top:250px"><b>About line first.</b> "About Mule ring, 14 accounts" is on screen before a word is typed, so a note meant for the set cannot land on the graph unseen. The wording is the proposed message graphty.note.about.</div>
  <div class="k-annot-note" style="left:1210px;top:236px"><b>Enter makes a new line; Ctrl+Enter adds</b> (Cmd+Enter on a Mac), said under the box, so a paragraph break never posts a half-written note. <b>Saving as: ${AUTHOR}</b> is the author setting as given; with none set it reads "Saving as: no name". It is on every note being written or edited (states 2, 4 and 6), and only there. Change... opens the setting (state 9).</div>
  <div class="k-annot-note" style="left:1210px;top:420px"><b>The writer added this citation</b> with Cite a run... (states 4 and 6 show it unused); nothing is cited for him. Its chip carries the run's settings, so the note says which PageRank it means; a click opens the run's details.</div>
  <div class="k-annot-note" style="left:330px;top:390px"><b>Nothing exists yet.</b> No undo entry until the first text is committed; Esc on an empty note leaves nothing. interaction-pattern-entries.md 6.1. Mantine <b>Textarea</b>.</div>
  <div class="k-annot-note" style="left:1210px;top:580px"><b>The selection is untouched.</b> The inspector still shows Mule ring; the note has no Notes row until it is added. interface-specification.md 3.</div>
  <span class="k-annot-box" style="left:${298 + EX + 8}px;top:454px;width:256px;height:192px"></span>
  <div class="k-annot-note" style="left:330px;top:520px"><b>Quote a value...</b> searches the values of the note's own targets: attributes, and the runs it cites. Nothing else is selected or opened, so the draft never loses focus to another object. Proposed (framework-changes.md). <b>ComboInput</b>.</div>`);

// 3. Added: the editor shows the posted note; the inspector's Notes section appears
const readNote = (when, citeState = "", quoteMark = "") => ({
    about: aboutLine("group", "About Mule ring, 14 accounts"),
    body: `${byline(when)}<div class="nt-read">${noteText}</div>`,
    cites: citeRow(citeState),
    quotes: quoteRow(`<span class="k-pill k-id">${quote}</span>`, quoteMark),
});
const ringMarker = `<span class="nm" style="position:absolute;left:calc(${M.anchors.flaggedCenter.x}% + 118px);top:calc(${M.anchors.flaggedCenter.y}% - 60px)">${I("sticky-note", "k-i-sm")}1</span>`;
state("s3", "3 Added", `${rail("graph")}
  ${graphPanel({ setSelected: true })}
  ${canvas({ drawing: "transactions-flagged", alt: "3,000 accounts as density; the 14 accounts of Mule ring selected, the new note open beside them with its marker", stage: ringMarker,
      over: editor({ x: EX, y: 150, tail: ring.y - 150 - 6, head: "Note", ...readNote(WHEN_RING) }) })}
  ${setInspector({ notes: [inspRow({ sel: true, when: WHEN_RING, text: noteText })] })}`, "",
`  <div class="k-annot-note" style="left:330px;top:70px"><b>Added: one undo entry, "Add note".</b> Ctrl+Enter (Cmd+Enter on a Mac) or Add committed it; the editor stays open on the posted note. The note records Marcus as its author, but no row or byline names him: every note in this project is by one person. No notice: the note is already on screen. A screen reader is not left in silence: a polite announcement says "Note added to Mule ring. Ctrl+Z removes it.", as every other commit and undo is spoken, and focus stays in the editor on the posted note. interaction-pattern-entries.md 6.1.</div>
  <div class="k-annot-note" style="left:330px;top:190px"><b>Note marker</b> in note ink at its targets, drawn by graphty-element, never a data color. canvas-drawing.md 6 and 12. Shown while Note markers is on.</div>
  <span class="k-annot-box" style="left:1202px;top:572px;width:234px;height:108px"></span>
  <div class="k-annot-note" style="left:930px;top:640px"><b>Notes section:</b> appears once a note targets the set; rows clamped to two lines, and "+" opens a new note beside the set. It lists; it is not where a note is written. interface-specification.md 3. <b>Tree</b> rows.</div>`);

// 4. A second note, on one member: Add note from the member's row menu in Members; the set stays selected
const hair = `<span class="k-at tgt" style="left:${at(TOP).x}%;top:${at(TOP).y}%"></span>`;
const TOPROW_Y = 258; // ACC-233575's row in Members (the first, highest riskScore)
state("s4", "4 Member note", `${rail("graph")}
  ${graphPanel({ setSelected: true })}
  ${canvas({ drawing: "transactions-flagged", alt: `3,000 accounts as density; Mule ring still selected; a new note about ${TOP} open beside it`,
      stage: ringMarker + hair,
      over: editor({ x: EX, y: top.y - 40, tail: 34, head: "New note", about: aboutLine("circle-dot", `About ${TOP}`, true),
        body: typing(TOP_NOTE), cites: citeAdd,
        quotes: quoteRow(`<span class="k-pill">riskScore ${acc(TOP).riskScore}</span>`), foot: hint }) })}
  ${setInspector({ notes: [inspRow({ when: WHEN_RING, text: noteText })] })}`, "",
`  <div class="k-annot-note" style="left:330px;top:70px"><b>A note on one member, without a Note tool.</b> Add note... from ${TOP}'s row menu in Members: the note is about the account, and Mule ring stays the selection. Many such notes in a row is the case to test before a tool is proposed again. output-homes.md 3.7.</div>
  <span class="k-annot-box" style="left:1202px;top:${TOPROW_Y - 4}px;width:234px;height:24px"></span>
  <div class="k-annot-note" style="left:930px;top:${TOPROW_Y + 30}px">The row the note was started from. A member row's menu is the node's context menu. <b>ContextMenu</b>.</div>
  <div class="k-annot-note" style="left:330px;top:300px"><b>The target mark</b> is the hover hairline, held on ${TOP} while its note is open. canvas-drawing.md 6.</div>
  <div class="k-annot-note" style="left:330px;top:560px"><b>Quotes</b> offers the account's own values; riskScore ${acc(TOP).riskScore} was picked. Nothing is cited until the writer adds a run.</div>`);

// 5. Next session: a row click selects the targets, frames them, opens the note beside them
state("s5", "5 Next session", `${rail("notes")}
  ${notesPanel({ selected: "ring" })}
  ${canvas({ drawing: "transactions-flagged", alt: "3,000 accounts as density; the 14 accounts of Mule ring selected by the note's row, the note open beside them", stage: ringMarker,
      over: editor({ x: EX, y: 150, tail: ring.y - 150 - 6, head: "Note", ...readNote(WHEN_RING) }) })}
  ${setInspector({ members: "collapsed", notes: [inspRow({ sel: true, when: WHEN_RING, text: noteText })] })}`, "",
`  <div class="k-annot-note" style="left:330px;top:44px"><b>Notes panel:</b> every note, newest first; each row says what it is about and what it cites. interface-templates.md 4. <b>SearchInput</b> and <b>Tree</b>.</div>
  <span class="k-annot-box" style="left:58px;top:490px;width:240px;height:146px"></span>
  <div class="k-annot-note" style="left:330px;top:560px"><b>A deleted target keeps its note:</b> Detached, the sentence that says what happened, and its one verb, which names the set and the day its members were kept: Bring back Suspects, first pass (as kept Sep 19). interaction-pattern-entries.md 7.2; glossary.md 10.</div>
  <div class="k-annot-note" style="left:330px;top:420px"><b>A row click</b> selects the targets, brings them into view and opens the note beside them, clear of the ring. The full text is only here; the two rows are clamped. interaction-patterns.md 2, note [c].</div>
  <div class="k-annot-note" style="left:930px;top:520px"><b>Trust check:</b> the cited run carries no state word, so it is current, and the quote matches the live value, so it has no mark. State 8 shows both after the data changed. glossary.md 10.</div>`);

// 6. A note about the graph: nothing selected
state("s6", "6 Graph note", `${rail("graph")}
  ${graphPanel({ setSelected: false })}
  ${canvas({ drawing: "transactions-density", alt: "3,000 accounts as density, nothing selected; a new note about the graph open at the top right of the canvas", legendOther: null,
      over: editor({ x: CW - 272 - 12, y: 56, head: "New note", about: aboutLine("network", `About the graph ${GRAPH}`),
        body: typing("March export from the card platform. Transfers under $10 are cut upstream."), cites: citeAdd,
        quotes: quoteRow(`<span class="nt-link">Quote a value...</span>`), foot: hint }) })}
  ${graphInspector({ overflowOpen: false })}`, "",
`  <div class="k-annot-note" style="left:330px;top:70px"><b>Nothing selected, so the note is about the graph.</b> Started from the graph's type-row menu (Add note) or Quick actions. The graph has no place on the canvas, so the editor opens at the canvas's top right, next to the inspector that shows the graph.</div>
  <span class="k-annot-box" style="left:${298 + CW - 272 - 12 + 8}px;top:${56 + 44}px;width:256px;height:26px"></span>
  <div class="k-annot-note" style="left:330px;top:250px"><b>The check for the flow's first failure.</b> This note is about the export, so the graph is the right target. Had Marcus meant the set, "About the graph ${GRAPH}" would tell him before he types: Esc leaves nothing, he selects Mule ring and starts again. task-flows.md 7, first failure.</div>`);

// 7. A note on a result, read in the result's editor
const prEditor = `<div class="k-popover" style="left:306px;top:96px;width:260px">
  <div class="k-popover-head">PageRank<span class="k-grow"></span><span class="k-icon-btn">${I("ellipsis")}</span><span class="k-icon-btn">${I("x")}</span></div>
  <div class="k-popover-body">
    <div class="k-prose" style="padding:0 16px 8px">on: full graph, ${fmt(M.nodes)} accounts<br><span class="k-secondary">Directed, damping 0.85. Unweighted. CPU.</span></div>
    <div class="k-section-head" style="padding-left:16px">Highest</div>
    ${M.topByDegree.slice(0, 3).map((r) => `<div class="k-data"><span class="k-name k-id" style="color:var(--cm-text)">${r.id}</span><span class="k-value">${r.pagerank}</span></div>`).join("\n    ")}
    <div class="k-section-head" style="padding-left:16px">Appearance</div>
    <div class="k-row"><span class="k-grow k-secondary">No layer shows this result</span></div>
    <div class="k-section-head" style="padding-left:16px">Notes <span class="k-count k-num">1</span><span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
    <div class="nt-row" aria-selected="true">
      ${byline("Sep 20 2026, 16:05")}
      <div class="nt-read" style="margin-top:2px">Damping 0.85, the team default, so scores compare with last month's case.</div>
    </div>
  </div>
</div>`;
state("s7", "7 Result note", `${rail("notes")}
  ${notesPanel({ selected: "pagerank" })}
  ${canvas({ drawing: "transactions-density", alt: "3,000 accounts as density, nothing selected", legendOther: null })}
  ${graphInspector({ notes: [inspRow({ when: "Sep 19 2026, 09:40", text: "March export from the card platform. Transfers under $10 are cut upstream." })] })}`, prEditor,
`  <div class="k-annot-note" style="left:600px;top:96px"><b>A note on a result is read in that result's editor,</b> at its Notes row, which is highlighted; a result has no place on the canvas. The selection does not change: selecting is never an undo step. interaction-patterns.md 2 (a click on a note's row, [c]); output-homes.md 4. Editor: <b>PopoutPanel</b>.</div>
  <div class="k-annot-note" style="left:600px;top:320px"><b>Nothing selected,</b> so the inspector shows the graph, with its own note. interface-specification.md 4.1.</div>`);

// 8. A month later, after April's transfers replaced March's
const collectorApril = aprilPR(COLLECTOR);
state("s8", "8 After new data", `${rail("notes")}
  ${notesPanel({ selected: "ring", citeState: "Earlier data" })}
  ${canvas({ drawing: "transactions-april-flagged", legendOther: A.nodes - 14, alt: "3,093 April accounts as density; the 14 accounts of Mule ring selected, the note open beside them", stage: ringMarker,
      over: editor({ x: EX, y: 150, tail: px(A.anchors.ringCenter).y - 150 - 6, head: "Note", ...readNote(WHEN_RING,
        `<span class="k-warn-glyph">!</span><span class="nt-state">Earlier data</span><span class="nt-verb">Add current value</span>`,
        `<span class="k-warn-glyph">!</span><span class="nt-now">now <span class="k-num">${collectorApril}</span></span><span class="k-secondary">in April's data</span>`) }) })}
  ${setInspector({ members: "collapsed", notes: [inspRow({ sel: true, when: WHEN_RING, text: noteText })] })}`, "",
`  <div class="k-annot-note" style="left:330px;top:44px"><b>A month later.</b> The notes keep the dates they were written. April's transfers replaced March's (Update with new data): ${fmt(A.nodes)} accounts, the ring's 14 carried over by id. The note still cites the March run and still quotes the March value.</div>
  <span class="k-annot-box" style="left:${298 + EX + 8}px;top:310px;width:256px;height:138px"></span>
  <div class="k-annot-note" style="left:330px;top:250px"><b>The cited run is from an earlier data version:</b> "Earlier data", with its one verb, Add current value, which re-cites the April run as one undo entry, "Edit note". glossary.md 10.</div>
  <div class="k-annot-note" style="left:330px;top:400px"><b>The quote is marked:</b> ${COLLECTOR} was ${acc(COLLECTOR).pagerank} when written and is ${collectorApril} now. In April ${topRingApril.id} ranks highest in the ring (${topRingApril.pagerank}), so the note's claim needs checking before the report goes out. The mark "now {value}" is proposed (framework-changes.md).</div>
  <div class="k-annot-note" style="left:930px;top:640px"><b>Needs graphty-element:</b> quoted values marked when the live value differs, and citation freshness. element-needs.md, "A notes collection with targets, citations and quoted values marked when the live value differs".</div>`);

// 9. Change... from "Saving as": the author setting, which never reaches notes saved earlier
const nameDialog = `<div class="k-backdrop" style="position:absolute"><div class="k-modal x-name" role="dialog" aria-label="Your name on notes and recipes">
  <div class="k-modal-head">Your name on notes and recipes<span class="k-grow"></span><span role="button" class="k-icon-btn" aria-label="Close">${I("x")}</span></div>
  <div class="k-modal-body">
    <div class="k-fieldrow"><span class="k-legend">Name</span><div class="k-fields"><span class="k-field k-span" data-focus>Marcus Webb<span class="nt-caret"></span></span></div></div>
    <div class="k-prose x-name-help"><b>Applies to notes you save from now on.</b> Names are never added to earlier notes.</div>
    <div class="k-prose k-secondary x-name-help">Recorded exactly as typed. Leave blank to record no name.</div>
  </div>
  <div class="k-modal-foot"><span class="k-btn k-btn-secondary">Cancel</span><span class="k-btn">Save</span></div>
</div></div>`;
state("s9", "9 Your name", `${rail("graph")}
  ${graphPanel({ setSelected: true })}
  ${canvas({ drawing: "transactions-flagged", alt: `3,000 accounts as density; Mule ring still selected; a new note about ${TOP} open beside it, and the name dialog over the app`,
      stage: ringMarker + hair,
      over: editor({ x: EX, y: top.y - 40, tail: 34, head: "New note", about: aboutLine("circle-dot", `About ${TOP}`, true),
        body: typing(TOP_NOTE), cites: citeAdd,
        quotes: quoteRow(`<span class="k-pill">riskScore ${acc(TOP).riskScore}</span>`), foot: hint }) })}
  ${setInspector({ notes: [inspRow({ when: WHEN_RING, text: noteText })] })}`, nameDialog,
`  <div class="k-annot-note" style="left:330px;top:70px;z-index:80"><b>Change... in "Saving as: ${AUTHOR}"</b> opens the same dialog as Preferences, Your name on notes and recipes (screens/preferences.html). Marcus is adding his surname. The draft stays open behind it with its text.</div>
  <div class="k-annot-note" style="left:1010px;top:70px;z-index:80"><b>Forward only.</b> Save changes the name on this note and every later one. The ring note Marcus added earlier keeps "${AUTHOR}"; a note saved before any name was set stays blank. Nothing offers to put a name on earlier notes. Owner decision (owner-feedback.md): the author is recorded as given, blank if none is set.</div>
  <div class="k-annot-note" style="left:1010px;top:640px;z-index:80">compact-mantine <b>Modal</b> with a <b>FieldRow</b> + <b>TextInput</b> and <b>ModalFooter</b>, as in Preferences.</div>`);

// ---------- the page ----------
const sw = states.map((s) => `<a href="#${s.id}">${s.label}</a>`).join("");
const swOn = states.map((s) => `  body:has(#${s.id}:target, #${s.id}a:target) .sw a[href="#${s.id}"]`).join(",\n");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Take a note</title>
<!-- Built by screens/take-a-note.gen.mjs from kit/fixtures.json; edit the script, then run it. -->
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>
  /* States: one full app per state; the address fragment (#s1 to #s${states.length}) picks one, #s1 by default.
     #s1a to #s${states.length}a show the same state with the design notes on. No script. */
  body { overflow: hidden; }
  .st { display: none; position: relative; width: 100vw; height: 100vh; }
  .st:target, .st:has(:target) { display: block; }
  body:not(:has(:target)) .st:first-of-type { display: block; }
  .st > .k-app { position: absolute; inset: 0; }

  /* The state switcher and the design-notes toggle: annotation ink, not product UI */
  .sw { position: fixed; z-index: 200; top: 8px; left: 748px; transform: translateX(-50%); display: flex; align-items: center; gap: 2px;
        padding: 3px; border-radius: 14px; background: var(--k-annot-bg); box-shadow: 0 0 0 1px var(--k-annot); font-size: 11px; white-space: nowrap; }
  .sw a { padding: 2px 7px; border-radius: 11px; color: var(--cm-text); text-decoration: none; }
  .sw label { display: inline-flex; align-items: center; gap: 4px; padding: 0 8px 0 6px; color: var(--k-annot-ink); font-weight: 600; }
  .sw input { margin: 0; accent-color: var(--k-annot); }
  body:not(:has(:target)) .sw a[href="#s1"],
${swOn} { background: var(--k-annot); color: #fff; font-weight: 600; }

  .an { display: none; }
  body:has(#annot:checked) .an, .st:has(.aon:target) .an { display: block; }
  .k-annot-note b { color: var(--k-annot-ink); }

  /* The Note editor: one PopoutPanel for writing and reading, beside its targets */
  .ne { width: 272px; overflow: visible; }
  .ne-tail { position: absolute; left: -7px; width: 12px; height: 12px; background: var(--cm-bg); transform: rotate(45deg); box-shadow: -1px 1px 0 0 var(--cm-border); }
  .ne-body { padding: 8px 12px 12px 16px; display: flex; flex-direction: column; gap: 4px; }
  .nt-about { display: flex; align-items: center; gap: 6px; min-height: 20px; color: var(--cm-text-secondary); }
  .nt-line { display: flex; align-items: center; gap: 4px; min-height: 24px; flex-wrap: wrap; }
  .nt-line .k-caption { width: 44px; flex: none; }
  .nt-text { min-height: 72px; padding: 4px 8px; border-radius: 5px; background: var(--cm-bg-secondary); box-shadow: var(--cm-field-shadow); line-height: 16px; white-space: normal; }
  .nt-text[data-focus] { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; box-shadow: none; }
  .nt-read { line-height: 16px; white-space: normal; }
  .nt-caret { display: inline-block; width: 1px; height: 14px; margin-left: 1px; background: var(--cm-text); vertical-align: -3px; }
  .nt-hint { margin-top: -2px; }
  .nt-cite { height: auto; padding: 2px 6px 2px 3px; align-items: flex-start; flex: 1 1 160px; max-width: none; white-space: normal; line-height: 16px; }
  .nt-cite > .k-i { margin-top: 2px; }
  .nt-foot { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
  .nt-link { color: var(--cm-text-brand); padding: 0 4px; border-radius: 4px; }
  .nt-link[data-focus] { outline: 1px solid var(--cm-border-selected); }
  .nt-sub { display: flex; align-items: center; gap: 6px; min-height: 22px; padding-left: 48px; }
  .nt-now { display: inline-flex; gap: 4px; padding: 0 6px; border-radius: 4px; color: var(--cm-text); box-shadow: inset 0 0 0 1px var(--cm-border-strong); font-weight: 550; }
  .nt-by { display: flex; align-items: center; gap: 6px; height: 20px; }
  .nt-row { padding: 6px 8px 8px 16px; }
  .nt-row[aria-selected="true"] { background: var(--cm-bg-selected); }
  .nt-row .nt-body { margin: 2px 0 4px; }
  .nt-meta { display: flex; gap: 4px; align-items: center; color: var(--cm-text-secondary); }
  .nt-clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .tr2 { display: flex; flex-direction: column; line-height: 16px; min-width: 0; white-space: nowrap; }
  .k-avatar.sm { width: 16px; height: 16px; font-size: 9px; }
  .nt-state { color: var(--cm-text); font-weight: 550; }
  .nt-verb { color: var(--cm-text-brand); }

  /* The quote picker (a ComboInput's dropdown) */
  .qp { margin: 0 12px 12px 16px; border-radius: 6px; background: var(--cm-bg); box-shadow: var(--cm-elevation-200); padding: 4px 0; }
  .qp-field { padding: 4px 8px; }
  .qp-field .k-field { width: 100%; box-sizing: border-box; }
  .qp-group { padding: 6px 8px 2px; }
  .qp-opt { display: flex; gap: 8px; align-items: center; height: 24px; padding: 0 8px; }
  .qp-opt[aria-selected="true"] { background: var(--cm-bg-selected); }
  .x-name { width: 400px; }
  .x-name-help { padding: 4px 16px 0; font-size: 11px; line-height: 16px; }
  .qp-foot { padding: 4px 8px 2px; border-top: 1px solid var(--cm-border); margin-top: 4px; }

  /* Note marker on the canvas: a callout in note ink (the canvas ink), never a data color */
  .nm { position: absolute; display: inline-flex; align-items: center; gap: 3px; height: 20px; padding: 0 6px 0 4px; border-radius: 10px 10px 10px 2px;
        background: var(--k-canvas); color: var(--k-canvas-ink); box-shadow: 0 0 0 1.5px var(--k-canvas-ink); font-size: 11px; font-weight: 600; }
  /* A new note's target: a one-tone hairline after a 2 px gap (the hover mark), held while the note is open */
  .tgt { width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 0 2px var(--k-canvas), 0 0 0 3px var(--k-canvas-ink); }
</style>
</head>
<body>

<nav class="sw" aria-label="States of this mock">
  ${sw}
  <label><input type="checkbox" id="annot">Design notes</label>
</nav>

${states.map((s) => `<!-- ============================ ${s.label} ============================ -->\n${s.html}`).join("\n\n")}

</body>
</html>
`;
if (/[^\x00-\x7F]/.test(html)) throw new Error("non-ASCII in output");
writeFileSync(join(here, "take-a-note.html"), toShell(html)); // the current frame: kit/shell.mjs
console.log(`wrote screens/take-a-note.html, ${states.length} states`);
