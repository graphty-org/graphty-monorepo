/* Inspector: one node (Valjean in Les Miserables), in the shared inspector frame.
   Style tab: the compact "Why this look" list (spec 5.4) and nothing else: one line per row that
   wins a property, top first; rows that match but win nothing fold into one closed line. The rows
   are the Graph place's tree at rest. Editing a token writes to the Overrides row, which the tree
   then shows under Selection (the "edited" state). Data tab: Summary, Memberships, Neighbors,
   Notes. Valjean's PageRank, 0.0754, is the measure inspector's. Plain ASCII. See ../README.md. */
(function () {
    "use strict";

    const EDIT_COLOR = "#E41A1C"; // the analyst's own pick in the edited state; the tree's Overrides swatch
    const PR_COLOR = "#662506"; // Valjean's PageRank, 0.0754, the top of the ramp

    function styleTab(state) {
        const L = AB.fx.datasets.lesmis;
        const edited = state === "edited";
        const lines = [
            edited ? { name: "Overrides", swatch: EDIT_COLOR, wins: ["color"], values: { color: EDIT_COLOR + ", set on this node by hand" } } : null,
            { name: "PageRank", swatch: AB.ramp("#ef7818", "#662506"), go: ["inspector-measure-row", "style"],
                wins: edited ? [] : ["color"], values: { color: PR_COLOR + ", 0.0754, highest" } },
            // Degree is hidden from the list (it still paints): the link opens the list with hidden rows shown
            { name: "Degree", swatch: AB.ramp("#cfcfcf", "#4d4d4d"), go: ["inspector-measure-row", "degree"], hiddenRow: true, wins: ["size"], values: { size: "36, largest" } },
            // Selection is read from the element's selectionStyle (color, scale, opacity), not from explain()
            { name: "Selection", swatch: AB.icon("scan", "sm"), go: ["inspector-selection-and-everything", "selection"], wins: ["highlight"], values: { highlight: "color #FFD700, scale 1.45, opacity 0.4" } },
            // What the element's own defaults still win here (styles.explain): only the shape
            { name: "Everything", swatch: "#6366F1", go: ["inspector-selection-and-everything", "everything"], wins: ["shape"],
                values: { shape: "icosphere" } },
            // match Valjean but are covered by a higher row (tree order); Betweenness is hidden, so not listed
            { name: "Community 1", swatch: AB.chit("#E69F00", true), go: ["inspector-group-set-path-row", "community-1"] },
            { name: "Valjean to Javert", swatch: AB.chit("#D55E00"), go: ["inspector-group-set-path-row", "path-lesmis"] },
            { name: "Watchlist", swatch: AB.chit("#CC79A7", true), go: ["inspector-group-set-path-row", "watchlist"] },
            { name: "Group 2", swatch: AB.chit(L.groupColors["2"], true), go: ["inspector-group-set-path-row", "group-2"] },
        ].filter(Boolean);
        const why = AB.whyThisLook(lines);
        if (edited) why.append(h("div", { class: "ab-pad" }, h("span", { class: "k-annot-tag", title: "The Overrides row has no inspector yet: what it lists, and how one value is cleared" }, "Open question")));
        if (state === "covered-open") { const more = why.querySelector(".ab-why-more"); if (more) more.click(); }
        return why;
    }

    function dataTab() {
        const L = AB.fx.datasets.lesmis;
        const v = L.rows.find((r) => r.label === "Valjean");
        const n = L.nodes;
        const rank = (value) => h("span", null, value, h("span", { class: "k-secondary" }, "  rank 1 of " + n));
        const toMeasure = { go: ["inspector-measure-row", "data"] };
        return [
            AB.section({ title: "Summary", collapsible: true, key: "node.summary", summary: "group " + v.group + ", PageRank 0.0754, degree " + v.degree },
                AB.data("id", h("span", { class: "k-mono" }, v.id)),
                AB.data("label", v.label),
                AB.data("group", String(v.group), { go: ["inspector-group-set-path-row", "group-2"] }),
                AB.data("PageRank", rank("0.0754"), toMeasure),
                AB.data("Betweenness", rank(String(v.betweenness)), toMeasure),
                AB.data("Degree", rank(String(v.degree)), toMeasure)),
            AB.section({ title: "Memberships", count: 4, collapsible: true, key: "node.memberships", summary: "Community 1, Valjean to Javert, Watchlist, Group 2" },
                AB.row({ swatch: AB.chit("#E69F00", true), label: "Community 1 (Louvain)", trail: "25", go: ["inspector-group-set-path-row", "community-1"] }),
                AB.row({ swatch: AB.chit("#D55E00"), label: "Valjean to Javert (path)", trail: "2", go: ["inspector-group-set-path-row", "path-lesmis"] }),
                AB.row({ swatch: AB.chit("#CC79A7", true), label: "Watchlist (set)", trail: "5", go: ["inspector-group-set-path-row", "watchlist"] }),
                AB.row({ swatch: AB.chit(L.groupColors["2"], true), label: "Group 2 (group)", trail: "14", go: ["inspector-group-set-path-row", "group-2"] })),
            AB.section({ title: "Neighbors", collapsible: true, key: "node.neighbors", summary: L.valjeanNeighbors + " connected nodes" },
                AB.data("Connected nodes", String(L.valjeanNeighbors), { go: ["selection-bar", "neighborhood"] })),
            AB.notesSection(2, ["notes-place", "about-selection"]),
        ];
    }

    registerSection({
        id: "inspector-node",
        title: "Inspector: one node",
        region: "right",
        rail: "graph",
        frame: { left: "graph-place/at-rest" },
        closeTo: "graph-place",
        states: [
            { id: "why-this-look", label: "Style tab (why this look)" },
            { id: "data", label: "Data tab" },
            { id: "edited", label: "A property edited (Overrides)" },
            { id: "covered-open", label: "Covered rows opened" },
        ],
        render(el, state) {
            el.append(AB.inspector({
                icon: "circle-dot", title: "Valjean", kind: "Node", kindKey: "node",
                menu: ["context-menus", "node"],
                onRename: (name) => AB.flash("Renamed to " + name + " (sets this node's label; not wired in the skeleton)"),
                tab: state === "data" ? "Data" : "Style",
                tabs: { Style: () => styleTab(state), Data: dataTab },
            }));
        },
    });
})();
