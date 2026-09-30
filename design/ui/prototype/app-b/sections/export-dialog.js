/* Export dialog: one dialog, a list of what can be written on the left, the chosen output on the
   right (what it contains, its scope, what is left out, a size estimate, its settings and a
   preview of the file). Opened from the project-name menu's Export... and Mod+E (both land on
   Image, the export-image section), the Camera menu and the Views header's "..." (doors), Data > Sent and saved ("Export again"), or a row's menu with
   that row filled in as the target. Every export is recorded in Data > Sent and saved.

   Shared: this file publishes AB.exportDialogFrame(activeId, body, foot), the dialog's frame (the
   output list on the left with activeId lit, body on the right, foot in the footer). The
   export-image and export-video sections draw their bodies inside it, so the list is written once.
   List order: Image, Video, Figure (needs graphty-element: SVG now, PDF later), Findings report,
   Methods text, Project, Recipe, Style, Data (needs graphty-element), Table as CSV.
   Plain ASCII. Its styles are injected below. */
(function () {
    "use strict";
    const CSS = `
.ex-modal { width: min(1120px, calc(100vw - 48px)); height: min(760px, calc(100vh - 56px)); max-height: none; }
.ex-modal .k-modal-body { flex: 1 1 auto; min-height: 0; padding: 0; overflow: hidden; display: grid; grid-template-columns: 248px minmax(0, 1fr); }
.ex-list { overflow: auto; border-right: 1px solid var(--cm-border); padding: 6px 0; }
.ex-item { display: flex; align-items: flex-start; gap: 8px; padding: 5px 12px 5px 14px; cursor: pointer; }
.ex-item:hover { background: var(--cm-bg-hover, var(--cm-bg-secondary)); }
.ex-item[aria-selected="true"] { background: var(--cm-bg-selected, var(--cm-bg-secondary)); }
.ex-item .k-icon, .ex-item svg { margin-top: 2px; flex: none; }
.ex-item-t { display: flex; gap: 6px; align-items: baseline; font-weight: 550; }
.ex-item-t .ex-ext { font-weight: 400; color: var(--cm-text-secondary); }
.ex-item-d { color: var(--cm-text-secondary); font-size: 11px; line-height: 15px; }
.ex-main { overflow: auto; padding: 12px 20px 16px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.ex-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
.ex-target { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; background: var(--cm-bg-selected, var(--cm-bg-secondary)); }
.ex-facts { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 6px 12px; margin: 0; }
.ex-facts dt { color: var(--cm-text-secondary); }
.ex-facts dd { margin: 0; }
.ex-set { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 6px 12px; align-items: center; }
.ex-set > span:nth-child(odd) { color: var(--cm-text-secondary); }
.ex-set .k-field { max-width: 280px; }
.ex-seg { flex-wrap: wrap; height: auto; min-height: 24px; }
.ex-seg > button { cursor: pointer; height: 24px; display: inline-flex; align-items: center; white-space: nowrap; }
.ex-scope { display: grid; gap: 4px; justify-items: start; }
.ex-seg > button[disabled] { cursor: default; color: var(--cm-text-disabled); }
.ex-h { font-weight: 550; margin: 4px 0 -4px; }
.ex-paper { background: #fff; border-radius: 2px; box-shadow: 0 0 0 1px var(--cm-border); padding: 12px; display: grid; grid-template-columns: minmax(0, 1fr) 150px; gap: 12px; color: #1a1a1a; font-size: 11px; line-height: 15px; max-width: 720px; }
.ex-paper img { width: 100%; height: auto; display: block; }
/* The figure is drawn on its chosen background (White), whatever the app theme */
:root .ex-paper .k-dark-only, :root[data-theme="dark"] .ex-paper .k-dark-only { display: none !important; }
:root .ex-paper .k-light-only, :root[data-theme="dark"] .ex-paper .k-light-only { display: block !important; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .ex-paper .k-dark-only { display: none !important; } :root:not([data-theme="light"]) .ex-paper .k-light-only { display: block !important; } }
.ex-legend b { display: block; margin-bottom: 2px; }
.ex-legend div { display: flex; gap: 6px; align-items: center; }
.ex-legend i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.ex-foot-note { grid-column: 1 / -1; border-top: 1px solid #ddd; padding-top: 6px; color: #555; }
.ex-pre { margin: 0; padding: 8px 10px; border-radius: 5px; background: var(--cm-bg-secondary); font: 11px/16px var(--cm-font-family-mono, monospace); white-space: pre; overflow: auto; max-width: 100%; }
.ex-pages { margin: 0; padding-left: 20px; display: grid; gap: 6px; }
.ex-pages li span { display: block; color: var(--cm-text-secondary); }
.ex-oq { display: inline-flex; align-items: center; height: 16px; padding: 0 5px; border-radius: 5px; font-size: 10px; font-weight: 600; color: var(--k-annot-ink); box-shadow: inset 0 0 0 1px var(--k-annot); white-space: nowrap; vertical-align: 1px; }
.ex-later { display: inline-flex; align-items: center; height: 16px; padding: 0 4px; border-radius: 5px; font-size: 10px; color: var(--cm-text-secondary); box-shadow: inset 0 0 0 1px var(--cm-border); margin-left: 4px; }
.ex-footl { flex: 1 1 auto; min-width: 0; color: var(--cm-text-secondary); display: flex; gap: 6px; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ex-footl a { color: var(--cm-text-brand); }
.ex-off { opacity: .55; pointer-events: none; }
.ex-item .ab-needs { font-size: 10px; }
.ex-from { color: var(--cm-text-secondary); font-size: 11px; font-weight: 400; margin-left: auto; }
.ex-from a { color: var(--cm-text-brand); }
`;
    if (!document.getElementById("ex-style")) document.head.append(h("style", { id: "ex-style" }, CSS + ".ex-item[aria-disabled=true] .ex-item-t, .ex-item[aria-disabled=true] > .k-i { color: var(--cm-text-tertiary); }"));

    const oq = (text) => h("span", { class: "ex-oq", title: text }, "Open question");
    const L = () => AB.fx.datasets.lesmis;
    const n = (v) => Number(v).toLocaleString("en-US");
    const VIEWS = AB.SAVED_VIEWS; // the Views place's saved views, in its order
    const WATCH = ["Valjean", "Javert", "Thenardier", "Mme.Thenardier", "Eponine"]; // the Watchlist set row
    const FORMATS = ["CSV", "GraphML", "GEXF", "GML", "DOT", "Pajek", "JSON"]; // graph-io's formats
    const SIZE = "Under 1 MB";

    // Reader choices for this page visit.
    let scope = "full";
    let format = "GraphML";
    let tableTab = "Nodes";

    function scopeFacts() {
        const f = L().filterSteps;
        return scope === "full"
            ? `Full graph: ${L().nodes} nodes, ${n(L().edges)} edges`
            : `Filtered graph: "${f.steps[0]}", ${f.after.step1} of ${L().nodes} nodes`;
    }
    function scopeControl() {
        const b = (id, label) => h("button", { type: "button", role: "radio", "aria-checked": String(scope === id), on: { click: () => { scope = id; redraw(); } } }, label);
        return h("span", { class: "k-seg ex-seg", role: "radiogroup", "aria-label": "Scope" },
            b("full", `Full graph, ${L().nodes} nodes`),
            b("filtered", `Filtered, ${L().filterSteps.after.step1} nodes`));
    }
    const setRow = (label, control) => [h("span", null, label), h("div", null, control)];
    const facts = (pairs) => h("dl", { class: "ex-facts" }, pairs.map(([k, v]) => [h("dt", null, k), h("dd", null, v)]));

    function rowOf(label) { return L().rows.find((r) => r.label === label) || {}; }
    function methodsText() {
        return [
            `Graph: ${L().title}, ${L().nodes} characters and ${n(L().edges)} undirected co-appearance edges, read from ${L().file} (${L().source}).`,
            `Scope: ${scopeFacts()}.`,
            "Communities: Louvain at resolution 1.0, six communities shown.",
            "Rank: PageRank over the same graph.",
            "Paths: shortest paths from Valjean to Javert and from Myriel to Javert.",
        ];
    }

    // ---------- the outputs ----------
    const KINDS = {
        figure: {
            name: "Figure", ext: ".svg", icon: "network", line: "The drawing with its legend",
            needs: "graphty-element captures raster images only. A vector figure (SVG now, PDF later) with its legend drawn in needs the element; the app does not draw the graph itself.",
            facts: () => [
                ["Contains", "The canvas as drawn in the chosen view, its legend, and a footer saying how the numbers were computed."],
                ["Scope", scopeFacts()],
                ["Not drawn", "Rows whose eye is off: Betweenness in the folder For the report."],
            ],
            settings: () => [
                setRow("View", AB.field("Current camera", { caret: true })),
                setRow("Format", h("span", { class: "k-seg ex-seg" }, h("button", { type: "button", disabled: "" }, "SVG"), h("button", { type: "button", disabled: "" }, "PDF", h("span", { class: "ex-later" }, "later")))),
                setRow("Width", AB.field("174 mm")),
                setRow("Background", AB.field("White", { caret: true })),
                setRow("Labels", "As on the canvas (Hide overlapping labels: Off)"),
            ],
            preview: () => {
                // The figure is the canvas as it paints now: PageRank wins color at rest
                const lg = L().frame.legend;
                return h("div", { class: "ex-paper" },
                    // What the canvas draws now (PageRank wins color); the legend titles are the row names
                    h("div", null, (AB.lesmisDrawing || AB.drawing)("lesmis-groups-rest", "Les Miserables colored by PageRank, sized by Degree")),
                    h("div", { class: "ex-legend" }, h("b", null, "Color: PageRank"),
                        h("div", null, h("i", { style: "width:24px;border-radius:2px;background:linear-gradient(90deg,#ef7818,#b84203,#662506)" }), "0.0033 to 0.0754"),
                        h("b", { style: "margin-top:6px" }, "Size: Degree")),
                    h("div", { class: "ex-foot-note" }, `Color is PageRank (damping 0.85, unweighted); size is degree, the number of characters each one appears with, on ${scopeFacts().toLowerCase()}. Edge value was not used.`));
            },
            file: "les-miserables_figure.svg",
        },
        report: {
            name: "Findings report", ext: ".html", icon: "book-open", line: "Views, notes and methods in one file",
            needs: "graphty-element keeps no run records that a methods writer could read; writing this text in the app would be the app describing the graph. Filed: a run-record methods writer.",
            facts: () => [
                ["Contains", "One self-contained HTML file that opens offline and prints to PDF from the browser: the saved views as pages in order, each with its notes, then every other note, then the methods text written from the run records."],
                ["Scope", scopeFacts()],
                ["Masked", "Nothing. Every note is included in full."],
                ["Size estimate", SIZE],
            ],
            settings: () => [setRow("Page order", "The saved views in their order in the Views place")],
            preview: () => [
                h("div", { class: "ex-h" }, "Pages"),
                h("ol", { class: "ex-pages" },
                    h("li", null, VIEWS[0], h("span", null, "The whole graph in frame; its note: \"Valjean and Javert land in the same community, with Marius and Cosette.\"")),
                    h("li", null, VIEWS[1], h("span", null, "Valjean and the characters closest to him.")),
                    h("li", null, "Other notes", h("span", null, "\"Co-appearances counted per chapter, from Knuth's list.\" and the notes on Community 3.")),
                    h("li", null, "Methods", h("span", null, "Written from the Louvain, PageRank and shortest path runs."))),
            ],
            file: "les-miserables_findings.html",
        },
        methods: {
            name: "Methods text", ext: ".txt", icon: "file", line: "How every number was computed",
            needs: "graphty-element keeps no run records that a methods writer could read; writing this text in the app would be the app describing the graph. Filed: a run-record methods writer.",
            facts: () => [
                ["Contains", "The methods text alone, as the findings report writes it: the data, the scope and every run's settings."],
                ["Scope", scopeFacts()],
                ["Masked", "Node names, values and notes. Only the method is written."],
                ["Size estimate", SIZE],
            ],
            settings: () => [setRow("File type", h("span", null, "Plain text. ", oq("Plain text or Markdown")))],
            preview: () => [h("pre", { class: "ex-pre", style: "white-space:pre-wrap" }, methodsText().join("\n\n")),
                h("div", null, oq("Each run's recorded settings (seed, weight) and how they are worded"))],
            file: "les-miserables_methods.txt",
        },
        project: {
            name: "Project", ext: "", icon: "folder-open", line: "Everything, to reopen in graphty",
            facts: () => [
                ["Contains", `The data (${L().file}), every row in the tree, notes, views, data versions and the current selection.`],
                ["Scope", "Always the full project, whatever the filter."],
                ["Masked", "Nothing."],
                ["Size estimate", SIZE],
            ],
            settings: () => [setRow("File type", oq("The project file's name ending and format"))],
            preview: null, file: "Les Miserables (project file)",
        },
        recipe: {
            name: "Recipe", ext: "", icon: "flask-conical", line: "The analysis, without the data",
            facts: () => [
                ["Contains", "Each run with its settings (Louvain at resolution 1.0, PageRank, shortest paths), the paint rows, the layout as its method, and the saved views."],
                ["Scope", "None: a recipe carries no data."],
                ["Masked", "No data inside: node names, attribute values, the Watchlist's members and every note's targets stay here."],
                ["Size estimate", SIZE],
            ],
            settings: () => [setRow("Needs", "group, degree and value (edge), matched by name when the recipe is applied")],
            preview: null, file: "les-miserables.recipe",
        },
        style: {
            name: "Style", ext: "", icon: "palette", line: "Colors and sizes to reuse",
            facts: () => [
                ["Contains", "The paint rows as a style file: Group color, Size: degree, the PageRank ramp and the path colors."],
                ["Scope", "None: a style carries no data."],
                ["Masked", "Overrides (Valjean's color, set by hand), because they name nodes in this data."],
                ["Size estimate", SIZE],
            ],
            settings: () => [setRow("File type", oq("The style file's name ending and format"))],
            preview: null, file: "les-miserables.style",
        },
        data: {
            name: "Data", ext: "", icon: "database", line: "The graph for other tools",
            needs: "graphty-element's format catalog says canExport: false for every format, although graph-io has the exporters. Filed: connect graph-io's exporters to the format catalog. The app does not call graph-io itself.",
            facts: () => [
                ["Contains", `${L().nodes} nodes and ${n(L().edges)} edges with every attribute (label, group, degree, betweenness, value), plus run results as attributes: PageRank and the Louvain community.`],
                ["Scope", scopeFacts()],
                ["Masked", "Paint, notes and views."],
                ["Size estimate", SIZE],
            ],
            settings: () => [
                setRow("Format", h("span", { class: "k-seg ex-seg", role: "radiogroup", "aria-label": "Format" },
                    FORMATS.map((f) => h("button", { type: "button", role: "radio", disabled: "", "aria-checked": String(f === format) }, f)))),
            ],
            preview: () => h("pre", { class: "ex-pre" }, dataPreview()),
            file: () => "les-miserables." + ({ CSV: "csv", GraphML: "graphml", GEXF: "gexf", GML: "gml", DOT: "dot", Pajek: "net", JSON: "json" })[format],
        },
        table: {
            name: "Table as CSV", ext: ".csv", icon: "table", line: "One table's rows for a spreadsheet",
            facts: () => target
                ? [["Contains", `The Watchlist's ${WATCH.length} nodes, one row each.`],
                    ["Scope", "Watchlist, 5 nodes. Each column header names the graph its value was computed on."],
                    ["Masked", "Nothing."], ["Size estimate", SIZE]]
                : [["Contains", `The ${tableTab} table, one row per ${tableTab === "Edges" ? "edge" : tableTab === "Nodes" ? "node" : "community"}.`],
                    ["Scope", scopeFacts() + ". Each column header names the graph its value was computed on."],
                    ["Masked", "Columns hidden in the table."], ["Size estimate", SIZE]],
            settings: () => target ? [] : [
                setRow("Table", h("span", { class: "k-seg ex-seg", role: "radiogroup", "aria-label": "Table" },
                    ["Nodes", "Edges", "Communities: Louvain"].map((t) => h("button", { type: "button", role: "radio", "aria-checked": String(t === tableTab), on: { click: () => { tableTab = t; redraw(); } } }, t)))),
            ],
            preview: () => h("pre", { class: "ex-pre" }, tablePreview()),
            file: () => (target ? "les-miserables_watchlist.csv" : "les-miserables_" + tableTab.split(":")[0].toLowerCase() + ".csv"),
        },
    };
    // Image and Video are drawn by their own sections, inside this frame.
    const OTHERS = {
        image: { name: "Image", ext: ".png", icon: "camera", line: "A picture of the canvas", go: ["export-image", "image"] },
        video: { name: "Video", ext: ".webm", icon: "play", line: "The canvas as it moves, or a tour of views", go: ["export-video", "still"] },
    };
    const ORDER = ["image", "video", "figure", "report", "methods", "project", "recipe", "style", "data", "table"];

    function dataPreview() {
        const rs = L().rows.slice(0, 3);
        if (format === "CSV") return ["id,label,group,degree,betweenness"].concat(rs.map((r) => [r.id, r.label, r.group, r.degree, r.betweenness].join(","))).join("\n") + "\n...";
        if (format === "GraphML") return ['<graphml xmlns="http://graphml.graphdrawing.org/xmlns">', '  <key id="label" for="node" attr.name="label" attr.type="string"/>', '  <key id="group" for="node" attr.name="group" attr.type="int"/>', '  <graph edgedefault="undirected">']
            .concat(rs.map((r) => `    <node id="${r.id}"><data key="label">${r.label}</data><data key="group">${r.group}</data></node>`)).concat(["    ..."]).join("\n");
        if (format === "JSON") return '{\n  "nodes": [\n' + rs.map((r) => `    { "id": "${r.id}", "label": "${r.label}", "group": ${r.group} }`).join(",\n") + ",\n    ...";
        if (format === "DOT") return "graph {\n" + rs.map((r) => `  "${r.id}" [label="${r.label}", group=${r.group}];`).join("\n") + "\n  ...";
        if (format === "Pajek") return `*Vertices ${L().nodes}\n` + rs.map((r, i) => `${i + 1} "${r.label}"`).join("\n") + "\n...";
        if (format === "GML") return "graph [\n  directed 0\n" + rs.map((r) => `  node [ id ${r.id} label "${r.label}" group ${r.group} ]`).join("\n") + "\n  ...";
        return '<gexf version="1.3">\n  <graph defaultedgetype="undirected">\n    <nodes>\n' + rs.map((r) => `      <node id="${r.id}" label="${r.label}"/>`).join("\n") + "\n      ...";
    }
    function tablePreview() {
        const sc = target ? "full graph" : scope === "full" ? "full graph" : "filtered graph";
        if (!target && tableTab === "Edges") return `source,target,value (${sc})\n` + "Valjean,Javert,...\n...";
        if (!target && tableTab !== "Nodes") return `community,size (${sc})\n1,25\n2,17\n3,10\n4,10\n5,9\n6,6`;
        const rs = target ? WATCH.map(rowOf) : L().topByDegree.slice(0, 4);
        return [`id,label,group,degree (${sc}),betweenness (${sc})`].concat(rs.map((r) => [r.id, r.label, r.group, r.degree, r.betweenness].join(","))).join("\n") + (target ? "" : "\n...");
    }

    // ---------- the dialog ----------
    const STATE_KIND = { figure: "figure", "findings-report": "report", methods: "methods", project: "project", recipe: "recipe", style: "style", data: "data", table: "table", "from-row": "table" };
    const KIND_STATE = { figure: "figure", report: "findings-report", methods: "methods", project: "project", recipe: "recipe", style: "style", data: "data", table: "table" };
    const FROM = {
        "findings-report": ["project-menu", "open", "the project menu"],
        data: ["data-place", "sent-and-saved", "Data > Sent and saved"],
        "from-row": ["context-menus", "row", "the Watchlist row's menu"],
    };
    let cur = "figure";
    let redraw = () => {};
    let target = false;

    function render(el, state) {
        redraw = () => { el.textContent = ""; render(el, state); };
        cur = STATE_KIND[state] ? state : "figure";
        target = cur === "from-row";
        const key = STATE_KIND[cur];
        const k = KINDS[key];
        const file = typeof k.file === "function" ? k.file() : k.file;

        const from = FROM[cur];
        const scopeless = ["project", "recipe", "style"].includes(key);
        const main = h("div", { class: "ex-main" },
            h("div", { class: "ex-title" }, icon(k.icon), k.name, k.ext ? h("span", { class: "k-secondary", style: "font-weight:400" }, k.ext) : null,
                from ? h("span", { class: "ex-from" }, "Opened from ", AB.link(from[0], from[1], from[2])) : null),
            target ? h("div", { class: "ex-target" }, icon("circle-check", "sm"), h("b", null, "For: Watchlist"), h("span", { class: "k-secondary" }, WATCH.join(", ")),
                h("span", { class: "k-grow" }), AB.link("export-dialog", "table", "Export the whole table instead")) : null,
            facts(k.facts().map(([name, v]) => (name === "Scope" && !target && !scopeless && !k.needs
                ? [name, h("div", { class: "ex-scope" }, scopeControl(), h("div", { class: "k-secondary" }, v))] : [name, v]))),
            k.needs ? h("div", null, AB.needsElement(k.needs)) : null,
            h("div", { class: "ex-set" + (k.needs ? " ex-off" : ""), "aria-disabled": k.needs ? "true" : null }, k.settings()),
            k.preview ? [h("div", { class: "ex-h" }, k.needs ? "What the file would hold" : "Preview"), h("div", { class: k.needs ? "ex-off" : null, "aria-disabled": k.needs ? "true" : null }, k.preview())] : null);

        const write = () => {
            AB.go("data-place", "sent-and-saved");
            setTimeout(() => AB.flash(`Written: ${file}, to Downloads. Listed in Sent and saved.`), 50);
        };
        const foot = [
            h("span", { class: "ex-footl" }, icon("info", "sm"), "Saved to this computer; nothing is uploaded. Each export is listed in ",
                AB.link("data-place", "sent-and-saved", "Data > Sent and saved"), "."),
            AB.button("Cancel", { kind: "ghost", onClick: () => AB.close() }),
            AB.button("Export", { icon: "download", onClick: write, disabled: !!k.needs }),
        ];
        el.append(frame(target ? "from-row" : key, main, foot));
    }

    // The dialog frame: the output list, then body. activeId is a list id (image, video, figure,
    // report, ...) or "from-row" (Table as CSV, target filled in).
    function frame(activeId, body, foot) {
        const lit = activeId === "from-row" ? "table" : activeId;
        const list = h("div", { class: "ex-list", role: "listbox", "aria-label": "What to export" },
            ORDER.map((id) => {
                const it = KINDS[id] || OTHERS[id];
                const to = it.go || ["export-dialog", activeId === "from-row" && id === "table" ? "from-row" : KIND_STATE[id]];
                return h("div", Object.assign({ class: "ex-item", role: "option", "aria-selected": String(id === lit), "aria-disabled": it.needs ? "true" : null }, AB.act({ go: to })),
                    icon(it.icon),
                    h("div", null,
                        h("div", { class: "ex-item-t" }, it.name, it.ext ? h("span", { class: "ex-ext" }, it.ext) : null, id === "figure" ? h("span", { class: "ex-later" }, "PDF later") : null),
                        h("div", { class: "ex-item-d" }, it.line),
                        it.needs ? h("div", { class: "ex-item-d" }, AB.needsElement(it.needs)) : null));
            }));
        const m = AB.modal({ title: "Export", body: [list, body], foot });
        m.querySelector(".k-modal").classList.add("ex-modal");
        return m;
    }
    AB.exportDialogFrame = frame;

    registerSection({
        id: "export-dialog",
        title: "Export dialog",
        region: "overlay",
        frame: { left: "graph-place/at-rest" },
        closeTo: "graph-place",
        states: [
            { id: "figure", label: "Figure selected" },
            { id: "findings-report", label: "Findings report selected" },
            { id: "data", label: "Data format selected" },
            { id: "from-row", label: "Opened from a row, target filled in" },
            { id: "methods", label: "Methods text selected" },
            { id: "project", label: "Project selected" },
            { id: "recipe", label: "Recipe selected" },
            { id: "style", label: "Style selected" },
            { id: "table", label: "Table as CSV selected" },
        ],
        render,
    });
})();
