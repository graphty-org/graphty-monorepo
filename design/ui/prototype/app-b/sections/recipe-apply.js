/* Apply recipe or style file: the binding step. Opened from File > Apply recipe or style file...,
   Quick actions, or by dropping a file. For a recipe: Lists each attribute the recipe needs (level icon, the matching attribute in this data;
   a mismatch must be confirmed, never skipped), the rows it adds on top of the tree, and where it
   fetches from. Applying adds the rows on top, each marked "from recipe" in its Provenance and
   recorded in Version history.
   The recipe (Mule ring triage, saved by Dana Reyes) is the gallery's (screens/replace-and-recipe
   .html); the data facts are kit/fixtures.json: March accounts carry alertRule, April's accounts
   file has only id, kind, country, riskScore and flagged, and 7 of the Watchlist's 9 accounts are
   in April. So "all matched" is the March graph and "mismatch" is the April graph.
   This section also draws the left panel, canvas and (after applying) the inspector, so the tree
   and the drawing are the transfers graph the dialog talks about.
   A style file (structure-b-refined.md 12.2) asks On top or Replace my style; replacing is today a
   removal plus an apply. Layers that cannot bind arrive switched off, listed from graphty-element's
   unbound report (April has no alertRule). An older (1.x) style file: graphty-element ignores its
   layers, and the dialog lists the settings it carries with where each now lives. Plain ASCII. */
(function () {
    "use strict";
    const AB = window.AB;
    const { h, icon, link } = window;

    const css = `
.ra-modal { width: 760px; max-width: calc(100vw - 32px); max-height: calc(100vh - 96px); }
.ra-door { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-height: 36px; padding: 6px 16px; border-bottom: 1px solid var(--cm-border); background: var(--cm-bg-secondary); }
.ra-door .k-i { color: var(--cm-text-secondary); }
.ra-door a { color: var(--cm-text-brand); }
.ra-sh { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 16px; margin-top: 6px; font-weight: 550; }
.ra-sh .k-secondary { font-weight: 450; }
.ra-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) 20px minmax(0, 1.2fr) minmax(0, 1.4fr); gap: 0 10px; align-items: center; padding: 0 16px; }
.ra-grid > .k-caption { color: var(--cm-text-secondary); height: 20px; display: flex; align-items: end; }
.ra-cell { display: flex; align-items: center; gap: 6px; min-height: 36px; min-width: 0; border-top: 1px solid var(--cm-border); }
.ra-cell .k-secondary { font-size: 11px; line-height: 14px; }
.ra-cell.ra-stack { flex-direction: column; align-items: flex-start; justify-content: center; gap: 0; padding: 4px 0; }
.ra-lvl { display: inline-grid; place-items: center; min-width: 26px; height: 20px; padding: 0 3px; box-sizing: border-box; border-radius: 5px; font-size: 10px; font-weight: 650; color: var(--cm-text-secondary); box-shadow: inset 0 0 0 1px var(--cm-border); flex: none; }
.ra-lvl svg { width: 13px; height: 13px; }
.ra-arrow { color: var(--cm-text-tertiary); display: grid; place-items: center; border-top: 1px solid var(--cm-border); min-height: 36px; }
.ra-ok { color: var(--cm-text-secondary); }
.ra-ok .k-i { color: var(--cm-text-success, var(--cm-text-secondary)); }
.ra-miss { grid-column: 1 / -1; margin: 4px 0 8px; padding: 8px 12px; border-radius: 8px; display: grid; gap: 6px; box-shadow: inset 0 0 0 1px var(--cm-border), inset 3px 0 0 var(--cm-bg-warning); }
.ra-miss[data-done] { box-shadow: inset 0 0 0 1px var(--cm-border), inset 3px 0 0 var(--cm-border-strong); }
.ra-miss-head { display: flex; gap: 8px; align-items: center; }
.ra-miss .k-field { width: 280px; max-width: 100%; box-sizing: border-box; }
.ra-rows { list-style: none; margin: 0; padding: 0 16px; }
.ra-rows li { display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; gap: 2px 8px; align-items: center; padding: 6px 0; border-top: 1px solid var(--cm-border); }
.ra-rows li > .k-i, .ra-rows li > .ab-abc { color: var(--cm-text-secondary); justify-self: center; }
.ra-rows .ra-sub { grid-column: 2 / -1; color: var(--cm-text-secondary); font-size: 11px; line-height: 14px; }
.ra-rows .ra-band { color: var(--cm-text-secondary); font-size: 11px; white-space: nowrap; }
.ra-rows li[data-off] .ra-name { color: var(--cm-text-secondary); text-decoration: line-through; }
.ra-p { padding: 2px 16px 4px; color: var(--cm-text-secondary); line-height: 18px; }
.ra-p b { color: var(--cm-text); font-weight: 550; }
.ra-ids { font-family: var(--cm-font-mono, monospace); font-size: 11px; }
.ra-foot { justify-content: flex-start !important; height: auto !important; min-height: 48px; flex-wrap: wrap; padding-block: 8px !important; }
.ra-reason { color: var(--cm-text-secondary); display: inline-flex; gap: 6px; align-items: center; min-width: 0; }
.ra-reason a { color: var(--cm-text-brand); }
.ra-toast { position: absolute; left: 50%; bottom: 96px; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; white-space: nowrap; pointer-events: auto; }
.ra-oq { margin: 4px 16px; }
.ra-choice { padding: 4px 16px 6px; display: grid; gap: 6px; }
.ra-choice .k-seg { width: 320px; max-width: 100%; }
.ra-choice .k-seg > * { cursor: pointer; }
.ra-cap { padding: 0 16px 2px; color: var(--cm-text-tertiary); font-size: 11px; }
.ra-rows li[data-gone] .ra-name { color: var(--cm-text-secondary); text-decoration: line-through; }
.ra-set { list-style: none; margin: 0; padding: 0 16px; }
.ra-set li { display: grid; grid-template-columns: 20px minmax(0, 1fr) minmax(0, 1.3fr) 28px; gap: 2px 10px; align-items: center; min-height: 36px; padding: 4px 0; border-top: 1px solid var(--cm-border); }
.ra-set li > .k-i { color: var(--cm-text-secondary); justify-self: center; }
.ra-set .ra-val { font-family: var(--cm-font-mono, monospace); font-size: 11px; color: var(--cm-text-secondary); }
.ra-set .ra-home { display: flex; flex-direction: column; min-width: 0; }
.ra-set .ra-home a { color: var(--cm-text-brand); }
.ra-set .ra-home .k-secondary { font-size: 11px; line-height: 14px; }
.ra-set .k-switch { cursor: pointer; justify-self: end; }
.ra-set li[data-off] .ra-home > :first-child { color: var(--cm-text-secondary); }
@media (max-width: 720px) { .ra-set li { grid-template-columns: 20px minmax(0, 1fr) 28px; } .ra-set .ra-home { grid-column: 2 / 3; } }
`;
    if (!document.getElementById("ra-style")) document.head.append(h("style", { id: "ra-style" }, css));

    const T = () => AB.fx.datasets.transactions;
    const TA = () => AB.fx.datasets.transactionsApril;
    const n = (x) => Number(x).toLocaleString("en-US");
    const oq = (text) => h("span", { class: "k-annot-tag", title: "Open question" }, "Open question: " + text);

    const RECIPE = { name: "Mule ring triage", file: "mule-ring-triage.graphty", savedBy: "Dana Reyes", savedAt: "Mar 28 2026, 10:14", madeOn: "transfers-2026-03.csv", appliedAt: "today 09:31", note: "24 hours follows the team's AML playbook" };

    function lvl(level, tip) {
        const glyph = level === "cat" ? "Abc" : level === "time" ? icon("calendar", "sm") : icon("hash", "sm");
        return h("span", { class: "ra-lvl", title: tip }, glyph);
    }
    const LVL_TIP = { cat: "Categorical: names and categories, no order", num: "Quantitative: numbers you can add and compare", time: "Time: dates and times" };

    // What the recipe needs, and who in the recipe reads it
    const NEEDS = [
        { name: "amount", on: "edges", level: "num", extra: "weight", usedBy: "Personalized PageRank from Watchlist" },
        { name: "timestamp", on: "edges", level: "time", usedBy: "Cycles up to 4 transfers" },
        { name: "riskScore", on: "nodes", level: "num", usedBy: "riskScore (node color)" },
        { name: "alertRule", on: "nodes", level: "cat", usedBy: "alertRule (groups)" },
    ];

    // The rows it adds, top to bottom
    function addedRows(april) {
        const w = TA().watchlist;
        return [
            { kind: "circle-check", name: "Watchlist", band: april ? w.inCurrentData + " of " + w.members + " accounts" : w.members + " accounts", sub: "A set the recipe carries, by account id. Paints an outline ring on its accounts." },
            { kind: "chart-column", name: "Personalized PageRank from Watchlist", band: "Runs at once", sub: "Reads amount as the weight. Paints node size, on the accounts it scores." },
            { kind: "route", name: "Cycles up to 4 transfers", band: "A few minutes", sub: "Reads timestamp. Arrives not run, with Rerun, so applying stays quick. Carries 1 note: \"" + RECIPE.note + "\"" },
            { kind: "hash", name: "riskScore", band: "Paints at once", sub: "Node color, a ramp over the bank's own score." },
            { kind: h("span", { class: "ab-abc" }, "Abc"), name: "alertRule", band: "Paints at once", sub: "One group per alert rule; paints only accounts that have an alert.", key: "alertRule" },
        ];
    }

    // ---------- the dialog ----------
    function dialog(state) {
        const april = state !== "binding";
        const data = april ? { file: TA().files.accounts.file, cols: TA().files.accounts.columns, graph: "Transfers, April", nodes: TA().nodes } : { file: T().accountsFile, graph: "Transfers, March", nodes: T().nodes };
        const st = { choice: null };

        const door = h("div", { class: "ra-door" },
            icon("book-open", "sm"),
            h("b", null, RECIPE.file),
            h("span", { class: "k-secondary" }, "Saved by " + RECIPE.savedBy + ", " + RECIPE.savedAt + ". Made on " + RECIPE.madeOn + ". Carries no data."),
            h("span", { class: "k-grow" }),
            link("main-menu", "file", "Choose another recipe"));

        // attributes
        const grid = h("div", { class: "ra-grid", role: "table", "aria-label": "Attributes the recipe needs" },
            h("span", { class: "k-caption" }, "The recipe needs"), h("span", { class: "k-caption" }), h("span", { class: "k-caption" }, "In " + data.graph), h("span", { class: "k-caption" }, "Read by"));
        let unresolved = 0;
        let missBox = null;
        NEEDS.forEach((a) => {
            const missing = april && a.name === "alertRule";
            grid.append(
                h("div", { class: "ra-cell ra-stack" }, h("span", { class: "k-flex", style: "display:flex;gap:6px;align-items:center" }, lvl(a.level, LVL_TIP[a.level]), h("b", null, a.name)), h("span", { class: "k-secondary" }, "on " + a.on + (a.extra ? ", " + a.extra : ""))),
                h("span", { class: "ra-arrow" }, icon("arrow-right", "sm")),
                missing
                    ? h("div", { class: "ra-cell" }, icon("triangle-alert", "sm"), h("span", null, "No match"))
                    : h("div", { class: "ra-cell ra-stack" }, h("span", { style: "display:flex;gap:6px;align-items:center" }, lvl(a.level, LVL_TIP[a.level]), a.name), h("span", { class: "k-secondary ra-ok" }, "Matched by name and level")),
                h("div", { class: "ra-cell k-secondary" }, a.usedBy));
            if (missing) {
                unresolved++;
                missBox = h("div", { class: "ra-miss" });
                grid.append(missBox);
            }
        });

        // rows it adds
        const rowsList = h("ul", { class: "ra-rows", "aria-label": "Rows it adds" });
        const drawRows = () => {
            rowsList.replaceChildren(...addedRows(april).map((r) => {
                const off = r.key === "alertRule" && st.choice === "unbound";
                const li = h("li", { "data-off": off ? "" : null },
                    typeof r.kind === "string" ? icon(r.kind) : r.kind,
                    h("span", { class: "ra-name k-ellipsis" }, r.name),
                    h("span", { class: "ra-band" }, off ? "Added switched off" : r.band),
                    h("span", { class: "ra-sub" }, off ? "Kept and switched off, marked missing attribute, until you bind it." : r.sub));
                return li;
            }));
        };
        drawRows();

        // footer
        const applyBtn = AB.button("Apply", { onClick: () => { if (!(unresolved && !st.choice)) AB.go("recipe-apply", "applied"); } });
        const reason = h("span", { class: "ra-reason k-grow" });
        const drawFoot = () => {
            const blocked = unresolved && !st.choice;
            applyBtn.setAttribute("aria-disabled", blocked ? "true" : "false");
            reason.replaceChildren(blocked
                ? h("span", null, icon("triangle-alert", "sm"), " Apply is off until alertRule has an attribute or is left unbound.")
                : h("span", null, "Adds 5 rows on top of the tree as one undo step, recorded in ", link("full-canvas-modes", "version-history", "Version history"), "."));
        };

        const drawMiss = () => {
            if (!missBox) return;
            const cols = data.cols.filter((c) => !["id", "riskScore"].includes(c));
            const f = AB.field(st.choice === "unbound" ? "Leave unbound" : st.choice || "Choose an attribute", {
                caret: true,
                onClick: (e) => {
                    if (st.menu) st.menu.remove();
                    const pick = (c) => { st.choice = c; st.menu.remove(); st.menu = null; drawMiss(); drawRows(); drawFoot(); };
                    const m = (st.menu = AB.menu({
                        anchor: e.currentTarget, place: "below-start",
                        items: [
                            { heading: "Categorical attributes in " + data.graph },
                            ...cols.map((c) => ({ label: c, check: st.choice === c, onClick: () => pick(c) })),
                            { sep: true },
                            { label: "Leave unbound", desc: "The row is added, switched off and marked missing attribute", check: st.choice === "unbound", onClick: () => pick("unbound") },
                        ],
                    }));
                    document.getElementById("ab-overlay").append(m);
                },
            });
            missBox.toggleAttribute("data-done", !!st.choice);
            missBox.replaceChildren(
                h("div", { class: "ra-miss-head" }, icon(st.choice ? "circle-check" : "triangle-alert", "sm"), h("b", null, "alertRule is not in this data"), h("span", { class: "k-grow" })),
                h("span", { class: "k-secondary" }, "The recipe was made on data whose accounts carried alertRule. " + data.file + " has " + data.cols.join(", ") + ". Only categorical attributes are offered; only the sender knows which one was meant."),
                f);
        };
        drawMiss();
        drawFoot();

        const w = TA().watchlist;
        const body = h("div", null,
            door,
            h("div", { class: "ra-sh" }, "Attributes it needs", h("span", { class: "k-secondary" }, april ? "3 of 4 matched" : "4 of 4 matched")),
            grid,
            april ? h("p", { class: "ra-p" }, h("b", null, "Watchlist: " + w.inCurrentData + " of " + w.members + " accounts are in this data. "), h("span", { class: "ra-ids" }, w.notInCurrentData.join(", ")), " are not; they stay in the set as missing members, and a later data version that holds them brings them back.") : null,
            h("div", { class: "ra-sh" }, "Rows it adds, on top of the tree", h("span", { class: "k-secondary" }, "5 rows and 1 note")),
            h("p", { class: "ra-p" }, "Higher rows win, property by property. Each row paints only the elements it has a value for; everything else keeps the look your rows give it."),
            rowsList,
            h("div", { class: "ra-sh" }, "Fetches from"),
            h("p", { class: "ra-p" }, "Nothing. This recipe reads only " + data.graph + "."),
            h("div", { class: "ra-oq" }, oq("how a recipe that fetches from an address names it and asks before applying")));

        const foot = h("div", { class: "ra-foot-inner", style: "display:contents" }, reason, AB.button("Cancel", { kind: "secondary", go: ["graph-place", "at-rest"] }), applyBtn);
        const wrap = AB.modal({ title: "Apply recipe: " + RECIPE.name, body, foot, wide: true });
        wrap.querySelector(".k-modal").classList.add("ra-modal");
        wrap.querySelector(".k-modal-foot").classList.add("ra-foot");
        return wrap;
    }

    // ---------- the tree behind it ----------
    const MARCH = ["binding", "style-on-top-or-replace", "style-applied", "style-replaced", "older-style-file"];
    const isApril = (state) => !MARCH.includes(state);
    function treeRows(state) {
        const april = isApril(state);
        const L = TA().legends[april ? "april" : "march"];
        const top3 = L.rows.slice(0, 3).map((r) => AB.chit(r.color, true));
        const louvain = {
            name: "Louvain, weighted by amount", kindIcon: "layers", swatch: h("span", { class: "ab-multi" }, top3), eye: true, open: false,
            go: ["inspector-run-row", april ? "earlier-results" : "many-groups"], menu: ["context-menus", "run-row"],
            children: L.rows.map((r) => ({ name: r.name, kindIcon: "circle-dot", swatch: AB.chit(r.color, true), count: n(r.count), eye: true, go: ["inspector-run-row", april ? "earlier-results" : "many-groups"], menu: ["context-menus", "row"] })),
        };
        if (state === "style-replaced") Object.assign(louvain, { swatch: null, count: "No paint", children: [] });
        const rows = [
            { name: "Selection", kindIcon: "scan", pinned: true, builtin: true, count: "Nothing selected", eye: true, go: ["inspector-selection-and-everything", "selection"] },
            { name: "Notes", kindIcon: "message-square", pinned: true, builtin: true, count: "No notes", eye: true, go: ["inspector-selection-and-everything", "notes-row"], menu: ["context-menus", "notes-row"] },
        ];
        if (state === "applied") {
            const w = TA().watchlist;
            rows.push(
                { name: "Watchlist", kindIcon: "circle-check", count: w.inCurrentData + " of " + w.members, eye: true, selected: true, go: ["recipe-apply", "applied"], menu: ["context-menus", "row"] },
                { name: "Personalized PageRank from Watchlist", kindIcon: "chart-column", swatch: AB.ramp(), eye: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
                { name: "Cycles up to 4 transfers", kindIcon: "route", count: "Not run", notes: 1, eye: null, go: ["inspector-run-row", "data"], menu: ["context-menus", "run-row"] },
                { name: "riskScore", kindIcon: "hash", swatch: AB.ramp(), eye: true, go: ["inspector-measure-row", "risk-score"], menu: ["context-menus", "measure-row"] },
                { name: "alertRule", kindIcon: h("span", { class: "ab-abc" }, "Abc"), count: "Unbound", eye: false, dim: true, go: ["inspector-group-set-path-row", "style"], menu: ["context-menus", "row"] },
            );
        }
        if (STYLE_APPLIED[state]) rows.push(...styleRows(state));
        rows.push(louvain, { name: "Everything", kindIcon: "square-filled", pinned: true, builtin: true, eye: true, go: ["inspector-selection-and-everything", "everything"], menu: ["context-menus", "row"] });
        return rows;
    }

    function drawLeft(el, state) {
        const april = isApril(state);
        const switcher = h("div", { class: "ab-switcher" },
            h("span", Object.assign({ class: "ab-switch-btn", role: "button", "aria-haspopup": "menu", title: "Graphs in this project" }, AB.act({ go: ["graphs-switcher", "open"] })), icon("network"), h("span", { class: "k-ellipsis" }, T().graphName), icon("chevron-down", "sm")),
            h("span", { class: "k-grow" }),
            h("span", { class: "k-secondary" }, april ? "April data" : "March data"));
        const treebar = h("div", { class: "ab-treebar" }, AB.field("Find rows and notes", { icon: "search", go: ["graph-place", "find"] }), AB.iconButton("list-filter", "List options", { go: ["graph-place", "list-menu"] }));
        const rows = treeRows(state);
        const tree = AB.tree(rows, { label: "Paint order" });
        const scroll = h("div", { class: "k-scroll" }, tree);
        el.append(AB.placeHead("Graph"), switcher, treebar, scroll);
    }

    function drawCanvas(el, state) {
        const april = isApril(state);
        const alt = april ? "April transfers colored by Louvain community, sized by degree" : "March transfers, 3,000 accounts colored by Louvain community, sized by degree";
        el.append(h("div", { class: "k-stage", tabindex: "0", "aria-label": alt }, (STYLE_APPLIED[state] ? AB.drawing(STYLE_APPLIED[state].drawing, "Transfers with flagged accounts ringed") : AB.drawing(april ? "transactions-april-communities" : "transactions-march-communities", alt))),
            h("div", { class: "ab-canvas-corner" }, AB.cameraFace()));
    }

    // ---------- a style file (2.x): On top or Replace my style ----------
    const STYLE = { name: "Risk review look", file: "risk-review-look.json", savedBy: "Dana Reyes", savedAt: "Mar 30 2026, 16:02", madeOn: "transfers-2026-03.csv" };
    // The layers it carries, top first. alertRule is not in April's accounts file (fixtures), so
    // in April that layer cannot bind.
    function styleLayers() {
        const t = T();
        const flagged = t.attributes.find((a) => a.name === "flagged").values.true;
        const alerts = Object.values(t.attributes.find((a) => a.name === "alertRule").values).reduce((x, y) => x + y, 0);
        return [
            { id: "alertRule", icon: h("span", { class: "ab-abc" }, "Abc"), name: "alertRule", paints: "Node label, the alert rule's text", march: n(alerts) + " accounts with an alert" },
            { id: "flagged", icon: "circle-check", name: "flagged", paints: "Node outline, a ring", march: n(flagged) + " flagged accounts" },
            { id: "riskScore", icon: "hash", name: "riskScore", paints: "Node size, a range over 0 to 100", march: n(t.nodes) + " accounts" },
            { id: "kind", icon: h("span", { class: "ab-abc" }, "Abc"), name: "kind", paints: "Node color, one color per kind (merchant, business, personal)", march: n(t.nodes) + " accounts" },
            { id: "amount", icon: "hash", name: "amount", paints: "Edge width, thicker for larger transfers", march: n(t.edges) + " transfers" },
        ];
    }

    function styleDialog(state) {
        const april = state === "unbound-layers";
        const graph = april ? "Transfers, April" : "Transfers, March";
        const st = { mode: "top" };
        const door = h("div", { class: "ra-door" },
            icon("palette", "sm"),
            h("b", null, STYLE.file),
            h("span", { class: "k-secondary" }, "Style file. Saved by " + STYLE.savedBy + ", " + STYLE.savedAt + ". Made on " + STYLE.madeOn + ". Carries no data and no runs."),
            h("span", { class: "k-grow" }),
            link("main-menu", "file", "Choose another file"));

        // On top or Replace my style
        const seg = h("span", { class: "k-seg k-seg-fill k-span", role: "radiogroup", "aria-label": "How the style lands" });
        const explain = h("div");
        const replaced = h("ul", { class: "ra-rows", "aria-label": "What Replace removes" });
        const drawChoice = () => {
            seg.replaceChildren(...[["top", "On top"], ["replace", "Replace my style"]].map(([id, label]) =>
                h("span", { role: "radio", tabindex: "0", "aria-checked": String(st.mode === id), on: { click: () => { st.mode = id; drawChoice(); drawFoot(); }, keydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); st.mode = id; drawChoice(); drawFoot(); } } } }, label)));
            if (st.mode === "top") {
                explain.replaceChildren(h("p", { class: "ra-p" }, "The file's layers go on top of the tree as rows. Your rows stay and keep painting underneath; where both set the same property, the file's row wins because it is higher."));
                replaced.replaceChildren();
            } else {
                explain.replaceChildren(
                    h("p", { class: "ra-p" }, h("b", null, "Replace is a removal, then an apply. "), "First every row's paint is removed, then the file's layers are added. Both steps are one undo step and one line in Version history."),
                    h("div", { class: "ra-sh" }, "Removed first", h("span", { class: "k-secondary" }, "your paint, not your results")));
                replaced.replaceChildren(
                    h("li", { "data-gone": "" }, icon("layers"), h("span", { class: "ra-name k-ellipsis" }, "Louvain, weighted by amount: its community colors"), h("span", { class: "ra-band" }, "Stops painting"),
                        h("span", { class: "ra-sub" }, "The run, its communities and its notes stay in the tree and in Data. Restore the suggested look in its menu paints them again.")),
                    h("li", { "data-gone": "" }, icon("square-filled"), h("span", { class: "ra-name k-ellipsis" }, "Everything: the look you set"), h("span", { class: "ra-band" }, "Back to defaults"),
                        h("span", { class: "ra-sub" }, "What is not in the file shows graphty-element's defaults.")));
            }
        };

        // the layers
        const unbound = april ? ["alertRule"] : [];
        const list = h("ul", { class: "ra-rows", "aria-label": "Layers it adds" },
            styleLayers().map((l) => {
                const off = unbound.includes(l.id);
                return h("li", { "data-off": off ? "" : null },
                    typeof l.icon === "string" ? icon(l.icon) : l.icon,
                    h("span", { class: "ra-name k-ellipsis" }, l.name),
                    h("span", { class: "ra-band" }, off ? "Arrives switched off" : april ? "Binds by name" : l.march),
                    h("span", { class: "ra-sub" }, off
                        ? ["graphty-element reports: no attribute named alertRule in " + graph + " (", TA().files.accounts.file, " has " + TA().files.accounts.columns.join(", ") + "). The row is added switched off and marked missing attribute; bind it later from its ", link("style-pickers", "bind", "Style tab"), "."]
                        : l.paints));
            }));

        const applyBtn = AB.button("Apply", { onClick: () => AB.go("recipe-apply", april ? "style-unbound-applied" : st.mode === "top" ? "style-applied" : "style-replaced") });
        const reason = h("span", { class: "ra-reason k-grow" });
        const drawFoot = () => {
            reason.replaceChildren(h("span", null,
                st.mode === "top" ? "Adds 5 rows on top of the tree" + (april ? ", 1 of them switched off," : "") + " as one undo step, recorded in " : "Removes your paint, then adds 5 rows, as one undo step, recorded in ",
                link("full-canvas-modes", "version-history", "Version history"), "."));
        };
        drawChoice();
        drawFoot();

        const body = h("div", null,
            door,
            h("div", { class: "ra-sh" }, "How it lands"),
            h("div", { class: "ra-choice" }, seg),
            explain,
            replaced,
            h("div", { class: "ra-sh" }, "Layers it adds, on top of the tree", h("span", { class: "k-secondary" }, april ? "4 bind, 1 cannot" : "5 layers, all bind")),
            h("p", { class: "ra-p" }, "Each layer paints only the elements that carry its attribute; everything else keeps the look the rows beneath give it."),
            list,
            april ? h("div", { class: "ra-cap" }, "The switched-off layer is listed from graphty-element's unbound report.") : null,
            april ? h("div", { class: "ra-oq" }, oq("whether graphty-element can report unbound layers before applying; today the report comes back from the apply")) : null,
            h("div", { class: "ra-oq" }, oq("Replace in one step: an option on graphty-element's applyTemplate is filed; until then the app removes, then applies")));

        const foot = h("div", { style: "display:contents" }, reason, AB.button("Cancel", { kind: "secondary", go: ["graph-place", "at-rest"] }), applyBtn);
        const wrap = AB.modal({ title: "Apply style file: " + STYLE.name, body, foot, wide: true });
        wrap.querySelector(".k-modal").classList.add("ra-modal");
        wrap.querySelector(".k-modal-foot").classList.add("ra-foot");
        return wrap;
    }

    // ---------- an older (1.x) style file ----------
    const LEGACY = { file: "transfers-look-2025.json", made: "graphty-element 1.x" };
    const LEGACY_SETTINGS = [
        { id: "mode", icon: "box", name: "View mode", val: "2D", home: "Toolbar > View mode", go: ["toolbar", "view-mode"], note: "The graph's view mode; this graph is in 3D.", use: true },
        { id: "layout", icon: "network", name: "Layout", val: "ngraph", home: "Graph overview > Layout", go: ["inspector-nothing-selected", "transfers-methods"], note: "Lays the graph out again at once.", use: true, oq: "which 2.x method each 1.x layout name maps to" },
        { id: "ids", icon: "link", name: "Id paths", val: "id, from_account, to_account", home: "Data > the source's Re-map columns...", go: ["load-step", "remap"], note: "Needs a reload, so it is not applied here. This graph already reads the same columns.", use: null },
        { id: "bg", icon: "palette", name: "Background", val: "#101820", home: "Graph overview > Canvas", go: ["inspector-nothing-selected", "canvas"], note: "A color; not a layer.", use: true },
    ];
    function legacyDialog() {
        const use = {};
        LEGACY_SETTINGS.forEach((s) => { use[s.id] = s.use; });
        const count = () => LEGACY_SETTINGS.filter((s) => use[s.id]).length;
        const list = h("ul", { class: "ra-set", "aria-label": "Settings the file carries" });
        const applyBtn = AB.button("Apply settings", { onClick: () => { if (count()) AB.go("inspector-nothing-selected", "transfers"); } });
        const reason = h("span", { class: "ra-reason k-grow" });
        const draw = () => {
            list.replaceChildren(...LEGACY_SETTINGS.map((s) => {
                const sw = s.use === null ? h("span") : h("span", { class: "k-switch", role: "switch", tabindex: "0", "aria-checked": String(!!use[s.id]), "aria-label": "Apply " + s.name,
                    on: { click: () => { use[s.id] = !use[s.id]; draw(); }, keydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); use[s.id] = !use[s.id]; draw(); } } } });
                return h("li", { "data-off": s.use !== null && !use[s.id] ? "" : null },
                    icon(s.icon, "sm"),
                    h("span", { class: "ra-home" }, h("b", null, s.name), h("span", { class: "ra-val" }, s.val)),
                    h("span", { class: "ra-home" }, h("span", null, "Now lives in ", link(s.go[0], s.go[1], s.home)), h("span", { class: "k-secondary" }, s.note), s.oq ? oq(s.oq) : null),
                    sw);
            }));
            const c = count();
            applyBtn.setAttribute("aria-disabled", c ? "false" : "true");
            applyBtn.textContent = c ? "Apply " + c + " setting" + (c === 1 ? "" : "s") : "Apply settings";
            reason.replaceChildren(h("span", null, c ? "Writes each setting to its home as one undo step, recorded in " : "Nothing is switched on. ", c ? link("full-canvas-modes", "version-history", "Version history") : null, c ? "." : ""));
        };
        draw();
        const body = h("div", null,
            h("div", { class: "ra-door" }, icon("history", "sm"), h("b", null, LEGACY.file), h("span", { class: "k-secondary" }, "An older style file, made with " + LEGACY.made + "."), h("span", { class: "k-grow" }), link("main-menu", "file", "Choose another file")),
            h("div", { class: "ra-sh" }, icon("triangle-alert", "sm"), "Its style layers are not applied"),
            h("p", { class: "ra-p" }, "graphty-element ignores the style layers in a 1.x file, so no rows are added and nothing is painted. To keep that look, rebuild it as rows and save it again with Export > Style."),
            h("div", { class: "ra-sh" }, "Settings it carries", h("span", { class: "k-secondary" }, "each with where it lives now")),
            list);
        const foot = h("div", { style: "display:contents" }, reason, AB.button("Cancel", { kind: "secondary", go: ["graph-place", "at-rest"] }), applyBtn);
        const wrap = AB.modal({ title: "Apply style file: " + LEGACY.file + " (older format)", body, foot, wide: true });
        wrap.querySelector(".k-modal").classList.add("ra-modal");
        wrap.querySelector(".k-modal-foot").classList.add("ra-foot");
        return wrap;
    }

    // ---------- after applying a style file: its rows on top ----------
    const STYLE_APPLIED = {
        "style-applied": { toast: STYLE.name + " added 5 rows on top of the tree", back: "style-on-top-or-replace", drawing: "transactions-flagged" },
        "style-replaced": { toast: STYLE.name + " replaced your style: 5 rows added, your paint removed", back: "style-on-top-or-replace", drawing: "transactions-flagged" },
        "style-unbound-applied": { toast: STYLE.name + " added 5 rows; alertRule arrived switched off", back: "unbound-layers", drawing: "transactions-april-flagged" },
    };
    function styleRows(state) {
        return styleLayers().map((l) => {
            const off = state === "style-unbound-applied" && l.id === "alertRule";
            return { name: l.name, kindIcon: l.icon, count: off ? "Unbound" : null, swatch: off ? null : l.id === "riskScore" || l.id === "amount" ? AB.ramp() : null, eye: !off, dim: off,
                go: ["inspector-group-set-path-row", "style"], menu: ["context-menus", "row"] };
        });
    }

    // ---------- after applying: the new Watchlist row selected (the shared set-row frame) ----------
    function drawRight(el) {
        const w = TA().watchlist;
        const sel = (text) => h("a", Object.assign({ class: "ab-link", role: "button" }, AB.act({ onClick: () => AB.flash("Selects the " + w.inCurrentData + " members in this data (not wired in the skeleton)") })), text);
        el.append(AB.inspector({
            icon: "circle-check", title: "Watchlist", kind: "Set", kindKey: "igs",
            provenance: ["from " + RECIPE.name + ", " + RECIPE.appliedAt, "full-canvas-modes", "version-history"],
            menu: ["context-menus", "row"],
            onRename: (name) => AB.flash("Renamed to " + name),
            tab: "Data",
            tabs: {
                Style: () => [
                    h("div", { class: "igs-paints" }, h("span", { class: "k-secondary" }, "Paints "), "members of Watchlist: ", sel(w.inCurrentData + " nodes")),
                    AB.styleTab({ kinds: ["node", "edge"], set: { "node.outline": "#1A1A1A" }, kind: "node" }),
                ],
                Data: () => [
                    AB.section({ title: "Summary", collapsible: true, key: "igs.summary", summary: w.inCurrentData + " of " + w.members + " in this data" },
                        AB.data("Members", String(w.members)), AB.data("In this data", String(w.inCurrentData)), AB.data("Not in this data", w.notInCurrentData.join(", "))),
                    AB.section({ title: "Members", actions: sel(w.inCurrentData + " nodes"), collapsible: true, key: "igs.members", summary: "All " + w.inCurrentData + " in this data" },
                        w.memberIds.filter((id) => !w.notInCurrentData.includes(id)).map((id) => AB.row({ label: h("span", { class: "k-id" }, id), onClick: () => AB.flash("Selects " + id + " (not wired in the skeleton)") }))),
                    AB.section({ title: "Made with", collapsible: true, key: "igs.madewith", summary: "Recipe " + RECIPE.name },
                        AB.data("Created from", "Recipe " + RECIPE.name + ", applied " + RECIPE.appliedAt, { go: ["full-canvas-modes", "version-history"] }),
                        AB.data("Recipe file", RECIPE.file + ", saved by " + RECIPE.savedBy + ", " + RECIPE.savedAt),
                        AB.data("Members", "Fixed: they do not follow the data")),
                    AB.notesSection(0, ["notes-place", "about-selection"]),
                ],
            },
        }));
    }

    registerSection({
        id: "recipe-apply",
        title: "Apply recipe or style file",
        region: "overlay",
        rail: "graph",
        closeTo: "graph-place/at-rest",
        frame: (state) => ({
            dataset: "transactions",
            left: "recipe-apply/" + state,
            canvas: "recipe-apply/" + state,
            right: state === "applied" ? "recipe-apply/" + state : "inspector-nothing-selected/transfers",
            dock: false,
        }),
        states: [
            { id: "binding", label: "All attributes matched (March)" },
            { id: "mismatch", label: "A mismatch to confirm (April)" },
            { id: "applied", label: "Applied: rows on top" },
            { id: "style-on-top-or-replace", label: "Style file: On top or Replace my style (March)" },
            { id: "unbound-layers", label: "Style file: a layer that cannot bind (April)" },
            { id: "older-style-file", label: "Older (1.x) style file: settings only" },
            { id: "style-applied", label: "Style file applied on top" },
            { id: "style-replaced", label: "Style file applied, replacing my style" },
            { id: "style-unbound-applied", label: "Style file applied, one layer switched off" },
        ],
        render(el, state, ctx) {
            if (ctx.region === "left") return drawLeft(el, state);
            if (ctx.region === "canvas") return drawCanvas(el, state);
            if (ctx.region === "right") return drawRight(el);
            if (state === "style-on-top-or-replace" || state === "unbound-layers") return el.append(styleDialog(state));
            if (state === "older-style-file") return el.append(legacyDialog());
            if (STYLE_APPLIED[state]) {
                const a = STYLE_APPLIED[state];
                el.append(h("div", { class: "k-toast ra-toast", role: "status" }, a.toast,
                    h("span", Object.assign({ class: "k-toast-action", role: "button" }, AB.act({ go: ["recipe-apply", a.back] })), "Undo"),
                    h("span", Object.assign({ class: "k-toast-action", role: "button" }, AB.act({ go: ["full-canvas-modes", "version-history"] })), "Version history")));
                return;
            }
            if (state === "applied") {
                el.append(h("div", { class: "k-toast ra-toast", role: "status" },
                    RECIPE.name + " added 5 rows on top of the tree",
                    h("span", Object.assign({ class: "k-toast-action", role: "button" }, AB.act({ go: ["recipe-apply", "mismatch"] })), "Undo"),
                    h("span", Object.assign({ class: "k-toast-action", role: "button" }, AB.act({ go: ["full-canvas-modes", "version-history"] })), "Version history")));
                return;
            }
            el.append(dialog(state));
        },
    });
})();
