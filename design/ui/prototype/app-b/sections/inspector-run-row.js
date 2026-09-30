/* Inspector: a run row. The Louvain run the Graph tree shows on Les Miserables (Style, Data,
   Finished) and its readings-only Density run; and, for the states that need two data versions
   (rerun, failed, out of date, earlier results) and for many groups, the Louvain run on the
   transfers (datasets.transactionsApril), framed by the transfers tree and canvas. Transfers numbers
   come from kit/fixtures.json; the Les Miserables communities (sizes, colors, modularity 0.565,
   seed 7) are the ones the Graph place and the table dock computed. Plain ASCII. Styles are injected once below (this section's own; no shared file is edited). */
(function () {
    "use strict";
    const { h, icon } = AB;

    const CSS = `
.rr-status { display: grid; gap: 6px; padding: 8px 16px 10px; border-bottom: 1px solid var(--cm-border); }
.rr-status .k-progress { width: 100%; }
.rr-acts { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 16px 10px; }
.rr-line { display: flex; align-items: center; gap: 8px; min-height: 24px; padding: 0 8px 0 16px; }
.rr-line > .k-grow { min-width: 0; }
.rr-oq { display: inline-flex; align-items: center; height: 16px; padding: 0 6px; margin-inline-start: 4px; border-radius: 8px; font-size: 10px; font-weight: 550; background: var(--cm-bg-warning); color: #000; white-space: nowrap; vertical-align: middle; }
.rr-past { display: grid; gap: 4px; margin: 0 8px 8px 16px; padding: 8px; border-radius: 8px; background: var(--cm-bg-secondary); }
.rr-past .rr-acts { padding: 4px 0 0; }
.rr-stale { display: inline-flex; align-items: center; gap: 4px; color: var(--cm-text-secondary); }
.rr-disabled { opacity: 0.55; pointer-events: none; }
.rr-fields2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rr-note { padding: 0 16px 8px; line-height: 16px; }
.rr-kind { display: inline-flex; color: var(--cm-text-secondary); }
`;
    if (!document.getElementById("rr-style")) document.head.append(h("style", { id: "rr-style" }, CSS));

    const oq = (text) => h("span", { class: "rr-oq", title: "Open question: " + text }, "Open question");
    const fmt = (n) => Number(n).toLocaleString("en-US");
    const flash = (what) => () => AB.flash(what + " (not wired in the skeleton)");

    function fieldRow(legend, control, extra) {
        return h("div", { class: "k-fieldrow" }, h("span", { class: "k-legend" }, legend, extra || null), control);
    }
    function seg(options, pick) {
        const g = h("span", { class: "k-seg k-seg-fill", role: "radiogroup" });
        options.forEach((o) => {
            const b = h("span", { role: "radio", tabindex: "0", "aria-checked": String(o === pick) }, o);
            b.addEventListener("click", () => g.querySelectorAll("[role=radio]").forEach((x) => x.setAttribute("aria-checked", String(x === b))));
            g.append(b);
        });
        return g;
    }
    function toggle(label, on) {
        const s = h("span", { class: "k-switch", role: "switch", tabindex: "0", "aria-checked": String(on), "aria-label": label });
        s.addEventListener("click", () => s.setAttribute("aria-checked", String(s.getAttribute("aria-checked") !== "true")));
        return h("div", { class: "rr-line" }, h("span", { class: "k-grow" }, label), s);
    }

    // Les Miserables: Louvain weighted by value, resolution 1.0, seed 7
    const LESMIS_RUN = [[1, 25, "#E69F00"], [2, 17, "#56B4E9"], [3, 10, "#009E73"], [4, 10, "#0072B2"], [5, 9, "#D55E00"], [6, 6, "#CC79A7"]];
    const TRANSFERS = ["many-groups", "running", "failed", "out-of-date", "earlier-results"];

    function build(state) {
        const fx = AB.fx, A = fx.datasets.transactionsApril, M = fx.datasets.transactions, LM = fx.datasets.lesmis;
        const L = A.louvain, G = A.agreement, other = fx.canvas.otherGray;
        const lm = !TRANSFERS.includes(state);
        const march = state === "out-of-date" || state === "running" || state === "failed" || state === "many-groups";
        const W = lm
            ? { unit: "nodes", edgeUnit: "edges", weight: "value", seed: "7", title: "Louvain, resolution 1.0", where: "Les Miserables. ", tree: "louvain-open", table: "communities", direction: "Undirected" }
            : { unit: "accounts", edgeUnit: "transfers", weight: "amount", seed: "11", title: "Louvain, weighted by amount", where: null, tree: "many-groups", table: "transfers", direction: "Directed data, read as undirected" };
        const now = lm ? { file: LM.file, nodes: LM.nodes, edges: LM.edges, communities: LESMIS_RUN.length, modularity: 0.565, legend: { rows: LESMIS_RUN.map(([n, c, col]) => ({ name: "Community " + n, color: col, count: c, go: ["inspector-group-set-path-row", "community-" + n] })), other: null } } : march ? { month: "March", file: M.file, nodes: M.nodes, edges: M.edges, communities: L.march.communities, modularity: L.march.modularity, legend: A.legends.march, reruns: G.marchRerunRange, together: G.stayTogether.marchRerunInTen } : { month: "April", file: A.file, nodes: A.nodes, edges: A.edges, communities: L.april.communities, modularity: L.april.modularity, legend: A.legends.april, reruns: G.aprilRerunRange, together: G.stayTogether.aprilRerunInTen };
        if (!lm) W.where = "Transfers, " + now.month + " 2026. ";
        const staleMark = state === "out-of-date" ? h("span", { class: "rr-stale", title: "Computed on March data" }, icon("history", "sm"), "March") : null;

        if (state === "readings-only") return readingsOnly(LM);

        // ---------- Style tab ----------
        const style = () => [
            h("div", { class: "rr-note k-secondary" }, "One palette colors all " + now.communities + " communities. A community's own row can override its color."),
            lm ? h("div", { class: "rr-note k-secondary" }, "The communities paint as soon as the run finishes. The eye on this row shows and hides all of them.") : null,
            AB.section("Colors for every community",
                fieldRow("Palette", AB.field("Colorblind-safe, 8 colors", { caret: true, go: ["context-menus", "run-row"] })),
                h("div", { class: "k-fieldrow" }, h("span", { class: "ab-multi" }, fx.canvas.categorical.map((c) => AB.chit(c, true)))),
                fieldRow("Order colors by", AB.field("Size, largest first", { caret: true, onClick: flash("Order colors by") })),
                now.legend.rows.map((r) => AB.row({ swatch: AB.chit(r.color, true), label: r.name, trail: fmt(r.count), go: r.go || ["table-dock", "transfers"] })),
                now.legend.other ? AB.row({ swatch: AB.chit(other, true), label: now.legend.other.communities + " more communities share one color", trail: fmt(now.legend.other.count), go: ["table-dock", "transfers"] }) : null,
                now.legend.other ? h("div", { class: "ab-cap k-secondary" }, "More communities than the palette tells apart share gray. " + now.legend.other.holds + ".") : null,
            ),
            AB.section({ title: "Overrides", count: 0 },
                h("div", { class: "rr-note k-secondary" }, "No community has its own color. Change one on its own row; it is then listed here with Reset."),
            ),
            AB.section("Level",
                fieldRow("Paint the groups of", AB.field("Final level, most merged", { caret: true, onClick: flash("Level menu") }), oq("how many levels graphty-element reports for a Louvain run")),
                h("div", { class: "rr-note k-secondary" }, "Louvain merges groups in levels. The level chosen here is what the child rows are and what they paint. To show two levels together, keep one as a separate run from Earlier results."),
            ),
            AB.section("Shared members",
                h("div", { class: "rr-disabled", "aria-disabled": "true" }, fieldRow("A member of two groups takes", AB.field("The higher group's color", { caret: true }))),
                h("div", { class: "rr-note k-secondary" }, "Only for runs whose groups can share members. Louvain puts each " + (lm ? "node" : "account") + " in exactly one community."),
            ),
        ];

        // ---------- Data tab ----------
        const status = [];
        if (state === "running")
            status.push(h("div", { class: "rr-status", role: "status" },
                h("span", { class: "k-strong" }, "Rerunning on April data"),
                h("div", { class: "k-progress" }, h("i", { style: "width:40%" })),
                h("span", { class: "k-secondary" }, "Showing the March result until this run finishes. " + fmt(A.nodes) + " accounts, " + fmt(A.edges) + " transfers."),
                h("div", null, AB.button("Cancel", { kind: "secondary", go: ["inspector-run-row", "out-of-date"] }), " ", AB.link("analyze-popover", "running", "Also shown in Analyze")),
            ));
        if (state === "failed")
            status.push(h("div", { class: "rr-status" },
                h("div", { class: "k-issue", style: "padding:0" }, icon("circle-x"), h("div", { class: "k-issue-body" }, h("b", null, "The rerun on April data failed"), h("span", { class: "k-secondary" }, "Reason:", oq("the element's own wording for a failed Louvain run, shown word for word")), h("span", { class: "k-secondary" }, "Nothing changed: the March result is still shown."))),
                h("div", null, AB.button("Retry", { icon: "refresh-cw", go: ["inspector-run-row", "running"] }), " ", AB.button("Details", { kind: "ghost", onClick: flash("Details") })),
            ));
        if (state === "out-of-date")
            status.push(h("div", { class: "rr-status" },
                h("div", { class: "k-issue", style: "padding:0" }, h("span", { class: "k-warn-glyph" }, "!"), h("div", { class: "k-issue-body" }, h("b", null, "Out of date: computed on March data"), h("span", { class: "k-secondary" }, "The data is now April (" + A.file + "): " + A.versionDiff.accountsAdded + " accounts added, " + A.versionDiff.accountsRemoved + " removed, " + fmt(A.versionDiff.transfersAdded) + " transfers added, " + fmt(A.versionDiff.transfersRemoved) + " removed. The communities still paint as they were found in March."))),
                h("div", null, AB.button("Rerun on April data", { icon: "refresh-cw", go: ["inspector-run-row", "running"] }), " ", AB.link("data-place", "versions", "See the data versions")),
            ));
        if (state === "finished")
            status.push(h("div", { class: "rr-status", role: "status" },
                h("span", null, icon("circle-check", "sm"), " ", h("span", { class: "k-strong" }, "Finished: " + now.communities + " communities, modularity " + now.modularity)),
                h("span", { class: "k-secondary" }, "The communities now paint the canvas. Each is a row under this run in the tree."),
                h("div", null, AB.link("graph-place", "louvain-open", "Show its rows in the tree")),
            ));
        if (state === "earlier-results")
            status.push(h("div", { class: "rr-status", role: "status" },
                h("span", { class: "k-strong" }, "Rerun on April data"),
                h("span", { class: "k-secondary" }, "The March result is kept under Earlier results, below."),
            ));

        const earlier = state === "earlier-results"
            ? AB.section({ title: "Earlier results", count: 1 },
                h("div", { class: "rr-past" },
                    h("span", { class: "k-strong" }, "March data, seed 11"),
                    h("span", { class: "k-secondary k-num" }, L.march.communities + " communities, modularity " + L.march.modularity + ", largest " + L.march.largest[0] + " accounts"),
                    h("span", { class: "k-secondary k-num" }, "Agreement with the April result: " + L.amiMarchVsApril + " (adjusted mutual information, on the " + fmt(G.accountsInBoth) + " accounts in both)"),
                    h("div", { class: "rr-acts" },
                        AB.button("Restore", { kind: "secondary", onClick: flash("Restore the March result") }),
                        AB.button("Keep as separate run", { kind: "secondary", go: ["graph-place", "louvain-open"] }),
                        AB.button("Compare", { kind: "ghost", go: ["full-canvas-modes", "comparison"] })),
                ))
            : AB.section({ title: "Earlier results", count: 0 }, h("div", { class: "rr-note k-secondary" }, "None yet. When this run is rerun, its current result is kept here, with Restore and Keep as separate run."));

        const data = () => [
            status,
            state === "earlier-results" ? earlier : null,
            AB.section({ title: "Settings", actions: AB.iconButton("ellipsis", "Run menu", { go: ["context-menus", "run-row"] }) },
                fieldRow("Scope", AB.field("Full graph, " + fmt(now.nodes) + " " + W.unit, { caret: true, onClick: flash("Scope") })),
                fieldRow("Direction", lm ? h("span", { class: "k-secondary" }, "This graph's edges have no direction.") : seg(["Follow", "Ignore"], "Ignore")),
                fieldRow("Weight", lm ? AB.field(W.weight, { icon: "hash", caret: true, onClick: flash("Weight choices") }) : AB.field(W.weight, { icon: "hash", caret: true, go: ["inspector-attribute-and-filter-step", "attribute"] })),
                fieldRow("A higher weight means", seg(["Stronger", "Farther"], "Stronger")),
                h("div", { class: "k-fieldrow" }, h("div", { class: "rr-fields2" },
                    h("div", null, h("span", { class: "k-legend" }, "Resolution"), AB.field("1.0", { onClick: flash("Resolution") })),
                    h("div", null, h("span", { class: "k-legend" }, "Seed"), AB.field(W.seed, { onClick: flash("Seed") })))),
                h("div", { class: "ab-cap k-secondary" }, "Resolution: higher finds more, smaller communities; lower finds fewer, larger ones."),
                advanced(),
                h("div", { class: "rr-acts" },
                    AB.button("Rerun", { icon: "refresh-cw", go: ["inspector-run-row", "running"] }),
                    AB.button("Run again as copy", { kind: "secondary", go: ["graph-place", W.tree] }),
                    AB.link("analyze-popover", "open", "Other methods in Analyze")),
            ),
            AB.section("Readings",
                AB.data("Modularity (weighted)", h("span", null, String(now.modularity), staleMark ? " " : null, staleMark)),
                AB.data("Number of communities", String(now.communities)),
                AB.data("Largest community", fmt(now.legend.rows[0].count) + " " + W.unit),
                march || lm ? null : AB.data("Single-account communities", String(A.dormant.singletonCommunities)),
                AB.data("Edges within and between", "In the table", { go: ["table-dock", W.table] }),
            ),
            AB.section({ title: "Top items", count: null },
                h("div", { class: "ab-cap k-secondary" }, "Largest communities"),
                now.legend.rows.map((r) => AB.row({ swatch: AB.chit(r.color, true), label: r.name, trail: fmt(r.count), go: r.go || ["table-dock", "transfers"] })),
                h("div", { class: "ab-pad" }, AB.link("table-dock", W.table, "Show all " + now.communities + " in the table")),
            ),
            state === "earlier-results" ? null : earlier,
            AB.section("Provenance",
                AB.data("Scope", "Full graph"), AB.data(lm ? "Nodes" : "Accounts", fmt(now.nodes)), AB.data(lm ? "Edges" : "Transfers", fmt(now.edges)),
                AB.data("Version", lm ? now.file + ", current" : now.month + " (" + now.file + ")", { go: ["full-canvas-modes", "version-history"] }),
                AB.data("Direction", W.direction),
                AB.data("Weight", W.weight + "; higher = stronger"),
                AB.data("Repeated edges, self-loops", oq("how graphty-element records the way repeated edges and self-loops were read")),
                AB.data("Seed", W.seed),
                AB.data("Ran", h("span", null, "Sep 28", oq("which time and engine the element records"))),
            ),
            AB.section("Compare",
                h("div", { class: "rr-acts" }, AB.button("Compare with another run...", { kind: "secondary", icon: "git-compare-arrows", go: ["full-canvas-modes", "comparison"] })),
            ),
            AB.section("Check",
                lm ? h("div", { class: "rr-note k-secondary" }, "Not checked yet. Both checks rerun Louvain and add their results here.") : [
                    AB.data("Stability across seeds", now.reruns[0] + " to " + now.reruns[1]),
                    h("div", { class: "ab-cap k-secondary" }, "Agreement of this run with reruns on seeds " + G.seeds[1] + " to " + G.seeds[G.seeds.length - 1] + " (adjusted mutual information). Of the pairs this run puts together, " + (now.together[0] === now.together[1] ? now.together[0] : now.together[0] + " to " + now.together[1]) + " in 10 stay together.")],
                h("div", { class: "rr-acts" },
                    AB.button("Test against a null model...", { kind: "secondary", onClick: flash("Test against a null model") }),
                    AB.button("Stability across seeds...", { kind: "secondary", onClick: flash("Stability across seeds") })),
            ),
            notes(),
        ];

        return AB.inspector({
            icon: "group",
            title: W.title,
            kind: "Run",
            kindKey: "run-row",
            meta: [now.communities + " communities. " + W.where, AB.link("graph-place", W.tree, "Show in tree")],
            tabs: { Style: style, Data: data },
            tab: state === "style" || state === "many-groups" ? "Style" : "Data",
        });
    }

    function advanced() {
        const box = h("div");
        let open = false;
        const draw = () => {
            box.replaceChildren(AB.row({ icon: open ? "chevron-down" : "chevron-right", label: "Advanced", trail: open ? null : "3 options", onClick: () => { open = !open; draw(); } }));
            if (open)
                box.append(
                    fieldRow("Max iterations", AB.field("100", { onClick: flash("Max iterations") })),
                    fieldRow("Tolerance", AB.field("0.000001", { onClick: flash("Tolerance") })),
                    toggle("Use the optimized implementation", true),
                );
        };
        draw();
        return box;
    }

    function notes() {
        return AB.section({ title: "Notes", count: 0, actions: AB.iconButton("plus", "Add note", { go: ["notes-place", "about-selection"] }) },
            h("div", { class: "rr-note k-secondary" }, "No notes about this run yet. ", AB.link("notes-place", "all", "All notes")));
    }

    function readingsOnly(A) {
        const data = () => [
            h("div", { class: "rr-note k-secondary" }, "This run has nothing to paint, so its row has no eye. Its readings are here and in the graph's Statistics."),
            AB.section("Readings",
                AB.data("Density", String(A.stats.density)),
                AB.data(A.frame.componentsName, String(A.stats.components)),
                AB.data("Isolated nodes", String(A.stats.isolated)),
                AB.data("Average degree", String(A.stats.averageDegree)),
            ),
            AB.section("Settings",
                fieldRow("Scope", AB.field("Full graph, " + fmt(A.nodes) + " nodes", { caret: true, onClick: flash("Scope") })),
                fieldRow("Direction", h("span", { class: "k-secondary" }, "This graph's edges have no direction.")),
                h("div", { class: "rr-acts" }, AB.button("Rerun", { icon: "refresh-cw", onClick: flash("Rerun") })),
            ),
            AB.section({ title: "Earlier results", count: 0 }, h("div", { class: "rr-note k-secondary" }, "None yet.")),
            AB.section("Provenance",
                AB.data("Scope", "Full graph"), AB.data("Nodes", fmt(A.nodes)), AB.data("Edges", fmt(A.edges)),
                AB.data("Version", A.file + ", current", { go: ["full-canvas-modes", "version-history"] }),
                AB.data("Direction", "Undirected"),
            ),
            AB.section("Compare", h("div", { class: "rr-acts" }, AB.button("Compare with another run...", { kind: "secondary", icon: "git-compare-arrows", go: ["full-canvas-modes", "comparison"] }))),
            notes(),
        ];
        return AB.inspector({
            icon: "gauge", title: "Density", kind: "Run", kindKey: "run-row-readings",
            meta: ["Readings only. Les Miserables. ", AB.link("graph-place", "at-rest", "Show in tree")],
            tabs: { Data: data }, tab: "Data",
        });
    }

    registerSection({
        id: "inspector-run-row",
        title: "Inspector: a run row",
        region: "right",
        rail: "graph",
        // The Les Miserables states sit beside the tree's Louvain run; the transfers states beside the transfers tree
        frame: (state) => (TRANSFERS.includes(state) ? { left: "graph-place/many-groups", canvas: "canvas-and-states/transfers-communities" } : { left: "graph-place/" + (state === "readings-only" ? "at-rest" : "louvain-open"), dock: "table-dock/communities" }),
        states: [
            { id: "style", label: "Style tab" },
            { id: "data", label: "Data tab: Settings" },
            { id: "running", label: "Running" },
            { id: "finished", label: "Finished" },
            { id: "earlier-results", label: "Earlier results after a rerun" },
            { id: "failed", label: "Failed" },
            { id: "readings-only", label: "Readings-only run" },
            { id: "out-of-date", label: "Out of date after a data change" },
            { id: "many-groups", label: "Many groups (transfers)" },
        ],
        render(el, state) {
            el.append(build(state));
        },
    });
})();
