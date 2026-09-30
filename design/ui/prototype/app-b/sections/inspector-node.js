/* Inspector: one node (Valjean in Les Miserables). Style tab answers "why this look": each
   property with the tree row that wins it, and the rows that also match but lose, grayed. The
   rows are the Graph place's tree at rest: PageRank (top, colors every node), Louvain (Valjean is
   in Community 1), Shortest paths (Valjean to Javert), Watchlist, Group 2 in For the report, and
   Everything. Editing a property writes to the Overrides row, which the tree then shows below
   Selection. Valjean's PageRank, 0.0754, is the measure inspector's. Plain ASCII. See ../README.md. */
(function () {
    "use strict";
    const act = AB.act;
    const CSS =
        ".in-prop{padding:6px 8px 8px 16px;border-bottom:1px solid var(--cm-border)}" +
        ".in-prop:last-child{border-bottom:0}" +
        ".in-head{display:flex;align-items:center;gap:8px;min-height:24px}" +
        ".in-head .in-name{flex:1 1 auto;color:var(--cm-text-secondary)}" +
        ".in-val{display:inline-flex;align-items:center;gap:6px;min-width:0;max-width:150px;height:24px;padding:0 6px;border-radius:5px;box-shadow:inset 0 0 0 1px var(--cm-border)}" +
        ".in-val:hover{background:var(--cm-bg-hover)}" +
        ".in-win,.in-lose{display:flex;align-items:center;gap:6px;min-height:22px;padding-inline-start:2px}" +
        ".in-win .k-i{color:var(--cm-text-secondary)}" +
        ".in-lose{color:var(--cm-text-secondary);opacity:.62}" +
        ".in-lose .ab-link{color:inherit}" +
        ".in-why{flex:none;color:var(--cm-text-secondary)}" +
        ".in-lose-note{margin-inline-start:auto;font-size:11px;white-space:nowrap}" +
        ".in-hint{padding:8px 16px;color:var(--cm-text-secondary)}" +
        ".in-edited{display:flex;align-items:center;gap:8px;margin:8px 16px 0;padding:6px 8px;border-radius:5px;background:var(--cm-bg-secondary)}" +
        ".in-rank{color:var(--cm-text-secondary);font-size:11px;margin-inline-start:6px}" +
        ".in-oq{display:block;width:fit-content;max-width:100%;margin-top:4px;white-space:normal}" +
        ".in-foot{display:flex;flex-wrap:wrap;gap:8px;padding:4px 16px 8px}";
    if (!document.getElementById("in-node-css")) document.head.append(h("style", { id: "in-node-css" }, CSS));

    const EDIT_COLOR = "#E41A1C"; // the analyst's own pick in the edited state; not a fixture value
    const oq = (text) => h("span", { class: "k-annot-tag in-oq", title: text }, "Open question: " + text);
    const toEdit = { go: ["inspector-node", "edited"] };

    // One property: name, its current value (click to edit), the winning row, the losing rows.
    function prop(name, value, win, losers) {
        return h("div", { class: "in-prop" },
            h("div", { class: "in-head" }, h("span", { class: "in-name" }, name),
                h("span", Object.assign({ class: "in-val", role: "button", title: "Set this node's " + name.toLowerCase() + " (goes in Overrides)" }, act(toEdit)), value)),
            h("div", { class: "in-win" }, h("span", { class: "in-why" }, "from"), win),
            (losers || []).map((l) => h("div", { class: "in-lose" }, h("span", { class: "in-why" }, "also"), l[0], h("span", { class: "in-lose-note" }, l[1]))));
    }
    const rowLink = (ic, label, target) => h("span", { style: "display:inline-flex;align-items:center;gap:6px;min-width:0" }, ic, target ? link(target[0], target[1], label) : label);

    function styleTab(edited) {
        const L = AB.fx.datasets.lesmis;
        const g2 = L.groupColors["2"];
        const group2 = () => rowLink(AB.chit(g2, true), "Group 2", ["inspector-group-set-path-row", "group-2"]);
        const degree = () => rowLink(AB.ramp("#cfcfcf", "#4d4d4d"), "Degree", ["inspector-measure-row", "style"]);
        const betw = () => rowLink(AB.ramp(), "Betweenness", ["inspector-measure-row", "style"]);
        const every = () => rowLink(icon("square", "sm"), "Everything", ["inspector-selection-and-everything", "everything"]);
        const sel = () => rowLink(icon("scan", "sm"), "Selection", ["inspector-selection-and-everything", "selection"]);
        const overrides = () => h("span", Object.assign({ style: "display:inline-flex;align-items:center;gap:6px" }), icon("pencil", "sm"),
            h("a", Object.assign({ class: "ab-link", href: "#" }, act({ onClick: (e) => { e.preventDefault(); AB.flash("Overrides row inspector (not wired in the skeleton)"); } })), "Overrides"));

        const pagerank = () => rowLink(AB.ramp("#ef7818", "#662506"), "PageRank", ["inspector-measure-row", "style"]);
        const community = () => rowLink(AB.chit("#E69F00", true), "Community 1", ["inspector-group-set-path-row", "community-1"]);
        const path = () => rowLink(AB.chit("#D55E00"), "Valjean to Javert", ["inspector-group-set-path-row", "path-lesmis"]);
        const watch = () => rowLink(AB.chit("#CC79A7", true), "Watchlist", ["inspector-group-set-path-row", "watchlist"]);
        const PR_COLOR = "#662506"; // Valjean's PageRank, 0.0754, the top of the ramp
        const lower = (f) => [f(), "lower in the tree"];
        const colorLosers = (withPagerank) => [withPagerank ? lower(pagerank) : null, lower(community), lower(path), lower(watch), lower(group2), [betw(), "hidden"], lower(every)].filter(Boolean);
        return [
            edited
                ? h("div", { class: "in-edited" }, icon("pencil", "sm"), h("span", { class: "k-grow" }, "Color set on this node only, in the Overrides row."),
                    AB.button("Reset", { kind: "ghost", go: ["inspector-node", "why-this-look"] }))
                : null,
            edited ? h("div", { style: "padding:0 16px" }, oq("what the Overrides row's inspector shows")) : null,
            AB.section({ title: "Why this look" },
                edited
                    ? prop("Color", [AB.chit(EDIT_COLOR, true), h("span", { class: "k-mono" }, EDIT_COLOR)], overrides(), colorLosers(true))
                    : prop("Color", [AB.chit(PR_COLOR, true), h("span", { class: "k-mono" }, PR_COLOR)], h("span", null, pagerank(), h("span", { class: "in-rank k-num" }, "0.0754, the highest")), colorLosers(false)),
                prop("Size", [h("span", { class: "k-num" }, "24 px")], h("span", null, degree(), h("span", { class: "in-rank k-num" }, "36, the largest")), [[every(), "lower in the tree"]]),
                prop("Outline", ["Selected"], sel(), []),
                prop("Shape", ["Circle"], every(), []),
                prop("Label", ["Valjean"], h("span", null, every(), h("span", { class: "in-rank" }, "label attribute")), []),
                prop("Opacity", [h("span", { class: "k-num" }, "100%")], every(), []),
            ),
            h("div", { class: "in-hint k-secondary" }, "A higher row in the tree wins each property. Changing a value here sets it on this node only and adds it to the Overrides row."),
        ];
    }

    function dataTab() {
        const L = AB.fx.datasets.lesmis;
        const n = L.nodes;
        return [
            AB.section({ title: "Attributes", count: 3, actions: AB.iconButton("table", "Show attributes", { go: ["data-place", "attributes"] }) },
                AB.data("id", h("span", { class: "k-mono" }, "11")), AB.data("label", "Valjean"),
                AB.data("group", h("span", { style: "display:inline-flex;align-items:center;gap:6px" }, AB.chit(L.groupColors["2"], true), "2"), { go: ["inspector-group-set-path-row", "group-2"] })),
            AB.section({ title: "Results", count: 3 },
                AB.data("PageRank", h("span", null, "0.0754", h("span", { class: "in-rank" }, "rank 1 of " + n)), { go: ["inspector-measure-row", "data"] }),
                AB.data("Betweenness", h("span", null, "0.57", h("span", { class: "in-rank" }, "rank 1 of " + n)), { go: ["inspector-measure-row", "data"] }),
                AB.data("Degree", h("span", null, "36", h("span", { class: "in-rank" }, "rank 1 of " + n)), { go: ["inspector-measure-row", "data"] })),
            AB.section({ title: "Memberships", count: 4 },
                AB.row({ swatch: AB.chit("#E69F00", true), label: "Community 1 (Louvain)", trail: "25 nodes", go: ["inspector-group-set-path-row", "community-1"] }),
                AB.row({ swatch: AB.chit("#D55E00"), label: "Valjean to Javert (path)", trail: "2 nodes", go: ["inspector-group-set-path-row", "path-lesmis"] }),
                AB.row({ swatch: AB.chit("#CC79A7", true), label: "Watchlist (set)", trail: "5 nodes", go: ["inspector-group-set-path-row", "watchlist"] }),
                AB.row({ swatch: AB.chit(L.groupColors["2"], true), label: "Group 2 (group)", trail: "14 nodes", go: ["inspector-group-set-path-row", "group-2"] })),
            AB.section({ title: "Neighbors", count: L.valjeanNeighbors },
                AB.data("Connected nodes", String(L.valjeanNeighbors)),
                h("div", { class: "in-foot" }, AB.button("Show in table", { kind: "secondary", icon: "table", go: ["table-dock", "nodes"] }))),
            AB.section({ title: "Notes", count: 0, actions: AB.iconButton("plus", "Add note (N)", { go: ["notes-place", "about-selection"] }) },
                h("div", { class: "ab-pad k-secondary" }, "No notes about Valjean yet. ", link("notes-place", "all", "All notes"))),
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
            { id: "edited", label: "A property edited" },
        ],
        render(el, state) {
            const L = AB.fx.datasets.lesmis;
            const ins = AB.inspector({
                icon: "circle-dot", title: "Valjean", kind: "Node", kindKey: "node",
                meta: h("span", null, "Group 2, degree 36, in ", link("graph-place", "at-rest", L.frame.graphRow), " (" + L.frame.file + ")"),
                tab: state === "data" ? "Data" : "Style",
                tabs: { Style: () => styleTab(state === "edited"), Data: dataTab },
            });
            ins.querySelector(".ab-insp-head").append(h("span", { class: "k-grow" }), AB.iconButton("ellipsis", "Node menu", { go: ["context-menus", "node"] }));
            el.append(ins);
        },
    });
})();
