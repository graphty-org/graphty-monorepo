/* Data place (spec section 7): the graph switcher row, then three collapsible sections with "+" in
   their headers and a one-line summary when closed ("3 sources", "2 steps, 1 on", "10 attributes")
   -- Sources, Filters, Attributes. They hold lists, not property editors, so the accordion rule for
   editable bodies does not apply. Sources are one row per table; every row opens the Data page
   (there is no source inspector) and carries its verbs on a visible "..." (Replace with file...,
   Edit source..., Refresh). Every list is the shared tree (its keyboard model); this file adds only
   a quiet line under source and step rows, the trailing warning or step checkbox, the row menus, and
   the step keys the tree would otherwise treat as a paint row's (Space, Delete, Mod+] and Mod+[,
   Shift+F10).
   Filter steps are evaluated top to bottom: each step's count is taken on what the steps above it
   left (run(), a stand-in for graphty-element's filter plan), and the header's filter chip, the
   row's line and the step's inspector all read that one result. Turning a step on or off, and
   adding one, are linear undo entries: the header's Undo and Redo (and Ctrl+Z, which presses them)
   act on them while this place is on screen. The shell has no undo stack yet, so this file listens
   for those two buttons itself; a shared undo stack belongs in the shell.
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
/* The degree step's two counts are read, not glanced at: normal text */
.dp-quiet.dp-plain { color: var(--cm-text); font-size: inherit; line-height: 18px; }
/* The step count beside "+" shows while the section is open; closed, the summary line says it */
.dp .k-section[data-collapsed] .dp-count { display: none; }
.dp-more { display: grid; place-items: center; flex: none; }
.dp-more .k-icon-btn { width: 20px; height: 20px; }
.dp-cost { display: inline-grid; place-items: center; vertical-align: -2px; color: var(--cm-icon); }
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
    function quiet(li, text, plain) {
        li.setAttribute("aria-description", text);
        li.after(h("li", { class: "dp-quiet" + (plain ? " dp-plain" : ""), role: "none", "aria-hidden": "true", style: li.getAttribute("style"), on: { click: () => li.click(), dblclick: () => li.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })) } }, text));
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

    // Filter to... from any attribute menu: a step on that attribute in the project's Data place, opened
    let pendingFilter = null;
    AB.filterTo = (ds, name) => {
        const left = String((AB.route && AB.route.frame.left) || "");
        if (left.startsWith("data-place/") && AB.filterToHere && AB.filterToHere(ds, name)) return;
        pendingFilter = { ds, name };
        AB.go("data-place", AB.placeOf(ds, "data") || "at-rest");
    };
    // A step's data place keeps its steps and their undo log, by state, for the session
    const kept = {};

    // ---------- filter steps: what each keeps, evaluated top to bottom ----------
    // A step is { id, name, meaning, on, rule, keep(left, sp), fullKeep?, go?, gone?, notes? }.
    // keep() takes what the steps above left and returns what this step keeps. The transfers fixture
    // has no edge list, so its steps work on counts (sp.all is a number); the hosts have every row,
    // so theirs work on node sets read from the sample. Both stand in for graphty-element's plan().
    // BIG: the accounts at the ends of a transfer of 1,000 or more (the screens' filter chip figure)
    const BIG = 812;
    const AMOUNT_RULE = () => ({ attr: "amount", type: "num", cond: "is at least", value: "1,000", before: T().nodes, after: BIG, noted: true,
        cap: "amount is on edges: this step keeps the transfers that pass and the accounts at their ends." });
    const KIND_RULE = () => ({ attr: "kind", type: "cat", cond: "is not", value: "merchant" });
    const size = (x) => (typeof x === "number" ? x : x.size);
    const nodeTotal = (cfg) => { const c = AB.projectCounts && AB.projectCounts(DATASET[cfg.ds] || "transactions"); return c ? c.nodes : T().nodes; };
    function space(cfg) {
        if (cfg.ds === "wide") { const rows = new Map(W().nodeRows.map((r) => [r.id, r])); return { all: new Set(rows.keys()), rows, total: rows.size }; }
        const total = nodeTotal(cfg);
        return { all: total, total };
    }
    // The hosts' graph, read from the sample's connection rows: degree and bridge ends within a node set
    function degrees(S) {
        const d = new Map();
        W().edgeRows.forEach((e) => { if (e.source !== e.target && S.has(e.source) && S.has(e.target)) { d.set(e.source, (d.get(e.source) || 0) + 1); d.set(e.target, (d.get(e.target) || 0) + 1); } });
        return d;
    }
    function bridgeEnds(S) {
        const adj = new Map(), ends = [];
        W().edgeRows.forEach((e) => {
            if (e.source === e.target || !S.has(e.source) || !S.has(e.target)) return;
            const i = ends.push([e.source, e.target]) - 1;
            [[e.source, e.target], [e.target, e.source]].forEach(([a, b]) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push([b, i]); });
        });
        const disc = new Map(), low = new Map(), out = new Set();
        let t = 0;
        const dfs = (u, via) => {
            disc.set(u, t); low.set(u, t++);
            (adj.get(u) || []).forEach(([v, i]) => {
                if (i === via) return;
                if (!disc.has(v)) { dfs(v, i); low.set(u, Math.min(low.get(u), low.get(v))); if (low.get(v) > disc.get(u)) ends[i].forEach((x) => out.add(x)); }
                else low.set(u, Math.min(low.get(u), disc.get(v)));
            });
        };
        S.forEach((u) => { if (!disc.has(u)) dfs(u, -1); });
        return out;
    }
    const where = (test) => (S, sp) => new Set([...S].filter((id) => test(sp.rows.get(id))));
    const degreeAtLeast = (k, full) => (S, sp) => { const d = degrees(full ? sp.all : S); return new Set([...S].filter((id) => (d.get(id) || 0) >= k)); };
    // One pass over the steps: { per: id -> { before, after, full }, left, total }. An off step still
    // says what it would keep (its inspector shows it), but passes everything on.
    function run(cfg, steps) {
        const sp = space(cfg), per = new Map();
        let left = sp.all;
        steps.forEach((s) => {
            const live = !s.gone && s.keep;
            const next = live ? s.keep(left, sp) : left;
            const o = { before: size(left), after: size(next) };
            if (live && s.fullKeep) o.full = size(s.fullKeep(left, sp));
            per.set(s.id, o);
            if (s.on && live) left = next;
        });
        return { per, left: size(left), total: sp.total };
    }
    // The line under an applied step: a count always names what it counts
    function outcome(s, o) {
        if (!s.on || s.gone || !o || (s.kind && s.kind !== "value" && !s.keep)) return null;
        if (s.fullKeep) return `${n(o.after)} nodes left; ${n(o.full)} on the full graph`;
        return o.after === o.before ? `Kept all ${n(o.before)} nodes` : AB.count(o.after, "node", { of: o.before });
    }
    // What a step means, in one line: its tooltip on hover and on keyboard focus
    const meaningOf = (s) => s.meaning || (s.kind && KEEP_KIND[s.kind] ? KEEP_KIND[s.kind].desc : null) || (s.rule && s.rule.attr ? "Keeps the nodes where " + s.name : "Keeps everything until it has a rule; pick a field in its inspector");

    // ---------- a new step's first field, Keep (spec 7, Filters "+") ----------
    // A subset is an ordinary filter step: the kinds a step keeps by, the ones that compute marked as
    // Analyze marks its costly methods. By value hands over to the inspector's condition (its field list).
    const KEEP_KINDS = [
        { id: "value", label: "By an attribute or computed value", desc: "Keeps the nodes whose attribute or computed value passes a condition" },
        { id: "top", label: "Top of a computed value", desc: "Keeps the nodes ranked highest by a computed value", cost: true },
        { id: "component", label: "Largest component", desc: "Keeps the largest connected part of what the steps above left", cost: true },
        { id: "kcore", label: "k-core", desc: "Keeps the nodes with at least k neighbors among the nodes kept", cost: true },
        { id: "neighbors", label: "Neighbors of the selection", desc: "Keeps the selected nodes and their neighbors", cost: true, disabled: "Select one or more nodes first" },
    ];
    const KEEP_KIND = Object.fromEntries(KEEP_KINDS.map((k) => [k.id, k]));
    // The values Analyze computes per node, the ones a ranking can read
    const RANK_BY = ["degree", "PageRank", "betweenness"];
    const costMark = () => AB.tip(h("span", { class: "dp-cost", tabindex: "-1" }, icon("clock", "sm")), "Slow on large graphs");
    // The rows of a new step's editor: Keep, then what the kind picked needs. A pick renames the step
    // (its row and the inspector header), as a condition does.
    function keepSentence(s, handOver) {
        const k = s.kind ? KEEP_KIND[s.kind] : null;
        const text = h("span", null, k ? [k.label, k.cost ? " " : null, k.cost ? costMark() : null] : h("span", { class: "k-secondary" }, "Pick one"));
        const f = AB.field(text, { caret: true });
        f.setAttribute("aria-haspopup", "menu");
        AB.tip(f, "Keep", { label: false });
        const rename = (name) => {
            s.name = name;
            const row = document.querySelector(`#ab-left [data-row="${CSS.escape(s.id)}"] .ab-tname`);
            if (row) row.textContent = name;
            const head = document.querySelector("#ab-right .ab-insp-head .k-name");
            if (head) head.textContent = name;
        };
        const openKinds = () => AB.openMenu(f, KEEP_KINDS.map((x) => ({
            label: x.cost ? h("span", null, x.label, " ", costMark()) : x.label, desc: x.desc, disabled: x.disabled || false, check: s.kind === x.id,
            onClick: () => {
                s.kind = x.id;
                AB.announce("Keep: " + x.label);
                if (x.id === "value") return handOver();
                rename({ top: "Top 10 by " + (s.by || RANK_BY[0]), component: "Largest component", kcore: (s.k || 2) + "-core" }[x.id]);
                handOver();
            },
        })));
        f.addEventListener("click", openKinds);
        // The inspector names a step with no condition "New step": once drawn, it takes the kind's name
        if (k) requestAnimationFrame(() => requestAnimationFrame(() => { if (f.isConnected) rename(s.name); }));
        // A step just made opens on its Keep list, as a new condition opens its field list
        if (!k) requestAnimationFrame(() => requestAnimationFrame(() => { if (f.isConnected && !s.kind) openKinds(); }));
        const rows = [AB.fieldRow("Keep", f)];
        if (s.kind === "top") {
            s.by = s.by || RANK_BY[0];
            const by = AB.field(h("span", null, s.by), { caret: true });
            by.setAttribute("aria-haspopup", "menu");
            by.addEventListener("click", () => AB.openMenu(by, RANK_BY.map((v) => ({ label: v, check: v === s.by, onClick: () => { s.by = v; by.firstChild.textContent = v; rename("Top " + (s.top || 10) + " by " + v); } }))));
            const top = h("input", { class: "k-field", value: String(s.top || 10), inputmode: "numeric", "aria-label": "How many" });
            top.addEventListener("change", () => { s.top = top.value; rename("Top " + top.value + " by " + s.by); });
            rows.push(AB.fieldRow("By", by), AB.fieldRow("How many", top));
        }
        if (s.kind === "kcore") {
            const kk = h("input", { class: "k-field", value: String(s.k || 2), inputmode: "numeric", "aria-label": "k" });
            kk.addEventListener("change", () => { s.k = kk.value; rename(kk.value + "-core"); });
            rows.push(AB.fieldRow("k", kk));
        }
        return h("div", null, rows);
    }

    // ---------- the lists for one render ----------
    function initialSteps(cfg) {
        if (cfg.steps === "none") return [];
        // The two-step states carry a note on this step; the one-step states (at rest, as a reader leaves a step just made) do not
        const amount = (on) => ({ id: "s1", name: "amount is at least 1,000", meaning: "Keeps the transfers of 1,000 or more and the accounts at their ends", on, notes: cfg.steps === "one" ? null : 1, rule: AMOUNT_RULE(), keep: () => BIG, go: ["inspector-attribute-and-filter-step", "filter-step"] });
        // On the full graph it leaves out the merchants; the accounts in big transfers hold none (the skeleton's reading)
        // On after the amount step, it removes nothing: its line reads "Kept all", and the chip stays the amount step's
        const kind = () => ({ id: "s2", name: "kind is not merchant", meaning: "Keeps the accounts whose kind is anything but merchant", on: !!cfg.kindOn, rule: KIND_RULE(), keep: (left, sp) => (left === sp.total ? T().withoutMerchants.nodes : left) });
        if (cfg.steps === "wide" || cfg.steps === "wide-computed") {
            // The hosts: counts read from the sample's rows
            const rows = W().nodeRows, prod = rows.filter((r) => r.environment === "prod");
            const hit = prod.filter((r) => r[VULN] >= 1).length;
            const env = { id: "w1", name: "environment is prod", meaning: "Keeps the hosts whose environment is prod", on: true, rule: { attr: "environment", type: "cat", cond: "is", value: "prod" }, keep: where((r) => r.environment === "prod") };
            const vuln = { id: "w2", name: VULN + " is at least 1", attr: VULN, rest: " is at least 1", meaning: "Keeps the hosts with at least one critical vulnerability unremediated for over 30 days (" + VULN + ")", on: true,
                rule: { attr: VULN, type: "num", cond: "is at least", value: "1", before: prod.length, after: hit }, keep: where((r) => r[VULN] >= 1), go: ["inspector-attribute-and-filter-step", "wide-filter"] };
            if (cfg.steps === "wide") return [env, vuln];
            // Two computed steps: degree counted on what is left (and, beside it, on the full graph), and bridges
            return [env,
                { id: "w3", name: "Degree 3 or more", meaning: "Keeps the hosts with 3 or more connections among the hosts the steps above left", on: true, computed: true,
                    rule: { attr: "degree", type: "num", cond: "is at least", value: "3" }, keep: degreeAtLeast(3, false), fullKeep: degreeAtLeast(3, true) },
                { id: "w4", name: "Not on a bridge edge", meaning: "Leaves out the hosts at either end of a bridge: a connection whose removal would split its part of the graph in two", on: true, computed: true,
                    rule: { attr: "on a bridge edge", type: "bool", cond: "is", value: "false" }, keep: (S) => { const b = bridgeEnds(S); return new Set([...S].filter((id) => !b.has(id))); } },
                vuln];
        }
        if (cfg.steps === "one") return [amount(true)];
        if (cfg.steps === "gone") return [
            // The step was made on the old file's amount_usd; the replacing file names that column amount
            { id: "s1", name: "amount_usd is at least 1,000", meaning: "Would keep the transfers of 1,000 or more in amount_usd; skipped while that column is missing", on: true, notes: 1, gone: "amount_usd", go: ["inspector-attribute-and-filter-step", "step-attribute-gone"] },
            kind(),
        ];
        const steps = [amount(cfg.steps !== "undone"), kind()];
        if (cfg.steps === "new") steps.push({ id: "s3", name: "New step", on: true, isNew: true });
        return steps;
    }
    function modelFor(cfg) {
        const m = { steps: initialSteps(cfg), selected: cfg.selectStep || null, log: { past: [], future: [] } };
        // After undoing the step just added: it stays listed, off, and Redo turns it on again
        if (cfg.undoNotice) m.log.future.push({ s: m.steps[0], was: false, now: true });
        return m;
    }

    // The header's Undo and Redo act on the Filters on screen while it has something to undo or redo
    // (Ctrl+Z and Ctrl+Shift+Z press those buttons). live: { state, step(undo) -> bool }.
    let live = null;
    ["click", "keydown"].forEach((type) => document.addEventListener(type, (e) => {
        if (type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
        const b = e.target.closest && e.target.closest("#ab-top [aria-label='Undo'], #ab-top [aria-label='Redo']");
        if (!b || !live || String((AB.route && AB.route.frame.left) || "") !== "data-place/" + live.state) return;
        if (!live.step(b.getAttribute("aria-label") === "Undo")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
    }, true));

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
                warn: cfg.urlChanged ? "The data at this address changed since Sep 29" : null,
                progress: cfg.url === "refreshing" ? 0.4 : undefined,
                status: cfg.url === "failed" ? "error" : undefined,
                statusText: cfg.url === "refreshing" ? "Refreshing: reading the address again; the graph keeps its copy until the new data is read"
                    : cfg.url === "failed" ? "Refresh failed: the address did not answer" : undefined,
                problem: cfg.url === "failed" ? { what: "alerts.bank.example did not answer, so nothing was refreshed.", todo: "The graph keeps the copy read Sep 29. Try again later, or check the address on the Data page.", action: { label: "Refresh", onClick: () => AB.flash("Refreshing " + URL_NAME) } }
                    // the row's state line: what changed, and the one verb that acts on it
                    : cfg.urlChanged ? { level: "partial", what: "The data at this address changed since Sep 29.", action: { label: "Refresh", onClick: () => AB.go("data-place", "refreshing") } } : null });
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
            return AB.section({ title: "Sources", collapsible: true, key: "data-place.sources", summary: "From " + t.graphName },
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
                s.url ? { label: "Refresh", desc: "Reads the address again; the graph is untouched if it fails", onClick: () => AB.go("data-place", "refreshing") }
                    : { label: "Refresh", desc: "Reads the file again from where it was opened; the graph is untouched if it fails", onClick: () => AB.flash("Refreshing " + s.name) },
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
            // The row's verbs are on a visible "..." (the same menu as right-click and Shift+F10); one Tab stop stays the tree's
            if (!s.noMenu) {
                const more = AB.iconButton(AB.ICON.options, "Actions for " + s.name, { onClick: () => menuFor(s, more) });
                more.tabIndex = -1;
                more.setAttribute("aria-haspopup", "menu");
                li.append(h("span", { class: "dp-more" }, more));
            }
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
        // Every door opens the Data page with the new table added; a recipe or style file picked from
        // File... opens Apply file instead. The skeleton's file picker is a short menu of example files.
        const pickFile = () => AB.openMenu(plus, [
            { heading: "Choose a file" },
            { label: "Data file: CSV, JSON, GEXF or GraphML", desc: "Opens the Data page with the new table added", onClick: () => AB.go("data-page", "edge-list") },
            { label: "Recipe: mule-ring-triage.graphty", desc: "A recipe opens Apply file", onClick: () => AB.go("recipe-apply", "binding") },
            { label: "Style file: risk-review-look.json", desc: "A style file opens Apply file", onClick: () => AB.go("recipe-apply", "style-unbound") },
        ]);
        const plus = AB.plus({
            label: "Add data to this graph",
            items: [
                { label: "File...", desc: "A data file, a recipe or a style file", pick: true },
                { label: "From a URL...", to: ["data-page", "url"] },
                { label: "Paste...", to: ["data-page", "detect-several"] },
                { label: "Set collection...", desc: "Lands as a folder of sets in the Graph tree", to: ["data-page", "edge-list"] },
            ],
            onAdd: (it) => (it.pick ? setTimeout(pickFile, 0) : AB.go(it.to[0], it.to[1])),
        });
        return AB.section({ title: "Sources", collapsible: true, key: "data-place.sources", summary: src.length ? AB.count(src.length, "source") : "No sources", actions: plus },
            src.length ? h("div", { class: "dp-flat" }, ul) : AB.empty("No data.", { verb: "Add data", go: AB.cmd("add-data").go }));
    }

    // ---------- Filters ----------
    function filters(cfg, model, redraw) {
        const steps = model.steps, log = model.log;
        const ds = DATASET[cfg.ds] || "transactions";
        const res = run(cfg, steps);
        // After anything that changes what the steps keep: keep the model, then draw the list, the
        // header's filter chip and (when it shows this step) the step's inspector again from it.
        // then() runs once the screen is drawn: a notice raised before a redraw would be cleared by it.
        const focusRow = (id) => {
            const f = id && document.querySelector(`#dp-filters [data-row="${CSS.escape(id)}"]`);
            if (f) { f.closest(".ab-tree").querySelectorAll(".ab-trow").forEach((x) => (x.tabIndex = x === f ? 0 : -1)); f.focus(); }
        };
        const sync = (s, focus, then) => {
            kept[cfg.state] = model;
            const showing = s && model.selected === s.id && /^inspector-attribute-and-filter-step\//.test(String((AB.route && AB.route.frame.right) || ""));
            const was = location.hash;
            if (showing) { redraw(focus ? s.id : null); open(s); }
            if (location.hash === was) {
                AB.render();
                if (focus) focusRow(s.id);
                if (then) then();
            } else if (then) window.addEventListener("hashchange", () => setTimeout(then, 0), { once: true });
        };
        // A step's inspector: its own drawn state while the counts are the ones it draws, else the rule handed over (AB.openStep)
        const open = (s) => {
            model.selected = s.id;
            kept[cfg.state] = model;
            const o = run(cfg, steps).per.get(s.id) || { before: res.total, after: res.total };
            const r = s.rule;
            AB.keepLeft = true;
            if (s.go && (!r || (s.on && o.before === r.before && o.after === r.after))) return AB.go(s.go[0], s.go[1]);
            const o2 = Object.assign({ ds, left: "data-place/" + cfg.state, step: s, on: s.on, unit: ["nodes", ds === "wide" ? "wide" : "nodes"], menu: (b) => menuFor(s, b) }, r || { attr: null }, { before: o.before, after: o.after });
            // A step with no rule starts at Keep; By value goes on to the condition and its field list
            if (!r && s.kind !== "value") Object.assign(o2, { sentence: keepSentence(s, () => { redraw(s.id); const was = location.hash; open(s); if (location.hash === was) { AB.keepLeft = false; AB.render(); } }), open: false });
            else if (!r) o2.open = true;
            AB.openStep(o2);
        };
        model.open = open;
        // One linear undo log: turning a step on or off, and adding one, are entries; a new entry clears Redo
        const record = (s, was, now) => { log.past.push({ s, was, now }); log.future.length = 0; };
        const step = (undo) => {
            const from = undo ? log.past : log.future;
            const e = from.pop();
            if (!e) return false;
            (undo ? log.future : log.past).push(e);
            e.s.on = undo ? e.was : e.now;
            // one polite notice naming the step; focus stays where it was
            sync(e.s, false, () => AB.notice((undo ? "Undone: " : "Redone: ") + e.s.name, { label: undo ? "Redo" : "Undo", onClick: () => live && live.step(!undo) }));
            return true;
        };
        live = { state: cfg.state, step };
        // "+" adds "New step" at the end and opens it, its field list open (create first, then edit its rule)
        // Filter to... hands the attribute: the step starts on it, named by its rule
        const addStep = (attr) => {
            const id = "s" + (steps.length + 1) + "-" + Date.now();
            const s = { id, name: "New step", on: true, isNew: true };
            if (attr) {
                const type = (AB.fieldIn(ds, attr)[0] || {}).type, cond = { num: "is at least", list: "contains" }[type] || "is";
                s.rule = { attr, type, cond, value: "" };
                s.name = attr + " " + cond;
            }
            steps.push(s);
            record(s, false, true);
            model.selected = id;
            kept[cfg.state] = model;
            redraw(id);
            AB.announce("Added " + s.name);
            open(s);
        };
        AB.filterToHere = (d, attr) => { if (ds !== d) return false; addStep(attr); return true; };
        const plus = AB.plus({ label: "Add filter step", items: [{ label: "filter step" }], onAdd: () => addStep() });
        const on = steps.filter((s) => s.on).length;
        const summary = steps.length ? `${steps.length} ${steps.length === 1 ? "step" : "steps"}, ${on} on` : "No filters";
        const count = steps.length ? h("span", { class: "dp-count" }, summary) : null;
        const head = { title: "Filters", collapsible: true, key: "data-place.filters", summary, actions: h("span", { style: "display:flex;align-items:center" }, count, plus) };
        if (!steps.length) return AB.section(head, AB.empty("No filters. " + FILTERS_TIP, { verb: "Add filter step", onClick: () => addStep() }));

        const rows = steps.map((s) => ({ id: s.id, kindIcon: AB.ICON.filter, name: s.name, notes: s.notes || null,
            status: s.gone ? "error" : undefined, statusText: s.gone ? "Skipped: " + s.gone + " is not in the data any more" : undefined, selected: model.selected === s.id, onOpen: () => open(s), renameDisabled: "a step is named by its rule; Enter edits the rule" }));
        const ul = AB.tree(rows, { label: "Filter steps, in the order they apply" });
        // Order changes what each step counts on: draw everything again
        const move = (s, d) => {
            const i = steps.indexOf(s), j = i + d;
            if (j < 0 || j >= steps.length) return AB.announce(s.name + " cannot move further");
            steps.splice(i, 1);
            steps.splice(j, 0, s);
            AB.announce("Moved " + s.name + (d < 0 ? " up" : " down"));
            sync(null);
            focusRow(s.id);
        };
        const forget = (s) => [log.past, log.future].forEach((l) => { for (let i = l.length - 1; i >= 0; i--) if (l[i].s === s) l.splice(i, 1); });
        const del = (s) => {
            const i = steps.indexOf(s);
            steps.splice(i, 1);
            forget(s);
            const near = (steps[Math.min(i, steps.length - 1)] || {}).id;
            sync(null);
            focusRow(near);
            AB.deleted(s.name, () => { steps.splice(i, 0, s); sync(null); focusRow(s.id); });
        };
        const flip = (s) => {
            const was = s.on;
            s.on = !s.on;
            record(s, was, s.on);
            AB.announce(s.name + (s.on ? " applied" : " not applied"));
            sync(s, true);
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
            const nameEl = li.querySelector(".ab-tname");
            if (s.attr) nameEl.replaceChildren(AB.truncMiddle(s.attr, 14), s.rest);
            // The label's tooltip is the step's meaning, on hover and on keyboard focus (the row holds focus)
            [nameEl, ...nameEl.querySelectorAll("[data-tip]")].forEach((x) => x.removeAttribute("data-tip"));
            AB.tip(li, meaningOf(s), { label: false });
            const line = outcome(s, res.per.get(s.id));
            if (line) quiet(li, line, !!s.fullKeep);
            li.setAttribute("aria-description", [line, meaningOf(s)].filter(Boolean).join(". "));
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
                sync(null);
                focusRow(d.id);
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
        const sec = AB.section(head, h("div", { class: "dp-flat" }, ul));
        // Once a step exists, the empty line's sentence becomes the header's tooltip
        AB.tip(sec.querySelector(".ab-sec-h"), FILTERS_TIP, { label: false });
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
        // "+" New attribute is drawn disabled, focusable with its reason, in every view; the design note
        // after it (hidden with the design notes) says it needs graphty-element
        const plus = AB.iconButton("plus", "New attribute", { disabled: "A computed attribute needs graphty-element (filed). To add columns from a file, open the Data page" });
        plus.classList.add("ab-plus");
        const actions = h("span", { style: "display:flex;align-items:center;gap:4px" }, plus, AB.needsElement("New attribute (an expression column)"));
        const head = (summary) => ({ title: "Attributes", collapsible: true, key: "data-place.attributes", summary, actions });
        if (cfg.ds === "none") {
            const sec = AB.section(head("No attributes"), AB.empty("No attributes."));
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
        const total = groups.reduce((a, g) => a + g.fields.length, 0);
        const sec = AB.section(head(AB.count(total, "attribute")), list);
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
        "at-rest": { steps: "one" },
        filters: { steps: "two", selectStep: "s1", kindOn: true },
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
        "wide-computed": { ds: "wide", steps: "wide-computed" },
        "attributes-wide": { ds: "wide", steps: "none" },
        "attributes-wide-search": { ds: "wide", steps: "none", scrollTo: "dp-attributes", query: "vu cr" },
        "attributes-no-match": { ds: "wide", steps: "none", scrollTo: "dp-attributes", query: "xyz" },
        "attributes-nested": { ds: "nested", steps: "none" },
        "attributes-nested-search": { ds: "nested", steps: "none", scrollTo: "dp-attributes", query: "attributes.orcid" },
        "plain-json": { ds: "plainJson", steps: "none" },
        registry: { ds: "registry", steps: "none" },
    };
    const RIGHT = {
        filters: "inspector-attribute-and-filter-step/filter-step",
        attributes: "inspector-attribute-and-filter-step/attribute",
        "new-step": "inspector-attribute-and-filter-step/step",
    };
    const DATASET = { door: "doorEntries", lesmis: "lesmis", none: "lesmis", wide: "wide", nested: "nested", plainJson: "plainJson", registry: "registry" };
    const cfgOf = (state) => Object.assign({ state: CFG[state] ? state : "at-rest" }, CFG[state] || CFG["at-rest"]);
    const modelOf = (cfg) => kept[cfg.state] || (kept[cfg.state] = modelFor(cfg));
    // What the steps that apply leave, for the header's filter chip: the same result the rows show
    function chipOf(cfg) {
        const m = modelOf(cfg);
        if (!m.steps.length) return "Full graph";
        const r = run(cfg, m.steps);
        return r.left < r.total ? AB.count(r.left, "node", { of: r.total }) : "Full graph";
    }

    // The attributes each step list reads, on or off (initialSteps); the field list tags them "Filter step".
    // amount_usd is gone after Replace, so only kind remains.
    const STEP_ATTRS = { two: ["amount", "kind"], undone: ["amount", "kind"], new: ["amount", "kind"], one: ["amount"], gone: ["kind"], wide: ["environment", VULN], "wide-computed": ["environment", VULN] };

    registerSection({
        id: "data-place",
        title: "Data place",
        region: "left",
        rail: "data",
        // The header's filter chip says what the steps that apply leave
        frame(state) {
            const c = cfgOf(state);
            if (c.ds === "registry") AB.registryDataset();
            const f = { dataset: DATASET[c.ds] || "transactions", chip: chipOf(c), filterOn: STEP_ATTRS[c.steps] || null };
            if (RIGHT[state]) f.right = RIGHT[state];
            // A new project: nothing loaded, nothing drawn
            if (c.ds === "none") Object.assign(f, { right: "inspector-nothing-selected", canvas: "canvas-and-states/empty", dock: false });
            return f;
        },
        states: [
            { id: "at-rest", label: "Accounts and transfers, the amount step on" },
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
            { id: "wide-computed", label: "Hosts: computed steps (degree, bridges)" },
            { id: "attributes-wide", label: "Hosts: 69 host and 26 connection attributes" },
            { id: "attributes-wide-search", label: "Hosts: Find \"vu cr\"" },
            { id: "attributes-no-match", label: "Hosts: Find with no match" },
            { id: "attributes-nested", label: "Research network: nested attributes" },
            { id: "attributes-nested-search", label: "Research network: Find a stored name, \"attributes.orcid\"" },
            { id: "plain-json", label: "Coauthors: a plain JSON graph" },
            { id: "registry", label: "Package registry: records keyed by name" },
        ],
        render(el, state) {
            const cfg = cfgOf(state);
            const model = modelOf(cfg);
            build(el, cfg, model);
            // A direct visit draws the step inspector beside this place in the same pass, the left
            // panel first: hand it the selected new step (Keep first) without navigating away
            const sel = model.steps.find((x) => x.id === model.selected);
            if (sel && sel.isNew && model.open && AB.route && AB.route.id === "data-place" && AB.route.frame.right === RIGHT[state]) {
                const go = AB.go;
                AB.go = () => {};
                try { model.open(sel); } finally { AB.go = go; AB.keepLeft = false; }
            }
            if (pendingFilter) { const p = pendingFilter; pendingFilter = null; setTimeout(() => AB.filterToHere && AB.filterToHere(p.ds, p.name), 0); }
            // A search on screen says its count, as typing it would
            if (cfg.query) setTimeout(() => { const c = el.querySelector(".ab-fl-count"); AB.announce(c && c.textContent ? c.textContent : 'No match for "' + cfg.query + '"'); }, 0);
            // After undoing the step just added: the notice names it, and its Redo is the header's Redo
            if (cfg.undoNotice && model.log.future.length) { const e = model.log.future[model.log.future.length - 1]; setTimeout(() => AB.notice("Undone: " + e.s.name, { label: "Redo", onClick: () => live && live.step(false) }), 0); }
        },
    });
})();
