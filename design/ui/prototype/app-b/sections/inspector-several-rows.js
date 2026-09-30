/* Inspector: several rows. Two tree rows selected together: Group 8 (a child of the group run) and
   a kept set, "Top 9 by degree". Style lists only the properties both rows set, "Mixed" where they
   differ; Data shows their Summary side by side. Combine and Compare are verbs, so they live in the
   "..." menu (context-menus/row, Combine with selected rows > Union, Intersect, Subtract, Exclude),
   never in the body. A Combine result is a new set row, shown in the set row's frame; it sets no
   style (styling is left to the user). This section also draws the left panel's tree for its own
   states, so the tree shows the two rows selected and, after Combine, the new row on top.
   Every number is computed from kit/fixtures.json (Les Miserables). Plain ASCII. */
(function () {
    "use strict";
    const { h, icon, link } = window;

    if (!document.getElementById("isr-style")) {
        document.head.append(h("style", { id: "isr-style" }, [
            ".isr-oq { display:inline-flex; align-items:center; height:16px; padding:0 6px; margin-left:6px; border-radius:8px; font-size:10px; background:var(--cm-bg-secondary); color:var(--cm-text-secondary); outline:1px dashed var(--cm-border); outline-offset:-1px; white-space:nowrap; vertical-align:middle; }",
            ".isr-pair { display:flex; flex-wrap:wrap; gap:4px 12px; padding:4px 16px 8px; }",
            ".isr-pair .ab-link, .isr-in { display:inline-flex; align-items:center; gap:4px; }",
            ".isr-tbl { width:calc(100% - 32px); margin:4px 16px 8px; border-collapse:collapse; font-size:12px; }",
            ".isr-tbl th, .isr-tbl td { padding:3px 4px; border-bottom:1px solid var(--cm-border); text-align:right; font-weight:normal; }",
            ".isr-tbl th:first-child, .isr-tbl td:first-child { text-align:left; color:var(--cm-text-secondary); }",
            ".isr-tbl thead th { color:var(--cm-text-secondary); vertical-align:bottom; white-space:nowrap; }",
            ".isr-tbl td { white-space:nowrap; } .isr-tbl td:first-child { white-space:normal; }",
            ".isr-toast { position:fixed; left:50%; bottom:88px; transform:translateX(-50%); z-index:5; }",
            ".isr-hollow { display:inline-block; width:10px; height:10px; border-radius:50%; outline:1.5px dashed var(--cm-text-secondary); outline-offset:-1.5px; flex:none; }",
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
    const reversed = false; // Subtract takes the second selected row from the first
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

    // ---------- Style: only the properties both rows set, "Mixed" where they differ ----------
    // Lines use the one Style tab's line look (ab-sline). A value opens its picker; a change
    // applies to each selected row.
    function styleTab(m) {
        const mixed = (swatches, target) => h("span", Object.assign({ class: "k-field ab-sv", role: "button" }, AB.act({ go: ["style-pickers", target] })),
            swatches, h("span", { class: "k-grow k-ellipsis" }, "Mixed"));
        const line = (name, value) => h("div", { class: "ab-sline" }, h("span", { class: "ab-sname" }, name), value,
            AB.iconButton("database", "Bind " + name + " for both rows", { go: ["style-pickers", "bind"] }),
            AB.iconButton("minus", "Remove " + name + " from both rows", { onClick: () => AB.flash(name + " removed from both rows (not wired in the skeleton)") }));
        return [
            h("div", { class: "isr-pair" }, rowLink(m.A), rowLink(m.B)),
            AB.section({ title: "Fill", count: 2, countLabel: "2 properties", collapsible: true, key: "isr-fill", summary: "Color Mixed . Opacity Mixed" },
                line("Color", mixed([AB.chit(m.A.color, true), AB.chit(m.B.color, true)], "color")),
                line("Opacity", mixed(null, "token-edit"))),
            AB.section({ title: "Line", collapsed: true, actions: AB.iconButton("plus", "Add to Line, on both rows", { go: ["style-pickers", "plus-menu"] }) }),
            h("div", { class: "ab-cap k-secondary", title: "Only properties both rows set are listed. Mixed means the rows differ; a new value applies to both. Where their members overlap, the higher row in the tree wins." }, "Shared properties only; a change applies to both"),
        ];
    }

    // ---------- Data: Summary side by side ----------
    function dataTab(m) {
        const n = m.L.nodes;
        const stat = (label, f) => h("tr", null, h("td", null, label), h("td", null, f(m.A.members)), h("td", null, f(m.B.members)), h("td", null, f(m.both)));
        const count = (rs) => link("inspector-several-elements", "style", String(rs.length), { title: "Select these " + rs.length + " nodes" });
        return [
            h("div", { class: "isr-pair" }, rowLink(m.A), rowLink(m.B)),
            AB.section("Summary",
                h("table", { class: "isr-tbl" },
                    h("thead", null, h("tr", null, h("th", null, ""), h("th", { title: m.A.name }, m.A.name), h("th", { title: m.B.name }, m.B.name.replace(" by degree", "")), h("th", null, "In both"))),
                    h("tbody", null,
                        stat("Nodes", count),
                        stat("Share of graph", (rs) => Math.round((rs.length / n) * 100) + "%"),
                        stat("Degree", (rs) => range(rs, "degree")),
                        stat("Mean degree", (rs) => rs.length ? fix(mean(rs, "degree"), 1) : "--"),
                        stat("Mean betweenness", (rs) => rs.length ? fix(mean(rs, "betweenness"), 3) : "--"),
                    )),
                h("div", { class: "ab-cap k-secondary" }, "In both: " + byDegree(m.both).map((r) => r.label).join(", ") + ". Shares are of all " + n + " nodes.",
                    oq("do edge counts inside and between the rows belong here, or only in Compare with...?"))),
        ];
    }

    // ---------- the result: the new set row, in the set row's own frame ----------
    function resultData(m, op) {
        const top = byDegree(op.members).slice(0, 10);
        return [
            AB.section("Summary",
                AB.data("Nodes", op.members.length + " of " + m.L.nodes),
                AB.data("Share of graph", Math.round((op.members.length / m.L.nodes) * 100) + "%"),
                AB.data("Degree", range(op.members, "degree"))),
            AB.section({ title: "Members", count: op.members.length },
                h("div", { class: "ab-cap k-secondary" }, op.members.length > 10 ? "The top 10 by degree." : "By degree."),
                top.map((r) => AB.row({ label: r.label, trail: "degree " + r.degree, go: ["inspector-node", r.label === "Valjean" ? "why-this-look" : "data"] })),
                op.members.length > 10 ? h("div", { class: "ab-cap k-secondary" }, "and " + (op.members.length - 10) + " more in the table.") : null),
            AB.section("Made with",
                AB.data("Made by", op.label, { title: op.desc }),
                AB.data("From", h("span", { class: "isr-pair", style: "padding:0" }, rowLink(m.A), rowLink(m.B))),
                AB.data("Data", m.L.file + ", all " + m.L.nodes + " nodes"),
                h("div", { class: "ab-cap k-secondary" }, "A set keeps its members. It does not follow later changes to the rows it came from.", oq("should a combined set follow its inputs, like a rule set?"))),
            AB.notesSection(0),
        ];
    }

    // ---------- the left panel: the tree with this section's selection ----------
    function drawTree(el, m, state) {
        const L = m.L;
        const resultId = state.startsWith("result-") ? state.slice(7) : null;
        const tree = h("div", { class: "ab-treebar" });
        const groups = L.frame.legend.rows.map((g) => ({ name: "Group " + g.label, kindIcon: "circle-dot", swatch: AB.chit(g.color, true), count: g.count, eye: true, selected: !resultId && g.label === "8", go: g.label === "8" ? ["inspector-several-rows", "style"] : ["inspector-group-set-path-row", "group-" + g.label], menu: ["context-menus", "row"] }));
        groups.push({ name: L.frame.legend.other.title, kindIcon: "circle-dot", swatch: AB.chit(L.frame.legend.other.color, true), count: L.frame.legend.other.count, eye: true, go: ["inspector-group-set-path-row", "other"], menu: ["context-menus", "row"] });
        const rows = [
            { name: "Selection", kindIcon: "scan", pinned: true, builtin: true, count: "Nothing selected", eye: true, go: ["inspector-selection-and-everything", "selection"] },
            { name: "Notes", kindIcon: "message-square", pinned: true, builtin: true, count: "2 nodes", eye: true, go: ["inspector-selection-and-everything", "notes"], menu: ["context-menus", "notes-row"] },
        ];
        if (resultId) {
            const op = ops(m)[resultId];
            rows.push({ name: op.name, kindIcon: "bookmark", swatch: h("span", { class: "isr-hollow" }), count: op.members.length, eye: true, selected: true, go: ["inspector-several-rows", state], menu: ["context-menus", "row"] });
        }
        rows.push(
            { name: m.B.name, kindIcon: "bookmark", swatch: AB.chit(m.B.color, true), count: m.B.members.length, eye: true, selected: !resultId, go: ["inspector-several-rows", "style"], menu: ["context-menus", "row"] },
            { name: "Betweenness", kindIcon: "chart-column", swatch: AB.ramp(), eye: false, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
            { name: "Degree", kindIcon: "hash", swatch: AB.ramp("#cfcfcf", "#4d4d4d"), eye: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
            { name: "group", kindIcon: h("span", { class: "ab-abc" }, "Abc"), swatch: h("span", { class: "ab-multi" }, L.frame.legend.rows.slice(0, 3).map((g) => AB.chit(g.color, true))), count: "10 groups", eye: true, open: true, children: groups, go: ["inspector-run-row", "style"], menu: ["context-menus", "run-row"] },
            { name: "Everything", kindIcon: "square-filled", pinned: true, builtin: true, eye: true, go: ["inspector-selection-and-everything", "everything"], menu: ["context-menus", "row"] },
        );
        tree.append(AB.field("Find rows", { icon: "search", go: ["commands-and-search", "find"] }), AB.iconButton("list-filter", "List options", { go: ["graph-place", "list-menu"] }));
        el.append(
            AB.placeHead("Graph"),
            h("div", { class: "ab-switcher" }, h("span", Object.assign({ class: "ab-switch-btn", role: "button" }, AB.act({ go: ["graphs-switcher", "open"] })), icon("network"), h("span", { class: "k-ellipsis" }, L.frame.graphRow), icon("chevron-down", "sm")), h("span", { class: "k-grow" }), h("span", { class: "k-secondary k-num" }, L.nodes + " nodes")),
            tree,
            h("div", { class: "k-scroll" },
                AB.tree(rows),
                resultId ? null : h("div", { class: "ab-cap k-secondary" }, "2 rows selected. Shift-click or Mod-click to add a row; Esc to clear.")),
            ...(resultId ? [h("div", { class: "isr-toast", role: "status" }, AB.notice("Added on top of the tree. Its two inputs are unchanged.", { label: "Undo", go: ["inspector-several-rows", "data"] }))] : []),
        );
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
                    icon: "bookmark", title: op.name, kind: "Set",
                    provenance: ["from " + op.label + ", just now", "inspector-several-rows", "data"],
                    menu: ["context-menus", "row"],
                    onRename: (name) => AB.flash("Renamed to " + name + " (not wired in the skeleton)"),
                    kindKey: "isr-result",
                    tab: "Data",
                    tabs: {
                        // A new set sets nothing: styling is left to the user. Its members show
                        // what the rows beneath paint until a property is added with "+".
                        Style: () => [AB.styleTab({ kinds: ["node", "edge"], set: {} }), h("div", { class: "ab-cap k-secondary" }, "This set sets no style yet, so its members look as the rows beneath paint them. Add a property with +.")],
                        Data: () => resultData(m, op),
                    },
                }));
                return;
            }
            el.append(AB.inspector({
                icon: "layers",
                title: "2 rows",
                kind: "Rows",
                kindKey: "several-rows-" + state,
                meta: m.A.name + " (" + m.A.from + "), " + m.B.name + " (" + m.B.from + ")",
                menu: ["context-menus", "row"],
                tab: state === "style" ? "Style" : "Data",
                tabs: { Style: () => styleTab(m), Data: () => dataTab(m) },
            }));
        },
    });
})();
