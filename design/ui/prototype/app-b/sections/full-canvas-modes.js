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
.fcm-li[hidden] { display: none; }
.fcm-added { display: grid; gap: 2px; padding: 0 12px 6px 40px; }
.fcm-added > div { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-height: 24px; }
.fcm-big { color: var(--cm-text); font-weight: 600; }
.fcm-changed { grid-column: 2 / -1; display: grid; gap: 2px; padding: 4px 0 2px; color: var(--cm-text-secondary); }
.fcm-changed > span { display: block; }
.fcm-changed .k-badge { margin-inline-end: 6px; }
.fcm-changed b { color: var(--cm-text); font-weight: 550; }
.fcm-main { grid-row: 2; grid-column: 1 / 3; display: flex; min-width: 0; min-height: 0; }
.fcm-main > .fcm-cmpcanvas { flex: 1 1 0; }
.fcm-scatter { flex: 1 1 auto; min-height: 0; padding: 8px 16px 16px; display: flex; flex-direction: column; }
.fcm-plot { flex: 1 1 auto; min-height: 0; display: flex; }
.fcm-plot svg { flex: 1 1 auto; min-height: 0; width: 100%; height: 100%; color: var(--cm-text-secondary); }
.fcm-scatter svg text { fill: var(--cm-text-secondary); font-size: 22px; }
.fcm-tbl { width: calc(100% - 32px); margin: 0 16px 8px; border-collapse: collapse; line-height: 16px; }
.fcm-tbl th, .fcm-tbl td { padding: 4px 4px 4px 0; text-align: left; vertical-align: top; border-bottom: 1px solid var(--cm-border); }
.fcm-tbl th { font-weight: 550; color: var(--cm-text-secondary); }
.fcm-tbl td.k-num { white-space: nowrap; }
.fcm-info { display: inline-flex; vertical-align: middle; color: var(--cm-text-secondary); cursor: help; border-radius: 4px; }
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

    // Community numbers carry over between data versions (graphty-element matches them by members)
    const MATCHED = "Community numbers carried over from March: a community keeps its number when most of its members stay";

    // A data version's "What changed": count splits graphty-element reports, never a motive.
    // lines: [[text, split, large, chip]]; large adds the "large change" mark.
    function whatChanged(lines) {
        const big = () => AB.tip(h("span", { class: "k-badge fcm-big", tabindex: "0" }, "large change"), "large change", { second: "The count changed by more than half since the last version", label: false });
        return h("span", { class: "fcm-changed k-num" }, h("b", null, "What changed"),
            lines.map(([text, split, large, chip]) => h("span", null, large ? big() : null, text + (split ? ": " + split : ""), chip || null)),
            AB.needsElement("The count splits come from graphty-element's version diff"));
    }

    // =====================================================================
    // Version history: the drawing, and one log whose data versions are heading rows
    // =====================================================================
    function versionHistory(state, fx) {
        const A = fx.datasets.transactionsApril, M = fx.datasets.transactions, D = A.versionDiff, L = A.louvain, W = A.watchlist;
        if (state === "no-versions") return firstLoadOnly(fx);
        const past = state === "past-version", recipeOpen = state === "recipe-detail";
        const Z = A.dormant;
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
                // The same two actions on every version, so they are where the reader looks; on the current one they say why they wait
                : h("div", { class: "fcm-banner" }, h("span", { class: "k-grow" }, h("b", null, "April data"), h("span", { class: "k-secondary" }, ", the current version. Click an older version in the log to look at it.")),
                    AB.button("Compare with current", { kind: "secondary", icon: "git-compare-arrows", disabled: "This is the current version. Click an older version in the log to compare it" }),
                    AB.button("Restore", { icon: "undo-2", disabled: "This is the current version. Click an older version in the log to restore it" })),
            legendFor(past ? A.legends.march : A.legends.april, past ? null : "Numbers carried over from March"));

        // ----- right: the log -----
        const log = h("div", { class: "fcm-col", role: "region", "aria-label": "Log" });
        let kind = "All";
        const list = h("ul", { class: "fcm-log", "aria-label": "Log, newest first" });
        const emptyLine = h("div", { class: "fcm-logempty", hidden: true });
        // A list item holds the button (a list may only hold list items); the recipe's added rows sit outside it
        const entry = (k, ic, text, sub, target, extra) => h("li", { class: "fcm-li", "data-kind": k },
            h("div", Object.assign({ class: "fcm-entry", role: "button" }, AB.act(target)), icon(ic, "sm"), h("span", null, text), sub ? h("span", { class: "fcm-entry-sub" }, sub) : null), extra || null);
        const version = (name, current, chosen, target, subs, note, changed) => {
            const kids = [icon("history", "sm"), h("span", { class: "fcm-ver-name k-ellipsis" }, name), current ? h("span", { class: "k-badge k-secondary" }, "current") : note || h("span"),
                subs.map((s) => h("span", { class: "fcm-ver-sub k-num" }, s)), changed || null];
            const label = name + (current ? ", current" : "") + (chosen ? ", open" : "");
            return chosen ? h("li", { class: "fcm-ver", "aria-current": "true", "aria-label": label, tabindex: "0" }, kids)
                : h("li", { class: "fcm-li" }, h("div", Object.assign({ class: "fcm-ver", role: "button", "aria-label": label }, AB.act({ go: target })), kids));
        };

        // The recipe entry: open in recipe-detail, listing the rows it added
        const added = [
            { ic: "circle-check", name: "Watchlist", sub: W.inCurrentData + " of " + W.members + " accounts", go: ["recipe-apply", "applied"] },
            { ic: "chart-column", name: "Personalized PageRank from Watchlist", sub: "ran on apply", go: ["inspector-measure-row", "style"] },
            { ic: "route", name: "Cycles up to 4 transfers", sub: "arrived not run", go: ["inspector-run-row", "data"] },
            { ic: AB.typeGlyph("num"), name: "riskScore", sub: "paints node color", go: ["inspector-measure-row", "risk-score"] },
            { ic: AB.typeGlyph("cat"), name: "alertRule", sub: "off: not in April data", go: ["inspector-group-set-path-row", "style"] },
        ];
        const recipe = entry("Recipes", "book-open", "Applied recipe Mule ring triage", "Saved by Dana Reyes, Mar 28. Added 5 rows.",
            { go: ["full-canvas-modes", recipeOpen ? "version-history" : "recipe-detail"] },
            recipeOpen ? h("div", { class: "fcm-added" }, added.map((r) => h("div", null, typeof r.ic === "string" ? icon(r.ic, "sm") : r.ic, AB.link(r.go[0], r.go[1], r.name), h("span", { class: "k-secondary" }, r.sub))),
                h("div", null, AB.openQuestion("Whether removing a recipe is one step here, or one row at a time in the tree"))) : null);
        recipe.firstChild.setAttribute("aria-expanded", String(recipeOpen));

        AB.append(list, [
            version("April data", true, !past, ["full-canvas-modes", "version-history"], [
                "Replaced from " + A.files.accounts.file + " and " + A.file + ", Sep 30",
                h("span", null, h("b", null, fmt(A.nodes)), " accounts (was " + fmt(M.nodes) + "), ", h("b", null, fmt(A.edges)), " transfers (was " + fmt(M.edges) + ")"),
                h("span", null, AB.count(D.accountsAdded, "account") + " new, " + D.accountsRemoved + " gone"),
            ], null, whatChanged([
                [A.stats.components + " components (was " + M.stats.components + ")", AB.count(Z.count, "account") + " have no transfers in this version, each a component of its own", true],
                [L.april.communities + " communities (was " + L.march.communities + ")", Z.singletonCommunities + " of them are those single accounts; " + Z.communitiesWithTransfers + " hold accounts with transfers", true],
                [MATCHED, null, false, AB.needsElement("Matching community numbers across data versions is graphty-element's: a community keeps its number when most of its members persist")],
            ])),
            entry("Assistant", "sparkles", "Asked the assistant", "Sent to api.anthropic.com, Oct 1: your question, " + AB.count(M.flaggedAccounts.length, "account id") + ", 3 statistics. Nothing else left this computer.", { onClick: () => AB.flash("Open this conversation (not wired in the skeleton)") }),
            recipe,
            entry("Runs", "layers", "Louvain communities, rerun", L.april.communities + " communities, modularity " + L.april.modularity + ". The March result is kept as an earlier result.", { go: ["inspector-run-row", "earlier-results"] }),
            entry("Runs", "chart-column", "PageRank", "Directed, damping 0.85, 100 iterations.", { go: ["inspector-measure-row", "style"] }),
            entry("Data", "upload", "Replaced the data with April", "Runs on March data were marked out of date.", { go: ["data-place", "after-replace"] }),
            version("March data", false, past, ["full-canvas-modes", "past-version"], [
                "Read " + M.file + ", joined " + M.accountsFile + ", Sep 28",
                fmt(M.nodes) + " accounts, " + fmt(M.edges) + " transfers",
            ], AB.openQuestion("Whether a join makes its own version, or belongs to the read before it"), whatChanged([["The first version: nothing before it"]])),
            entry("Exports", "download", "Exported case-acc-233575_ring-pagerank_2026-03.csv", "Table of 14 accounts and its methods file. Nothing masked.", { go: ["export-dialog", "recent-exports"] }),
            entry("Runs", "layers", "Louvain communities", L.march.communities + " communities, modularity " + L.march.modularity + ". Seed 11.", { go: ["inspector-run-row", "out-of-date"] }),
            entry("Data", "table", "Joined " + M.accountsFile, fmt(M.nodes) + " of " + fmt(M.nodes) + " accounts matched.", { go: ["data-place", "at-rest"] }),
            entry("Data", "file-plus", "Read " + M.file, "Directed.", { go: ["data-place", "at-rest"] }),
        ]);

        const filter = (k) => {
            kind = k;
            list.querySelectorAll(".fcm-li[data-kind]").forEach((li) => { li.hidden = k !== "All" && li.dataset.kind !== k; });
            const none = !list.querySelector(".fcm-li[data-kind]:not([hidden])");
            emptyLine.hidden = !none;
            emptyLine.replaceChildren(none ? AB.empty("No " + k.toLowerCase() + " in this project.") : "");
            segBox.replaceChildren(segFor());
            const on = segBox.querySelector('[aria-checked="true"]');
            if (on) on.focus();
        };
        // The log filter: one segmented control (the assistant's sends show under All)
        const segFor = () => AB.seg(["All", "Data", "Runs", "Recipes", "Exports"].map((x) => [x, x]), kind, filter, { label: "Show in the log" });
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
        const entry = (ic, text, sub, go) => h("li", { class: "fcm-li" }, h("div", Object.assign({ class: "fcm-entry", role: "button" }, AB.act({ go })), icon(ic, "sm"), h("span", null, text), h("span", { class: "fcm-entry-sub" }, sub)));
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
    // Compare: what is compared (the pick bar), the drawing or the scatter, one panel, one button
    // (Keep as row). Four kinds: two partitions (comparison, kept), one group across the two data
    // versions (group), two rankings (rankings), a group and the rest of the graph (rest).
    // Every side is named after its row or measure. Descriptive only: no test, no p-value, no verdict.
    // =====================================================================
    const pct = (x) => Math.round(x * 100) + "%";
    const times = (r) => AB.num(r, 2) + " times the rest";

    function comparison(state, fx) {
        const A = fx.datasets.transactionsApril, M = fx.datasets.transactions, L = A.louvain, G = A.agreement, Z = A.dormant;
        const R = fx.scenarios.comparison.metrics, GC = R.groupCompare, S = A.compareSelection, SEL = L.selected;
        const kept = state === "kept", partitions = ["comparison", "kept", "group"].includes(state);
        const SIDES = {
            march: { name: "Louvain communities, March data", short: "March data", sub: fmt(M.nodes) + " accounts, " + L.march.communities + " communities", drawing: state === "group" ? "transactions-compare-march-sel" : "transactions-compare-march", run: "out-of-date", legend: A.legends.march },
            april: { name: "Louvain communities, April data", short: "April data", sub: fmt(A.nodes) + " accounts, " + L.april.communities + " communities", drawing: state === "group" ? "transactions-compare-april-sel" : "transactions-compare-april", run: "earlier-results", legend: A.legends.april },
            pagerank: { name: "PageRank", short: "PageRank", sub: "April data" },
            betweenness: { name: "Betweenness", short: "Betweenness", sub: "April data" },
            group: { name: GC.group.name + ", April data", short: GC.group.name },
            rest: { name: "The rest of the graph", short: "The rest of the graph" },
        };
        const pair = partitions ? ["march", "april"] : state === "rankings" ? ["pagerank", "betweenness"] : ["group", "rest"];
        let swapped = false;
        // Keep as row saves the row the moment it lands, so every way out (the back arrow, Esc, the
        // rail) finds it on top of the transfers' Graph tree (showKeptRow below); Undo takes it back.
        // The back arrow and Esc also select it.
        const fresh = kept && !AB.keptComparison;
        if (kept) AB.keptComparison = { id: "compare-kept", name: "Louvain: March vs April", kindIcon: AB.ICON.run, eye: true, go: ["full-canvas-modes", "kept"], menu: ["context-menus", "run-row"] };
        const wrap = h("div", { class: "fcm" }, kept
            ? AB.pageHead("Compare", { backTip: "Back to the graph, with the kept row selected",
                onCancel: () => { selectKept = true; AB.go("graph-place", "many-groups"); } })
            : head("Compare", "Back to the graph (nothing is kept)"));
        const body = h("div", { class: "fcm-body fcm-cmp" });

        // The one picker menu for either side: runs, measures, groups (with the rest of the graph), rows, graphs
        const pickItems = (cur) => [
            { heading: "Runs" },
            { label: SIDES.march.name, check: cur === "march", desc: "Earlier result, " + L.march.communities + " communities", go: ["full-canvas-modes", "comparison"] },
            { label: SIDES.april.name, check: cur === "april", desc: L.april.communities + " communities", go: ["full-canvas-modes", "comparison"] },
            { label: "PageRank", check: cur === "pagerank", desc: "A measure: compared by rank", go: ["full-canvas-modes", "rankings"] },
            { label: "Betweenness", check: cur === "betweenness", desc: "A measure: compared by rank", go: ["full-canvas-modes", "rankings"] },
            { heading: "Groups" },
            { label: GC.group.name, check: cur === "group", desc: "Louvain, April data", go: ["full-canvas-modes", "rest"] },
            { label: "The rest of the graph", check: cur === "rest", desc: "Every account not in the other side", go: ["full-canvas-modes", "rest"] },
            { heading: "Rows" },
            { label: "Watchlist", desc: A.watchlist.members + " accounts", onClick: flash("Compare Watchlist") },
            { heading: "Graphs" },
            { label: "A time window...", desc: "By the timestamp attribute", onClick: flash("Compare a time window") },
        ];
        const picker = (k, first) => { const f = AB.field(SIDES[k].name, { caret: true, onClick: () => AB.openMenu(f, pickItems(k)) }); f.setAttribute("aria-label", "Compare" + (first ? "" : " with") + ": " + SIDES[k].name); return f; };
        const side = (k, second) => { const s = SIDES[k]; return h("div", { class: "fcm-cmpcanvas", role: "region", "aria-label": s.short },
            h("div", { class: "fcm-cvhead" }, AB.link("inspector-run-row", s.run, s.short), h("span", { class: "k-secondary k-num" }, s.sub)),
            h("div", { class: "k-canvas fcm-stagewrap" },
                h("div", { class: "k-stage", role: "img", "aria-label": s.short + ", colored by community" + (state === "group" ? ", " + SEL.name + " selected" : "") }, AB.drawing(s.drawing, "")),
                legendFor(s.legend, second ? "Colors matched by overlap with the left" : null))); };

        const pickBar = h("div", { class: "fcm-pick", role: "group", "aria-label": "What is compared" });
        const main = h("div", { class: "fcm-main" });
        const draw = () => {
            const [a, b] = swapped ? [pair[1], pair[0]] : pair;
            pickBar.replaceChildren(h("span", { class: "k-secondary" }, "Compare"), picker(a, true), h("span", { class: "k-secondary" }, "with"), picker(b, false),
                AB.iconButton(AB.ICON.swap, "Swap the two sides", { onClick: () => { swapped = !swapped; draw(); AB.announce("Sides swapped"); } }));
            if (partitions) main.replaceChildren(side(a, false), side(b, true));
            else if (state === "rankings") main.replaceChildren(scatter(R, SIDES[a].name, SIDES[b].name, a !== "pagerank"));
            else main.replaceChildren(h("div", { class: "fcm-cmpcanvas", role: "region", "aria-label": GC.group.name + " and the rest of the graph" },
                h("div", { class: "fcm-cvhead" }, h("b", null, GC.group.name), h("span", { class: "k-secondary k-num" }, "against " + AB.count(GC.rest.n, "account") + " in the rest of the graph")),
                h("div", { class: "k-canvas fcm-stagewrap" },
                    h("div", { class: "k-stage", role: "img", "aria-label": "April data, colored by community" }, AB.drawing("transactions-april-communities", "")),
                    legendFor(A.legends.april, null))));
        };
        draw();

        // ----- the panel -----
        const descriptive = h("div", { class: "fcm-cap", style: "padding-top:10px" }, "Descriptive only; no statistical test. Enrichment analysis is not part of graphty.");
        const bar = (range, mark) => h("div", { class: "fcm-bar", "aria-hidden": "true" },
            h("i", { class: "fcm-bar-range", style: `left:${range[0] * 100}%;width:${(range[1] - range[0]) * 100}%` }),
            h("i", { class: "fcm-bar-mark", style: `left:calc(${mark * 100}% - 1px)` }));
        let sections;
        if (partitions) {
            const sizeRows = L.grew.slice(0, L.ringRankInGrew).map((c) => AB.row({ label: c.name, selected: state === "group" && c.name === SEL.name, trail: c.marchSize + " to " + c.aprilSize,
                go: c.name === SEL.name ? ["full-canvas-modes", "group"] : null, onClick: c.name === SEL.name ? null : flash("Select " + c.name + " on both sides") }));
            sections = [
                AB.section("Agreement",
                    h("div", { class: "fcm-metric" }, h("span", { class: "fcm-num k-num" }, String(G.monthsOnAccountsInBoth)), h("span", { class: "k-secondary" }, "over " + fmt(G.accountsInBoth) + " accounts in both")),
                    bar(G.marchRerunRange, G.monthsOnAccountsInBoth),
                    h("div", { class: "fcm-barlab" }, h("span", null, "0, unrelated"), h("span", null, "1, the same")),
                    h("div", { class: "fcm-cap" }, "Agreement is 1 when both runs put the accounts in the same groups and 0 when they match no better than chance; reruns of March on the same data score " + G.marchRerunRange.join(" to ") + " (the gray band)."),
                    AB.needsElement("Agreement between partitions and rerun ranges need graphty-element")),
                AB.section("Communities",
                    AB.data("March", String(L.march.communities)),
                    AB.data("April", String(L.april.communities)),
                    AB.data("Matched", L.matchedPairs + " pairs"),
                    AB.data("New in April", (L.unmatchedApril - Z.singletonCommunities) + " (" + AB.count(L.unmatchedAprilAccounts - Z.count, "account") + ")"),
                    AB.data("Singles", Z.singletonCommunities + " new groups of one account, no transfers in April"),
                    AB.data("Gone after March", String(L.unmatchedMarch.length)),
                    AB.needsElement("Matching, and the split of single-account groups, come from graphty-element's partition comparison")),
                state === "group"
                    ? AB.section(SEL.name + ", March to April",
                        AB.data("Stayed", AB.count(S.marchMembersStillInIt, "account")),
                        AB.data("Left", AB.count(S.marchMembersLeftIt, "account")),
                        AB.data("Joined", AB.count(S.joinedFromOtherGroups + S.joinedNew, "account") + " (" + S.joinedNew + " new)"),
                        AB.data("Silent", AB.count(S.marchMembersSilent, "account") + ", no transfers in April"),
                        AB.data("Stability, March", pct(S.holdsInMarchReruns) + " of reruns keep it together"),
                        AB.data("Stability, April", pct(S.holdsInAprilReruns) + " of reruns keep it together"),
                        h("div", { class: "fcm-cap", style: "padding-top:6px" }, AB.link("full-canvas-modes", "comparison", "All communities")),
                        AB.needsElement("Member movement and stability across reruns come from graphty-element"))
                    : AB.section("Size change, March to April", sizeRows),
            ];
        } else if (state === "rankings") {
            const T = R.scatter.topBoth, off = R.spearmanOffBottom;
            const tieInfo = AB.tip(h("span", { class: "fcm-info", role: "img", tabindex: "0" }, icon("info", "sm")), "Tied values share the average of their ranks");
            const biggest = R.rows.slice().sort((x, y) => Math.abs(y.change) - Math.abs(x.change)).slice(0, 5);
            sections = [
                AB.section("In both top lists", [10, 50, 100].map((n) => AB.data("Top " + n, T[n] + " of the top " + n + " in both"))),
                AB.section({ title: "Rank agreement", actions: tieInfo },
                    h("div", { class: "fcm-cap", style: "padding-top:4px" }, "Spearman " + AB.num(off.rho) + " over " + AB.count(off.n, "account") + "; it leaves out the " + fmt(off.left) + " tied at the lowest PageRank."),
                    AB.needsElement("Rank comparison, ties and the top-N overlap come from graphty-element")),
                AB.section("Largest rank differences", biggest.map((r) => AB.row({ label: r.id, trail: "#" + r.rankPR + " and #" + r.rankBC, onClick: flash("Select " + r.id) }))),
            ];
        } else {
            const st = GC.structure, rows = [
                ["Accounts", fmt(st.group.accounts), fmt(st.rest.accounts), times(st.ratio.accounts)],
                ["Transfers inside", fmt(st.group.edgesInside), fmt(st.rest.edgesInside), times(st.ratio.edgesInside)],
                ["Density", st.group.densityShown, st.rest.densityShown, "density " + times(st.ratio.density)],
                ["PageRank, median", AB.num(GC.group.median), AB.num(GC.rest.median), "median " + times(GC.medianRatio)],
            ];
            sections = [
                AB.section(GC.group.name + " and the rest",
                    h("table", { class: "fcm-tbl" },
                        h("thead", null, h("tr", null, h("th", null, ""), h("th", null, GC.group.name), h("th", null, "The rest"))),
                        h("tbody", null, rows.map(([n, g, r, w]) => [h("tr", null, h("th", { scope: "row" }, n), h("td", { class: "k-num" }, g), h("td", { class: "k-num" }, r)),
                            h("tr", null, h("td", { colspan: "3", class: "k-secondary" }, w))]))),
                    h("div", { class: "fcm-cap" }, "One statistic per column: a count, the density, the median."),
                    AB.needsElement("Group statistics against the rest of the graph come from graphty-element")),
            ];
        }
        const panel = h("div", { class: "fcm-col fcm-side", role: "region", "aria-label": "The difference" },
            descriptive, sections,
            h("div", { class: "fcm-foot" }, kept
                ? AB.button("Kept as row", { kind: "secondary", icon: "check", block: true, disabled: "Louvain: March vs April is already kept as a row in the Graph tree" })
                : partitions ? AB.button("Keep as row", { icon: AB.ICON.run, block: true, go: ["full-canvas-modes", "kept"] })
                    : AB.button("Keep as row", { icon: AB.ICON.run, block: true, onClick: flash("Keep this comparison as a row") })));

        body.append(pickBar, main, panel);
        wrap.append(body);
        if (fresh) AB.notice("Added Louvain: March vs April to the Graph tree", { label: "Undo", onClick: () => { AB.keptComparison = null; AB.go("full-canvas-modes", "comparison"); } });
        return wrap;
    }

    // Two rankings as a scatter: one dot per account, rank 1 at the left and the top. The straight
    // runs at the right and the bottom are the tied accounts.
    function scatter(R, xName, yName, flip) {
        const n = R.n, W = 1000, P = 60;
        const pos = (r) => P + ((r - 1) / (n - 1)) * (W - 2 * P);
        let d = "";
        R.scatter.points.forEach(([pr, bc]) => { const [x, y] = flip ? [bc, pr] : [pr, bc]; d += "M" + pos(x).toFixed(1) + " " + pos(y).toFixed(1) + "h0"; });
        const svg = h("div", { class: "fcm-plot", role: "img", "aria-label": "Scatter of " + AB.count(n, "account") + ": " + xName + " rank across, " + yName + " rank down" });
        svg.innerHTML = `<svg viewBox="0 0 ${W} ${W}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
<rect x="${P}" y="${P}" width="${W - 2 * P}" height="${W - 2 * P}" fill="none" stroke="currentColor" stroke-opacity=".35"/>
<path d="${d}" stroke="currentColor" stroke-opacity=".45" stroke-width="5" stroke-linecap="round"/>
<text x="${P}" y="${P - 18}">${yName} rank, 1 at the top</text>
<text x="${W - P}" y="${W - 18}" text-anchor="end">${xName} rank, 1 at the left</text></svg>`;
        const tA = R.bottomTiePR, tB = R.bottomTieBC;
        return h("div", { class: "fcm-cmpcanvas", role: "region", "aria-label": xName + " and " + yName },
            h("div", { class: "fcm-cvhead" }, h("b", null, xName + " and " + yName), h("span", { class: "k-secondary k-num" }, "April data, " + AB.count(n, "account"))),
            h("div", { class: "fcm-scatter" }, svg,
                h("div", { class: "fcm-cap", style: "padding:8px 0 0" }, "One dot per account. The straight runs are ties: " + fmt(tA.count) + " accounts share the lowest PageRank and " + fmt(tB.count) + " have zero betweenness.")));
    }

    // The kept comparison as a run row on top of the transfers' Graph tree. The tree is the Graph
    // place's to draw, so this adds the row to the rows that tree was drawn from and redraws it with
    // the shared AB.tree; the tree's own redraws (expand, delete, move) keep it.
    // ponytail: belongs in graph-place.js as a state of its own; move it there when that file is next edited.
    let selectKept = false;
    function showKeptRow() {
        const want = selectKept;
        selectKept = false;
        if (!AB.keptComparison || location.hash !== AB.href("graph-place", "many-groups")) return;
        requestAnimationFrame(() => {
            const louvain = document.querySelector('.gp-tree [data-row="louvain"]');
            if (!louvain || !louvain._entry) return;
            const rows = louvain._entry.siblings, k = AB.keptComparison;
            if (!rows.includes(k)) rows.splice(rows.indexOf(louvain._entry.r), 0, k);
            k.selected = want;
            if (want) rows.forEach((r) => { if (r !== k) r.selected = false; });
            const old = louvain.closest(".ab-tree");
            old.replaceWith(AB.tree(rows, { label: old.getAttribute("aria-label") }));
            if (want) AB.announce(k.name + " selected");
        });
    }
    window.addEventListener("hashchange", showKeptRow);

    registerSection({
        id: "full-canvas-modes",
        title: "Full-canvas modes",
        region: "workspace",
        rail: "graph",
        frame: { dataset: "transactions" },
        closeTo: "graph-place/many-groups",
        states: [
            { id: "version-history", label: "Version history" },
            { id: "past-version", label: "Version history: an older version" },
            { id: "recipe-detail", label: "Version history: an applied recipe open" },
            { id: "no-versions", label: "Version history: only the first load" },
            { id: "comparison", label: "Compare" },
            { id: "kept", label: "Compare: kept as a row" },
            { id: "group", label: "Compare: one community across the two versions" },
            { id: "rankings", label: "Compare: two rankings (PageRank and Betweenness)" },
            { id: "rest", label: "Compare: a community and the rest of the graph" },
        ],
        render(el, state) {
            const fx = AB.fx;
            el.append(["comparison", "kept", "group", "rankings", "rest"].includes(state) ? comparison(state, fx) : versionHistory(state, fx));
        },
    });
})();
