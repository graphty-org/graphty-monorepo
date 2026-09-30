/* Data place: where the data came from, what counts (filter steps), how each attribute is read,
   which data version is current, and what left the project. Shown on the transfers data.
   Styles for this section are injected once below (no shared file is touched). Plain ASCII. */
(function () {
    "use strict";
    const { h, icon, act } = AB;

    // ---------- this section's styles ----------
    if (!document.getElementById("dp-style")) {
        document.head.append(h("style", { id: "dp-style" }, `
.dp-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; position: relative; }
.dp-sec { border-bottom: 1px solid var(--cm-border); padding-bottom: 8px; }
.dp-sec:last-child { border-bottom: 0; }
.dp-head { display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 8px 0 16px; font-weight: 550; }
.dp-head[role=button] { cursor: default; }
.dp-head .k-count { font-weight: 450; color: var(--cm-text-secondary); }
.dp-sub { display: flex; align-items: center; gap: 6px; padding: 6px 16px 2px; font-size: 11px; color: var(--cm-text-secondary); }
.dp-group { display: flex; align-items: center; gap: 4px; height: 28px; padding: 0 8px 0 16px; margin-top: 4px; font-weight: 550; }
.dp-row { position: relative; display: flex; align-items: flex-start; gap: 8px; min-height: 32px; margin: 0 8px; padding: 4px 4px 4px 8px; border-radius: 5px; }
.dp-row:hover { background: var(--cm-bg-secondary, rgba(128,128,128,.08)); }
.dp-row[aria-selected=true] { background: var(--cm-bg-selected, rgba(13,153,255,.12)); }
.dp-row[data-level="2"] { margin-inline-start: 28px; }
.dp-row .dp-lead { flex: none; display: grid; place-items: center; width: 24px; height: 24px; }
.dp-main { display: flex; flex-direction: column; min-width: 0; flex: 1; line-height: 16px; padding-top: 4px; }
.dp-l1 { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dp-l2 .k-badge { margin: 2px 0; }
.dp-l2 { color: var(--cm-text-secondary); font-size: 11px; white-space: normal; }
.dp-fact { color: var(--cm-text); }
.dp-trail { display: flex; align-items: center; gap: 6px; flex: none; min-height: 24px; }
.dp-lvl { display: inline-grid; place-items: center; min-width: 24px; height: 24px; border-radius: 5px; font-size: 11px; font-weight: 600; letter-spacing: -0.2px; color: var(--cm-text-secondary); }
.dp-lvl:hover, .dp-lvl:focus-visible { box-shadow: inset 0 0 0 1px var(--cm-border-strong); }
.dp-lvl[data-changed] { color: var(--cm-text-brand, var(--cm-bg-brand)); box-shadow: inset 0 0 0 1px var(--cm-bg-brand); }
.dp-spark { display: inline-flex; align-items: flex-end; gap: 1px; width: 40px; height: 14px; flex: none; }
.dp-spark > i { flex: 1; min-height: 1px; background: var(--cm-border-translucent-strong); border-radius: 1px 1px 0 0; }
.dp-paint { display: inline-grid; place-items: center; width: 24px; height: 24px; flex: none; border-radius: 5px; }
.dp-paint > b { width: 10px; height: 10px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--cm-border-translucent); }
.dp-paint:hover { box-shadow: inset 0 0 0 1px var(--cm-border-strong); }
.dp-paint-empty { width: 24px; flex: none; }
.dp-name { font-weight: 450; }
.dp-step .dp-grip { color: var(--cm-text-tertiary); cursor: grab; }
.dp-step[data-off] .dp-name { color: var(--cm-text-secondary); }
.dp-caption { padding: 2px 16px 6px; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); }
.dp-none { padding: 4px 16px 6px; color: var(--cm-text-secondary); }
.dp-foot { padding: 4px 16px 4px; }
.dp-search { padding: 0 16px 4px; }
.dp-search .k-field { width: 100%; box-sizing: border-box; color: var(--cm-text-tertiary); }
.dp-open-q { display: inline-flex; align-items: center; height: 16px; padding: 0 5px; border-radius: 5px; font-size: 10px; font-weight: 600; color: var(--k-annot-ink); box-shadow: inset 0 0 0 1px var(--k-annot); white-space: nowrap; }
.dp-note { margin: 2px 8px 4px 40px; padding: 4px 8px; border-radius: 5px; font-size: 11px; line-height: 16px; background: var(--cm-bg-secondary, rgba(128,128,128,.08)); }
.dp-rerun { color: var(--cm-text-brand, var(--cm-bg-brand)); text-decoration: underline; cursor: pointer; }
.dp-scrim { inset: 0; }
.dp-toastwrap { pointer-events: auto; }
.dp-kv { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; padding: 2px 16px 6px; font-size: 12px; line-height: 18px; }
.dp-kv dt { color: var(--cm-text-secondary); }
.dp-kv dd { margin: 0; }
`));
    }

    // ---------- fixture content ----------
    const T = () => AB.fx.datasets.transactions;
    const perDay = () => AB.fx.scenarios.filterChipWindow.transfersPerDay;
    const SRC = "transfers-march.csv";
    const JOINED = "accounts.csv";
    const n = (x) => Number(x).toLocaleString("en-US");

    // measurement levels: categorical Abc, ordinal (stepped), quantitative #, time (calendar)
    const LEVEL_WORD = { cat: "categorical", ord: "ordinal", num: "quantitative", time: "time" };
    function levelGlyph(level) {
        if (level === "cat") return "Abc";
        if (level === "num") return "#";
        if (level === "time") return icon("calendar", "sm");
        const s = h("svg", { class: "k-i k-i-sm", viewBox: "0 0 12 12", "aria-hidden": "true" });
        s.append(h("path", { d: "M1 11h3V8h3V5h3V2", fill: "none", stroke: "currentColor", "stroke-width": "1.5" }));
        return s;
    }
    const CYCLE = { cat: "ord", ord: "num", num: "cat", time: "time" };

    function spark(values) {
        const max = Math.max(...values);
        return h("span", { class: "dp-spark", "aria-hidden": "true" }, values.map((v) => h("i", { style: `height:${Math.max(4, Math.round((v / max) * 100))}%` })));
    }

    // ---------- overlays this section opens in place ----------
    function openMenu(anchor, items, place, onClose) {
        const ov = document.getElementById("ab-overlay");
        let done = false;
        const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(true); } };
        const scrim = h("div", { class: "dp-scrim", on: { click: (e) => { e.stopPropagation(); close(true); } } });
        const wrap = (it) => (it.onClick ? Object.assign({}, it, { onClick: (e) => { close(false); it.onClick(e); } }) : it);
        const m = AB.menu({ anchor, place: place || "below-end", items: items.map(wrap) });
        function close(user) {
            if (done) return;
            done = true;
            document.removeEventListener("keydown", esc, true);
            if (!m.isConnected) return; // the route already changed
            scrim.remove();
            m.remove();
            ov.dataset.active = "false";
            ov.hidden = wasHidden;
            if (user && onClose) onClose();
        }
        const wasHidden = ov.hidden;
        ov.hidden = false;
        ov.append(scrim, m);
        ov.dataset.active = "true";
        document.addEventListener("keydown", esc, true);
        setTimeout(() => { const f = m.querySelector(".k-menu-item"); if (f) f.focus(); }, 0);
    }
    const SOURCE_MENU = [
        { label: "Update with new data...", desc: "Next month's file with the same columns", go: ["load-step", "preview"] },
        { label: "Replace data...", go: ["load-step", "preview"] },
        { sep: true },
        { label: "Add a table...", go: ["load-step", "preview"] },
        { label: "Join...", go: ["load-step", "checks"] },
        { label: "Re-map columns...", go: ["load-step", "preview"] },
        { sep: true },
        { label: "Show import report", go: ["load-step", "checks"] },
    ];

    // ---------- small builders ----------
    function fold(title, count, open, body, id) {
        const sec = h("section", { class: "dp-sec", id });
        const head = h("div", { class: "dp-head", role: "button", tabindex: "0", "aria-expanded": String(open) });
        const box = h("div", { hidden: !open });
        const paint = () => {
            head.replaceChildren(...[icon(open ? "chevron-down" : "chevron-right", "sm"), title, count != null ? h("span", { class: "k-count k-num" }, count) : null].filter(Boolean));
            head.setAttribute("aria-expanded", String(open));
            box.hidden = !open;
        };
        const toggle = () => { open = !open; paint(); };
        head.addEventListener("click", toggle);
        head.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle()));
        paint();
        AB.append(box, [body]);
        sec.append(head, box);
        return sec;
    }
    function plainHead(title, count, actions) {
        return h("div", { class: "dp-head" }, title, count != null ? h("span", { class: "k-count k-num" }, count) : null, h("span", { class: "k-grow" }), actions || null);
    }
    function row(o) {
        const r = h("div", Object.assign({ class: "dp-row" + (o.cls ? " " + o.cls : ""), role: "treeitem", "aria-selected": o.selected ? "true" : "false", "data-level": o.level ? String(o.level) : null, "data-off": o.off ? "" : null }, act(o.go ? { go: o.go } : o.onClick ? { onClick: o.onClick } : null)),
            o.lead ? h("span", { class: "dp-lead" }, o.lead) : null,
            h("span", { class: "dp-main" }, h("span", { class: "dp-l1" }, o.l1), o.l2 ? h("span", { class: "dp-l2" }, o.l2) : null),
            o.trail ? h("span", { class: "dp-trail" }, o.trail) : null);
        if (o.menu) r.addEventListener("contextmenu", (e) => { e.preventDefault(); AB.go(o.menu[0], o.menu[1]); });
        return r;
    }

    // ---------- the place ----------
    function build(el, cfg) {
        const t = T();
        el.append(AB.placeHead("Data", [
            AB.iconButton("file-plus", "Add data...", { go: ["load-step", "preview"] }),
        ]));
        const scroll = h("div", { class: "dp-scroll" });
        el.append(scroll);

        // 1. Sources
        const srcMenuBtn = AB.iconButton("ellipsis", "Source menu", { onClick: (e) => openMenu(e.currentTarget, SOURCE_MENU) });
        const openSrc = (e) => openMenu(srcMenuBtn, SOURCE_MENU);
        scroll.append(h("section", { class: "dp-sec", id: "dp-sources" },
            plainHead("Sources"),
            h("div", { role: "tree", "aria-label": "Sources" },
                row({ lead: icon("file"), l1: h("span", { class: "dp-name k-ellipsis" }, SRC), l2: h("span", { class: "dp-fact" }, `${n(t.nodes)} nodes, ${n(t.edges)} edges, directed, read Sep 28`), trail: srcMenuBtn, onClick: openSrc }),
                row({ level: 2, lead: icon("link"), l1: h("span", { class: "dp-name k-ellipsis" }, JOINED), l2: h("span", { class: "dp-fact" }, `joined on id, ${n(t.nodes)} of ${n(t.nodes)} matched`), onClick: openSrc }),
            )));

        // 2. Filters
        const steps = cfg.steps === "none" ? [] : [
            { name: "amount >= 1,000", outcome: `${n(t.nodes)} to 812 nodes`, on: cfg.steps !== "undone" },
            { name: "kind is not merchant", outcome: null, on: false },
        ];
        const outcomeText = (s, i) => s.on ? (s.outcome || "On. The skeleton does not model this count.") : i === 0 && cfg.steps === "undone" ? "Undone. Tick it, or Redo, to put it back." : "Off: later steps read as if it were not there.";
        const stepList = h("div", { role: "tree", "aria-label": "Filter steps, in the order they apply" });
        steps.forEach((s, i) => {
            const check = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(s.on), "aria-label": "Apply " + s.name });
            const r = row({
                cls: "dp-step", off: !s.on, go: ["inspector-attribute-and-filter-step", "filter-step"],
                lead: h("span", { class: "dp-grip", title: "Drag to reorder" }, icon("grip-vertical", "sm")),
                l1: [check, h("span", { class: "dp-name k-ellipsis" }, s.name)],
                l2: h("span", { class: s.on ? "dp-fact dp-outcome" : "dp-outcome" }, outcomeText(s, i)),
                trail: AB.iconButton("ellipsis", "Filter step menu", {
                    onClick: (e) => openMenu(e.currentTarget, [
                        { label: "Edit step...", shortcut: "Enter", go: ["inspector-attribute-and-filter-step", "filter-step"] },
                        { label: s.on ? "Turn off step" : "Turn on step", shortcut: "Space", onClick: () => check.click() },
                        { label: "Move up", shortcut: "Ctrl+]", disabled: i === 0 },
                        { label: "Move down", shortcut: "Ctrl+[", disabled: i === steps.length - 1 },
                        { sep: true },
                        { label: "Add note...", go: ["notes-place"] },
                        { label: "Delete step", shortcut: "Delete" },
                    ]),
                }),
            });
            if (i === 0) r.id = "dp-step-first";
            check.addEventListener("click", (e) => {
                e.stopPropagation();
                s.on = !s.on;
                check.setAttribute("aria-checked", String(s.on));
                r.toggleAttribute("data-off", !s.on);
                const o = r.querySelector(".dp-outcome");
                o.textContent = outcomeText(s, i);
                o.classList.toggle("dp-fact", s.on);
            });
            check.addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); check.click(); } });
            stepList.append(r);
        });
        const addStep = AB.button("Add filter step...", {
            kind: "ghost", icon: "plus",
            onClick: (e) => openMenu(e.currentTarget, [
                { heading: "Keep only" },
                { label: "By an attribute or computed value...", go: ["inspector-attribute-and-filter-step", "filter-step"] },
                { label: "Weight threshold...", desc: "Edges at or above an amount", go: ["inspector-attribute-and-filter-step", "filter-step"] },
                { label: "Largest component", go: ["inspector-attribute-and-filter-step", "filter-step"] },
                { label: "k-core...", go: ["inspector-attribute-and-filter-step", "filter-step"] },
                { label: "Neighbors of the selection...", desc: "Select nodes first", disabled: true },
            ], "below-start"),
        });
        const activeCount = steps.filter((s) => s.on).length;
        scroll.append(h("section", { class: "dp-sec", id: "dp-filters" },
            plainHead("Filters", steps.length ? `${steps.length} steps, ${activeCount} on` : null),
            h("div", { class: "dp-caption" }, "Filters change what is computed and laid out. To stop drawing something, use the eye in the ", AB.link("graph-place", "at-rest", "Graph tree"), "."),
            steps.length ? stepList : h("div", { class: "dp-none" }, "None. Every node and edge is computed and laid out."),
            h("div", { class: "dp-foot" }, addStep)));

        // 3. Attributes
        const filtered = cfg.steps === "two";
        const attrRow = (a) => {
            let level = a.level;
            const lvl = h("span", { class: "dp-lvl", role: "button", tabindex: "0", title: `Read as ${LEVEL_WORD[level]}. Click to change how ${a.name} is read.`, "aria-label": `${a.name}: read as ${LEVEL_WORD[level]}. Change` }, levelGlyph(level));
            const note = h("div", { class: "dp-note", hidden: true });
            const setLevel = (lv, from) => {
                level = lv;
                lvl.replaceChildren(levelGlyph(lv));
                lvl.setAttribute("data-changed", "");
                lvl.title = `Read as ${LEVEL_WORD[lv]}. Click to change how ${a.name} is read.`;
                lvl.setAttribute("aria-label", `${a.name}: read as ${LEVEL_WORD[lv]}. Change`);
                note.hidden = false;
                note.replaceChildren(h("span", { class: "dp-fact" }, `${a.name} is now read as ${LEVEL_WORD[lv]} (was ${LEVEL_WORD[from]}). `), "Every row that reads it updates: an ordinal attribute gets an ordered palette, a categorical one distinct colors. ", h("span", Object.assign({ class: "dp-rerun", role: "button" }, act({ onClick: () => setLevel(from, lv) })), "Undo"));
            };
            if (a.level !== "time") lvl.addEventListener("click", (e) => { e.stopPropagation(); setLevel(CYCLE[level], level); });
            lvl.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); lvl.click(); } });
            const trail = [
                a.spark ? spark(a.spark) : null,
                a.paint
                    ? h("span", Object.assign({ class: "dp-paint", role: "button", title: "The PageRank row in the Graph tree paints from this. Click to select that row.", "aria-label": "Select the PageRank row that paints from this" }, act({ go: ["inspector-measure-row", "style"] })), h("b", { class: "k-ramp k-ramp-measure" }))
                    : h("span", { class: "dp-paint-empty" }),
            ];
            let l2 = a.l2 || null;
            if (a.run) {
                l2 = [`from PageRank, on ${n(t.nodes)} nodes, March data`];
                if (filtered) l2.push(h("br"), h("span", { class: "dp-fact" }, `on ${n(t.nodes)} nodes; now 812. `), h("span", Object.assign({ class: "dp-rerun", role: "button" }, act({ onClick: () => AB.flash("Rerun on current filter (not wired in the skeleton)") })), "Rerun on current filter"));
            }
            const r = row({
                lead: lvl,
                l1: h("span", { class: "dp-name k-ellipsis" }, a.name),
                l2: a.badge ? [h("span", { class: "k-badge dp-fact" }, a.badge), l2 ? [" ", l2] : null] : l2, trail,
                selected: cfg.selected === a.name,
                go: ["inspector-attribute-and-filter-step", "attribute"],
                menu: ["context-menus", "attribute"],
            });
            if (cfg.changeLevel === a.name) setTimeout(() => setLevel("ord", level), 0);
            return [r, note];
        };
        const kinds = t.attributes.find((a) => a.name === "kind").values;
        const flagged = t.attributes.find((a) => a.name === "flagged").values;
        const nodeGroups = [
            ["From runs", null, [{ name: "PageRank", level: "num", run: true, paint: true, spark: [96, 40, 14, 6, 3, 2, 1, 1, 1] }]],
            ["Joined", JOINED, [
                { name: "kind", level: "cat", badge: "node type", spark: [kinds.personal, kinds.business, kinds.merchant] },
                { name: "country", level: "cat" },
                { name: "riskScore", level: "num", l2: "the bank's own score, 0 to 100, not computed by graphty" },
                { name: "flagged", level: "cat", spark: [flagged.false, flagged.true] },
                { name: "alertRule", level: "cat", l2: "empty on accounts with no alert" },
                { name: "alertTime", level: "time", l2: "empty on accounts with no alert" },
            ]],
            ["From the file", SRC, [{ name: "id", level: "cat", l2: "the account; the key accounts.csv joins on" }]],
        ];
        const edgeGroups = [
            ["From the file", SRC, [
                { name: "amount", level: "num", badge: "weight: capacity", spark: [100, 52, 30, 18, 10, 6, 3, 2, 1] },
                { name: "timestamp", level: "time", badge: "time", spark: perDay() },
            ]],
        ];
        const groupBlock = (title, count, tab, groups) => [
            h("div", { class: "dp-group" }, title, h("span", { class: "k-count k-num k-secondary" }, count), h("span", { class: "k-grow" }), AB.iconButton("table", `Show ${title.toLowerCase()} in the table`, { go: ["table-dock", tab] })),
            groups.map(([sub, from, attrs]) => [
                h("div", { class: "dp-sub" }, sub, from ? h("span", { class: "k-tertiary" }, from) : null),
                h("div", { role: "tree", "aria-label": `${title}: ${sub}` }, attrs.map(attrRow)),
            ]),
        ];
        const nodeCount = nodeGroups.reduce((s, g) => s + g[2].length, 0);
        const edgeCount = edgeGroups.reduce((s, g) => s + g[2].length, 0);
        scroll.append(h("section", { class: "dp-sec", id: "dp-attributes" },
            plainHead("Attributes", String(nodeCount + edgeCount)),
            h("div", { class: "dp-search" }, AB.field("Find attribute", { icon: "search", onClick: () => AB.flash("Find attribute (not wired in the skeleton)") })),
            groupBlock("Nodes", String(nodeCount), "nodes", nodeGroups),
            groupBlock("Edges", String(edgeCount), "edges", edgeGroups),
            h("div", { class: "dp-foot" }, h("span", { title: "Tableau calls this a calculated field" }, AB.button("New attribute...", { kind: "ghost", icon: "plus", onClick: () => AB.flash("New attribute... (not wired in the skeleton)") })))));

        // 4. Versions (folded)
        scroll.append(fold("Versions", "2", !!cfg.openFolds, [
            h("div", { role: "tree", "aria-label": "Data versions, newest first" },
                row({ lead: icon("history", "sm"), l1: [h("span", { class: "dp-name" }, `Joined ${JOINED}`), h("span", { class: "k-badge k-secondary" }, "current")], l2: `${n(t.nodes)} of ${n(t.nodes)} matched, Sep 28`, go: ["full-canvas-modes", "version-history"] }),
                row({ lead: icon("history", "sm"), l1: h("span", { class: "dp-name" }, `Read ${SRC}`), l2: [`${n(t.nodes)} nodes, ${n(t.edges)} edges, Sep 28. `, AB.link("full-canvas-modes", "comparison", "Compare with current")], go: ["full-canvas-modes", "version-history"] })),
            h("div", { class: "dp-caption" }, h("span", { class: "dp-open-q" }, "Open question"), " Whether a join makes its own version, or belongs to the read before it."),
        ], "dp-versions"));

        // 5. Sent and saved (folded)
        scroll.append(fold("Sent and saved", null, !!cfg.openFolds, [
            h("dl", { class: "dp-kv" },
                h("dt", null, "Sent"), h("dd", null, "Nothing. The Assistant is off and no data source is connected."),
                h("dt", null, "Usage data"), h("dd", null, "Off. ", AB.link("preferences", "general", "Change in Preferences"))),
            h("div", { class: "dp-sub" }, "Saved to this computer, newest first"),
            h("div", { role: "tree", "aria-label": "Files written, newest first" },
                row({ lead: icon("download", "sm"), l1: h("span", { class: "dp-name k-ellipsis" }, "case-acc-233575_ring-pagerank_2026-03.csv"), l2: "Table of 14 accounts and its methods file, March data, to Downloads. Nothing masked.", trail: AB.iconButton("refresh-cw", "Export again with the same settings", { go: ["export-dialog", "data"] }), go: ["export-dialog", "data"] })),
        ], "dp-sent"));

        // focus and scroll for the state
        if (cfg.scrollTo) setTimeout(() => {
            const target = scroll.querySelector("#" + cfg.scrollTo);
            if (target) scroll.scrollTop = target.offsetTop;
        }, 0);
        if (cfg.sourceMenu) setTimeout(() => openMenu(srcMenuBtn, SOURCE_MENU, "below-end", () => AB.go("data-place", "at-rest")), 0);
        if (cfg.undoNotice) setTimeout(() => {
            const ov = document.getElementById("ab-overlay");
            const toast = h("div", { class: "dp-toastwrap", role: "status" }, AB.notice("Undone: amount >= 1,000", {
                label: "Show in steps",
                onClick: () => { const s = document.getElementById("dp-step-first"); if (s) { scroll.scrollTop = document.getElementById("dp-filters").offsetTop; s.focus(); } toast.remove(); },
            }));
            ov.hidden = false;
            ov.append(toast);
            AB.position(toast, document.getElementById("ab-toolbar") && document.getElementById("ab-toolbar").childElementCount ? "#ab-toolbar" : null, "above");
        }, 0);
    }

    const CFG = {
        "at-rest": { steps: "none" },
        filters: { steps: "two" },
        "undo-notice": { steps: "undone", undoNotice: true },
        attributes: { steps: "two", selected: "amount", scrollTo: "dp-attributes" },
        "level-changed": { steps: "two", changeLevel: "riskScore", scrollTo: "dp-attributes" },
        "sources-menu": { steps: "none", sourceMenu: true },
        versions: { steps: "two", openFolds: true, scrollTo: "dp-versions" },
        "sent-and-saved": { steps: "two", openFolds: true, scrollTo: "dp-sent" },
    };

    registerSection({
        id: "data-place",
        title: "Data place",
        region: "left",
        rail: "data",
        // The Data place works on the transfers; the header's filter chip says what its steps leave
        frame(state) {
            const steps = (CFG[state] || CFG["at-rest"]).steps;
            const chip = steps === "two" ? "Filtered: 812 of " + AB.fx.datasets.transactions.nodes.toLocaleString("en-US") + " nodes" : steps === "undone" ? "Full graph, 2 steps off" : "Full graph";
            return { dataset: "transactions", chip };
        },
        states: [
            { id: "at-rest", label: "No filters" },
            { id: "filters", label: "Two filter steps" },
            { id: "undo-notice", label: "After undoing a step" },
            { id: "attributes", label: "Attributes, one open" },
            { id: "level-changed", label: "Level icon clicked" },
            { id: "sources-menu", label: "Sources menu open" },
            { id: "versions", label: "Versions and Sent and saved open" },
            { id: "sent-and-saved", label: "Sent and saved (from the privacy line)" },
        ],
        render(el, state) {
            build(el, CFG[state] || CFG["at-rest"]);
        },
    });
})();
