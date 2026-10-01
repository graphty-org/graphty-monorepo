/* Inspector: a group, set or path row, in the shared inspector frame (spec 5.1, 5.2, 16; version 3).
   Style tab: the shared AB.styleTab, opening with its Paints line and paint-order line, then only the
   properties the row sets (sections always open, "+" in the header, bind and "-" on hover). Data tab:
   AB.dataTab with Summary (Size first, a link that selects), Members (top 10, names select), Made
   with (settings that differ from the default, then "All options...", a popover) and Notes. No verbs
   in the body: Keep as set, Select members and the rest are in "...". The color states live in
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
        { id: "label-by", label: "Label by degree, from its menu" },
        { id: "invalid-value", label: "Style: an invalid value" },
        { id: "notes", label: "Notes, from a row's note count" },
        { id: "group", label: "Group (Group 2)" },
        { id: "group/all-options", label: "Made with: All options" },
        { id: "community-3", label: "Community 3 (Louvain)" },
        { id: "overlap", label: "Partly covered" },
        { id: "watchlist", label: "Set (Watchlist)" },
        { id: "rule-set", label: "Rule set" },
        { id: "kept-2", label: "Kept set: Group 2, in a folder" },
        { id: "path-lesmis", label: "Path: Valjean to Javert" },
        { id: "path", label: "Path from Path between" },
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
    const acctRow = (id, k, n) => AB.row({ label: h("span", { class: "k-id" }, id), trail: k === 0 ? "start" : k === n - 1 ? "end" : "hop " + k, onClick: () => AB.flash("Selects " + id + " (not wired in the skeleton)") });
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
        });
    }

    function overlapModel() {
        const m = groupModel("4");
        m.order = ["Covered by ", lnk("Watchlist", [SELF, "watchlist"]), " for Color on " + G4_WATCHED.length + " of 11"];
        m.orderTip = G4_WATCHED.join(", ") + ". Drag this row above Watchlist in the tree to win on all 11.";
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
            made: [],
            all: [["Members", "Fixed: they do not follow the data"], scope(L), version(L)],
        };
    }

    function ruleSetModel() {
        const L = L0(), R = RULESET, n = R.members.length;
        const size = n + " nodes, " + R.inside + " edges";
        return {
            title: R.name, color: R.color, icon: "circle-check", kind: "Rule set",
            provenance: ["from degree", "inspector-attribute-and-filter-step", "attribute"],
            set: { "node.color": R.color },
            paints: ["Paints " + size, SELECT],
            order: "Wins Color on " + n + " of " + n + ": nothing above it paints these members",
            summary: [["Size", size, SELECT], ["Density", String(R.density)]],
            membersSummary: "All " + n + ", by degree within the set, then in the graph",
            members: R.members.map(([nm, d, full]) => memberRow(nm, d + " of " + full)),
            made: [["Rule", h("span", { class: "k-mono" }, "degree >= 13")]],
            all: [["Rule", h("span", { class: "k-mono" }, "degree >= 13")], ["Members", "Follow the data"], scope(L), version(L)],
            question: "On a rule set, does Keep as set (in \"...\") freeze today's " + n + " members as a plain set?",
        };
    }

    function communityModel(c) {
        const L = L0(), [size, color, notes] = COMMUNITIES[c] || COMMUNITIES[3];
        return {
            title: "Community " + c, color, icon: "circle-dot", kind: "Group",
            provenance: ["from Louvain", "inspector-run-row", "data"],
            renameDisabled: "a label per group that survives a rerun. Keep as set (in the ... menu) to name this group now.",
            set: { "node.color": color },
            paints: ["Paints " + size + " nodes", SELECT],
            edgesInside: c === "3" || c === 3 ? 30 : null, // Fantine's circle: the 30 edges among its 10 members (GROUPS[3])
            order: ["Covered by ", pr(), " for Color on " + size + " of " + size],
            summary: [["Size", size + " nodes", SELECT]],
            membersSummary: "Not ranked",
            members: [AB.empty("Louvain ranks no members.", { verb: "Show in table", go: ["table-dock", "nodes"] })],
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

    function pathModel() {
        const T = AB.fx.datasets.transactions, P = T.setsAndPaths.path, r = P.asDistance;
        const n = r.route.length;
        const size = act(n + " accounts, " + r.hops + " transfers", () => AB.flash("Selects the path's accounts and transfers (not wired in the skeleton)"));
        const members = [];
        r.route.forEach((id, k) => {
            members.push(acctRow(id, k, n));
            if (r.transfers[k]) members.push(h("div", { class: "igs-hops" }, "amount " + fmtAmount(r.transfers[k].amount) + ", " + r.transfers[k].timestamp.slice(0, 10)));
        });
        const accounts = T.nodes.toLocaleString("en-US");
        return {
            title: P.from.id + " to " + P.to.id, icon: "route", color: "#D55E00", kind: "Path",
            provenance: ["from Shortest paths", "inspector-run-row", "data"],
            set: { "node.color": "#D55E00", "edge.color": "#1A1A1A" },
            paints: h("div", { class: "ab-paints" }, act("Paints " + n + " accounts, " + r.hops + " transfers", () => AB.flash("Selects the path's accounts and transfers (not wired in the skeleton)"))),
            order: "Wins Color on " + n + " of " + n + ": nothing above it paints these accounts",
            summary: [["Size", size], ["From", P.from.id + ", " + P.from.kind + ", riskScore " + P.from.riskScore], ["To", P.to.id + ", " + P.to.kind + ", riskScore " + P.to.riskScore + (P.to.flagged ? ", flagged" : "")], ["Total amount", fmtAmount(r.dollars)]],
            membersSummary: "In path order, with each transfer",
            members,
            made: [["Weight", "amount, farther"]],
            all: [["Weight", "amount, farther"], ["Direction", "Follow it"], ["Scope", "Full graph, " + accounts + " accounts"], ["Data version", T.file + ", current"]],
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
            summary: [["Size", L.nodes + " nodes, every node with a degree", SELECT]],
            membersSummary: "Not ranked",
            members: [AB.empty("Every node has a degree.", { verb: "Show in table", go: ["table-dock", "nodes"] })],
            made: [],
            all: [["Attribute", "degree"], scope(L), version(L)],
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
        if (state === "rule-set") return ruleSetModel();
        if (state === "path-lesmis" || state === "arrows") return lesmisPathModel();
        if (state === "path-lesmis-2") return lesmisPath2Model();
        if (state === "path" || state === "path-style") return pathModel();
        if (state === "path-edge-set") return edgeSetModel();
        if (LABELS[state]) return groupModel("2");
        if (state === "label-by") return labelByModel();
        // style, data, notes and the Style variants show Community 3, the row the tree selects beside them
        return communityModel("3");
    }

    // ---------- Style tab ----------
    function styleTab(m, state) {
        const o = { kinds: ["node", "edge"], set: Object.assign({}, m.set), kind: m.styleKind || "node", paints: m.paints, order: m.order };
        if (state === "fill-set") o.set["node.opacity"] = 0.8;
        if (state === "edges-side") { o.set["edge.color"] = m.set["node.color"]; o.kind = "edge"; }
        if (state === "arrows") { Object.assign(o.set, { "edge.arrowHead": "normal", "edge.arrowTail": "dot" }); o.kind = "edge"; o.selected = "edge.arrowHead"; }
        const labels = LABELS[state] || m.labels;
        if (labels) { o.labels = labels; o.selected = "node.label"; }
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
            Summary: { summary: m.summary[0][1] instanceof Node ? m.summary[0][1].textContent : m.summary[0][1], body: m.summary.map(([k, v, go]) => AB.data(k, go ? lnk(v, go) : v)) },
            Members: { summary: m.membersSummary, body: [m.members.length > 1 ? h("div", { class: "ab-cap k-secondary" }, m.membersSummary) : null, m.members] },
            "Made with": { summary: m.made.length ? m.made.map((x) => x[0]).join(", ") : "All at their defaults", body: madeBody },
            Notes: { count: m.notes || 0, target: ["notes-place", "about-selection"] },
        }, { kind: "group" });
        if (hot) { const n = parts[parts.length - 1]; n.classList.add("igs-hot"); n.id = "igs-notes"; }
        return parts;
    }

    function allOptions(m) {
        return AB.popover({
            anchor: "#igs-all-options", title: "Made with", width: 280,
            body: m.all.map(([k, v]) => AB.fieldRow(k, h("span", null, v), { popover: true })),
        });
    }

    // ---------- the section ----------
    const DATA_STATES = ["data", "notes", "rule-set", "path-lesmis", "path"];
    const baseOf = (state) => {
        const s = String(state || "style").replace(/\/all-options$/, "");
        return RENAMED[s] || s;
    };

    registerSection({
        id: SELF,
        title: "Inspector: a group, set or path row",
        region: "right",
        rail: "graph",
        frame: (state) => (/^path(-style)?$/.test(baseOf(state)) ? { dataset: "transactions", left: "graph-place/path-found", dock: false } : { left: "graph-place/at-rest" }),
        // All options closes back to the row it opened from; everything else to the tree
        get closeTo() {
            const parts = location.hash.replace(/^#\/?/, "").split("/");
            return parts[0] === SELF && parts[parts.length - 1] === "all-options" ? SELF + "/" + parts.slice(1, -1).join("/") : "graph-place/at-rest";
        },
        states: STATES,
        render(el, state) {
            const base = baseOf(state);
            const options = /\/all-options$/.test(state);
            const m = modelFor(base);
            el.append(AB.inspector({
                icon: m.icon, swatch: m.color ? AB.chit(m.color, m.icon === "circle-dot" || m.icon === "circle-check") : null,
                title: m.title, kind: m.kind, kindKey: "igs", locked: m.locked,
                provenance: m.provenance,
                menu: ["context-menus", "row"],
                onRename: (name) => AB.flash("Renamed to " + name),
                renameDisabled: m.renameDisabled || null,
                tab: options || DATA_STATES.includes(base) ? "Data" : "Style",
                tabs: { Style: () => styleTab(m, base), Data: () => dataTab(m, base, base === "notes") },
            }));
            el.firstChild.classList.add("igs");
            // The popover lives in the overlay layer like every popover; the shell fills that layer after
            // this region, so it goes in a frame later. Its X, Esc and closeTo return to the row.
            if (options) requestAnimationFrame(() => { const layer = document.getElementById("ab-overlay"); if (!layer) return;
                const pop = allOptions(m);
                // The shell's Esc closes only when the route leaves this section, so the popover handles it
                pop.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); AB.close(); } });
                layer.hidden = false;
                layer.append(pop);
                requestAnimationFrame(() => requestAnimationFrame(() => { const f = pop.querySelector("[tabindex='0']"); if (f) f.focus(); })); });
            if (base === "notes") requestAnimationFrame(() => { const n = el.querySelector("#igs-notes"); if (n) n.scrollIntoView({ block: "start" }); });
        },
    });
})();
