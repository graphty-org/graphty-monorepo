/* Quick actions (Ctrl+K), Find (/) and the keyboard shortcuts panel (?).
   Quick actions lists every command by name, grouped, each with its key; typing filters by name and by alias
   ("field" and "calculated field" reach New attribute...). Find lives in the tree's search field, so its state
   draws the Graph place's own Find results (rows, then notes) underneath. The shortcuts panel groups the graph
   view's keys (graphty-element) and the app's by region. This file also binds / and ? for the skeleton.
   Plain ASCII. */
(function () {
    const CSS = `
.ab-overlay .qs-quick { position: absolute; left: 0; top: 0; bottom: auto; transform: none; width: 520px; max-width: calc(100vw - 32px); }
.qs-quick .k-quick-input input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; color: var(--cm-text); }
.qs-quick .k-quick-list { max-height: min(360px, calc(100vh - 440px)); }
.qs-head { padding: 8px 16px 2px; font-size: 11px; line-height: 16px; font-weight: 550; color: var(--cm-text-secondary); }
.qs-quick .k-result { cursor: default; }
.qs-quick .k-result:hover::before { background: var(--cm-bg-hover); }
.qs-quick .k-result[aria-selected="true"]::before { background: var(--cm-bg-selected); }
.qs-quick .k-result .k-i { color: var(--cm-icon-secondary); flex: none; }
.qs-name { white-space: nowrap; }
.qs-why { color: var(--cm-text-secondary); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.qs-quick .k-result .qs-key { margin-inline-start: auto; flex: none; }
.qs-quick .k-result[aria-disabled="true"] { color: var(--cm-text-tertiary); }
.qs-quick .k-result mark { background: transparent; color: inherit; font-weight: 650; }
.qs-foot { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 6px 16px 8px; font-size: 11px; color: var(--cm-text-secondary); border-top: 1px solid var(--cm-border); }
.qs-foot .k-kbd { margin-inline-end: 4px; }
.qs-none { padding: 8px 16px; color: var(--cm-text-secondary); }
.ab-overlay:has(.qs-pass) { pointer-events: none; }
.qs-pass { pointer-events: auto; max-width: 224px; margin-left: 16px; white-space: normal; }
.qs-sheet { column-count: 2; column-gap: 32px; padding: 4px 16px 0; }
.qs-group { break-inside: avoid; padding-bottom: 14px; }
.qs-group h3 { display: flex; align-items: baseline; gap: 8px; margin: 0 0 4px; font-size: 12px; font-weight: 600; }
.qs-group h3 .qs-src { font-size: 11px; font-weight: 400; color: var(--cm-text-secondary); }
.qs-keys { display: grid; grid-template-columns: max-content 1fr; gap: 3px 10px; align-items: baseline; margin: 0; }
.qs-keys dt { margin: 0; white-space: nowrap; }
.qs-keys dt .k-kbd + .k-kbd { margin-inline-start: 3px; }
.qs-keys dd { margin: 0; color: var(--cm-text); }
.qs-sheet .k-annot-tag { margin-top: 4px; }
@media (max-width: 1100px) { .qs-sheet { column-gap: 24px; } }
`;
    if (!document.getElementById("qs-css")) document.head.append(h("style", { id: "qs-css" }, CSS));

    const flash = (what) => () => AB.flash(what + " (not wired in the skeleton)");
    const openQ = (why) => h("span", { class: "k-annot-tag", title: why }, "Open question");

    // ---------- every command by name ----------
    // g: group; key: its shortcut; go / run: what it does; aka: aliases that search also matches;
    // off: why it is unavailable right now (nothing is selected at rest).
    const NEEDS_SEL = "Needs a selection";
    const COMMANDS = [
        // the rail places, and the sections of Data that people ask for by name
        { g: "Go to", icon: "network", name: "Graph", why: "the tree: what paints the graph", go: ["graph-place", "at-rest"], aka: ["tree", "layers", "rows", "results", "styles"] },
        { g: "Go to", icon: "database", name: "Data", why: "sources, filters, attributes, versions", go: ["data-place", "at-rest"], aka: ["sources", "import", "files", "datasets"] },
        { g: "Go to", icon: "database", name: "Data: Attributes", why: "how each column is read", go: ["data-place", "attributes"], aka: ["field", "fields", "columns", "properties"] },
        { g: "Go to", icon: "funnel", name: "Data: Filters", why: "the filter steps", go: ["data-place", "filters"], aka: ["filter"] },
        { g: "Go to", icon: "history", name: "Data: Versions", go: ["data-place", "versions"], aka: ["refresh", "replace"] },
        { g: "Go to", icon: "message-square", name: "Notes", why: "every note, newest first", go: ["notes-place", "all"], aka: ["comments", "annotations", "findings"] },
        { g: "Go to", icon: "bot", name: "Assistant", go: ["assistant-place", "conversation"], aka: ["ai", "chat", "ask"] },
        // making things
        { g: "Analyze", icon: "flask-conical", name: "Analyze...", key: "A", why: "the algorithm catalog", go: ["analyze-popover", "open"], aka: ["algorithm", "run", "statistics"] },
        { g: "Analyze", icon: "chart-column", name: "PageRank", why: "Rank nodes and edges", go: ["analyze-popover", "essentials"], aka: ["importance", "influence"] },
        { g: "Analyze", icon: "group", name: "Louvain", why: "Find groups", go: ["analyze-popover", "open"], aka: ["communities", "clusters", "modularity"] },
        { g: "Analyze", icon: "chart-column", name: "Betweenness", why: "Rank nodes and edges", go: ["analyze-popover", "open"], aka: ["brokers", "bridges", "centrality"] },
        { g: "Analyze", icon: "route", name: "Shortest path", key: "P", why: "pick From, then To", go: ["path-tool", "armed"], aka: ["path", "route", "connected"] },
        { g: "Analyze", icon: "flask-conical", name: "All algorithms...", go: ["analyze-popover", "all-algorithms"] },
        { g: "Analyze", icon: "plus", name: "New attribute...", why: "a value computed from other attributes", run: flash("New attribute..."), aka: ["calculated field", "field", "expression", "formula", "computed column"] },
        // layout and view
        { g: "Layout and view", icon: "refresh-cw", name: "Re-run layout", run: () => AB.flash("Layout running again (not wired in the skeleton)"), aka: ["untangle", "relayout", "arrange", "layout"] },
        { g: "Layout and view", icon: "layers", name: "Lay out members...", off: NEEDS_SEL, aka: ["layout"] },
        { g: "Layout and view", icon: "box", name: "Switch to 3D", key: "5", go: ["toolbar", "3d"], aka: ["2d", "3d", "dimension"] },
        { g: "Layout and view", icon: "box", name: "Enter VR", go: ["toolbar", "view-mode-headset"], aka: ["headset", "immersive", "xr"] },
        { g: "Layout and view", icon: "box", name: "Enter AR", go: ["toolbar", "view-mode-headset"], aka: ["headset", "immersive", "xr"] },
        { g: "Layout and view", icon: "scan", name: "Zoom to fit", key: "0", run: flash("Zoom to fit"), aka: ["fit", "camera"] },
        { g: "Layout and view", icon: "bookmark-plus", name: "Save view...", go: ["zoom-and-view-menu", "save-view"], aka: ["camera", "bookmark", "snapshot"] },
        { g: "Layout and view", icon: "table", name: "Show table", key: "Shift+T", go: ["table-dock", "nodes"], aka: ["grid", "spreadsheet"] },
        { g: "Layout and view", icon: "panel-left", name: "Toggle panels", key: "Ctrl+B", run: flash("Toggle panels") },
        // selection and edit
        { g: "Selection and edit", icon: "group", name: "Create set", key: "Ctrl+G", off: NEEDS_SEL, aka: ["group", "save selection"] },
        { g: "Selection and edit", icon: "network", name: "Neighborhood", key: "G", off: NEEDS_SEL, aka: ["neighbors", "ego", "hops"] },
        { g: "Selection and edit", icon: "funnel", name: "Filter to neighbors", off: NEEDS_SEL, aka: ["neighbors"] },
        { g: "Selection and edit", icon: "eye-off", name: "Hide on canvas", key: "Ctrl+Shift+H", off: NEEDS_SEL },
        { g: "Selection and edit", icon: "sticky-note", name: "Add note", key: "N", go: ["notes-place", "writing"], aka: ["comment", "annotate"] },
        { g: "Selection and edit", icon: "scan", name: "Select all visible", key: "Ctrl+A", run: flash("Select all visible") },
        { g: "Selection and edit", icon: "history", name: "Undo history", go: ["full-canvas-modes", "version-history"], aka: ["undo", "history"] },
        // file and project
        { g: "File and project", icon: "folder-open", name: "Open...", key: "Ctrl+O", go: ["load-step", "preview"] },
        { g: "File and project", icon: "file-plus", name: "Add data...", go: ["load-step", "join"], aka: ["join", "import", "source"] },
        { g: "File and project", icon: "download", name: "Export...", go: ["export-dialog", "figure"], aka: ["save as", "svg", "report", "download", "graphml", "csv"] },
        { g: "File and project", icon: "book-open", name: "Export findings report...", go: ["export-dialog", "findings-report"], aka: ["report", "case file"] },
        { g: "File and project", icon: "sparkles", name: "Apply recipe...", go: ["recipe-apply", "binding"], aka: ["template", "style file"] },
        { g: "File and project", icon: "menu", name: "Main menu", go: ["main-menu", "file"], aka: ["menu", "file", "edit", "view"] },
        { g: "File and project", icon: "settings", name: "Preferences...", key: "Ctrl+,", go: ["preferences", "general"], aka: ["settings", "options", "theme"] },
        { g: "File and project", icon: "keyboard", name: "Keyboard shortcuts", key: "?", go: ["commands-and-search", "shortcuts"], aka: ["keys", "hotkeys"] },
    ];
    const RECENT = ["Re-run layout", "PageRank", "Data: Attributes"];

    function matches(q) {
        const s = q.trim().toLowerCase();
        if (!s) return null;
        const out = [];
        COMMANDS.forEach((c) => {
            const byName = c.name.toLowerCase().includes(s);
            const alias = byName ? null : (c.aka || []).find((a) => a.includes(s) || s.includes(a) && a.length > 3);
            if (byName || alias) out.push({ c, alias, rank: c.name.toLowerCase().startsWith(s) ? 0 : byName ? 1 : 2 });
        });
        return out.sort((a, b) => a.rank - b.rank);
    }

    function hl(name, q) {
        const s = q.trim().toLowerCase(), i = s ? name.toLowerCase().indexOf(s) : -1;
        return i < 0 ? name : [name.slice(0, i), h("mark", null, name.slice(i, i + s.length)), name.slice(i + s.length)];
    }

    function resultRow(c, q, alias) {
        const why = c.off ? c.off : alias ? "Also called " + alias : c.why;
        const attrs = { class: "k-result", role: "option", "aria-selected": "false", "aria-disabled": c.off ? "true" : null, title: c.off ? c.name + ": " + c.off : null };
        const el = h("div", attrs, icon(c.icon), h("span", { class: "qs-name" }, hl(c.name, q)), why ? h("span", { class: "qs-why" }, why) : null, c.key ? h("span", { class: "k-kbd qs-key" }, c.key) : null);
        el._run = c.off ? () => AB.flash(c.name + ": " + c.off.toLowerCase()) : c.go ? () => AB.go(c.go[0], c.go[1]) : c.run;
        el.addEventListener("click", () => el._run());
        return el;
    }

    function quick(el, q0) {
        const input = h("input", { type: "text", role: "combobox", "aria-expanded": "true", "aria-controls": "qs-qlist", "aria-label": "Quick actions", placeholder: "Type a command or a place", value: q0 || null, autocomplete: "off" });
        const list = h("div", { class: "k-quick-list", id: "qs-qlist", role: "listbox", "aria-label": "Commands" });
        let at = 0;
        const rows = () => [...list.querySelectorAll(".k-result")];
        const mark = () => rows().forEach((r, i) => { r.setAttribute("aria-selected", String(i === at)); if (i === at) r.scrollIntoView({ block: "nearest" }); });

        function fill() {
            const q = input.value;
            list.replaceChildren();
            const hits = matches(q);
            if (!hits) {
                list.append(h("div", { class: "qs-head" }, "Recent"));
                RECENT.forEach((n) => list.append(resultRow(COMMANDS.find((c) => c.name === n), "")));
                let g = null;
                COMMANDS.forEach((c) => { if (c.g !== g) { g = c.g; list.append(h("div", { class: "qs-head" }, g)); } list.append(resultRow(c, "")); });
            } else {
                if (!hits.length) list.append(h("div", { class: "qs-none" }, 'No commands match "' + q.trim() + '".'));
                let g = null;
                hits.forEach(({ c, alias }) => { if (c.g !== g) { g = c.g; list.append(h("div", { class: "qs-head" }, g)); } list.append(resultRow(c, q, alias)); });
                // the hand-off: the same words, searched in the tree's rows and notes
                list.append(h("div", { class: "qs-head" }, "Find"));
                const find = h("div", { class: "k-result", role: "option", "aria-selected": "false" }, icon("search"), h("span", { class: "qs-name" }, 'Find "' + q.trim() + '" in rows and notes'), h("span", { class: "k-kbd qs-key" }, "/"));
                find._run = () => AB.go("commands-and-search", "find");
                find.addEventListener("click", find._run);
                list.append(find);
            }
            at = 0;
            mark();
        }
        input.addEventListener("input", fill);
        input.addEventListener("keydown", (e) => {
            const n = rows().length;
            if (e.key === "ArrowDown") { e.preventDefault(); at = Math.min(n - 1, at + 1); mark(); }
            else if (e.key === "ArrowUp") { e.preventDefault(); at = Math.max(0, at - 1); mark(); }
            else if (e.key === "Enter") { e.preventDefault(); const r = rows()[at]; if (r) r._run(); }
        });
        fill();

        const box = h("div", { class: "k-quick qs-quick", role: "dialog", "aria-label": "Quick actions" },
            h("div", { class: "k-quick-input" }, icon("search"), input, h("span", { class: "k-kbd" }, "Esc")),
            list,
            h("div", { class: "qs-foot" },
                h("span", null, h("span", { class: "k-kbd" }, "Up"), h("span", { class: "k-kbd" }, "Down"), "move"),
                h("span", null, h("span", { class: "k-kbd" }, "Enter"), "run"),
                h("span", null, h("span", { class: "k-kbd" }, "Esc"), "close"),
                h("span", { class: "k-grow" }),
                openQ("Whether Quick actions also goes to a node by its name (\"Go to Javert\"), or leaves nodes to Find and the table")));
        el.append(AB.position(box, "[data-tool='Quick actions']", "above"));
        setTimeout(() => { input.focus(); const v = input.value; input.setSelectionRange(v.length, v.length); }, 0);
    }

    // ---------- the keyboard shortcuts panel ----------
    const VIEW = "graph view", APP = "app";
    const GROUPS = [
        { title: "Everywhere", src: APP, keys: [
            ["Ctrl+K", "Quick actions: every command by name"],
            ["/", "Find rows and notes"],
            ["?", "These shortcuts"],
            ["F6", "Next region: panels, canvas, toolbar, table"],
            ["Ctrl+Z", "Undo"], ["Ctrl+Shift+Z", "Redo"],
            ["Ctrl+B", "Show or hide the side panels"],
            ["Ctrl+O", "Open..."], ["Ctrl+S", "Save"], ["Ctrl+,", "Preferences"],
            ["Esc", "Disarm a tool, then close a bar or menu. Never clears the selection"],
        ] },
        { title: "Toolbar", src: APP, keys: [
            ["V", "Select"], ["Q", "Lasso"], ["H", "Hand"], ["Space (hold)", "Pan while held"],
            ["P", "Path: click From, then To"], ["A", "Analyze"], ["5", "Switch between 2D and 3D"],
            ["Left, Right", "Move between toolbar buttons"], ["Alt+Down", "Open a button's flyout"],
        ] },
        { title: "Selection", src: APP, keys: [
            ["Ctrl+G", "Create set"], ["E", "Expand"], ["G", "Neighborhood"], ["Ctrl+Shift+H", "Hide on canvas"],
            ["N", "Add note"], ["Ctrl+A", "Select all visible"], ["I", "Invert selection"],
        ] },
        { title: "Tree", src: APP, keys: [
            ["Up, Down", "Move between rows"], ["Left, Right", "Collapse or expand"], ["Space", "Show or hide the row's paint"],
            ["Alt+click eye", "Show only this row"], ["Enter", "Open the row in the inspector"], ["Shift+F10", "Row menu"],
            ["Shift+click, Ctrl+click", "Select several rows"], ["Double-click", "Rename"],
        ] },
        { title: "Camera and display", src: VIEW, keys: [
            ["0", "Fit the graph"], ["F", "Zoom to the selection"], ["Shift+0", "Reset the camera"], ["=, -", "Zoom in, zoom out"],
            ["1, 3, 7", "Front, side and top (3D only)"], ["L", "Legend"], ["M", "Minimap"], ["Shift+N", "Note markers"],
        ] },
        { title: "Walking the graph", src: VIEW, open: "Whether these walk keys ship as the graph view's defaults", keys: [
            ["Arrows", "Move the view"], ["Shift+Down", "Into this node's neighbors"], ["Shift+Left, Shift+Right", "Previous or next neighbor"],
            ["Shift+Up", "Back one step"], ["Space", "Add this node to the selection, or remove it"], ["] [", "Next or previous member of this node's set"],
        ] },
        { title: "Analyze and Path", src: APP, keys: [
            ["Enter", "Run with the settings shown"], ["Esc", "Back one level; again, close"],
        ] },
        { title: "Table and time", src: APP, keys: [
            ["Shift+T", "Show or hide the table"], ["T", "Time slider (a graph with a time attribute)"],
        ] },
        { title: "Writing a note", src: APP, keys: [
            ["Ctrl+Enter", "Save the note"], ["Esc", "Cancel"],
        ] },
    ];

    function kbd(k) {
        // "Shift+click, Ctrl+click" -> two keycaps; "=, -" -> two keycaps
        return k.split(", ").map((p) => h("span", { class: "k-kbd" }, p));
    }

    function shortcuts(el) {
        const body = h("div", { class: "qs-sheet" }, GROUPS.map((g) => h("section", { class: "qs-group", "aria-label": g.title },
            h("h3", null, g.title, h("span", { class: "qs-src" }, g.src === VIEW ? "Graph view" : "App")),
            h("dl", { class: "qs-keys" }, g.keys.map(([k, what]) => [h("dt", null, kbd(k)), h("dd", null, what)])),
            g.open ? openQ(g.open) : null)));
        const foot = [
            h("span", { class: "k-secondary" }, "On a Mac, Ctrl is Cmd."),
            h("span", { class: "k-grow" }),
            openQ("Whether shortcuts can be changed, and where"),
            AB.button("Preferences...", { kind: "secondary", go: ["preferences", "general"] }),
            AB.button("Done", { onClick: () => AB.close() }),
        ];
        el.append(AB.modal({ title: "Keyboard shortcuts", body, foot, wide: true }));
    }

    // ---------- Find: the tree's search field; the Graph place draws its results ----------
    function find(el) {
        const tag = h("div", { class: "k-tooltip qs-pass", role: "note" },
            "Open question: whether Find also lists nodes by name, or leaves nodes to Quick actions and the table. ",
            AB.link("commands-and-search", "quick-actions", "Quick actions"));
        el.append(AB.position(tag, [...document.querySelectorAll(".gp-hit")].pop() || ".gp-find", "below-start"));
    }

    // ---------- keys this section owns ----------
    document.addEventListener("keydown", (e) => {
        const t = e.target;
        if (!AB.fx || document.body.dataset.page !== "app") return;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === "/") { e.preventDefault(); AB.go("commands-and-search", "find"); }
        else if (e.key === "?") { e.preventDefault(); AB.go("commands-and-search", "shortcuts"); }
    });

    registerSection({
        id: "commands-and-search",
        title: "Quick actions, Find and shortcuts",
        region: "overlay",
        rail: "graph",
        frame: (state) => (state === "find" ? { left: "graph-place/find" } : { left: "graph-place/at-rest" }),
        closeTo: "graph-place",
        states: [
            { id: "quick-actions", label: "Quick actions, empty" },
            { id: "quick-actions-results", label: "Quick actions, typed \"field\"" },
            { id: "find", label: "Find, row and note results" },
            { id: "shortcuts", label: "Keyboard shortcuts panel" },
        ],
        render(el, state) {
            if (state === "shortcuts") shortcuts(el);
            else if (state === "find") find(el);
            else quick(el, state === "quick-actions-results" ? "field" : "");
        },
    });
})();
