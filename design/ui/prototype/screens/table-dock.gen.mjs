#!/usr/bin/env node
// Writes screens/table-dock.html from kit/fixtures.json (datasets, and scenarios.tableDock), so
// every row, count, range and histogram on the page is the kit's own data.
// Run from design/ui/prototype/: node screens/table-dock.gen.mjs
// (node screens/table-dock-numbers.mjs first if the kit's generator changed).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toShell } from "../kit/shell.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const F = JSON.parse(readFileSync(join(here, "../kit/fixtures.json"), "utf8")).datasets;
const T = JSON.parse(readFileSync(join(here, "../kit/fixtures.json"), "utf8")).scenarios.tableDock;

/* ---------- helpers ---------- */
const fmt = (n) => n.toLocaleString("en-US");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const I = (name, cls = "k-i") => `<svg class="${cls}" aria-hidden="true"><use href="../kit/icons.svg#${name}"/></svg>`;
const chit = (c) => `<span class="k-chit" style="background:${c}"></span>`;
const stack = (cs) => `<span class="k-stack">${cs.map(chit).join("")}</span>`; // largest last
const SIZECHIP = `<svg class="k-sizechip" viewBox="0 0 16 12" aria-hidden="true"><circle cx="3" cy="8" r="2" fill="#808080"/><circle cx="10" cy="6" r="5" fill="#808080"/></svg>`;
const CARET = `<svg class="s-caret" width="5" height="3" viewBox="0 0 5 3" aria-hidden="true"><path d="M0 0h5L2.5 3z" fill="currentColor"/></svg>`;
const quantile = (s, q) => { const p = (s.length - 1) * q; const lo = Math.floor(p); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (p - lo); };
const dec = (x, d) => Number(x.toFixed(d));

// A mini histogram: 12 bins over the column's range; skewed columns (max over 20 times the
// median) on a log scale, as the element's encodings are. The outlier band is Tukey's upper fence
// (Q3 + 1.5 IQR) on the same scale; the bars past it carry the band.
function histogram(values, bins = 12, { linear = false } = {}) {
    const v = [...values].sort((a, b) => a - b);
    const med = quantile(v, 0.5);
    const log = !linear && v[v.length - 1] > 20 * Math.max(med, 1e-12); // linear: a column with negative values
    const c = v.find((x) => x > 0) || 1;
    const t = (x) => (log ? Math.log1p(x / c) : x);
    const lo = t(v[0]), hi = t(v[v.length - 1]);
    const counts = new Array(bins).fill(0);
    const bin = (x) => Math.min(bins - 1, Math.floor(((t(x) - lo) / (hi - lo || 1)) * bins));
    for (const x of v) counts[bin(x)]++;
    const tv = v.map(t);
    const q1 = quantile(tv, 0.25), q3 = quantile(tv, 0.75);
    const fence = q3 + 1.5 * (q3 - q1);
    const above = tv.filter((x) => x > fence).length;
    const bandFrom = above && fence < hi ? Math.min(bins - 1, Math.floor(((fence - lo) / (hi - lo)) * bins) + 1) : bins;
    return { counts, log, above, bandFrom, n: v.length, zeros: v.filter((x) => x === 0).length };
}
function distHtml(h, { blocked = null, label = "" } = {}) {
    const max = Math.max(...h.counts);
    const bars = h.counts.map((n, k) => `<i${k >= h.bandFrom ? " data-out" : ""} style="height:${n ? Math.max(8, Math.round((n / max) * 100)) : 0}%"></i>`).join("");
    const band = h.bandFrom < h.counts.length ? `<b class="s-band" style="left:${(h.bandFrom / h.counts.length) * 100}%"></b>` : "";
    const tip = `${label}: ${h.n} values${h.log ? ", log scale" : ""}${h.above ? `; ${h.above} past the outlier fence (shaded)` : ""}. Click for the histogram.`;
    return `<span class="s-dist" title="${esc(tip)}">${band}${bars}${blocked ? blk(blocked) : ""}</span>`;
}
function stripHtml(segs, { encoded = false, blocked = null } = {}) {
    const total = segs.reduce((a, s) => a + s.n, 0);
    const shades = ["var(--cm-border-translucent-strong)", "var(--cm-border-strong)"]; // both 3:1 or more on the panel (WCAG 1.4.11)
    return `<span class="s-strip${encoded ? " s-enc" : ""}">${segs.map((s, k) => `<i style="flex:${s.n} 0 0;background:${encoded ? s.c : shades[k % 2]}" title="${esc(s.name)}: ${fmt(s.n)}"></i>`).join("")}${blocked ? blk(blocked) : ""}</span>`;
}
// Ranks as the element gives them: 1 + the count of higher values, so equal values share a rank ("#3=").
function ranks(vals) {
    const sorted = [...vals].sort((a, b) => b - a);
    const first = new Map(), count = new Map();
    sorted.forEach((v, k) => { if (!first.has(v)) first.set(v, k + 1); count.set(v, (count.get(v) || 0) + 1); });
    return vals.map((v) => ({ r: first.get(v), tied: count.get(v) > 1 }));
}
const rankText = (x) => `#${x.r}${x.tied ? "=" : ""}`;
// Ties: "=" marks values equal at the shown precision, and nothing else (the invented near-tie rule and
// its "near #N" cells were removed after round 6). nearTies is kept only to find nothing.
const NEAR = 0;
function nearTies(vals) {
    const r = ranks(vals);
    const order = vals.map((_, i) => i).sort((a, b) => vals[b] - vals[a]);
    const near = vals.map(() => null);
    for (let k = 0; k + 1 < order.length; k++) {
        const i = order[k], j = order[k + 1], a = vals[i], b = vals[j];
        if (a !== b && a > 0 && (a - b) / a < NEAR) near[i] = r[j].r;
    }
    return near;
}
const rankNearText = (x) => rankText(x);
const TIE_RULE = "";
const usd = (x) => x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const WHY_RANK = "Rank columns wait on graphty-element: the rank over the run's scope, with a rank column on request (element needs, the rank row). Absent until then.";
// The agreement line: the longest top k that every measure agrees on, then where they part.
// measures: [{ name, ranks }], names: row labels. Only current measures are passed.
function agreement(measures, names, n) {
    const all = measures.length === 2 ? "both measures" : `all ${["", "", "two", "three", "four", "five"][measures.length]} measures`;
    const topSet = (m, k) => names.map((_, i) => i).filter((i) => m.ranks[i].r <= k);
    let k = 0;
    for (let t = 1; t <= Math.min(20, n); t++) {
        const sets = measures.map((m) => topSet(m, t));
        if (sets.every((x) => x.length === t) && sets.every((x) => x.join() === sets[0].join())) k = t;
        else break;
    }
    const list = (ids) => ids.map((i) => names[i]);
    const join = (a) => (a.length === 1 ? a[0] : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
    // "CDK1 by degree, YWHAZ by betweenness and pagerank": one entry per node, its measures joined.
    const at = (t) => {
        const by = new Map();
        for (const m of measures) {
            const hit = names.map((_, i) => i).filter((i) => m.ranks[i].r === t);
            const who = hit.length ? names[hit[0]] + (hit.length > 1 ? ` (tied with ${hit.length - 1} more)` : "") : "none";
            by.set(who, [...(by.get(who) || []), m.name]);
        }
        return [...by].map(([who, ms]) => `${who} by ${join(ms)}`).join(", ");
    };
    const head = k === 0 ? "No node is #1 on " + all + "."
        : k > 3 ? `The top ${k} are the same on ${all}, led by ${names[topSet(measures[0], 1)[0]]}.`
        : k === 1 ? `${names[topSet(measures[0], 1)[0]]} is #1 on ${all}.`
        : `${join(list(topSet(measures[0], k).sort((a, b) => measures[0].ranks[a].r - measures[0].ranks[b].r)))} are the top ${k} on ${all}.`;
    // A long agreement needs no "where they part": the reader has the top k.
    return { k, text: k > 3 ? head : `${head} At #${k + 1} they part: ${at(k + 1)}.` };
}
const agreeHtml = (a, n) => `<div class="s-agree k-fact"${n ? ` data-n="${n}"` : ""}><span>${esc(a.text)}</span><a class="s-action" href="comparison.html">Compare rankings...</a></div>`;
const blk = (why) => `<span class="k-annot-tag s-blk" title="${esc(why)}">blocked</span>`;
const sizeScale = `<span class="s-scale" aria-hidden="true"><i style="width:2px;height:2px"></i><i style="width:4px;height:4px"></i><i style="width:6px;height:6px"></i><i style="width:8px;height:8px"></i></span>`;

// One column header, the same form on every column: channel glyph, name, sort caret; the profile
// line; the distribution slot (histogram, or a count strip for a category); the scale slot.
function th(col, i) {
    const cls = [col.num ? "k-n" : "", i === 0 ? "s-name" : "", col.hover ? "s-hhover" : "", col.rank ? "s-rank" : "", col.wide ? "s-rankwide" : ""].filter(Boolean).join(" ");
    const sort = col.sort ? ` aria-sort="${col.sort}"` : "";
    const top = `<span class="s-h1">${col.glyph || ""}<span class="s-label">${esc(col.name)}</span>${col.sort ? CARET : ""}<span class="k-grow"></span><span role="button" class="s-hmenu" aria-label="Column menu">${I("chevron-down", "k-i k-i-sm")}</span></span>`;
    const prof = `<span class="s-h2">${col.profile}</span>`;
    const dist = `<span class="s-h3">${col.dist || ""}</span>`;
    const scale = `<span class="s-h4">${col.scale || ""}</span>`;
    return `<th class="${cls}" aria-colindex="${i + 1}"${sort}${col.n ? ` data-n="${col.n}"` : ""}${col.nb ? ` data-nb="${col.nb}"` : ""}>${top}${prof}${dist}${scale}</th>`;
}
// A run's score and rank columns sit under one group header naming the run, its method and its
// scope; every other column has an empty group cell. groups: [{ span, name, method, extra, n }].
function groupRow(cols) {
    const cells = [];
    for (let k = 0; k < cols.length; k++) {
        const g = cols[k].group;
        if (!g) { cells.push(`<th class="s-g0" aria-hidden="true"></th>`); continue; }
        cells.push(`<th class="s-g" colspan="${g.span}"${g.n ? ` data-n="${g.n}"` : ""}${g.nb ? ` data-nb="${g.nb}"` : ""}><span class="s-gname">${g.name}</span> <span class="s-gmethod">${g.method}</span>${g.extra || ""}</th>`);
        k += g.span - 1;
    }
    return `<tr class="s-grouprow">${cells.join("")}<th class="s-fill s-g0" aria-hidden="true"></th></tr>`;
}
function table({ cols, rows, rowcount, selectable = true, attrs = "" }) {
    const grouped = cols.some((c) => c.group);
    const head = `<thead${grouped ? ' class="s-grouped"' : ""}>${grouped ? groupRow(cols) : ""}<tr>${cols.map(th).join("")}<th class="s-fill" aria-hidden="true"></th></tr></thead>`;
    const body = rows.map((r) => {
        const a = [r.index ? `aria-rowindex="${r.index}"` : "", r.selected ? 'aria-selected="true"' : "", r.hover ? "data-hover" : "", r.n ? `data-n="${r.n}"` : ""].filter(Boolean).join(" ");
        const cells = r.cells.map((c, k) => {
            const col = cols[k];
            const cl = [col.num ? "k-n" : "", col.rank ? "s-rank" : "", col.wide ? "s-rankwide" : "", k === 0 ? "k-id s-name" : "", c.focus ? "s-focus" : "", c.stale ? "s-stale" : ""].filter(Boolean).join(" ");
            return `<td class="${cl}"${c.n ? ` data-n="${c.n}"` : ""}>${c.html ?? esc(c.v)}</td>`;
        }).join("");
        return `<tr ${a}>${cells}<td class="s-fill"></td></tr>`;
    }).join("");
    return `<table class="k-table" role="grid" tabindex="0" aria-rowcount="${rowcount}"${selectable ? ' aria-multiselectable="true"' : ""} ${attrs}>${head}<tbody>${body}</tbody></table>`;
}
const cell = (v, o = {}) => ({ v, ...o });
// The selection total: a footer under the grid, "Sum of <column>, <n> rows: <sum>".
const totalBar = (text, n = "") => `<div class="s-total k-fact" role="status"${n ? ` data-n="${n}"` : ""}>${text}</div>`;

/* ---------- the frame ---------- */
const rail = `<nav class="k-rail" aria-label="Main">
<div class="k-rail-btn" role="button" aria-label="Main menu"><span class="k-rail-pill">${I("menu")}</span></div><div class="k-rail-sep"></div>
<div class="k-rail-btn" role="button" aria-pressed="true"><span class="k-rail-pill">${I("network")}</span>Graph</div>
<div class="k-rail-btn k-asst-off" role="button" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div>
<div class="k-rail-btn" role="button"><span class="k-rail-pill">${I("flask-conical")}</span>Results</div>
<div class="k-rail-btn" role="button"><span class="k-rail-pill">${I("sticky-note")}</span>Notes</div></nav>`;
const toolbar = `<div class="k-toolbar-dock"><div class="k-toolbar" role="toolbar" aria-label="Tools">
<span class="k-tool" aria-pressed="true">${I("mouse-pointer-2", "k-i k-i-lg")}</span><span class="k-tool-caret">${I("chevron-down", "k-i k-i-sm")}</span>
<span class="k-tool">${I("route", "k-i k-i-lg")}</span><span class="k-toolbar-sep"></span>
<span class="k-tool">${I("zap", "k-i k-i-lg")}</span><span class="k-toolbar-sep"></span>
<span class="k-tool">${I("square", "k-i k-i-lg")}</span><span class="k-tool-caret">${I("chevron-down", "k-i k-i-sm")}</span></div></div>
<span class="k-help">${I("circle-help")}</span>`;
function left({ project, chip, chipN, graph, count, sets = "", styles }) {
    return `<aside class="k-panel" aria-label="Graph"><div class="k-panel-head">
<div class="k-title-line"><span class="k-project">${project}</span>${I("chevron-down", "k-i k-i-sm k-secondary")}</div>
<span class="k-chip"${chipN ? ` data-n="${chipN}"` : ""}>${I("funnel", "k-i k-i-sm")}<span class="k-num">${chip}</span></span></div>
<div class="k-scroll"><section class="k-section"><div class="k-section-head">Graphs<span class="k-grow"></span><span role="button" class="k-icon-btn" aria-label="Find a graph">${I("search")}</span><span role="button" class="k-icon-btn" aria-label="Add a graph">${I("plus")}</span></div>
<ul class="k-list" role="listbox" aria-label="Graphs"><li class="k-item" role="option" aria-selected="true">${I("network")}<span class="k-grow k-ellipsis">${graph}</span><span class="k-trail k-num">${count}</span></li></ul></section>
<section class="k-section"${sets ? "" : " data-empty"}><div class="k-section-head">Sets and paths<span class="k-grow"></span><span role="button" class="k-icon-btn" aria-label="New set">${I("plus")}</span></div>${sets}</section>
<section class="k-section"><div class="k-section-head">Styles<span class="k-grow"></span><span role="button" class="k-icon-btn" aria-label="Add a style layer">${I("plus")}</span></div>
<ul class="k-list">${styles}</ul></section></div></aside>`;
}
const layer = (mark, name, kind = "", n = "") => `<li class="k-item"${n ? ` data-n="${n}"` : ""}>${mark}<span class="k-ellipsis">${name}</span>${kind ? `<span class="k-kind">${kind}</span>` : ""}</li>`;
const BASE = layer(chit("#808080"), "Base style", "");
function right(type, body, n = "") {
    return `<aside class="k-right" aria-label="Inspector">
<div class="k-header2"><span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">100%${I("chevron-down", "k-i k-i-sm")}</span></div>
<div class="k-typerow"${n ? ` data-n="${n}"` : ""}>${type}</div><div class="k-scroll">${body}</div></aside>`;
}
const data = (name, value, cls = "k-num") => `<div class="k-data"><span class="k-name">${name}</span><span class="k-value ${cls}">${value}</span></div>`;
function dock({ tabs, scope, scopeN, tableHtml, basis, handle = "", extra = "", scrollbar = "", tabsN = "", exportN = "", agree = "" }) {
    const t = tabs.map((x) => `<span class="k-tab" role="tab" aria-selected="${x.on ? "true" : "false"}">${x.name}</span>`).join("");
    return `<section class="k-dock" aria-label="Table"${basis ? ` style="flex-basis:${basis}"` : ""}><div class="k-dock-handle${handle}" role="separator" aria-orientation="horizontal" aria-label="Resize the table"></div>
<div class="k-dock-tabs"><span class="s-tabs" role="tablist" aria-label="Table"${tabsN ? ` data-n="${tabsN}"` : ""}>${t}</span><span class="k-grow"></span>
<span class="k-icon-btn" role="button" aria-label="Find in table" title="Find in table">${I("search")}</span><span class="k-btn k-btn-ghost"${exportN ? ` data-n="${exportN}"` : ""}>Export table as CSV...</span></div>
<div class="k-scope"><span class="s-scopetext"${scopeN ? ` data-n="${scopeN}"` : ""}>${scope}</span></div>${agree}
<div class="k-table-wrap s-virtual">${tableHtml}${scrollbar}</div>${extra}</section>`;
}
function state({ id, title, lede, app, notes, after = "" }) {
    const li = notes.map((n, k) => `<li><span class="k-step">${k + 1}</span><div>${n[0]}<br><span class="k-secondary">${n[1]}</span></div></li>`).join("");
    return `<section class="s-state" id="${id}"><h2><a href="#${id}">${title}</a></h2><p>${lede}</p>
<div class="s-frame">${app}</div><ol class="s-notes k-annot-note">${li}</ol>${after}</section>`;
}

/* ---------- Les Miserables ---------- */
const L = F.lesmis;
const LMV = L.rows.find((r) => r.label === "Valjean");
const GC = L.groupColors;
const groupCounts = L.attributes.find((a) => a.name === "group").values;
const groupSegs = Object.entries(groupCounts).map(([g, n]) => ({ name: `group ${g}`, n, c: GC[g] })).sort((a, b) => b.n - a.n || (a.c === "#BDBDBD") - (b.c === "#BDBDBD"));
// Other (#BDBDBD) values last, as the legend lists them.
groupSegs.sort((a, b) => (a.c === "#BDBDBD") - (b.c === "#BDBDBD") || b.n - a.n);
// Ranks over the 77 characters: degree, and betweenness from its unrounded values.
const lmDegRank = ranks(L.rows.map((r) => r.degree));
const lmBtwRank = ranks(T.lesmisBetweennessRaw);
L.rows.forEach((r, i) => { r.degRank = lmDegRank[i]; r.btwRank = lmBtwRank[i]; });
const lmAgree = agreement([{ name: "degree", ranks: lmDegRank }, { name: "betweenness", ranks: lmBtwRank }], L.rows.map((r) => r.label), L.nodes);
const lmRows = [...L.rows].sort((a, b) => b.degree - a.degree || (a.label < b.label ? -1 : 1));
const lmDeg = histogram(L.rows.map((r) => r.degree));
const lmBtw = histogram(L.rows.map((r) => r.betweenness));
const maxBtw = Math.max(...L.rows.map((r) => r.betweenness));
const GROUP_GLYPH = stack(["#009E73", "#56B4E9", "#E69F00"]);
const WHY_BINS_DEG = "Waits on graphty-element: histogram bins for an attribute that is not a result's field, and the degree distribution (element needs, the histogram-bins row). Absent until then.";
const WHY_BINS = "Waits on graphty-element: histogram bins for an attribute that is not a result's field (element needs, the histogram-bins row). Absent until then.";
// A rank column: "#3" in the cells, the denominator in the header, the scope in the group header.
const rankCol = (of, o = {}) => ({ name: "rank", num: true, rank: true, profile: `of ${fmt(of)}`, dist: `<span class="s-dist s-dist-blank">${blk(WHY_RANK)}</span>`, ...o });
const STALE = `<span class="s-stalemark">${I("triangle-alert", "k-i k-i-sm")}Out of date</span><a class="s-action">Re-run</a>`;
const lmCols = (o = {}) => [
    { name: "label", profile: `${fmt(L.nodes)} values`, n: o.nLabel },
    { name: "group", glyph: GROUP_GLYPH, profile: `${Object.keys(groupCounts).length} values`, dist: stripHtml(groupSegs, { encoded: true }), n: o.nGroup },
    { name: `degree (${o.degScope ?? "full graph"})`, num: true, glyph: SIZECHIP, sort: o.sortDeg === false ? null : "descending", profile: `${Math.min(...L.rows.map((r) => r.degree))} to ${Math.max(...L.rows.map((r) => r.degree))}`, dist: distHtml(lmDeg, { blocked: WHY_BINS_DEG, label: "degree" }), scale: sizeScale, n: o.nDeg, hover: o.hoverDeg,
      group: { span: 2, name: "Degree", method: "", n: o.nDegGroup } },
    rankCol(o.degOf ?? L.nodes),
    { name: "betweenness", num: true, profile: `0 to ${maxBtw}`, dist: distHtml(lmBtw, { label: "betweenness" }), n: o.nBtw, nb: "right",
      group: { span: 2, name: "Betweenness", method: "exact, unweighted, full graph", extra: o.stale ? STALE : "", n: o.nBtwGroup, nb: "right" } },
    rankCol(L.nodes, { n: o.nBtwRank, nb: "right" }),
];
const lmStyles = layer(SIZECHIP, "Size: degree") + layer(GROUP_GLYPH, "Group color") + BASE;
const legendOf = (segs) => `<div class="k-legend-card"><div class="k-lg-title">Group color <span class="k-secondary">group</span></div>
${segs.slice(0, 4).map((s) => `<div class="k-lg-row">${chit(s.c)}${s.name.replace("group ", "")}<span class="k-value k-num">${s.n}</span></div>`).join("")}
${segs.length > 4 ? `<div class="k-lg-row k-secondary">${segs.length - 4} more</div>` : ""}</div>`;
const lmLegend = legendOf(groupSegs);
// What the three filter steps leave drawn, counted from the kit's drawing of that state.
const step3Legend = (() => {
    const svg = readFileSync(join(here, "../kit/canvas/lesmis-step3-light.svg"), "utf8");
    const byColor = {};
    for (const m of svg.matchAll(/<circle [^>]*r="[0-9.]+" fill="(#[0-9A-Fa-f]{6})"/g)) byColor[m[1]] = (byColor[m[1]] || 0) + 1;
    return legendOf(groupSegs.filter((s) => byColor[s.c]).map((s) => ({ ...s, n: byColor[s.c] })).sort((a, b) => b.n - a.n));
})();
const btw = (x) => x.toFixed(3);

/* State 1: small graph */
const s1Rows = lmRows.map((r, k) => ({
    index: k + 2,
    selected: r.label === "Valjean",
    hover: r.label === "Javert",
    n: r.label === "Valjean" ? 5 : r.label === "Javert" ? 6 : "",
    cells: [cell(r.label), cell(r.group), cell(r.degree, { focus: r.label === "Gavroche", n: r.label === "Gavroche" ? 7 : "" }), cell(rankText(r.degRank)), cell(btw(r.betweenness)), cell(rankText(r.btwRank))],
}));
const s1 = state({
    id: "small",
    title: "Small graph: 77 characters, every row",
    lede: `Les Miserables with no filter step on. The table lists all 77 characters, sorted by degree because the Size: degree layer reads that column. Valjean is selected, so his row is selected. The pointer rests on Javert's row, and the canvas draws Javert's hover outline at the same moment. Keyboard focus is on Gavroche's degree cell, one row below Valjean. Betweenness has run, so it and degree each carry a rank column, and the agreement line above the table compares the two.`,
    app: `<div class="k-app s-app">${rail}${left({ project: "Les Miserables", chip: "Full graph", graph: "Co-appearances", count: "77 nodes", styles: lmStyles.replace('<li class="k-item">', '<li class="k-item" data-n="3">') })}
<main class="k-main"><div class="k-canvas"><div class="k-stage">
<img class="k-light-only" src="img/table-dock-lesmis-hover-light.svg" alt="Les Miserables colored by group, sized by degree, Valjean selected, Javert hovered">
<img class="k-dark-only" src="img/table-dock-lesmis-hover-dark.svg" alt="Les Miserables colored by group, sized by degree, Valjean selected, Javert hovered"><span class="k-at s-hovermark" data-n="6" aria-hidden="true" style="left:${L.anchors.hover.x}%;top:${L.anchors.hover.y}%"></span></div>
${lmLegend}${toolbar}</div>
${dock({ tabs: [{ name: "Nodes", on: 1 }, { name: "Edges" }], tabsN: 1, exportN: 2, scope: "Full graph: 77 nodes", scopeN: 3, agree: agreeHtml(lmAgree, 8), tableHtml: table({ cols: lmCols({ nDeg: 4, nBtwGroup: 9 }), rows: s1Rows, rowcount: 78 }) })}</main>
${right(`${I("circle-dot")}<span class="k-name k-id">Valjean</span><span class="k-secondary">Node</span>`, `<section class="k-section"><div class="k-section-head">Appearance</div>
<div class="k-fieldrow"><span class="k-legend">Color <span class="k-tertiary">-- Group color</span></span><div class="k-fields"><span class="k-field k-span"><span class="k-pill">${chit("#E69F00")}group</span></span></div></div>
<div class="k-fieldrow"><span class="k-legend">Size <span class="k-tertiary">-- Size: degree</span></span><div class="k-fields"><span class="k-field k-span"><span class="k-pill">${SIZECHIP}degree</span></span></div></div></section>
<section class="k-section"><div class="k-section-head">Attributes</div>${data("group", 2)}${data("degree", 36)}${data("betweenness", String(LMV.betweenness))}</section>`)}</div>`,
    notes: [
        ["Pill tabs: Nodes and Edges; an item tab joins them when a result's groups are opened (the large-graph state shows it). The magnifier is Find in table.", "Framework: interface-templates.md 16; information-architecture.md 4, Table tabs. Built with: Mantine Tabs, pills variant (Figma 16 Pill tabs); ActionIcon with aria-label."],
        ["Export table as CSV... is the table's one exit: every row of this tab and scope (all 77 here), the file's own ids beside the labels, and every column under the headers shown, a run's method and scope included (the dialog is drawn under Getting rows out). Export... in the File list writes figures, the graph's data, the recipe and the style, but not tables. There is no overflow menu on the tab row.", "Framework: output-homes.md 3, export-table; interface-templates.md 16 and 20 (both labels proposed in framework-changes.md). Built with: compact-mantine Button, subtle."],
        ["The scope line names the rows: the full graph, because no filter step is on. Its layers: the Styles list draws Size: degree and Group color with the same glyphs the column headers carry.", "Framework: information-architecture.md 8.1, The table's scope; message-catalog.md graphty.table.scope (the Full graph wording is proposed in framework-changes.md). Built with: compact-mantine ProseBlock."],
        ["Every header has the same form, two row pitches tall (64): the channel glyph when a layer reads the column, the name and the 5 by 3 sort caret; one profile line (numbers: min to max; categories: the value count; completeness only when values are missing); the distribution (a histogram, or a count strip for a category, colored by the layer that reads it, Other in dark gray); and the channel's scale (graduated circles for size). The distributions of degree and every attribute that is not a result wait on graphty-element (magenta tag).", "Framework: interface-templates.md 16; information-architecture.md 8.1; output-homes.md 2, attribute; canvas-drawing.md 3 and 7. Built with: DataTable header variant (proposed, framework-changes.md) holding RampRow's and HistogramRow's mini forms."],
        ["Valjean's row is selected: the canvas ring and the inspector show the same node. A click on a row selects it.", "Framework: information-architecture.md 8.1; interaction-pattern-entries.md 4.1. Built with: DataTable row selection (every cell bg-selected)."],
        ["Linked hover: the pointer on Javert's row tints it and the canvas draws Javert's hover outline. This is the one departure from Figma's untinted table rows, filed against DataTable.", "Framework: figma-crosswalk.md 4.3, Variables table rows take no hover tint; canvas-drawing.md 2. Built with: DataTable row hover (proposed variant)."],
        ["Keyboard focus is on Gavroche's degree cell: DataTable's 1 px border-selected box, drawn inset. The grid is one Tab stop; arrows move the cell, Enter selects the row's node, Space adds or removes it, Shift and an arrow extend.", "Framework: interaction-pattern-entries.md 9.1; interface-templates.md 16, Tab order. Built with: DataTable, as a WAI-ARIA grid (figma-spec.md 10.6 active cell)."],
        [`The agreement line, once two measures have rank columns: "${lmAgree.text}" Compare rankings... opens the table's Scatter view, rank against rank. The three-measure version is drawn under Three measures ranked.`, "Framework: the Rank columns proposal in framework-changes.md; output-homes.md 2, comparing two results. Built with: compact-mantine ProseBlock and Anchor."],
        ["The run's group header names what the numbers under it are: Betweenness, exact, unweighted, over the full graph. The rank beside it shows \"#1\" and the header \"of 77\". Degree has the same pair, and its column header names the graph it was counted on, \"degree (full graph)\", so a degree over the full graph and one over a filtered graph never look alike.", "Framework: output-homes.md 2; content-design.md 5, Ranks. Built with: DataTable column groups (proposed)."],
    ],
    after: `<div class="s-inset" data-kit-note><div><b>When graphty-element reports each node's resolved paint</b><p class="k-secondary">The group column's cells then carry a chit of the color each node is drawn with. Until then the cells show the raw value only, as in the state above; the chits wait on the element (element needs, the resolved-value row).</p></div>
<div class="s-inset-table">${table({ cols: [{ name: "label", profile: "77 values" }, { name: "group", glyph: GROUP_GLYPH, profile: "10 values", dist: stripHtml(groupSegs, { encoded: true }) }], rows: lmRows.slice(0, 5).map((r) => ({ cells: [cell(r.label), { html: `${chit(GC[r.group])}${r.group}` }] })), rowcount: 78 })}${blk("Cell chits wait on graphty-element: the resolved value on each channel explanation.")}</div></div>`,
});

/* State 2: the column header's gestures (a panel, not the whole app) */
const topB = L.topByBetweenness.slice(0, 5);
const hpop = histogram(L.rows.map((r) => r.betweenness), 24);
const miniHead = (o) => `<div class="s-hcell">${table({ cols: [lmCols({ ...o })[2]], rows: lmRows.slice(0, 2).map((r) => ({ cells: [cell(r.degree)] })), rowcount: 78 })}</div>`;
const s2 = `<section class="s-state" id="header"><h2><a href="#header">The column header: what each part does</a></h2>
<p>The degree header of the small graph, at 1:1. The label sorts, a chevron that appears on hover (or a right-click anywhere on the header) opens the column's menu, and the distribution opens the histogram. These are Figma's own conventions: a chevron after a control means a menu, and controls that would clutter every row appear on hover.</p>
<div class="s-gestures">
<figure><figcaption><span class="k-step">1</span>At rest</figcaption>${miniHead({})}<p>Sorted descending: the 5 by 3 caret after the label. No menu mark at rest.</p></figure>
<figure><figcaption><span class="k-step">2</span>Pointer on the header</figcaption>${miniHead({ hoverDeg: true })}<p>The chevron appears on the side away from the label. A click on the label sorts: descending, then ascending, then back to the default order (the column a visible layer reads). Enter on a focused header does the same.</p></figure>
<figure class="s-wide"><figcaption><span class="k-step">3</span>Chevron, or right-click on the header</figcaption>${miniHead({ hoverDeg: true })}
<div class="k-menu s-inline-menu" role="menu" aria-label="degree column">
<div class="k-menu-item" role="menuitem"><span class="k-check-col">&#10003;</span>Sort descending</div>
<div class="k-menu-item" role="menuitem"><span class="k-check-col"></span>Sort ascending</div><div class="k-menu-sep"></div>
<div class="k-menu-item" data-hover role="menuitem"><span class="k-check-col"></span>Filter to...</div>
<div class="k-menu-item" role="menuitem"><span class="k-check-col"></span>Compare columns...</div><div class="k-menu-sep"></div>
<div class="k-menu-item" role="menuitem"><span class="k-check-col"></span>Color by degree</div>
<div class="k-menu-item" role="menuitem"><span class="k-check-col">&#10003;</span>Size: degree</div><div class="k-menu-sep"></div>
<div class="k-menu-item" role="menuitem"><span class="k-check-col"></span>New column<span class="k-sub">${I("chevron-right", "k-i k-i-sm")}</span></div>
<div class="k-menu-item" role="menuitem"><span class="k-check-col"></span>Join...</div></div>
<p>Eight entries, the cap. On a category column Partition by takes the place of Compare columns..., which needs numbers; on an edge column Width by replaces Size by. Size by carries a check because a layer already reads this column.</p></figure>
<figure class="s-wide"><figcaption><span class="k-step">4</span>Click on the distribution</figcaption>
<div class="k-popover s-inline-pop" role="dialog" aria-label="betweenness histogram"><div class="k-popover-head">betweenness<span class="k-grow"></span><span role="button" class="k-icon-btn" aria-label="Close">${I("x")}</span></div>
<div class="k-popover-body"><div class="s-bighist">${distHtml(hpop, { label: "betweenness" })}</div>
<div class="s-axis k-secondary k-num"><span>0</span><span>log scale</span><span>${maxBtw}</span></div>
<div class="k-prose">${fmt(L.nodes)} nodes, ${hpop.zeros} at 0. Shaded: ${hpop.above} past the outlier fence.</div>
${topB.map((r) => data(`<span class="k-id">${r.label}</span>`, btw(r.betweenness))).join("")}</div></div>
<p>The histogram popover for betweenness, which ships because betweenness is a result's field. Dragging across the bars sets a band, and the band's menu offers Create set and Create rule set.</p></figure>
</div>
<ol class="s-notes k-annot-note"><li><span class="k-step">1</span><div>The caret is DataTable's own 5 by 3 sort indicator, not a chevron icon, so nothing on a header at rest looks like a menu.<br><span class="k-secondary">Framework: figma-spec.md 10.6 (compact-mantine), sort indicator. Built with: DataTable.</span></div></li>
<li><span class="k-step">2</span><div>Hover-reveal is Figma's pattern for row controls (a layer row's eye and lock). The chevron is also reachable without a pointer: Shift+F10 or the context-menu key on a focused header opens the same menu.<br><span class="k-secondary">Framework: interaction-pattern-entries.md 9.1; figma-crosswalk.md 4.1. Built with: DataTable header variant with an ActionIcon slot.</span></div></li>
<li><span class="k-step">3</span><div>The column menu: sort, Filter to..., Compare columns... (the Scatter view), the encodings, New column, Join..., at most eight entries above submenus.<br><span class="k-secondary">Framework: information-architecture.md 8.3; interface-specification.md 4.1a; output-homes.md 3. Built with: compact-mantine Menu (dark).</span></div></li>
<li><span class="k-step">4</span><div>The popover opens beside the header, 240 wide; its top items are capped at five.<br><span class="k-secondary">Framework: interface-templates.md 12; interface-specification.md 4.1a. Built with: compact-mantine Popover, HistogramRow (band variant needed), DataRow.</span></div></li></ol></section>`;

/* ---------- March transfers ---------- */
const X = F.transactions;
const cols8 = T.columns;
const acc = T.rows.map((r) => Object.fromEntries(cols8.map((c, k) => [c, r[k]])));
// Ranks over the 3,000 accounts: total degree, and PageRank from its unrounded values.
const txDegRank = ranks(acc.map((r) => r.degree));
const txPrRank = ranks(T.pagerankRaw);
acc.forEach((r, i) => { r.degRank = txDegRank[i]; r.prRank = txPrRank[i]; r.prRaw = T.pagerankRaw[i]; });
const txAgree = agreement([{ name: "degree", ranks: txDegRank }, { name: "pagerank", ranks: txPrRank }], acc.map((r) => r.id), X.nodes);
const byPR = [...acc].sort((a, b) => b.prRaw - a.prRaw || (a.id < b.id ? -1 : 1));
byPR.forEach((r, k) => (r.rank = k + 1));
const ring = byPR.filter((r) => r.flagged);
const commName = (c) => `Community ${c}`;
const commColor = (c) => T.communityColors[commName(c)] || T.otherColor;
const commSizes = Object.entries(acc.reduce((m, r) => ((m[r.community] = (m[r.community] || 0) + 1), m), {})).map(([c, n]) => ({ c: Number(c), n })).sort((a, b) => b.n - a.n);
const commSegs = [...commSizes.filter((s) => s.c <= 7).map((s) => ({ name: commName(s.c), n: s.n, c: commColor(s.c) })), { name: `Other (${commSizes.length - 7} communities)`, n: commSizes.filter((s) => s.c > 7).reduce((a, s) => a + s.n, 0), c: T.otherColor }];
const countSegs = (key) => Object.entries(acc.reduce((m, r) => ((m[r[key]] = (m[r[key]] || 0) + 1), m), {})).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
const kindSegs = countSegs("kind"), countrySegs = countSegs("country");
const range = (key, d) => { const v = acc.map((r) => r[key]); return `${d ? Math.min(...v).toFixed(d) : fmt(Math.min(...v))} to ${d ? Math.max(...v).toFixed(d) : fmt(Math.max(...v))}`; };
const hDeg = histogram(acc.map((r) => r.degree)), hPR = histogram(acc.map((r) => r.pagerank)), hRisk = histogram(acc.map((r) => r.riskScore));
const COMM_GLYPH = stack([commColor(3), commColor(2), commColor(1)]);
const txCols = (o = {}) => [
    { name: "id", profile: `${fmt(X.nodes)} values` },
    { name: "kind", profile: `${kindSegs.length} values`, dist: stripHtml(kindSegs) },
    { name: "country", profile: `${countrySegs.length} values`, dist: stripHtml(countrySegs) },
    { name: "community", glyph: COMM_GLYPH, profile: `${commSizes.length} values`, dist: stripHtml(commSegs, { encoded: true }), n: o.nComm },
    { name: "degree (total, full graph)", num: true, glyph: SIZECHIP, profile: range("degree"), dist: distHtml(hDeg, { blocked: WHY_BINS_DEG, label: "degree" }), scale: sizeScale, hover: o.menuDeg,
      group: { span: 2, name: "Total degree", method: "" } },
    rankCol(X.nodes),
    { name: "pagerank", num: true, sort: "descending", profile: range("pagerank", 6), dist: distHtml(hPR, { label: "pagerank" }), n: o.nPR,
      group: { span: 2, name: "PageRank", method: "damping 0.85, unweighted, full graph", n: o.nPRGroup } },
    rankCol(X.nodes, { n: o.nPRRank }),
    { name: "riskScore", num: true, profile: range("riskScore"), dist: distHtml(hRisk, { blocked: WHY_BINS, label: "riskScore" }), n: o.nRisk, nb: "right" },
];
const txRow = (r, o = {}) => ({
    index: o.index,
    selected: !!r.flagged,
    n: o.n || "",
    cells: [cell(r.id), cell(r.kind), cell(r.country), cell(commName(r.community)), cell(r.degree), cell(rankText(r.degRank)), cell(r.pagerank.toFixed(6)), cell(rankText(r.prRank)), cell(r.riskScore)],
});
const txStyles = (n) => layer(SIZECHIP, "Size: total degree") + layer(COMM_GLYPH, "Community color", "Louvain", n) + BASE;
const lg = F.transactionsApril.legends.march;
const txLegend = `<div class="k-legend-card"><div class="k-lg-title">Community color <span class="k-secondary">community</span></div>
${lg.rows.slice(0, 3).map((r) => `<div class="k-lg-row">${chit(r.color)}${r.name.replace("Community ", "")}<span class="k-value k-num">${r.count}</span></div>`).join("")}
<div class="k-lg-row k-secondary">4 more</div>
<div class="k-lg-row">${chit(T.otherColor)}Other, ${lg.other.communities} communities<span class="k-value k-num">${fmt(lg.other.count)}</span></div><div class="k-lg-sub">${lg.other.holds}</div></div>`;
const ringVals = (k) => ring.map((r) => r[k]);
const txInspector = (n) => right(`${I("circle-dot")}<span class="k-name k-num">14 nodes</span><span class="k-secondary">Selection</span>`, `<section class="k-section"><div class="k-section-head">Attributes</div>
${data("kind", "personal 14", "")}${data("country", "7 values", "")}${data("community", "Community 33", "")}
${data("total degree", `${Math.min(...ringVals("degree"))} to ${Math.max(...ringVals("degree"))}`)}
${data("pagerank", `${Math.min(...ringVals("pagerank")).toFixed(6)} to ${Math.max(...ringVals("pagerank")).toFixed(6)}`)}
${data("riskScore", `${Math.min(...ringVals("riskScore"))} to ${Math.max(...ringVals("riskScore"))}`)}</section>`, n);
const txCanvas = `<div class="k-canvas"><div class="k-stage">
<img class="k-light-only" src="img/table-dock-transfers-ring-light.svg" alt="3,000 accounts colored by Louvain community and sized by degree, the 14 flagged accounts selected">
<img class="k-dark-only" src="img/table-dock-transfers-ring-dark.svg" alt="3,000 accounts colored by Louvain community and sized by degree, the 14 flagged accounts selected"></div>${txLegend}${toolbar}</div>`;
const txTabs = [{ name: "Nodes", on: 1 }, { name: "Edges" }, { name: "Communities: Louvain" }];

// State 3: the window of 12 rows, in PageRank order, holding the most selected rows with an
// unselected row first, so the selection is scattered through what the reader sees.
const WIN = 12;
let best = { start: 1, c: -1 };
for (let s = 1; s <= X.nodes - WIN + 1; s++) {
    if (byPR[s - 1].flagged) continue;
    const c = byPR.slice(s - 1, s - 1 + WIN).filter((r) => r.flagged).length;
    if (c > best.c) best = { start: s, c };
}
const win = byPR.slice(best.start - 1, best.start - 1 + WIN);
const noteRow = win.find((r, k) => k > 0 && r.flagged && !win[k - 1].flagged);
const offscreen = 14 - win.filter((r) => r.flagged).length;
const trackH = 300;
const thumbTop = Math.round(((best.start - 1) / (X.nodes - WIN)) * (trackH - 24));
// The degree column's menu, open on New column. The transfers' weight column, amount, is a currency,
// so weighted degree is offered in money words; a link count says it is a count.
const menuItem = (label, o = {}) => `<div class="k-menu-item" role="menuitem"${o.hover ? " data-hover" : ""}${o.desc ? " data-described" : ""}><span class="k-check-col">${o.check ? "&#10003;" : ""}</span>${o.desc ? `<span class="k-grow">${label}<span class="k-menu-desc">${o.desc}</span></span>` : label}${o.sub ? `<span class="k-sub">${I("chevron-right", "k-i k-i-sm")}</span>` : ""}</div>`;
const SEP = `<div class="k-menu-sep"></div>`;
const newColumnMenu = `<div class="k-menu s-colmenu" role="menu" aria-label="degree column">
${menuItem("Sort descending")}${menuItem("Sort ascending")}${SEP}${menuItem("Filter to...")}${menuItem("Compare columns...")}${SEP}${menuItem("Color by total degree")}${menuItem("Size: total degree", { check: 1 })}${SEP}
${menuItem("New column", { sub: 1, hover: 1 })}${menuItem("Join...")}</div>
<div class="k-menu s-submenu" role="menu" aria-label="New column" data-n="2" data-nb="right">
${menuItem("Money in", { desc: "Sum of amount on transfers in, USD", hover: 1 })}${menuItem("Money out", { desc: "Sum of amount on transfers out, USD" })}${menuItem("Money in minus out", { desc: "Money in less money out, USD" })}${SEP}
${menuItem("Links in (count)", { desc: "Transfers in, counted, not summed" })}${menuItem("Links out (count)", { desc: "Transfers out, counted, not summed" })}</div>
<span class="k-cursor" style="left:700px;top:498px"></span>`;
const s3 = state({
    id: "large",
    title: "Large graph: 3,000 accounts, virtualized",
    lede: `A month of transfers between 3,000 accounts, every account drawn, colored by its Louvain community and sized by degree. The 14 flagged accounts are selected: each carries the selection ring over its community color (all 14 sit in Community 33, which falls in Other). The analyst sorted by pagerank and scrolled to row ${fmt(best.start)}: ${best.c} selected accounts are in view between unselected ones, and ${offscreen} more are off screen, which is why the scope line counts them. Asked where the money goes, the analyst opened the degree column's menu: New column offers weighted degree in money words, because the transfers' weight column, amount, is a currency.`,
    app: `<div class="k-app s-app">${rail}${left({ project: "March transfers", chip: "Full graph", graph: "Transfers", count: "3,000 nodes", styles: txStyles(1) })}
<main class="k-main">${txCanvas}
${dock({
        tabs: txTabs, basis: "52%", scope: "Full graph: 3,000 nodes, 14 selected", scopeN: 3, agree: agreeHtml(txAgree, 7),
        tableHtml: table({ cols: txCols({ nRisk: 8, nPRGroup: 6, menuDeg: true }), rows: win.map((r, k) => txRow(r, { index: r.rank + 1, n: r === noteRow ? 5 : "" })), rowcount: X.nodes + 1 }),
        scrollbar: `<div class="s-scrollbar" data-n="4" aria-hidden="true"><i style="top:${thumbTop}px;height:24px"></i></div>`,
    })}${newColumnMenu}</main>
${txInspector()}</div>`,
    notes: [
        ["Every account is drawn: 3,000 is far under the drawing limit, so the canvas never falls back to a density picture here. Community color and Size: total degree are real layers in the Styles list, and the legend lists them; the selection is the ring, never a fill.", "Framework: scale-levels.md 2, Node drawing; canvas-drawing.md 2 and 3; conceptual-model.md, all paint from a layer. Built with: graphty-element (drawing and legend)."],
        ["New column, from any column's menu. When the edge weight column is a currency (amount, USD), weighted degree is offered as Money in, Money out and Money in minus out, each saying what it sums; with any other weight it reads Total <column> in and Total <column> out (\"Total confidence in\"). A plain link count is Links in (count) and Links out (count), so a ranking by how many transfers never passes for a ranking by money. The chosen column lands at the right of the table, sorted, with its group header naming the weight and scope (the Selected scope below shows three of them). The menu opens upward because the header sits low in the dock.", "Framework: interface-templates.md 16 (a result column); content-design.md 5 (a measure names its unit); the weighted degree wording is proposed in framework-changes.md. Built with: compact-mantine Menu with a submenu and described items (proposed); graphty-element weighted degree."],
        ["The scope line adds the selected count, because in 3,000 rows most selected rows are off screen.", "Framework: message-catalog.md graphty.table.scope (the count is proposed in framework-changes.md). Built with: compact-mantine ProseBlock."],
        ["Virtualized: only the rows in view and a few more are built; the scroll thumb is sized and placed for all 3,000. pagerank is a result's field, so its header histogram ships (heavy-tailed, so on a log scale), and the sort uses the result's own ranking.", "Framework: scale-levels.md 3, Table; interface-templates.md 16. Built with: DataTable, virtualized (DataTable.tsx 21 and 378)."],
        [`A selected row between unselected ones. A screen reader hears "row ${fmt(noteRow.rank)} of 3,000": the grid states the full row count and each built row its index.`, "Framework: interaction-pattern-entries.md 9.1 (the row count is proposed in framework-changes.md). Built with: DataTable, aria-rowcount and aria-rowindex."],
        ["PageRank's group header: the run, its method and its scope. Its rank column shows where each account stands of 3,000 (\"#352\"), so a reader scrolling a virtualized table never loses the position; degree's ranks tie often (\"#293=\"), as whole numbers do.", "Framework: output-homes.md 2; content-design.md 5, Ranks. Built with: DataTable column groups (proposed)."],
        [`Two measures have rank columns, so the agreement line is up: "${txAgree.text}" Past three agreeing places it gives the length and the leader, not a list.`, "Framework: the Rank columns proposal in framework-changes.md. Built with: compact-mantine ProseBlock and Anchor."],
        [`The shaded end of the riskScore histogram is the outlier band: ${hRisk.above} accounts past the upper fence, the 14 flagged ones among them. Filter to or Create set turns a band into a step or a set. riskScore is an attribute from the file, so its bins wait on graphty-element.`, "Framework: information-architecture.md 3, Finding what does not fit; interface-templates.md 12. Built with: HistogramRow mini form."],
    ],
});

/* ---------- The protein network: three measures ranked ---------- */
const PP = F.ppi;
const pRows = T.ppi.rows.map(([id, module, degree, bc, pr]) => ({ id, module, degree, bc, pr }));
const pDegR = ranks(pRows.map((r) => r.degree)), pBcR = ranks(pRows.map((r) => r.bc)), pPrR = ranks(pRows.map((r) => r.pr));
const pBcN = nearTies(pRows.map((r) => r.bc)), pPrN = nearTies(pRows.map((r) => r.pr));
pRows.forEach((r, i) => Object.assign(r, { degR: pDegR[i], bcR: pBcR[i], prR: pPrR[i], bcN: pBcN[i], prN: pPrN[i] }));
// The finished Louvain run (the groups task): each protein's community, and the communities by size.
const LV = PP.louvain;
pRows.forEach((r) => { r.comm = LV.community[r.id]; if (!r.comm) throw new Error("no Louvain community for " + r.id); });
const lvSegs = LV.groups.map((g) => ({ name: `Community ${g.community}`, n: g.size })).sort((a, b) => b.n - a.n);
const LV_METHOD = `weighted, seed ${LV.seed}, full graph`;
const pAgree = agreement([{ name: "degree", ranks: pDegR }, { name: "betweenness", ranks: pBcR }, { name: "pagerank", ranks: pPrR }], pRows.map((r) => r.id), PP.nodes);
const pByPr = [...pRows].sort((a, b) => b.pr - a.pr || (a.id < b.id ? -1 : 1));
const tp = pRows.find((r) => r.id === "TP53");
// The kit's inspector fixture ranks TP53 #2 on all three; this page must agree with it.
for (const [k, x] of [["degreeRank", tp.degR], ["betweennessRank", tp.bcR], ["pagerankRank", tp.prR]])
    if (PP.inspector.tp53[k].from !== x.r) throw new Error(`TP53 ${k}: the kit says ${PP.inspector.tp53[k].from}, this page ${x.r}`);
const MC = PP.moduleColors;
const modSegs = Object.entries(PP.attributes.find((a) => a.name === "module").values).map(([name, n]) => ({ name, n, c: MC[name] }))
    .sort((a, b) => (a.c === "#BDBDBD") - (b.c === "#BDBDBD") || b.n - a.n);
const MOD_GLYPH = stack([MC["Complex I"], MC.Proteasome, MC.Ribosome]);
const lg4 = (x) => x.toFixed(4), lg5 = (x) => x.toFixed(5);
const pCols = [
    { name: "id", profile: `${fmt(PP.nodes)} values` },
    { name: "module", glyph: MOD_GLYPH, profile: `${modSegs.length} values`, dist: stripHtml(modSegs, { encoded: true }) },
    { name: "community", profile: `${LV.communities} values`, dist: stripHtml(lvSegs), n: 6,
      group: { span: 1, name: "Louvain", method: LV_METHOD } },
    { name: "degree (full graph)", num: true, glyph: SIZECHIP, profile: `0 to ${PP.stats.maxDegree}`, dist: distHtml(histogram(pRows.map((r) => r.degree)), { blocked: WHY_BINS_DEG, label: "degree" }), scale: sizeScale, n: 5,
      group: { span: 2, name: "Degree", method: "" } },
    rankCol(PP.nodes),
    { name: "betweenness", num: true, profile: `0 to ${lg4(Math.max(...pRows.map((r) => r.bc)))}`, dist: distHtml(histogram(pRows.map((r) => r.bc)), { label: "betweenness" }),
      group: { span: 2, name: "Betweenness", method: "exact, unweighted, full graph" } },
    rankCol(PP.nodes),
    { name: "pagerank", num: true, sort: "descending", profile: `${lg5(Math.min(...pRows.map((r) => r.pr)))} to ${lg5(Math.max(...pRows.map((r) => r.pr)))}`, dist: distHtml(histogram(pRows.map((r) => r.pr)), { label: "pagerank" }),
      group: { span: 2, name: "PageRank", method: "damping 0.85, unweighted, full graph", n: 1, nb: "right" } },
    rankCol(PP.nodes, { n: 2, nb: "right", wide: true }),
];
const pWin = pByPr.slice(0, 12);
const pLegend = `<div class="k-legend-card"><div class="k-lg-title">Module color <span class="k-secondary">module</span></div>
${PP.frame.legend.rows.slice(0, 4).map((r) => `<div class="k-lg-row">${chit(r.color)}${r.label}<span class="k-value k-num">${r.count}</span></div>`).join("")}
<div class="k-lg-row k-secondary">${PP.frame.legend.rows.length - 4} more</div>
<div class="k-lg-row">${chit(PP.frame.legend.other.color)}${PP.frame.legend.other.label}<span class="k-value k-num">${PP.frame.legend.other.count}</span></div></div>`;
const rankLine = (v, x) => `${v} <span class="k-secondary">#${x.r}${x.tied ? "=" : ""} of ${fmt(PP.nodes)}</span>`;
const sRanked = state({
    id: "ranked",
    title: "Three measures ranked: who matters, and do the measures agree",
    lede: `The protein network (300 proteins) after four runs: degree is always there, then Louvain, Betweenness and PageRank. Each run added a score column and a rank column under a group header that names the run, its method and its scope. The table opened from the PageRank run ("295 more in the table" in the Results panel), so it is sorted by pagerank, and the scope line says so. TP53 is selected. The agreement line above the table answers the second half of "who matters": whether the measures agree on the top.`,
    app: `<div class="k-app s-app">${rail}${left({ project: "Human protein interactions", chip: "Full graph", graph: "Interactions", count: "300 nodes", styles: layer(SIZECHIP, "Size: degree") + layer(MOD_GLYPH, "Module color") + BASE })}
<main class="k-main"><div class="k-canvas"><div class="k-stage">
<img class="k-light-only" src="../kit/canvas/ppi-modules-light.svg" alt="Protein interactions colored by module, sized by degree, TP53 selected">
<img class="k-dark-only" src="../kit/canvas/ppi-modules-dark.svg" alt="Protein interactions colored by module, sized by degree, TP53 selected"></div>${pLegend}${toolbar}</div>
${dock({ tabs: [{ name: "Nodes", on: 1 }, { name: "Edges" }, { name: "Communities: Louvain" }], basis: "64%", exportN: 4, scopeN: 8, scope: "Full graph: 300 nodes, 1 selected. Sorted by pagerank, the run that opened the table.", agree: agreeHtml(pAgree, 3),
        tableHtml: table({ cols: pCols, rows: pWin.map((r, k) => ({ index: k + 2, selected: r.id === "TP53",
            cells: [cell(r.id), cell(r.module), cell(`Community ${r.comm}`), cell(r.degree), cell(rankText(r.degR)), cell(lg4(r.bc)), cell(rankNearText(r.bcR, r.bcN)), cell(lg5(r.pr)), cell(rankNearText(r.prR, r.prN))] })), rowcount: PP.nodes + 1 }) })}</main>
${right(`${I("circle-dot")}<span class="k-name k-id">TP53</span><span class="k-secondary">Node</span>`, `<section class="k-section"><div class="k-section-head">Attributes</div>
${data("module", "DNA repair", "")}${data("community", `Community ${tp.comm}`, "")}${data("degree", rankLine(tp.degree, tp.degR))}${data("betweenness", rankLine(lg4(tp.bc), tp.bcR))}${data("pagerank", rankLine(lg5(tp.pr), tp.prR))}</section>`)}</div>`,
    notes: [
        ["Each run adds two columns under one group header naming the run, its method and its scope: the score, then its rank. The method and scope are in the header because they are what a reader needs before quoting a number, and because the CSV writes the same words into its column headers.", "Framework: output-homes.md 2 (a node's rank: the table's rank column); interface-templates.md 16 (a result column). Built with: DataTable column groups (proposed, framework-changes.md, Rank columns)."],
        ["A rank column shows \"#2\" alone; its header gives the denominator (\"of 300\") and the group header the scope. Equal values share a rank: YWHAZ and AKT1 both have degree 24, so both are \"#4=\". It is the inspector's \"#2 of 300\" for every row at once, so checking a top twenty takes no clicks. Sorting a rank column sorts its score. Rank over the run's scope waits on graphty-element (magenta tag).", "Framework: content-design.md 5, Ranks; element-needs.md, the rank row. Built with: DataTable."],
        [`The agreement line: "${pAgree.text}" It appears on the Nodes tab, in the full or filtered graph scope, once two or more current measures have rank columns; it names the longest top every measure agrees on, and where they part. Compare rankings... opens the table's Scatter view, rank against rank.`, "Framework: the proposal in framework-changes.md (Rank columns and the agreement line); output-homes.md 2, comparing two results (the Scatter view). Built with: compact-mantine ProseBlock and Anchor."],
        ["Export table as CSV... is the table's one exit: every row of this tab and scope (all 300, never a sample), the file's own ids, and every column with the headers shown here (the dialog is drawn below, under Getting rows out).", "Framework: output-homes.md 3, export-table (relabeled in framework-changes.md). Built with: compact-mantine Button, subtle."],
        ["Degree counts as a measure: graphty-element ranks it as it ranks a run's values, so its rank column appears with the first run's and the agreement line counts it.", "Framework: element-needs.md, the rank row (metric values, degree and core number). Proposed in framework-changes.md."],
        [`The Louvain run's column: each protein's community, named as the Results panel names them ("Community ${tp.comm}" for TP53, whose ${LV.groups.find((g) => g.community === tp.comm).size} members include ${LV.groups.find((g) => g.community === tp.comm).fromThatModule} of the file's ${LV.groups.find((g) => g.community === tp.comm).mostFromModule} module). A partition has no rank, so its group header spans one column and names the run's weight, seed and scope. No layer reads it here (the canvas is colored by the file's module), so its count strip is gray; the Communities: Louvain tab lists the ${LV.communities} communities, one row each.`, "Framework: interface-templates.md 16 (a result column; the item tab named by kind and result); information-architecture.md 4, Table tabs. Built with: DataTable column groups (proposed); Mantine Tabs, pills."],
        [`Ties, in the rank column itself: "=" marks values equal at the shown precision ("#7="), and nothing else. There is no near-tie mark and no percentage: after round 6 the invented 1-percent rule was removed, because a percentage is not a property of the data and participants read it as rounding. An estimate shows its rank range instead. Degree has only exact ties, because degrees are whole numbers. The CSV writes rank as an integer, with the tie in its own column (screens/export-dialog.html).`, "Framework: content-design.md 5, Ranks. Built with: DataTable. The rank, and so its tie mark, waits on graphty-element."],
        ["A table opened from a run is sorted by that run, highest first, and the scope line names the sort and where it came from. Opened any other way (the Table strip, View > Table), it keeps the reader's last sort.", "Framework: information-architecture.md 8.1, The table's scope; message-catalog.md graphty.table.scope (the sort clause is proposed in framework-changes.md). Built with: compact-mantine ProseBlock."],
    ],
});

/* State 4: the Selected scope, with the money columns New column added and the selection total */
acc.forEach((r) => { r.moneyNet = Math.round((r.moneyIn - r.moneyOut) * 100) / 100; });
const accRange = (key, f = fmt) => { const v = acc.map((r) => r[key]); return `${f(Math.min(...v))} to ${f(Math.max(...v))}`; };
const WHY_BINS_LINKS = "Waits on graphty-element: the in- and out-degree distributions, as for degree (element needs, the histogram-bins row). Absent until then.";
const MONEY_GROUP = { span: 3, name: "Weighted degree", method: "sum of amount (USD), full graph", n: 3 };
const moneyCols = [
    { name: "id", profile: `${fmt(X.nodes)} values` },
    { name: "riskScore", num: true, profile: range("riskScore"), dist: distHtml(hRisk, { blocked: WHY_BINS, label: "riskScore" }) },
    { name: "Links in (count)", num: true, profile: accRange("linksIn"), dist: distHtml(histogram(acc.map((r) => r.linksIn)), { blocked: WHY_BINS_LINKS, label: "Links in (count)" }),
      group: { span: 2, name: "Degree", method: "in and out, full graph" } },
    { name: "Links out (count)", num: true, profile: accRange("linksOut"), dist: distHtml(histogram(acc.map((r) => r.linksOut)), { blocked: WHY_BINS_LINKS, label: "Links out (count)" }) },
    { name: "Money in", num: true, sort: "descending", profile: accRange("moneyIn", usd), dist: distHtml(histogram(acc.map((r) => r.moneyIn)), { label: "Money in" }), group: MONEY_GROUP },
    { name: "Money out", num: true, profile: accRange("moneyOut", usd), dist: distHtml(histogram(acc.map((r) => r.moneyOut)), { label: "Money out" }) },
    { name: "Money in minus out", num: true, profile: accRange("moneyNet", usd), dist: distHtml(histogram(acc.map((r) => r.moneyNet), 12, { linear: true }), { label: "Money in minus out" }) },
];
const ringByMoney = [...ring].sort((a, b) => b.moneyIn - a.moneyIn || (a.id < b.id ? -1 : 1));
const ringSum = (k) => Math.round(ring.reduce((a, r) => a + r[k], 0) * 100) / 100;
const ringFoot = `Sum of Money in, ${ring.length} rows: ${usd(ringSum("moneyIn"))} USD<span class="k-secondary">Money out ${usd(ringSum("moneyOut"))} USD. Money in minus out ${usd(ringSum("moneyNet"))} USD.</span>`;
const s4 = state({
    id: "selected",
    title: "Selected scope: the 14 flagged accounts, where their money went, and the way back",
    lede: "The same graph after Show in table on the selection's count. The table's rows are now the selection itself, and the scope line ends in Show filtered graph, the one route back to every row. The analyst added Money in, Money out and Money in minus out from New column (the menu above) and sorted by Money in; the footer totals the selected rows. The item tab for the Louvain result sits beside Nodes and Edges.",
    app: `<div class="k-app s-app">${rail}${left({ project: "March transfers", chip: "Full graph", graph: "Transfers", count: "3,000 nodes", styles: txStyles() })}
<main class="k-main">${txCanvas}
${dock({ tabs: txTabs, tabsN: 2, scopeN: 1, basis: "62%", scope: `Selected: 14 nodes<a class="s-action">Show filtered graph</a>`, extra: totalBar(ringFoot, 4), tableHtml: table({ cols: moneyCols,
        rows: ringByMoney.map((r, k) => ({ index: k + 2, selected: true, 
            cells: [cell(r.id), cell(r.riskScore), cell(r.linksIn), cell(r.linksOut), cell(usd(r.moneyIn)), cell(usd(r.moneyOut)), cell(usd(r.moneyNet))] })), rowcount: 15 }) })}</main>
${txInspector()}</div>`,
    notes: [
        ["The Selected scope: the rows follow the live selection, so the canvas, the inspector and the table show the same 14 accounts. Every route that opens the table on some elements (a count, N differ, Show in table, a Connections count) selects them first and lands here. Show filtered graph, the line's one command, returns the rows to the default scope and leaves the selection as it is; it is a Tab stop between the tabs and the grid.", "Framework: information-architecture.md 8.1, The table's scope; message-catalog.md graphty.table.scope; interface-templates.md 16, Tab order (the stop is proposed in framework-changes.md). Built with: compact-mantine ProseBlock and Anchor."],
        ["The item tab, named by the result's kind and name. It lists the 35 communities, one row each (the last frame on this page).", "Framework: information-architecture.md 4, Table tabs; interface-templates.md 16. Built with: Mantine Tabs, pills."],
        [`Weighted degree on a currency weight, in money words: Money in, Money out and Money in minus out, under one group header naming the weight and scope, beside Links in (count) and Links out (count). ${ring.filter((r) => r.moneyNet < 0).length} of the ${ring.length} flagged accounts send out more than they take in; together the ${ring.length} took in ${usd(ringSum("moneyIn"))} USD and sent ${usd(ringSum("moneyOut"))} USD. The money columns are a run's fields, so their histograms ship; the link counts wait on graphty-element as degree does.`, "Framework: interface-templates.md 16 (a result column); content-design.md 5 (a measure names its unit); the weighted degree wording is proposed in framework-changes.md. Built with: DataTable column groups (proposed); graphty-element weighted degree."],
        ["The selection total: whenever two or more rows are selected, a footer under the grid sums the sorted column over them, \"Sum of Money in, 14 rows\", and then the other money columns. On the Edges tab it sums amount (the path hops under Getting rows out). It reads the selected rows in any scope, so a reader who selects a few rows in the full table gets their total without leaving it.", "Framework: interface-templates.md 16; the selection total is proposed in framework-changes.md. Built with: DataTable footer (proposed); graphty-element for the sums."],
    ],
});

/* ---------- Les Miserables after filter steps ---------- */
const FS = L.filterSteps;
const step3 = FS.byStep[2];
const s5 = state({
    id: "stale",
    title: "Not current: betweenness after three filter steps",
    lede: `Les Miserables after three filter steps: ${FS.steps.join(", ")}, which keep ${FS.after.step3} of 77 characters. Degree follows the filtered graph (Valjean's is ${step3.top[0].degree} here, #1 of ${FS.after.step3}), but betweenness was run on the full graph, so its values and ranks no longer describe what the table lists. Its group header says so with the glossary's words and offers the one verb.`,
    app: `<div class="k-app s-app">${rail}${left({ project: "Les Miserables", chip: `Filtered: ${FS.after.step3} of 77 nodes`, graph: "Co-appearances", count: "77 nodes", styles: lmStyles })}
<main class="k-main"><div class="k-canvas"><div class="k-stage">
<img class="k-light-only" src="../kit/canvas/lesmis-step3-light.svg" alt="Les Miserables, ${FS.after.step3} of 77 characters drawn after three filter steps, colored by group and sized by degree">
<img class="k-dark-only" src="../kit/canvas/lesmis-step3-dark.svg" alt="Les Miserables, ${FS.after.step3} of 77 characters drawn after three filter steps, colored by group and sized by degree"></div>${step3Legend}${toolbar}</div>
${dock({ tabs: [{ name: "Nodes", on: 1 }, { name: "Edges" }], scope: `Filtered graph: ${FS.after.step3} of 77 nodes`, tableHtml: table({
        cols: lmCols({ nBtwGroup: 1, nDeg: 2, stale: true, degScope: "filtered graph", degOf: FS.after.step3 }),
        // Degree ranks over the characters left: the rows are the top 10 by degree, so every higher value is among them.
        rows: step3.top.map((r, k, all) => ({ index: k + 2, cells: [cell(r.label), cell(r.group), cell(r.degree), cell(rankText(ranks(all.map((x) => x.degree))[k])),
            cell(btw(r.betweenness), { stale: true }), cell(rankText(L.rows.find((x) => x.label === r.label).btwRank), { stale: true })] })),
        rowcount: FS.after.step3 + 1,
    }) })}</main>
${right(`${I("network")}<span class="k-name">Co-appearances</span><span class="k-secondary">Graph</span>`, `<section class="k-section"><div class="k-section-head">Statistics</div>${data("nodes", `${FS.after.step3} of 77`)}${data("edges", `${step3.edges} of 254`)}${data("filter steps", 3)}</section>`)}</div>`,
    notes: [
        ["Not current: the Betweenness group header names the scope its run read (full graph) beside the table's filtered scope, then reads Out of date and ends in Re-run, which runs it again on the filtered graph as a new run. The values and their ranks stay, in tertiary ink, until then; the profile and histogram stay those of the run that wrote them. The agreement line is absent: it compares only current measures, and one of the two is out of date.", "Framework: state-matrix.md 3, Bottom dock Table Not current; glossary.md 9, Out of date and Re-run; interaction-pattern-entries.md 7.2 (the group header proposed in framework-changes.md). Built with: DataTable column groups; compact-mantine Anchor."],
        [`Degree follows the filtered graph, so its column header says so, "degree (filtered graph)", and its rank counts the ${FS.after.step3} left ("of ${FS.after.step3}"). The profile line and histogram of every column stay over the whole graph (degree ${Math.min(...L.rows.map((r) => r.degree))} to ${Math.max(...L.rows.map((r) => r.degree))}), because a profile over the filtered graph waits on graphty-element's scoped reads.`, "Framework: interface-templates.md 16 (whole-graph profiles, data.attributes()); interface-specification.md 7.4, scoped reads; content-design.md 5 (a number names its set when it departs)."],
    ],
});

/* State 6: empty after a filter step (a combination: each step alone keeps nodes) */
const g8 = groupCounts["8"];
const s6 = state({
    id: "empty",
    title: "Empty after a filter step",
    lede: `The same three steps plus a fourth, Filter to group 8, added after the analyst forgot that step 3 filters group 8 out. On its own the fourth step keeps ${g8} characters, and every earlier step keeps some, but together they keep none, so no single step "emptied" the table. The table says what is left and offers the steps list, where each step shows what it keeps; the list is drawn open here, as the command leaves it.`,
    app: `<div class="k-app s-app">${rail}${left({ project: "Les Miserables", chip: "Filtered: 0 of 77 nodes", chipN: 1, graph: "Co-appearances", count: "77 nodes", styles: lmStyles })}
<main class="k-main"><div class="k-canvas" data-n="2">${toolbar}</div>
${dock({ tabs: [{ name: "Nodes", on: 1 }, { name: "Edges" }], scope: `<span>Filtered graph: 0 of 77 nodes</span><a class="s-action">Show filter steps</a>`, scopeN: 3, tableHtml: table({ cols: lmCols({ nBtw: 4, degScope: "filtered graph", degOf: 0 }), rows: [], rowcount: 1 }) })}</main>
${right(`${I("network")}<span class="k-name">Co-appearances</span><span class="k-secondary">Graph</span>`, `<section class="k-section"><div class="k-section-head">Statistics</div>${data("nodes", "0 of 77")}${data("edges", "0 of 254")}${data("filter steps", 4)}</section>`)}
<div class="k-popover s-steps" data-n="5"><div class="k-popover-head">Filter steps<span class="k-grow"></span><span role="button" class="k-icon-btn" aria-label="Close">${I("x")}</span></div>
<div class="k-popover-body"><ul class="k-list">
${[["Filter to", "degree &gt;= 2", FS.after.step1], ["Filter to", "degree &gt;= 5", FS.after.step2], ["Filter out", "group 8", FS.after.step3], ["Filter to", "group 8", 0]].map(([o, r, n]) => `<li class="k-item"><span class="k-check" role="checkbox" aria-checked="true" aria-label="${o} ${r}"></span><span class="k-grow">${o} ${r}</span><span class="k-trail k-num">${n}</span></li>`).join("")}
</ul><div class="k-row k-secondary">${I("plus")}Add step</div></div></div></div>`,
    notes: [
        ["The filter chip counts what the four steps keep, in the catalog's words.", "Framework: message-catalog.md graphty.filter.chip; interface-templates.md 7. Built with: compact-mantine Pill as a Popover trigger."],
        ["Nothing is drawn and nothing is wrong: an empty scope is blank, not an error, so there is no alert and no legend.", "Framework: state-matrix.md 3, Canvas Blank (E_SCOPE_EMPTY is blank, not an error)."],
        ["An empty surface: its title and one command, no sentence. The title is the count; the command opens the steps list rather than blaming one step, because here no step empties the table on its own.", "Framework: content-design.md 4, Empty surface; state-matrix.md 3, Bottom dock Table Blank (the command is proposed in framework-changes.md). Built with: compact-mantine ProseBlock and Anchor."],
        ["The headers stay, with the whole graph's profiles, so the columns can still be read and sorted when rows return.", "Framework: interface-templates.md 16."],
        [`What Show filter steps opens: the chip's own popover, each step with the count left after it: ${FS.after.step1}, ${FS.after.step2}, ${FS.after.step3}, then 0. The analyst sees that step 4 contradicts step 3 and turns one off.`, "Framework: interface-templates.md 7; the per-step counts proposal in framework-changes.md (Filter chip and its steps). Built with: compact-mantine Popover, Tree rows."],
    ],
});

/* State 7: past the drawing limit */
const C = F.citations;
const catSegs = Object.entries(C.attributes.find((a) => a.name === "category").values).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
const setName = "Drug patents cited 25+";
const setCount = C.ruleCounts[0].nodes;
const blankDist = (why) => `<span class="s-dist s-dist-blank">${blk(why)}</span>`;
const WHY_PAGE = "Rows past the drawing limit wait on graphty-element: paged id listings over a scope (element needs, the paged-listing row). Absent until then.";
const HL = `<svg class="s-hlglyph" viewBox="0 0 16 12" aria-hidden="true"><circle cx="8" cy="6" r="3" fill="#808080"/><circle cx="8" cy="6" r="5.25" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/></svg>`;
const s7 = state({
    id: "limit",
    title: "Past the drawing limit: the table is the way to read the graph",
    lede: `The patent citation graph, ${fmt(C.nodes)} patents and ${fmt(C.edges)} citations, is past the drawing limit (${fmt(C.drawingLimit)} nodes), so the canvas draws nothing and says so. The dock opens at two thirds of the canvas column instead of one third, because the table is now the working surface. The analyst highlighted the rule set ${setName} (${fmt(setCount)} patents); a highlight cannot be drawn here, so it lands in the table as a membership column.`,
    app: `<div class="k-app s-app">${rail}${left({ project: "Patent citations", chip: "Full graph", graph: "Citations", count: `${fmt(C.nodes)} nodes`, sets: `<ul class="k-list"><li class="k-item">${I("group")}<span class="k-grow k-ellipsis">${setName}</span><span class="k-kind">rule</span><span class="k-trail k-num">${setCount}</span></li></ul>`, styles: layer(HL, setName, "highlight", 3) + BASE })}
<main class="k-main"><div class="k-canvas"><div class="k-legend-card" data-n="1"><div class="k-notdrawn" style="border:0;margin:0;padding:0">${C.notDrawnLine}. <a>Narrow the graph...</a></div></div>${toolbar}</div>
${dock({ tabs: [{ name: "Nodes", on: 1 }, { name: "Edges" }], tabsN: 2, basis: "67%", scope: `Full graph: ${fmt(C.nodes)} nodes`, tableHtml: table({
        cols: [
            { name: "id", profile: `${fmt(C.nodes)} values` },
            { name: "grantYear", num: true, profile: `${C.profiles.grantYear[0]} to ${C.profiles.grantYear[1]}`, dist: blankDist(WHY_BINS) },
            { name: "category", profile: `${catSegs.length} values`, dist: stripHtml(catSegs) },
            { name: "citationsReceived", num: true, sort: "descending", profile: `0 to ${C.profiles.citationsReceived[1]}`, dist: blankDist(WHY_BINS) },
            { name: setName, glyph: HL, profile: `${fmt(setCount)} members`, n: 3, nb: "right" },
        ],
        rows: C.rows.map((r, k) => ({ index: k + 2, cells: [cell(r.id), cell(r.grantYear), cell(r.category), cell(fmt(r.citationsReceived)), cell(r.category === "Drugs and medical" && r.citationsReceived >= 25 ? "member" : "")] })),
        rowcount: C.nodes + 1,
    }), extra: `<span class="k-annot-tag s-blk s-blk-rows" title="${esc(WHY_PAGE)}">rows blocked: paged listing</span>` })}</main>
${right(`${I("network")}<span class="k-name">Citations</span><span class="k-secondary">Graph</span>`, `<section class="k-section"><div class="k-section-head">Statistics</div>${data("nodes", fmt(C.nodes))}${data("edges", fmt(C.edges))}${data("components", fmt(C.stats.components))}${data("largest component", `${C.stats.largestShare}%`)}</section>`)}</div>`,
    notes: [
        ["Nothing is drawn: the legend's not-drawn line is the canvas's only content, with the command that narrows the graph.", "Framework: scale-levels.md 2; state-matrix.md 4.2; canvas-drawing.md 8. Built with: graphty-element legend."],
        ["The dock opens at two thirds of the canvas column, never under five rows, as the working surface; a height the reader set still wins.", "Framework: state-matrix.md 4.2. Built with: compact-mantine ResizeHandle."],
        ["The highlight lands in the table: its membership column says which rows it marks, with the highlight's glyph in the header and its member count as the profile.", "Framework: information-architecture.md 8.1, Accessibility is structural; state-matrix.md 4.2 (a highlight past the drawing limit lands in the table)."],
        ["The rows themselves wait on graphty-element: listing rows past the drawing limit needs paged id listings, so until that lands this state shows the headers and the scope line only. The histograms wait on bins for attributes; the category strip uses the profile's counts, which ship.", "Framework: interface-templates.md 16, Departures; interface-specification.md 7.4 (paged-listing and histogram-bins rows)."],
    ],
});

/* State 8: Loading and the item tab, dock only */
const firstRows = acc.slice(0, 5);
const itemRows = F.transactionsApril.louvain.march.largest.map((n, k) => ({ name: commName(k + 1), n }));
const s8 = `<section class="s-state" id="more"><h2><a href="#more">Two more table states: loading, and a result's item tab</a></h2>
<p>The dock alone, at 1:1. The Error state (rows an import could not read, as a filterable column) is left out: the import report it counts does not exist yet, so its numbers would be invented.</p>
<div class="s-pair">
<figure><figcaption><span class="k-step">1</span>Loading the March file</figcaption><div class="s-dockonly"><section class="k-dock" aria-label="Table">
<div class="k-dock-tabs"><span role="tablist" aria-label="Table" style="display:contents"><span class="k-tab" role="tab" aria-selected="true">Nodes</span><span class="k-tab" role="tab">Edges</span></span><span class="k-grow"></span><span class="k-icon-btn" role="button" aria-label="Find in table">${I("search")}</span><span class="k-btn k-btn-ghost" aria-disabled="true">Export table as CSV...</span></div>
<div class="k-scope">Full graph: at least 1,200 nodes</div>
<div class="k-table-wrap">${table({ cols: [{ name: "id", profile: "counting" }, { name: "kind", profile: "counting" }, { name: "country", profile: "counting" }, { name: "riskScore", num: true, profile: "counting" }], rows: firstRows.map((r, k) => ({ index: k + 2, cells: [cell(r.id), cell(r.kind), cell(r.country), cell(r.riskScore)] })), rowcount: -1, attrs: 'aria-busy="true"' }).replace(/<th /g, '<th aria-disabled="true" ')}</div></section></div>
<p>Headers come first and rows stream in file order; the scope line says "at least" until the load ends. Sorting is off (no caret, the labels do nothing) and the profiles say counting. Rows can already be read and selected. pagerank and the community column are absent: nothing has run yet.</p></figure>
<figure><figcaption><span class="k-step">2</span>The item tab of the Louvain result</figcaption><div class="s-dockonly"><section class="k-dock" aria-label="Table">
<div class="k-dock-tabs"><span role="tablist" aria-label="Table" style="display:contents"><span class="k-tab" role="tab" aria-selected="false">Nodes</span><span class="k-tab" role="tab" aria-selected="false">Edges</span><span class="k-tab" role="tab" aria-selected="true">Communities: Louvain</span></span><span class="k-grow"></span><span class="k-icon-btn" role="button" aria-label="Find in table">${I("search")}</span><span class="k-btn k-btn-ghost">Export table as CSV...</span></div>
<div class="k-scope">Full graph: ${commSizes.length} communities</div>
<div class="k-table-wrap">${table({ cols: [{ name: "community", profile: `${commSizes.length} values` }, { name: "members", num: true, sort: "descending", profile: `${commSizes[commSizes.length - 1].n} to ${commSizes[0].n}`, dist: distHtml(histogram(commSizes.map((s) => s.n)), { label: "members" }) }], rows: itemRows.map((r, k) => ({ index: k + 2, cells: [cell(r.name), cell(r.n)] })), rowcount: commSizes.length + 1 })}</div></section></div>
<p>One row per community, named as the Results panel names them, sorted by size. Between groups and Scatter are views of this tab, reached from a column's Compare columns...</p></figure>
</div>
<ol class="s-notes k-annot-note"><li><span class="k-step">1</span><div>Loading: headers first, rows streaming, "at least N", sort disabled until done.<br><span class="k-secondary">Framework: state-matrix.md 3, Bottom dock Table Loading (proposed); interaction-pattern-entries.md 7.1. Built with: DataTable, aria-busy.</span></div></li>
<li><span class="k-step">2</span><div>The item tab: "Communities: Louvain", its kind and its result; opening another result's items replaces it.<br><span class="k-secondary">Framework: information-architecture.md 4, Table tabs; interface-templates.md 16. Built with: Mantine Tabs, pills; DataTable.</span></div></li></ol></section>`;

/* ---------- Getting rows out: the CSV export, and counts that open as rows ---------- */
// The CSV preview: bare stored values (content-design.md 5, two kinds of export); a rank as the table
// shows it without the "#", so an exact tie keeps its "=" ("4=").
const rankCsv = (x) => `${x.r}${x.tied ? "=" : ""}`;
const fcOf = Object.fromEntries([...PP.topByDegree, ...PP.topByBetweenness, ...PP.rows].map((r) => [r.id, r.log2FoldChange]));
const csvHead = ["id", "module", `community (Louvain, ${LV_METHOD})`, "degree (full graph)", "degree rank (of 300, full graph)", "betweenness (exact, unweighted, full graph)", "betweenness rank (of 300, exact, unweighted, full graph)",
    "pagerank (damping 0.85, unweighted, full graph)", "pagerank rank (of 300, damping 0.85, unweighted, full graph)", "log2FoldChange"];
const q = (x) => (/[",]/.test(x) ? `"${String(x).replace(/"/g, '""')}"` : String(x));
const csvLines = [csvHead.map(q).join(","), ...pByPr.slice(0, 3).map((r) => [r.id, r.module, r.comm, r.degree, rankCsv(r.degR), r.bc, rankCsv(r.bcR), r.pr, rankCsv(r.prR), fcOf[r.id]].map(q).join(","))];
if (csvLines.slice(1).some((l) => l.includes("undefined"))) throw new Error("a preview row has no log2FoldChange in the fixtures");
const miniDock = ({ tabs, scope, cols, rows, rowcount, foot = "" }) => `<div class="s-dockonly s-dockmini"><section class="k-dock" aria-label="Table">
<div class="k-dock-tabs"><span role="tablist" aria-label="Table" style="display:contents">${tabs.map((t) => `<span class="k-tab" role="tab" aria-selected="${t.on ? "true" : "false"}">${t.name}</span>`).join("")}</span><span class="k-grow"></span><span class="k-icon-btn" role="button" aria-label="Find in table">${I("search")}</span><span class="k-btn k-btn-ghost">Export table as CSV...</span></div>
<div class="k-scope">${scope}</div><div class="k-table-wrap">${table({ cols, rows, rowcount })}</div>${foot ? totalBar(foot) : ""}</section></div>`;
const iso = PP.closeness.isolated.map((id) => pRows.find((r) => r.id === id));
const mainSize = PP.nodes - iso.length;
const SP = X.setsAndPaths.path;
const pathEdges = [];
for (const route of SP.routes) route.transfers.forEach((t, h) => {
    const e = pathEdges.find((x) => x.source === t.source && x.target === t.target);
    if (e) e.on++; else pathEdges.push({ ...t, hop: h + 1, on: 1 });
});
pathEdges.sort((a, b) => a.hop - b.hop);
// Dates: ISO order, the zone named once in the header, trimmed per column to the coarsest unit that
// still separates its values (content-design.md 5, Dates).
const when = (iso, unit) => iso.slice(0, 10) + " " + iso.slice(11, unit === "s" ? 19 : 16);
const money = (x) => x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sOut = `<section class="s-state" id="out"><h2><a href="#out">Getting rows out: the CSV export, and counts that open as rows</a></h2>
<p>At 1:1, outside the frame. Left, what Export table as CSV... opens from the ranked protein table above. Right, three counts that used to be dead ends: each opens its rows in the table, where they can be read, sorted and exported like any other rows.</p>
<div class="s-outgrid">
<figure><figcaption><span class="k-step">1</span>Export table as CSV...</figcaption>
<div class="k-modal s-inline-modal" role="dialog" aria-label="Export table as CSV"><div class="k-modal-head">Export table as CSV</div>
<div class="k-modal-body">
${data("Rows", `All ${fmt(PP.nodes)}: Nodes, full graph`, "k-fact")}
${data("Order", "pagerank, highest first", "")}
${data("Columns", `${csvHead.length}, hidden ones included`, "")}
<div class="k-prose">The first column is the file's own id. Each run's columns carry its method and scope in the header, as in the table.</div>
<div class="s-csv k-mono">${csvLines.map(esc).join("\n")}</div>
<div class="k-fieldrow"><span class="k-legend">File name</span><div class="k-fields"><span class="k-field k-span3">ppi-core-300-nodes.csv</span></div></div>
</div><div class="k-modal-foot"><span class="k-btn k-btn-secondary">Cancel</span><span class="k-btn">Export</span></div></div>
<p>The one route for rows: the dialog states the count it will write, so nobody wonders whether it is capped. The preview shows the file's first lines as they will be written: stored values, and each rank as the table shows it, so a shared rank keeps its "=" (YWHAZ and AKT1 are both "4=" on degree) and nobody reading the file takes a tie for an order. The header spelling is proposed, not decided (it is a file format others will parse).</p></figure>
<div class="s-counts">
<figure><figcaption><span class="k-step">2</span><span>components <span class="k-num">${PP.stats.components}</span>, in the graph's Statistics</span></figcaption>
${miniDock({ tabs: [{ name: "Nodes" }, { name: "Edges" }, { name: "Components", on: 1 }], scope: `Full graph: ${PP.stats.components} components`,
    cols: [{ name: "component", profile: `${PP.stats.components} values` }, { name: "nodes", num: true, sort: "descending", profile: `1 to ${mainSize}` }, { name: "contains", profile: "" }],
    rows: [[1, mainSize, "MAPK1, TP53 and 296 more"], [2, 1, iso[0].id], [3, 1, iso[1].id]].map(([c, n, m], k) => ({ index: k + 2, cells: [cell(`Component ${c}`), cell(fmt(n)), cell(m)] })), rowcount: 4 })}
<p>Opens the Components item tab: one row per component, largest first. A row opens its members as the Selected scope of the Nodes tab.</p></figure>
<figure><figcaption><span class="k-step">3</span><span>isolated <span class="k-num">${PP.stats.isolated}</span>, in the graph's Statistics</span></figcaption>
${miniDock({ tabs: [{ name: "Nodes", on: 1 }, { name: "Edges" }], scope: `Selected: ${iso.length} nodes<a class="s-action">Show filtered graph</a>`,
    cols: [{ name: "id", profile: `${iso.length} values` }, { name: "module", profile: `${new Set(iso.map((r) => r.module)).size} value${new Set(iso.map((r) => r.module)).size === 1 ? "" : "s"}` }, { name: "degree (full graph)", num: true, profile: "0 to 0", group: { span: 2, name: "Degree", method: "" } }, rankCol(PP.nodes)],
    rows: iso.map((r, k) => ({ index: k + 2, selected: true, cells: [cell(r.id), cell(r.module), cell(r.degree), cell(rankText(r.degR))] })), rowcount: iso.length + 1 })}
<p>Selects the two proteins with no interaction and opens them as the Selected scope, as every count does. They share the last rank, "#299=".</p></figure>
<figure><figcaption><span class="k-step">4</span>${SP.hops} hops, on a path row in Sets and paths</figcaption>
${miniDock({ tabs: [{ name: "Nodes" }, { name: "Edges", on: 1 }], scope: `Selected: ${pathEdges.length} edges on ${SP.routes.length} paths<a class="s-action">Show filtered graph</a>`,
    cols: [{ name: "from_account", profile: "" }, { name: "to_account", profile: "" }, { name: "timestamp", profile: `UTC; ${pathEdges.map((e) => e.timestamp).sort()[0].slice(0, 10)} to ${pathEdges.map((e) => e.timestamp).sort().pop().slice(0, 10)}` }, { name: "hop", num: true, sort: "ascending", profile: `1 to ${SP.hops}` }, { name: "amount", num: true, profile: `${money(Math.min(...pathEdges.map((e) => e.amount)))} to ${money(Math.max(...pathEdges.map((e) => e.amount)))}` }, { name: "on paths", num: true, profile: "" }],
    rows: pathEdges.map((e, k) => ({ index: k + 2, selected: true, cells: [cell(e.source), cell(e.target), cell(when(e.timestamp, "m")), cell(e.hop), cell(money(e.amount)), cell(`${e.on} of ${SP.routes.length}`)] })), rowcount: pathEdges.length + 1,
    foot: `Sum of amount, ${pathEdges.length} rows: ${money(Math.round(pathEdges.reduce((a, e) => a + e.amount, 0) * 100) / 100)} USD` })}
<p>The March transfers: the shortest paths from ${SP.from.id} to ${SP.to.id}, both ${SP.hops} hops. The count selects every transfer on either path and opens the Edges tab on them, with every edge column (the amounts here), so the path leaves as rows. Each transfer's time sits right after its two accounts, and the hops stay in path order, so a hop that happened before the one it follows is visible in the column. The footer totals the selected rows' amount; the two paths share their first transfer, so it counts once.</p></figure>
</div></div>
<ol class="s-notes k-annot-note"><li><span class="k-step">1</span><div>Export table as CSV... writes every row of the tab and scope it is pressed in, the original ids and the scope-and-method headers. Export... in the File list no longer offers tables, and the comparison's own export is gone, so this is the only way rows leave.<br><span class="k-secondary">Framework: output-homes.md 3, export-table (relabeled, framework-changes.md); content-design.md 5, two kinds of export. Built with: compact-mantine Modal, DataRow, TextInput, Button.</span></div></li>
<li><span class="k-step">2</span><div>Components open as an item tab, because a component is a group with its own size, like a community.<br><span class="k-secondary">Framework: information-architecture.md 4, Table tabs; interaction-pattern-entries.md 4.3 (a count selects what it counts; decided in framework-changes.md). Built with: Mantine Tabs, pills; DataTable.</span></div></li>
<li><span class="k-step">3</span><div>Isolated proteins open as the Selected scope, with Show filtered graph as the way back.<br><span class="k-secondary">Framework: information-architecture.md 8.1, The table's scope. Built with: DataTable; compact-mantine Anchor.</span></div></li>
<li><span class="k-step">4</span><div>A path's hops open as edge rows. "on paths" says how many of the equally short paths use each transfer; the first transfer is on both. The time column is shown by default, right after the endpoints, on every list of edges: this one, the Edges tab, an account's connections, the walk list and the CSV. Minutes separate these five transfers, so the column stops at minutes; the zone is named once, in the profile line.<br><span class="k-secondary">Framework: the Paths between... proposal in framework-changes.md (all equal paths drawn together); content-design.md 5, Dates; the edge time column proposal in framework-changes.md. Built with: DataTable.</span></div></li></ol></section>`;

/* ---------- The collapsed dock: a strip that says Table ---------- */
const sCollapsed = state({
    id: "collapsed",
    title: "Collapsed: the strip that says Table",
    lede: `The same Les Miserables project with the dock collapsed, which is how an analyst who dragged it down, or turned View &gt; Table off, finds it later. The dock does not vanish: it leaves a one-row strip along the bottom of the canvas column, labeled Table and counting what it holds, so the table can be found by looking rather than by knowing the menu. A click anywhere on the strip opens the dock at the height it had. There is no table button on the toolbar; the toolbar keeps the canvas tools only.`,
    app: `<div class="k-app s-app">${rail}${left({ project: "Les Miserables", chip: "Full graph", graph: "Co-appearances", count: "77 nodes", styles: lmStyles })}
<main class="k-main"><div class="k-canvas"><div class="k-stage">
<img class="k-light-only" src="../kit/canvas/lesmis-groups-valjean-light.svg" alt="Les Miserables colored by group, sized by degree, Valjean selected">
<img class="k-dark-only" src="../kit/canvas/lesmis-groups-valjean-dark.svg" alt="Les Miserables colored by group, sized by degree, Valjean selected"></div>
${lmLegend}${toolbar.replace('<div class="k-toolbar" ', '<div class="k-toolbar" data-n="3" ')}</div>
<div class="s-dockstrip" role="button" tabindex="0" aria-expanded="false" aria-label="Table: 77 nodes, 254 edges. Open the table" data-n="1">${I("chevron-up", "k-i k-i-sm")}${I("table")}<span class="k-strong">Table</span><span class="k-secondary k-num" data-n="2" data-nb="right">77 nodes, 254 edges</span><span class="k-grow"></span><span class="k-secondary">View &gt; Table</span></div></main>
${right(`${I("circle-dot")}<span class="k-name k-id">Valjean</span><span class="k-secondary">Node</span>`, `<section class="k-section"><div class="k-section-head">Attributes</div>${data("group", 2)}${data("degree (full graph)", 36)}${data("betweenness", String(LMV.betweenness))}</section>`)}</div>`,
    notes: [
        ["The collapsed dock is a strip one row tall (32), across the canvas column, always visible: a chevron pointing up, the table icon and the word Table. A click or Enter opens the dock at the height the reader last set (a third of the column the first time); the strip is a Tab stop after the canvas and a stop of the region chord, so the keyboard reaches it the same way it reaches the open table. Dragging the dock's top edge down past five rows collapses it to this strip, never to nothing.", "Framework: information-architecture.md, the Bottom dock row (the table's home); the Information architecture proposal in framework-changes.md (a visible strip labeled Table). Built with: compact-mantine Button, subtle, full width, above the ResizeHandle (a collapsed variant proposed in framework-changes.md)."],
        [`The strip counts what the table holds, in the scope line's numbers: after this project's three filter steps it reads "${FS.after.step3} of 77 nodes, ${FS.byStep[2].edges} of 254 edges", and in the Selected scope it gives the selection's count, so a reader knows the rows are there before opening it.`, "Framework: information-architecture.md 8.1, The table's scope; message-catalog.md graphty.table.scope. Built with: compact-mantine Text, secondary."],
        ["No new toolbar button. The toolbar holds tools that act on the canvas; the table is a place, and it keeps its one home in the dock. View &gt; Table (printed at the strip's right end) and the strip are the two ways to it.", "Framework: interface-templates.md 16; information-architecture.md, the View menu. Built with: compact-mantine Toolbar (unchanged)."],
    ],
});

/* ---------- The Edges tab: the time column after the endpoints ---------- */
const XR = X.firstRows;
const tsRange = X.attributes.find((a) => a.name === "timestamp (edge)").range;
const amtRange = X.setsAndPaths.path.amountRange;
const edgeCsv = [["from_account", "to_account", "timestamp (UTC)", "amount (USD)"].join(","), ...XR.slice(0, 3).map((r) => [r.from_account, r.to_account, r.timestamp, r.amount].join(","))];
const sEdges = `<section class="s-state" id="edges"><h2><a href="#edges">The Edges tab: when each transfer happened</a></h2>
<p>At 1:1, outside the frame. The March transfers' Edges tab in file order, and the first lines of its CSV. The file lists each transfer as from_account, to_account, amount, timestamp; the table and the CSV put the time right after the two accounts, because "when" is the first question an investigator asks of a transfer and a column at the far right is scrolled past.</p>
<div class="s-outgrid" style="grid-template-columns:680px 1fr">
<figure><figcaption><span class="k-step">1</span>Edges tab, full graph</figcaption>
${miniDock({ tabs: [{ name: "Nodes" }, { name: "Edges", on: 1 }, { name: "Communities: Louvain" }], scope: `Full graph: ${fmt(X.edges)} edges`,
    cols: [{ name: "from_account", profile: "" }, { name: "to_account", profile: "" }, { name: "timestamp", profile: `UTC; ${tsRange[0].slice(0, 10)} to ${tsRange[1].slice(0, 10)}`, dist: blankDist(WHY_BINS) }, { name: "amount", num: true, profile: `${money(amtRange[0])} to ${money(amtRange[1])}`, dist: blankDist(WHY_BINS) }],
    rows: XR.map((r, k) => ({ index: k + 2, cells: [cell(r.from_account), cell(r.to_account), cell(when(r.timestamp, "s")), cell(money(Number(r.amount)))] })), rowcount: X.edges + 1 })}
<p>Over ${fmt(X.edges)} transfers in one month, minutes do not separate every pair, so this column keeps seconds. The profile line names the zone once (the file's times end in Z, so UTC) and the month the column spans.</p></figure>
<figure><figcaption><span class="k-step">2</span>The same rows in the CSV</figcaption>
<div class="s-csv k-mono" style="margin:0">${edgeCsv.map(esc).join("\n")}</div>
<p>Export table as CSV... writes the columns in the table's order, the time third, as the stored value (ISO 8601 with its zone), with the zone and the currency in the headers. The header spelling is proposed, not decided: other tools will parse it.</p></figure>
</div>
<ol class="s-notes k-annot-note"><li><span class="k-step">1</span><div>An edge's date or time column is shown by default, placed after the endpoints, on every list of edges: the Edges tab, an account's connections in the inspector, the walk list and the CSV. A reader can still hide or move it; the default is what changed.<br><span class="k-secondary">Framework: content-design.md 5, Dates; the edge time column proposal in framework-changes.md. Built with: DataTable.</span></div></li>
<li><span class="k-step">2</span><div>Bare stored values, scope and units in the headers.<br><span class="k-secondary">Framework: content-design.md 5, two kinds of export; output-homes.md 3, export-table. Built with: compact-mantine Code block in the export Modal.</span></div></li></ol></section>`;

/* ---------- the page ---------- */
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bottom dock table</title>
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>
  body { min-width: 1440px; margin: 0; background: var(--cm-bg-secondary); color: var(--cm-text); }
  .s-intro { max-width: 1440px; margin: 0 auto; padding: 24px 20px 0; font-size: 13px; line-height: 20px; }
  .s-intro h1 { font-size: 24px; line-height: 32px; margin: 0 0 8px; }
  .s-intro p, .s-intro ul { max-width: 120ch; }
  .s-intro li { margin: 2px 0; }
  .s-bar { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; font-size: 13px; }
  .s-bar a { color: var(--cm-text-brand); }
  .s-state { width: 1440px; margin: 40px auto 0; }
  .s-state:last-child { margin-bottom: 48px; }
  .s-state h2 { font-size: 15px; line-height: 24px; margin: 0 20px; }
  .s-state h2 a { color: inherit; text-decoration: none; }
  .s-state > p { font-size: 13px; line-height: 20px; margin: 4px 20px 12px; max-width: 120ch; color: var(--cm-text-secondary); }
  .s-frame { position: relative; }
  .s-app { width: 1440px; height: 900px; position: relative; box-shadow: 0 0 0 1px var(--cm-border); }
  body:not(:has(#annot:checked)) .k-annot-note, body:not(:has(#annot:checked)) .s-box { display: none; }

  /* The column header: DataTable's header variant, two row pitches (64) */
  .k-table th { height: 64px; padding: 6px 8px; vertical-align: top; }
  .k-table th.s-name, .k-table td.s-name { padding-inline: 16px; }
  .k-table th > span { display: flex; align-items: center; gap: 4px; }
  .k-table th.k-n > span { justify-content: flex-end; }
  .s-h1 { height: 16px; line-height: 16px; font-size: 11px; }
  .s-h1 .k-stack, .s-h1 .k-sizechip, .s-h1 .s-hlglyph { margin-inline-end: 2px; }
  .s-caret { flex: none; margin-inline-start: 2px; color: var(--cm-text); }
  .s-hmenu { display: none; width: 16px; height: 16px; place-items: center; border-radius: 4px; color: var(--cm-icon-secondary); }
  th.s-hhover { background: var(--cm-bg-hover); }
  th.s-hhover .s-hmenu { display: inline-grid; }
  th.k-n .s-h1 .k-grow { order: -1; }
  th.k-n .s-h1 .s-hmenu { order: -2; }
  .s-h2 { height: 14px; line-height: 14px; font-size: 11px; font-weight: 450; color: var(--cm-text-secondary); white-space: nowrap; }
  .s-h3 { height: 14px; margin-top: 2px; position: relative; }
  .s-h4 { height: 8px; margin-top: 1px; }
  .s-dist { position: relative; display: flex; align-items: flex-end; gap: 1px; width: 100%; height: 14px; cursor: pointer; }
  .s-dist > i { flex: 1; background: var(--cm-border-translucent-strong); border-radius: 1px 1px 0 0; }
  .s-dist > i[data-out] { background: var(--cm-icon-secondary); }
  .s-band { position: absolute; top: -2px; right: 0; height: 2px; background: var(--cm-icon-secondary); }
  .s-band::before { content: ""; position: absolute; left: 0; top: 0; width: 1px; height: 6px; background: var(--cm-icon-secondary); }
  .s-dist-blank { border: 1px dashed var(--cm-border-strong); border-radius: 2px; height: 12px; cursor: default; }
  .s-strip { position: relative; display: flex; gap: 1px; width: 100%; height: 10px; margin-top: 4px; border-radius: 2px; overflow: visible; }
  .s-strip > i { min-width: 2px; box-shadow: inset 0 0 0 1px var(--cm-border-translucent); }
  .s-strip > i:first-child { border-radius: 2px 0 0 2px; } .s-strip > i:last-of-type { border-radius: 0 2px 2px 0; }
  .s-scale { display: flex; align-items: center; justify-content: space-between; width: 100%; height: 8px; }
  .s-scale > i { border-radius: 50%; background: #808080; }
  .k-table td.s-focus { outline: 1px solid var(--cm-border-selected); outline-offset: -2px; }
  .k-table td.s-stale { color: var(--cm-text-tertiary); }
  .s-stalemark { display: inline-flex; align-items: center; gap: 2px; color: var(--cm-text); }
  .s-stalemark .k-i { color: var(--cm-icon-secondary); }
  .k-table th.s-fill, .k-table td.s-fill { width: 100%; border-inline-end: 0; }
  .k-table th:not(.s-fill) { min-width: 96px; }
  /* A run's group header: its name, method and scope over its score and rank columns */
  .k-table thead.s-grouped tr:nth-child(2) th { top: 32px; }
  .k-table .s-grouprow th { height: 32px; padding: 2px 8px; vertical-align: middle; font-weight: 450; white-space: normal; line-height: 14px; }
  .k-table .s-grouprow th.s-g0 { border-bottom-color: transparent; }
  .k-table .s-grouprow th.s-g { text-align: start; }
  .k-table .s-grouprow th > span { display: inline; }
  .s-gname { font-weight: 550; }
  .s-gmethod { color: var(--cm-text); }
  .s-g .s-stalemark { margin-inline-start: 8px; }
  .k-table th.s-rank:not(.s-fill) { min-width: 56px; width: 56px; }
  .k-table th.s-rank .s-dist-blank { border: 0; }
  .s-agree .s-action { white-space: nowrap; }
  .s-agree { display: flex; align-items: baseline; gap: 0; min-height: 32px; padding: 0 16px; font-size: 11px; line-height: 16px; align-items: center; border-bottom: 1px solid var(--cm-border); }

  /* The blocked tag: annotation ink, shown even with annotations off */
  .s-dist:has(.s-blk) > i, .s-dist:has(.s-blk) > .s-band { opacity: .45; }
  .s-blk { position: absolute; top: 1px; right: 0; z-index: 3; padding: 0 4px; font-size: var(--k-caption-fs); line-height: var(--k-caption-lh); }
  .s-blk-rows { top: 150px; right: 16px; font-size: 11px; line-height: 16px; padding: 1px 6px; }
  .k-dock { position: relative; }

  .s-virtual { position: relative; scrollbar-width: none; overflow: hidden; }
  .s-scrollbar { position: absolute; top: 70px; right: 3px; height: 300px; width: 6px; z-index: 2; }
  .s-scrollbar i { position: absolute; left: 1px; right: 1px; border-radius: 3px; background: var(--cm-text-tertiary); }
  .s-handle-hover { position: relative; z-index: 3; }
  .s-handle-hover::after { content: ""; position: absolute; left: 0; right: 0; top: 2px; height: 2px; background: var(--cm-bg-brand); }
  .s-cursor { position: absolute; z-index: 95; width: 20px; height: 20px; transform: translate(-50%, -50%); pointer-events: none;
    background: no-repeat center / 20px 20px url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M10 1l4 4h-3v3h7v4h-7v3h3l-4 4-4-4h3v-3H2V8h7V5H6z' fill='%23000' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E"); }
  .s-hovermark { width: 30px; height: 30px; }
  .s-action { color: var(--cm-text-brand); cursor: pointer; margin-inline-start: 8px; }
  .k-scope { display: flex; align-items: baseline; }
  .s-steps { left: 306px; top: 64px; width: 240px; }
  .s-steps .k-item { gap: 8px; }

  /* Annotation boxes, drawn by the script 4 px outside their targets */
  .s-box { position: absolute; z-index: 90; border: 2px dashed var(--k-annot); border-radius: 6px; pointer-events: none; }
  .s-box > .k-step { position: absolute; left: -28px; top: -4px; }
  .s-notes.k-annot-note { position: static; max-width: none; margin: 12px 0 0; padding: 12px 16px; list-style: none; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px 24px; box-shadow: none; font-size: 13px; line-height: 19px; }
  .s-notes li { display: flex; gap: 8px; align-items: flex-start; }

  .s-inset { display: grid; grid-template-columns: 360px 420px; gap: 24px; align-items: start; margin: 16px 20px 0; font-size: 13px; line-height: 19px; }
  .s-inset p { margin: 4px 0 0; }
  .s-inset-table { position: relative; background: var(--cm-bg); box-shadow: 0 0 0 1px var(--cm-border); }
  .s-inset-table > .s-blk { top: 48px; right: auto; left: 150px; }
  .s-hlglyph { width: 16px; height: 12px; flex: none; color: var(--cm-icon); }

  .s-gestures { display: grid; grid-template-columns: 220px 220px 1fr 1fr; gap: 24px; margin: 0 20px; align-items: start; }
  .s-gestures figure, .s-pair figure { margin: 0; font-size: 13px; line-height: 19px; }
  .s-gestures figcaption, .s-pair figcaption { font-weight: 600; margin-bottom: 8px; display: flex; gap: 8px; align-items: center; }
  .s-gestures p, .s-pair p { color: var(--cm-text-secondary); margin: 8px 0 0; }
  .s-hcell { width: 160px; background: var(--cm-bg); box-shadow: 0 0 0 1px var(--cm-border); }
  .s-inline-menu, .s-inline-pop { position: static; margin-top: 4px; }
  .s-inline-menu { width: 220px; }
  .s-inline-pop { width: 240px; }
  .s-bighist { padding: 4px 16px 0; }
  .s-bighist .s-dist { height: 64px; }
  .s-axis { display: flex; justify-content: space-between; padding: 2px 16px 4px; font-size: 11px; }
  .s-pop-foot { display: flex; gap: 8px; padding: 8px 16px 0; }
  .s-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 0 20px; }
  .s-dockonly { height: 300px; display: flex; flex-direction: column; background: var(--cm-bg); box-shadow: 0 0 0 1px var(--cm-border); }
  .s-dockonly .k-dock { flex: 1 1 auto; border-top: 0; }
  .k-table th[aria-disabled="true"] .s-label { color: var(--cm-text-secondary); }
  .s-outgrid { display: grid; grid-template-columns: 420px 1fr; gap: 24px; margin: 0 20px; align-items: start; }
  .s-outgrid figure { margin: 0; font-size: 13px; line-height: 19px; }
  .s-outgrid figcaption { font-weight: 600; margin-bottom: 8px; display: flex; gap: 8px; align-items: center; }
  .s-outgrid p { color: var(--cm-text-secondary); margin: 8px 0 0; }
  .s-inline-modal { position: static; width: 420px; max-width: none; }
  .s-csv { margin: 8px 16px; padding: 8px; border-radius: 4px; background: var(--cm-bg-secondary); font-size: 11px; line-height: 16px; white-space: pre; overflow: hidden; text-overflow: ellipsis; }
  .s-counts { display: grid; grid-template-columns: 1fr; gap: 24px; }
  .s-dockmini { height: auto; }
  .s-dockmini .k-table-wrap { flex: none; }
  .s-label { white-space: nowrap; }
  .k-table .s-grouprow th.s-g[colspan="1"] { min-width: 150px; }
  .s-dockstrip { flex: none; display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 16px; border-top: 1px solid var(--cm-border); background: var(--cm-bg); font-size: 11px; line-height: 16px; cursor: pointer; }
  .s-dockstrip .k-i { color: var(--cm-icon-secondary); }
  /* A rank column wide enough for "#10=" */
  .k-table th.s-rank.s-rankwide:not(.s-fill) { min-width: 84px; width: 84px; }
  .k-table td.s-rankwide { white-space: nowrap; }
  .s-tierule { min-height: 24px; }
  /* The selection total: a footer under the grid, outside its scroll area */
  .s-total { flex: none; display: flex; align-items: center; min-height: 32px; padding: 0 16px; border-top: 1px solid var(--cm-border); background: var(--cm-bg); font-size: 11px; line-height: 16px; white-space: nowrap; }
  .s-total .k-secondary { margin-inline-start: 12px; }
  /* The degree column's menu, open upward from its header, with New column's submenu */
  .s-colmenu, .s-submenu { position: absolute; z-index: 60; }
  .s-colmenu { left: 402px; top: 276px; width: 200px; }
  .s-submenu { left: 604px; top: 474px; width: 264px; }
</style>
</head>
<body>
<div class="s-intro">
  <h1>Bottom dock table</h1>
  <p>The table under the canvas lists the graph's nodes or edges as rows, one attribute per column. It shows the same selection as the canvas and the inspector, and it is how a keyboard or screen-reader user reads the whole graph. Each state below is the whole app at 1440 by 900 unless it says otherwise. The magenta notes cite the design framework and name the compact-mantine component each part is built with; they are not product UI.</p>
  <p><b>What changed after the first user study.</b> Every run now adds a score column and a rank column under one header that names the run, its method and its scope ("Betweenness exact, unweighted, full graph"; the rank "#2", "of 300"). Once two or more measures are ranked, one line above the table says whether they agree ("MAPK1 and TP53 are the top 2 on all three measures") and opens the rank-against-rank comparison. Rows leave by one route, Export table as CSV..., which writes every row with the original ids and those headers; Export... in the File list no longer offers tables. The counts of components, isolated nodes and path hops open their rows here.</p>
  <p><b>What changed after the third user study.</b> A table opened from a run is sorted by that run, and its scope line says so ("Sorted by pagerank, the run that opened the table"). Ranks showed near ties in the rank cell, with a rule line above the grid (removed after round 6: an exact tie is "=" at the shown precision, and an estimate shows its rank range). New column offers weighted degree in money words when the weight is a currency (Money in, Money out, Money in minus out) and names a link count as a count (Links in (count)); on the flagged accounts the three money columns sit beside the counts. Selected rows get a total in a footer under the grid ("Sum of Money in, 14 rows"; "Sum of amount, 5 rows" on the path's transfers). Nothing else changed.</p>
  <p><b>What changed after the second user study.</b> Every list of edges now shows when each edge happened, right after its two endpoints: the Edges tab, the path's hops, an account's connections, the walk list and the CSV (new section, The Edges tab). A collapsed table no longer disappears: it leaves a strip labeled Table along the bottom of the canvas, with its counts (new state, Collapsed); the toolbar gets no table button. Each degree column names the graph it was counted on in its own header, "degree (full graph)" or "degree (filtered graph)", so two degree columns cannot be confused. The protein table now carries its Louvain column, with the communities tab beside Nodes and Edges.</p>
  <p><b>Drawn here but waiting on graphty-element</b> (a small magenta <span class="k-annot-tag s-blk" style="position:static;display:inline-block">blocked</span> tag marks each one, and it stays visible with the notes off): the header histogram of any column that is not a result's field (degree, riskScore, the patent columns); every rank column, and so the agreement line (the rank over a run's scope); the color chit in each cell (drawn only in the inset under the first state); and the rows of a graph past the drawing limit. Each is absent from the first release, with no substitute, until the element provides it.</p>
  <div class="s-bar"><label><input type="checkbox" id="annot" checked> Show notes</label>
  <span>Theme: <a href="?theme=light">light</a> | <a href="?theme=dark">dark</a> | <a href="?">system</a></span>
  <a href="#small">Small graph</a><a href="#collapsed">Collapsed</a><a href="#header">Column header</a><a href="#large">Large graph</a><a href="#ranked">Three measures ranked</a><a href="#selected">Selected scope</a><a href="#stale">Not current</a><a href="#empty">Empty after a filter</a><a href="#limit">Past the drawing limit</a><a href="#out">Getting rows out</a><a href="#edges">Edges tab</a><a href="#more">Loading and item tab</a></div>
</div>
${s1}
${sCollapsed}
${s2}
${s3}
${sRanked}
${s4}
${s5}
${s6}
${s7}
${sOut}
${sEdges}
${s8}
<script>
  var q = new URLSearchParams(location.search);
  if (q.get("theme")) document.documentElement.setAttribute("data-theme", q.get("theme"));
  if (q.get("notes") === "0") document.getElementById("annot").checked = false;
  // Draw each note's box 4 px outside the element it explains, with its number outside the corner.
  function boxes() {
    document.querySelectorAll(".s-box").forEach(function (b) { b.remove(); });
    document.querySelectorAll(".s-frame").forEach(function (frame) {
      var fr = frame.getBoundingClientRect();
      frame.querySelectorAll("[data-n]").forEach(function (el) {
        var r = el.getBoundingClientRect();
        var w = Math.max(r.width, 8), h = Math.max(r.height, 8);
        var b = document.createElement("span");
        b.className = "s-box";
        b.style.left = (r.left - fr.left - 4 - (w - r.width) / 2) + "px";
        b.style.top = (r.top - fr.top - 4 - (h - r.height) / 2) + "px";
        b.style.width = (w + 8) + "px";
        b.style.height = (h + 8) + "px";
        b.innerHTML = '<span class="k-step"' + (el.getAttribute("data-nb") === "right" ? ' style="left:auto;right:-28px"' : "") + ">" + el.getAttribute("data-n") + "</span>";
        frame.appendChild(b);
      });
    });
  }
  boxes();
  addEventListener("resize", boxes);
  if (document.fonts) document.fonts.ready.then(boxes);
</script>
</body>
</html>
`;
if (/[^\x00-\x7f]/.test(html)) throw new Error("non-ASCII in the page");
writeFileSync(join(here, "table-dock.html"), toShell(html)); // the current frame: kit/shell.mjs
console.log("wrote screens/table-dock.html");
