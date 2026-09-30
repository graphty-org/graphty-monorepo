/* Inspector: a measure row (version 2). One frame, two tabs.
   Style: the shared Style tab (AB.styleTab) with the painting property bound to the result, and
   under the bound line an indented binding block: scale (graphty-element's nine), domain with
   Fit to data, clamp, range, palette (the element's sequential and diverging lists, with
   color-blind safety), reverse, midpoint, and what "no value" draws as (default: nothing). There
   is no Legend label field: the row's name is the legend title. Unbinding offers to keep the
   current value as a fixed one (the element's resolveToStatic).
   Data: Values (brushable histogram; brushing selects), Top 10, Made with (settings and
   provenance merged, and the attribute it writes), Notes. No verbs in the bodies: commands are in
   "..." (context-menus/measure-row); the state bar is the only button.

   Numbers. Les Miserables PageRank and edge betweenness are computed on the published graph the
   fixtures describe (77 nodes, 254 edges; unweighted; PageRank damping 0.85; edge betweenness
   normalized); "Filter to degree >= 2" leaves 60 nodes, as fixtures.json says. riskScore uses
   fixtures.json only (the transfers bands and the 14 flagged accounts scored 88 to 98).
   Scale and palette names are graphty-element's catalog names in American spelling. Plain ASCII. */
(function () {
    "use strict";
    const A = window.AB;

    if (!document.getElementById("imr-style")) {
        const s = document.createElement("style");
        s.id = "imr-style";
        s.textContent = `
.imr-paints { display: flex; align-items: center; gap: 6px; padding: 4px 16px 8px; color: var(--cm-text-secondary); }
.imr-bind { margin: 0 8px 6px 16px; padding: 2px 0 6px 8px; border-left: 1px solid var(--cm-border-translucent-strong); display: flex; flex-direction: column; gap: 2px; }
.imr-brow { display: grid; grid-template-columns: 60px minmax(0, 1fr); align-items: center; gap: 4px; min-height: 24px; }
.imr-brow > .k-legend { color: var(--cm-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.imr-two { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 2px; align-items: center; }
.imr-bind .k-field { min-width: 0; padding-inline: 6px; }
.imr-inline { display: flex; align-items: center; gap: 6px; min-width: 0; }
.imr-list { display: flex; flex-direction: column; padding: 2px 0 4px; }
.imr-list .k-row { gap: 8px; }
.imr-list-h { padding: 4px 8px 0; color: var(--cm-text-tertiary); font-size: 11px; }
.imr-desc { color: var(--cm-text-tertiary); font-size: 11px; }
.imr-note { color: var(--cm-text-secondary); font-size: 11px; line-height: 16px; padding: 2px 0; }
.imr-sw { display: inline-block; width: 40px; height: 12px; border-radius: 2px; flex: none; box-shadow: inset 0 0 0 1px var(--cm-border-translucent-strong); }
.imr-sw-wide { width: 100%; }
.imr-ticks { display: flex; justify-content: space-between; color: var(--cm-text-secondary); font-size: 11px; font-variant-numeric: tabular-nums; }
.imr-seg { height: auto; min-height: 24px; }
.imr-seg > * { cursor: pointer; line-height: 22px; }
.imr-hist { position: relative; margin: 4px 16px 0; height: 72px; display: flex; align-items: flex-end; gap: 1px; cursor: crosshair; user-select: none; touch-action: none; }
.imr-hist > i { flex: 1 1 0; background: var(--cm-border-translucent-strong); border-radius: 1px 1px 0 0; min-height: 1px; }
.imr-hist > i[data-zero] { background: none; border-bottom: 1px solid var(--cm-border-translucent-strong); }
.imr-hist > i[data-on] { background: var(--cm-bg-brand); }
.imr-axis { display: flex; justify-content: space-between; padding: 2px 16px 0; color: var(--cm-text-secondary); font-size: 11px; font-variant-numeric: tabular-nums; }
.imr-axis-abs { position: relative; height: 16px; margin: 0 16px; padding: 0; }
.imr-axis-abs > span { position: absolute; transform: translateX(-50%); }
.imr-axis-abs > span:first-child { transform: none; }
.imr-axis-abs > span:last-child { transform: translateX(-100%); }
.imr-brushed { display: flex; align-items: center; gap: 6px; margin: 4px 16px; min-height: 24px; }
.imr-names { color: var(--cm-text-secondary); padding: 0 16px 4px; }
.imr-top .k-row { cursor: pointer; }
.imr-rank { width: 16px; text-align: end; color: var(--cm-text-secondary); font-variant-numeric: tabular-nums; flex: none; }
.imr-open { display: inline-flex; margin-inline-start: 4px; padding: 0 6px; height: 18px; align-items: center; border-radius: 9px; font-size: 11px; font-weight: 550; color: var(--k-annot-ink, #a3175a); box-shadow: inset 0 0 0 1px var(--k-annot, #e0447c); white-space: nowrap; cursor: help; }
.imr-edited .k-value { color: var(--cm-text-brand); }
.imr-unbind { display: flex; flex-direction: column; gap: 8px; }
.imr-unbind .k-row { height: auto; min-height: 24px; align-items: flex-start; padding: 4px 8px; }
`;
        document.head.append(s);
    }

    // ---------- graphty-element's catalog (stand-ins: the app reads these from the element) ----------
    const SCALES = [
        ["linear", "Even Steps", "Equal differences, equal steps"],
        ["log", "By Order of Magnitude", "Zeros and negatives get no value"],
        ["neglog10", "By Significance", "For p-values: small values stand out"],
        ["sqrt", "By Area", "Size reads as area"],
        ["pow", "Curved", "Bends by an exponent"],
        ["bins", "Equal Ranges", "Cuts the domain into equal-width groups"],
        ["quantile", "Equal Counts", "Groups with the same number of elements"],
        ["ordinal", "One Color per Value", "Each distinct value its own color"],
        ["passthrough", "Use the Value As It Is", "The value is already a color or size"],
    ];
    const SAFE = "Safe for every kind of color blindness";
    const PALETTES = [
        { id: "ylorbr", name: "Orange to Brown", kind: "sequential", safe: true, c: "#ef7818,#d85a09,#b84203,#8e3104,#662506" },
        { id: "viridis", name: "Purple to Yellow", kind: "sequential", safe: true, c: "#440154,#3e4989,#26828e,#35b779,#b5de2b,#fde724" },
        { id: "plasma", name: "Blue to Yellow", kind: "sequential", safe: true, c: "#0d0887,#8b0aa5,#db5c68,#febd2a,#f0f921" },
        { id: "inferno", name: "Black to Yellow", kind: "sequential", safe: true, c: "#000004,#4a0c6b,#a52c60,#ed6925,#f7d13d" },
        { id: "blues", name: "Shades of Blue", kind: "sequential", safe: true, c: "#f7fbff,#c6dbef,#6baed6,#2171b5,#08306b" },
        { id: "greens", name: "Shades of Green", kind: "sequential", safe: false, c: "#f7fcf5,#c7e9c0,#74c476,#238b45,#00441b" },
        { id: "oranges", name: "Shades of Orange", kind: "sequential", safe: false, c: "#fff5eb,#fdd0a2,#fd8d3c,#d94801,#7f2704" },
        { id: "purple-green", name: "Purple to Green", kind: "diverging", safe: true, c: "#762a83,#c2a5cf,#f7f7f7,#a6dba0,#1b7837" },
        { id: "blue-orange", name: "Blue to Orange", kind: "diverging", safe: true, c: "#2166ac,#92c5de,#f7f7f7,#f4a582,#b2182b" },
        { id: "red-blue", name: "Red to Blue", kind: "diverging", safe: false, c: "#67001f,#d6604d,#f7f7f7,#92c5de,#2166ac" },
    ];
    const pal = (id) => PALETTES.find((p) => p.id === id);
    const grad = (p, rev) => `linear-gradient(90deg,${(rev ? p.c.split(",").reverse().join(",") : p.c)})`;
    const swatch = (p, rev, wide) => h("span", { class: "imr-sw" + (wide ? " imr-sw-wide" : ""), style: "background:" + grad(p, rev), "aria-hidden": "true" });

    // ---------- the measures ----------
    const MEASURES = {
        pagerank: {
            title: "PageRank", over: "node", unit: "nodes", total: 77, run: true,
            fmt: (v) => v.toFixed(4),
            provenance: ["on 77 nodes, Sep 28", "inspector-measure-row", "data"],
            bound: { "node.color": "PageRank" },
            domain: [0.0033, 0.0754], median: "0.0124",
            covers: ["Louvain, resolution 1.0", "inspector-run-row", "style", "color"],
            hist: { from: 0, width: 0.005, bins: [9, 24, 19, 16, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 1] },
            readings: [["Nodes with a value", "77 of 77"], ["Lowest", "0.0033"], ["Median", "0.0124"], ["Highest", "0.0754"]],
            top: [["Valjean", 0.0754], ["Myriel", 0.0428], ["Gavroche", 0.0358], ["Marius", 0.0309], ["Javert", 0.0303], ["Thenardier", 0.0279], ["Fantine", 0.027], ["Enjolras", 0.0219], ["Cosette", 0.0206], ["Mme.Thenardier", 0.0195]],
            binNames: { 4: ["Enjolras", "Cosette"], 5: ["Fantine", "Thenardier"], 6: ["Marius", "Javert"], 7: ["Gavroche"], 8: ["Myriel"], 15: ["Valjean"] },
            settings: [["Damping", "0.85"], ["Iterations", "Up to 100"], ["Weight", "None"]],
            provRows: [["Scope", "77 nodes, 254 edges"], ["Direction", "Undirected, as stored"], ["Data", "miserables.json"]],
            writes: "pagerank",
        },
        edge: {
            title: "Edge betweenness", over: "edge", unit: "edges", total: 254, run: true,
            fmt: (v) => v.toFixed(4),
            provenance: ["on 254 edges, Sep 28", "inspector-measure-row", "data"],
            bound: { "edge.color": "Edge betweenness", "edge.width": "Edge betweenness" },
            domain: [0.0003, 0.1832], median: "0.0058",
            hist: { from: 0, width: 0.01, bins: [170, 40, 33, 3, 4, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
            readings: [["Edges with a value", "254 of 254"], ["Lowest", "0.0003"], ["Median", "0.0058"], ["Highest", "0.1832"]],
            top: [["Myriel - Valjean", 0.1832], ["Valjean - Gavroche", 0.083], ["Valjean - Fantine", 0.0762], ["Mme.Burgon - Gavroche", 0.0513], ["Valjean - Mlle.Gillenormand", 0.045], ["Valjean - Marius", 0.0443], ["Tholomyes - Marius", 0.0443], ["Valjean - Bossuet", 0.0423], ["Valjean - Enjolras", 0.0393], ["Valjean - Fauchelevent", 0.0364]],
            binNames: { 5: ["Mme.Burgon - Gavroche"], 7: ["Valjean - Fantine"], 8: ["Valjean - Gavroche"], 18: ["Myriel - Valjean"] },
            settings: [["Weight", "None"], ["Normalized", "Yes, 0 to 1"], ["Sample", "Every node (exact)"]],
            provRows: [["Scope", "77 nodes, 254 edges"], ["Direction", "Undirected, as stored"], ["Data", "miserables.json"]],
            writes: "edge betweenness (on edges)",
        },
        // Degree: Size by on the overview's degree attribute, a row hidden from the list that still paints
        degree: {
            title: "Degree", over: "node", unit: "nodes", total: 77, run: false,
            fmt: (v) => String(Math.round(v)),
            provenance: ["from the graph overview", "inspector-nothing-selected", "data"],
            bound: { "node.size": "Degree" },
            domain: [1, 36], median: "6",
            hist: { from: 0, width: 3, bins: [27, 9, 16, 14, 4, 4, 1, 1, 0, 0, 0, 1] },
            readings: [["Nodes with a value", "77 of 77"], ["Lowest", "1"], ["Median", "6"], ["Highest", "36"]],
            top: [["Valjean", 36], ["Gavroche", 22], ["Marius", 19], ["Javert", 17], ["Thenardier", 16], ["Fantine", 15], ["Enjolras", 15], ["Courfeyrac", 13], ["Bossuet", 13], ["Bahorel", 12]],
            binNames: { 11: ["Valjean"], 7: ["Gavroche"], 6: ["Marius"] },
            provRows: [["Came from", "The graph overview (degree)"], ["Scope", "77 nodes, 254 edges"], ["Data", "miserables.json"]],
            writes: "degree",
        },
        risk: {
            title: "riskScore", over: "node", unit: "accounts", total: 3000, run: false,
            fmt: (v) => String(v),
            provenance: ["from accounts-2026-03.csv", "data-place", "attributes"],
            bound: { "node.color": "riskScore" },
            domain: [0, 98], median: null,
            bands: [{ from: 0, to: 19, count: 1929 }, { from: 20, to: 69, count: 928 }, { from: 70, to: 79, count: 129 }, { from: 80, to: 87, count: 0 }, { from: 88, to: 98, count: 14 }],
            readings: [["Accounts with a score", "3,000 of 3,000"], ["Range", "0 to 98"], ["Scored 20 or more", "1,071"], ["Scored 70 or more", "143"]],
            top: [["ACC-233575", 98], ["ACC-782213", 97], ["ACC-577269", 97], ["ACC-642959", 96], ["ACC-753261", 95], ["ACC-946224", 93], ["ACC-309606", 93], ["ACC-365386", 92], ["ACC-242954", 92], ["ACC-888258", 92]],
            provRows: [["Came from", "accounts-2026-03.csv"], ["Joined on", "account id"], ["Computed by", "The bank, not graphty"], ["Scale", "0 to 100"], ["Scope", "All 3,000 accounts"]],
            writes: "riskScore",
        },
    };

    // ---------- small builders ----------
    const openQ = (text) => h("span", { class: "imr-open", tabindex: "0", title: text, "aria-label": "Open question: " + text }, "Open question");
    const brow = (label, ...ctl) => h("div", { class: "imr-brow" }, h("span", { class: "k-legend" }, label), h("div", { class: "imr-inline" }, ctl));
    function sw(on, label, onFlip) {
        const s = h("span", { class: "k-switch", role: "switch", tabindex: "0", "aria-checked": String(!!on), "aria-label": label });
        const flip = (e) => { e.stopPropagation(); onFlip(!on); };
        s.addEventListener("click", flip);
        s.addEventListener("keydown", (e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), flip(e)));
        return s;
    }
    function seg(options, active, onPick, label) {
        const g = h("span", { class: "k-seg k-seg-fill imr-seg", role: "radiogroup", "aria-label": label });
        options.forEach((o) => {
            const b = h("span", { role: "radio", tabindex: "0", "aria-checked": String(o === active) }, o);
            const pick = (e) => { e.stopPropagation(); onPick(o); };
            b.addEventListener("click", pick);
            b.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick(e)));
            g.append(b);
        });
        return g;
    }
    const noWire = (what) => () => A.flash(what + " (not wired in the skeleton)");

    // ---------- the binding block (under a bound property line) ----------
    // b: { scale, palette, reverse, fit, clamp, noValue, list: null|"scale"|"palette" }
    function bindBlock(m, chanId, b, redraw) {
        const isColor = /\.color$/.test(chanId);
        const p = pal(b.palette);
        const sc = SCALES.find((s) => s[0] === b.scale);
        const set = (k, v) => { b[k] = v; redraw(); };
        const wrap = h("div", { class: "imr-bind", role: "group", "aria-label": "How " + m.title + " becomes " + (isColor ? "a color" : "a width") });

        // scale
        wrap.append(brow("Scale", A.field(sc[1], { caret: true, onClick: () => set("list", b.list === "scale" ? null : "scale") })));
        if (b.scale === "linear" && m.run) wrap.append(brow("", openQ("Which scale graphty-element picks first for a skewed value like PageRank; the catalog does not say")));
        if (b.list === "scale")
            wrap.append(h("div", { class: "imr-list", role: "listbox", "aria-label": "Scales" }, SCALES.map(([id, name, desc]) =>
                h("div", Object.assign({ class: "k-row", role: "option", "aria-selected": String(id === b.scale), style: "height:auto;min-height:24px" }, A.act({ onClick: () => { b.scale = id; set("list", null); } })),
                    h("span", { class: "k-grow" }, name, h("div", { class: "imr-desc" }, desc)), id === b.scale ? icon("check", "sm") : null))));
        if (b.scale === "pow") wrap.append(brow("Exponent", A.field("2", { onClick: noWire("Exponent") })));
        if (b.scale === "bins" || b.scale === "quantile") wrap.append(brow("Groups", A.field("5", { onClick: noWire("Number of groups") })));

        // domain, with Fit to data (the element's domain "auto") and clamp (percentiles; replaces a typed domain)
        const lo = m.fmt(m.domain[0]), hi = m.fmt(m.domain[1]);
        const dom = b.clamp
            ? h("span", { class: "k-secondary" }, "Set by the clamp below")
            : h("div", { class: "imr-two", style: "flex:1" },
                A.field(lo, { onClick: b.fit ? () => A.flash("Turn off Fit to data to type a domain") : noWire("Lowest value") }),
                h("span", { class: "k-secondary" }, "-"),
                A.field(hi, { onClick: b.fit ? () => A.flash("Turn off Fit to data to type a domain") : noWire("Highest value") }));
        wrap.append(brow("Domain", dom));
        wrap.append(brow("", sw(b.fit && !b.clamp, "Fit to data", (v) => { b.clamp = false; set("fit", v); }), h("span", null, "Fit to data"),
            null));
        const clampRow = brow("Clamp", sw(b.clamp, "Clamp to percentiles", (v) => set("clamp", v)),
            b.clamp ? h("div", { class: "imr-two", style: "flex:1" }, A.field("2nd", { onClick: noWire("Lower percentile") }), h("span", { class: "k-secondary" }, "-"), A.field("98th", { onClick: noWire("Upper percentile") })) : h("span", { class: "k-secondary" }, "Off"));
        clampRow.title = "Values past the percentiles take the end colors. A clamp and a typed domain cannot both be set.";
        wrap.append(clampRow);

        // range, palette, reverse, midpoint
        if (isColor) {
            wrap.append(brow("Range", h("div", { class: "imr-two", style: "flex:1" }, A.field("0%", { onClick: noWire("Start of the palette") }), h("span", { class: "k-secondary" }, "-"), A.field("100%", { onClick: noWire("End of the palette") }))));
            const pf = A.field(p.name, { caret: true, onClick: () => set("list", b.list === "palette" ? null : "palette") });
            pf.prepend(swatch(p, b.reverse));
            wrap.append(brow("Palette", pf));
            if (b.list === "palette") {
                const item = (q) => h("div", Object.assign({ class: "k-row", role: "option", "aria-selected": String(q.id === b.palette), title: q.safe ? SAFE : "Not marked safe for color blindness" }, A.act({ onClick: () => { b.palette = q.id; set("list", null); } })),
                    swatch(q), h("span", { class: "k-grow k-ellipsis" }, q.name), q.safe ? icon("eye", "sm") : null, q.id === b.palette ? icon("check", "sm") : null);
                wrap.append(h("div", { class: "imr-list", role: "listbox", "aria-label": "Palettes" },
                    h("div", { class: "imr-list-h" }, "Sequential"), PALETTES.filter((q) => q.kind === "sequential").map(item),
                    h("div", { class: "imr-list-h" }, "Diverging"), PALETTES.filter((q) => q.kind === "diverging").map(item),
                    h("div", { class: "imr-note" }, icon("eye", "sm"), " marks a palette safe for every kind of color blindness. The 8 categorical palettes are offered with One Color per Value."),
                    h("div", Object.assign({ class: "k-row" }, A.act({ onClick: noWire("New palette, saved with the style") })), icon("plus", "sm"), h("span", { class: "k-grow" }, "New palette..."))));
            }
        } else {
            wrap.append(brow("Range", h("div", { class: "imr-two", style: "flex:1" }, A.field("0.5 px", { onClick: noWire("Thinnest") }), h("span", { class: "k-secondary" }, "-"), A.field("6 px", { onClick: noWire("Thickest") }))));
        }
        wrap.append(brow("Reverse", sw(b.reverse, "Reverse", (v) => set("reverse", v)), null));
        if (isColor) {
            const div = p.kind === "diverging";
            wrap.append(brow("Midpoint", div
                ? A.field(m.median || "50", { onClick: noWire("Midpoint") })
                : h("span", { class: "k-tertiary" }, "Only with a diverging palette"),
                div && m.median ? h("span", { class: "imr-desc" }, "median") : null));
        }

        // no separate preview: the palette field's swatch is the ramp

        // what "no value" draws as: nothing by default; a color is the reader's choice
        const who = m.run ? m.title + " did not score" : "that have no " + m.title;
        const nv = brow("No value", seg(["Nothing", "A color"], b.noValue ? "A color" : "Nothing", (o) => set("noValue", o === "A color"), "What no value draws as"));
        nv.title = b.noValue ? "Your color, on every " + m.over + " " + who + "; it covers the rows beneath there. Today " + m.title + " has a value on all " + m.total.toLocaleString("en-US") + ", so nothing takes it."
            : (m.over === "edge" ? "Edges " : m.run ? "Nodes " : "Accounts ") + who + " keep the look of the rows beneath.";
        wrap.append(nv);
        if (b.noValue) {
            const f = A.field("#BDBDBD", { go: ["style-pickers", "color"] });
            f.prepend(A.chit("#BDBDBD"));
            wrap.append(brow("", f));
        }
        return wrap;
    }

    // ---------- Style tab ----------
    function styleTab(m, st) {
        const chans = Object.keys(m.bound);
        const kinds = [m.over];
        const set = {};
        chans.forEach((c) => (set[c] = m.bound[c]));
        const blocks = {};
        chans.forEach((c) => (blocks[c] = Object.assign({ scale: "linear", palette: "ylorbr", reverse: false, fit: true, clamp: false, noValue: false, list: null }, st.bind || {})));
        // Once bound, the block starts closed (the bound value opens it); the states about the block open it
        let expanded = st.expanded === undefined ? null : st.expanded;

        const outer = h("div");
        outer.append(A.paintsLine("every " + m.over + " with a value: ", A.link("table-dock", m.over === "edge" ? "edges" : m.risk ? "transfers" : "nodes", m.total.toLocaleString("en-US") + " " + m.unit)));
        const tab = A.styleTab({ kinds, set, bound: m.bound, kind: m.over });
        outer.append(tab);
        if (m.covers)
            outer.append(h("div", { class: "imr-paints" }, icon("layers", "sm"), h("span", null, "Covers ", A.link(m.covers[1], m.covers[2], m.covers[0]), " and 3 more rows for " + m.covers[3])));

        // Put the binding block under each bound line; the shared tab redraws itself (search, the
        // Nodes | Edges switch), so re-inject after any redraw.
        const inject = () => {
            tab.querySelectorAll(".ab-sline").forEach((li) => {
                const bf = li.querySelector(".ab-bound");
                if (!bf) return;
                const name = li.querySelector(".ab-sname").textContent;
                const c = chans.find((id) => A.CHANNELS[m.over].some((d) => d.id === id && d.name === name));
                if (!c || li.dataset.imr) return;
                li.dataset.imr = "1";
                // the bound value toggles its block open and closed
                bf.addEventListener("click", (e) => { e.stopImmediatePropagation(); e.preventDefault(); expanded = expanded === c ? null : c; draw(); }, true);
                bf.setAttribute("aria-expanded", String(expanded === c));
                bf.title = "Show how " + name.toLowerCase() + " is worked out from " + m.bound[c];
                // "-" on a bound line asks what to keep (unbind)
                const minus = li.querySelector('[aria-label^="Remove"]');
                if (minus) {
                    minus.setAttribute("aria-label", "Unbind " + name + " from " + m.title);
                    minus.title = "Unbind " + name + " from " + m.title;
                    minus.addEventListener("click", (e) => { e.stopImmediatePropagation(); e.preventDefault(); unbindPopover(m, name, minus); }, true);
                }
                const slot = h("div", { class: "imr-slot", "data-chan": c });
                li.after(slot);
                const draw = () => {
                    tab.querySelectorAll(".imr-slot").forEach((s) => {
                        const id = s.dataset.chan;
                        s.replaceChildren(expanded === id ? bindBlock(m, id, blocks[id], draw) : "");
                        const f = s.previousElementSibling && s.previousElementSibling.querySelector(".ab-bound");
                        if (f) f.setAttribute("aria-expanded", String(expanded === id));
                    });
                };
                draw();
            });
        };
        new MutationObserver(() => { if (!tab.querySelector(".imr-slot")) { tab.querySelectorAll(".ab-sline").forEach((l) => delete l.dataset.imr); inject(); } }).observe(tab, { childList: true, subtree: true });
        inject();
        if (st.unbind) setTimeout(() => { const mi = tab.querySelector('[aria-label^="Unbind"]'); if (mi && mi.isConnected) unbindPopover(m, "Color", mi); }, 150);
        return outer;
    }

    // Unbinding: keep the current value as a fixed one (resolveToStatic), or clear the property.
    // Drawn into the overlay layer by this section (the shared popover's close goes to closeTo,
    // which would leave the inspector), so it closes itself.
    function unbindPopover(m, name, anchor) {
        document.querySelectorAll(".imr-pop").forEach((x) => x.remove());
        const who = m.over === "edge" ? "Myriel - Valjean" : m.run ? "Valjean" : "ACC-233575";
        const choices = [
            ["keep", "Keep a fixed " + name.toLowerCase(), "The color it paints on " + who + " now, for every " + m.over + " this row paints"],
            ["clear", "Remove " + name.toLowerCase(), "The rows beneath show through"],
        ];
        const opts = h("div", { class: "imr-unbind", role: "radiogroup", "aria-label": "What to keep" }, choices.map(([id, label, desc], i) =>
            h("label", { class: "k-row" }, h("input", { type: "radio", name: "imr-unbind", value: id, checked: i === 0 ? "" : null }), h("span", { class: "k-grow" }, label, h("div", { class: "imr-desc" }, desc)))));
        const done = () => { pop.remove(); anchor.focus && anchor.focus(); };
        const pop = h("div", { class: "k-popover ab-pop imr-pop", role: "dialog", "aria-label": "What to keep of " + name, style: "width:280px;pointer-events:auto", on: { keydown: (e) => { if (e.key === "Escape") { e.stopPropagation(); done(); } } } },
            h("div", { class: "k-popover-head" }, h("span", { class: "k-grow" }, "Unbind " + name + " from " + m.title + "?"), A.iconButton("x", "Close", { onClick: done })),
            h("div", { class: "k-popover-body" }, opts),
            h("div", { class: "ab-pop-foot" },
                A.button("Unbind", { onClick: () => { const v = opts.querySelector("input:checked").value; done(); A.flash(v === "keep" ? name + " kept as a fixed value (not wired in the skeleton)" : name + " removed (not wired in the skeleton)"); } }),
                A.button("Cancel", { kind: "ghost", onClick: done })));
        // fixed to the page: the shell hides its overlay layer when no overlay section is routed
        const r = anchor.getBoundingClientRect();
        pop.style.position = "fixed";
        pop.style.zIndex = "60";
        pop.style.top = Math.min(r.bottom + 4, innerHeight - 260) + "px";
        pop.style.left = Math.max(8, r.right - 280) + "px";
        document.body.append(pop);
        addEventListener("hashchange", () => pop.remove(), { once: true });
        setTimeout(() => { const f = pop.querySelector("input:checked"); f && f.focus(); }, 0);
    }

    // ---------- Data tab ----------
    function histogram(m, brush) {
        const box = h("div");
        const summary = h("div");
        let bars;
        if (m.bands) {
            const dens = m.bands.map((b) => b.count / (b.to - b.from + 1));
            const top = Math.max(...dens);
            bars = h("div", { class: "imr-hist", role: "img", "aria-label": "Distribution of " + m.title }, m.bands.map((b, i) => h("i", { style: `flex:${b.to - b.from + 1} 1 0;height:${b.count ? Math.max(2, (dens[i] / top) * 100) : 0}%`, "data-zero": b.count ? null : "", title: `${b.from} to ${b.to}: ${b.count.toLocaleString("en-US")} accounts` })));
            box.append(bars, h("div", { class: "imr-axis imr-axis-abs" }, [0, 20, 70, 98].map((v) => h("span", { style: `left:${(v / 99) * 100}%` }, String(v)))),
                h("div", { class: "ab-cap k-secondary" }, "Five bands of unequal width; a bar's height is accounts per score point. No account scores 80 to 87. Drag across bars to select."));
        } else {
            const H = m.hist, top = Math.max(...H.bins);
            bars = h("div", { class: "imr-hist", role: "img", "aria-label": "Distribution of " + m.title }, H.bins.map((c, i) => h("i", { style: `height:${c ? Math.max(3, (c / top) * 100) : 0}%`, "data-zero": c ? null : "", title: `${(H.from + i * H.width).toFixed(3)} to ${(H.from + (i + 1) * H.width).toFixed(3)}: ${c} ${m.unit}` })));
            box.append(bars, h("div", { class: "imr-axis" }, h("span", null, "0"), h("span", null, (H.from + H.bins.length * H.width).toFixed(2))),
                h("div", { class: "ab-cap k-secondary" }, `Bars of ${H.width}. Drag across bars to select those ${m.unit}.`));
        }
        const counts = m.bands ? m.bands.map((b) => b.count) : m.hist.bins;
        const lo = (i) => (m.bands ? String(m.bands[i].from) : (m.hist.from + i * m.hist.width).toFixed(3));
        const hi = (i) => (m.bands ? String(m.bands[i].to) : (m.hist.from + (i + 1) * m.hist.width).toFixed(3));
        const clear = () => { [...bars.children].forEach((x) => x.removeAttribute("data-on")); summary.replaceChildren(); A.announce("Selection cleared"); };
        const setRange = (a, b) => {
            const [s, e] = a <= b ? [a, b] : [b, a];
            [...bars.children].forEach((x, i) => x.toggleAttribute("data-on", i >= s && i <= e));
            const n = counts.slice(s, e + 1).reduce((p, q) => p + q, 0);
            const names = m.binNames ? Object.entries(m.binNames).filter(([k]) => +k >= s && +k <= e).flatMap(([, v]) => v) : [];
            const unit = n === 1 ? m.unit.replace(/s$/, "") : m.unit;
            summary.replaceChildren(
                h("div", { class: "imr-brushed", role: "status" }, icon("scan", "sm"),
                    h("span", { class: "k-grow" }, A.link("table-dock", m.over === "edge" ? "edges" : m.bands ? "transfers" : "nodes", n.toLocaleString("en-US") + " " + unit), " selected, " + m.title + " " + lo(s) + " to " + hi(e)),
                    A.iconButton("x", "Clear the brush", { onClick: clear })),
                names.length && names.length === n ? h("div", { class: "imr-names" }, names.join(", ")) : null,
            );
        };
        let start = null;
        bars.addEventListener("pointerdown", (e) => { const t = e.target.closest("i"); if (!t) return; start = [...bars.children].indexOf(t); bars.setPointerCapture(e.pointerId); setRange(start, start); });
        bars.addEventListener("pointermove", (e) => {
            if (start == null) return;
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el && el.parentNode === bars) setRange(start, [...bars.children].indexOf(el));
        });
        bars.addEventListener("pointerup", () => (start = null));
        if (brush) setRange(brush[0], brush[1]);
        box.append(summary);
        return box;
    }

    function dataTab(m, st) {
        const topRow = ([name, v], i) =>
            h("div", Object.assign({ class: "k-row" }, name === "Valjean" ? A.act({ go: ["inspector-node", "why-this-look"] }) : A.act({ onClick: () => A.flash("Selects " + name + " (not wired in the skeleton)") })),
                h("span", { class: "imr-rank" }, String(i + 1)), h("span", { class: "k-grow k-ellipsis" }, name), h("span", { class: "k-secondary k-num" }, m.fmt(v)));
        const madeWith = [];
        if (m.run)
            m.settings.forEach(([k, v]) => {
                const edited = st.edited && k === "Damping";
                madeWith.push(h("div", { class: "k-data" + (edited ? " imr-edited" : "") }, h("span", { class: "k-name" }, k),
                    h("span", { class: "k-value" }, A.field(edited ? "0.90" : v, { go: k === "Damping" ? ["inspector-measure-row", "settings-changed"] : null, onClick: k === "Damping" ? null : noWire(k) }))));
            });
        m.provRows.forEach(([k, v]) => madeWith.push(A.data(k, v)));
        madeWith.push(A.data("Writes", m.writes, { go: ["data-place", "attributes"] }));
        if (m.run) madeWith.push(A.data("Engine", "CPU, double precision"));
        return h("div", null,
            A.section({ title: "Values", collapsible: true, key: "imr.values", summary: m.readings.map((r) => r[1]).join(", ") },
                histogram(m, st.brush),
                m.readings.map(([k, v]) => A.data(k, v)),
            ),
            A.section({ title: "Top 10", collapsible: true, key: "imr.top", summary: m.top.slice(0, 3).map((t) => t[0]).join(", ") + "..." },
                h("div", { class: "imr-top" }, m.top.map(topRow)),
                m.run && m.over === "node" ? h("div", { class: "ab-cap k-secondary" }, "Ties are kept whole. Keep top N as set and Select top N are in the ... menu.") : null,
            ),
            A.section({ title: "Made with", collapsible: true, key: "imr.made", summary: m.run ? m.settings.map((s) => s[1]).slice(0, 2).join(", ") : m.provRows[0][1] }, madeWith),
            A.notesSection(0),
        );
    }

    // ---------- the section ----------
    const STATES = {
        style: { m: "pagerank", tab: "Style" },
        open: { m: "pagerank", tab: "Style", expanded: "node.color" },
        scale: { m: "pagerank", tab: "Style", bind: { list: "scale" }, expanded: "node.color" },
        palette: { m: "pagerank", tab: "Style", bind: { list: "palette" }, expanded: "node.color" },
        diverging: { m: "pagerank", tab: "Style", bind: { palette: "red-blue" }, expanded: "node.color" },
        clamp: { m: "pagerank", tab: "Style", bind: { clamp: true, fit: false }, expanded: "node.color" },
        "no-value-color": { m: "pagerank", tab: "Style", bind: { noValue: true }, expanded: "node.color" },
        unbind: { m: "pagerank", tab: "Style", unbind: true, expanded: "node.color" },
        data: { m: "pagerank", tab: "Data" },
        brushed: { m: "pagerank", tab: "Data", brush: [4, 15] },
        "settings-changed": { m: "pagerank", tab: "Data", edited: true },
        "scope-mark": { m: "pagerank", tab: "Style", scope: true },
        degree: { m: "degree", tab: "Style" },
        "risk-score": { m: "risk", tab: "Style" },
        "risk-score-data": { m: "risk", tab: "Data" },
        "edge-measure": { m: "edge", tab: "Style" },
        "edge-measure-data": { m: "edge", tab: "Data" },
    };

    registerSection({
        id: "inspector-measure-row",
        title: "Inspector: a measure row",
        region: "right",
        rail: "graph",
        frame: (state) =>
            state === "risk-score" || state === "risk-score-data" ? { left: "data-place/attributes" }
                : state === "scope-mark" ? { left: "graph-place/scope-mark", chip: "Filtered: 60 of 77 nodes" }
                    : state === "degree" ? { left: "graph-place/show-hidden" }
                    : { left: "graph-place/at-rest" },
        closeTo: "graph-place",
        states: [
            { id: "style", label: "Style: color bound to PageRank (block closed)" },
            { id: "open", label: "Style: binding block open" },
            { id: "scale", label: "Style: scale list open" },
            { id: "palette", label: "Style: palette list open" },
            { id: "diverging", label: "Style: diverging palette, midpoint" },
            { id: "clamp", label: "Style: clamped to percentiles" },
            { id: "no-value-color", label: "Style: no value draws a color" },
            { id: "unbind", label: "Style: unbind, keep a fixed value" },
            { id: "data", label: "Data: values, top 10, made with" },
            { id: "brushed", label: "Data: histogram brushed" },
            { id: "settings-changed", label: "Data: settings changed (state bar)" },
            { id: "scope-mark", label: "Scope changed by a filter step" },
            { id: "degree", label: "Degree: a row hidden from the list" },
            { id: "risk-score", label: "Attribute-painted (riskScore)" },
            { id: "risk-score-data", label: "riskScore, Data tab" },
            { id: "edge-measure", label: "Edge measure: color and width" },
            { id: "edge-measure-data", label: "Edge measure, Data tab" },
        ],
        render(el, state) {
            const st = STATES[state] || STATES.style;
            const m = Object.assign({}, MEASURES[st.m], { risk: st.m === "risk" });
            const titleIcon = m.run ? "chart-column" : "hash";
            let stateBar = null;
            if (st.edited) stateBar = { text: "Changed", actions: [{ label: "Rerun", go: ["graph-place", "running"] }, { label: "Revert", go: ["inspector-measure-row", "data"] }] };
            if (st.scope) stateBar = { text: "On 77; now 60", actions: [{ label: "Rerun on 60", onClick: noWire("Rerun on the 60 nodes the filter step keeps") }, { label: "Filter step", go: ["data-place", "filters"] }] };
            const insp = A.inspector({
                icon: titleIcon,
                title: m.title,
                kind: "Measure",
                provenance: m.provenance,
                menu: ["context-menus", "measure-row"],
                onRename: (n) => A.flash("Renamed to " + n + "; the legend title follows"),
                stateBar,
                kindKey: "measure-row",
                tab: st.tab,
                tabs: { Style: () => styleTab(m, st), Data: () => dataTab(m, st) },
            });
            const sb = insp.querySelector(".ab-statebar .k-grow");
            if (sb) sb.title = st.edited ? "Settings changed since the run" : "Ran on 77 nodes; a filter step since then leaves 60";
            el.append(insp);
        },
    });
})();
