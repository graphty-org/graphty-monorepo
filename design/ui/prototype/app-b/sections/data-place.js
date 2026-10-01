/* Data place (spec section 7): the graph switcher row, then three always-open sections (they are
   editable, so no accordion) with "+" in their headers -- Sources, Filters, Attributes. Shown on the transfers data. Every list is
   the shared tree (its keyboard model); this file adds only a quiet line under source and step rows,
   the step checkbox in the trailing slot, and the step keys the tree would otherwise treat as a
   paint row's (Space, Delete, Mod+] and Mod+[, Shift+F10). Plain ASCII. */
(function () {
    "use strict";
    const { h, icon } = AB;

    if (!document.getElementById("dp-style")) {
        document.head.append(h("style", { id: "dp-style" }, `
.dp { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.dp-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; }
.dp .ab-sw-slot:empty { display: none; }
.dp .ab-tnotes:empty { min-width: 0; }
.dp .ab-le:empty { display: none; }
.dp-flat .ab-disc:empty { display: none; }
.dp .ab-tree { padding-bottom: 4px; }
.dp-quiet { cursor: default; list-style: none; padding: 0 0 4px 20px; margin-top: -4px; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dp .ab-trow[data-off] .ab-tname { color: var(--cm-text-tertiary); }
.dp .ab-trow[data-dragging] { opacity: 0.5; }
.dp .ab-trow[data-drop] { box-shadow: inset 0 2px 0 var(--cm-bg-brand); }
.dp .ab-tcount .k-badge { font-size: 11px; color: var(--cm-text-secondary); }
.dp-find { padding: 0 16px 4px; }
.dp-find input { width: 100%; box-sizing: border-box; }
.dp-oq { padding: 0 16px 8px 20px; }
.dp-sub { padding: 4px 16px 2px; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); }
.dp-pair { list-style: none; display: flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px 0 24px; color: var(--cm-text-secondary); min-width: 0; }
.dp-pair .k-ellipsis { min-width: 0; color: var(--cm-text); }
.dp-pair .k-i { flex: none; }
.dp-mark { display: grid; place-items: center; color: var(--cm-icon); }
.dp .ab-trow > .ab-kind { width: 24px; min-width: 24px; justify-items: start; }
.dp .ab-trow > .ab-kind:empty { display: none; }
`));
    }

    const T = () => AB.fx.datasets.transactions;
    const n = (x) => Number(x).toLocaleString("en-US");
    const URL_NAME = "alerts.bank.example/structuring/2026-03.json";
    const FILTERS_TIP = "Filters change what is computed; the eye in the Graph tree only hides.";

    // One glyph and one word per type (spec 2.4): Abc Category, # Number, calendar Time
    const TYPE = { cat: ["Category", () => AB.typeGlyph("cat")], num: ["Number", () => AB.typeGlyph("num")], time: ["Time", () => AB.typeGlyph("time")] };
    const glyph = (type) => AB.tip(TYPE[type][1](), "Read as: " + TYPE[type][0], { label: false });

    // ---------- the state of the lists for one render ----------
    function initialSteps(cfg) {
        if (cfg.steps === "none") return [];
        const steps = [
            { id: "s1", name: "amount is at least 1,000", outcome: `812 of ${n(T().nodes)} nodes`, on: cfg.steps !== "undone" },
            { id: "s2", name: "kind is not merchant", outcome: null, on: false },
        ];
        if (cfg.steps === "new") steps.push({ id: "s3", name: "New step", outcome: null, on: true, isNew: true });
        return steps;
    }

    // Decorate tree rows: a quiet line under a row (not a tree item; read through aria-description)
    function quiet(li, text) {
        li.setAttribute("aria-description", text);
        li.after(h("li", { class: "dp-quiet", role: "none", "aria-hidden": "true" }, text));
    }
    const rowEl = (ul, id) => ul.querySelector(`[data-row="${CSS.escape(id)}"]`);

    // ---------- Sources ----------
    function sources(cfg) {
        const t = T();
        if (cfg.derived) {
            const w = t.withoutMerchants;
            const ul = AB.tree([{ id: "origin", kindIcon: "split", name: "From " + t.graphName + ", without merchants", builtin: true, go: ["inspector-source", "derived"] }], { label: "Sources" });
            quiet(rowEl(ul, "origin"), `${n(w.nodes)} nodes, ${n(w.edges)} edges, Sep 28`);
            return AB.section({ title: "Sources", editable: true },
                h("div", { class: "dp-flat" }, ul),
                h("div", { class: "dp-oq" }, AB.openQuestion("Whether a derived graph follows its origin when the origin changes, or stays as made.")));
        }
        const rows = [
            { id: "file", kindIcon: "file", name: t.file, selected: cfg.select === "file", go: ["inspector-source", cfg.afterReplace ? "replaced" : "file"], menu: ["context-menus", "source"],
                status: cfg.afterReplace ? "stale" : null, statusText: "Replaced Sep 30: what was computed on the old data is out of date" },
            { id: "url", kindIcon: "link", name: URL_NAME, selected: cfg.select === "url", go: ["inspector-source", cfg.urlChanged ? "url-changed" : "url"], menu: ["context-menus", "source-url"],
                status: cfg.urlChanged ? "stale" : null, statusText: "The data at this address changed since Sep 29. Refresh is in its menu" },
        ];
        const ul = AB.tree(rows, { label: "Sources" });
        const fileLi = rowEl(ul, "file");
        quiet(fileLi, `${n(t.nodes)} nodes, ${n(t.edges)} edges, ${cfg.afterReplace ? "replaced Sep 30" : "Sep 28"}`);
        // The paired node file: its own label row under its source, no menu (the pair is one load)
        // A click selects the source it belongs to (the pair is one load)
        fileLi.nextElementSibling.after(AB.nav(h("li", { class: "dp-pair", role: "none", "aria-label": t.accountsFile + ", node file of " + t.file }, icon("file", "sm"), h("span", { class: "k-ellipsis" }, t.accountsFile), h("span", { class: "k-secondary" }, "node file")), "inspector-source", "file"));
        quiet(rowEl(ul, "url"), `${n(t.attributes.find((a) => a.name === "flagged").values.true)} accounts, Sep 29`);
        guardKeys(ul, {
            Delete: () => AB.announce("A source cannot be removed on its own yet; Clear graph data is in the graph's menu"),
        });
        const plus = AB.plus({
            label: "Add data to this graph",
            items: [
                { label: "File...", to: ["load-step", "preview"] },
                { label: "From a URL...", to: ["load-step", "url"] },
                { label: "Paste...", to: ["load-step", "preview"] },
                { label: "Set collection...", desc: "Lands as a folder of sets in the Graph tree", to: ["load-step", "preview"] },
                { label: "Add columns by key...", needs: "graphty-element has no join-by-key load option: keep every node, match one key, report what matched" },
            ],
            onAdd: (it) => it.to && AB.go(it.to[0], it.to[1]),
        });
        return AB.section({ title: "Sources", editable: true, actions: plus }, h("div", { class: "dp-flat" }, ul));
    }

    // ---------- Filters ----------
    function filters(cfg, model, redraw) {
        const steps = model.steps;
        // "+" adds a step at the end, named "New step", selected (create first, then edit its rule)
        const addStep = () => { const id = "s" + (steps.length + 1) + "-" + Date.now(); steps.push({ id, name: "New step", outcome: null, on: true, isNew: true }); model.selected = id; redraw(id); AB.announce("Added New step"); };
        const plus = AB.plus({ label: "Add filter step", items: [{ label: "filter step" }], onAdd: addStep });
        const sec = AB.section({ title: "Filters", editable: true, actions: plus });
        if (!steps.length) {
            sec.append(AB.empty("No filters. " + FILTERS_TIP, { verb: "Add filter step", onClick: addStep }));
            return sec;
        }
        // Once a step exists, the empty line becomes the header's tooltip
        AB.tip(sec.querySelector(".ab-sec-h"), FILTERS_TIP, { label: false });

        const rows = steps.map((s) => ({ id: s.id, kindIcon: AB.ICON.filter, name: s.name, selected: model.selected === s.id, go: ["inspector-attribute-and-filter-step", "filter-step"], menu: ["context-menus", "filter-step"], renameDisabled: "a step is named by its rule; Enter edits the rule" }));
        const ul = AB.tree(rows, { label: "Filter steps, in the order they apply" });
        const move = (s, d) => {
            const i = steps.indexOf(s), j = i + d;
            if (j < 0 || j >= steps.length) return AB.announce(s.name + " cannot move further");
            steps.splice(i, 1);
            steps.splice(j, 0, s);
            AB.announce("Moved " + s.name + (d < 0 ? " up" : " down"));
            redraw(s.id);
        };
        const del = (s) => {
            const i = steps.indexOf(s);
            steps.splice(i, 1);
            redraw((steps[Math.min(i, steps.length - 1)] || {}).id);
            AB.deleted(s.name, () => { steps.splice(i, 0, s); redraw(s.id); });
        };
        const flip = (s) => {
            s.on = !s.on;
            AB.announce(s.name + (s.on ? " applied" : " not applied"));
            if (s.on && !s.outcome && !s.isNew) AB.flash("The count for this step is not modeled in the skeleton");
            redraw(s.id);
        };
        const menuFor = (s, anchor) => AB.openMenu(anchor, [
            { label: "Move up", shortcut: "Ctrl+]", disabled: steps.indexOf(s) === 0 ? "Already first" : false, onClick: () => move(s, -1) },
            { label: "Move down", shortcut: "Ctrl+[", disabled: steps.indexOf(s) === steps.length - 1 ? "Already last" : false, onClick: () => move(s, 1) },
            { sep: true },
            { label: "Add note", shortcut: "N", onClick: () => AB.go("notes-place", "writing") },
            { sep: true },
            { label: "Delete", shortcut: "Del", onClick: () => del(s) },
        ]);
        steps.forEach((s) => {
            const li = rowEl(ul, s.id);
            li.toggleAttribute("data-off", !s.on);
            const check = h("span", { class: "k-check", role: "checkbox", tabindex: "-1", "aria-checked": String(s.on), "aria-label": "Apply " + s.name });
            AB.tip(check, "Apply this step", { key: "Space", label: false });
            check.addEventListener("click", (e) => { e.stopPropagation(); flip(s); });
            li.querySelector(".ab-le").append(check);
            if (s.on && s.outcome) quiet(li, s.outcome);
            li.addEventListener("contextmenu", (e) => { e.preventDefault(); menuFor(s, li); });
            // Drag the row to reorder (no grip)
            li.draggable = true;
            li.addEventListener("dragstart", (e) => { model.drag = s; li.toggleAttribute("data-dragging", true); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", s.name); });
            li.addEventListener("dragend", () => { li.removeAttribute("data-dragging"); model.drag = null; });
            li.addEventListener("dragover", (e) => { if (model.drag && model.drag !== s) { e.preventDefault(); li.toggleAttribute("data-drop", true); } });
            li.addEventListener("dragleave", () => li.removeAttribute("data-drop"));
            li.addEventListener("drop", (e) => {
                e.preventDefault();
                const d = model.drag;
                if (!d || d === s) return;
                steps.splice(steps.indexOf(d), 1);
                steps.splice(steps.indexOf(s), 0, d);
                AB.announce("Moved " + d.name);
                redraw(d.id);
            });
        });
        const byLi = (li) => steps.find((s) => s.id === li.dataset.row);
        guardKeys(ul, {
            " ": (li) => flip(byLi(li)),
            Delete: (li) => del(byLi(li)),
            Backspace: (li) => del(byLi(li)),
            "Mod+]": (li) => move(byLi(li), -1),
            "Mod+[": (li) => move(byLi(li), 1),
            "Shift+F10": (li) => menuFor(byLi(li), li),
            ContextMenu: (li) => menuFor(byLi(li), li),
        });
        sec.append(h("div", { class: "dp-flat" }, ul));
        return sec;
    }

    // Keys this place answers itself, before the shared tree's own handler
    function guardKeys(ul, map) {
        ul.addEventListener("keydown", (e) => {
            const li = e.target.closest && e.target.closest(".ab-trow");
            if (!li || e.target !== li) return;
            const k = (e.ctrlKey || e.metaKey ? "Mod+" : e.shiftKey && e.key === "F10" ? "Shift+" : "") + e.key;
            const fn = map[k] || (k === "Mod+]" || k === "Mod+[" ? () => {} : null);
            if (!fn) return;
            e.preventDefault();
            e.stopPropagation();
            fn(li);
        }, true);
    }

    // ---------- Attributes ----------
    function attributes(cfg) {
        const t = T();
        const scope = cfg.afterReplace ? "stale" : cfg.steps === "two" || cfg.steps === "new" ? "filtered" : null;
        const attr = (name, type, o) => Object.assign({
            id: name, kindIcon: glyph(type), name, selected: cfg.select === name,
            go: ["inspector-attribute-and-filter-step", name === "id" ? "attribute-name-role" : "attribute"],
            menu: ["context-menus", "attribute"], renameDisabled: "an attribute is named by its column in the file",
        }, o || {});
        const role = (word) => AB.tip(h("span", { class: "k-badge" }, word), "Role: " + word, { label: false });
        // The type glyph like every attribute; the out-of-date mark carries the rest
        const pagerank = attr("PageRank", "num", {
            go: ["inspector-attribute-and-filter-step", "pagerank"],
            // The kind glyph never changes: the out-of-date mark sits in the trailing slot
            mark: scope ? (scope === "stale" ? "Out of date: computed on the data before the replace. Rerun is in its menu"
                : `Computed on ${n(t.nodes)} nodes; the filters now leave 812. Rerun is in its menu`) : null,
        });
        // Computed first, then by name
        const nodes = [
            cfg.derived ? null : pagerank,
            attr("alertRule", "cat"), attr("alertTime", "time"), attr("country", "cat"), attr("flagged", "cat"),
            attr("id", "cat", { count: role("Name") }), attr("kind", "cat"), attr("riskScore", "num"),
        ].filter(Boolean);
        const edges = [attr("amount", "num"), attr("timestamp", "time", { count: role("Time") })];
        // Nodes and Edges are plain subheads, not a second level of disclosure inside the section
        const list = (rows, label) => {
            const ul = AB.tree(rows, { label });
            rows.filter((r) => r.mark).forEach((r) => {
                const li = rowEl(ul, r.id);
                li.setAttribute("aria-description", r.mark);
                li.querySelector(".ab-le").append(AB.tip(h("span", { class: "dp-mark", role: "img", "aria-label": "out of date" }, icon("triangle-alert", "sm")), r.mark, { label: false }));
            });
            guardKeys(ul, { Delete: () => AB.announce("An attribute comes from its source and cannot be deleted"), Backspace: () => {} });
            return h("div", { class: "dp-flat" }, ul);
        };
        const sub = (text) => h("div", { class: "dp-sub", role: "heading", "aria-level": "4" }, text);
        // "+" is grayed and focusable with its reason (it needs graphty-element, so the user-test build hides it)
        const plus = AB.iconButton("plus", "New attribute", { disabled: "Needs graphty-element: it has no computed attributes yet; an expression attribute is filed" });
        plus.classList.add("ab-plus");
        plus.setAttribute("data-needs", "");
        // Find appears only when the list is longer than the panel
        const input = h("input", { class: "k-field", type: "search", placeholder: "Find attribute", "aria-label": "Find attribute" });
        const find = h("div", { class: "dp-find", hidden: true }, input);
        const none = h("div", { hidden: true });
        input.addEventListener("input", () => {
            const q = input.value.trim().toLowerCase();
            let any = false;
            find.parentNode.querySelectorAll(".ab-trow").forEach((li) => { const hit = !q || li.dataset.row.toLowerCase().includes(q); li.hidden = !hit; any = any || hit; });
            none.replaceChildren(any ? "" : AB.noMatch(input.value.trim()));
            none.hidden = any;
        });
        const sec = AB.section({ title: "Attributes", editable: true, actions: plus }, find, sub("Nodes"), list(nodes, "Node attributes"), sub("Edges"), list(edges, "Edge attributes"), none);
        sec.id = "dp-attributes";
        return { sec, find };
    }

    // ---------- the place ----------
    function build(region, cfg, model) {
        const t = T();
        const el = h("div", { class: "dp" });
        region.replaceChildren(el);
        const name = cfg.derived ? t.graphName + " without merchants" : t.graphName;
        el.append(AB.graphHead("Data", name));
        const scroll = h("div", { class: "dp-scroll" });
        el.append(scroll);
        const redraw = (focusId) => {
            build(region, cfg, model);
            const f = focusId && region.querySelector(`#dp-filters [data-row="${CSS.escape(focusId)}"]`);
            if (f) { f.closest(".ab-tree").querySelectorAll(".ab-trow").forEach((x) => (x.tabIndex = x === f ? 0 : -1)); f.focus(); }
        };
        const fsec = filters(cfg, model, redraw);
        fsec.id = "dp-filters";
        const a = attributes(cfg);
        scroll.append(sources(cfg), fsec, a.sec);
        requestAnimationFrame(() => {
            if (scroll.scrollHeight > scroll.clientHeight) a.find.hidden = false;
            if (cfg.scrollTo) { const s = el.querySelector("#" + cfg.scrollTo); if (s) scroll.scrollTop = s.offsetTop - scroll.offsetTop; }
        });
    }

    const CFG = {
        "at-rest": { steps: "two" },
        filters: { steps: "two", selectStep: "s1" },
        "undo-notice": { steps: "undone", undoNotice: true },
        attributes: { steps: "two", select: "amount", scrollTo: "dp-attributes" },
        "url-source": { steps: "two", select: "url" },
        "url-changed": { steps: "two", select: "url", urlChanged: true },
        derived: { steps: "none", derived: true },
        "after-replace": { steps: "none", select: "file", afterReplace: true },
        "new-step": { steps: "new", selectStep: "s3" },
        "empty-filters": { steps: "none" },
    };
    const RIGHT = {
        filters: "inspector-attribute-and-filter-step/filter-step",
        attributes: "inspector-attribute-and-filter-step/attribute",
        "url-source": "inspector-source/url",
        "url-changed": "inspector-source/url-changed",
        derived: "inspector-source/derived",
        "after-replace": "inspector-source/replaced",
        "new-step": "inspector-attribute-and-filter-step/filter-step",
    };

    registerSection({
        id: "data-place",
        title: "Data place",
        region: "left",
        rail: "data",
        // The header's filter chip says what the steps that apply leave
        frame(state) {
            const c = CFG[state] || CFG["at-rest"];
            const f = { dataset: "transactions", chip: c.steps === "two" || c.steps === "new" ? "812 of " + n(T().nodes) + " nodes" : "Full graph" };
            if (RIGHT[state]) f.right = RIGHT[state];
            return f;
        },
        states: [
            { id: "at-rest", label: "Two sources, two filter steps" },
            { id: "filters", label: "A filter step selected" },
            { id: "undo-notice", label: "After undoing a step" },
            { id: "attributes", label: "An attribute selected" },
            { id: "url-source", label: "A URL source selected" },
            { id: "url-changed", label: "The URL's data changed" },
            { id: "derived", label: "A derived graph: origin line" },
            { id: "after-replace", label: "After Replace: out of date" },
            { id: "new-step", label: "Filters + : a new step" },
            { id: "empty-filters", label: "No filters" },
        ],
        render(el, state) {
            const cfg = CFG[state] || CFG["at-rest"];
            const model = { steps: initialSteps(cfg), selected: cfg.selectStep || null };
            build(el, cfg, model);
            if (cfg.undoNotice) setTimeout(() => AB.notice("Undone: amount is at least 1,000", { label: "Redo", go: ["data-place", "at-rest"] }), 0);
        },
    });
})();
