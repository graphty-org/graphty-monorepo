/* Main menu: the rail's top button. A dark menu of submenus (File, Edit, View, Analyze, Recipes,
   Help) and Preferences..., cascading to the right. Each state opens one submenu; Open recent and
   the four Analyze catalog groups have their own states for the third level.
   Only the overlay region is drawn; the frame underneath is the app at rest. Plain ASCII. */
(function () {
    const flash = (what) => () => AB.flash(what + " (not wired in the skeleton)");

    // Display toggles flip in place (a reader setting; which are on by default is open, see below).
    const display = { labels: true, arrows: false, legend: true, minimap: false, notes: true };
    let redraw = null;
    const toggle = (key) => () => { display[key] = !display[key]; if (redraw) redraw(); };

    const RECENTS = [
        { name: "Mule ring review", when: "Today 09:14" },
        { name: "Knockdown screen, September", when: "Yesterday" },
        { name: "March transfers", when: "Sep 24" },
        { name: "Patent citations 1999-2001", when: "Sep 19" },
    ];

    // The Analyze catalog, grouped by what a run adds to the tree (same groups as the Analyze popover).
    const CATALOG = {
        "analyze-rank": {
            label: "Rank nodes and edges", adds: "Adds a measure row that paints when it finishes",
            items: ["PageRank", "Degree", "Betweenness", "Closeness", "Eigenvector", "Edge betweenness"],
        },
        "analyze-groups": {
            label: "Find groups", adds: "Adds a run row with one child row per group",
            items: ["Louvain", "Leiden", "Label propagation", "Connected components", "k-core"],
        },
        "analyze-paths": {
            label: "Find paths", adds: "Adds a path run row",
            items: ["Shortest path", "All shortest paths", "Minimum spanning tree"],
        },
        "analyze-measure": {
            label: "Measure the graph", adds: "Adds a run row with readings and no eye",
            items: ["Density", "Diameter", "Clustering coefficient", "Link prediction", "Node similarity"],
        },
    };

    const TOP = [
        { id: "file", label: "File" },
        { id: "edit", label: "Edit" },
        { id: "view", label: "View" },
        { id: "analyze", label: "Analyze" },
        { id: "recipes", label: "Recipes" },
        { id: "help", label: "Help" },
    ];

    function sub(id) {
        switch (id) {
            case "file": return [
                { label: "New project", go: ["graph-place", "empty"] },
                { label: "Open...", shortcut: "Ctrl+O", go: ["load-step", "preview"] },
                { label: "Open recent", sub: true, go: ["main-menu", "file-recent"] },
                { sep: true },
                { label: "Save", shortcut: "Ctrl+S", onClick: flash("Save") },
                { label: "Save as...", shortcut: "Ctrl+Shift+S", onClick: flash("Save as") },
                { sep: true },
                { label: "Add data...", go: ["load-step", "join"] },
                { label: "Paste data", shortcut: "Ctrl+V", go: ["load-step", "preview"] },
                { sep: true },
                { label: "Export...", go: ["export-dialog", "figure"] },
            ];
            case "edit": return [
                { label: "Undo", shortcut: "Ctrl+Z", onClick: flash("Undo") },
                { label: "Redo", shortcut: "Ctrl+Shift+Z", onClick: flash("Redo") },
                { label: "Undo history", go: ["full-canvas-modes", "version-history"] },
                { sep: true },
                { label: "Select all visible", shortcut: "Ctrl+A", onClick: flash("Select all visible") },
                { label: "Invert selection", shortcut: "I", onClick: flash("Invert selection") },
                { label: "Previous selection", onClick: flash("Previous selection") },
                { label: "Select same value", desc: "Needs a selection", disabled: true },
                { label: "Select edges between", desc: "Needs two or more nodes selected", disabled: true },
                { label: "Copy ids", desc: "Needs a selection", disabled: true },
                { sep: true },
                { label: "Create set", shortcut: "Ctrl+G", desc: "Needs a selection", disabled: true },
                { label: "Filter to neighbors", desc: "Needs a selection", disabled: true },
                { label: "Hide on canvas", shortcut: "Ctrl+Shift+H", desc: "Needs a selection", disabled: true },
                { label: "Show all", go: ["graph-place", "show-hidden"] },
            ];
            case "view": return [
                { label: "2D", shortcut: "5", check: true, go: ["zoom-and-view-menu", "2d"] },
                { label: "3D", shortcut: "5", go: ["zoom-and-view-menu", "3d"] },
                { label: "Enter VR", onClick: flash("Enter VR") },
                { label: "Enter AR", onClick: flash("Enter AR") },
                { sep: true },
                { label: "Toggle panels", shortcut: "Ctrl+B", onClick: flash("Toggle panels") },
                { label: "Table", shortcut: "Shift+T", check: true, go: ["table-dock", "nodes"] },
                { label: "Time slider", shortcut: "T", desc: "This graph has no time attribute", disabled: true },
                { sep: true },
                { heading: "Show on canvas" },
                { label: "Labels", check: display.labels, onClick: toggle("labels") },
                { label: "Arrows", check: display.arrows, onClick: toggle("arrows") },
                { label: "Legend", shortcut: "L", check: display.legend, onClick: toggle("legend") },
                { label: "Minimap", shortcut: "M", check: display.minimap, onClick: toggle("minimap") },
                { label: "Note markers", shortcut: "Shift+N", check: display.notes, onClick: toggle("notes") },
            ];
            case "analyze": return [
                ...Object.keys(CATALOG).map((k) => ({ label: CATALOG[k].label, sub: true, go: ["main-menu", k] })),
                { sep: true },
                { label: "All algorithms...", shortcut: "A", go: ["analyze-popover", "all-algorithms"] },
                { label: "New graph from...", desc: "Projections and samples add a graph, not a row", go: ["graphs-switcher", "new-graph-from"] },
                { sep: true },
                { label: "Re-run layout", onClick: flash("Re-run layout") },
            ];
            case "recipes": return [
                { label: "Apply recipe...", go: ["recipe-apply", "binding"] },
                { label: "Apply style file on top...", onClick: flash("Apply style file on top") },
                { label: "Replace style with style file...", onClick: flash("Replace style with style file") },
                { sep: true },
                { label: "Save as recipe...", onClick: flash("Save as recipe") },
                { label: "Export style...", onClick: flash("Export style") },
                { label: "Use as overview...", onClick: flash("Use as overview") },
            ];
            case "help": return [
                { label: "Keyboard shortcuts", shortcut: "?", go: ["commands-and-search", "shortcuts"] },
                { label: "Documentation", onClick: flash("Documentation") },
                { label: "Report a problem", onClick: flash("Report a problem") },
                { sep: true },
                { label: "About", onClick: flash("About") },
            ];
        }
        return [];
    }

    function third(state) {
        if (state === "file-recent") return [
            ...RECENTS.map((r) => ({ label: r.name, shortcut: r.when, onClick: flash("Open " + r.name) })),
            { sep: true },
            { label: "Show start screen", go: ["start-screen", "returning"] },
        ];
        const g = CATALOG[state];
        return [
            { heading: g.adds },
            ...g.items.map((name) => ({ label: name, go: name === "PageRank" ? ["analyze-popover", "essentials"] : ["analyze-popover", "open"] })),
        ];
    }

    const parentOf = (state) => (state === "file-recent" ? "file" : CATALOG[state] ? "analyze" : state);

    const openQ = (text) => AB.h("div", { class: "k-tooltip", style: "position:absolute;max-width:260px;background:var(--cm-bg-brand);pointer-events:none", role: "note" }, "Open question: " + text);

    function draw(el, state) {
        el.replaceChildren();
        if (state === "closed") {
            // At rest: nothing open; the rail button's tooltip is the only trace.
            el.append(AB.position(h("div", { class: "k-tooltip", style: "position:absolute;pointer-events:none" }, "Main menu"), "#ab-rail-menu", "right-start"));
            return;
        }
        const open = parentOf(state);
        const top = AB.menu({
            anchor: "#ab-rail-menu", place: "right-start",
            items: [
                ...TOP.map((t) => ({ label: t.label, sub: true, go: ["main-menu", t.id] })),
                { sep: true },
                { label: "Preferences...", shortcut: "Ctrl+,", go: ["preferences", "general"] },
            ],
        });
        top.setAttribute("aria-label", "Main menu");
        el.append(top);
        const idx = TOP.findIndex((t) => t.id === open);
        const openItem = top.querySelectorAll(".k-menu-item")[idx];
        if (openItem) { openItem.dataset.hover = ""; openItem.setAttribute("aria-expanded", "true"); }

        const second = AB.menu({ anchor: openItem, place: "right-start", items: sub(open) });
        second.setAttribute("aria-label", TOP[idx].label);
        second.style.marginTop = "-8px"; // line the first item up with its parent item
        el.append(second);

        if (open !== state) {
            const items = sub(open);
            const target = items.findIndex((it) => it.go && it.go[1] === state);
            const anchorItem = second.querySelectorAll(".k-menu-item")[items.slice(0, target).filter((it) => !it.sep && !it.heading).length];
            if (anchorItem) { anchorItem.dataset.hover = ""; anchorItem.setAttribute("aria-expanded", "true"); }
            const m3 = AB.menu({ anchor: anchorItem, place: "right-start", items: third(state) });
            m3.style.marginTop = "-8px";
            el.append(m3);
        }
        if (open === "view") {
            el.append(AB.position(openQ("which display toggles are on for a new project, and whether VR and AR show when no headset is reported"), second, "below-start"));
        }
    }

    registerSection({
        id: "main-menu",
        title: "Main menu",
        region: "overlay",
        rail: "graph",
        frame: { left: "graph-place/at-rest" },
        closeTo: "graph-place",
        states: [
            { id: "file", label: "File" },
            { id: "edit", label: "Edit" },
            { id: "view", label: "View" },
            { id: "analyze", label: "Analyze" },
            { id: "recipes", label: "Recipes" },
            { id: "help", label: "Help" },
            { id: "file-recent", label: "File, Open recent" },
            { id: "analyze-rank", label: "Analyze, Rank nodes and edges" },
            { id: "analyze-groups", label: "Analyze, Find groups" },
            { id: "analyze-paths", label: "Analyze, Find paths" },
            { id: "analyze-measure", label: "Analyze, Measure the graph" },
            { id: "closed", label: "Closed" },
        ],
        render(el, state) {
            redraw = () => draw(el, state);
            draw(el, state);
        },
    });
})();
