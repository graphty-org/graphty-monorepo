/* Start screen and the usage-data opt-in. Shown when no project is open. Plain ASCII.
   Layout: a header line (name, privacy line, Settings gear), three columns (ways in, recent
   projects, samples), and on first launch a non-blocking usage-data card at the foot.
   The ways in are the empty state of Data > Sources (no project exists yet), not a second home.
   Styles: start-screen.css, loaded below (section-local, not shared). */
(function () {
    if (!document.querySelector("link[data-ss-css]")) {
        document.head.append(h("link", { rel: "stylesheet", href: "sections/start-screen.css", "data-ss-css": "" }));
    }

    const openQ = (text) => h("span", { class: "ss-oq", title: text }, "Open question: " + text);

    // Samples: the fixtures' datasets, each with one line on what it is good for.
    const SAMPLES = [
        { key: "lesmis", name: "Les Miserables", size: (d) => d.nodes + " characters", pic: "lesmis-plain", good: "Characters who share a chapter of the novel. Good for a first look at communities and who holds the story together." },
        { key: "karate", name: "Zachary's karate club", size: (d) => d.nodes + " members", pic: "karate-plain", good: "A club that split in two, with the split recorded. Good for checking whether a community measure finds it." },
        { key: "ppi", name: "Protein interactions", size: (d) => d.nodes + " proteins", pic: "ppi-plain", good: "Human proteins and the interactions between them. Good for hubs and the paths that link two proteins." },
        { key: "transactions", name: "Card and transfer transactions", size: (d) => d.nodes.toLocaleString("en-US") + " accounts", pic: "transactions-plain", good: "A month of money moving between accounts. Good for following money, finding rings and comparing months." },
    ];

    // Recent projects, newest first (sizes from the fixtures' datasets).
    const RECENTS = [
        { name: "Mule ring review", size: "3,093 accounts", when: "Today 09:14" },
        { name: "Knockdown screen, September", size: "300 proteins", when: "Yesterday" },
        { name: "March transfers", size: "3,000 accounts", when: "Sep 24" },
        { name: "Patent citations 1999-2001", size: "124,318 patents", when: "Sep 19" },
    ];

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
        return h("div", Object.assign({ class: "k-row ss-door", role: "button" }, AB.act(o)), icon(o.icon), h("span", { class: "k-grow k-ellipsis" }, o.label), o.key ? h("span", { class: "k-kbd" }, o.key) : null, o.hint ? h("span", { class: "k-secondary ss-hint" }, o.hint) : null);
    }

    function header(privacy) {
        return h("div", { class: "ss-head" },
            h("span", { class: "ss-brand" }, icon("network"), "graphty"),
            h("span", { class: "k-grow" }),
            link("settings", "privacy", [icon(privacy === "Local only" ? "lock" : "share", "sm"), privacy], { class: "ab-link ss-privacy", title: "Change this in Settings > Privacy" }),
            AB.iconButton("settings", "Settings (Ctrl+,)", { go: ["settings", "you"] }),
        );
    }

    function column(title, ...kids) {
        return h("section", { class: "ss-col" }, h("h2", { class: "ss-h" }, title), ...kids);
    }

    function card(expanded) {
        const details = h("details", { class: "ss-what", open: expanded || null },
            h("summary", null, icon("chevron-right", "sm"), "What is collected"),
            h("ul", null, COLLECTED.map((t) => h("li", null, t))),
            h("p", { class: "k-secondary" }, "With a project open, ", link("data-place", "sent-and-saved", "Data > Sent and saved"), " lists what has been sent."),
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

    // Open from URL: graphty-element's loadFromUrl. The file is fetched by this browser, then the
    // same load step as a dropped file. Studio decision: a small dialog on the start screen, since
    // no project (and so no Data > Sources) exists yet.
    function urlDialog() {
        const back = () => AB.go("start-screen", "returning");
        const box = h("div", { class: "k-modal ss-url", role: "dialog", "aria-label": "Open from URL" },
            h("div", { class: "k-modal-head" }, h("span", { class: "k-grow" }, "Open from URL"), AB.iconButton("x", "Close", { onClick: back })),
            h("div", { class: "k-modal-body" },
                h("label", { class: "ss-url-label", for: "ss-url-in" }, "Address of a graph file"),
                h("input", { id: "ss-url-in", class: "ss-url-input", type: "url", value: "https://example.org/data/lesmis.graphml", spellcheck: "false" }),
                h("p", { class: "k-secondary" }, "CSV, GraphML, GEXF, GML, DOT, Pajek or JSON. The format is read from the file. This browser fetches it; nothing is sent to us."),
                h("p", { class: "k-secondary" }, "The source keeps its address, so Data > Sources can refresh it later."),
                openQ("a server that refuses the browser (CORS): say so plainly, and offer to download the file and drop it"),
            ),
            h("div", { class: "k-modal-foot" },
                h("span", { class: "k-grow" }),
                AB.button("Cancel", { kind: "secondary", onClick: back }),
                AB.button("Read", { go: ["load-step", "preview"] }),
            ),
        );
        return h("div", Object.assign({ class: "ss-url-wrap" }, { on: { click: (e) => { if (e.target === e.currentTarget) back(); } } }), box);
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
            { id: "open-url", label: "Open from URL..." },
        ],
        render(el, state) {
            const fx = AB.fx.datasets;
            const firstLaunch = state === "first-run" || state === "disclosure";
            const hasRecents = state === "returning" || state === "drop-target" || state === "open-url";
            const privacy = state === "answered" ? "Usage data on, content masked" : "Local only";

            const doors = column("Start",
                door({ icon: "folder-open", label: "Open...", key: "Ctrl+O", go: ["load-step", "preview"] }),
                door({ icon: "file-plus", label: "New project", go: ["graph-place", "empty"] }),
                door({ icon: "upload", label: "Drop a file anywhere", hint: "on this window", go: ["start-screen", "drop-target"] }),
                door({ icon: "copy", label: "Paste data", key: "Ctrl+V", go: ["load-step", "preview"] }),
                door({ icon: "link", label: "Open from URL...", go: ["start-screen", "open-url"] }),
                h("div", { class: "ss-note" }, openQ("connectors (databases, APIs) wait until graphty-element can load from them")),
                h("p", { class: "k-secondary ss-line" }, icon("lock", "sm"), "Files are read on this computer and never uploaded."),
            );

            const recents = column("Recent projects",
                hasRecents
                    ? [RECENTS.map((r) => h("div", Object.assign({ class: "k-row ss-recent", role: "link" }, AB.act({ go: ["graph-place", "at-rest"] })),
                        icon("file"),
                        h("span", { class: "k-grow ss-two" }, h("span", { class: "k-ellipsis" }, r.name), h("span", { class: "k-secondary k-num" }, r.size)),
                        h("span", { class: "k-secondary k-num ss-when" }, r.when))),
                      h("div", Object.assign({ class: "k-row ss-more", role: "button" }, AB.act({ onClick: () => AB.flash("3 more recent projects (not wired in the skeleton)") })), icon("chevron-down", "sm"), h("span", { class: "k-secondary" }, "3 more"))]
                    : h("p", { class: "k-secondary ss-empty" }, "Projects you open or create appear here. They are kept in this browser."),
            );

            const samples = column("Samples",
                SAMPLES.map((s) => {
                    const d = fx[s.key];
                    return h("div", Object.assign({ class: "ss-sample", role: "link", "aria-label": "Open the " + s.name + " sample" }, AB.act({ go: ["graph-place", "at-rest"] })),
                        h("div", { class: "ss-pic" }, pic(s.pic, "")),
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
                    ? h("div", Object.assign({ class: "ss-drop", role: "button", "aria-label": "Drop to open" }, AB.act({ go: ["load-step", "preview"] })),
                        h("div", { class: "ss-drop-box" },
                            icon("upload", "lg"),
                            h("p", { class: "ss-drop-h" }, "Drop to open"),
                            h("p", { class: "k-secondary" }, "CSV, GraphML, GEXF, GML, DOT, Pajek, JSON. The file is read here and never uploaded."),
                        ))
                    : null,
                state === "open-url" ? urlDialog() : null,
            );
            el.append(screen);
            if (state === "open-url") screen.querySelector(".ss-url-input").focus();
            // Esc leaves the drop target, as releasing the drag outside the window would.
            if (state === "drop-target" || state === "open-url") {
                const esc = (e) => { if (e.key === "Escape") { window.removeEventListener("keydown", esc); AB.go("start-screen", "returning"); } };
                window.addEventListener("keydown", esc);
                window.addEventListener("hashchange", () => window.removeEventListener("keydown", esc), { once: true });
            }
        },
    });
})();
