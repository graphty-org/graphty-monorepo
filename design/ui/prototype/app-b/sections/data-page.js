/* Data page (spec 11.3): the one page every data door opens. It takes the workspace (the header and
   rail stay, Data stays lit) and replaces the load dialog and the source inspector, whose old routes
   redirect here (app.js). Left: the tables list. Right, top to bottom: the read-only model strip,
   the selected table's header strip, the sample grid with a role under each column header, and the
   match report. Footer: Direction, Load into, Cancel, Load. An edge table's Weight carries its own
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
.dpg-t { display: grid; grid-template-columns: 16px 16px minmax(0, 1fr) auto 16px 20px; align-items: center; gap: 6px; height: 28px; padding: 0 8px 0 10px; cursor: pointer; }
.dpg-t[data-child] { padding-inline-start: 26px; }
.dpg-t:hover { background: var(--cm-bg-hover); }
.dpg-t[aria-selected="true"] { background: var(--cm-bg-selected); }
.dpg-t:focus-visible { outline: 2px solid var(--cm-border-selected-strong); outline-offset: -2px; }
.dpg-t .dpg-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
.dpg-grid td.dpg-derived, .dpg-grid th.dpg-derived { background: var(--cm-bg-secondary); color: var(--cm-text-secondary); }
.dpg-cn { display: flex; align-items: center; gap: 6px; }
.dpg-glyph { display: inline-flex; align-items: center; cursor: pointer; border-radius: 3px; padding: 0 2px; }
.dpg-glyph:hover, .dpg-glyph:focus-visible { background: var(--cm-bg-hover); }
.dpg-role { display: inline-flex; align-items: center; gap: 2px; margin-top: 4px; cursor: pointer; border-radius: 5px; font-weight: 450; }
.dpg-role:focus-visible { outline: 2px solid var(--cm-border-selected-strong); outline-offset: 1px; }
.dpg-role[data-set] .k-badge { color: var(--cm-text-brand); outline-color: var(--cm-border-selected); }
.dpg-role[aria-disabled="true"] { cursor: default; }
.dpg-comb { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 4px; font-weight: 450; color: var(--cm-text-secondary); font-size: 11px; }
.dpg-comb .k-field { height: 20px; min-width: 0; font-size: 11px; }
.dpg-miss { box-shadow: inset 0 0 0 1px var(--cm-bg-warning), inset 3px 0 0 var(--cm-bg-warning); }
.dpg-miss .k-warn-glyph { margin-inline-start: 6px; vertical-align: middle; }
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
@media (max-width: 1180px) { .dpg { grid-template-columns: 208px minmax(0, 1fr); } .dpg-ctl input.k-field { min-width: 200px; } }
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
    const KIND_ICON = { node: "circle-dot", edge: "spline", file: "network", text: "file" };
    const KIND_WORD = { node: "node table: each row is a node", edge: "edge table: each row is an edge", file: "graph file", text: "not read yet" };
    const ROLE_WORD = { key: "Key", from: "From", to: "To", links: "Links to", type: "Subtype", name: "Name", time: "Time", weight: "Weight", edgeId: "Edge id", x: "Position x", y: "Position y", z: "Position z", attr: "Attribute" };
    const ROLE_TIP = {
        key: "names each node; links match on it", from: "each row's edge starts at the node this value names", to: "each row's edge ends at the node this value names",
        links: "this row's node has an edge to the node this value names", type: "a subtype of this table's nodes, for the legend and groups; never part of a node's identity", name: "the readable name of each row",
        time: "when each row happened", weight: "set when loaded -- every run uses it unless the run picks another", edgeId: "names each edge",
        x: "places each node", y: "places each node", z: "places each node", attr: "kept as data, with no role",
    };
    const UNIQUE = new Set(["key", "from", "to", "type", "name", "time", "edgeId", "x", "y", "z"]);
    const COMBINE = {
        num: [["Sum", "The default"], ["Mean"], ["Min"], ["Max"], ["Leave out", "The column is not kept on the edge"]],
        time: [["Earliest and latest", "Two columns, the default"], ["Earliest"], ["Latest"], ["Leave out", "The column is not kept on the edge"]],
        // Never First: file order is unreliable, as for Time. Most common needs a new graph-format reducer ("mode")
        cat: [["Most common", "The value most of the pair's rows hold; ties go to the earliest row"], ["Leave out", "The column is not kept on the edge"]],
    };
    const TYPE_WORD = { cat: "Category", num: "Number", time: "Time", bool: "Category (true or false)" };
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
        replace: () => { const ta = TA().files.transfers; return transfers({ door: { title: "Replace: " + T().file, verb: "Apply", done: ["data-place", "after-replace"] }, focusLoad: true, replaced: { id: "transfers", file: ta.file, rows: ta.rows, was: T().file } }); },
        // Edit on the loaded transfers, either table selected; Apply returns to the Data place as it was
        "edit-source": () => transfers({ door: { title: "Edit: transfers", verb: "Apply", done: ["data-place", T().fresh ? "empty-filters" : "at-rest"], edit: true } }),
        "edit-accounts": () => transfers({ sel: "accounts", door: { title: "Edit: accounts", verb: "Apply", done: ["data-place", T().fresh ? "empty-filters" : "at-rest"], edit: true } }),
        "edit-source-lost": () => { const a = TA().files.accounts; const m = transfers({ sel: "accounts", door: { title: "Replace: " + T().accountsFile, verb: "Apply", done: ["data-place", "after-replace"] }, replaced: { id: "accounts", file: a.file, rows: a.rows, was: T().accountsFile }, lost: true }); m.tables[0].cols = a.columns.slice(); return m; },
        "graph-file": () => base({ tables: lesmisFile(), sel: "lm-nodes", direction: "file", focusLoad: true }),
        // Edit on the loaded Les Miserables file
        "edit-graph-file": () => base({ tables: lesmisFile(), sel: "lm-nodes", direction: "file", door: { title: "Edit: miserables.gexf", verb: "Apply", done: ["data-place", "graph-file"], edit: true } }),
        "edge-list": () => edgeOnly(),
        url: () => urlState(),
        "detect-several": () => base({ tables: [mk({ id: "paste", name: "Pasted text", kind: "text", pasted: PASTED_XML, format: null, candidates: ["GraphML", "GEXF"], rows: null, auto: {} })], sel: "paste", direction: "file" }),
        "detect-none": () => base({ tables: [mk({ id: "paste", name: "Pasted text", kind: "text", pasted: PASTED_PROSE, format: null, candidates: [], rows: null, auto: {} })], sel: "paste", direction: "file" }),
        "unsupported-format": () => base({ tables: [mk({ id: "sif", name: "interactions", file: "interactions.sif", kind: "text", format: "SIF", rows: null, refusal: { terminal: true, text: "SIF: " + UNSERVED.SIF + ". Save it from Cytoscape as GraphML or as a CSV edge list, and open that." } })], sel: "sif" }),
        "load-into": () => {
            const ta = TA().files.transfers;
            const m = base({ door: { title: "Load " + ta.file, into: true, done: ["data-place", "at-rest"], doneNew: ["canvas-and-states", "loading"] }, tables: [transfersTable({ id: "april", name: "transfers-2026-04", file: ta.file, rows: ta.rows, sample: [] })], sel: "april", into: null });
            return m;
        },
        "one-at-a-time": () => {
            const ta = TA().files.transfers;
            const m = edgeOnly();
            m.tables[0].reading = true;
            m.tables.push(transfersTable({ id: "april", name: "transfers-2026-04", file: ta.file, rows: null, cols: [], sample: [], roles: {}, refusal: { busy: true, text: ta.file + " was not loaded: " + T().file + " is still reading. Add it again when the reading ends." } }));
            m.sel = "april";
            m.focusLoad = false;
            return m;
        },
        "refused-empty": () => base({ tables: [mk({ id: "empty", name: "Untitled", file: "Untitled.csv", kind: "edge", cols: T().columns.slice(), rows: 0, refusal: { terminal: true, text: "Untitled.csv has a header row and nothing under it, so it holds no nodes and no edges." } })], sel: "empty" }),
        "refused-parse": () => Object.assign(edgeOnly({ refusal: { setting: true, text: "Lines 2 and 5 have 5 columns where the header has 4: an amount holds a comma. Quote the amounts in the file, or choose Semicolon in File settings if the file uses it." } }), { focusLoad: false }),
        "refused-endpoints": () => { const m = edgeOnly({ roles: {} }); m.focusLoad = false; return m; },
        "refused-fetch": () => urlState(true),
        "refused-too-large": () => base({ tables: [mk({ id: "big", name: "patent-citations-sample", file: C().file, kind: "edge", cols: C().columns.slice(), rows: C().edges, sample: [], refusal: { terminal: true, text: n(C().nodes) + " nodes and " + n(C().edges) + " edges: a graph draws up to " + n(C().drawingLimit) + " nodes." } })], sel: "big" }),
    };
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
            refusal: failed ? { fetch: true, text: "The address did not answer after 3 tries. Check it and your connection, then try again." } : null }));
        return m;
    }

    // ---------- reading a table ----------
    const roleOf = (t, c) => (t.roles[c] && t.roles[c].r) || "attr";
    const colWith = (t, r) => Object.keys(t.roles).find((c) => t.roles[c] && t.roles[c].r === r);
    const linkCols = (t) => Object.keys(t.roles).filter((c) => t.roles[c] && ["from", "to", "links"].includes(t.roles[c].r));
    // Under Pair a Time column combined to "Earliest and latest" makes two columns: the first keeps the
    // column (and its Time role) as "(earliest)", the second is derived. The derived count comes last.
    const pairEdge = (t) => t.per === "pair" && t.kind === "edge";
    const twoTimes = (t, c) => pairEdge(t) && (t.types[c] === "time") && (t.combine[c] || "Earliest and latest") === "Earliest and latest";
    const colsOf = (t) => t.cols.flatMap((c) => (twoTimes(t, c) ? [c, c + " (latest)"] : [c])).concat(pairEdge(t) ? ["count"] : []);
    const LATEST = / \(latest\)$/;
    const derivedCol = (c) => c === "count" || LATEST.test(c);
    const typeOfCol = (t, c) => (c === "count" ? "num" : LATEST.test(c) ? "time" : t.types[c] || "cat");
    // The sample rows: under Pair, one row per pair, as graphty-element's data.preview returns them
    const sampleOf = (t) => (pairEdge(t) && t.id === "entries" ? DE().report.entries.pairSample : t.sample);
    const visible = (m) => m.tables.filter((t) => !t.group);
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
        if (t.group) { const kids = m.tables.filter((x) => x.parent === t.id); return kids.map((k) => problem(m, k)).find(Boolean) || null; }
        if (t.refusal) return { level: "err", text: t.refusal.busy ? "not loaded: another file is still reading" : t.refusal.fetch ? "the address did not answer" : t.refusal.setting ? "could not be read" : "cannot be loaded" };
        if (t.reading) return null;
        if (t.kind === "text") return { level: "warn", text: t.candidates && t.candidates.length ? "choose " + t.candidates.join(" or ") + " in File settings" : "choose a format in File settings" };
        if (t.kind === "edge" && (!colWith(t, "from") || !colWith(t, "to"))) return { level: "warn", text: (colWith(t, "from") || colWith(t, "to") ? "choose a From and a To under two column headers" : "no endpoint columns found; choose From and To under two of its columns") + (t.cols.length ? " (the file has " + t.cols.join(", ") + ")" : "") };
        const known = types(m).map((x) => x.name);
        const lost = linkCols(t).find((c) => t.roles[c].target && t.roles[c].target !== "node" && !t.roles[c].fresh && !known.includes(t.roles[c].target));
        if (lost) return { level: "warn", text: c2(lost, t) };
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

    // ---------- the match report (stands in for graphty-element's report object) ----------
    // Each line: { level: "warn" | "err" | "res" | null, parts }. `count(text, filterId)` filters the grid.
    function report(m, t, count, seg, pick) {
        const R = DE().report;
        const L1 = (level, ...parts) => ({ level, parts });
        if (t.refusal) return [L1("err", t.refusal.text, t.refusal.setting && t.kind !== "text" ? [" ", AB.openQuestion("The line numbers are a stand-in: the fixture file reads cleanly; the element's error summary supplies the real ones")] : null)];
        if (t.reading) return [L1(null, "Reading " + t.file + "...")];
        if (t.kind === "text") return [L1("warn", t.candidates && t.candidates.length ? "The text matches " + t.candidates.join(" and ") + ": choose one in File settings." : "Nothing recognized this text. Choose a format in File settings, or paste a file's text as it is saved.")];
        const pr = problem(m, t);
        const out = [];
        if (pr) out.push(L1("warn", t.name + ": " + pr.text + "."));
        const ok = offKey(m, t);
        if (ok) return [L1("err", "0 of " + n(rowsOf(m, t)) + " " + ok.col + " values are " + ok.by + "s in " + ok.table + "; " + n(rowsOf(m, t)) + " rows have no " + ok.target + "."),
            L1(null, ok.col + " holds ids such as 1001; " + ok.table + "." + ok.by + " holds values such as B-20417. Choose " + ok.target + " by its Key under " + ok.col + ".")];
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
            if (left) out.push(L1(null, count((m.filter === "missing" ? "Hide the " : "Show the ") + left + " rows", "missing"), "."));
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
            if (t.id === "april") return out.concat([L1(null, count(n(rows) + " rows", "all"), "; which ends match shows once Load into is chosen.")]);
            const lines = [L1(null, count(n(rows) + " rows", "all"), m.replaced && m.replaced.id === t.id ? "; all " + t.cols.length + " columns of " + m.replaced.was + " are here, so every role carried over." : "; every row has both ends.")];
            if (t.name === "transfers-2026-03") lines.push(L1(null, n(T().nodes) + " ids found in " + colWith(t, "from") + " and " + colWith(t, "to") + " become nodes of type node."));
            if (!m.replaced && /^transfers/.test(t.id)) lines.push(L1(null, pairWord));
            if (t.per === "pair" && m.direction === "undirected") lines.push(L1(null, "Undirected: (a, b) and (b, a) now merge: " + n(rows) + " edges become " + n(rows - R.transfers.reversePairs) + "."));
            const ew = colWith(t, "weight");
            if (ew && ew !== "count" && t.id !== "april") lines.push(L1(null, ew + " is each edge's weight; every row has " + (/^[aeiou]/.test(ew) ? "an " : "a ") + ew + " value. A row without one would weigh", pick([["1", "1"], ["0", "0"]], m.missEW || "1", (v) => { m.missEW = v; }, "Missing " + ew + " reads", "mew", ["A row with no " + ew + " value weighs 1", "A row with no " + ew + " value weighs 0"]), "."));
            if (t.id !== "april") lines.push(L1("res", n(rows) + " rows became " + n(rows) + " edges."));
            return out.concat(lines);
        }
        if (t.kind === "node" && !pr) out.push(L1(null, count(n(rowsOf(m, t)) + " rows", "all"), "; every key is unique."));
        return out;
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
        if (refocus && first && first.anchor.isConnected) first.anchor.focus();
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
    window.addEventListener("hashchange", () => { closeMenus(); closePop(); });

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
            const res = () => [...el.querySelectorAll(".dpg-rl-res")].map((x) => x.textContent).join(" ");
            const before = res();
            el.replaceChildren();
            build();
            if (res() && res() !== before) AB.announce(res());
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
            const ul = h("ul", { class: "dpg-list", role: "listbox", "aria-label": "Tables" });
            const shown = m.tables.filter((t) => !t.parent || (table(m, t.parent) || {}).open);
            const status = (t) => {
                if (t.reading) return AB.tip(h("span", { class: "dpg-warn", role: "img", "aria-label": "reading" }, icon("loader-circle", "sm")), "Reading " + t.file, { label: false });
                const p = problem(m, t);
                if (!p) return AB.tip(h("span", { class: "dpg-ok", role: "img", "aria-label": "ready" }, icon("circle-check", "sm")), "Ready: every role it needs is set and its report has nothing open", { label: false });
                return AB.tip(h("span", { class: p.level === "err" ? "dpg-err" : "dpg-warn", role: "img", "aria-label": p.level === "err" ? "refused" : "needs a choice" }, icon(p.level === "err" ? "circle-x" : "triangle-alert", "sm")), t.name + ": " + p.text, { label: false });
            };
            shown.forEach((t) => {
                const kid = !!t.parent;
                const selected = t.id === m.sel || (t.group && !shown.some((x) => x.parent === t.id) && m.sel.startsWith(t.id));
                const disc = t.group ? AB.iconButton(t.open ? "chevron-down" : "chevron-right", t.open ? "Collapse" : "Expand", { onClick: (e) => { e.stopPropagation(); t.open = !t.open; redraw("t:" + t.id); } }) : h("span");
                const rm = kid ? h("span") : pointerOnly("minus", "Remove " + t.name, (e) => {
                    e.stopPropagation();
                    const i = m.tables.indexOf(t);
                    const gone = m.tables.filter((x) => x === t || x.parent === t.id);
                    m.tables = m.tables.filter((x) => !gone.includes(x));
                    if (gone.some((x) => x.id === m.sel)) m.sel = (visible(m)[0] || {}).id;
                    changed();
                    redraw();
                    AB.deleted(fileOf(m, t) || t.name, () => { m.tables.splice(i, 0, ...gone); redraw(); });
                });
                rm.classList.add("dpg-rm");
                // The "-" is the pointer's way to Remove: a plain target, not a button, because a control
                // inside a list option is not announced as one. Delete on the row and its context menu are
                // the keyboard's and screen reader's way to the same command
                const rows = rowsOf(m, t);
                const li = h("li", { class: "dpg-t", role: "option", "data-child": kid ? "" : null, "data-k": "t:" + t.id, tabindex: selected ? "0" : "-1", "aria-selected": String(!!selected), "aria-keyshortcuts": kid ? null : "Delete Shift+F10" },
                    t.group ? disc : AB.tip(h("span", { role: "img", "aria-label": KIND_WORD[t.kind] }, icon(KIND_ICON[t.kind], "sm")), KIND_WORD[t.kind], { label: false }),
                    t.group ? AB.tip(h("span", { role: "img", "aria-label": KIND_WORD.file }, icon(KIND_ICON.file, "sm")), KIND_WORD.file, { label: false }) : h("span"),
                    h("span", { class: "dpg-name" }, t.name),
                    h("span", { class: "dpg-n" }, rows != null ? (t.kind === "node" && t.type ? plusAdded(m, t.type, rows) : n(rows)) : ""),
                    status(t), rm);
                AB.tip(li.querySelector(".dpg-name"), (fileOf(m, t) || t.name) + (rows != null ? ", " + n(rows) + " rows" : ""), { label: false });
                li.addEventListener("click", () => { if (t.group) { t.open = true; m.sel = m.tables.find((x) => x.parent === t.id).id; } else m.sel = t.id; m.filter = null; redraw("t:" + m.sel); });
                const rowMenu = () => pickMenu(li, [{ heading: t.name }, { label: "Remove", shortcut: "Del", onClick: () => rm.click() }], { label: t.name });
                if (!kid) li.addEventListener("contextmenu", (e) => { e.preventDefault(); rowMenu(); });
                li._menu = kid ? null : rowMenu;
                ul.append(li);
            });
            if (!shown.length) ul.append(h("li", { role: "none" }, AB.empty("No tables.", { verb: "Add a file", onClick: () => AB.flash("Opens the file picker") })));
            ul.addEventListener("keydown", (e) => {
                const items = [...ul.querySelectorAll(".dpg-t")];
                const i = items.indexOf(document.activeElement);
                const d = { ArrowDown: 1, ArrowUp: -1 }[e.key];
                if (i < 0) return;
                if (d) { e.preventDefault(); items.forEach((x) => (x.tabIndex = -1)); const nx = items[(i + d + items.length) % items.length]; nx.tabIndex = 0; nx.focus(); nx.click(); }
                else if (e.key === "Home" || e.key === "End") { e.preventDefault(); const nx = e.key === "Home" ? items[0] : items[items.length - 1]; nx.focus(); nx.click(); }
                else if (e.key === "Delete") { const b = items[i].querySelector(".dpg-rm"); if (b && b.click) { e.preventDefault(); b.click(); } }
                else if ((e.key === "F10" && e.shiftKey) || e.key === "ContextMenu") { if (items[i]._menu) { e.preventDefault(); items[i]._menu(); } }
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
            const lines = strip(m);
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
            const fmtText = t.kind === "text" && !t.format ? (t.candidates && t.candidates.length ? "Choose: " + t.candidates.join(" or ") : "Choose a format") : t.format + (t.format === "CSV" ? ", " + t.sep.toLowerCase() : "");
            const fmt = AB.field(fmtText, { icon: t.pasted ? "type" : t.url ? "link" : "file", caret: true, onClick: (e) => (m.pop ? (m.pop = false, closePop(true)) : openSettings(e.currentTarget)) });
            fmt.dataset.k = "fmt";
            fmt.dataset.fmt = "";
            fmt.setAttribute("aria-haspopup", "dialog");
            fmt.setAttribute("aria-label", "File settings: " + fmtText);
            if (t.kind === "text" || t.refusal) fmt.classList.add("dpg-miss");
            kids.push(h("span", { class: "dpg-ctl" }, t.url ? null : h("span", { class: "dpg-lab" }, t.pasted ? "Pasted, " + t.pasted.split("\n").length + " lines" : t.parent ? "miserables.gexf" : fileOf(m, t)), fmt, auto(t.auto.format && t.format && (t.auto.format === true ? "Worked out from the file's name and first line" : t.auto.format))));
            if (t.kind === "text" || (t.refusal && (t.refusal.terminal || !t.cols.length))) return h("div", { class: "dpg-head" }, kids);
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
                }, "Each row is", "kind", ["Each row of " + t.name + " becomes a node", "Each row of " + t.name + " becomes an edge between the two nodes it names"], off), off && lk ? h("span", { class: "k-secondary" }, off.edge) : null));
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
                        t.cols.forEach((c) => { if (!["from", "to", "edgeId"].includes(roleOf(t, c))) t.combine[c] = t.combine[c] || COMBINE[typeOfCol(t, c) === "bool" ? "cat" : typeOfCol(t, c)][0][0]; });
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
            if (t.kind === "text" && !(t.candidates || []).includes(f)) t.refusal = { setting: true, text: "Line 1 is not " + f + ", so nothing could be read. Choose another format, or paste a file's text as it is saved." };
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
        function roleItems(t, c) {
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
                items.push({ sep: true }, { label: "New type...", check: !!fresh, desc: fresh ? "Renames " + fresh + ", the type this column makes" : "Each value of " + c + " becomes a node of a new type; you name it next", onClick: () => {
                    nameType(el.querySelector(`[data-k="r:${CSS.escape(c)}"]`), fresh ? "Rename type " + fresh : "New type from " + c, fresh || c.replace(/_id$/, ""), (v) => {
                        if (fresh) renameType(fresh, v);
                        else t.roles[c] = role(r, v, null, { fresh: true });
                    });
                } });
                pickMenu(item, items, { sub: true, label: ROLE_WORD[r] + " which type" });
            } });
            const linkWord = { key: "names each node", from: "links each row to " + (t.roles[c] || {}).target, to: "links each row to " + (t.roles[c] || {}).target, links: "links each row to " + (t.roles[c] || {}).target }[cur];
            const needNum = linkWord ? c + " " + linkWord + "; a weight needs a column of its own" : ty === "num" ? null : c + " reads as " + TYPE_WORD[ty] + "; a weight needs a Number";
            const needTime = ty === "time" || ty === "num" ? null : c + " reads as " + TYPE_WORD[ty] + "; Time needs a Time column, or a Number of seconds or milliseconds since 1970";
            // A Number column becomes Time here, with its unit, before the load (no detour through the attribute)
            const timeNum = ty === "num" ? { sub: true, desc: "A Number of seconds or milliseconds since 1970 becomes Time when loaded", onClick: (e) => { while (stack.length > 1) closeSub(); pickMenu(e.currentTarget, [["s", "Seconds since 1970"], ["ms", "Milliseconds since 1970"]].map(([u, label]) => ({ label, check: cur === "time" && (t.roles[c] || {}).unit === u, onClick: () => { set("time")(); t.roles[c].unit = u; } })), { sub: true, label: "Time unit" }); } } : null;
            const needPos = ty === "num" ? null : c + " reads as " + TYPE_WORD[ty] + "; a position needs a Number";
            const it = (r, extra) => Object.assign({ label: ROLE_WORD[r], check: cur === r, desc: ROLE_TIP[r], onClick: set(r) }, extra || {});
            const items = [];
            if (t.kind === "node") items.push(it("key", { desc: "Names each node; suggested from a column with \"id\" in its name and unique values" }), link("links"));
            // The count One edge per Pair derives cannot name an end: the pair's ends are its From and To
            else if (pairEdge(t) && c === "count") items.push(Object.assign(link("from"), { sub: false, onClick: null, disabled: "count is derived from the pair; the pair's ends are " + colWith(t, "from") + " and " + colWith(t, "to") }), Object.assign(link("to"), { sub: false, onClick: null, disabled: "count is derived from the pair; the pair's ends are " + colWith(t, "from") + " and " + colWith(t, "to") }));
            else items.push(link("from"), link("to"));
            items.push({ sep: true }, it("type"), it("name"), it("time", needTime ? { disabled: needTime } : timeNum), it("weight", needNum ? { disabled: needNum } : { desc: "One weight per table; choosing it here moves it from another column" }));
            if (t.kind === "edge") items.push(it("edgeId"));
            items.push({ label: "Position", sub: true, check: ["x", "y", "z"].includes(cur), disabled: needPos || null, onClick: (e) => { while (stack.length > 1) closeSub(); pickMenu(e.currentTarget, ["x", "y", "z"].map((a) => ({ label: a, check: cur === a, onClick: set(a) })), { sub: true, label: "Position axis" }); } });
            items.push({ sep: true }, it("attr", { desc: "The default: kept as data, with no role" }));
            return items;
        }
        function openRoleMenu(btn, t, c, sub) {
            const mn = pickMenu(btn, roleItems(t, c), { label: "Role of " + c });
            if (sub) requestAnimationFrame(() => requestAnimationFrame(() => {
                const item = [...mn.querySelectorAll(".k-menu-item")].find((x) => x.textContent.trim().startsWith(ROLE_WORD[sub]));
                if (item) { item.focus(); item.click(); }
            }));
        }

        // ----- sample grid -----
        function grid(t) {
            const wrap = h("div", { class: "dpg-grid", tabindex: "-1" });
            if (t.pasted) { wrap.append(h("pre", { class: "dpg-pre", "aria-label": "Pasted text" }, t.pasted)); return [wrap]; }
            if (t.reading) { wrap.append(h("div", { style: "padding:16px" }, h("div", { class: "k-secondary" }, "Reading " + t.file + "..."), h("div", { class: "k-progress", role: "progressbar", "aria-label": "Reading", "aria-valuenow": "40", style: "margin-top:8px;max-width:320px" }, h("i", { style: "width:40%" })))); return [wrap]; }
            if (t.refusal && (t.refusal.terminal || t.refusal.fetch || t.refusal.busy) && !t.sample.length) { wrap.append(AB.empty(t.refusal.busy ? "Not read." : t.refusal.fetch ? "Nothing to show: nothing was fetched." : t.rows === 0 ? "No rows under the header." : "Nothing to show: nothing was read.")); return [wrap]; }
            const cols = colsOf(t);
            const roleBtns = [];
            const th = (c, ci) => {
                // time (latest): a derived column with no role of its own
                if (LATEST.test(c)) return h("th", { class: "dpg-derived", "aria-colindex": String(ci + 1) },
                    h("div", { class: "dpg-cn" }, h("span", { class: "k-id" }, c), AB.tip(h("span", { class: "dpg-auto", role: "note", tabindex: "0" }, "derived"), "The latest " + c.replace(LATEST, "") + " of each pair, kept as an attribute; " + c.replace(LATEST, "") + " (earliest) holds the Time role", { label: false })));
                const r = roleOf(t, c);
                const rr = t.roles[c] || {};
                const ty = typeOfCol(t, c);
                const keyOfT = rr.target && (types(m).find((x) => x.name === rr.target) || {}).unique;
                const word = ["from", "to", "links"].includes(r) ? ROLE_WORD[r] + " -> " + rr.target + (rr.by && keyOfT && rr.by !== keyOfT[0] ? " by " + rr.by : "") : ROLE_WORD[r];
                const locked = rr.locked;
                const tag = AB.roleTag(word, { second: locked ? "set by the file" : ROLE_TIP[r] + (rr.by && rr.by !== "id" ? " (matched on " + rr.target + "." + rr.by + ")" : "") });
                const btn = h("span", { class: "dpg-role", role: "button", tabindex: "-1", "aria-haspopup": locked ? null : "menu", "aria-disabled": locked ? "true" : null, "data-set": r !== "attr" ? "" : null, "data-k": "r:" + c, "aria-label": "Role of " + c + ": " + word + (locked ? ", set by the file" : ""), "aria-description": (locked ? "set by the file" : ROLE_TIP[r]) + ". Left and Right arrows move between columns" },
                    tag, locked ? icon("lock", "sm") : icon("chevron-down", "sm"), rr.auto ? auto("Suggested from the column's name and values") : null);
                if (!locked) btn.addEventListener("click", () => openRoleMenu(btn, t, c));
                roleBtns.push(btn);
                const gl = h("span", Object.assign({ class: "dpg-glyph", role: "link", "aria-label": c + ": " + TYPE_WORD[ty] + ". Opens the attribute" }, AB.act({ go: ["inspector-attribute-and-filter-step", c === "floors" ? "node-weight" : c === "person_id" ? "link-key" : c === "count" ? "edge-weight" : c === "id" ? "attribute-name-role" : "attribute"] })), AB.typeGlyph(ty));
                AB.tip(gl, TYPE_WORD[ty] + ": change how it reads in the attribute's Read as", { label: false });
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
                return h("th", { class: c === "count" ? "dpg-derived" : null, "aria-colindex": String(ci + 1) },
                    h("div", { class: "dpg-cn" }, h("span", { class: "k-id" }, twoTimes(t, c) ? c + " (earliest)" : c), gl, c === "count" ? AB.tip(h("span", { class: "dpg-auto", role: "note", tabindex: "0" }, "derived"), "How many rows each pair had", { label: false }) : null),
                    btn, comb, means);
            };
            const f = m.filter && FILTERS[m.filter];
            const sample = sampleOf(t);
            const idx = f && f.test ? sample.map((r, i) => i).filter((i) => f.test(sample[i], m)) : sample.map((r, i) => i);
            const rows = idx.map((i) => sample[i]);
            // Which other table a cell's value is missing from (the element's report marks it); null when matched
            const missFrom = (c, v) => (t.id === "entries" && t.roles[c] ? (c === "person_id" && missP(m).includes(v) ? "people" : c === "building_id" && missB(m).includes(v) ? "buildings" : null) : null);
            const cell = (c, v) => (v == null ? "" : /^\d{4}-\d\d-\d\dT/.test(String(v)) ? String(v).replace("T", " ").replace(/:\d\dZ$/, "") : String(v));
            const td = (row, c) => {
                if (c === "count") return h("td", { class: "dpg-derived k-num" }, row.count != null ? String(row.count) : "1");
                if (LATEST.test(c)) return h("td", { class: "dpg-derived" }, cell(c, row[c] != null ? row[c] : row[c.replace(LATEST, "")]));
                const miss = missFrom(c, row[c]) || (t.id === "buildings" && c === colWith(t, "weight") && row[c] === "" ? "weight" : null);
                if (!miss) return h("td", { class: roleOf(t, c) !== "attr" ? "k-id" : "" }, cell(c, row[c]));
                const words = miss === "weight" ? "No " + c + " value: its weight reads " + (m.missW || "1") : "Not in " + miss;
                return h("td", { class: (roleOf(t, c) !== "attr" ? "k-id" : "") + " dpg-miss", "aria-description": words }, cell(c, row[c]), AB.tip(h("span", { class: "k-warn-glyph", "aria-hidden": "true" }, "!"), words, { label: false }));
            };
            const tableEl = h("table", { class: "k-table", "aria-label": (pairEdge(t) ? "Sample pairs of " : "Sample of ") + t.name },
                h("thead", null, h("tr", null, cols.map(th))),
                h("tbody", null, rows.map((row) => {
                    // A row with an end left out stays in the grid, grayed, so the grid agrees with the report
                    const out = t.id === "entries" && t.kind === "edge" && FILTERS.missing.test(row, m);
                    return h("tr", out ? { class: "dpg-out", "aria-description": "left out: an end is not matched" } : null, cols.map((c) => (out && c === "count" ? h("td", { class: "dpg-derived" }, "left out") : td(row, c))));
                })));
            // the column roles are one Tab stop: Left and Right move, Enter or Alt+Down opens
            const live = roleBtns.find((b) => b.dataset.k === "r:" + (m.lastCol || "")) || roleBtns.find((b) => !b.getAttribute("aria-disabled")) || roleBtns[0];
            if (live) live.tabIndex = 0;
            roleBtns.forEach((b, i) => b.addEventListener("keydown", (e) => {
                const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
                if (d) { e.preventDefault(); const nx = roleBtns[(i + d + roleBtns.length) % roleBtns.length]; roleBtns.forEach((x) => (x.tabIndex = -1)); nx.tabIndex = 0; m.lastCol = nx.dataset.k.slice(2); nx.focus(); }
                else if ((e.key === "Enter" || e.key === " " || (e.altKey && e.key === "ArrowDown")) && !b.getAttribute("aria-disabled")) { e.preventDefault(); b.click(); }
            }));
            wrap.append(tableEl);
            const bar = f ? h("div", { class: "dpg-filter", role: "status" }, h("span", null, "Showing " + f.text + ": " + (rows.length ? rows.length + " of the " + sample.length + " sample rows" : "none of the " + sample.length + " sample rows") + "."), h("span", Object.assign({ class: "ab-link", role: "button", "data-k": "showall" }, AB.act({ onClick: () => { m.filter = null; redraw(); } })), "Show all rows")) : null;
            if (!sample.length) wrap.append(AB.empty(t.id === "april" ? "No sample: the file is read once Load into is chosen." : "No rows to show."));
            const grain = pairEdge(t) && !f ? h("div", { class: "dpg-filter", role: "note" }, h("span", null, "One row per pair: each is one edge, its count the rows it merged.")) : null;
            return [bar || grain, wrap];
        }

        // ----- match report -----
        function matchReport(t) {
            // A count filters the grid to its rows; pressed again, it shows every row again
            const count = (text, key) => key === "all" && !m.filter ? h("span", null, text) : h("span", Object.assign({ class: "ab-link", role: "button", "data-k": "f:" + key, "aria-pressed": String(m.filter === key) }, AB.act({ onClick: () => { m.filter = key === "all" || m.filter === key ? null : key; redraw("f:" + key); } })), text);
            const seg = (key, col, opts, value) => segOf(opts, value, (v) => { m.add = m.add || {}; m.add[key] = v === "add"; if (m.filter === "missing" && !(sampleOf(t).some((r) => FILTERS.missing.test(r, m)))) m.filter = null; changed(); }, "Unmatched " + col + " values", "u:" + key, ["Each value becomes a new node with only an id (Gephi's Create missing nodes)", t.kind === "node" ? "The entry node stays; only its link to a missing node is left out" : "The rows are left out; the count stays here"]);
            const lines = report(m, t, count, seg, (opts, value, set, label, key, tips) => segOf(opts, value, (v) => { set(v); changed(); }, label, key, tips));
            const sec = h("div", { class: "dpg-report", role: "region", "aria-label": "Match report for " + t.name },
                h("h3", null, "Match report: " + t.name),
                lines.map((l) => h("div", { class: "dpg-rl" + (l.level === "res" ? " dpg-rl-res" : "") }, l.level === "warn" || l.level === "err" ? glyph(l.level) : null, h("span", { class: "dpg-rt" }, l.parts))));
            return sec;
        }

        // ----- footer -----
        function footer() {
            const vis = visible(m);
            const sl = sel();
            const kids = [];
            const anyCsv = vis.some((t) => t.format === "CSV" || t.kind === "text");
            const declares = vis.some((t) => t.format && t.format !== "CSV");
            const dirOff = !declares ? { file: "A CSV file does not say which way an edge points" } : null;
            if (m.direction === "file" && dirOff) m.direction = "directed";
            kids.push(h("span", { class: "dpg-ctl" }, h("span", { class: "dpg-lab" }, "Direction"), segOf([["file", "As the file says"], ["directed", "Directed"], ["undirected", "Undirected"]], m.direction, (v) => { m.direction = v; changed(); }, "Direction", "dir", ["As the file says; a file with both kinds of edge reads as mixed", "Every edge points from its From to its To", "An edge is the same both ways"], anyCsv ? dirOff : null)));
            if (m.door.into) kids.push(h("span", { class: "dpg-ctl" }, h("span", { class: "dpg-lab" }, "Load into"), segOf([["this", "This graph"], ["new", "New graph"]], m.into, (v) => { m.into = v; }, "Load into", "into", ["Adds its rows to " + T().graphName + ", as another table", "Opens it as its own graph, in this project"])));
            // what blocks the primary button, or what it will lose
            const blockT = vis.map((t) => [t, problem(m, t)]).find(([, p]) => p);
            const terminal = sl && sl.refusal && sl.refusal.terminal;
            let reason = null;
            if (blockT) reason = [blockT[1].level, blockT[0].name + ": " + blockT[1].text];
            else if (m.door.into && !m.into) reason = ["need", "Choose where it loads, under Load into"];
            else if (vis.some((t) => t.reading)) reason = ["need", "Wait until " + vis.find((t) => t.reading).file + " is read"];
            else if (m.door.edit && !m.dirty) reason = ["need", "Nothing has changed yet"];
            if (m.lost) {
                const rule = T().attributes.find((a) => a.name === "alertRule");
                const alerted = Object.values(rule.values).reduce((a, b) => a + b, 0);
                kids.push(h("span", { class: "dpg-reason", role: "status" }, glyph("warn"), h("span", { class: "dpg-lost" },
                    h("b", null, "2 attributes are not in " + m.replaced.file + ", and Apply drops them:"),
                    h("span", null, h("b", { class: "k-id" }, "alertRule"), " is gone; the alertRule group (" + alerted + " accounts) colors from it"),
                    h("span", null, h("b", { class: "k-id" }, "alertTime"), " is gone; nothing reads it"))));
            } else if (reason) kids.push(h("span", { class: "dpg-reason", role: "status" }, reason[0] === "need" ? null : glyph(reason[0]), h("span", null, terminal ? "Not loaded: no setting here fixes " + (fileOf(m, sl) || sl.name) : (m.door.verb || "Load") + " is off: " + reason[1])));
            else kids.push(h("span", { class: "k-grow" }));
            let primary;
            if (terminal) primary = AB.button("Choose another file...", { onClick: () => AB.flash("Opens the file picker") });
            else if (sl && sl.refusal && sl.refusal.fetch) primary = AB.button("Try again", { onClick: () => AB.go("data-page", "url") });
            else {
                const verb = m.door.verb || "Load";
                const to = m.door.into && m.into === "new" ? m.door.doneNew : m.door.done;
                // The loaded door-entries graph follows what Load (or Edit's Apply) leaves: One edge per
                // Row or Pair, or each entry as a node, and the Add choices
                const entries = m.tables.find((t) => t.id === "entries");
                const records = entries && (to[1] === "door-entries-loading" || (m.door.edit && to[1] === "door-entries"));
                primary = reason ? AB.button(verb, { disabled: reason[1] }) : AB.button(verb, { key: "Enter", onClick: () => { if (records) { DE().loaded.per = entries.kind === "node" ? "nodes" : entries.per; DE().loaded.add = addedKey(m); if (m.door === NEW_DOOR) DE().loaded.fresh = true; } AB.go(to[0], to[1]); } });
            }
            primary.dataset.k = "primary";
            const cancel = AB.button("Cancel", { kind: "secondary", key: "Esc", onClick: () => AB.onPageCancel && AB.onPageCancel() });
            kids.push(h("span", { class: "dpg-btns" }, cancel, primary, AB.needsElement(NEEDS)));
            return { el: h("div", { class: "dpg-foot" }, kids), primary };
        }

        function build() {
            const t = sel();
            const head = AB.pageHead(m.door.title, { backTip: "Cancel" });
            const main = h("div", { class: "dpg-main" }, modelStrip());
            if (t) main.append(headStrip(t), ...grid(t).filter(Boolean), matchReport(t));
            else main.append(h("div", { class: "dpg-grid" }, AB.empty("No tables. Add one with + above the list.")));
            const f = footer();
            const page = h("div", { class: "dpg" }, tablesList(), main, f.el);
            el.append(head, page);
            if (m.first) {
                m.first = false;
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    if (m.focusLoad) f.primary.focus();
                    else { const s = el.querySelector(".dpg-t[tabindex='0']"); if (s) s.focus(); }
                    if (m.menu && m.menu.newType) { const { col: c, sub } = m.menu, t0 = sel(); m.menu = null; nameType(el.querySelector(`[data-k="r:${c}"]`), "New type from " + c, c.replace(/_id$/, ""), (v) => { t0.roles[c] = role(sub, v, null, { fresh: true }); }); }
                    if (m.menu) { const b = el.querySelector(`[data-k="r:${m.menu.col}"]`); if (b) openRoleMenu(b, sel(), m.menu.col, m.menu.sub); m.menu = null; }
                    if (m.pop) openSettings();
                    if (m.moved) AB.notice("Weight moved from " + m.moved[0] + " to " + m.moved[1], { label: "Undo", onClick: () => { const x = sel(); delete x.roles.count; x.roles[m.moved[0]] = role("weight"); redraw(); } });
                }));
            }
        }
        build();
    }

    const TRANSFERS = ["transfers", "kind-as-type", "weight-moved", "edit-source", "edit-accounts", "edit-source-lost", "replace", "url", "refused-fetch", "load-into", "one-at-a-time", "edge-list", "refused-parse", "refused-endpoints"];
    registerSection({
        id: "data-page",
        title: "Data page",
        region: "workspace",
        rail: "data",
        frame: (state) => ({ dataset: TRANSFERS.includes(state) ? "transactions" : state === "graph-file" || state === "edit-graph-file" || (state || "").startsWith("detect") ? "lesmis" : "doorEntries" }),
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
            { id: "load-into", label: "Dropped on an open graph" },
            { id: "one-at-a-time", label: "One load at a time" },
            { id: "refused-empty", label: "Refused: empty file" },
            { id: "refused-parse", label: "Refused: could not be read" },
            { id: "refused-endpoints", label: "Refused: no endpoint columns" },
            { id: "refused-fetch", label: "Refused: fetch failed" },
            { id: "refused-too-large", label: "Refused: too large to draw" },
        ],
        render,
    });
})();
