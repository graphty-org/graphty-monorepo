/* Inspector: a folder. One body, no tab strip: a folder has no look of its own, so it has no
   Style tab and no Data tab. The body is the Paints line, then Members: the rows inside, drawn
   with the one tree (AB.tree) so each has its swatch, count and eye exactly as in the Graph tree.
   A row opens its own inspector; its eye shows or hides it. No About, Own look or Covers (they
   repeated the tree) and no Notes (a folder is app organization, not a note target).
   No verbs: Rename, Ungroup, Lock, Hide in list and Delete are in "...", the folder's context menu.
   The folder "For the report" holds the same three rows as the Graph tree: Group 2,
   Group 8 and Betweenness (its eye is off).
   Plain ASCII. */
(function () {
    registerSection({
        id: "inspector-folder",
        title: "Inspector: a folder",
        region: "right",
        rail: "graph",
        frame: { left: "graph-place/at-rest" },
        states: [{ id: "folder", label: "Folder" }],
        render(el) {
            const L = AB.fx.datasets.lesmis;
            const g = (label) => L.frame.legend.rows.find((r) => r.label === label);
            const g2 = g("2"), g8 = g("8");
            // The rows inside, in paint order (the Graph tree read top to bottom)
            const rows = [
                { id: "g2", name: "Group 2", kindIcon: "circle-check", swatch: AB.chit(g2.color, true), count: g2.count, eye: true, go: ["inspector-group-set-path-row", "kept-2"], menu: ["context-menus", "row"] },
                { id: "g8", name: "Group 8", kindIcon: "circle-check", swatch: AB.chit(g8.color, true), count: g8.count, eye: true, go: ["inspector-group-set-path-row", "kept-8"], menu: ["context-menus", "row"] },
                { id: "bt", name: "Betweenness", kindIcon: "chart-column", swatch: AB.ramp(), eye: false, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
            ];

            el.append(AB.inspector({
                icon: "folder-open",
                title: "For the report",
                kind: "Folder",
                kindKey: "folder",
                menu: ["context-menus", "folder"],
                body: [
                    AB.paintsLine("Paints nothing itself; each row inside paints its own members"),
                    AB.section({ title: "Members", editable: true }, AB.tree(rows, { label: "Rows in For the report" })),
                ],
            }));
        },
    });
})();
