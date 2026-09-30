#!/usr/bin/env node
// Builds screens/first-look.html: the eleven states the first-look storyboard shows, each 1440 x 900,
// with an annotation layer. Run from design/ui/prototype/: node screens/first-look.gen.mjs
//
// Numbers: kit/fixtures.json (datasets.lesmis), the published Les Miserables graph: nodes keyed by
// position with a "name", links by position, one component, no self-loop. Elena's copy differs
// from it in one way: every value is written as text ("8"), as a spreadsheet-to-JSON export writes it.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toShell } from "../kit/shell.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const lm = JSON.parse(readFileSync(join(here, "../kit/fixtures.json"), "utf8")).datasets.lesmis;
const top = lm.topByBetweenness;
const GC = lm.groupColors;
const DENSITY = lm.stats.density.toFixed(4);
const V = lm.rows.find((r) => r.label === "Valjean");
const btwRank = (label) => [...lm.rows].sort((a, b) => b.betweenness - a.betweenness).findIndex((r) => r.label === label) + 1;
const zeros = lm.rows.filter((r) => r.betweenness === 0).length;

// ---------- builders ----------
const I = (n, cls = "") => `<svg class="k-i ${cls}"><use href="../kit/icons.svg#${n}"/></svg>`;
const ann = (x, y, w, html) => `<div class="k-annot-note fl-an" style="left:${x}px;top:${y}px;max-width:${w}px">${html}</div>`;
const fr = (text) => `<span class="fl-fig">Figma: ${text}</span>`; // the Figma departure clause
const heard = (focus, spoken) => `<b>Keyboard focus:</b> ${focus}<br><b>Screen reader hears:</b> ${spoken}`;
const icoBtn = (n, extra = "") => `<span class="k-icon-btn" ${extra}>${I(n)}</span>`;

function rail({ graph = true } = {}) {
    const b = (icon, label, attrs = "") => `<div class="k-rail-btn" ${attrs}><span class="k-rail-pill">${I(icon)}</span>${label}</div>`;
    return `<nav class="k-rail" aria-label="Main">${b("menu", "")}<div class="k-rail-sep"></div>${b("network", "Graph", graph ? 'aria-pressed="true"' : "")}<div class="k-rail-btn k-asst-off" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div>${b("flask-conical", "Results")}${b("sticky-note", "Notes")}</nav>`;
}

function panelHead({ notSaved, file }) {
    const pill = notSaved ? `<span class="k-badge k-secondary fl-unsaved" data-annot>Not saved</span>` : "";
    const fileChip = file ? `<span class="k-chip fl-file" data-annot>${I("file", "k-i-sm")}<span class="k-id">miserables.json</span></span>` : "";
    return `<div class="k-panel-head"><div class="k-title-line"><span class="k-project">Les Miserables</span>${I("chevron-down", "k-i-sm k-secondary")}${pill}<span class="k-grow"></span></div><div class="fl-chips">${fileChip}<span class="k-chip">${I("funnel", "k-i-sm")}Full graph</span></div></div>`;
}

function graphPanel(o) {
    return `<aside class="k-panel" aria-label="Graph">${panelHead(o)}<div class="k-scroll">
<section class="k-section"><div class="k-section-head">Graphs<span class="k-grow"></span>${icoBtn("search")}${icoBtn("plus")}</div><ul class="k-list"><li class="k-item" aria-selected="true">${I("network")}<span class="k-grow k-ellipsis">Co-appearances</span><span class="k-trail k-num"><span data-fx="datasets.lesmis.nodes" data-fx-noun="nodes">77 nodes</span></span></li></ul></section>
<section class="k-section" data-empty><div class="k-section-head">Sets and paths<span class="k-grow"></span>${icoBtn("plus")}</div></section>
<section class="k-section"><div class="k-section-head">Styles<span class="k-grow"></span>${icoBtn("plus")}</div><ul class="k-list">
<li class="k-item"><svg class="k-sizechip" viewBox="0 0 16 12"><circle cx="3" cy="8" r="2" fill="#808080"/><circle cx="10" cy="6" r="5" fill="#808080"/></svg><span class="k-ellipsis">Size: degree</span><span class="k-kind">sample</span></li>
<li class="k-item"><span class="k-chit" style="background:conic-gradient(${GC[2]} 0 25%,${GC[8]} 0 50%,${GC[4]} 0 75%,${GC[1]} 0)"></span><span class="k-ellipsis">Group color</span><span class="k-kind">sample</span></li>
<li class="k-item"><span class="k-chit" style="background:#808080"></span><span class="k-ellipsis">Base style</span></li></ul></section></div></aside>`;
}

const legend = `<div class="k-legend-card" data-annot><div class="k-lg-title">Group color <span class="k-secondary">group</span></div>
<div class="k-lg-row"><span class="k-chit" style="background:${GC[2]}"></span>2<span class="k-value">${lm.attributes[1].values[2]}</span></div>
<div class="k-lg-row"><span class="k-chit" style="background:${GC[8]}"></span>8<span class="k-value">${lm.attributes[1].values[8]}</span></div>
<div class="k-lg-row"><span class="k-chit" style="background:${GC[4]}"></span>4<span class="k-value">${lm.attributes[1].values[4]}</span></div>
<div class="k-lg-row k-secondary">7 more</div>
<div class="k-lg-title" style="margin-top:4px">Size: degree <span class="k-secondary">degree</span></div>
<div class="k-lg-row"><span class="fl-sz" style="width:6px;height:6px"></span>1<span class="k-grow"></span><span class="fl-sz" style="width:14px;height:14px"></span>36</div></div>`;

function toolbar(pressed = ["select"]) {
    const t = (key, icon, extra = "") => `<span class="k-tool" ${pressed.includes(key) ? 'aria-pressed="true"' : ""} ${extra}>${I(icon, "k-i-lg")}</span>`;
    const caret = `<span class="k-tool-caret">${I("chevron-down", "k-i-sm")}</span>`;
    return `<div class="k-toolbar" role="toolbar">${t("select", "mouse-pointer-2")}${caret}${t("path", "route")}<span class="k-toolbar-sep"></span>${t("quick", "zap", pressed.includes("quick") ? "data-annot" : "")}<span class="k-toolbar-sep"></span>${t("frame", "square")}${caret}</div>`;
}

function canvas({ drawing = "lesmis-groups-rest", inStage = "", over = "", pressed, toast = "" }) {
    return `<main class="k-main"><div class="k-canvas"><div class="k-stage"><img class="k-light-only" src="../kit/canvas/${drawing}-light.svg" alt="Les Miserables, 77 characters, colored by group and sized by degree"><img class="k-dark-only" src="../kit/canvas/${drawing}-dark.svg" alt="Les Miserables, 77 characters, colored by group and sized by degree">${inStage}</div>${legend}${over}<div class="k-toolbar-dock">${toast}${toolbar(pressed)}</div><span class="k-help">${I("circle-help")}</span></div></main>`;
}

const header = `<div class="k-header1"><span class="k-grow"></span><span class="k-btn" data-annot>Export files...</span></div><div class="k-header2"><span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">100%${I("chevron-down", "k-i-sm")}</span></div>`;
const exportSection = `<section class="k-section" data-empty><div class="k-section-head">Export<span class="k-grow"></span>${icoBtn("plus")}</div></section>`;

function inspectorGraph() {
    const hist = [100, 58, 77, 72, 38, 38, 19, 19, 0, 0, 0, 0, 19].map((h) => `<i style="height:${h}%"></i>`).join("");
    return `<aside class="k-right" aria-label="Inspector">${header}<div class="k-typerow">${I("network")}<span class="k-name">Co-appearances</span><span class="k-secondary">Graph</span></div><div class="k-scroll">
<section class="k-section"><div class="k-section-head">Layout</div><div class="k-row"><span class="k-grow">Force-directed</span><span class="k-btn k-btn-ghost">Run</span></div></section>
<section class="k-section" data-annot><div class="k-section-head">Statistics<span class="k-grow"></span>${icoBtn("ellipsis")}</div>
<div class="k-row"><span class="k-grow">Overview: General</span><span class="k-btn k-btn-ghost k-show-hover">Change overview...</span></div>
<div class="k-metrics"><div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big">${lm.nodes}</span></div><div class="k-metric"><span class="k-secondary">edges</span><span class="k-big">${lm.edges}</span></div><div class="k-metric"><span class="k-secondary">components</span><span class="k-big">${lm.stats.components}</span></div><div class="k-metric"><span class="k-secondary">isolated</span><span class="k-big">${lm.stats.isolated}</span></div></div>
<div class="k-data"><span class="k-name">density</span><span class="k-value k-num">${DENSITY}</span></div>
<div class="k-data"><span class="k-name">average degree</span><span class="k-value k-num">${lm.stats.averageDegree}</span></div>
<div class="k-data"><span class="k-name">highest degree</span><span class="k-value k-num">${lm.stats.maxDegree}</span></div>
<div class="k-hist" title="Degree distribution">${hist}</div><div class="fl-axis k-secondary k-num"><span>degree 0</span><span>36</span></div>
<div class="k-row">${I("history")}<span class="k-grow k-ellipsis">Last import: value read as number</span></div>
<div class="k-row">${I("spline")}<span class="k-grow">Undirected</span></div>
<div class="k-fieldrow fl-role" data-annot><span class="k-legend">value <span class="fl-mark">-- asked by each run</span></span><div class="k-fields"><span class="k-field k-span" data-placeholder>Set up value...${I("chevron-down", "k-i-sm k-caret")}</span></div></div>
<div class="k-row">${I("table")}<span class="k-grow">3 attributes</span></div></section>${exportSection}</div></aside>`;
}

function inspectorNode({ betweenness = false, note = "" } = {}) {
    const rank = (r) => `<span class="fl-rank">${r}</span>`;
    const btw = betweenness ? `<div class="k-data"><span class="k-name">betweenness <span class="k-secondary">(unweighted)</span></span><span class="k-value k-num">${V.betweenness}${rank(`#${btwRank("Valjean")} of ${lm.nodes}`)}</span></div>` : "";
    const notes = note ? `<section class="k-section" data-annot><div class="k-section-head">Notes<span class="k-grow"></span>${icoBtn("plus")}</div>${note}</section>` : "";
    return `<aside class="k-right" aria-label="Inspector">${header}<div class="k-typerow">${I("circle-dot")}<span class="k-name k-id">Valjean</span><span class="k-secondary">Node</span><span class="k-grow"></span>${icoBtn("ellipsis")}</div><div class="k-scroll">
<section class="k-section" data-annot><div class="k-section-head">Attributes</div>${btw}
<div class="k-data"><span class="k-name">degree</span><span class="k-value k-num">36${rank("#1 of 77")}</span></div>
<div class="k-data"><span class="k-name">group</span><span class="k-value"><span class="k-chit" style="background:${GC[2]};vertical-align:-2px"></span> 2</span></div></section>
<section class="k-section"><div class="k-section-head">Connections</div><div class="k-row"><span class="k-grow"><span data-fx="datasets.lesmis.valjeanNeighbors" data-fx-noun="neighbors">36 neighbors</span></span></div><div class="k-row"><span class="k-grow"><span data-fx="datasets.lesmis.rows.11.degree" data-fx-noun="edges">36 edges</span></span></div></section>
<section class="k-section"><div class="k-section-head">Appearance</div>
<div class="k-fieldrow"><span class="k-legend">Color <span class="k-tertiary">-- Group color</span></span><div class="k-fields"><span class="k-field k-span"><span class="k-pill"><span class="k-chit" style="background:${GC[2]}"></span>group</span></span></div></div>
<div class="k-fieldrow"><span class="k-legend">Size <span class="k-tertiary">-- Size: degree</span></span><div class="k-fields"><span class="k-field k-span"><span class="k-pill">${I("circle-dot", "k-i-sm")}degree</span></span></div></div></section>${notes}${exportSection}</div></aside>`;
}

const app = (left, main, right) => `<div class="k-app">${rail()}${left}${main}${right}</div>`;
const state = (id, label, inner) => `<section class="fl-state" id="${id}"><h2 class="fl-label">${label}</h2><div class="fl-win" data-kit-frame>${inner}</div></section>`;

// ---------- 1. Start screen (from screens/start-screen.html state 1, Les Miserables hovered) ----------
const thumb = (img, name, size, hover = false) => `<div class="ss-thumb"${hover ? " data-hover" : ""}><img class="k-light-only" src="../kit/canvas/${img}-light.svg" alt=""><img class="k-dark-only" src="../kit/canvas/${img}-dark.svg" alt=""><div class="ss-thumb-label"><span class="k-grow"><b class="k-ellipsis" style="display:block">${name}</b><span class="k-secondary k-num">${size}</span></span>${I("info", "k-i-sm ss-i")}</div></div>`;
const s1 = state("s1", "1. Start screen, first run: no recent projects; the pointer rests on Les Miserables", `<div class="fl-start">
<nav class="k-rail" aria-label="Main"><div class="k-rail-btn" aria-label="Main menu"><span class="k-rail-pill">${I("menu")}</span></div></nav>
<div class="ss-col"><h1>Open a graph</h1>
<p class="ss-privacy" data-annot>${I("lock", "k-i-sm")}Files stay on this computer. graphty reads them in this browser and uploads nothing.</p>
<section class="ss-ask" role="group" aria-labelledby="ss-ask-h" data-annot><div class="ss-ask-h" id="ss-ask-h">Your data is yours, but please help us</div>
<p>graphty will never see the data you analyze. We would like to collect how you use the app, so we can make it better. That record is only ever used by graphty's author and his Claude Code sessions.</p>
<p class="k-secondary">Nothing is collected unless you say yes. You can change this any time in Preferences.</p>
<div class="ss-ask-foot"><span class="k-btn k-btn-secondary">Yes, share how I use graphty</span><span class="k-btn k-btn-secondary">No thanks</span></div></section>
<div class="ss-h">Samples</div>
<div class="ss-thumbs" data-annot>${thumb("karate-plain", "Karate club", '<span data-fx="datasets.karate.nodes" data-fx-noun="members">34 members</span>')}${thumb("lesmis-groups-rest", "Les Miserables", '<span data-fx="datasets.lesmis.nodes" data-fx-noun="characters">77 characters</span>', true)}${thumb("ppi-modules", "Protein interactions", '<span data-fx="datasets.ppi.nodes" data-fx-noun="proteins">300 proteins</span>')}${thumb("transactions-density", "Bank transfers", '<span data-fx="datasets.transactions.nodes" data-fx-noun="accounts">3,000 accounts</span>')}</div>
<div class="ss-drop">${I("folder-open")}<span class="k-grow">Open... <span class="k-secondary">or drop a file here</span></span><span class="k-kbd">Ctrl+O</span></div>
<div class="k-row ss-row" style="margin-top:4px" data-annot>${I("plug")}<span class="k-grow">Connect to data source... <span class="k-secondary">sends only the query, to the named source</span></span></div>
<p class="ss-formats">Reads CSV, JSON, GraphML, GEXF, GML, DOT, Pajek and Neo4j exports.</p></div>
<span class="k-icon-btn ss-help">${I("circle-help")}</span>
<span class="k-cursor" style="left:545px;top:390px"></span>
${ann(1180, 60, 240, `The privacy line, before anything loads. The framework has no such line; proposed in framework-changes.md as a hypothesis to test. Mantine <b>Text</b>, secondary ink, lock icon. It stays true while no Assistant provider is set (the Assistant is off until one is).`)}
${ann(1180, 150, 240, `The first-use question about usage data. It shows once, on the first start, and usage data stays off until the reader says yes: the two answers weigh the same, neither is chosen, and closing the app without answering leaves it off. It never covers the samples or Open, so a reader can ignore it and start. Graph content is never collected, answer or not. The answer is kept in Preferences. Mantine <b>Paper</b> with two <b>Button</b>s, variant default.`)}
${ann(1180, 345, 240, `Samples, by name, size and a picture of the saved look. <i>interface-templates.md 19</i>; <i>information-architecture.md 3</i>. <b>ActionRow</b> with a thumbnail; (i) is <b>InfoCircle</b>. Hover draws the outline; it moves no focus.`)}
${ann(1180, 560, 240, `Connect to data source... says what does leave: the query. Proposed in framework-changes.md. <b>ActionRow</b>.`)}
${ann(20, 330, 250, heard(`the page title; the next Tab reaches the usage question's first answer, then the samples list (one Tab stop, on Karate club). The pointer is on Les Miserables, but hovering moves no focus.`, `on load, "Open a graph. Files stay on this computer. graphty reads them in this browser and uploads nothing." The line is the title's accessible description. Then "Your data is yours, but please help us, group", with the question's text, and "Yes, share how I use graphty, button".`))}
</div>`);

// ---------- 2a. The sample open as an unkept copy; a file dragged over ----------
const s2a = state("s2a", "2a. The sample is open as a copy that is not kept yet; Elena drags her own file over the canvas", `${app(graphPanel({ notSaved: true }), canvas({ over: `<div class="fl-drop" data-annot><div>${I("upload", "k-i-lg")}<b>Drop to choose what happens to this file</b><span class="k-secondary">The columns are checked before anything loads.</span></div></div><div class="fl-dragged" style="left:700px;top:430px">${I("file")}miserables.json</div>` }), inspectorGraphSample())}
${ann(300, 60, 250, `Not saved: the sample opened as your own copy, as Figma opens a Community file as a copy. It is not kept until you make something in it (a run, a style, a set or a note). Existing mark, <i>glossary.md</i> 10; the sample rule is proposed in framework-changes.md. Mantine <b>Badge</b>.`)}
${ann(820, 110, 250, `The drop target names no file: a browser does not reveal a dragged file's name until the drop. ${fr("a drop lands content where it falls; here a choice step follows, because one file can mean several things on a loaded graph (interaction-pattern-entries.md 4.5).")} Mantine <b>Dropzone</b> (not yet in compact-mantine).`)}
${ann(820, 500, 250, `The dragged file's picture and name are drawn by the operating system, not by graphty.`)}
${ann(310, 560, 230, `Colors and sizes come from the sample's own style layers, Size: degree and Group color, listed under Styles and in the legend. ${fr("the canvas carries no chrome but the toolbar and Help; here one legend (figma-crosswalk.md 4.1, 'The canvas carries no chrome').")} Legend drawn by graphty-element.`)}
${ann(960, 640, 230, heard(`the canvas, where the sample opened. A drag moves no focus.`, `on open, "Les Miserables sample opened as a copy: <span data-fx="datasets.lesmis.nodes" data-fx-noun="nodes">77 nodes</span>, <span data-fx="datasets.lesmis.edges" data-fx-noun="edges">254 edges</span>. Not saved." During the drag, nothing: a drag is pointer-only, and File, Open... and paste are the keyboard routes.`))}`);

function inspectorGraphSample() {
    // The sample before her file arrives: the same graph and statistics, with no import row.
    return inspectorGraph().replace(/<div class="k-row"><svg class="k-i "><use href="..\/kit\/icons.svg#history"\/><\/svg><span class="k-grow k-ellipsis">Last import: value read as number<\/span><\/div>/, "");
}

// ---------- 2b. The drop choice step ----------
const choice = (icon, title, sub, attrs = "") => `<div class="k-row fl-choice" ${attrs}>${I(icon)}<span class="k-grow"><b>${title}</b><br><span class="k-secondary">${sub}</span></span></div>`;
const s2b = state("s2b", "2b. The drop choice step: two ways first, the rest one click away; Elena moves to Update with new data", `${app(graphPanel({ notSaved: true }), canvas({}), inspectorGraphSample())}
<div class="k-backdrop"><div class="k-modal" data-annot><div class="k-modal-head">${I("file")}&nbsp;<span class="k-id">miserables.json</span><span class="k-grow"></span>${icoBtn("x")}</div><div class="k-modal-body"><div class="k-prose" style="padding:0 16px 8px">A graph file: JSON with nodes and links. What should happen to it?</div>
${choice("folder-open", "Open as a new project", "Only this file, in its own project. The sample copy stays as it is.")}
${choice("refresh-cw", "Update with new data...", "This file's nodes and edges, drawn with the sample's colors and sizes.", 'aria-selected="true" data-focus')}
<div class="k-row fl-more">${I("chevron-right", "k-i-sm")}<span class="k-grow">More ways <span class="k-secondary">Add data, Add as another graph, Join</span></span></div>
</div><div class="k-modal-foot"><span class="k-btn k-btn-secondary">Cancel</span></div></div></div>
<span class="k-cursor" style="left:780px;top:462px"></span>
${ann(1000, 250, 250, `While the open project is an unkept sample copy, the step leads with the two choices a first visit needs; the other three sit behind More ways. Each row commits its own result; there is no Continue. Proposed in framework-changes.md. compact-mantine <b>ActionRow</b>s in a Mantine <b>Modal</b> with <b>ModalFooter</b>. ${fr("a drop lands content; here a choice step (interaction-pattern-entries.md 4.5).")}`)}
${ann(1000, 495, 250, heard(`Open as a new project when the step opens; she pressed Down once, so it is on Update with new data. Enter or a click commits the row.`, `"miserables.json, dialog. A graph file: JSON with nodes and links. What should happen to it? Open as a new project, 1 of 3." On Down: "Update with new data. Your file's nodes and edges, drawn with this sample's colors and sizes, 2 of 3."`))}`);

// ---------- 3a / 3b. The load step ----------
const edges5 = [["Napoleon", "Myriel", 1], ["Mlle.Baptistine", "Myriel", 8], ["Mme.Magloire", "Myriel", 10], ["Mme.Magloire", "Mlle.Baptistine", 6], ["CountessdeLo", "Myriel", 1]];
function loadStep(menuOpen) {
    // The warning rule of framework-changes.md, "which load issues block Load": every value is a
    // number written as text, so the default policy keeps every value (Read as number) and Load stays on.
    const roleMenu = menuOpen
        ? `<div class="k-menu fl-rolemenu"><div class="k-menu-item"><span class="k-check-col"></span><span class="k-grow">a closer or stronger link<br><span class="fl-gloss">similarity</span></span></div><div class="k-menu-item"><span class="k-check-col"></span><span class="k-grow">a longer or costlier step<br><span class="fl-gloss">distance</span></span></div><div class="k-menu-item"><span class="k-check-col"></span><span class="k-grow">more can pass through<br><span class="fl-gloss">capacity</span></span></div><div class="k-menu-item" data-hover><span class="k-check-col"></span><span class="k-grow">Don't use value<br><span class="fl-gloss">no measure reads it, as while unanswered</span></span></div></div>`
        : "";
    return `<div class="k-backdrop"><div class="k-modal k-modal-wide" style="width:880px;position:relative"><div class="k-modal-head">Load&nbsp;<span class="k-id">miserables.json</span><span class="k-grow"></span>${icoBtn("x")}</div><div class="k-modal-body"><div class="fl-cols"><div style="position:relative">
<div class="k-fieldrow" data-annot><span class="k-legend">What happens</span><div class="k-fields"><span class="k-field k-span">Update with new data${I("chevron-down", "k-i-sm k-caret")}</span></div></div>
<div class="k-fieldrow"><span class="k-legend">Format</span><div class="k-fields"><span class="k-field k-span">JSON: nodes and links${I("chevron-down", "k-i-sm k-caret")}</span></div></div>
<div class="k-fieldrow"><span class="k-legend">Nodes from <b>nodes</b>, label</span><div class="k-fields"><span class="k-field k-span k-id">name${I("chevron-down", "k-i-sm k-caret")}</span></div></div>
<div class="k-fieldrow"><span class="k-legend">Edges from <b>links</b>, by position in nodes</span><div class="k-fields"><span class="k-field k-id">source</span><span class="k-field k-id">target</span></div></div>
<div class="k-section-head" style="padding-left:16px">Columns</div>
<div class="k-data"><span class="k-name k-id">name</span><span class="k-value">text, label</span></div>
<div class="k-data"><span class="k-name k-id">group</span><span class="k-value">category, 10 values</span></div>
<div class="k-data fl-warnrow"><span class="k-name k-id">value</span><span class="k-value"><span class="k-warn-glyph">!</span> number from text, weight</span></div>
<div class="k-fieldrow fl-role" data-annot><span class="k-legend">For value, a higher number means</span><div class="k-fields"><span class="k-field k-span"${menuOpen ? " data-focus" : ""} data-placeholder>Not answered <span class="k-tertiary">&nbsp;not used</span>${I("chevron-down", "k-i-sm k-caret")}</span></div></div>
${roleMenu}</div><div>
<div class="k-section-head" style="padding-left:16px">Before loading <span class="k-count k-num">1</span></div>
<div class="fl-issue fl-loud" data-annot><div class="fl-issue-head"><span class="k-warn-glyph">!</span><b>value is written as text</b></div><div class="k-secondary">All 254 values are whole numbers in quotes ("8"). Read as text, they could not weigh edges.</div><div class="fl-issue-pick"><span class="k-field" style="width:100%">Read as number: 254 weighted edges${I("chevron-down", "k-i-sm k-caret")}</span></div></div>
<div class="k-section-head" style="padding-left:16px">Edges, first 5 of 254, as written in the file</div>
<div style="padding:0 16px"><table class="k-table"><thead><tr><th>source</th><th>target</th><th>value <span class="k-profile">read as number</span></th></tr></thead><tbody>${edges5.map(([a, b, v]) => `<tr><td class="k-id">${a}</td><td class="k-id">${b}</td><td class="fl-text">"${v}"</td></tr>`).join("")}</tbody></table></div>
<div class="k-metrics"><div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big">77</span></div><div class="k-metric"><span class="k-secondary">edges</span><span class="k-big">254</span></div></div>
</div></div></div><div class="k-modal-foot"><span class="k-secondary k-grow">Replaces the <span data-fx="datasets.lesmis.nodes" data-fx-noun="nodes">77 nodes</span> and <span data-fx="datasets.lesmis.edges" data-fx-noun="edges">254 edges</span> of Co-appearances. Its colors and sizes stay.</span><span class="k-btn k-btn-secondary">Cancel</span><span class="k-btn"${menuOpen ? "" : " data-focus"}>Replace data</span></div></div></div>`;
}
const loadAnn = (menuOpen) => menuOpen
    ? `${ann(1172, 70, 256, `The weight's meaning, asked on the value row in the column's words, the technical term under each: a closer or stronger link (similarity), a longer or costlier step (distance), more can pass through (capacity), Don't use value. Nothing is preselected and it never blocks: unanswered, no measure uses value, and Statistics keeps asking afterwards. This follows screens/load-step.html; the load-and-characterize flow asks only after the load instead, and the study compares the two. compact-mantine <b>StyleSelect</b> in a <b>FieldRow</b>.`)}
${ann(1172, 360, 256, heard(`on the question's select, opened with Space; the arrows move through the four answers.`, `"For value, a higher number means, not answered. Don't use value, 4 of 4. No measure reads it."`))}`
    : `${ann(1172, 10, 256, `What happens: the drop's choice, changeable here, so a wrong pick needs no second drop. ${fr("Export and Swap library choose and configure on one surface; this keeps that.")} Proposed in framework-changes.md. <b>StyleSelect</b>.`)}
${ann(1172, 180, 256, `The loud trap, first in the list with the warning mark, before anything runs. Every value is a number in quotes, so the default is the reading that keeps every value, Read as number, and Load stays on (framework-changes.md, "which load issues block Load"). <i>interface-templates.md 20a</i>. <b>DataRow</b> + <b>StyleSelect</b>. ${fr("'+' adds first with defaults; here every data door passes the load step (figma-crosswalk.md 4.2).")}`)}
${ann(1172, 600, 256, heard(`on Replace data when the preview arrives, since nothing blocks (framework-changes.md, "where focus lands in the load step"). Tab order: what happens, format, mapping, issues, sample, footer.`, `"Load miserables.json, dialog. 1 thing to check before you load. value is written as text, read as number. Replace data."`))}`;
const s3a = state("s3a", "3a. The load step: value is written as text; the default reads it as numbers, and Load stays on", `${app(graphPanel({ notSaved: true }), canvas({}), inspectorGraphSample())}${loadStep(false)}${loadAnn(false)}`);
const s3b = state("s3b", "3b. The load step: she opens 'For value, a higher number means' and leaves it unanswered", `${app(graphPanel({ notSaved: true }), canvas({}), inspectorGraphSample())}${loadStep(true)}${loadAnn(true)}`);

// ---------- 4. Loaded ----------
const s4 = state("s4", "4. Her file is loaded: the Statistics under the General overview, nothing selected", `${app(graphPanel({ notSaved: true, file: true }), canvas({}), inspectorGraph())}
${ann(310, 70, 250, `The file chip names the file the data came from, from the load on; Not saved stays, because swapping in data from a file she still has does not keep the copy. File chip proposed in framework-changes.md; Mantine <b>Pill</b>. ${fr("the left header names the file and its location; here save state and the filter chip (figma-crosswalk.md 4.1).")}`)}
${ann(930, 130, 256, `Nothing selected: Statistics under the General overview, filled at load. Density counts the 254 co-appearances over every pair of the <span data-fx="datasets.lesmis.nodes" data-fx-noun="characters">77 characters</span> (<i>graph-conventions.md</i>, Density; <i>principles.md</i> 1). <b>DataRow</b>, <b>ChartRow</b>, <b>ActionRow</b>. The Overview row's action, Change overview..., shows on hover only, so it is not read as a second Replace (proposed).`)}
${ann(930, 520, 256, `The weight's role is not set, so it reads "weight: unknown" with its control inline, and paths will ignore it (<i>principles.md</i> 1, <i>glossary.md</i> 11). <b>FieldRow</b> with <b>StyleSelect</b>.`)}
${ann(310, 640, 240, heard(`the canvas, where the drop landed, when the dialog closes.`, `"Replaced data with miserables.json: <span data-fx="datasets.lesmis.nodes" data-fx-noun="nodes">77 nodes</span>, <span data-fx="datasets.lesmis.edges" data-fx-noun="edges">254 edges</span>. Not saved."`))}`);

// ---------- 5. Valjean selected ----------
const s5 = state("s5", "5. Elena clicks the biggest dot: Valjean, degree 36", `${app(graphPanel({ notSaved: true, file: true }), canvas({ drawing: "lesmis-groups-valjean", inStage: `<span class="k-cursor" style="left:58.4%;top:49.6%"></span>` }), inspectorNode())}
${ann(930, 110, 256, `One node: Attributes with the rank under the value, "#1 of 77" (<i>content-design.md</i> 5, ranks), then Connections and Appearance. The id is not listed, because it equals the label (proposed). <i>interface-specification.md</i> 3, 4.1. <b>DataRow</b>. ${fr("the right sidebar orders a selection's sections (figma-crosswalk.md 4.2).")}`)}
${ann(560, 190, 240, `The selection ring is neutral, not blue. ${fr("selection is blue; here a two-tone ring, because hue on the canvas belongs to data (figma-crosswalk.md 4.3, 'Selection, hover and marquee are blue').")} Drawn by graphty-element.`)}
${ann(310, 640, 240, heard(`stays on the canvas; the canvas's own position is on Valjean, so Shift+Arrow walks on from him.`, `"Valjean, node, selected on canvas. Degree 36, rank 1 of 77."`))}`);

// ---------- 6a. Quick actions ----------
const qa = `<div class="k-quick" data-annot><div class="k-quick-input">${I("search")}who matters most<span class="fl-caret"></span></div><div class="k-quick-list"><div class="k-group-head">Measures</div>
<div class="k-result" aria-selected="true">${I("circle-dot")}<span class="k-grow"><b>Betweenness</b> <span class="k-secondary">-- who sits between the groups</span></span></div>
<div class="fl-req k-secondary">value's meaning is not set, so it runs unweighted.</div>
<div class="k-result">${I("circle-dot")}<span class="k-grow"><b>PageRank</b> <span class="k-secondary">-- who is tied to well-tied characters</span></span></div>
<div class="k-result">${I("circle-dot")}<span class="k-grow"><b>Closeness</b> <span class="k-secondary">-- who is near everyone</span></span></div>
${lm.stats.components > 1 ? `<div class="fl-req k-secondary">${lm.stats.components} components: runs as harmonic closeness, which stays defined when not everyone can be reached.</div>` : ""}
<div class="k-result">${I("circle-dot")}<span class="k-grow"><b>Degree</b> <span class="k-secondary">-- who has the most direct ties</span></span><span class="k-secondary">already shown as size</span></div></div></div>`;
const s6a = state("s6a", "6a. Quick actions, opened from the toolbar's lightning button: 'who matters most'", `${app(graphPanel({ notSaved: true, file: true }), canvas({ drawing: "lesmis-groups-valjean", over: qa, pressed: ["select", "quick"] }), inspectorNode())}
${ann(310, 70, 250, `Quick actions searched by her question, not an algorithm name. No row shows a cost word: on <span data-fx="datasets.lesmis.nodes" data-fx-noun="nodes">77 nodes</span> each finishes in under a second, and a band word appears only for a run of 10 seconds or more (<i>state-matrix.md</i> 4.10). <i>interface-templates.md 15</i>. compact-mantine <b>QuickActions</b>, <b>ResultRow</b>. ${fr("the Actions menu has tabs; here one list (figma-crosswalk.md 4.1).")}`)}
${ann(310, 330, 250, `Notes under a row show before the run: Betweenness will run unweighted and why; Closeness runs as harmonic. <i>options-and-encodings.md</i> 9.3; <i>graph-conventions.md</i>, Unknown role. "Already shown as size" is proposed in framework-changes.md.`)}
${ann(1196, 740, 238, `The lightning button is drawn pressed while its palette is open, as Figma's Actions button is. compact-mantine <b>ToolButton</b>.`)}
${ann(1196, 560, 238, heard(`in the input the whole time; the arrows move the highlight.`, `while typing, "4 measures. Betweenness, who sits between the groups. value's meaning is not set, so it runs unweighted." After Enter, "Betweenness (unweighted) finished."`))}`);

// ---------- 6b. Betweenness read, editor in the inspector position ----------
// 11 bars from 0 to Valjean's score, square-root heights so a bar of one character still shows;
// the last bar is Valjean's, selected.
const bins = Array(11).fill(0);
for (const r of lm.rows) bins[Math.min(10, Math.floor((r.betweenness / V.betweenness) * 10.999))]++;
const hist = bins.map((c, i) => `<i${i === 10 ? " data-on" : ""} style="height:${c ? Math.max(8, Math.round(100 * Math.sqrt(c / Math.max(...bins)))) : 0}%"></i>`).join("");
const editor = `<div class="k-popover fl-editor" data-annot><div class="k-popover-head">Betweenness <span class="k-secondary">&nbsp;(unweighted)</span><span class="k-grow"></span>${icoBtn("play", 'title="Run"')}${icoBtn("ellipsis")}${icoBtn("x")}</div><div class="k-popover-body">
<div class="fl-state-line">on: full graph, <span data-fx="datasets.lesmis.nodes" data-fx-noun="nodes">${lm.nodes} nodes</span>${lm.stats.components > 1 ? `, ${lm.stats.components} components` : ""}. Exact.</div>
<div class="fl-state-line" data-annot>Unweighted: value's meaning is not set, so paths ignore it. <a class="fl-link">Set what value means...</a></div>
<div class="fl-state-line">Size set by Size: degree. <a class="fl-link">Size by betweenness instead</a></div>
<div class="k-section-head" style="padding-left:16px">Readings</div>
<div class="k-hist" style="height:72px">${hist}</div><div class="fl-axis k-secondary k-num"><span>0</span><span>${(V.betweenness / 2).toFixed(2)}</span><span>${V.betweenness}</span></div>
<div class="k-prose" style="padding:4px 16px"><span data-fx="scenarios.onScreen.lesmisBetweenness.zerosFull" data-fx-of="datasets.lesmis.nodes" data-fx-noun="characters">${zeros} of ${lm.nodes} characters</span> score 0. Valjean alone scores ${V.betweenness}; next is ${top[1].label} at ${top[1].betweenness}.</div>
<div class="k-section-head" style="padding-left:16px">Top nodes</div>
${top.slice(0, 5).map((t, i) => `<div class="k-row fl-top"${i === 0 ? ' aria-selected="true"' : ""}${i === 1 ? " data-hover" : ""}><span class="k-num fl-n">${i + 1}</span><span class="k-grow k-id">${t.label}</span><span class="k-num">${t.betweenness}</span></div>`).join("")}
<div class="k-row k-secondary">72 more</div></div></div>`;
const kept = `<div class="k-toast">Copy of Les Miserables kept in Recent projects</div>`;
const s6b = state("s6b", "6b. Betweenness ran: the editor opens in the inspector position, the Graph panel stays", `${app(graphPanel({ notSaved: false, file: true }), canvas({ drawing: "lesmis-groups-valjean", toast: kept }), inspectorNode({ betweenness: true }))}${editor}<span class="k-cursor" style="left:1000px;top:500px"></span>
${ann(310, 60, 250, `The left panel does not change under her: it stays on Graph. The editor opens in the inspector position, to the left of the inspector, because Quick actions has no row to sit beside (<i>interface-templates.md</i> 10). ${fr("a popover opens beside its trigger (figma-crosswalk.md 4.2).")} <b>Popout</b> panel.`)}
${ann(310, 330, 250, `The first thing she made keeps the copy: Not saved is gone and the notice says where it went. Proposed in framework-changes.md. compact-mantine <b>Toast</b>.`)}
${ann(620, 40, 280, `State line: scope with its counts, exact, then why it is unweighted, with the one verb that fixes it (<i>glossary.md</i> 10; <i>graph-conventions.md</i>, Unknown role). "(unweighted)" is the variant word in the name wherever the number is read. Proposed wording in framework-changes.md.`)}
${ann(620, 190, 280, `The run does not repaint size, because Size: degree already writes it; the link says what it would do. Proposed wording in framework-changes.md. ${fr("popovers hold no chart; here the distribution (figma-crosswalk.md 4.2, 'Figma's popovers hold no chart').")} <b>ChartRow</b>, <b>ActionRow</b>s.`)}
${ann(1196, 600, 238, heard(`the editor's first row when it opens; Top nodes is one stop, arrows move within it.`, `"Betweenness, unweighted, full graph, exact. Unweighted: value's meaning is not set. Size set by Size: degree." On ${top[1].label}: "${top[1].label}, node, selected on canvas. Betweenness ${top[1].betweenness}, rank 2 of ${lm.nodes}."`))}`);

// ---------- 7. A note ----------
// The Note editor of screens/take-a-note.html: written and read beside its target; a Note-tool click
// targets without selecting (Valjean was already selected); a note about a node starts with no citation.
const noteRow = `<div class="fl-note"><div class="fl-clamp">Valjean connects the groups. Try with our export.</div><div class="k-secondary fl-note-meta">Just now</div></div>`;
const noteEditor = `<div class="k-popover fl-ne" data-annot><span class="fl-ne-tail"></span><div class="k-popover-head">Note<span class="k-grow"></span>${icoBtn("ellipsis")}${icoBtn("x")}</div><div class="fl-ne-body">
<div class="fl-about">${I("circle-dot", "k-i-sm")}<span>About <span class="k-id">Valjean</span></span></div>
<div class="fl-read">Valjean connects the groups. Try with our export.</div>
<div class="fl-line"><span class="k-caption">Cites</span><a class="fl-link">Cite a run...</a></div>
<div class="fl-line"><span class="k-caption">Quotes</span><a class="fl-link">Quote a value...</a></div>
<div class="k-secondary">Just now</div></div></div>`;
const s7 = state("s7", "7. Elena writes a note from Valjean's menu and stops", `${app(graphPanel({ notSaved: false, file: true }), canvas({ drawing: "lesmis-groups-valjean", pressed: ["note"] }), inspectorNode({ betweenness: true, note: noteRow }))}${noteEditor}
${ann(1128, 300, 300, `The Note editor opens beside what the note is about, never over it, and is where the note is written and read, as Figma's comment opens at its pin. "About Valjean" is the check that it landed on the right thing. A note about a node starts with no citation; Cite a run... and Quote a value... add them. framework-changes.md, "Take a note". compact-mantine <b>PopoutPanel</b>; a <b>Textarea</b> while writing.`)}
${ann(1128, 560, 300, `The inspector's Notes section lists the note once it exists (two lines at most). ${fr("no inspector lists commentary; here a Notes section, present once a note targets the object (figma-crosswalk.md 4.3).")} compact-mantine <b>Tree</b> row.`)}
${ann(560, 720, 280, `There is no Note tool: a note starts from Add note... in the node's menu, or from the Notes panel. Adding it does not change the selection (<i>interaction-pattern-entries.md</i> 5; framework-changes.md, "Take a note").`)}
${ann(310, 640, 240, heard(`in the note's text while she types; Enter adds it and focus stays in the Note editor on the posted note.`, `"Note added to Valjean."`))}
${ann(930, 70, 256, `Export... is in the File list (the main menu and the project-name menu), and each object has an Export section. ${fr("Share is the filled header button; here Export... sits in the File list, a recorded departure, and the Export section is Figma's own (figma-crosswalk.md 4.1).")} Mantine <b>Button</b>.`)}`);

const css = `
body { background: var(--cm-bg-secondary); }
.fl-top-bar { position: sticky; top: 0; z-index: 200; display: flex; gap: 16px; align-items: center; padding: 8px 16px; background: var(--cm-bg); border-bottom: 1px solid var(--cm-border); font-size: 13px; }
.fl-top-bar a { color: var(--cm-text-brand); }
.fl-state { padding: 16px 16px 24px; }
.fl-label { font-size: 13px; font-weight: 600; margin: 0 0 8px; }
.fl-win { position: relative; width: 1440px; height: 900px; overflow: hidden; transform: translateZ(0); box-shadow: 0 0 0 1px var(--cm-border); background: var(--cm-bg); }
.fl-win .k-app { width: 1440px; height: 900px; }
.fl-win .k-backdrop { position: absolute; }
/* Opened as screens/first-look.html#sN (the storyboard frames): that state alone, no chrome */
body:has(.fl-state:target) { background: var(--cm-bg); }
body:has(.fl-state:target) .fl-state:not(:target), body:has(.fl-state:target) .fl-top-bar, body:has(.fl-state:target) .fl-label { display: none; }
body:has(.fl-state:target) .fl-state { padding: 0; }
body:has(.fl-state:target) .fl-win { box-shadow: none; }
/* Annotation layer, off by default */
.fl-an { display: none; }
body:has(#fl-annot:checked) .fl-an { display: block; }
body:has(#fl-annot:checked) [data-annot] { outline: 2px dashed var(--k-annot); outline-offset: 2px; }
.fl-an i { font-style: normal; font-family: var(--cm-font-family-mono); font-size: 11px; }
.fl-fig { display: block; margin-top: 4px; font-style: italic; }

.fl-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.fl-file { max-width: 208px; color: var(--cm-text); }
.fl-unsaved { margin-left: 4px; }
.fl-rank { display: block; color: var(--cm-text-secondary); font-size: var(--k-caption-fs); line-height: var(--k-caption-lh); }
.fl-axis { display: flex; justify-content: space-between; padding: 0 8px 4px 16px; }
.fl-sz { display: inline-block; border-radius: 50%; background: var(--k-node-gray); }
.fl-win .k-row .k-show-hover { display: none; }
.fl-win .k-row:hover .k-show-hover { display: inline-flex; }
.fl-mark { color: var(--cm-text-secondary); font-style: italic; }
.fl-role .k-legend { white-space: nowrap; }

.fl-start { position: relative; display: grid; grid-template-columns: 57px 1fr; align-items: start; height: 900px; background: var(--cm-bg); }
.fl-start > .k-rail { height: 900px; }
.ss-col { width: 880px; margin: 0 auto; padding: 40px 0 0; }
.ss-col h1 { font-size: 15px; line-height: 25px; font-weight: 550; margin: 0 0 4px; }
.ss-privacy { display: flex; gap: 8px; align-items: center; margin: 0 0 20px; font-size: 13px; line-height: 20px; color: var(--cm-text-secondary); }
.ss-h { display: flex; align-items: center; gap: 8px; height: 32px; margin: 8px 0 0; font-size: 11px; font-weight: 550; }
.ss-row { padding: 0 8px; border-radius: 5px; }
.ss-thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.ss-thumb { position: relative; border-radius: 5px; overflow: hidden; box-shadow: inset 0 0 0 1px var(--cm-border); }
.ss-thumb img { display: block; width: 100%; aspect-ratio: 3 / 2; object-fit: cover; }
.ss-thumb-label { display: flex; align-items: center; gap: 6px; padding: 8px; }
.ss-thumb-label .k-grow { min-width: 0; }
.ss-thumb[data-hover] { box-shadow: inset 0 0 0 1px var(--cm-border), 0 0 0 2px var(--cm-border-selected); }
.ss-i { color: var(--cm-icon-secondary, var(--cm-text-secondary)); }
.ss-drop { display: flex; align-items: center; gap: 8px; min-height: 56px; padding: 0 16px; border-radius: 5px; border: 1px dashed var(--cm-border-strong, var(--cm-border)); }
.ss-ask { margin: 0 0 12px; padding: 12px 16px; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--cm-border); display: grid; gap: 4px; max-width: 560px; }
.ss-ask p { margin: 0; }
.ss-ask-h { display: flex; align-items: center; gap: 8px; font-size: 13px; line-height: 22px; font-weight: 550; }
.ss-ask-foot { display: flex; gap: 8px; margin-top: 8px; }
.ss-formats { margin: 8px 0 0; color: var(--cm-text-secondary); }
.ss-help { position: absolute; right: 16px; bottom: 16px; }

.fl-drop { position: absolute; inset: 12px; z-index: 20; display: grid; place-items: center; border: 2px dashed var(--cm-bg-brand); border-radius: 13px; background: color-mix(in srgb, var(--cm-bg) 70%, transparent); }
.fl-drop > div { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 24px; border-radius: 13px; background: var(--cm-bg); box-shadow: var(--cm-elevation-200); font-size: 13px; }
.fl-dragged { position: absolute; z-index: 96; display: flex; gap: 6px; align-items: center; padding: 4px 8px; border-radius: 5px; background: var(--cm-bg); box-shadow: var(--cm-elevation-300); opacity: .92; }

.fl-choice { min-height: 48px; padding-top: 6px; padding-bottom: 6px; align-items: flex-start; }
.fl-choice > svg { margin-top: 2px; }
.fl-choice[data-focus] { outline: 2px solid var(--cm-border-selected); outline-offset: -2px; border-radius: 5px; }
.fl-more { color: var(--cm-text); }

.fl-cols { display: grid; grid-template-columns: 300px 1fr; gap: 8px; }
.fl-cols > div:first-child { border-inline-end: 1px solid var(--cm-border); }
.fl-warnrow .k-value { display: inline-flex; gap: 6px; align-items: center; color: var(--cm-text-danger); }
.fl-issue { margin: 4px 16px 8px; padding: 8px 12px; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--cm-border); display: grid; gap: 4px; }
/* the blocking form of an issue (not used here) */
.fl-block { box-shadow: inset 0 0 0 1px var(--cm-border), inset 3px 0 0 var(--cm-border-danger-strong); }
.fl-done { color: var(--cm-text-secondary); }
.fl-issue-head { display: flex; gap: 8px; align-items: center; }
.fl-issue-pick { margin-top: 4px; }
.fl-loud { box-shadow: inset 0 0 0 1px var(--cm-border), inset 3px 0 0 var(--cm-bg-warning); }
.fl-rolemenu { left: 16px; top: 346px; width: 280px; }
.fl-rolemenu .k-menu-item { height: auto; padding-top: 4px; padding-bottom: 4px; align-items: flex-start; }
.fl-gloss { color: var(--k-menu-ink2); font-size: 11px; line-height: 15px; }
.fl-warnrow .k-value { color: var(--cm-text); }
.fl-text { color: var(--cm-text-secondary); font-family: var(--cm-font-family-mono); }

.fl-caret { display: inline-block; width: 1px; height: 16px; background: var(--cm-text); margin-left: 1px; }
.fl-req { padding: 0 16px 4px 40px; font-size: 11px; line-height: 15px; }
.fl-state-line { padding: 2px 16px; color: var(--cm-text-secondary); line-height: 18px; }
.fl-link { color: var(--cm-text-brand); }
.fl-editor { left: 911px; top: 56px; width: 280px; }
.fl-top .fl-n { width: 16px; color: var(--cm-text-secondary); }
.fl-note { margin: 4px 8px 8px 16px; padding: 8px; border-radius: 5px; box-shadow: inset 0 0 0 1px var(--cm-border); line-height: 16px; }
.fl-note-meta { margin-top: 4px; }
.fl-clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.fl-ne { left: 872px; top: 330px; width: 262px; overflow: visible; }
.fl-ne-tail { position: absolute; left: -7px; top: 104px; width: 12px; height: 12px; background: var(--cm-bg); transform: rotate(45deg); box-shadow: -1px 1px 0 0 var(--cm-border); }
.fl-ne-body { padding: 8px 12px 12px 16px; display: flex; flex-direction: column; gap: 4px; }
.fl-about { display: flex; align-items: center; gap: 6px; min-height: 20px; color: var(--cm-text-secondary); }
.fl-read { line-height: 16px; margin: 2px 0 4px; }
.fl-line { display: flex; align-items: center; gap: 4px; min-height: 24px; }
.fl-line .k-caption { width: 52px; flex: none; }
`;

const html = `<!doctype html>
<!-- THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT screens/first-look.gen.mjs -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>First look: the screens</title>
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>${css}</style>
</head>
<body>
<div class="fl-top-bar"><b>First look: the screens</b><span class="k-secondary">Ten states of the app, in the order of the storyboard, each 1440 by 900. Annotations cite the design framework, name the compact-mantine component, say where Figma differs, and give keyboard focus and what a screen reader hears.</span>
<span class="k-grow"></span><label><input type="checkbox" id="fl-annot"> Show annotations</label><a href="../storyboards/first-look.html">The storyboard</a><a href="../index.html">Gallery</a></div>
${[s1, s2a, s2b, s3a, s3b, s4, s5, s6a, s6b, s7].join("\n")}
</body>
</html>
`;
writeFileSync(join(here, "first-look.html"), toShell(html)); // the current frame: kit/shell.mjs
console.log("wrote screens/first-look.html");
