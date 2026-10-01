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
   state uses the transfers March Louvain run from the fixtures (35 communities). */
(function () {
    "use strict";
    const CSS = `
.gp-drop-reason { list-style: none; display: flex; gap: 6px; align-items: flex-start; margin: 0 8px 0 56px; padding: 4px 8px; border-radius: 5px; background: var(--cm-bg-toolbar, #222); color: var(--cm-text-menu, #fff); font-size: 11px; line-height: 16px; color-scheme: dark; }
.gp-tree .ab-trow[data-drop-bad] { outline: 1px solid var(--cm-border-danger, var(--cm-text-danger)); outline-offset: -1px; }
.gp-ghost { list-style: none; display: flex; align-items: center; gap: 6px; height: 28px; margin: 0 8px 0 40px; padding: 0 8px; border-radius: 5px; outline: 1px dashed var(--cm-border-strong); background: var(--cm-bg); box-shadow: var(--cm-elevation-200, 0 2px 8px #0003); opacity: .9; }
body.gp-nodrop, body.gp-nodrop * { cursor: no-drop !important; }
.gp-runfind { list-style: none; cursor: default; display: flex; gap: 4px; align-items: center; padding: 2px 0 4px 40px; }
.gp-runfind .ab-find { height: 22px; }
.gp-find-head { padding: 8px 16px 2px; font-size: 11px; line-height: 16px; font-weight: 550; color: var(--cm-text-secondary); }
.gp-hit { display: flex; align-items: center; gap: 6px; min-height: 28px; margin: 0 8px; padding: 2px 8px; border-radius: 5px; cursor: pointer; }
.gp-hit:hover { background: var(--cm-bg-hover); }
.gp-hit-text { flex: 1 1 auto; min-width: 0; }
.gp-hit-sub { display: block; font-size: 11px; line-height: 15px; color: var(--cm-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gp-hit mark { background: var(--cm-bg-warning, #fde68a); color: inherit; border-radius: 2px; }
.gp-stack { box-shadow: 3px -3px 0 -1px var(--gp-stack2), 3px -3px 0 0 var(--cm-bg); margin-inline-end: 3px; }
`;
    if (!document.getElementById("gp-style")) document.head.append(h("style", { id: "gp-style" }, CSS));

    const RUN_LABEL = "a run's name is its label, which graphty-element keeps read-only";
    const GROUP_LABEL = "a run's groups renumber when it reruns; Keep as set (in the row's menu) to name one";
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
        const row = {
            "inspector-measure-row": st === "edge-measure" || st === "edge-measure-data" ? null : st === "degree" ? "degree" : "pagerank",
            "inspector-run-row": st === "readings-only" ? null : "louvain",
            "inspector-folder": "folder",
            "inspector-selection-and-everything": { selection: "selection", "notes-row": "notes", "notes-row-outlined": "notes", "notes-data": "notes", overrides: "overrides" }[st] || "everything",
            "inspector-group-set-path-row": { watchlist: "watchlist", "path-lesmis": "p1", path: "p2", "path-lesmis-2": "p2", "kept-2": "g2", "kept-8": "g8", notes: "c3", "label-by": "label-degree" }[st] || (st.startsWith("community-") ? "c" + st.slice(10) : null),
        }[id] || null;
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
    const selectionRow = (count) => builtin({ id: "selection", name: "Selection", kindIcon: "scan", count, go: ["inspector-selection-and-everything", "selection"], menu: ["context-menus", "row"] });
    // Notes keeps its name and cannot be deleted, but drags like any row
    const notesRow = (eye, count) => ({ id: "notes", name: "Notes", kindIcon: AB.ICON.note, builtin: true, count: count === undefined ? 4 : count, countTip: "Noted nodes and edges", eye, go: ["inspector-selection-and-everything", "notes-row"], menu: ["context-menus", "notes-row"] });
    const everythingRow = (eye) => builtin({ id: "everything", name: "Everything", kindIcon: "base-layer", eye, go: ["inspector-selection-and-everything", "everything"], menu: ["context-menus", "row"] });

    // ---------- the rows, in paint order ----------
    function model(state) {
        const L = AB.fx.datasets.lesmis;
        const g = (label) => L.frame.legend.rows.find((r) => r.label === label);
        const g2 = g("2"), g8 = g("8");
        const ins = fromInspector();
        const SEL = { rename: "g2", "rename-chain": "g2", "rename-run-group": "c3", "rename-builtin": "everything", "rename-run-disabled": "louvain", partial: "louvain", queued: "louvain", running: null, failed: null, "louvain-open": "louvain", finished: "betweenness-new", "show-hidden": "degree" };
        let selRow = state in SEL ? SEL[state] : state === "empty" || state === "list-menu" ? null : "pagerank";
        if (ins) selRow = ins.row;
        const openLouvain = ["louvain-open", "rename-run-group"].includes(state) || /^c\d$/.test(selRow || "");
        const rows = [selectionRow(state === "solo" ? 5 : ins && ins.sel), notesRow(state !== "notes-eye-off", state === "empty" ? null : state === "door-entries" ? 3 : undefined)];
        if (state === "empty" || state === "door-entries") return rows.concat(everythingRow(true));
        if (ins && ins.edited) rows.push(builtin({ id: "overrides", name: "Overrides", kindIcon: "pencil", count: 1, go: ["inspector-selection-and-everything", "overrides"], menu: ["context-menus", "row"] }));
        // Label by degree (an attribute's menu) adds its row on top, under the built-in rows
        if (ins && ins.row === "label-degree") rows.push({ id: "label-degree", name: "degree", kindIcon: "hash", eye: true, go: ["inspector-group-set-path-row", "label-by"], menu: ["context-menus", "measure-row"] });
        // A new run lands on top, under the built-in rows
        const bt = { id: "betweenness-new", name: "Betweenness", kindIcon: "chart-column", swatch: AB.ramp("#fde7c8", "#E69F00"), eye: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] };
        if (state === "running" || state === "queued") rows.push(Object.assign(bt, { swatch: null, progress: 0.42, renameDisabled: RUN_LABEL, statusText: "Running: 42% of nodes", go: ["analyze-popover", "running"] }));
        if (state === "finished") rows.push(bt);
        if (state === "failed") rows.push({ id: "failed", name: "Closeness", kindIcon: "chart-column", eye: null, status: "error", statusText: "Failed: the GPU device was lost during the run. Nothing was computed on the CPU.", renameDisabled: RUN_LABEL, go: ["inspector-run-row", "failed"], menu: ["context-menus", "run-row"] });
        const filtered = state === "scope-mark" ? { status: "filtered", statusText: "Ran on 77 nodes; a filter now leaves 60" } : {};
        rows.push(Object.assign({ id: "pagerank", name: "PageRank", kindIcon: "chart-column", swatch: AB.ramp("#ef7818", "#662506"), eye: true, go: ["inspector-measure-row", state === "scope-mark" ? "scope-mark" : "style"], menu: ["context-menus", "measure-row"] }, filtered,
            state === "out-of-date" ? { status: "stale", statusText: "Out of date: the data changed after this run. It paints the earlier values until rerun." } : {}));
        const louvainStatus = state === "queued" ? { status: "queued", statusText: "Rerun queued, 2nd. Starts when Betweenness finishes", go: ["inspector-run-row", "queued"] }
            : state === "partial" ? { status: "partial", statusText: "Stopped at the time limit: the communities found so far paint", go: ["inspector-run-row", "partial"] } : {};
        rows.push(Object.assign({
            id: "louvain", name: "Louvain", kindIcon: AB.ICON.run, swatch: stack(LOUVAIN[0].color, LOUVAIN[1].color),
            count: 77, notes: 1, notesInside: 2, eye: true, open: openLouvain, renameDisabled: RUN_LABEL,
            go: ["inspector-run-row", "style"], menu: ["context-menus", "run-row"],
            children: LOUVAIN.map((c) => ({ id: "c" + c.n, name: "Community " + c.n, kindIcon: AB.chit(c.color, true), /* a group is a filled circle in its color (spec 3.2) */ count: c.size, notes: c.notes, eye: true, renameDisabled: GROUP_LABEL, go: ["inspector-group-set-path-row", "community-" + c.n], menu: ["context-menus", "row"] })),
        }, filtered, louvainStatus));
        rows.push({
            id: "paths", name: "Shortest paths", kindIcon: "route", swatch: AB.chit("#D55E00"), eye: true, open: true, renameDisabled: RUN_LABEL,
            go: ["inspector-run-row", "style"], menu: ["context-menus", "run-row"],
            children: [
                { id: "p1", name: "Valjean to Javert", kindIcon: "route", swatch: AB.chit("#D55E00"), count: 2, eye: true, go: ["inspector-group-set-path-row", "path-lesmis"], menu: ["context-menus", "row"] },
                { id: "p2", name: "Myriel to Javert", kindIcon: "route", swatch: AB.chit("#0072B2"), count: 3, eye: true, go: ["inspector-group-set-path-row", "path"], menu: ["context-menus", "row"] },
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
                id: "louvain", name: "Louvain", kindIcon: AB.ICON.run, selected: true, swatch: stack(named[0].color, named[1].color), eye: true, open: true, renameDisabled: RUN_LABEL, go, menu: ["context-menus", "run-row"],
                children: named.map((c) => ({ id: "m" + c.n, name: "Community " + c.n, kindIcon: AB.chit(c.color, true), /* a group is a filled circle in its color (spec 3.2) */ count: c.size, eye: true, renameDisabled: GROUP_LABEL, go, menu: ["context-menus", "row"] }))
                    .concat({ id: "more", name: rest + " more communities", kindIcon: "circle-dot", swatch: AB.chit("#BDBDBD", true), eye: true, renameDisabled: GROUP_LABEL, go: ["table-dock", "transfers"], menu: ["context-menus", "row"] }),
            },
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
        if (state === "empty" || state === "door-entries") return AB.treeFooter([[AB.h("span", null, L("analyze-popover", "open", "Analyze"), " (Shift+A) to add results here")]]);
        return AB.treeFooter([
            state === "everything-hidden" && ["Everything is hidden. Unpainted nodes still take part in the layout. To leave them out, filter.", L("data-place", "filters", "Filter...")],
            hiddenOnCanvas() && [AB.h("span", null, hiddenOnCanvas() + " hidden on canvas. ", h("span", Object.assign({ class: "ab-link", role: "button" }, AB.act({ onClick: () => AB.flash("Selects the hidden elements (not wired in the skeleton)") })), "Select"), ", ", L("canvas-and-states", "drawn", "Show")), AB.needsElement("a draw-only hide that also hides incident edges")],
            state !== "show-hidden" && state !== "many-groups" && ["1 row hidden from this list.", L("graph-place", "show-hidden", "Show")],
        ]);
    }

    // ---------- Find: rows first, then notes ----------
    function drawFind(b) {
        b.append(h("div", { class: "gp-find-head" }, "Rows"));
        const hit = (ic, sw, text, sub, target) => b.append(h("div", Object.assign({ class: "gp-hit", role: "option" }, AB.act({ go: target })), icon(ic), sw, h("span", { class: "gp-hit-text" }, text, sub ? h("span", { class: "gp-hit-sub" }, sub) : null)));
        const hi = (s) => { const i = s.indexOf("Jav"); return [s.slice(0, i), h("mark", null, "Jav"), s.slice(i + 3)]; };
        hit("route", AB.chit("#D55E00"), hi("Valjean to Javert"), "in Shortest paths", ["inspector-group-set-path-row", "path-lesmis"]);
        hit("route", AB.chit("#0072B2"), hi("Myriel to Javert"), "in Shortest paths", ["inspector-group-set-path-row", "path"]);
        hit(AB.ICON.set, AB.chit("#CC79A7", true), "Watchlist", "a member: Javert", ["inspector-group-set-path-row", "watchlist"]);
        b.append(h("div", { class: "gp-find-head" }, "Notes"));
        hit(AB.ICON.note, null, hi("Valjean and Javert land in the same community..."), "about Louvain", ["inspector-run-row", "data"]);
    }

    function listMenu(state) {
        const btn = document.getElementById("ab-list-btn");
        if (!btn) return;
        AB.openMenu(btn, [
            { label: "New folder", shortcut: "Ctrl+G", onClick: () => AB.flash("New folder (not wired in the skeleton)") },
            { label: "Show hidden rows", check: state === "show-hidden", onClick: () => AB.go("graph-place", state === "show-hidden" ? "at-rest" : "show-hidden") },
            { label: "Collapse all", onClick: () => AB.go("graph-place", "at-rest") },
        ]);
    }

    // ---------- the place ----------
    function render(el, state) {
        if (state === "rows-with-notes") state = "find"; // version 2 id: Find covers it
        const L = AB.fx.datasets.lesmis;
        const many = state === "many-groups";
        // the graph being loaded names the head too (the door-entries loading screen draws the empty place)
        const doorGraph = state === "door-entries" || (state === "empty" && AB.route && AB.route.frame.dataset === "doorEntries");
        const head = AB.graphHead("Graph", many ? AB.fx.datasets.transactions.graphName : doorGraph ? AB.fx.datasets.doorEntries.graphName : L.frame.graphRow, { notes: state === "empty" || many || doorGraph ? 0 : 1 });
        const bar = AB.treebar({
            value: state === "find" ? "Jav" : null,
            onKey: (e, input) => {
                if (e.key === "Enter" && input.value) AB.go("graph-place", "find");
                if (e.key === "Escape" && state === "find") AB.go("graph-place", "at-rest");
            },
            onInput: (input) => { if (!input.value && state === "find") AB.go("graph-place", "at-rest"); },
            menuGo: ["graph-place", state === "list-menu" ? "at-rest" : "list-menu"],
            menuOpen: state === "list-menu",
        });
        const scroll = h("div", { class: "k-scroll" });
        el.append(head, bar, scroll);
        if (state === "find") { drawFind(scroll); return; }

        const tree = AB.tree(many ? manyModel() : model(state), { label: "Paint order, top wins" });
        tree.classList.add("gp-tree");
        AB.append(scroll, [tree, footer(state)]);
        const row = (id) => tree.querySelector(`[data-row="${id}"]`);
        // The Notes row counts the elements notes are about
        const nc = row("notes") && row("notes").querySelector(".ab-tcount");
        if (nc) AB.tip(nc, "3 nodes and 1 edge notes are about", { label: false });
        if (many) {
            const run = row("louvain");
            if (run) run.after(h("li", { class: "gp-runfind", role: "none" },
                h("label", { class: "ab-find" }, icon("search", "sm"), h("input", { type: "search", placeholder: "Find in Louvain", "aria-label": "Find groups in Louvain by name or member" })),
                AB.iconButton("arrow-up-down", "Sort: size", { onClick: () => AB.flash("Sort by paint order, size, name or date (not wired in the skeleton)") })));
        }
        if (state === "solo") { const eye = row("pagerank") && row("pagerank").querySelector(".ab-eye"); if (eye) eye.dispatchEvent(new MouseEvent("click", { altKey: true, bubbles: true, detail: 1 })); }
        if (state === "invalid-drop") {
            // the path being dragged over the Louvain run, and the one inline reason the tree keeps
            const tgt = row("louvain");
            tgt.setAttribute("data-drop-bad", "");
            tgt.after(h("li", { class: "gp-ghost", role: "none" }, icon("route"), AB.chit("#D55E00"), "Valjean to Javert"),
                h("li", { class: "gp-drop-reason", role: "status" }, icon("circle-x", "sm"), "A run holds only its own results."));
            document.body.classList.add("gp-nodrop");
            const off = () => { document.body.classList.remove("gp-nodrop"); window.removeEventListener("hashchange", off); };
            window.addEventListener("hashchange", off);
        }
        const f2 = (id) => requestAnimationFrame(() => { const li = row(id); if (li) { li.focus(); li.dispatchEvent(new KeyboardEvent("keydown", { key: "F2", bubbles: true })); } });
        const hover = (id) => setTimeout(() => { const n = row(id) && row(id).querySelector(".ab-tname"); if (n) n.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" })); }, 60);
        if (state === "rename") f2("g2");
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
            if (state === "empty") return { right: "inspector-nothing-selected", canvas: "canvas-and-states/empty", dock: false };
            if (state === "door-entries") return { dataset: "doorEntries" }; // the shell brings its canvas, inspector and table
            if (state === "louvain-open") return { right: "inspector-run-row/style" };
            if (state === "many-groups") return { dataset: "transactions", canvas: "canvas-and-states/transfers-communities", right: "inspector-run-row/many-groups" };
            if (state === "scope-mark") return { right: "inspector-measure-row/scope-mark", chip: "Filtered: 60 of 77 nodes" };
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
        ],
        render,
    });
})();
