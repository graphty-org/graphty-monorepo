/* Inspector: one edge. Javert -- Valjean in Les Miserables (value 17, chapters shared), the one
   edge of the "Valjean to Javert" path row. Style tab: Why this look (collapsible; the rows that
   win a property, top first). Data tab: Summary (Direction, then the attributes, the weight
   attribute marked by the role tag; Results only once a run has written to this edge), Memberships,
   Notes (1 note: the fixture note about this edge; its meta line is the time alone, no author). Every verb is in the "..." menu, the edge's
   context menu. Plain ASCII. See ../README.md. */
(function () {
    "use strict";
    const EVERY = ["inspector-selection-and-everything", "everything"];
    const PATH = ["inspector-group-set-path-row", "path-lesmis"];

    function edge() {
        const L = AB.fx.datasets.lesmis;
        const by = Object.fromEntries(L.rows.map((r) => [r.label, r]));
        return { L, a: by.Javert, b: by.Valjean, value: 17, directed: !!L.directed }; // the table's Javert -- Valjean row
    }

    function styleTab() {
        return AB.whyThisLook([
            { name: "Valjean to Javert", swatch: "#D55E00", go: PATH, wins: ["color"], values: { color: "#D55E00, the path's color" } },
            // No Selection line: graphty-element's selectionStyle applies to nodes only (Node.ts)
            { name: "Everything", swatch: AB.icon("base-layer", "sm"), go: EVERY, wins: ["width", "pattern"], values: { width: "8", pattern: "Solid" } },
        ], { kind: "edge", element: "this edge" });
    }

    function dataTab(E, state) {
        const node = (n) => link("inspector-node", n.label === "Valjean" ? "why-this-look" : "data", n.label);
        const weight = AB.roleTag("Weight, set when loaded", { second: "every run uses it unless the run picks another. Change it on the Data page",
            go: ["data-page", "graph-file"] });
        const dir = E.directed ? "Directed" : "Undirected";
        const parts = AB.dataTab({
            Summary: {
                summary: dir.toLowerCase() + ", value " + E.value,
                body: [
                    AB.data("Direction", dir, { go: ["inspector-nothing-selected", "overview"] }),
                    AB.data("Ends", h("span", null, node(E.a), ", ", node(E.b))),
                    AB.data(h("span", { style: "display:inline-flex;align-items:center;gap:6px" }, "value", weight),
                        h("span", { class: "k-num" }, String(E.value))),
                    // Results: none has been written to this edge yet, so the row is left out
                    h("div", { class: "ab-cap" }, AB.openQuestion("Which end is listed first in an undirected graph: the file's order?")),
                ],
            },
            Memberships: { summary: "Valjean to Javert", body: [AB.row({ icon: "route", swatch: AB.chit("#D55E00"), label: "Valjean to Javert", go: PATH })] },
            Notes: { count: state === "no-notes" ? 0 : 1, target: ["notes-place", "about-selection"] },
        }, { kind: "edge" });
        // The meta line: the note's time (graphty-element stamps it), the full date in its tooltip.
        // No author: a name shows only when the project holds notes from two or more named people.
        const notes = parts[parts.length - 1].querySelector(".k-data");
        if (notes) notes.append(
            AB.tip(h("span", { class: "k-secondary", tabindex: "0" }, "Sep 28"), "Monday, September 28, 2026, 12:30", { label: false }));
        return parts;
    }

    registerSection({
        id: "inspector-edge",
        title: "Inspector: one edge",
        region: "right",
        rail: "graph",
        frame: { left: "graph-place/at-rest", dock: "table-dock/edges" },
        closeTo: "graph-place",
        states: [
            { id: "style", label: "Style tab (why this look)" },
            { id: "data", label: "Data tab" },
            { id: "no-notes", label: "Data tab, no notes" },
        ],
        render(el, state) {
            const E = edge();
            el.append(AB.inspector({
                icon: "spline",
                title: E.a.label + " -- " + E.b.label,
                kind: "Edge",
                kindKey: "edge",
                menu: ["context-menus", "edge"],
                renameDisabled: "An edge has no name field to store one in; the title is its two ends",
                tabs: { Style: styleTab, Data: () => dataTab(E, state) },
                tab: state === "style" ? "Style" : "Data",
            }));
        },
    });
})();
