/* Data place (spec section 7): the graph switcher row, then three collapsible sections with "+" in
   their headers and a one-line summary when closed ("3 sources", "2 steps, 1 on", "10 attributes")
   -- Sources, Filters, Attributes. They hold lists, not property editors, so the accordion rule for
   editable bodies does not apply. Sources are one row per table; every row opens the Data page
   (there is no source inspector) and carries its verbs on a visible "..." (Replace with file..., Add rows from file...,
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
/* The name keeps at least 40% of the row; tags that do not fit are cut, their full list in the tooltip */
.dp .ab-fl-opt .ab-fl-name { flex: 1 0 40%; }
.dp-tags { display: inline-flex; align-items: center; gap: 4px; flex: 0 1 auto; min-width: 0; overflow: hidden; margin-left: 4px; }
.dp-tags > * { flex: none; }
.dp-more { display: grid; place-items: center; flex: none; }
.dp-more .k-icon-btn { width: 20px; height: 20px; }
.dp-cost { display: inline-grid; place-items: center; vertical-align: -2px; color: var(--cm-icon); }
/* A line that says why a count jumped, and the after-Replace report, wrap instead of hiding their end */
.dp-quiet.dp-wrap { white-space: normal; overflow: visible; }
/* "Show in steps" inside the dark notice: the notice's own text color, underlined */
.dp-show { color: inherit; text-decoration: underline; cursor: pointer; }
`));
    }

    const T = () => AB.fx.datasets.transactions;
    const TA = () => AB.fx.datasets.transactionsApril;
    const D = () => AB.fx.datasets.doorEntries;
    const L = () => AB.fx.datasets.lesmis;
    const W = () => AB.fx.datasets.wide;
    const N = () => AB.fx.datasets.nested;
    const P = () => AB.fx.datasets.plainJson;
    const LONG_NAME = "accounts-structuring-review-export-q1-2026-final-checked.csv"; // 60 characters
    const VULN = "vuln_count_critical_unremediated_over_30_days";
    const URL_NAME = "alerts.bank.example/structuring/2026-03.json";
    const GEXF = "miserables.gexf";
    const FILTERS_TIP = "Filters change what is computed; the eye in the Graph tree only hides.";
    const KIND = { node: "circle-dot", edge: "spline", file: "network" };
    const KIND_WORD = { node: "node table", edge: "edge table", file: "graph file" };

    // Decorate tree rows: a quiet line under a row (not a tree item; read through aria-description)
    function quiet(li, text, plain, wrap) {
        li.setAttribute("aria-description", text);
        li.after(h("li", { class: "dp-quiet" + (plain ? " dp-plain" : "") + (wrap ? " dp-wrap" : ""), role: "none", "aria-hidden": "true", style: li.getAttribute("style"), on: { click: () => li.click(), dblclick: () => li.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })) } }, text));
    }
    // More quiet lines under a row, each on its own line, after the row's first one (the after-Replace report)
    function moreLines(li, texts) {
        let at = li.nextElementSibling && li.nextElementSibling.classList.contains("dp-quiet") ? li.nextElementSibling : li;
        texts.forEach((t) => { const x = h("li", { class: "dp-quiet dp-wrap", role: "none", "aria-hidden": "true", style: li.getAttribute("style"), on: { click: () => li.click() } }, t); at.after(x); at = x; });
        li.setAttribute("aria-description", [li.getAttribute("aria-description")].concat(texts).filter(Boolean).join(". "));
    }
    // What a table's rows became: one edge per row, or one per linked pair (several rows, one edge)
    const edgeLine = (name, rows, edges, per) => `${name} . ${AB.count(rows, "row")}, ` + (per === "pair" ? `${AB.count(edges, "edge")}, one per linked pair` : rows === edges ? "one edge per row" : `${AB.count(edges, "edge")}, one per row`);
    const rowEl = (ul, id) => ul.querySelector(`[data-row="${CSS.escape(id)}"]`);
    // The shared warning mark in a row's trailing slot, its reason in the tooltip
    function warn(li, text) {
        li.setAttribute("aria-description", (li.getAttribute("aria-description") || "") + ". " + text);
        li.querySelector(".ab-le").append(AB.tip(h("span", { class: "dp-mark", role: "img", "aria-label": "warning" }, icon("triangle-alert", "sm")), text, { label: false }));
    }
    // The problem block under its row (after the row's quiet line), indented to the row's level
    function problemUnder(li, p) {
        let after = li;
        while (after.nextElementSibling && after.nextElementSibling.classList.contains("dp-quiet")) after = after.nextElementSibling;
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
    // The file chooser of the Sources + drawn last ("<state>/choose" opens it on arrival: Add data...)
    let lastPick = null;
    const CHOOSE = /\/choose$/;
    // A step's data place keeps its steps and their undo log, by state, for the session
    const kept = {};
    // The transfers project's month is AB.fx.datasets.transactions: the Data page's Replace rewrites its
    // file, edge count and title on Load. A direct visit to the after-Replace state does the same, so
    // every screen (the header, Sources, Export) names one month.
    function replaceTransfers() {
        const X = T(), A = TA(), f = A.files.transfers;
        if (X.file === f.file || X.accountsFile !== A.files.marchAccounts) return; // already replaced (or the accounts were)
        X.march = X.march || { file: X.file, accountsFile: X.accountsFile, nodes: X.nodes, edges: X.edges, stats: X.stats, components: X.frame.components }; // March as it was read
        X.file = X.frame.file = f.file;
        X.edges = f.rows;
        const month = A.title.match(/\w+ \d{4}$/)[0];
        X.title = X.title.replace(/\w+ \d{4}$/, month);
        X.frame.project = X.frame.project.replace(/\w+ \d{4}$/, month);
        transfersReplaced();
    }
    // After the transfers file is replaced (here or on the Data page), the graph's readings are the new
    // file's, so the Sources row and the graph inspector agree: components, isolated and the highest
    // degree from the April fixture; the average degree and density from the counts now loaded
    function transfersReplaced() {
        const X = T(), A = TA();
        if (!X.march || X.march.stats && X.stats !== X.march.stats) return;
        X.march.stats = X.stats; X.march.components = X.frame.components;
        const n = X.nodes, e = X.edges;
        X.stats = Object.assign({}, X.stats, { components: A.stats.components, isolated: A.stats.isolated, maxDegree: A.stats.maxDegree,
            averageDegree: Number((2 * e / n).toPrecision(3)), density: Number((e / (n * (n - 1))).toPrecision(3)) });
        X.frame.components = A.stats.components;
    }
    AB.transfersReplaced = transfersReplaced;
    // A run's story on April data (inspector-run-row: rerunning, failed, out of date) has April loaded
    AB.replaceTransfers = replaceTransfers;
    // The transfers Data place the reader was last on: Replace keeps its filter steps
    let lastTransfers = "at-rest";

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
        // The hosts and Les Miserables have every row and edge: their steps work on node sets
        if (cfg.ds === "wide") { const rows = new Map(W().nodeRows.map((r) => [r.id, r])); return { all: new Set(rows.keys()), rows, total: rows.size, edges: W().edgeRows.map((e) => [e.source, e.target]) }; }
        if (cfg.ds === "lesmis") { const rows = new Map(L().rows.map((r) => [r.id, r])); return { all: new Set(rows.keys()), rows, total: rows.size, edges: L().edgeList }; }
        const total = nodeTotal(cfg);
        return { all: total, total };
    }
    // The project's graph, read from its edge rows (sp.edges, [source, target]): degree within a node set
    function degrees(S, sp) {
        const d = new Map();
        sp.edges.forEach(([a, b]) => { if (a !== b && S.has(a) && S.has(b)) { d.set(a, (d.get(a) || 0) + 1); d.set(b, (d.get(b) || 0) + 1); } });
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
    const degreeAtLeast = (k, full) => (S, sp) => { const d = degrees(full ? sp.all : S, sp); return new Set([...S].filter((id) => (d.get(id) || 0) >= k)); };
    // One pass over the steps: { per: id -> { before, after, full }, left, total }. An off step still
    // says what it would keep (its inspector shows it), but passes everything on.
    function run(cfg, steps) {
        const sp = space(cfg), per = new Map();
        let left = sp.all;
        steps.forEach((s) => {
            const b = s.keep ? s : builtKeep(s, sp);
            const live = !s.gone && b && b.keep;
            const next = live ? b.keep(left, sp) : left;
            const o = { before: size(left), after: size(next), kept: !!live, total: sp.total };
            if (live && b.fullKeep) o.full = size(b.fullKeep(left, sp));
            // Kept all of what it was given: would it have removed something from the full graph?
            if (live && o.after === o.before && o.before < sp.total) o.alone = size(b.keep(sp.all, sp));
            per.set(s.id, o);
            if (s.on && live) left = next;
        });
        return { per, left: size(left), total: sp.total, set: typeof left === "number" ? null : left };
    }
    // A step the reader builds keeps by what it holds: its typed rule, or a Keep kind that reads the
    // graph. Only the hosts have rows to read, so elsewhere a built step keeps everything.
    const CONDS = ["is at least", "is below", "is between", "is not empty", "is not", "is one of", "is empty", "is", "does not contain", "contains"];
    function parseRule(ds, name) {
        // degree: the computed value a step offers beside the attributes (the step's field list)
        const f = AB.fieldsOf(ds).flatMap((g) => g.fields).concat([{ name: "degree", type: "num" }]).sort((a, b) => b.name.length - a.name.length).find((x) => name.startsWith(x.name + " "));
        const rest = f ? name.slice(f.name.length + 1) : "";
        const cond = f && CONDS.find((c) => rest === c || rest.startsWith(c + " "));
        return cond ? { attr: f.name, type: f.type, cond, value: rest.slice(cond.length + 1) } : null;
    }
    function builtKeep(s, sp) {
        if (!sp.rows) return countKeep(s.rule);
        const k = +s.k || 2, top = +s.top || 10;
        if (s.kind === "kcore") return { keep: degreeAtLeast(k, false), fullKeep: degreeAtLeast(k, true) };
        if (s.kind === "top" && (s.by || RANK_BY[0]) === "degree") return { keep: (S, sp) => { const d = degrees(S, sp); return new Set([...S].sort((a, b) => (d.get(b) || 0) - (d.get(a) || 0)).slice(0, top)); } };
        const r = s.rule;
        if (!r || !r.attr) return null;
        const v = String(r.value || "").replace(/,/g, "").trim(), n = Number(v);
        if (r.cond === "is empty" || r.cond === "is not empty") { const want = r.cond === "is empty"; return { keep: where((x) => (x[r.attr] == null || x[r.attr] === "") === want) }; }
        if (!v) return null;
        if (r.attr === "degree" && r.cond === "is at least") return { keep: degreeAtLeast(n, false), fullKeep: degreeAtLeast(n, true) };
        const test = { "is at least": (x) => Number(x) >= n, "is below": (x) => Number(x) < n, is: (x) => String(x) === v, "is not": (x) => String(x) !== v,
            "is one of": (x) => v.split(/\s*;\s*|\s*\|\s*/).includes(String(x)), contains: (x) => [].concat(x).map(String).includes(v), "does not contain": (x) => ![].concat(x).map(String).includes(v) }[r.cond];
        return test ? { keep: where((x) => test(x[r.attr])) } : null;
    }
    // The transfers are held as counts, not rows: a typed rule keeps what the fixture counts for it (the
    // amount step's 812 accounts, the kind values, the accounts that are not merchants), else everything
    function countKeep(r) {
        if (!r || !r.attr || r.attr === "id (account)") return null;
        const v = String(r.value || "").replace(/,/g, "").trim();
        if (r.attr === "amount" && r.cond === "is at least" && Number(v) === 1000) return { keep: () => BIG };
        const at = T().attributes.find((a) => a.name === r.attr && a.values);
        if (!at || !(v in at.values)) return null;
        const whole = (fn) => ({ keep: (left, sp) => (left === sp.total ? fn() : left) }); // ponytail: counted on the whole graph only
        if (r.cond === "is") return whole(() => at.values[v]);
        if (r.cond === "is not") return whole(() => (r.attr === "kind" && v === "merchant" ? T().withoutMerchants.nodes : T().nodes - at.values[v]));
        return null;
    }
    // The inspector names a step by its rule as the reader types it; once the rule is whole, the step
    // keeps by it and the place, the chip and the step's own counts are drawn again
    ["change", "click", "keyup"].forEach((type) => document.addEventListener(type, (e) => {
        if (type === "keyup" && e.key !== "Enter") return;
        setTimeout(() => live && live.retyped && live.retyped(), 0);
    }));

    // The line under an applied step: a count always names what it counts. A step with no rule yet keeps
    // nothing of its own, so it has no line (not "Kept all")
    // A count that jumped says why beside it: what the reader just changed (jump), or, for a step that
    // keeps everything, that the steps above left it nothing to remove (o.alone: what it keeps on its own)
    function outcome(s, o, jump) {
        if (!s.on || s.gone || !o || !o.kept) return null;
        const why = jump ? `; was ${AB.num(jump.was)} until ${jump.cause}` : "";
        // A degree step after steps that removed something: both counts, in normal text (no scope switch)
        if (o.full != null && o.before < o.total) return `${AB.count(o.after, "node")} left; ${AB.num(o.full)} on the full graph` + why;
        if (o.after !== o.before) return AB.count(o.after, "node", { of: o.before }) + why;
        return `Kept all ${AB.count(o.before, "node")}` + (why || (o.alone != null && o.alone < o.total ? ": the steps above left nothing for it to remove" : ""));
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
        // Filters + on the just-loaded transfers (empty-filters): one blank step, nothing else
        if (cfg.steps === "new") return [{ id: "s1", name: "New step", on: true, isNew: true }];
        // The two-step states carry a note on this step; the one-step states (at rest, as a reader leaves a step just made) do not
        const amount = (on) => ({ id: "s1", name: "amount is at least 1,000", meaning: "Keeps the transfers of 1,000 or more and the accounts at their ends", on, notes: cfg.steps === "one" || cfg.steps === "one-off" ? null : 1, rule: AMOUNT_RULE(), keep: () => BIG, go: ["inspector-attribute-and-filter-step", "filter-step"] });
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
        if (cfg.steps === "lesmis-degree") {
            // Les Miserables' two degree steps (fixtures.json lesmis.filterSteps): the second counts degree
            // on what the first left, and its row says both counts
            const LF = L().filterSteps, k = (i) => +LF.steps[i].split(">= ")[1];
            const deg = (i, id, o) => Object.assign({ id, name: "Degree " + k(i) + " or more", on: true, computed: true,
                rule: { attr: "degree", type: "num", cond: "is at least", value: String(k(i)) }, keep: degreeAtLeast(k(i), false), fullKeep: degreeAtLeast(k(i), true) }, o);
            return [
                deg(0, "l1", { meaning: "Keeps the characters with " + k(0) + " or more connections" }),
                deg(1, "l2", { meaning: "Keeps the characters with " + k(1) + " or more connections among the characters the steps above left", go: ["inspector-attribute-and-filter-step", "computed-step"] }),
            ].map((x, i) => (i ? Object.assign(x, { rule: Object.assign(x.rule, { before: LF.after.step1, after: LF.after.step2 }) }) : x));
        }
        if (cfg.steps === "one") return [amount(true)];
        // The project at rest: the amount step is listed but not applied, so nothing says a filter is on
        if (cfg.steps === "one-off") return [amount(false)];
        if (cfg.steps === "gone") return [
            // The step was made on the old file's amount_usd; the replacing file names that column amount
            { id: "s1", name: "amount_usd is at least 1,000", meaning: "Would keep the transfers of 1,000 or more in amount_usd; skipped while that column is missing", on: true, notes: 1, gone: "amount_usd", go: ["inspector-attribute-and-filter-step", "step-attribute-gone"] },
            kind(),
        ];
        return [amount(cfg.steps !== "undone"), kind()];
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
    // The one status line after an undo or a redo of a step, in the shell's notice slot (role status,
    // so it is announced politely and focus stays put): "Undone: <step>. Show in steps". It carries no
    // command of its own: Redo (the header's, or Ctrl+Shift+Z) is the only way back. Undos made while
    // it shows join it ("Undone: A and B"). stepLine: { el, undo, names }.
    let stepLine = null;
    function showInSteps(id) {
        const sec = document.getElementById("dp-filters");
        if (!sec) return;
        if (sec.hasAttribute("data-collapsed")) sec.querySelector(".ab-sec-toggle").click();
        const li = sec.querySelector(`[data-row="${CSS.escape(id)}"]`);
        if (!li) return;
        li.closest(".ab-tree").querySelectorAll(".ab-trow").forEach((x) => (x.tabIndex = x === li ? 0 : -1));
        li.scrollIntoView({ block: "nearest" });
        li.focus();
    }
    function stepNotice(names, undo, id) {
        const show = h("span", Object.assign({ class: "dp-show", role: "link" }, AB.act({ onClick: () => showInSteps(id) })), "Show in steps");
        const text = h("span", null, (undo ? "Undone: " : "Redone: ") + names.join(" and ") + ". ", show);
        AB.notice(text);
        stepLine = { el: document.querySelector("#ab-notice .ab-notice"), undo, names };
    }
    // True while the place draws a step's inspector in its own render pass (no second render)
    let drawingPlace = false;
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
                { id: "hosts", kind: "node", name: w.file, quiet: `host . ${AB.count(w.nodes, "node")}`, go: ["data-page", "edit-wide-hosts"], edit: ["data-page", "edit-wide-hosts"] },
                { id: "connections", kind: "edge", name: w.edgesFile, quiet: edgeLine("connections", w.edges, w.edges), go: ["data-page", "edit-wide-connections"], edit: ["data-page", "edit-wide-connections"] },
            ];
        }
        if (cfg.ds === "nested") {
            // The tables the last Load made (AB.nestedLoaded: the reader's choices on the Data page)
            const d = N(), ra = d.recordArrays, NL = AB.nestedLoaded(), ed = (id) => ["data-page", "edit-json-" + id], go = ed("researchers");
            const cnt = (p) => (d.paths.find((q) => q.path === p) || {}).count || 0;
            const addr = NL.researchers && NL.addr === "rows" ? cnt("data.researchers[].attributes.profile.contact.addresses[]") : 0;
            const nodes = (NL.researchers ? ra["data.researchers[]"] : 0) + (NL.institutions ? ra["data.institutions[]"] : 0) + addr;
            const dv = d.derived, co = NL.coPer === "item" ? dv.coauthorItems : dv.coauthorPairs;
            // links' targets are researchers (118) and institutions (42): with institutions not loaded, only the first make edges
            const linkEdges = NL.institutions === false ? dv.linksToResearchers : ra["links[]"];
            return [{ id: "json", kind: "file", name: d.file, quiet: `${AB.count(nodes, "node")}, ${AB.count((AB.projectCounts("nested") || { edges: 0 }).edges, "edge")} from ${AB.count([NL.researchers, NL.researchers && NL.aff === "rows", addr, NL.institutions, NL.links].filter(Boolean).length, "table")}`, go, edit: go, open: true,
                children: [
                    NL.researchers && { id: "json-researchers", kind: "node", name: "researchers", quiet: `researcher . ${AB.count(ra["data.researchers[]"], "node")}` + (NL.co === "edges" ? `; coauthor . ${AB.count(co, "edge")}` : "") + (NL.idLinks || []).map((x) => `; ${x.name} . ${AB.count(x.n, "edge")}`).join(""), go, edit: go, drop: { researchers: false } },
                    NL.researchers && NL.aff === "rows" && { id: "json-affiliations", kind: "edge", name: "affiliations", quiet: `affiliations . ${AB.count(dv.affiliations, "row")}, ${AB.count(NL.institutions ? dv.affiliations : 0, "edge")}`, go: ed("affiliations"), edit: ed("affiliations"), drop: { aff: "one" } },
                    addr && { id: "json-addresses", kind: "node", name: "addresses", quiet: `address . ${AB.count(addr, "node")}`, go: ed("addresses"), edit: ed("addresses"), drop: { addr: "one" } },
                    NL.institutions && { id: "json-institutions", kind: "node", name: "institutions", quiet: `institution . ${AB.count(ra["data.institutions[]"], "node")}`, go: ed("institutions"), edit: ed("institutions"), drop: { institutions: false } },
                    NL.links && { id: "json-links", kind: "edge", name: "links", quiet: `links . ${AB.count(ra["links[]"], "row")}, ${AB.count(linkEdges, "edge")}`, go: ed("links"), edit: ed("links"), drop: { links: false } },
                ].filter(Boolean) }];
        }
        if (cfg.ds === "plainJson") {
            const d = P(), go = ["data-page", "edit-plain-nodes"];
            return [{ id: "json", kind: "file", name: d.file, quiet: `${AB.count(d.nodes, "node")}, ${AB.count(d.edges, "edge")}`, go, edit: go, open: true,
                children: [
                    { id: "json-nodes", kind: "node", name: "nodes", quiet: `node . ${AB.count(d.nodes, "node")}`, go, noMenu: true },
                    { id: "json-links", kind: "edge", name: "links", quiet: edgeLine("links", d.edges, d.edges), go: ["data-page", "edit-plain-links"], noMenu: true },
                ] }];
        }
        if (cfg.ds === "registry") {
            const R = AB.fx.datasets.registry, go = ["data-page", "edit-registry"];
            return [{ id: "json", kind: "file", name: R.file, quiet: `${AB.count(R.nodes, "node")}, ${AB.count(R.edges, "edge")}`, go, edit: go, open: true,
                children: [{ id: "json-packages", kind: "node", name: "packages", quiet: `package . ${AB.count(R.nodes, "node")}` + (R.edges ? `; dependencies . ${AB.count(R.edges, "edge")}` : ""), go, noMenu: true }] }];
        }
        if (cfg.ds === "door") {
            const d = D(), r = d.report, tbl = (name) => d.tables.find((x) => x.name === name);
            const e = r.entries;
            return [
                { id: "people", kind: "node", name: tbl("people").file, quiet: `person . ${AB.count(D().loadedTypes().person, "node")}` + (D().loadedTypes().added.person ? ` (${AB.num(r.people.rows)} + ${D().loadedTypes().added.person} added)` : ""), go: ["data-page", "edit-people"], edit: ["data-page", "edit-people"] },
                { id: "buildings", kind: "node", name: tbl("buildings").file, quiet: `building . ${AB.count(r.buildings.rows, "node")}`, go: ["data-page", "edit-buildings"], edit: ["data-page", "edit-buildings"] },
                { id: "entries", kind: D().loaded.per === "nodes" ? "node" : "edge", name: tbl("entries").file, quiet: D().loaded.per === "nodes" ? `entry . ${AB.count(e.rows, "node")}, ${AB.count(D().loadedEdges(), "link edge")}` : edgeLine("entries", e.rows, D().loadedEdges(), D().loaded.per), go: ["data-page", "edit-entries"], edit: ["data-page", "edit-entries"],
                    // The first line of the element's match report for this table: its tooltip, not a warning.
                    // Leave out resolved both unmatched lines, so the status matches the Data page's green check.
                    info: `${AB.count(e.rows, "row")}; ${AB.num(e.bothEnds)} have both ends. ${e.missingPeople} person_id values are not in people and ${e.missingBuildings} building_id values are not in buildings: left out (${e.missingRows} rows).` },
            ];
        }
        if (cfg.ds === "lesmis") {
            const l = L();
            return [{ id: "gexf", kind: "file", name: GEXF, quiet: `${AB.count(l.nodes, "node")}, ${AB.count(l.edges, "edge")}`, go: ["data-page", "edit-graph-file"], edit: ["data-page", "edit-graph-file"], open: true,
                children: [
                    { id: "gexf-nodes", kind: "node", name: "nodes", quiet: `node . ${AB.count(l.nodes, "node")}`, go: ["data-page", "edit-graph-file"], noMenu: true },
                    { id: "gexf-edges", kind: "edge", name: "edges", quiet: edgeLine("edges", l.edges, l.edges), go: ["data-page", "edit-graph-file"], noMenu: true },
                ] }];
        }
        const t = T();
        // After Replace: a number that changed says what it was, and the replay's report follows on its
        // own lines -- the new single-node groups apart from the real ones, so a jump in a count is explained
        const was = cfg.april && t.march && t.march.edges !== t.edges ? t.march.edges : null;
        const A = TA(), Z = A.dormant;
        const rows = [
            { id: "accounts", kind: "node", name: cfg.longName ? LONG_NAME : t.accountsFile, quiet: `account . ${AB.count(t.nodes, "node")}`, go: ["data-page", "edit-accounts"], edit: ["data-page", "edit-accounts"] },
            { id: "transfers", kind: "edge", name: t.file, quiet: was == null ? edgeLine("transfers", t.edges, t.edges) : `transfers . ${AB.count(t.edges, "row")}, was ${AB.num(was)}; one edge per row`, go: ["data-page", cfg.afterReplace ? "replace" : "edit-source"], edit: ["data-page", "edit-source"],
                info: cfg.afterReplace ? "Replaced Sep 30 with " + t.file : null,
                report: cfg.april ? [
                    `${AB.count(A.stats.components, "component")}, was ${AB.num(((t.march || {}).stats || t.stats).components)}`,
                    `${AB.count(Z.singletonCommunities, "new single-node group")}: accounts with no transfers in April, each a group of its own`,
                ] : null,
                // The runs made on March's transfers say so where the file changed
                problem: cfg.april ? { level: "partial", what: "Louvain and the other runs used March's transfers. They show March's results until you rerun them.", action: { label: "Open Louvain", onClick: () => AB.go("inspector-run-row", "data-changed") } } : null },
        ];
        if (cfg.url) {
            const flagged = t.attributes.find((a) => a.name === "flagged").values.true;
            rows.push({ id: "url", kind: "node", url: true, name: URL_NAME, quiet: `account . ${AB.count(flagged, "row")}`, go: ["data-page", "url"],
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
            quiet(li, `${AB.count(w.nodes, "node")}, ${AB.count(w.edges, "edge")}, Sep 28`);
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
                // Appending acts on one table, so its door is on the table's row; the page is headed "Add to <table>".
                // The skeleton draws that page for the March transfers only (data-page add-rows).
                { label: "Add rows from file...", desc: "More rows of the same table, kept with the rows already loaded",
                    onClick: () => (s.id === "transfers" ? AB.go("data-page", "add-rows") : AB.flash("Add to " + s.name)) },
                AB.cmd("edit-source", { go: s.edit || (s.go[1] === "url" ? ["data-page", "url"] : AB.cmd("edit-source").go) }),
                // Refresh only for an address: a file has nothing to read again (Replace with file... picks it anew), as context-menus/source says
                s.url ? { label: "Refresh", desc: "Reads the address again; the graph is untouched if it fails", onClick: () => AB.go("data-place", "refreshing") } : null,
                { sep: true },
                s.drop ? { label: "Remove", shortcut: "Del", desc: "Stops loading this table from the file; Edit source can bring it back", onClick: () => removeBuilt(s) }
                    : { label: "Remove", shortcut: "Del", needs: "graphty-element does not record which table each node and edge came from, so one table cannot be removed on its own; Clear graph data is in the graph's menu" },
            ].filter(Boolean));
        };
        all.forEach((s) => {
            const li = rowEl(ul, s.id);
            if (!li) return;
            // a source's line wraps: its last words say how rows became edges
            quiet(li, s.quiet, false, true);
            if (s.report) moreLines(li, s.report);
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
        // The project's own example files come first: the one each project's file that will not read opens on its refusal
        const ds = DATASET[cfg.ds] || "transactions";
        const OWN_FILE = { transactions: ["transfers-bank-export.csv", "refused-parse"], doorEntries: ["Untitled.csv", "refused-empty"], lesmis: ["miserables-edited.graphml", "refused-ids"], nested: [N().file, "json-invalid"] }[cfg.ds === "none" ? null : ds]; // a new project has no files of its own yet
        const pickFile = lastPick = () => AB.openMenu(plus, [
            { heading: "Choose a file" },
            OWN_FILE && { label: "Data file: " + OWN_FILE[0], desc: "Opens the Data page with the new table added", onClick: () => AB.go("data-page", OWN_FILE[1]) },
            { label: "Data file: CSV, JSON, GEXF or GraphML", desc: "Opens the Data page with the new table added", onClick: () => AB.go("data-page", "edge-list") },
            ...(ds === "wide" ? [{ label: "Recipe: estate-exposure-review.graphty", desc: "A recipe opens Apply file", onClick: () => AB.go("recipe-apply", "wide-mismatch") }] : [
                { label: "Recipe: mule-ring-triage.graphty", desc: "A recipe opens Apply file", onClick: () => AB.go("recipe-apply", "binding") },
                { label: "Style file: risk-review-look.json", desc: "A style file opens Apply file", onClick: () => AB.go("recipe-apply", "style-unbound") }]),
        ].filter(Boolean));
        // Paste and From a URL open on the project on screen: its own paste or address state when the
        // Data page has one, else the item says it is not offered here
        const hasState = (st) => ((AB.sections["data-page"] || {}).states || []).some((x) => (x.id || x) === st);
        const doorTo = (states) => states.find(hasState) || null;
        const pasteTo = doorTo(["paste-" + ds].concat(ds === "lesmis" ? ["detect-several"] : []));
        const urlTo = doorTo(["url-empty-" + ds, "url-empty"]);
        const plus = AB.plus({
            // The door says what the page it opens is headed
            label: "Add to " + graphName(cfg),
            items: [
                { label: "File...", desc: "A data file, a recipe or a style file", pick: true },
                // no state of its own: the project's own Data page, with the paste or address table added there (AB.pendingAdd)
                { label: "From a URL...", to: urlTo ? ["data-page", urlTo] : (EDIT_ON[ds] || ["data-page", "edit-source"]), add: urlTo ? null : "url" },
                { label: "Paste...", to: pasteTo ? ["data-page", pasteTo] : (EDIT_ON[ds] || ["data-page", "edit-source"]), add: pasteTo ? null : "paste" },
                { label: "Set collection...", desc: "Lands as a folder of sets in the Graph tree", to: ["data-page", "edge-list"] },
            ],
            onAdd: (it) => { if (it.pick) return setTimeout(pickFile, 0); AB.pendingAdd = it.add || null; AB.go(it.to[0], it.to[1]); },
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
            // Another step on the step inspector already on screen: the address does not change, so draw it
            const was = location.hash;
            AB.openStep(o2);
            if (location.hash === was && !drawingPlace) { AB.keepLeft = false; AB.render(); }
        };
        model.open = open;
        // One linear undo log: turning a step on or off, and adding one, are entries; a new entry clears Redo
        const record = (s, was, now) => { log.past.push({ s, was, now }); log.future.length = 0; };
        // Every change that can move another step's count: the counts it moved remember what they were and why
        // (moved: the steps the change acts on, whose own counts need no cause)
        const changing = (moved, cause, fn) => {
            const before = run(cfg, steps).per;
            fn();
            const c = typeof cause === "function" ? cause() : cause;
            model.jumps = new Map();
            run(cfg, steps).per.forEach((o, id) => {
                const b = before.get(id);
                if (!moved.some((m) => m.id === id) && b && b.kept && o.kept && b.after !== o.after) model.jumps.set(id, { was: b.after, cause: c });
            });
        };
        const turned = (s) => s.name + (s.on ? " was applied" : " was turned off");
        // Undo or Redo of one entry: the step stays listed either way (only Delete removes it); one line says what changed
        const step = (undo) => {
            const from = undo ? log.past : log.future, to = undo ? log.future : log.past;
            const es = from.slice(-1);
            if (!es.length) return false;
            // A second undo while the first one's line still shows: the line names both steps
            const named = stepLine && stepLine.undo === undo && stepLine.el && stepLine.el.isConnected ? stepLine.names : [];
            const last = es[es.length - 1].s;
            changing(es.map((e) => e.s), () => turned(last), () => es.forEach((e) => { from.pop(); to.push(e); e.s.on = undo ? e.was : e.now; }));
            // one polite status line naming the steps; focus stays where it was
            sync(last, false, () => stepNotice(named.concat(es.map((e) => e.s.name)), undo, last.id));
            return true;
        };
        live = { state: cfg.state, step };
        live.retyped = () => {
            const s = steps.find((x) => x.id === model.selected);
            if (!s || !s.isNew || s.name === s.seen || String((AB.route && AB.route.frame.left) || "") !== "data-place/" + cfg.state) return;
            if (!s.kind || s.kind === "value") {
                const r = parseRule(ds, s.name);
                if (!r || !(r.value || /empty$/.test(r.cond))) return;
                s.rule = r;
            }
            s.seen = s.name;
            sync(s, false);
        };
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
        const summary = steps.length ? `${AB.count(steps.length, "step")}, ${on} on` : "No filters";
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
            changing([s], s.name + " moved " + (d < 0 ? "up" : "down"), () => { steps.splice(i, 1); steps.splice(j, 0, s); });
            AB.announce("Moved " + s.name + (d < 0 ? " up" : " down"));
            sync(null);
            focusRow(s.id);
        };
        const forget = (s) => [log.past, log.future].forEach((l) => { for (let i = l.length - 1; i >= 0; i--) if (l[i].s === s) l.splice(i, 1); });
        const del = (s) => {
            const i = steps.indexOf(s);
            changing([s], s.name + " was deleted", () => steps.splice(i, 1));
            forget(s);
            const near = (steps[Math.min(i, steps.length - 1)] || {}).id;
            sync(null);
            focusRow(near);
            AB.deleted(s.name, () => { steps.splice(i, 0, s); sync(null); focusRow(s.id); });
        };
        const flip = (s) => {
            const was = s.on;
            changing([s], () => turned(s), () => (s.on = !s.on));
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
            const jump = model.jumps && model.jumps.get(s.id);
            const line = outcome(s, res.per.get(s.id), jump);
            // a line that carries its cause wraps rather than hide it behind an ellipsis
            if (line) quiet(li, line, / on the full graph/.test(line), !!jump || /: /.test(line));
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
    // The list is the field list at panel size (spec 2.5), over the project on screen: grouped by node
    // type and then by edge table, each a plain subhead (one node type: plain Nodes and Edges); with two
    // or more types each group starts with the built-in type attribute; then computed first (the run
    // icon), then by name. A row ends in its fill when not every element has a value, the run icon,
    // and its role tags (what uses it). Folders only from the data's nesting; Find past 15. Its rows are
    // fieldsOf()'s, the stand-in for graphty-element's session.data.attributes().
    // ponytail: the field list groups by table under "In use" and takes no groups of its own, so this
    // place hands it its fields regrouped as a dataset of their own (the node inspector's ownDataset
    // pattern), usedBy moved into the role tags; a `groups` option on AB.fieldList would replace this.
    const TYPE_OF = { people: "person", buildings: "building", researchers: "researcher", institutions: "institution", addresses: "address", accounts: "account", hosts: "host", packages: "package" };
    const TYPE_FIELD = { name: "type", label: "type", parent: null, type: "cat", fill: null, usedBy: null, computed: false, builtin: true };
    // The glyph's word, as the attribute inspector's Read as says it
    const READ_AS_WORD = { num: "Number", time: "Time", bool: "Category (true or false)", list: "A list", whole: "One value (kept whole)" };
    // ponytail: fieldsOf() gives the transfers no fill; the accounts fixture says alertRule and alertTime
    // are "empty on accounts with no alert", so their fill is the alerted accounts' share. Belongs in
    // lib.js fieldsOf (every field list would then show it); drop this when it moves there.
    function fillOf(ds, x) {
        if (x.fill != null || ds !== "transactions") return x.fill;
        const T0 = T(), a = T0.attributes.find((y) => y.name === x.name);
        if (!a || !/empty on accounts with no alert/.test(a.note || "")) return null;
        const rule = T0.attributes.find((y) => y.name === "alertRule");
        return Object.values(rule.values).reduce((s, v) => s + v, 0) / T0.nodes;
    }
    function placeFields(ds) {
        const groups = AB.fieldsOf(ds), nodeGroups = groups.filter((g) => g.element === "node");
        const typed = nodeGroups.length > 1;
        const roles = new Map(), computed = new Set();
        const out = [];
        groups.forEach((g) => {
            g.fields.forEach((x) => { if (x.usedBy) roles.set(x.name, x.usedBy); if (x.computed) computed.add(x.name); });
            let fields = g.fields.map((x) => Object.assign({}, x, { usedBy: null, fill: fillOf(ds, x) }));
            const head = typed ? (g.element === "node" ? TYPE_OF[g.table] || g.table : g.table) : g.element === "node" ? "Nodes" : "Edges";
            // the type attribute leads its group: a group of its own under the subhead, the rest after it
            // unheaded. A table that stores its own type column (the nested records) leads with that one.
            const ownType = fields.find((x) => x.name === "type" && !x.parent);
            if (ownType) fields = fields.filter((x) => x !== ownType);
            if (typed) out.push({ table: head, element: g.element, fields: [ownType || TYPE_FIELD] }, { table: null, element: g.element, fields });
            else out.push({ table: head, element: g.element, fields });
        });
        const key = "data-place:" + ds;
        const D = AB.fx.datasets[key] || (AB.fx.datasets[key] = {});
        Object.defineProperty(D, "_fields", { value: out, enumerable: false, configurable: true });
        return { key, roles, computed };
    }
    const EDIT_ON = { doorEntries: ["data-page", "edit-entries"], lesmis: ["data-page", "edit-graph-file"], wide: ["data-page", "edit-wide-hosts"], nested: ["data-page", "edit-json-researchers"], plainJson: ["data-page", "edit-plain-nodes"], registry: ["data-page", "edit-registry"] };
    const TABLE = { doorEntries: ["door-entries-nodes", "door-entries"], wide: ["wide", "wide"], nested: ["wide", "wide"], plainJson: ["wide", "wide"] };
    function attributes(cfg) {
        const ds = DATASET[cfg.ds] || "transactions";
        const editOn = EDIT_ON[ds] || ["data-page", "edit-source"];
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
        const own = placeFields(ds);
        // Studio decision: the row's tags are its roles (Key, Name, Time, Weight, From, To...); a filter
        // step reading the attribute is a mark, like the run mark, not a tag -- a tag that long was cut
        // to "Fil" beside Weight in the 240 px panel.
        const trail = (x) => {
            const all = (own.roles.get(x.name) || "").split(", ").filter(Boolean);
            const stepped = all.includes("Filter step"), tags = all.filter((t) => t !== "Filter step");
            if (!tags.length && !stepped && !own.computed.has(x.name) && !x.builtin) return null;
            const mark = (ic, label) => AB.tip(h("span", { class: "dp-mark", role: "img", "aria-label": label }, icon(ic, "sm")), label, { label: false });
            return AB.tip(h("span", { class: "dp-tags" },
                own.computed.has(x.name) ? mark(AB.ICON.run, "Computed by a run") : null,
                stepped ? mark(AB.ICON.filter, "Read by a filter step") : null,
                x.builtin ? AB.roleTag("Built in", { second: "graphty-element sets each element's type on load" }) : null,
                // a Name joined from several columns ("Name: given + family") tags as Name; the tooltip says the rest
                tags.map((t) => (/^Name: /.test(t) ? AB.roleTag("Name", { second: "joined from " + t.slice(6) }) : AB.roleTag(t, { second: "what uses this attribute" })))),
            [own.computed.has(x.name) ? "Computed by a run" : null, stepped ? "Read by a filter step" : null, x.builtin ? "Built in" : null].concat(tags).filter(Boolean).join(", "), { label: false });
        };
        const list = AB.fieldList({
            size: "panel", dataset: own.key, label: "Attributes", current: cfg.select || null, query: cfg.query || undefined, results: false, trail,
            onPick(name, type, f) { if (f.builtin) return AB.flash("Opens the type attribute: each element's node type or edge table"); AB.openField(ds, f.name); },
        });
        // ponytail: two field-list behaviors the spec asks of this list that AB.fieldList does not draw
        // yet, applied after each of its draws; both belong in lib.js's fieldList (shell), then this goes:
        // the type glyph's tooltip "Read as: Number", and a nested folder's subhead named by its full
        // stored path ("attributes.profile.contact"), flat, not one indented segment per level.
        const fields = AB.fx.datasets[own.key]._fields.flatMap((g) => g.fields);
        const typeOf = new Map(fields.map((x) => [x.name, x.type]));
        const listbox = list.querySelector(".ab-fl-list");
        const decorate = () => {
            listbox.querySelectorAll(".ab-fl-opt").forEach((row) => {
                const g = row.querySelector(".ab-fl-glyph"), t = typeOf.get((row.getAttribute("aria-label") || "").split(",")[0]);
                if (g && t && !g.dataset.tip) AB.tip(g, "Read as: " + (READ_AS_WORD[t] || "Category"), { label: false });
            });
            listbox.querySelectorAll(".ab-fl-folder").forEach((head) => {
                const path = (head.getAttribute("aria-label") || "").replace(/, \d+ attributes?(, collapsed)?$/, "");
                const col = head.querySelector(".k-check-col"), name = head.querySelector(".ab-fl-name");
                if (!path.includes(".") || !name || name.dataset.full) return;
                if (col) col.style.marginInlineStart = "";
                name.replaceChildren(AB.truncMiddle(path, 30));
                name.dataset.full = "";
            });
        };
        // A folder starts open when one of its own attributes has a role (fieldList opens only on usedBy,
        // which this list moves into the tags); opened while the list is off screen, so nothing scrolls
        // Two tables can share a folder path (each node type has its own "attributes"), so a folder is found
        // under its own table's subhead; a group with no subhead continues the one above it
        const toOpen = [];
        AB.fx.datasets[own.key]._fields.forEach((g) => {
            if (g.table) toOpen.push({ table: g.table, paths: new Set() });
            g.fields.forEach((x) => { if (x.parent && own.roles.has(x.name)) toOpen[toOpen.length - 1].paths.add(x.parent); });
        });
        toOpen.forEach((t, ti) => t.paths.forEach((p) => {
            let at = -1;
            const head = [...listbox.children].find((el) => {
                if (el.matches(".ab-fl-table")) at++;
                return at === ti && el.matches(".ab-fl-folder[data-open=\"false\"]") && (el.getAttribute("aria-label") || "").startsWith(p + ", ");
            });
            if (head) head.click();
        }));
        decorate();
        new MutationObserver(decorate).observe(listbox, { childList: true });
        // The row menu: right-click, Shift+F10 or the Menu key on the active row
        const nameOf = (row) => row && row.matches(".ab-fl-opt") ? (row.getAttribute("aria-label") || "").split(",")[0] : null;
        const openFor = (row) => { const name = nameOf(row); if (name && AB.fieldIn(ds, name)[0]) menuFor(name, row); };
        list.addEventListener("contextmenu", (e) => { const row = e.target.closest(".ab-fl-opt"); if (row) { e.preventDefault(); openFor(row); } });
        list.addEventListener("keydown", (e) => { if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") { e.preventDefault(); e.stopPropagation(); openFor(list.querySelector("[data-fl-row][data-hover]")); } }, true);
        const total = AB.fx.datasets[own.key]._fields.reduce((a, g) => a + g.fields.length, 0);
        const sec = AB.section(head(AB.count(total, "attribute")), list);
        sec.id = "dp-attributes";
        return sec;
    }

    // ---------- the place ----------
    const graphName = (cfg) => cfg.ds === "door" ? D().graphName : cfg.ds === "lesmis" ? L().title : cfg.ds === "none" ? "Graph"
        : cfg.ds === "wide" ? W().graphName : cfg.ds === "nested" ? N().graphName : cfg.ds === "plainJson" ? P().graphName : cfg.ds === "registry" ? AB.fx.datasets.registry.graphName
            : cfg.derived ? T().graphName + " without merchants" : T().graphName;
    function build(region, cfg, model) {
        const el = h("div", { class: "dp" });
        region.replaceChildren(el);
        // Data goes out from the same place it comes in: the Export dialog at its Data tab
        const ex = AB.cmd("export");
        const exportBtn = AB.iconButton("download", ex.label, cfg.ds === "none" ? { key: ex.shortcut, disabled: "Nothing to export: add data first" } : { key: ex.shortcut, go: ["export-dialog", "data"] });
        el.append(AB.graphHead("Data", graphName(cfg), { trail: exportBtn }));
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
        "at-rest": { steps: "one-off" },
        filters: { steps: "two", selectStep: "s1", kindOn: true },
        "undo-notice": { steps: "undone", undoNotice: true },
        attributes: { steps: "two", select: "amount", scrollTo: "dp-attributes" },
        "door-entries": { ds: "door", steps: "none" },
        "graph-file": { ds: "lesmis", steps: "none" },
        "lesmis-filters": { ds: "lesmis", steps: "lesmis-degree", selectStep: "l2", scrollTo: "dp-filters" },
        "url-source": { steps: "two", select: "url", url: true },
        "url-changed": { steps: "two", select: "url", url: true, urlChanged: true },
        derived: { steps: "none", derived: true },
        "after-replace": { steps: "kept", select: "transfers", afterReplace: true, april: true },
        "new-step": { steps: "new", selectStep: "s1", fresh: true }, // what Add filter step on empty-filters makes
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
        "lesmis-filters": "inspector-attribute-and-filter-step/computed-step",
    };
    const DATASET = { door: "doorEntries", lesmis: "lesmis", none: "lesmis", wide: "wide", nested: "nested", plainJson: "plainJson", registry: "registry" };
    const cfgOf = (state) => Object.assign({ state: CFG[state] ? state : "at-rest" }, CFG[state] || CFG["at-rest"]);
    // After Replace the steps are the ones the reader had: the transfers Data place they came from
    const modelOf = (cfg) => (cfg.steps === "kept" ? modelOf(cfgOf(lastTransfers)) : kept[cfg.state] || (kept[cfg.state] = modelFor(cfg)));
    // What the steps that apply leave, for the header's filter chip: the same result the rows show
    function chipOf(cfg) {
        const m = modelOf(cfg);
        if (!m.steps.length) return "Full graph";
        const r = run(cfg, m.steps);
        return r.left < r.total ? AB.count(r.left, "node", { of: r.total }) : "Full graph";
    }

    // The attributes each step list reads, on or off (initialSteps); the field list tags them "Filter step".
    // amount_usd is gone after Replace, so only kind remains.
    const STEP_ATTRS = { two: ["amount", "kind"], undone: ["amount", "kind"], one: ["amount"], "one-off": ["amount"], gone: ["kind"], wide: ["environment", VULN], "wide-computed": ["environment", VULN], "lesmis-degree": ["degree"] };

    registerSection({
        id: "data-place",
        title: "Data place",
        region: "left",
        rail: "data",
        // The header's filter chip says what the steps that apply leave
        frame(state) {
            state = state.replace(CHOOSE, "");
            const c = cfgOf(state);
            if (c.april) replaceTransfers();
            // the just-loaded transfers (no runs yet): the rail's Graph opens their own tree, not the analyzed one
            if (c.fresh) T().fresh = true;
            if (c.ds === "registry") AB.registryDataset();
            const attrs = modelOf(c).steps.map((s) => s.rule && s.rule.attr).filter(Boolean);
            const f = { dataset: DATASET[c.ds] || "transactions", chip: chipOf(c), filterOn: STEP_ATTRS[c.steps] || (attrs.length ? attrs : null) };
            // The hosts have every row: the canvas draws only the hosts the steps that apply leave (frame.keep)
            if (c.ds === "wide" && modelOf(c).steps.length) { const r = run(c, modelOf(c).steps); if (r.set && r.left < r.total) f.keep = r.set; }
            if (RIGHT[state]) f.right = RIGHT[state];
            // The filter is the project's, not this panel's: every place on this project shows it (app.js reads AB.projectFilter)
            if (f.dataset !== "lesmis") (AB.projectFilter = AB.projectFilter || {})[f.dataset] = { chip: f.chip, filterOn: f.filterOn, keep: f.keep || null };
            // A new project: nothing loaded, nothing drawn
            if (c.ds === "none") Object.assign(f, { right: "inspector-nothing-selected/empty-graph", canvas: "canvas-and-states/empty", dock: false });
            return f;
        },
        states: [
            { id: "at-rest", label: "Accounts and transfers, the amount step off" },
            { id: "filters", label: "A filter step selected" },
            { id: "undo-notice", label: "After undoing a step" },
            { id: "attributes", label: "An attribute selected" },
            { id: "door-entries", label: "Door entries: three tables, grouped attributes" },
            { id: "graph-file", label: "A GEXF file: one row, two tables" },
            { id: "lesmis-filters", label: "Les Miserables: a degree step after another, both counts" },
            { id: "url-source", label: "A URL source selected" },
            { id: "url-changed", label: "The URL's data changed" },
            { id: "derived", label: "A derived graph: origin line" },
            { id: "after-replace", label: "After Replace: April's transfers, runs out of date" },
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
            const choose = CHOOSE.test(state);
            state = state.replace(CHOOSE, "");
            if (choose) requestAnimationFrame(() => requestAnimationFrame(() => { if (lastPick) lastPick(); }));
            const cfg = cfgOf(state);
            if (!cfg.april && !cfg.ds && !cfg.derived) lastTransfers = cfg.state;
            const model = modelOf(cfg);
            build(el, cfg, model);
            // A direct visit draws the step inspector beside this place in the same pass, the left
            // panel first: hand it the selected new step (Keep first) without navigating away
            const sel = model.steps.find((x) => x.id === model.selected);
            if (sel && sel.isNew && model.open && AB.route && AB.route.id === "data-place" && AB.route.frame.right === RIGHT[state]) {
                const go = AB.go;
                AB.go = () => {};
                drawingPlace = true;
                try { model.open(sel); } finally { AB.go = go; AB.keepLeft = false; drawingPlace = false; }
            }
            if (pendingFilter) { const p = pendingFilter; pendingFilter = null; setTimeout(() => AB.filterToHere && AB.filterToHere(p.ds, p.name), 0); }
            // A search on screen says its count, as typing it would
            if (cfg.query) setTimeout(() => { const c = el.querySelector(".ab-fl-count"); AB.announce(c && c.textContent ? c.textContent : 'No match for "' + cfg.query + '"'); }, 0);
            // After undoing the step just added: the notice names it, and its Redo is the header's Redo
            if (cfg.undoNotice && model.log.future.length) { const e = model.log.future[model.log.future.length - 1]; setTimeout(() => stepNotice([e.s.name], true, e.s.id), 0); }
        },
    });
})();
