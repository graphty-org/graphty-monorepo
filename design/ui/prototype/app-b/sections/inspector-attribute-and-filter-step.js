/* Inspector: an attribute or a filter step, opened from the Data place (transfers, March 2026).
   Data tab only: style belongs to a tree row, never to an attribute.
   States: amount (an edge weight read as capacity), PageRank (a run's attribute with a scope
   mark), and the "amount >= 1,000" filter step's editor. Plain ASCII. See ../README.md. */
(function () {
    "use strict";
    const CSS =
        ".ia-seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:2px;padding:2px;margin:4px 16px 8px;border-radius:6px;background:var(--cm-bg-secondary)}" +
        ".ia-seg.ia-grid{grid-auto-flow:row;grid-template-columns:1fr 1fr}" +
        ".ia-seg>span{min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:24px;border-radius:5px;cursor:pointer;color:var(--cm-text-secondary);white-space:nowrap}" +
        ".ia-seg>span[aria-pressed=true]{background:var(--cm-bg);color:var(--cm-text);box-shadow:0 0 0 1px var(--cm-border)}" +
        ".ia-cap{padding:0 16px 8px;color:var(--cm-text-secondary)}" +
        ".ia-sub{padding:4px 16px 0;color:var(--cm-text-secondary);font-size:11px;text-transform:uppercase;letter-spacing:.04em}" +
        ".ia-verbs{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:4px 16px 8px}" +
        ".ia-scope{display:flex;flex-direction:column;gap:6px;margin:8px 16px 4px;padding:8px;border-radius:5px;background:var(--cm-bg-secondary)}" +
        ".ia-scope-line{display:flex;align-items:center;gap:6px}" +
        ".ia-oq{margin-inline-start:0;white-space:normal;max-width:100%}" +
        ".ia-cond{display:grid;grid-template-columns:auto 1fr;gap:6px 8px;align-items:center;padding:4px 16px 8px}" +
        ".ia-cond>.k-secondary{white-space:nowrap}" +
        ".ia-flow{display:flex;align-items:center;gap:8px;padding:4px 16px 8px}" +
        ".ia-flow b{font-variant-numeric:tabular-nums}" +
        ".ia-foot{display:flex;flex-wrap:wrap;gap:8px;padding:4px 16px 8px}" +
        ".ia-on{display:flex;align-items:center;gap:10px;padding:8px 16px}";
    if (!document.getElementById("ia-css")) document.head.append(h("style", { id: "ia-css" }, CSS));

    const ID = "inspector-attribute-and-filter-step";
    const oq = (text) => h("span", { class: "k-annot-tag ia-oq", title: text }, "Open question: " + text);
    const T = () => AB.fx.datasets.transactions;
    const fmt = (n) => n.toLocaleString("en-US");

    // A segmented control that switches in place (level, weight meaning).
    function seg(options, active, onPick, grid) {
        const box = h("div", { class: "ia-seg" + (grid ? " ia-grid" : ""), role: "group" });
        options.forEach((o) => {
            const b = h("span", { role: "button", tabindex: "0", "aria-pressed": String(o.id === active), title: o.title || o.label }, o.icon ? icon(o.icon, "sm") : null, o.label);
            const pick = () => {
                box.querySelectorAll("[aria-pressed]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
                onPick && onPick(o);
            };
            b.addEventListener("click", pick);
            b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
            box.append(b);
        });
        return box;
    }

    const LEVELS = [
        { id: "cat", label: "Category", icon: "type", title: "Categorical: names or ids, no order" },
        { id: "ord", label: "Ordered", icon: "chart-column", title: "Ordinal: ordered steps" },
        { id: "num", label: "Number", icon: "hash", title: "Quantitative: amounts that can be compared and averaged" },
        { id: "time", label: "Time", icon: "calendar", title: "Dates and times" },
    ];

    function levelSection(name, cap) {
        const note = h("div", { class: "ia-cap" }, cap);
        return AB.section({ title: "Level" },
            seg(LEVELS, "num", (o) => {
                note.textContent = o.id === "num" ? cap : "Read as " + o.label.toLowerCase() + ": every row that reads " + name + " updates, and the verbs below change to match.";
            }, true),
            note);
    }

    // Verbs shared by both attribute states.
    function verbs(name, painting) {
        return AB.section({ title: "Use it" },
            h("div", { class: "ia-verbs" },
                AB.button(painting ? "Colored by " + name : "Color by", { kind: "secondary", icon: "palette", go: ["inspector-measure-row", "style"] }),
                AB.button("Size by", { kind: "secondary", icon: "maximize-2", go: ["inspector-measure-row", "style"] }),
                AB.button("Show as groups", { kind: "secondary", icon: "group", disabled: true }),
                AB.button("Filter to...", { kind: "secondary", icon: "funnel", go: [ID, "filter-step"] })),
            h("div", { class: "ia-cap" }, "Show as groups needs a category. " + name + " is read as a number; change its level above to group by it."),
            h("div", { class: "ia-cap" }, "Color by and Size by add a row to the ", link("graph-place", "at-rest", "Graph tree"), ", where it paints and can be reordered."));
    }

    function notes(about) {
        return AB.section({ title: "Notes", count: 0, actions: AB.iconButton("plus", "Add note (N)", { go: ["notes-place", "about-selection"] }) },
            h("div", { class: "ab-pad k-secondary" }, "No notes about " + about + " yet. ", link("notes-place", "all", "All notes")));
    }

    // Profile bars: the shape only, no counts on the axis.
    const hist = (bars) => h("div", { class: "k-hist", "aria-hidden": "true" }, bars.map((v) => h("i", { style: "height:" + v + "%" })));

    // ---------- amount: an edge attribute from the file, the weight, read as capacity ----------
    function amountTab() {
        const t = T();
        const amt = t.attributes.find((a) => a.name.startsWith("amount"));
        const meanings = { distance: "A larger amount means the two accounts are farther apart. Shortest paths prefer small amounts.", strength: "A larger amount means a stronger tie. Communities and centrality lean on heavy edges.", capacity: "A larger amount means more can flow along the edge. Flow runs use it as the limit per transfer." };
        const meaning = h("div", { class: "ia-cap" }, meanings.capacity);
        return [
            levelSection("amount", "Read as a number (USD). Color by offers a ramp; Show as groups is not offered."),
            AB.section({ title: "Role" },
                AB.data("Role", h("span", { class: "k-badge" }, "weight")),
                h("div", { class: "ia-sub" }, "What a larger weight means"),
                seg([{ id: "distance", label: "Distance" }, { id: "strength", label: "Strength" }, { id: "capacity", label: "Capacity" }], "capacity", (o) => { meaning.textContent = meanings[o.id]; }),
                meaning,
                h("div", { class: "ia-cap" }, "Each run that uses the weight shows this meaning in its settings and may ask again.")),
            AB.section({ title: "Origin" },
                AB.data("From the file", t.file, { go: ["data-place", "at-rest"] }),
                AB.data("Column", h("span", { class: "k-mono" }, "amount")),
                AB.data("On", "edges (transfers)"),
                AB.data("Read", "Sep 28")),
            AB.section({ title: "Profile" },
                hist([100, 86, 64, 45, 31, 22, 15, 10, 7, 5, 3, 2, 2, 1, 1, 1]),
                h("div", { class: "ia-cap" }, "Most transfers are small; a long tail runs to the largest. ", oq("the real bins from the file")),
                AB.data("Values", fmt(t.edges) + " edges"),
                AB.data("Total", "USD " + amt.total.toLocaleString("en-US", { minimumFractionDigits: 2 })),
                AB.data("Missing", oq("count from the file")),
                AB.data("Distinct values", oq("count from the file")),
                h("div", { class: "ia-foot" }, AB.button("Show in table", { kind: "secondary", icon: "table", go: ["table-dock", "edges"] }))),
            AB.section({ title: "Rows that paint from it", count: 0 },
                h("div", { class: "ab-pad k-secondary" }, "No row in the Graph tree paints from amount yet. Color by or Size by adds one.")),
            verbs("amount", false),
            notes("amount"),
        ];
    }

    // ---------- PageRank: a run's result attribute, computed on the filtered graph ----------
    function pagerankTab() {
        const t = T();
        return [
            h("div", { class: "ia-scope" },
                h("div", { class: "ia-scope-line" }, icon("info", "sm"), h("span", { class: "k-strong" }, "On 812 nodes; now 3,000")),
                h("div", { class: "k-secondary" }, "PageRank ran while the filter step \"amount >= 1,000\" was on. That step is now off, so the graph has 3,000 nodes. The values are still correct for the 812 they were computed on."),
                h("div", { class: "ia-foot", style: "padding:0" },
                    AB.button("Rerun on current filter", { icon: "refresh-cw", onClick: () => AB.flash("Rerun PageRank on 3,000 nodes (not wired in the skeleton)") }),
                    AB.button("Open the filter step", { kind: "ghost", go: [ID, "filter-step"] }))),
            levelSection("PageRank", "Read as a number. Color by offers a ramp; Show as groups is not offered."),
            AB.section({ title: "Origin" },
                AB.data("From the run", "PageRank", { go: ["inspector-measure-row", "data"] }),
                AB.data("Computed on", "812 nodes"),
                AB.data("Under the step", "amount >= 1,000", { go: [ID, "filter-step"] }),
                AB.data("Data version", "March data"),
                AB.data("File", t.file, { go: ["data-place", "at-rest"] }),
                AB.data("On", "nodes (accounts)")),
            AB.section({ title: "Profile" },
                hist([100, 58, 30, 17, 10, 6, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1]),
                h("div", { class: "ia-cap" }, "A few accounts hold most of the rank. ", oq("the real bins from the run")),
                AB.data("Values", "812 nodes"),
                AB.data("No value", fmt(t.nodes - 812) + " nodes, outside the filter at the time"),
                AB.data("Distinct values", oq("count from the run")),
                h("div", { class: "ia-foot" }, AB.button("Show in table", { kind: "secondary", icon: "table", go: ["table-dock", "nodes"] }))),
            AB.section({ title: "Rows that paint from it", count: 1 },
                AB.row({ icon: "chart-column", swatch: AB.ramp("#ef7818", "#662506"), label: "PageRank (node color)", trail: "812 nodes", go: ["inspector-measure-row", "style"] }),
                h("div", { class: "ia-cap" }, "Nodes with no value draw nothing from this row, so rows beneath show through.")),
            verbs("PageRank", true),
            notes("PageRank"),
        ];
    }

    // ---------- the filter step's editor ----------
    function filterTab() {
        const on = { v: true };
        const check = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": "true", "aria-label": "Step on" });
        const status = h("span", null, "On: computed and laid out on the nodes this step keeps");
        const toggle = () => {
            on.v = !on.v;
            check.setAttribute("aria-checked", String(on.v));
            status.textContent = on.v ? "On: computed and laid out on the nodes this step keeps" : "Off: this step is skipped";
            AB.flash(on.v ? "Filter step on" : "Filter step off: amount >= 1,000");
        };
        check.addEventListener("click", toggle);
        check.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } });
        return [
            h("div", { class: "ia-on" }, check, status),
            AB.section({ title: "Condition" },
                h("div", { class: "ia-cond" },
                    h("span", { class: "k-secondary" }, "Attribute"),
                    AB.field(h("span", null, icon("hash", "sm"), " amount (edges)"), { caret: true, go: [ID, "attribute"] }),
                    h("span", { class: "k-secondary" }, "Condition"),
                    AB.field("is at least", { caret: true, onClick: () => AB.flash("Condition list: is at least, is below, is between, is empty (not wired in the skeleton)") }),
                    h("span", { class: "k-secondary" }, "Value"),
                    AB.field("1,000", { onClick: () => AB.flash("Edit the value (not wired in the skeleton)") })),
                h("div", { class: "ia-cap" }, "amount is on edges; this step counts the nodes left. ", oq("which nodes an edge condition keeps"))),
            AB.section({ title: "Outcome" },
                h("div", { class: "ia-flow" }, h("b", null, fmt(T().nodes)), h("span", { class: "k-secondary" }, "nodes before"), icon("arrow-right", "sm"), h("b", null, "812"), h("span", { class: "k-secondary" }, "after")),
                AB.data("Order", "Step 1 of 2", { go: ["data-place", "filters"] }),
                h("div", { class: "ia-cap" }, "Filters change what is computed and laid out. To stop drawing something, use the eye in the ", link("graph-place", "at-rest", "Graph tree"), ".")),
            AB.section({ title: "Computed under this step", count: 1 },
                AB.row({ icon: "hash", label: "PageRank", trail: "812 nodes", go: [ID, "pagerank"] })),
            h("div", { class: "ia-foot" },
                AB.button("Remove step", { kind: "ghost", icon: "trash-2", onClick: () => { AB.flash("Removed filter step: amount >= 1,000"); AB.go("data-place", "filters"); } })),
            notes("this filter step"),
        ];
    }

    const VIEWS = {
        attribute: { icon: "hash", title: "amount", kind: "Edge attribute", meta: () => h("span", null, "weight: capacity, from ", link("data-place", "attributes", T().file)), tab: amountTab },
        pagerank: { icon: "hash", title: "PageRank", kind: "Node attribute", meta: () => h("span", null, "from PageRank, on 812 nodes, March data"), tab: pagerankTab },
        "filter-step": { icon: "funnel", title: "amount >= 1,000", kind: "Filter step", meta: () => h("span", null, "3,000 to 812 nodes, in ", link("data-place", "filters", "Filters")), tab: filterTab },
    };

    registerSection({
        id: ID,
        title: "Inspector: an attribute or a filter step",
        region: "right",
        rail: "data",
        frame: (state) => ({ left: state === "filter-step" ? "data-place/filters" : "data-place/attributes" }),
        closeTo: "data-place",
        states: [
            { id: "attribute", label: "amount (weight: capacity)" },
            { id: "pagerank", label: "PageRank, from a run, with a scope mark" },
            { id: "filter-step", label: "Filter step editor" },
        ],
        render(el, state) {
            const v = VIEWS[state] || VIEWS.attribute;
            const ins = AB.inspector({ icon: v.icon, title: v.title, kind: v.kind, meta: v.meta(), kindKey: "attribute-" + state, tabs: { Data: v.tab } });
            ins.querySelector(".ab-insp-head").append(h("span", { class: "k-grow" }),
                AB.iconButton("ellipsis", state === "filter-step" ? "Filter step menu" : "Attribute menu",
                    state === "filter-step" ? { onClick: () => AB.flash("Filter step menu (not wired in the skeleton)") } : { go: ["context-menus", "attribute"] }));
            el.append(ins);
        },
    });
})();
