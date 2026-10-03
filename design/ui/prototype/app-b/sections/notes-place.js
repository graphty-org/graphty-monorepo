/* Notes place: every note in the project, newest first. Header: the title and "+" (Add note, N).
   Treebar: Find in notes and a filter icon (All notes, About the selection, About this graph); a
   filter on presses the icon and names itself as the list heading ("About Valjean").
   Each note: text, its target chips, then a "Cites" line of dashed run chips (an earlier run
   carries a history icon), and the meta line (time, ", edited", "..." in its trailing slot on
   hover). No name is the normal case: no fixture note has one except in the "two-authors",
   "one-author" and named-writing states (Ada Okafor's note); the author shows before the time only
   when the project holds notes from two or more named people (graphty-element's notes.authors()),
   so a note saved with Your name set shows its name beside Ada's. A cited run opens its record; a
   cited run a rerun replaced opens the settings the cite pinned ("earlier-cite"). Clicking a note (or Enter) selects
   every target and keeps Notes open, with the note marked; a chip selects only its own (Right
   arrow from a note reaches its chips). Edit (double-click the text, or the menu) turns the note
   into the editor in place; Delete acts at once with Undo. Add note (N, "+", or any other door)
   writes about AB.noteDraft, which AB.addNote() fills from the inspector beside it.
   Fixture counts (the same in the tree, the table and the inspectors): 7 notes; Valjean 2,
   Javert 1, Napoleon 1, Community 3 2, Louvain 1, the edge Javert -- Valjean 1, the graph 1.
   Styles are injected once from this file (the shell's CSS is not ours to edit). Plain ASCII. */
(function () {
    "use strict";
    const CSS = `
.np-head { padding: 8px 16px 2px; color: var(--cm-text-secondary); font-weight: 550; }
.np-list { list-style: none; margin: 0; padding: 4px 8px 8px; }
.np-note { display: grid; gap: 4px; padding: 8px; border-radius: 5px; cursor: default; }
.np-note:hover { background: var(--cm-bg-hover); }
.np-note:focus-visible { outline: 2px solid var(--cm-border-selected); outline-offset: -2px; }
.np-note[aria-current="true"] { background: var(--cm-bg-selected, var(--cm-bg-hover)); }
.np-chip:focus-visible { outline: 2px solid var(--cm-border-selected); outline-offset: 1px; }
.np-cites { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; color: var(--cm-text-secondary); }
.np-chip.np-cite { background: transparent; box-shadow: none; border: 1px dashed var(--cm-border-strong, var(--cm-border)); }
.np-chip .k-chit { width: 10px; height: 10px; flex: none; }
.np-chip .np-x[aria-disabled="true"] { opacity: .4; }
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
.np-note:is(:hover, :focus-within, [aria-current="true"]) .np-acts { opacity: 1; }
.np-editor { display: grid; gap: 8px; margin: 4px 8px; padding: 8px; border-radius: 5px; box-shadow: inset 0 0 0 1px var(--cm-border-selected); background: var(--cm-bg); }
.np-editor textarea { font: inherit; color: var(--cm-text); background: var(--cm-bg-secondary); border: 0; border-radius: 5px; padding: 6px 8px; min-height: 72px; max-height: 240px; field-sizing: content; resize: vertical; outline: none; }
.np-editor textarea:focus-visible { box-shadow: inset 0 0 0 1px var(--cm-border-selected); }
.np-editor-foot { display: flex; align-items: center; gap: 8px; }
.np-editor-foot .k-kbd { margin-inline-start: 6px; }
.np-earlier { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; color: var(--cm-text-secondary); }
.np-earlier .k-btn { height: 20px; padding: 0 6px; }
.np-chip.np-gone { text-decoration: line-through; color: var(--cm-text-secondary); }
.np-edit-li { list-style: none; }
.np-sub { padding: 0 16px 4px; color: var(--cm-text-tertiary); }
.np-chip > .np-label { min-width: 0; }
.np-on { display: inline-flex; align-items: center; height: 20px; color: var(--cm-text-secondary); }
.np-hint { color: var(--cm-text-tertiary); }
.np-count { padding: 6px 16px 0; color: var(--cm-text-secondary); }
.np-editor, .np-note { grid-template-columns: minmax(0, 1fr); }
`;
    if (!document.getElementById("np-css")) document.head.append(h("style", { id: "np-css" }, CSS));

    const L = () => AB.fx.datasets.lesmis;

    // What a note is about, or cites. go = what selecting it opens.
    const T = {
        community3: { label: "Community 3", swatch: "#009E73", /* Community 3's color in the Graph tree */ go: ["inspector-group-set-path-row", "community-3"] },
        louvain: { label: "Louvain", icon: AB.ICON.run, go: ["inspector-run-row", "data"] },
        // A node is selected as the canvas walk selects it (AB.walked names it in the inspector), so
        // each chip selects its own node, not the one node inspector state's Valjean
        valjean: { label: "Valjean", icon: "circle-dot", go: ["inspector-node", "why-this-look"], node: true },
        javert: { label: "Javert", icon: "circle-dot", go: ["inspector-node", "why-this-look"], node: true },
        napoleon: { label: "Napoleon", icon: "circle-dot", go: ["inspector-node", "why-this-look"], node: true },
        edge: { label: "Javert -- Valjean", icon: "spline", go: ["inspector-edge", "data"] },
        graph: { label: "Co-appearances", icon: "network", go: ["inspector-nothing-selected", "overview"] },
        pagerank: { label: "PageRank", icon: "chart-column", go: ["inspector-measure-row", "data"] },
        // Betweenness on the whole graph (the value n4 quotes) is the measure inspector's "covered" record
        betweenness: { label: "Betweenness", icon: "chart-column", go: ["inspector-measure-row", "covered"] },
        watchlist: { label: "Watchlist", swatch: "#CC79A7", /* the Watchlist set's color in the Graph tree */ go: ["inspector-group-set-path-row", "watchlist"] },
        // A path keeps the path's color and says "Path", as the path inspector's Notes chip draws it
        path: { label: "Valjean to Javert", swatch: "#D55E00", path: true, go: ["inspector-group-set-path-row", "path-lesmis"] },
    };
    // A cite pins the run it was read from. When a rerun replaced that run there is no inspector for it,
    // so its chip opens the settings the cite pinned (the "earlier-cite" popover), with a link to today's run.
    const EARLIER = {
        PageRank: { ran: "Sep 28, 15:40, on the CPU", set: [["Damping", "0.85"], ["Iterations", "Up to 100"], ["Weight", "None"]] },
        Louvain: { ran: "Sep 27, 10:02, on the CPU", set: [["Method", "Louvain"], ["Weight", "None"], ["Seed", "3"]] },
    };
    const earlier = (t) => Object.assign({ earlier: true }, t, EARLIER[t.label]);

    // The walk step that selects a target node (1-based, as frame.walk takes it), or null
    const walkOf = (t) => t.walk || (t.node ? L().rows.findIndex((r) => r.label === t.label) + 1 || null : null);

    // Each note stores the date and time graphty-element stamped (when); the meta line shows it as
    // "Sep 28, 2026, 14:05", a record a case file can use, and the relative words are its tooltip.
    // by is optional: it exists only when the writer typed a name in Settings, which most do not.
    const at = (mo, d, hh, mm) => new Date(2026, mo - 1, d, hh, mm);
    const NOW = at(10, 1, 11, 5); // the fixtures' present; a note saved in this page view is measured from the clock
    const pad = (x) => String(x).padStart(2, "0");
    const stamp = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + ", " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    function ago(d, now) {
        const min = Math.round((now - d) / 6e4);
        if (min < 1) return "Just now";
        if (min < 60) return min + " min ago";
        const days = Math.round((new Date(now).setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
        return days < 1 ? Math.round(min / 60) + " h ago" : days === 1 ? "Yesterday" : days + " days ago";
    }
    const agoOf = (n) => ago(n.when, n.live ? new Date() : NOW);
    function notes(state) {
        const [v, next] = L().topByBetweenness;
        const c3 = state === "earlier-group" ? Object.assign({}, T.community3, { earlierGroup: true }) : T.community3;
        const nap = state === "missing-target" ? Object.assign({}, T.napoleon, { gone: true }) : T.napoleon;
        const list = [
            { id: "n1", by: state === "two-authors" || state === "one-author" || author ? "Ada Okafor" : null, when: at(9, 30, 9, 12), about: [c3],
                text: "Myriel's household and the people he meets in Digne." },
            { id: "n2", by: state === "two-authors" ? "Lin Chen" : null, when: at(9, 29, 17, 40), about: [c3, nap], cites: [state === "earlier-group" ? earlier(T.louvain) : T.louvain],
                text: "Napoleon is here only because Myriel meets him once." },
            { id: "n3", when: at(9, 29, 15, 5), edited: true, about: [T.louvain],
                text: "Valjean and Javert land in the same community, with Marius and Cosette." },
            { id: "n4", when: at(9, 29, 11, 20), about: [T.valjean], cites: [T.betweenness],
                text: `Highest betweenness in the book, ${v.betweenness}. Next is ${next.label} at ${next.betweenness}.` },
            // A target set whose members changed after the note was written (graphty-element's set:changed): the note says so in place
            state === "missing-target" ? { id: "n5", when: at(9, 28, 16, 2), about: [Object.assign({ changed: true }, T.watchlist)], cites: [T.pagerank],
                text: "Javert follows Valjean through the whole book. Check whether PageRank ranks them side by side." } :
            { id: "n5", when: at(9, 28, 16, 2), about: [T.valjean, T.javert], cites: [earlier(T.pagerank)],
                text: "Javert follows Valjean through the whole book. Check whether PageRank ranks them side by side." },
            { id: "n6", when: at(9, 28, 12, 30), about: [T.edge],
                text: "They share 17 chapters. This is the edge to keep in the pursuit figure." },
            { id: "n7", when: at(9, 28, 10, 14), about: [T.graph],
                text: "Co-appearances counted per chapter, from Knuth's list." },
        ];
        // One: the project holds only its note about the graph; the graph inspector beside it reads "1 note"
        if (state === "one-note") return savedIn("lesmis").concat(list.filter((n) => n.id === "n7"));
        if (state === "long-note" || state === "editing-long") list.unshift(longNote());
        if (state === "path-note") list.unshift({ id: "n8", when: at(10, 1, 9, 30), about: [T.path],
            text: "The shortest chain from Valjean to Javert is one step: they meet directly. Keep this path in the pursuit figure." });
        return savedIn("lesmis").concat(list);
    }
    // The door-entries project: two node types, so each node chip names its type ("Ana Ruiz . person");
    // an edge chip names its table; B12 was left out by the match report, so its note reads missing
    // The pair edge exists only when the entries were loaded per Pair; otherwise its chip reads missing
    function doorNotes() {
        const ana = { label: "Ana Ruiz . person", icon: "circle-dot", go: ["inspector-node", "door-ana"] };
        const b1 = { label: "B1 . building", icon: "circle-dot", go: ["inspector-node", "door-b1"] };
        const pair = AB.fx.datasets.doorEntries.loaded.per === "pair";
        if (!AB.fx.datasets.doorEntries.hasNotes()) return savedIn("doorEntries"); // just made from the files
        return savedIn("doorEntries").concat([
            { id: "d1", when: at(10, 1, 8, 40), about: [ana, b1], text: "Ana Ruiz badges into B1 most mornings before 08:00." },
            { id: "d2", when: at(10, 1, 8, 31), about: [Object.assign({ label: "Ana Ruiz -> B1 . entries", icon: "spline" }, pair ? { go: ["inspector-edge", "door-pair"] } : { gone: true })], text: "The busiest pair: 22 entries, March 2 to March 27." },
            { id: "d3", when: at(9, 30, 16, 5), about: [{ label: "B12 . building", icon: "circle-dot", gone: true }], text: "B12 is not in buildings.csv. Ask Facilities whether it is new." },
        ]);
    }
    // Long text: a 60-character set name and a 600-character note (state matrix, Long text)
    const LONG_SET = { label: "Pursuers of Valjean: Javert, the Thenardiers, Patron-Minette", icon: AB.ICON.set, go: ["inspector-group-set-path-row", "data"] };
    const LONG_TEXT = "Valjean's pursuers form a chain that the co-appearance counts hide. Javert shares 17 chapters with Valjean, more than anyone else in the pursuit, but Thenardier keeps finding him too: at the inn in Montfermeil, in the Gorbeau tenement and finally in the sewers. Check whether the Louvain run puts Thenardier in Valjean's community or with his own family, and whether Betweenness ranks him above Javert once the minor characters are filtered out. If he lands with the family, this set is the better figure for the pursuit chapter, because it keeps all three pursuers in one color across the whole book.";
    const longNote = () => ({ id: "n0", when: at(10, 1, 11, 2), about: [LONG_SET, T.valjean], text: LONG_TEXT });
    // Many: forty notes on the transfers, one per account in the fixture's rows, newest first.
    // Each text reads only that row's values. A chip selects its account through the canvas walk.
    function transferNotes() {
        const D = AB.fx.datasets.transactions;
        return D.rows.slice(0, 40).map((r, i) => {
            const when = at(10, 1, 10 - i * 5, 0); // five hours apart, newest first
            const text = r.riskScore >= 70 ? `Risk score ${r.riskScore} and not flagged. Ask the bank why no alert rule fired for this ${r.country} account.`
                : r.kind === "business" ? `A business in ${r.country} with ${r.degree} counterparties. Check whether this is payroll or a supplier before the review.`
                : r.degree === 1 ? `One counterparty in March. Leave it out of the ring search.`
                : `${r.country}, ${r.degree} counterparties, risk score ${r.riskScore}. Nothing unusual in March.`;
            return { id: "t" + i, when, about: [{ label: r.id, icon: "circle-dot", go: ["inspector-node", "why-this-look"], walk: i + 1 }], text };
        });
    }
    // The list a state shows; "selected" keeps the list it was opened from
    const OWN_LIST = ["one-note", "many", "long-note", "editing-long", "chip-removed-saved", "path-note"];
    let listState = null;

    // Notes saved in this page view (newest first), the note the list marks, and what it selected
    const saved = AB.sessionNotes; // the one in-session store: every Notes count reads it too
    // Each saved note belongs to the project it was written in (its ds)
    const savedIn = (ds) => saved.filter((n) => (n.ds || "lesmis") === ds);
    // The project on screen, and the notes it holds: the transfers have none in the fixture
    const projectOf = () => (AB.route && AB.route.frame.dataset) || "lesmis";
    let selNote = "n4", selRight = "inspector-node/data", selWalk = null, focusNote = null;
    // walk: a transfers account is selected through the shell's canvas walk (frame.walk), which
    // names the account in the node inspector; the skeleton has no per-account inspector state
    const show = (noteId, right, walk) => {
        selNote = noteId; selRight = right; selWalk = walk || null; focusNote = noteId;
        if (location.hash === AB.href("notes-place", "selected")) AB.render(); else AB.go("notes-place", "selected");
    };

    // Stand-in for graphty-element's notes.authors(): names show only with two or more named authors.
    const showNames = (all) => new Set(all.map((n) => n.by).filter(Boolean)).size >= 2;

    // Where a click on the whole note lands: every target selected.
    // A target the data no longer has selects nothing; a note with none left selects nothing at all.
    function selectAll(n) {
        const live = n.about.filter((t) => !t.gone);
        if (!live.length) return null;
        if (live.length === 1) return live[0].go;
        if (live.every((t) => t.icon === "circle-dot")) return ["inspector-several-elements", projectOf() === "doorEntries" ? "door-two" : "two-nodes"];
        return ["inspector-several-elements", "data"];
    }
    // The graph as a subject says so in words: "the whole graph", not the graph's name
    const labelOf = (t) => (t.icon === "network" ? "the whole graph" : t.label);
    const look = (t) => (t.swatch ? [AB.chit(t.swatch, true), t.path ? h("span", { style: "font-weight:550" }, "Path") : null] : icon(t.icon, "sm"));

    // One chip for targets and cited runs. onRemove adds an x (the editor). A target the data no
    // longer has is struck through and selects nothing; an earlier run or group carries a history icon.
    function chip(t, o) {
        o = o || {};
        const lab = labelOf(t);
        if (o.onRemove !== undefined) {
            // In the editor: an x removes a target. The graph chip that stands in when none is left
            // cannot be removed; selecting something is how a note gets another subject.
            const x = o.onRemove
                ? AB.tip(h("span", Object.assign({ class: "np-x", role: "button" }, AB.act({ onClick: o.onRemove })), icon("x", "sm")), "Remove " + lab)
                : AB.tip(h("span", { class: "np-x", role: "button", tabindex: "0", "aria-disabled": "true" }, icon("x", "sm")), "Remove " + lab, { second: "Select something to change what this note is about" });
            const name = h("span", { class: "np-label k-ellipsis" }, lab);
            if (lab.length > 30) AB.tip(name, lab, { label: false }); // a long subject keeps its full name in the tooltip
            return h("span", { class: "np-chip" + (o.cite ? " np-cite" : "") }, look(t), name, x);
        }
        const cls = "np-chip" + (o.cite ? " np-cite" : "");
        if (t.gone) {
            const g = h("span", { class: cls + " np-gone", tabindex: "-1" }, look(t), h("span", { class: "np-label k-ellipsis" }, lab));
            AB.tip(g, "Not in the current data", { label: false });
            g.setAttribute("aria-label", lab + ", not in the current data");
            return g;
        }
        const why = t.earlier ? "Cites an earlier run" : t.earlierGroup ? "About an earlier result" : null;
        const el = h("span", { class: cls, role: "link", tabindex: "-1" }, look(t), h("span", { class: "np-label k-ellipsis" }, lab), why ? icon("history", "sm") : null);
        AB.tip(el, why || (o.cite ? "Cites " + lab + ": open the run" : t.icon === "network" ? "Open the graph" : "Select " + lab), { label: false });
        el.setAttribute("aria-label", (o.cite ? "Cites " : "") + lab + (why ? ", " + why.toLowerCase() : ""));
        // An earlier group may be numbered differently now: its chip opens the run, not today's group
        const target = t.earlierGroup ? ["inspector-run-row", "data"] : t.go;
        // A cited run a rerun replaced opens the settings its cite pinned; any other chip opens its record
        if (t.earlier) el.dataset.cite = (o.note || "") + ":" + t.label;
        const goTo = (e) => {
            e.stopPropagation(); clearTimeout(pending);
            if (!t.earlier) return show(o.note || null, target.join("/"), walkOf(t));
            cited = { t, note: o.note, from: AB.route ? AB.route.state : "all", right: AB.route && AB.route.frame.right };
            AB.go("notes-place", "earlier-cite");
        };
        el.addEventListener("click", goTo);
        el.addEventListener("keydown", (e) => { if (e.key === "Enter") goTo(e); });
        return el;
    }
    // Every key a note answers to, in aria-keyshortcuts form (the list's keydown handler below)
    const KEYS = "ArrowUp ArrowDown Home End ArrowRight Enter N Delete Shift+F10";
    // The earlier cite whose pinned settings the "earlier-cite" popover shows (a direct link: n5's PageRank)
    let cited = null;
    const MOD = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "Cmd" : "Ctrl";
    let nameHintSeen = false; // the no-name line shows until the first note is saved in this page view
    // The project's author setting (Settings > Your name, graphty-element's session.author). Empty is the
    // normal case; the named states use the name settings/general-name-set shows. A note saved while it is
    // set carries it; notes saved before keep no name, and an edit never adds one.
    let author = null;
    const NAMED = ["two-authors", "writing-named"];
    const AUTHOR = "Maya Chen";
    let pending = null; // a single click waits out the double-click interval, so double-click can edit

    // The editor, in place of a note (edit) or at the top of the list (new). targets come from the selection.
    function editor(o) {
        const targets = o.targets.slice();
        const chips = h("div", { class: "np-chips", role: "group", "aria-label": "Note on" });
        const drawChips = () => {
            chips.replaceChildren(h("span", { class: "np-on" }, "Note on:"), ...(targets.length
                ? targets.map((t, i) => chip(t, { onRemove: () => { targets.splice(i, 1); drawChips(); ta.focus(); AB.announce("Removed " + t.label + (targets.length ? "" : "; now about the whole graph")); } }))
                : [chip(o.graph || T.graph, { onRemove: null })]));
        };
        // The runs the note cites, removable here as its subjects are (a note that cites nothing shows no line)
        const cites = (o.cites || []).slice();
        const citeRow = h("div", { class: "np-cites", "aria-label": "Cites" });
        const drawCites = () => { citeRow.hidden = !cites.length; citeRow.replaceChildren("Cites", ...cites.map((t, i) => chip(t, { cite: true, onRemove: () => { cites.splice(i, 1); drawCites(); ta.focus(); } }))); };
        const ta = h("textarea", { "aria-label": "Note text", placeholder: "Write a note" });
        ta.value = o.text || o.draftText || "";
        const empty = () => !ta.value.trim();
        const save = () => { if (empty()) return; AB.announce("Note saved"); o.done(true, { text: ta.value.trim(), about: targets.length ? targets : [o.graph || T.graph], cites }); };
        // Esc cancels. A new note with no text is dropped silently; one with text is discarded with Undo
        // (the writing state's done shows the notice), so typed words are never lost to one key
        const cancel = () => { const typed = !o.text && !empty(); if (!o.text && !typed) AB.announce("Empty note discarded"); o.done(false, typed ? { text: ta.value, about: targets } : null); };
        // The key is drawn on the button, named for this keyboard (Ctrl, or Cmd on a Mac)
        const saveBtn = AB.button(["Save", h("span", { class: "k-kbd" }, MOD + "+Enter")], { tip: "Save", key: MOD + "+Enter", onClick: save });
        saveBtn.setAttribute("aria-label", "Save");
        const sync = () => {
            const off = empty();
            saveBtn.setAttribute("aria-disabled", String(off));
            if (off) { saveBtn.dataset.tip2 = "Type a note first"; saveBtn.setAttribute("aria-description", "Type a note first"); }
            else { delete saveBtn.dataset.tip2; saveBtn.removeAttribute("aria-description"); }
        };
        ta.addEventListener("input", sync);
        ta.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
            else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancel(); }
        });
        drawChips();
        drawCites();
        sync();
        requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
        // With an author name set, every editor (new or edit) says whose name it saves under, and links to
        // Settings to change it. With none, a new note says once, quietly, that it is saved without a name.
        const hint = author ? h("div", { class: "np-hint" }, "Saving as: " + author + ". Change it in ", AB.link("settings", "general-name-set", "Settings", { class: "ab-link" }), ".")
            : !o.text && !nameHintSeen ? h("div", { class: "np-hint" }, "Notes are saved without a name. Add your name in ", AB.link("settings", "general", "Settings", { class: "ab-link" }), ".") : null;
        return h("div", { class: "np-editor", role: "group", "aria-label": o.text ? "Edit note" : "New note" },
            chips,
            ta,
            hint,
            citeRow,
            h("div", { class: "np-editor-foot" },
                saveBtn,
                AB.button("Cancel", { kind: "ghost", key: "Esc", onClick: cancel })));
    }

    function noteItem(n, names) {
        const by = names && n.by ? n.by : null;
        // The spoken name carries what the note is about and cites, since the label replaces the row's content
        const label = () => [n.text, "note on " + n.about.map(labelOf).join(", "), n.cites ? "cites " + n.cites.map((t) => t.label).join(", ") : null, by, stamp(n.when) + (n.edited ? ", edited" : "")].filter(Boolean).join("; ");
        const li = h("li", { class: "np-note", tabindex: "-1", "data-note": n.id, "aria-label": label(), "aria-keyshortcuts": KEYS });
        const open = () => { const to = selectAll(n); if (to) show(n.id, to.join("/"), n.about.length === 1 ? walkOf(n.about[0]) : null); else AB.notice(n.about.map((t) => t.label).join(", ") + ": not in the current data, so nothing is selected"); };
        const edit = () => {
            clearTimeout(pending);
            // The editor stays a list item, so the list keeps its structure
            const wrap = h("li", { class: "np-edit-li" });
            const ed = editor({ targets: n.about, cites: n.cites, text: n.text, done: (ok, v) => {
                // A change to the text or to what the note is about (a subject removed) is saved, and marks it edited
                const moved = ok && (v.about.length !== n.about.length || v.about.some((t, i) => t !== n.about[i]));
                const uncited = ok && (v.cites.length !== (n.cites || []).length);
                const changed = ok && (v.text !== n.text || moved || uncited);
                if (changed) {
                    if (uncited) { n.cites = v.cites.length ? v.cites.slice() : null; const c = citesLine(); citesEl.replaceWith(c); citesEl = c; }
                    n.text = v.text; text.textContent = v.text;
                    if (moved) { n.about = v.about.slice(); about.replaceChildren(...n.about.map((t) => chip(t, { note: n.id }))); }
                    if (!n.edited) { n.edited = true; meta.append(", edited"); }
                    li.setAttribute("aria-label", label());
                }
                const ul = wrap.parentNode;
                wrap.replaceWith(li);
                // A saved note appears at the top of the list, focused (the list's one Tab stop)
                if (changed && ul) { ul.prepend(li); ul.querySelectorAll(".np-note").forEach((x) => (x.tabIndex = x === li ? 0 : -1)); }
                li.focus();
            } });
            wrap.append(ed);
            li.replaceWith(wrap);
        };
        // Delete never drops focus to the page: it moves to the next note, else the previous one, else
        // the empty state's Add note; Undo puts the note back and focuses it
        const del = () => {
            const parent = li.parentNode, next = li.nextSibling;
            const scroll = li.closest(".k-scroll");
            const all = scroll ? [...scroll.querySelectorAll(".np-note")] : [];
            const i = all.indexOf(li);
            const to = all[i + 1] || all[i - 1] || null;
            li.remove();
            let none = null;
            if (to) { all.forEach((x) => (x.tabIndex = x === to ? 0 : -1)); to.focus(); }
            else if (scroll) { none = AB.empty("No notes.", { verb: "Add note", key: "N", onClick: () => AB.addNote() }); scroll.append(none); const v = none.querySelector("[role=button], a, [tabindex]"); if (v) v.focus(); }
            AB.deleted("the note", () => { if (none) none.remove(); parent.insertBefore(li, next); li.tabIndex = 0; li.focus(); });
        };
        const options = (anchor) => AB.openMenu(anchor, [
            { heading: n.text.split(/\s+/).slice(0, 6).join(" ") + "..." },
            { label: "Edit", onClick: edit },
            { label: "Copy link to note", onClick: () => AB.flash("Copied a link to the note") },
            { sep: true },
            { label: "Delete", shortcut: "Del", onClick: del },
        ]);
        li.addEventListener("click", (e) => { clearTimeout(pending); if (e.detail < 2) pending = setTimeout(open, 250); });
        li.addEventListener("keydown", (e) => {
            const chipsIn = [...li.querySelectorAll(".np-chip[role=link]")];
            if (e.target !== li) {
                // Inside the note's chips: Left and Right move, Left from the first returns to the note
                const i = chipsIn.indexOf(e.target);
                if (i < 0) return;
                if (e.key === "ArrowRight" && chipsIn[i + 1]) { e.preventDefault(); chipsIn[i + 1].focus(); }
                else if (e.key === "ArrowLeft" || e.key === "Escape") { e.preventDefault(); (chipsIn[i - 1] && e.key === "ArrowLeft" ? chipsIn[i - 1] : li).focus(); }
                return;
            }
            if (e.key === "Enter") open();
            else if (e.key === "ArrowRight" && chipsIn.length) { e.preventDefault(); chipsIn[0].focus(); }
            else if ((e.key === "n" || e.key === "N") && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); AB.addNote(); }
            else if (e.key === "Delete") del();
            else if (e.key === "F10" && e.shiftKey) { e.preventDefault(); options(li); } // Esc returns focus to the note
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
        const about = h("div", { class: "np-chips", "aria-label": "About" }, n.about.map((t) => chip(t, { note: n.id })));
        const citesLine = () => h("div", { class: "np-cites", "aria-label": "Cites", hidden: n.cites ? null : "" }, "Cites", (n.cites || []).map((t) => chip(t, { cite: true, note: n.id })));
        let citesEl = citesLine();
        // A rerun replaced a run the note relies on (an earlier cite, or a group of an earlier result):
        // "Add current value" cites the current run beside the earlier one, which stays as it was.
        // Nothing rewrites what the note relied on; Undo takes the added cite away again.
        const current = () => {
            const now = (n.cites || []).filter((t) => !t.earlier).map((t) => t.label);
            const add = [];
            n.about.concat(n.cites || []).forEach((t) => {
                const c = t.earlierGroup ? T.louvain : t.earlier ? Object.assign({}, t, { earlier: false }) : null;
                if (c && !now.includes(c.label) && !add.some((a) => a.label === c.label)) add.push(c);
            });
            return add;
        };
        const redrawCites = () => { const c = citesLine(); citesEl.replaceWith(c); citesEl = c; li.setAttribute("aria-label", label()); };
        let earlierEl = null;
        const earlierLine = () => {
            const add = current();
            if (!add.length) return null;
            const btn = AB.button("Add current value", { kind: "ghost", onClick: () => {
                const before = n.cites ? n.cites.slice() : null;
                n.cites = (n.cites || []).concat(add);
                redrawCites();
                earlierEl.remove();
                li.focus();
                AB.notice("Added " + add.map((t) => t.label).join(", ") + " beside the earlier " + (add.length > 1 ? "runs" : "run"), { label: "Undo", onClick: () => {
                    n.cites = before;
                    redrawCites();
                    earlierEl = earlierLine();
                    if (earlierEl) citesEl.after(earlierEl);
                    li.focus();
                } });
            } });
            // The chip's history icon already marks the earlier run; the button says what it keeps in its tooltip
            AB.tip(btn, "Cite the current run too; the earlier run and its value stay", { label: false });
            return h("div", { class: "np-earlier" }, "Earlier run", btn);
        };
        earlierEl = earlierLine();
        // A target set whose members changed since the note was written: said in place, with Restore set,
        // which puts the members back as they were then (Undo takes that back)
        let changedEl = null;
        const changedLine = () => {
            const t = n.about.find((x) => x.changed);
            if (!t) return null;
            const btn = AB.button("Restore set", { kind: "ghost", onClick: () => {
                t.changed = false;
                changedEl.remove();
                li.focus();
                AB.notice("Restored " + t.label + " as it was when the note was written", { label: "Undo", onClick: () => {
                    t.changed = true;
                    changedEl = changedLine();
                    about.after(changedEl);
                    li.focus();
                } });
            } });
            AB.tip(btn, "Put " + t.label + "'s members back as they were when this note was written", { label: false });
            return h("div", { class: "np-earlier" }, "The set this note pointed to was changed", btn);
        };
        changedEl = changedLine();
        const meta = h("span", null, AB.tip(h("span", { class: "k-num" }, stamp(n.when)), agoOf(n), { label: false }), n.edited ? ", edited" : null);
        // A second click on "..." closes the menu it opened
        const more = AB.iconButton(AB.ICON.options, "Note options", { onClick: () => (document.querySelector(".k-menu") ? AB.closeMenu() : options(more)) });
        more.setAttribute("aria-haspopup", "menu");
        more.tabIndex = -1; // keyboard: Shift+F10 on the note, as on a tree row
        AB.append(li, [
            text,
            about,
            changedEl,
            citesEl,
            earlierEl,
            h("div", { class: "np-meta k-secondary" },
                by ? h("span", { class: "k-ellipsis" }, by + ",") : null,
                meta,
                h("span", { class: "np-acts" }, more)),
        ]);
        n.li = li;
        n.edit = edit;
        n.options = () => options(more);
        return li;
    }

    // Where the list was opened from: the project, the inspector beside it and the walked node of the
    // route before it (read in frame(), before the shell moves on). A note-count link keeps all three,
    // so the list is the notes of that project and that selection, never Les Miserables'.
    let from = null;
    const OPENED = ["all", "about-selection", "about-graph", "door-entries", "empty"];
    function openedFrom() {
        const r = AB.route;
        if (!r || !r.frame || !r.frame.right) return;
        const w = AB.walked && AB.walked.dataset === r.frame.dataset && /^inspector-node/.test(r.frame.right) ? AB.walked : null;
        from = { ds: r.frame.dataset || "lesmis", right: r.frame.right, walked: w };
    }
    const keptFrame = () => Object.assign({ right: from.right }, from.ds !== "lesmis" ? { dataset: from.ds } : {}, from.walked ? { walk: from.walked.index + 1 } : {});
    // The selection the list is about: [chip label, name], read from the inspector it was opened beside.
    // A direct link (nothing before it) is about Valjean, the node inspector's own node.
    const DOOR_SEL = { "door-ana": [["Ana Ruiz . person", "Ana Ruiz"]], "door-b1": [["B1 . building", "B1"]], "door-pair": [["Ana Ruiz -> B1 . entries", "Ana Ruiz -> B1"]], "door-two": [["Ana Ruiz . person", "Ana Ruiz"], ["B1 . building", "B1"]] };
    function selection() {
        const [id, st] = from ? String(from.right).split("/") : ["inspector-node", "data"];
        const one = (x) => [[x, x]];
        if (projectOf() === "doorEntries") return DOOR_SEL[st] || [];
        if (projectOf() !== "lesmis") return from && from.walked ? one(from.walked.name) : [];
        if (from && from.walked) return one(from.walked.name);
        if (id === "inspector-edge") return one(T.edge.label);
        if (id === "inspector-run-row") return one(T.louvain.label);
        if (id === "inspector-group-set-path-row") return one(T.community3.label);
        if (id === "inspector-several-elements") return (st === "two-nodes" ? ["Valjean", "Javert"] : ["Valjean", "Javert", "Thenardier", "Fantine", "Cosette"]).map((x) => [x, x]);
        return id === "inspector-node" || !from ? one("Valjean") : [];
    }
    // A filter: the list heading and which subjects it keeps
    function filterOf(state) {
        if (state === "about-graph") return { heading: "About this graph", has: (t) => t.icon === "network" };
        const sel = state === "edge-note" ? [[T.edge.label, T.edge.label]] : state === "about-selection" ? selection() : null;
        if (!sel) return null;
        const labels = sel.map((x) => x[0]);
        return { heading: sel.length ? "About " + sel.map((x) => x[1]).join(", ") : "About the selection", has: (t) => labels.includes(t.label) };
    }

    // The settings an earlier cite pinned, read-only, beside its chip; today's run is one link away
    function earlierPopover(c) {
        const t = c.t;
        return AB.popover({
            anchor: `#ab-left .np-cite[data-cite="${c.note}:${t.label}"]`, width: 280,
            title: t.label + ", the run this note cites",
            body: [
                h("div", { class: "ab-cap k-secondary" }, "A rerun replaced this run. These are the settings it ran with. ", AB.needsElement("graphty-element keeps a cited run's settings after a rerun replaces it")),
                (t.set || []).map(([k, v]) => AB.fieldRow(k, v, { popover: true })),
                AB.fieldRow("Ran", t.ran || "", { popover: true }),
                h("div", { class: "ab-cap", style: "padding-top: 8px" }, AB.link(t.go[0], t.go[1], "Open the current " + t.label, { class: "ab-link" })),
            ],
        });
    }

    function filterButton(state) {
        const f = state === "about-graph" ? "graph" : state === "edge-note" ? "edge" : state === "about-selection" ? "valjean" : null;
        const sel = state === "edge-note" ? "edge-note" : "about-selection";
        // A menu button (a Tab stop); pressed while a filter other than All notes is on (spec 8), its name the filter
        const now = !f ? "All notes" : f === "graph" ? "About this graph" : "About the selection";
        const b = AB.iconButton("list-filter", "Show notes: " + now, { onClick: () => open(), pressed: f ? true : null });
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

    // The shared treebar (find field), with the notes filter icon where a list's options go
    function findBar(list, state) {
        let none = null;
        const bar = AB.treebar({ placeholder: "Find in notes", onInput: (input) => {
            const q = input.value.trim().toLowerCase();
            let shown = 0;
            list.querySelectorAll(".np-note").forEach((li) => {
                const hit = !q || li.textContent.toLowerCase().includes(q);
                li.hidden = !hit;
                if (hit) shown++;
            });
            if (none) { none.remove(); none = null; }
            if (!shown) list.append(none = AB.noMatch(input.value.trim()));
        } });
        bar.append(filterButton(state));
        return bar;
    }

    // A project's notes as the Notes place lists them at rest, for the one find's Notes group (lib.js findBox)
    AB.notesOf = (ds) => (ds === "doorEntries" ? doorNotes() : ds === "lesmis" ? notes("all") : savedIn(ds));

    registerSection({
        id: "notes-place",
        title: "Notes place",
        region: "left",
        rail: "notes",
        states: [
            { id: "all", label: "All notes" },
            { id: "about-selection", label: "About the selection (Valjean)" },
            { id: "about-graph", label: "About this graph" },
            { id: "writing", label: "Writing a note, no name set (the usual case)" },
            { id: "writing-named", label: "Writing a note, with your name set in Settings" },
            { id: "editing", label: "Editing a note in place" },
            { id: "edge-note", label: "A note about an edge" },
            { id: "empty", label: "Empty" },
            { id: "filter-step-on", label: "A filter step removes a target" },
            { id: "missing-target", label: "A target not in the current data, and a set that changed" },
            { id: "earlier-group", label: "A note about a group of an earlier result" },
            { id: "note-menu", label: "A note's menu" },
            { id: "selected", label: "A note selected (its targets in the inspector)" },
            { id: "two-authors", label: "Two people named their notes; writing one with a name set" },
            { id: "one-author", label: "Only one person named their notes" },
            { id: "door-entries", label: "Door entries: chips name each node's type" },
            { id: "find-no-match", label: "Find with no match" },
            { id: "one-note", label: "One note (about the graph)" },
            { id: "many", label: "Forty notes on the transfers" },
            { id: "long-note", label: "A 600-character note and a long subject" },
            { id: "editing-long", label: "Editing a 600-character note" },
            { id: "chip-removed-saved", label: "A subject removed, then saved; the last subject removed from another" },
            { id: "path-note", label: "A note about a path (the path's color)" },
            { id: "earlier-cite", label: "A cited run a rerun replaced: the settings the note cites" },
        ],
        frame(state) {
            // After Save the inspector the note was written from stays (AB.addNote's contract)
            const keep = AB.noteKeep;
            if (OPENED.includes(state)) openedFrom();
            // Opened from a project's inspector (a note count, a note link): that project and selection stay
            if (!keep && from && OPENED.includes(state) && (state !== "door-entries" || from.ds === "doorEntries")) return keptFrame();
            // Empty with nothing it was opened from: a project that holds no notes, so every count beside it reads none
            if (state === "empty") return { dataset: "transactions" };
            if (state === "earlier-cite") return Object.assign({ overlay: "notes-place/earlier-cite" }, cited && cited.right ? { right: cited.right } : {});
            if (state === "door-entries") return { dataset: "doorEntries", right: (keep && keep.right) || "inspector-nothing-selected/door-entries" };
            if (state === "about-selection") return { right: "inspector-node/data" };
            if (state === "writing" || state === "writing-named") {
                const d = AB.noteDraft;
                if (d && d.right) AB.keepTab = true;
                return Object.assign({ right: (d && d.right) || "inspector-node/data" }, d && d.right ? { canvas: d.canvas, dock: d.dock } : {}, d && d.dataset && d.dataset !== "lesmis" ? { dataset: d.dataset } : {});
            }
            if (state === "all" && keep) { AB.keepTab = true; return Object.assign({ right: keep.right }, keep.canvas ? { canvas: keep.canvas, dock: keep.dock } : {}, keep.dataset !== "lesmis" ? { dataset: keep.dataset } : {}); }
            // A selected note keeps the project it belongs to on screen
            if (state === "selected") return Object.assign({ right: selRight }, projectOf() !== "lesmis" ? { dataset: projectOf() } : {}, selWalk ? { walk: selWalk } : {});
            if (state === "one-note") return { right: "inspector-nothing-selected/overview" };
            if (state === "many") return { dataset: "transactions" };
            if (state === "edge-note") return { right: "inspector-edge/data" };
            if (state === "filter-step-on") return { chip: AB.count(AB.fx.datasets.lesmis.filterSteps.after.step1, "node", { of: AB.fx.datasets.lesmis.nodes }), filterOn: ["degree"] };
            return {};
        },
        render(el, state, ctx) {
            if (state === "earlier-cite") {
                cited = cited || { t: notes("all").find((n) => n.id === "n5").cites[0], note: "n5", from: "all" };
                if (ctx && ctx.region === "overlay") { el.append(earlierPopover(cited)); return; }
                state = cited.from; // the list the chip was clicked in stays beside the popover
            }
            setTimeout(() => { AB.keepTab = false; }, 0); // used once, by the inspector drawn beside this screen
            const afterSave = !!AB.noteKeep;
            AB.noteKeep = null; // used once, by the frame of the screen Save lands on
            // The author setting holds while a note is written and saved; any other state opens on its own
            if (NAMED.includes(state)) author = AUTHOR;
            else if (state !== "writing" && state !== "selected" && !afterSave) author = null;
            const writing = state === "writing" || state === "writing-named" || state === "two-authors";
            const ds = projectOf();
            // While a note is being written, "+" returns to it rather than starting a second draft
            const add = AB.plus({ label: "Add note (N)", items: ["Note"], onAdd: () => { const d = writing && el.querySelector(".np-editor textarea"); if (d) { d.focus(); AB.announce("Writing a note"); } else AB.addNote(); } });
            el.append(AB.placeHead("Notes", [add]));
            // Empty, opened from an element with no notes: this graph's notes about that selection, none
            if (state === "empty" && ds === "lesmis") state = "about-selection";
            if (OWN_LIST.includes(state)) listState = state; else if (state !== "selected") listState = null;
            const list = state === "selected" ? listState || state : state;
            const all = ds === "doorEntries" ? doorNotes() : ds === "transactions" ? (list === "many" ? transferNotes() : []).concat(savedIn("transactions")) : ds === "lesmis" ? notes(list) : savedIn(ds); // a just-loaded project has only the notes written in it
            if (!all.length && !writing) { el.append(AB.empty("No notes.", { verb: "Add note", key: "N", onClick: () => AB.addNote() })); return; }
            const names = showNames(all);
            const f = filterOf(state);
            const noneAbout = f && !all.some((n) => n.about.some(f.has));
            const shown = f ? all.filter((n) => n.about.some(f.has)) : all;
            // Filter to degree >= 2 removes Napoleon (degree 1): his note is kept, listed apart.
            const removedNote = state === "filter-step-on" ? (n) => n.about.includes(T.napoleon) : () => false;

            const scroll = h("div", { class: "k-scroll" });
            el.append(findBar(scroll, state), scroll);
            // One count, named for what it counts: every note in this project, or a filter's part of it
            if (f) scroll.append(h("div", { class: "np-head" }, f.heading, h("span", { class: "k-secondary" }, " . " + AB.count(shown.length, "note", { of: all.length }))));
            else if (all.length) scroll.append(h("div", { class: "np-count" }, AB.count(all.length, "note") + " in this graph"));
            if (noneAbout && !writing) scroll.append(AB.empty("No notes about " + f.heading.replace(/^About /, "") + ".", { verb: "Add note", key: "N", onClick: () => AB.addNote() }));
            if (writing) {
                // The subject comes from the door that opened the editor (AB.addNote); a direct link writes about
                // Valjean, and the two-authors list (the graph inspector beside it) about the whole graph
                const draft = state === "two-authors" ? null : AB.noteDraft;
                const ed = editor({ targets: draft ? draft.targets : state === "two-authors" ? [] : [T.valjean], graph: draft && draft.graph, draftText: draft && draft.text, done: (ok, v) => {
                    AB.noteDraft = null;
                    if (!ok && state === "two-authors") { ed.remove(); return; } // the list stays as it was
                    if (ok) {
                        saved.unshift({ id: "s" + (saved.length + 1), ds, by: author, when: new Date(), live: true, about: v.about, text: v.text });
                        focusNote = saved[0].id;
                        nameHintSeen = true;
                        // The list of the project it was written in, beside the inspector it was written from
                        // and that inspector opens on its Notes where it has a state for it (path -> path-notes)
                        const withNotes = (ref) => { const [id, st] = String(ref).split("/"), sec = AB.sections[id]; return sec && sec.states.some((x) => (x.id || x) === st + "-notes") ? id + "/" + st + "-notes" : ref; };
                        AB.noteKeep = { right: draft && draft.right ? withNotes(draft.right) : state === "two-authors" ? "inspector-nothing-selected/overview" : "inspector-node/data", canvas: draft && draft.canvas, dock: draft && draft.dock, dataset: ds };
                        AB.go("notes-place", ds === "doorEntries" ? "door-entries" : "all");
                        return;
                    }
                    // Canceled: back to where the editor was opened, focus on the control that opened it
                    const from = AB.noteFrom;
                    AB.noteFrom = null;
                    if (from && from.hash && from.hash !== location.hash) { location.hash = from.hash; setTimeout(() => AB.refocus(from.focus), 80); }
                    else AB.go("notes-place", "all");
                    if (v) setTimeout(() => AB.notice("Note discarded", { label: "Undo", onClick: () => { AB.noteFrom = from; AB.noteDraft = Object.assign({}, draft || { targets: v.about }, { targets: v.about, text: v.text }); AB.go("notes-place", "writing"); } }), 120);
                } });
                scroll.append(ed);
            }
            scroll.append(h("ul", { class: "np-list", "aria-label": "Notes, newest first" }, shown.filter((n) => !removedNote(n)).map((n) => noteItem(n, names))));
            const removed = shown.filter(removedNote);
            if (removed.length) {
                const step = L().filterSteps.steps[0];
                scroll.append(
                    h("div", { class: "np-head" }, "About elements the filter leaves out"),
                    h("div", { class: "np-sub" }, AB.link("inspector-attribute-and-filter-step", "filter-step", step), " leaves " + AB.count(L().filterSteps.after.step1, "node", { of: L().nodes }) + "."),
                    h("ul", { class: "np-list", "aria-label": "Notes about elements not in this filter step" }, removed.map((n) => noteItem(n, names))));
            }
            const first = scroll.querySelector(".np-note");
            if (first) first.tabIndex = 0; // one Tab stop for the whole list
            if (state === "selected") { const li = scroll.querySelector(`.np-note[data-note="${selNote}"]`); if (li) li.setAttribute("aria-current", "true"); }
            // Back from selecting a note, or after saving one: focus stays on that note in the list
            const keep = focusNote && scroll.querySelector(`.np-note[data-note="${focusNote}"]`);
            focusNote = null;
            if (keep) { first.tabIndex = -1; keep.tabIndex = 0; setTimeout(() => keep.focus(), 0); }
            if (state === "editing") all.find((n) => n.id === "n5").edit();
            if (state === "editing-long") all.find((n) => n.id === "n0").edit();
            if (state === "chip-removed-saved") {
                // The one subject of a note removed: it is now about the whole graph, whose x is disabled
                all.find((n) => n.id === "n4").edit();
                scroll.querySelector(".np-editor .np-chip .np-x").click();
                // Then, with the real controls, Javert removed from a two-subject note and saved: the
                // note moves to the top of the list, focused (after the open editor's own focus)
                const n5 = all.find((n) => n.id === "n5");
                n5.edit();
                const ed = [...scroll.querySelectorAll(".np-editor textarea")].find((t) => t.value === n5.text).closest(".np-editor");
                ed.querySelectorAll(".np-chip")[1].querySelector(".np-x").click();
                [...ed.querySelectorAll(".k-btn")].find((b) => b.textContent.trim().startsWith("Save")).click();
                requestAnimationFrame(() => requestAnimationFrame(() => n5.li.focus()));
            }
            if (state === "find-no-match") {
                const q = el.querySelector(".ab-treebar input");
                q.value = "Thenardier";
                q.dispatchEvent(new Event("input"));
                setTimeout(() => q.focus(), 0);
            }
            if (state === "note-menu") requestAnimationFrame(() => all[0].options());
        },
    });
})();
