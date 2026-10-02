/* Apply file: one dialog for a recipe or a style file (structure-b-refined.md 12.2, streamline-3
   "Apply recipe or style file"). Opened from the project-name menu's Apply recipe or style file...,
   Quick actions, or a dropped file. Titled "Apply <kind>: <name> to <project>": a file header (name, who saved
   it and when), then one list of the rows the file adds, drawn with the shared AB.tree, each row
   with its binding inline in the count slot -- the matched attribute, or a picker when the data
   lacks it, after what the row paints. Matched bindings collapse into one line ("4 of 4 attributes
   matched by name and type", and "1 of 1 set bound" when the file carries a set) with Show all. Under the header: what the file brings, what the recipient
   supplies, and the network it expects. Ids the recipe names that the data lacks are one problem
   line under the list, with no repair. Apply waits (aria-disabled, focusable, with its reason)
   until every mismatch has a choice, and the first open choice takes focus. A file always lands on top of the tree
   as one undo step (no Replace). An older 1.x style file is one problem block and "Apply these settings",
   with each setting a checkbox.
   Data facts are kit/fixtures.json: March accounts carry alertRule; April's accounts file has only
   id, kind, country, riskScore and flagged; 7 of the Watchlist's accounts are in April.
   Section-local fact (WL): the recipe's Watchlist also names 12 ids a spreadsheet turned into dates
   (1-Mar, 2-Sep: what it makes of MARCH1, SEPT2), so it reads 7 of 19 and the problem line under
   the list names those 12; the fixture's two missing ACC ids are not part of it.
   A run's weight (spec 12.2): a run that used the loaded weight reads "Weight: loaded weight" and
   binds nothing; the recipe's Max flow run overrode its weight to fee, read as Capacity, so fee is
   listed with the bindings and its meaning control shows only while fee is unmatched. Section-local
   fact: fee is in March's transfers and not in April's (transfers-2026-04.csv).
   Header: the recipe has no author (the normal case: Your name in Settings is usually empty), so it
   reads "Saved <when>"; the style file has one, so it reads "Saved by <name>, <when>".
   The wide state (wide-mismatch) applies a recipe saved on February's hosts export to March's
   (kit/wide-nested.json, 69 host and 26 connection attributes): six attributes, four matched by name
   and type, two renamed since February, each chosen through the field list. Section-local facts:
   the recipe file, its February names (vuln_crit_30d, owner) and its rows.
   Every binding choice is the field list at menu size (AB.openFieldList) over the data on screen;
   "Leave unbound" and "Use no weight" are the link beside it, as Analyze's "Use no weight".
   April's attributes: AB.fx.datasets.transactionsApril carries file columns but no attribute list,
   so this file gives it one (non-enumerable, March's types for April's columns) for fieldsOf.
   The section also draws the left panel, canvas and (after applying) the inspector, so the tree
   and the drawing are the transfers graph the dialog talks about. Plain ASCII. */
(function () {
    "use strict";
    const AB = window.AB;
    const { h, icon } = window;

    const css = `
.ra-modal { width: 800px; max-width: calc(100vw - 32px); max-height: calc(100vh - 96px); }
.ra-head { display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 6px 16px; border-bottom: 1px solid var(--cm-border); }
.ra-head .k-i { color: var(--cm-text-secondary); }
.ra-meta { padding: 6px 16px; border-bottom: 1px solid var(--cm-border); display: grid; gap: 2px; line-height: 18px; color: var(--cm-text-secondary); }
.ra-meta b { color: var(--cm-text); font-weight: 550; }
.ra-paints { color: var(--cm-text-secondary); margin-inline-end: 8px; }
.ra-missing { margin: 8px 16px 4px; }
.ra-sh { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 16px; margin-top: 4px; font-weight: 550; }
.ra-sh .k-secondary { font-weight: 450; }
.ra-list .ab-trow { cursor: default; }
.ra-list .ab-trow:hover { background: none; }
.ra-list .ab-tcount { display: inline-flex; align-items: center; gap: 4px; }
.ra-bind { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.ra-bind .ra-arrow { color: var(--cm-text-tertiary); }
.ra-bind > .ab-link { padding: 4px 0; margin: -4px 0; } /* a 24 px target, the row unmoved (WCAG 2.5.8) */
.ra-list .k-field { width: 180px; height: 24px; box-sizing: border-box; text-align: start; color: var(--cm-text); }
.ra-list .ra-weight .k-field { width: 110px; }
.ra-list .ab-trow[data-miss] .ab-tname { font-weight: 550; }
.ra-foot { justify-content: flex-start !important; flex-wrap: wrap; }
.ra-reason { color: var(--cm-text-secondary); display: inline-flex; gap: 6px; align-items: center; min-width: 0; }
.ra-sets { list-style: none; margin: 0; padding: 0 16px 8px; }
.ra-sets li { display: flex; align-items: center; gap: 10px; height: 32px; border-top: 1px solid var(--cm-border); }
.ra-sets li:first-child { border-top: 0; }
.ra-sets .ra-val { font-family: var(--cm-font-family-mono); font-size: 11px; color: var(--cm-text-secondary); margin-inline-start: auto; }
`;
    if (!document.getElementById("ra-style")) document.head.append(h("style", { id: "ra-style" }, css));

    const T = () => AB.fx.datasets.transactions;
    const TA = () => AB.fx.datasets.transactionsApril;
    const n = (x) => Number(x).toLocaleString("en-US");

    const RECIPE = { kind: "recipe", name: "Mule ring triage", file: "mule-ring-triage.graphty", savedBy: "", savedAt: "Mar 28 2026, 10:14", appliedAt: "today 09:31",
        supply: "a network with an account column", expects: "a transfer network of accounts (not included)" };
    const STYLE = { kind: "style file", name: "Risk review look", file: "risk-review-look.json", savedBy: "Dana Reyes", savedAt: "Mar 30 2026, 16:02",
        supply: "a network with an account column", expects: "a transfer network of accounts (not included)" };
    const LEGACY = { file: "transfers-look-2025.json" };
    const WIDE = { kind: "recipe", name: "Estate exposure review", file: "estate-exposure-review.graphty", savedBy: "", savedAt: "Feb 27 2026, 15:40",
        supply: "a network with a host column", expects: "an IT estate of hosts and connections (not included)" };
    const W = () => AB.fx.datasets.wide;
    // The recipe's Watchlist: the fixture's 7 accounts in April plus 12 date-shaped ids no network has
    const DATED = ["1-Mar", "2-Mar", "3-Mar", "6-Mar", "7-Mar", "8-Mar", "11-Mar", "1-Sep", "2-Sep", "3-Sep", "5-Sep", "7-Sep"];
    function WL() {
        const f = TA().watchlist;
        const inData = f.memberIds.filter((id) => !f.notInCurrentData.includes(id));
        return { name: f.name, members: inData.length + DATED.length, inCurrentData: inData.length, notInCurrentData: DATED, memberIds: inData.concat(DATED) };
    }

    // April's attribute list for the field list: April's columns with March's types
    function aprilFields() {
        const A = TA();
        if (A.attributes) return;
        const march = Object.fromEntries(T().attributes.map((a) => [a.name.replace(/ \(edge\)$/, ""), a.kind]));
        const attrs = A.files.accounts.columns.map((c) => (c === "id" ? { name: "id (account)", kind: "text" } : { name: c, kind: march[c] }))
            .concat(["amount", "timestamp"].map((c) => ({ name: c + " (edge)", kind: march[c] })));
        Object.defineProperty(A, "attributes", { value: attrs, enumerable: false });
    }
    // "Saved by Dana Reyes, <when>" only when the file names its author, else "Saved <when>"
    const savedLine = (f) => (f.savedBy ? "Saved by " + f.savedBy + ", " : "Saved ") + f.savedAt;
    const MEANINGS = [["stronger", "Stronger"], ["farther", "Farther"], ["capacity", "Capacity"]];
    const LOADED = { weight: "amount", meaning: "Stronger" };

    // The rows each file adds, top first. `reads` is the attribute it binds to (matched by name and
    // type); `miss` marks the one the April accounts file lacks.
    function recipeRows(april) {
        const w = WL();
        return [
            { id: "watchlist", kindIcon: "circle-check", name: "Watchlist", set: true, paints: "Outline", fixed: april ? AB.count(w.inCurrentData, "member", { of: w.members }) + " in this data" : AB.count(w.members, "account"),
              fixedTip: april ? AB.count(w.notInCurrentData.length, "id") + " are not in this data; they stay in the set as missing members" : "A set the recipe carries, by account id" },
            { id: "ppr", kindIcon: "chart-column", name: "Personalized PageRank from Watchlist", run: true, paints: "Color", fixed: "weight: loaded weight",
              fixedTip: "Uses this data's loaded weight, " + LOADED.weight + " as " + LOADED.meaning + "; nothing to bind" },
            { id: "maxflow", kindIcon: "route", name: "Max flow, Watchlist to merchants", run: true, paints: "Flow edges", role: "weight", reads: "fee", weight: true, miss: april },
            { id: "cycles", kindIcon: "route", name: "Cycles up to 4 transfers", run: true, paints: "Cycle edges", role: "time", reads: "timestamp", notes: 1 },
            { id: "riskScore", kindIcon: AB.typeGlyph("num"), name: "riskScore", paints: "Color", role: "riskScore", reads: "riskScore" },
            { id: "alertRule", kindIcon: AB.typeGlyph("cat"), name: "alertRule", paints: "Label", role: "alertRule", reads: "alertRule", miss: april },
        ];
    }
    // The wide recipe: six attributes; vuln_crit_30d and owner are February's names
    function wideRows() {
        return [
            { id: "role", kindIcon: AB.typeGlyph("cat"), name: "role", role: "color", reads: "role" },
            { id: "env", kindIcon: "funnel", name: "environment is production", filter: true, paints: "Nothing: a filter step", role: "filter", reads: "environment" },
            { id: "cpu", kindIcon: AB.typeGlyph("num"), name: "cpu_util_p95_pct", role: "tooltip", reads: "cpu_util_p95_pct" },
            { id: "btw", kindIcon: "chart-column", name: "Betweenness, weighted by bytes", run: true, paints: "Glow", role: "weight", reads: "bytes_total_24h" },
            { id: "vuln", kindIcon: AB.typeGlyph("num"), name: "vuln_crit_30d", role: "size", reads: "vuln_crit_30d", miss: true, kind: "number" },
            { id: "owner", kindIcon: AB.typeGlyph("cat"), name: "owner", role: "label", reads: "owner", miss: true, kind: "text" },
        ];
    }
    function styleRows(april) {
        return [
            { id: "alertRule", kindIcon: AB.typeGlyph("cat"), name: "alertRule", role: "label", reads: "alertRule", miss: april },
            { id: "flagged", kindIcon: AB.typeGlyph("bool"), name: "flagged", role: "outline", reads: "flagged" },
            { id: "riskScore", kindIcon: AB.typeGlyph("num"), name: "riskScore", role: "size", reads: "riskScore" },
            { id: "kind", kindIcon: AB.typeGlyph("cat"), name: "kind", role: "color", reads: "kind" },
            { id: "amount", kindIcon: AB.typeGlyph("num"), name: "amount", role: "edge width", reads: "amount" },
        ];
    }

    // ---------- the one Apply file dialog ----------
    function dialog(state) {
        const isStyle = state === "style-unbound";
        const wide = state === "wide-mismatch";
        const april = state !== "binding" && !wide;
        const file = isStyle ? STYLE : wide ? WIDE : RECIPE;
        const rows = isStyle ? styleRows(april) : wide ? wideRows() : recipeRows(april);
        const graph = wide ? W().frame.project : april ? "Transfers, April 2026" : T().frame.project;
        const dataset = wide ? "wide" : april ? "transactionsApril" : "transactions";
        if (april) aprilFields();
        const st = { choice: {}, meaning: {}, all: false };
        const misses = rows.filter((r) => r.miss);
        const open = () => misses.filter((r) => !st.choice[r.id]);
        const matched = rows.filter((r) => r.reads && !r.miss).length;
        const binds = rows.filter((r) => r.reads).length;
        // Each slot kind is counted with its own noun: attributes match by name and type; a set the
        // file carries binds by its member ids (its missing members are the problem line, not a miss)
        const sets = rows.filter((r) => r.set).length;

        const applyBtn = AB.button("Apply", {
            onClick: () => {
                if (open().length) return;
                if (wide) { AB.go("graph-place", "at-rest"); return setTimeout(() => AB.notice(WIDE.name + " added " + AB.count(rows.length, "row") + " on top of the tree", { label: "Undo", go: ["recipe-apply", "wide-mismatch"] }), 0); }
                if (!isStyle) return AB.go("recipe-apply", "applied");
                AB.go("graph-place", "at-rest");
                setTimeout(() => AB.notice(STYLE.name + " added " + AB.count(styleRows(true).length, "row") + " on top of the tree", { label: "Undo", go: ["recipe-apply", "style-unbound"] }), 0);
            },
        });
        const reason = h("span", { class: "ra-reason k-grow" });
        const summary = h("span", { class: "k-secondary" });

        const drawFoot = () => {
            const left = open();
            applyBtn.setAttribute("aria-disabled", left.length ? "true" : "false");
            reason.replaceChildren(...(left.length
                ? [icon("triangle-alert", "sm"), "Choose an attribute for " + left.map((r) => r.reads).join(", ") + ", or leave it unbound"]
                : ["Adds " + AB.count(rows.length, "row") + " on top of the tree, one undo step"]));
            // Matched bindings collapse into this one line; Show all puts each inline on its row
            const toggle = h("span", Object.assign({ class: "ab-link", role: "button", "aria-expanded": String(st.all) }, AB.act({ onClick: () => { st.all = !st.all; drawList(); drawFoot(); summary.querySelector(".ab-link").focus(); } })), st.all ? "Hide matched" : "Show all");
            summary.replaceChildren([binds ? AB.count(matched, "attribute", { of: binds }) + " matched by name and type" : null, sets ? AB.count(sets, "set", { of: sets }) + " bound" : null].filter(Boolean).join(", "), matched ? " " : null, matched ? toggle : null);
        };

        // The binding in the row's count slot: "weight -> amount", or a picker for a missing one
        // What the row paints leads the slot, then its binding
        const paints = (r) => h("span", { class: "ra-paints" }, r.paints || r.role.charAt(0).toUpperCase() + r.role.slice(1));
        const bindingFor = (r) => [paints(r), bindOf(r)];
        const bindOf = (r) => {
            if (r.fixed) return AB.tip(h("span", { class: "ra-bind" }, r.fixed), r.fixedTip, { label: false });
            if (!r.miss && !st.all) return null;
            if (!r.miss) return AB.tip(h("span", { class: "ra-bind" }, r.role + (r.weight ? ": " + r.reads : ""), h("span", { class: "ra-arrow" }, "->"), r.reads),
                "Matched by name and type in " + graph + (r.weight ? "; read as Capacity, as the recipe saved it. This run's own weight: the loaded weight is unchanged" : ""), { label: false });
            const c = st.choice[r.id];
            const none = r.weight ? "None" : "unbound";
            // The binding choice is the field list at menu size over the data on screen
            const f = AB.field(c === "unbound" ? "Leave unbound" : c ? AB.truncMiddle(c, 24) : (r.weight ? "Choose" : "Choose an attribute"), { caret: true,
                onClick: (e) => AB.openFieldList(e.currentTarget, { dataset, kind: r.weight ? "number" : r.kind, element: r.weight ? "edge" : "node", current: c, results: false, notes: false,
                    label: (r.weight ? "Weight" : "Attribute") + " for " + r.reads, onPick: (name) => pick(r, name) }) });
            f.dataset.raPick = r.id;
            // Choosing the missing data is the main action: the first open choice takes focus
            if (!wide && !c && r === open()[0]) f.setAttribute("data-autofocus", "");
            f.setAttribute("aria-haspopup", "listbox");
            const leave = c === none ? null : h("span", Object.assign({ class: "ab-link" , role: "button" }, AB.act({ onClick: () => pick(r, none) })), r.weight ? "Use no weight" : "Leave unbound");
            if (leave && !r.weight) AB.tip(leave, "The row is added hidden and marked unbound; bind it later from its Style tab", { label: false });
            f.setAttribute("aria-label", r.reads + ": " + (c || "choose an attribute"));
            AB.tip(f, r.reads + " is not in " + (wide ? W().file : r.weight ? TA().files.transfers.file : TA().files.accounts.file), { label: false });
            if (!r.weight) return h("span", { class: "ra-bind" }, r.reads, h("span", { class: "ra-arrow" }, "->"), f, leave);
            // The meaning control shows only while the column is unmatched; it starts at the recipe's Capacity
            const m = st.meaning[r.id] || "capacity";
            const meaning = c === "None" ? null : AB.seg(MEANINGS, m, (v) => { st.meaning[r.id] = v; drawList(); listWrap.querySelector(".ra-list .k-seg [aria-checked=true]").focus(); }, { label: "What a higher " + (c || r.reads) + " means" });
            return h("span", { class: "ra-bind ra-weight" }, "weight: " + r.reads, h("span", { class: "ra-arrow" }, "->"), f, meaning, leave);
        };

        const listWrap = h("div", { class: "ra-list" });
        const drawList = () => {
            const tr = AB.tree(rows.map((r) => ({ id: r.id, kindIcon: r.kindIcon, name: r.name, notes: r.notes })), { label: "Rows it adds" });
            // A preview, not the graph tree: no rename, delete or reorder here
            const block = (e) => {
                if (e.type === "dblclick" || ["F2", "Delete", "Backspace", "[", "]"].includes(e.key)) { e.stopPropagation(); e.preventDefault(); }
            };
            tr.addEventListener("dblclick", block, true);
            tr.addEventListener("keydown", block, true);
            // A click selects a row in place, so its tooltip and keyboard place follow it
            tr.addEventListener("click", (e) => { const li = e.target.closest(".ab-trow"); if (!li) return; tr.querySelectorAll(".ab-trow").forEach((x) => { x.setAttribute("aria-selected", String(x === li)); x.tabIndex = x === li ? 0 : -1; }); li.focus(); });
            rows.forEach((r) => {
                const li = tr.querySelector(`[data-row="${r.id}"]`);
                li.toggleAttribute("data-miss", !!(r.miss && !st.choice[r.id]));
                li.querySelector(".ab-tcount").replaceChildren(...bindingFor(r).filter(Boolean));
            });
            listWrap.replaceChildren(tr);
        };
        const pick = (r, c) => { st.choice[r.id] = c; AB.closeMenu(); drawList(); drawFoot(); const f = listWrap.querySelector(`[data-ra-pick="${r.id}"]`); if (f) f.focus(); };
        drawList();
        drawFoot();

        // What the file brings and what the recipient supplies, counted from its rows
        const kinds = [["set", "set"], ["filter", "filter step"], ["run", "run"]].map(([k, noun]) => rows.filter((r) => r[k]).length && AB.count(rows.filter((r) => r[k]).length, noun)).filter(Boolean);
        const meta = h("div", { class: "ra-meta" },
            h("div", null, h("b", null, "Brings: "), ["styles"].concat(kinds).join(", ") + ". ", h("b", null, "You supply: "), file.supply + "."),
            h("div", null, h("b", null, "Expects: "), file.expects));
        // Ids the recipe names that this data lacks: the element's match report, said in the open; no one-click repair
        // The example is a date-shaped id when there is one (1-Mar, 2-Sep: what a spreadsheet makes of
        // MARCH1, SEPT2), and those ids get one general line; there is no repair, since only the reader
        // knows which gene or account a date was. A stand-in for the element's match report.
        const w = WL();
        const ids = w.notInCurrentData;
        const dated = ids.filter((id) => /^\d{1,2}-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/.test(id));
        const missingIds = april && !isStyle ? AB.problem({ level: "partial",
            what: "Not in this network: " + AB.count(ids.length, "id") + ", for example " + (dated[0] || ids[0]),
            todo: dated.length
                ? AB.count(dated.length, "id") + " look like spreadsheet dates (SEPT2 -> 2-Sep). They stay in Watchlist as missing members."
                : "They follow no pattern a changed file would explain (such as spreadsheet dates, SEPT2 -> 2-Sep); they stay in Watchlist as missing members." }) : null;
        if (missingIds) missingIds.classList.add("ra-missing");
        const body = h("div", null,
            h("div", { class: "ra-head" }, icon(isStyle ? "palette" : "book-open", "sm"), h("b", null, file.file), h("span", { class: "k-secondary" }, savedLine(file))),
            meta,
            h("div", { class: "ra-sh" }, "Rows it adds", h("span", { class: "k-grow" }), summary),
            listWrap, missingIds);
        const foot = h("div", { style: "display:contents" }, reason, AB.button("Cancel", { kind: "secondary", onClick: () => AB.close() }), applyBtn);
        const wrap = finish(AB.modal({ title: "Apply " + file.kind + ": " + file.name + " to " + graph, body, foot }));
        // The wide state opens on its first choice: the field list over the 69 host attributes
        // Otherwise the first open choice takes focus. The shell's querySelectorAll(FIRST) returns
        // document order, so its [data-autofocus] does not win over earlier focusable controls;
        // focus it here until the shell prefers it (reported to the shell).
        if (!wide) requestAnimationFrame(() => requestAnimationFrame(() => { const f = listWrap.querySelector("[data-autofocus]"); if (f && f.isConnected) f.focus(); }));
        if (wide) requestAnimationFrame(() => requestAnimationFrame(() => { const f = listWrap.querySelector('[data-ra-pick="vuln"]'); if (f && f.isConnected) f.click(); }));
        return wrap;
    }

    function finish(wrap) {
        wrap.querySelector(".k-modal").classList.add("ra-modal");
        wrap.querySelector(".k-modal-foot").classList.add("ra-foot");
        return wrap;
    }

    // ---------- an older (1.x) style file: one problem block, its settings as checkboxes ----------
    const LEGACY_SETTINGS = [
        { id: "mode", name: "View mode", val: "2D" },
        { id: "layout", name: "Layout", val: "ngraph" },
        { id: "bg", name: "Background", val: "#101820" },
    ];
    function legacyDialog() {
        const on = { mode: true, layout: true, bg: true };
        const applyBtn = AB.button("Apply these settings", { onClick: () => { if (LEGACY_SETTINGS.some((s) => on[s.id])) AB.go("inspector-nothing-selected", "transfers"); } });
        const list = h("ul", { class: "ra-sets", "aria-label": "Settings the file carries" });
        const draw = () => {
            list.replaceChildren(...LEGACY_SETTINGS.map((s) => {
                const flip = () => { on[s.id] = !on[s.id]; draw(); list.querySelector(`[data-set="${s.id}"]`).focus(); };
                const box = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "data-set": s.id, "aria-checked": String(on[s.id]), "aria-label": s.name + " " + s.val,
                    on: { click: flip, keydown: (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } } } });
                return h("li", null, box, h("span", null, s.name), h("span", { class: "ra-val" }, s.val));
            }));
            applyBtn.setAttribute("aria-disabled", LEGACY_SETTINGS.some((s) => on[s.id]) ? "false" : "true");
        };
        draw();
        const body = h("div", null,
            h("div", { class: "ra-head" }, icon("history", "sm"), h("b", null, LEGACY.file), h("span", { class: "k-secondary" }, "Made with graphty-element 1.x")),
            Object.assign(AB.problem({ level: "partial", what: "Its layers are in the older 1.x form and cannot be applied.", todo: "Its other settings still apply. Keep the ones you want." }), { className: "ab-problem ra-missing" }),
            list);
        const foot = h("div", { style: "display:contents" }, h("span", { class: "k-grow" }), AB.button("Cancel", { kind: "secondary", onClick: () => AB.close() }), applyBtn);
        return finish(AB.modal({ title: "Apply style file: " + LEGACY.file + " to " + T().frame.project, body, foot }));
    }

    // ---------- the graph behind the dialog ----------
    const isApril = (state) => state !== "binding" && state !== "older-style-file";
    function treeRows(state) {
        const april = isApril(state);
        const L = TA().legends[april ? "april" : "march"];
        const runGo = ["inspector-run-row", april ? "earlier-results" : "many-groups"];
        const rows = [
            { name: "Selection", kindIcon: "scan", pinned: true, builtin: true, eye: true, go: ["inspector-selection-and-everything", "selection"] },
            { name: "Notes", kindIcon: "message-square", pinned: true, builtin: true, eye: true, go: ["inspector-selection-and-everything", "notes-row"], menu: ["context-menus", "notes-row"] },
        ];
        if (state === "applied") {
            const w = WL();
            rows.push(
                { name: "Watchlist", kindIcon: "circle-check", count: w.inCurrentData + " of " + w.members, eye: true, selected: true, go: ["recipe-apply", "applied"], menu: ["context-menus", "row"] },
                { name: "Personalized PageRank from Watchlist", kindIcon: "chart-column", swatch: AB.ramp(), eye: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
                { name: "Max flow, Watchlist to merchants", kindIcon: "route", count: "Not run", eye: true, go: ["inspector-run-row", "data"], menu: ["context-menus", "run-row"] },
                { name: "Cycles up to 4 transfers", kindIcon: "route", count: "Not run", notes: 1, eye: true, go: ["inspector-run-row", "data"], menu: ["context-menus", "run-row"] },
                { name: "riskScore", kindIcon: AB.typeGlyph("num"), swatch: AB.ramp(), eye: true, go: ["inspector-measure-row", "risk-score"], menu: ["context-menus", "measure-row"] },
                { name: "alertRule", kindIcon: AB.typeGlyph("cat"), count: "Unbound", eye: false, dim: true, go: ["inspector-group-set-path-row", "style"], menu: ["context-menus", "row"] },
            );
        }
        rows.push(
            { name: "Louvain, weighted by amount", kindIcon: "layers", swatch: h("span", { class: "ab-multi" }, L.rows.slice(0, 3).map((r) => AB.chit(r.color, true))), eye: true, go: runGo, menu: ["context-menus", "run-row"],
              children: L.rows.map((r) => ({ name: r.name, kindIcon: "circle-dot", swatch: AB.chit(r.color, true), count: n(r.count), eye: true, go: runGo, menu: ["context-menus", "row"] })) },
            { name: "Everything", kindIcon: "base-layer", pinned: true, builtin: true, eye: true, go: ["inspector-selection-and-everything", "everything"], menu: ["context-menus", "row"] });
        return rows;
    }

    function drawLeft(el, state) {
        const head = AB.graphHead("Graph", T().graphName, { trail: h("span", { class: "k-secondary", style: "white-space: nowrap" }, isApril(state) ? "April data" : "March data") });
        const treebar = AB.treebar({ menuGo: ["graph-place", "list-menu"] });
        el.append(head, treebar, h("div", { class: "k-scroll" }, AB.tree(treeRows(state), { label: "Paint order" })));
    }

    function drawCanvas(el, state) {
        const april = isApril(state);
        const alt = (april ? "April" : "March") + " transfers colored by Louvain community, sized by degree";
        el.append(h("div", { class: "k-stage", role: "group", tabindex: "0", "aria-label": alt }, AB.drawing(april ? "transactions-april-communities" : "transactions-march-communities", alt)));
    }

    // ---------- after applying the recipe: the new Watchlist row selected ----------
    function drawRight(el) {
        const w = WL();
        el.append(AB.inspector({
            icon: "circle-check", title: "Watchlist", kind: "Set", kindKey: "igs",
            provenance: ["from recipe " + RECIPE.name, "full-canvas-modes", "version-history"],
            menu: ["context-menus", "row"],
            onRename: (name) => AB.flash("Renamed to " + name),
            tab: "Data",
            tabs: {
                Style: () => [
                    AB.paintsLine("Paints " + AB.count(w.inCurrentData, "node"), ["recipe-apply", "applied"]),
                    AB.styleTab({ kinds: ["node"], set: { "node.outline": "#1A1A1A" }, kind: "node" }),
                ],
                Data: () => [
                    AB.section({ title: "Summary", collapsible: true, key: "data.set.summary", summary: AB.count(w.inCurrentData, "member", { of: w.members }) + " in this data" },
                        AB.data("Members", String(w.members)), AB.data("In this data", String(w.inCurrentData)), AB.data("Not in this data", w.notInCurrentData.join(", "))),
                    AB.section({ title: "Members", collapsible: true, key: "data.set.members", summary: AB.count(w.inCurrentData, "member") + " in this data" },
                        w.memberIds.filter((id) => !w.notInCurrentData.includes(id)).map((id) => AB.row({ label: h("span", { class: "k-id" }, id), onClick: () => AB.flash("Selects " + id) }))),
                    AB.section({ title: "Made with", collapsible: true, key: "data.set.made-with", summary: "Opened by this recipe, " + RECIPE.name },
                        AB.data("Created from", "Opened by this recipe, " + RECIPE.name + ", applied " + RECIPE.appliedAt, { go: ["full-canvas-modes", "version-history"] }),
                        AB.data("Recipe file", RECIPE.file + ", " + savedLine(RECIPE).replace("Saved", "saved")),
                        AB.data("Members", "Fixed: they do not follow the data")),
                    AB.notesSection(0, ["notes-place", "about-selection"], "set"),
                ],
            },
        }));
    }

    registerSection({
        id: "recipe-apply",
        title: "Apply file",
        region: "overlay",
        rail: "graph",
        closeTo: "graph-place/at-rest",
        frame: (state) => (state === "wide-mismatch" ? { dataset: "wide", left: "graph-place/at-rest", dock: false } : {
            dataset: "transactions",
            left: "recipe-apply/" + state,
            canvas: "recipe-apply/" + state,
            right: state === "applied" ? "recipe-apply/" + state : "inspector-nothing-selected/transfers",
            dock: false,
        }),
        states: [
            { id: "binding", label: "Recipe: every attribute matched (March)" },
            { id: "mismatch", label: "Recipe: a missing attribute to choose (April)" },
            { id: "applied", label: "Recipe applied: rows on top" },
            { id: "style-unbound", label: "Style file: a layer that cannot bind (April)" },
            { id: "older-style-file", label: "Older (1.x) style file" },
            { id: "wide-mismatch", label: "Recipe on 69 attributes: two renamed, chosen from the field list" },
        ],
        render(el, state, ctx) {
            if (ctx.region === "left") return drawLeft(el, state);
            if (ctx.region === "canvas") return drawCanvas(el, state);
            if (ctx.region === "right") return drawRight(el);
            if (state === "older-style-file") return el.append(legacyDialog());
            if (state === "applied") return el.append(AB.notice(RECIPE.name + " added " + AB.count(recipeRows(true).length, "row") + " on top of the tree", { label: "Undo", go: ["recipe-apply", "mismatch"] }));
            el.append(dialog(state));
        },
    });
})();
