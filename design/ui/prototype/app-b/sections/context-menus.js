/* Context menus: what a right-click (or Shift+F10) opens on each kind of target. The menu is drawn
   in the overlay layer at the point that was clicked; the frame behind it shows that target
   selected. Items come from structure-b-refined.md section 10.3. Plain ASCII. */
(function () {
    "use strict";
    const SUB = "cm-sub";
    const tag = (why) => h("span", { class: "k-annot-tag", title: why }, "Open question");

    // A point marker in the overlay, at a percent of the canvas stage or of an element's box.
    function mark(el, target, fx, fy, ring) {
        const m = h("span", { class: "cm-point" + (ring ? " cm-ring" : ""), "aria-hidden": "true" });
        m.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
        if (ring) m.style.cssText += ";width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;box-shadow:0 0 0 2px var(--k-mark-out),0 0 0 4px var(--k-mark-in)";
        el.append(m);
        const L = el.getBoundingClientRect();
        const t = typeof target === "string" ? document.querySelector(target) : target;
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

    // Each state: where it points, what the frame shows, and the items (a function of the overlay el).
    const L = () => AB.fx.datasets.lesmis;
    const STATES = {
        node: {
            label: "A node (Valjean)",
            frame: { right: "inspector-node/why-this-look" },
            at: () => ["#ab-canvas .k-stage", L().anchors.selected.x, L().anchors.selected.y, true],
            items: () => [
                { heading: "Valjean" },
                { label: "Inspect", go: ["inspector-node", "why-this-look"] },
                { label: "Expand", shortcut: "E" },
                { label: "Neighborhood", shortcut: "G", go: ["selection-bar", "neighborhood"] },
                { label: "Filter to neighbors", go: ["data-place", "filters"] },
                { label: "Shortest path from here", go: ["path-tool", "from-picked"] },
                { label: "Analyze these...", go: ["analyze-popover", "open"] },
                { sep: true },
                { label: "Create set", shortcut: "Ctrl+G", go: ["graph-place", "at-rest"] },
                { label: "Add to set..." },
                { sep: true },
                { label: "Hide on canvas", shortcut: "Ctrl+Shift+H", go: ["selection-bar", "hidden"] },
                { label: "Add note", shortcut: "N", go: ["notes-place", "writing"] },
                { label: "Show in table", go: ["table-dock", "nodes"] },
                { label: "Pin position" },
            ],
        },
        edge: {
            label: "An edge (Valjean -- Javert)",
            frame: { right: "inspector-edge/style" },
            at: () => { const a = L().anchors.selected, b = L().anchors.hover; return ["#ab-canvas .k-stage", (a.x + b.x) / 2, (a.y + b.y) / 2, true]; },
            items: () => [
                { heading: "Valjean -- Javert" },
                { label: "Inspect", go: ["inspector-edge", "style"] },
                { label: "Select endpoints", go: ["inspector-several-elements", "two-nodes"] },
                { sep: true },
                { label: "Hide on canvas", shortcut: "Ctrl+Shift+H", go: ["selection-bar", "hidden"] },
                { label: "Add note", shortcut: "N", go: ["notes-place", "writing"] },
                { label: "Show in table", go: ["table-dock", "edges"] },
            ],
        },
        several: {
            label: "Several elements (5 nodes)",
            frame: { right: "inspector-several-elements/style" },
            at: () => ["#ab-canvas .k-stage", L().anchors.selected.x, L().anchors.selected.y, true],
            items: () => [
                { heading: "5 nodes: Valjean, Javert, Thenardier, Fantine, Cosette" },
                { label: "Create set", shortcut: "Ctrl+G", go: ["graph-place", "at-rest"] },
                { label: "Analyze these...", go: ["analyze-popover", "open"] },
                { label: "Neighborhood", shortcut: "G", go: ["selection-bar", "neighborhood"] },
                { label: "Filter to neighbors", go: ["data-place", "filters"] },
                { label: "Lay out members..." },
                { label: "Extract as graph", go: ["graphs-switcher", "two-graphs"] },
                { sep: true },
                { label: "Hide on canvas", shortcut: "Ctrl+Shift+H", go: ["selection-bar", "hidden"] },
                { label: "Add note", shortcut: "N", go: ["notes-place", "writing"] },
                { label: "Show in table", go: ["table-dock", "nodes"] },
                { sep: true },
                { label: "Merge nodes..." },
            ],
        },
        canvas: {
            label: "Empty canvas",
            at: () => ["#ab-canvas", 22, 78, false],
            items: () => [
                { label: "Select all visible", shortcut: "Ctrl+A", go: ["inspector-selection-and-everything", "selection"] },
                { label: "Zoom to fit", shortcut: "0" },
                { sep: true },
                { label: "Paste data", shortcut: "Ctrl+V", go: ["load-step", "preview"] },
                { label: "Re-run layout" },
                { label: "Add node" },
            ],
        },
        row: {
            label: "A group, set or path row (Community 3)",
            frame: { left: "graph-place/louvain-open", right: "inspector-group-set-path-row/style" },
            at: () => ["#ab-left [data-row=c3]", 55, 50, false],
            items: (el) => [
                { heading: "Community 3, in Louvain" },
                { label: "Rename" },
                { label: "Keep as set", desc: "A set on top of the tree that survives a rerun", go: ["graph-place", "at-rest"] },
                { sep: true },
                { label: "Select members", go: ["inspector-several-elements", "style"] },
                { label: "Show members in table", go: ["table-dock", "members-of-row"] },
                { label: "Analyze these members...", go: ["analyze-popover", "open"] },
                { label: "Lay out members..." },
                { label: "Collapse on canvas" },
                { label: "Compare with...", go: ["full-canvas-modes", "comparison"] },
                { label: "Combine with selected rows", sub: true, onClick: sub(el, [
                    { label: "Union", go: ["inspector-several-rows", "result-union"] },
                    { label: "Intersect", go: ["inspector-several-rows", "result-intersect"] },
                    { label: "Subtract", go: ["inspector-several-rows", "result-subtract"] },
                    { label: "Exclude", go: ["inspector-several-rows", "result-exclude"] },
                ]) },
                { sep: true },
                { label: "Add note", shortcut: "N", go: ["notes-place", "writing"] },
                { label: "Open notes", desc: "2 notes", go: ["notes-place", "about-selection"] },
                { label: "Move to folder", sub: true, onClick: sub(el, [
                    { label: "For the report", go: ["graph-place", "at-rest"] },
                    { sep: true },
                    { label: "New folder", shortcut: "Ctrl+G" },
                ]) },
                { label: "Lock" },
                { label: "Hide from list (keeps painting)", go: ["graph-place", "show-hidden"] },
                { sep: true },
                { label: "Delete" },
            ],
        },
        "measure-row": {
            label: "A measure row (PageRank)",
            frame: { left: "graph-place/at-rest", right: "inspector-measure-row/style" },
            at: () => ["#ab-left [data-row=pagerank]", 55, 50, false],
            items: () => [
                { heading: "PageRank" },
                { label: "Rename" },
                { label: "Keep top N as set..." },
                { label: "Show in table", go: ["table-dock", "nodes"] },
                { label: "Filter to...", go: ["data-place", "filters"] },
                { label: "Compare with...", go: ["full-canvas-modes", "comparison"] },
                { sep: true },
                { label: "Add note", shortcut: "N", go: ["notes-place", "writing"] },
                { label: "Lock" },
                { label: "Hide from list (keeps painting)", go: ["graph-place", "show-hidden"] },
                { sep: true },
                { label: "Delete" },
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
                { label: "Settings", go: ["inspector-run-row", "data"] },
                { sep: true },
                { label: "Show members in table", go: ["table-dock", "communities"] },
                { label: "Lay out by these groups" },
                { label: "Compare with another run...", go: ["full-canvas-modes", "comparison"] },
                { sep: true },
                { label: "Add note", shortcut: "N", go: ["notes-place", "writing"] },
                { label: "Lock" },
                { label: "Hide from list (keeps painting)", go: ["graph-place", "show-hidden"] },
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
                { label: "Rename" },
                { label: "Ungroup", desc: "Its rows stay where they are, out of the folder", go: ["graph-place", "at-rest"] },
                { label: "Lock" },
                { label: "Hide from list (keeps painting)", go: ["graph-place", "show-hidden"] },
                { sep: true },
                { label: "Delete folder (keeps rows)", go: ["graph-place", "at-rest"] },
            ],
        },
        attribute: {
            label: "An attribute (riskScore)",
            frame: { left: "data-place/attributes", right: "inspector-attribute-and-filter-step/attribute" },
            at: () => [[...document.querySelectorAll("#ab-left .dp-row")].find((r) => /riskScore/.test(r.textContent)) || "#ab-left", 55, 50, false],
            items: () => [
                { heading: "riskScore, a number on each account" },
                { label: "Color by", go: ["inspector-measure-row", "risk-score"] },
                { label: "Size by" },
                { label: "Show as groups" },
                { label: "Place by", desc: "A layout axis" },
                { sep: true },
                { label: "Filter to...", go: ["data-place", "filters"] },
                { label: "Create rule set..." },
                { label: "Show in table", go: ["table-dock", "nodes"] },
                { sep: true },
                { label: "Change level", desc: "How it is read: number, ordered or category", go: ["data-place", "level-changed"] },
                { label: "Declare role..." },
                { label: "Rename" },
                { label: "Add note", shortcut: "N", go: ["notes-place", "writing"] },
            ],
        },
        note: {
            label: "A note",
            frame: { left: "notes-place/all" },
            at: () => ["#ab-left .np-note", 60, 40, false],
            items: () => [
                { label: "Edit", go: ["notes-place", "writing"] },
                { label: "Select targets", go: ["notes-place", "about-selection"] },
                { label: "Copy link to note" },
                { sep: true },
                { label: "Delete" },
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
        frame: (state) => (state === "run-delete" ? { left: "graph-place/at-rest", right: "inspector-run-row/style" } : STATES[state].frame || {}),
        render(el, state) {
            if (state === "run-delete") return confirmDelete(el);
            const s = STATES[state];
            // the frame's regions render before the overlay; wait a frame so their boxes exist
            requestAnimationFrame(() => {
                const [target, fx, fy, ring] = s.at();
                const p = mark(el, target, fx, fy, ring);
                const m = AB.menu({ anchor: p, place: "right-start", items: s.items(el) });
                m.setAttribute("aria-label", "Context menu");
                el.append(m);
                const first = m.querySelector(".k-menu-item");
                if (first) first.focus();
            });
        },
    });
})();
