/* Inspector: a run row, in the one inspector frame (version 3). The Louvain run on Les Miserables
   (6 communities, modularity 0.565) and the readings-only Density run; and, for the states that need
   two data versions (rerun on April data, failed, out of date) and for many groups, the Louvain run
   on the transfers (datasets.transactionsApril), framed by the transfers tree and canvas.
   Header: the tree's kind icon (layers) and the tree's name, "Louvain"; parameters are in the kind
   line and Made with. Style tab: the shared Style tab, Fill color bound to the run's communities;
   the bound value opens the one Binding popover (palette, order, overflow). Data tab: Summary,
   Sizes (one size chart for any number of communities), Made with (the run's record -- method, weight
   and how a higher weight converts, seed -- then only the other settings that differ
   from the default; every option in the All
   options popover; any edit raises the state bar), Notes. Summary reads in plain counts ("6 communities and no
   unconnected nodes") with modularity and its one-line plain reading; every reading's name carries
   its meaning as a tooltip (hover and keyboard focus). Sizes lists each community with its hub,
   counted by its degree inside the community, and the overflow "Other" in the light overflow gray
   with its members. The header's provenance names the run with its date ("from Louvain, Sep 28").
   State bars speak in the past tense about what the run used and what changed since (out of date,
   weight meaning changed, a filter changed the scope, failed). Made with names where the weight came from: "loaded weight (value)" when the run used
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
.ab-statebar > .k-ellipsis:has(> .rr-bar) { white-space: normal; overflow: visible; text-overflow: clip; }
.rr-groups { padding: 4px 16px 8px; display: flex; flex-direction: column; gap: 2px; }
.rr-group { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto; gap: 6px; align-items: center; min-height: 20px; }
.rr-members { grid-column: 2 / -1; white-space: normal; }
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
    const TAB = { style: "Style", data: "Data", "all-options": "Data", "hierarchy-level": "Data", "weight-override": "Data",
        finished: "Data", "settings-changed": "Data", "out-of-date": "Data", "data-changed": "Data", "meaning-changed": "Data", "scope-changed": "Data", failed: "Data", "many-groups": "Data" };
    // The run's date, the name its provenance gives it (no duration is ever its name)
    const RAN = "Sep 28";
    // Made with's one line when no option differs (the readings-only run)
    const DEFAULTS = "Every option at its default";
    // Each reading's one-line meaning: the reading's name shows it on hover and on keyboard focus
    const MEANING = {
        Communities: "Groups of nodes linked more to each other than to the rest of the graph",
        "Unconnected nodes": "Nodes with no links at all; none of them belongs to a community",
        Modularity: "How much more often links fall inside communities than chance would give: 0 is no grouping, near 1 is sharply split",
        Density: "The share of all possible links that exist",
        "Connected components": "Pieces of the graph with no link between them",
        "Isolated nodes": "Nodes with no links at all",
        "Average degree": "Links per node, on average",
    };
    function reading(name, value, o) {
        const d = AB.data(name, value, o);
        const n = d.querySelector(".k-name");
        n.tabIndex = 0;
        AB.tip(n, MEANING[name] || name, { label: false });
        return d;
    }
    // Modularity in plain words, one line
    const plainModularity = (q) => q >= 0.5 ? "Strong grouping: far more links fall inside the communities than between them"
        : q >= 0.3 ? "Clear grouping: more links fall inside the communities than between them"
        : "Weak grouping: the communities are barely denser than chance";
    // Les Miserables: each community's hub, counted by its degree inside the community
    const LESMIS_HUBS = [["Gavroche", 16], ["Valjean", 15], ["Myriel", 9], ["Fantine", 9], ["Thenardier", 8], ["Gillenormand", 5]];
    const HUB_Q = "each community's hub and its degree inside the community are stand-ins until graphty-element reports them for a run";

    // Les Miserables: Louvain weighted by value, resolution 1.0
    const LESMIS_RUN = [[1, 25, "#E69F00"], [2, 17, "#56B4E9"], [3, 10, "#009E73"], [4, 10, "#0072B2"], [5, 9, "#D55E00"], [6, 6, "#CC79A7"]];
    const TRANSFERS = ["many-groups", "running", "failed", "data-changed"];
    // Les Miserables states framed by a filter step that leaves fewer nodes than the run read
    // (out of date by its scope: the result keeps painting the nodes it ran on)
    const SCOPED = ["out-of-date", "scope-changed"];

    function world(state) {
        const fx = AB.fx, A = fx.datasets.transactionsApril, M = fx.datasets.transactions;
        if (!TRANSFERS.includes(state))
            return { lm: true, unit: "nodes", weight: "value", table: "communities", nodes: fx.datasets.lesmis.nodes, communities: LESMIS_RUN.length, modularity: 0.565, seed: 7, isolated: fx.datasets.lesmis.stats.isolated,
                rows: LESMIS_RUN.map(([n, c, col], i) => ({ name: "Community " + n, color: col, count: c, hub: LESMIS_HUBS[i] })), other: null, version: null };
        // the transfers tree and canvas this section is framed by show the March result
        const c = A.louvain.march, lg = A.legends.march;
        return { lm: false, unit: "accounts", weight: "amount", table: "transfers", nodes: M.nodes, communities: c.communities, modularity: c.modularity, seed: 11, isolated: M.stats.isolated,
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
                return { text: "Settings changed since the run", why: "Settings changed since the run. The communities shown are from the last run. Rerun replaces them; Run as copy (in \"...\") keeps them and adds a new row.", actions: [{ label: "Rerun", go: [SELF, "cannot-cancel"] }, { label: "Revert", go: [SELF, "data"] }] };
            case "running":
                return { text: line(prog(40), "Rerunning"), why: "Rerunning on April data. Showing the March result until it finishes", actions: [{ label: "Cancel", go: [SELF, "data-changed"] }] };
            case "queued":
                return { text: "Rerun queued, 2nd", why: "Starts when Betweenness finishes. The current result paints until then.", actions: [{ label: "Cancel", go: [SELF, "data"] }] };
            case "cannot-cancel":
                return { text: line(prog(70, "This step cannot be stopped"), "Rerunning, cannot be stopped"), why: "This step cannot be stopped. The current result paints until it finishes.", actions: [] };
            case "partial":
                return { text: "Partial result", why: "Stopped at the time limit. The communities found so far paint. They are not final.", actions: [{ label: "Rerun", go: [SELF, "cannot-cancel"] }] };
            case "failed":
                return { text: h("span", { class: "rr-bar" }, icon("circle-x", "sm"), " Rerun on April data failed and wrote nothing. The March result is still shown. ", AB.openQuestion("the element's own wording for a failed Louvain run, shown word for word in this tooltip")), why: "The rerun on April data failed and wrote nothing. The March result is still shown. Try again asks graphty-element to run it again; nothing is computed another way.", actions: [{ label: "Try again", go: [SELF, "running"] }] };
            case "data-changed":
                return { text: h("span", { class: "rr-bar" }, "Louvain used March data. It is now April: " + AB.count(A.versionDiff.accountsAdded, "account") + " added, " + AB.num(A.versionDiff.accountsRemoved) + " removed."), why: "Louvain ran on March data (" + A.previous.file + "). The data is now April (" + A.file + "). The March communities still paint until you rerun.", actions: [{ label: "Rerun", go: [SELF, "running"] }] };
            case "meaning-changed":
                return { text: h("span", { class: "rr-bar" }, "Louvain used value as a strength. It is now a distance."), why: "When Louvain ran, a higher value meant a stronger tie. The Data page now reads a higher value as a longer distance. The communities shown are from the old meaning until you rerun.", actions: [{ label: "Rerun", go: [SELF, "cannot-cancel"] }] };
            case "out-of-date":
            case "scope-changed": {
                const L = AB.fx.datasets.lesmis, now = L.filterSteps.after.step1;
                return { text: h("span", { class: "rr-bar" }, "Ran on " + AB.count(L.nodes, "node") + "; a filter now leaves " + AB.num(now)), why: "Louvain ran on the full graph. The filter step \"" + L.filterSteps.steps[0] + "\" now leaves " + AB.count(now, "node") + ". The result still paints the nodes it ran on until you rerun.", actions: [{ label: "Rerun on " + AB.num(now), go: [SELF, "cannot-cancel"] }] };
            }
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
        const OTHER = AB.fx.canvas.otherGray;
        // "Other" holds many communities: its bar is drawn at their average size, its label gives the total
        const all = W.other ? W.rows.concat([{ name: "Other", color: OTHER, count: W.other.count, other: true }]) : W.rows;
        const bars = all.map((r) => AB.tip(h("span", { tabindex: "-1", role: "img", "aria-label": r.name + ": " + fmt(r.count) + " " + W.unit, style: `height:${Math.max(4, Math.min(100, Math.round(((r.other ? r.count / W.other.communities : r.count) / max) * 100)))}%;background:${r.color}` }), r.name + ": " + fmt(r.count) + " " + W.unit + (r.other ? " in " + AB.count(W.other.communities, "community", { plural: "communities" }) + "; the bar shows their average" : ""), { label: false }));
        const cap = W.other
            ? fmt(max) + " to " + fmt(min) + " " + W.unit + " in the largest " + W.rows.length + "; " + W.other.communities + " more hold " + fmt(W.other.count)
            : fmt(max) + " to " + fmt(min) + " " + W.unit + " each, largest first";
        return { summary: cap, body: [
            h("div", { class: "rr-sizes", role: "img", "aria-label": "Community sizes, largest first: " + W.rows.map((r) => r.count).join(", ") + (W.other ? ", then Other, " + W.other.communities + " more communities" : "") }, bars),
            h("div", { class: "ab-cap k-secondary" }, cap),
            groups(W, all),
        ] };
    }
    // Each community: its swatch, name, size and hub (by degree inside it); "Other" lists its members
    function groups(W, all) {
        const lead = (n) => Number(String(n).replace(/\D+/g, " ").trim().split(" ")[0]);
        return h("div", { class: "rr-groups", role: "list", "aria-label": "Communities" }, all.map((r) => {
            let sub = null;
            if (r.hub) sub = h("span", { class: "rr-members k-secondary" }, "Hub " + r.hub[0] + ", " + AB.count(r.hub[1], "link") + " inside");
            if (r.other) {
                const from = lead(W.other.holds), names = [];
                for (let i = 0; i < W.other.communities; i++) names.push(from + i);
                sub = h("span", { class: "rr-members k-secondary" }, AB.count(W.other.communities, "community", { plural: "communities" }) + ": Communities " + names.join(", "));
            }
            return h("div", { class: "rr-group", role: "listitem" }, AB.chit(r.color, true), h("span", { class: "k-ellipsis" }, r.name), h("span", { class: "k-num k-secondary" }, AB.num(r.count)), sub);
        }), W.lm ? h("div", null, AB.openQuestion(HUB_Q)) : null);
    }

    // Every option of the run: [shown in Made with, label, control, its words in Made with's closed summary].
    // The run's record (method, weight and how a higher weight converts, seed) is always shown;
    // any other option only where it differs from the element's default.
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
            [true, "Method", h("span", null, "Louvain"), "Louvain"],
            [true, "Weight", weightField, override ? "no weight, this run's override" : "weight " + W.weight],
            [!override, "Higher weight", meaning || h("span", { class: "k-secondary" }, "No weight"), "higher is stronger"],
            [true, "Seed", opt(String(W.seed)), "seed " + W.seed],
            [changed, "Resolution", opt(changed ? "1.2, was 1.0" : "1.0"), "resolution 1.2"],
            [hier, "Level", AB.field(hier ? "First, was Final" : "Final, most merged", { caret: true, onClick: levelMenu }), "first level"],
            [partial, "Stop after", opt(partial ? "10 seconds" : "No limit", { caret: true }), "stop after 10 seconds"],
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
        const rest = all.filter((o) => o[0] === false).length;
        const madeWith = [
            shown.map(([, l, c]) => AB.fieldRow(l, c)),
            h("div", { class: "rr-all" }, AB.tip(AB.link(SELF, "all-options", "All options...", { "data-rr": "all-options" }), rest + " more, at their defaults", { label: false }), " ", AB.needsElement(ELEMENT_OPTS)),
            W.version ? AB.fieldRow("Data", AB.link("data-place", "versions", W.version)) : null,
            AB.fieldRow("Ran", h("span", null, RAN)),
        ];
        const override = state === "weight-override";
        // Stand-in values where the fixtures hold none, each followed by its open question (the user-test build hides the chip)
        const NOT_IN_FX = "the communities and modularity of an unweighted Louvain run on Les Miserables are stand-ins";
        const val = (v, q) => h("span", null, v + " ", AB.openQuestion(q));
        const n = override ? val("5", NOT_IN_FX) : hier ? val(String(W.communities) + ", until rerun at this level", "how many communities the first level holds") : partial ? "Not final" : AB.link("graph-place", W.lm ? "louvain-open" : "many-groups", String(W.communities));
        const q = override ? 0.55 : W.modularity;
        const plain = AB.count(override ? 5 : W.communities, "community", { plural: "communities" }) + " and " + (W.isolated ? AB.count(W.isolated, "unconnected node") : "no unconnected nodes");
        return AB.dataTab({
            Summary: { summary: partial ? "Not final" : (override ? "Unweighted run: " : "") + plain + ", modularity " + AB.num(q), body: [
                partial || hier ? null : h("div", { class: "ab-cap" }, plain),
                reading("Communities", n),
                reading("Unconnected nodes", AB.num(W.isolated)),
                reading("Modularity", override ? val("0.55", NOT_IN_FX) : partial ? h("span", null, "Not final ", AB.openQuestion("which readings the element reports for a run stopped early")) : AB.num(W.modularity)),
                partial ? null : h("div", { class: "ab-cap k-secondary" }, plainModularity(q)),
            ] },
            Sizes: partial || hier || override ? null : sizes(W),
            "Made with": { summary: shown.map((o) => o[3]).join(", ") + ", ran " + RAN, body: madeWith },
            Notes: { count: W.lm ? 1 : 0, target: ["notes-place", "about-selection"] },
        }, { kind: "run" });
    }

    // ---------- the readings-only run: one body, no Style ----------
    function readingsOnly() {
        const LM = AB.fx.datasets.lesmis;
        return AB.inspector({
            icon: "gauge", title: "Density", kind: "Run", kindKey: "run-row-readings",
            provenance: ["from Density, " + RAN, "analyze-popover", "open"], menu: MENU, renameDisabled: RUN_LABEL,
            body: AB.dataTab({
                Summary: { summary: "Density " + AB.num(LM.stats.density), body: [
                    reading("Density", AB.num(LM.stats.density)),
                    reading(LM.frame.componentsName, AB.num(LM.stats.components)),
                    reading("Isolated nodes", AB.num(LM.stats.isolated)),
                    reading("Average degree", AB.num(LM.stats.averageDegree)),
                ] },
                // Density has no option that differs from its default; the run's record is its date
                "Made with": { summary: "Density, " + DEFAULTS.toLowerCase() + ", ran " + RAN, body: [
                    AB.fieldRow("Method", h("span", null, "Density")),
                    h("div", { class: "ab-cap k-secondary" }, DEFAULTS),
                    AB.fieldRow("Ran", h("span", null, RAN)),
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
            provenance: ["from Louvain, " + RAN, "analyze-popover", "open"],
            menu: MENU,
            renameDisabled: RUN_LABEL,
            stateBar: stateBar(state),
            // The shared out-of-date mark, only where the result no longer matches its settings or data
            changed: ["settings-changed", "hierarchy-level", "data-changed", "meaning-changed"].includes(state),
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
            if (SCOPED.includes(state)) {
                const L = AB.fx.datasets.lesmis;
                Object.assign(f, { chip: AB.count(L.filterSteps.after.step1, "node", { of: L.nodes }), filterOn: ["degree"] });
            }
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
            { id: "out-of-date", label: "Out of date: a filter changed the scope since the run" },
            { id: "data-changed", label: "Out of date after a data change (transfers, April data)" },
            { id: "meaning-changed", label: "Out of date: the weight's meaning changed since the run" },
            { id: "scope-changed", label: "A filter changed the scope since the run" },
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
