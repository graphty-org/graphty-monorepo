/* Apply a recipe: the binding step. Opened from Recipes > Apply recipe... or by dropping a recipe
   file. Lists each attribute the recipe needs (level icon, the matching attribute in this data;
   a mismatch must be confirmed, never skipped), the rows it adds on top of the tree, and where it
   fetches from. Applying adds the rows on top, each marked "from recipe" in its Provenance and
   recorded in Version history.
   The recipe (Mule ring triage, saved by Dana Reyes) is the gallery's (screens/replace-and-recipe
   .html); the data facts are kit/fixtures.json: March accounts carry alertRule, April's accounts
   file has only id, kind, country, riskScore and flagged, and 7 of the Watchlist's 9 accounts are
   in April. So "all matched" is the March graph and "mismatch" is the April graph.
   This section also draws the left panel, canvas and (after applying) the inspector, so the tree
   and the drawing are the transfers graph the dialog talks about. Plain ASCII. */
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
.ra-prov { padding: 2px 16px 8px; line-height: 18px; }
.ra-prov .k-secondary { display: block; }
.ra-oq { margin: 4px 16px; }
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
        { name: "amount", on: "edges", level: "num", extra: "weight: capacity", usedBy: "Personalized PageRank from Watchlist" },
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
            link("main-menu", "recipes", "Choose another recipe"));

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
    function treeRows(state) {
        const april = state !== "binding";
        const L = TA().legends[april ? "april" : "march"];
        const top3 = L.rows.slice(0, 3).map((r) => AB.chit(r.color, true));
        const louvain = {
            name: "Louvain, weighted by amount", kindIcon: "layers", swatch: h("span", { class: "ab-multi" }, top3), eye: true, open: false,
            go: ["inspector-run-row", april ? "earlier-results" : "many-groups"], menu: ["context-menus", "run-row"],
            children: L.rows.map((r) => ({ name: r.name, kindIcon: "circle-dot", swatch: AB.chit(r.color, true), count: n(r.count), eye: true, go: ["inspector-run-row", april ? "earlier-results" : "many-groups"], menu: ["context-menus", "row"] })),
        };
        const rows = [{ name: "Selection", kindIcon: "scan", pinned: true, count: "Nothing selected", eye: true, go: ["inspector-selection-and-everything", "selection"], menu: ["context-menus", "row"] }];
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
        rows.push(louvain, { name: "Everything", kindIcon: "square", pinned: true, eye: true, go: ["inspector-selection-and-everything", "everything"], menu: ["context-menus", "row"] });
        return rows;
    }

    function drawLeft(el, state) {
        const april = state !== "binding";
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
        const april = state !== "binding";
        const alt = april ? "April transfers colored by Louvain community, sized by degree" : "March transfers, 3,000 accounts colored by Louvain community, sized by degree";
        el.append(h("div", { class: "k-stage", tabindex: "0", "aria-label": alt }, AB.drawing(april ? "transactions-april-communities" : "transactions-march-communities", alt)));
    }

    // ---------- after applying: the new Watchlist row selected ----------
    function drawRight(el) {
        const w = TA().watchlist;
        const provenance = () => AB.section("Provenance",
            h("div", { class: "ra-prov" },
                h("span", null, "From recipe " + RECIPE.name + ", applied " + RECIPE.appliedAt + "."),
                h("span", { class: "k-secondary" }, RECIPE.file + ", saved by " + RECIPE.savedBy + ", " + RECIPE.savedAt + "."),
                h("span", { class: "k-secondary" }, "Recorded in ", link("full-canvas-modes", "version-history", "Version history"), ".")));
        el.append(AB.inspector({
            icon: "circle-check", title: "Watchlist", kindKey: "ra-watchlist", tab: "Data",
            tabs: {
                Style: () => h("div", null,
                    AB.section("Look", AB.data("outline", "Ring, from the recipe"),
                        h("div", { style: "padding: 4px 16px" }, link("inspector-group-set-path-row", "style", "Change the look: color, size, outline"))),
                    provenance()),
                Data: () => h("div", null,
                    AB.section("Summary", AB.data("accounts", w.members), AB.data("in April data", w.inCurrentData), AB.data("absent", w.notInCurrentData.join(", "))),
                    AB.section("Membership", h("div", null, w.memberIds.slice(0, 7).map((id) => AB.row({ icon: "user", label: id, go: ["inspector-group-set-path-row", "data"] })))),
                    provenance()),
            },
        }));
    }

    registerSection({
        id: "recipe-apply",
        title: "Apply a recipe",
        region: "overlay",
        rail: "graph",
        closeTo: "graph-place/at-rest",
        frame: (state) => ({
            dataset: "transactions",
            left: "recipe-apply/" + state,
            canvas: "recipe-apply/" + state,
            right: state === "applied" ? "recipe-apply/" + state : "path-tool-graph/nothing-selected",
            dock: false,
        }),
        states: [
            { id: "binding", label: "All attributes matched (March)" },
            { id: "mismatch", label: "A mismatch to confirm (April)" },
            { id: "applied", label: "Applied: rows on top" },
        ],
        render(el, state, ctx) {
            if (ctx.region === "left") return drawLeft(el, state);
            if (ctx.region === "canvas") return drawCanvas(el, state);
            if (ctx.region === "right") return drawRight(el);
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
