/* Inspector: a measure row (version 3). One frame, two tabs.
   Style: the shared Style tab with the painting property bound to the result. The bound line shows
   what the reader needs (the ramp and "Orange to brown"; a range for a size or width); clicking it
   opens the one Binding popover (style-pickers/binding). There is no binding block and no unbind
   dialog here: Detach and everything else about the binding live in that popover.
   Data: Values (the histogram, drag to select, and one caption), Top 10 (the first 5; "Show in
   table" is in "..."), Made with (settings that differ from the default, "All options...", then
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
   "None: no weight loaded" (Les Miserables loads no weight). */
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
.imr-rank { width: 16px; text-align: end; color: var(--cm-text-secondary); font-variant-numeric: tabular-nums; flex: none; }
.imr-edited .k-value .k-field { color: var(--cm-text-brand); }
`;
        document.head.append(s);
    }

    const RAMP = ["#ef7818", "#662506"]; // graphty-element's "Orange to brown" (ylorbr), its ends

    // ---------- the measures ----------
    const MEASURES = {
        pagerank: {
            title: "PageRank", over: "node", unit: "nodes", total: 77, run: true, icon: "chart-column",
            fmt: (v) => v.toFixed(4),
            provenance: ["from Analyze", "analyze-popover", "open"],
            bound: { "node.color": { field: "PageRank", palette: "Orange to brown", ramp: RAMP } },
            order: "Covers Louvain for Color",
            caption: "77 of 77 have a value, 0.0033 to 0.0754, median 0.0124",
            hist: { from: 0, width: 0.005, bins: [9, 24, 19, 16, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 1] },
            top: [["Valjean", 0.0754], ["Myriel", 0.0428], ["Gavroche", 0.0358], ["Marius", 0.0309], ["Javert", 0.0303]],
            binNames: { 4: ["Enjolras", "Cosette"], 5: ["Fantine", "Thenardier"], 6: ["Marius", "Javert"], 7: ["Gavroche"], 8: ["Myriel"], 15: ["Valjean"] },
            options: [["Damping", "0.85"], ["Iterations", "Up to 100"], ["Weight", "None: no weight loaded"]],
            ran: "Sep 28, on the CPU",
            writes: "pagerank",
        },
        edge: {
            title: "Edge betweenness", over: "edge", unit: "edges", total: 254, run: true, icon: "chart-column",
            fmt: (v) => v.toFixed(4),
            provenance: ["from Analyze", "analyze-popover", "open"],
            bound: { "edge.color": { field: "Edge betweenness", palette: "Orange to brown", ramp: RAMP }, "edge.width": { field: "Edge betweenness", range: "0.5 to 6" } },
            caption: "254 of 254 have a value, 0.0003 to 0.1832, median 0.0058",
            hist: { from: 0, width: 0.01, bins: [170, 40, 33, 3, 4, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
            top: [["Myriel - Valjean", 0.1832], ["Valjean - Gavroche", 0.083], ["Valjean - Fantine", 0.0762], ["Mme.Burgon - Gavroche", 0.0513], ["Valjean - Mlle.Gillenormand", 0.045]],
            binNames: { 5: ["Mme.Burgon - Gavroche"], 7: ["Valjean - Fantine"], 8: ["Valjean - Gavroche"], 18: ["Myriel - Valjean"] },
            options: [["Weight", "None: no weight loaded"], ["Normalized", "Yes, 0 to 1"], ["Sample", "Every node (exact)"]],
            ran: "Sep 28, on the CPU",
            writes: "edge betweenness (on edges)",
        },
        // Degree: Size bound to the overview's degree, on a row hidden from the list that still paints
        degree: {
            title: "Degree", over: "node", unit: "nodes", total: 77, run: false, icon: "hash",
            fmt: (v) => String(Math.round(v)),
            provenance: ["from the graph overview", "inspector-nothing-selected", "overview"],
            bound: { "node.size": { field: "Degree", range: "0.5 to 3" } },
            caption: "77 of 77 have a value, 1 to 36, median 6",
            hist: { from: 0, width: 3, bins: [27, 9, 16, 14, 4, 4, 1, 1, 0, 0, 0, 1] },
            top: [["Valjean", 36], ["Gavroche", 22], ["Marius", 19], ["Javert", 17], ["Thenardier", 16]],
            binNames: { 11: ["Valjean"], 7: ["Gavroche"], 6: ["Marius"] },
            made: [["Created from", "The graph overview (degree)"]],
            writes: "degree",
        },
        risk: {
            title: "riskScore", over: "node", unit: "accounts", total: 3000, run: false, icon: "hash",
            fmt: (v) => String(v),
            provenance: ["from accounts-2026-03.csv", "data-place", "attributes"],
            bound: { "node.color": { field: "riskScore", palette: "Orange to brown", ramp: RAMP } },
            caption: "3,000 of 3,000 have a value, 0 to 98; none score 80 to 87",
            bands: [{ from: 0, to: 19, count: 1929 }, { from: 20, to: 69, count: 928 }, { from: 70, to: 79, count: 129 }, { from: 80, to: 87, count: 0 }, { from: 88, to: 98, count: 14 }],
            top: [["ACC-233575", 98], ["ACC-782213", 97], ["ACC-577269", 97], ["ACC-642959", 96], ["ACC-753261", 95]],
            made: [["Joined on", "account id"], ["Computed by", "The bank, not graphty"], ["Scale", "0 to 100"]],
            writes: "riskScore",
        },
        // The hosts' longest attribute name, painting Size: the row graph-place/wide-sized adds (lib.js STYLED). Counts from kit/wide-nested.json
        vuln: {
            title: "vuln_count_critical_unremediated_over_30_days", long: true, over: "node", unit: "hosts", total: 300, run: false, icon: "hash",
            fmt: (v) => String(v),
            provenance: ["from hosts-2026-03.csv", "data-place", "attributes-wide"],
            bound: { "node.size": { field: "vuln_count_critical_unremediated_over_30_days", range: "0.5 to 3" } },
            caption: "300 of 300 have a value, 0 to 6, median 0",
            bands: [273, 8, 3, 7, 5, 1, 3].map((count, i) => ({ from: i, to: i, count })),
            binNames: { 5: ["batch-staging-sgp-01"], 6: ["app-dev-sgp-01", "queue-prod-iad-03", "monitor-prod-iad-03"] },
            top: [["app-dev-sgp-01", 6], ["queue-prod-iad-03", 6], ["monitor-prod-iad-03", 6], ["batch-staging-sgp-01", 5], ["app-dev-fra-01", 4]],
            made: [["Source", "hosts-2026-03.csv"], ["Type", "Whole number, 0 to 6"]],
            writes: "vuln_count_critical_unremediated_over_30_days",
        },
    };
    const tableOf = (m) => (m.over === "edge" ? "edges" : m.unit === "accounts" ? "transfers" : m.unit === "hosts" ? "wide" : "nodes");
    // An attribute name takes the middle ellipsis (spec 2.5); prose keeps the end ellipsis
    const nameOf = (m, max) => (m.long ? A.truncMiddle(m.title, max) : m.title);

    // ---------- Style tab ----------
    function styleTab(m, st) {
        const tab = A.styleTab({ kinds: [m.over], kind: m.over, set: {}, bound: m.bound });
        // A bound value opens the one Binding popover, in this row's form (diverging or not). A label
        // line is not a binding: it keeps its own Label popover, so only channel lines are redirected.
        const target = ["style-pickers", st.diverging ? "binding-diverging" : "binding"];
        const BOUND = ".ab-sline:not([data-label]) .ab-bound";
        const open = (e) => {
            const b = e.target.closest && e.target.closest(BOUND);
            if (!b || (e.type === "keydown" && e.key !== "Enter" && e.key !== " ")) return;
            e.stopPropagation();
            e.preventDefault();
            A.go(target[0], target[1]);
        };
        tab.addEventListener("click", open, true);
        tab.addEventListener("keydown", open, true);
        const mark = () => tab.querySelectorAll(BOUND).forEach((b) => { b.dataset.nav = A.href(target[0], target[1]); b.setAttribute("aria-haspopup", "dialog"); });
        new MutationObserver(mark).observe(tab, { childList: true, subtree: true });
        mark();
        return h("div", null,
            A.paintsLine("Paints " + m.total.toLocaleString("en-US") + " " + m.unit, ["table-dock", tableOf(m)]),
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
            axis = h("div", { class: "imr-axis" }, h("span", null, "0"), h("span", null, m.fmt(H.from + H.bins.length * H.width)));
        }
        A.tip(bars, "Drag across bars to select those " + m.unit, { label: false });
        const counts = m.bands ? m.bands.map((b) => b.count) : m.hist.bins;
        const lo = (i) => (m.bands ? String(m.bands[i].from) : m.fmt(m.hist.from + i * m.hist.width));
        const hi = (i) => (m.bands ? String(m.bands[i].to) : m.fmt(m.hist.from + (i + 1) * m.hist.width));
        const clear = () => { [...bars.children].forEach((x) => x.removeAttribute("data-on")); summary.replaceChildren(); A.announce("Selection cleared"); };
        const setRange = (a, b) => {
            const [s, e] = a <= b ? [a, b] : [b, a];
            [...bars.children].forEach((x, i) => x.toggleAttribute("data-on", i >= s && i <= e));
            const n = counts.slice(s, e + 1).reduce((p, q) => p + q, 0);
            const names = m.binNames ? Object.entries(m.binNames).filter(([k]) => +k >= s && +k <= e).flatMap(([, v]) => v) : [];
            const unit = n === 1 ? m.unit.replace(/s$/, "") : m.unit;
            const what = names.length && names.length === n && n <= 6 ? ": " + names.join(", ") : "";
            summary.replaceChildren(h("div", { class: "imr-brushed", role: "status" },
                h("span", { class: "k-grow" }, A.link("table-dock", tableOf(m), n.toLocaleString("en-US") + " " + unit), " selected, " + lo(s) + " to " + hi(e) + what),
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
        box.append(bars, axis, h("div", { class: "imr-cap" }, m.caption), summary);
        if (brush) setRange(brush[0], brush[1]);
        return box;
    }
    if (!A.histogram) A.histogram = histogram;

    // ---------- Data tab ----------
    function dataTab(m, st) {
        const topRow = ([name, v], i) =>
            h("div", Object.assign({ class: "k-row" }, name === "Valjean" ? A.act({ go: ["inspector-node", "why-this-look"] }) : A.act({ onClick: () => A.flash("Selects " + name) })),
                h("span", { class: "imr-rank" }, String(i + 1)), h("span", { class: "k-grow k-ellipsis" }, name), h("span", { class: "k-secondary k-num" }, m.fmt(v)));
        const made = [];
        if (m.run) {
            // settings that differ from the default, as editable fields; the rest behind All options
            if (st.edited) made.push(h("div", { class: "k-data imr-edited" }, h("span", { class: "k-name" }, "Damping"),
                h("span", { class: "k-value" }, A.field("0.90", { go: ["measure-row-options", "pagerank"] }))));
            made.push(h("div", { class: "k-data" }, h("span", { class: "k-name" }, st.edited ? "" : "Settings"),
                h("span", { class: "k-value" }, st.edited ? null : h("span", { class: "k-secondary" }, "Defaults "),
                    A.link("measure-row-options", m.over === "edge" ? "edge" : "pagerank", "All options...", { "data-imr-options": "" }))));
        }
        (m.made || []).forEach(([k, v]) => made.push(A.data(k, v)));
        if (st.scope) made.push(A.data("Scope", "77 nodes; the filter now leaves 60"));
        if (m.ran) made.push(A.data("Ran", m.ran));
        made.push(A.data("Writes", m.long ? A.truncMiddle(m.writes, 20) : m.writes, { go: m.long ? ["data-place", "attributes-wide"] : ["data-place", "attributes"] }));
        // Spec order: Values, Top 10, Made with, Notes (AB.dataTab would sort Top 10 after Made with)
        const sec = (title, summary, body) => A.section({ title, collapsible: true, key: "data.measure." + title.toLowerCase().replace(/\s+/g, "-"), summary }, body);
        return h("div", null,
            sec("Values", m.caption, histogram(m, st.brush)),
            sec("Top 10", m.top.slice(0, 3).map((t) => t[0]).join(", ") + "...", m.top.map(topRow)),
            sec("Made with", st.edited ? "Damping 0.90" : m.run ? "Default settings" : m.made[0][1], made),
            A.notesSection(0, null, "measure"));
    }

    // ---------- the section ----------
    const STATES = {
        style: { m: "pagerank", tab: "Style" },
        data: { m: "pagerank", tab: "Data" },
        brushed: { m: "pagerank", tab: "Data", brush: [4, 15] },
        "settings-changed": { m: "pagerank", tab: "Data", edited: true },
        "scope-mark": { m: "pagerank", tab: "Style", scope: true },
        degree: { m: "degree", tab: "Style" },
        "risk-score": { m: "risk", tab: "Style" },
        "risk-score-data": { m: "risk", tab: "Data" },
        "edge-measure": { m: "edge", tab: "Style" },
        "edge-measure-data": { m: "edge", tab: "Data" },
        "long-name": { m: "vuln", tab: "Style" },
        "long-name-data": { m: "vuln", tab: "Data" },
    };

    registerSection({
        id: "inspector-measure-row",
        title: "Inspector: a measure row",
        region: "right",
        rail: "graph",
        frame: (state) =>
            state === "risk-score" || state === "risk-score-data" ? { left: "data-place/attributes" }
                : state === "long-name" || state === "long-name-data" ? { dataset: "wide", left: "graph-place/wide-sized", canvas: "canvas-and-states/hosts-legend" }
                : state === "scope-mark" ? { left: "graph-place/scope-mark", chip: "Filtered: 60 of 77 nodes" }
                    : state === "degree" ? { left: "graph-place/show-hidden" }
                        : { left: "graph-place/at-rest" },
        closeTo: "graph-place",
        states: [
            { id: "style", label: "Style: color bound to PageRank" },
            { id: "data", label: "Data: values, top 10, made with" },
            { id: "brushed", label: "Data: histogram brushed" },
            { id: "settings-changed", label: "Data: settings changed (state bar)" },
            { id: "scope-mark", label: "Scope changed by a filter step" },
            { id: "degree", label: "Degree: a row hidden from the list" },
            { id: "risk-score", label: "Attribute-painted (riskScore)" },
            { id: "risk-score-data", label: "riskScore, Data tab" },
            { id: "edge-measure", label: "Edge measure: color and width" },
            { id: "edge-measure-data", label: "Edge measure, Data tab" },
            { id: "long-name", label: "Long attribute name (hosts)" },
            { id: "long-name-data", label: "Long attribute name, Data tab" },
        ],
        render(el, state) {
            const st = STATES[state] || STATES.style;
            const m = MEASURES[st.m];
            let stateBar = null;
            if (st.edited) stateBar = { text: "Settings changed", why: "Settings changed since the run: Damping 0.85 to 0.90", actions: [{ label: "Rerun", go: ["graph-place", "running"] }, { label: "Revert", go: ["inspector-measure-row", "data"] }] };
            if (st.scope) stateBar = { text: "Ran on 77; now 60", why: "Ran on 77 nodes; a filter step now leaves 60", actions: [{ label: "Rerun on 60", onClick: () => A.flash("Reruns PageRank on the 60 nodes the filter keeps") }] };
            el.append(A.inspector({
                icon: m.icon,
                swatch: m.bound["node.color"] || m.bound["edge.color"] ? A.ramp(RAMP[0], RAMP[1]) : null,
                title: nameOf(m, 24),
                kind: "Measure",
                provenance: m.provenance,
                menu: ["context-menus", "measure-row"],
                onRename: (n) => A.flash("Renamed to " + n + "; the legend title follows"),
                stateBar,
                changed: !!stateBar,
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
        frame: (state) => ({ left: "graph-place/at-rest", right: "inspector-measure-row/" + (state === "edge" ? "edge-measure-data" : "data") }),
        closeTo: "inspector-measure-row/data",
        states: [{ id: "pagerank", label: "PageRank" }, { id: "edge", label: "Edge betweenness" }],
        render(el, state) {
            const m = MEASURES[state === "edge" ? "edge" : "pagerank"];
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
