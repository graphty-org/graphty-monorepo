/* Inspector: several elements. The inspector when more than one node is selected: Style shows why
   the selection looks the way it does, summarized per property; Data shows the count, what the
   selected nodes share, the rows they belong to, and the verbs that act on all of them.
   Everything is computed from kit/fixtures.json (Les Miserables). Plain ASCII. */
(function () {
    "use strict";
    const { h, icon, link } = window;

    // Section-local styles (the shell's css has no "open question" tag or grayed loser rows).
    if (!document.getElementById("ise-style")) {
        document.head.append(h("style", { id: "ise-style" }, [
            ".ise-oq { display:inline-flex; align-items:center; height:16px; padding:0 6px; margin-left:6px; border-radius:8px; font-size:10px; background:var(--cm-bg-secondary); color:var(--cm-text-secondary); outline:1px dashed var(--cm-border); outline-offset:-1px; white-space:nowrap; }",
            ".ise-why { display:grid; grid-template-columns:72px 1fr; gap:4px 8px; padding:4px 16px 8px; align-items:start; }",
            ".ise-why .k-name { color:var(--cm-text-secondary); }",
            ".ise-src { display:flex; flex-wrap:wrap; gap:4px 8px; align-items:center; min-width:0; }",
            ".ise-src .ab-link { display:inline-flex; align-items:center; gap:4px; }",
            ".ise-lose { opacity:.55; }",
            ".ise-actions { display:flex; flex-wrap:wrap; gap:8px; padding:4px 16px 8px; }",
            ".ise-ends { display:grid; grid-template-columns:48px 1fr; gap:4px 8px; padding:4px 16px 8px; align-items:start; }",
            ".ise-note { padding:0 16px 8px; }",
        ].join("\n")));
    }

    const oq = (text) => h("span", { class: "ise-oq", title: "Open question: " + text }, "Open question");

    // The two selections this section shows.
    const PICK = {
        several: ["Valjean", "Javert", "Thenardier", "Fantine", "Cosette"],
        two: ["Valjean", "Javert"],
    };

    function selection(L, names) {
        const byLabel = Object.fromEntries(L.rows.map((r) => [r.label, r]));
        return names.map((n) => byLabel[n]).filter(Boolean);
    }
    function groupsOf(L, nodes) {
        const m = new Map();
        nodes.forEach((n) => m.set(String(n.group), (m.get(String(n.group)) || 0) + 1));
        return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([g, count]) => ({ g, count, color: L.groupColors[g] || L.frame.legend.other.color }));
    }
    // The group rows in the tree: groups 6, 7 and 10 share one "Other" row.
    const groupRow = (g) => (["6", "7", "10"].includes(g) ? ["inspector-group-set-path-row", "other"] : ["inspector-group-set-path-row", "group-" + g]);
    const groupName = (g) => (["6", "7", "10"].includes(g) ? "Groups 6, 7 and 10" : "Group " + g);
    const range = (vals) => {
        const lo = Math.min(...vals), hi = Math.max(...vals);
        return lo === hi ? String(lo) : lo + " to " + hi;
    };

    // ---------- Style: why this look, summarized ----------
    function styleTab(L, nodes) {
        const gs = groupsOf(L, nodes);
        const rowLink = (target, swatch, label) => link(target[0], target[1], [swatch, label]);
        const line = (name, summary, sources) => [h("span", { class: "k-name" }, name), h("div", { class: "ise-src" }, h("span", null, summary), sources)];
        return [
            h("div", { class: "ab-cap k-secondary" }, "Each property of the " + nodes.length + " selected nodes, and the rows that paint it. Click a row to open it."),
            AB.section("Why this look",
                h("div", { class: "ise-why" },
                    line("Color", "from " + gs.length + (gs.length === 1 ? " row" : " rows"), gs.map((x) => rowLink(groupRow(x.g), AB.chit(x.color, true), groupName(x.g) + " (" + x.count + ")"))),
                    line("Size", "from 1 row", rowLink(["inspector-measure-row", "style"], AB.ramp("#cfcfcf", "#4d4d4d"), "Degree (" + nodes.length + ")")),
                    line("Outline", "from 1 row", link("inspector-selection-and-everything", "selection", [icon("scan", "sm"), "Selection"])),
                    line("Shape", "from 1 row", link("inspector-selection-and-everything", "everything", [icon("square", "sm"), "Everything"])),
                    line("Label", "from 1 row", link("inspector-selection-and-everything", "everything", [icon("square", "sm"), "Everything"])),
                ),
            ),
            AB.section("Also match, not showing",
                h("div", { class: "ise-lose" },
                    AB.row({ icon: "chart-column", swatch: AB.ramp(), label: "Betweenness (hidden)", trail: String(nodes.length), go: ["inspector-measure-row", "style"] }),
                ),
            ),
            AB.section("Change the look",
                h("div", { class: "ab-cap k-secondary" }, "An edit here writes to the Overrides row for these " + nodes.length + " nodes."),
                AB.data("Color", AB.field("Mixed", { caret: true, onClick: () => AB.flash("Color picker (not wired in the skeleton)") })),
                AB.data("Size", AB.field("Mixed", { caret: true, onClick: () => AB.flash("Size (not wired in the skeleton)") })),
                h("div", { class: "ab-cap k-secondary" }, "To style them as a group that lasts, create a set.", oq("does an edit to several elements write one override row or a new set row?")),
            ),
        ];
    }

    // ---------- Data ----------
    function dataTab(L, nodes, two) {
        const gs = groupsOf(L, nodes);
        const deg = nodes.map((n) => n.degree), btw = nodes.map((n) => n.betweenness);
        const kids = [];
        if (two) kids.push(pathSection(nodes));
        kids.push(
            AB.section("Count",
                AB.data("Nodes", String(nodes.length) + " of " + L.nodes),
                AB.data("Edges", "0 selected"),
            ),
            AB.section("Shared attributes",
                AB.data("group", gs.length === 1 ? gs[0].g : gs.length + " values: " + gs.map((x) => x.g).join(", "), { go: ["inspector-attribute-and-filter-step", "attribute"] }),
                AB.data("degree", range(deg), { go: ["inspector-attribute-and-filter-step", "attribute"] }),
                AB.data("betweenness", range(btw), { go: ["inspector-attribute-and-filter-step", "attribute"] }),
                AB.data("label", nodes.length + " different", { go: ["inspector-attribute-and-filter-step", "attribute"] }),
            ),
            AB.section({ title: "Rows they belong to", count: gs.length + 2 },
                gs.map((x) => AB.row({ icon: "circle-dot", swatch: AB.chit(x.color, true), label: groupName(x.g), trail: x.count + " of " + nodes.length, go: groupRow(x.g) })),
                AB.row({ icon: "hash", swatch: AB.ramp("#cfcfcf", "#4d4d4d"), label: "Degree", trail: "all " + nodes.length, go: ["inspector-measure-row", "style"] }),
                AB.row({ icon: "chart-column", swatch: AB.ramp(), label: "Betweenness", trail: "all " + nodes.length, go: ["inspector-measure-row", "style"] }),
                h("div", { class: "ab-pad" }, link("graph-place", "at-rest", "Show these rows in the tree")),
            ),
            h("div", { class: "ise-actions" },
                AB.button("Create set", { icon: "bookmark-plus", onClick: () => AB.flash("Set of " + nodes.length + " nodes added to the top of the tree (not wired in the skeleton)") }),
                AB.button("Show in table", { kind: "secondary", icon: "table", go: ["table-dock", "nodes"] }),
                two ? null : AB.button("Neighborhood...", { kind: "ghost", icon: "waypoints", go: ["selection-bar", "neighborhood"] }),
            ),
            AB.section({ title: "Notes", count: 0, actions: AB.iconButton("plus", "Add note about these " + nodes.length + " nodes (N)", { go: ["notes-place", "about-selection"] }) },
                h("div", { class: "ise-note k-secondary" }, "No notes about these nodes yet. Add note writes one note about all " + nodes.length + " of them."),
                h("div", { class: "ab-pad" }, AB.button("Add note", { kind: "secondary", icon: "sticky-note", go: ["notes-place", "about-selection"] }), " ", link("notes-place", "about-selection", "Notes about the selection")),
            ),
        );
        return kids;
    }

    // Two nodes: Path runs directly on them, no clicking From and To.
    function pathSection(nodes) {
        return AB.section({ title: "Path between them", actions: AB.iconButton("route", "Path tool (P)", { go: ["path-tool", "armed"] }) },
            h("div", { class: "ise-ends" },
                h("span", { class: "k-secondary" }, "From"), h("span", null, nodes[0].label, oq("which node is From: the first one selected?")),
                h("span", { class: "k-secondary" }, "To"), h("span", null, nodes[1].label),
                h("span", { class: "k-secondary" }, "Weight"), h("span", null, "value", oq("what a co-appearance count means as a path weight")),
            ),
            h("div", { class: "ise-actions" },
                AB.button("Shortest path", { icon: "route", go: ["path-tool", "found"] }),
                AB.button("Swap", { kind: "ghost", icon: "arrow-up-down", onClick: () => AB.flash("From and To swapped (not wired in the skeleton)") }),
                AB.button("Other path queries", { kind: "ghost", go: ["path-tool", "from-picked"] }),
            ),
            h("div", { class: "ab-cap k-secondary" }, "The path lands as a row on top of the tree and paints."),
        );
    }

    registerSection({
        id: "inspector-several-elements",
        title: "Inspector: several elements",
        region: "right",
        rail: "graph",
        closeTo: "graph-place",
        states: ["style", "data", { id: "two-nodes", label: "Two nodes selected" }],
        frame: (state) => (state === "two-nodes" ? { left: "graph-place/at-rest", toolbar: "selection-bar/two-nodes" } : { left: "graph-place/at-rest" }),
        render(el, state) {
            const L = AB.fx.datasets.lesmis;
            const two = state === "two-nodes";
            const nodes = selection(L, two ? PICK.two : PICK.several);
            el.append(AB.inspector({
                icon: "scan",
                title: nodes.length + " nodes",
                kind: "Selection",
                kindKey: "several-" + state,
                meta: [nodes.map((n) => n.label).join(", "), two ? [" ", link("selection-bar", "two-nodes", "Selection bar")] : null],
                tab: state === "style" ? "Style" : "Data",
                tabs: { Style: () => styleTab(L, nodes), Data: () => dataTab(L, nodes, two) },
            }));
        },
    });
})();
