/* Select: the main menu's one selection popover (spec 10.1), anchored above the toolbar so the
   canvas stays visible. A segmented control switches Where (a query) and By ids (a pasted list);
   both end with the one Selection row (Replace, Add, Remove, Within) and a primary button that
   carries the match count. Both hand graphty-element its own inputs: the element resolves the
   query's attribute paths (E_UNKNOWN_ATTRIBUTE names the nearest candidate) and matches ids; past
   its cap (5,000, in index order) it truncates and says so, which the app shows in the one notice.
   Numbers are kit/fixtures.json's transfers: 3,000 accounts (2,610 personal), 9,113 transfers,
   14 flagged accounts selected, all personal. The Query tab's hint names no attributes (version 5):
   its one link, Insert attribute..., opens the field list at menu size and inserts the picked
   attribute's stored path at the cursor (quoted when a name holds a dot). The wide states run on
   kit/wide-nested.json's hosts (300 hosts, 69 attributes), counted from its rows. Plain ASCII. */
(function () {
    "use strict";
    const AB = window.AB;
    const { h, icon } = window;

    const css = `
.sw-body { display: grid; gap: 8px; }
.sw-pad { padding: 0 16px; }
.sw-input { width: 100%; box-sizing: border-box; font: inherit; font-family: var(--cm-font-mono, monospace); font-size: 12px; color: var(--cm-text); background: var(--cm-bg-secondary); border: 0; border-radius: 5px; box-shadow: var(--cm-field-shadow); padding: 4px 8px; }
.sw-input[aria-invalid="true"] { box-shadow: inset 0 0 0 1px var(--cm-border-danger, #d64545); }
textarea.sw-input.sw-q { height: 40px; resize: none; }
textarea.sw-input { height: 96px; resize: vertical; line-height: 16px; }
.sw-hint { color: var(--cm-text-secondary); font-size: 11px; line-height: 16px; }
.sw-status { display: flex; align-items: flex-start; gap: 6px; min-height: 20px; line-height: 18px; }
.sw-status a { color: var(--cm-text-brand); cursor: pointer; }
.sw-miss { font-family: var(--cm-font-mono, monospace); font-size: 11px; color: var(--cm-text-secondary); }
`;
    if (!document.getElementById("sw-style")) document.head.append(h("style", { id: "sw-style" }, css));

    const T = () => AB.fx.datasets.transactions;
    const n = (x) => Number(x).toLocaleString("en-US");
    const CAP = 5000; // graphty-element's selection cap; the app reads it, never types it
    const SELECTED = 14; // the 14 flagged accounts, all personal
    const LONG = "vuln_count_critical_unremediated_over_30_days"; // the 46-character host attribute
    const plural = (k, w) => n(k) + " " + w + (k === 1 ? "" : "s");
    // A stand-in for graphty-element's parse of a one-comparison query: { a, test(x), v, op } or null
    function parse(q) {
        const m = /^\s*"?([\w.]+)"?\s*(==|!=|>=|<=|>|<)\s*'?([^']*?)'?\s*$/.exec(q);
        if (!m) return null;
        const [, a, op, raw] = m;
        const v = raw === "" || isNaN(raw) ? raw : Number(raw);
        const ops = { "==": (x) => x === v, "!=": (x) => x !== v, ">": (x) => x > v, ">=": (x) => x >= v, "<": (x) => x < v, "<=": (x) => x <= v };
        return { a, op, v, test: (x) => x != null && ops[op](x) };
    }
    // ... and its count over rows the sample holds in full (the hosts, the 14 selected accounts)
    function countRows(rows, q) {
        const p = parse(q);
        return p && rows.filter((r) => p.test(AB.valueAt(r, p.a))).length;
    }
    // ... and over the transfers, which the sample holds as value tables and ranges, not rows:
    // a count the tables cannot give is null, and the status says graphty-element counts it
    function countTransfers(t, q, edges) {
        const p = parse(q);
        if (!p) return undefined;
        const at = t.attributes.find((x) => x.name === p.a || x.name.startsWith(p.a + " ("));
        if (!at || /\(edge\)$/.test(at.name) !== edges) return undefined;
        const total = edges ? t.edges : t.nodes;
        if (at.values && (p.op === "==" || p.op === "!=")) {
            const k = at.values[String(p.v)] || 0;
            return p.op === "==" ? k : total - k;
        }
        const range = at.range || (at.total ? [0.01, Infinity] : null); // every transfer moves money
        if (range && typeof p.v === "number") {
            if (range.every((x) => p.test(x))) return total;
            if (!range.some((x) => p.test(x)) && !(p.op === "!=" || (range[0] < p.v && p.v < range[1]))) return 0;
        }
        return null;
    }
    // Create set where this is... from an attribute's menu: Select over that attribute's project, the
    // attribute already in the query. `from` is { ds, name, rows, on, q }; the transfers keep their own state.
    let from = null;
    AB.whereFrom = (ds, name) => {
        if (ds === "transactions") return AB.go("select-where", "where");
        const [x, g] = AB.fieldIn(ds, name);
        const rows = !g ? [] : ds === "lesmis" ? (g.element === "edge" ? [] : AB.fx.datasets.lesmis.rows) : ["wide", "nested", "plainJson"].includes(ds) ? AB.recordsOf(ds, g) : [];
        const path = name.includes(".") ? '"' + name + '"' : name;
        const first = rows.map((r) => AB.valueAt(r, name)).find((v) => v != null && v !== "" && !Array.isArray(v) && typeof v !== "object");
        const q = !x ? "" : x.type === "num" ? path + " > 0" : first != null ? path + " == '" + first + "'" : path + " ";
        from = { ds, name, rows, on: g && g.element === "edge" ? "edges" : "nodes", q };
        AB.go("select-where", "attribute");
    };

    function render(el, state) {
        const t = T();
        const fromAttr = state === "attribute" ? from || { ds: "wide", name: LONG, rows: AB.fx.datasets.wide.nodeRows, on: "nodes", q: LONG + " > 0" } : null;
        const wide = state === "wide" || state === "wide-inserted" || !!fromAttr;
        const W = AB.fx.datasets.wide;
        const P = fromAttr ? AB.fx.datasets[fromAttr.ds] : W; // the project the query runs over
        const ids = t.flaggedAccounts.map((a) => a.id);
        const MISS = ["ACC-36538", "Structuring alert"];
        const s = {
            tab: state === "by-ids" ? "ids" : "where",
            on: fromAttr ? fromAttr.on : state === "where-error" ? "edges" : "nodes",
            q: fromAttr ? fromAttr.q : { "where-error": "amout > 0", "no-match": "riskScore > 98", wide: "", "wide-inserted": LONG + " > 0" }[state] ?? "kind == 'personal'",
            ids: ids.slice(0, 7).concat(MISS[0], ids.slice(7), MISS[1]).join("\n"),
            mode: "replace",
        };

        // What the element would answer for the current inputs: { n, of, noun, error, miss }
        function result() {
            const edges = s.on === "edges";
            const noun = edges ? "edges" : "nodes";
            if (!s.q.trim() && s.tab === "where") return { n: 0, of: 0, noun, hint: "Type a query, or insert an attribute" };
            if (wide) {
                const rows = fromAttr ? (s.on === fromAttr.on ? fromAttr.rows : []) : edges ? W.edgeRows : W.nodeRows;
                if (fromAttr && !rows.length) return { n: 0, of: 0, noun, hint: "The sample holds no " + noun + " to count; graphty-element counts them" };
                const k = countRows(rows, s.q);
                return k === null ? { n: 0, of: 0, noun, hint: "Finish the query with a comparison, such as > 0" } : { n: k, of: fromAttr ? rows.length : edges ? W.edges : W.nodes, noun };
            }
            if (s.tab === "ids") {
                if (edges) return { n: 0, of: 0, noun, hint: "No transfer ids pasted" };
                const lines = s.ids.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
                const known = new Set(ids);
                return { n: lines.filter((x) => known.has(x)).length, noun, miss: lines.filter((x) => !known.has(x)) };
            }
            if (/\bamout\b/.test(s.q)) return { error: "amout", fix: "amount", noun };
            // Within counts among the 14 selected accounts, which the sample holds in full
            if (s.mode === "within") return edges ? { n: 0, of: 0, noun, hint: "No transfers are selected" } : { n: countRows(t.flaggedAccounts, s.q) ?? 0, of: SELECTED, noun: "selected nodes" };
            const k = countTransfers(t, s.q, edges);
            if (k === undefined) return { n: 0, of: 0, noun, hint: "Finish the query with a comparison on a " + (edges ? "transfer" : "account") + " attribute, such as " + (edges ? "amount > 0" : "kind == 'personal'") };
            if (k === null) return { n: 0, of: 0, noun, hint: "The sample cannot count this query; graphty-element counts it" };
            return { n: k, of: edges ? t.edges : t.nodes, noun };
        }

        function status(r) {
            if (r.error) {
                return h("div", { class: "sw-status", role: "alert" }, icon("triangle-alert", "sm"),
                    h("span", null, "Nothing in this graph answers ", h("b", null, r.error), ". Did you mean ",
                        h("a", { role: "button", tabindex: "0", on: { click: () => { s.q = s.q.replace(/\bamout\b/, r.fix); draw(); } } }, r.fix), "?"));
            }
            if (r.hint) return h("div", { class: "sw-status k-secondary", role: "status" }, r.hint + ".");
            if (r.miss) {
                return h("div", { class: "sw-status", role: "status" }, h("span", null, h("b", null, n(r.n) + " matched"),
                    r.miss.length ? h("span", null, ". Not found, skipped: ", h("span", { class: "sw-miss" }, r.miss.join(", "))) : null));
            }
            if (!r.n) {
                // The empty line: one gray line, its verb a link
                return h("div", { class: "sw-status", role: "status" }, AB.empty("0 of " + plural(r.of, r.noun.replace(/s$/, "")) + " match.", { verb: "Clear the query", onClick: () => { s.q = ""; draw(); } }));
            }
            return h("div", { class: "sw-status", role: "status" }, h("span", null, h("b", null, n(r.n) + " of " + plural(r.of, r.noun.replace(/s$/, ""))), " match",
                r.n > CAP && s.mode !== "remove" ? h("span", { class: "k-secondary" }, ". A selection holds " + n(CAP) + "; the first " + n(CAP) + " in file order are kept.") : null));
        }

        function draw() {
            el.textContent = "";
            const r = result();
            const bad = !!r.error;
            const statusSlot = h("div", { class: "sw-pad" }, status(r));
            const field = s.tab === "where"
                // Two wrapping lines, so a long attribute path stays readable; Enter counts, never breaks a line
                ? h("textarea", { class: "sw-input sw-q", "aria-label": "Query", placeholder: wide ? "environment == 'prod'" : "kind == 'personal'", "aria-invalid": String(bad), spellcheck: "false", "data-autofocus": "",
                    on: { input: (e) => { s.q = e.target.value; refresh(); }, keydown: (e) => { if (e.key === "Enter") { e.preventDefault(); draw(); } } } }, s.q)
                : h("textarea", { class: "sw-input", "aria-label": "Ids, one per line or comma separated", spellcheck: "false", "data-autofocus": "",
                    on: { input: (e) => { s.ids = e.target.value; refresh(); } } }, s.ids);
            let insert = null;
            const pickAttr = (name) => {
                const path = name.includes(".") ? '"' + name + '"' : name;
                const at = field.selectionStart ?? s.q.length, end = field.selectionEnd ?? at;
                s.q = s.q.slice(0, at) + path + s.q.slice(end);
                draw();
                const f = el.querySelector(".sw-input");
                if (f) { f.focus(); f.setSelectionRange(at + path.length, at + path.length); }
            };
            // The field list at menu size, placed beside the popover so the query stays in view (README:
            // a section drawing it in its own overlay places it with position(fieldList(o), anchor, place))
            let list = null;
            const shut = (back) => { if (list) { list.remove(); list = null; insert.setAttribute("aria-expanded", "false"); if (back) insert.focus(); } };
            const openList = () => {
                if (list) return shut(true);
                list = AB.position(AB.fieldList({ size: "menu", element: s.on === "edges" ? "edge" : "node", label: "Insert attribute",
                    onPick: (name) => { shut(); pickAttr(name); }, onClose: () => shut(true) }), el.querySelector(".k-popover"), "right-start");
                el.append(list);
                insert.setAttribute("aria-expanded", "true");
                requestAnimationFrame(() => requestAnimationFrame(() => { const f = list && list.querySelector("input, .ab-fl-list"); if (f) f.focus(); }));
            };
            insert = h("a", { role: "button", tabindex: "0", "aria-haspopup": "listbox", "aria-expanded": "false", on: { click: openList, keydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openList(); } } } }, "Insert attribute...");
            const hint = s.tab === "where"
                ? h("span", null, "The same expressions as filters. ", insert)
                : (wide ? "One id per line, or comma separated. Matched against the " + (fromAttr ? "nodes'" : "hosts'") + " " + (P.nodeKey || "id") + " column." : "One id per line, or comma separated. Matched against the id column of accounts-2026-03.csv.");
            const pick = (k, v) => { s[k] = v; if (k === "on" && !wide) s.q = v === "edges" ? "amount > 0" : "kind == 'personal'"; draw(); };
            const body = h("div", { class: "sw-body" },
                h("div", { class: "sw-pad" }, AB.seg([["where", "Query"], ["ids", "Ids"]], s.tab, (v) => AB.go("select-where", v === "ids" ? "by-ids" : "where"), { label: "Select by" })),
                AB.fieldRow("Look for", AB.seg([["nodes", "Nodes"], ["edges", "Edges"]], s.on, (v) => pick("on", v), { label: "Look for" }), { popover: true }),
                AB.fieldRow(s.tab === "where" ? "Query" : "Ids", h("div", { class: "sw-body" }, field, h("div", { class: "sw-hint sw-status" }, hint)), { popover: true }),
                AB.fieldRow("Selection", AB.seg([["replace", "Replace"], ["add", "Add"], ["remove", "Remove"], ["within", "Within"]], s.mode, (v) => pick("mode", v), { label: "Selection" }), { popover: true }),
                statusSlot);
            // The primary button carries the live count: every keystroke redraws it with the status
            const footFor = (r) => {
                const verb = s.mode === "remove" ? "Remove " : "Select ";
                const go = () => {
                    // What was selected, for the panels Select lands on (the Selection row's count, the bar, the inspector)
                    AB.querySelection = { dataset: AB.route.frame.dataset, on: s.on, n: Math.min(r.n, CAP), matched: r.n, mode: s.mode, query: s.tab === "where" ? s.q : null };
                    if (r.n > CAP && s.mode !== "remove") return AB.go("select-where", "selection-full");
                    AB.go("select-where", "selected");
                };
                return AB.button(r.error ? "Select" : verb + n(r.n), { disabled: r.error ? "Fix the query first" : r.hint && !r.n ? r.hint : !r.n ? "Nothing matches" : false, onClick: go });
            };
            let foot = footFor(r);
            function refresh() {
                const r2 = result();
                statusSlot.replaceChildren(status(r2));
                field.setAttribute("aria-invalid", String(!!r2.error));
                const b = footFor(r2);
                foot.replaceWith(b);
                foot = b;
            }
            const pop = AB.popover({ anchor: "#ab-toolbar", place: "above-toolbar", title: "Select", body, foot, width: 440 });
            pop.addEventListener("pointerdown", (e) => { if (!insert.contains(e.target)) shut(); });
            el.append(pop);
            if (bad) AB.announce("Nothing in this graph answers amout. Did you mean amount?");
        }
        draw();
        // The wide state opens on the field list, after the popover has been placed
        if (state === "wide") setTimeout(() => { const a = el.querySelector(".sw-hint a"); if (a) a.click(); }, 60);
    }

    // Where Select lands: the usual selection picture in the project the query ran over -- the tree's
    // Selection row with its count, the selection bar and the several-elements inspector -- framed here
    // so the door never draws another project. Selection is full is the same picture with the notice.
    // ponytail: the inspector shows the query's own selection once inspector-several-elements registers a
    // "query" state (reading AB.querySelection); until then the nearest existing several-elements state.
    const QUERY_INSPECTOR = ["inspector-several-elements", "query"];
    function selectionInspector(ds) {
        const s = AB.sections[QUERY_INSPECTOR[0]];
        if (s && s.states.some((x) => x.id === QUERY_INSPECTOR[1])) return QUERY_INSPECTOR.join("/");
        return QUERY_INSPECTOR[0] + "/" + ({ wide: "wide", doorEntries: "door-two" }[ds] || "data");
    }
    function selectedFrame(only) {
        const ds = only || (AB.querySelection && AB.querySelection.dataset) || "transactions";
        const place = ds === "transactions" ? "many-groups" : ds === "wide" ? "wide" : AB.placeOf(ds, "graph") || "at-rest";
        const canvas = { transactions: "canvas-and-states/transfers", wide: "canvas-and-states/hosts" }[ds];
        return Object.assign({ left: "graph-place/" + place, dataset: ds, right: selectionInspector(ds) }, canvas ? { canvas } : {});
    }

    registerSection({
        id: "select-where",
        title: "Select where or by ids",
        region: "overlay",
        rail: "graph",
        frame: (state) => (state === "selected" || state === "selection-full"
            ? selectedFrame(state === "selection-full" ? "transactions" : null) // only the transfers pass the cap
            : state === "attribute"
            ? { left: "graph-place/" + (AB.placeOf((from || { ds: "wide" }).ds, "graph") || "at-rest"), dataset: (from || { ds: "wide" }).ds, right: false }
            : state === "wide" || state === "wide-inserted"
            ? { left: "graph-place/wide", dataset: "wide", right: false, canvas: "canvas-and-states/hosts" }
            : { left: "graph-place/many-groups", dataset: "transactions", right: false, canvas: "canvas-and-states/transfers" }),
        // Closes to the frame's left place: many-groups on the transfers, the hosts' graph place on the wide sample
        states: [
            { id: "where", label: "Query and match count" },
            { id: "where-error", label: "Query: unknown attribute" },
            { id: "by-ids", label: "Ids: pasted list" },
            { id: "selection-full", label: "Selection is full (5,000)" },
            { id: "no-match", label: "Query: nothing matches (0 nodes)" },
            { id: "wide", label: "Query on the hosts: Insert attribute... open (69 attributes)" },
            { id: "wide-inserted", label: "Query on the hosts holding the 46-character attribute" },
            { id: "attribute", label: "Create set where this is... from an attribute (directly: the hosts' 46-character attribute)" },
            { id: "selected", label: "After Select: the usual selection picture (directly: the transfers)" },
        ],
        render(el, state) {
            if (state === "selected") return; // the popover has closed; the frame draws the selection
            if (state !== "selection-full") return render(el, state);
            // The element truncated: the one notice, one action
            el.append(AB.notice("Selection is full: the first " + n(CAP) + " of " + n(T().edges) + " matching transfers are selected.",
                { label: "Narrow the query", go: ["select-where", "where"] }));
        },
    });
})();
