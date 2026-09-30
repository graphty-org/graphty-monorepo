/* Inspector: a measure row. The Style tab (encoding, scale, domain, legend label, what "no value"
   draws as) and the Data tab (distribution with a brushable histogram, top 10, provenance, the
   attribute it writes, settings and rerun, notes). Plain ASCII.

   Numbers. Les Miserables PageRank and edge betweenness are computed on the published graph the
   fixtures describe (networkx les_miserables_graph: 77 nodes, 254 edges; unweighted; PageRank
   damping 0.85; edge betweenness normalized); its "Filter to degree >= 2" leaves 60 nodes, as
   fixtures.json says. riskScore uses fixtures.json only: the transfers bands (riskScore 20 or
   more keeps 1,071; 70 to 98 holds 143) and the 14 flagged accounts, which the generator scores
   88 to 98 while every other account scores below 80, so they are the top of the ranking.
   The styles for this section are injected once from this file (no shared CSS edited). */
(function () {
    "use strict";
    const A = window.AB;

    // ---------- styles local to this section ----------
    if (!document.getElementById("imr-style")) {
        const s = document.createElement("style");
        s.id = "imr-style";
        s.textContent = `
.imr-scope { margin: 4px 8px 8px; padding: 8px; border-radius: 6px; background: var(--cm-bg-secondary); display: flex; flex-direction: column; gap: 6px; }
.imr-scope-line { display: flex; align-items: center; gap: 6px; font-weight: 550; }
.imr-ctl { display: flex; flex-direction: column; gap: 4px; padding: 4px 16px 8px; }
.imr-ctl > .k-legend { display: flex; align-items: center; gap: 6px; color: var(--cm-text-secondary); }
.imr-two { display: grid; grid-template-columns: 1fr auto 1fr; gap: 6px; align-items: center; }
.imr-seg { height: auto; min-height: 24px; }
.imr-seg4 { display: grid; grid-template-columns: 1fr 1fr; }
.imr-seg > * { cursor: pointer; line-height: 22px; }
.imr-palettes { display: flex; flex-direction: column; gap: 2px; padding: 2px 0; }
.imr-palettes .k-row { gap: 8px; }
.imr-preview { padding: 4px 16px 8px; display: flex; flex-direction: column; gap: 2px; }
.imr-ticks { display: flex; justify-content: space-between; color: var(--cm-text-secondary); font-variant-numeric: tabular-nums; }
.imr-hist { position: relative; margin: 4px 16px 0; height: 72px; display: flex; align-items: flex-end; gap: 1px; cursor: crosshair; user-select: none; touch-action: none; }
.imr-hist > i { flex: 1 1 0; background: var(--cm-border-translucent-strong); border-radius: 1px 1px 0 0; min-height: 1px; }
.imr-hist > i[data-zero] { background: none; border-bottom: 1px solid var(--cm-border-translucent-strong); }
.imr-hist > i[data-on] { background: var(--cm-bg-brand); }
.imr-axis { display: flex; justify-content: space-between; padding: 2px 16px 0; color: var(--cm-text-secondary); font-variant-numeric: tabular-nums; }
.imr-axis-abs { position: relative; height: 16px; margin: 0 16px; padding: 0; }
.imr-axis-abs > span { position: absolute; transform: translateX(-50%); }
.imr-axis-abs > span:first-child { transform: none; }
.imr-axis-abs > span:last-child { transform: translateX(-100%); }
.imr-brushed { margin: 6px 8px 4px; padding: 8px; border-radius: 6px; box-shadow: inset 0 0 0 1px var(--cm-bg-brand); display: flex; flex-direction: column; gap: 6px; }
.imr-acts { display: flex; flex-wrap: wrap; gap: 6px; }
.imr-names { color: var(--cm-text-secondary); }
.imr-top .k-row { cursor: pointer; }
.imr-rank { width: 16px; text-align: end; color: var(--cm-text-secondary); font-variant-numeric: tabular-nums; flex: none; }
.imr-open { display: inline-flex; margin-inline-start: 4px; padding: 0 6px; height: 18px; align-items: center; border-radius: 9px; font-size: 11px; font-weight: 550; color: var(--k-annot-ink, #a3175a); box-shadow: inset 0 0 0 1px var(--k-annot, #e0447c); white-space: nowrap; }
.imr-open-note { color: var(--cm-text-secondary); }
.imr-choice { display: flex; align-items: center; gap: 6px; }
.imr-edgemark { display: inline-flex; align-items: center; }
`;
        document.head.append(s);
    }

    // ---------- the measures ----------
    const MEASURES = {
        pagerank: {
            title: "PageRank",
            over: "node",
            ramp: "measure",
            fmt: (v) => v.toFixed(4),
            meta: "Ran on the full graph: every one of the 77 nodes has a value",
            domain: [0.0033, 0.0754],
            hist: { from: 0, width: 0.005, bins: [9, 24, 19, 16, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 1], unit: "nodes" },
            readings: [["Nodes with a value", "77 of 77"], ["Lowest", "0.0033"], ["Median", "0.0124"], ["Highest", "0.0754"]],
            top: [["Valjean", 0.0754], ["Myriel", 0.0428], ["Gavroche", 0.0358], ["Marius", 0.0309], ["Javert", 0.0303], ["Thenardier", 0.0279], ["Fantine", 0.027], ["Enjolras", 0.0219], ["Cosette", 0.0206], ["Mme.Thenardier", 0.0195]],
            // the nodes in each bin from 0.020 up (bin 4 onward), for the brushed summary
            binNames: { 4: ["Enjolras", "Cosette"], 5: ["Fantine", "Thenardier"], 6: ["Marius", "Javert"], 7: ["Gavroche"], 8: ["Myriel"], 15: ["Valjean"] },
            provenance: [["Computed from", "Co-appearances, full graph"], ["Scope", "77 nodes, 254 edges"], ["Direction", "Undirected, as stored"], ["Weight", "None: each co-appearance counts once"], ["Data", "miserables.json"]],
            writes: "pagerank",
            settings: [["Damping", "0.85"], ["Weight", "None"], ["Iterations", "Up to 100"]],
            run: true,
        },
        edge: {
            title: "Edge betweenness",
            over: "edge",
            ramp: "measure",
            fmt: (v) => v.toFixed(4),
            meta: "Ran on the full graph: every one of the 254 edges has a value",
            domain: [0.0003, 0.1832],
            hist: { from: 0, width: 0.01, bins: [170, 40, 33, 3, 4, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], unit: "edges" },
            readings: [["Edges with a value", "254 of 254"], ["Lowest", "0.0003"], ["Median", "0.0058"], ["Highest", "0.1832"]],
            top: [["Myriel - Valjean", 0.1832], ["Valjean - Gavroche", 0.083], ["Valjean - Fantine", 0.0762], ["Mme.Burgon - Gavroche", 0.0513], ["Valjean - Mlle.Gillenormand", 0.045], ["Valjean - Marius", 0.0443], ["Tholomyes - Marius", 0.0443], ["Valjean - Bossuet", 0.0423], ["Valjean - Enjolras", 0.0393], ["Valjean - Fauchelevent", 0.0364]],
            binNames: { 5: ["Mme.Burgon - Gavroche"], 7: ["Valjean - Fantine"], 8: ["Valjean - Gavroche"], 18: ["Myriel - Valjean"] },
            provenance: [["Computed from", "Co-appearances, full graph"], ["Scope", "77 nodes, 254 edges"], ["Direction", "Undirected, as stored"], ["Weight", "None: each co-appearance counts once"], ["Scaled", "Normalized, 0 to 1"], ["Data", "miserables.json"]],
            writes: "edge betweenness (on edges)",
            settings: [["Weight", "None"], ["Normalized", "Yes"], ["Sample", "Every node (exact)"]],
            run: true,
        },
        risk: {
            title: "riskScore",
            over: "node",
            ramp: "measure",
            fmt: (v) => String(v),
            meta: "From accounts-2026-03.csv: painted by Color by on the attribute",
            domain: [0, 98],
            // unequal bands straight from the fixtures; bar height is accounts per score point
            bands: [
                { from: 0, to: 19, count: 1929 },
                { from: 20, to: 69, count: 928 },
                { from: 70, to: 79, count: 129 },
                { from: 80, to: 87, count: 0 },
                { from: 88, to: 98, count: 14 },
            ],
            readings: [["Accounts with a score", "3,000 of 3,000"], ["Range", "0 to 98"], ["Scored 20 or more", "1,071"], ["Scored 70 or more", "143"]],
            top: [["ACC-233575", 98], ["ACC-782213", 97], ["ACC-577269", 97], ["ACC-642959", 96], ["ACC-753261", 95], ["ACC-946224", 93], ["ACC-309606", 93], ["ACC-365386", 92], ["ACC-242954", 92], ["ACC-888258", 92]],
            provenance: [["Came from", "accounts-2026-03.csv, joined on account id"], ["Computed by", "Not graphty: the bank's own score, 0 to 100"], ["Scope", "All 3,000 accounts"]],
            writes: "riskScore",
            run: false,
        },
    };
    const PALETTES = [
        { id: "measure", name: "Orange to brown", cls: "k-ramp k-ramp-measure", note: "the default" },
        { id: "viridis", name: "Viridis", cls: "k-ramp" },
        { id: "redblue", name: "Red to blue (diverging)", cls: "k-ramp k-ramp-redblue" },
    ];

    // ---------- small builders ----------
    const openQ = (text) => h("span", { class: "imr-open", title: text }, "Open question");
    function seg(options, active, onPick, label) {
        const g = h("span", { class: "k-seg k-seg-fill imr-seg" + (options.length > 3 ? " imr-seg4" : ""), role: "radiogroup", "aria-label": label });
        options.forEach((o) => {
            const b = h("span", { role: "radio", tabindex: "0", "aria-checked": String(o === active) }, o);
            const pick = () => {
                g.querySelectorAll("[role=radio]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
                onPick && onPick(o);
            };
            b.addEventListener("click", (e) => { e.stopPropagation(); pick(); });
            b.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick()));
            g.append(b);
        });
        return g;
    }
    const ctl = (label, ...kids) => h("div", { class: "imr-ctl" }, h("span", { class: "k-legend" }, label), kids);

    // ---------- Style tab ----------
    function styleTab(m) {
        const edge = m.over === "edge";
        const channels = edge ? ["Edge color", "Edge width"] : ["Color", "Size"];
        let palette = PALETTES[0];
        const wrap = h("div");
        const encBody = h("div");
        const preview = h("div", { class: "imr-preview" });
        const drawPreview = (channel) => {
            const isSize = channel === "Size" || channel === "Edge width";
            A.append(preview.replaceChildren() || preview, [
                isSize
                    ? h("div", { class: "k-size-marks" }, (edge ? [1, 3, 6] : [4, 12, 24]).map((px, i) => h("div", null, edge ? h("b", { style: `width:28px;height:${px}px;border-radius:1px` }) : h("b", { style: `width:${px / 1.5}px;height:${px / 1.5}px` }), [m.domain[0], "", m.domain[1]][i] === "" ? "" : m.fmt([m.domain[0], 0, m.domain[1]][i]))))
                    : h("span", { class: palette.cls + " k-ramp-wide" }),
                isSize ? null : h("div", { class: "imr-ticks" }, h("span", null, m.fmt(m.domain[0])), h("span", null, m.fmt(m.domain[1]))),
            ]);
        };
        const drawEncoding = (channel) => {
            const isSize = channel === "Size" || channel === "Edge width";
            if (isSize) {
                encBody.replaceChildren(
                    ctl(edge ? "Width range" : "Size range", h("div", { class: "imr-two" }, A.field(edge ? "0.5 px" : "4 px", { onClick: () => A.flash("Smallest size (not wired in the skeleton)") }), h("span", { class: "k-secondary" }, "to"), A.field(edge ? "6 px" : "24 px", { onClick: () => A.flash("Largest size (not wired in the skeleton)") }))),
                );
            } else {
                const list = h("div", { class: "imr-palettes", hidden: true });
                const rampField = A.field(palette.name, { caret: true, onClick: () => (list.hidden = !list.hidden) });
                rampField.prepend(h("span", { class: palette.cls, style: "width:24px" }));
                PALETTES.forEach((p) =>
                    list.append(A.row({ swatch: h("span", { class: p.cls, style: "width:24px" }), label: p.name + (p.note ? ", " + p.note : ""), selected: p === palette, onClick: () => { palette = p; drawEncoding(channel); drawPreview(channel); } })),
                );
                encBody.replaceChildren(ctl("Color ramp", rampField, list));
            }
            drawPreview(channel);
        };
        const channelSeg = seg(channels, channels[0], (c) => drawEncoding(c), "Encoding");
        drawEncoding(channels[0]);

        // what "no value" draws as: nothing by default; a picked color is the reader's
        const noValBody = h("div");
        const drawNoVal = (choice) => {
            A.append(noValBody.replaceChildren() || noValBody, [
                choice === "Nothing"
                    ? h("div", { class: "k-secondary" }, (edge ? "Edges" : m.title === "riskScore" ? "Accounts" : "Nodes") + " this " + (m.run ? "run did not score" : "attribute leaves empty") + " keep the look of the rows beneath.")
                    : h("div", { class: "imr-choice" }, A.field("#BDBDBD", { onClick: () => A.flash("Color picker (not wired in the skeleton)") }), h("span", { class: "k-tag" }, "Your choice")),
                choice === "Nothing" ? null : h("div", { class: "k-secondary" }, "Painted by your choice, not by " + m.title + ". It covers the rows beneath on every " + (edge ? "edge" : "node") + " without a value."),
            ]);
        };
        drawNoVal("Nothing");

        wrap.append(
            A.section({ title: "Encoding", actions: A.iconButton("ellipsis", "Row options", { go: ["context-menus", "measure-row"] }) },
                h("div", { class: "imr-ctl" }, channelSeg),
                encBody,
            ),
            A.section("Scale",
                h("div", { class: "imr-ctl" }, seg(["Linear", "Log", "Rank", "Diverging"], "Linear", (s) => s === "Diverging" && A.flash("Diverging needs a midpoint: pick it in Domain (not wired in the skeleton)"), "Scale")),
                h("div", { class: "imr-ctl imr-open-note" }, h("span", null, "Which scale graphty-element picks first for a value shaped like this one ", openQ("The spec says the element supplies a default per value shape but does not say which default a skewed value gets"))),
            ),
            A.section({ title: "Domain", actions: A.button("Fit to data", { kind: "ghost", onClick: () => A.flash("Domain fitted to the data") }) },
                h("div", { class: "imr-ctl" }, h("div", { class: "imr-two" }, A.field(m.fmt(m.domain[0]), { onClick: () => A.flash("Lowest value (not wired in the skeleton)") }), h("span", { class: "k-secondary" }, "to"), A.field(m.fmt(m.domain[1]), { onClick: () => A.flash("Highest value (not wired in the skeleton)") }))),
                preview,
            ),
            A.section("Legend",
                ctl("Legend label", A.field(m.title, { onClick: () => A.flash("Rename the legend label (not wired in the skeleton)") })),
            ),
            A.section("No value",
                h("div", { class: "imr-ctl" }, seg(["Nothing", "A color"], "Nothing", drawNoVal, "What no value draws as"), noValBody),
            ),
        );
        return wrap;
    }

    // ---------- Data tab ----------
    function histogram(m, brush) {
        const box = h("div");
        const summary = h("div");
        let bars;
        if (m.bands) {
            // unequal bands: width is the score range, height is accounts per score point
            const dens = m.bands.map((b) => b.count / (b.to - b.from + 1));
            const top = Math.max(...dens);
            bars = h("div", { class: "imr-hist", role: "img", "aria-label": "Distribution of " + m.title }, m.bands.map((b, i) => h("i", { style: `flex:${b.to - b.from + 1} 1 0;height:${b.count ? Math.max(2, (dens[i] / top) * 100) : 0}%`, "data-zero": b.count ? null : "", title: `${b.from} to ${b.to}: ${b.count.toLocaleString("en-US")} accounts` })));
            box.append(bars, h("div", { class: "imr-axis imr-axis-abs" }, [0, 20, 70, 98].map((v) => h("span", { style: `left:${(v / 99) * 100}%` }, String(v)))),
                h("div", { class: "ab-cap k-secondary" }, "Five bands of unequal width; a bar's height is accounts per score point. No account scores 80 to 87. Drag across bars to select those accounts."));
        } else {
            const H = m.hist, top = Math.max(...H.bins);
            bars = h("div", { class: "imr-hist", role: "img", "aria-label": "Distribution of " + m.title }, H.bins.map((c, i) => h("i", { style: `height:${c ? Math.max(3, (c / top) * 100) : 0}%`, "data-zero": c ? null : "", title: `${(H.from + i * H.width).toFixed(3)} to ${(H.from + (i + 1) * H.width).toFixed(3)}: ${c} ${H.unit}` })));
            box.append(bars, h("div", { class: "imr-axis" }, h("span", null, "0"), h("span", null, (H.from + H.bins.length * H.width).toFixed(2))),
                h("div", { class: "ab-cap k-secondary" }, `${m.title} over ${H.bins.reduce((a, b) => a + b, 0)} ${H.unit}, bars of ${H.width}. Drag across bars to select those ${H.unit}.`));
        }
        const counts = m.bands ? m.bands.map((b) => b.count) : m.hist.bins;
        const unit = m.bands ? "accounts" : m.hist.unit;
        const lo = (i) => (m.bands ? String(m.bands[i].from) : (m.hist.from + i * m.hist.width).toFixed(3));
        const hi = (i) => (m.bands ? String(m.bands[i].to) : (m.hist.from + (i + 1) * m.hist.width).toFixed(3));
        const setRange = (a, b) => {
            const [s, e] = a <= b ? [a, b] : [b, a];
            [...bars.children].forEach((x, i) => x.toggleAttribute("data-on", i >= s && i <= e));
            const n = counts.slice(s, e + 1).reduce((p, q) => p + q, 0);
            const names = m.binNames ? Object.entries(m.binNames).filter(([k]) => +k >= s && +k <= e).flatMap(([, v]) => v) : [];
            summary.replaceChildren(
                h("div", { class: "imr-brushed" },
                    h("div", { class: "k-strong" }, `${n.toLocaleString("en-US")} ${n === 1 ? unit.replace(/s$/, "") : unit} selected`),
                    h("div", { class: "k-secondary" }, `${m.title} ${lo(s)} to ${hi(e)}`),
                    names.length && names.length === n ? h("div", { class: "imr-names" }, names.join(", ")) : null,
                    h("div", { class: "imr-acts" },
                        A.button("Show in table", { kind: "secondary", go: ["table-dock", "nodes"] }),
                        A.button("Create set", { kind: "secondary", onClick: () => A.flash("Set created from the selection (not wired in the skeleton)") }),
                        A.button("Clear", { kind: "ghost", onClick: () => { [...bars.children].forEach((x) => x.removeAttribute("data-on")); summary.replaceChildren(); } }),
                    ),
                ),
            );
        };
        let start = null;
        const idx = (e) => {
            const t = e.target.closest("i");
            return t ? [...bars.children].indexOf(t) : null;
        };
        bars.addEventListener("pointerdown", (e) => { const i = idx(e); if (i == null) return; start = i; bars.setPointerCapture(e.pointerId); setRange(i, i); });
        bars.addEventListener("pointermove", (e) => {
            if (start == null) return;
            const el = document.elementFromPoint(e.clientX, e.clientY);
            const i = el && el.parentNode === bars ? [...bars.children].indexOf(el) : null;
            if (i != null) setRange(start, i);
        });
        bars.addEventListener("pointerup", () => (start = null));
        if (brush) setRange(brush[0], brush[1]);
        box.append(summary);
        return box;
    }

    function dataTab(m, o) {
        const edge = m.over === "edge";
        const topRow = ([name, v], i) =>
            h("div", Object.assign({ class: "k-row" }, name === "Valjean" ? A.act({ go: ["inspector-node", "why-this-look"] }) : A.act({ onClick: () => A.flash("Select " + name + " (not wired in the skeleton)") })),
                h("span", { class: "imr-rank" }, String(i + 1)), h("span", { class: "k-grow k-ellipsis" }, name), h("span", { class: "k-secondary k-num" }, m.fmt(v)));
        return h("div", null,
            A.section("Distribution",
                histogram(m, o.brush),
                m.readings.map(([k, v]) => A.data(k, v)),
            ),
            A.section({ title: "Top 10", actions: A.iconButton("table", "Show all in table", { go: ["table-dock", edge ? "edges" : "nodes"] }) },
                h("div", { class: "imr-top" }, m.top.map(topRow)),
                h("div", { class: "ab-pad" }, A.button("Keep top 10 as set", { kind: "secondary", onClick: () => A.flash("Top 10 kept as a set (not wired in the skeleton)") })),
            ),
            A.section("Provenance",
                m.provenance.map(([k, v]) => A.data(k, v)),
                A.data("Writes the attribute", m.writes, { go: ["data-place", "attributes"] }),
                A.data("Place in paint order", "In the Graph tree", { go: ["graph-place", "at-rest"] }),
            ),
            m.run
                ? A.section("Settings",
                    m.settings.map(([k, v]) => A.data(k, v)),
                    h("div", { class: "ab-pad imr-acts" },
                        A.button("Rerun", { icon: "refresh-cw", onClick: () => A.flash("Rerun with these settings (not wired in the skeleton)") }),
                        A.button("Change settings...", { kind: "secondary", go: ["analyze-popover", "essentials"] }),
                    ),
                    A.data("Earlier results", "None yet", { go: ["inspector-run-row", "data"] }),
                )
                : A.section("Settings",
                    h("div", { class: "ab-pad k-secondary" }, "Nothing to rerun: this value came with the data. To rank accounts by the transfers themselves, Analyze."),
                    h("div", { class: "ab-pad" }, A.button("Analyze...", { kind: "secondary", icon: "flask-conical", go: ["analyze-popover", "open"] })),
                ),
            A.section({ title: "Notes", count: 0, actions: A.iconButton("plus", "Add note", { go: ["notes-place", "about-selection"] }) },
                h("div", { class: "ab-pad k-secondary" }, "No notes about " + m.title + " yet."),
            ),
        );
    }

    // ---------- the scope mark (after a filter step) ----------
    function scopeMark() {
        return h("div", { class: "imr-scope", role: "status" },
            h("div", { class: "imr-scope-line" }, icon("funnel", "sm"), "On 77 nodes; now 60"),
            h("div", { class: "k-secondary" }, "Filter step ", A.link("data-place", "filters", "Filter to degree >= 2"), " came after this run. The values are still correct for the graph they name; the 17 nodes the step removed are not drawn."),
            h("div", null, A.button("Rerun on current filter", { kind: "secondary", icon: "refresh-cw", onClick: () => A.flash("Rerun on the 60 nodes (not wired in the skeleton)") })),
        );
    }

    // ---------- the section ----------
    const STATES = {
        style: { m: "pagerank", tab: "Style" },
        data: { m: "pagerank", tab: "Data" },
        brushed: { m: "pagerank", tab: "Data", brush: [4, 15] },
        "scope-mark": { m: "pagerank", tab: "Style", scope: true },
        "risk-score": { m: "risk", tab: "Style" },
        "risk-score-data": { m: "risk", tab: "Data" },
        "edge-measure": { m: "edge", tab: "Style" },
    };

    registerSection({
        id: "inspector-measure-row",
        title: "Inspector: a measure row",
        region: "right",
        frame: (state) => (state === "risk-score" || state === "risk-score-data" ? { left: "data-place/attributes" } : state === "scope-mark" ? { left: "graph-place/scope-mark", chip: "Filtered: 60 of 77 nodes" } : { left: "graph-place/at-rest" }),
        closeTo: "graph-place",
        states: [
            { id: "style", label: "Style tab (PageRank ramp)" },
            { id: "data", label: "Data tab with histogram" },
            { id: "brushed", label: "Histogram brushed (nodes selected)" },
            { id: "scope-mark", label: "Scope mark after a filter step" },
            { id: "risk-score", label: "Attribute-painted (riskScore)" },
            { id: "risk-score-data", label: "riskScore, Data tab" },
            { id: "edge-measure", label: "Edge measure (edge color and width)" },
        ],
        render(el, state) {
            const st = STATES[state] || STATES.style;
            const m = MEASURES[st.m];
            const titleIcon = m.run ? (m.over === "edge" ? h("span", { class: "imr-edgemark" }, icon("chart-column"), icon("spline", "sm")) : icon("chart-column")) : icon("hash");
            const insp = A.inspector({
                title: m.title,
                meta: m.meta,
                kindKey: "measure-row",
                tab: st.tab,
                tabs: { Style: () => styleTab(m), Data: () => dataTab(m, st) },
            });
            insp.querySelector(".ab-insp-head").prepend(titleIcon);
            if (st.scope) insp.querySelector(".ab-insp-meta").after(scopeMark());
            el.append(insp);
        },
    });
})();
