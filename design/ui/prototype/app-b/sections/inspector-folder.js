/* Inspector: a folder. A folder has no style of its own: its Style tab lists the swatches of the
   rows inside (each a link to that row), its Data tab lists those rows with their counts, then the
   folder's own Notes. The folder "For the report" holds four Les Miserables rows.
   Plain ASCII. */
(function () {
    const oq = (text) => h("span", { class: "k-badge ab-oq", title: text }, "Open question");
    if (!document.getElementById("ab-folder-css")) {
        document.head.append(h("style", { id: "ab-folder-css" },
            ".ab-oq{margin-left:6px;font-size:10px;color:var(--cm-text-secondary);white-space:nowrap}" +
            ".ab-folder-line{display:flex;align-items:center;gap:6px;padding:4px 16px 8px}"));
    }

    registerSection({
        id: "inspector-folder",
        title: "Inspector: a folder",
        region: "right",
        rail: "graph",
        frame: { left: "graph-place/at-rest" },
        states: [{ id: "style", label: "Style tab" }, { id: "data", label: "Data tab" }],
        render(el, state) {
            const L = AB.fx.datasets.lesmis;
            const g = (label) => L.frame.legend.rows.find((r) => r.label === label);
            const g2 = g("2"), g8 = g("8");
            // The rows inside, in paint order (the tree read top to bottom).
            const rows = [
                { name: "Group 2", icon: "circle-dot", swatch: AB.chit(g2.color, true), count: g2.count + " nodes", paints: "Node fill", go: ["inspector-group-set-path-row", "style"] },
                { name: "Group 8", icon: "circle-dot", swatch: AB.chit(g8.color, true), count: g8.count + " nodes", paints: "Node fill", go: ["inspector-group-set-path-row", "style"] },
                { name: "Valjean to Javert", icon: "route", swatch: AB.chit("#D55E00"), count: null, paints: "Path color", go: ["inspector-group-set-path-row", "path"] },
                { name: "Betweenness", icon: "chart-column", swatch: AB.ramp(), count: L.nodes + " nodes", paints: "Node color", go: ["inspector-measure-row", "style"] },
            ];
            const more = AB.iconButton("ellipsis", "Folder actions", { go: ["context-menus", "folder"] });

            const style = () => [
                h("div", { class: "ab-pad k-secondary" }, "A folder has no look of its own. Each row inside paints itself; select a row to change its look."),
                AB.section({ title: "Rows inside", count: rows.length },
                    rows.map((r) => AB.row({ icon: r.icon, swatch: r.swatch, label: r.name, trail: r.paints, go: r.go }))),
                AB.section("Paint order",
                    h("div", { class: "ab-pad k-secondary" }, "The rows stay together in the tree, so dragging the folder moves them as one block. Higher rows win."),
                    h("div", { class: "ab-folder-line" }, link("graph-place", "at-rest", "Show in the tree"))),
                AB.section("All rows at once",
                    h("div", { class: "ab-pad k-secondary" }, "To change a property on every row inside, select them together."),
                    h("div", { class: "ab-pad" }, AB.button("Select rows inside", { kind: "secondary", icon: "layers", go: ["inspector-several-rows", "style"] })),
                    h("div", { class: "ab-folder-line k-secondary" }, "An eye on the folder row", oq("Does a folder row carry an eye that hides every row inside at once, and does Alt-click solo the folder?"))),
            ];

            const dataTab = () => [
                AB.section({ title: "Rows inside", count: rows.length },
                    rows.map((r) => AB.row({ icon: r.icon, swatch: r.swatch, label: r.name, trail: r.count == null ? null : r.count, go: r.go })),
                    h("div", { class: "ab-pad" }, AB.button("Compare rows inside...", { kind: "ghost", go: ["inspector-several-rows", "data"] }))),
                AB.section("About",
                    AB.data("Kind", "Folder"),
                    AB.data("Holds", "Rows put here by hand"),
                    AB.data("Where", "Graph: " + L.frame.graphRow, { go: ["graph-place", "at-rest"] }),
                    h("div", { class: "ab-folder-line k-secondary" }, "Combined member count", oq("Should a folder show how many distinct nodes its rows cover together? Rows overlap, so it is not the sum."))),
                AB.section({ title: "Notes", count: 0, actions: AB.iconButton("plus", "Add note", { go: ["notes-place", "all"] }) },
                    h("div", { class: "ab-pad k-secondary" }, "No notes about this folder yet. Notes about the rows inside are on each row.")),
            ];

            el.append(AB.inspector({
                icon: "folder-open",
                title: "For the report",
                kind: "Folder",
                kindKey: "folder",
                meta: h("span", { class: "ab-folder-meta" }, rows.length + " rows, in " + L.frame.graphRow + " ", more),
                tab: state === "data" ? "Data" : "Style",
                tabs: { Style: style, Data: dataTab },
            }));
        },
    });
})();
