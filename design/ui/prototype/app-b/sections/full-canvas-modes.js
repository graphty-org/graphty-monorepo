/* Full-canvas modes: Version history and Compare. Both replace the left panel, canvas and
   inspector (the "workspace" region); the top bar and the rail stay. One header for both: a back
   arrow, the mode's name and the Esc hint (Esc is the shell's: closeTo).
   Content is the transfers data: March data (transfers-2026-03.csv) replaced by April data
   (datasets.transactionsApril), and the Louvain run on each month. Every number is from
   kit/fixtures.json. Plain ASCII. Styles are this section's own, injected once below. */
(function () {
    "use strict";
    const { h, icon } = AB;

    const CSS = `
.fcm { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; background: var(--cm-bg); }
.fcm-body { flex: 1 1 auto; min-height: 0; display: grid; }
.fcm-vh { grid-template-columns: minmax(0, 1fr) 360px; }
.fcm-cmp { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 300px; grid-template-rows: auto minmax(0, 1fr); }
.fcm-col { display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: auto; border-inline-start: 1px solid var(--cm-border); }
.fcm-colhead { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 12px 0 16px; flex: none; }
.fcm-colhead .k-grow { min-width: 0; font-weight: 550; }
.fcm-stagewrap { min-width: 0; }
.fcm-banner { position: absolute; left: 12px; right: 12px; top: 12px; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 8px 8px 12px; border-radius: 8px; background: var(--cm-bg); box-shadow: var(--cm-elevation-200); line-height: 16px; }
.fcm-banner .k-grow { min-width: 180px; }
.fcm-log { list-style: none; margin: 0; padding: 0 0 16px; }
.fcm-ver { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; gap: 2px 8px; align-items: center; padding: 8px 12px 6px 16px; border-top: 1px solid var(--cm-border); line-height: 16px; cursor: pointer; }
.fcm-ver:hover { background: var(--cm-bg-hover); }
.fcm-ver[aria-current="true"] { background: var(--cm-bg-selected, var(--cm-bg-secondary)); cursor: default; }
.fcm-ver-name { font-weight: 550; }
.fcm-ver-sub { grid-column: 2 / -1; color: var(--cm-text-secondary); }
.fcm-ver-sub b { color: var(--cm-text); font-weight: 550; }
.fcm-entry { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 2px 8px; padding: 6px 12px 6px 16px; line-height: 16px; cursor: pointer; }
.fcm-entry:hover { background: var(--cm-bg-hover); }
.fcm-entry > .k-i { color: var(--cm-text-secondary); }
.fcm-entry-sub { grid-column: 2; color: var(--cm-text-secondary); }
.fcm-entry[hidden] { display: none; }
.fcm-added { grid-column: 2; display: grid; gap: 2px; padding-top: 4px; }
.fcm-added > div { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.fcm-big { color: var(--cm-text-warning, var(--cm-text)); font-weight: 600; }
.fcm-logempty { padding: 4px 16px; }
.fcm-pick { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--cm-border); }
.fcm-pick .k-field { width: 260px; max-width: 100%; }
.fcm-side { grid-row: 2; }
.fcm-cmpcanvas { grid-row: 2; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.fcm-cmpcanvas + .fcm-cmpcanvas { border-inline-start: 1px solid var(--cm-border); }
.fcm-cvhead { display: flex; align-items: baseline; gap: 8px; min-height: 36px; padding: 8px 12px; line-height: 16px; flex: none; background: var(--cm-bg); border-bottom: 1px solid var(--cm-border); flex-wrap: wrap; }
.fcm-metric { display: flex; align-items: baseline; gap: 8px; padding: 0 16px 4px; line-height: 16px; }
.fcm-num { font-size: 20px; line-height: 28px; font-weight: 600; }
.fcm-bar { position: relative; height: 12px; margin: 4px 16px 2px; border-radius: 4px; background: var(--cm-bg-secondary); }
.fcm-bar i { position: absolute; top: 0; bottom: 0; border-radius: 4px; }
.fcm-bar .fcm-bar-range { background: var(--cm-border); }
.fcm-bar .fcm-bar-mark { width: 3px; background: var(--cm-text-brand); }
.fcm-barlab { display: flex; justify-content: space-between; padding: 0 16px 4px; color: var(--cm-text-secondary); font-size: 11px; }
.fcm-cap { padding: 0 16px 8px; line-height: 16px; color: var(--cm-text-secondary); }
.fcm-foot { position: sticky; bottom: 0; padding: 10px 16px; margin-top: auto; border-top: 1px solid var(--cm-border); background: var(--cm-bg); }
@media (max-width: 1200px) {
  .fcm-vh { grid-template-columns: minmax(0, 1fr) 320px; }
  .fcm-cmp { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 260px; }
  .fcm-pick .k-field { width: 210px; }
}
`;
    if (!document.getElementById("fcm-style")) document.head.append(h("style", { id: "fcm-style" }, CSS));

    const fmt = (n) => Number(n).toLocaleString("en-US");
    const flash = (what) => () => AB.flash(what + " (not wired in the skeleton)");

    // The one workspace-page header (AB.pageHead): back arrow, the mode's name, the Esc hint
    const head = (title, backTip) => AB.pageHead(title, { backTip: backTip || "Back to the graph" });

    // The shared legend card for one month's Louvain colors
    function legendFor(lg, sub) {
        return AB.legendCard([{ title: "Color: Louvain communities", rows: lg.rows.slice(0, 5).map((r) => ({ swatch: AB.chit(r.color, true), label: r.name, count: fmt(r.count) })),
            more: (lg.other.communities + lg.rows.length - 5) + " more communities", sub }]);
    }

    // =====================================================================
    // Version history: the drawing, and one log whose data versions are heading rows
    // =====================================================================
    function versionHistory(state, fx) {
        const A = fx.datasets.transactionsApril, M = fx.datasets.transactions, D = A.versionDiff, L = A.louvain, W = A.watchlist;
        if (state === "no-versions") return firstLoadOnly(fx);
        const past = state === "past-version", recipeOpen = state === "recipe-detail";
        const wrap = h("div", { class: "fcm" }, head("Version history"));
        const body = h("div", { class: "fcm-body fcm-vh" });

        // ----- left: the chosen version's drawing, its actions in the banner -----
        const cv = h("div", { class: "k-canvas fcm-stagewrap", role: "region", "aria-label": past ? "March data, view only" : "April data" },
            h("div", { class: "k-stage", role: "img", "aria-label": past ? "The transfers in March, colored by March's communities" : "The transfers in April, colored by April's communities" },
                AB.drawing(past ? "transactions-march-communities" : "transactions-april-communities", "")),
            past
                ? h("div", { class: "fcm-banner", role: "status" },
                    h("span", { class: "k-grow" }, icon("lock", "sm"), " ", h("b", null, "March data, view only."), " Restore adds it as a new version on top."),
                    AB.button("Compare with current", { kind: "secondary", icon: "git-compare-arrows", go: ["full-canvas-modes", "comparison"] }),
                    AB.button("Restore", { icon: "undo-2", onClick: flash("Restore March data") }))
                : h("div", { class: "fcm-banner" }, h("span", { class: "k-grow" }, h("b", null, "April data"), h("span", { class: "k-secondary" }, ", the current version. Click an older version in the log to look at it."))),
            legendFor(past ? A.legends.march : A.legends.april));

        // ----- right: the log -----
        const log = h("div", { class: "fcm-col", role: "region", "aria-label": "Log" });
        let kind = "All";
        const list = h("ul", { class: "fcm-log", "aria-label": "Log, newest first" });
        const emptyLine = h("div", { class: "fcm-logempty", hidden: true });
        const entry = (k, ic, text, sub, target, extra) => h("li", Object.assign({ class: "fcm-entry", "data-kind": k }, AB.act(target)), icon(ic, "sm"), h("span", null, text), sub ? h("span", { class: "fcm-entry-sub" }, sub) : null, extra || null);
        const version = (name, current, chosen, target, subs, note) => h("li", Object.assign({ class: "fcm-ver", "aria-current": chosen ? "true" : null, "aria-label": name + (current ? ", current" : "") + (chosen ? ", open" : "") }, chosen ? { tabindex: "0" } : Object.assign({ role: "button" }, AB.act({ go: target }))),
            icon("history", "sm"), h("span", { class: "fcm-ver-name k-ellipsis" }, name), current ? h("span", { class: "k-badge k-secondary" }, "current") : note || h("span"),
            subs.map((s) => h("span", { class: "fcm-ver-sub k-num" }, s)));

        // The recipe entry: open in recipe-detail, listing the rows it added
        const added = [
            { ic: "circle-check", name: "Watchlist", sub: W.inCurrentData + " of " + W.members + " accounts", go: ["recipe-apply", "applied"] },
            { ic: "chart-column", name: "Personalized PageRank from Watchlist", sub: "ran on apply", go: ["inspector-measure-row", "style"] },
            { ic: "route", name: "Cycles up to 4 transfers", sub: "arrived not run", go: ["inspector-run-row", "data"] },
            { ic: "hash", name: "riskScore", sub: "paints node color", go: ["inspector-measure-row", "risk-score"] },
            { ic: "tag", name: "alertRule", sub: "off: not in April data", go: ["inspector-group-set-path-row", "style"] },
        ];
        const recipe = entry("Recipes", "book-open", "Applied recipe Mule ring triage", "Saved by Dana Reyes, Mar 28. Added 5 rows.",
            { go: ["full-canvas-modes", recipeOpen ? "version-history" : "recipe-detail"] },
            recipeOpen ? h("div", { class: "fcm-added" }, added.map((r) => h("div", null, icon(r.ic, "sm"), AB.link(r.go[0], r.go[1], r.name), h("span", { class: "k-secondary" }, r.sub))),
                h("div", null, AB.openQuestion("Whether removing a recipe is one step here, or one row at a time in the tree"))) : null);
        recipe.setAttribute("aria-expanded", String(recipeOpen));

        AB.append(list, [
            version("April data", true, !past, ["full-canvas-modes", "version-history"], [
                "Replaced from " + A.files.accounts.file + " and " + A.file + ", Sep 30",
                h("span", null, h("b", null, fmt(A.nodes)), " accounts (was " + fmt(M.nodes) + "), ", h("b", null, fmt(A.edges)), " transfers (was " + fmt(M.edges) + ")"),
                h("span", null, D.accountsAdded + " new, " + D.accountsRemoved + " gone. ", h("span", { class: "fcm-big" }, "!"), " " + A.stats.components + " components (was " + M.stats.components + "), " + L.april.communities + " communities (was " + L.march.communities + ")"),
            ]),
            recipe,
            entry("Runs", "layers", "Louvain communities, rerun", L.april.communities + " communities, modularity " + L.april.modularity + ". The March result is kept as an earlier result.", { go: ["inspector-run-row", "earlier-results"] }),
            entry("Runs", "chart-column", "PageRank", "Directed, damping 0.85, 100 iterations.", { go: ["inspector-measure-row", "style"] }),
            entry("Data", "upload", "Replaced the data with April", "Runs on March data were marked out of date.", { go: ["data-place", "after-replace"] }),
            version("March data", false, past, ["full-canvas-modes", "past-version"], [
                "Read " + M.file + ", joined " + M.accountsFile + ", Sep 28",
                fmt(M.nodes) + " accounts, " + fmt(M.edges) + " transfers",
            ], AB.openQuestion("Whether a join makes its own version, or belongs to the read before it")),
            entry("Exports", "download", "Exported case-acc-233575_ring-pagerank_2026-03.csv", "Table of 14 accounts and its methods file. Nothing masked.", { go: ["export-dialog", "recent-exports"] }),
            entry("Runs", "layers", "Louvain communities", L.march.communities + " communities, modularity " + L.march.modularity + ". Seed 11.", { go: ["inspector-run-row", "out-of-date"] }),
            entry("Data", "table", "Joined " + M.accountsFile, fmt(M.nodes) + " of " + fmt(M.nodes) + " accounts matched.", { go: ["data-place", "at-rest"] }),
            entry("Data", "file-plus", "Read " + M.file, "Directed.", { go: ["data-place", "at-rest"] }),
        ]);

        const filter = (k) => {
            kind = k;
            list.querySelectorAll(".fcm-entry").forEach((li) => { li.hidden = k !== "All" && li.dataset.kind !== k; });
            const none = !list.querySelector(".fcm-entry:not([hidden])");
            emptyLine.hidden = !none;
            emptyLine.replaceChildren(none ? AB.empty("No " + k.toLowerCase() + " in this project.") : "");
            segBox.replaceChildren(segFor());
            segBox.firstChild.focus();
        };
        // Five choices: a dropdown (a segmented control holds 2 to 4)
        const segFor = () => {
            const f = AB.field(kind === "All" ? "Everything" : kind, { caret: true, onClick: () => AB.openMenu(f, ["All", "Data", "Runs", "Recipes", "Exports"].map((x) => ({ label: x === "All" ? "Everything" : x, check: x === kind, onClick: () => filter(x) }))) });
            f.setAttribute("aria-label", "Show in the log: " + (kind === "All" ? "Everything" : kind));
            f.setAttribute("aria-haspopup", "menu");
            return f;
        };
        const segBox = h("span", null, segFor());
        log.append(
            h("div", { class: "fcm-colhead" }, h("span", { class: "k-grow" }, "Log"),
                AB.needsElement("Data versions and what changed between them need graphty-element; edits come from its undo history (session.history.steps)")),
            h("div", { style: "padding:0 16px 8px" }, segBox),
            list, emptyLine);
        if (recipeOpen) setTimeout(() => recipe.scrollIntoView({ block: "nearest" }), 0);

        body.append(cv, log);
        wrap.append(body);
        return wrap;
    }

    // Version history right after the first load: the March data is the one version, nothing
    // is run yet, and the log says what would add a second version
    function firstLoadOnly(fx) {
        const M = fx.datasets.transactions;
        const wrap = h("div", { class: "fcm" }, head("Version history"));
        const body = h("div", { class: "fcm-body fcm-vh" });
        const cv = h("div", { class: "k-canvas fcm-stagewrap", role: "region", "aria-label": "March data" },
            h("div", { class: "k-stage", role: "img", "aria-label": "The transfers in March, drawn unstyled" }, AB.drawing("transactions-plain", "")),
            h("div", { class: "fcm-banner" }, h("span", { class: "k-grow" }, h("b", null, "March data"), h("span", { class: "k-secondary" }, ", the current and only version."))),
            AB.legendCard([]));
        const entry = (ic, text, sub, go) => h("li", Object.assign({ class: "fcm-entry" }, AB.act({ go })), icon(ic, "sm"), h("span", null, text), h("span", { class: "fcm-entry-sub" }, sub));
        const replace = AB.cmd("replace-file");
        const log = h("div", { class: "fcm-col", role: "region", "aria-label": "Log" },
            h("div", { class: "fcm-colhead" }, h("span", { class: "k-grow" }, "Log"),
                AB.needsElement("Data versions and what changed between them need graphty-element; edits come from its undo history (session.history.steps)")),
            h("ul", { class: "fcm-log", "aria-label": "Log, newest first" },
                h("li", { class: "fcm-ver", "aria-current": "true", tabindex: "0", "aria-label": "March data, current, open" },
                    icon("history", "sm"), h("span", { class: "fcm-ver-name k-ellipsis" }, "March data"), h("span", { class: "k-badge k-secondary" }, "current"),
                    h("span", { class: "fcm-ver-sub k-num" }, "Read " + M.file + ", joined " + M.accountsFile + ", Sep 28"),
                    h("span", { class: "fcm-ver-sub k-num" }, fmt(M.nodes) + " accounts, " + fmt(M.edges) + " transfers")),
                entry("table", "Joined " + M.accountsFile, fmt(M.nodes) + " of " + fmt(M.nodes) + " accounts matched.", ["data-place", "at-rest"]),
                entry("file-plus", "Read " + M.file, "Directed.", ["data-place", "at-rest"])),
            AB.empty("No earlier versions. Replacing the data adds one.", { verb: replace.label, go: replace.go }));
        body.append(cv, log);
        wrap.append(body);
        return wrap;
    }

    // =====================================================================
    // Compare: two drawings, one panel, one button (Keep as row)
    // =====================================================================
    function comparison(state, fx) {
        const A = fx.datasets.transactionsApril, M = fx.datasets.transactions, L = A.louvain, G = A.agreement;
        const kept = state === "kept";
        const SIDES = [
            { name: "Louvain communities, March data", short: "March data", sub: fmt(M.nodes) + " accounts, " + L.march.communities + " communities", drawing: "transactions-compare-march", run: "out-of-date", legend: A.legends.march },
            { name: "Louvain communities, April data", short: "April data", sub: fmt(A.nodes) + " accounts, " + L.april.communities + " communities", drawing: "transactions-compare-april", run: "earlier-results", legend: A.legends.april },
        ];
        let swapped = false;
        const wrap = h("div", { class: "fcm" }, head("Compare", kept ? "Back to the graph, with the kept row selected" : "Back to the graph (nothing is kept)"));
        const body = h("div", { class: "fcm-body fcm-cmp" });

        const pickItems = (cur) => [
            { heading: "Runs" },
            { label: SIDES[0].name, check: cur === 0, desc: "Earlier result, " + L.march.communities + " communities", onClick: () => {} },
            { label: SIDES[1].name, check: cur === 1, desc: L.april.communities + " communities", onClick: () => {} },
            { label: "PageRank", desc: "A measure: compared by rank change", onClick: flash("Compare PageRank") },
            { heading: "Rows" },
            { label: "Watchlist", desc: A.watchlist.members + " accounts", onClick: flash("Compare Watchlist") },
            { heading: "Graphs" },
            { label: "A time window...", desc: "By the timestamp attribute", onClick: flash("Compare a time window") },
        ];
        const picker = (i) => { const f = AB.field(SIDES[i].name, { caret: true, onClick: () => AB.openMenu(f, pickItems(i)) }); f.setAttribute("aria-label", "Compare " + (i ? "with" : "") + ": " + SIDES[i].name); return f; };
        const side = (s, second) => h("div", { class: "fcm-cmpcanvas", role: "region", "aria-label": s.short },
            h("div", { class: "fcm-cvhead" }, AB.link("inspector-run-row", s.run, s.short), h("span", { class: "k-secondary k-num" }, s.sub)),
            h("div", { class: "k-canvas fcm-stagewrap" },
                h("div", { class: "k-stage", role: "img", "aria-label": s.short + ", colored by community" }, AB.drawing(s.drawing, "")),
                legendFor(s.legend, second ? "Colors matched by overlap with the left" : null)));

        const pickBar = h("div", { class: "fcm-pick", role: "group", "aria-label": "What is compared" });
        const left = h("div", { style: "display:contents" }), right = h("div", { style: "display:contents" });
        const draw = () => {
            const [a, b] = swapped ? [1, 0] : [0, 1];
            pickBar.replaceChildren(h("span", { class: "k-secondary" }, "Compare"), picker(a), h("span", { class: "k-secondary" }, "with"), picker(b),
                AB.iconButton(AB.ICON.swap, "Swap the two sides", { onClick: () => { swapped = !swapped; draw(); AB.announce("Sides swapped"); } }));
            left.replaceChildren(side(SIDES[a], false));
            right.replaceChildren(side(SIDES[b], true));
        };
        draw();

        // ----- the panel -----
        const bar = (range, mark) => h("div", { class: "fcm-bar", "aria-hidden": "true" },
            h("i", { class: "fcm-bar-range", style: `left:${range[0] * 100}%;width:${(range[1] - range[0]) * 100}%` }),
            h("i", { class: "fcm-bar-mark", style: `left:calc(${mark * 100}% - 1px)` }));
        const panel = h("div", { class: "fcm-col fcm-side", role: "region", "aria-label": "The difference" },
            AB.section("Agreement",
                h("div", { class: "fcm-metric" }, h("span", { class: "fcm-num k-num" }, String(G.monthsOnAccountsInBoth)), h("span", { class: "k-secondary" }, "over " + fmt(G.accountsInBoth) + " accounts in both")),
                bar(G.marchRerunRange, G.monthsOnAccountsInBoth),
                h("div", { class: "fcm-barlab" }, h("span", null, "0, unrelated"), h("span", null, "1, the same")),
                h("div", { class: "fcm-cap" }, "Reruns of March agree " + G.marchRerunRange.join(" to ") + " (the gray band), so the months differ by more than the method's own wobble."),
                AB.needsElement("Agreement between partitions and rerun ranges need graphty-element")),
            AB.section("Communities",
                AB.data("March", String(L.march.communities)),
                AB.data("April", String(L.april.communities)),
                AB.data("Matched", L.matchedPairs + " pairs"),
                AB.data("New in April", L.unmatchedApril + " (" + fmt(L.unmatchedAprilAccounts) + " accounts)"),
                AB.data("Gone after March", String(L.unmatchedMarch.length))),
            AB.section("Grew the most",
                L.grew.slice(0, 4).map((c) => AB.row({ label: c.name, trail: c.marchSize + " to " + c.aprilSize, onClick: flash("Select " + c.name + " on both sides") }))),
            h("div", { class: "fcm-foot" }, kept
                ? AB.button("Kept as row", { kind: "secondary", icon: "check", block: true, disabled: "Louvain: March vs April is in the Graph tree, selected" })
                : AB.button("Keep as row", { icon: AB.ICON.run, block: true, go: ["full-canvas-modes", "kept"] })));

        body.append(pickBar, left, right, panel);
        wrap.append(body);
        if (kept) AB.notice("Added Louvain: March vs April to the Graph tree", { label: "Undo", go: ["full-canvas-modes", "comparison"] });
        return wrap;
    }

    registerSection({
        id: "full-canvas-modes",
        title: "Full-canvas modes",
        region: "workspace",
        rail: "graph",
        frame: { dataset: "transactions" },
        closeTo: "graph-place",
        states: [
            { id: "version-history", label: "Version history" },
            { id: "past-version", label: "Version history: an older version" },
            { id: "recipe-detail", label: "Version history: an applied recipe open" },
            { id: "no-versions", label: "Version history: only the first load" },
            { id: "comparison", label: "Compare" },
            { id: "kept", label: "Compare: kept as a row" },
        ],
        render(el, state) {
            const fx = AB.fx;
            el.append(["comparison", "kept"].includes(state) ? comparison(state, fx) : versionHistory(state, fx));
        },
    });
})();
