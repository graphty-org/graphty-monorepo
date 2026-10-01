/* Load step: the one load dialog behind every data door (Data > Sources "+", a source row's
   Replace with file... and Edit source..., the start screen's New from data..., a drop, Ctrl+V,
   the empty-canvas card, Quick actions). Source choices File, URL and Paste; left column Format,
   Column Separator, Direction, More options (a popover), and Load into only on a drop or paste
   into an open graph; right column the sample, whose column headers carry each column's
   structural role. The field names stand in for graphty-element's format catalog
   (FORMAT_DESCRIPTORS plainName, UNSERVED_FORMAT_IDS); the real app reads them from the element.
   Plain ASCII. Data from kit/fixtures.json. This file injects its own styles (ls-*).
   Routes kept for other sections: #/load-step/replace opens edit-source-lost-fields and
   #/load-step/remap opens edit-source. */
(function () {
    "use strict";
    const css = `
.ls-modal { width: 1040px; max-width: calc(100vw - 32px); height: min(600px, calc(100vh - 96px)); }
.ls-modal > .k-modal-body { flex: 1 1 auto; min-height: 0; padding: 0; display: grid; grid-template-columns: 360px minmax(0, 1fr); overflow: hidden; }
.ls-left { overflow: auto; padding: 12px 0; border-inline-end: 1px solid var(--cm-border); min-width: 0; }
.ls-right { overflow: auto; padding: 4px 0 12px; min-width: 0; }
.ls-left .ab-fctl { display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 4px; min-width: 0; text-align: start; }
.ls-left .ab-fctl > .k-field, .ls-left .ab-fctl > input, .ls-left .ab-fctl > .ls-line { width: 100%; box-sizing: border-box; }
.ls-line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-width: 0; }
.ls-line > .k-field { flex: 1 1 auto; min-width: 0; }
.ls-auto { font-size: 10px; line-height: 14px; padding: 0 4px; border-radius: 3px; color: var(--cm-text-secondary); box-shadow: inset 0 0 0 1px var(--cm-border); flex: none; }
.ls-prob { display: flex; gap: 6px; align-items: flex-start; font-size: 11px; line-height: 15px; color: var(--cm-text); }
.ls-prob .k-warn-glyph { margin-top: 1px; }
.ls-mark { box-shadow: inset 0 0 0 1px var(--cm-bg-warning), inset 3px 0 0 var(--cm-bg-warning) !important; }
.ls-mark-err { box-shadow: inset 0 0 0 1px var(--cm-bg-danger), inset 3px 0 0 var(--cm-bg-danger) !important; }
.ls-cap { display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 16px; margin-top: 4px; }
.ls-cap b { font-weight: 550; }
.ls-grid { padding: 0 16px; overflow-x: auto; }
.ls-grid .k-table th, .ls-grid .k-table td { height: 26px; }
.ls-grid td.ls-clip { max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
.ls-role { display: flex; align-items: center; gap: 4px; margin-top: 2px; font-weight: 450; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); cursor: pointer; border-radius: 3px; padding: 0 2px; margin-inline-start: -2px; }
.ls-role:hover, .ls-role:focus-visible { background: var(--cm-bg-hover); color: var(--cm-text); }
.ls-role[data-set] { color: var(--cm-text-brand); }
.ls-grid-prob { padding: 6px 16px 0; }
.ls-pre { margin: 0 16px; padding: 8px 12px; border-radius: 6px; background: var(--cm-bg-secondary); font: 12px/18px var(--cm-font-mono, ui-monospace, monospace); white-space: pre; overflow: auto; max-height: 240px; }
textarea.ls-pre { width: calc(100% - 32px); box-sizing: border-box; border: 0; color: var(--cm-text); resize: vertical; min-height: 160px; }
.ls-right .ab-empty { padding: 4px 16px; }
.ls-foot { justify-content: flex-start !important; height: auto !important; min-height: 48px; flex-wrap: wrap; padding-block: 8px !important; }
.ls-reason { display: flex; gap: 6px; align-items: flex-start; min-width: 0; flex: 1 1 300px; color: var(--cm-text-secondary); line-height: 16px; }
.ls-reason .k-warn-glyph { margin-top: 1px; }
.ls-lost { display: grid; gap: 2px; }
.ls-lost b { color: var(--cm-text); font-weight: 550; }
.ls-pop .ab-fctl > .k-field { width: 100%; box-sizing: border-box; }
@media (max-width: 1180px) { .ls-modal > .k-modal-body { grid-template-columns: 348px minmax(0, 1fr); } }
`;
    if (!document.getElementById("ls-style")) document.head.append(h("style", { id: "ls-style" }, css));

    const AB = window.AB;
    const { field, button } = AB;
    const T = () => AB.fx.datasets.transactions;
    const TA = () => AB.fx.datasets.transactionsApril;
    const L = () => AB.fx.datasets.lesmis;
    const C = () => AB.fx.datasets.citations;
    const n = (x) => Number(x).toLocaleString("en-US");

    // ---------- the element's catalog (stand-in: FORMAT_DESCRIPTORS and UNSERVED_FORMAT_IDS) ----------
    const FORMATS = [["CSV", ".csv .tsv .tab .edges .edgelist"], ["GraphML", ".graphml .xml"], ["GEXF", ".gexf .xml"], ["GML", ".gml"], ["DOT", ".dot .gv"], ["Pajek NET", ".net .paj"], ["JSON", ".json"]];
    const UNSERVED = { SIF: "No data source reads the Cytoscape simple interaction format.", CX2: "No data source reads the Cytoscape Exchange format." };
    const DECLARES = (f) => f && f !== "CSV"; // formats that can say whether edges are directed
    // plainName where the catalog has one; the rest are stand-ins (one design-note chip says so)
    const NAME = { sep: "Column Separator", start: "Edge Start Field", end: "Edge End Field", nodeCsv: "Node Id Column", node: "Node Id Field" };
    const NO_NAME = "The format catalog has no entry yet for Direction or for the options in More options, so these names are stand-ins until it does";
    const SEPS = [["Comma", "Comma"], ["Tab", "Tab"], ["Semicolon", "Semicolon"], ["Pipe", "Pipe"]];
    const REPEATS = [
        ["Keep each as its own edge", "Every record becomes an edge, with its own weight"],
        ["Keep the first", "Later records for the same pair are dropped"],
        ["Keep the last", "The last record's attributes replace the first's"],
        ["Merge, adding the weights", "One edge per pair; its weight is the sum"],
        ["Merge, keeping the smallest weight", "One edge per pair"],
        ["Merge, keeping the largest weight", "One edge per pair"],
        ["Refuse the load", "A repeated pair stops the load; nothing changes"],
    ];
    const IDS = [["1 and \"1\" are one node", "A number and the same number written as text match"], ["1 and \"1\" are two nodes", "Kept apart, as the file wrote them"]];
    const STOPS = ["After 10 errors", "After 100 errors", "After 1,000 errors", "Never: read every record"];
    const PAIRS = [["source", "target"], ["src", "dst"], ["from", "to"]];
    const ROLE_ORDER = ["node", "start", "end", "edgeId", "x", "y", "z", "attr"];
    const UNIQUE = new Set(["node", "start", "end", "edgeId", "x", "y", "z"]);

    // ---------- files (from the fixtures) ----------
    const tRows = () => T().firstRows.slice(0, 5).map((r) => [r.from_account, r.to_account, r.amount, r.timestamp.replace("T", " ").replace("Z", "")]);
    const CURRENCY = ["$5.04", "$8.97", "$44.63", "$38.01", "$349.71"]; // the gallery's load-transfers sample: amounts written as currency text
    const ACCOUNT_COLS = ["id", "kind", "country", "riskScore", "flagged", "alertRule", "alertTime"];
    const aRows = () => T().flaggedAccounts.slice(0, 4).map((r) => [r.id, r.kind, r.country, String(r.riskScore), String(r.flagged), r.alertRule, r.alertTime.replace("T", " ").replace(":00Z", "")]);
    const transfers = (o) => Object.assign({ name: T().file, cols: T().columns, rows: tRows(), count: T().edges }, o);
    const accounts = (o) => Object.assign({ name: T().accountsFile, cols: ACCOUNT_COLS, rows: aRows(), count: T().nodes }, o);
    const PASTED_XML = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<graph defaultedgetype=\"undirected\">", "  <node id=\"0\" label=\"Myriel\"/>", "  <node id=\"1\" label=\"Napoleon\"/>", "  <node id=\"2\" label=\"Mlle.Baptistine\"/>", "  <edge source=\"1\" target=\"0\" value=\"1\"/>", "  <edge source=\"2\" target=\"0\" value=\"8\"/>", "</graph>"].join("\n");
    const PASTED_PROSE = "Myriel meets Napoleon in chapter 1\nMlle.Baptistine lives with Myriel\nMme.Magloire keeps house for Myriel";
    const LESMIS_URL = "https://example.org/data/miserables.json";

    // ---------- doors: what the title says, what is behind the dialog, where Load goes ----------
    const DOORS = {
        start: { title: () => "Open as a new graph", frame: { full: "start-screen/returning" }, done: () => ["graph-place", "at-rest"] },
        dropOpen: { title: (m) => (m.files[0] ? "Load " + m.files[0].name : m.source === "url" ? "Load from a URL" : "Load pasted text"), frame: { left: "data-place/at-rest" }, into: true, done: (m) => (m.into === "new" ? ["graph-place", "at-rest"] : ["data-place", "at-rest"]) },
        pasteOpen: { title: () => "Load pasted text", frame: { left: "graph-place/at-rest" }, into: true, done: () => ["graph-place", "at-rest"] },
        edit: { title: () => "Edit source: " + T().file, frame: { left: "data-place/at-rest" }, verb: "Apply", done: () => ["data-place", "at-rest"] },
        replace: { title: () => "Replace: " + T().file, frame: { left: "data-place/at-rest" }, verb: "Apply", done: () => ["data-place", "after-replace"] },
    };

    // ---------- states ----------
    const base = (o) => Object.assign({ door: "start", source: "file", files: [], format: "CSV", formatAuto: "Worked out from the name and the first line", sep: "Comma", sepAuto: true, direction: "Directed", repeats: REPEATS[0][0], ids: IDS[0][0], stop: STOPS[1], scale: "1" }, o);
    const STATES = {
        preview: () => base({ files: [transfers()] }),
        checks: () => base({ files: [transfers({ rows: tRows().map((r, i) => [r[0], r[1], CURRENCY[i], r[3]]) })], currency: true }),
        "detect-several": () => base({ door: "pasteOpen", source: "paste", pasted: PASTED_XML, format: null, formatAuto: null, candidates: ["GraphML", "GEXF"], direction: "From file" }),
        "detect-none": () => base({ door: "pasteOpen", source: "paste", pasted: PASTED_PROSE, format: null, formatAuto: null, candidates: [], direction: "From file" }),
        "unsupported-format": () => base({ files: [{ name: "interactions.sif", cols: [], rows: [] }], format: "SIF", formatAuto: "Worked out from the name", unserved: true, direction: "From file", terminal: true }),
        url: () => base({ source: "url", url: LESMIS_URL, format: "JSON", formatAuto: "Worked out from the address", direction: "From file", files: [
            { name: "nodes", label: "Nodes in " + L().file, cols: ["id", "label", "group"], rows: L().rows.slice(0, 5).map((r) => [r.id, r.label, String(r.group)]), count: L().nodes },
            { name: "links", label: "Edges in " + L().file, cols: ["source", "target", "value"], rows: [], count: L().edges }] }),
        "load-into": () => base({ door: "dropOpen", files: [{ name: TA().file, cols: TA().files.transfers.columns, rows: [], count: TA().files.transfers.rows }] }),
        paired: () => base({ files: [accounts(), transfers()] }),
        "edit-source": () => base({ door: "edit", files: [accounts(), transfers()] }),
        "edit-source-lost-fields": () => base({ door: "replace", files: [
            { name: TA().files.accounts.file, cols: TA().files.accounts.columns, rows: [], count: TA().files.accounts.rows },
            { name: TA().files.transfers.file, cols: TA().files.transfers.columns, rows: [], count: TA().files.transfers.rows }], lost: true }),
        "refused-empty": () => base({ files: [{ name: "Untitled.csv", cols: T().columns, rows: [], count: 0 }], refusal: "empty", terminal: true }),
        "refused-parse": () => base({ files: [transfers()], refusal: "parse" }),
        "refused-endpoints": () => base({ files: [transfers()], refusal: "endpoints", noAuto: true }),
        "refused-fetch": () => Object.assign(STATES.url(), { refusal: "fetch", files: [] }),
        "refused-too-large": () => base({ files: [{ name: C().file, cols: C().columns, rows: [], count: C().edges }], refusal: "large", terminal: true }),
    };
    const ALIAS = { replace: "edit-source-lost-fields", remap: "edit-source" };

    // ---------- roles under the sample's column headers ----------
    function autoRoles(f, noAuto) {
        f.roles = {};
        const pair = noAuto ? null : PAIRS.find(([a, b]) => f.cols.includes(a) && f.cols.includes(b));
        f.cols.forEach((c) => (f.roles[c] = { role: "attr" }));
        if (!noAuto && f.cols.includes("id") && !pair) f.roles.id = { role: "node", auto: true };
        if (pair) { f.roles[pair[0]] = { role: "start", auto: true }; f.roles[pair[1]] = { role: "end", auto: true }; }
        // The transfers columns match none of the element's endpoint names, so these states show them
        // as already chosen in the headers (refused-endpoints shows the dialog before that choice)
        else if (!noAuto && f.cols.includes("from_account") && f.cols.includes("to_account")) { f.roles.from_account = { role: "start" }; f.roles.to_account = { role: "end" }; }
    }
    const hasRole = (f, r) => f.cols.some((c) => f.roles[c].role === r);
    const edgeFiles = (m) => m.files.filter((f) => hasRole(f, "start") || hasRole(f, "end") || !hasRole(f, "node"));

    let model = null;
    function render(el, state) {
        state = ALIAS[state] || state;
        if (!model || model.state !== state) {
            model = Object.assign({ state }, (STATES[state] || STATES.preview)());
            model.files.forEach((f) => autoRoles(f, model.noAuto));
            model.into = null;
            model.parsedPaste = false;
        }
        const m = model;
        const door = DOORS[m.door];
        const roleName = (r) => ({ node: m.format === "CSV" ? NAME.nodeCsv : NAME.node, start: NAME.start, end: NAME.end, edgeId: "Edge Id", x: "Position x", y: "Position y", z: "Position z", attr: "Attribute" })[r];
        let pop = null;
        const closeMenus = () => { el.querySelectorAll(".ls-menu").forEach((x) => x.remove()); };
        const closePop = (refocus) => { if (!pop) return; const a = pop.anchor; pop.el.remove(); pop = null; m.moreOpen = false; if (refocus && a && a.isConnected) a.focus(); };
        const redraw = () => { closeMenus(); const reopen = m.moreOpen; closePop(); el.replaceChildren(); build(); if (reopen) openMore(); };

        // A dark menu over the dialog. items: [label, desc?] or { label, desc, disabled, heading, sep, onClick }
        function pickMenu(anchor, value, options, set) {
            closeMenus();
            const items = options.map((opt) => {
                if (opt.sep || opt.heading) return opt;
                const it = Array.isArray(opt) ? { label: opt[0], desc: opt[1] } : typeof opt === "string" ? { label: opt } : opt;
                return Object.assign({ check: it.label === value }, it, it.disabled ? {} : { onClick: it.onClick || (() => { set(it.label); redraw(); }) });
            });
            const mn = AB.menu({ anchor, place: "below-start", items, onClose: () => { closeMenus(); anchor.focus(); } });
            mn.classList.add("ls-menu");
            el.append(mn);
            requestAnimationFrame(() => requestAnimationFrame(() => { const f = mn.querySelector("[aria-checked=true], .k-menu-item:not([aria-disabled])"); if (f) f.focus(); }));
        }
        function pick(value, options, set, o) {
            o = o || {};
            const f = field(value, { caret: true, onClick: (e) => pickMenu(e.currentTarget, value, options, set) });
            if (o.name) f.setAttribute("aria-label", o.name);
            if (o.mark) f.classList.add(o.mark === "err" ? "ls-mark-err" : "ls-mark");
            return f;
        }
        const auto = (why) => (why ? AB.tip(h("span", { class: "ls-auto", tabindex: "0" }, "auto"), why === true ? "Worked out from the first line" : why) : null);
        const prob = (level, kids) => h("div", { class: "ls-prob", role: level === "err" ? "alert" : null }, h("span", { class: "k-warn-glyph" + (level === "err" ? " k-err-glyph" : "") }, "!"), h("span", null, kids));
        const segOf = (opts, value, set, label, tips) => {
            const s = AB.seg(opts, value, (v) => { set(v); redraw(); }, { label });
            const radios = [...s.children];
            if (!radios.some((r) => r.tabIndex === 0)) radios[0].tabIndex = 0; // nothing chosen yet: the group still takes Tab
            if (tips) radios.forEach((r, i) => tips[i] && AB.tip(r, tips[i], { label: false }));
            return s;
        };

        // ---------- what blocks Load, what warns, and where each shows ----------
        function problems() {
            const p = {};
            if (m.source === "url" && !m.url) p.source = ["err", "Enter an address"];
            else if (m.source === "paste" && !m.pasted) p.source = ["err", "Paste the text with Ctrl+V"];
            else if (m.refusal === "empty") p.source = ["err", "Untitled.csv has a header row and nothing under it, so it holds no nodes and no edges"];
            else if (m.refusal === "large") p.source = ["err", n(C().nodes) + " nodes and " + n(C().edges) + " edges: a graph draws up to " + n(C().drawingLimit) + " nodes"];
            else if (m.refusal === "fetch") p.source = ["err", "The address did not answer after 3 tries. Check it and your connection"];
            if (m.unserved) p.format = ["err", UNSERVED[m.format]];
            else if (!m.format && m.candidates && m.candidates.length) p.format = ["warn", "The text matches " + m.candidates.join(" and ") + ": choose one"];
            else if (!m.format && m.source === "paste" && m.pasted) p.format = ["err", "Nothing recognized this text. Choose a format, or paste a file's text as it is saved"];
            if (m.refusal === "parse") p.sep = ["err", ["Lines 2 and 5 have 5 columns where the header has 4: an amount holds a comma. Quote the amounts in the file, or choose Semicolon if the file uses it. ", AB.openQuestion("The line numbers are a stand-in: the fixture file reads cleanly; the element's error summary supplies the real ones")]];
            if (m.format && !m.unserved && m.files.length && !p.source) {
                const ef = edgeFiles(m);
                if (ef.length && !ef.some((f) => hasRole(f, "start") && hasRole(f, "end")))
                    p.roles = ["err", "No " + NAME.start + " or " + NAME.end + ": none of source, src or from is a column here. Choose them in the column headers"];
            }
            if (m.currency && m.format) p.grid = ["warn", ["amount is written as currency (\"$5.04\"), so it loads as text. Read it as a number in Data > Attributes after the load. ", AB.needsElement("Reading currency text as a number, and checking a column before the load, are not in the element yet")]];
            const block = (p.source && m.refusal !== "fetch" && p.source) || (!m.format && !m.unserved && ["err", m.candidates && m.candidates.length ? "Choose " + m.candidates.join(" or ") + " under Format" : "Choose a format"]) || (p.format && p.format[0] === "err" && p.format) || (p.roles && ["err", "Choose an " + NAME.start + " and an " + NAME.end + " in the column headers"]) || (door.into && !m.into && ["need", "Choose where it loads, under Load into"]);
            return { p, block };
        }

        // ---------- left column ----------
        function left(P) {
            const rows = [];
            const srcOpts = [["file", "File"], ["url", "URL"], ["paste", "Paste"]];
            rows.push(AB.fieldRow("Source", segOf(srcOpts, m.source, (v) => { m.source = v; m.refusal = m.terminal = null; if (v === "file" && !m.files.length) { m.files = [transfers()]; autoRoles(m.files[0]); m.format = "CSV"; } if (v === "url" && !m.url) { m.url = ""; m.files = []; m.format = null; } if (v === "paste" && !m.pasted) { m.pasted = ""; m.files = []; m.format = null; } }, "Source"), { popover: true }));
            let srcCtl;
            if (m.source === "url") {
                const inp = h("input", { class: "k-field k-id", type: "url", value: m.url || "", placeholder: "https://", "aria-label": "Address", spellcheck: "false" });
                inp.addEventListener("change", () => { m.url = inp.value.trim(); m.refusal = null; if (m.url) { m.format = "JSON"; m.formatAuto = "Worked out from the address"; } redraw(); });
                if (P.p.source) inp.classList.add("ls-mark-err");
                srcCtl = AB.fieldRow("Address", [inp, P.p.source ? prob("err", P.p.source[1]) : null], { popover: true });
            } else if (m.source === "paste") {
                srcCtl = AB.fieldRow("Text", [h("span", { class: "k-secondary" }, m.pasted ? m.pasted.split("\n").length + " lines, shown on the right" : "Nothing pasted yet"), P.p.source ? prob("err", P.p.source[1]) : null], { popover: true });
            } else {
                const fs = m.files.map((f) => { const x = field(f.name, { icon: "file", onClick: () => AB.flash("Opens the file picker") }); x.classList.add("k-id"); AB.tip(x, "Choose another file", { label: false }); if (P.p.source) x.classList.add("ls-mark-err"); return x; });
                srcCtl = AB.fieldRow(m.files.length > 1 ? "Files" : "File", [fs, P.p.source ? prob("err", P.p.source[1]) : null], { popover: true });
            }
            rows.push(srcCtl);
            // Format
            const cand = m.candidates || [];
            const fmtItems = (cand.length ? [{ heading: "Matches this text" }].concat(cand.map((c) => [c, FORMATS.find((f) => f[0] === c)[1]]), [{ sep: true }]) : [])
                .concat(FORMATS.filter((f) => !cand.includes(f[0])).map((f) => [f[0], f[1]]))
                .concat([{ sep: true }, { heading: "Named, but nothing reads them" }], Object.keys(UNSERVED).map((k) => ({ label: k, disabled: UNSERVED[k] })));
            const fmtVal = m.format || (cand.length ? "Choose: " + cand.join(" or ") : "Choose a format");
            const fmt = pick(fmtVal, fmtItems, (v) => { m.format = v; m.unserved = false; m.terminal = false; m.formatAuto = null; m.direction = DECLARES(v) ? "From file" : "Directed"; if (m.source === "paste" && v !== "CSV") pasteSample(); }, { name: "Format", mark: P.p.format ? P.p.format[0] : !m.format && "warn" });
            if (!m.format || P.p.format) fmt.dataset.need = "";
            rows.push(AB.fieldRow("Format", [h("span", { class: "ls-line" }, fmt, auto(m.format && m.formatAuto)), P.p.format ? prob(P.p.format[0], P.p.format[1]) : null], { popover: true }));
            if (m.format === "CSV") {
                const s = segOf(SEPS, m.sep, (v) => { m.sep = v; m.sepAuto = false; if (m.refusal === "parse") m.refusal = null; }, NAME.sep);
                if (P.p.sep) s.classList.add("ls-mark-err"), (s.dataset.need = "");
                rows.push(AB.fieldRow(NAME.sep, [h("span", { class: "ls-line" }, s, auto(m.sepAuto)), P.p.sep ? prob("err", P.p.sep[1]) : null], { popover: true }));
            }
            if (m.format && !m.unserved) {
                const dirOpts = (DECLARES(m.format) ? [["From file", "From file"]] : []).concat([["Directed", "Directed"], ["Undirected", "Undirected"]]);
                const dirTips = (DECLARES(m.format) ? ["As the file says; a file with both kinds of edge reads as mixed"] : []).concat(["Every edge points from its start to its end", "An edge is the same both ways"]);
                rows.push(AB.fieldRow("Direction", segOf(dirOpts, m.direction, (v) => (m.direction = v), "Direction", dirTips), { popover: true }));
                const more = button("More options", { kind: "secondary", icon: "sliders-horizontal", onClick: (e) => { m.moreOpen ? closePop(true) : openMore(e.currentTarget); } });
                more.dataset.lsMore = "";
                more.setAttribute("aria-haspopup", "dialog");
                more.setAttribute("aria-expanded", String(!!m.moreOpen));
                rows.push(AB.fieldRow("", h("span", { class: "ls-line" }, more, AB.needsElement(NO_NAME)), { popover: true }));
            }
            if (door.into) {
                const s = segOf([["this", "This graph"], ["new", "New graph"]], m.into, (v) => (m.into = v), "Load into", [m.door === "dropOpen" ? "Adds its nodes and edges to Transfers, as a second source" : "Adds its nodes and edges to Les Miserables, as a second source", "Opens it as its own graph, in this project"]);
                if (!m.into) s.dataset.need = "";
                rows.push(AB.fieldRow("Load into", s, { popover: true }));
            }
            return h("div", { class: "ls-left" }, rows);
        }

        // ---------- More options (the one light popover; it stays inside the dialog) ----------
        function openMore(anchor) {
            anchor = anchor || el.querySelector("[data-ls-more]");
            if (!anchor) return;
            closeMenus();
            const ef = edgeFiles(m)[0];
            const cols = ef ? ef.cols : [];
            const curEdgeId = ef && cols.find((c) => ef.roles[c].role === "edgeId");
            const posCols = ef ? ["x", "y", "z"].map((r) => m.files.flatMap((f) => f.cols.filter((c) => f.roles[c].role === r))[0]).filter(Boolean) : [];
            const body = h("div", { class: "ls-pop" },
                AB.fieldRow("Edge Id", pick(curEdgeId || "None", [["None", "Repeats are decided by their start and end"]].concat(cols.filter((c) => !["start", "end"].includes(ef.roles[c].role))), (v) => setRole(ef, v === "None" ? null : v, "edgeId", curEdgeId), { name: "Edge Id" }), { popover: true }),
                AB.fieldRow("Positions", h("span", { class: "k-secondary", style: "line-height:24px" }, posCols.length ? posCols.join(", ") : "None: the layout places every node"), { popover: true }),
                posCols.length ? AB.fieldRow("Position Scale", pick(m.scale, ["0.1", "1", "10", "100"], (v) => (m.scale = v), { name: "Position Scale" }), { popover: true }) : null,
                AB.fieldRow("Repeated Pairs", pick(m.repeats, REPEATS, (v) => (m.repeats = v), { name: "Repeated Pairs" }), { popover: true }),
                AB.fieldRow("Ids", pick(m.ids, IDS, (v) => (m.ids = v), { name: "Ids" }), { popover: true }),
                AB.fieldRow("Stop Reading", pick(m.stop, STOPS, (v) => (m.stop = v), { name: "Stop Reading" }), { popover: true }));
            const p = AB.popover({ anchor, title: "More options", body, width: 340, place: "right-start" });
            p.querySelector(".k-popover-head .k-icon-btn").replaceWith(AB.iconButton("x", "Close", { key: "Esc", onClick: () => closePop(true) }));
            p.addEventListener("keydown", (e) => { if (e.key === "Escape" && !e.target.closest(".ls-menu")) { e.preventDefault(); e.stopPropagation(); closePop(true); } });
            p.addEventListener("click", (e) => { e.stopPropagation(); if (!e.target.closest(".k-field")) closeMenus(); });
            el.append(p);
            pop = { el: p, anchor };
            m.moreOpen = true;
            anchor.setAttribute("aria-expanded", "true");
            requestAnimationFrame(() => requestAnimationFrame(() => { const f = p.querySelector(".k-popover-body [tabindex='0']"); if (f && !el.querySelector(".ls-menu")) f.focus(); }));
        }

        function setRole(f, col, role, prev) {
            if (prev) f.roles[prev] = { role: "attr" };
            if (!col) return;
            if (UNIQUE.has(role)) m.files.forEach((g) => g.cols.forEach((c) => { if (g.roles[c].role === role && (g === f || role === "node")) g.roles[c] = { role: "attr" }; }));
            f.roles[col] = { role };
            if (m.refusal === "endpoints") m.refusal = null;
        }

        // ---------- right column: the sample ----------
        function pasteSample() {
            m.files = [
                { name: "nodes", label: "Nodes in the pasted text", cols: ["id", "label"], rows: [["0", "Myriel"], ["1", "Napoleon"], ["2", "Mlle.Baptistine"]], count: 3 },
                { name: "edges", label: "Edges in the pasted text", cols: ["source", "target", "value"], rows: [["1", "0", "1"], ["2", "0", "8"]], count: 2 },
            ];
            m.files.forEach((f) => autoRoles(f));
        }
        function grid(f, P) {
            const ends = !!P.p.roles && edgeFiles(m).includes(f);
            const th = (c) => {
                const r = f.roles[c];
                const chip = h("span", Object.assign({ class: "ls-role", role: "button", "aria-haspopup": "menu", "data-set": r.role !== "attr" ? "" : null }, AB.act({ onClick: (e) => {
                    const items = ROLE_ORDER.map((id) => ({ label: roleName(id), check: r.role === id, onClick: () => { setRole(f, id === "attr" ? null : c, id); if (id === "attr") f.roles[c] = { role: "attr" }; redraw(); } }));
                    closeMenus();
                    const mn = AB.menu({ anchor: e.currentTarget, place: "below-start", items, label: "Role of " + c, onClose: () => { closeMenus(); chip.focus(); } });
                    mn.classList.add("ls-menu");
                    el.append(mn);
                    requestAnimationFrame(() => requestAnimationFrame(() => { const x = mn.querySelector("[aria-checked=true]"); if (x) x.focus(); }));
                } })), roleName(r.role), r.auto ? auto("Worked out from the column's name") : null, icon("chevron-down", "sm"));
                AB.tip(chip, "Role of " + c, { label: true });
                if (ends && r.role === "attr" && !m._needFocused) { chip.dataset.need = ""; m._needFocused = true; }
                return h("th", { class: ends && !["start", "end"].includes(r.role) ? "ls-mark-err" : null }, c, chip);
            };
            const cap = h("div", { class: "ls-cap" }, h("b", { class: f.label ? null : "k-id" }, f.label || f.name), f.count != null ? h("span", { class: "k-secondary k-num" }, n(f.count) + " rows") : null);
            const table = h("div", { class: "ls-grid" }, h("table", { class: "k-table" },
                h("thead", null, h("tr", null, f.cols.map(th))),
                h("tbody", null, f.rows.map((row) => h("tr", null, row.map((v, i) => h("td", { class: "k-num" + (f.roles[f.cols[i]].role !== "attr" ? " k-id" : "") + (f.cols[i] === "alertRule" ? " ls-clip" : "") + (m.currency && f.cols[i] === "amount" ? " ls-mark" : "") }, v)))))));
            return [cap, table];
        }
        function right(P) {
            const col = h("div", { class: "ls-right" });
            if (m.source === "paste") {
                const ta = h("textarea", { class: "ls-pre", "aria-label": "Pasted text", spellcheck: "false", placeholder: "Paste with Ctrl+V" });
                ta.value = m.pasted || "";
                ta.addEventListener("change", () => { m.pasted = ta.value; redraw(); });
                col.append(h("div", { class: "ls-cap" }, h("b", null, "Pasted text")), ta);
            }
            if (P.p.roles) col.append(h("div", { class: "ls-grid-prob" }, prob("err", P.p.roles[1])));
            if (m.format && !m.unserved && !m.terminal) m.files.forEach((f) => col.append(...grid(f, P).filter(Boolean)));
            if (m.refusal === "empty") col.append(AB.empty("No rows under the header."));
            if (P.p.grid) col.append(h("div", { class: "ls-grid-prob" }, prob("warn", P.p.grid[1])));
            if (m.terminal || m.refusal === "fetch" || (m.source === "url" && !m.url)) col.append(AB.empty("Nothing to show: nothing was read."));
            return col;
        }

        // ---------- footer ----------
        function footer(P) {
            const kids = [];
            if (P.block && !m.terminal) kids.push(h("span", { class: "ls-reason" }, h("span", { class: "k-warn-glyph" + (P.block[0] === "err" ? " k-err-glyph" : "") }, "!"), h("span", null, P.block[1])));
            else if (m.terminal) kids.push(h("span", { class: "ls-reason" }, h("span", { class: "k-warn-glyph k-err-glyph" }, "!"), h("span", null, (P.p.format || P.p.source)[1])));
            else if (m.lost) {
                const rule = T().attributes.find((a) => a.name === "alertRule");
                const alerted = Object.values(rule.values).reduce((a, b) => a + b, 0);
                kids.push(h("span", { class: "ls-reason" }, h("span", { class: "k-warn-glyph" }, "!"), h("span", { class: "ls-lost" },
                    h("span", null, h("b", null, "2 attributes are not in " + TA().files.accounts.file + ", and Apply drops them:")),
                    h("span", null, h("b", { class: "k-id" }, "alertRule"), " -- the alertRule groups (" + n(alerted) + " accounts) lose their values and arrive switched off"),
                    h("span", null, h("b", { class: "k-id" }, "alertTime"), " -- nothing reads it"),
                    h("span", null, AB.needsElement("graphty-element does not yet report which rows read an attribute that a replacing load drops")))));
            } else if (P.p.sep || m.refusal === "fetch") kids.push(h("span", { class: "ls-reason" }, h("span", { class: "k-warn-glyph k-err-glyph" }, "!"), h("span", null, P.p.sep ? "Not loaded: lines 2 and 5 could not be read" : "Not loaded: the address did not answer")));
            else if (P.p.grid) kids.push(h("span", { class: "ls-reason" }, h("span", { class: "k-warn-glyph" }, "!"), h("span", null, "amount loads as text")));
            else kids.push(h("span", { class: "k-grow" }));
            kids.push(button("Cancel", { kind: "secondary", onClick: () => AB.close() }));
            let primary;
            if (m.terminal) primary = button("Choose another file...", { onClick: () => AB.flash("Opens the file picker") });
            else {
                const verb = door.verb || (m.refusal ? "Load again" : "Load");
                primary = P.block ? button(verb, { disabled: P.block[1] }) : button(verb, { go: door.done(m) });
            }
            kids.push(primary);
            return { kids, primary };
        }

        function build() {
            m._needFocused = false;
            const P = problems();
            const body = [left(P), right(P)];
            const f = footer(P);
            const wrap = AB.modal({ title: door.title(m), body, foot: f.kids });
            const box = wrap.querySelector(".k-modal");
            box.classList.add("ls-modal");
            box.querySelector(".k-modal-foot").classList.add("ls-foot");
            box.addEventListener("click", (e) => { if (!e.target.closest(".k-field, .ls-role")) closeMenus(); if (pop && !e.target.closest("[data-ls-more]")) closePop(); });
            // Initial focus: the first field that needs a choice, else the primary button
            const need = box.querySelector("[data-need]");
            const target = need ? (need.matches(".k-seg") ? need.querySelector("[tabindex='0']") : need) : f.primary;
            if (target) target.setAttribute("data-autofocus", "");
            el.append(wrap);
            // the shell's own focus pass takes the first focusable in document order, so focus here first
            requestAnimationFrame(() => requestAnimationFrame(() => { if (target && target.isConnected && !el.querySelector(".ls-menu, .ab-pop")) target.focus(); }));
        }
        build();
    }

    registerSection({
        id: "load-step",
        title: "Load dialog",
        region: "overlay",
        frame: (state) => DOORS[(STATES[ALIAS[state] || state] || STATES.preview)().door].frame,
        states: [
            { id: "preview", label: "New file, edge ends chosen" },
            { id: "checks", label: "A column needs a look" },
            { id: "detect-several", label: "Pasted: several formats match" },
            { id: "detect-none", label: "Pasted: no format matches" },
            { id: "unsupported-format", label: "Format cannot be read (SIF)" },
            { id: "url", label: "From a URL" },
            { id: "load-into", label: "Dropped on an open graph" },
            { id: "paired", label: "Node file and edge file" },
            { id: "edit-source", label: "Edit source" },
            { id: "edit-source-lost-fields", label: "Replace: attributes lost" },
            { id: "refused-empty", label: "Refused: empty" },
            { id: "refused-parse", label: "Refused: could not be read" },
            { id: "refused-endpoints", label: "Refused: no edge ends" },
            { id: "refused-fetch", label: "Refused: address did not answer" },
            { id: "refused-too-large", label: "Refused: too large" },
        ],
        render,
    });
})();
