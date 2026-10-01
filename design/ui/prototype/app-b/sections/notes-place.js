/* Notes place: every note in the project, newest first. Header: the title and "+" (Add note, N).
   Treebar: Find in notes and a filter icon (All notes, About the selection, About this graph); a
   filter on presses the icon and names itself as the list heading ("About Valjean").
   Each note: text, chips (targets, then cited runs; an earlier run carries a history icon), and
   the meta line (author, time, "..." in its trailing slot on hover). Clicking a note selects every
   target; a chip selects only its own. Edit (double-click the text, or the menu) turns the note
   into the editor in place; Delete acts at once with Undo.
   Fixture counts (the same in the tree, the table and the inspectors): 7 notes; Valjean 2,
   Javert 1, Napoleon 1, Community 3 2, Louvain 1, the edge Javert -- Valjean 1, the graph 1.
   Styles are injected once from this file (the shell's CSS is not ours to edit). Plain ASCII. */
(function () {
    "use strict";
    const CSS = `
.np-find { flex: 1 1 auto; min-width: 0; }
.np-find input { all: unset; flex: 1 1 auto; min-width: 0; color: var(--cm-text); }
.np-find input::placeholder { color: var(--cm-text-tertiary); }
.np-find:focus-within { box-shadow: inset 0 0 0 1px var(--cm-border-selected); }
.np-head { padding: 8px 16px 2px; color: var(--cm-text-secondary); font-weight: 550; }
.np-list { list-style: none; margin: 0; padding: 4px 8px 8px; }
.np-note { display: grid; gap: 4px; padding: 8px; border-radius: 5px; cursor: default; }
.np-note:hover { background: var(--cm-bg-hover); }
.np-note:focus-visible { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }
.np-note[hidden] { display: none; }
.np-text { color: var(--cm-text); overflow-wrap: anywhere; }
.np-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.np-chip { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; height: 20px; padding: 0 6px; border-radius: 5px; background: var(--cm-bg-secondary); color: var(--cm-text); box-shadow: inset 0 0 0 1px var(--cm-border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.np-chip[role=link]:hover { background: var(--cm-bg-hover); }
.np-chip .k-i { color: var(--cm-icon-secondary); flex: none; }
.np-chip .np-x { display: inline-flex; margin-right: -4px; border-radius: 3px; }
.np-chip .np-x:hover { background: var(--cm-bg-hover); }
.np-meta { display: flex; align-items: center; gap: 4px; min-width: 0; height: 20px; color: var(--cm-text-secondary); }
.np-meta .np-acts { margin-left: auto; opacity: 0; } /* keyboard: Shift+F10 on the note opens the same menu */
.np-meta .np-acts .k-icon-btn { width: 24px; height: 24px; margin: -2px 0; }
.np-note:is(:hover, :focus-within, [aria-selected="true"]) .np-acts { opacity: 1; }
.np-editor { display: grid; gap: 8px; margin: 4px 8px; padding: 8px; border-radius: 5px; box-shadow: inset 0 0 0 1px var(--cm-border-selected); background: var(--cm-bg); }
.np-editor textarea { font: inherit; color: var(--cm-text); background: var(--cm-bg-secondary); border: 0; border-radius: 5px; padding: 6px 8px; min-height: 72px; resize: vertical; outline: none; }
.np-editor textarea:focus-visible { box-shadow: inset 0 0 0 1px var(--cm-border-selected); }
.np-editor-foot { display: flex; align-items: center; gap: 8px; }
.np-sub { padding: 0 16px 4px; color: var(--cm-text-tertiary); }
`;
    if (!document.getElementById("np-css")) document.head.append(h("style", { id: "np-css" }, CSS));

    const L = () => AB.fx.datasets.lesmis;

    // What a note is about, or cites. go = what selecting it opens.
    const T = {
        community3: { label: "Community 3", icon: "circle-dot", go: ["inspector-group-set-path-row", "community-3"] },
        louvain: { label: "Louvain", icon: AB.ICON.run, go: ["inspector-run-row", "data"] },
        valjean: { label: "Valjean", icon: "circle-dot", go: ["inspector-node", "data"] },
        javert: { label: "Javert", icon: "circle-dot", go: ["inspector-node", "data"] },
        napoleon: { label: "Napoleon", icon: "circle-dot", go: ["inspector-node", "data"] },
        edge: { label: "Javert -- Valjean", icon: "spline", go: ["inspector-edge", "data"] },
        graph: { label: "Co-appearances", icon: "network", go: ["inspector-nothing-selected", "overview"] },
        pagerank: { label: "PageRank", icon: "chart-column", go: ["inspector-measure-row", "data"] },
        betweenness: { label: "Betweenness", icon: "chart-column", go: ["inspector-measure-row", "data"] },
    };

    function notes() {
        const [v, next] = L().topByBetweenness;
        return [
            { id: "n1", by: "Adam Powers", at: "Sep 30, 09:12", about: [T.community3],
                text: "Myriel's household and the people he meets in Digne." },
            { id: "n2", by: "Lin Chen", at: "Sep 29, 17:40", about: [T.community3, T.napoleon], cites: [T.louvain],
                text: "Napoleon is here only because Myriel meets him once." },
            { id: "n3", by: "Adam Powers", at: "Sep 29, 15:05", about: [T.louvain],
                text: "Valjean and Javert land in the same community, with Marius and Cosette." },
            { id: "n4", by: "Adam Powers", at: "Sep 29, 11:20", about: [T.valjean], cites: [T.betweenness],
                text: `Highest betweenness in the book, ${v.betweenness}. Next is ${next.label} at ${next.betweenness}.` },
            { id: "n5", by: "Lin Chen", at: "Sep 28, 16:02", about: [T.valjean, T.javert], cites: [Object.assign({ earlier: true }, T.pagerank)],
                text: "Javert follows Valjean through the whole book. Check whether PageRank ranks them side by side." },
            { id: "n6", by: "Adam Powers", at: "Sep 28, 12:30", about: [T.edge],
                text: "They share 17 chapters. This is the edge to keep in the pursuit figure." },
            { id: "n7", by: "Adam Powers", at: "Sep 28, 10:14", about: [T.graph],
                text: "Co-appearances counted per chapter, from Knuth's list." },
        ];
    }

    // Where a click on the whole note lands: every target selected.
    function selectAll(n) {
        if (n.about.length === 1) return n.about[0].go;
        if (n.about.every((t) => t.icon === "circle-dot" && t !== T.community3)) return ["inspector-several-elements", "two-nodes"];
        return ["inspector-several-elements", "data"];
    }

    // One chip for targets and cited runs. onRemove adds an x (the editor).
    function chip(t, o) {
        o = o || {};
        const words = (o.cite ? "Cites " : "") + t.label + (t.earlier ? ", an earlier run" : "");
        if (o.onRemove) {
            const x = AB.tip(h("span", Object.assign({ class: "np-x", role: "button" }, AB.act({ onClick: o.onRemove })), icon("x", "sm")), "Remove " + t.label);
            return h("span", { class: "np-chip" }, icon(t.icon, "sm"), t.label, x);
        }
        const el = h("span", { class: "np-chip", role: "link", tabindex: "-1" }, icon(t.icon, "sm"), t.label, t.earlier ? icon("history", "sm") : null);
        AB.tip(el, "Select " + t.label + (t.earlier ? ", an earlier run" : ""), { label: false });
        el.setAttribute("aria-label", words);
        const goTo = (e) => { e.stopPropagation(); AB.go(t.go[0], t.go[1]); };
        el.addEventListener("click", goTo);
        el.addEventListener("keydown", (e) => { if (e.key === "Enter") goTo(e); });
        return el;
    }

    // The editor, in place of a note (edit) or at the top of the list (new). targets come from the selection.
    function editor(o) {
        const targets = o.targets.slice();
        const chips = h("div", { class: "np-chips", "aria-label": "About" });
        const drawChips = () => {
            chips.replaceChildren(...(targets.length
                ? targets.map((t, i) => chip(t, { onRemove: () => { targets.splice(i, 1); drawChips(); ta.focus(); } }))
                : [chip(T.graph, { onRemove: null })]));
        };
        const ta = h("textarea", { "aria-label": "Note text", placeholder: "Write a note" });
        ta.value = o.text || "";
        const save = () => { AB.announce("Note saved"); o.done(true); };
        const cancel = () => o.done(false);
        ta.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
            else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancel(); }
        });
        drawChips();
        requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
        return h("div", { class: "np-editor", role: "group", "aria-label": o.text ? "Edit note" : "New note" },
            chips,
            ta,
            h("div", { class: "np-editor-foot" },
                AB.button("Save", { key: "Ctrl+Enter", onClick: save }),
                AB.button("Cancel", { kind: "ghost", key: "Esc", onClick: cancel })));
    }

    function noteItem(n) {
        const li = h("li", { class: "np-note", tabindex: "-1", "data-note": n.id, "aria-label": n.text + ", " + n.by + ", " + n.at });
        const open = () => { const g = selectAll(n); AB.go(g[0], g[1]); };
        const edit = () => {
            const ed = editor({ targets: n.about, text: n.text, done: () => { ed.replaceWith(li); li.focus(); } });
            li.replaceWith(ed);
        };
        const del = () => {
            const parent = li.parentNode, next = li.nextSibling;
            li.remove();
            AB.deleted("the note", () => parent.insertBefore(li, next));
        };
        const options = (anchor) => AB.openMenu(anchor, [
            { heading: n.text.split(/\s+/).slice(0, 6).join(" ") + "..." },
            { label: "Edit", onClick: edit },
            { label: "Copy link to note", onClick: () => AB.flash("Copied a link to the note") },
            { sep: true },
            { label: "Delete", shortcut: "Del", onClick: del },
        ]);
        li.addEventListener("click", open);
        li.addEventListener("keydown", (e) => {
            if (e.target !== li) return;
            if (e.key === "Enter") open();
            else if (e.key === "Delete") del();
            else if (e.key === "F10" && e.shiftKey) { e.preventDefault(); options(more); }
            else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
                // The tree's keyboard model: the list is one Tab stop and arrows move between notes
                const all = [...li.closest(".k-scroll").querySelectorAll(".np-note")];
                const i = all.indexOf(li);
                const to = all[{ ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 }[e.key]];
                if (to) { e.preventDefault(); all.forEach((x) => (x.tabIndex = x === to ? 0 : -1)); to.focus(); }
            }
        });
        li.addEventListener("contextmenu", (e) => { e.preventDefault(); options(more); });
        const text = h("div", { class: "np-text" }, n.text);
        text.addEventListener("dblclick", (e) => { e.stopPropagation(); edit(); });
        const more = AB.iconButton(AB.ICON.options, "Note options", { onClick: () => options(more) });
        more.setAttribute("aria-haspopup", "menu");
        more.tabIndex = -1; // keyboard: Shift+F10 on the note, as on a tree row
        AB.append(li, [
            text,
            h("div", { class: "np-chips", "aria-label": "About" }, n.about.map((t) => chip(t)), (n.cites || []).map((t) => chip(t, { cite: true }))),
            h("div", { class: "np-meta k-secondary" }, h("span", { class: "k-ellipsis" }, n.by), h("span", null, "-"), h("span", { class: "k-num k-ellipsis" }, n.at), h("span", { class: "np-acts" }, more)),
        ]);
        n.li = li;
        n.edit = edit;
        return li;
    }

    // Filters: the selection is Valjean, or the edge Javert -- Valjean in the edge-note state.
    const FILTERS = { all: null, "about-selection": "valjean", "edge-note": "edge", "about-graph": "graph" };
    const heading = { valjean: "About Valjean", edge: "About Javert -- Valjean", graph: "About this graph" };

    function filterButton(state) {
        const f = FILTERS[state] || null;
        const sel = state === "edge-note" ? "edge-note" : "about-selection";
        // A menu button (a Tab stop), never a pressed toggle: its name carries the active filter
        const now = !f ? "All notes" : f === "graph" ? "About this graph" : "About the selection";
        const b = AB.iconButton("list-filter", "Show notes: " + now, { onClick: () => open() });
        b.setAttribute("aria-haspopup", "menu");
        b.setAttribute("aria-expanded", "false");
        const open = () => {
            AB.openMenu(b, [
                { label: "All notes", check: !f, onClick: () => AB.go("notes-place", "all") },
                { label: "About the selection", check: f === "valjean" || f === "edge", onClick: () => AB.go("notes-place", sel) },
                { label: "About this graph", check: f === "graph", onClick: () => AB.go("notes-place", "about-graph") },
            ]);
        };
        return b;
    }

    function findField(list) {
        const input = h("input", { type: "search", placeholder: "Find in notes", "aria-label": "Find in notes" });
        let none = null;
        input.addEventListener("input", () => {
            const q = input.value.trim().toLowerCase();
            let shown = 0;
            list.querySelectorAll(".np-note").forEach((li) => {
                const hit = !q || li.textContent.toLowerCase().includes(q);
                li.hidden = !hit;
                if (hit) shown++;
            });
            if (none) { none.remove(); none = null; }
            if (!shown) list.append(none = AB.noMatch(input.value.trim()));
        });
        return h("label", { class: "ab-find np-find" }, icon("search", "sm"), input); // the shared find field (lib treebar)
    }

    registerSection({
        id: "notes-place",
        title: "Notes place",
        region: "left",
        rail: "notes",
        states: [
            { id: "all", label: "All notes" },
            { id: "about-selection", label: "About the selection (Valjean)" },
            { id: "about-graph", label: "About this graph" },
            { id: "writing", label: "Writing a note" },
            { id: "editing", label: "Editing a note in place" },
            { id: "edge-note", label: "A note about an edge" },
            { id: "empty", label: "Empty" },
            { id: "filter-step-on", label: "A filter step removes a target" },
        ],
        frame(state) {
            if (state === "about-selection" || state === "writing") return { right: "inspector-node/data" };
            if (state === "edge-note") return { right: "inspector-edge/data" };
            return {};
        },
        render(el, state) {
            // While a note is being written, "+" returns to it rather than starting a second draft
            const add = AB.plus({ label: "Add note (N)", items: ["Note"], onAdd: () => { const d = state === "writing" && el.querySelector("textarea, [contenteditable]"); if (d) { d.focus(); AB.announce("Writing a note"); } else AB.go("notes-place", "writing"); } });
            el.append(AB.placeHead("Notes", [add]));
            if (state === "empty") {
                el.append(AB.empty("No notes.", { verb: "Add note", key: "N", go: ["notes-place", "writing"] }));
                return;
            }
            const all = notes();
            const f = FILTERS[state] || null;
            const shown = f ? all.filter((n) => n.about.includes(T[f])) : all;
            // Filter to degree >= 2 removes Napoleon (degree 1): his note is kept, listed apart.
            const removedNote = state === "filter-step-on" ? (n) => n.about.includes(T.napoleon) : () => false;

            const scroll = h("div", { class: "k-scroll" });
            el.append(h("div", { class: "ab-treebar" }, findField(scroll), filterButton(state)), scroll);
            if (f) scroll.append(h("div", { class: "np-head" }, heading[f]));
            if (state === "writing") {
                scroll.append(editor({ targets: [T.valjean], done: () => AB.go("notes-place", "all") }));
            }
            scroll.append(h("ul", { class: "np-list", "aria-label": "Notes, newest first" }, shown.filter((n) => !removedNote(n)).map(noteItem)));
            const removed = shown.filter(removedNote);
            if (removed.length) {
                const step = L().filterSteps.steps[0];
                scroll.append(
                    h("div", { class: "np-head" }, "About elements not in this filter step"),
                    h("div", { class: "np-sub" }, AB.link("inspector-attribute-and-filter-step", "filter-step", step), " leaves " + L().filterSteps.after.step1 + " of " + L().nodes + " nodes."),
                    h("ul", { class: "np-list", "aria-label": "Notes about elements not in this filter step" }, removed.map(noteItem)));
            }
            const first = scroll.querySelector(".np-note");
            if (first) first.tabIndex = 0; // one Tab stop for the whole list
            if (state === "editing") all.find((n) => n.id === "n5").edit();
        },
    });
})();
