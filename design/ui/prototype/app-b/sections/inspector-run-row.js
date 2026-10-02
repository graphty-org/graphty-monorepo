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
   options popover, with damping and normalization listed as not used by Louvain; any edit raises the state bar), Notes. Summary reads in plain counts ("6 communities and no
   unconnected nodes") with modularity and its one-line plain reading; every reading's name carries
   its meaning as a tooltip (hover and keyboard focus). Sizes lists each community with its hub,
   counted by its degree inside the community, and the overflow "Other" in the light overflow gray
   with its members. The header's provenance names the run with its date ("from Louvain, Sep 28") and opens
   that run's own record in place: the Data tab with Made with open and in view, never the Analyze catalog.
   State bars speak in the past tense about what the run used and what changed since (out of date,
   weight meaning changed, a filter changed the scope, failed on WebGPU with "Try WebGPU again", finished and
   painting). Made with's one Weight line names the weight and how it was read ("value, stronger"), where an
   unweighted run says "Unweighted"; the All options popover splits it into Weight and Weight conversion.
   After the settings, Made with points to the data version the run read and when it ran. A hub's name
   selects its node. After new data (data-changed), one group's stayed, left, joined and silent counts and
   its stability on both versions, with no verdict. The state bar is one line, at most two buttons. Verbs live in "...". The tab is the
   one last chosen for a run, except in the states that exist to show one tab. The Louvain bound Color
   opens the run's Binding popover (Source, Palette, Order by, Overflow, Exceptions). Other run kinds: Density
   (readings only: gauge, no eye, no tabs), Link prediction (a pair list on its one body: pair icon, no
   eye) and a cover (Clique communities, whose Style tab says how a shared member is drawn), each with its
   row in the tree beside it. Plain ASCII. */
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
.rr-groups { padding: 4px 16px 8px; display: flex; flex-direction: column; gap: 6px; }
.rr-group { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto; gap: 6px; align-items: center; min-height: 20px; }
.rr-members { grid-column: 2 / -1; white-space: normal; }
.rr-all { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 0 16px 8px 112px; }
`;
    if (!document.getElementById("rr-style")) document.head.append(h("style", { id: "rr-style" }, CSS));

    const RUN_LABEL = "a run's name is its label, which graphty-element keeps read-only";
    const GROUP_LABEL = "a run's groups renumber when it reruns; Create set to name one";
    const NO_EARLIER = "a rerun replaces the result, and graphty-element keeps no earlier one";
    const MENU = ["context-menus", "run-row"];
    const SELF = "inspector-run-row";
    // graphty-element's Louvain options today: resolution, max iterations, tolerance, optimized
    const ELEMENT_OPTS = "graphty-element's Louvain has resolution, max iterations, tolerance and optimized; Level, Stop after, Seed and scope need it";
    const WEIGHT_NEEDS = "a run's caveats.weight records the attribute and meaning but not whether it came from the loaded weight, and the weight meaning has no Capacity yet";
    const EDIT = [SELF, "settings-changed"];
    // A failed WebGPU run's retry: graphty-element runs it on WebGPU again, never on the CPU instead
    const TRY_GPU = "Try WebGPU again";
    const TRY_GPU_TIP = "Runs it on WebGPU once more; nothing is computed on the CPU instead";
    const NO_COMPARE = "graphty-element does not compare two runs' results yet";
    const NO_CHECK = "graphty-element has no null-model or seed-stability check";
    // The states that exist to show one tab; every other state opens on the tab last chosen
    const TAB = { style: "Style", binding: "Style", data: "Data", "all-options": "Data", "hierarchy-level": "Data", "weight-override": "Data",
        finished: "Style", "settings-changed": "Data", "out-of-date": "Data", "data-changed": "Data", "meaning-changed": "Data", "scope-changed": "Data", failed: "Data", "many-groups": "Data" };
    // The run's date, the name its provenance gives it (no duration is ever its name)
    const RAN = "Sep 28";
    // Made with's one line when no option differs (the readings-only run)
    const DEFAULTS = "Every option at its default";
    // A record field the method does not read (damping, normalization on Louvain)
    const NOT_USED = "Not used by Louvain";
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
    const HUB_Q = "each community's hub and its degree inside the community, which graphty-element does not report for a run yet";

    // Les Miserables: Louvain weighted by value, resolution 1.0
    const LESMIS_RUN = [[1, 25, "#E69F00"], [2, 17, "#56B4E9"], [3, 10, "#009E73"], [4, 10, "#0072B2"], [5, 9, "#D55E00"], [6, 6, "#CC79A7"]];
    const TRANSFERS = ["many-groups", "running", "failed", "data-changed", "finished"];
    // Les Miserables states framed by a filter step that leaves fewer nodes than the run read
    // (out of date by its scope: the result keeps painting the nodes it ran on)
    const SCOPED = ["out-of-date", "scope-changed"];

    function world(state) {
        const fx = AB.fx, A = fx.datasets.transactionsApril, M = fx.datasets.transactions;
        if (!TRANSFERS.includes(state))
            return { lm: true, unit: "node", weight: "value", table: "communities", nodes: fx.datasets.lesmis.nodes, communities: LESMIS_RUN.length, modularity: 0.565, seed: 7, isolated: fx.datasets.lesmis.stats.isolated,
                rows: LESMIS_RUN.map(([n, c, col], i) => ({ name: "Community " + n, color: col, count: c, hub: LESMIS_HUBS[i] })), other: null,
                // the data version the run read: Les Miserables has one, the file as loaded
                version: fx.datasets.lesmis.file, versionGo: null };
        // the transfers tree and canvas this section is framed by show the March result
        const c = A.louvain.march, lg = A.legends.march;
        return { lm: false, unit: "account", weight: "amount", table: "transfers", nodes: M.nodes, communities: c.communities, modularity: c.modularity, seed: 11, isolated: M.stats.isolated,
            rows: lg.rows.map((r) => ({ name: r.name, color: r.color, count: r.count })), other: lg.other,
            // the data version the run read: March; once April replaced it, the record says so
            version: state === "finished" ? "March" : "March, now April",
            versionGo: ["full-canvas-modes", state === "finished" ? "no-versions" : "version-history"] };
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
                return { text: h("span", { class: "rr-bar" }, icon("circle-x", "sm"), " Failed on WebGPU and wrote nothing; the March result still shows. ", AB.openQuestion("the element's own wording for a failed WebGPU run, shown word for word in this tooltip")), why: "The rerun on April data failed on WebGPU and wrote nothing. The March result is still shown. Try WebGPU again runs it on WebGPU once more; nothing is computed on the CPU instead.", actions: [{ label: TRY_GPU, tip: TRY_GPU_TIP, go: [SELF, "running"] }] };
            case "finished":
                return { text: h("span", { class: "rr-bar" }, "Finished: now paints Color by its " + AB.count(A.louvain.march.communities, "community", { plural: "communities" }) + ". The result stays in the list."), why: "The run finished and its communities paint the accounts at once; nothing else needs applying. Its result stays in the list, so another run can be set beside it." };
            case "data-changed":
                return { text: h("span", { class: "rr-bar" }, "Louvain used March data. It is now April: " + AB.count(A.versionDiff.transfersAdded, "transfer") + " added, " + AB.num(A.versionDiff.transfersRemoved) + " removed."), why: "Louvain ran on March data (" + A.previous.file + "). The data is now April (" + A.file + "). The March communities still paint until you rerun.", actions: [{ label: "Rerun", go: [SELF, "running"] }] };
            case "meaning-changed":
                return { text: h("span", { class: "rr-bar" }, "Louvain used value as a strength. It is now a distance."), why: "When Louvain ran, a higher value meant a stronger tie. The Data page now reads a higher value as a longer distance. The communities shown are from the old meaning until you rerun.", actions: [{ label: "Rerun", go: [SELF, "cannot-cancel"] }] };
            case "out-of-date":
            case "scope-changed": {
                const L = AB.fx.datasets.lesmis, now = L.filterSteps.after.step1;
                return { text: h("span", { class: "rr-bar" }, "Ran on " + AB.count(L.nodes, "node") + "; a filter now leaves " + AB.num(now) + ". A rerun keeps this result under \"...\" > Restore an earlier result. ", AB.needsElement(NO_EARLIER)), why: "Louvain ran on the full graph. The filter step \"" + L.filterSteps.steps[0] + "\" now leaves " + AB.count(now, "node") + ". The result still paints the nodes it ran on until you rerun; after a rerun it is kept, and Restore an earlier result in \"...\" brings it back.", actions: [{ label: "Rerun on " + AB.num(now), go: [SELF, "cannot-cancel"] }] };
            }
            default:
                return null;
        }
    }

    // ---------- Style tab: Fill color bound to the communities ----------
    // On Les Miserables the bound value and its bind icon open this run's Binding popover (palette, order,
    // overflow, exceptions); the transfers keep the palette picker
    function styleTab(W) {
        const pal = AB.fx.canvas.categorical;
        const tab = AB.styleTab({
            kind: "node", kinds: ["node"],
            paints: ["Paints " + AB.count(W.nodes, W.unit), ["table-dock", W.table]],
            set: {},
            bound: { "node.color": { field: "Louvain communities", palette: "Eight distinct", ramp: [pal[0], pal[pal.length - 1]], go: "palette" } },
        });
        return W.lm ? toBinding(tab, "binding") : tab;
    }
    // The shared Style tab sends a bound value to style-pickers; a run's bound Color opens its own Binding.
    // Caught in the capture phase, so it holds after the tab redraws a line.
    const BOUND = '.ab-sline[data-ch="node.color"] :is(.ab-bound, .k-icon-btn[aria-label$="by attribute"])';
    function toBinding(tab, state) {
        const open = (e) => {
            if (!e.target.closest(BOUND) || (e.type === "keydown" && e.key !== "Enter" && e.key !== " ")) return;
            e.preventDefault();
            e.stopPropagation();
            AB.go(SELF, state);
        };
        tab.addEventListener("click", open, true);
        tab.addEventListener("keydown", open, true);
        return tab;
    }

    // ---------- the Binding popover of a run: Fill color from its groups ----------
    // Source is the run's own groups; Palette opens the shared palette picker; Order by and Overflow are
    // plain menus; Exceptions give one child its own color. Every change applies live.
    const ORDER = ["Size, largest first", "Size, smallest first", "Hub name, A to Z"];
    const OVERFLOW = [["Other, in gray", "Every group past the palette's last color is drawn in the overflow gray"], ["Repeat the colors with a second shape", "Groups past the last color reuse the colors, drawn with another shape"], ["Extend the palette", "Adds colors past the palette's last, each kept clear of its neighbors"]];
    // A plain menu field that applies its pick live: items are [value, its tooltip]
    function choice(label, items, cur, say) {
        const f = AB.field(cur, { caret: true, onClick: () => AB.openMenu(f, items.map(([v, desc]) => ({ label: v, desc, check: v === cur, onClick: () => { cur = v; f.querySelector(".k-ellipsis").textContent = v; f.setAttribute("aria-label", label + ": " + v); AB.announce(say + ": " + v); } }))) });
        f.setAttribute("aria-label", label + ": " + cur);
        return f;
    }
    function bindingPopover(run) {
        const pal = AB.fx.canvas.categorical;
        const strip = h("span", { style: "display:inline-flex;gap:1px", "aria-hidden": "true" }, pal.slice(0, 6).map((c) => AB.chit(c, true)));
        const palField = AB.field(h("span", { class: "rr-line" }, strip, "Eight distinct"), { caret: true, go: ["style-pickers", "palette-categories"] });
        palField.setAttribute("aria-label", "Palette: Eight distinct");
        const over = run.groups.length > pal.length;
        // Exceptions: a child that keeps its own color whatever the palette and order give it
        const except = [];
        const body = h("div");
        const sec = AB.section({ title: "Exceptions", editable: true }, body);
        const draw = () => {
            body.replaceChildren(...(except.length
                ? except.map((g) => AB.fieldRow(g.name, AB.colorField({ name: g.name, hex: g.color, pct: 100 }), { popover: true }))
                : [AB.empty("None: every " + run.noun + " takes its color from the palette.")]));
            const left = run.groups.filter((g) => !except.includes(g));
            const p = AB.plus({ label: "Add an exception", items: left.map((g) => ({ label: g.name, desc: "Keep " + g.name + "'s color whatever the palette and order give it" })), onAdd: (it) => { except.push(run.groups.find((g) => g.name === it.label)); draw(); AB.announce(it.label + " keeps its own color"); } });
            const head = sec.querySelector(".k-section-head"), old = head.querySelector(".ab-plus, .k-icon-btn");
            if (old) old.remove();
            if (p) head.append(p);
        };
        draw();
        return AB.popover({
            anchor: "#ab-right .ab-bound", title: "Color by " + run.field, width: 320,
            body: [
                AB.fieldRow("Source", h("span", { class: "rr-line" }, AB.typeGlyph("cat"), run.field), { popover: true }),
                AB.fieldRow("Palette", palField, { popover: true }),
                AB.fieldRow("Order by", choice("Order by", ORDER.map((o) => [o]), ORDER[0], "Colors in order of"), { popover: true }),
                AB.fieldRow("Overflow", h("span", { class: "rr-col" }, choice("Overflow", OVERFLOW, OVERFLOW[0][0], "Overflow"),
                    h("span", { class: "k-secondary" }, over ? AB.count(run.groups.length - pal.length, run.noun, { plural: run.nouns }) + " past the last color" : "None now: " + AB.count(run.groups.length, run.noun, { plural: run.nouns }) + ", " + AB.count(pal.length, "color"))), { popover: true }),
                sec,
            ],
        });
    }
    const LOUVAIN_RUN = () => ({ field: "Louvain communities", noun: "community", nouns: "communities", groups: LESMIS_RUN.map(([n, , color]) => ({ name: "Community " + n, color })) });

    // ---------- Data tab ----------
    function sizes(W) {
        const max = W.rows[0].count, min = W.rows[W.rows.length - 1].count;
        const OTHER = AB.fx.canvas.otherGray;
        // "Other" holds many communities: its bar is drawn at their average size, its label gives the total
        const all = W.other ? W.rows.concat([{ name: "Other", color: OTHER, count: W.other.count, other: true }]) : W.rows;
        const bars = all.map((r) => AB.tip(h("span", { tabindex: "-1", role: "img", "aria-label": r.name + ": " + AB.count(r.count, W.unit), style: `height:${Math.max(4, Math.min(100, Math.round(((r.other ? r.count / W.other.communities : r.count) / max) * 100)))}%;background:${r.color}` }), r.name + ": " + AB.count(r.count, W.unit) + (r.other ? " in " + AB.count(W.other.communities, "community", { plural: "communities" }) + "; the bar shows their average" : ""), { label: false }));
        const cap = W.other
            ? AB.num(max) + " to " + AB.count(min, W.unit) + " in the largest " + W.rows.length + "; " + AB.num(W.other.communities) + " more hold " + AB.count(W.other.count, W.unit)
            : AB.num(max) + " to " + AB.count(min, W.unit) + " each, largest first";
        return { summary: cap, body: [
            h("div", { class: "rr-sizes", role: "img", "aria-label": "Community sizes, largest first: " + W.rows.map((r) => r.count).join(", ") + (W.other ? ", then Other, " + W.other.communities + " more communities" : "") }, bars),
            h("div", { class: "ab-cap k-secondary" }, cap),
            groups(W, all),
        ] };
    }
    // A hub's name selects its node, as a canvas click does
    function hubLink(name) {
        const i = AB.walkList("lesmis").findIndex((n) => n.name === name);
        if (i < 0) return name;
        const a = h("span", Object.assign({ class: "ab-link", role: "link" }, AB.act({ onClick: () => AB.selectNode("lesmis", i, { focus: false }) })), name);
        return AB.tip(a, "Select " + name, { label: false });
    }
    // The run's record after its settings: the data version it read (a pointer, never the load choices) and when it ran
    function record(W) {
        return { "Data version": W.versionGo ? AB.link(W.versionGo[0], W.versionGo[1], W.version) : W.version, Ran: RAN };
    }
    // After new data: what became of one group, as four counts, and its stability on both versions.
    // No verdict: whether the change is real or noise is the reader's call.
    function movement() {
        const A = AB.fx.datasets.transactionsApril, S = A.compareSelection, G = A.louvain.selected;
        const pct = (x) => Math.round(x * 100) + "% of reruns keep it together";
        return { summary: G.name + ": " + AB.num(S.marchMembersStillInIt) + " stayed, " + AB.num(S.marchMembersLeftIt) + " left, " + AB.num(S.joinedFromOtherGroups + S.joinedNew) + " joined, " + AB.num(S.marchMembersSilent) + " silent", body: [
            h("div", { class: "ab-cap" }, G.name + ", March to April"),
            AB.data("Stayed", AB.count(S.marchMembersStillInIt, "account")),
            AB.data("Left", AB.count(S.marchMembersLeftIt, "account")),
            AB.data("Joined", AB.count(S.joinedFromOtherGroups + S.joinedNew, "account") + ", " + AB.num(S.joinedNew) + " of them new"),
            AB.data("Silent", AB.count(S.marchMembersSilent, "account") + ", no transfers in April"),
            AB.data("Stability, March", pct(S.holdsInMarchReruns)),
            AB.data("Stability, April", pct(S.holdsInAprilReruns)),
            h("div", null, AB.needsElement("member movement between two runs, and stability across reruns, come from graphty-element")),
        ] };
    }
    // Each community: its swatch, name, size and hub (by degree inside it); "Other" lists its members
    function groups(W, all) {
        const lead = (n) => Number(String(n).replace(/\D+/g, " ").trim().split(" ")[0]);
        return h("div", { class: "rr-groups", role: "list", "aria-label": "Communities" }, all.map((r) => {
            let sub = null;
            if (r.hub) sub = h("span", { class: "rr-members k-secondary" }, "Hub ", hubLink(r.hub[0]), ", " + AB.count(r.hub[1], "link") + " inside");
            if (r.other) {
                const from = lead(W.other.holds);
                sub = h("span", { class: "rr-members k-secondary" }, "Communities " + from + " to " + (from + W.other.communities - 1));
            }
            return h("div", { class: "rr-group", role: "listitem" }, AB.chit(r.color, true), h("span", { class: "k-ellipsis" }, r.name), h("span", { class: "k-num k-secondary" }, AB.num(r.count)), sub);
        }), W.lm ? h("div", null, AB.openQuestion(HUB_Q)) : null);
    }

    // Every option of the run: [shown in Made with, label, control, its words in Made with's closed summary].
    // The run's record (method, weight and how a higher weight converts, seed) is always shown;
    // any other option only where it differs from the element's default.
    // A dropdown field's menu: AB.openMenu, each pick navigates
    const pick = (anchor, items) => AB.openMenu(anchor, items.map((it) => it.heading || it.sep || it.needs || !it.go ? it : Object.assign({}, it, { go: undefined, onClick: () => AB.go(it.go[0], it.go[1]) })));

    // `full`: the All options popover, where the weight and how it is read are two rows; Made with
    // names both in the one Weight line ("value, stronger"), where an unweighted run says "Unweighted"
    function options(W, state, full) {
        const override = state === "weight-override";
        // The weight dropdown: the loaded weight, or Unweighted (Les Miserables and the transfers each
        // have one numeric edge attribute: the loaded one); then what a higher weight means, defaulted
        // from the meaning chosen when the data was loaded. Picking another value edits the run.
        const read = override ? "farther" : "stronger";
        const weightMenu = (e) => pick(e.currentTarget, [
            { heading: "Weight" },
            { label: "loaded weight (" + W.weight + ")", check: true, desc: "Chosen when the data was loaded; every run uses it unless the run picks another", go: [SELF, state] },
            { label: "Unweighted", desc: "Every edge counts the same", go: EDIT },
            { sep: true },
            { heading: "A higher weight means" },
            { label: "Stronger", check: !override, desc: "As loaded: a heavier edge holds its ends closer", go: override ? [SELF, "data"] : [SELF, state] },
            { label: "Farther", check: override, desc: "A heavier edge is a longer distance", go: override ? [SELF, state] : [SELF, "weight-override"] },
            { label: "Capacity", desc: "A heavier edge carries more", go: EDIT },
        ]);
        // Made with is the record: one plain line, the size of "Unweighted"; the dropdowns are in All options
        const say = W.weight + ", " + read + (override ? " (override)" : "");
        const weightField = full ? AB.field("loaded weight (" + W.weight + ")", { caret: true, onClick: weightMenu }) : h("span", { tabindex: "0" }, say);
        if (full) weightField.classList.add("rr-wrap");
        AB.tip(weightField, full ? "Weight: loaded weight (" + W.weight + ")" : "Weight: the loaded weight " + W.weight + ", a higher value read as " + (override ? "a longer distance, this run's override" : "a stronger tie, as loaded"));
        const conversion = AB.field(override ? "Higher is farther, this run's override" : "Higher is stronger, as loaded", { caret: true, onClick: weightMenu });
        conversion.classList.add("rr-wrap");
        conversion.setAttribute("aria-label", "Weight conversion: " + conversion.textContent);
        const weightLine = full ? weightField : h("span", { class: "rr-col" }, weightField, AB.needsElement(WEIGHT_NEEDS));
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
            [true, "Weight", weightLine, "weight " + say],
            // null: named in Made with's Weight line, so not counted among the options at their defaults
            [null, "Weight conversion", conversion],
            [true, "Seed", opt(String(W.seed)), "seed " + W.seed],
            // Every run's record carries damping and normalization; Louvain reads neither, so they are
            // listed as not used (null: not counted among the options at their defaults)
            [null, "Damping", h("span", { class: "k-secondary" }, NOT_USED)],
            [null, "Normalization", h("span", { class: "k-secondary" }, NOT_USED)],
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
        ];
        const override = state === "weight-override";
        // Stand-in values where the fixtures hold none, each followed by its open question (the user-test build hides the chip)
        const NOT_IN_FX = "what Louvain finds on Les Miserables when value is read as a distance: its communities and modularity";
        const val = (v, q) => h("span", null, v + " ", AB.openQuestion(q));
        const n = override ? val("5", NOT_IN_FX) : hier ? val(String(W.communities) + ", until rerun at this level", "how many communities the first level holds") : partial ? "Not final" : AB.link("graph-place", W.lm ? "louvain-open" : "many-groups", String(W.communities));
        const q = override ? 0.55 : W.modularity;
        const plain = AB.count(override ? 5 : W.communities, "community", { plural: "communities" }) + " and " + (W.isolated ? AB.count(W.isolated, "unconnected node") : "no unconnected nodes");
        return AB.dataTab({
            Summary: { summary: partial ? "Not final" : (override ? "Value read as a distance: " : "") + plain + ", modularity " + AB.num(q), body: [
                partial || hier ? null : h("div", { class: "ab-cap" }, plain),
                reading("Communities", n),
                reading("Unconnected nodes", AB.num(W.isolated)),
                reading("Modularity", override ? val("0.55", NOT_IN_FX) : partial ? h("span", null, "Not final ", AB.openQuestion("which readings the element reports for a run stopped early")) : AB.num(W.modularity)),
                partial ? null : h("div", { class: "ab-cap k-secondary" }, plainModularity(q)),
            ] },
            Sizes: partial || hier || override ? null : sizes(W),
            "Since March": state === "data-changed" ? movement() : null,
            "Made with": { summary: shown.map((o) => o[3]).join(", ") + ", ran " + RAN, body: madeWith, provenance: record(W) },
            Notes: { count: W.lm ? 1 : 0, target: ["notes-place", "about-selection"] },
        }, { kind: "run" });
    }

    // "from Louvain, Sep 28" opens what it names: this run's own record (Made with), in place, in any
    // state, so a partial or failed run keeps its state bar. The inspector's provenance helper only
    // navigates, and a route to this same inspector would draw it as plain text, so the link is swapped here.
    const MADE_WITH = "data.run.made-with";
    function toRecord(wrap, label) {
        const old = wrap.querySelector(".ab-prov");
        if (!old) return wrap;
        const open = () => {
            AB.mem.set("sec." + MADE_WITH, "1");
            const tab = [...wrap.querySelectorAll(".k-tab")].find((t) => t.textContent === "Data");
            if (tab && tab.getAttribute("aria-selected") !== "true") tab.click();
            const sec = [...wrap.querySelectorAll(".ab-sec-btn")].find((b) => b.textContent === "Made with");
            if (!sec) return;
            if (sec.getAttribute("aria-expanded") === "false") sec.click();
            sec.scrollIntoView({ block: "start" });
            sec.focus();
        };
        const a = h("span", Object.assign({ class: "ab-link ab-prov k-ellipsis", role: "link" }, AB.act({ onClick: open })), label);
        AB.tip(a, "Run " + label + ": its record, how it was made", { label: false });
        old.replaceWith(a);
        return wrap;
    }

    // ---------- the readings-only run: one body, no Style ----------
    function readingsOnly() {
        const LM = AB.fx.datasets.lesmis;
        return toRecord(AB.inspector({
            icon: "gauge", title: "Density", kind: "Run", kindKey: "run-row-readings",
            provenance: ["from Density, " + RAN, SELF, "readings-only"], menu: MENU, renameDisabled: RUN_LABEL,
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
                ], provenance: record(world("readings-only")) },
                Notes: { count: 0 },
            }, { kind: "run" }),
        }), "from Density, " + RAN);
    }

    // ---------- two more run kinds on Les Miserables: a pair list and a cover ----------
    // Their results are worked out here from the fixture's edges, standing in for what graphty-element
    // reports for the run: Adamic-Adar scores for every unlinked pair that shares a neighbor, and clique
    // percolation (cliques of 3 sharing two nodes join), whose communities may share members.
    let lesmisRuns = null;
    function lesmisResults() {
        if (lesmisRuns) return lesmisRuns;
        const L = AB.fx.datasets.lesmis, nb = {}, name = {};
        L.rows.forEach((r) => { nb[r.id] = new Set(); name[r.id] = r.label; });
        L.edgeList.forEach(([a, b]) => { nb[a].add(b); nb[b].add(a); });
        const ids = Object.keys(nb), pairs = [];
        ids.forEach((a, i) => ids.slice(i + 1).forEach((b) => {
            if (nb[a].has(b)) return;
            const shared = [...nb[a]].filter((x) => nb[b].has(x));
            if (shared.length) pairs.push({ a: name[a], b: name[b], shared: shared.length, score: shared.reduce((s, x) => s + 1 / Math.log(nb[x].size), 0) });
        }));
        pairs.sort((p, q) => q.score - p.score);
        // triangles, joined when two share an edge (union-find over the triangles)
        const tri = [];
        L.edgeList.forEach(([a, b]) => nb[a].forEach((c) => { if (nb[b].has(c) && c > a && c > b) tri.push([a, b, c]); }));
        const up = tri.map((_, i) => i), root = (i) => (up[i] === i ? i : (up[i] = root(up[i])));
        const byEdge = {};
        tri.forEach((t, i) => [[0, 1], [0, 2], [1, 2]].forEach(([x, y]) => { const k = [t[x], t[y]].sort().join("-"); (byEdge[k] = byEdge[k] || []).push(i); }));
        Object.values(byEdge).forEach((l) => l.forEach((i) => { up[root(i)] = root(l[0]); }));
        const sets = {};
        tri.forEach((t, i) => t.forEach((n) => (sets[root(i)] = sets[root(i)] || new Set()).add(n)));
        const pal = AB.fx.canvas.categorical;
        const groups = Object.values(sets).sort((p, q) => q.size - p.size).map((s, i) => ({ name: "Community " + (i + 1), color: pal[i % pal.length], count: s.size, ids: s }));
        const times = {};
        groups.forEach((g) => g.ids.forEach((n) => { times[n] = (times[n] || 0) + 1; }));
        const shared = Object.keys(times).filter((n) => times[n] > 1).map((n) => name[n]);
        lesmisRuns = { pairs, cover: { groups, members: Object.keys(times).length, shared } };
        return lesmisRuns;
    }
    const COVER_NAME = "Clique communities";
    const NO_COVER = "graphty-element has no algorithm that finds overlapping communities yet";
    const COVER_RUN = () => ({ field: COVER_NAME, noun: "community", nouns: "communities", groups: lesmisResults().cover.groups });

    // A link-prediction run: its pairs are not paintable, so one body, no eye: Summary, Values (the pair list), Made with, Notes
    function pairList() {
        const P = lesmisResults().pairs, top = AB.topN(P, (p) => p.score);
        return toRecord(AB.inspector({
            icon: "link", title: "Link prediction", kind: "Run", kindKey: "run-row-readings",
            provenance: ["from Link prediction, " + RAN, SELF, "pair-list"], menu: MENU, renameDisabled: RUN_LABEL,
            body: AB.dataTab({
                Summary: { summary: AB.count(P.length, "pair") + " scored", body: [
                    h("div", { class: "ab-cap" }, AB.count(P.length, "unlinked pair") + " share at least one neighbor; the higher a pair's score, the likelier a missing link"),
                ] },
                Values: { summary: "Top " + top.length + " pairs by score", body: h("div", { class: "rr-groups", role: "list", "aria-label": "Pairs, highest score first" }, top.map((p) =>
                    h("div", { class: "rr-group", role: "listitem" }, icon("link", "sm"), h("span", { class: "k-ellipsis" }, p.a + " and " + p.b), h("span", { class: "k-num k-secondary" }, AB.num(p.score)),
                        h("span", { class: "rr-members k-secondary" }, AB.count(p.shared, "shared neighbor"))))) },
                "Made with": { summary: "Adamic-Adar, " + DEFAULTS.toLowerCase() + ", ran " + RAN, body: [
                    AB.fieldRow("Method", h("span", null, "Adamic-Adar")),
                    h("div", { class: "ab-cap k-secondary" }, DEFAULTS),
                ], provenance: record(world("data")) },
                Notes: { count: 0 },
            }, { kind: "run" }),
        }), "from Link prediction, " + RAN);
    }

    // A cover: a group run whose communities may share members. Its Style tab says how a shared member is drawn.
    function cover(state) {
        const C = lesmisResults().cover, pal = AB.fx.canvas.categorical;
        // How a node in two communities is drawn: the higher group's color (tree order), or a mark of both
        const sharedRow = () => h("div", null,
            AB.fieldRow("Shared members", choice("Shared members", [["Higher group", "A node in two communities takes the color of the one higher in the tree"], ["Mixed mark", "A node in two communities is drawn with both colors"]], "Higher group", "Shared members")),
            h("div", { class: "ab-cap k-secondary" }, AB.count(C.shared.length, "node") + " in two communities: " + C.shared.join(", ")));
        const style = () => toBinding(AB.styleTab({
            kind: "node", kinds: ["node"],
            paints: ["Paints " + AB.count(C.members, "node"), ["table-dock", "communities"]],
            set: {},
            bound: { "node.color": { field: COVER_NAME, palette: "Eight distinct", ramp: [pal[0], pal[C.groups.length - 1]] } },
            blocks: { "node.color": sharedRow },
        }), "binding-cover");
        const data = () => AB.dataTab({
            Summary: { summary: AB.count(C.groups.length, "community", { plural: "communities" }) + ", " + AB.count(C.shared.length, "node") + " in two", body: [
                h("div", { class: "ab-cap" }, AB.count(C.members, "node", { of: AB.fx.datasets.lesmis.nodes }) + " are in a community; " + AB.num(C.shared.length) + " of them in two"),
                reading("Communities", AB.num(C.groups.length)),
            ] },
            Sizes: { summary: C.groups.map((g) => g.count).join(", "), body: h("div", { class: "rr-groups", role: "list", "aria-label": "Communities" }, C.groups.map((g) =>
                h("div", { class: "rr-group", role: "listitem" }, AB.chit(g.color, true), h("span", { class: "k-ellipsis" }, g.name), h("span", { class: "k-num k-secondary" }, AB.num(g.count))))) },
            "Made with": { summary: "Clique percolation, cliques of 3, ran " + RAN, body: [
                AB.fieldRow("Method", h("span", null, "Clique percolation")),
                AB.fieldRow("Clique size", h("span", null, "3")),
                h("div", null, AB.needsElement(NO_COVER)),
            ], provenance: record(world("data")) },
            Notes: { count: 0 },
        }, { kind: "run" });
        return toRecord(AB.inspector({
            icon: AB.ICON.run, title: COVER_NAME, kind: "Run", kindKey: "run-row",
            provenance: ["from " + COVER_NAME + ", " + RAN, SELF, state], menu: MENU, renameDisabled: RUN_LABEL,
            tabs: { Style: style, Data: data }, tab: state === "binding-cover" ? "Style" : TAB[state],
        }), "from " + COVER_NAME + ", " + RAN);
    }

    // ---------- the tree beside these runs ----------
    // The paint tree at rest, with the run rows it has no state for yet put in where a new run lands
    // (under the built-in rows): Density (readings only: the gauge, no eye), Link prediction (a pair
    // list: the pair icon, no eye) and the cover with its communities. Once graph-place draws these rows
    // in a state of its own, the frame uses that state instead.
    const OWN_TREE = ["readings-only", "pair-list", "cover", "binding-cover"];
    function runRows(state) {
        const C = lesmisResults().cover, pal = AB.fx.canvas.categorical;
        const sel = (s) => s === state || (s === "cover" && state === "binding-cover");
        return [
            { id: "rr-cover", name: COVER_NAME, kindIcon: AB.ICON.run, swatch: AB.chit(pal[0], true), eye: true, open: sel("cover"), selected: sel("cover"), renameDisabled: RUN_LABEL, go: [SELF, "cover"], menu: MENU,
                children: C.groups.map((g) => ({ id: "rr-cover-" + g.name, name: g.name, kindIcon: AB.chit(g.color, true), count: g.count, eye: true, renameDisabled: GROUP_LABEL, onOpen: () => AB.flash("Opens " + g.name + " of " + COVER_NAME + " in the inspector (not available yet)"), menu: ["context-menus", "row"] })) },
            { id: "rr-pairs", name: "Link prediction", kindIcon: "link", eye: null, selected: sel("pair-list"), renameDisabled: RUN_LABEL, go: [SELF, "pair-list"], menu: MENU },
            { id: "rr-density", name: "Density", kindIcon: "gauge", eye: null, selected: sel("readings-only"), renameDisabled: RUN_LABEL, go: [SELF, "readings-only"], menu: MENU },
        ];
    }
    function treeWithRuns(el, state, ctx) {
        ctx.renderSection("graph-place/at-rest", el);
        const rows = runRows(state);
        const mine = () => [...el.querySelectorAll('.ab-trow[data-row^="rr-"]')];
        // the rows' own tree redraws (a disclosure, Delete and its Undo) land here, in the tree on screen
        const place = (fresh) => {
            const ul = el.querySelector(".ab-tree");
            if (!ul) return;
            mine().forEach((li) => li.remove());
            const after = ul.querySelector('[data-row="notes"]');
            [...fresh.children].reverse().forEach((li) => (after ? after.after(li) : ul.prepend(li)));
            const picked = mine().find((li) => li.getAttribute("aria-selected") === "true");
            if (picked) ul.querySelectorAll(".ab-trow").forEach((li) => { const on = li === picked; li.setAttribute("aria-selected", String(on)); li.tabIndex = on ? 0 : -1; });
            else mine().forEach((li) => (li.tabIndex = -1));
        };
        const opts = { label: "Paint order" };
        Object.defineProperty(opts, "el", { get: () => ({ isConnected: true, replaceWith: place }), set: () => {} });
        place(AB.tree(rows, opts));
        const ours = () => String((AB.route && AB.route.frame.left) || "").startsWith(SELF + "/");
        // graph-place redraws its tree (its own disclosures): put the rows back
        const obs = new MutationObserver(() => { if (!ours()) return obs.disconnect(); if (el.querySelector(".ab-tree") && !mine().length) place(AB.tree(rows, opts)); });
        obs.observe(el, { childList: true, subtree: true });
        // one selected row across both lists
        el.addEventListener("click", (e) => {
            const li = e.target.closest(".ab-trow");
            if (!li || !ours() || e.ctrlKey || e.metaKey || e.shiftKey || e.target.closest(".ab-eye, .ab-disc")) return;
            el.querySelectorAll(".ab-trow").forEach((x) => x.setAttribute("aria-selected", String(x === li)));
        });
    }

    // The transfers run's story for this page view: once the rerun failed, is out of date or is running,
    // the tree's Louvain row (many-groups) opens that same state, not a fresh March run. Other sections
    // (the tree's mark, version history, compare) can read it as AB.transfersRun.
    const STORY = ["failed", "data-changed", "running"];
    let story = null;
    // The transfers run's "..." opens in place, so every door stays on the transfers project
    function transfersMenu(anchor, state) {
        const failed = state === "failed";
        const n = AB.fx.datasets.transactionsApril.louvain.march.communities;
        const graph = ["graph-place", AB.placeOf("transactions", "graph") || "many-groups"];
        pick(anchor, [
            { heading: "Louvain" },
            failed ? { label: TRY_GPU, desc: TRY_GPU_TIP, go: [SELF, "running"] } : { label: "Rerun", go: [SELF, "running"] },
            AB.cmd("run-as-copy", { desc: "Keeps this run; the copy lands on top", go: ["graph-place", "transfers-running"] }),
            { label: "Restore an earlier result", needs: NO_EARLIER },
            { label: "Restore the suggested look" },
            { sep: true },
            { label: "Show members in table", go: ["table-dock", "transfers"] },
            { label: "Lay out by these groups" },
            { label: "Check against a null model and other seeds...", needs: NO_CHECK },
            { label: "Compare with another run...", needs: NO_COMPARE },
            { sep: true },
            AB.cmd("add-note"),
            { label: "Lock" },
            { label: "Hide from list (keeps painting)" },
            { sep: true },
            { label: "Delete", shortcut: "Del", onClick: () => { AB.go(graph[0], graph[1]); setTimeout(() => AB.deleted("Louvain and " + n + " communities", () => AB.go(SELF, state)), 50); } },
        ]);
    }

    function build(state) {
        if (state === "readings-only") return readingsOnly();
        if (state === "pair-list") return pairList();
        if (state === "cover" || state === "binding-cover") return cover(state);
        // the data was replaced with April since the March run: the row opens out of date
        const AP = AB.fx.datasets.transactionsApril;
        if (state === "many-groups" && !story && AB.fx.datasets.transactions.file === AP.files.transfers.file) story = "data-changed";
        if (state === "many-groups" && story) state = story;
        if (TRANSFERS.includes(state)) story = STORY.includes(state) ? state : null;
        AB.transfersRun = story;
        const W = world(state);
        return toRecord(AB.inspector({
            icon: AB.ICON.run, title: "Louvain", kind: "Run", kindKey: "run-row",
            provenance: ["from Louvain, " + RAN, SELF, state],
            menu: TRANSFERS.includes(state) ? (b) => transfersMenu(b, state) : MENU,
            renameDisabled: RUN_LABEL,
            stateBar: stateBar(state),
            // The shared out-of-date mark, only where the result no longer matches its settings or data
            changed: ["settings-changed", "hierarchy-level", "data-changed", "meaning-changed"].includes(state),
            tabs: { Style: () => styleTab(W), Data: () => dataTab(W, state) },
            tab: TAB[state],
        }), "from Louvain, " + RAN);
    }

    // The All options popover: every run option, left of the inspector; any edit raises the state bar
    function allOptions() {
        const W = world("data");
        return AB.popover({
            anchor: "#ab-right [data-rr=all-options]", title: "Louvain options", width: 300,
            body: options(W, "data", true).map(([, l, c]) => AB.fieldRow(l, c, { popover: true })),
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
                AB.cmd("run-as-copy", { desc: "Keeps this run; the copy lands on top", go: ["graph-place", "finished"] }),
                { label: "Restore an earlier result", needs: NO_EARLIER },
                { label: "Restore the suggested look" },
                { sep: true },
                { label: "Show members in table", go: ["table-dock", "communities"] },
                { label: "Lay out by these groups" },
                { label: "Check against a null model and other seeds...", needs: NO_CHECK },
                { label: "Compare with another run...", needs: NO_COMPARE },
                { sep: true },
                AB.cmd("add-note"),
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
            if (TRANSFERS.includes(state)) {
                // the story is set before the tree draws, so the tree's Louvain row carries its mark; a rerun is on April data
                if (STORY.includes(state)) { story = state; AB.transfersRun = state; if (AB.replaceTransfers) AB.replaceTransfers(); }
                return { left: "graph-place/many-groups", canvas: "canvas-and-states/transfers-communities" };
            }
            // Density, Link prediction and the cover: the tree at rest with their rows (treeWithRuns), until
            // the paint tree has a state of its own for them
            const tree = (AB.sections["graph-place"] || {}).states || [];
            const own = tree.some((t) => (t.id || t) === "readings-only") ? "graph-place/readings-only" : SELF + "/" + (state === "binding-cover" ? "cover" : state);
            const f = { left: OWN_TREE.includes(state) ? own : "graph-place/louvain-open", dock: "table-dock/communities" };
            if (SCOPED.includes(state)) {
                const L = AB.fx.datasets.lesmis;
                Object.assign(f, { chip: AB.count(L.filterSteps.after.step1, "node", { of: L.nodes }), filterOn: ["degree"] });
            }
            if (["earlier-results", "all-options", "binding", "binding-cover"].includes(state)) f.overlay = SELF + "/" + state;
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
            { id: "pair-list", label: "A pair-list run (link prediction)" },
            { id: "cover", label: "A cover: communities that share members" },
            { id: "binding", label: "Style: Binding popover (palette, order, overflow, exceptions)" },
            { id: "binding-cover", label: "A cover's Binding popover" },
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
                if (state === "binding") el.append(bindingPopover(LOUVAIN_RUN()));
                if (state === "binding-cover") el.append(bindingPopover(COVER_RUN()));
                return;
            }
            if (ctx && ctx.region === "left") return treeWithRuns(el, state, ctx);
            el.append(build(state));
            // The refusal is the name's tooltip, nothing else: focus the name so it shows
            if (state === "rename-disabled") requestAnimationFrame(() => { const n = el.querySelector(".ab-insp-head .k-name"); if (n) n.focus(); });
        },
    });
})();
