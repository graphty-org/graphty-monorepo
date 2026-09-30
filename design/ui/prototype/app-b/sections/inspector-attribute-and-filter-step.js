/* Inspector: an attribute or a filter step, opened from the Data place (transfers, March 2026).
   One body, no tab strip: an attribute paints nothing itself (a tree row paints from it).
   Attribute body: Read as, Summary, Values, Rows that paint from it, Notes.
   Filter step body: the step's editor. No verbs in either body: commands are in "...".
   States: amount (role: weight), PageRank (a run's attribute with a scope mark), the
   "amount >= 1,000" filter step. Plain ASCII. See ../README.md. */
(function () {
    "use strict";
    const CSS =
        ".ia-seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:2px;padding:2px;margin:4px 16px 8px;border-radius:6px;background:var(--cm-bg-secondary)}" +
        ".ia-seg.ia-grid{grid-auto-flow:row;grid-template-columns:1fr 1fr}" +
        ".ia-seg>span{min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:24px;border-radius:5px;cursor:pointer;color:var(--cm-text-secondary);white-space:nowrap;overflow:hidden}" +
        ".ia-seg>span[aria-pressed=true]{background:var(--cm-bg);color:var(--cm-text);box-shadow:0 0 0 1px var(--cm-border)}" +
        ".ia-seg>span[aria-disabled=true]{cursor:not-allowed;opacity:.5}" +
        ".ia-cap{padding:0 16px 8px;color:var(--cm-text-secondary)}" +
        ".ia-sub{padding:4px 16px 0;color:var(--cm-text-secondary);font-size:11px;text-transform:uppercase;letter-spacing:.04em}" +
        ".ia-scope{display:inline-flex;align-items:center;gap:4px}" +
        ".ia-oq{margin-inline-start:0;white-space:normal;max-width:100%}" +
        ".ia-cond{display:grid;grid-template-columns:auto 1fr;gap:6px 8px;align-items:center;padding:4px 16px 8px}" +
        ".ia-cond>.k-secondary{white-space:nowrap}" +
        ".ia-flow{display:flex;align-items:center;gap:8px;padding:4px 16px 8px}" +
        ".ia-flow b{font-variant-numeric:tabular-nums}" +
        ".ia-on{display:flex;align-items:center;gap:10px;padding:8px 16px}" +
        ".ia-menu{pointer-events:auto}";
    if (!document.getElementById("ia-css")) document.head.append(h("style", { id: "ia-css" }, CSS));

    const ID = "inspector-attribute-and-filter-step";
    const oq = (text) => h("span", { class: "k-annot-tag ia-oq", title: text }, "Open question: " + text);
    const T = () => AB.fx.datasets.transactions;
    const fmt = (n) => n.toLocaleString("en-US");

    // A segmented control that switches in place. An option with `needs` is drawn disabled.
    function seg(options, active, onPick, grid) {
        const box = h("div", { class: "ia-seg" + (grid ? " ia-grid" : ""), role: "group" });
        options.forEach((o) => {
            const b = h("span", { role: "button", tabindex: "0", "aria-pressed": String(o.id === active), "aria-disabled": o.needs ? "true" : null, title: o.needs ? "Needs graphty-element: " + o.needs : o.title || o.label }, o.icon ? icon(o.icon, "sm") : null, o.label);
            const pick = () => {
                if (o.needs) return AB.flash("Needs graphty-element: " + o.needs);
                box.querySelectorAll("[aria-pressed]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
                onPick && onPick(o);
            };
            b.addEventListener("click", pick);
            b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
            box.append(b);
        });
        return box;
    }

    const ORDINAL = "The element's attribute type has no ordered level.";
    const OVERRIDE = "The element's attribute type has no read-as override; the type comes from the file.";
    const LEVELS = [
        { id: "cat", label: "Category", icon: "type", title: "Names or ids, no order" },
        { id: "ord", label: "Ordered", icon: "chart-column", needs: ORDINAL },
        { id: "num", label: "Number", icon: "hash", title: "Amounts that can be compared and averaged" },
        { id: "time", label: "Time", icon: "calendar", title: "Dates and times" },
    ];

    // Read as: level and role, the one place both change. o: { name, type, roles, role, roleCap }
    function readAs(o) {
        const levelCap = h("div", { class: "ia-cap" }, "Read as a number: rows that paint from " + o.name + " use a ramp.");
        const roleCap = h("div", { class: "ia-cap" }, o.roleCap[o.role]);
        return AB.section({ title: "Read as", collapsible: true, key: "ia.readas", summary: "Number" + (o.role !== "none" ? ", role: " + o.role : "") },
            h("div", { class: "ia-sub" }, "Level"),
            seg(LEVELS, "num", (l) => {
                levelCap.textContent = l.id === "num" ? "Read as a number: rows that paint from " + o.name + " use a ramp."
                    : "Read as " + l.label.toLowerCase() + ": every row that paints from " + o.name + " updates to match.";
            }, true),
            levelCap,
            AB.data("Type", o.type),
            h("div", { class: "ia-cap" }, "Read as another type ", AB.needsElement(OVERRIDE)),
            h("div", { class: "ia-sub" }, "Role"),
            seg(o.roles.map((r) => ({ id: r, label: r === "none" ? "None" : r[0].toUpperCase() + r.slice(1) })), o.role, (r) => { roleCap.textContent = o.roleCap[r.id]; }),
            roleCap);
    }

    // Profile bars: the shape only, no counts on the axis.
    const hist = (bars) => h("div", { class: "k-hist", "aria-hidden": "true" }, bars.map((v) => h("i", { style: "height:" + v + "%" })));

    // ---------- amount: an edge attribute from the file, the graph's weight ----------
    function amountBody() {
        const t = T();
        return [
            readAs({
                name: "amount", type: "Number", roles: ["none", "weight", "label"], role: "weight",
                roleCap: {
                    weight: "Runs that use edge weights read amount. What a larger weight means, distance or strength, is chosen per run in Analyze and shown in each run's Made with.",
                    none: "Runs use no edge weight: every transfer counts the same.",
                    label: "Edge labels show amount.",
                },
            }),
            AB.section({ title: "Summary", collapsible: true, key: "ia.summary", summary: "From " + t.file + ", on edges" },
                AB.data("From the file", t.file, { go: ["data-place", "at-rest"] }),
                AB.data("Column", h("span", { class: "k-mono" }, "amount")),
                AB.data("On", fmt(t.edges) + " edges (transfers)", { go: ["table-dock", "edges"] }),
                AB.data("Read", "Sep 28"),
                AB.data("Missing", oq("count"))),
            AB.section({ title: "Values", collapsible: true, key: "ia.values", summary: "Most small, a long tail" },
                hist([100, 86, 64, 45, 31, 22, 15, 10, 7, 5, 3, 2, 2, 1, 1, 1]),
                h("div", { class: "ia-cap" }, "Most transfers are small; a long tail runs to the largest. ", oq("the real bins from the file")),
                AB.data("Distinct", oq("count"))),
            AB.section({ title: "Rows that paint from it", count: 0 },
                h("div", { class: "ab-pad k-secondary" }, "No row in the ", link("graph-place", "at-rest", "Graph tree"), " paints from amount. Color by and Width by are in its menu.")),
            AB.notesSection(0),
        ];
    }

    // ---------- PageRank: a run's result attribute; a filter step came after the run ----------
    function pagerankBody() {
        const t = T();
        const scope = h("span", { class: "ia-scope" }, icon("funnel", "sm"), link("inspector-measure-row", "scope-mark", "on " + fmt(t.nodes) + " nodes; now 812"));
        return [
            readAs({
                name: "PageRank", type: "decimal, from the run", roles: ["none", "label", "position"], role: "none",
                roleCap: { none: "A result, with no role.", label: "Node labels show PageRank.", position: "Needs x and y; a single value is not a position." },
            }),
            AB.section({ title: "Summary", collapsible: true, key: "ia.summary", summary: "From PageRank, on " + fmt(t.nodes) + " nodes" },
                AB.data("From the run", "PageRank", { go: ["inspector-measure-row", "data"] }),
                AB.data("Scope", scope),
                h("div", { class: "ia-cap" }, "The filter step ", link(ID, "filter-step", "amount >= 1,000"), " came after this run. The values are still correct for the " + fmt(t.nodes) + " nodes they were computed on."),
                AB.data("Data version", "March data"),
                AB.data("On", "nodes (accounts)", { go: ["table-dock", "nodes"] }),
                AB.data("Missing", "none")),
            // A run's values have one home, the measure row's Data tab; here they are a link to it
            AB.section({ title: "Values", collapsible: true, key: "ia.values", summary: "On the PageRank row" },
                AB.data("Distribution, top 10", "PageRank row", { go: ["inspector-measure-row", "data"] })),
            AB.section({ title: "Rows that paint from it", count: 1 },
                AB.row({ icon: "chart-column", swatch: AB.ramp("#ef7818", "#662506"), label: "PageRank (node color)", trail: "812 drawn", go: ["inspector-measure-row", "style"] })),
            AB.notesSection(0),
        ];
    }

    // ---------- the filter step's editor ----------
    function filterBody() {
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
            AB.section({ title: "Results from before this step", count: 1 },
                AB.row({ icon: "hash", label: "PageRank", trail: "on 3,000; now 812", go: [ID, "pagerank"] })),
            AB.notesSection(0),
        ];
    }

    // The filter step's "..." (its right-click menu in Data > Filters, word for word).
    function stepMenu(e) {
        const ov = document.getElementById("ab-overlay");
        ov.hidden = false;
        const m = AB.menu({ anchor: e.currentTarget, place: "below-end", items: [
            { label: "Turn off", onClick: () => AB.flash("Filter step off: amount >= 1,000") },
            { label: "Move down", desc: "Step 2 of 2", go: ["data-place", "filters"] },
            { label: "Add note", shortcut: "N", go: ["notes-place", "writing"] },
            { sep: true },
            { label: "Remove step", onClick: () => { AB.flash("Removed filter step: amount >= 1,000"); AB.go("data-place", "filters"); } },
        ] });
        m.classList.add("ia-menu");
        ov.append(m);
        setTimeout(() => document.addEventListener("click", () => m.remove(), { capture: true, once: true }), 0);
    }

    const VIEWS = {
        attribute: { icon: "hash", title: "amount", kind: "Edge attribute", prov: () => ["from the file", "data-place", "at-rest"], menu: ["context-menus", "attribute"], body: amountBody },
        pagerank: { icon: "hash", title: "PageRank", kind: "Node attribute", prov: () => ["from PageRank", "inspector-measure-row", "data"], menu: ["context-menus", "attribute"], body: pagerankBody },
        "filter-step": { icon: "funnel", title: "amount >= 1,000", kind: "Filter step", prov: () => ["in Filters", "data-place", "filters"], body: filterBody },
    };

    registerSection({
        id: ID,
        title: "Inspector: an attribute or a filter step",
        region: "right",
        rail: "data",
        frame: (state) => ({ left: state === "filter-step" ? "data-place/filters" : "data-place/attributes" }),
        closeTo: "data-place",
        states: [
            { id: "attribute", label: "amount (role: weight)" },
            { id: "pagerank", label: "PageRank, from a run, with a scope mark" },
            { id: "filter-step", label: "Filter step editor" },
        ],
        render(el, state) {
            const v = VIEWS[state] || VIEWS.attribute;
            const ins = AB.inspector({
                icon: v.icon, title: v.title, kind: v.kind, provenance: v.prov(), menu: v.menu, body: v.body(),
                renameDisabled: state === "filter-step" ? null : "attributes have no display name yet",
            });
            if (!v.menu) ins.querySelector(".ab-insp-sub").append(AB.iconButton("ellipsis", "More actions (Shift+F10)", { onClick: stepMenu }));
            el.append(ins);
        },
    });
})();
