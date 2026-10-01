/* Context menus: what a right-click (or Shift+F10) opens on each kind of target, and what the
   inspector's "..." opens (the same list, word for word). The menu is drawn in the overlay layer
   at the point that was clicked; the frame behind it shows that target selected.

   Every menu keeps one section order, leaving out what does not apply (structure-b-refined.md
   section 10.3): heading (the target's name only) | Rename | select and explore | Analyze... |
   organize | Frame selection | visibility and data | Add note, Show in table | Delete.
   Labels and keys come from AB.cmd where a command has more than one door. Two-state commands
   swap their label (Pin / Unpin, Lock / Unlock, Hide in list / Show in list); a mixed selection
   shows both. Delete acts at once and shows the Undo notice. Plain ASCII. */
(function () {
    "use strict";
    const SUB = "cm-sub";
    const C = AB.cmd;
    const L = () => AB.fx.datasets.lesmis;
    // A command the skeleton does not model: close the menu, then the notice
    const done = (text, action) => ({ onClick: () => { AB.close(); setTimeout(() => AB.notice(text, action), 0); } });
    const flash = (label) => done(label + " (not wired in the skeleton)");
    // Delete: immediate, with Undo
    const del = (label, what) => ({ label, shortcut: "Del", onClick: () => { AB.close(); setTimeout(() => AB.deleted(what), 0); } });
    // Deleting an element from the data is "Delete" (Del) like every other delete; Hide on canvas keeps it
    const removeData = (what) => del("Delete", what);

    // Two-state commands: one item whose label swaps; both labels for a mixed selection
    const twoState = (on, off, isOn, desc) => (isOn === "mixed"
        ? [{ label: off, desc, ...flash(off) }, { label: on, desc, ...flash(on) }]
        : [{ toggle: [on, off], on: isOn, desc, ...flash(isOn ? on : off) }]);
    const pin = (isOn) => twoState("Unpin", "Pin", isOn, "Pinned nodes stay put when the layout runs");
    const lock = (isOn) => twoState("Unlock", "Lock", isOn);
    const listVis = (hidden) => twoState("Show in list", "Hide in list", hidden, "Keeps painting the graph");

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
    const moveTo = (el) => ({ label: "Move to folder", sub: true, onClick: sub(el, [
        { label: "For the report", ...done("Moved Community 3 to For the report") },
        { sep: true },
        { label: "New folder", ...flash("New folder") },
    ]) });
    const rename = (state) => C("rename", { go: ["graph-place", state || "rename"] });
    const showInTable = (state) => ({ label: "Show in table", go: ["table-dock", state || "nodes"] });
    const frameSel = () => C("frame-selection");

    // One node: the canvas right-click, the inspector's "...", and the table's row menu, word for word
    const nodeItems = (o) => [
        { heading: "Valjean" },
        C("neighborhood"),
        o.second ? C("find-paths") : null,
        { sep: true },
        C("analyze"),
        { sep: true },
        C("create-set"),
        { label: "Add to set...", ...flash("Add to set") },
        { label: "Remove from Watchlist", ...done("Removed Valjean from Watchlist", { label: "Undo", onClick: () => AB.announce("Valjean is back in Watchlist") }) },
        { sep: true },
        frameSel(),
        { sep: true },
        ...pin(o.pinned),
        C("hide-on-canvas"),
        removeData("Valjean and his edges"),
        { sep: true },
        C("add-note"),
        showInTable(),
    ].filter(Boolean);

    // The graph's one list: the empty canvas's right-click and the nothing-selected inspector's "..."
    const graphItems = () => [
        { heading: L().frame.graphRow },
        { label: "Select all visible", shortcut: "Ctrl+A", go: ["inspector-selection-and-everything", "selection"] },
        { label: "Invert selection", shortcut: "I", ...flash("Invert selection") },
        C("reselect-previous", { go: null, ...flash("Reselect previous") }),
        { sep: true },
        C("fit"),
        { sep: true },
        C("rerun-layout", { go: ["canvas-and-states", "loading"] }),
        { label: "Reshuffle layout seed", desc: "A new seed in the graph's Layout section; lays out again", ...flash("Reshuffle layout seed") },
        { label: "Unpin all", desc: "Every pinned node goes back to the layout", ...flash("Unpin all") },
        { label: "Compute the overview", go: ["inspector-nothing-selected", "computed"] },
        { label: "Add node...", desc: "One node, typed by hand", ...flash("Add node") },
        { sep: true },
        C("add-note"),
        { sep: true },
        C("clear-graph-data", { onClick: () => { AB.close(); setTimeout(() => AB.COMMANDS["clear-graph-data"].onClick(), 0); } }),
    ];

    const sourceItems = (url) => [
        { heading: url ? "The alert feed address" : AB.fx.datasets.transactions.file },
        C("rename", flash("Rename")),
        { sep: true },
        { label: "Replace with file...", desc: "Opens the file picker; the graph is untouched if it fails", go: ["load-step", "replace"] },
        { label: "Edit source...", go: ["load-step", "remap"] },
        url ? { label: "Refresh", desc: "Reads the address again; the graph is untouched if it fails", go: ["data-place", "after-replace"] } : null,
    ].filter(Boolean);

    const onStage = () => ["#ab-canvas .k-stage", L().anchors.selected.x, L().anchors.selected.y, true];
    const byText = (sel, re) => [...document.querySelectorAll(sel)].find((r) => re.test(r.textContent));
    const RUN = "Louvain"; // run rows are named by their algorithm

    // Each state: where it points, what the frame shows, and the items (a function of the overlay el).
    const STATES = {
        node: {
            label: "A node (Valjean)",
            frame: { right: "inspector-node/why-this-look" },
            at: onStage,
            items: () => nodeItems({ pinned: false }),
        },
        "node-pinned": {
            label: "A pinned node, with a second node selected",
            frame: { right: "inspector-several-elements/two-nodes" },
            at: onStage,
            items: () => nodeItems({ pinned: true, second: true }),
        },
        "table-row": {
            label: "A node's row in the table (same as the node)",
            frame: { right: "inspector-node/why-this-look", dock: "table-dock/nodes" },
            at: () => [document.querySelector("#td-row-Valjean") || byText("#ab-dock tbody tr", /Valjean/) || "#ab-dock tbody tr", 30, 50, false],
            place: "above-start",
            items: () => nodeItems({ pinned: false }),
        },
        edge: {
            label: "An edge (Javert -- Valjean)",
            frame: { right: "inspector-edge/style", dock: "table-dock/edges" },
            at: () => [byText("#ab-dock tbody tr", /^\s*Javert\s*Valjean/) || "#ab-dock tbody tr", 30, 50, false],
            items: () => [
                { heading: "Javert -- Valjean" },
                { label: "Select endpoints", go: ["inspector-several-elements", "two-nodes"] },
                { sep: true },
                C("hide-on-canvas"),
                removeData("the edge Javert -- Valjean"),
                { sep: true },
                C("add-note"),
                showInTable("edges"),
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
                C("create-set"),
                { label: "Lay out members...", ...flash("Lay out members") },
                { label: "Extract as graph", needs: "graphty-element cannot copy a subgraph into a new graph yet" },
                { label: "Merge nodes...", needs: "graphty-element has no merge of nodes and their edges" },
                { sep: true },
                frameSel(),
                { sep: true },
                ...pin("mixed"),
                C("hide-on-canvas"),
                removeData("5 nodes and their edges"),
                { label: "Copy ids", ...done("Copied 5 ids") },
                { sep: true },
                C("add-note"),
                showInTable(),
            ],
        },
        "several-path": {
            label: "Nodes and an edge (Keep as path shows)",
            frame: { right: "inspector-several-elements/two-nodes" },
            at: onStage,
            items: () => [
                { heading: "2 nodes and 1 edge" },
                C("neighborhood"),
                { sep: true },
                C("analyze"),
                { sep: true },
                C("create-set"),
                { label: "Keep as path", go: ["inspector-group-set-path-row", "path-lesmis"] },
                { label: "Lay out members...", ...flash("Lay out members") },
                { label: "Extract as graph", needs: "graphty-element cannot copy a subgraph into a new graph yet" },
                { sep: true },
                frameSel(),
                { sep: true },
                ...pin(false),
                C("hide-on-canvas"),
                removeData("2 nodes and 1 edge"),
                { label: "Copy ids", ...done("Copied 3 ids") },
                { sep: true },
                C("add-note"),
                showInTable(),
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
            at: () => ["#ab-left [data-row=c3]", 55, 50, false],
            items: (el) => [
                { heading: "Community 3" },
                // a run's group renumbers on rerun: the same refusal the tree's name gives
                C("rename", { disabled: "A run's groups renumber when it reruns; Keep as set to name one" }),
                { sep: true },
                { label: "Select members", go: ["inspector-several-elements", "style"] },
                { label: "Show members in table", go: ["table-dock", "members-of-row"] },
                { sep: true },
                C("analyze"),
                { sep: true },
                { label: "Keep as set", desc: "A set on top of the tree that survives a rerun", ...done("Kept Community 3 as a set") },
                combine(el),
                moveTo(el),
                { label: "Collapse on canvas", needs: "graphty-element cannot draw a group as one node yet" },
                { sep: true },
                C("frame-members", { go: ["canvas-and-states", "drawn"] }),
                { label: "Show only this row", shortcut: "Alt+Space", onClick: () => { AB.close(); requestAnimationFrame(() => requestAnimationFrame(() => { const eye = document.querySelector("#ab-left [data-row=c3] .ab-eye"); if (eye) eye.dispatchEvent(new MouseEvent("click", { altKey: true, bubbles: true, detail: 1 })); })); } },
                { sep: true },
                ...lock(false),
                ...listVis(false),
                { sep: true },
                C("add-note"),
                { label: "Compare with another row...", go: ["full-canvas-modes", "comparison"] },
                { sep: true },
                del("Delete", "Community 3"),
            ],
        },
        "notes-row": {
            label: "The Notes row (built-in)",
            frame: { left: "graph-place/at-rest", right: "inspector-selection-and-everything/notes-row" },
            at: () => ["#ab-left [data-row=notes]", 55, 50, false],
            items: () => [
                { heading: "Notes" },
                { label: "Select what notes are about", go: ["notes-place", "about-selection"] },
                { sep: true },
                ...listVis(false),
                { sep: true },
                C("add-note"),
            ],
        },
        "measure-row": {
            label: "A measure row (PageRank)",
            frame: { left: "graph-place/at-rest", right: "inspector-measure-row/style" },
            at: () => ["#ab-left [data-row=pagerank]", 55, 50, false],
            items: () => [
                { heading: "PageRank" },
                rename(),
                { sep: true },
                { label: "Select top N...", ...flash("Select top N") },
                { label: "Filter to...", go: ["data-place", "filters"] },
                { sep: true },
                ...lock(false),
                ...listVis(false),
                { sep: true },
                C("add-note"),
                showInTable(),
                { label: "Compare with another row...", go: ["full-canvas-modes", "comparison"] },
                { sep: true },
                del("Delete", "PageRank"),
            ],
        },
        "run-row": {
            label: "A run row (Louvain)",
            frame: { left: "graph-place/at-rest", right: "inspector-run-row/style" },
            at: () => ["#ab-left [data-row=louvain]", 55, 50, false],
            items: () => [
                { heading: RUN },
                { label: "Rename", shortcut: "F2", needs: "graphty-element names a run after its algorithm and settings; a run cannot be renamed yet" },
                { sep: true },
                { label: "Rerun", go: ["graph-place", "running"] },
                C("run-as-copy", { desc: "Keeps this run; the copy lands on top", go: ["graph-place", "finished"] }),
                { label: "Restore the suggested look", desc: "Puts back the style layers the algorithm suggests", ...flash("Restore the suggested look") },
                { label: "Show members in table", go: ["table-dock", "communities"] },
                { label: "Lay out by these groups", ...flash("Lay out by these groups") },
                { label: "Restore an earlier result", needs: "graphty-element keeps only the latest result of a run" },
                { label: "Check against a null model and other seeds...", needs: "graphty-element has no null-model or seed-stability check" },
                { label: "Compare with another run...", needs: "graphty-element cannot compare two runs' results" },
                { sep: true },
                ...lock(false),
                ...listVis(false),
                { sep: true },
                C("add-note"),
                { sep: true },
                del("Delete", RUN + " and its 6 communities"),
            ],
        },
        folder: {
            label: "A folder (For the report)",
            frame: { left: "graph-place/at-rest", right: "inspector-folder/style" },
            at: () => ["#ab-left [data-row=folder]", 55, 50, false],
            items: () => [
                { heading: "For the report" },
                rename(),
                { sep: true },
                { label: "Ungroup", shortcut: "Ctrl+Shift+G", desc: "Its rows stay where they are, out of the folder", ...done("Ungrouped For the report", { label: "Undo", onClick: () => AB.announce("Folder restored") }) },
                { sep: true },
                ...lock(false),
                ...listVis(false),
                { sep: true },
                del("Delete", "For the report and its 3 rows"),
            ],
        },
        attribute: {
            label: "An attribute (amount, on edges)",
            frame: { left: "data-place/attributes", right: "inspector-attribute-and-filter-step/attribute" },
            at: () => [[...document.querySelectorAll("#ab-left .dp-row .dp-l1, #ab-left .dp-row")].find((l) => /^\s*amount/.test(l.textContent)) || "#ab-left", 55, 50, false],
            items: () => [
                { heading: "amount" },
                { label: "Color by", ...flash("Color by amount") },
                { label: "Width by", ...flash("Width by amount") },
                C("label-by", { go: null, ...flash("Label by amount") }),
                { label: "Show as groups", ...flash("Show as groups") },
                { label: "Place by", needs: "graphty-element places nodes only by position attributes; amount as an axis needs a layout that reads any attribute" },
                { sep: true },
                { label: "Filter to...", go: ["data-place", "filters"] },
                { label: "Create set where this is...", go: ["select-where", "where"] },
                { sep: true },
                { label: "Read as...", go: ["inspector-attribute-and-filter-step", "attribute"] },
                { sep: true },
                showInTable("transfers"),
            ],
        },
        "filter-step": {
            label: "A filter step (amount >= 1,000)",
            frame: { left: "data-place/filters", right: "inspector-attribute-and-filter-step/filter-step" },
            at: () => [document.querySelector("#ab-right [aria-label^='More actions']") || "#ab-right", 0, 100, false],
            place: "below-end",
            items: () => [
                { heading: "amount >= 1,000" },
                { label: "Move up", shortcut: "Ctrl+]", disabled: "Already first" },
                { label: "Move down", shortcut: "Ctrl+[", ...flash("Move down") },
                { sep: true },
                C("add-note"),
                { sep: true },
                del("Delete", "the step amount >= 1,000"),
            ],
        },
        "saved-view": {
            label: "A saved view (Whole cast)",
            frame: { left: "views-place/one-selected", right: "inspector-saved-view/view" },
            at: () => [byText("#ab-left .vp-row", /Whole cast/) || "#ab-left .vp-row", 55, 50, false],
            items: () => [
                { heading: "Whole cast" },
                { label: "Rename", shortcut: "F2", needs: "graphty-element cannot rename a saved camera view yet" },
                { sep: true },
                { label: "Update to current camera", ...done("Whole cast now shows the current camera", { label: "Undo", onClick: () => AB.announce("Whole cast restored") }) },
                { sep: true },
                del("Delete", "Whole cast"),
            ],
        },
        source: {
            label: "A data source (a file)",
            frame: { left: "data-place/at-rest", right: "inspector-source/file" },
            at: () => [byText("#ab-left .dp-row", new RegExp(AB.fx.datasets.transactions.file.replace(/\./g, "\\."))) || "#ab-left", 55, 50, false],
            items: () => sourceItems(false),
        },
        "source-url": {
            label: "A data source (from a URL)",
            frame: { left: "data-place/url-source", right: "inspector-source/url" },
            at: () => [byText("#ab-left .dp-row", /alert feed|https?:/i) || "#ab-left", 55, 50, false],
            items: () => sourceItems(true),
        },
        note: {
            label: "A note",
            frame: { left: "notes-place/all" },
            at: () => ["#ab-left .np-note", 60, 40, false],
            items: () => {
                const n = document.querySelector("#ab-left .np-note .np-text");
                const words = n ? n.textContent.trim().split(/\s+/) : ["Note"];
                return [
                    { heading: words.slice(0, 6).join(" ") + (words.length > 6 ? "..." : "") },
                    { label: "Edit", go: ["notes-place", "writing"] },
                    { label: "Copy link to note", ...done("Copied a link to the note") },
                    { sep: true },
                    del("Delete", "the note"),
                ];
            },
        },
    };

    const ids = Object.keys(STATES);
    registerSection({
        id: "context-menus",
        title: "Context menus",
        region: "overlay",
        states: ids.map((id) => ({ id, label: STATES[id].label })),
        frame: (state) => (STATES[state] && STATES[state].frame) || (state === "run-delete" ? { left: "graph-place/at-rest" } : {}),
        render(el, state) {
            // An old link to the removed run-delete confirmation: Delete acts at once
            if (state === "run-delete") {
                setTimeout(() => { AB.go("graph-place", "at-rest"); setTimeout(() => AB.deleted(RUN + " and its 6 communities"), 0); }, 0);
                return;
            }
            const s = STATES[state] || STATES.node;
            // the frame's regions render before the overlay; wait a frame so their boxes exist
            requestAnimationFrame(() => {
                const [target, fx, fy, ring] = s.at();
                const p = mark(el, target, fx, fy, ring);
                const m = AB.menu({ anchor: p, place: s.place || "right-start", items: s.items(el) });
                m.setAttribute("aria-label", "Context menu");
                el.append(m);
                const first = m.querySelector(".k-menu-item:not([aria-disabled=true])");
                if (first) first.focus();
            });
        },
    });
})();
