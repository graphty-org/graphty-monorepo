/* Main menu: the rail's top button. A dark menu (File, Edit, Settings..., Help), cascading to the
   right. It keeps only commands with no other home; Quick actions is the full index. The rule
   between the two top-left menus (studio decision): the main menu is the app (New, Open, Open
   recent, Apply a file, Edit, Settings, Help); the project-name menu is this project (Rename,
   Save, Save as, Export, Version history, file location, Close). Each state
   opens one submenu; Open recent has its own state for the third level; two Edit states show the
   selection-dependent items enabled.
   Only the overlay region is drawn; the frame underneath is the app at rest. Plain ASCII. */
(function () {
    const flash = (what) => () => AB.flash(what + " (not wired in the skeleton)");
    const cmd = AB.cmd;

    const RECENTS = [
        { name: "Mule ring review", when: "Today 09:14" },
        { name: "Knockdown screen, September", when: "Yesterday" },
        { name: "March transfers", when: "Sep 24" },
        { name: "Patent citations 1999-2001", when: "Sep 19" },
    ];

    // Top level: submenus by id, and Settings... which opens the dialog directly.
    const TOP = [
        { id: "file", label: "File" },
        { id: "edit", label: "Edit" },
        { id: "help", label: "Help" },
    ];

    function fileItems() {
        return [
            { label: "New project", go: ["graph-place", "empty"] },
            { label: "Open...", shortcut: "Ctrl+O", go: ["load-step", "preview"] },
            { label: "Open recent", sub: true, go: ["main-menu", "file-recent"] },
            { sep: true },
            { label: "Apply recipe or style file...", go: ["recipe-apply", "binding"] },
        ];
    }

    // state: "edit" (nothing selected), "edit-selection" (two nodes), "edit-hidden" (after Hide on canvas)
    function editItems(state) {
        const sel = state === "edit-selection" || state === "edit-hidden";
        const needs = (label, reason, extra) => (sel ? Object.assign({ label }, extra) : { label, desc: reason, disabled: true });
        return [
            cmd("undo", { onClick: flash("Undo") }),
            cmd("redo", { onClick: flash("Redo") }),
            { sep: true },
            { label: "Select all visible", shortcut: "Ctrl+A", onClick: flash("Select all visible") },
            { label: "Invert selection", shortcut: "I", onClick: flash("Invert selection") },
            { label: "Previous selection", onClick: flash("Previous selection") },
            needs("Select same value", "Needs a selection", { onClick: flash("Select same value") }),
            { label: "Select where...", go: ["select-where", "where"] },
            { label: "Select by ids...", go: ["select-where", "by-ids"] },
            state === "edit-selection"
                ? { label: "Select edges between", onClick: flash("Select edges between Valjean and Javert") }
                : { label: "Select edges between", desc: "Needs two or more nodes selected", disabled: true },
            needs("Copy ids", "Needs a selection", { onClick: () => AB.flash(state === "edit-selection" ? "Copied 2 ids" : "Copied 1 id") }),
            { sep: true },
            state === "edit-hidden"
                ? { label: AB.COMMANDS["show-hidden"].label, go: AB.COMMANDS["show-hidden"].go }
                : { label: AB.COMMANDS["show-hidden"].label, desc: "Nothing is hidden on the canvas", disabled: true },
        ];
    }

    function helpItems() {
        return [
            cmd("shortcuts"),
            { label: "Documentation", onClick: flash("Documentation") },
            { label: "Report a problem", onClick: flash("Report a problem") },
            { sep: true },
            { label: "About", onClick: flash("About") },
        ];
    }

    const recentItems = () => [
        ...RECENTS.map((r) => ({ label: r.name, desc: r.when, onClick: flash("Open " + r.name) })),
        { sep: true },
        { label: "Show start screen", go: ["start-screen", "returning"] },
    ];

    const parentOf = (state) => (state === "file-recent" ? "file" : state.startsWith("edit") ? "edit" : state);
    const itemsOf = (open, state) => (open === "file" ? fileItems() : open === "edit" ? editItems(state) : helpItems());

    const openQ = (text) => h("div", { class: "main-oq", style: "position:absolute;max-width:260px;pointer-events:none;background:var(--cm-bg) !important", role: "note" }, "Open question: " + text);

    // The Nth real item (not a separator or heading) of a menu element
    const nth = (menuEl, items, i) => menuEl.querySelectorAll(".k-menu-item")[items.slice(0, i).filter((it) => !it.sep && !it.heading).length];
    const hover = (it) => { if (it) { it.dataset.hover = ""; it.setAttribute("aria-expanded", "true"); } };

    function draw(el, state) {
        el.replaceChildren();
        if (state === "closed") {
            // At rest: nothing open; the rail button's tooltip is the only trace.
            el.append(AB.position(h("div", { class: "k-tooltip", style: "position:absolute;pointer-events:none" }, "Main menu"), "#ab-rail-menu", "right-start"));
            return;
        }
        const open = parentOf(state);
        const topItems = [
            { label: "File", sub: true, go: ["main-menu", "file"] },
            { label: "Edit", sub: true, go: ["main-menu", "edit"] },
            cmd("settings"),
            { sep: true },
            { label: "Help", sub: true, go: ["main-menu", "help"] },
        ];
        const top = AB.menu({ anchor: "#ab-rail-menu", place: "right-start", items: topItems });
        top.setAttribute("aria-label", "Main menu");
        el.append(top);
        const openItem = nth(top, topItems, topItems.findIndex((t) => t.go && t.go[1] === open));
        hover(openItem);

        const items = itemsOf(open, state);
        const second = AB.menu({ anchor: openItem, place: "right-start", items });
        second.setAttribute("aria-label", TOP.find((t) => t.id === open).label);
        second.style.marginTop = "-8px"; // line the first item up with its parent item
        el.append(second);

        if (state === "file-recent") {
            const anchorItem = nth(second, items, items.findIndex((it) => it.go && it.go[1] === "file-recent"));
            hover(anchorItem);
            const m3 = AB.menu({ anchor: anchorItem, place: "right-start", items: recentItems() });
            m3.setAttribute("aria-label", "Open recent");
            m3.style.marginTop = "-8px";
            el.append(m3);
        }
        if (state === "edit-selection") {
            el.append(AB.position(openQ("Select same value: which attribute it matches on when the selected nodes differ"), second, "below-start"));
        }
    }

    const STATES = ["file", "edit", "edit-selection", "edit-hidden", "help", "file-recent", "closed"];

    registerSection({
        id: "main-menu",
        title: "Main menu",
        region: "overlay",
        rail: "graph",
        frame: (state) => (state === "edit-selection"
            ? { left: "graph-place/at-rest", right: "inspector-several-elements/two-nodes", toolbar: "selection-bar/two-nodes" }
            : state === "edit-hidden"
                ? { left: "graph-place/at-rest", toolbar: "selection-bar/hidden" }
                : { left: "graph-place/at-rest" }),
        closeTo: "graph-place",
        states: [
            { id: "file", label: "File" },
            { id: "edit", label: "Edit, nothing selected" },
            { id: "edit-selection", label: "Edit, two nodes selected" },
            { id: "edit-hidden", label: "Edit, after Hide on canvas" },
            { id: "help", label: "Help" },
            { id: "file-recent", label: "File, Open recent" },
            { id: "closed", label: "Closed" },
        ],
        render(el, state) {
            // Old links (view, analyze, recipes, analyze-*) land on File.
            draw(el, STATES.includes(state) ? state : "file");
        },
    });
})();
