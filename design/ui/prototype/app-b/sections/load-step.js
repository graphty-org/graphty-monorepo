/* Load step: the one load dialog behind every data door (Data > Sources "+", a source row's
   Replace data... and Re-map columns..., the start screen, a drop, Ctrl+V, the empty-canvas card,
   Quick actions). Opening a project or a sample never passes it. Its fields stand in for
   graphty-element's format catalog (FORMAT_DESCRIPTORS, UNSERVED_FORMAT_IDS, the CSV shapes, the
   repeated-edge policies and the data known fields); the real app reads them from the element and
   never types them. Plain ASCII. Data from kit/fixtures.json (transfers, accounts, Les Miserables,
   patent citations). This file injects its own styles (ls-*). */
(function () {
    "use strict";
    const css = `
.ls-modal { width: 1040px; max-width: calc(100vw - 32px); height: calc(100vh - 96px); max-height: 760px; }
.ls-modal.ls-small { width: 520px; height: auto; }
.ls-modal > .k-modal-body { flex: 1 1 auto; min-height: 0; padding: 0; display: flex; flex-direction: column; overflow: hidden; }
.ls-door { display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 4px 16px; border-bottom: 1px solid var(--cm-border); background: var(--cm-bg-secondary); flex: none; color: var(--cm-text-secondary); }
.ls-cols2 { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 440px minmax(0, 1fr); }
.ls-col { overflow: auto; padding: 0 0 12px; min-width: 0; }
.ls-col + .ls-col { border-inline-start: 1px solid var(--cm-border); }
.ls-set { display: grid; grid-template-columns: 124px minmax(0, 1fr); gap: 4px 8px; align-items: center; padding: 0 16px 8px; }
.ls-set > .ls-lg { color: var(--cm-text-secondary); min-height: 28px; display: flex; align-items: center; gap: 4px; }
.ls-set .k-field { width: 100%; box-sizing: border-box; min-width: 0; }
.ls-set .k-field[aria-disabled=true] { opacity: 0.55; cursor: default; }
.ls-set .ls-sub { grid-column: 2; color: var(--cm-text-secondary); font-size: 11px; line-height: 14px; margin-top: -2px; }
.ls-set .ls-sub[data-warn] { color: var(--cm-text); }
.ls-set .ls-sub[data-warn]::before { content: "!"; display: inline-grid; place-items: center; width: 12px; height: 12px; border-radius: 6px; font-size: 9px; font-weight: 700; background: var(--cm-bg-warning); color: var(--cm-text); margin-inline-end: 6px; vertical-align: 1px; }
.ls-set .ls-full { grid-column: 1 / -1; color: var(--cm-text-secondary); line-height: 16px; }
.ls-mark { box-shadow: inset 0 0 0 1px var(--cm-bg-warning), inset 3px 0 0 var(--cm-bg-warning) !important; }
.ls-files { display: grid; gap: 2px; }
.ls-file { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; gap: 8px; align-items: center; min-height: 28px; }
.ls-file .k-i { color: var(--cm-text-secondary); }
.ls-sh { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 16px; font-weight: 550; margin-top: 4px; }
.ls-sample { padding: 0 16px; overflow-x: auto; }
.ls-sample .k-table th, .ls-sample .k-table td { height: 26px; white-space: nowrap; }
.ls-sample th .ls-role { display: block; font-weight: 450; color: var(--cm-text-secondary); font-size: 11px; line-height: 14px; }
.ls-sample td.ls-clip { max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
.ls-pre { margin: 0 16px; padding: 8px 12px; border-radius: 6px; background: var(--cm-bg-secondary); font: 12px/18px var(--cm-font-mono, ui-monospace, monospace); white-space: pre; overflow: auto; max-height: 220px; }
.ls-issue { margin: 12px 16px 4px; }
.ls-issue .k-issue-body { display: grid; gap: 4px; }
.ls-issue ul { margin: 2px 0 0; padding-inline-start: 18px; color: var(--cm-text-secondary); }
.ls-note { display: flex; gap: 8px; align-items: flex-start; padding: 4px 16px; color: var(--cm-text-secondary); line-height: 16px; }
.ls-note .k-i { margin-top: 1px; flex: none; }
.ls-oq { display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 9px; font-size: 10px; font-weight: 600; white-space: nowrap; background: var(--cm-bg-secondary); color: var(--cm-text-secondary); box-shadow: inset 0 0 0 1px var(--cm-border); cursor: help; }
.ls-choices { display: grid; gap: 4px; padding: 0 16px 8px; }
.ls-choice { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 2px 8px; padding: 6px 8px; border-radius: 6px; cursor: pointer; box-shadow: inset 0 0 0 1px var(--cm-border); }
.ls-choice:hover { background: var(--cm-bg-hover); }
.ls-choice[aria-checked=true] { box-shadow: inset 0 0 0 1px var(--cm-border-brand, var(--cm-text-brand)); }
.ls-choice[aria-disabled=true] { cursor: default; opacity: 0.6; background: none; }
.ls-choice .ls-dot { width: 12px; height: 12px; margin-top: 2px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--cm-text-secondary); box-sizing: border-box; }
.ls-choice[aria-checked=true] .ls-dot { box-shadow: inset 0 0 0 4px var(--cm-text-brand); }
.ls-choice .k-secondary { grid-column: 2; font-size: 11px; line-height: 14px; }
.ls-foot { justify-content: flex-start !important; height: auto !important; min-height: 48px; flex-wrap: wrap; padding-block: 8px !important; }
.ls-reason { color: var(--cm-text-secondary); display: inline-flex; gap: 6px; align-items: center; min-width: 0; flex: 1 1 240px; }
.ls-menu .k-menu-desc { white-space: normal; max-width: 320px; }
.ls-small .ls-body { padding: 12px 0 4px; display: grid; gap: 4px; }
.ls-small .ls-body > p { margin: 0 16px 8px; line-height: 18px; }
@media (max-width: 1180px) { .ls-cols2 { grid-template-columns: 400px minmax(0, 1fr); } .ls-set { grid-template-columns: 112px minmax(0, 1fr); } }
`;
    if (!document.getElementById("ls-style")) document.head.append(h("style", { id: "ls-style" }, css));

    const AB = window.AB;
    const { field, button } = AB;
    const T = () => AB.fx.datasets.transactions;
    const TA = () => AB.fx.datasets.transactionsApril;
    const L = () => AB.fx.datasets.lesmis;
    const C = () => AB.fx.datasets.citations;
    const n = (x) => Number(x).toLocaleString("en-US");
    const oq = (text) => h("span", { class: "ls-oq", tabindex: "0", title: "Open question: " + text, "aria-label": "Open question: " + text }, "Open question");

    // ---------- the element's catalog (stand-in) ----------
    const FORMATS = [
        ["CSV", ".csv .tsv .tab .edges .edgelist"], ["GraphML", ".graphml .xml"], ["GEXF", ".gexf .xml"],
        ["GML", ".gml"], ["DOT", ".dot .gv"], ["Pajek NET", ".net .paj"], ["JSON", ".json"],
    ];
    const UNSERVED = { SIF: "No data source reads the Cytoscape simple interaction format.", CX2: "No data source reads the Cytoscape Exchange format." };
    const SHAPES = ["Edge List", "Node List", "Adjacency List", "Neo4j Export", "Gephi Export", "Cytoscape Export", "Generic"];
    const SEPS = ["Comma", "Tab", "Semicolon", "Pipe"];
    const REPEATS = [
        ["Keep each as its own edge", "Every record becomes an edge, with its own weight"],
        ["Keep the first", "Later records for the same pair are dropped"],
        ["Keep the last", "The last record's weight and attributes replace the first's"],
        ["Merge, adding the weights", "One edge per pair; its weight is the sum"],
        ["Merge, keeping the smallest weight", "One edge per pair"],
        ["Merge, keeping the largest weight", "One edge per pair"],
        ["Refuse the load", "A repeated pair stops the load; nothing changes"],
    ];
    const DIRECTIONS = [
        ["As the file says", "GraphML, GEXF, GML, DOT, Pajek and some JSON declare it; a CSV does not"],
        ["Directed", "Every edge points from its start to its end"],
        ["Undirected", "An edge is the same both ways"],
    ];
    const IDS = [
        ["1 and \"1\" are one node", "A number and the same number written as text match"],
        ["1 and \"1\" are two nodes", "Keep them apart, as the file wrote them"],
    ];
    const STOPS = ["After 10 errors", "After 100 errors", "After 1,000 errors", "Never: read every record"];
    const PAIRS = [["source", "target"], ["src", "dst"], ["from", "to"]];
    const WEIGHT_NAMES = ["weight", "value"];

    // ---------- the files ----------
    const TRANSFER_COLS = () => T().columns;
    const ACCOUNT_COLS = ["id", "kind", "country", "riskScore", "flagged", "alertRule", "alertTime"];
    const GALLERY_AMOUNTS = ["$5.04", "$8.97", "$44.63", "$38.01", "$349.71"]; // the gallery's load-transfers sample, amounts written as currency text
    const PASTED_XML = [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<graph defaultedgetype=\"undirected\">",
        "  <node id=\"0\" label=\"Myriel\"/>",
        "  <node id=\"1\" label=\"Napoleon\"/>",
        "  <node id=\"2\" label=\"Mlle.Baptistine\"/>",
        "  <edge source=\"1\" target=\"0\" value=\"1\"/>",
        "  <edge source=\"2\" target=\"0\" value=\"8\"/>",
        "</graph>",
    ].join("\n");
    const PASTED_PROSE = "Myriel meets Napoleon in chapter 1\nMlle.Baptistine lives with Myriel\nMme.Magloire keeps house for Myriel";
    const LESMIS_URL = "https://example.org/data/miserables.json";

    // ---------- the doors ----------
    // A door says how the dialog was reached, where Cancel goes, and what "Load into" offers.
    const DOORS = {
        start: { text: "Opened from the start screen", icon: "folder-open", into: "new", locked: { add: "No graph is open", replace: "No graph is open" }, cancel: ["start-screen", "returning"], done: ["graph-place", "at-rest"], frame: { full: "start-screen/returning" } },
        drop2: { text: "Two files dropped on the start screen", icon: "layers", into: "new", locked: { add: "No graph is open", replace: "No graph is open" }, cancel: ["start-screen", "drop-target"], done: ["graph-place", "at-rest"], frame: { full: "start-screen/drop-target" } },
        urlStart: { text: "Start screen, Open from URL...", icon: "link", into: "new", locked: { add: "No graph is open", replace: "No graph is open" }, cancel: ["start-screen", "open-url"], done: ["graph-place", "at-rest"], frame: { full: "start-screen/open-url" } },
        paste: { text: "Pasted with Ctrl+V into Transfers", icon: "copy", into: null, cancel: ["data-place", "at-rest"], done: ["data-place", "at-rest"], frame: { left: "data-place/at-rest" } },
        drop: { text: "Dropped on Transfers", icon: "download", into: null, cancel: ["data-place", "at-rest"], done: ["data-place", "at-rest"], frame: { left: "data-place/at-rest" } },
        replace: { text: "Data > Sources > " + "transfers-2026-03.csv > Replace data...", icon: "refresh-cw", into: "replace", locked: { add: "Replace data... replaces this source", new: "Replace data... replaces this source" }, cancel: ["data-place", "at-rest"], done: ["data-place", "after-replace"], frame: { left: "data-place/at-rest" } },
        remap: { text: "Data > Sources > transfers-2026-03.csv > Re-map columns...", icon: "table", into: "replace", cancel: ["data-place", "at-rest"], done: ["data-place", "at-rest"], frame: { left: "data-place/at-rest" } },
    };

    // ---------- the states ----------
    function transfersFile(extra) {
        return Object.assign({
            files: [{ name: T().file, role: "Edges" }], format: "CSV", detected: "Worked out from the name and the first line",
            shape: "Generic", sep: "Comma", cols: TRANSFER_COLS(), nodeCols: [],
            start: "from_account", end: "to_account", weight: "amount", label: "None: show the id", edgeId: "None", pos: "None", scale: "1",
            direction: "Directed", repeats: REPEATS[0][0], ids: IDS[0][0], stop: STOPS[1], sample: "transfers",
        }, extra);
    }
    const STATES = {
        preview: () => transfersFile({ door: "start" }),
        checks: () => transfersFile({ door: "start", amountText: true }),
        "detect-several": () => ({ door: "paste", files: [{ name: "Pasted text", role: "Text", icon: "copy" }], format: null, candidates: ["GraphML", "GEXF"], cols: ["source", "target", "value"], nodeCols: ["id", "label"], start: "Automatic", end: "Automatic", weight: "Automatic", label: "label", edgeId: "None", pos: "None", scale: "1", direction: "As the file says", repeats: REPEATS[0][0], ids: IDS[0][0], stop: STOPS[1], pasted: PASTED_XML }),
        "detect-none": () => ({ door: "paste", files: [{ name: "Pasted text", role: "Text", icon: "copy" }], format: null, candidates: [], cols: [], nodeCols: [], start: "Automatic", end: "Automatic", weight: "Automatic", label: "None: show the id", edgeId: "None", pos: "None", scale: "1", direction: "As the file says", repeats: REPEATS[0][0], ids: IDS[0][0], stop: STOPS[1], pasted: PASTED_PROSE }),
        "unsupported-format": () => ({ door: "start", files: [{ name: "interactions.sif", role: "File" }], format: "SIF", unserved: true, cols: [], nodeCols: [], start: "Automatic", end: "Automatic", weight: "Automatic", label: "None: show the id", edgeId: "None", pos: "None", scale: "1", direction: "As the file says", repeats: REPEATS[0][0], ids: IDS[0][0], stop: STOPS[1] }),
        url: () => ({ door: "urlStart", url: LESMIS_URL, tries: "3 tries", files: [], format: "JSON", detected: "Worked out from the address", nodesAt: "nodes", edgesAt: "links", cols: ["source", "target", "value"], nodeCols: ["id", "label", "group"], start: "Automatic", end: "Automatic", weight: "Automatic", label: "label", edgeId: "None", pos: "None", scale: "1", direction: "As the file says", repeats: REPEATS[0][0], ids: IDS[0][0], stop: STOPS[1], sample: "lesmis" }),
        "load-into": () => transfersFile({ door: "drop", files: [{ name: TA().file, role: "Edges" }], small: true }),
        paired: () => transfersFile({ door: "drop2", files: [{ name: T().accountsFile, role: "Nodes" }, { name: T().file, role: "Edges" }], shape: "Edge List and Node List", nodeCols: ACCOUNT_COLS, nodeId: "id", sample: "paired" }),
        "refused-empty": () => transfersFile({ door: "start", files: [{ name: "Untitled.csv", role: "File" }], cols: TRANSFER_COLS(), sample: null, refusal: "empty" }),
        "refused-parse": () => transfersFile({ door: "start", sample: "transfers", amountText: true, refusal: "parse" }),
        "refused-endpoints": () => transfersFile({ door: "start", start: "Automatic", end: "Automatic", refusal: "endpoints" }),
        "refused-fetch": () => Object.assign(STATES.url(), { refusal: "fetch", sample: null }),
        "refused-too-large": () => transfersFile({ door: "start", files: [{ name: C().file, role: "Edges" }], cols: C().columns, start: C().columns[0], end: C().columns[1], weight: "Automatic", sample: null, refusal: "large" }),
        "one-at-a-time": () => ({ door: "drop", small: true, oneAtATime: true }),
        replace: () => transfersFile({ door: "replace", files: [{ name: TA().file, role: "Edges" }], detected: "The same shape and columns as " + T().file }),
        remap: () => transfersFile({ door: "remap", remap: true }),
    };

    // ---------- helpers ----------
    const findPair = (cols) => PAIRS.find(([a, b]) => cols.includes(a) && cols.includes(b));
    const findWeight = (cols) => WEIGHT_NAMES.find((w) => cols.includes(w));

    let model = null;
    function render(el, state) {
        if (!model || model.state !== state) model = Object.assign({ state }, STATES[state] ? STATES[state]() : STATES.preview());
        const m = model;
        const door = DOORS[m.door];
        if (m.into === undefined) m.into = door.into;
        const redraw = () => { el.replaceChildren(); build(); };
        const closeMenus = () => el.querySelectorAll(".ls-menu").forEach((x) => x.remove());

        // a select that changes the model in place; options are "label", [label, desc] or { label, desc, disabled }
        function pick(value, options, set, o) {
            o = o || {};
            if (o.disabled) return h("span", { class: "k-field", "aria-disabled": "true", title: o.disabled }, h("span", { class: "k-grow k-ellipsis" }, value), h("span", { class: "k-caret" }, icon("chevron-down", "sm")));
            const f = field(value, { caret: true, onClick: (e) => {
                e.stopPropagation();
                closeMenus();
                const items = options.map((opt) => {
                    if (opt && opt.sep) return opt;
                    if (opt && opt.heading) return opt;
                    const it = Array.isArray(opt) ? { label: opt[0], desc: opt[1] } : typeof opt === "string" ? { label: opt } : opt;
                    return Object.assign({ check: it.label === value }, it, it.disabled ? {} : { onClick: it.onClick || (() => { set(it.label); redraw(); }) });
                });
                const mn = AB.menu({ anchor: e.currentTarget, place: "below-start", items });
                mn.classList.add("ls-menu");
                el.append(mn);
            } });
            if (o.id) f.classList.add("k-id");
            if (o.mark) f.classList.add("ls-mark");
            return f;
        }
        const sub = (kids, warn) => h("span", { class: "ls-sub", "data-warn": warn ? "" : null }, kids);
        const lg = (text) => h("span", { class: "ls-lg" }, text);

        // ---------- left: Source ----------
        function sourceSection() {
            const rows = [];
            if (m.url !== undefined) {
                rows.push(lg("Address"), field(m.url, { icon: "link", onClick: () => AB.flash("Edit the address (not wired in the skeleton)") }));
                rows.push(lg("Tries"), pick(m.tries, ["1 try", "3 tries", "5 tries"], (v) => (m.tries = v)));
                rows.push(sub("If the address does not answer, the load tries again before it gives up"));
            } else {
                rows.push(lg(m.files.length > 1 ? "Files" : m.files[0].role === "Text" ? "Text" : "File"),
                    h("div", { class: "ls-files" }, m.files.map((f, i) => h("div", { class: "ls-file" }, icon(f.icon || "file", "sm"), h("span", { class: "k-ellipsis k-id" }, f.name),
                        m.files.length > 1 ? pick(f.role, ["Nodes", "Edges"], (v) => { m.files[i].role = v; m.files[1 - i].role = v === "Nodes" ? "Edges" : "Nodes"; }) : null))));
                if (m.files.length > 1) rows.push(sub("Loaded together as one graph: the node file's rows become nodes, the edge file's rows become edges"));
                if (m.remap) rows.push(sub("Re-mapping reads this file again; the file itself is not changed"));
            }
            const formatItems = FORMATS.map(([label, ext]) => ({ label, desc: ext, onClick: () => { m.format = label; m.unserved = false; if (label === "JSON") { m.nodesAt = m.nodesAt || "nodes"; m.edgesAt = m.edgesAt || "edges"; } redraw(); } }))
                .concat([{ sep: true }, { heading: "Named, but nothing reads them" }], Object.keys(UNSERVED).map((k) => ({ label: k, desc: UNSERVED[k], disabled: true })));
            const fmtValue = m.format ? m.format : m.candidates && m.candidates.length ? "Choose: " + m.candidates.join(" or ") : "Choose a format";
            rows.push(lg("Format"), pick(fmtValue, formatItems, () => {}, { mark: !m.format || m.unserved, disabled: m.remap ? "Re-map keeps the format; Replace data... reads a different file" : null }));
            if (m.unserved) rows.push(sub(UNSERVED[m.format], true));
            else if (m.format && m.detected) rows.push(sub(m.detected));
            else if (!m.format && m.candidates && m.candidates.length) rows.push(sub("The text matches more than one format", true));
            else if (!m.format) rows.push(sub("Nothing recognized this text", true));
            if (m.format === "CSV") {
                rows.push(lg("File shape"), pick(m.shape, SHAPES.map((s) => [s, s === "Adjacency List" ? "Never worked out from the file: choose it here" : null]).concat(m.files.length > 1 ? [["Edge List and Node List", "Two files, loaded together"]] : []), (v) => (m.shape = v)));
                rows.push(sub(m.shape === "Generic" ? "Worked out from the header row: none of the named shapes matched" : "Worked out from the header row"));
                rows.push(lg("Column separator"), pick(m.sep, SEPS, (v) => (m.sep = v)));
                rows.push(sub("Worked out from the first line"));
            }
            if (m.format === "JSON") {
                rows.push(lg("Nodes are at"), field(m.nodesAt, { onClick: () => AB.flash("Edit where the nodes are (not wired in the skeleton)") }));
                rows.push(lg("Edges are at"), field(m.edgesAt, { onClick: () => AB.flash("Edit where the edges are (not wired in the skeleton)") }));
                rows.push(sub(["A path into the document, such as nodes or data.links"]));
                rows.push(lg("Dialect"), pick("Set by the paths above", [], () => {}, { disabled: "No dialect list in the catalog" }));
                rows.push(sub(AB.needsElement("The element's catalog publishes no list of JSON dialects; the paths above say where the nodes and edges are")));
            }
            if (m.format === "GEXF") rows.push(h("span", { class: "ls-full" }, "Time data in a GEXF file (spells) is kept on each node and edge."));
            const summary = m.url !== undefined ? m.url : (m.files[0] && m.files[0].name) + (m.format ? ", " + m.format : "");
            return AB.section({ title: "Source", collapsible: true, remember: false, summary }, h("div", { class: "ls-set" }, rows));
        }

        // ---------- left: How the graph is read ----------
        function readSection() {
            if (!m.format || m.unserved)
                return AB.section({ title: "How the graph is read", collapsible: true, remember: false, summary: "Choose a format first" },
                    h("div", { class: "ls-set" }, h("span", { class: "ls-full" }, "Choose a format first: what can be set here depends on it.")));
            const cols = m.cols, nodeCols = m.nodeCols;
            const pair = findPair(cols), wAuto = findWeight(cols);
            const rows = [];
            const endpointOpts = [["Automatic", "Looks for source and target, then src and dst, then from and to"]].concat(cols.map((c) => c));
            const autoMissing = m.start === "Automatic" && !pair;
            // node id
            if (nodeCols.length && m.files.length > 1)
                rows.push(lg("Node id"), pick(m.nodeId, nodeCols, (v) => (m.nodeId = v), { id: true }), sub("In " + m.files.find((f) => f.role === "Nodes").name));
            else if (nodeCols.length)
                rows.push(lg("Node id"), pick(nodeCols.includes("id") ? "id" : nodeCols[0], nodeCols, () => {}, { id: true }));
            else rows.push(lg("Node id"), pick("The edge ends", [["The edge ends", "Each value in the start and end columns is a node"]], () => {}), sub("This file has no node rows: every node is named by an edge"));
            // label
            rows.push(lg("Label"), pick(m.label, [["None: show the id", "A node shows its id"]].concat(nodeCols), (v) => (m.label = v), { id: m.label !== "None: show the id" }));
            // endpoints
            const endMark = m.refusal === "endpoints";
            rows.push(lg("Edge start"), pick(m.start, endpointOpts, (v) => { m.start = v; if (v === "Automatic") m.end = "Automatic"; }, { id: m.start !== "Automatic", mark: endMark && m.start === "Automatic" }));
            rows.push(lg("Edge end"), pick(m.end, endpointOpts, (v) => { m.end = v; if (v === "Automatic") m.start = "Automatic"; }, { id: m.end !== "Automatic", mark: endMark && m.end === "Automatic" }));
            if (m.start === "Automatic") rows.push(pair ? sub(["Found ", h("b", { class: "k-id" }, pair[0]), " and ", h("b", { class: "k-id" }, pair[1])]) : sub("None of source, src or from is in this file: choose the columns", true));
            else rows.push(sub("Named here. Left on Automatic, the load looks for source, src or from"));
            // edge id
            rows.push(lg("Edge id"), pick(m.edgeId, [["None", "Repeats are decided by their start and end"]].concat(cols), (v) => (m.edgeId = v), { id: m.edgeId !== "None" }));
            rows.push(sub("A second row with the same edge id is a repeat"));
            // weight
            const wOpts = [["Automatic", "Looks for weight, then value"], ["None", "Every edge counts the same"]].concat(cols);
            rows.push(lg("Weight"), pick(m.weight, wOpts, (v) => (m.weight = v), { id: !["Automatic", "None"].includes(m.weight), mark: m.amountText && m.weight === "amount" }));
            if (m.amountText && m.weight === "amount") rows.push(sub("amount is written as text (\"$5.04\"), so it cannot weigh an edge", true));
            else if (m.weight === "Automatic") rows.push(wAuto ? sub(["Found ", h("b", { class: "k-id" }, wAuto), ". What a weight means is chosen per run"]) : sub("Found none of weight or value: edges load unweighted"));
            else rows.push(sub("What a weight means (distance or strength) is chosen per run"));
            // positions
            rows.push(lg("Positions"), pick(m.pos, [["None", "The layout places every node"], { label: "Choose columns...", desc: "x and y, or x, y and z", onClick: () => AB.flash("Choose position columns (not wired in the skeleton)") }], (v) => (m.pos = v)));
            rows.push(lg("Position scale"), pick(m.scale, ["0.1", "1", "10", "100"], (v) => (m.scale = v), { disabled: m.pos === "None" ? "No position columns" : null }));
            rows.push(sub(m.pos === "None" ? "For files that carry coordinates" : "File units to drawing units"));
            // direction
            rows.push(lg("Direction"), pick(m.direction, DIRECTIONS, (v) => (m.direction = v)));
            if (m.direction === "As the file says")
                rows.push(m.format === "CSV" ? sub("A CSV does not say: choose Directed or Undirected", true)
                    : m.format === "JSON" ? sub(["Read from a top-level \"directed\" key; ", oq("what the load does when the document has none, and how a mixed file reads")])
                        : sub("Read from the file; a file with both kinds of edge reads as mixed"));
            // repeats, ids, errors
            rows.push(lg("Repeated pairs"), pick(m.repeats, REPEATS, (v) => (m.repeats = v)));
            rows.push(lg("Ids"), pick(m.ids, IDS, (v) => (m.ids = v)));
            rows.push(lg("Stop reading"), pick(m.stop, STOPS, (v) => (m.stop = v), { mark: m.refusal === "parse" }));
            rows.push(sub("Rows that cannot be read are skipped and listed in the import report"));
            const summary = [m.start === "Automatic" ? (pair ? pair.join(" to ") : "edge ends not found") : m.start + " to " + m.end, m.weight === "Automatic" ? (wAuto ? "weight " + wAuto : "no weight") : m.weight === "None" ? "no weight" : "weight " + m.weight, m.direction.toLowerCase()].join(", ");
            return AB.section({ title: "How the graph is read", collapsible: true, remember: false, summary }, h("div", { class: "ls-set" }, rows));
        }

        // ---------- left: Load into ----------
        const INTO = [
            ["add", "This graph (add)", "Adds the nodes and edges to Transfers; repeated pairs follow the rule above"],
            ["replace", "Replace this graph", "Swaps Transfers' data in one step; if the new data fails, Transfers is untouched"],
            ["new", "A new graph", "Opens it as its own graph, beside Transfers in this project"],
        ];
        function intoChoices() {
            const locked = door.locked || {};
            return h("div", { class: "ls-choices", role: "radiogroup", "aria-label": "Load into" }, INTO.map(([id, label, desc]) => {
                const off = locked[id];
                const d = m.door.startsWith("start") || m.door === "drop2" || m.door === "urlStart"
                    ? (id === "new" ? "Opens it as a new graph in a new project" : desc)
                    : desc;
                return h("div", Object.assign({ class: "ls-choice", role: "radio", tabindex: off ? "-1" : "0", "aria-checked": String(m.into === id), "aria-disabled": off ? "true" : null, title: off || null },
                    off ? {} : AB.act({ onClick: () => { m.into = id; redraw(); } })),
                h("span", { class: "ls-dot" }), h("span", null, label), h("span", { class: "k-secondary" }, off ? off : d),
                id === "replace" && !off ? h("span", { class: "k-secondary" }, AB.needsElement("What a replacing load does to runs and the layers that read their results is not defined by the element yet")) : null);
            }));
        }
        function intoSection() {
            if (m.remap)
                return AB.section({ title: "Load into", collapsible: true, remember: false, summary: "Replace this graph" },
                    h("div", { class: "ls-set" }, h("span", { class: "ls-full" }, "Apply reads the file again with these settings and replaces Transfers' data in one step. If the new reading fails, Transfers is untouched.")));
            const cur = INTO.find((x) => x[0] === m.into);
            return AB.section({ title: "Load into", collapsible: true, remember: false, summary: cur ? cur[1] : "Not chosen yet" }, intoChoices());
        }

        // ---------- right ----------
        function issue(glyph, head, body) {
            return h("div", { class: "k-issue ls-issue", role: "alert" }, glyph === "error" ? icon("circle-x") : h("span", { class: "k-warn-glyph" }, "!"), h("div", { class: "k-issue-body" }, h("b", null, head), body));
        }
        function refusalIssue() {
            const t = T(), c = C();
            switch (m.refusal) {
                case "empty": return issue("error", "Not loaded: Untitled.csv holds no nodes and no edges", [h("span", { class: "k-secondary" }, "The file has a header row and nothing under it. Nothing was loaded and no graph was made."), h("span", { class: "k-secondary" }, "Choose another file, or add rows to this one and load it again.")]);
                case "parse": return issue("error", "Not loaded: " + t.file + " could not be read", [
                    h("span", { class: "k-secondary" }, "Reading stopped after " + m.stop.replace("After ", "").replace(/^Never.*/, "every record") + ". The first rows the reader rejected:"),
                    h("ul", null, h("li", { class: "k-num" }, "Line 2: 5 columns where the header has 4"), h("li", { class: "k-num" }, "Line 5: 5 columns where the header has 4")),
                    h("span", { class: "k-secondary" }, "Suggested fix: an amount holds a comma (\"$1,240.00\"). Quote the amounts in the file, or choose Semicolon as the column separator if the file uses one."),
                    h("span", null, oq("the line numbers are a stand-in: the fixture file reads cleanly; the element's error summary supplies the real ones")),
                ]);
                case "endpoints": return issue("error", "Not loaded: no edge start and end found", [
                    h("span", { class: "k-secondary" }, "The load looks for source and target, then src and dst, then from and to. This file's columns are:"),
                    h("span", { class: "k-id" }, t.columns.join(", ")),
                    h("span", { class: "k-secondary" }, "Choose Edge start and Edge end under How the graph is read, then load again."),
                ]);
                case "fetch": return issue("error", "Not loaded: the address did not answer", [
                    h("span", { class: "k-secondary k-id" }, m.url),
                    h("span", { class: "k-secondary" }, "Tried " + m.tries.replace(" tries", " times").replace("1 try", "once") + ". Check the address and your connection, then load again. Nothing changed."),
                ]);
                case "large": return issue("error", "Not loaded: " + c.file + " is too large to draw", [
                    h("span", { class: "k-secondary k-num" }, n(c.nodes) + " nodes and " + n(c.edges) + " edges. A graph draws up to " + n(c.drawingLimit) + " nodes and 100,000 edges."),
                    h("span", { class: "k-secondary" }, "Nothing was loaded, so nothing needs undoing."),
                    h("span", null, AB.button("Filter at import...", { kind: "secondary", disabled: true, onClick: () => AB.flash("Filter at import needs graphty-element") }), " ", AB.needsElement("The element cannot yet keep only part of a file while it reads it")),
                ]);
            }
            return null;
        }
        function sampleTable(cols, rows, roleOf, cap) {
            return [h("div", { class: "ls-sh" }, cap),
                h("div", { class: "ls-sample" }, h("table", { class: "k-table" },
                    h("thead", null, h("tr", null, cols.map((c) => h("th", null, c, h("span", { class: "ls-role" }, roleOf(c) || "attribute"))))),
                    h("tbody", null, rows.map((r) => h("tr", null, r.map((v, i) => h("td", { class: "k-num" + (i < 2 ? " k-id" : "") + (cols[i] === "alertRule" ? " ls-clip" : "") + (cols[i] === "amount" && m.amountText ? " ls-mark" : ""), title: cols[i] === "alertRule" ? v : null }, v))))))),
            ];
        }
        function edgeRole(c) {
            const pair = findPair(m.cols);
            const s = m.start === "Automatic" ? pair && pair[0] : m.start, e = m.end === "Automatic" ? pair && pair[1] : m.end;
            const w = m.weight === "Automatic" ? findWeight(m.cols) : m.weight;
            if (c === s) return "edge start";
            if (c === e) return "edge end";
            if (c === w) return m.amountText && c === "amount" ? "weight, text" : "weight";
            if (c === m.edgeId) return "edge id";
            return null;
        }
        function right() {
            const col = h("div", { class: "ls-col" });
            const t = T();
            if (m.refusal) col.append(refusalIssue());
            if (m.amountText && !m.refusal && m.weight === "amount")
                col.append(issue("warn", "The weight column is text: amount", [
                    h("span", { class: "k-secondary" }, "Every amount in the first rows is written with a dollar sign, so amount cannot weigh an edge. Choose None or Automatic under Weight to load unweighted; amount stays on each edge as text."),
                    h("span", null, AB.needsElement("Reading currency text as numbers, and checking a column before the load, are not in the element yet")),
                ]));
            if (m.unserved)
                col.append(issue("error", "interactions.sif cannot be read", [h("span", { class: "k-secondary" }, UNSERVED.SIF), h("span", { class: "k-secondary" }, "Readable formats: " + FORMATS.map((f) => f[0]).join(", ") + ".")]));
            if (!m.format && !m.unserved) {
                if (m.candidates.length) {
                    col.append(issue("warn", "This text could be " + m.candidates.join(" or "), h("span", { class: "k-secondary" }, "Both formats are XML, and the text does not say which it is. Choose one:")));
                    col.append(h("div", { class: "ls-choices", role: "radiogroup", "aria-label": "Format" }, m.candidates.map((f) => h("div", Object.assign({ class: "ls-choice", role: "radio", tabindex: "0", "aria-checked": "false" }, AB.act({ onClick: () => { m.format = f; m.detected = "Chosen from " + m.candidates.join(" and "); redraw(); } })),
                        h("span", { class: "ls-dot" }), h("span", null, f), h("span", { class: "k-secondary" }, FORMATS.find((x) => x[0] === f)[1])))));
                } else {
                    col.append(issue("error", "Nothing recognized the format of this text", [
                        h("span", { class: "k-secondary" }, "Readable formats: " + FORMATS.map((f) => f[0]).join(", ") + ". Choose one under Format, or paste a file's text as it is saved."),
                    ]));
                }
            }
            if (m.pasted) col.append(h("div", { class: "ls-sh" }, "Pasted text"), h("pre", { class: "ls-pre" }, m.pasted));
            if (m.sample === "transfers")
                col.append(...sampleTable(t.columns, t.firstRows.slice(0, 5).map((r, i) => [r.from_account, r.to_account, m.amountText ? GALLERY_AMOUNTS[i] : r.amount, r.timestamp.replace("T", " ").replace("Z", "")]), edgeRole, "First rows of " + m.files[0].name));
            if (m.sample === "paired") {
                const nodes = m.files.find((f) => f.role === "Nodes").name, edges = m.files.find((f) => f.role === "Edges").name;
                col.append(...sampleTable(ACCOUNT_COLS, t.flaggedAccounts.slice(0, 4).map((r) => [r.id, r.kind, r.country, String(r.riskScore), String(r.flagged), r.alertRule, r.alertTime.replace("T", " ").replace(":00Z", "")]), (c) => (c === m.nodeId ? "node id" : c === m.label ? "label" : null), "First rows of " + nodes));
                col.append(...sampleTable(t.columns, t.firstRows.slice(0, 4).map((r) => [r.from_account, r.to_account, r.amount, r.timestamp.replace("T", " ").replace("Z", "")]), edgeRole, "First rows of " + edges));
            }
            if (m.sample === "lesmis") {
                col.append(...sampleTable(["id", "label", "group"], L().rows.slice(0, 5).map((r) => [r.id, r.label, String(r.group)]), (c) => (c === "id" ? "node id" : c === m.label ? "label" : null), "First nodes, at " + m.nodesAt));
                col.append(h("div", { class: "ls-note" }, icon("info", "sm"), h("span", null, "Ids here are numbers. Under Ids, 1 and \"1\" are one node unless you keep them apart.")));
            }
            if (m.format && !m.unserved && !m.refusal)
                col.append(h("div", { class: "ls-sh" }, "After the load"),
                    h("div", { class: "ls-note" }, icon("file", "sm"), h("span", null, "The import report says what happened: which columns were read as edge ends, rows skipped, what happened to repeats, and where the weight came from. It stays with the source in ", AB.link("data-place", "at-rest", "Data > Sources"), ".")));
            return col;
        }

        // ---------- footer ----------
        function footer() {
            let off = null;
            if (m.unserved) off = "Choose another file: this format cannot be read";
            else if (!m.format) off = "Choose a format";
            else if (m.amountText && m.weight === "amount" && !m.refusal) off = "Choose another weight, or None";
            else if (m.format === "CSV" && m.direction === "As the file says") off = "Choose a direction: a CSV does not say";
            else if (!m.remap && !m.into) off = "Choose where it loads, under Load into";
            else if (m.refusal === "endpoints" && m.start === "Automatic") off = "Choose Edge start and Edge end";
            else if (m.refusal === "empty") off = "Choose another file";
            else if (m.refusal === "large") off = "Choose another file";
            const verb = m.remap ? "Apply" : m.door === "replace" ? "Replace" : m.refusal ? "Load again" : "Load";
            const reason = off ? h("span", { class: "ls-reason" }, h("span", { class: "k-warn-glyph" }, "!"), off)
                : h("span", { class: "ls-reason" }, m.remap ? "Applies to every row that reads a changed column" : "One source loads at a time. Undo takes it back.");
            const primary = off ? button(verb, { disabled: true, onClick: () => AB.flash(off) }) : button(verb, { go: door.done });
            if (off && !m.unserved && !["empty", "large"].includes(m.refusal)) primary.setAttribute("title", off);
            return [reason,
                m.unserved || ["empty", "large"].includes(m.refusal) ? button("Choose another file...", { kind: "secondary", onClick: () => AB.flash("Choose another file (not wired in the skeleton)") }) : null,
                button("Cancel", { kind: "secondary", go: door.cancel }), primary];
        }

        // ---------- the small dialogs ----------
        function smallDialog(title, body, foot) {
            const wrap = AB.modal({ title, body: h("div", { class: "ls-body" }, body), foot });
            const box = wrap.querySelector(".k-modal");
            box.classList.add("ls-modal", "ls-small");
            box.querySelector(".k-modal-foot").classList.add("ls-foot");
            return wrap;
        }
        function build() {
            if (m.oneAtATime) {
                el.append(smallDialog(TA().file + " was not loaded", [
                    h("p", null, "One source at a time: ", h("b", null, T().file), " is still reading. Drop ", TA().file, " again when the first one finishes."),
                    h("div", { class: "ls-note" }, AB.needsElement("Waiting in line for the first load to finish is not in the element yet"), oq("whether a second drop should wait its turn once the element can queue loads")),
                ], [h("span", { class: "k-grow" }), button("OK", { go: ["data-place", "at-rest"] })]));
                return;
            }
            if (m.small) {
                el.append(smallDialog("Load " + m.files[0].name, [
                    h("div", { class: "ls-door" }, icon(door.icon, "sm"), h("span", null, door.text)),
                    h("div", { class: "ls-note" }, icon("file", "sm"), h("span", null, h("b", { class: "k-id" }, m.files[0].name), ", CSV, the same columns as " + T().file + ". ", AB.link("load-step", "preview", "Change how it is read..."))),
                    h("div", { class: "ls-sh" }, "Load into"),
                    intoChoices(),
                ], [h("span", { class: "ls-reason" }, m.into ? "" : [h("span", { class: "k-warn-glyph" }, "!"), "A drop asks where it loads"]),
                    button("Cancel", { kind: "secondary", go: door.cancel }),
                    m.into ? button("Load", { go: m.into === "new" ? ["graph-place", "at-rest"] : m.into === "replace" ? ["data-place", "after-replace"] : ["data-place", "at-rest"] }) : button("Load", { disabled: true, onClick: () => AB.flash("Choose where it loads") })]));
                return;
            }
            const left = h("div", { class: "ls-col" }, sourceSection(), readSection(), intoSection());
            const title = m.remap ? "Re-map columns: " + T().file : m.door === "replace" ? "Replace data: " + T().file : m.url !== undefined ? "Load from a URL" : m.files[0].role === "Text" ? "Load pasted text" : "Load " + m.files.map((f) => f.name).join(" and ");
            const wrap = AB.modal({ title, body: [h("div", { class: "ls-door" }, icon(door.icon, "sm"), h("span", null, door.text)), h("div", { class: "ls-cols2" }, left, right())], foot: footer() });
            const box = wrap.querySelector(".k-modal");
            box.classList.add("ls-modal");
            box.querySelector(".k-modal-foot").classList.add("ls-foot");
            box.addEventListener("click", closeMenus);
            el.append(wrap);
        }
        build();
    }

    registerSection({
        id: "load-step",
        title: "Load dialog",
        region: "overlay",
        frame: (state) => DOORS[(STATES[state] ? STATES[state]() : STATES.preview()).door].frame,
        states: [
            { id: "preview", label: "New file" },
            { id: "checks", label: "Weight is text" },
            { id: "detect-several", label: "Pasted: several formats match" },
            { id: "detect-none", label: "Pasted: no format matches" },
            { id: "unsupported-format", label: "Format cannot be read (SIF)" },
            { id: "url", label: "From a URL" },
            { id: "load-into", label: "Dropped: where it loads" },
            { id: "paired", label: "Node file and edge file" },
            { id: "refused-empty", label: "Refused: empty" },
            { id: "refused-parse", label: "Refused: could not be read" },
            { id: "refused-endpoints", label: "Refused: no edge ends" },
            { id: "refused-fetch", label: "Refused: address did not answer" },
            { id: "refused-too-large", label: "Refused: too large" },
            { id: "one-at-a-time", label: "One source at a time" },
            { id: "replace", label: "Replace data" },
            { id: "remap", label: "Re-map columns" },
        ],
        render,
    });
})();
