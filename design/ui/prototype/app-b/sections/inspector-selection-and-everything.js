/* Inspector: the built-in rows of the paint tree -- Selection (top, pinned), Notes (starts under
   Selection), Overrides (under Notes once it holds something) and Everything (bottom, pinned).
   Selection, Everything and Notes: the one Style tab (AB.styleTab) and a Data tab. Overrides: one body,
   a list of edits (spec: no tabs; one shared value cannot describe per-element edits). Plain ASCII. */
(function () {
    const A = window.AB;
    const ID = "inspector-selection-and-everything";

    if (!document.getElementById("isx-style")) {
        document.head.append(h("style", { id: "isx-style" }, `
.isx-edit > .ab-link { color: var(--cm-text-secondary); text-decoration: none; }
.isx-edit > .ab-link:is(:hover, :focus-visible) { color: var(--cm-text-brand); text-decoration: underline; }
`));
    }

    const L = () => A.fx.datasets.lesmis;
    const MENU = ["context-menus", "row"];

    // ---------- Selection: graphty-element's selection style (GraphStyle.ts: #FFD700, 1.45, 0.4) ----------
    // The one Style tab, like every painting row: Fill (Color, its opacity inside) and Shape (Size, the
    // same unitless size as on Everything). Nodes only: graphty-element's selectionStyle paints nodes (Node.ts).
    function selectionBody() {
        return A.styleTab({
            kinds: ["node"], noBind: true,
            set: { "node.color": "#FFD700", "node.opacity": 0.4, "node.size": 1.45 },
            paints: "Paints 0 nodes",
            extra: h("div", { class: "ab-cap ab-review-only k-secondary" }, "Default color, edges:", A.needsElement("The default gold on the default whitesmoke canvas measures about 1.3:1, under the 3:1 of WCAG 1.4.11. The element's default must pass. The selection style paints nodes only; an edge side is filed.")),
        });
    }

    function selectionData() {
        return A.dataTab({ Summary: [A.data("Selected", "nothing")] }, { kind: "selection" });
    }

    // ---------- Everything: the element's base style as lines; edits go to the Everything layer ----------
    // Base values: graphty-element's defaultNodeStyle and defaultEdgeStyle (NodeStyle.ts, EdgeStyle.ts;
    // the line width is EDGE_CONSTANTS.DEFAULT_LINE_WIDTH, darkgrey is #A9A9A9).
    const BASE = { "node.shape": "icosphere", "node.size": 1, "node.color": "#6366F1", "edge.style": "solid", "edge.width": 8, "edge.color": "#A9A9A9", "edge.arrowHead": "normal" };
    function everythingStyle(state) {
        const edited = state === "everything-edited";
        return A.styleTab({
            kinds: ["node", "edge"], kind: state === "everything-edges" ? "edge" : "node",
            base: BASE, set: edited ? { "node.size": 1.5 } : {}, changed: edited ? ["node.size"] : [],
            paints: "Paints " + L().nodes + " nodes, " + L().edges + " edges",
            order: edited ? "Your change is in the Everything layer, under every other row" : "Default look, under every other row",
        });
    }
    function everythingData() {
        return A.dataTab({
            Summary: [A.data("Covers", "every node and edge"), A.data("Nodes", L().nodes, { go: ["table-dock", "nodes"] }), A.data("Edges", L().edges, { go: ["table-dock", "edges"] }), A.data("Position", "under every other row")],
        }, { kind: "everything" });
    }

    // ---------- Notes: paints the nodes notes are about (notes-place: Valjean and Javert in the graph) ----------
    // The notes in the Notes place are about 3 nodes and 1 edge (Valjean, Javert, Napoleon; Javert -- Valjean): 4 notes in all
    const NOTED = ["Valjean", "Javert", "Napoleon"];
    // No layer until a look is added (graphty-element refuses a layer that writes nothing, and a layer paints
    // nodes or edges, not both): the first look on a side adds that side's layer, the Everything pattern.
    // Its selector reads graphty-element's note count (notes.count > `0`), so a label bound to Note count
    // draws only on the noted elements. Count from the fixture (3 nodes, 1 edge); the spec's "4 nodes" is a slip.
    function notesStyle(state) {
        const empty = state === "notes-row";
        const paints = A.paintsLine("Paints " + NOTED.length + " nodes, 1 edge (noted)" + (empty ? ". Nothing set -- + to add a look" : ""), ["notes-place", "all"]);
        const look = state === "notes-row-outlined" ? { set: { "node.outline": "#D55E00" } }
            : state === "notes-row-label" ? { labels: [{ pos: "Below", field: "Note count", type: "num" }] } : {};
        return A.styleTab(Object.assign({ kinds: ["node", "edge"], kind: "node", paints, order: empty ? null : "In the Notes node layer; no edge layer yet" }, look));
    }
    function notesData() {
        return A.dataTab({
            Summary: [A.data("Noted elements", NOTED.length + " nodes, 1 edge"), A.data("Notes about them", "4", { go: ["notes-place", "all"] })],
            Members: [NOTED.map((n) => A.row({ label: n, go: ["inspector-node", "data"] })), A.row({ icon: "spline", label: "Javert -- Valjean", go: ["inspector-edge", "data"] }),
                h("div", { class: "ab-cap k-secondary" }, "Napoleon's note is about a node a filter step removes; he is painted only while he is in the graph.")],
        }, { kind: "notes-row" });
    }

    // ---------- Overrides: a list of edits, one line per element and property ----------
    function overridesBody() {
        const list = h("div", { role: "list", "aria-label": "Edits" });
        const edits = [{ el: "Valjean", prop: "Color", value: "#E41A1C", pct: 100 }];
        const draw = () => {
            list.replaceChildren();
            if (!edits.length) { list.append(A.empty("No edits.")); return; }
            // The shared line grid (88 px name, the value, a 24 px "-" slot) and the one color field
            edits.forEach((e, i) => list.append(h("div", { class: "ab-sline isx-edit", role: "listitem" },
                A.link("inspector-node", "edited", e.el + " " + e.prop, { class: "ab-link ab-sname k-ellipsis", "aria-label": e.el + "'s " + e.prop }),
                A.colorField({ name: e.el + "'s " + e.prop, hex: e.value, pct: e.pct }),
                h("span", { class: "ab-sact" }, A.iconButton("minus", "Remove " + e.el + "'s " + e.prop, {
                    onClick: () => { const [gone] = edits.splice(i, 1); draw(); A.deleted(gone.el + "'s " + gone.prop, () => { edits.splice(i, 0, gone); draw(); }); },
                })))));
        };
        draw();
        return [A.paintsLine("Paints 1 node", ["inspector-node", "edited"]), list];
    }

    registerSection({
        id: ID,
        title: "Inspector: built-in rows",
        region: "right",
        rail: "graph",
        frame: { left: "graph-place/at-rest" },
        closeTo: "graph-place",
        states: [
            { id: "selection", label: "Selection row" },
            { id: "everything", label: "Everything row" },
            { id: "everything-edited", label: "Everything row, one line changed" },
            { id: "everything-edges", label: "Everything row, Edges" },
            { id: "notes-row", label: "Notes row, nothing set" },
            { id: "notes-row-outlined", label: "Notes row, outline added" },
            { id: "notes-row-label", label: "Notes row, Label Below: Note count" },
            { id: "notes-data", label: "Notes row, Data" },
            { id: "overrides", label: "Overrides row" },
        ],
        render(el, state) {
            if (state === "notes") state = "notes-row"; // older links (the tree) used "notes"
            if (state === "data") state = "everything";
            const base = { builtin: true, menu: MENU, kind: "Built-in row" };
            if (state === "selection") {
                el.append(A.inspector(Object.assign(base, { icon: "scan", title: "Selection", kindKey: "selection-row", tab: "Style", tabs: { Style: selectionBody, Data: selectionData } })));
            } else if (state.startsWith("notes")) {
                el.append(A.inspector(Object.assign(base, {
                    icon: "message-square", title: "Notes", kindKey: "notes-row", tab: state === "notes-data" ? "Data" : "Style",
                    tabs: { Style: () => notesStyle(state), Data: notesData },
                })));
            } else if (state === "overrides") {
                el.append(A.inspector(Object.assign(base, { icon: "pencil", title: "Overrides", body: overridesBody() })));
            } else {
                el.append(A.inspector(Object.assign(base, {
                    icon: "base-layer", title: "Everything", kindKey: "everything-row", tab: "Style",
                    tabs: { Style: () => everythingStyle(state), Data: everythingData },
                })));
            }
        },
    });
})();
