/* Graph place, version 3: the paint tree. Top to bottom: the title line (a quiet "Graph", then the
   graphs switcher and the graph's note count), the treebar (Find rows and notes, the list options
   ellipsis), the tree in paint order (Selection pinned at the top, Notes under it, Overrides under
   Notes once it holds something, Everything pinned at the bottom), and one footer line, the most
   specific message winning. Every row is drawn by the shared AB.tree: status is an icon in the kind
   slot with its sentence in the tooltip; the only line under a row is a running progress bar.
   Rename is a double-click on the name (or F2). Plain ASCII.

   Numbers: Les Miserables from kit/fixtures.json (77 nodes, the "group" legend, the "Filter to
   degree >= 2" step: 77 to 60 nodes). The Louvain communities and the paths are not in the
   fixtures; they were computed on graphty-element's examples/data/miserables.json with networkx
   3.1: Louvain weighted by value, resolution 1.0, seed 7 (6 communities of 25, 17, 10, 10, 9 and
   6; Community 3 is Myriel's), shortest paths Valjean-Javert and Myriel-Valjean-Javert. Note
   counts follow the Notes place's seven notes: one about Louvain, two about Community 3, one about
   the graph, and the Notes row paints the 3 nodes and 1 edge notes are about. The many-groups
   state uses the transfers March Louvain run from the fixtures (35 communities). Les Miserables is
   one connected component, so Connected components finds 1 group of 77 (the one-group state). The
   wide, nested and plain JSON projects (kit/wide-nested.json) are just loaded: no rows yet. */
(function () {
    "use strict";
    const CSS = `
.gp-drop-reason { list-style: none; display: flex; gap: 6px; align-items: flex-start; margin: 0 8px 0 56px; padding: 4px 8px; border-radius: 5px; background: var(--cm-bg-toolbar, #222); color: var(--cm-text-menu, #fff); font-size: 11px; line-height: 16px; color-scheme: dark; }
.gp-tree .ab-trow[data-drop-bad] { outline: 1px solid var(--cm-border-danger, var(--cm-text-danger)); outline-offset: -1px; }
.gp-ghost { list-style: none; display: flex; align-items: center; gap: 6px; height: 28px; margin: 0 8px 0 40px; padding: 0 8px; border-radius: 5px; outline: 1px dashed var(--cm-border-strong); background: var(--cm-bg); box-shadow: var(--cm-elevation-200, 0 2px 8px #0003); opacity: .9; }
body.gp-nodrop, body.gp-nodrop * { cursor: no-drop !important; }
.gp-runfind { cursor: default; display: flex; gap: 4px; align-items: center; padding: 2px 8px 4px 16px; }
.gp-runfind .ab-find { height: 22px; }
.gp-find-head { padding: 8px 16px 2px; font-size: 11px; line-height: 16px; font-weight: 550; color: var(--cm-text-secondary); }
.gp-hit { display: flex; align-items: center; gap: 6px; min-height: 28px; margin: 0 8px; padding: 2px 8px; border-radius: 5px; cursor: pointer; }
.gp-hit:hover { background: var(--cm-bg-hover); }
.gp-hit-text { flex: 1 1 auto; min-width: 0; }
.gp-hit-sub { display: block; font-size: 11px; line-height: 15px; color: var(--cm-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gp-hit mark { background: var(--cm-bg-warning, #fde68a); color: #1A1A1A; border-radius: 2px; } /* dark text on the yellow in both themes */
.gp-notes-go { cursor: pointer; border-radius: 3px; }
.gp-notes-go:hover { color: var(--cm-text); text-decoration: underline; }
.gp-inside { display: inline-flex; align-items: center; justify-content: center; flex: none; min-width: 16px; height: 16px; padding: 0 3px; box-sizing: border-box; border: 1px dashed var(--cm-border-strong); border-radius: 8px; color: var(--cm-text-secondary); font-size: 11px; line-height: 14px; }
.gp-stack { box-shadow: 3px -3px 0 -1px var(--gp-stack2), 3px -3px 0 0 var(--cm-bg); margin-inline-end: 3px; }
`;
    if (!document.getElementById("gp-style")) document.head.append(h("style", { id: "gp-style" }, CSS));

    const RUN_LABEL = "a run's name is its label, which graphty-element keeps read-only; a run is named by its algorithm, and a second run of the same algorithm is numbered (Louvain 2)";
    const GROUP_LABEL = "a run's groups renumber when it reruns; Keep as set (in the row's menu) to name one";
    // A run is named by its algorithm; "For the report" already holds a Betweenness, so this one is
    // the second (its options live in its Data tab, never in its name)
    const BT_NEW = "Betweenness 2";
    // The count column counts members: a run's members are its groups
    const groups = (n) => AB.count(n, "group");
    // Renames made this session, by row id, so a rename survives the redraw a navigation causes
    const renamed = {};

    // Louvain on Les Miserables (see the header comment for how these were computed)
    const LOUVAIN = [
        { n: 1, size: 25, color: "#E69F00" },
        { n: 2, size: 17, color: "#56B4E9" },
        { n: 3, size: 10, color: "#009E73", notes: 2 },
        { n: 4, size: 10, color: "#0072B2" },
        { n: 5, size: 9, color: "#D55E00" },
        { n: 6, size: 6, color: "#CC79A7" },
    ];

    // When another section drives the frame, the tree marks the row the inspector beside it shows.
    function fromInspector() {
        const r = AB.route;
        if (!r || r.id === "graph-place" || !r.frame.right) return null;
        const [id, st = ""] = String(r.frame.right).split("/");
        let row = {
            "inspector-measure-row": st === "edge-measure" || st === "edge-measure-data" ? null : st === "degree" ? "degree" : "pagerank",
            "inspector-run-row": st === "readings-only" ? null : "louvain",
            "inspector-folder": "folder",
            "inspector-selection-and-everything": { selection: "selection", "notes-row": "notes", "notes-row-outlined": "notes", "notes-data": "notes", overrides: "overrides" }[st] || "everything",
            "inspector-group-set-path-row": { watchlist: "watchlist", "path-lesmis": "p1", path: "tp1", "path-door-entries": "dp1", "path-lesmis-2": "p2", "kept-2": "g2", "kept-8": "g8", notes: "c3", "label-by": "label-degree" }[st] || (st.startsWith("community-") ? "c" + st.slice(10) : null),
        }[id] || null;
        if (id === "inspector-measure-row" && /^painted-/.test(st)) row = "paint-" + st.slice(8);
        const sel = { "inspector-node": "1", "inspector-edge": "1", "inspector-several-elements": st === "two-nodes" ? "2" : "5" }[id] || null;
        return { row, sel, edited: id === "inspector-node" && st === "edited" };
    }

    // One swatch for a run's shared palette: its first color, the second peeking behind
    function stack(c1, c2) {
        const s = AB.chit(c1, true);
        s.classList.add("gp-stack");
        s.style.setProperty("--gp-stack2", c2);
        return s;
    }
    const builtin = (o) => Object.assign({ pinned: true, builtin: true, eye: true }, o);
    const selectionRow = (count) => builtin({ id: "selection", name: "Selection", kindIcon: "scan", count, go: ["inspector-selection-and-everything", "selection"] });
    // Notes keeps its name and cannot be deleted, but drags like any row
    const notesRow = (eye, count) => ({ id: "notes", name: "Notes", kindIcon: AB.ICON.note, builtin: true, count: count === undefined ? 4 : count, countTip: "Noted nodes and edges", eye, go: ["inspector-selection-and-everything", "notes-row"], menu: ["context-menus", "notes-row"] });
    const everythingRow = (eye) => builtin({ id: "everything", name: "Everything", kindIcon: "base-layer", eye, go: ["inspector-selection-and-everything", "everything"] });

    // The door entries and the transfers after a run: the project's tree with the new row on top,
    // under the built-in rows (a just-loaded transfers project has no Louvain run yet)
    const T = () => AB.fx.datasets.transactions;
    const DOOR = ["door-entries", "door-entries-path", "door-entries-running"];
    const TRANSFERS = ["transfers-loaded", "path-found", "transfers-running"];
    const freshT = (state) => state === "transfers-loaded" || (state !== "many-groups" && !!T().fresh);
    function newRow(state) {
        if (/running$/.test(state)) return { id: "betweenness-new", name: "Betweenness", kindIcon: "chart-column", eye: true, progress: 0.42, renameDisabled: RUN_LABEL, statusText: "Running: 42% of nodes", go: ["analyze-popover", "running"], menu: ["context-menus", "measure-row"] };
        const door = state === "door-entries-path";
        const p = AB.lastPath && AB.lastPath.ds === (door ? "doorEntries" : "transactions") ? AB.lastPath : null;
        const P = T().setsAndPaths.path;
        const name = p ? p.from + " to " + p.to : door ? "Ana Ruiz to Priya Nair" : P.from.id + " to " + P.to.id;
        const go = ["inspector-group-set-path-row", door ? "path-door-entries" : "path"];
        return { id: door ? "dpaths" : "tpaths", name: "Shortest paths", kindIcon: "route", swatch: AB.chit("#D55E00"), eye: true, open: true, renameDisabled: RUN_LABEL, go, menu: ["context-menus", "run-row"],
            children: [{ id: door ? "dp1" : "tp1", name, kindIcon: "route", swatch: AB.chit("#D55E00"), eye: true, go, menu: ["context-menus", "row"] }] };
    }
    // The door entries' noted elements: Ana Ruiz and B1, and the pair edge while the entries load per Pair
    const doorNoted = () => (!AB.fx.datasets.doorEntries.hasNotes() ? null : AB.fx.datasets.doorEntries.loaded.per === "pair" ? 3 : 2);
    function projectModel(state) {
        const ins = fromInspector();
        let rows;
        if (DOOR.includes(state)) rows = [selectionRow(ins && ins.sel), notesRow(true, doorNoted()), everythingRow(true)];
        else if (freshT(state)) rows = [selectionRow(null), notesRow(true, null), everythingRow(true)];
        else { rows = manyModel(); rows[2].selected = false; }
        if (state !== "door-entries" && state !== "transfers-loaded") rows.splice(2, 0, newRow(state));
        const sel = ins ? ins.row : null;
        const mark = (list) => list.forEach((r) => { if (sel) r.selected = r.id === sel; if (r.children) mark(r.children); });
        mark(rows);
        return rows;
    }

    // The wide, nested and plain JSON projects: just loaded, unstyled, so only the built-in rows
    const LOADED = ["wide", "nested", "plainJson", "registry"];
    // Each loaded project's place has a state of its own (the rail and a canvas click open it), and one
    // with the first row a reader adds: the hosts sized by the 46-character attribute (wide-sized), the
    // researchers' kept set (nested-set). What the field lists call "in use" follows these rows.
    const LOADED_STATE = { wide: "wide", "wide-sized": "wide", nested: "nested", "nested-set": "nested", "plain-json": "plainJson", registry: "registry" };
    // painted: the tree after Color by or Size by on an attribute (AB.paintRow), in the project it was made in
    const paintedDs = () => (AB.paintedLast && AB.paintedLast.ds) || "wide";
    const loadedDs = (state) => LOADED_STATE[state] || (state === "painted" ? paintedDs() : null) || (state === "at-rest" && AB.route && LOADED.includes(AB.route.frame.dataset) ? AB.route.frame.dataset : null);
    const VULN = "vuln_count_critical_unremediated_over_30_days";
    function loadedModel(state) {
        const ins = fromInspector();
        const rows = [selectionRow(ins && ins.sel), notesRow(true, null), everythingRow(true)];
        if (state === "wide-sized") rows.splice(2, 0, { id: "vuln", name: VULN, kindIcon: "hash", swatch: AB.ramp("#cfcfcf", "#4d4d4d"), eye: true, go: ["inspector-measure-row", "long-name"], menu: ["context-menus", "measure-row"] });
        // The measure rows Color by and Size by made (AB.painted), named after the attribute, newest on top
        const ds = loadedDs(state);
        (AB.painted[ds] || []).filter((p) => p.on === "row").forEach((p) => {
            const color = p.prop === "Color", num = p.type === "num";
            rows.splice(2, 0, { id: "paint-" + p.prop.toLowerCase(), name: p.name, kindIcon: num ? "hash" : "type", eye: true,
                swatch: !color ? null : num ? AB.ramp("#ef7818", "#662506") : stack("#E69F00", "#56B4E9"),
                go: ["inspector-measure-row", "painted-" + p.prop.toLowerCase()], menu: ["context-menus", "measure-row"] });
        });
        if (state === "nested-set") rows.splice(2, 0, { id: "ml-set", name: "Machine learning researchers, more than 500 cites in 5 years", kindIcon: AB.ICON.set, swatch: AB.chit("#009E73", true), count: 23, eye: true, go: ["inspector-group-set-path-row", "long-name"], menu: ["context-menus", "row"] });
        if (ins && ins.row) rows.forEach((r) => { r.selected = r.id === ins.row; });
        return rows;
    }
    // Two 60-character names, drawn with the end ellipsis; the full name is in the tooltip
    const LONG = { folder: "Characters Valjean meets before the barricade, for the paper", watchlist: "Watchlist: Javert, Thenardier and the people they hunt, 1832" };

    // ---------- the rows, in paint order ----------
    function model(state) {
        if (DOOR.includes(state) || TRANSFERS.includes(state)) return projectModel(state);
        if (loadedDs(state)) return loadedModel(state);
        const L = AB.fx.datasets.lesmis;
        const g = (label) => L.frame.legend.rows.find((r) => r.label === label);
        const g2 = g("2"), g8 = g("8");
        const ins = fromInspector();
        const SEL = { rename: "g2", "rename-chain": "g2", "rename-run-group": "c3", "rename-builtin": "everything", "rename-run-disabled": "louvain", partial: "louvain", queued: "louvain", running: null, failed: null, "louvain-open": "louvain", finished: "betweenness-new", "show-hidden": "degree" };
        let selRow = state in SEL ? SEL[state] : state === "empty" || state === "list-menu" ? null : "pagerank";
        if (ins) selRow = ins.row;
        const openLouvain = ["louvain-open", "rename-run-group"].includes(state) || /^c\d$/.test(selRow || "");
        const rows = [selectionRow(state === "solo" ? 5 : ins && ins.sel), notesRow(state !== "notes-eye-off", state === "empty" ? null : state === "door-entries" ? 3 : undefined)];
        if (state === "empty") return rows.concat(everythingRow(true));
        if (ins && ins.edited) rows.push(builtin({ id: "overrides", name: "Overrides", kindIcon: "pencil", count: 1, go: ["inspector-selection-and-everything", "overrides"], menu: ["context-menus", "row"] }));
        // Label by degree (an attribute's menu) adds its row on top, under the built-in rows
        if (ins && ins.row === "label-degree") rows.push({ id: "label-degree", name: "degree", kindIcon: "hash", eye: true, go: ["inspector-group-set-path-row", "label-by"], menu: ["context-menus", "measure-row"] });
        // A new run lands on top, under the built-in rows
        const bt = { id: "betweenness-new", name: BT_NEW, kindIcon: "chart-column", swatch: AB.ramp("#fde7c8", "#E69F00"), eye: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] };
        if (state === "running" || state === "queued") rows.push(Object.assign(bt, { swatch: null, progress: 0.42, renameDisabled: RUN_LABEL, statusText: "Running: 42% of nodes", go: ["analyze-popover", "running"] }));
        if (state === "finished") rows.push(bt);
        // A run that found one group: its one child, and the footer's "1 group"
        if (state === "one-group") rows.push({ id: "components", name: "Connected components", kindIcon: AB.ICON.run, swatch: AB.chit("#0072B2", true), count: groups(1), eye: true, open: true, renameDisabled: RUN_LABEL, go: ["inspector-nothing-selected", "overview"], menu: ["context-menus", "run-row"],
            children: [{ id: "cc1", name: "Component 1", kindIcon: AB.chit("#0072B2", true), count: L.nodes, eye: true, renameDisabled: GROUP_LABEL, go: ["inspector-nothing-selected", "overview"], menu: ["context-menus", "row"] }] });
        if (state === "failed") rows.push({ id: "failed", name: "Closeness", kindIcon: "chart-column", eye: null, status: "error", statusText: "Failed: the GPU device was lost during the run. Nothing was computed on the CPU.", renameDisabled: RUN_LABEL, go: ["graph-place", "failed"], menu: ["context-menus", "run-row"] });
        const filtered = state === "scope-mark" ? { status: "filtered", statusText: "Ran on " + AB.count(L.nodes, "node") + "; a filter now leaves " + AB.num(L.filterSteps.after.step1) } : {};
        rows.push(Object.assign({ id: "pagerank", name: "PageRank", kindIcon: "chart-column", swatch: AB.ramp("#ef7818", "#662506"), eye: true, go: ["inspector-measure-row", state === "scope-mark" ? "scope-mark" : "style"], menu: ["context-menus", "measure-row"] }, filtered,
            state === "out-of-date" ? { status: "stale", statusText: "Out of date: the data changed after this run. It paints the earlier values until rerun." } : {}));
        const louvainStatus = state === "queued" ? { status: "queued", statusText: "Queued, 2nd. Starts when " + BT_NEW + " finishes", go: ["inspector-run-row", "queued"] }
            : state === "partial" ? { status: "partial", statusText: "Stopped at the time limit: the communities found so far paint", go: ["inspector-run-row", "partial"] } : {};
        rows.push(Object.assign({
            id: "louvain", name: "Louvain", kindIcon: AB.ICON.run, swatch: stack(LOUVAIN[0].color, LOUVAIN[1].color),
            count: groups(LOUVAIN.length), notes: 1, inside: 2, notesGo: ["inspector-run-row", "data"], eye: true, open: openLouvain, renameDisabled: RUN_LABEL,
            go: ["inspector-run-row", "style"], menu: ["context-menus", "run-row"],
            children: LOUVAIN.map((c) => ({ id: "c" + c.n, name: "Community " + c.n, kindIcon: AB.chit(c.color, true), /* a group is a filled circle in its color (spec 3.2) */ count: c.size, notes: c.notes, notesGo: c.notes ? ["inspector-group-set-path-row", "notes"] : null, eye: true, renameDisabled: GROUP_LABEL, go: ["inspector-group-set-path-row", "community-" + c.n], menu: ["context-menus", "row"] })),
        }, filtered, louvainStatus));
        rows.push({
            id: "paths", name: "Shortest paths", kindIcon: "route", swatch: AB.chit("#D55E00"), eye: true, open: true, renameDisabled: RUN_LABEL,
            go: ["inspector-run-row", "style"], menu: ["context-menus", "run-row"],
            children: [
                { id: "p1", name: "Valjean to Javert", kindIcon: "route", swatch: AB.chit("#D55E00"), count: 2, eye: true, go: ["inspector-group-set-path-row", "path-lesmis"], menu: ["context-menus", "row"] },
                { id: "p2", name: "Myriel to Javert", kindIcon: "route", swatch: AB.chit("#0072B2"), count: 3, eye: true, go: ["inspector-group-set-path-row", "path-lesmis-2"], menu: ["context-menus", "row"] },
            ],
        });
        rows.push({ id: "watchlist", name: "Watchlist", kindIcon: AB.ICON.set, swatch: AB.chit("#CC79A7", true), count: 5, eye: true, locked: true, go: ["inspector-group-set-path-row", "watchlist"], menu: ["context-menus", "row"] });
        // Degree is hidden from the list (still painting): drawn dimmed only while Show hidden rows is on
        if (state === "show-hidden") rows.push({ id: "degree", name: "Degree", kindIcon: "hash", swatch: AB.ramp("#cfcfcf", "#4d4d4d"), eye: true, dim: true, go: ["inspector-measure-row", "degree"], menu: ["context-menus", "measure-row"] });
        rows.push({
            id: "folder", name: "For the report", kindIcon: "folder-open", eye: true, open: true, go: ["inspector-folder", "folder"], menu: ["context-menus", "folder"],
            children: [
                { id: "g2", name: "Group 2", kindIcon: AB.ICON.set, swatch: AB.chit(g2.color, true), count: g2.count, eye: true, go: ["inspector-group-set-path-row", "kept-2"], menu: ["context-menus", "row"] },
                { id: "g8", name: "Group 8", kindIcon: AB.ICON.set, swatch: AB.chit(g8.color, true), count: g8.count, eye: true, go: ["inspector-group-set-path-row", "kept-8"], menu: ["context-menus", "row"] },
                { id: "bt", name: "Betweenness", kindIcon: "chart-column", swatch: AB.ramp(), eye: false, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
            ],
        });
        rows.push(everythingRow(state !== "everything-hidden"));
        // Everything hidden: the rows above it are hidden too, so only Groups 2 and 8 paint (the canvas draws that)
        if (state === "everything-hidden") rows.forEach((r) => { if (["pagerank", "louvain", "paths", "watchlist"].includes(r.id)) r.eye = false; });
        if (state === "rename-chain") renamed.g2 = renamed.g2 || "Valjean's family";
        const mark = (list) => list.forEach((r) => {
            r.selected = r.id === selRow;
            if (renamed[r.id]) r.name = renamed[r.id];
            else if (state === "long-names" && LONG[r.id]) r.name = LONG[r.id];
            r.onRename = (name) => { renamed[r.id] = name; };
            if (r.children) mark(r.children);
        });
        mark(rows);
        return rows;
    }
    // Many groups: the transfers March Louvain run (fixtures: 35 communities, largest first), past 20
    // groups, so the run gets its own find line with Sort
    function manyModel() {
        const T = AB.fx.datasets.transactionsApril;
        const lv = T.louvain.march, colors = T.communityColors;
        const named = lv.largest.map((size, i) => ({ n: i + 1, size, color: colors["Community " + (i + 1)] })).filter((c) => c.color);
        const rest = lv.communities - named.length;
        const go = ["inspector-run-row", "many-groups"];
        return [
            selectionRow(null), notesRow(true, null),
            {
                id: "louvain", name: "Louvain", kindIcon: AB.ICON.run, selected: true, swatch: stack(named[0].color, named[1].color), count: groups(lv.communities), eye: true, open: false, renameDisabled: RUN_LABEL, go, menu: ["context-menus", "run-row"],
                children: named.map((c) => ({ id: "m" + c.n, name: "Community " + c.n, kindIcon: AB.chit(c.color, true), /* a group is a filled circle in its color (spec 3.2) */ count: c.size, eye: true, renameDisabled: GROUP_LABEL, go, menu: ["context-menus", "row"] }))
                    .concat({ id: "more", name: rest + " more communities", kindIcon: "circle-dot", swatch: AB.chit("#BDBDBD", true), eye: true, renameDisabled: GROUP_LABEL, go: ["table-dock", "transfers"], menu: ["context-menus", "row"] }),
            },
            // A link count on a directed graph, named as the catalog names it, so it never reads as an amount
            { id: "links-in", name: "Links in (count)", kindIcon: "chart-column", swatch: AB.ramp("#ef7818", "#662506"), eye: true, renameDisabled: RUN_LABEL,
                onOpen: () => AB.flash("Opens Links in (count) in the inspector (not drawn in the skeleton)"), menu: ["context-menus", "measure-row"] },
            everythingRow(true),
        ];
    }

    // Elements hidden on canvas, wherever the frame shows them: the canvas state or Hide on canvas from the selection bar
    function hiddenOnCanvas() {
        const f = (AB.route && AB.route.frame) || {};
        if (f.canvas === "canvas-and-states/hidden-on-canvas") return "4 nodes";
        if (f.toolbar === "selection-bar/hidden") return "1 node";
        return null;
    }
    // ---------- the footer line: one line, the most specific message first ----------
    function footer(state) {
        const L = (id, st, label) => AB.link(id, st, label);
        if (state === "one-group") return AB.treeFooter([["Connected components found 1 group."]]);
        // No graph at all: the first step is data, not a run
        if (state === "empty" && !(AB.route && ["transactions", "doorEntries"].includes(AB.route.frame.dataset))) {
            const add = AB.cmd("add-data");
            return AB.treeFooter([[AB.h("span", null, L(add.go[0], add.go[1], "Add data"), " to start")]]);
        }
        if (state === "empty" || loadedDs(state) || state === "door-entries" || (state === "transfers-loaded")) return AB.treeFooter([[AB.h("span", null, L("analyze-popover", "open", "Analyze"), " (Shift+A) to add results here")]]);
        return AB.treeFooter([
            state === "everything-hidden" && ["Everything is hidden. Unpainted nodes still take part in the layout. To leave them out, filter.", L("data-place", "filters", "Filter...")],
            hiddenOnCanvas() && [AB.h("span", null, hiddenOnCanvas() + " hidden on canvas. ", h("span", Object.assign({ class: "ab-link", role: "button" }, AB.act({ onClick: () => AB.flash("Selects the hidden elements (not wired in the skeleton)") })), "Select"), ", ", L("canvas-and-states", "drawn", "Show")), AB.needsElement("a draw-only hide that also hides incident edges")],
            state === "show-hidden" && ["1 hidden row still paints; it shows dimmed here.", L("graph-place", "at-rest", "Stop showing hidden rows")],
            state !== "many-groups" && !DOOR.includes(state) && !TRANSFERS.includes(state) && ["1 hidden row still paints.", L("graph-place", "show-hidden", "Show hidden rows")],
        ]);
    }

    // ---------- notes and scope marks on the tree's rows (spec 2.1 and 3.3) ----------
    // ponytail: these extend what AB.tree draws (lib.js), which today has one note slot, no click on
    // it, no ", N notes" in the row's name and a warning icon for "filtered"; once the shell's tree
    // does these, delete decorate() and pass notesInside again.
    // - the note slot counts only notes about the row itself; a click on it selects the row and opens
    //   its notes (r.notesGo); the row's accessible name ends ", 2 notes"
    // - a collapsed row whose children carry notes gets a hollow "N inside" mark (r.inside), gone when expanded
    // - computed before the current filter is the funnel, not the warning that out of date uses
    function decorate(t) {
        t.querySelectorAll(".ab-trow").forEach((li) => {
            const r = li._entry && li._entry.r;
            if (!r) return;
            const slot = li.querySelector(".ab-tnotes");
            const name = li.getAttribute("aria-label") || r.name;
            if (r.notes && !/ notes?$/.test(name)) li.setAttribute("aria-label", name + ", " + AB.count(r.notes, "note"));
            // a control inside the row, like the eye: not a Tab stop of its own (the row's menu has Open notes)
            if (r.notes && r.notesGo && slot) { slot.classList.add("gp-notes-go"); slot.setAttribute("role", "button"); slot.tabIndex = -1; AB.tip(slot, "Open " + AB.count(r.notes, "note") + " about " + r.name); }
            if (r.inside && !r.open && slot && !li.querySelector(".gp-inside")) {
                slot.after(AB.tip(h("span", { class: "gp-inside k-num", "aria-hidden": "true" }, String(r.inside)), AB.count(r.inside, "note") + " inside, about its groups; expand to see them", { label: false }));
                li.setAttribute("aria-description", AB.count(r.inside, "note") + " inside");
            }
            const fs = li.querySelector('.ab-status[data-status="filtered"]');
            if (fs) fs.replaceChildren(icon(AB.ICON.filter));
        });
    }
    // A click on a row's note count: select the row, open its Data tab at Notes. Captured before the
    // row's own click, which would open the row's usual tab.
    function onNoteCount(e) {
        const slot = e.target.closest && e.target.closest(".gp-notes-go");
        if (!slot) return;
        const li = slot.closest(".ab-trow"), r = li && li._entry && li._entry.r;
        if (!r || !r.notesGo) return;
        e.stopPropagation();
        li.closest(".ab-tree").querySelectorAll(".ab-trow").forEach((x) => { x.setAttribute("aria-selected", String(x === li)); x.tabIndex = x === li ? 0 : -1; });
        // ponytail: lands "at Notes" by scrolling the inspector beside once it draws; drop this when the
        // run-row inspector has a notes state of its own (as the group row's "notes" state does)
        const atNotes = () => requestAnimationFrame(() => {
            const b = [...document.querySelectorAll("#ab-right .ab-sec-btn")].find((x) => x.textContent.trim() === "Notes");
            if (!b) return;
            if (b.getAttribute("aria-expanded") === "false") b.click();
            b.closest(".k-section").scrollIntoView({ block: "start" });
        });
        if (location.hash === AB.href(r.notesGo[0], r.notesGo[1])) return atNotes();
        window.addEventListener("hashchange", atNotes, { once: true });
        AB.keepLeft = true;
        AB.go(r.notesGo[0], r.notesGo[1]);
    }

    // ---------- Find: rows first, then notes ----------
    function drawFind(b) {
        // The results are one list box of options; the two headings are text inside it
        b.setAttribute("role", "listbox");
        b.setAttribute("aria-label", "Find results");
        b.append(h("div", { class: "gp-find-head" }, "Rows"));
        const hit = (ic, sw, text, sub, target) => b.append(h("div", Object.assign({ class: "gp-hit", role: "option" }, AB.act({ go: target })), icon(ic), sw, h("span", { class: "gp-hit-text" }, text, sub ? h("span", { class: "gp-hit-sub" }, sub) : null)));
        const hi = (s) => { const i = s.indexOf("Jav"); return [s.slice(0, i), h("mark", null, "Jav"), s.slice(i + 3)]; };
        hit("route", AB.chit("#D55E00"), hi("Valjean to Javert"), "in Shortest paths", ["inspector-group-set-path-row", "path-lesmis"]);
        hit("route", AB.chit("#0072B2"), hi("Myriel to Javert"), "in Shortest paths", ["inspector-group-set-path-row", "path-lesmis-2"]);
        hit(AB.ICON.set, AB.chit("#CC79A7", true), "Watchlist", "a member: Javert", ["inspector-group-set-path-row", "watchlist"]);
        b.append(h("div", { class: "gp-find-head" }, "Notes"));
        hit(AB.ICON.note, null, hi("Valjean and Javert land in the same community..."), "about Louvain", ["inspector-run-row", "data"]);
    }

    // `here`: another project than Les Miserables, whose list-menu states are not drawn: the menu opens in place
    function listMenu(state, here) {
        const btn = document.getElementById("ab-list-btn");
        if (!btn) return;
        if (here) return AB.openMenu(btn, [
            { label: "New folder", shortcut: "Ctrl+G", onClick: () => AB.flash("New folder (not wired in the skeleton)") },
            { label: "Show hidden rows", check: false, onClick: () => AB.flash("Shows hidden rows (not wired in the skeleton)") },
            { label: "Collapse all", onClick: () => AB.flash("Collapses every row (not wired in the skeleton)") },
        ]);
        AB.openMenu(btn, [
            { label: "New folder", shortcut: "Ctrl+G", onClick: () => AB.flash("New folder (not wired in the skeleton)") },
            { label: "Show hidden rows", check: state === "show-hidden", onClick: () => AB.go("graph-place", state === "show-hidden" ? "at-rest" : "show-hidden") },
            { label: "Collapse all", onClick: () => AB.go("graph-place", "at-rest") },
        ]);
    }

    // Find in another project's tree: rows whose name holds the term stay, the rest hide; no row
    // matching is the field list's no-match line, with Clear
    function findHere(scroll, input) {
        const q = input.value.trim().toLowerCase();
        const rows = [...scroll.querySelectorAll(".ab-trow")];
        rows.forEach((li) => { const n = li.querySelector(".ab-tname"); li.hidden = !!q && !(n && n.textContent.toLowerCase().includes(q)); });
        const old = scroll.querySelector(".ab-fl-none");
        if (old) old.remove();
        if (!q) return;
        const hits = rows.filter((li) => !li.hidden).length;
        if (hits) return AB.announce(hits + (hits === 1 ? " row matches" : " rows match"));
        const clear = h("span", Object.assign({ class: "ab-link", role: "button" }, AB.act({ onClick: () => { input.value = ""; findHere(scroll, input); input.focus(); } })), "Clear");
        scroll.prepend(h("div", { class: "ab-fl-none" }, AB.noMatch(input.value.trim()), " ", clear));
        AB.announce('No match for "' + input.value.trim() + '"');
    }

    // ---------- the place ----------
    function render(el, state) {
        if (state === "rows-with-notes") state = "find"; // version 2 id: Find covers it
        // A direct visit to painted, before any Color by: the hosts colored by cpu_util_p95_pct
        if (state === "painted" && !AB.paintOf(paintedDs(), "Color") && !AB.paintOf(paintedDs(), "Size")) AB.paintBy("wide", "Color", "cpu_util_p95_pct", "row");
        const L = AB.fx.datasets.lesmis;
        // A tree drawn with results from the start: the transfers project is no longer just loaded
        if (state === "many-groups") T().fresh = false;
        const many = state === "many-groups";
        const tGraph = many || TRANSFERS.includes(state) || (state === "empty" && AB.route && AB.route.frame.dataset === "transactions");
        // the graph being loaded names the head too (the door-entries loading screen draws the empty place)
        const doorGraph = DOOR.includes(state) || (state === "empty" && AB.route && AB.route.frame.dataset === "doorEntries");
        const ds = loadedDs(state);
        const head = AB.graphHead("Graph", ds ? AB.fx.datasets[ds].frame.graphRow : tGraph ? AB.fx.datasets.transactions.graphName : doorGraph ? AB.fx.datasets.doorEntries.graphName : L.frame.graphRow, { notes: state === "empty" || tGraph || doorGraph || ds ? 0 : 1 });
        const finding = state === "find" || state === "find-no-match";
        const other = !!(ds || tGraph || doorGraph);
        const bar = AB.treebar({
            value: state === "find" ? "Jav" : state === "find-no-match" ? "xyz" : null,
            onKey: (e, input) => {
                // Another project finds in its own tree, in place: the find states are Les Miserables'
                if (other && e.key === "Enter") return findHere(scroll, input);
                if (other && e.key === "Escape" && input.value) { input.value = ""; return findHere(scroll, input); }
                // the skeleton's one search with results is "Jav"; anything else finds nothing
                if (e.key === "Enter" && input.value) AB.go("graph-place", /^jav/i.test(input.value) ? "find" : "find-no-match");
                if (e.key === "Escape" && finding) AB.go("graph-place", "at-rest");
            },
            onInput: (input) => { if (other && !input.value) return findHere(scroll, input); if (!input.value && finding) AB.go("graph-place", "at-rest"); },
            menuGo: ["graph-place", state === "list-menu" ? "at-rest" : "list-menu"],
            menuClick: ds || tGraph || doorGraph ? () => listMenu(state, true) : null,
            menuOpen: state === "list-menu",
        });
        const scroll = h("div", { class: "k-scroll" });
        el.append(head, bar, scroll);
        if (state === "find") { drawFind(scroll); return; }
        if (state === "find-no-match") {
            const clear = h("span", Object.assign({ class: "ab-link", role: "button" }, AB.act({ go: ["graph-place", "at-rest"] })), "Clear");
            scroll.append(h("div", { class: "ab-fl-none" }, AB.noMatch("xyz"), " ", clear)); // the field list's no-match line
            AB.announce('No match for "xyz"');
            requestAnimationFrame(() => { const i = bar.querySelector("input"); if (i) i.focus(); });
            return;
        }

        const tree = AB.tree(many ? manyModel() : model(state), { label: "Paint order, top wins" });
        const manyRun = many || (TRANSFERS.includes(state) && !freshT(state));
        tree.classList.add("gp-tree");
        AB.append(scroll, [tree, footer(state)]);
        decorate(tree);
        scroll.addEventListener("click", onNoteCount, true);
        // the tree redraws itself on expand, collapse, delete and move: decorate the new one
        new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.classList && n.classList.contains("ab-tree")) { n.classList.add("gp-tree"); decorate(n); } }))).observe(scroll, { childList: true });
        const row = (id) => tree.querySelector(`[data-row="${id}"]`);
        // The Notes row counts the elements notes are about
        const nc = row("notes") && row("notes").querySelector(".ab-tcount");
        if (nc) AB.tip(nc, DOOR.includes(state) ? (doorNoted() === 3 ? "2 nodes and 1 edge notes are about" : "2 nodes notes are about") : "3 nodes and 1 edge notes are about", { label: false });
        if (manyRun) {
            // Above the tree, not inside it: a tree owns only its rows
            if (row("louvain")) tree.before(h("div", { class: "gp-runfind" },
                h("label", { class: "ab-find" }, icon("search", "sm"), h("input", { type: "search", placeholder: "Find in Louvain", "aria-label": "Find groups in Louvain by name or member" })),
                AB.iconButton("arrow-up-down", "Sort: size", { onClick: () => AB.flash("Sort by paint order, size, name or date (not wired in the skeleton)") })));
        }
        if (state === "solo") { const eye = row("pagerank") && row("pagerank").querySelector(".ab-eye"); if (eye) eye.dispatchEvent(new MouseEvent("click", { altKey: true, bubbles: true, detail: 1 })); }
        if (state === "invalid-drop") {
            // the path being dragged over the Louvain run, and the one inline reason the tree keeps
            const tgt = row("louvain");
            tgt.setAttribute("data-drop-bad", "");
            // The drag image and its reason are pictures of the drag; the reason is also spoken
            tgt.after(h("li", { class: "gp-ghost", role: "none", "aria-hidden": "true" }, icon("route"), AB.chit("#D55E00"), "Valjean to Javert"),
                h("li", { class: "gp-drop-reason", role: "none", "aria-hidden": "true" }, icon("circle-x", "sm"), "A run holds only its own results."));
            AB.announce("Valjean to Javert cannot drop here: a run holds only its own results.");
            document.body.classList.add("gp-nodrop");
            const off = () => { document.body.classList.remove("gp-nodrop"); window.removeEventListener("hashchange", off); };
            window.addEventListener("hashchange", off);
        }
        const f2 = (id) => requestAnimationFrame(() => { const li = row(id); if (li) { li.focus(); li.dispatchEvent(new KeyboardEvent("keydown", { key: "F2", bubbles: true })); } });
        const hover = (id) => setTimeout(() => { const n = row(id) && row(id).querySelector(".ab-tname"); if (n) n.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" })); }, 60);
        if (state === "rename") f2("g2");
        if (state === "long-names") {
            Object.keys(LONG).forEach((id) => { const n = row(id) && row(id).querySelector(".ab-tname"); if (n) AB.tip(n, LONG[id], { label: false }); });
            hover("watchlist");
        }
        // A row hidden from the list says so on its name: the eye is paint, the list is only the list
        tree.querySelectorAll(".ab-trow[data-dim]").forEach((li) => { const n = li.querySelector(".ab-tname"); if (n) AB.tip(n, "Hidden from this list; it still paints. Show in list is in its menu", { label: false }); });
        if (state === "one-group") AB.announce("Connected components found 1 group");
        // A run paints as soon as it finishes: it lands on top, so it wins Color
        if (state === "finished") AB.announce(BT_NEW + " finished and now paints Color");
        if (state === "rename-chain") { f2("g8"); AB.announce("Renamed to Valjean's family. Renaming Group 8"); }
        // A name that cannot change ignores the gesture; its tooltip says why
        if (state === "rename-run-group") hover("c3");
        if (state === "rename-builtin") hover("everything");
        if (state === "rename-run-disabled") hover("louvain");
        if (state === "list-menu") requestAnimationFrame(() => requestAnimationFrame(() => listMenu(state)));
    }

    registerSection({
        id: "graph-place",
        title: "Graph place (the paint tree)",
        region: "left",
        rail: "graph",
        frame(state) {
            // The wide project: the shell brings the hosts canvas, the graph inspector and the table.
            // The rail's Graph opens at-rest in that project, so at-rest names no inspector there.
            if (state === "wide") return { dataset: "wide" };
            if (state === "nested") return { dataset: "nested" };
            if (state === "plain-json") return { dataset: "plainJson" };
            if (state === "registry") return { dataset: AB.registryDataset() };
            if (state === "wide-sized") return { dataset: "wide", canvas: "canvas-and-states/hosts-legend", right: "inspector-measure-row/long-name" };
            if (state === "nested-set") return { dataset: "nested", canvas: "canvas-and-states/nested-set", right: "inspector-group-set-path-row/long-name" };
            if (state === "painted") return { dataset: paintedDs(), right: "inspector-measure-row/painted-" + ((AB.paintedLast && AB.paintedLast.prop) || "Color").toLowerCase() };
            if (state === "at-rest" && AB.route && LOADED.includes(AB.route.frame.dataset)) return {};
            if (state === "find-no-match" || state === "one-group") return { right: "inspector-nothing-selected/overview" };
            if (state === "long-names") return { right: "inspector-measure-row/style" };
            if (state === "empty") return { right: "inspector-nothing-selected/empty-graph", canvas: "canvas-and-states/empty", dock: false };
            if (state === "door-entries") return { dataset: "doorEntries" }; // the shell brings its canvas, inspector and table
            // After Find path or Run on the door entries or the transfers: the new row, and for a path its inspector
            if (state === "door-entries-path" || state === "door-entries-running") return { dataset: "doorEntries" };
            if (state === "transfers-loaded") return { dataset: "transactions" };
            if (state === "path-found" || state === "transfers-running") return Object.assign({ dataset: "transactions", canvas: freshT(state) ? "canvas-and-states/transfers" : "canvas-and-states/transfers-communities" });
            if (state === "louvain-open") return { right: "inspector-run-row/style" };
            if (state === "many-groups") return { dataset: "transactions", canvas: "canvas-and-states/transfers-communities", right: "inspector-run-row/many-groups" };
            if (state === "scope-mark") return { right: "inspector-measure-row/scope-mark", chip: AB.count(AB.fx.datasets.lesmis.filterSteps.after.step1, "node", { of: AB.fx.datasets.lesmis.nodes }), filterOn: ["degree"] };
            if (state === "queued" || state === "partial") return { right: "inspector-run-row/" + state };
            if (state === "running" || state === "failed") return { right: "inspector-nothing-selected/overview" };
            if (state === "everything-hidden") return { right: "inspector-selection-and-everything/everything", canvas: "canvas-and-states/everything-hidden" };
            if (state === "show-hidden") return { right: "inspector-measure-row/degree" };
            if (state === "find" || state === "list-menu" || state === "rows-with-notes") return { right: "inspector-nothing-selected" };
            if (state === "rename" || state === "rename-chain") return { right: "inspector-group-set-path-row/kept-2" };
            if (state === "rename-run-group") return { right: "inspector-group-set-path-row/community-3" };
            if (state === "rename-builtin") return { right: "inspector-selection-and-everything/everything" };
            if (state === "rename-run-disabled") return { right: "inspector-run-row/rename-disabled" };
            if (state === "notes-eye-off") return { right: "inspector-selection-and-everything/notes-row" };
            return { right: "inspector-measure-row/style" };
        },
        states: [
            { id: "at-rest", label: "Populated, PageRank selected" },
            { id: "empty", label: "Empty graph" },
            { id: "door-entries", label: "Door entries, just loaded" },
            { id: "louvain-open", label: "Louvain expanded" },
            { id: "many-groups", label: "Many groups (transfers)" },
            { id: "transfers-loaded", label: "Transfers, just loaded" },
            { id: "door-entries-path", label: "Door entries: a path just found" },
            { id: "door-entries-running", label: "Door entries: a run in progress" },
            { id: "path-found", label: "Transfers: a path just found" },
            { id: "transfers-running", label: "Transfers: a run in progress" },
            { id: "running", label: "Run in progress" },
            { id: "queued", label: "Run queued" },
            { id: "finished", label: "Run finished" },
            { id: "partial", label: "Run stopped, partial values" },
            { id: "failed", label: "Run failed" },
            { id: "solo", label: "Solo on one eye" },
            { id: "everything-hidden", label: "Everything hidden" },
            { id: "show-hidden", label: "Show hidden rows on" },
            { id: "scope-mark", label: "After a filter step" },
            { id: "out-of-date", label: "After a data change" },
            { id: "invalid-drop", label: "Invalid drop" },
            { id: "find", label: "Find results" },
            { id: "list-menu", label: "List menu" },
            { id: "rename", label: "Renaming Group 2" },
            { id: "rename-chain", label: "Rename, Tab to the next row" },
            { id: "rename-run-group", label: "Rename refused: a run's group" },
            { id: "rename-builtin", label: "Rename refused: built-in row" },
            { id: "rename-run-disabled", label: "Rename refused: a run" },
            { id: "notes-eye-off", label: "Notes row hidden" },
            { id: "find-no-match", label: "Find: no match" },
            { id: "one-group", label: "A run that found 1 group" },
            { id: "long-names", label: "60-character row and folder names" },
            { id: "wide", label: "Hosts (wide project), at rest" },
            { id: "wide-sized", label: "Hosts with a Size row on the 46-character attribute" },
            { id: "nested", label: "Research network (nested JSON), just loaded" },
            { id: "nested-set", label: "Research network with a kept set of 23 researchers" },
            { id: "plain-json", label: "Coauthors (plain JSON graph), just loaded" },
            { id: "registry", label: "Package registry (keyed JSON), just loaded" },
            { id: "painted", label: "After Color by or Size by on an attribute (directly: the hosts, nothing painted yet)" },
        ],
        render,
    });
})();
