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
.dp-prob { list-style: none; padding: 0 8px 6px calc(var(--lvl, 0) * 16px + 24px); }
.dp-count { font-size: 11px; color: var(--cm-text-secondary); margin-right: 4px; white-space: nowrap; }
.dp-oq { padding: 0 16px 8px 20px; }
.dp-mark { display: grid; place-items: center; color: var(--cm-icon); }
.dp .ab-trow > .ab-kind { width: 24px; min-width: 24px; justify-items: start; }
.dp .ab-trow > .ab-kind:empty { display: none; }
`));
    }

    const T = () => AB.fx.datasets.transactions;
    const D = () => AB.fx.datasets.doorEntries;
    const L = () => AB.fx.datasets.lesmis;
    const W = () => AB.fx.datasets.wide;
    const N = () => AB.fx.datasets.nested;
    const P = () => AB.fx.datasets.plainJson;
    const LONG_NAME = "accounts-structuring-review-export-q1-2026-final-checked.csv"; // 60 characters
    const VULN = "vuln_count_critical_unremediated_over_30_days";
    const n = (x) => Number(x).toLocaleString("en-US");
    const URL_NAME = "alerts.bank.example/structuring/2026-03.json";
    const GEXF = "miserables.gexf";
    const FILTERS_TIP = "Filters change what is computed; the eye in the Graph tree only hides.";
    const KIND = { node: "circle-dot", edge: "spline", file: "network" };
    const KIND_WORD = { node: "node table", edge: "edge table", file: "graph file" };

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
    // The problem block under its row (after the row's quiet line), indented to the row's level
    function problemUnder(li, p) {
        const after = li.nextElementSibling && li.nextElementSibling.classList.contains("dp-quiet") ? li.nextElementSibling : li;
        after.after(h("li", { class: "dp-prob", role: "none", style: li.getAttribute("style") }, AB.problem(p)));
    }

    // The transfers' second step, off: the skeleton does not count what it would leave
    // Filter to... from any attribute menu: a step on that attribute in the project's Data place, opened
    let pendingFilter = null;
    AB.filterTo = (ds, name) => {
        const left = String((AB.route && AB.route.frame.left) || "");
        if (left.startsWith("data-place/") && AB.filterToHere && AB.filterToHere(ds, name)) return;
        pendingFilter = { ds, name };
        AB.go("data-place", AB.placeOf(ds, "data") || "at-rest");
    };
    const KIND_RULE = () => ({ attr: "kind", type: "cat", cond: "is not", value: "merchant", before: 812, after: 812 });
    // A step's data place keeps the steps the reader added, by state, for the session
    const kept = {};

    // ---------- the lists for one render ----------
    function initialSteps(cfg) {
        if (cfg.steps === "none") return [];
        if (cfg.steps === "wide") {
            // The hosts: counts read from the sample's rows (a stand-in for the element's filter plan)
            const rows = W().nodeRows, prod = rows.filter((r) => r.environment === "prod");
            const hit = prod.filter((r) => r[VULN] >= 1).length;
            return [
                { id: "w1", name: "environment is prod", outcome: `${n(rows.length)} to ${n(prod.length)} nodes`, on: true, rule: { attr: "environment", type: "cat", cond: "is", value: "prod", before: rows.length, after: prod.length } },
                { id: "w2", name: VULN + " is at least 1", attr: VULN, rest: " is at least 1", outcome: `${n(prod.length)} to ${n(hit)} nodes`, on: true, go: ["inspector-attribute-and-filter-step", "wide-filter"] },
            ];
        }
        if (cfg.steps === "one") return [{ id: "s1", name: "amount is at least 1,000", outcome: `${n(T().nodes)} to 812 nodes`, on: true, notes: 1, go: ["inspector-attribute-and-filter-step", "filter-step"] }];
        if (cfg.steps === "gone") return [
            // The step was made on the old file's amount_usd; the replacing file names that column amount
            { id: "s1", name: "amount_usd is at least 1,000", outcome: null, on: true, notes: 1, gone: "amount_usd", go: ["inspector-attribute-and-filter-step", "step-attribute-gone"] },
            { id: "s2", name: "kind is not merchant", outcome: null, on: false, rule: KIND_RULE() },
        ];
        const steps = [
            { id: "s1", name: "amount is at least 1,000", outcome: `${n(T().nodes)} to 812 nodes`, on: cfg.steps !== "undone", notes: 1, go: ["inspector-attribute-and-filter-step", "filter-step"] },
            { id: "s2", name: "kind is not merchant", outcome: null, on: false, rule: KIND_RULE() },
        ];
        if (cfg.steps === "new") steps.push({ id: "s3", name: "New step", outcome: null, on: true, isNew: true });
        return steps;
    }

    // Source rows per data set: { id, kind, name, quiet, warn, go, children, open }
    function sourceRows(cfg) {
        if (cfg.ds === "none") return [];
        if (cfg.ds === "wide") {
            const w = W();
            return [
                { id: "hosts", kind: "node", name: w.file, quiet: `host . ${n(w.nodes)} nodes`, go: ["data-page", "edit-wide-hosts"], edit: ["data-page", "edit-wide-hosts"] },
                { id: "connections", kind: "edge", name: w.edgesFile, quiet: `connections . ${n(w.edges)} rows, ${n(w.edges)} edges`, go: ["data-page", "edit-wide-connections"], edit: ["data-page", "edit-wide-connections"] },
            ];
        }
        if (cfg.ds === "nested") {
            // The tables the last Load made (AB.nestedLoaded: the reader's choices on the Data page)
            const d = N(), ra = d.recordArrays, NL = AB.nestedLoaded(), ed = (id) => ["data-page", "edit-json-" + id], go = ed("researchers");
            const cnt = (p) => (d.paths.find((q) => q.path === p) || {}).count || 0;
            const addr = NL.researchers && NL.addr === "rows" ? cnt("data.researchers[].attributes.profile.contact.addresses[]") : 0;
            const nodes = (NL.researchers ? ra["data.researchers[]"] : 0) + (NL.institutions ? ra["data.institutions[]"] : 0) + addr;
            const co = NL.coPer === "item" ? 514 : 510;
            // links' targets are researchers (118) and institutions (42): with institutions not loaded, only the first make edges
            const linkEdges = NL.institutions === false ? 118 : ra["links[]"];
            return [{ id: "json", kind: "file", name: d.file, quiet: `${n(nodes)} nodes, ${n((AB.projectCounts("nested") || { edges: 0 }).edges)} edges from ${n([NL.researchers, NL.researchers && NL.aff === "rows", addr, NL.institutions, NL.links].filter(Boolean).length)} tables`, go, edit: go, open: true,
                children: [
                    NL.researchers && { id: "json-researchers", kind: "node", name: "researchers", quiet: `researcher . ${n(ra["data.researchers[]"])} nodes` + (NL.co === "edges" ? `; coauthor . ${n(co)} edges` : "") + (NL.idLinks || []).map((x) => `; ${x.name} . ${n(x.n)} edges`).join(""), go, edit: go, drop: { researchers: false } },
                    NL.researchers && NL.aff === "rows" && { id: "json-affiliations", kind: "edge", name: "affiliations", quiet: `affiliations . ${n(242)} rows, ${NL.institutions ? n(242) : 0} edges`, go: ed("affiliations"), edit: ed("affiliations"), drop: { aff: "one" } },
                    addr && { id: "json-addresses", kind: "node", name: "addresses", quiet: `address . ${n(addr)} nodes`, go: ed("addresses"), edit: ed("addresses"), drop: { addr: "one" } },
                    NL.institutions && { id: "json-institutions", kind: "node", name: "institutions", quiet: `institution . ${n(ra["data.institutions[]"])} nodes`, go: ed("institutions"), edit: ed("institutions"), drop: { institutions: false } },
                    NL.links && { id: "json-links", kind: "edge", name: "links", quiet: `links . ${n(ra["links[]"])} rows, ${n(linkEdges)} edges`, go: ed("links"), edit: ed("links"), drop: { links: false } },
                ].filter(Boolean) }];
        }
        if (cfg.ds === "plainJson") {
            const d = P(), go = ["data-page", "edit-plain-nodes"];
            return [{ id: "json", kind: "file", name: d.file, quiet: `${n(d.nodes)} nodes, ${n(d.edges)} edges`, go, edit: go, open: true,
                children: [
                    { id: "json-nodes", kind: "node", name: "nodes", quiet: `node . ${n(d.nodes)} nodes`, go, noMenu: true },
                    { id: "json-links", kind: "edge", name: "links", quiet: `links . ${n(d.edges)} rows, ${n(d.edges)} edges`, go: ["data-page", "edit-plain-links"], noMenu: true },
                ] }];
        }
        if (cfg.ds === "registry") {
            const R = AB.fx.datasets.registry, go = ["data-page", "edit-registry"];
            return [{ id: "json", kind: "file", name: R.file, quiet: `${n(R.nodes)} nodes, ${n(R.edges)} edges`, go, edit: go, open: true,
                children: [{ id: "json-packages", kind: "node", name: "packages", quiet: `package . ${n(R.nodes)} nodes` + (R.edges ? `; dependencies . ${n(R.edges)} edges` : ""), go, noMenu: true }] }];
        }
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
            { id: "accounts", kind: "node", name: cfg.longName ? LONG_NAME : t.accountsFile, quiet: `account . ${n(t.nodes)} nodes`, go: ["data-page", "edit-accounts"], edit: ["data-page", "edit-accounts"] },
            { id: "transfers", kind: "edge", name: t.file, quiet: `transfers . ${n(t.edges)} rows, ${n(t.edges)} edges${cfg.afterReplace ? ", replaced Sep 30" : ""}`, go: ["data-page", cfg.afterReplace ? "replace" : "edit-source"], edit: ["data-page", "edit-source"] },
        ];
        if (cfg.url) {
            const flagged = t.attributes.find((a) => a.name === "flagged").values.true;
            rows.push({ id: "url", kind: "node", url: true, name: URL_NAME, quiet: `account . ${n(flagged)} rows`, go: ["data-page", "url"],
                warn: cfg.urlChanged ? "The data at this address changed since Sep 29. Refresh is in its menu" : null,
                progress: cfg.url === "refreshing" ? 0.4 : undefined,
                status: cfg.url === "failed" ? "error" : undefined,
                statusText: cfg.url === "refreshing" ? "Refreshing: reading the address again; the graph keeps its copy until the new data is read"
                    : cfg.url === "failed" ? "Refresh failed: the address did not answer" : undefined,
                problem: cfg.url === "failed" ? { what: "alerts.bank.example did not answer, so nothing was refreshed.", todo: "The graph keeps the copy read Sep 29. Try again later, or check the address on the Data page.", action: { label: "Refresh", onClick: () => AB.flash("Refreshing " + URL_NAME) } } : null });
        }
        return rows;
    }

    // A table the reader built from a document (the nested project) is removed by loading the document
    // again without it: the last Load's choices (AB.nestedLoaded) lose that table, and Undo puts them back
    function removeBuilt(s) {
        const D = N(), was = AB.nestedLoaded();
        D.loaded = Object.assign({}, was, s.drop);
        AB.render();
        AB.deleted(s.name, () => { D.loaded = was; AB.render(); });
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
            progress: s.progress, status: s.status, statusText: s.statusText,
            renameDisabled: s.noMenu ? "A table inside a graph file is named by the file" : null,
            children: s.children && s.children.map(treeRow),
        });
        const ul = AB.tree(src.map(treeRow), { label: "Sources, one row per table" });
        const all = src.flatMap((s) => [s].concat(s.children || []));
        const menuFor = (s, li) => {
            if (s.noMenu) return AB.announce(s.name + " belongs to " + ((src.find((x) => (x.children || []).includes(s)) || {}).name || GEXF) + "; its menu is on the file's row");
            AB.openMenu(li, [
                { heading: s.name },
                { label: "Rename", shortcut: "F2", onClick: () => AB.createThenRename(li, { onSave: (v) => AB.announce("Renamed to " + v) }) },
                { sep: true },
                AB.cmd("replace-file"),
                AB.cmd("edit-source", { go: s.edit || (s.go[1] === "url" ? ["data-page", "url"] : AB.cmd("edit-source").go) }),
                s.url ? { label: "Refresh", desc: "Reads the address again; the graph is untouched if it fails", onClick: () => AB.go("data-place", "refreshing") } : null,
                { sep: true },
                s.drop ? { label: "Remove", shortcut: "Del", desc: "Stops loading this table from the file; Edit source can bring it back", onClick: () => removeBuilt(s) }
                    : { label: "Remove", shortcut: "Del", needs: "graphty-element does not record which table each node and edge came from, so one table cannot be removed on its own; Clear graph data is in the graph's menu" },
            ].filter(Boolean));
        };
        all.forEach((s) => {
            const li = rowEl(ul, s.id);
            if (!li) return;
            quiet(li, s.quiet);
            if (s.warn) warn(li, s.warn);
            if (s.problem) problemUnder(li, s.problem);
            if (s.info) { li.setAttribute("aria-description", (li.getAttribute("aria-description") || "") + ". " + s.info); AB.tip(li.querySelector(".ab-tname"), s.info, { label: false }); }
            li.addEventListener("contextmenu", (e) => { e.preventDefault(); menuFor(s, li); });
        });
        const by = (li) => all.find((s) => s.id === li.dataset.row);
        guardKeys(ul, {
            Delete: (li) => { const s = li && by(li); if (s && s.drop) removeBuilt(s); else AB.announce("A table cannot be removed on its own yet; Clear graph data is in the graph's menu"); },
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
        return AB.section({ title: "Sources", editable: true, actions: plus },
            src.length ? h("div", { class: "dp-flat" }, ul) : AB.empty("No data.", { verb: "Add data", go: AB.cmd("add-data").go }));
    }

    // ---------- Filters ----------
    function filters(cfg, model, redraw) {
        const steps = model.steps;
        // "+" adds a step at the end, named "New step", selected (create first, then edit its rule)
        // "+" adds "New step" at the end and opens it, its field list open (create first, then edit its rule)
        // Filter to... hands the attribute: the step starts on it, named by its rule
        const addStep = (attr) => {
            const id = "s" + (steps.length + 1) + "-" + Date.now();
            const s = { id, name: "New step", outcome: null, on: true, isNew: true };
            if (attr) {
                const type = (AB.fieldIn(DATASET[cfg.ds] || "transactions", attr)[0] || {}).type, cond = { num: "is at least", list: "contains" }[type] || "is";
                s.rule = { attr, type, cond, value: "", before: nodeCount(), after: nodeCount() };
                s.name = attr + " " + cond;
            }
            steps.push(s);
            model.selected = id;
            kept[cfg.state] = model;
            redraw(id);
            AB.announce("Added " + s.name);
            open(s);
        };
        AB.filterToHere = (ds, attr) => { if ((DATASET[cfg.ds] || "transactions") !== ds) return false; addStep(attr); return true; };
        const nodeCount = () => { const c = AB.projectCounts && AB.projectCounts(DATASET[cfg.ds] || "transactions"); return c ? c.nodes : T().nodes; };
        // A step's inspector: its own state where the skeleton draws one, else the rule handed over (AB.openStep)
        const open = (s) => {
            if (s.go) { AB.keepLeft = true; return AB.go(s.go[0], s.go[1]); }
            const ds = DATASET[cfg.ds] || "transactions";
            const r = s.rule || { attr: null, before: nodeCount(), after: nodeCount() };
            AB.keepLeft = true;
            AB.openStep(Object.assign({ ds, left: "data-place/" + cfg.state, step: s, on: s.on, unit: ["nodes", ds === "wide" ? "wide" : "nodes"], menu: (b) => menuFor(s, b) }, r));
        };
        const plus = AB.plus({ label: "Add filter step", items: [{ label: "filter step" }], onAdd: () => addStep() });
        const on = steps.filter((s) => s.on).length;
        const count = steps.length ? h("span", { class: "dp-count" }, `${steps.length} ${steps.length === 1 ? "step" : "steps"}, ${on} on`) : null;
        const sec = AB.section({ title: "Filters", editable: true, actions: h("span", { style: "display:flex;align-items:center" }, count, plus) });
        if (!steps.length) {
            sec.append(AB.empty("No filters. " + FILTERS_TIP, { verb: "Add filter step", onClick: () => addStep() }));
            return sec;
        }
        // Once a step exists, the empty line becomes the header's tooltip
        AB.tip(sec.querySelector(".ab-sec-h"), FILTERS_TIP, { label: false });

        const rows = steps.map((s) => ({ id: s.id, kindIcon: AB.ICON.filter, name: s.name, notes: s.notes || null,
            status: s.gone ? "error" : undefined, statusText: s.gone ? "Skipped: " + s.gone + " is not in the data any more" : undefined, selected: model.selected === s.id, onOpen: () => open(s), renameDisabled: "a step is named by its rule; Enter edits the rule" }));
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
            redraw(s.id);
        };
        const menuFor = (s, anchor) => AB.openMenu(anchor, [
            { label: "Move up", shortcut: "Ctrl+]", disabled: steps.indexOf(s) === 0 ? "Already first" : false, onClick: () => move(s, -1) },
            { label: "Move down", shortcut: "Ctrl+[", disabled: steps.indexOf(s) === steps.length - 1 ? "Already last" : false, onClick: () => move(s, 1) },
            { sep: true },
            AB.cmd("add-note", { onClick: () => AB.addNote({ targets: [{ label: s.name, icon: AB.ICON.filter, go: s.go || ["inspector-attribute-and-filter-step", "step"] }], right: s.go ? s.go.join("/") : "inspector-attribute-and-filter-step/step" }) }),
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
            // An attribute name in a rule keeps its start and its end (the middle ellipsis); the row's name is the full rule
            if (s.attr) li.querySelector(".ab-tname").replaceChildren(AB.truncMiddle(s.attr, 14), s.rest);
            if (s.on && s.outcome) quiet(li, s.outcome);
            if (s.gone) problemUnder(li, { what: `${s.gone} is not in ${T().file} any more, so this step is skipped.`, todo: "Pick another attribute in the step's rule, or delete the step.", action: { label: "Edit rule", onClick: () => open(s) } });
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
    // The list is the field list at panel size (spec 2.5), over the project on screen: one group per
    // table, "In use (n)" first with what uses each, fill figures, folders only from the data's nesting,
    // Find past 15. Its rows are fieldsOf()'s, the stand-in for graphty-element's session.data.attributes().
    const EDIT_ON = { doorEntries: ["data-page", "edit-entries"], lesmis: ["data-page", "edit-graph-file"], wide: ["data-page", "edit-wide-hosts"], nested: ["data-page", "edit-json-researchers"], plainJson: ["data-page", "edit-plain-nodes"], registry: ["data-page", "edit-registry"] };
    const TABLE = { doorEntries: ["door-entries-nodes", "door-entries"], wide: ["wide", "wide"], nested: ["wide", "wide"], plainJson: ["wide", "wide"] };
    function attributes(cfg) {
        const ds = DATASET[cfg.ds] || "transactions";
        const editOn = EDIT_ON[ds] || ["data-page", "edit-source"];
        const groups = AB.fieldsOf(ds);
        // The row's menu is the attribute's one menu (AB.attributeMenu), as its inspector's "..." opens it
        const menuFor = (name, anchor) => AB.attributeMenu(anchor, ds, name, { editOn, table: TABLE[ds] || ["nodes", "edges"] });
        // "+" is grayed and focusable with its reason (it needs graphty-element, so the user-test build hides it)
        const plus = AB.iconButton("plus", "New attribute", { disabled: "A computed attribute needs graphty-element (filed). To add columns from a file, open the Data page" });
        plus.classList.add("ab-plus");
        plus.setAttribute("data-needs", "");
        if (cfg.ds === "none") {
            const sec = AB.section({ title: "Attributes", editable: true, actions: plus }, AB.empty("No attributes."));
            sec.id = "dp-attributes";
            return sec;
        }
        const list = AB.fieldList({
            size: "panel", dataset: ds, label: "Attributes", current: cfg.select || null, query: cfg.query || undefined,
            onPick(name, type, f) { AB.openField(ds, f.name); },
        });
        // The row menu: right-click, Shift+F10 or the Menu key on the active row
        const nameOf = (row) => row && row.matches(".ab-fl-opt") ? (row.getAttribute("aria-label") || "").split(",")[0] : null;
        const openFor = (row) => { const name = nameOf(row); if (name && AB.fieldIn(ds, name)[0]) menuFor(name, row); };
        list.addEventListener("contextmenu", (e) => { const row = e.target.closest(".ab-fl-opt"); if (row) { e.preventDefault(); openFor(row); } });
        list.addEventListener("keydown", (e) => { if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") { e.preventDefault(); e.stopPropagation(); openFor(list.querySelector("[data-fl-row][data-hover]")); } }, true);
        const sec = AB.section({ title: "Attributes", editable: true, actions: plus }, list);
        sec.id = "dp-attributes";
        return sec;
    }

    // ---------- the place ----------
    function build(region, cfg, model) {
        const el = h("div", { class: "dp" });
        region.replaceChildren(el);
        const name = cfg.ds === "door" ? D().graphName : cfg.ds === "lesmis" ? L().title : cfg.ds === "none" ? L().frame.graphRow
            : cfg.ds === "wide" ? W().graphName : cfg.ds === "nested" ? N().graphName : cfg.ds === "plainJson" ? P().graphName : cfg.ds === "registry" ? AB.fx.datasets.registry.graphName
                : cfg.derived ? T().graphName + " without merchants" : T().graphName;
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
        const asec = attributes(cfg);
        scroll.append(sources(cfg), fsec, asec);
        requestAnimationFrame(() => {
            // a step just added keeps Filters in view; else the state's own section
            const to = model.steps.some((x) => x.isNew && x.id === model.selected) ? "dp-filters" : cfg.scrollTo;
            if (to) { const s = el.querySelector("#" + to); if (s) scroll.scrollTop = s.offsetTop - scroll.offsetTop; }
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
        "no-sources": { ds: "none", steps: "none" },
        refreshing: { steps: "two", select: "url", url: "refreshing" },
        "refresh-failed": { steps: "two", select: "url", url: "failed" },
        "long-source-name": { steps: "two", longName: true },
        "step-attribute-gone": { steps: "gone", afterReplace: true },
        "one-step": { steps: "one" },
        "wide-filters": { ds: "wide", steps: "wide" },
        "attributes-wide": { ds: "wide", steps: "none" },
        "attributes-wide-search": { ds: "wide", steps: "none", scrollTo: "dp-attributes", query: "vu cr" },
        "attributes-no-match": { ds: "wide", steps: "none", scrollTo: "dp-attributes", query: "xyz" },
        "attributes-nested": { ds: "nested", steps: "none" },
        "plain-json": { ds: "plainJson", steps: "none" },
        registry: { ds: "registry", steps: "none" },
    };
    const RIGHT = {
        filters: "inspector-attribute-and-filter-step/filter-step",
        attributes: "inspector-attribute-and-filter-step/attribute",
        "new-step": "inspector-attribute-and-filter-step/step",
    };
    const DATASET = { door: "doorEntries", lesmis: "lesmis", none: "lesmis", wide: "wide", nested: "nested", plainJson: "plainJson", registry: "registry" };
    // What the steps that apply leave, for the header's filter chip
    const CHIP = { two: () => "812 of " + n(T().nodes) + " nodes", new: () => "812 of " + n(T().nodes) + " nodes", one: () => "812 of " + n(T().nodes) + " nodes",
        wide: () => { const s = initialSteps({ steps: "wide" }); return s[s.length - 1].outcome.split(" to ")[1].replace(" nodes", "") + " of " + n(W().nodes) + " nodes"; } };

    // The attributes each step list reads, on or off (initialSteps); the field list tags them "Filter step".
    // amount_usd is gone after Replace, so only kind remains.
    const STEP_ATTRS = { two: ["amount", "kind"], undone: ["amount", "kind"], new: ["amount", "kind"], one: ["amount"], gone: ["kind"], wide: ["environment", VULN] };

    registerSection({
        id: "data-place",
        title: "Data place",
        region: "left",
        rail: "data",
        // The header's filter chip says what the steps that apply leave
        frame(state) {
            const c = CFG[state] || CFG["at-rest"];
            if (c.ds === "registry") AB.registryDataset();
            const f = { dataset: DATASET[c.ds] || "transactions", chip: CHIP[c.steps] ? CHIP[c.steps]() : "Full graph", filterOn: STEP_ATTRS[c.steps] || null };
            if (RIGHT[state]) f.right = RIGHT[state];
            // A new project: nothing loaded, nothing drawn
            if (c.ds === "none") Object.assign(f, { right: "inspector-nothing-selected", canvas: "canvas-and-states/empty", dock: false });
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
            { id: "no-sources", label: "No data: a new project" },
            { id: "refreshing", label: "A URL source refreshing" },
            { id: "refresh-failed", label: "Refresh failed: the address did not answer" },
            { id: "long-source-name", label: "A 60-character file name" },
            { id: "step-attribute-gone", label: "After Replace: a step's attribute is gone" },
            { id: "one-step", label: "One filter step" },
            { id: "wide-filters", label: "Hosts: a step on a long attribute name" },
            { id: "attributes-wide", label: "Hosts: 69 host and 26 connection attributes" },
            { id: "attributes-wide-search", label: "Hosts: Find \"vu cr\"" },
            { id: "attributes-no-match", label: "Hosts: Find with no match" },
            { id: "attributes-nested", label: "Research network: nested attributes" },
            { id: "plain-json", label: "Coauthors: a plain JSON graph" },
            { id: "registry", label: "Package registry: records keyed by name" },
        ],
        render(el, state) {
            const cfg = Object.assign({ state: CFG[state] ? state : "at-rest" }, CFG[state] || CFG["at-rest"]);
            const model = kept[cfg.state] || { steps: initialSteps(cfg), selected: cfg.selectStep || null };
            build(el, cfg, model);
            if (pendingFilter) { const p = pendingFilter; pendingFilter = null; setTimeout(() => AB.filterToHere && AB.filterToHere(p.ds, p.name), 0); }
            // A search on screen says its count, as typing it would
            if (cfg.query) setTimeout(() => { const c = el.querySelector(".ab-fl-count"); AB.announce(c && c.textContent ? c.textContent : 'No match for "' + cfg.query + '"'); }, 0);
            if (cfg.undoNotice) setTimeout(() => AB.notice("Undone: amount is at least 1,000", { label: "Redo", go: ["data-place", "at-rest"] }), 0);
        },
    });
})();
