/* Select: the main menu's one selection popover (spec 10.1), anchored above the toolbar so the
   canvas stays visible. A segmented control switches Where (a query) and By ids (a pasted list);
   both end with the one Selection row (Replace, Add, Remove, Within) and a primary button that
   carries the match count. Both hand graphty-element its own inputs: the element resolves the
   query's attribute paths (E_UNKNOWN_ATTRIBUTE names the nearest candidate) and matches ids; past
   its cap (5,000, in index order) it truncates and says so, which the app shows in the one notice.
   Numbers are kit/fixtures.json's transfers: 3,000 accounts (2,610 personal), 9,113 transfers,
   14 flagged accounts selected, all personal. Plain ASCII. */
(function () {
    "use strict";
    const AB = window.AB;
    const { h, icon } = window;

    const css = `
.sw-body { display: grid; gap: 8px; }
.sw-pad { padding: 0 16px; }
.sw-input { width: 100%; box-sizing: border-box; font: inherit; font-family: var(--cm-font-mono, monospace); font-size: 12px; color: var(--cm-text); background: var(--cm-bg-secondary); border: 0; border-radius: 5px; box-shadow: var(--cm-field-shadow); padding: 4px 8px; }
.sw-input[aria-invalid="true"] { box-shadow: inset 0 0 0 1px var(--cm-border-danger, #d64545); }
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

    function render(el, state) {
        const t = T();
        const ids = t.flaggedAccounts.map((a) => a.id);
        const MISS = ["ACC-36538", "Structuring alert"];
        const s = {
            tab: state === "by-ids" ? "ids" : "where",
            on: state === "where-error" ? "edges" : "nodes",
            q: state === "where-error" ? "amout > 0" : "kind == 'personal'",
            ids: ids.slice(0, 7).concat(MISS[0], ids.slice(7), MISS[1]).join("\n"),
            mode: "replace",
        };

        // What the element would answer for the current inputs: { n, of, noun, error, miss }
        function result() {
            const edges = s.on === "edges";
            const noun = edges ? "transfers" : "accounts";
            if (s.tab === "ids") {
                if (edges) return { n: 0, of: 0, noun, hint: "No transfer ids pasted" };
                const lines = s.ids.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
                const known = new Set(ids);
                return { n: lines.filter((x) => known.has(x)).length, noun, miss: lines.filter((x) => !known.has(x)) };
            }
            if (/\bamout\b/.test(s.q)) return { error: "amout", fix: "amount", noun };
            if (s.mode === "within") return edges ? { n: 0, of: 0, noun, hint: "No transfers are selected" } : { n: SELECTED, of: SELECTED, noun: "selected accounts" };
            return edges ? { n: t.edges, of: t.edges, noun } : { n: t.attributes[1].values.personal, of: t.nodes, noun };
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
            return h("div", { class: "sw-status", role: "status" }, h("span", null, h("b", null, n(r.n) + " of " + n(r.of)), " " + r.noun + " match",
                r.n > CAP && s.mode !== "remove" ? h("span", { class: "k-secondary" }, ". A selection holds " + n(CAP) + "; the first " + n(CAP) + " in file order are kept.") : null));
        }

        function draw() {
            el.textContent = "";
            const r = result();
            const bad = !!r.error;
            const statusSlot = h("div", { class: "sw-pad" }, status(r));
            const field = s.tab === "where"
                ? h("input", { class: "sw-input", value: s.q, "aria-label": "Where", "aria-invalid": String(bad), spellcheck: "false", "data-autofocus": "",
                    on: { input: (e) => { s.q = e.target.value; statusSlot.replaceChildren(status(result())); }, keydown: (e) => { if (e.key === "Enter") draw(); } } })
                : h("textarea", { class: "sw-input", "aria-label": "Ids, one per line or comma separated", spellcheck: "false", "data-autofocus": "",
                    on: { input: (e) => { s.ids = e.target.value; statusSlot.replaceChildren(status(result())); } } }, s.ids);
            const hint = s.tab === "where"
                ? "The same expressions as filters. Attributes: " + (s.on === "edges" ? "amount, timestamp." : "kind, country, riskScore, flagged, alertRule, alertTime.")
                : "One id per line, or comma separated. Matched against the id column of accounts-2026-03.csv.";
            const pick = (k, v) => { s[k] = v; if (k === "on") s.q = v === "edges" ? "amount > 0" : "kind == 'personal'"; draw(); };
            const body = h("div", { class: "sw-body" },
                h("div", { class: "sw-pad" }, AB.seg([["where", "Where"], ["ids", "By ids"]], s.tab, (v) => AB.go("select-where", v === "ids" ? "by-ids" : "where"), { label: "Select by" })),
                AB.fieldRow("Look for", AB.seg([["nodes", "Nodes"], ["edges", "Edges"]], s.on, (v) => pick("on", v), { label: "Look for" }), { popover: true }),
                AB.fieldRow(s.tab === "where" ? "Where" : "Ids", h("div", { class: "sw-body" }, field, h("div", { class: "sw-hint" }, hint)), { popover: true }),
                AB.fieldRow("Selection", AB.seg([["replace", "Replace"], ["add", "Add"], ["remove", "Remove"], ["within", "Within"]], s.mode, (v) => pick("mode", v), { label: "Selection" }), { popover: true }),
                statusSlot);
            const verb = s.mode === "remove" ? "Remove " : "Select ";
            const go = () => (r.n > CAP && s.mode !== "remove" ? AB.go("select-where", "selection-full") : AB.go("graph-place", "many-groups"));
            const foot = AB.button(bad ? "Select" : verb + n(r.n), { disabled: bad ? "Fix the query first" : !r.n ? "Nothing matches" : false, onClick: go });
            el.append(AB.popover({ anchor: "#ab-toolbar", place: "above-toolbar", title: "Select", body, foot, width: 440 }));
            if (bad) AB.announce("Nothing in this graph answers amout. Did you mean amount?");
        }
        draw();
    }

    registerSection({
        id: "select-where",
        title: "Select where or by ids",
        region: "overlay",
        rail: "graph",
        frame: { left: "graph-place/many-groups", dataset: "transactions", right: false, canvas: "canvas-and-states/transfers" },
        closeTo: "graph-place/many-groups",
        states: [
            { id: "where", label: "Where: query and match count" },
            { id: "where-error", label: "Where: unknown attribute" },
            { id: "by-ids", label: "By ids: pasted list" },
            { id: "selection-full", label: "Selection is full (5,000)" },
        ],
        render(el, state) {
            if (state !== "selection-full") return render(el, state);
            // The element truncated: the one notice, one action
            el.append(AB.notice("Selection is full: the first " + n(CAP) + " of " + n(T().edges) + " matching transfers are selected.",
                { label: "Narrow the query", go: ["select-where", "where"] }));
        },
    });
})();
