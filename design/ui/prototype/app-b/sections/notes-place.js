/* Notes place: every note in the project, newest first, with its filter, Find, the Note markers
   eye and Add note. Numbers and names come from kit/fixtures.json (Les Miserables). Plain ASCII.
   Styles are injected once from this file (the shell's CSS is not ours to edit). */
(function () {
    "use strict";
    const CSS = `
.np-bar { display: flex; align-items: center; gap: 4px; padding: 0 8px 8px 16px; border-bottom: 1px solid var(--cm-border); flex: none; position: relative; }
.np-bar .k-field { flex: 1 1 auto; min-width: 0; background: var(--cm-bg-secondary); }
.np-bar input { all: unset; flex: 1 1 auto; min-width: 0; color: var(--cm-text); }
.np-bar input::placeholder { color: var(--cm-text-tertiary); }
.np-filter { padding: 8px 8px 4px 16px; flex: none; position: relative; display: flex; align-items: center; gap: 6px; }
.np-filter .k-menu { position: absolute; top: 34px; left: 16px; z-index: 6; min-width: 200px; }
.np-list { list-style: none; margin: 0; padding: 4px 8px 8px; }
.np-note { position: relative; display: grid; gap: 4px; padding: 8px; border-radius: 5px; }
.np-note:hover { background: var(--cm-bg-hover); }
.np-note[data-hidden] { display: none; }
.np-meta { display: flex; align-items: center; gap: 4px; min-width: 0; color: var(--cm-text-secondary); }
.np-acts { position: absolute; right: 4px; bottom: 4px; display: inline-flex; border-radius: 5px; background: var(--cm-bg-hover); visibility: hidden; }
.np-note:hover .np-acts, .np-note:focus-within .np-acts { visibility: visible; }
.np-text { color: var(--cm-text); overflow-wrap: anywhere; }
.np-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.np-chip { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; height: 20px; padding: 0 6px; border-radius: 5px; background: var(--cm-bg-secondary); color: var(--cm-text); box-shadow: inset 0 0 0 1px var(--cm-border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.np-chip:hover { background: var(--cm-bg-hover); }
.np-chip .k-i { color: var(--cm-icon-secondary); flex: none; }
.np-cite { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; color: var(--cm-text-secondary); }
.np-old { display: inline-flex; align-items: center; gap: 2px; color: var(--cm-text-warning, var(--cm-text-secondary)); font-style: italic; }
.np-group { padding: 12px 16px 2px; color: var(--cm-text-secondary); font-weight: 550; }
.np-group-sub { padding: 0 16px 4px; color: var(--cm-text-tertiary); }
.np-empty { display: grid; gap: 8px; padding: 16px; color: var(--cm-text-secondary); }
.np-empty .k-strong { color: var(--cm-text); }
.np-editor { display: grid; gap: 8px; margin: 8px; padding: 8px; border-radius: 5px; box-shadow: inset 0 0 0 1px var(--cm-border-selected); background: var(--cm-bg); }
.np-editor textarea { font: inherit; color: var(--cm-text); background: var(--cm-bg-secondary); border: 0; border-radius: 5px; padding: 6px 8px; min-height: 88px; resize: vertical; outline: none; }
.np-editor textarea:focus-visible { box-shadow: inset 0 0 0 1px var(--cm-border-selected); }
.np-editor-foot { display: flex; align-items: center; gap: 8px; }
.np-nohits { padding: 8px 16px; color: var(--cm-text-tertiary); }
.np-off { padding: 4px 16px 0; color: var(--cm-text-tertiary); }
`;
    if (!document.getElementById("np-css")) document.head.append(h("style", { id: "np-css" }, CSS));

    const L = () => AB.fx.datasets.lesmis;
    const node = (label) => L().rows.find((r) => r.label === label);

    // Targets: what a note is about. go = where selecting it lands (its inspector, Data tab).
    const T = {
        community3: { label: "Community 3", icon: "group", go: ["inspector-group-set-path-row", "data"], row: true },
        pagerank: { label: "PageRank", icon: "chart-column", go: ["inspector-measure-row", "data"], row: true },
        louvain: { label: "Louvain", icon: "layers", go: ["inspector-run-row", "data"], row: true },
        valjean: { label: "Valjean", icon: "circle-dot", go: ["inspector-node", "data"] },
        javert: { label: "Javert", icon: "circle-dot", go: ["inspector-node", "data"] },
        napoleon: { label: "Napoleon", icon: "circle-dot", go: ["inspector-node", "data"] },
        graph: { label: "Co-appearances", icon: "network", go: ["inspector-nothing-selected", "overview"] },
    };

    function notes() {
        const v = node("Valjean"), m = node("Myriel");
        const step1 = L().filterSteps.steps[0];
        return [
            { by: "Adam Powers", at: "Sep 30 2026, 09:12", about: [T.community3, T.pagerank], sel: false, graph: false,
                text: "Community 3 is the cluster for the figure. Rank its members by PageRank, not by degree, and say so in the caption." },
            { by: "Lin Chen", at: "Sep 29 2026, 17:40", about: [T.community3], cites: [{ label: "Louvain", go: ["inspector-run-row", "data"] }],
                text: "Check this community against the file's own group column before calling it a finding." },
            { by: "Adam Powers", at: "Sep 29 2026, 15:05", about: [T.louvain],
                text: "Seed fixed, so the communities keep their numbers between sessions." },
            { by: "Adam Powers", at: "Sep 29 2026, 11:20", about: [T.valjean], sel: true, element: true, cites: [{ label: "Betweenness", go: ["inspector-measure-row", "data"] }],
                text: `Highest betweenness in the book, ${v.betweenness}. Next is ${m.label} at ${m.betweenness}.` },
            { by: "Lin Chen", at: "Sep 28 2026, 16:02", about: [T.valjean, T.javert], sel: true, element: true, cites: [{ label: "PageRank", go: ["inspector-measure-row", "data"], earlier: true }],
                text: "Javert follows Valjean through the whole book. Check whether PageRank ranks them side by side." },
            { by: "Adam Powers", at: "Sep 28 2026, 10:14", about: [T.graph], graph: true,
                text: "Edge value is the number of chapters two characters share. A weighted run should read it as strength, not distance." },
            { by: "Lin Chen", at: "Sep 27 2026, 14:30", about: [T.napoleon], element: true, removedBy: step1,
                text: `Napoleon appears with ${L().corpusDiffersFromPublished.published.napoleonNeighbors[0]} only. Leave him out of the cast figure.` },
        ];
    }

    const openQ = (why) => h("span", { class: "k-annot-tag", title: why }, "Open question");

    function chip(t) {
        return h("span", Object.assign({ class: "np-chip", role: "link", title: "Select " + t.label }, AB.act({ go: t.go })), icon(t.icon, "sm"), t.label);
    }

    function noteItem(n) {
        const first = n.about[0];
        const li = h("li", Object.assign({ class: "np-note", role: "listitem", "aria-label": n.text + ", " + n.by + ", " + n.at }, AB.act({ go: first.go })));
        li.addEventListener("contextmenu", (e) => { e.preventDefault(); AB.go("context-menus", "note"); });
        const acts = [];
        if (n.element) acts.push(AB.iconButton("crosshair", "Show on the canvas", { go: ["canvas-and-states", "drawn"] }));
        acts.push(AB.iconButton("ellipsis", "Note options", { go: ["context-menus", "note"] }));
        const meta = h("div", { class: "np-meta k-secondary" }, h("span", { class: "k-ellipsis" }, n.by), h("span", null, "-"), h("span", { class: "k-num k-ellipsis" }, n.at), h("span", { class: "np-acts" }, acts));
        AB.append(li, [
            h("div", { class: "np-text" }, n.text),
            h("div", { class: "np-chips", "aria-label": "About" }, n.about.map(chip)),
            n.cites ? h("div", { class: "np-cite k-secondary" }, n.cites.map((c) => [
                h("span", null, "Cites"),
                AB.link(c.go[0], c.go[1], c.label, { on: { click: (e) => e.stopPropagation() } }),
                c.earlier ? h("span", { class: "np-old", title: "PageRank was run again after this note was written. The note still cites the run it relied on." }, icon("history", "sm"), "cites an earlier run") : null,
                c.earlier ? AB.link("inspector-measure-row", "data", "Open that run's settings", { on: { click: (e) => e.stopPropagation() } }) : null,
            ])) : null,
            meta,
        ]);
        return li;
    }

    const FILTERS = [
        { id: "all", label: "All notes" },
        { id: "about-selection", label: "About the selection" },
        { id: "about-graph", label: "About this graph" },
    ];

    function filterRow(cur) {
        const f = FILTERS.find((x) => x.id === cur) || FILTERS[0];
        const wrap = h("div", { class: "np-filter" });
        let menuEl = null;
        const btn = h("span", { class: "k-chip k-chip-btn", role: "button", tabindex: "0", "aria-haspopup": "menu", "aria-expanded": "false" }, f.label, h("span", { class: "k-caret" }, icon("chevron-down", "sm")));
        const toggle = (e) => {
            e.stopPropagation();
            if (menuEl) { menuEl.remove(); menuEl = null; btn.setAttribute("aria-expanded", "false"); return; }
            menuEl = h("div", { class: "k-menu", role: "menu" }, FILTERS.map((x) =>
                h("div", Object.assign({ class: "k-menu-item", role: "menuitemradio", "aria-checked": String(x.id === f.id) }, AB.act({ go: ["notes-place", x.id] })), h("span", { class: "k-check-col" }, x.id === f.id ? icon("check", "sm") : null), h("span", null, x.label))));
            wrap.append(menuEl);
            btn.setAttribute("aria-expanded", "true");
        };
        btn.addEventListener("click", toggle);
        btn.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && toggle(e));
        wrap.append(btn);
        if (cur === "about-selection") wrap.append(h("span", { class: "k-secondary k-ellipsis" }, "Valjean"));
        return wrap;
    }

    function search(list) {
        const input = h("input", { type: "search", placeholder: "Find in notes", "aria-label": "Find in notes" });
        const none = h("div", { class: "np-nohits", hidden: true }, "No notes match.");
        input.addEventListener("input", () => {
            const q = input.value.trim().toLowerCase();
            let shown = 0;
            list.querySelectorAll(".np-note").forEach((li) => {
                const hit = !q || li.textContent.toLowerCase().includes(q);
                li.toggleAttribute("data-hidden", !hit);
                if (hit) shown++;
            });
            none.hidden = shown > 0;
        });
        return { field: h("span", { class: "k-field" }, icon("search", "sm"), input), none };
    }

    function head(state) {
        const off = state === "markers-off";
        return AB.placeHead("Notes", [
            AB.iconButton(off ? "eye-off" : "eye", off ? "Show note markers on the canvas (Shift+N)" : "Hide note markers on the canvas (Shift+N)", { pressed: off, go: ["notes-place", off ? "all" : "markers-off"] }),
            AB.iconButton("plus", "Add note (N)", { go: ["notes-place", "writing"] }),
        ]);
    }

    function editor() {
        const back = () => AB.go("notes-place", "all");
        const ta = h("textarea", { "aria-label": "Note text", placeholder: "Write a note about Valjean" });
        ta.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); AB.flash("Note saved"); back(); }
            else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); back(); }
        });
        requestAnimationFrame(() => ta.focus());
        return h("div", { class: "np-editor", role: "group", "aria-label": "New note" },
            h("div", { class: "np-cite k-secondary" }, "About", chip(T.valjean), openQ("The spec takes the targets from the selection. It does not say whether a target can be removed or added here before saving.")),
            ta,
            h("div", { class: "np-editor-foot" },
                AB.button("Save", { onClick: () => { AB.flash("Note saved"); back(); } }),
                AB.button("Cancel", { kind: "ghost", onClick: back }),
                h("span", { class: "k-grow" }),
                h("span", { class: "k-tertiary" }, h("span", { class: "k-kbd" }, "Ctrl"), "+", h("span", { class: "k-kbd" }, "Enter"))),
        );
    }

    registerSection({
        id: "notes-place",
        title: "Notes place",
        region: "left",
        rail: "notes",
        states: [
            { id: "all", label: "All notes" },
            { id: "about-selection", label: "About the selection" },
            { id: "about-graph", label: "About this graph" },
            { id: "writing", label: "Writing a note" },
            { id: "empty", label: "Empty" },
            { id: "markers-off", label: "Markers eye off" },
            { id: "filter-step-on", label: "A filter step removes a target" },
        ],
        frame(state) {
            if (state === "about-selection" || state === "writing") return { right: "inspector-node/data" };
            return {};
        },
        render(el, state) {
            el.append(head(state));
            if (state === "empty") {
                el.append(h("div", { class: "np-empty" },
                    h("div", { class: "k-strong" }, "No notes yet."),
                    h("div", null, "Add a note about the selection, or about the graph when nothing is selected."),
                    h("div", null, AB.button("Add note", { icon: "plus", kind: "secondary", go: ["notes-place", "writing"] })),
                    h("div", { class: "k-tertiary" }, "Notes are saved in the project and travel in project files and findings reports.")));
                return;
            }
            const all = notes();
            const filterOn = state === "filter-step-on";
            let shown = all;
            if (state === "about-selection") shown = all.filter((n) => n.sel);
            if (state === "about-graph") shown = all.filter((n) => n.graph);
            const main = filterOn ? shown.filter((n) => !n.removedBy) : shown;
            const removed = filterOn ? shown.filter((n) => n.removedBy) : [];

            const list = h("div", { class: "k-scroll" });
            const s = search(list);
            el.append(h("div", { class: "np-bar" }, s.field), filterRow(FILTERS.some((f) => f.id === state) ? state : "all"));
            if (state === "markers-off") el.append(h("div", { class: "np-off" }, "Note markers are hidden on the canvas."));
            if (state === "writing") list.append(editor());
            list.append(h("ul", { class: "np-list", role: "list", "aria-label": "Notes, newest first" }, main.map(noteItem)));
            if (removed.length) {
                const step = removed[0].removedBy;
                list.append(
                    h("div", { class: "np-group" }, "About elements not in this filter step"),
                    h("div", { class: "np-group-sub" }, AB.link("inspector-attribute-and-filter-step", "filter-step", step), " leaves " + L().filterSteps.after.step1 + " of " + L().nodes + " nodes."),
                    h("ul", { class: "np-list", role: "list", "aria-label": "Notes about elements not in this filter step" }, removed.map(noteItem)));
            }
            list.append(s.none);
            el.append(list);
        },
    });
})();
