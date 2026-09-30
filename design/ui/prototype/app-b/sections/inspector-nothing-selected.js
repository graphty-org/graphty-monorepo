/* Inspector with nothing selected: the graph itself. Overview (cheap readings, the overview recipe,
   Compute the overview), Layout, Statistics, Notes. No tabs.
   Numbers: kit/fixtures.json (datasets.lesmis, datasets.citations). The readings Compute the
   overview fills in (average clustering, diameter, core number) and the filtered graph's edges,
   degrees and density are not in the fixtures; they were computed from the published Les
   Miserables graph (networkx les_miserables_graph, the graph the fixtures cite), as is the Louvain
   run's modularity (weighted by value, resolution 1.0, seed 7: the run graph-place.js lists). Plain ASCII.
   Styles are injected once from this file (the shell's CSS is not ours to edit). */
(function () {
    "use strict";
    const CSS = `
.ins-oq { display: block; width: fit-content; padding: 2px 6px; line-height: 1.4; margin: 0 16px 8px; border-radius: 5px; font-size: 10px; color: var(--cm-text-secondary); box-shadow: inset 0 0 0 1px var(--cm-border); white-space: normal; }
.ins-scope { display: flex; align-items: center; gap: 6px; margin: 0 16px 8px; padding: 6px 8px; border-radius: 5px; background: var(--cm-bg-secondary); color: var(--cm-text-secondary); }
.ins-scope .k-i { flex: none; color: var(--cm-icon-secondary); }
.ins-recipe { display: flex; align-items: center; gap: 6px; padding: 4px 16px; }
.ins-recipe .k-grow { min-width: 0; }
.ins-compute { display: grid; gap: 6px; padding: 4px 16px 12px; }
.ins-compute .k-secondary { line-height: 1.4; }
.ins-mark { display: block; color: var(--cm-text-tertiary); font-size: 11px; }
.ins-muted .k-value { color: var(--cm-text-tertiary); }
.ins-compute .ins-oq { margin: 0; }
.ins-note { display: grid; gap: 4px; margin: 0 8px 8px; padding: 8px; border-radius: 5px; }
.ins-note:hover { background: var(--cm-bg-hover); cursor: pointer; }
.ins-note .k-secondary { font-size: 11px; }
.ins-sizes { padding: 0 16px 8px; color: var(--cm-text-secondary); }
.ins-root .k-data > .k-name { flex: none; white-space: nowrap; }
.ins-root .k-data > .k-value { flex: 1 1 auto; min-width: 0; text-align: right; overflow-wrap: anywhere; white-space: normal; overflow: visible; }
.ins-root .k-data > .k-field { margin-inline-start: auto; }
.ins-sub { padding: 6px 16px 2px; color: var(--cm-text-secondary); font-size: 11px; }
`;
    if (!document.getElementById("ins-css")) document.head.append(h("style", { id: "ins-css" }, CSS));

    const L = () => AB.fx.datasets.lesmis;
    const C = () => AB.fx.datasets.citations;
    const n = (x) => Number(x).toLocaleString("en-US");
    const oq = (text) => h("div", { class: "ins-oq", title: text }, "Open question: " + text);
    const mark = (text) => h("span", { class: "ins-mark" }, text);
    // A data row whose value carries a small trailing mark (scope, "not computed")
    const dataMark = (name, value, m, o) => {
        const r = AB.data(name, value, o);
        if (m) r.querySelector(".k-value").append(mark(m));
        return r;
    };
    const bars = (b, label) => {
        const max = Math.max(...b);
        return [
            h("div", { class: "ab-bars", title: label }, b.map((x) => h("span", { style: `height:${Math.max(1, (x / max) * 100)}%` }))),
            h("div", { class: "ab-cap k-secondary" }, "Degree distribution. " + label + "."),
        ];
    };

    // Filtered graph: "Filter to degree >= 2" on the published graph (60 nodes from the fixtures)
    const FILTERED = { edges: 237, density: 0.1339, averageDegree: 7.9, maxDegree: 31, bars: [6, 100, 12, 88, 24, 59, 24, 18, 6, 6, 0, 6, 0, 0, 0, 6, 0, 0, 0] };
    // Readings Compute the overview fills on the full graph
    const COSTLY = { clustering: 0.573, diameter: 5 };

    function recipeRow(state, name) {
        const change = AB.button("Change...", { kind: "ghost", go: ["inspector-nothing-selected", "change-overview"] });
        change.id = "ins-overview-change";
        return h("div", { class: "ins-recipe" }, icon("book-open", "sm"), h("span", { class: "k-grow k-ellipsis" }, "Overview: " + name), change);
    }

    function computeBlock(state) {
        if (state === "computed") {
            return h("div", { class: "ins-compute" },
                h("span", { class: "k-secondary" }, "Computed on the full graph, " + L().nodes + " nodes. The readings are in Statistics; core number is a column in the table and in ", AB.link("data-place", "attributes", "Data > Attributes"), ". Nothing was colored and no rows were added."));
        }
        const what = "Fills in average clustering, diameter and core number. Adds no rows and colors nothing.";
        const btn = AB.button("Compute the overview", { kind: "secondary", block: true, icon: "play", go: ["inspector-nothing-selected", "computed"] });
        if (state === "large") {
            return h("div", { class: "ins-compute" }, AB.button("Compute the overview", { kind: "secondary", block: true, icon: "play", onClick: () => AB.flash("Compute the overview on the patent citations (not wired in the skeleton)") }),
                h("span", { class: "k-secondary" }, what + " Works without a drawing."),
                oq("How long it takes on 1,480,221 edges, and whether it offers a sampled variant"));
        }
        return h("div", { class: "ins-compute" }, btn, h("span", { class: "k-secondary" }, state === "filtered" ? what + " Runs over the filtered graph, 60 nodes." : what));
    }

    // ---------- Les Miserables: after load, computed, filtered ----------
    function lesmis(state) {
        const D = L(), f = D.frame, s = D.stats;
        const filtered = state === "filtered";
        const nodes = filtered ? D.filterSteps.after.step1 : D.nodes;
        const edges = filtered ? FILTERED.edges : D.edges;
        const computed = state === "computed" || filtered; // filtered: the overview was computed before the step
        const scopeMark = filtered ? "on 77 nodes; now 60" : null;

        const overview = AB.section("Overview",
            filtered ? AB.nav(h("div", { class: "ins-scope", role: "link" }, icon("list-filter", "sm"), h("span", { class: "k-grow" }, "Over the filtered graph: " + nodes + " of " + D.nodes + " nodes. " + D.filterSteps.steps[0] + ".")), "data-place", "filters") : null,
            AB.data("Nodes", n(nodes)),
            AB.data("Edges", n(edges)),
            AB.data("Direction", D.directed ? "Directed" : "Undirected"),
            AB.data("Density", String(filtered ? FILTERED.density : s.density)),
            AB.data(f.componentsName, filtered ? "1" : f.components),
            AB.data("Isolated nodes", String(s.isolated)),
            AB.data("Average degree", String(filtered ? FILTERED.averageDegree : s.averageDegree)),
            AB.data("Highest degree", String(filtered ? FILTERED.maxDegree : s.maxDegree)),
            bars(filtered ? FILTERED.bars : f.degreeBars, filtered ? "Degree 1 to 31, in bars of 2" : f.degreeLabel),
            AB.data("Edge weight", "value", { go: ["inspector-attribute-and-filter-step", "attribute"] }),
            h("div", { class: "ab-cap k-secondary" }, "value: co-appearance count. Each run that uses it asks what it means."),
            AB.data("Attributes", String(f.attributes), { go: ["data-place", "attributes"] }),
            AB.data("Last import", f.file, { go: ["load-step", "checks"] }),
            h("div", { class: "ab-cap k-secondary" }, "value read as number. Opens the import report."),
            recipeRow(state, "General"),
            computeBlock(state),
        );

        const scopeLabel = filtered ? "Filtered graph, 60 nodes" : "Full graph";
        const layout = AB.section("Layout",
            h("div", { class: "k-data" }, h("span", { class: "k-name" }, "Method"), AB.field("Force-directed", { caret: true, onClick: () => AB.flash("Layout methods (not wired in the skeleton)") })),
            h("div", { class: "k-data" }, h("span", { class: "k-name" }, "Dimension"), AB.field("2D", { caret: true, go: ["toolbar", "view-mode"] })),
            AB.data("Scope", scopeLabel, { go: ["data-place", "filters"] }),
            AB.data("Pinned nodes", "None"),
            h("div", { class: "ab-pad" }, AB.button(filtered ? "Re-run on 60 nodes" : "Re-run layout", { kind: "secondary", icon: "refresh-cw", onClick: () => AB.flash("Layout re-run (not wired in the skeleton)") })),
        );

        const stat = (name, value) => computed
            ? dataMark(name, value, scopeMark)
            : h("div", { class: "ins-muted" }, dataMark(name, "Not computed"));
        const statistics = AB.section({ title: "Statistics", actions: AB.iconButton("flask-conical", "Analyze", { go: ["analyze-popover", "open"] }) },
            h("div", { class: "ins-sub" }, "From the overview"),
            stat("Average clustering", String(COSTLY.clustering)),
            stat("Diameter", String(COSTLY.diameter)),
            computed ? dataMark("Core number", "In Data", scopeMark, { go: ["data-place", "attributes"] }) : h("div", { class: "ins-muted" }, dataMark("Core number", "Not computed")),
            
            h("div", { class: "ins-sub" }, "Louvain, resolution 1.0"),
            dataMark("Modularity", "0.565", scopeMark, { go: ["inspector-run-row", "data"] }),
            dataMark("Communities", "6", scopeMark, { go: ["inspector-run-row", "data"] }),
            h("div", { class: "ins-sub" }, "Density"),
            dataMark("Density", String(s.density), scopeMark, { go: ["inspector-run-row", "readings-only"] }),
            h("div", { class: "ins-sub" }, "The file's group column"),
            dataMark("Modularity of group", String(s.modularityOfGroups), scopeMark, { go: ["inspector-attribute-and-filter-step", "attribute"] }),
            filtered ? h("div", { class: "ab-pad" }, AB.button("Rerun on current filter", { kind: "ghost", onClick: () => AB.flash("Rerun on the filtered graph (not wired in the skeleton)") })) : null,
        );
        return { title: f.graphRow, meta: f.project + ", " + f.file, sections: [overview, layout, statistics, notes(true)] };
    }

    // ---------- Patent citations: past the drawing limit ----------
    function large() {
        const c = C(), s = c.stats, dd = c.degreeDistribution;
        const overview = AB.section("Overview",
            AB.nav(h("div", { class: "ins-scope", role: "link" }, icon("eye-off", "sm"), h("span", { class: "k-grow" }, "Not drawn: " + n(c.nodes) + " nodes is past the drawing limit of " + n(c.drawingLimit) + ". Every reading here still works. Add a filter step to draw a part.")), "data-place", "filters"),
            AB.data("Nodes", n(c.nodes)),
            AB.data("Edges", n(c.edges)),
            AB.data("Direction", c.directed ? "Directed" : "Undirected"),
            AB.data("Density", s.density.toFixed(7)),
            AB.data("Weak components", n(s.components)),
            AB.data("Isolated nodes", n(s.isolates)),
            h("div", { class: "ins-sizes" }, "Largest components: " + s.componentSizes.map(n).join(", ") + " nodes, and " + n(s.componentsMore) + " more. The largest holds " + s.largestShare + "% of the nodes."),
            AB.data("Average total degree", String(s.averageDegree)),
            AB.data("In-degree", "0 to " + dd.in.max + ", mean " + dd.in.mean),
            AB.data("Never cited", n(dd.in.zero)),
            AB.data("Out-degree", "0 to " + dd.out.max + ", mean " + dd.out.mean),
            AB.data("Cite no patent", n(dd.out.zero)),
            AB.data("Edge weight", "No numeric edge column"),
            AB.data("Attributes", String(c.attributes.length), { go: ["data-place", "attributes"] }),
            AB.data("Last import", c.file, { go: ["load-step", "checks"] }),
            h("div", { class: "ab-cap k-secondary" }, "Opens the import report."),
            recipeRow("large", "General"),
            computeBlock("large"),
        );
        const layout = AB.section("Layout",
            AB.data("Method", "Force-directed"),
            AB.data("Scope", "Full graph", { go: ["data-place", "filters"] }),
            h("div", { class: "ab-cap k-secondary" }, "Nothing is laid out while nothing is drawn."),
            oq("Can a layout run on a graph that is not drawn, for export or for later?"),
        );
        const statistics = AB.section({ title: "Statistics", actions: AB.iconButton("flask-conical", "Analyze", { go: ["analyze-popover", "open"] }) },
            h("div", { class: "ins-muted" }, dataMark("Average clustering", "Not computed")),
            h("div", { class: "ins-muted" }, dataMark("Diameter", "Not computed")),
            h("div", { class: "ab-pad k-secondary" }, "No runs yet. A run's graph-wide readings are listed here."),
        );
        return { title: c.title, meta: c.file, sections: [overview, layout, statistics, notes(false)] };
    }

    function notes(has) {
        const add = AB.iconButton("plus", "Add note", { go: ["notes-place", "writing"] });
        if (!has) return AB.section({ title: "Notes", count: 0, actions: add }, h("div", { class: "ab-pad k-secondary" }, "No notes about this graph yet."));
        return AB.section({ title: "Notes", count: 1, actions: add },
            AB.nav(h("div", { class: "ins-note", role: "link" },
                h("span", null, "Edge value is the number of chapters two characters share. A weighted run should read it as strength, not distance."),
                h("span", { class: "k-secondary" }, "Adam Powers, Sep 28 2026, 10:14")), "notes-place", "about-graph"));
    }

    registerSection({
        id: "inspector-nothing-selected",
        title: "Inspector: nothing selected",
        region: "right",
        rail: "graph",
        frame: (state) => state === "large"
            ? { left: "graph-place/empty", canvas: "canvas-and-states/too-large", dock: false }
            : state === "change-overview" ? { overlay: "inspector-nothing-selected/change-overview" }
            : state === "filtered" ? { chip: "Filtered: 60 of 77 nodes" }
            : {},
        states: [
            { id: "overview", label: "After load, before Compute the overview" },
            { id: "computed", label: "Overview computed" },
            { id: "filtered", label: "Filtered graph" },
            { id: "large", label: "Past the drawing limit" },
            { id: "change-overview", label: "Change overview menu" },
        ],
        render(el, state, ctx) {
            if (ctx.region === "overlay") {
                el.append(AB.menu({
                    anchor: "#ins-overview-change", place: "below-end",
                    items: [
                        { heading: "Overview for this project" },
                        { label: "General overview", check: true, desc: "Size, direction, density, components, degree", go: ["inspector-nothing-selected", "overview"] },
                        { label: "Flow overview", desc: "Money or traffic in and out", onClick: () => AB.flash("Flow overview (not wired in the skeleton)") },
                        { label: "Community overview", desc: "Groups and how they connect", onClick: () => AB.flash("Community overview (not wired in the skeleton)") },
                        { sep: true },
                        { label: "Apply a recipe as the overview...", go: ["recipe-apply", "binding"] },
                        { label: "Default for new projects...", go: ["preferences", "general"] },
                    ],
                }));
                return;
            }
            const v = state === "large" ? large() : lesmis(state === "change-overview" ? "overview" : state);
            const insp = AB.inspector({ icon: "network", title: v.title, kind: "Graph", meta: v.meta, body: v.sections });
            insp.classList.add("ins-root");
            el.append(insp);
        },
    });
})();
