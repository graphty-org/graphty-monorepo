/* Inspector: one edge. Fantine -- Valjean in Les Miserables (value 9, co-appearance count).
   Style tab: Why this look, as for a node. Data tab: Ends, Attributes, Weight, Results, Memberships, Notes.
   Select endpoints lives in the edge's menu (context-menus/edge). Plain ASCII. */
(function () {
    // Section-local style: the "Open question" tag (not in the shared kit).
    if (!document.getElementById("ie-style")) {
        document.head.append(
            h("style", { id: "ie-style" },
                ".ie-oq{display:inline-block;margin-left:6px;padding:0 5px;border:1px dashed var(--cm-border);border-radius:3px;font-size:11px;line-height:16px;color:var(--cm-text-secondary);vertical-align:middle;white-space:nowrap}" +
                ".ie-ends{display:flex;flex-direction:column;gap:2px;padding:0 8px 8px}" +
                ".ie-wins .k-legend a{margin-left:4px}" +
                ".ie-lose{padding:0 16px 8px}"),
        );
    }
    const oq = (text) => h("span", { class: "ie-oq", title: text }, "Open question");
    const flash = (t) => () => AB.flash(t + " (not wired in the skeleton)");

    function edge() {
        const L = AB.fx.datasets.lesmis;
        const byLabel = Object.fromEntries(L.rows.map((r) => [r.label, r]));
        const [a, b] = L.corpusDiffersFromPublished.corpusValueZeroPublishedNine[0]; // Fantine, Valjean
        const w = L.attributes.find((x) => x.name === "value (edge)");
        return { L, a: byLabel[a], b: byLabel[b], value: 9, valueNote: w.note, file: L.file };
    }

    // One property of "Why this look": the property, the row that wins it (a link), the field (edits go to Overrides).
    function wins(prop, rowName, rowGo, fieldNode, extra) {
        return h("div", { class: "k-fieldrow ie-wins" },
            h("span", { class: "k-legend" }, prop, h("span", { class: "k-tertiary" }, " -- from"), link(rowGo[0], rowGo[1], rowName), extra || null),
            h("div", { class: "k-fields" }, fieldNode));
    }

    function styleTab(E) {
        const overrides = (what) => flash("Set this edge's " + what + ": writes to the Overrides row");
        return [
            AB.section({ title: "Why this look", actions: h("span", { class: "k-tertiary" }, "top wins") },
                wins("Color", "Everything", ["inspector-selection-and-everything", "everything"],
                    AB.field("Default edge color", { caret: true, span: true, onClick: overrides("color") })),
                wins("Width", "Everything", ["inspector-selection-and-everything", "everything"],
                    AB.field("Default width", { caret: true, span: true, onClick: overrides("width") })),
                wins("Outline", "Selection", ["inspector-selection-and-everything", "selection"],
                    AB.field("Selected", { icon: "scan", span: true })),
                wins("Arrows", "Everything", ["inspector-selection-and-everything", "everything"],
                    AB.field("None: the graph is undirected", { span: true, onClick: overrides("arrows") })),
                h("div", { class: "k-fieldrow" },
                    h("span", { class: "k-legend" }, "Label", oq("Does an edge carry a label property, and which row sets it?")),
                    h("div", { class: "k-fields" }, AB.field("Not shown", { caret: true, span: true, onClick: overrides("label") }))),
                h("div", { class: "ab-cap k-secondary" },
                    "A change here writes to the Overrides row at the top of ", link("graph-place", "at-rest", "the tree"),
                    ", never to the drawing, so it can be hidden, cleared or saved like any row."),
            ),
            AB.section("Also match, but lose",
                h("div", { class: "ie-lose k-secondary" },
                    "No other row paints this edge: the group, Degree and Betweenness rows paint nodes only. An ",
                    link("inspector-measure-row", "style", "edge measure"),
                    " such as edge betweenness would win color or width here and list Everything below it, grayed.")),
        ];
    }

    function dataTab(E) {
        const end = (n) =>
            AB.row({
                icon: "circle-dot",
                swatch: AB.chit(E.L.groupColors[n.group], true),
                label: n.label,
                trail: "group " + n.group + ", degree " + n.degree,
                go: ["inspector-node", "why-this-look"],
            });
        return [
            AB.section({ title: "Ends", actions: AB.iconButton("ellipsis", "Edge menu: Select endpoints and more", { go: ["context-menus", "edge"] }) },
                h("div", { class: "ie-ends" }, end(E.a), end(E.b))),
            AB.section({ title: "Attributes", count: 1 },
                AB.data("value", String(E.value)),
                h("div", { class: "ab-cap k-secondary" }, "From " + E.file + ": the " + E.valueNote + ".")),
            AB.section("Weight",
                AB.data("Weight", "value, " + E.value),
                h("div", { class: "k-fieldrow" },
                    h("span", { class: "k-legend" }, "What it means"),
                    h("div", { class: "k-fields" }, AB.field("Not declared", { caret: true, span: true, onClick: flash("Declare what value means") }))),
                h("div", { class: "ab-cap k-secondary" },
                    "Each run that uses the weight asks whether a larger value means a stronger tie or a longer distance.")),
            AB.section({ title: "Results", count: 0 },
                h("div", { class: "ab-cap k-secondary" },
                    "No run has scored edges yet. An ", link("inspector-measure-row", "data", "edge measure"),
                    " such as edge betweenness lists its value and rank here."),
                h("div", { class: "ab-pad" }, AB.button("Rank nodes and edges...", { kind: "secondary", icon: "chart-column", go: ["analyze-popover", "open"] }))),
            AB.section({ title: "Memberships", count: 0 },
                h("div", { class: "ab-cap k-secondary" },
                    "In no group, set or path. Its ends are in different groups: ",
                    link("inspector-group-set-path-row", "data", "group " + E.a.group), " and ",
                    link("inspector-group-set-path-row", "data", "group " + E.b.group), "."),
                h("div", { class: "ab-pad" }, AB.button("Show in table", { kind: "secondary", icon: "table", go: ["table-dock", "edges"] }))),
            AB.section({ title: "Notes", count: 0, actions: AB.iconButton("plus", "Add note", { onClick: flash("Add a note to this edge") }) },
                h("div", { class: "ab-cap k-secondary" }, "No notes on this edge yet.")),
        ];
    }

    registerSection({
        id: "inspector-edge",
        title: "Inspector: one edge",
        region: "right",
        rail: "graph",
        frame: { left: "graph-place/at-rest", dock: "table-dock/edges" },
        closeTo: "graph-place",
        states: [{ id: "style", label: "Style tab" }, { id: "data", label: "Data tab" }],
        render(el, state) {
            const E = edge();
            const insp = AB.inspector({
                icon: "spline",
                title: E.a.label + " -- " + E.b.label,
                kind: "Edge",
                kindKey: "edge",
                meta: [link("inspector-node", "why-this-look", E.a.label), " and ", link("inspector-node", "why-this-look", E.b.label), ", undirected, in ", link("graph-place", "at-rest", E.L.frame.graphRow)],
                tabs: { Style: () => styleTab(E), Data: () => dataTab(E) },
                tab: state === "data" ? "Data" : "Style",
            });
            // Header menu: Select endpoints, Hide on canvas, Add note, Show in table (the edge's context menu).
            insp.querySelector(".ab-insp-head").append(AB.iconButton("ellipsis", "Edge menu: Select endpoints and more", { go: ["context-menus", "edge"] }));
            el.append(insp);
        },
    });
})();
