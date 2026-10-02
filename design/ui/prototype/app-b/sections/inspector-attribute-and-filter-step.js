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
        ".ia-dd{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;min-width:0}" +
        ".ia-dd>.k-field{flex:none;width:auto;max-width:100%}" +
        ".ia-hist{display:flex;align-items:flex-end;gap:1px;height:72px;margin:4px 16px 0}" +
        ".ia-hist>i{flex:1 1 0;background:var(--cm-border-translucent-strong);border-radius:1px 1px 0 0;min-height:1px}" +
        ".ia-axis{display:flex;justify-content:space-between;padding:2px 16px 0;color:var(--cm-text-secondary);font-size:11px;font-variant-numeric:tabular-nums}" +
        ".ia-dd>.ab-design-note{margin:0;max-width:100%;white-space:normal;height:auto}" +
        ".ia-tags{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;min-width:0}" +
        ".ia-tags>.ab-design-note{margin:0;max-width:100%;white-space:normal;height:auto}" +
        ".ia-tagnote{flex-basis:100%;color:var(--cm-text-secondary)}" +
        ".ia-tagline{flex-basis:100%}" +
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
    // A name too long for one line is not repeated here: the header and Summary already carry it
    const none = (name) => AB.empty("No row paints from " + (name.length > 24 ? "this attribute" : name) + ".");
    // Painted by: the rows that paint from the attribute, as links (AB.painted: a loaded project's bindings)
    const paintedBy = (ds, name) => {
        const l = ((AB.painted || {})[ds] || []).filter((p) => p.name === name);
        if (!l.length) return { summary: "No rows", body: none(name) };
        return { summary: AB.count(l.length, "row"), body: l.map((p) => AB.data(p.element === "edge" && p.prop === "Size" ? "Width" : p.prop,
            p.on === "row" ? AB.truncMiddle(name, 22) : "Everything", { go: p.on === "row" ? ["graph-place", "painted"] : p.on.split("/") })) };
    };
    const D = () => AB.fx.datasets.doorEntries;
    const entriesFile = () => D().tables.find((x) => x.name === "entries").file;

    // The roles row: read-only tags (AB.roleTag), each opening the Data page at this attribute's column,
    // where roles are chosen. tags: [[word, second]]; col: the column; extra: nodes after the tags.
    // A Weight tag carries its meaning in visible words after it (spec 5.2), never only in the tooltip.
    function roles(tags, page, col, extra) {
        return AB.fieldRow(tags.length > 1 ? "Roles" : "Role", h("span", { class: "ia-tags" },
            tags.map(([w, second]) => [atColumn(AB.roleTag(w, { second: second + ". Opens the Data page at " + col, go: ["data-page", page] }), col),
                /^Weight/.test(w) ? h("span", { class: "ia-tagline" }, "-- " + WEIGHT_USE) : null]), extra || null));
    }
    // ponytail: the Data page has no per-column route, so after the tag's own navigation this finds the
    // column's role control (data-k "r:<col>") once the page draws it, scrolls to it and focuses it.
    // A column route on the Data page would replace this.
    function atColumn(tag, col) {
        const seek = (tries) => {
            const b = document.querySelector(`.dpg-role[data-k="r:${window.CSS.escape(col)}"]`);
            if (!b) return tries && requestAnimationFrame(() => seek(tries - 1));
            document.querySelectorAll(".dpg-role").forEach((x) => (x.tabIndex = -1));
            b.tabIndex = 0;
            b.scrollIntoView({ block: "nearest", inline: "center" });
            b.focus();
        };
        tag.addEventListener("click", () => seek(60));
        tag.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") seek(60); });
        return tag;
    }
    // Changing Name or Time after load: whether graphty-element re-derives what depends on it (spec 5.2)
    const NAME_TIME = () => AB.openQuestion("To confirm with graphty-element: that changing Name or Time after load re-derives what depends on it (labels, search, the walk, a time window)");
    // "N <rows> have no <attr> value: its weight reads 1 | 0" (spec 2.4, missingWeight, default 1)
    function blankWeight(n, noun, attr) {
        const holder = h("span", { class: "ia-dd" });
        const draw = (v) => holder.replaceChildren(AB.count(n, noun) + (n === 1 ? " has" : " have") + " no " + attr + " value: its weight reads",
            AB.seg([["1", "1"], ["0", "0"]], v, (x) => { draw(x); AB.announce("A blank " + attr + " value weighs " + x); holder.querySelector("[aria-checked=true]").focus(); }, { label: "A blank " + attr + " value weighs" }));
        draw("1");
        return holder;
    }
    // Where an attribute came from, in full: the header's provenance link is cut beside the kind at the
    // inspector's width (its tooltip holds the rest), so the Summary's From row names the file, wrapping,
    // and says the values were imported, so they never read as computed by graphty.
    const fromRow = (file, go, how) => AB.data("From", h("span", { class: "ia-break" }, file + " (" + (how || "imported, not computed") + ")"), { go });
    // The inspector's Weight tag reads "Weight, set when loaded" (spec 2.4); its link opens the Data page
    const WEIGHT_USE = "every run uses it unless the run picks another";
    const WEIGHT = WEIGHT_USE + ". Change it on the Data page";

    // ---------- amount: an edge attribute from the file, Role None ----------
    function amountBody() {
        const t = T();
        const total = t.attributes.find((a) => a.name === "amount (edge)").total;
        return [
            AB.section({ title: "Summary", editable: true },
                dropdown("Read as", READ_AS(), "Number", { needs: OVERRIDE }),
                roles([["Weight, set when loaded", WEIGHT]], "edit-source", "amount", [h("span", { class: "ia-tagnote" }, "Higher means: Stronger (chosen when loaded)")]),
                fromRow(t.file, ["data-page", "edit-source"]),
                AB.data("On", AB.count(t.edges, "edge") + " (transfers)", { go: ["table-dock", "edges"] }),
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
                    ["Name for account", "each account's name: search, tooltips and the Label line read it"]], "edit-accounts", "id", [NAME_TIME()]),
                fromRow(t.accountsFile, ["data-page", "edit-accounts"]),
                AB.data("On", AB.count(t.nodes, "node") + " (accounts)", { go: ["table-dock", "nodes"] }),
                AB.data("Missing", "none: it is the key")),
            AB.dataTab({
                Values: { summary: fmt(t.nodes) + " distinct", body: AB.data("Distinct", fmt(t.nodes) + ", one per account") },
                "Painted by": { summary: "No rows", body: none("id") },
            }, { kind: "attribute" }),
        ];
    }

    // ---------- name: people's Name role (door entries) ----------
    function personNameBody() {
        const p = D().tables.find((x) => x.name === "people");
        const people = D().loadedTypes().person;
        return [
            AB.section({ title: "Summary", editable: true },
                dropdown("Read as", READ_AS(), "Category", { needs: OVERRIDE }),
                roles([["Name for person", "each person's name: the inspector title, search, tooltips and the Label line read it"]], "edit-people", "name", [NAME_TIME()]),
                fromRow(p.file, ["data-page", "edit-people"]),
                AB.data("On", AB.count(people, "node") + " (people)", { go: ["table-dock", "door-entries-nodes"] })),
            AB.dataTab({
                Values: { summary: "one per person", body: AB.data("Sample", p.sample.slice(0, 3).map((r) => r.name).join(", ")) },
                "Painted by": { summary: "No rows", body: none("name") },
            }, { kind: "attribute" }),
        ];
    }

    // ---------- floors: buildings' node weight (door entries) ----------
    function floorsBody() {
        const b = D().tables.find((x) => x.name === "buildings");
        const v = b.sample.filter((r) => r.floors !== "").map((r) => Number(r.floors));
        const blank = b.sample.length - v.length;
        return [
            AB.section({ title: "Summary", editable: true },
                dropdown("Read as", READ_AS(), "Number", { needs: OVERRIDE }),
                // The weight's gap is said in visible words under its tag (spec 5.2): nothing reads node weight yet
                roles([["Weight, set when loaded", WEIGHT + ". A type with no weight column (person) weighs 1"]], "edit-buildings", "floors",
                    [h("span", { class: "ia-tagnote" }, "No measure reads node weight yet. PageRank's restart weights would."), AB.needsElement("PageRank's restart weights read node weight once its catalog entry carries nodeWeighted; no graphty-element entry reads node weight yet")]),
                fromRow(b.file, ["data-page", "edit-buildings"]),
                AB.data("On", AB.count(b.rows, "node") + " (buildings)", { go: ["data-page", "edit-buildings"] }),
                AB.fieldRow("Missing", blankWeight(blank, "building", "floors"))),
            AB.dataTab({
                Values: { summary: Math.min(...v) + " to " + Math.max(...v) + " floors", body: [
                    AB.data("Range", Math.min(...v) + " to " + Math.max(...v) + " floors"),
                    AB.data("Read", AB.count(b.rows - blank, "building", { of: b.rows }) + " have a floors value"),
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
                roles([["Weight, set when loaded", WEIGHT]], "edit-entries", "count", [h("span", { class: "ia-tagnote" }, "Higher means: Stronger (chosen when loaded). Derived by One edge per Pair: how many entries each pair made")]),
                fromRow(entriesFile(), ["data-page", "edit-entries"], "counted per pair when loaded"),
                AB.data("On", AB.count(edges, "edge") + " (entries)", { go: ["table-dock", "door-entries"] }),
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
                roles([["From -> person", "each entry starts at the person whose id matches person_id"]], "edit-entries", "person_id"),
                fromRow(entriesFile(), ["data-page", "edit-entries"]),
                AB.data("On", AB.count(D().loadedEdges(), "edge") + " (entries)", { go: ["data-page", "edit-entries"] }),
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

    // o: { attr, type, cond, value, before, after, unit: [label, state], cap, noted, gone, open, on, step,
    //   sentence, scope, full, edges }
    // sentence: rows that replace the attribute sentence (a step of another kind, such as neighbors);
    // scope: the Scope line, what a computed step counts on; full: the count the step keeps on the full graph.
    // edges: { before, after, full } for a condition on an edge attribute: every count names the edges
    // first, then the nodes at their ends, so no count of the step reads as the whole graph's.
    // gone: the problem block for an attribute the data no longer has; open: the picker opens on arrival.
    // attr null: a new step, which reads nothing until a field is picked (its Condition waits for it).
    // step: the Data place's step object, renamed by its rule as the rule changes.
    function filterBody(o) {
        let on = o.on != null ? o.on : true; // a gone step stays on, as its Data place row shows; it is skipped
        const aText = h("span", { class: o.gone ? "ia-gone" : null }, o.attr ? attrName(o.attr) : h("span", { class: "k-secondary" }, "Pick an attribute"));
        const a = AB.field(aText, { caret: true });
        a.setAttribute("aria-haspopup", "listbox");
        let cur = o.attr, type = o.type;
        const cText = h("span", null, o.cond || "");
        const c = AB.field(cText, { caret: true });
        c.hidden = !o.attr;
        const v = h("input", { class: "k-field ia-num", value: o.value || "", "aria-label": "Value", inputmode: type === "num" ? "decimal" : null, hidden: o.value == null });
        // The rule is the step's name: the inspector header and the Data place's row follow it
        const rename = () => {
            const rule = cur + " " + cText.textContent + (v.hidden || !v.value ? "" : " " + v.value);
            if (o.step) {
                o.step.name = rule;
                const row = document.querySelector(`#ab-left [data-row="${window.CSS.escape(o.step.id)}"] .ab-tname`);
                if (row) row.textContent = rule;
            }
            const head = document.querySelector("#ab-right .ab-insp-head .k-name");
            if (head) head.replaceChildren(attrName(cur), " " + cText.textContent + (v.hidden || !v.value ? "" : " " + v.value));
        };
        // The attribute picker is the field list at menu size, over the project on screen
        const openPicker = () => AB.openFieldList(a, {
            current: o.gone ? null : cur, label: "Attribute",
            // a step computes degree on what the steps above left, so it is offered before any run wrote it
            computed: o.step ? [["degree", "num"]] : null,
            onPick(name, t) {
                cur = name; type = t;
                aText.className = "";
                aText.replaceChildren(attrName(name));
                c.hidden = false;
                // A new condition starts with no value, so the step keeps every node until one is typed
                if (!condsOf(t).includes(cText.textContent)) { cText.textContent = condsOf(t)[0]; v.hidden = false; v.value = ""; after.textContent = shown(false); }
                rename();
                AB.announce("Attribute: " + name + ", " + cText.textContent);
                requestAnimationFrame(() => (v.hidden ? c : v).focus());
            },
        });
        v.addEventListener("change", rename);
        a.addEventListener("click", openPicker);
        c.addEventListener("click", () => AB.openMenu(c, condsOf(type).map((x) => ({
            label: x, check: x === cText.textContent,
            onClick: () => { cText.textContent = x; v.hidden = /empty$/.test(x); rename(); AB.announce("Condition: " + x); },
        }))));
        AB.tip(a, "Attribute", { label: false });
        AB.tip(c, "Condition", { label: false });
        if (o.open) requestAnimationFrame(openPicker);

        // What the step keeps of what the steps above left, in the one count wording ("40 of 60 nodes")
        const kept = (n) => AB.count(n, o.unit[0].replace(/s$/, ""), { of: o.before });
        const E = o.edges;
        var shown = (applied) => (E ? AB.count(applied ? E.after : E.before, "edge", { of: E.before }) + ", " : "") + kept(applied ? o.after : o.before); // var: the picker above calls it
        var after = h("span", null, shown(on)); // var: the picker above sets it
        const check = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(on), "aria-labelledby": "ia-apply-l", "aria-label": "Apply this step" });
        const toggle = () => {
            if (o.gone) return AB.flash("This step reads nothing until it has an attribute");
            on = !on;
            check.setAttribute("aria-checked", String(on));
            after.textContent = shown(on);
            AB.announce(on ? "Step applied" : "Step skipped");
        };
        const apply = h("label", { class: "ia-apply", "aria-disabled": o.gone ? "true" : null, on: { click: (e) => { e.preventDefault(); toggle(); } } }, check, h("span", { id: "ia-apply-l" }, "Apply this step"));
        check.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } });
        return [
            AB.section({ title: "Condition", editable: true },
                o.gone ? h("div", { class: "ia-problem" }, AB.problem(o.gone)) : null,
                o.sentence || h("div", { class: "ia-sentence" }, a, c, v),
                o.scope ? AB.fieldRow("Scope", h("span", null, o.scope)) : null,
                o.cap ? h("div", { class: "ab-cap k-secondary" }, o.cap) : null,
                apply,
                // Both counts are named: what this step does to what the steps above left, and the full graph
                // A computed step's two counts are plain text side by side (black, neither a link), so they read as a pair
                AB.data("This step", h("span", null, after, o.gone ? " (skipped)" : null), o.full != null ? null : { go: ["table-dock", o.unit[1]] }),
                o.full != null ? AB.data("Full graph", (E ? AB.count(E.full, "edge") + ", " : "") + AB.count(o.full, "node") + " would pass") : null),
            o.noted ? AB.notesSection(1, ["notes-place", "all"], "filter-step") : AB.notesSection(0, null, "filter-step"),
        ];
    }
    // The transfers of 1,000 or more: the fixture has no edge list, so this stands in for graphty-element's
    // count of the edges the step keeps (as the Data place's 812 does for the accounts at their ends)
    const BIG_EDGES = 1204;
    const TRANSFER_STEP = (noted) => ({
        attr: "amount", type: "num", cond: "is at least", value: "1,000", before: T().nodes, after: 812, unit: ["nodes", "edges"], noted,
        edges: { before: T().edges, after: BIG_EDGES },
        // Step 1: nothing runs above it, so it counts on the full graph and both counts agree
        scope: "amount on all " + AB.count(T().edges, "edge") + " (transfers): no step runs before this one",
        // Studio decision (spec, Data > Filters): an edge condition keeps the edges that pass and the nodes at their ends
        cap: "amount is on edges: this step keeps the transfers that pass and the accounts at their ends.",
    });

    // ---------- computed steps on Les Miserables (fixtures.json lesmis.filterSteps) ----------
    // Step 1 is "degree >= 2" (77 to 60 nodes). Step 2 counts on what step 1 left, so its inspector names
    // that in a Scope line and shows both counts: left after the steps above, and on the full graph.
    const LM = () => AB.fx.datasets.lesmis, LF = () => LM().filterSteps;
    const rule = (i) => LF().steps[i].replace(/^Filter to /, "");
    const step1Scope = () => "the " + fmt(LF().after.step1) + " nodes step 1 (" + rule(0) + ") leaves, not the full graph";
    const KEEP = [
        { label: "By value", desc: "By an attribute or computed value" }, { label: "Largest component", desc: "The largest component" },
        { label: "k-core", desc: "A k-core" }, { label: "Neighbors", desc: "The neighbors of the selection" },
    ];
    function degreeStep() {
        return { attr: "degree", type: "num", cond: "is at least", value: rule(1).split(">= ")[1], before: LF().after.step1, after: LF().after.step2, full: LF().statsByState["2"].nodes,
            unit: ["nodes", "nodes"], scope: "Degree on " + step1Scope() };
    }
    const UNDIRECTED = "Les Miserables is undirected: every edge goes both ways";
    const NEIGHBOR_OPTS = "graphty-element's neighbors filter takes hops only; a direction and a From date (a time window on a time attribute) are options it needs";
    // Neighbors of Valjean after step 1: he keeps fewer neighbors there than on the full graph
    function neighborsStep() {
        const near = LF().byStep[0].top.find((r) => r.label === "Valjean").degree, all = LM().valjeanNeighbors;
        return { attr: null, before: LF().after.step1, after: near + 1, full: all + 1, unit: ["nodes", "nodes"], open: false,
            sentence: [dropdown("Keep", KEEP, "Neighbors"), AB.data("Of", "Valjean, 1 hop", { go: ["inspector-node", "why-this-look"] }),
                // graphty-element's neighbors options: Direction (Both | Out | In) and a From date on a time attribute
                dropdown("Direction", [{ label: "Both" }, { label: "Out", disabled: UNDIRECTED }, { label: "In", disabled: UNDIRECTED }], "Both", { needs: NEIGHBOR_OPTS }),
                dropdown("From date", [{ label: "Any time" }, { label: "Pick a date...", disabled: "These edges have no time attribute" }], "Any time", { needs: NEIGHBOR_OPTS })],
            scope: "Neighbors among " + step1Scope(),
            cap: "Keeps Valjean and the " + near + " neighbors he has there; on the full graph he has " + all + "." };
    }
    // The step row's own menu (spec: Move up, Move down, Add note, Delete)
    const lmStepMenu = (title) => (b) => AB.openMenu(b, [
        { heading: title },
        { label: "Move up", shortcut: "Ctrl+]", onClick: () => AB.flash("Move up (not available yet)") },
        { label: "Move down", shortcut: "Ctrl+[", disabled: "Already last" },
        { sep: true },
        AB.cmd("add-note"),
        { sep: true },
        { label: "Delete", shortcut: "Del", onClick: () => { AB.deleted("the step " + title, () => AB.go(ID, AB.route.state)); AB.go("data-place", "graph-file"); } },
    ]);
    const LM_STEP = (title, body) => ({ icon: "funnel", title, kind: "Filter step", prov: ["step 2 in Filters", "data-place", "graph-file"], menu: lmStepMenu(title), body });
    const lmFrame = (after) => ({ left: "data-place/graph-file", dataset: "lesmis", chip: AB.count(after, "node", { of: LM().nodes }), filterOn: ["degree"] });

    // ---------- the wide and nested projects (kit/wide-nested.json) ----------
    const W = () => AB.fx.datasets.wide;
    const N = () => AB.fx.datasets.nested;
    const P = () => AB.fx.datasets.plainJson;
    const LONG = "vuln_count_critical_unremediated_over_30_days";
    const tally = (vals) => { const c = {}; vals.forEach((x) => { c[x] = (c[x] || 0) + 1; }); return Object.entries(c).sort((p, q) => q[1] - p[1]); };
    const pct = (a, b) => (a && a / b < 0.005 ? "under 1%" : Math.round((a / b) * 100) + "%");
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
            attr: "amount_usd", type: "num", cond: "is at least", value: "1,000", before: T().nodes, after: T().nodes, unit: ["nodes", "edges"], noted: true,
            edges: { before: T().edges, after: T().edges },
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
                fromRow(w.file, ["data-page", "edit-wide-hosts"]),
                AB.data("On", AB.count(w.nodes, "node") + " (hosts)", { go: ["table-dock", "wide"] }),
                AB.data("Fill", pct(n, w.nodes) + ": " + n + " of " + fmt(w.nodes) + " hosts have a value"),
                AB.data("No value", fmt(without) + " hosts", { go: ["table-dock", "wide"] })),
            AB.dataTab({
                Values: { summary: n + " distinct, one per host", body: [
                    AB.data("Distinct", n + ", one per host that has a value"),
                    AB.data("Most on", byRole.slice(0, 3).map(([r, k]) => r + " " + k + " of " + roleTotal(r)).join(", ")),
                ] },
                "Painted by": paintedBy("wide", name),
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
                fromRow(w.file, ["data-page", "edit-wide-hosts"]),
                AB.data("On", AB.count(w.nodes, "node") + " (hosts)", { go: ["table-dock", "wide"] }),
                AB.data("Missing", "none: every host has a value")),
            AB.dataTab({
                Values: { summary: "0 to " + max + ", " + some + " hosts at 1 or more", body: histogram(bins, ["0", String(max)],
                    fmt(w.nodes) + " hosts, 0 to " + max + "; " + some + " have at least 1.", LONG) },
                "Painted by": paintedBy("wide", LONG),
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
                // how the array was loaded is the value's form, not a role (roles: Key, Name, Time, Weight, Subtype, Links to)
                AB.fieldRow("Holds", AB.roleTag("Several values", { second: "a list attribute: a filter step matches when any item does. Choose another outcome on the Data page", go: ["data-page", "edit-json-researchers"] })),
                dropdown("Read as", READ_AS(), "Category", { needs: OVERRIDE }),
                AB.data("Path", h("span", { class: "k-id ia-break" }, "tags")), AB.data("In", h("span", { class: "k-id ia-break" }, "data.researchers[]")),
                fromRow(N().file, ["data-page", "edit-json-researchers"]),
                AB.data("On", AB.count(rs.length, "node") + " (researchers)", { go: ["table-dock", "wide"] }),
                AB.data("Items", fmt(items) + " in " + rs.length + " lists; " + several + " hold two or more"),
                AB.data("Empty", emptyLists + " researchers have an empty list"),
                h("div", { class: "ab-cap k-secondary" }, "A filter step on tags reads \"contains\": tags contains " + tags[0][0] + " keeps the " + tags[0][1] + " researchers that hold it.")),
            AB.dataTab({
                Values: { summary: tags.length + " distinct", body: tags.map(([t, k]) => AB.data(t, k + " researchers")) },
                "Painted by": paintedBy("nested", "tags"),
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
    // amount and id on the transfers, and the door entries, keep their own attribute states; any other
    // transfers attribute opens transactions-field; Les Miserables opens lesmis-field
    const KEPT = {
        transactions: (name) => (/^id\b/.test(name) ? "attribute-name-role" : name === "amount" ? "attribute" : "transactions-field"),
        doorEntries: (name) => ({ name: "person-name", floors: "node-weight", count: "edge-weight", person_id: "link-key" })[name] || null,
    };
    AB.openField = (ds, name) => {
        const own = (OWN[ds] || {})[name];
        if (own) return AB.go(ID, own);
        picked = { ds, name };
        const st = KEPT[ds] ? KEPT[ds](name) : { nested: "nested-field", transactions: "transactions-field", plainJson: "plain-field", lesmis: "lesmis-field" }[ds] || "wide-field";
        if (!st) return AB.flash("Opens " + name + "'s inspector (not available yet)");
        // From one field to another on the same route the hash does not change: render the new pick anyway
        if (location.hash === AB.href(ID, st).replace(/^[^#]*/, "")) return window.dispatchEvent(new HashChangeEvent("hashchange"));
        AB.go(ID, st);
    };

    // ---------- any filter step of any project (AB.openStep) ----------
    // The Data place hands over the step and the place it is listed in: { ds, left, step, attr, type,
    // cond, value, before, after, unit }. A new step has no attr: its field list opens on arrival, empty
    // (owner rule: a new line binds nothing until the reader picks a field). A direct visit shows a new
    // step on the transfers.
    let curStep = null;
    AB.openStep = (o) => { curStep = o; AB.go(ID, "step"); };
    const stepOf = () => curStep || { ds: "transactions", left: "data-place/new-step", attr: null, before: T().nodes, after: T().nodes, unit: ["nodes", "nodes"] };
    const stepView = () => {
        const o = stepOf();
        // its "..." is the step row's own menu in the Data place (o.menu), else the transfers step's
        return { icon: "funnel", title: o.attr ? h("span", null, attrName(o.attr), " " + o.cond + (o.value ? " " + o.value : "")) : "New step", kind: "Filter step", menu: o.menu || ["context-menus", "filter-step"],
            prov: ["in Filters", o.left.split("/")[0], o.left.split("/")[1]], body: () => filterBody(Object.assign({ open: !o.attr }, o)) };
    };
    const at = (rec, rel) => rel.split(".").reduce((o, k) => (o == null ? o : o[k]), rec);
    function fieldOf(ds) {
        const groups = AB.fieldsOf(ds);
        const name = picked && picked.ds === ds ? picked.name : null;
        for (const g of groups) { const x = g.fields.find((f) => f.name === name); if (x) return [x, g]; }
        // A direct visit to the hosts shows a name too long for the header (middle ellipsis, full name in
        // its tooltip and the Summary); elsewhere the first number field
        if (ds === "wide") for (const g of groups) { const x = g.fields.find((f) => f.name.length > 28 && !OWN.wide[f.name]); if (x) return [x, g]; }
        const g = groups[0];
        return [g.fields.find((f) => f.type === "num") || g.fields[0], g];
    }
    function rowsFor(ds, g) {
        if (ds === "wide") return g.element === "edge" ? W().edgeRows : W().nodeRows;
        if (ds === "plainJson") return g.element === "edge" ? P().document.links : P().document.nodes;
        if (ds === "lesmis") return g.element === "edge" ? [] : AB.fx.datasets.lesmis.rows; // the kit has no edge rows
        const doc = N().document;
        return g.table === "researchers" ? doc.data.researchers : g.table === "institutions" ? doc.data.institutions : g.table === "links" ? doc.links : [];
    }
    // The transfers fixture holds each attribute's own counts and range (kit/fixtures.json
    // transactions.attributes), not its rows: the Values read those, and the Fill reads the counts
    const tDate = (x) => String(x).slice(0, 10);
    function transfersValues(x, g) {
        const t = T(), meta = t.attributes.find((a) => a.name === x.name || a.name === x.name + " (edge)") || {};
        const n = g.element === "edge" ? t.edges : t.nodes, unit = g.element === "edge" ? "transfers" : "accounts";
        const values = [];
        let summary = "values in " + meta.source, filled = null;
        if (meta.values) {
            const t2 = Object.entries(meta.values).sort((p, q) => q[1] - p[1]);
            filled = t2.reduce((k, [, c]) => k + c, 0);
            summary = t2.length + " distinct";
            values.push(AB.data("Distinct", fmt(t2.length)), ...t2.slice(0, 3).map(([v, k]) => AB.data(AB.truncMiddle(v, 22), AB.count(k, unit.replace(/s$/, "")))));
        } else if (meta.range) {
            summary = x.type === "time" ? tDate(meta.range[0]) + " to " + tDate(meta.range[1]) : meta.range[0] + " to " + meta.range[1];
            values.push(AB.data("Range", summary));
        } else values.push(AB.data("Values", "Read from " + meta.source + " on the Data page"));
        if (meta.sourceNote) values.push(h("div", { class: "ab-cap k-secondary" }, meta.sourceNote));
        // alertTime has no counts of its own: it is filled on the flagged accounts, as alertRule is
        if (filled == null && meta.note) filled = Object.values(t.attributes.find((a) => a.name === "alertRule").values).reduce((k, c) => k + c, 0);
        return { summary, values, n, unit, filled, note: meta.note, file: meta.source || t.accountsFile };
    }
    const UNIT = { hosts: "hosts", connections: "connections", researchers: "researchers", institutions: "institutions", links: "links", nodes: "nodes", edges: "edges" };
    function fieldBody(ds) {
        if (ds === "transactions") return transfersBody();
        const [x, g] = fieldOf(ds), rows = rowsFor(ds, g), unit = UNIT[g.table] || g.table;
        const edit = { wide: ["data-page", g.element === "edge" ? "edit-wide-connections" : "edit-wide-hosts"], plainJson: ["data-page", g.element === "edge" ? "edit-plain-links" : "edit-plain-nodes"], lesmis: ["data-page", "edit-graph-file"] }[ds] || ["data-page", "edit-json-researchers"];
        const file = ds === "wide" ? (g.element === "edge" ? W().edgesFile : W().file) : ds === "lesmis" ? AB.fx.datasets.lesmis.file : (ds === "plainJson" ? P() : N()).file;
        const vals = rows.map((r) => (ds === "wide" || ds === "lesmis" ? r[x.name] : at(r, x.name))).filter((v) => v != null && v !== "" && !(Array.isArray(v) && !v.length));
        const word = { num: "Number", time: "Time", bool: "Category (true or false)", list: "A list", whole: "One value (kept whole)" }[x.type] || "Category";
        const values = [];
        let summary;
        if (!rows.length) {
            // Les Miserables' edge attribute: the kit counts its edges but holds none of its values
            summary = "no values in the sample";
            values.push(AB.data("Values", "The sample holds no edge rows; the Data page reads them from " + AB.fx.datasets.lesmis.file));
        } else if (x.type === "num") {
            const s2 = vals.slice().sort((a, b) => a - b), med = s2[Math.floor(s2.length / 2)];
            summary = s2.length ? s2[0] + " to " + s2[s2.length - 1] : "no values";
            values.push(AB.data("Range", summary), AB.data("Median", s2.length ? String(med) : "none"));
        } else if (x.type === "whole") {
            summary = "kept as one value";
            values.push(AB.data("Read", "Each value is kept whole; open it on the Data page to read its parts"));
        } else {
            const t = tally(vals.flatMap((v) => (Array.isArray(v) ? v : [v])).map(String));
            summary = t.length + " distinct";
            values.push(AB.data("Distinct", fmt(t.length)), ...t.slice(0, 3).map(([v, k]) => AB.data(AB.truncMiddle(v, 22), AB.count(k, unit.replace(/s$/, "")))));
        }
        return { x, g, unit, edit, file, body: [
            AB.section({ title: "Summary", editable: true },
                fullName(x.name),
                x.type === "whole" || x.type === "list" ? AB.data("Read as", word) : dropdown("Read as", READ_AS(), word === "Number" || word === "Time" ? word : "Category", { needs: OVERRIDE }),
                fromRow(file, edit),
                AB.data("On", AB.count(rows.length || AB.fx.datasets[ds].edges, g.element) + " (" + unit + ")", { go: ["table-dock", ds === "lesmis" ? (g.element === "edge" ? "edges" : "nodes") : "wide"] }),
                rows.length ? AB.data("Fill", pct(vals.length, rows.length) + ": " + fmt(vals.length) + " of " + fmt(rows.length) + " " + unit + " have a value") : null,
                AB.data("In use", x.usedBy || "Nothing uses it")),
            AB.dataTab({
                Values: { summary, body: values },
                "Painted by": paintedBy(ds, x.name),
            }, { kind: "attribute" }),
        ] };
    }
    function transfersBody() {
        const [x, g] = fieldOf("transactions"), r = transfersValues(x, g);
        const edit = ["data-page", g.element === "edge" ? "edit-source" : "edit-accounts"];
        const word = { num: "Number", time: "Time" }[x.type] || "Category";
        return { x, g, unit: r.unit, edit, file: r.file, body: [
            AB.section({ title: "Summary", editable: true },
                fullName(x.name),
                dropdown("Read as", READ_AS(), word, { needs: OVERRIDE }),
                fromRow(r.file, edit),
                AB.data("On", AB.count(r.n, g.element) + " (" + r.unit + ")", { go: ["table-dock", g.element === "edge" ? "edges" : "nodes"] }),
                r.filled != null ? AB.data("Fill", pct(r.filled, r.n) + ": " + fmt(r.filled) + " of " + fmt(r.n) + " " + r.unit + " have a value") : null,
                r.note ? AB.data("Missing", r.note) : null,
                AB.data("In use", x.usedBy || "Nothing uses it")),
            AB.dataTab({
                Values: { summary: r.summary, body: r.values },
                "Painted by": paintedBy("transactions", x.name),
            }, { kind: "attribute" }),
        ] };
    }
    const fieldView = (ds) => ({
        type: "num", kind: "Attribute", dyn: () => {
            const r = fieldBody(ds), edit = r.edit;
            // The attribute's own menu, the one Data > Attributes opens on its row
            return { type: r.x.type, title: AB.truncMiddle(r.x.name, 28), kind: (r.g.element === "edge" ? "Edge" : "Node") + " attribute",
                menu: (b) => AB.attributeMenu(b, ds, r.x.name, { editOn: edit, table: ds === "lesmis" || ds === "transactions" ? ["nodes", "edges"] : ["wide", "wide"] }),
                prov: ["from " + r.file, edit[0], edit[1]], body: () => r.body };
        },
    });

    const STEP = { icon: "funnel", title: "amount >= 1,000", kind: "Filter step", prov: ["step 1 in Filters", "data-place", "filters"], menu: ["context-menus", "filter-step"] };
    // The one attribute menu (AB.attributeMenu), on this attribute's own project
    const aMenu = (ds, name, editOn, table) => (b) => AB.attributeMenu(b, ds, name, { editOn, table });
    const ATTR = (type, title, kind, prov, body, menu) => ({ type, title, kind, prov, menu, body });
    const VIEWS = {
        attribute: { type: "num", title: "amount", kind: "Edge attribute", prov: () => ["from " + T().file, "data-page", "edit-source"], menu: aMenu("transactions", "amount", ["data-page", "edit-source"], ["nodes", "edges"]), body: amountBody },
        "attribute-name-role": { type: "cat", title: "id", kind: "Node attribute", prov: () => ["from " + T().accountsFile, "data-page", "edit-accounts"], menu: aMenu("transactions", "id", ["data-page", "edit-accounts"], ["nodes", "edges"]), body: idBody },
        "person-name": { type: "cat", title: "name", kind: "Node attribute", prov: () => ["from people.csv", "data-page", "edit-people"], menu: aMenu("doorEntries", "name", ["data-page", "edit-people"], ["door-entries-nodes", "door-entries"]), body: personNameBody },
        "node-weight": { type: "num", title: "floors", kind: "Node attribute", prov: () => ["from buildings.csv", "data-page", "edit-buildings"], menu: aMenu("doorEntries", "floors", ["data-page", "edit-buildings"], ["door-entries-nodes", "door-entries"]), body: floorsBody },
        "edge-weight": { type: "num", title: "count", kind: "Edge attribute", prov: () => ["derived from entries.csv", "data-page", "edit-entries"], menu: aMenu("doorEntries", "count", ["data-page", "edit-entries"], ["door-entries-nodes", "door-entries"]), body: countBody },
        "link-key": { type: "cat", title: "person_id", kind: "Edge attribute", prov: () => ["from entries.csv", "data-page", "edit-entries"], menu: aMenu("doorEntries", "person_id", ["data-page", "edit-entries"], ["door-entries-nodes", "door-entries"]), body: personIdBody },
        "filter-step": Object.assign({ body: () => filterBody(TRANSFER_STEP(false)) }, STEP),
        "filter-step-noted": Object.assign({ body: () => filterBody(TRANSFER_STEP(true)) }, STEP),
        "step-attribute-gone": Object.assign({}, STEP, { title: "amount_usd >= 1,000", prov: ["step 1 in Filters", "data-place", "step-attribute-gone"], body: () => filterBody(goneStep()) }),
        "wide-filter": Object.assign({}, STEP, { title: () => h("span", null, attrName(LONG), " >= 1"), prov: ["step 2 in Filters", "data-place", "wide-filters"], body: () => filterBody(wideStep()) }),
        sparse: ATTR("cat", "legacy_asset_tag", "Node attribute", ["from hosts-2026-03.csv", "data-page", "edit-wide-hosts"], sparseBody, aMenu("wide", "legacy_asset_tag", ["data-page", "edit-wide-hosts"], ["wide", "wide"])),
        "long-name": ATTR("num", () => attrName(LONG), "Node attribute", ["from hosts-2026-03.csv", "data-page", "edit-wide-hosts"], longBody, aMenu("wide", LONG, ["data-page", "edit-wide-hosts"], ["wide", "wide"])),
        "list-attribute": ATTR("list", "tags", "Node attribute", ["from network-export-2026-03.json", "data-page", "edit-json-researchers"], listBody, aMenu("nested", "tags", ["data-page", "edit-json-researchers"], ["wide", "wide"])),
        "wide-field": fieldView("wide"),
        "nested-field": fieldView("nested"),
        "plain-field": fieldView("plainJson"),
        "lesmis-field": fieldView("lesmis"),
        "transactions-field": fieldView("transactions"),
        step: { dyn: stepView },
        "computed-step": { dyn: () => LM_STEP(rule(1), () => filterBody(degreeStep())) },
        "neighbors-step": { dyn: () => LM_STEP("Neighbors of Valjean", () => filterBody(neighborsStep())) },
    };
    const isStep = (state) => ["filter-step", "filter-step-noted", "step-attribute-gone", "wide-filter", "step", "computed-step", "neighbors-step"].includes(state);
    const isDoor = (state) => state === "node-weight" || state === "person-name" || state === "link-key" || state === "edge-weight";
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
        "lesmis-field": { left: "data-place/graph-file", dataset: "lesmis" },
    };

    registerSection({
        id: ID,
        title: "Inspector: an attribute or a filter step",
        region: "right",
        rail: "data",
        // The Data place draws only transfers, so a door-entries attribute shows no left panel rather than the wrong table
        frame: (state) => (state === "step" ? { left: stepOf().left, dataset: stepOf().ds } : null)
            || (state === "computed-step" ? lmFrame(LF().after.step2) : state === "neighbors-step" ? lmFrame(neighborsStep().after) : null) || DS_FRAME[state] || (isDoor(state) ? { left: "data-place/door-entries", dataset: "doorEntries", dock: state === "node-weight" || state === "person-name" ? "table-dock/door-entries-nodes" : "table-dock/door-entries" } : { left: isStep(state) ? "data-place/filters" : "data-place/attributes" }),
        closeTo: "data-place",
        states: [
            { id: "attribute", label: "amount, Weight" },
            { id: "attribute-name-role", label: "id, Key and Name" },
            { id: "person-name", label: "name, Name for person (door entries)" },
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
            { id: "wide-field", label: "Any other host or connection attribute (directly: a name too long for the header)" },
            { id: "nested-field", label: "Any other researcher attribute (nested JSON)" },
            { id: "plain-field", label: "Any attribute of the plain JSON graph (Coauthors)" },
            { id: "lesmis-field", label: "Any Les Miserables attribute (the first number one when opened directly)" },
            { id: "transactions-field", label: "Any other transfers attribute: kind, flagged, ... (riskScore when opened directly)" },
            { id: "step", label: "Any project's filter step; directly, a new step on the transfers, its field list open" },
            { id: "computed-step", label: "A computed step after another: Scope line and both counts (Les Miserables)" },
            { id: "neighbors-step", label: "A neighbors step after another: Scope line and both counts (Les Miserables)" },
        ],
        render(el, state) {
            // A run's result attribute has one inspector, its measure row's
            if (state === "pagerank") { location.replace(AB.href("inspector-measure-row", "data")); return; }
            const v0 = VIEWS[state] || VIEWS.attribute, v = v0.dyn ? Object.assign({}, v0, v0.dyn()) : v0;
            el.append(AB.inspector({
                // an attribute shows its type glyph, the same mark as its row in every list
                icon: v.type ? AB.typeGlyph(v.type) : v.icon, title: typeof v.title === "function" ? v.title() : v.title, kind: v.kind, provenance: typeof v.prov === "function" ? v.prov() : v.prov, menu: v.menu, body: v.body(),
                renameDisabled: isStep(state) ? null : "a display name for an attribute, kept across its data",
            }));
        },
    });
})();
