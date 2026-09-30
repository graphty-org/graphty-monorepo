/* Quick actions (Ctrl+K), Find (/) and the keyboard shortcuts panel (?).
   Quick actions lists every command by name, grouped, each with its key; typing filters by name and by alias
   ("field" and "calculated field" reach New attribute...). Find lives in the tree's search field, so its state
   draws the Graph place's own Find results (rows, then notes) underneath. The shortcuts panel groups the graph
   view's keys (graphty-element) and the app's by region. This file also binds / for the skeleton (the shell binds ?).
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
.qs-canvas { margin: 0 16px 12px; padding: 8px 12px 0; border: 1px solid var(--cm-border); border-radius: 6px; background: var(--cm-bg-secondary, transparent); }
.qs-canvas h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 2px; font-size: 12px; font-weight: 600; }
.qs-fixed { gap: 4px; font-weight: 400; }
.qs-note { margin: 0 0 6px; color: var(--cm-text-secondary); font-size: 11px; }
.qs-canvas-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; }
.qs-canvas h4, .qs-apphead { margin: 0 0 4px; font-size: 11px; font-weight: 550; color: var(--cm-text-secondary); }
.qs-apphead { padding: 0 16px 4px; font-size: 12px; }
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
    // Each entry names its home: the one place the command lives (Quick actions is a door, never a home).
    // Entries with two or more doors come from AB.COMMANDS, so label, key, home and disabled reason match
    // every other door. g: group; aka: aliases search also matches; off: why it is unavailable right now.
    const NEEDS_SEL = "Needs a selection";
    const C = (id, g, ic, extra) => {
        const c = AB.COMMANDS[id];
        return Object.assign({ g, icon: ic, name: c.label, key: c.shortcut, home: c.home, go: c.go, run: c.onClick, off: c.disabledReason }, extra || {});
    };
    const L = (g, ic, name, home, extra) => Object.assign({ g, icon: ic, name, home }, extra || {});
    const VIEWS = AB.SAVED_VIEWS;
    const SETTINGS = [["you", "You"], ["privacy", "Privacy"], ["appearance", "Appearance"], ["accessibility", "Accessibility"], ["canvas-input", "Canvas input"],
        ["performance", "Performance"], ["assistant", "Assistant"], ["headset", "Headset"], ["keyboard", "Keyboard"], ["projects", "Projects"]];
    const COMMANDS = [
        // places, and the parts of a place people ask for by name
        L("Go to", "network", "Graph", "Rail > Graph", { go: ["graph-place", "at-rest"], aka: ["tree", "layers", "rows", "results", "styles"] }),
        L("Go to", "database", "Data", "Rail > Data", { go: ["data-place", "at-rest"], aka: ["sources", "import", "files", "datasets"] }),
        L("Go to", "database", "Data: Attributes", "Data > Attributes", { go: ["data-place", "attributes"], aka: ["field", "fields", "columns", "properties"] }),
        L("Go to", "funnel", "Data: Filters", "Data > Filters", { go: ["data-place", "filters"], aka: ["filter"] }),
        L("Go to", "history", "Data: Versions", "Data > Versions", { go: ["data-place", "versions"], aka: ["refresh", "replace"] }),
        L("Go to", "bookmark", "Views", "Rail > Views", { go: ["views-place", "at-rest"], aka: ["saved views", "cameras", "bookmarks"] }),
        ...VIEWS.map((v) => L("Go to", "camera", "Go to view: " + v, "Views > " + v, { go: ["inspector-saved-view", "view"], aka: ["view", "camera", "jump"] })),
        L("Go to", "message-square", "Notes", "Rail > Notes", { go: ["notes-place", "all"], aka: ["comments", "annotations", "findings"] }),
        L("Go to", "bot", "Assistant", "Rail > Assistant", { go: ["assistant-place", "conversation"], aka: ["ai", "chat", "ask"] }),
        // making things
        C("analyze", "Analyze", "flask-conical", { aka: ["algorithm", "run", "statistics"] }),
        L("Analyze", "chart-column", "PageRank", "Toolbar > Analyze > Rank", { go: ["analyze-popover", "essentials"], aka: ["importance", "influence"] }),
        L("Analyze", "group", "Louvain", "Toolbar > Analyze > Find groups", { go: ["analyze-popover", "open"], aka: ["communities", "clusters", "modularity"] }),
        L("Analyze", "chart-column", "Betweenness", "Toolbar > Analyze > Rank", { go: ["analyze-popover", "open"], aka: ["brokers", "bridges", "centrality"] }),
        L("Analyze", "flask-conical", "All algorithms...", "Toolbar > Analyze > All", { go: ["analyze-popover", "all-algorithms"] }),
        C("find-paths", "Analyze", "route", { aka: ["path", "route", "shortest", "connected"] }),
        L("Analyze", "plus", "New attribute...", "Data > Attributes +", { run: flash("New attribute..."), aka: ["calculated field", "field", "expression", "formula", "computed column"] }),
        // camera and view
        C("view-mode", "Camera and view", "box", { aka: ["2d", "3d", "dimension"] }),
        C("enter-vr", "Camera and view", "headset", { aka: ["headset", "immersive", "xr"] }),
        C("enter-ar", "Camera and view", "headset", { aka: ["headset", "immersive", "xr"] }),
        C("fit", "Camera and view", "scan", { aka: ["zoom to fit", "camera"] }),
        C("frame-selection", "Camera and view", "scan", { go: null, off: NEEDS_SEL, aka: ["zoom to selection", "camera"] }),
        C("reset-camera", "Camera and view", "crosshair", { aka: ["camera", "home"] }),
        L("Camera and view", "camera", "Front view", "Camera menu", { key: "1", go: ["camera-menu", "3d"], aka: ["camera", "built-in view"] }),
        L("Camera and view", "camera", "Side view", "Camera menu", { key: "3", go: ["camera-menu", "3d"], aka: ["camera", "built-in view"] }),
        L("Camera and view", "camera", "Top view", "Camera menu", { key: "7", go: ["camera-menu", "3d"], aka: ["camera", "built-in view"] }),
        C("save-view", "Camera and view", "bookmark-plus", { aka: ["camera", "bookmark", "snapshot"] }),
        C("present", "Camera and view", "play", { aka: ["slides", "slideshow", "presentation"] }),
        C("record-tour", "Camera and view", "camera", { aka: ["fly-through", "animation", "movie"] }),
        C("toggle-table", "Camera and view", "table", { aka: ["grid", "spreadsheet"] }),
        C("legend", "Camera and view", "layers", { go: ["canvas-and-states", "drawn"], aka: ["key"] }),
        L("Camera and view", "panel-left", "Toggle panels", "Keys only (no state to show)", { key: "Ctrl+B", run: flash("Toggle panels") }),
        // layout
        C("pause-layout", "Layout", "pause", { aka: ["stop", "freeze", "settle"] }),
        L("Layout", "play", "Resume layout", "Layout chip", { go: ["canvas-and-states", "drawn"], aka: ["continue", "unfreeze", "start"] }),
        C("rerun-layout", "Layout", "refresh-cw", { aka: ["untangle", "relayout", "arrange", "layout"] }),
        L("Layout", "layers", "Lay out members...", "Selection menu", { off: NEEDS_SEL, aka: ["layout"] }),
        // selection and edit
        C("create-set", "Selection and edit", "group", { go: null, off: NEEDS_SEL, aka: ["group", "save selection"] }),
        C("neighborhood", "Selection and edit", "network", { go: null, off: NEEDS_SEL, aka: ["neighbors", "ego", "hops"] }),
        L("Selection and edit", "funnel", "Filter to neighbors", "Node menu", { off: NEEDS_SEL, aka: ["neighbors"] }),
        C("hide-on-canvas", "Selection and edit", "eye-off", { go: null, off: NEEDS_SEL }),
        C("add-note", "Selection and edit", "sticky-note", { aka: ["comment", "annotate"] }),
        L("Selection and edit", "scan", "Select all visible", "Main menu > Edit", { key: "Ctrl+A", run: flash("Select all visible") }),
        L("Selection and edit", "scan", "Invert selection", "Main menu > Edit", { key: "I", run: flash("Invert selection") }),
        L("Selection and edit", "search", "Select where...", "Main menu > Edit", { go: ["select-where", "where"], aka: ["query", "select by", "by ids"] }),
        C("find", "Selection and edit", "search", { aka: ["search"] }),
        C("rename", "Selection and edit", "pencil", { run: () => AB.go("graph-place", "rename") }),
        C("undo", "Selection and edit", "undo-2", { run: flash("Undo") }),
        C("redo", "Selection and edit", "redo-2", { run: flash("Redo") }),
        // file and project
        L("File and project", "folder-open", "Open...", "Main menu > File", { key: "Ctrl+O", go: ["load-step", "preview"] }),
        L("File and project", "file", "Save", "Project menu", { key: "Ctrl+S", run: flash("Save") }),
        C("add-data", "File and project", "file-plus", { aka: ["join", "import", "source", "paste data"] }),
        C("export", "File and project", "download", { aka: ["save as", "svg", "download", "graphml", "csv"] }),
        C("export-image", "File and project", "download", { aka: ["png", "screenshot", "picture"] }),
        C("export-video", "File and project", "download", { aka: ["movie", "mp4", "webm", "recording"] }),
        L("File and project", "book-open", "Export findings report...", "Export dialog > Findings report", { go: ["export-dialog", "findings-report"], aka: ["report", "case file"] }),
        L("File and project", "sparkles", "Apply recipe or style file...", "Main menu > File", { go: ["recipe-apply", "binding"], aka: ["recipe", "template", "style file"] }),
        C("version-history", "File and project", "history", { aka: ["undo history", "history", "revisions"] }),
        // Settings and help
        C("settings", "Settings and help", "settings", { aka: ["preferences", "options"] }),
        ...SETTINGS.map(([id, n]) => L("Settings and help", "settings", "Settings: " + n, "Settings > " + n, { go: ["settings", id], aka: ["settings", "preferences"].concat(id === "appearance" ? ["theme", "dark mode", "toolbar labels"] : id === "performance" ? ["gpu", "webgpu"] : id === "accessibility" ? ["reduced motion", "single-key"] : []) })),
        C("shortcuts", "Settings and help", "keyboard", { aka: ["keys", "hotkeys"] }),
        L("Settings and help", "menu", "Main menu", "Rail > Main menu", { go: ["main-menu", "file"], aka: ["menu", "file", "edit", "help"] }),
    ];
    const RECENT = ["Re-run layout", "PageRank", "Data: Attributes"];

    function matches(q) {
        const s = q.trim().toLowerCase();
        if (!s) return null;
        const out = [];
        COMMANDS.forEach((c) => {
            const byName = c.name.toLowerCase().includes(s);
            const alias = byName ? null : (c.aka || []).find((a) => a.includes(s) || (s.includes(a) && a.length > 3));
            if (byName || alias) out.push({ c, alias, rank: c.name.toLowerCase().startsWith(s) ? 0 : byName ? 1 : 2 });
        });
        return out.sort((a, b) => a.rank - b.rank);
    }

    function hl(name, q) {
        const s = q.trim().toLowerCase(), i = s ? name.toLowerCase().indexOf(s) : -1;
        return i < 0 ? name : [name.slice(0, i), h("mark", null, name.slice(i, i + s.length)), name.slice(i + s.length)];
    }

    function resultRow(c, q, alias) {
        const why = c.off ? c.off : (alias ? "Also called " + alias + ". " : "") + c.home;
        const attrs = { class: "k-result", role: "option", "aria-selected": "false", "aria-disabled": c.off ? "true" : null, title: c.off ? c.name + ": " + c.off : null };
        const el = h("div", attrs, icon(c.icon), h("span", { class: "qs-name" }, hl(c.name, q)), why ? h("span", { class: "qs-why" }, why) : null, c.key ? h("span", { class: "k-kbd qs-key" }, c.key) : null);
        el._run = c.off ? () => AB.flash(c.name + ": " + c.off) : c.go ? () => AB.go(c.go[0], c.go[1]) : c.run;
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
    // graphty-element's own canvas keys first, marked not changeable (the element publishes no keymap);
    // then the app's keys by region. App keys never use W, A, S, D, Q, E, the arrows, = or -.
    const ELEMENT = [
        { title: "3D", keys: [["Arrows", "Orbit"], ["W, S", "Zoom in, zoom out"], ["A, D", "Spin"]] },
        { title: "2D", keys: [["W, A, S, D", "Pan"], ["Arrows", "Pan"], ["Q, E", "Rotate"], ["+, -", "Zoom in, zoom out"]] },
    ];
    const GROUPS = [
        { title: "Everywhere", keys: [
            ["Ctrl+K", "Quick actions: every command by name"],
            ["/", "Find rows and notes"],
            ["?", "These shortcuts"],
            ["F6", "Next region: panels, canvas, toolbar, table"],
            ["Ctrl+Z", "Undo"], ["Ctrl+Shift+Z", "Redo"],
            ["Ctrl+B", "Show or hide the side panels"],
            ["Ctrl+O", "Open..."], ["Ctrl+S", "Save"], ["Ctrl+E", "Export..."], ["Ctrl+,", "Settings"],
            ["Esc", "Disarm a tool, then close a bar or menu. Never clears the selection"],
        ] },
        { title: "Toolbar", keys: [
            ["V", "Select"], ["Shift+A", "Analyze"], ["5", "Switch between 2D and 3D"],
            ["Left, Right", "Move between toolbar buttons"], ["Alt+Down", "Open a button's flyout"],
        ] },
        { title: "Selection", keys: [
            ["Ctrl+G", "Create set"], ["G", "Neighborhood"], ["Ctrl+Shift+H", "Hide on canvas"],
            ["N", "Add note"], ["Ctrl+A", "Select all visible"], ["I", "Invert selection"],
        ] },
        { title: "Paths", keys: [
            ["P", "Find paths: click From, then To"], ["Enter", "Run with the settings shown"], ["Esc", "Back one level; again, close"],
        ] },
        { title: "Camera menu", keys: [
            ["0", "Fit the graph"], ["F", "Frame the selection"], ["Shift+0", "Reset the camera"],
            ["1, 3, 7", "Front, side and top (3D only)"], ["L", "Show or hide the legend"],
        ] },
        { title: "Walking the graph", open: "Whether graphty-element ships these walk keys as its own defaults, or the app binds them", keys: [
            ["Shift+Down", "Into this node's neighbors"], ["Shift+Left, Shift+Right", "Previous or next neighbor"],
            ["Shift+Up", "Back one step"], ["Space", "Add this node to the selection, or remove it"], ["], [", "Next or previous member of this node's set"],
        ] },
        { title: "Tree", keys: [
            ["Up, Down", "Move between rows"], ["Home, End", "First or last row"], ["Left, Right", "Collapse or expand; Left from a child goes to its parent"], ["Space", "Show or hide the row's paint"],
            ["Alt+click eye, Alt+Space", "Show only this row"], ["Enter", "Open the row in the inspector"], ["Shift+F10", "Row menu"],
            ["Shift+click, Ctrl+click", "Select several rows"], ["Double-click, F2", "Rename"],
        ] },
        { title: "Table and time", keys: [
            ["Shift+T", "Show or hide the table"], ["T", "Time slider (a graph with a time attribute)"],
        ] },
        { title: "Writing a note", keys: [
            ["Ctrl+Enter", "Save the note"], ["Esc", "Cancel"],
        ] },
    ];

    function kbd(k) {
        // "Shift+click, Ctrl+click" -> two keycaps; "], [" -> two keycaps
        return k.split(", ").map((p) => h("span", { class: "k-kbd" }, p));
    }
    const keyList = (keys) => h("dl", { class: "qs-keys" }, keys.map(([k, what]) => [h("dt", null, kbd(k)), h("dd", null, what)]));

    function shortcuts(el) {
        const canvas = h("section", { class: "qs-canvas", "aria-label": "Canvas (graphty-element)" },
            h("h3", null, "Canvas (graphty-element)", h("span", { class: "k-chip qs-fixed", title: "graphty-element owns these keys and publishes no keymap, so they cannot be changed here" }, icon("lock", "sm"), "Not changeable")),
            h("p", { class: "qs-note" }, "Work when the canvas has focus. Plain drag orbits in 3D and pans in 2D; the wheel zooms."),
            h("div", { class: "qs-canvas-cols" }, ELEMENT.map((g) => h("div", { class: "qs-group" }, h("h4", null, g.title), keyList(g.keys)))));
        const app = h("div", { class: "qs-sheet" }, GROUPS.map((g) => h("section", { class: "qs-group", "aria-label": g.title },
            h("h3", null, g.title), keyList(g.keys), g.open ? openQ(g.open) : null)));
        const body = h("div", null, canvas, h("h2", { class: "qs-apphead" }, "App keys, by region"), app);
        const foot = [
            h("span", { class: "k-secondary" }, "On a Mac, Ctrl is Cmd. Single-letter app keys can be turned off in ",
                AB.link("settings", "accessibility", "Settings > Accessibility"), "."),
            h("span", { class: "k-grow" }),
            openQ("Whether the app's own keys can be remapped"),
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
            { id: "quick-actions-views", label: "Quick actions, typed \"view\"" },
            { id: "quick-actions-layout", label: "Quick actions, typed \"layout\"" },
            { id: "quick-actions-settings", label: "Quick actions, typed \"settings\"" },
            { id: "find", label: "Find, row and note results" },
            { id: "shortcuts", label: "Keyboard shortcuts panel" },
        ],
        render(el, state) {
            if (state === "shortcuts") shortcuts(el);
            else if (state === "find") find(el);
            else quick(el, { "quick-actions-results": "field", "quick-actions-views": "view", "quick-actions-layout": "layout", "quick-actions-settings": "settings" }[state] || "");
        },
    });
})();
