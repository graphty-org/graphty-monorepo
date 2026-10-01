/* Inspector: several elements (spec 5.2 "Several elements", 5.4 "Why this look").
   Style: Why this look on the shared grid with the fixed coverage column ("5 of 5") and the
   needs-graphty-element mark (explain() takes one element). Data: Summary with the same rows in the
   same order as a node's (id, label, group, PageRank, Betweenness, Degree), led by the Size row whose
   tooltip is the one names list; Memberships ("3 of 5"); Notes. No verbs in the body: commands are
   in "..." (context-menus/several) and on the selection bar.

   Numbers: node attributes from kit/fixtures.json (Les Miserables); PageRank from the measure row's
   Top 10. Edges among the picks are the published graph's (9 among the five, 1 between Valjean and
   Javert); edges leaving = sum of degrees minus twice the edges among them. Community 1 holds
   Valjean, Javert and Cosette; Watchlist and the path are the tree's rows at rest. Plain ASCII. */
(function () {
    "use strict";

    // Section-local: the shared grid gives the name column what is left after the tokens and the
    // coverage column, so at a 240 px inspector three tokens squeeze "Selection" to nothing. Here the
    // name keeps its width (up to 96 px) and the tokens wrap inside their own column instead. The
    // empty "-" column goes: several elements have no Overrides line. Counts never wrap.
    if (!document.getElementById("ise-style")) {
        document.head.append(h("style", { id: "ise-style" },
            ".ise .ab-why-cov .ab-why-line{grid-template-columns:12px minmax(40px,max-content) auto minmax(0,1fr) max-content;gap:2px 6px;height:auto;min-height:24px;padding-block:2px}" +
            ".ise .ab-why-name{max-width:96px}" +
            ".ise .ab-why-tokens{flex-wrap:wrap;justify-content:flex-end;row-gap:2px}" +
            ".ise .ab-why-x{display:none}" +
            ".ise .k-num{white-space:nowrap}"));
    }

    const PR = { Valjean: 0.0754, Javert: 0.0303, Thenardier: 0.0279, Fantine: 0.027, Cosette: 0.0206 };
    const PICKS = {
        several: { names: ["Valjean", "Javert", "Thenardier", "Fantine", "Cosette"], among: 9 },
        two: { names: ["Valjean", "Javert"], among: 1 },
    };
    const COMMUNITY_1 = ["Valjean", "Javert", "Cosette"];
    const WATCHLIST = ["Valjean", "Javert", "Thenardier", "Mme.Thenardier", "Eponine"];
    const PATH = ["Valjean", "Javert"];

    function pick(L, two) {
        const p = two ? PICKS.two : PICKS.several;
        const nodes = p.names.map((n) => L.rows.find((r) => r.label === n));
        const degSum = nodes.reduce((s, n) => s + n.degree, 0);
        return { nodes, names: p.names, n: nodes.length, among: p.among, leaving: degSum - 2 * p.among };
    }
    const count = (S, list) => S.nodes.filter((x) => list.includes(x.label)).length;
    const of = (S, k) => k + " of " + S.n;
    const range = (vals) => {
        const lo = Math.min(...vals), hi = Math.max(...vals);
        return lo === hi ? String(lo) : lo + " to " + hi;
    };
    const plural = (k, w) => k + " " + w + (k === 1 ? "" : "s");

    // ---------- Style: Why this look with coverage ----------
    function styleTab(S) {
        const all = of(S, S.n);
        const lines = [
            { name: "PageRank", swatch: AB.ramp("#ef7818", "#662506"), wins: ["color"], coverage: all, go: ["inspector-measure-row", "style"], values: { color: "PageRank ramp, " + range(S.names.map((n) => PR[n])) } },
            { name: "Degree", swatch: AB.ramp("#cfcfcf", "#4d4d4d"), hiddenRow: true, wins: ["size"], coverage: all, go: ["inspector-measure-row", "style"], values: { size: "degree " + range(S.nodes.map((x) => x.degree)) } },
            { name: "Selection", swatch: AB.icon("scan", "sm"), wins: ["color", "size"], coverage: all, go: ["inspector-selection-and-everything", "selection"], values: { color: "#FFD700 at 40%", size: "1.45 times" } },
            { name: "Everything", swatch: AB.icon("base-layer", "sm"), wins: ["shape"], coverage: all, go: ["inspector-selection-and-everything", "everything"], values: { shape: "Faceted sphere" } },
        ];
        return [
            AB.whyThisLook(lines, { kind: "several", element: S.n + " nodes", coverage: true,
                coverageReason: "explain() takes one node or edge; an explain over a set, returning how many of the selected elements each row wins, is filed.",
                notes: [AB.openQuestion("Editing a token for " + S.n + " nodes: does it write " + S.n + " entries in the Overrides row, or one? The token's popover is headed for one node today.")] }),
        ];
    }

    // ---------- Data: Summary, Memberships, Notes ----------
    function dataTab(L, S) {
        const groups = [...new Set(S.nodes.map((x) => x.group))].sort((a, b) => a - b);
        const toAttr = { go: ["inspector-attribute-and-filter-step", "attribute"] };
        const toMeasure = { go: ["inspector-measure-row", "data"] };
        const size = AB.link("table-dock", "nodes", S.n + " nodes, " + plural(S.among, "edge"));
        AB.tip(size, S.names.join(", "), { label: false });
        const member = (ic, swatch, label, k, go) => (k ? AB.row({ icon: ic, swatch, label, trail: of(S, k), go }) : null);
        const g2 = S.nodes.filter((x) => x.group === 2).length;
        const memberships = [
            member("circle-dot", AB.chit("#E69F00", true), "Community 1", count(S, COMMUNITY_1), ["inspector-group-set-path-row", "community-1"]),
            member("route", AB.chit("#D55E00"), "Valjean to Javert", count(S, PATH), ["inspector-group-set-path-row", "path-lesmis"]),
            member(AB.ICON.set, AB.chit("#CC79A7", true), "Watchlist", count(S, WATCHLIST), ["inspector-group-set-path-row", "watchlist"]),
            member(AB.ICON.set, AB.chit(L.groupColors["2"], true), "Group 2", g2, ["inspector-group-set-path-row", "group-2"]),
        ].filter(Boolean);
        return AB.dataTab({
            Summary: {
                summary: S.n + " nodes, " + plural(S.among, "edge") + " among them, " + S.leaving + " leaving",
                body: [
                    AB.data("Size", size),
                    AB.data("Edges leaving", String(S.leaving), { go: ["table-dock", "edges"] }),
                    AB.data("id", plural(S.n, "value")),
                    AB.data("label", plural(S.n, "value")),
                    AB.data("group", groups.length === 1 ? String(groups[0]) : groups.join(", "), toAttr),
                    AB.data("PageRank", range(S.names.map((n) => PR[n])), toMeasure),
                    AB.data("Betweenness", range(S.nodes.map((x) => x.betweenness)), toMeasure),
                    AB.data("Degree", range(S.nodes.map((x) => x.degree)), { go: ["selection-bar", "neighborhood"] }),
                ],
            },
            Memberships: { summary: memberships.length + " rows", body: memberships },
            Notes: { count: 2, target: ["notes-place", "about-selection"] },
        }, { kind: "several" });
    }

    // ---------- the door entries: Ana Ruiz and B1, the two targets of one door-entries note ----------
    function doorTwo(el) {
        const D = AB.fx.datasets.doorEntries, pair = D.loaded.per === "pair";
        const all = "2 of 2";
        const style = () => [AB.whyThisLook([
            { name: "Selection", swatch: AB.icon("scan", "sm"), wins: ["color", "size"], coverage: all, go: ["inspector-selection-and-everything", "selection"], values: { color: "#FFD700 at 40%", size: "1.45 times" } },
            { name: "Everything", swatch: AB.icon("base-layer", "sm"), wins: ["shape"], coverage: all, go: ["inspector-selection-and-everything", "everything"], values: { shape: "Faceted sphere" } },
        ], { kind: "several", element: "2 nodes", coverage: true })];
        const data = () => AB.dataTab({
            Summary: {
                summary: "2 nodes (a person and a building), " + (pair ? "1 edge" : "edges per entry") + " between them",
                body: [
                    AB.data("Size", "2 nodes, " + (pair ? "1 edge (count 22)" : "22 entry edges")),
                    AB.data("type", "person 1, building 1"),
                    AB.row({ icon: "user", label: "Ana Ruiz", trail: "person", go: ["inspector-node", "door-ana"] }),
                    AB.row({ icon: "building-2", label: "B1", trail: "building", go: ["inspector-node", "door-b1"] }),
                ],
            },
            Notes: { count: 1, target: ["notes-place", "door-entries"] },
        }, { kind: "several" });
        const insp = AB.inspector({ icon: "circle-dot", title: "2 nodes", kind: "Elements", kindKey: "several",
            renameDisabled: "A selection has no name. Create set (Ctrl+G) keeps it as a row you can name.",
            menu: ["context-menus", "several"], tab: "Data", tabs: { Style: style, Data: data } });
        insp.classList.add("ise");
        el.append(insp);
    }

    registerSection({
        id: "inspector-several-elements",
        title: "Inspector: several elements",
        region: "right",
        rail: "graph",
        closeTo: "graph-place",
        states: [{ id: "style", label: "Style tab (why this look)" }, { id: "data", label: "Data tab" }, { id: "two-nodes", label: "Two nodes selected" }, { id: "door-two", label: "Door entries: Ana Ruiz and B1" }],
        frame: (state) => (state === "two-nodes" ? { left: "graph-place/at-rest", toolbar: "selection-bar/two-nodes" } : state === "door-two" ? { dataset: "doorEntries", left: "graph-place/door-entries" } : { left: "graph-place/at-rest" }),
        render(el, state) {
            if (state === "door-two") return doorTwo(el);
            const L = AB.fx.datasets.lesmis;
            const S = pick(L, state === "two-nodes");
            const insp = AB.inspector({
                icon: "circle-dot",
                title: S.n + " nodes",
                kind: "Elements",
                kindKey: "several",
                renameDisabled: "A selection has no name. Create set (Ctrl+G) keeps it as a row you can name.",
                menu: ["context-menus", "several"],
                tab: state === "data" ? "Data" : state === "style" ? "Style" : undefined,
                tabs: { Style: () => styleTab(S), Data: () => dataTab(L, S) },
            });
            insp.classList.add("ise");
            el.append(insp);
        },
    });
})();
