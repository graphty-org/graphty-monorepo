/* Apply file: one dialog for a recipe or a style file (structure-b-refined.md 12.2, streamline-3
   "Apply recipe or style file"). Opened from the project-name menu's Apply recipe or style file...,
   Quick actions, or a dropped file. Titled "Apply <kind>: <name>": a file header (name, who saved
   it and when), then one list of the rows the file adds, drawn with the shared AB.tree, each row
   with its binding inline in the count slot -- the matched attribute, or a picker when the data
   lacks it. Apply waits until every mismatch has a choice. A file always lands on top of the tree
   as one undo step (no Replace). An older 1.x style file is one notice and "Apply these settings",
   with each setting a checkbox.
   Data facts are kit/fixtures.json: March accounts carry alertRule; April's accounts file has only
   id, kind, country, riskScore and flagged; 7 of the Watchlist's 9 accounts are in April.
   The section also draws the left panel, canvas and (after applying) the inspector, so the tree
   and the drawing are the transfers graph the dialog talks about. Plain ASCII. */
(function () {
    "use strict";
    const AB = window.AB;
    const { h, icon } = window;

    const css = `
.ra-modal { width: 640px; max-width: calc(100vw - 32px); max-height: calc(100vh - 96px); }
.ra-head { display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 6px 16px; border-bottom: 1px solid var(--cm-border); }
.ra-head .k-i { color: var(--cm-text-secondary); }
.ra-sh { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 16px; margin-top: 4px; font-weight: 550; }
.ra-sh .k-secondary { font-weight: 450; }
.ra-list .ab-trow { cursor: default; }
.ra-list .ab-trow:hover { background: none; }
.ra-list .ab-tcount { display: inline-flex; align-items: center; gap: 4px; }
.ra-bind { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.ra-bind .ra-arrow { color: var(--cm-text-tertiary); }
.ra-list .k-field { width: 180px; height: 24px; box-sizing: border-box; text-align: start; color: var(--cm-text); }
.ra-list .ab-trow[data-miss] .ab-tname { font-weight: 550; }
.ra-foot { justify-content: flex-start !important; flex-wrap: wrap; }
.ra-reason { color: var(--cm-text-secondary); display: inline-flex; gap: 6px; align-items: center; min-width: 0; }
.ra-notice { margin: 12px 16px 4px; padding: 8px 12px; border-radius: 8px; display: flex; gap: 8px; align-items: flex-start; box-shadow: inset 0 0 0 1px var(--cm-border), inset 3px 0 0 var(--cm-bg-warning); line-height: 18px; }
.ra-notice .k-i { margin-top: 3px; flex: none; }
.ra-sets { list-style: none; margin: 0; padding: 0 16px 8px; }
.ra-sets li { display: flex; align-items: center; gap: 10px; height: 32px; border-top: 1px solid var(--cm-border); }
.ra-sets li:first-child { border-top: 0; }
.ra-sets .ra-val { font-family: var(--cm-font-mono, monospace); font-size: 11px; color: var(--cm-text-secondary); margin-inline-start: auto; }
`;
    if (!document.getElementById("ra-style")) document.head.append(h("style", { id: "ra-style" }, css));

    const T = () => AB.fx.datasets.transactions;
    const TA = () => AB.fx.datasets.transactionsApril;
    const n = (x) => Number(x).toLocaleString("en-US");
    const abc = () => h("span", { class: "ab-abc" }, "Abc");

    const RECIPE = { kind: "recipe", name: "Mule ring triage", file: "mule-ring-triage.graphty", savedBy: "Dana Reyes", savedAt: "Mar 28 2026, 10:14", appliedAt: "today 09:31" };
    const STYLE = { kind: "style file", name: "Risk review look", file: "risk-review-look.json", savedBy: "Dana Reyes", savedAt: "Mar 30 2026, 16:02" };
    const LEGACY = { file: "transfers-look-2025.json" };

    // The rows each file adds, top first. `reads` is the attribute it binds to (matched by name and
    // type); `miss` marks the one the April accounts file lacks.
    function recipeRows(april) {
        const w = TA().watchlist;
        return [
            { id: "watchlist", kindIcon: "circle-check", name: "Watchlist", fixed: april ? w.inCurrentData + " of " + w.members + " in this data" : w.members + " accounts",
              fixedTip: april ? w.notInCurrentData.join(" and ") + " are not in this data; they stay in the set as missing members" : "A set the recipe carries, by account id" },
            { id: "ppr", kindIcon: "chart-column", name: "Personalized PageRank from Watchlist", role: "weight", reads: "amount" },
            { id: "cycles", kindIcon: "route", name: "Cycles up to 4 transfers", role: "time", reads: "timestamp", notes: 1 },
            { id: "riskScore", kindIcon: "hash", name: "riskScore", role: "riskScore", reads: "riskScore" },
            { id: "alertRule", kindIcon: abc(), name: "alertRule", role: "alertRule", reads: "alertRule", miss: april },
        ];
    }
    function styleRows(april) {
        return [
            { id: "alertRule", kindIcon: abc(), name: "alertRule", role: "label", reads: "alertRule", miss: april },
            { id: "flagged", kindIcon: "circle-check", name: "flagged", role: "outline", reads: "flagged" },
            { id: "riskScore", kindIcon: "hash", name: "riskScore", role: "size", reads: "riskScore" },
            { id: "kind", kindIcon: abc(), name: "kind", role: "color", reads: "kind" },
            { id: "amount", kindIcon: "hash", name: "amount", role: "edge width", reads: "amount" },
        ];
    }

    // ---------- the one Apply file dialog ----------
    function dialog(state) {
        const isStyle = state === "style-unbound";
        const april = state !== "binding";
        const file = isStyle ? STYLE : RECIPE;
        const rows = isStyle ? styleRows(april) : recipeRows(april);
        const graph = april ? "Transfers, April" : "Transfers, March";
        const st = { choice: {} };
        const misses = rows.filter((r) => r.miss);
        const open = () => misses.filter((r) => !st.choice[r.id]);
        const matched = rows.filter((r) => r.reads && !r.miss).length;
        const binds = rows.filter((r) => r.reads).length;

        const applyBtn = AB.button("Apply", {
            onClick: () => {
                if (open().length) return;
                if (!isStyle) return AB.go("recipe-apply", "applied");
                AB.go("graph-place", "at-rest");
                setTimeout(() => AB.notice(STYLE.name + " added 5 rows on top of the tree", { label: "Undo", go: ["recipe-apply", "style-unbound"] }), 0);
            },
        });
        const reason = h("span", { class: "ra-reason k-grow" });
        const summary = h("span", { class: "k-secondary" });

        const drawFoot = () => {
            const left = open();
            applyBtn.setAttribute("aria-disabled", left.length ? "true" : "false");
            reason.replaceChildren(...(left.length
                ? [icon("triangle-alert", "sm"), "Choose an attribute for " + left.map((r) => r.reads).join(", ") + ", or leave it unbound"]
                : ["Adds " + rows.length + " rows on top of the tree, one undo step"]));
            summary.replaceChildren(matched + " of " + binds + " attributes matched by name and type");
        };

        // The binding in the row's count slot: "weight -> amount", or a picker for a missing one
        const bindingFor = (r) => {
            if (r.fixed) return AB.tip(h("span", { class: "ra-bind" }, r.fixed), r.fixedTip, { label: false });
            if (!r.miss) return AB.tip(h("span", { class: "ra-bind" }, r.role, h("span", { class: "ra-arrow" }, "->"), r.reads), "Matched by name and type in " + graph, { label: false });
            const c = st.choice[r.id];
            const cols = TA().files.accounts.columns.filter((x) => ["kind", "country", "flagged"].includes(x));
            const f = AB.field(c === "unbound" ? "Leave unbound" : c || "Choose an attribute", {
                caret: true,
                onClick: (e) => AB.openMenu(e.currentTarget, [
                    { heading: "Category attributes in " + graph },
                    ...cols.map((x) => ({ label: x, check: c === x, onClick: () => pick(r, x) })),
                    { sep: true },
                    { label: "Leave unbound", desc: "The row is added hidden and marked unbound; bind it later from its Style tab", check: c === "unbound", onClick: () => pick(r, "unbound") },
                ]),
            });
            f.setAttribute("aria-label", r.reads + ": " + (c || "choose an attribute"));
            AB.tip(f, r.reads + " is not in " + TA().files.accounts.file, { label: false });
            return h("span", { class: "ra-bind" }, r.reads, h("span", { class: "ra-arrow" }, "->"), f);
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
            rows.forEach((r) => {
                const li = tr.querySelector(`[data-row="${r.id}"]`);
                li.toggleAttribute("data-miss", !!(r.miss && !st.choice[r.id]));
                li.querySelector(".ab-tcount").replaceChildren(bindingFor(r));
            });
            listWrap.replaceChildren(tr);
        };
        const pick = (r, c) => { st.choice[r.id] = c; AB.closeMenu(); drawList(); drawFoot(); };
        drawList();
        drawFoot();

        const body = h("div", null,
            h("div", { class: "ra-head" }, icon(isStyle ? "palette" : "book-open", "sm"), h("b", null, file.file), h("span", { class: "k-secondary" }, "Saved by " + file.savedBy + ", " + file.savedAt)),
            h("div", { class: "ra-sh" }, "Rows it adds", h("span", { class: "k-grow" }), summary),
            listWrap);
        const foot = h("div", { style: "display:contents" }, reason, AB.button("Cancel", { kind: "secondary", onClick: () => AB.close() }), applyBtn);
        return finish(AB.modal({ title: "Apply " + file.kind + ": " + file.name, body, foot }));
    }

    function finish(wrap) {
        wrap.querySelector(".k-modal").classList.add("ra-modal");
        wrap.querySelector(".k-modal-foot").classList.add("ra-foot");
        return wrap;
    }

    // ---------- an older (1.x) style file: one notice, its settings as checkboxes ----------
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
            h("div", { class: "ra-notice", role: "note" }, icon("triangle-alert", "sm"), h("span", null, "Older style file: its layers cannot be applied. It also sets view mode 2D, layout ngraph and background #101820.")),
            list);
        const foot = h("div", { style: "display:contents" }, h("span", { class: "k-grow" }), AB.button("Cancel", { kind: "secondary", onClick: () => AB.close() }), applyBtn);
        return finish(AB.modal({ title: "Apply style file: " + LEGACY.file, body, foot }));
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
            const w = TA().watchlist;
            rows.push(
                { name: "Watchlist", kindIcon: "circle-check", count: w.inCurrentData + " of " + w.members, eye: true, selected: true, go: ["recipe-apply", "applied"], menu: ["context-menus", "row"] },
                { name: "Personalized PageRank from Watchlist", kindIcon: "chart-column", swatch: AB.ramp(), eye: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
                { name: "Cycles up to 4 transfers", kindIcon: "route", count: "Not run", notes: 1, eye: true, go: ["inspector-run-row", "data"], menu: ["context-menus", "run-row"] },
                { name: "riskScore", kindIcon: "hash", swatch: AB.ramp(), eye: true, go: ["inspector-measure-row", "risk-score"], menu: ["context-menus", "measure-row"] },
                { name: "alertRule", kindIcon: abc(), count: "Unbound", eye: false, dim: true, go: ["inspector-group-set-path-row", "style"], menu: ["context-menus", "row"] },
            );
        }
        rows.push(
            { name: "Louvain, weighted by amount", kindIcon: "layers", swatch: h("span", { class: "ab-multi" }, L.rows.slice(0, 3).map((r) => AB.chit(r.color, true))), eye: true, go: runGo, menu: ["context-menus", "run-row"],
              children: L.rows.map((r) => ({ name: r.name, kindIcon: "circle-dot", swatch: AB.chit(r.color, true), count: n(r.count), eye: true, go: runGo, menu: ["context-menus", "row"] })) },
            { name: "Everything", kindIcon: "base-layer", pinned: true, builtin: true, eye: true, go: ["inspector-selection-and-everything", "everything"], menu: ["context-menus", "row"] });
        return rows;
    }

    function drawLeft(el, state) {
        const head = AB.graphHead("Graph", T().graphName, { trail: h("span", { class: "k-secondary" }, isApril(state) ? "April data" : "March data") });
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
        const w = TA().watchlist;
        el.append(AB.inspector({
            icon: "circle-check", title: "Watchlist", kind: "Set", kindKey: "igs",
            provenance: ["from recipe " + RECIPE.name, "full-canvas-modes", "version-history"],
            menu: ["context-menus", "row"],
            onRename: (name) => AB.flash("Renamed to " + name),
            tab: "Data",
            tabs: {
                Style: () => [
                    AB.paintsLine("Paints " + w.inCurrentData + " nodes", ["recipe-apply", "applied"]),
                    AB.styleTab({ kinds: ["node"], set: { "node.outline": "#1A1A1A" }, kind: "node" }),
                ],
                Data: () => [
                    AB.section({ title: "Summary", collapsible: true, key: "data.set.summary", summary: w.inCurrentData + " of " + w.members + " in this data" },
                        AB.data("Members", String(w.members)), AB.data("In this data", String(w.inCurrentData)), AB.data("Not in this data", w.notInCurrentData.join(", "))),
                    AB.section({ title: "Members", collapsible: true, key: "data.set.members", summary: w.inCurrentData + " in this data" },
                        w.memberIds.filter((id) => !w.notInCurrentData.includes(id)).map((id) => AB.row({ label: h("span", { class: "k-id" }, id), onClick: () => AB.flash("Selects " + id) }))),
                    AB.section({ title: "Made with", collapsible: true, key: "data.set.made-with", summary: "Recipe " + RECIPE.name },
                        AB.data("Created from", "Recipe " + RECIPE.name + ", applied " + RECIPE.appliedAt, { go: ["full-canvas-modes", "version-history"] }),
                        AB.data("Recipe file", RECIPE.file + ", saved by " + RECIPE.savedBy + ", " + RECIPE.savedAt),
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
        frame: (state) => ({
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
        ],
        render(el, state, ctx) {
            if (ctx.region === "left") return drawLeft(el, state);
            if (ctx.region === "canvas") return drawCanvas(el, state);
            if (ctx.region === "right") return drawRight(el);
            if (state === "older-style-file") return el.append(legacyDialog());
            if (state === "applied") return el.append(AB.notice(RECIPE.name + " added 5 rows on top of the tree", { label: "Undo", go: ["recipe-apply", "mismatch"] }));
            el.append(dialog(state));
        },
    });
})();
