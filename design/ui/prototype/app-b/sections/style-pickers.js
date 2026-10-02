/* Style pickers (version 5): what the Style tab (AB.styleTab) and "Why this look" (AB.whyThisLook)
   open. Two surfaces only:
   - Dark menus choose one item: a section's "+" (the shared AB.plus menu, opened here on the real
     button) and every attribute picker, which is the field list at menu size (AB.openFieldList):
     the Label "+" and the Label popover's Text, and the Binding popover's Source (Color by, Size by).
     On Les Miserables it is four attribute rows and no Find; on the hosts it is 69 with Find.
   - Light popovers edit a value (AB.popover): Color, Glow, Shape, Pattern, Head or Tail (titled by the line), Label style,
     Binding, Palette, Custom palette, and a token's property. Every change applies live; there is
     no Apply or Cancel. Esc, the X or a click outside closes. Only Custom palette has a footer
     button, because it creates something.
   The field list's Notes group (Note count, Latest note) is enabled, and Note count is a number, so
   it drives size and color as well as text. The Label
   popover holds Text and Position on top (the position grid is a line's one home), then a preview
   of every line of this row, then the style fields.
   Inside a popover an unset field shows its effective value in gray, its source in the tooltip.

   Lists come from graphty-element (stand-ins here; the real app reads them from the element): the
   18 palettes of catalog/palettes.ts, the shapes, arrow types and line patterns of AB.CHANNELS, the
   label-style fields of catalog/label-style.ts (names only, so the kinds below are the app's), the
   nine scales of catalog/scales.ts, and the defaults of config/EdgeStyle.ts and RichTextLabel.ts.
   Plain ASCII. See ../README.md. */
(function () {
    "use strict";
    const { h, icon } = AB;

    // ---------- this section's styles, injected once ----------
    if (!document.querySelector("style[data-sp]")) {
        document.head.append(h("style", { "data-sp": "" },
            ".sp-pop .ab-sin::placeholder{color:var(--cm-text-secondary);opacity:1}" +
            ".sp-eff{color:var(--cm-text-secondary)}" +
            ".sp-head{padding:8px 16px 2px;color:var(--cm-text-secondary);font-size:11px;font-weight:550}" +
            ".sp-scope{padding:6px 16px;margin:-8px 0 8px;background:var(--cm-bg-secondary);color:var(--cm-text-secondary);font-size:11px}" +
            ".sp-item{display:flex;align-items:center;gap:8px;min-height:28px;padding:2px 16px;cursor:default}" +
            ".sp-item:hover,.sp-item:focus-visible{background:var(--cm-bg-hover)}" +
            ".sp-item[aria-selected=true]{background:var(--cm-bg-selected)}" +
            ".sp-ck{width:12px;flex:none;color:var(--cm-text-brand)}" +
            ".sp-strip{display:flex;width:72px;height:12px;border-radius:2px;overflow:hidden;flex:none;box-shadow:inset 0 0 0 1px var(--cm-border)}" +
            ".sp-strip>span{flex:1}" +
            ".sp-mark{display:inline-flex;color:var(--cm-text-secondary)}" +
            ".sp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px;padding:0 8px 8px}" +
            ".sp-cell{min-width:0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px 4px;border-radius:5px;color:var(--cm-icon)}" +
            ".sp-cell:hover,.sp-cell:focus-visible{background:var(--cm-bg-hover)}" +
            ".sp-cell[aria-selected=true]{background:var(--cm-bg-selected);box-shadow:inset 0 0 0 1px var(--cm-border-selected)}" +
            ".sp-cell>span{width:100%;text-align:center;font-size:11px;line-height:13px;color:var(--cm-text-secondary);overflow-wrap:break-word}" +
            ".sp-cell svg{flex:none}" +
            ".sp-filter{display:flex;align-items:center;gap:6px;margin:0 16px 8px;color:var(--cm-icon-secondary)}" +
            ".sp-color{display:flex;align-items:center;gap:6px;min-width:0;flex:1}" +
            ".sp-color .ab-sin{width:0}" +
            ".sp-pair{display:flex;gap:6px;align-items:center;flex:1;min-width:0}.sp-pair .ab-sin{flex:1;width:0;min-width:0}" +
            ".sp-pct{flex:0 0 52px!important;width:52px!important}" +
            ".sp-stops{display:flex;flex-wrap:wrap;gap:4px;padding:2px 16px 8px}" +
            ".sp-stops .k-chit{width:20px;height:20px;cursor:default}" +
            ".sp-sv{position:relative;height:150px;margin:0 16px 8px;border-radius:5px;box-shadow:inset 0 0 0 1px var(--cm-border)}" +
            ".sp-sv>i{position:absolute;width:10px;height:10px;margin:-6px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 1px #0006}" +
            ".sp-hue{height:12px;margin:0 16px 10px;border-radius:6px;background:linear-gradient(90deg,red,#ff0,lime,cyan,blue,#f0f,red);position:relative}" +
            ".sp-hue>i{position:absolute;top:-1px;width:10px;height:10px;margin-left:-6px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 1px #0006}" +
            ".sp-tabs{padding:0 8px 8px}" +
            ".sp-loc{display:grid;grid-template-columns:repeat(3,24px);gap:2px}" +
            ".sp-loc>span{height:20px;border-radius:4px;background:var(--cm-bg-secondary);display:grid;place-items:center}" +
            ".sp-loc>span::after{content:'';width:6px;height:6px;border-radius:50%;background:var(--cm-icon-secondary)}" +
            ".sp-loc>span[aria-checked=true]{background:var(--cm-bg-brand)}" +
            ".sp-loc>span[aria-checked=true]::after{background:#fff}" +
            ".sp-loc>span[aria-disabled=true]{background:repeating-linear-gradient(135deg,var(--cm-bg-secondary) 0 3px,var(--cm-border) 3px 4px)}" +
            ".sp-loc>span[aria-disabled=true]::after{background:var(--cm-text-secondary)}" +
            ".sp-loc>span:focus-visible{outline:2px solid var(--cm-border-selected);outline-offset:1px}" +
            ".sp-lprev{display:grid!important;grid-template-columns:1fr minmax(44px,max-content) 1fr;grid-template-rows:auto 44px auto;gap:2px;height:auto!important;padding:6px 4px;place-items:center}" +
            ".sp-lcell{min-width:0;max-width:100%;display:flex;justify-content:center}" +
            ".sp-lcell b{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
            ".sp-lcell[data-pos$=left]{justify-self:end}.sp-lcell[data-pos$=right]{justify-self:start}" +
            ".sp-lnode{width:28px;height:28px;border-radius:50%;background:#E69F00;align-items:center}" +
            ".sp-lnode b{position:relative}" +
            ".sp-faded{opacity:.64;color:var(--cm-text)}" /* 4.5:1 on the light panel */ +
            ".sp-preview{display:flex;align-items:center;justify-content:center;height:56px;margin:0 16px 8px;border-radius:5px;background:var(--cm-bg-secondary)}" +
            ".sp-preview b{padding:1px 6px;border-radius:4px;font-family:Verdana,sans-serif;font-weight:400;font-size:13px}" +
            ".sp-ml{display:inline-flex;align-items:center;gap:8px}" +
            ".sp-detach{padding:4px 16px 0}" +
            ".sp-pop .ab-frow .k-field{flex:1;min-width:0}" +
            // the label popover's "-": the panel's rule, one 24 px slot at the row's end, shown on hover or focus
            ".sp-lsrow .ab-fctl{display:flex;align-items:center;gap:4px}" +
            ".sp-lsctl{flex:1;min-width:0;display:flex;align-items:center}" +
            ".sp-minus{flex:none;width:24px;visibility:hidden}" +
            ".sp-lsrow:is(:hover,:focus-within) .sp-minus{visibility:visible}" +
            "@media (pointer:coarse){.sp-minus{visibility:visible}}" +
            // a long name wraps in a picker (never cut), so the part that tells two names apart stays visible
            ".k-field.sp-wrapf{height:auto;min-height:24px;padding-top:3px;padding-bottom:3px;white-space:normal}" +
            ".sp-wrapf .k-ellipsis,.sp-wrapf .sp-ml{white-space:normal;overflow:visible;text-overflow:clip;align-items:flex-start}" +
            ".sp-wrap{min-width:0;overflow-wrap:anywhere;white-space:normal}" +
            ".sp-pop .k-popover-head{height:auto;min-height:40px;padding-top:8px;padding-bottom:8px}" +
            ".sp-pop .k-popover-head .k-grow{min-width:0;overflow-wrap:anywhere;white-space:normal}"));
    }

    // ---------- the element's lists (stand-ins) ----------
    const P = (id, name, kind, colors, safe) => ({ id, name, kind, colors, safe });
    const PALETTES = [
        P("viridis", "Purple to yellow", "sequential", ["#440154", "#482878", "#3e4989", "#31688e", "#26828e", "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde724"], true),
        P("ylorbr", "Orange to brown", "sequential", ["#ef7818", "#d85a09", "#b84203", "#8e3104", "#662506"], true),
        P("plasma", "Blue to yellow", "sequential", ["#0d0887", "#5302a3", "#8b0aa5", "#b83289", "#db5c68", "#f48849", "#febd2a", "#f0f921"], true),
        P("inferno", "Black to yellow", "sequential", ["#000004", "#1b0c41", "#4a0c6b", "#781c6d", "#a52c60", "#cf4446", "#ed6925", "#fb9b06", "#f7d13d"], true),
        P("blues", "Blues", "sequential", ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"], true),
        P("greens", "Greens", "sequential", ["#f7fcf5", "#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#006d2c", "#00441b"], false),
        P("oranges", "Oranges", "sequential", ["#fff5eb", "#fee6ce", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#a63603", "#7f2704"], false),
        P("okabe-ito", "Eight distinct", "categorical", ["#E69F00", "#56B4E9", "#009E73", "#0072B2", "#D55E00", "#CC79A7", "#000000", "#F0E442"], true),
        P("tol-vibrant", "Seven bright", "categorical", ["#0077BB", "#33BBEE", "#009988", "#EE7733", "#CC3311", "#EE3377", "#BBBBBB"], true),
        P("tol-muted", "Nine soft", "categorical", ["#332288", "#88CCEE", "#44AA99", "#117733", "#999933", "#DDCC77", "#CC6677", "#882255", "#AA4499"], true),
        P("pastel", "Eight pale", "categorical", ["#FFD699", "#A8D8F0", "#66C9B2", "#FFF099", "#669DD6", "#FF9980", "#EBB8D2", "#CCCCCC"], true),
        P("carbon", "Five enterprise", "categorical", ["#6929C4", "#1192E8", "#005D5D", "#9F1853", "#FA4D56"], false),
        P("purple-green", "Purple to green", "diverging", ["#762a83", "#9970ab", "#c2a5cf", "#e7d4e8", "#f7f7f7", "#d9f0d3", "#a6dba0", "#5aae61", "#1b7837"], true),
        P("blue-orange", "Blue to orange", "diverging", ["#2166ac", "#4393c3", "#92c5de", "#d1e5f0", "#f7f7f7", "#fddbc7", "#f4a582", "#d6604d", "#b2182b"], true),
        P("red-blue", "Red to blue", "diverging", ["#67001f", "#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#f7f7f7", "#d1e5f0", "#92c5de", "#4393c3", "#2166ac"], false),
        P("blue-highlight", "Blue highlight", "categorical", ["#0072B2", "#CCCCCC"], true),
        P("green-highlight", "Green highlight", "categorical", ["#009E73", "#999999"], true),
        P("orange-highlight", "Orange highlight", "categorical", ["#E69F00", "#CCCCCC"], true),
    ];
    const pal = (id) => PALETTES.find((p) => p.id === id);
    // the element's nine scales, offered by the bound value's type
    const SCALES = { linear: "Linear", log: "Log", neglog10: "Log, with negatives", sqrt: "Square root", pow: "Power", bins: "Bins", quantile: "Quantiles", ordinal: "One color per value", passthrough: "As is" };
    const SCALES_FOR = { number: ["linear", "log", "neglog10", "sqrt", "pow", "bins", "quantile"], category: ["ordinal"], text: ["passthrough"] };
    const chChoices = (id) => AB.CHANNELS.node.concat(AB.CHANNELS.edge).find((c) => c.id === id).choices;
    const nice = (v) => String(v).replace(/_/g, " ");
    const DEF = "the default look";

    // ---------- glyphs (drawn in currentColor so they work in light and dark) ----------
    const NS = "http://www.w3.org/2000/svg";
    function svg(w, hgt, vb, inner) {
        const s = document.createElementNS(NS, "svg");
        s.setAttribute("width", w);
        s.setAttribute("height", hgt);
        s.setAttribute("viewBox", vb);
        s.setAttribute("aria-hidden", "true");
        s.innerHTML = inner;
        return s;
    }
    const pts = (a) => a.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const ngon = (n, cx, cy, rx, ry, rot) => Array.from({ length: n }, (_, i) => { const t = (rot || 0) + (i * 2 * Math.PI) / n; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]; });
    const poly = (a, fill) => `<polygon points="${pts(a)}"${fill ? ' fill="currentColor" fill-opacity=".12"' : ""}/>`;
    const lines = (a, b) => a.map((p, i) => `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${(b[i] || b[0])[0].toFixed(1)}" y2="${(b[i] || b[0])[1].toFixed(1)}"/>`).join("");
    const G = (s) => `<g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round">${s}</g>`;
    const prism = (n, rot) => { const t = ngon(n, 16, 9, 11, 4, rot), b = ngon(n, 16, 24, 11, 4, rot); return G(poly(b, true) + poly(t, true) + lines(t, b)); };
    const pyramid = (n, rot) => { const b = ngon(n, 16, 24, 12, 4, rot); return G(poly(b, true) + lines(b, [[16, 4]])); };
    const dipyr = (n, rot) => { const m = ngon(n, 16, 16, 12, 4, rot); return G(poly(m, true) + lines(m, [[16, 3]]) + lines(m, [[16, 29]])); };
    const elong = (n, rot) => { const t = ngon(n, 16, 12, 11, 3.5, rot), b = ngon(n, 16, 20, 11, 3.5, rot); return G(poly(t, true) + poly(b) + lines(t, b) + lines(t, [[16, 2]]) + lines(b, [[16, 30]])); };
    const knot = () => { const a = []; for (let i = 0; i <= 90; i++) { const t = (i / 90) * 2 * Math.PI; a.push([16 + 4 * (Math.sin(t) + 2 * Math.sin(2 * t)), 16 + 4 * (Math.cos(t) - 2 * Math.cos(2 * t))]); } return G(`<polyline points="${pts(a)}"/>`); };
    const SHAPE_ART = {
        box: () => prism(4, Math.PI / 4),
        sphere: () => G('<circle cx="16" cy="16" r="12" fill="currentColor" fill-opacity=".12"/><ellipse cx="16" cy="16" rx="12" ry="4"/>'),
        cylinder: () => G('<path d="M5 9v14a11 4 0 0 0 22 0V9" fill="currentColor" fill-opacity=".12"/><ellipse cx="16" cy="9" rx="11" ry="4"/>'),
        cone: () => G('<path d="M16 4L4 24a12 4 0 0 0 24 0z" fill="currentColor" fill-opacity=".12"/><path d="M4 24a12 4 0 0 1 24 0"/>'),
        capsule: () => G('<rect x="9" y="3" width="14" height="26" rx="7" fill="currentColor" fill-opacity=".12"/><ellipse cx="16" cy="16" rx="7" ry="2.5"/>'),
        torus: () => G('<ellipse cx="16" cy="16" rx="13" ry="8" fill="currentColor" fill-opacity=".12"/><path d="M10 16a6 2.5 0 0 0 12 0"/><path d="M11 15.2a5 2.5 0 0 1 10 0"/>'),
        "torus-knot": knot,
        tetrahedron: () => pyramid(3, Math.PI / 2),
        octahedron: () => dipyr(4, 0),
        dodecahedron: () => { const o = ngon(10, 16, 16, 13, 13, -Math.PI / 2), i = ngon(5, 16, 16, 7, 7, -Math.PI / 2); return G(poly(o, true) + poly(i) + lines(i, o.filter((_, k) => k % 2 === 0))); },
        icosahedron: () => { const o = ngon(6, 16, 16, 13, 13, -Math.PI / 2), i = ngon(3, 16, 17, 7, 7, -Math.PI / 2); return G(poly(o, true) + poly(i) + lines(i, [o[0], o[2], o[4]]) + lines(i, [o[1], o[3], o[5]])); },
        rhombicuboctahedron: () => { const o = ngon(8, 16, 16, 13, 13, Math.PI / 8), i = ngon(4, 16, 16, 6.5, 6.5, Math.PI / 4); return G(poly(o, true) + poly(i) + lines(i, [o[0], o[2], o[4], o[6]]) + lines(i, [o[1], o[3], o[5], o[7]])); },
        triangular_prism: () => prism(3, Math.PI / 2),
        pentagonal_prism: () => prism(5, Math.PI / 2),
        hexagonal_prism: () => prism(6, 0),
        square_pyramid: () => pyramid(4, Math.PI / 4),
        pentagonal_pyramid: () => pyramid(5, Math.PI / 2),
        triangular_dipyramid: () => dipyr(3, Math.PI / 2),
        pentagonal_dipyramid: () => dipyr(5, Math.PI / 2),
        elongated_square_dipyramid: () => elong(4, Math.PI / 4),
        elongated_pentagonal_dipyramid: () => elong(5, Math.PI / 2),
        elongated_pentagonal_cupola: () => { const b = ngon(10, 16, 24, 13, 4, 0), t = ngon(5, 16, 9, 7, 2.5, Math.PI / 2), m = ngon(10, 16, 17, 13, 4, 0); return G(poly(b, true) + poly(m) + poly(t, true) + lines(m, b) + lines(t, [m[0], m[2], m[4], m[6], m[8]])); },
        goldberg: () => { const i = ngon(6, 16, 16, 5, 5, 0), o = ngon(6, 16, 16, 12, 12, 0); return G('<circle cx="16" cy="16" r="13" fill="currentColor" fill-opacity=".12"/>' + poly(i) + lines(i, o)); },
        icosphere: () => { const i = ngon(6, 16, 16, 7, 7, -Math.PI / 2), o = ngon(6, 16, 16, 13, 13, -Math.PI / 6); return G('<circle cx="16" cy="16" r="13" fill="currentColor" fill-opacity=".12"/>' + poly(i) + lines(i, o) + lines(i, o.slice(1).concat([o[0]])) + lines(i, [[16, 16]])); },
        geodesic: () => G('<circle cx="16" cy="16" r="13" fill="currentColor" fill-opacity=".12"/><ellipse cx="16" cy="16" rx="13" ry="4"/><ellipse cx="16" cy="16" rx="5" ry="13"/><path d="M5 10h22M5 22h22"/>'),
    };
    const shapeGlyph = (name) => svg(32, 32, "0 0 32 32", (SHAPE_ART[name] || SHAPE_ART.box)());
    const ARROW_ART = {
        normal: '<path d="M14 3l8 5-8 5z" fill="currentColor"/>',
        inverted: '<path d="M22 3l-8 5 8 5z" fill="currentColor"/>',
        dot: '<circle cx="18" cy="8" r="4" fill="currentColor"/>',
        "sphere-dot": '<circle cx="18" cy="8" r="4.5" fill="currentColor"/><circle cx="16.6" cy="6.6" r="1.4" fill="var(--cm-bg,#fff)" fill-opacity=".8"/>',
        "open-dot": '<circle cx="18" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>',
        none: "",
        tee: '<path d="M21 3v10" stroke="currentColor" stroke-width="2"/>',
        "open-normal": '<path d="M14 3l8 5-8 5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
        diamond: '<path d="M13 8l4.5-4.5L22 8l-4.5 4.5z" fill="currentColor"/>',
        "open-diamond": '<path d="M13 8l4.5-4.5L22 8l-4.5 4.5z" fill="none" stroke="currentColor" stroke-width="1.5"/>',
        crow: '<path d="M14 8l8-5M14 8h8M14 8l8 5" stroke="currentColor" stroke-width="1.5" fill="none"/>',
        box: '<rect x="14" y="4" width="8" height="8" fill="currentColor"/>',
        "half-open": '<path d="M14 8V3l8 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
        vee: '<path d="M15 3l7 5-7 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    };
    const arrowGlyph = (name) => svg(36, 24, "0 -4 24 24", `<path d="M2 8h${name === "none" ? 20 : 12}" stroke="currentColor" stroke-width="1.5"/>` + (ARROW_ART[name] || ""));
    const star = (x) => `<polygon points="${pts(ngon(10, x, 8, 3.2, 3.2, -Math.PI / 2).map((p, i) => (i % 2 ? [x + (p[0] - x) * 0.45, 8 + (p[1] - 8) * 0.45] : p)))}"/>`;
    const LINE_ART = {
        solid: '<path d="M2 8h44" stroke="currentColor" stroke-width="2"/>',
        dot: [5, 13, 21, 29, 37, 45].map((x) => `<circle cx="${x - 2}" cy="8" r="1.6"/>`).join(""),
        star: [6, 18, 30, 42].map(star).join(""),
        box: [3, 13, 23, 33, 43].map((x) => `<rect x="${x - 1}" y="5.5" width="5" height="5"/>`).join(""),
        dash: '<path d="M2 8h44" stroke="currentColor" stroke-width="2" stroke-dasharray="7 4"/>',
        diamond: [5, 15, 25, 35, 45].map((x) => `<path d="M${x - 3.5} 8l3.5-3.5 3.5 3.5-3.5 3.5z"/>`).join(""),
        "dash-dot": '<path d="M2 8h44" stroke="currentColor" stroke-width="2" stroke-dasharray="8 3 2 3"/>',
        sinewave: '<path d="M2 8q5-8 10 0t10 0 10 0 10 0 4 2" fill="none" stroke="currentColor" stroke-width="1.6"/>',
        zigzag: '<path d="M2 8l4-5 5 10 5-10 5 10 5-10 5 10 5-10 5 10 3-5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
    };
    const lineGlyph = (name) => svg(48, 16, "0 0 48 16", `<g fill="currentColor">${LINE_ART[name] || ""}</g>`);

    // ---------- what opened us: the Style tab line or the "Why this look" token last clicked ----------
    // (a direct link has neither, and each state then shows its fixture default)
    let opener = { line: null, token: null };
    // A label line also carries every label line of its row and the inspector it sits in, so the Label
    // popover edits the line clicked and the inspector stays on the row it was opened from
    let labelOpener = null;
    const NUM_FIELDS = ["degree", "Note count", "betweenness", "PageRank"];
    document.addEventListener("click", (e) => {
        const t = e.target.closest && e.target.closest("#ab-right .ab-token, #ab-right .ab-sline");
        if (!t) return;
        opener = t.classList.contains("ab-token") ? { token: { prop: t.textContent.trim(), tip: t.dataset.tip || "" } } : { line: t.dataset.ch };
        if (t.dataset.label && t.dataset.ch === "node.label") {
            const lines = [...document.querySelectorAll('#ab-right .ab-sline[data-ch="node.label"][data-label]')].map((x) => {
                const v = x.querySelector(".ab-sv .k-grow");
                const field = v ? v.textContent.trim() : "";
                return { pos: posId(x.dataset.label), field, type: x.hasAttribute("data-bound") ? (NUM_FIELDS.includes(field) ? "num" : "cat") : null, text: x.hasAttribute("data-bound") ? null : field };
            });
            const r = AB.route;
            labelOpener = { pos: posId(t.dataset.label), lines, right: r && typeof r.frame.right === "string" ? r.frame.right : r && r.sec.region === "right" ? r.id + "/" + r.state : null };
        }
    }, true);
    // The bind icon on an unbound line: its property, and the panels it was clicked in (bind-prop draws over them)
    let bindOpener = null;
    document.addEventListener("click", (e) => {
        const b = e.target.closest && e.target.closest('#ab-right .ab-sline [aria-label$=" by attribute"]');
        const ln = b && b.closest(".ab-sline");
        if (!ln || ln.hasAttribute("data-bound")) return;
        const r = AB.route, f = r && r.frame;
        bindOpener = { prop: b.getAttribute("aria-label").replace(/ by attribute$/, ""), ch: ln.dataset.ch, left: f && f.left, canvas: f && f.canvas, dataset: f && f.dataset,
            right: f && typeof f.right === "string" ? f.right : r && r.sec.region === "right" ? r.id + "/" + r.state : null };
    }, true);
    // A bound line's value clicked (style-pickers/bound): its channel and the inspector it is on
    let lastLine = null, boundOpener = null;
    document.addEventListener("click", (e) => {
        // the bound value, or the bind icon on a bound line
        const b = e.target.closest && (e.target.closest("#ab-right .ab-sline .ab-bound") || e.target.closest('#ab-right .ab-sline[data-bound] [aria-label$=" by attribute"]'));
        if (!b) return;
        const r = AB.route, f = r && r.frame;
        lastLine = b.closest(".ab-sline").dataset.ch;
        boundOpener = f && typeof f.right === "string" ? f.right : r && r.sec.region === "right" ? r.id + "/" + r.state : null;
    }, true);
    const takeOpener = () => { const o = opener; opener = { line: null, token: null }; return o; };

    // ---------- anchors ----------
    // the first matching element that is laid out (a bind icon hidden until hover has no box)
    const find = (...sels) => { for (const s of sels) for (const el of document.querySelectorAll(s)) { const r = el.getBoundingClientRect(); if (r.width && r.height) return el; } return document.querySelector("#ab-right .ab-style") || document.getElementById("ab-right"); };
    const lineAt = (ch) => `#ab-right .ab-sline[data-ch="${ch}"] .ab-sv`;
    const headOf = (title) => [...document.querySelectorAll("#ab-right .ab-style .k-section-head")].find((x) => x.textContent.trim().startsWith(title));
    const headSel = (title) => { const hd = headOf(title); if (hd) hd.setAttribute("data-sp-head", title); return `[data-sp-head="${title}"]`; };

    // ---------- small builders ----------
    // A field whose unset state shows the effective value in gray, the source in its tooltip
    function input(o) {
        const inp = h("input", { class: "ab-sin" + (o.num ? " k-num" : "") + (o.cls ? " " + o.cls : ""), type: "text", inputmode: o.num ? "decimal" : null, value: o.value == null ? "" : String(o.value), placeholder: o.eff || "", "aria-label": o.label, spellcheck: "false" });
        if (o.eff) AB.tip(inp, o.eff + ", " + (o.src || DEF), { label: false });
        inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") inp.blur(); if (e.key === "Escape") { inp.blur(); AB.close(); } });
        if (o.onInput) inp.addEventListener("input", () => o.onInput(inp.value.trim()));
        return inp;
    }
    const row = (label, ...ctl) => AB.fieldRow(label, ctl, { popover: true });
    // A color value: swatch, six-digit hex, opacity percent. Unset parts show their effective value in gray.
    function colorValue(o) {
        const chit = AB.chit(o.hex || o.eff || "transparent");
        if (!o.hex) chit.style.opacity = ".5";
        const hex = input({ label: (o.name || "Color") + ", hex", value: o.hex ? o.hex.slice(1).toUpperCase() : "", eff: o.eff ? o.eff.slice(1).toUpperCase() : null, src: o.src, cls: "k-mono",
            onInput: (v) => { if (/^[0-9a-f]{6}$/i.test(v)) { chit.style.background = "#" + v; chit.style.opacity = ""; o.onChange && o.onChange("#" + v); } } });
        hex.maxLength = 6;
        if (o.focus) hex.setAttribute("data-autofocus", "");
        const pct = o.noOpacity ? null : input({ label: (o.name || "Color") + ", opacity percent", num: true, value: o.pct == null ? null : o.pct + "%", eff: o.pct == null ? "100%" : null, cls: "sp-pct", onInput: (v) => o.onChange && o.onChange() });
        if (o.chitGo) Object.assign(chit, { tabIndex: 0 }), chit.setAttribute("role", "button"), AB.tip(chit, "Open the color picker"), AB.nav(chit, o.chitGo[0], o.chitGo[1]);
        const set = (c) => { hex.value = c.slice(1).toUpperCase(); chit.style.background = c; chit.style.opacity = ""; o.onChange && o.onChange(c); AB.announce((o.name || "Color") + " " + c); };
        return { el: h("span", { class: "sp-color" }, chit, hex, pct), set };
    }
    // A color's spoken name: graphty-element's names for its palette colors, else a plain hue word.
    // ponytail: a stand-in for the element's color names; the hue buckets are coarse.
    const NAMES = { E69F00: "orange", "56B4E9": "sky blue", "009E73": "bluish green", "0072B2": "blue", D55E00: "vermilion", CC79A7: "reddish purple", "000000": "black", F0E442: "yellow", BDBDBD: "light gray", FFFFFF: "white", "882255": "wine", "332288": "indigo" };
    function colorName(hex) {
        const k = hex.replace("#", "").toUpperCase();
        if (NAMES[k]) return NAMES[k];
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(k.slice(i, i + 2), 16) / 255);
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
        if (s < 0.15) return l > 0.9 ? "white" : l < 0.12 ? "black" : (l > 0.65 ? "light " : l < 0.35 ? "dark " : "") + "gray";
        const hue = hueOf("#" + k), word = [[15, "red"], [45, "orange"], [70, "yellow"], [165, "green"], [200, "teal"], [255, "blue"], [295, "purple"], [340, "pink"], [361, "red"]].find(([t]) => hue < t)[1];
        return (l < 0.3 ? "dark " : l > 0.75 ? "light " : "") + word;
    }
    const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    // Swatches you can click: the document's colors, or a library palette. Each says its color's name.
    const swatches = (colors, onPick) => h("div", { class: "sp-stops", role: "listbox", "aria-label": "Colors" }, colors.map((c) => {
        const s = h("span", { class: "k-chit", style: "background:" + c, role: "option", tabindex: "0" });
        AB.tip(s, cap1(colorName(c)), { second: c.toUpperCase() });
        s.addEventListener("click", () => onPick(c));
        s.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick(c)));
        return s;
    }));
    // A segmented control that redraws itself on change (AB.seg reports; this keeps it current)
    function segLive(options, value, onChange, label) {
        const box = h("span", { style: "display:flex" });
        const draw = (v) => box.replaceChildren(AB.seg(options, v, (n) => { draw(n); box.querySelector("[aria-checked=true]").focus(); onChange(n); }, { label }));
        draw(value);
        return box;
    }
    const check = (label, on, onFlip) => {
        const b = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(!!on), "aria-label": label });
        const flip = () => { b.setAttribute("aria-checked", String(b.getAttribute("aria-checked") !== "true")); onFlip && onFlip(b.getAttribute("aria-checked") === "true"); };
        b.addEventListener("click", flip);
        b.addEventListener("keydown", (e) => e.key === " " && (e.preventDefault(), flip()));
        return b;
    };
    // A dropdown: a field that opens the shared dark menu, with a check on the current value
    function dropdown(label, value, choices, o) {
        o = o || {};
        let cur = value;
        const text = h("span", { class: o.unset ? "sp-eff" : null }, choices[cur] || nice(cur));
        const f = AB.field(text, { caret: true, onClick: () => AB.openMenu(f, Object.keys(choices).map((k) => ({ label: choices[k], check: k === cur, onClick: () => { cur = k; text.textContent = choices[k]; text.className = ""; AB.announce(label + ": " + choices[k]); o.onChange && o.onChange(k); } }))) });
        f.setAttribute("aria-label", label);
        f.setAttribute("aria-haspopup", "menu");
        if (o.unset) AB.tip(f, (choices[cur] || nice(cur)) + ", " + (o.src || DEF), { label: false });
        return f;
    }
    // A grid of glyph cells with names (shape, pattern, arrow): one Tab stop, arrows move, Enter picks
    function glyphGrid(label, choices, current, glyph, onPick, family) {
        const nm = (c) => AB.plain(family, c);
        const grid = h("div", { class: "sp-grid", role: "listbox", "aria-label": label });
        let cur = current;
        const draw = (q) => {
            grid.replaceChildren();
            const hits = choices.filter((c) => !q || nm(c).toLowerCase().includes(q));
            if (!hits.length) return grid.append(h("div", { style: "grid-column:1/-1" }, AB.noMatch(q)));
            hits.forEach((c) => {
                const cell = h("div", { class: "sp-cell", role: "option", tabindex: c === cur || (!hits.includes(cur) && c === hits[0]) ? "0" : "-1", "aria-selected": String(c === cur), "data-v": c }, glyph(c), h("span", null, nm(c)));
                const pick = () => { cur = c; grid.querySelectorAll(".sp-cell").forEach((x) => { x.setAttribute("aria-selected", String(x === cell)); x.tabIndex = x === cell ? 0 : -1; }); AB.announce(label + ": " + nm(c)); onPick(c); };
                cell.addEventListener("click", pick);
                cell.addEventListener("keydown", (e) => {
                    const all = [...grid.querySelectorAll(".sp-cell")], i = all.indexOf(cell);
                    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + 3, ArrowUp: i - 3, Home: 0, End: all.length - 1 }[e.key];
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
                    else if (to != null && all[to]) { e.preventDefault(); all[to].focus(); }
                });
                grid.append(cell);
            });
        };
        draw("");
        grid.filter = draw;
        return grid;
    }
    // A long attribute name or path in a picker wraps whole; the full name is also its tooltip
    // (it breaks after a "." or "_" first, so a path wraps at its segments)
    const wrapName = (name) => AB.tip(h("span", { class: "sp-wrap" }, String(name).split(/(?<=[._])/).flatMap((p) => [p, h("wbr")]).slice(0, -1)), name, { label: false });
    const wrapField = (f) => (f.classList.add("sp-wrapf"), f);
    const pop = (anchor, title, body, o) => AB.popover(Object.assign({ anchor, title, body, width: 280 }, o || {}));

    // ---------- "+": the shared menu on the real button (no local copy) ----------
    // The state presses the section's "+" in the inspector. With several unset properties it opens
    // the shared dark menu; picking one adds the line there, live. Leaving the menu leaves the state.
    function pressPlus(sectionTitle, oneLeft) {
        requestAnimationFrame(() => {
            const hd = headOf(sectionTitle);
            const b = hd && hd.querySelector(".ab-plus");
            if (!b) return AB.flash(sectionTitle + " has nothing left to add");
            b.click();
            if (!oneLeft) leaveWithMenu();
        });
    }
    function leaveWithMenu() {
        const layer = document.getElementById("ab-overlay"), here = location.hash;
        const mo = new MutationObserver(() => { if (!layer.querySelector(".ab-menu")) { mo.disconnect(); if (location.hash === here) AB.close(); } });
        mo.observe(layer, { childList: true });
    }

    // ---------- Binding: one popover for every bound value ----------
    // Its Source is the field list at menu size (AB.openFieldList): attributes grouped by table, In use
    // first, results, and the Notes group (Note count is a number, so it can drive size and color as
    // well as text). Color takes kind "color", Size kind "number", so what a property cannot take is
    // listed last, disabled with the reason. A binding with no source yet (bind on a line just added)
    // shows Source alone, its list open; a source that reads nothing shows graphty-element's error.
    const L = () => AB.fx.datasets.lesmis;
    const BINDINGS = {
        color: { prop: "Color", source: "PageRank", type: "number", pal: "ylorbr", from: "fit", range: ["0.0033", "0.0754"], ds: "lesmis" },
        diverging: { prop: "Color", source: "riskScore", type: "number", pal: "blue-orange", from: "fit", range: ["0", "98"], mid: "50", ds: "transactions" },
        // Everything's Size from Note count: 0 on an element with no note, 2 on Valjean (the notes fixture)
        size: { prop: "Size", source: "Note count", type: "number", from: "fit", range: ["0", "2"], out: ["1", "3"], ds: "lesmis" },
        // A measure row's binding whose stored name matches no attribute: graphty-element raises
        // E_UNKNOWN_ATTRIBUTE with the path instead of painting nothing (element-requirements-5.md)
        unknown: { prop: "Color", source: "pagerank", type: "number", pal: "ylorbr", from: "fit", range: null, ds: "lesmis",
            error: { what: "No node has an attribute \"pagerank\", so this binding paints nothing.", todo: "Pick another source. Names are case-sensitive; the closest is PageRank.", fix: "PageRank" } },
    };
    // The values of a field on the project on screen, for "Fit to data" (the element computes these;
    // read here from the fixture rows): the hosts' rows, or the researchers' records by stored path
    function rowsOf(ds) {
        const D = AB.fx.datasets[ds];
        return ds === "wide" ? D.nodeRows : ds === "nested" ? D.document.data.researchers : null;
    }
    function rangeOf(name) {
        const ds = AB.route && AB.route.frame.dataset, rows = rowsOf(ds);
        if (!rows) return null;
        const v = rows.map((r) => name.split(".").reduce((o, k) => (o == null ? o : o[k]), r)).filter((x) => typeof x === "number");
        if (!v.length) return null;
        return [Math.min(...v), Math.max(...v)];
    }
    // what Detach counts: the project's nodes, in its own noun
    const NOUN = { lesmis: "node", transactions: "account", wide: "host", nested: "researcher" };
    const detached = (ds) => { const n = (AB.projectCounts(ds) || {}).nodes; return n == null ? (rowsOf(ds) || []).length : n; };
    function boundFrom(prop, name, type) {
        const ds = (AB.route && AB.route.frame.dataset) || "lesmis";
        const num = type === "num";
        return { prop, source: name, type: num ? "number" : "category", pal: num ? "ylorbr" : "okabe-ito", from: "fit", range: num ? rangeOf(name) : null, out: ["0.5", "3"], ds };
    }
    // A pick in a loaded project (wide, nested, plain JSON) is a binding the panels then show: on is
    // "row" (a measure row's own line) or the inspector route whose line the bind icon was on
    // (AB.paintBy). Only Color and Size are modeled; other properties stay a picture.
    function commitTo(prop, on) {
        const ds = AB.route && AB.route.frame.dataset;
        if (!["wide", "nested", "plainJson"].includes(ds) || !/^(Color|Size)$/.test(prop)) return null;
        return (name) => { if (AB.paintBy(ds, prop, name, on)) AB.repaint = true; };
    }
    // binding(el, preset or spec, { anchor, open, commit }): open = true opens Source's field list at once
    function binding(el, spec, o) {
        o = o || {};
        const B = typeof spec === "string" ? BINDINGS[spec] : spec;
        const isColor = B.prop === "Color";
        const srcText = h("span", { class: "sp-ml", style: "min-width:0" });
        const drawSrc = (name, type) => srcText.replaceChildren(...(name ? [AB.typeGlyph(type === "number" || type === "num" ? "num" : "cat"), wrapName(name)] : [h("span", { class: "sp-eff" }, "Pick an attribute")]));
        drawSrc(B.source, B.type);
        const titleOf = (name) => (name ? [B.prop + " by ", wrapName(name)] : [B.prop + " by attribute"]);
        let pop1 = null;
        // A pick on a binding with no source, or with an error, draws the whole popover for the field
        // picked; otherwise Source changes in place and the rest stays
        const repick = (name, type) => {
            // In a loaded project the pick is made at once: the line stays bound when the popover closes
            if (o.commit) o.commit(name, type);
            if (!B.source || B.error) {
                const anchor = o.anchor;
                pop1.remove();
                binding(el, boundFrom(B.prop, name, type), { anchor, commit: o.commit });
                el.querySelectorAll(":scope > .k-popover").forEach((p) => p.classList.add("sp-pop"));
                requestAnimationFrame(() => { const f = el.querySelector(".k-popover [data-autofocus]"); if (f) f.focus(); });
            } else {
                drawSrc(name, type);
                const head = pop1.querySelector(".k-popover-head .k-grow");
                if (head) head.replaceChildren(...titleOf(name));
            }
            AB.announce(B.prop + " from " + name);
        };
        let current = B.source;
        const src = wrapField(AB.field(srcText, { caret: true, onClick: () => AB.openFieldList(src, { kind: isColor ? "color" : "number", element: "node", current, label: B.prop + " from", onPick: (n, t) => { current = n; repick(n, t); } }) }));
        src.setAttribute("aria-label", "Source" + (B.source ? ": " + B.source : ", none picked"));
        src.setAttribute("aria-haspopup", "listbox");
        src.setAttribute("data-autofocus", "");
        let body;
        if (!B.source) {
            // Nothing bound yet: Source is the one field; the rest follows the pick
            body = [row("Source", src)];
        } else {
            let palRow = null;
            if (isColor) {
                let palId = B.pal, reversed = false;
                const strip = h("span", { class: "sp-strip", style: "width:40px", "aria-hidden": "true" });
                const palName = h("span", { class: "sp-wrap" });
                const drawPal = () => { const p = pal(palId), c = reversed ? p.colors.slice().reverse() : p.colors; strip.replaceChildren(...c.map((x) => h("span", { style: "background:" + x }))); palName.textContent = p.name + (reversed ? ", reversed" : ""); };
                drawPal();
                const palField = wrapField(AB.field(h("span", { class: "sp-ml", style: "min-width:0" }, strip, palName), { caret: true, onClick: () => { palFor = { kind: B.type === "number" ? "number" : "category", id: palId }; AB.go("style-pickers", "palette"); } }));
                palField.setAttribute("aria-label", "Palette");
                const rev = AB.iconButton("arrow-left-right", "Reverse the palette", { onClick: () => { reversed = !reversed; rev.setAttribute("aria-pressed", String(reversed)); drawPal(); AB.announce(reversed ? "Palette reversed" : "Palette in order"); } });
                rev.setAttribute("aria-pressed", "false");
                palRow = row("Palette", palField, rev);
            } else {
                // a size binding maps the values onto a size range instead of a palette
                palRow = row("Sizes", h("span", { class: "sp-pair" }, input({ label: "Smallest size", num: true, value: B.out[0] }), "to", input({ label: "Largest size", num: true, value: B.out[1] }), "px"));
            }
            const num = B.type === "number";
            // the one number formatter, so the range reads as the legend does ("0.00330 to 0.0754")
            const R = B.range ? B.range.map((x) => AB.num(x)) : ["", ""];
            const typed = h("span", { class: "sp-pair" }, input({ label: "From", num: true, value: R[0] }), "to", input({ label: "To", num: true, value: R[1] }));
            const typedRow = row("Range", typed);
            const fitText = B.range ? R[0] + " to " + R[1] : "No values to fit";
            const fitted = row("Range", h("span", { class: "sp-eff", "data-tip": B.range ? fitText + ", the lowest and highest value" : "The source reads no values" }, fitText));
            typedRow.hidden = true;
            let noValue = null;
            if (isColor) {
                noValue = AB.field(h("span", { class: "sp-eff" }, "Nothing"), { go: ["style-pickers", "color"] });
                AB.tip(noValue, "Nothing, the default: rows beneath show through", { label: false });
                noValue.setAttribute("aria-label", "No value: Nothing");
            }
            const err = B.error ? AB.problem({ what: B.error.what, todo: B.error.todo, action: { label: "Use " + B.error.fix, onClick: () => repick(B.error.fix, "num") } }) : null;
            if (err) err.style.margin = "0 16px 8px";
            body = [
                row("Source", src),
                err,
                row("Scale", dropdown("Scale", num ? "linear" : "ordinal", Object.fromEntries(SCALES_FOR[B.type].map((k) => [k, SCALES[k]])), { unset: true, src: DEF + " for a " + (num ? "number" : "category") })),
                palRow,
                // a category maps each value to its own color: no range to fit
                num ? row("Values from", segLive([["fit", "Fit to data"], ["pct", "Percentiles"], ["typed", "Typed"]], B.from, (v) => { typedRow.hidden = v !== "typed"; fitted.hidden = v === "typed"; fitted.querySelector(".sp-eff").textContent = v === "pct" ? "5th to 95th percentile" : fitText; }, "Values from")) : null,
                num ? fitted : null, num ? typedRow : null,
                num ? row("Clamp", check("Clamp values outside the range", true)) : null,
                // a size never goes negative: a signed source sizes by absolute value, and the
                // smallest value still draws a mark of at least the minimum size, on screen and in print
                num && !isColor ? row("Below 0", AB.tip(h("span", { class: "sp-eff", tabindex: "0" }, "Sized by absolute value"), "-2 and 2 draw the same size", { label: false })) : null,
                num && !isColor ? row("Smallest mark", h("span", { class: "sp-pair" }, input({ label: "Smallest mark on screen, px", num: true, eff: "2 px", src: "graphty-element's minimum on screen" }), "print", input({ label: "Smallest mark in print, pt", num: true, eff: "1 pt", src: "graphty-element's minimum in print" })), AB.needsElement("graphty-element keeps a minimum mark size on screen and in print, so the smallest value never renders invisibly")) : null,
                B.mid ? row("Midpoint", input({ label: "Midpoint", num: true, value: B.mid, eff: "0" })) : null,
                // a signed column (a fold change) needs nothing special: ordinary Color by diverges at 0
                B.mid ? h("div", { class: "k-secondary", style: "padding:0 16px 8px;font-size:11px" }, "A column with values below and above 0 centers on 0 by itself. " + B.source + " has none below 0, so its midpoint is set here.") : null,
                // Note count is 0 on an element with no note, so a count binding never meets "no value"
                noValue ? row("No value", noValue) : null,
                h("div", { class: "sp-detach" }, AB.button("Detach", { kind: "secondary", icon: "unlink", block: true, disabled: B.error ? "Nothing is painted to keep" : null, tip: "Keep the current " + (isColor ? "colors" : "sizes") + " as fixed values", onClick: () => { const said = "Detached: " + AB.count(detached(B.ds), NOUN[B.ds] || "node") + " keep their " + (isColor ? "colors" : "sizes"); AB.close(); setTimeout(() => AB.notice(said, { label: "Undo", onClick: () => AB.announce("Binding restored") }), 0); } })),
            ];
        }
        if (!isColor && B.source && !o.anchor) {
            // Everything's Size line, as the panel draws it once bound: the type glyph and the field
            const sv = document.querySelector(lineAt("node.size"));
            if (sv && !sv.closest(".ab-sline").hasAttribute("data-bound")) { sv.replaceChildren(AB.typeGlyph("num"), h("span", { class: "k-grow k-ellipsis" }, B.source)); sv.classList.add("ab-bound"); sv.closest(".ab-sline").setAttribute("data-bound", ""); }
        }
        o.anchor = o.anchor || (isColor ? find("#ab-right .ab-bound", "#ab-right .ab-sline") : find(lineAt("node.size"), headSel("Shape")));
        pop1 = pop(o.anchor, B.prop + " from " + (B.source || "data"), body, { width: 340 });
        const head = pop1.querySelector(".k-popover-head .k-grow");
        if (head) head.replaceChildren(...titleOf(B.source));
        el.append(pop1);
        // the list opens on arrival (a route showing the picker); o.query is the find's starting text
        if (o.open) requestAnimationFrame(() => requestAnimationFrame(() => {
            AB.openFieldList(src, { kind: isColor ? "color" : "number", element: "node", current, label: B.prop + " from", query: o.query, onPick: (n, t) => { current = n; repick(n, t); } });
            // o.reveal scrolls a row into view by the start of its name (the disabled rows at a list's end)
            // a closed folder (Not usable here) is opened, so its disabled rows and their reasons show
            const rowOf = () => [...document.querySelectorAll("#ab-overlay .ab-fl [data-fl-row]")].find((x) => (x.getAttribute("aria-label") || "").startsWith(o.reveal));
            if (o.reveal) requestAnimationFrame(() => {
                const r = rowOf();
                if (r && r.matches(".ab-fl-folder[data-open=false]")) r.click();
                requestAnimationFrame(() => { const r2 = rowOf(); if (r2) r2.scrollIntoView({ block: "start" }); });
            });
            if (o.query) requestAnimationFrame(() => { const c = document.querySelector("#ab-overlay .ab-fl-count"); AB.announce(c && c.textContent ? c.textContent : "No match for \"" + o.query + "\""); });
        }));
        return pop1;
    }

    // ---------- Palette: one picker, pre-filtered by the binding's type ----------
    // what the Palette field it was opened from binds: a number (sequential, diverging) or a category
    // (kept until the route leaves the palette, so Esc returns to the inspector it was opened from).
    // A direct visit is the groups' palette: Louvain's Fill, Eight distinct.
    let palFor = null;
    function palettePicker(el, kind) {
        const f = palFor || { kind: kind || "category", id: kind === "number" ? "ylorbr" : "okabe-ito" };
        let cur = f.id;
        const list = h("div", { role: "listbox", "aria-label": "Palettes" });
        const draw = () => {
            list.replaceChildren();
            (f.kind === "category" ? ["categorical"] : ["sequential", "diverging"]).forEach((k) => {
                list.append(h("div", { class: "sp-head" }, { categorical: "Categories", sequential: "Sequential", diverging: "Diverging" }[k]));
                PALETTES.filter((p) => p.kind === k && !/highlight/.test(p.id)).forEach((p) => {
                    // the strip is drawn, so its colors are spoken: every swatch's name, in order
                    const it = h("div", { class: "sp-item", role: "option", tabindex: p.id === cur ? "0" : "-1", "aria-selected": String(p.id === cur), "aria-description": p.colors.map(colorName).join(", ") },
                        h("span", { class: "sp-ck" }, p.id === cur ? icon("check", "sm") : null),
                        h("span", { class: "sp-strip", "aria-hidden": "true" }, p.colors.map((c) => h("span", { style: "background:" + c }))),
                        h("span", { class: "k-grow k-ellipsis" }, p.name),
                        p.safe ? null : AB.tip(h("span", { class: "sp-mark", tabindex: "-1" }, icon("triangle-alert", "sm")), "Not color-blind safe"));
                    const pick = () => { cur = p.id; draw(); list.querySelector("[aria-selected=true]").focus(); AB.announce("Palette: " + p.name); };
                    it.addEventListener("click", pick);
                    it.addEventListener("keydown", (e) => {
                        const all = [...list.querySelectorAll(".sp-item")], i = all.indexOf(it);
                        const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 }[e.key];
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
                        else if (to != null && all[to]) { e.preventDefault(); all[to].focus(); }
                    });
                    list.append(it);
                });
            });
        };
        draw();
        // The pair check on the palette picked (graphty-element's check). On the palette the groups use,
        // it is the Color picker's one too-close flag over every pair the graph shows, with Fix...
        const ds = AB.route && AB.route.frame.dataset;
        const inUse = () => f.kind === "category" && cur === f.id && (!ds || ds === "lesmis");
        const verdict = h("div", { role: "status", style: "padding-top:8px" });
        const line = (t) => h("div", { class: "k-secondary", style: "padding:0 16px;font-size:11px" }, t);
        const except = (c, group) => AB.notice(cap1(group) + " now uses " + colorName(c) + ", an exception to " + pal(cur).name, { label: "Undo", onClick: () => AB.announce(cap1(group) + " back to " + pal(cur).name) });
        const say = () => {
            const p = pal(cur), hit = closePairs(p.colors)[0], flag = inUse() ? tooClose(Object.values(L().groupColors), except) : null;
            verdict.replaceChildren(flag || line(hit ? closeText(hit) : p.safe ? "Every pair of colors in " + p.name + " can be told apart, also with red-green or blue-yellow color blindness." : "Some colors in " + p.name + " are too close for red-green color blindness."));
        };
        list.addEventListener("click", say);
        list.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && say());
        say();
        const foot = [AB.button("Custom palette", { kind: "secondary", icon: "plus", go: ["style-pickers", "palette-custom"] })];
        el.append(pop(find("#ab-right .ab-bound", "#ab-right .ab-sline"), "Palette", [list, verdict], { foot, width: 300 }));
    }
    function customPalette(el) {
        const src = pal("ylorbr");
        const name = input({ label: "Palette name", value: "Orange to brown 2" });
        setTimeout(() => name.select(), 60);
        const stops = swatches(src.colors, () => AB.go("style-pickers", "color"));
        const body = [
            row("Name", name),
            row("Kind", segLive([["categorical", "Categories"], ["sequential", "Sequential"], ["diverging", "Diverging"]], "sequential", () => {}, "Kind")),
            row("Starts from", AB.field(src.name, { caret: true, onClick: () => { palFor = { kind: "number", id: src.id }; AB.go("style-pickers", "palette"); } })),
            h("div", { class: "k-section-head", style: "padding:0 16px" }, h("span", { class: "ab-sec-h" }, "Colors, in order"), h("span", { class: "k-grow" }), AB.plus({ label: "Add a color", items: ["Color"], onAdd: () => stops.append(Object.assign(AB.chit(src.colors[src.colors.length - 1]), { tabIndex: 0 })) })),
            stops,
        ];
        const foot = [AB.button("Add palette", { onClick: () => { palFor = { kind: "number", id: src.id }; AB.go("style-pickers", "palette"); setTimeout(() => AB.flash("Added Orange to brown 2, saved with this style"), 0); } })];
        el.append(pop(find("#ab-right .ab-bound", "#ab-right .ab-sline"), "Custom palette", body, { foot, width: 340 }));
    }

    // ---------- Color: Custom | Libraries ----------
    // the hue the square shows, from the current hex
    const hueOf = (hex) => {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
        const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
        if (!d) return 0;
        const x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return Math.round((x * 60 + 360) % 360);
    };
    // The too-close check over every pair of colors in the row, the default palette's own included:
    // graphty-element's behavior (a stand-in table here). It names the pair and the color vision it
    // models, and, once the palette has no unused color left, suggests colors clear of every neighbor.
    // The table is the element's verdict per pair (a stand-in); closePairs walks every pair against it.
    const CLOSE = [["#E69F00", "#D55E00", "red-green color blindness (deuteranopia)"], ["#E69F00", "#F0E442", "red-green color blindness (deuteranopia)"]];
    const CLEAR = ["#332288", "#882255"]; // from Nine soft, clear of every color in the graph
    const UP = (c) => c.toUpperCase();
    function closePairs(colors) {
        const cs = [...new Set(colors.map(UP))], out = [];
        cs.forEach((a, i) => cs.slice(i + 1).forEach((b) => { const t = CLOSE.find(([x, y]) => (x === a && y === b) || (x === b && y === a)); if (t) out.push([a, b, t[2]]); }));
        return out;
    }
    const closeText = (hit) => cap1(colorName(hit[0])) + " and " + colorName(hit[1]) + " are too close for " + hit[2] + ".";
    function tooClose(colors, setColor) {
        const has = (c) => colors.some((x) => UP(x) === c);
        const hits = closePairs(colors), hit = hits[0];
        if (!hit) return null;
        const fx = L().groupColors, groupOf = (c) => Object.keys(fx).filter((k) => UP(fx[k]) === c).map((k) => "group " + k).join(" and ");
        const what = closeText(hit);
        // the palette's unused colors first, each only if it clears every neighbor; once none does, colors from another palette
        const left = pal("okabe-ito").colors.filter((c) => !has(c));
        const clashOf = (c) => closePairs(colors.concat(c)).find((p) => p.includes(c) && p[0] !== hit[1] && p[1] !== hit[1]);
        const clear = left.filter((c) => !clashOf(c));
        const fix = { label: "Fix...", onClick: (e) => AB.openMenu(e.currentTarget, [
            ...left.map((c) => { const k = clashOf(c); return { label: "Use " + colorName(c) + " for " + groupOf(hit[1]), desc: "Unused in " + pal("okabe-ito").name, disabled: k ? cap1(colorName(c)) + " is too close to " + colorName(k[0] === c ? k[1] : k[0]) + " for " + k[2] : null, onClick: () => setColor(c, groupOf(hit[1])) }; }),
            ...(clear.length ? [] : [{ heading: pal("okabe-ito").name + " has run out: clear of every neighbor" },
                ...CLEAR.map((c) => ({ label: "Use " + colorName(c) + " for " + groupOf(hit[1]), desc: c + ", from " + pal("tol-muted").name, onClick: () => setColor(c, groupOf(hit[1])) }))]),
        ]) };
        const more = hits.length > 1 ? " " + AB.count(hits.length - 1, "more pair") + " too close." : "";
        const p = AB.problem({ what, todo: cap1(groupOf(hit[0])) + " and " + groupOf(hit[1]) + " use them." + more, action: fix, level: "partial" });
        p.style.margin = "0 16px 8px";
        requestAnimationFrame(() => AB.announce(what));
        return h("div", null, p, h("div", { class: "ab-cap ab-style-note ab-review-only k-secondary", style: "padding:0 16px 8px" }, "The check:", AB.needsElement("graphty-element checks every pair of colors in the row, its default palette's included, names the pair and the color vision it models, and suggests colors that clear every neighbor when the palette runs out.")));
    }
    function colorBody(o) {
        const fx = L().groupColors;
        const used = [...new Set(Object.values(fx))], unused = pal("okabe-ito").colors.filter((c) => !used.some((u) => u.toUpperCase() === c));
        o.hue = hueOf(o.hex || "#D55E00");
        const v = colorValue({ name: o.name || "Color", hex: o.hex, pct: o.pct, onChange: o.onChange, focus: true });
        const custom = () => [
            h("div", { class: "sp-sv", style: "background:linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,transparent),hsl(" + (o.hue || 36) + ",100%,50%)", role: "img", "aria-label": "Saturation and brightness" }, h("i", { style: "left:100%;top:10%" })),
            h("div", { class: "sp-hue", role: "slider", tabindex: "0", "aria-label": "Hue", "aria-valuenow": String(o.hue || 36), "aria-valuemin": "0", "aria-valuemax": "360",
                on: { click: (e) => { const r = e.currentTarget.getBoundingClientRect(), hue = Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 360); e.currentTarget.setAttribute("aria-valuenow", String(hue)); e.currentTarget.firstChild.style.left = hue / 3.6 + "%"; AB.announce("Hue " + hue); } } },
                h("i", { style: "left:" + ((o.hue || 36) / 3.6) + "%" })),
            row("Hex", v.el),
            // A group's colors: the palette's unused colors first, then the ones the graph already uses
            unused.length ? h("div", { class: "sp-head" }, "Unused in " + pal("okabe-ito").name) : null,
            unused.length ? swatches(unused, v.set) : null,
            h("div", { class: "sp-head" }, "In this graph"),
            swatches(used, v.set),
            o.check ? tooClose(used, v.set) : null,
        ];
        // Libraries: the colors of recipes and style files, then the palettes; pick one color.
        // Read from the fixtures: the transfers' recipe and the protein network's style file.
        const D = AB.fx.datasets;
        const files = [["Mule ring triage", "recipe", D.transactionsApril.communityColors], [D.ppi.title.replace(/ \(.*/, "") + ".style", "style file", D.ppi.moduleColors]];
        const libs = () => [row("Hex", v.el), h("div", { class: "sp-head" }, "Recipes and style files")]
            .concat(...files.map(([n, kind, cols]) => [h("div", { class: "sp-head", style: "font-weight:400" }, n + ", " + kind), swatches([...new Set(Object.values(cols))], v.set)]),
                h("div", { class: "sp-head" }, "Palettes"),
                ...PALETTES.filter((p) => !/highlight/.test(p.id)).map((p) => [h("div", { class: "sp-head", style: "font-weight:400" }, p.name), swatches(p.colors, v.set)]));
        const box = h("div");
        const show = (t) => box.replaceChildren(...(t === "Libraries" ? libs() : custom()).filter(Boolean));
        show(o.tab || "Custom");
        return [h("div", { class: "sp-tabs" }, AB.tabs(["Custom", "Libraries"], o.tab || "Custom", show)), box];
    }
    function colorPicker(el, tab) {
        const ln = takeOpener().line;
        if (ln === "node.glow") return glowPicker(el);
        const ch = ln && /color|outline/i.test(ln) ? ln : "node.color";
        const name = (AB.CHANNELS.node.concat(AB.CHANNELS.edge).find((c) => c.id === ch) || { name: "Color" }).name;
        // the value the line shows: its hex and percent
        const sv = document.querySelector(lineAt(ch)) || document.querySelector(lineAt("node.color"));
        const hex = ((sv && sv.textContent) || "").match(/[0-9A-F]{6}/i) || ["D55E00"];
        const pctEl = sv && sv.querySelector(".k-secondary");
        const pct = pctEl ? pctEl.textContent.replace("%", "") : null;
        el.append(pop(find(lineAt(ch), lineAt("node.color")), name, colorBody({ hex: "#" + hex[0], pct: pct === "100" ? null : pct, tab, hue: 21, check: true })));
    }

    // ---------- Glow: color and strength ----------
    function glowPicker(el) {
        const strength = input({ label: "Glow strength", num: true, value: "1" });
        el.append(pop(find(lineAt("node.glow"), headSel("Effects")), "Glow", [
            row("Color", AB.colorField({ name: "Glow color", hex: "#FFD700" })),
            row(AB.scrub(h("span", null, "Strength"), strength), strength),
        ]));
    }

    // ---------- Shape: three columns with names, a filter, closes on pick ----------
    function shapePicker(el, current, title) {
        const grid = glyphGrid("Shape", chChoices("node.shape"), current || "icosphere", shapeGlyph, (c) => { AB.close(); AB.announce("Shape: " + AB.plain("shape", c)); }, "shape");
        const q = input({ label: "Find a shape" });
        q.setAttribute("placeholder", "Find a shape");
        q.setAttribute("data-autofocus", "");
        q.addEventListener("input", () => grid.filter(q.value.trim().toLowerCase()));
        q.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { e.preventDefault(); const f = grid.querySelector(".sp-cell"); if (f) f.focus(); } });
        el.append(pop(find(lineAt("node.shape"), headSel("Shape")), title || "Shape", [title ? h("div", { class: "sp-scope" }, "Writes to Overrides") : null, h("div", { class: "sp-filter" }, icon("search", "sm"), q), grid], { width: 320 }));
    }

    // ---------- Pattern: nine glyphs; Count only where the pattern uses it ----------
    function patternPicker(el) {
        const NO_COUNT = ["solid", "zigzag", "sinewave"];
        const count = row("Count", input({ label: "Pattern count", num: true, eff: "Spaced to fit", src: "the edge's length decides (graphty-element sets no default; 2 or more)" }));
        const grid = glyphGrid("Pattern", chChoices("edge.style"), "dash", lineGlyph, (c) => { count.hidden = NO_COUNT.includes(c); }, "pattern");
        el.append(pop(find(lineAt("edge.style"), lineAt("edge.color"), headSel("Line")), "Pattern", [grid, count]));
    }

    // ---------- Arrow head (or tail): type, size, color with opacity, caption ----------
    function arrowPicker(el) {
        const tail = takeOpener().line === "edge.arrowTail";
        const end = tail ? "Tail" : "Head";
        const lineColor = "#D55E00"; // this row's Line color (the path row paints its edges #D55E00)
        const size = input({ label: end + " size", num: true, value: "1" });
        // The caption is a label: its value opens the one Label popover, like the Style tab's Label line
        const cap = AB.field(h("span", { class: "sp-eff" }, "None"), { go: ["style-pickers", "label-style"] });
        cap.setAttribute("aria-label", end + " caption: none");
        cap.setAttribute("aria-haspopup", "dialog");
        el.append(pop(find(lineAt("edge.arrow" + end), headSel("Arrows")), "Arrow " + end.toLowerCase(), [
            glyphGrid("Arrow type", chChoices("edge.arrowHead"), tail ? "dot" : "normal", arrowGlyph, () => {}, "arrow"),
            row(AB.scrub(h("span", null, "Size"), size), size),
            row("Color", AB.colorField({ name: end + " color", eff: lineColor, pct: 100 })),
            row("Caption", cap),
        ], { width: 300 }));
    }

    // ---------- Label style: preview, the fields this row sets, "+" for the rest ----------
    // [key, kind, plain name, effective value]. Kinds and plain names are the app's (the element
    // publishes names only); effective values from RichTextLabel's defaults where it has one.
    const GROUPS = [
        ["Placement", [["attachOffset", "number", "Offset", "0"], ["depthFade", "bool", "Depth fade", false], ["depthFadeNear", "number", "Fade starts"], ["depthFadeFar", "number", "Fade ends"]]],
        ["Text", [["font", "text", "Font", "Verdana"], ["sizePx", "number", "Size", "48"], ["weight", ["300", "normal", "500", "bold"], "Weight", "normal"], ["color", "color", "Color", "#000000"], ["lineHeight", "number", "Line height", "1.2"], ["textAlign", ["left", "center", "right"], "Alignment", "center"]]],
        ["Outline and shadow", [["outline", "color", "Outline"], ["outlineWidth", "number", "Outline width"], ["shadow", "bool", "Shadow", false], ["shadowColor", "color", "Shadow color"], ["shadowBlur", "number", "Shadow blur"], ["shadowOffsetX", "number", "Shadow x"], ["shadowOffsetY", "number", "Shadow y"]]],
        ["Panel", [["background", "color", "Background"], ["padding", "number", "Padding"], ["cornerRadius", "number", "Corner radius"], ["borderWidth", "number", "Border width"], ["borderColor", "color", "Border color"], ["gradient", "bool", "Gradient", false], ["gradientType", ["linear", "radial"], "Gradient type", "linear"], ["gradientDirection", ["vertical", "horizontal", "diagonal"], "Direction"], ["marginTop", "number", "Margin top"], ["marginBottom", "number", "Margin bottom"], ["marginLeft", "number", "Margin left"], ["marginRight", "number", "Margin right"]]],
        ["Pointer", [["pointer", "bool", "Pointer", false], ["pointerDirection", ["auto", "top", "bottom", "left", "right"], "Direction", "auto"], ["pointerWidth", "number", "Width"], ["pointerHeight", "number", "Height"], ["pointerOffset", "number", "Offset"], ["pointerCurve", "bool", "Curved", false]]],
        ["Effects", [["animation", ["none", "pulse", "bounce", "shake", "glow", "fill"], "Animation", "none"], ["animationSpeed", "number", "Speed"]]],
        ["Badge", [["badge", ["notification", "label", "label-success", "label-warning", "label-danger", "count", "icon", "progress", "dot"], "Badge"], ["icon", "text", "Icon"], ["iconPosition", ["left", "right"], "Icon side", "left"], ["progress", "number", "Progress, 0 to 1"]]],
    ];
    function lsControl(f, value, onChange) {
        const [key, kind, name, eff] = f;
        const effText = eff == null ? "Not set" : String(eff);
        if (kind === "bool") return check(name, value == null ? eff : value, onChange);
        if (kind === "number" || kind === "text") return input({ label: name, num: kind === "number", value, eff: effText, onInput: onChange });
        if (kind === "color") return AB.colorField({ name, hex: value, eff: eff || null, pct: value ? 100 : null });
        return dropdown(name, value || eff || "", Object.fromEntries(kind.map((k) => [k, key === "weight" ? AB.plain("weight", k) : AB.plain("", k)])), { unset: value == null, onChange });
    }

    // ---------- this row's label lines (Group 2's label-two inspector: Above label, Below Note count) ----------
    // label-position adds Right: degree through the panel's real "+" and From data list, so the
    // panel and the popover show the same lines.
    // Valjean's values: degree 36 (fixtures), 2 notes and his latest note (the notes fixture).
    const SAMPLE = { label: "Valjean", group: "2", degree: "36", betweenness: "0.57", PageRank: "0.0754", "Note count": "2",
        "Latest note": "Highest betweenness in the book, 0.57. Next is Myriel at 0.177." };
    // the value the preview shows: Valjean's, or the first host's on the hosts project
    const sampleOf = (field) => {
        const ds = AB.route && AB.route.frame.dataset, rows = ds === "wide" || ds === "nested" ? rowsOf(ds) : null;
        const v = rows ? field.split(".").reduce((o, k) => (o == null ? o : o[k]), rows[0]) : SAMPLE[field];
        return v == null ? field : String(v);
    };
    const posWord = (id) => (AB.CHANNELS.positions.find((p) => p[0] === id) || [id, id])[1];
    const posId = (word) => (AB.CHANNELS.positions.find((p) => p[1] === word) || [word])[0];
    const GRID = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"];
    // Press the Label "+" and pick a field, once per line, then optionally leave one more draft open
    // While Show is offered the Label "+" is a two-item menu first; its "Add label line" opens the attribute list, empty.
    function pressLabelPlus(then) {
        const hd = headOf("Label"), plus = hd && hd.querySelector(".ab-plus");
        if (!plus) return then(false);
        plus.click();
        requestAnimationFrame(() => {
            const line = [...document.querySelectorAll("#ab-overlay .ab-menu .k-menu-item")].find((x) => /^(Add )?label line$/i.test(x.textContent.trim()));
            if (line) line.click();
            requestAnimationFrame(() => then(true));
        });
    }
    // a field list row by its stored name (its accessible name starts with it)
    const rowNamed = (name) => [...document.querySelectorAll("#ab-overlay .ab-fl [data-fl-row]")].find((x) => (x.getAttribute("aria-label") || "").split(",")[0] === name);
    function addLines(fields, thenDraft, done) {
        const step = (i) => {
            if (i >= fields.length) {
                if (thenDraft) pressLabelPlus(() => leaveWithMenu());
                return done && done();
            }
            pressLabelPlus((ok) => {
                if (!ok) return done && done();
                const item = rowNamed(fields[i]);
                if (item) item.click(); else AB.closeMenu();
                requestAnimationFrame(() => step(i + 1));
            });
        };
        requestAnimationFrame(() => step(0));
    }

    // ---------- the one Label popover ----------
    // Text and Position on top; the preview draws every line of this row (the edited one at full
    // strength, the others faded); then the style fields with their "+".
    // The Style tab's label line, its bind icon and an arrow end's Caption all open it.
    function labelStyle(el, o) {
        o = o || {};
        // The lines of the row it was opened from, editing the line clicked; a direct link shows Group 2's two lines
        const from = !o.right && !o.lines && labelOpener && labelOpener.lines.length ? labelOpener : null;
        const lines = o.lines ? o.lines.map((l) => Object.assign({}, l)) : from ? from.lines.map((l) => Object.assign({}, l)) : [{ pos: "top", field: "label", type: "cat" }, { pos: "bottom", field: "degree", type: "num" }];
        if (o.right) lines.push({ pos: "right", field: "Note count", type: "num" });
        const ed = from ? lines.find((l) => l.pos === from.pos) || lines[0] : lines[o.right ? 2 : 0];
        const set = { sizePx: 24, background: "#FFFFFF" }; // what this row's label style sets
        // the preview: Valjean's node with every line of this row in place
        const cells = {};
        const preview = h("div", { class: "sp-preview sp-lprev", role: "img" }, GRID.map((g) => (cells[g] = h("span", { class: "sp-lcell" + (g === "center" ? " sp-lnode" : ""), "data-pos": g }))));
        const textOf = (l) => (l.type ? sampleOf(l.field) : l.text || "Text");
        const paint = () => {
            GRID.forEach((g) => cells[g].replaceChildren());
            lines.forEach((l) => {
                const b = h("b", { class: l === ed ? null : "sp-faded" }, textOf(l));
                if (l === ed) Object.assign(b.style, { background: set.background || "transparent", fontSize: Math.min(15, Math.max(9, (set.sizePx || 13) / 2)) + "px", fontWeight: set.weight === "bold" ? "700" : "", color: set.color || "#000000" });
                cells[l.pos].append(b);
            });
            preview.setAttribute("aria-label", "Preview: " + lines.map((l) => posWord(l.pos) + " " + textOf(l) + (l === ed ? " (editing)" : "")).join(", "));
        };
        // Position: the one home of a line's position. Used positions are aria-disabled, still focusable.
        const grid = h("span", { class: "sp-loc", role: "radiogroup", "aria-label": "Position" });
        const posName = h("span", { class: "k-secondary" });
        const drawGrid = () => {
            grid.replaceChildren();
            GRID.forEach((g) => {
                const by = lines.find((l) => l !== ed && l.pos === g);
                const c = h("span", { role: "radio", tabindex: g === ed.pos ? "0" : "-1", "aria-checked": String(g === ed.pos), "aria-disabled": by ? "true" : null, "data-pos": g });
                AB.tip(c, posWord(g), by ? { second: "Used by this row's " + posWord(by.pos) + " label" } : undefined);
                const pick = () => {
                    if (by || g === ed.pos) return;
                    const was = posWord(ed.pos);
                    // the panel's line keeps its place in the list and takes the new position word
                    const li = document.querySelector(`#ab-right .ab-sline[data-label="${was}"]`);
                    if (li) { li.dataset.label = posWord(g); const n = li.querySelector(".ab-sname"); if (n) n.textContent = posWord(g); }
                    ed.pos = g;
                    drawGrid(); paint();
                    grid.querySelector("[aria-checked=true]").focus();
                    AB.announce("Label moved from " + was + " to " + posWord(g));
                };
                c.addEventListener("click", pick);
                c.addEventListener("keydown", (e) => {
                    const all = [...grid.children], i = all.indexOf(c);
                    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + 3, ArrowUp: i - 3, Home: 0, End: 8 }[e.key];
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
                    else if (to != null && all[to]) { e.preventDefault(); all.forEach((x) => (x.tabIndex = -1)); all[to].tabIndex = 0; all[to].focus(); }
                });
                grid.append(c);
            });
            posName.textContent = posWord(ed.pos);
        };
        drawGrid();
        // Text: where the words come from. A field or result is a chip (type glyph and name), never typed text.
        const srcText = h("span", { class: "sp-ml", style: "min-width:0" });
        const drawSrc = () => { srcText.replaceChildren(...[ed.type ? AB.typeGlyph(ed.type) : null, ed.type ? wrapName(ed.field) : ed.text || ""].filter(Boolean)); paint(); };
        const srcField = wrapField(AB.field(srcText, { caret: true, onClick: () => openSrc() }));
        srcField.setAttribute("aria-label", "Text");
        srcField.setAttribute("aria-haspopup", "listbox");
        srcField.setAttribute("data-autofocus", "");
        // The one From data list (Typed text first), the same one the Label "+" opens
        const openSrc = () => AB.openFieldList(srcField, { kind: "text", typed: true, element: "node", current: ed.type ? ed.field : null, label: "Label text", onPick: (name, type) => {
            if (name === null) { Object.assign(ed, { type: null, field: null, text: "" }); drawSrc(); AB.flash("Type the label in the field (not wired in the skeleton)"); return; }
            Object.assign(ed, { field: name, type }); drawSrc(); AB.announce("Label, " + posWord(ed.pos) + ": " + name);
        } });
        // the style fields this row sets, "+" for the rest
        const fields = h("div");
        const all = GROUPS.flatMap(([, fs]) => fs);
        let sectionEl;
        const draw = (focusKey) => {
            const items = [];
            // each unset field says its effective value and where it comes from
            GROUPS.forEach(([g, fs]) => { const left = fs.filter((f) => !(f[0] in set)); if (left.length) items.push({ heading: g }, ...left.map((f) => ({ label: f[2], desc: (f[3] == null ? "Not set" : String(f[3])) + ", " + DEF, f }))); });
            const plus = AB.plus({ label: "Add to Style", items, onAdd: (it) => { set[it.f[0]] = it.f[3] == null || it.f[1] === "color" ? (it.f[1] === "color" ? "#FFFFFF" : null) : it.f[3]; draw(it.f[0]); paint(); } });
            fields.replaceChildren(...all.filter((f) => f[0] in set).map((f) => {
                const minus = AB.iconButton("minus", "Remove " + f[2], { onClick: () => { delete set[f[0]]; draw(); paint(); AB.notice("Removed " + f[2], { label: "Undo", onClick: () => { set[f[0]] = f[3]; draw(); } }); } });
                const r = row(f[2], h("span", { class: "sp-lsctl" }, lsControl(f, set[f[0]], (v) => { set[f[0]] = v; paint(); })), h("span", { class: "sp-minus" }, minus));
                r.classList.add("sp-lsrow");
                r.dataset.key = f[0];
                return r;
            }));
            if (!Object.keys(set).length) fields.append(AB.empty("Nothing set here. The label uses the default look."));
            const head = sectionEl.querySelector(".k-section-head");
            const old = head.querySelector(".ab-plus");
            if (old) old.replaceWith(plus); else head.append(plus);
            if (focusKey) requestAnimationFrame(() => { const f = fields.querySelector(`[data-key="${focusKey}"] :is(input, [tabindex='0'], .k-check)`); if (f) f.focus(); });
        };
        sectionEl = AB.section({ title: "Style", editable: true }, fields, h("div", { class: "ab-cap ab-style-note ab-review-only k-secondary" }, "Field list:", AB.needsElement("graphty-element publishes only the label-style field names; full descriptors (kind, choices, range, default, plain name) are filed. A maximum width and a same-size-at-any-distance option are not label fields yet.")));
        draw();
        drawSrc();
        // Which nodes carry the labels: the label layer's selector, every node or the top N by a value
        let topBy = "PageRank";
        const topN = input({ label: "How many", num: true, value: "10" });
        topN.style.cssText = "flex:0 0 44px;width:44px";
        const byField = wrapField(AB.field(h("span", { class: "sp-ml" }, AB.typeGlyph("num"), wrapName(topBy)), { caret: true, onClick: () => AB.openFieldList(byField, { kind: "number", element: "node", current: topBy, label: "Top by", onPick: (n) => { topBy = n; byField.querySelector(".sp-ml").replaceChildren(AB.typeGlyph("num"), wrapName(n)); AB.announce("Label the top " + topN.value + " by " + n); } }) }));
        byField.setAttribute("aria-label", "By");
        byField.setAttribute("aria-haspopup", "listbox");
        const topRow = row("Top", h("span", { class: "sp-pair" }, topN, "by", byField));
        topRow.hidden = !o.top;
        const which = row("Nodes", segLive([["all", "Every node"], ["top", "Top N by a value"]], o.top ? "top" : "all", (v) => { topRow.hidden = v !== "top"; AB.announce(v === "top" ? "Label the top " + topN.value + " by " + topBy : "Label every node"); }, "Which nodes are labeled"),
            AB.needsElement("A top-N selector: graphty-element's selectors match by value; ranking by a value is filed"));
        const p = pop(find(`#ab-right .ab-sline[data-label="${posWord(ed.pos)}"] .ab-sv`, lineAt("node.label"), headSel("Label")), "Label, " + posWord(ed.pos), [
            row("Text", srcField),
            which, topRow,
            row("Position", h("span", { style: "display:flex;gap:8px;align-items:center;padding:2px 0" }, grid, posName)),
            h("div", { class: "ab-cap ab-style-note ab-review-only k-secondary", style: "padding:0 16px 8px" }, "Several lines:", AB.needsElement("Labels keyed by position: graphty-element draws one label per node today, so a second line needs per-position label channels.")),
            preview, sectionEl], { width: 320 });
        el.append(p);
        if (o.openSource) requestAnimationFrame(() => requestAnimationFrame(openSrc));
        return p;
    }
    // A state that first adds lines to the panel, then opens the popover on the edited line
    function labelAfterLines(el, fields, o) {
        addLines(fields, false, () => requestAnimationFrame(() => {
            el.hidden = false; // closing the From data list hid the empty overlay layer
            labelStyle(el, o);
            el.querySelectorAll(":scope > .k-popover").forEach((x) => x.classList.add("sp-pop"));
            const f = el.querySelector(".k-popover [data-autofocus]");
            if (f) f.focus();
        }));
    }

    // ---------- a "Why this look" token: its property's own popover, written to Overrides ----------
    function tokenPopover(el) {
        const t = takeOpener().token || { prop: "Color", tip: "#662506, 0.0754, highest" };
        const anchor = find(`#ab-right .ab-token[aria-label="${t.prop} from PageRank"]`, "#ab-right .ab-token", "#ab-right .ab-why");
        const title = "Valjean only -- writes to Overrides";
        const toEdited = () => { if (AB.route) AB.route.closeTo = { id: "inspector-node", state: "edited" }; };
        if (t.prop === "Shape") return shapePicker(el, (t.tip.match(/^[a-z_-]+/) || ["icosphere"])[0], title);
        const hex = (t.tip.match(/#[0-9a-f]{6}/i) || [null])[0];
        let body;
        if (t.prop === "Color") body = colorBody({ name: "Color", hex: hex || "#662506", hue: 22, onChange: toEdited });
        else {
            const n = (t.tip.match(/^[\d.]+/) || [""])[0];
            body = [row(t.prop, input({ label: t.prop + " for Valjean", num: true, value: n, onInput: toEdited }), t.prop === "Opacity" ? "%" : null)];
        }
        el.append(pop(anchor, title, body, { width: 300 }));
    }

    // ---------- the pickers on wide and nested data ----------
    // The hosts (69 attributes): the measure row painting Size by the longest name. The researchers
    // (nested JSON): the 60-character set, whose Fill Color is a fixed color and whose Above label
    // reads the seven-segment path.
    const HOSTS = "inspector-measure-row/long-name", RESEARCHERS = "inspector-group-set-path-row/long-name";
    const VULN = "vuln_count_critical_unremediated_over_30_days";
    const LAST5 = "attributes.profile.metrics.citations.last_5_years";
    // what render() does for a popover drawn after the panel has changed
    function settle(el) {
        el.hidden = false; // closing a menu on the way hid the empty overlay layer
        el.querySelectorAll(":scope > .k-popover").forEach((x) => x.classList.add("sp-pop"));
        const f = el.querySelector(".k-popover [data-autofocus]");
        if (f) f.focus();
    }
    // Bind on a Color line: Binding with no source yet, its Source list open (Color by). On the hosts
    // row Fill's real "+" adds the Color line first (Fill has one property, so "+" adds it at once).
    function colorBy(el, o) {
        o = o || {};
        const commit = commitTo("Color", rightOf(stateNow()));
        const open = () => { el.hidden = false; binding(el, { prop: "Color", source: null, type: "number" }, { anchor: find(lineAt("node.color"), headSel("Fill")), open: true, query: o.query, reveal: o.reveal, commit }); settle(el); };
        requestAnimationFrame(() => {
            const b = o.add && headOf("Fill") && headOf("Fill").querySelector(".ab-plus");
            if (b) b.click();
            requestAnimationFrame(open);
        });
    }

    // ---------- states, frames and routes ----------
    const G2 = (s) => "inspector-group-set-path-row/" + s;
    const RIGHT = {
        "plus-menu": G2("style"), "plus-one-left": G2("style"), "label-show": G2("style"), glow: G2("style"), shape: G2("style"),
        bind: G2("label-two"), "label-style": G2("label-two"), "label-top": G2("label-two"), "label-new-line": G2("label-two"), "label-position": G2("label-two"),
        "bind-number": "inspector-selection-and-everything/everything", color: G2("fill-set"), "color-libraries": G2("fill-set"),
        pattern: G2("edges-side"), arrow: G2("arrows"),
        binding: "inspector-measure-row/style", "binding-diverging": "inspector-measure-row/risk-score", palette: "inspector-run-row/style", "palette-categories": "inspector-run-row/style", "palette-custom": "inspector-measure-row/style",
        "token-color": "inspector-node/why-this-look",
        "wide-no-match": HOSTS, "wide-size-by": HOSTS, "wide-color-by": HOSTS, "wide-search": HOSTS, "wide-bind": HOSTS, "wide-label": HOSTS,
        "nested-color-by": RESEARCHERS, "binding-long": RESEARCHERS, "binding-unknown-path": "inspector-measure-row/style",
        "painted-color": "inspector-measure-row/painted-color", "painted-size": "inspector-measure-row/painted-size",
    };
    // the project each state shows (the Les Miserables states name none)
    const DATASET = { "wide-no-match": "wide", "wide-size-by": "wide", "wide-color-by": "wide", "wide-search": "wide", "wide-bind": "wide", "wide-label": "wide", "nested-color-by": "nested", "binding-long": "nested" };
    // Old ids keep working: they render the state that replaced them
    const ALIAS = { "plus-menu-search": "plus-menu", choice: "shape", "token-edit": "token-color" };
    const stateOf = (s) => ALIAS[s] || s;
    const RENDER = {
        "plus-menu": () => pressPlus("Effects"),
        "plus-one-left": () => pressPlus("Tooltip", true),
        "label-show": () => pressPlus("Label"),
        bind: (el) => labelStyle(el, { openSource: true }),
        binding: (el) => binding(el, "color"),
        // bind on an unbound line: Binding for that property, Source alone with its field list open
        "bind-prop": (el) => {
            const B = bindOpener || { prop: "Color", ch: "node.color" };
            const commit = commitTo(B.prop, rightOf("bind-prop"));
            requestAnimationFrame(() => { el.hidden = false; binding(el, { prop: B.prop, source: null, type: "number" }, { anchor: find(lineAt(B.ch)), open: true, commit }); settle(el); });
        },
        "binding-diverging": (el) => binding(el, "diverging"),
        "bind-number": (el) => binding(el, "size"),
        // on Group 2's two lines (Above: label, Below: Note count) "+" adds a Right draft and opens the From data list on it
        "label-new-line": () => addLines([], true),
        "label-style": (el) => labelStyle(el),
        // the Nodes switch on Top: "Label the top 10 by PageRank", the label layer's selector
        "label-top": (el) => labelStyle(el, { top: true }),
        // "+" then Note count gives a Right line; its popover shows Above and Below used
        "label-position": (el) => labelAfterLines(el, ["Note count"], { right: true }),
        palette: (el) => palettePicker(el),
        // a category binding's Palette (Louvain's Fill): the categorical palettes; the default's own close pair is named
        "palette-categories": (el) => palettePicker(el, "category"),
        "palette-custom": customPalette,
        color: (el) => colorPicker(el, "Custom"),
        "color-libraries": (el) => colorPicker(el, "Libraries"),
        glow: glowPicker,
        shape: (el) => shapePicker(el),
        pattern: patternPicker,
        arrow: arrowPicker,
        "token-color": tokenPopover,
        "wide-color-by": (el) => colorBy(el, { add: true }),
        "wide-search": (el) => colorBy(el, { add: true, query: "cpu p95" }),
        "wide-no-match": (el) => colorBy(el, { add: true, query: "xyz" }),
        "nested-color-by": (el) => colorBy(el, { reveal: "Not usable here" }),
        // Size by on the hosts: the bound Size line's Binding, its Source list open at its top: the usable
        // numbers first (In use, then the rest), Not a number closed at the end
        "wide-size-by": (el) => binding(el, boundFrom("Size", VULN, "num"), { open: true }),
        // bind on a label line: the real "+" adds Above: hostname, then its Label popover opens its Text list
        "wide-bind": (el) => labelAfterLines(el, ["hostname"], { lines: [{ pos: "top", field: "hostname", type: "text" }], openSource: true }),
        // the Label "+" on the hosts row: Label line, then the field list (Typed text, the attributes, Notes)
        "wide-label": () => requestAnimationFrame(() => pressLabelPlus(() => leaveWithMenu())),
        "binding-unknown-path": (el) => binding(el, "unknown"),
        "binding-long": (el) => binding(el, boundFrom("Size", LAST5, "num"), { anchor: find(headSel("Shape")) }),
        // a Color by or Size by row's bound line: its Binding, Source the attribute; a new pick repaints the row
        "painted-color": (el) => paintedBinding(el, "Color"),
        "painted-size": (el) => paintedBinding(el, "Size"),
        // a line bound with its bind icon (Everything's Color): its Binding, over the inspector it is on
        bound: (el) => {
            const ch = (lastLine || "node.color"), prop = /color$/.test(ch) ? "Color" : "Size", on = rightOf("bound");
            const ds = AB.route && AB.route.frame.dataset, p = (AB.painted[ds] || []).find((x) => x.on === on && x.prop === prop);
            if (!p) return binding(el, { prop, source: null, type: "number" }, { anchor: find(lineAt(ch)), open: true, commit: commitTo(prop, on) });
            binding(el, boundFrom(prop, p.name, p.type), { anchor: find(lineAt(ch)), commit: commitTo(prop, on) });
        },
    };
    function paintedBinding(el, prop) {
        const ds = AB.route && AB.route.frame.dataset, p = (AB.painted[ds] || []).filter((x) => x.on === "row" && x.prop === prop).pop();
        if (!p) return binding(el, "color");
        const ch = p.element + "." + (prop === "Color" ? "color" : p.element === "edge" ? "width" : "size");
        binding(el, boundFrom(prop, p.name, p.type), { anchor: find(lineAt(ch)), commit: commitTo(prop, "row") });
    }
    // The Label popover keeps the inspector it was opened from (a label line knows it); else the state's fixture
    window.addEventListener("hashchange", () => { if (!/^#\/style-pickers\/(label-style|bind)$/.test(location.hash)) setTimeout(() => { if (!/^#\/style-pickers\/(label-style|bind)$/.test(location.hash)) labelOpener = null; }, 0); });
    window.addEventListener("hashchange", () => { if (!/^#\/style-pickers\/palette$/.test(location.hash)) palFor = null; });
    const rightOf = (s) => (s === "bind-prop" ? (bindOpener && bindOpener.right) || "inspector-selection-and-everything/everything"
        : s === "bound" ? (boundOpener || "inspector-selection-and-everything/everything")
        : s === "palette" && palFor && palFor.kind === "number" ? "inspector-measure-row/style"
        : (s === "label-style" || s === "bind") && labelOpener && labelOpener.right ? labelOpener.right : RIGHT[s] || RIGHT["plus-menu"]);
    const stateNow = () => stateOf(decodeURIComponent((location.hash.split("/")[2] || "plus-menu")));

    registerSection({
        id: "style-pickers",
        title: "Style pickers",
        region: "overlay",
        rail: "graph",
        frame: (state) => {
            const right = rightOf(stateOf(state));
            // bind-prop keeps the panels and the project it was opened from
            if (stateOf(state) === "bind-prop") return Object.assign({ left: "graph-place/at-rest", right }, bindOpener ? { left: bindOpener.left, canvas: bindOpener.canvas, dataset: bindOpener.dataset } : {});
            // a bound line and a painted row keep the panels they were opened over (the shell carries the project)
            // a direct visit, before any bind: the hosts' Everything with its Color bound to cpu_util_p95_pct
            if (stateOf(state) === "bound") {
                if (boundOpener) return { right };
                const EV = "inspector-selection-and-everything/everything";
                if (!(AB.painted.wide || []).some((x) => x.on === EV && x.prop === "Color")) AB.paintBy("wide", "Color", "cpu_util_p95_pct", EV);
                // and Size bound to a second field, so the line shows its range beside the Color line's palette
                if (!(AB.painted.wide || []).some((x) => x.on === EV && x.prop === "Size")) AB.paintBy("wide", "Size", "memory_util_p95_pct", EV);
                return { left: "graph-place/wide", right: EV, dataset: "wide" };
            }
            if (/^painted-/.test(stateOf(state))) {
                // a direct visit, before any Color by or Size by: the hosts painted by cpu_util_p95_pct
                const prop = /size$/.test(state) ? "Size" : "Color", ds0 = (AB.paintedLast || { ds: "wide" }).ds;
                if (!(AB.painted[ds0] || []).some((x) => x.on === "row" && x.prop === prop)) AB.paintBy("wide", prop, "cpu_util_p95_pct", "row");
                return { left: "graph-place/painted", right, dataset: AB.paintedLast.ds };
            }
            const ds = DATASET[stateOf(state)];
            // the hosts' and the researchers' pickers open on the row each project's tree holds
            const own = ds === "wide" ? { left: "graph-place/wide-sized", canvas: "canvas-and-states/hosts-legend" } : ds === "nested" ? { left: "graph-place/nested-set", canvas: "canvas-and-states/nested-set" } : {};
            return Object.assign({ left: /risk-score/.test(right) ? "data-place/attributes" : "graph-place/at-rest", right }, ds ? { dataset: ds } : {}, own);
        },
        // Esc and an outside click return to the inspector that opened the picker
        get closeTo() { return rightOf(stateNow()); },
        states: [
            { id: "plus-menu", label: "\"+\" menu (Effects)" },
            { id: "plus-one-left", label: "\"+\" with one left (Tooltip)" },
            { id: "label-show", label: "Label's \"+\" with Show" },
            { id: "label-new-line", label: "Label: a new Right line, From data open" },
            { id: "bind", label: "Label: its Text menu (fields, results, notes)" },
            { id: "binding", label: "Binding" },
            { id: "binding-diverging", label: "Binding, diverging" },
            { id: "bind-prop", label: "Binding for an unbound line (its bind icon), no source yet" },
            { id: "bind-number", label: "Binding: Size from Note count" },
            { id: "palette", label: "Palette (directly: Louvain's groups, with the too-close check; from a number's Binding: sequential and diverging)" },
            { id: "palette-categories", label: "Palette for a category (Louvain's groups)" },
            { id: "palette-custom", label: "Custom palette" },
            { id: "color", label: "Color" },
            { id: "color-libraries", label: "Color: Libraries" },
            { id: "glow", label: "Glow" },
            { id: "shape", label: "Shape" },
            { id: "pattern", label: "Pattern" },
            { id: "arrow", label: "Arrows: Head" },
            { id: "label-style", label: "Label (text, position and style)" },
            { id: "label-top", label: "Label: only the top 10 by PageRank" },
            { id: "label-position", label: "Label: position grid, Above and Below used" },
            { id: "token-color", label: "Token: Color on Valjean" },
            { id: "wide-color-by", label: "Color by on the hosts: Find, In use first, by table" },
            { id: "wide-size-by", label: "Size by on the hosts: numbers, then Not a number" },
            { id: "wide-search", label: "Color by on the hosts, \"cpu p95\" typed" },
            { id: "wide-no-match", label: "Color by on the hosts, \"xyz\" typed: no match" },
            { id: "wide-bind", label: "Label on the hosts: its Text list" },
            { id: "wide-label", label: "Label \"+\" on the hosts: the field list" },
            { id: "nested-color-by", label: "Color by on the researchers (nested JSON)" },
            { id: "binding-unknown-path", label: "Binding: a source that reads nothing" },
            { id: "binding-long", label: "Binding: Size from a seven-segment path" },
            { id: "painted-color", label: "Binding of a Color by row (directly: the hosts by cpu_util_p95_pct)" },
            { id: "painted-size", label: "Binding of a Size by row (directly: the hosts by cpu_util_p95_pct)" },
            { id: "bound", label: "Binding of a line bound with its bind icon (directly: the hosts' Everything, Color bound to cpu_util_p95_pct)" },
        ],
        render(el, state) {
            const s = stateOf(state);
            (RENDER[s] || RENDER["plus-menu"])(el);
            el.querySelectorAll(":scope > .k-popover").forEach((p) => p.classList.add("sp-pop"));
            // the popover's own first field takes focus (before the shell's generic first-focusable)
            requestAnimationFrame(() => { const f = el.querySelector(".k-popover [data-autofocus]"); if (f && f.isConnected) f.focus(); });
        },
    });
})();
