/* Quick actions (Ctrl+K), Find (/) and the keyboard shortcuts panel (?).
   Quick actions finds commands and places, grouped by their homes; a row's hint shows only when it teaches
   a place ("Place > Control"). Find (/) finds rows and notes: it is the tree's search field, so its state
   draws the Graph place's own Find results. The shortcuts panel lists graphty-element's canvas keys first,
   then the app's keys by home. This file also binds / for the skeleton (the shell binds ? and Ctrl+K).
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
.qs-foot { display: flex; align-items: center; gap: 12px; padding: 6px 16px 8px; font-size: 11px; color: var(--cm-text-secondary); border-top: 1px solid var(--cm-border); }
.qs-foot .k-kbd { margin-inline-end: 4px; }
.qs-none { padding: 8px 16px; color: var(--cm-text-secondary); }
.qs-sheet { column-count: 2; column-gap: 32px; padding: 4px 16px 0; }
.qs-group { break-inside: avoid; padding-bottom: 14px; }
.qs-group h3 { margin: 0 0 4px; font-size: 12px; font-weight: 600; }
.qs-canvas { margin: 0 16px 12px; padding: 8px 12px 0; border: 1px solid var(--cm-border); border-radius: 6px; }
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
@media (max-width: 1100px) { .qs-sheet { column-gap: 24px; } }
`;
    if (!document.getElementById("qs-css")) document.head.append(h("style", { id: "qs-css" }, CSS));

    // ---------- every command and place, grouped by its home ----------
    // A command with two or more doors comes from AB.cmd(), so its label, key, home and disabled reason
    // match every other door. g: group; aka: aliases the search also matches; off: why it is unavailable now.
    const NEEDS_SEL = "Needs a selection";
    const C = (id, g, ic, extra) => {
        const c = AB.cmd(id);
        return Object.assign({ g, icon: ic, name: c.label, key: c.shortcut, home: c.home, go: c.go, run: c.onClick, off: typeof c.disabled === "string" ? c.disabled : null }, extra || {});
    };
    const L = (g, ic, name, home, extra) => Object.assign({ g, icon: ic, name, home }, extra || {});
    const I = AB.ICON;
    const SETTINGS = [["you", "You"], ["privacy", "Privacy"], ["appearance", "Appearance"], ["accessibility", "Accessibility"],
        ["canvas-input", "Canvas input"], ["performance", "Performance"], ["assistant", "Assistant"], ["headset", "Headset"], ["projects", "Projects"]];
    const ALIASES = { appearance: ["theme", "dark mode"], performance: ["gpu", "webgpu"], accessibility: ["reduced motion", "single-key"] };
    const COMMANDS = [
        // Go to: places, and the parts of a place people ask for by name
        L("Go to", "network", "Graph", "Rail > Graph", { go: ["graph-place", "at-rest"], aka: ["tree", "layers", "rows", "results", "styles"] }),
        L("Go to", "database", "Data", "Rail > Data", { go: ["data-place", "at-rest"], aka: ["sources", "import", "files", "datasets"] }),
        L("Go to", "database", "Data: Attributes", "Data > Attributes", { go: ["data-place", "attributes"], aka: ["field", "fields", "columns", "properties"] }),
        L("Go to", I.filter, "Data: Filters", "Data > Filters", { go: ["data-place", "filters"], aka: ["filter"] }),
        L("Go to", I.view, "Views", "Rail > Views", { go: ["views-place", "at-rest"], aka: ["saved views", "cameras", "bookmarks"] }),
        ...AB.SAVED_VIEWS.map((v) => L("Go to", I.view, "Go to view: " + v, "Views > " + v, { go: ["inspector-saved-view", "view"], aka: ["view", "camera", "jump"] })),
        L("Go to", I.note, "Notes", "Rail > Notes", { go: ["notes-place", "all"], aka: ["comments", "annotations", "findings"] }),
        L("Go to", "bot", "Assistant", "Rail > Assistant", { go: ["assistant-place", "conversation"], aka: ["ai", "chat", "ask"] }),
        // Graph tree
        C("find", "Graph tree", "search", { aka: ["search"] }),
        C("rename", "Graph tree", "pencil", { run: () => AB.flash("Rename: select a row, then press F2") }),
        C("run-as-copy", "Graph tree", I.run, { aka: ["duplicate", "copy"] }),
        C("clear-graph-data", "Graph tree", "trash-2", { aka: ["reset", "clear results"] }),
        // Analyze
        C("analyze", "Analyze", "flask-conical", { aka: ["algorithm", "run", "statistics", "all algorithms"] }),
        L("Analyze", "chart-column", "PageRank", "Toolbar > Analyze", { go: ["analyze-popover", "essentials"], aka: ["importance", "influence"] }),
        L("Analyze", "group", "Louvain", "Toolbar > Analyze", { go: ["analyze-popover", "open"], aka: ["communities", "clusters", "modularity"] }),
        L("Analyze", "chart-column", "Betweenness", "Toolbar > Analyze", { go: ["analyze-popover", "open"], aka: ["brokers", "bridges", "centrality"] }),
        C("find-paths", "Analyze", "route", { aka: ["path", "route", "shortest", "connected"] }),
        // Data
        // the Data page's three doors come from AB.COMMANDS, so they open the same Data page states as every other door
        C("add-data", "Data", "file-plus", { aka: ["join", "import", "source", "paste data", "table", "link tables"] }),
        C("edit-source", "Data", "pencil", { aka: ["field", "fields", "columns", "roles", "key", "weight", "remap", "source"] }),
        C("replace-file", "Data", "file-plus", { aka: ["replace", "refresh", "update data", "new version"] }),
        L("Data", "plus", "New attribute...", "Data > Attributes +", { run: () => AB.flash("New attribute..."), aka: ["calculated field", "field", "expression", "formula", "computed column"] }),
        C("label-by", "Data", "tag", { aka: ["label", "caption", "field"] }),
        L("Data", "clock", "Time slider", "Table > Options > Time slider", { go: ["table-dock", "time-slider"], aka: ["time", "timeline", "date"] }),
        // View
        C("fit", "View", "scan", { aka: ["zoom to fit", "camera"] }),
        C("frame-selection", "View", "scan", { go: null, off: NEEDS_SEL, aka: ["zoom to selection", "camera"] }),
        L("View", "camera", "Front view", "Toolbar > View", { key: "1", go: ["view-flyout", "3d"], aka: ["camera", "standard view"] }),
        L("View", "camera", "Side view", "Toolbar > View", { key: "3", go: ["view-flyout", "3d"], aka: ["camera", "standard view"] }),
        L("View", "camera", "Top view", "Toolbar > View", { key: "7", go: ["view-flyout", "3d"], aka: ["camera", "standard view"] }),
        C("view-mode", "View", I.mode3d, { aka: ["2d", "3d", "dimension"] }),
        C("enter-vr", "View", "headset", { aka: ["headset", "immersive", "xr"] }),
        C("enter-ar", "View", "headset", { aka: ["headset", "immersive", "xr"] }),
        C("legend", "View", I.legend, { aka: ["key"] }),
        C("toggle-table", "View", "table", { aka: ["grid", "spreadsheet"] }),
        C("save-view", "View", I.view, { aka: ["camera", "bookmark", "snapshot"] }),
        C("present", "View", "play", { aka: ["slides", "slideshow", "presentation"] }),
        C("record-tour", "View", "camera", { aka: ["fly-through", "animation", "movie"] }),
        // Layout
        C("layout", "Layout", "pause", { aka: ["stop", "freeze", "settle", "continue", "unfreeze", "start"] }),
        C("rerun-layout", "Layout", "refresh-cw", { aka: ["untangle", "relayout", "arrange"] }),
        L("Layout", "refresh-cw", "Reshuffle layout seed", "Canvas menu > Reshuffle layout seed", { go: ["context-menus", "canvas"], aka: ["seed", "random"] }),
        L("Layout", "refresh-cw", "Unpin all", "Canvas menu > Unpin all", { go: ["context-menus", "canvas"], aka: ["pin", "pinned"] }),
        // Selection
        C("create-set", "Selection", I.set, { go: null, off: NEEDS_SEL, aka: ["group", "save selection"] }),
        C("neighborhood", "Selection", "network", { go: null, off: NEEDS_SEL, aka: ["neighbors", "ego", "hops"] }),
        C("hide-on-canvas", "Selection", I.hidden, { go: null, off: NEEDS_SEL }),
        C("show-hidden", "Selection", I.shown, { aka: ["unhide"] }),
        C("add-note", "Selection", I.note, { aka: ["comment", "annotate"] }),
        L("Selection", "scan", "Select all visible", "Canvas menu > Select all visible", { key: "Ctrl+A", go: ["inspector-selection-and-everything", "selection"] }),
        L("Selection", "scan", "Invert selection", "Canvas menu > Invert selection", { key: "I", run: () => AB.flash("Invert selection") }),
        C("reselect-previous", "Selection", "undo-2", { aka: ["previous selection"] }),
        L("Selection", "search", "Select where...", "Main menu > Select where", { go: ["select-where", "where"], aka: ["query", "select by", "by ids"] }),
        // Project
        // Open... is not in AB.COMMANDS; it goes where the main menu's Open... goes (the picked file lands on the Data page)
        L("Project", "folder-open", "Open...", "Main menu > Open", { key: "Ctrl+O", go: ["data-page", "edge-list"], aka: ["load", "file", "csv"] }),
        L("Project", "file", "Save", "Project menu > Save", { key: "Ctrl+S", run: () => AB.flash("Save") }),
        C("export", "Project", "download", { aka: ["save as", "svg", "download", "graphml", "csv", "png", "image", "video", "report"] }),
        L("Project", "sparkles", "Apply recipe or style file...", "Project menu > Apply recipe or style file", { go: ["recipe-apply", "binding"], aka: ["recipe", "template", "style file"] }),
        C("version-history", "Project", "history", { aka: ["history", "revisions"] }),
        C("undo", "Project", "undo-2", { run: () => AB.flash("Undo") }),
        C("redo", "Project", "redo-2", { run: () => AB.flash("Redo") }),
        // Settings and help
        C("settings", "Settings and help", "settings", { aka: ["preferences", "options"] }),
        ...SETTINGS.map(([id, n]) => L("Settings and help", "settings", "Settings: " + n, "Settings > " + n, { go: ["settings", id], aka: ["settings", "preferences"].concat(ALIASES[id] || []) })),
        C("shortcuts", "Settings and help", "keyboard", { aka: ["keys", "hotkeys"] }),
        L("Settings and help", "menu", "Main menu", "Header > Main menu", { go: ["main-menu", "open"], aka: ["menu", "file", "help"] }),
    ];
    const RECENT = ["Re-run layout", "PageRank", "Data: Attributes"];

    function matches(q) {
        const s = q.trim().toLowerCase();
        if (!s) return null;
        const out = [];
        COMMANDS.forEach((c) => {
            const byName = c.name.toLowerCase().includes(s);
            const alias = !byName && (c.aka || []).some((a) => a.includes(s) || (s.includes(a) && a.length > 3));
            if (byName || alias) out.push({ c, rank: c.name.toLowerCase().startsWith(s) ? 0 : byName ? 1 : 2 });
        });
        // keep the groups together, in the table's order; rank only orders rows within a group
        const order = [...new Set(COMMANDS.map((c) => c.g))];
        return out.sort((a, b) => order.indexOf(a.c.g) - order.indexOf(b.c.g) || a.rank - b.rank);
    }

    function hl(name, q) {
        const s = q.trim().toLowerCase(), i = s ? name.toLowerCase().indexOf(s) : -1;
        return i < 0 ? name : [name.slice(0, i), h("mark", null, name.slice(i, i + s.length)), name.slice(i + s.length)];
    }

    // The hint teaches a place ("Place > Control"); a disabled row says why instead.
    function resultRow(c, q) {
        const hint = c.off || (c.home && c.home.includes(" > ") ? c.home : null);
        const el = h("div", { class: "k-result", role: "option", "aria-selected": "false", "aria-disabled": c.off ? "true" : null },
            icon(c.icon), h("span", { class: "qs-name" }, hl(c.name, q)), hint ? h("span", { class: "qs-why" }, hint) : null,
            c.key ? h("span", { class: "k-kbd qs-key" }, c.key) : null);
        el._run = c.off ? () => AB.flash(c.name + ": " + c.off) : c.go ? () => AB.go(c.go[0], c.go[1]) : c.run;
        el.addEventListener("click", () => el._run());
        return el;
    }

    // Esc closes the palette and returns focus to the toolbar button that opened it.
    function closeToButton() {
        AB.close();
        setTimeout(() => { const b = document.querySelector("[data-tool='Quick actions']"); if (b) b.focus(); }, 0);
    }

    function quick(el, q0) {
        const input = h("input", { type: "text", role: "combobox", "aria-expanded": "true", "aria-controls": "qs-qlist", "aria-label": "Quick actions", placeholder: "Type a command or a place", value: q0 || null, autocomplete: "off" });
        const list = h("div", { class: "k-quick-list", id: "qs-qlist", role: "listbox", "aria-label": "Commands and places" });
        let at = 0;
        const rows = () => [...list.querySelectorAll(".k-result")];
        const mark = () => rows().forEach((r, i) => { r.setAttribute("aria-selected", String(i === at)); if (i === at) r.scrollIntoView({ block: "nearest" }); });
        const groups = (items, q) => { let g = null; items.forEach((c) => { if (c.g !== g) { g = c.g; list.append(h("div", { class: "qs-head" }, g)); } list.append(resultRow(c, q)); }); };

        function fill() {
            const q = input.value;
            list.replaceChildren();
            const hits = matches(q);
            if (!hits) {
                list.append(h("div", { class: "qs-head" }, "Recent"));
                RECENT.forEach((n) => list.append(resultRow(COMMANDS.find((c) => c.name === n), "")));
                groups(COMMANDS, "");
            } else {
                if (!hits.length) list.append(h("div", { class: "qs-none" }, 'No match for "' + q.trim() + '"'));
                groups(hits.map((x) => x.c), q);
                // the hand-off: Quick actions finds commands and places; rows and notes are Find's
                list.append(h("div", { class: "qs-head" }, "Rows and notes"));
                const find = h("div", { class: "k-result", role: "option", "aria-selected": "false" }, icon("search"), h("span", { class: "qs-name" }, 'Find "' + q.trim() + '"'), h("span", { class: "qs-why" }, AB.COMMANDS.find.home), h("span", { class: "k-kbd qs-key" }, "/"));
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
            else if (e.key === "Home") { e.preventDefault(); at = 0; mark(); }
            else if (e.key === "End") { e.preventDefault(); at = n - 1; mark(); }
            else if (e.key === "Enter") { e.preventDefault(); const r = rows()[at]; if (r) r._run(); }
            else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeToButton(); }
        });
        fill();

        const box = h("div", { class: "k-quick qs-quick", role: "dialog", "aria-modal": "true", "aria-label": "Quick actions" },
            h("div", { class: "k-quick-input" }, icon("search"), input),
            list,
            h("div", { class: "qs-foot" },
                h("span", null, h("span", { class: "k-kbd" }, "Up"), h("span", { class: "k-kbd" }, "Down"), "move"),
                h("span", null, h("span", { class: "k-kbd" }, "Enter"), "run"),
                h("span", null, h("span", { class: "k-kbd" }, "Esc"), "close")));
        el.append(AB.position(box, "[data-tool='Quick actions']", "above"));
        setTimeout(() => { input.focus(); const v = input.value; input.setSelectionRange(v.length, v.length); }, 0);
    }

    // ---------- the keyboard shortcuts panel ----------
    // graphty-element's own canvas keys first (OrbitInputController and TwoDInputController), marked not
    // changeable; then the app's keys by home. App keys never use W, A, S, D, Q, E, the arrows, = or -.
    const ELEMENT = [
        { title: "3D", keys: [["Arrows", "Orbit"], ["W, S", "Zoom in, zoom out"], ["A, D", "Spin"]] },
        { title: "2D", keys: [["W, A, S, D", "Pan"], ["Arrows", "Pan"], ["Q, E", "Rotate"], ["+, -", "Zoom in, zoom out"]] },
    ];
    const GROUPS = [
        { title: "Everywhere", keys: [
            ["Ctrl+K", "Quick actions: commands and places"],
            ["/", "Find rows and notes"],
            ["?", "These shortcuts"],
            ["Ctrl+Z", "Undo"], ["Ctrl+Shift+Z", "Redo"],
            ["Ctrl+O", "Open..."], ["Ctrl+S", "Save"], ["Ctrl+E", "Export..."], ["Ctrl+,", "Settings"],
            ["Esc", "Close one level. Never clears the selection"],
        ] },
        { title: "Toolbar", keys: [
            ["Shift+A", "Analyze"], ["Left, Right", "Move between toolbar buttons"], ["Alt+Down", "Open a button's flyout"],
        ] },
        { title: "View", keys: [
            ["0", "Fit"], ["F", "Frame selection"], ["1, 3, 7", "Front, side and top (3D only)"],
            ["5", "Switch between 2D and 3D"], ["L", "Show or hide the legend"],
        ] },
        { title: "Selection", keys: [
            ["Ctrl+G", "Create set"], ["P", "Path between"], ["Ctrl+Shift+H", "Hide on canvas"],
            ["N", "Add note"], ["Ctrl+A", "Select all visible"], ["I", "Invert selection"],
        ] },
        { title: "Tree", keys: [
            ["Up, Down", "Move between rows"], ["Home, End", "First or last row"], ["Left, Right", "Collapse or expand"],
            ["Enter", "Open the row in the inspector"], ["Space", "Show or hide the row's paint"], ["Alt+Space", "Show only this row"],
            ["F2", "Rename"], ["Ctrl+], Ctrl+[", "Move the row up or down"], ["Ctrl+Shift+L", "Lock or unlock the row"],
            ["Delete", "Delete (with Undo)"], ["Shift+F10", "Row menu"],
        ] },
        { title: "Panels", keys: [
            ["F6", "Next region: rail, panel, canvas, toolbar, table, inspector"], ["Shift+T", "Show or hide the table"],
        ] },
        { title: "Writing a note", keys: [
            ["Ctrl+Enter", "Save the note"], ["Esc", "Cancel"],
        ] },
    ];

    // "Ctrl+], Ctrl+[" -> two keycaps
    const kbd = (k) => k.split(", ").map((p) => h("span", { class: "k-kbd" }, p));
    const keyList = (keys) => h("dl", { class: "qs-keys" }, keys.map(([k, what]) => [h("dt", null, kbd(k)), h("dd", null, what)]));

    function shortcuts(el) {
        const fixed = h("span", { class: "k-chip qs-fixed" }, icon("lock", "sm"), "Not changeable");
        AB.tip(fixed, "graphty-element owns these keys", { label: false });
        const canvas = h("section", { class: "qs-canvas", "aria-label": "Canvas (graphty-element)" },
            h("h3", null, "Canvas (graphty-element)", fixed),
            h("p", { class: "qs-note" }, "Work when the canvas has focus. Drag orbits in 3D and pans in 2D; the wheel zooms."),
            h("div", { class: "qs-canvas-cols" }, ELEMENT.map((g) => h("div", { class: "qs-group" }, h("h4", null, g.title), keyList(g.keys)))));
        const app = h("div", { class: "qs-sheet" }, GROUPS.map((g) => h("section", { class: "qs-group", "aria-label": g.title }, h("h3", null, g.title), keyList(g.keys))));
        const body = h("div", null, canvas, h("h2", { class: "qs-apphead" }, "App keys"), app);
        const foot = [
            h("span", { class: "k-secondary" }, "On a Mac, Ctrl is Cmd. Single-letter app keys can be turned off in ",
                AB.link("settings", "accessibility", "Settings > Accessibility"), "."),
            h("span", { class: "k-grow" }),
            AB.openQuestion("Whether the app's own keys can be remapped"),
        ];
        el.append(AB.modal({ title: "Keyboard shortcuts", body, foot, wide: true }));
    }

    // ---------- Find's note results ----------
    // Find ("Jav") lists the notes whose text matches, after the rows. A note reads its time and its subject,
    // which every note carries; its author only when the project holds two or more named authors (a stand-in
    // for graphty-element's notes.authors()). Neither matching note has an author, which is the usual case:
    // a name exists only if the writer typed one in Settings. The Graph place draws the Rows part; this
    // replaces its Notes part with the notes from the Notes place's fixture that match.
    const FIND_NOTES = [
        { by: null, at: "Yesterday", about: "about Louvain", go: ["inspector-run-row", "data"],
            text: "Valjean and Javert land in the same community, with Marius and Cosette." },
        { by: null, at: "Sep 28", about: "about Valjean and Javert", go: ["inspector-several-elements", "two-nodes"],
            text: "Javert follows Valjean through the whole book. Check whether PageRank ranks them side by side." },
    ];
    function findNotes() {
        const head = [...document.querySelectorAll(".gp-find-head")].find((x) => x.textContent === "Notes");
        if (!head) return;
        while (head.nextElementSibling) head.nextElementSibling.remove();
        const mk = (s) => { const i = s.indexOf("Jav"); return [s.slice(0, i), h("mark", null, "Jav"), s.slice(i + 3)]; };
        FIND_NOTES.forEach((n) => {
            const sub = [n.by, n.at, n.about] /* this project has two named authors, so a set name would show */.filter(Boolean).join(", ");
            head.parentNode.append(h("div", Object.assign({ class: "gp-hit", role: "option" }, AB.act({ go: n.go })), icon(AB.ICON.note),
                h("span", { class: "gp-hit-text" }, mk(n.text.length > 60 ? n.text.slice(0, 57) + "..." : n.text), h("span", { class: "gp-hit-sub" }, sub))));
        });
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
            else if (state === "find") setTimeout(findNotes, 0); // the Graph place draws Find's field and rows
            else quick(el, { "quick-actions-results": "field", "quick-actions-views": "view", "quick-actions-layout": "layout", "quick-actions-settings": "settings" }[state] || "");
        },
    });
})();
