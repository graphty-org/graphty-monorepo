/* Main menu: the header button left of the project name. One dark menu, one level, three groups:
   New project, Open..., Open recent > | Select where..., Select edges between, Show hidden elements
   | Settings..., Keyboard shortcuts, Help >. Only Open recent and Help cascade. The main menu is the
   app; the project-name menu is this project (Apply recipe or style file lives there now).
   Undo and Redo have the header buttons; Select all, Invert and Reselect previous live in the
   canvas menu; Copy ids lives in the several-elements menu; Select by ids is a tab of Select where.
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

    function topItems(state) {
        const hidden = AB.COMMANDS["show-hidden"];
        return [
            { label: "New project", go: ["graph-place", "empty"] },
            { label: "Open...", shortcut: "Ctrl+O", go: ["data-page", "edge-list"] }, // the picked file lands on the Data page
            { label: "Open recent", sub: true, go: ["main-menu", "open-recent"] },
            { sep: true },
            { label: "Select where...", go: ["select-where", "where"] },
            state === "two-selected"
                ? { label: "Select edges between", onClick: () => AB.flash("Selected 1 edge between Valjean and Javert") }
                : { label: "Select edges between", disabled: "Needs two or more nodes selected" },
            state === "after-hide"
                ? { label: hidden.label, go: hidden.go }
                : { label: hidden.label, disabled: "Nothing is hidden on the canvas" },
            { sep: true },
            cmd("settings"),
            cmd("shortcuts"),
            { label: "Help", sub: true, go: ["main-menu", "help"] },
        ];
    }

    const SUBS = {
        "open-recent": {
            label: "Open recent",
            items: () => RECENTS.map((r) => ({ label: r.name, desc: r.when, onClick: flash("Open " + r.name) })),
        },
        help: {
            label: "Help",
            items: () => [
                { label: "Documentation", onClick: flash("Documentation") },
                { label: "Report a problem", onClick: flash("Report a problem") },
                { sep: true },
                { label: "About", onClick: flash("About") },
            ],
        },
    };

    // The Nth real item (not a separator or heading) of a menu element
    const nth = (menuEl, items, i) => menuEl.querySelectorAll(".k-menu-item")[items.slice(0, i).filter((it) => !it.sep && !it.heading).length];

    function draw(el, state) {
        el.replaceChildren();
        const items = topItems(state);
        const top = AB.menu({ anchor: "#ab-rail-menu", place: "below-start", label: "Main menu", items });
        el.append(top);

        const sub = SUBS[state];
        if (!sub) return;
        const parent = nth(top, items, items.findIndex((it) => it.go && it.go[1] === state));
        parent.dataset.hover = "";
        parent.setAttribute("aria-expanded", "true");
        const m2 = AB.menu({ anchor: parent, place: "right-start", label: sub.label, items: sub.items(), back: ["main-menu", "open"] });
        m2.style.marginTop = "-8px"; // line the first item up with its parent item
        el.append(m2);
    }

    const STATES = ["open", "open-recent", "help", "two-selected", "after-hide"];

    registerSection({
        id: "main-menu",
        title: "Main menu",
        region: "overlay",
        rail: "graph",
        frame: (state) => (state === "two-selected"
            ? { left: "graph-place/at-rest", right: "inspector-several-elements/two-nodes" }
            : state === "after-hide"
                ? { left: "graph-place/at-rest", toolbar: "selection-bar/hidden" }
                : { left: "graph-place/at-rest" }),
        closeTo: "graph-place",
        states: [
            { id: "open", label: "Open" },
            { id: "open-recent", label: "Open recent" },
            { id: "help", label: "Help" },
            { id: "two-selected", label: "Two nodes selected (Select edges between on)" },
            { id: "after-hide", label: "After Hide on canvas (Show hidden elements on)" },
        ],
        render(el, state) {
            // Old links (file, edit, edit-selection, file-recent, ...) land on the open menu.
            draw(el, STATES.includes(state) ? state : "open");
        },
    });
})();
