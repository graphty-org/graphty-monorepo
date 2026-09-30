/* Inspector: a group, set or path row. The right panel when one group, set or path row of the
   paint tree is selected: a Style tab (what this row paints, the color picker, what covers it) and
   a Data tab (summary, membership, provenance, notes). Plain ASCII.

   Les Miserables numbers not in kit/fixtures.json (edges inside a group, density, degree within
   the group) were computed from graph-io's test corpus miserables.json with the kit's correction
   (Old Man's edge goes to Myriel), which reproduces the fixtures' 254 edges and every degree. */
(function () {
    "use strict";
    const { h, icon } = AB;

    // this section's stylesheet, loaded once
    if (!document.querySelector("link[data-igs]")) document.head.append(h("link", { rel: "stylesheet", href: "sections/inspector-group-set-path-row.css", "data-igs": "" }));

    // ---------- Les Miserables groups (the "group" attribute shown as groups) ----------
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
    // The legend's shared "Other" row: groups 6, 7 and 10, each too small for its own color
    const OTHER = { members: [["Child1", 1], ["Child2", 1], ["Mme.Burgon", 1], ["Jondrette", 1], ["Boulatruelle", 0]], inside: 2, leaving: 4 };
    // Watchlist, the locked set in the paint tree: [name, degree within the set, degree, group]
    const WATCHLIST = { color: "#CC79A7", inside: 8, density: 0.8, members: [["Thenardier", 4, 16, 4], ["Mme.Thenardier", 4, 11, 4], ["Valjean", 3, 36, 2], ["Javert", 3, 17, 4], ["Eponine", 2, 11, 4]] };
    // A rule set made with Create rule set... on degree: every character with degree 13 or more
    const RULESET = { name: "Degree 13 or more", color: "#F0E442", inside: 24, density: 0.667, members: [["Valjean", 7, 36], ["Gavroche", 7, 22], ["Marius", 6, 19], ["Enjolras", 6, 15], ["Javert", 5, 17], ["Thenardier", 5, 16], ["Bossuet", 5, 13], ["Courfeyrac", 4, 13], ["Fantine", 3, 15]] };
    // Group 4 members that are also on the Watchlist
    const G4_WATCHED = ["Javert", "Thenardier", "Mme.Thenardier", "Eponine"];
    // The communities of the tree's Louvain run (sizes and colors as the Graph place and the table
    // dock show them), and Community 3's two notes (the tree shows its note count)
    const COMMUNITIES = { 1: [25, "#E69F00"], 2: [17, "#56B4E9"], 3: [10, "#009E73"], 4: [10, "#0072B2"], 5: [9, "#D55E00"], 6: [6, "#CC79A7"] };
    const COMMUNITY3_NOTES = [
        { text: "Myriel's household and the people he meets in Digne.", when: "Sep 30" },
        { text: "Napoleon is here only because Myriel meets him once.", when: "Sep 29" },
    ];

    const STATES = [
        { id: "style", label: "Style tab" },
        { id: "data", label: "Data tab" },
        { id: "picker", label: "Color picker: Custom" },
        { id: "picker-libraries", label: "Color picker: Libraries" },
        { id: "notes", label: "Notes, from a row's note count" },
        { id: "overlap", label: "Partly covered" },
        { id: "watchlist", label: "Set (Watchlist)" },
        { id: "rule-set", label: "Rule set" },
        { id: "path-lesmis", label: "Path: Valjean to Javert" },
        { id: "path", label: "Path from the Path tool" },
        { id: "path-style", label: "Path: Style" },
    ];
    // Every group and the Other row, which the canvas legend and several inspectors link to
    const L0 = () => AB.fx.datasets.lesmis;
    const GROUP_IDS = ["2", "8", "4", "1", "3", "5", "0"];
    GROUP_IDS.forEach((g) => STATES.push({ id: "group-" + g, label: "Group " + g }));
    STATES.push({ id: "other", label: "Groups 6, 7 and 10" });
    Object.keys(COMMUNITIES).forEach((c) => STATES.push({ id: "community-" + c, label: "Community " + c + " (Louvain)" }));

    // ---------- small builders ----------
    const pct = (n, of) => Math.round((n / of) * 100) + "%";
    const fmtUSD = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USD";
    const oq = (text) => h("div", { class: "igs-oq" }, h("span", { class: "igs-oq-tag" }, "Open question"), h("span", null, text));
    const legendRow = (label, fields) => h("div", { class: "k-fieldrow" }, h("span", { class: "k-legend" }, label), h("div", { class: "k-fields igs-fields" }, fields));
    const notWired = (what) => () => AB.flash(what + " (not wired in the skeleton)");
    const titleWith = (lead, text, extra) => h("span", { class: "igs-title" }, lead, h("span", { class: "k-ellipsis" }, text), extra || null);
    const ruleMark = () => h("span", { class: "igs-rule", title: "Rule set: its members follow the data" }, icon("funnel", "sm"), "rule");

    // A color field: swatch (opens the picker) + hex, then opacity, then remove
    function colorField(color, st, label) {
        if (!color)
            return legendRow(label, [AB.field(h("span", { class: "igs-unset" }, "Not set"), { span: true, onClick: () => st.openPicker("Custom") }), AB.iconButton("plus", "Set " + label.toLowerCase(), { onClick: () => st.openPicker("Custom") })]);
        const chit = h("span", Object.assign({ class: "k-chit igs-chit-btn", style: "background:" + color, role: "button", "aria-label": "Open the color picker", "aria-expanded": st.pickerOpen ? "true" : "false" }, AB.act({ onClick: () => st.openPicker("Custom") })));
        const f = h("span", { class: "k-field k-span", "data-focus": st.pickerOpen ? "" : null }, chit, h("span", { class: "k-mono k-grow" }, color.replace("#", "").toUpperCase()), h("span", { class: "k-secondary k-num" }, "100%"));
        return legendRow(label, [f, AB.iconButton("minus", "Remove " + label.toLowerCase(), { onClick: notWired("Remove " + label.toLowerCase()) })]);
    }
    function pickField(label, value) {
        const unset = value == null;
        return legendRow(label, [AB.field(unset ? h("span", { class: "igs-unset" }, "Not set") : value, { span: true, caret: true, onClick: notWired(label + " options") }), h("span")]);
    }

    // ---------- Style tab ----------
    function styleTab(m, st) {
        const nodes = AB.section({ title: "Nodes", actions: AB.iconButton("plus", "Apply a library style", { onClick: () => st.openPicker("Libraries") }) },
            colorField(m.nodeColor, st, "Color"),
            pickField("Size", m.size),
            pickField("Shape", m.shape),
            pickField("Label", m.label));
        const edges = AB.section("Edges",
            colorField(m.edgeColor, st, "Edge color"),
            pickField("Width", m.edgeWidth),
            m.isPath ? null : oq("Which edges does this row's edge style reach: only edges with both ends inside it, or also the edges leaving it?"));
        const layer = AB.section("Layer", legendRow("Opacity", [AB.field("100%", { span: true, onClick: notWired("Opacity") }), h("span")]));
        return [nodes, edges, layer, overlapSection(m)];
    }

    function overlapSection(m) {
        const s = AB.section({ title: "Overlap", actions: AB.iconButton("info", "Higher rows win. A member in two rows takes each property from the higher row.", { onClick: () => AB.flash("Higher rows win: a member in two rows takes each property from the higher row.") }) });
        (m.overlap || []).forEach((o) => {
            const text = h("span", { class: "k-grow" }, o.text);
            const btn = o.move ? AB.button("Move above", { kind: "secondary", onClick: () => { text.textContent = o.after; btn.remove(); AB.flash("Moved above " + o.move + ". Undo with Ctrl+Z."); } }) : null;
            s.append(h("div", { class: "igs-ov", title: o.who || null }, text, btn));
        });
        return s;
    }

    // ---------- Data tab ----------
    function dataTab(m, st) {
        const out = [];
        if (m.path) out.push(pathSection(m));
        out.push(AB.section("Summary", m.summary.map(([k, v]) => AB.data(k, v))));
        out.push(membership(m));
        out.push(AB.section("Provenance", m.provenance.map((p) => (p instanceof Node ? p : AB.data(p[0], p[2] ? h("span", { class: "ab-link" }, p[1]) : p[1], p[2] ? { go: p[2] } : null)))));
        out.push(AB.section("Use it",
            h("div", { class: "igs-acts" },
                m.keepAsSet === false ? null : AB.button("Keep as set", { kind: "secondary", onClick: () => AB.flash("Kept as a set: a new set row on top of the tree (not wired in the skeleton)") }),
                AB.button("Compare with...", { kind: "secondary", go: ["full-canvas-modes", "comparison"] })),
            m.keepAsSetQuestion ? oq(m.keepAsSetQuestion) : null));
        out.push(notesSection(m, st));
        return out;
    }

    function membership(m) {
        const s = AB.section({ title: "Membership", count: m.memberCount });
        if (m.membersFolded) s.append(h("div", { class: "ab-cap k-secondary" }, "The table lists every member with its values."));
        else {
            s.append(h("div", { class: "ab-cap k-secondary" }, m.rankedBy));
            m.members.forEach((r) => s.append(r));
        }
        s.append(h("div", { class: "igs-acts" },
            AB.button("Show members in table", { kind: "secondary", icon: "table", go: ["table-dock", "members-of-row"] }),
            AB.button("Select members", { kind: "secondary", icon: "mouse-pointer-2", go: ["inspector-several-elements"] })));
        return s;
    }
    const memberRow = (name, trail) => h("div", { class: "igs-member" }, AB.row({ label: name, trail, go: ["inspector-node", name === "Valjean" ? "why-this-look" : "data"] }));
    // Accounts on a path select; the node inspector's states are Les Miserables characters
    const acctRow = (id, k, n) => h("div", { class: "igs-member" }, AB.row({ label: h("span", { class: "k-id" }, id), trail: k === 0 ? "start" : k === n - 1 ? "end" : "hop " + k, onClick: notWired("Select " + id) }));

    function notesSection(m, st) {
        const notes = m.notes || [];
        const s = AB.section({ title: "Notes", count: notes.length || null, actions: [AB.iconButton("sticky-note", "Open in Notes", { go: ["notes-place", "about-selection"] }), AB.iconButton("plus", "Add note (N)", { go: ["notes-place", "all"] })] });
        if (!notes.length) s.append(h("div", { class: "ab-pad k-secondary" }, "No notes about this row yet."));
        notes.forEach((n) => s.append(h("div", { class: "igs-note" }, n.text, h("span", { class: "k-secondary" }, n.when))));
        if (st.hotNotes) {
            s.classList.add("igs-hot");
            s.id = "igs-notes";
        }
        return s;
    }

    // ---------- the path's own section: endpoints and length ----------
    function pathSection(m) {
        const P = m.path;
        const s = AB.section("Path");
        s.append(...P.ends.flatMap((e) => [AB.data(e.role, e.name, e.go ? { go: e.go } : { onClick: notWired("Select " + e.name) }), h("div", { class: "igs-hops" }, e.about)]));
        s.append(AB.data("Length", P.length));
        if (P.weight) s.append(AB.data("Weight", P.weight));
        if (P.steps) {
            s.append(h("div", { class: "ab-cap k-secondary" }, "Step by step:"));
            P.steps.forEach((t, k, a) => {
                s.append(acctRow(t.id, k, a.length));
                if (t.next) s.append(h("div", { class: "igs-hops" }, t.next));
            });
        }
        return s;
    }

    // ---------- the rows ----------
    // What sits above a row in the paint tree: PageRank and
    // the Louvain run (each colors every node), the Shortest paths run, Watchlist, then the folder
    // For the report holding Group 2 and Group 8.
    const groupOverlap = (n, extra) => [
        { text: "Covered by PageRank: color. PageRank sits higher and colors all " + n + " members.", move: "PageRank", after: "Color: this row now wins on all " + n + " members." },
        { text: "Also above it: Louvain, resolution 1.0, which colors all " + n + "." + (extra || "") },
        { text: "Size, shape and label are not set on this row, so they come from rows beneath it." },
    ];
    const provGroup = (L) => [["Created from", "Show as groups on group", ["inspector-run-row", "data"]], ["Scope", "Full graph, " + L.nodes + " nodes"], ["Data version", L.file + ", current"]];
    const shareOf = (n, L) => pct(n, L.nodes) + " of " + L.nodes + " nodes";

    function groupModel(g) {
        const L = L0();
        const leg = L.frame.legend.rows.find((r) => r.label === g);
        const [inside, leaving, density, top] = GROUPS[g];
        return {
            key: "group",
            title: titleWith(AB.chit(leg.color, true), "Group " + g),
            meta: leg.count + " nodes, from the attribute group.",
            nodeColor: leg.color,
            overlap: groupOverlap(leg.count, g === "2" ? " Watchlist holds Valjean too." : g === "4" ? " Watchlist holds " + G4_WATCHED.length + " of its members." : ""),
            summary: [["Size", leg.count + " nodes"], ["Share of graph", shareOf(leg.count, L)], ["Density", density + " (" + inside + " edges inside)"], ["Edges leaving", String(leaving)]],
            memberCount: leg.count,
            rankedBy: (leg.count > 10 ? "Top 10 of " + leg.count + " " : "All " + leg.count + " ") + "by degree within the group, since the group ranks nothing.",
            members: top.map(([n, d]) => memberRow(n, String(d))),
            provenance: provGroup(L),
            notes: [],
        };
    }

    function otherModel() {
        const L = L0(), o = L.frame.legend.other;
        return {
            key: "group",
            title: titleWith(AB.chit(o.color, true), o.title),
            meta: o.count + " nodes in three groups too small for a color of their own.",
            nodeColor: o.color,
            overlap: groupOverlap(o.count),
            summary: [["Size", o.count + " nodes"], ["Share of graph", shareOf(o.count, L)], ["Groups", "6 (1 node), 7 (2), 10 (2)"], ["Edges inside their own group", String(OTHER.inside)], ["Edges leaving", String(OTHER.leaving)]],
            memberCount: o.count,
            rankedBy: "All " + o.count + " by degree within their own group.",
            members: OTHER.members.map(([n, d]) => memberRow(n, String(d))),
            provenance: provGroup(L),
            notes: [],
        };
    }

    // Group 4 with PageRank and Louvain hidden: Watchlist, above it, wins on part of it
    function overlapModel() {
        const m = groupModel("4");
        m.overlap = [
            { text: [G4_WATCHED.length + " of 11 members show Watchlist's color. ", h("span", { class: "k-secondary" }, "(" + G4_WATCHED.join(", ") + ")")], move: "Watchlist", after: "Color: this row now wins on all 11 members." },
            { text: "PageRank and Louvain, resolution 1.0 are higher too, but hidden, so they paint nothing now." },
            { text: "Size, shape and label are not set on this row, so they come from rows beneath it." },
        ];
        return m;
    }

    function watchlistModel() {
        const L = L0(), W = WATCHLIST, n = W.members.length;
        return {
            key: "set",
            title: titleWith(AB.chit(W.color, true), "Watchlist", h("span", { class: "k-secondary", title: "Locked: its place and style are frozen" }, icon("lock", "sm"))),
            meta: n + " nodes, a set. Locked.",
            nodeColor: W.color,
            overlap: [
                { text: "Covered by PageRank: color. PageRank sits higher and colors all " + n + " members.", move: "PageRank", after: "Color: this row now wins on all " + n + " members." },
                { text: "Also above it: Louvain, resolution 1.0 (all " + n + "), and Valjean to Javert (2 of " + n + ": Valjean, Javert)." },
            ],
            summary: [["Size", n + " nodes"], ["Share of graph", shareOf(n, L)], ["Density", W.density + " (" + W.inside + " edges inside)"], ["Groups", "4 (4 members), 2 (1)"]],
            memberCount: n,
            rankedBy: "All " + n + " by degree within the set, since a set ranks nothing.",
            members: W.members.map(([nm, d]) => memberRow(nm, String(d))),
            provenance: [["Created from", "Create set, on a selection"], ["Scope", "Full graph, " + L.nodes + " nodes"], ["Data version", L.file + ", current"]],
            keepAsSet: false,
            notes: [],
        };
    }

    // New rows land at the top of the tree, just under Selection and Overrides
    function ruleSetModel() {
        const L = L0(), R = RULESET, n = R.members.length;
        return {
            key: "set",
            title: titleWith(AB.chit(R.color, true), R.name, ruleMark()),
            meta: n + " nodes, a rule set: its members follow the data.",
            nodeColor: R.color,
            overlap: [
                { text: "All " + n + " members show this row's color." },
                { text: "Every row it sits above, PageRank and Louvain included, loses color on these " + n + " members." },
            ],
            summary: [["Size", n + " nodes"], ["Share of graph", shareOf(n, L)], ["Density", R.density + " (" + R.inside + " edges inside)"]],
            memberCount: n,
            rankedBy: "All " + n + " by degree within the set, then degree in the whole graph.",
            members: R.members.map(([nm, d, full]) => memberRow(nm, d + " of " + full)),
            provenance: [
                h("div", { class: "k-data" }, h("span", { class: "k-name" }, "Rule"), h("span", { class: "k-value" }, ruleMark(), " degree 13 or more")),
                ["Created from", "Create rule set... on degree", ["inspector-attribute-and-filter-step", "attribute"]],
                ["Members", "Follow the data: recomputed when it changes"],
                ["Scope", "Full graph, " + L.nodes + " nodes"],
                ["Data version", L.file + ", current"],
            ],
            keepAsSetQuestion: "On a rule set, does Keep as set freeze today's " + n + " members as a plain set?",
            notes: [],
        };
    }

    // A community of the Louvain run; Community 3 is the row whose note count opens the notes state
    function communityModel(n) {
        const L = L0(), C = { size: COMMUNITIES[n][0], color: COMMUNITIES[n][1], notes: n === "3" ? COMMUNITY3_NOTES : [] };
        return {
            key: "group",
            title: titleWith(AB.chit(C.color, true), "Community " + n),
            meta: C.size + " nodes, from Louvain, resolution 1.0.",
            nodeColor: C.color,
            overlap: [
                { text: "Covered by PageRank: color. PageRank sits higher and colors all " + C.size + " members.", move: "PageRank", after: "Color: this row's run now wins on all " + C.size + " members." },
            ],
            summary: [["Size", C.size + " nodes"], ["Share of graph", shareOf(C.size, L)]],
            memberCount: C.size,
            membersFolded: true,
            provenance: [["Created from", "Louvain, resolution 1.0", ["inspector-run-row", "data"]], ["Scope", "Full graph, " + L.nodes + " nodes"], ["Data version", L.file + ", current"]],
            notes: C.notes,
        };
    }

    // Valjean to Javert: a child of the tree's Shortest paths run. They share 17 chapters.
    function lesmisPathModel() {
        const L = L0();
        return {
            key: "path",
            isPath: true,
            title: titleWith(icon("route"), "Valjean to Javert"),
            meta: "2 nodes, 1 edge. From Shortest paths.",
            nodeColor: "#D55E00",
            edgeColor: "#D55E00",
            edgeWidth: null,
            overlap: [
                { text: "Covered by PageRank: node color on both members. PageRank sits higher.", move: "PageRank", after: "Node color: this row now wins on both members." },
                { text: "Edge color: this row wins on its 1 edge; nothing above it paints edges." },
            ],
            path: {
                ends: [
                    { role: "From", name: "Valjean", about: "group 2, degree 36", go: ["inspector-node", "why-this-look"] },
                    { role: "To", name: "Javert", about: "group 4, degree 17", go: ["inspector-node", "data"] },
                ],
                length: "1 edge (they appear together)",
                weight: "Not used: fewest edges",
            },
            summary: [["Size", "2 nodes, 1 edge"], ["Share of graph", shareOf(2, L)], ["Edge value", "17 shared chapters"]],
            memberCount: 2,
            rankedBy: "In path order, start to end.",
            members: [memberRow("Valjean", "start"), memberRow("Javert", "end")],
            provenance: [["Created from", "Shortest paths", ["inspector-run-row", "data"]], ["Scope", "Full graph, " + L.nodes + " nodes"], ["Data version", L.file + ", current"]],
            notes: [],
        };
    }

    // The path the Path tool finds on the transfers: amount read as distance
    function pathModel() {
        const T = AB.fx.datasets.transactions, P = T.setsAndPaths.path, r = P.asDistance;
        const n = r.route.length;
        const steps = r.route.map((id, k) => ({ id, next: r.transfers[k] ? fmtUSD(r.transfers[k].amount) + ", " + r.transfers[k].timestamp.slice(0, 10) : null }));
        return {
            key: "path",
            isPath: true,
            title: titleWith(icon("route"), P.from.id + " to " + P.to.id),
            meta: n + " accounts, " + r.hops + " transfers. From Shortest paths, weighted by amount.",
            nodeColor: "#D55E00",
            edgeColor: "#1A1A1A",
            edgeWidth: null,
            overlap: [{ text: "Nothing above it paints its accounts or transfers: it wins every property it sets." }],
            path: {
                ends: [
                    { role: "From", name: P.from.id, about: P.from.kind + ", " + P.from.country + ", riskScore " + P.from.riskScore },
                    { role: "To", name: P.to.id, about: P.to.kind + ", " + P.to.country + ", riskScore " + P.to.riskScore + (P.to.flagged ? ", flagged" : "") },
                ],
                length: r.hops + " transfers, following their direction",
                weight: "amount, higher = farther",
                steps,
            },
            summary: [["Size", n + " accounts, " + r.hops + " transfers"], ["Share of graph", n + " of " + T.nodes.toLocaleString("en-US") + " accounts"], ["Total amount", fmtUSD(r.dollars)]],
            memberCount: n,
            rankedBy: "In path order, start to end.",
            members: r.route.map((id, k) => acctRow(id, k, n)),
            provenance: [["Created from", "Shortest paths, weighted by amount", ["inspector-run-row", "data"]], ["Found with", "the Path tool", ["path-tool", "found"]], ["Scope", "Full graph, " + T.nodes.toLocaleString("en-US") + " accounts"], ["Data version", T.file + ", current"]],
            notes: [],
        };
    }

    // ---------- the color picker, to the left of the inspector ----------
    const SWATCHES = [["#E69F00", "Orange"], ["#56B4E9", "Sky blue"], ["#009E73", "Bluish green"], ["#0072B2", "Blue"], ["#D55E00", "Vermilion"], ["#CC79A7", "Reddish purple"], ["#000000", "Black"], ["#F0E442", "Yellow"], ["#808080", "Gray, unstyled"]];
    function picker(m, tab, anchorEl, onClose) {
        const cur = { color: m.nodeColor };
        const body = h("div", { class: "igs-cp-body" });
        const custom = () => {
            const sb = h("div", { class: "igs-sb", style: "background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, " + cur.color + ")" }, h("span", { class: "igs-ret", style: "left:88%;top:12%" }));
            const hex = h("span", { class: "k-field igs-hex k-mono" }, cur.color.replace("#", "").toUpperCase());
            const sw = h("div", { class: "igs-sw" });
            SWATCHES.forEach(([c, n]) => {
                const chit = h("span", { class: "k-chit", style: "background:" + c, role: "button", tabindex: "0", "aria-label": n, title: n, "aria-pressed": String(c === cur.color) });
                chit.addEventListener("click", () => { cur.color = c; body.replaceChildren(...custom()); anchorEl.querySelectorAll(".igs-chit-btn").forEach((x, i) => { if (i === 0) x.style.background = c; }); anchorEl.querySelectorAll(".igs-chit-btn + .k-mono").forEach((x, i) => { if (i === 0) x.textContent = c.slice(1); }); });
                sw.append(chit);
            });
            return [sb, h("div", { class: "igs-sl igs-hue" }, h("span", { style: "left:8%" })), h("div", { class: "igs-sl", style: "background: linear-gradient(90deg, transparent, " + cur.color + "), repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px" }, h("span", { style: "left:96%" })), h("div", { class: "igs-val" }, AB.field("Hex", { caret: true, onClick: notWired("Color format") }), hex, h("span", { class: "k-field igs-op k-num" }, "100%")), sw];
        };
        const pal = (name, kind, colors, ramp) => AB.row({ label: [name, " ", h("span", { class: "k-secondary" }, kind)], swatch: ramp ? h("span", { class: "igs-rampbar", style: "background:linear-gradient(90deg," + colors.join(",") + ")" }) : h("span", { class: "igs-pal" }, colors.map((c) => h("span", { class: "k-chit", style: "background:" + c }))), onClick: notWired("Apply " + name) });
        const libraries = () => [h("div", { class: "igs-libs" },
            h("div", { class: "k-search" }, AB.field("Find a palette or style", { icon: "search", onClick: notWired("Find in libraries") })),
            h("div", { class: "igs-gl" }, "Palettes"),
            pal("Okabe-Ito", "categories", ["#E69F00", "#56B4E9", "#009E73", "#0072B2", "#D55E00"]),
            pal("Orange to brown", "ramp", ["#fee6ce", "#ef7818", "#8e3104"], true),
            pal("Viridis", "ramp", ["#440154", "#21918c", "#fde725"], true),
            pal("Blue to red", "diverging", ["#2166ac", "#f7f7f7", "#b2182b"], true),
            h("div", { class: "igs-gl" }, "Library styles"),
            h("div", { class: "ab-pad k-secondary" }, "No library styles in this project yet. \"+\" saves this row's look as one."),
            oq("Does \"+\" save this row's look as a library style, or add an existing library style to this row?"))];
        const show = (t) => body.replaceChildren(...(t === "Libraries" ? libraries() : custom()));
        const head = h("div", { class: "k-popover-head" },
            AB.tabs(["Custom", "Libraries"], tab, show),
            h("span", { class: "k-grow" }),
            AB.iconButton("plus", "Save as a library style", { onClick: notWired("Save as a library style") }),
            AB.iconButton("x", "Close", { onClick: onClose }));
        const p = h("div", { class: "k-popover igs-cp", role: "dialog", "aria-label": "Color" }, head, body);
        show(tab);
        // place it to the left of the inspector, level with the swatch
        requestAnimationFrame(() => {
            const sw = anchorEl.querySelector(".igs-chit-btn");
            const R = anchorEl.getBoundingClientRect();
            const top = sw ? sw.getBoundingClientRect().top - 40 : R.top + 80;
            p.style.left = Math.max(8, R.left - 248) + "px";
            p.style.top = Math.max(8, Math.min(top, innerHeight - p.offsetHeight - 8)) + "px";
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
        if (state === "path" || state === "path-style") return pathModel();
        if (state === "other") return otherModel();
        if (state.startsWith("group-")) return groupModel(state.slice(6));
        return groupModel("2");
    }
    const TAB = { style: "Style", data: "Data", picker: "Style", "picker-libraries": "Style", notes: "Data", overlap: "Style", watchlist: "Style", "rule-set": "Data", "path-lesmis": "Data", path: "Data", "path-style": "Style" };

    registerSection({
        id: "inspector-group-set-path-row",
        title: "Inspector: a group, set or path row",
        region: "right",
        rail: "graph",
        // The transfers path is drawn by the Path tool's own tree and canvas, when that section has them
        frame: (state) => ((state === "path" || state === "path-style") && AB.sections["path-tool-tree"] ? { dataset: "transactions", left: "path-tool-tree/found", canvas: "path-tool-canvas/found", dock: false } : { left: "graph-place/at-rest" }),
        closeTo: "graph-place/at-rest",
        states: STATES,
        render(el, state) {
            const m = modelFor(state);
            const pickerOpen = state === "picker" || state === "picker-libraries";
            const st = { pickerOpen, hotNotes: state === "notes" };
            let open = null;
            // The swatch and "+" open the picker in place, so it opens on whichever row is shown
            st.openPicker = (tab) => {
                if (open) open.remove();
                open = picker(m, tab, el, () => { open.remove(); open = null; });
                el.append(open);
            };
            el.append(AB.inspector({
                title: m.title,
                kind: "",
                kindKey: "igs-" + m.key,
                meta: m.meta,
                tab: TAB[state],
                tabs: { Style: () => styleTab(m, st), Data: () => dataTab(m, st) },
            }));
            el.firstChild.classList.add("igs");
            if (pickerOpen) st.openPicker(state === "picker-libraries" ? "Libraries" : "Custom");
            if (st.hotNotes) requestAnimationFrame(() => { const n = el.querySelector("#igs-notes"); if (n) n.scrollIntoView({ block: "start" }); });
        },
    });
})();
