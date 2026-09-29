#!/usr/bin/env node
// Builds screens/version-history.html: the data versions in Data > Versions, and reading a past
// version as a view-only mode (interface-templates.md 17, revised after round 3). Six states.
// Run from design/ui/prototype/: node screens/version-history.gen.mjs
// Every count is from kit/fixtures.json: the March transfers (transactions) and April's
// (transactionsApril, with versionDiff, dormant, watchlist and louvain).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toShell } from "../kit/shell.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "../kit/fixtures.json"), "utf8")).datasets;
const M = fx.transactions;
const A = fx.transactionsApril;
const D = A.versionDiff;
const L = A.louvain;
const W = A.watchlist;
const fmt = (n) => n.toLocaleString("en-US");
const GRAPH = M.graphName;
const I = (name, cls = "") => `<svg class="k-i${cls ? " " + cls : ""}"><use href="../kit/icons.svg#${name}"/></svg>`;
const ENGINE = "graphty-element 2.0.0, on the CPU";
// ponytail: the baseline's randomization count is not in fixtures.json; 100 is the mock's assumption (open question)
const RANDOMIZATIONS = 100;
const LARGE = `<span class="k-badge wc-large"><span class="k-warn-glyph">!</span>&nbsp;large change</span>`;

// ---------- What changed: count splits graphty-element computes; the app only formats them ----------
// A line: [headline, split or "", large?]
const wcApril = [
  [`${A.stats.components} components (was ${M.stats.components})`, `${A.dormant.count} accounts have no transfers in this version. <a class="k-link">Select</a>`, true],
  [`${L.april.communities} communities (was ${L.march.communities})`, `${A.dormant.singletonCommunities} are single accounts with no transfers in this version.`, true],
  [`${fmt(A.nodes)} accounts (was ${fmt(M.nodes)})`, `${fmt(D.accountsKept)} in both, ${fmt(D.accountsAdded)} new, ${fmt(D.accountsRemoved)} not in April. <a class="k-link">List</a>`, false],
  [`${fmt(A.edges)} transfers (was ${fmt(M.edges)})`, `${fmt(D.transfersBoth)} in both, ${fmt(D.transfersAdded)} new, ${fmt(D.transfersRemoved)} not in April.`, false],
  [`Watchlist: ${W.inCurrentData} of ${W.members}`, `<span class="k-id">${W.notInCurrentData[0]}</span> and <span class="k-id">${W.notInCurrentData[1]}</span> not in April.`, false],
  [`Rows dropped at import: 0`, "", false],
];
// The restored March data against April, the version before it
const wcRestored = [
  [`${M.stats.components} component (was ${A.stats.components})`, `0 accounts have no transfers in this version.`, true],
  [`${L.march.communities} communities (was ${L.april.communities})`, `Names and colors as March data had them.`, false],
  [`${fmt(M.nodes)} accounts (was ${fmt(A.nodes)})`, `${fmt(D.accountsKept)} in both, ${fmt(D.accountsRemoved)} new, ${fmt(D.accountsAdded)} not in this version. <a class="k-link">List</a>`, false],
  [`${fmt(M.edges)} transfers (was ${fmt(A.edges)})`, `${fmt(D.transfersBoth)} in both, ${fmt(D.transfersRemoved)} new, ${fmt(D.transfersAdded)} not in this version.`, false],
  [`Watchlist: ${W.members} of ${W.members}`, "", false],
];
const wcList = (lines, against) => `<div class="wc-head">What changed, against ${against}</div>
  <ul class="wc" data-mk="wc">${lines.map(([h, s, big]) => `<li><div class="hd"><span class="k-strong k-num">${h}</span>${big ? LARGE : ""}</div>${s ? `<div class="sp k-num">${s}</div>` : ""}</li>`).join("")}</ul>`;
const largeCount = (lines) => lines.filter((l) => l[2]).length;
// A closed row's one-line summary: the element's large-change flags, named
const wcSummary = (lines) => {
  const big = lines.filter((l) => l[2]).map((l) => l[0].replace(/^[\d,]+ /, "").replace(/ \(was.*$/, ""));
  return big.length
    ? `<span class="l2 fact"><span class="k-warn-glyph">!</span> ${big.length === 1 ? "Large change" : big.length + " large changes"}: ${big.join(", ")}</span>`
    : `<span class="l2">No large changes</span>`;
};

// ---------- left panel: Data ----------
const vrow = ({ name, current = false, when, fold = "", sel = false, open = "", summary = "", first = false, mk = "" }) =>
  `<li class="vli"><div class="k-item vrow" role="button"${sel ? ' aria-current="true"' : ""}${fold ? ` aria-expanded="${fold === "open"}"` : ""}${mk ? ` data-mk="${mk}"` : ""}>` +
  `<span class="fold">${fold ? I(fold === "open" ? "chevron-down" : "chevron-right", "k-i-sm") : ""}</span>${I("database")}` +
  `<span class="two"><span class="l1"><span class="k-ellipsis">${name}</span>${current ? `<span class="k-kind">current</span>` : ""}</span>` +
  `<span class="l2">${when}</span>${first ? `<span class="l2">The first version: nothing to compare with.</span>` : summary}</span></div>` +
  (open ? `<div class="vbody">${open}</div>` : "") + `</li>`;

const openAct = (compare = true) => `<div class="dp-acts"><span class="k-btn k-btn-secondary">Show replay report</span>${compare ? `<span class="k-btn k-btn-ghost">Compare with another version...</span>` : ""}</div>`;

const versions = {
  list: vrow({ name: "April data", current: true, when: "May 4, from transfers-2026-04.csv", fold: "open", sel: true, mk: "row", open: wcList(wcApril, "March data (Apr 2)") + openAct() }) +
    vrow({ name: "March data", when: "Apr 2, from transfers-2026-03.csv", first: true, mk: "past" }),
  march: vrow({ name: "April data", current: true, when: "May 4, from transfers-2026-04.csv", fold: "closed", summary: wcSummary(wcApril), mk: "row" }) +
    vrow({ name: "March data", when: "Apr 2, from transfers-2026-03.csv", first: true, sel: true, mk: "past" }),
  restored: vrow({ name: "Restored March data", current: true, when: "Today 09:40, from March data (Apr 2)", fold: "open", sel: true, mk: "row", open: wcList(wcRestored, "April data (May 4)") + openAct() }) +
    vrow({ name: "April data", when: "May 4, from transfers-2026-04.csv", fold: "closed", summary: wcSummary(wcApril) }) +
    vrow({ name: "March data", when: "Apr 2, from transfers-2026-03.csv", first: true, mk: "past" }),
  one: vrow({ name: "transfers-2026-03.csv", current: true, when: "Apr 2, the first load", first: true, sel: true, mk: "row" }),
};

const leftPanel = ({ mode = false, month = "april", list, sources = 2 }) => {
  const file = month === "april" ? "transfers-2026-04.csv" : "transfers-2026-03.csv";
  return `<aside class="k-panel" aria-label="Data">
    <div class="k-panel-head vh-head" data-mk="head">
      <div class="k-title-line"><span class="k-project">Payments network review</span>${I("chevron-down", "k-i-sm k-secondary")}</div>
      <a class="k-privacy">Nothing has been sent from this project</a>
      <div class="chips"><span class="k-chip">${I("file", "k-i-sm")}<span class="k-id">${file}</span></span><span class="k-chip">${I("funnel", "k-i-sm")}Full graph</span>${mode ? `<span class="vo">View only</span>` : ""}</div>
    </div>
    <div class="dp-title"><span class="t">Data</span><span class="k-grow"></span><span class="k-btn k-btn-secondary">Export...</span></div>
    <div class="k-scroll">
      <section class="k-section" data-collapsed><div class="k-section-head">Sources <span class="k-count k-num">${sources}</span></div></section>
      <section class="k-section" data-mk="versions">
        <div class="k-section-head">Versions</div>
        <ul class="dp-list" aria-label="Versions">${list}</ul>
        <div class="dp-foot"><span class="k-btn k-btn-ghost">Export the operation log...</span></div>
      </section>
      <section class="k-section" data-collapsed><div class="k-section-head">Recipes applied <span class="k-count k-num">2</span></div></section>
      <section class="k-section" data-collapsed><div class="k-section-head">Sent and saved from this project</div></section>
    </div>
  </aside>`;
};

// ---------- canvas ----------
const NAMING = {
  april: `Names and colors kept from March data by overlap; ${L.unmatchedApril} new communities numbered ${L.march.communities + 1} to ${L.march.communities + L.unmatchedApril}`,
  march: "Numbered by size, largest first: the first data version",
  restored: "Names and colors as March data had them",
};
const legend = (month, naming = month) => {
  const lg = A.legends[month];
  const max = month === "april" ? A.stats.maxDegree : M.stats.maxDegree;
  return `<div class="k-legend-card" data-mk="legend">
        <div class="k-lg-title">Community color <span class="k-secondary">Louvain community</span></div>
        <div class="k-lg-note">${NAMING[naming]}</div>
        ${lg.rows.map((r) => `<div class="k-lg-row"><span class="k-chit" style="background:${r.color}"></span>${r.name}<span class="k-value">${fmt(r.count)}</span></div>`).join("")}
        <div class="k-lg-row"><span class="k-chit" style="background:#BDBDBD"></span>Other, ${lg.other.communities} communities<span class="k-value">${fmt(lg.other.count)}</span></div><div class="k-lg-sub">${lg.other.holds}</div>
        <div class="k-lg-title" style="margin-top:4px">Size: degree <span class="k-secondary">degree, 1 to ${max}</span></div>
      </div>`;
};
const canvas = ({ month = "april", toast = "", naming = month, mode = false }) => {
  const d = `transactions-${month}-communities`;
  const alt = month === "april" ? "April transfers colored by Louvain community, sized by degree" : "March transfers colored by Louvain community, sized by degree";
  return `<main class="k-main"><div class="k-canvas">
      <div class="k-stage" data-mk="canvas"><img class="k-light-only" src="../kit/canvas/${d}-light.svg" alt="${alt}"><img class="k-dark-only" src="../kit/canvas/${d}-dark.svg" alt="${alt}"></div>
      ${legend(month, naming)}
      <div class="k-toolbar-dock">${toast}
        <div class="k-toolbar" role="toolbar" aria-label="Tools" data-mk="toolbar">
          <span class="k-tool" role="button" aria-pressed="true" aria-label="Select">${I("mouse-pointer-2", "k-i-lg")}</span><span class="k-tool-caret" role="button" aria-label="More tools" aria-haspopup="menu">${I("chevron-down", "k-i-sm")}</span>
          ${mode ? "" : `<span class="k-tool" role="button" aria-pressed="false" aria-label="Path">${I("route", "k-i-lg")}</span>`}
          <span class="k-toolbar-sep"></span>
          <span class="k-tool" role="button" aria-pressed="false" aria-label="Quick actions">${I("zap", "k-i-lg")}</span>
          <span class="k-toolbar-sep"></span>
          <span class="k-tool" role="button" aria-pressed="false" aria-label="View mode (2D / 3D)">${I("square", "k-i-lg")}</span><span class="k-tool-caret" role="button" aria-label="View mode options" aria-haspopup="menu">${I("chevron-down", "k-i-sm")}</span>
        </div>
      </div>
      <span class="k-help" role="button" aria-label="Help and shortcuts">${I("circle-help")}</span>
    </div></main>`;
};

// ---------- right column ----------
const zoom = `<span class="k-btn k-btn-ghost zoom k-num">100%${I("chevron-down", "k-i-sm")}</span>`;
const data = (k, v) => `<div class="k-data"><span class="k-name">${k}</span><span class="k-value">${v}</span></div>`;
const cap = (t) => `<div class="k-caption cap">${t}</div>`;

const inspector = (month) => {
  const n = month === "april" ? A : M;
  const file = month === "april" ? "transfers-2026-04.csv" : "transfers-2026-03.csv";
  // The load's facts only; a column's meaning as a weight is asked by each run, never set on the data.
  const w = "amount: each run that uses it asks what a higher amount means";
  return `<aside class="k-right" aria-label="Inspector">
    <div class="k-header1"><span class="k-grow"></span>${zoom}</div>
    <div class="k-typerow">${I("network")}<span class="k-name">${GRAPH}</span><span class="k-secondary">Graph</span></div>
    <div class="k-scroll">
      <section class="k-section">
        <div class="k-section-head">Overview</div>
        <div class="dp-state">Loaded: ${file}, direction followed. ${w}.</div>
        ${data("accounts", fmt(n.nodes))}${data("transfers", fmt(n.edges))}${data("direction", "directed")}
      </section>
      <section class="k-section" data-collapsed><div class="k-section-head">Style stack</div></section>
      <section class="k-section" data-collapsed><div class="k-section-head">Results</div></section>
    </div>
  </aside>`;
};

const restoreBlock = (mode = "ok") => {
  if (mode === "error") return `<div class="rep-act err" data-mk="restore">
    <div class="err-head">${I("circle-x", "k-danger")}<b>Could not restore March data</b></div>
    <div>The stored copy of March data could not be read from this browser's storage. Nothing changed: April data is still the current version.</div>
    <span class="k-btn k-btn-secondary">Restore version</span>
  </div>`;
  if (mode === "store") return `<div class="rep-act" data-mk="restore">
    <span class="k-btn k-btn-secondary" aria-disabled="true" data-focus-ring>${I("history")}Restore version</span>
    <div class="reason">${I("info", "k-i-sm")}This browser is not keeping versions for this project (a private window, or site storage turned off), so a restored version could not be kept. Download project file saves a copy with its whole history.</div>
    <span class="k-btn k-btn-secondary">${I("download")}Download project file</span>
  </div>`;
  return `<div class="rep-act" data-mk="restore">
    <span class="k-btn k-btn-secondary">${I("history")}Restore version</span>
    <div class="cost">1 slow result will wait for Re-run</div>
    <div class="k-secondary">Adds a new version on top; April data stays in Versions.</div>
  </div>`;
};
const marchReport = (restore) => `<aside class="k-right" aria-label="Past version">
    <div class="k-header1" data-mk="h1"><span class="k-tabs" role="tablist"><span class="k-tab" role="tab" aria-selected="true">Past version</span></span><span class="k-grow"></span>${zoom}<span class="k-btn k-btn-secondary">Done</span></div>
    <div class="k-typerow">${I("database")}<span class="k-name">March data</span><span class="k-secondary">Data version</span></div>
    <div class="k-scroll"><div class="rep" data-mk="report">
      ${restoreBlock(restore)}
      <div class="rep-src">Loaded from <span class="k-id">transfers-2026-03.csv</span>, 2026-04-02 10:12. Read as CSV, directed.</div>
      ${cap("Accounts and transfers")}
      ${data("accounts", fmt(M.nodes))}${data("transfers", fmt(M.edges))}${data("components", M.stats.components)}${data("rows dropped", "0")}
      ${cap("Ran on this version")}
      <ul class="dp-list ops">
        <li class="k-item"><span class="two"><span class="l1"><span class="k-ellipsis">Degree</span></span></span><span class="k-trail">Apr 2</span></li>
        <li class="k-item"><span class="two"><span class="l1"><span class="k-ellipsis">Louvain communities, ${L.march.communities}</span></span></span><span class="k-trail">Apr 2</span></li>
        <li class="k-item"><span class="two"><span class="l1"><span class="k-ellipsis">Modularity vs randomized baseline</span></span></span><span class="k-trail">Apr 3</span></li>
      </ul>
      ${cap("Methods, one sentence per run")}
      <div class="methods">
        <p>Degree on ${GRAPH}, March data (transfers-2026-03.csv): ${fmt(M.nodes)} accounts, ${fmt(M.edges)} transfers, directed; in plus out, unweighted; 1 to ${M.stats.maxDegree}. ${ENGINE}.</p>
        <p>Louvain communities on the same graph: weighted by amount (larger is stronger), direction ignored, resolution 1, seed 11, over the full graph: ${L.march.communities} communities, weighted modularity ${L.march.modularity}. ${ENGINE}.</p>
        <p>Modularity vs randomized baseline: the Louvain partition's weighted modularity ${L.march.modularity} against ${RANDOMIZATIONS} degree-preserving randomizations of the same graph, seed 11; ran 2026-04-03 14:40. ${ENGINE}.</p>
      </div>
      <div class="rep-foot"><span class="k-btn k-btn-ghost">${I("copy")}Copy methods text</span></div>
    </div></div>
  </aside>`;

const toastRestore = `<div class="k-toast" data-mk="toast">March data restored: 2 of 3 results replayed<span class="k-toast-action">Undo</span></div>`;

// ---------- annotation key ----------
const BLOCKED = `<p class="blocked"><b>Blocked:</b> waits on graphty-element data versions. Every version row, What changed line, large-change mark, report and methods sentence here is read from graphty-element; the app computes none of it. Needed in the element: data versions with import reports and the count split between two versions (element-needs.md; framework-changes.md, "Update with new data").</p>`;
const K = {
  head: (mode) => mode
    ? `<b>Left panel header: View only on the chip row, and the file chip names the version on screen.</b> Reading a past version is a mode: the canvas and every panel are view-only until Done. There is no second exit button here; Done in the right column and a click on April data's row both return. <i>interaction-patterns.md 3.7, Read-only; state-matrix.md 2. Proposed: framework-changes.md, "Version history: the list moves to Data &gt; Versions".</i> Mantine <code>Badge</code>; filter chip.`
    : `<b>Left panel header</b> as on every Data panel screen: the project name, the privacy line, the file chip for the current version, the filter chip. No View only: the current version is editable. <i>framework-changes.md, "The Data panel".</i> Mantine <code>Badge</code>, <code>Anchor</code>.`,
  versions: `<b>Data &gt; Versions: every data version, newest first.</b> This is the whole version list; there is no separate Version history column any more. A row names the version (the file's name until Rename..., as "transfers-2026-03.csv" was renamed "March data"), when it was loaded and from what, and marks the latest <i>current</i>. Recipes applied (a recipe that holds only styles among them) keep their own section below; runs are listed in each version's report. Export the operation log... writes the log (runs, loads, restores and every send) as a file. <i>information-architecture.md 3; output-homes.md, the Data panel. Proposed: framework-changes.md, "Version history: the list moves to Data &gt; Versions".</i> <code>ControlSection</code>, <code>Tree</code>, <code>ActionRow</code>.`,
  row: (v) => `<b>The version row carries What changed.</b> ${v} Every line is a count and its split, against the version before, as graphty-element computes it; none states a motive ("not in April", never "closed"). A count that moved by half or more of its earlier value carries the large-change mark, read as part of the line. A closed row keeps one line naming its large changes, so a jump is never hidden by folding. <i>Proposed: framework-changes.md, "Update with new data: ... What changed, the large-change mark".</i> <code>ActionRow</code>, Mantine <code>Badge</code>, <code>Anchor</code>.`,
  wc: `<b>The split lines.</b> Select picks the ${A.dormant.count} accounts with no transfers; List opens the accounts in the table with a column for new, in both and not in April. Both are graphty-element's comparison; the app lays it out. <i>framework-changes.md, "Update with new data".</i> <code>DataRow</code>, Mantine <code>Anchor</code>.`,
  past: (open) => open
    ? `<b>March data, selected and on screen.</b> The first version, so it has no What changed. A click on a past version's row opens it in the view-only mode; a click on the current row, or Done, closes the mode. <i>interaction-patterns.md 3.7; interface-templates.md 17.</i> <code>ActionRow</code>.`
    : `<b>A past version.</b> A click (or Enter) opens it read-only in the view-only mode, state 2. The first version has no What changed: "nothing to compare with". <i>interface-templates.md 17; interaction-patterns.md 3.7.</i> <code>ActionRow</code>.`,
  canvas: (v) => `<b>Canvas: ${v}.</b> Select, hover, Find, orbit and zoom work${v.includes("read-only") ? "; nothing edits" : ""}. Drawn by graphty-element.`,
  legend: (v) => `<b>Legend</b> from the version on screen, with how its groups are named: ${v} Group numbers are matched across data versions by overlap, never renumbered by size on each run (a graphty-element defect today, never an app fix). <i>options-and-encodings.md 6; conceptual-model.md 7.3; framework-changes.md, "Version history: community names are matched across data versions".</i> Drawn by graphty-element.`,
  toolbar: (mode) => mode
    ? `<b>Toolbar, trimmed.</b> Path is gone because it creates something; Select, Quick actions and the view mode stay. <i>interaction-patterns.md 3.7.</i> <code>Toolbar</code>, <code>ToolButton</code>.`
    : `<b>Toolbar, whole:</b> the current version edits. <code>Toolbar</code>, <code>ToolButton</code>.`,
  h1: `<b>The mode holds the right column.</b> One header row: the mode's tab, zoom (the canvas is still navigable), and Done, the mode's only button exit (Esc moves focus to it). The type row names what the column is about: March data, a data version. <i>interface-templates.md 17; framework-changes.md, "The right column has one header row".</i> Mantine <code>Tabs</code>, <code>Menu</code>, <code>Button</code>.`,
  inspector: `<b>The inspector, as usual.</b> Opening Data &gt; Versions does not take over the right column; only reading a past version does. <i>interface-specification.md, the right column.</i> <code>ControlSection</code>, <code>DataRow</code>.`,
  report: `<b>The version's report</b>, top to bottom: Restore version with its cost, where the data came from, its counts, what ran on it, and one methods sentence per run with Copy. Supplied by graphty-element: the import report, the operation log for this version and the methods text (graphty.record.methods). <i>interface-templates.md 17; output-homes.md 2; message-catalog.md graphty.record.methods.</i> <code>ControlSection</code>, <code>DataRow</code>, <code>ProseBlock</code>, <code>Button</code>.`,
  restore: {
    ok: `<b>Restore version, first in the report</b>, with the combined cost of the replay it causes. It appends a new data version (one undo step); April data stays in Versions. The restore is graphty-element's operation. <i>principles.md, "An act that replays runs shows their combined cost first"; output-homes.md 3.</i> Mantine <code>Button</code>.`,
    error: `<b>The error row</b> takes Restore's place: what failed, the cause, that nothing changed, and its one verb. No new row in Versions; April data keeps <i>current</i>. The failure and its verb are graphty-element's (recovery class "retry"). <i>state-matrix.md, Version history, Error; interaction-pattern-entries.md 8.1; content-design.md 4.</i> <code>Alert</code>, <code>Button</code>.`,
    store: `<b>Restore version, disabled and still focusable</b> (aria-disabled), drawn focused: the browser keeps no versions, so a restore could not be kept. The reason names the way out, Download project file. <i>state-matrix.md, Version history, Unsupported; interaction-patterns.md 3.7, Hide or disable.</i> Mantine <code>Button</code>, <code>Tooltip</code>.`,
  },
  toast: `<b>The notice</b> names what happened and offers Undo. The restore closed the mode: the restored data is current, so everything edits again. <i>message-catalog.md graphty.data.replaced (proposed).</i> <code>Notification</code>.`,
};

const states = [
  { n: 1, tab: "1 The list", title: "Data > Versions: April data is current; its What changed is open",
    month: "april", list: versions.list,
    key: [["head", K.head(false)], ["versions", K.versions], ["row", K.row(`April data against March data: the two jumps (1 to ${A.stats.components} components, ${L.march.communities} to ${L.april.communities} communities) are marked, and each says what the count splits into: ${A.dormant.count} accounts have no transfers in this version. Show replay report opens the replay's report; Compare with another version... opens the comparison.`)], ["wc", K.wc], ["past", K.past(false)], ["canvas", K.canvas("April data, the current version")], ["legend", K.legend(`April's ${L.april.communities} communities; ${L.matchedPairs} keep March's names, ${L.unmatchedApril} are new.`)], ["toolbar", K.toolbar(false)], ["inspector", K.inspector]] },
  { n: 2, tab: "2 Viewing March", title: "Viewing an old version: March data, View only",
    mode: true, month: "march", list: versions.march, restore: "ok",
    key: [["head", K.head(true)], ["versions", K.versions], ["row", K.row(`April's row is closed here and keeps one line: its ${largeCount(wcApril)} large changes, named.`)], ["past", K.past(true)], ["canvas", K.canvas("March data as it stood, read-only")], ["legend", "March was the first data version, so its numbers are by size."], ["toolbar", K.toolbar(true)], ["h1", K.h1], ["restore", K.restore.ok], ["report", K.report]] },
  { n: 3, tab: "3 Restored", title: "After Restore version: a new current version with its What changed",
    month: "march", naming: "restored", list: versions.restored, toast: toastRestore,
    key: [["head", K.head(false)], ["versions", K.versions], ["row", K.row(`Restored March data against April data: components fall from ${A.stats.components} to 1, a large change; accounts and transfers split the other way round. April data stays below it, no longer current.`)], ["wc", K.wc.replace("not in April", "not in this version")], ["past", K.past(false)], ["canvas", K.canvas("the restored March data, now the current version")], ["legend", "a restore brings back the names and colors the version had, so a figure or note made on March still matches."], ["toolbar", K.toolbar(false)], ["toast", K.toast], ["inspector", K.inspector]] },
  { n: 4, tab: "4 Restore failed", title: "Restore failed: April data is still current",
    mode: true, month: "march", list: versions.march, restore: "error",
    key: [["head", K.head(true)], ["versions", K.versions], ["row", K.row("Unchanged: the failed restore added no row.")], ["past", K.past(true)], ["canvas", K.canvas("still March data, read-only")], ["legend", "March's."], ["toolbar", K.toolbar(true)], ["h1", K.h1], ["restore", K.restore.error], ["report", K.report]] },
  { n: 5, tab: "5 No storage", title: "Storage unavailable: Restore version disabled with its reason",
    mode: true, month: "march", list: versions.march, restore: "store",
    key: [["head", K.head(true)], ["versions", K.versions], ["row", K.row("As in state 2.")], ["past", K.past(true)], ["canvas", K.canvas("March data, read-only")], ["legend", "March's."], ["toolbar", K.toolbar(true)], ["h1", K.h1], ["restore", K.restore.store], ["report", K.report]] },
  { n: 6, tab: "6 One version", title: "One version: a project just loaded",
    month: "march", list: versions.one, sources: 1,
    key: [["head", K.head(false)], ["versions", K.versions], ["row", `<b>One version.</b> No chevron, no What changed ("The first version: nothing to compare with"), nothing to open: it is current. Its name is still the file's. <i>interface-templates.md 17, States: one entry.</i> <code>ActionRow</code>.`], ["canvas", K.canvas("the only version")], ["legend", "numbered by size: the first data version."], ["toolbar", K.toolbar(false)], ["inspector", K.inspector]] },
];

const frame = (s) => {
  let html = `<div class="k-app">
  <nav class="k-rail" aria-label="Main">
    <div class="k-rail-btn" role="button" aria-label="Main menu"><span class="k-rail-pill">${I("menu")}</span></div>
    <div class="k-rail-sep"></div>
    <div class="k-rail-btn" role="button" aria-pressed="false"><span class="k-rail-pill">${I("network")}</span>Graph</div>
    <div class="k-rail-btn" role="button" aria-pressed="true"><span class="k-rail-pill">${I("database")}</span>Data</div>
    <div class="k-rail-btn" role="button" aria-pressed="false"><span class="k-rail-pill">${I("sticky-note")}</span>Notes</div>
    <div class="k-rail-btn k-asst-off" role="button" aria-pressed="false" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div>
  </nav>
  ${leftPanel({ mode: !!s.mode, month: s.month, list: s.list, sources: s.sources || 2 })}
  ${canvas({ month: s.month, toast: s.toast || "", naming: s.naming || s.month, mode: !!s.mode })}
  ${s.mode ? marchReport(s.restore) : inspector(s.month).replace('<aside class="k-right"', '<aside class="k-right" data-mk="inspector"')}
</div>`;
  const ord = s.key.map(([id]) => id);
  const seen = new Set();
  html = html.replace(/(class="([^"]*)")([^>]*?) data-mk="([a-z0-9]+)"/g, (m, c, cls, mid, id) => {
    const i = ord.indexOf(id);
    if (i < 0 || seen.has(id)) return `${c}${mid}`;
    seen.add(id);
    return `class="${cls} an-t an-r" data-n="${i + 1}"${mid}`;
  });
  const missing = ord.filter((id) => !seen.has(id));
  if (missing.length) throw new Error(`state ${s.n}: no region for ${missing.join(", ")}`);
  const legendText = (t) => (t.startsWith("<b>") ? t : K.legend(t));
  const key = `<div class="an an-key"><h2>${s.title}</h2>${BLOCKED}<ol>${s.key.map(([id, t]) => `<li>${id === "legend" ? legendText(t) : t}</li>`).join("")}</ol></div>`;
  return `<div class="st" data-st="${s.n}">\n${html}\n${key}\n</div>`;
};

const N = states.map((s) => s.n);
const css = `
  .anchor { position: fixed; top: 0; left: 0; width: 0; height: 0; }
  body:not(:has(.anchor:target)) .st:not([data-st="1"]) { display: none; }
${N.map((n) => `  body:has(#s${n}:target, #s${n}a:target) .st:not([data-st="${n}"]) { display: none; }`).join("\n")}
  :root:has(#dark:checked) { color-scheme: dark; }
  :root:has(#dark:checked) .k-light-only { display: none !important; }
  :root:has(#dark:checked) .k-dark-only { display: revert !important; }
  body { background: var(--cm-bg); color: var(--cm-text); margin: 0; }

  /* The mock's own controls, in annotation ink so nobody reads them as product UI */
  .m-bar { position: fixed; z-index: 200; top: 8px; left: 306px; display: flex; align-items: center; gap: 2px; padding: 4px 8px; border-radius: 8px; background: var(--k-annot-bg); border: 1px solid var(--k-annot); font-size: 11px; white-space: nowrap; }
  .m-bar a { padding: 2px 6px; border-radius: 5px; color: var(--cm-text); text-decoration: none; }
  body:not(:has(.anchor:target)) .m-bar a[href="#s1"],
${N.map((n) => `  body:has(#s${n}:target, #s${n}a:target) .m-bar a[href="#s${n}"]`).join(",\n")} { background: var(--k-annot); color: #fff; }
  .m-bar label { display: flex; align-items: center; gap: 4px; margin-inline-start: 8px; color: var(--k-annot-ink); font-weight: 600; }

  /* Annotation layer */
  .an { display: none; }
  body:has(#annot:checked) .an, body:has(.anchor[id$="a"]:target) .an { display: block; }
  body:has(#annot:checked) .an-t, body:has(.anchor[id$="a"]:target) .an-t { outline: 2px dashed var(--k-annot); outline-offset: -2px; }
  body:has(#annot:checked) .an-t::after, body:has(.anchor[id$="a"]:target) .an-t::after {
    content: attr(data-n); position: absolute; z-index: 95; top: 2px; right: 2px; display: grid; place-items: center;
    min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px; background: var(--k-annot); color: #fff;
    font-size: 11px; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; }
  .an-r { position: relative; }
  .an-key { position: fixed; z-index: 150; left: 312px; top: 44px; width: 640px; max-height: 846px; overflow: auto; padding: 10px 14px 12px; border-radius: 8px; background: var(--k-annot-bg); border-inline-start: 3px solid var(--k-annot); box-shadow: var(--cm-elevation-300); font-size: 11px; line-height: 15px; }
  .an-key h2 { margin: 0 0 4px; font-size: 12px; color: var(--k-annot-ink); }
  .an-key .blocked { margin: 0 0 6px; padding: 4px 6px; border: 1px solid var(--k-annot); border-radius: 5px; }
  .an-key ol { margin: 0; padding-inline-start: 22px; }
  .an-key li { margin: 0 0 4px; }
  .an-key li::marker { color: var(--k-annot-ink); font-weight: 700; }
  .an-key i { color: var(--cm-text-secondary); font-style: normal; }
  .an-key code { font-family: inherit; font-weight: 600; }

  /* Left panel: Data, as screens/data-panel.html draws it */
  .vh-head .k-title-line { height: auto; }
  .vh-head .k-project { white-space: normal; overflow-wrap: anywhere; }
  .chips { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; }
  .vo { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 10px; background: var(--cm-bg-secondary); color: var(--cm-text); font-size: 11px; font-weight: 550; white-space: nowrap; }
  .dp-title { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 8px 0 16px; border-bottom: 1px solid var(--cm-border); flex: none; }
  .dp-title .t { font-size: 13px; line-height: 22px; font-weight: 550; }
  .dp-list { list-style: none; margin: 0; padding: 0; }
  .dp-list .k-item { height: auto; min-height: 32px; align-items: flex-start; margin: 0 8px; }
  .dp-list .k-item::before { inset: 2px 0; }
  .dp-list .k-item > .fold, .dp-list .k-item > svg { margin-top: 8px; }
  .dp-list .two { display: flex; flex-direction: column; min-width: 0; flex: 1; line-height: 16px; padding: 4px 0; }
  .dp-list .l1 { display: flex; gap: 6px; min-width: 0; align-items: baseline; }
  .dp-list .l2 { color: var(--cm-text-secondary); font-size: 11px; white-space: normal; }
  .dp-list .l2.fact { color: var(--cm-text); }
  .dp-list .fold { display: inline-grid; place-items: center; width: 12px; margin-inline-start: -8px; color: var(--cm-icon-secondary); flex: none; }
  .dp-list .k-trail { white-space: nowrap; color: var(--cm-text-secondary); margin-top: 4px; }
  .dp-foot { padding: 2px 8px 8px 8px; font-size: 11px; line-height: 16px; }
  .dp-acts { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px 8px 8px 36px; }
  .dp-state { padding: 2px 8px 4px 16px; font-size: 11px; line-height: 16px; color: var(--cm-text); }
  .vli { list-style: none; }
  .vrow[aria-current="true"]::before { background: var(--cm-bg-selected); }
  .vbody { padding: 0 0 4px; border-bottom: 1px solid var(--cm-border); margin-bottom: 4px; }
  .wc-head { padding: 2px 8px 2px 36px; color: var(--cm-text-secondary); font-size: 11px; line-height: 16px; }
  .wc { list-style: none; margin: 0; padding: 0 8px 0 36px; font-size: 11px; line-height: 16px; }
  .wc li { padding: 4px 0; border-top: 1px solid var(--cm-border); }
  .wc li:first-child { border-top: 0; }
  .wc .hd { display: flex; flex-wrap: wrap; gap: 2px 6px; align-items: center; }
  .wc .sp { color: var(--cm-text); }
  .wc-large { white-space: nowrap; }
  .wc.an-t::after { right: auto !important; left: -24px; }

  /* Right column: the past version's report */
  .k-header1 .zoom { gap: 2px; padding: 0 4px; }
  .k-header1 .k-tabs { flex: none; }
  .rep { padding-bottom: 8px; }
  .rep-src { padding: 4px 8px 2px 16px; color: var(--cm-text-secondary); line-height: 16px; }
  .rep .k-caption.cap { padding: 8px 16px 0 16px; }
  .ops .k-item { margin: 0 8px; min-height: 28px; }
  .ops .two { padding: 6px 0; }
  .methods { margin: 4px 8px 0 16px; padding: 4px 8px; border-radius: 5px; background: var(--cm-bg-secondary); color: var(--cm-text); font-size: 11px; line-height: 15px; }
  .methods p { margin: 0 0 4px; } .methods p:last-child { margin: 0; }
  .rep-foot { display: flex; gap: 8px; padding: 6px 8px 0 12px; }
  .rep-act { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; margin: 8px 8px 8px 16px; line-height: 16px; }
  .rep-act .k-btn { margin-bottom: 2px; }
  .rep-act .cost { font-weight: 550; }
  .rep-act .reason { display: flex; gap: 4px; color: var(--cm-text); }
  .rep-act .reason .k-i { flex: none; margin-top: 2px; }
  .rep-act.err { padding: 6px 8px; border-radius: 5px; border: 1px solid var(--cm-border-danger-strong); }
  .err-head { display: flex; align-items: center; gap: 6px; }
  .k-legend-card { max-width: 232px; }
  .k-lg-note { color: var(--cm-text-secondary); font-size: 11px; line-height: 14px; margin: 0 0 2px; }
`;

const out = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Data versions, Payments network review</title>
<!-- Built by screens/version-history.gen.mjs from kit/fixtures.json; edit that script and re-run it. -->
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>${css}</style>
</head>
<body data-dataset="transactionsApril">
${N.map((n) => `<span class="anchor" id="s${n}"></span><span class="anchor" id="s${n}a"></span>`).join("")}
<div class="m-bar" aria-label="Mock states">
  ${states.map((s) => `<a href="#s${s.n}">${s.tab}</a>`).join("")}
  <label><input type="checkbox" id="dark"> Dark</label>
  <label><input type="checkbox" id="annot"> Annotations</label>
</div>
${states.map(frame).join("\n")}
</body>
</html>
`;
if (/[^\x00-\x7f]/.test(out)) throw new Error("non-ASCII in output");
writeFileSync(join(here, "version-history.html"), toShell(out)); // the current frame: kit/shell.mjs
console.log("wrote screens/version-history.html,", states.length, "states");
