/* Full-canvas modes: Version history and the comparison surface. Both replace the left panel,
   canvas and inspector (the "workspace" region); the top bar and the rail stay, and a back arrow
   returns to the graph. Content is the transfers data: March data (transfers-2026-03.csv) replaced
   by April data (datasets.transactionsApril), and the Louvain run on each month. Every number is
   from kit/fixtures.json. Plain ASCII. Styles are injected once below (this section's own). */
(function () {
    "use strict";
    const { h, icon } = AB;

    const CSS = `
.fcm { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; background: var(--cm-bg); }
.fcm-head { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px 0 8px; border-bottom: 1px solid var(--cm-border); flex: none; min-width: 0; }
.fcm-crumbs { display: inline-flex; align-items: center; gap: 6px; min-width: 0; white-space: nowrap; }
.fcm-crumbs .ab-link { color: var(--cm-text-secondary); text-decoration: none; }
.fcm-crumbs .ab-link:hover { text-decoration: underline; }
.fcm-title { font-weight: 550; overflow: hidden; text-overflow: ellipsis; }
.fcm-acts { display: inline-flex; align-items: center; gap: 8px; margin-inline-start: auto; flex: none; }
.fcm-body { position: relative; flex: 1 1 auto; min-height: 0; display: grid; }
.fcm-vh { grid-template-columns: 300px minmax(0, 1fr) 340px; }
.fcm-cmp { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 320px; grid-template-rows: auto minmax(0, 1fr); }
.fcm-col { display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: auto; }
.fcm-col + .fcm-col { border-inline-start: 1px solid var(--cm-border); }
.fcm-colhead { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 8px 0 16px; font-weight: 550; flex: none; }
.fcm-colhead .k-grow { min-width: 0; }
.fcm-cap { padding: 0 16px 8px; line-height: 16px; color: var(--cm-text-secondary); }
.fcm-ver { margin: 0 8px 8px; padding: 8px; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--cm-border); display: grid; gap: 4px; line-height: 16px; cursor: pointer; }
.fcm-ver:hover { background: var(--cm-bg-hover); }
.fcm-ver[aria-current="true"] { box-shadow: inset 0 0 0 2px var(--cm-border-selected); cursor: default; }
.fcm-ver[aria-current="true"]:hover { background: none; }
.fcm-ver-l1 { display: flex; align-items: center; gap: 6px; }
.fcm-ver-l1 .k-grow { font-weight: 550; }
.fcm-chg { display: grid; gap: 2px; padding: 4px 0 0; }
.fcm-chg-line { display: flex; flex-wrap: wrap; gap: 0 6px; align-items: baseline; }
.fcm-chg-sub { color: var(--cm-text-secondary); padding-inline-start: 0; }
.fcm-big { display: inline-flex; align-items: center; gap: 4px; }
.fcm-btnrow { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 4px; }
.fcm-stagewrap { position: relative; flex: 1 1 auto; min-height: 0; display: flex; }
.fcm-banner { position: absolute; left: 12px; right: 12px; top: 12px; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; background: var(--cm-bg); box-shadow: var(--cm-elevation-200); line-height: 16px; }
.fcm-banner .k-grow { min-width: 160px; }
.fcm-seg { padding: 0 16px 8px; }
.fcm-log { list-style: none; margin: 0; padding: 0 0 16px; }
.fcm-loghead { padding: 8px 16px 4px; font-size: 11px; font-weight: 550; color: var(--cm-text-secondary); }
.fcm-entry { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 2px 8px; padding: 6px 12px 6px 16px; line-height: 16px; cursor: pointer; }
.fcm-entry:hover { background: var(--cm-bg-hover); }
.fcm-entry > .k-i { margin-top: 0; color: var(--cm-text-secondary); }
.fcm-entry-sub { grid-column: 2; color: var(--cm-text-secondary); }
.fcm-entry[hidden] { display: none; }
.fcm-oq { display: inline-flex; align-items: center; height: 16px; padding: 0 6px; border-radius: 8px; font-size: 10px; font-weight: 550; background: var(--cm-bg-warning); color: #000; white-space: nowrap; vertical-align: middle; }
.fcm-pick { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--cm-border); }
.fcm-pick .k-field { width: 280px; max-width: 100%; }
.fcm-pickwrap { position: relative; }
.fcm-pickmenu { position: absolute; left: 0; top: calc(100% + 4px); z-index: 20; width: 300px; }
.fcm-side { grid-row: 2; }
.fcm-cmpcanvas { grid-row: 2; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.fcm-cmpcanvas + .fcm-cmpcanvas { border-inline-start: 1px solid var(--cm-border); }
.fcm-cvhead { display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 4px 12px; line-height: 16px; flex: none; background: var(--cm-bg); border-bottom: 1px solid var(--cm-border); }
.fcm-cvhead .k-grow { min-width: 0; }
.fcm-cvhead .ab-link { white-space: nowrap; }
.fcm-legend { display: flex; flex-wrap: wrap; gap: 2px 10px; padding: 6px 12px; line-height: 16px; flex: none; background: var(--cm-bg); border-top: 1px solid var(--cm-border); }
.fcm-legend span { display: inline-flex; align-items: center; gap: 4px; }
.fcm-metric { display: grid; gap: 2px; padding: 0 16px 8px; line-height: 16px; }
.fcm-metric .fcm-num { font-size: 20px; line-height: 28px; font-weight: 600; }
.fcm-bar { position: relative; height: 16px; margin: 4px 16px 2px; border-radius: 4px; background: var(--cm-bg-secondary); }
.fcm-bar i { position: absolute; top: 0; bottom: 0; border-radius: 4px; }
.fcm-bar .fcm-bar-range { background: var(--cm-border); }
.fcm-bar .fcm-bar-mark { width: 3px; background: var(--cm-text-brand); }
.fcm-barlab { display: flex; justify-content: space-between; padding: 0 16px 8px; color: var(--cm-text-secondary); font-size: 11px; }
.fcm-foot { position: sticky; bottom: 0; display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 16px; margin-top: auto; border-top: 1px solid var(--cm-border); background: var(--cm-bg); }
.fcm-saved { margin: 8px 16px; padding: 8px 10px; border-radius: 8px; background: var(--cm-bg-secondary); display: grid; gap: 4px; line-height: 16px; }
.fcm-tree { padding: 0 0 8px; }
.fcm-modal { position: absolute; inset: 0; z-index: 30; display: grid; place-items: center; background: var(--cm-modal-backdrop); }
.fcm-modal .k-modal { position: relative; max-width: calc(100% - 32px); }
.fcm-toastwrap { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 25; max-width: calc(100% - 32px); }
@media (max-width: 1200px) {
  .fcm-vh { grid-template-columns: 260px minmax(0, 1fr) 300px; }
  .fcm-cmp { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 280px; }
  .fcm-pick .k-field { width: 230px; }
  .fcm-hide-narrow { display: none; }
}
`;
    if (!document.getElementById("fcm-style")) document.head.append(h("style", { id: "fcm-style" }, CSS));

    const fmt = (n) => Number(n).toLocaleString("en-US");
    const flash = (what) => () => AB.flash(what + " (not wired in the skeleton)");
    const oq = (text) => h("span", { class: "fcm-oq", title: "Open question: " + text }, "Open question");

    // ---------- the shared head: back arrow, where you are, actions ----------
    function head(title, backTo, extras) {
        const back = AB.iconButton("arrow-left", "Back to the graph", { go: backTo });
        const project = h("span", { id: "fcm-project" }, AB.link("project-menu", "open", "Transfers", { title: "The project-name menu opens Version history, Export... and the rest" }));
        return h("div", { class: "fcm-head" }, back,
            h("span", { class: "fcm-crumbs" }, project, h("span", { class: "k-tertiary" }, "/"), h("span", { class: "fcm-title" }, title)),
            h("span", { class: "fcm-acts" }, extras || null));
    }

    // =====================================================================
    // Version history
    // =====================================================================
    function versionHistory(state, fx) {
        const A = fx.datasets.transactionsApril, M = fx.datasets.transactions, D = A.versionDiff, L = A.louvain;
        const past = state === "past-version";
        const wrap = h("div", { class: "fcm" });
        wrap.append(head("Version history", ["graph-place", "at-rest"], [
            AB.button("Export the operation log...", { kind: "secondary", icon: "download", go: ["export-dialog", "data"] }),
        ]));
        const body = h("div", { class: "fcm-body fcm-vh" });

        // ----- left: data versions, then applied recipes -----
        const left = h("div", { class: "fcm-col", role: "region", "aria-label": "Data versions" });
        left.append(h("div", { class: "fcm-colhead" }, h("span", { class: "k-grow" }, "Data versions"), h("span", { class: "k-secondary k-num" }, "3")));
        left.append(h("div", { class: "fcm-cap" }, "Newest first. Each version is what the data was after a load, a join or a replace. ", AB.link("data-place", "versions", "Also in Data > Versions")));

        const bigMark = h("span", { class: "k-warn-glyph", title: "Large change: moved by half or more" }, "!");
        const april = h("div", Object.assign({ class: "fcm-ver", "aria-current": String(!past), role: "button", "aria-label": "April data, current" }, past ? AB.act({ go: ["full-canvas-modes", "version-history"] }) : {}),
            h("div", { class: "fcm-ver-l1" }, icon("history", "sm"), h("span", { class: "k-grow k-ellipsis" }, "April data"), h("span", { class: "k-badge k-secondary" }, "current")),
            h("div", { class: "k-secondary" }, "Replaced from " + A.files.accounts.file + " and " + A.file),
            past ? h("div", { class: "fcm-chg-line" }, bigMark, "2 large changes: components, communities")
                : h("div", { class: "fcm-chg" },
                    h("div", { class: "k-secondary" }, "What changed, against March data"),
                    h("div", { class: "fcm-chg-line" }, h("b", { class: "k-num" }, fmt(A.nodes) + " accounts"), h("span", { class: "k-secondary" }, "(was " + fmt(M.nodes) + ")")),
                    h("div", { class: "fcm-chg-sub k-num" }, fmt(D.accountsKept) + " in both, " + D.accountsAdded + " new, " + D.accountsRemoved + " not in April."),
                    h("div", { class: "fcm-chg-line" }, h("b", { class: "k-num" }, fmt(A.edges) + " transfers"), h("span", { class: "k-secondary" }, "(was " + fmt(M.edges) + ")")),
                    h("div", { class: "fcm-chg-sub k-num" }, fmt(D.transfersBoth) + " in both, " + D.transfersAdded + " new, " + fmt(D.transfersRemoved) + " not in April."),
                    h("div", { class: "fcm-chg-line" }, h("span", { class: "fcm-big" }, bigMark.cloneNode(true), h("b", { class: "k-num" }, A.stats.components + " components")), h("span", { class: "k-secondary" }, "(was " + M.stats.components + ")")),
                    h("div", { class: "fcm-chg-sub" }, A.dormant.count + " accounts have no transfers in this version."),
                    h("div", { class: "fcm-chg-line" }, h("span", { class: "fcm-big" }, bigMark.cloneNode(true), h("b", { class: "k-num" }, L.april.communities + " communities")), h("span", { class: "k-secondary" }, "(was " + L.march.communities + ", Louvain)")),
                    h("div", { class: "fcm-chg-sub" }, A.dormant.singletonCommunities + " are single accounts with no transfers."),
                    h("div", { class: "fcm-btnrow" },
                        AB.button("Compare with March data", { kind: "secondary", icon: "git-compare-arrows", go: ["full-canvas-modes", "comparison"] }),
                        AB.button("Select the " + A.dormant.count, { kind: "ghost", onClick: flash("Select the accounts with no transfers") }))));
        const marchJoin = h("div", Object.assign({ class: "fcm-ver", "aria-current": String(past), role: "button", "aria-label": "March data, joined" }, past ? {} : AB.act({ go: ["full-canvas-modes", "past-version"] })),
            h("div", { class: "fcm-ver-l1" }, icon("history", "sm"), h("span", { class: "k-grow k-ellipsis" }, "March data")),
            h("div", { class: "k-secondary" }, "Joined " + M.accountsFile + ": " + fmt(M.nodes) + " of " + fmt(M.nodes) + " accounts matched, Sep 28"));
        const marchRead = h("div", Object.assign({ class: "fcm-ver", role: "button", "aria-label": "March data, first read" }, AB.act({ onClick: flash("Open the first read of March data") })),
            h("div", { class: "fcm-ver-l1" }, icon("history", "sm"), h("span", { class: "k-grow k-ellipsis" }, "Read " + M.file)),
            h("div", { class: "k-secondary" }, fmt(M.nodes) + " accounts, " + fmt(M.edges) + " transfers, Sep 28. The first version."),
            h("div", null, oq("whether a join makes its own version, or belongs to the read before it")));
        left.append(april, marchJoin, marchRead);

        left.append(AB.section({ title: "Applied recipes", count: 0 },
            h("div", { class: "fcm-cap" }, "No recipe has been applied to this project. An applied recipe is listed here with who saved it and when, when it was applied, and the rows it added to the tree."),
            h("div", { class: "ab-pad" }, AB.button("Apply recipe...", { kind: "secondary", go: ["recipe-apply", "binding"] }))));

        // ----- center: the version on screen -----
        const center = h("div", { class: "fcm-col", role: "region", "aria-label": past ? "March data, view only" : "April data" });
        const cv = h("div", { class: "k-canvas fcm-stagewrap" });
        const stage = h("div", { class: "k-stage", role: "img", "aria-label": past ? "The transfers in March, colored by March's communities" : "The transfers in April, colored by April's communities" },
            AB.drawing(past ? "transactions-march-communities" : "transactions-april-communities", ""));
        cv.append(stage);
        if (past)
            cv.append(h("div", { class: "fcm-banner", role: "status" },
                h("span", { class: "k-grow" }, icon("lock", "sm"), " ", h("b", null, "March data, view only. "), "Select, hover and zoom work; nothing here can be changed. Restore adds March as a new version on top, and April data stays in the list."),
                AB.button("Restore this version", { icon: "undo-2", onClick: flash("Restore this version") }),
                AB.button("Done", { kind: "secondary", go: ["full-canvas-modes", "version-history"] })));
        else
            cv.append(h("div", { class: "fcm-banner" },
                h("span", { class: "k-grow" }, h("b", null, "April data"), h("span", { class: "k-secondary" }, " is what the graph shows now. Pick an older version to look at it without changing anything.")),
                AB.button("Back to the graph", { kind: "secondary", go: ["graph-place", "at-rest"] })));
        const legend = past ? A.legends.march : A.legends.april;
        center.append(cv, h("div", { class: "fcm-legend", "aria-label": "Legend" },
            h("b", null, "Louvain communities"),
            legend.rows.slice(0, 5).map((r) => h("span", null, AB.chit(r.color, true), r.name, h("span", { class: "k-secondary k-num" }, fmt(r.count)))),
            h("span", { class: "k-secondary" }, "and " + (legend.other.communities + legend.rows.length - 5) + " more")));

        // ----- right: the operation log -----
        const right = h("div", { class: "fcm-col", role: "region", "aria-label": "Operation log" });
        right.append(h("div", { class: "fcm-colhead" }, h("span", { class: "k-grow" }, "Operation log")));
        right.append(h("div", { class: "fcm-cap" }, "What was done to this project, newest first: loads, runs, recipes and exports. Click an entry to open what it made."));
        const kinds = ["All", "Data", "Runs", "Recipes", "Exports"];
        const list = h("ul", { class: "fcm-log", "aria-label": "Operations, newest first" });
        const entry = (kind, ic, text, sub, target) => h("li", Object.assign({ class: "fcm-entry", "data-kind": kind }, AB.act(target)), icon(ic, "sm"), h("span", null, text), sub ? h("span", { class: "fcm-entry-sub" }, sub) : null);
        const heading = (t) => h("li", { class: "fcm-loghead", "data-kind": "heading" }, t);
        list.append(
            heading("On April data"),
            entry("Runs", "layers", "Louvain communities, rerun: " + L.april.communities + " communities, modularity " + L.april.modularity, "Weighted by amount, direction ignored, seed 11. The March result is kept under Earlier results.", { go: ["inspector-run-row", "earlier-results"] }),
            entry("Runs", "chart-column", "PageRank", "Directed, damping 0.85, 100 iterations, unweighted.", { go: ["graph-place", "at-rest"] }),
            entry("Data", "upload", "Replaced the data with April", fmt(A.nodes) + " accounts, " + fmt(A.edges) + " transfers, from " + A.files.accounts.file + " and " + A.file + ". Runs on March data were marked out of date.", { go: ["data-place", "versions"] }),
            heading("On March data"),
            entry("Exports", "download", "Exported case-acc-233575_ring-pagerank_2026-03.csv", "Table of 14 accounts and its methods file, to Downloads. Nothing masked.", { go: ["data-place", "sent-and-saved"] }),
            entry("Runs", "layers", "Louvain communities: " + L.march.communities + " communities, modularity " + L.march.modularity, "Weighted by amount, direction ignored, seed 11.", { go: ["inspector-run-row", "out-of-date"] }),
            entry("Data", "table", "Joined " + M.accountsFile, fmt(M.nodes) + " of " + fmt(M.nodes) + " accounts matched, Sep 28.", { go: ["data-place", "at-rest"] }),
            entry("Data", "file-plus", "Read " + M.file, fmt(M.nodes) + " accounts, " + fmt(M.edges) + " transfers, directed, Sep 28.", { go: ["data-place", "at-rest"] }),
        );
        const empty = h("div", { class: "fcm-cap", hidden: true }, "No recipe has been applied to this project.");
        const filter = (k) => {
            list.querySelectorAll(".fcm-entry").forEach((li) => { li.hidden = k !== "All" && li.dataset.kind !== k; });
            list.querySelectorAll(".fcm-loghead").forEach((hd) => {
                let n = hd.nextElementSibling, any = false;
                while (n && !n.classList.contains("fcm-loghead")) { if (!n.hidden) any = true; n = n.nextElementSibling; }
                hd.hidden = !any;
            });
            empty.hidden = !!list.querySelector(".fcm-entry:not([hidden])");
        };
        right.append(h("div", { class: "fcm-seg" }, AB.tabs(kinds, "All", filter)), list, empty,
            h("div", { class: "fcm-cap" }, "Edits made since the last save are undone with Undo, not here. ", oq("whether Undo history is this log, or a list of its own")));

        body.append(left, center, right);
        wrap.append(body);
        return wrap;
    }

    // =====================================================================
    // The comparison surface
    // =====================================================================
    function comparison(state, fx) {
        const A = fx.datasets.transactionsApril, M = fx.datasets.transactions, L = A.louvain, G = A.agreement, D = A.versionDiff;
        const saved = state === "saved";
        const wrap = h("div", { class: "fcm" });
        const title = saved ? "Louvain: March vs April data" : "Compare";
        const badge = saved ? h("span", { class: "k-badge k-secondary" }, icon("circle-check", "sm"), " Saved as a row") : h("span", { class: "k-badge k-secondary", title: "A comparison lasts while this view is open, until you save it" }, "Not saved");
        wrap.append(head(title, saved ? ["graph-place", "at-rest"] : ["full-canvas-modes", "unsaved"], [
            badge,
            saved ? AB.button("Show in the tree", { kind: "secondary", go: ["graph-place", "at-rest"] }) : AB.button("Save comparison", { icon: "bookmark-plus", go: ["full-canvas-modes", "saved"] }),
        ]));
        const body = h("div", { class: "fcm-body fcm-cmp" });

        // ----- the two things chosen -----
        const picker = (label, which, other) => {
            const box = h("span", { class: "fcm-pickwrap" });
            let open = null;
            const close = () => { if (open) { open.remove(); open = null; document.removeEventListener("click", close); } };
            const f = AB.field(label, { caret: true, onClick: () => {
                if (open) return close();
                const it = (t, d, check, target) => h("div", Object.assign({ class: "k-menu-item", role: "menuitem", "data-described": d ? "" : null }, AB.act(target || { onClick: flash("Compare " + t) })), h("span", { class: "k-check-col" }, check ? icon("check", "sm") : null), d ? h("span", null, t, h("span", { class: "k-menu-desc" }, d)) : h("span", null, t));
                open = h("div", { class: "k-menu fcm-pickmenu", role: "menu", on: { click: (e) => e.stopPropagation() } },
                    h("div", { class: "k-menu-label" }, "Runs"),
                    it("Louvain communities, March data", "Earlier result, " + L.march.communities + " communities", which === "A", which === "A" ? { onClick: close } : null),
                    it("Louvain communities, April data", L.april.communities + " communities", which === "B", which === "B" ? { onClick: close } : null),
                    it("PageRank", "A measure: compared by rank change"),
                    h("div", { class: "k-menu-label" }, "Rows"),
                    it("Watchlist", A.watchlist.members + " accounts"),
                    h("div", { class: "k-menu-label" }, "Graphs and time windows"),
                    it("Transfers, " + other, "The same graph at another data version"),
                    it("A time window...", "By the timestamp attribute"));
                box.append(open);
                setTimeout(() => document.addEventListener("click", close), 0);
            } });
            box.append(f);
            return box;
        };
        body.append(h("div", { class: "fcm-pick", role: "group", "aria-label": "What is compared" },
            h("span", { class: "k-secondary" }, "Compare"),
            picker("Louvain communities, March data", "A", "March data"),
            h("span", { class: "k-secondary" }, "with"),
            picker("Louvain communities, April data", "B", "April data"),
            AB.iconButton("arrow-up-down", "Swap the two sides", { onClick: flash("Swap the two sides") }),
            h("span", { class: "k-grow" }),
            h("span", { class: "fcm-hide-narrow k-secondary" }, "Colors match by overlap: an April community keeps the name and color of the March one it matches."),
        ));

        // ----- the two canvases -----
        const side = (title, sub, drawing, runState, legend) => h("div", { class: "fcm-cmpcanvas", role: "region", "aria-label": title },
            h("div", { class: "fcm-cvhead" }, h("span", { class: "k-grow" }, h("b", null, title), h("div", { class: "k-secondary k-num" }, sub)), AB.link("inspector-run-row", runState, "Open run")),
            h("div", { class: "k-canvas fcm-stagewrap" }, h("div", { class: "k-stage", role: "img", "aria-label": title + ", colored by community" }, AB.drawing(drawing, ""))),
            h("div", { class: "fcm-legend" }, legend.rows.slice(0, 4).map((r) => h("span", null, AB.chit(r.color, true), r.name, h("span", { class: "k-secondary k-num" }, fmt(r.count)))), h("span", { class: "k-secondary" }, "and " + (legend.other.communities + legend.rows.length - 4) + " more")));
        body.append(
            side("March data", fmt(M.nodes) + " accounts, " + L.march.communities + " communities, modularity " + L.march.modularity, "transactions-compare-march", "out-of-date", A.legends.march),
            side("April data", fmt(A.nodes) + " accounts, " + L.april.communities + " communities, modularity " + L.april.modularity, "transactions-compare-april", "earlier-results", A.legends.april),
        );

        // ----- the difference panel -----
        const panel = h("div", { class: "fcm-col fcm-side", role: "region", "aria-label": saved ? "The saved comparison" : "The difference" });
        const lo = 0, span = 1;
        const bar = (range, mark) => h("div", { class: "fcm-bar", "aria-hidden": "true" },
            h("i", { class: "fcm-bar-range", style: `left:${((range[0] - lo) / span) * 100}%;width:${((range[1] - range[0]) / span) * 100}%` }),
            h("i", { class: "fcm-bar-mark", style: `left:calc(${((mark - lo) / span) * 100}% - 1px)` }));
        const agreement = AB.section("Agreement",
            h("div", { class: "fcm-metric" }, h("span", { class: "fcm-num k-num" }, String(G.monthsOnAccountsInBoth)), h("span", { class: "k-secondary" }, "Adjusted mutual information over the " + fmt(G.accountsInBoth) + " accounts in both months. 1 is the same grouping; 0 is no more alike than chance.")),
            bar(G.marchRerunRange, G.monthsOnAccountsInBoth),
            h("div", { class: "fcm-barlab" }, h("span", null, "0"), h("span", null, "rerun range, March: " + G.marchRerunRange.join(" to ")), h("span", null, "1")),
            h("div", { class: "fcm-cap" }, "Rerunning on the same data with seeds 12 to 16 agrees " + G.marchRerunRange.join(" to ") + " in March and " + G.aprilRerunRange.join(" to ") + " in April, so the months differ by more than the method's own wobble."),
            h("div", { class: "fcm-cap" }, "Of the pairs of accounts March puts in one community, about " + G.stayTogether.monthsInTen + " in 10 are still together in April; reruns keep " + G.stayTogether.marchRerunInTen[0] + " in 10."));
        const communities = AB.section("Communities",
            AB.data("March", L.march.communities + " communities"),
            AB.data("April", L.april.communities + " communities"),
            AB.data("Matched by overlap", L.matchedPairs + " pairs"),
            AB.data("New in April", L.unmatchedApril + ", holding " + L.unmatchedAprilAccounts + " accounts"),
            AB.data("Gone after March", L.unmatchedMarch.length + " communities"),
            h("div", { class: "fcm-cap" }, L.unmatchedApril + " April communities have no March match; " + L.unmatchedAprilSilent + " of them are single accounts with no April transfers."),
            L.unmatchedMarch.slice(0, 4).map((c) => AB.row({ swatch: AB.chit(fx.canvas.otherGray, true), label: c.name + " (" + c.marchSize + ")", trail: "mostly to " + c.mostlyTo, onClick: flash("Select " + c.name + "'s March members") })),
            AB.row({ label: (L.unmatchedMarch.length - 4) + " more", trail: "", go: ["table-dock", "transfers"] }));
        const grew = AB.section("Grew the most",
            L.grew.slice(0, 4).map((c) => AB.row({ label: c.name, trail: c.marchSize + " to " + c.aprilSize, onClick: flash("Select " + c.name + " on both sides") })));

        if (!saved) {
            panel.append(h("div", { class: "fcm-colhead" }, h("span", { class: "k-grow" }, "The difference")),
                agreement, communities, grew,
                AB.section("When saved",
                    h("div", { class: "fcm-cap" }, "Saving adds a row to the top of the Graph tree, marked as a comparison. Its child paints each account by how its community changed, and the agreement above is kept on its Data tab."),
                    h("div", { class: "fcm-cap" }, "The " + D.accountsAdded + " new accounts form a group of their own; the " + D.accountsRemoved + " not in April have nothing to paint. ", oq("how graphty-element names an account's community change when its community split in two"))),
                h("div", { class: "fcm-foot" },
                    AB.button("Save comparison", { icon: "bookmark-plus", go: ["full-canvas-modes", "saved"] }),
                    AB.button("Discard", { kind: "ghost", go: ["full-canvas-modes", "unsaved"] })));
        } else {
            const rowTree = AB.tree([{
                name: "Louvain: March vs April", kindIcon: "git-compare-arrows", eye: true, open: true, selected: true,
                swatch: h("span", { class: "ab-multi" }, AB.chit("#0072B2", true), AB.chit("#E69F00", true), AB.chit(fx.canvas.otherGray, true)),
                children: [
                    { name: "Community change", kindIcon: "layers", eye: true, swatch: h("span", { class: "ab-multi" }, AB.chit("#0072B2", true), AB.chit("#E69F00", true)) },
                    { name: "In a community new in April", kindIcon: "circle-dot", count: String(L.unmatchedAprilAccounts), eye: true, swatch: AB.chit("#E69F00", true) },
                    { name: "New accounts", kindIcon: "circle-dot", count: String(D.accountsAdded), eye: true, swatch: AB.chit("#0072B2", true) },
                ],
            }], { label: "The new row, as it sits in the Graph tree" });
            panel.append(
                h("div", { class: "fcm-saved", role: "status" }, h("b", null, "Saved at the top of the Graph tree."), h("span", { class: "k-secondary" }, "It paints now: each account by how its community changed. Hide it with its eye.")),
                h("div", { class: "fcm-colhead" }, h("span", { class: "k-grow" }, "In the tree")),
                h("div", { class: "fcm-tree" }, rowTree),
                AB.inspector({ icon: "git-compare-arrows", title: "Louvain: March vs April", kind: "Comparison", tab: "Data", kindKey: "fcm-comparison",
                    tabs: {
                        Style: () => [
                            AB.section("Colors for the change",
                                AB.row({ swatch: AB.chit("#E69F00", true), label: "In a community new in April", trail: fmt(L.unmatchedAprilAccounts) }),
                                AB.row({ swatch: AB.chit("#0072B2", true), label: "New accounts", trail: String(D.accountsAdded) }),
                                h("div", { class: "fcm-cap" }, "Accounts whose community carried over keep the colors of the layers beneath. ", oq("which other change groups the element publishes"))),
                        ],
                        Data: () => [
                            AB.section("Readings",
                                AB.data("Agreement (AMI)", String(G.monthsOnAccountsInBoth)),
                                AB.data("Accounts compared", fmt(G.accountsInBoth) + " in both"),
                                AB.data("Rerun range, March", G.marchRerunRange.join(" to ")),
                                AB.data("Rerun range, April", G.aprilRerunRange.join(" to ")),
                                AB.data("Matched communities", L.matchedPairs + " pairs")),
                            AB.section("Provenance",
                                AB.data("First", "Louvain, March data", { go: ["inspector-run-row", "out-of-date"] }),
                                AB.data("Second", "Louvain, April data", { go: ["inspector-run-row", "earlier-results"] }),
                                AB.data("Matched by", "overlap of members")),
                            AB.section("Compare", h("div", { class: "ab-pad" }, AB.button("Open the comparison", { kind: "secondary", icon: "git-compare-arrows", go: ["full-canvas-modes", "comparison"] }))),
                        ],
                    } }));
        }
        body.append(panel);
        wrap.append(body);

        // ----- leaving without saving -----
        if (state === "unsaved") {
            const box = h("div", { class: "k-modal", role: "dialog", "aria-label": "Leave without saving the comparison?" },
                h("div", { class: "k-modal-head" }, h("span", { class: "k-grow" }, "Leave without saving the comparison?"), AB.iconButton("x", "Close", { go: ["full-canvas-modes", "comparison"] })),
                h("div", { class: "k-modal-body" }, h("p", { style: "margin:0;padding:12px 16px;line-height:18px" }, "A comparison lasts only while this view is open. Save it to keep it as a row in the Graph tree, with the difference that paints and its agreement score on the Data tab. Both runs stay either way.")),
                h("div", { class: "k-modal-foot" },
                    AB.button("Cancel", { kind: "ghost", go: ["full-canvas-modes", "comparison"] }),
                    AB.button("Discard", { kind: "secondary", go: ["graph-place", "at-rest"] }),
                    AB.button("Save comparison", { go: ["full-canvas-modes", "saved"] })));
            wrap.append(h("div", { class: "fcm-modal", on: { click: () => AB.go("full-canvas-modes", "comparison") } }, h("div", { on: { click: (e) => e.stopPropagation() } }, box)));
            setTimeout(() => { const b = box.querySelector(".k-btn:last-child"); if (b) b.focus(); }, 0);
        }
        if (saved)
            wrap.append(h("div", { class: "fcm-toastwrap", role: "status" }, AB.notice("Louvain: March vs April added to the Graph tree", { label: "Show in the tree", go: ["graph-place", "at-rest"] })));
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
            { id: "comparison", label: "Comparison surface" },
            { id: "unsaved", label: "Leaving unsaved" },
            { id: "saved", label: "Comparison saved (row added)" },
        ],
        render(el, state) {
            const fx = AB.fx;
            el.append(state === "version-history" || state === "past-version" ? versionHistory(state, fx) : comparison(state, fx));
        },
    });
})();
