/* Inspector: a folder. One body, no tab strip: a folder has no look of its own, so it has no
   Style tab. The body lists the rows inside (swatch, name, count; the name opens that row, the
   count selects its members), a short About, and Notes. No verbs: Rename, Ungroup, Lock, Hide
   from list and Delete are in "...", the folder's context menu.
   The folder "For the report" holds the same three rows as the Graph tree: Group 2 (kept), Group 8 (kept) and
   Betweenness (its eye is off in the tree).
   State "folder"; "style" and "data" (the version 1 tab states) are aliases that draw the same body.
   Plain ASCII. */
(function () {
    const oq = (text) => h("span", { class: "k-badge ab-oq", title: text, tabindex: "0", "aria-label": "Open question: " + text }, "Open question");
    if (!document.getElementById("ab-folder-css")) {
        document.head.append(h("style", { id: "ab-folder-css" },
            ".ab-oq{margin-left:6px;font-size:10px;color:var(--cm-text-secondary);white-space:nowrap}" +
            ".ab-folder-hidden{display:inline-flex;align-items:center;color:var(--cm-text-secondary)}" +
            ".ab-folder-row .k-grow{min-width:0}"));
    }

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
            // The rows inside, in paint order (the tree read top to bottom)
            const rows = [
                { name: "Group 2 (kept)", icon: "circle-check", swatch: AB.chit(g2.color, true), count: g2.count, go: ["inspector-group-set-path-row", "kept-2"] },
                { name: "Group 8 (kept)", icon: "circle-check", swatch: AB.chit(g8.color, true), count: g8.count, go: ["inspector-group-set-path-row", "kept-8"] },
                { name: "Betweenness", icon: "chart-column", swatch: AB.ramp(), count: L.nodes, hidden: true, go: ["inspector-measure-row", "style"] },
            ];
            // A count is a link that selects what it counts (it does not open the row)
            const countLink = (n) => link("inspector-several-elements", "style", n + " nodes", {
                class: "ab-link k-num", title: "Select these " + n + " nodes",
                on: { click: (e) => e.stopPropagation() },
            });
            const line = (r) => h("div", Object.assign({ class: "k-row ab-folder-row" }, AB.act({ go: r.go })),
                icon(r.icon), r.swatch, h("span", { class: "k-grow k-ellipsis" }, r.name),
                r.hidden ? h("span", { class: "ab-folder-hidden", title: "Eye off in the tree: not painting", "aria-label": "hidden on the canvas" }, icon("eye-off", "sm")) : null,
                countLink(r.count));

            const body = () => [
                AB.section({ title: "Rows inside", count: rows.length, collapsible: true, key: "folder-rows", summary: rows.map((r) => r.name).join(", ") },
                    rows.map(line)),
                AB.section({ title: "About", collapsible: true, key: "folder-about", summary: "Folder in " + L.frame.graphRow },
                    AB.data("Graph", L.frame.graphRow, { go: ["graph-place", "at-rest"] }),
                    AB.data("Order", "Below Watchlist", { go: ["graph-place", "at-rest"] }),
                    AB.data("Own look", h("span", { title: "A folder paints nothing; each row inside paints itself" }, "None")),
                    AB.data("Covers", h("span", null, "--", oq("Show how many distinct nodes the rows cover together? Rows overlap, so it is not the sum of the counts.")))),
                AB.notesSection(0),
            ];

            el.append(AB.inspector({
                icon: "folder-open",
                title: "For the report",
                kind: "Folder",
                kindKey: "folder",
                menu: ["context-menus", "folder"],
                body: body(),
            }));
        },
    });
})();
