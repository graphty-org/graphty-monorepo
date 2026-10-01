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
    // Everything covers the graph on screen: Les Miserables, or the door entries or transfers project it opened from
    const C = () => {
        const ds = A.route && A.route.frame.dataset, X = A.fx.datasets, f = (v) => Number(v).toLocaleString("en-US");
        if (ds === "doorEntries") return { nodes: f(X.doorEntries.loadedTypes().total), edges: f(X.doorEntries.loadedEdges()), dockN: "door-entries-nodes", dockE: "door-entries" };
        if (ds === "transactions") return { nodes: f(X.transactions.nodes), edges: f(X.transactions.edges), dockN: "transfers", dockE: "transfers" };
        return { nodes: L().nodes, edges: L().edges, dockN: "nodes", dockE: "edges" };
    };
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
            paints: "Paints " + C().nodes + " nodes, " + C().edges + " edges",
            order: edited ? "Your change is in the Everything layer, under every other row" : "Default look, under every other row",
        });
    }
    function everythingData() {
        return A.dataTab({
            Summary: [A.data("Covers", "every node and edge"), A.data("Nodes", C().nodes, { go: ["table-dock", C().dockN] }), A.data("Edges", C().edges, { go: ["table-dock", C().dockE] }), A.data("Position", "under every other row")],
        }, { kind: "everything" });
    }

    // ---------- Notes: paints the nodes and edges notes are about, in the project on screen ----------
    // Les Miserables: the Notes place's notes are about 3 nodes and 1 edge (Valjean, Javert, Napoleon;
    // Javert -- Valjean), 4 notes in all. The door entries: Ana Ruiz and B1, and the pair edge Ana Ruiz
    // -> B1 while the entries are loaded per Pair (B12's note is about a building the load left out).
    // The transfers hold no notes. Count from the fixtures; the spec's "4 nodes" is a slip.
    function noted() {
        const ds = A.route && A.route.frame.dataset;
        if (ds === "doorEntries" && !A.fx.datasets.doorEntries.hasNotes()) return { nodes: [], edges: [], notes: 0, list: ["notes-place", "door-entries"] };
        if (ds === "doorEntries") {
            const pair = A.fx.datasets.doorEntries.loaded.per === "pair";
            return { nodes: [["Ana Ruiz", ["inspector-node", "door-ana"]], ["B1", ["inspector-node", "door-b1"]]], edges: pair ? [["Ana Ruiz -> B1", ["inspector-edge", "door-pair"]]] : [], notes: pair ? 2 : 1, list: ["notes-place", "door-entries"],
                caption: "B12's note is about a building the load left out; it is painted only once B12 is in the graph." };
        }
        if (ds === "transactions") return { nodes: [], edges: [], notes: 0, list: ["notes-place", "all"] };
        return { nodes: ["Valjean", "Javert", "Napoleon"].map((n) => [n, ["inspector-node", "data"]]), edges: [["Javert -- Valjean", ["inspector-edge", "data"]]], notes: 4, list: ["notes-place", "all"],
            caption: "Napoleon's note is about a node a filter step removes; he is painted only while he is in the graph." };
    }
    const plural = (k, w) => k + " " + w + (k === 1 ? "" : "s");
    const notedText = (N) => plural(N.nodes.length, "node") + (N.edges.length ? ", " + plural(N.edges.length, "edge") : "");
    // No layer until a look is added (graphty-element refuses a layer that writes nothing, and a layer paints
    // nodes or edges, not both): the first look on a side adds that side's layer, the Everything pattern.
    // Its selector reads graphty-element's note count (notes.count > `0`), so a label bound to Note count
    // draws only on the noted elements.
    function notesStyle(state) {
        const N = noted(), empty = state === "notes-row";
        const paints = A.paintsLine(empty ? "Notes are about " + notedText(N) + ". Nothing set, so nothing paints: + to add a look" : "Paints " + notedText(N) + " (noted)", N.list);
        const look = state === "notes-row-outlined" ? { set: { "node.outline": "#D55E00" } }
            : state === "notes-row-label" ? { labels: [{ pos: "Below", field: "Note count", type: "num" }] } : {};
        return A.styleTab(Object.assign({ kinds: ["node", "edge"], kind: "node", paints, order: empty ? null : "In the Notes node layer; no edge layer yet" }, look));
    }
    function notesData() {
        const N = noted();
        if (!N.notes) return A.dataTab({ Summary: [A.empty("No notes.", { verb: "Add note", key: "N", onClick: () => A.addNote() }), A.data("Paints", "0 nodes")] }, { kind: "notes-row" });
        return A.dataTab({
            Summary: [A.data("Noted elements", notedText(N)), A.data("Notes about them", String(N.notes), { go: N.list })],
            Members: [N.nodes.map(([n, go]) => A.row({ label: n, go })), N.edges.map(([n, go]) => A.row({ icon: "spline", label: n, go })),
                h("div", { class: "ab-cap k-secondary" }, N.caption)],
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
