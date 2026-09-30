/* Select where / Select by ids: the Edit menu's two selection dialogs, centered over the transfers
   graph at rest. Both hand graphty-element its own inputs: a query (the element resolves the
   attribute paths and names the unresolved ones with the nearest candidates, E_UNKNOWN_ATTRIBUTE)
   and a list of ids (the element's selection API: replace, add, remove; intersect is "Only within
   the selection"). The element truncates a selection past its cap (5,000, in index order) and says
   so ("truncated"); the selection-full state is that notice.
   Numbers are kit/fixtures.json's transfers: 3,000 accounts (2,610 personal), 9,113 transfers,
   14 flagged accounts, all personal. Every transfer carries a positive amount, so "amount > 0"
   matches all 9,113. Plain ASCII. */
(function () {
    "use strict";
    const AB = window.AB;
    const { h, icon } = window;

    const css = `
.sw-modal { width: 520px; }
.sw-body { display: grid; gap: 10px; padding: 8px 16px 4px; }
.sw-row { display: flex; align-items: center; gap: 8px; min-height: 24px; }
.sw-row > .sw-lbl { width: 72px; flex: none; color: var(--cm-text-secondary); }
.sw-input { width: 100%; box-sizing: border-box; font: inherit; font-family: var(--cm-font-mono, monospace); font-size: 12px; color: var(--cm-text); background: var(--cm-bg-secondary); border: 0; border-radius: 5px; box-shadow: var(--cm-field-shadow); padding: 4px 8px; outline-offset: 1px; }
.sw-input[aria-invalid="true"] { box-shadow: inset 0 0 0 1px var(--cm-border-danger, #d64545); }
textarea.sw-input { height: 128px; resize: vertical; line-height: 16px; }
.sw-hint { color: var(--cm-text-secondary); font-size: 11px; line-height: 16px; }
.sw-count { display: flex; align-items: center; gap: 6px; min-height: 24px; }
.sw-count b { font-weight: 550; }
.sw-err { display: grid; gap: 2px; padding: 6px 10px; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--cm-border), inset 3px 0 0 var(--cm-border-danger, #d64545); line-height: 18px; }
.sw-warn { display: flex; gap: 6px; align-items: flex-start; padding: 6px 10px; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--cm-border), inset 3px 0 0 var(--cm-bg-warning); line-height: 18px; }
.sw-err a, .sw-warn a, .sw-body a { color: var(--cm-text-brand); cursor: pointer; }
.sw-miss { margin: 2px 0 0; padding: 0; list-style: none; font-family: var(--cm-font-mono, monospace); font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); }
.sw-switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.sw-foot { justify-content: flex-start !important; }
.sw-toast { position: absolute; left: calc(50% + 120px); top: 84px; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; max-width: calc(100vw - 32px); white-space: normal; pointer-events: auto; }
.sw-oq { justify-self: start; }
.sw-toast .k-toast-action { white-space: nowrap; }
`;
    if (!document.getElementById("sw-style")) document.head.append(h("style", { id: "sw-style" }, css));

    const T = () => AB.fx.datasets.transactions;
    const n = (x) => Number(x).toLocaleString("en-US");
    const oq = (text) => h("span", { class: "k-annot-tag sw-oq", title: "Open question" }, "Open question: " + text);
    const CAP = 5000; // graphty-element's DEFAULT_SELECTION_CAP; the app reads it, never types it

    function seg(names, active, onPick) {
        return h("span", { class: "k-seg", role: "radiogroup" }, names.map((nm) =>
            h("button", { type: "button", role: "radio", "aria-checked": String(nm === active), on: { click: () => onPick(nm) } }, nm)));
    }
    function switchRow(label, on, onToggle, desc) {
        return h("span", { class: "sw-switch", role: "switch", tabindex: "0", "aria-checked": String(on), on: { click: onToggle, keydown: (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onToggle(); } } } },
            h("span", { class: "k-switch", "aria-checked": String(on) }), label, desc ? h("span", { class: "k-secondary" }, desc) : null);
    }
    function tabsTo(active) {
        return AB.tabs(["Where", "By ids"], active, (t) => AB.go("select-where", t === "Where" ? "where" : "by-ids"));
    }
    function mount(el, title, body, foot) {
        const wrap = AB.modal({ title, body, foot });
        wrap.querySelector(".k-modal").classList.add("sw-modal");
        wrap.querySelector(".k-modal-foot").classList.add("sw-foot");
        el.append(wrap);
        const first = wrap.querySelector(".sw-input");
        if (first) first.focus();
    }

    // ---------- Where: a query, the element resolves it and counts ----------
    function where(el, state) {
        const t = T();
        const s = {
            on: state === "where-error" ? "Edges" : "Nodes",
            q: state === "where-error" ? "amout > 0" : "kind == 'personal'",
            within: false,
        };
        const draw = () => {
            el.textContent = "";
            const bad = /\bamout\b/.test(s.q);
            const onEdges = s.on === "Edges";
            let count;
            if (bad) count = null;
            else if (onEdges) count = h("div", { class: "sw-count" }, icon("circle-check", "sm"), h("b", null, n(t.edges) + " of " + n(t.edges) + " transfers match"));
            else count = h("div", { class: "sw-count" }, icon("circle-check", "sm"),
                h("b", null, s.within ? "14 of the 14 selected accounts match" : n(t.attributes[1].values.personal) + " of " + n(t.nodes) + " accounts match"));
            const over = !bad && onEdges && !s.within && t.edges > CAP;

            const input = h("input", { class: "sw-input", value: s.q, "aria-label": "Query", "aria-invalid": String(bad), spellcheck: "false",
                on: { input: (e) => { s.q = e.target.value; }, keydown: (e) => { if (e.key === "Enter") draw(); } } });
            const body = h("div", null, tabsTo("Where"),
                h("div", { class: "sw-body" },
                    h("div", { class: "sw-row" }, h("span", { class: "sw-lbl" }, "Look for"), seg(["Nodes", "Edges"], s.on, (v) => {
                        s.on = v; s.q = v === "Edges" ? "amount > 0" : "kind == 'personal'"; draw();
                    })),
                    h("div", { class: "sw-row" }, h("span", { class: "sw-lbl" }, "Where"), input),
                    h("div", { class: "sw-hint" }, "The same expressions as filter steps and rule sets. Attributes: ",
                        onEdges ? "amount, timestamp" : "kind, country, riskScore, flagged, alertRule, alertTime", "."),
                    bad ? h("div", { class: "sw-err", role: "alert" },
                        h("span", null, "Nothing in this graph answers ", h("b", null, "amout"), "."),
                        h("span", null, "Did you mean ", h("a", { role: "button", tabindex: "0", on: { click: () => { s.q = s.q.replace(/\bamout\b/, "amount"); draw(); } } }, "amount"), "?")) : count,
                    h("div", { class: "sw-row" }, onEdges
                        ? h("span", { class: "sw-switch", "aria-disabled": "true", title: "The selection is 14 accounts and no transfers" }, h("span", { class: "k-switch", "aria-checked": "false", style: "opacity:.5" }), h("span", { class: "k-secondary" }, "Only within the selection (no transfers are selected)"))
                        : switchRow("Only within the selection", s.within, () => { s.within = !s.within; draw(); }, "(14 accounts)")),
                    over ? h("div", { class: "sw-warn", role: "status" }, icon("triangle-alert", "sm"),
                        h("span", null, "A selection holds up to " + n(CAP) + " elements. Selecting keeps the first " + n(CAP) + " in file order. ",
                            AB.link("settings", "performance", "See the limits"))) : null,
                    over ? oq("keep the first 5,000, or refuse and ask for a narrower query?") : null));
            const foot = [
                h("span", { class: "k-secondary" }, "Selecting replaces the selection. Shift adds."),
                h("span", { class: "k-grow" }),
                AB.button("Cancel", { kind: "secondary", onClick: () => AB.close() }),
                AB.button("Select", { disabled: bad, onClick: () => (over ? AB.go("select-where", "selection-full") : AB.go("graph-place", "at-rest")) }),
            ];
            mount(el, "Select where", body, foot);
            if (bad) AB.announce("Nothing in this graph answers amout. Did you mean amount?");
        };
        draw();
    }

    // ---------- By ids: paste a list, the element matches it ----------
    const MISS = ["ACC-36538", "Structuring alert"];
    function byIds(el) {
        const ids = T().flaggedAccounts.map((a) => a.id);
        const s = { mode: "Replace", text: ids.slice(0, 7).join("\n") + "\n" + MISS[0] + "\n" + ids.slice(7).join("\n") + "\n" + MISS[1] };
        const draw = () => {
            el.textContent = "";
            const lines = s.text.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
            const known = new Set(ids);
            const hit = lines.filter((x) => known.has(x));
            const miss = lines.filter((x) => !known.has(x));
            const box = h("textarea", { class: "sw-input", "aria-label": "Ids, one per line or comma separated", spellcheck: "false", on: { input: (e) => { s.text = e.target.value; } } }, s.text);
            const body = h("div", null, tabsTo("By ids"),
                h("div", { class: "sw-body" },
                    h("div", { class: "sw-row" }, h("span", { class: "sw-lbl" }, "Look for"), seg(["Nodes", "Edges"], "Nodes", (v) => v === "Edges" && AB.flash("Edge ids (not wired in the skeleton)"))),
                    box,
                    h("div", { class: "sw-hint" }, "One id per line, or separated by commas. Matched against the id column of accounts-2026-03.csv. ",
                        h("a", { role: "button", tabindex: "0", on: { click: draw } }, "Check again")),
                    h("div", { class: "sw-count" }, icon("circle-check", "sm"), h("b", null, hit.length + " matched"),
                        miss.length ? h("span", { class: "k-secondary" }, miss.length + " not found") : null),
                    miss.length ? h("div", { class: "sw-err" }, h("span", null, "Not found in this graph:"),
                        h("ul", { class: "sw-miss" }, miss.map((m) => h("li", null, m)))) : null,
                    h("div", { class: "sw-row" }, h("span", { class: "sw-lbl" }, "Selection"), seg(["Replace", "Add", "Remove"], s.mode, (v) => { s.mode = v; draw(); }))));
            const foot = [
                h("span", { class: "k-secondary" }, miss.length ? "Ids not found are skipped." : ""),
                h("span", { class: "k-grow" }),
                AB.button("Cancel", { kind: "secondary", onClick: () => AB.close() }),
                AB.button(s.mode === "Remove" ? "Remove " + hit.length : "Select " + hit.length, { disabled: !hit.length, onClick: () => AB.go("graph-place", "at-rest") }),
            ];
            mount(el, "Select by ids", body, foot);
        };
        draw();
    }

    // ---------- Selection is full: the element truncated, the app says so ----------
    function full(el) {
        const t = T();
        el.append(h("div", { class: "k-toast sw-toast", role: "status" }, icon("triangle-alert", "sm"),
            "Selection is full: the first " + n(CAP) + " of " + n(t.edges) + " matching transfers are selected.",
            h("span", Object.assign({ class: "k-toast-action", role: "button" }, AB.act({ go: ["select-where", "where-error"] })), "Narrow the query"),
            h("span", Object.assign({ class: "k-toast-action", role: "button" }, AB.act({ go: ["settings", "performance"] })), "Limits")));
        AB.announce("Selection is full: 5,000 of 9,113 matching transfers selected.");
    }

    registerSection({
        id: "select-where",
        title: "Select where and by ids",
        region: "overlay",
        rail: "graph",
        frame: { left: "graph-place/many-groups", dataset: "transactions", right: false, canvas: "canvas-and-states/transfers" },
        closeTo: "graph-place/many-groups",
        states: [
            { id: "where", label: "Where: query and match count" },
            { id: "where-error", label: "Where: unknown attribute" },
            { id: "by-ids", label: "By ids: pasted list" },
            { id: "selection-full", label: "Selection is full (5,000)" },
            { id: "open", label: "Open (same as Where)" },
            { id: "preview", label: "Preview count (same as Where)" },
        ],
        render(el, state) {
            if (state === "by-ids") byIds(el);
            else if (state === "selection-full") full(el);
            else where(el, state);
        },
    });
})();
