/* Table dock and time slider. The bottom dock: tabs Nodes, Edges and one item tab per open run
   (named and marked like the run's tree row), the column header menu, "Show members in table" as
   a removable chip, and the time slider on data with a time attribute (the transfers). Styles
   are injected once below (no shared file is edited). Plain ASCII.

   Numbers: Les Miserables nodes (label, group, degree, betweenness) and the transfers (accounts,
   first transfer rows, the timestamp range) come from kit/fixtures.json. Not in the fixtures, and
   computed here from graphty-element's examples/data/miserables.json with networkx 3.1:
   - Louvain weighted by value, resolution 1.0, seed 7 (the run the Graph tree shows: 6
     communities of 25, 17, 10, 10, 9 and 6; Community 3 is Myriel's), with each community's
     edges inside, edges leaving, density (edges inside over possible pairs) and members;
   - the 20 heaviest edges by value;
   - Adamic-Adar link prediction, the 8 highest-scoring unlinked pairs.
   Note counts per element match the Notes place (Valjean 2, Javert 1, Napoleon 1, the edge
   Javert - Valjean 1, Community 3 2). */
(function () {
    "use strict";
    const { h, icon } = AB;

    const CSS = `
.td { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--cm-bg); }
.td-tabs { gap: 4px; }
.td-tabs .ab-tablist { min-width: 0; overflow-x: auto; scrollbar-width: none; }
.td-tab { gap: 6px; cursor: pointer; white-space: nowrap; }
.td-tab .k-i { color: var(--cm-icon-secondary); }
.td-tab-x { display: inline-flex; margin: -4px -8px -4px -2px; padding: 4px; border-radius: 3px; color: var(--cm-icon-secondary); cursor: pointer; }
.td-tab-x:hover { background: var(--cm-bg-hover); }
.td-scope { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; min-height: 24px; }
.td-chip { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 2px 0 6px; border-radius: 5px; background: var(--cm-bg-selected); color: var(--cm-text); }
.td-chip .k-chit { margin: 0; }
.td .k-table th { cursor: pointer; white-space: nowrap; }
.td .k-table th:hover { background: var(--cm-bg-hover); }
.td-th { display: flex; align-items: center; gap: 4px; }
.td-th .td-type, .td-th .td-sort { display: inline-flex; color: var(--cm-icon-secondary); }
.td-th .td-caret { display: inline-flex; margin-inline-start: auto; padding: 2px; border-radius: 3px; color: var(--cm-icon-secondary); opacity: 0; }
.td .k-table th:hover .td-caret, .td .k-table th[data-open] .td-caret, .td-th .td-caret:focus-visible { opacity: 1; }
.td .k-table th[data-open] { background: var(--cm-bg-selected); }
.td .k-table tbody tr { cursor: pointer; }
.td .k-table td[data-edit] { cursor: text; }
.td .k-table td input { width: 100%; min-width: 48px; font: inherit; color: inherit; background: var(--cm-bg); border: 0; outline: 1px solid var(--cm-border-selected); border-radius: 2px; padding: 0 2px; }
.td .k-table tr[data-member] td { background: transparent; }
.td .k-table tr[data-member] td:first-child { box-shadow: inset 3px 0 0 var(--cm-border-selected); }
.td-slider .k-track { cursor: pointer; min-width: 96px; }
.td-slider .k-window { cursor: grab; }
.td-slider .k-field { flex: none; cursor: pointer; }
`;
    if (!document.getElementById("td-style")) document.head.append(h("style", { id: "td-style" }, CSS));

    const fmt = (n) => Number(n).toLocaleString("en-US");
    const flash = (what) => () => AB.flash(what + " (not wired in the skeleton)");
    const plural = (n, one, many) => fmt(n) + " " + (n === 1 ? one : many || one + "s");
    // Sort arrows (lucide arrow-up and arrow-down, ISC): the kit sprite has neither
    const ARROW = { up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>', down: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>' };
    const arrow = (d) => { const s = h("svg", { class: "k-i k-i-sm", "aria-hidden": "true", viewBox: "0 0 24 24" }); s.innerHTML = ARROW[d]; return s; };

    // ---------- data not in the fixtures (see the header comment) ----------
    const COMMUNITIES = [
        { n: 1, size: 25, inside: 44, leaving: 49, density: 0.147, color: "#E69F00", members: ["Valjean", "Marius", "Javert", "Cosette", "Mlle.Gillenormand", "Gillenormand", "Fauchelevent", "Simplice", "Lt.Gillenormand", "Toussaint", "Woman2", "Pontmercy", "MotherInnocent", "Magnon", "Woman1", "Perpetue", "BaronessT", "Mme.Pontmercy", "Mme.deR", "Gribier", "Gervais", "Labarre", "Scaufflaire", "Mlle.Vaubois", "Isabeau"] },
        { n: 2, size: 17, inside: 66, leaving: 22, density: 0.485, color: "#56B4E9", members: ["Gavroche", "Enjolras", "Bossuet", "Courfeyrac", "Bahorel", "Joly", "Mabeuf", "Combeferre", "Feuilly", "Grantaire", "Prouvaire", "Mme.Hucheloup", "Child2", "Mme.Burgon", "Child1", "MotherPlutarch", "Jondrette"] },
        { n: 3, size: 10, inside: 10, leaving: 3, density: 0.222, color: "#009E73", notes: 2, members: ["Myriel", "Mlle.Baptistine", "Mme.Magloire", "CountessdeLo", "Cravatte", "Geborand", "Count", "Napoleon", "Champtercier", "OldMan"] },
        { n: 4, size: 10, inside: 30, leaving: 28, density: 0.667, color: "#0072B2", members: ["Thenardier", "Mme.Thenardier", "Eponine", "Claquesous", "Gueulemer", "Babet", "Montparnasse", "Brujon", "Anzelma", "Boulatruelle"] },
        { n: 5, size: 9, inside: 29, leaving: 10, density: 0.806, color: "#D55E00", members: ["Fantine", "Tholomyes", "Dahlia", "Favourite", "Fameuil", "Blacheville", "Listolier", "Zephine", "Marguerite"] },
        { n: 6, size: 6, inside: 15, leaving: 8, density: 1, color: "#CC79A7", members: ["Bamatabois", "Brevet", "Champmathieu", "Judge", "Chenildieu", "Cochepaille"] },
    ];
    const EDGES = [["Cosette", "Valjean", 31], ["Marius", "Cosette", 21], ["Marius", "Valjean", 19], ["Courfeyrac", "Enjolras", 17], ["Javert", "Valjean", 17], ["Combeferre", "Enjolras", 15], ["Courfeyrac", "Combeferre", 13], ["Thenardier", "Mme.Thenardier", 13], ["Bossuet", "Courfeyrac", 12], ["Marius", "Gillenormand", 12], ["Thenardier", "Valjean", 12], ["Bossuet", "Enjolras", 10], ["Mme.Magloire", "Myriel", 10], ["Bossuet", "Combeferre", 9], ["Courfeyrac", "Marius", 9], ["Fantine", "Valjean", 9], ["Mlle.Gillenormand", "Gillenormand", 9], ["Fauchelevent", "Valjean", 8], ["Mlle.Baptistine", "Myriel", 8], ["Courfeyrac", "Gavroche", 7]];
    const PAIRS = [["Gavroche", "Eponine", 3.34, 8], ["Gavroche", "Claquesous", 3.2, 8], ["Prouvaire", "Mabeuf", 3.11, 8], ["Prouvaire", "Marius", 3.11, 8], ["Mabeuf", "Grantaire", 3.11, 8], ["Marius", "Grantaire", 3.11, 8], ["Valjean", "Eponine", 2.88, 7], ["Montparnasse", "Mme.Thenardier", 2.71, 7]];
    const NODE_NOTES = { Valjean: 2, Javert: 1, Napoleon: 1 };
    const EDGE_NOTES = { "Javert|Valjean": 1 };

    // Item tabs carry the run row's icon and short name; the full name is the tooltip
    const RUN = { label: "Louvain", full: "Louvain, resolution 1.0", icon: AB.ICON.run };
    const PAIR_RUN = { label: "Adamic-Adar", full: "Adamic-Adar likely links", icon: AB.ICON.run };

    // ---------- small pieces ----------
    const typeTitle = { text: "Text", cat: "Category", num: "Number", time: "Date and time", bool: "Yes or no" };
    // The tree's note badge; blank at zero
    function notesCell(n) {
        if (!n) return "";
        // A pointer shortcut inside a focusable row: the row is the Tab stop (its notes are in the inspector)
        const b = h("span", Object.assign({ class: "ab-tnotes k-num", role: "link" }, AB.act({ go: ["notes-place", "all"] })), icon(AB.ICON.note, "sm"), String(n));
        b.tabIndex = -1;
        return AB.tip(b, plural(n, "note"));
    }
    const notesCol = { key: "notes", label: "Notes", n: true, cell: (r) => notesCell(r.notes) };
    const current = () => /^#\/table-dock(\/|$)/.test(location.hash);

    /* A sortable table. cols: [{ key, label, type, n (numeric), profile, menu (true: the caret opens
       the column menu state), cell(row), edit (true: double-click edits the value in place) }].
       The Notes column is added only when a row has a note. */
    function table(cols, rows, o) {
        o = o || {};
        if (rows.some((r) => r.notes)) cols = cols.concat(notesCol);
        let sortKey = o.sort || null, dir = o.dir || -1;
        const tbody = h("tbody");
        const heads = {};
        const cellOf = (c, r) => (c.cell ? c.cell(r) : String(r[c.key]));
        function editCell(td, c, r, who) {
            const old = r[c.key];
            const inp = h("input", { value: String(old), "aria-label": c.label + " of " + who });
            let done = false;
            const finish = (save) => {
                if (done) return;
                done = true;
                const v = c.n ? Number(inp.value) : inp.value;
                if (save && inp.value !== String(old) && !(c.n && Number.isNaN(v))) {
                    r[c.key] = v;
                    AB.notice("Changed " + c.label + " of " + who, { label: "Undo", onClick: () => { r[c.key] = old; fill(); } });
                }
                td.replaceChildren(cellOf(c, r));
                td.closest("tr").focus();
            };
            inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); });
            inp.addEventListener("blur", () => finish(true));
            inp.addEventListener("click", (e) => e.stopPropagation());
            td.replaceChildren(inp);
            inp.focus();
            inp.select();
        }
        const fill = () => {
            const sorted = sortKey ? rows.slice().sort((a, b) => {
                const x = a[sortKey], y = b[sortKey];
                return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
            }) : rows;
            tbody.replaceChildren(...sorted.map((r) => {
                const who = o.who ? o.who(r) : "";
                const tr = h("tr", { id: o.rowId ? "td-row-" + o.rowId(r) : null, tabindex: "0", "data-member": r.member ? "" : null },
                    cols.map((c) => {
                        const td = h("td", { class: (c.n ? "k-n " : "") + (c.id ? "k-id" : ""), "data-edit": c.edit ? "" : null }, cellOf(c, r));
                        if (c.edit) td.addEventListener("dblclick", (e) => { e.stopPropagation(); editCell(td, c, r, who); });
                        return td;
                    }));
                if (r.member) AB.tip(tr, "Inside the time window", { label: false });
                if (o.onRow) {
                    // On an editable cell, wait out a double-click before opening the row
                    let wait = 0;
                    tr.addEventListener("click", (e) => {
                        if (e.target.closest("[role=button],[role=link],a,input")) return;
                        clearTimeout(wait);
                        if (e.detail > 1) return;
                        // the row is marked at once; opening it waits out a double-click on an editable cell
                        tr.parentNode.querySelectorAll("tr[aria-selected='true']").forEach((x) => x.removeAttribute("aria-selected"));
                        tr.setAttribute("aria-selected", "true");
                        if (e.target.closest("td[data-edit]")) wait = setTimeout(() => o.onRow(r, e), 300); else o.onRow(r, e);
                    });
                    tr.addEventListener("dblclick", () => clearTimeout(wait));
                    tr.addEventListener("keydown", (e) => e.target === tr && e.key === "Enter" && o.onRow(r, e));
                }
                if (o.onRowMenu) {
                    tr.addEventListener("contextmenu", (e) => { e.preventDefault(); o.onRowMenu(r); });
                    tr.addEventListener("keydown", (e) => { if (e.target === tr && (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10"))) { e.preventDefault(); o.onRowMenu(r); } });
                }
                return tr;
            }));
            cols.forEach((c) => {
                const th = heads[c.key];
                if (!th) return;
                th.querySelector(".td-sort").replaceChildren(sortKey === c.key ? arrow(dir < 0 ? "down" : "up") : "");
                th.setAttribute("aria-sort", sortKey === c.key ? (dir < 0 ? "descending" : "ascending") : "none");
            });
        };
        const openMenu = (c) => (c.menu ? AB.go("table-dock", "column-menu") : flash("The " + c.label + " column menu")());
        const thead = h("tr", null, cols.map((c) => {
            // One Tab stop per header: the caret is for the pointer; the keyboard opens the menu from the header (Alt+Down, Shift+F10)
            const caret = AB.tip(h("span", Object.assign({ class: "td-caret", role: "button" }, AB.act({ onClick: () => openMenu(c) }), { tabindex: "-1" }), icon("chevron-down", "sm")), "Column menu", { key: "Alt+Down" });
            const th = h("th", { id: "td-col-" + c.key, class: c.n ? "k-n" : null, scope: "col", tabindex: "0", "data-open": o.openMenu === c.key ? "" : null },
                h("span", { class: "td-th" }, c.type ? h("span", { class: "td-type" }, AB.typeGlyph(c.type)) : null, h("span", null, c.label), h("span", { class: "td-sort" }), caret));
            AB.tip(th, [c.type ? typeTitle[c.type] : null, c.profile].filter(Boolean).join(", ") || c.label, { label: false });
            const sort = () => { if (sortKey === c.key) dir = -dir; else { sortKey = c.key; dir = c.n ? -1 : 1; } fill(); };
            th.addEventListener("click", (e) => { if (!e.target.closest(".td-caret")) sort(); });
            th.addEventListener("keydown", (e) => {
                if (e.target !== th) return;
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sort(); }
                else if ((e.altKey && e.key === "ArrowDown") || (e.shiftKey && e.key === "F10") || e.key === "ContextMenu") { e.preventDefault(); openMenu(c); }
            });
            th.addEventListener("contextmenu", (e) => { e.preventDefault(); openMenu(c); });
            heads[c.key] = th;
            return th;
        }));
        fill();
        return h("div", { class: "k-table-wrap", role: "region", "aria-label": o.label || "Table" }, h("table", { class: "k-table" }, h("thead", null, thead), tbody));
    }

    // The scope line: the count; usage hints live in its tooltip
    function scope(text, hint, ...more) {
        const count = h("span", null, text);
        if (hint) AB.tip(count, text, { second: hint, label: false });
        return h("div", { class: "k-scope td-scope" }, count, ...more);
    }
    const ROW_HINT = "Shift-click a row: add it to the selection";

    // ---------- the tab strip ----------
    function tabStrip(state, tabsOpen, active, onPick, optionsState) {
        const list = h("span", { role: "tablist", class: "ab-tablist" });
        tabsOpen.forEach((t) => {
            // One Tab stop for the strip (arrows move); a closable tab closes with Delete. Its x is a
            // pointer shortcut with a 24 px target, not a second control inside the tab.
            const x = t.close ? h("span", { class: "td-tab-x", "aria-hidden": "true", "data-tip": "Close tab", "data-key": "Del", on: { click: (e) => { e.stopPropagation(); t.close(); } } }, icon("x", "sm")) : null;
            const el = h("span", { class: "k-tab td-tab", role: "tab", tabindex: t.id === active ? "0" : "-1", "aria-selected": String(t.id === active), "aria-keyshortcuts": t.close ? "Delete" : null }, t.icon ? icon(t.icon, "sm") : null, t.label, x);
            if (t.full) AB.tip(el, t.full, { label: false });
            const pick = () => onPick(t);
            el.addEventListener("click", pick);
            el.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
                else if (e.key === "Delete" && t.close) { e.preventDefault(); t.close(); }
                else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    const all = [...list.querySelectorAll(".td-tab")], i = all.indexOf(el);
                    const to = all[(i + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length];
                    e.preventDefault(); all.forEach((y) => (y.tabIndex = y === to ? 0 : -1)); to.focus();
                }
            });
            list.append(el);
        });
        const closed = state === "closed";
        const toggle = current()
            ? AB.iconButton(closed ? "chevron-up" : "chevron-down", closed ? "Show table (Shift+T)" : "Hide table (Shift+T)", { go: ["table-dock", closed ? "nodes" : "closed"] })
            : AB.dockToggle();
        return h("div", { class: "k-dock-tabs td-tabs" }, list, h("span", { class: "k-grow" }),
            AB.iconButton(AB.ICON.options, "Table options", { go: ["table-dock", optionsState || "table-options"] }),
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
            { key: "label", label: "label", type: "text", id: true, edit: true, profile: Lx.nodes + " values" },
            { key: "group", label: "group", type: "cat", edit: true, profile: Object.keys(Lx.groupColors).length + " values", cell: (r) => [AB.chit(groupColor(r.group)), String(r.group)] },
            { key: "degree", label: "degree", type: "num", n: true, menu: true, profile: "1 to " + Lx.stats.maxDegree },
            { key: "betweenness", label: "betweenness", type: "num", n: true, profile: "0 to 0.57" },
        ];
        return table(cols, rows, { sort: "degree", label: "Nodes", openMenu, onRow: openNode, who: (r) => r.label, rowId: (r) => r.label.replace(/[^A-Za-z0-9]/g, ""),
            onRowMenu: () => AB.go("context-menus", "table-row") });
    }

    function edgesTable() {
        const rows = EDGES.map(([a, b, v]) => ({ source: a, target: b, value: v, notes: EDGE_NOTES[a + "|" + b] || 0 }));
        const cols = [
            { key: "source", label: "source", type: "text", id: true },
            { key: "target", label: "target", type: "text", id: true },
            { key: "value", label: "value", type: "num", n: true, edit: true, profile: "chapters shared, 1 to 31" },
        ];
        return table(cols, rows, { sort: "value", label: "Edges", who: (r) => r.source + " - " + r.target, onRow: () => AB.go("inspector-edge", "style"), onRowMenu: () => AB.go("context-menus", "edge") });
    }

    function communitiesTable() {
        const rows = COMMUNITIES.map((c) => ({ c, n: c.n, size: c.size, density: c.density, inside: c.inside, leaving: c.leaving, notes: c.notes || 0 }));
        const cols = [
            { key: "n", label: "community", type: "cat", cell: (r) => [AB.chit(r.c.color, true), "Community " + r.n] },
            { key: "size", label: "size", type: "num", n: true, profile: "6 to 25" },
            { key: "density", label: "density", type: "num", n: true, profile: "0.147 to 1", cell: (r) => r.density.toFixed(3) },
            { key: "inside", label: "edges inside", type: "num", n: true },
            { key: "leaving", label: "edges leaving", type: "num", n: true },
        ];
        return table(cols, rows, { sort: "size", label: RUN.label, onRow: (r) => AB.go("inspector-group-set-path-row", "community-" + r.n), onRowMenu: () => AB.go("context-menus", "row") });
    }

    function pairsTable() {
        const rows = PAIRS.map(([a, b, s, k]) => ({ a, b, score: s, common: k }));
        const cols = [
            { key: "a", label: "node", type: "text", id: true },
            { key: "b", label: "node", type: "text", id: true },
            { key: "score", label: "score", type: "num", n: true, cell: (r) => r.score.toFixed(2) },
            { key: "common", label: "shared neighbors", type: "num", n: true },
        ];
        return table(cols, rows, { sort: "score", label: PAIR_RUN.label, onRow: () => AB.go("inspector-several-elements", "two-nodes") });
    }

    // ---------- transfers tables and the time slider ----------
    const T = () => AB.fx.datasets.transactions;
    // March 2026; the window is [start, start + len) in days
    const win = { start: 9, len: 7 };
    const inWindow = (ts) => { const d = new Date(ts).getUTCDate(); return d >= win.start && d < win.start + win.len; };
    const shortTime = (ts) => new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });

    function transferEdges(windowed) {
        const rows = T().firstRows.map((r) => ({ from: r.from_account, to: r.to_account, amount: Number(r.amount), timestamp: r.timestamp, member: windowed && inWindow(r.timestamp) }));
        const cols = [
            { key: "from", label: "from_account", type: "text", id: true },
            { key: "to", label: "to_account", type: "text", id: true },
            { key: "amount", label: "amount", type: "num", n: true, edit: true, cell: (r) => r.amount.toFixed(2) },
            { key: "timestamp", label: "timestamp", type: "time", profile: "Mar 1 to Mar 31", cell: (r) => shortTime(r.timestamp) },
        ];
        return table(cols, rows, { label: "Edges", who: (r) => r.from + " - " + r.to, onRow: (r) => AB.flash("Selects the transfer " + r.from + " - " + r.to + " (not wired in the skeleton)") });
    }
    function transferNodes() {
        const Tx = T();
        const rows = Tx.rows.map((r) => ({ id: r.id, kind: r.kind, country: r.country, riskScore: r.riskScore, flagged: r.flagged ? "yes" : "no", degree: r.degree }));
        const risk = Tx.attributes.find((a) => a.name === "riskScore");
        const cols = [
            { key: "id", label: "id", type: "text", id: true, profile: fmt(Tx.nodes) + " values" },
            { key: "kind", label: "kind", type: "cat", edit: true, profile: "3 values" },
            { key: "country", label: "country", type: "cat", edit: true },
            { key: "riskScore", label: "riskScore", type: "num", n: true, edit: true, profile: risk.range[0] + " to " + risk.range[1] },
            { key: "flagged", label: "flagged", type: "bool", edit: true },
            { key: "degree", label: "degree", type: "num", n: true, profile: "1 to " + fmt(Tx.stats.maxDegree) },
        ];
        return table(cols, rows, { sort: "degree", label: "Nodes", who: (r) => r.id, onRow: (r) => AB.flash("Selects " + r.id + " (not wired in the skeleton)") });
    }

    // Play, the track, the window readout, the window length, close
    const LENGTHS = [[1, "1 day"], [7, "1 week"], [31, "1 month"]];
    function timeSlider(onHide, onMove) {
        const readout = h("span", { class: "k-strong k-num" });
        const winEl = h("span", { class: "k-window" });
        const track = h("span", { class: "k-track", role: "slider", tabindex: "0", "aria-label": "Time window", "aria-valuemin": "1", "aria-valuemax": "31" }, winEl);
        const lenField = AB.field("", { caret: true });
        lenField.setAttribute("role", "button");
        lenField.setAttribute("tabindex", "0");
        const show = () => {
            const end = Math.min(31, win.start + win.len - 1);
            const text = win.len === 1 ? "Mar " + win.start : "Mar " + win.start + " to Mar " + end;
            readout.textContent = text;
            winEl.style.cssText = `left:${((win.start - 1) / 31) * 100}%;width:${(Math.min(win.len, 32 - win.start) / 31) * 100}%`;
            track.setAttribute("aria-valuenow", String(win.start));
            track.setAttribute("aria-valuetext", text + ", 2026");
            lenField.replaceChildren(LENGTHS.find((l) => l[0] === win.len)[1], icon("chevron-down", "sm"));
            lenField.setAttribute("aria-label", "Window length: " + LENGTHS.find((l) => l[0] === win.len)[1]);
        };
        const move = (start) => { win.start = Math.max(1, Math.min(32 - win.len, start)); show(); onMove(); };
        track.addEventListener("keydown", (e) => {
            const step = { ArrowLeft: -1, ArrowRight: 1, PageDown: -win.len, PageUp: win.len }[e.key];
            if (e.key === "Home") move(1); else if (e.key === "End") move(32 - win.len); else if (step) move(win.start + step); else return;
            e.preventDefault();
        });
        track.addEventListener("click", (e) => { if (e.target === track) { const r = track.getBoundingClientRect(); move(Math.round(((e.clientX - r.left) / r.width) * 31 + 1 - win.len / 2)); } });
        winEl.addEventListener("click", flash("Dragging the window or its ends"));
        const pickLen = () => AB.openMenu(lenField, LENGTHS.map(([d, label]) => ({ label, check: d === win.len, onClick: () => { win.len = d; move(win.start); lenField.focus(); } })));
        lenField.addEventListener("click", pickLen);
        lenField.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " " || (e.altKey && e.key === "ArrowDown")) { e.preventDefault(); pickLen(); } });
        let playing = false;
        // onClick through iconButton, so Play is a Tab stop like every other icon button
        const play = AB.iconButton("play", "Play", { onClick: () => togglePlay() });
        const togglePlay = (() => {
            playing = !playing;
            play.replaceChildren(icon(playing ? "pause" : "play"));
            AB.tip(play, playing ? "Pause" : "Play");
            play.setAttribute("aria-label", playing ? "Pause" : "Play");
            if (playing) move(win.start + win.len > 31 ? 1 : win.start + win.len);
        });
        show();
        return h("div", { class: "k-timeslider td-slider", role: "group", "aria-label": "Time slider" },
            play, track, readout, lenField,
            AB.iconButton("x", "Hide the time slider", { onClick: onHide }));
    }

    // the transfers states and whether each shows the time slider
    const TRANSFERS = { "time-slider": true, "slider-options": true, transfers: false, "transfers-options": false };

    // ---------- the dock ----------
    function dock(el, state) {
        // Old links: the row menu is the node's context menu; Remove from data no longer asks
        if (state === "row-menu" || state === "remove-confirm") {
            setTimeout(() => AB.go.apply(null, state === "row-menu" ? ["context-menus", "table-row"] : ["table-dock", "nodes"]), 0);
            return;
        }
        if (current()) {
            const main = document.getElementById("ab-main");
            if (main && main.dataset.dock !== "none") main.dataset.dock = state === "closed" ? "closed" : "open";
        }
        const root = h("div", { class: "td" });
        // Find (Ctrl+F) searches the table when it has focus
        root.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); AB.go("commands-and-search", "find"); } });
        el.append(root);

        if (TRANSFERS[state] !== undefined) return transfersDock(root, TRANSFERS[state]);
        if (/^door-entries/.test(state)) return doorDock(root, state);

        let members = state === "members-of-row" ? COMMUNITIES[2] : null;
        const pairTab = { id: "pairs", label: PAIR_RUN.label, full: PAIR_RUN.full, icon: PAIR_RUN.icon, close: () => AB.go("table-dock", "communities") };
        const tabsOpen = [
            { id: "nodes", label: "Nodes", icon: "circle-dot" },
            { id: "edges", label: "Edges", icon: "spline" },
            { id: "communities", label: RUN.label, full: RUN.full, icon: RUN.icon, close: () => AB.go("table-dock", "nodes") },
        ].concat(state === "pair-run" ? [pairTab] : []);
        let active = { edges: "edges", communities: "communities", "pair-run": "pairs" }[state] || "nodes";

        const draw = () => {
            root.replaceChildren(tabStrip(state, tabsOpen, active, (t) => {
                if (current()) { AB.go("table-dock", t.id === "pairs" ? "pair-run" : t.id); return; }
                active = t.id; members = null; draw();
            }));
            if (state === "closed" && current()) return;
            const Lx = L();
            if (active === "nodes" && members) {
                const m = members;
                const x = AB.tip(h("span", { class: "td-tab-x", role: "button", tabindex: "0" }, icon("x", "sm")), "Show all nodes");
                AB.nav(x, "table-dock", "nodes");
                root.append(h("div", { class: "k-scope td-scope" }, h("span", { class: "td-chip" }, AB.chit(m.color, true), "Community " + m.n, x), h("span", null, m.size + " of " + Lx.nodes + " nodes")));
                root.append(nodesTable(m.members));
            } else if (active === "nodes") {
                root.append(scope(plural(Lx.nodes, "node"), ROW_HINT));
                root.append(nodesTable(null, state === "column-menu" ? "degree" : null));
            } else if (active === "edges") {
                root.append(scope(plural(Lx.edges, "edge"), ROW_HINT));
                root.append(edgesTable());
            } else if (active === "communities") {
                root.append(scope(plural(COMMUNITIES.length, "community", "communities")));
                root.append(communitiesTable());
            } else if (active === "pairs") {
                root.append(scope(plural(PAIRS.length, "pair"), "Selecting a pair selects its two nodes",
                    AB.openQuestion("How many pairs a run keeps, and whether pairs can be shown as dashed edges")));
                root.append(pairsTable());
            }
        };
        draw();
    }

    // withSlider false: the transfers table under the Data place, with the time slider not shown
    function transfersDock(root, withSlider) {
        const Tx = T();
        win.start = 9; win.len = 7;
        let active = "edges";
        const tabsOpen = [{ id: "nodes", label: "Nodes", icon: "circle-dot" }, { id: "edges", label: "Edges", icon: "spline" }];
        let tableHost = null;
        const drawTable = () => {
            if (!tableHost) return;
            tableHost.replaceChildren(active === "edges" ? transferEdges(withSlider) : transferNodes());
        };
        const draw = () => {
            root.replaceChildren(tabStrip("time-slider", tabsOpen, active, (t) => { active = t.id; draw(); }, withSlider ? "slider-options" : "transfers-options"));
            if (withSlider) root.append(timeSlider(() => AB.go("table-dock", "transfers"), drawTable));
            if (active === "edges") {
                root.append(scope(plural(Tx.edges, "edge"), null, withSlider ? AB.openQuestion("Whether the table lists only the window's transfers") : null));
            } else {
                root.append(scope(plural(Tx.nodes, "node"), null, h("span", { class: "k-secondary" }, "from the node file " + Tx.accountsFile)));
            }
            tableHost = h("div", { style: "display:contents" });
            root.append(tableHost);
            drawTable();
        };
        draw();
    }

    // ---------- the door entries (AB.fx.datasets.doorEntries), as loaded ----------
    // One edge per Pair, the unmatched rows left out. The fixture holds 8 sample rows per table, so
    // the tables list those: Nodes the people (a repeated key shows once) and the buildings; Edges
    // the preview's matched pairs, with count, earliest and latest as the Data page shows them.
    // The scope line gives the whole graph's counts.
    const DE = () => AB.fx.datasets.doorEntries;
    // The door-entries notes (notes-place's door-entries state): one about Ana Ruiz (1001) and B1, one
    // about the edge 1001 -> B1; B12's note reads missing, so it counts nowhere
    const DOOR_NOTES = { "1001": 1, B1: 1, "1001|B1": 1 };
    function doorNodes() {
        const [people, buildings] = DE().tables, seen = new Set();
        const rows = people.sample.filter((r) => !seen.has(r.id) && seen.add(r.id)).map((r) => ({ id: r.id, type: "person", name: r.name, dept: r.dept, site: "", floors: "", notes: DOOR_NOTES[r.id] || 0 }))
            .concat(buildings.sample.map((r) => ({ id: r.bldg, type: "building", name: "", dept: "", site: r.site, floors: r.floors, notes: DOOR_NOTES[r.bldg] || 0 })));
        const cols = [
            { key: "id", label: "id", type: "text", id: true },
            { key: "type", label: "type", type: "cat" },
            { key: "name", label: "name", type: "text", edit: true },
            { key: "dept", label: "dept", type: "cat", edit: true },
            { key: "site", label: "site", type: "cat", edit: true },
            { key: "floors", label: "floors", type: "num", n: true, edit: true },
        ];
        return table(cols, rows, { label: "Nodes", who: (r) => r.id, onRow: (r) => AB.flash("Selects " + r.id + " (not wired in the skeleton)") });
    }
    function doorEdges() {
        const D = DE(), ids = new Set(D.tables[0].sample.map((r) => r.id)), bldgs = new Set(D.tables[1].sample.map((r) => r.bldg)), pairs = new Map();
        const matched = D.tables[2].sample.filter((r) => ids.has(r.person_id) && bldgs.has(r.building_id));
        if (D.loaded.per === "row") {
            return table([{ key: "person_id", label: "person_id", type: "num", id: true }, { key: "building_id", label: "building_id", type: "cat", id: true }, { key: "time", label: "time", type: "time", cell: (r) => shortTime(r.time) }],
                matched, { /* per Row the pair note reads missing (the Data page warns), so no Notes column */ label: "Edges", who: (r) => r.person_id + " - " + r.building_id, onRow: (r) => AB.flash("Selects the edge " + r.person_id + " - " + r.building_id + " (not wired in the skeleton)") });
        }
        // One row per pair, from the same preview the Data page shows (data.preview under Pair), so the counts agree
        D.report.entries.pairSample.filter((r) => ids.has(r.person_id) && bldgs.has(r.building_id)).forEach((r) => {
            const k = r.person_id + "|" + r.building_id;
            pairs.set(k, { from: r.person_id, to: r.building_id, count: r.count, first: r.time, last: r["time (latest)"], notes: DOOR_NOTES[k] || 0 });
        });
        const cols = [
            { key: "from", label: "person_id", type: "num", id: true },
            { key: "to", label: "building_id", type: "cat", id: true },
            { key: "count", label: "count", type: "num", n: true },
            { key: "first", label: "time (earliest)", type: "time", cell: (r) => shortTime(r.first) },
            { key: "last", label: "time (latest)", type: "time", cell: (r) => shortTime(r.last) },
        ];
        return table(cols, [...pairs.values()], { sort: "count", label: "Edges", who: (r) => r.from + " - " + r.to, onRow: (r) => AB.flash("Selects the edge " + r.from + " - " + r.to + " (not wired in the skeleton)") });
    }
    function doorDock(root, state) {
        const D = DE(), [people, buildings] = D.tables;
        let active = state === "door-entries-nodes" ? "nodes" : "edges";
        const tabsOpen = [{ id: "nodes", label: "Nodes", icon: "circle-dot" }, { id: "edges", label: "Edges", icon: "spline" }];
        const draw = () => {
            root.replaceChildren(tabStrip("door-entries", tabsOpen, active, (t) => { active = t.id; draw(); }, "door-entries-options"));
            if (active === "edges") root.append(scope(plural(D.loadedEdges(), "edge"), ROW_HINT, h("span", { class: "k-secondary" }, "from " + D.tables[2].file + (D.loaded.per === "pair" ? ", one per person and building" : ", one per entry"))), doorEdges());
            else root.append(scope(plural(D.loadedTypes().person + D.loadedTypes().building, "node"), ROW_HINT, h("span", { class: "k-secondary" }, "from " + people.file + " and " + buildings.file)), doorNodes());
        };
        draw();
    }

    // ---------- menus drawn in the overlay region ----------
    function optionsMenu(el, time) {
        // time: null (no time attribute), "off" or "on"
        el.append(AB.menu({
            anchor: "#ab-dock [aria-label='Table options']", place: "below-end",
            items: [
                { label: "Show columns...", onClick: flash("Choosing the columns") },
                time === "door" ? { label: "Time slider", onClick: flash("The time slider over the entries' times") }
                : time ? { label: "Time slider", check: time === "on", go: ["table-dock", time === "on" ? "transfers" : "time-slider"] }
                    : { label: "Time slider", disabled: "This data has no time attribute" },
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
                    // The attribute's menu, word for word (context-menus "attribute"); only the last "Show in" differs
                    { heading: "degree" },
                    { label: "Color by", go: ["inspector-measure-row", "style"] },
                    { label: "Size by", go: ["inspector-measure-row", "style"] },
                    { label: "Label by", onClick: flash("Label by degree") },
                    { label: "Show as groups", disabled: "For a category or text column" },
                    { label: "Place by", needs: "graphty-element places nodes only by position attributes; an attribute as an axis needs a layout that reads any attribute" },
                    { sep: true },
                    { label: "Filter to...", go: ["data-place", "filters"] },
                    { label: "Create set where this is...", go: ["select-where", "where"] },
                    { sep: true },
                    { label: "Read as...", go: ["inspector-attribute-and-filter-step", "attribute"] },
                    { sep: true },
                    { label: "Show in Data", go: ["data-place", "attributes"] },
                ],
            }));
        } else if (state === "table-options") optionsMenu(el, null);
        else if (state === "transfers-options") optionsMenu(el, "off");
        else if (state === "slider-options") optionsMenu(el, "on");
        else if (state === "door-entries-options") optionsMenu(el, "door");
    }

    registerSection({
        id: "table-dock",
        title: "Table dock and time slider",
        region: "dock",
        closeTo: "table-dock/nodes",
        frame(state) {
            if (state === "transfers-options" || state === "slider-options") return { left: "data-place/at-rest", overlay: "table-dock/" + state };
            if (TRANSFERS[state] !== undefined) return { left: "data-place/at-rest" };
            if (state === "door-entries-options") return { dataset: "doorEntries", left: "graph-place/door-entries", overlay: "table-dock/" + state };
            if (state === "door-entries" || state === "door-entries-nodes") return { dataset: "doorEntries", left: "graph-place/door-entries" };
            if (state === "communities") return { left: "graph-place/louvain-open", right: "inspector-run-row/style" };
            if (state === "members-of-row") return { left: "graph-place/louvain-open", right: "inspector-group-set-path-row/community-3" };
            if (state === "column-menu" || state === "table-options") return { overlay: "table-dock/" + state };
            return {};
        },
        states: [
            { id: "nodes", label: "Nodes tab" },
            { id: "edges", label: "Edges tab" },
            { id: "communities", label: "Item tab (Louvain)" },
            { id: "members-of-row", label: "Members of a row (chip shown)" },
            { id: "column-menu", label: "Column header menu open" },
            { id: "table-options", label: "Table options menu" },
            { id: "pair-run", label: "Item tab of a pair run" },
            { id: "time-slider", label: "Time slider (transfers)" },
            { id: "transfers", label: "Transfers table (Data place)" },
            { id: "transfers-options", label: "Table options with a time attribute" },
            { id: "slider-options", label: "Table options, time slider on" },
            { id: "door-entries", label: "Door entries: Edges (one per pair)" },
            { id: "door-entries-nodes", label: "Door entries: Nodes (people and buildings)" },
            { id: "door-entries-options", label: "Table options, door entries" },
            { id: "closed", label: "Closed" },
        ],
        render(el, state, ctx) {
            if (ctx && ctx.region === "overlay") return overlay(el, state);
            dock(el, state);
        },
    });
})();
