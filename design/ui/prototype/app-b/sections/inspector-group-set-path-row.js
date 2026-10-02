/* Inspector: a group, set or path row, in the shared inspector frame (spec 5.1, 5.2, 16; version 3).
   Style tab: the shared AB.styleTab, opening with its Paints line and paint-order line, then only the
   properties the row sets (sections always open, "+" in the header, bind and "-" on hover). Data tab:
   AB.dataTab with Summary (Size first, a link that selects), Members (top 10, names select), Made
   with (settings that differ from the default, then "All options...", a popover) and Notes. No verbs
   in the body: Create set (Create path on a found path), Select members and the rest are in "...". The color states live in
   style-pickers. Plain ASCII.

   One generic group body serves every group and community: the states "group" (Group 2) and
   "community-3" are listed; group-<n>, other, community-<n>, kept-8 and path-lesmis-2 stay as
   aliases so the tree's and the legend's links render the same body with their own name. Old
   state ids (two-properties, inherited, picker, picker-libraries) render their nearest state.

   Les Miserables numbers not in kit/fixtures.json (edges inside a group, density, degree within
   the group) were computed from graph-io's test corpus miserables.json with the kit's correction
   (Old Man's edge goes to Myriel), which reproduces the fixtures' 254 edges and every degree. The
   spanning tree's 76 edges follow from the graph being connected (77 nodes). */
(function () {
    "use strict";
    const { h } = AB;
    const SELF = "inspector-group-set-path-row";

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
    // A run's group keeps a color the reader picked, saved against its category value (run and value),
    // so a rerun that finds the same value paints it the same. Lives for this page view.
    const RECOLOR = {};
    // Plain names for the palette's colors, for the announcement ("Community 3 is now Vermilion, was Bluish green")
    const COLOR_NAMES = { "#E69F00": "Orange", "#56B4E9": "Sky blue", "#009E73": "Bluish green", "#F0E442": "Yellow", "#0072B2": "Blue", "#D55E00": "Vermilion", "#CC79A7": "Reddish purple", "#000000": "Black", "#BDBDBD": "Gray" };
    // The Color popover's swatches say their own name (aria-label) and hex (aria-description); a name read there is kept here
    const colorName = (hex) => COLOR_NAMES[hex.toUpperCase()] || hex.toUpperCase();
    const COMMUNITIES = { 1: [25, "#E69F00"], 2: [17, "#56B4E9"], 3: [10, "#009E73", 2], 4: [10, "#0072B2"], 5: [9, "#D55E00"], 6: [6, "#CC79A7"] };

    const STATES = [
        { id: "style", label: "Style tab" },
        { id: "data", label: "Data tab" },
        { id: "fill-set", label: "Style: Fill set" },
        { id: "edges-side", label: "Style: the Edges side" },
        { id: "arrows", label: "Style: Arrows" },
        { id: "label-empty", label: "Label: a new line, no field yet" },
        { id: "label-two", label: "Label: name above, degree below" },
        { id: "label-all-used", label: "Label: every position used" },
        { id: "label-by", label: "Add label line for degree, from its menu" },
        { id: "label-top-n", label: "Label only the top 10 by degree: a top-N rule row" },
        { id: "invalid-value", label: "Style: an invalid value" },
        { id: "notes", label: "Notes, from a row's note count" },
        { id: "group", label: "Group (Group 2)" },
        { id: "group/all-options", label: "Made with: All options" },
        { id: "community-3", label: "Community 3 (Louvain)" },
        { id: "overlap", label: "Partly covered" },
        { id: "watchlist", label: "Set (Watchlist)" },
        { id: "top-degree", label: "Set (Top 9 by degree)" },
        { id: "rule-set", label: "Rule set" },
        { id: "rule-set-empty", label: "Rule set matching no nodes" },
        { id: "one-member", label: "Set of one node" },
        { id: "long-name", label: "Long set name and label line (researchers)" },
        { id: "kept-2", label: "Set made from Group 2, in a folder" },
        { id: "path-lesmis", label: "Path: Valjean to Javert" },
        { id: "path-lesmis-found", label: "Path: the one the last Find path added (Les Miserables)" },
        { id: "path", label: "Path from Path between" },
        { id: "path-tied", label: "Path: two routes tie, Route 1 of 2" },
        { id: "path-notes", label: "Path: its Notes, and the chip a note on it carries" },
        { id: "path-reversed", label: "Path traced end to start: dates out of order" },
        { id: "path-door-entries", label: "Path: door entries, from Find path" },
        { id: "path-style", label: "Path: Style" },
        { id: "path-edge-set", label: "Edge set: spanning tree" },
    ];
    // Old ids that render a listed state
    const RENAMED = { "label-bound": "label-two", "two-properties": "fill-set", inherited: "style", picker: "style", "picker-libraries": "style" };
    const L0 = () => AB.fx.datasets.lesmis;

    // ---------- small builders ----------
    const fmtAmount = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const lnk = (label, go) => AB.link(go[0], go[1], label, { class: "ab-link" });
    const act = (label, onClick) => h("span", Object.assign({ class: "ab-link" }, AB.act({ onClick })), label);
    const SELECT = ["inspector-several-elements", "style"];
    const pr = () => lnk("PageRank", ["inspector-measure-row", "style"]);
    const memberRow = (name, trail) => AB.row({ label: name, trail, go: ["inspector-node", name === "Valjean" ? "why-this-look" : "data"] });
    const acctRow = (id, trail) => AB.row({ label: h("span", { class: "k-id" }, id), trail, onClick: () => AB.flash("Selects " + id + "") });
    const scope = (L) => ["Scope", "Full graph, " + L.nodes + " nodes"];
    const version = (L) => ["Data version", L.file + ", current"];

    // ---------- the rows ----------
    function groupModel(g) {
        const L = L0();
        const leg = L.frame.legend.rows.find((r) => r.label === g);
        const [inside, leaving, density, top] = GROUPS[g];
        const size = leg.count + " nodes, " + inside + " edges";
        return {
            title: "Group " + g, color: leg.color, icon: "circle-dot", kind: "Group",
            provenance: ["from the attribute group", "inspector-attribute-and-filter-step", "attribute"],
            set: { "node.color": leg.color },
            paints: ["Paints " + size, SELECT],
            order: ["Covered by ", pr(), " for Color on " + leg.count + " of " + leg.count],
            summary: [["Size", size, SELECT], ["Density", String(density)], ["Edges leaving", String(leaving)]],
            membersSummary: (leg.count > 10 ? "Top 10 of " + leg.count : "All " + leg.count) + ", by degree within the group",
            members: top.map(([n, d]) => memberRow(n, String(d))),
            dist: top.length === leg.count ? top : null, distOf: "degree within the group",
            made: [],
            all: [["Attribute", "group"], scope(L), version(L)],
        };
    }

    function otherModel() {
        const L = L0(), o = L.frame.legend.other;
        const m = groupModel("2");
        return Object.assign(m, {
            title: o.title, color: o.color, set: { "node.color": o.color },
            paints: ["Paints " + o.count + " nodes, " + OTHER.inside + " edges", SELECT],
            order: ["Covered by ", pr(), " for Color on " + o.count + " of " + o.count],
            summary: [["Size", o.count + " nodes, " + OTHER.inside + " edges", SELECT], ["Groups", "6 (1 node), 7 (2), 10 (2)"], ["Edges leaving", String(OTHER.leaving)]],
            membersSummary: "All " + o.count + ", by degree within their own group",
            members: OTHER.members.map(([n, d]) => memberRow(n, String(d))),
            dist: OTHER.members, distOf: "degree within their own group",
        });
    }

    function overlapModel() {
        const m = groupModel("4");
        const n = L0().frame.legend.rows.find((r) => r.label === "4").count;
        m.order = ["Covered by ", lnk("Watchlist", [SELF, "watchlist"]), " for Color on " + G4_WATCHED.length + " of " + n];
        m.orderTip = G4_WATCHED.join(", ") + ". Drag this row above Watchlist in the tree to win on all " + n + ".";
        return m;
    }

    function keptModel(g) {
        const m = groupModel(g);
        return Object.assign(m, {
            icon: "circle-check", kind: "Set",
            provenance: ["from the attribute group", "inspector-attribute-and-filter-step", "attribute"],
            all: [["Members", "Fixed: they do not follow the data"], scope(L0()), version(L0())],
        });
    }

    function watchlistModel() {
        const L = L0(), W = WATCHLIST, n = W.members.length;
        const size = n + " nodes, " + W.inside + " edges";
        return {
            title: "Watchlist", color: W.color, icon: "circle-check", kind: "Set", locked: true,
            set: { "node.color": W.color },
            paints: ["Paints " + size, SELECT],
            order: ["Covered by ", pr(), " for Color on " + n + " of " + n],
            summary: [["Size", size, SELECT], ["Density", String(W.density)], ["Groups", "4 (4 members), 2 (1)", [SELF, "group-4"]]],
            membersSummary: "All " + n + ", by degree within the set",
            members: W.members.map(([nm, d]) => memberRow(nm, String(d))),
            dist: W.members, distOf: "degree within the set",
            made: [],
            all: [["Members", "Fixed: they do not follow the data"], scope(L), version(L)],
        };
    }

    // The kept set "Top 9 by degree": the nodes whose degree reaches the 9th highest (the tree's row "top")
    function topDegreeModel() {
        const L = L0(), byDeg = [...L.rows].sort((a, b) => b.degree - a.degree);
        const mem = byDeg.filter((r) => r.degree >= byDeg[8].degree), n = mem.length;
        return {
            title: "Top " + n + " by degree", color: "#F0E442", icon: "circle-check", kind: "Set",
            provenance: ["from degree", "inspector-attribute-and-filter-step", "attribute"],
            set: { "node.color": "#F0E442" },
            paints: ["Paints " + n + " nodes", SELECT],
            order: ["Covered by ", pr(), " for Color on " + n + " of " + n],
            summary: [["Size", n + " nodes", SELECT], ["Degree", mem[n - 1].degree + " to " + mem[0].degree]],
            membersSummary: "All " + n + ", by degree",
            members: mem.map((r) => memberRow(r.label, String(r.degree))),
            dist: mem.map((r) => [r.label, r.degree]), distOf: "degree",
            made: [],
            all: [["Members", "Fixed: they do not follow the data"], scope(L), version(L)],
        };
    }

    // A rule set (Select where ..., then Create set from rule) is a set marked with a small rule glyph: its members
    // follow the rule, and it paints them; it never filters anything out
    const RULE_NOTE = "Its members follow the rule. It paints them and never filters.";
    function ruleGlyph() {
        const g = h("span", { role: "img", style: "position:relative;display:inline-flex" }, icon("circle-check"),
            h("span", { style: "position:absolute;right:-5px;bottom:-5px;display:inline-flex;background:var(--cm-bg);border-radius:50%" }, icon("sigma", "sm")));
        return AB.tip(g, "Rule set. " + RULE_NOTE);
    }
    function ruleSetModel() {
        const L = L0(), R = RULESET, n = R.members.length;
        const size = n + " nodes, " + R.inside + " edges";
        return {
            title: R.name, color: R.color, icon: ruleGlyph(), kind: "Rule set",
            provenance: ["from degree", "inspector-attribute-and-filter-step", "attribute"],
            styleNote: RULE_NOTE,
            set: { "node.color": R.color },
            paints: ["Paints " + size, SELECT],
            order: "Wins Color on " + n + " of " + n + ": nothing above it paints these members",
            summary: [["Size", size, SELECT], ["Density", String(R.density)]],
            membersSummary: "All " + n + ", by degree within the set, then in the graph",
            members: R.members.map(([nm, d, full]) => memberRow(nm, d + " of " + full)),
            dist: R.members, distOf: "degree within the set",
            made: [["Rule", h("span", { class: "k-mono" }, "degree >= 13")]],
            all: [["Rule", h("span", { class: "k-mono" }, "degree >= 13")], ["Members", "Follow the data"], scope(L), version(L)],
            question: "On a rule set, does Create set (in \"...\") freeze today's " + n + " members as a plain set?",
        };
    }

    // A rule set no node matches: Les Miserables' highest degree is 36 (Valjean), so "degree >= 40"
    // paints nothing until the data changes. No order line: it covers and is covered on nothing.
    function ruleSetEmptyModel() {
        const L = L0();
        const none = () => AB.empty("No node has degree 40 or more; the highest is " + L.stats.maxDegree + ".");
        return {
            title: "Degree 40 or more", color: "#F0E442", icon: ruleGlyph(), kind: "Rule set",
            provenance: ["from degree", "inspector-attribute-and-filter-step", "attribute"],
            styleNote: RULE_NOTE,
            set: { "node.color": "#F0E442" },
            paints: () => h("div", null, AB.paintsLine("Paints 0 nodes"), none()),
            summary: [["Size", "0 nodes"]],
            membersSummary: "None",
            members: [none()],
            made: [["Rule", h("span", { class: "k-mono" }, "degree >= 40")]],
            all: [["Rule", h("span", { class: "k-mono" }, "degree >= 40")], ["Members", "Follow the data"], scope(L), version(L)],
        };
    }

    // Group 6 kept as a set: its one member, Boulatruelle (degree 1), in the fixture's rows
    function oneMemberModel() {
        const L = L0(), r = L.rows.find((x) => String(x.group) === "6");
        const m = keptModel("2");
        return Object.assign(m, {
            title: "Group 6", color: L.groupColors[6],
            set: { "node.color": L.groupColors[6] },
            paints: ["Paints 1 node", SELECT],
            order: ["Covered by ", pr(), " for Color on 1 of 1"],
            summary: [["Size", "1 node, 0 edges", SELECT], ["Groups", "6 (1 node)"]],
            membersSummary: "1 node",
            members: [memberRow(r.label, "degree " + r.degree)],
        });
    }

    // The nested sample's researchers: a kept set with a 60-character name, labeled Above by the
    // seven-segment path. Members and counts read from kit/wide-nested.json (field "machine learning"
    // and attributes.profile.metrics.citations.last_5_years over 500: 23 of 170).
    const LONG_FIELD = "attributes.profile.metrics.citations.last_5_years";
    function longNameModel() {
        const N = AB.fx.datasets.nested, R = N.document.data.researchers;
        const cites = (r) => r.attributes.profile.metrics.citations.last_5_years;
        const mem = R.filter((r) => r.attributes.profile.field === "machine learning" && cites(r) > 500).sort((a, b) => cites(b) - cites(a));
        const n = mem.length, nm = (r) => AB.nameOf("nested", r);
        return {
            title: "Machine learning researchers, more than 500 cites in 5 years", color: "#009E73", icon: "circle-check", kind: "Set",
            provenance: ["from the attribute profile.field", "inspector-attribute-and-filter-step", "attribute"],
            set: { "node.color": "#009E73" }, labels: [{ pos: "Above", field: LONG_FIELD, type: "num" }],
            paints: ["Paints " + n + " nodes", SELECT],
            order: "Wins Color on " + n + " of " + n + ": nothing above it paints these researchers",
            summary: [["Size", n + " nodes", SELECT], ["Of", R.length + " researchers"]],
            membersSummary: "Top 10 of " + n + ", by " + LONG_FIELD,
            members: mem.slice(0, 10).map((r) => AB.row({ label: nm(r), trail: cites(r).toLocaleString("en-US"), onClick: () => AB.flash("Selects " + nm(r) + "") })),
            made: [],
            all: [["Members", "Fixed: they do not follow the data"], ["Scope", "Full graph, " + R.length + " researchers"], ["Data version", N.file + ", current"]],
        };
    }

    function communityModel(c) {
        const L = L0(), [size, def, notes] = COMMUNITIES[c] || COMMUNITIES[3];
        const key = "Louvain/" + c, color = RECOLOR[key] || def;
        // Community 3 is Myriel's circle (the table's Louvain tab, the notes): its 10 members are the group-1 rows
        const known = String(c) === "3" ? GROUPS[1][3] : null;
        return {
            title: "Community " + c, color, icon: "circle-dot", kind: "Group",
            recolor: { key, def },
            styleNote: "Its color is saved for the Louvain value " + c + ", so a rerun that finds " + c + " again keeps it.",
            provenance: ["from Louvain", "inspector-run-row", "data"],
            renameDisabled: "a run's groups renumber when it reruns; Create set to name one",
            set: { "node.color": color },
            paints: ["Paints " + size + " nodes", SELECT],
            edgesInside: c === "3" || c === 3 ? GROUPS[1][0] : null, // Myriel's circle: the 10 edges among its 10 members (GROUPS[1])
            order: ["Covered by ", pr(), " for Color on " + size + " of " + size],
            summary: [["Size", size + " nodes", SELECT]],
            membersSummary: known ? "All " + known.length + ", by degree within the community" : "Not ranked",
            members: known ? known.map(([n, d]) => memberRow(n, String(d))) : [AB.empty("Louvain ranks no members.", { verb: "Show in table", go: ["table-dock", "nodes"] })],
            dist: known, distOf: "degree within the community",
            made: [],
            all: [["Resolution", "1.0"], scope(L), version(L)],
            notes: notes || 0,
        };
    }

    function lesmisPathModel() {
        const L = L0();
        return {
            title: "Valjean to Javert", icon: "route", color: "#D55E00", kind: "Path",
            provenance: ["from Shortest paths", "inspector-run-row", "data"],
            set: { "node.color": "#D55E00", "edge.color": "#D55E00" },
            paints: ["Paints 2 nodes, 1 edge", SELECT],
            order: ["Covered by ", pr(), " for Color on 2 of 2 nodes"],
            summary: [["Size", "2 nodes, 1 edge", SELECT], ["From", "Valjean", ["inspector-node", "why-this-look"]], ["To", "Javert", ["inspector-node", "data"]], ["Edge value", "17 shared chapters"]],
            membersSummary: "In path order",
            members: [memberRow("Valjean", "start"), memberRow("Javert", "end")],
            made: [],
            all: [["Weight", "Not used: fewest edges"], scope(L), version(L)],
        };
    }
    // The path the last Find path added on Les Miserables (path-popover's AB.lastPath and its first route)
    function lesmisFoundModel() {
        const lp = AB.lastPath && (AB.lastPath.ds || "lesmis") === "lesmis" ? AB.lastPath : null;
        if (!lp || !lp.route) return lesmisPathModel();
        const r = lp.route, nodes = r.route.length, edges = r.hops, size = AB.count(nodes, "node") + ", " + AB.count(edges, "edge");
        const at = (n) => ["inspector-node", n === "Valjean" ? "why-this-look" : "data"];
        return Object.assign(lesmisPathModel(), {
            title: lp.name, color: "#009E73", set: { "node.color": "#009E73", "edge.color": "#009E73" },
            paints: ["Paints " + size, SELECT],
            order: ["Covered by ", pr(), " for Color on " + nodes + " of " + nodes + " nodes"],
            summary: [["Size", size, SELECT], ["From", lp.from, at(lp.from)], ["To", lp.to, at(lp.to)]].concat(r.text ? [["Along the path", r.text.replace(/^.*: /, "") + " (" + r.text.replace(/: .*$/, "").toLowerCase() + ")"]] : []),
            members: r.route.map((n, i) => memberRow(n, i === 0 ? "start" : i === nodes - 1 ? "end" : "hop " + i)),
            all: [["Weight", lp.weight ? lp.weight + ", " + lp.meaning : "Not used: fewest edges"], scope(L0()), version(L0())],
        });
    }
    // Myriel to Javert: Myriel, Valjean, Javert (2 edges; networkx 3.1, see graph-place.js)
    function lesmisPath2Model() {
        const m = lesmisPathModel();
        return Object.assign(m, {
            title: "Myriel to Javert", color: "#0072B2", set: { "node.color": "#0072B2", "edge.color": "#0072B2" },
            paints: ["Paints 3 nodes, 2 edges", SELECT],
            order: ["Covered by ", pr(), " for Color on 3 of 3 nodes"],
            summary: [["Size", "3 nodes, 2 edges", SELECT], ["From", "Myriel", ["inspector-node", "data"]], ["To", "Javert", ["inspector-node", "data"]]],
            members: [memberRow("Myriel", "start"), memberRow("Valjean", "hop 1"), memberRow("Javert", "end")],
        });
    }

    // A dated path trace, in path order (never sorted by date). Each transfer is a hop with its date and a
    // "Dates in order" cell; each account shows what it received and sent along this trace, named from
    // the weight column. A hop earlier than the hop before it is flagged in words. graphty-element
    // returns these with the path result; ponytail: computed here from the fixture until it does.
    // `reversed` traces the same accounts end to start (direction ignored), which runs the dates backward.
    const COLS = "display:grid;grid-template-columns:1fr 40px 48px;column-gap:6px;align-items:end;padding:0 8px 0 16px";
    const day = (ts) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
    // The route the last Find path drew: path-popover's AB.lastPath.route, the route its result bar opens
    // on (route, hops, transfers, dollars, the fixture's path shape). No Find path yet: the fixture's asDistance.
    // Routes that tie on cost come with it (lp.routes); the stepper picks one (routeAt). `tied` (a direct load of
    // path-tied) reads the fixture's two equally short routes, found with no weight.
    // The route on screen is shared with the path popover's result bar (AB.pathRouteAt): stepping
    // either one moves both, so the bar and this inspector never name different routes
    AB.pathRouteAt = 0;
    AB.setPathRoute = (i) => {
        AB.pathRouteAt = i;
        const r = document.getElementById("ab-right"), ref = AB.route && AB.route.frame.right;
        if (r && ref && ref.startsWith(SELF + "/")) { r.replaceChildren(); AB.renderSection(ref, r); }
        document.dispatchEvent(new Event("ab-path-route"));
    };
    function foundRoutes(P, tied) {
        const sum = (t) => Math.round(t.reduce((a, x) => a + x.amount, 0) * 100) / 100;
        if (tied) return P.routes.map((x) => ({ weight: null, route: x.accounts, hops: x.transfers.length, transfers: x.transfers, dollars: sum(x.transfers) }));
        const lp = AB.lastPath && AB.lastPath.ds === "transactions" && AB.lastPath.route ? AB.lastPath : null;
        return lp ? (lp.routes && lp.routes.length ? lp.routes : [lp.route]).map((x) => Object.assign({ weight: lp.weight, meaning: lp.meaning, from: lp.from, to: lp.to }, x))
            : [Object.assign({ weight: "amount", meaning: "farther" }, P.asDistance)];
    }
    // The same stepper as the path popover's result bar: "Route 1 of 2", previous and next, arrow keys while it has focus
    function routeStepper(n) {
        const step = (d) => { AB.setPathRoute((AB.pathRouteAt + d + n) % n); AB.announce("Route " + (AB.pathRouteAt + 1) + " of " + n); requestAnimationFrame(() => { const s = document.querySelector("#ab-right .igs-step"); if (s) s.focus(); }); };
        const g = h("span", { class: "igs-step", role: "group", tabindex: "0", "aria-label": "Routes that tie on cost: arrow keys step", style: "display:inline-flex;align-items:center;gap:2px;border-radius:6px" },
            AB.iconButton("chevron-left", "Previous route", { onClick: () => step(-1) }), h("span", { style: "min-width:76px;text-align:center" }, "Route " + (AB.pathRouteAt + 1) + " of " + n), AB.iconButton("chevron-right", "Next route", { onClick: () => step(1) }));
        g.addEventListener("keydown", (e) => { const d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key]; if (!d) return; e.preventDefault(); e.stopPropagation(); step(d); });
        return h("div", { style: "display:flex;align-items:center;gap:8px;padding:0 8px 4px 16px" }, h("span", { class: "k-secondary" }, AB.count(n, "route") + " tie"), g);
    }
    function pathModel(reversed, tied) {
        const T = AB.fx.datasets.transactions, P = T.setsAndPaths.path;
        const all = reversed ? [Object.assign({ weight: "amount", meaning: "farther" }, P.asDistance)] : foundRoutes(P, tied);
        if (AB.pathRouteAt >= all.length) AB.pathRouteAt = 0;
        const r = all[AB.pathRouteAt];
        const route = reversed ? r.route.slice().reverse() : r.route;
        const tr = reversed ? r.transfers.slice().reverse() : r.transfers;
        const n = route.length;
        // the ends the reader picked, read from the account rows (the fixture's ends carry their own)
        const acct = (id) => [P.from, P.to].concat(T.rows).find((x) => x.id === id) || { id };
        const [from, to] = reversed ? [P.to, P.from] : [acct(r.from || P.from.id), acct(r.to || P.to.id)];
        const selAll = () => AB.flash("Selects the path's accounts and transfers");
        const size = AB.count(n, "account") + ", " + AB.count(r.hops, "transfer");
        const late = tr.map((t, k) => k > 0 && t.timestamp < tr[k - 1].timestamp);
        const flags = tr.map((t, k) => (late[k] ? "step " + (k + 1) + " (" + day(t.timestamp) + ") is earlier than the hop before (" + day(tr[k - 1].timestamp) + ")" : null)).filter(Boolean);
        // Members states the hop count and the path's total of its weight attribute ("3 transfers, 22,397.82 amount")
        const total = tr.reduce((a, t) => a + t.amount, 0);
        const head = AB.count(r.hops, "transfer") + (r.weight === "amount" ? ", " + fmtAmount(total) + " amount" : "");
        const members = [h("div", { class: "igs-hops", style: COLS + ";font-weight:550" }, h("span", null, "Transfer"), h("span", null, "Date"), h("span", null, "Dates in order"))];
        route.forEach((id, k) => {
            members.push(acctRow(id, k === 0 ? "start" : k === n - 1 ? "end" : "via"));
            const got = k > 0 ? tr[k - 1].amount : 0, sent = k < n - 1 ? tr[k].amount : 0;
            members.push(h("div", { class: "igs-hops", style: "padding-left:16px" }, "Total amount " + [got ? "in " + fmtAmount(got) : null, sent ? "out " + fmtAmount(sent) : null].filter(Boolean).join(" / ") + ", this trace"));
            // A hop that goes back in time is drawn dashed, with a clock mark, and named in its row
            if (tr[k]) members.push(h("div", { class: "igs-hops", style: COLS + ";margin-bottom:4px" + (late[k] ? ";border:1px dashed var(--cm-border-strong, var(--cm-border));border-radius:4px" : "") },
                h("span", null, "step " + (k + 1) + ", " + fmtAmount(tr[k].amount)), h("span", null, day(tr[k].timestamp)), h("span", { class: late[k] ? "k-strong" : null }, late[k] ? "No" : "Yes"),
                late[k] ? h("span", { style: "grid-column:1 / -1;display:flex;align-items:center;gap:4px" }, icon("clock", "sm"), "earlier than the hop before") : null));
        });
        // The trace ends with one computed summary line
        const ts = tr.map((t) => t.timestamp).sort();
        members.push(h("div", { class: "igs-hops", style: "padding:4px 8px 0 16px;font-weight:550" },
            "This trace: " + head + ", " + day(ts[0]) + " to " + day(ts[ts.length - 1]) + ", " + (flags.length ? AB.count(flags.length, "hop") + " earlier than the hop before" : "dates in order")));
        const accounts = T.nodes.toLocaleString("en-US");
        const who = (x) => [x.id, x.kind, x.riskScore != null ? "riskScore " + x.riskScore : null, x.flagged ? "flagged" : null].filter(Boolean).join(", ");
        const dir = reversed ? "Either way" : "Follow it";
        return {
            title: from.id + " to " + to.id, icon: "route", color: "#D55E00", kind: "Path",
            provenance: ["from Shortest paths", "inspector-run-row", "data"],
            set: { "node.color": "#D55E00", "edge.color": "#1A1A1A" },
            paints: h("div", { class: "ab-paints" }, act("Paints " + AB.count(n, "account") + ", " + AB.count(r.hops, "transfer"), selAll)),
            order: "Wins Color on " + n + " of " + n + ": nothing above it paints these accounts",
            summary: [["Size", size, selAll], ["From", who(from)], ["To", who(to)], ["Sum of amount", fmtAmount(r.dollars)]],
            membersSummary: head,
            membersOrder: "In path order, " + (flags.length ? AB.count(flags.length, "hop") + " earlier than the hop before" : "dates in order"),
            membersLead: all.length > 1 ? routeStepper(all.length) : null,
            membersNote: AB.needsElement("graphty-element returns each hop's date, whether the dates run in order, and each account's amount in and out along the trace, as part of the path result"),
            membersFlag: flags.length ? AB.problem({ level: "partial", what: "Not in time order: " + flags.join("; ") + ".", todo: "Money cannot be passed on before it arrives, so this trace is not one chain of transfers." }) : null,
            members,
            made: reversed ? [["Direction", "Either way"]] : tied ? [["Weight", "None: fewest transfers"]] : r.weight !== "amount" || r.meaning !== "stronger" ? [["Weight", (r.weight ? r.weight + ", " + r.meaning : "None") + " (this run's override)"]] : [],
            all: [["Weight", r.weight ? r.weight + (r.weight === "amount" && r.meaning === "stronger" ? " (set at load)" : "") + ", larger is " + (r.meaning === "stronger" ? "stronger" : r.meaning === "capacity" ? "more capacity" : "farther") : "None: fewest transfers"], ["Direction", dir], ["Scope", "Full graph, " + accounts + " accounts"], ["Data version", T.file + ", current"]],
        };
    }

    // The door entries: the path Find path just drew between the ends picked in the Path popover.
    // ponytail: the route is searched in the fixture's sample rows; a pair the sample does not join
    // goes through B1 (two people) or straight to the building, a stand-in until the element returns it
    function doorRoute(from, to) {
        const D = AB.fx.datasets.doorEntries, name = {}, adj = {};
        D.tables[0].sample.forEach((r) => { name[r.id] = r.name; });
        const add = (a, b) => { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); };
        D.tables[2].sample.forEach((r) => { if (name[r.person_id]) add(name[r.person_id], r.building_id); });
        const prev = { [from]: null }, queue = [from];
        while (queue.length) {
            const x = queue.shift();
            if (x === to) { const out = []; for (let y = to; y !== null; y = prev[y]) out.unshift(y); return out; }
            (adj[x] || []).forEach((y) => { if (!(y in prev)) { prev[y] = x; queue.push(y); } });
        }
        const isB = (x) => /^B\d+$/.test(x);
        return isB(from) || isB(to) ? [from, to] : [from, "B1", to];
    }
    function doorPathModel() {
        const D = AB.fx.datasets.doorEntries, lp = AB.lastPath;
        const p = lp && lp.ds === "doorEntries" ? lp : { from: "Ana Ruiz", to: "Priya Nair", weight: D.loadedWeight(), loaded: D.loadedWeight() };
        const route = doorRoute(p.from, p.to), edges = route.length - 1;
        const isB = (x) => /^B\d+$/.test(x);
        const size = route.length + " nodes, " + edges + (edges === 1 ? " edge" : " edges");
        const sel = () => AB.flash("Selects the path's people and buildings");
        const w = p.weight ? p.weight + ", stronger: Dijkstra used 1/" + p.weight : "None: fewest edges";
        const over = (p.weight || null) !== (p.loaded || null);
        return {
            title: p.from + " to " + p.to, icon: "route", color: "#D55E00", kind: "Path",
            provenance: ["from Shortest paths", SELF, "path-door-entries"],
            set: { "node.color": "#D55E00", "edge.color": "#D55E00" },
            paints: h("div", { class: "ab-paints" }, act("Paints " + size, sel)),
            order: "Wins Color on " + route.length + " of " + route.length + ": nothing above it paints these nodes",
            summary: [["Size", size, sel], ["From", p.from], ["To", p.to], ["Via", route.slice(1, -1).join(", ") || "one entry edge"]],
            membersSummary: "In path order",
            members: route.map((x, k) => AB.row({ label: x, icon: isB(x) ? "building-2" : "user", trail: k === 0 ? "start" : k === edges ? "end" : "hop " + k, onClick: () => AB.flash("Selects " + x + "") })),
            made: over ? [["Weight", (p.weight || "None") + " (this run's override)"]] : [],
            all: [["Weight", w], ["Direction", "Either way"], ["Scope", "Full graph, " + D.loadedTypes().total.toLocaleString("en-US") + " nodes"], ["Data version", D.tables.length + " tables, current"]],
        };
    }

    // The row Label by makes from an attribute's menu (spec, "Painting an imported attribute"): named after the attribute, its type
    // glyph as the icon, one Above line already bound to it, painting every element with a value
    function labelByModel() {
        const L = L0();
        return {
            title: "degree", icon: AB.typeGlyph("num"), kind: "Measure",
            provenance: ["from the attribute degree", "inspector-attribute-and-filter-step", "attribute"],
            set: {}, labels: [{ pos: "Above", field: "degree", type: "num" }],
            paints: ["Paints " + L.nodes + " nodes", SELECT],
            order: "Wins Label Above on " + L.nodes + " of " + L.nodes + ": nothing above it labels these nodes",
            // Top-N labeling has no label option of its own: a row's selector (a top-N rule) picks the nodes
            styleNote: ["To label only the highest, put the label line on a row whose rule picks them: ", lnk("Top 10 by degree", [SELF, "label-top-n"]), "."],
            summary: [["Size", L.nodes + " nodes, every node with a degree", SELECT]],
            membersSummary: "Not ranked",
            members: [AB.empty("Every node has a degree.", { verb: "Show in table", go: ["table-dock", "nodes"] })],
            made: [],
            all: [["Attribute", "degree"], scope(L), version(L)],
        };
    }

    // Labeling only the top N by a value: a rule set whose rule is a top-N rule (ties kept whole, AB.topN)
    // carries the label line, so only its members are labeled. No label option does this.
    function labelTopModel() {
        const L = L0(), mem = AB.topN(L.rows, (r) => r.degree, 10), n = mem.length;
        const rule = () => h("span", { class: "k-mono" }, "degree, top 10, ties kept");
        return {
            title: "Top 10 by degree", color: "#F0E442", icon: ruleGlyph(), kind: "Rule set",
            provenance: ["from degree", "inspector-attribute-and-filter-step", "attribute"],
            styleNote: RULE_NOTE,
            set: {}, labels: [{ pos: "Above", field: "degree", type: "num" }],
            paints: ["Paints " + n + " nodes", SELECT],
            order: "Wins Label Above on " + n + " of " + n + ": nothing above it labels these nodes",
            summary: [["Size", n + " nodes", SELECT], ["Degree", mem[n - 1].degree + " to " + mem[0].degree]],
            membersSummary: "All " + n + ", by degree",
            members: mem.map((r) => memberRow(r.label, String(r.degree))),
            dist: mem.map((r) => [r.label, r.degree]), distOf: "degree",
            made: [["Rule", rule()]],
            all: [["Rule", rule()], ["Members", "Follow the data"], scope(L), version(L)],
        };
    }

    // Label lines on Group 2 (spec 16.6), one list per state; every position used hides the "+"
    const LABELS = {
        "label-empty": [{ pos: "Above", draft: true }],
        "label-two": [{ pos: "Above", field: "label", type: "cat" }, { pos: "Below", field: "degree", type: "num" }],
        "label-all-used": [["Above", "label", "cat"], ["Below", "Note count", "num"], ["Right", "group", "cat"], ["Left", "degree", "num"], ["Top left", "betweenness", "num"],
            ["Top right", "PageRank", "num"], ["Bottom left", "Louvain", "cat"], ["Bottom right", "Latest note", "cat"]].map(([pos, field, type]) => ({ pos, field, type }))
            .concat({ pos: "Center", text: "Group 2" }),
    };

    // An edge set: its members are edges, so the Style tab opens on Edges
    function edgeSetModel() {
        const L = L0();
        return {
            title: "Spanning tree", icon: "spline", color: "#0072B2", kind: "Edge set",
            provenance: ["from Kruskal", "inspector-run-row", "data"],
            set: { "edge.color": "#0072B2", "edge.width": 2 }, styleKind: "edge",
            paints: ["Paints 76 edges", ["table-dock", "edges"]],
            order: ["Covered by ", lnk("Valjean to Javert", [SELF, "path-lesmis"]), " and Myriel to Javert for Color on 3 of 76"],
            summary: [["Size", "76 edges", ["table-dock", "edges"]], ["Reaches", "all " + L.nodes + " nodes"]],
            membersSummary: "Not ranked",
            members: [AB.empty("Kruskal ranks no members.", { verb: "Show in table", go: ["table-dock", "edges"] })],
            made: [["Weight", "value, lower = kept first"]],
            all: [["Weight", "value, lower = kept first"], scope(L), version(L)],
            question: "Minimum or maximum spanning tree: on co-appearance counts the analyst usually wants the strongest ties kept.",
        };
    }

    function modelFor(state) {
        if (state === "group") return groupModel("2");
        if (state.startsWith("group-") && GROUPS[state.slice(6)]) return groupModel(state.slice(6));
        if (state === "other") return otherModel();
        if (state.startsWith("community-")) return communityModel(state.slice(10));
        if (state.startsWith("kept-") && GROUPS[state.slice(5)]) return keptModel(state.slice(5));
        if (state === "overlap") return overlapModel();
        if (state === "watchlist") return watchlistModel();
        if (state === "top-degree") return topDegreeModel();
        if (state === "rule-set") return ruleSetModel();
        if (state === "rule-set-empty") return ruleSetEmptyModel();
        if (state === "one-member") return oneMemberModel();
        if (state === "long-name") return longNameModel();
        if (state === "path-lesmis" || state === "arrows") return lesmisPathModel();
        if (state === "path-lesmis-2") return lesmisPath2Model();
        if (state === "path-lesmis-found") return lesmisFoundModel();
        if (state === "path" || state === "path-style" || state === "path-notes") return pathModel();
        if (state === "path-tied") {
            const lp = AB.lastPath;
            if (!(lp && lp.ds === "transactions" && lp.routes && lp.routes.length > 1) && AB.tiedPath) AB.lastPath = AB.tiedPath();
            return pathModel(false, !AB.tiedPath);
        }
        if (state === "path-reversed") return pathModel(true);
        if (state === "path-edge-set") return edgeSetModel();
        if (state === "path-door-entries") return doorPathModel();
        if (LABELS[state]) return groupModel("2");
        if (state === "label-by") return labelByModel();
        if (state === "label-top-n") return labelTopModel();
        // style, data, notes and the Style variants show Community 3, the row the tree selects beside them
        return communityModel("3");
    }

    // ---------- Style tab ----------
    function styleTab(m, state) {
        const o = { kinds: ["node", "edge"], set: Object.assign({}, m.set), kind: m.styleKind || "node", paints: typeof m.paints === "function" ? m.paints() : m.paints, order: m.order };
        // Fill set's second property only on its own route: behind the color picker the row shows as it is
        if (state === "fill-set" && AB.route && AB.route.id === SELF) o.set["node.opacity"] = 0.8;
        if (state === "edges-side") { o.set["edge.color"] = m.set["node.color"]; o.kind = "edge"; }
        if (state === "arrows") { Object.assign(o.set, { "edge.arrowHead": "normal", "edge.arrowTail": "dot" }); o.kind = "edge"; o.selected = "edge.arrowHead"; }
        // a line bound with its bind icon on this row (AB.boundOn) replaces the row's fixed value on that line
        const mine = AB.boundOn(SELF + "/" + state);
        Object.keys(mine).forEach((k) => delete o.set[k]);
        if (Object.keys(mine).length) o.bound = Object.assign({}, o.bound, mine);
        const labels = LABELS[state] || m.labels;
        if (labels) { o.labels = labels; o.selected = "node.label"; }
        // The path's edges: one middle label (the date), and the head and tail captions
        // in Arrows (folded into Head and Tail; their lines name the caption)
        if (state === "path-style") { Object.assign(o.set, { "edge.arrowHead": "normal", "edge.arrowHeadText": "amount", "edge.arrowTail": "dot" }); o.bound = { "edge.label": { field: "timestamp", type: "time" } }; o.kind = "edge"; }
        if (state === "invalid-value") { o.set["node.size"] = -2; o.error = { "node.size": "Size must be 0 or more (got -2). The row keeps painting its last valid size." }; }
        // The Paints line counts a side only when the row sets something on it
        if (Array.isArray(o.paints) && typeof o.paints[0] === "string") {
            const pm = o.paints[0].match(/^Paints ([\d,]+) nodes?(?:, ([\d,]+) edges?)?$/);
            if (pm) {
                const keys = Object.keys(o.set).concat(Object.keys(o.bound || {}));
                const nE = pm[2] || m.edgesInside;
                const parts = [keys.some((k) => k.startsWith("node.")) ? pm[1] + (pm[1] === "1" ? " node" : " nodes") : null,
                    keys.some((k) => k.startsWith("edge.")) && nE ? nE + (String(nE) === "1" ? " edge" : " edges") : null].filter(Boolean);
                if (parts.length) o.paints = ["Paints " + parts.join(", "), o.paints[1]];
            }
        }
        const tab = AB.styleTab(o);
        // An attribute path takes the middle ellipsis (spec 2.5); the shared label line draws the end
        // ellipsis, so the long field's value is redrawn here with AB.truncMiddle
        // (again after every redraw of the tab's body). 16 characters fit the value column at 1024 wide.
        const mid = () => {
            tab.querySelectorAll('.ab-sline[data-ch="node.label"][data-bound] .k-grow.k-ellipsis').forEach((v) => {
                const f = v.textContent;
                if (f.length > 16) { v.classList.remove("k-ellipsis"); v.replaceChildren(AB.truncMiddle(f, 16)); }
            });
            // Temporary, until AB.styleTab's draft label line says it itself: README and spec 16.6 word an empty
            // line "Pick a field" ("Label, Above: no field, draws nothing"); lib.js still writes "attribute"
            tab.querySelectorAll('.ab-sline[data-ch="node.label"]:not([data-bound]) .ab-sv[aria-haspopup="menu"]').forEach((v) => {
                const t = v.querySelector(".k-grow");
                if (t && t.textContent === "Pick an attribute") t.textContent = "Pick a field";
                const a = v.getAttribute("aria-label");
                if (a && a.includes("no attribute")) v.setAttribute("aria-label", a.replace("no attribute", "no field"));
            });
        };
        mid(); new MutationObserver(mid).observe(tab, { childList: true, subtree: true });
        if (state === "path-style") {
            const cap = () => [["edge.arrowHead", "amount"], ["edge.arrowTail", "no caption"]].forEach(([ch, t]) => {
                const v = tab.querySelector('.ab-sline[data-ch="' + ch + '"] .k-field .k-grow');
                if (v && !v.dataset.cap) { v.dataset.cap = "1"; v.textContent += ", " + t; v.parentNode.setAttribute("aria-label", v.parentNode.getAttribute("aria-label") + ", " + (t === "no caption" ? t : "caption " + t)); }
            });
            cap();
            new MutationObserver(cap).observe(tab, { childList: true, subtree: true });
        }
        if (m.styleNote) { const ol = tab.querySelector(".ab-paint-order") || tab.querySelector(".ab-paints"); if (ol) ol.after(h("div", { class: "ab-cap k-secondary igs-note" }, m.styleNote)); }
        if (m.orderTip) { const ol = tab.querySelector(".ab-paint-order"); if (ol) AB.tip(ol, m.orderTip, { label: false }); }
        return tab;
    }

    // ---------- Data tab ----------
    function dataTab(m, base, hot) {
        const madeBody = [
            m.made.map(([k, v]) => AB.data(k, v)),
            m.made.length
                ? h("div", { class: "igs-all" }, AB.link(SELF, base + "/all-options", "All options...", { class: "ab-link", id: "igs-all-options" }))
                : h("div", { id: "igs-all-options" }, AB.empty("All at their defaults.", { verb: "All options...", go: [SELF, base + "/all-options"] })),
            m.question ? h("div", { class: "igs-q" }, AB.openQuestion(m.question)) : null,
        ];
        const parts = AB.dataTab({
            Summary: { summary: m.summary[0][1], // a row that selects (no route) keeps the link look a routed row gets from the shell
            body: m.summary.map(([k, v, go]) => (typeof go === "function" ? AB.data(k, h("span", { class: "ab-link" }, v), { onClick: go }) : AB.data(k, v, go ? { go } : null))) },
            Members: { summary: m.membersSummary, body: [m.dist && m.dist.length > 1 && AB.histogram ? AB.histogram(distModel(m.dist, m.distOf)) : null,
                m.membersLead || null,
                m.members.length > 1 ? h("div", { class: "ab-cap k-secondary" }, m.membersSummary, m.membersOrder ? ". " + m.membersOrder : null, m.membersNote ? [" ", m.membersNote] : null) : null,
                m.membersFlag || null, m.members] },
            "Made with": { summary: m.made.length ? m.made.map((x) => x[0]).join(", ") : "All at their defaults", body: madeBody },
            Notes: { count: m.notes || 0, target: ["notes-place", (AB.route && AB.route.frame.dataset) === "doorEntries" ? "door-entries" : "all"] },
        }, { kind: "group" });
        const notes = parts[parts.length - 1];
        // A note on a path carries the path's color swatch and the word "Path", not an icon only: the
        // Notes section shows that chip, as the notes list and the note box draw it (notes-place's np-chip look)
        if (m.kind === "Path" && notes) {
            const chip = h("span", { class: "np-chip", "aria-label": "Path, " + m.title }, AB.chit(m.color, true), h("span", { style: "font-weight:550" }, "Path"), h("span", { class: "np-label k-ellipsis" }, m.title));
            const line = h("div", { class: "np-chips", style: "padding:2px 16px 4px" }, h("span", { class: "np-on" }, "Note on:"), chip);
            const body = notes.querySelector(".k-data, .ab-empty, [class*=empty]");
            if (body) body.before(line); else notes.append(line);
        }
        if (hot) { notes.classList.add("igs-hot"); notes.id = "igs-notes"; }
        return parts;
    }

    // The members' values as the one histogram (AB.histogram, the measure row's): one bar per whole value
    function distModel(pairs, what) {
        const vals = pairs.map((p) => p[1]).sort((a, b) => a - b), n = vals.length;
        const bins = new Array(vals[n - 1] + 1).fill(0), binNames = {};
        pairs.forEach(([nm, v]) => { bins[v]++; (binNames[v] = binNames[v] || []).push(nm); });
        const med = n % 2 ? vals[(n - 1) / 2] : (vals[n / 2 - 1] + vals[n / 2]) / 2;
        return { title: what, unit: "members", hist: { bins, from: 0, width: 1 }, fmt: String, binNames,
            caption: AB.count(n, "member") + ", " + what + " " + vals[0] + " to " + vals[n - 1] + ", median " + AB.num(med) };
    }

    function allOptions(m) {
        return AB.popover({
            anchor: "#igs-all-options", title: "Made with", width: 280,
            body: m.all.map(([k, v]) => AB.fieldRow(k, h("span", null, v), { popover: true })),
        });
    }

    // ---------- the section ----------
    const DATA_STATES = ["data", "notes", "rule-set", "path-lesmis", "path-lesmis-found", "path", "path-reversed", "path-tied", "path-notes", "path-door-entries"];
    const baseOf = (state) => {
        const s = String(state || "style").replace(/\/all-options$/, "");
        return RENAMED[s] || s;
    };

    // A run's group recolored from the Color popover (style-pickers draws it over this inspector and
    // reports no pick, so its swatch clicks are read here): saved against the category value, the field
    // and header follow, and the change is announced in words with Undo. ponytail: swatches only, not a typed hex.
    let shown = null, lastBase = null, lastLp = null;
    function recolor(hex, name) {
        hex = String(hex || "").trim();
        if (name && /^#[0-9A-F]{6}$/i.test(hex)) COLOR_NAMES[hex.toUpperCase()] = name;
        const m = shown && shown.m, el = shown && shown.el;
        if (!m || !m.recolor || !el.isConnected || !/^#[0-9A-F]{6}$/i.test(hex)) return;
        const was = m.color;
        if (hex.toUpperCase() === was.toUpperCase()) return;
        RECOLOR[m.recolor.key] = m.color = hex;
        el.querySelectorAll('.ab-insp-head .k-chit, .ab-sline[data-ch="node.color"] .k-chit').forEach((c) => (c.style.background = hex));
        const f = el.querySelector('.ab-sline[data-ch="node.color"] .ab-color-field');
        if (f) { f.querySelector(".k-num").textContent = hex.slice(1).toUpperCase(); f.setAttribute("aria-label", f.getAttribute("aria-label").replace(/#[0-9A-F]{6}/i, hex.toUpperCase())); }
        AB.notice(m.title + " is now " + colorName(hex) + ", was " + colorName(was), { label: "Undo", onClick: () => recolor(was) });
    }
    const picked = (e) => { const sw = e.target.closest && e.target.closest(".sp-stops [role=option]"); if (sw && (e.type === "click" || e.key === "Enter" || e.key === " ")) recolor(sw.getAttribute("aria-description"), sw.getAttribute("aria-label")); };
    document.addEventListener("click", picked, true);
    document.addEventListener("keydown", picked, true);

    registerSection({
        id: SELF,
        title: "Inspector: a group, set or path row",
        region: "right",
        rail: "graph",
        frame: (state) => (/^path(-style|-reversed|-tied|-notes)?$/.test(baseOf(state)) ? { dataset: "transactions", left: "graph-place/path-found", canvas: AB.fx.datasets.transactions.fresh ? "canvas-and-states/transfers" : "canvas-and-states/transfers-communities", dock: false }
            : baseOf(state) === "path-door-entries" ? { dataset: "doorEntries", left: "graph-place/door-entries-path", dock: false }
            : baseOf(state) === "long-name" ? { dataset: "nested", left: "graph-place/nested-set", canvas: "canvas-and-states/nested-set" } : { left: "graph-place/at-rest" }),
        // All options closes back to the row it opened from; everything else to the tree
        get closeTo() {
            const parts = location.hash.replace(/^#\/?/, "").split("/");
            return parts[0] === SELF && parts[parts.length - 1] === "all-options" ? SELF + "/" + parts.slice(1, -1).join("/")
                : parts[1] === "path-door-entries" ? "graph-place/door-entries-path" : /^path(-style|-reversed|-tied|-notes)?$/.test(parts[1] || "") ? "graph-place/path-found" : "graph-place/at-rest";
        },
        states: STATES,
        render(el, state) {
            const base = baseOf(state);
            const options = /\/all-options$/.test(state);
            // A new path, or another path state, opens on its first route
            if (base !== lastBase || AB.lastPath !== lastLp) AB.pathRouteAt = 0;
            lastBase = base; lastLp = AB.lastPath;
            const m = modelFor(base);
            // A row renamed in the tree (graph-place keeps AB.renamedRows by tree row id) keeps its new name here
            const rowId = { "kept-2": "g2", "kept-8": "g8", watchlist: "watchlist", "top-degree": "top" }[base];
            AB.renamedRows = AB.renamedRows || {};
            if (rowId && AB.renamedRows[rowId]) m.title = AB.renamedRows[rowId];
            el.append(AB.inspector({
                icon: m.icon, swatch: m.color ? AB.chit(m.color, m.icon === "circle-dot" || m.icon === "circle-check" || m.kind === "Rule set") : null,
                title: m.title, kind: m.kind, kindKey: "igs", locked: m.locked,
                provenance: m.provenance,
                menu: ["context-menus", "row"],
                onRename: (name) => { if (rowId) AB.renamedRows[rowId] = name; AB.flash("Renamed to " + name); },
                renameDisabled: m.renameDisabled || null,
                tab: options || DATA_STATES.includes(base) ? "Data" : "Style",
                tabs: { Style: () => styleTab(m, base), Data: () => dataTab(m, base, base === "notes" || base === "path-notes") },
            }));
            el.firstChild.classList.add("igs");
            // The Notes link opens the notes of the project on screen, beside this row (notes-place reads AB.noteKeep)
            el.firstChild.addEventListener("click", (e) => {
                if (e.target.closest && e.target.closest('a[href^="#/notes-place/"]')) AB.noteKeep = { right: SELF + "/" + state, dataset: (AB.route && AB.route.frame.dataset) || "lesmis" };
            }, true);
            shown = { m, el: el.firstChild };
            // The popover lives in the overlay layer like every popover; the shell fills that layer after
            // this region, so it goes in a frame later. Its X, Esc and closeTo return to the row.
            if (options) requestAnimationFrame(() => { const layer = document.getElementById("ab-overlay"); if (!layer) return;
                const pop = allOptions(m);
                // The shell's Esc closes only when the route leaves this section, so the popover handles it
                pop.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); AB.close(); } });
                layer.hidden = false;
                layer.append(pop);
                requestAnimationFrame(() => requestAnimationFrame(() => { const f = pop.querySelector("[tabindex='0']"); if (f) f.focus(); })); });
            if (base === "notes" || base === "path-notes") requestAnimationFrame(() => { const n = el.querySelector("#igs-notes"); if (n) n.scrollIntoView({ block: "start" }); });
        },
    });
})();
