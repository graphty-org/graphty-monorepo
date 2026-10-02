/* Main menu: the header button left of the project name. One dark menu, one level, four groups:
   New project, Open recent > | the File list (AB.fileList(): Open project or file..., Save,
   Export..., Apply recipe or style file..., Version history -- the same words as the project-name
   menu) | Select where..., Select edges between, Show hidden elements | Settings..., Keyboard
   shortcuts, Help >. Only Open recent and Help cascade. The main menu is the app; the project-name
   menu is this project. Open project or file... is the one intake: a data file lands on the Data
   page, a recipe or style file opens the Apply file dialog, a project file opens in place of this
   one. The open-file state stands in for the system file picker with one file of each kind.
   Undo and Redo have the header buttons; Select all, Invert and Reselect previous live in the
   canvas menu; Copy ids lives in the several-elements menu; Select by ids is a tab of Select where.
   Only the overlay region is drawn; the frame underneath is the app at rest. Plain ASCII. */
(function () {
    const flash = (what) => () => AB.flash(what + " (not available yet)");
    const cmd = AB.cmd;

    // The start screen's recent projects, opening where its rows open
    const RECENTS = [
        { name: "Mule ring review", when: "Today 09:14", dataset: "transactions" },
        { name: "Knockdown screen, September", when: "Yesterday" },
        { name: "March transfers", when: "Sep 24", dataset: "transactions" },
        { name: "Patent citations 1999-2001", when: "Sep 19", go: ["canvas-and-states", "refused-project"] },
    ];

    function showHidden() {
        const names = [...AB.hiddenOnCanvas];
        AB.hiddenOnCanvas.clear();
        const to = cmd("show-hidden").go;
        AB.go(to[0], to[1]);
        AB.announce(names.join(", ") + " shown on canvas");
    }

    function topItems(state) {
        return [
            { label: "New project", go: ["graph-place", "empty"] },
            { label: "Open recent", sub: true, go: ["main-menu", "open-recent"] },
            { sep: true },
            ...AB.fileList(),
            { sep: true },
            cmd("select-where"),
            state === "two-selected"
                ? { label: "Select edges between", onClick: () => AB.flash("Selected 1 edge between Valjean and Javert") }
                : { label: "Select edges between", disabled: "Needs two or more nodes selected" },
            // Show hidden elements empties the hidden set (selection-bar's AB.hiddenOnCanvas) before it
            // lands, so the tree footer and the canvas draw everything again
            AB.hiddenOnCanvas && AB.hiddenOnCanvas.size
                ? cmd("show-hidden", { go: undefined, onClick: showHidden })
                : cmd("show-hidden", { disabled: "Nothing is hidden on the canvas" }),
            { sep: true },
            cmd("settings"),
            cmd("shortcuts"),
            { label: "Help", sub: true, go: ["main-menu", "help"] },
        ];
    }

    const SUBS = {
        // Stand-in for the system file picker: the file's kind decides where it goes
        "open-file": {
            label: "Choose a file",
            // the recipe and style files are the ones handed for the project on screen (the Data place's Sources + lists the same)
            items: () => [
                { heading: "Choose a file" },
                { label: "transfers-2026-04.csv", desc: "Data file: opens on the Data page", go: ["data-page", "edge-list"] },
                ...((AB.route && AB.route.frame.dataset) === "wide"
                    ? [{ label: "estate-exposure-review.graphty", desc: "Recipe: opens the Apply file dialog over this project", go: ["recipe-apply", "wide-mismatch"] }]
                    : [{ label: "mule-ring-triage.graphty", desc: "Recipe: opens the Apply file dialog over this project", go: ["recipe-apply", "binding"] },
                        { label: "risk-review-look.json", desc: "Style file: opens the Apply file dialog over this project", go: ["recipe-apply", "style-unbound"] }]),
                { label: "March transfers.graphty", desc: "Project file: opens in place of this project", onClick: flash("Open March transfers") },
            ],
        },
        "open-recent": {
            label: "Open recent",
            items: () => RECENTS.map((r) => ({ label: r.name, desc: r.when, ...(r.go ? { go: r.go } : r.dataset ? { go: ["graph-place", AB.placeOf(r.dataset, "graph")] } : { onClick: flash("Open " + r.name) }) })),
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

    const STATES = ["open", "open-file", "open-recent", "help", "two-selected", "after-hide"];

    registerSection({
        id: "main-menu",
        title: "Main menu",
        region: "overlay",
        rail: "graph",
        frame: (state) => (state === "two-selected"
            ? { left: "graph-place/at-rest", right: "inspector-several-elements/two-nodes" }
            : state === "after-hide"
                // Valjean was selected and hidden: the bar and the inspector keep him, and the hidden set names him
                ? { left: "graph-place/at-rest", right: "inspector-node/why-this-look", toolbar: "selection-bar/hidden" }
                : { left: "graph-place/at-rest" }),
        closeTo: "graph-place",
        states: [
            { id: "open", label: "Open" },
            { id: "open-file", label: "Open project or file...: a data, recipe, style or project file" },
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
