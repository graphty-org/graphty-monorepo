/* Inspector: several rows. Two tree rows selected together: the kept set "Group 8" (in the folder
   "For the report") and the set "Top 9 by degree". The Style tab is the one shared Style tab: only
   what both rows set is listed, a differing value reads "Mixed" with both swatches, and a value
   opens its property's popover. Data is Summary side by side with short column headers. Combine and
   Compare are verbs, so they live in the "..." menu (context-menus/row), never in the body. A
   Combine result is a new set row on top of the tree, shown in the set row's frame; it sets no style
   (styling is left to the user). The left panel is the shared AB.tree with the Graph place's rows.
   Every number is computed from kit/fixtures.json (Les Miserables). Plain ASCII. */
(function () {
    "use strict";
    const { h } = window;

    if (!document.getElementById("isr-style")) {
        document.head.append(h("style", { id: "isr-style" }, [
            ".isr-tbl { width:calc(100% - 32px); margin:4px 16px 8px; border-collapse:collapse; font-size:11px; table-layout:fixed; }",
            ".isr-tbl th, .isr-tbl td { padding:3px 2px; border-bottom:1px solid var(--cm-border); text-align:right; font-weight:normal; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }",
            ".isr-tbl th:first-child, .isr-tbl td:first-child { text-align:left; color:var(--cm-text-secondary); width:30%; }",
            ".isr-tbl thead th { color:var(--cm-text-secondary); }",
            ".isr-tbl thead .ab-link { display:inline-flex; align-items:center; gap:3px; }",
        ].join("\n")));
    }

    // ---------- the two rows, from the fixtures ----------
    const SET_COLOR = "#F0E442";
    function model() {
        const L = AB.fx.datasets.lesmis;
        const g8 = L.rows.filter((r) => String(r.group) === "8");
        const byDeg = [...L.rows].sort((a, b) => b.degree - a.degree);
        const cut = byDeg[8].degree; // 10th place ties with 11th, so the kept set is the top 9
        const top = byDeg.filter((r) => r.degree >= cut);
        const A = { name: "Group 8", short: "Gr 8", color: L.groupColors["8"], members: g8, go: ["inspector-group-set-path-row", "kept-8"] };
        const B = { name: "Top " + top.length + " by degree", short: "Top " + top.length, color: SET_COLOR, members: top, go: ["inspector-group-set-path-row", "style"] };
        const inA = new Set(A.members.map((r) => r.id)), inB = new Set(B.members.map((r) => r.id));
        const both = L.rows.filter((r) => inA.has(r.id) && inB.has(r.id));
        const onlyA = A.members.filter((r) => !inB.has(r.id));
        const onlyB = B.members.filter((r) => !inA.has(r.id));
        return { L, A, B, both, onlyA, onlyB, cut };
    }

    // Combine: the four operations, their result names and members (Subtract takes the second from the first)
    function ops(m) {
        return {
            union: { label: "Union", desc: "In either row", name: m.A.name + " or " + m.B.name, members: [...m.onlyA, ...m.both, ...m.onlyB] },
            intersect: { label: "Intersect", desc: "In both rows", name: m.A.name + " and " + m.B.name, members: m.both },
            subtract: { label: "Subtract", desc: "In " + m.A.name + ", not in " + m.B.name, name: m.A.name + " without " + m.B.name, members: m.onlyA },
            exclude: { label: "Exclude", desc: "In one row but not both", name: m.A.name + " or " + m.B.name + ", not both", members: [...m.onlyA, ...m.onlyB] },
        };
    }

    const mean = (rs, k) => rs.reduce((s, r) => s + r[k], 0) / rs.length;
    const fix = (n, d) => (Math.round(n * 10 ** d) / 10 ** d).toString();
    const range = (rs, k) => { if (!rs.length) return "--"; const v = rs.map((r) => r[k]); const lo = Math.min(...v), hi = Math.max(...v); return lo === hi ? String(lo) : lo + "-" + hi; };
    const byDegree = (rs) => [...rs].sort((a, b) => b.degree - a.degree);
    const nodes = (n) => n + (n === 1 ? " node" : " nodes");

    // ---------- Style: the one Style tab; "Mixed" with both swatches where the rows differ ----------
    function styleTab(m) {
        const all = m.onlyA.length + m.both.length + m.onlyB.length;
        return AB.styleTab({
            kinds: ["node", "edge"],
            kind: "node",
            paints: ["Paints " + all + " nodes", ["inspector-several-elements", "style"]],
            order: m.both.length ? m.B.name + " is higher, so it wins on the " + nodes(m.both.length) + " in both" : null,
            mixed: { "node.color": [m.A.color, m.B.color] },
        });
    }

    // ---------- Data: Summary side by side, short headers ----------
    function dataTab(m) {
        const n = m.L.nodes;
        const cols = [m.A.members, m.B.members, m.both];
        const tr = (label, full, f) => h("tr", null, h("td", null, full ? AB.tip(h("span", { tabindex: "0" }, label), full, { label: false }) : label), cols.map((rs) => h("td", { class: "k-num" }, rs.length ? f(rs) : "--")));
        const head = (r) => h("th", null, AB.tip(AB.link(r.go[0], r.go[1], [AB.chit(r.color, true), r.short]), r.name, { label: false }));
        const count = (rs) => AB.link("inspector-several-elements", "style", String(rs.length));
        const table = h("table", { class: "isr-tbl" },
            h("thead", null, h("tr", null, h("th", null, ""), head(m.A), head(m.B), h("th", null, AB.tip(h("span", { tabindex: "0" }, "Both"), "In both rows: " + byDegree(m.both).map((r) => r.label).join(", "), { label: false })))),
            h("tbody", null,
                tr("Nodes", null, count),
                tr("Share", "Share of all " + n + " nodes", (rs) => Math.round((rs.length / n) * 100) + "%"),
                tr("Degree", "Degree, lowest to highest", (rs) => range(rs, "degree")),
                tr("Avg deg.", "Mean degree", (rs) => fix(mean(rs, "degree"), 1)),
                tr("Avg betw.", "Mean betweenness", (rs) => fix(mean(rs, "betweenness"), 3))));
        return AB.dataTab({
            Summary: [table, h("div", { class: "ab-cap k-secondary" }, AB.openQuestion("Do edge counts inside and between the rows belong here, or only in Compare with...?"))],
        }, { kind: "several-rows" });
    }

    // ---------- the result: the new set row, in the set row's own frame ----------
    function resultData(m, op) {
        const top = byDegree(op.members).slice(0, 10);
        return AB.dataTab({
            Summary: [
                AB.data("Nodes", op.members.length + " of " + m.L.nodes),
                AB.data("Share", Math.round((op.members.length / m.L.nodes) * 100) + "%"),
                AB.data("Degree", range(op.members, "degree"))],
            Members: [
                top.map((r) => AB.row({ label: r.label, trail: "degree " + r.degree, go: ["inspector-node", r.label === "Valjean" ? "why-this-look" : "data"] })),
                op.members.length > 10 ? h("div", { class: "ab-cap k-secondary" }, "and " + (op.members.length - 10) + " more in the table.") : null],
            "Made with": [
                AB.data("By", "Combine > " + op.label + " (" + op.desc.toLowerCase() + ")"),
                AB.data("From", AB.link(m.A.go[0], m.A.go[1], m.A.name)),
                AB.data("", AB.link(m.B.go[0], m.B.go[1], m.B.name)),
                AB.data("Data", m.L.file + ", all " + m.L.nodes + " nodes"),
                h("div", { class: "ab-cap k-secondary" }, "A set keeps its members; it does not follow later changes to its inputs. ", AB.openQuestion("Should a combined set follow its inputs, like a rule set?"))],
            Notes: { count: 0 },
        }, { kind: "set" });
    }

    // ---------- the left panel: the shared tree, the Graph place's rows, these two selected ----------
    function drawTree(el, m, state) {
        const L = m.L;
        const resultId = state.startsWith("result-") ? state.slice(7) : null;
        const g2 = L.frame.legend.rows.find((r) => r.label === "2");
        const rowMenu = ["context-menus", "row"];
        const rows = [
            { id: "selection", name: "Selection", kindIcon: "scan", pinned: true, builtin: true, eye: true, go: ["inspector-selection-and-everything", "selection"], menu: rowMenu },
            { id: "notes", name: "Notes", kindIcon: AB.ICON.note, builtin: true, count: "2", eye: true, go: ["inspector-selection-and-everything", "notes-row"], menu: ["context-menus", "notes-row"] },
        ];
        if (resultId) {
            const op = ops(m)[resultId];
            rows.push({ id: "result", name: op.name, kindIcon: AB.ICON.set, count: op.members.length, eye: true, selected: true, go: ["inspector-several-rows", state], menu: rowMenu });
        }
        rows.push(
            { id: "pagerank", name: "PageRank", kindIcon: "chart-column", swatch: AB.ramp("#ef7818", "#662506"), eye: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
            { id: "louvain", name: "Louvain", kindIcon: "layers", swatch: AB.chit("#E69F00", true), notesInside: 2, eye: true, renameDisabled: "a run's name is its label, which graphty-element keeps read-only", go: ["inspector-run-row", "style"], menu: ["context-menus", "run-row"],
                children: [{ id: "c1", name: "Community 1", kindIcon: "circle-dot", swatch: AB.chit("#E69F00", true), count: 25, eye: true, go: ["inspector-group-set-path-row", "community-1"], menu: rowMenu }] },
            { id: "top", name: m.B.name, kindIcon: AB.ICON.set, swatch: AB.chit(m.B.color, true), count: m.B.members.length, eye: true, selected: !resultId, go: m.B.go, menu: rowMenu },
            { id: "watchlist", name: "Watchlist", kindIcon: AB.ICON.set, swatch: AB.chit("#CC79A7", true), count: 5, eye: true, locked: true, go: ["inspector-group-set-path-row", "watchlist"], menu: rowMenu },
            { id: "folder", name: "For the report", kindIcon: "folder-open", eye: true, open: true, go: ["inspector-folder", "folder"], menu: ["context-menus", "folder"],
                children: [
                    { id: "g2", name: "Group 2", kindIcon: AB.ICON.set, swatch: AB.chit(g2.color, true), count: g2.count, eye: true, go: ["inspector-group-set-path-row", "kept-2"], menu: rowMenu },
                    { id: "g8", name: m.A.name, kindIcon: AB.ICON.set, swatch: AB.chit(m.A.color, true), count: m.A.members.length, eye: true, selected: !resultId, go: m.A.go, menu: rowMenu },
                ] },
            { id: "everything", name: "Everything", kindIcon: "base-layer", swatch: AB.chit("#6366F1"), pinned: true, builtin: true, eye: true, go: ["inspector-selection-and-everything", "everything"], menu: rowMenu },
        );
        el.append(
            AB.graphHead("Graph", AB.fx.datasets.lesmis.frame.graphRow, { notes: 1 }),
            AB.treebar({ menuGo: ["graph-place", "list-menu"] }),
            h("div", { class: "k-scroll" },
                AB.tree(rows, { label: "Paint order, top wins" }),
                resultId ? null : AB.treeFooter("2 rows selected. Shift-click or Ctrl-click adds a row; Esc clears.")),
        );
        if (resultId) el.append(AB.notice("Added on top of the tree. Its two inputs are unchanged.", { label: "Undo", go: ["inspector-several-rows", "style"] }));
    }

    const RESULTS = [
        { id: "result-intersect", label: "Result: Intersect (from ... > Combine) makes a new set row on top" },
        { id: "result-union", label: "Result: Union" },
        { id: "result-subtract", label: "Result: Subtract" },
        { id: "result-exclude", label: "Result: Exclude" },
    ];

    registerSection({
        id: "inspector-several-rows",
        title: "Inspector: several rows",
        region: "right",
        rail: "graph",
        closeTo: "graph-place",
        states: [{ id: "style", label: "Style tab: shared properties" }, { id: "data", label: "Data tab: Summary side by side" }, ...RESULTS],
        frame: (state) => ({ left: "inspector-several-rows/" + state }),
        render(el, state, ctx) {
            const m = model();
            if (ctx.region === "left") return drawTree(el, m, state);
            if (state.startsWith("result-")) {
                const op = ops(m)[state.slice(7)];
                el.append(AB.inspector({
                    icon: AB.ICON.set, title: op.name, kind: "Set",
                    provenance: ["from " + op.label, "inspector-several-rows", "style"],
                    menu: ["context-menus", "row"],
                    onRename: (name) => AB.flash("Renamed to " + name + " (not wired in the skeleton)"),
                    kindKey: "isr-result",
                    tab: "Data",
                    tabs: {
                        // A new set sets nothing: its members look as the rows beneath paint them
                        Style: () => AB.styleTab({ kinds: ["node", "edge"], set: {}, paints: "Paints nothing yet: add a property with +" }),
                        Data: () => resultData(m, op),
                    },
                }));
                return;
            }
            el.append(AB.inspector({
                icon: "layers",
                title: "2 rows",
                kind: "Rows",
                renameDisabled: "Two rows have no shared name. Rename each in the tree.",
                kindKey: "several-rows",
                menu: ["context-menus", "row"],
                tab: state === "style" ? "Style" : "Data",
                tabs: { Style: () => styleTab(m), Data: () => dataTab(m) },
            }));
        },
    });
})();
