/* Path popover: the one interface for a path (spec 2.3). One light popover above the toolbar,
   "Path between", with From, To, Direction (directed graphs only), Weight and its meaning. No Scope:
   a path runs on what the graph draws (a filter decides that), and its two ends are the selection.
   Opened by the selection bar's Path between, P and Analyze > Find paths. One footer button, Find
   path, because it creates a row; Esc, X or a click outside close it. Most flow and Weakest cut are
   Analyze entries, not here. A pick field, while active, turns the canvas into a pick target (a
   crosshair and one hint line) and also takes a typed name, so the keyboard can pick too.
   Plain ASCII. */
(function () {
    "use strict";
    const CSS = [
        ".pp-full.k-field { cursor: pointer; width: 100%; box-sizing: border-box; }",
        ".pp-pick[data-armed] { box-shadow: inset 0 0 0 1px var(--cm-border-brand, var(--cm-primary)); }",
        ".pp-pick .pp-empty { color: var(--cm-text-tertiary); }",
        ".pp-pick input { all: unset; flex: 1; min-width: 0; font: inherit; color: var(--cm-text); }",
        ".pp-pick input::placeholder { color: var(--cm-text-tertiary); }",
        ".pp-col { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; width: 100%; }",
        ".pp-col .k-seg > * { white-space: nowrap; }",
        ".pp-loaded { color: var(--cm-text-tertiary); font-size: 11px; line-height: 16px; }",
        ".pp-catch { position: absolute; cursor: crosshair; }",
        ".pp-hint { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); display: flex; align-items: center; gap: 6px;",
        "  padding: 4px 10px; border-radius: 6px; background: var(--cm-bg-elevated, var(--cm-bg)); color: var(--cm-text);",
        "  box-shadow: 0 0 0 1px var(--cm-border), 0 2px 8px rgba(0,0,0,.12); white-space: nowrap; pointer-events: none; }",
    ].join("\n");

    // The fixture ends and settings for each graph. Les Miserables is undirected, so Direction hides.
    function setup(state) {
        const L = AB.fx.datasets.lesmis, T = AB.fx.datasets.transactions, ds = AB.route && AB.route.frame.dataset;
        if (ds === "doorEntries") {
            // The door entries as loaded: nothing selected, so From waits for a pick; the weight is count under Pair, none otherwise
            const D = AB.fx.datasets.doorEntries, w = D.loadedWeight();
            const names = [...new Set(D.tables[0].sample.map((r) => r.name))].concat(D.tables[1].sample.map((r) => r.bldg));
            return {
                directed: true, unit: "nodes", count: D.loadedTypes().total, from: null, to: null, fromIcon: "user", toIcon: "user",
                loaded: w ? { weight: w, meaning: "stronger", desc: "Entries per person and building" } : { weight: null, meaning: "stronger", desc: "No weight was chosen when the data was loaded" },
                weights: w ? [w] : [], direction: "either", names, pickFrom: names[0], pickTo: names.includes("Priya Nair") ? "Priya Nair" : names[1],
            };
        }
        if (state === "transfers-directed" || ds === "transactions") {
            const P = T.setsAndPaths.path;
            return {
                directed: true, unit: "accounts", count: T.nodes,
                from: P.from.id, to: P.to.id, fromIcon: "building-2", toIcon: "user",
                loaded: { weight: "amount", meaning: "stronger", desc: "Amount per transfer" }, weights: ["amount"], direction: "follow",
                names: T.rows.map((r) => r.id), pickFrom: P.from.id, pickTo: P.to.id,
            };
        }
        const two = state !== "from-analyze";
        if (state === "no-path") {
            // "Filter out group 8" alone leaves 64 nodes in 4 parts; Child1 reached Valjean only through Gavroche (group 8)
            const st = L.filterSteps.steps[2], left = L.filterSteps.statsByState["3"];
            return {
                directed: false, unit: "nodes", count: left.nodes, from: "Valjean", to: "Child1", noPathTo: "Child1", filter: st, fromIcon: "user", toIcon: "user",
                loaded: { weight: "value", meaning: "stronger", desc: "Co-appearances per pair" }, weights: ["value"], direction: "either",
                names: L.rows.filter((r) => r.group !== 8).map((r) => r.label), pickFrom: "Valjean", pickTo: "Javert",
            };
        }
        return {
            directed: !!L.directed, unit: "nodes", count: L.nodes,
            from: two ? "Valjean" : null, to: two && state !== "picking-to" ? "Javert" : null, fromIcon: "user", toIcon: "user",
            loaded: { weight: "value", meaning: "stronger", desc: "Co-appearances per pair" }, weights: ["value"], direction: "either",
            names: L.rows.map((r) => r.label), pickFrom: "Valjean", pickTo: "Javert",
        };
    }

    function render(el, state) {
        if (!document.getElementById("pp-css")) document.head.append(h("style", { id: "pp-css" }, CSS));
        if (state === "found") {
            // The selected path row and its inspector confirm the result; the notice offers only Undo,
            // which goes back to the project's tree as it was before the path
            const ds = AB.route && AB.route.frame.dataset;
            const undo = ds === "doorEntries" ? ["graph-place", "door-entries"] : ds === "transactions" ? ["graph-place", AB.fx.datasets.transactions.fresh ? "transfers-loaded" : "many-groups"] : ["path-popover", "from-selection"];
            el.append(AB.notice("Path added", { label: "Undo", go: undo }));
            return;
        }
        const s = setup(state);
        // The Weight starts as the weight chosen when the data was loaded, with its meaning; any other
        // pick overrides this path run only and is recorded in its Made with, never in the data.
        s.weight = s.loaded.weight; s.meaning = s.loaded.meaning;
        if (state === "weight-overridden") { s.weight = null; }
        let active = state === "picking-to" ? "to" : state === "from-analyze" || !s.from ? "from" : null;
        const host = h("div");
        el.append(host);

        // the anchor: the selection bar's Path between, else the toolbar's Analyze (P and Find paths)
        const anchor = () => document.querySelector("#ab-toolbar [aria-label^='Path between']") || document.querySelector("[data-tool=Analyze]");

        function pickField(which) {
            const val = s[which], on = active === which;
            const label = which === "from" ? "From" : "To";
            // Armed, the field is the text box itself (a click anywhere on it types there); otherwise a button that arms it
            const f = on ? h("span", { class: "k-field pp-pick pp-full", "data-armed": "" })
                : h("span", { class: "k-field pp-pick pp-full", role: "button", tabindex: "0", "aria-pressed": "false", "aria-label": label + ": " + (val || "not chosen") });
            f.append(icon(s[which + "Icon"], "sm"));
            if (on) {
                const inp = h("input", { type: "text", placeholder: "Type a name", "aria-label": label, "data-autofocus": "", value: val || "" });
                inp.addEventListener("keydown", (e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const q = inp.value.trim().toLowerCase();
                    const hit = q && s.names.find((n) => n.toLowerCase().startsWith(q));
                    if (!hit) return AB.flash('No match for "' + inp.value.trim() + '"');
                    choose(which, hit);
                });
                f.append(inp);
            } else {
                f.append(h("span", { class: "k-grow k-ellipsis" + (val ? "" : " pp-empty") }, val || "Click to pick"));
            }
            AB.tip(f, on ? "Click a node on the canvas, or type a name" : "Pick " + label + " on the canvas", { label: false });
            const arm = (e) => { if (e.target.tagName === "INPUT") return; if (on) { f.querySelector("input").focus(); return; } active = which; draw(); };
            f.addEventListener("click", arm);
            f.addEventListener("keydown", (e) => { if (e.target === f && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); arm(e); } });
            return f;
        }
        function choose(which, name) {
            s[which] = name;
            active = which === "from" && !s.to ? "to" : null;
            AB.announce(which === "from" ? "From: " + name : "To: " + name);
            draw();
        }
        const loadedLine = () => (s.loaded.weight ? s.loaded.weight + ", " + s.loaded.meaning : "none (each edge counts 1)"); // the graph inspector's words: "value, stronger"
        const overridden = () => s.weight !== s.loaded.weight || (s.weight && s.meaning !== s.loaded.meaning);
        function weightField() {
            const L = s.loaded;
            // The same words as Analyze's Weight field: the loaded weight says so. The dropdown is the field
            // list at menu size (edge attributes, numbers suitable), so a project with dozens of edge
            // attributes gets Find and groups; None leads it, above the list.
            const f = AB.field(s.weight ? s.weight + (s.weight === L.weight ? " (loaded weight)" : "") : "None", { caret: true, onClick: () => {
                const m = AB.openFieldList(f, { kind: "number", element: "edge", current: s.weight, label: "Weight", results: false, notes: false,
                    onPick: (name) => { s.weight = name; if (name === L.weight) s.meaning = L.meaning; draw(); } });
                if (!m) return;
                // ponytail: None sits above the listbox, so arrows do not reach it; a lead-item option in fieldList would fold it in
                const none = h("div", { class: "k-menu-item ab-fl-opt", role: "button", tabindex: "0", "aria-pressed": String(!s.weight) },
                    h("span", { class: "k-check-col" }, !s.weight ? icon("check", "sm") : null),
                    h("span", { class: "ab-fl-name" }, L.weight ? "None" : "None (loaded: no weight)"));
                AB.tip(none, "Every edge counts as one step", { label: false });
                const pickNone = () => { AB.closeMenu(true); s.weight = null; draw(); };
                none.addEventListener("click", pickNone);
                none.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickNone(); } });
                m.insertBefore(none, m.querySelector(".ab-fl-list"));
            } });
            f.classList.add("pp-full");
            f.setAttribute("aria-label", "Weight: " + (s.weight || "None"));
            return f;
        }
        // No path: the two ends lie in different parts of what the graph draws (a filter split it)
        function noPath() {
            if (state !== "no-path" || s.to !== s.noPathTo) return null;
            return AB.problem({
                what: "No path from " + s.from + " to " + s.to + ": the filter step \"" + s.filter + "\" hides every node between them.",
                todo: "Turn that step off in Filters, or pick another To.",
                action: { label: "Pick another To", onClick: () => { active = "to"; draw(); } },
            });
        }

        function draw() {
            const ready = s.from && s.to;
            const body = [
                AB.fieldRow("From", pickField("from"), { popover: true }),
                AB.fieldRow("To", pickField("to"), { popover: true }),
                s.directed ? AB.fieldRow("Direction", h("span", { class: "pp-col" },
                    AB.seg([["follow", "Follow edges"], ["either", "Either way"]], s.direction, (v) => { s.direction = v; draw(); }, { label: "Direction" }),
                    AB.needsElement("graphty-element's shortest path reads every graph as undirected; Follow edges needs a direction option")), { popover: true }) : null,
                AB.fieldRow("Weight", h("span", { class: "pp-col" },
                    weightField(),
                    s.weight ? AB.seg([["stronger", "Stronger"], ["farther", "Farther"], ["capacity", "Capacity"]], s.meaning, (v) => { s.meaning = v; draw(); }, { label: "What a higher " + s.weight + " means" }) : null,
                    h("span", { class: "pp-loaded" }, overridden() ? "This path only. Loaded weight: " + loadedLine() : "Loaded weight: " + loadedLine()),
                    // The same words as Analyze: a path reads a weight as distance, so a Stronger weight is inverted
                    s.weight && s.meaning === "stronger" ? h("span", { class: "pp-loaded" }, "Shortest path reads a weight as distance: it uses 1/" + s.weight + ".") : null,
                    s.weight && (s.weight !== s.loaded.weight || s.meaning !== "farther") ? AB.needsElement("graphty-element's shortest path reads the loaded weight column as a distance only; another column, or Stronger or Capacity, needs a weight option with a meaning") : null), { popover: true }),
            ];
            const np = noPath();
            if (np) body.push(np);
            const foot = AB.button("Find path", {
                icon: "route", disabled: np ? "No path between these two in what the graph draws" : ready ? null : "Choose From and To first",
                // The ends and the weight go with the new row, so the tree and the inspector name this path
                onClick: () => { AB.lastPath = { ds: AB.route && AB.route.frame.dataset, from: s.from, to: s.to, weight: s.weight, loaded: s.loaded.weight }; AB.go("path-popover", "found"); },
            });
            const pop = AB.popover({ anchor: anchor(), title: "Path between", body, foot, width: 360 });
            pop.querySelector(".k-popover-body").append(AB.openQuestion("Can From or To be a set, so the path starts at the nearest member? graphty-element takes one source node"));
            const layer = [pop];
            if (active) {
                // the canvas becomes a pick target: a crosshair over it and one hint line at its top
                const cv = document.getElementById("ab-canvas"), ov = document.getElementById("ab-overlay");
                if (cv && ov) {
                    const C = cv.getBoundingClientRect(), O = ov.getBoundingClientRect();
                    const name = active === "from" ? s.pickFrom : s.pickTo;
                    const which = active;
                    const catcher = h("div", { class: "pp-catch", style: `left:${C.left - O.left}px;top:${C.top - O.top}px;width:${C.width}px;height:${C.height}px`, "aria-hidden": "true" },
                        h("div", { class: "pp-hint" }, icon("crosshair", "sm"), "Click a node or set for " + (active === "from" ? "From" : "To")));
                    catcher.addEventListener("click", (e) => { e.stopPropagation(); choose(which, name); });
                    layer.unshift(catcher);
                }
            }
            host.replaceChildren(...layer);
            // a pick field that is picking takes the keyboard too
            const inp = pop.querySelector(".pp-pick input");
            if (inp) requestAnimationFrame(() => requestAnimationFrame(() => inp.focus()));
        }
        draw();
    }

    registerSection({
        id: "path-popover",
        title: "Path popover",
        region: "overlay",
        rail: "graph",
        states: [
            { id: "from-selection", label: "From and To filled from the selection" },
            { id: "picking-to", label: "Picking To on the canvas" },
            { id: "transfers-directed", label: "Directed graph: Direction shows" },
            { id: "weight-overridden", label: "Weight overridden to None for this path" },
            { id: "from-analyze", label: "From Analyze > Find paths, nothing selected" },
            { id: "found", label: "Path found: the new row selected" },
            { id: "no-path", label: "No path: a filter step splits the graph" },
        ],
        closeTo: "graph-place/at-rest",
        frame(state) {
            if (state === "transfers-directed") return { dataset: "transactions", left: "graph-place/many-groups", right: "inspector-run-row/many-groups", canvas: "canvas-and-states/transfers-communities", dock: false };
            if (state === "from-analyze") return { left: "graph-place/at-rest", dock: false };
            if (state === "no-path") return { left: "graph-place/at-rest", dock: false, chip: "Filtered: " + AB.fx.datasets.lesmis.filterSteps.statsByState["3"].nodes + " of " + AB.fx.datasets.lesmis.nodes + " nodes" };
            if (state === "found") {
                // The project the path ran on (the screen before this one): its tree with the new row, and the row's inspector
                const ds = AB.route && AB.route.frame.dataset;
                if (ds === "doorEntries") return { own: true, dataset: ds, left: "graph-place/door-entries-path", right: "inspector-group-set-path-row/path-door-entries", dock: false };
                if (ds === "transactions") return { own: true, dataset: ds, left: "graph-place/path-found", right: "inspector-group-set-path-row/path", canvas: AB.fx.datasets.transactions.fresh ? "canvas-and-states/transfers" : "canvas-and-states/transfers-communities", dock: false };
                return { left: "graph-place/at-rest", right: "inspector-group-set-path-row/path-lesmis", dock: false };
            }
            return { left: "graph-place/at-rest", right: "inspector-several-elements/two-nodes", dock: false };
        },
        render,
    });
})();
