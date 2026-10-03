/* Inspector: the built-in rows of the paint tree -- Selection (top, pinned), Notes (starts under
   Selection), Overrides (under Notes once it holds something) and Everything (bottom, pinned).
   Everything and Notes: the one Style tab (AB.styleTab) and a Data tab. Selection: one body, three lines.
   Overrides: one body, a list of edits (spec: no tabs; one shared value cannot describe per-element edits). Plain ASCII. */
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
        if (ds === "doorEntries") return { nodes: f(X.doorEntries.loadedTypes().total), edges: f(X.doorEntries.loadedEdges()) };
        if (ds === "transactions") return { nodes: f(X.transactions.nodes), edges: f(X.transactions.edges) };
        const pc = ds && ds !== "lesmis" && A.projectCounts && A.projectCounts(ds);
        if (pc) return { nodes: f(pc.nodes), edges: f(pc.edges) };
        return { nodes: L().nodes, edges: L().edges };
    };
    const MENU = ["context-menus", "row"];

    // ---------- Selection: graphty-element's selection style (GraphStyle.ts: #FFD700, 1.45, 0.4) ----------
    // selectionStyle's only fields are color, scale and opacity, so the body is exactly three lines --
    // Color, Size, Opacity (percent) -- with no "+", bind or "-" (spec 3.7). Not styleTab: it folds opacity
    // into Color, and these are three project settings, not a painting row's sections. Nodes only:
    // graphty-element's selectionStyle paints nodes (Node.ts).
    function selectionBody() {
        const num = (name, value, range, suffix) => {
            const inp = h("input", { class: "ab-sin k-num", type: "text", inputmode: "decimal", value: String(value), "aria-label": name, spellcheck: "false" });
            // the one typed-number rule (lib's styleTab): Enter keeps the value, Esc puts the last one back
            inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") inp.value = String(value); if (e.key === "Enter" || e.key === "Escape") inp.blur(); });
            inp.addEventListener("change", () => { value = inp.value.trim(); });
            const label = h("span", null, name);
            A.scrub(label, inp, { range });
            return A.fieldRow(label, [inp, suffix ? h("span", { class: "k-secondary" }, suffix) : null]);
        };
        // No Paints line: the row's count follows the selection and is blank when nothing is selected (this route).
        // The two marks are note-only lines (data-needs): the 240 px Color line has no room for a chip, and the eye lives in the tree.
        return [
            A.fieldRow("Color", A.colorField({ name: "Color", hex: "#FFD700", pct: null })),
            num("Size", 1.45, [0, null]),
            num("Opacity", 40, [0, 100], "%"),
            h("div", { class: "ab-cap k-secondary", "data-needs": "" }, "Default color:", A.needsElement("The default gold on the default whitesmoke canvas measures about 1.3:1, under the 3:1 of WCAG 1.4.11. The element's default must pass. The selection style paints nodes only; an edge side is filed.")),
            h("div", { class: "ab-cap k-secondary", "data-needs": "" }, "The row's eye:", A.needsElement("graphty-element draws the selection highlight outside the layer stack and has no switch to stop drawing it. The app must not fake one by writing opacity 0, which would overwrite the reader's own Opacity.")),
        ];
    }

    // ---------- Everything: the element's base style as lines; edits go to the Everything layer ----------
    // Base values: the one base style, AB.BASE_STYLE in lib.js (the gray the canvas drawings paint).
    function everythingStyle(state) {
        const mine = A.boundOn(ID + "/" + state);
        const edited = state === "everything-edited" || Object.keys(mine).length > 0;
        // In Les Miserables PageRank paints every node's Color over this fill, so the line says so
        // rather than let the swatch seem to disagree with the orange canvas (the paint-order grammar).
        const ds = A.route && A.route.frame.dataset, n = C().nodes;
        const covered = (!ds || ds === "lesmis") && !mine["node.color"]
            ? ["Covered by ", A.link("inspector-measure-row", "style", "PageRank", { class: "ab-link" }), " for Color on " + n + " of " + n + " nodes"] : null;
        return A.styleTab({
            kinds: ["node", "edge"], kind: state === "everything-edges" ? "edge" : "node",
            base: A.BASE_STYLE, set: state === "everything-edited" ? { "node.size": 1.5 } : {}, changed: state === "everything-edited" ? ["node.size"] : [], bound: mine,
            paints: "Paints " + C().nodes + " nodes, " + C().edges + " edges",
            order: covered && !edited ? covered : edited ? "Your change is in the Everything layer, under every other row" : "Default look, under every other row",
        });
    }
    function everythingData() {
        return A.dataTab({
            Summary: [A.data("Covers", "every node and edge")],
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
        // each member selects itself, as a canvas hot spot or a table row does (the shell's one way to select a node)
        const rows = A.fx.datasets.lesmis.rows;
        return { nodes: ["Valjean", "Javert", "Napoleon"].map((n) => [n, () => A.selectNode("lesmis", rows.findIndex((r) => r.label === n))]), edges: [["Javert -- Valjean", ["inspector-edge", "data"]]], notes: 4, list: ["notes-place", "all"],
            caption: "Napoleon's note is about a node a filter step removes; he is painted only while he is in the graph." };
    }
    const plural = (k, w) => k + " " + w + (k === 1 ? "" : "s");
    const notedText = (N) => plural(N.nodes.length, "node") + (N.edges.length ? ", " + plural(N.edges.length, "edge") : "");
    // No layer until a look is added (graphty-element refuses a layer that writes nothing, and a layer paints
    // nodes or edges, not both): the first look on a side adds that side's layer, the Everything pattern.
    // Its selector reads graphty-element's note count (notes.count > `0`), so a look added here (an outline,
    // a label bound to Note count) draws only on the noted elements. The canvas owns that scope
    // (canvas-and-states.js lmScope(), which still applies a row titled "Notes" to every node, and paints
    // no row's outline); this panel only states it.
    function notesStyle(state) {
        const N = noted(), empty = state === "notes-row";
        // the count is the link; the hint after it is plain text
        // A look on the Nodes side adds only the node layer, so the Paints line counts only the noted nodes
        // (the shared rule: a side is counted only when the row sets something on it)
        const paints = A.paintsLine("Paints " + (empty ? notedText(N) : plural(N.nodes.length, "node")) + " (noted)", N.list);
        if (empty) paints.replaceChildren(h("span", null, [...paints.childNodes], ". Nothing set -- + to add a look")); // one flow, so it wraps as a sentence
        const look = state === "notes-row-outlined" ? { set: { "node.outline": "#D55E00" } }
            : state === "notes-row-label" ? { labels: [{ pos: "Below", field: "Note count", type: "num" }] } : {};
        return A.styleTab(Object.assign({ kinds: ["node", "edge"], kind: "node", paints, order: empty ? null : "In the Notes node layer; no edge layer yet" }, look));
    }
    function notesData() {
        const N = noted();
        if (!N.notes) return A.dataTab({ Summary: [A.empty("No notes.", { verb: "Add note", key: "N", onClick: () => A.addNote() }), A.data("Paints", "0 nodes")] }, { kind: "notes-row" });
        const secs = A.dataTab({
            Summary: [A.data("Noted elements", notedText(N)), A.data("Notes about them", String(N.notes), { go: N.list }),
                A.data("Shown or hidden", "by this row's eye only")],
            Members: [N.nodes.map(([n, go]) => A.row(typeof go === "function" ? { label: n, onClick: go } : { label: n, go })), N.edges.map(([n, go]) => A.row({ icon: "spline", label: n, go })),
                h("div", { class: "ab-cap k-secondary" }, N.caption)],
        }, { kind: "notes-row" });
        const head = secs.map((s) => s.querySelector(".k-section-head")).find((hd) => hd && hd.textContent.trim() === "Members");
        if (head) head.append(A.link(N.list[0], N.list[1], "In Notes", { class: "ab-link" }));
        return secs;
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
        return [A.paintsLine("Paints 1 node", ["inspector-node", "edited"]), list,
            h("div", { class: "ab-cap k-secondary", "data-needs": "" }, "Element form:", A.openQuestion("To confirm with graphty-element: one id-keyed binding per property (encode with a per-value map) as the element form of Overrides."))];
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
            { id: "everything-data", label: "Everything row, Data" },
            { id: "notes-row", label: "Notes row, nothing set" },
            { id: "notes-row-outlined", label: "Notes row, outline added" },
            { id: "notes-row-label", label: "Notes row, Label Below: Note count" },
            { id: "notes-data", label: "Notes row, Data" },
            { id: "overrides", label: "Overrides row" },
        ],
        render(el, state) {
            if (state === "notes") state = "notes-row"; // older links (the tree) used "notes"
            if (state === "data") state = "everything-data";
            const base = { builtin: true, menu: MENU, kind: "Built-in row" };
            if (state === "selection") {
                el.append(A.inspector(Object.assign(base, { icon: "scan", title: "Selection", body: selectionBody() })));
            } else if (state.startsWith("notes")) {
                el.append(A.inspector(Object.assign(base, {
                    icon: "message-square", title: "Notes", kindKey: "notes-row", tab: state === "notes-data" ? "Data" : "Style",
                    tabs: { Style: () => notesStyle(state), Data: notesData },
                })));
            } else if (state === "overrides") {
                el.append(A.inspector(Object.assign(base, { icon: "pencil", title: "Overrides", body: overridesBody() })));
            } else {
                el.append(A.inspector(Object.assign(base, {
                    icon: "base-layer", title: "Everything", kindKey: "everything-row", tab: state === "everything-data" ? "Data" : "Style",
                    tabs: { Style: () => everythingStyle(state), Data: everythingData },
                })));
            }
        },
    });
})();
