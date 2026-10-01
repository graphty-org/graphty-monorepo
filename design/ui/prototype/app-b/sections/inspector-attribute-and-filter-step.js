/* Inspector: an attribute or a filter step, opened from the Data place (transfers, March 2026).
   One body each, no tab strip.
   Attribute: Summary (Read as and Role as two dropdown rows), Values (the measure row's histogram
   form), Painted by. No Notes: an attribute is not a note's subject.
   Filter step: one sentence row, "Apply this step", the count before and after, Notes.
   A run's result attribute (PageRank) opens its measure row: the old "pagerank" state redirects.
   Plain ASCII. See ../README.md. */
(function () {
    "use strict";
    const CSS =
        ".ia-sentence{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:4px 16px 8px}" +
        ".ia-sentence>.k-field{min-width:0}" +
        ".ia-num{width:72px;font:inherit;color:var(--cm-text);font-variant-numeric:tabular-nums}" +
        ".ia-apply{display:flex;align-items:center;gap:10px;padding:4px 16px 8px;cursor:pointer}" +
        ".ia-flow{display:flex;align-items:center;gap:8px;padding:4px 16px 8px}" +
        ".ia-flow b{font-variant-numeric:tabular-nums}" +
        ".ia-dd{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;min-width:0}" +
        ".ia-dd>.k-field{flex:none;width:auto;max-width:100%}" +
        ".ia-hist{display:flex;align-items:flex-end;gap:1px;height:72px;margin:4px 16px 0}" +
        ".ia-hist>i{flex:1 1 0;background:var(--cm-border-translucent-strong);border-radius:1px 1px 0 0;min-height:1px}" +
        ".ia-axis{display:flex;justify-content:space-between;padding:2px 16px 0;color:var(--cm-text-secondary);font-size:11px;font-variant-numeric:tabular-nums}" +
        ".ia-dd>.ab-design-note{margin:0;max-width:100%;white-space:normal;height:auto}";
    if (!document.getElementById("ia-css")) document.head.append(h("style", { id: "ia-css" }, CSS));

    const ID = "inspector-attribute-and-filter-step";
    const T = () => AB.fx.datasets.transactions;
    const fmt = (n) => n.toLocaleString("en-US");

    // A dropdown row: the field shows the choice; the dark menu picks one (check on the current one).
    // choices: [{ label, disabled: "reason" }]; o.needs puts the design-note chip after the field.
    function dropdown(label, choices, current, o) {
        o = o || {};
        let cur = current;
        const text = h("span", null, cur);
        const f = AB.field(text, { caret: true });
        f.setAttribute("aria-haspopup", "menu");
        f.setAttribute("aria-label", label + ": " + cur);
        f.addEventListener("click", () => AB.openMenu(f, choices.map((c) => ({
            label: c.label, check: c.label === cur, disabled: c.disabled || null, desc: c.desc || null,
            onClick: () => { cur = c.label; text.textContent = cur; f.setAttribute("aria-label", label + ": " + cur); AB.announce(label + ": " + cur); },
        }))));
        return AB.fieldRow(label, h("span", { class: "ia-dd" }, f, o.needs ? AB.needsElement(o.needs) : null));
    }

    const READ_AS = () => [
        { label: "Category", desc: "Names or ids, no order" },
        { label: "Number", desc: "Amounts that can be compared and averaged" },
        { label: "Time", desc: "Dates and times" },
    ];
    const OVERRIDE = "graphty-element has no attribute type override; the type comes from the file";

    // The measure row's histogram form (its bars, two-end axis and one caption), drawn here because
    // the measure row keeps its CSS to itself until it renders.
    function histogram(bins, axis, caption, name) {
        const top = Math.max(...bins);
        return [
            h("div", { class: "ia-hist", role: "img", "aria-label": "Distribution of " + name }, bins.map((c) => h("i", { style: "height:" + (c ? Math.max(3, (c / top) * 100) : 0) + "%", "data-zero": c ? null : "" }))),
            h("div", { class: "ia-axis" }, h("span", null, axis[0]), h("span", null, axis[1])),
            h("div", { class: "ab-cap k-secondary" }, caption),
        ];
    }
    const none = (name) => AB.empty("No row paints from " + name + ".");

    // ---------- amount: an edge attribute from the file, Role None ----------
    function amountBody() {
        const t = T();
        const total = t.attributes.find((a) => a.name === "amount (edge)").total;
        return [
            AB.section({ title: "Summary", editable: true },
                dropdown("Read as", READ_AS(), "Number", { needs: OVERRIDE }),
                dropdown("Role", [
                    { label: "None" },
                    { label: "Name", disabled: "Name labels nodes; amount is on edges" },
                    { label: "Time", disabled: "amount is read as Number, not Time" },
                ], "None"),
                AB.data("On", fmt(t.edges) + " edges (transfers)", { go: ["table-dock", "edges"] }),
                AB.data("Missing", AB.openQuestion("how many transfers have no amount"))),
            AB.dataTab({
                Values: { summary: "Total " + fmt(total) + " USD", body: [
                    histogram([100, 86, 64, 45, 31, 22, 15, 10, 7, 5, 3, 2, 2, 1, 1, 1], ["0", "largest"],
                        fmt(t.edges) + " transfers, " + fmt(total) + " USD in all, " + (total / t.edges).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " on average.", "amount"),
                    h("div", { class: "ab-pad" }, AB.openQuestion("the real bins and range from the file")),
                ] },
                "Painted by": { summary: "No rows", body: none("amount") },
            }, { kind: "attribute" }),
        ];
    }

    // ---------- id: the account, Role Name ----------
    function idBody() {
        const t = T();
        return [
            AB.section({ title: "Summary", editable: true },
                dropdown("Read as", READ_AS(), "Category", { needs: OVERRIDE }),
                dropdown("Role", [
                    { label: "None" },
                    { label: "Name", desc: "The node's name: search, tooltips and the Label line read it" },
                    { label: "Time", disabled: "id is read as Category, not Time" },
                ], "Name"),
                AB.data("On", fmt(t.nodes) + " nodes (accounts)", { go: ["table-dock", "nodes"] }),
                AB.data("Missing", "none: it is the key")),
            AB.dataTab({
                Values: { summary: fmt(t.nodes) + " distinct", body: AB.data("Distinct", fmt(t.nodes) + ", one per account") },
                "Painted by": { summary: "No rows", body: none("id") },
            }, { kind: "attribute" }),
        ];
    }

    // ---------- the filter step ----------
    function filterBody() {
        const t = T();
        let on = true;
        const attrs = ["amount", "timestamp", "kind", "country", "riskScore", "flagged"];
        const pick = (items, field, text) => () => AB.openMenu(field, items.map((x) => ({ label: x, check: x === text.textContent, onClick: () => { text.textContent = x; } })));
        const aText = h("span", null, "amount");
        const a = AB.field(aText, { caret: true, icon: "hash" });
        a.addEventListener("click", pick(attrs, a, aText));
        const cText = h("span", null, "is at least");
        const c = AB.field(cText, { caret: true });
        c.addEventListener("click", pick(["is at least", "is below", "is between", "is empty"], c, cText));
        const v = h("input", { class: "k-field ia-num", value: "1,000", "aria-label": "Value", inputmode: "decimal" });
        AB.tip(a, "Attribute", { label: false });
        AB.tip(c, "Condition", { label: false });

        const after = h("b", null, "812");
        const check = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": "true", "aria-labelledby": "ia-apply-l" });
        const toggle = () => {
            on = !on;
            check.setAttribute("aria-checked", String(on));
            after.textContent = on ? "812" : fmt(t.nodes);
            AB.announce(on ? "Step applied" : "Step skipped");
        };
        const apply = h("label", { class: "ia-apply", on: { click: (e) => { e.preventDefault(); toggle(); } } }, check, h("span", { id: "ia-apply-l" }, "Apply this step"));
        check.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } });
        return [
            AB.section({ title: "Condition", editable: true },
                h("div", { class: "ia-sentence" }, a, c, v),
                h("div", { class: "ab-pad" }, AB.openQuestion("amount is on edges: which nodes does an edge condition keep")),
                apply,
                h("div", { class: "ia-flow" }, h("b", null, fmt(t.nodes)), icon("arrow-right", "sm"), after,
                    AB.link("table-dock", "nodes", "nodes", { class: "ab-link k-secondary" }))),
            AB.notesSection(0, null, "filter-step"),
        ];
    }

    const VIEWS = {
        attribute: { icon: "hash", title: "amount", kind: "Edge attribute", prov: ["from " + "transfers-2026-03.csv", "inspector-source", "file"], menu: ["context-menus", "attribute"], body: amountBody },
        "attribute-name-role": { icon: "type", title: "id", kind: "Node attribute", prov: ["from transfers-2026-03.csv", "inspector-source", "file"], menu: ["context-menus", "attribute"], body: idBody },
        "filter-step": { icon: "funnel", title: "amount >= 1,000", kind: "Filter step", prov: ["step 1 in Filters", "data-place", "filters"], menu: ["context-menus", "filter-step"], body: filterBody },
    };

    registerSection({
        id: ID,
        title: "Inspector: an attribute or a filter step",
        region: "right",
        rail: "data",
        frame: (state) => ({ left: state === "filter-step" ? "data-place/filters" : "data-place/attributes" }),
        closeTo: "data-place",
        states: [
            { id: "attribute", label: "amount, Role None" },
            { id: "attribute-name-role", label: "id, Role Name" },
            { id: "filter-step", label: "Filter step" },
            { id: "pagerank", label: "PageRank: opens its measure row" },
        ],
        render(el, state) {
            // A run's result attribute has one inspector, its measure row's
            if (state === "pagerank") { location.replace(AB.href("inspector-measure-row", "data")); return; }
            const v = VIEWS[state] || VIEWS.attribute;
            el.append(AB.inspector({
                icon: v.icon, title: v.title, kind: v.kind, provenance: v.prov, menu: v.menu, body: v.body(),
                renameDisabled: state === "filter-step" ? null : "graphty-element cannot rename an attribute across its data",
            }));
        },
    });
})();
