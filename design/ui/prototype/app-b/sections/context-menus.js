/* Context menus: what a right-click (or Shift+F10) opens on each kind of target, and what the
   inspector's "..." opens (the same list, word for word). The menu is drawn in the overlay layer
   at the point that was clicked; the frame behind it shows that target selected.

   Every menu keeps one section order, leaving out what does not apply (structure-b-refined.md
   section 10.3): heading (the target's name only) | Rename | select and explore | Analyze... |
   organize | Frame selection | visibility and data | Add note, Show in table | Delete.
   Labels and keys come from AB.cmd where a command has more than one door. Two-state commands
   swap their label (Pin / Unpin, Lock / Unlock, Remove from list view / Show in list view); a mixed
   selection shows both. A row taken out of the list view still paints ("not listed"); "hidden" is
   kept for elements that are not drawn. Every list row's menu has "Show only this row", the
   command the eye's Alt-click and Alt+Space are accelerators for. Delete acts at once and shows the Undo notice. Plain ASCII. */
(function () {
    "use strict";
    const SUB = "cm-sub";
    const C = AB.cmd;
    const L = () => AB.fx.datasets.lesmis;
    // A menu acts on what it was opened on: the row or inspector that opened it names its target in
    // AB.menuTarget (shared rule 1). The name is kept for that state's redraws; a direct link to a
    // state names the state's own sample target (its `who`).
    let target = null; // { state, name }
    let opened = null; // { state, name, f }: the frame of the screen the menu was opened over
    const who = (state) => (target && (target.state === state || (state === "top-n" && target.state === "measure-row")) ? target.name : STATES[state].who);
    // A command the prototype does not model: close the menu, then the notice
    const done = (text, action) => ({ onClick: () => { AB.close(); setTimeout(() => AB.notice(text, action), 0); } });
    const flash = (label) => done(label + " (not available yet)");
    // Delete: immediate, with Undo
    const del = (label, what) => ({ label, shortcut: "Del", onClick: () => { AB.close(); setTimeout(() => AB.deleted(what), 0); } });
    // A tree row's Delete is its Delete key (AB.deleteRow): the row goes, the notice is the tree's own, Undo puts it back
    const delRow = (name) => ({ label: "Delete", shortcut: "Del", onClick: () => { AB.close(); setTimeout(() => AB.deleteRow(name), 0); } });
    // Deleting an element from the data is "Delete" (Del) like every other delete, on the canvas and in the
    // table alike; Hide on canvas keeps it
    const removeData = (what) => ({ ...del("Delete", what), desc: "Removes it from the data, not only from the canvas; Undo puts it back" });
    // Create set on a selection is the selection bar's Create set, pressed once the menu has closed back to
    // that selection, so the menu and the bar are one command with one effect and one confirmation
    const createSet = () => C("create-set", { go: null, onClick: () => {
        addEventListener("hashchange", () => requestAnimationFrame(() => {
            const b = document.querySelector("#ab-toolbar [data-tool='Create set']");
            if (b) b.click(); else AB.go(...AB.COMMANDS["create-set"].go);
        }), { once: true });
        AB.close();
    } });
    // Create set on a row: an independent set row on top of the tree (AB.combinedRows, where the tree draws
    // a Combine result), named after the row, so it survives the run's rerun
    const createSetFrom = (n, r) => C("create-set", { desc: "A set on top of the tree, named after this row, that survives a rerun", go: null, onClick: () => {
        const c = { id: "set-from-" + (r.id || n), name: n, count: typeof r.count === "number" ? r.count : null, go: r.go || ["inspector-group-set-path-row", "style"] };
        if (!(AB.combinedRows || []).some((x) => x.id === c.id)) AB.combinedRows = (AB.combinedRows || []).concat(c);
        addEventListener("hashchange", () => AB.notice("Created '" + n + "' in Sets", { label: "Undo", onClick: () => {
            AB.combinedRows = AB.combinedRows.filter((x) => x !== c);
            AB.redrawLeft = true;
            AB.render();
        } }), { once: true });
        AB.redrawLeft = true;
        AB.close();
    } });

    // Two-state commands: one item whose label swaps; both labels for a mixed selection
    const twoState = (on, off, isOn, desc) => (isOn === "mixed"
        ? [{ label: off, desc, ...flash(off) }, { label: on, desc, ...flash(on) }]
        : [{ toggle: [on, off], on: isOn, desc, ...flash(isOn ? on : off) }]);
    const pin = (isOn) => twoState("Unpin", "Pin", isOn, "Pinned nodes stay put when the layout runs");
    const lock = (isOn) => twoState("Unlock", "Lock", isOn).map((it) => ({ ...it, shortcut: "Ctrl+Shift+L" }));
    // Studio decision, reversible, for round 8 to test: "Remove from list view" replaces "Hide in list",
    // because a "hidden" row that still paints read as a bug (4 of 5)
    const listVis = (notListed) => twoState("Show in list view", "Remove from list view", notListed, "The row still paints the graph; it shows as not listed");
    // Show only this row: the eye's Alt-click on the row in the left panel, so the menu and the
    // accelerator are one command with one effect
    const showOnly = (rowId) => ({ label: "Show only this row", shortcut: "Alt+Space", desc: "Only this row paints; run it again to restore the other eyes",
        onClick: () => { AB.close(); setTimeout(() => { const eye = document.querySelector(`#ab-left [data-row="${rowId}"] .ab-eye`); if (eye) eye.dispatchEvent(new MouseEvent("click", { altKey: true, bubbles: true, detail: 1 })); }, 0); } });
    const listItems = (rowId) => [...listVis(false), showOnly(rowId)];

    // A point marker in the overlay, at a percent of the canvas stage or of an element's box.
    function mark(el, target, fx, fy, ring) {
        const m = h("span", { class: "cm-point" + (ring ? " cm-ring" : ""), "aria-hidden": "true" });
        m.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
        if (ring) m.style.cssText += ";width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;box-shadow:0 0 0 2px var(--k-mark-out),0 0 0 4px var(--k-mark-in)";
        el.append(m);
        const t = typeof target === "string" ? document.querySelector(target) : target;
        if (t && t !== el) t.scrollIntoView({ block: "nearest" }); // a row below the fold comes into view first
        const R0 = el.getBoundingClientRect();
        const R = t ? t.getBoundingClientRect() : R0;
        m.style.left = R.left - R0.left + (R.width * fx) / 100 + "px";
        m.style.top = R.top - R0.top + (R.height * fy) / 100 + "px";
        return m;
    }

    // A submenu opened from an item; items as for AB.menu.
    function sub(el, items) {
        return (e) => {
            el.querySelectorAll("." + SUB).forEach((x) => x.remove());
            const s = AB.menu({ anchor: e.currentTarget, place: "right-start", items });
            s.classList.add(SUB);
            el.append(s);
        };
    }
    const combine = (el) => ({ label: "Combine with selected rows", sub: true, onClick: sub(el, [
        { label: "Union", go: ["inspector-several-rows", "result-union"] },
        { label: "Intersect", go: ["inspector-several-rows", "result-intersect"] },
        { label: "Subtract", go: ["inspector-several-rows", "result-subtract"] },
        { label: "Exclude", go: ["inspector-several-rows", "result-exclude"] },
    ]) });
    const moveTo = (el, n) => ({ label: "Move to folder", sub: true, onClick: sub(el, [
        { label: "For the report", ...done("Moved " + n + " to For the report") },
        { sep: true },
        C("new-folder", { go: null, ...done("Moved " + n + " to New folder") }),
    ]) });
    const rename = (state) => C("rename", { go: ["graph-place", state || "rename"] });
    const showInTable = (state) => ({ label: "Show in table", go: ["table-dock", state || "nodes"] });
    const frameSel = () => C("frame-selection");

    // One node: the canvas right-click and the inspector's "...". The table's row menu (o.table) is the
    // same list word for word, minus Show in table
    const nodeItems = (o) => [
        { heading: o.name },
        C("neighborhood"),
        // always listed; it needs a second node to run, so with one node it is disabled with that reason
        o.second ? C("find-paths") : C("find-paths", { disabled: "Select a second node first" }),
        { sep: true },
        C("analyze"),
        { sep: true },
        createSet(),
        { label: "Add to set...", ...flash("Add to set") },
        // only a node that is in a set gets its Remove from; in the fixtures that is Valjean in Watchlist
        o.name === "Valjean" ? { label: "Remove from Watchlist", ...done("Removed Valjean from Watchlist", { label: "Undo", onClick: () => AB.announce("Valjean is back in Watchlist") }) } : null,
        { sep: true },
        frameSel(),
        { sep: true },
        ...pin(o.pinned),
        C("hide-on-canvas"),
        { sep: true },
        C("add-note"),
        o.table ? null : showInTable(),
        { sep: true },
        removeData(o.name + " and its edges"),
    ].filter(Boolean);

    // The graph's one list: the empty canvas's right-click and the nothing-selected inspector's "..."
    const graphItems = () => [
        { heading: (() => { const D = AB.fx.datasets[(AB.route && AB.route.frame.dataset) || "lesmis"] || L(); return (D.frame && D.frame.graphRow) || D.graphName || L().frame.graphRow; })() }, // the project on screen
        { label: "Select all visible", shortcut: "Ctrl+A", go: ["inspector-selection-and-everything", "selection"] },
        { label: "Invert selection", shortcut: "I", ...flash("Invert selection") },
        C("reselect-previous", { go: null, ...flash("Reselect previous") }),
        { sep: true },
        C("fit"),
        { sep: true },
        // runs in place: the graph on screen stays, its nodes move
        C("rerun-layout", { go: null, ...done("Layout re-run", { label: "Undo", onClick: () => AB.announce("Earlier positions restored") }) }),
        { label: "Reshuffle layout seed", desc: "A new seed in the graph's Layout section; lays out again", ...flash("Reshuffle layout seed") },
        { label: "Unpin all", desc: "Every pinned node goes back to the layout", ...flash("Unpin all") },
        // the project on screen: each project's overview has a computed state
        { label: "Compute the overview", onClick: () => {
            const f = (AB.route && AB.route.frame) || {};
            // another project's computed state is drawn for the project on screen (inspector-nothing-selected's computedView)
            AB.go("inspector-nothing-selected", (f.dataset || "lesmis") === "lesmis" && /^[\d,]+ of /.test(f.chip || "") ? "filtered-computed" : "computed");
        } },
        { label: "Add node...", desc: "One node, typed by hand", ...flash("Add node") },
        { sep: true },
        C("add-note"),
        { sep: true },
        C("clear-graph-data", { onClick: () => { AB.close(); setTimeout(() => AB.COMMANDS["clear-graph-data"].onClick(), 0); } }),
    ];

    // The same words as the Data place's own source-row menu (data-place.js), the one a reader opens
    const sourceItems = (url) => [
        { heading: url ? "The alert feed address" : AB.fx.datasets.transactions.file },
        C("rename", flash("Rename")),
        { sep: true },
        C("replace-file", { desc: "Opens the file picker, then the Data page with every role carried over; the graph is untouched if it fails" }),
        // the decided label, as the Data place's own row menu says it; it opens the page headed "Add to transfers" (data-page add-rows)
        { label: "Add rows from file...", desc: "More rows of the same table from a file, kept with the rows already loaded", ...(url ? flash("Add to structuring alerts") : { go: ["data-page", "add-rows"] }) },
        C("edit-source", { desc: "The Data page at this table" }),
        // Refresh only for an address: a file has nothing to read again (Replace with file... picks it anew)
        url ? { label: "Refresh", desc: "Reads the address again; the graph is untouched if it fails", go: ["data-place", "refreshing"] } : null,
        { sep: true },
        { label: "Remove", shortcut: "Del", needs: "graphty-element does not record which table each node and edge came from, so one table cannot be removed on its own; Clear graph data is in the graph's menu" },
    ].filter(Boolean);

    // Compare with another run...: the run rows on screen, earlier runs of the same measure first (a
    // copy lands on top, so the rows below this one are earlier), then later runs of it, then the other
    // runs. A second run of an algorithm is numbered (Louvain 2, graph-place's run label), so the measure
    // is the name without that number; the opened row is skipped by its element. The comparison page
    // holds the transfers' two Louvain runs; elsewhere a pick says it is not available yet
    function compareRuns(n) {
        const me = rowEl(n);
        const lis = [...document.querySelectorAll("#ab-left [data-row]")];
        const at = lis.indexOf(me);
        const runs = lis.map((li, i) => ({ i, r: li._entry && li._entry.r }))
            .filter(({ i, r }) => lis[i] !== me && r && r.menu && r.menu[1] === "run-row" && r.kindIcon === AB.ICON.run); // group runs only, not paths
        const measure = (x) => x.split(/[,:(]/)[0].trim().replace(/\s+\d+$/, "");
        const same = runs.filter(({ r }) => measure(r.name) === measure(n));
        const earlier = same.filter(({ i }) => i > at), later = same.filter(({ i }) => i < at), other = runs.filter(({ r }) => measure(r.name) !== measure(n));
        const pick = ({ r }) => ({ label: r.name, ...(AB.route && AB.route.frame.dataset === "transactions" ? { go: ["full-canvas-modes", "comparison"] } : flash("Compare " + n + " with " + r.name)) });
        const group = (heading, list) => (list.length ? [{ sep: true }, { heading }, ...list.map(pick)] : []);
        return [
            { heading: "Earlier runs of " + measure(n) },
            ...(earlier.length ? earlier.map(pick) : [{ label: "No earlier run", disabled: "Run as copy keeps this run and adds a new one to compare" }]),
            ...group("Later runs of " + measure(n), later),
            ...group("Other runs", other),
        ];
    }

    const onStage = () => ["#ab-canvas .k-stage", L().anchors.selected.x, L().anchors.selected.y, true];
    const byText = (sel, re) => [...document.querySelectorAll(sel)].find((r) => re.test(r.textContent));
    // The tree row the menu was opened on (by its name), else the state's sample row
    const rowEl = (n) => [...document.querySelectorAll("#ab-left [data-row]")].find((x) => { const t = x.querySelector(".ab-tname"); return !!t && t.textContent.trim() === n; });
    // The tree row's own record (lib.js keeps it on the li), for the row the menu was opened on
    const rowOf = (n) => { const li = rowEl(n); return (li && li._entry && li._entry.r) || null; };
    const rowAt = (state, id) => { const r = rowEl(who(state)); return [r || `#ab-left [data-row=${id}]`, 55, 50, false]; };
    const RUN = "Louvain"; // run rows are named by their algorithm

    // A hosts number attribute with its own inspector state (inspector-attribute-and-filter-step/long-name)
    const HOST_NUMBER = "vuln_count_critical_unremediated_over_30_days";
    // Ties are kept whole (AB.topN, the one Top N rule): the line under the choices says how many that
    // selects, so a tie at the cut that adds nodes is never a surprise
    function topNPopover(anchor, measure, signed) {
        let dir = "high";
        const n = h("input", { class: "k-input", type: "number", min: "1", value: "5", "aria-label": "How many", style: "width:64px" });
        const dirs = signed ? [["high", "Largest increase"], ["low", "Largest decrease"]] : [["high", "Highest"], ["low", "Lowest"]];
        const ties = h("div", { class: "ab-empty", "aria-live": "polite" });
        const say = () => {
            const k = Math.max(1, parseInt(n.value, 10) || 1), vals = measure === "PageRank" && AB.lesmisPR;
            if (!vals) { ties.textContent = "A tie at the cut is kept whole, so more may be selected"; return; }
            const got = AB.topN(vals, (v) => (dir === "high" ? v : -v), k).length;
            ties.textContent = "Selects " + AB.count(got, "node") + (got > k ? ": a tie at the cut is kept whole" : "; a tie at the cut is always kept whole");
        };
        n.addEventListener("input", say);
        say();
        return AB.popover({
            anchor, title: "Select top N by " + measure,
            body: [
                AB.fieldRow("How many", n, { popover: true }),
                AB.fieldRow("Which", AB.seg(dirs, dir, (v) => { dir = v; say(); }, { label: "Which end of the ranking" }), { popover: true }),
                ties,
            ],
            foot: AB.button("Select", { go: ["inspector-several-elements", "style"] }),
        });
    }

    // Each state: where it points, what the frame shows, and the items (a function of the overlay el).
    const STATES = {
        node: {
            label: "A node (Valjean)",
            frame: { right: "inspector-node/why-this-look" },
            at: onStage,
            who: "Valjean",
            items: (el, n) => nodeItems({ name: n, pinned: false }),
        },
        "node-pinned": {
            label: "A pinned node, with a second node selected",
            frame: { right: "inspector-several-elements/two-nodes" },
            at: onStage,
            pinned: true, // the node's pinned mark on the canvas
            who: "Valjean",
            items: (el, n) => nodeItems({ name: n, pinned: true, second: true }),
        },
        "table-row": {
            label: "A node's row in the table (same as the node)",
            frame: { right: "inspector-node/why-this-look", dock: "table-dock/nodes" },
            // a row's menu opens on an open table
            before: () => AB.openDock(),
            at: () => [document.querySelector("#td-row-Valjean") || byText("#ab-dock tbody tr", /Valjean/) || "#ab-dock tbody tr", 30, 50, false],
            place: "above-start",
            who: "Valjean",
            items: (el, n) => nodeItems({ name: n, pinned: false, table: true }),
        },
        edge: {
            label: "An edge (Javert -- Valjean)",
            frame: { right: "inspector-edge/style", dock: "table-dock/edges" },
            at: () => [byText("#ab-dock tbody tr", /^\s*Javert\s*Valjean/) || "#ab-dock tbody tr", 30, 50, false],
            who: "Javert -- Valjean",
            items: (el, n) => [
                { heading: n },
                { label: "Select endpoints", go: ["inspector-several-elements", "two-nodes"] },
                { sep: true },
                C("hide-on-canvas"),
                { sep: true },
                C("add-note"),
                showInTable("edges"),
                { sep: true },
                removeData("the edge " + n),
            ],
        },
        several: {
            label: "Several nodes, one of them pinned",
            frame: { right: "inspector-several-elements/style" },
            at: onStage,
            items: () => [
                { heading: "5 nodes" },
                C("neighborhood"),
                { sep: true },
                C("analyze"),
                { sep: true },
                createSet(),
                { label: "Lay out members...", ...flash("Lay out members") },
                { label: "Extract as graph", needs: "graphty-element cannot copy a subgraph into a new graph yet" },
                { label: "Merge nodes...", needs: "graphty-element has no merge of nodes and their edges" },
                { sep: true },
                frameSel(),
                { sep: true },
                ...pin("mixed"),
                C("hide-on-canvas"),
                { label: "Copy ids", ...done("Copied 5 ids") },
                { sep: true },
                C("add-note"),
                showInTable(),
                { sep: true },
                removeData("5 nodes and their edges"),
            ],
        },
        "several-path": {
            label: "Nodes and an edge (Create path shows)",
            frame: { right: "inspector-several-elements/two-nodes" },
            at: onStage,
            items: () => [
                { heading: "2 nodes and 1 edge" },
                C("neighborhood"),
                { sep: true },
                C("analyze"),
                { sep: true },
                createSet(),
                { label: "Create path", go: ["inspector-group-set-path-row", "path-lesmis"] },
                { label: "Lay out members...", ...flash("Lay out members") },
                { label: "Extract as graph", needs: "graphty-element cannot copy a subgraph into a new graph yet" },
                { sep: true },
                frameSel(),
                { sep: true },
                ...pin(false),
                C("hide-on-canvas"),
                { label: "Copy ids", ...done("Copied 3 ids") },
                { sep: true },
                C("add-note"),
                showInTable(),
                { sep: true },
                removeData("2 nodes and 1 edge"),
            ],
        },
        canvas: {
            label: "The graph: empty canvas",
            at: () => ["#ab-canvas", 22, 78, false],
            items: graphItems,
        },
        graph: {
            label: "The graph: nothing-selected \"...\"",
            frame: { right: "inspector-nothing-selected/overview" },
            at: () => [document.querySelector("#ab-right [aria-label^='More actions']") || "#ab-right", 0, 100, false],
            place: "below-end",
            items: graphItems,
        },
        row: {
            label: "A group, set or path row (Community 3)",
            frame: { left: "graph-place/louvain-open", right: "inspector-group-set-path-row/community-3" },
            at: () => rowAt("row", "c3"),
            who: "Community 3",
            items: (el, n) => { const r = rowOf(n) || (n === "Community 3" ? { id: "c3", renameDisabled: true } : {}); return [
                { heading: n },
                // a run's group renumbers on rerun: the same refusal the tree's name gives; a set or path renames
                r.renameDisabled ? C("rename", { disabled: "A run's groups renumber when it reruns; Create set to name one" })
                    : C("rename", { go: null, onClick: () => {
                        // F2 on the row once the screen behind the menu is back
                        addEventListener("hashchange", () => requestAnimationFrame(() => requestAnimationFrame(() => { const li = rowEl(n); if (li) { li.focus(); li.dispatchEvent(new KeyboardEvent("keydown", { key: "F2", bubbles: true })); } })), { once: true });
                        AB.close();
                    } }),
                { sep: true },
                { label: "Select members", go: ["inspector-several-elements", "style"] },
                { sep: true },
                C("analyze"),
                { label: "Compare with another row...", go: ["full-canvas-modes", "comparison"] },
                { sep: true },
                createSetFrom(n, r),
                combine(el),
                moveTo(el, n),
                { label: "Collapse on canvas", needs: "graphty-element cannot draw a group as one node yet" },
                { sep: true },
                C("frame-members", { go: ["canvas-and-states", "drawn"] }),
                { sep: true },
                ...lock(!!r.locked),
                ...listItems(r.id || "c3"),
                { sep: true },
                C("add-note"),
                { label: "Open notes", go: ["inspector-group-set-path-row", "notes"] },
                { label: "Show members in table", go: ["table-dock", "members-of-row"] },
                { sep: true },
                delRow(n),
            ]; },
        },
        "notes-row": {
            label: "The Notes row (built-in)",
            frame: { left: "graph-place/at-rest", right: "inspector-selection-and-everything/notes-row" },
            at: () => ["#ab-left [data-row=notes]", 55, 50, false],
            items: () => [
                { heading: "Notes" },
                { label: "Select what notes are about", go: ["notes-place", "about-selection"] },
                { sep: true },
                ...listItems("notes"),
                { sep: true },
                C("add-note"),
            ],
        },
        "measure-row": {
            label: "A measure row (PageRank)",
            frame: { left: "graph-place/at-rest", right: "inspector-measure-row/style" },
            at: () => rowAt("measure-row", "pagerank"),
            who: "PageRank",
            items: (el, n) => [
                { heading: n },
                rename(),
                { sep: true },
                { label: "Select top N...", go: ["context-menus", "top-n"] },
                { sep: true },
                { label: "Compare with another row...", go: ["full-canvas-modes", "comparison"] },
                { sep: true },
                ...lock(false),
                ...listItems("pagerank"),
                { label: "Filter to...", go: ["data-place", "filters"] },
                { sep: true },
                C("add-note"),
                showInTable(),
                { sep: true },
                delRow(n),
            ],
        },
        "run-row": {
            label: "A run row (Louvain)",
            frame: { left: "graph-place/at-rest", right: "inspector-run-row/style" },
            at: () => rowAt("run-row", "louvain"),
            who: RUN,
            items: (el, n) => [
                { heading: n },
                C("rename", { needs: "graphty-element names a run after its algorithm and settings; a run cannot be renamed yet" }),
                { sep: true },
                { label: "Rerun", go: ["graph-place", "running"] },
                // ponytail: no Graph place state draws a copy of this run on top yet (graph-place's "finished"
                // is a new Betweenness run), so the copy says so rather than open another algorithm's result
                C("run-as-copy", { desc: "Runs again under a new name; this row is left unchanged", go: null, ...flash("Run " + n + " as copy") }),
                { label: "Check against a null model and other seeds...", needs: "graphty-element has no null-model or seed-stability check" },
                { label: "Compare with another run...", desc: "Puts this run's groups beside another run's", sub: true, onClick: sub(el, compareRuns(n)) },
                { sep: true },
                { label: "Restore the suggested look", desc: "Puts back the style layers the algorithm suggests", ...flash("Restore the suggested look") },
                { label: "Lay out by these groups", ...flash("Lay out by these groups") },
                { label: "Restore an earlier result", needs: "graphty-element keeps only the latest result of a run" },
                { sep: true },
                ...lock(false),
                ...listItems("louvain"),
                { sep: true },
                C("add-note"),
                { label: "Show members in table", go: ["table-dock", "communities"] },
                { sep: true },
                delRow(n),
            ],
        },
        folder: {
            label: "A folder (For the report)",
            frame: { left: "graph-place/at-rest", right: "inspector-folder/style" },
            at: () => rowAt("folder", "folder"),
            who: "For the report",
            items: (el, n) => [
                { heading: n },
                rename(),
                { sep: true },
                { label: "Ungroup", shortcut: "Ctrl+Shift+G", desc: "Its rows stay where they are, out of the folder", ...done("Ungrouped " + n, { label: "Undo", onClick: () => AB.announce("Folder restored") }) },
                { sep: true },
                ...lock(false),
                ...listItems("folder"),
                { sep: true },
                delRow(n),
            ],
        },
        // An attribute's menu is the one attribute menu (AB.attributeMenu), the same list Data >
        // Attributes, the attribute inspector's "..." and a table column open. It has no Color by or
        // Size by: painting from an attribute is a bind in a row's Style tab. Shown on a hosts number attribute.
        attribute: {
            label: "An attribute (a number attribute of the hosts)",
            frame: { left: "data-place/attributes-wide", dataset: "wide", right: "inspector-attribute-and-filter-step/long-name" },
            // the row is scrolled to the list's middle so the whole menu opens below it, clear of the window bottom
            at: () => {
                const r = [...document.querySelectorAll("#ab-left .ab-fl-opt")].find((x) => (x.getAttribute("aria-label") || x.textContent).split(",")[0].trim().replace(/^\W+/, "") === HOST_NUMBER);
                if (r) r.scrollIntoView({ block: "center" });
                return [r || "#ab-left", 100, 100, false];
            },
            open: (anchor) => AB.attributeMenu(anchor, "wide", HOST_NUMBER, { table: ["wide", "wide"] }),
        },
        // Select top N...: how many, and one direction choice (on a signed column the choice reads
        // Largest increase / Largest decrease instead of Highest / Lowest)
        "top-n": {
            label: "Select top N... on a measure row (PageRank)",
            frame: { left: "graph-place/at-rest", right: "inspector-measure-row/style" },
            at: () => ["#ab-left [data-row=pagerank]", 100, 50, false],
            who: "PageRank",
            open: (anchor, el, n) => el.append(topNPopover(anchor, n, false)),
        },
        "filter-step": {
            label: "A filter step (amount >= 1,000)",
            frame: { left: "data-place/filters", right: "inspector-attribute-and-filter-step/filter-step" },
            at: () => [document.querySelector("#ab-right [aria-label^='More actions']") || "#ab-right", 0, 100, false],
            place: "below-end",
            who: "amount >= 1,000",
            items: (el, n) => [
                { heading: n },
                { label: "Move up", shortcut: "Ctrl+]", disabled: "Already first" },
                { label: "Move down", shortcut: "Ctrl+[", ...flash("Move down") },
                { sep: true },
                C("add-note"),
                { sep: true },
                del("Delete", "the step " + n),
            ],
        },
        "saved-view": {
            label: "A saved view (Whole cast)",
            frame: { left: "views-place/one-selected", right: "inspector-saved-view/view" },
            at: () => [byText("#ab-left .vp-row", /Whole cast/) || "#ab-left .vp-row", 55, 50, false],
            who: "Whole cast",
            items: (el, n) => [
                { heading: n },
                C("rename", { needs: "graphty-element cannot rename a saved camera view yet" }),
                { sep: true },
                { label: "Update to current camera", ...done(n + " now shows the current camera", { label: "Undo", onClick: () => AB.announce(n + " restored") }) },
                { sep: true },
                del("Delete", n),
            ],
        },
        source: {
            label: "A data source (a file)",
            // the transfers as just loaded (no filters), as the Data place shows them after Load
            frame: { left: "data-place/empty-filters", dataset: "transactions", right: "inspector-nothing-selected/transfers" },
            at: () => [byText("#ab-left .dp-row", new RegExp(AB.fx.datasets.transactions.file.replace(/\./g, "\\."))) || "#ab-left", 55, 50, false],
            items: () => sourceItems(false),
        },
        "source-url": {
            label: "A data source (from a URL)",
            frame: { left: "data-place/url-source", dataset: "transactions", right: "inspector-nothing-selected/transfers" },
            at: () => [byText("#ab-left .dp-row", /alert feed|https?:/i) || "#ab-left", 55, 50, false],
            items: () => sourceItems(true),
        },
        note: {
            label: "A note",
            frame: { left: "notes-place/all" },
            at: () => ["#ab-left .np-note[data-note=n5]", 60, 40, false],
            items: () => {
                const n = document.querySelector("#ab-left .np-note[data-note=n5] .np-text");
                const words = n ? n.textContent.trim().split(/\s+/) : ["Note"];
                return [
                    { heading: words.slice(0, 6).join(" ") + (words.length > 6 ? "..." : "") },
                    { label: "Edit", go: ["notes-place", "editing"] },
                    { label: "Copy link to note", ...done("Copied a link to the note") },
                    { sep: true },
                    del("Delete", "the note"),
                ];
            },
        },
    };

    const ids = Object.keys(STATES);
    registerSection({
        // Esc and a command that closes the menu go back to the screen it was opened from
        get closeTo() { return (opened && opened.from) || undefined; },
        id: "context-menus",
        title: "Context menus",
        region: "overlay",
        states: ids.map((id) => ({ id, label: STATES[id].label })),
        frame: (state) => {
            const R = AB.route;
            if (AB.menuTarget && typeof AB.menuTarget.name === "string" && R && STATES[state] && STATES[state].who) {
                // the row's own inspector when it has one, else the inspector already showing it
                const r = rowOf(AB.menuTarget.name), go = r && r.go;
                const right = go && /^inspector-/.test(go[0]) ? go[0] + "/" + go[1] : R.frame.right;
                opened = { state, name: AB.menuTarget.name, from: R.frame.overlay ? R.closeTo.id + "/" + (R.closeTo.state || "") : R.id + "/" + R.state, f: { right } };
                ["left", "canvas", "dock", "dataset", "chip", "mode"].forEach((k) => { if (R.frame[k] != null) opened.f[k] = R.frame[k]; });
                return opened.f;
            }
            if (opened && opened.state === state && R && R.id === "context-menus") return opened.f; // that menu's redraws
            if (!R || R.id !== "context-menus") { opened = null; target = null; } // a direct link: the state's sample target
            return (STATES[state] && STATES[state].frame) || (state === "run-delete" ? { left: "graph-place/at-rest" } : {});
        },
        render(el, state) {
            // An old link to the removed run-delete confirmation: Delete acts at once
            if (state === "run-delete") {
                setTimeout(() => { AB.go("graph-place", "at-rest"); setTimeout(() => AB.deleteRow(RUN), 0); }, 0);
                return;
            }
            const s = STATES[state] || STATES.node;
            if (AB.menuTarget && typeof AB.menuTarget.name === "string") { target = { state, name: AB.menuTarget.name }; AB.menuTarget = null; }
            else if (target && target.state !== state && !(state === "top-n" && target.state === "measure-row")) target = null;
            const n = STATES[state] ? who(state) : STATES.node.who;
            if (s.before) s.before();
            // the frame's regions render before the overlay; wait a frame so their boxes exist
            requestAnimationFrame(() => {
                const [target, fx, fy, ring] = s.at();
                const p = mark(el, target, fx, fy, ring);
                if (s.pinned) {
                    const pinMark = h("span", { class: "cm-pinned", role: "img", "aria-label": "Pinned" }, icon("pin", "sm"));
                    pinMark.style.cssText = "position:absolute;width:16px;height:16px;margin:-22px 0 0 8px;display:grid;place-items:center;border-radius:50%;pointer-events:none;background:var(--k-mark-in);color:var(--k-mark-out);box-shadow:0 0 0 1px var(--k-mark-out)";
                    pinMark.style.left = p.style.left; pinMark.style.top = p.style.top;
                    el.append(pinMark);
                }
                if (s.open) return s.open(p, el, n);
                const m = AB.menu({ anchor: p, place: s.place || "right-start", items: s.items(el, n) });
                m.setAttribute("aria-label", "Context menu");
                el.append(m);
                const first = m.querySelector(".k-menu-item:not([aria-disabled=true])");
                if (first) first.focus();
            });
        },
    });
})();
