/* Inspector: a data source. One body, no tabs: Summary (counts at load, Read, Kept, and for an
   address whether the data changed since the last read) and Made with (warnings first, the match
   line, then only the read settings that are not at their default; each value opens Edit
   source...). Refresh and Try again live in the state bar. Numbers from kit/fixtures.json
   (transfers; the protein evidence file for the file with warnings). Plain ASCII. */
(function () {
    "use strict";
    const T = () => AB.fx.datasets.transactions;
    const P = () => AB.fx.datasets.ppiEvidence;
    const n = (x) => Number(x).toLocaleString("en-US");
    const URL = "https://data.example.com/exports/transfers-2026-03.csv";
    const EDIT = ["load-step", "remap"]; // Edit source... (the load dialog on the current file)
    const HISTORY = ["full-canvas-modes", "version-history"];

    const css = `
.src-warn { display: flex; gap: 6px; align-items: flex-start; padding: 2px 8px 4px 16px; line-height: 16px; }
.src-warn .k-i { flex: none; margin-top: 2px; color: var(--cm-text-secondary); }
.src-line { padding: 2px 8px 6px 16px; color: var(--cm-text-secondary); line-height: 16px; }
.src-chip { padding: 0 16px 8px; }
.src-addr .k-name { flex: none; }
.src-addr .k-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.src-mono { font-family: var(--cm-font-mono, ui-monospace, monospace); font-size: 11px; }
`;
    const warn = (...kids) => h("div", { class: "src-warn" }, icon("triangle-alert", "sm"), h("span", null, ...kids));
    // a non-default read setting: its value opens Edit source... at that field
    const setting = (name, value) => AB.tip(AB.data(name, value, { go: EDIT }), name + ": " + value + ". Opens Edit source... at this field", { label: false });

    function spec(state) {
        const t = T(), p = P();
        const transfers = {
            icon: "file", title: t.file, nodes: t.nodes, edges: t.edges, read: "Sep 28",
            kept: "A copy of the file",
            match: `${n(t.edges)} edges; 0 with an unknown end`,
            settings: [["Edge start", "from_account"], ["Edge end", "to_account"]],
        };
        const S = {
            // the one file state: a file whose load left warnings
            file: {
                icon: "file", title: p.file, nodes: p.nodes, edges: p.edges, read: "Sep 28",
                kept: "A copy of the file",
                warnings: [
                    [AB.link("table-dock", "edges", n(p.naScores) + " rows"), " read NA in confidence; kept as missing values"],
                    ["confidence is text, so no weight was read"],
                    [AB.link("table-dock", "edges", n(p.parallelEdges) + " edges"), " repeat a pair (" + n(p.pairs) + " distinct pairs); all kept"],
                ],
                match: `${n(p.edges)} edges; 0 with an unknown end`,
                settings: [["Separator", "Tab"], ["Edge start", "protein1"], ["Edge end", "protein2"], ["Repeated pairs", "Keep all"]],
            },
            replaced: Object.assign({}, transfers, { read: "Sep 28, replaced Sep 30" }),
            paired: Object.assign({}, transfers, {
                kept: "A copy of both files",
                match: `${n(t.nodes)} nodes in ${t.accountsFile}; ${n(t.edges)} edges; 0 with an unknown end`,
                settings: [["Node file", t.accountsFile], ["Node id", "id"]].concat(transfers.settings),
            }),
            paste: Object.assign({}, transfers, { icon: "copy", title: "Pasted text", kept: "A copy of the pasted text" }),
            url: Object.assign({}, transfers, { icon: "link", url: URL, kept: "The address", changedSince: "No" }),
            derived: { icon: "split", title: "Bipartite projection on kind", derived: true },
        };
        S["url-changed"] = Object.assign({}, S.url, { changedSince: "Yes (Sep 29)", changed: true });
        S.failed = Object.assign({}, S.url, { failed: true });
        return S[state] || S.file;
    }

    function body(s) {
        if (s.derived) {
            return AB.dataTab({
                Summary: { summary: "Derived from Transfers", body: [
                    AB.data("Derived from", AB.link("graphs-switcher", "two-graphs", "Transfers")),
                    AB.data("How", "Bipartite projection on kind"),
                    AB.data("Made", "Sep 28"),
                    h("div", { class: "src-chip" }, AB.needsElement("graphty-element has no projection, quotient, sample, combine or extract yet; this state is drawn for when it does"), " ",
                        AB.openQuestion("Is a derived graph rebuilt on open, or kept as its own copy? If Transfers is later replaced, a rebuilt projection silently changes.")),
                ] },
            }, { kind: "source" });
        }
        const summary = [
            AB.data("Nodes at load", n(s.nodes)),
            AB.data("Edges at load", n(s.edges)),
            AB.tip(AB.data("Read", s.read, { go: HISTORY }), "Opens Version history", { label: false }),
            AB.data("Kept", s.kept),
        ];
        if (s.url) summary.push(Object.assign(AB.data("Address", AB.tip(h("span", { class: "src-mono k-ellipsis", tabindex: "0" }, s.url.replace("https://", "")), s.url, { label: false })), { className: "k-data src-addr" }));
        if (s.changedSince) summary.push(Object.assign(AB.data("Changed since last read", AB.tip(h("span", { tabindex: "0" }, s.changedSince),
            s.changed ? "Fingerprint c41d09b85e6f now; 3f9a1c0e77b2 at the last read" : "Checked Sep 29. Fingerprint 3f9a1c0e77b2, the same as at the last read", { label: false })), { className: "k-data src-addr" }));
        const made = [
            ...(s.warnings || []).map((w) => warn(...w)),
            h("div", { class: "src-line" }, s.match),
            ...s.settings.map((r) => setting(r[0], r[1])),
        ];
        return AB.dataTab({
            Summary: { summary: `${n(s.nodes)} nodes, ${n(s.edges)} edges at load`, body: summary },
            "Made with": { summary: s.warnings ? s.warnings.length + " warnings" : "No warnings", body: made },
        }, { kind: "source" });
    }

    registerSection({
        id: "inspector-source",
        title: "Inspector: a data source",
        region: "right",
        rail: "data",
        frame: { left: "data-place/sources" },
        states: [
            { id: "file", label: "A file, with warnings" },
            { id: "paired", label: "An edge file with its node file" },
            { id: "url", label: "From a URL" },
            { id: "url-changed", label: "From a URL, changed since last read" },
            { id: "failed", label: "From a URL, refresh failed" },
            { id: "derived", label: "A derived graph's origin" },
            { id: "paste", label: "Pasted text" },
            { id: "replaced", label: "After Replace with file..." },
        ],
        render(el, state) {
            if (!document.getElementById("src-style")) document.head.append(h("style", { id: "src-style" }, css));
            const s = spec(state);
            let stateBar = null;
            if (s.changed) stateBar = { text: "The data at this address changed since Sep 29", actions: [{ label: "Refresh", go: ["inspector-source", "url"] }] };
            if (s.failed) stateBar = { text: "Refresh failed after 3 tries", why: "The address did not answer after 3 tries. The graph is unchanged.", actions: [{ label: "Try again", go: ["inspector-source", "url"] }] };
            el.append(AB.inspector({
                icon: s.icon,
                title: s.title,
                kind: "Source",
                provenance: s.derived ? ["from Transfers", "graphs-switcher", "two-graphs"] : null,
                menu: ["context-menus", "source"],
                stateBar,
                changed: !!s.changed,
                onRename: (name) => AB.announce("Source renamed to " + name),
                body: body(s),
            }));
        },
    });
})();
