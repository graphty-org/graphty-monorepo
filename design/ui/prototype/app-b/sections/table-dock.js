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
   - Adamic-Adar link prediction, the 8 highest-scoring unlinked pairs;
   - PageRank (unweighted, damping 0.85) for every node, and betweenness estimated from 20 source
     nodes with each node's lowest and highest rank over seeds 1 to 20 (the sampled-run state).
   The transfers accounts' links in and out and total amount in and out are recomputed from the
   seeded March data in kit/gen-canvas.mjs (the same generator that wrote the fixture rows).
   Ranks, the agreement line and the footer sum stand in for graphty-element: the app reads them.
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
/* the key column stays put while the others scroll sideways */
.td .k-table [data-frozen] { position: sticky; left: 0; z-index: 1; background: var(--cm-bg); box-shadow: inset -1px 0 0 var(--cm-border-strong); }
.td .k-table th[data-frozen] { z-index: 2; }
.td .k-table tr:hover td[data-frozen] { background: var(--cm-bg-hover); }
.td .k-table tr[aria-selected="true"] td[data-frozen] { background: var(--cm-bg-selected); }
.td .k-table td[data-refused] { outline: 2px solid var(--cm-border-danger-strong); outline-offset: -2px; }
.td-cols { flex: none; white-space: nowrap; }
.ab-pop .ab-fl-panel { max-height: min(420px, 50vh); overflow: auto; }
.td-label { display: none; }
.ab-main[data-dock="closed"] .td-label { display: inline-flex; }
.ab-main[data-dock="closed"] .td-toggle { display: none; }
.td-agree { display: flex; align-items: center; gap: 6px; padding: 0 8px; min-height: 24px; color: var(--cm-text); }
.td-pager { display: inline-flex; align-items: center; gap: 2px; margin-inline-start: auto; color: var(--cm-text-secondary); }
.td-foot { flex: none; display: flex; align-items: center; gap: 6px; min-height: 24px; padding: 0 8px; border-top: 1px solid var(--cm-border); color: var(--cm-text-secondary); }
.td-foot .k-num { color: var(--cm-text); }
.td-up { color: var(--cm-text-brand); }
.td-down { color: var(--cm-text-danger); }
.td-find input { width: 120px; font: inherit; color: inherit; background: transparent; border: 0; outline: 0; padding: 0; }
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
    // PageRank, unweighted, damping 0.85, in the fixture's row order (Valjean 0.0754, as the measure row shows)
    const PR = [0.0428,0.00558,0.0103,0.0103,0.00558,0.00558,0.00558,0.00558,0.00558,0.00558,0.00373,0.0754,0.00526,0.00373,0.00373,0.00373,0.0156,0.0126,0.0126,0.0126,0.0126,0.0126,0.0126,0.027,0.0195,0.0279,0.0206,0.0303,0.0116,0.0156,0.00541,0.00907,0.00373,0.00524,0.0124,0.0124,0.0124,0.0124,0.0124,0.00737,0.00343,0.0178,0.00631,0.00684,0.0062,0.00442,0.00527,0.00781,0.0358,0.015,0.00527,0.0163,0.00601,0.00392,0.00871,0.0309,0.00515,0.0175,0.0219,0.0159,0.0131,0.0159,0.0186,0.0172,0.019,0.0172,0.0145,0.0033,0.0167,0.0167,0.0166,0.0152,0.00684,0.00579,0.00579,0.0119,0.0107];
    // Betweenness estimated from 20 source nodes (networkx k=20, normalized): [value with seed 7, lowest rank, highest rank over seeds 1 to 20]
    const BT_SAMPLED = [[0.324,2,6],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.578,1,1],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0323,7,15],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.108,2,6],[0.0506,7,15],[0.0483,5,12],[0.0103,10,18],[0.0257,6,14],[0.0138,7,19],[0.00647,14,26],[0.0,32,35],[0.0047,12,26],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.00283,15,27],[0.0,32,35],[0.00567,13,23],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.0635,6,18],[0.161,2,5],[0.0317,11,21],[0.0,31,34],[0.0258,6,15],[0.0,31,34],[0.0,32,35],[0.0,32,35],[0.0944,3,6],[0.0,32,35],[0.016,6,18],[0.0411,6,12],[0.00163,28,29],[0.0,32,35],[0.00163,28,29],[0.00766,18,26],[0.00189,23,27],[0.031,8,15],[0.00189,23,27],[0.0,31,34],[0.0,32,35],[0.00681,19,26],[0.00681,19,26],[0.00598,20,28],[0.00563,23,30],[0.0,32,35],[0.0,32,35],[0.0,32,35],[0.000591,31,34],[0.0,32,35]];
    // The transfers' accounts on the Nodes tab (fixtures.json rows, file rows 381 to 420), counted on the full graph:
    // [links in, links out, total amount in, total amount out], recomputed from kit/gen-canvas.mjs's seeded March data
    const INOUT = [[0,15,0,68193.7],[0,14,0,49248.17],[0,14,0,51930.42],[0,12,0,42209.54],[0,11,0,36564.23],[0,5,0,17011.32],[0,7,0,30608.46],[0,6,0,29133.17],[0,4,0,16066.09],[0,14,0,43541.09],[1,1,5562.43,5.04],[2,1,9181.9,8.97],[1,1,1866.61,44.63],[2,2,8826.97,52.81],[1,1,213.39,349.71],[0,1,0,316.48],[1,2,2764.87,39.56],[1,3,204.63,691.35],[0,2,0,712.71],[1,2,4362.24,182.8],[3,2,9880.61,268.14],[0,2,0,198.82],[4,3,9714.07,632.04],[2,1,10409.95,401.24],[0,2,0,154.98],[1,1,3892.15,65.68],[2,2,5445.51,259.39],[1,2,5980.33,219.2],[1,4,5406.37,667.32],[1,2,1959.71,310.85],[0,3,0,305.01],[4,3,18090.66,160.52],[1,1,5952.89,382.58],[1,3,3599.88,371.06],[3,3,12011.47,79.15],[2,1,4938.02,162.7],[1,3,15.98,549.73],[2,3,5744.07,312.69],[0,3,0,377.64],[0,1,0,191.17]];
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
       the column menu state), cell(row), val(row) (the value sorted on, default row[key]), field (the
       attribute the column shows, default key), edit (true: double-click edits the value in place),
       int (whole numbers only: graphty-element refuses anything else), asc (a rank: the first click
       sorts ascending) }]. No two columns share a display name.
       The Notes column is added only when a row has a note. o.columns ({ ds, element }) lets the
       Columns button choose which attribute columns show (columnsView below); the first column is
       frozen when it is the key. o.ds names the project when there is no o.columns: on a directed
       graph every degree column must say in, out or total. o.sum ({ key, label, all: [rows, value] }) adds the footer: the sum
       of that column over the selected rows (Shift- or Ctrl-click adds a row), or over every row when
       none is selected. */
    function table(allCols, rows, o) {
        o = o || {};
        let sortKey = o.sort || null, dir = o.dir || -1;
        const wrap = h("div", { class: "k-table-wrap", role: "region", "aria-label": o.label || "Table" });
        const rowOf = new WeakMap();
        // The footer's sum, read from the rows marked selected (graphty-element computes it over the selection)
        const foot = o.sum ? h("div", { class: "td-foot", role: "status" }) : null;
        const sumUp = () => {
            if (!foot) return;
            const sel = [...wrap.querySelectorAll("tbody tr[aria-selected='true']")].map((tr) => rowOf.get(tr)).filter(Boolean);
            const [n, total] = sel.length ? [sel.length, sel.reduce((a, r) => a + Number(r[o.sum.key] || 0), 0)] : o.sum.all || [rows.length, rows.reduce((a, r) => a + Number(r[o.sum.key] || 0), 0)];
            foot.replaceChildren("Sum of " + o.sum.label + ", " + (sel.length ? "" : "all ") + AB.count(n, "row") + ":", h("span", { class: "k-num" }, AB.num(total)),
                ...(sel.length ? [] : [h("span", null, "(select rows to total them)")]), AB.needsElement("graphty-element sums a column over the current selection"));
        };
        wrap.foot = foot;
        const cv = o.columns ? columnsView(allCols, o.columns) : null;
        const valOf = (c, r) => (c.val ? c.val(r) : r[c.key]);
        const cellOf = (c, r) => (c.cell ? c.cell(r) : String(r[c.key]));
        const build = () => {
            let cols = cv ? cv.visible() : allCols;
            const names = cols.map((c) => c.label.toLowerCase());
            if (new Set(names).size < names.length) console.error("table-dock: two columns share one display name in " + (o.label || "a table") + ": " + names.join(", "));
            // On a directed graph a degree column says which way: in, out or total
            const ds = o.ds || (o.columns && o.columns.ds), vague = ds && AB.fx.datasets[ds] && AB.fx.datasets[ds].directed ? names.filter((n) => /degree|\blinks?\b/.test(n) && !/\b(in|out|total)\b/.test(n)) : [];
            if (vague.length) console.error("table-dock: a degree column on a directed graph does not say in, out or total in " + (o.label || "a table") + ": " + vague.join(", "));
            if (!o.raw && rows.some((r) => r.notes)) cols = cols.concat(notesCol); // raw records: a "notes" attribute is data, not a note count
            const tbody = h("tbody");
            // The rows are one Tab stop: the arrows, Home and End move between them (as the tree does)
            tbody.addEventListener("keydown", (e) => {
                const all = [...tbody.children], i = all.indexOf(e.target);
                if (i < 0) return;
                const to = all[{ ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 }[e.key]];
                if (!to) return;
                e.preventDefault();
                all.forEach((x) => (x.tabIndex = x === to ? 0 : -1));
                to.focus();
            });
            const heads = {};
            function editCell(td, c, r, who) {
                const old = r[c.key];
                const inp = h("input", { value: String(old), "aria-label": c.label + " of " + who });
                let done = false;
                const finish = (save) => {
                    if (done) return;
                    done = true;
                    const v = c.n ? Number(inp.value) : inp.value;
                    if (save && inp.value !== String(old) && c.int && !Number.isInteger(v)) refused(td, c, r, who, inp.value);
                    else if (save && inp.value !== String(old) && !(c.n && Number.isNaN(v))) {
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
                    const sc = cols.find((c) => c.key === sortKey) || { key: sortKey };
                    const x = valOf(sc, a), y = valOf(sc, b);
                    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1; // empty values last
                    return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
                }) : rows;
                tbody.replaceChildren(...sorted.map((r) => {
                    const who = o.who ? o.who(r) : "";
                    const tr = h("tr", { id: o.rowId ? "td-row-" + o.rowId(r) : null, tabindex: "-1", "data-who": who || cellText(cols[0], r), "data-member": r.member ? "" : null, "aria-selected": o.selected && o.selected(r) ? "true" : null },
                        cols.map((c, i) => {
                            const td = h("td", { class: (c.n ? "k-n " : "") + (c.id ? "k-id" : ""), "data-edit": c.edit ? "" : null, "data-frozen": i === 0 && c.id ? "" : null }, cellOf(c, r));
                            if (c.edit) td.addEventListener("dblclick", (e) => { e.stopPropagation(); editCell(td, c, r, who); });
                            if (o.refuse && o.refuse(r) && c.key === o.refuse.col) setTimeout(() => refused(td, c, r, who, o.refuse.typed), 0);
                            return td;
                        }));
                    rowOf.set(tr, r);
                    if (r.member) AB.tip(tr, "Inside the time window", { label: false });
                    if (o.onRow) {
                        // On an editable cell, wait out a double-click before opening the row
                        let wait = 0;
                        tr.addEventListener("click", (e) => {
                            if (e.target.closest("[role=button],[role=link],a,input")) return;
                            clearTimeout(wait);
                            if (e.detail > 1) return;
                            // the row is marked at once (Shift or Ctrl adds it); opening it waits out a double-click on an editable cell
                            const add = e.shiftKey || e.ctrlKey || e.metaKey;
                            if (!add) tr.parentNode.querySelectorAll("tr[aria-selected='true']").forEach((x) => x.removeAttribute("aria-selected"));
                            if (add && tr.getAttribute("aria-selected") === "true") tr.removeAttribute("aria-selected"); else tr.setAttribute("aria-selected", "true");
                            sumUp();
                            [...tr.parentNode.children].forEach((x) => (x.tabIndex = x === tr ? 0 : -1));
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
                const stop = tbody.querySelector("tr[aria-selected='true']") || tbody.firstElementChild;
                if (stop) stop.tabIndex = 0;
                sumUp();
                cols.forEach((c) => {
                    const th = heads[c.key];
                    if (!th) return;
                    th.querySelector(".td-sort").replaceChildren(sortKey === c.key ? arrow(dir < 0 ? "down" : "up") : "");
                    th.setAttribute("aria-sort", sortKey === c.key ? (dir < 0 ? "descending" : "ascending") : "none");
                });
            };
            // An attribute column of the wide and nested projects: the attribute's menu, as Data > Attributes opens it
            const gds = o.columns && ["wide", "nested"].includes(o.columns.ds) ? o.columns.ds : null;
            // The column menu is the attribute's own menu, minus Show in table (spec 11, Column menu)
            const fieldMenu = (c) => AB.attributeMenu(heads[c.key], gds, c.field, { noTable: true, editOn: ["data-page", gds === "wide" ? "edit-wide-hosts" : "edit-json-researchers"] });
            const openMenu = (c) => (c.menu ? AB.go("table-dock", "column-menu") : gds && c.generic ? fieldMenu(c) : flash("The " + c.label + " column menu")());
            const thead = h("tr", null, cols.map((c, i) => {
                // One Tab stop per header: the caret is for the pointer; the keyboard opens the menu from the header (Alt+Down, Shift+F10)
                const caret = AB.tip(h("span", Object.assign({ class: "td-caret", role: "button" }, AB.act({ onClick: () => openMenu(c) }), { tabindex: "-1" }), icon("chevron-down", "sm")), "Column menu", { key: "Alt+Down" });
                const th = h("th", { id: "td-col-" + c.key.replace(/[^A-Za-z0-9_-]/g, "_"), class: c.n ? "k-n" : null, scope: "col", tabindex: "0", "data-open": o.openMenu === c.key ? "" : null, "data-frozen": i === 0 && c.id ? "" : null },
                    h("span", { class: "td-th" }, c.type ? h("span", { class: "td-type" }, AB.typeGlyph(c.type)) : null, c.generic ? AB.truncMiddle(c.label, 28) : h("span", null, c.label), h("span", { class: "td-sort" }), caret));
                AB.tip(th, [c.type ? typeTitle[c.type] || null : null, c.profile].filter(Boolean).join(", ") || c.label, { label: false });
                const sort = () => { if (sortKey === c.key) dir = -dir; else { sortKey = c.key; dir = c.asc ? 1 : c.n ? -1 : 1; } fill(); };
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
            // named for its element, and when Columns hides some, how many of the table's columns show
            wrap.replaceChildren(h("table", { class: "k-table", "aria-label": (o.label || "Table") + (cv && cv.visible().length < cv.total ? ", " + cv.visible().length + " of " + cv.total + " columns shown" : "") }, h("thead", null, thead), tbody), ...(rows.length || !o.empty ? [] : [o.empty]));
            sumUp();
        };
        build();
        if (cv) { cv.onChange = build; wrap.colsButton = cv.button; }
        return wrap;
    }

    // A row's name for Find when the table has no `who`: its first cell's text
    function cellText(c, r) {
        const v = c.cell ? c.cell(r) : r[c.key];
        return [].concat(v).map((x) => (x && x.textContent != null ? x.textContent : String(x == null ? "" : x))).join("");
    }

    // A cell edit graphty-element refused (an attribute of whole numbers given a fraction): the cell
    // keeps its value, flashes, and the reason is the notice
    function refused(td, c, r, who, typed) {
        td.setAttribute("data-refused", "");
        setTimeout(() => td.removeAttribute("data-refused"), 1600);
        AB.notice("Not changed: " + c.label + " holds whole numbers, so " + who + " keeps " + r[c.key] + " (" + typed + " is not one)");
    }

    // ---------- Columns: which attribute columns a table view shows (spec section 6) ----------
    // A view setting, never a data change. Kept per project and side for this page view. The fields are
    // fieldsOf (the stand-in for graphty-element's session.data.attributes()); a hand-built column whose
    // field is not an attribute (an edge's ends, a computed degree) always shows.
    const shownCols = {}; // "<dataset>|<node|edge>" -> Set of field names shown
    let colsAt = null; // the table whose Columns button was drawn last: { ds, element, state, active }
    const sideFields = (ds, element) => {
        const seen = new Set();
        return AB.fieldsOf(ds).filter((g) => g.element === element).flatMap((g) => g.fields).filter((f) => !seen.has(f.name) && seen.add(f.name));
    };
    const keyNames = (ds, element) => sideFields(ds, element).filter((f) => f.usedBy === "Key").map((f) => f.name);
    const pathGet = (r, path) => path.split(".").reduce((x, k) => (x == null ? x : x[k]), r);
    function showValue(v, type) {
        if (v == null || v === "") return "";
        if (Array.isArray(v)) return "[" + v.length + "]";
        if (typeof v === "object") return "{...}";
        if (typeof v === "boolean") return v ? "yes" : "no";
        if (type === "time") return String(v).slice(0, 10);
        if (typeof v === "number") return Number.isInteger(v) && type !== "id" ? fmt(v) : String(v);
        return String(v);
    }
    function columnsView(cols, where) {
        const { ds, element } = where;
        const fields = sideFields(ds, element), names = new Set(fields.map((f) => f.name));
        const nameOf = (c) => c.field || c.key;
        const handBuilt = new Set(cols.map(nameOf));
        const k = ds + "|" + element;
        const locked = cols.filter((c) => c.id && names.has(nameOf(c))).map(nameOf).concat(keyNames(ds, element));
        if (!shownCols[k]) shownCols[k] = new Set(where.byDefault ? where.byDefault(fields).concat(locked) : cols.filter((c) => names.has(nameOf(c))).map(nameOf));
        const n = (f) => f.fill != null && f.fill < 1 ? Math.round(f.fill * 100) + "% have a value" : null;
        const generic = (f) => ({ key: f.name, field: f.name, generic: true, label: f.parent ? f.parent + "." + f.label : f.label, type: f.type, n: f.type === "num", id: locked.includes(f.name),
            profile: n(f), val: (r) => pathGet(r, f.name), cell: (r) => showValue(pathGet(r, f.name), /(^|_)(port|id|code|year)$/.test(f.name) ? "id" : f.type) }); // a port or a code: no thousands separator
        const cv = {
            ds, element, locked,
            shown: () => shownCols[k],
            visible() {
                const s = shownCols[k];
                const out = cols.filter((c) => !names.has(nameOf(c)) || s.has(nameOf(c))).concat(fields.filter((f) => !handBuilt.has(f.name) && s.has(f.name)).map(generic));
                // the key first, frozen
                return out.filter((c) => locked.includes(nameOf(c))).concat(out.filter((c) => !locked.includes(nameOf(c))));
            },
            // every hand-built column (two may read one field) plus the fields none of them reads
            total: cols.length + fields.filter((f) => !handBuilt.has(f.name)).length,
            onChange: null,
        };
        cv.button = AB.button("", { kind: "ghost", onClick: () => { colsAt = Object.assign({}, colsAt, { ds, element }); AB.go("table-dock", "columns"); } });
        cv.button.classList.add("td-cols");
        cv.button.setAttribute("aria-haspopup", "dialog");
        cv.label = () => { cv.button.textContent = "Columns: " + cv.visible().length + " of " + cv.total; };
        cv.refresh = () => { cv.label(); if (cv.onChange) cv.onChange(); };
        cv.label();
        live[k] = cv;
        return cv;
    }
    const live = {}; // the table on screen per "<dataset>|<side>", so the Columns popover redraws it in place

    // The scope line: the count; usage hints live in its tooltip
    function scope(text, hint, ...more) {
        const count = h("span", null, text);
        if (hint) AB.tip(count, text, { second: hint, label: false });
        return h("div", { class: "k-scope td-scope" }, count, ...more);
    }
    const ROW_HINT = "Shift-click a row: add it to the selection";

    // ---------- the tab strip ----------
    // colsBtn: the table's Columns button ("Columns: 8 of 69"), at the end of the strip; none on a run's item tab
    function tabStrip(state, tabsOpen, active, onPick, optionsState, colsBtn) {
        const list = h("span", { role: "tablist", class: "ab-tablist" });
        tabsOpen.forEach((t) => {
            // One Tab stop for the strip (arrows move); a closable tab closes with Delete. Its x is a
            // pointer shortcut with a 24 px target, not a second control inside the tab.
            const x = t.close ? h("span", { class: "td-tab-x", "aria-hidden": "true", "data-tip": "Close tab", "data-key": "Del", on: { click: (e) => { e.stopPropagation(); t.close(); } } }, icon("x", "sm")) : null;
            const el = h("span", { class: "k-tab td-tab", role: "tab", tabindex: t.id === active ? "0" : "-1", "aria-selected": String(t.id === active), "aria-keyshortcuts": t.close ? "Delete" : null }, t.icon ? icon(t.icon, "sm") : null, t.label, x);
            if (t.full) AB.tip(el, t.full, { label: false });
            // A tab of a collapsed dock opens it, the way the chevron does, on that tab
            const pick = () => { if (document.querySelector("#ab-main[data-dock='closed']")) AB.openDock(); onPick(t); };
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
        toggle.classList.add("td-toggle");
        // Collapsed, the strip says what it is: "Table", its own way back open (the chevron gives way to it)
        const label = AB.button("Table", { kind: "ghost", icon: "chevron-up", key: "Shift+T", tip: "Show table", onClick: () => (current() ? AB.go("table-dock", "nodes") : AB.toggleDock()) });
        label.classList.add("td-label");
        return h("div", { class: "k-dock-tabs td-tabs" }, label, list, h("span", { class: "k-grow" }), colsBtn || null,
            AB.iconButton(AB.ICON.options, "Table options", typeof optionsState === "function" ? { onClick: optionsState } : { go: ["table-dock", optionsState || "table-options"] }),
            toggle);
    }

    // ---------- the row menu (spec section 6) ----------
    // The node's context menu word for word, minus Show in table (the edge's on the Edges tab), named
    // for the row right-clicked. Remove from data (graphty-element's removeNodes, or removeEdges) acts
    // at once: the row leaves the table and the notice offers Undo. Opened as the overlay state
    // row-menu over the table on screen, as Columns is.
    const removed = new Set(); // "node|Valjean", "edge|Javert|Valjean"
    let rowAt = null; // the row whose menu shows: { state, active, kind, name, id, key }
    let redraw = null; // the Les Miserables dock on screen, so Undo puts the row back in place
    let back = false; // closing the row menu: the table behind keeps its rows but replays no notice of its own
    const ROW_DEFAULT = { state: "nodes", active: "nodes", kind: "node", name: "Valjean", id: "Valjean", key: "node|Valjean" };
    const safeId = (s) => s.replace(/[^A-Za-z0-9]/g, "");
    const nodeGone = (label) => removed.has("node|" + label);
    const edgeGone = (r) => removed.has("edge|" + r.source + "|" + r.target) || nodeGone(r.source) || nodeGone(r.target);
    // What a removal leaves (graphty-element reports the counts; the fixture's degree stands in)
    function liveCounts() {
        const Lx = L(), nodes = Lx.rows.filter((r) => nodeGone(r.label));
        const edges = EDGES.filter(([a, b]) => removed.has("edge|" + a + "|" + b) && !nodeGone(a) && !nodeGone(b)).length;
        return { nodes: Lx.nodes - nodes.length, edges: Lx.edges - edges - nodes.reduce((a, r) => a + r.degree, 0) };
    }
    function openRowMenu(kind, r) {
        const c = colsAt || ROW_DEFAULT;
        rowAt = kind === "node" ? { state: c.state, active: c.active, kind, name: r.label, id: safeId(r.label), key: "node|" + r.label }
            : { state: c.state, active: c.active, kind, name: r.source + " -- " + r.target, id: "e-" + safeId(r.source) + "-" + safeId(r.target), key: "edge|" + r.source + "|" + r.target };
        AB.go("table-dock", "row-menu");
    }
    function rowMenu(el) {
        const c = rowAt || ROW_DEFAULT, C = AB.cmd;
        const done = (text, action) => ({ onClick: () => { back = true; AB.close(); setTimeout(() => AB.notice(text, action), 0); } });
        const later = (label) => done(label + " (not wired in the skeleton)");
        const what = c.kind === "node" ? c.name + " and " + (c.name === "Valjean" ? "his" : "its") + " edges" : "the edge " + c.name;
        const remove = { label: "Remove from data", desc: "Removes it from the data, not only from the canvas; Undo puts it back", onClick: () => {
            removed.add(c.key);
            back = true;
            AB.close();
            setTimeout(() => AB.deleted(what, () => { removed.delete(c.key); if (redraw) redraw(); }), 0);
        } };
        const items = c.kind === "node" ? [
            { heading: c.name },
            C("neighborhood"),
            C("find-paths", { disabled: "Select a second node first" }),
            { sep: true },
            C("analyze"),
            { sep: true },
            C("create-set"),
            { label: "Add to set...", ...later("Add to set") },
            c.name === "Valjean" ? { label: "Remove from Watchlist", ...done("Removed Valjean from Watchlist", { label: "Undo", onClick: () => AB.announce("Valjean is back in Watchlist") }) } : null,
            { sep: true },
            C("frame-selection"),
            { sep: true },
            { toggle: ["Unpin", "Pin"], on: false, desc: "Pinned nodes stay put when the layout runs", ...later("Pin") },
            C("hide-on-canvas"),
            remove,
            { sep: true },
            C("add-note"),
        ] : [
            { heading: c.name },
            { label: "Select endpoints", go: ["inspector-several-elements", "two-nodes"] },
            { sep: true },
            C("hide-on-canvas"),
            remove,
            { sep: true },
            C("add-note"),
        ];
        el.append(AB.menu({ anchor: "#td-row-" + c.id, place: "above-start", label: c.name, items: items.filter(Boolean) }));
    }

    // ---------- Les Miserables tables ----------
    const L = () => AB.fx.datasets.lesmis;
    const nodeRow = (label) => L().rows.find((r) => r.label === label);
    const groupColor = (g) => L().groupColors[g] || AB.fx.canvas.nodeGray;
    const openNode = (r, e) => (e && (e.shiftKey || e.metaKey || e.ctrlKey) ? AB.go("inspector-several-elements", "two-nodes") : AB.selectNode("lesmis", L().rows.findIndex((x) => x.label === r.label)));

    /* Ranks, as the measure row writes them: an exact measure ranks by its shown value (3 significant
       digits) and marks a rank shared at that precision "2="; an estimate shows its rank range "#3-#5".
       Each node: { rank (sorts), text }. graphty-element returns ranks with a run's result. */
    function exactRanks(vals) {
        const shown = vals.map((v) => AB.num(v));
        return vals.map((v, i) => {
            const r = 1 + vals.filter((o, j) => o > v && shown[j] !== shown[i]).length;
            return { rank: r, worst: r, text: String(r) + (shown.some((x, j) => j !== i && x === shown[i]) ? "=" : "") };
        });
    }
    const rangeRanks = (pairs) => pairs.map(([lo, hi]) => ({ rank: lo, worst: hi, text: lo === hi ? "#" + lo : "#" + lo + "-#" + hi }));

    // The Les Miserables measures that have finished, in the tree's order, each over every node
    function lesmisMeasures(sampled) {
        const Lx = L();
        const deg = Lx.rows.map((r) => r.degree), bt = sampled ? BT_SAMPLED.map((x) => x[0]) : Lx.rows.map((r) => r.betweenness);
        return [
            { key: "degree", name: "Degree", vals: deg, ranks: exactRanks(deg) },
            { key: "pagerank", name: "PageRank", vals: PR, ranks: exactRanks(PR) },
            { key: "betweenness", name: "Betweenness", vals: bt, ranks: sampled ? rangeRanks(BT_SAMPLED.map((x) => [x[1], x[2]])) : exactRanks(bt) },
        ];
    }
    // One line once two or more measures have run: who is near the top on all of them, from the ranks
    // graphty-element returns ("Valjean ranks first on all three measures; Gavroche is in the top 3 on all three")
    function agreementLine(ms) {
        const Lx = L(), words = { 2: "both", 3: "all three", 4: "all four" }, all = words[ms.length] || "all " + ms.length;
        const worst = Lx.rows.map((r, i) => Math.max(...ms.map((m) => m.ranks[i].worst)));
        const order = worst.map((w, i) => [w, i]).sort((a, b) => a[0] - b[0]);
        const best = order[0][0], tops = order.filter((x) => x[0] === best).map((x) => Lx.rows[x[1]].label);
        const next = order.find((x) => x[0] > best);
        const say = (names, k) => names.join(" and ") + (names.length > 1 ? " are" : " is") + (k === 1 ? " first" : " in the top " + k) + " on " + all + " measures";
        const line = say(tops, best) + (next ? "; " + say([Lx.rows[next[1]].label], next[0]).replace(/ measures$/, "") : "");
        return h("div", { class: "td-agree", role: "note" }, h("span", null, line), AB.needsElement("graphty-element compares the finished rankings and names who agrees"));
    }

    function nodesTable(members, openMenu, o) {
        o = o || {};
        const Lx = L();
        const ms = lesmisMeasures(o.sampled);
        const at = (members ? members.map((m) => Lx.rows.findIndex((r) => r.label === m)) : Lx.rows.map((_, i) => i)).filter((i) => !nodeGone(Lx.rows[i].label));
        const rows = at.map((i) => {
            const r = Lx.rows[i], x = { label: r.label, group: r.group, notes: NODE_NOTES[r.label] || 0 };
            ms.forEach((m) => { x[m.key] = m.vals[i]; x[m.key + "Rank"] = m.ranks[i]; });
            return x;
        });
        const total = AB.count(Lx.nodes, "node");
        // A result column names its scope and method; a ranking adds its rank column beside its score
        const score = (key, label, profile) => ({ key, label, type: "num", n: true, profile, cell: (r) => AB.num(r[key]) });
        const rank = (m, label, profile) => ({ key: m.key + "Rank", label, type: "num", n: true, asc: true, profile, val: (r) => r[m.key + "Rank"].rank, cell: (r) => r[m.key + "Rank"].text });
        const bt = ms[2];
        const cols = [
            { key: "label", label: "label", type: "text", id: true, edit: true, profile: AB.num(Lx.nodes) + " values" },
            { key: "group", label: "group", type: "cat", edit: true, profile: Object.keys(Lx.groupColors).length + " values", cell: (r) => [AB.chit(groupColor(r.group)), String(r.group)] },
            Object.assign(score("degree", "Degree (full graph)", "Links per node, on all " + total + ", 1 to " + Lx.stats.maxDegree), { menu: true }),
            score("pagerank", "PageRank (full graph)", "Damping 0.85, exact, on all " + total),
            rank(ms[1], "Rank by PageRank", "1 is highest; equal at 3 significant digits shares a rank, marked ="),
            o.sampled ? score("betweenness", "Betweenness (estimate, 20 sources)", "Estimated from 20 source nodes, seed 7; each value may move between runs")
                : score("betweenness", "Betweenness (full graph)", "Exact, every node a source, on all " + total),
            rank(bt, o.sampled ? "Rank range by betweenness" : "Rank by betweenness", o.sampled ? "The lowest and highest rank this node takes over 20 seeded runs" : "1 is highest; equal at 3 significant digits shares a rank, marked ="),
        ];
        // The measure the table is sorted by leads, right after the key and group, its rank beside it
        if (o.sampled) cols.splice(2, 0, ...cols.splice(5, 2));
        const t = table(cols, rows, { sort: o.sort || "degree", dir: o.dir, label: "Nodes", openMenu, columns: { ds: "lesmis", element: "node" }, empty: o.empty, onRow: openNode, who: (r) => r.label, rowId: (r) => safeId(r.label),
            onRowMenu: (r) => openRowMenu("node", r) });
        t.agree = members ? null : agreementLine(ms);
        return t;
    }

    function edgesTable(o) {
        const rows = EDGES.map(([a, b, v]) => ({ source: a, target: b, value: v, notes: EDGE_NOTES[a + "|" + b] || 0 })).filter((r) => !edgeGone(r));
        // A cell edit that went through: one undoable step (graphty-element's updateEdges), its notice offers Undo
        if (o && o.edited && rows.find(REFUSE)) {
            const r = rows.find(REFUSE), old = r.value;
            r.value = old + 1;
            setTimeout(() => AB.notice("Changed value of " + r.source + " - " + r.target + " from " + old + " to " + r.value, { label: "Undo", onClick: () => AB.go("table-dock", "edges") }), 0);
        }
        const cols = [
            { key: "source", label: "source", type: "text", id: true },
            { key: "target", label: "target", type: "text", id: true },
            { key: "value", label: "value", type: "num", n: true, int: true, edit: true, profile: "chapters shared, 1 to 31" },
        ];
        return table(cols, rows, { sort: "value", label: "Edges", columns: { ds: "lesmis", element: "edge" }, refuse: o && o.refuse, selected: o && (o.refuse || (o.edited && REFUSE)), who: (r) => r.source + " - " + r.target, rowId: (r) => "e-" + safeId(r.source) + "-" + safeId(r.target),
            onRow: () => AB.go("inspector-edge", "style"), onRowMenu: (r) => openRowMenu("edge", r) });
    }

    function communitiesTable() {
        const rows = COMMUNITIES.map((c) => ({ c, n: c.n, size: c.size, density: c.density, inside: c.inside, leaving: c.leaving, notes: c.notes || 0 }));
        const cols = [
            { key: "n", label: "community", type: "cat", cell: (r) => [AB.chit(r.c.color, true), "Community " + r.n] },
            { key: "size", label: "size", type: "num", n: true, profile: "6 to 25" },
            { key: "density", label: "density", type: "num", n: true, profile: "0.147 to 1", cell: (r) => AB.num(r.density) },
            { key: "inside", label: "edges inside", type: "num", n: true },
            { key: "leaving", label: "edges leaving", type: "num", n: true },
        ];
        return table(cols, rows, { sort: "size", label: RUN.label, onRow: (r) => AB.go("inspector-group-set-path-row", "community-" + r.n), onRowMenu: () => AB.go("context-menus", "row") });
    }

    function pairsTable() {
        const rows = PAIRS.map(([a, b, s, k]) => ({ a, b, score: s, common: k }));
        const cols = [
            { key: "a", label: "first node", type: "text", id: true },
            { key: "b", label: "second node", type: "text", id: true },
            { key: "score", label: "Adamic-Adar score (full graph)", type: "num", n: true, cell: (r) => AB.num(r.score) },
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

    // An edge table: the two ends, then the time, then the other columns; the footer sums amount.
    // o.rows: transfers as { source, target, amount, timestamp } (a path's), all selected; default the file's first rows
    function transferEdges(windowed, o) {
        o = o || {};
        const Tx = T();
        const src = o.rows || Tx.firstRows.map((r) => ({ source: r.from_account, target: r.to_account, amount: r.amount, timestamp: r.timestamp }));
        const rows = src.map((r) => ({ from: r.source, to: r.target, amount: Number(r.amount), timestamp: r.timestamp, member: windowed && inWindow(r.timestamp) }));
        const cols = [
            { key: "from", field: "from_account", label: "from_account", type: "text", id: true },
            { key: "to", field: "to_account", label: "to_account", type: "text", id: true },
            { key: "timestamp", label: "timestamp", type: "time", profile: "Mar 1 to Mar 31", cell: (r) => shortTime(r.timestamp) },
            { key: "amount", label: "amount", type: "num", n: true, edit: true, cell: (r) => AB.num(r.amount) },
        ];
        const total = Tx.attributes.find((a) => a.name === "amount (edge)").total;
        return table(cols, rows, { label: "Edges", columns: { ds: "transactions", element: "edge" }, who: (r) => r.from + " - " + r.to, selected: o.rows ? () => true : null,
            sum: { key: "amount", label: "amount", all: o.rows ? null : [Tx.edges, total] },
            onRow: (r) => AB.flash("Selects the transfer " + r.from + " - " + r.to + " (not wired in the skeleton)") });
    }
    // Rows a to b of n, and the page arrows: graphty-element pages and sorts the whole table, the skeleton holds one page
    function pager(from, to, total) {
        const say = () => AB.flash("Shows the next rows (the skeleton holds one page)");
        return h("span", { class: "td-pager" }, h("span", { class: "k-num" }, "Rows " + AB.num(from) + " to " + AB.num(to) + " of " + AB.num(total)),
            AB.iconButton("chevron-left", "Previous rows", { onClick: say }), AB.iconButton("chevron-right", "Next rows", { onClick: say }),
            AB.needsElement("graphty-element pages the rows and sorts every row by any column, results included, so a large graph never blocks the table"));
    }
    function transferNodes() {
        const Tx = T();
        const rows = Tx.rows.map((r, i) => ({ id: r.id, kind: r.kind, country: r.country, riskScore: r.riskScore, flagged: r.flagged ? "yes" : "no", degree: r.degree,
            linksIn: INOUT[i][0], linksOut: INOUT[i][1], amountIn: INOUT[i][2], amountOut: INOUT[i][3] }));
        const risk = Tx.attributes.find((a) => a.name === "riskScore");
        const all = AB.count(Tx.nodes, "account");
        // On a directed graph every degree says which way; a weighted one is named from its column ("Total amount in")
        const res = (key, label, profile) => ({ key, label, type: "num", n: true, profile: profile + ", on all " + all, cell: (r) => AB.num(r[key]) });
        const cols = [
            { key: "id", field: "id (account)", label: "id", type: "text", id: true, profile: fmt(Tx.nodes) + " values" },
            // The three link counts lead, side by side, so in, out and total read together
            res("linksIn", "Links in (count, full graph)", "Transfers received"),
            res("linksOut", "Links out (count, full graph)", "Transfers sent"),
            res("degree", "Links total (count, full graph)", "Transfers sent and received, 1 to " + fmt(Tx.stats.maxDegree)),
            { key: "kind", label: "kind", type: "cat", edit: true, profile: "3 values" },
            { key: "country", label: "country", type: "cat", edit: true },
            { key: "riskScore", label: "riskScore", type: "num", n: true, edit: true, profile: risk.range[0] + " to " + risk.range[1] },
            { key: "flagged", label: "flagged", type: "bool", edit: true },
            res("amountIn", "Total amount in (full graph)", "The sum of amount over transfers received"),
            res("amountOut", "Total amount out (full graph)", "The sum of amount over transfers sent"),
        ];
        return table(cols, rows, { sort: "degree", label: "Nodes", columns: { ds: "transactions", element: "node" }, who: (r) => r.id, onRow: (r) => AB.flash("Selects " + r.id + " (not wired in the skeleton)") });
    }
    // March against April: each busiest merchant's links total in both months and the signed change, colored by sign
    function changesTable() {
        const Tx = T(), A = AB.fx.datasets.transactionsApril, april = new Map(A.rows.map((r) => [r.id, r]));
        const rows = Tx.topByDegree.filter((r) => april.has(r.id)).map((r) => ({ id: r.id, kind: r.kind, country: r.country, march: r.degree, april: april.get(r.id).degree, change: april.get(r.id).degree - r.degree }));
        const signed = (v) => h("span", { class: v > 0 ? "td-up" : v < 0 ? "td-down" : null }, (v > 0 ? "+" : "") + AB.num(v));
        const cols = [
            { key: "id", label: "id", type: "text", id: true },
            { key: "kind", label: "kind", type: "cat" },
            { key: "country", label: "country", type: "cat" },
            { key: "march", label: "Links total (count, March)", type: "num", n: true, cell: (r) => AB.num(r.march) },
            { key: "april", label: "Links total (count, April)", type: "num", n: true, cell: (r) => AB.num(r.april) },
            { key: "change", label: "Change in links total", type: "num", n: true, profile: "April minus March; sorts by the signed value", cell: (r) => signed(r.change) },
        ];
        return table(cols, rows, { sort: "march", label: "Nodes", ds: "transactions", who: (r) => r.id, onRow: (r) => AB.flash("Selects " + r.id + " (not wired in the skeleton)") });
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
    const TRANSFERS = { "time-slider": true, "slider-options": true, transfers: false, "transfers-nodes": false, "transfers-options": false, "path-members": false, changes: false };

    /* Find (Ctrl+F while the table has focus): a find chip on the scope line. Each keystroke lands on
       the first row whose name matches (word starts, AB.wordMatch), selects it and scrolls it into
       view with the key column and every result column beside it; Enter goes to the next match, Esc
       closes the find. No match: the one empty line. */
    function openFind(root, q) {
        const line = root.querySelector(".td-scope");
        if (!line) return;
        const old = line.querySelector(".td-find");
        if (old) { old.querySelector("input").focus(); return; }
        const input = h("input", { type: "search", "aria-label": "Find in table", placeholder: "Find in table", value: q || "" });
        const none = h("span");
        let at = -1;
        const close = () => { chip.remove(); const tr = root.querySelector("tbody tr[aria-selected='true']") || root.querySelector("tbody tr"); if (tr) tr.focus(); };
        const x = AB.tip(h("span", Object.assign({ class: "td-tab-x", role: "button" }, AB.act({ onClick: close })), icon("x", "sm")), "Clear find");
        const chip = h("span", { class: "td-chip td-find" }, icon("search", "sm"), input, x, none);
        const land = (step) => {
            const v = input.value.trim(), trs = [...root.querySelectorAll("tbody tr[data-who]")];
            const hits = v ? trs.filter((tr) => AB.wordMatch(tr.dataset.who, v) || tr.dataset.who.toLowerCase().includes(v.toLowerCase())) : [];
            none.replaceChildren(v && !hits.length ? AB.noMatch(v) : "");
            if (!hits.length) return;
            at = step ? (at + 1) % hits.length : 0;
            const tr = hits[at], wrap = tr.closest(".k-table-wrap"), head = wrap.querySelector("thead");
            trs.forEach((r) => r.removeAttribute("aria-selected"));
            tr.setAttribute("aria-selected", "true");
            wrap.scrollTop = tr.offsetTop - (head ? head.offsetHeight : 0) - 4;
            wrap.scrollLeft = wrap.scrollWidth; // the key stays frozen at the left; the result columns, last, come into view
            AB.announce(tr.dataset.who + ", " + (at + 1) + " of " + hits.length);
        };
        input.addEventListener("input", () => land(false));
        input.addEventListener("keydown", (e) => {
            e.stopPropagation();
            if (e.key === "Enter") { e.preventDefault(); land(true); }
            if (e.key === "Escape") { e.preventDefault(); close(); }
        });
        line.append(chip);
        input.focus();
        if (q) land(false);
    }

    // ---------- the dock ----------
    // The dock state a Columns popover opens over (an overlay state draws its dock as this one)
    const BASE = { "column-menu": "nodes", "table-options": "nodes", "transfers-options": "transfers", "slider-options": "time-slider", "door-entries-options": "door-entries", "wide-columns": "wide" };
    // A route that shows a misspelled find with no match (Find, Ctrl+F, searches the table when it has focus)
    const NO_MATCH = "Jondrete";
    // A route that shows Find landing on a row: the row selected, every result column beside it
    const FIND = "Javert";
    // The edit graphty-element refuses: the edge Javert - Valjean, value 17, typed 17.5 (value holds whole numbers)
    const REFUSE = Object.assign((r) => r.source === "Javert" && r.target === "Valjean", { col: "value", typed: "17.5" });

    function dock(el, state, active0) {
        // Old link: Remove from data no longer asks
        if (state === "remove-confirm") { setTimeout(() => AB.go("table-dock", "nodes"), 0); return; }
        // A path's members are edges: the route names the state that shows them
        if (state === "members-of-row" && pathOpen) { pathOpen = false; setTimeout(() => location.replace(AB.href("table-dock", "path-members")), 0); return; }
        if (current()) {
            const main = document.getElementById("ab-main");
            if (main && main.dataset.dock !== "none") main.dataset.dock = state === "closed" ? "closed" : "open";
        }
        // The Columns popover draws over the table it was opened from
        if (state === "columns") { const c = colsAt || { state: "nodes" }; state = c.state; active0 = c.active; }
        // The row menu draws over the table it was opened from
        if (state === "row-menu") { const c = rowAt || ROW_DEFAULT; state = c.state; active0 = c.active; }
        const quiet = back;
        back = false;
        state = BASE[state] || state;
        const root = h("div", { class: "td" });
        // Find (Ctrl+F) searches the table when it has focus
        root.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); openFind(root); } });
        el.append(root);
        // remember the table on screen, so Columns opens over it and Esc comes back to it
        const at = (active, ds) => { colsAt = { state, active, ds: ds || (AB.route && AB.route.frame.dataset) || "lesmis" }; };

        if (TRANSFERS[state] !== undefined) return transfersDock(root, TRANSFERS[state], active0, at, state);
        if (/^door-entries/.test(state)) return doorDock(root, state, active0, at);
        if (state === "wide") return wideDock(root, active0, at);

        let members = state === "members-of-row" ? COMMUNITIES[2] : null;
        const pairTab = { id: "pairs", label: PAIR_RUN.label, full: PAIR_RUN.full, icon: PAIR_RUN.icon, close: () => AB.go("table-dock", "communities") };
        const tabsOpen = [
            { id: "nodes", label: "Nodes", icon: "circle-dot" },
            { id: "edges", label: "Edges", icon: "spline" },
            { id: "communities", label: RUN.label, full: RUN.full, icon: RUN.icon, close: () => AB.go("table-dock", "nodes") },
        ].concat(state === "pair-run" ? [pairTab] : []);
        let active = active0 || { edges: "edges", "edit-refused": "edges", edited: "edges", communities: "communities", "pair-run": "pairs" }[state] || "nodes";

        const draw = () => {
            if (!root.isConnected && redraw === draw) return;
            redraw = draw;
            at(active, "lesmis");
            const strip = (t) => tabStrip(state, tabsOpen, active, (x) => {
                if (current()) { AB.go("table-dock", x.id === "pairs" ? "pair-run" : x.id); return; }
                active = x.id; members = null; draw();
            }, null, t && t.colsButton);
            if (state === "closed" && current()) return root.replaceChildren(strip(null));
            const Lx = L();
            let t;
            if (active === "nodes" && members) {
                const m = members;
                const x = AB.tip(h("span", { class: "td-tab-x", role: "button", tabindex: "0" }, icon("x", "sm")), "Show all nodes");
                AB.nav(x, "table-dock", "nodes");
                t = nodesTable(m.members);
                root.replaceChildren(strip(t), h("div", { class: "k-scope td-scope" }, h("span", { class: "td-chip" }, AB.chit(m.color, true), "Community " + m.n, x), h("span", null, AB.count(m.size, "node", { of: Lx.nodes }))), t);
            } else if (active === "nodes" && state === "no-match") {
                // Find over the table matched no row: the find chip, the headers kept, the one empty line
                const x = AB.tip(h("span", { class: "td-tab-x", role: "button", tabindex: "0" }, icon("x", "sm")), "Clear find");
                AB.nav(x, "table-dock", "nodes");
                t = nodesTable([], null, { empty: AB.noMatch(NO_MATCH) });
                root.replaceChildren(strip(t), h("div", { class: "k-scope td-scope" }, h("span", { class: "td-chip" }, icon("search", "sm"), "Find: " + NO_MATCH, x), h("span", null, AB.count(0, "node", { of: Lx.nodes }))), t);
            } else if (active === "nodes") {
                // Sorted by one measure, the other measures beside it: the ranking view (no separate top-N table)
                const sampled = state === "sampled";
                t = nodesTable(null, state === "column-menu" ? "degree" : null, sampled ? { sampled, sort: "betweennessRank", dir: 1 } : null);
                root.replaceChildren(strip(t), scope(plural(liveCounts().nodes, "node"), ROW_HINT), t.agree, t);
                if (state === "find") setTimeout(() => openFind(root, FIND), 0);
            } else if (active === "edges") {
                t = edgesTable(quiet ? null : state === "edit-refused" ? { refuse: REFUSE } : state === "edited" ? { edited: true } : null);
                root.replaceChildren(strip(t), scope(plural(liveCounts().edges, "edge"), ROW_HINT), t);
            } else if (active === "communities") {
                root.replaceChildren(strip(null), scope(plural(COMMUNITIES.length, "community", "communities")), communitiesTable());
            } else if (active === "pairs") {
                root.replaceChildren(strip(null), scope(plural(PAIRS.length, "pair"), "Selecting a pair selects its two nodes",
                    AB.openQuestion("How many pairs a run keeps, and whether pairs can be shown as dashed edges")), pairsTable());
            }
        };
        draw();
    }

    // ---------- the wide, nested and plain JSON projects (kit/wide-nested.json) ----------
    // The shell sends all three here (DATASET_FRAME); the project is AB.route.frame.dataset. Every
    // column is an attribute: by default the key (frozen) and the attributes in use show; Columns adds
    // the rest. Values: a list reads [n], a sub-object kept whole {...}, an empty value is blank.
    function recordsOf(ds, element) {
        const D = AB.fx.datasets[ds];
        if (ds === "wide") return element === "node" ? D.nodeRows : D.edgeRows;
        if (ds === "plainJson") return element === "node" ? D.document.nodes : D.document.links;
        if (element === "edge") return nestedEdges(D);
        return Object.keys(D.recordArrays).filter((a) => !/^links/.test(a)).flatMap((a) => pathGet(D.document, a.replace(/\[\]$/, "")) || []);
    }
    // The nested project's edges as the last Load made them (AB.nestedLoaded): every edge type in one
    // table, its type in the first column, as the door entries' Nodes table lists its node types
    function nestedEdges(D) {
        const NL = AB.nestedLoaded(), R = D.document.data.researchers, out = [];
        if (NL.researchers && NL.co === "edges") {
            const seen = new Set();
            R.forEach((r) => r.relationships.coauthor_ids.forEach((c) => {
                const k = [r.id, c].sort().join("|");
                if (NL.coPer === "item" || !seen.has(k)) { seen.add(k); out.push({ edgeType: "coauthor", source: r.id, target: c }); }
            }));
        }
        if (NL.researchers && NL.aff === "rows") R.forEach((r) => r.attributes.affiliations.forEach((a) => out.push({ edgeType: "affiliation", source: r.id, target: a.institution_id, role: a.role, since: a.since, current: a.current })));
        if (NL.researchers) (NL.idLinks || []).forEach((x) => { const ids = new Set((x.target === "institution" ? D.document.data.institutions : R).map((y) => y.id)); R.forEach((r) => { const v = pathGet(r, x.col); if (ids.has(v)) out.push({ edgeType: x.name, source: r.id, target: v }); }); });
        if (NL.links) D.document.links.forEach((l) => out.push(Object.assign({ edgeType: "link" }, l)));
        return out;
    }
    function wideTable(ds, element) {
        const rows = recordsOf(ds, element);
        const who = (r) => (element === "node" ? AB.nameOf(ds, r) : r.source + " - " + r.target);
        // A node row selects that node, as the canvas walk does (the inspector reads the walked row)
        const walkAt = (r) => (ds === "wide" ? AB.fx.datasets.wide.nodeRows.indexOf(r) : AB.fx.datasets.nested.document.data.researchers.indexOf(r));
        const open = ds === "plainJson" ? (r) => AB.flash("Selects " + who(r) + " (not wired in the skeleton)")
            : element === "node" ? (r) => (walkAt(r) >= 0 ? AB.selectNode(ds, walkAt(r)) : AB.flash("Selects " + who(r) + " (an institution has no inspector state in the skeleton)"))
                : ds === "wide" ? () => AB.go("inspector-edge", "wide-data") : (r) => AB.flash("Selects the edge " + who(r) + " (not wired in the skeleton)");
        const typeCol = ds === "nested" && element === "edge" ? [{ key: "edgeType", label: "edge type", type: "cat", val: (r) => r.edgeType, cell: (r) => r.edgeType }] : [];
        // A Name built from several fields is one column, the Name; its parts stay in Columns, unchecked
        const parts = ds === "nested" && element === "node" ? Object.values(AB.nestedLoaded().name || {}) : [];
        const joined = parts.some((p) => p.length > 1), nameParts = parts.flat();
        const nameCol = joined ? [{ key: "Name", label: "Name", type: "cat", val: who, cell: who }] : [];
        // By default the key and the attributes in use, then the file's next columns until 8 show (studio
        // decision: a wide table never opens on two columns); Columns shows or hides any of them
        const byDefault = (fields) => {
            const ok = fields.filter((f) => !(joined && nameParts.includes(f.name)));
            const used = ok.filter((f) => f.usedBy), room = Math.max(0, 8 - typeCol.length - nameCol.length - used.length);
            return used.concat(ok.filter((f) => !f.usedBy).slice(0, room)).map((f) => f.name);
        };
        return table(typeCol.concat(nameCol), rows, { raw: true, label: element === "node" ? "Nodes" : "Edges", who, onRow: open, columns: { ds, element, byDefault } });
    }
    function wideDock(root, active0, at) {
        const ds = (AB.route && AB.route.frame.dataset) || "wide";
        const ok = ["wide", "nested", "plainJson"].includes(ds) ? ds : "wide";
        // an edge in the inspector: the table shows the edges
        const edgeOpen = AB.route && (AB.route.id === "inspector-edge" || /^inspector-edge\//.test(String(AB.route.frame.right || "")));
        let active = active0 || (edgeOpen ? "edges" : "nodes");
        const tabsOpen = [{ id: "nodes", label: "Nodes", icon: "circle-dot" }, { id: "edges", label: "Edges", icon: "spline" }];
        const D = AB.fx.datasets[ok];
        const draw = () => {
            at(active, ok);
            const element = active === "nodes" ? "node" : "edge";
            const t = wideTable(ok, element);
            const n = recordsOf(ok, element).length;
            const rs = recordsOf(ok, element), byType = {};
            if (ok === "nested" && element === "edge") rs.forEach((r) => { byType[r.edgeType] = (byType[r.edgeType] || 0) + 1; });
            const from = (ok === "wide" ? (element === "node" ? D.file : D.edgesFile) : D.file) + (Object.keys(byType).length > 1 ? ": " + Object.entries(byType).map(([k, v]) => fmt(v) + " " + k).join(", ") : "");
            root.replaceChildren(tabStrip("wide", tabsOpen, active, (x) => { active = x.id; draw(); }, wideOptions, t.colsButton),
                scope(plural(n, element), ROW_HINT, h("span", { class: "k-secondary" }, "from " + from)), t);
        };
        draw();
    }

    // withSlider false: the transfers table under the Data place, with the time slider not shown. It opens
    // on Nodes (studio decision: on this directed graph the first thing the table shows is links in, out
    // and total side by side); the time slider and a path open on Edges, where their rows are.
    // state "path-members": a path's transfers as Edges rows, every edge column, all selected, under the path's chip;
    // "changes": the busiest merchants' links total in March and April, with the signed change
    function transfersDock(root, withSlider, active0, at, state) {
        const Tx = T(), P = Tx.setsAndPaths.path, path = state === "path-members" ? P.asDistance.transfers : null;
        win.start = 9; win.len = 7;
        let active = active0 || (withSlider || path ? "edges" : "nodes");
        const tabsOpen = [{ id: "nodes", label: "Nodes", icon: "circle-dot" }, { id: "edges", label: "Edges", icon: "spline" }];
        // The table lists the whole data; under a filter step its count says so (the canvas draws what the filter leaves)
        const chip = AB.route && AB.route.frame.chip;
        const version = chip && chip !== "Full graph" ? "before the filter" : null;
        let tableHost = null, colsHost = null, footHost = null;
        const drawTable = () => {
            if (!tableHost) return;
            const t = state === "changes" && active === "nodes" ? changesTable() : active === "edges" ? transferEdges(withSlider, { rows: path && active === "edges" ? path : null }) : transferNodes();
            tableHost.replaceChildren(t);
            colsHost.replaceChildren(t.colsButton || "");
            footHost.replaceChildren(t.foot || "");
        };
        const draw = () => {
            at(active, "transactions");
            colsHost = h("span", { style: "display:contents" });
            root.replaceChildren(tabStrip("time-slider", tabsOpen, active, (t) => { active = t.id; draw(); }, withSlider ? "slider-options" : "transfers-options", colsHost));
            if (withSlider) root.append(timeSlider(() => AB.go("table-dock", "transfers"), drawTable));
            if (path && active === "edges") {
                const x = AB.tip(h("span", { class: "td-tab-x", role: "button", tabindex: "0" }, icon("x", "sm")), "Show all edges");
                AB.nav(x, "table-dock", "transfers");
                root.append(h("div", { class: "k-scope td-scope" }, h("span", { class: "td-chip" }, icon("route", "sm"), "Path " + P.from.id + " to " + P.to.id, x),
                    h("span", null, AB.count(path.length, "edge", { of: Tx.edges }) + ", in path order")));
            } else if (state === "changes") {
                const A = AB.fx.datasets.transactionsApril;
                root.append(scope(AB.count(A.versionDiff.accountsKept, "account") + " in both months", null, h("span", { class: "k-secondary" }, "from " + Tx.file + " and " + A.file), pager(1, Tx.topByDegree.length, A.versionDiff.accountsKept)));
            } else if (active === "edges") {
                root.append(scope(AB.count(Tx.edges, "edge", { version }), null, withSlider ? AB.openQuestion("Whether the table lists only the window's transfers") : null, pager(1, Tx.firstRows.length, Tx.edges)));
            } else {
                const first = 381; // fixtures.json's rows are the account file's rows 381 to 420 (kit/gen-canvas.mjs)
                root.append(scope(AB.count(Tx.nodes, "node", { version }), null, h("span", { class: "k-secondary" }, "from the node file " + Tx.accountsFile), pager(first, first + Tx.rows.length - 1, Tx.nodes)));
            }
            tableHost = h("div", { style: "display:contents" });
            footHost = h("div", { style: "display:contents" });
            root.append(tableHost, footHost);
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
    const NOTES_FIXTURE = { "1001": 1, B1: 1, "1001|B1": 1 };
    const doorNotes = (k) => (DE().hasNotes() && NOTES_FIXTURE[k]) || 0; // none in a graph just made from the files
    function doorNodes() {
        const [people, buildings] = DE().tables, seen = new Set();
        const rows = people.sample.filter((r) => !seen.has(r.id) && seen.add(r.id)).map((r) => ({ id: r.id, type: "person", name: r.name, dept: r.dept, site: "", floors: "", notes: doorNotes(r.id) }))
            .concat(buildings.sample.map((r) => ({ id: r.bldg, type: "building", name: "", dept: "", site: r.site, floors: r.floors, notes: doorNotes(r.bldg) })));
        // Each entry as a node: keyed by its row number (entries.csv has no Key column), with its time
        const asNodes = DE().loaded.per === "nodes";
        if (asNodes) DE().tables[2].sample.forEach((r, i) => rows.push({ id: String(i + 1), type: "entry", name: "", dept: "", site: "", floors: "", time: r.time, notes: 0 }));
        const cols = [
            { key: "id", label: "id", type: "text", id: true },
            { key: "type", label: "type", type: "cat" },
            { key: "name", label: "name", type: "text", edit: true },
            { key: "dept", label: "dept", type: "cat", edit: true },
            { key: "site", label: "site", type: "cat", edit: true },
            { key: "floors", label: "floors", type: "num", n: true, edit: true },
        ].concat(asNodes ? [{ key: "time", label: "time", type: "time", cell: (r) => (r.time ? shortTime(r.time) : "") }] : []);
        return table(cols, rows, { label: "Nodes", columns: { ds: "doorEntries", element: "node" }, who: (r) => r.id, onRow: (r) => AB.flash("Selects " + r.id + " (not wired in the skeleton)") });
    }
    function doorEdges() {
        const D = DE(), ids = new Set(D.tables[0].sample.map((r) => r.id)), bldgs = new Set(D.tables[1].sample.map((r) => r.bldg)), pairs = new Map();
        const matched = D.tables[2].sample.filter((r) => ids.has(r.person_id) && bldgs.has(r.building_id));
        if (D.loaded.per === "nodes") {
            // Each entry as a node: two link edges per entry, one to its person and one to its building
            const links = [];
            D.tables[2].sample.forEach((r, i) => {
                if (ids.has(r.person_id)) links.push({ entry: String(i + 1), to: r.person_id, via: "person_id" });
                if (bldgs.has(r.building_id)) links.push({ entry: String(i + 1), to: r.building_id, via: "building_id" });
            });
            return table([{ key: "entry", label: "entry", type: "num", id: true }, { key: "to", label: "to", type: "cat", id: true }, { key: "via", label: "link column", type: "cat" }],
                links, { label: "Edges", columns: { ds: "doorEntries", element: "edge" }, who: (r) => "entry " + r.entry + " - " + r.to, onRow: (r) => AB.flash("Selects the edge entry " + r.entry + " - " + r.to + " (not wired in the skeleton)") });
        }
        if (D.loaded.per === "row") {
            return table([{ key: "person_id", label: "person_id", type: "num", id: true }, { key: "building_id", label: "building_id", type: "cat", id: true }, { key: "time", label: "time", type: "time", cell: (r) => shortTime(r.time) }],
                matched, { columns: { ds: "doorEntries", element: "edge" }, /* per Row the pair note reads missing (the Data page warns), so no Notes column */ label: "Edges", who: (r) => r.person_id + " - " + r.building_id, onRow: (r) => AB.flash("Selects the edge " + r.person_id + " - " + r.building_id + " (not wired in the skeleton)") });
        }
        // One row per pair, from the same preview the Data page shows (data.preview under Pair), so the counts agree
        D.report.entries.pairSample.filter((r) => ids.has(r.person_id) && bldgs.has(r.building_id)).forEach((r) => {
            const k = r.person_id + "|" + r.building_id;
            pairs.set(k, { from: r.person_id, to: r.building_id, count: r.count, first: r.time, last: r["time (latest)"], notes: doorNotes(k) });
        });
        const cols = [
            { key: "from", label: "person_id", type: "num", id: true },
            { key: "to", label: "building_id", type: "cat", id: true },
            { key: "count", label: "count", type: "num", n: true },
            { key: "first", field: "time", label: "time (earliest)", type: "time", cell: (r) => shortTime(r.first) },
            { key: "last", field: "time", label: "time (latest)", type: "time", cell: (r) => shortTime(r.last) },
        ];
        return table(cols, [...pairs.values()], { sort: "count", label: "Edges", columns: { ds: "doorEntries", element: "edge" }, who: (r) => r.from + " - " + r.to, onRow: (r) => AB.flash("Selects the edge " + r.from + " - " + r.to + " (not wired in the skeleton)") });
    }
    function doorDock(root, state, active0, at) {
        const D = DE(), [people, buildings] = D.tables;
        let active = active0 || (state === "door-entries-nodes" ? "nodes" : "edges");
        const tabsOpen = [{ id: "nodes", label: "Nodes", icon: "circle-dot" }, { id: "edges", label: "Edges", icon: "spline" }];
        const draw = () => {
            at(active, "doorEntries");
            const t = active === "edges" ? doorEdges() : doorNodes();
            root.replaceChildren(tabStrip("door-entries", tabsOpen, active, (x) => { active = x.id; draw(); }, "door-entries-options", t.colsButton));
            if (active === "edges") root.append(scope(plural(D.loadedEdges(), "edge"), ROW_HINT, h("span", { class: "k-secondary" }, "from " + D.tables[2].file + (D.loaded.per === "pair" ? ", one per person and building" : D.loaded.per === "nodes" ? ", two per entry node (person_id and building_id)" : ", one per entry"))), t);
            else root.append(scope(plural(D.loadedTypes().total, "node"), ROW_HINT, h("span", { class: "k-secondary" }, "from " + (D.loadedTypes().entry ? people.file + ", " + buildings.file + " and " + D.tables[2].file : people.file + " and " + buildings.file))), t);
        };
        draw();
    }

    // The loaded projects' Table options open in place, over the project's own table (its route draws Les Miserables)
    function wideOptions(e) {
        const btn = e && e.currentTarget && e.currentTarget.closest ? e.currentTarget : document.querySelector("#ab-dock [aria-label='Table options']");
        AB.openMenu(btn, [
            { label: "Time slider", disabled: "This data has no time attribute" },
            { sep: true },
            { label: "Export table as CSV...", onClick: () => AB.go("export-dialog", "table") },
        ]);
    }
    // ---------- menus drawn in the overlay region ----------
    function optionsMenu(el, time) {
        // time: null (no time attribute), "off" or "on"
        el.append(AB.menu({
            anchor: "#ab-dock [aria-label='Table options']", place: "below-end",
            items: [
                time === "door" ? { label: "Time slider", onClick: flash("The time slider over the entries' times") }
                : time ? { label: "Time slider", check: time === "on", go: ["table-dock", time === "on" ? "transfers" : "time-slider"] }
                    : { label: "Time slider", disabled: "This data has no time attribute" },
                { sep: true },
                { label: "Export table as CSV...", go: ["export-dialog", "table"] },
            ],
        }));
    }
    // Columns: the field list at panel size with a checkbox per attribute, the key locked. Each check
    // shows or hides that column at once; the table behind redraws in place.
    function columnsPopover(el, state) {
        const c = colsAt || { ds: "lesmis", active: "nodes" };
        const element = c.active === "edges" ? "edge" : "node";
        const cv = live[c.ds + "|" + element];
        if (!cv) return;
        // Esc closes it once Find is empty (the shell's Esc stays put: the popover's closeTo is this section too)
        const pop = AB.popover({
            // opens up and to the left, inside the canvas, never over the inspector beside it
            anchor: "#ab-dock .td-cols", place: "above-end", title: "Columns", width: 340,
            body: AB.fieldList({ size: "panel", dataset: c.ds, element, results: false, notes: false, label: "Columns", checkboxes: [...cv.shown()], locked: cv.locked,
                query: state === "wide-columns" ? "vuln" : "",
                onToggle(name, on) { const sh = cv.shown(); if (on) sh.add(name); else sh.delete(name); cv.refresh(); } }),
        });
        pop.addEventListener("keydown", (e) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); AB.close(); } });
        el.append(pop);
    }
    function overlay(el, state) {
        if (state === "columns" || state === "wide-columns") return columnsPopover(el, state);
        if (state === "row-menu") return rowMenu(el);
        if (state === "column-menu") {
            el.append(AB.menu({
                anchor: "#td-col-degree", place: "above-start",
                items: [
                    // The attribute's menu, word for word (context-menus "attribute"); only the last "Show in" differs
                    // Color by, Size by and Label by each add a paint row (a style layer) for degree and open it
                    { heading: "Degree (full graph)" },
                    { label: "Color by", go: ["inspector-measure-row", "degree"] },
                    { label: "Size by", go: ["inspector-measure-row", "degree"] },
                    { label: "Label by", go: ["inspector-group-set-path-row", "label-by"] },
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

    // The path the row menu was opened on: its "Show members in table" lands on path-members
    const PATH_RIGHT = /^inspector-group-set-path-row\/path(-style|-reversed)?$/;
    let pathOpen = false;
    // The wide table draws whichever loaded project is on screen (hosts, research network, coauthors)
    const loadedDs = () => { const d = AB.route && AB.route.frame.dataset; return ["wide", "nested", "plainJson"].includes(d) ? d : "wide"; };
    function frame(state) {
        if (state === "row-menu") return rowAt ? Object.assign(frame(rowAt.state), { overlay: "table-dock/row-menu" }) : { right: "inspector-node/why-this-look", overlay: "table-dock/row-menu" };
        if (state === "columns") return Object.assign(frame((colsAt && colsAt.state) || "nodes"), colsAt && colsAt.state === "wide" ? { dataset: colsAt.ds } : {}, { overlay: "table-dock/columns" });
        if (state === "wide") return { dataset: loadedDs(), left: "graph-place/at-rest" };
        if (state === "wide-columns") return { dataset: loadedDs(), left: "graph-place/at-rest", overlay: "table-dock/wide-columns" };
        if (state === "transfers-options" || state === "slider-options") return { left: "data-place/at-rest", overlay: "table-dock/" + state };
        if (state === "path-members") return { dataset: "transactions", left: "graph-place/path-found", right: "inspector-group-set-path-row/path", canvas: AB.fx.datasets.transactions.fresh ? "canvas-and-states/transfers" : "canvas-and-states/transfers-communities" };
        if (state === "changes") return { dataset: "transactions", left: "data-place/at-rest" };
        if (TRANSFERS[state] !== undefined) return { left: "data-place/at-rest" };
        if (state === "door-entries-options") return { dataset: "doorEntries", left: "graph-place/door-entries", overlay: "table-dock/" + state };
        if (state === "door-entries" || state === "door-entries-nodes") return { dataset: "doorEntries", left: "graph-place/door-entries" };
        if (state === "communities") return { left: "graph-place/louvain-open", right: "inspector-run-row/style" };
        if (state === "members-of-row") {
            // Show members in table from a path row: a path's members are its transfers, so they go to the
            // Edges tab with every edge column (amount, timestamp), not to the Nodes tab. AB.route is still the
            // screen the command was picked on (the row menu over the path's inspector).
            pathOpen = PATH_RIGHT.test(String((AB.route && AB.route.frame.right) || ""));
            if (pathOpen) return frame("path-members");
            return { left: "graph-place/louvain-open", right: "inspector-group-set-path-row/community-3" };
        }
        if (state === "column-menu" || state === "table-options") return { overlay: "table-dock/" + state };
        return {};
    }

    registerSection({
        id: "table-dock",
        title: "Table dock and time slider",
        region: "dock",
        // Esc from a menu or the Columns popover goes back to the table it opened over
        get closeTo() {
            const s = location.hash.split("/")[2] || "";
            return "table-dock/" + (s === "columns" ? (colsAt && colsAt.state) || "nodes" : s === "row-menu" ? (rowAt || ROW_DEFAULT).state : BASE[s] || "nodes");
        },
        frame,
        states: [
            { id: "nodes", label: "Nodes tab" },
            { id: "edges", label: "Edges tab" },
            { id: "communities", label: "Item tab (Louvain)" },
            { id: "members-of-row", label: "Members of a row (chip shown)" },
            { id: "column-menu", label: "Column header menu open" },
            { id: "table-options", label: "Table options menu" },
            { id: "pair-run", label: "Item tab of a pair run" },
            { id: "time-slider", label: "Time slider (transfers)" },
            { id: "transfers", label: "Transfers table (Data place), opens on Nodes" },
            { id: "transfers-nodes", label: "Transfers: Nodes, links in, out and total" },
            { id: "transfers-options", label: "Table options with a time attribute" },
            { id: "slider-options", label: "Table options, time slider on" },
            { id: "door-entries", label: "Door entries: Edges (one per pair)" },
            { id: "door-entries-nodes", label: "Door entries: Nodes (people and buildings)" },
            { id: "door-entries-options", label: "Table options, door entries" },
            { id: "closed", label: "Closed" },
            { id: "no-match", label: "Find matched no row" },
            { id: "edit-refused", label: "A cell edit graphty-element refused" },
            { id: "wide", label: "IT estate: hosts, key frozen, key and in-use columns" },
            { id: "wide-columns", label: "IT estate: Columns open, searched \"vuln\"" },
            { id: "columns", label: "Columns open over the table on screen" },
            { id: "row-menu", label: "A row's menu (Valjean), Remove from data" },
            { id: "find", label: "Find landed on a row (Javert)" },
            { id: "sampled", label: "Nodes, betweenness estimated: rank ranges" },
            { id: "edited", label: "A cell edit that went through, with Undo" },
            { id: "path-members", label: "A path's transfers as Edges rows, with their sum" },
            { id: "changes", label: "Transfers: change in links total, March to April" },
        ],
        render(el, state, ctx) {
            if (ctx && ctx.region === "overlay") return overlay(el, state);
            dock(el, state);
        },
    });
})();
