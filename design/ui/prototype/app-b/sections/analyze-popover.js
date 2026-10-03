/* Analyze popover: the algorithm catalog in the one light popover (AB.popover), opened from the
   toolbar's Analyze button (Shift+A, which the shell binds; plain A is graphty-element's canvas key).
   List level: a filter of the list, Recent (three entries), then the catalog grouped by what a run adds to the tree.
   Picking an entry shows its essentials only: Scope (only when something is selected), Weight and its
   meaning, the one key option, Exact | Sampled (only where the exact run would not fit the time
   limit, defaulting to the largest sample that fits); the foot holds the cost line
   and Run. Shortest path opens the Path popover. Running closes the popover; the new row at the top
   of the tree is the feedback (no notice). Plain ASCII. Styles are injected below. */
(function () {
    "use strict";
    const CSS = `
.ap-pop { width: 380px; display: flex; flex-direction: column; }
.ap-pop > .k-popover-body { flex: 1 1 auto; min-height: 0; max-height: none; padding-top: 0; }
.ap-pop .k-popover-head .ap-type { margin-right: 4px; }
.ap-find { position: sticky; top: 0; z-index: 1; display: flex; padding: 8px 16px; background: var(--cm-bg); }
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
.ap-stack > .ap-sub { line-height: 16px; white-space: normal; }
.ap-name { display: flex; align-items: center; gap: 6px; min-width: 0; }
.ap-start { flex: none; font-size: 11px; color: var(--cm-text-secondary); }
.ap-marks { display: inline-flex; gap: 6px; flex: none; color: var(--cm-text-tertiary); }
.ap-answers { padding: 8px 16px; line-height: 16px; }
.ap-answers .ap-sub { display: block; }
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
                { id: "pagerank", reader: "PageRank: a node's share of a long random walk over the links; higher means more central.", name: "PageRank", family: "Centrality", start: true, out: MEASURE, weight: "flow", key: ["Damping", "0.85", ["0.5", "0.85", "0.95"], "How often the walk follows a link instead of jumping to any node; 0.85 is usual."], aliases: ["influence", "important", "importance", "random walk"], answers: "Which nodes are connected to other well-connected nodes." },
                // Link counts and weighted degree are named from the data, never from a domain: on a
                // directed graph each offers in, out and both as its one key option (SIDES below)
                // It says what it counts (edges, each 1 whatever its weight) and whether pairs repeat; where they do it
                // offers distinct neighbors instead (COUNTS below)
                // Degree is counted at load: its entry opens the degree histogram and the Nodes column and runs nothing
                { id: "degree-overview", reader: "Degree: how many edges a node has, counted when the data loaded.", name: "Degree", family: "Degree", out: MEASURE, weight: null, only: ["lesmis"], opens: ["inspector-measure-row", "degree-data"], aliases: ["degree", "connections", "hubs", "popular", "histogram", "distribution"], answers: "How many edges each node has: its histogram and the Nodes column." },
                { id: "degree", reader: "Link count: how many edges a node has; on a directed graph, those coming in, going out, or both together.", not: ["lesmis"], name: "Links (count)", rowName: (side) => (distinct() ? "Neighbors" : "Links") + sideWord(side, " total") + " (count)", family: "Degree", out: MEASURE, weight: null, sides: true, counts: true, aliases: ["degree", "connections", "hubs", "popular", "neighbors", "distinct neighbors"],
                    answersBy: { both: () => "How many edges each node has" + (graphOf(ui.ds).directed ? ", in and out together." : "."), in: "How many edges come into each node.", out: "How many edges go out of each node." },
                    answersDistinct: { both: () => "How many different nodes each node is linked to" + (graphOf(ui.ds).directed ? ", either way." : "."), in: "How many different nodes link into each node.", out: "How many different nodes each node links out to." } },
                { id: "weighted-degree", reader: "Weighted degree: the sum of a chosen edge weight over a node's edges.", name: "Weighted degree", rowName: (side, w) => (w ? "Total " + w + sideWord(side, " in and out") : "Weighted degree" + sideWord(side, " total")), family: "Degree", out: MEASURE, weight: "flow", needsWeight: true, sides: true, aliases: ["weighted degree", "strength", "sum of weights", "total", "volume"],
                    answersBy: { both: (w) => "The sum of " + w + " over each node's edges.", in: (w) => "The sum of " + w + " over the edges coming into each node.", out: (w) => "The sum of " + w + " over the edges going out of each node." } },
                { id: "betweenness", reader: "Betweenness: the share of shortest paths between other nodes that pass through a node.", name: "Betweenness", family: "Centrality", out: MEASURE, weight: "distance", cost: true, aliases: ["brokers", "bridges", "gatekeepers", "bottlenecks"], answers: "Which nodes sit on the most shortest paths between others." },
                { id: "closeness", reader: "Closeness: one over a node's average distance to the nodes it can reach.", name: "Closeness", family: "Centrality", out: MEASURE, weight: "distance", cost: true, key: ["Variant", "Per component", ["Per component", "Whole graph"], "Per component: distances within each piece. Whole graph: nodes it cannot reach count against it."], aliases: ["reach", "distance to everyone"], answers: "Which nodes reach every other node in the fewest steps." },
                { id: "eigenvector", reader: "Eigenvector centrality: high when a node's neighbors are central themselves.", name: "Eigenvector", family: "Centrality", out: MEASURE, weight: "flow", aliases: ["prestige", "well connected friends"], answers: "Which nodes are tied to other central nodes." },
                { id: "katz", reader: "Katz centrality: counts the walks from a node, a shorter walk counting more.", name: "Katz", family: "Centrality", out: MEASURE, weight: "flow", key: ["Attenuation", "0.1", ["0.05", "0.1", "0.2"], "How much each extra step counts; smaller favors near neighbors."], aliases: ["influence", "reach through friends"], answers: "Which nodes reach many others by short walks." },
                { id: "hits", reader: "Hub score: a node points to good sources. Authority score: good hubs point to it.", name: "HITS", family: "Centrality", out: RUN, weight: "flow", direction: true, aliases: ["hubs", "authorities", "who points to whom"], answers: "Which nodes point to good sources, and which are pointed to.", disabled: "Needs direction: this graph is undirected" },
                { id: "core", reader: "Core number: the deepest k-core a node is in; in a k-core every node has at least k neighbors inside it.", name: "Core number", family: "Structure", out: MEASURE, weight: null, aliases: ["k-core", "coreness"], answers: "How deep in the dense core of the graph each node sits." },
            ],
        },
        {
            title: "Find groups", entries: [
                { id: "louvain", reader: "Community: a group with more edges inside it than chance would give.", name: "Louvain", family: "Community", out: RUN, weight: "flow", key: ["Resolution", "1.0", ["0.5", "1.0", "1.5", "2.0"], "Higher finds more, smaller groups; lower finds fewer, larger ones."], aliases: ["communities", "clusters", "groups", "modularity"], answers: "Which nodes form densely connected groups." },
                { id: "leiden", reader: "Community: a group with more edges inside it than chance would give; Leiden keeps each one connected.", name: "Leiden", family: "Community", start: true, out: RUN, weight: "flow", key: ["Resolution", "1.0", ["0.5", "1.0", "1.5", "2.0"], "Higher finds more, smaller groups; lower finds fewer, larger ones."], aliases: ["communities", "clusters", "groups"], answers: "Densely connected groups, each connected inside." },
                { id: "label-propagation", reader: "Community: the groups that neighbors' labels settle into.", name: "Label propagation", family: "Community", out: RUN, weight: "flow", key: ["Seed", "Random", ["Random", "1", "42"], "A fixed seed gives the same groups on every rerun."], aliases: ["communities", "groups", "fast clusters"], answers: "Groups found by letting neighbors vote on a label." },
                { id: "girvan-newman", reader: "Community: the groups left after removing the busiest edges.", name: "Girvan-Newman", family: "Community", out: RUN, weight: "distance", cost: true, key: ["Groups", "Best split", ["Best split", "2", "5", "10"], "How many groups to stop at; Best split keeps the split with the highest modularity."], aliases: ["communities", "divisive", "dendrogram"], answers: "Groups found by cutting the busiest edges one at a time." },
                { id: "components", reader: "Connected component: a piece of the graph whose nodes all reach each other.", name: "Connected components", family: "Components", out: RUN, weight: null, aliases: ["islands", "pieces", "disconnected"], answers: "Which parts of the graph are cut off from each other." },
                { id: "scc", reader: "Strongly connected component: a group in which every node reaches every other along the edges' direction.", name: "Strongly connected components", family: "Components", out: RUN, weight: null, direction: true, aliases: ["cycles", "loops"], answers: "Groups in which every node reaches every other.", disabled: "Needs direction: this graph is undirected" },
                // One door for "one group per hop": the Neighborhood popover (Add as steps). This entry only opens it.
                { id: "steps-away", reader: "Neighborhood: the nodes within a number of steps of the selection.", name: "Neighborhood", family: "Traversal", out: RUN, weight: null, opens: ["selection-bar", "neighborhood"], aliases: ["steps away", "breadth-first", "bfs", "hops", "degrees of separation"], answers: "Which nodes are one, two or more steps from the selection." },
                { id: "dfs", reader: "Visit order: when a depth-first walk reaches each node.", name: "Depth-first order", family: "Traversal", out: MEASURE, weight: null, node: "start", aliases: ["visit order", "traversal", "dfs", "explore"], answers: "The order a walk visits nodes, going deep before backing up." },
            ],
        },
        {
            title: "Find paths and edge sets", entries: [
                { id: "shortest-path", reader: "Shortest path: the route with the fewest steps, or the lowest total distance.", name: "Shortest path", family: "Shortest path", start: true, out: PATH, weight: "distance", opens: ["path-popover", "from-analyze"], aliases: ["route", "cheapest route", "how are they connected", "dijkstra"], answers: "The fewest steps, or the lightest route, between two nodes." },
                // Max flow and min cut are named for the question they answer; the algorithm names are aliases
                { id: "max-flow", reader: "Most flow: the largest amount that can move from one node to another within the edges' capacities.", name: "Most flow", family: "Flow", out: MEASURE, weight: "capacity", needsWeight: true, node: "pair", aliases: ["max flow", "maximum flow", "throughput", "capacity"], answers: "The most that can move from one node to another, and over which edges." },
                { id: "min-cut", reader: "Weakest cut: the edges of least total capacity whose removal separates two nodes.", name: "Weakest cut", family: "Flow", out: EDGESET, weight: "capacity", needsWeight: true, node: "pair", aliases: ["minimum cut", "min cut", "bottleneck", "separate"], answers: "The lightest set of edges that cuts one node off from another." },
                { id: "bridges", reader: "Bridge: an edge whose removal cuts the graph apart.", name: "Bridges", family: "Structure", out: EDGESET, weight: null, aliases: ["bridge edges", "cut edges", "single points of failure"], answers: "Which edges, if removed, would cut the graph apart.",
                    reads: ["Each edge reads", "On a bridge edge, or Not on a bridge edge. The row holds only the bridge edges."] },
                { id: "mst", reader: "Spanning tree: edges that join every node with no cycle, at the least total weight.", name: "Minimum spanning tree", family: "Spanning tree", out: EDGESET, weight: "distance", needsWeight: true, key: ["Method", "Kruskal", ["Kruskal", "Prim"], "Kruskal and Prim find the same tree; they differ only in speed."], aliases: ["backbone", "skeleton", "kruskal", "prim"], answers: "The lightest set of edges that still connects every node." },
                { id: "matching", reader: "Matching: edges that share no node, pairing one side with the other.", name: "Bipartite matching", family: "Matching", out: EDGESET, weight: null, aliases: ["pairing", "assignment", "two sides"], answers: "The most edges pairing one side with the other.", disabled: "Needs two sides: this graph is not bipartite" },
            ],
        },
        {
            title: "Measure the graph", entries: [
                { id: "all-pairs", reader: "Distance: the length of the shortest path between two nodes.", name: "All-pairs distance", family: "Shortest path", out: PAIRS, weight: "distance", cost: true, aliases: ["distance matrix", "floyd-warshall", "how far apart", "diameter"], answers: "The shortest distance between every pair of nodes." },
                { id: "link-prediction", reader: "Link score: how strongly shared neighbors suggest an edge that is missing.", name: "Link prediction", family: "Link prediction", start: true, out: PAIRS, weight: null, key: ["Method", "Adamic-Adar", ["Adamic-Adar", "Jaccard", "Common neighbors"], "How a pair's shared neighbors are scored: Adamic-Adar weighs rare neighbors more."], aliases: ["missing links", "likely ties", "who should know whom"], answers: "Which unconnected pairs are most likely to be connected." },
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
        // The patent citations: the one graph whose betweenness has a cost estimate (it has no weight)
        citations: { weight: null, meaning: "stronger", desc: "No weight column", directed: true },
    };
    // The door entries' loaded weight follows the last Load: count under Pair, none under Row or as nodes
    const graphOf = (ds) => (ds === "doorEntries" && AB.fx.datasets.doorEntries.loaded.per !== "pair"
        ? Object.assign({}, GRAPHS.doorEntries, { weight: null, desc: AB.fx.datasets.doorEntries.loaded.per === "row" ? "One edge per: Row" : "Each entry as a node" })
        : ds === "nested" ? Object.assign({}, GRAPHS.nested, { weight: AB.nestedLoaded().weight, directed: AB.nestedLoaded().direction === "directed" })
            : GRAPHS[ds] || GRAPHS.lesmis);
    // A precondition the graph on screen meets switches its entry on
    const disabledOf = (e) => (e.direction && graphOf(ui.ds).directed) || (e.id === "matching" && graphOf(ui.ds).bipartite) ? null : e.disabled;
    const AS = { stronger: "as strength", farther: "as distance", capacity: "as capacity" };
    // The one line under Higher means: what the chosen reading does (the choices' own words are the control)
    const MEANS = { stronger: "A bigger weight is a closer tie.", farther: "A bigger weight is a longer hop.", capacity: "A bigger weight lets more flow through." };
    // Link counts and weighted degree: in, out or both, each named from the data
    const SIDES = ["both", "in", "out"];
    // On a directed graph a degree is never bare: both sides together say so ("Links total",
    // "Total amount in and out", the table's words); on an undirected graph there is one side
    const sideWord = (side, both) => (side === "in" || side === "out" ? " " + side : graphOf(ui.ds).directed ? both : "");
    // An entry's name and task line: a data-named entry follows the weight (and, once picked, its side)
    // In the list each side is its own row (sideOf), so in, out and total each carry their own line
    const picked = (e) => ui.level === "pick" && ui.picked === e.id;
    const nm = (e, side) => (!e.rowName ? e.name : picked(e) ? e.rowName(ui.side, ui.weight) : e.rowName(side || "both", graphOf(ui.ds).weight));
    const answersOf = (e, side) => {
        if (!e.answersBy) return e.answers;
        const a = e.answersDistinct && picked(e) && distinct() ? e.answersDistinct[ui.side] : e.answersBy[picked(e) ? ui.side : side || "both"];
        return typeof a === "function" ? a((picked(e) ? ui.weight : graphOf(ui.ds).weight) || "a chosen weight") : a;
    };
    // What a link count counts. A stand-in for graphty-element's data summary (repeated pairs): Les
    // Miserables has none (checked against miserables.json: 254 edges, 254 pairs), the transfers read the
    // fixture's parallelEdges, the door entries the last Load's report, and the loaded JSON and hosts
    // projects their own edge lists. Returns { pairs } (pairs of nodes joined by more than one edge,
    // same direction on a directed graph) or { edges, pairs } (edges over distinct pairs), or null.
    function repeatsOf(ds) {
        const X = AB.fx.datasets, D = X[ds];
        if (ds === "lesmis") return { pairs: 0 };
        if (ds === "transactions") return { pairs: D.stats.parallelEdges };
        if (ds === "doorEntries") {
            const e = D.report.entries, a = (D.loaded.add && e.added[D.loaded.add]) || e;
            return D.loaded.per === "row" ? { edges: D.loadedEdges(), pairs: a.pairEdges } : { pairs: 0 };
        }
        let list = null;
        if (ds === "wide") list = D.edgeRows.map((r) => [r.source, r.target]);
        if (ds === "plainJson") list = D.document.links.map((l) => [l.source, l.target]);
        if (ds === "nested") {
            const NL = AB.nestedLoaded(), seen = new Set();
            list = [];
            // co-authors per pair drop an id a researcher lists twice (the graph inspector's 510); per item, one edge per listed id
            if (NL.co === "edges") D.document.data.researchers.forEach((r) => r.relationships.coauthor_ids.forEach((c) => { const k = r.id + " " + c; if (NL.coPer !== "pair" || !seen.has(k)) { seen.add(k); list.push([r.id, c]); } }));
            if (NL.links) D.document.links.forEach((l) => list.push([l.source, l.target]));
        }
        if (!list) return null;
        const dir = graphOf(ds).directed, n = new Map();
        list.forEach(([a, b]) => { const k = dir ? a + " " + b : [a, b].sort().join(" "); n.set(k, (n.get(k) || 0) + 1); });
        return { pairs: [...n.values()].filter((v) => v > 1).length };
    }
    const repeats = (r) => !!r && (r.edges != null ? r.edges > r.pairs : r.pairs > 0);
    // Counts edges, or distinct neighbors (offered only where pairs repeat)
    const distinct = () => ui && ui.level === "pick" && ui.picked === "degree" && ui.counts === "neighbors";
    // The noun for an edge: the edge type's value only when the data declares one edge type (the door
    // entries' edge table, entries); otherwise plain "edge"
    const edgeNoun = (ds) => (ds === "doorEntries" && AB.fx.datasets.doorEntries.loaded.per !== "nodes" ? AB.fx.datasets.doorEntries.tables[2].name + " edge" : "edge");
    function countsRow(row) {
        const R = repeatsOf(ui.ds), one = edgeNoun(ui.ds), dir = graphOf(ui.ds).directed;
        const fact = !R ? null : R.edges != null
            ? AB.count(R.edges, one) + " join " + AB.count(R.pairs, "pair") + " of nodes."
            : R.pairs === 0 ? "No two nodes share more than one edge" + (dir ? " in the same direction." : ".")
                : AB.count(R.pairs, "pair") + " of nodes " + (R.pairs === 1 ? "shares" : "share") + " more than one edge" + (dir ? " in the same direction." : ".");
        const what = distinct() ? "Counts distinct neighbors: a node joined by several edges counts once."
            : "Counts " + one + "s: each " + one + " counts 1, whatever its weight.";
        row("Counts", h("span", { class: "ap-stack" },
            repeats(R) ? AB.seg([["edges", "Edges"], ["neighbors", "Distinct neighbors"]], ui.counts, (v) => { ui.counts = v; draw(); }, { label: "Counts" }) : null,
            h("span", { class: "ap-sub" }, what),
            fact ? h("span", { class: "ap-sub" }, fact) : AB.needsElement("graphty-element's data summary says how many pairs of nodes share more than one edge")));
    }
    // The list's rows: [entry, side]; a link count or weighted degree on a directed graph lists all three
    const rowsOf = (e) => ((e.only && !e.only.includes(ui.ds)) || (e.not && e.not.includes(ui.ds)) ? []
        : e.sides && graphOf(ui.ds).directed ? SIDES.map((s) => [e, s]) : [[e, null]]);
    // Edge results a run may read as a weight (the tree's Edge betweenness row on Les Miserables)
    const EDGE_RESULTS = { lesmis: ["Edge betweenness"] };
    // A stand-in for graphty-element's cost estimate, for betweenness only: per source, m at the
    // element's default rate (5,000,000 a second) unweighted, (m + n) log2 n weighted (one Dijkstra);
    // a 30 second time limit. On the transfers, weighted by amount, exact runs past the limit; every
    // other run on the projects the skeleton loads fits it.
    const RATE = 5e6, BUDGET = 30;
    function estimateOf(e, w) {
        const D = AB.fx.datasets[ui.ds];
        if (e.id !== "betweenness" || !D || !D.nodes || !D.edges) return null;
        const per = (w ? (D.edges + D.nodes) * Math.log2(D.nodes) : D.edges) / RATE, k = Math.min(D.nodes, Math.floor(BUDGET / per));
        const band = (sec) => (sec < 60 ? "under a minute" : sec < 600 ? "a few minutes" : "hours");
        return { exact: { seconds: D.nodes * per, withinBudget: D.nodes * per <= BUDGET }, sampled: [{ k, seconds: k * per, band: band(k * per) }], largestKWithinBudget: k };
    }
    // Exact | Sampled is offered only where the exact run would not fit the time limit
    const costly = (e) => { const est = e.cost ? estimateOf(e, ui.weight) : null; return est && !est.exact.withinBudget ? est : null; };
    const about = (sec) => (sec >= 5400 ? Math.round(sec / 3600) + " hours" : sec >= 90 ? Math.round(sec / 60) + " minutes" : Math.round(sec) + " seconds");
    // A sampled run names itself ("Betweenness, sampled 1,072"), in the header, the tree and Made with
    const runName = (e) => { const est = costly(e); return est && ui.sampled === "sampled" ? nm(e) + ", sampled " + AB.num(est.largestKWithinBudget) : nm(e); };
    let lastRun = null;
    // The set an exact run can fall back to on the transfers: High risk (riskScore 70 to 98)
    const subsetOf = () => (ui.ds === "transactions" ? { name: "High risk", n: AB.fx.datasets.transactions.setsAndPaths.highRisk.count } : null);
    // Each field label's one-line meaning, on hover and focus (the glossary's reader lines)
    const MEANING = {
        On: "What the run covers: the selected nodes, or the whole graph.",
        Weight: "The edge value the run reads. Edges with no value are left out of weighted paths.",
        "Higher means": "How the run reads a bigger weight: a closer tie, a longer hop, or more room to flow.",
        Measure: "Which edges count: those coming in, those going out, or both.",
        Direction: "Follow: paths go only the way edges point. Ignore: every edge works both ways.",
        Counts: "What one link adds to a node: each edge, or each different neighbor once.",
        Start: "The node the walk starts from.",
        From: "The node the flow or the cut starts from.",
        To: "The node the flow or the cut ends at.",
        "Node weight": "A value per node: the random walk restarts at each node in proportion to it.",
        Precision: "Exact computes from every node. Sampled estimates from part of them, within the time limit.",
        "Each edge reads": "The value the run writes on each edge.",
    };
    const lab = (text, meaning) => (meaning ? AB.tip(h("span", { tabindex: "0" }, text), meaning, { label: false }) : text);
    const nodesOf = () => (AB.fx.datasets[ui.ds] && AB.fx.datasets[ui.ds].nodes) || AB.fx.datasets.lesmis.nodes;
    const DS_OF = { "transfers-catalog": "transactions", costly: "transactions", declined: "transactions", transfers: "transactions", "transfers-pagerank": "transactions", "weighted-degree": "transactions", "link-counts": "transactions", "node-weight": "doorEntries", "wide-weight": "wide", "link-counts-repeats": "nested" };
    const ALL = GROUPS.flatMap((g) => g.entries);
    const byId = (id) => ALL.find((e) => e.id === id);
    // Recent: the last three entries run, newest first; each opens with its last settings, kept per
    // project. Les Miserables' are the runs its tree holds (Louvain and PageRank, both on the loaded weight).
    const RECENT = ["louvain", "pagerank", "shortest-path"];
    const LAST = { lesmis: { louvain: { key: "1.0", weight: "value", meaning: "stronger" }, pagerank: { key: "0.85", weight: "value", meaning: "stronger" } } };
    const KEEP = ["weight", "meaning", "nodeW", "dir", "key", "side", "counts", "sampled", "start", "from", "to"];
    const lastOf = (id) => (LAST[ui.ds] || {})[id] || null;
    function remember(e) {
        const s = {};
        KEEP.forEach((k) => { s[k] = ui[k]; });
        (LAST[ui.ds] = LAST[ui.ds] || {})[e.id] = s;
        RECENT.splice(0, RECENT.length, ...[e.id].concat(RECENT.filter((id) => id !== e.id)).slice(0, 3));
    }
    // A Recent entry's second line: the settings it opens with
    const lastLine = (e) => {
        const s = lastOf(e.id);
        if (!s) return null;
        return "Last run: " + [e.key ? e.key[0] + " " + (s.key || e.key[1]) : null, e.weight ? (s.weight ? "weight " + s.weight : "no weight") : null].filter(Boolean).join(", ");
    };
    // Rows the paint tree holds at rest, per project: analyzing one of these revises that row (matched
    // by the entry's name as picked, so Links in (count) on the transfers finds its row and Links out does not)
    const HAS_ROW = { lesmis: ["PageRank", "Louvain"], transactions: ["Louvain", "Links in (count)"] };
    // The transfers just loaded (or reloaded) hold no rows yet
    const freshT = () => ui.ds === "transactions" && (AB.fx.datasets.transactions.fresh || (AB.route && AB.route.frame.left === "graph-place/transfers-loaded"));
    const hasRow = (e) => (freshT() ? [] : HAS_ROW[ui.ds] || []).find((n) => n === nm(e)) || null;
    // The selection in the scoped state: the five nodes inspector-several-elements shows
    const SELECTED = ["Valjean", "Javert", "Thenardier", "Fantine", "Cosette"];

    let ui = null;
    let host = null;

    function reset(state) {
        // The project on screen: Analyze opened from the door entries or the transfers runs on them
        ui = { state, ds: DS_OF[state] || (AB.route && AB.route.frame.dataset) || "lesmis", level: "list", query: "", picked: null, sel: state === "scoped", scope: "sel" };
        // The box filters the list by name, family and the element's aliases
        const Q = { search: "brokers", "search-important": "important", "search-groups": "groups", "search-route": "cheapest route", "search-total": "total" };
        if (Q[state]) ui.query = Q[state];
        if (state === "no-match") ui.query = "sentiment";
        if (state === "essentials" || state === "transfers" || state === "transfers-pagerank" || state === "wide-weight") pick("pagerank", true);
        // The transfers, weighted by amount: exact betweenness would pass the time limit, so Sampled is the default
        if (state === "costly") pick("betweenness", true);
        // Exact chosen and Run pressed: graphty-element declines it, which is not a failure
        if (state === "declined") { pick("betweenness", true); ui.sampled = "exact"; ui.declined = true; }
        if (state === "node-weight") { pick("pagerank", true); ui.nodeW = true; }
        // This run overrides both: Edge betweenness, read as distance, so busy bridges count as long hops
        if (state === "weight-override") { pick("closeness", true); ui.weight = "Edge betweenness"; ui.meaning = "farther"; }
        if (state === "revise") { pick("louvain", true); ui.key = "1.5"; }
        if (state === "weight-list") { pick("closeness", true); ui.weight = "Edge betweenness"; ui.meaning = "farther"; }
        if (state === "weighted-degree") { pick("weighted-degree", true); ui.side = "in"; }
        if (state === "link-counts") { pick("degree", true); ui.side = "in"; }
        if (state === "link-counts-repeats") pick("degree", true);
        if (state === "bridges") pick("bridges", true);
    }

    function matches(e, q, side) {
        q = q.trim().toLowerCase();
        return !q || nm(e, side).toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || e.family.toLowerCase().includes(q) || e.aliases.some((a) => a.includes(q));
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

    function pick(id, quiet, side, recent) {
        const e = byId(id);
        if (e.opens) return AB.go(e.opens[0], e.opens[1]);
        const G = graphOf(ui.ds);
        // An exact run past the time limit defaults to the largest sample that fits
        const est = e.cost ? estimateOf(e, e.weight ? G.weight : null) : null;
        Object.assign(ui, { level: "pick", picked: id, weight: e.weight ? G.weight : null, meaning: G.meaning, nodeW: !!G.nodeWeight, dir: "follow", key: null, declined: false, subset: false, side: side || "both", counts: "edges", sampled: est && !est.exact.withinBudget ? "sampled" : "exact", start: ui.sel && ui.scope === "sel" ? SELECTED[0] : null, from: null, to: null, fromRecent: false });
        if (recent && lastOf(id)) Object.assign(ui, lastOf(id), { fromRecent: true });
        if (!quiet) draw();
    }
    function back() {
        if (ui.level === "pick") { ui.level = "list"; ui.picked = null; }
        else if (ui.query) ui.query = "";
        else return AB.close();
        draw();
    }

    // In its group (not under Recent) the one method to start with carries "Start here", at most one per
    // heading (an entry split into sides badges only its first row)
    // Under Recent (inGroup false) an entry opens with its last settings and its second line says them
    function entryRow(e, inGroup, side) {
        const dis = disabledOf(e);
        const recent = !inGroup;
        const el = h("div", Object.assign({ class: "ap-entry", role: "button", "aria-disabled": dis ? "true" : null, tabindex: "0", "data-entry": e.id }, dis ? {} : AB.act({ onClick: () => pick(e.id, false, side, recent) })),
            typeIcon(e),
            h("span", { class: "ap-txt" }, h("span", { class: "ap-name" }, h("span", { class: "k-ellipsis" }, nm(e, side)), inGroup && e.start && (!side || side === SIDES[0]) ? h("span", { class: "k-badge ap-start" }, "Start here") : null), h("span", { class: "ap-sub k-ellipsis" }, dis || (recent && lastLine(e)) || answersOf(e, side))),
            marks(e));
        return AB.tip(el, e.family + " family. " + e.reader, { label: false });
    }

    // Scope: only when something is selected, as the first line of either level
    function scopeLine() {
        if (!ui.sel) return null;
        return h("div", { class: "ap-scope" }, AB.fieldRow(lab("On", MEANING.On), AB.seg([["sel", AB.count(SELECTED.length, "selected node")], ["all", "Whole graph"]], ui.scope, (v) => { ui.scope = v; draw(); }, { label: "Run on" }), { popover: true }));
    }

    function listBody() {
        const body = h("div", { class: "ap-list", role: "region", "aria-label": "Algorithms" });
        let gid = 0;
        const group = (title, rows, inGroup) => {
            const id = "ap-gh-" + ++gid;
            body.append(h("div", { class: "ap-gh", id }, title), h("div", { role: "group", "aria-labelledby": id }, rows.map(([e, side]) => entryRow(e, inGroup, side))));
        };
        if (!ui.query) group("Recent", RECENT.map((id) => [byId(id), null]), false);
        let any = false;
        GROUPS.forEach((g) => {
            const hits = g.entries.flatMap(rowsOf).filter(([e, side]) => matches(e, ui.query, side));
            if (hits.length) { any = true; group(g.title, hits, true); }
        });
        if (!any) {
            const clear = h("span", Object.assign({ class: "ab-link", role: "button" }, AB.act({ onClick: () => { ui.query = ""; draw(); } })), "Clear");
            body.append(h("div", { class: "ab-fl-none" }, AB.noMatch(ui.query), " ", clear));
        }
        return body;
    }

    function findField() {
        const input = h("input", { type: "search", value: ui.query, placeholder: "Filter analyses", "aria-label": "Filter analyses" });
        input.addEventListener("input", () => { ui.query = input.value; host.querySelector(".ap-list").replaceWith(listBody()); });
        return h("div", { class: "ap-find" }, h("label", { class: "ab-find" }, icon("search", "sm"), input));
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

    // Weight: the field list at menu size, listing the loaded weight first, then None for this run
    // (not on an entry that needs a weight), then the project's other number attributes on edges and
    // its edge results; the meaning defaults from the load. Anything but the loaded weight is this
    // run's override, recorded in its Made with, never in the data.
    function weightItems(e, G) {
        const set = (w) => () => { ui.weight = w; ui.declined = false; draw(); };
        const edgeFields = AB.fieldsOf(ui.ds).filter((g) => g.element === "edge").flatMap((g) => g.fields).filter((x) => x.name !== G.weight);
        const nums = edgeFields.filter((x) => x.type === "num").map((x) => x.name);
        const other = edgeFields.filter((x) => x.type !== "num").map((x) => x.name);
        const none = e.needsWeight ? null : { label: G.weight ? "None for this run" : "None (loaded: each edge counts 1)", check: !ui.weight, onClick: set(null) };
        const items = G.weight ? [{ label: G.weight + " (loaded weight)", check: ui.weight === G.weight, onClick: set(G.weight) }, none] : [none];
        if (nums.length) items.push({ heading: "Other number attributes" }, ...nums.map((n) => ({ label: n, check: ui.weight === n, onClick: set(n) })));
        const res = EDGE_RESULTS[ui.ds] || [];
        if (res.length) items.push({ heading: "Results" }, ...res.map((n) => ({ label: n, check: ui.weight === n, onClick: set(n) })));
        // listed so Find reaches every attribute; a weight must be a number
        if (other.length) items.push({ heading: "Not a number (" + other.length + ")" }, ...other.map((n) => ({ label: n, disabled: true, desc: "Not a number" })));
        return items.filter(Boolean);
    }
    function weightRows(e, body, row) {
        const G = graphOf(ui.ds);
        const label = ui.weight ? (ui.weight === G.weight ? ui.weight + " (loaded weight)" : ui.weight) : G.weight ? "None for this run" : "None";
        const f = AB.field(label, { caret: true, onClick: () => AB.openFieldList(f, { items: weightItems(e, G), label: "Weight" }) });
        f.setAttribute("aria-haspopup", "listbox");
        f.setAttribute("aria-label", "Weight: " + label);
        f.dataset.apWeight = "";
        row("Weight", f);
        if (ui.weight) {
            row("Higher means", h("span", { class: "ap-stack" },
                AB.seg([["stronger", "Stronger"], ["farther", "Farther"], ["capacity", "Capacity"]], ui.meaning, (v) => { ui.meaning = v; draw(); }, { label: "Higher weight means" }),
                h("span", { class: "ap-sub" }, MEANS[ui.meaning]),
                AB.needsElement("graphty-element's weight meaning is distance or strength only, and the loaded weight carries no meaning: Capacity and the meaning chosen at load need it")));
        }
        const link = (text, fn) => h("span", Object.assign({ class: "ab-link", role: "button" }, AB.act({ onClick: () => { fn(); draw(); } })), text);
        const useLoaded = link(G.weight ? "Use the loaded weight" : "Use no weight", () => { ui.weight = G.weight; ui.meaning = G.meaning; });
        // the graph inspector's words: "value, stronger"
        const loaded = G.weight ? "Loaded weight: " + G.weight + ", " + G.meaning + ". " : "Loaded weight: none (each edge counts 1). " + G.desc + ".";
        const over = ui.weight !== G.weight || (ui.weight && ui.meaning !== G.meaning);
        const reads = e.weight === "distance" ? "farther" : e.weight === "capacity" ? "capacity" : "stronger";
        const conv = ui.weight && ui.meaning !== "capacity" && reads !== "capacity" && ui.meaning !== reads
            ? nm(e) + " reads a weight " + AS[reads] + ", so " + (reads === "farther" ? "stronger links count as shorter" : "longer links count as weaker") + " (it uses 1/" + ui.weight + ")." : null;
        // How many edges have no value for the weight: they are left out of weighted paths
        const wf = ui.weight && AB.fieldsOf(ui.ds).filter((g) => g.element === "edge").flatMap((g) => g.fields).find((x) => x.name === ui.weight);
        const pc = AB.projectCounts(ui.ds), nE = pc && pc.edges, miss = wf && nE ? Math.round(nE * (1 - (wf.fill == null ? 1 : wf.fill))) : 0;
        const gaps = !wf || !nE ? null : miss ? AB.count(miss, "edge", { of: nE }) + (miss === 1 ? " has" : " have") + " no " + ui.weight + ". They are left out of weighted paths."
            : "All " + AB.count(nE, "edge") + " have " + ui.weight + " set; none is left out.";
        body.append(h("div", { class: "ap-wnote" },
            gaps ? h("span", null, gaps) : null,
            over ? h("span", { class: "k-badge" }, "This run's override") : null,
            over ? h("span", null, "Recorded in this run's Made with. The data keeps it: " + (G.weight ? G.weight + ", " + G.meaning : "no weight") + ". ", useLoaded) : h("span", null, loaded),
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
        const body = h("div", null, scopeLine(), h("div", { class: "ap-answers" }, answersOf(e), ui.fromRecent ? h("span", { class: "ap-sub" }, "Opened with the last run's settings.") : null));
        const row = (label, ctl, meaning) => body.append(AB.fieldRow(typeof label === "string" ? lab(label, meaning || MEANING[label]) : label, ctl, { popover: true }));
        if (e.weight) weightRows(e, body, row);
        const directed = graphOf(ui.ds).directed;
        // In, out or both, named from the data; it takes the place of Direction
        if (e.sides && directed) row("Measure", dropdown(e.rowName(ui.side, ui.weight), SIDES.map((s) => e.rowName(s, ui.weight)), (c) => { ui.side = SIDES.find((s) => e.rowName(s, ui.weight) === c); draw(); }));
        if (directed && !e.sides) row("Direction", AB.seg([["follow", "Follow"], ["ignore", "Ignore"]], ui.dir, (v) => { ui.dir = v; draw(); }, { label: "Direction" }));
        if (e.counts) countsRow(row);
        if (e.node === "start") row("Start", dropdown(ui.start, NODES(), (c) => { ui.start = c; draw(); }, { placeholder: "Choose a node" }));
        if (e.node === "pair") {
            row("From", dropdown(ui.from, NODES(), (c) => { ui.from = c; draw(); }, { placeholder: "Choose a node" }));
            row("To", dropdown(ui.to, NODES(), (c) => { ui.to = c; draw(); }, { placeholder: "Choose a node" }));
        }
        // A number is typed (drag its name to scrub); a choice is a dropdown
        if (e.key && /^[\d.]+$/.test(e.key[1])) {
            const inp = h("input", { class: "ab-sin k-num", type: "text", inputmode: "decimal", value: ui.key || e.key[1], "aria-label": e.key[0], spellcheck: "false" });
            inp.addEventListener("change", () => { ui.key = inp.value.trim(); });
            row(AB.scrub(lab(e.key[0], e.key[3]), inp, { onSet: (v) => { ui.key = String(v); } }), inp);
        } else if (e.key) row(e.key[0], dropdown(ui.key || e.key[1], e.key[2], (c) => { ui.key = c; draw(); }), e.key[3]);
        if (e.reads) row(e.reads[0], h("span", { class: "ap-stack" }, e.reads[1]));
        const est = costly(e);
        if (est) {
            // Never swapped silently: both choices explain themselves before either is picked
            row("Precision", h("span", { class: "ap-stack" },
                AB.seg([["exact", "Exact"], ["sampled", "Sampled"]], ui.sampled, (v) => { ui.sampled = v; ui.declined = false; ui.subset = false; draw(); }, { label: "Precision" }),
                h("span", { class: "ap-sub" }, "Exact: Computed on every node, not estimated. It does not say the ranking is meaningful."),
                h("span", { class: "ap-sub" }, "Sampled: " + AB.count(est.largestKWithinBudget, "source") + " of " + AB.num(nodesOf()) + ": the largest sample that fits the time limit."),
                ui.declined && subsetOf() ? h("span", Object.assign({ class: "ab-link", role: "button" }, AB.act({ onClick: () => { ui.subset = true; ui.declined = false; draw(); } })), "Exact, on the " + AB.count(subsetOf().n, "node") + " in " + subsetOf().name + ". This is a different graph.") : null,
                ui.subset && subsetOf() ? h("span", { class: "ap-sub" }, "Exact, on the " + AB.count(subsetOf().n, "node") + " in " + subsetOf().name + ". This is a different graph.") : null));
        }
        if (!e.weight && !e.node && !e.key && !est && !e.reads && !e.counts && !(e.sides && directed)) body.append(AB.empty("Nothing to set."));
        return body;
    }

    // A run lands where the tree shows it: running then finished for a measure, the revised row for an update
    function run(e, asCopy) {
        const est = ui.sampled === "exact" && !(ui.subset && subsetOf()) ? costly(e) : null;
        // graphty-element declines an exact run past its time limit: not a failure, so no failure mark
        if (est) { ui.declined = true; draw(); return AB.announce("Not run: would take about " + about(est.exact.seconds)); }
        lastRun = runName(e) + (ui.subset && subsetOf() ? ", exact on " + subsetOf().name : "");
        // the run the tree's running and finished rows show (graph-place reads it; a copy is numbered)
        // A new row is named by its algorithm, numbered from the second when the tree already holds that name
        // (Les Miserables' "For the report" holds a Betweenness); Update revises the row it names, adding none
        const update = !!hasRow(e) && !asCopy, taken = (n) => (AB.paintRows || []).some((r) => r.name === n);
        let row = nm(e);
        if (!update && (asCopy || taken(row))) { let i = 2; while (taken(nm(e) + " " + i)) i++; row = nm(e) + " " + i; }
        AB.lastRun = { id: e.id, ds: ui.ds, name: lastRun, row, update, key: ui.key || (e.key && e.key[1]) || null, kind: e.out === RUN ? "run" : "measure" };
        remember(e);
        // Louvain on the transfers lands on the graph with its row (35 communities, the fixtures' March run)
        if (ui.ds === "transactions" && e.id === "louvain" && !asCopy) return AB.go("graph-place", "many-groups");
        // Les Miserables' Louvain at its run's settings reruns into its own row: the same 6 communities, dated just now
        const sameSettings = !(e.key && ui.key && ui.key !== e.key[1]);
        if (hasRow(e) && !asCopy && ui.ds === "lesmis" && e.id === "louvain" && sameSettings) return AB.go(e.out.section, "updated");
        // Connected components on Les Miserables finds one group: the tree's state for that result
        if (ui.ds === "lesmis" && e.id === "components") return AB.go("graph-place", "one-group");
        // Any other run (a new one, a copy or a rerun) lands on top, running, then finishes like Betweenness;
        // the inspector states of other results belong to other algorithms (Louvain's), so they would mislead
        AB.go("analyze-popover", "running");
    }

    function essentialsFoot(e) {
        const missing = e.node === "start" && !ui.start ? "Choose a start node" : e.node === "pair" && !(ui.from && ui.to) ? "Choose From and To" : e.needsWeight && !ui.weight ? "Choose a weight" : null;
        const n = ui.subset && subsetOf() ? subsetOf().n : ui.sel && ui.scope === "sel" ? SELECTED.length : ui.ds === "transactions" ? AB.fx.datasets.transactions.nodes : ui.ds === "doorEntries" ? AB.fx.datasets.doorEntries.loadedTypes().total
            : ui.ds === "nested" ? AB.walkList("nested").length + AB.fx.datasets.nested.recordArrays["data.institutions[]"] : AB.fx.datasets[ui.ds] && AB.fx.datasets[ui.ds].nodes || AB.fx.datasets.lesmis.nodes;
        const est = costly(e), fits = !est && e.cost ? estimateOf(e, ui.weight) : null;
        const sampledBand = est && (est.sampled.find((x) => x.k === est.largestKWithinBudget) || {}).band;
        const costText = ui.subset && subsetOf() ? "Under a second" : ui.declined && est ? "Not run: would take about " + about(est.exact.seconds)
            : est ? (ui.sampled === "exact" ? "About " + about(est.exact.seconds) : sampledBand.charAt(0).toUpperCase() + sampledBand.slice(1))
                : fits && fits.exact.seconds >= 1.5 ? "About " + about(fits.exact.seconds)
                    : e.id === "all-pairs" && ui.sampled === "exact" ? "About a second" : "Under a second";
        const cost = AB.tip(h("span", { class: "ap-cost", tabindex: "0" }, costText), "Estimated on " + AB.num(n) + " nodes", { label: false });
        const main = hasRow(e) ? "Update " + hasRow(e) + " row" : "Run";
        const runBtn = AB.button(main, { key: "Enter", disabled: missing, onClick: () => run(e, false) });
        runBtn.setAttribute("data-autofocus", "");
        runBtn.classList.add("ap-run");
        return [cost, hasRow(e) ? AB.button("Run as copy", { kind: "secondary", onClick: () => run(e, true) }) : null, runBtn];
    }

    function draw() {
        const e = ui.level === "pick" ? byId(ui.picked) : null;
        const title = e
            ? [AB.iconButton("chevron-left", "Back to the list", { key: "Esc", onClick: back }), typeIcon(e), runName(e)]
            : "Analyze";
        const pop = AB.popover({
            anchor: ANCHOR,
            title,
            body: e ? essentialsBody(e) : [findField(), scopeLine(), listBody()],
            foot: e ? essentialsFoot(e) : null,
            place: "above-toolbar",
        });
        pop.classList.add("ap-pop");
        pop.setAttribute("aria-label", e ? "Analyze: " + runName(e) : "Analyze");
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
            // Les Miserables: the same list with this run's override checked
            if ((ui.state === "wide-weight" || ui.state === "weight-list") && e) { const w = pop.querySelector("[data-ap-weight]"); if (w) { ui.state = "essentials"; w.click(); } return; }
            // The transfers: the list opens on its measures (link counts and totals), below Recent
            if (ui.state === "transfers-catalog" && !e) { const g = pop.querySelectorAll(".ap-gh")[1]; if (g) { g.style.scrollMarginTop = "40px"; g.scrollIntoView({ block: "start" }); } }
            const f = pop.querySelector(e ? ".ap-run" : ".ap-find input");
            if (f) f.focus({ preventScroll: true });
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
            : state === "transfers" || state === "transfers-catalog" || state === "transfers-pagerank" || state === "costly" || state === "declined" || state === "search-total" || state === "weighted-degree" || state === "link-counts" ? { dataset: "transactions", left: "graph-place/many-groups", canvas: "canvas-and-states/transfers" }
            : state === "node-weight" ? { dataset: "doorEntries", left: "data-place/door-entries", right: false }
            : state === "wide-weight" ? { dataset: "wide", left: "graph-place/at-rest" }
            : state === "link-counts-repeats" ? { dataset: "nested", left: "graph-place/nested" } : {}),
        states: [
            { id: "open", label: "Open: Recent and the catalog" },
            { id: "search", label: "Filter: an alias match (brokers)" },
            { id: "search-important", label: "Filter: a task word (important)" },
            { id: "search-groups", label: "Filter: a task word (groups)" },
            { id: "search-route", label: "Filter: a task word (cheapest route)" },
            { id: "search-total", label: "Transfers: filter total, weighted degree total, in and out" },
            { id: "no-match", label: "Filter: no match (sentiment)" },
            { id: "scoped", label: "Five nodes selected: On line first" },
            { id: "essentials", label: "PageRank essentials: loaded weight value" },
            { id: "transfers", label: "Transfers: PageRank essentials, Direction Follow or Ignore (directed data)" },
            { id: "transfers-catalog", label: "Transfers: the catalog, link counts and totals in, out and both" },
            { id: "transfers-pagerank", label: "Transfers: PageRank, loaded weight amount, Direction" },
            { id: "costly", label: "Transfers: Betweenness weighted by amount, Sampled by default (exact passes the time limit)" },
            { id: "declined", label: "Transfers: Exact declined, Not run: would take about 84 seconds" },
            { id: "wide-weight", label: "Hosts: the Weight line's field list over 26 connection attributes" },
            { id: "weight-override", label: "Weight override: Closeness on Edge betweenness" },
            { id: "weight-list", label: "Weight list: loaded weight, None for this run, then the rest" },
            { id: "weighted-degree", label: "Transfers: weighted degree, Total amount in" },
            { id: "link-counts", label: "Transfers: link count, Links in (count)" },
            { id: "link-counts-repeats", label: "Research network: link count where pairs repeat, Edges or Distinct neighbors" },
            { id: "bridges", label: "Bridges: Not on a bridge edge" },
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
                AB.announce((lastRun || "Betweenness") + " added, running");
                return;
            }
            reset(state);
            draw();
        },
    });
})();
