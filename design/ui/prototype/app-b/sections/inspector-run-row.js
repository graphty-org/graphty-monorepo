/* Inspector: a run row, in the one inspector frame (version 3). The Louvain run on Les Miserables
   (6 communities, modularity 0.565) and the readings-only Density run; and, for the states that need
   two data versions (rerun on April data, failed, out of date) and for many groups, the Louvain run
   on the transfers (datasets.transactionsApril), framed by the transfers tree and canvas.
   Header: the tree's kind icon (layers) and the tree's name, "Louvain"; parameters are in the kind
   line and Made with. Style tab: the shared Style tab, Fill color bound to the run's communities;
   the bound value opens the one Binding popover (palette, order, overflow). Data tab: Summary,
   Sizes (one size chart for any number of communities), Made with (settings that differ from the
   default, Level and Stop after; the rest in the All options popover; any edit raises the state
   bar), Notes. Made with names where the weight came from: "loaded weight (value)" when the run used
   the weight chosen on the Data page, or "None, this run's override" (state weight-override); Higher
   weight (Stronger | Farther | Capacity) defaults from the loaded meaning. The state bar is one line, at most two buttons. Verbs live in "...". The tab is the
   one last chosen for a run, except in the states that exist to show one tab. Plain ASCII. */
(function () {
    "use strict";
    const { h, icon } = AB;

    const CSS = `
.rr-sizes { display: flex; align-items: flex-end; gap: 2px; height: 48px; padding: 4px 16px; }
.rr-sizes > span { flex: 1 1 0; min-width: 2px; min-height: 2px; border-radius: 2px 2px 0 0; }
.rr-line { display: inline-flex; align-items: center; gap: 4px; min-width: 0; }
.rr-line .k-progress { width: 40px; flex: none; }
.rr-wrap { height: auto; min-height: 24px; max-width: 100%; box-sizing: border-box; }
.rr-col { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 0; }
:is(.rr-col, .rr-all) .ab-design-note { white-space: normal; margin-inline-start: 0; flex: 0 1 auto; min-width: 0; }
.rr-wrap .k-ellipsis { white-space: normal; overflow: visible; }
.rr-all { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 0 16px 8px 112px; }
`;
    if (!document.getElementById("rr-style")) document.head.append(h("style", { id: "rr-style" }, CSS));

    const fmt = (n) => Number(n).toLocaleString("en-US");
    const RUN_LABEL = "a run's name is its label, which graphty-element keeps read-only";
    const NO_EARLIER = "a rerun replaces the result, and graphty-element keeps no earlier one";
    const MENU = ["context-menus", "run-row"];
    const SELF = "inspector-run-row";
    // graphty-element's Louvain options today: resolution, max iterations, tolerance, optimized
    const ELEMENT_OPTS = "graphty-element's Louvain has resolution, max iterations, tolerance and optimized; Level, Stop after, Seed and scope need it";
    const WEIGHT_NEEDS = "a run's caveats.weight records the attribute and meaning but not whether it came from the loaded weight, and the weight meaning has no Capacity yet";
    const EDIT = [SELF, "settings-changed"];
    // The states that exist to show one tab; every other state opens on the tab last chosen
    const TAB = { style: "Style", data: "Data", "all-options": "Data", "hierarchy-level": "Data", "weight-override": "Data" };

    // Les Miserables: Louvain weighted by value, resolution 1.0
    const LESMIS_RUN = [[1, 25, "#E69F00"], [2, 17, "#56B4E9"], [3, 10, "#009E73"], [4, 10, "#0072B2"], [5, 9, "#D55E00"], [6, 6, "#CC79A7"]];
    const TRANSFERS = ["many-groups", "running", "failed", "out-of-date"];

    function world(state) {
        const fx = AB.fx, A = fx.datasets.transactionsApril, M = fx.datasets.transactions;
        if (!TRANSFERS.includes(state))
            return { lm: true, unit: "nodes", weight: "value", table: "communities", nodes: fx.datasets.lesmis.nodes, communities: LESMIS_RUN.length, modularity: 0.565,
                rows: LESMIS_RUN.map(([n, c, col]) => ({ name: "Community " + n, color: col, count: c })), other: null, version: null };
        // the transfers tree and canvas this section is framed by show the March result
        const c = A.louvain.march, lg = A.legends.march;
        return { lm: false, unit: "accounts", weight: "amount", table: "transfers", nodes: M.nodes, communities: c.communities, modularity: c.modularity,
            rows: lg.rows.map((r) => ({ name: r.name, color: r.color, count: r.count })), other: lg.other,
            // provenance shows only where it differs from the current graph (April)
            version: "March, now April" };
    }

    // ---------- the state bar: one line, at most two buttons ----------
    function stateBar(state) {
        const A = AB.fx.datasets.transactionsApril;
        const prog = (pct, why) => AB.tip(h("span", { class: "k-progress", role: "progressbar", tabindex: "0", "aria-valuenow": String(pct), "aria-valuemin": "0", "aria-valuemax": "100" }, h("i", { style: "width:" + pct + "%" })), pct + "% done", { second: why });
        const line = (...kids) => h("span", { class: "rr-line" }, kids);
        switch (state) {
            case "settings-changed":
            case "hierarchy-level":
                return { text: "Settings changed", why: "Settings changed since the run. The communities shown are from the last run. Rerun replaces them; Run as copy (in \"...\") keeps them and adds a new row.", actions: [{ label: "Rerun", go: [SELF, "cannot-cancel"] }, { label: "Revert", go: [SELF, "data"] }] };
            case "running":
                return { text: line(prog(40), "Rerunning"), why: "Rerunning on April data. Showing the March result until it finishes", actions: [{ label: "Cancel", go: [SELF, "out-of-date"] }] };
            case "queued":
                return { text: "Rerun queued, 2nd", why: "Starts when Betweenness finishes. The current result paints until then.", actions: [{ label: "Cancel", go: [SELF, "data"] }] };
            case "cannot-cancel":
                return { text: line(prog(70, "This step cannot be stopped"), "Rerunning, cannot be stopped"), why: "This step cannot be stopped. The current result paints until it finishes.", actions: [] };
            case "partial":
                return { text: "Partial result", why: "Stopped at the time limit. The communities found so far paint. They are not final.", actions: [{ label: "Rerun", go: [SELF, "cannot-cancel"] }] };
            case "failed":
                return { text: line(icon("circle-x", "sm"), "Rerun failed", AB.openQuestion("the element's own wording for a failed Louvain run, shown word for word in this tooltip")), why: "The rerun on April data failed. Nothing changed: the March result is still shown.", actions: [{ label: "Retry", go: [SELF, "running"] }] };
            case "out-of-date":
                return { text: "Out of date", why: "Computed on March data. Now April (" + A.file + "): " + A.versionDiff.accountsAdded + " accounts added, " + A.versionDiff.accountsRemoved + " removed.", actions: [{ label: "Rerun", go: [SELF, "running"] }] };
            default:
                return null;
        }
    }

    // ---------- Style tab: Fill color bound to the communities ----------
    function styleTab(W) {
        const pal = AB.fx.canvas.categorical;
        return AB.styleTab({
            kind: "node", kinds: ["node"],
            paints: ["Paints " + fmt(W.nodes) + " " + W.unit, ["table-dock", W.table]],
            set: {},
            bound: { "node.color": { field: "Louvain communities", palette: "Eight distinct", ramp: [pal[0], pal[pal.length - 1]] } },
        });
    }

    // ---------- Data tab ----------
    function sizes(W) {
        const max = W.rows[0].count, min = W.rows[W.rows.length - 1].count;
        const bars = W.rows.map((r) => AB.tip(h("span", { tabindex: "-1", role: "img", "aria-label": r.name + ": " + fmt(r.count) + " " + W.unit, style: `height:${Math.max(4, Math.round((r.count / max) * 100))}%;background:${r.color}` }), r.name + ": " + fmt(r.count) + " " + W.unit, { label: false }));
        const cap = W.other
            ? fmt(max) + " to " + fmt(min) + " " + W.unit + " in the largest " + W.rows.length + "; " + W.other.communities + " more hold " + fmt(W.other.count)
            : fmt(max) + " to " + fmt(min) + " " + W.unit + " each, largest first";
        return { summary: cap, body: [
            h("div", { class: "rr-sizes", role: "img", "aria-label": "Community sizes, largest first: " + W.rows.map((r) => r.count).join(", ") + (W.other ? ", then " + W.other.communities + " more" : "") }, bars),
            h("div", { class: "ab-cap k-secondary" }, cap),
        ] };
    }

    // Every option of the run, and whether it differs from the element's default (or is always shown)
    // A dropdown field's menu: AB.openMenu, each pick navigates
    const pick = (anchor, items) => AB.openMenu(anchor, items.map((it) => it.heading || it.sep || it.needs ? it : Object.assign({}, it, { go: undefined, onClick: () => AB.go(it.go[0], it.go[1]) })));

    function options(W, state) {
        const override = state === "weight-override";
        // The weight dropdown: the loaded weight first, then None and the other numeric edge attributes
        // (Les Miserables and the transfers each have one: the loaded one). Picking another value edits the run.
        const loaded = "loaded weight (" + W.weight + ")";
        const weightMenu = (e) => pick(e.currentTarget, [
            { label: loaded, check: !override, desc: "Chosen when the data was loaded; every run uses it unless the run picks another", go: override ? EDIT : [SELF, state] },
            { label: "None", check: override, desc: "Every edge counts the same", go: override ? [SELF, state] : EDIT },
        ]);
        const weightValue = override ? "None, this run's override" : loaded;
        const weightField = AB.field(weightValue, { caret: true, onClick: weightMenu });
        weightField.classList.add("rr-wrap");
        weightField.setAttribute("aria-label", "Weight: " + weightValue);
        // Higher weight: Stronger | Farther | Capacity, defaulted from the meaning chosen when the data was loaded
        const meaningMenu = (e) => pick(e.currentTarget, [
            { label: "Stronger", check: true, desc: "As loaded: a heavier edge holds its ends closer", go: [SELF, state] },
            { label: "Farther", desc: "A heavier edge is a longer distance", go: EDIT },
            { label: "Capacity", desc: "A heavier edge carries more", go: EDIT },
        ]);
        const meaningField = AB.field("Stronger, as loaded", { caret: true, onClick: meaningMenu });
        meaningField.classList.add("rr-wrap");
        meaningField.setAttribute("aria-label", "What a higher weight means: Stronger, as loaded");
        const meaning = override ? null : h("span", { class: "rr-col" }, meaningField, AB.needsElement(WEIGHT_NEEDS));
        const changed = state === "settings-changed";
        const hier = state === "hierarchy-level";
        const partial = state === "partial";
        const levelMenu = (e) => pick(e.currentTarget, [
            { heading: "Paint the communities of" },
            { label: "Final level, most merged", check: !hier, go: [SELF, "data"] },
            { label: "First level, least merged", check: hier, go: [SELF, "hierarchy-level"] },
            { sep: true },
            { label: "Levels in between", needs: "how many levels graphty-element reports for a Louvain run" },
        ]);
        const opt = (value, o) => AB.field(value, Object.assign({ go: EDIT }, o || {}));
        const check = (label, on) => {
            const b = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(on), "aria-label": label });
            AB.nav(b, EDIT[0], EDIT[1]);
            return b;
        };
        return [
            // shown: differs from the default, or always shown (Level, Stop after)
            [true, "Weight", weightField],
            [!override, "Higher weight", meaning],
            [changed, "Resolution", opt(changed ? "1.2, was 1.0" : "1.0")],
            [true, "Level", AB.field(hier ? "First, was Final" : "Final, most merged", { caret: true, onClick: levelMenu })],
            [true, "Stop after", opt(partial ? "10 seconds" : "No limit", { caret: true })],
            [false, "Seed", opt(W.lm ? "7" : "11")],
            [false, "Scope", opt("Full graph", { caret: true })],
            [false, "Direction", W.lm ? h("span", { class: "k-secondary" }, "None in this graph") : AB.seg([["follow", "Follow"], ["ignore", "Ignore"]], "ignore", () => AB.go(EDIT[0], EDIT[1]), { label: "Direction" })],
            [false, "Max iterations", opt("100")],
            [false, "Tolerance", opt("0.000001")],
            [false, "Optimized", check("Use the optimized implementation", true)],
        ];
    }

    function dataTab(W, state) {
        const partial = state === "partial";
        const hier = state === "hierarchy-level";
        const all = options(W, state);
        const shown = all.filter((o) => o[0]);
        const rest = all.length - shown.length;
        const madeWith = [
            shown.map(([, l, c]) => AB.fieldRow(l, c)),
            h("div", { class: "rr-all" }, AB.tip(AB.link(SELF, "all-options", "All options...", { "data-rr": "all-options" }), rest + " more, at their defaults", { label: false }), " ", AB.needsElement(ELEMENT_OPTS)),
            W.version ? AB.fieldRow("Data", AB.link("data-place", "versions", W.version)) : null,
        ];
        const override = state === "weight-override";
        // Stand-in values where the fixtures hold none, each followed by its open question (the user-test build hides the chip)
        const NOT_IN_FX = "the communities and modularity of an unweighted Louvain run on Les Miserables are stand-ins";
        const val = (v, q) => h("span", null, v + " ", AB.openQuestion(q));
        const n = override ? val("5", NOT_IN_FX) : hier ? val(String(W.communities) + ", until rerun at this level", "how many communities the first level holds") : partial ? "Not final" : AB.link("graph-place", W.lm ? "louvain-open" : "many-groups", String(W.communities));
        return AB.dataTab({
            Summary: { summary: partial ? "Not final" : override ? "Unweighted run: 5 communities, modularity 0.55" : W.communities + " communities, modularity " + W.modularity, body: [
                AB.data("Modularity", override ? val("0.55", NOT_IN_FX) : partial ? h("span", null, "Not final ", AB.openQuestion("which readings the element reports for a run stopped early")) : String(W.modularity)),
                AB.data("Communities", n),
            ] },
            Sizes: partial || hier || override ? null : sizes(W),
            "Made with": { summary: "Weight: " + (override ? "None, this run's override" : "loaded weight (" + W.weight + ")") + (state === "settings-changed" ? ", resolution 1.2" : "") + ", " + (hier ? "first" : "final") + " level", body: madeWith },
            Notes: { count: W.lm ? 1 : 0, target: ["notes-place", "about-selection"] },
        }, { kind: "run" });
    }

    // ---------- the readings-only run: one body, no Style ----------
    function readingsOnly() {
        const LM = AB.fx.datasets.lesmis;
        return AB.inspector({
            icon: "gauge", title: "Density", kind: "Run", kindKey: "run-row-readings",
            provenance: ["from Analyze", "analyze-popover", "open"], menu: MENU, renameDisabled: RUN_LABEL,
            body: AB.dataTab({
                Summary: { summary: "Density " + LM.stats.density, body: [
                    AB.data("Density", String(LM.stats.density)),
                    AB.data(LM.frame.componentsName, String(LM.stats.components)),
                    AB.data("Isolated nodes", String(LM.stats.isolated)),
                    AB.data("Average degree", String(LM.stats.averageDegree)),
                ] },
                Notes: { count: 0 },
            }, { kind: "run" }),
        });
    }

    function build(state) {
        if (state === "readings-only") return readingsOnly();
        const W = world(state);
        return AB.inspector({
            icon: AB.ICON.run, title: "Louvain", kind: "Run", kindKey: "run-row",
            provenance: ["from Analyze", "analyze-popover", "open"],
            menu: MENU,
            renameDisabled: RUN_LABEL,
            stateBar: stateBar(state),
            // The shared out-of-date mark, only where the result no longer matches its settings or data
            changed: ["settings-changed", "hierarchy-level", "out-of-date"].includes(state),
            tabs: { Style: () => styleTab(W), Data: () => dataTab(W, state) },
            tab: TAB[state],
        });
    }

    // The All options popover: every run option, left of the inspector; any edit raises the state bar
    function allOptions() {
        const W = world("data");
        return AB.popover({
            anchor: "#ab-right [data-rr=all-options]", title: "Louvain options", width: 300,
            body: options(W, "data").map(([, l, c]) => AB.fieldRow(l, c, { popover: true })),
        });
    }

    // Delete acts at once, with Undo
    function del() {
        AB.go("graph-place", "at-rest");
        // the shell clears the notice slot when the new route renders, so post it after that
        setTimeout(() => AB.deleted("Louvain and 6 communities", () => AB.go(SELF, "data")), 50);
    }

    // The "..." menu over the inspector, with Restore an earlier result in view
    function runMenu() {
        return AB.menu({
            anchor: "#ab-right .ab-insp-sub .k-icon-btn", place: "below-end",
            items: [
                { heading: "Louvain" },
                { label: "Rerun", go: [SELF, "cannot-cancel"] },
                { label: "Run as copy", desc: "Keeps this run; the copy lands on top", go: ["graph-place", "finished"] },
                { label: "Restore an earlier result", needs: NO_EARLIER },
                { label: "Restore the suggested look" },
                { sep: true },
                { label: "Show members in table", go: ["table-dock", "communities"] },
                { label: "Lay out by these groups" },
                { label: "Compare with another run...", needs: "graphty-element cannot compare two runs' results" },
                { sep: true },
                { label: "Add note", shortcut: "N", onClick: () => AB.addNote() },
                { label: "Lock" },
                { label: "Hide from list (keeps painting)", go: ["graph-place", "show-hidden"] },
                { sep: true },
                { label: "Delete", shortcut: "Del", onClick: del },
            ],
        });
    }

    registerSection({
        id: SELF,
        title: "Inspector: a run row",
        region: "right",
        rail: "graph",
        frame: (state) => {
            if (TRANSFERS.includes(state)) return { left: "graph-place/many-groups", canvas: "canvas-and-states/transfers-communities" };
            const f = { left: "graph-place/" + (state === "readings-only" ? "at-rest" : "louvain-open"), dock: "table-dock/communities" };
            if (state === "earlier-results" || state === "all-options") f.overlay = SELF + "/" + state;
            return f;
        },
        states: [
            { id: "style", label: "Style tab" },
            { id: "data", label: "Data tab" },
            { id: "all-options", label: "Data: All options popover" },
            { id: "settings-changed", label: "Settings changed since the run" },
            { id: "weight-override", label: "Made with: this run's weight override" },
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
            { id: "hierarchy-level", label: "Hierarchy: first level chosen" },
            { id: "rename-disabled", label: "Rename refused (tooltip)" },
        ],
        render(el, state, ctx) {
            if (ctx && ctx.region === "overlay") {
                if (state === "earlier-results") el.append(runMenu());
                if (state === "all-options") el.append(allOptions());
                return;
            }
            el.append(build(state));
            // The refusal is the name's tooltip, nothing else: focus the name so it shows
            if (state === "rename-disabled") requestAnimationFrame(() => { const n = el.querySelector(".ab-insp-head .k-name"); if (n) n.focus(); });
        },
    });
})();
