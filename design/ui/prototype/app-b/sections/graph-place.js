/* Graph place: the paint tree. The rail's default place, top to bottom: the Graphs switcher line,
   Find with the list menu, the tree in paint order (Selection pinned at the top, Everything at the
   bottom, Overrides pinned under Selection once it holds something; Notes starts under Selection
   and drags like any other row, so its place in the paint order is the reader's choice). Saved views have their own rail place.
   Rename is a double-click on the name (or F2), with AB.renameInPlace. Plain ASCII.

   Numbers: Les Miserables from kit/fixtures.json (77 nodes, the "group" legend, density, the
   "Filter to degree >= 2" step: 77 to 60 nodes, Valjean's 36 neighbors). The Louvain communities
   and the paths below are not in the fixtures; they were computed on graphty-element's
   examples/data/miserables.json with networkx 3.1: Louvain weighted by value, resolution 1.0,
   seed 7 (6 communities of 25, 17, 10, 10, 9 and 6; Community 3 is Myriel's), shortest paths
   Valjean-Javert and Myriel-Valjean-Javert. The many-groups state uses the transfers March
   Louvain run from the fixtures (35 communities, the 8 largest listed by size). */
(function () {
    "use strict";
    const CSS = `
.gp-switch-notes { display: inline-flex; align-items: center; gap: 2px; color: var(--cm-text-secondary); padding: 0 4px; border-radius: 5px; }
.gp-switch-notes:hover { background: var(--cm-bg-hover); }
.gp-find { display: flex; align-items: center; gap: 6px; flex: 1 1 auto; min-width: 0; height: 24px; padding: 0 6px; border-radius: 5px; background: var(--cm-bg-secondary, var(--cm-bg-hover)); color: var(--cm-icon-secondary); }
.gp-find:focus-within { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }
.gp-find input { flex: 1 1 auto; min-width: 0; border: 0; background: transparent; font: inherit; color: var(--cm-text); outline: none; padding: 0; }
.gp-find input::placeholder { color: var(--cm-text-tertiary); }
.gp-tree .ab-trow { position: relative; }
.gp-tree .ab-tname { min-width: 40px; }
.gp-tree .ab-tcount { flex: none; }
.gp-tree .ab-trow[data-struck] .ab-eye { color: var(--cm-icon-tertiary, var(--cm-icon-secondary)); opacity: 0.5; }
.gp-tree .ab-trow[data-struck] .ab-eye::after { content: ""; position: absolute; width: 14px; height: 1.5px; background: currentColor; transform: rotate(-45deg); }
.gp-tree .ab-trow[data-hidden-row] .ab-tname { color: var(--cm-text-tertiary); font-style: italic; }
.gp-tree .ab-trow[data-hidden-row] .ab-kind, .gp-tree .ab-trow[data-hidden-row] .ab-ramp { opacity: 0.5; }
.gp-tree .ab-trow[data-pinned] .ab-tname { font-weight: 550; }
.gp-tree .ab-trow[data-failed] .ab-tname { color: var(--cm-text-danger); }
.gp-tree .ab-trow[data-drag-ghost] { outline: 1px dashed var(--cm-border-strong); outline-offset: -1px; background: var(--cm-bg); box-shadow: var(--cm-elevation-toast, 0 2px 8px #0003); cursor: no-drop; margin: 0 0 0 24px; opacity: 0.9; }
.gp-tree .ab-trow[data-drop-bad] { outline: 1px solid var(--cm-border-danger, var(--cm-text-danger)); outline-offset: -1px; cursor: no-drop; }
.gp-prompt { color: var(--cm-text-brand, var(--cm-text-secondary)); }
.gp-prompt .ab-tname { color: var(--cm-text-secondary); }
.gp-tree .gp-prompt .ab-tname { white-space: normal; overflow: visible; text-overflow: clip; }
.gp-tree .gp-prompt { height: auto; min-height: 28px; }
.gp-mark { cursor: default; list-style: none; display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; padding: 0 8px 4px calc(var(--lvl) * 16px + 40px); font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); }
.gp-mark .k-progress { flex: 1 1 60px; min-width: 40px; }
.gp-mark .ab-link, .gp-act { color: var(--cm-text-brand, var(--cm-text-link, inherit)); text-decoration: none; cursor: pointer; font-weight: 550; }
.gp-mark .ab-link:hover, .gp-act:hover { text-decoration: underline; }
.gp-mark-danger { color: var(--cm-text-danger); }
.gp-mark-danger .gp-msg { flex: 1 1 100%; }
.gp-indeterminate { position: relative; }
.gp-indeterminate > i { width: 35%; animation: gp-slide 1.4s ease-in-out infinite; }
@keyframes gp-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
@media (prefers-reduced-motion: reduce) { .gp-indeterminate > i { animation: none; } }
.gp-scope { display: inline-flex; align-items: center; gap: 4px; padding: 0 6px; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--cm-border-strong); }
.gp-runsearch { list-style: none; padding: 2px 8px 4px 40px; }
.gp-runsearch .gp-find { height: 22px; }
.gp-note-line { padding: 8px 16px; font-size: 12px; line-height: 17px; color: var(--cm-text-secondary); border-top: 1px solid var(--cm-border); }
.gp-note-line .ab-link { font-weight: 550; }
.gp-banner { display: flex; align-items: center; gap: 6px; margin: 4px 8px 0; padding: 4px 8px; border-radius: 5px; background: var(--cm-bg-hover); font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); }
.gp-banner .k-grow { flex: 1; }
.gp-drop-reason { display: flex; gap: 6px; align-items: flex-start; margin: 0 8px 0 64px; padding: 4px 8px; border-radius: 5px; background: var(--cm-bg-toolbar, #222); color: var(--cm-text-menu, #fff); font-size: 11px; line-height: 16px; color-scheme: dark; }
.gp-find-head { padding: 8px 16px 2px; font-size: 11px; line-height: 16px; font-weight: 550; color: var(--cm-text-secondary); }
.gp-hit { display: flex; align-items: center; gap: 6px; min-height: 28px; margin: 0 8px; padding: 2px 8px; border-radius: 5px; cursor: pointer; }
.gp-hit:hover { background: var(--cm-bg-hover); }
.gp-hit .gp-hit-text { flex: 1 1 auto; min-width: 0; }
.gp-hit .gp-hit-sub { display: block; font-size: 11px; line-height: 15px; color: var(--cm-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gp-hit mark { background: var(--cm-bg-warning, #fde68a); color: inherit; border-radius: 2px; }
.gp-oq { display: inline-flex; align-items: center; height: 16px; padding: 0 4px; border: 1px dashed var(--cm-border-strong); border-radius: 4px; font-size: 10px; line-height: 14px; color: var(--cm-text-secondary); white-space: nowrap; font-weight: 400; cursor: help; }
.gp-tree .ab-tprog { flex: 0 1 auto; }
.gp-tree .ab-trow[data-partial] .ab-ramp { opacity: 0.6; }
.gp-tree .ab-rename { flex: 1 1 0; min-width: 0; }
body.gp-nodrop, body.gp-nodrop * { cursor: no-drop !important; }
.gp-offer { position: fixed; left: 50%; bottom: 96px; transform: translateX(-50%); z-index: 100; }
.gp-stack { box-shadow: 3px -3px 0 -1px var(--gp-stack2), 3px -3px 0 0 var(--cm-bg); margin-inline-end: 3px; }
.gp-foot { padding: 0 16px 8px 40px; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); }
`;
    if (!document.getElementById("gp-style")) document.head.append(h("style", { id: "gp-style" }, CSS));

    const oq = (text) => h("span", { class: "gp-oq", title: text, "aria-label": "Open question: " + text }, "Open question");
    // Renames made this session, by row id, so a rename survives the redraw a navigation causes
    const renamed = {};
    // Same words as the lib's refusal, so the tree and the inspector header say the same thing.
    // A run's group (Community 3) renumbers on every rerun, so it offers "Keep as set" instead (spec 3.10).
    const refusal = (r) => (r.builtin ? "Built-in rows keep their names" : r.renameDisabled ? "Rename needs graphty-element: " + r.renameDisabled : r.runGroup ? r.name + " is renumbered when its run reruns. Keep it as a set to name it." : null);
    // A dark notice with one action, above the toolbar, for the Keep-as-set offer
    function offer(text, action) {
        document.querySelectorAll(".gp-offer").forEach((x) => x.remove());
        const n = AB.notice(text, { label: action.label, onClick: () => { n.remove(); action.run(); } });
        n.classList.add("gp-offer");
        n.setAttribute("role", "status");
        document.body.append(n);
        setTimeout(() => n.remove(), 6000);
    }
    const RUN_LABEL = "a run's name is its label, which graphty-element keeps read-only";
    const EVERYTHING_EYE = "needs graphty-element: the default layers are locked, and addDefaultStyle is parsed but never read";
    const actLink = (label, o) => h("span", Object.assign({ class: "gp-act", role: "button" }, AB.act(o)), label);

    // Louvain on Les Miserables (see the header comment for how these were computed)
    const LOUVAIN = [
        { n: 1, size: 25, color: "#E69F00" },
        { n: 2, size: 17, color: "#56B4E9" },
        { n: 3, size: 10, color: "#009E73", notes: 2 },
        { n: 4, size: 10, color: "#0072B2" },
        { n: 5, size: 9, color: "#D55E00" },
        { n: 6, size: 6, color: "#CC79A7" },
    ];
    const NOTES = {
        louvain: "Valjean and Javert land in the same community, with Marius and Cosette.",
        c3a: "Myriel's household and the people he meets in Digne.",
        c3b: "Napoleon is here only because Myriel meets him once.",
        graph: "Co-appearances counted per chapter, from Knuth's list.",
    };

    // ---------- when another section drives the frame, the tree agrees with the inspector beside it ----------
    // Returns { row, sel }: the tree row the inspector shows (null for none), and what the Selection row counts.
    function fromInspector() {
        const r = AB.route;
        if (!r || r.id === "graph-place" || !r.frame.right) return null;
        const [id, st = ""] = String(r.frame.right).split("/");
        const row = {
            "inspector-measure-row": st === "edge-measure" ? null : st === "degree" ? "degree" : "pagerank",
            "inspector-run-row": st === "readings-only" ? "density" : "louvain",
            "inspector-folder": "folder",
            "inspector-selection-and-everything": { selection: "selection", notes: "notes", "notes-row": "notes", "notes-row-outlined": "notes", "notes-data": "notes", overrides: "overrides" }[st] || "everything",
            "inspector-group-set-path-row": { watchlist: "watchlist", "path-lesmis": "p1", "path-lesmis-2": "p2", "kept-2": "g2", "kept-8": "g8", notes: "c3" }[st] || (st.startsWith("community-") ? "c" + st.slice(10) : st.startsWith("group-") || /^(other|overlap|rule-set|path|path-style|path-edge-set)$/.test(st) ? null : "c3"),
        }[id] || null;
        const sel = { "inspector-node": "1 node", "inspector-edge": "1 edge", "inspector-several-elements": st === "two-nodes" ? "2 nodes" : "5 nodes" }[id] || null;
        return { row, sel, edited: id === "inspector-node" && st === "edited" };
    }

    // ---------- the rows, in paint order ----------
    function model(state) {
        const L = AB.fx.datasets.lesmis;
        const g = (label) => L.frame.legend.rows.find((r) => r.label === label);
        const g2 = g("2"), g8 = g("8");
        const ins = fromInspector();
        let selRow = /^rename(-chain)?$/.test(state) ? "g2" : state === "rename-run-group" ? "c3" : state === "rename-builtin" ? "everything" : state === "rename-run-disabled" ? "louvain" : state === "partial" ? "betweenness-new" : state === "louvain-open" ? "louvain" : state === "failed" ? "failed" : state === "finished" ? "betweenness-new" : state === "empty" || state === "find" || state === "list-menu" ? null : "pagerank";
        if (ins) selRow = ins.row;
        const selCount = state === "solo" ? "5 nodes" : ins && ins.sel;
        const openLouvain = state === "louvain-open" || state === "find" || state === "rename-run-group" || /^c\d$/.test(selRow || "");
        const rows = [];
        rows.push({ id: "selection", name: "Selection", kind: "scan", pinned: true, builtin: true, count: selCount || null, eye: true, go: ["inspector-selection-and-everything", "selection"], menu: ["context-menus", "row"] });
        // Notes: a style layer over the nodes notes are about (Community 3's two notes); starts under Selection, not pinned
        rows.push(notesRow(state === "empty" ? null : "2", state !== "notes-eye-off"));
        if (state === "empty") {
            rows.push({ id: "prompt", prompt: true });
            rows.push(everything(state));
            return rows;
        }
        // Overrides appears just below Notes once it holds something: here, after Valjean's color is set by hand
        if (ins && ins.edited) rows.push({ id: "overrides", name: "Overrides", kind: "pencil", pinned: true, builtin: true, swatch: AB.chit("#E41A1C", true), count: "1 node", eye: true, title: "Valjean's color, set by hand", go: ["inspector-node", "edited"], menu: ["context-menus", "row"] });
        if (state === "running" || state === "queued") rows.push({ id: "betweenness-new", name: "Betweenness", kind: "chart-column", eye: true, running: true, renameDisabled: RUN_LABEL, go: ["analyze-popover", "running"], menu: ["context-menus", "measure-row"] });
        if (state === "queued") rows.push({ id: "closeness-queued", name: "Closeness", kind: "chart-column", eye: null, queued: "Queued, 2nd", renameDisabled: RUN_LABEL, title: "Starts when Betweenness finishes", go: ["analyze-popover", "running"], menu: ["context-menus", "run-row"] });
        if (state === "finished") rows.push({ id: "betweenness-new", name: "Betweenness", kind: "chart-column", swatch: AB.ramp("#fde7c8", "#E69F00"), eye: true, fresh: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] });
        if (state === "partial") rows.push({ id: "betweenness-new", name: "Betweenness", kind: "chart-column", swatch: AB.ramp("#fde7c8", "#E69F00"), eye: true, partial: true, title: "Stopped before it finished: values only for the nodes it reached", go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] });
        if (state === "failed") rows.push({ id: "failed", name: "Closeness", kind: "chart-column", eye: null, failed: true, renameDisabled: RUN_LABEL, go: ["inspector-run-row", "data"], menu: ["context-menus", "run-row"] });
        rows.push({ id: "pagerank", name: "PageRank", kind: "chart-column", swatch: AB.ramp("#ef7818", "#662506"), eye: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"], scope: state === "scope-mark", stale: state === "out-of-date" });
        rows.push({
            id: "louvain", name: "Louvain, resolution 1.0", kind: "layers", swatch: stack(LOUVAIN[0].color, LOUVAIN[1].color),
            notes: 1, inside: 2, eye: true, open: openLouvain, renameDisabled: RUN_LABEL, toggle: openLouvain ? "at-rest" : "louvain-open",
            go: ["inspector-run-row", "style"], menu: ["context-menus", "run-row"], scope: state === "scope-mark",
            children: LOUVAIN.map((c) => ({ id: "c" + c.n, name: "Community " + c.n, runGroup: true, kind: "circle-dot", swatch: AB.chit(c.color, true), count: String(c.size), notes: c.notes, eye: true, locked: false, go: ["inspector-group-set-path-row", "community-" + c.n], menu: ["context-menus", "row"] })),
        });
        rows.push({
            id: "paths", name: "Shortest paths", kind: "route", swatch: AB.chit("#D55E00"), eye: true, open: true, renameDisabled: RUN_LABEL,
            go: ["inspector-run-row", "style"], menu: ["context-menus", "run-row"],
            children: [
                { id: "p1", name: "Valjean to Javert", kind: "route", swatch: AB.chit("#D55E00"), count: "2", eye: true, go: ["inspector-group-set-path-row", "path-lesmis"], menu: ["context-menus", "row"], badDrop: state === "invalid-drop" },
                { id: "p2", name: "Myriel to Javert", kind: "route", swatch: AB.chit("#0072B2"), count: "3", eye: true, go: ["inspector-group-set-path-row", "path-lesmis-2"], menu: ["context-menus", "row"] },
            ],
        });
        rows.push({ id: "watchlist", name: "Watchlist", kind: "circle-check", swatch: AB.chit("#CC79A7", true), count: "5", eye: true, locked: true, title: "Valjean, Javert, Thenardier, Mme.Thenardier, Eponine", go: ["inspector-group-set-path-row", "watchlist"], menu: ["context-menus", "row"] });
        if (state === "show-hidden") rows.push({ id: "degree", name: "Degree", kind: "hash", swatch: AB.ramp("#cfcfcf", "#4d4d4d"), eye: true, hiddenRow: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] });
        rows.push({
            id: "folder", name: "For the report", kind: "folder-open", eye: true, open: true, go: ["inspector-folder", "folder"], menu: ["context-menus", "folder"],
            children: [
                // Kept sets (Keep as set on two values of the group column): a group itself is locked to its parent row
                { id: "g2", name: "Group 2 (kept)", kind: "circle-check", swatch: AB.chit(g2.color, true), count: String(g2.count), eye: true, go: ["inspector-group-set-path-row", "kept-2"], menu: ["context-menus", "row"] },
                { id: "g8", name: "Group 8 (kept)", kind: "circle-check", swatch: AB.chit(g8.color, true), count: String(g8.count), eye: true, go: ["inspector-group-set-path-row", "kept-8"], menu: ["context-menus", "row"] },
                { id: "bt", name: "Betweenness", kind: "chart-column", swatch: AB.ramp(), eye: false, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
            ],
        });
        rows.push(everything(state));
        // Everything hidden: the rows above it are hidden too, so only Groups 2 and 8 paint (the canvas draws that)
        if (state === "everything-hidden") rows.forEach((r) => { if (["pagerank", "louvain", "paths", "watchlist"].includes(r.id)) r.eye = false; });
        // rename-chain: Community 3 was just renamed (the name from its note), and Tab moved on
        if (state === "rename-chain") renamed.g2 = renamed.g2 || "Valjean's family";
        const mark = (list) => list.forEach((r) => { if (r.id === selRow) r.selected = true; if (renamed[r.id]) r.name = renamed[r.id]; if (r.children) mark(r.children); });
        mark(rows);
        if (state === "rows-with-notes") return rows.filter((r) => r.pinned || r.id === "notes" || r.notes || r.inside || r.id === "everything").map((r) => (r.id === "louvain" ? Object.assign(r, { open: true, children: r.children.filter((c) => c.notes), toggle: null }) : r));
        return rows;
    }
    // One swatch for a run's shared palette: its first color, the second peeking behind
    function stack(c1, c2) {
        const s = AB.chit(c1, true);
        s.classList.add("gp-stack");
        s.style.setProperty("--gp-stack2", c2);
        return s;
    }
    function notesRow(count, eye) {
        return { id: "notes", name: "Notes", kind: "message-square", builtin: true, count, eye, title: "Paints only the nodes and edges notes are about", go: ["inspector-selection-and-everything", "notes"], menu: ["context-menus", "notes-row"] };
    }
    function everything(state) {
        return { id: "everything", name: "Everything", kind: "square-filled", swatch: AB.chit("#6366F1"), title: "graphty-element's defaults: fill #6366F1", pinned: true, builtin: true, eyeTitle: EVERYTHING_EYE, eye: state !== "everything-hidden", go: ["inspector-selection-and-everything", "everything"], menu: ["context-menus", "row"] };
    }

    // ---------- one row, left to right ----------
    // A row's state, spoken with its name (the status line under it is drawn for sight only)
    const stateWords = (r) => r.running ? ", running" : r.queued ? ", queued" : r.failed ? ", failed: the GPU device was lost" : r.partial ? ", stopped before it finished" : r.stale ? ", out of date" : r.scope ? ", computed before the filter" : r.hiddenRow ? ", hidden from the list, still painting" : "";
    function rowEl(r, level, env) {
        if (r.prompt) {
            const li = h("li", Object.assign({ class: "ab-trow gp-prompt", role: "treeitem", "aria-level": "1", style: "--lvl:0" }, AB.act({ go: ["analyze-popover", "open"] })), h("span", { class: "ab-disc" }), h("span", { class: "ab-kind" }, icon("flask-conical")), h("span", { class: "ab-sw-empty" }), h("span", { class: "ab-tname k-ellipsis" }, "Analyze to add results here"), h("span", { class: "ab-eye-slot" }));
            li.tabIndex = -1;
            return [li];
        }
        const kids = r.children && r.children.length;
        const out = [];
        const noteLabel = (r.notes ? ", " + r.notes + (r.notes === 1 ? " note" : " notes") : "") + (r.inside ? ", " + r.inside + " notes on rows inside" : "");
        const li = h("li", {
            class: "ab-trow", role: "treeitem", tabindex: "-1", "aria-level": String(level), "aria-selected": r.selected ? "true" : "false",
            "aria-expanded": kids ? String(!!r.open) : null, "aria-label": r.name + (r.count ? ", " + r.count : "") + noteLabel + stateWords(r),
            "data-pinned": r.pinned ? "" : null, "data-hidden-row": r.hiddenRow ? "" : null, "data-failed": r.failed ? "" : null, "data-partial": r.partial ? "" : null,
            "data-drop-bad": r.badDropTarget ? "" : null, "data-row": r.id, "data-level": String(level), style: `--lvl:${level - 1}`, title: r.title || null,
        });
        const disc = h("span", { class: "ab-disc", "aria-hidden": "true" }, kids ? icon(r.open ? "chevron-down" : "chevron-right", "sm") : null);
        if (kids) disc.addEventListener("click", (e) => {
            e.stopPropagation();
            if (e.detail > 1) return;
            if (r.toggle) { AB.go("graph-place", r.toggle); return; }
            r.open = !r.open;
            env.redraw(r.id);
        });
        const kind = r.failed ? h("span", { class: "ab-kind k-danger" }, icon("circle-x")) : r.running ? h("span", { class: "ab-kind" }, icon("loader-circle")) : h("span", { class: "ab-kind" }, icon(r.kind));
        // The note count is a mark, not a Tab stop: the row's name already says it
        const notes = r.notes ? h("span", { class: "ab-tnotes k-num", "aria-hidden": "true", title: (r.id === "louvain" ? NOTES.louvain : r.id === "c3" ? NOTES.c3a : r.notes + (r.notes === 1 ? " note" : " notes")) + (r.inside ? " (" + r.inside + " more on rows inside)" : "") }, icon("message-square", "sm"), String(r.notes)) : null;
        if (notes) notes.addEventListener("click", (e) => { e.stopPropagation(); AB.go(r.go[0], "data"); });
        const lock = r.locked ? h("span", { class: "ab-kind", title: "Locked: position and style" }, icon("lock", "sm")) : null;
        let eye;
        if (r.eye == null) eye = h("span", { class: "ab-eye-slot", title: r.failed ? "" : "Nothing to paint" });
        else {
            eye = h("span", { class: "ab-eye", role: "button", tabindex: "-1", "aria-pressed": String(!!r.eye), "aria-label": "Show " + r.name + " on the canvas", title: r.eyeTitle || "Show or hide this row's paint. Alt-click or Alt+Space: only this row paints" }, icon(r.eye ? "eye" : "eye-off"));
            eye.addEventListener("click", (e) => {
                e.stopPropagation();
                if (e.detail > 1) return; // the second click of a double-click: one toggle only
                if (e.altKey) { env.solo(r.id); return; }
                if (r.id === "everything") { AB.go("graph-place", r.eye ? "everything-hidden" : "at-rest"); return; }
                r.eye = !r.eye;
                env.redraw(r.id);
            });
        }
        if (r.solo) li.setAttribute("data-solo", "");
        if (r.struck) li.setAttribute("data-struck", "");
        const nameEl = h("span", { class: "ab-tname k-ellipsis", title: refusal(r) ? null : "Double-click or F2 to rename" }, r.name);
        const prog = r.queued || r.partial ? h("span", { class: "ab-tprog k-num" }, r.queued || "Partial") : null;
        AB.append(li, [disc, kind, h("span", { class: "ab-sw-slot" }, r.swatch || null), nameEl, prog, r.count != null ? h("span", { class: "ab-tcount k-num" }, r.count) : null, notes, lock, eye]);
        const entry = { li, r };
        env.entries.push(entry);
        // One click selects the row and shows its inspector. The tree stays in place (the shell keeps
        // the left panel), so the second click of a double-click lands on the same name.
        li.addEventListener("click", (e) => {
            if (e.detail > 1) return;
            if (e.shiftKey || e.metaKey || e.ctrlKey) { AB.go("inspector-several-rows", "style"); return; }
            env.open(entry);
        });
        nameEl.addEventListener("dblclick", (e) => { e.stopPropagation(); env.rename(entry); });
        li.addEventListener("keydown", (e) => {
            if (e.target !== li) return;
            const move = (to) => { if (to) { e.preventDefault(); env.focus(to); } };
            const vis = () => [...li.closest(".ab-tree").querySelectorAll(".ab-trow[role='treeitem'][data-row]")];
            if (e.key === "F2") { e.preventDefault(); env.rename(entry); }
            else if (e.key === "Enter") env.open(entry);
            else if (e.key === " " && e.altKey && r.eye != null) { e.preventDefault(); env.solo(r.id); }
            else if (e.key === " " && r.eye != null) { e.preventDefault(); eye.click(); }
            else if (e.key === "F10" && e.shiftKey) { e.preventDefault(); AB.go(r.menu[0], r.menu[1]); }
            else if (e.key === "ArrowDown" || e.key === "ArrowUp") { const all = vis(); move(all[all.indexOf(li) + (e.key === "ArrowDown" ? 1 : -1)]); }
            else if (e.key === "Home") { move(vis()[0]); }
            else if (e.key === "End") { const all = vis(); move(all[all.length - 1]); }
            else if (e.key === "ArrowRight" && kids && !r.open) { e.preventDefault(); disc.click(); }
            else if (e.key === "ArrowLeft" && kids && r.open) { e.preventDefault(); disc.click(); }
            else if (e.key === "ArrowLeft" && level > 1) {
                // to the parent: the nearest row above at a shallower level
                const all = vis();
                move(all.slice(0, all.indexOf(li)).reverse().find((x) => Number(x.dataset.level) < level));
            }
        });
        if (r.menu) li.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); AB.go(r.menu[0], r.menu[1]); });
        out.push(li);

        // Status under the row: text for sight (the row's name says it to a screen reader). Its verbs
        // (Cancel, Retry, Remove, Rerun, Unhide) are in the row's menu and the inspector's state bar.
        const mark = (cls, ...k) => out.push(h("li", { class: "gp-mark " + (cls || ""), role: "none", "aria-hidden": "true", style: `--lvl:${level - 1}` }, ...k));
        if (r.running) mark("", h("span", { class: "k-progress gp-indeterminate" }, h("i")), h("span", null, "Running"));
        if (r.failed) mark("gp-mark-danger", h("span", { class: "gp-msg" }, "The GPU device was lost during the run. Nothing was computed on the CPU. ", oq("The message is graphty-element's own error text; this wording is a stand-in.")));
        if (r.scope) mark("", h("span", { class: "gp-scope", title: "Computed before the filter step Filter to degree >= 2. Still correct for the graph it names. Rerun on 60 is in the row's menu." }, icon("funnel", "sm"), "on 77 nodes; now 60"));
        if (r.stale) mark("", h("span", { class: "gp-scope", title: "The data changed after this run. It keeps painting the earlier values until rerun." }, icon("triangle-alert", "sm"), "Out of date: values from the earlier data"));
        if (r.partial) mark("", "Stopped before it finished. Painting the values it reached.");
        if (r.hiddenRow) mark("", "Hidden from the list; still painting.");

        if (kids && r.open) {
            if (r.children.length > 20 || r.search) out.push(h("li", { class: "gp-runsearch", role: "none" }, h("label", { class: "gp-find" }, icon("search", "sm"), h("input", { type: "search", placeholder: "Find in " + r.name.split(",")[0] + " by name or member", "aria-label": "Find groups in " + r.name }))));
            r.children.forEach((c) => out.push(...rowEl(c, level + 1, env)));
            if (r.more) out.push(...rowEl(r.more, level + 1, env));
        }
        if (r.badDrop) {
            // the row being dragged, and the reason it cannot land where it hovers
            out.push(h("li", { class: "ab-trow", role: "none", "data-drag-ghost": "", style: "--lvl:0" }, h("span", { class: "ab-disc" }), h("span", { class: "ab-kind" }, icon("route")), AB.chit("#D55E00"), h("span", { class: "ab-tname k-ellipsis" }, "Valjean to Javert"), h("span", { class: "ab-tcount k-num" }, "2")));
        }
        return out;
    }

    function treeEl(rows, env, label) {
        const ul = h("ul", { class: "ab-tree gp-tree", role: "tree", "aria-label": label || "Paint order, top wins", "aria-multiselectable": "true" });
        rows.forEach((r) => AB.append(ul, rowEl(r, 1, env)));
        return ul;
    }

    // ---------- the list menu (drawn in the overlay layer) ----------
    function listMenu() {
        const ov = document.getElementById("ab-overlay");
        if (!ov) return;
        ov.hidden = false;
        ov.dataset.active = "true";
        ov.append(AB.menu({
            anchor: "#gp-list-btn", place: "below-end", items: [
                { label: "New folder", shortcut: "Ctrl+G", onClick: () => AB.flash("New folder (not wired in the skeleton)") },
                { sep: true },
                { label: "Show hidden rows", go: ["graph-place", "show-hidden"], desc: "Rows hidden from the list, dimmed, with Unhide" },
                { label: "Rows with notes", go: ["graph-place", "rows-with-notes"], desc: "Narrows the list; never changes the paint" },
                { label: "Show kind", sub: true, onClick: () => AB.flash("Show kind: All, Runs, Groups and sets, Paths, Measures (not wired in the skeleton)") },
                { label: "Sort inside a run", sub: true, onClick: () => AB.flash("Sort inside a run: paint order, size, name, date (not wired in the skeleton)") },
                { label: "Collapse all", go: ["graph-place", "at-rest"] },
            ],
        }));
    }

    // ---------- the place ----------
    function render(el, state) {
        const L = AB.fx.datasets.lesmis;
        const many = state === "many-groups";
        const graphName = many ? AB.fx.datasets.transactions.graphName : L.frame.graphRow;
        const graphNotes = state === "empty" || many ? 0 : 1;

        const switcher = h("div", { class: "ab-switcher" },
            h("span", Object.assign({ class: "ab-switch-btn", role: "button", "aria-haspopup": "menu", title: "Graphs in this project" }, AB.act({ go: ["graphs-switcher", "open"] })), icon("network"), h("span", { class: "k-ellipsis" }, graphName), icon("chevron-down", "sm")),
            h("span", { class: "k-grow" }),
            graphNotes ? h("span", Object.assign({ class: "gp-switch-notes k-num", role: "button", title: NOTES.graph, "aria-label": graphNotes + " note about this graph" }, AB.act({ go: ["notes-place", "all"] })), icon("message-square", "sm"), String(graphNotes)) : null,
        );

        const input = h("input", { type: "search", placeholder: "Find rows and notes", "aria-label": "Find rows and notes", value: state === "find" ? "Jav" : null });
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && input.value) AB.go("graph-place", "find");
            if (e.key === "Escape" && state === "find") AB.go("graph-place", "at-rest");
        });
        input.addEventListener("input", () => { if (!input.value && state === "find") AB.go("graph-place", "at-rest"); });
        const listBtn = AB.iconButton("list-filter", "List options", { go: ["graph-place", state === "list-menu" ? "at-rest" : "list-menu"], pressed: state === "list-menu" || state === "show-hidden" || state === "rows-with-notes" });
        listBtn.id = "gp-list-btn";
        listBtn.setAttribute("aria-haspopup", "menu");
        const treebar = h("div", { class: "ab-treebar" }, h("label", { class: "gp-find" }, icon("search", "sm"), input), listBtn);

        const scroll = h("div", { class: "k-scroll" });
        const body = h("div");
        scroll.append(body);

        let rows = many ? manyModel() : model(state);
        let soloId = state === "solo" ? "pagerank" : null;
        const env = {
            entries: [],
            // Select a row in place (no redraw) and show its inspector
            open(entry) {
                env.entries.forEach((x) => x.li.setAttribute("aria-selected", String(x === entry)));
                env.focus(entry.li, true);
                const target = AB.href(entry.r.go[0], entry.r.go[1]);
                if (location.hash !== target) { AB.keepLeft = true; location.hash = target; }
            },
            // Roving focus: only the current row is a Tab stop
            focus(li, quiet) {
                env.entries.forEach((x) => (x.li.tabIndex = x.li === li ? 0 : -1));
                if (!quiet) li.focus();
            },
            rename(entry, prefix) {
                const no = refusal(entry.r);
                if (no) {
                    if (entry.r.runGroup) return offer(no, { label: "Keep as set", run: () => AB.flash("Kept " + entry.r.name + " as a set on top of the tree (not wired in the skeleton)") });
                    return AB.flash(no);
                }
                const nameEl = entry.li.querySelector(".ab-tname");
                // The field announces itself ("Renaming X"); Enter, Tab and Esc are in its tooltip. Nothing is drawn above the tree.
                AB.renameInPlace(nameEl, {
                    focusAfter: entry.li,
                    onSave: (name) => { entry.r.name = name; renamed[entry.r.id] = name; },
                    onTab: (dir) => {
                        const live = env.entries.filter((x) => x.li.isConnected && !refusal(x.r));
                        const next = live[live.indexOf(entry) + dir];
                        if (next) env.rename(next, "Renamed to " + entry.r.name + ". ");
                        else entry.li.focus();
                    },
                });
                if (prefix) AB.announce(prefix + "Renaming " + entry.r.name);
            },
            redraw(keepId) { draw(); const e = keepId && env.entries.find((x) => x.r.id === keepId); if (e) env.focus(e.li); },
            solo(id) { soloId = soloId === id ? null : id; env.redraw(id); },
        };
        function applySolo(list) {
            list.forEach((r) => {
                r.solo = soloId === r.id;
                r.struck = !!soloId && soloId !== r.id && r.id !== "everything" && r.eye != null;
                if (r.children) applySolo(r.children);
            });
        }
        function draw() {
            applySolo(rows);
            env.entries = [];
            body.replaceChildren();
            if (state === "find") return drawFind(body);
            if (state === "show-hidden") body.append(h("div", { class: "gp-banner" }, icon("eye", "sm"), h("span", { class: "k-grow" }, "Showing rows hidden from the list"), actLink("Done", { go: ["graph-place", "at-rest"] })));
            if (state === "rows-with-notes") body.append(h("div", { class: "gp-banner" }, icon("message-square", "sm"), h("span", { class: "k-grow" }, "Rows with notes"), actLink("Show all rows", { go: ["graph-place", "at-rest"] })));
            body.append(treeEl(rows, env));
            // One Tab stop in the tree: the selected row, or the first
            const cur = env.entries.find((x) => x.r.selected) || env.entries[0];
            if (cur) cur.li.tabIndex = 0;
            // A row hidden from the list still paints; say so, so every paint on the canvas has a row you can find (spec 16.5)
            if (state !== "show-hidden" && state !== "empty" && !many) body.append(h("div", { class: "gp-foot" }, "1 hidden row still paints. ", AB.link("graph-place", "show-hidden", "Show hidden rows")));
            const reason = (id, text) => { const r = body.querySelector(`[data-row='${id}']`); if (r) r.after(h("li", { class: "gp-drop-reason", role: "status" }, icon("info", "sm"), text)); };
            if (state === "rename-builtin") reason("everything", "Built-in rows keep their names");
            if (state === "rename-run-disabled") reason("louvain", refusal({ renameDisabled: RUN_LABEL }));
            if (state === "invalid-drop") {
                const tgt = body.querySelector("[data-row='louvain']");
                if (tgt) tgt.setAttribute("data-drop-bad", "");
                const ghost = body.querySelector("[data-drag-ghost]");
                const reason = h("div", { class: "gp-drop-reason", role: "status" }, icon("circle-x", "sm"), "A path cannot go inside a run. A run holds only its own results.");
                if (tgt) tgt.after(ghost || h("span"));
                if (ghost) ghost.after(reason);
            }
            if (state === "everything-hidden") body.append(h("div", { class: "gp-note-line", role: "status" }, "Everything is hidden. Unpainted nodes still take part in the layout. To leave them out, filter. ", AB.link("data-place", "filters", "Filter...")));
        }
        function drawFind(b) {
            b.append(h("div", { class: "gp-find-head" }, "Rows"));
            const hit = (ic, sw, text, sub, target) => b.append(h("div", Object.assign({ class: "gp-hit", role: "option" }, AB.act({ go: target })), icon(ic), sw, h("span", { class: "gp-hit-text" }, text, sub ? h("span", { class: "gp-hit-sub" }, sub) : null)));
            const hi = (s) => { const i = s.indexOf("Jav"); return [s.slice(0, i), h("mark", null, "Jav"), s.slice(i + 3)]; };
            hit("route", AB.chit("#D55E00"), hi("Valjean to Javert"), "in Shortest paths", ["inspector-group-set-path-row", "path"]);
            hit("route", AB.chit("#0072B2"), hi("Myriel to Javert"), "in Shortest paths", ["inspector-group-set-path-row", "path"]);
            hit("circle-check", AB.chit("#CC79A7", true), "Watchlist", "a member: Javert", ["inspector-group-set-path-row", "style"]);
            b.append(h("div", { class: "gp-find-head" }, "Notes"));
            hit("message-square", null, hi("Valjean and Javert land in the same community..."), "about Louvain, resolution 1.0. Picking it selects its targets", ["inspector-run-row", "data"]);
        }
        draw();

        el.append(AB.placeHead("Graph"), switcher, treebar, scroll);
        if (state === "invalid-drop") {
            document.body.classList.add("gp-nodrop");
            const off = () => { document.body.classList.remove("gp-nodrop"); window.removeEventListener("hashchange", off); };
            window.addEventListener("hashchange", off);
        }
        if (state === "list-menu") requestAnimationFrame(listMenu);
        const byId = (id) => env.entries.find((x) => x.r.id === id);
        if (state === "rename") requestAnimationFrame(() => env.rename(byId("g2")));
        if (state === "rename-chain") requestAnimationFrame(() => env.rename(byId("g8"), "Renamed to Valjean's family. "));
        if (state === "rename-run-group") requestAnimationFrame(() => env.rename(byId("c3")));
        if (state === "rename-builtin") AB.flash("Built-in rows keep their names");
        if (state === "rename-run-disabled") AB.flash(refusal({ renameDisabled: RUN_LABEL }));
    }
    // Many groups: the transfers March Louvain run (fixtures: 35 communities, largest first)
    function manyModel() {
        const T = AB.fx.datasets.transactionsApril;
        const lv = T.louvain.march, colors = T.communityColors;
        const named = lv.largest.map((size, i) => ({ n: i + 1, size, color: colors["Community " + (i + 1)] })).filter((c) => c.color);
        const rest = lv.communities - named.length;
        return [
            { id: "selection", name: "Selection", kind: "scan", pinned: true, builtin: true, eye: true, go: ["inspector-selection-and-everything", "selection"], menu: ["context-menus", "row"] },
            notesRow(null, true),
            {
                id: "louvain", name: "Louvain, weighted by amount", kind: "layers", selected: true, swatch: stack(named[0].color, named[1].color),
                eye: true, open: true, search: true, renameDisabled: RUN_LABEL, go: ["inspector-run-row", "many-groups"], menu: ["context-menus", "run-row"],
                children: named.map((c) => ({ id: "m" + c.n, name: "Community " + c.n, runGroup: true, kind: "circle-dot", swatch: AB.chit(c.color, true), count: String(c.size), eye: true, go: ["inspector-run-row", "many-groups"], menu: ["context-menus", "row"] })),
                more: { id: "more", name: rest + " more groups", kind: "circle-dot", swatch: AB.chit("#BDBDBD", true), eye: true, title: "One shared color: the palette tells about ten apart", go: ["table-dock", "transfers"], menu: ["context-menus", "row"] },
            },
            everything("many-groups"),
        ];
    }

    registerSection({
        id: "graph-place",
        title: "Graph place (the paint tree)",
        region: "left",
        rail: "graph",
        frame(state) {
            if (state === "empty") return { right: "inspector-nothing-selected" };
            if (state === "louvain-open") return { right: "inspector-run-row/style" };
            if (state === "many-groups") return { dataset: "transactions", canvas: "canvas-and-states/transfers-communities", right: "inspector-run-row/many-groups" };
            if (state === "scope-mark") return { right: "inspector-measure-row/scope-mark", chip: "Filtered: 60 of 77 nodes" };
            if (state === "failed") return { right: "inspector-run-row/data" };
            if (state === "find" || state === "list-menu") return {};
            if (state === "rename" || state === "rename-chain") return { right: "inspector-group-set-path-row/kept-2" };
            if (state === "rename-run-group") return { right: "inspector-group-set-path-row/community-3" };
            if (state === "rename-builtin") return { right: "inspector-selection-and-everything/everything" };
            if (state === "rename-run-disabled") return { right: "inspector-run-row/style" };
            return { right: "inspector-measure-row/style" };
        },
        states: [
            { id: "at-rest", label: "Populated, PageRank selected" },
            { id: "empty", label: "Empty graph" },
            { id: "louvain-open", label: "Louvain expanded" },
            { id: "many-groups", label: "Many groups (transfers)" },
            { id: "running", label: "Run in progress" },
            { id: "finished", label: "Run finished" },
            { id: "failed", label: "Run failed" },
            { id: "solo", label: "Solo on one eye" },
            { id: "everything-hidden", label: "Everything hidden" },
            { id: "show-hidden", label: "Show hidden on" },
            { id: "rows-with-notes", label: "Rows with notes" },
            { id: "scope-mark", label: "After a filter step" },
            { id: "out-of-date", label: "After a data change" },
            { id: "invalid-drop", label: "Invalid drop" },
            { id: "find", label: "Find results" },
            { id: "list-menu", label: "List menu" },
            { id: "rename", label: "Renaming Group 2" },
            { id: "rename-chain", label: "Rename, Tab to the next row" },
            { id: "rename-run-group", label: "Rename a run's group: Keep as set" },
            { id: "rename-builtin", label: "Rename refused: built-in row" },
            { id: "rename-run-disabled", label: "Rename refused: a run" },
            { id: "queued", label: "Run queued" },
            { id: "partial", label: "Run stopped, partial values" },
            { id: "notes-eye-off", label: "Notes markers off" },
        ],
        render,
    });
})();
