/* Inspector: the built-in rows of the paint tree -- Selection (top, pinned), Notes (starts under
   Selection, dragged like any row), Overrides (pinned under Selection once it holds something) and
   Everything (bottom, pinned). Every one opens with the one Paints line (AB.paintsLine). Selection
   and Everything have one body (Style, no tab strip): Selection edits graphty-element's three
   selection highlight fields; Everything shows every property with graphty-element's defaults,
   read only until the element lets them be edited. Notes and Overrides use the one Style tab
   (AB.styleTab) and a Data tab. Plain ASCII. */
(function () {
    const A = window.AB;
    const ID = "inspector-selection-and-everything";

    if (!document.getElementById("isx-style")) {
        document.head.append(h("style", { id: "isx-style" }, `
.isx-cap { padding: 4px 16px 8px; }
.isx-ro .ab-style-body .ab-sv, .isx-ro .ab-style-body .k-icon-btn { pointer-events: none; opacity: .55; }
`));
    }

    const L = () => A.fx.datasets.lesmis;
    const cap = (...kids) => h("div", { class: "ab-cap k-secondary isx-cap" }, kids);
    const MENU = ["context-menus", "row"];

    // ---------- Selection: graphty-element's selectionStyle, three fields, no "+" ----------
    // Defaults are the element's schema defaults (graphty-element/src/config/GraphStyle.ts).
    // The same frame as every row: a Paints line, then one property section.
    function selectionBody() {
        // The Style tab's own property line (name, value field), without bind and "-": these three
        // fields are graphty-element's selectionStyle, not style descriptors
        const line = (name, value, target, swatch) => h("div", { class: "ab-sline" }, h("span", { class: "ab-sname" }, name),
            h("span", Object.assign({ class: "k-field ab-sv", role: "button" }, A.act({ go: ["style-pickers", target] })), swatch ? A.chit(swatch) : null, h("span", { class: "k-grow k-ellipsis" }, value)));
        return [
            A.paintsLine("the selected nodes: nothing selected", { title: "Color, scale and opacity for each selected node. Saved with the project." }),
            A.section({ title: "Highlight", count: 3, countLabel: "3 properties", collapsible: true, key: "selection.highlight", summary: "Color #FFD700 . Scale 1.45 . Opacity 0.4" },
                line("Color", "#FFD700", "color", "#FFD700"),
                line("Scale", "1.45", "token-edit"),
                line("Opacity", "0.4", "token-edit"),
                h("div", { class: "ab-cap" }, A.needsElement("The default gold #FFD700 on the default whitesmoke canvas measures about 1.3:1, under the 3:1 of WCAG 1.4.11. The element's default must pass."))),
            h("div", { class: "ab-cap k-secondary", title: "Your own three values can replace these on this device only. That is a personal display setting, not styling: the project keeps these." },
                A.icon("info", "sm"), " Your device can override: ", A.link("settings", "accessibility", "Settings")),
        ];
    }

    // ---------- Everything: graphty-element's default layers, as one row ----------
    // Every property, collapsed to one-line summaries, each with its effective value. The set values
    // are the element's defaultNodeStyle and defaultEdgeStyle (graphty-element/src/config); the rest
    // show what the element draws when nothing sets them. STAND-IN: the real app reads each
    // descriptor's default, which graphty-element does not publish yet (spec section 19).
    const DEFAULTS = {
        "node.color": "#6366F1", "node.shape": "icosphere", "node.size": 1, "node.opacity": 1, "node.glowStrength": 0,
        "node.labelStyle": "Default", "node.tooltipStyle": "Top right, black on white",
        "edge.color": "#A9A9A9", "edge.width": 8, "edge.style": "solid", "edge.animationSpeed": 0, "edge.arrowHead": "normal", "edge.opacity": 1,
        "edge.patternCount": 2, "edge.arrowHeadSize": 1, "edge.arrowHeadOpacity": 1, "edge.arrowTail": "none", "edge.arrowTailSize": 1, "edge.arrowTailOpacity": 1,
        "edge.arrowHeadColor": "Line color", "edge.arrowTailColor": "Line color", "edge.labelStyle": "Default", "edge.arrowHeadTextStyle": "Default", "edge.arrowTailTextStyle": "Default",
    };
    function everythingStyle() {
        const tab = A.styleTab({ kinds: ["node", "edge"], set: {}, all: DEFAULTS, collapseAll: true });
        return [
            A.paintsLine("every node and edge: ", A.link("table-dock", "nodes", L().nodes + " nodes"), ", ", A.link("table-dock", "edges", L().edges + " edges"),
                { title: "graphty-element's own defaults, always the bottom row: every row above wins, property by property." }),
            h("div", { class: "isx-ro" }, tab),
        ];
    }

    // ---------- Notes: a style layer over the nodes and edges notes are about ----------
    // The node notes in notes-place: Valjean, Javert and Napoleon.
    const NOTED = ["Valjean", "Javert", "Napoleon"];
    function notesStyle(outlined) {
        const n = NOTED.length + " nodes";
        const paints = A.paintsLine("the elements notes are about: ", A.link("notes-place", "all", n), outlined ? null : ". No look until you add one", " ",
            A.needsElement("graphty-element has no reserved notes layer yet (source by element, reason notes); until it does, the app paints this row with a temporary layer over the noted ids."),
            { title: "Only nodes and edges a note is about. Notes about a row or the graph paint nothing." });
        return [paints, A.styleTab({ kinds: ["node", "edge"], kind: "node", set: outlined ? { "node.outline": "#D55E00" } : {}, openSection: outlined ? "Effects" : null })];
    }
    function notesData() {
        const row = (name) => A.row({ label: name, go: ["inspector-node", "data"] });
        return [
            A.section("Summary", A.data("Noted elements", NOTED.length + " nodes"), A.data("Notes about them", "3", { go: ["notes-place", "all"] })),
            A.section({ title: "Members", count: NOTED.length }, NOTED.map(row),
                cap("Napoleon's note is about an element a filter step removes; it paints only while he is in the graph.")),
            A.section("Notes", A.data("Read and write them in", A.link("notes-place", "all", "the Notes list"))),
        ];
    }

    // ---------- Overrides: hand edits to single elements, written from "Why this look" ----------
    function overridesStyle() {
        return [
            A.paintsLine("the elements edited by hand: ", A.link("inspector-node", "edited", "1 node"), { title: "Fixed values set by hand on single elements. Each one wins over every analysis row and can be hidden with this row's eye or removed here." }),
            A.styleTab({ kinds: ["node"], set: { "node.color": "#E41A1C" }, openSection: "Fill" }),
        ];
    }
    function overridesData() {
        return [
            A.section("Summary", A.data("Elements", "1 node")),
            A.section({ title: "Members", count: 1 },
                A.row({ label: "Valjean", swatch: A.chit("#E41A1C", true), trail: "Color", go: ["inspector-node", "edited"] })),
            A.notesSection(0),
        ];
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
            { id: "everything", label: "Everything row (one body: Style)" },
            { id: "notes-row", label: "Notes row, nothing set" },
            { id: "notes", label: "Notes row (the tree's link)" },
            { id: "notes-row-outlined", label: "Notes row, outline added" },
            { id: "notes-data", label: "Notes row, Data" },
            { id: "overrides", label: "Overrides row" },
        ],
        render(el, state) {
            if (state === "data") state = "everything"; // version 2 had a Data tab on Everything
            const base = { builtin: true, menu: MENU };
            if (state === "selection") {
                el.append(A.inspector(Object.assign(base, { icon: "scan", title: "Selection", kind: "Built-in row", body: selectionBody() })));
                return;
            }
            if (state === "notes" || state === "notes-row" || state === "notes-row-outlined" || state === "notes-data") {
                el.append(A.inspector(Object.assign(base, {
                    icon: "message-square", title: "Notes", kind: "Built-in row", kindKey: "notes-row",
                    tab: state === "notes-data" ? "Data" : "Style",
                    tabs: { Style: () => notesStyle(state === "notes-row-outlined"), Data: notesData },
                })));
                return;
            }
            if (state === "overrides") {
                el.append(A.inspector(Object.assign(base, { icon: "pencil", title: "Overrides", kind: "Built-in row", kindKey: "overrides-row", tab: "Style", tabs: { Style: overridesStyle, Data: overridesData } })));
                return;
            }
            // The swatch is the resolved default fill, the same one the tree and "Why this look" draw
            el.append(A.inspector(Object.assign(base, { icon: "square-filled", title: "Everything", kind: [A.chit("#6366F1"), " Built-in row"], kindKey: "everything-row", body: everythingStyle() })));
        },
    });
})();
