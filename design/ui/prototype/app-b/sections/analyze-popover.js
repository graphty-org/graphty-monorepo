/* Analyze popover: the algorithm catalog in the one light popover (AB.popover), opened from the
   toolbar's Analyze button (Shift+A, which the shell binds; plain A is graphty-element's canvas key).
   List level: search, Recent (three entries), then the catalog grouped by what a run adds to the tree.
   Picking an entry shows its essentials only: Scope (only when something is selected), Weight and its
   meaning, the one key option, Exact | Sampled (costly entries only); the foot holds the cost line
   and Run. Shortest path opens the Path popover. Running closes the popover; the new row at the top
   of the tree is the feedback (no notice). Plain ASCII. Styles are injected below. */
(function () {
    "use strict";
    const CSS = `
.ap-pop { width: 380px; display: flex; flex-direction: column; }
.ap-pop > .k-popover-body { flex: 1 1 auto; min-height: 0; max-height: none; padding-top: 0; }
.ap-pop .k-popover-head .ap-type { margin-right: 4px; }
.ap-find { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 16px; margin-bottom: 4px; background: var(--cm-bg); border-bottom: 1px solid var(--cm-border); color: var(--cm-text-secondary); }
.ap-find input { flex: 1; min-width: 0; height: 28px; border: 0; outline: 0; background: none; font: inherit; color: var(--cm-text); }
.ap-find input::placeholder { color: var(--cm-text-tertiary); }
.ap-gh { height: 28px; padding: 8px 16px 0; font-weight: 550; color: var(--cm-text-secondary); }
.ap-entry { position: relative; isolation: isolate; display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 2px 12px 2px 16px; cursor: default; }
.ap-entry::before { content: ""; position: absolute; inset: 2px 8px; border-radius: 5px; z-index: -1; }
.ap-entry:hover::before, .ap-entry:focus-visible::before { background: var(--cm-bg-hover); }
.ap-entry:focus-visible { outline: none; }
.ap-entry:focus-visible::before { box-shadow: inset 0 0 0 1px var(--cm-border-selected); }
.ap-entry[aria-disabled="true"] .ap-name, .ap-entry[aria-disabled="true"] .ap-type { color: var(--cm-text-tertiary); }
.ap-type { flex: none; display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 4px; color: var(--cm-text-secondary); background: var(--cm-bg-secondary); }
.ap-txt { flex: 1 1 auto; min-width: 0; display: grid; line-height: 16px; }
.ap-sub { font-size: 11px; color: var(--cm-text-secondary); }
.ap-marks { display: inline-flex; gap: 6px; flex: none; color: var(--cm-text-tertiary); }
.ap-answers { padding: 8px 16px; line-height: 16px; }
.ap-scope { padding-top: 8px; }
.ap-stack { display: grid; gap: 6px; justify-items: start; min-width: 0; }
.ap-pop .ab-pop-foot { align-items: center; }
.ap-wnote { display: grid; gap: 4px; padding: 0 16px 8px 120px; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); }
.ap-wnote .k-badge { justify-self: start; }
.ap-cost { margin-right: auto; color: var(--cm-text-secondary); white-space: nowrap; }
`;
    if (!document.getElementById("ap-style")) document.head.append(h("style", { id: "ap-style" }, CSS));

    const ANCHOR = "[data-tool=Analyze]";
    // The row each entry adds (its type icon), from the result shape the element's catalog declares
    const MEASURE = { icon: "chart-column", section: "inspector-measure-row" };
    const RUN = { icon: "layers", section: "inspector-run-row" };
    const EDGESET = { icon: "spline", section: "inspector-group-set-path-row" };
    const PATH = { icon: "waypoints", section: "inspector-group-set-path-row" };
    const PAIRS = { icon: "link", section: "inspector-run-row" };

    // A stand-in for graphty-element's catalog.algorithms() and catalog.metrics(). weight: how the
    // entry reads a weight, "flow" (as strength) or "distance" (as distance), or null (no Weight row).
    // The meaning control defaults from the load, not from this; when they differ the run converts.
    // key: the one key option [label, default, choices]; node: "start" or "pair" (fields that pick
    // nodes); cost: a costly entry (offers Exact | Sampled); disabled: the precondition that fails here.
    const GROUPS = [
        {
            title: "Rank nodes and edges", entries: [
                { id: "pagerank", name: "PageRank", family: "Centrality", out: MEASURE, weight: "flow", key: ["Damping", "0.85", ["0.5", "0.85", "0.95"]], aliases: ["influence", "importance", "random walk"], answers: "Which nodes are connected to other well-connected nodes." },
                { id: "degree", name: "Degree", family: "Centrality", out: MEASURE, weight: "flow", key: ["Count", "Edges", ["Edges", "Sum of weights"]], aliases: ["connections", "hubs", "popular"], answers: "How many connections each node has." },
                { id: "betweenness", name: "Betweenness", family: "Centrality", out: MEASURE, weight: "distance", cost: true, aliases: ["brokers", "bridges", "gatekeepers", "bottlenecks"], answers: "Which nodes sit on the most shortest paths between others." },
                { id: "closeness", name: "Closeness", family: "Centrality", out: MEASURE, weight: "distance", cost: true, key: ["Variant", "Per component", ["Per component", "Whole graph"]], aliases: ["reach", "distance to everyone"], answers: "Which nodes reach every other node in the fewest steps." },
                { id: "eigenvector", name: "Eigenvector", family: "Centrality", out: MEASURE, weight: "flow", aliases: ["prestige", "well connected friends"], answers: "Which nodes are tied to other central nodes." },
                { id: "katz", name: "Katz", family: "Centrality", out: MEASURE, weight: "flow", key: ["Attenuation", "0.1", ["0.05", "0.1", "0.2"]], aliases: ["influence", "reach through friends"], answers: "Which nodes reach many others by short walks." },
                { id: "hits", name: "HITS", family: "Centrality", out: RUN, weight: "flow", direction: true, aliases: ["hubs", "authorities", "who points to whom"], answers: "Which nodes point to good sources, and which are pointed to.", disabled: "Needs direction: this graph is undirected" },
                { id: "core", name: "Core number", family: "Structure", out: MEASURE, weight: null, aliases: ["k-core", "coreness"], answers: "How deep in the dense core of the graph each node sits." },
            ],
        },
        {
            title: "Find groups", entries: [
                { id: "louvain", name: "Louvain", family: "Community", out: RUN, weight: "flow", key: ["Resolution", "1.0", ["0.5", "1.0", "1.5", "2.0"]], aliases: ["communities", "clusters", "modularity"], answers: "Which nodes form densely connected groups." },
                { id: "leiden", name: "Leiden", family: "Community", out: RUN, weight: "flow", key: ["Resolution", "1.0", ["0.5", "1.0", "1.5", "2.0"]], aliases: ["communities", "clusters"], answers: "Densely connected groups, each connected inside." },
                { id: "label-propagation", name: "Label propagation", family: "Community", out: RUN, weight: "flow", key: ["Seed", "Random", ["Random", "1", "42"]], aliases: ["communities", "fast clusters"], answers: "Groups found by letting neighbors vote on a label." },
                { id: "girvan-newman", name: "Girvan-Newman", family: "Community", out: RUN, weight: "distance", cost: true, key: ["Groups", "Best split", ["Best split", "2", "5", "10"]], aliases: ["communities", "divisive", "dendrogram"], answers: "Groups found by cutting the busiest edges one at a time." },
                { id: "components", name: "Connected components", family: "Components", out: RUN, weight: null, aliases: ["islands", "pieces", "disconnected"], answers: "Which parts of the graph are cut off from each other." },
                { id: "scc", name: "Strongly connected components", family: "Components", out: RUN, weight: null, direction: true, aliases: ["cycles", "loops"], answers: "Groups in which every node reaches every other.", disabled: "Needs direction: this graph is undirected" },
                // One door for "one group per hop": the Neighborhood popover (Add as steps). This entry only opens it.
                { id: "steps-away", name: "Neighborhood", family: "Traversal", out: RUN, weight: null, opens: ["selection-bar", "neighborhood"], aliases: ["steps away", "breadth-first", "bfs", "hops", "degrees of separation"], answers: "Which nodes are one, two or more steps from the selection." },
                { id: "dfs", name: "Depth-first order", family: "Traversal", out: MEASURE, weight: null, node: "start", aliases: ["visit order", "traversal", "dfs", "explore"], answers: "The order a walk visits nodes, going deep before backing up." },
            ],
        },
        {
            title: "Find paths and edge sets", entries: [
                { id: "shortest-path", name: "Shortest path", family: "Shortest path", out: PATH, weight: "distance", opens: ["path-popover", "from-analyze"], aliases: ["route", "how are they connected", "dijkstra"], answers: "The fewest steps, or the lightest route, between two nodes." },
                { id: "min-cut", name: "Minimum cut", family: "Flow", out: EDGESET, weight: "flow", needsWeight: true, node: "pair", aliases: ["weakest cut", "bottleneck", "separate", "max flow"], answers: "The lightest set of edges that cuts one node off from another." },
                { id: "mst", name: "Minimum spanning tree", family: "Spanning tree", out: EDGESET, weight: "distance", needsWeight: true, key: ["Method", "Kruskal", ["Kruskal", "Prim"]], aliases: ["backbone", "skeleton", "kruskal", "prim"], answers: "The lightest set of edges that still connects every node." },
                { id: "matching", name: "Bipartite matching", family: "Matching", out: EDGESET, weight: null, aliases: ["pairing", "assignment", "two sides"], answers: "The most edges pairing one side with the other.", disabled: "Needs two sides: this graph is not bipartite" },
            ],
        },
        {
            title: "Measure the graph", entries: [
                { id: "all-pairs", name: "All-pairs distance", family: "Shortest path", out: PAIRS, weight: "distance", cost: true, aliases: ["distance matrix", "floyd-warshall", "how far apart", "diameter"], answers: "The shortest distance between every pair of nodes." },
                { id: "link-prediction", name: "Link prediction", family: "Link prediction", out: PAIRS, weight: null, key: ["Method", "Adamic-Adar", ["Adamic-Adar", "Jaccard", "Common neighbors"]], aliases: ["missing links", "likely ties", "who should know whom"], answers: "Which unconnected pairs are most likely to be connected." },
            ],
        },
    ];
    // The weight chosen when each graph was loaded (owner: every run uses it unless the run picks
    // another). The Weight line lists the rest from the field list (AB.fieldsOf).
    const GRAPHS = {
        lesmis: { weight: "value", meaning: "stronger", desc: "Co-appearances per pair", directed: false },
        transactions: { weight: "amount", meaning: "stronger", desc: "Amount per transfer", directed: true },
        doorEntries: { weight: "count", meaning: "stronger", desc: "Entries per person and building (One edge per: Pair)", directed: true, bipartite: true,
            nodeWeight: "floors", nodeWeightOf: "building", nodeWeightRest: "person" },
        wide: { weight: "bytes_total_24h", meaning: "stronger", desc: "Bytes per connection in 24 hours", directed: true },
        nested: { weight: "weight", meaning: "stronger", desc: "Strength per link (links' weight column)", directed: false },
        plainJson: { weight: "weight", meaning: "stronger", desc: "Strength per link", directed: false },
    };
    // The door entries' loaded weight follows the last Load: count under Pair, none under Row or as nodes
    const graphOf = (ds) => (ds === "doorEntries" && AB.fx.datasets.doorEntries.loaded.per !== "pair"
        ? Object.assign({}, GRAPHS.doorEntries, { weight: null, desc: AB.fx.datasets.doorEntries.loaded.per === "row" ? "One edge per: Row" : "Each entry as a node" })
        : ds === "nested" ? Object.assign({}, GRAPHS.nested, { weight: AB.nestedLoaded().weight, directed: AB.nestedLoaded().direction === "directed" })
            : GRAPHS[ds] || GRAPHS.lesmis);
    // A precondition the graph on screen meets switches its entry on
    const disabledOf = (e) => (e.direction && graphOf(ui.ds).directed) || (e.id === "matching" && graphOf(ui.ds).bipartite) ? null : e.disabled;
    const AS = { stronger: "as strength", farther: "as distance", capacity: "as capacity" };
    const DS_OF = { transfers: "transactions", "node-weight": "doorEntries", "wide-weight": "wide" };
    const ALL = GROUPS.flatMap((g) => g.entries);
    const byId = (id) => ALL.find((e) => e.id === id);
    const RECENT = ["louvain", "pagerank", "shortest-path"];
    // Rows the paint tree holds at rest: analyzing one of these revises that row
    const HAS_ROW = { pagerank: "PageRank", louvain: "Louvain" };
    const hasRow = (e) => (ui.ds === "lesmis" ? HAS_ROW[e.id] : null);
    // The selection in the scoped state: the five nodes inspector-several-elements shows
    const SELECTED = ["Valjean", "Javert", "Thenardier", "Fantine", "Cosette"];

    let ui = null;
    let host = null;

    function reset(state) {
        // The project on screen: Analyze opened from the door entries or the transfers runs on them
        ui = { state, ds: DS_OF[state] || (AB.route && AB.route.frame.dataset) || "lesmis", level: "list", query: "", picked: null, sel: state === "scoped", scope: "sel" };
        if (state === "search") ui.query = "brokers";
        if (state === "no-match") ui.query = "sentiment";
        if (state === "essentials" || state === "transfers" || state === "wide-weight") pick("pagerank", true);
        if (state === "node-weight") { pick("pagerank", true); ui.nodeW = true; }
        // This run overrides both: Edge betweenness, read as distance, so busy bridges count as long hops
        if (state === "weight-override") { pick("closeness", true); ui.weight = "Edge betweenness"; ui.meaning = "farther"; }
        if (state === "revise") { pick("louvain", true); ui.key = "1.5"; }
    }

    function matches(e, q) {
        q = q.trim().toLowerCase();
        return !q || e.name.toLowerCase().includes(q) || e.family.toLowerCase().includes(q) || e.aliases.some((a) => a.includes(q));
    }

    // Marks are bare icons; the tooltip says what each means
    function marks(e) {
        const m = (ic, name) => AB.tip(h("span", { tabindex: "-1" }, icon(ic, "sm")), name);
        return h("span", { class: "ap-marks" },
            e.direction ? m("arrow-right", "Needs direction") : null,
            e.needsWeight ? m("hash", "Needs a weight") : null,
            e.cost ? m("clock", "Slow on large graphs") : null);
    }
    const typeIcon = (e) => h("span", { class: "ap-type", "aria-hidden": "true" }, icon(e.out.icon, "sm"));

    function pick(id, quiet) {
        const e = byId(id);
        if (e.opens) return AB.go(e.opens[0], e.opens[1]);
        const G = graphOf(ui.ds);
        Object.assign(ui, { level: "pick", picked: id, weight: e.weight ? G.weight : null, meaning: G.meaning, nodeW: !!G.nodeWeight, dir: "follow", key: null, sampled: "exact", start: ui.sel && ui.scope === "sel" ? SELECTED[0] : null, from: null, to: null });
        if (!quiet) draw();
    }
    function back() {
        if (ui.level === "pick") { ui.level = "list"; ui.picked = null; }
        else if (ui.query) ui.query = "";
        else return AB.close();
        draw();
    }

    function entryRow(e) {
        const dis = disabledOf(e);
        const el = h("div", Object.assign({ class: "ap-entry", role: "button", "aria-disabled": dis ? "true" : null, tabindex: "0", "data-entry": e.id }, dis ? {} : AB.act({ onClick: () => pick(e.id) })),
            typeIcon(e),
            h("span", { class: "ap-txt" }, h("span", { class: "ap-name k-ellipsis" }, e.name), h("span", { class: "ap-sub k-ellipsis" }, dis || e.answers)),
            marks(e));
        return AB.tip(el, e.family, { label: false });
    }

    // Scope: only when something is selected, as the first line of either level
    function scopeLine() {
        if (!ui.sel) return null;
        return h("div", { class: "ap-scope" }, AB.fieldRow("On", AB.seg([["sel", SELECTED.length + " selected nodes"], ["all", "Whole graph"]], ui.scope, (v) => { ui.scope = v; draw(); }, { label: "Run on" }), { popover: true }));
    }

    function listBody() {
        const body = h("div", { class: "ap-list", role: "region", "aria-label": "Algorithms" });
        let gid = 0;
        const group = (title, entries) => {
            const id = "ap-gh-" + ++gid;
            body.append(h("div", { class: "ap-gh", id }, title), h("div", { role: "group", "aria-labelledby": id }, entries.map(entryRow)));
        };
        if (!ui.query) group("Recent", RECENT.map(byId));
        let any = false;
        GROUPS.forEach((g) => {
            const hits = g.entries.filter((e) => matches(e, ui.query));
            if (hits.length) { any = true; group(g.title, hits); }
        });
        if (!any) {
            const clear = h("span", Object.assign({ class: "ab-link", role: "button" }, AB.act({ onClick: () => { ui.query = ""; draw(); } })), "Clear");
            body.append(h("div", { class: "ab-fl-none" }, AB.noMatch(ui.query), " ", clear));
        }
        return body;
    }

    function findField() {
        const input = h("input", { type: "search", value: ui.query, placeholder: "Search, or say what to find", "aria-label": "Search algorithms" });
        input.addEventListener("input", () => { ui.query = input.value; host.querySelector(".ap-list").replaceWith(listBody()); });
        return h("div", { class: "ap-find" }, icon("search", "sm"), input);
    }

    // A dropdown is a field that opens a dark menu of its choices
    function dropdown(value, choices, onPick, o) {
        // past 15 choices the list is the field list's (its find over these items)
        const items = () => choices.map((c) => ({ label: c, check: c === value, onClick: () => onPick(c) }));
        const f = AB.field(value || (o && o.placeholder), { caret: true, onClick: () => (choices.length > 15 ? AB.openFieldList(f, { items: items() }) : AB.openMenu(f, items())) });
        f.setAttribute("aria-haspopup", "menu");
        if (!value) f.classList.add("k-secondary");
        return f;
    }
    const NODES = () => {
        const X = AB.fx.datasets;
        if (ui.ds === "doorEntries") return [...new Set(X.doorEntries.tables[0].sample.map((r) => r.name))].concat(X.doorEntries.tables[1].sample.map((r) => r.bldg));
        if (ui.ds === "transactions") return X.transactions.rows.map((r) => r.id);
        if (["wide", "nested", "plainJson"].includes(ui.ds)) return AB.walkList(ui.ds).map((w) => w.name);
        return X.lesmis.rows.map((r) => r.label);
    };

    // Weight: the field list at menu size over the project's edge attributes (number ones first, the
    // loaded weight in use, "Not a number" disabled with the reason); the meaning defaults from the
    // load. No weight is the link under it. Anything else is this run's override, recorded in its
    // Made with, never in the data.
    function weightRows(e, body, row) {
        const G = graphOf(ui.ds);
        const label = ui.weight ? (ui.weight === G.weight ? ui.weight + " (loaded weight)" : ui.weight) : "None";
        const f = AB.field(label, { caret: true, onClick: () => AB.openFieldList(f, { kind: "number", element: "edge", current: ui.weight, results: false, notes: false, label: "Weight", onPick: (name) => { ui.weight = name; draw(); } }) });
        f.setAttribute("aria-haspopup", "listbox");
        f.setAttribute("aria-label", "Weight: " + (ui.weight || "None"));
        f.dataset.apWeight = "";
        row("Weight", f);
        if (ui.weight) {
            row("Higher means", h("span", { class: "ap-stack" },
                AB.seg([["stronger", "Stronger"], ["farther", "Farther"], ["capacity", "Capacity"]], ui.meaning, (v) => { ui.meaning = v; draw(); }, { label: "Higher weight means" }),
                AB.needsElement("graphty-element's weight meaning is distance or strength only, and the loaded weight carries no meaning: Capacity and the meaning chosen at load need it")));
        }
        const link = (text, fn) => h("span", Object.assign({ class: "ab-link", role: "button" }, AB.act({ onClick: () => { fn(); draw(); } })), text);
        const useLoaded = link(G.weight ? "Use the loaded weight" : "Use no weight", () => { ui.weight = G.weight; ui.meaning = G.meaning; });
        const noWeight = ui.weight && G.weight && ui.weight === G.weight && !e.needsWeight ? link("Use no weight", () => { ui.weight = null; }) : null;
        // the graph inspector's words: "value, stronger"
        const loaded = G.weight ? "Loaded weight: " + G.weight + ", " + G.meaning + ". " : "Loaded weight: none (each edge counts 1). " + G.desc + ".";
        const over = ui.weight !== G.weight || (ui.weight && ui.meaning !== G.meaning);
        const reads = e.weight === "distance" ? "farther" : "stronger";
        const conv = ui.weight && ui.meaning !== "capacity" && ui.meaning !== reads
            ? e.name + " reads a weight " + AS[reads] + ": it uses 1/" + ui.weight + "." : null;
        body.append(h("div", { class: "ap-wnote" },
            over ? h("span", { class: "k-badge" }, "This run's override") : null,
            over ? h("span", null, "Recorded in this run's Made with. The data keeps it: " + (G.weight ? G.weight + ", " + G.meaning : "no weight") + ". ", useLoaded) : h("span", null, loaded, noWeight),
            conv ? h("span", null, conv) : null));
        if (e.nodeWeight && G.nodeWeight) {
            // The same words as the floors attribute inspector: one candidate entry reads node weight, and it waits on the element
            const lw = G.nodeWeight + " (" + G.nodeWeightOf + ", loaded)";
            const nw = ui.nodeW ? lw : "None";
            row("Node weight", h("span", { class: "ap-stack" },
                dropdown(nw, [lw, "None"], (c) => { ui.nodeW = c !== "None"; draw(); }),
                ui.nodeW ? h("span", { class: "k-secondary" }, "Restart weights: each " + G.nodeWeightOf + " weighs its " + G.nodeWeight + "; each " + G.nodeWeightRest + " weighs 1 (no weight column).")
                    : h("span", { class: "ap-stack k-secondary" }, h("span", { class: "k-badge" }, "This run's override"), h("span", null, "Recorded in this run's Made with. The data keeps it: " + G.nodeWeight + " (" + G.nodeWeightOf + "). "),
                        h("span", Object.assign({ class: "ab-link", role: "button" }, AB.act({ onClick: () => { ui.nodeW = true; draw(); } })), "Use the loaded node weight")),
                AB.needsElement("PageRank's restart weights read node weight once its catalog entry carries nodeWeighted; no graphty-element entry reads node weight yet")));
        }
    }

    function essentialsBody(e) {
        // PageRank on the door entries offers the node weight loaded with them (floors)
        if (ui.state === "node-weight" || (ui.ds === "doorEntries" && e.id === "pagerank")) e = Object.assign({}, e, { nodeWeight: true });
        const body = h("div", null, scopeLine(), h("div", { class: "ap-answers" }, e.answers));
        const row = (label, ctl) => body.append(AB.fieldRow(label, ctl, { popover: true }));
        if (e.weight) weightRows(e, body, row);
        if (graphOf(ui.ds).directed) row("Direction", AB.seg([["follow", "Follow"], ["ignore", "Ignore"]], ui.dir, (v) => { ui.dir = v; draw(); }, { label: "Direction" }));
        if (e.node === "start") row("Start", dropdown(ui.start, NODES(), (c) => { ui.start = c; draw(); }, { placeholder: "Choose a node" }));
        if (e.node === "pair") {
            row("From", dropdown(ui.from, NODES(), (c) => { ui.from = c; draw(); }, { placeholder: "Choose a node" }));
            row("To", dropdown(ui.to, NODES(), (c) => { ui.to = c; draw(); }, { placeholder: "Choose a node" }));
        }
        // A number is typed (drag its name to scrub); a choice is a dropdown
        if (e.key && /^[\d.]+$/.test(e.key[1])) {
            const inp = h("input", { class: "ab-sin k-num", type: "text", inputmode: "decimal", value: ui.key || e.key[1], "aria-label": e.key[0], spellcheck: "false" });
            inp.addEventListener("change", () => { ui.key = inp.value.trim(); });
            row(AB.scrub(h("span", null, e.key[0]), inp, { onSet: (v) => { ui.key = String(v); } }), inp);
        } else if (e.key) row(e.key[0], dropdown(ui.key || e.key[1], e.key[2], (c) => { ui.key = c; draw(); }));
        if (e.cost) row("Precision", AB.seg([["exact", "Exact"], ["sampled", "Sampled"]], ui.sampled, (v) => { ui.sampled = v; draw(); }, { label: "Precision" }));
        if (!e.weight && !e.node && !e.key && !e.cost) body.append(AB.empty("Nothing to set."));
        return body;
    }

    // Betweenness is the run the tree's "Run in progress" state shows; an update opens the revised row
    function run(e, asCopy) {
        if (e.id === "betweenness") return AB.go("analyze-popover", "running");
        if (hasRow(e) && !asCopy) return AB.go(e.out.section, "data");
        AB.flash("Would add " + e.name + (asCopy ? " as a copy" : "") + " at the top of the list, running (not modeled in the skeleton)");
    }

    function essentialsFoot(e) {
        const missing = e.node === "start" && !ui.start ? "Choose a start node" : e.node === "pair" && !(ui.from && ui.to) ? "Choose From and To" : null;
        const n = ui.sel && ui.scope === "sel" ? SELECTED.length : ui.ds === "transactions" ? AB.fx.datasets.transactions.nodes : ui.ds === "doorEntries" ? AB.fx.datasets.doorEntries.loadedTypes().total
            : ui.ds === "nested" ? AB.walkList("nested").length + AB.fx.datasets.nested.recordArrays["data.institutions[]"] : AB.fx.datasets[ui.ds] && AB.fx.datasets[ui.ds].nodes || AB.fx.datasets.lesmis.nodes;
        const cost = AB.tip(h("span", { class: "ap-cost", tabindex: "0" }, e.id === "all-pairs" && ui.sampled === "exact" ? "About a second" : "Under a second"), "Estimated on " + n + " nodes", { label: false });
        const main = hasRow(e) ? "Update " + hasRow(e) + " row" : "Run";
        const runBtn = AB.button(main, { key: "Enter", disabled: missing, onClick: () => run(e, false) });
        runBtn.setAttribute("data-autofocus", "");
        runBtn.classList.add("ap-run");
        return [cost, hasRow(e) ? AB.button("Run as copy", { kind: "secondary", onClick: () => run(e, true) }) : null, runBtn];
    }

    function draw() {
        const e = ui.level === "pick" ? byId(ui.picked) : null;
        const title = e
            ? [AB.iconButton("chevron-left", "Back to the list", { key: "Esc", onClick: back }), typeIcon(e), e.name]
            : "Analyze";
        const pop = AB.popover({
            anchor: ANCHOR,
            title,
            body: e ? essentialsBody(e) : [findField(), scopeLine(), listBody()],
            foot: e ? essentialsFoot(e) : null,
            place: "above-toolbar",
        });
        pop.classList.add("ap-pop");
        pop.setAttribute("aria-label", e ? "Analyze: " + e.name : "Analyze");
        pop.addEventListener("keydown", (ev) => {
            if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); back(); return; }
            if (ev.key === "Enter" && e && !ev.target.closest(".k-seg, .k-field, .k-btn, .k-icon-btn, input")) {
                ev.preventDefault();
                const b = pop.querySelector(".ap-run");
                if (b && b.getAttribute("aria-disabled") !== "true") b.click();
            }
        });
        host.replaceChildren(pop);
        const tb = document.getElementById("ab-toolbar");
        if (tb && !e) pop.style.height = Math.min(480, Math.max(240, tb.getBoundingClientRect().top - host.getBoundingClientRect().top - 16)) + "px";
        setTimeout(() => {
            if (ui.state === "find-paths" && ui.level === "list") {
                // The catalog's entry, not Recent's copy
                const all = pop.querySelectorAll("[data-entry=shortest-path]");
                const f = all[all.length - 1];
                if (f) { f.scrollIntoView({ block: "center" }); f.focus(); }
                return;
            }
            // The hosts: the Weight line's field list open over the 26 connection attributes
            if (ui.state === "wide-weight" && e) { const w = pop.querySelector("[data-ap-weight]"); if (w) { ui.state = "essentials"; w.click(); } return; }
            const f = pop.querySelector(e ? ".ap-run" : ".ap-find input");
            if (f) f.focus();
        }, 20);
    }

    // Closed and running: the overlay lets clicks through and the Analyze button reads closed
    function passThrough(el) {
        setTimeout(() => { el.dataset.active = "false"; }, 0);
        const t = document.querySelector(ANCHOR);
        if (t) { t.setAttribute("aria-expanded", "false"); t.removeAttribute("data-open"); }
        return t;
    }

    registerSection({
        id: "analyze-popover",
        title: "Analyze popover",
        region: "overlay",
        rail: "graph",
        closeTo: "graph-place/at-rest",
        // Running: the tree of the project the run was started on (the screen before this one), its new row on top
        frame: (state) => (state === "running" ? ({ doorEntries: { own: true, dataset: "doorEntries", left: "graph-place/door-entries-running" }, transactions: { own: true, dataset: "transactions", left: "graph-place/transfers-running", canvas: AB.fx.datasets.transactions.fresh ? "canvas-and-states/transfers" : "canvas-and-states/transfers-communities" } }[AB.route && AB.route.frame.dataset] || { left: "graph-place/running" })
            : state === "scoped" ? { left: "graph-place/at-rest", right: "inspector-several-elements/style" }
            : state === "transfers" ? { dataset: "transactions", left: "graph-place/many-groups", canvas: "canvas-and-states/transfers" }
            : state === "node-weight" ? { dataset: "doorEntries", left: "data-place/door-entries", right: false }
            : state === "wide-weight" ? { dataset: "wide", left: "graph-place/at-rest" } : {}),
        states: [
            { id: "open", label: "Open: Recent and the catalog" },
            { id: "search", label: "Search: an alias match (brokers)" },
            { id: "no-match", label: "Search: no match (sentiment)" },
            { id: "scoped", label: "Five nodes selected: On line first" },
            { id: "essentials", label: "PageRank essentials: loaded weight value" },
            { id: "transfers", label: "Transfers: loaded weight amount, Direction" },
            { id: "wide-weight", label: "Hosts: the Weight line's field list over 26 connection attributes" },
            { id: "weight-override", label: "Weight override: Closeness on Edge betweenness" },
            { id: "node-weight", label: "Door entries: a node-weight line" },
            { id: "revise", label: "Louvain already has a row: Update or Run as copy" },
            { id: "find-paths", label: "Find paths: Shortest path opens the Path popover" },
            { id: "running", label: "After Run: row added, running" },
            { id: "closed", label: "Closed, focus back on Analyze" },
        ],
        render(el, state) {
            host = el;
            if (state === "closed") {
                const t = passThrough(el);
                if (t) setTimeout(() => t.focus(), 30);
                return;
            }
            if (state === "running") {
                passThrough(el);
                AB.announce("Betweenness added, running");
                return;
            }
            reset(state);
            draw();
        },
    });
})();
