/* Inspector: a group, set or path row, in the shared inspector frame (spec 5.1, 5.2, 16).
   Header: name, kind, provenance link, "..." (the row's context menu). Style tab: a Paints line
   (what the row's selector covers, the count a link that selects it), the shared Style tab with
   only the properties the row sets, then a paint-order line (who covers it, the name a link that
   selects that row; reordering is dragging in the tree). Data tab: Summary, Members (top 10, the
   count a link), Made with, Notes. No verbs in the body: Keep as set, Select members, Show in
   table and the rest are in "...". Plain ASCII.

   Les Miserables numbers not in kit/fixtures.json (edges inside a group, density, degree within
   the group) were computed from graph-io's test corpus miserables.json with the kit's correction
   (Old Man's edge goes to Myriel), which reproduces the fixtures' 254 edges and every degree. The
   spanning tree's 76 edges follow from the graph being connected (77 nodes). The palettes in the
   picker's Libraries tab are graphty-element's PALETTE_DESCRIPTORS (src/catalog/palettes.ts). */
(function () {
    "use strict";
    const { h, icon } = AB;

    if (!document.querySelector("link[data-igs]")) document.head.append(h("link", { rel: "stylesheet", href: "sections/inspector-group-set-path-row.css", "data-igs": "" }));

    // ---------- data ----------
    // [edges inside, edges leaving, density, [[name, degree within the group], ...] top 10]
    const GROUPS = {
        2: [28, 29, 0.308, [["Valjean", 13], ["Bamatabois", 6], ["Brevet", 6], ["Champmathieu", 6], ["Chenildieu", 6], ["Cochepaille", 6], ["Judge", 6], ["Simplice", 1], ["Woman1", 1], ["Gervais", 1]]],
        8: [69, 27, 0.885, [["Gavroche", 12], ["Enjolras", 12], ["Bossuet", 12], ["Courfeyrac", 12], ["Bahorel", 12], ["Joly", 12], ["Combeferre", 11], ["Feuilly", 11], ["Grantaire", 10], ["Marius", 9]]],
        4: [36, 35, 0.655, [["Thenardier", 10], ["Eponine", 8], ["Babet", 8], ["Claquesous", 8], ["Gueulemer", 8], ["Mme.Thenardier", 7], ["Montparnasse", 7], ["Javert", 6], ["Brujon", 6], ["Anzelma", 3]]],
        1: [10, 3, 0.222, [["Myriel", 9], ["Mlle.Baptistine", 2], ["Mme.Magloire", 2], ["Champtercier", 1], ["Count", 1], ["CountessdeLo", 1], ["Cravatte", 1], ["Geborand", 1], ["Napoleon", 1], ["OldMan", 1]]],
        3: [30, 10, 0.667, [["Fantine", 9], ["Tholomyes", 7], ["Blacheville", 7], ["Dahlia", 7], ["Fameuil", 7], ["Favourite", 7], ["Listolier", 7], ["Zephine", 7], ["Marguerite", 1], ["Perpetue", 1]]],
        5: [12, 18, 0.267, [["Cosette", 5], ["Gillenormand", 5], ["Mlle.Gillenormand", 5], ["Lt.Gillenormand", 3], ["Toussaint", 1], ["Woman2", 1], ["BaronessT", 1], ["Magnon", 1], ["Mme.Pontmercy", 1], ["Mlle.Vaubois", 1]]],
        0: [2, 4, 0.333, [["Fauchelevent", 2], ["MotherInnocent", 1], ["Gribier", 1], ["MotherPlutarch", 0]]],
    };
    const OTHER = { members: [["Child1", 1], ["Child2", 1], ["Mme.Burgon", 1], ["Jondrette", 1], ["Boulatruelle", 0]], inside: 2, leaving: 4 };
    const WATCHLIST = { color: "#CC79A7", inside: 8, density: 0.8, members: [["Thenardier", 4], ["Mme.Thenardier", 4], ["Valjean", 3], ["Javert", 3], ["Eponine", 2]] };
    const RULESET = { name: "Degree 13 or more", color: "#F0E442", inside: 24, density: 0.667, members: [["Valjean", 7, 36], ["Gavroche", 7, 22], ["Marius", 6, 19], ["Enjolras", 6, 15], ["Javert", 5, 17], ["Thenardier", 5, 16], ["Bossuet", 5, 13], ["Courfeyrac", 4, 13], ["Fantine", 3, 15]] };
    const G4_WATCHED = ["Javert", "Thenardier", "Mme.Thenardier", "Eponine"];
    const COMMUNITIES = { 1: [25, "#E69F00"], 2: [17, "#56B4E9"], 3: [10, "#009E73", 2], 4: [10, "#0072B2"], 5: [9, "#D55E00"], 6: [6, "#CC79A7"] };

    const STATES = [
        { id: "style", label: "Style tab" },
        { id: "data", label: "Data tab" },
        { id: "two-properties", label: "Style: two properties set" },
        { id: "edges-side", label: "Style: the Edges side" },
        { id: "inherited", label: "Style: an inherited value" },
        { id: "invalid-value", label: "Style: an invalid value" },
        { id: "picker", label: "Color picker: Custom" },
        { id: "picker-libraries", label: "Color picker: Libraries" },
        { id: "notes", label: "Notes, from a row's note count" },
        { id: "overlap", label: "Partly covered" },
        { id: "watchlist", label: "Set (Watchlist)" },
        { id: "rule-set", label: "Rule set" },
        { id: "path-lesmis", label: "Path: Valjean to Javert" },
        { id: "path-lesmis-2", label: "Path: Myriel to Javert" },
        { id: "kept-2", label: "Kept set: Group 2 (kept), in a folder" },
        { id: "kept-8", label: "Kept set: Group 8 (kept), in a folder" },
        { id: "path", label: "Path from Path between" },
        { id: "path-style", label: "Path: Style" },
        { id: "path-edge-set", label: "Edge set: spanning tree" },
    ];
    const L0 = () => AB.fx.datasets.lesmis;
    const GROUP_IDS = ["2", "8", "4", "1", "3", "5", "0"];
    GROUP_IDS.forEach((g) => STATES.push({ id: "group-" + g, label: "Group " + g }));
    STATES.push({ id: "other", label: "Groups 6, 7 and 10" });
    Object.keys(COMMUNITIES).forEach((c) => STATES.push({ id: "community-" + c, label: "Community " + c + " (Louvain)" }));

    // ---------- small builders ----------
    const pct = (n, of) => Math.round((n / of) * 100) + "%";
    // Columns have no unit (owner, 2026-09-29): amounts are plain numbers named after their column
    const fmtAmount = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const oq = (text) => h("div", { class: "igs-oq" }, h("span", { class: "k-annot-tag" }, "Open question"), h("span", null, text));
    const lnk = (label, go) => AB.link(go[0], go[1], label, { class: "ab-link" });
    const act = (label, onClick) => h("span", Object.assign({ class: "ab-link" }, AB.act({ onClick })), label);
    const SELECT = ["inspector-several-elements", "style"];
    const PAGERANK = ["inspector-measure-row", "style"];
    const pr = () => lnk("PageRank", PAGERANK);
    const memberRow = (name, trail) => AB.row({ label: name, trail, go: ["inspector-node", name === "Valjean" ? "why-this-look" : "data"] });
    const acctRow = (id, k, n) => AB.row({ label: h("span", { class: "k-id" }, id), trail: k === 0 ? "start" : k === n - 1 ? "end" : "hop " + k, onClick: () => AB.flash("Selects " + id + " (not wired in the skeleton)") });
    const line = (...parts) => h("div", { class: "igs-line" }, ...parts);

    // ---------- Style tab ----------
    function styleTab(m, state) {
        const o = { kinds: ["node", "edge"], set: Object.assign({}, m.set), kind: m.styleKind || "node" };
        if (state === "two-properties" || state === "edges-side") o.set["edge.color"] = m.set["node.color"];
        if (state === "edges-side") o.kind = "edge";
        if (state === "inherited") o.inherited = { "node.shape": ["icosphere", "Everything"], "node.size": ["degree, from Degree", "Degree"] };
        if (state === "invalid-value") { o.set["node.size"] = -2; o.error = { "node.size": "Size must be 0 or more (got -2). The row keeps painting its last valid size." }; o.openSection = "Shape"; }
        if (state === "picker" || state === "picker-libraries") o.openSection = "Fill";
        return [
            AB.paintsLine(m.paints),
            AB.styleTab(o),
            // Paint order: one sentence (spec 5.1); any further lines are in its tooltip
            h("div", { class: "igs-order", title: m.order.slice(1).map((p) => [].concat(p).map((x) => (x instanceof Node ? x.textContent : x)).join("")).join(" ") || null }, line(...[].concat(m.order[0]))),
        ];
    }

    // ---------- Data tab ----------
    function dataTab(m, hot) {
        const members = AB.section({ title: "Members", actions: m.memberLink, collapsible: true, key: "igs.members", summary: m.rankedBy },
            h("div", { class: "ab-cap k-secondary" }, m.rankedBy), m.members || []);
        const notes = AB.notesSection(m.notes || 0, ["notes-place", "about-selection"]);
        if (hot) { notes.classList.add("igs-hot"); notes.id = "igs-notes"; }
        // Where the row came from is named once, by the header's provenance link (spec 5.1)
        const made = m.madeWith.filter((p) => !(Array.isArray(p) && p[0] === "Created from"));
        return [
            AB.section({ title: "Summary", collapsible: true, key: "igs.summary", summary: m.summary.map((r) => r[1]).join(", ") }, m.summary.map(([k, v, go]) => AB.data(k, v, go ? { go } : null))),
            members,
            AB.section({ title: "Made with", collapsible: true, key: "igs.madewith", summary: made[0] && made[0][1] }, made.map((p) => (p instanceof Node ? p : AB.data(p[0], p[2] ? lnk(p[1], p[2]) : p[1])))),
            m.dataQuestion ? oq(m.dataQuestion) : null,
            notes,
        ].filter(Boolean);
    }

    // ---------- the rows ----------
    const madeGroup = (L) => [["Created from", "Show as groups, on the attribute group", ["inspector-attribute-and-filter-step", "attribute"]], ["Scope", "Full graph, " + L.nodes + " nodes"], ["Data version", L.file + ", current"]];
    const shareOf = (n, L) => pct(n, L.nodes) + " of " + L.nodes + " nodes";
    const coveredGroup = (n) => [
        ["Covered by ", pr(), " for fill color on all " + n + " members."],
        ["Louvain, resolution 1.0 is higher too and colors all " + n + "."],
    ];
    const countLink = (text) => lnk(text, SELECT);

    function groupModel(g) {
        const L = L0();
        const leg = L.frame.legend.rows.find((r) => r.label === g);
        const [inside, leaving, density, top] = GROUPS[g];
        return {
            title: "Group " + g, color: leg.color, kind: "Group",
            provenance: ["from the attribute group", "inspector-attribute-and-filter-step", "attribute"],
            set: { "node.color": leg.color },
            paints: ["members of Group " + g + ": ", countLink(leg.count + " nodes, " + inside + " edges"), h("span", { class: "k-secondary" }, " (edges between members)")],
            order: coveredGroup(leg.count),
            summary: [["Size", leg.count + " nodes, " + inside + " edges"], ["Share of graph", shareOf(leg.count, L)], ["Density", String(density)], ["Edges leaving", String(leaving)]],
            memberLink: countLink(leg.count + " nodes"),
            rankedBy: (leg.count > 10 ? "Top 10 of " + leg.count : "All " + leg.count) + ", by degree within the group.",
            members: top.map(([n, d]) => memberRow(n, String(d))),
            madeWith: madeGroup(L),
        };
    }

    function otherModel() {
        const L = L0(), o = L.frame.legend.other;
        return {
            title: o.title, color: o.color, kind: "Group",
            provenance: ["from the attribute group", "inspector-attribute-and-filter-step", "attribute"],
            set: { "node.color": o.color },
            paints: ["members of groups 6, 7 and 10: ", countLink(o.count + " nodes, " + OTHER.inside + " edges")],
            order: coveredGroup(o.count),
            summary: [["Size", o.count + " nodes"], ["Share of graph", shareOf(o.count, L)], ["Groups", "6 (1 node), 7 (2), 10 (2)"], ["Edges inside their group", String(OTHER.inside)], ["Edges leaving", String(OTHER.leaving)]],
            memberLink: countLink(o.count + " nodes"),
            rankedBy: "All " + o.count + ", by degree within their own group.",
            members: OTHER.members.map(([n, d]) => memberRow(n, String(d))),
            madeWith: madeGroup(L),
        };
    }

    function overlapModel() {
        const m = groupModel("4");
        m.order = [
            [G4_WATCHED.length + " of 11 members show ", lnk("Watchlist", ["inspector-group-set-path-row", "watchlist"]), "'s color: " + G4_WATCHED.join(", ") + "."],
            ["PageRank and Louvain sit higher but are hidden, so they paint nothing now."],
            [h("span", { class: "k-tertiary" }, "Drag this row above Watchlist in the tree to win on all 11.")],
        ];
        return m;
    }

    function watchlistModel() {
        const L = L0(), W = WATCHLIST, n = W.members.length;
        return {
            title: "Watchlist", color: W.color, kind: "Set, locked",
            set: { "node.color": W.color },
            paints: ["members of Watchlist: ", countLink(n + " nodes, " + W.inside + " edges")],
            order: [["Covered by ", pr(), " for fill color on all " + n + " members."], ["Valjean to Javert is higher too and colors 2 of " + n + ": Valjean, Javert."]],
            summary: [["Size", n + " nodes, " + W.inside + " edges"], ["Share of graph", shareOf(n, L)], ["Density", String(W.density)], ["Groups", "4 (4 members), 2 (1)", ["inspector-group-set-path-row", "group-4"]]],
            memberLink: countLink(n + " nodes"),
            rankedBy: "All " + n + ", by degree within the set.",
            members: W.members.map(([nm, d]) => memberRow(nm, String(d))),
            madeWith: [["Created from", "Create set, on a selection"], ["Members", "Fixed: they do not follow the data"], ["Scope", "Full graph, " + L.nodes + " nodes"], ["Data version", L.file + ", current"]],
        };
    }

    function ruleSetModel() {
        const L = L0(), R = RULESET, n = R.members.length;
        return {
            title: R.name, color: R.color, kind: "Rule set",
            provenance: ["from degree", "inspector-attribute-and-filter-step", "attribute"],
            set: { "node.color": R.color },
            paints: ["nodes where degree is 13 or more: ", countLink(n + " nodes, " + R.inside + " edges")],
            order: [["Nothing above it paints these members: it wins fill color on all " + n + "."]],
            summary: [["Size", n + " nodes, " + R.inside + " edges"], ["Share of graph", shareOf(n, L)], ["Density", String(R.density)]],
            memberLink: countLink(n + " nodes"),
            rankedBy: "All " + n + ", by degree within the set, then degree in the graph.",
            members: R.members.map(([nm, d, full]) => memberRow(nm, d + " of " + full)),
            madeWith: [
                h("div", { class: "k-data" }, h("span", { class: "k-name" }, "Rule"), h("span", { class: "k-value" }, h("span", { class: "k-mono" }, "degree >= 13"))),
                ["Created from", "Create rule set..., on degree", ["inspector-attribute-and-filter-step", "attribute"]],
                ["Members", "Follow the data: recomputed when it changes"],
                ["Scope", "Full graph, " + L.nodes + " nodes"],
                ["Data version", L.file + ", current"],
            ],
            dataQuestion: "On a rule set, does Keep as set (in \"...\") freeze today's " + n + " members as a plain set?",
        };
    }

    function communityModel(c) {
        const L = L0(), [size, color, notes] = COMMUNITIES[c];
        return {
            title: "Community " + c, color, kind: "Group",
            provenance: ["from Louvain, Sep 28", "inspector-run-row", "data"],
            set: { "node.color": color },
            paints: ["members of Community " + c + ": ", countLink(size + " nodes")],
            order: [["Covered by ", pr(), " for fill color on all " + size + " members."]],
            summary: [["Size", size + " nodes"], ["Share of graph", shareOf(size, L)]],
            memberLink: countLink(size + " nodes"),
            rankedBy: "Louvain ranks nothing; the table lists every member with its values.",
            members: [],
            madeWith: [["Created from", "Louvain, resolution 1.0, Sep 28", ["inspector-run-row", "data"]], ["Scope", "Full graph, " + L.nodes + " nodes"], ["Data version", L.file + ", current"]],
            notes: notes || 0,
        };
    }

    // Myriel to Javert: Myriel, Valjean, Javert (2 edges; networkx 3.1, see graph-place.js)
    function lesmisPath2Model() {
        const L = L0();
        return {
            title: "Myriel to Javert", icon: "route", color: "#0072B2", kind: "Path",
            provenance: ["from Shortest paths", "inspector-run-row", "data"],
            set: { "node.color": "#0072B2", "edge.color": "#0072B2" },
            paints: ["the path's ", countLink("3 nodes, 2 edges")],
            order: [["Covered by ", pr(), " for fill color on its 3 nodes."], ["Wins line color on its 2 edges: no row above it paints edges."]],
            summary: [["From", "Myriel, group 1", ["inspector-node", "data"]], ["To", "Javert, group 4, degree 17", ["inspector-node", "data"]], ["Length", "2 edges, through Valjean"]],
            memberLink: countLink("3 nodes"),
            rankedBy: "In path order, start to end.",
            members: [memberRow("Myriel", "start"), memberRow("Valjean", "hop 1"), memberRow("Javert", "end")],
            madeWith: [["Created from", "Shortest paths", ["inspector-run-row", "data"]], ["Weight", "Not used: fewest edges"], ["Scope", "Full graph, " + L.nodes + " nodes"], ["Data version", L.file + ", current"]],
        };
    }
    // A group kept as a set (Keep as set): fixed members, its own row, free to sit in a folder
    function keptModel(g) {
        const m = groupModel(g);
        return Object.assign(m, {
            title: "Group " + g + " (kept)", kind: "Set", icon: "circle-check",
            provenance: ["kept from Group " + g + ", Sep 28", "inspector-attribute-and-filter-step", "attribute"],
            paints: ["members of this set: ", m.paints[1]],
            madeWith: [["Members", "Fixed: they do not follow the data"]].concat(m.madeWith.slice(1)),
        });
    }
    function lesmisPathModel() {
        const L = L0();
        return {
            title: "Valjean to Javert", icon: "route", color: "#D55E00", kind: "Path",
            provenance: ["from Shortest paths", "inspector-run-row", "data"],
            set: { "node.color": "#D55E00", "edge.color": "#D55E00" },
            paints: ["the path's ", countLink("2 nodes, 1 edge")],
            order: [["Covered by ", pr(), " for fill color on both nodes."], ["Wins line color on its 1 edge: no row above it paints edges."]],
            summary: [["From", "Valjean, group 2, degree 36", ["inspector-node", "why-this-look"]], ["To", "Javert, group 4, degree 17", ["inspector-node", "data"]], ["Length", "1 edge (they appear together)"], ["Edge value", "17 shared chapters"]],
            memberLink: countLink("2 nodes"),
            rankedBy: "In path order, start to end.",
            members: [memberRow("Valjean", "start"), memberRow("Javert", "end")],
            madeWith: [["Created from", "Shortest paths", ["inspector-run-row", "data"]], ["Weight", "Not used: fewest edges"], ["Scope", "Full graph, " + L.nodes + " nodes"], ["Data version", L.file + ", current"]],
        };
    }

    function pathModel() {
        const T = AB.fx.datasets.transactions, P = T.setsAndPaths.path, r = P.asDistance;
        const n = r.route.length;
        const sel = act(n + " accounts, " + r.hops + " transfers", () => AB.flash("Selects the path's accounts and transfers (not wired in the skeleton)"));
        const members = [];
        r.route.forEach((id, k) => {
            members.push(acctRow(id, k, n));
            if (r.transfers[k]) members.push(h("div", { class: "igs-hops" }, "amount " + fmtAmount(r.transfers[k].amount) + ", " + r.transfers[k].timestamp.slice(0, 10)));
        });
        return {
            title: P.from.id + " to " + P.to.id, icon: "route", color: "#D55E00", kind: "Path",
            provenance: ["from Shortest paths", "inspector-run-row", "data"],
            set: { "node.color": "#D55E00", "edge.color": "#1A1A1A" },
            paints: ["the path's ", sel],
            order: [["Nothing above it paints its accounts or transfers: it wins every property it sets."]],
            summary: [
                ["From", P.from.id + ", " + P.from.kind + ", " + P.from.country + ", riskScore " + P.from.riskScore],
                ["To", P.to.id + ", " + P.to.kind + ", " + P.to.country + ", riskScore " + P.to.riskScore + (P.to.flagged ? ", flagged" : "")],
                ["Length", r.hops + " transfers, following their direction"],
                ["Total amount", fmtAmount(r.dollars)],
                ["Share of graph", n + " of " + T.nodes.toLocaleString("en-US") + " accounts"],
            ],
            memberLink: act(n + " accounts", () => AB.flash("Selects the path's accounts (not wired in the skeleton)")),
            rankedBy: "In path order, start to end, with each transfer.",
            members,
            madeWith: [["Created from", "Shortest paths, weighted by amount", ["inspector-run-row", "data"]], ["Found with", "Path between"], ["Weight", "amount, higher = farther"], ["Scope", "Full graph, " + T.nodes.toLocaleString("en-US") + " accounts"], ["Data version", T.file + ", current"]],
        };
    }

    // An edge set: its members are edges, so the Style tab opens on Edges
    function edgeSetModel() {
        const L = L0();
        return {
            title: "Spanning tree", icon: "spline", color: "#0072B2", kind: "Edge set",
            provenance: ["from Kruskal", "inspector-run-row", "data"],
            set: { "edge.color": "#0072B2", "edge.width": 2 }, styleKind: "edge",
            paints: ["edges of the spanning tree: ", lnk("76 edges", ["table-dock", "edges"]), h("span", { class: "k-secondary" }, " (no nodes)")],
            order: [["Wins line width on all 76 edges."], ["The path rows above it paint line color on their own edges."]],
            summary: [["Size", "76 edges"], ["Share of edges", pct(76, L.edges) + " of " + L.edges + " edges"], ["Reaches", "all " + L.nodes + " nodes"]],
            memberLink: lnk("76 edges", ["table-dock", "edges"]),
            rankedBy: "Kruskal ranks nothing; the table's Edges tab lists every member.",
            members: [],
            madeWith: [["Created from", "Kruskal's spanning tree", ["inspector-run-row", "data"]], ["Weight", "value, lower = kept first"], ["Scope", "Full graph, " + L.nodes + " nodes"], ["Data version", L.file + ", current"]],
            dataQuestion: "Minimum or maximum spanning tree: on co-appearance counts the analyst usually wants the strongest ties kept.",
        };
    }

    // ---------- the color picker, to the left of the inspector (as in Figma) ----------
    const SWATCHES = [["#E69F00", "Orange"], ["#56B4E9", "Sky blue"], ["#009E73", "Bluish green"], ["#0072B2", "Blue"], ["#D55E00", "Vermilion"], ["#CC79A7", "Reddish purple"], ["#000000", "Black"], ["#F0E442", "Yellow"], ["#505050", "Dark gray"]];
    // graphty-element's PALETTE_DESCRIPTORS: [plainName, colors, color-blind safe]
    const PALETTES = {
        Categories: [["Eight Distinct Colors", ["#E69F00", "#56B4E9", "#009E73", "#0072B2", "#D55E00", "#CC79A7", "#000000", "#F0E442"], 1], ["Seven Bright Colors", ["#0077BB", "#33BBEE", "#009988", "#EE7733", "#CC3311", "#EE3377", "#BBBBBB"], 1], ["Nine Soft Colors", ["#332288", "#88CCEE", "#44AA99", "#117733", "#999933", "#DDCC77", "#CC6677", "#882255", "#AA4499"], 1], ["Eight Pale Colors", ["#FFD699", "#A8D8F0", "#66C9B2", "#FFF099", "#669DD6", "#FF9980", "#EBB8D2", "#CCCCCC"], 1], ["Five Enterprise Colors", ["#6929C4", "#1192E8", "#005D5D", "#9F1853", "#FA4D56"], 0], ["Blue Highlight", ["#0072B2", "#CCCCCC"], 1], ["Green Highlight", ["#009E73", "#999999"], 1], ["Orange Highlight", ["#E69F00", "#CCCCCC"], 1]],
        Ramps: [["Purple to Yellow", ["#440154", "#26828e", "#fde724"], 1], ["Orange to Brown", ["#ef7818", "#b84203", "#662506"], 1], ["Blue to Yellow", ["#0d0887", "#b83289", "#f0f921"], 1], ["Black to Yellow", ["#000004", "#a52c60", "#f7d13d"], 1], ["Shades of Blue", ["#f7fbff", "#6baed6", "#08306b"], 1], ["Shades of Green", ["#f7fcf5", "#74c476", "#00441b"], 0], ["Shades of Orange", ["#fff5eb", "#fd8d3c", "#7f2704"], 0]],
        Diverging: [["Purple to Green", ["#762a83", "#f7f7f7", "#1b7837"], 1], ["Blue to Orange", ["#2166ac", "#f7f7f7", "#b2182b"], 1], ["Red to Blue", ["#67001f", "#f7f7f7", "#2166ac"], 0]],
    };
    function picker(color, tab, el, onPick, onClose) {
        let cur = color;
        const body = h("div", { class: "igs-cp-body" });
        const custom = () => {
            const sw = h("div", { class: "igs-sw" }, SWATCHES.map(([c, n]) => h("span", Object.assign({ class: "k-chit", style: "background:" + c, "aria-label": n, title: n, "aria-pressed": String(c === cur) }, AB.act({ onClick: () => { cur = c; onPick(c); show("Custom"); } })))));
            return [
                h("div", { class: "igs-sb", style: "background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, " + cur + ")" }, h("span", { class: "igs-ret", style: "left:88%;top:12%" })),
                h("div", { class: "igs-sl igs-hue" }, h("span", { style: "left:8%" })),
                h("div", { class: "igs-sl", style: "background: linear-gradient(90deg, transparent, " + cur + "), repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px" }, h("span", { style: "left:96%" })),
                h("div", { class: "igs-val" }, AB.field("Hex", { caret: true, onClick: () => AB.flash("Color format: Hex, RGB, HSL (not wired in the skeleton)") }), h("span", { class: "k-field igs-hex k-mono" }, cur.replace("#", "").toUpperCase()), h("span", { class: "k-field igs-op k-num" }, "100%")),
                sw,
            ];
        };
        const pal = ([name, colors, safe], ramp) => AB.row({
            label: name,
            swatch: ramp ? h("span", { class: "igs-rampbar", style: "background:linear-gradient(90deg," + colors.join(",") + ")" }) : h("span", { class: "igs-pal" }, colors.slice(0, 8).map((c) => h("span", { class: "k-chit", style: "background:" + c }))),
            trail: safe ? h("span", { class: "k-tertiary", title: "Safe for color-blind readers" }, "safe") : null,
            onClick: () => { cur = colors[0]; onPick(cur); AB.flash("Fill color: " + name + "'s first color. A palette spreads over several rows from their run's Style tab."); },
        });
        const libraries = () => [h("div", { class: "igs-libs" },
            Object.keys(PALETTES).map((k) => [h("div", { class: "igs-gl" }, k), PALETTES[k].map((p) => pal(p, k !== "Categories"))]),
            h("div", { class: "igs-gl" }, "Custom"),
            h("div", { class: "ab-pad k-secondary" }, "No custom palettes in this project. A palette a plugin registers with graphty-element appears here."),
            oq("Can a user save a palette of their own from this picker, or only through a plugin?"))];
        const show = (t) => body.replaceChildren(...(t === "Libraries" ? libraries() : custom()));
        const p = h("div", { class: "k-popover igs-cp", role: "dialog", "aria-label": "Fill color" },
            h("div", { class: "k-popover-head" }, AB.tabs(["Custom", "Libraries"], tab, show), h("span", { class: "k-grow" }), AB.iconButton("x", "Close", { onClick: onClose })),
            body);
        show(tab);
        requestAnimationFrame(() => {
            const anchor = el.querySelector(".ab-sline .k-chit") || el;
            const R = el.getBoundingClientRect();
            p.style.left = Math.max(8, R.left - 248) + "px";
            p.style.top = Math.max(36, Math.min(anchor.getBoundingClientRect().top - 40, innerHeight - p.offsetHeight - 8)) + "px";
        });
        return p;
    }

    // ---------- the section ----------
    function modelFor(state) {
        if (state === "notes") return communityModel("3");
        if (state.startsWith("community-")) return communityModel(state.slice(10));
        if (state === "overlap") return overlapModel();
        if (state === "watchlist") return watchlistModel();
        if (state === "rule-set") return ruleSetModel();
        if (state === "path-lesmis") return lesmisPathModel();
        if (state === "path-lesmis-2") return lesmisPath2Model();
        if (state.startsWith("kept-")) return keptModel(state.slice(5));
        if (state === "path" || state === "path-style") return pathModel();
        if (state === "path-edge-set") return edgeSetModel();
        if (state === "other") return otherModel();
        if (state.startsWith("group-")) return groupModel(state.slice(6));
        // The Style states show a row the tree has: Community 3 (the tree selects it beside this)
        return communityModel("3");
    }
    const DATA_STATES = ["data", "notes", "rule-set", "path-lesmis", "path-lesmis-2", "path"];

    registerSection({
        id: "inspector-group-set-path-row",
        title: "Inspector: a group, set or path row",
        region: "right",
        rail: "graph",
        frame: (state) => ((state === "path" || state === "path-style") && AB.sections && AB.sections["path-tool-tree"] ? { dataset: "transactions", left: "path-tool-tree/found", canvas: "path-tool-canvas/found", dock: false } : { left: "graph-place/at-rest" }),
        closeTo: "graph-place/at-rest",
        states: STATES,
        render(el, state) {
            const m = modelFor(state);
            const pickerTab = state === "picker" ? "Custom" : state === "picker-libraries" ? "Libraries" : null;
            const title = h("span", null, m.title);
            el.append(AB.inspector({
                icon: m.icon || AB.chit(m.color, true),
                title,
                kind: m.kind,
                kindKey: "igs",
                provenance: m.provenance,
                menu: ["context-menus", "row"],
                onRename: (name) => AB.flash("Renamed to " + name),
                // A run's group renumbers on every rerun (spec 3.10): Keep as set names it
                renameDisabled: state.startsWith("community-") ? "a label per group that survives a rerun. Keep as set (in the ... menu) to name this group now." : null,
                tab: DATA_STATES.includes(state) ? "Data" : "Style",
                tabs: { Style: () => styleTab(m, state), Data: () => dataTab(m, state === "notes") },
            }));
            el.firstChild.classList.add("igs");
            if (pickerTab) {
                const pop = picker(m.set["node.color"] || m.color, pickerTab, el, (c) => el.querySelectorAll(".ab-sline .k-chit").forEach((x, i) => { if (i === 0) x.style.background = c; }), () => pop.remove());
                el.append(pop);
            }
            if (state === "notes") requestAnimationFrame(() => { const n = el.querySelector("#igs-notes"); if (n) n.scrollIntoView({ block: "start" }); });
        },
    });
})();
