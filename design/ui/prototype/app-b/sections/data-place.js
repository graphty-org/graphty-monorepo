/* Data place: "Data: <graph name>". Sources (the one home for bringing data into this graph),
   Filters, Attributes, Versions, Sent and saved. Shown on the transfers data.
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
.dp-l2 { color: var(--cm-text-secondary); font-size: 11px; white-space: normal; overflow-wrap: anywhere; }
.dp-l2.dp-l2-one { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; overflow-wrap: normal; }
.dp-fact { color: var(--cm-text); }
.dp-trail { display: flex; align-items: center; gap: 6px; flex: none; min-height: 24px; }
.dp-lvl { display: inline-grid; place-items: center; min-width: 24px; height: 24px; border-radius: 5px; font-size: 11px; font-weight: 600; letter-spacing: -0.2px; color: var(--cm-text-secondary); }
.dp-lvl:hover, .dp-lvl:focus-visible { box-shadow: inset 0 0 0 1px var(--cm-border-strong); }
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
.dp-oq { display: inline-flex; align-items: center; height: 16px; padding: 0 4px; border: 1px dashed var(--cm-border-strong); border-radius: 4px; font-size: 10px; line-height: 14px; color: var(--cm-text-secondary); white-space: nowrap; font-weight: 400; cursor: help; }
.dp-alert { margin: 2px 8px 4px 40px; padding: 4px 8px; border-radius: 5px; font-size: 11px; line-height: 16px; background: var(--cm-bg-secondary, rgba(128,128,128,.08)); color: var(--cm-text); }
.dp-stale { display: inline-flex; align-items: center; gap: 3px; color: var(--cm-text-warning, var(--cm-text)); font-weight: 550; }
.dp-link { color: var(--cm-text-brand, var(--cm-bg-brand)); text-decoration: underline; cursor: pointer; }
.dp-swline { display: flex; align-items: center; gap: 8px; padding: 0 16px 4px; font-size: 12px; }
.dp-scrim { position: absolute; inset: 0; }
.dp-toastwrap { pointer-events: auto; }
.dp-kv { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; padding: 2px 16px 6px; font-size: 12px; line-height: 18px; }
.dp-kv dt { color: var(--cm-text-secondary); }
.dp-kv dd { margin: 0; }
.dp-dlg { padding: 12px 16px 4px; }
.dp-dlg p { margin: 0 0 8px; }
`));
    }

    // ---------- fixture content ----------
    const T = () => AB.fx.datasets.transactions;
    const perDay = () => AB.fx.scenarios.filterChipWindow.transfersPerDay;
    const n = (x) => Number(x).toLocaleString("en-US");
    const URL_SRC = "https://alerts.bank.example/structuring/2026-03.json";
    const oq = (text) => h("span", { class: "dp-oq", title: text, "aria-label": "Open question: " + text }, "Open question");

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
    function spark(values) {
        const max = Math.max(...values);
        return h("span", { class: "dp-spark", "aria-hidden": "true" }, values.map((v) => h("i", { style: `height:${Math.max(4, Math.round((v / max) * 100))}%` })));
    }

    // ---------- overlays this section opens in place ----------
    function openLayer(child, onClose, focusSel) {
        const ov = document.getElementById("ab-overlay");
        const wasHidden = ov.hidden;
        let done = false;
        const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(true); } };
        const scrim = h("div", { class: "dp-scrim", on: { click: (e) => { e.stopPropagation(); close(true); } } });
        function close(user) {
            if (done) return;
            done = true;
            document.removeEventListener("keydown", esc, true);
            if (!child.isConnected) return; // the route already changed
            scrim.remove();
            child.remove();
            ov.dataset.active = "false";
            ov.hidden = wasHidden;
            if (user && onClose) onClose();
        }
        ov.hidden = false;
        ov.append(scrim, child);
        ov.dataset.active = "true";
        document.addEventListener("keydown", esc, true);
        setTimeout(() => { const f = child.querySelector(focusSel || ".k-menu-item"); if (f) f.focus(); }, 0);
        return close;
    }
    function openMenu(anchor, items, place, onClose) {
        let close = () => {};
        const wrap = (it) => (it.onClick ? Object.assign({}, it, { onClick: (e) => { close(false); it.onClick(e); } }) : it);
        const m = AB.menu({ anchor, place: place || "below-end", items: items.map(wrap) });
        close = openLayer(m, onClose);
    }

    // The Sources "+" menu: every way data comes into this graph
    const ADD_MENU = [
        { label: "File...", desc: "One file, or a node file and an edge file together", go: ["load-step", "preview"] },
        { label: "From a URL...", desc: "Read now; Refresh reads it again", go: ["data-place", "url-source"] },
        { label: "Paste...", desc: "Rows or a list of edges from the clipboard", go: ["load-step", "preview"] },
        { label: "Set collection...", desc: "Lands as a folder of sets in the Graph tree", go: ["load-step", "preview"] },
        { sep: true },
        { label: "Table matched by key...", desc: "Needs graphty-element: it has no join", disabled: true },
    ];
    const HEAD_MENU = [
        { label: "Clear graph data...", desc: "Every source, every node and edge", go: ["data-place", "clear-confirm"] },
    ];
    const removeItem = { label: "Remove this source", desc: "Needs graphty-element: it does not record which source each node and edge came from", disabled: true };
    const FILE_MENU = [
        { label: "Replace data...", desc: "A newer file; the graph is untouched if it fails", go: ["load-step", "replace"] },
        { label: "Re-map columns...", go: ["load-step", "remap"] },
        { label: "Show import report", go: ["inspector-source", "import-report-warnings"] },
        { sep: true },
        removeItem,
    ];
    const URL_MENU = [
        { label: "Refresh", desc: "Read the address again; the graph is untouched if it fails", go: ["data-place", "after-replace"] },
        { label: "Re-map columns...", go: ["load-step", "remap"] },
        { label: "Show import report", go: ["inspector-source", "import-report-warnings"] },
        { sep: true },
        removeItem,
    ];
    const ADD_STEP_MENU = [
        { heading: "Keep only" },
        { label: "By an attribute or computed value...", go: ["inspector-attribute-and-filter-step", "filter-step"] },
        { label: "Weight threshold...", desc: "Edges at or above an amount", go: ["inspector-attribute-and-filter-step", "filter-step"] },
        { label: "Largest component", go: ["inspector-attribute-and-filter-step", "filter-step"] },
        { label: "k-core...", go: ["inspector-attribute-and-filter-step", "filter-step"] },
        { label: "Neighbors of the selection...", desc: "Select nodes first", disabled: true },
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
        const r = h("div", Object.assign({ class: "dp-row" + (o.cls ? " " + o.cls : ""), role: "treeitem", tabindex: "0", "aria-selected": o.selected ? "true" : "false", "data-level": o.level ? String(o.level) : null, "data-off": o.off ? "" : null }, act(o.go ? { go: o.go } : o.onClick ? { onClick: o.onClick } : null)),
            o.lead ? h("span", { class: "dp-lead" }, o.lead) : null,
            h("span", { class: "dp-main" }, h("span", { class: "dp-l1" }, o.l1), o.l2 ? h("span", { class: "dp-l2" + (o.oneLine ? " dp-l2-one" : ""), title: o.l2Title || null }, o.l2) : null),
            o.trail ? h("span", { class: "dp-trail" }, o.trail) : null);
        if (o.menu) r.addEventListener("contextmenu", (e) => { e.preventDefault(); typeof o.menu === "function" ? o.menu(r) : AB.go(o.menu[0], o.menu[1]); });
        return r;
    }
    function switchLine(label, on, onToggle) {
        const sw = h("span", { class: "k-switch", role: "switch", tabindex: "0", "aria-checked": String(on), "aria-label": label });
        const flip = () => { on = !on; sw.setAttribute("aria-checked", String(on)); if (onToggle) onToggle(on); };
        sw.addEventListener("click", flip);
        sw.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } });
        return h("label", { class: "dp-swline" }, sw, h("span", null, label));
    }

    // ---------- 1. Sources ----------
    function sources(cfg, t) {
        const sec = h("section", { class: "dp-sec", id: "dp-sources" });
        if (cfg.derived) {
            const w = t.withoutMerchants;
            sec.append(plainHead("Sources"),
                row({ lead: icon("split"), l1: h("span", { class: "dp-name" }, "Derived from " + t.graphName), l2: [h("span", { class: "dp-fact" }, `without the ${n(w.merchants)} merchant accounts: ${n(w.nodes)} nodes, ${n(w.edges)} edges at load, Sep 28.`), " A derived graph has no sources of its own. ", AB.link("graph-place", "at-rest", "Open " + t.graphName)] , go: ["graphs-switcher"] }),
                h("div", { class: "dp-caption" }, "To change what it holds, change ", t.graphName, " and make it again from the Graphs switcher. ", oq("Whether a derived graph follows its origin when the origin changes, or stays as made.")));
            return sec;
        }
        const plus = AB.iconButton("plus", "Add data to this graph", { onClick: (e) => openMenu(e.currentTarget, ADD_MENU, "below-start") });
        const more = AB.iconButton("ellipsis", "Sources menu", { onClick: (e) => openMenu(e.currentTarget, HEAD_MENU) });
        const menuBtn = (items, label) => AB.iconButton("ellipsis", label, { onClick: (e) => { e.stopPropagation(); openMenu(e.currentTarget, items); } });
        const replaced = cfg.afterReplace;
        const fileLine = replaced
            ? [h("span", { class: "dp-fact" }, `${n(t.nodes)} nodes, ${n(t.edges)} edges at load, directed.`), " Replaced Sep 30 (was read Sep 28)."]
            : [h("span", { class: "dp-fact" }, `${n(t.nodes)} nodes, ${n(t.edges)} edges at load, directed.`), " Read Sep 28."];
        const tree = h("div", { role: "tree", "aria-label": "Sources" },
            row({ lead: icon("file"), l1: h("span", { class: "dp-name k-ellipsis" }, t.file), l2: fileLine, trail: menuBtn(FILE_MENU, "Menu for " + t.file), selected: cfg.selectSource === "file", go: ["inspector-source", "file"], menu: (r) => openMenu(r, FILE_MENU, "below-start") }),
            row({ level: 2, lead: icon("file"), l1: h("span", { class: "dp-name k-ellipsis" }, t.accountsFile), l2: `node file, same load: ${n(t.nodes)} rows`, trail: menuBtn(FILE_MENU, "Menu for " + t.accountsFile), go: ["inspector-source", "file"], menu: (r) => openMenu(r, FILE_MENU, "below-start") }));
        if (cfg.url) {
            tree.append(row({
                lead: icon("link"), l1: h("span", { class: "dp-name k-ellipsis", title: URL_SRC }, "alerts.bank.example/structuring/2026-03.json"),
                l2: [h("span", { class: "dp-fact" }, `1 set of ${n(t.attributes.find((a) => a.name === "flagged").values.true)} accounts at load.`), " Read Sep 29, 09:14."],
                trail: menuBtn(URL_MENU, "Menu for the alert feed address"), selected: cfg.selectSource === "url", go: ["inspector-source", "file"], menu: (r) => openMenu(r, URL_MENU, "below-start"),
            }));
            if (cfg.url === "changed") tree.append(h("div", { class: "dp-alert", role: "status" }, "The data at this address changed since you last opened it. The graph still shows the Sep 29 copy. ", h("span", Object.assign({ class: "dp-link", role: "button" }, act({ go: ["data-place", "after-replace"] })), "Refresh")));
        }
        sec.append(plainHead("Sources", null, [plus, more]), tree,
            h("div", { class: "dp-caption" }, "This project keeps a copy of each source and reloads it on open."));
        if (replaced) sec.append(h("div", { class: "dp-caption" }, "Rows and attributes computed on the old data are marked out of date. What a replace does to runs and the rows bound to them: ", AB.needsElement("graphty-element does not define what a replacing load does to earlier runs and the style layers bound to their results.")));
        return sec;
    }

    // ---------- 2. Filters ----------
    function filters(cfg, t) {
        const steps = cfg.steps === "none" ? [] : [
            { name: "amount >= 1,000", outcome: `${n(t.nodes)} to 812 nodes`, on: cfg.steps !== "undone" },
            { name: "kind is not merchant", outcome: null, on: false },
        ];
        const outcomeText = (s, i) => s.on ? (s.outcome || "On.") : i === 0 && cfg.steps === "undone" ? "Undone. Tick it, or Redo, to put it back." : "Off: later steps read as if it were not there.";
        const stepList = h("div", { role: "tree", "aria-label": "Filter steps, in the order they apply" });
        steps.forEach((s, i) => {
            const check = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(s.on), "aria-label": "Apply " + s.name });
            const stepMenu = () => [
                { label: "Edit step...", shortcut: "Enter", go: ["inspector-attribute-and-filter-step", "filter-step"] },
                { label: s.on ? "Turn off step" : "Turn on step", shortcut: "Space", onClick: () => check.click() },
                { label: "Move up", shortcut: "Ctrl+]", disabled: i === 0 },
                { label: "Move down", shortcut: "Ctrl+[", disabled: i === steps.length - 1 },
                { sep: true },
                { label: "Add note...", go: ["notes-place"] },
                { label: "Delete step", shortcut: "Delete" },
            ];
            const r = row({
                cls: "dp-step", off: !s.on, go: ["inspector-attribute-and-filter-step", "filter-step"],
                lead: h("span", { class: "dp-grip", title: "Drag to reorder" }, icon("grip-vertical", "sm")),
                l1: [check, h("span", { class: "dp-name k-ellipsis" }, s.name)],
                l2: h("span", { class: s.on ? "dp-fact dp-outcome" : "dp-outcome" }, outcomeText(s, i)),
                trail: AB.iconButton("ellipsis", "Filter step menu", { onClick: (e) => { e.stopPropagation(); openMenu(e.currentTarget, stepMenu()); } }),
                menu: (el) => openMenu(el, stepMenu(), "below-start"),
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
        const addStep = AB.button("Add filter step...", { kind: "ghost", icon: "plus", onClick: (e) => openMenu(e.currentTarget, ADD_STEP_MENU, "below-start") });
        addStep.id = "dp-add-step";
        const activeCount = steps.filter((s) => s.on).length;
        return h("section", { class: "dp-sec", id: "dp-filters" },
            plainHead("Filters", steps.length ? `${steps.length} steps, ${activeCount} on` : null),
            h("div", { class: "dp-caption" }, "Filters change what is computed and laid out. To stop drawing something, use the eye in the ", AB.link("graph-place", "at-rest", "Graph tree"), "."),
            steps.length ? stepList : h("div", { class: "dp-none" }, "None. Every node and edge is computed and laid out."),
            h("div", { class: "dp-foot" }, addStep));
    }

    // ---------- 3. Attributes ----------
    function attributes(cfg, t) {
        const filtered = cfg.steps === "two";
        const stale = cfg.afterReplace;
        const attrRow = (a) => {
            const lvl = h("span", Object.assign({ class: "dp-lvl", role: "button", tabindex: "0", title: `Read as ${LEVEL_WORD[a.level]}. Opens Read as in the inspector.`, "aria-label": `${a.name}: read as ${LEVEL_WORD[a.level]}. Open Read as` }, act({ go: ["inspector-attribute-and-filter-step", a.name === "PageRank" ? "pagerank" : "attribute"] })), levelGlyph(a.level));
            const trail = [
                a.spark ? spark(a.spark) : null,
                a.paint
                    ? h("span", Object.assign({ class: "dp-paint", role: "button", title: "The PageRank row in the Graph tree paints from this. Click to select that row.", "aria-label": "Select the PageRank row that paints from this" }, act({ go: ["inspector-measure-row", "style"] })), h("b", { class: "k-ramp k-ramp-measure" }))
                    : h("span", { class: "dp-paint-empty" }),
            ];
            // One line per attribute: the most useful fact, with the whole provenance in its tooltip
            let l2 = a.l2 || null;
            let l2Title = a.l2 || null;
            if (a.run) {
                l2Title = `from PageRank, on ${n(t.nodes)} nodes, March data`;
                l2 = [l2Title];
                if (stale) { l2 = [h("span", { class: "dp-stale" }, icon("triangle-alert", "sm"), "Out of date")]; l2Title += ". Out of date: computed on the data before the replace. Rerun is in its menu."; }
                else if (filtered) { l2 = [h("span", { class: "dp-fact" }, `on ${n(t.nodes)} nodes; now 812`)]; l2Title += `. Computed on ${n(t.nodes)} nodes; the filter leaves 812. Rerun is in its menu.`; }
            }
            if (stale && a.fromFile) { l2 = [h("span", { class: "dp-stale" }, "New values"), " from the Sep 30 file"]; l2Title = "New values from the Sep 30 file"; }
            return row({
                lead: lvl,
                l1: h("span", { class: "dp-name k-ellipsis" }, a.name),
                l2: a.badge ? [h("span", { class: "k-badge dp-fact" }, a.badge), l2 ? [" ", l2] : null] : l2, trail, oneLine: true, l2Title,
                selected: cfg.selected === a.name,
                go: ["inspector-attribute-and-filter-step", a.name === "PageRank" ? "pagerank" : "attribute"],
                menu: ["context-menus", "attribute"],
            });
        };
        const kinds = t.attributes.find((a) => a.name === "kind").values;
        const flagged = t.attributes.find((a) => a.name === "flagged").values;
        const nodeGroups = [
            cfg.derived ? null : ["From runs", null, [{ name: "PageRank", level: "num", run: true, paint: true, spark: [96, 40, 14, 6, 3, 2, 1, 1, 1] }]],
            ["From the node file", t.accountsFile, [
                { name: "kind", level: "cat", badge: "node type", spark: [kinds.personal, kinds.business, kinds.merchant] },
                { name: "country", level: "cat" },
                { name: "riskScore", level: "num", l2: "the bank's own score, 0 to 100, not computed by graphty" },
                { name: "flagged", level: "cat", spark: [flagged.false, flagged.true] },
                { name: "alertRule", level: "cat", l2: "empty on accounts with no alert" },
                { name: "alertTime", level: "time", l2: "empty on accounts with no alert" },
            ]],
            ["From the file", t.file, [{ name: "id", level: "cat", l2: `the account; the key ${t.accountsFile} is read on` }]],
        ];
        nodeGroups.splice(0, nodeGroups[0] ? 0 : 1);
        const edgeGroups = [
            ["From the file", t.file, [
                { name: "amount", level: "num", badge: "weight", spark: [100, 52, 30, 18, 10, 6, 3, 2, 1], fromFile: true },
                { name: "timestamp", level: "time", badge: "time", spark: perDay(), fromFile: true },
            ]],
        ];
        const groupBlock = (title, count, tab, groups, withExpr) => [
            h("div", { class: "dp-group" }, title, h("span", { class: "k-count k-num k-secondary" }, count), h("span", { class: "k-grow" }), AB.iconButton("table", `Show ${title.toLowerCase()} in the table`, { go: ["table-dock", tab] })),
            groups.map(([sub, from, attrs]) => [
                h("div", { class: "dp-sub" }, sub, from ? h("span", { class: "k-tertiary" }, from) : null),
                h("div", { role: "tree", "aria-label": `${title}: ${sub}` }, attrs.map(attrRow)),
            ]),
            withExpr ? [h("div", { class: "dp-sub" }, "Expression"), h("div", { class: "dp-none dp-l2" }, "None yet.")] : null,
        ];
        const nodeCount = nodeGroups.reduce((s, g) => s + g[2].length, 0);
        const edgeCount = edgeGroups.reduce((s, g) => s + g[2].length, 0);
        return h("section", { class: "dp-sec", id: "dp-attributes" },
            plainHead("Attributes", String(nodeCount + edgeCount)),
            h("div", { class: "dp-search" }, AB.field("Find attribute", { icon: "search", onClick: () => AB.flash("Find attribute (not wired in the skeleton)") })),
            groupBlock("Nodes", String(nodeCount), "nodes", nodeGroups, true),
            groupBlock("Edges", String(edgeCount), "edges", edgeGroups, false),
            h("div", { class: "dp-foot" }, h("span", { title: "Tableau calls this a calculated field" }, AB.button("New attribute...", { kind: "ghost", icon: "plus", disabled: true })), " ", AB.needsElement("graphty-element has no computed attributes yet; an expression attribute is filed.")));
    }

    // ---------- the place ----------
    function build(el, cfg) {
        const t = T();
        const name = cfg.derived ? t.graphName + " without merchants" : t.graphName;
        el.append(AB.placeHead("Data: " + name));
        const scroll = h("div", { class: "dp-scroll" });
        el.append(scroll);
        scroll.append(sources(cfg, t), filters(cfg, t), attributes(cfg, t));

        // 4. Versions (folded)
        scroll.append(fold("Versions", "2", !!cfg.openFolds, [
            h("div", { role: "tree", "aria-label": "Data versions, newest first" },
                row({ lead: icon("history", "sm"), l1: [h("span", { class: "dp-name" }, `Read ${t.accountsFile}`), h("span", { class: "k-badge k-secondary" }, "current")], l2: `${n(t.nodes)} of ${n(t.nodes)} accounts matched, Sep 28`, go: ["full-canvas-modes", "version-history"] }),
                row({ lead: icon("history", "sm"), l1: h("span", { class: "dp-name" }, `Read ${t.file}`), l2: [`${n(t.nodes)} nodes, ${n(t.edges)} edges, Sep 28. `, AB.link("full-canvas-modes", "comparison", "Compare with current")], go: ["full-canvas-modes", "version-history"] })),
            h("div", { class: "dp-caption" }, "Beyond this list, versions and what changed between them: ", AB.needsElement("graphty-element keeps no data history and computes no diff; it reports a fingerprint per load."), " ", oq("Whether a paired node file makes its own version, or belongs to the read beside it.")),
        ], "dp-versions"));

        // 5. Sent and saved (folded)
        scroll.append(fold("Sent and saved", null, !!cfg.openFolds, [
            h("dl", { class: "dp-kv" },
                h("dt", null, "Sent"), h("dd", null, "Nothing. The Assistant is off and no source is sent anywhere."),
                h("dt", null, "Usage data"), h("dd", null, "Off. ", AB.link("settings", "privacy", "Change in Settings"))),
            h("div", { class: "dp-sub" }, "Saved to this computer, newest first"),
            h("div", { role: "tree", "aria-label": "Files written, newest first" },
                row({ lead: icon("download", "sm"), l1: h("span", { class: "dp-name k-ellipsis" }, "case-acc-233575_ring-pagerank_2026-03.csv"), l2: "Table of 14 accounts and its methods file, March data, to Downloads. Nothing masked.", trail: AB.iconButton("refresh-cw", "Export again with the same settings", { go: ["export-dialog", "data"] }), go: ["export-dialog", "data"] })),
        ], "dp-sent"));

        // focus, scroll and overlays for the state
        if (cfg.scrollTo) setTimeout(() => {
            const target = scroll.querySelector("#" + cfg.scrollTo);
            if (target) scroll.scrollTop = target.offsetTop;
        }, 0);
        const back = () => AB.go("data-place", "at-rest");
        if (cfg.open === "add") setTimeout(() => openMenu(el.querySelector("#dp-sources .dp-head .k-icon-btn"), ADD_MENU, "below-start", back), 0);
        if (cfg.open === "add-step") setTimeout(() => openMenu(el.querySelector("#dp-add-step"), ADD_STEP_MENU, "below-start", back), 0);
        if (cfg.open === "clear") setTimeout(() => {
            const dlg = AB.modal({
                title: "Clear graph data?",
                body: h("div", { class: "dp-dlg" },
                    h("p", null, `Removes every node and edge from ${t.graphName}, from every source: ${t.file}, ${t.accountsFile} and the alert feed address.`),
                    h("p", { class: "k-secondary" }, "The Graph tree keeps its rows, with nothing to paint, and runs are marked out of date. The project keeps its copies, so Replace data... on a source reads it again.")),
                foot: [AB.button("Cancel", { kind: "secondary", go: ["data-place", "at-rest"] }), AB.button("Clear graph data", { onClick: () => AB.flash("Clear graph data (not wired in the skeleton)") })],
            });
            openLayer(dlg, back, ".k-btn");
        }, 0);
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
        "at-rest": { steps: "none", url: "same" },
        filters: { steps: "two", url: "same" },
        "undo-notice": { steps: "undone", url: "same", undoNotice: true },
        attributes: { steps: "two", url: "same", selected: "amount", scrollTo: "dp-attributes" },
        "level-changed": { steps: "two", url: "same", selected: "riskScore", scrollTo: "dp-attributes" },
        "sources-menu": { steps: "none", url: "same", open: "add" },
        "url-source": { steps: "none", url: "same", selectSource: "url" },
        "url-changed": { steps: "none", url: "changed" },
        derived: { steps: "none", derived: true },
        "after-replace": { steps: "none", url: "same", afterReplace: true },
        "add-step-menu": { steps: "two", url: "same", open: "add-step" },
        "clear-confirm": { steps: "none", url: "same", open: "clear" },
        versions: { steps: "two", url: "same", openFolds: true, scrollTo: "dp-versions" },
        "sent-and-saved": { steps: "two", url: "same", openFolds: true, scrollTo: "dp-sent" },
    };
    const RIGHT = {
        attributes: "inspector-attribute-and-filter-step/attribute",
        "level-changed": "inspector-attribute-and-filter-step/attribute",
        "url-source": "inspector-source/file",
    };

    registerSection({
        id: "data-place",
        title: "Data place",
        region: "left",
        rail: "data",
        // The Data place works on the transfers; the header's filter chip says what its steps leave
        frame(state) {
            const c = CFG[state] || CFG["at-rest"];
            const t = AB.fx.datasets.transactions;
            const chip = c.derived ? "Full graph" : c.steps === "two" ? "Filtered: 812 of " + t.nodes.toLocaleString("en-US") + " nodes" : c.steps === "undone" ? "Full graph, 2 steps off" : "Full graph";
            const f = { dataset: "transactions", chip };
            if (RIGHT[state]) f.right = RIGHT[state];
            return f;
        },
        states: [
            { id: "at-rest", label: "Sources, no filters" },
            { id: "filters", label: "Two filter steps" },
            { id: "undo-notice", label: "After undoing a step" },
            { id: "attributes", label: "Attributes, one open" },
            { id: "level-changed", label: "Level icon clicked: Read as" },
            { id: "sources-menu", label: "Sources + menu open" },
            { id: "url-source", label: "A URL source selected" },
            { id: "url-changed", label: "The URL's data changed" },
            { id: "derived", label: "A derived graph: origin line" },
            { id: "after-replace", label: "After Replace: out of date" },
            { id: "add-step-menu", label: "Add filter step menu open" },
            { id: "clear-confirm", label: "Clear graph data: confirm" },
            { id: "versions", label: "Versions and Sent and saved open" },
            { id: "sent-and-saved", label: "Sent and saved (from the privacy line)" },
        ],
        render(el, state) {
            build(el, CFG[state] || CFG["at-rest"]);
        },
    });
})();
