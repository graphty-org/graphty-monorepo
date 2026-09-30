/* Table dock and time slider. The bottom dock: tabs Nodes, Edges and one item tab per open run,
   the column header menu, "Show members in table" as a removable chip, and the time slider on
   data with a time attribute (the transfers). Styles are injected once below (no shared file is
   edited). Plain ASCII.

   Numbers: Les Miserables nodes (label, group, degree, betweenness) and the transfers (accounts,
   first transfer rows, the timestamp range) come from kit/fixtures.json. Not in the fixtures, and
   computed here from graphty-element's examples/data/miserables.json with networkx 3.1:
   - Louvain weighted by value, resolution 1.0, seed 7 (the run the Graph tree shows: 6
     communities of 25, 17, 10, 10, 9 and 6; Community 3 is Myriel's), with each community's
     edges inside, edges leaving, density (edges inside over possible pairs) and members, and the
     weighted modularity 0.565;
   - the 20 heaviest edges by value;
   - Adamic-Adar link prediction, the 8 highest-scoring unlinked pairs.
   Note counts per element match the Notes place (Valjean 2, Javert 1, Napoleon 1, Community 3 2,
   Louvain 1). */
(function () {
    "use strict";
    const { h, icon } = AB;

    const CSS = `
.td { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--cm-bg); }
.td-tabs { gap: 4px; }
.td-tabs .ab-tablist { min-width: 0; overflow-x: auto; scrollbar-width: none; }
.td-tab { gap: 6px; cursor: pointer; white-space: nowrap; }
.td-tab .k-i { color: var(--cm-icon-secondary); }
.td-tab-x { display: inline-flex; margin-inline-end: -4px; padding: 2px; border-radius: 3px; color: var(--cm-icon-secondary); }
.td-tab-x:hover { background: var(--cm-bg-hover); }
.td-scope { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; min-height: 24px; }
.td-scope .ab-link, .td-act { font-weight: 550; cursor: pointer; }
.td-chip { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 2px 0 6px; border-radius: 5px; background: var(--cm-bg-selected); color: var(--cm-text); }
.td-chip .k-chit { margin: 0; }
.td .k-table th { cursor: pointer; vertical-align: top; padding-top: 4px; padding-bottom: 4px; height: auto; }
.td .k-table th:hover { background: var(--cm-bg-hover); }
.td-th { display: flex; align-items: center; gap: 4px; }
.td-th .td-type { display: inline-flex; color: var(--cm-icon-secondary); }
.td-th .td-sort { color: var(--cm-icon-secondary); }
.td-th .td-caret { display: inline-flex; margin-inline-start: auto; padding: 2px; border-radius: 3px; color: var(--cm-icon-secondary); opacity: 0; }
.td .k-table th:hover .td-caret, .td .k-table th[data-open] .td-caret, .td-th .td-caret:focus-visible { opacity: 1; }
.td .k-table th[data-open] { background: var(--cm-bg-selected); }
.td .k-table td { cursor: default; }
.td .k-table tbody tr { cursor: pointer; }
.td-notes { display: inline-flex; align-items: center; gap: 3px; color: var(--cm-text-secondary); }
.td-zero { color: var(--cm-text-tertiary); }
.td-rowact { display: inline-flex; align-items: center; gap: 4px; padding: 0 6px; height: 22px; border-radius: 5px; color: var(--cm-text-secondary); font-weight: 550; }
.td-rowact:hover { background: var(--cm-bg-hover); color: var(--cm-text); }
.td-slider .k-track { cursor: pointer; min-width: 96px; }
.td-slider .k-window { cursor: grab; }
.td-slider .td-end { flex: none; }
.td-slider .k-field { flex: none; }
.td-foot { display: flex; align-items: center; gap: 8px; padding: 4px 16px; border-top: 1px solid var(--cm-border); color: var(--cm-text-secondary); flex: none; }
@container main (max-width: 900px) { .td-hide-narrow { display: none; } }
@container main (max-width: 640px) { .td-hide-tight { display: none; } }
`;
    if (!document.getElementById("td-style")) document.head.append(h("style", { id: "td-style" }, CSS));

    const oq = (text) => h("span", { class: "k-annot-tag", title: text, "aria-label": "Open question: " + text }, "Open question");
    const fmt = (n) => Number(n).toLocaleString("en-US");
    const flash = (what) => () => AB.flash(what + " (not wired in the skeleton)");

    // ---------- data not in the fixtures (see the header comment) ----------
    const COMMUNITIES = [
        { n: 1, size: 25, inside: 44, leaving: 49, density: 0.147, color: "#E69F00", members: ["Valjean", "Marius", "Javert", "Cosette", "Mlle.Gillenormand", "Gillenormand", "Fauchelevent", "Simplice", "Lt.Gillenormand", "Toussaint", "Woman2", "Pontmercy", "MotherInnocent", "Magnon", "Woman1", "Perpetue", "BaronessT", "Mme.Pontmercy", "Mme.deR", "Gribier", "Gervais", "Labarre", "Scaufflaire", "Mlle.Vaubois", "Isabeau"] },
        { n: 2, size: 17, inside: 66, leaving: 22, density: 0.485, color: "#56B4E9", members: ["Gavroche", "Enjolras", "Bossuet", "Courfeyrac", "Bahorel", "Joly", "Mabeuf", "Combeferre", "Feuilly", "Grantaire", "Prouvaire", "Mme.Hucheloup", "Child2", "Mme.Burgon", "Child1", "MotherPlutarch", "Jondrette"] },
        { n: 3, size: 10, inside: 10, leaving: 3, density: 0.222, color: "#009E73", notes: 2, members: ["Myriel", "Mlle.Baptistine", "Mme.Magloire", "CountessdeLo", "Cravatte", "Geborand", "Count", "Napoleon", "Champtercier", "OldMan"] },
        { n: 4, size: 10, inside: 30, leaving: 28, density: 0.667, color: "#0072B2", members: ["Thenardier", "Mme.Thenardier", "Eponine", "Claquesous", "Gueulemer", "Babet", "Montparnasse", "Brujon", "Anzelma", "Boulatruelle"] },
        { n: 5, size: 9, inside: 29, leaving: 10, density: 0.806, color: "#D55E00", members: ["Fantine", "Tholomyes", "Dahlia", "Favourite", "Fameuil", "Blacheville", "Listolier", "Zephine", "Marguerite"] },
        { n: 6, size: 6, inside: 15, leaving: 8, density: 1, color: "#CC79A7", members: ["Bamatabois", "Brevet", "Champmathieu", "Judge", "Chenildieu", "Cochepaille"] },
    ];
    const MODULARITY = 0.565;
    const EDGES = [["Cosette", "Valjean", 31], ["Marius", "Cosette", 21], ["Marius", "Valjean", 19], ["Courfeyrac", "Enjolras", 17], ["Javert", "Valjean", 17], ["Combeferre", "Enjolras", 15], ["Courfeyrac", "Combeferre", 13], ["Thenardier", "Mme.Thenardier", 13], ["Bossuet", "Courfeyrac", 12], ["Marius", "Gillenormand", 12], ["Thenardier", "Valjean", 12], ["Bossuet", "Enjolras", 10], ["Mme.Magloire", "Myriel", 10], ["Bossuet", "Combeferre", 9], ["Courfeyrac", "Marius", 9], ["Fantine", "Valjean", 9], ["Mlle.Gillenormand", "Gillenormand", 9], ["Fauchelevent", "Valjean", 8], ["Mlle.Baptistine", "Myriel", 8], ["Courfeyrac", "Gavroche", 7]];
    const PAIRS = [["Gavroche", "Eponine", 3.34, 8], ["Gavroche", "Claquesous", 3.2, 8], ["Prouvaire", "Mabeuf", 3.11, 8], ["Prouvaire", "Marius", 3.11, 8], ["Mabeuf", "Grantaire", 3.11, 8], ["Marius", "Grantaire", 3.11, 8], ["Valjean", "Eponine", 2.88, 7], ["Montparnasse", "Mme.Thenardier", 2.71, 7]];
    const NODE_NOTES = { Valjean: 2, Javert: 1, Napoleon: 1 };
    const EDGE_NEED = "graphty-element has no edge update yet, so edge values cannot be edited in the table; an edge update API is filed.";
    const edgeReadOnly = () => h("span", { class: "k-secondary" }, "Edge values are read-only. ", AB.needsElement(EDGE_NEED));

    const RUN = "Louvain, resolution 1.0";
    const ITEM_TAB = "Communities: Louvain";
    const PAIR_TAB = "Likely links: Adamic-Adar";

    // ---------- small pieces ----------
    const typeIcon = { text: "type", cat: "type", num: "hash", time: "calendar", bool: "circle-check", color: "palette", notes: "message-square" };
    const typeTitle = { text: "Text", cat: "Category", num: "Number", time: "Date and time", bool: "Yes or no", color: "Color", notes: "Notes" };
    function notesCell(n, go) {
        if (!n) return h("span", { class: "td-zero k-num" }, "0");
        return h("span", Object.assign({ class: "td-notes k-num", title: n + (n === 1 ? " note" : " notes") }, AB.act({ go: go || ["notes-place", "all"] })), icon("message-square", "sm"), String(n));
    }
    const current = () => /^#\/table-dock(\/|$)/.test(location.hash);

    /* A sortable table. cols: [{ key, label, type, n (numeric), profile, menu (true: the caret opens
       the column menu state), cell(row) }]. rows: objects. onRow(row, event). */
    function table(cols, rows, o) {
        o = o || {};
        let sortKey = o.sort || null, dir = o.dir || -1;
        const tbody = h("tbody");
        const heads = {};
        const fill = () => {
            const sorted = sortKey ? rows.slice().sort((a, b) => {
                const x = a[sortKey], y = b[sortKey];
                return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
            }) : rows;
            tbody.replaceChildren(...sorted.map((r) => {
                const tr = h("tr", { id: o.rowId ? "td-row-" + o.rowId(r) : null, tabindex: "0", "aria-selected": r.selected ? "true" : null, "data-member": r.member ? "" : null }, cols.map((c) => h("td", { class: (c.n ? "k-n " : "") + (c.id ? "k-id" : "") }, c.cell ? c.cell(r) : String(r[c.key]))));
                if (o.onRow) {
                    tr.addEventListener("click", (e) => { if (!e.target.closest("[role=button],[role=link],a")) o.onRow(r, e); });
                    tr.addEventListener("keydown", (e) => e.key === "Enter" && o.onRow(r, e));
                }
                if (o.onRowMenu) tr.addEventListener("contextmenu", (e) => { e.preventDefault(); o.onRowMenu(r); });
                if (o.onCellEdit) tr.addEventListener("dblclick", (e) => { e.stopPropagation(); o.onCellEdit(r); });
                return tr;
            }));
            cols.forEach((c) => { if (heads[c.key]) heads[c.key].querySelector(".td-sort").replaceChildren(sortKey === c.key ? icon(dir < 0 ? "chevron-down" : "chevron-up", "sm") : ""); });
        };
        const thead = h("tr", null, cols.map((c) => {
            const caret = h("span", Object.assign({ class: "td-caret", role: "button", tabindex: "0", "aria-label": "Column menu for " + c.label, title: "Column menu" }, c.menu ? AB.act({ go: ["table-dock", "column-menu"] }) : AB.act({ onClick: flash("The " + c.label + " column menu") })), icon("chevron-down", "sm"));
            const th = h("th", { id: "td-col-" + c.key, class: c.n ? "k-n" : null, scope: "col", "data-open": o.openMenu === c.key ? "" : null, title: "Sort by " + c.label + ". The caret opens the column menu." },
                h("span", { class: "td-th" }, c.type ? h("span", { class: "td-type", title: typeTitle[c.type] }, icon(typeIcon[c.type], "sm")) : null, h("span", null, c.label), h("span", { class: "td-sort" }), caret),
                c.profile ? h("span", { class: "k-profile" }, c.profile) : null);
            th.addEventListener("click", (e) => {
                if (e.target.closest(".td-caret")) return;
                if (sortKey === c.key) dir = -dir; else { sortKey = c.key; dir = c.n ? -1 : 1; }
                fill();
            });
            th.addEventListener("contextmenu", (e) => { e.preventDefault(); if (c.menu) AB.go("table-dock", "column-menu"); else flash("The " + c.label + " column menu")(); });
            heads[c.key] = th;
            return th;
        }));
        fill();
        return h("div", { class: "k-table-wrap", tabindex: "0", role: "region", "aria-label": o.label || "Table" }, h("table", { class: "k-table" }, h("thead", null, thead), tbody));
    }

    // ---------- the tab strip ----------
    function tabStrip(state, tabsOpen, active, onPick, optionsState) {
        const list = h("span", { role: "tablist", class: "ab-tablist" });
        tabsOpen.forEach((t) => {
            const el = h("span", { class: "k-tab td-tab", role: "tab", tabindex: "0", "aria-selected": String(t.id === active), title: t.title || null }, t.icon ? icon(t.icon, "sm") : null, t.label,
                t.close ? h("span", { class: "td-tab-x", role: "button", "aria-label": "Close the " + t.label + " tab", title: "Close tab (the run stays in the Graph tree)", on: { click: (e) => { e.stopPropagation(); t.close(); } } }, icon("x", "sm")) : null);
            const pick = () => onPick(t);
            el.addEventListener("click", pick);
            el.addEventListener("keydown", (e) => e.key === "Enter" && pick());
            list.append(el);
        });
        const closed = state === "closed";
        const toggle = current()
            ? AB.iconButton(closed ? "chevron-up" : "chevron-down", closed ? "Open the table (Shift+T)" : "Collapse the table (Shift+T)", { go: ["table-dock", closed ? "nodes" : "closed"] })
            : AB.dockToggle();
        return h("div", { class: "k-dock-tabs td-tabs" }, list, h("span", { class: "k-grow" }),
            AB.iconButton("search", "Find in table", { go: ["commands-and-search", "find"] }),
            AB.iconButton("ellipsis", "Table options", { go: ["table-dock", optionsState || "table-options"] }),
            toggle);
    }

    // ---------- Les Miserables tables ----------
    const L = () => AB.fx.datasets.lesmis;
    const nodeRow = (label) => L().rows.find((r) => r.label === label);
    const groupColor = (g) => L().groupColors[g] || AB.fx.canvas.nodeGray;
    const openNode = (r, e) => (e && (e.shiftKey || e.metaKey || e.ctrlKey) ? AB.go("inspector-several-elements", "two-nodes") : AB.go("inspector-node", "why-this-look"));

    function nodesTable(members, openMenu) {
        const Lx = L();
        const src = members ? members.map(nodeRow) : Lx.rows;
        const rows = src.map((r) => ({ label: r.label, group: r.group, degree: r.degree, betweenness: r.betweenness, notes: NODE_NOTES[r.label] || 0 }));
        const cols = [
            { key: "label", label: "label", type: "text", id: true, profile: Lx.nodes + " values" },
            { key: "group", label: "group", type: "cat", profile: Object.keys(Lx.groupColors).length + " values", cell: (r) => [AB.chit(groupColor(r.group)), String(r.group)] },
            { key: "degree", label: "degree", type: "num", n: true, menu: true, profile: "1 to " + Lx.stats.maxDegree },
            { key: "betweenness", label: "betweenness", type: "num", n: true, profile: "0 to 0.57" },
            { key: "notes", label: "Notes", type: "notes", n: true, cell: (r) => notesCell(r.notes, r.notes ? ["notes-place", "all"] : null) },
        ];
        return table(cols, rows, { sort: "degree", label: "Nodes", openMenu, onRow: openNode, rowId: (r) => r.label.replace(/[^A-Za-z0-9]/g, ""),
            onRowMenu: () => AB.go("table-dock", "row-menu"),
            onCellEdit: (r) => AB.flash("Editing a value of " + r.label + " (not wired in the skeleton)") });
    }

    function edgesTable() {
        const rows = EDGES.map(([a, b, v]) => ({ source: a, target: b, value: v, notes: 0 }));
        const cols = [
            { key: "source", label: "source", type: "text", id: true },
            { key: "target", label: "target", type: "text", id: true },
            { key: "value", label: "value", type: "num", n: true, profile: "chapters shared" },
            { key: "notes", label: "Notes", type: "notes", n: true, cell: (r) => notesCell(r.notes) },
        ];
        return table(cols, rows, { sort: "value", label: "Edges", onRow: () => AB.go("inspector-edge", "style"), onCellEdit: () => AB.flash("Edge values are read-only: " + EDGE_NEED) });
    }

    function communitiesTable(showMembers) {
        const rows = COMMUNITIES.map((c) => ({ c, name: "Community " + c.n, n: c.n, size: c.size, density: c.density, inside: c.inside, leaving: c.leaving, notes: c.notes || 0, selected: false }));
        const cols = [
            { key: "n", label: "community", type: "cat", cell: (r) => [AB.chit(r.c.color, true), r.name] },
            { key: "size", label: "size", type: "num", n: true, profile: "6 to 25" },
            { key: "density", label: "density", type: "num", n: true, profile: "0.147 to 1", cell: (r) => r.density.toFixed(3) },
            { key: "inside", label: "edges inside", type: "num", n: true },
            { key: "leaving", label: "edges leaving", type: "num", n: true },
            { key: "notes", label: "Notes", type: "notes", n: true, cell: (r) => notesCell(r.notes) },
        ];
        // A row opens that community (and selects its members); "Show members in table" is in the row menu
        return table(cols, rows, { sort: "size", label: ITEM_TAB, onRow: (r) => AB.go("inspector-group-set-path-row", "community-" + r.n), onRowMenu: () => AB.go("context-menus", "row") });
    }

    function pairsTable() {
        const rows = PAIRS.map(([a, b, s, k]) => ({ a, b, score: s, common: k, notes: 0 }));
        const cols = [
            { key: "a", label: "node", type: "text", id: true },
            { key: "b", label: "node", type: "text", id: true },
            { key: "score", label: "score", type: "num", n: true, cell: (r) => r.score.toFixed(2) },
            { key: "common", label: "shared neighbors", type: "num", n: true },
            { key: "notes", label: "Notes", type: "notes", n: true, cell: (r) => notesCell(r.notes) },
        ];
        return table(cols, rows, { sort: "score", label: PAIR_TAB, onRow: () => AB.go("inspector-several-elements", "two-nodes") });
    }

    // ---------- transfers tables and the time slider ----------
    const T = () => AB.fx.datasets.transactions;
    const inWindow = (ts) => ts >= "2026-03-09" && ts < "2026-03-16";
    const shortTime = (ts) => { const d = new Date(ts); return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }); };

    function transferEdges(windowed) {
        const rows = T().firstRows.map((r) => ({ from: r.from_account, to: r.to_account, amount: Number(r.amount), timestamp: r.timestamp, notes: 0, member: windowed && inWindow(r.timestamp) }));
        const cols = [
            { key: "from", label: "from_account", type: "text", id: true },
            { key: "to", label: "to_account", type: "text", id: true },
            { key: "amount", label: "amount", type: "num", n: true, cell: (r) => r.amount.toFixed(2) },
            { key: "timestamp", label: "timestamp", type: "time", profile: "Mar 1 to Mar 31", cell: (r) => shortTime(r.timestamp) },
            { key: "notes", label: "Notes", type: "notes", n: true, cell: (r) => notesCell(r.notes) },
        ];
        return table(cols, rows, { label: "Edges", onRow: (r) => AB.flash("Selects the transfer " + r.from + " to " + r.to + " (not wired in the skeleton)"), onCellEdit: () => AB.flash("Edge values are read-only: " + EDGE_NEED) });
    }
    function transferNodes() {
        const Tx = T();
        const rows = Tx.rows.map((r) => ({ id: r.id, kind: r.kind, country: r.country, riskScore: r.riskScore, flagged: r.flagged ? "yes" : "no", degree: r.degree, notes: 0 }));
        const risk = Tx.attributes.find((a) => a.name === "riskScore");
        const cols = [
            { key: "id", label: "id", type: "text", id: true, profile: fmt(Tx.nodes) + " values" },
            { key: "kind", label: "kind", type: "cat", profile: "3 values" },
            { key: "country", label: "country", type: "cat" },
            { key: "riskScore", label: "riskScore", type: "num", n: true, profile: risk.range[0] + " to " + risk.range[1] },
            { key: "flagged", label: "flagged", type: "bool" },
            { key: "degree", label: "degree", type: "num", n: true, profile: "1 to " + fmt(Tx.stats.maxDegree) },
            { key: "notes", label: "Notes", type: "notes", n: true, cell: (r) => notesCell(r.notes) },
        ];
        return table(cols, rows, { sort: "degree", label: "Nodes", onRow: (r) => AB.flash("Selects " + r.id + " (not wired in the skeleton)") });
    }
    function timeSlider(onHide) {
        const play = AB.iconButton("play", "Play through the windows", {});
        let playing = false;
        play.addEventListener("click", () => { playing = !playing; play.replaceChildren(icon(playing ? "pause" : "play")); play.setAttribute("aria-label", playing ? "Pause" : "Play through the windows"); });
        // March 2026: 31 days; the window Mar 9 to Mar 15 starts on day 9
        const win = h("span", { class: "k-window", style: `left:${(8 / 31) * 100}%;width:${(7 / 31) * 100}%`, title: "Drag to move the window. Drag an end to resize it." });
        const track = h("span", { class: "k-track", role: "slider", tabindex: "0", "aria-label": "Time window", "aria-valuetext": "Mar 9 to Mar 15, 2026", on: { click: flash("Moving the window") } }, win);
        return h("div", { class: "k-timeslider td-slider", role: "group", "aria-label": "Time slider (T)" },
            h("span", { class: "td-type", title: "Time attribute: timestamp (edge)" }, icon("clock", "sm")),
            play,
            h("span", { class: "td-hide-tight" }, AB.iconButton("chevron-left", "Previous window", { onClick: flash("Previous window") })),
            h("span", { class: "td-hide-tight" }, AB.iconButton("chevron-right", "Next window", { onClick: flash("Next window") })),
            h("span", { class: "td-end k-secondary k-num td-hide-tight" }, "Mar 1"), track, h("span", { class: "td-end k-secondary k-num td-hide-tight" }, "Mar 31"),
            h("span", { class: "k-strong k-num" }, "Mar 9 to Mar 15"),
            AB.field("Window: 1 week", { caret: true, onClick: flash("Window length: a day, a week, a month, or everything so far") }),
            h("span", { class: "td-hide-narrow" }, oq("The default window length, and whether a window shows everything up to its end")),
            AB.iconButton("x", "Hide the time slider (T)", { onClick: onHide }));
    }

    // the transfers states and whether each shows the time slider
    const TRANSFERS = { "time-slider": true, "slider-options": true, transfers: false, "transfers-options": false };

    // ---------- the dock ----------
    function dock(el, state) {
        const lesmisTabs = (extra) => [
            { id: "nodes", label: "Nodes", icon: "circle-dot" },
            { id: "edges", label: "Edges", icon: "spline" },
            { id: "communities", label: ITEM_TAB, icon: "group", title: "One row per community from " + RUN, close: () => AB.go("table-dock", "nodes") },
        ].concat(extra || []);

        if (current()) {
            const main = document.getElementById("ab-main");
            if (main && main.dataset.dock !== "none") main.dataset.dock = state === "closed" ? "closed" : "open";
        }
        const root = h("div", { class: "td" });
        el.append(root);

        if (TRANSFERS[state] !== undefined) return transfersDock(root, TRANSFERS[state]);

        let members = state === "members-of-row" ? COMMUNITIES[2] : null;
        const pairTab = { id: "pairs", label: PAIR_TAB, icon: "waypoints", title: "One row per pair from the likely-links run", close: () => AB.go("table-dock", "communities") };
        const tabsOpen = lesmisTabs(state === "pair-run" ? [pairTab] : null);
        let active = { nodes: "nodes", closed: "nodes", "members-of-row": "nodes", "column-menu": "nodes", "table-options": "nodes", "row-menu": "nodes", "remove-confirm": "nodes", edges: "edges", communities: "communities", "pair-run": "pairs" }[state] || "nodes";

        const draw = () => {
            root.replaceChildren(tabStrip(state, tabsOpen, active, (t) => {
                if (current()) { AB.go("table-dock", t.id === "pairs" ? "pair-run" : t.id); return; }
                active = t.id; members = null; draw();
            }));
            if (state === "closed" && current()) return;
            const Lx = L();
            if (active === "nodes") {
                if (members) {
                    const m = members;
                    root.append(h("div", { class: "k-scope td-scope" },
                        h("span", { class: "td-chip", title: "The table shows this row's members. Nothing is filtered or recomputed." }, icon("group", "sm"), AB.chit(m.color, true), "Community " + m.n,
                            h("span", { class: "td-tab-x", role: "button", tabindex: "0", "aria-label": "Show all nodes again", title: "Remove: show all " + Lx.nodes + " nodes", on: { click: () => (current() ? AB.go("table-dock", "nodes") : (members = null, draw())) } }, icon("x", "sm"))),
                        h("span", null, m.size + " of " + Lx.nodes + " nodes, members of Community " + m.n + " in ", AB.link("graph-place", "louvain-open", RUN), ". A view of the table: the graph and its filters are unchanged.")));
                    root.append(nodesTable(m.members));
                } else {
                    root.append(h("div", { class: "k-scope td-scope" }, h("span", null, "Full graph: " + Lx.nodes + " nodes. Sorted by degree."), h("span", { class: "k-secondary" }, "Shift-click adds to the selection. Double-click a value to edit it; right-click a row for its menu.")));
                    root.append(nodesTable(null, state === "column-menu" ? "degree" : null));
                }
            } else if (active === "edges") {
                root.append(h("div", { class: "k-scope td-scope" }, h("span", null, "Full graph: " + fmt(Lx.edges) + " edges, undirected. Sorted by value; the 20 heaviest shown here."), edgeReadOnly()));
                root.append(edgesTable());
            } else if (active === "communities") {
                root.append(h("div", { class: "k-scope td-scope" },
                    h("span", null, COMMUNITIES.length + " communities from ", AB.link("inspector-run-row", "style", RUN), ", weighted by value. Modularity " + MODULARITY + "."),
                    h("span", { class: "k-secondary" }, "Colors are the ones the run paints; a row opens that community.")));
                root.append(communitiesTable());
            } else if (active === "pairs") {
                root.append(h("div", { class: "k-scope td-scope" },
                    h("span", null, "The " + PAIRS.length + " most likely links between characters who never share a chapter. A pair has nothing to paint; selecting one selects its two nodes."),
                    oq("How many pairs a run keeps, and whether pairs can be shown as dashed edges")));
                root.append(pairsTable());
            }
        };
        draw();
    }

    // withSlider false: the transfers table under the Data place, with the time slider not shown
    function transfersDock(root, withSlider) {
        const Tx = T();
        let active = "edges", slider = withSlider;
        const tabsOpen = [{ id: "nodes", label: "Nodes", icon: "circle-dot" }, { id: "edges", label: "Edges", icon: "spline" }];
        const draw = () => {
            root.replaceChildren(tabStrip("time-slider", tabsOpen, active, (t) => { active = t.id; draw(); }, slider ? "slider-options" : "transfers-options"));
            if (slider) root.append(timeSlider(() => { slider = false; draw(); AB.flash("Time slider hidden. T shows it again."); }));
            if (active === "edges") {
                root.append(h("div", { class: "k-scope td-scope" },
                    h("span", null, Tx.file + ": " + fmt(Tx.edges) + " transfers, directed." + (slider ? " Transfers inside the window are highlighted." : " The time slider (T) steps through them by date.")),
                    edgeReadOnly(),
                    slider ? oq("Whether the table lists only the window's transfers") : null));
                root.append(transferEdges(slider));
            } else {
                root.append(h("div", { class: "k-scope td-scope" }, h("span", null, fmt(Tx.nodes) + " accounts, joined from " + Tx.accountsFile + ". Sorted by degree."), AB.link("data-place", "at-rest", "Sources in Data")));
                root.append(transferNodes());
            }
        };
        draw();
    }

    // ---------- menus drawn in the overlay region ----------
    const NEW_ATTR = "graphty-element has no computed attributes yet; an expression attribute is filed.";
    const MERGE = "graphty-element has no merge API yet; merging two nodes into one is filed.";
    function optionsMenu(el, time) {
        // time: null (no time attribute), "off" or "on"
        el.append(AB.menu({
            anchor: "#ab-dock [aria-label='Table options']", place: "below-end",
            items: [
                { label: "New attribute...", disabled: true, desc: AB.needsElement(NEW_ATTR) },
                { label: "Merge nodes...", disabled: true, desc: AB.needsElement(MERGE) },
                { sep: true },
                { label: "Show columns..." },
                time ? { label: "Time slider", shortcut: "T", check: time === "on", desc: "Steps through timestamp by date", go: ["table-dock", time === "on" ? "transfers" : "time-slider"] }
                    : { label: "Time slider", shortcut: "T", disabled: true, desc: "This data has no time attribute" },
                { sep: true },
                { label: "Export table as CSV...", go: ["export-dialog", "table"] },
            ],
        }));
    }
    function overlay(el, state) {
        if (state === "column-menu") {
            el.append(AB.menu({
                anchor: "#td-col-degree", place: "above-start",
                items: [
                    { heading: "degree" },
                    { label: "Color by", desc: "Adds a Degree row to the Graph tree", go: ["inspector-measure-row", "style"] },
                    { label: "Size by", go: ["inspector-measure-row", "style"] },
                    { label: "Show as groups", disabled: true, desc: "For a category or text column" },
                    { sep: true },
                    { label: "Filter to...", desc: "Adds a filter step in Data", go: ["data-place", "filters"] },
                    { label: "Show in Data", go: ["data-place", "attributes"] },
                ],
            }));
        } else if (state === "table-options") optionsMenu(el, null);
        else if (state === "transfers-options") optionsMenu(el, "off");
        else if (state === "slider-options") optionsMenu(el, "on");
        else if (state === "row-menu") {
            el.append(AB.menu({
                anchor: "#td-row-Valjean", place: "above-start",
                items: [
                    { heading: "Valjean" },
                    { label: "Inspect", go: ["inspector-node", "why-this-look"] },
                    AB.cmd("neighborhood"),
                    AB.cmd("frame-selection"),
                    { sep: true },
                    AB.cmd("hide-on-canvas"),
                    AB.cmd("add-note"),
                    { sep: true },
                    { label: "Remove from data...", desc: "Deletes the node and its edges; Hide on canvas keeps them", go: ["table-dock", "remove-confirm"] },
                ],
            }));
        } else if (state === "remove-confirm") {
            const v = nodeRow("Valjean");
            el.append(AB.modal({
                title: "Remove Valjean from the data?",
                body: h("div", { style: "padding:0 16px" },
                    h("p", null, "This deletes Valjean and the " + v.degree + " edges that touch Valjean from the graph. Runs that read them go out of date and show Rerun."),
                    h("p", { class: "k-secondary" }, "Valjean's 2 notes: ", oq("Whether notes on a removed node are kept, detached or deleted")),
                    h("p", { class: "k-secondary" }, "To keep the data and only stop drawing Valjean, use Hide on canvas. You can undo this with Ctrl+Z.")),
                foot: [
                    AB.button("Cancel", { kind: "secondary", go: ["table-dock", "nodes"] }),
                    AB.button("Remove from data", { onClick: () => { AB.go("table-dock", "nodes"); AB.flash("Valjean removed (not wired in the skeleton)"); } }),
                ],
            }));
        }
    }

    registerSection({
        id: "table-dock",
        title: "Table dock and time slider",
        region: "dock",
        closeTo: "table-dock/nodes",
        frame(state) {
            if (state === "transfers-options" || state === "slider-options") return { left: "data-place/at-rest", overlay: "table-dock/" + state };
            if (TRANSFERS[state] !== undefined) return { left: "data-place/at-rest" };
            if (state === "communities") return { left: "graph-place/louvain-open", right: "inspector-run-row/style" };
            if (state === "members-of-row") return { left: "graph-place/louvain-open" };
            if (state === "column-menu" || state === "table-options" || state === "row-menu" || state === "remove-confirm") return { overlay: "table-dock/" + state };
            return {};
        },
        states: [
            { id: "nodes", label: "Nodes tab" },
            { id: "edges", label: "Edges tab" },
            { id: "communities", label: "Item tab (Communities: Louvain)" },
            { id: "members-of-row", label: "Members of a row (chip shown)" },
            { id: "column-menu", label: "Column header menu open" },
            { id: "table-options", label: "Table options menu" },
            { id: "row-menu", label: "Row menu (right-click a row)" },
            { id: "remove-confirm", label: "Remove from data confirmation" },
            { id: "pair-run", label: "Item tab of a pair run" },
            { id: "time-slider", label: "Time slider (transfers)" },
            { id: "transfers", label: "Transfers table (Data place)" },
            { id: "transfers-options", label: "Table options with a time attribute" },
            { id: "slider-options", label: "Table options, time slider on" },
            { id: "closed", label: "Closed" },
        ],
        render(el, state, ctx) {
            if (ctx && ctx.region === "overlay") return overlay(el, state);
            dock(el, state);
        },
    });
})();
