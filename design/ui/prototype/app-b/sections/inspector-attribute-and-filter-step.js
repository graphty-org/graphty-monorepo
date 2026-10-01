/* Inspector: an attribute or a filter step, opened from the Data place (transfers, March 2026).
   One body each, no tab strip.
   Attribute: Summary (Read as, the one editable dropdown; its roles as read-only tags, each opening
   the Data page where roles are chosen), Values (the measure row's histogram form), Painted by.
   No Notes: an attribute is not a note's subject. Transfers (amount, id) and door entries (floors,
   person_id).
   Filter step: one sentence row, "Apply this step", the count before and after, Notes (none, or the
   step's one note). Its attribute picker is the field list at menu size (AB.openFieldList).
   Wide and nested (kit/wide-nested.json): legacy_asset_tag partly filled, the 46-character attribute,
   tags as Several values, a step on the hosts with its picker open, a step whose attribute is gone.
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
        ".ia-tagnote{flex-basis:100%;color:var(--cm-text-secondary)}" +
        ".ia-gone{text-decoration:line-through;color:var(--cm-text-secondary)}" +
        ".ia-problem{padding:4px 16px 8px}" +
        ".ia-break{overflow-wrap:anywhere;white-space:normal}" +
        ".ia-apply[aria-disabled=true]{color:var(--cm-text-secondary);cursor:default}";
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
    // The conditions a step offers per attribute type; a list attribute (Several values) reads
    // "contains": the step matches when any item does (spec 11.4).
    const CONDS = {
        num: ["is at least", "is below", "is between", "is empty"],
        list: ["contains", "does not contain", "is empty"],
        other: ["is", "is not", "is one of", "is empty", "is not empty"],
    };
    const condsOf = (type) => CONDS[type] || CONDS.other;
    // An attribute name in a step takes the middle ellipsis (spec 2.5)
    const attrName = (name) => AB.truncMiddle(name, 24);

    // o: { attr, type, cond, value, before, after, unit: [label, state], cap, noted, gone, open }
    // gone: the problem block for an attribute the data no longer has; open: the picker opens on arrival
    function filterBody(o) {
        let on = !o.gone;
        const aText = h("span", { class: o.gone ? "ia-gone" : null }, attrName(o.attr));
        const a = AB.field(aText, { caret: true });
        a.setAttribute("aria-haspopup", "listbox");
        let cur = o.attr, type = o.type;
        const cText = h("span", null, o.cond);
        const c = AB.field(cText, { caret: true });
        const v = h("input", { class: "k-field ia-num", value: o.value || "", "aria-label": "Value", inputmode: type === "num" ? "decimal" : null, hidden: o.value == null });
        // The attribute picker is the field list at menu size, over the project on screen
        const openPicker = () => AB.openFieldList(a, {
            current: o.gone ? null : cur, label: "Attribute",
            onPick(name, t) {
                cur = name; type = t;
                aText.className = "";
                aText.replaceChildren(attrName(name));
                if (!condsOf(t).includes(cText.textContent)) { cText.textContent = condsOf(t)[0]; v.hidden = false; v.value = ""; }
                AB.announce("Attribute: " + name + ", " + cText.textContent);
            },
        });
        a.addEventListener("click", openPicker);
        c.addEventListener("click", () => AB.openMenu(c, condsOf(type).map((x) => ({
            label: x, check: x === cText.textContent,
            onClick: () => { cText.textContent = x; v.hidden = /empty$/.test(x); AB.announce("Condition: " + x); },
        }))));
        AB.tip(a, "Attribute", { label: false });
        AB.tip(c, "Condition", { label: false });
        if (o.open) requestAnimationFrame(openPicker);

        const after = h("b", null, fmt(on ? o.after : o.before));
        const check = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(on), "aria-labelledby": "ia-apply-l", "aria-label": "Apply this step" });
        const toggle = () => {
            if (o.gone) return AB.flash("This step reads nothing until it has an attribute");
            on = !on;
            check.setAttribute("aria-checked", String(on));
            after.textContent = fmt(on ? o.after : o.before);
            AB.announce(on ? "Step applied" : "Step skipped");
        };
        const apply = h("label", { class: "ia-apply", "aria-disabled": o.gone ? "true" : null, on: { click: (e) => { e.preventDefault(); toggle(); } } }, check, h("span", { id: "ia-apply-l" }, "Apply this step"));
        check.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } });
        return [
            AB.section({ title: "Condition", editable: true },
                o.gone ? h("div", { class: "ia-problem" }, AB.problem(o.gone)) : null,
                h("div", { class: "ia-sentence" }, a, c, v),
                o.cap ? h("div", { class: "ab-cap k-secondary" }, o.cap) : null,
                apply,
                h("div", { class: "ia-flow" }, h("b", null, fmt(o.before)), icon("arrow-right", "sm"), after,
                    AB.link("table-dock", o.unit[1], o.unit[0], { class: "ab-link k-secondary" }), o.gone ? h("span", { class: "k-secondary" }, "(skipped)") : null)),
            o.noted ? AB.notesSection(1, ["notes-place", "all"], "filter-step") : AB.notesSection(0, null, "filter-step"),
        ];
    }
    const TRANSFER_STEP = (noted) => ({
        attr: "amount", type: "num", cond: "is at least", value: "1,000", before: T().nodes, after: 812, unit: ["nodes", "nodes"], noted,
        // Studio decision (spec, Data > Filters): an edge condition keeps the edges that pass and the nodes at their ends
        cap: "amount is on edges: this step keeps the transfers that pass and the accounts at their ends.",
    });

    // ---------- the wide and nested projects (kit/wide-nested.json) ----------
    const W = () => AB.fx.datasets.wide;
    const N = () => AB.fx.datasets.nested;
    const P = () => AB.fx.datasets.plainJson;
    const LONG = "vuln_count_critical_unremediated_over_30_days";
    const tally = (vals) => { const c = {}; vals.forEach((x) => { c[x] = (c[x] || 0) + 1; }); return Object.entries(c).sort((p, q) => q[1] - p[1]); };
    const pct = (a, b) => Math.round((a / b) * 100) + "%";
    // The full stored name, wrapping, so it never lives only in a tooltip
    const fullName = (name) => AB.data("Name", h("span", { class: "k-id ia-break" }, name));

    // Step 2 on the hosts (data-place/wide-filters): after "environment is prod", hosts with at least one
    // critical vulnerability open past 30 days. Counts read from the sample's rows, as the Data place does.
    function wideStep() {
        const prod = W().nodeRows.filter((r) => r.environment === "prod");
        return { attr: LONG, type: "num", cond: "is at least", value: "1", before: prod.length, after: prod.filter((r) => r[LONG] >= 1).length, unit: ["hosts", "wide"], open: true };
    }

    // After Replace (data-place/step-attribute-gone): the step was made on the old file's amount_usd;
    // the replacing transfers file names that column amount, so the step reads nothing
    function goneStep() {
        return {
            attr: "amount_usd", type: "num", cond: "is at least", value: "1,000", before: T().nodes, after: T().nodes, unit: ["nodes", "nodes"], noted: true,
            gone: {
                what: "amount_usd is not in " + T().file + " any more, so this step is skipped.",
                todo: "Pick another attribute below (the new file names this column amount), or delete the step from its ... menu.",
            },
        };
    }

    // legacy_asset_tag: an id on 25 of 300 hosts
    function sparseBody() {
        const w = W(), name = "legacy_asset_tag";
        const rows = w.nodeRows.filter((r) => r[name] != null);
        const n = rows.length, without = w.nodes - n;
        const byRole = tally(rows.map((r) => r.role));
        const roleTotal = (role) => w.nodeAttributes.find((a) => a.name === "role").values[role];
        return [
            AB.section({ title: "Summary", editable: true },
                dropdown("Read as", READ_AS(), "Category", { needs: OVERRIDE }),
                AB.data("On", fmt(w.nodes) + " nodes (hosts)", { go: ["table-dock", "wide"] }),
                AB.data("Fill", pct(n, w.nodes) + ": " + n + " of " + fmt(w.nodes) + " hosts have a value"),
                AB.data("No value", fmt(without) + " hosts", { go: ["table-dock", "wide"] })),
            AB.dataTab({
                Values: { summary: n + " distinct, one per host", body: [
                    AB.data("Distinct", n + ", one per host that has a value"),
                    AB.data("Most on", byRole.slice(0, 3).map(([r, k]) => r + " " + k + " of " + roleTotal(r)).join(", ")),
                ] },
                "Painted by": { summary: "No rows", body: none(name) },
            }, { kind: "attribute" }),
        ];
    }

    // The 46-character attribute: the name in full, its values, the Size row that paints from it
    function longBody() {
        const w = W(), v = w.nodeRows.map((r) => r[LONG]);
        const max = Math.max(...v), bins = Array.from({ length: max + 1 }, (_, i) => v.filter((x) => x === i).length);
        const some = v.filter((x) => x >= 1).length;
        return [
            AB.section({ title: "Summary", editable: true },
                fullName(LONG),
                dropdown("Read as", READ_AS(), "Number", { needs: OVERRIDE }),
                AB.data("On", fmt(w.nodes) + " nodes (hosts)", { go: ["table-dock", "wide"] }),
                AB.data("Missing", "none: every host has a value")),
            AB.dataTab({
                Values: { summary: "0 to " + max + ", " + some + " hosts at 1 or more", body: histogram(bins, ["0", String(max)],
                    fmt(w.nodes) + " hosts, 0 to " + max + "; " + some + " have at least 1.", LONG) },
                "Painted by": { summary: "No rows", body: none(LONG) },
            }, { kind: "attribute" }),
        ];
    }

    // tags: an array of values in each researcher, loaded as Several values (a list attribute)
    function listBody() {
        const rs = N().document.data.researchers;
        const items = rs.reduce((k, r) => k + r.tags.length, 0);
        const emptyLists = rs.filter((r) => !r.tags.length).length, several = rs.filter((r) => r.tags.length > 1).length;
        const tags = tally(rs.flatMap((r) => r.tags));
        return [
            AB.section({ title: "Summary", editable: true },
                roles([["Several values", "a list attribute: a filter step matches when any item does. Choose another outcome on the Data page"]], "json-researchers"),
                dropdown("Read as", READ_AS(), "Category", { needs: OVERRIDE }),
                AB.data("Path", h("span", { class: "k-id ia-break" }, "data.researchers[].tags")),
                AB.data("On", fmt(rs.length) + " nodes (researchers)", { go: ["table-dock", "wide"] }),
                AB.data("Items", fmt(items) + " in " + rs.length + " lists; " + several + " hold two or more"),
                AB.data("Empty", emptyLists + " researchers have an empty list"),
                h("div", { class: "ab-cap k-secondary" }, "A filter step on tags reads \"contains\": tags contains " + tags[0][0] + " keeps the " + tags[0][1] + " researchers that hold it.")),
            AB.dataTab({
                Values: { summary: tags.length + " distinct", body: tags.map(([t, k]) => AB.data(t, k + " researchers")) },
                "Painted by": { summary: "No rows", body: none("tags") },
            }, { kind: "attribute" }),
        ];
    }

    // ---------- any other attribute of the wide and nested projects ----------
    // AB.openField(ds, name) is how every attribute list (Data > Attributes, the node inspector's
    // "N more attributes") opens one: the three attributes with a state of their own open it, any other
    // opens wide-field or nested-field, which read the field picked here. A direct visit shows the
    // project's first number field. Every figure is read from kit/wide-nested.json and AB.fieldsOf.
    let picked = null;
    const OWN = { wide: { legacy_asset_tag: "sparse", [LONG]: "long-name" }, nested: { tags: "list-attribute" } };
    AB.openField = (ds, name) => {
        const own = (OWN[ds] || {})[name];
        if (own) return AB.go(ID, own);
        picked = { ds, name };
        AB.go(ID, ds === "nested" ? "nested-field" : ds === "plainJson" ? "plain-field" : "wide-field");
    };
    const at = (rec, rel) => rel.split(".").reduce((o, k) => (o == null ? o : o[k]), rec);
    function fieldOf(ds) {
        const groups = AB.fieldsOf(ds);
        const name = picked && picked.ds === ds ? picked.name : null;
        for (const g of groups) { const x = g.fields.find((f) => f.name === name); if (x) return [x, g]; }
        const g = groups[0];
        return [g.fields.find((f) => f.type === "num") || g.fields[0], g];
    }
    function rowsFor(ds, g) {
        if (ds === "wide") return g.element === "edge" ? W().edgeRows : W().nodeRows;
        if (ds === "plainJson") return g.element === "edge" ? P().document.links : P().document.nodes;
        const doc = N().document;
        return g.table === "researchers" ? doc.data.researchers : g.table === "institutions" ? doc.data.institutions : g.table === "links" ? doc.links : [];
    }
    const UNIT = { hosts: "hosts", connections: "connections", researchers: "researchers", institutions: "institutions", links: "links" };
    function fieldBody(ds) {
        const [x, g] = fieldOf(ds), rows = rowsFor(ds, g), unit = UNIT[g.table] || g.table;
        const vals = rows.map((r) => (ds === "wide" ? r[x.name] : at(r, x.name))).filter((v) => v != null && v !== "" && !(Array.isArray(v) && !v.length));
        const word = { num: "Number", time: "Time", bool: "Category (true or false)", list: "A list", whole: "One value (kept whole)" }[x.type] || "Category";
        const values = [];
        let summary;
        if (x.type === "num") {
            const s2 = vals.slice().sort((a, b) => a - b), med = s2[Math.floor(s2.length / 2)];
            summary = s2.length ? s2[0] + " to " + s2[s2.length - 1] : "no values";
            values.push(AB.data("Range", summary), AB.data("Median", s2.length ? String(med) : "none"));
        } else if (x.type === "whole") {
            summary = "kept as one value";
            values.push(AB.data("Read", "Each value is kept whole; open it on the Data page to read its parts"));
        } else {
            const t = tally(vals.flatMap((v) => (Array.isArray(v) ? v : [v])).map(String));
            summary = t.length + " distinct";
            values.push(AB.data("Distinct", fmt(t.length)), ...t.slice(0, 3).map(([v, k]) => AB.data(AB.truncMiddle(v, 22), k + " " + unit)));
        }
        return { x, g, unit, body: [
            AB.section({ title: "Summary", editable: true },
                fullName(x.name),
                x.type === "whole" || x.type === "list" ? AB.data("Read as", word) : dropdown("Read as", READ_AS(), word === "Number" || word === "Time" ? word : "Category", { needs: OVERRIDE }),
                AB.data("On", fmt(rows.length) + " " + (g.element === "edge" ? "edges" : "nodes") + " (" + unit + ")", { go: ["table-dock", "wide"] }),
                AB.data("Fill", pct(vals.length, rows.length || 1) + ": " + fmt(vals.length) + " of " + fmt(rows.length) + " " + unit + " have a value"),
                AB.data("In use", x.usedBy || "Nothing uses it")),
            AB.dataTab({
                Values: { summary, body: values },
                "Painted by": { summary: "No rows", body: none(x.name) },
            }, { kind: "attribute" }),
        ] };
    }
    const fieldView = (ds) => ({
        icon: "hash", kind: "Attribute", menu: ["context-menus", "attribute"], dyn: () => {
            const r = fieldBody(ds);
            return { icon: r.x.type === "num" ? "hash" : r.x.type === "list" ? "list" : "type", title: AB.truncMiddle(r.x.name, 28), kind: (r.g.element === "edge" ? "Edge" : "Node") + " attribute",
                prov: ds === "wide" ? ["from " + (r.g.element === "edge" ? W().edgesFile : W().file), "data-page", "wide-hosts"] : ds === "plainJson" ? ["from " + P().file, "data-page", "json-plain"] : ["from " + N().file, "data-page", "json-researchers"], body: () => r.body };
        },
    });

    const STEP = { icon: "funnel", title: "amount >= 1,000", kind: "Filter step", prov: ["step 1 in Filters", "data-place", "filters"], menu: ["context-menus", "filter-step"] };
    const ATTR = (icon, title, kind, prov, body) => ({ icon, title, kind, prov, menu: ["context-menus", "attribute"], body });
    const VIEWS = {
        attribute: { icon: "hash", title: "amount", kind: "Edge attribute", prov: () => ["from " + T().file, "data-page", "edit-source"], menu: ["context-menus", "attribute"], body: amountBody },
        "attribute-name-role": { icon: "type", title: "id", kind: "Node attribute", prov: () => ["from " + T().accountsFile, "data-page", "edit-accounts"], menu: ["context-menus", "attribute"], body: idBody },
        "node-weight": { icon: "hash", title: "floors", kind: "Node attribute", prov: () => ["from buildings.csv", "data-page", "edit-buildings"], menu: ["context-menus", "attribute"], body: floorsBody },
        "edge-weight": { icon: "hash", title: "count", kind: "Edge attribute", prov: () => ["derived from entries.csv", "data-page", "edit-entries"], menu: ["context-menus", "attribute"], body: countBody },
        "link-key": { icon: "type", title: "person_id", kind: "Edge attribute", prov: () => ["from entries.csv", "data-page", "edit-entries"], menu: ["context-menus", "attribute"], body: personIdBody },
        "filter-step": Object.assign({ body: () => filterBody(TRANSFER_STEP(false)) }, STEP),
        "filter-step-noted": Object.assign({ body: () => filterBody(TRANSFER_STEP(true)) }, STEP),
        "step-attribute-gone": Object.assign({}, STEP, { title: "amount_usd >= 1,000", prov: ["step 1 in Filters", "data-place", "step-attribute-gone"], body: () => filterBody(goneStep()) }),
        "wide-filter": Object.assign({}, STEP, { title: () => h("span", null, attrName(LONG), " >= 1"), prov: ["step 2 in Filters", "data-place", "wide-filters"], body: () => filterBody(wideStep()) }),
        sparse: ATTR("type", "legacy_asset_tag", "Node attribute", ["from hosts-2026-03.csv", "data-page", "wide-hosts"], sparseBody),
        "long-name": ATTR("hash", () => attrName(LONG), "Node attribute", ["from hosts-2026-03.csv", "data-page", "wide-hosts"], longBody),
        "list-attribute": ATTR("list", "tags", "Node attribute", ["from network-export-2026-03.json", "data-page", "json-researchers"], listBody),
        "wide-field": fieldView("wide"),
        "nested-field": fieldView("nested"),
        "plain-field": fieldView("plainJson"),
    };
    const isStep = (state) => ["filter-step", "filter-step-noted", "step-attribute-gone", "wide-filter"].includes(state);
    const isDoor = (state) => state === "node-weight" || state === "link-key" || state === "edge-weight";
    // The wide and nested routes: the project and its Data place
    const DS_FRAME = {
        "step-attribute-gone": { left: "data-place/step-attribute-gone", dataset: "transactions" },
        "wide-filter": { left: "data-place/wide-filters", dataset: "wide" },
        sparse: { left: "data-place/attributes-wide", dataset: "wide" },
        "long-name": { left: "data-place/attributes-wide", dataset: "wide" },
        "list-attribute": { left: "data-place/attributes-nested", dataset: "nested" },
        "wide-field": { left: "data-place/attributes-wide", dataset: "wide" },
        "nested-field": { left: "data-place/attributes-nested", dataset: "nested" },
        "plain-field": { left: "data-place/plain-json", dataset: "plainJson" },
    };

    registerSection({
        id: ID,
        title: "Inspector: an attribute or a filter step",
        region: "right",
        rail: "data",
        // The Data place draws only transfers, so a door-entries attribute shows no left panel rather than the wrong table
        frame: (state) => DS_FRAME[state] || (isDoor(state) ? { left: "data-place/door-entries", dataset: "doorEntries", dock: state === "node-weight" ? "table-dock/door-entries-nodes" : "table-dock/door-entries" } : { left: isStep(state) ? "data-place/filters" : "data-place/attributes" }),
        closeTo: "data-place",
        states: [
            { id: "attribute", label: "amount, Weight" },
            { id: "attribute-name-role", label: "id, Key and Name" },
            { id: "node-weight", label: "floors, node Weight (door entries)" },
            { id: "link-key", label: "person_id, From -> person (door entries)" },
            { id: "edge-weight", label: "count, edge Weight from Pair (door entries)" },
            { id: "filter-step", label: "Filter step, no notes" },
            { id: "filter-step-noted", label: "Filter step with a note" },
            { id: "step-attribute-gone", label: "Filter step: its attribute gone after Replace" },
            { id: "sparse", label: "legacy_asset_tag, partly filled (hosts)" },
            { id: "list-attribute", label: "tags, Several values (nested JSON)" },
            { id: "wide-filter", label: "Filter step: attribute picker on the hosts" },
            { id: "long-name", label: "The 46-character attribute (hosts)" },
            { id: "wide-field", label: "Any other host or connection attribute (the first number one when opened directly)" },
            { id: "nested-field", label: "Any other researcher attribute (nested JSON)" },
            { id: "plain-field", label: "Any attribute of the plain JSON graph (Coauthors)" },
        ],
        render(el, state) {
            // A run's result attribute has one inspector, its measure row's
            if (state === "pagerank") { location.replace(AB.href("inspector-measure-row", "data")); return; }
            const v0 = VIEWS[state] || VIEWS.attribute, v = v0.dyn ? Object.assign({}, v0, v0.dyn()) : v0;
            el.append(AB.inspector({
                icon: v.icon, title: typeof v.title === "function" ? v.title() : v.title, kind: v.kind, provenance: typeof v.prov === "function" ? v.prov() : v.prov, menu: v.menu, body: v.body(),
                renameDisabled: isStep(state) ? null : "a display name for an attribute, kept across its data",
            }));
        },
    });
})();
