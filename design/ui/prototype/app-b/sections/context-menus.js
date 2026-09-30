/* Context menus: what a right-click (or Shift+F10) opens on each kind of target, and what the
   inspector's "..." opens (the same list, word for word). The menu is drawn in the overlay layer
   at the point that was clicked; the frame behind it shows that target selected. Items follow
   structure-b-refined.md section 10.3; labels and keys come from AB.cmd where a command has more
   than one door. Plain ASCII. */
(function () {
    "use strict";
    const SUB = "cm-sub";
    const C = AB.cmd;
    const tag = (why) => h("span", { class: "k-annot-tag", title: why }, "Open question");
    // A control graphty-element cannot back yet: drawn disabled, with the one needs mark
    const needs = (label, reason, extra) => Object.assign({ label, disabled: true, desc: AB.needsElement(reason) }, extra || {});
    const flash = (text) => ({ onClick: () => AB.flash(text + " (not wired in the skeleton)") });

    // The needs mark is tertiary text on a light panel; inside a dark menu it takes the menu's second ink.
    if (!document.getElementById("cm-style")) {
        document.head.append(h("style", { id: "cm-style" }, ".k-menu .ab-needs { color: var(--k-menu-ink2); }"));
    }

    // A point marker in the overlay, at a percent of the canvas stage or of an element's box.
    function mark(el, target, fx, fy, ring) {
        const m = h("span", { class: "cm-point" + (ring ? " cm-ring" : ""), "aria-hidden": "true" });
        m.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
        if (ring) m.style.cssText += ";width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;box-shadow:0 0 0 2px var(--k-mark-out),0 0 0 4px var(--k-mark-in)";
        el.append(m);
        const t = typeof target === "string" ? document.querySelector(target) : target;
        if (t && t !== el) t.scrollIntoView({ block: "nearest" }); // a row below the fold comes into view first
        const L = el.getBoundingClientRect();
        const R = t ? t.getBoundingClientRect() : L;
        m.style.left = R.left - L.left + (R.width * fx) / 100 + "px";
        m.style.top = R.top - L.top + (R.height * fy) / 100 + "px";
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
        { label: "For the report", go: ["graph-place", "at-rest"] },
        { sep: true },
        { label: "New folder", shortcut: "Ctrl+G", ...flash("New folder") },
    ]) });
    const rename = (state) => C("rename", { go: ["graph-place", state || "rename"] });
    const hideFromList = { label: "Hide from list (keeps painting)", go: ["graph-place", "show-hidden"] };
    const lock = { label: "Lock", ...flash("Lock") };

    // The graph's one list: the empty canvas's right-click and the nothing-selected inspector's "..."
    const graphItems = () => [
        { heading: "Co-appearances, " + AB.fx.datasets.lesmis.title },
        { label: "Select all visible", shortcut: "Ctrl+A", go: ["inspector-selection-and-everything", "selection"] },
        C("fit"),
        { sep: true },
        C("rerun-layout", { go: ["canvas-and-states", "loading"] }),
        C("pause-layout"),
        { label: "Unpin all", desc: "Every pinned node goes back to the layout", ...flash("Unpin all") },
        { label: "Reshuffle layout seed", desc: "A new seed in the graph's Layout section; lays out again", ...flash("Reshuffle layout seed") },
        { label: "Compute the overview", go: ["inspector-nothing-selected", "computed"] },
        { sep: true },
        { label: "Add node...", desc: "One node, typed by hand", ...flash("Add node") },
        { label: "Paste data...", shortcut: "Ctrl+V", desc: "Opens the load step with the clipboard's text", go: ["load-step", "preview"] },
        C("add-note"),
    ];

    const sourceItems = (url) => {
        const t = AB.fx.datasets.transactions;
        return [
            { heading: url ? "The alert feed address" : t.file },
            url ? { label: "Refresh", desc: "Read the address again; the graph is untouched if it fails", go: ["data-place", "after-replace"] }
                : { label: "Replace data...", desc: "A newer file; the graph is untouched if it fails", go: ["load-step", "replace"] },
            { label: "Re-map columns...", go: ["load-step", "remap"] },
            { label: "Show import report", go: ["inspector-source", "import-report-warnings"] },
            { sep: true },
            needs("Remove this source", "graphty-element does not record which source each node and edge came from"),
        ];
    };

    // Each state: where it points, what the frame shows, and the items (a function of the overlay el).
    const L = () => AB.fx.datasets.lesmis;
    const onStage = () => ["#ab-canvas .k-stage", L().anchors.selected.x, L().anchors.selected.y, true];
    const byText = (sel, re) => [...document.querySelectorAll(sel)].find((r) => re.test(r.textContent));
    const STATES = {
        node: {
            label: "A node (Valjean)",
            frame: { right: "inspector-node/why-this-look" },
            at: onStage,
            items: () => [
                { heading: "Valjean" },
                C("neighborhood"),
                { label: "Filter to neighbors", go: ["data-place", "filters"] },
                { label: "Steps away...", desc: "Nodes within a number of steps of Valjean", go: ["selection-bar", "neighborhood"] },
                { label: "Path between", disabled: true, desc: "Select a second node first" },
                C("analyze", { label: "Analyze these..." }),
                { sep: true },
                C("create-set"),
                { label: "Add to set...", ...flash("Add to set") },
                { label: "Remove from set...", desc: "Watchlist", go: ["inspector-group-set-path-row", "style"] },
                { sep: true },
                C("frame-selection", { label: "Frame" }),
                { label: "Pin position", desc: "Stays put when the layout runs", ...flash("Pin position") },
                C("hide-on-canvas"),
                { label: "Remove from data...", desc: "Deletes the node and its edges; Hide on canvas keeps them", go: ["table-dock", "remove-confirm"] },
                { sep: true },
                C("add-note"),
                { label: "Show in table", go: ["table-dock", "nodes"] },
            ],
        },
        "node-pinned": {
            label: "A pinned node, with a second node selected",
            frame: { right: "inspector-several-elements/two-nodes" },
            at: onStage,
            items: () => [
                { heading: "Valjean, pinned; Javert also selected" },
                C("neighborhood"),
                { label: "Filter to neighbors", go: ["data-place", "filters"] },
                { label: "Path between", desc: "Valjean and Javert", go: ["path-tool", "found"] },
                C("analyze", { label: "Analyze these..." }),
                { sep: true },
                C("create-set"),
                { label: "Add to set...", ...flash("Add to set") },
                { label: "Remove from set...", go: ["inspector-group-set-path-row", "style"], desc: "Watchlist" },
                { sep: true },
                C("frame-selection", { label: "Frame" }),
                { label: "Unpin", desc: "The layout moves it again", ...flash("Unpin") },
                C("hide-on-canvas"),
                { label: "Remove from data...", go: ["table-dock", "remove-confirm"] },
                { sep: true },
                C("add-note"),
                { label: "Show in table", go: ["table-dock", "nodes"] },
            ],
        },
        edge: {
            label: "An edge, from the table (Javert -- Valjean)",
            frame: { right: "inspector-edge/style", dock: "table-dock/edges" },
            at: () => [byText("#ab-dock tbody tr", /^\s*Javert\s*Valjean/) || "#ab-dock tbody tr", 30, 50, false],
            items: () => [
                { heading: "Javert -- Valjean" },
                { label: "Select endpoints", go: ["inspector-several-elements", "two-nodes"] },
                C("hide-on-canvas"),
                C("add-note"),
                { label: "Show in table", go: ["table-dock", "edges"] },
            ],
        },
        several: {
            label: "Several elements (5 nodes)",
            frame: { right: "inspector-several-elements/style" },
            at: onStage,
            items: () => [
                { heading: "5 nodes: Valjean, Javert, Thenardier, Fantine, Cosette" },
                C("create-set"),
                C("analyze", { label: "Analyze these..." }),
                C("neighborhood"),
                { label: "Filter to neighbors", go: ["data-place", "filters"] },
                { label: "Lay out members...", ...flash("Lay out members") },
                needs("Extract as graph", "graphty-element cannot copy a subgraph into a new graph yet"),
                { sep: true },
                C("frame-selection", { label: "Frame" }),
                { label: "Pin", ...flash("Pin") },
                { label: "Unpin", ...flash("Unpin") },
                C("hide-on-canvas"),
                { label: "Remove from data...", go: ["table-dock", "remove-confirm"] },
                { sep: true },
                C("add-note"),
                { label: "Show in table", go: ["table-dock", "nodes"] },
                { sep: true },
                needs("Merge nodes...", "graphty-element has no merge of nodes and their edges"),
                { label: "Keep as path", disabled: true, desc: "Only when edges are selected" },
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
                { heading: "Community 3, in Louvain" },
                rename(),
                { label: "Keep as set", desc: "A set on top of the tree that survives a rerun", go: ["graph-place", "at-rest"] },
                { sep: true },
                { label: "Select members", go: ["inspector-several-elements", "style"] },
                { label: "Show members in table", go: ["table-dock", "members-of-row"] },
                C("frame-selection", { label: "Frame" }),
                C("analyze", { label: "Analyze these members..." }),
                { label: "Lay out members...", ...flash("Lay out members") },
                needs("Collapse on canvas", "graphty-element cannot draw a group as one node yet"),
                { label: "Compare with...", go: ["full-canvas-modes", "comparison"] },
                combine(el),
                { sep: true },
                C("add-note"),
                moveTo(el),
                lock,
                hideFromList,
                { sep: true },
                { label: "Delete", ...flash("Delete") },
            ],
        },
        "notes-row": {
            label: "The Notes row (built-in)",
            frame: { left: "graph-place/at-rest", right: "inspector-selection-and-everything/notes-row" },
            at: () => ["#ab-left [data-row=notes]", 55, 50, false],
            items: () => [
                { heading: "Notes, a built-in row" },
                { label: "Select what notes are about", go: ["notes-place", "about-selection"] },
                { label: "Open in Notes", go: ["notes-place", "all"] },
                C("add-note"),
                { sep: true },
                hideFromList,
            ],
        },
        "measure-row": {
            label: "A measure row (PageRank)",
            frame: { left: "graph-place/at-rest", right: "inspector-measure-row/style" },
            at: () => ["#ab-left [data-row=pagerank]", 55, 50, false],
            items: () => [
                { heading: "PageRank" },
                rename(),
                { label: "Keep top N as set...", ...flash("Keep top N as set") },
                { label: "Select top N", ...flash("Select top N") },
                { label: "Show in table", go: ["table-dock", "nodes"] },
                { label: "Filter to...", go: ["data-place", "filters"] },
                { label: "Compare with...", go: ["full-canvas-modes", "comparison"] },
                { sep: true },
                C("add-note"),
                lock,
                hideFromList,
                { sep: true },
                { label: "Delete", ...flash("Delete") },
            ],
        },
        "run-row": {
            label: "A run row (Louvain)",
            frame: { left: "graph-place/at-rest", right: "inspector-run-row/style" },
            at: () => ["#ab-left [data-row=louvain]", 55, 50, false],
            items: () => [
                { heading: "Louvain, resolution 1.0" },
                { label: "Rerun", go: ["graph-place", "running"] },
                { label: "Run again as copy", desc: "Keeps this run; the copy lands on top", go: ["graph-place", "finished"] },
                needs("Restore an earlier result", "graphty-element keeps only the latest result of a run"),
                needs("Check against a null model and other seeds...", "graphty-element has no null-model or seed-stability check"),
                { label: "Restore the suggested look", desc: "Puts back the style layers the algorithm suggests", ...flash("Restore the suggested look") },
                { sep: true },
                { label: "Show members in table", go: ["table-dock", "communities"] },
                { label: "Lay out by these groups", ...flash("Lay out by these groups") },
                needs("Compare with another run...", "graphty-element cannot compare two runs' results"),
                { sep: true },
                C("add-note"),
                lock,
                hideFromList,
                { sep: true },
                { label: "Delete...", go: ["context-menus", "run-delete"] },
            ],
        },
        folder: {
            label: "A folder (For the report)",
            frame: { left: "graph-place/at-rest", right: "inspector-folder/style" },
            at: () => ["#ab-left [data-row=folder]", 55, 50, false],
            items: () => [
                { heading: "For the report" },
                rename(),
                { label: "Ungroup", desc: "Its rows stay where they are, out of the folder", go: ["graph-place", "at-rest"] },
                lock,
                hideFromList,
                { sep: true },
                { label: "Delete folder (keeps rows)", go: ["graph-place", "at-rest"] },
            ],
        },
        attribute: {
            label: "An attribute (amount, on edges)",
            frame: { left: "data-place/attributes", right: "inspector-attribute-and-filter-step/attribute" },
            at: () => [[...document.querySelectorAll("#ab-left .dp-row .dp-l1")].find((l) => /^\s*amount/.test(l.textContent)) || "#ab-left", 55, 50, false],
            items: () => [
                { heading: "amount, a number on each transfer" },
                { label: "Color by", ...flash("Color by amount") },
                { label: "Width by", ...flash("Width by amount") },
                { label: "Show as groups", ...flash("Show as groups") },
                needs("Place by", "graphty-element places nodes only by position attributes; amount as an axis needs a layout that reads any attribute"),
                { sep: true },
                { label: "Filter to...", go: ["data-place", "filters"] },
                { label: "Create rule set...", ...flash("Create rule set") },
                { label: "Show in table", go: ["table-dock", "nodes"] },
                { sep: true },
                { label: "Change level...", desc: "How it is read: number, ordered or category", go: ["data-place", "level-changed"] },
                { label: "Declare role...", go: ["inspector-attribute-and-filter-step", "attribute"] },
                needs("Rename", "graphty-element cannot rename an attribute across its data"),
                C("add-note"),
            ],
        },
        "saved-view": {
            label: "A saved view (Whole cast)",
            frame: { left: "views-place/one-selected", right: "inspector-saved-view/view" },
            at: () => [byText("#ab-left .vp-row", /Whole cast/) || "#ab-left .vp-row", 55, 50, false],
            items: () => [
                { heading: "Whole cast" },
                { label: "Update to current camera", ...flash("Update to current camera") },
                { label: "Export image of this view...", go: ["export-image", "from-view"] },
                { label: "Record video from this view...", go: ["export-video", "still"] },
                { sep: true },
                needs("Rename", "graphty-element cannot rename a saved camera view yet"),
                needs("Delete", "graphty-element cannot delete a saved camera view yet"),
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
            frame: { left: "data-place/at-rest", right: "inspector-source/url" },
            at: () => [byText("#ab-left .dp-row", /alert feed|https?:/i) || "#ab-left", 55, 50, false],
            items: () => sourceItems(true),
        },
        note: {
            label: "A note",
            frame: { left: "notes-place/all" },
            at: () => ["#ab-left .np-note", 60, 40, false],
            items: () => [
                { label: "Edit", go: ["notes-place", "writing"] },
                { label: "Select targets", go: ["notes-place", "about-selection"] },
                { label: "Copy link to note", ...flash("Copy link to note") },
                { sep: true },
                { label: "Delete", ...flash("Delete") },
            ],
        },
    };

    function confirmDelete(el) {
        el.append(AB.modal({
            title: "Delete Louvain, resolution 1.0?",
            body: h("div", { class: "cm-confirm", style: "padding:0 16px" },
                h("p", null, "This removes the run, its 6 communities from the tree, and the attribute the run added to every node. Rows and filter steps that read that attribute stop working."),
                h("p", { class: "k-secondary" }, "The run's note and the 2 notes on its communities: ", tag("Whether notes are kept, detached or deleted with the run is not decided yet.")),
                h("p", { class: "k-secondary" }, "You can undo this with Ctrl+Z.")),
            foot: [
                AB.button("Cancel", { kind: "secondary", go: ["graph-place", "at-rest"] }),
                AB.button("Delete run", { onClick: () => { AB.go("graph-place", "at-rest"); AB.flash("Louvain deleted (not wired in the skeleton)"); } }),
            ],
        }));
    }

    const ids = Object.keys(STATES);
    registerSection({
        id: "context-menus",
        title: "Context menus",
        region: "overlay",
        states: ids.map((id) => ({ id, label: STATES[id].label })).concat([{ id: "run-delete", label: "Run row: Delete confirmation" }]),
        frame: (state) => (state === "run-delete" ? { left: "graph-place/at-rest", right: "inspector-run-row/style" } : (STATES[state] && STATES[state].frame) || {}),
        render(el, state) {
            if (state === "run-delete") return confirmDelete(el);
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
