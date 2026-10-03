/* Graph place, version 3: the paint tree. Top to bottom: the title line (a quiet "Graph", the
   graphs switcher, and the graph's note count as quiet words, with no speech bubble, at its end), the treebar (Find rows, elements, values; the list options
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
   plain JSON project (kit/wide-nested.json) is just loaded: no rows yet. The wide and nested
   projects open with one attribute-named row each (middle ellipsis, full name on hover): the hosts
   sized by their 46-character attribute, the researchers by a dotted nested path (AB.paintBy).
   A finished run paints at once: Betweenness 2 (the fixtures' betweenness, 0 to 0.57) lands on top
   and wins Color, so the canvas and its legend show it; its eye shows and hides that paint.
   The starting look has no Size row: nodes start at one size. The row taken out of the list view is
   the kept set Group 6 (the fixtures' one node in group 6), which paints Color under PageRank, so it
   still paints and the canvas still shows only PageRank's color. */
(function () {
    "use strict";
    const CSS = `
.gp-drop-reason { list-style: none; display: flex; gap: 6px; align-items: flex-start; margin: 0 8px 0 56px; padding: 4px 8px; border-radius: 5px; background: var(--cm-bg-toolbar, #222); color: var(--cm-text-menu, #fff); font-size: 11px; line-height: 16px; color-scheme: dark; }
.gp-tree .ab-trow[data-drop-bad] { outline: 1px solid var(--cm-border-danger, var(--cm-text-danger)); outline-offset: -1px; }
.gp-ghost { list-style: none; display: flex; align-items: center; gap: 6px; height: 28px; margin: 0 8px 0 40px; padding: 0 8px; border-radius: 5px; outline: 1px dashed var(--cm-border-strong); background: var(--cm-bg); box-shadow: var(--cm-elevation-200); opacity: .9; }
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
.gp-unlisted, .gp-solo { flex: none; font-size: 11px; font-style: italic; }
.gp-tree .gp-runfind { list-style: none; padding-inline-start: 40px; }
.gp-tree .ab-trow[data-dim] :is(.ab-kind, .ab-sw-slot) { opacity: .4; } /* ponytail: the shared dim only grays the name, which reads as not dimmed in dark mode; move to app.css */
.gp-graph-notes { flex: none; margin-inline-end: 8px; font-size: 11px; }
.gp-stack { box-shadow: 3px -3px 0 -1px var(--gp-stack2), 3px -3px 0 0 var(--cm-bg); margin-inline-end: 3px; }
/* ponytail: a locked row always shows its lock (spec 3.3): the lock gets its own column left of the eye, so
   hover brings the eye up beside it instead of hiding the lock. Move to app.css (its lock rules hide the
   lock on hover and on a hidden row) and delete this. */
.gp-tree.ab-tree .ab-trow[data-locked] .ab-le { width: 40px; grid-template-columns: 20px 20px; }
.gp-tree.ab-tree .ab-trow[data-locked] .ab-le > * { grid-area: auto; }
.gp-tree.ab-tree .ab-trow[data-locked] .ab-le .ab-lock { visibility: visible; grid-column: 1; }
.gp-tree.ab-tree .ab-trow[data-locked] .ab-le .ab-eye { grid-column: 2; }
.gp-tree.ab-tree .ab-trow[data-locked] > .ab-topt { right: 44px; }
/* ponytail: the selected row's members, marked in the node table (spec 3.10); the table dock should read
   AB.treeMarked and draw this itself */
.td .k-table tr[data-tree-marked] td:first-child, #ab-dock tr[data-tree-marked] td:first-child { box-shadow: inset 3px 0 0 var(--cm-border-selected); }
.gp-runnone { list-style: none; padding: 2px 8px 4px 56px; }
.gp-scope { display: inline-flex; flex: none; color: var(--cm-icon); }
.ab-legend .gp-scope { margin-inline-start: -4px; }
.ab-legend .gp-scoped { flex: none; }
/* ponytail: a run's group row draws its color in the kind slot, so its empty swatch slot only narrows the name
   ("Comm..." in a 240 px tree); move to app.css for every group row and delete this */
.gp-tree .ab-trow[aria-level="2"] > .ab-sw-slot:empty { display: none; }
/* a run of many groups holds no notes on its groups, so their empty note slot gives its width to the name */
.gp-many .ab-trow[aria-level="2"] > .ab-tnotes:empty { min-width: 0; }
`;
    if (!document.getElementById("gp-style")) document.head.append(h("style", { id: "gp-style" }, CSS));

    const RUN_LABEL = "a run's name is its label, which graphty-element keeps read-only; a run is named by its algorithm, and a second run of the same algorithm is numbered (Louvain 2)";
    const GROUP_LABEL = "a run's groups renumber when it reruns; Create set to name one";
    // A run is named by its algorithm; "For the report" already holds a Betweenness, so this one is
    // the second (its options live in its Data tab, never in its name)
    const BT_NEW = "Betweenness 2";
    // The count column counts members: a run's members are its groups
    const groups = (n) => AB.count(n, "group");
    // Renames made this session, by row id, so a rename survives the redraw a navigation causes
    const renamed = AB.renamedRows = AB.renamedRows || {}; // shared: the row inspectors read a renamed row's name
    // Eye toggles made this session, by project and row id, so a hidden row stays hidden across navigation
    const eyes = {};
    const eyeKey = (id) => ((AB.route && AB.route.frame.dataset) || "lesmis") + ":" + id;
    // Rows put back in the list view this session (Show in list view), by row id
    const listedBack = new Set();
    // The row the reader last clicked: the tree keeps it marked while the inspector beside it still shows it,
    // also when the tree is drawn again (a menu closing, a move with Ctrl+])
    let picked = null;
    const keepEyes = (list) => list.forEach((r) => { if (r.eye != null && eyeKey(r.id) in eyes) r.eye = eyes[eyeKey(r.id)]; if (r.children) keepEyes(r.children); });

    // Louvain on Les Miserables (see the header comment for how these were computed)
    const LOUVAIN = [
        { n: 1, size: 25, color: "#E69F00" },
        { n: 2, size: 17, color: "#56B4E9" },
        { n: 3, size: 10, color: "#009E73", notes: 2 },
        { n: 4, size: 10, color: "#0072B2" },
        { n: 5, size: 9, color: "#D55E00" },
        { n: 6, size: 6, color: "#CC79A7" },
    ];

    // A second Louvain run (the same networkx call, resolution 1.5, seed 7): 7 communities. A run is named by
    // its algorithm and numbered from the second; its options live in its inspector, never in its name.
    const LOUVAIN2 = [21, 15, 12, 11, 10, 6, 2];
    const OKABE = ["#E69F00", "#56B4E9", "#009E73", "#0072B2", "#D55E00", "#CC79A7", "#F0E442"];

    // When another section drives the frame, the tree marks the row the inspector beside it shows.
    // The path the last Find path added on Les Miserables (path-popover's AB.lastPath), a third row under Shortest paths
    const lmFound = () => { const lp = AB.lastPath; return lp && (lp.ds || "lesmis") === "lesmis" && lp.route && !["Valjean to Javert", "Myriel to Javert"].includes(lp.name) ? lp : null; };
    function fromInspector() {
        const r = AB.route;
        if (!r || r.id === "graph-place" || !r.frame.right) return null;
        const [id, st = ""] = String(r.frame.right).split("/");
        let row = {
            "inspector-measure-row": st === "edge-measure" || st === "edge-measure-data" ? null : /^degree/.test(st) ? "degree" : st === "covered" || st === "on-filter" ? "bt" : "pagerank",
            "inspector-run-row": { "readings-only": "density", "pair-list": "pairs" }[st] || "louvain",
            "inspector-folder": "folder",
            "inspector-several-rows": st.startsWith("result-") ? "combined-" + st.slice(7) : null,
            "inspector-selection-and-everything": { selection: "selection", "notes-row": "notes", "notes-row-outlined": "notes", "notes-data": "notes", overrides: "overrides" }[st] || "everything",
            "inspector-group-set-path-row": { watchlist: "watchlist", "path-lesmis": "p1", "path-lesmis-found": "p3", path: "tp1", "path-door-entries": "dp1", "path-lesmis-2": "p2", "kept-2": "g2", "kept-8": "g8", "one-member": "g6", style: "c3", data: "c3", "top-degree": "top", notes: "c3", "label-by": "label-degree" }[st] || (st.startsWith("community-") ? "c" + st.slice(10) : null),
        }[id] || null;
        if (id === "inspector-measure-row" && /^painted-/.test(st)) row = "paint-" + st.slice(8);
        const sel = { "inspector-node": "1", "inspector-edge": "1", "inspector-several-elements": st === "two-nodes" ? String((AB.tablePicks || []).length || 2) : "5" }[id] || null;
        return { row, sel, selNoun: id === "inspector-edge" ? "edge" : null, edited: id === "inspector-node" && st === "edited" };
    }

    // One swatch for a run's shared palette: its first color, the second peeking behind
    function stack(c1, c2) {
        const s = AB.chit(c1, true);
        s.classList.add("gp-stack");
        s.style.setProperty("--gp-stack2", c2);
        return s;
    }
    // ponytail: Louvain 2 and the failed Closeness have no state in inspector-run-row or inspector-measure-row,
    // so their rows draw the one inspector frame (AB.inspector) beside the tree themselves; move each to a
    // state of its inspector section and give the row a go instead
    function inspectBeside(o) {
        const right = document.getElementById("ab-right");
        if (right) right.replaceChildren(AB.inspector(Object.assign({ kindKey: "run-row", renameDisabled: RUN_LABEL, menu: ["context-menus", "run-row"] }, o)));
    }
    const LOUVAIN2_RES = "1.5";
    function louvain2Inspector() {
        const sizes = LOUVAIN2.map((n, i) => AB.data("Community " + (i + 1), AB.count(n, "node")));
        inspectBeside({
            icon: AB.ICON.run, swatch: stack(OKABE[0], OKABE[1]), title: "Louvain 2", kind: "Run, resolution " + LOUVAIN2_RES,
            body: AB.dataTab({
                Summary: [AB.data("Communities", AB.num(LOUVAIN2.length))],
                Sizes: sizes,
                "Made with": { body: [AB.data("Method", "Louvain"), AB.data("Resolution", LOUVAIN2_RES + " (Louvain: 1.0)"), AB.data("Weight", "value, stronger"), AB.data("Seed", "7")] },
            }, { kind: "run" }),
        });
    }
    const FAILED = "Closeness failed: the GPU device was lost during the run. Nothing was computed on the CPU.";
    function failedInspector() {
        inspectBeside({
            icon: "circle-x", title: "Closeness", kind: "Run",
            stateBar: { text: "Failed: the GPU device was lost", why: FAILED,
                actions: [{ label: "Try WebGPU again", tip: "Runs it on WebGPU once more; nothing is computed on the CPU instead", onClick: () => AB.flash("Runs Closeness on WebGPU again (not available yet)") }] },
            body: AB.dataTab({
                Summary: [AB.data("Result", "None: the run wrote nothing")],
                "Made with": { body: [AB.data("Method", "Closeness"), AB.data("Ran on", "WebGPU")] },
            }, { kind: "run" }),
        });
    }
    const builtin = (o) => Object.assign({ pinned: true, builtin: true, eye: true }, o);
    // the selection's count names what is selected: "1 node", or "1 edge" beside the edge inspector
    const selectionRow = (count, noun) => builtin({ id: "selection", name: "Selection", kindIcon: "scan", count, countNoun: noun || undefined, go: ["inspector-selection-and-everything", "selection"] });
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
        // a path whose routes tie opens on its tied view (Route 1 of 2), as Find path left it
        const go = ["inspector-group-set-path-row", door ? "path-door-entries" : p && p.routes && p.routes.length > 1 ? "path-tied" : "path"];
        return { id: door ? "dpaths" : "tpaths", name: "Shortest paths", kindIcon: "route", swatch: AB.chit("#D55E00"), eye: true, open: true, renameDisabled: RUN_LABEL, go, menu: ["context-menus", "run-row"],
            children: [{ id: door ? "dp1" : "tp1", name, kindIcon: "route", swatch: AB.chit("#D55E00"), eye: true, go, menu: ["context-menus", "row"] }] };
    }
    // The door entries' noted elements: Ana Ruiz and B1, and the pair edge while the entries load per Pair
    const doorNoted = () => (!AB.fx.datasets.doorEntries.hasNotes() ? null : AB.fx.datasets.doorEntries.loaded.per === "pair" ? 3 : 2);
    function projectModel(state) {
        const ins = fromInspector();
        let rows;
        if (DOOR.includes(state)) rows = [selectionRow(ins && ins.sel, ins && ins.selNoun), notesRow(true, doorNoted()), everythingRow(true)];
        else if (freshT(state)) rows = [selectionRow(null), notesRow(true, null), everythingRow(true)];
        else { rows = manyModel(false); rows[2].selected = false; }
        if (state !== "door-entries" && state !== "transfers-loaded") rows.splice(2, 0, newRow(state));
        // a path just found lands selected (its inspector is beside it)
        const sel = ins ? ins.row : state === "path-found" ? "tp1" : null;
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
    let paintedAll = false; // the direct visit to painted: the hosts show all three ways an attribute paints
    function loadedModel(state) {
        const ins = fromInspector();
        const rows = [selectionRow(ins && ins.sel, ins && ins.selNoun), notesRow(true, null), everythingRow(true)];
        if (state === "wide-sized") rows.splice(2, 0, { id: "vuln", name: VULN, attr: true, kindIcon: AB.typeGlyph("num"), swatch: AB.ramp("#cfcfcf", "#4d4d4d"), eye: true, go: ["inspector-measure-row", "long-name"], menu: ["context-menus", "measure-row"] });
        // The measure rows Color by and Size by made (AB.painted), named after the attribute, newest on top
        const ds = loadedDs(state);
        (AB.painted[ds] || []).filter((p) => p.on === "row" && !(state === "wide-sized" && p.name === VULN)).forEach((p) => {
            const color = p.prop === "Color", num = p.type === "num";
            rows.splice(2, 0, { id: "paint-" + p.prop.toLowerCase(), name: p.name, attr: true, kindIcon: AB.typeGlyph(num ? "num" : "cat"), eye: true,
                swatch: !color ? null : num ? AB.ramp("#ef7818", "#662506") : stack("#E69F00", "#56B4E9"),
                go: ["inspector-measure-row", "painted-" + p.prop.toLowerCase()], menu: ["context-menus", "measure-row"] });
        });
        // Painting an attribute adds no new row kind (spec 3.2). On the direct visit to painted the hosts also
        // show the other two: Show as groups on a category (a group row, one child per value) and Label by
        // (a row named after the attribute, with its type glyph)
        if (state === "painted" && paintedAll && ds === "wide") {
            const attrs = AB.fx.datasets.wide.nodeAttributes, pal = AB.fx.canvas.categorical;
            const cat = attrs.find((a) => a.name === "tier"), lab = attrs.find((a) => a.name === "hostname");
            const open = (name) => () => AB.flash("Opens " + name + " in the inspector (not available yet)");
            rows.splice(2, 0,
                { id: "label-hostname", name: lab.name, attr: true, kindIcon: AB.typeGlyph("text"), eye: true, onOpen: open(lab.name), menu: ["context-menus", "measure-row"] },
                { id: "groups-tier", name: cat.name, attr: true, kindIcon: AB.typeGlyph("cat"), swatch: stack(pal[0], pal[1]), count: groups(Object.keys(cat.values).length), eye: true, open: true, onOpen: open(cat.name), menu: ["context-menus", "run-row"],
                    children: Object.entries(cat.values).map(([v, n], i) => ({ id: "tier-" + v, name: v, kindIcon: AB.chit(pal[i % pal.length], true), count: n, countNoun: "host", eye: true, onOpen: open(cat.name + " is " + v), menu: ["context-menus", "row"] })) });
        }
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
        const rt = AB.route;
        const SEL = { rename: "g2", "rename-chain": "g2", "rename-run-group": "c3", "rename-builtin": "everything", "rename-run-disabled": "louvain", partial: "louvain", queued: "louvain", running: null, failed: "failed", "louvain-open": "louvain", finished: null, "show-hidden": "g6" };
        let selRow = state in SEL ? SEL[state] : state === "empty" || state === "list-menu" ? null : "pagerank";
        if (ins) selRow = ins.row;
        const openLouvain = ["louvain-open", "rename-run-group"].includes(state) || /^c\d$/.test(selRow || "");
        const rows = [selectionRow(ins && ins.sel, ins && ins.selNoun), notesRow(state !== "notes-eye-off", state === "empty" ? null : state === "door-entries" ? 3 : undefined)];
        if (state === "empty") return rows.concat(everythingRow(true));
        if (ins && ins.edited) rows.push(builtin({ id: "overrides", name: "Overrides", kindIcon: "pencil", count: 1, go: ["inspector-selection-and-everything", "overrides"], menu: ["context-menus", "row"] }));
        // A Combine result (inspector-several-rows) stays on top of the tree, under the built-in rows
        (AB.combinedRows || []).forEach((c) => rows.push({ id: c.id, name: c.name, kindIcon: AB.ICON.set, count: c.count, eye: true, go: c.go, menu: ["context-menus", "row"] }));
        // Label by degree (an attribute's menu) adds its row on top, under the built-in rows
        if (ins && ins.row === "label-degree") rows.push({ id: "label-degree", name: "degree", kindIcon: AB.typeGlyph("num"), eye: true, go: ["inspector-group-set-path-row", "label-by"], menu: ["context-menus", "measure-row"] });
        // A new run lands on top, under the built-in rows
        const bt = { id: "betweenness-new", name: BT_NEW, kindIcon: "chart-column", swatch: AB.ramp("#fde7c8", "#E69F00"), eye: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] };
        if (state === "running" || state === "queued") rows.push(Object.assign(bt, { swatch: null, progress: 0.42, renameDisabled: RUN_LABEL, statusText: "Running: 42% of nodes", go: ["analyze-popover", "running"] }));
        // ponytail: no inspector state shows Betweenness 2 yet (inspector-measure-row has PageRank's and the
        // covered Betweenness'), so its row says so instead of opening PageRank's
        if (state === "finished") rows.push(Object.assign(bt, { go: null, onOpen: () => AB.flash("Opens " + BT_NEW + " in the inspector (not available yet)") }));
        // A run that found one group: its one child, and the footer's "1 group"
        if (state === "one-group") rows.push({ id: "components", name: "Connected components", kindIcon: AB.ICON.run, swatch: AB.chit("#0072B2", true), count: groups(1), eye: true, open: true, renameDisabled: RUN_LABEL, go: ["inspector-nothing-selected", "overview"], menu: ["context-menus", "run-row"],
            children: [{ id: "cc1", name: "Component 1", kindIcon: AB.chit("#0072B2", true), count: L.nodes, eye: true, renameDisabled: GROUP_LABEL, go: ["inspector-nothing-selected", "overview"], menu: ["context-menus", "row"] }] });
        // A failed run stays a row: the error icon, the element's message in its tooltip and in its inspector's state bar
        if (state === "failed") rows.push({ id: "failed", name: "Closeness", kindIcon: "chart-column", eye: null, status: "error", statusText: FAILED, renameDisabled: RUN_LABEL, onOpen: failedInspector, menu: ["context-menus", "run-row"] });
        // Louvain expanded: a second Louvain run sits on top of the first, numbered. Only on this place's own
        // route: the run-row inspector, the communities table and Update Louvain row frame this state with
        // Les Miserables' one Louvain run (its Data tab says no other run is there to compare with)
        if (state === "louvain-open" && rt && rt.id === "graph-place") rows.push({ id: "louvain2", name: "Louvain 2", kindIcon: AB.ICON.run, swatch: stack(OKABE[0], OKABE[1]), count: groups(LOUVAIN2.length), eye: true, renameDisabled: RUN_LABEL,
            onOpen: louvain2Inspector, menu: ["context-menus", "run-row"],
            children: LOUVAIN2.map((size, i) => ({ id: "l2c" + (i + 1), name: "Community " + (i + 1), kindIcon: AB.chit(OKABE[i], true), count: size, eye: true, renameDisabled: GROUP_LABEL, onOpen: () => AB.flash("Opens Louvain 2's Community " + (i + 1) + " in the inspector (not available yet)"), menu: ["context-menus", "row"] })) });
        rows.push(Object.assign({ id: "pagerank", name: "PageRank", kindIcon: "chart-column", swatch: AB.ramp("#ef7818", "#662506"), eye: true, go: ["inspector-measure-row", state === "scope-mark" ? "scope-mark" : "style"], menu: ["context-menus", "measure-row"] },
            state === "out-of-date" ? { status: "stale", statusText: "Out of date: the data changed after this run. It paints the earlier values until rerun." } : {}));
        const louvainStatus = state === "queued" ? { status: "queued", statusText: "Queued, 2nd. Starts when " + BT_NEW + " finishes", go: ["inspector-run-row", "queued"] }
            : state === "partial" ? { status: "partial", statusText: "Stopped at the time limit: the communities found so far paint", go: ["inspector-run-row", "partial"] } : {};
        rows.push(Object.assign({
            id: "louvain", name: "Louvain", kindIcon: AB.ICON.run, swatch: stack(LOUVAIN[0].color, LOUVAIN[1].color),
            count: groups(LOUVAIN.length), notes: 1, inside: LOUVAIN.reduce((t, c) => t + (c.notes || 0) + AB.sessionNotes.filter((x) => x.about.some((a) => a.label === "Community " + c.n)).length, 0), notesGo: ["inspector-run-row", "data"], eye: true, open: openLouvain, renameDisabled: RUN_LABEL,
            go: ["inspector-run-row", "style"], menu: ["context-menus", "run-row"],
            children: LOUVAIN.map((c) => ({ id: "c" + c.n, name: "Community " + c.n, kindIcon: AB.chit(c.color, true), /* a group is a filled circle in its color (spec 3.2) */ count: c.size, notes: c.notes, notesGo: c.notes ? ["inspector-group-set-path-row", "notes"] : null, eye: true, renameDisabled: GROUP_LABEL, go: ["inspector-group-set-path-row", "community-" + c.n], menu: ["context-menus", "row"] })),
        }, louvainStatus));
        rows.push({
            id: "paths", name: "Shortest paths", kindIcon: "route", swatch: AB.chit("#D55E00"), eye: true, open: true, renameDisabled: RUN_LABEL,
            go: ["inspector-run-row", "style"], menu: ["context-menus", "run-row"],
            children: [
                { id: "p1", name: "Valjean to Javert", kindIcon: "route", swatch: AB.chit("#D55E00"), count: 2, eye: true, go: ["inspector-group-set-path-row", "path-lesmis"], menu: ["context-menus", "row"] },
                { id: "p2", name: "Myriel to Javert", kindIcon: "route", swatch: AB.chit("#0072B2"), count: 3, eye: true, go: ["inspector-group-set-path-row", "path-lesmis-2"], menu: ["context-menus", "row"] },
            ].concat(lmFound() ? [{ id: "p3", name: lmFound().name, kindIcon: "route", swatch: AB.chit("#009E73"), count: lmFound().route.route.length, eye: true, go: ["inspector-group-set-path-row", "path-lesmis-found"], menu: ["context-menus", "row"] }] : []),
        });
        // Runs with nothing to paint (spec 3.1): graph-level readings (the gauge) and a pair list (the pair
        // icon). Still rows, with no eye and no swatch, so they take no part in paint order. The run-row
        // inspector draws these two itself beside its own states, so they are left out there.
        if (!String((rt && rt.frame.left) || "").startsWith("inspector-run-row/")) {
            rows.push({ id: "density", name: "Density", kindIcon: "gauge", eye: null, renameDisabled: RUN_LABEL, go: ["inspector-run-row", "readings-only"], menu: ["context-menus", "run-row"] });
            rows.push({ id: "pairs", name: "Link prediction", kindIcon: "link", eye: null, renameDisabled: RUN_LABEL, go: ["inspector-run-row", "pair-list"], menu: ["context-menus", "run-row"] });
        }
        // The kept set "Top 9 by degree" (inspector-several-rows combines it with Group 8): the nodes whose
        // degree reaches the 9th highest
        const cut = [...L.rows].sort((a, b) => b.degree - a.degree)[8].degree;
        rows.push({ id: "top", name: "Top " + L.rows.filter((r) => r.degree >= cut).length + " by degree", kindIcon: AB.ICON.set, swatch: AB.chit("#F0E442", true), count: L.rows.filter((r) => r.degree >= cut).length, eye: true, go: ["inspector-group-set-path-row", "top-degree"], menu: ["context-menus", "row"] });
        rows.push({ id: "watchlist", name: "Watchlist", kindIcon: AB.ICON.set, swatch: AB.chit("#CC79A7", true), count: 5, eye: true, locked: true, go: ["inspector-group-set-path-row", "watchlist"], menu: ["context-menus", "row"] });
        // Group 6 is not listed (removed from the list view, still painting Color under PageRank): drawn
        // dimmed only while Show rows removed from list view is on, and as a plain row once Show in list view puts it back
        const g6Back = listedBack.has("g6");
        if (state === "show-hidden" || g6Back) rows.push({ id: "g6", name: "Group 6", kindIcon: AB.ICON.set, swatch: AB.chit(L.groupColors[6], true), count: L.rows.filter((r) => String(r.group) === "6").length, eye: true, dim: !g6Back, go: ["inspector-group-set-path-row", "one-member"], menu: g6Back ? ["context-menus", "row"] : null });
        rows.push({
            id: "folder", name: "For the report", kindIcon: "folder-open", eye: true, open: true, go: ["inspector-folder", "folder"], menu: ["context-menus", "folder"],
            children: [
                { id: "g2", name: "Group 2", kindIcon: AB.ICON.set, swatch: AB.chit(g2.color, true), count: g2.count, eye: true, go: ["inspector-group-set-path-row", "kept-2"], menu: ["context-menus", "row"] },
                { id: "g8", name: "Group 8", kindIcon: AB.ICON.set, swatch: AB.chit(g8.color, true), count: g8.count, eye: true, go: ["inspector-group-set-path-row", "kept-8"], menu: ["context-menus", "row"] },
                { id: "bt", name: "Betweenness", kindIcon: "chart-column", swatch: AB.ramp("#fde7c8", "#E69F00"), eye: false, go: ["inspector-measure-row", "covered"], menu: ["context-menus", "measure-row"] },
            ],
        });
        rows.push(everythingRow(state !== "everything-hidden"));
        // Everything hidden: the rows above it are hidden too, so only Groups 2 and 8 paint (the canvas draws that)
        if (state === "everything-hidden") rows.forEach((r) => { if (["pagerank", "louvain", "paths", "watchlist"].includes(r.id)) r.eye = false; });
        // While the filter chip reads a part of the graph, every number in the tree was taken on the whole
        // graph: each counted row and each run carries the scope mark (the shared tree's "filtered" status),
        // its sentence in the tooltip. The built-in rows carry none: Selection counts what is selected now,
        // and Notes the elements notes are attached to, neither computed over the graph.
        if (state === "scope-mark") {
            const all = AB.count(L.nodes, "node"), left = AB.num(L.filterSteps.after.step1);
            const scope = (list) => list.forEach((x) => {
                if (!x.builtin && !x.status && (x.count != null || /^(pagerank|louvain|paths|bt)$/.test(x.id)))
                    Object.assign(x, { status: "filtered", statusText: (x.count != null ? "Counted on " : "Ran on ") + all + "; a filter now leaves " + left });
                if (x.children) scope(x.children);
            });
            scope(rows);
        }
        if (state === "rename-chain") renamed.g2 = renamed.g2 || "Valjean's family";
        const mark = (list) => list.forEach((r) => {
            r.selected = r.id === selRow;
            if (renamed[r.id]) r.name = renamed[r.id];
            else if (state === "long-names" && LONG[r.id]) r.name = LONG[r.id];
            const was = r.name;
            r.onRename = (name) => {
                renamed[r.id] = name;
                // the inspector open on this row (its header shows the old name) follows at once
                const head = document.querySelector("#ab-right .ab-insp-head .k-name");
                if (head && head.textContent === was) head.textContent = name;
            };
            if (r.children) mark(r.children);
        });
        mark(rows);
        return rows;
    }
    // Many groups: the transfers March Louvain run (fixtures: 35 communities, largest first), past 20
    // groups, so it arrives collapsed and, expanded, gets its own find line with Sort
    function manyModel(open = false) {
        // the groups and the "N more communities" row are the canvas legend's (one wording in the tree, the legend
        // and the inspector): the fixture colors the largest 7, by size
        const T = AB.fx.datasets.transactionsApril;
        const lv = T.louvain.march, lg = T.legends.march;
        const named = lg.rows.map((r) => ({ n: Number(r.name.replace(/\D/g, "")), name: r.name, size: r.count, color: r.color }));
        const go = ["inspector-run-row", "many-groups"];
        // the run's story (AB.transfersRun, inspector-run-row) or a data replace marks the Louvain row
        const replaced = AB.fx.datasets.transactions.file === T.files.transfers.file;
        const mark = AB.transfersRun === "failed" ? { status: "error", statusText: "Rerun on April data failed on WebGPU and wrote nothing; nothing was computed on the CPU. The March result is still shown. Try WebGPU again from its inspector." }
            : AB.transfersRun === "running" ? { progress: 0.4, statusText: "Rerunning on April data" }
                : replaced || AB.transfersRun === "data-changed" ? { status: "stale", statusText: "Out of date: Louvain used March data. It is now April." } : {};
        return [
            selectionRow(null), notesRow(true, null),
            {
                id: "louvain", name: "Louvain", kindIcon: AB.ICON.run, selected: true, swatch: stack(named[0].color, named[1].color), count: groups(lv.communities), eye: true, open, renameDisabled: RUN_LABEL, go, menu: ["context-menus", "run-row"], ...mark,
                children: named.map((c) => ({ id: "m" + c.n, name: c.name, kindIcon: AB.chit(c.color, true), /* a group is a filled circle in its color (spec 3.2) */ count: c.size, eye: true, renameDisabled: GROUP_LABEL, go, menu: ["context-menus", "row"] }))
                    .concat({ id: "more", name: lg.other.communities + " more communities", kindIcon: AB.chit("#BDBDBD", true), eye: true, renameDisabled: GROUP_LABEL, go: ["table-dock", "transfers"], menu: ["context-menus", "row"] }),
            },
            // A link count on a directed graph, named as the catalog names it, so it never reads as an amount
            { id: "links-in", name: "Links in (count)", kindIcon: "chart-column", swatch: AB.ramp("#ef7818", "#662506"), eye: true, renameDisabled: RUN_LABEL,
                onOpen: () => AB.flash("Opens Links in (count) in the inspector (not available yet)"), menu: ["context-menus", "measure-row"] },
            everythingRow(true),
        ];
    }

    // Elements hidden on canvas, wherever the frame shows them: the canvas state or Hide on canvas from the selection bar
    function hiddenOnCanvas() {
        const f = (AB.route && AB.route.frame) || {};
        if (f.canvas === "canvas-and-states/hidden-on-canvas") return "4 nodes";
        // Hide on canvas adds to one set (selection-bar's AB.hiddenOnCanvas), kept whatever is selected next
        if (AB.hiddenOnCanvas && AB.hiddenOnCanvas.size) return AB.count(AB.hiddenOnCanvas.size, "node");
        if (f.toolbar === "selection-bar/hidden") return "1 node";
        return null;
    }
    // The list view's words: a row's menu swaps Remove from list view and Show in list view; the list
    // options' toggle shows the rows removed from it, dimmed
    const SHOW_IN_LIST = "Show in list view", SHOW_NOT_LISTED = "Show rows removed from list view";
    let redraw = () => {};
    function showInList(id) {
        listedBack.add(id);
        redraw();
        AB.notice("Group 6 is in the list view again", { label: "Undo", onClick: () => { listedBack.delete(id); redraw(); AB.announce("Group 6 is not listed again"); } });
    }
    // ponytail: the not-listed row's menu, opened in place, until context-menus offers its row menu with
    // "Show in list view" for a target that is not listed (today it always reads Remove from list view)
    function notListedMenu(li) {
        AB.openMenu(li, [
            { heading: "Group 6" },
            { label: SHOW_IN_LIST, desc: "The row is listed again; its paint does not change", onClick: () => showInList("g6") },
            { label: "Show only this row", shortcut: "Alt+Space", onClick: () => { const eye = li.querySelector(".ab-eye"); if (eye) eye.dispatchEvent(new MouseEvent("click", { altKey: true, bubbles: true, detail: 1 })); } },
        ]);
    }
    // ---------- the footer line: one line, the most specific message first ----------
    function footer(state) {
        const L = (id, st, label) => AB.link(id, st, label);
        if (state === "one-group") return AB.treeFooter([["Connected components found 1 group."]]);
        // While a file is being read the graph is not empty: say so, not "Add data to start"
        if (state === "empty" && AB.route && /(^|-)loading$/.test(AB.route.state)) return AB.treeFooter([["Reading the data..."]]);
        // No graph at all: the first step is data, not a run
        if (state === "empty" && !(AB.route && ["transactions", "doorEntries"].includes(AB.route.frame.dataset))) {
            const add = AB.cmd("add-data");
            return AB.treeFooter([[AB.h("span", null, L(add.go[0], add.go[1], "Add data"), " to start")]]);
        }
        if (state === "empty" || loadedDs(state) || state === "door-entries" || (state === "transfers-loaded")) return AB.treeFooter([[AB.h("span", null, L("analyze-popover", "open", "Analyze"), " (Shift+A) to add results here")]]);
        return AB.treeFooter([
            state === "everything-hidden" && ["Everything is hidden. Unpainted nodes still take part in the layout. To leave them out, filter.", L("data-place", "filters", "Filter...")],
            hiddenOnCanvas() && [AB.h("span", null, hiddenOnCanvas() + " hidden on canvas. ", h("span", Object.assign({ class: "ab-link", role: "button" }, AB.act({ onClick: () => AB.flash("Selects the hidden elements (not available yet)") })), "Select"), ", ", L("canvas-and-states", "drawn", "Show")), AB.needsElement("a draw-only hide that also hides incident edges")],
            // the one row not listed (Group 6): its own way back, the row menu's Show in list view
            !listedBack.has("g6") && state === "show-hidden" && ["1 row not listed still paints; it shows dimmed here.", h("span", Object.assign({ class: "ab-link", role: "button" }, AB.act({ onClick: () => showInList("g6") })), SHOW_IN_LIST)],
            !listedBack.has("g6") && state !== "many-groups" && state !== "rerun-failed" && !DOOR.includes(state) && !TRANSFERS.includes(state) && ["1 row not listed still paints.", L("graph-place", "show-hidden", SHOW_NOT_LISTED)],
        ]);
    }

    // ---------- notes and scope marks on the tree's rows (spec 2.1 and 3.3) ----------
    // ponytail: these extend what AB.tree draws (lib.js), which today has one note slot, no click on
    // it and no ", N notes" in the row's name; once the shell's tree does these, delete decorate() and
    // pass notesInside again. The scope mark is the shared tree's "filtered" status icon, unchanged here.
    // - the note slot counts only notes about the row itself; a click on it selects the row and opens
    //   its notes (r.notesGo); the row's accessible name ends ", 2 notes"
    // - a collapsed row whose children carry notes gets a hollow "N inside" mark (r.inside), gone when expanded
    // ponytail: the shared tree draws "filtered" in the kind slot; move it beside the count in lib.js and
    // delete scopeMark and its use in decorate()
    const scopeMark = (text) => AB.tip(h("span", { class: "gp-scope", "aria-hidden": "true" }, icon("triangle-alert", "sm")), text, { label: false });
    function decorate(t) {
        t.querySelectorAll(".ab-trow").forEach((li) => {
            const r = li._entry && li._entry.r;
            if (!r) return;
            const slot = li.querySelector(".ab-tnotes");
            const name = li.getAttribute("aria-label") || r.name;
            // the fixture's notes plus any saved in this page view (the tree's badge counts both)
            const nn = (r.notes || 0) + AB.sessionNotes.filter((x) => x.about.some((a) => a.label === r.name && (a.go || [])[0] === (r.go || [])[0])).length;
            if (nn && !/ notes?$/.test(name)) li.setAttribute("aria-label", name + ", " + AB.count(nn, "note"));
            // a control inside the row, like the eye: not a Tab stop of its own (the row's menu has Open notes)
            if (r.notes && r.notesGo && slot) { slot.classList.add("gp-notes-go"); slot.setAttribute("role", "button"); slot.tabIndex = -1; AB.tip(slot, "Open " + AB.count(nn, "note") + " about " + r.name); }
            if (r.inside && !r.open && slot && !li.querySelector(".gp-inside")) {
                slot.after(AB.tip(h("span", { class: "gp-inside k-num", "aria-hidden": "true" }, String(r.inside)), AB.count(r.inside, "note") + " inside, about its groups; expand to see them", { label: false }));
                li.setAttribute("aria-description", AB.count(r.inside, "note") + " inside");
            }
            // The scope mark sits beside the row's number (or where its number goes), not on its kind icon
            const st = li.querySelector('.ab-status[data-status="filtered"]'), tc0 = li.querySelector(".ab-tcount");
            if (st && tc0 && !li.querySelector(".gp-scope")) {
                st.replaceWith(h("span", { class: "ab-kind" }, typeof r.kindIcon === "string" ? icon(r.kindIcon) : r.kindIcon || null));
                tc0.prepend(scopeMark(r.statusText));
            }
            // The rename gesture, named on the row's tooltip (a name that cannot change already gives its reason)
            const nm = li.querySelector(".ab-tname");
            // A failed run says what failed on its name too (F2 still gives the rename refusal)
            if (r.status === "error" && nm) AB.tip(nm, r.statusText, { label: false });
            if (nm && !nm.dataset.tip) AB.tip(nm, r.name, { label: false, second: "Double-click to rename" });
            // A row hidden from the list says so in words: the eye is paint, the list is only the list
            if (r.dim && nm && !li.querySelector(".gp-unlisted")) {
                nm.after(h("span", { class: "gp-unlisted k-secondary" }, "not listed"));
                li.setAttribute("aria-label", (li.getAttribute("aria-label") || r.name) + ", not listed");
                AB.tip(nm, "Not listed: removed from this list view, it still paints" + (r.id === "g6" ? " Color, under PageRank" : "") + ". Show in list view is in its menu", { label: false, second: "Double-click to rename" });
            }
            // A row named after an attribute or a path keeps its start and end (the full name is its tooltip)
            if (r.attr && nm && !nm.querySelector(".ab-mid")) nm.replaceChildren(AB.truncMiddle(r.name, 20));
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
    // The list menu opens in place over the tree on screen, so it never redraws the rows it is about: its
    // check reads the tree behind it (on in show-hidden). `here`: another project than Les Miserables, whose
    // not-listed rows are not drawn. `collapse` closes every row of the tree on screen.
    function listMenu(state, here, collapse) {
        const btn = document.getElementById("ab-list-btn");
        if (!btn) return;
        const on = state === "show-hidden";
        AB.openMenu(btn, [
            here ? AB.cmd("new-folder", { go: null, onClick: () => AB.flash("New folder (not available yet)") }) : AB.cmd("new-folder"),
            here ? { label: SHOW_NOT_LISTED, check: false, onClick: () => AB.flash("Shows the rows removed from the list view (not available yet)") }
                : { label: SHOW_NOT_LISTED, check: on, onClick: () => AB.go("graph-place", on ? "at-rest" : "show-hidden") },
            { label: "Collapse all", onClick: collapse },
        ]);
    }

    // ---------- a selected row's members, marked in the table (spec 3.10) ----------
    // AB.treeMarked is { row, members } (node names) for the Les Miserables row selected in the tree, or
    // null. A measure row paints every node, so it marks none. Outlining the members on the canvas needs
    // graphty-element (its hover layer taking a set).
    // ponytail: the Watchlist's members are also typed in inspector-group-set-path-row, inspector-several-
    // elements and export-dialog; one shared copy in the fixtures would replace all four
    const WATCHLIST = ["Valjean", "Javert", "Thenardier", "Mme.Thenardier", "Eponine"];
    const PATHS = { p1: ["Valjean", "Javert"], p2: ["Myriel", "Valjean", "Javert"] };
    function membersOf(id) {
        const L = AB.fx.datasets.lesmis, names = (f) => L.rows.filter(f).map((x) => x.label);
        const comm = (n) => ((AB.lesmisCommunities || []).find((c) => c.n === n) || {}).members || [];
        const g = /^g(\d)$/.exec(id), c = /^c(\d)$/.exec(id);
        if (g) return names((x) => String(x.group) === g[1]);
        if (c) return comm(Number(c[1]));
        if (id === "louvain") return LOUVAIN.flatMap((x) => comm(x.n));
        if (id === "top") { const cut = [...L.rows].sort((a, b) => b.degree - a.degree)[8].degree; return names((x) => x.degree >= cut); }
        if (id === "watchlist") return WATCHLIST;
        if (id === "paths") return [...new Set(Object.values(PATHS).flat())];
        return PATHS[id] || null;
    }
    // ponytail: the table dock does not read AB.treeMarked yet, so the tree marks the node table's rows
    // itself after each dock render; delete markTable and its observer once table-dock draws the mark
    function markTable() {
        const m = AB.treeMarked, set = new Set((m && m.members) || []);
        document.querySelectorAll("#ab-dock tbody tr[data-who]").forEach((tr) => {
            const on = set.has(tr.dataset.who);
            tr.toggleAttribute("data-tree-marked", on);
            if (on) tr.setAttribute("aria-description", "Member of " + m.row); else if (tr.getAttribute("aria-description") === "Member of " + (tr._gpRow || "")) tr.removeAttribute("aria-description");
            tr._gpRow = on ? m.row : null;
        });
    }
    let dockWatch = null;
    function setMarked(id, name) {
        const ds = (AB.route && AB.route.frame.dataset) || "lesmis";
        const members = ds === "lesmis" && id ? membersOf(id) : null;
        AB.treeMarked = members ? { row: name, members } : null;
        const dock = document.getElementById("ab-dock");
        if (dock && !dockWatch) { dockWatch = new MutationObserver(markTable); dockWatch.observe(dock, { childList: true, subtree: true }); }
        markTable();
    }

    // ---------- the place ----------
    function render(el, state) {
        if (state === "rows-with-notes") state = "find"; // version 2 id: Find covers it
        // The list menu open over the tree: list-menu over the tree at rest, list-menu-on over the tree
        // showing the rows removed from the list view (its option checked)
        const menuNow = state === "list-menu" || state === "list-menu-on";
        if (state === "list-menu-on") state = "show-hidden";
        // A direct visit to painted, before any Color by: the hosts colored by cpu_util_p95_pct
        if (state === "painted" && !AB.paintOf(paintedDs(), "Color") && !AB.paintOf(paintedDs(), "Size")) { AB.paintBy("wide", "Color", "cpu_util_p95_pct", "row"); paintedAll = true; }
        // The researchers' kept set, then sized by a nested path: an attribute row named by its dotted path
        if ((state === "nested-set" || state === "nested") && !AB.paintOf("nested", "Size")) AB.paintBy("nested", "Size", "attributes.profile.metrics.citations.last_5_years", "row");
        // The hosts at rest: sized by their 46-character attribute (wide-sized draws its own row for it)
        if (state === "wide" && !AB.paintOf("wide", "Size")) AB.paintBy("wide", "Size", VULN, "row");
        const L = AB.fx.datasets.lesmis;
        // A tree drawn with results from the start: the transfers project is no longer just loaded
        if (state === "many-groups" || state === "rerun-failed") T().fresh = false;
        const many = state === "many-groups" || state === "rerun-failed";
        const tGraph = many || TRANSFERS.includes(state) || (state === "empty" && AB.route && AB.route.frame.dataset === "transactions");
        // the graph being loaded names the head too (the door-entries loading screen draws the empty place)
        const doorGraph = DOOR.includes(state) || (state === "empty" && AB.route && AB.route.frame.dataset === "doorEntries");
        const ds = loadedDs(state);
        // an empty place in another project (a project file too large to draw) names that project's graph
        const emptyOf = state === "empty" && AB.route && !["lesmis", "transactions", "doorEntries"].includes(AB.route.frame.dataset) && AB.fx.datasets[AB.route.frame.dataset];
        // a new project's one graph has no name of its own yet (never the sample's)
        const graphNotes = state === "empty" || tGraph || doorGraph || ds ? 0 : 1; // the Notes place's one note about Les Miserables' graph
        const head = AB.graphHead("Graph", state === "empty" && !tGraph && !doorGraph && !emptyOf ? "Graph" : emptyOf && emptyOf.frame ? emptyOf.frame.graphRow : ds ? AB.fx.datasets[ds].frame.graphRow : tGraph ? AB.fx.datasets.transactions.graphName : doorGraph ? AB.fx.datasets.doorEntries.graphName : L.frame.graphRow,
            { trail: graphNotes ? AB.link("notes-place", "about-graph", AB.count(graphNotes, "note"), { class: "ab-link k-secondary gp-graph-notes", "aria-label": AB.count(graphNotes, "note") + " about this graph" }) : null });
        const finding = state === "find" || state === "find-no-match";
        const other = !!(ds || tGraph || doorGraph);
        // Collapse all closes every row of the tree on screen (set once the tree is drawn)
        let collapseAll = () => AB.go("graph-place", "at-rest");
        // The list's box is the one find (lib.js findBox): Rows from this tree (a set also by a member's
        // name), Elements and values from the project, Notes from the Notes place. The find states open
        // with their text typed
        const scroll = h("div", { class: "k-scroll" });
        const flatRows = (list) => list.flatMap((r) => [r].concat(r.children ? flatRows(r.children) : []));
        const bar = AB.treebar({
            value: state === "find" ? "Jav" : state === "find-no-match" ? "xyz" : null,
            find: {
                hide: scroll,
                rows: (q) => flatRows(rowsNow).filter((r) => !r.builtin && r.go).map((r) => {
                    if (AB.wordMatch(r.name, q) || r.name.toLowerCase().includes(q.toLowerCase())) return { label: r.name, sub: null, onPick: () => AB.go(r.go[0], r.go[1]) };
                    const m = !other && /^(g\d|watchlist|top)$/.test(r.id) ? (membersOf(r.id) || []).find((x) => x.toLowerCase().startsWith(q.toLowerCase())) : null;
                    return m ? { label: r.name, sub: "a member: " + m, onPick: () => AB.go(r.go[0], r.go[1]) } : null;
                }).filter(Boolean),
                notes: (q) => (AB.notesOf ? AB.notesOf(AB.route.frame.dataset || "lesmis") : []).filter((n) => n.text.toLowerCase().includes(q.toLowerCase()))
                    .map((n) => ({ label: n.text.length > 60 ? n.text.slice(0, 57) + "..." : n.text, sub: "about " + n.about.map((t) => t.label).join(" and "), onPick: () => { const t = n.about.find((x) => x.go); if (t) AB.go(t.go[0], t.go[1]); else AB.go("notes-place", "all"); } })),
            },
            menuGo: ["graph-place", "list-menu"],
            menuClick: () => listMenu(state, other, collapseAll),
            menuOpen: menuNow,
        });
        el.append(head, bar, scroll);
        if (finding) requestAnimationFrame(() => { const i = bar.querySelector("input"); if (i) i.focus(); });

        redraw = () => { if (el.isConnected) { el.replaceChildren(); render(el, state); } };
        const rowsNow = many ? manyModel() : model(state);
        keepEyes(rowsNow);
        const treeOpts = { label: "Paint order, top wins", onEye: (r) => { eyes[eyeKey(r.id)] = r.eye; } };
        const tree = AB.tree(rowsNow, treeOpts);
        collapseAll = () => {
            const shut = (list) => list.forEach((x) => { if (x.children) { x.open = false; shut(x.children); } });
            shut(rowsNow);
            const cur = scroll.querySelector(".ab-tree");
            if (cur) cur.replaceWith(AB.tree(rowsNow, treeOpts));
            AB.announce("Every row collapsed");
        };
        const flat = (rs) => rs.flatMap((r) => [r].concat(r.children || []));
        // The selected row is kept in the rows too, so a tree drawn again from them (Ctrl+] or Ctrl+[) keeps it
        const markPicked = (id) => flat(rowsNow).forEach((r) => { r.selected = String(r.id) === id; });
        scroll.addEventListener("click", (e) => {
            const li = e.target.closest && e.target.closest(".ab-trow");
            if (!li || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.target.closest(".ab-eye, .ab-disc")) return;
            picked = li.dataset.row;
            markPicked(picked);
            setMarked(picked, li._entry && li._entry.r.name);
        }, true);
        // The row not listed opens its own menu (Show in list view) on right-click and Shift+F10
        const notListed = (e) => { const li = e.target.closest && e.target.closest('.ab-trow[data-dim][data-row="g6"]'); return li; };
        scroll.addEventListener("contextmenu", (e) => { const li = notListed(e); if (!li) return; e.preventDefault(); e.stopPropagation(); notListedMenu(li); }, true);
        scroll.addEventListener("keydown", (e) => {
            const li = notListed(e);
            if (!li || e.target !== li || !((e.key === "F10" && e.shiftKey) || e.key === "ContextMenu")) return;
            e.preventDefault(); e.stopPropagation(); notListedMenu(li);
        }, true);
        const manyRun = many || (TRANSFERS.includes(state) && !freshT(state));
        if (manyRun) scroll.classList.add("gp-many");
        tree.classList.add("gp-tree");
        let foot = footer(state);
        AB.append(scroll, [tree, foot]);
        // While a row is soloed the list says so, with the way back (the footer's most specific line)
        const soloFoot = () => {
            const li = scroll.querySelector(".ab-trow[data-solo]");
            const name = li && li._entry && li._entry.r.name;
            const showAll = () => { const eye = li.querySelector(".ab-eye"); if (eye) eye.dispatchEvent(new MouseEvent("click", { altKey: true, bubbles: true, detail: 1 })); };
            const nf = li ? AB.treeFooter([["Showing only " + name + ".", h("span", Object.assign({ class: "ab-link", role: "button" }, AB.act({ onClick: showAll })), "Show all")]]) : footer(state);
            if (foot) foot.replaceWith(nf || ""); else if (nf) scroll.append(nf);
            foot = nf;
            // the soloed row says so itself, not only the footer
            scroll.querySelectorAll(".gp-solo").forEach((x) => x.remove());
            const nm = li && li.querySelector(".ab-tname");
            if (nm) nm.after(h("span", { class: "gp-solo k-secondary" }, "only"));
            AB.announce(li ? "Showing only " + name : "Showing all rows");
        };
        scroll.addEventListener("click", (e) => { if (e.altKey && e.target.closest && e.target.closest(".ab-eye")) setTimeout(soloFoot); }, true); // captured: the eye stops its click
        decorate(tree);
        // the row selected on arrival marks its members in the table too
        const selNow = flat(rowsNow).find((x) => x.selected);
        setMarked(selNow ? String(selNow.id) : null, selNow && selNow.name);
        scroll.addEventListener("click", onNoteCount, true);
        // Shift- or Ctrl-click on one of the two kept sets while the other is selected: both rows, together
        scroll.addEventListener("click", (e) => {
            if (!(e.shiftKey || e.ctrlKey || e.metaKey) || e.target.closest(".ab-eye")) return;
            const li = e.target.closest(".ab-trow"), id = li && li.dataset.row;
            const other = { top: "g8", g8: "top" }[id];
            const o = other && scroll.querySelector(`.ab-trow[data-row="${other}"]`);
            if (!o || o.getAttribute("aria-selected") !== "true") return;
            e.stopPropagation();
            AB.go("inspector-several-rows", "style");
        }, true);
        // the tree redraws itself on expand, collapse, delete and move: decorate the new one
        // The run's find line: a line of the tree right under the run, only while the run is expanded past
        // 20 groups (spec 3.9). It filters the run's groups by name or by member (word starts) and holds Sort.
        // A group's members are the accounts the fixture places in it; "N more communities" holds the rest.
        let runFind = null, runSort = "size";
        const accts = AB.fx.datasets.transactionsApril.rows;
        const filterRun = (t) => {
            const q = runFind ? runFind.querySelector("input").value.trim() : "";
            const kids = [...t.querySelectorAll('.ab-trow[aria-level="2"]')];
            const named = kids.map((li) => li._entry && li._entry.r.name);
            const hit = (li) => {
                const name = li._entry ? li._entry.r.name : "";
                if (AB.wordMatch(name, q)) return true;
                const mine = li._entry && li._entry.r.id === "more" ? (a) => !named.includes(a.community) : (a) => a.community === name;
                return accts.some((a) => mine(a) && AB.wordMatch(a.id, q));
            };
            kids.forEach((li) => { li.hidden = !!q && !hit(li); });
            t.querySelectorAll(".gp-runnone").forEach((x) => x.remove());
            if (q && runFind && !kids.some((li) => !li.hidden)) runFind.after(h("li", { class: "gp-runnone ab-fl-none", role: "none" }, AB.noMatch(q)));
            if (q) AB.announce(kids.some((li) => !li.hidden) ? AB.count(kids.filter((li) => !li.hidden).length, "group") + " match" : 'No match for "' + q + '"');
        };
        const syncRunFind = (t) => {
            if (!runFind) return;
            const lv = t.querySelector('.ab-trow[data-row="louvain"]');
            if (lv && lv.getAttribute("aria-expanded") === "true") { lv.after(runFind); filterRun(t); } else runFind.remove();
        };
        new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.classList && n.classList.contains("ab-tree")) { n.classList.add("gp-tree"); decorate(n); syncRunFind(n); } }))).observe(scroll, { childList: true });
        const row = (id) => tree.querySelector(`[data-row="${id}"]`);
        // The Notes row counts the elements notes are about
        const nc = row("notes") && row("notes").querySelector(".ab-tcount");
        if (nc) AB.tip(nc, DOOR.includes(state) ? (doorNoted() === 3 ? "2 nodes and 1 edge notes are about" : "2 nodes notes are about") : "3 nodes and 1 edge notes are about", { label: false });
        if (manyRun && row("louvain")) {
            const SORTS = ["paint order", "size", "name", "date"];
            // Sort reorders the run's groups in the list; the "N more" row stays last. Groups of one run
            // never overlap, so their order paints the same. Date is the order the run numbered them.
            const lvRow = rowsNow.find((r) => r.id === "louvain");
            const paint = lvRow.children.slice();
            const num = (r) => Number(String(r.id).replace(/\D/g, "")) || 0;
            const BY = { "paint order": (a, b) => paint.indexOf(a) - paint.indexOf(b), size: (a, b) => b.count - a.count || num(a) - num(b),
                name: (a, b) => a.name.localeCompare(b.name, "en", { numeric: true }), date: (a, b) => num(a) - num(b) };
            const sortRun = (v) => {
                runSort = v;
                const more = lvRow.children.filter((c) => c.id === "more");
                lvRow.children = lvRow.children.filter((c) => c.id !== "more").sort(BY[v]).concat(more);
                const cur = scroll.querySelector(".ab-tree");
                if (cur) cur.replaceWith(AB.tree(rowsNow, treeOpts));
                AB.tip(sortBtn, "Sort: " + v);
                sortBtn.focus();
                AB.announce("Louvain's groups sorted by " + v);
            };
            const sortBtn = AB.iconButton("arrow-up-down", "Sort: size", { onClick: () => AB.openMenu(sortBtn, SORTS.map((v) => ({ label: v[0].toUpperCase() + v.slice(1), check: runSort === v, onClick: () => sortRun(v) }))) });
            runFind = h("li", { class: "gp-runfind", role: "none" },
                h("label", { class: "ab-find" }, icon("search", "sm"), h("input", { type: "search", placeholder: "Find in Louvain", "aria-label": "Find groups in Louvain by name or member", on: { input: () => filterRun(scroll.querySelector(".ab-tree")) } })),
                sortBtn);
            syncRunFind(tree);
        }
        // A found path lands selected on top of the tree; the one notice offers only Undo
        if (state === "path-found") {
            const p = rowsNow.find((r) => r.id === "tpaths");
            if (p) AB.notice("Found " + p.children[0].name, { label: "Undo", go: ["graph-place", freshT(state) ? "transfers-loaded" : "many-groups"] });
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
        if (state === "one-group") AB.announce("Connected components found 1 group");
        // ponytail: the legend under a filter: canvas-and-states draws PageRank's range with no set, so its number
        // gets the set and the scope mark here; move to canvas-and-states (AB.range's { on }) and delete this
        if (state === "scope-mark") setTimeout(() => {
            const lab = [...document.querySelectorAll("#ab-canvas .ab-legend .k-lg-row .k-ellipsis")].find((x) => /^PageRank [\d.]+ to [\d.]+$/.test(x.textContent));
            if (!lab) return;
            const [, lo, hi] = lab.textContent.match(/([\d.]+) to ([\d.]+)/);
            const scope = AB.range(Number(lo), Number(hi), "PageRank", { on: L.nodes }).replace(/^.*?, /, "");
            const why = "Computed on " + AB.count(L.nodes, "node") + "; a filter now leaves " + AB.num(L.filterSteps.after.step1);
            lab.classList.add("gp-scoped");
            lab.after(scopeMark(why));
            const card = lab.closest(".ab-legend");
            card.append(h("div", { class: "k-lg-sub" }, scope[0].toUpperCase() + scope.slice(1) + "; the filter leaves " + AB.num(L.filterSteps.after.step1)));
            card.setAttribute("aria-label", "Legend: Color: PageRank, " + lab.textContent + ", " + scope + "; the filter leaves " + AB.num(L.filterSteps.after.step1));
        });
        // A run paints as soon as it finishes: it lands on top, so it wins Color
        // (the canvas paints from the tree, AB.paintRows)
        if (state === "finished") {
            AB.announce(BT_NEW + " finished and now paints Color");
        }
        if (state === "failed") setTimeout(failedInspector); // after the shell draws the inspector region
        if (state === "rename-chain") { f2("g8"); AB.announce("Renamed to Valjean's family. Renaming Group 8"); }
        // A name that cannot change ignores the gesture; its tooltip says why
        if (state === "rename-run-group") hover("c3");
        if (state === "rename-builtin") hover("everything");
        if (state === "rename-run-disabled") hover("louvain");
        if (menuNow) requestAnimationFrame(() => requestAnimationFrame(() => listMenu(state, other, collapseAll)));
        // The row the reader clicked stays marked while the inspector beside it shows that row, also when a
        // menu over the panels closes and the frame names another inspector
        if (picked) requestAnimationFrame(() => {
            const t = scroll.querySelector(".ab-tree"), li = t && t.querySelector(`.ab-trow[data-row="${picked}"]`);
            const head = document.querySelector("#ab-right .ab-insp-head .k-name");
            if (!li || !head || !li._entry || head.textContent.trim() !== li._entry.r.name) return;
            t.querySelectorAll(".ab-trow").forEach((x) => { x.setAttribute("aria-selected", String(x === li)); x.tabIndex = x === li ? 0 : -1; });
            markPicked(picked);
        });
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
            // just loaded: no runs and no filter steps yet, so every screen opened from here keeps that (placeOf reads fresh)
            if (state === "transfers-loaded") { T().fresh = true; return { dataset: "transactions" }; }
            if (state === "path-found" || state === "transfers-running") return Object.assign({ dataset: "transactions", canvas: freshT(state) ? "canvas-and-states/transfers" : "canvas-and-states/transfers-communities" }, state === "path-found" ? { right: "inspector-group-set-path-row/path" } : {});
            if (state === "louvain-open") return { right: "inspector-run-row/style" };
            if (state === "many-groups") return { dataset: "transactions", canvas: "canvas-and-states/transfers-communities", right: "inspector-run-row/many-groups" };
            // The transfers after a rerun on April data failed (the tree's Louvain row and its inspector say so)
            if (state === "rerun-failed") { AB.transfersRun = "failed"; if (AB.replaceTransfers) AB.replaceTransfers(); return { dataset: "transactions", canvas: "canvas-and-states/transfers-communities", right: "inspector-run-row/failed" }; }
            if (state === "scope-mark") return { right: "inspector-measure-row/scope-mark", shown: AB.fx.datasets.lesmis.filterSteps.after.step1, chip: AB.count(AB.fx.datasets.lesmis.filterSteps.after.step1, "node", { of: AB.fx.datasets.lesmis.nodes }), filterOn: ["degree"] };
            if (state === "queued" || state === "partial") return { right: "inspector-run-row/" + state };
            if (state === "running" || state === "failed" || state === "finished") return { right: "inspector-nothing-selected/overview" };
            if (state === "everything-hidden") return { right: "inspector-selection-and-everything/everything", canvas: "canvas-and-states/everything-hidden" };
            if (state === "show-hidden" || state === "list-menu-on") return { right: "inspector-group-set-path-row/one-member" };
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
            { id: "rerun-failed", label: "Transfers: the April rerun of Louvain failed" },
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
            { id: "show-hidden", label: "Show rows not listed on" },
            { id: "scope-mark", label: "After a filter step" },
            { id: "out-of-date", label: "After a data change" },
            { id: "invalid-drop", label: "Invalid drop" },
            { id: "find", label: "Find results" },
            { id: "list-menu", label: "List menu" },
            { id: "list-menu-on", label: "List menu, removed rows shown (checked)" },
            { id: "rename", label: "Renaming Group 2" },
            { id: "rename-chain", label: "Rename, Tab to the next row" },
            { id: "rename-run-group", label: "Rename refused: a run's group" },
            { id: "rename-builtin", label: "Rename refused: built-in row" },
            { id: "rename-run-disabled", label: "Rename refused: a run" },
            { id: "notes-eye-off", label: "Notes row hidden" },
            { id: "find-no-match", label: "Find: no match" },
            { id: "one-group", label: "A run that found 1 group" },
            { id: "long-names", label: "60-character row and folder names" },
            { id: "wide", label: "Hosts (wide project), at rest: sized by a 46-character attribute" },
            { id: "wide-sized", label: "Hosts with a Size row on the 46-character attribute" },
            { id: "nested", label: "Research network (nested JSON), sized by a nested path" },
            { id: "nested-set", label: "Research network with a kept set of 23 researchers, sized by a nested path" },
            { id: "plain-json", label: "Coauthors (plain JSON graph), just loaded" },
            { id: "registry", label: "Package registry (keyed JSON), just loaded" },
            { id: "painted", label: "After Color by or Size by on an attribute (directly: the hosts, nothing painted yet)" },
        ],
        render,
    });
})();
