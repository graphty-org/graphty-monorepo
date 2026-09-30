/* Inspector: several elements (spec section 5.2, "Several elements"). Style is Why this look with
   coverage counts, drawn with the needs-graphty-element mark (explain() takes one element; an
   explain over a set is filed). Data is Summary (count, edges among and leaving them, shared
   attributes), Memberships and Notes. No verbs in the body: Create set, Show in table, the path
   buttons and the rest are in the "..." menu (context-menus/several) and on the selection bar.

   Numbers: node attributes from kit/fixtures.json (Les Miserables). The edge counts are the
   selection statistics of the published graph (graphty-element/examples/data/miserables.json):
   9 edges among the five picked below, 1 between Valjean and Javert; the edges leaving the
   selection follow from the fixture degrees (sum of degrees minus twice the edges among them).
   Community 1 holds Valjean, Javert and Cosette (the Louvain note in the fixtures); Watchlist and
   the path are the tree's rows at rest (graph-place). Plain ASCII. */
(function () {
    "use strict";

    // Section-local: coverage counts never wrap, and a layer name keeps room beside its tokens.
    if (!document.getElementById("ise-style")) {
        document.head.append(h("style", { id: "ise-style" },
            ".ise-why .ab-why-line{gap:2px 6px;height:auto;min-height:24px;flex-wrap:wrap}" +
            ".ise-why .ab-why-name{min-width:64px}" +
            ".ise-why .ab-why-tokens{gap:2px}" +
            ".ise-why .ab-why-line>.k-num{flex:none;white-space:nowrap;min-width:36px;margin-inline-start:auto;text-align:end}"));
    }

    const oq = (text) => h("div", { class: "ab-cap" }, h("span", { class: "k-annot-tag", tabindex: "0", title: text, "aria-label": "Open question: " + text }, "Open question"));

    const PICKS = {
        several: { names: ["Valjean", "Javert", "Thenardier", "Fantine", "Cosette"], among: 9 },
        two: { names: ["Valjean", "Javert"], among: 1 },
    };
    // Tree rows at rest (graph-place) and which of the picked nodes each one holds.
    const COMMUNITY_1 = ["Valjean", "Javert", "Cosette"];
    const WATCHLIST = ["Valjean", "Javert", "Thenardier", "Mme.Thenardier", "Eponine"];
    const PATH = ["Valjean", "Javert"];

    function pick(L, two) {
        const p = two ? PICKS.two : PICKS.several;
        const byLabel = Object.fromEntries(L.rows.map((r) => [r.label, r]));
        const nodes = p.names.map((n) => byLabel[n]);
        const degSum = nodes.reduce((s, n) => s + n.degree, 0);
        return { nodes, n: nodes.length, among: p.among, leaving: degSum - 2 * p.among };
    }
    const inPick = (S, list) => S.nodes.filter((x) => list.includes(x.label)).length;
    const of = (S, k) => k + " of " + S.n;
    const range = (vals) => {
        const lo = Math.min(...vals), hi = Math.max(...vals);
        return lo === hi ? String(lo) : lo + " to " + hi;
    };

    // ---------- Style: why this look, with coverage ----------
    function styleTab(S) {
        const all = of(S, S.n);
        const lines = [
            { name: "PageRank", swatch: AB.ramp("#ef7818", "#662506"), wins: ["color"], coverage: all, go: ["inspector-measure-row", "style"], values: { color: "PageRank ramp, " + S.nodes.map((x) => x.label).join(", ") } },
            { name: "Degree", swatch: AB.ramp("#cfcfcf", "#4d4d4d"), wins: ["size"], coverage: all, go: ["inspector-measure-row", "style"], values: { size: "degree " + range(S.nodes.map((x) => x.degree)) } },
            { name: "Selection", swatch: AB.icon("scan", "sm"), wins: ["highlight"], coverage: all, go: ["inspector-selection-and-everything", "selection"] },
            { name: "Everything", swatch: "#6366F1", wins: ["shape"], coverage: all, go: ["inspector-selection-and-everything", "everything"], values: { shape: "icosphere" } },
            { name: "Community 1", swatch: AB.chit("#E69F00", true), coverage: of(S, inPick(S, COMMUNITY_1)), go: ["inspector-group-set-path-row", "community-1"] },
            { name: "Valjean to Javert", swatch: AB.chit("#D55E00"), coverage: of(S, inPick(S, PATH)), go: ["inspector-group-set-path-row", "path"] },
            { name: "Watchlist", swatch: AB.chit("#CC79A7", true), coverage: of(S, inPick(S, WATCHLIST)), go: ["inspector-group-set-path-row", "watchlist"] },
        ];
        return [
            h("div", { class: "ise-why" }, AB.whyThisLook(lines, { coverage: true, coverageReason: "explain() takes one node or edge; an explain over a set, returning how many of the selected elements each row wins, is filed." })),
            oq("does editing a token for " + S.n + " nodes write " + S.n + " entries in the Overrides row, or one?"),
        ];
    }

    // ---------- Data ----------
    function dataTab(L, S) {
        const groups = [...new Set(S.nodes.map((x) => String(x.group)))];
        const selectRows = { go: ["table-dock", "nodes"] };
        const g2 = S.nodes.filter((x) => String(x.group) === "2").length;
        const member = (swatch, label, k, go) => k ? AB.row({ swatch, label, trail: of(S, k), go }) : null;
        const memberships = [
            member(AB.chit("#E69F00", true), "Community 1 (Louvain)", inPick(S, COMMUNITY_1), ["inspector-group-set-path-row", "community-1"]),
            member(AB.chit("#D55E00"), "Valjean to Javert (path)", inPick(S, PATH), ["inspector-group-set-path-row", "path"]),
            member(AB.chit("#CC79A7", true), "Watchlist (set)", inPick(S, WATCHLIST), ["inspector-group-set-path-row", "watchlist"]),
            member(AB.chit(L.groupColors["2"], true), "Group 2 (group)", g2, ["inspector-group-set-path-row", "group-2"]),
        ].filter(Boolean);
        return [
            AB.section({ title: "Summary", collapsible: true, key: "several-summary", summary: S.n + " nodes, " + S.among + " edges among them" },
                AB.data("Nodes", S.n + " of " + L.nodes),
                AB.data("Edges among them", String(S.among), selectRows),
                AB.data("Edges leaving them", String(S.leaving), selectRows),
                AB.data("group", groups.length === 1 ? groups[0] : groups.length + " values: " + groups.join(", "), { go: ["inspector-attribute-and-filter-step", "attribute"] }),
                AB.data("degree", range(S.nodes.map((x) => x.degree)), { go: ["inspector-attribute-and-filter-step", "attribute"] }),
                AB.data("betweenness", range(S.nodes.map((x) => x.betweenness)), { go: ["inspector-attribute-and-filter-step", "attribute"] }),
                AB.data("label", S.n + " different", { go: ["inspector-attribute-and-filter-step", "attribute"] }),
            ),
            AB.section({ title: "Memberships", count: memberships.length, collapsible: true, key: "several-members", summary: memberships.length + " rows" }, memberships),
            AB.notesSection(0),
        ];
    }

    registerSection({
        id: "inspector-several-elements",
        title: "Inspector: several elements",
        region: "right",
        rail: "graph",
        closeTo: "graph-place",
        states: [{ id: "style", label: "Style tab (why this look)" }, { id: "data", label: "Data tab" }, { id: "two-nodes", label: "Two nodes selected" }],
        frame: (state) => (state === "two-nodes" ? { left: "graph-place/at-rest", toolbar: "selection-bar/two-nodes" } : { left: "graph-place/at-rest" }),
        render(el, state) {
            const L = AB.fx.datasets.lesmis;
            const two = state === "two-nodes";
            const S = pick(L, two);
            el.append(AB.inspector({
                icon: "circle-dot", // the node icon: the dashed box means only the Selection row
                title: S.n + " nodes",
                kind: "Elements",
                kindKey: "several",
                renameDisabled: "A selection has no name. Create set (Ctrl+G) keeps it as a row you can name.",
                menu: ["context-menus", "several"],
                meta: S.nodes.map((x) => x.label).join(", "),
                tab: state === "data" ? "Data" : state === "style" ? "Style" : undefined,
                tabs: { Style: () => styleTab(S), Data: () => dataTab(L, S) },
            }));
        },
    });
})();
