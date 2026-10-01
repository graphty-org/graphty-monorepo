/* Inspector: an attribute or a filter step, opened from the Data place (transfers, March 2026).
   One body each, no tab strip.
   Attribute: Summary (Read as, the one editable dropdown; its roles as read-only tags, each opening
   the Data page where roles are chosen), Values (the measure row's histogram form), Painted by.
   No Notes: an attribute is not a note's subject. Transfers (amount, id) and door entries (floors,
   person_id).
   Filter step: one sentence row, "Apply this step", the count before and after, Notes (none, or the
   step's one note).
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
        ".ia-dd>.ab-design-note{margin:0;max-width:100%;white-space:normal;height:auto}" +
        ".ia-tags{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;min-width:0}" +
        ".ia-tags>.ab-design-note{margin:0;max-width:100%;white-space:normal;height:auto}" +
        ".ia-tagnote{flex-basis:100%;color:var(--cm-text-secondary)}";
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
    const D = () => AB.fx.datasets.doorEntries;

    // The roles row: read-only tags (AB.roleTag), each opening the Data page, where roles are chosen.
    // tags: [[word, second]]; extra: nodes after the tags (a visible note line, a needs mark).
    // ponytail: the Data page has no per-column route yet, so a tag opens the table's page, not the column.
    function roles(tags, page, extra) {
        return AB.fieldRow(tags.length > 1 ? "Roles" : "Role", h("span", { class: "ia-tags" },
            tags.map(([w, second]) => AB.roleTag(w, { second, go: ["data-page", page] })), extra || null));
    }
    // The inspector's Weight tag reads "Weight, set when loaded" (spec 2.4); its link opens the Data page
    const WEIGHT = "every run uses it unless the run picks another. Change it on the Data page";

    // ---------- amount: an edge attribute from the file, Role None ----------
    function amountBody() {
        const t = T();
        const total = t.attributes.find((a) => a.name === "amount (edge)").total;
        return [
            AB.section({ title: "Summary", editable: true },
                dropdown("Read as", READ_AS(), "Number", { needs: OVERRIDE }),
                roles([["Weight, set when loaded", WEIGHT]], "edit-source", [h("span", { class: "ia-tagnote" }, "Higher means: Stronger (chosen when loaded)")]),
                AB.data("On", fmt(t.edges) + " edges (transfers)", { go: ["table-dock", "edges"] }),
                AB.data("Missing", "none: every transfer has an amount (a blank would weigh 1)", { go: ["data-page", "edit-source"] })),
            AB.dataTab({
                // No unit: the file declares none, so the inspector names none
                Values: { summary: "Total " + fmt(total), body: [
                    histogram([100, 86, 64, 45, 31, 22, 15, 10, 7, 5, 3, 2, 2, 1, 1, 1], ["0.50", "98,400"],
                        fmt(t.edges) + " transfers, " + fmt(total) + " in all, " + (total / t.edges).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " on average.", "amount"),
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
                roles([["Key", "each row's id: links from other tables match against it"],
                    ["Name", "the node's name: search, tooltips and the Label line read it"]], "edit-accounts"),
                AB.data("On", fmt(t.nodes) + " nodes (accounts)", { go: ["table-dock", "nodes"] }),
                AB.data("Missing", "none: it is the key")),
            AB.dataTab({
                Values: { summary: fmt(t.nodes) + " distinct", body: AB.data("Distinct", fmt(t.nodes) + ", one per account") },
                "Painted by": { summary: "No rows", body: none("id") },
            }, { kind: "attribute" }),
        ];
    }

    // ---------- floors: buildings' node weight (door entries) ----------
    function floorsBody() {
        const b = D().tables.find((x) => x.name === "buildings");
        const v = b.sample.filter((r) => r.floors !== "").map((r) => Number(r.floors));
        return [
            AB.section({ title: "Summary", editable: true },
                dropdown("Read as", READ_AS(), "Number", { needs: OVERRIDE }),
                // One design note per Summary (on Read as); the weight's gap is said in words under its tag
                // The same words as Analyze's node-weight line: one candidate reads it, waiting on the element
                roles([["Weight, set when loaded", WEIGHT + ". A type with no weight column (person) weighs 1"]], "edit-buildings",
                    [h("span", { class: "ia-tagnote" }, "Read by PageRank (restart weights): each building weighs its floors; each person weighs 1."), AB.needsElement("PageRank's restart weights read node weight once its catalog entry carries nodeWeighted; no graphty-element entry reads node weight yet")]),
                AB.data("On", fmt(b.rows) + " nodes (buildings)", { go: ["data-page", "edit-buildings"] }),
                AB.data("Missing", "1 building has no floors value: its weight reads 1")),
            AB.dataTab({
                Values: { summary: Math.min(...v) + " to " + Math.max(...v) + " floors", body: [
                    AB.data("Range", Math.min(...v) + " to " + Math.max(...v) + " floors"),
                    AB.data("Read", (b.rows - 1) + " of " + b.rows + " buildings (1 reads 1)"),
                ] },
                "Painted by": { summary: "No rows", body: none("floors") },
            }, { kind: "attribute" }),
        ];
    }

    // ---------- count: the door entries' edge weight, derived by One edge per Pair ----------
    function countBody() {
        // count exists only while the entries are loaded One edge per Pair
        if (D().loaded.per !== "pair") return [AB.empty("No count attribute: the entries are loaded " + (D().loaded.per === "row" ? "One edge per Row, so each entry is its own edge and weighs 1." : "each as a node, so no edge merges entries."), { verb: "Edit source", go: ["data-page", "edit-entries"] })];
        const e = D().report.entries, edges = D().loadedEdges(), max = Math.max(...e.pairSample.map((r) => r.count));
        return [
            AB.section({ title: "Summary", editable: true },
                dropdown("Read as", READ_AS(), "Number", { needs: OVERRIDE }),
                roles([["Weight, set when loaded", WEIGHT]], "edit-entries", [h("span", { class: "ia-tagnote" }, "Higher means: Stronger (chosen when loaded). Derived by One edge per Pair: how many entries each pair made")]),
                AB.data("On", fmt(edges) + " edges (entries)", { go: ["table-dock", "door-entries"] }),
                AB.data("Missing", "none: every pair counts at least 1 entry")),
            AB.dataTab({
                Values: { summary: fmt(e.bothEnds) + " entries in " + fmt(edges) + " pairs", body: [
                    AB.data("Entries", fmt(e.bothEnds) + " in " + fmt(edges) + " pairs, " + (e.bothEnds / edges).toFixed(1) + " on average"),
                    AB.data("Busiest pair", fmt(max) + " entries (1001 -> B1)", { go: ["table-dock", "door-entries"] }),
                ] },
                "Painted by": { summary: "No rows", body: none("count") },
            }, { kind: "attribute" }),
        ];
    }

    // ---------- person_id: entries' link to people (door entries) ----------
    function personIdBody() {
        const r = D().report.entries;
        return [
            AB.section({ title: "Summary", editable: true },
                // Number, as the Data page reads it; the match report says it is matched to people.id as text
                dropdown("Read as", READ_AS(), "Number", { needs: OVERRIDE }),
                roles([["From -> person", "each entry starts at the person whose id matches person_id"]], "edit-entries"),
                AB.data("On", fmt(D().loadedEdges()) + " edges (entries)", { go: ["data-page", "edit-entries"] }),
                AB.data("Matched", fmt(r.bothEnds) + " of " + fmt(r.rows) + " rows", { go: ["data-page", "edit-entries"] }),
                AB.data("Unmatched", fmt(r.missingPeople) + " ids not in people", { go: ["data-page", "edit-entries"] })),
            AB.dataTab({
                Values: { summary: fmt(r.leadingZeroKeys) + " keys differ by leading zeros", body: [
                    AB.data("Zeros", fmt(r.leadingZeroKeys) + " keys, as 7 and 0007", { go: ["data-page", "edit-entries"] }),
                    AB.data("Distinct", fmt(r.distinctPersonIds) + " values: " + fmt(r.distinctPersonIds - r.missingPeople) + " people, " + fmt(r.missingPeople) + " not in people"),
                ] },
                "Painted by": { summary: "No rows", body: none("person_id") },
            }, { kind: "attribute" }),
        ];
    }

    // ---------- the filter step ----------
    function filterBody(noted) {
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
        const check = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": "true", "aria-labelledby": "ia-apply-l", "aria-label": "Apply this step" });
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
                // Studio decision (spec, Data > Filters): an edge condition keeps the edges that pass and the nodes at their ends
                h("div", { class: "ab-cap k-secondary" }, "amount is on edges: this step keeps the transfers that pass and the accounts at their ends."),
                apply,
                h("div", { class: "ia-flow" }, h("b", null, fmt(t.nodes)), icon("arrow-right", "sm"), after,
                    AB.link("table-dock", "nodes", "nodes", { class: "ab-link k-secondary" }))),
            noted ? AB.notesSection(1, ["notes-place", "all"], "filter-step") : AB.notesSection(0, null, "filter-step"),
        ];
    }

    const STEP = { icon: "funnel", title: "amount >= 1,000", kind: "Filter step", prov: ["step 1 in Filters", "data-place", "filters"], menu: ["context-menus", "filter-step"] };
    const VIEWS = {
        attribute: { icon: "hash", title: "amount", kind: "Edge attribute", prov: () => ["from " + T().file, "data-page", "edit-source"], menu: ["context-menus", "attribute"], body: amountBody },
        "attribute-name-role": { icon: "type", title: "id", kind: "Node attribute", prov: () => ["from " + T().accountsFile, "data-page", "edit-accounts"], menu: ["context-menus", "attribute"], body: idBody },
        "node-weight": { icon: "hash", title: "floors", kind: "Node attribute", prov: () => ["from buildings.csv", "data-page", "edit-buildings"], menu: ["context-menus", "attribute"], body: floorsBody },
        "edge-weight": { icon: "hash", title: "count", kind: "Edge attribute", prov: () => ["derived from entries.csv", "data-page", "edit-entries"], menu: ["context-menus", "attribute"], body: countBody },
        "link-key": { icon: "type", title: "person_id", kind: "Edge attribute", prov: () => ["from entries.csv", "data-page", "edit-entries"], menu: ["context-menus", "attribute"], body: personIdBody },
        "filter-step": Object.assign({ body: () => filterBody(false) }, STEP),
        "filter-step-noted": Object.assign({ body: () => filterBody(true) }, STEP),
    };
    const isStep = (state) => state === "filter-step" || state === "filter-step-noted";
    const isDoor = (state) => state === "node-weight" || state === "link-key" || state === "edge-weight";

    registerSection({
        id: ID,
        title: "Inspector: an attribute or a filter step",
        region: "right",
        rail: "data",
        // The Data place draws only transfers, so a door-entries attribute shows no left panel rather than the wrong table
        frame: (state) => isDoor(state) ? { left: "data-place/door-entries", dataset: "doorEntries", dock: state === "node-weight" ? "table-dock/door-entries-nodes" : "table-dock/door-entries" } : { left: isStep(state) ? "data-place/filters" : "data-place/attributes" },
        closeTo: "data-place",
        states: [
            { id: "attribute", label: "amount, Weight" },
            { id: "attribute-name-role", label: "id, Key and Name" },
            { id: "node-weight", label: "floors, node Weight (door entries)" },
            { id: "link-key", label: "person_id, From -> person (door entries)" },
            { id: "edge-weight", label: "count, edge Weight from Pair (door entries)" },
            { id: "filter-step", label: "Filter step, no notes" },
            { id: "filter-step-noted", label: "Filter step with a note" },
        ],
        render(el, state) {
            // A run's result attribute has one inspector, its measure row's
            if (state === "pagerank") { location.replace(AB.href("inspector-measure-row", "data")); return; }
            const v = VIEWS[state] || VIEWS.attribute;
            el.append(AB.inspector({
                icon: v.icon, title: v.title, kind: v.kind, provenance: typeof v.prov === "function" ? v.prov() : v.prov, menu: v.menu, body: v.body(),
                renameDisabled: isStep(state) ? null : "a display name for an attribute, kept across its data",
            }));
        },
    });
})();
