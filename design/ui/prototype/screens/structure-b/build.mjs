// Builds the structure B wireframes: six app frames on the protein network, one page each.
// Run from design/ui/prototype: node screens/structure-b/drawings.mjs && node screens/structure-b/build.mjs
// The design they draw is study/structure-comparison/structure-b.md. Edit this file, not the pages.
//
// These frames are a proposal that departs from the current frame on purpose (an Algorithms rail
// place instead of Results, the style stack on the left as Groups and styles, Run and Note on the
// toolbar), so each app frame carries data-shell-keep: kit/shell.mjs leaves it alone, and the
// gate's old-frame rule does not apply to it. check.mjs --all does not read this folder.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const proto = join(here, "..", "..");
const fx = JSON.parse(readFileSync(join(proto, "kit/fixtures.json"), "utf8"));
const N = JSON.parse(readFileSync(join(here, "numbers.json"), "utf8"));
const ppi = fx.datasets.ppi;
const L = ppi.louvain;
const K = "../../kit";

// ---------- small pieces ----------
const I = (n, cls = "") => `<svg class="k-i ${cls}"><use href="${K}/icons.svg#${n}"/></svg>`;
const F = (key, text, attrs = "") => `<span data-fx="${key}"${attrs ? " " + attrs : ""}>${text}</span>`;
const chit = (c) => `<span class="k-chit" style="background:${c}"></span>`;
const OKABE = ["#E69F00", "#56B4E9", "#009E73", "#0072B2", "#D55E00", "#CC79A7", "#000000", "#F0E442"];
const OTHER = "#BDBDBD";
const stack = (cs) => `<span class="k-stack">${cs.map(chit).join("")}</span>`;
const SIZECHIP = `<svg class="k-sizechip" viewBox="0 0 16 12"><circle cx="3" cy="8" r="2" fill="#808080"/><circle cx="10" cy="6" r="5" fill="#808080"/></svg>`;
const DIAMOND = `<svg class="k-sizechip" viewBox="0 0 16 12"><polygon points="8,0 14,6 8,12 2,6" fill="#808080"/></svg>`;
const EMPTY = `<span class="b-empty" aria-label="no paint"></span>`;
const btn = (t, cls = "k-btn k-btn-secondary") => `<span class="${cls}" role="button">${t}</span>`;

// ---------- the frame ----------
const railBtn = (icon, word, on) => `<div class="k-rail-btn" role="button" aria-pressed="${on ? "true" : "false"}"><span class="k-rail-pill">${I(icon)}</span>${word}</div>`;
const rail = (on) => `<nav class="k-rail" aria-label="Main"><div class="k-rail-btn" role="button" aria-label="Main menu"><span class="k-rail-pill">${I("menu")}</span></div><div class="k-rail-sep"></div>${railBtn("network", "Graph", on === "graph")}${railBtn("flask-conical", "Algorithms", on === "algorithms").replace('class="k-rail-btn"', 'class="k-rail-btn b-rail-long"')}${railBtn("database", "Data", false)}${railBtn("sticky-note", "Notes", false)}<div class="k-rail-btn k-asst-off" role="button" aria-pressed="false" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div></nav>`;
const head = (open = false) => `<div class="k-panel-head">
  <div class="k-title-line"><span class="k-project">${F("datasets.ppi.frame.project", "Human protein interactions")}</span><span class="k-icon-btn" role="button" aria-label="Project menu" aria-haspopup="menu">${I("chevron-down", "k-i-sm")}</span></div>
  <a class="k-privacy">Nothing has been sent from this project</a>
  <span class="k-chip b-file" title="${ppi.frame.file}, opened from this computer">${I("file", "k-i-sm")}<span class="k-id k-ellipsis">${F("datasets.ppi.frame.file", ppi.frame.file)}</span></span>
  <span class="k-chip k-chip-btn" role="button" aria-expanded="${open}">${I("funnel", "k-i-sm")}Full graph${I("chevron-down", "k-i-sm k-caret")}</span>
</div>`;
const graphsSec = `<section class="k-section">
  <div class="k-section-head">Graphs<span class="k-grow"></span><span class="k-icon-btn" role="button" aria-label="Add a graph">${I("plus")}</span></div>
  <ul class="k-list" role="listbox" aria-label="Graphs"><li class="k-item" role="option" aria-selected="true">${I("network")}<span class="k-grow k-ellipsis">${F("datasets.ppi.frame.graphRow", "Interactions")}</span><span class="k-trail k-num">${F("datasets.ppi.nodes", "300 proteins", 'data-fx-noun="proteins"')}</span></li></ul>
</section>`;
const viewsSec = `<section class="k-section" data-collapsed><div class="k-section-head">Views</div></section>`;

// One row of Groups and styles. o: level, tw ("open" | "closed"), sw, name, count, paint (true | false | undefined for none),
// note, sel, drag, cover (the "Covered by" line), pinned, kind.
function row(o) {
    const attrs = [`class="k-item b-row${o.cover ? " b-cov" : ""}"`, 'role="treeitem"'];
    if (o.level === 2) attrs.push('data-level="2"', 'aria-level="2"');
    if (o.tw) attrs.push(`aria-expanded="${o.tw === "open"}"`);
    if (o.sel) attrs.push('aria-selected="true"');
    if (o.member) attrs.push("data-member");
    if (o.drag) attrs.push("data-dragsrc");
    const grip = o.level === 2 || o.pinned ? `<span class="grip"></span>` : `<span class="grip" aria-hidden="true">${I("grip-vertical", "k-i-sm")}</span>`;
    const tw = o.tw ? `<span class="b-tw" aria-hidden="true">${I(o.tw === "open" ? "chevron-down" : "chevron-right", "k-i-sm")}</span>` : `<span class="b-tw"></span>`;
    const paint = o.paint === undefined ? "" : `<span class="k-check" role="checkbox" aria-checked="${o.paint}" aria-label="Paint ${o.label ?? o.name}"></span>`;
    const note = o.note ? `<span class="b-note" aria-label="Has notes">${I("sticky-note", "k-i-sm")}</span>` : "";
    const trail = `<span class="k-trail">${note}${o.pinned ? `<span class="k-tertiary">pinned</span>` : ""}${o.count ? `<span class="k-num b-count">${o.count}</span>` : ""}${paint}</span>`;
    const kind = o.kind ? `<span class="k-kind">${o.kind}</span>` : "";
    const cover = o.cover ? `<span class="b-covline k-fact">${o.cover}</span><span class="b-move">${btn("Move above", "k-btn k-btn-secondary b-movebtn")}</span>` : "";
    return `<li ${attrs.join(" ")}>${grip}${tw}<span class="b-sw">${o.sw}</span><span class="k-ellipsis b-name">${o.name}</span>${kind}${trail}${cover}</li>`;
}
const dropline = `<li class="b-dropline" aria-hidden="true"></li>`;
const groupsSec = (rows, extra = "") => `<section class="k-section">
  <div class="k-section-head">Groups and styles<span class="k-grow"></span><span class="k-icon-btn" role="button" aria-label="Add a group or a style" aria-haspopup="menu">${I("plus")}</span></div>
  <div class="b-prec">${I("arrow-up-down", "k-i-sm")}Higher rows win each property they set</div>
  <ul class="k-list" role="tree" aria-label="Groups and styles">${rows.join("")}</ul>${extra}
</section>`;
const graphPanel = (rows, { chipOpen = false } = {}) => `<aside class="k-panel" aria-label="Graph">${head(chipOpen)}<div class="k-scroll">${graphsSec}${groupsSec(rows)}${viewsSec}</div></aside>`;

// The rows, in the states they take.
const moduleColors = ppi.frame.legend.rows.map((r) => r.color);
const R = {
    module: (cover) => row({ tw: "closed", sw: stack(moduleColors.slice(0, 3).reverse()), name: "Module: color", count: F("datasets.ppi.nodes", "300"), paint: true, ...(cover ? { cover: "Color covered by Louvain" } : {}) }),
    hubsUnpainted: row({ sw: EMPTY, name: "Hubs", kind: "set", count: F("datasets.ppi.encodings.betweenness.hubLabels.count", "12"), paint: false, label: "Hubs" }),
    hubs: (o = {}) => row({ sw: DIAMOND, name: "Hubs", kind: "set", count: F("datasets.ppi.encodings.betweenness.hubLabels.count", "12"), paint: true, label: "Hubs", ...o }),
    base: row({ pinned: true, sw: chit("#808080"), name: "Base style" }),
    pagerank: (o = {}) => row({ sw: SIZECHIP, name: "PageRank: size", count: F("datasets.ppi.nodes", "300"), paint: true, ...o }),
    louvain: (open, o = {}) => row({ tw: open ? "open" : "closed", sw: stack([OKABE[2], OKABE[1], OKABE[0]]), name: "Louvain", kind: "run", count: F("datasets.ppi.louvain.communities", "10 groups", 'data-fx-noun="groups"'), paint: true, ...o }),
    community: (k, o = {}) => row({ level: 2, sw: chit(OKABE[k - 1]), name: `Community ${k}`, count: F(`datasets.ppi.louvain.groups.${k - 1}.size`, String(L.groups[k - 1].size)), ...o }),
    more: row({ level: 2, sw: chit(OTHER), name: "2 more groups", count: F("datasets.ppi.louvain.singletons", "2") }),
};
const communities = (sel, note) => [1, 2, 3, 4, 5, 6, 7, 8].map((k) => R.community(k, k === sel ? { sel: true, note } : k === 8 && note ? { note } : {})).join("") + R.more;

// ---------- canvas ----------
const drawing = (src, alt) => `<div class="k-stage"><img class="k-light-only" src="${src}-light.svg" alt="${alt}"><img class="k-dark-only" src="${src}-dark.svg" alt="${alt}">`;
const toolbar = `<div class="k-toolbar" role="toolbar" aria-label="Tools">
  <span class="k-tool" role="button" aria-pressed="true" aria-label="Select">${I("mouse-pointer-2", "k-i-lg")}</span><span class="k-tool-caret" role="button" aria-label="Lasso and Hand" aria-haspopup="menu">${I("chevron-down", "k-i-sm")}</span>
  <span class="k-tool" role="button" aria-pressed="false" aria-label="Path">${I("route", "k-i-lg")}</span>
  <span class="k-tool k-tool-label" role="button" aria-pressed="false" aria-label="Run an algorithm" aria-haspopup="dialog">${I("flask-conical", "k-i-lg")}Run</span>
  <span class="k-tool" role="button" aria-pressed="false" aria-label="Note">${I("sticky-note", "k-i-lg")}</span>
  <span class="k-toolbar-sep"></span>
  <span class="k-tool k-tool-label" role="button" aria-pressed="false" aria-label="Quick actions">${I("zap", "k-i-lg")}Quick actions</span>
  <span class="k-toolbar-sep"></span>
  <span class="k-tool" role="button" aria-pressed="false" aria-label="View mode (2D / 3D)">2D</span><span class="k-tool-caret" role="button" aria-label="View mode options" aria-haspopup="menu">${I("chevron-down", "k-i-sm")}</span>
</div>`;
const toolbarDock = (toast = "") => `<div class="k-toolbar-dock">${toast}${toolbar}</div><span class="k-help" role="button" aria-label="Help and shortcuts">${I("circle-help")}</span>`;
const louvainLegend = (extra = "") => `<div class="k-legend-card" role="button" aria-label="Legend: a click on an entry selects the row that paints it">
  <div class="k-lg-title">Louvain <span class="k-secondary">community</span></div>
  ${[1, 2, 3, 4, 5, 6, 7, 8].map((k) => `<div class="k-lg-row">${chit(OKABE[k - 1])}Community ${k}<span class="k-value k-num">${F(`datasets.ppi.louvain.groups.${k - 1}.size`, String(L.groups[k - 1].size))}</span></div>`).join("")}
  <div class="k-lg-row">${chit(OTHER)}Other: 2 groups of 1<span class="k-value k-num">${F("datasets.ppi.louvain.singletons", "2")}</span></div>
  <div class="k-lg-title b-lg-gap">PageRank: size</div>
  <div class="k-size-marks"><div><b style="width:6px;height:6px"></b>${N.pagerank.min}</div><div><b style="width:22px;height:22px"></b>${F("datasets.ppi.topByDegree.0.pagerank", "0.0118")}</div></div>
  ${extra}
</div>`;
const nodesTable = (cols, rows, scope) => `<section class="k-dock" aria-label="Table">
  <div class="k-dock-tabs"><span role="tablist" aria-label="Table" style="display:contents">${cols.tabs.map((t, i) => `<span class="k-tab" role="tab" aria-selected="${i === cols.on}">${t}</span>`).join("")}</span><span class="k-grow"></span><span class="k-icon-btn" role="button" aria-label="Find in table">${I("search")}</span></div>
  <div class="k-scope">${scope}</div>
  <div class="k-table-wrap"><table class="k-table"><thead><tr>${cols.head.map((h) => `<th${h.n ? ' class="k-n"' : ""}>${h.t}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>
</section>`;
const tableStrip = `<div class="b-strip" role="button" aria-expanded="false">${I("chevron-up", "k-i-sm")}${I("table")}<span class="k-strong">Table</span><span class="k-secondary k-num">${F("datasets.ppi.nodes", "300")} nodes, ${F("datasets.ppi.edges", "1,262")} edges (rows)</span><span class="k-grow"></span><span class="k-secondary">View &gt; Table</span></div>`;
const td = (v, n) => `<td${n ? ' class="k-n"' : ""}>${v}</td>`;
const communitiesTable = (sel) =>
    nodesTable(
        { tabs: ["Nodes", "Edges", "Communities: Louvain"], on: 2, head: [{ t: "community" }, { t: "proteins", n: 1 }, { t: "edges inside", n: 1 }, { t: "edges out", n: 1 }, { t: "density", n: 1 }, { t: "most from module" }, { t: "hub" }] },
        L.groups.slice(0, 8).map((g, i) => `<tr${g.community === sel ? ' aria-selected="true"' : ""}>${td(`${chit(OKABE[i])}Community ${g.community}`)}${td(g.size, 1)}${td(g.edgesInside, 1)}${td(g.edgesOut, 1)}${td(g.density, 1)}${td(`${g.mostFromModule}, ${g.fromThatModule}`)}${td(`<span class="k-id">${g.hub}</span>`)}</tr>`),
        `Full graph: ${F("datasets.ppi.louvain.communities", "10 communities", 'data-fx-noun="communities"')} from Louvain. Sorted by size; the ${F("datasets.ppi.louvain.singletons", "2 communities", 'data-fx-noun="communities"')} of one protein are below.`,
    );

// ---------- inspector ----------
const right = (typerow, body) => `<aside class="k-right" aria-label="Inspector">
  <div class="k-header1"><span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">100%${I("chevron-down", "k-i-sm")}</span></div>
  ${typerow}
  <div class="k-scroll">${body}</div>
</aside>`;
const typerow = (icon, name, kind, verbs = "") => `<div class="k-typerow">${I(icon)}<span class="k-name">${name}</span><span class="k-secondary">${kind}</span><span class="k-grow"></span>${verbs}</div>`;
const sec = (title, body, headExtra = "") => `<section class="k-section"><div class="k-section-head">${title}<span class="k-grow"></span>${headExtra}</div>${body}</section>`;
const data = (name, value) => `<div class="k-data"><span class="k-name">${name}</span><span class="k-value">${value}</span></div>`;
const bars = ppi.frame.degreeBars.map((h) => (h ? `<i style="height:${h}%"></i>` : `<i class="z"></i>`)).join("");
const info = I("info", "b-ii");
const overview =
    `<section class="k-section b-top">` +
    `<div class="k-fieldrow"><span class="k-legend">Background</span><div class="k-fields"><span class="k-field k-span"><span class="b-bgsw"></span>Theme</span></div></div>` +
    `<div class="k-fieldrow"><span class="k-legend">Layout</span><div class="k-fields"><span class="k-field k-span">Force-directed${I("chevron-down", "k-i-sm k-caret")}</span><span class="k-icon-btn" role="button" aria-label="Run layout">${I("play")}</span></div></div></section>` +
    sec(
        "Overview",
        `<div class="b-stline">Loaded: ${F("datasets.ppi.frame.file", ppi.frame.file)}, undirected. confidence: no unit. Each run that uses it asks what a higher confidence means.</div>` +
            data("Nodes", F("datasets.ppi.nodes", "300 nodes", 'data-fx-noun="nodes"')) +
            data("Edges", `${F("datasets.ppi.edges", "1,262")} edges (rows)`) +
            data(`Distinct pairs ${info}`, `${F("datasets.ppi.edges", "1,262")} distinct pairs`) +
            data(`Density ${info}`, F("datasets.ppi.stats.density", "0.0281")) +
            data(`Connected components ${info}`, F("datasets.ppi.frame.components", "3 (2 isolates)")) +
            data(`Degree distribution ${info}`, `<span class="b-spark" role="img" aria-label="${ppi.frame.degreeLabel}">${bars}</span>`) +
            data("Attributes", F("datasets.ppi.frame.attributes", "4")) +
            `<div class="k-row k-secondary">5 more</div>`,
        `<span class="k-btn k-btn-ghost">Change overview...</span>`,
    );
const fieldrow = (legend, fields) => `<div class="k-fieldrow"><span class="k-legend">${legend}</span><div class="k-fields">${fields}</div></div>`;
const field = (t, cls = "") => `<span class="k-field ${cls}">${t}</span>`;
const dd = (t, cls = "k-span") => field(`${t}${I("chevron-down", "k-i-sm k-caret")}`, cls);

// ---------- pages ----------
const page = ({ file, title, lede, app }) => {
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<!-- THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT screens/structure-b/build.mjs -->
<link rel="stylesheet" href="${K}/cm.css">
<link rel="stylesheet" href="${K}/kit.css"><script src="${K}/kit.js" defer></script>
<link rel="stylesheet" href="structure-b.css">
</head>
<body data-dataset="ppi">
<h1 class="b-hidden-h">${title}</h1>
<p class="b-hidden-h" data-kit-note>${lede}</p>
${app}
</body>
</html>
`;
    writeFileSync(join(here, file), html);
    return file;
};
const note = (style, html) => `<div class="k-annot-note" style="${style}">${html}</div>`;
const app = (railOn, left, canvas, dock, inspector) => `<div class="k-app" data-shell-keep>${rail(railOn)}${left}<main class="k-main"><div class="k-canvas">${canvas}</div>${dock}</main>${inspector}</div>`;

const pages = [];

// 1. At rest
{
    const legend = `<div class="k-legend-card"><div class="k-lg-title">Module: color <span class="k-secondary">module</span></div>${ppi.frame.legend.rows.map((r, i) => `<div class="k-lg-row">${chit(r.color)}${r.label}<span class="k-value k-num">${F(`datasets.ppi.frame.legend.rows.${i}.count`, String(r.count))}</span></div>`).join("")}<div class="k-lg-row">${chit(OTHER)}Other: Unassigned<span class="k-value k-num">${F("datasets.ppi.frame.legend.other.count", "26")}</span></div><div class="k-lg-title b-lg-gap">Labels: the ${F("scenarios.onScreen.frameLabels.ppi.budget", "22")} proteins with the most partners</div><div class="k-secondary">${F("scenarios.onScreen.frameLabels.ppi.hidden", "7")} more hidden where they overlap</div></div>`;
    const canvas =
        drawing(`${K}/canvas/ppi-modules-onesize`, "Protein interactions colored by module, nothing selected") +
        `</div>${legend}${toolbarDock()}` +
        note("left:24px;top:24px", "<b>Groups and styles is the style stack.</b> Each row is one style layer and what it selects; order is paint order, and a higher row wins each property it sets. Hubs is a kept set with no paint: it still has a row, with an empty swatch and Paint off.");
    const dock = tableStrip;
    const insp = right(typerow("network", F("datasets.ppi.frame.graphRow", "Interactions"), "Graph"), overview + sec("Statistics", `<div class="k-prose b-pad">Nothing has run yet. A reading about the whole graph, such as modularity, appears here once a run makes one, with a link to its run.</div>`));
    pages.push(page({ file: "at-rest.html", title: "Structure B: the frame at rest", lede: "The protein network before any run: the Graph panel's Groups and styles list, and the overview inspector.", app: app("graph", graphPanel([R.module(false), R.hubsUnpainted, R.base]), canvas, dock, insp) }));
}

// 2. After Louvain and PageRank
{
    const rows = [R.pagerank(), R.louvain(true), communities(0), R.module(true), R.hubsUnpainted, R.base];
    const toast = `<div class="k-toast">Size by PageRank added on top. Ctrl+Z removes it.<span class="k-toast-action">Undo</span></div>`;
    const canvas =
        drawing("img/louvain-pagerank", "Protein interactions colored by Louvain community, sized by PageRank, nothing selected") +
        `</div>${louvainLegend()}${toolbarDock(toast)}` +
        note("left:24px;top:24px", "<b>Louvain added one run row, its groups nested under it.</b> PageRank added nothing when it ran; its run offered Color by and Size by, and Size by added the encoding row on top. Module: color now loses color on every protein, so it says so and offers Move above.");
    const stats = sec(
        "Statistics",
        data(`Modularity <a class="k-link">Louvain</a>`, F("datasets.ppi.louvain.modularity", "0.716")) + data(`Communities <a class="k-link">Louvain</a>`, F("datasets.ppi.louvain.communities", "10")) + `<div class="k-prose b-pad k-secondary">PageRank gives a value to every protein and no number about the whole graph, so it adds no line here.</div>`,
    );
    const insp = right(typerow("network", F("datasets.ppi.frame.graphRow", "Interactions"), "Graph"), overview + stats);
    pages.push(page({ file: "after-runs.html", title: "Structure B: after Louvain and PageRank", lede: "Louvain's groups nested under its run row, PageRank as a size encoding on top, and the covered module colors.", app: app("graph", graphPanel(rows), canvas, communitiesTable(0), insp) }));
}

// 3. A group selected
{
    const g = L.groups[7];
    const rows = [R.pagerank(), R.louvain(true), communities(8), R.module(true), R.hubsUnpainted, R.base];
    const canvas =
        drawing("img/community-8", "Protein interactions colored by Louvain community, sized by PageRank; the 29 members of community 8 marked") +
        `</div>${louvainLegend()}${toolbarDock()}` +
        note("left:24px;top:24px", "<b>Clicking a row selects the row</b>, marks its members on the canvas and in the table, and opens its inspector: Style first, then Statistics, Members, Overlap, Notes and Used by, in one scrolling column.");
    const verbs = `<span class="k-icon-btn" role="button" aria-label="More for Community 8">${I("ellipsis")}</span>`;
    const header = `<div class="b-rowhead"><div>${F("datasets.ppi.louvain.groups.7.size", "29 proteins", 'data-fx-noun="proteins"')}. Created from <a class="k-link">Louvain, Sep 29</a></div><div class="b-acts">${btn("Keep as set")}${btn("Compare with...", "k-btn k-btn-ghost")}</div></div>`;
    const style = sec(
        "Style",
        `<div class="b-sub">Nodes</div>` +
            fieldrow("Color", field(`${chit("#F0E442")}F0E442`) + field("100%", "k-num")) +
            fieldrow("Shape", dd("Circle")) +
            fieldrow(`Size <span class="k-tertiary">-- PageRank: size</span>`, field("Not set", "k-span")) +
            fieldrow(`Label <span class="k-tertiary">-- Base style</span>`, dd("Off")) +
            fieldrow("Opacity", field("100%", "k-span k-num")) +
            `<div class="b-sub">Edges inside the group</div>` +
            fieldrow(`Color <span class="k-tertiary">-- Base style</span>`, field(`${chit("#808080")}808080`) + field("30%", "k-num")) +
            fieldrow(`Width <span class="k-tertiary">-- Base style</span>`, field("1", "k-span k-num")),
    );
    const statsSec = sec(
        "Statistics",
        data("Proteins", F("datasets.ppi.louvain.groups.7.size", "29")) +
            data("Edges inside", F("datasets.ppi.louvain.groups.7.edgesInside", "104")) +
            data("Edges out", F("datasets.ppi.louvain.groups.7.edgesOut", "41")) +
            data("Density", F("datasets.ppi.louvain.groups.7.density", "0.256")) +
            data("Hub", `<span class="k-id">${F("datasets.ppi.louvain.groups.7.hub", "TP53")}</span>`) +
            data("Most from module", `${F("datasets.ppi.louvain.groups.7.mostFromModule", "DNA repair")}, ${F("datasets.ppi.louvain.groups.7.fromThatModule", "29")}`) +
            data("Mean log2FoldChange", `${F("datasets.ppi.louvain.groups.7.meanLog2FoldChange", "0.13")}; rest ${F("datasets.ppi.louvain.groups.7.meanLog2FoldChangeRest", "0.07")}`),
    );
    const members = sec(
        "Members",
        N.community8.byDegree
            .slice(0, 5)
            .map((m) => data(`<span class="k-id">${m.id}</span>`, `degree ${m.degree}`))
            .join("") + `<div class="b-acts b-pad">${btn("Show in table")}${btn("Select members")}</div>`,
    );
    const overlap = sec("Overlap", `<div class="k-prose b-pad">Nothing paints over its color. Its size comes from PageRank: size, above it; Community 8 sets no size.</div><div class="k-prose b-pad">TP53 is also in Hubs, which paints nothing.</div>`);
    const insp = right(typerow("group", "Community 8", "Group", verbs), header + style + statsSec + members + overlap + sec("Notes", "", `<span class="k-icon-btn" role="button" aria-label="Add a note to Community 8">${I("plus")}</span>`) + sec("Used by", `<div class="k-prose b-pad k-secondary">No view or recipe uses it.</div>`));
    void g;
    pages.push(page({ file: "group-selected.html", title: "Structure B: a group selected", lede: "Community 8 selected from the list: its members marked and its row inspector with Style, Statistics, Members and Overlap.", app: app("graph", graphPanel(rows), canvas, communitiesTable(8), insp) }));
}

// 4. The Algorithms rail place
{
    const run = (name, sub, o = "") => `<div class="k-row b-run"${o}>${I("flask-conical")}<span class="b-run-t"><span class="k-grow">${name}</span><span class="b-run-sub">${sub}</span></span></div>`;
    const cat = (name, marks = "", o = "") => `<div class="k-row b-cat"${o}><span class="k-grow">${name}</span>${marks}</div>`;
    const mark = (t) => `<span class="k-badge">${t}</span>`;
    const fam = (name, open, body) => `<div class="k-row b-fam" role="button" aria-expanded="${open}">${I(open ? "chevron-down" : "chevron-right", "k-i-sm")}<span class="k-grow">${name}</span></div>${open ? body : ""}`;
    const left = `<aside class="k-panel" aria-label="Algorithms">${head()}<div class="k-scroll">
      <div class="k-search"><span class="k-field">${I("search", "k-i-sm")}Find an algorithm</span></div>
      ${sec(
          "Runs in this project",
          run("Betweenness", "Sep 29, 16:12. Values only: adds no row", ' aria-selected="true"') +
              run("PageRank", "Sep 29, 16:05. Size by PageRank is on the list") +
              run("Louvain", `Sep 29, 16:02. ${F("datasets.ppi.louvain.communities", "10 communities", 'data-fx-noun="communities"')}, on the list`),
      )}
      ${sec(
          "Catalog",
          fam(
              "Communities",
              true,
              cat("Louvain", mark("weight")) + cat("Leiden", mark("weight")) + cat("Label propagation") + cat("Connected components") + cat("Strongly connected components", mark("direction"), ' aria-disabled="true"') + cat("k-core"),
          ) +
              fam("Centrality", true, cat("Degree") + cat("Betweenness", mark("weight")) + cat("Closeness", mark("variant")) + cat("PageRank") + cat("Eigenvector")) +
              fam("Paths", false, "") +
              fam("Link prediction", false, "") +
              fam("Graph statistics", false, ""),
      )}
    </div></aside>`;
    const b = ppi.encodings.betweenness;
    const toast = `<div class="k-toast">Betweenness finished on the full graph.<span class="k-toast-action">Color by</span><span class="k-toast-action">Size by</span></div>`;
    const canvas =
        drawing("img/louvain-pagerank", "Protein interactions colored by Louvain community, sized by PageRank, nothing selected") +
        `</div>${louvainLegend()}${toolbarDock(toast)}` +
        note("left:24px;top:24px", "<b>Every run has one home: its run inspector.</b> Runs lists every run, newest first, whether it paints or not; the catalog is below it. Betweenness gives a value to each protein and nothing more, so the canvas and the Groups and styles list are unchanged until Color by or Size by.");
    const insp = right(
        typerow("flask-conical", "Betweenness", "Run", `<span class="k-icon-btn" role="button" aria-label="More for Betweenness">${I("ellipsis")}</span>`),
        `<div class="b-rowhead"><div>Sep 29, 16:12, on the full graph. Adds nothing to Groups and styles.</div><div class="b-acts">${btn("Color by", "k-btn")}${btn("Size by")}</div></div>` +
            sec("Options", data("Weight", "none") + data("Direction", "undirected") + data("Normalized", "yes")) +
            sec("Readings", data("Range", F("datasets.ppi.encodings.betweenness.domain", "0 to 0.138")) + data("Median", F("datasets.ppi.encodings.betweenness.median", "0.0038")) + data("Proteins at 0", F("datasets.ppi.encodings.betweenness.zeros", "10"))) +
            sec("Top proteins", b.top.map((t, i) => data(`<span class="k-id">${t.id}</span>`, F(`datasets.ppi.encodings.betweenness.top.${i}.betweenness`, Number(t.betweenness).toPrecision(3)))).join("") + `<div class="b-acts b-pad">${btn("Show in table")}</div>`) +
            `<div class="b-acts b-pad">${btn("Rerun")}${btn("Compare with another run...", "k-btn k-btn-ghost")}</div>`,
    );
    const dock = nodesTable(
        { tabs: ["Nodes", "Edges", "Communities: Louvain"], on: 0, head: [{ t: "id" }, { t: "community" }, { t: "pagerank", n: 1 }, { t: "betweenness", n: 1 }] },
        ppi.topByBetweenness.slice(0, 6).map((r) => `<tr>${td(`<span class="k-id">${r.id}</span>`)}${td(`${chit(OKABE[L.community[r.id] - 1])}Community ${L.community[r.id]}`)}${td(r.pagerank.toPrecision(3), 1)}${td(r.betweenness.toPrecision(3), 1)}</tr>`),
        `Full graph: ${F("datasets.ppi.nodes", "300 proteins", 'data-fx-noun="proteins"')}. Sorted by betweenness.`,
    );
    pages.push(page({ file: "algorithms.html", title: "Structure B: the Algorithms rail place", lede: "Runs in this project above the catalog, and the run inspector of Betweenness, a run that gives only values.", app: app("algorithms", left, canvas, dock, insp) }));
}

// 5. Drag reorder of precedence
{
    const rows = [dropline, R.pagerank(), R.louvain(false), R.module(true), R.hubs({ sel: true, drag: true, cover: "Size covered by PageRank: size" }), R.base];
    const ghost = `<div class="b-ghost" style="left:150px;top:266px"><span class="grip">${I("grip-vertical", "k-i-sm")}</span>${DIAMOND}<span>Hubs</span></div><span class="k-cursor" style="position:fixed;left:166px;top:276px"></span>`;
    const hubsLegend = `<div class="k-lg-title b-lg-gap">Hubs <span class="k-secondary">degree 17 or more</span></div><div class="k-lg-row">${DIAMOND}diamond<span class="k-value k-num">12</span></div>`;
    const canvas =
        drawing("img/hubs-below", "Hubs drawn as diamonds at their PageRank size, colored by their Louvain community; the 12 hubs marked") +
        `</div>${louvainLegend(hubsLegend)}${toolbarDock()}` +
        note("left:24px;top:24px", "<b>Dragging Hubs above PageRank: size.</b> Hubs sets shape and size. Below PageRank: size it keeps shape but loses size on all 12. Dropped on the line, it wins size too. It never wins color, because it sets none: each hub keeps its Louvain community's color. The Louvain row is folded; a folded run moves as one block.");
    const byC = Object.entries(N.hubs.byCommunity).map(([c, ids]) => `<div class="k-row b-hubline">${chit(OKABE[c - 1])}<span>Community ${c}: ${ids.map((i) => `<span class="k-id">${i}</span>`).join(", ")}</span></div>`).join("");
    const insp = right(
        typerow("group", "Hubs", "Set", `<span class="k-icon-btn" role="button" aria-label="More for Hubs">${I("ellipsis")}</span>`),
        `<div class="b-rowhead"><div>${F("datasets.ppi.encodings.betweenness.hubLabels.count", "12 proteins", 'data-fx-noun="proteins"')}. Rule: degree 17 or more.</div></div>` +
            sec("Style", `<div class="b-sub">Nodes</div>` + fieldrow(`Color <span class="k-tertiary">-- not set</span>`, field("Not set", "k-span")) + fieldrow("Shape", dd("Diamond")) + fieldrow(`Size <span class="k-tertiary">-- PageRank: size wins</span>`, field("9", "k-span k-num b-covered")) + fieldrow("Label", dd("On"))) +
            sec("Overlap", `<div class="k-prose b-pad">Size: ${F("datasets.ppi.encodings.betweenness.hubLabels.count", "12 of 12 members", 'data-fx-of="datasets.ppi.encodings.betweenness.hubLabels.count" data-fx-noun="members"')} show PageRank: size's size. <a class="k-link">Move above</a></div><div class="k-prose b-pad">All 12 are also in Louvain's communities. Louvain paints their color and Hubs their shape, so nothing conflicts:</div>` + byC),
    );
    pages.push(page({ file: "drag-reorder.html", title: "Structure B: dragging a group to change precedence", lede: "The Hubs set dragged above PageRank: size, with its overlap with Louvain's communities in its inspector.", app: app("graph", graphPanel(rows), canvas, tableStrip, insp).replace(/<\/div>$/, ghost + "</div>") }));
}

// 6. Filters, hiding and notes
{
    const rows = [R.hubs(), R.pagerank(), R.louvain(true), communities(0, true), R.module(true), R.base];
    const f = ppi.filtered;
    const pop = `<div class="k-popover b-filterpop" style="left:8px;top:8px">
      <div class="k-popover-head">Filter steps<span class="k-grow"></span><span class="k-icon-btn" role="button" aria-label="Close">${I("x")}</span></div>
      <div class="k-popover-body">
        <div class="k-prose b-pad">Every number is computed on what these steps keep, in this order.</div>
        <div class="k-row"><span class="k-check" role="checkbox" aria-checked="false" aria-label="Filter to module = Ribosome"></span><span class="k-grow">${F("datasets.ppi.filtered.step", "Filter to module = Ribosome")}</span><span class="k-icon-btn" role="button" aria-label="Delete Filter to module = Ribosome">${I("trash-2")}</span></div>
        <div class="k-prose b-pad k-secondary">Off. On, it keeps ${F("datasets.ppi.filtered.nodes", "56 of 300 proteins", 'data-fx-of="datasets.ppi.nodes" data-fx-noun="proteins"')}.</div>
        <div class="b-acts b-pad">${btn("Filter to selection")}${btn("Add a rule...", "k-btn k-btn-ghost")}</div>
      </div></div>`;
    void f;
    const marker = `<span class="b-notemark" style="left:calc(${ppi.anchors.selected.x}% + 10px);top:calc(${ppi.anchors.selected.y}% - 30px)" role="button" aria-label="Note on TP53">${I("sticky-note", "k-i-sm")}</span>`;
    const notdrawn = `<div class="k-notdrawn">${F("datasets.ppi.louvain.singletons", "2 proteins", 'data-fx-noun="proteins"')} hidden: GSK3B, NOTCH1. <a>Show all</a></div>`;
    const hubsLegend = `<div class="k-lg-title b-lg-gap">Hubs <span class="k-secondary">degree 17 or more</span></div><div class="k-lg-row">${DIAMOND}diamond<span class="k-value k-num">12</span></div>`;
    const toast = `<div class="k-toast">Hidden on canvas: GSK3B and NOTCH1.<span class="k-toast-action">Undo</span></div>`;
    const canvas =
        drawing("img/hubs-above-tp53", "Hubs drawn as large diamonds, the two proteins with no interaction hidden, TP53 selected") +
        marker +
        `</div>${pop}${louvainLegend(hubsLegend + notdrawn)}${toolbarDock(toast)}` +
        note("left:320px;top:24px;max-width:300px", "<b>None of these is a row</b>, because a row's place would read as paint order. Filter steps stay in the filter chip, in evaluation order. Hiding is a verb, and what is hidden is on the legend's not-drawn line. A note on a protein shows as a marker on the canvas (TP53's); a note on a row shows as a badge on the row (Community 8 has one). The notes themselves live in the Notes panel.");
    const t = ppi.inspector.tp53;
    const rank = (k) => `rank ${t[k].from}`;
    const insp = right(
        typerow("circle-dot", `<span class="k-id">TP53</span>`, "Node"),
        sec("Attributes", data("module", F("datasets.ppi.inspector.tp53.module", "DNA repair")) + data("log2FoldChange", F("datasets.ppi.inspector.tp53.log2FoldChange", "-0.84"))) +
            sec(
                "Results",
                data("degree", `${F("datasets.ppi.inspector.tp53.degree", "32")}, ${rank("degreeRank")}`) +
                    data(`pagerank <a class="k-link">run</a>`, `${F("datasets.ppi.inspector.tp53.pagerank", "0.0114")}, ${rank("pagerankRank")}`) +
                    data(`betweenness <a class="k-link">run</a>`, `${F("datasets.ppi.inspector.tp53.betweenness", "0.114")}, ${rank("betweennessRank")}`) +
                    data(`community <a class="k-link">run</a>`, "Community 8"),
            ) +
            sec("Memberships", `<div class="k-row">${chit(OKABE[7])}<span class="k-grow">Community 8</span><span class="k-secondary">Louvain</span></div><div class="k-row">${DIAMOND}<span class="k-grow">Hubs</span><span class="k-secondary">set</span></div>`) +
            sec(
                "Appearance",
                `<div class="k-row"><a class="k-link k-grow">Hubs</a><span class="k-secondary">shape, size, label</span></div><div class="k-row"><a class="k-link k-grow">Community 8</a><span class="k-secondary">color</span></div><div class="k-row"><a class="k-link k-grow">Base style</a><span class="k-secondary">edges</span></div><div class="k-prose b-pad k-secondary">PageRank: size also sets size here; Hubs, higher, wins it.</div>`,
            ) +
            sec("Notes", `<div class="b-notecard"><div class="k-secondary">Sep 29</div>Hub of Community 8. Its shortest path to SMAD3 is ${F("datasets.ppi.inspector.path.hops", "3")} steps; check the TGF-beta link in the next qPCR run.</div>`, `<span class="k-icon-btn" role="button" aria-label="Add a note to TP53">${I("plus")}</span>`),
    );
    pages.push(page({ file: "filters-hiding-notes.html", title: "Structure B: filters, hiding and notes", lede: "The filter chip's steps, two hidden proteins on the not-drawn line, and a note on TP53, none of them rows in the list.", app: app("graph", graphPanel(rows, { chipOpen: true }), canvas, tableStrip, insp) }));
}

console.log(pages.map((p) => `screens/structure-b/${p}`).join("\n"));
