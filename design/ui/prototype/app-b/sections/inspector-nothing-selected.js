/* Inspector with nothing selected: the graph itself (structure-b-refined.md version 3, section 5.3).
   Style tab: Canvas (graphty-element configuration, not a layer) and Layout (Method and Seed lines;
   Method's value opens one popover with the method list, its engine, its options and pacing). A
   layout change acts at once and the notice offers Undo (`session.layout.set` is one undoable step).
   Data tab, in the shared vocabulary: Summary and Notes. Summary names the weight chosen at load and
   its meaning as one read-only line linking to the Data page, where it is changed (version 4: the
   weight is a field set when the data is loaded). The header's provenance opens that graph's file
   on the Data page. Notes are graphty-element API: the count is the fixture's (one note about the
   Les Miserables graph, none about the transfers). Readings not computed are one line whose
   link opens the graph's "..." (context-menus/graph) at Compute the overview. A run's readings live
   on its row only. The filtered state bar is the only filtered mark.
   Numbers: kit/fixtures.json (datasets.lesmis, .transactions). The four overview readings (average
   clustering 0.573, transitivity 0.499, diameter 5, degree assortativity -0.165) are not in the
   fixtures; they were computed with networkx 3.1 on les_miserables_graph(), the published graph the
   fixtures cite. Methods, size ratings, engines, engine options and the six pacing fields are
   graphty-element's (catalog/layouts.ts, config/GraphBehavior.ts). Plain ASCII.
   Styles are injected once from this file (the shell's CSS is not ours to edit). */
(function () {
    "use strict";
    const CSS = `
.ins-root .k-data > .k-name { flex: none; white-space: nowrap; }
.ins-root .k-data > .k-value { flex: 1 1 auto; min-width: 0; text-align: right; }
.ins-chk { align-items: center; gap: 8px; }
.ins-chk > .ins-chk-l { flex: 1 1 auto; min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 2px 6px; }
.ins-chk > .k-check { margin: -6px; }
.ins-pop .k-popover-body { padding: 8px 16px 12px; }
.ins-h { padding: 8px 0 4px; color: var(--cm-text-secondary); font-size: 11px; }
.ins-h:first-child { padding-top: 0; }
.ins-m { display: flex; align-items: center; gap: 6px; height: 24px; padding: 0 6px; margin: 0 -6px; border-radius: 5px; cursor: pointer; }
.ins-m:hover, .ins-m:focus-visible { background: var(--cm-bg-hover); }
.ins-m[aria-checked="true"] { background: var(--cm-bg-selected); }
.ins-m .ins-ck { width: 12px; flex: none; }
.ins-m .ins-rec { font-size: 10px; color: var(--cm-text-secondary); padding: 0 4px; border-radius: 4px; box-shadow: inset 0 0 0 1px var(--cm-border); }
.ins-m .k-i { color: var(--cm-icon-secondary); }
.ins-note { color: var(--cm-text-secondary); font-size: 11px; line-height: 1.4; margin: -4px 0 8px; }
.ins-pop .ab-frow { padding: 0; }
.ins-reading { padding: 4px 16px 8px; color: var(--cm-text-secondary); }
`;
    if (!document.getElementById("ins-css")) document.head.append(h("style", { id: "ins-css" }, CSS));

    const SELF = "inspector-nothing-selected";
    const L = () => AB.fx.datasets.lesmis;
    const T = () => AB.fx.datasets.transactions;
    const n = (x) => Number(x).toLocaleString("en-US");
    const isTransfers = (s) => s === "transfers" || s === "transfers-methods";

    // ---------- shared bits ----------
    // A boolean line: the name left, the checkbox right-aligned in the one control column
    function check(name, on, why, needs) {
        const box = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(on), "aria-label": name });
        const flip = () => { const v = box.getAttribute("aria-checked") !== "true"; box.setAttribute("aria-checked", String(v)); AB.announce(name + (v ? " on" : " off")); };
        box.addEventListener("click", flip);
        box.addEventListener("keydown", (e) => e.key === " " && (e.preventDefault(), flip()));
        const label = h("span", { class: "k-name" }, name);
        if (why) AB.tip(label, why, { label: false });
        return h("div", { class: "k-data ins-chk" }, h("span", { class: "ins-chk-l" }, label, needs ? AB.needsElement(needs) : null), box);
    }
    // A number or short text typed in place
    function input(value, name, onCommit) {
        const inp = h("input", { class: "ab-sin k-num", type: "text", inputmode: "decimal", value, "aria-label": name, spellcheck: "false" });
        let last = value;
        const commit = () => { if (inp.value.trim() === last) return; const was = last; last = inp.value.trim(); onCommit && onCommit(last, was, inp); };
        inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") { commit(); inp.blur(); } else if (e.key === "Escape") { inp.value = last; inp.blur(); } });
        inp.addEventListener("change", commit);
        return inp;
    }
    // Every layout change lays out again at once; the notice offers Undo
    const relaid = (what, undo) => AB.notice("Laid out again: " + what, { label: "Undo", onClick: () => { undo && undo(); AB.announce("Layout change undone"); } });
    const bars = (b, label) => [
        h("div", { class: "ab-bars", role: "img", "aria-label": "Degree distribution. " + label }, b.map((x) => h("span", { style: `height:${Math.max(1, (x / Math.max(...b)) * 100)}%` }))),
        h("div", { class: "ab-cap k-secondary" }, "Degree distribution. " + label + "."),
    ];

    // ---------- Style > Canvas ----------
    function canvasSection() {
        const bg = AB.field("Theme default", { go: [SELF, "background"] });
        bg.id = "ins-bg";
        return AB.section({ title: "Canvas", editable: true },
            AB.fieldRow("Background", bg),
            check("Print-safe colors", false, "Reads in gray on white paper: swaps the palette under every color and checks it in grayscale. Adds no rows.", "graphty-element ships no Looks and no grayscale check yet (element issue #331)"),
            check("Hide overlapping labels", false, "Labels that would overlap another are left out until you zoom in"),
            check("Show filtered-out nodes faintly", false, "Off: a filter step removes nodes from the drawing. On: they stay, faint, and take no part in computing or layout."),
            check("Reframe when data changes", true, "Off keeps the camera where it is when the data reloads, so a composed figure stays composed."));
    }

    // ---------- Style > Layout ----------
    // graphty-element's catalog.layouts(), in its order. rating: sizeRating; needs: structuralInputs
    const METHODS = [
        { id: "force", name: "Spread Out", rating: "any", rec: true },
        { id: "force-2d", name: "Spread Out, Flat", rating: 2000, flat: true },
        { id: "circular", name: "Ring", rating: "any" },
        { id: "radial", name: "Rings from a Node", rating: "any", flat: true, needs: "a center node" },
        { id: "grid", name: "Grid", rating: "any", flat: true },
        { id: "shell", name: "Concentric Rings", rating: "any", flat: true, needs: "a grouping" },
        { id: "spiral", name: "Spiral", rating: "any", flat: true },
        { id: "spectral", name: "Natural Grouping", rating: 2000, flat: true },
        { id: "planar", name: "No Crossings", rating: 2000, flat: true },
        { id: "random", name: "Scattered", rating: "any" },
        { id: "hierarchical", name: "Tree", rating: "any", flat: true, needs: "a root node" },
        { id: "bipartite", name: "Two Columns", rating: "any", flat: true, needs: "a grouping" },
        { id: "layers", name: "Columns by Group", rating: "any", flat: true, needs: "a grouping" },
        { id: "fixed", name: "Keep Positions", rating: "any" },
    ];
    // Spread Out's engines (catalog/layouts.ts: ngraph default, then d3, forceAtlas2, spring, kamadaKawai, springElectrical)
    const ENGINES = [["NGraph Force", false], ["D3 Force", false], ["ForceAtlas2", true], ["Spring", false], ["Kamada-Kawai", true], ["Spring Electrical", false]];
    const OPTIONS = [["Spring length", "30"], ["Gravity", "-1.2"], ["Spring coefficient", "0.0008"], ["Theta", "0.8"], ["Drag coefficient", "0.02"], ["Time step", "20"]];
    const PACING = [["Pre-steps", "0"], ["Steps per frame", "1"], ["Stop threshold", "0"], ["Refit interval", "1"], ["Iterations per step", "Engine default", "GPU layouts only"], ["Batches in flight", "2", "GPU layouts only"]];
    let method = "Spread Out", engine = "NGraph Force", seed = "7";

    function layoutSection(popState) {
        const m = AB.field(method, { go: [SELF, popState] });
        m.id = "ins-method";
        const s = input(seed, "Seed", (v, was) => { seed = v; relaid("seed " + v, () => { seed = was; s.value = was; }); });
        return AB.section({ title: "Layout", editable: true }, AB.fieldRow("Method", m), AB.fieldRow("Seed", s));
    }

    function layoutPopover(nodes) {
        const methodField = () => document.querySelector("#ins-method .k-grow");
        const list = h("div", { role: "radiogroup", "aria-label": "Method" });
        const paintList = () => list.replaceChildren(...METHODS.map((x) => {
            const over = x.rating !== "any" && nodes > x.rating;
            const why = [x.rating === "any" ? "Any size" : "Rated for up to " + n(x.rating) + " nodes" + (over ? "; this graph has " + n(nodes) + ". The canvas stops responding while it computes" : ""),
                x.flat ? "flat" : null, x.needs ? "needs " + x.needs : null].filter(Boolean).join(", ");
            const on = x.name === method;
            const r = h("div", { class: "ins-m", role: "radio", tabindex: on ? "0" : "-1", "aria-checked": String(on) },
                h("span", { class: "ins-ck" }, on ? icon("check", "sm") : null),
                h("span", { class: "k-grow k-ellipsis" }, x.name),
                x.rec ? h("span", { class: "ins-rec" }, "Recommended") : null,
                over ? AB.tip(h("span", { role: "img" }, icon("clock", "sm")), "Cost", { second: "Rated for up to " + n(x.rating) + " nodes; the canvas stops responding while it computes" }) : null);
            AB.tip(r, why, { label: false });
            const pick = () => {
                if (x.name === method) return;
                const was = method;
                method = x.name;
                if (methodField()) methodField().textContent = method;
                paintList();
                relaid(method, () => { method = was; if (methodField()) methodField().textContent = was; paintList(); });
            };
            r.addEventListener("click", pick);
            r.addEventListener("keydown", (e) => {
                if (e.key === " " || e.key === "Enter") { e.preventDefault(); pick(); }
                else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const sib = e.key === "ArrowDown" ? r.nextElementSibling : r.previousElementSibling; if (sib) sib.focus(); }
            });
            return r;
        }));
        paintList();
        const eng = AB.field(engine, { caret: true });
        eng.id = "ins-engine";
        const weights = h("div", { class: "ins-note" });
        const paintEng = () => { eng.querySelector(".k-grow").textContent = engine; weights.textContent = ENGINES.find((e) => e[0] === engine)[1] ? "Honors edge weights." : "Ignores edge weights."; };
        eng.setAttribute("role", "button");
        eng.tabIndex = 0;
        const openEng = () => AB.openMenu(eng, ENGINES.map(([e]) => ({ label: e, check: e === engine, onClick: () => { const was = engine; engine = e; paintEng(); relaid(e, () => { engine = was; paintEng(); }); } })));
        eng.addEventListener("click", openEng);
        eng.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openEng()));
        paintEng();
        const num = ([k, v, why]) => {
            const f = input(v, k, (val, was, inp) => relaid(k.toLowerCase() + " " + val, () => { inp.value = was; }));
            const row = AB.fieldRow(k, f, { popover: true });
            if (why) AB.tip(row.firstChild, k, { second: why, label: false });
            return row;
        };
        return AB.popover({
            anchor: "#ins-method", width: 300, title: "Layout",
            body: h("div", null,
                h("div", { class: "ins-h" }, "Method"), list,
                h("div", { class: "ins-h" }), AB.fieldRow("Engine", eng, { popover: true }), weights,
                h("div", { class: "ins-h" }, "Options"), OPTIONS.map(num),
                h("div", { class: "ins-h" }, "Pacing"), PACING.map(num)),
        });
    }

    function backgroundPopover() {
        const detail = h("div");
        const paint = (mode) => detail.replaceChildren(mode === "color"
            ? AB.fieldRow("Color", AB.field("Theme default", { onClick: () => AB.flash("Color picker (not wired in the skeleton)") }), { popover: true })
            : AB.fieldRow("Image", AB.field("None chosen", { caret: true, onClick: () => AB.flash("Choose a 360-degree image (not wired in the skeleton)") }), { popover: true }));
        paint("color");
        return AB.popover({
            anchor: "#ins-bg", width: 260, title: "Background",
            body: h("div", null, AB.fieldRow("Fill", AB.seg([["color", "Color"], ["image", "360 image"]], "color", paint, { label: "Background fill" }), { popover: true }), detail),
        });
    }

    // ---------- Data > Summary ----------
    const READINGS = [["Average clustering", "0.573"], ["Transitivity", "0.499"], ["Diameter", "5"], ["Degree assortativity", "-0.165"]];
    const FILTERED = { nodes: 60, edges: 237, density: 0.1339, averageDegree: 7.9, maxDegree: 31, bars: [6, 100, 12, 88, 24, 59, 24, 18, 6, 6, 0, 6, 0, 0, 0, 6, 0, 0, 0] };
    const notComputed = () => h("div", { class: "k-data" }, AB.link("context-menus", "graph", READINGS.length + " more readings not computed", { class: "ab-link" }));
    const ifNot0 = (name, v) => (Number(v) ? AB.data(name, n(v)) : null);
    function direction(word, where) {
        const r = AB.data("Direction", word);
        AB.tip(r.lastChild, where, { label: false });
        return r;
    }

    function view(state) {
        if (isTransfers(state)) {
            const D = T(), f = D.frame, s = D.stats;
            // With a filter on, the counts agree with the header chip; the readings say what they were computed on
            const chip = AB.route && AB.route.frame.chip;
            const kept = chip && / of /.test(chip) ? chip.split(" of ")[0] : null;
            return {
                title: f.graphRow, provenance: ["from " + f.file, "data-page", "transfers"], notes: 0,
                stateBar: kept ? { text: "Readings are for all " + n(D.nodes) + " nodes", why: "Computed before the filters, which leave " + kept + ". Compute the overview again from the graph's menu." } : null,
                overview: { summary: (kept ? kept + " of " : "") + n(D.nodes) + " nodes, " + n(D.edges) + " edges, directed", body: [
                    AB.data("Nodes", kept ? kept + " of " + n(D.nodes) : n(D.nodes)), AB.data("Edges", n(D.edges)), direction("Directed", "Chosen at load: a CSV does not say"), weight("amount", "transfers"),
                    AB.data("Density", String(s.density)), AB.data(f.componentsName, f.components),
                    ifNot0("Isolated nodes", s.isolated), ifNot0("Self-loops", s.selfLoops), ifNot0("Repeated edges", s.parallelEdges),
                    AB.data("Reciprocity", String(s.reciprocity)), AB.data("Average total degree", String(s.averageDegree)), AB.data("Highest total degree", n(s.maxDegree)),
                    notComputed(), bars(f.degreeBars, f.degreeLabel)] },
            };
        }
        if (state === "door-entries") {
            // The door entries as loaded (One edge per: Pair, the unmatched rows left out): every count
            // from the shell's fixture; no reading is computed yet, so none is shown
            const D = AB.fx.datasets.doorEntries, R = D.report, [people, buildings] = D.tables, pair = D.loaded.per === "pair";
            const lt = D.loadedTypes(), nodes = lt.person + lt.building, plus = (k) => n(lt[k]) + (lt.added[k] ? " (" + n(D.tables[k === "person" ? 0 : 1].rows) + " + " + lt.added[k] + " added)" : "");
            return {
                title: D.graphName, provenance: ["from " + D.tables.length + " tables", "data-page", "entries-pair"], notes: 0,
                overview: { summary: n(nodes) + " nodes, " + n(D.loadedEdges()) + " edges, directed", body: [
                    AB.data("Nodes", n(nodes)), AB.data("person", plus("person")), AB.data("building", plus("building")), AB.data("Edges", n(D.loadedEdges())),
                    direction("Directed", "Chosen at load: a CSV does not say"), pair ? weight("count", "entries-pair") : AB.data("Weight", AB.link("data-page", "entries", "None (each edge counts 1)", { class: "ab-link" })), nodeWeight("floors", "building"),
                    AB.data("Isolated nodes", n(R.people.noEntries)),
                    h("div", { class: "k-data" }, AB.link("context-menus", "graph", "Readings not computed", { class: "ab-link" }))] },
            };
        }
        const D = L(), f = D.frame, s = D.stats;
        if (state === "reading") return { title: f.graphRow, provenance: ["from " + f.file, "data-page", "graph-file"], notes: 1, overview: { summary: "Reading...", body: h("div", { class: "ins-reading", role: "status" }, "Reading...") } };
        const filtered = state === "filtered";
        const computed = state === "computed" || filtered;
        const g = filtered ? FILTERED : { nodes: D.nodes, edges: D.edges, density: s.density, averageDegree: s.averageDegree, maxDegree: s.maxDegree, bars: f.degreeBars };
        return {
            title: f.graphRow, provenance: ["from " + f.file, "data-page", "graph-file"], notes: 1,
            stateBar: filtered ? { text: "Readings are for all " + D.nodes + " nodes", why: "Computed before the filter: " + D.filterSteps.steps[0] + " leaves " + FILTERED.nodes + " nodes. Compute the overview again from the graph's menu." } : null,
            overview: { summary: n(g.nodes) + " nodes, " + n(g.edges) + " edges, undirected", body: [
                AB.data("Nodes", n(g.nodes)), AB.data("Edges", n(g.edges)), direction("Undirected", "Read from " + f.file), weight("value", "graph-file"),
                AB.data("Density", String(g.density)), AB.data(f.componentsName, filtered ? "1" : f.components),
                ifNot0("Isolated nodes", s.isolated), ifNot0("Self-loops", s.selfLoops),
                AB.data("Average degree", String(g.averageDegree)), AB.data("Highest degree", String(g.maxDegree)),
                computed ? READINGS.map(([k, v]) => AB.data(k, v)) : notComputed(),
                bars(g.bars, filtered ? "Degree 1 to 31, in bars of 2" : f.degreeLabel)] },
        };
    }

    // The node weight chosen at load, read-only here, beside the edge weight wherever that shows
    function nodeWeight(column, type) {
        const r = AB.data("Node weight", AB.link("data-page", "buildings", column + " (" + type + ")", { class: "ab-link" }));
        AB.tip(r.lastChild, "Set when the data was loaded: each " + type + " weighs its " + column + "; a type with no weight column weighs 1. Change it on the Data page.", { label: false });
        return r;
    }
    // The weight chosen at load, read-only here: the Data page is its one home (higher weight means Stronger on both fixtures)
    function weight(column, dataState) {
        const r = AB.data("Weight", AB.link("data-page", dataState, column + ", stronger", { class: "ab-link" }));
        AB.tip(r.lastChild, "Set when the data was loaded: a higher " + column + " means a stronger tie. Every run uses it unless it picks another. Change it on the Data page.", { label: false });
        return r;
    }

    const TRANSFERS_FRAME = { dataset: "transactions", left: "graph-place/many-groups" };
    const POP = { "layout-method": "layout-method", "transfers-methods": "transfers-methods", background: "background" };
    registerSection({
        id: SELF,
        title: "Inspector: nothing selected",
        region: "right",
        rail: "graph",
        frame: (state) => {
            const fr = isTransfers(state) ? Object.assign({}, TRANSFERS_FRAME) : state === "door-entries" ? { dataset: "doorEntries", left: "graph-place/door-entries" } : state === "filtered" ? { chip: "Filtered: 60 of 77 nodes" }
                : state === "reading" ? { left: "graph-place/empty", canvas: "canvas-and-states/loading" } : {};
            if (POP[state]) fr.overlay = SELF + "/" + state;
            return fr;
        },
        states: [
            { id: "overview", label: "After load, Data tab (4 readings not computed)" },
            { id: "computed", label: "Summary computed" },
            { id: "filtered", label: "Filtered graph: readings for all 77 nodes" },
            { id: "canvas", label: "Style tab: Canvas and Layout" },
            { id: "layout-method", label: "Layout popover (method, engine, options, pacing)" },
            { id: "background", label: "Background popover" },
            { id: "transfers", label: "Transfers (directed, 3,000 nodes)" },
            { id: "transfers-methods", label: "Layout popover, transfers (three methods carry the cost mark)" },
            { id: "reading", label: "While loading: Reading..." },
            { id: "door-entries", label: "Door entries (three tables joined)" },
        ],
        render(el, state, ctx) {
            if (ctx.region === "overlay") {
                const p = state === "background" ? backgroundPopover() : layoutPopover(state === "transfers-methods" ? T().nodes : L().nodes);
                p.classList.add("ins-pop");
                el.append(p);
                return;
            }
            const v = view(state);
            const styleTab = ["canvas", "layout-method", "background", "transfers-methods"].includes(state);
            const popState = isTransfers(state) ? "transfers-methods" : "layout-method";
            const insp = AB.inspector({
                icon: "network", title: v.title, kind: "Graph", kindKey: "graph", tab: styleTab ? "Style" : "Data",
                provenance: v.provenance, menu: ["context-menus", "graph"], stateBar: v.stateBar,
                tabs: {
                    Style: () => [canvasSection(), layoutSection(popState)],
                    Data: () => AB.dataTab({ Summary: v.overview, Notes: { count: v.notes, target: ["notes-place", "about-graph"] } }, { kind: "graph" }),
                },
            });
            insp.classList.add("ins-root");
            el.append(insp);
        },
    });
})();
