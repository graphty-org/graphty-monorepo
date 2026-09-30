/* Inspector: a data source. The source row's one body (no tabs), and the home of its import
   report: Summary (at load), Read with (read-only; Re-map columns... in "..."), Kept in this
   project, Import report. Numbers from kit/fixtures.json (transfers for the files, the protein
   evidence file for the warnings). Plain ASCII. */
(function () {
    "use strict";
    const T = () => AB.fx.datasets.transactions;
    const P = () => AB.fx.datasets.ppiEvidence;
    const n = (x) => Number(x).toLocaleString("en-US");
    const EDGE_FILE = "transfers-2026-03.csv"; // as Data > Sources names it (fixtures: transactions.file)
    const NODE_FILE = "accounts-2026-03.csv";
    const URL = "https://data.example.com/exports/transfers-2026-03.csv";
    const FP = "3f9a1c0e77b2";
    const FP_NEW = "c41d09b85e6f";

    const css = `
.src-cap { padding: 0 16px 8px; color: var(--cm-text-secondary); font-size: 11px; line-height: 15px; }
.src-sec .k-data .k-name { flex: none; width: 104px; white-space: normal; line-height: 15px; }
.src-sec .k-data .k-value { flex: 1; min-width: 0; white-space: normal; overflow-wrap: anywhere; text-align: right; line-height: 15px; }
.src-sec .k-data { min-height: 24px; height: auto; align-items: flex-start; padding-top: 4px; padding-bottom: 4px; box-sizing: border-box; }
.src-mono { font-family: var(--cm-font-mono, ui-monospace, monospace); font-size: 11px; }
.src-nest { display: flex; align-items: flex-start; gap: 6px; padding: 2px 16px 6px 16px; color: var(--cm-text-secondary); }
.src-nest .k-i { color: var(--cm-icon-secondary); flex: none; }
.src-oq { margin: 0 16px 8px; }
.src-warn { display: flex; gap: 6px; align-items: flex-start; padding: 2px 16px 6px; line-height: 15px; }
.src-warn .k-i { flex: none; margin-top: 1px; color: var(--cm-text-secondary); }
`;
    const oq = (text, why) => h("div", { class: "src-oq" }, h("span", { class: "k-annot-tag", title: why }, "Open question"), " ", h("span", { class: "k-secondary" }, text));
    const cap = (text) => h("div", { class: "src-cap" }, text);
    const sec = (title, key, summary, ...kids) => {
        const s = AB.section({ title, collapsible: true, key: "src." + key, summary }, ...kids);
        s.classList.add("src-sec");
        return s;
    };
    const warn = (...kids) => h("div", { class: "src-warn" }, icon("triangle-alert", "sm"), h("span", null, ...kids));

    // ---------- the states ----------
    function spec(state) {
        const t = T(), p = P();
        const transfers = {
            icon: "file", title: EDGE_FILE,
            counts: `${n(t.nodes)} nodes, ${n(t.edges)} edges`,
            directed: "Directed",
            read: "Sep 28 2026, 10:02",
            with: [
                ["Format", "CSV, edge list (detected)"],
                ["Delimiter", "Comma"],
                ["Node id", "from the edge endpoints"],
                ["Label", "none: the id shows"],
                ["Source, target", h("span", null, "from_account, to_account")],
                ["Edge id", "none: each row is its own edge"],
                ["Weight", "amount"],
                ["Direction", "Directed (you chose it at load)"],
                ["Repeated pairs", "Keep all"],
                ["Id coercion", "1 and \"1\" are one node"],
                ["Stop after", "100 errors"],
            ],
            report: [
                ["Endpoint spelling", "from_account, to_account (found by name)"],
                ["Rejected records", "None"],
                ["Repeated pairs", "None found"],
                ["Weight from", "the amount column, read as a number"],
                ["Duration", "about a second"],
                ["Warnings", "None"],
            ],
        };
        const S = {
            file: Object.assign({}, transfers, { kept: "A copy of the file", keptCap: "Opening the project replays this load from the copy. The original file is never read again." }),
            paste: Object.assign({}, transfers, {
                icon: "copy", title: "Pasted text", read: "Sep 28 2026, 10:02",
                with: transfers.with.map((r) => (r[0] === "Format" ? ["Format", "CSV, edge list (detected from the pasted text)"] : r)),
                kept: "A copy of the pasted text", keptCap: "Opening the project replays this load from the copy.",
            }),
            paired: Object.assign({}, transfers, {
                paired: true,
                with: transfers.with.map((r) => (r[0] === "Node id" ? ["Node id", "id, in " + NODE_FILE] : r[0] === "Label" ? ["Label", "none: the id shows"] : r)),
                kept: "A copy of both files", keptCap: "The node file and the edge file were one load; they are replaced together.",
                report: transfers.report.slice(0, 1).concat([
                    ["Node file", `${NODE_FILE}: ${n(t.nodes)} nodes, id matched to both endpoint columns`],
                ], transfers.report.slice(1)),
            }),
            url: Object.assign({}, transfers, {
                icon: "link", title: EDGE_FILE, url: URL, fp: FP,
                kept: "The address and the read options",
                keptCap: "Opening the project reads the address again with the same options, and compares the fingerprint.",
            }),
            derived: {
                icon: "split", title: "Bipartite projection on kind",
                derived: true,
                counts: null,
                kept: "Nothing: it is rebuilt from Transfers",
            },
            "import-report-warnings": {
                icon: "file", title: p.file,
                counts: `${n(p.nodes)} nodes, ${n(p.edges)} edges`,
                directed: "Undirected",
                read: "Sep 28 2026, 09:40",
                with: [
                    ["Format", "CSV, edge list (detected from .tsv)"],
                    ["Delimiter", "Tab"],
                    ["Node id", "from the two protein columns"],
                    ["Label", "none: the gene symbol shows"],
                    ["Source, target", "protein1, protein2"],
                    ["Edge id", "none: each row is its own edge"],
                    ["Weight", "none: confidence is text"],
                    ["Direction", "Undirected (as the file says)"],
                    ["Repeated pairs", "Keep all"],
                    ["Id coercion", "1 and \"1\" are one node"],
                    ["Stop after", "100 errors"],
                ],
                kept: "A copy of the file", keptCap: "Opening the project replays this load from the copy.",
                warnings: true,
                report: [
                    ["Endpoint spelling", "protein1, protein2 (found by name)"],
                    ["Rejected records", "None"],
                    ["Repeated pairs", h("span", null, "Kept all: ", AB.link("table-dock", "edges", n(p.parallelEdges) + " edges"), " repeat a pair; " + n(p.pairs) + " distinct pairs")],
                    ["Weight from", "no column: confidence was read as text"],
                    ["Duration", "about a second"],
                ],
            },
        };
        S["url-changed"] = Object.assign({}, S.url, { changed: true });
        S.failed = Object.assign({}, S.url, { failed: true });
        return S[state] || S.file;
    }

    // ---------- the body ----------
    function body(s) {
        const p = P();
        const out = [];
        if (s.derived) {
            out.push(sec("Summary", "summary", "Derived from Transfers",
                AB.data("Derived from", AB.link("graphs-switcher", "two-graphs", "Transfers")),
                AB.data("How", "Bipartite projection on kind"),
                AB.data("Made", "Sep 28 2026"),
                cap("Read-only. A derived graph has no file of its own, so there is nothing to re-map, replace or refresh."),
                h("div", { class: "src-cap" }, "Derived graphs ", AB.needsElement("graphty-element has no projection, quotient, sample, combine or extract yet; this state is drawn for when it does"))));
            out.push(sec("Kept in this project", "kept", s.kept, AB.data("Kept", s.kept)));
            out.push(oq("Is a derived graph rebuilt on open, or kept as its own copy?", "If Transfers is later replaced, a rebuilt projection silently changes. The element decides nothing here yet."));
            out.push(AB.notesSection(0));
            return out;
        }

        // Summary, as the element reported it when the load finished
        const summary = [
            AB.data("Nodes and edges", s.counts),
            AB.data("Direction", s.directed),
            AB.data("Read", s.read),
        ];
        if (s.url) summary.push(AB.data("Address", h("span", { class: "src-mono", title: s.url }, s.url.replace("https://", ""))));
        if (s.fp) summary.push(AB.data("Fingerprint", h("span", { class: "src-mono" }, s.changed ? FP_NEW + " (now)" : s.fp)));
        if (s.changed) summary.push(AB.data("At last open", h("span", { class: "src-mono" }, FP)));
        out.push(sec("Summary", "summary", s.counts + ", at load",
            s.paired ? h("div", { class: "src-nest" }, icon("file", "sm"), h("span", null, NODE_FILE + ", the node file, loaded with it")) : null,
            ...summary,
            cap("At load: the counts the element reported when this load finished. Filters and later edits do not change them.")));

        // Read with (read-only)
        out.push(sec("Read with", "readwith", s.with.find((r) => r[0] === "Format")[1],
            ...s.with.map((r) => AB.data(r[0], r[1])),
            cap("Read-only here. To change how the file is read, use Re-map columns... in the \"...\" menu.")));

        // Kept in this project (the answer to extract or live)
        out.push(sec("Kept in this project", "kept", s.kept, AB.data("Kept", s.kept), cap(s.keptCap)));

        // Import report
        const rep = s.report.map((r) => AB.data(r[0], r[1]));
        const warnings = s.warnings ? [
            warn(AB.link("table-dock", "edges", n(p.naScores) + " rows"), " read NA in confidence; kept as missing values."),
            warn("confidence is text, so no weight was read. A run that needs a weight asks for one."),
        ] : [];
        out.push(sec("Import report", "report",
            s.warnings ? "2 warnings" : "No warnings",
            ...rep,
            s.warnings ? AB.data("Warnings", "2") : null,
            ...warnings,
            cap("The element's report of this load, kept with the source. Rejected records are listed here by row number, up to the error limit.")));
        if (s.paired) out.push(oq("Counts per file are not shown.", "The element reports one load, not each file's share; per-source counts need graphty-element."));
        out.push(AB.notesSection(0));
        return out;
    }

    registerSection({
        id: "inspector-source",
        title: "Inspector: a data source",
        region: "right",
        rail: "data",
        frame: { left: "data-place/sources" },
        states: [
            { id: "file", label: "A file (transfers-2026-03.csv)" },
            { id: "paired", label: "An edge file with its node file" },
            { id: "url", label: "From a URL" },
            { id: "url-changed", label: "From a URL, changed since last open" },
            { id: "failed", label: "From a URL, refresh failed" },
            { id: "derived", label: "A derived graph's origin" },
            { id: "import-report-warnings", label: "Import report with warnings" },
            { id: "paste", label: "Pasted text" },
        ],
        render(el, state) {
            if (!document.getElementById("src-style")) document.head.append(h("style", { id: "src-style" }, css));
            const s = spec(state);
            let stateBar = null;
            if (s.changed) stateBar = { text: "The data at this address changed since you last opened it. Refresh is in the \"...\" menu." };
            if (s.failed) stateBar = { text: "Refresh failed: the address did not answer after three tries. The graph is unchanged." };
            el.append(AB.inspector({
                icon: s.icon,
                title: s.title,
                kind: "Source",
                provenance: s.derived ? ["from Transfers, Sep 28", "graphs-switcher", "two-graphs"] : null,
                menu: ["context-menus", "source"],
                stateBar,
                onRename: (name) => AB.announce("Source renamed to " + name),
                body: body(s),
            }));
        },
    });
})();
