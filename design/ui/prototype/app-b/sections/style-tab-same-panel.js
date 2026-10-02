/* Style tab, same panel: Everything's inspector beside Group 2's (a kept set inside the folder "For
   the report"), both drawn with the one AB.inspector and AB.styleTab, for the owner's check that the
   two read the same (spec 16.4). Everything shows graphty-element's base style as lines; Group 2
   shows only what it sets. No product controls are added: the captions are review text. States: nodes, edges.
   Plain ASCII.

   Everything's lines read AB.BASE_STYLE, the one base style; Group 2's numbers repeat
   inspector-group-set-path-row.js (its node count from the fixtures' legend, 28 edges inside, from
   graph-io's miserables.json). */
(function () {
    "use strict";
    const { h } = AB;

    if (!document.getElementById("stsp-style")) {
        document.head.append(h("style", { id: "stsp-style" }, `
.stsp { display: flex; flex-direction: column; gap: 12px; padding: 16px; min-height: 100%; box-sizing: border-box; }
.stsp-cols { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }
.stsp-col { width: var(--k-panel-w); max-width: 100%; display: flex; flex-direction: column; gap: 6px; }
.stsp-cap { font-size: 11px; min-height: 16px; }
.stsp-panel { background: var(--cm-bg); border: 1px solid var(--cm-border); border-radius: 6px; overflow: hidden; }
.stsp-intro { max-width: 640px; }
`));
    }

    const SELECT = ["inspector-several-elements", "style"];
    const pr = () => AB.link("inspector-measure-row", "style", "PageRank", { class: "ab-link" });

    function everything(kind) {
        const C = AB.projectCounts("lesmis");
        return AB.inspector({
            icon: "base-layer", title: "Everything", kind: "Built-in row", kindKey: "stsp-everything",
            builtin: true, menu: ["context-menus", "row"], tab: "Style",
            tabs: {
                Style: () => AB.styleTab({
                    kinds: ["node", "edge"], kind, base: AB.BASE_STYLE, set: {}, changed: [],
                    paints: "Paints " + AB.count(C.nodes, "node") + ", " + AB.count(C.edges, "edge"),
                    order: "Default look, under every other row",
                }),
                Data: () => AB.dataTab({ Summary: [AB.data("Covers", "every node and edge"), AB.data("Position", "under every other row")] }, { kind: "everything" }),
            },
        });
    }

    function group2(kind) {
        const g = AB.fx.datasets.lesmis.frame.legend.rows.find((r) => r.label === "2");
        const size = AB.count(g.count, "node") + ", " + AB.count(28, "edge");
        return AB.inspector({
            icon: AB.ICON.set, swatch: g.color, title: "Group 2", kind: "Set", kindKey: "stsp-group",
            provenance: ["from the attribute group", "inspector-attribute-and-filter-step", "attribute"],
            menu: ["context-menus", "row"], tab: "Style",
            tabs: {
                Style: () => AB.styleTab({
                    kinds: ["node", "edge"], kind, set: { "node.color": g.color },
                    paints: ["Paints " + size, SELECT],
                    order: ["Covered by ", pr(), " for Color on " + g.count + " of " + g.count],
                }),
                Data: () => AB.dataTab({ Summary: [AB.data("Size", AB.link(SELECT[0], SELECT[1], size, { class: "ab-link" })), AB.data("Density", "0.308")] }, { kind: "group" }),
            },
        });
    }

    registerSection({
        id: "style-tab-same-panel",
        title: "Style tab: Everything and a group row side by side",
        region: "workspace",
        rail: "graph",
        closeTo: "graph-place",
        states: [{ id: "nodes", label: "Nodes side" }, { id: "edges", label: "Edges side" }],
        render(el, state) {
            const kind = state === "edges" ? "edge" : "node";
            const col = (cap, ...kids) => h("div", { class: "stsp-col" }, h("div", { class: "stsp-cap k-secondary" }, cap), ...kids);
            el.append(h("div", { class: "stsp" },
                h("div", { class: "stsp-intro ab-cap k-secondary" },
                    "Review view: the same Style tab on two rows. Everything lists graphty-element's defaults as lines; Group 2 lists only what it sets, and \"+\" adds the rest. ",
                    AB.link("style-tab-same-panel", kind === "node" ? "edges" : "nodes", kind === "node" ? "Show the Edges side" : "Show the Nodes side", { class: "ab-link" })),
                h("div", { class: "stsp-cols" },
                    col("Everything (bottom of the Graph tree)", h("div", { class: "stsp-panel" }, everything(kind))),
                    col("Group 2 (in For the report)", h("div", { class: "stsp-panel" }, group2(kind))))));
        },
    });
})();
