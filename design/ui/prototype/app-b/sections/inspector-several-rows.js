/* Inspector: several rows. Two tree rows selected together: Group 8 (a child of the group run) and
   a kept set, "Top 9 by degree". Style shows only the properties both rows set; Data shows their
   overlap and statistics side by side, Compare with..., and Combine. Combine makes a new set row on
   top of the tree. This section also draws the left panel's tree for its own states, because the
   tree must show the two rows selected and, after Combine, the new row on top.
   Every number is computed from kit/fixtures.json (Les Miserables). Plain ASCII. */
(function () {
    "use strict";
    const { h, icon, link } = window;

    if (!document.getElementById("isr-style")) {
        document.head.append(h("style", { id: "isr-style" }, [
            ".isr-oq { display:inline-flex; align-items:center; height:16px; padding:0 6px; margin-left:6px; border-radius:8px; font-size:10px; background:var(--cm-bg-secondary); color:var(--cm-text-secondary); outline:1px dashed var(--cm-border); outline-offset:-1px; white-space:nowrap; vertical-align:middle; }",
            ".isr-pair { display:flex; flex-wrap:wrap; gap:4px 12px; padding:4px 16px 8px; }",
            ".isr-pair .ab-link, .isr-in { display:inline-flex; align-items:center; gap:4px; }",
            ".isr-props { display:grid; grid-template-columns:84px 1fr; gap:6px 8px; padding:4px 16px 8px; align-items:center; }",
            ".isr-props .k-name { color:var(--cm-text-secondary); }",
            ".isr-mixed { display:inline-flex; align-items:center; gap:4px; }",
            ".isr-venn { display:flex; height:14px; margin:4px 16px 4px; border-radius:3px; overflow:hidden; outline:1px solid var(--cm-border); outline-offset:-1px; }",
            ".isr-venn span { display:block; height:100%; }",
            ".isr-vkey { display:grid; grid-template-columns:auto 1fr auto; gap:2px 8px; padding:2px 16px 8px; align-items:start; }",
            ".isr-vkey .k-num { text-align:right; }",
            ".isr-names { grid-column:2 / 4; font-size:11px; color:var(--cm-text-secondary); margin-bottom:4px; }",
            ".isr-tbl { width:calc(100% - 32px); margin:4px 16px 8px; border-collapse:collapse; font-size:12px; }",
            ".isr-tbl th, .isr-tbl td { padding:3px 4px; border-bottom:1px solid var(--cm-border); text-align:right; font-weight:normal; }",
            ".isr-tbl th:first-child, .isr-tbl td:first-child { text-align:left; color:var(--cm-text-secondary); }",
            ".isr-tbl thead th { color:var(--cm-text-secondary); vertical-align:bottom; white-space:nowrap; }",
            ".isr-tbl td { white-space:nowrap; } .isr-tbl td:first-child { white-space:normal; }",
            ".isr-ops { display:grid; grid-template-columns:minmax(0,1fr); gap:6px; padding:4px 16px 8px; }",
            ".isr-op { min-width:0; display:flex; flex-direction:column; gap:2px; padding:8px; border-radius:6px; outline:1px solid var(--cm-border); outline-offset:-1px; cursor:pointer; background:var(--cm-bg); color:var(--cm-text); }",
            ".isr-op:hover, .isr-op:focus-visible { background:var(--cm-bg-secondary); }",
            ".isr-op-head { display:flex; align-items:center; gap:6px; }",
            ".isr-op-head .k-grow { font-weight:600; } .isr-op-head .k-num { white-space:nowrap; }",
            ".isr-op small { color:var(--cm-text-secondary); font-size:11px; line-height:1.3; }",
            ".isr-order { padding:0 16px 8px; line-height:1.8; }",
            ".isr-actions { display:flex; flex-wrap:wrap; gap:8px; padding:4px 16px 8px; }",
            ".isr-hollow { display:inline-block; width:10px; height:10px; border-radius:50%; outline:1.5px dashed var(--cm-text-secondary); outline-offset:-1.5px; flex:none; }",
            ".isr-done { display:flex; align-items:center; gap:8px; margin:8px 16px; padding:8px 10px; border-radius:6px; background:var(--cm-bg-secondary); }",
            ".isr-members { padding:2px 16px 8px; line-height:1.6; }",
        ].join("\n")));
    }

    const oq = (text) => h("span", { class: "isr-oq", title: "Open question: " + text }, "Open question");

    // ---------- the two rows, from the fixtures ----------
    const SET_COLOR = "#F0E442";
    function model() {
        const L = AB.fx.datasets.lesmis;
        const g8 = L.rows.filter((r) => String(r.group) === "8");
        const byDeg = [...L.rows].sort((a, b) => b.degree - a.degree);
        const cut = byDeg[8].degree; // the 10th place ties with the 11th, so the kept set is the top 9
        const top = byDeg.filter((r) => r.degree >= cut);
        const A = { name: "Group 8", kind: "Group", color: L.groupColors["8"], members: g8, go: ["inspector-group-set-path-row", "group-8"], from: "a group of the group run" };
        const B = { name: "Top " + top.length + " by degree", kind: "Set", color: SET_COLOR, members: top, go: ["inspector-group-set-path-row", "style"], from: "kept from Degree: degree " + cut + " or more" };
        const inA = new Set(A.members.map((r) => r.id)), inB = new Set(B.members.map((r) => r.id));
        const both = L.rows.filter((r) => inA.has(r.id) && inB.has(r.id));
        const onlyA = A.members.filter((r) => !inB.has(r.id));
        const onlyB = B.members.filter((r) => !inA.has(r.id));
        return { L, A, B, both, onlyA, onlyB, cut };
    }

    // Combine: the four operations, their result names and members.
    let reversed = false; // Subtract order, toggled in place by Swap
    function ops(m) {
        const [X, Y] = reversed ? [m.B, m.A] : [m.A, m.B];
        const minus = reversed ? m.onlyB : m.onlyA;
        return {
            union: { label: "Union", ic: "plus", desc: "In either row", name: m.A.name + " or " + m.B.name, members: [...m.onlyA, ...m.both, ...m.onlyB] },
            intersect: { label: "Intersect", ic: "target", desc: "In both rows", name: m.A.name + " and " + m.B.name, members: m.both },
            subtract: { label: "Subtract", ic: "minus", desc: "In " + X.name + ", not in " + Y.name, name: X.name + " without " + Y.name, members: minus },
            exclude: { label: "Exclude", ic: "split", desc: "In one row but not both", name: m.A.name + " or " + m.B.name + ", not both", members: [...m.onlyA, ...m.onlyB] },
        };
    }

    const mean = (rs, k) => rs.length ? rs.reduce((s, r) => s + r[k], 0) / rs.length : 0;
    const fix = (n, d) => (Math.round(n * 10 ** d) / 10 ** d).toString();
    const range = (rs, k) => { if (!rs.length) return "--"; const v = rs.map((r) => r[k]); const lo = Math.min(...v), hi = Math.max(...v); return lo === hi ? String(lo) : lo + "-" + hi; };
    const byDegree = (rs) => [...rs].sort((a, b) => b.degree - a.degree);
    const rowLink = (r) => link(r.go[0], r.go[1], h("span", { class: "isr-in" }, AB.chit(r.color, true), r.name));

    // ---------- Style: only the properties both rows set ----------
    function styleTab(m) {
        const prop = (name, value) => [h("span", { class: "k-name" }, name), value];
        const set = (what) => AB.field("Mixed", { caret: true, onClick: () => AB.flash(what + " for both rows (not wired in the skeleton)") });
        return [
            h("div", { class: "isr-pair" }, rowLink(m.A), rowLink(m.B)),
            AB.section("Shared properties",
                h("div", { class: "ab-cap k-secondary" }, "Only the properties both rows set are listed. A change here applies to each row."),
                h("div", { class: "isr-props" },
                    prop("Node color", h("span", { class: "isr-mixed" }, AB.chit(m.A.color, true), AB.chit(m.B.color, true), set("Node color"))),
                    prop("Opacity", set("Opacity")),
                ),
                h("div", { class: "ab-cap k-secondary" }, "Size comes from the Degree row and shape and label from Everything, so they are not listed. ",
                    link("inspector-measure-row", "style", "Degree"), ", ", link("inspector-selection-and-everything", "everything", "Everything"), "."),
            ),
            AB.section("Overlap",
                h("div", { class: "ab-cap" }, m.both.length + " of " + m.A.members.length + " members of " + m.A.name + " show " + m.B.name + "'s color, because " + m.B.name + " is higher in the tree."),
                h("div", { class: "isr-actions" },
                    AB.button("Move " + m.A.name + " above", { kind: "secondary", icon: "arrow-up-down", onClick: () => AB.flash(m.A.name + " moved above " + m.B.name + " (not wired in the skeleton)") }),
                    AB.button("Show in the tree", { kind: "ghost", go: ["graph-place", "at-rest"] }),
                ),
            ),
        ];
    }

    // ---------- Data: overlap and statistics side by side, Compare with..., Combine ----------
    function dataTab(m) {
        const n = m.L.nodes;
        const seg = (rs, color) => h("span", { style: `flex:${rs.length};background:${color}`, title: rs.length + " nodes" });
        const key = (swatch, label, rs) => [swatch, h("span", null, label), h("span", { class: "k-num" }, String(rs.length)), h("span", { class: "isr-names" }, byDegree(rs).map((r) => r.label).join(", "))];
        const stat = (label, f) => h("tr", null, h("td", null, label), h("td", null, f(m.A.members)), h("td", null, f(m.B.members)), h("td", null, f(m.both)));
        const o = ops(m);
        const opCard = (id) => {
            const op = o[id];
            return h("div", Object.assign({ class: "isr-op", role: "button", "aria-label": op.label + ": " + op.desc + ", " + op.members.length + " nodes" }, AB.act({ go: ["inspector-several-rows", "result-" + id] })),
                h("div", { class: "isr-op-head" }, icon(op.ic, "sm"), h("span", { class: "k-grow" }, op.label), h("span", { class: "k-num k-secondary" }, op.members.length + " nodes")),
                h("small", null, op.desc));
        };
        const orderLine = h("div", { class: "isr-order k-secondary" });
        const drawOrder = () => {
            const [X, Y] = reversed ? [m.B, m.A] : [m.A, m.B];
            orderLine.replaceChildren("Subtract takes ", h("b", null, Y.name), " from ", h("b", null, X.name), ".",
                AB.button("Swap", { kind: "ghost", icon: "arrow-up-down", onClick: () => { reversed = !reversed; const fresh = dataTab(m); body.replaceChildren(...fresh); } }));
        };
        drawOrder();
        const body = h("div");
        const kids = [
            h("div", { class: "isr-pair" }, rowLink(m.A), rowLink(m.B)),
            AB.section("Overlap",
                h("div", { class: "isr-venn", role: "img", "aria-label": m.onlyA.length + " only in " + m.A.name + ", " + m.both.length + " in both, " + m.onlyB.length + " only in " + m.B.name },
                    seg(m.onlyA, m.A.color), seg(m.both, "var(--cm-text-secondary)"), seg(m.onlyB, m.B.color)),
                h("div", { class: "isr-vkey" },
                    key(AB.chit(m.A.color, true), "Only " + m.A.name, m.onlyA),
                    key(AB.chit("#808080", true), "In both", m.both),
                    key(AB.chit(m.B.color, true), "Only " + m.B.name, m.onlyB)),
            ),
            AB.section("Statistics",
                h("table", { class: "isr-tbl" },
                    h("thead", null, h("tr", null, h("th", null, ""), h("th", { title: m.A.name }, m.A.name), h("th", { title: m.B.name }, m.B.name.replace(" by degree", "")), h("th", null, "Both"))),
                    h("tbody", null,
                        stat("Nodes", (rs) => String(rs.length)),
                        stat("Share of graph", (rs) => Math.round((rs.length / n) * 100) + "%"),
                        stat("Degree", (rs) => range(rs, "degree")),
                        stat("Mean degree", (rs) => rs.length ? fix(mean(rs, "degree"), 1) : "--"),
                        stat("Mean betweenness", (rs) => rs.length ? fix(mean(rs, "betweenness"), 3) : "--"),
                    )),
                h("div", { class: "ab-cap k-secondary" }, "Shares are of all " + n + " nodes. Edges inside and between the rows are not listed.", oq("do edge counts inside and between rows belong here, or only in Compare with...?")),
            ),
            AB.section("Compare",
                h("div", { class: "ab-cap k-secondary" }, "Put the two rows side by side on the canvas, member by member."),
                h("div", { class: "isr-actions" }, AB.button("Compare with...", { kind: "secondary", icon: "git-compare-arrows", go: ["full-canvas-modes", "comparison"] }))),
            AB.section("Combine",
                h("div", { class: "ab-cap k-secondary" }, "Makes a new set row on top of the tree. " + m.A.name + " and " + m.B.name + " stay as they are."),
                h("div", { class: "isr-ops" }, opCard("union"), opCard("intersect"), opCard("subtract"), opCard("exclude")),
                orderLine),
            h("div", { class: "isr-actions" },
                AB.button("Show members in table", { kind: "secondary", icon: "table", go: ["table-dock", "nodes"] }),
                AB.button("Select members", { kind: "ghost", icon: "scan", onClick: () => AB.flash((m.onlyA.length + m.both.length + m.onlyB.length) + " nodes selected on the canvas (not wired in the skeleton)") })),
        ];
        body.append(...kids);
        return [body];
    }

    // ---------- the result: the new set row ----------
    function resultBody(m, op, id) {
        const top = byDegree(op.members).slice(0, 10);
        return [
            h("div", { class: "isr-done" }, icon("circle-check"), h("span", { class: "k-grow" }, "Added on top of the tree. Its two inputs are unchanged."),
                AB.button("Undo", { kind: "ghost", icon: "undo-2", go: ["inspector-several-rows", "data"] })),
            AB.section("Summary",
                AB.data("Nodes", op.members.length + " of " + m.L.nodes),
                AB.data("Share of graph", Math.round((op.members.length / m.L.nodes) * 100) + "%"),
                AB.data("Degree", range(op.members, "degree")),
                AB.data("Color", h("span", { class: "isr-in" }, h("span", { class: "isr-hollow" }), "Not set yet", oq("what color a combined set gets when it lands")))),
            AB.section({ title: "Members", count: op.members.length },
                h("div", { class: "isr-members" }, top.map((r) => r.label).join(", "), op.members.length > 10 ? ", and " + (op.members.length - 10) + " more" : ""),
                h("div", { class: "ab-cap k-secondary" }, op.members.length > 10 ? "The top 10 by degree." : "By degree."),
                h("div", { class: "isr-actions" }, AB.button("Show members in table", { kind: "secondary", icon: "table", go: ["table-dock", "nodes"] }))),
            AB.section("Provenance",
                AB.data("Made by", op.label + " (" + op.desc.toLowerCase() + ")"),
                AB.data("From", h("span", { class: "isr-pair", style: "padding:0" }, rowLink(m.A), rowLink(m.B))),
                AB.data("Data", m.L.file + ", all " + m.L.nodes + " nodes"),
                h("div", { class: "ab-cap k-secondary" }, "A set keeps its members. It does not follow later changes to the rows it came from.", oq("should a combined set follow its inputs, like a rule set?"))),
            h("div", { class: "isr-actions" },
                AB.button("Open the set", { icon: "bookmark", go: ["inspector-group-set-path-row", "data"] }),
                AB.button("Rename", { kind: "ghost", icon: "pencil", onClick: () => AB.flash("Rename (not wired in the skeleton)") })),
        ];
    }

    // ---------- the left panel: the tree with this section's selection ----------
    function drawTree(el, m, state) {
        const L = m.L;
        const resultId = state.startsWith("result-") ? state.slice(7) : null;
        const tree = h("div", { class: "ab-treebar" });
        const groups = L.frame.legend.rows.map((g) => ({ name: "Group " + g.label, kindIcon: "circle-dot", swatch: AB.chit(g.color, true), count: g.count, eye: true, selected: !resultId && g.label === "8", go: g.label === "8" ? ["inspector-several-rows", "style"] : ["inspector-group-set-path-row", "group-" + g.label], menu: ["context-menus", "row"] }));
        groups.push({ name: L.frame.legend.other.title, kindIcon: "circle-dot", swatch: AB.chit(L.frame.legend.other.color, true), count: L.frame.legend.other.count, eye: true, go: ["inspector-group-set-path-row", "other"], menu: ["context-menus", "row"] });
        const rows = [{ name: "Selection", kindIcon: "scan", pinned: true, count: "Nothing selected", eye: true, go: ["inspector-selection-and-everything", "selection"] }];
        if (resultId) {
            const op = ops(m)[resultId];
            rows.push({ name: op.name, kindIcon: "bookmark", swatch: h("span", { class: "isr-hollow" }), count: op.members.length, eye: true, selected: true, go: ["inspector-several-rows", state], menu: ["context-menus", "row"] });
        }
        rows.push(
            { name: m.B.name, kindIcon: "bookmark", swatch: AB.chit(m.B.color, true), count: m.B.members.length, eye: true, selected: !resultId, go: ["inspector-several-rows", "style"], menu: ["context-menus", "row"] },
            { name: "Betweenness", kindIcon: "chart-column", swatch: AB.ramp(), eye: false, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
            { name: "Degree", kindIcon: "hash", swatch: AB.ramp("#cfcfcf", "#4d4d4d"), eye: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
            { name: "group", kindIcon: h("span", { class: "ab-abc" }, "Abc"), swatch: h("span", { class: "ab-multi" }, L.frame.legend.rows.slice(0, 3).map((g) => AB.chit(g.color, true))), count: "10 groups", eye: true, open: true, children: groups, go: ["inspector-run-row", "style"], menu: ["context-menus", "run-row"] },
            { name: "Everything", kindIcon: "square", pinned: true, eye: true, go: ["inspector-selection-and-everything", "everything"] },
        );
        tree.append(AB.field("Find rows", { icon: "search", go: ["commands-and-search", "find"] }), AB.iconButton("list-filter", "List options", { go: ["graph-place", "list-menu"] }), AB.iconButton("zap", "Analyze", { go: ["analyze-popover", "open"] }));
        el.append(
            AB.placeHead("Graph"),
            h("div", { class: "ab-switcher" }, h("span", Object.assign({ class: "ab-switch-btn", role: "button" }, AB.act({ go: ["graphs-switcher", "open"] })), icon("network"), h("span", { class: "k-ellipsis" }, L.frame.graphRow), icon("chevron-down", "sm")), h("span", { class: "k-grow" }), h("span", { class: "k-secondary k-num" }, L.nodes + " nodes")),
            tree,
            h("div", { class: "k-scroll" },
                AB.tree(rows),
                resultId ? null : h("div", { class: "ab-cap k-secondary" }, "2 rows selected. Shift-click or Mod-click to add a row; Esc to clear."),
                AB.section({ title: "Views", count: 0, collapsed: true, actions: AB.iconButton("plus", "Save view...", { go: ["zoom-and-view-menu", "2d"] }) })),
        );
    }

    const RESULTS = [
        { id: "result-intersect", label: "Result: Intersect makes a new set row on top" },
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
        states: [{ id: "style", label: "Style tab" }, { id: "data", label: "Data tab with Combine" }, ...RESULTS],
        frame: (state) => ({ left: "inspector-several-rows/" + state }),
        render(el, state, ctx) {
            const m = model();
            if (ctx.region === "left") return drawTree(el, m, state);
            if (state.startsWith("result-")) {
                const id = state.slice(7);
                const op = ops(m)[id];
                el.append(AB.inspector({
                    icon: "bookmark", title: op.name, kind: "Set",
                    meta: op.label + " of " + m.A.name + " and " + m.B.name,
                    body: resultBody(m, op, id),
                }));
                return;
            }
            el.append(AB.inspector({
                icon: "layers",
                title: "2 rows",
                kind: "Rows",
                kindKey: "several-rows-" + state,
                meta: m.A.name + " (" + m.A.from + "), " + m.B.name + " (" + m.B.from + ")",
                tab: state === "style" ? "Style" : "Data",
                tabs: { Style: () => styleTab(m), Data: () => dataTab(m) },
            }));
        },
    });
})();
