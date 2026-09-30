/* Load step: the one dialog behind every data door (Open, drop, paste, connect, Add data, Replace
   data, Add a table, Join, Update with new data, Re-map columns). Opening a project or a sample
   never passes it. Plain ASCII. Transfers data from kit/fixtures.json; the five sample rows are the
   gallery's (screens/load-transfers.html). This file injects its own styles (ls-*). */
(function () {
    "use strict";
    const css = `
.ls-modal { width: 1040px; max-width: calc(100vw - 32px); height: calc(100vh - 96px); max-height: 760px; }
.ls-modal > .k-modal-body { flex: 1 1 auto; min-height: 0; padding: 0; display: flex; flex-direction: column; overflow: hidden; }
.ls-door { display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 4px 16px; border-bottom: 1px solid var(--cm-border); background: var(--cm-bg-secondary); flex: none; flex-wrap: wrap; }
.ls-door .k-i { color: var(--cm-text-secondary); }
.ls-cols2 { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 420px minmax(0, 1fr); }
.ls-col { overflow: auto; padding: 4px 0 12px; min-width: 0; }
.ls-col + .ls-col { border-inline-start: 1px solid var(--cm-border); }
.ls-sh { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 16px; font-weight: 550; margin-top: 4px; }
.ls-sh .k-count { font-weight: 450; color: var(--cm-text-secondary); }
.ls-set { display: grid; grid-template-columns: 116px minmax(0, 1fr); gap: 4px 8px; align-items: center; padding: 0 16px; }
.ls-set > .ls-lg { color: var(--cm-text-secondary); min-height: 32px; display: flex; align-items: center; gap: 4px; }
.ls-set .k-field { width: 100%; box-sizing: border-box; }
.ls-set .ls-sub { grid-column: 2; color: var(--cm-text-secondary); font-size: 11px; line-height: 14px; margin-top: -2px; }
.ls-colgrid { display: grid; grid-template-columns: 28px minmax(0, 1fr) 128px 104px; gap: 4px 6px; align-items: center; padding: 0 16px; }
.ls-colgrid .k-caption { color: var(--cm-text-secondary); height: 20px; display: flex; align-items: end; }
.ls-colgrid .k-field { width: 100%; box-sizing: border-box; }
.ls-cn { display: flex; gap: 6px; align-items: center; min-width: 0; height: 32px; }
.ls-lvl { display: inline-grid; place-items: center; min-width: 26px; height: 22px; padding: 0 3px; box-sizing: border-box; border-radius: 5px; font-size: 10px; font-weight: 650; letter-spacing: 0.02em; color: var(--cm-text-secondary); box-shadow: inset 0 0 0 1px var(--cm-border); cursor: pointer; background: var(--cm-bg); }
.ls-lvl:hover { background: var(--cm-bg-hover); color: var(--cm-text); }
.ls-lvl[data-warn] { box-shadow: inset 0 0 0 1px var(--cm-bg-warning), inset 0 -2px 0 var(--cm-bg-warning); color: var(--cm-text); }
.ls-lvl svg { width: 14px; height: 14px; }
th .ls-lvl { cursor: default; min-width: 22px; height: 18px; margin-inline-end: 4px; vertical-align: -4px; }
.ls-issue { margin: 0 16px 8px; padding: 8px 12px; border-radius: 8px; display: grid; gap: 6px; box-shadow: inset 0 0 0 1px var(--cm-border); }
.ls-issue[data-sev=block] { box-shadow: inset 0 0 0 1px var(--cm-border), inset 3px 0 0 var(--cm-bg-danger); }
.ls-issue[data-sev=warn] { box-shadow: inset 0 0 0 1px var(--cm-border), inset 3px 0 0 var(--cm-bg-warning); }
.ls-issue-head { display: flex; gap: 8px; align-items: center; }
.ls-issue-head b { font-weight: 550; }
.ls-issue .k-secondary { line-height: 16px; }
.ls-issue .k-field { width: 100%; box-sizing: border-box; }
.ls-ok { display: flex; gap: 8px; align-items: center; min-height: 26px; padding: 0 16px 0 28px; color: var(--cm-text-secondary); }
.ls-ok .k-i { color: var(--cm-text-secondary); }
.ls-sample { padding: 0 16px; overflow-x: auto; }
.ls-sample .k-table th, .ls-sample .k-table td { height: 28px; }
.ls-sample td.ls-mark { box-shadow: inset 3px 0 0 var(--cm-bg-warning); }
.ls-sample td.ls-clip { max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
.ls-sample th .ls-role { display: block; font-weight: 450; color: var(--cm-text-secondary); font-size: 11px; line-height: 14px; }
.ls-metrics { grid-template-columns: repeat(3, 1fr) !important; padding: 0 8px; }
.ls-metrics .ls-wide { grid-column: span 3; }
.ls-oq { display: inline-flex; align-items: center; gap: 4px; height: 18px; padding: 0 6px; border-radius: 9px; font-size: 10px; font-weight: 600; white-space: nowrap; background: var(--cm-bg-secondary); color: var(--cm-text-secondary); box-shadow: inset 0 0 0 1px var(--cm-border); cursor: help; }
.ls-foot { justify-content: flex-start !important; height: auto !important; min-height: 48px; flex-wrap: wrap; padding-block: 8px !important; }
.ls-reason { color: var(--cm-text-secondary); display: inline-flex; gap: 6px; align-items: center; min-width: 0; }
.ls-reason a { color: var(--cm-text-brand); }
.ls-src { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 2px 8px; padding: 4px 16px; }
.ls-src .k-i { margin-top: 2px; }
.ls-src .k-secondary { grid-column: 2; font-size: 11px; line-height: 14px; }
.ls-menu .k-menu-desc { white-space: normal; max-width: 300px; }
@media (max-width: 1180px) { .ls-cols2 { grid-template-columns: 380px minmax(0, 1fr); } .ls-colgrid { grid-template-columns: 28px minmax(0, 1fr) 112px 92px; } }
`;
    if (!document.getElementById("ls-style")) document.head.append(h("style", { id: "ls-style" }, css));

    const AB = window.AB;
    const { field, button } = AB;
    const T = () => AB.fx.datasets.transactions;
    const TA = () => AB.fx.datasets.transactionsApril;
    const n = (x) => Number(x).toLocaleString("en-US");

    // ---------- measurement levels ----------
    const LEVELS = {
        cat: { word: "categorical", tip: "Categorical: names and categories, no order" },
        ord: { word: "ordinal", tip: "Ordinal: categories with an order" },
        num: { word: "quantitative", tip: "Quantitative: numbers you can add and compare" },
        time: { word: "time", tip: "Time: dates and times" },
    };
    const READ_AS = [
        ["Text", "cat"], ["Category", "cat"], ["Ordered category", "ord"], ["Yes or no", "cat"],
        ["Integer", "num"], ["Number", "num"], ["Currency (USD)", "num"], ["Date and time", "time"],
    ];
    function lvlGlyph(level) {
        if (level === "cat") return "Abc";
        if (level === "num") return icon("hash", "sm");
        if (level === "time") return icon("calendar", "sm");
        // ordinal: a stepped icon (the sprite has none)
        const s = h("svg", { viewBox: "0 0 16 16", "aria-hidden": "true" });
        s.append(h("path", { d: "M2 14h3v-4h3V6h3V2h3", fill: "none", stroke: "currentColor", "stroke-width": "1.6", "stroke-linejoin": "round" }));
        return s;
    }

    // ---------- the column models ----------
    const SAMPLE = [
        ["ACC-863727", "ACC-173956", "$5.04", "2026-03-29 21:09:09"],
        ["ACC-789516", "ACC-157047", "$8.97", "2026-03-25 21:53:13"],
        ["ACC-171252", "ACC-393859", "$44.63", "2026-03-11 18:12:38"],
        ["ACC-502342", "ACC-393859", "$38.01", "2026-03-16 20:25:38"],
        ["ACC-281568", "ACC-966916", "$349.71", "2026-03-21 07:54:07"],
    ];
    function transferCols(amountAsText) {
        return [
            { name: "from_account", readAs: "Text", level: "cat", role: "Source" },
            { name: "to_account", readAs: "Text", level: "cat", role: "Target" },
            { name: "amount", readAs: amountAsText ? "Text" : "Currency (USD)", level: amountAsText ? "cat" : "num", role: "Weight", num: true },
            { name: "timestamp", readAs: "Date and time", level: "time", role: "Time" },
        ];
    }
    function accountCols() {
        return [
            { name: "id", readAs: "Text", level: "cat", role: "Key" },
            { name: "kind", readAs: "Category", level: "cat", role: "Node type" },
            { name: "country", readAs: "Category", level: "cat", role: "Attribute" },
            { name: "riskScore", readAs: "Integer", level: "num", role: "Attribute", num: true },
            { name: "flagged", readAs: "Yes or no", level: "cat", role: "Attribute" },
            { name: "alertRule", readAs: "Text", level: "cat", role: "Attribute" },
            { name: "alertTime", readAs: "Date and time", level: "time", role: "Time" },
        ];
    }
    const EDGE_ROLES = ["Source", "Target", "Id", "Weight", "Time", "Node type", "Attribute", "Skip"];
    const JOIN_ROLES = ["Key", "Node type", "Attribute", "Time", "Skip"];
    const MEANINGS = [
        ["Capacity", "a higher value carries more (flow, money, bandwidth)"],
        ["Strength", "a higher value is a closer tie (co-appearances, messages)"],
        ["Distance", "a higher value is farther apart (cost, time, length)"],
    ];
    const PAIRS = [
        ["Keep each as its own edge", "every row becomes an edge"],
        ["Merge into one edge, adding weights", "one edge per pair, amount summed"],
        ["Merge into one edge, keeping the first", "one edge per pair, later rows dropped"],
    ];

    // ---------- the doors ----------
    // Each state is a door: its title, what it names, its columns, checks and commit.
    function doorOf(state) {
        const t = T();
        const march = t.file, april = TA().file;
        const base = { direction: "Directed, source to target", guessed: true, pairs: PAIRS[0][0], weight: "amount", meaning: "Capacity", rowsAre: "Edges (an edge list)" };
        if (state === "preview" || state === "checks")
            return Object.assign(base, {
                title: "Open " + march, file: march, format: "CSV, comma, header row", cols: transferCols(state === "checks"), roles: EDGE_ROLES,
                verb: "Load", done: ["graph-place", "empty"], cancel: ["start-screen", "returning"], sample: true,
            });
        if (state === "remap")
            return Object.assign(base, {
                title: "Re-map columns: " + march, file: march, format: "CSV, comma, header row", cols: transferCols(false), roles: EDGE_ROLES, guessed: false,
                verb: "Apply", done: ["data-place", "at-rest"], cancel: ["data-place", "at-rest"], sample: true,
                door: [icon("file", "sm"), h("span", null, "Changes how the current file is read. Every row that reads a changed column updates; nothing is read from disk again.")],
            });
        if (state === "join")
            return {
                title: "Join " + t.accountsFile + " to Transfers", file: t.accountsFile, format: "CSV, comma, header row", cols: accountCols(), roles: JOIN_ROLES, join: true,
                verb: "Join", done: ["data-place", "at-rest"], cancel: ["data-place", "at-rest"], sample: true,
                door: [icon("database", "sm"), h("span", null, "Adds this table's columns to the nodes of "), h("b", null, march), h("span", { class: "k-secondary k-num" }, "  " + n(t.nodes) + " nodes, " + n(t.edges) + " edges, directed")],
            };
        // update and replace: the current source is named, the new files replace it
        const replace = state === "replace";
        return Object.assign(base, {
            title: (replace ? "Replace data: " : "Update with new data: ") + march, file: april, format: "CSV, comma, header row", cols: transferCols(false), roles: EDGE_ROLES, guessed: false,
            verb: replace ? "Replace" : "Update", done: ["data-place", "at-rest"], cancel: ["data-place", "at-rest"], update: true, replace,
            door: [icon("refresh-cw", "sm"), h("span", null, "Current source: "), h("b", null, march), h("span", { class: "k-secondary k-num" }, "  " + n(t.nodes) + " nodes, " + n(t.edges) + " edges, directed; joined " + t.accountsFile)],
        });
    }

    // ---------- checks ----------
    function checksOf(state, d, m) {
        const t = T(), s = t.stats, a = TA();
        const amount = d.cols.find((c) => c.name === "amount");
        const out = [];
        if (d.join) {
            out.push({ sev: "ok", text: "Every row matched a node: " + n(t.nodes) + " of " + n(t.nodes) + " on id" });
            const noAlert = t.attributes.find((x) => x.name === "flagged").values.false;
            out.push({ sev: "info", head: "alertRule and alertTime are empty on " + n(noAlert) + " accounts", text: "Those accounts have no alert. Empty stays empty; nothing is filled in." });
            out.push({ sev: "info", head: "riskScore is the bank's own score, 0 to 100", text: "Read from the file, not computed by graphty. Its provenance says so." });
            out.push({ sev: "ok", text: "No repeated ids in the table" });
            return out;
        }
        if (amount && amount.readAs === "Text" && m.weight === "amount")
            out.push({
                sev: "block", head: "Weight read as text: amount", policy: true,
                text: "All " + n(t.edges) + " values carry a dollar sign (\"$349.71\"), and amounts over a thousand a comma, so amount was read as text. No run can weigh edges by text. Marked in the sample.",
            });
        else if (amount && amount.readAs === "Currency (USD)" && !d.update)
            out.push({ sev: "info", head: "amount is written as currency text", text: "Read as Currency (USD): " + n(t.edges) + " amounts as numbers. \"$1,240.00\" becomes 1240." });
        if (d.update) {
            out.push({ sev: "warn", head: "Many isolates: " + n(a.stats.isolated) + " accounts have no transfer in April", text: "They load as nodes with no edges and make " + n(a.stats.components) + " components where March had " + s.components + "." });
            out.push({ sev: "warn", head: "Watchlist: " + (a.watchlist.members - a.watchlist.inCurrentData) + " of " + a.watchlist.members + " members are not in the new data", text: a.watchlist.notInCurrentData.join(", ") + ". They stay in the set, marked missing, and come back if a later version has them." });
            out.push({ sev: "ok", text: "All columns match the current source by name and type" });
            out.push({ sev: "ok", text: "Direction, repeated pairs and weight meaning kept from the current source" });
            return out;
        }
        if (d.guessed && m.direction.startsWith("Directed"))
            out.push({ sev: "warn", head: "Direction guessed", text: "Read as directed, from_account to to_account, from the column names. Change it under Direction if the file says otherwise." });
        out.push({ sev: "ok", text: "No isolated nodes: every account has a transfer" });
        out.push({ sev: "ok", text: "No repeated pairs (" + s.parallelEdges + ") and no self-loops (" + s.selfLoops + ")" });
        return out;
    }

    // ---------- render ----------
    let model = null;
    function render(el, state) {
        const d = doorOf(state);
        if (!model || model.state !== state) model = { state, cols: d.cols.map((c) => Object.assign({}, c)), direction: d.direction, pairs: d.pairs, weight: d.weight, meaning: d.meaning, rowsAre: d.rowsAre, format: d.format };
        const m = model;
        d.cols = m.cols;
        const redraw = () => { el.replaceChildren(); build(); };

        // a select that changes the model in place
        function pick(value, options, set, o) {
            o = o || {};
            const f = field(value, { caret: true, onClick: (e) => {
                el.querySelectorAll(".ls-menu").forEach((x) => x.remove());
                const items = options.map((opt) => {
                    const [label, desc] = Array.isArray(opt) ? opt : [opt];
                    return { label, desc, check: label === value, onClick: () => { set(label); redraw(); } };
                });
                const mn = AB.menu({ anchor: e.currentTarget, place: "below-start", items });
                mn.classList.add("ls-menu");
                el.append(mn);
            } });
            if (o.id) f.classList.add("k-id");
            return f;
        }
        function lvlButton(c, warn) {
            const b = h("span", { class: "ls-lvl", role: "button", "aria-label": c.name + ": " + LEVELS[c.level].word + ". Change the level", title: LEVELS[c.level].tip + ". Click to change", "data-warn": warn ? "" : null, tabindex: "0",
                on: { click: (e) => {
                    e.stopPropagation();
                    el.querySelectorAll(".ls-menu").forEach((x) => x.remove());
                    const mn = AB.menu({ anchor: b, place: "below-start", items: Object.keys(LEVELS).map((k) => ({ label: LEVELS[k].tip, check: k === c.level, onClick: () => { c.level = k; if (k === "num" && c.readAs === "Text") c.readAs = c.name === "amount" ? "Currency (USD)" : "Number"; if (k === "cat" && READ_AS.find((r) => r[0] === c.readAs)[1] !== "cat") c.readAs = "Text"; if (k === "time") c.readAs = "Date and time"; if (k === "ord") c.readAs = "Ordered category"; redraw(); } })) });
                    mn.classList.add("ls-menu");
                    el.append(mn);
                } } }, lvlGlyph(c.level));
            return b;
        }

        function build() {
            const checks = checksOf(state, d, m);
            const blocking = checks.find((c) => c.sev === "block");
            const t = T();

            // left column: how the file is read
            const left = h("div", { class: "ls-col" });
            left.append(h("div", { class: "ls-sh" }, "File"));
            left.append(h("div", { class: "ls-set" },
                h("span", { class: "ls-lg" }, "File"), field(d.file, { icon: "file", onClick: () => AB.flash("Choose another file... (not wired in the skeleton)") }),
                h("span", { class: "ls-lg" }, "Format"), pick(m.format, ["CSV, comma, header row", "CSV, semicolon, header row", "Tab-separated, header row", "GraphML", "GEXF", "JSON"], (v) => (m.format = v)),
                d.join ? null : [h("span", { class: "ls-lg" }, "Rows are"), pick(m.rowsAre, [["Edges (an edge list)", "each row joins a source to a target"], ["Nodes (a node table)", "each row is one node"]], (v) => (m.rowsAre = v))],
            ));
            if (d.update) {
                left.append(h("div", { class: "ls-sh" }, "Replaces"));
                left.append(
                    h("div", { class: "ls-src" }, icon("file", "sm"), h("span", null, h("b", null, TA().file), " replaces ", t.file), h("span", { class: "k-secondary k-num" }, n(TA().files.transfers.rows) + " rows, the same 4 columns")),
                    h("div", { class: "ls-src" }, icon("database", "sm"), h("span", null, h("b", null, TA().files.accounts.file), " replaces ", t.accountsFile), h("span", { class: "k-secondary k-num" }, "joined on id, " + n(TA().files.accounts.rows) + " rows, the same 5 columns")),
                );
            }
            left.append(h("div", { class: "ls-sh" }, "Columns ", h("span", { class: "k-count k-num" }, String(m.cols.length))));
            const grid = h("div", { class: "ls-colgrid" }, h("span", { class: "k-caption" }, "Level"), h("span", { class: "k-caption" }, "Column"), h("span", { class: "k-caption" }, "Read as"), h("span", { class: "k-caption" }, "Role"));
            m.cols.forEach((c) => {
                const warn = blocking && c.name === "amount";
                grid.append(lvlButton(c, warn), h("span", { class: "ls-cn k-id k-ellipsis" }, c.name, warn ? h("span", { class: "k-warn-glyph", "aria-label": "has an issue" }, "!") : null),
                    pick(c.readAs, READ_AS.map((r) => r[0]), (v) => { c.readAs = v; c.level = READ_AS.find((r) => r[0] === v)[1]; }),
                    pick(c.role, d.roles, (v) => { c.role = v; if (v === "Weight") m.weight = c.name; }));
            });
            left.append(grid);

            if (d.join) {
                left.append(h("div", { class: "ls-sh" }, "Join"));
                left.append(h("div", { class: "ls-set" },
                    h("span", { class: "ls-lg" }, "Key in this table"), pick("id", ["id", "kind", "country"], () => AB.flash("Only id matches the node ids in this data")),
                    h("span", { class: "ls-lg" }, "Matches"), pick("Node id (account)", ["Node id (account)", "Edge source", "Edge target"], () => AB.flash("Only nodes can take account columns here")),
                    h("span", { class: "ls-lg" }, "Unmatched rows"), pick("Drop, and list them in the import report", ["Drop, and list them in the import report", "Add them as nodes with no edges"], () => {}),
                    h("span", { class: "ls-lg" }, "Matched"), h("span", { class: "k-strong k-num" }, n(t.nodes) + " of " + n(t.nodes) + " matched"),
                ));
            } else {
                left.append(h("div", { class: "ls-sh" }, "How the graph is read"));
                const weightCol = m.cols.find((c) => c.name === m.weight);
                left.append(h("div", { class: "ls-set" },
                    h("span", { class: "ls-lg" }, "Node ids"), pick("The source and target values", ["The source and target values", "An id column"], () => AB.flash("This file has no id column")),
                    h("span", { class: "ls-lg" }, "Direction"), pick(m.direction, [["Directed, source to target", "a transfer goes one way"], ["Undirected", "a tie is the same both ways"]], (v) => { m.direction = v; d.guessed = false; }),
                    d.guessed && m.direction.startsWith("Directed") ? h("span", { class: "ls-sub" }, "Guessed from the column names") : null,
                    h("span", { class: "ls-lg" }, "Repeated pairs"), pick(m.pairs, PAIRS, (v) => (m.pairs = v)),
                    d.update ? null : h("span", { class: "ls-sub k-num" }, "None in this file: " + T().stats.parallelEdges + " pairs repeat"),
                    h("span", { class: "ls-lg" }, "Weight"), pick(m.weight || "No weight", ["No weight"].concat(m.cols.filter((c) => c.level === "num" || c.name === m.weight).map((c) => c.name)), (v) => { m.weight = v === "No weight" ? null : v; m.cols.forEach((c) => { if (c.role === "Weight" && c.name !== m.weight) c.role = "Attribute"; if (c.name === m.weight) c.role = "Weight"; }); }, { id: true }),
                    m.weight ? [h("span", { class: "ls-lg" }, "Weight means"), pick(m.meaning, MEANINGS, (v) => (m.meaning = v)),
                        h("span", { class: "ls-sub" }, weightCol && weightCol.level !== "num" ? "Needs a number: amount is read as text" : MEANINGS.find((x) => x[0] === m.meaning)[1], " ", h("span", { class: "ls-oq", title: "Open question: is the meaning set once here, or asked by each run that uses the weight, with nothing preselected?" }, "Open question"))] : null,
                ));
            }

            // right column: checks, sample, what will load
            const right = h("div", { class: "ls-col" });
            const shown = checks.filter((c) => c.sev !== "ok");
            right.append(h("div", { class: "ls-sh" }, "Checks ", h("span", { class: "k-count k-num" }, String(shown.length ? shown.length + " to read" : "all passed"))));
            checks.forEach((c) => {
                if (c.sev === "ok") return right.append(h("div", { class: "ls-ok" }, icon("circle-check", "sm"), h("span", { class: "k-num" }, c.text)));
                const glyph = c.sev === "block" ? h("span", { class: "k-warn-glyph k-err-glyph" }, "!") : c.sev === "warn" ? h("span", { class: "k-warn-glyph" }, "!") : icon("info", "sm");
                right.append(h("div", { class: "ls-issue", "data-sev": c.sev }, h("div", { class: "ls-issue-head" }, glyph, h("b", { class: "k-num" }, c.head)), h("span", { class: "k-secondary k-num" }, c.text),
                    c.policy ? pick("Choose how to read amount", [["Read as Currency (USD): " + n(t.edges) + " amounts as numbers", "\"$1,240.00\" becomes 1240. Every value kept."], ["Keep as text, and load with no weight", "amount stays a text attribute; runs are unweighted"]], (v) => {
                        const a = m.cols.find((x) => x.name === "amount");
                        if (v.startsWith("Read")) { a.readAs = "Currency (USD)"; a.level = "num"; } else { m.weight = null; a.role = "Attribute"; }
                    }) : null));
            });

            if (d.sample) {
                const cols = m.cols;
                const rows = d.join
                    ? t.flaggedAccounts.slice(0, 5).map((r) => [r.id, r.kind, r.country, String(r.riskScore), String(r.flagged), r.alertRule, r.alertTime.replace("T", " ").replace(":00Z", "")])
                    : SAMPLE;
                right.append(h("div", { class: "ls-sh" }, d.join ? "Sample, 5 of " + n(t.nodes) + " rows" : "Sample, first 5 of " + n(t.edges) + " rows"));
                const amountText = !!blocking;
                right.append(h("div", { class: "ls-sample" }, h("table", { class: "k-table" },
                    h("thead", null, h("tr", null, cols.map((c) => h("th", { class: c.num && !(c.name === "amount" && amountText) ? "k-n" : null }, h("span", { class: "ls-lvl", "data-warn": c.name === "amount" && amountText ? "" : null, "aria-hidden": "true" }, lvlGlyph(c.level)), c.name, h("span", { class: "ls-role" }, c.role === "Attribute" ? c.readAs.toLowerCase() : c.role.toLowerCase() + ", " + c.readAs.toLowerCase()))))),
                    h("tbody", null, rows.map((r) => h("tr", null, r.map((v, i) => h("td", { class: [cols[i].num && !(cols[i].name === "amount" && amountText) ? "k-n" : "", cols[i].name === "amount" && amountText ? "ls-mark" : "", i < 3 && !cols[i].num ? "k-id" : "", cols[i].name === "alertRule" ? "ls-clip" : "", "k-num"].join(" "), title: cols[i].name === "alertRule" ? v : null }, v))))),
                )));
            } else if (d.update) {
                right.append(h("div", { class: "ls-sh" }, "What changes"));
                const v = TA().versionDiff;
                right.append(h("div", { class: "k-metrics ls-metrics" },
                    metric("accounts kept", v.accountsKept), metric("accounts added", v.accountsAdded), metric("accounts removed", v.accountsRemoved),
                    metric("transfers in both", v.transfersBoth), metric("transfers added", v.transfersAdded), metric("transfers removed", v.transfersRemoved)));
                right.append(h("div", { class: "ls-ok" }, icon("history", "sm"), h("span", null, "March stays as a data version. Runs and paint rows rerun on the new data, each marked where a number changed.")));
                right.append(h("div", { class: "ls-ok" }, h("span", { class: "ls-oq", title: "Open question: what Update with new data does that Replace data does not (a refresh of the same source, or any new file) is not yet decided" }, "Open question"), h("span", null, "Update or Replace: where they differ")));
            }

            right.append(h("div", { class: "ls-sh" }, d.update ? "What will load" : d.join ? "What joins" : "What will load"));
            if (d.join) right.append(h("div", { class: "k-metrics ls-metrics" }, metric("matched", n(t.nodes) + " of " + n(t.nodes)), metric("new attributes", m.cols.length - 1), metric("rows dropped", 0)));
            else if (d.update) right.append(h("div", { class: "k-metrics ls-metrics" }, metric("nodes", TA().nodes), metric("edges", TA().edges), metric("components", TA().stats.components)));
            else right.append(h("div", { class: "k-metrics ls-metrics" }, metric("nodes", t.nodes), metric("edges", t.edges), metric("rows dropped", 0)));

            // footer
            const reason = blocking
                ? h("span", { class: "ls-reason" }, h("span", { class: "k-warn-glyph k-err-glyph" }, "!"), d.verb + " is off: the weight column is text. Read it as a number, or load with no weight.")
                : h("span", { class: "ls-reason" }, state === "preview" || state === "checks" ? ["The full report stays with the graph: ", link("inspector-nothing-selected", "overview", "Last import, in the inspector")] : ["Recorded in ", link("data-place", "at-rest", "Data, Sources"), ", with Undo"]);
            const foot = [reason, h("span", { class: "k-grow" }),
                d.join || d.update ? null : button("Filter at import...", { kind: "ghost", onClick: () => AB.flash("Filter at import (not wired in the skeleton)") }),
                button("Cancel", { kind: "secondary", go: d.cancel }),
                blocking ? button(d.verb, { disabled: true, onClick: () => AB.flash(d.verb + " is off until the weight is read as a number") }) : button(d.verb, { go: d.done })];

            const wrap = AB.modal({ title: d.title, body: [d.door ? h("div", { class: "ls-door" }, d.door) : null, h("div", { class: "ls-cols2" }, left, right)], foot });
            const box = wrap.querySelector(".k-modal");
            box.classList.add("ls-modal");
            box.querySelector(".k-modal-foot").classList.add("ls-foot");
            box.addEventListener("click", () => el.querySelectorAll(".ls-menu").forEach((x) => x.remove()));
            el.append(wrap);
        }
        build();
    }
    function metric(label, value) {
        return h("div", { class: "k-metric" }, h("span", { class: "k-secondary" }, label), h("span", { class: "k-big k-num" }, typeof value === "number" ? n(value) : value));
    }

    registerSection({
        id: "load-step",
        title: "Load step",
        region: "overlay",
        frame: (state) => (state === "preview" || state === "checks" ? { full: "start-screen/returning" } : { left: "data-place/at-rest" }),
        states: [
            { id: "preview", label: "New file" },
            { id: "checks", label: "Weight read as text" },
            { id: "join", label: "Join" },
            { id: "update", label: "Update" },
            { id: "replace", label: "Replace" },
            { id: "remap", label: "Re-map" },
        ],
        render,
    });
})();
