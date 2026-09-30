/* Inspector: a run row, in the one inspector frame (version 2). The Louvain run on Les Miserables
   (6 communities, modularity 0.565, seed 7, as the Graph place and the table dock computed) and its
   readings-only Density run; and, for the states that need two data versions (rerun on April data,
   failed, out of date) and for many groups, the Louvain run on the transfers
   (datasets.transactionsApril), framed by the transfers tree and canvas.
   Style tab: the shared Style tab with Fill color bound to the run's communities; the binding
   block under that line holds the palette the children share, per-child exceptions, overflow, and
   the Level of a hierarchy. Data tab: Summary, Top items, Made with (every option editable; an edit raises the
   state bar), Notes. Run status (running, queued, cannot be stopped, partial, failed, out of date)
   and the settings-changed commit sit in the one state bar under the header. Verbs live in "...".
   Plain ASCII. Styles are injected once below (this section's own; no shared file is edited). */
(function () {
    "use strict";
    const { h, icon } = AB;

    const CSS = `
.rr-oq { display: inline-flex; align-items: center; height: 16px; padding: 0 6px; margin-inline-start: 4px; border-radius: 8px; font-size: 10px; font-weight: 550; background: var(--cm-bg-warning); color: #000; white-space: nowrap; vertical-align: middle; }
.rr-note { padding: 0 16px 8px; line-height: 16px; }
.rr-fields2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rr-bar { display: grid; gap: 4px; min-width: 0; padding: 2px 0; line-height: 16px; }
.rr-bar .k-progress { width: 100%; }
.rr-insp .ab-statebar { flex-wrap: wrap; padding-block: 6px; }
.rr-insp .ab-statebar > .k-grow { flex: 1 0 100%; min-width: 0; }
.rr-bind { margin: 0 8px 8px 16px; padding: 2px 0; border-inline-start: 2px solid var(--cm-border); }
.rr-sizes { display: flex; align-items: flex-end; gap: 4px; height: 48px; padding: 4px 16px; }
.rr-sizes > span { flex: 1; min-height: 2px; border-radius: 2px 2px 0 0; }
.rr-kv { display: grid; grid-template-columns: 64px minmax(0, 1fr); align-items: center; gap: 8px; min-height: 24px; padding: 2px 0 2px 8px; }
.rr-insp .ab-insp-body > .rr-kv, .rr-insp .ab-sec-body > .rr-kv { grid-template-columns: 88px minmax(0, 1fr); padding: 2px 8px 2px 16px; }
.rr-kv > .k-name { color: var(--cm-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rr-kv > .k-value { min-width: 0; }
`;
    if (!document.getElementById("rr-style")) document.head.append(h("style", { id: "rr-style" }, CSS));

    const oq = (text) => h("span", { class: "rr-oq", title: "Open question: " + text }, "Open question");
    const fmt = (n) => Number(n).toLocaleString("en-US");
    const flash = (what) => () => AB.flash(what + " (not wired in the skeleton)");
    const RUN_LABEL = "a run's name is its label, which graphty-element keeps read-only";
    const NO_EARLIER = "a rerun replaces the result, and graphty-element keeps no earlier one";
    const MENU = ["context-menus", "run-row"];
    const EDIT = ["inspector-run-row", "settings-changed"];

    function fieldRow(legend, control, extra) {
        return h("div", { class: "k-fieldrow" }, h("span", { class: "k-legend" }, legend, extra || null), control);
    }
    // Every run option is editable; any edit raises the state bar (the settings-changed state).
    function seg(options, pick) {
        const g = h("span", { class: "k-seg k-seg-fill", role: "radiogroup" });
        options.forEach((o) => {
            const b = h("span", { role: "radio", tabindex: "0", "aria-checked": String(o === pick) }, o);
            AB.nav(b, EDIT[0], EDIT[1]);
            g.append(b);
        });
        return g;
    }
    function toggle(label, on) {
        const s = h("span", { class: "k-switch", role: "switch", tabindex: "0", "aria-checked": String(on), "aria-label": label });
        AB.nav(s, EDIT[0], EDIT[1]);
        return h("div", { class: "k-data" }, h("span", { class: "k-name" }, label), h("span", { class: "k-value" }, s));
    }
    const opt = (value, o) => AB.field(value, Object.assign({ go: EDIT }, o || {}));

    // Les Miserables: Louvain weighted by value, resolution 1.0, seed 7
    const LESMIS_RUN = [[1, 25, "#E69F00"], [2, 17, "#56B4E9"], [3, 10, "#009E73"], [4, 10, "#0072B2"], [5, 9, "#D55E00"], [6, 6, "#CC79A7"]];
    const TRANSFERS = ["many-groups", "running", "failed", "out-of-date"];

    function world(state) {
        const fx = AB.fx, A = fx.datasets.transactionsApril, M = fx.datasets.transactions, LM = fx.datasets.lesmis;
        const L = A.louvain;
        if (!TRANSFERS.includes(state))
            return { lm: true, unit: "nodes", weight: "value", seed: "7", title: "Louvain, resolution 1.0", where: "Les Miserables", tree: "louvain-open", table: "communities",
                file: LM.file, version: LM.file + ", current", nodes: LM.nodes, edges: LM.edges, communities: LESMIS_RUN.length, modularity: 0.565,
                rows: LESMIS_RUN.map(([n, c, col]) => ({ name: "Community " + n, color: col, count: c, go: ["inspector-group-set-path-row", "community-" + n] })), other: null };
        // the transfers tree and canvas this section is framed by show the March result
        const src = { month: "March", file: M.file, nodes: M.nodes, edges: M.edges, c: L.march, legend: A.legends.march };
        return { lm: false, unit: "accounts", weight: "amount", seed: "11", title: "Louvain, weighted by amount", where: "Transfers, " + src.month + " 2026", tree: "many-groups", table: "transfers",
            file: src.file, version: src.month + " (" + src.file + ")", nodes: src.nodes, edges: src.edges, communities: src.c.communities, modularity: src.c.modularity,
            rows: src.legend.rows.map((r) => ({ name: r.name, color: r.color, count: r.count, go: ["table-dock", "transfers"] })), other: src.legend.other, month: src.month };
    }

    // ---------- the state bar: the settings-changed commit, and the run's own status ----------
    function stateBar(state, W) {
        const A = AB.fx.datasets.transactionsApril;
        const bar = (lines) => h("div", { class: "rr-bar" }, lines);
        const prog = (pct, title) => h("div", { class: "k-progress", role: "progressbar", "aria-valuenow": String(pct), "aria-valuemin": "0", "aria-valuemax": "100", title: title || null }, h("i", { style: "width:" + pct + "%" }));
        switch (state) {
            case "settings-changed":
                return { text: "Settings changed since the run", actions: [{ label: "Rerun", go: ["inspector-run-row", "cannot-cancel"] }, { label: "Run as copy", go: ["graph-place", "finished"] }, { label: "Revert", go: ["inspector-run-row", "data"] }] };
            case "running":
                return { text: bar([h("span", { class: "k-strong" }, "Rerunning on April data"), prog(40), h("span", { class: "k-secondary" }, "Showing the March result until it finishes")]), actions: [{ label: "Cancel", go: ["inspector-run-row", "out-of-date"] }] };
            case "queued":
                return { text: bar([h("span", { class: "k-strong" }, "Rerun queued, 2nd"), h("span", { class: "k-secondary" }, "Starts when Betweenness finishes. The current result paints until then.")]), actions: [{ label: "Cancel", go: ["inspector-run-row", "data"] }] };
            case "cannot-cancel":
                return { text: bar([h("span", { class: "k-strong", title: "This step cannot be stopped" }, "Rerunning with resolution 1.2"), prog(70, "This step cannot be stopped"), h("span", { class: "k-secondary" }, "This step cannot be stopped. The current result paints until it finishes.")]), actions: [] };
            case "partial":
                return { text: bar([h("span", { class: "k-strong" }, "Partial: stopped at the time limit"), h("span", { class: "k-secondary" }, "The communities found so far paint. They are not final.")]), actions: [{ label: "Rerun", go: ["inspector-run-row", "cannot-cancel"] }] };
            case "failed":
                return { text: bar([h("span", { class: "k-strong" }, icon("circle-x", "sm"), " The rerun on April data failed"), h("span", { class: "k-secondary" }, "Reason:", oq("the element's own wording for a failed Louvain run, shown word for word")), h("span", { class: "k-secondary" }, "Nothing changed: the March result is still shown.")]), actions: [{ label: "Retry", go: ["inspector-run-row", "running"] }] };
            case "out-of-date":
                return { text: bar([h("span", { class: "k-strong" }, "Out of date: computed on March data"), h("span", { class: "k-secondary" }, "Now April (" + A.file + "): " + A.versionDiff.accountsAdded + " accounts added, " + A.versionDiff.accountsRemoved + " removed. ", AB.link("data-place", "versions", "Data versions"))]), actions: [{ label: "Rerun on April data", go: ["inspector-run-row", "running"] }] };
            default:
                return null;
        }
    }

    // ---------- Style tab ----------
    function styleTab(state, W) {
        const fx = AB.fx;
        const hier = state === "hierarchy-level";
        const levelMenu = (e) => AB.menu({ anchor: e.currentTarget, place: "below-start", items: [
            { heading: "Paint the groups of" },
            { label: "Final level, most merged", check: !hier, go: ["inspector-run-row", "style"] },
            { label: "First level, least merged", check: hier, go: ["inspector-run-row", "hierarchy-level"] },
            { sep: true },
            { label: "Levels in between", disabled: true, desc: AB.needsElement("how many levels graphty-element reports for a Louvain run") },
        ] });
        // The shared Style tab: Fill color is bound to the run's result, and everything about how
        // communities become colors sits in the binding block under that line (as on a measure row)
        // One label column and one value column; a line shows only when it applies, and its
        // explanation is the tooltip. An exception's home is the community's own row (its Fill reads
        // "from the Louvain palette" until edited); this block would only link to such rows.
        const kv = (label, value, title) => h("div", { class: "rr-kv", title: title || null }, h("span", { class: "k-name" }, label), h("span", { class: "k-value" }, value));
        const block = () => h("div", { class: "rr-bind", role: "group", "aria-label": "How the communities become colors" },
            // The palette field shows its colors (the name is in the tooltip), as Figma's swatch fields do
            kv("Palette", Object.assign(AB.field(h("span", { class: "ab-multi" }, fx.canvas.categorical.map((c) => AB.chit(c, true))), { caret: true, go: ["style-pickers", "choice"] }), { title: "Eight Distinct Colors, safe for color-blind readers" }), "The colors the communities share, in order. A community with a look of its own is set on its own row."),
            kv("Order by", AB.field("Size", { caret: true, go: ["style-pickers", "choice"] }), "Which community takes the first color: the largest, by size"),
            W.other
                ? [kv("Overflow", AB.field("The rest share one color", { caret: true, go: ["style-pickers", "choice"] }), "More communities than colors: what the rest draw as"),
                    kv("Also by", AB.field("Nothing else", { caret: true, go: ["style-pickers", "choice"] }), "Tell the rest apart by another property, such as shape"),
                    kv("Shared color", AB.link("table-dock", "transfers", W.other.communities + " communities, " + fmt(W.other.count) + " " + W.unit))]
                : null,
            kv("Level", Object.assign(AB.field(hier ? "First level" : "Final level", { caret: true, onClick: levelMenu }), { title: hier ? "First level, least merged" : "Final level, most merged" }), "Louvain merges groups in levels; the child rows are the level chosen here. To show two levels together, Run again as copy (in \"...\") and pick a level on each."),
            hier ? oq("how many groups the first level holds") : null);
        return [
            AB.paintsLine("members of its " + (hier ? "" : W.communities + " ") + "communities: ", AB.link("table-dock", W.table, fmt(W.nodes) + " " + W.unit)),
            AB.styleTab({ kind: "node", set: {}, bound: { "node.color": "Community" }, blocks: { "node.color": block }, openSection: "Fill" }),
        ];
    }

    // ---------- Data tab ----------
    function dataTab(state, W) {
        const changed = state === "settings-changed";
        const partial = state === "partial";
        const summary = partial
            ? [AB.data("Modularity", h("span", null, "Not final", oq("which readings the element reports for a run stopped early"))), AB.data("Number of communities", "Not final")]
            : [
                AB.data("Modularity (weighted)", String(W.modularity)),
                AB.data("Number of communities", String(W.communities), { go: ["graph-place", W.tree] }),
                AB.data("Largest community", fmt(W.rows[0].count) + " " + W.unit, { go: W.rows[0].go }),
                AB.data("Edges within and between", "In the table", { go: ["table-dock", W.table] }),
            ];
        return [
            AB.section({ title: "Summary", collapsible: true, key: "rr-summary", summary: W.communities + " communities, modularity " + W.modularity }, summary),
            // Every community is a child row in the tree beside it, so the Data tab shows their sizes, not the list again
            partial ? null : W.other ? AB.section({ title: "Top items", count: W.communities, collapsible: true, key: "rr-top", summary: "Largest: " + W.rows[0].name },
                h("div", { class: "ab-cap k-secondary" }, "Largest communities"),
                W.rows.slice(0, 10).map((r) => AB.row({ swatch: AB.chit(r.color, true), label: r.name, trail: fmt(r.count), go: r.go })),
            ) : AB.section({ title: "Sizes", count: W.communities, collapsible: true, key: "rr-sizes", summary: fmt(W.rows[W.rows.length - 1].count) + " to " + fmt(W.rows[0].count) + " " + W.unit + " each" },
                h("div", { class: "rr-sizes", role: "img", "aria-label": "Community sizes, largest first: " + W.rows.map((r) => r.count).join(", ") }, W.rows.map((r) => h("span", { style: `height:${Math.round((r.count / W.rows[0].count) * 100)}%;background:${r.color}`, title: r.name + ": " + fmt(r.count) + " " + W.unit }))),
                h("div", { class: "ab-cap k-secondary" }, fmt(W.rows[W.rows.length - 1].count) + " to " + fmt(W.rows[0].count) + " " + W.unit + " each, largest first"),
            ),
            AB.section({ title: "Made with", collapsible: true, key: "rr-made", summary: "Full graph, weight " + W.weight + ", resolution " + (changed ? "1.2" : "1.0") + ", seed " + W.seed },
                // Options that differ from the element's defaults show here; every other option is
                // one level down, under All options. Editing any of them raises the state bar.
                madeWith(W, changed, partial),
                AB.data("Data version", W.version, { go: ["full-canvas-modes", "version-history"] }),
                AB.data(W.lm ? "Nodes, edges" : "Accounts, transfers", fmt(W.nodes) + ", " + fmt(W.edges)),
                AB.data("Repeated edges, self-loops", oq("how graphty-element records the way repeated edges and self-loops were read")),
                AB.data("Ran", h("span", null, "Sep 28", oq("which time, precision and engine the element records"))),
            ),
            AB.notesSection(W.lm ? 1 : 0, ["notes-place", "about-selection"]),
        ];
    }

    function madeWith(W, changed, partial) {
        const kv = (label, value, title) => h("div", { class: "rr-kv", title: title || null }, h("span", { class: "k-name" }, label), h("span", { class: "k-value" }, value));
        const all = [
            [true, kv("Weight", opt(W.weight, { icon: "hash", caret: true }))],
            [false, kv("Higher means", seg(["Stronger", "Farther"], "Stronger"), "What a higher weight means for this run")],
            [changed, kv("Resolution", opt(changed ? "1.2, was 1.0" : "1.0"), "Higher finds more, smaller communities; lower finds fewer, larger ones")],
            [true, kv("Seed", opt(W.seed))],
            [false, kv("Scope", opt("Full graph, " + fmt(W.nodes) + " " + W.unit, { caret: true }))],
            [false, W.lm ? kv("Direction", h("span", { class: "k-secondary", title: "This graph's edges have no direction" }, "None")) : kv("Direction", seg(["Follow", "Ignore"], "Ignore"))],
            [partial, kv("Stop after", opt(partial ? "10 seconds" : "No limit", { caret: true }))],
            [false, kv("Max iterations", opt("100"))],
            [false, kv("Tolerance", opt("0.000001"))],
            [false, toggle("Use the optimized implementation", true)],
        ];
        const rest = all.filter(([d]) => !d).map(([, el]) => el);
        return [all.filter(([d]) => d).map(([, el]) => el),
            AB.section({ title: "All options", count: rest.length, collapsible: true, collapsed: true, key: "rr-all-options", summary: "At their defaults" }, rest)];
    }

    function readingsOnly() {
        const LM = AB.fx.datasets.lesmis;
        return AB.inspector({
            icon: "gauge", title: "Density", kind: "Run", kindKey: "run-row-readings",
            provenance: ["from Analyze, Sep 28", "analyze-popover", "open"], menu: MENU, renameDisabled: RUN_LABEL,
            meta: ["Readings only: nothing to paint, so its row has no eye."],
            body: [
                AB.section({ title: "Summary", collapsible: true, key: "rr-ro-summary", summary: "Density " + LM.stats.density },
                    AB.data("Density", String(LM.stats.density)),
                    AB.data(LM.frame.componentsName, String(LM.stats.components)),
                    AB.data("Isolated nodes", String(LM.stats.isolated)),
                    AB.data("Average degree", String(LM.stats.averageDegree)),
                ),
                AB.section({ title: "Made with", collapsible: true, key: "rr-ro-made", summary: "Full graph, " + LM.nodes + " nodes" },
                    fieldRow("Scope", opt("Full graph, " + fmt(LM.nodes) + " nodes", { caret: true })),
                    fieldRow("Direction", h("span", { class: "k-secondary" }, "This graph's edges have no direction.")),
                    AB.data("Data version", LM.file + ", current", { go: ["full-canvas-modes", "version-history"] }),
                    AB.data("Nodes, edges", LM.nodes + ", " + LM.edges),
                ),
                AB.notesSection(0),
            ],
        });
    }

    function build(state) {
        if (state === "readings-only") return readingsOnly();
        const W = world(state);
        const styleFirst = state === "style" || state === "many-groups" || state === "hierarchy-level";
        const meta = state === "finished" ? [icon("circle-check", "sm"), " Finished: " + W.communities + " communities, modularity " + W.modularity + ". " + W.where + "."]
            : state === "rename-disabled" ? ["Its name is the run's label. ", AB.needsElement(RUN_LABEL)]
            : null;
        const insp = AB.inspector({
            icon: "group", title: W.title, kind: "Run", kindKey: "run-row",
            provenance: ["from Analyze, Sep 28", "analyze-popover", "open"],
            menu: MENU,
            renameDisabled: RUN_LABEL,
            meta,
            stateBar: stateBar(state, W),
            tabs: { Style: () => styleTab(state, W), Data: () => dataTab(state, W) },
            tab: styleFirst ? "Style" : "Data",
        });
        insp.classList.add("rr-insp");
        return insp;
    }

    // The "..." menu, word for word the run row's right-click menu, opened over the inspector
    function runMenu() {
        return AB.menu({
            anchor: "#ab-right .ab-insp-sub .k-icon-btn", place: "below-end",
            items: [
                { heading: "Louvain, resolution 1.0" },
                { label: "Rerun", go: ["inspector-run-row", "cannot-cancel"] },
                { label: "Run again as copy", desc: "Keeps this run; the copy lands on top", go: ["graph-place", "finished"] },
                { label: "Restore an earlier result", disabled: true, desc: AB.needsElement(NO_EARLIER) },
                { sep: true },
                { label: "Check against a null model...", disabled: true, desc: AB.needsElement("a null-model test for a run") },
                { label: "Stability across seeds...", disabled: true, desc: AB.needsElement("rerunning over several seeds and reporting agreement") },
                { label: "Compare with another run...", go: ["full-canvas-modes", "comparison"] },
                { sep: true },
                { label: "Show members in table", go: ["table-dock", "communities"] },
                { label: "Lay out by these groups" },
                { label: "Restore the suggested look" },
                { sep: true },
                { label: "Add note", shortcut: "N", go: ["notes-place", "writing"] },
                { label: "Lock" },
                { label: "Hide from list (keeps painting)", go: ["graph-place", "show-hidden"] },
                { sep: true },
                { label: "Delete...", go: ["context-menus", "run-delete"] },
            ],
        });
    }

    registerSection({
        id: "inspector-run-row",
        title: "Inspector: a run row",
        region: "right",
        rail: "graph",
        frame: (state) => {
            if (TRANSFERS.includes(state)) return { left: "graph-place/many-groups", canvas: "canvas-and-states/transfers-communities" };
            const f = { left: "graph-place/" + (state === "readings-only" ? "at-rest" : "louvain-open"), dock: "table-dock/communities" };
            if (state === "earlier-results") f.overlay = "inspector-run-row/earlier-results";
            return f;
        },
        states: [
            { id: "style", label: "Style tab" },
            { id: "data", label: "Data tab" },
            { id: "settings-changed", label: "Settings changed since the run" },
            { id: "running", label: "Running (transfers, April rerun)" },
            { id: "queued", label: "Queued" },
            { id: "cannot-cancel", label: "Running, cannot be stopped" },
            { id: "partial", label: "Partial: stopped at the time limit" },
            { id: "finished", label: "Finished" },
            { id: "earlier-results", label: "\"...\" menu: Restore an earlier result" },
            { id: "failed", label: "Failed" },
            { id: "readings-only", label: "Readings-only run" },
            { id: "out-of-date", label: "Out of date after a data change" },
            { id: "many-groups", label: "Many groups (transfers)" },
            { id: "hierarchy-level", label: "Hierarchy: first level" },
            { id: "rename-disabled", label: "Rename refused" },
        ],
        render(el, state, ctx) {
            if (ctx && ctx.region === "overlay") {
                if (state === "earlier-results") el.append(runMenu());
                return;
            }
            el.append(build(state));
            if (state === "rename-disabled") AB.flash("Rename needs graphty-element: " + RUN_LABEL);
        },
    });
})();
