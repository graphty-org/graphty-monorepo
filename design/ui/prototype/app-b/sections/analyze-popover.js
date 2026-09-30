/* Analyze popover: the algorithm catalog, opened from the toolbar's Analyze button (key A).
   Recent first, then the catalog grouped by what a run adds to the tree; picking an entry expands
   it in place to its essentials; All algorithms... widens it into a two-column sheet. Running
   closes it and adds the row at the top of the tree. Plain ASCII. Styles are injected below. */
(function () {
    "use strict";
    const CSS = `
.ap-pop { width: 400px; height: 480px; max-height: calc(100% - 16px); display: flex; flex-direction: column; }
.ap-pop[data-wide] { width: 760px; height: 600px; max-width: calc(100% - 16px); }
.ap-head { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 8px 0 16px; border-bottom: 1px solid var(--cm-border); flex: none; }
.ap-head input { flex: 1; min-width: 0; height: 28px; border: 0; outline: 0; background: none; font: inherit; color: var(--cm-text); }
.ap-head input::placeholder { color: var(--cm-text-tertiary); }
.ap-head .ap-title { font-weight: 550; }
.ap-head .k-icon-btn { flex: none; }
.ap-body { flex: 1 1 auto; overflow: auto; padding: 4px 0 8px; min-height: 0; }
.ap-gh { display: flex; align-items: baseline; gap: 6px; height: 28px; padding: 4px 16px 0; font-weight: 550; color: var(--cm-text-secondary); }
.ap-gh .ap-adds { font-weight: 450; color: var(--cm-text-tertiary); font-size: 11px; }
.ap-entry { position: relative; isolation: isolate; display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 2px 12px 2px 16px; }
.ap-entry::before { content: ""; position: absolute; inset: 2px 8px; border-radius: 5px; z-index: -1; }
.ap-entry:hover::before, .ap-entry:focus-visible::before { background: var(--cm-bg-hover); }
.ap-entry:focus-visible { outline: none; }
.ap-entry:focus-visible::before { box-shadow: inset 0 0 0 1px var(--cm-border-selected); }
.ap-entry[aria-disabled="true"] { cursor: default; }
.ap-entry[aria-disabled="true"] .ap-name, .ap-entry[aria-disabled="true"] .ap-type { color: var(--cm-text-tertiary); }
.ap-type { flex: none; display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 4px; color: var(--cm-text-secondary); background: var(--cm-bg-secondary); }
.ap-txt { flex: 1 1 auto; min-width: 0; display: grid; line-height: 16px; }
.ap-sub { font-size: 11px; color: var(--cm-text-secondary); }
.ap-sub b { font-weight: 550; color: var(--cm-text); }
.ap-reason { font-size: 11px; color: var(--cm-text-secondary); }
.ap-marks { display: inline-flex; gap: 4px; flex: none; }
.ap-mark { display: inline-flex; align-items: center; gap: 2px; height: 16px; padding: 0 4px; border-radius: 5px; outline: 1px solid var(--cm-border); outline-offset: -1px; font-size: 10px; color: var(--cm-text-secondary); white-space: nowrap; }
.ap-mark .k-i { width: 10px; height: 10px; }
.ap-rerun { flex: none; }
.ap-foot { display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 16px; border-top: 1px solid var(--cm-border); flex: none; }
.ap-hint { font-size: 11px; color: var(--cm-text-tertiary); display: inline-flex; gap: 4px; align-items: center; white-space: nowrap; }
.ap-opt { display: grid; grid-template-columns: 80px 1fr; column-gap: 8px; align-items: start; padding: 4px 16px; }
.ap-opt > .ap-lbl { line-height: 24px; color: var(--cm-text-secondary); }
.ap-opt > .ap-ctl { display: grid; gap: 4px; min-width: 0; }
.ap-opt .k-seg { flex-wrap: wrap; height: auto; min-height: 24px; }
.ap-opt .k-seg > [aria-disabled="true"] { color: var(--cm-text-tertiary); cursor: default; }
.ap-opt .ap-note { font-size: 11px; line-height: 15px; color: var(--cm-text-secondary); }
.ap-answers { padding: 8px 16px 4px; line-height: 16px; }
.ap-notice { display: flex; gap: 8px; align-items: flex-start; margin: 8px 16px 4px; padding: 8px; border-radius: 5px; background: var(--cm-bg-secondary); line-height: 16px; }
.ap-notice .k-i { flex: none; margin-top: 2px; color: var(--cm-icon-brand, var(--cm-text-brand)); }
.ap-sheet { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 4px 16px 8px; }
.ap-sheet .ap-gh { grid-column: 1 / -1; padding: 8px 0 0; }
.ap-card { display: grid; gap: 4px; align-content: start; padding: 8px; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--cm-border); line-height: 16px; }
.ap-card:hover, .ap-card:focus-visible { background: var(--cm-bg-hover); outline: none; }
.ap-card[aria-disabled="true"] { cursor: default; }
.ap-card[aria-disabled="true"] .ap-name { color: var(--cm-text-tertiary); }
.ap-card-head { display: flex; align-items: center; gap: 6px; min-width: 0; }
.ap-card-head .ap-name { font-weight: 550; }
.ap-card .ap-kv { font-size: 11px; color: var(--cm-text-secondary); }
.ap-card .ap-kv b { font-weight: 550; color: var(--cm-text); }
.ap-empty { padding: 16px; color: var(--cm-text-secondary); line-height: 16px; }
.ap-live, .ap-live * { pointer-events: auto; }
.ap-tip { pointer-events: none; }
.ap-toast { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
`;
    if (!document.getElementById("ap-style")) document.head.append(h("style", { id: "ap-style" }, CSS));

    const ANCHOR = "[data-tool=Analyze]";
    const MEASURE = { icon: "chart-column", adds: "a measure row", section: "inspector-measure-row" };
    const RUN = { icon: "layers", adds: "a run with group rows", section: "inspector-run-row" };
    const PATH = { icon: "waypoints", adds: "a path row", section: "inspector-run-row" };
    const READ = { icon: "gauge", adds: "a reading", section: "inspector-run-row" };
    const PAIRS = { icon: "link", adds: "a run row of pairs, no paint", section: "inspector-run-row" };

    // weight: "flow" (higher = stronger), "distance" (paths; higher = farther unless inverted), or null.
    // key: the one option that changes the answer. cost: grows fast with size (a sampled variant exists).
    const GROUPS = [
        {
            title: "Rank nodes and edges", adds: "adds a measure row", entries: [
                { id: "pagerank", name: "PageRank", family: "Centrality", out: MEASURE, weight: "flow", key: ["Damping", "0.85", "How often a random walk follows an edge instead of jumping anywhere"], aliases: ["influence", "importance", "random walk"], answers: "Which nodes are connected to other well-connected nodes." },
                { id: "degree", name: "Degree", family: "Centrality", out: MEASURE, weight: "flow", key: ["Count", "Edges", "Edges, or the sum of their weights"], aliases: ["connections", "hubs", "popular"], answers: "How many connections each node has." },
                { id: "betweenness", name: "Betweenness", family: "Centrality", out: MEASURE, weight: "distance", cost: true, key: ["Normalized", "Yes", "Scale so values run from 0 to 1"], aliases: ["brokers", "bridges", "gatekeepers", "bottlenecks"], answers: "Which nodes sit on the most shortest paths between other nodes." },
                { id: "closeness", name: "Closeness", family: "Centrality", out: MEASURE, weight: "distance", cost: true, key: ["Variant", "Per component", "Measured inside each connected piece of the graph"], aliases: ["reach", "distance to everyone"], answers: "Which nodes can reach every other node in the fewest steps." },
                { id: "eigenvector", name: "Eigenvector", family: "Centrality", out: MEASURE, weight: "flow", key: null, aliases: ["prestige", "well connected friends"], answers: "Which nodes are tied to other central nodes." },
                { id: "edge-betweenness", name: "Edge betweenness", family: "Centrality, edges", out: MEASURE, weight: "distance", cost: true, key: ["Normalized", "Yes", "Scale so values run from 0 to 1"], aliases: ["bridges between groups", "bottleneck edges"], answers: "Which edges carry the most shortest paths." },
                { id: "clustering", name: "Clustering coefficient", family: "Structure", out: MEASURE, weight: null, key: null, aliases: ["triangles", "cliquish"], answers: "How close each node's neighbors are to all knowing each other." },
                { id: "core", name: "Core number", family: "Structure", out: MEASURE, weight: null, key: null, aliases: ["k-core", "coreness"], answers: "How deep in the dense core of the graph each node sits." },
            ],
        },
        {
            title: "Find groups", adds: "adds a run with group rows", entries: [
                { id: "louvain", name: "Louvain", family: "Communities", out: RUN, weight: "flow", key: ["Resolution", "1.0", "Higher finds more, smaller groups"], aliases: ["communities", "clusters", "modularity"], answers: "Which nodes form densely connected groups." },
                { id: "leiden", name: "Leiden", family: "Communities", out: RUN, weight: "flow", key: ["Resolution", "1.0", "Higher finds more, smaller groups"], aliases: ["communities", "clusters"], answers: "Densely connected groups, each guaranteed to be connected inside." },
                { id: "label-propagation", name: "Label propagation", family: "Communities", out: RUN, weight: "flow", key: ["Seed", "Random", "Fix a seed to get the same groups again"], aliases: ["communities", "fast clusters"], answers: "Groups found by letting neighbors vote on a label." },
                { id: "components", name: "Connected components", family: "Components", out: RUN, weight: null, key: null, aliases: ["islands", "pieces", "disconnected"], answers: "Which parts of the graph are cut off from each other." },
                { id: "scc", name: "Strongly connected components", family: "Components", out: RUN, weight: null, direction: true, key: null, aliases: ["cycles", "loops"], answers: "Groups in which every node can reach every other along edge directions.", disabled: "Needs direction: this graph is undirected" },
            ],
        },
        {
            title: "Find paths", adds: "adds a path row", entries: [
                { id: "shortest-path", name: "Shortest path", family: "Paths", out: PATH, weight: "distance", key: ["From, to", "Two selected nodes", "With nothing selected, you pick them on the canvas"], aliases: ["route", "how are they connected", "degrees of separation"], answers: "The fewest steps, or the lightest route, between two nodes.", canvas: true },
                { id: "all-shortest", name: "All shortest paths", family: "Paths", out: PATH, weight: "distance", cost: true, key: ["From, to", "Two selected nodes", "With nothing selected, you pick them on the canvas"], aliases: ["every route", "alternatives"], answers: "Every route of the shortest length between two nodes.", canvas: true },
                { id: "mst", name: "Minimum spanning tree", family: "Paths", out: PATH, weight: "distance", needsWeight: true, key: null, aliases: ["backbone", "skeleton"], answers: "The lightest set of edges that still connects every node." },
            ],
        },
        {
            title: "Measure the graph", adds: "adds a reading, or a list of pairs", entries: [
                { id: "stats", name: "Graph statistics", family: "Structure", out: READ, weight: null, key: null, aliases: ["density", "diameter", "summary", "overview"], answers: "Density, diameter, average path length and the degree spread." },
                { id: "modularity", name: "Modularity of a grouping", family: "Communities", out: READ, weight: "flow", key: ["Grouping", "group", "Which group row or attribute to score"], aliases: ["how good are the groups"], answers: "How much denser the groups are inside than between." },
                { id: "assortativity", name: "Assortativity", family: "Structure", out: READ, weight: null, key: ["By", "Degree", "Degree, or an attribute such as group"], aliases: ["homophily", "mixing", "birds of a feather"], answers: "Whether nodes tend to connect to nodes like themselves." },
                { id: "link-prediction", name: "Link prediction", family: "Pairs", out: PAIRS, weight: null, key: ["Method", "Adamic-Adar", "How shared neighbors are scored"], aliases: ["missing links", "likely ties", "who should know whom"], answers: "Which unconnected pairs are most likely to be connected." },
                { id: "similarity", name: "Node similarity", family: "Pairs", out: PAIRS, weight: null, cost: true, key: ["Method", "Jaccard", "Shared neighbors over all neighbors"], aliases: ["lookalikes", "jaccard", "similar nodes"], answers: "Which pairs of nodes have the most neighbors in common." },
            ],
        },
    ];
    const ALL = GROUPS.flatMap((g) => g.entries);
    const byId = (id) => ALL.find((e) => e.id === id);
    const RECENT = [["pagerank", "damping 0.85, weight value"], ["louvain", "resolution 1.0, weight value"], ["shortest-path", "Myriel to Javert"], ["betweenness", "weight value, normalized"], ["stats", "density"]];

    // Rows the paint tree holds at rest (graph-place): analyzing with one of these revises that row.
    const HAS_ROW = { pagerank: "PageRank", louvain: "Louvain, resolution 1.0", betweenness: "Betweenness", stats: "Density" };

    let ui = null;
    let host = null;

    function reset(state) {
        ui = { state, level: "list", query: "", picked: null, from: "list", weightOn: true, invert: false, scope: "full", key: null };
        if (state === "search") ui.query = "brokers";
        if (state === "essentials") { ui.level = "pick"; ui.picked = "pagerank"; }
        if (state === "revise") { ui.level = "pick"; ui.picked = "louvain"; ui.key = "1.5"; }
        if (state === "all-algorithms") ui.level = "sheet";
    }

    function matches(e, q) {
        q = q.trim().toLowerCase();
        if (!q) return { ok: true };
        if (e.name.toLowerCase().includes(q) || e.family.toLowerCase().includes(q)) return { ok: true };
        const a = e.aliases.find((x) => x.includes(q));
        return a ? { ok: true, alias: a } : { ok: false };
    }

    function mark(kind) {
        const m = {
            direction: ["arrow-right", "Direction", "Needs direction"],
            weight: ["hash", "Weight", "Needs a weight"],
            cost: ["clock", "Cost", "Slow on large graphs: a sampled variant is offered"],
        }[kind];
        return h("span", { class: "ap-mark", title: m[2] }, icon(m[0], "sm"), m[1]);
    }
    function marks(e) {
        return h("span", { class: "ap-marks" }, e.direction ? mark("direction") : null, e.needsWeight ? mark("weight") : null, e.cost ? mark("cost") : null);
    }
    function typeIcon(e) {
        return h("span", { class: "ap-type", title: "Adds " + e.out.adds }, icon(e.out.icon, "sm"));
    }

    function pick(id) {
        ui.from = ui.level;
        ui.level = "pick";
        ui.picked = id;
        ui.weightOn = true;
        ui.invert = false;
        ui.key = null;
        draw();
    }
    function back() {
        if (ui.level === "pick") { ui.level = ui.from === "sheet" ? "sheet" : "list"; ui.picked = null; }
        else if (ui.level === "sheet") ui.level = "list";
        else if (ui.query) ui.query = "";
        else return AB.go("graph-place", "at-rest");
        draw();
    }

    function entryRow(e, sub) {
        const dis = !!e.disabled;
        const el = h("div", Object.assign({ class: "ap-entry", role: "option", "aria-disabled": dis ? "true" : null, tabindex: "0" }, dis ? {} : AB.act({ onClick: () => pick(e.id) })),
            typeIcon(e),
            h("span", { class: "ap-txt" }, h("span", { class: "ap-name k-ellipsis" }, e.name), dis ? h("span", { class: "ap-reason" }, e.disabled) : h("span", { class: "ap-sub k-ellipsis" }, sub || e.family)),
            marks(e));
        return el;
    }

    function listBody() {
        const body = h("div", { class: "ap-body", role: "listbox", "aria-label": "Algorithms" });
        if (!ui.query) {
            body.append(h("div", { class: "ap-gh" }, "Recent"));
            RECENT.forEach(([id, how]) => {
                const e = byId(id);
                const row = entryRow(e, e.family + ", last run with " + how);
                row.append(AB.iconButton("refresh-cw", "Run " + e.name + " again with these settings", {
                    onClick: () => (HAS_ROW[id] ? pick(id) : AB.flash(e.name + " " + how + ": run again with these settings (not wired in the skeleton)")),
                }));
                row.lastChild.classList.add("ap-rerun");
                body.append(row);
            });
        }
        let any = false;
        GROUPS.forEach((g) => {
            const hits = g.entries.map((e) => [e, matches(e, ui.query)]).filter(([, m]) => m.ok);
            if (!hits.length) return;
            any = true;
            body.append(h("div", { class: "ap-gh" }, g.title, h("span", { class: "ap-adds" }, g.adds)));
            hits.forEach(([e, m]) => body.append(entryRow(e, m.alias ? h("span", null, e.family + ", matches ", h("b", null, m.alias)) : HAS_ROW[e.id] ? e.family + ", updates its row" : null)));
        });
        const pointerHit = !ui.query || matches({ name: "New graph from", family: "", aliases: ["projection", "quotient", "null model", "bipartite", "sample"] }, ui.query).ok;
        if (pointerHit) {
            any = true;
            body.append(h("div", { class: "ap-gh" }, "Make a new graph", h("span", { class: "ap-adds" }, "adds a graph, not a row")),
                h("div", Object.assign({ class: "ap-entry", role: "option" }, AB.act({ go: ["graphs-switcher", "new-graph-from"] })),
                    h("span", { class: "ap-type" }, icon("network", "sm")),
                    h("span", { class: "ap-txt" }, h("span", { class: "ap-name" }, "New graph from..."), h("span", { class: "ap-sub" }, "Projection, quotient by groups, null-model sample: in the Graphs menu")),
                    icon("arrow-right", "sm")));
        }
        if (!any) body.append(h("div", { class: "ap-empty" }, "No algorithm matches \"" + ui.query + "\". Try what you want to find, such as brokers, communities or route."));
        return body;
    }

    function seg(options, onPick) {
        return h("span", { class: "k-seg", role: "radiogroup" }, options.map((o) =>
            h("span", Object.assign({ role: "radio", tabindex: o.disabled ? "-1" : "0", "aria-checked": String(!!o.on), "aria-disabled": o.disabled ? "true" : null, title: o.title || null }, o.disabled ? {} : AB.act({ onClick: () => onPick(o.id) })), o.label)));
    }
    function opt(label, ...ctl) {
        return h("div", { class: "ap-opt" }, h("span", { class: "ap-lbl" }, label), h("span", { class: "ap-ctl" }, ctl));
    }

    function essentialsBody(e) {
        const L = AB.fx.datasets.lesmis;
        const body = h("div", { class: "ap-body" });
        if (HAS_ROW[e.id]) {
            body.append(h("div", { class: "ap-notice", role: "note" }, icon("info", "sm"),
                h("span", null, "Updates the " + HAS_ROW[e.id] + " row; its earlier result is kept under ", AB.link(e.out.section, "data", "Earlier results"), ".")));
        }
        body.append(h("div", { class: "ap-answers" }, e.answers, " ", h("span", { class: "k-secondary" }, "Adds " + e.out.adds + ".")));
        body.append(opt("Scope", seg([
            { id: "full", label: "Full graph, " + L.nodes + " nodes", on: ui.scope === "full" },
            { id: "sel", label: "Selection: none", disabled: true, title: "Select nodes on the canvas or in the table to run on them" },
        ], (id) => { ui.scope = id; draw(); }), h("span", { class: "ap-note" }, "Follows the filter chip at the top.")));
        body.append(opt("Direction", AB.field("Undirected", { onClick: () => AB.flash("This graph has no edge direction") }), h("span", { class: "ap-note" }, "This graph's edges have no direction.")));
        if (e.weight) {
            const stronger = e.weight === "flow" ? !ui.invert : ui.invert;
            const meaning = stronger ? "Higher = stronger" : "Higher = farther";
            const explain = e.weight === "flow"
                ? (ui.invert ? "More co-appearances count for less." : "More co-appearances count for more.")
                : (ui.invert ? "More co-appearances make characters farther apart." : "More co-appearances make characters closer: paths read the value as a strength.");
            body.append(opt("Weight",
                AB.field(ui.weightOn ? "value (co-appearances)" : "None", { caret: true, onClick: () => { ui.weightOn = !ui.weightOn; draw(); } }),
                ui.weightOn ? h("span", { class: "ap-note", style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" }, h("b", null, meaning), AB.button("Invert", { kind: "ghost", onClick: () => { ui.invert = !ui.invert; draw(); } })) : null,
                ui.weightOn ? h("span", { class: "ap-note" }, explain) : h("span", { class: "ap-note" }, "Every edge counts the same.")));
        } else {
            body.append(opt("Weight", h("span", { class: "ap-note", style: "line-height:24px" }, "Not used by " + e.name + ".")));
        }
        if (e.key) body.append(opt(e.key[0], AB.field(ui.key || e.key[1], { caret: true, onClick: () => (e.canvas ? AB.go("path-tool", "armed") : AB.flash(e.key[0] + " choices (not wired in the skeleton)")) }), h("span", { class: "ap-note" }, ui.key ? e.key[2] + ". Was " + e.key[1] + " on the current row." : e.key[2])));
        else body.append(opt("Options", h("span", { class: "ap-note", style: "line-height:24px" }, "Nothing else changes the answer.")));
        body.append(opt("Cost",
            h("span", { class: "ap-note", style: "line-height:24px;color:var(--cm-text)" }, "Under a second on " + L.nodes + " nodes and " + L.edges + " edges."),
            seg([{ id: "exact", label: "Exact", on: true }, { id: "sampled", label: e.cost ? "Sampled" : "Approximate", disabled: true, title: "Not needed at this size" }], () => {}),
            h("span", { class: "ap-note" }, (e.cost ? "Sampled" : "Approximate") + " is offered for large graphs; not needed at this size. A sampled run says so in its row's name.")));
        body.append(opt("After", h("span", { class: "ap-note", style: "padding-top:4px" }, "The row appears at the top of the list and paints when the run finishes. Every setting is on its ", AB.link(e.out.section, "data", "Data tab"), ", with Rerun.")));
        return body;
    }

    // Betweenness as a new row is the run the tree's "Run in progress" state shows.
    function run(e, asNew) {
        if (e.id === "betweenness" && asNew) return AB.go("analyze-popover", "running");
        if (e.canvas) return AB.go("path-tool", "armed");
        if (HAS_ROW[e.id] && !asNew) return AB.go(e.out.section, "data");
        AB.flash(e.name + (asNew ? " added as a new row" : " added and running") + " (not wired in the skeleton)");
    }

    function sheetBody() {
        const body = h("div", { class: "ap-body" });
        const grid = h("div", { class: "ap-sheet" });
        let any = false;
        GROUPS.forEach((g) => {
            const hits = g.entries.filter((e) => matches(e, ui.query).ok);
            if (!hits.length) return;
            any = true;
            grid.append(h("div", { class: "ap-gh" }, g.title, h("span", { class: "ap-adds" }, g.adds)));
            hits.forEach((e) => {
                const dis = !!e.disabled;
                const inputs = [e.direction ? "direction (required)" : "direction if present", e.needsWeight ? "weight required (value)" : e.weight ? "weight optional (value)" : "no weight", e.canvas ? "two nodes" : null].filter(Boolean).join(", ");
                grid.append(h("div", Object.assign({ class: "ap-card", role: "button", "aria-disabled": dis ? "true" : null, tabindex: "0" }, dis ? {} : AB.act({ onClick: () => pick(e.id) })),
                    h("span", { class: "ap-card-head" }, typeIcon(e), h("span", { class: "ap-name k-ellipsis" }, e.name), h("span", { class: "k-secondary k-grow k-ellipsis" }, e.family), marks(e)),
                    h("span", null, e.answers),
                    dis ? h("span", { class: "ap-reason" }, e.disabled) : null,
                    h("span", { class: "ap-kv" }, h("b", null, "Inputs: "), inputs),
                    h("span", { class: "ap-kv" }, h("b", null, "Cost: "), e.cost ? "grows fast with size; sampled variant for large graphs" : "fast; no sampling needed"),
                    h("span", { class: "ap-kv" }, h("b", null, "Adds: "), e.out.adds)));
            });
        });
        grid.append(h("div", { class: "ap-gh" }, "Make a new graph", h("span", { class: "ap-adds" }, "adds a graph, not a row")),
            h("div", Object.assign({ class: "ap-card", role: "button" }, AB.act({ go: ["graphs-switcher", "new-graph-from"] })),
                h("span", { class: "ap-card-head" }, h("span", { class: "ap-type" }, icon("network", "sm")), h("span", { class: "ap-name" }, "New graph from...")),
                h("span", null, "Bipartite projection, quotient by groups and null-model samples make a new graph in the Graphs menu, with its own rows.")));
        body.append(any || !ui.query ? grid : h("div", { class: "ap-empty" }, "No algorithm matches \"" + ui.query + "\"."));
        return body;
    }

    function searchHead(title) {
        const input = h("input", { type: "search", value: ui.query, placeholder: "Search, or say what to find", "aria-label": "Search algorithms" });
        input.addEventListener("input", () => { ui.query = input.value; host.querySelector(".ap-body").replaceWith(ui.level === "sheet" ? sheetBody() : listBody()); });
        return h("div", { class: "ap-head" },
            title ? AB.iconButton("chevron-left", "Back to the short list", { onClick: back }) : icon("search"),
            title ? h("span", { class: "ap-title" }, title) : null,
            title ? icon("search", "sm") : null,
            input,
            ui.level === "list" ? AB.button("All algorithms...", { kind: "ghost", onClick: () => { ui.level = "sheet"; draw(); } }) : null,
            AB.iconButton("x", "Close", { onClick: () => AB.go("graph-place", "at-rest") }));
    }

    function draw() {
        const pop = h("div", { class: "k-popover ap-pop", role: "dialog", "aria-label": "Analyze", "data-wide": ui.level === "sheet" ? "" : null });
        let focus = ".ap-head input";
        if (ui.level === "pick") {
            const e = byId(ui.picked);
            pop.append(
                h("div", { class: "ap-head" }, AB.iconButton("chevron-left", "Back to the list", { onClick: back }), typeIcon(e), h("span", { class: "ap-title k-ellipsis" }, e.name), h("span", { class: "k-secondary k-grow k-ellipsis" }, e.family), AB.iconButton("x", "Close", { onClick: () => AB.go("graph-place", "at-rest") })),
                essentialsBody(e),
                h("div", { class: "ap-foot" }, h("span", { class: "ap-hint" }, h("span", { class: "k-kbd" }, "Enter"), "runs", h("span", { class: "k-kbd" }, "Esc"), "back"), h("span", { class: "k-grow" }),
                    HAS_ROW[e.id] ? AB.button("As a new row", { kind: "secondary", onClick: () => run(e, true) }) : null,
                    h("span", { class: "ap-runbtn" }, AB.button("Run", { onClick: () => run(e, false) }))));
            focus = ".ap-runbtn .k-btn";
            pop.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && !ev.target.closest(".k-seg, .k-field, .k-icon-btn, a, .k-btn-secondary, .k-btn-ghost")) { ev.preventDefault(); ev.stopPropagation(); run(e, false); } });
        } else if (ui.level === "sheet") {
            pop.append(searchHead("All algorithms"), sheetBody(),
                h("div", { class: "ap-foot" }, h("span", { class: "ap-hint" }, "Pick an entry to set it up and run it."), h("span", { class: "k-grow" }), h("span", { class: "ap-hint" }, h("span", { class: "k-kbd" }, "Esc"), "back")));
        } else {
            pop.append(searchHead(null), listBody());
        }
        pop.addEventListener("keydown", (ev) => { if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); back(); } });
        host.replaceChildren(pop);
        const a = document.querySelector(ANCHOR);
        if (a) pop.style.maxHeight = Math.max(240, a.getBoundingClientRect().top - host.getBoundingClientRect().top - 16) + "px";
        AB.position(pop, ANCHOR, "above");
        setTimeout(() => { const f = pop.querySelector(focus); if (f) f.focus(); }, 10);
    }

    function passThrough(el) {
        setTimeout(() => { el.dataset.active = "false"; }, 0);
    }

    // A (the toolbar's key) opens the catalog from anywhere nothing is typed and no overlay is open.
    if (!window.__apKey) {
        window.__apKey = true;
        document.addEventListener("keydown", (e) => {
            const t = e.target;
            if (e.key !== "a" || e.ctrlKey || e.metaKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))) return;
            const ov = document.getElementById("ab-overlay");
            if (ov && ov.dataset.active === "true") return;
            if (document.body.dataset.page !== "app") return;
            e.preventDefault();
            AB.go("analyze-popover", "open");
        });
    }

    registerSection({
        id: "analyze-popover",
        title: "Analyze popover",
        region: "overlay",
        rail: "graph",
        closeTo: "graph-place/at-rest",
        frame: (state) => (state === "running" ? { left: "graph-place/running" } : {}),
        states: [
            { id: "open", label: "Open: Recent and groups (a disabled entry under Find groups)" },
            { id: "search", label: "Search: an alias match" },
            { id: "essentials", label: "PageRank essentials" },
            { id: "revise", label: "Revises an existing row" },
            { id: "all-algorithms", label: "All algorithms sheet" },
            { id: "running", label: "After Run: row added, running" },
            { id: "closed", label: "Closed" },
        ],
        render(el, state) {
            host = el;
            const tool = document.querySelector(ANCHOR);
            if (state === "closed") {
                passThrough(el);
                const tip = h("div", { class: "k-tooltip ap-tip", role: "tooltip" }, "Analyze ", h("span", { class: "k-kbd" }, "A"), h("div", { class: "k-secondary" }, "Rank, find groups, find paths, measure"));
                el.append(tip);
                AB.position(tip, ANCHOR, "above");
                return;
            }
            if (state === "running") {
                passThrough(el);
                const toast = h("div", { class: "k-toast ap-live ap-toast", role: "status" }, "Betweenness added at the top, running. It paints when it finishes.", h("span", { class: "k-annot-tag", title: "Open question" }, "Open question: which channel it paints first"), h("span", Object.assign({ class: "k-toast-action", role: "button" }, AB.act({ go: ["graph-place", "at-rest"] })), "Cancel"));
                el.append(toast);
                AB.position(toast, ANCHOR, "above");
                return;
            }
            if (tool) tool.setAttribute("aria-pressed", "true");
            reset(state);
            draw();
        },
    });
})();
