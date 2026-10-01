/* Data place (spec section 7): the graph switcher row, then three always-open sections (they are
   editable, so no accordion) with "+" in their headers -- Sources, Filters, Attributes. Sources are
   one row per table and every row opens the Data page (there is no source inspector). Every list is
   the shared tree (its keyboard model); this file adds only a quiet line under source and step rows,
   the trailing warning or step checkbox, the row menus, and the step keys the tree would otherwise
   treat as a paint row's (Space, Delete, Mod+] and Mod+[, Shift+F10).
   Three data sets: the March transfers (accounts and transfers), the door entries (the shell's
   AB.fx.datasets.doorEntries) and Les Miserables as one graph file. Plain ASCII. */
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
/* The quiet line is part of its row: one hover, one click target */
.ab-trow:hover + .dp-quiet, .dp-quiet:hover, .ab-trow:has(+ .dp-quiet:hover) { background: var(--cm-bg-hover); }
.ab-trow[aria-selected="true"] + .dp-quiet { background: var(--cm-bg-selected); }
.dp-quiet { cursor: default; list-style: none; padding: 0 0 4px calc(var(--lvl, 0) * 16px + 28px); margin-top: -4px; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dp .ab-trow[data-off] .ab-tname { color: var(--cm-text-tertiary); }
.dp .ab-trow[data-dragging] { opacity: 0.5; }
.dp .ab-trow[data-drop] { box-shadow: inset 0 2px 0 var(--cm-bg-brand); }
.dp .ab-tcount .k-badge { font-size: 11px; color: var(--cm-text-secondary); }
.dp-find { padding: 0 16px 4px; }
.dp-find input { width: 100%; box-sizing: border-box; }
.dp-oq { padding: 0 16px 8px 20px; }
.dp-sub { padding: 4px 16px 2px; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); display: flex; align-items: center; gap: 6px; }
.dp-mark { display: grid; place-items: center; color: var(--cm-icon); }
.dp .ab-trow > .ab-kind { width: 24px; min-width: 24px; justify-items: start; }
.dp .ab-trow > .ab-kind:empty { display: none; }
`));
    }

    const T = () => AB.fx.datasets.transactions;
    const D = () => AB.fx.datasets.doorEntries;
    const L = () => AB.fx.datasets.lesmis;
    const n = (x) => Number(x).toLocaleString("en-US");
    const URL_NAME = "alerts.bank.example/structuring/2026-03.json";
    const GEXF = "miserables.gexf";
    const FILTERS_TIP = "Filters change what is computed; the eye in the Graph tree only hides.";
    const KIND = { node: "circle-dot", edge: "spline", file: "network" };
    const KIND_WORD = { node: "node table", edge: "edge table", file: "graph file" };

    // One glyph and one word per type (spec 2.4): Abc Category, # Number, calendar Time
    const TYPE = { cat: "Category", num: "Number", time: "Time" };
    const glyph = (type) => AB.tip(AB.typeGlyph(type), "Read as: " + TYPE[type], { label: false });
    // The one role tag; its tooltip says what the role does
    const ROLE_WHY = {
        Key: "set when loaded -- links match on it",
        Name: "set when loaded -- labels and lists show it",
        Time: "set when loaded -- the time slider reads it",
        Weight: "set when loaded -- every run uses it unless the run picks another",
    };

    // Decorate tree rows: a quiet line under a row (not a tree item; read through aria-description)
    function quiet(li, text) {
        li.setAttribute("aria-description", text);
        li.after(h("li", { class: "dp-quiet", role: "none", "aria-hidden": "true", style: li.getAttribute("style"), on: { click: () => li.click(), dblclick: () => li.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })) } }, text));
    }
    const rowEl = (ul, id) => ul.querySelector(`[data-row="${CSS.escape(id)}"]`);
    // The shared warning mark in a row's trailing slot, its reason in the tooltip
    function warn(li, text) {
        li.setAttribute("aria-description", (li.getAttribute("aria-description") || "") + ". " + text);
        li.querySelector(".ab-le").append(AB.tip(h("span", { class: "dp-mark", role: "img", "aria-label": "warning" }, icon("triangle-alert", "sm")), text, { label: false }));
    }
    const goItem = (label, to, extra) => Object.assign({ label, onClick: () => AB.go(to[0], to[1]) }, extra || {});

    // ---------- the lists for one render ----------
    function initialSteps(cfg) {
        if (cfg.steps === "none") return [];
        const steps = [
            { id: "s1", name: "amount is at least 1,000", outcome: `${n(T().nodes)} to 812 nodes`, on: cfg.steps !== "undone", notes: 1 },
            { id: "s2", name: "kind is not merchant", outcome: null, on: false },
        ];
        if (cfg.steps === "new") steps.push({ id: "s3", name: "New step", outcome: null, on: true, isNew: true });
        return steps;
    }

    // Source rows per data set: { id, kind, name, quiet, warn, go, children, open }
    function sourceRows(cfg) {
        if (cfg.ds === "door") {
            const d = D(), r = d.report, tbl = (name) => d.tables.find((x) => x.name === name);
            const e = r.entries;
            return [
                { id: "people", kind: "node", name: tbl("people").file, quiet: `person . ${n(D().loadedTypes().person)} nodes` + (D().loadedTypes().added.person ? ` (${n(r.people.rows)} + ${D().loadedTypes().added.person} added)` : ""), go: ["data-page", "edit-people"], edit: ["data-page", "edit-people"] },
                { id: "buildings", kind: "node", name: tbl("buildings").file, quiet: `building . ${n(r.buildings.rows)} nodes`, go: ["data-page", "edit-buildings"], edit: ["data-page", "edit-buildings"] },
                { id: "entries", kind: D().loaded.per === "nodes" ? "node" : "edge", name: tbl("entries").file, quiet: D().loaded.per === "nodes" ? `entry . ${n(e.rows)} nodes, ${n(D().loadedEdges())} link edges` : `entries . ${n(e.rows)} rows, ${n(D().loadedEdges())} edges`, go: ["data-page", "edit-entries"], edit: ["data-page", "edit-entries"],
                    // The first line of the element's match report for this table: its tooltip, not a warning.
                    // Leave out resolved both unmatched lines, so the status matches the Data page's green check.
                    info: `${n(e.rows)} rows; ${n(e.bothEnds)} have both ends. ${e.missingPeople} person_id values are not in people and ${e.missingBuildings} building_id values are not in buildings: left out (${e.missingRows} rows).` },
            ];
        }
        if (cfg.ds === "lesmis") {
            const l = L();
            return [{ id: "gexf", kind: "file", name: GEXF, quiet: `${n(l.nodes)} nodes, ${n(l.edges)} edges`, go: ["data-page", "edit-graph-file"], edit: ["data-page", "edit-graph-file"], open: true,
                children: [
                    { id: "gexf-nodes", kind: "node", name: "nodes", quiet: `node . ${n(l.nodes)} nodes`, go: ["data-page", "edit-graph-file"], noMenu: true },
                    { id: "gexf-edges", kind: "edge", name: "edges", quiet: `edges . ${n(l.edges)} rows, ${n(l.edges)} edges`, go: ["data-page", "edit-graph-file"], noMenu: true },
                ] }];
        }
        const t = T();
        const rows = [
            { id: "accounts", kind: "node", name: t.accountsFile, quiet: `account . ${n(t.nodes)} nodes`, go: ["data-page", "edit-accounts"], edit: ["data-page", "edit-accounts"] },
            { id: "transfers", kind: "edge", name: t.file, quiet: `transfers . ${n(t.edges)} rows, ${n(t.edges)} edges${cfg.afterReplace ? ", replaced Sep 30" : ""}`, go: ["data-page", cfg.afterReplace ? "replace" : "edit-source"], edit: ["data-page", "edit-source"] },
        ];
        if (cfg.url) {
            const flagged = t.attributes.find((a) => a.name === "flagged").values.true;
            rows.push({ id: "url", kind: "node", url: true, name: URL_NAME, quiet: `account . ${n(flagged)} rows`, go: ["data-page", "url"],
                warn: cfg.urlChanged ? "The data at this address changed since Sep 29. Refresh is in its menu" : null });
        }
        return rows;
    }

    // ---------- Sources ----------
    function sources(cfg) {
        const t = T();
        if (cfg.derived) {
            const w = t.withoutMerchants;
            const ul = AB.tree([{ id: "origin", kindIcon: "split", name: "From " + t.graphName + ", without merchants", builtin: true, go: ["data-place", "at-rest"] }], { label: "Sources" });
            const li = rowEl(ul, "origin");
            AB.tip(li.querySelector(".ab-tname"), "Opens " + t.graphName + "'s Data place; a derived graph has no sources of its own", { label: false });
            quiet(li, `${n(w.nodes)} nodes, ${n(w.edges)} edges, Sep 28`);
            return AB.section({ title: "Sources", editable: true },
                h("div", { class: "dp-flat" }, ul),
                h("div", { class: "dp-oq" }, AB.openQuestion("Whether a derived graph follows its origin when the origin changes, or stays as made.")));
        }
        const src = sourceRows(cfg);
        const treeRow = (s) => ({
            id: s.id, kindIcon: AB.tip(icon(KIND[s.kind]), KIND_WORD[s.kind], { label: false }), name: s.name, selected: cfg.select === s.id, go: s.go, open: s.open, waitDouble: true,
            renameDisabled: s.noMenu ? "A table inside a graph file is named by the file" : null,
            children: s.children && s.children.map(treeRow),
        });
        const ul = AB.tree(src.map(treeRow), { label: "Sources, one row per table" });
        const all = src.flatMap((s) => [s].concat(s.children || []));
        const menuFor = (s, li) => {
            if (s.noMenu) return AB.announce(s.name + " belongs to " + GEXF + "; its menu is on the file's row");
            AB.openMenu(li, [
                { heading: s.name },
                { label: "Rename", shortcut: "F2", onClick: () => AB.createThenRename(li, { onSave: (v) => AB.announce("Renamed to " + v) }) },
                { sep: true },
                AB.cmd("replace-file"),
                AB.cmd("edit-source", { go: s.edit || (s.go[1] === "url" ? ["data-page", "url"] : AB.cmd("edit-source").go) }),
                s.url ? { label: "Refresh", desc: "Reads the address again; the graph is untouched if it fails", onClick: () => AB.notice("Refreshed " + URL_NAME + ": nothing changed") } : null,
                { sep: true },
                { label: "Remove", shortcut: "Del", needs: "graphty-element does not record which table each node and edge came from, so one table cannot be removed on its own; Clear graph data is in the graph's menu" },
            ].filter(Boolean));
        };
        all.forEach((s) => {
            const li = rowEl(ul, s.id);
            if (!li) return;
            quiet(li, s.quiet);
            if (s.warn) warn(li, s.warn);
            if (s.info) { li.setAttribute("aria-description", (li.getAttribute("aria-description") || "") + ". " + s.info); AB.tip(li.querySelector(".ab-tname"), s.info, { label: false }); }
            li.addEventListener("contextmenu", (e) => { e.preventDefault(); menuFor(s, li); });
        });
        const by = (li) => all.find((s) => s.id === li.dataset.row);
        guardKeys(ul, {
            Delete: () => AB.announce("A table cannot be removed on its own yet; Clear graph data is in the graph's menu"),
            Backspace: () => {},
            "Shift+F10": (li) => menuFor(by(li), li),
            ContextMenu: (li) => menuFor(by(li), li),
        });
        // Every door opens the Data page with the new table added
        const plus = AB.plus({
            label: "Add data to this graph",
            items: [
                { label: "File...", to: ["data-page", "edge-list"] },
                { label: "From a URL...", to: ["data-page", "url"] },
                { label: "Paste...", to: ["data-page", "detect-several"] },
                { label: "Set collection...", desc: "Lands as a folder of sets in the Graph tree", to: ["data-page", "edge-list"] },
            ],
            onAdd: (it) => AB.go(it.to[0], it.to[1]),
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

        const rows = steps.map((s) => ({ id: s.id, kindIcon: AB.ICON.filter, name: s.name, notes: s.notes || null, selected: model.selected === s.id, go: ["inspector-attribute-and-filter-step", "filter-step"], renameDisabled: "a step is named by its rule; Enter edits the rule" }));
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
            AB.cmd("add-note", { onClick: () => AB.addNote({ targets: [{ label: s.name, icon: AB.ICON.filter, go: ["inspector-attribute-and-filter-step", "filter-step"] }], right: "inspector-attribute-and-filter-step/filter-step" }) }),
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
    // Groups per data set: [{ head, label, edge, rows: [[name, type, role, extra]] }]
    function attributeGroups(cfg) {
        // The built-in type is named apart from any file column called "type" (graphty-element's table.type)
        const TYPE_ATTR = ["type (built in)", "cat", null, { builtin: true, why: "Built in: the type of the table each row came from (table.type)" }];
        if (cfg.ds === "door") {
            return [
                { head: "person", rows: [TYPE_ATTR, ["badge", "cat"], ["dept", "cat"], ["id", "cat", "Key"], ["name", "cat", "Name"]] },
                { head: "building", rows: [TYPE_ATTR, ["bldg", "cat", "Key"], ["floors", "num", "Weight"], ["site", "cat", "Name"]] },
                // as the last Load left One edge per: Pair adds count (the weight) and combines time;
                // each entry as a node makes entry a node type with its time
                D().loaded.per === "nodes" ? { head: "entry", rows: [TYPE_ATTR, ["time", "time", "Time"]] }
                    : D().loaded.per === "row" ? { head: "entries", edge: true, rows: [TYPE_ATTR, ["time", "time", "Time"]] }
                    : { head: "entries", edge: true, rows: [TYPE_ATTR, ["count", "num", "Weight", { why: "One edge per Pair: how many entries each pair made" }], ["time (earliest)", "time", "Time", { roleWhy: "from Pair: each pair's earliest time; time (latest) is an attribute" }], ["time (latest)", "time"]] },
            ];
        }
        if (cfg.ds === "lesmis") {
            return [
                { head: "Nodes", rows: [["group", "cat"], ["label", "cat", "Name"]] },
                { head: "Edges", edge: true, rows: [["value", "num", "Weight", { roleWhy: "set by the file -- every run uses it unless the run picks another" }]] },
            ];
        }
        const t = T();
        const scope = cfg.afterReplace ? "stale" : cfg.steps === "two" || cfg.steps === "new" ? "filtered" : null;
        const pagerank = ["PageRank", "num", null, { computed: true,
            mark: scope ? (scope === "stale" ? "Out of date: computed on the data before the replace. Rerun is in its menu"
                : `Computed on ${n(t.nodes)} nodes; the filters now leave 812. Rerun is in its menu`) : null }];
        return [
            // One node type keeps the plain Nodes and Edges subheads. Computed first, then by name
            { head: "Nodes", rows: [cfg.derived || cfg.fresh ? null : pagerank, ["alertRule", "cat"], ["alertTime", "time"], ["country", "cat"], ["flagged", "cat"], ["id", "cat", "Key"], ["kind", "cat"], ["riskScore", "num"]].filter(Boolean) },
            { head: "Edges", edge: true, rows: [["amount", "num", "Weight"], ["timestamp", "time", "Time"]] },
        ];
    }

    // The door entries' attributes that have an inspector: the two weights chosen at load
    const DOOR_ATTR = { floors: "node-weight", count: "edge-weight" };
    function attributes(cfg) {
        const groups = attributeGroups(cfg);
        const editOn = cfg.ds === "door" ? ["data-page", "edit-entries"] : cfg.ds === "lesmis" ? ["data-page", "edit-graph-file"] : ["data-page", "edit-source"];
        const menuFor = (a, edge, li) => {
            if (a.builtin) return AB.openMenu(li, [{ heading: a.name }, { label: "Color by", onClick: () => AB.flash("Color by type") }, { label: "Show as groups", onClick: () => AB.flash("Show as groups by type") }, { sep: true }, goItem("Show in table", ["table-dock", cfg.ds === "door" ? "door-entries-nodes" : "nodes"])]);
            AB.openMenu(li, [
                { heading: a.name },
                { label: "Color by", onClick: () => AB.flash("Color by " + a.name) },
                { label: edge ? "Width by" : "Size by", onClick: () => AB.flash((edge ? "Width by " : "Size by ") + a.name) },
                AB.cmd("label-by", { go: null, onClick: () => AB.flash("Label by " + a.name) }),
                { label: "Show as groups", onClick: () => AB.flash("Show as groups by " + a.name) },
                { label: "Place by", needs: "graphty-element places nodes only by position attributes; " + a.name + " as an axis needs a layout that reads any attribute" },
                { sep: true },
                goItem("Filter to...", ["data-place", "filters"]),
                goItem("Create set where this is...", ["select-where", "where"]),
                { sep: true },
                goItem("Read as...", ["inspector-attribute-and-filter-step", "attribute"]),
                goItem("Edit on the Data page", editOn),
                { sep: true },
                goItem("Show in table", cfg.ds === "door" ? ["table-dock", edge ? "door-entries" : "door-entries-nodes"] : ["table-dock", edge ? "edges" : "nodes"]),
            ]);
        };
        const list = (g) => {
            const rows = g.rows.map(([name, type, role, x]) => Object.assign({ name, type, role }, x || {}));
            const ul = AB.tree(rows.map((a) => ({
                id: g.head + "/" + a.name, name: a.name, selected: cfg.select === a.name, builtin: a.builtin,
                kindIcon: a.computed ? AB.tip(icon(AB.ICON.run), "Computed by PageRank. Read as: Number", { label: false }) : glyph(a.type),
                // The door entries' attribute inspector is drawn for floors (node weight); the rest flash below
                go: cfg.ds === "door" ? (DOOR_ATTR[a.name] ? ["inspector-attribute-and-filter-step", DOOR_ATTR[a.name]] : null)
                    : (a.computed ? ["inspector-measure-row", "data"] : ["inspector-attribute-and-filter-step", a.role === "Name" ? "attribute-name-role" : "attribute"]),
                renameDisabled: a.builtin ? "The built-in type is named by the table each row came from" : "an attribute is named by its column in the file",
                count: a.role ? AB.roleTag(a.role, { go: editOn, second: a.roleWhy || ROLE_WHY[a.role] }) : null,
            })), { label: g.head + " attributes" });
            rows.forEach((a) => {
                const li = rowEl(ul, g.head + "/" + a.name);
                if (a.why) li.setAttribute("aria-description", a.why);
                if (cfg.ds === "door" && !DOOR_ATTR[a.name]) li.addEventListener("click", (e) => { if (e.detail < 2) AB.flash("Opens " + a.name + "'s inspector (not wired in the skeleton)"); });
                if (a.mark) {
                    li.setAttribute("aria-description", a.mark);
                    li.querySelector(".ab-le").append(AB.tip(h("span", { class: "dp-mark", role: "img", "aria-label": "out of date" }, icon("triangle-alert", "sm")), a.mark, { label: false }));
                }
                li.addEventListener("contextmenu", (e) => { e.preventDefault(); menuFor(a, g.edge, li); });
            });
            const by = (li) => rows.find((a) => g.head + "/" + a.name === li.dataset.row);
            guardKeys(ul, {
                Delete: () => AB.announce("An attribute comes from its source and cannot be deleted"),
                Backspace: () => {},
                "Shift+F10": (li) => menuFor(by(li), g.edge, li),
                ContextMenu: (li) => menuFor(by(li), g.edge, li),
            });
            return h("div", { class: "dp-flat" }, ul);
        };
        // Types and edge tables are plain subheads, not a second level of disclosure inside the section
        const sub = (g) => h("div", { class: "dp-sub", role: "heading", "aria-level": "4" }, g.head, g.oq ? AB.openQuestion(g.oq) : null);
        // "+" is grayed and focusable with its reason (it needs graphty-element, so the user-test build hides it)
        const plus = AB.iconButton("plus", "New attribute", { disabled: "A computed attribute needs graphty-element (filed). To add columns from a file, open the Data page" });
        plus.classList.add("ab-plus");
        plus.setAttribute("data-needs", "");
        // Find appears only when the list is longer than the panel
        // the shared find field (lib treebar's look): no focus border at rest
        const input = h("input", { type: "search", placeholder: "Find attribute", "aria-label": "Find attribute" });
        const find = h("div", { class: "dp-find", hidden: true }, h("label", { class: "ab-find" }, icon("search", "sm"), input));
        const none = h("div", { hidden: true });
        input.addEventListener("input", () => {
            const q = input.value.trim().toLowerCase();
            let any = false;
            find.parentNode.querySelectorAll(".ab-trow").forEach((li) => { const hit = !q || li.dataset.row.split("/").pop().toLowerCase().includes(q); li.hidden = !hit; any = any || hit; });
            none.replaceChildren(any ? "" : AB.noMatch(input.value.trim()));
            none.hidden = any;
        });
        const sec = AB.section({ title: "Attributes", editable: true, actions: plus }, find, groups.map((g) => [sub(g), list(g)]), none);
        sec.id = "dp-attributes";
        return { sec, find };
    }

    // ---------- the place ----------
    function build(region, cfg, model) {
        const el = h("div", { class: "dp" });
        region.replaceChildren(el);
        const name = cfg.ds === "door" ? D().graphName : cfg.ds === "lesmis" ? L().title : cfg.derived ? T().graphName + " without merchants" : T().graphName;
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
        "door-entries": { ds: "door", steps: "none" },
        "graph-file": { ds: "lesmis", steps: "none" },
        "url-source": { steps: "two", select: "url", url: true },
        "url-changed": { steps: "two", select: "url", url: true, urlChanged: true },
        derived: { steps: "none", derived: true },
        "after-replace": { steps: "none", select: "transfers", afterReplace: true },
        "new-step": { steps: "new", selectStep: "s3" },
        "empty-filters": { steps: "none", fresh: true }, // where the transfers Load lands: no result attributes yet
    };
    const RIGHT = {
        filters: "inspector-attribute-and-filter-step/filter-step",
        attributes: "inspector-attribute-and-filter-step/attribute",
        "new-step": "inspector-attribute-and-filter-step/filter-step",
    };
    const DATASET = { door: "doorEntries", lesmis: "lesmis" };

    registerSection({
        id: "data-place",
        title: "Data place",
        region: "left",
        rail: "data",
        // The header's filter chip says what the steps that apply leave
        frame(state) {
            const c = CFG[state] || CFG["at-rest"];
            const f = { dataset: DATASET[c.ds] || "transactions", chip: c.steps === "two" || c.steps === "new" ? "812 of " + n(T().nodes) + " nodes" : "Full graph" };
            if (RIGHT[state]) f.right = RIGHT[state];
            return f;
        },
        states: [
            { id: "at-rest", label: "Accounts and transfers, two filter steps" },
            { id: "filters", label: "A filter step selected" },
            { id: "undo-notice", label: "After undoing a step" },
            { id: "attributes", label: "An attribute selected" },
            { id: "door-entries", label: "Door entries: three tables, grouped attributes" },
            { id: "graph-file", label: "A GEXF file: one row, two tables" },
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
