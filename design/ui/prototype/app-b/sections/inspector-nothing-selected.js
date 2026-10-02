/* Inspector with nothing selected: the graph itself (structure-b-refined.md version 3, section 5.3).
   Style tab: Canvas (graphty-element configuration, not a layer) and Layout (Method and Seed lines;
   Method's value opens one popover with the method list, its engine, its options and pacing). A
   layout change acts at once and the notice offers Undo (`session.layout.set` is one undoable step).
   Data tab, in the shared vocabulary: Summary and Notes. Summary names the weight chosen at load and
   its meaning as one read-only line linking to the Data page, where it is changed (version 4: the
   weight is a field set when the data is loaded). The header's provenance opens that graph's file
   on the Data page. Notes are graphty-element API: the count is the fixture's (one note about the
   Les Miserables graph, none about the transfers). Readings not computed are one line whose
   link opens the graph's "..." (context-menus/graph) at Compute the overview. A run's readings live
   on its row only. The filtered state bar is the only filtered mark.
   Numbers: kit/fixtures.json (datasets.lesmis, .transactions). The four overview readings (average
   clustering 0.573, transitivity 0.499, diameter 5, degree assortativity -0.165) are not in the
   fixtures; they were computed with networkx 3.1 on les_miserables_graph(), the published graph the
   fixtures cite. Methods, size ratings, engines, engine options and the six pacing fields are
   graphty-element's (catalog/layouts.ts, config/GraphBehavior.ts). Plain ASCII.
   Version 5 (state-matrix.md): `empty-graph` (no data: the one empty line, its verb Add data...),
   `wide` (the hosts, weight bytes_total_24h; also every wide, nested and plain JSON frame's right
   region, drawn for AB.route.frame.dataset) and `nested` (the research network in its own frame).
   `components-selected` is the Connected components link clicked: the readings kept, and the table
   (drawn here in the dock region) marks the selected rows. `print-diverging` is the Print check on a
   diverging color: every value below the midpoint against every value above it.
   Styles are injected once from this file (the shell's CSS is not ours to edit). */
(function () {
    "use strict";
    const CSS = `
.ins-root .k-data > .k-name { flex: none; white-space: nowrap; }
.ins-root .k-data > .k-value { flex: 1 1 auto; min-width: 0; text-align: right; }
.ins-chk { align-items: center; gap: 8px; }
.ins-chk > .ins-chk-l { flex: 1 1 auto; min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 2px 6px; }
.ins-chk > .k-check { margin: -6px; }
.ins-pop .k-popover-body { padding: 8px 16px 12px; }
.ins-h { padding: 8px 0 4px; color: var(--cm-text-secondary); font-size: 11px; }
.ins-h:first-child { padding-top: 0; }
.ins-m { display: flex; align-items: center; gap: 6px; height: 24px; padding: 0 6px; margin: 0 -6px; border-radius: 5px; cursor: pointer; }
.ins-m:hover, .ins-m:focus-visible { background: var(--cm-bg-hover); }
.ins-m[aria-checked="true"] { background: var(--cm-bg-selected); }
.ins-m .ins-ck { width: 12px; flex: none; }
.ins-m .ins-rec { font-size: 10px; color: var(--cm-text-secondary); padding: 0 4px; border-radius: 4px; box-shadow: inset 0 0 0 1px var(--cm-border); }
.ins-m .k-i { color: var(--cm-icon-secondary); }
.ins-note { color: var(--cm-text-secondary); font-size: 11px; line-height: 1.4; margin: -4px 0 8px; }
.ins-pop .ab-frow { padding: 0; }
.ins-reading { padding: 4px 16px 8px; color: var(--cm-text-secondary); }
.ins-root .k-data > .k-name[tabindex] { cursor: help; }
.ins-ccdf { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px 2px 16px; }
.ins-ccdf svg { flex: none; overflow: visible; }
.ins-ccdf .ins-line { fill: none; stroke: var(--cm-text); stroke-width: 1.5; }
.ins-ccdf .ins-dot { fill: var(--cm-text); }
.ins-ccdf .ins-axis { fill: none; stroke: var(--cm-border); stroke-width: 1; }
.ins-ccdf text { fill: var(--cm-text-secondary); font-size: 10px; }
.ins-zero { flex: none; text-align: center; color: var(--cm-text-secondary); font-size: 11px; line-height: 1.3; }
.ins-zero b { display: block; color: var(--cm-text); font-size: 13px; font-weight: 500; }
.ins-print { padding: 0 8px 8px 16px; color: var(--cm-text-secondary); font-size: 11px; line-height: 1.45; }
.ins-print p { margin: 0 0 4px; }
.ins-print .ins-hit { color: var(--cm-text); }
.ins-steps { display: flex; flex-wrap: wrap; gap: 2px 10px; margin: 2px 0 4px; }
.ins-steps span { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.ins-steps .ins-side { width: 64px; }
.ins-steps i { width: 10px; height: 10px; border-radius: 2px; box-shadow: inset 0 0 0 1px var(--cm-border); }
.ins-pop .ins-cols { display: grid; grid-template-columns: 316px 220px; gap: 0 20px; align-items: start; }
.ins-m .ins-sz, .ins-mh .ins-sz { width: 44px; flex: none; text-align: right; color: var(--cm-text-secondary); }
.ins-m .ins-wt, .ins-mh .ins-wt { width: 60px; white-space: nowrap; flex: none; text-align: right; color: var(--cm-text-secondary); }
.ins-m .ins-cost { width: 12px; flex: none; }
.ins-mh { display: flex; align-items: center; gap: 6px; height: 18px; font-size: 11px; color: var(--cm-text-secondary); }
.ins-mh .ins-ck, .ins-mh .ins-cost { width: 12px; flex: none; }
`;
    if (!document.getElementById("ins-css")) document.head.append(h("style", { id: "ins-css" }, CSS));

    const SELF = "inspector-nothing-selected";
    const L = () => AB.fx.datasets.lesmis;
    const T = () => AB.fx.datasets.transactions;
    const n = (x) => Number(x).toLocaleString("en-US");
    const isTransfers = (s) => s === "transfers" || s === "transfers-methods" || s === "print-diverging";

    // ---------- shared bits ----------
    // A boolean line: the name left, the checkbox right-aligned in the one control column
    function check(name, on, why, needs, onChange) {
        const box = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(on), "aria-label": name });
        const flip = () => { const v = box.getAttribute("aria-checked") !== "true"; box.setAttribute("aria-checked", String(v)); AB.announce(name + (v ? " on" : " off")); onChange && onChange(v); };
        box.addEventListener("click", flip);
        box.addEventListener("keydown", (e) => e.key === " " && (e.preventDefault(), flip()));
        const label = h("span", { class: "k-name" }, name);
        if (why) AB.tip(label, why, { label: false });
        return h("div", { class: "k-data ins-chk" }, h("span", { class: "ins-chk-l" }, label, needs ? AB.needsElement(needs) : null), box);
    }
    // A number or short text typed in place
    function input(value, name, onCommit) {
        const inp = h("input", { class: "ab-sin k-num", type: "text", inputmode: "decimal", value, "aria-label": name, spellcheck: "false" });
        let last = value;
        const commit = () => { if (inp.value.trim() === last) return; const was = last; last = inp.value.trim(); onCommit && onCommit(last, was, inp); };
        inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") { commit(); inp.blur(); } else if (e.key === "Escape") { inp.value = last; inp.blur(); } });
        inp.addEventListener("change", commit);
        return inp;
    }
    // Every layout change lays out again at once; the notice offers Undo
    const relaid = (what, undo) => AB.notice("Laid out again: " + what, { label: "Undo", onClick: () => { undo && undo(); AB.announce("Layout change undone"); } });
    // ---------- the degree distribution: a log-log CCDF, zero-degree nodes counted beside it ----------
    // `points`: [[k, share of nodes with degree k or more]], k >= 1, share falling from 1
    const ccdfOfDegrees = (degs) => { const d = degs.filter((x) => x > 0); return [...new Set(d)].sort((a, b) => a - b).map((k) => [k, d.filter((x) => x >= k).length / d.length]); };
    // ponytail: the transfers fixture keeps only log-spaced bar heights, so the curve steps at the bar edges; read the element's degree counts when it reports them
    const ccdfOfLogBars = (b, max, nodes) => { const t = b.reduce((a, x) => a + x, 0); return b.map((_, i) => [Math.round(Math.pow(max, i / b.length)), b.slice(i).reduce((a, x) => a + x, 0) / t]).filter(([, s], i, a) => s > 0 && (!i || a[i - 1][0] !== a[i][0])).concat([[max, 1 / nodes]]); };
    function ccdf(points, zero, what) {
        const W = 150, H = 76, L0 = 34, B = 14, kMax = points[points.length - 1][0], yMin = Math.min(...points.map((p) => p[1]));
        const x = (k) => L0 + (kMax > 1 ? Math.log(k) / Math.log(kMax) : 0) * (W - L0 - 4);
        const y = (s) => 2 + (yMin < 1 ? Math.log(s) / Math.log(yMin) : 0) * (H - B - 4);
        const d = points.map(([k, s], i) => (i ? "H" + x(k).toFixed(1) + "V" + y(s).toFixed(1) : "M" + x(k).toFixed(1) + "," + y(s).toFixed(1))).join("");
        const pct = (s) => AB.num(s * 100) + "%";
        const ns = "http://www.w3.org/2000/svg", el = (tag, a, txt) => { const e = document.createElementNS(ns, tag); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); if (txt != null) e.textContent = txt; return e; };
        const svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img", "aria-label": what + ", log-log: " + pct(1) + " of nodes have degree 1 or more, " + pct(yMin) + " have degree " + kMax });
        svg.append(el("path", { class: "ins-axis", d: "M" + L0 + ",2V" + (H - B) + "H" + (W - 4) }), el("path", { class: "ins-line", d }),
            el("text", { x: L0 - 3, y: 9, "text-anchor": "end" }, "100%"), el("text", { x: L0 - 3, y: H - B, "text-anchor": "end" }, pct(yMin)),
            el("text", { x: L0, y: H - 2 }, "1"), el("text", { x: W - 4, y: H - 2, "text-anchor": "end" }, AB.num(kMax)),
            el("text", { x: (L0 + W) / 2, y: H - 2, "text-anchor": "middle" }, "degree"));
        const zeroEl = h("div", { class: "ins-zero" }, h("b", null, AB.num(zero)), "degree 0");
        AB.tip(zeroEl, AB.count(zero, "node") + " with no edges. A log axis cannot show degree 0, so they are counted here", { label: false });
        return [h("div", { class: "ins-ccdf" }, svg, zeroEl),
            h("div", { class: "ab-cap k-secondary" }, what + ", log-log: the share of nodes with degree k or more, k from 1 to " + AB.num(kMax) + ".")];
    }

    // ---------- Print-safe colors: the Print look and its grayscale check ----------
    // Lightness (CIE L*, 0 black to 100 white) of a color printed in gray
    const grayOf = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
        const Y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; };
    const CLOSE = 5; // L* apart below which two grays read as one on paper
    const and = (xs) => (xs.length < 3 ? xs.join(" and ") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);
    const gray = (v) => { const Y = v > 8 ? Math.pow((v + 16) / 116, 3) : v / 903.3; const s = Y <= 0.0031308 ? 12.92 * Y : 1.055 * Math.pow(Y, 1 / 2.4) - 0.055; const x = Math.round(s * 255).toString(16).padStart(2, "0"); return "#" + x + x + x; };
    const PRINT_LOOK = "Print: darker lines, larger labels. Does not separate close colors. Keeps colors that color-blind readers tell apart. Applies to this file only.";
    // The skeleton's one diverging color: riskScore on the transfers, Blue to orange centered on 50
    // (style-pickers' binding-diverging state; these are that palette's nine steps, the fifth the midpoint)
    const DIVERGING = { field: "riskScore", mid: "50", steps: ["#2166ac", "#4393c3", "#92c5de", "#d1e5f0", "#f7f7f7", "#fddbc7", "#f4a582", "#d6604d", "#b2182b"] };
    // A diverging color in gray: every value below the midpoint against every value above it, not only the two ends
    function midpointCheck(dv) {
        const m = (dv.steps.length - 1) / 2, g = dv.steps.map(grayOf), below = g.slice(0, m), above = g.slice(m + 1);
        const pairs = below.flatMap((b) => above.map((a) => Math.abs(a - b))), alike = pairs.filter((d) => d < CLOSE).length, least = Math.min(...pairs);
        return [
            h("p", { class: alike ? "ins-hit" : null }, alike
                ? "Values below and above the midpoint (" + dv.mid + ") do not stay apart in gray: " + AB.count(alike, "pair", { of: pairs.length }) + " print as one gray, so on gray paper the sign rests on hue alone."
                : "Values below and above the midpoint (" + dv.mid + ") stay apart in gray: all " + AB.count(pairs.length, "pair") + " differ by at least " + Math.round(least) + " in lightness."),
            h("p", null, "Color: " + dv.field + " in gray, lightness 0 (black) to 100 (white), from the midpoint out:"),
            [["Below " + dv.mid, below.slice().reverse()], ["Above " + dv.mid, above]].map(([word, vs]) =>
                h("div", { class: "ins-steps" }, h("span", { class: "ins-side" }, word), vs.map((v) => h("span", null, h("i", { style: "background:" + gray(v) }), String(Math.round(v))))))];
    }
    function printCheck(state) {
        if (state === "print-diverging") return h("div", { class: "ins-print", role: "status" }, h("p", { class: "ins-hit" }, PRINT_LOOK), midpointCheck(DIVERGING));
        const lg = L().frame.legend;
        const cats = lg.rows.map((r) => ["Group " + r.label, r.color]).concat(lg.other ? [["Other groups", lg.other.color]] : [])
            .map(([name, hex]) => ({ name, hex, g: grayOf(hex) })).sort((a, b) => a.g - b.g);
        // runs of neighbors in gray closer than CLOSE: each run prints as one gray
        const runs = [];
        cats.forEach((c, i) => { if (i && c.g - cats[i - 1].g < CLOSE) { const r = runs[runs.length - 1]; if (r && r[r.length - 1] === cats[i - 1]) r.push(c); else runs.push([cats[i - 1], c]); } });
        const lost = runs.reduce((a, r) => a + r.length, 0);
        const said = runs.map((r, i) => (i ? "so do " : "") + and(r.map((c) => c.name)) + (i ? "" : (r.length > 2 ? " all" : "") + " look the same in gray")).join("; ");
        return h("div", { class: "ins-print", role: "status" },
            h("p", { class: "ins-hit" }, PRINT_LOOK),
            h("p", null, lg.title + " in gray: ", runs.length ? h("span", { class: "ins-hit" }, AB.count(lost, "color", { of: cats.length }) + " cannot be told apart. " + said[0].toUpperCase() + said.slice(1) + ".") : "every color stays apart."),
            h("p", null, "Gray steps, lightness 0 (black) to 100 (white):"),
            h("div", { class: "ins-steps" }, cats.map((c) => h("span", null, h("i", { style: "background:" + gray(c.g) }), c.name + ": " + Math.round(c.g)))),
            h("p", null, "No color here runs either side of a midpoint, so there is no diverging color to check."));
    }

    // ---------- Style > Canvas ----------
    function canvasSection(state) {
        const bg = AB.field("Theme default", { go: [SELF, "background"] });
        bg.id = "ins-bg";
        const printOn = state === "print" || state === "print-diverging", report = printCheck(state);
        report.hidden = !printOn;
        return AB.section({ title: "Canvas", editable: true },
            AB.fieldRow("Background", bg),
            check("Print-safe colors", printOn, "One Print look for gray paper and color-blind readers: darker lines, larger labels, and a grayscale check that names the colors that print alike. On a diverging color it checks every pair of values across the midpoint, and the two sides differ in hue as well as lightness, so a sign never rests on lightness alone.", "graphty-element ships no Looks and no grayscale check yet (element issue #331)", (v) => { report.hidden = !v; }),
            report,
            check("Hide overlapping labels", false, "Labels that would overlap another are left out until you zoom in"),
            check("Show filtered-out nodes faintly", false, "Off: a filter step removes nodes from the drawing. On: they stay, faint, and take no part in computing or layout."),
            check("Reframe when data changes", true, "Off keeps the camera where it is when the data reloads, so a composed figure stays composed."));
    }

    // ---------- Style > Layout ----------
    // graphty-element's catalog.layouts(), in its order. rating: sizeRating; needs: structuralInputs
    // engine: the method's default implementation; opts: its engine's options and defaults (layout/*LayoutEngine.ts).
    // Only Spread Out has more than one engine; only two of its engines honor edge weights (honoursWeights)
    const SC = (v) => ["Scaling factor", v], SCALE = ["Scale", "1"], DIM = ["Dimensions", "2"], ALIGN = ["Alignment", "Vertical"];
    const METHODS = [
        { id: "force", name: "Spread Out", rating: "any", rec: true },
        { id: "force-2d", name: "Spread Out, Flat", rating: 2000, flat: true, engine: "ARF", opts: [SC("100"), ["Scaling", "1"], ["Attraction ratio", "1.1"], ["Max iterations", "1000"]] },
        { id: "circular", name: "Ring", rating: "any", engine: "Circular", opts: [SC("100"), SCALE, DIM] },
        { id: "radial", name: "Rings from a Node", rating: "any", flat: true, needs: "a center node", engine: "Radial", opts: [SC("100"), ["Root node", "None"], SCALE] },
        { id: "grid", name: "Grid", rating: "any", flat: true, engine: "Grid", opts: [SC("100"), ["Columns", "Automatic"], SCALE] },
        { id: "shell", name: "Concentric Rings", rating: "any", flat: true, needs: "a grouping", engine: "Shell", opts: [SC("100"), SCALE, DIM] },
        { id: "spiral", name: "Spiral", rating: "any", flat: true, engine: "Spiral", opts: [SC("80"), SCALE, DIM, ["Resolution", "0.35"], ["Equidistant", "Off"]] },
        { id: "spectral", name: "Natural Grouping", rating: 2000, flat: true, engine: "Spectral", opts: [SC("100"), SCALE, DIM] },
        { id: "planar", name: "No Crossings", rating: 2000, flat: true, engine: "Planar", opts: [SC("70"), SCALE, DIM] },
        { id: "random", name: "Scattered", rating: "any", engine: "Random", opts: [SC("100"), DIM] },
        { id: "hierarchical", name: "Tree", rating: "any", flat: true, needs: "a root node", engine: "BFS Tree", opts: [SC("20"), ["Start node", "None"], ALIGN, SCALE] },
        { id: "bipartite", name: "Two Columns", rating: "any", flat: true, needs: "a grouping", engine: "Bipartite", opts: [SC("40"), ALIGN, SCALE, ["Aspect ratio", "4:3"]] },
        { id: "layers", name: "Columns by Group", rating: "any", flat: true, needs: "a grouping", engine: "Multipartite", opts: [SC("40"), ALIGN, SCALE] },
        { id: "fixed", name: "Keep Positions", rating: "any", engine: "Fixed", opts: [["Dimensions", "3"]] },
    ];
    // The nodes pinned in the `pinned` state (the several-elements inspector's two picks)
    const PINNED = ["Valjean", "Javert"];
    // Spread Out's engines (catalog/layouts.ts: ngraph default, then d3, forceAtlas2, spring, kamadaKawai, springElectrical)
    const ENGINES = [["NGraph Force", false], ["D3 Force", false], ["ForceAtlas2", true], ["Spring", false], ["Kamada-Kawai", true], ["Spring Electrical", false]];
    const OPTIONS = [["Spring length", "30"], ["Gravity", "-1.2"], ["Spring coefficient", "0.0008"], ["Theta", "0.8"], ["Drag coefficient", "0.02"], ["Time step", "20"]];
    const PACING = [["Pre-steps", "0"], ["Steps per frame", "1"], ["Stop threshold", "0"], ["Refit interval", "1"], ["Iterations per step", "Engine default", "GPU layouts only"], ["Batches in flight", "2", "GPU layouts only"]];
    let method = "Spread Out", engine = "NGraph Force", seed = "7";
    // Whether the Les Miserables readings were computed when the reader last saw them
    let lastRead = "computed";

    function layoutSection(popState, state) {
        const m = AB.field(method, { go: [SELF, popState] });
        m.id = "ins-method";
        const s = input(seed, "Seed", (v, was) => { seed = v; relaid("seed " + v, () => { seed = was; s.value = was; }); });
        // Pinned nodes: only while some are pinned; the count is a link that selects them
        let pinned = null;
        if (state === "pinned") {
            const a = AB.link("inspector-several-elements", "two-nodes", AB.count(PINNED.length, "node"), { class: "ab-link" });
            AB.tip(a, and(PINNED) + " stay put when the layout runs. Click to select them", { label: false });
            pinned = AB.fieldRow("Pinned nodes", a);
        }
        return AB.section({ title: "Layout", editable: true }, AB.fieldRow("Method", m), AB.fieldRow("Seed", s), pinned);
    }

    function layoutPopover(nodes) {
        const methodField = () => document.querySelector("#ins-method .k-grow");
        const list = h("div", { role: "radiogroup", "aria-label": "Method" });
        const honors = (e) => ENGINES.find((x) => x[0] === e)[1];
        const paintList = () => list.replaceChildren(...METHODS.map((x) => {
            const over = x.rating !== "any" && nodes > x.rating;
            const wt = x.engine ? "No" : "By engine";
            const why = [x.rating === "any" ? "Any size" : "Rated for up to " + n(x.rating) + " nodes" + (over ? "; this graph has " + n(nodes) + ". The canvas stops responding while it computes" : ""),
                x.engine ? "ignores edge weights" : "honors edge weights with ForceAtlas2 or Kamada-Kawai", x.flat ? "flat" : null, x.needs ? "needs " + x.needs : null].filter(Boolean).join(", ");
            const on = x.name === method;
            const r = h("div", { class: "ins-m", role: "radio", tabindex: on ? "0" : "-1", "aria-checked": String(on) },
                h("span", { class: "ins-ck" }, on ? icon("check", "sm") : null),
                h("span", { class: "k-grow k-ellipsis" }, x.name),
                x.rec ? h("span", { class: "ins-rec" }, "Recommended") : null,
                h("span", { class: "ins-sz k-num" }, x.rating === "any" ? "Any" : n(x.rating)),
                h("span", { class: "ins-wt" }, wt),
                h("span", { class: "ins-cost" }, over ? AB.tip(h("span", { role: "img" }, icon("clock", "sm")), "Cost", { second: "Rated for up to " + n(x.rating) + " nodes; the canvas stops responding while it computes" }) : null));
            AB.tip(r, why, { label: false });
            const pick = () => {
                if (x.name === method) return;
                const was = method;
                method = x.name;
                if (methodField()) methodField().textContent = method;
                paintList(); paintRight();
                relaid(method, () => { method = was; if (methodField()) methodField().textContent = was; paintList(); paintRight(); });
            };
            r.addEventListener("click", pick);
            r.addEventListener("keydown", (e) => {
                if (e.key === " " || e.key === "Enter") { e.preventDefault(); pick(); }
                else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const sib = e.key === "ArrowDown" ? r.nextElementSibling : r.previousElementSibling; if (sib) sib.focus(); }
            });
            return r;
        }));
        const num = ([k, v, why]) => {
            const f = input(v, k, (val, was, inp) => relaid(k.toLowerCase() + " " + val, () => { inp.value = was; }));
            const row = AB.fieldRow(k, f, { popover: true });
            if (why) AB.tip(row.firstChild, k, { second: why, label: false });
            return row;
        };
        // The right column follows the method: its engine (a menu only where there are several), its options, pacing
        const right = h("div");
        function paintRight() {
            const m = METHODS.find((x) => x.name === method);
            let eng;
            if (m.engine) eng = AB.field(m.engine);
            else {
                eng = AB.field(engine, { caret: true });
                eng.setAttribute("role", "button");
                eng.tabIndex = 0;
                const openEng = () => AB.openMenu(eng, ENGINES.map(([e]) => ({ label: e, check: e === engine, onClick: () => { const was = engine; engine = e; paintRight(); relaid(e, () => { engine = was; paintRight(); }); } })));
                eng.addEventListener("click", openEng);
                eng.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openEng()));
            }
            eng.id = "ins-engine";
            const note = (m.engine ? "The only engine for " + m.name + ". " : "") + (!m.engine && honors(engine) ? "Honors edge weights." : "Ignores edge weights.");
            right.replaceChildren(
                AB.fieldRow("Engine", eng, { popover: true }), h("div", { class: "ins-note" }, note),
                h("div", { class: "ins-h" }, "Options"), ...(m.opts || OPTIONS).map(num),
                h("div", { class: "ins-h" }, "Pacing"), ...PACING.map(num));
        }
        paintList();
        paintRight();
        return AB.popover({
            anchor: "#ins-method", width: 580, title: "Layout",
            body: h("div", { class: "ins-cols" },
                h("div", null,
                    h("div", { class: "ins-mh", "aria-hidden": "true" }, h("span", { class: "ins-ck" }), h("span", { class: "k-grow" }, "Method"), h("span", { class: "ins-sz" }, "Size"), h("span", { class: "ins-wt" }, "Weights"), h("span", { class: "ins-cost" })),
                    list),
                right),
        });
    }

    function backgroundPopover() {
        const detail = h("div");
        const paint = (mode) => detail.replaceChildren(mode === "color"
            ? AB.fieldRow("Color", AB.field("Theme default", { onClick: () => AB.flash("Color picker (not wired in the skeleton)") }), { popover: true })
            : AB.fieldRow("Image", AB.field("None chosen", { caret: true, onClick: () => AB.flash("Choose a 360-degree image (not wired in the skeleton)") }), { popover: true }));
        paint("color");
        return AB.popover({
            anchor: "#ins-bg", width: 260, title: "Background",
            body: h("div", null, AB.fieldRow("Fill", AB.seg([["color", "Color"], ["image", "360 image"]], "color", paint, { label: "Background fill" }), { popover: true }), detail),
        });
    }

    // ---------- Data > Summary ----------
    // The four overview readings on the whole graph, and on the 60 nodes "Filter to degree >= 2" leaves
    // (networkx 3.1 on that induced subgraph of les_miserables_graph(), as for the whole graph)
    const READINGS = [["Average clustering", "0.573"], ["Transitivity", "0.499"], ["Diameter", "5"], ["Degree assortativity", "-0.165"]];
    const READINGS_FILTERED = [["Average clustering", "0.764"], ["Transitivity", "0.546"], ["Diameter", "4"], ["Degree assortativity", "-0.126"]];
    // The degrees of those 60 nodes within the filtered graph (same source), for its degree distribution
    const FILTERED_DEGREES = [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 9, 9, 9, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 12, 12, 13, 13, 15, 15, 15, 17, 19, 22, 31];
    // Each reading's one-line meaning, shown on hover and on keyboard focus
    const MEANING = {
        Nodes: "How many nodes the graph has",
        Edges: "How many edges join them",
        Density: "The share of all possible edges that exist: 0 is none, 1 is every pair joined",
        "Connected components": "Groups of nodes joined to each other and to nothing else",
        "Weak components": "Groups of nodes joined to each other, ignoring edge direction",
        "Isolated nodes": "Nodes with no edges",
        "Self-loops": "Edges from a node to itself",
        "Repeated edges": "More than one edge between the same two nodes",
        Reciprocity: "The share of edges returned: A to B and also B to A",
        "Average degree": "The mean number of edges on a node",
        "Highest degree": "The most edges on any one node",
        "Average total degree": "The mean number of edges on a node, in and out together",
        "Highest total degree": "The most edges on any one node, in and out together",
        "Average clustering": "How often two neighbors of a node are also neighbors of each other, averaged over the nodes",
        Transitivity: "The share of connected triples that close into triangles, over the whole graph",
        Diameter: "The most steps a shortest path takes between any two nodes",
        "Degree assortativity": "Above 0, well-connected nodes link to each other; below 0, to sparsely connected nodes",
    };
    // A reading row. `sel`: [how many nodes, table-dock state or a route] makes it a link that selects what it counts, and the table follows
    function rd(name, value, sel) {
        const m = MEANING[name];
        if (sel) {
            const r = AB.data(name, value, { go: Array.isArray(sel[1]) ? sel[1] : ["table-dock", sel[1]] });
            AB.tip(r, (m ? m + ". " : "") + "Click to select the " + AB.count(sel[0], "node") + "; the table marks them as selected rows", { label: false });
            return r;
        }
        const r = AB.data(name, value);
        if (m) { r.firstChild.tabIndex = 0; AB.tip(r.firstChild, m, { label: false }); }
        return r;
    }
    const notComputed = () => h("div", { class: "k-data" }, AB.link("context-menus", "graph", READINGS.length + " more readings not computed", { class: "ab-link" }));
    const ifNot0 = (name, v, dock) => (Number(v) ? rd(name, n(v), dock ? [v, dock] : null) : null);
    // A filter changed the scope under computed readings: the one filtered mark in this inspector
    const staleBar = (k, all, kept, why, go) => ({ text: k + " readings are for all " + AB.count(all, "node"), why, actions: [{ label: "Compute on " + kept, go }] });
    function direction(word, where) {
        const r = AB.data("Direction", word);
        AB.tip(r.lastChild, where, { label: false });
        return r;
    }

    function view(state) {
        if (state === "registry") {
            const R = AB.fx.datasets[AB.registryDataset()];
            return { title: R.frame.graphRow, provenance: ["from " + R.file, "data-page", "edit-registry"], notes: 0,
                overview: { summary: n(R.nodes) + " nodes, " + n(R.edges) + " edges, directed", body: [
                    rd("Nodes", n(R.nodes)), rd("Edges", n(R.edges)), direction("Directed", "Each dependency points from a package to the package it needs"),
                    AB.data("Weight", AB.link("data-page", "edit-registry", "None (each edge counts 1)", { class: "ab-link" })), notComputedAll()] } };
        }
        if (isTransfers(state)) {
            const D = T(), f = D.frame, s = D.stats;
            // With a filter on, the counts agree with the header chip; the readings say what they were computed on
            const chip = AB.route && AB.route.frame.chip;
            const kept = chip && (chip.match(/([\d,]+) of /) || [])[1] || null;
            const readings = [rd("Density", String(s.density)), rd(f.componentsName, String(f.components), [D.nodes, "transfers"]),
                ifNot0("Isolated nodes", s.isolated, "transfers"), ifNot0("Self-loops", s.selfLoops), ifNot0("Repeated edges", s.parallelEdges),
                rd("Reciprocity", String(s.reciprocity)), rd("Average total degree", String(s.averageDegree)), rd("Highest total degree", n(s.maxDegree))].filter(Boolean);
            return {
                title: f.graphRow, provenance: ["from 2 tables", "data-page", "edit-source"] /* accounts and transfers */, notes: 0,
                stateBar: kept ? staleBar(readings.length, D.nodes, kept, "Computed before the filters, which leave " + kept + ".", ["context-menus", "graph"]) : null,
                overview: { summary: (kept ? kept + " of " : "") + n(D.nodes) + " nodes, " + n(D.edges) + " edges, directed", body: [
                    rd("Nodes", kept ? kept + " of " + n(D.nodes) : n(D.nodes)), rd("Edges", n(D.edges)), direction("Directed", "Chosen at load: a CSV does not say"), weight("amount", "edit-source"),
                    ...readings, notComputed(), ccdf(ccdfOfLogBars(f.degreeBars, s.maxDegree, D.nodes), s.isolated, "Total degree distribution")] },
            };
        }
        if (state === "door-entries" || state === "door-entries-as-nodes") {
            // The door entries as loaded (One edge per: Pair, the unmatched rows left out): every count
            // from the shell's fixture; no reading is computed yet, so none is shown
            const D = AB.fx.datasets.doorEntries, R = D.report, per = D.loaded.per;
            const lt = D.loadedTypes(), nodes = lt.total, plus = (k) => n(lt[k]) + (lt.added[k] ? " (" + n(D.tables[k === "person" ? 0 : 1].rows) + " + " + lt.added[k] + " added)" : "");
            // The Data page's Edit on the loaded entries: it opens on the load as it was (Pair, Row or as nodes)
            const loadedOn = "edit-entries";
            const edges = AB.data("Edges", n(D.loadedEdges()));
            if (per === "nodes") AB.tip(edges.lastChild, "Two link edges per entry, to its person and its building; an entry whose person or building is not in the tables has one", { label: false });
            return {
                title: D.graphName, provenance: ["from " + D.tables.length + " tables", "data-page", loadedOn], notes: 0,
                overview: { summary: n(nodes) + " nodes, " + n(D.loadedEdges()) + " edges, directed", body: [
                    rd("Nodes", n(nodes)), AB.data("person", plus("person")), AB.data("building", plus("building")), lt.entry ? AB.data("entry", n(lt.entry)) : null, edges,
                    // one edge table (the entries) gives one Weight line; each entry as a node gives two edge types, its two link columns
                    direction("Directed", "Chosen at load: a CSV does not say"),
                    weightsLine(per === "nodes" ? ["person_id", "building_id"].map((c) => ({ name: c + " links", edit: loadedOn })) : [{ name: "entries", weight: D.loadedWeight(), edit: loadedOn }]),
                    nodeWeight("floors", "building"),
                    rd("Isolated nodes", n(R.people.noEntries), Number(R.people.noEntries) ? [R.people.noEntries, "door-entries-nodes"] : null),
                    h("div", { class: "k-data" }, AB.link("context-menus", "graph", "Readings not computed", { class: "ab-link" }))] },
            };
        }
        if (state === "empty-graph") {
            // A graph with no data yet: nothing to summarize; the one empty line's verb is Add data
            return {
                title: L().frame.graphRow, provenance: null, notes: 0,
                overview: { summary: "No data", body: AB.empty("No nodes or edges.", { verb: AB.cmd("add-data").label, go: ["data-page", "entries"] }) },
            };
        }
        if (isOther(state)) return otherView(otherDs(state));
        const D = L(), f = D.frame, s = D.stats, FS = D.filterSteps;
        if (state === "reading") return { title: f.graphRow, provenance: ["from miserables.gexf", "data-page", "edit-graph-file"], notes: 1, overview: { summary: "Reading...", body: h("div", { class: "ins-reading", role: "status" }, "Reading...") } };
        // filtered: the readings were computed before the filter; filtered-computed: computed again on what it leaves.
        // components-selected keeps the readings the graph had when its count was clicked (computed on a direct link)
        if (state === "overview" || state === "computed") lastRead = state;
        const fresh = state === "filtered-computed", filtered = state === "filtered" || fresh;
        const computed = state === "computed" || filtered || (state === "components-selected" && lastRead === "computed");
        const st = FS.statsByState["1"];
        const g = filtered
            ? { nodes: st.nodes, edges: st.edges, density: AB.num(st.density), components: st.components, isolated: st.isolated, averageDegree: st.averageDegree, maxDegree: FS.byStep[0].top[0].degree, degrees: FILTERED_DEGREES }
            : { nodes: D.nodes, edges: D.edges, density: String(s.density), components: f.components, isolated: s.isolated, averageDegree: s.averageDegree, maxDegree: s.maxDegree, degrees: D.rows.map((r) => r.degree) };
        const kept = AB.count(g.nodes, "node", { of: D.nodes });
        const counts = [rd("Nodes", n(g.nodes)), rd("Edges", n(g.edges)), direction("Undirected", "Read from miserables.gexf"), weight("value", "edit-graph-file"),
            rd("Density", g.density), rd(f.componentsName, String(g.components), [g.nodes, filtered ? "nodes" : [SELF, "components-selected"]]),
            ifNot0("Isolated nodes", g.isolated, "nodes"), ifNot0("Self-loops", s.selfLoops),
            rd("Average degree", String(g.averageDegree)), rd("Highest degree", String(g.maxDegree))];
        const readings = (fresh ? READINGS_FILTERED : READINGS).map(([k, v]) => rd(k, v));
        const dist = ccdf(ccdfOfDegrees(g.degrees), g.isolated, "Degree distribution");
        // The header's filter chip names the filter; the state bar is this inspector's only filtered mark
        const body = [...counts, ...(computed ? readings : [notComputed()]), ...dist];
        return {
            title: f.graphRow, provenance: ["from miserables.gexf", "data-page", "edit-graph-file"], notes: 1,
            stateBar: filtered && !fresh ? staleBar(READINGS.length, D.nodes, n(g.nodes), "Computed before the filter: " + FS.steps[0] + " leaves " + kept + ".", [SELF, "filtered-computed"]) : null,
            overview: { summary: AB.count(g.nodes, "node") + ", " + n(g.edges) + " edges, undirected", body },
        };
    }

    // The node weight chosen at load, read-only here, beside the edge weight wherever that shows
    function nodeWeight(column, type) {
        const r = AB.data("Node weight", AB.link("data-page", "edit-buildings", column + " (" + type + ")", { class: "ab-link" }));
        AB.tip(r.lastChild, "Set when the data was loaded: each " + type + " weighs its " + column + "; a type with no weight column weighs 1. Change it on the Data page.", { label: false });
        return r;
    }
    // The weight chosen at load, read-only here: the Data page is its one home (higher weight means Stronger on every fixture)
    // `table`: the one edge table that carries it, when the graph has several (the others weigh 1)
    function weight(column, dataState, table) {
        const r = AB.data("Weight", AB.link("data-page", dataState, column + (table ? " (" + table + ")" : "") + ", stronger", { class: "ab-link" }));
        AB.tip(r.lastChild, "Set when the data was loaded: a higher " + column + " means a stronger tie" + (table ? "; edges from other tables have no weight and count 1" : "") + ". Every run uses it unless it picks another. Change it on the Data page.", { label: false });
        return r;
    }
    // The edge weights chosen at load, for every project: one edge type gives the Weight line; two or more give
    // one "Loaded weights" line naming each type's weight. `types`: [{ name, weight (a column or none), edit (its Data page state), table }]
    function weightsLine(types) {
        const many = types.length > 1;
        const none = (t) => AB.link("data-page", t.edit, many ? t.name + " none" : "None (each edge counts 1)", { class: "ab-link" });
        if (!many) return types[0].weight ? weight(types[0].weight, types[0].edit, types[0].table) : AB.data("Weight", none(types[0]));
        const parts = types.map((t) => (t.weight ? AB.link("data-page", t.edit, t.name + " " + t.weight + ", stronger", { class: "ab-link" }) : none(t)));
        const r = AB.data("Loaded weights", parts.flatMap((a, i) => (i ? ["; ", a] : [a])));
        r.firstChild.tabIndex = 0;
        AB.tip(r.firstChild, "Set when the data was loaded, one per edge type: a higher weight means a stronger tie, and \"none\" counts each edge 1. Every run uses them unless it picks another. Change them on the Data page.", { label: false });
        return r;
    }

    // ---------- the wide, nested and plain JSON projects (kit/wide-nested.json) ----------
    // The shell's DATASET_FRAME sends all three to the `wide` state, which draws the project in the frame;
    // `nested` is the same view with the nested project named in its own frame.
    const OTHER = ["wide", "nested", "plainJson"];
    const isOther = (s) => s === "wide" || s === "nested";
    const otherDs = (s) => { const ds = AB.route && AB.route.frame.dataset; return OTHER.includes(ds) ? ds : s; };
    const notComputedAll = () => h("div", { class: "k-data" }, AB.link("context-menus", "graph", "Readings not computed", { class: "ab-link" }));
    function nestedCounts(D) {
        const A = D.recordArrays, NL = AB.nestedLoaded();
        const res = NL.researchers ? A["data.researchers[]"] : 0, inst = NL.institutions ? A["data.institutions[]"] : 0;
        const addr = NL.researchers && NL.addr === "rows" ? (D.paths.find((p) => p.path === "data.researchers[].attributes.profile.contact.addresses[]") || {}).count || 0 : 0;
        const EDGES = [["coauthor", NL.researchers && NL.co === "edges" ? (NL.coPer === "item" ? 514 : 510) : 0], ["affiliations", NL.researchers && NL.aff === "rows" && NL.institutions ? 242 : 0], ["address links", addr], ["links", NL.links && NL.researchers ? (NL.institutions ? A["links[]"] : 118) : 0]].concat(NL.researchers ? (NL.idLinks || []).map((x) => [x.name + " links", x.n]) : []).filter(([, k]) => k);
        return { res, inst, addr, EDGES, edges: EDGES.reduce((a, [, k]) => a + k, 0) };
    }
    // The node and edge counts of a loaded project (wide, nested, plain JSON), for every surface that names them
    AB.projectCounts = (ds) => {
        const D = AB.fx.datasets[ds];
        if (ds === "nested") { const c = nestedCounts(D); return { nodes: c.res + c.inst + c.addr, edges: c.edges }; }
        return D && typeof D.nodes === "number" ? { nodes: D.nodes, edges: D.edges } : null;
    };
    function otherView(ds) {
        const D = AB.fx.datasets[ds];
        if (ds === "wide") {
            // hosts.csv and connections.csv joined on id; the stats are the fixture's
            // With a filter on, the counts agree with the header chip, as on the transfers
            const chip = AB.route && AB.route.frame.chip, kept = chip && (chip.match(/([\d,]+) of /) || [])[1] || null;
            const readings = [ifNot0("Isolated nodes", D.stats.isolated, "wide"), rd("Average total degree", String(D.stats.averageDegree)), rd("Highest total degree", n(D.stats.maxDegree))].filter(Boolean);
            return {
                title: D.frame.graphRow, provenance: ["from 2 tables", "data-page", "edit-wide-hosts"], notes: 0,
                stateBar: kept ? staleBar(readings.length, D.nodes, kept, "Computed before the filters, which leave " + kept + ".", ["context-menus", "graph"]) : null,
                overview: { summary: (kept ? kept + " of " : "") + n(D.nodes) + " nodes, " + n(D.edges) + " edges, directed", body: [
                    rd("Nodes", kept ? kept + " of " + n(D.nodes) : n(D.nodes)), rd("Edges", n(D.edges)), direction("Directed", "Chosen at load: a CSV does not say"), weight("bytes_total_24h", "edit-wide-connections"),
                    ...readings,
                    notComputedAll()] },
            };
        }
        if (ds === "plainJson") {
            return {
                title: D.frame.graphRow, provenance: ["from " + D.file, "data-page", "edit-plain-nodes"], notes: 0,
                overview: { summary: n(D.nodes) + " nodes, " + n(D.edges) + " edges, undirected", body: [
                    rd("Nodes", n(D.nodes)), rd("Edges", n(D.edges)), direction("Undirected", "Read from " + D.file),
                    weight("weight", "edit-plain-links"),
                    notComputedAll()] },
            };
        }
        // The nested document as the last Load left it (AB.nestedLoaded: the reader's choices on the Data
        // page): researchers and institutions are the node tables, addresses too when made Several rows;
        // co-authors (514 listed, 4 pairs from both sides), affiliations (Several rows) and links are the
        // edges. ponytail: the edge counts are the preview's figures until the element reports them
        const NL = AB.nestedLoaded(), { res, inst, addr, EDGES, edges } = nestedCounts(D);
        const e = AB.data("Edges", n(edges));
        AB.tip(e.lastChild, EDGES.map(([w, k]) => n(k) + " " + w).join(", ") || "No edges", { label: false });
        const dir = NL.direction === "directed" ? "Directed" : "Undirected";
        return {
            title: D.frame.graphRow, provenance: ["from " + D.file, "data-page", "edit-json-researchers"], notes: 0,
            overview: { summary: n(res + inst + addr) + " nodes, " + n(edges) + " edges, " + dir.toLowerCase(), body: [
                rd("Nodes", n(res + inst + addr)), res ? AB.data("researcher", n(res)) : null, inst ? AB.data("institution", n(inst)) : null, addr ? AB.data("address", n(addr)) : null, e,
                // edges split by edge type, as nodes are by type
                ...(EDGES.length > 1 ? EDGES.map(([w, k]) => AB.data(w, n(k))) : []),
                direction(dir, "Chosen at load: a JSON document does not say"),
                // only links can carry a weight column
                weightsLine(EDGES.length ? EDGES.map(([w]) => (w === "links" ? { name: w, weight: NL.weight, edit: "edit-json-links", table: "links" } : { name: w, edit: "edit-json-researchers" })) : [{ name: "", edit: "edit-json-researchers" }]),
                notComputedAll()].filter(Boolean) },
        };
    }

    // door-entries draws the load as it stands; door-entries-as-nodes is that load after Edit's Apply with
    // each entry as a node (what the Data page's Apply sets), so its two link edge types show the Loaded weights line
    function doorFrame(state) {
        if (state === "door-entries-as-nodes") Object.assign(AB.fx.datasets.doorEntries.loaded, { per: "nodes", add: null });
        return { dataset: "doorEntries", left: "graph-place/door-entries" };
    }
    const TRANSFERS_FRAME = { dataset: "transactions", left: "graph-place/many-groups" };
    const POP = { "layout-method": "layout-method", "transfers-methods": "transfers-methods", background: "background" };
    registerSection({
        id: SELF,
        title: "Inspector: nothing selected",
        region: "right",
        rail: "graph",
        frame: (state) => {
            const fr = isTransfers(state) ? Object.assign({}, TRANSFERS_FRAME) : /^door-entries/.test(state) ? doorFrame(state) : state === "filtered" || state === "filtered-computed" ? { chip: AB.count(L().filterSteps.statsByState["1"].nodes, "node", { of: L().nodes }), filterOn: ["degree"] }
                : state === "components-selected" ? { dock: SELF + "/" + state }
                : state === "reading" ? { left: "graph-place/empty", canvas: "canvas-and-states/loading" }
                : state === "empty-graph" ? { left: "graph-place/empty", canvas: "canvas-and-states/empty", dock: false }
                : isOther(state) ? { dataset: state } : state === "registry" ? { dataset: AB.registryDataset(), left: "graph-place/registry" } : {};
            if (POP[state]) fr.overlay = SELF + "/" + state;
            return fr;
        },
        states: [
            { id: "overview", label: "After load, Data tab (4 readings not computed)" },
            { id: "computed", label: "Summary computed" },
            { id: "components-selected", label: "Summary computed: components clicked, its nodes selected in the table" },
            { id: "filtered", label: "Filtered graph: readings for the whole graph" },
            { id: "filtered-computed", label: "Filtered graph: readings computed again on what the filter leaves" },
            { id: "canvas", label: "Style tab: Canvas and Layout" },
            { id: "print", label: "Style tab: Print-safe colors on, its grayscale check" },
            { id: "print-diverging", label: "Style tab: Print-safe colors on a diverging color (transfers' riskScore)" },
            { id: "pinned", label: "Style tab: two nodes pinned (Pinned nodes line)" },
            { id: "layout-method", label: "Layout popover (method, engine, options, pacing)" },
            { id: "background", label: "Background popover" },
            { id: "transfers", label: "Transfers (directed)" },
            { id: "transfers-methods", label: "Layout popover, transfers (three methods carry the cost mark)" },
            { id: "reading", label: "While loading: Reading..." },
            { id: "door-entries", label: "Door entries (three tables joined)" },
            { id: "door-entries-as-nodes", label: "Door entries loaded with each entry as a node: two edge types, Loaded weights" },
            { id: "empty-graph", label: "Empty graph: no data" },
            { id: "wide", label: "Hosts (wide: 69 and 26 attributes), weight bytes_total_24h" },
            { id: "nested", label: "Research network (nested JSON), weight on links" },
            { id: "registry", label: "Package registry (keyed JSON), as loaded" },
        ],
        render(el, state, ctx) {
            if (ctx.region === "dock") {
                // The table follows the selection: the one component holds every node, so every row is selected.
                // ponytail: marks table-dock's rows from outside; table-dock should take the selection itself
                AB.openDock();
                ctx.renderSection("table-dock/nodes", el);
                el.querySelectorAll("tbody tr").forEach((tr) => tr.setAttribute("aria-selected", "true"));
                return;
            }
            if (ctx.region === "overlay") {
                const ds = AB.route && AB.route.frame.dataset, D = AB.fx.datasets[ds];
                const nodes = state === "transfers-methods" ? T().nodes : ds === "nested" ? 200 : D && typeof D.nodes === "number" ? D.nodes : L().nodes;
                const p = state === "background" ? backgroundPopover() : layoutPopover(nodes);
                p.classList.add("ins-pop");
                el.append(p);
                return;
            }
            const v = view(state);
            const styleTab = ["canvas", "print", "print-diverging", "pinned", "layout-method", "background", "transfers-methods"].includes(state);
            const popState = isTransfers(state) ? "transfers-methods" : "layout-method";
            const insp = AB.inspector({
                icon: "network", title: v.title, kind: "Graph", kindKey: "graph", tab: styleTab ? "Style" : "Data",
                provenance: v.provenance, menu: ["context-menus", "graph"], stateBar: v.stateBar,
                tabs: {
                    Style: () => [canvasSection(state), layoutSection(popState, state)],
                    Data: () => AB.dataTab({ Summary: v.overview, Notes: { count: v.notes, target: ["notes-place", "about-graph"] } }, { kind: "graph" }),
                },
            });
            insp.classList.add("ins-root");
            el.append(insp);
        },
    });
})();
