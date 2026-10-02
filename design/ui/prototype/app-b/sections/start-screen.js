/* Start screen and the usage-data opt-in. Shown when no project is open. Plain ASCII.
   Layout: a header line (name, privacy line, Settings gear), three columns (two ways in and a
   drop hint, recent projects, samples), and on first launch a non-blocking usage-data card at the
   foot. New from data... and a drop open the Data page; URL and Paste are its "+" choices, so
   they have no row here.
   Design note (not on the screen): connectors (databases, APIs) wait until graphty-element can
   load from them.
   Styles: start-screen.css, loaded below (section-local, not shared). */
(function () {
    if (!document.querySelector("link[data-ss-css]")) {
        document.head.append(h("link", { rel: "stylesheet", href: "sections/start-screen.css", "data-ss-css": "" }));
    }

    // Samples: the fixtures' datasets, each with one line on what it is good for.
    const SAMPLES = [
        { key: "lesmis", name: "Les Miserables", size: (d) => d.nodes + " characters", pic: "lesmis-plain", good: "Characters who share a chapter of the novel. Good for a first look at communities and who holds the story together." },
        { key: "karate", name: "Zachary's karate club", size: (d) => d.nodes + " members", pic: "karate-plain", good: "A club that split in two, with the split recorded. Good for checking whether a community measure finds it." },
        { key: "ppi", name: "Protein interactions", size: (d) => d.nodes + " proteins", pic: "ppi-plain", good: "Human proteins and the interactions between them. Good for hubs and the paths that link two proteins." },
        { key: "transactions", name: "Card and transfer transactions", size: (d) => d.nodes.toLocaleString("en-US") + " accounts", pic: "transactions-plain", good: "A month of money moving between accounts. Good for following money, finding rings and comparing months." },
        // Two data files, not graph files: each opens on the Data page, where its tables are reviewed before Load
        { key: "wide", name: "IT estate (wide tables)", size: (d) => d.nodes + " hosts, 69 columns", go: ["data-page", "wide-hosts"], good: "Hosts and their connections, with dozens of columns each. Good for finding the few columns that matter." },
        { key: "nested", name: "Research network (nested JSON)", size: (d) => d.recordArrays["data.researchers[]"] + " researchers", go: ["data-page", "json-tree"], good: "One API response: records inside records, lists of ids and lists of records. Good for choosing what becomes a node, an edge or a value." },
    ];

    // Recent projects, newest first (sizes from the fixtures' datasets). `path` is where the project
    // file was saved; Recent remembers it in this browser.
    const RECENTS = [
        { name: "Mule ring review", size: "3,093 accounts", path: "~/Documents/graphty/Mule ring review.graphty", when: "Today 09:14" },
        { name: "Knockdown screen, September", size: "300 proteins", path: "~/Lab/screens/Knockdown screen, September.graphty", when: "Yesterday" },
        { name: "March transfers", size: "3,000 accounts", path: "~/Documents/graphty/March transfers.graphty", when: "Sep 24" },
        { name: "Patent citations 1999-2001", size: "124,318 patents", path: "~/Downloads/Patent citations 1999-2001.graphty", when: "Sep 19" },
    ];
    // start-screen/long-name: a 60-character name saved seven folders deep
    const LONG = { name: "Cross-border card transfers, flagged accounts, Q3 2026 audit", size: "3,093 accounts", path: "~/Documents/Investigations/2026/Q3/Cross-border/Card transfers/Flagged accounts/working copies/Cross-border card transfers, flagged accounts, Q3 2026 audit.graphty", when: "Today 11:02" };
    // start-screen/recent-missing: the patent project's file was moved since it was last opened
    const MISSING = "Patent citations 1999-2001";
    let removed = false;
    // read before the menu's own outside-click closes it (that listener is on document; this one, on window, runs first)
    let menuWasOpen = false;
    window.addEventListener("pointerdown", (e) => { menuWasOpen = !!(e.target.closest && e.target.closest(".ss-missing")) && !!document.querySelector("#ab-overlay .k-menu"); }, true); // Remove from list, in this page view (Undo puts it back)

    // A Recent row. The end ellipsis keeps a long name or path on one line; the full text is its
    // tooltip, given only to text that is cut. A missing file reads "Not found" and opens its menu.
    function recentRow(r, missing, redraw) {
        const more = AB.iconButton(AB.ICON.options, "More for " + r.name + (missing ? ", not found" : ""), { onClick: () => openRecentMenu(more, r, missing, redraw) });
        more.classList.add("ss-more-btn");
        const name = h("span", { class: "k-ellipsis" + (missing ? " k-secondary" : "") }, r.name);
        const path = h("span", { class: "k-ellipsis ss-path" }, r.path);
        // A missing file's row is a plain container: its "..." is its one control (a click on the row opens the same menu)
        const row = h("div", Object.assign({ class: "k-row ss-recent" + (missing ? " ss-missing" : "") }, missing ? { on: { click: (e) => { if (e.target.closest(".ss-more-btn")) return; if (menuWasOpen) menuWasOpen = false; else openRecentMenu(more, r, missing, redraw); } } }
            : Object.assign({ role: "link", "aria-label": r.name + ", " + r.path + ", " + r.when }, AB.act({ go: r.go || ["graph-place", "at-rest"] }))),
            icon(missing ? "triangle-alert" : "file"),
            h("span", { class: "k-grow ss-two" },
                name,
                h("span", { class: "ss-sub k-secondary k-num" }, missing ? h("span", { class: "ss-notfound" }, "Not found") : h("span", { class: "ss-size" }, r.size), path)),
            h("span", { class: "k-secondary k-num ss-when" }, r.when),
            more);
        // the row opens its menu, so a click on the row while that menu is open closes it (a toggle, as the "..." is)
        requestAnimationFrame(() => [[name, r.name], [path, r.path]].forEach(([e, t]) => { if (e.scrollWidth > e.clientWidth) AB.tip(e, t, { label: false }); }));
        return row;
    }

    function openRecentMenu(anchor, r, missing, redraw) {
        const remove = { label: "Remove from list", onClick: () => { removed = true; redraw(); toast("Removed " + r.name + " from Recent", () => { removed = false; redraw(); }); } };
        AB.openMenu(anchor, missing
            ? [{ label: "Locate...", desc: "Find the moved file; Recent remembers its new place", onClick: () => AB.go("graph-place", "at-rest") }, remove]
            : [{ label: "Open", onClick: () => AB.go("graph-place", "at-rest") }, remove]);
    }

    let toastSlot = null;
    function toast(text, onUndo) {
        if (toastSlot) toastSlot.replaceChildren(AB.notice(text, { label: "Undo", onClick: onUndo }));
    }

    const COLLECTED = [
        "A replay of each session, with every node name, attribute value, label and file content masked.",
        "Anonymous task events with their timings: file loaded, first graph drawn, measure run, result read, style added, export, undo.",
        "Errors and performance.",
        "A feedback widget, so you can tell us what went wrong or what you wanted.",
    ];

    function pic(name, alt) {
        return [h("img", { class: "k-light-only", src: `../kit/canvas/${name}-light.svg`, alt }), h("img", { class: "k-dark-only", src: `../kit/canvas/${name}-dark.svg`, alt: "" })];
    }

    function door(o) {
        return h("div", Object.assign({ class: "k-row ss-door", role: "button" }, AB.act(o)), icon(o.icon), h("span", { class: "k-grow k-ellipsis" }, o.label), o.key ? h("span", { class: "k-kbd" }, o.key) : null);
    }

    function header(privacy) {
        return h("div", { class: "ss-head" },
            h("span", { class: "ss-brand" }, icon("network"), "graphty"),
            h("span", { class: "k-grow" }),
            link("settings", "privacy", [icon(privacy === "Local only" ? "lock" : "share", "sm"), privacy], { class: "ab-link ss-privacy", "data-tip": "Change this in Settings > Privacy" }),
            AB.iconButton("settings", "Settings (Ctrl+,)", { go: ["settings", "general"] }),
        );
    }

    function column(title, ...kids) {
        return h("section", { class: "ss-col" }, h("h2", { class: "ss-h" }, title), ...kids);
    }

    function card(expanded) {
        const details = h("details", { class: "ss-what", open: expanded || null },
            h("summary", null, icon("chevron-right", "sm"), "What is collected"),
            h("ul", null, COLLECTED.map((t) => h("li", null, t))),
            h("p", { class: "ss-strong" }, "No file contents ever leave your computer."),
        );
        return h("aside", { class: "ss-card", role: "region", "aria-label": "Usage data" },
            h("div", { class: "ss-card-body" },
                h("p", { class: "ss-card-h" }, "Your data is yours, but please help us."),
                h("p", null, "We will never see the data you analyze, but we would like to collect information about how you use the app so that we can improve the user experience. This data will only ever be used by the author of the application and his Claude Code sessions."),
                h("p", { class: "k-secondary" }, "Nothing is collected until you answer. You can change your answer any time in ", link("settings", "privacy", "Settings > Privacy"), "."),
                details,
            ),
            h("div", { class: "ss-card-acts" },
                AB.button("Share usage data", { kind: "secondary", go: ["start-screen", "answered"] }),
                AB.button("No thanks", { kind: "secondary", go: ["start-screen", "declined"] }),
            ),
        );
    }

    registerSection({
        id: "start-screen",
        title: "Start screen",
        region: "full",
        frame: { top: false, rail: false },
        states: [
            { id: "first-run", label: "First launch, usage data unanswered" },
            { id: "disclosure", label: "What is collected, open" },
            { id: "answered", label: "Answered: share usage data" },
            { id: "declined", label: "Answered: no thanks" },
            { id: "returning", label: "Returning, with recent projects" },
            { id: "drop-target", label: "File dragged over the window" },
            { id: "recent-missing", label: "A recent project's file was moved" },
            { id: "recent-missing-menu", label: "A moved file's menu: Locate... or Remove" },
            { id: "long-name", label: "A long project name and a deep folder" },
        ],
        render(el, state) {
            const fx = AB.fx.datasets;
            const firstLaunch = state === "first-run" || state === "disclosure";
            const hasRecents = !firstLaunch && state !== "answered" && state !== "declined";
            const missingState = state === "recent-missing" || state === "recent-missing-menu";
            if (state !== "recent-missing") removed = false;
            const privacy = state === "answered" ? "Usage data on, content masked" : "Local only";

            // A project file opens the project. New from data... opens the Data page (File, URL and
            // Paste are its "+" choices); a dropped data file opens the same page with that one table.
            const doors = column("Start",
                door({ icon: "folder-open", label: "Open project or file...", key: "Ctrl+O", go: ["graph-place", "at-rest"] }),
                door({ icon: "file-plus", label: "New from data...", go: ["data-page", "entries"] }),
                h("p", Object.assign({ class: "k-secondary ss-line ss-drop-hint" }, AB.act({ go: ["start-screen", "drop-target"] })), icon("upload", "sm"), "or drop a file anywhere in this window"),
                h("p", { class: "k-secondary ss-line" }, icon("lock", "sm"), "Files are read on this computer and never uploaded."),
            );

            const list = h("div", { class: "ss-list" });
            const drawRecents = () => {
                const rows = (state === "long-name" ? [LONG].concat(RECENTS.slice(0, 3)) : RECENTS)
                    .filter((r) => !(missingState && removed && r.name === MISSING));
                list.replaceChildren(...rows.map((r) => recentRow(r, missingState && r.name === MISSING, drawRecents)),
                    h("div", Object.assign({ class: "k-row ss-more", role: "button" }, AB.act({ onClick: () => AB.flash("3 more recent projects (not wired in the skeleton)") })), icon("chevron-down", "sm"), h("span", { class: "k-secondary" }, "3 more")));
            };
            if (hasRecents) drawRecents();
            const recents = column("Recent projects",
                hasRecents ? list : h("p", { class: "k-secondary ss-empty" }, "Projects you open or create appear here. They are kept in this browser."),
            );

            const samples = column("Samples",
                SAMPLES.map((s) => {
                    const d = fx[s.key];
                    return h("div", Object.assign({ class: "ss-sample", role: "link", "aria-label": "Open the " + s.name + " sample" }, AB.act({ go: s.go || ["graph-place", "at-rest"] })),
                        h("div", { class: "ss-pic" + (s.pic ? "" : " ss-pic-icon") }, s.pic ? pic(s.pic, "") : icon(s.key === "nested" ? "file" : "table")),
                        h("div", { class: "ss-sample-text" },
                            h("div", { class: "ss-sample-name" }, h("span", { class: "k-ellipsis" }, s.name), h("span", { class: "k-secondary k-num" }, s.size(d))),
                            h("p", { class: "k-secondary" }, s.good)),
                    );
                }),
            );

            const screen = h("div", { class: "ss-screen" + (state === "drop-target" ? " ss-dragging" : "") },
                header(privacy),
                h("div", { class: "ss-cols" }, doors, recents, samples),
                firstLaunch ? card(state === "disclosure") : null,
                state === "answered" || state === "declined"
                    ? h("div", { class: "ss-toast" }, AB.notice(state === "answered" ? "Thank you. Usage data is on, with content masked." : "Usage data stays off.", { label: "Settings", go: ["settings", "privacy"] }))
                    : null,
                state === "drop-target"
                    ? h("div", Object.assign({ class: "ss-drop", role: "button", "aria-label": "Drop to open" }, AB.act({ go: ["data-page", "edge-list"] })),
                        h("div", { class: "ss-drop-box" },
                            icon("upload", "lg"),
                            h("p", { class: "ss-drop-h" }, "Drop to open"),
                            h("p", { class: "k-secondary" }, "CSV, GraphML, GEXF, GML, DOT, Pajek, JSON, Neo4j. The file is read here and never uploaded."),
                        ))
                    : null,
            );
            toastSlot = h("div", { class: "ss-toast" });
            screen.append(toastSlot);
            el.append(screen);
            if (state === "recent-missing-menu") {
                requestAnimationFrame(() => { const b = list.querySelector(".ss-missing .ss-more-btn"); if (b) b.click(); });
            }
            // Esc leaves the drop target, as releasing the drag outside the window would.
            if (state === "drop-target") {
                const esc = (e) => { if (e.key === "Escape") { window.removeEventListener("keydown", esc); AB.go("start-screen", "returning"); } };
                window.addEventListener("keydown", esc);
                window.addEventListener("hashchange", () => window.removeEventListener("keydown", esc), { once: true });
            }
        },
    });
})();
