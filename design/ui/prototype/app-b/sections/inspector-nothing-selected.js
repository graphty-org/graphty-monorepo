/* Inspector with nothing selected: the graph itself (structure-b-refined.md 5.3). The same frame
   as every other kind: a Style tab (Canvas, Layout: how the graph is drawn and arranged) and a
   Data tab (Overview, Statistics, Made with, Notes). No button at rest: "Compute the overview" is
   in "...", which is the empty canvas's right-click menu (context-menus/canvas), and in Quick
   actions. The state bar appears only when the filter scope changed under computed readings.
   Numbers: kit/fixtures.json (datasets.lesmis, .transactions, .transactionsApril, .citations).
   The four overview readings (average clustering 0.573, transitivity 0.499, diameter 5, degree
   assortativity -0.165) are not in the fixtures; they were computed with networkx 3.1 on
   les_miserables_graph(), the published graph the fixtures cite (77 nodes, 254 edges, no
   self-loops; a simple graph, so no repeated edges). The Louvain reading (modularity 0.565, 6
   communities) is graph-place.js's run. Layout methods, size ratings, the recommendation rule,
   engine options and the six pacing fields are graphty-element's (catalog/layouts.ts,
   session/layout.ts, config/GraphBehavior.ts). Plain ASCII.
   Styles are injected once from this file (the shell's CSS is not ours to edit). */
(function () {
    "use strict";
    const CSS = `
.ins-oq { display: block; width: fit-content; padding: 2px 6px; line-height: 1.4; margin: 0 16px 8px; border-radius: 5px; font-size: 10px; color: var(--cm-text-secondary); box-shadow: inset 0 0 0 1px var(--cm-border); white-space: normal; }
.ins-scope { display: flex; align-items: center; gap: 6px; margin: 0 16px 8px; padding: 6px 8px; border-radius: 5px; background: var(--cm-bg-secondary); color: var(--cm-text-secondary); cursor: pointer; }
.ins-scope .k-i { flex: none; color: var(--cm-icon-secondary); }
.ins-mark { display: block; color: var(--cm-text-tertiary); font-size: 11px; }
.ins-muted .k-value { color: var(--cm-text-tertiary); }
.ins-sub { padding: 6px 16px 2px; color: var(--cm-text-secondary); font-size: 11px; }
.ins-root .k-data > .k-name { flex: none; white-space: nowrap; }
.ins-root .k-data > .k-value { flex: 1 1 auto; min-width: 0; text-align: right; overflow-wrap: anywhere; white-space: normal; overflow: visible; }
.ins-root .k-data > .k-field, .ins-root .k-data > .ins-ctl { margin-inline-start: auto; }
.ins-root .k-data > .k-field { max-width: 60%; }
.ins-ctl { display: inline-flex; align-items: center; gap: 4px; }
.ins-cap { padding: 0 16px 8px; color: var(--cm-text-secondary); font-size: 11px; line-height: 1.4; }
.ins-cap .ab-needs { white-space: normal; }
.ins-more { padding: 2px 16px 6px; font-size: 11px; }
.ins-confirm { display: grid; gap: 8px; line-height: 1.4; }
.ins-confirm .ab-needs { white-space: normal; }
.ins-methods { max-width: 300px; max-height: calc(100vh - 16px); overflow-y: auto; }
.ins-methods .k-menu-desc { white-space: normal; }
`;
    if (!document.getElementById("ins-css")) document.head.append(h("style", { id: "ins-css" }, CSS));

    const SELF = "inspector-nothing-selected";
    const L = () => AB.fx.datasets.lesmis;
    const T = () => AB.fx.datasets.transactions;
    const n = (x) => Number(x).toLocaleString("en-US");
    const oq = (text) => h("div", { class: "ins-oq", title: text }, "Open question: " + text);
    const cap = (...kids) => h("div", { class: "ins-cap" }, kids);
    const dataMark = (name, value, m, o) => {
        const r = AB.data(name, value, o);
        if (m) r.title = name + ": " + value + ", " + m;
        return r;
    };
    // A reading not yet computed: its tooltip names the doors (a body holds no verbs)
    const muted = (name) => Object.assign(h("div", { class: "ins-muted" }, AB.data(name, "Not computed")), { title: "Compute from the graph's ... menu > Compute the overview, or Quick actions (Ctrl+K)" });
    // A property row whose value is an editable control (a field, a switch, a segmented choice)
    const prop = (name, ctl) => h("div", { class: "k-data" }, h("span", { class: "k-name" }, name), ctl);
    const edit = (value, what, o) => {
        const f = AB.field(value, Object.assign({ onClick: () => AB.flash("Edit " + what + " (not wired in the skeleton)") }, o || {}));
        if (o && o.title) f.title = o.title;
        return f;
    };
    const bars = (b, label) => {
        const max = Math.max(...b);
        return [
            h("div", { class: "ab-bars", title: label }, b.map((x) => h("span", { style: `height:${Math.max(1, (x / max) * 100)}%` }))),
            h("div", { class: "ab-cap k-secondary" }, "Degree distribution. " + label + "."),
        ];
    };
    // A switch that flips in place
    function sw(on, label) {
        const s = h("span", { class: "k-switch", role: "switch", tabindex: "0", "aria-checked": String(on), "aria-label": label });
        const flip = () => { const v = s.getAttribute("aria-checked") !== "true"; s.setAttribute("aria-checked", String(v)); AB.announce(label + (v ? " on" : " off")); };
        s.addEventListener("click", flip);
        s.addEventListener("keydown", (e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), flip()));
        return s;
    }

    // Sections: collapsible, remembered per key; `force` (the canvas state) opens one and closes the rest
    let force = null;
    const sec = (title, o, ...kids) => AB.section(Object.assign({ title, collapsible: true, key: "graph." + title.toLowerCase() },
        force ? { collapsed: force !== title, remember: false } : {}, o || {}), ...kids);

    // The overview recipe: a property of the graph, so a field, not a button
    function recipeRow() {
        const f = AB.field("General", { caret: true, icon: "book-open", go: [SELF, "change-overview"] });
        f.id = "ins-overview-change";
        const r = prop("Overview recipe", f);
        r.title = "Runs when the project opens. Adds no rows and colors nothing.";
        return r;
    }

    // ---------- Layout ----------
    // graphty-element's catalog.layouts(), in its order. rating: sizeRating; needs: structuralInputs
    const METHODS = [
        { id: "force", name: "Spread Out", rating: "any" },
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
    function methodsMenu(nodes, blocksTo) {
        const desc = (m) => [
            m.rating === "any" ? "Any size" : "Up to " + n(m.rating) + " nodes" + (nodes > m.rating ? ", this graph has " + n(nodes) : ""),
            m.flat ? "flat" : null,
            m.needs ? "needs " + m.needs : null,
        ].filter(Boolean).join(", ");
        const item = (m) => ({
            label: m.name, check: m.id === "force", desc: desc(m),
            // ponytail: only Natural Grouping is wired to the confirmation; the other over-rated methods flash
            go: blocksTo && m.id === "spectral" && nodes > m.rating ? blocksTo : null,
            onClick: () => AB.flash("Lays the graph out again at once with " + m.name + " (not wired in the skeleton)"),
        });
        return [
            { heading: "Recommended for this graph" },
            Object.assign(item(METHODS[0]), { desc: "Any size. Pulls connected nodes together. Ignores weights unless the engine is ForceAtlas2 or Kamada-Kawai" }),
            { sep: true },
            { heading: "Every method" },
            ...METHODS.slice(1).map(item),
        ].map((it) => (it.go ? Object.assign(it, { onClick: null }) : it));
    }

    function layoutSection(o) {
        // o: { nodes, methodsState, scope, scopeGo }
        const method = AB.field("Spread Out", { caret: true, go: [SELF, o.methodsState] });
        method.id = "ins-method";
        const seedField = edit("7", "the seed (Reshuffle is in the graph's ... menu)");
        const more = h("div", { hidden: true },
            prop("Spring coefficient", edit("0.0008", "Spring coefficient")),
            prop("Theta", edit("0.8", "Theta")),
            prop("Drag coefficient", edit("0.02", "Drag coefficient")),
            prop("Time step", edit("20", "Time step")));
        const moreLink = h("a", { class: "ab-link", role: "button", tabindex: "0" }, "4 more engine options");
        moreLink.addEventListener("click", () => { more.hidden = !more.hidden; moreLink.textContent = more.hidden ? "4 more engine options" : "Fewer engine options"; });
        const advanced = AB.section({ title: "Advanced", collapsible: true, collapsed: true, key: "graph.layout.advanced", summary: "Pacing: graphty-element's defaults" },
            prop("Pre-steps", edit("0", "Pre-steps")),
            prop("Steps per frame", edit("1", "Steps per frame")),
            prop("Stop threshold", edit("0", "Stop threshold")),
            prop("Refit interval", edit("1", "Refit interval")),
            prop("Iterations per step", edit("Engine default", "Iterations per step", { title: "GPU layouts only (ForceAtlas2, Spring, Spring Electrical on an accelerator)" })),
            prop("Batches in flight", edit("2", "Batches in flight", { title: "GPU layouts only" })));
        return sec("Layout", { summary: "Spread Out, " + o.scope + ", seed 7" },
            prop("Method", method),
            prop("Engine", edit("NGraph Force", "Engine", { caret: true })),
            h("div", { class: "ins-sub" }, "Options"),
            prop("Spring length", edit("30", "Spring length")),
            prop("Gravity", edit("-1.2", "Gravity")),
            h("div", { class: "ins-more" }, moreLink), more,
            AB.data("Scope", o.scope, { go: o.scopeGo }),
            prop("Seed", seedField),
            AB.data("Pinned nodes", "None"),
            cap(AB.needsElement("Changing any of these lays the graph out again at once. Saving and restoring positions as a document is needed; until graphty-element has it, a layout change cannot be undone.")),
            advanced);
    }

    // ---------- Canvas: graphty-element settings, not a layer ----------
    function canvasSection() {
        let mode = "color";
        const detail = h("div");
        const paint = () => detail.replaceChildren(mode === "color"
            ? prop("Color", AB.field("Theme default", { icon: null, caret: true, onClick: () => AB.flash("Background color picker (not wired in the skeleton)") }))
            : prop("Image", AB.field("None chosen", { caret: true, onClick: () => AB.flash("Choose a 360-degree image (not wired in the skeleton)") })));
        const seg = h("span", { class: "k-seg", role: "radiogroup", "aria-label": "Background" });
        [["color", "Color"], ["image", "360 image"]].forEach(([id, label]) => {
            const b = h("button", { type: "button", role: "radio", "aria-checked": String(id === mode) }, label);
            b.addEventListener("click", () => { mode = id; seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", String(x === b))); paint(); });
            seg.append(b);
        });
        paint();
        const look = h("span", { class: "k-seg", role: "radiogroup", "aria-label": "Look" });
        ["Default", "Print"].forEach((label, i) => {
            const b = h("button", { type: "button", role: "radio", "aria-checked": String(!i), title: i ? "Reads in gray on white paper: swaps the palette under every color, with a grayscale check. Adds no rows." : "The palettes each row chose" }, label);
            b.addEventListener("click", () => look.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", String(x === b))));
            look.append(b);
        });
        const lookRow = [prop("Look", look), cap(AB.needsElement("graphty-element ships no Looks and no grayscale check yet (element issue #331). The Look belongs to the project; a saved view keeps it."))];
        const faintRow = prop("Filtered-out nodes faintly", sw(false, "Draw filtered-out nodes faintly"));
        const faint = [faintRow]; // graphty-element: session.visibility.showContext (get and set)
        faintRow.title = "Off: a filter step removes nodes from the drawing. On: they stay, faint, and take no part in computing or layout.";
        const reframe = prop("Reframe when data changes", sw(true, "Reframe when data changes"));
        reframe.title = "Off keeps the camera where it is when the data reloads, so a composed figure stays composed.";
        const s = sec("Canvas", { summary: "Default look, theme background, overlapping labels shown" },
            lookRow,
            prop("Background", seg), detail,
            prop("Hide overlapping labels", sw(false, "Hide overlapping labels")),
            faint, reframe);
        s.title = "Settings of the canvas, not a layer: they are not in the paint order and a style file does not carry them.";
        return s;
    }

    // ---------- Les Miserables: after load, computed, filtered ----------
    const READINGS = [["Average clustering", "0.573"], ["Transitivity", "0.499"], ["Diameter", "5"], ["Degree assortativity", "-0.165"]];
    const FILTERED = { edges: 237, density: 0.1339, averageDegree: 7.9, maxDegree: 31, bars: [6, 100, 12, 88, 24, 59, 24, 18, 6, 6, 0, 6, 0, 0, 0, 6, 0, 0, 0] };

    function lesmis(state) {
        const D = L(), f = D.frame, s = D.stats;
        const filtered = state === "filtered";
        const computed = state === "computed" || filtered; // filtered: the overview was computed before the step
        const stale = filtered ? "on 77 nodes; now 60" : null;
        const nodes = filtered ? D.filterSteps.after.step1 : D.nodes;

        const overview = sec("Overview", { summary: n(nodes) + " nodes, " + n(filtered ? FILTERED.edges : D.edges) + " edges, undirected" },
            filtered ? AB.nav(h("div", { class: "ins-scope", role: "link" }, icon("list-filter", "sm"), h("span", { class: "k-grow" }, "Over the filtered graph: " + nodes + " of " + D.nodes + " nodes. " + D.filterSteps.steps[0] + ".")), "data-place", "filters") : null,
            AB.data("Nodes", n(nodes)),
            AB.data("Edges", n(filtered ? FILTERED.edges : D.edges)),
            dataMark("Direction", "Undirected", "from the file"),
            AB.data("Density", String(filtered ? FILTERED.density : s.density)),
            AB.data(f.componentsName, filtered ? "1" : f.components),
            AB.data("Isolated nodes", String(s.isolated)),
            AB.data("Self-loops", String(s.selfLoops)),
            AB.data("Repeated edges", "0"),
            AB.data("Average degree", String(filtered ? FILTERED.averageDegree : s.averageDegree)),
            AB.data("Highest degree", String(filtered ? FILTERED.maxDegree : s.maxDegree)),
            bars(filtered ? FILTERED.bars : f.degreeBars, filtered ? "Degree 1 to 31, in bars of 2" : f.degreeLabel));

        // Readings a run owns live on that run's row; Statistics links to them, never repeats them
        const statistics = sec("Statistics", { summary: computed ? "4 overview readings; Louvain: 2 readings" : "4 overview readings not computed; Louvain: 2 readings" },
            h("div", { class: "ins-sub" }, "From the overview recipe ", AB.needsElement("Clustering, transitivity, diameter and assortativity as part of graphty-element's data.statistics(); the overview adds no rows.")),
            READINGS.map(([k, v]) => (computed ? dataMark(k, v, stale) : muted(k))),
            h("div", { class: "ins-sub" }, "On runs"),
            AB.data("Louvain", "2 readings", { go: ["inspector-run-row", "data"] }));

        return {
            title: f.graphRow, provenance: ["From " + f.file, "inspector-source", "import-report-warnings"],
            stateBar: filtered ? { text: "4 readings are for all 77 nodes", actions: [{ label: "Compute on 60", onClick: () => AB.flash("Compute the overview on the filtered graph (not wired in the skeleton)") }] } : null,
            style: [canvasSection(), layoutSection({ nodes, methodsState: "layout-methods", scope: filtered ? "Filtered graph, 60 nodes" : "Full graph", scopeGo: ["data-place", "filters"] })],
            data: [overview, statistics, sec("Made with", { summary: "Overview recipe: General" }, recipeRow()), AB.notesSection(1, ["notes-place", "about-graph"])],
        };
    }

    // ---------- Transfers, March 2026: a directed graph, nothing computed ----------
    function transfers() {
        const D = T(), f = D.frame, s = D.stats;
        const overview = sec("Overview", { summary: n(D.nodes) + " nodes, " + n(D.edges) + " edges, directed" },
            AB.data("Nodes", n(D.nodes)),
            AB.data("Edges", n(D.edges)),
            dataMark("Direction", "Directed", "chosen at load: a CSV does not say"),
            AB.data("Density", String(s.density)),
            AB.data(f.componentsName, f.components),
            AB.data("Isolated nodes", String(s.isolated)),
            AB.data("Self-loops", String(s.selfLoops)),
            AB.data("Repeated edges", String(s.parallelEdges)),
            AB.data("Reciprocity", String(s.reciprocity)),
            AB.data("Average total degree", String(s.averageDegree)),
            AB.data("Highest total degree", n(s.maxDegree)),
            bars(f.degreeBars, f.degreeLabel));
        const statistics = sec("Statistics", { summary: "4 overview readings not computed; Louvain: 2 readings" },
            h("div", { class: "ins-sub" }, "From the overview recipe ", AB.needsElement("Clustering, transitivity, diameter and assortativity as part of graphty-element's data.statistics(); the overview adds no rows.")),
            READINGS.map(([k]) => muted(k)),
            h("div", { class: "ins-sub" }, "On runs"),
            AB.data("Louvain", "2 readings", { go: ["inspector-run-row", "many-groups"] }));
        return {
            title: f.graphRow, provenance: ["From " + f.file, "inspector-source", "file"],
            style: [canvasSection(), layoutSection({ nodes: D.nodes, methodsState: "transfers-methods", scope: "Full graph", scopeGo: ["data-place", "filters"] })],
            data: [overview, statistics, sec("Made with", { summary: "Overview recipe: General" }, recipeRow()), AB.notesSection(0, ["notes-place", "about-graph"])],
        };
    }


    const TRANSFERS_FRAME = { dataset: "transactions", left: "graph-place/many-groups" };
    registerSection({
        id: SELF,
        title: "Inspector: nothing selected",
        region: "right",
        rail: "graph",
        frame: (state) => state === "change-overview" || state === "layout-methods" ? { overlay: SELF + "/" + state }
            : state === "transfers-methods" || state === "layout-confirm" ? Object.assign({ overlay: SELF + "/" + state }, TRANSFERS_FRAME)
            : state === "transfers" ? TRANSFERS_FRAME
            : state === "filtered" ? { chip: "Filtered: 60 of 77 nodes" }
            : {},
        states: [
            { id: "overview", label: "After load, Data tab (4 readings not computed)" },
            { id: "computed", label: "Overview computed" },
            { id: "filtered", label: "Filtered graph" },
            { id: "canvas", label: "Style tab: Canvas section open" },
            { id: "transfers", label: "Transfers (directed, for the transfers frame)" },
            { id: "change-overview", label: "Overview recipe menu" },
            { id: "layout-methods", label: "Layout method list" },
            { id: "transfers-methods", label: "Layout method list, transfers" },
            { id: "layout-confirm", label: "Layout change would block the frame" },
        ],
        render(el, state, ctx) {
            if (ctx.region === "overlay") {
                if (state === "change-overview") {
                    el.append(AB.menu({
                        anchor: "#ins-overview-change", place: "below-end",
                        items: [
                            { heading: "Overview recipe for this project" },
                            { label: "General", check: true, desc: "Size, direction, density, components, degree, clustering, diameter", go: [SELF, "overview"] },
                            { label: "Flow", desc: "What goes in and out of each node, by the weight attribute", onClick: () => AB.flash("Flow overview (not wired in the skeleton)") },
                            { label: "Community", desc: "Groups and how they connect", onClick: () => AB.flash("Community overview (not wired in the skeleton)") },
                            { sep: true },
                            { label: "Use a saved recipe...", go: ["recipe-apply", "binding"] },
                            { label: "Default for new projects...", go: ["settings", "projects"] },
                        ],
                    }));
                } else if (state === "layout-confirm") {
                    el.append(AB.popover({
                        anchor: "#ins-method", place: "below-end", width: 280, title: "Lay out with Natural Grouping?",
                        body: h("div", { class: "ins-confirm" },
                            h("span", null, "Natural Grouping is rated for up to 2,000 nodes; this graph has " + n(T().nodes) + "."),
                            h("span", { class: "k-secondary" }, "graphty-element says it will hold the frame while it computes: the canvas stops responding until it finishes."),
                            h("span", { class: "k-secondary" }, "The current positions cannot be brought back afterward. ", AB.needsElement("Saving and restoring positions as a document"))),
                        foot: [AB.button("Cancel", { kind: "secondary", go: [SELF, "transfers"] }), AB.button("Lay out", { onClick: () => { AB.flash("Lays out with Natural Grouping (not wired in the skeleton)"); AB.go(SELF, "transfers"); } })],
                    }));
                } else {
                    const transfersList = state === "transfers-methods";
                    const m = AB.menu({ anchor: "#ins-method", place: "below-end", items: methodsMenu(transfersList ? T().nodes : L().nodes, transfersList ? [SELF, "layout-confirm"] : null) });
                    m.classList.add("ins-methods");
                    el.append(m);
                }
                return;
            }
            const onLayout = ["layout-methods", "transfers-methods", "layout-confirm"].includes(state);
            force = state === "canvas" ? "Canvas" : onLayout ? "Layout" : null;
            const base = { "change-overview": "overview", "layout-methods": "overview", canvas: "overview" }[state] || state;
            const v = base === "transfers" || base === "transfers-methods" || base === "layout-confirm" ? transfers() : lesmis(base);
            force = null;
            const tab = state === "canvas" || onLayout ? "Style" : "Data";
            const insp = AB.inspector({ icon: "network", title: v.title, kind: "Graph", kindKey: "graph-" + state, tab, provenance: v.provenance, menu: ["context-menus", "canvas"], stateBar: v.stateBar, tabs: { Style: v.style, Data: v.data } });
            insp.classList.add("ins-root");
            el.append(insp);
            // An overlay anchored to the method field needs the field in view before it is placed
            if (onLayout) insp.querySelector("#ins-method").scrollIntoView({ block: "start" });
        },
    });
})();
