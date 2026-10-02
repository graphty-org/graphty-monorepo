/* Data page (spec 11.3): the one page every data door opens. It takes the workspace (the header and
   rail stay, Data stays lit) and replaces the load dialog and the source inspector, whose old routes
   redirect here (app.js). Left: the tables list. Right, top to bottom: the read-only model strip,
   the selected table's header strip, the sample grid with a role under each column header, and the
   match report. Footer: Direction, Cancel, Load. An edge table's Weight carries its own
   "Higher means" under its column header (the meaning belongs to the weight); a node weight has none.
   Fixtures: AB.fx.datasets.doorEntries (people, buildings, entries; its `report` stands in for
   graphty-element's match report object, so this file counts nothing), transactions and
   transactionsApril (accounts and transfers), lesmis (the graph file), citations (too large).
   Plain ASCII. This file injects its own styles (dp-*). */
(function () {
    "use strict";
    const css = `
.dpg { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 236px minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; background: var(--cm-bg); }
.dpg-tables { grid-row: 1; border-inline-end: 1px solid var(--cm-border); overflow: auto; min-height: 0; display: flex; flex-direction: column; }
.dpg-tables > .k-section-head { padding: 0 8px 0 12px; }
.dpg-list { list-style: none; margin: 0; padding: 0 0 8px; }
.dpg-list:focus-visible { outline: none; }
.dpg-t { display: grid; grid-template-columns: 16px 16px minmax(0, 1fr) auto 16px 20px; align-items: center; gap: 6px; height: 28px; padding: 0 8px 0 calc(10px + var(--dpg-d, 0) * 12px); cursor: pointer; }
.dpg-t .dpg-name { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dpg-t .dpg-name > .ab-mid { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.dpg-t[data-unread] .dpg-name, .dpg-t[data-unread] .dpg-n { color: var(--cm-text-secondary); }
.dpg-t[data-gone] .dpg-name { text-decoration: line-through; color: var(--cm-text-secondary); }
.dpg-rm[aria-disabled="true"] { opacity: 0.45; cursor: default; }
.dpg-role .k-badge { white-space: nowrap; }
.dpg-quiet { color: var(--cm-text-secondary); font-weight: 400; padding: 0 2px; line-height: 20px; }
.dpg-grid th[data-frozen], .dpg-grid td[data-frozen] { position: sticky; left: 0; z-index: 1; background: var(--cm-bg); box-shadow: inset -1px 0 0 var(--cm-border); }
.dpg-grid th[data-frozen] { z-index: 2; }
.dpg-grid th[data-goto] { box-shadow: inset 0 0 0 2px var(--cm-border-selected-strong); }
.dpg-grid th.dpg-gh { padding-top: 2px; padding-bottom: 2px; font-weight: 450; color: var(--cm-text-secondary); border-bottom: 1px solid var(--cm-border); }
.dpg-gh-btn { display: inline-flex; align-items: center; gap: 2px; cursor: pointer; border-radius: 3px; padding: 0 2px; max-width: 100%; }
.dpg-gh-btn:hover { background: var(--cm-bg-hover); }
.dpg-gh-btn:focus-visible { outline: 2px solid var(--cm-border-selected-strong); outline-offset: 1px; }
.dpg-gobar { flex: none; display: flex; align-items: center; gap: 8px; padding: 6px 16px; border-bottom: 1px solid var(--cm-border); }
.dpg-gobar .k-field { min-width: 220px; }
.dpg-gobar .dpg-lab { color: var(--cm-text-secondary); }
.dpg-cell-more { color: var(--cm-text-secondary); font-variant-numeric: tabular-nums; }
.dpg-rl-sub { font-weight: 550; margin-top: 6px; }
.dpg-probs { flex: none; padding: 6px 16px; border-bottom: 1px solid var(--cm-border); }
.dpg-probs .ab-problem { margin: 2px 0; }
.dpg-t:hover { background: var(--cm-bg-hover); }
.dpg-t[aria-selected="true"] { background: var(--cm-bg-selected); }
.dpg-t:focus-visible { outline: 2px solid var(--cm-border-selected-strong); outline-offset: -2px; }
.dpg-t .dpg-n { color: var(--cm-text-secondary); font-variant-numeric: tabular-nums; }
.dpg-t .dpg-rm { visibility: hidden; }
.dpg-t:hover .dpg-rm, .dpg-t:focus-within .dpg-rm, .dpg-t[aria-selected="true"] .dpg-rm { visibility: visible; }
.dpg-ok { color: color-mix(in srgb, var(--cm-bg-success) 70%, var(--cm-text)); display: inline-flex; }
.dpg-warn { color: var(--cm-text); display: inline-flex; }
.dpg-err { color: var(--cm-text-danger); display: inline-flex; }
.dpg-main { grid-row: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.dpg-strip { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; padding: 8px 16px; border-bottom: 1px solid var(--cm-border); background: var(--cm-bg-secondary); min-width: 0; }
.dpg-strip-h { color: var(--cm-text-secondary); }
.dpg-line { font-family: var(--cm-font-family-mono, ui-monospace, monospace); font-size: 12px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; border-radius: 3px; padding: 0 4px; }
.dpg-line:focus-visible { outline: 2px solid var(--cm-border-selected-strong); }
.dpg-head { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; padding: 8px 16px; border-bottom: 1px solid var(--cm-border); min-width: 0; }
.dpg-ctl { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.dpg-ctl > .dpg-lab { color: var(--cm-text-secondary); white-space: nowrap; }
.dpg-ctl .k-field { min-width: 150px; max-width: 260px; }
.dpg-ctl input.k-field { min-width: 280px; }
.dpg-locked { display: inline-flex; align-items: center; gap: 4px; color: var(--cm-text-secondary); }
.dpg-auto { font-size: 10px; line-height: 14px; padding: 0 4px; border-radius: 3px; color: var(--cm-text-secondary); box-shadow: inset 0 0 0 1px var(--cm-border); flex: none; }
.dpg-grid { flex: 1 1 auto; min-height: 140px; overflow: auto; }
.dpg-grid .k-table { width: auto; min-width: 100%; }
.dpg-grid .k-table th { vertical-align: top; padding-top: 4px; padding-bottom: 4px; height: auto; }
.dpg-grid .k-table td { height: 26px; }
/* The sample rows are read-only: no hover, so they do not look clickable */
.dpg-grid .k-table tr:hover td:not(.dpg-derived) { background: none; }
.dpg-grid .k-table tr:hover td[data-frozen] { background: var(--cm-bg); } /* the frozen key column stays opaque under a hovered row */
.dpg-grid td.dpg-derived, .dpg-grid th.dpg-derived { background: var(--cm-bg-secondary); color: var(--cm-text-secondary); }
.dpg-cn { display: flex; align-items: center; gap: 6px; }
.dpg-glyph { display: inline-flex; align-items: center; border-radius: 3px; padding: 0 2px; }
.dpg-glyph[role=link] { cursor: pointer; }
.dpg-glyph[role=link]:hover, .dpg-glyph[role=link]:focus-visible { background: var(--cm-bg-hover); }
.dpg-role { display: inline-flex; align-items: center; gap: 2px; margin-top: 4px; cursor: pointer; border-radius: 5px; font-weight: 450; }
.dpg-role:focus-visible { outline: 2px solid var(--cm-border-selected-strong); outline-offset: 1px; }
.dpg-role[data-set] .k-badge { color: var(--cm-text-brand); outline-color: var(--cm-border-selected); }
.dpg-role[aria-disabled="true"] { cursor: default; }
.dpg-comb { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 4px; font-weight: 450; color: var(--cm-text-secondary); font-size: 11px; }
.dpg-comb .k-field { height: 20px; min-width: 0; font-size: 11px; }
.dpg-miss { box-shadow: inset 0 0 0 1px var(--cm-bg-warning), inset 3px 0 0 var(--cm-bg-warning); }
.dpg-miss .k-warn-glyph { margin-inline-start: 6px; vertical-align: middle; }
.dpg-miss-w { margin-inline-start: 4px; color: var(--cm-text-secondary); font-family: var(--cm-font-family, inherit); white-space: nowrap; }
.dpg-filter { flex: none; display: flex; align-items: center; gap: 8px; padding: 6px 16px; background: var(--cm-bg-selected-secondary); border-bottom: 1px solid var(--cm-border); }
.dpg-pre { margin: 12px 16px; padding: 8px 12px; border-radius: 6px; background: var(--cm-bg-secondary); font: 12px/18px var(--cm-font-family-mono, ui-monospace, monospace); white-space: pre; overflow: auto; }
.dpg-grid .ab-empty { padding: 12px 16px; }
.dpg-report { flex: none; max-height: 38%; overflow: auto; border-top: 1px solid var(--cm-border); padding: 6px 16px 10px; }
.dpg-report h3 { margin: 0 0 4px; font: inherit; font-weight: 550; display: flex; align-items: center; gap: 8px; height: 24px; }
.dpg-rl { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-height: 24px; line-height: 18px; }
.dpg-rl > .k-warn-glyph { flex: none; }
.dpg-rl .k-seg { vertical-align: middle; margin: 0 4px; box-shadow: inset 0 0 0 1px var(--cm-border); border-radius: 6px; padding: 1px; }
.dpg-rt { min-width: 0; }
.dpg-rl-res { font-weight: 550; }
.dpg-foot { grid-column: 1 / -1; grid-row: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; padding: 8px 16px; border-top: 1px solid var(--cm-border); background: var(--cm-bg); }
.dpg-foot .dpg-btns { display: flex; gap: 8px; margin-inline-start: auto; }
.dpg-reason { display: flex; gap: 6px; align-items: flex-start; flex: 1 1 260px; min-width: 0; color: var(--cm-text-secondary); line-height: 16px; }
.dpg-reason .k-warn-glyph { margin-top: 1px; }
.dpg-lost { display: grid; gap: 2px; }
.dpg-lost b { color: var(--cm-text); font-weight: 550; }
.dpg-pop .ab-fctl > .dpg-ctl { display: flex; width: 100%; }
.dpg-pop .ab-fctl > .dpg-ctl > .k-field { flex: 1 1 auto; min-width: 0; max-width: none; }
.dpg-pop .ab-fctl > .k-field { width: 100%; box-sizing: border-box; max-width: none; }
.dpg-out td { color: var(--cm-text-secondary); }
.dpg-seg-off { opacity: 0.45; cursor: default; }
.dpg[data-json] { grid-template-columns: 300px minmax(0, 1fr); }
@media (max-width: 1180px) { .dpg { grid-template-columns: 208px minmax(0, 1fr); } .dpg[data-json] { grid-template-columns: 264px minmax(0, 1fr); } .dpg-ctl input.k-field { min-width: 200px; } }
`;
    if (!document.getElementById("dpg-style")) document.head.append(h("style", { id: "dpg-style" }, css));

    const AB = window.AB;
    const DE = () => AB.fx.datasets.doorEntries;
    const T = () => AB.fx.datasets.transactions;
    const TA = () => AB.fx.datasets.transactionsApril;
    const L = () => AB.fx.datasets.lesmis;
    const C = () => AB.fx.datasets.citations;
    const n = (x) => Number(x).toLocaleString("en-US");

    // ---------- words ----------
    const KIND_ICON = { node: "circle-dot", edge: "spline", file: "network", text: "file", json: "file" };
    const KIND_WORD = { node: "node table: each row is a node", edge: "edge table: each row is an edge", file: "graph file", text: "not read yet", json: "JSON document" };
    const ROLE_WORD = { key: "Key", from: "From", to: "To", links: "Links to", type: "Subtype", name: "Name", time: "Time", weight: "Weight", edgeId: "Edge id", x: "Position x", y: "Position y", z: "Position z", attr: "Attribute" };
    const ROLE_TIP = {
        key: "names each node; links match on it", from: "each row's edge starts at the node this value names", to: "each row's edge ends at the node this value names",
        links: "this row's node has an edge to the node this value names", type: "a subtype of this table's nodes, for the legend and groups; never part of a node's identity", name: "the readable name of each row; several Name columns join with a space, in column order",
        time: "when each row happened", weight: "set when loaded -- every run uses it unless the run picks another", edgeId: "names each edge",
        x: "places each node", y: "places each node", z: "places each node", attr: "kept as data, with no role",
    };
    // Name is not unique: each column given Name joins it (given + family), in column order
    const UNIQUE = new Set(["key", "from", "to", "type", "time", "edgeId", "x", "y", "z"]);
    const COMBINE = {
        num: [["Sum", "The default"], ["Mean"], ["Min"], ["Max"], ["Leave out", "The column is not kept on the edge"]],
        time: [["Earliest and latest", "Two columns, the default"], ["Earliest"], ["Latest"], ["Leave out", "The column is not kept on the edge"]],
        // Never First: file order is unreliable, as for Time. Most common needs a new graph-format reducer ("mode")
        cat: [["Most common", "The value most of the pair's rows hold; ties go to the earliest row"], ["Leave out", "The column is not kept on the edge"]],
    };
    // The attributes with an inspector state of their own, by project, that a header glyph opens while editing a loaded source
    const GLYPH_GO = { doorEntries: { floors: "node-weight", person_id: "link-key", count: "edge-weight" }, transactions: { id: "attribute-name-role", amount: "attribute" } };
    const TYPE_WORD = { cat: "Category", num: "Number", time: "Time", bool: "Category (true or false)", list: "A list (an array)", whole: "One value (a sub-object kept whole)" };
    // An array (or an object keyed by ids) inside a record becomes one of four things (spec 11.4)
    const ARR_WORD = { one: "One value", values: "Several values", edges: "Several edges", rows: "Several rows" };
    const ARR_TIP = { one: "the array kept as one value", values: "a list: a filter step matches when any item does", edges: "each item is an edge to the node it names", rows: "a child table, one row per item, under its parent" };
    // The first lines of a document, as the preview reads it
    const PREVIEW = new WeakMap();
    function previewText(doc) {
        if (!PREVIEW.has(doc)) PREVIEW.set(doc, JSON.stringify(doc, null, 2).split("\n").slice(0, 40).join("\n") + "\n...");
        return PREVIEW.get(doc);
    }
    const FORMATS = [["CSV", ".csv .tsv .tab .edges .edgelist"], ["GraphML", ".graphml .xml"], ["GEXF", ".gexf .xml"], ["GML", ".gml"], ["DOT", ".dot .gv"], ["Pajek NET", ".net .paj"], ["JSON", ".json"]];
    const UNSERVED = { SIF: "No data source reads the Cytoscape simple interaction format", CX2: "No data source reads the Cytoscape Exchange format" };
    const IDS = [["1 and \"1\" are one node", "A number and the same number written as text match"], ["1 and \"1\" are two nodes", "Kept apart, as the file wrote them"]];
    const STOPS = ["After 10 errors", "After 100 errors", "After 1,000 errors", "Never: read every record"];
    const MEANS = [["stronger", "Stronger", "A bigger value is a closer tie: a path through it counts as shorter"], ["farther", "Farther", "A bigger value is a longer distance: a path through it counts as longer"], ["capacity", "Capacity", "A bigger value carries more: flow runs read it as a limit"]];
    const NEEDS = "The multi-table load (types, links on any unique column, rows as nodes, One edge per Pair with Combine, the match report object, key suggestions, which table each record came from, the weight per table and its meaning) is not in graphty-element yet; this page is drawn in full";
    const ALERTS_URL = "https://alerts.bank.example/structuring/2026-03.json";
    const PASTED_XML = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<graph defaultedgetype=\"undirected\">", "  <node id=\"0\" label=\"Myriel\"/>", "  <node id=\"1\" label=\"Napoleon\"/>", "  <node id=\"2\" label=\"Mlle.Baptistine\"/>", "  <edge source=\"1\" target=\"0\" value=\"1\"/>", "  <edge source=\"2\" target=\"0\" value=\"8\"/>", "</graph>"].join("\n");
    const PASTED_PROSE = "Myriel meets Napoleon in chapter 1\nMlle.Baptistine lives with Myriel\nMme.Magloire keeps house for Myriel";

    // ---------- tables from the fixtures ----------
    function mk(o) {
        return Object.assign({ kind: "node", per: "row", roles: {}, combine: {}, types: {}, unique: [], sample: [], format: "CSV", sep: "Comma", auto: { format: true, sep: true } }, o);
    }
    const role = (r, target, by, extra) => Object.assign({ r, target, by }, extra || {});
    function doorTables() {
        const d = DE(), src = (name) => d.tables.find((t) => t.name === name);
        const t = (name, o) => mk(Object.assign({ id: name, file: src(name).file, name, rows: src(name).rows, cols: src(name).columns.slice(), sample: src(name).sample }, o));
        return [
            t("people", { type: "person", types: { id: "cat", name: "cat", dept: "cat", badge: "cat" }, unique: ["id", "badge"], roles: { id: role("key"), name: role("name") } }),
            t("buildings", { type: "building", types: { bldg: "cat", site: "cat", floors: "num" }, unique: ["bldg"], roles: { bldg: role("key"), site: role("name"), floors: role("weight") } }),
            t("entries", { kind: "edge", typeName: "entry", types: { person_id: "num", building_id: "cat", time: "time" }, roles: { person_id: role("from", "person", "id"), building_id: role("to", "building", "bldg"), time: role("time") } }),
        ];
    }
    const ACC_COLS = ["id", "kind", "country", "riskScore", "flagged", "alertRule", "alertTime"];
    const ACC_TYPES = { id: "cat", kind: "cat", country: "cat", riskScore: "num", flagged: "bool", alertRule: "cat", alertTime: "time" };
    function accountsTable(o) {
        const t = T();
        const sample = t.rows.slice(0, 4).map((r) => ({ id: r.id, kind: r.kind, country: r.country, riskScore: String(r.riskScore), flagged: String(r.flagged), alertRule: "", alertTime: "" }))
            .concat(t.flaggedAccounts.slice(0, 4).map((r) => ({ id: r.id, kind: r.kind, country: r.country, riskScore: String(r.riskScore), flagged: String(r.flagged), alertRule: r.alertRule, alertTime: r.alertTime })));
        return mk(Object.assign({ id: "accounts", file: t.accountsFile, name: "accounts", rows: t.nodes, cols: ACC_COLS.slice(), sample, type: "account", types: Object.assign({}, ACC_TYPES), unique: ["id"], roles: { id: role("key") } }, o));
    }
    function transfersTable(o) {
        const t = T();
        return mk(Object.assign({ id: "transfers", file: t.file, name: "transfers", rows: t.edges, cols: t.columns.slice(), sample: t.firstRows.slice(0, 8), kind: "edge", typeName: "transfer",
            types: { from_account: "cat", to_account: "cat", amount: "num", timestamp: "time" },
            roles: { from_account: role("from", "account", "id"), to_account: role("to", "account", "id"), amount: role("weight"), timestamp: role("time") } }, o));
    }
    function lesmisFile() {
        const l = L();
        const nodes = mk({ id: "lm-nodes", parent: "lm", name: "nodes", file: "miserables.gexf", rows: l.nodes, cols: ["id", "label", "group"], format: "GEXF", locked: true,
            sample: l.rows.slice(0, 8).map((r) => ({ id: r.id, label: r.label, group: String(r.group) })), type: "node", types: { id: "cat", label: "cat", group: "cat" }, unique: ["id"],
            roles: { id: role("key", null, null, { locked: true }), label: role("name", null, null, { auto: true }) } });
        // The first eight edges of the published graph (Knuth 1993), all at Myriel
        const E = [["1", "0", "1"], ["2", "0", "8"], ["3", "0", "10"], ["3", "2", "6"], ["4", "0", "1"], ["5", "0", "1"], ["6", "0", "1"], ["7", "0", "1"]];
        const edges = mk({ id: "lm-edges", parent: "lm", name: "edges", file: "miserables.gexf", rows: l.edges, cols: ["source", "target", "value"], kind: "edge", format: "GEXF", locked: true,
            sample: E.map(([s, t, v]) => ({ source: s, target: t, value: v })), types: { source: "cat", target: "cat", value: "num" },
            roles: { source: role("from", "node", "id", { locked: true }), target: role("to", "node", "id", { locked: true }) } });
        return [mk({ id: "lm", group: true, name: "miserables.gexf", file: "miserables.gexf", kind: "file", format: "GEXF", rows: null, open: true }), nodes, edges];
    }
    // Plain node-link JSON: a graph file graph-io recognizes, read in one step like the GEXF
    // The same coauthors graph in the three graph dialects graph-io reads in one step: node-link (nodes
    // and links), Graphology's export (key and attributes) and JGF (nodes keyed by id, metadata)
    const DIALECTS = {
        "node-link": { file: null, key: "id", name: "name", w: "weight", edgesName: "links", node: (r) => r, edge: (l) => l, how: "Node-link JSON: graph-io recognized its nodes and links" },
        graphology: { file: "coauthors.graphology.json", key: "key", name: "attributes.name", w: "attributes.weight", edgesName: "edges",
            node: (r) => ({ key: r.id, "attributes.name": r.name, "attributes.field": r.field, "attributes.h_index": r.h_index }), edge: (l) => ({ source: l.source, target: l.target, "attributes.weight": l.weight }),
            how: "Graphology JSON: graph-io recognized its nodes, edges and options.type" },
        jgf: { file: "coauthors.jgf.json", key: "id", name: "label", w: "metadata.weight", edgesName: "edges",
            node: (r) => ({ id: r.id, label: r.name, "metadata.field": r.field, "metadata.h_index": r.h_index }), edge: (l) => ({ source: l.source, target: l.target, "metadata.weight": l.weight }),
            how: "JSON Graph Format (JGF): graph-io recognized graph.nodes, keyed by id, and graph.edges" },
    };
    function plainJsonFile(dialect) {
        const P = AB.fx.datasets.plainJson, X = DIALECTS[dialect || "node-link"], dl = { graphology: "Graphology", jgf: "JGF" }[dialect] || "node-link", file = X.file || P.baseFile || P.file;
        const keys = (rows) => [...new Set(rows.flatMap((r) => Object.keys(r)))];
        const ty = (rows, k) => (rows.every((r) => r[k] == null || typeof r[k] === "number") ? "num" : "cat");
        const flat = (rows, cols) => rows.slice(0, 8).map((r) => Object.fromEntries(cols.map((c) => [c, r[c] == null ? "" : String(r[c])])));
        const dn = P.document.nodes.map(X.node), de = P.document.links.map(X.edge);
        const nc = keys(dn), ec = keys(de);
        const nodes = mk({ id: "pj-nodes", parent: "pj", name: "nodes", file, rows: P.nodes, cols: nc, format: "JSON", dialect: dl, locked: true, sample: flat(dn, nc), type: "node",
            types: Object.fromEntries(nc.map((c) => [c, ty(dn, c)])), unique: [X.key], roles: { [X.key]: role("key", null, null, { locked: true }), [X.name]: role("name", null, null, { locked: true }) } });
        const edges = mk({ id: "pj-edges", parent: "pj", name: X.edgesName, file, rows: P.edges, cols: ec, kind: "edge", format: "JSON", dialect: dl, locked: true, sample: flat(de, ec),
            types: Object.fromEntries(ec.map((c) => [c, ty(de, c)])), roles: { source: role("from", "node", X.key, { locked: true }), target: role("to", "node", X.key, { locked: true }), [X.w]: role("weight", null, null, { auto: "graph-io proposes a numeric column named weight as the load-time weight" }) } });
        return [mk({ id: "pj", group: true, name: file, file, kind: "file", format: "JSON", dialect: dl, rows: null, open: true, summary: P.graphName + ": " + P.nodes + " nodes, " + P.edges + " edges",
            auto: { format: X.how } }), nodes, edges];
    }

    // Plain graph JSON opening: one row in Tables (the file, closed), every check green, focus on Load
    function oneStep(dialect) { const tb = plainJsonFile(dialect); tb[0].open = false; return tb; }

    // ---------- wide data: the IT estate (hosts 69 columns, connections 26) ----------
    const W = () => AB.fx.datasets.wide;
    const KIND_T = { integer: "num", number: "num", datetime: "time", date: "time", boolean: "bool" };
    function wideTables() {
        const w = W();
        const types = (attrs) => Object.fromEntries(attrs.map((a) => [a.name, KIND_T[a.kind] || "cat"]));
        const sample = (rows, attrs) => rows.slice(0, 8).map((r) => Object.fromEntries(attrs.map((a) => [a.name, r[a.name] == null ? "" : Array.isArray(r[a.name]) ? r[a.name].join(", ") : String(r[a.name])])));
        return [
            // unique: graphty-element's preview lists the unique columns; these four are the hosts' (the timestamps that happen to be unique are not offered as keys)
            mk({ id: "hosts", file: w.file, name: "hosts", rows: w.nodes, cols: w.nodeAttributes.map((a) => a.name), sample: sample(w.nodeRows, w.nodeAttributes), type: "host",
                types: types(w.nodeAttributes), unique: ["id", "hostname", "fqdn", "mac_address"], roles: { id: role("key", null, null, { auto: true }), hostname: role("name") } }),
            mk({ id: "connections", file: w.edgesFile, name: "connections", kind: "edge", typeName: "connection", rows: w.edges, cols: w.edgeAttributes.map((a) => a.name), sample: sample(w.edgeRows, w.edgeAttributes),
                types: types(w.edgeAttributes), roles: { id: role("edgeId"), source: role("from", "host", "id"), target: role("to", "host", "id"), bytes_total_24h: role("weight") } }),
        ];
    }

    // ---------- nested JSON (spec 11.4): a document is a source of tables ----------
    // The tree holds the document's objects and arrays only. An array of records is a table row (ticked
    // when graphty-element proposes it); every other object or array is a structure row (`struct`).
    // Counts come from the fixture's path summary, which stands in for graph-io's document outline.
    const NX = () => AB.fx.datasets.nested;
    const get = (rec, rel) => rel.split(".").reduce((o, k) => (o == null ? o : o[k]), rec);
    // The columns of an array of records: every leaf at any depth by its full path, arrays as one column each
    function recCols(arr) {
        const pre = arr + "[].", kinds = {};
        NX().paths.forEach((p) => { if (p.path.startsWith(pre)) kinds[p.path.slice(pre.length)] = p; });
        const cols = [], types = {}, arrs = {};
        Object.keys(kinds).forEach((rel) => {
            if (rel.includes("[]")) return;
            const k = Object.keys(kinds[rel].kinds).filter((x) => x !== "null")[0];
            if (k === "object") return;
            cols.push(rel);
            if (k === "array") {
                const it = kinds[rel + "[]"], rec = !!(it && it.kinds.object);
                types[rel] = "list";
                arrs[rel] = { items: rec ? "records" : "values", pick: rec ? "one" : "values", n: it ? it.count : 0 };
            } else types[rel] = k === "number" ? "num" : k === "boolean" ? "bool" : "cat";
        });
        return { cols, types, arrs };
    }
    // The figures graphty-element's preview reports for the sample (checked against the fixture)
    const NREP = { coauthorItems: 514, coauthorBoth: 4, coauthorPairs: 510, affiliations: 242, affTwoPlus: 45, addrTwoPlus: 59, linksToResearcher: 118, linksToInstitution: 42 };
    function nestedTables(o) {
        o = o || {};
        const D = NX(), doc = D.document;
        const file = o.file || D.file;
        const out = [mk({ id: "doc", group: true, kind: "json", name: file, file, format: "JSON", rows: null, open: true, json: true, auto: { format: true }, preview: o.preview })];
        const RA = D.recordArrays;
        const TABLE = {
            "data.researchers": { id: "researchers", type: "researcher", recs: doc.data.researchers },
            "data.institutions": { id: "institutions", type: "institution", recs: doc.data.institutions },
            links: { id: "links", kind: "edge", typeName: "link", recs: doc.links },
        };
        const keyCount = (p) => D.paths.filter((q) => q.path.startsWith(p + ".") && !q.path.slice(p.length + 1).includes(".") && !q.path.slice(p.length + 1).includes("[")).length;
        D.paths.forEach((p) => {
            if (p.path.includes("[]")) return;
            const k = Object.keys(p.kinds)[0];
            if (k !== "object" && k !== "array") return;
            if (o.only && !(p.path === o.only || p.path.startsWith(o.only + "."))) return;
            const segs = p.path.split(".");
            const parentPath = segs.slice(0, -1).join(".");
            const parent = parentPath && parentPath !== o.only ? parentPath : "doc";
            const path = o.only ? p.path.slice(o.only.length + 1) : p.path;
            if (o.only && p.path === o.only) return;
            const T0 = TABLE[p.path];
            if (k === "array" && RA[p.path + "[]"] && T0) {
                const c = recCols(p.path);
                const base = { id: T0.id, parent, path, json: true, tick: true, name: segs[segs.length - 1], file, format: "JSON", rows: RA[p.path + "[]"], cols: c.cols, types: c.types, arrs: c.arrs, sample: T0.recs.slice(0, 8), unique: ["id"], keep: [] };
                if (T0.kind === "edge") out.push(mk(Object.assign(base, { kind: "edge", typeName: T0.typeName, roles: { id: role("edgeId"), source: role("from", "researcher", "id"), target: role("to", null, "id", { any: ["researcher", "institution"] }), weight: role("weight", null, null, { auto: true }) } })));
                // graphty-element proposes the Name from name-like columns (attributes.name, or its given and family parts)
                else {
                    out.push(mk(Object.assign(base, { type: T0.type, open: true, roles: Object.assign({ id: role("key", null, null, { auto: true }) }, Object.fromEntries(c.cols.filter((x) => /(^|\.)name(\.(given|family))?$/.test(x) && c.types[x] === "cat").map((x) => [x, role("name", null, null, { auto: true })]))) })));
                    // the arrays of records inside each record show in the tree, with no tick: what they become is chosen in their column's role menu
                    Object.keys(c.arrs).filter((x) => c.arrs[x].items === "records").forEach((x) => out.push(mk({ id: "s:" + T0.id + "." + x, parent: T0.id, struct: "array", inRec: x, path: p.path + "[]." + x, name: x.split(".").pop(), count: c.arrs[x].n })));
                }
                return;
            }
            const values = k === "array" ? (D.paths.find((q) => q.path === p.path + "[]") || {}).count : null;
            out.push(mk({ id: "s:" + p.path, parent: parent === "doc" ? "doc" : "s:" + parentPath, struct: k, path, name: segs[segs.length - 1], count: k === "array" ? values : keyCount(p.path), open: p.path === "data", unread: p.path === "meta" || p.path.startsWith("meta.") }));
        });
        // tables hang under the structure row of their parent path
        out.forEach((t) => { if (t.json && !t.group && t.parent !== "doc") t.parent = "s:" + t.parent; });
        return out;
    }
    // affiliations as Several rows: a child table under researchers, its first column the parent, locked
    function affiliationsTable() {
        const R = NX().document.data.researchers;
        const sample = R.flatMap((r) => r.attributes.affiliations.map((a) => ({ "parent": r.id, institution_id: a.institution_id, role: a.role, since: a.since, current: String(a.current) }))).slice(0, 8);
        return mk({ id: "affiliations", parent: "researchers", childOf: "researchers", childCol: "attributes.affiliations", path: "data.researchers[].attributes.affiliations", name: "affiliations", kind: "edge", typeName: "affiliation",
            file: NX().file, format: "JSON", rows: NREP.affiliations, cols: ["parent", "institution_id", "role", "since", "current"], sample,
            types: { "parent": "cat", institution_id: "cat", role: "cat", since: "cat", current: "bool" },
            roles: { "parent": role("from", "researcher", "id", { locked: true, parentCol: true }), institution_id: role("to", "institution", "id") } });
    }
    // Any other array of records as Several rows (addresses): a child node table, one row per item, its
    // first column the parent researcher (locked, Links to), its columns the items' leaves
    function childRows(t, c) {
        if (c === "attributes.affiliations") return affiliationsTable();
        const tp = t.path, pre = tp + "[]." + c + "[].", name = c.split(".").pop();
        const cols = NX().paths.filter((p) => p.path.startsWith(pre) && !p.path.slice(pre.length).includes("[") && !p.kinds.object && !p.kinds.array).map((p) => p.path.slice(pre.length));
        const recs = get(NX().document, tp).flatMap((r) => (get(r, c) || []).map((it) => Object.assign({ "parent": r.id }, Object.fromEntries(cols.map((k) => [k, get(it, k)])))));
        return mk({ id: name, parent: t.id, childOf: t.id, childCol: c, path: tp + "[]." + c, name, type: /sses$/.test(name) ? name.slice(0, -2) : name.replace(/s$/, ""), file: NX().file, format: "JSON", rows: recs.length,
            cols: ["parent"].concat(cols), sample: recs.slice(0, 8), types: Object.fromEntries([["parent", "cat"]].concat(cols.map((k) => [k, typeof recs[0][k] === "number" ? "num" : "cat"]))),
            roles: { "parent": role("links", t.type, "id", { locked: true, parentCol: true }) } });
    }
    function nested(o) {
        const m = base(Object.assign({ door: { title: "Open as a new graph", done: ["graph-place", "nested"] }, tables: nestedTables(), sel: "doc", direction: "undirected", json: "nested", coPer: "pair" }, o));
        // graphty-element proposes an array of ids that match a proposed node table's keys as Several
        // edges (element-requirements section 8); the loaded defaults are AB.NESTED_LOADED in lib.js
        if (!o || !o.tables) coauthorEdges(m);
        return m;
    }
    const R0 = (m) => table(m, "researchers");
    // A one-value column of researchers the reader set to Links to (advisor_id): one edge per value that
    // matches the target type's Key. { col, name, target, n, of } for each; n counted from the sample document
    function idLinks(m) {
        const r = R0(m);
        if (!r || r.tick === false) return [];
        const doc = NX().document, keys = { researcher: doc.data.researchers, institution: doc.data.institutions };
        return r.cols.filter((c) => !r.arrs[c] && (r.roles[c] || {}).r === "links").map((c) => {
            const target = r.roles[c].target, ids = new Set((keys[target] || []).map((x) => x.id));
            const vals = doc.data.researchers.map((x) => get(x, c)).filter((v) => v != null);
            return { col: c, name: c.split(".").pop().replace(/_ids?$/, ""), target, n: vals.filter((v) => ids.has(v)).length, of: vals.length };
        });
    }
    // What Load leaves for the nested project (read by AB.nestedLoaded() in lib.js, and so by the Data
    // place, the field lists, the graph inspector and the canvas): the reader's choices, not a fixed state
    function nestedChoices(m) {
        const r = R0(m), on = (id) => { const x = table(m, id); return !!x && x.tick !== false && !x.gone; };
        const pick = (c) => (r.arrs[c] || {}).pick;
        return { researchers: on("researchers"), institutions: on("institutions"), links: on("links"), name: { researcher: nameColsOf(r), institution: nameColsOf(table(m, "institutions")) }, co: pick("relationships.coauthor_ids"), coPer: m.coPer,
            aff: pick("attributes.affiliations"), addr: pick("attributes.profile.contact.addresses"), keep: (r.keep || []).slice(), direction: m.direction,
            linkTo: (((table(m, "links") || { roles: {} }).roles.target || {}).any || []).filter((x) => x !== "institution" || on("institutions")), idLinks: idLinks(m).map(({ col, name, target, n }) => ({ col, name, target, n })), weight: colWith(table(m, "links") || { roles: {} }, "weight") || null };
    }
    function coauthorEdges(m) { const r = R0(m); r.arrs["relationships.coauthor_ids"].pick = "edges"; r.roles["relationships.coauthor_ids"] = role("links", "researcher", "id", { each: true }); return m; }
    // A child table takes the tree place of its array's own row (hidden once it has one), so the tree keeps document order
    function insertChild(m, t, child) { const at = m.tables.findIndex((x) => x.id === "s:" + t.id + "." + child.childCol); m.tables.splice(at >= 0 ? at : m.tables.indexOf(t) + 1, 0, child); }
    function affiliationRows(m) { const r = R0(m); r.arrs["attributes.affiliations"].pick = "rows"; r.open = true; insertChild(m, r, affiliationsTable()); return m; }

    // ---------- a second domain: a package registry (built here; spec 11.4, other shapes) ----------
    // Records keyed by package name (the JGF way), dependencies as an object keyed by package name,
    // maintainers as an array of records. Eight packages of the registry's 1,204 are the sample.
    const REGISTRY = {
        file: "registry-2026-03.json", packages: 1204, dependencyKeys: 2871, downloadLog: 31, installedTogether: 3418,
        // An array of records whose two fields name packages, with a numeric weight (the share of installs
        // that hold both): graphty-element proposes it as an edge table and graph-io proposes weight as its Weight
        together: [["react", "react-dom", 0.97], ["react-dom", "scheduler", 0.95], ["react", "loose-envify", 0.91], ["loose-envify", "js-tokens", 0.88], ["debug", "ms", 0.93], ["react", "scheduler", 0.81], ["chalk", "debug", 0.22], ["ms", "chalk", 0.12]],
        sample: {
            react: { latest: "18.3.1", license: "MIT", description: "React is a JavaScript library for building user interfaces.", repository: { type: "git", url: "github.com/facebook/react" }, dependencies: { "loose-envify": "^1.1.0" }, maintainers: [{ name: "react-bot", role: "publisher" }, { name: "gnoff", role: "owner" }] },
            "react-dom": { latest: "18.3.1", license: "MIT", description: "React package for working with the DOM.", repository: { type: "git", url: "github.com/facebook/react" }, dependencies: { "loose-envify": "^1.1.0", scheduler: "^0.23.2" }, maintainers: [{ name: "react-bot", role: "publisher" }, { name: "gnoff", role: "owner" }] },
            scheduler: { latest: "0.23.2", license: "MIT", description: "Cooperative scheduler for the browser environment.", repository: { type: "git", url: "github.com/facebook/react" }, dependencies: { "loose-envify": "^1.1.0" }, maintainers: [{ name: "react-bot", role: "publisher" }] },
            "loose-envify": { latest: "1.4.0", license: "MIT", description: "Fast (and loose) selective process.env replacer.", repository: { type: "git", url: "github.com/zertosh/loose-envify" }, dependencies: { "js-tokens": "^3.0.0 || ^4.0.0" }, maintainers: [{ name: "zertosh", role: "owner" }] },
            "js-tokens": { latest: "4.0.0", license: "MIT", description: "A regex that tokenizes JavaScript.", repository: { type: "git", url: "github.com/lydell/js-tokens" }, dependencies: {}, maintainers: [{ name: "lydell", role: "owner" }] },
            debug: { latest: "4.3.7", license: "MIT", description: "Lightweight debugging utility.", repository: { type: "git", url: "github.com/debug-js/debug" }, dependencies: { ms: "^2.1.3" }, maintainers: [{ name: "qix", role: "owner" }, { name: "tootallnate", role: "publisher" }] },
            ms: { latest: "2.1.3", license: "MIT", description: "Tiny millisecond conversion utility.", repository: { type: "git", url: "github.com/vercel/ms" }, dependencies: {}, maintainers: [{ name: "leo", role: "owner" }] },
            chalk: { latest: "5.3.0", license: "MIT", description: "Terminal string styling done right.", repository: { type: "git", url: "github.com/chalk/chalk" }, dependencies: {}, maintainers: [{ name: "sindresorhus", role: "owner" }, { name: "qix", role: "publisher" }] },
        },
    };
    // The registry's dataset entry: the header, and the project Load makes (canvas, Graph and Data places)
    function registryDataset() {
        const X = AB.fx.datasets;
        if (!X.registry) X.registry = { title: "Package registry, March 2026", graphName: "Packages", file: REGISTRY.file, nodes: REGISTRY.packages, edges: REGISTRY.dependencyKeys + REGISTRY.installedTogether, directed: true, frame: { project: "Package registry, March 2026", graphRow: "Packages" } };
        return "registry";
    }
    AB.registryDataset = registryDataset;
    function registryTables() {
        const R = REGISTRY;
        const recs = Object.entries(R.sample).map(([k, v]) => Object.assign({ key: k }, v));
        const cols = ["key", "latest", "license", "description", "repository.type", "repository.url", "dependencies", "maintainers"];
        return [
            mk({ id: "doc", group: true, kind: "json", name: R.file, file: R.file, format: "JSON", rows: null, open: true, json: true, auto: { format: true }, preview: { packages: Object.fromEntries(Object.entries(R.sample).slice(0, 2)), download_log: "[31 records]" } }),
            mk({ id: "packages", parent: "doc", path: "packages", keyed: true, json: true, tick: true, name: "packages", file: R.file, format: "JSON", rows: R.packages, cols, sample: recs, type: "package", unique: ["key"], keep: [],
                types: { key: "cat", latest: "cat", license: "cat", description: "cat", "repository.type": "cat", "repository.url": "cat", dependencies: "list", maintainers: "list" },
                arrs: { dependencies: { items: "object", pick: "edges", n: R.dependencyKeys }, maintainers: { items: "records", pick: "one", n: 0 } },
                roles: { key: role("key", null, null, { auto: true }), dependencies: role("links", "package", "key", { each: true }) } }),
            mk({ id: "installed_together", parent: "doc", path: "installed_together", json: true, tick: true, name: "installed_together", kind: "edge", typeName: "installed together", file: R.file, format: "JSON", rows: R.installedTogether,
                cols: ["package", "with", "weight"], types: { package: "cat", with: "cat", weight: "num" }, unique: [], keep: [], arrs: {}, sample: R.together.map(([a, b, w]) => ({ package: a, with: b, weight: w })),
                roles: { package: role("from", "package", "key"), with: role("to", "package", "key"), weight: role("weight", null, null, { auto: "graph-io proposes a numeric column named weight as the load-time weight" }) } }),
            mk({ id: "download_log", parent: "doc", path: "download_log", json: true, tick: false, name: "download_log", file: R.file, format: "JSON", rows: R.downloadLog, cols: ["date", "total"], types: { date: "time", total: "num" }, unique: ["date"], keep: [], arrs: {}, sample: [], roles: {} }),
        ];
    }

    // ---------- the states ----------
    // door: title, verb, where Load goes; plus the tables, the selected table and what is open
    const NEW = { title: "Open as a new graph", done: ["canvas-and-states", "loading"] };
    const base = (o) => Object.assign({ door: NEW, direction: "directed", filter: null }, o);
    // Load ends on the graph it loaded: the canvas reads the same fixture the page shows
    const NEW_DOOR = Object.assign({}, NEW, { done: ["canvas-and-states", "door-entries-loading"] });
    const NEW_T = Object.assign({}, NEW, { done: ["canvas-and-states", "transfers-loading"] });
    const door = (o) => base(Object.assign({ door: NEW_DOOR, tables: doorTables(), sel: "entries" }, o));
    const transfers = (o) => base(Object.assign({ door: NEW_T, tables: [accountsTable(), transfersTable()], sel: "transfers" }, o));
    const edgeOnly = (o) => base({ door: NEW_T, tables: [transfersTable(Object.assign({ name: "transfers-2026-03", roles: { from_account: role("from", "node", null, { auto: true }), to_account: role("to", "node", null, { auto: true }) } }, o))], sel: "transfers", focusLoad: true });
    // transfers-2026-04.csv: the fixture has its counts and columns, not its rows, so the sample is March's (said in the report)
    const april = (o) => { const ta = TA().files.transfers; return Object.assign({ id: "april", name: "transfers-2026-04", file: ta.file, rows: ta.rows, sampleFrom: T().file }, o); };
    const toNodes = (t, type) => { t.kind = "node"; t.type = type; Object.keys(t.roles).forEach((c) => { if (["from", "to"].includes(t.roles[c].r)) t.roles[c].r = "links"; }); return t; };
    const STATES = {
        entries: () => door(),
        people: () => door({ sel: "people" }),
        buildings: () => door({ sel: "buildings" }),
        "role-menu": () => door({ menu: { col: "person_id", sub: "from" } }),
        "entries-pair": () => { const m = door(); const e = m.tables[2]; e.per = "pair"; e.combine.time = "Earliest and latest"; e.roles.count = role("weight"); return m; },
        "unmatched-rows": () => door({ filter: "missing" }),
        "entries-as-nodes": () => { const m = door(); toNodes(m.tables[2], "entry"); return m; },
        "add-columns": () => {
            const m = door({ door: { title: "Add to " + DE().graphName, done: ["canvas-and-states", "door-entries-loading"] }, sel: "badges" });
            const people = m.tables[0];
            // badges.csv is not in the fixture: the spec's counts, with stand-in columns and rows taken from people.csv
            m.tables.push(mk({ id: "badges", file: "badges.csv", name: "badges", rows: 409, cols: ["person", "access_level", "issued", "photo_on_file"], standIn: true, addsTo: "person",
                types: { person: "cat", access_level: "cat", issued: "time", photo_on_file: "bool" }, unique: ["person"],
                sample: people.sample.filter((r, i) => i !== 5).slice(0, 6).map((r, i) => ({ person: r.id, access_level: ["All buildings", "Research only", "All buildings", "Lab park", "Legal floor", "All buildings"][i], issued: "2025-0" + (i + 3) + "-1" + i + "T09:00:00Z", photo_on_file: i === 3 ? "false" : "true" })),
                roles: { person: role("key", null, null, { auto: true }) } }));
            return m;
        },
        "edge-disabled": () => { const m = door(); const e = toNodes(m.tables[2], "entry"); e.roles.building_id = undefined; delete e.roles.building_id; return m; },
        "file-settings": () => door({ pop: true }),
        "new-type": () => door({ menu: { col: "person_id", sub: "from", newType: true } }),
        transfers: () => transfers(),
        "kind-as-type": () => { const m = transfers({ sel: "accounts" }); m.tables[0].roles.kind = role("type"); return m; },
        // Edit source on a loaded door-entries table: the load as it was (entries per Pair), Apply off until a change
        "edit-entries": () => editDoor("entries"),
        "edit-people": () => editDoor("people"),
        "edit-buildings": () => editDoor("buildings"),
        "weight-moved": () => { const m = transfers(); const t = m.tables[1]; t.per = "pair"; t.combine.amount = "Sum"; t.combine.timestamp = "Earliest and latest"; t.roles.amount = undefined; delete t.roles.amount; t.roles.count = role("weight"); m.moved = ["amount", "count"]; return m; },
        // Replace reads a new file, so its primary is Load (focused: every column matches, so the task is the command, the file and Load)
        replace: () => { const ta = TA().files.transfers; const m = transfers({ door: { title: "Replace: " + T().file, verb: "Load", done: ["data-place", "after-replace"] }, focusLoad: true, replaced: { id: "transfers", file: ta.file, rows: ta.rows, was: T().file } }); m.tables[1].sampleFrom = T().file; return m; },
        // Edit on the loaded transfers, either table selected; Apply returns to the Data place as it was
        "edit-source": () => transfers({ door: { title: "Edit: transfers", verb: "Apply", done: ["data-place", T().fresh ? "empty-filters" : "at-rest"], edit: true } }),
        "edit-accounts": () => transfers({ sel: "accounts", door: { title: "Edit: accounts", verb: "Apply", done: ["data-place", T().fresh ? "empty-filters" : "at-rest"], edit: true } }),
        "edit-source-lost": () => { const a = TA().files.accounts; const m = transfers({ sel: "accounts", door: { title: "Replace: " + T().accountsFile, verb: "Load", done: ["data-place", "after-replace"] }, replaced: { id: "accounts", file: a.file, rows: a.rows, was: T().accountsFile }, lost: true }); m.tables[0].cols = a.columns.slice(); return m; },
        "graph-file": () => base({ tables: lesmisFile(), sel: "lm-nodes", direction: "file", focusLoad: true }),
        // Edit on the loaded Les Miserables file
        "edit-graph-file": () => base({ tables: lesmisFile(), sel: "lm-nodes", direction: "file", door: { title: "Edit: miserables.gexf", verb: "Apply", done: ["data-place", "graph-file"], edit: true } }),
        "edge-list": () => edgeOnly(),
        url: () => urlState(),
        "detect-several": () => base({ tables: [mk({ id: "paste", name: "Pasted text", kind: "text", pasted: PASTED_XML, format: null, candidates: ["GraphML", "GEXF"], rows: null, auto: {} })], sel: "paste", direction: "file" }),
        "detect-none": () => base({ tables: [mk({ id: "paste", name: "Pasted text", kind: "text", pasted: PASTED_PROSE, format: null, candidates: [], rows: null, auto: {} })], sel: "paste", direction: "file" }),
        "unsupported-format": () => base({ tables: [mk({ id: "sif", name: "interactions", file: "interactions.sif", kind: "text", format: "SIF", rows: null, refusal: { terminal: true, text: "SIF: " + UNSERVED.SIF + ".", todo: "Save it from Cytoscape as GraphML or as a CSV edge list, and open that." } })], sel: "sif" }),
        // A file dropped while a project is open opens as a new graph: no "this graph or a new one?" question
        "load-into": () => Object.assign(edgeOnly(april()), { sel: "april" }),
        // A table added to the March transfers whose columns match a loaded source: a warning that offers Replace
        "add-matching": () => { const m = transfers({ door: { title: "Add to " + T().graphName, done: ["canvas-and-states", "transfers-loading"] }, sel: "april" }); m.tables.push(transfersTable(april({ matches: "transfers" }))); return m; },
        "one-at-a-time": () => {
            const ta = TA().files.transfers;
            const m = edgeOnly();
            m.tables[0].reading = true;
            m.tables.push(transfersTable({ id: "april", name: "transfers-2026-04", file: ta.file, rows: null, cols: [], sample: [], roles: {}, refusal: { busy: true, text: ta.file + " was not loaded: " + T().file + " is still reading.", todo: "Add it again when the reading ends." } }));
            m.sel = "april";
            m.focusLoad = false;
            return m;
        },
        "refused-empty": () => base({ tables: [mk({ id: "empty", name: "Untitled", file: "Untitled.csv", kind: "edge", cols: T().columns.slice(), rows: 0, refusal: { terminal: true, text: "Untitled.csv has a header row and nothing under it, so it holds no nodes and no edges.", todo: "Choose another file." } })], sel: "empty" }),
        "refused-parse": () => Object.assign(edgeOnly({ refusal: { setting: true, text: "Lines 2 and 5 have 5 columns where the header has 4: an amount holds a comma.", todo: "Quote the amounts in the file, or choose Semicolon in File settings if the file uses it.", settings: true } }), { focusLoad: false }),
        "refused-endpoints": () => { const m = edgeOnly({ roles: {} }); m.focusLoad = false; return m; },
        "refused-fetch": () => urlState(true),
        "refused-too-large": () => base({ tables: [mk({ id: "big", name: "patent-citations-sample", file: C().file, kind: "edge", cols: C().columns.slice(), rows: C().edges, sample: [], refusal: { terminal: true, text: n(C().nodes) + " nodes and " + n(C().edges) + " edges: a graph draws up to " + n(C().drawingLimit) + " nodes.", todo: "Choose another file, or a part of this one under the limit." } })], sel: "big" }),
        // Missing or duplicate ids in a graph file: the file sets its ids, so no setting here fixes it
        "refused-ids": () => base({ tables: [mk({ id: "ids", name: "miserables-edited", file: "miserables-edited.graphml", format: "GraphML", kind: "edge", cols: [], rows: null,
            refusal: { terminal: true, stand: true, text: "miserables-edited.graphml has two nodes with the id 11 (lines 48 and 212), and 3 edges end at node 80, which no node has (lines 590, 611 and 640).", todo: "A graph file sets its own ids: make each node id unique and give every edge's ends a node, or choose another file." } })], sel: "ids", direction: "file" }),
        // A large file reading: graph-io counts the rows as it reads (half of transfers-2026-03.csv's 9,113)
        reading: () => { const m = edgeOnly(); m.tables[0].reading = true; m.tables[0].readRows = Math.floor(T().edges / 2); m.focusLoad = false; return m; },
        // Regression (d): person_id linked to person by badge, not by its Key
        "link-by-badge": () => { const m = door(); m.tables[2].roles.person_id.by = "badge"; return m; },
        // ----- wide data: 69 and 26 columns -----
        "wide-hosts": () => base({ door: { title: "Open as a new graph", done: ["graph-place", "wide"] }, tables: wideTables(), sel: "hosts" }),
        "wide-find-column": () => base({ door: { title: "Open as a new graph", done: ["graph-place", "wide"] }, tables: wideTables(), sel: "hosts", goto: "vu cr" }),
        "wide-link-menu": () => base({ door: { title: "Open as a new graph", done: ["graph-place", "wide"] }, tables: wideTables(), sel: "connections", menu: { col: "source", sub: "from" } }),
        // ----- nested JSON -----
        "json-plain": () => base({ door: { title: "Open as a new graph", done: ["graph-place", "plain-json"] }, tables: oneStep(), pj: "node-link", sel: "pj-nodes", direction: "file", focusLoad: true }),
        "json-graphology": () => base({ door: { title: "Open as a new graph", done: ["graph-place", "plain-json"] }, tables: oneStep("graphology"), pj: "graphology", sel: "pj-nodes", direction: "file", focusLoad: true }),
        "json-jgf": () => base({ door: { title: "Open as a new graph", done: ["graph-place", "plain-json"] }, tables: oneStep("jgf"), pj: "jgf", sel: "pj-nodes", direction: "file", focusLoad: true }),
        // Edit source from the loaded projects' Sources rows: the clicked table selected, Apply back to the Data place
        "edit-wide-hosts": () => base({ door: { title: "Edit: " + W().file, verb: "Apply", done: ["data-place", "attributes-wide"], edit: true }, tables: wideTables(), sel: "hosts" }),
        "edit-wide-connections": () => base({ door: { title: "Edit: " + W().edgesFile, verb: "Apply", done: ["data-place", "attributes-wide"], edit: true }, tables: wideTables(), sel: "connections" }),
        "edit-plain-nodes": () => base({ door: { title: "Edit: " + AB.fx.datasets.plainJson.file, verb: "Apply", done: ["data-place", "plain-json"], edit: true }, tables: plainJsonFile(AB.fx.datasets.plainJson.dialect), sel: "pj-nodes", direction: "file" }),
        "edit-plain-links": () => base({ door: { title: "Edit: " + AB.fx.datasets.plainJson.file, verb: "Apply", done: ["data-place", "plain-json"], edit: true }, tables: plainJsonFile(AB.fx.datasets.plainJson.dialect), sel: "pj-edges", direction: "file" }),
        "edit-json-researchers": () => editNested("researchers"),
        "edit-json-affiliations": () => editNested("affiliations"),
        "edit-json-addresses": () => editNested("addresses"),
        "edit-json-institutions": () => editNested("institutions"),
        "edit-json-links": () => editNested("links"),
        "json-tree": () => nested(),
        "json-researchers": () => nested({ sel: "researchers" }),
        "json-keep-value": () => { const m = nested({ sel: "researchers", focusGroup: "attributes.profile.contact" }); R0(m).keep.push("attributes.profile.contact"); return m; },
        "json-array-menu": () => nested({ sel: "researchers", menu: { col: "relationships.coauthor_ids" } }),
        "json-affiliations": () => affiliationRows(nested({ sel: "affiliations" })),
        "json-any-type": () => nested({ sel: "links", menu: { col: "target", sub: "to", any: true } }),
        "json-report": () => affiliationRows(coauthorEdges(nested())),
        "json-invalid": () => base({ door: { title: "Open as a new graph", done: ["graph-place", "nested"] }, sel: "doc", direction: "undirected",
            tables: [mk({ id: "doc", group: true, kind: "json", name: NX().file, file: NX().file, format: "JSON", rows: null, json: true, auto: { format: true },
                refusal: { terminal: true, text: NX().file + " is not valid JSON: line 1,214, column 9 expects a comma or a closing brace.", todo: "Fix the file at that place, or choose another file.", stand: true } })] }),
        "json-no-records": () => { const m = nested({ tables: nestedTables({ only: "meta", file: "network-export-meta.json", preview: NX().document.meta }) }); const d = m.tables[0]; d.refusal = { terminal: true, text: "network-export-meta.json holds no array of records, so it makes no nodes and no edges.", todo: "Its objects and arrays are listed in Tables. Choose another file, one that holds the records." }; m.tables.forEach((t) => { if (t.struct) t.open = true; }); return m; },
        "json-path-gone": () => { const m = nested({ sel: "links", door: { title: "Edit: " + NX().file, verb: "Apply", done: ["data-place", "attributes-nested"], edit: true } }); table(m, "links").gone = true; return m; },
        "json-keyed-weight": () => base({ door: { title: "Open as a new graph", done: ["canvas-and-states", "registry-loading"] }, tables: registryTables(), sel: "installed_together", json: "registry" }),
        "json-keyed": () => base({ door: { title: "Open as a new graph", done: ["canvas-and-states", "registry-loading"] }, tables: registryTables(), sel: "packages", json: "registry", menu: { col: "dependencies" } }),
        "edit-registry": () => base({ door: { title: "Edit: " + REGISTRY.file, verb: "Apply", done: ["data-place", "registry"], edit: true }, tables: registryTables(), sel: "packages", json: "registry" }),
    };
    // Edit source on the nested project opens on the load as it was (AB.nestedLoaded: the last Load's choices)
    function editNested(sel) {
        const NL = AB.nestedLoaded(), co = "relationships.coauthor_ids", ad = "attributes.profile.contact.addresses";
        const m = nested({ door: { title: "Edit: " + NX().file, verb: "Apply", done: ["data-place", "attributes-nested"], edit: true } });
        const r = R0(m);
        ["researchers", "institutions", "links"].forEach((id) => { if (NL[id] === false) table(m, id).tick = false; });
        r.arrs[co].pick = NL.co;
        if (NL.co !== "edges") delete r.roles[co];
        m.coPer = NL.coPer || m.coPer;
        m.direction = NL.direction || m.direction;
        r.keep = (NL.keep || []).slice();
        if (NL.aff === "rows") affiliationRows(m);
        if (NL.addr === "rows") { r.arrs[ad].pick = "rows"; r.open = true; insertChild(m, r, childRows(r, ad)); }
        (NL.idLinks || []).forEach((x) => { r.roles[x.col] = role("links", x.target, "id"); });
        m.sel = table(m, sel) ? sel : "researchers";
        return m;
    }
    // Edit opens on the load as it was: One edge per Row or Pair, or each entry as a node, and the Add choices
    function editDoor(sel) {
        const m = door({ sel, door: { title: "Edit: " + sel, verb: "Apply", done: ["data-place", "door-entries"], edit: true } });
        const e = m.tables[2], was = DE().loaded, k = was.add;
        if (was.per === "nodes") { toNodes(e, "entry"); e.per = "row"; }
        else if (was.per === "pair") { e.per = "pair"; e.combine.time = "Earliest and latest"; e.roles.count = role("weight"); }
        else e.per = "row";
        e.loadedPer = was.per;
        if (k) m.add = { people: k === "people" || k === "both", bldg: k === "bldg" || k === "both" };
        return m;
    }
    function urlState(failed) {
        const t = T();
        const m = transfers({ door: { title: "Add to " + t.graphName, done: ["data-place", "url-source"] }, sel: "alerts" });
        m.tables.push(mk({ id: "alerts", name: "structuring alerts", file: ALERTS_URL, url: ALERTS_URL, format: "JSON", auto: { format: "Worked out from the address" }, addsTo: "account",
            rows: failed ? null : t.flaggedAccounts.length, cols: failed ? [] : ["id", "alertRule", "alertTime"], types: { id: "cat", alertRule: "cat", alertTime: "time" }, unique: ["id"],
            sample: failed ? [] : t.flaggedAccounts.map((r) => ({ id: r.id, alertRule: r.alertRule, alertTime: r.alertTime })),
            roles: failed ? {} : { id: role("key", null, null, { auto: true }) },
            tries: failed ? 3 : 1,
            refusal: failed ? { fetch: true, text: "The address did not answer after 3 tries.", todo: "Check it and your connection, then try again." } : null }));
        return m;
    }

    // ---------- reading a table ----------
    const roleOf = (t, c) => (t.roles[c] && t.roles[c].r) || "attr";
    const colWith = (t, r) => Object.keys(t.roles).find((c) => t.roles[c] && t.roles[c].r === r);
    // The Name's columns, in column order (one or more, joined by a space)
    // a column inside a sub-object kept as one value is not a column any more, so it names nothing
    const keptAway = (t, c) => ((t && t.keep) || []).some((k) => c.startsWith(k + "."));
    const nameColsOf = (t) => ((t && t.cols) || []).filter((c) => roleOf(t, c) === "name" && !keptAway(t, c));
    const nameLost = (t) => ((t && t.cols) || []).filter((c) => roleOf(t, c) === "name" && keptAway(t, c));
    const linkCols = (t) => Object.keys(t.roles).filter((c) => t.roles[c] && ["from", "to", "links"].includes(t.roles[c].r));
    // Under Pair a Time column combined to "Earliest and latest" makes two columns: the first keeps the
    // column (and its Time role) as "(earliest)", the second is derived. The derived count comes last.
    const pairEdge = (t) => t.per === "pair" && t.kind === "edge";
    const twoTimes = (t, c) => pairEdge(t) && (t.types[c] === "time") && (t.combine[c] || "Earliest and latest") === "Earliest and latest";
    // An array column's default (Several values for values, One value for records) is not a role
    const arrDefault = (t, c) => { const a = t.arrs && t.arrs[c]; return !a || a.pick === (a.items === "records" ? "one" : a.items === "object" ? "one" : "values"); };
    const hasRole = (t, c) => roleOf(t, c) !== "attr" || !arrDefault(t, c);
    // A sub-object kept as one value replaces its columns with one column, at the first one's place
    const keptOf = (t, c) => (t.keep || []).find((k) => c.startsWith(k + "."));
    const keptCols = (t) => [...new Set(t.cols.map((c) => keptOf(t, c) || c))];
    // At width: the Key (or Edge id) column first and frozen, then the columns with a role, then the rest
    const frozenCol = (t) => colWith(t, "key") || colWith(t, "edgeId");
    function pinned(t) {
        const cs = keptCols(t), k = frozenCol(t);
        const r = cs.filter((c) => c !== k && hasRole(t, c));
        let rest = r.concat(cs.filter((c) => c !== k && !r.includes(c)));
        // a JSON record's columns stay together under their parent object (one header per parent),
        // the parents in the order their first column comes
        if (t.json) {
            const par = (c) => (c.includes(".") ? c.slice(0, c.lastIndexOf(".")) : "");
            const order = [...new Set(rest.map(par))];
            rest = order.flatMap((g) => rest.filter((c) => par(c) === g));
        }
        return (k && cs.includes(k) ? [k] : []).concat(rest);
    }
    const colsOf = (t) => pinned(t).flatMap((c) => (twoTimes(t, c) ? [c, c + " (latest)"] : [c])).concat(pairEdge(t) ? ["count"] : []);
    const LATEST = / \(latest\)$/;
    const derivedCol = (c) => c === "count" || LATEST.test(c);
    const typeOfCol = (t, c) => (c === "count" ? "num" : LATEST.test(c) ? "time" : (t.keep || []).includes(c) ? "whole" : t.types[c] || "cat");
    // The sample rows: under Pair, one row per pair, as graphty-element's data.preview returns them
    const sampleOf = (t) => (pairEdge(t) && t.id === "entries" ? DE().report.entries.pairSample : t.sample);
    // The tables the load reads: not the file rows, not the document's structure rows, not an unticked array
    const visible = (m) => m.tables.filter((t) => !t.group && !t.struct && t.tick !== false);
    const kidsOf = (m, t) => m.tables.filter((x) => x.parent === t.id);
    const below = (m, t) => kidsOf(m, t).flatMap((k) => [k].concat(below(m, k)));
    const table = (m, id) => m.tables.find((t) => t.id === id);
    const fileOf = (m, t) => (m.replaced && m.replaced.id === t.id ? m.replaced.file : t.file);
    const rowsOf = (m, t) => (m.replaced && m.replaced.id === t.id ? m.replaced.rows : t.rows);
    const kindValues = () => T().attributes.find((a) => a.name === "kind").values;
    function typeLabel(t) {
        if (colWith(t, "type") === "kind" && t.id === "accounts") return Object.entries(kindValues()).map(([k, v]) => k + " (" + n(v) + ")").join(", "); // the subtypes, not types
        return t.addsTo || t.type || "node";
    }
    // The node types on the page: [{ name, rows, table, unique }]
    function types(m) {
        const out = visible(m).filter((t) => t.kind === "node" && !t.addsTo && !t.refusal).map((t) => ({ name: t.type || t.name, rows: rowsOf(m, t), table: t, unique: [colWith(t, "key")].concat(t.unique.filter((u) => u !== colWith(t, "key"))).filter(Boolean) }));
        return out;
    }

    // A door-entries link that matches on a column other than the target's Key (person by badge).
    // person_id holds ids (1001), badges look like B-20417: the fixture join matches none of them.
    function offKey(m, t) {
        if (t.id !== "entries") return null;
        const c = linkCols(t).find((x) => { const r = t.roles[x], ty = types(m).find((y) => y.name === r.target); return r.by && ty && r.by !== ty.unique[0]; });
        const r = c && t.roles[c];
        return c ? { col: c, target: r.target, by: r.by, table: types(m).find((y) => y.name === r.target).table.name } : null;
    }

    // What blocks a table; null when its check is green
    function problem(m, t) {
        if (t.group && !t.refusal) return below(m, t).filter((k) => !k.struct && k.tick !== false).map((k) => problem(m, k)).find(Boolean) || null;
        if (t.gone) return { level: "err", text: "ticked, and the file no longer has it" };
        if (t.refusal) return { level: "err", text: t.refusal.busy ? "not loaded: another file is still reading" : t.refusal.fetch ? "the address did not answer" : t.refusal.setting ? "could not be read" : "cannot be loaded" };
        if (t.reading) return null;
        if (t.matches) return { level: "warn", text: "has the same columns as " + t.matches + ", already loaded: Replace it, or remove this table" };
        if (t.kind === "text") return { level: "warn", text: t.candidates && t.candidates.length ? "choose " + t.candidates.join(" or ") + " in File settings" : "choose a format in File settings" };
        if (t.kind === "edge" && (!colWith(t, "from") || !colWith(t, "to"))) return { level: "warn", text: (colWith(t, "from") || colWith(t, "to") ? "choose a From and a To under two column headers" : "no endpoint columns found; choose From and To under two of its columns") + (t.cols.length ? " (the file has " + t.cols.join(", ") + ")" : "") };
        const known = types(m).map((x) => x.name);
        const lost = linkCols(t).find((c) => t.roles[c].target && t.roles[c].target !== "node" && !t.roles[c].fresh && !known.includes(t.roles[c].target));
        if (lost) return { level: "warn", text: c2(lost, t) };
        const offAny = linkCols(t).map((c) => [c, ((t.roles[c].any) || []).find((y) => !known.includes(y) || (types(m).find((z) => z.name === y) || {}).table.tick === false)]).find((x) => x[1]);
        if (offAny) return { level: "warn", text: offAny[0] + " links to " + offAny[1] + ", and no table here makes " + offAny[1] + " nodes: those rows are left out" };
        const ok = offKey(m, t);
        if (ok) return { level: "err", text: "no " + ok.col + " value is a " + ok.by + " in " + ok.table + "; choose " + ok.target + " by its Key under " + ok.col };
        if (t.kind === "node" && !colWith(t, "key") && !linkCols(t).length) return { level: "warn", text: "choose the Key column" };
        return null;
    }

    // The element's report after the Add choices (fixture numbers; the page counts nothing)
    const addedKey = (m) => { const a = m.add || {}; return a.people && a.bldg ? "both" : a.people ? "people" : a.bldg ? "bldg" : null; };
    const entriesNow = (m) => { const e = DE().report.entries, k = addedKey(m); return Object.assign({ people: 412, buildings: 9 }, e, k ? e.added[k] : {}); };
    // "412 + 25 added": a type's rows plus the nodes an Add choice made (the report's added count per type)
    const addedTo = (m, name) => { const a = m.add || {}, e = DE().report.entries; return name === "person" && a.people ? e.missingPeople : name === "building" && a.bldg ? e.missingBuildings : 0; };
    const plusAdded = (m, name, rows) => n(rows) + (addedTo(m, name) ? " + " + n(addedTo(m, name)) + " added" : "");
    const c2 = (c, t) => c + " links to " + t.roles[c].target + ", and no table here makes " + t.roles[c].target + " nodes: add that table or choose another type";
    // ---------- the model strip (drawn from the roles; read-only) ----------
    function strip(m) {
        const vis = visible(m);
        if (m.json === "nested") return nestedStrip(m);
        if (m.json === "registry") return registryStrip(m);
        if (m.tables.some((t) => t.group && t.kind === "json")) return [];
        const g = m.tables.find((t) => t.group && t.summary);
        if (g) return [{ text: g.summary, tip: g.file + ": the file sets its keys and links" }];
        if (m.tables.some((t) => t.group)) { const l = L(); return [{ text: "Les Miserables: " + l.nodes + " nodes, " + l.edges + " edges", tip: "miserables.gexf: the file sets its keys and links" }]; }
        const tys = types(m);
        const ty = (name) => tys.find((x) => x.name === name);
        const split = vis.find((t) => t.id === "accounts" && colWith(t, "type") === "kind");
        const now = entriesNow(m);
        const rowsOfType = (name) => (name === "person" && m.add && m.add.people ? now.people : name === "building" && m.add && m.add.bldg ? now.buildings : ty(name).rows);
        const tc = (name, counts) => (split && name === "account" ? "account (" + n(ty(name).rows) + "; kind: " + Object.keys(kindValues()).join(" | ") + ")" : ty(name) && counts ? name + " (" + plusAdded(m, name, ty(name).rows) + ")" : name);
        const keyOf = (name) => (ty(name) ? ty(name).table.name + "." + colWith(ty(name).table, "key") : "a new " + name + " node per value");
        const lines = [];
        const used = new Set();
        vis.forEach((t) => {
            if (t.refusal || t.kind === "text") return;
            const lk = linkCols(t);
            const wt = colWith(t, "weight");
            const wtip = wt ? "; weight: " + wt + (t.kind === "edge" ? " (higher means " + MEANS.find((x) => x[0] === (t.means || "stronger"))[1].toLowerCase() + ")" : "") : "";
            const rows = n(rowsOf(m, t));
            if (t.kind === "edge") {
                const f = colWith(t, "from"), to = colWith(t, "to");
                if (!f || !to) return;
                const a = t.roles[f], b = t.roles[to];
                used.add(a.target).add(b.target);
                const by = (c, r) => t.name + "." + c + " = " + (r.by && ty(r.target) ? ty(r.target).table.name + "." + r.by : keyOf(r.target));
                let tip = by(f, a) + "; " + by(to, b) + "; one edge per " + t.per + wtip;
                if (t.id === "entries" && (a.by || "id") === "id" && (b.by || "bldg") === "bldg") tip = DE().model[t.per].tip.replace(/; weight: count$/, "") + wtip;
                // The entries count the edges they make, in the same unit under Row and Pair
                const made = t.id !== "entries" ? (t.per === "pair" ? rows + " edges from " + rows + " rows" /* no two transfers share both ends */ : rows) : offKey(m, t) ? "0 edges from " + rows + " rows" : t.per === "pair" ? n(now.pairEdges) + " edges from " + n(now.bothEnds) + " of " + rows + " rows" : n(now.bothEnds) + " edges from " + rows + " rows";
                lines.push({ text: tc(a.target, true) + " --" + t.name + " (" + made + ")--> " + tc(b.target, true), tip });
            } else if (lk.length) {
                const own = t.type || t.name;
                used.add(own);
                const parts = lk.map((c) => [c, t.roles[c].target]);
                parts.forEach((p) => used.add(p[1]));
                const tip = parts.map(([c, target]) => own + "." + c + " = " + keyOf(target)).join("; ") + "; each " + own + " is a node with " + parts.length + " edge" + (parts.length > 1 ? "s" : "") + wtip;
                const text = parts.length === 2 ? tc(parts[0][1], true) + " <--" + parts[0][0] + "-- " + own + " (" + rows + ") --" + parts[1][0] + "--> " + tc(parts[1][1], true) : own + " (" + rows + ")" + parts.map(([c, target]) => " --" + c + "--> " + tc(target, true)).join("");
                lines.push({ text, tip: t.id === "entries" ? DE().model.entryAsNode.tip : tip });
            }
        });
        tys.forEach((x) => {
            const adds = vis.filter((t) => t.addsTo === x.name && !t.refusal);
            const label = x.name + " (" + n(rowsOf(m, x.table)) + ")";
            if (!used.has(x.name) || adds.length) {
                const w = colWith(x.table, "weight");
                lines.push({ text: label + adds.map((a) => " + " + a.name + " columns").join(""), tip: "key: " + x.table.name + "." + colWith(x.table, "key") + adds.map((a) => "; " + a.name + "." + colWith(a, "key") + " = " + x.table.name + "." + colWith(x.table, "key")).join("") + (w ? "; node weight: " + w : "") });
            }
        });
        return lines;
    }

    // The research network's strip: researcher (170) --coauthor (510)--> researcher; researcher
    // --affiliations (242)--> institution (30); links (160)
    function nestedStrip(m) {
        const r = R0(m), inst = table(m, "institutions"), lk = table(m, "links"), af = table(m, "affiliations");
        if (!r || m.tables[0].refusal) return [];
        const lines = [];
        const co = r.arrs["relationships.coauthor_ids"].pick === "edges";
        const coN = m.coPer === "item" ? NREP.coauthorItems : NREP.coauthorPairs;
        if (r.tick !== false) lines.push(co ? { text: "researcher (" + n(r.rows) + ") --coauthor (" + n(coN) + ")--> researcher", tip: "researchers.relationships.coauthor_ids[*] = researchers.id; one edge per " + (m.coPer === "item" ? "item" : "pair: the 4 pairs listed by both researchers are one edge each") }
            : { text: "researcher (" + n(r.rows) + ")", tip: "key: researchers.id" });
        if (r.tick !== false) idLinks(m).forEach((x) => lines.push({ text: "researcher --" + x.name + " (" + n(x.n) + ")--> " + x.target, tip: "researchers." + x.col + " = " + x.target + "s.id; one edge per value that matches" }));
        // a child node table (Several rows on an array of records with no id of its own): each row links to its parent
        m.tables.filter((x) => x.childOf && x.kind === "node" && table(m, x.childOf).tick !== false).forEach((x) => { const p = table(m, x.childOf); lines.push({ text: x.type + " (" + n(x.rows) + ") --" + x.name + "--> " + p.type, tip: x.name + ".parent = " + p.name + ".id; one " + x.type + " node per item of " + x.childCol }); });
        const instOn = inst && inst.tick !== false;
        if (af && !instOn) lines.push({ text: "affiliations (" + n(af.rows) + "): no edges, no institution nodes", tip: "affiliations.institution_id = institutions.id, and data.institutions is not used" });
        else if (af) lines.push({ text: "researcher --affiliations (" + n(af.rows) + ")--> institution (" + n(inst.rows) + ")", tip: "affiliations.parent = researchers.id; affiliations.institution_id = institutions.id; role and since are edge attributes" });
        else if (inst && inst.tick !== false) lines.push({ text: "institution (" + n(inst.rows) + ")", tip: "key: institutions.id" });
        if (lk && lk.tick !== false && !lk.gone && r.tick === false) lines.push({ text: "links (" + n(lk.rows) + "): no edges, no researcher nodes", tip: "links.source = researchers.id, and data.researchers is not used" });
        else if (lk && lk.tick !== false && !lk.gone) {
            const any = ((lk.roles.target || {}).any || []).filter((x) => x !== "institution" || instOn);
            const ends = any.length === 2 ? "researcher | institution" : any[0] || "a target type";
            lines.push({ text: "researcher --links (" + n(any.includes("institution") ? lk.rows : NREP.linksToResearcher) + ")--> " + ends, tip: "links.source = researchers.id; links.target = " + (any.length ? any.map((x) => x + "s.id").join(" or ").replace("researchers.id or institutions.id", "researchers.id (" + NREP.linksToResearcher + ") or institutions.id (" + NREP.linksToInstitution + ")") : "a target type") });
        }
        return lines;
    }
    function registryStrip(m) {
        const p = table(m, "packages");
        if (!p || p.tick === false) return [];
        const dep = p.arrs.dependencies.pick === "edges", it = table(m, "installed_together");
        return [dep ? { text: "package (" + n(p.rows) + ") --dependencies (" + n(REGISTRY.dependencyKeys) + ")--> package", tip: "packages.key = the object key of each package; packages.dependencies.* (each key) = packages.key; the version range is each edge's value" }
            : { text: "package (" + n(p.rows) + ")", tip: "packages.key = the object key of each package" },
        it && it.tick !== false ? { text: "package --installed_together (" + n(it.rows) + ")--> package", tip: "installed_together.package = packages.key; installed_together.with = packages.key; one edge per row" + (colWith(it, "weight") ? "; weight: " + colWith(it, "weight") : "") } : null].filter(Boolean);
    }

    // ---------- the match report (stands in for graphty-element's report object) ----------
    // Each line: { level: "warn" | "err" | "res" | null, parts }. `count(text, filterId)` filters the grid.
    // A refusal or a blocking problem is one problem block (AB.problem): what happened, what to do, one action
    const P1 = (o) => ({ problem: o });
    function report(m, t, count, seg, pick, cb) {
        const R = DE().report;
        const L1 = (level, ...parts) => ({ level, parts });
        if (t.gone) return [P1({ what: t.path + " is ticked, and " + t.file + " no longer has it.", todo: "The file changed since it was loaded. Untick " + t.path + " to load the rest, or choose another file.", action: { label: "Untick " + t.path, onClick: () => cb.untick(t) } })];
        // the action is the one way forward: a setting, another try, or (when no setting fixes it) another file, as the primary button
        if (t.refusal) return [P1({ what: t.refusal.text, todo: t.refusal.todo, action: t.refusal.settings ? { label: "File settings", onClick: cb.settings } : t.refusal.fetch ? { label: "Try again", kind: "primary", go: ["data-page", "url"] }
            : t.refusal.terminal ? { label: "Choose another file...", kind: "primary", onClick: () => AB.flash("Opens the file picker") } : null }),
            (t.refusal.setting && t.kind !== "text") || t.refusal.stand ? L1(null, AB.openQuestion("The line and column are a stand-in: the fixture file reads cleanly; graph-io's error summary supplies the real ones")) : null].filter(Boolean);
        if (t.reading) return [L1(null, "Reading " + t.file + ": " + (t.readRows ? n(t.readRows) + " of " + n(t.rows) + " rows read." : "..."))];
        if (t.kind === "text") return [L1("warn", t.candidates && t.candidates.length ? "The text matches " + t.candidates.join(" and ") + ": choose one in File settings." : "Nothing recognized this text. Choose a format in File settings, or paste a file's text as it is saved.")];
        if (m.json && (t.json || t.childOf)) return nestedReport(m, t, count, pick);
        // A table whose columns match a loaded source: offer Replace, which keeps every role, instead of a second copy
        if (t.matches) {
            const was = table(m, t.matches);
            return [P1({ level: "partial", what: t.file + " has the same " + t.cols.length + " columns as " + fileOf(m, was) + ", already loaded: loading it adds a second copy of " + was.name + ".",
                todo: "Replace " + fileOf(m, was) + " with it to keep every role, or remove this table.", action: { label: "Replace " + fileOf(m, was), go: ["data-page", "replace"] } }),
            L1(null, count(n(rowsOf(m, t)) + " rows", "all"), "; every row has both ends."),
            t.sampleFrom ? L1(null, AB.openQuestion("The sample rows are " + t.sampleFrom + "'s: the fixture holds " + t.file + "'s counts and columns, not its rows")) : null].filter(Boolean);
        }
        const pr = problem(m, t);
        const out = [];
        // a graph file's nested records: each sub-object is flattened, one column per field, with no question
        const flat = t.dialect ? [...new Set(t.cols.filter((c) => c.includes(".")).map((c) => c.slice(0, c.indexOf("."))))] : [];
        if (flat.length) out.push(L1(null, flat.join(" and ") + " in each record is flattened: one column per field, named by its full path."));
        const ok = offKey(m, t);
        if (ok) return [P1({ what: "0 of " + n(rowsOf(m, t)) + " " + ok.col + " values are " + ok.by + "s in " + ok.table + ": " + n(rowsOf(m, t)) + " rows have no " + ok.target + ".",
            todo: ok.col + " holds ids such as 1001; " + ok.table + "." + ok.by + " holds values such as B-20417. Match " + ok.target + " by its Key, " + types(m).find((y) => y.name === ok.target).unique[0] + ".",
            action: { label: "Match " + ok.target + " by " + types(m).find((y) => y.name === ok.target).unique[0], onClick: () => cb.byKey(t, ok.col) } })];
        if (pr) out.push(P1({ what: t.name + ": " + pr.text + ".", level: pr.level === "err" ? "error" : "partial" }));
        if (t.id === "entries") {
            const e = R.entries;
            const now = entriesNow(m);
            const asNode = t.kind === "node";
            // one row per unmatched value in this file; the report gives both counts, so values and rows are never mixed
            const unm = (key, num, col, word, other) => L1("warn", count(num + " " + col + " values (" + num + " rows)", key), " are not in " + other + ".", seg(key, col, [["add", "Add as " + word], ["leave", asNode ? "Leave out the link" : "Leave out"]], m.add && m.add[key] ? "add" : "leave"),
                m.add && m.add[key] ? h("span", { class: "k-secondary" }, num + " " + word + " are added, each with only an id") : null);
            const lc = linkCols(t);
            // With one link column there are no "both ends": say how many rows that one link matches
            if (lc.length === 1) out.push(L1(null, count(n(e.rows) + " rows", "all"), "; " + n(e.rows - (lc[0] === "person_id" ? (m.add && m.add.people ? 0 : e.missingPeople) : (m.add && m.add.bldg ? 0 : e.missingBuildings))) + " link to a " + (lc[0] === "person_id" ? "person" : "building") + "."));
            else out.push(L1(null, count(n(e.rows) + " rows", "all"), "; ", count(n(now.bothEnds), "both"), " have both ends."));
            if (t.roles.person_id) out.push(unm("people", e.missingPeople, "person_id", "people", "people"));
            if (t.roles.building_id) out.push(unm("bldg", e.missingBuildings, "building_id", "buildings", "buildings"));
            // The one fixture note about a left-out building (B12): only an edit has notes; a new graph has none yet
            if (m.door.edit && DE().hasNotes() && t.roles.building_id && !(m.add && m.add.bldg)) out.push(L1(null, "1 note is about a node no longer in the graph (B12): it reads 'Not in the current data'."));
            const left = e.rows - now.bothEnds;
            if (left) out.push(L1(null, count("Show the " + left + " rows", "missing"), "."));
            if (!asNode && t.per === "row" && !colWith(t, "edgeId")) out.push(L1("warn", "No Edge id column: notes on entries may move if the row order changes."));
            if (m.door.edit && DE().hasNotes() && t.loadedPer && t.kind === "edge" && t.per !== t.loadedPer) out.push(L1("warn", t.per === "pair" ? "Switching to Pair brings back the edge 1 note on entries is about (Ana Ruiz -> B1)." : "Switching to Row changes which edge each note is about: 1 note on entries will read 'Not in the current data'."));
            if (asNode && !colWith(t, "key")) out.push(L1("warn", "No Key column: each entry is keyed by its row number. Notes on entries may move if the row order changes."));
            out.push(L1("warn", "person_id is Number here and Category in people: matched as text. ", count(e.leadingZeroKeys + " keys", "zeros"), " differ only by leading zeros (not merged)."));
            if (asNode) out.push(L1("res", n(e.rows) + " entries became " + n(e.rows) + " entry nodes" + (linkCols(t).length === 2 ? "; " + n(now.bothEnds) + " have both edges." : ".")));
            else if (linkCols(t).length === 2) {
                out.push(L1("res", n(now.bothEnds) + " entries became " + n(t.per === "pair" ? now.pairEdges : now.bothEnds) + " person-building edges."));
                if (t.per === "pair" && m.direction === "undirected") out.push(L1(null, "Undirected: (a, b) and (b, a) are one pair, but every entry runs from a person to a building, so no pairs merge."));
            }
            return out;
        }
        const weighsOne = (tt) => (!colWith(tt, "weight") && m.tables.some((x) => x.kind === "node" && x !== tt && colWith(x, "weight")) ? L1(null, (tt.type || tt.name) + " has no weight column: each " + (tt.type || tt.name) + " weighs 1.") : null);
        if (t.id === "people") return out.concat([L1(null, count(n(R.people.rows) + " rows", "all"), ", ", count(R.people.repeatedKeys + " repeated key", "repeated"), " (kept the first). ", count(R.people.noEntries + " people", "none"), " have no entries (kept, unconnected)."), weighsOne(t)].filter(Boolean));
        if (t.id === "buildings") {
            const w = colWith(t, "weight");
            const nm = colWith(t, "name");
            return out.concat([L1(null, count(n(R.buildings.rows) + " rows", "all"), "; every key is unique."),
                nm === "site" ? L1(null, "site, the Name, repeats: " + R.buildings.siteNames + " names cover " + n(R.buildings.rows) + " buildings, so labels and inspector titles repeat.") : null,
                w ? L1(null, w + " is each building's node weight. ", count("1 building", "noweight"), " has no " + w + " value: its weight reads", pick([["1", "1"], ["0", "0"]], m.missW || "1", (v) => { m.missW = v; }, "Missing " + w + " reads", "mw", ["A building with no " + w + " value weighs 1, as if unweighted", "A building with no " + w + " value weighs 0"])) : null].filter(Boolean));
        }
        if (t.id === "badges") return out.concat([L1("res", "Adds " + (t.cols.length - 1) + " columns to person: ", count("409 of 412", "all"), " matched. 3 people get no badge values."), L1(null, AB.openQuestion("badges.csv is not in the door-entries fixture: its columns and rows are stand-ins; the counts are the spec's"))]);
        if (t.id === "accounts") {
            const rows = rowsOf(m, t);
            const lines = [L1(null, count(n(rows) + " rows", "all"), "; every key is unique.")];
            if (colWith(t, "type") === "kind") lines.push(L1("res", "kind makes 3 subtypes of account: " + typeLabel(t) + ". Every node stays type account, keyed by id, so links and notes still point at account."));
            return out.concat(lines);
        }
        if (t.id === "alerts") return out.concat([L1(null, "Fetched on the first of 3 tries."), L1("res", "Adds 2 columns to account: ", count(t.rows + " of " + t.rows, "all"), " matched.")]);
        if (t.id === "lm-nodes") return [L1(null, count(L().nodes + " rows", "all"), "; every id is unique.")];
        if (t.id === "lm-edges") return [L1(null, count(L().edges + " rows", "all"), "; every edge has both ends.")];
        if (t.kind === "edge") {
            if (pr) return out;
            const rows = rowsOf(m, t);
            const pairWord = t.per === "pair" ? "No two transfers share both ends: One edge per Pair changes nothing." : "No two transfers share both ends, so One edge per Pair would change nothing.";
            const lines = [L1(null, count(n(rows) + " rows", "all"), m.replaced && m.replaced.id === t.id ? "; all " + t.cols.length + " columns of " + m.replaced.was + " are here, so every role carried over." : "; every row has both ends.")];
            if (/^transfers-2026-0[34]$/.test(t.name)) lines.push(L1(null, n((t.id === "april" ? TA() : T()).nodes) + " ids found in " + colWith(t, "from") + " and " + colWith(t, "to") + " become nodes of type node."));
            if (!m.replaced && /^transfers/.test(t.id)) lines.push(L1(null, pairWord));
            if (t.per === "pair" && m.direction === "undirected") lines.push(L1(null, "Undirected: (a, b) and (b, a) now merge: " + n(rows) + " edges become " + n(rows - R.transfers.reversePairs) + "."));
            const ew = colWith(t, "weight");
            if (ew && ew !== "count") lines.push(L1(null, ew + " is each edge's weight; every row has " + (/^[aeiou]/.test(ew) ? "an " : "a ") + ew + " value. A row without one would weigh", pick([["1", "1"], ["0", "0"]], m.missEW || "1", (v) => { m.missEW = v; }, "Missing " + ew + " reads", "mew", ["A row with no " + ew + " value weighs 1", "A row with no " + ew + " value weighs 0"]), "."));
            lines.push(L1("res", n(rows) + " rows became " + n(rows) + " edges."));
            if (t.sampleFrom) lines.push(L1(null, AB.openQuestion("The sample rows are " + t.sampleFrom + "'s: the fixture holds " + fileOf(m, t) + "'s counts and columns, not its rows")));
            return out.concat(lines);
        }
        if (t.kind === "node" && !pr) out.push(L1(null, count(n(rowsOf(m, t)) + " rows", "all"), "; every key is unique."));
        return out;
    }
    // The nested document's report (graphty-element's preview report, figures in NREP)
    function nestedReport(m, t, count, pick) {
        const L1 = (level, ...parts) => ({ level, parts });
        const sub = (text) => ({ level: "sub", parts: [text] });
        if (m.json === "registry") {
            if (t.tick === false) return [L1(null, t.path + " is not used: tick it in Tables to load its " + n(t.rows) + " records as a table.")];
            if (t.id === "installed_together") {
                const w = colWith(t, "weight");
                return [L1(null, count(n(t.rows) + " rows", "all"), "; package and with name a package in every row."),
                    w === "weight" && t.roles.weight.auto ? L1(null, "weight is a number on every row, so it is proposed as this table's Weight.") : w ? L1(null, w + " is each edge's weight.") : L1(null, "No Weight: each edge counts 1."),
                    L1("res", n(t.rows) + " rows became " + n(t.rows) + " package-package edges.")];
            }
            if (t.group) return [L1(null, "packages is an object of " + n(REGISTRY.packages) + " records keyed by package name; its keys are the key column."), L1(null, "installed_together is an array of " + n(REGISTRY.installedTogether) + " records whose package and with name packages, so it is proposed as an edge table."), L1(null, "download_log is an array of " + n(REGISTRY.downloadLog) + " records with no unique id-like field, so it was not proposed: tick it to use it.")];
            const dep = t.arrs.dependencies.pick === "edges";
            return [L1(null, count(n(t.rows) + " records", "all"), ", keyed by package name: the key column holds each record's object key; every key is unique."),
                dep ? L1(null, "dependencies: " + n(REGISTRY.dependencyKeys) + " keys, each a package name; each version range becomes its edge's value.") : L1(null, "dependencies: kept as one value per package."),
                L1(null, "maintainers: an array of records, kept as one value per package."),
                dep ? L1("res", n(t.rows) + " records became " + n(t.rows) + " package nodes and " + n(REGISTRY.dependencyKeys) + " dependency edges.") : L1("res", n(t.rows) + " records became " + n(t.rows) + " package nodes.")];
        }
        const r = R0(m);
        const meta = () => L1(null, "meta is not read: it holds no array of records (api_version, generated_at, request, page).");
        const researchers = () => {
            const co = r.arrs["relationships.coauthor_ids"].pick === "edges", rows = r.arrs["attributes.affiliations"].pick === "rows";
            const out = [L1(null, count(n(r.rows) + " rows", "all"), "; every id is unique.")];
            if (co) {
                out.push(L1(null, n(NREP.coauthorItems) + " relationships.coauthor_ids items; each is a researcher's id."));
                out.push(L1(null, NREP.coauthorBoth + " co-author pairs are listed by both researchers.", h("span", { class: "dpg-lab" }, " One edge per"),
                    pick([["item", "Item"], ["pair", "Pair"]], m.coPer, (v) => { m.coPer = v; }, "One edge per", "co-per", ["Every item its own edge: a pair listed by both researchers makes two", "One edge per pair of researchers, so degree is not counted twice"])));
            } else out.push(L1(null, "relationships.coauthor_ids: " + n(NREP.coauthorItems) + " items, each a researcher's id, " + (r.arrs["relationships.coauthor_ids"].pick === "one" ? "kept as one value per researcher." : "kept as Several values.")));
            if (nameLost(r).length && !nameColsOf(r).length) out.push(L1("warn", nameLost(r).join(" and ") + " held the Name and are now kept whole inside " + r.keep.filter((k) => nameLost(r).some((c) => c.startsWith(k + "."))).join(", ") + ": researchers will be named by their id. Choose One column per field there, or give another column the Name."));
            if ((r.keep || []).includes("attributes.profile.contact")) out.push(L1(null, "attributes.profile.contact is kept as one value: each researcher's email and addresses in one sub-object."));
            else if ((r.arrs["attributes.profile.contact.addresses"] || {}).pick === "rows") out.push(L1("res", "attributes.profile.contact.addresses made a child table under researchers: " + n(table(m, "addresses").rows) + " rows, one address node per item, each linked to its researcher."));
            else out.push(L1(null, "attributes.profile.contact.addresses: " + NREP.addrTwoPlus + " researchers hold two or more; each list is kept as one value."));
            out.push(rows ? L1("res", "attributes.affiliations made a child table under researchers: " + n(NREP.affiliations) + " rows, one per item.") : L1(null, "attributes.affiliations: " + NREP.affTwoPlus + " researchers hold two or more; each list is kept as one value."));
            const il = idLinks(m);
            // a one-value id column whose values all name researchers is offered, not proposed (element-requirements-5.md section 8, Suggested tables)
            const doc = NX().document, rid = new Set(doc.data.researchers.map((x) => x.id));
            r.cols.filter((c) => /_id$/.test(c) && !r.arrs[c] && ((r.roles[c] || {}).r || "attr") === "attr").forEach((c) => {
                const vals = doc.data.researchers.map((x) => get(x, c)).filter((v) => v != null);
                if (vals.length && vals.every((v) => rid.has(v))) out.push(L1(null, c + ": all " + n(vals.length) + " values are researcher ids, kept as an Attribute. Set Links to -> researcher on it to make " + c.split(".").pop().replace(/_id$/, "") + " edges."));
            });
            il.forEach((x) => out.push(L1(x.n < x.of ? "warn" : null, x.col + ": " + n(x.of) + " values" + (x.n === x.of ? ", each a " + x.target + "'s id." : "; " + n(x.n) + " are " + x.target + " ids, the other " + n(x.of - x.n) + " match nothing and make no edge."))));
            const made = (co ? [n(m.coPer === "item" ? NREP.coauthorItems : NREP.coauthorPairs) + " coauthor edges"] : []).concat(il.map((x) => n(x.n) + " " + x.name + " edges"));
            out.push(L1("res", n(r.rows) + " records became " + n(r.rows) + " researcher nodes" + (made.length ? " and " + made.join(" and ") + "." : ".")));
            return out;
        };
        const institutions = (x) => [L1(null, count(n(x.rows) + " rows", "all"), "; every id is unique.")]
            .concat(Object.keys(x.arrs || {}).filter((c) => x.arrs[c].items === "records").map((c) => (x.arrs[c].pick === "rows"
                ? L1("res", c + " made a child table under institutions: " + n((m.tables.find((y) => y.childOf === x.id && y.childCol === c) || {}).rows) + " rows, one node per item, each linked to its institution.")
                : L1(null, c + ": an array of records in each institution, kept as one value."))), [L1("res", n(x.rows) + " records became " + n(x.rows) + " institution nodes.")]);
        const links = (x) => {
            const inst = table(m, "institutions"), instOff = !inst || inst.tick === false;
            const any = ((x.roles.target || {}).any || []).filter((y) => y !== "institution" || !instOff);
            // source names researchers: with data.researchers unticked, no row has a source to link from
            if (r.tick === false) return [L1(null, count(n(x.rows) + " rows", "all"), "; every id is unique."), L1("warn", "source links to researcher, and no table here makes researcher nodes: tick data.researchers, or no row makes an edge."), L1("res", n(x.rows) + " rows became 0 edges.")];
            const out = [L1(null, count(n(x.rows) + " rows", "all"), "; every id is unique. source links to a researcher in all " + n(x.rows) + ".")];
            if (instOff && ((x.roles.target || {}).any || []).includes("institution")) out.push(L1("warn", NREP.linksToInstitution + " target values are institutions, and no table here makes institution nodes: tick data.institutions, or those rows are left out."));
            else if (any.includes("researcher") && any.includes("institution")) out.push(L1(null, "target links to a researcher in " + NREP.linksToResearcher + " rows and to an institution in " + NREP.linksToInstitution + "; no value matches both."));
            else out.push(L1("warn", (any.includes("researcher") ? NREP.linksToInstitution + " target values are institutions" : NREP.linksToResearcher + " target values are researchers") + ", a type this link does not take: those rows are left out."));
            // one graph, weighted and unweighted edge types: say what an unweighted edge reads
            const wc = colWith(x, "weight"), unweighted = (r.arrs["relationships.coauthor_ids"].pick === "edges" ? ["coauthor"] : []).concat(table(m, "affiliations") ? ["affiliations"] : []).concat(idLinks(m).map((y) => y.name));
            if (wc && unweighted.length) out.push(L1(null, unweighted.join(" and ") + (unweighted.length > 1 ? " have" : " has") + " no weight: each of " + (unweighted.length > 1 ? "their" : "its") + " edges reads 1, while links reads " + wc + ", 0 to 1. A run that reads the loaded weight treats " + (unweighted.length > 1 ? "them" : "it") + " as strong as the strongest link."));
            out.push(L1("res", n(x.rows) + " rows became " + n(any.length === 2 ? x.rows : any.includes("researcher") ? NREP.linksToResearcher : NREP.linksToInstitution) + " edges."));
            return out;
        };
        const aff = (x) => [L1(null, count(n(x.rows) + " rows", "all"), ", one per item of attributes.affiliations; every institution_id is an institution."), L1("res", n(x.rows) + " rows became " + n(x.rows) + " researcher-institution edges, with role, since and current as edge attributes.")];
        if (t.tick === false) return [L1(null, t.path + " is not used: tick it in Tables to load its " + n(t.rows) + " records as a table.")];
        if (t.group) {
            const out = [sub("The document"), meta()];
            const each = [["researchers", researchers], ["affiliations", aff], ["institutions", institutions], ["links", links]];
            each.forEach(([id, f]) => { const x = table(m, id); if (x && x.tick !== false && !x.gone) out.push(sub(x.path), ...(id === "researchers" ? f() : f(x))); });
            // an array the reader unticked is not read, said the way meta is
            each.forEach(([id]) => { const x = table(m, id); if (x && x.tick === false) out.splice(2, 0, L1(null, x.path + " is not read: it is not ticked in Tables.")); });
            m.tables.filter((x) => x.childOf && x.id !== "affiliations").forEach((x) => out.push(sub(x.path), L1("res", n(x.rows) + " rows became " + n(x.rows) + " " + x.type + " nodes, each with an edge to its " + table(m, x.childOf).type + ".")));
            return out;
        }
        if (t.id === "researchers") return researchers();
        if (t.id === "institutions") return institutions(t);
        if (t.id === "links") return links(t);
        if (t.id === "affiliations") return aff(t);
        if (t.childOf) return [L1(null, count(n(t.rows) + " rows", "all"), ", one per item of " + t.childCol + "."), L1("res", n(t.rows) + " rows became " + n(t.rows) + " " + t.type + " nodes, each with an edge to its " + table(m, t.childOf).type + ".")];
        return [];
    }

    // Which sample rows each count shows
    const MISS_P = ["7", "1530"], MISS_B = ["B12"];
    // An added value is matched: its rows leave the unmatched filter (m.add is the report's Add choices)
    const missP = (m) => (m && m.add && m.add.people ? [] : MISS_P), missB = (m) => (m && m.add && m.add.bldg ? [] : MISS_B);
    const FILTERS = {
        all: { text: "every row" },
        both: { text: "the rows with both ends", test: (r, m) => !missP(m).includes(r.person_id) && !missB(m).includes(r.building_id) },
        missing: { text: "the rows with an end not matched", test: (r, m) => missP(m).includes(r.person_id) || missB(m).includes(r.building_id) },
        people: { text: "the rows whose person_id is not in people", test: (r) => MISS_P.includes(r.person_id) },
        bldg: { text: "the rows whose building_id is not in buildings", test: (r) => MISS_B.includes(r.building_id) },
        zeros: { text: "the rows whose key differs only by leading zeros", test: (r) => r.person_id === "7" || r.id === "0007" },
        repeated: { text: "the rows with a repeated key", test: (r) => r.id === "1188" },
        none: { text: "the 14 people with no entries", test: () => false },
        noweight: { text: "the building with no floors value", test: (r) => r.floors === "" },
    };

    // ---------- overlays: the role menu (with its submenu) and the File settings popover ----------
    const layer = () => document.getElementById("ab-overlay");
    let stack = [];
    let pop = null;
    const tidy = () => { const Ly = layer(); if (Ly && !Ly.childElementCount) Ly.hidden = true; };
    function closeMenus(refocus) {
        const first = stack[0];
        stack.forEach((s) => s.el.remove());
        stack = [];
        tidy();
        // a choice made in a menu that stays open (Any of these types...) redraws once the menus close
        const after = model && model.after;
        if (after) { model.after = null; after(); return; }
        if (refocus && first && first.anchor.isConnected) first.anchor.focus();
    }
    // A submenu that is the field list at menu size (a link's "by"): right of its item, Left or Esc goes back
    function subList(anchor, items, label) {
        const wrap = items.map((it) => (it.sep || it.heading || it.disabled || it.keep ? it : Object.assign({}, it, { onClick: () => { closeMenus(true); it.onClick && it.onClick(); } })));
        const fl = AB.position(AB.fieldList({ size: "menu", items: wrap, label, onClose: () => closeSub() }), anchor, "right-start");
        fl.classList.add("dpg-menu");
        fl.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); closeSub(); } });
        const Ly = layer();
        Ly.hidden = false;
        Ly.append(fl);
        stack.push({ el: fl, anchor });
        requestAnimationFrame(() => requestAnimationFrame(() => { const f = fl.querySelector("input, .ab-fl-list"); if (f) f.focus(); }));
        return fl;
    }
    function closeSub() {
        const s = stack.pop();
        if (!s) return;
        s.el.remove();
        if (s.anchor.isConnected) s.anchor.focus();
    }
    // A dark menu (AB.menu); level 1 is a submenu to the right of its item
    function pickMenu(anchor, items, o) {
        o = o || {};
        if (!o.sub) closeMenus();
        const wrap = items.map((it) => (it.sep || it.heading || it.disabled || it.sub ? it : Object.assign({}, it, { onClick: () => { closeMenus(true); it.onClick && it.onClick(); } })));
        const mn = AB.menu({ anchor, place: o.sub ? "right-start" : "below-start", items: wrap, label: o.label, onClose: () => (o.sub ? closeSub() : closeMenus(true)) });
        mn.classList.add("dpg-menu");
        const Ly = layer();
        Ly.hidden = false;
        Ly.append(mn);
        stack.push({ el: mn, anchor });
        requestAnimationFrame(() => requestAnimationFrame(() => { const f = mn.querySelector(".k-menu-item[aria-checked=true]:not([aria-disabled])") || mn.querySelector(".k-menu-item:not([aria-disabled])"); if (f) f.focus(); }));
        return mn;
    }
    function closePop(refocus) {
        if (!pop) return;
        const a = pop.anchor;
        pop.el.remove();
        pop = null;
        tidy();
        if (refocus && a && a.isConnected) a.focus();
    }
    document.addEventListener("pointerdown", (e) => {
        if (stack.length && !stack.some((s) => s.el.contains(e.target) || s.anchor.contains(e.target))) closeMenus();
        if (pop && !pop.el.contains(e.target) && !pop.anchor.contains(e.target) && !e.target.closest(".dpg-menu")) { pop.model.pop = false; closePop(); }
    }, true);
    // Tab off either end of this page's popover closes it here (the shell's rule would leave the page)
    window.addEventListener("keydown", (e) => {
        if (!pop || e.key !== "Tab" || !pop.el.contains(document.activeElement)) return;
        const stops = [...pop.el.querySelectorAll('input, [tabindex="0"]')].filter((x) => x.getClientRects().length);
        const i = stops.indexOf(document.activeElement);
        if (!(e.shiftKey ? i <= 0 : i === stops.length - 1)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        pop.model.pop = false;
        closePop(true);
    }, true);
    // only when this page has something open: tidy() would otherwise hide the overlay layer another section is filling
    window.addEventListener("hashchange", () => { if (stack.length) closeMenus(); closePop(); });

    // ---------- render ----------
    let model = null;
    function render(el, state) {
        if (!model || model.state !== state) {
            model = Object.assign({ state }, (STATES[state] || STATES.entries)());
            model.first = true;
        }
        stack = [];
        pop = null;
        const m = model;
        const sel = () => table(m, m.sel) || visible(m)[0];
        const changed = () => { if (m.door.edit) m.dirty = true; };
        const redraw = (focusKey) => {
            const fk = focusKey || (document.activeElement && document.activeElement.closest("[data-k]") && document.activeElement.closest("[data-k]").dataset.k);
            closeMenus();
            const reopen = m.pop;
            closePop();
            // A choice re-reads the report: say the new result line, since nothing else announces it
            // ...and when Load turns off or back on, say that too: the reason line is not a live region
            const res = () => [...el.querySelectorAll(".dpg-rl-res")].map((x) => x.textContent).join(" ");
            const why = () => { const r = el.querySelector(".dpg-reason"); if (!r) return ""; const c = r.cloneNode(true); c.querySelectorAll("[aria-hidden=true]").forEach((x) => x.remove()); return c.textContent.trim(); };
            const before = res(), whyBefore = why();
            el.replaceChildren();
            build();
            const said = [res() && res() !== before ? res() : "", why() !== whyBefore ? why() || (m.door.verb || "Load") + " is on" : ""].filter(Boolean).join(". ");
            if (said) AB.announce(said);
            if (reopen) openSettings();
            if (fk) { const x = el.querySelector(`[data-k="${CSS.escape(fk)}"]`); const f = x && (x.matches(".k-seg") ? x.querySelector("[tabindex='0']") : x); if (f) f.focus(); }
        };
        const segOf = (opts, value, set, label, key, tips, off) => {
            const s = AB.seg(opts.map((o) => [o[0], o[1]]), value, (v) => { if (off && off[v]) return; set(v); redraw(key); }, { label });
            const radios = [...s.children];
            if (!radios.some((r) => r.tabIndex === 0)) radios[0].tabIndex = 0;
            radios.forEach((r, i) => {
                const v = opts[i][0];
                if (off && off[v]) { r.setAttribute("aria-disabled", "true"); r.classList.add("dpg-seg-off"); AB.tip(r, opts[i][1], { label: false, second: off[v] }); }
                else if (tips && tips[i]) AB.tip(r, tips[i], { label: false });
            });
            s.dataset.k = key;
            return s;
        };
        // A pointer-only target with the look of an icon button (no button role, no Tab stop)
        const pointerOnly = (ic, name, onClick) => {
            const x = h("span", { class: "k-icon-btn", "aria-hidden": "true" }, icon(ic, "sm"));
            x.addEventListener("click", onClick);
            x.click = () => onClick({ stopPropagation() {} });
            return AB.tip(x, name, { label: false });
        };
        const auto = (why) => (why ? AB.tip(h("span", { class: "dpg-auto", role: "note", tabindex: "0" }, "auto"), why === true ? "Worked out from the file's name and first line" : why) : null);
        // The glyph is drawn, not read: a screen reader hears the line's words, not "!"
        const glyph = (level) => h("span", { class: "k-warn-glyph" + (level === "err" ? " k-err-glyph" : ""), "aria-hidden": "true" }, "!");

        // ----- tables list -----
        function tablesList() {
            // One tree: tables, a graph file's two tables, and a JSON document's objects and arrays
            const ul = h("ul", { class: "dpg-list", role: "tree", "aria-label": "Tables" });
            const up = (t) => table(m, t.parent);
            // an array of records in a record hides once Several rows makes it a child table, which then shows in its place
            const isShown = (t) => !(t.inRec && m.tables.some((x) => x.childCol === t.inRec)) && (!t.parent || (up(t) && up(t).open && isShown(up(t))));
            const depth = (t) => (t.parent && up(t) ? depth(up(t)) + 1 : 0);
            const hasKids = (t) => m.tables.some((x) => x.parent === t.id);
            const shown = m.tables.filter(isShown);
            // a row the grid can show: a table, or a JSON document (its outline and its whole report)
            const selectable = (t) => !t.struct && !(t.group && t.kind !== "json");
            const status = (t) => {
                if (t.struct) return h("span");
                if (t.tick === false) return h("span");
                if (t.reading) return AB.tip(h("span", { class: "dpg-warn", role: "img", "aria-label": "reading" }, icon("loader-circle", "sm")), "Reading " + t.file, { label: false });
                const p = problem(m, t);
                if (!p) return AB.tip(h("span", { class: "dpg-ok", role: "img", "aria-label": "ready" }, icon("circle-check", "sm")), "Ready: every role it needs is set and its report has nothing open", { label: false });
                return AB.tip(h("span", { class: p.level === "err" ? "dpg-err" : "dpg-warn", role: "img", "aria-label": p.level === "err" ? "refused" : "needs a choice" }, icon(p.level === "err" ? "circle-x" : "triangle-alert", "sm")), (t.path || t.name) + ": " + p.text, { label: false });
            };
            const removeRow = (t) => {
                const i = m.tables.indexOf(t);
                const gone = [t].concat(below(m, t));
                m.tables = m.tables.filter((x) => !gone.includes(x));
                if (gone.some((x) => x.id === m.sel)) m.sel = (visible(m)[0] || m.tables[0] || {}).id;
                changed();
                redraw();
                AB.deleted(fileOf(m, t) || t.name, () => { m.tables.splice(i, 0, ...gone); redraw(); });
            };
            // A child table's one home is its column's role menu: its Remove says so
            const childWhy = (t) => "Untick it, or choose another outcome under " + t.childCol.split(".").pop() + " in " + t.childOf;
            // an array of records in a record is used as a table by Several rows (a child table); unticking keeps it as one value
            const isOn = (t) => (t.childOf ? true : t.inRec ? false : t.tick !== false);
            const tick = (t) => {
                if (t.inRec || t.childOf) {
                    const p = t.inRec ? up(t) : table(m, t.childOf), c = t.inRec || t.childCol, on = !!t.inRec;
                    setArr(p, c, on ? "rows" : "one", "t:" + (on ? c.split(".").pop() : "s:" + p.id + "." + c));
                    AB.announce(t.path + (on ? " is used as a table, one row per item" : " is kept as one value"));
                    return;
                }
                t.tick = !t.tick; changed(); redraw("t:" + t.id); AB.announce(t.path + (t.tick ? " is used as a table" : " is not used"));
            };
            shown.forEach((t) => {
                const kid = !!t.parent && !t.childOf;
                const selected = t.id === m.sel || (t.group && t.kind !== "json" && !shown.some((x) => x.parent === t.id) && m.sel.startsWith(t.id));
                const kidsHere = hasKids(t);
                const disc = kidsHere ? AB.iconButton(t.open ? "chevron-down" : "chevron-right", t.open ? "Collapse" : "Expand", { onClick: (e) => { e.stopPropagation(); t.open = !t.open; redraw("t:" + t.id); } }) : h("span");
                disc.tabIndex = -1;
                let rm;
                if (t.childOf) { rm = AB.tip(h("span", { class: "k-icon-btn dpg-rm", "aria-hidden": "true", "aria-disabled": "true" }, icon("minus", "sm")), "Remove " + t.name, { label: false, second: childWhy(t) }); }
                else if (kid) rm = h("span");
                else rm = pointerOnly("minus", "Remove " + t.name, (e) => { e.stopPropagation(); removeRow(t); });
                rm.classList.add("dpg-rm");
                // The "-" is the pointer's way to Remove: a plain target, not a button, because a control
                // inside a tree item is not announced as one. Delete on the row and its context menu are
                // the keyboard's and screen reader's way to the same command
                const rows = rowsOf(m, t);
                const jsonRow = t.struct || (t.json && !t.group) || t.childOf;
                // JSON rows count their items, never their leaf values: [170] for an array, {1,204} for an object
                const countText = t.gone ? "" : t.struct ? (t.struct === "array" ? "[" + n(t.count) + "]" : "{" + n(t.count) + "}") : jsonRow && rows != null ? (t.keyed ? "{" + n(rows) + "}" : "[" + n(rows) + "]") : rows != null ? (t.kind === "node" && t.type ? plusAdded(m, t.type, rows) : n(rows)) : "";
                const ticks = (t.json && !t.group && !t.struct && !t.childOf) || !!t.inRec || !!t.childOf;
                const box = ticks ? h("span", { class: "k-check", "aria-hidden": "true", "aria-checked": String(isOn(t)) }) : null;
                if (box) { AB.tip(box, "Use as table", { label: false }); box.addEventListener("click", (e) => { e.stopPropagation(); tick(t); }); }
                const glyphOf = t.struct ? AB.tip(h("span", { class: "ab-abc", role: "img", "aria-label": t.struct === "array" ? "array" : "object" }, t.struct === "array" ? "[ ]" : "{ }"), t.struct === "array" ? "An array" + (t.unread ? "; not read" : "") : "An object" + (t.unread ? "; not read" : ""), { label: false })
                    : t.group ? AB.tip(h("span", { role: "img", "aria-label": KIND_WORD[t.kind] }, icon(KIND_ICON[t.kind], "sm")), KIND_WORD[t.kind], { label: false })
                    : AB.tip(h("span", { role: "img", "aria-label": KIND_WORD[t.kind] }, icon(KIND_ICON[t.kind], "sm")), KIND_WORD[t.kind], { label: false });
                // A JSON row shows its last segment under its parent (the indent shows where it sits); the full path is in its tooltip and name
                // A JSON row shows its dotted path, [] for each array, with the middle ellipsis when it does not fit
                const label = jsonRow ? AB.truncMiddle(t.path, 48) : h("span", { class: "k-ellipsis" }, t.name);
                if (jsonRow) label.dataset.full = t.path;
                const li = h("li", { class: "dpg-t", role: "treeitem", "data-k": "t:" + t.id, tabindex: selected ? "0" : "-1", "aria-selected": selectable(t) ? String(!!selected) : null, "aria-level": String(depth(t) + 1),
                    "aria-expanded": kidsHere ? String(!!t.open) : null, "aria-checked": ticks ? String(isOn(t)) : null, "aria-label": (jsonRow ? t.path : t.name) + (countText ? ", " + countText : "") + (t.unread ? ", not read" : "") + (t.gone ? ", no longer in the file" : ""),
                    "aria-keyshortcuts": kid || t.struct ? null : "Delete Shift+F10", "data-unread": t.unread ? "" : null, "data-gone": t.gone ? "" : null, style: "--dpg-d:" + depth(t) },
                    disc, glyphOf, h("span", { class: "dpg-name" }, box, label), h("span", { class: "dpg-n" }, countText), status(t), rm);
                if (!jsonRow) AB.tip(li.querySelector(".dpg-name"), (fileOf(m, t) || t.name) + (rows != null ? ", " + n(rows) + " rows" : ""), { label: false });
                else if (t.unread) AB.tip(li.querySelector(".dpg-name"), t.path + ": not read; it holds no array of records", { label: false });
                else if (t.inRec) AB.tip(li.querySelector(".dpg-name"), t.path + ": an array of records in each " + up(t).type + ", now " + ARR_WORD[(up(t).arrs[t.inRec] || {}).pick] + ". Tick it to use it as a table, one row per item, or choose what it becomes in the " + t.inRec + " column's role menu", { label: false });
                li.addEventListener("click", () => {
                    // an array of records in a record: its home is its column, so the row goes there
                    if (t.inRec) { m.sel = t.parent; m.filter = null; redraw(); goTo(t.inRec); return; }
                    if (t.struct) { t.open = !t.open; redraw("t:" + t.id); return; }
                    if (t.group && t.kind !== "json") { t.open = true; m.sel = m.tables.find((x) => x.parent === t.id).id; } else m.sel = t.id;
                    m.filter = null;
                    redraw("t:" + m.sel);
                });
                const rowMenu = () => pickMenu(li, [{ heading: t.name }, t.childOf ? { label: "Remove", shortcut: "Del", disabled: childWhy(t) } : { label: "Remove", shortcut: "Del", onClick: () => removeRow(t) }], { label: t.name });
                const menuOk = !kid && !t.struct && !ticks;
                if (menuOk) li.addEventListener("contextmenu", (e) => { e.preventDefault(); rowMenu(); });
                li._menu = menuOk ? rowMenu : null;
                li._t = t;
                ul.append(li);
            });
            if (!shown.length) ul.append(h("li", { role: "none" }, AB.empty("No tables.", { verb: "Add a file", onClick: () => AB.flash("Opens the file picker") })));
            // One Tab stop: Up and Down move (and show a table), Right and Left open and close or go to
            // the parent, Space ticks an array, Home and End, Delete removes, Shift+F10 the row menu
            ul.addEventListener("keydown", (e) => {
                const items = [...ul.querySelectorAll(".dpg-t")];
                const i = items.indexOf(document.activeElement);
                if (i < 0) return;
                const li = items[i], t = li._t;
                const moveTo = (nx) => { if (!nx) return; items.forEach((x) => (x.tabIndex = -1)); nx.tabIndex = 0; if (selectable(nx._t)) nx.click(); else nx.focus(); };
                const d = { ArrowDown: 1, ArrowUp: -1 }[e.key];
                if (d) { e.preventDefault(); moveTo(items[(i + d + items.length) % items.length]); }
                else if (e.key === "Home" || e.key === "End") { e.preventDefault(); moveTo(e.key === "Home" ? items[0] : items[items.length - 1]); }
                else if (e.key === "ArrowRight") { e.preventDefault(); if (hasKids(t) && !t.open) { t.open = true; redraw("t:" + t.id); } else if (hasKids(t)) moveTo(items[i + 1]); }
                else if (e.key === "ArrowLeft") { e.preventDefault(); if (hasKids(t) && t.open) { t.open = false; redraw("t:" + t.id); } else if (t.parent) moveTo(items.find((x) => x._t.id === t.parent)); }
                else if (e.key === " ") { e.preventDefault(); if (li.hasAttribute("aria-checked")) tick(t); else if (hasKids(t)) { t.open = !t.open; redraw("t:" + t.id); } }
                else if (e.key === "Enter") { e.preventDefault(); li.click(); }
                else if (e.key === "Delete") { const b = li.querySelector(".dpg-rm"); if (t.childOf) { e.preventDefault(); AB.flash("Remove is off: " + childWhy(t)); } else if (b && b.click && !t.struct) { e.preventDefault(); b.click(); } }
                else if ((e.key === "F10" && e.shiftKey) || e.key === "ContextMenu") { if (li._menu) { e.preventDefault(); li._menu(); } }
            });
            const add = AB.plus({ label: "Add a table", items: [{ label: "File...", desc: "A CSV, GEXF, GraphML, GML, DOT, Pajek or JSON file; a file dropped on this page lands here too" }, { label: "From a URL..." }, { label: "Paste..." }], onAdd: (it) => {
                if (it.label === "File...") AB.flash("Opens the file picker");
                else if (it.label === "From a URL...") AB.go("data-page", "url");
                else AB.go("data-page", "detect-several");
            } });
            return h("div", { class: "dpg-tables" }, AB.section({ title: "Tables", editable: true, actions: add }, ul));
        }

        // ----- model strip -----
        function modelStrip() {
            // an undirected graph draws its edges without arrowheads
            const lines = m.direction === "undirected" ? strip(m).map((l) => Object.assign({}, l, { text: l.text.replace(/<--/g, "--").replace(/-->/g, "--") })) : strip(m);
            return h("div", { class: "dpg-strip", role: "group", "aria-label": "What the tables make (read-only)" },
                h("span", { class: "dpg-strip-h" }, "Makes"),
                lines.length ? lines.map((l) => AB.tip(h("span", { class: "dpg-line", role: "note", tabindex: "0", "aria-label": l.text + ". " + l.tip }, l.text), l.tip, { label: false })) : h("span", { class: "k-secondary" }, visible(m).some((t) => !t.refusal && t.kind !== "text") ? "Nothing yet: set the roles under the column headers" : "Nothing yet"));
        }

        // ----- header strip -----
        function headStrip(t) {
            const kids = [];
            // the format line, which opens File settings
            if (t.url) {
                const inp = h("input", { class: "k-field k-id", type: "url", value: t.url, "aria-label": "Address", spellcheck: "false", "data-k": "addr" });
                inp.addEventListener("change", () => { t.url = inp.value.trim(); AB.flash("Fetches the address, with 3 tries"); });
                kids.push(h("span", { class: "dpg-ctl" }, h("span", { class: "dpg-lab" }, "Address"), inp));
            }
            const fmtText = t.kind === "text" && !t.format ? (t.candidates && t.candidates.length ? "Choose: " + t.candidates.join(" or ") : "Choose a format") : t.format + (t.format === "CSV" ? ", " + t.sep.toLowerCase() : t.dialect ? ", " + t.dialect : ""); // the JSON dialect graph-io detected says why roles are locked
            const fmt = AB.field(fmtText, { icon: t.pasted ? "type" : t.url ? "link" : "file", caret: true, onClick: (e) => (m.pop ? (m.pop = false, closePop(true)) : openSettings(e.currentTarget)) });
            fmt.dataset.k = "fmt";
            fmt.dataset.fmt = "";
            fmt.setAttribute("aria-haspopup", "dialog");
            fmt.setAttribute("aria-label", "File settings: " + fmtText);
            if (t.kind === "text" || t.refusal) fmt.classList.add("dpg-miss");
            kids.push(h("span", { class: "dpg-ctl" }, t.url ? null : h("span", { class: "dpg-lab" }, t.pasted ? "Pasted, " + t.pasted.split("\n").length + " lines" : t.path ? AB.truncMiddle(t.path, 32) : fileOf(m, t)), fmt, auto(t.auto.format && t.format && (t.auto.format === true ? "Worked out from the file's name and first line" : t.auto.format))));
            // an array that is not used has no row controls until it is (its grid says "Use as table")
            if (t.kind === "text" || t.kind === "json" || t.gone || (t.json && t.tick === false) || (t.refusal && (t.refusal.terminal || !t.cols.length))) return h("div", { class: "dpg-head" }, kids);
            // Each row is
            if (t.locked) kids.push(h("span", { class: "dpg-locked" }, icon("lock", "sm"), "Each row is " + (t.kind === "edge" ? "an edge" : "a node") + ": set by the file"));
            else {
                const lk = linkCols(t).length;
                const off = t.kind === "node" && lk !== 2 ? { edge: "An edge needs exactly two linking columns; this table has " + ["none", "one", "two", "three", "four"][lk] } : null;
                kids.push(h("span", { class: "dpg-ctl" }, h("span", { class: "dpg-lab" }, "Each row is"), segOf([["node", "a node"], ["edge", "an edge"]], t.kind, (v) => {
                    if (v === t.kind) return;
                    if (v === "node") { toNodes(t, t.typeName || t.name); t.per = "row"; delete t.roles.count; }
                    else { t.kind = "edge"; const [a, b] = linkCols(t); t.roles[a].r = "from"; t.roles[b].r = "to"; delete t.type; if (colWith(t, "key")) delete t.roles[colWith(t, "key")]; }
                    changed();
                }, "Each row is", "kind", ["Each row of " + t.name + " becomes a node", "Each row of " + t.name + " becomes an edge between the two nodes it names"], off), off ? h("span", { class: "k-secondary" }, off.edge) : null, endsOf(t)));
            }
            // Type, or One edge per
            if (t.kind === "node" && !t.locked) {
                const tc = colWith(t, "type");
                const others = types(m).filter((x) => x.table !== t);
                let ctl;
                // A Subtype-role column is a subtype of this table's nodes; the type stays the table's
                if (tc) ctl = h("span", { class: "dpg-locked" }, (t.type || t.name) + "; subtypes from " + tc + ": " + typeLabel(t));
                else {
                    const cur = t.addsTo || t.type;
                    const items = [{ heading: "Existing types" }].concat(others.length ? others.map((x) => ({ label: x.name, check: t.addsTo === x.name, desc: "Adds this table's columns to " + x.name + " nodes by key, keeping every node", onClick: () => { t.addsTo = x.name; changed(); redraw("type"); } })) : [{ label: "None yet", disabled: "No other node table on this page" }],
                        [{ sep: true }, { label: "New type: " + (t.addsTo ? t.name : cur), check: !t.addsTo, onClick: () => { t.addsTo = null; t.type = t.type || t.name; changed(); redraw("type"); } }],
                        t.addsTo ? [] : [{ sep: true }, { label: "Rename type...", desc: "The one place a type is named; notes, sets and pins on its nodes follow the new name", onClick: () => nameType(el.querySelector('[data-k="type"]'), "Rename type", cur, (v) => { renameType(cur, v); t.type = v; }) }]);
                    ctl = AB.field(cur, { caret: true, onClick: (e) => pickMenu(e.currentTarget, items, { label: "Type" }) });
                    ctl.dataset.k = "type";
                    ctl.setAttribute("aria-haspopup", "menu");
                    ctl.setAttribute("aria-label", "Type: " + cur);
                }
                kids.push(h("span", { class: "dpg-ctl" }, h("span", { class: "dpg-lab" }, "Type"), ctl));
                if (!colWith(t, "key") && linkCols(t).length) kids.push(h("span", { class: "dpg-ctl" }, h("span", { class: "dpg-lab" }, "Key"), h("span", { class: "dpg-locked" }, "row number (no Key column)")));
            }
            if (t.kind === "edge" && !t.locked) {
                kids.push(h("span", { class: "dpg-ctl" }, h("span", { class: "dpg-lab" }, "One edge per"), segOf([["row", "Row"], ["pair", "Pair"]], t.per, (v) => {
                    t.per = v;
                    if (v === "pair") {
                        t.cols.forEach((c) => { if (!["from", "to", "edgeId"].includes(roleOf(t, c))) t.combine[c] = t.combine[c] || (COMBINE[typeOfCol(t, c)] || COMBINE.cat)[0][0]; /* bool, a list or a whole value combine as a category */ });
                        // count becomes the weight only when the table has none; a weight the reader set keeps
                        // its role and combines by its Combine (Sum by default)
                        if (!colWith(t, "weight")) t.roles.count = role("weight");
                    } else { delete t.roles.count; }
                    changed();
                }, "One edge per", "per", ["Every row its own edge", "One edge per pair of ends, with a count" + (m.direction === "undirected" ? "; (a, b) and (b, a) are one pair" : "")])));
            }
            // The weight is always said: with no Weight column, one quiet line
            if (t.kind === "edge" && !colWith(t, "weight")) kids.push(AB.tip(h("span", { class: "dpg-locked", role: "note", tabindex: "0" }, "Weight: none (each edge counts 1)"), "Choose Weight in a Number column's role menu, under its header", { label: false }));
            return h("div", { class: "dpg-head" }, kids);
        }

        // An edge table's two ends in words: "researcher to institution"
        function endsOf(t) {
            if (t.kind !== "edge") return null;
            const f = t.roles[colWith(t, "from")], to = t.roles[colWith(t, "to")];
            const w = (r) => (r.any ? r.any.join(" or ") : r.target);
            return f && to ? h("span", { class: "k-secondary" }, w(f) + " to " + w(to)) : null;
        }

        // ----- File settings popover -----
        function openSettings(anchor) {
            const t = sel();
            anchor = anchor || el.querySelector("[data-fmt]");
            if (!anchor) return;
            closeMenus();
            closePop();
            const cand = t.candidates || [];
            const fmtItems = (cand.length ? [{ heading: "Matches this text" }].concat(cand.map((c) => ({ label: c, desc: FORMATS.find((f) => f[0] === c)[1] })), [{ sep: true }]) : [])
                .concat(FORMATS.filter((f) => !cand.includes(f[0])).map((f) => ({ label: f[0], desc: f[1] })))
                .concat([{ sep: true }, { heading: "Named, but nothing reads them" }], Object.keys(UNSERVED).map((k) => ({ label: k, disabled: UNSERVED[k] })))
                .map((it) => (it.sep || it.heading || it.disabled ? it : Object.assign(it, { check: it.label === t.format, onClick: () => { setFormat(t, it.label); m.pop = true; redraw("fmt"); } })));
            const pickField = (value, items, name, k) => { const f = AB.field(value, { caret: true, onClick: (e) => pickMenu(e.currentTarget, items, { label: name }) }); f.setAttribute("aria-label", name + ": " + value); f.setAttribute("aria-haspopup", "menu"); f.dataset.k = k; return f; };
            const rows = [];
            rows.push(AB.fieldRow("Format", h("span", { class: "dpg-ctl" }, pickField(t.format || (cand.length ? "Choose: " + cand.join(" or ") : "Choose a format"), fmtItems, "Format", "p-fmt"), auto(t.format && t.auto.format && (t.auto.format === true ? "Worked out from the file's name and first line" : t.auto.format))), { popover: true }));
            if (t.format === "CSV") {
                const s = AB.seg([["Comma", "Comma"], ["Tab", "Tab"], ["Semicolon", "Semicolon"], ["Pipe", "Pipe"]], t.sep, (v) => { t.sep = v; t.auto.sep = false; if (t.refusal && t.refusal.setting && v === "Semicolon") t.refusal = null; m.pop = true; changed(); redraw("p-sep"); }, { label: "Separator" });
                s.dataset.k = "p-sep";
                rows.push(AB.fieldRow("Separator", h("span", { class: "dpg-ctl" }, s, auto(t.auto.sep && "Worked out from the first line")), { popover: true }));
            }
            if (t.url) rows.push(AB.fieldRow("Tries", h("span", { class: "k-secondary", style: "line-height:24px" }, "3, then it stops and says so"), { popover: true }));
            m.ids = m.ids || IDS[0][0];
            rows.push(AB.fieldRow("Ids", pickField(m.ids, IDS.map(([label, desc]) => ({ label, desc, check: label === m.ids, onClick: () => { m.ids = label; m.pop = true; redraw("p-ids"); } })), "Ids", "p-ids"), { popover: true }));
            m.stop = m.stop || STOPS[1];
            rows.push(AB.fieldRow("Stop reading", pickField(m.stop, STOPS.map((label) => ({ label, check: label === m.stop, onClick: () => { m.stop = label; m.pop = true; redraw("p-stop"); } })), "Stop reading", "p-stop"), { popover: true }));
            const p = AB.popover({ anchor, title: "File settings: " + (t.pasted ? "pasted text" : fileOf(m, t) || t.name), body: h("div", { class: "dpg-pop" }, rows, h("div", { class: "k-secondary", style: "padding:4px 16px 0" }, "Position scale appears here once a column is a Position.")), width: 380, place: "below-start" });
            p.querySelector(".k-popover-head .k-icon-btn").replaceWith(AB.iconButton("x", "Close", { key: "Esc", onClick: () => { m.pop = false; closePop(true); } }));
            p.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); m.pop = false; closePop(true); } });
            const Ly = layer();
            Ly.hidden = false;
            Ly.append(p);
            pop = { el: p, anchor, model: m };
            m.pop = true;
            anchor.setAttribute("aria-expanded", "true");
            requestAnimationFrame(() => requestAnimationFrame(() => { if (!pop || stack.length) return; const f = p.querySelector(".k-popover-body [tabindex='0'], .k-popover-body input"); if (f && !p.contains(document.activeElement)) f.focus(); }));
        }
        // ----- naming a type: the one name field (Rename type... and a link's New type...) -----
        function nameType(anchor, title, value, onSave) {
            if (!anchor) return;
            closeMenus();
            closePop();
            const inp = h("input", { class: "k-field", value, "aria-label": "Type name", spellcheck: "false", "data-k": "type-name" });
            const save = () => { const v = inp.value.trim(); if (!v) return; closePop(); onSave(v); changed(); redraw(); AB.announce(title + ": " + v); };
            inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); save(); } });
            const p = AB.popover({ anchor, title, body: h("div", { class: "dpg-pop" }, AB.fieldRow("Name", inp, { popover: true })), foot: AB.button("Save", { onClick: save }), width: 300, place: "below-start" });
            p.querySelector(".k-popover-head .k-icon-btn").replaceWith(AB.iconButton("x", "Close", { key: "Esc", onClick: () => closePop(true) }));
            p.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePop(true); } });
            const Ly = layer();
            Ly.hidden = false;
            Ly.append(p);
            pop = { el: p, anchor, model: {} };
            requestAnimationFrame(() => requestAnimationFrame(() => { inp.focus(); inp.select(); }));
        }
        // graphty-element's forwarding step: every link to the old name follows the new one
        function renameType(from, to) {
            m.tables.forEach((x) => { Object.values(x.roles).forEach((r) => { if (r && r.target === from) r.target = to; }); if (x.addsTo === from) x.addsTo = to; });
        }
        function setFormat(t, f) {
            t.format = f;
            t.auto.format = false;
            if (t.kind === "text" && !(t.candidates || []).includes(f)) t.refusal = { setting: true, text: "Line 1 is not " + f + ", so nothing could be read.", todo: "Choose another format in File settings, or paste a file's text as it is saved.", settings: true };
            else if (t.kind === "text" && t.pasted) {
                // the pasted text reads as one graph file: a nodes table and an edges table
                const i = m.tables.indexOf(t);
                const nodes = mk({ id: "paste-nodes", parent: "paste", name: "nodes", rows: 3, cols: ["id", "label"], format: f, locked: true, type: "node", types: { id: "cat", label: "cat" }, unique: ["id"], sample: [{ id: "0", label: "Myriel" }, { id: "1", label: "Napoleon" }, { id: "2", label: "Mlle.Baptistine" }], roles: { id: role("key", null, null, { locked: true }), label: role("name", null, null, { auto: true }) } });
                const edges = mk({ id: "paste-edges", parent: "paste", name: "edges", rows: 2, cols: ["source", "target", "value"], kind: "edge", format: f, locked: true, types: { source: "cat", target: "cat", value: "num" }, sample: [{ source: "1", target: "0", value: "1" }, { source: "2", target: "0", value: "8" }], roles: { source: role("from", "node", "id", { locked: true }), target: role("to", "node", "id", { locked: true }) } });
                Object.assign(t, { group: true, kind: "file", open: true, name: "Pasted text" });
                m.tables.splice(i + 1, 0, nodes, edges);
                m.sel = "paste-nodes";
            }
        }

        // ----- the role menu -----
        // Any of these types...: a third level, the types with how many values each matches; a tick stays open
        function anyMenu(anchor, t, c, r, tys) {
            while (stack.length > 2) closeSub();
            const rr = t.roles[c] && t.roles[c].r === r ? t.roles[c] : null;
            const now = rr ? rr.any || (rr.target ? [rr.target] : []) : [];
            const counts = c === "target" && t.id === "links" ? { researcher: NREP.linksToResearcher, institution: NREP.linksToInstitution } : c === "source" && t.id === "links" ? { researcher: t.rows, institution: 0 } : {};
            const items = tys.map((x) => ({ label: x.name + (counts[x.name] != null ? " (" + n(counts[x.name]) + ")" : ""), check: now.includes(x.name), desc: counts[x.name] != null ? n(counts[x.name]) + " values of " + c + " are a " + x.name + "'s " + x.unique[0] : null,
                onClick: () => {
                    const next = now.includes(x.name) ? now.filter((y) => y !== x.name) : now.concat([x.name]);
                    if (!next.length) return;
                    t.roles[c] = next.length === 1 ? role(r, next[0], "id") : role(r, null, "id", { any: next });
                    changed();
                    model.after = () => redraw("r:" + c);
                    closeSub();
                    anyMenu(anchor, t, c, r, tys);
                } }));
            const mn = AB.menu({ anchor, place: "right-start", items, label: "Any of these types", onClose: () => closeSub() });
            mn.classList.add("dpg-menu");
            layer().append(mn);
            stack.push({ el: mn, anchor });
            requestAnimationFrame(() => requestAnimationFrame(() => { const f = mn.querySelector(".k-menu-item"); if (f) f.focus(); }));
        }
        // The four outcomes of an array (or an object keyed by ids) in a record, each with what it makes
        const arrTarget = (t, c) => (t.arrs[c].items === "object" ? "package" : (t.roles[c] && t.roles[c].target) || (c === "relationships.coauthor_ids" ? "researcher" : null));
        // What an array in a record becomes: the role menu's four outcomes and the tree's Use as table (Several rows) both set it here
        function setArr(t, c, pick, focusKey) {
            const a = t.arrs[c];
            a.pick = pick;
            if (pick === "edges") t.roles[c] = role("links", arrTarget(t, c), a.items === "object" ? "key" : "id", { each: true }); else delete t.roles[c];
            if (pick === "rows" && !m.tables.some((x) => x.childOf === t.id && x.childCol === c)) { t.open = true; insertChild(m, t, childRows(t, c)); }
            if (pick !== "rows") { const ch = m.tables.find((x) => x.childOf === t.id && x.childCol === c); if (ch) { m.tables = m.tables.filter((x) => x !== ch); if (m.sel === ch.id) m.sel = t.id; } }
            changed();
            redraw(focusKey || "r:" + c);
        }
        function arrayItems(t, c) {
            const a = t.arrs[c], recs = a.items === "records", obj = a.items === "object";
            const target = arrTarget(t, c);
            const set = (pick) => () => setArr(t, c, pick);
            const rowsN = n(t.rows), itemsN = n(a.n);
            // One edge per Pair merges the pairs both ends list: the count the model strip will show
            const edgesN = c === "relationships.coauthor_ids" && m.coPer === "pair" ? n(NREP.coauthorPairs) : itemsN;
            return [
                { label: "One value (" + rowsN + " values)", check: a.pick === "one", desc: "Each record keeps its " + (obj ? "object" : "array") + " whole as one value", onClick: set("one") },
                // an object keyed by names lists its keys, as Several edges reads them; its values are dropped
                { label: "Several values" + (obj ? ": the " + target + " names" : "") + (recs ? "" : " (" + itemsN + " values)"), check: a.pick === "values", desc: obj ? "A list of its keys; the " + c.split(".").pop() + " values (version ranges) are dropped. A filter step matches when any item does" : "A list attribute: a filter step matches when any item does", disabled: recs ? "Several values needs single values; these items are records" : null, onClick: set("values") },
                { label: "Several edges: Links to " + (target || "a new type") + ", each " + (obj ? "key" : "item") + (recs ? "" : " (" + edgesN + " edges)"), check: a.pick === "edges", desc: obj ? "Each key becomes an edge to that " + target + "; its version range becomes the edge's value" : "Each item becomes an edge to the " + (target || "node") + " it names",
                    disabled: recs ? "Several edges needs ids; these items are records" : null, onClick: target ? set("edges") : () => nameType(el.querySelector(`[data-k="r:${CSS.escape(c)}"]`), "New type from " + c, c.split(".").pop().replace(/s$/, ""), (v) => { a.pick = "edges"; t.roles[c] = role("links", v, null, { each: true, fresh: true }); }) },
                { label: "Several rows" + (recs ? " (" + itemsN + " rows)" : ""), check: a.pick === "rows", desc: "A child table under " + t.name + ", one row per item, its first column the parent", disabled: recs ? null : "Several rows needs records; these items are single values", onClick: set("rows") },
            ];
        }
        function roleItems(t, c) {
            if (t.arrs && t.arrs[c]) return arrayItems(t, c);
            const cur = roleOf(t, c);
            const ty = typeOfCol(t, c);
            const set = (r, target, by, fresh) => () => {
                const prev = UNIQUE.has(r) || r === "weight" ? colWith(t, r) : null;
                if (prev && prev !== c) delete t.roles[prev];
                if (r === "attr") delete t.roles[c];
                else t.roles[c] = role(r, target, by, fresh ? { fresh: true } : null);
                if (r === "weight" && prev && prev !== c) AB.notice("Weight moved from " + prev + " to " + c, { label: "Undo", onClick: () => { t.roles[prev] = role("weight"); delete t.roles[c]; redraw(); } });
                changed();
                redraw("r:" + c);
            };
            const o = roleItems.auto || {};
            roleItems.auto = null;
            const link = (r) => ({ label: ROLE_WORD[r] + " ->", sub: true, check: cur === r, desc: r === "links" ? "This row's node gets an edge to the node this value names" : null, onClick: (e) => {
                const item = e.currentTarget;
                while (stack.length > 1) closeSub();
                const tys = types(m).filter((x) => x.table !== t || r === "links");
                const items = [];
                if (!tys.length) items.push({ label: "node", desc: "One new type for every value in the two link columns", check: cur === r, onClick: set(r, "node", null) });
                tys.forEach((x) => x.unique.forEach((u, i) => items.push({ label: x.name + " by " + u + (i === 0 ? " (Key)" : ""), desc: i === 0 ? "Matches " + c + " to " + x.table.name + "." + u + ", its Key" : "Matches " + c + " to " + x.table.name + "." + u + ", a unique column; the Key stays " + x.unique[0], check: cur === r && t.roles[c].target === x.name && (t.roles[c].by || x.unique[0]) === u, onClick: set(r, x.name, u) })));
                // New type... names the type in a name field, prefilled with the column name without "_id";
                // choosing it again on a link to a type no table makes renames that type
                const fresh = cur === r && t.roles[c].fresh ? t.roles[c].target : null;
                const any = cur === r && t.roles[c].any;
                items.forEach((x) => { if (any) x.check = false; });
                // Any of these types...: the column may point at several types; the report counts each
                if (tys.length > 1) items.push({ label: "Any of these types...", check: !!any, keep: true, desc: "Ticks the types a value of " + c + " may name; a value that matches two types is refused", onClick: () => anyMenu(fl.querySelector('[aria-label="Any of these types..."]') || fl, t, c, r, tys) });
                items.push({ sep: true }, { label: "New type...", check: !!fresh, desc: fresh ? "Renames " + fresh + ", the type this column makes" : "Each value of " + c + " becomes a node of a new type; you name it next", onClick: () => {
                    nameType(el.querySelector(`[data-k="r:${CSS.escape(c)}"]`), fresh ? "Rename type " + fresh : "New type from " + c, fresh || c.replace(/_id$/, ""), (v) => {
                        if (fresh) renameType(fresh, v);
                        else t.roles[c] = role(r, v, null, { fresh: true });
                    });
                } });
                const fl = subList(item, items, ROLE_WORD[r] + " which type, by which column");
                if (o.any && tys.length > 1) { o.any = false; requestAnimationFrame(() => requestAnimationFrame(() => { const x = fl.querySelector('[aria-label="Any of these types..."]'); if (x) x.click(); })); }
                return fl;
            } });
            const tw = (t.roles[c] || {}).any ? t.roles[c].any.join(" or ") : (t.roles[c] || {}).target;
            const linkWord = { key: "names each node", from: "links each row to " + tw, to: "links each row to " + tw, links: "links each row to " + tw }[cur];
            // short reasons, naming the type as the column's glyph tooltip does
            const needNum = linkWord ? "Already " + (cur === "key" ? "the Key" : "a link") + "; a weight needs its own column" : ty === "num" ? null : "Reads as " + TYPE_WORD[ty] + "; needs a Number";
            const needTime = ty === "time" || ty === "num" ? null : "Reads as " + TYPE_WORD[ty] + "; needs Time, or a Number of seconds since 1970";
            // A Number column becomes Time here, with its unit, before the load (no detour through the attribute)
            const timeNum = ty === "num" ? { sub: true, desc: "A Number of seconds or milliseconds since 1970 becomes Time when loaded", onClick: (e) => { while (stack.length > 1) closeSub(); pickMenu(e.currentTarget, [["s", "Seconds since 1970"], ["ms", "Milliseconds since 1970"]].map(([u, label]) => ({ label, check: cur === "time" && (t.roles[c] || {}).unit === u, onClick: () => { set("time")(); t.roles[c].unit = u; } })), { sub: true, label: "Time unit" }); } } : null;
            const needPos = ty === "num" ? null : "Reads as " + TYPE_WORD[ty] + "; needs a Number";
            const it = (r, extra) => Object.assign({ label: ROLE_WORD[r], check: cur === r, desc: ROLE_TIP[r], onClick: set(r) }, extra || {});
            const items = [];
            if (t.kind === "node") items.push(it("key", { desc: "Names each node; suggested from a column with \"id\" in its name and unique values" }), link("links"));
            // The count One edge per Pair derives cannot name an end: the pair's ends are its From and To
            else if (pairEdge(t) && c === "count") items.push(Object.assign(link("from"), { sub: false, onClick: null, disabled: "count is derived from the pair; the pair's ends are " + colWith(t, "from") + " and " + colWith(t, "to") }), Object.assign(link("to"), { sub: false, onClick: null, disabled: "count is derived from the pair; the pair's ends are " + colWith(t, "from") + " and " + colWith(t, "to") }));
            else items.push(link("from"), link("to"));
            const nm = nameColsOf(t).filter((x) => x !== c);
            items.push({ sep: true }, it("type"), it("name", nm.length ? { desc: cur === "name" ? "Part of " + AB.nameWord(nameColsOf(t)) + "; choose Attribute to take it out" : "Adds " + c + " to the Name: " + nm.concat(c).filter((x, i, a) => a.indexOf(x) === i).sort((a, b) => t.cols.indexOf(a) - t.cols.indexOf(b)).map((x) => x.split(".").pop()).join(" + ") } : null), it("time", needTime ? { disabled: needTime } : timeNum), it("weight", needNum ? { disabled: needNum } : { desc: "One weight per table; choosing it here moves it from another column" }));
            if (t.kind === "edge") items.push(it("edgeId"));
            items.push({ label: "Position", sub: true, check: ["x", "y", "z"].includes(cur), disabled: needPos || null, onClick: (e) => { while (stack.length > 1) closeSub(); pickMenu(e.currentTarget, ["x", "y", "z"].map((a) => ({ label: a, check: cur === a, onClick: set(a) })), { sub: true, label: "Position axis" }); } });
            items.push({ sep: true }, it("attr", { desc: "The default: kept as data, with no role" }));
            return items;
        }
        function openRoleMenu(btn, t, c, sub, any) {
            // the trigger of the open menu closes it, as every menu button does
            if (stack[0] && stack[0].anchor.dataset.k === btn.dataset.k && stack[0].anchor.isConnected) { closeMenus(true); return; }
            roleItems.auto = { any: !!any };
            const mn = pickMenu(btn, roleItems(t, c), { label: "Role of " + c });
            if (sub) requestAnimationFrame(() => requestAnimationFrame(() => {
                const item = [...mn.querySelectorAll(".k-menu-item")].find((x) => x.textContent.trim().startsWith(ROLE_WORD[sub]));
                if (item) { item.focus(); item.click(); }
            }));
        }

        // ----- sample grid -----
        function grid(t) {
            const wrap = h("div", { class: "dpg-grid", tabindex: "-1" });
            // A preview with nothing focusable inside (the raw document, preview rows) is itself a tab stop,
            // so a keyboard user can scroll it; a grid with focusable headers is reached through them
            requestAnimationFrame(() => { if (wrap.isConnected && !wrap.querySelector("[tabindex='0'], button, a[href], input")) { wrap.tabIndex = 0; wrap.setAttribute("role", "region"); wrap.setAttribute("aria-label", "Preview of " + (t.file || t.path || t.name)); } });
            if (t.pasted) { wrap.append(h("pre", { class: "dpg-pre", "aria-label": "Pasted text" }, t.pasted)); return [wrap]; }
            if (t.reading) {
                const pct = t.readRows ? Math.round((t.readRows / t.rows) * 100) : 40;
                wrap.append(h("div", { style: "padding:16px" }, h("div", { class: "k-secondary" }, "Reading " + t.file + (t.readRows ? ": " + n(t.readRows) + " of " + n(t.rows) + " rows" : "...")),
                    h("div", { class: "k-progress", role: "progressbar", "aria-label": "Reading " + t.file, "aria-valuenow": String(pct), "aria-valuetext": t.readRows ? n(t.readRows) + " of " + n(t.rows) + " rows" : null, style: "margin-top:8px;max-width:320px" }, h("i", { style: "width:" + pct + "%" }))));
                return [wrap];
            }
            // A JSON document: its first lines, as read (the tree on the left is its outline)
            if (t.kind === "json") {
                const doc = t.preview || (!t.refusal && m.json === "nested" ? NX().document : null);
                if (doc) wrap.append(h("pre", { class: "dpg-pre", "aria-label": "The first lines of " + t.file }, previewText(doc)));
                else wrap.append(AB.empty("Nothing to show: nothing was read."));
                return [wrap];
            }
            if (t.gone) { wrap.append(AB.empty("Nothing to show: " + t.path + " is not in the file any more.")); return [wrap]; }
            if (t.tick === false && !t.sample.length) { wrap.append(AB.empty(t.path + " is not used.", { verb: "Use as table", onClick: () => { t.tick = true; changed(); redraw("t:" + t.id); } })); return [wrap]; }
            if (t.refusal && (t.refusal.terminal || t.refusal.fetch || t.refusal.busy) && !t.sample.length) { wrap.append(AB.empty(t.refusal.busy ? "Not read." : t.refusal.fetch ? "Nothing to show: nothing was fetched." : t.rows === 0 ? "No rows under the header." : "Nothing to show: nothing was read.")); return [wrap]; }
            const cols = colsOf(t);
            const roleBtns = [];
            const frozen = frozenCol(t);
            const th = (c, ci) => {
                // time (latest): a derived column with no role of its own
                if (LATEST.test(c)) return h("th", { class: "dpg-derived", "aria-colindex": String(ci + 1), "data-col": c },
                    h("div", { class: "dpg-cn" }, h("span", { class: "k-id" }, c), AB.tip(h("span", { class: "dpg-auto", role: "note", tabindex: "0" }, "derived"), "The latest " + c.replace(LATEST, "") + " of each pair, kept as an attribute; " + c.replace(LATEST, "") + " (earliest) holds the Time role", { label: false })));
                const r = roleOf(t, c);
                const rr = t.roles[c] || {};
                const a = t.arrs && t.arrs[c];
                const ty = typeOfCol(t, c);
                const keyOfT = rr.target && (types(m).find((x) => x.name === rr.target) || {}).unique;
                const target = rr.any ? rr.any.join(" or ") : rr.target;
                const word = a && r !== "links" ? ARR_WORD[a.pick] : rr.each ? "Links to " + target + ", each " + (a && a.items === "object" ? "key" : "item") + (a ? " (" + n(c === "relationships.coauthor_ids" && m.coPer === "pair" ? NREP.coauthorPairs : a.n) + " edges)" : "") /* the role menu's count */
                    : ["from", "to", "links"].includes(r) ? ROLE_WORD[r] + " -> " + target + (rr.by && keyOfT && rr.by !== keyOfT[0] ? " by " + rr.by : "") : r === "name" ? AB.nameWord(nameColsOf(t)) : ROLE_WORD[r];
                const locked = rr.locked;
                const quiet = !hasRole(t, c) && !locked;
                // The default role reads as quiet text, not a dropdown; it is the same control
                const face = quiet ? h("span", { class: "dpg-quiet" }, word)
                    : [AB.roleTag(word, { second: locked ? (rr.parentCol ? "the parent record; set by the outcome Several rows" : "set by the file") : a ? ARR_TIP[a.pick] : ROLE_TIP[r] + (rr.by && rr.by !== "id" ? " (matched on " + rr.target + "." + rr.by + ")" : "") }), locked ? icon("lock", "sm") : icon("chevron-down", "sm")];
                const btn = h("span", { class: "dpg-role", role: "button", tabindex: "-1", "aria-haspopup": locked ? null : "menu", "aria-disabled": locked ? "true" : null, "data-set": quiet ? null : "", "data-k": "r:" + c,
                    "aria-label": "Role of " + c + ": " + word + (locked ? ", locked" : ""), "aria-description": (locked ? "set by the file" : a ? ARR_TIP[a.pick] : ROLE_TIP[r]) + ". Left and Right arrows move between columns" },
                    face, rr.auto ? auto("Suggested from the column's name and values") : null);
                if (!locked) btn.addEventListener("click", () => openRoleMenu(btn, t, c));
                roleBtns.push(btn);
                const glyphEl = ty === "list" ? icon("list", "sm") : ty === "whole" ? h("span", { class: "ab-abc" }, "{ }") : AB.typeGlyph(ty);
                // A link to the attribute only once it exists: editing a loaded source whose attribute has a
                // state of its own. Before Load (and for any other column) it is a mark: leaving would drop the load.
                const goAttr = m.door && m.door.edit && (GLYPH_GO[AB.route.frame.dataset] || {})[c];
                const gl = goAttr
                    ? h("span", Object.assign({ class: "dpg-glyph", role: "link", "aria-label": c + ": " + TYPE_WORD[ty] + ". Opens the attribute" }, AB.act({ go: ["inspector-attribute-and-filter-step", goAttr] })), glyphEl)
                    : h("span", { class: "dpg-glyph", role: "img", "aria-label": c + ": " + TYPE_WORD[ty] }, glyphEl);
                AB.tip(gl, TYPE_WORD[ty] + (goAttr ? ": change how it reads in the attribute's Read as" : ": after Load, change how it reads in the attribute's Read as"), { label: false });
                gl.tabIndex = -1; // not a Tab stop: the keyboard reaches the attribute from Data > Attributes
                const comb = t.per === "pair" && t.kind === "edge" && !["from", "to", "edgeId"].includes(r) && c !== "count"
                    ? (() => {
                        const opts = COMBINE[ty === "bool" ? "cat" : ty];
                        const v = t.combine[c] || opts[0][0];
                        const f = AB.field(v, { caret: true, onClick: (e) => pickMenu(e.currentTarget, opts.map(([label, desc]) => ({ label, desc, check: label === v, onClick: () => { t.combine[c] = label; changed(); redraw("c:" + c); } })), { label: "Combine " + c }) });
                        f.dataset.k = "c:" + c;
                        f.setAttribute("aria-label", "Combine " + c + ": " + v);
                        f.setAttribute("aria-haspopup", "menu");
                        if (ty === "time") AB.tip(f, "Never first or last: those follow file order, and a log is rarely sorted", { label: false });
                        return [h("div", { class: "dpg-comb" }, "Combine", f)];
                    })() : null;
                // An edge weight's meaning sits with it: two edge tables may mean different things; a node weight has none
                const means = r === "weight" && t.kind === "edge" && !locked
                    ? h("div", { class: "dpg-comb" }, "Higher means", segOf(MEANS.map((x) => [x[0], x[1]]), t.means || "stronger", (v) => { t.means = v; changed(); }, "Higher " + c + " means", "m:" + c, MEANS.map((x) => x[2])))
                    : null;
                // Long names and paths keep their start and end (the middle ellipsis); the full name is the tooltip
                const shown = twoTimes(t, c) ? c + " (earliest)" : c;
                return h("th", { class: c === "count" ? "dpg-derived" : null, "aria-colindex": String(ci + 1), "data-col": c, "data-frozen": c === frozen ? "" : null },
                    h("div", { class: "dpg-cn" }, h("span", { class: "k-id" }, AB.truncMiddle(shown, t.json ? 28 : 24)), gl, c === "count" ? AB.tip(h("span", { class: "dpg-auto", role: "note", tabindex: "0" }, "derived"), "How many rows each pair had", { label: false }) : null),
                    btn, comb, means);
            };
            const f = m.filter && FILTERS[m.filter];
            const sample = sampleOf(t);
            const idx = f && f.test ? sample.map((r, i) => i).filter((i) => f.test(sample[i], m)) : sample.map((r, i) => i);
            const rows = idx.map((i) => sample[i]);
            // Which other table a cell's value is missing from (the element's report marks it); null when matched
            // a link matched on another unique column (person by badge) misses on every row
            const off = offKey(m, t);
            const missFrom = (c, v) => (off && c === off.col ? "a " + off.by + " in " + off.table : t.id === "entries" && t.roles[c] ? (c === "person_id" && missP(m).includes(v) ? "people" : c === "building_id" && missB(m).includes(v) ? "buildings" : null) : null);
            const cell = (c, v) => (v == null ? "" : /^\d{4}-\d\d-\d\dT/.test(String(v)) ? String(v).replace("T", " ").replace(/:\d\dZ$/, "") : String(v));
            const fz = (c) => (c === frozen ? "" : null);
            // A JSON record's cell: a value, an array as its item count, a sub-object kept whole as its field count
            const jsonTd = (row, c) => {
                const v = get(row, c);
                if (Array.isArray(v)) return AB.tip(h("td", { class: "dpg-cell-more", "data-frozen": fz(c) }, "[" + v.length + "]"), v.length ? JSON.stringify(v) : "No items", { label: false });
                if (v && typeof v === "object") {
                    // an object keyed by ids (dependencies) counts its keys; a sub-object kept whole counts its fields
                    const k = Object.keys(v).length, w = t.arrs && t.arrs[c] && t.arrs[c].items === "object" ? (k === 1 ? " key}" : " keys}") : k === 1 ? " field}" : " fields}";
                    return AB.tip(h("td", { class: "dpg-cell-more", "data-frozen": fz(c) }, "{" + k + w), k ? JSON.stringify(v) : "Empty", { label: false });
                }
                return h("td", { class: hasRole(t, c) ? "k-id" : "", "data-frozen": fz(c) }, v == null ? "" : String(v));
            };
            const td = (row, c) => {
                if (t.json) return jsonTd(row, c);
                if (c === "count") return h("td", { class: "dpg-derived k-num" }, row.count != null ? String(row.count) : "1");
                if (LATEST.test(c)) return h("td", { class: "dpg-derived" }, cell(c, row[c] != null ? row[c] : row[c.replace(LATEST, "")]));
                const miss = missFrom(c, row[c]) || (t.id === "buildings" && c === colWith(t, "weight") && row[c] === "" ? "weight" : null);
                if (!miss) return h("td", { class: roleOf(t, c) !== "attr" ? "k-id" : "", "data-frozen": fz(c) }, cell(c, row[c]));
                const words = miss === "weight" ? "No " + c + " value: its weight reads " + (m.missW || "1") : off && c === off.col ? "Not " + miss : "Not in " + miss;
                // the words are on screen, after the glyph, so color and the glyph never carry it alone
                return h("td", { class: (roleOf(t, c) !== "attr" ? "k-id" : "") + " dpg-miss", "data-frozen": fz(c) }, cell(c, row[c]), h("span", { class: "k-warn-glyph", "aria-hidden": "true" }, "!"), h("span", { class: "dpg-miss-w" }, words));
            };
            // Nested data: the flattened columns sit under a header for their parent object; its menu
            // keeps the object as one value instead (the one alternative)
            const groupOf = (c) => (typeOfCol(t, c) === "whole" ? c : c.includes(".") ? c.slice(0, c.lastIndexOf(".")) : "");
            const groupBtns = [];
            let groupRow = null;
            if (t.json && cols.some((c) => groupOf(c))) {
                const runs = [];
                cols.forEach((c) => { const g = groupOf(c), last = runs[runs.length - 1]; if (last && last.g === g) last.n++; else runs.push({ g, n: 1, first: c }); });
                groupRow = h("tr", null, runs.map((run) => {
                    if (!run.g) return h("th", { class: "dpg-gh", colspan: String(run.n), "data-frozen": run.first === frozen ? "" : null, "aria-hidden": "true" });
                    const kept = (t.keep || []).includes(run.g);
                    const b = h("span", { class: "dpg-gh-btn", role: "button", tabindex: "-1", "aria-haspopup": "menu", "data-k": "g:" + run.g, "aria-label": run.g + ": " + (kept ? "kept as one value" : "one column per field") + ". Left and Right arrows move between parents" },
                        AB.truncMiddle(run.g, Math.max(14, run.n * 26)), icon("chevron-down", "sm"));
                    b.addEventListener("click", () => pickMenu(b, [
                        { label: "One column per field", check: !kept, desc: "Each field of " + run.g + " is its own column, named by its full path", onClick: () => { t.keep = t.keep.filter((k) => k !== run.g); changed(); redraw("g:" + run.g); } },
                        { label: "Keep as one value", check: kept, desc: "Stores " + run.g + " whole: a cell shows its field count, the inspector a collapsed tree" + (nameColsOf(t).some((c) => c.startsWith(run.g + ".")) ? ". The Name reads its fields, so it would name nothing" : ""), onClick: () => { t.keep = t.keep.filter((k) => !k.startsWith(run.g + ".")).concat([run.g]); changed(); redraw("g:" + run.g); } },
                    ], { label: run.g }));
                    groupBtns.push(b);
                    return h("th", { class: "dpg-gh", colspan: String(run.n) }, b);
                }));
            }
            const tableEl = h("table", { class: "k-table", "aria-label": (pairEdge(t) ? "Sample pairs of " : "Sample of ") + t.name },
                h("thead", null, groupRow, h("tr", null, cols.map(th))),
                h("tbody", null, rows.map((row) => {
                    // A row with an end left out stays in the grid, grayed, so the grid agrees with the report
                    const out = t.id === "entries" && t.kind === "edge" && (!!off || FILTERS.missing.test(row, m));
                    return h("tr", out ? { class: "dpg-out", "aria-description": "left out: an end is not matched" } : null, cols.map((c) => (out && c === "count" ? h("td", { class: "dpg-derived" }, "left out") : td(row, c))));
                })));
            // the column roles are one Tab stop, and the parent headers another: Left and Right move, Enter or Alt+Down opens
            const roving = (btns, keyOf, remember) => {
                const live = btns.find((b) => b.dataset.k === keyOf()) || btns.find((b) => !b.getAttribute("aria-disabled")) || btns[0];
                if (live) live.tabIndex = 0;
                btns.forEach((b, i) => b.addEventListener("keydown", (e) => {
                    // Home and End jump to the first and last role (69 columns is a long walk by arrow)
                    const to = e.key === "Home" ? 0 : e.key === "End" ? btns.length - 1 : null;
                    const d = to != null ? to - i : { ArrowRight: 1, ArrowLeft: -1 }[e.key];
                    if (d || to != null) { e.preventDefault(); const nx = btns[(i + d + btns.length) % btns.length]; btns.forEach((x) => (x.tabIndex = -1)); nx.tabIndex = 0; remember(nx.dataset.k); nx.focus(); nx.scrollIntoView({ block: "nearest", inline: "nearest" }); }
                    else if ((e.key === "Enter" || e.key === " " || (e.altKey && e.key === "ArrowDown")) && !b.getAttribute("aria-disabled")) { e.preventDefault(); b.click(); }
                }));
            };
            roving(roleBtns, () => "r:" + (m.lastCol || ""), (k) => { m.lastCol = k.slice(2); });
            roving(groupBtns, () => "g:" + (m.lastGroup || ""), (k) => { m.lastGroup = k.slice(2); });
            wrap.append(tableEl);
            // the grid is a preview: say so when the table holds more rows than it shows
            if (!f && sample.length && typeof rowsOf(m, t) === "number" && rowsOf(m, t) > sample.length) wrap.append(h("div", { class: "k-secondary", role: "note", style: "padding:6px 12px;position:sticky;left:0;width:max-content" }, "Showing the first " + sample.length + " of " + n(rowsOf(m, t)) + " rows."));
            const bar = f ? h("div", { class: "dpg-filter", role: "status" }, h("span", null, "Showing " + f.text + ": " + (rows.length ? rows.length + " of the " + sample.length + " sample rows" : "none of the " + sample.length + " sample rows") + "."), h("span", Object.assign({ class: "ab-link", role: "button", "data-k": "showall" }, AB.act({ onClick: () => { m.filter = null; redraw(); } })), "Show all rows")) : null;
            if (!sample.length) wrap.append(AB.empty("No rows to show."));
            const grain = pairEdge(t) && !f ? h("div", { class: "dpg-filter", role: "note" }, h("span", null, "One row per pair: each is one edge, its count the rows it merged.")) : null;
            // once shown for a table it stays, so a choice that drops it to 15 columns never takes the find away mid-task
            if (cols.length > 15) t.goShown = true;
            return [bar || grain, t.goShown ? goBar(t, cols) : null, wrap];
        }
        // Go to column (past 15 columns): the field list at menu size, the columns with a role first;
        // a pick scrolls the grid to that header and focuses its role
        function goBar(t, cols) {
            const withRole = cols.filter((c) => hasRole(t, c) && !derivedCol(c)), rest = cols.filter((c) => !withRole.includes(c));
            const it = (c) => ({ label: c, desc: "Role: " + (hasRole(t, c) ? (t.arrs && t.arrs[c] && roleOf(t, c) === "attr" ? ARR_WORD[t.arrs[c].pick] : ROLE_WORD[roleOf(t, c)]) : "Attribute"), onClick: () => goTo(c) });
            const items = [{ heading: "With a role" }].concat(withRole.map(it), [{ heading: "Other columns" }], rest.map(it));
            const fld = AB.field("Find a column", { icon: "search", onClick: (e) => AB.openFieldList(e.currentTarget, { items, label: "Go to column", query: m.gotoQ || "" }) });
            fld.dataset.k = "goto";
            fld.dataset.goto = "";
            fld.setAttribute("aria-label", "Go to column: " + cols.length + " columns");
            fld.setAttribute("aria-haspopup", "listbox");
            return h("div", { class: "dpg-gobar" }, h("span", { class: "dpg-lab" }, "Go to column"), fld, h("span", { class: "k-secondary" }, cols.length + " columns"));
        }
        function goTo(c, keepFocus) {
            const th = [...el.querySelectorAll(".dpg-grid th[data-col]")].find((x) => x.dataset.col === c);
            if (!th) return;
            el.querySelectorAll(".dpg-grid th[data-goto]").forEach((x) => x.removeAttribute("data-goto"));
            th.setAttribute("data-goto", "");
            // the header lands right of center, clear of the Go to column list that opens on the left
            const g = th.closest(".dpg-grid");
            g.scrollLeft = Math.max(0, th.offsetLeft - g.clientWidth * 0.55);
            const b = th.querySelector(".dpg-role");
            if (!b) return;
            el.querySelectorAll(".dpg-grid .dpg-role").forEach((x) => (x.tabIndex = -1));
            b.tabIndex = 0;
            m.lastCol = c;
            if (!keepFocus) { b.focus({ preventScroll: true }); AB.announce("Column " + c); }
        }

        // ----- match report -----
        function matchReport(t) {
            // A count filters the grid to its rows; pressed again, it shows every row again
            const count = (text, key) => key === "all" && !m.filter ? h("span", null, text) : h("span", Object.assign({ class: "ab-link", role: "button", "data-k": "f:" + key, "aria-pressed": String(m.filter === key) }, AB.act({ onClick: () => { m.filter = key === "all" || m.filter === key ? null : key; redraw("f:" + key); } })), text);
            const seg = (key, col, opts, value) => segOf(opts, value, (v) => { m.add = m.add || {}; m.add[key] = v === "add"; if (m.filter === "missing" && !(sampleOf(t).some((r) => FILTERS.missing.test(r, m)))) m.filter = null; changed(); }, "Unmatched " + col + " values", "u:" + key, ["Each value becomes a new node with only an id (Gephi's Create missing nodes)", t.kind === "node" ? "The entry node stays; only its link to a missing node is left out" : "The rows are left out; the count stays here"]);
            const cb = {
                settings: () => openSettings(),
                byKey: (tt, col) => { const r = tt.roles[col]; r.by = types(m).find((y) => y.name === r.target).unique[0]; changed(); redraw("t:" + tt.id); },
                untick: (tt) => { tt.tick = false; tt.gone = false; m.tables = m.tables.filter((x) => x !== tt); m.sel = "doc"; changed(); redraw("t:doc"); AB.announce(tt.path + " is no longer read"); },
            };
            const all = report(m, t, count, seg, (opts, value, set, label, key, tips) => segOf(opts, value, (v) => { set(v); changed(); }, label, key, tips), cb);
            // A problem block sits on the table it concerns, under its header strip; the report keeps the rest
            const probs = all.filter((l) => l.problem), lines = all.filter((l) => !l.problem);
            const sec = h("div", { class: "dpg-report", style: t.kind === "json" ? "max-height:64%" : null, role: "region", "aria-label": "Match report for " + (t.path || t.name) },
                h("h3", null, "Match report: " + (t.path || t.name)),
                lines.length ? lines.map((l) => (l.level === "sub" ? h("div", { class: "dpg-rl dpg-rl-sub" }, l.parts)
                    : h("div", { class: "dpg-rl" + (l.level === "res" ? " dpg-rl-res" : "") }, l.level === "warn" || l.level === "err" ? glyph(l.level) : null, h("span", { class: "dpg-rt" }, l.parts)))) : AB.empty("Nothing to match: nothing was read."));
            return { probs: probs.length ? h("div", { class: "dpg-probs" }, probs.map((l) => AB.problem(l.problem))) : null, el: sec };
        }

        // ----- footer -----
        function footer() {
            const vis = visible(m);
            const sl = sel();
            const kids = [];
            const anyCsv = !!m.json || vis.some((t) => t.format === "CSV" || t.kind === "text" || t.json || t.childOf);
            const declares = vis.some((t) => t.format && t.format !== "CSV" && !t.json && !t.childOf);
            const dirOff = !declares ? { file: m.json ? "This JSON document is not a graph file, so it does not say which way an edge points" : "A CSV file does not say which way an edge points" } : null;
            if (m.direction === "file" && dirOff) m.direction = "directed";
            // Nothing read (every table refused for good): no Direction to choose
            const nothingRead = m.tables.length && m.tables.every((t) => t.refusal && t.refusal.terminal);
            if (!nothingRead) kids.push(h("span", { class: "dpg-ctl" }, h("span", { class: "dpg-lab" }, "Direction"), segOf([["file", "As the file says"], ["directed", "Directed"], ["undirected", "Undirected"]], m.direction, (v) => { m.direction = v; changed(); }, "Direction", "dir", ["As the file says; a file with both kinds of edge reads as mixed", "Every edge points from its From to its To", "An edge is the same both ways"], anyCsv ? dirOff : null)));
            // what blocks the primary button, or what it will lose
            const blockT = vis.concat(m.tables.filter((t) => t.group && t.refusal)).map((t) => [t, problem(m, t)]).find(([, p]) => p);
            const terminal = (sl && sl.refusal && sl.refusal.terminal) || (m.tables[0] && m.tables[0].group && m.tables[0].refusal && m.tables[0].refusal.terminal);
            let reason = null;
            if (!m.tables.length) reason = ["need", "Add a file: there is nothing to load"];
            else if (blockT) reason = [blockT[1].level, (blockT[0].path || blockT[0].name) + ": " + blockT[1].text];
            else if (vis.some((t) => t.reading)) reason = ["need", "Wait until " + vis.find((t) => t.reading).file + " is read"];
            else if (m.door.edit && !m.dirty) reason = ["need", "Nothing has changed yet"];
            if (m.lost) {
                const rule = T().attributes.find((a) => a.name === "alertRule");
                const alerted = Object.values(rule.values).reduce((a, b) => a + b, 0);
                kids.push(h("span", { class: "dpg-reason", role: "status" }, glyph("warn"), h("span", { class: "dpg-lost" },
                    h("b", null, "2 attributes are not in " + m.replaced.file + ", and " + m.door.verb + " drops them:"),
                    h("span", null, h("b", { class: "k-id" }, "alertRule"), " is gone; the alertRule group (" + alerted + " accounts) colors from it"),
                    h("span", null, h("b", { class: "k-id" }, "alertTime"), " is gone; nothing reads it"))));
            } else if (reason) kids.push(h("span", { class: "dpg-reason", role: "status" }, reason[0] === "need" ? null : glyph(reason[0]), h("span", null, (m.door.verb || "Load") + " is off: " + (terminal ? "no setting here fixes " + (fileOf(m, sl) || sl.file || sl.name) : reason[1]))));
            else kids.push(h("span", { class: "k-grow" }));
            let primary;
            {
                const verb = m.door.verb || "Load";
                const to = m.door.done;
                // The loaded door-entries graph follows what Load (or Edit's Apply) leaves: One edge per
                // Row or Pair, or each entry as a node, and the Add choices
                const entries = m.tables.find((t) => t.id === "entries");
                const records = entries && to && (to[1] === "door-entries-loading" || (m.door.edit && to[1] === "door-entries"));
                primary = reason ? AB.button(verb, { disabled: reason[1] }) : AB.button(verb, { key: "Enter", onClick: () => { if (!to) { AB.flash("Loads " + n(REGISTRY.packages) + " packages and their dependencies as a new graph"); return; } if (m.json === "nested") NX().loaded = nestedChoices(m); if (m.pj) { const P = AB.fx.datasets.plainJson; P.baseFile = P.baseFile || P.file; P.dialect = m.pj; P.file = DIALECTS[m.pj].file || P.baseFile; } if (m.json === "registry") { const pk = table(m, "packages"); const it = table(m, "installed_together"); AB.fx.datasets[registryDataset()].edges = (pk && pk.arrs.dependencies.pick === "edges" ? REGISTRY.dependencyKeys : 0) + (it && it.tick !== false ? REGISTRY.installedTogether : 0); } if (records) { DE().loaded.per = entries.kind === "node" ? "nodes" : entries.per; DE().loaded.add = addedKey(m); if (m.door === NEW_DOOR) DE().loaded.fresh = true; } AB.go(to[0], to[1]); } });
            }
            primary.dataset.k = "primary";
            const cancel = AB.button("Cancel", { kind: "secondary", key: "Esc", onClick: () => AB.onPageCancel && AB.onPageCancel() });
            kids.push(h("span", { class: "dpg-btns" }, cancel, primary, AB.needsElement(NEEDS)));
            return { el: h("div", { class: "dpg-foot" }, kids), primary };
        }

        function build() {
            const t = sel();
            // Cancel (or one Esc too many) leaves with a way back: Undo reopens this page as it was left
            const leave = () => {
                const back = m.state;
                if (AB.pageOpener) location.assign(AB.pageOpener); else AB.close();
                setTimeout(() => AB.notice(m.door.edit ? "Edit cancelled: nothing changed" : "Load cancelled: nothing was loaded", { label: "Undo", onClick: () => AB.go("data-page", back) }), 0);
            };
            const head = AB.pageHead(m.door.title, { backTip: "Cancel", onCancel: leave });
            const main = h("div", { class: "dpg-main" }, modelStrip());
            if (t) { const r = matchReport(t); main.append(...[headStrip(t), r.probs].concat(grid(t), [r.el]).filter(Boolean)); }
            else main.append(h("div", { class: "dpg-grid" }, AB.empty("No tables. Add one with + above the list.")));
            const f = footer();
            // a JSON document's tree needs room for its paths
            const page = h("div", { class: "dpg", "data-json": m.tables.some((x) => x.kind === "json") ? "" : null }, tablesList(), main, f.el);
            el.append(head, page);
            // a path too long for the tree column at this width: a shorter middle ellipsis, never the end one
            el.querySelectorAll(".dpg-name > .ab-mid[data-full]").forEach((x) => {
                const full = x.dataset.full;
                for (let max = x.textContent.length - 2; x.scrollWidth > x.clientWidth + 1 && max >= 8; max -= 2) { const y = AB.truncMiddle(full, max); y.dataset.full = full; x.replaceWith(y); x = y; }
            });
            // Load takes focus as soon as the page is drawn (the frames below may come late on a cold load)
            if (m.first && m.focusLoad) f.primary.focus({ preventScroll: true });
            if (m.first) {
                m.first = false;
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    if (m.focusLoad) f.primary.focus();
                    else { const s = el.querySelector(".dpg-t[tabindex='0']"); if (s) s.focus(); }
                    if (m.menu && m.menu.newType) { const { col: c, sub } = m.menu, t0 = sel(); m.menu = null; nameType(el.querySelector(`[data-k="r:${c}"]`), "New type from " + c, c.replace(/_id$/, ""), (v) => { t0.roles[c] = role(sub, v, null, { fresh: true }); }); }
                    if (m.menu) { const b = el.querySelector(`[data-k="r:${CSS.escape(m.menu.col)}"]`); if (b) { b.scrollIntoView({ block: "nearest", inline: "center" }); openRoleMenu(b, sel(), m.menu.col, m.menu.sub, m.menu.any); } m.menu = null; }
                    // Go to column with a find typed: the list open on its matches, the grid on the first one
                    if (m.goto) {
                        const q = m.goto, t0 = sel(), fld = el.querySelector("[data-goto]");
                        m.goto = null;
                        const hit = pinned(t0).find((c) => AB.wordMatch(c, q));
                        if (hit) goTo(hit, true);
                        m.gotoQ = q;
                        if (fld) fld.click();
                        m.gotoQ = null;
                    }
                    if (m.focusGroup) { const g = el.querySelector(`[data-k="g:${CSS.escape(m.focusGroup)}"]`); m.focusGroup = null; if (g) { el.querySelectorAll(".dpg-gh-btn").forEach((x) => (x.tabIndex = -1)); g.tabIndex = 0; g.scrollIntoView({ block: "nearest", inline: "center" }); g.focus(); } }
                    if (m.pop) openSettings();
                    if (m.moved) AB.notice("Weight moved from " + m.moved[0] + " to " + m.moved[1], { label: "Undo", onClick: () => { const x = sel(); delete x.roles.count; x.roles[m.moved[0]] = role("weight"); redraw(); } });
                }));
            }
        }
        build();
    }

    const WIDE = ["wide-hosts", "wide-find-column", "wide-link-menu", "edit-wide-hosts", "edit-wide-connections"];
    const TRANSFERS = ["reading", "transfers", "kind-as-type", "weight-moved", "edit-source", "edit-accounts", "edit-source-lost", "replace", "add-matching", "url", "refused-fetch", "load-into", "one-at-a-time", "edge-list", "refused-parse", "refused-endpoints"];
    registerSection({
        id: "data-page",
        title: "Data page",
        region: "workspace",
        rail: "data",
        // The package registry is a new project of its own: the header names it, not the research network
        frame: (state) => (state === "json-keyed" || state === "json-keyed-weight" || state === "edit-registry" ? { dataset: registryDataset() } : { dataset: TRANSFERS.includes(state) ? "transactions" : WIDE.includes(state) ? "wide" : ["json-plain", "json-graphology", "json-jgf", "edit-plain-nodes", "edit-plain-links"].includes(state) ? "plainJson" : (state || "").startsWith("edit-json-") ? "nested" : (state || "").startsWith("json-") ? "nested"
            : state === "graph-file" || state === "edit-graph-file" || state === "refused-ids" || (state || "").startsWith("detect") ? "lesmis" : "doorEntries" }),
        states: [
            { id: "entries", label: "Door entries: three tables, entries selected" },
            { id: "people", label: "Door entries: people" },
            { id: "buildings", label: "Door entries: buildings, floors as weight" },
            { id: "role-menu", label: "Role menu open on person_id" },
            { id: "entries-pair", label: "One edge per Pair" },
            { id: "unmatched-rows", label: "The 32 unmatched rows" },
            { id: "entries-as-nodes", label: "Each entry as a node" },
            { id: "add-columns", label: "badges.csv adds columns to person" },
            { id: "edge-disabled", label: "\"an edge\" disabled" },
            { id: "new-type", label: "New type... names the type (person_id)" },
            { id: "file-settings", label: "File settings open" },
            { id: "edit-entries", label: "Edit: entries (door entries, loaded per Pair)" },
            { id: "edit-people", label: "Edit: people" },
            { id: "edit-buildings", label: "Edit: buildings" },
            { id: "weight-moved", label: "Pair keeps amount; the reader moves Weight to count (notice)" },
            { id: "transfers", label: "March transfers: accounts and transfers" },
            { id: "kind-as-type", label: "kind as Subtype: three subtypes of account" },
            { id: "replace", label: "Replace with file" },
            { id: "edit-source", label: "Edit source" },
            { id: "edit-accounts", label: "Edit: accounts" },
            { id: "edit-source-lost", label: "Replace: attributes lost" },
            { id: "graph-file", label: "A graph file (Les Miserables)" },
            { id: "edit-graph-file", label: "Edit: miserables.gexf" },
            { id: "edge-list", label: "One edge list, clean" },
            { id: "url", label: "From a URL" },
            { id: "detect-several", label: "Paste: several formats match" },
            { id: "detect-none", label: "Paste: no format matches" },
            { id: "unsupported-format", label: "Unsupported format (SIF)" },
            { id: "load-into", label: "Dropped on an open graph: opens as a new graph" },
            { id: "add-matching", label: "Added table matches a loaded source: Replace offered" },
            { id: "one-at-a-time", label: "One load at a time" },
            { id: "refused-empty", label: "Refused: empty file" },
            { id: "refused-parse", label: "Refused: could not be read" },
            { id: "refused-endpoints", label: "Refused: no endpoint columns" },
            { id: "refused-fetch", label: "Refused: fetch failed" },
            { id: "refused-too-large", label: "Refused: too large to draw" },
            { id: "refused-ids", label: "Refused: missing and duplicate ids" },
            { id: "reading", label: "A large file reading, with its row count" },
            { id: "link-by-badge", label: "person_id linked to person by badge: no rows match" },
            { id: "wide-hosts", label: "Wide data: hosts (69 columns) and connections (26)" },
            { id: "wide-find-column", label: "Wide data: Go to column, \"vu cr\" typed" },
            { id: "wide-link-menu", label: "Wide data: a link's \"by\" list (host by its unique columns)" },
            { id: "json-plain", label: "JSON: a node-link graph file, one step" },
            { id: "json-graphology", label: "JSON: a Graphology export, one step" },
            { id: "json-jgf", label: "JSON: a JSON Graph Format (JGF) file, one step" },
            { id: "edit-wide-hosts", label: "Edit: hosts (wide project)" },
            { id: "edit-wide-connections", label: "Edit: connections (wide project)" },
            { id: "edit-plain-nodes", label: "Edit: coauthors.json, nodes" },
            { id: "edit-plain-links", label: "Edit: coauthors.json, links" },
            { id: "edit-json-researchers", label: "Edit: the research network, researchers" },
            { id: "edit-json-affiliations", label: "Edit: the research network, affiliations" },
            { id: "edit-json-addresses", label: "Edit: the research network, addresses" },
            { id: "edit-json-institutions", label: "Edit: the research network, institutions" },
            { id: "edit-json-links", label: "Edit: the research network, links" },
            { id: "json-tree", label: "JSON: the document's tree, tables proposed" },
            { id: "json-researchers", label: "JSON: the researchers table, flattened columns" },
            { id: "json-keep-value", label: "JSON: attributes.profile.contact kept as one value" },
            { id: "json-array-menu", label: "JSON: the four outcomes of coauthor_ids" },
            { id: "json-affiliations", label: "JSON: affiliations as Several rows (a child table)" },
            { id: "json-any-type", label: "JSON: links[].target links to any of two types" },
            { id: "json-report", label: "JSON: the match report" },
            { id: "json-invalid", label: "JSON: refused, not valid JSON" },
            { id: "json-no-records", label: "JSON: refused, no array of records" },
            { id: "json-path-gone", label: "JSON: Edit source, a ticked array is gone" },
            { id: "json-keyed", label: "JSON: a package registry, records keyed by name" },
            { id: "json-keyed-weight", label: "JSON: the package registry's installed_together, weight proposed" },
            { id: "edit-registry", label: "Edit: the package registry (loaded)" },
        ],
        render,
    });
})();
