/* Inspector: a measure row (version 3). One frame, two tabs.
   Style: the shared Style tab with the painting property bound to the result. The bound line shows
   what the reader needs (the ramp and "Orange to brown"; a range for a size or width); clicking it
   opens the one Binding popover (style-pickers/binding). There is no binding block and no unbind
   dialog here: Detach and everything else about the binding live in that popover.
   Data: Values (the histogram, drag to select, and one caption), Top 10 (ten rows, or every row known
   when fewer; "Show all in table" is in its "..." and opens the table sorted by the measure), Made with (settings that differ from the default, "All options...", then
   provenance only where it differs from the current graph), Notes. The state bar is one line with
   Rerun and Revert. No verbs in the bodies.

   Numbers. Les Miserables PageRank and edge betweenness are computed on the published graph the
   fixtures describe (77 nodes, 254 edges; unweighted; PageRank damping 0.85; edge betweenness
   normalized); "Filter to degree >= 2" leaves 60 nodes, as fixtures.json says. riskScore uses
   fixtures.json only (the transfers bands and the 14 flagged accounts scored 88 to 98).

   Shared from this file: AB.histogram(m, brush) is the one histogram component, for the attribute
   inspector to reuse (spec: "the attribute histogram is the measure row's histogram"). This file
   also registers the small overlay section "measure-row-options", the "All options..." popover.
   Weight in All options reads its source: "loaded weight" when the data defined one, else
   "None: no weight loaded" (Les Miserables loads no weight).

   The number rules. A range always names its column ("PageRank 0.0033 to 0.0754"). A value computed
   on a set other than the current graph names that set ("0.419, on 60 of 77"), and Made with gets a
   Scope row; the header's kind slot then shows the funnel (computed before the current filter) and
   the row keeps painting. Ranks: equal values at the shown precision share a rank marked "="
   ("2="); a sampled run shows every rank as a range from its own error bound ("#3-#5") and one
   stability sentence under Top 10. A weighted run's Made with names the weight and its meaning.
   Every statistic or setting label with a reader line (READER) carries it on hover and keyboard
   focus, dotted underlined, as the label's description.
   The sampled transfers betweenness values are illustrative (the fixtures hold no transfers
   betweenness); the account ids are fixtures.json's busiest merchants. */
(function () {
    "use strict";
    const A = window.AB;

    if (!document.getElementById("imr-style")) {
        const s = document.createElement("style");
        s.id = "imr-style";
        s.textContent = `
.imr-hist { position: relative; margin: 4px 0 0; height: 64px; display: flex; align-items: flex-end; gap: 1px; cursor: crosshair; user-select: none; touch-action: none; }
.imr-hist > i { flex: 1 1 0; background: var(--cm-border-translucent-strong); border-radius: 1px 1px 0 0; min-height: 1px; }
.imr-hist > i[data-zero] { background: none; border-bottom: 1px solid var(--cm-border-translucent-strong); }
.imr-hist > i[data-on] { background: var(--cm-bg-brand); }
.imr-axis { display: flex; justify-content: space-between; color: var(--cm-text-secondary); font-size: 11px; font-variant-numeric: tabular-nums; }
.imr-cap { color: var(--cm-text-secondary); font-size: 11px; line-height: 16px; padding: 2px 0 4px; }
.imr-brushed { display: flex; align-items: center; gap: 6px; min-height: 24px; }
.imr-rank { min-width: 16px; text-align: end; white-space: nowrap; color: var(--cm-text-secondary); font-variant-numeric: tabular-nums; flex: none; }
.imr-edited .k-value .k-field { color: var(--cm-text-brand); }
.imr-term { text-decoration: underline dotted; text-underline-offset: 2px; cursor: help; }
.imr-edge-kind { position: relative; display: inline-flex; }
.imr-edge-kind > svg { clip-path: polygon(0 0, 100% 0, 100% 45%, 45% 100%, 0 100%); }
.imr-edge-kind > i { position: absolute; right: -1px; bottom: 2px; width: 8px; height: 1px; background: currentColor; transform: rotate(-45deg); }
.imr-edge-kind > i::before, .imr-edge-kind > i::after { content: ""; position: absolute; top: -1px; width: 3px; height: 3px; border-radius: 50%; background: currentColor; }
.imr-edge-kind > i::before { left: -1px; } .imr-edge-kind > i::after { right: -1px; }
`;
        document.head.append(s);
    }

    const RAMP = ["#ef7818", "#662506"]; // graphty-element's "Orange to brown" (ylorbr), its ends

    // ---------- the measures (built on first use: the fixtures load after this file) ----------
    let MS = null;
    const MEASURES = () => MS || (MS = build());
    function build() {
    const L = A.fx.datasets.lesmis, T = A.fx.datasets.transactions, W = A.fx.datasets.wide;
    const F = L.filterSteps, onStep1 = F.betweennessOnStep1.map((x) => x.betweenness).sort((a, b) => a - b);
    return {
        pagerank: {
            title: "PageRank", over: "node", unit: "nodes", total: L.nodes, run: true, icon: "chart-column",
            fmt: (v) => v.toFixed(4),
            provenance: ["from Analyze", "analyze-popover", "open"],
            bound: { "node.color": { field: "PageRank", palette: "Orange to brown", ramp: RAMP } },
            order: "Covers Louvain for Color",
            range: "0.0033 to 0.0754, median 0.0124",
            hist: { from: 0, width: 0.005, bins: [9, 24, 19, 16, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 1] },
            // the ten highest of the PageRank column the Nodes table shows (table-dock.js PR)
            top: [["Valjean", 0.0754], ["Myriel", 0.0428], ["Gavroche", 0.0358], ["Marius", 0.0309], ["Javert", 0.0303], ["Thenardier", 0.0279], ["Fantine", 0.027], ["Enjolras", 0.0219], ["Cosette", 0.0206], ["Mme.Thenardier", 0.0195]],
            binNames: { 4: ["Enjolras", "Cosette"], 5: ["Fantine", "Thenardier"], 6: ["Marius", "Javert"], 7: ["Gavroche"], 8: ["Myriel"], 15: ["Valjean"] },
            options: [["Damping", "0.85"], ["Iterations", "Up to 100"], ["Weight", "None: no weight loaded"]],
            ran: "Sep 28, on the CPU",
            writes: "pagerank",
            sort: "pagerank",
        },
        edge: {
            title: "Edge betweenness", over: "edge", unit: "edges", total: L.edges, edgeMark: true, run: true, icon: "chart-column",
            fmt: (v) => v.toFixed(4),
            provenance: ["from Analyze", "analyze-popover", "open"],
            bound: { "edge.color": { field: "Edge betweenness", palette: "Orange to brown", ramp: RAMP }, "edge.width": { field: "Edge betweenness", range: "0.5 to 6" } },
            range: "0.0003 to 0.1832, median 0.0058",
            hist: { from: 0, width: 0.01, bins: [170, 40, 33, 3, 4, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
            top: [["Myriel - Valjean", 0.1832], ["Valjean - Gavroche", 0.083], ["Valjean - Fantine", 0.0762], ["Mme.Burgon - Gavroche", 0.0513], ["Valjean - Mlle.Gillenormand", 0.045]],
            binNames: { 5: ["Mme.Burgon - Gavroche"], 7: ["Valjean - Fantine"], 8: ["Valjean - Gavroche"], 18: ["Myriel - Valjean"] },
            options: [["Weight", "None: no weight loaded"], ["Normalized", "Yes, 0 to 1"], ["Sample", "Every node (exact)"]],
            ran: "Sep 28, on the CPU",
            writes: "edge betweenness (on edges)",
        },
        // Degree: Size bound to the overview's degree, on a row hidden from the list that still paints
        degree: {
            title: "Degree", over: "node", unit: "nodes", total: L.nodes, run: false, icon: "hash",
            fmt: (v) => String(Math.round(v)),
            provenance: ["from the graph overview", "inspector-nothing-selected", "overview"],
            bound: { "node.size": { field: "Degree", range: "0.5 to 3" } },
            range: "1 to 36, median 6",
            hist: { from: 0, width: 3, bins: [27, 9, 16, 14, 4, 4, 1, 1, 0, 0, 0, 1] },
            top: L.topByDegree.map((x) => [x.label, x.degree]),
            binNames: { 11: ["Valjean"], 7: ["Gavroche"], 6: ["Marius"] },
            made: [["Created from", "The graph overview (degree)"]],
            writes: "degree",
            sort: "degree",
        },
        risk: {
            title: "riskScore", over: "node", unit: "accounts", total: T.nodes, run: false, icon: "hash",
            fmt: (v) => String(v),
            provenance: ["from accounts-2026-03.csv", "data-place", "attributes"],
            bound: { "node.color": { field: "riskScore", palette: "Orange to brown", ramp: RAMP } },
            range: "0 to 98; none score 80 to 87",
            bands: [{ from: 0, to: 19, count: 1929 }, { from: 20, to: 69, count: 928 }, { from: 70, to: 79, count: 129 }, { from: 80, to: 87, count: 0 }, { from: 88, to: 98, count: 14 }],
            top: T.flaggedAccounts.map((x) => [x.id, x.riskScore]).sort((a, b) => b[1] - a[1]).slice(0, 10),
            made: [["Joined on", "account id"], ["Computed by", "The bank, not graphty"], ["Scale", "0 to 100"]],
            writes: "riskScore",
        },
        // The hosts' longest attribute name, painting Size: the row graph-place/wide-sized adds (lib.js STYLED). Counts from kit/wide-nested.json
        vuln: {
            title: "vuln_count_critical_unremediated_over_30_days", long: true, over: "node", unit: "hosts", total: W.nodes, run: false, icon: "hash",
            fmt: (v) => String(v),
            provenance: ["from hosts-2026-03.csv", "data-place", "attributes-wide"],
            bound: { "node.size": { field: "vuln_count_critical_unremediated_over_30_days", range: "0.5 to 3" } },
            range: "0 to 6, median 0",
            bands: [273, 8, 3, 7, 5, 1, 3].map((count, i) => ({ from: i, to: i, count })),
            binNames: { 5: ["batch-staging-sgp-01"], 6: ["app-dev-sgp-01", "queue-prod-iad-03", "monitor-prod-iad-03"] },
            top: W.nodeRows.map((r) => [A.nameOf("wide", r), r.vuln_count_critical_unremediated_over_30_days]).sort((a, b) => b[1] - a[1]).slice(0, 10),
            made: [["Source", "hosts-2026-03.csv"], ["Type", "Whole number, 0 to 6"]],
            writes: "vuln_count_critical_unremediated_over_30_days",
        },
        // Betweenness on the whole graph, Color covered by PageRank on every node: it paints nothing visible
        betweenness: {
            title: "Betweenness", over: "node", unit: "nodes", total: L.nodes, run: true, icon: "chart-column",
            fmt: (v) => A.num(v),
            provenance: ["from Analyze", "analyze-popover", "open"],
            bound: { "node.color": { field: "Betweenness", palette: "Yellow to orange", ramp: ["#fde7c8", "#E69F00"] } },
            order: "Covered by PageRank for Color on " + A.count(L.nodes, null, { of: L.nodes }),
            // every value it paints is covered, so the Paints line says it shows nothing
            hidden: "none visible: PageRank covers their Color",
            range: "0 to " + A.num(L.topByBetweenness[0].betweenness),
            hist: { from: 0, width: 0.04, bins: [L.nodes - 10, 5, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
            top: L.topByBetweenness.slice(0, 10).map((x) => [x.label, x.betweenness]),
            binNames: { 14: ["Valjean"], 4: ["Myriel", "Gavroche"], 3: ["Marius", "Fantine"] },
            options: [["Weight", "None: no weight loaded"], ["Normalized", "Yes, 0 to 1"], ["Sample", "Every node (exact)"]],
            optionsState: "betweenness",
            ran: "Sep 28, on the CPU",
            writes: "betweenness",
            sort: "betweenness",
        },
        // Betweenness run while "Filter to degree >= 2" was on (60 of 77); the filter is off now, so
        // every value names the 60 it was computed on, and the 17 left out have no value
        "betweenness-on-filter": {
            title: "Betweenness", over: "node", unit: "nodes", total: L.nodes, has: F.after.step1, run: true, icon: "chart-column",
            fmt: (v) => A.num(v),
            provenance: ["from Analyze", "analyze-popover", "open"],
            bound: { "node.color": { field: "Betweenness", palette: "Yellow to orange", ramp: ["#fde7c8", "#E69F00"] } },
            range: "0 to " + A.num(onStep1[onStep1.length - 1]) + ", median " + A.num((onStep1[29] + onStep1[30]) / 2),
            hist: { from: 0, width: 0.03, bins: Array.from({ length: 14 }, (_, i) => onStep1.filter((v) => Math.min(13, Math.floor(v / 0.03)) === i).length) },
            top: F.betweennessOnStep1.slice(0, 10).map((x) => [x.label, x.betweenness]),
            binNames: { 13: ["Valjean"], 5: ["Gavroche", "Marius", "Fantine"] },
            scopeNote: "on " + A.count(F.after.step1, null, { of: L.nodes }),
            scopeRow: A.count(F.after.step1, "node", { of: L.nodes }) + ", under " + F.steps[0] + " (now off)",
            scopeWhy: "Ran on " + A.count(F.after.step1, "node", { of: L.nodes }) + " under " + F.steps[0] + "; that filter is off now. It keeps painting the " + A.num(F.after.step1) + " it computed.",
            options: [["Weight", "None: no weight loaded"], ["Normalized", "Yes, 0 to 1"], ["Sample", "Every node (exact)"]],
            optionsState: "betweenness",
            ran: "Sep 28, on the CPU",
            writes: "betweenness",
        },
        // Transfers: betweenness weighted by amount, sampled from 500 source accounts
        sampled: {
            title: "Betweenness", over: "node", unit: "accounts", total: T.nodes, run: true, icon: "chart-column", table: "transfers",
            fmt: (v) => v.toFixed(3),
            provenance: ["from Analyze", "analyze-popover", "open"],
            bound: { "node.color": { field: "Betweenness", palette: "Orange to brown", ramp: RAMP } },
            range: "0 to 0.412, median below 0.001",
            hist: { from: 0, width: 0.026, bins: [T.nodes - 58, 38, 11, 3, 4, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1] },
            // the first 12 values: ranks are ranges against the values within the error bound of each
            pool: [0.412, 0.231, 0.118, 0.104, 0.097, 0.081, 0.064, 0.058, 0.051, 0.047, 0.039, 0.033],
            err: 0.012,
            top: T.topByDegree.slice(0, 10).map((x, i) => [x.id, [0.412, 0.231, 0.118, 0.104, 0.097, 0.081, 0.064, 0.058, 0.051, 0.047][i]]),
            binNames: { 15: [T.topByDegree[0].id], 8: [T.topByDegree[1].id] },
            set: [["Weight", "amount, larger = closer"], ["Sample", A.count(500, null, { of: T.nodes }) + " sources"]],
            options: [["Weight", "amount, as similarity (larger = closer)"], ["Sample", "500 source accounts"], ["Normalized", "Yes, 0 to 1"], ["Seed", "7"]],
            optionsState: "sampled",
            made: [["Error bound", "+/- 0.012 on each value"]],
            ran: "Sep 30, on the CPU",
            writes: "betweenness",
        },
    };
    }
    // Reader lines: one sentence a reader with no graph training understands (the glossary's reader
    // line, framework-changes.md "Every statistic says what it means"), on hover and keyboard focus
    const READER = {
        PageRank: "How much a node matters, counting how much its neighbors matter.",
        Betweenness: "How often a node lies on the shortest paths between other nodes.",
        "Edge betweenness": "How often an edge lies on the shortest paths between nodes.",
        Degree: "How many connections a node has.",
        median: "The middle value: half are above it, half below.",
        riskScore: "A column from your file. graphty does not know what it measures.",
        Damping: "How often the walk follows an edge instead of jumping to any node: 0.85 follows one 85 times in 100.",
        Weight: "The edge attribute the run reads, and what a larger value means.",
        Sample: "How many nodes the run starts its path counts from. Fewer is faster and less exact.",
        "Error bound": "How far each sampled value may be from the exact one; ranks closer than this may swap.",
        Scope: "The graph something is computed over: for a run, frozen at its start.",
        Seed: "The starting number for a method that uses chance. The same seed gives the same result.",
    };
    // A label with a reader line: dotted underline, a Tab stop, the line as its description
    function term(text, key) {
        const line = READER[key || text];
        if (!line) return text;
        return A.tip(h("span", { class: "imr-term", tabindex: "0", "aria-description": line }, text), line, { label: false });
    }
    // The Values caption: the count, then the range named by its column (and the set it was computed on)
    function caption(m, asText) {
        const n = A.count(m.has != null ? m.has : m.total, null, { of: m.total }) + " have a value; ";
        const col = m.long ? A.truncMiddle(m.title, 24) : m.title;
        const scope = m.scopeNote ? ", " + m.scopeNote : "";
        if (asText) return n + m.title + " " + m.range + scope;
        const [pre, post] = m.range.split(/\bmedian\b/);
        return h("span", null, n, typeof col === "string" ? term(col) : col, " " + pre, post != null ? [term("median"), post] : null, scope);
    }
    // Ranks: equal at the shown precision share "N="; a sampled run's rank is a low-high range from its
    // error bound ("#3-#5"), and "#1" when the range is one rank (the table dock's form)
    function ranks(m) {
        const vals = m.top.map((t) => t[1]);
        if (m.err) {
            const pool = m.pool || vals, e = m.err;
            return vals.map((v) => {
                const lo = 1 + pool.filter((o) => o - e > v + e).length, hi = pool.filter((o) => o + e > v - e).length;
                return lo === hi ? "#" + lo : "#" + lo + "-#" + hi;
            });
        }
        return vals.map((v, i) => {
            const shown = m.fmt(v), r = 1 + vals.filter((o) => o > v && m.fmt(o) !== shown).length;
            return vals.some((o, j) => j !== i && m.fmt(o) === shown) ? r + "=" : String(r);
        });
    }
    // ---------- a row Color by or Size by made from an attribute (AB.paintRow), read from its records ----------
    function painted(prop) {
        const r = A.route, ds = r && ["wide", "nested", "plainJson"].includes(r.frame.dataset) ? r.frame.dataset : (A.paintedLast || { ds: "wide" }).ds;
        const p = (A.painted[ds] || []).filter((x) => x.prop === prop && x.on === "row").pop();
        const [x, g] = p ? A.fieldIn(ds, p.name) : [null, null];
        if (!x) return null;
        const D = A.fx.datasets[ds], recs = A.recordsOf(ds, g), edge = g.element === "edge";
        const file = ds === "wide" ? (edge ? D.edgesFile : D.file) : D.file;
        const nameOfRec = (rec) => (edge ? rec.source + " - " + rec.target : A.nameOf(ds, rec));
        const vals = recs.map((rec) => A.valueAt(rec, p.name)).map((v) => (v == null || v === "" || typeof v === "object" ? null : v));
        const has = vals.filter((v) => v != null), num = x.type === "num";
        const fmt = (v) => (typeof v === "number" ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(v));
        const m = {
            title: p.name, long: p.name.length > 24, over: g.element, unit: g.table, total: recs.length, run: false, icon: num ? "hash" : "type", fmt, table: "wide",
            provenance: ["from " + file, "data-place", A.placeOf(ds, "data") || "attributes-wide"], writes: p.name, writesGo: ["data-place", A.placeOf(ds, "data") || "attributes-wide"],
            made: [["Source", file], ["Type", num ? "Number" : "Category"]], bindingState: "painted-" + prop.toLowerCase(),
            bound: prop === "Color" ? { [g.element + ".color"]: num ? { field: p.name, palette: "Orange to brown", ramp: RAMP } : { field: p.name, palette: "Eight distinct" } } : { [g.element + (edge ? ".width" : ".size")]: { field: p.name, range: edge ? "0.5 to 4" : "0.5 to 3" } },
        };
        if (!num) {
            const c = {};
            has.forEach((v) => { c[v] = (c[v] || 0) + 1; });
            const top = Object.entries(c).sort((a, b) => b[1] - a[1]);
            m.cats = top.slice(0, 15).concat(top.length > 15 ? [["other", top.slice(15).reduce((a, [, k]) => a + k, 0)]] : []);
            m.hist = { from: 0, width: 1, bins: m.cats.map(([, k]) => k) };
            m.caption = A.count(has.length, null, { of: recs.length }) + " have a value; " + p.name + " has " + A.num(top.length) + " distinct values";
            m.top = top.slice(0, 10).map(([v, k]) => [v, k]);
            m.fmt = (v) => String(v);
            m.swatch = A.chit("#E69F00");
            return m;
        }
        const lo = Math.min(...has), hi = Math.max(...has), w = hi > lo ? (hi - lo) / 16 : 1;
        const bin = (v) => Math.min(15, Math.floor((v - lo) / w));
        const bins = Array.from({ length: 16 }, () => 0), names = {};
        recs.forEach((rec, i) => { if (vals[i] == null) return; const b = bin(vals[i]); bins[b]++; (names[b] = names[b] || []).push(nameOfRec(rec)); });
        m.binNames = Object.fromEntries(Object.entries(names).filter(([, l]) => l.length <= 6));
        const sorted = has.slice().sort((a, b) => a - b);
        m.hist = { from: lo, width: w, bins };
        m.has = has.length;
        m.range = fmt(lo) + " to " + fmt(hi) + ", median " + fmt(sorted[Math.floor(sorted.length / 2)]);
        m.top = recs.map((rec, i) => [nameOfRec(rec), vals[i]]).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1]).slice(0, 10);
        return m;
    }

    // A direct visit, before any Color by or Size by: the hosts painted by cpu_util_p95_pct (the frame runs before any region draws)
    function seed(state) {
        const prop = state === "painted-size" ? "Size" : "Color", ds = (A.paintedLast || { ds: "wide" }).ds;
        if (!(A.painted[ds] || []).some((x) => x.prop === prop && x.on === "row")) A.paintBy("wide", prop, "cpu_util_p95_pct", "row");
        return { dataset: A.paintedLast.ds, left: "graph-place/painted" };
    }
    const tableOf = (m) => m.table || (m.over === "edge" ? "edges" : m.unit === "accounts" ? "transfers" : m.unit === "hosts" ? "wide" : "nodes");
    // Show all in table: the measure's table, sorted by the measure, highest first. The table dock has
    // no state per sort, so this sorts by its column header once the table draws (a table-dock state
    // per measure would replace it); a measure with no column there opens the table as it is.
    function showAll(m) {
        A.go("table-dock", tableOf(m));
        if (!m.sort) return;
        let n = 0;
        // the dock may draw more than once as the route settles, so keep it sorted for a second
        const sortBy = () => {
            const th = document.getElementById("td-col-" + m.sort);
            if (th && th.getAttribute("aria-sort") !== "descending") th.click();
            if (++n < 60) requestAnimationFrame(sortBy);
        };
        requestAnimationFrame(sortBy);
    }
    // An attribute name takes the middle ellipsis (spec 2.5); prose keeps the end ellipsis
    const nameOf = (m, max) => (m.long ? A.truncMiddle(m.title, max) : m.title);

    // ---------- Style tab ----------
    function styleTab(m, st) {
        // a line bound with its bind icon on this row (A.boundOn) joins the row's own binding
        const mine = A.boundOn("inspector-measure-row/" + st.id);
        const tab = A.styleTab({ kinds: [m.over], kind: m.over, set: {}, bound: Object.assign({}, m.bound, mine) });
        // A bound value opens the one Binding popover, in this row's form (diverging or not). A label
        // line is not a binding: it keeps its own Label popover, so only channel lines are redirected.
        const target = ["style-pickers", m.bindingState || (st.diverging ? "binding-diverging" : "binding")];
        const BOUND = ".ab-sline:not([data-label]) .ab-bound";
        const open = (e) => {
            const b = e.target.closest && e.target.closest(BOUND);
            if (!b || (e.type === "keydown" && e.key !== "Enter" && e.key !== " ")) return;
            e.stopPropagation();
            e.preventDefault();
            A.go(target[0], b.closest(".ab-sline").dataset.ch in mine ? "bound" : target[1]);
        };
        tab.addEventListener("click", open, true);
        tab.addEventListener("keydown", open, true);
        const mark = () => tab.querySelectorAll(BOUND).forEach((b) => { b.dataset.nav = A.href(target[0], b.closest(".ab-sline").dataset.ch in mine ? "bound" : target[1]); b.setAttribute("aria-haspopup", "dialog"); });
        new MutationObserver(mark).observe(tab, { childList: true, subtree: true });
        mark();
        return h("div", null,
            A.paintsLine("Paints " + A.count(st.paints || (m.has != null ? m.has : m.total), m.unit.replace(/s$/, "")) + (m.hidden ? ", " + m.hidden : " (every " + m.unit.replace(/s$/, "") + " with a value)"), ["table-dock", tableOf(m)]),
            A.paintOrderLine(m.order),
            tab);
    }

    // ---------- the one histogram (drag across bars to select) ----------
    function histogram(m, brush) {
        const box = h("div", { style: "padding: 0 16px" });
        const summary = h("div");
        let bars, axis;
        if (m.bands) {
            // unequal bands: a bar's width is its band, its height accounts per score point
            const dens = m.bands.map((b) => b.count / (b.to - b.from + 1));
            const top = Math.max(...dens);
            bars = h("div", { class: "imr-hist", role: "img", "aria-label": "Distribution of " + m.title }, m.bands.map((b, i) => h("i", { style: `flex:${b.to - b.from + 1} 1 0;height:${b.count ? Math.max(2, (dens[i] / top) * 100) : 0}%`, "data-zero": b.count ? null : "" })));
            axis = h("div", { class: "imr-axis" }, h("span", null, String(m.bands[0].from)), h("span", null, String(m.bands[m.bands.length - 1].to)));
        } else {
            const H = m.hist, top = Math.max(...H.bins);
            bars = h("div", { class: "imr-hist", role: "img", "aria-label": "Distribution of " + m.title }, H.bins.map((c) => h("i", { style: `height:${c ? Math.max(3, (c / top) * 100) : 0}%`, "data-zero": c ? null : "" })));
            axis = m.cats ? h("div", { class: "imr-axis" }, h("span", null, A.truncMiddle(String(m.cats[0][0]), 18)), h("span", null, A.truncMiddle(String(m.cats[m.cats.length - 1][0]), 18)))
                : h("div", { class: "imr-axis" }, h("span", null, H.from ? m.fmt(H.from) : "0"), h("span", null, m.fmt(H.from + H.bins.length * H.width)));
        }
        A.tip(bars, "Drag across bars to select those " + m.unit, { label: false });
        const counts = m.bands ? m.bands.map((b) => b.count) : m.hist.bins;
        const lo = (i) => (m.cats ? String(m.cats[i][0]) : m.bands ? String(m.bands[i].from) : m.fmt(m.hist.from + i * m.hist.width));
        const hi = (i) => (m.cats ? String(m.cats[i][0]) : m.bands ? String(m.bands[i].to) : m.fmt(m.hist.from + (i + 1) * m.hist.width));
        const clear = () => { [...bars.children].forEach((x) => x.removeAttribute("data-on")); summary.replaceChildren(); A.announce("Selection cleared"); };
        const setRange = (a, b) => {
            const [s, e] = a <= b ? [a, b] : [b, a];
            [...bars.children].forEach((x, i) => x.toggleAttribute("data-on", i >= s && i <= e));
            const n = counts.slice(s, e + 1).reduce((p, q) => p + q, 0);
            const names = m.binNames ? Object.entries(m.binNames).filter(([k]) => +k >= s && +k <= e).flatMap(([, v]) => v) : [];
            const unit = n === 1 ? m.unit.replace(/s$/, "") : m.unit;
            const what = names.length && names.length === n && n <= 6 ? ": " + names.join(", ") : "";
            summary.replaceChildren(h("div", { class: "imr-brushed", role: "status" },
                h("span", { class: "k-grow" }, A.link("table-dock", tableOf(m), n.toLocaleString("en-US") + " " + unit), " selected, " + m.title + " " + lo(s) + " to " + hi(e) + what),
                A.iconButton("x", "Clear the selection", { onClick: clear })));
        };
        let start = null;
        bars.addEventListener("pointerdown", (e) => { const t = e.target.closest("i"); if (!t) return; start = [...bars.children].indexOf(t); bars.setPointerCapture(e.pointerId); setRange(start, start); });
        bars.addEventListener("pointermove", (e) => {
            if (start == null) return;
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el && el.parentNode === bars) setRange(start, [...bars.children].indexOf(el));
        });
        bars.addEventListener("pointerup", () => (start = null));
        box.append(bars, axis, h("div", { class: "imr-cap" }, m.caption || caption(m)), summary);
        if (brush) setRange(brush[0], brush[1]);
        return box;
    }
    if (!A.histogram) A.histogram = histogram;

    // ---------- Data tab ----------
    function dataTab(m, st) {
        const rk = ranks(m);
        const topRow = ([name, v], i) =>
            h("div", Object.assign({ class: "k-row" }, name === "Valjean" ? A.act({ go: ["inspector-node", "why-this-look"] }) : A.act({ onClick: () => A.flash("Selects " + name) })),
                h("span", { class: "imr-rank", style: m.err ? "min-width: 52px" : null }, rk[i]), h("span", { class: "k-grow k-ellipsis" }, name), h("span", { class: "k-secondary k-num" }, m.fmt(v) + (m.scopeNote || st.scopeNote ? ", " + (m.scopeNote || st.scopeNote) : "")));
        // a sampled run: one sentence on how stable the ranks are, from the first range wider than one rank
        const firstRange = rk.findIndex((r) => r.includes("-"));
        const stable = m.err ? h("div", { class: "imr-cap", style: "padding: 4px 16px" }, firstRange < 0 ? "No rank swaps between runs" : firstRange === 0 ? "Every rank may swap between runs" : "Ranks below #" + firstRange + " may swap between runs") : null;
        const made = [];
        if (m.run) {
            // settings that differ from the default, as editable fields; the rest behind All options
            const opts = m.optionsState || (m.over === "edge" ? "edge" : "pagerank");
            const set = (m.set || []).concat(st.edited ? [["Damping", "0.90"]] : []);
            set.forEach(([k, v]) => made.push(h("div", { class: "k-data" + (st.edited ? " imr-edited" : "") }, h("span", { class: "k-name" }, term(k)),
                h("span", { class: "k-value" }, A.field(v, { go: ["measure-row-options", opts] })))));
            made.push(h("div", { class: "k-data" }, h("span", { class: "k-name" }, set.length ? "" : "Settings"),
                h("span", { class: "k-value" }, set.length ? null : h("span", { class: "k-secondary" }, "Defaults "),
                    A.link("measure-row-options", opts, "All options...", { "data-imr-options": "" }))));
        }
        (m.made || []).forEach(([k, v]) => made.push(A.data(term(k), v)));
        if (st.scopeRow || m.scopeRow) made.push(A.data(term("Scope"), st.scopeRow || m.scopeRow));
        if (m.ran) made.push(A.data("Ran", m.ran));
        made.push(A.data("Writes", m.long ? A.truncMiddle(m.writes, 20) : m.writes, { go: m.writesGo || (m.long ? ["data-place", "attributes-wide"] : ["data-place", "attributes"]) }));
        // Spec order: Values, Top 10, Made with, Notes (AB.dataTab would sort Top 10 after Made with)
        // the key is the section's kind, not its title, so "Top 5" and "Top 10" share one open state
        const sec = (title, summary, body, actions) => A.section({ title, actions, collapsible: true, key: "data.measure." + title.toLowerCase().replace(/^top \d+$/, "top-10").replace(/\s+/g, "-"), summary }, body);
        return h("div", null,
            sec("Values", m.caption || caption(m, true), histogram(m, st.brush)),
            sec("Top " + m.top.length, m.top.slice(0, 3).map((t) => t[0]).join(", ") + "...", [m.top.map(topRow), stable],
                A.iconButton(A.ICON.options, "More for Top " + m.top.length, { onClick: (e) => A.openMenu(e.currentTarget, [{ label: "Show all in table", onClick: () => showAll(m) }]) })),
            sec("Made with", st.edited ? "Damping 0.90" : m.set ? m.set.map(([k, v]) => k + " " + v).join("; ") : m.run ? "Default settings" : m.made[0][1], made),
            A.notesSection(0, null, "measure"));
    }

    // ---------- the section ----------
    const STATES = {
        style: { m: "pagerank", tab: "Style" },
        data: { m: "pagerank", tab: "Data" },
        brushed: { m: "pagerank", tab: "Data", brush: [4, 15] },
        "settings-changed": { m: "pagerank", tab: "Data", edited: true },
        // computed on all 77 before "Filter to degree >= 2"; opens on Data, where the values name their set
        "scope-mark": { m: "pagerank", tab: "Data", scope: true },
        "scope-mark-style": { m: "pagerank", tab: "Style", scope: true },
        degree: { m: "degree", tab: "Style" },
        "degree-data": { m: "degree", tab: "Data" },
        covered: { m: "betweenness", tab: "Style" },
        "on-filter": { m: "betweenness-on-filter", tab: "Data" },
        sampled: { m: "sampled", tab: "Data" },
        "risk-score": { m: "risk", tab: "Style" },
        "risk-score-data": { m: "risk", tab: "Data" },
        "edge-measure": { m: "edge", tab: "Style" },
        "edge-measure-data": { m: "edge", tab: "Data" },
        "long-name": { m: "vuln", tab: "Style" },
        "long-name-data": { m: "vuln", tab: "Data" },
        "painted-color": { painted: "Color" },
        "painted-size": { painted: "Size" },
    };

    registerSection({
        id: "inspector-measure-row",
        title: "Inspector: a measure row",
        region: "right",
        rail: "graph",
        frame: (state) =>
            state === "risk-score" || state === "risk-score-data" ? { left: "data-place/attributes" }
                : state === "long-name" || state === "long-name-data" ? { dataset: "wide", left: "graph-place/wide-sized", canvas: "canvas-and-states/hosts-legend" }
                : /^painted-/.test(state) ? seed(state)
                : /^scope-mark/.test(state) ? { left: "graph-place/scope-mark", chip: A.count(A.fx.datasets.lesmis.filterSteps.after.step1, "node", { of: A.fx.datasets.lesmis.nodes }), filterOn: ["degree"] }
                    : state === "degree" || state === "degree-data" ? { left: "graph-place/show-hidden" }
                    : state === "sampled" ? { dataset: "transactions", left: "graph-place/transfers-loaded" }
                        : { left: "graph-place/at-rest" },
        closeTo: "graph-place",
        states: [
            { id: "style", label: "Style: color bound to PageRank" },
            { id: "data", label: "Data: values, top 10, made with" },
            { id: "brushed", label: "Data: histogram brushed" },
            { id: "settings-changed", label: "Data: settings changed (state bar)" },
            { id: "scope-mark", label: "Scope changed by a filter step (Data: values name the 77)" },
            { id: "scope-mark-style", label: "Scope changed by a filter step, Style tab" },
            { id: "degree", label: "Degree: a row hidden from the list" },
            { id: "degree-data", label: "Degree, Data tab (histogram)" },
            { id: "covered", label: "Betweenness covered by PageRank for Color" },
            { id: "on-filter", label: "Betweenness run under a filter that is now off" },
            { id: "sampled", label: "Sampled, weighted run (transfers): rank ranges" },
            { id: "risk-score", label: "Attribute-painted (riskScore)" },
            { id: "risk-score-data", label: "riskScore, Data tab" },
            { id: "edge-measure", label: "Edge measure: color and width" },
            { id: "edge-measure-data", label: "Edge measure, Data tab" },
            { id: "long-name", label: "Long attribute name (hosts)" },
            { id: "long-name-data", label: "Long attribute name, Data tab" },
            { id: "painted-color", label: "Color by an attribute (directly: the hosts by cpu_util_p95_pct)" },
            { id: "painted-size", label: "Size by an attribute (directly: the hosts by cpu_util_p95_pct)" },
        ],
        render(el, state) {
            const st = Object.assign({ id: STATES[state] ? state : "style" }, STATES[state] || STATES.style);
            const L = A.fx.datasets.lesmis, now = L.filterSteps.after.step1;
            const m = st.painted ? painted(st.painted) : MEASURES()[st.m];
            if (st.scope) Object.assign(st, { scopeNote: "on all " + A.num(L.nodes), scopeRow: "All " + A.count(L.nodes, "node") + "; the filter now leaves " + A.num(now), paints: now });
            let stateBar = null;
            if (st.edited) stateBar = { text: "Settings changed", why: "Settings changed since the run: Damping 0.85 to 0.90", actions: [{ label: "Rerun", go: ["graph-place", "running"] }, { label: "Revert", go: ["inspector-measure-row", "data"] }] };
            if (st.scope) stateBar = { text: "Ran on " + A.num(L.nodes) + "; now " + A.num(now), why: "Ran on " + A.count(L.nodes, "node") + "; a filter step now leaves " + A.num(now) + ". It keeps painting.", actions: [{ label: "Rerun on " + A.num(now), onClick: () => A.flash("Reruns PageRank on the " + A.count(now, "node") + " the filter keeps") }] };
            if (m.scopeWhy) stateBar = { text: "Ran on " + A.num(m.has) + "; now " + A.num(m.total), why: m.scopeWhy, actions: [{ label: "Rerun on " + A.num(m.total), onClick: () => A.flash("Reruns Betweenness on all " + A.count(m.total, "node")) }] };
            // The kind slot: the funnel while the values were computed on another set than the graph on screen
            // (spec 3.3: a different scope is not out of date, so no warning mark); an edge measure carries an edge mark
            const funnel = stateBar && (st.scope || m.scopeWhy) ? A.tip(h("span", { class: "ab-status", role: "img" }, icon(A.ICON.filter)), stateBar.why) : null;
            const kindIcon = funnel || (m.edgeMark ? A.tip(h("span", { class: "imr-edge-kind", role: "img" }, icon(m.icon), h("i")), "Edge measure") : m.icon);
            const ramp = (m.bound["node.color"] || m.bound["edge.color"] || {}).ramp;
            el.append(A.inspector({
                icon: kindIcon,
                swatch: m.swatch || (ramp ? A.ramp(ramp[0], ramp[1]) : null),
                title: nameOf(m, 24),
                kind: "Measure",
                provenance: m.provenance,
                menu: ["context-menus", "measure-row"],
                onRename: (n) => A.flash("Renamed to " + n + "; the legend title follows"),
                stateBar,
                changed: !!stateBar && !funnel,
                kindKey: "measure-row",
                tab: st.tab,
                tabs: { Style: () => styleTab(m, st), Data: () => dataTab(m, st) },
            }));
            // the shortened header name still says the whole name to a screen reader
            if (m.long) el.querySelector(".ab-insp-head .k-name").setAttribute("aria-label", m.title);
        },
    });

    // "All options..." under Made with: every option of the run, from the element's schema. Editing
    // one changes the run's settings, which the inspector's state bar then reports.
    registerSection({
        id: "measure-row-options",
        title: "Popover: all options of a metric",
        region: "overlay",
        rail: "graph",
        frame: (state) => (state === "sampled" ? { dataset: "transactions", left: "graph-place/transfers-loaded", right: "inspector-measure-row/sampled" }
            : { left: "graph-place/at-rest", right: "inspector-measure-row/" + (state === "edge" ? "edge-measure-data" : state === "betweenness" ? "on-filter" : "data") }),
        closeTo: "inspector-measure-row/data",
        states: [{ id: "pagerank", label: "PageRank" }, { id: "edge", label: "Edge betweenness" }, { id: "betweenness", label: "Betweenness" }, { id: "sampled", label: "Betweenness, sampled and weighted (transfers)" }],
        render(el, state) {
            const m = MEASURES()[{ edge: "edge", betweenness: "betweenness", sampled: "sampled" }[state] || "pagerank"];
            const body = h("div", null, m.options.map(([k, v]) => {
                const inp = h("input", { class: "k-field", type: "text", value: v, "aria-label": k, spellcheck: "false" });
                inp.addEventListener("change", () => (k === "Damping" ? A.go("inspector-measure-row", "settings-changed") : A.flash(k + " changed")));
                return A.fieldRow(k, inp, { popover: true });
            }));
            const anchor = document.querySelector("#ab-right [data-imr-options]") || document.querySelector("#ab-right .ab-insp-head");
            el.append(A.popover({ anchor, title: m.title + " options", body, width: 320 }));
        },
    });
})();
