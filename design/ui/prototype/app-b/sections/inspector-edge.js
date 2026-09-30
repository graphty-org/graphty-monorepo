/* Inspector: one edge. Javert -- Valjean in Les Miserables (value 17, chapters shared), the one
   edge of the "Valjean to Javert" path row. Opened from the table: graphty-element cannot pick
   edges on the canvas. Style tab: Why this look (the rows that win a property, top first). Data
   tab: Summary (ends, attributes, weight, results), Memberships, Notes. Every verb (Select
   endpoints, Hide, Add note, Show in table) is in the "..." menu, the edge's context menu.
   Plain ASCII. See ../README.md. */
(function () {
    "use strict";
    const oq = (text) => h("div", { class: "ab-cap" }, h("span", { class: "k-annot-tag", tabindex: "0", title: text, "aria-label": "Open question: " + text }, "Open question"));
    const EVERY = ["inspector-selection-and-everything", "everything"];
    const PATH = ["inspector-group-set-path-row", "path-lesmis"];

    function edge() {
        const L = AB.fx.datasets.lesmis;
        const by = Object.fromEntries(L.rows.map((r) => [r.label, r]));
        return { L, a: by.Javert, b: by.Valjean, value: 17 }; // the table's Javert -- Valjean row
    }

    function styleTab() {
        return [
            AB.whyThisLook([
                    { name: "Valjean to Javert", swatch: "#D55E00", go: PATH, wins: ["color"], values: { color: "#D55E00, the path's color" } },
                    // No Selection line: graphty-element's selectionStyle applies to nodes only (Node.ts)
                    { name: "Everything", swatch: "#A9A9A9", go: EVERY, wins: ["width", "pattern"], values: { width: "8", pattern: "solid" } },
                ]),
        ];
    }

    function dataTab(E) {
        const node = (n) => link("inspector-node", n.label === "Valjean" ? "why-this-look" : "data", n.label);
        return [
            AB.section({ title: "Summary", collapsible: true, key: "ie-summary", summary: "value " + E.value + ", no results yet" },
                AB.data("Ends", h("span", null, node(E.a), ", ", node(E.b))),
                AB.data("value", h("span", { class: "k-num" }, String(E.value) + " chapters shared")),
                AB.data("Weight attribute", "value", { go: ["data-place", "attributes"] }),
                AB.data("Results", h("span", { class: "k-secondary" }, "None yet")),
                oq("which end is listed first in an undirected graph: the file's order?")),
            AB.section({ title: "Memberships", count: 1, collapsible: true, key: "ie-members", summary: "Valjean to Javert (path)" },
                AB.row({ icon: "route", swatch: AB.chit("#D55E00"), label: "Valjean to Javert (path)", trail: "1 edge", go: PATH })),
            AB.notesSection(0),
        ];
    }

    registerSection({
        id: "inspector-edge",
        title: "Inspector: one edge",
        region: "right",
        rail: "graph",
        frame: { left: "graph-place/at-rest", dock: "table-dock/edges" },
        closeTo: "graph-place",
        states: [{ id: "style", label: "Style tab (why this look)" }, { id: "data", label: "Data tab" }],
        render(el, state) {
            const E = edge();
            el.append(AB.inspector({
                icon: "spline",
                title: E.a.label + " -- " + E.b.label,
                kind: "Edge",
                kindKey: "edge",
                menu: ["context-menus", "edge"],
                renameDisabled: "an edge has no name field to store one in; the title is its two ends",
                meta: h("span", null, "Undirected. Opened from ", link("table-dock", "edges", "the table"), " ", AB.needsElement("Clicking, hovering or right-clicking an edge on the canvas: graphty-element sets edge meshes to isPickable = false.")),
                tabs: { Style: styleTab, Data: () => dataTab(E) },
                tab: state === "data" ? "Data" : "Style",
            }));
        },
    });
})();
