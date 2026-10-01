/* Export dialog (spec 12.1): the one home of every output, about 760 x 560 so the canvas stays
   visible. Left: five outputs, one line each, one Tab stop with arrow keys, then Recent exports.
   Right: the chosen output -- title, one summary line, the settings grid, one callout, a preview.
   Footer: "Saved to this computer only; nothing is uploaded.", Cancel and the main button.

   Image and Video are drawn by the export-image and export-video sections inside this frame; the
   states "image" and "video" here draw those sections, so Export... (Ctrl+E) opens on Image.

   Shared, published for export-image and export-video (nothing else is shared):
   - AB.exportDialogFrame(activeId, body, foot): the dialog. activeId is image, video, report,
     recipe, data or recent. The footer note is added unless foot already carries it.
   - AB.exportHead(title, summary): the title and its one summary line.
   - AB.exportCallout(tone, ...children): the one callout above the preview (info, warning, error).
   - AB.exportDone(file): closes the dialog and shows the one notice naming the file.

   Old state ids other sections still link to are aliases: table -> data (node table),
   style -> recipe (Only the style), methods and findings-report -> report, figure and project ->
   image. Plain ASCII. Styles injected below. */
(function () {
    "use strict";
    const CSS = `
.ex-modal { width: min(760px, calc(100vw - 32px)); height: min(560px, calc(100vh - 56px)); max-height: none; }
.ex-modal .k-modal-body { flex: 1 1 auto; min-height: 0; padding: 0; overflow: hidden; display: grid; grid-template-columns: 164px minmax(0, 1fr); }
.ex-list { overflow: auto; border-right: 1px solid var(--cm-border); padding: 6px 0; display: flex; flex-direction: column; }
.ex-item { display: flex; align-items: center; gap: 8px; height: 28px; padding: 0 12px; cursor: pointer; border-radius: 0; outline-offset: -2px; }
.ex-item:hover { background: var(--cm-bg-hover, var(--cm-bg-secondary)); }
.ex-item[aria-selected="true"] { background: var(--cm-bg-selected, var(--cm-bg-secondary)); font-weight: 550; }
.ex-item[aria-disabled="true"] { color: var(--cm-text-tertiary); }
.ex-sep { height: 1px; background: var(--cm-border); margin: 6px 0; }
.ex-main { overflow: auto; padding: 12px 16px 16px 0; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.ex-main > * { flex: none; }
.ex-main .ab-frow { margin-bottom: 0; }
.ex-head { padding-left: 16px; }
.ex-title { font-size: 15px; font-weight: 600; line-height: 20px; }
.ex-sum { color: var(--cm-text-secondary); }
.ex-set { display: flex; flex-direction: column; gap: 8px; }
.ex-set .k-field { max-width: 260px; }
.ex-ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; min-height: 24px; }
.ex-chk { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; line-height: 24px; }
.ex-callout { display: flex; gap: 8px; align-items: flex-start; margin-left: 16px; padding: 8px 10px; border-radius: 6px; background: var(--cm-bg-secondary); }
.ex-callout > svg, .ex-callout > .k-icon { flex: none; margin-top: 2px; }
.ex-callout[data-tone="warning"] { box-shadow: inset 3px 0 0 var(--cm-border-warning, #d89a00); }
.ex-callout[data-tone="error"] { box-shadow: inset 0 0 0 1px var(--cm-border-danger-strong); }
.ex-callout ul { margin: 2px 0 0; padding-left: 16px; }
.ex-h { font-weight: 550; padding-left: 16px; margin-bottom: -6px; }
.ex-pre { margin: 0 0 0 16px; padding: 8px 10px; border-radius: 5px; background: var(--cm-bg-secondary); font: 11px/16px var(--cm-font-family-mono, monospace); white-space: pre; overflow: auto; }
.ex-dl { margin: 0 0 0 16px; display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 4px 8px; }
.ex-dl dt { color: var(--cm-text-secondary); }
.ex-dl dd { margin: 0; }
.ex-line { padding-left: 16px; }
.ex-recent { margin: 0 0 0 16px; display: flex; flex-direction: column; }
.ex-rec { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; gap: 4px 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--cm-border); }
.ex-rec .ex-sum { grid-column: 2; font-size: 11px; }
.ex-rec .k-btn { grid-row: 1 / span 2; grid-column: 3; }
.ex-footl { flex: 1 1 auto; min-width: 0; color: var(--cm-text-secondary); display: flex; gap: 6px; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
    if (!document.getElementById("ex-style")) document.head.append(h("style", { id: "ex-style" }, CSS));

    const NOTE = "Saved to this computer only; nothing is uploaded.";
    const L = () => AB.fx.datasets.lesmis;
    const n = (v) => Number(v).toLocaleString("en-US");
    const PROJECT = "les-miserables";
    const WATCH = ["Valjean", "Javert", "Thenardier", "Mme.Thenardier", "Eponine"]; // the Watchlist set row

    // ---------- the list ----------
    const LIST = [
        { id: "image", name: "Image", icon: "camera", go: ["export-image", "image"] },
        { id: "video", name: "Video", icon: "play", go: ["export-video", "still"] },
        { id: "report", name: "Report", icon: "book-open", go: ["export-dialog", "report"], needs: true },
        { id: "recipe", name: "Recipe", icon: "flask-conical", go: ["export-dialog", "recipe"] },
        { id: "data", name: "Data", icon: "database", go: ["export-dialog", "data"] },
        { sep: true },
        { id: "recent", name: "Recent exports", icon: "history", go: ["export-dialog", "recent-exports"] },
    ];
    let listHadFocus = false;

    function list(activeId) {
        const items = [];
        const el = h("div", { class: "ex-list", role: "listbox", "aria-label": "What to export" });
        LIST.forEach((it) => {
            if (it.sep) return el.append(h("div", { class: "ex-sep", role: "none" }));
            const on = it.id === activeId;
            const x = h("div", { class: "ex-item", role: "option", tabindex: on ? "0" : "-1", "aria-selected": String(on), "aria-disabled": it.needs ? "true" : null }, icon(it.icon), it.name);
            x.addEventListener("click", () => { listHadFocus = el.contains(document.activeElement); AB.go(it.go[0], it.go[1]); });
            items.push([x, it]);
            el.append(x);
        });
        el.addEventListener("keydown", (e) => {
            const i = items.findIndex(([x]) => x === document.activeElement);
            const d = { ArrowDown: 1, ArrowUp: -1, Home: -i, End: items.length - 1 - i }[e.key];
            if (i < 0 || d == null) return;
            e.preventDefault();
            const [, it] = items[(i + d + items.length) % items.length];
            listHadFocus = true;
            AB.go(it.go[0], it.go[1]);
        });
        if (listHadFocus) requestAnimationFrame(() => { const s = el.querySelector("[aria-selected=true]"); if (s) s.focus(); listHadFocus = false; });
        return el;
    }

    // ---------- the shared frame and parts ----------
    function frame(activeId, body, foot) {
        foot = [].concat(foot || []);
        const hasNote = foot.some((f) => f && f.textContent && f.textContent.includes("nothing is uploaded"));
        if (!hasNote) foot.unshift(h("span", { class: "ex-footl" }, icon("lock", "sm"), NOTE));
        const m = AB.modal({ title: "Export", body: [list(activeId === "from-row" ? "data" : activeId), body], foot });
        m.querySelector(".k-modal").classList.add("ex-modal");
        return m;
    }
    const head = (title, summary) => h("div", { class: "ex-head" }, h("div", { class: "ex-title", role: "heading", "aria-level": "3" }, title), summary ? h("div", { class: "ex-sum" }, summary) : null);
    const callout = (tone, ...kids) => h("div", { class: "ex-callout", "data-tone": tone, role: tone === "error" ? "alert" : null }, icon(tone === "info" ? "info" : "triangle-alert", "sm"), h("div", null, kids));
    function done(file) {
        AB.close();
        setTimeout(() => AB.notice(`Exported ${file} to Downloads`), 50);
    }
    Object.assign(AB, { exportDialogFrame: frame, exportHead: head, exportCallout: callout, exportDone: done });

    const row = (label, ...ctl) => AB.fieldRow(label, h("span", { class: "ex-ctl" }, ctl), { popover: true });
    let chkSeq = 0;
    function check(label, on, flip) {
        const id = "ex-chk-" + ++chkSeq;
        const text = h("span", { id }, label);
        const box = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(!!on), "aria-labelledby": id });
        const wrap = h("label", { class: "ex-chk" }, box, text);
        wrap.addEventListener("click", (e) => { e.preventDefault(); flip(); });
        box.addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); flip(); } });
        return wrap;
    }
    // A dropdown: a field that opens the one dark menu
    function dropdown(value, options, pick, label) {
        const f = AB.field(value, { caret: true });
        f.setAttribute("aria-label", label);
        f.setAttribute("aria-haspopup", "menu");
        f.addEventListener("click", (e) => { e.stopPropagation(); AB.openMenu(f, options.map((o) => (typeof o === "string" ? { label: o, check: o === value, onClick: () => pick(o) } : o))); });
        f.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " " || (e.altKey && e.key === "ArrowDown")) { e.preventDefault(); f.click(); } });
        return f;
    }

    // ---------- reader choices for this visit ----------
    const S = { format: "CSV", table: "Edges", shape: "Generic", scope: "Full graph", onlyStyle: false, methodsOnly: false, adv: {} };
    let redraw = () => {};

    // ---------- Data: every format graphty-element writes (session.catalog.formats(), canExport) ----------
    // Writer options from catalog/formats.ts; the first ones show inline, the rest in Advanced.
    const FMT = {
        CSV: { ext: "csv", inline: [["Table", ["Edges", "Nodes", "Adjacency"], "table"], ["File shape", ["Generic", "Neo4j"], "shape"]],
            adv: [["Header names", ["Generic", "Gephi"]], ["Column separator", [",", ";", "Tab"]], ["Line ending", ["LF", "CRLF"]], ["Header row", true], ["Neutralize formulas", true, "Puts an apostrophe before a text cell that starts with =, +, - or @, so a spreadsheet does not run it"]] },
        JSON: { ext: "json", inline: [["Shape", ["node-link", "d3", "jgf", "cytoscape", "graphology", "vis"], "shape"]], adv: [["Indent", ["0", "2", "4"]]] },
        GraphML: { ext: "graphml", inline: [["Edge direction", ["undirected", "directed"], "shape"]], adv: [["Indent", true]] },
        GEXF: { ext: "gexf", inline: [["Version", ["1.3", "1.2"], "shape"]], adv: [] },
        GML: { ext: "gml", inline: [["Unwritable keys", ["error", "mangle"], "shape"]], adv: [["Weight key", ["value"]]] },
        DOT: { ext: "dot", inline: [["Graph name", ["Les Miserables"], "shape"]], adv: [["Strict graph", false], ["Indent", ["2 spaces", "Tab"]]] },
        "Pajek NET": { ext: "net", inline: [["Network header", true, null]], adv: [] },
    };
    // What the format cannot hold, worded from the element's lossNotes (graph-io's writers)
    function lossNotes() {
        const nodeCols = "label, group, degree, betweenness, PageRank, the Louvain community, the position and the drawn color and size";
        if (S.format === "CSV" && S.table === "Edges") return [`The edge table holds edges only: each node's ${nodeCols} are not written. Choose Table: Nodes to keep them.`];
        if (S.format === "CSV" && S.table === "Nodes") return [`The node table holds nodes only: the ${n(L().edges)} edges and their value are not written. Choose Table: Edges to keep them.`];
        if (S.format === "CSV") return ["An adjacency table holds who links to whom and the edge value only; every node attribute and run result is not written."];
        if (S.format === "Pajek NET") return ["Pajek has a slot for a label and a position per node: group, degree, betweenness, PageRank and the community are not written."];
        if (S.format === "DOT") return ["DOT has no attribute types: numbers are written as text."];
        return [];
    }
    function dataPreview() {
        const rs = L().rows.slice(0, 3);
        const ext = FMT[S.format].ext;
        if (ext === "csv" && S.table === "Nodes") return ["id,label,group,degree,betweenness,results.pagerank.rank,results.louvain.community,x,y,color,size"].concat(rs.map((r) => [r.id, r.label, r.group, r.degree, r.betweenness].join(",") + ",...")).join("\n") + "\n...";
        if (ext === "csv" && S.table === "Edges") return "source,target,value\n0,1,...\n...";
        if (ext === "csv") return ",Myriel,Napoleon,Mlle.Baptistine,...\nMyriel,0,1,...\n...";
        if (ext === "graphml") return ['<graphml xmlns="http://graphml.graphdrawing.org/xmlns">', '  <key id="label" for="node" attr.name="label" attr.type="string"/>', '  <key id="group" for="node" attr.name="group" attr.type="int"/>', `  <graph edgedefault="${S.adv.GraphML || "undirected"}">`]
            .concat(rs.map((r) => `    <node id="${r.id}"><data key="label">${r.label}</data><data key="group">${r.group}</data></node>`)).concat(["    ..."]).join("\n");
        if (ext === "json") return '{\n  "nodes": [\n' + rs.map((r) => `    { "id": "${r.id}", "label": "${r.label}", "group": ${r.group} }`).join(",\n") + ",\n    ...";
        if (ext === "dot") return 'graph "Les Miserables" {\n' + rs.map((r) => `  "${r.id}" [label="${r.label}", group=${r.group}];`).join("\n") + "\n  ...";
        if (ext === "net") return `*Vertices ${L().nodes}\n` + rs.map((r, i) => `${i + 1} "${r.label}"`).join("\n") + "\n...";
        if (ext === "gml") return "graph [\n  directed 0\n" + rs.map((r) => `  node [ id ${r.id} label "${r.label}" group ${r.group} ]`).join("\n") + "\n  ...";
        return '<gexf version="1.3">\n  <graph defaultedgetype="undirected">\n    <nodes>\n' + rs.map((r) => `      <node id="${r.id}" label="${r.label}"/>`).join("\n") + "\n      ...";
    }
    // Advanced: the one light popover. AB.popover's X and Esc call AB.close(), which would close
    // the whole dialog, so this popover is closed locally (a shell gap: a popover inside a modal).
    function advanced(anchor, f) {
        const lay = document.getElementById("ab-overlay");
        const body = h("div", null, f.adv.map(([label, v, why]) => {
            const key = S.format + "." + label;
            const cur = S.adv[key] != null ? S.adv[key] : Array.isArray(v) ? v[0] : v;
            const set = (x) => { S.adv[key] = x; pop.replaceWith((pop = advanced(anchor, f))); };
            const ctl = Array.isArray(v) ? AB.seg(v.map((o) => [o, o]), cur, set, { label }) : check(why ? h("span", { "data-tip": why }, "On") : "On", cur, () => set(!cur));
            return AB.fieldRow(label, ctl, { popover: true });
        }));
        let pop = AB.popover({ anchor, title: S.format + " options", body, width: 300, place: "right-start" });
        const close = () => { pop.remove(); document.removeEventListener("pointerdown", off, true); anchor.focus(); };
        const off = (e) => { if (!pop.contains(e.target) && e.target !== anchor) close(); };
        pop.querySelector(".k-popover-head .k-icon-btn").replaceWith(AB.iconButton("x", "Close", { key: "Esc", onClick: close }));
        pop.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } });
        setTimeout(() => document.addEventListener("pointerdown", off, true));
        lay.append(pop);
        requestAnimationFrame(() => { const x = pop.querySelector("[tabindex='0']"); if (x) x.focus(); });
        return pop;
    }
    function dataBody(fromRow) {
        const f = FMT[S.format];
        const scopeTxt = S.scope === "Watchlist" ? `Watchlist, ${WATCH.length} nodes` : `Full graph, ${L().nodes} nodes, ${n(L().edges)} edges`;
        const notes = lossNotes();
        const inline = f.inline.map(([label, v, k]) => {
            if (!Array.isArray(v)) return row(label, check("On", true, () => AB.flash(label + " (not wired in the skeleton)")));
            const cur = k === "table" ? S.table : S.adv[S.format] || v[0];
            const set = (x) => { if (k === "table") S.table = x; else S.adv[S.format] = x; redraw(); };
            return row(label, v.length <= 3 ? AB.seg(v.map((o) => [o, o]), cur, set, { label }) : dropdown(cur, v, set, label));
        });
        let advBtn = null;
        if (f.adv.length) {
            advBtn = AB.field("Advanced", { caret: true });
            advBtn.setAttribute("aria-haspopup", "dialog");
            AB.tip(advBtn, f.adv.map((a) => a[0]).join(", "), { label: false });
            advBtn.addEventListener("click", (e) => { e.stopPropagation(); advanced(advBtn, f); });
            advBtn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); advBtn.click(); } });
        }
        return h("div", { class: "ex-main" },
            head("Data", `${scopeTxt} - every attribute and run result - ${S.format}`),
            h("div", { class: "ex-set" },
                row("Format", dropdown(S.format, Object.keys(FMT), (x) => { S.format = x; redraw(); }, "Format")),
                row("Scope", dropdown(S.scope === "Watchlist" ? "Watchlist, 5 nodes" : "Full graph", ["Full graph", "Watchlist", "Filtered graph"].map((o) => ({ label: o, check: o === S.scope, onClick: () => { S.scope = o === "Filtered graph" ? S.scope : o; redraw(); }, needs: o === "Filtered graph" ? "exportGraph writes the whole graph; writing only the filtered graph needs graphty-element" : null })), null, "Scope"),
                    S.scope !== "Full graph" ? AB.needsElement("exportGraph writes the whole graph; writing only a set's nodes needs graphty-element") : null),
                inline, advBtn ? row("", advBtn) : null),
            notes.length ? callout("warning", h("b", null, `${S.format} cannot hold everything`), h("ul", null, notes.map((t) => h("li", null, t)))) : null,
            h("div", { class: "ex-h" }, "Preview"),
            h("pre", { class: "ex-pre" }, dataPreview()),
            );
    }
    const dataFile = () => `${PROJECT}${S.scope === "Watchlist" ? "_watchlist" : ""}${S.format === "CSV" ? "_" + S.table.toLowerCase() : ""}.${FMT[S.format].ext}`;

    // ---------- Recipe ----------
    function recipeBody() {
        const views = AB.SAVED_VIEWS;
        return h("div", { class: "ex-main" },
            head("Recipe", S.onlyStyle ? "Only the style - paint rows - no data" : `The analysis without the data - 7 runs, ${views.length} saved views`),
            h("div", { class: "ex-set" },
                row("Include", check("Only the style", S.onlyStyle, () => { S.onlyStyle = !S.onlyStyle; redraw(); })),
                row("File", h("span", null, S.onlyStyle ? `${PROJECT}.style` : `${PROJECT}.recipe`), AB.openQuestion("The recipe and style files' name endings"))),
            S.onlyStyle ? null : callout("info", "Applying it to other data runs each analysis again. ", "Restoring the results without running again", " ", AB.needsElement("graphty-element keeps no run records a recipe could restore without recomputing")),
            h("div", { class: "ex-h" }, "What the file holds"),
            h("dl", { class: "ex-dl" },
                S.onlyStyle ? null : [h("dt", null, "Runs"), h("dd", null, "Louvain at resolution 1.0, Louvain weighted by amount, PageRank, Degree, Betweenness, Closeness, Shortest paths")],
                h("dt", null, "Style"), h("dd", null, "Every paint row in the tree, with the custom palettes they use (styles.toDocument)"),
                S.onlyStyle ? null : [h("dt", null, "Saved views"), h("dd", null, views.join(", "))],
                h("dt", null, "Left out"), h("dd", null, "Node names, values, the Watchlist's members, Overrides and notes: they name things in this data"),
                h("dt", null, "Needs"), h("dd", null, "group (node) and value (edge), matched by name when applied")));
    }

    // ---------- Report (disabled: title, one sentence, the mark) ----------
    function reportBody() {
        return h("div", { class: "ex-main" },
            head("Report", null),
            h("p", { class: "ex-line", style: "margin:0" }, "One self-contained HTML file -- the views in tour as pages, in order, with their notes and the methods text -- or, with Methods text only, just how every number was computed."),
            h("div", { class: "ex-line" }, AB.needsElement("graphty-element keeps no run records a methods writer could read; writing the methods in the app would be the app describing the graph")));
    }

    // ---------- Recent exports ----------
    const RECENT = [
        { file: `${PROJECT}_whole-cast.png`, what: "Image, PNG at 2x, Whole cast", when: "Today 10:14", go: ["export-image", "image"] },
        { file: `${PROJECT}_nodes.csv`, what: "Data, CSV node table, full graph", when: "Today 9:52", go: ["export-dialog", "data"], set: { format: "CSV", table: "Nodes", scope: "Full graph" } },
        { file: `${PROJECT}.recipe`, what: "Recipe, 7 runs and 3 saved views", when: "Yesterday 16:30", go: ["export-dialog", "recipe"], set: { onlyStyle: false } },
        { file: `${PROJECT}_tour.webm`, what: "Video, tour of saved views", when: "Sep 28 11:05", go: ["export-video", "tour"] },
    ];
    function recentBody() {
        return h("div", { class: "ex-main" },
            head("Recent exports", `${RECENT.length} files, newest first - each was saved to Downloads`),
            h("div", { class: "ex-recent", role: "list" }, RECENT.map((r) => h("div", { class: "ex-rec", role: "listitem" },
                icon("file", "sm"), h("span", { class: "k-ellipsis" }, r.file),
                AB.button("Export again", { kind: "secondary", onClick: () => { Object.assign(S, r.set || {}); AB.go(r.go[0], r.go[1]); } }),
                h("span", { class: "ex-sum" }, `${r.what} - ${r.when} - Downloads`)))),
            h("div", { class: "ex-line ex-sum" }, "Export again opens the output with the same settings, on the data as it is now."));
    }

    // ---------- the section ----------
    const ALIAS = { table: "data", style: "recipe", methods: "report", "findings-report": "report", figure: "image", project: "image" };
    function render(el, state, ctx, again) {
        redraw = () => { el.textContent = ""; render(el, state, ctx, true); };
        if (ALIAS[state]) {
            if (state === "table") Object.assign(S, { format: "CSV", table: "Nodes" });
            if (state === "style") S.onlyStyle = true;
            state = ALIAS[state];
        }
        if (state === "image") return ctx.renderSection("export-image/image", el);
        if (state === "video") return ctx.renderSection("export-video/still", el);
        // A door only fills a field: the Watchlist row's menu fills Scope (and the node table)
        if (!again && state === "from-row") Object.assign(S, { format: "CSV", table: "Nodes", scope: "Watchlist" });
        if (!again && state === "data") S.scope = "Full graph";
        const cancel = AB.button("Cancel", { kind: "ghost", onClick: () => AB.close() });
        let body, foot;
        if (state === "report") {
            body = reportBody();
            foot = [cancel, AB.button("Export", { icon: "download", disabled: "Needs graphty-element: a methods writer" })];
        } else if (state === "recipe") {
            body = recipeBody();
            foot = [cancel, AB.button("Export", { icon: "download", onClick: () => done(S.onlyStyle ? `${PROJECT}.style` : `${PROJECT}.recipe`) })];
        } else if (state === "recent-exports") {
            body = recentBody();
            foot = [AB.button("Close", { kind: "ghost", onClick: () => AB.close() })];
        } else {
            body = dataBody(state === "from-row");
            foot = [cancel, AB.button("Copy", { kind: "secondary", onClick: () => AB.flash(`Copied ${dataFile()} to the clipboard`) }), AB.button("Export", { icon: "download", onClick: () => done(dataFile()) })];
        }
        el.append(frame(state === "recent-exports" ? "recent" : state === "from-row" ? "data" : state, body, foot));
    }

    registerSection({
        id: "export-dialog",
        title: "Export dialog",
        region: "overlay",
        frame: { left: "graph-place/at-rest" },
        closeTo: "graph-place",
        states: [
            { id: "image", label: "Image (the export-image section)" },
            { id: "video", label: "Video (the export-video section)" },
            { id: "report", label: "Report, disabled" },
            { id: "recipe", label: "Recipe" },
            { id: "data", label: "Data" },
            { id: "from-row", label: "Data from the Watchlist row's menu" },
            { id: "recent-exports", label: "Recent exports" },
        ],
        render,
    });
})();
