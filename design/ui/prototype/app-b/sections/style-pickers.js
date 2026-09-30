/* Style pickers: the popovers the shared Style tab (AB.styleTab) and "Why this look"
   (AB.whyThisLook) open. Each popover sits to the left of the inspector, level with the control
   that opened it, so the row it edits stays in view.

   Lists come from graphty-element (copied here as stand-ins, the real app reads them from the
   element): the 18 palettes of catalog/palettes.ts (plain names respelled "Colors"), the node
   shapes, arrow types and line patterns of AB.CHANNELS, the label-style field names of
   catalog/label-style.ts (LABEL_STYLE_FIELDS; names only, so the kinds and choices below are
   typed by the app), and the nine scales of session/styles/scales.ts. Plain ASCII. */
(function () {
    "use strict";
    const { h, icon } = AB;

    // ---------- this section's styles, injected once ----------
    if (!document.querySelector("style[data-sp]")) {
        document.head.append(h("style", { "data-sp": "" },
            ".sp-pop .k-popover-body{padding:0 0 8px}" +
            // A list of commands is a menu: the same dark surface as every menu (pickers stay light)
            ".sp-menu-surface{color-scheme:dark;background:#1e1e1e;color:#fff}" +
            ".sp-filter{display:flex;align-items:center;gap:8px;height:32px;padding:0 12px;border-bottom:1px solid var(--cm-border);color:var(--cm-icon-secondary)}" +
            ".sp-filter input{flex:1;min-width:0;border:0;background:none;font:inherit;color:var(--cm-text);outline:none}" +
            ".sp-head{padding:8px 16px 2px;color:var(--cm-text-secondary);font-size:11px;font-weight:550}" +
            ".sp-item{display:flex;align-items:center;gap:8px;min-height:28px;padding:2px 16px;cursor:default}" +
            ".sp-item:hover,.sp-item:focus-visible{background:var(--cm-bg-hover)}" +
            ".sp-item[aria-disabled=true]{color:var(--cm-text-tertiary)}" +
            ".sp-item[aria-selected=true]{background:var(--cm-bg-selected)}" +
            ".sp-item .sp-ck{width:12px;flex:none;color:var(--cm-text-brand)}" +
            ".sp-item .sp-sub{color:var(--cm-text-secondary);font-size:11px}" +
            ".sp-item .sp-desc{display:block;color:var(--cm-text-tertiary);font-size:11px;line-height:14px}" +
            ".sp-item svg.sp-g{flex:none;color:var(--cm-icon)}" +
            ".sp-strip{display:flex;width:72px;height:12px;border-radius:2px;overflow:hidden;flex:none;box-shadow:inset 0 0 0 1px var(--cm-border)}" +
            ".sp-strip>span{flex:1}" +
            ".sp-mark{display:inline-flex;align-items:center;gap:2px;font-size:11px;color:var(--cm-text-secondary);white-space:nowrap}" +
            ".sp-warn{color:var(--cm-text-warning,var(--cm-text-secondary))}" +
            ".sp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px;padding:8px}" +
            ".sp-cell{min-width:0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px 4px;border-radius:5px;color:var(--cm-icon)}" +
            ".sp-cell:hover,.sp-cell:focus-visible{background:var(--cm-bg-hover)}" +
            ".sp-cell[aria-selected=true]{background:var(--cm-bg-selected);box-shadow:inset 0 0 0 1px var(--cm-border-selected)}" +
            ".sp-cell span{width:100%;text-align:center;font-size:10px;line-height:12px;color:var(--cm-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
            ".sp-now{display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid var(--cm-border)}" +
            ".sp-row{display:grid;grid-template-columns:96px minmax(0,1fr);align-items:center;gap:8px;min-height:28px;padding:0 16px}" +
            ".sp-row>label{color:var(--cm-text-secondary)}" +
            ".sp-in{height:24px;min-width:0;width:100%;box-sizing:border-box;padding:0 6px;border-radius:5px;border:0;background:var(--cm-bg-secondary);color:var(--cm-text);font:inherit}" +
            ".sp-in:focus{outline:2px solid var(--cm-border-selected);outline-offset:-1px}" +
            ".sp-in::placeholder{color:var(--cm-text-tertiary)}" +
            ".sp-color{display:flex;align-items:center;gap:6px}" +
            ".sp-color .k-chit{cursor:default}" +
            ".sp-loc{display:grid;grid-template-columns:repeat(3,24px);gap:2px}" +
            ".sp-loc>span{height:20px;border-radius:4px;background:var(--cm-bg-secondary);display:grid;place-items:center}" +
            ".sp-loc>span::after{content:'';width:6px;height:6px;border-radius:50%;background:var(--cm-icon-secondary)}" +
            ".sp-loc>span[aria-checked=true]{background:var(--cm-bg-brand)}" +
            ".sp-loc>span[aria-checked=true]::after{background:#fff}" +
            ".sp-preview{display:flex;align-items:center;justify-content:center;height:56px;margin:8px 16px;border-radius:5px;background:var(--cm-bg-secondary)}" +
            ".sp-preview b{padding:2px 8px;border-radius:4px;background:#FFFFFF;color:#000000;font-weight:500;font-size:13px;box-shadow:0 0 0 1px #00000026}" +
            ".sp-tabs .k-tabs{padding:0 8px;overflow-x:auto}" +
            ".sp-cap{padding:6px 16px;color:var(--cm-text-secondary);font-size:11px;line-height:16px}" +
            ".sp-oq{display:flex;gap:6px;align-items:flex-start;padding:6px 16px;font-size:11px;line-height:16px;color:var(--cm-text-secondary)}" +
            ".sp-foot-note{margin-inline-end:auto;align-self:center;color:var(--cm-text-secondary);font-size:11px}" +
            ".sp-stops{display:flex;flex-wrap:wrap;gap:4px;padding:4px 16px 8px}" +
            ".sp-stops .k-chit{width:20px;height:20px}"));
    }

    // ---------- the element's lists (stand-ins) ----------
    const ALL3 = "Declared safe for deuteranopia, protanopia and tritanopia";
    const P = (id, name, kind, colors, safe) => ({ id, name, kind, colors, safe, cap: kind === "categorical" ? colors.length : null });
    const PALETTES = [
        P("viridis", "Purple to Yellow", "sequential", ["#440154", "#482878", "#3e4989", "#31688e", "#26828e", "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde724"], true),
        P("ylorbr", "Orange to Brown", "sequential", ["#ef7818", "#d85a09", "#b84203", "#8e3104", "#662506"], true),
        P("plasma", "Blue to Yellow", "sequential", ["#0d0887", "#5302a3", "#8b0aa5", "#b83289", "#db5c68", "#f48849", "#febd2a", "#f0f921"], true),
        P("inferno", "Black to Yellow", "sequential", ["#000004", "#1b0c41", "#4a0c6b", "#781c6d", "#a52c60", "#cf4446", "#ed6925", "#fb9b06", "#f7d13d"], true),
        P("blues", "Shades of Blue", "sequential", ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"], true),
        P("greens", "Shades of Green", "sequential", ["#f7fcf5", "#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#006d2c", "#00441b"], false),
        P("oranges", "Shades of Orange", "sequential", ["#fff5eb", "#fee6ce", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#a63603", "#7f2704"], false),
        P("okabe-ito", "Eight Distinct Colors", "categorical", ["#E69F00", "#56B4E9", "#009E73", "#0072B2", "#D55E00", "#CC79A7", "#000000", "#F0E442"], true),
        P("tol-vibrant", "Seven Bright Colors", "categorical", ["#0077BB", "#33BBEE", "#009988", "#EE7733", "#CC3311", "#EE3377", "#BBBBBB"], true),
        P("tol-muted", "Nine Soft Colors", "categorical", ["#332288", "#88CCEE", "#44AA99", "#117733", "#999933", "#DDCC77", "#CC6677", "#882255", "#AA4499"], true),
        P("pastel", "Eight Pale Colors", "categorical", ["#FFD699", "#A8D8F0", "#66C9B2", "#FFF099", "#669DD6", "#FF9980", "#EBB8D2", "#CCCCCC"], true),
        P("carbon", "Five Enterprise Colors", "categorical", ["#6929C4", "#1192E8", "#005D5D", "#9F1853", "#FA4D56"], false),
        P("purple-green", "Purple to Green", "diverging", ["#762a83", "#9970ab", "#c2a5cf", "#e7d4e8", "#f7f7f7", "#d9f0d3", "#a6dba0", "#5aae61", "#1b7837"], true),
        P("blue-orange", "Blue to Orange", "diverging", ["#2166ac", "#4393c3", "#92c5de", "#d1e5f0", "#f7f7f7", "#fddbc7", "#f4a582", "#d6604d", "#b2182b"], true),
        P("red-blue", "Red to Blue", "diverging", ["#67001f", "#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#f7f7f7", "#d1e5f0", "#92c5de", "#4393c3", "#2166ac"], false),
        P("blue-highlight", "Blue Highlight", "categorical", ["#0072B2", "#CCCCCC"], true),
        P("green-highlight", "Green Highlight", "categorical", ["#009E73", "#999999"], true),
        P("orange-highlight", "Orange Highlight", "categorical", ["#E69F00", "#CCCCCC"], true),
    ];
    const SCALES = ["linear", "log", "neglog10", "sqrt", "pow", "bins", "quantile", "ordinal", "passthrough"];
    const nodeCh = () => AB.CHANNELS.node.find((c) => c.id === "node.shape").choices;
    const arrowCh = () => AB.CHANNELS.edge.find((c) => c.id === "edge.arrowHead").choices;
    const lineCh = () => AB.CHANNELS.edge.find((c) => c.id === "edge.style").choices;

    // ---------- glyphs (drawn in currentColor so they work in light and dark) ----------
    const NS = "http://www.w3.org/2000/svg";
    function svg(w, hgt, vb, inner) {
        const s = document.createElementNS(NS, "svg");
        s.setAttribute("width", w);
        s.setAttribute("height", hgt);
        s.setAttribute("viewBox", vb);
        s.setAttribute("aria-hidden", "true");
        s.setAttribute("class", "sp-g");
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
    const arrowGlyph = (name) => svg(24, 16, "0 0 24 16", `<path d="M2 8h${name === "none" ? 20 : 12}" stroke="currentColor" stroke-width="1.5"/>` + (ARROW_ART[name] || ""));
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

    // ---------- placement: left of the inspector, level with the control that opened it ----------
    function beside(p, selectors) {
        let a = null;
        for (const s of selectors || []) { a = typeof s === "function" ? s() : document.querySelector(s); if (a) break; }
        requestAnimationFrame(() => {
            const L = document.getElementById("ab-overlay").getBoundingClientRect();
            const R = document.getElementById("ab-right").getBoundingClientRect();
            const E = p.getBoundingClientRect();
            const A = a ? a.getBoundingClientRect() : { top: R.top + 96 };
            const x = R.width > 0 ? R.left - L.left - E.width - 8 : L.width - E.width - 16;
            const y = A.top - L.top - 8;
            // Never over the toolbar: the popover's foot stays above the toolbar's top edge
            const T = document.querySelector("#ab-toolbar .k-toolbar");
            const floor = T && T.getBoundingClientRect().height ? T.getBoundingClientRect().top - L.top - 8 : L.height - 8;
            p.style.left = Math.max(8, Math.min(x, L.width - E.width - 8)) + "px";
            p.style.top = Math.max(8, Math.min(y, floor - E.height, L.height - E.height - 8)) + "px";
        });
        return p;
    }
    // the section head in the inspector whose title matches, then its "+"
    const headPlus = (title) => () => { const hd = [...document.querySelectorAll("#ab-right .ab-style .k-section-head")].find((x) => x.textContent.trim().startsWith(title)); return hd && hd.querySelector(".k-icon-btn"); };

    // ---------- small builders ----------
    const oq = (text) => h("div", { class: "sp-oq" }, h("span", { class: "k-annot-tag" }, "Open question"), h("span", null, text));
    const filterField = (placeholder, value, onInput) => {
        const inp = h("input", { type: "search", placeholder, "aria-label": placeholder, value: value || "" });
        inp.addEventListener("input", () => onInput(inp.value.trim().toLowerCase()));
        inp.addEventListener("keydown", (e) => { if (e.key === "Escape" && inp.value) { e.stopPropagation(); inp.value = ""; onInput(""); } });
        setTimeout(() => inp.focus(), 0);
        return h("div", { class: "sp-filter" }, icon("search", "sm"), inp);
    };
    // A pickable list item. o: { lead, label, sub, desc, trail, selected, disabled, onPick }
    function item(o) {
        const el = h("div", { class: "sp-item", role: "option", tabindex: o.disabled ? "-1" : "0", "aria-selected": o.selected ? "true" : "false", "aria-disabled": o.disabled ? "true" : null, title: o.title || null },
            h("span", { class: "sp-ck" }, o.selected ? icon("check", "sm") : null), o.lead || null,
            h("span", { class: "k-grow", style: "min-width:0" }, h("span", null, o.label, o.sub ? h("span", { class: "sp-sub" }, "  " + o.sub) : null), o.desc ? h("span", { class: "sp-desc" }, o.desc) : null),
            o.trail || null);
        if (!o.disabled && o.onPick) {
            el.addEventListener("click", o.onPick);
            el.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), o.onPick()));
        }
        return el;
    }
    const listbox = (label) => h("div", { role: "listbox", "aria-label": label });
    const done = (text) => { AB.flash(text); AB.announce(text); };
    // A picker whose choice moves the check in place and updates the "now" line
    function choiceList(o) {
        let cur = o.current, q = "";
        const now = h("span", { class: "k-grow k-strong" });
        const nowGlyph = h("span");
        const box = o.grid ? h("div", { class: "sp-grid", role: "listbox", "aria-label": o.title }) : listbox(o.title);
        const draw = () => {
            now.textContent = cur.replace(/_/g, " ");
            nowGlyph.replaceChildren(o.glyph(cur));
            box.replaceChildren();
            const hits = o.choices.filter((c) => !q || c.replace(/_/g, " ").includes(q));
            if (!hits.length) box.append(h("div", { class: "ab-pad k-secondary" }, "No " + o.noun + " matches \"" + q + "\"."));
            hits.forEach((c) => {
                const pick = () => { cur = c; draw(); AB.announce(o.title + ": " + c.replace(/_/g, " ")); };
                if (o.grid) {
                    const cell = h("div", { class: "sp-cell", role: "option", tabindex: "0", title: c.replace(/_/g, " "), "aria-selected": String(c === cur) }, o.glyph(c), h("span", null, c.replace(/_/g, " ")));
                    cell.addEventListener("click", pick);
                    cell.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick()));
                    box.append(cell);
                } else box.append(item({ lead: o.glyph(c), label: c.replace(/_/g, " "), selected: c === cur, onPick: pick }));
            });
        };
        draw();
        return [h("div", { class: "sp-now" }, nowGlyph, now, o.nowTrail || null), o.filter ? filterField("Find a " + o.noun, "", (v) => { q = v; draw(); }) : null, box, o.after || null];
    }

    // ---------- plus menu: a section's unset properties, and the filter across everything ----------
    const KIND_WORD = { color: "color", number: "number", choice: "choice", boolean: "on or off", text: "text", labelStyle: "label style" };
    function plusMenu(el, typed) {
        const SEC = "Effects";
        const unset = AB.CHANNELS.node.filter((c) => c.section === SEC && c.drawn !== false);
        const list = listbox("Properties");
        const add = (c, value) => () => { done("Added " + c.name + (value ? " (" + value + ")" : "") + " to " + (c.section || "More") + ". It shows as a line in the section."); AB.close(); };
        const draw = (q) => {
            list.replaceChildren();
            if (!q) {
                list.append(h("div", { class: "sp-head" }, SEC + ": not set on this row"));
                unset.forEach((c) => list.append(item({ label: c.name, sub: KIND_WORD[c.kind], desc: c.caveat, onPick: add(c) })));
                list.append(h("div", { class: "sp-cap" }, "Type to search every node and edge property, and their values."));
                return;
            }
            let n = 0;
            ["node", "edge"].forEach((k) => {
                const hits = [];
                AB.CHANNELS[k].filter((c) => c.drawn !== false).forEach((c) => {
                    const where = (k === "node" ? "Nodes" : "Edges") + ", " + (c.section || "More");
                    if ((c.name + " " + c.section).toLowerCase().includes(q)) hits.push(item({ label: c.name, sub: where, desc: c.caveat, onPick: add(c) }));
                    (c.choices || []).filter((v) => v.replace(/_/g, " ").includes(q)).forEach((v) =>
                        hits.push(item({ lead: c.id === "edge.style" ? lineGlyph(v) : c.kind === "choice" && c.id.startsWith("edge.arrow") ? arrowGlyph(v) : c.id === "node.shape" ? svg(16, 16, "0 0 32 32", SHAPE_ART[v]()) : null, label: c.name + ": " + v.replace(/_/g, " "), sub: where, onPick: add(c, v) })));
                });
                if (!hits.length) return list.append(h("div", { class: "sp-head" }, (k === "node" ? "Nodes" : "Edges") + ": no match"));
                n += hits.length;
                list.append(h("div", { class: "sp-head" }, k === "node" ? "Nodes" : "Edges"), ...hits);
            });
            if (!n) list.append(h("div", { class: "ab-pad k-secondary" }, "No property or value matches \"" + q + "\"."));
        };
        draw(typed || "");
        const inp = filterField("Find a property or value", typed, draw);
        const body = [inp, list];
        if (typed) body.push(oq("An edge value found from a Nodes section: add it to this row's edges directly, or switch the tab to Edges first?"));
        el.append(beside(AB.popover({ title: "Add a property", body, width: 300 }), [headPlus(SEC), "#ab-right .ab-style [aria-label^='Add a']", "#ab-right .k-tabs"]));
        el.querySelector(".k-popover").classList.add("sp-pop", "sp-menu-surface");
    }

    // ---------- bind: attributes and results, each with its level ----------
    function bindPicker(el) {
        const L = AB.fx.datasets.lesmis;
        const ATTR_ICON = { text: "type", category: "tag", integer: "hash", number: "sigma" };
        const LEVEL = { text: "text", category: "category", integer: "whole number", number: "number" };
        const attrs = L.attributes.filter((a) => !a.name.includes("(edge)")).map((a) => ({
            name: a.name, icon: ATTR_ICON[a.kind], level: LEVEL[a.kind],
            detail: a.name === "group" ? Object.keys(a.values).length + " values" : a.name === "degree" ? "1 to " + L.stats.maxDegree : a.name === "label" ? L.nodes + " values" : null,
        }));
        const results = [
            { name: "PageRank", icon: "chart-column", level: "number", detail: "0 to 1", from: "PageRank" },
            { name: "Community", icon: "layers", level: "category", detail: "6 values", from: "Louvain, resolution 1.0" },
        ];
        let q = "";
        const list = listbox("What to bind to");
        const pick = (x) => () => { done("Color is bound to " + x.name + ". The line opens its scale, domain and palette in place."); AB.close(); };
        const draw = () => {
            list.replaceChildren();
            const f = (x) => !q || x.name.toLowerCase().includes(q);
            const a = attrs.filter(f), r = results.filter(f);
            if (a.length) list.append(h("div", { class: "sp-head" }, "Node attributes"), ...a.map((x) => item({ lead: icon(x.icon, "sm"), label: x.name, sub: x.level + (x.detail ? ", " + x.detail : ""), title: x.level, onPick: pick(x) })));
            if (r.length) list.append(h("div", { class: "sp-head" }, "Results"), ...r.map((x) => item({ lead: icon(x.icon, "sm"), label: x.name, sub: x.level + ", " + x.detail, desc: "from " + x.from, onPick: pick(x) })));
            if (!a.length && !r.length) list.append(h("div", { class: "ab-pad k-secondary" }, "Nothing called \"" + q + "\"."));
        };
        draw();
        const body = [filterField("Find an attribute or result", "", (v) => { q = v; draw(); }), list,
            h("div", { class: "sp-cap" }, "The icon is the value's level: text, category, whole number or number. It decides which scales the binding offers (the element's nine: " + SCALES.join(", ") + ")."),
            oq("Should a text attribute with a value per node (label, " + L.nodes + " values) be offered for color at all?")];
        el.append(beside(AB.popover({ title: "Bind Color to", body, width: 300 }), ["#ab-right [aria-label^='Bind'], #ab-right [aria-label^='Change what']", "#ab-right .ab-sline", "#ab-right .k-tabs"]));
        el.querySelector(".k-popover").classList.add("sp-pop", "sp-menu-surface");
    }

    // ---------- palette: the element's eighteen, with color-blind safety and capacity ----------
    function palettePicker(el) {
        const need = Object.keys(AB.fx.datasets.lesmis.attributes.find((a) => a.name === "group").values).length;
        let kind = "all", cur = "okabe-ito";
        const list = listbox("Palettes");
        const strip = (p) => h("span", { class: "sp-strip", "aria-hidden": "true" }, p.colors.map((c) => h("span", { style: "background:" + c })));
        const marks = (p) => h("span", { style: "display:flex;gap:8px" },
            h("span", { class: "sp-mark", title: p.safe ? ALL3 : "Not declared color-blind safe" }, icon(p.safe ? "eye" : "eye-off", "sm"), p.safe ? "safe" : "not safe"),
            p.cap ? h("span", { class: "sp-mark" + (p.cap < need ? " sp-warn" : ""), title: p.cap < need ? "Group has " + need + " values: " + (need - p.cap) + " would go to Other" : "Enough colors for group's " + need + " values" }, p.cap < need ? icon("triangle-alert", "sm") : null, p.cap + " colors") : h("span", { class: "sp-mark" }, "continuous"));
        const draw = () => {
            list.replaceChildren();
            ["categorical", "sequential", "diverging"].filter((k) => kind === "all" || kind === k).forEach((k) => {
                list.append(h("div", { class: "sp-head" }, k[0].toUpperCase() + k.slice(1)));
                PALETTES.filter((p) => p.kind === k).forEach((p) => list.append(item({ lead: strip(p), label: p.name, selected: p.id === cur, desc: p.kind === "categorical" ? null : "for a number", trail: marks(p), onPick: () => { cur = p.id; draw(); AB.announce("Palette: " + p.name); } })));
            });
        };
        const seg = h("span", { class: "k-seg k-seg-fill", role: "radiogroup", "aria-label": "Palette kind", style: "margin:8px 16px;display:flex" });
        [["all", "All"], ["categorical", "Categories"], ["sequential", "Sequential"], ["diverging", "Diverging"]].forEach(([k, label]) => {
            const b = h("span", { role: "radio", tabindex: "0", "aria-checked": String(k === kind) }, label);
            const on = () => { kind = k; seg.querySelectorAll("[role=radio]").forEach((x) => x.setAttribute("aria-checked", String(x === b))); draw(); };
            b.addEventListener("click", on);
            b.addEventListener("keydown", (e) => e.key === "Enter" && on());
            seg.append(b);
        });
        draw();
        const body = [h("div", { class: "sp-cap" }, "Bound to group (" + need + " values). A palette with fewer colors paints the rest as one Other color."), seg, list,
            oq("List a palette too small for the attribute with its shortfall (as now), or hide it?")];
        const foot = [AB.button("Custom palette", { kind: "secondary", icon: "plus", go: ["style-pickers", "palette-custom"] })];
        el.append(beside(AB.popover({ title: "Palette", body, foot, width: 380 }), ["#ab-right .ab-bound", "#ab-right .ab-sline", "#ab-right .k-tabs"]));
        el.querySelector(".k-popover").classList.add("sp-pop", "sp-menu-surface");
    }
    function customPalette(el) {
        const src = PALETTES.find((p) => p.id === "okabe-ito");
        const seg = h("span", { class: "k-seg", role: "radiogroup", "aria-label": "Kind" });
        ["Categories", "Sequential", "Diverging"].forEach((k, i) => {
            const b = h("span", { role: "radio", tabindex: "0", "aria-checked": String(i === 0) }, k);
            b.addEventListener("click", () => seg.querySelectorAll("[role=radio]").forEach((x) => x.setAttribute("aria-checked", String(x === b))));
            seg.append(b);
        });
        const safe = h("span", { class: "k-switch", role: "switch", tabindex: "0", "aria-checked": "false", "aria-label": "I checked it is color-blind safe" });
        safe.addEventListener("click", () => safe.setAttribute("aria-checked", String(safe.getAttribute("aria-checked") !== "true")));
        const body = [
            h("div", { class: "sp-row" }, h("label", null, "Name"), h("input", { class: "sp-in", type: "text", placeholder: "Name this palette", "aria-label": "Palette name" })),
            h("div", { class: "sp-row" }, h("label", null, "Kind"), seg),
            h("div", { class: "sp-row" }, h("label", null, "Starts from"), AB.field(src.name, { caret: true, go: ["style-pickers", "palette"] })),
            h("div", { class: "sp-head" }, "Colors, in order"),
            h("div", { class: "sp-stops" }, src.colors.map((c) => h("span", Object.assign({ class: "k-chit", style: "background:" + c, role: "button", title: c, "aria-label": "Edit " + c }, AB.act({ go: ["style-pickers", "color"] })))), AB.iconButton("plus", "Add a color", { go: ["style-pickers", "color"] })),
            h("div", { class: "sp-row" }, h("label", null, "Color-blind safe"), h("span", { style: "display:flex;align-items:center;gap:8px" }, safe, h("span", { class: "k-secondary" }, "your claim"))),
            h("div", { class: "sp-cap" }, "The element keeps the claim as given and does not test it. ", AB.needsElement("A color-blind check for a registered palette (simulating the three deficiencies) is not in graphty-element.")),
        ];
        const foot = [h("span", { class: "sp-foot-note" }, "Saved with the style"), AB.button("Cancel", { kind: "ghost", go: ["style-pickers", "palette"] }), AB.button("Add palette", { onClick: () => { done("Palette added. It is listed under Custom and saved with this style."); AB.go("style-pickers", "palette"); } })];
        el.append(beside(AB.popover({ title: "Custom palette", body, foot, width: 360 }), ["#ab-right .ab-bound", "#ab-right .ab-sline", "#ab-right .k-tabs"]));
    }

    // ---------- choice pickers ----------
    function shapePicker(el) {
        el.append(beside(AB.popover({ title: "Shape", width: 300, body: choiceList({ title: "Shape", noun: "shape", choices: nodeCh(), current: "icosphere", glyph: shapeGlyph, grid: true, filter: true, nowTrail: h("span", { class: "k-secondary" }, "25 shapes") }) }), ["#ab-right .ab-sv .k-caret", "#ab-right .ab-sline", "#ab-right .k-tabs"]));
        el.querySelector(".k-popover").classList.add("sp-pop", "sp-menu-surface");
    }
    function arrowPicker(el) {
        const seg = h("span", { class: "k-seg", role: "radiogroup", "aria-label": "Which end" });
        ["Head", "Tail"].forEach((k, i) => {
            const b = h("span", { role: "radio", tabindex: "0", "aria-checked": String(i === 0) }, k);
            b.addEventListener("click", () => { seg.querySelectorAll("[role=radio]").forEach((x) => x.setAttribute("aria-checked", String(x === b))); el.querySelector(".k-popover-head .k-grow").textContent = "Arrow " + k.toLowerCase(); });
            seg.append(b);
        });
        el.append(beside(AB.popover({ title: "Arrow head", width: 240, body: choiceList({ title: "Arrow type", noun: "arrow", choices: arrowCh(), current: "normal", glyph: arrowGlyph, nowTrail: seg, after: h("div", { class: "sp-cap" }, "Drawn on any graph, directed or not.") }) }), ["#ab-right .ab-sv .k-caret", "#ab-right .ab-sline", "#ab-right .k-tabs"]));
        el.querySelector(".k-popover").classList.add("sp-pop", "sp-menu-surface");
    }
    function patternPicker(el) {
        const cav = AB.CHANNELS.edge.find((c) => c.id === "edge.patternCount").caveat;
        el.append(beside(AB.popover({ title: "Line pattern", width: 240, body: choiceList({ title: "Line pattern", noun: "pattern", choices: lineCh(), current: "solid", glyph: lineGlyph, after: h("div", { class: "sp-cap" }, "Pattern count sets how many marks: ", cav) }) }), ["#ab-right .ab-sv .k-caret", "#ab-right .ab-sline", "#ab-right .k-tabs"]));
        el.querySelector(".k-popover").classList.add("sp-pop", "sp-menu-surface");
    }

    // ---------- color: a value popover for a color line ----------
    function colorPicker(el) {
        const fx = AB.fx.datasets.lesmis.groupColors;
        const cur = fx["2"];
        const chit = AB.chit(cur);
        const hex = h("input", { class: "sp-in k-mono", type: "text", value: cur.slice(1), "aria-label": "Hex color", maxlength: "6" });
        hex.addEventListener("input", () => /^[0-9a-f]{6}$/i.test(hex.value) && (chit.style.background = "#" + hex.value));
        const doc = [...new Set(Object.values(fx))];
        const body = [
            h("div", { class: "sp-row" }, h("label", null, "Hex"), h("span", { class: "sp-color" }, chit, hex)),
            h("div", { class: "sp-row" }, h("label", null, "Opacity"), h("input", { class: "sp-in", type: "number", min: "0", max: "100", value: "100", "aria-label": "Opacity, percent" })),
            h("div", { class: "sp-head" }, "In this graph"),
            h("div", { class: "sp-stops" }, doc.map((c) => { const s = h("span", { class: "k-chit", style: "background:" + c, role: "button", tabindex: "0", title: c, "aria-label": "Use " + c }); s.addEventListener("click", () => { hex.value = c.slice(1); chit.style.background = c; }); return s; })),
            h("div", { class: "sp-cap" }, "Named colors, ramps and swatch libraries are in ", AB.link("inspector-group-set-path-row", "picker-libraries", "the full color picker"), "."),
        ];
        el.append(beside(AB.popover({ title: "Color", width: 260, body }), ["#ab-right .ab-sv .k-chit", "#ab-right .ab-sline", "#ab-right .k-tabs"]));
    }

    // ---------- label style: one popover, six tabs ----------
    // Field names are LABEL_STYLE_FIELDS; the kind and choices of each are typed here (the gap).
    const LS = {
        Text: [["font", "text", "Font"], ["sizePx", "number", "Size, px"], ["weight", ["normal", "bold", "300", "500", "700"], "Weight"], ["color", "color", "Color"], ["lineHeight", "number", "Line height"], ["textAlign", ["left", "center", "right"], "Alignment", "seg"], ["outline", "color", "Outline"], ["outlineWidth", "number", "Outline width"], ["shadow", "bool", "Shadow"], ["shadowColor", "color", "Shadow color"], ["shadowBlur", "number", "Shadow blur"], ["shadowOffsetX", "number", "Shadow x"], ["shadowOffsetY", "number", "Shadow y"]],
        Panel: [["background", "color", "Background"], ["padding", "number", "Padding"], ["cornerRadius", "number", "Corner radius"], ["borderWidth", "number", "Border width"], ["borderColor", "color", "Border color"], ["gradient", "bool", "Gradient"], ["gradientType", ["linear", "radial"], "Gradient type", "seg"], ["gradientDirection", ["vertical", "horizontal", "diagonal"], "Direction"], ["gradientColors", "colors", "Gradient colors"], ["marginTop", "number", "Margin top"], ["marginBottom", "number", "Margin bottom"], ["marginLeft", "number", "Margin left"], ["marginRight", "number", "Margin right"]],
        Placement: [["location", "loc", "Location"], ["attachOffset", "number", "Offset"], ["depthFade", "bool", "Depth fade"], ["depthFadeNear", "number", "Fade starts"], ["depthFadeFar", "number", "Fade ends"]],
        Pointer: [["pointer", "bool", "Pointer"], ["pointerDirection", ["auto", "top", "bottom", "left", "right"], "Direction"], ["pointerWidth", "number", "Width"], ["pointerHeight", "number", "Height"], ["pointerOffset", "number", "Offset"], ["pointerCurve", "bool", "Curved"]],
        Effects: [["animation", ["none", "pulse", "bounce", "shake", "glow", "fill"], "Animation"], ["animationSpeed", "number", "Speed"]],
        Badge: [["badge", ["none", "notification", "label", "label-success", "label-warning", "label-danger", "count", "icon", "progress", "dot"], "Badge"], ["icon", "text", "Icon"], ["iconPosition", ["left", "right"], "Icon side", "seg"], ["progress", "number", "Progress, 0 to 1"], ["smartOverflow", "bool", "Shorten big numbers"], ["maxNumber", "number", "Largest number"], ["overflowSuffix", "text", "Past it, show"]],
    };
    const LOCS = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"];
    function lsControl(f) {
        const [key, kind, name, look] = f;
        const aria = { "aria-label": name, title: key };
        if (kind === "bool") {
            const sw = h("span", Object.assign({ class: "k-switch", role: "switch", tabindex: "0", "aria-checked": "false" }, aria));
            const flip = () => sw.setAttribute("aria-checked", String(sw.getAttribute("aria-checked") !== "true"));
            sw.addEventListener("click", flip);
            sw.addEventListener("keydown", (e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), flip()));
            return sw;
        }
        if (kind === "number") return h("input", Object.assign({ class: "sp-in", type: "number", placeholder: "default" }, aria));
        if (kind === "text") return h("input", Object.assign({ class: "sp-in", type: "text", placeholder: "default" }, aria));
        if (kind === "color" || kind === "colors") return h("span", { class: "sp-color" }, AB.field(h("span", { class: "k-tertiary" }, kind === "colors" ? "none" : "default"), { span: true, go: ["style-pickers", "color"] }));
        if (kind === "loc") {
            const g = h("span", { class: "sp-loc", role: "radiogroup", "aria-label": name });
            LOCS.forEach((l) => { const c = h("span", { role: "radio", tabindex: "0", "aria-checked": "false", "aria-label": l, title: l }); c.addEventListener("click", () => g.querySelectorAll("[role=radio]").forEach((x) => x.setAttribute("aria-checked", String(x === c)))); g.append(c); });
            const auto = h("span", { class: "k-seg" }, h("span", { role: "radio", tabindex: "0", "aria-checked": "true" }, "automatic"));
            g.addEventListener("click", () => auto.firstChild.setAttribute("aria-checked", "false"));
            auto.addEventListener("click", () => { auto.firstChild.setAttribute("aria-checked", "true"); g.querySelectorAll("[role=radio]").forEach((x) => x.setAttribute("aria-checked", "false")); });
            return h("span", { style: "display:flex;gap:8px;align-items:center;padding:4px 0" }, g, auto);
        }
        if (look === "seg") {
            const seg = h("span", { class: "k-seg", role: "radiogroup", "aria-label": name });
            kind.forEach((v) => { const b = h("span", { role: "radio", tabindex: "0", "aria-checked": "false" }, v); b.addEventListener("click", () => seg.querySelectorAll("[role=radio]").forEach((x) => x.setAttribute("aria-checked", String(x === b)))); seg.append(b); });
            return seg;
        }
        return h("select", Object.assign({ class: "sp-in" }, aria), h("option", { value: "" }, "default"), kind.map((v) => h("option", { value: v }, v)));
    }
    function labelStyle(el) {
        const lsTab = (name) => LS[name].map((f) => h("div", { class: "sp-row" }, h("label", null, f[2]), lsControl(f)));
        const body = h("div");
        const show = (name) => body.replaceChildren(...lsTab(name));
        show("Text");
        const enabled = h("span", { class: "k-switch", role: "switch", tabindex: "0", "aria-checked": "true", "aria-label": "Show labels" });
        enabled.addEventListener("click", () => enabled.setAttribute("aria-checked", String(enabled.getAttribute("aria-checked") !== "true")));
        const content = [
            h("div", { class: "sp-preview", "aria-label": "Preview" }, h("b", null, "Valjean")),
            h("div", { class: "sp-row" }, h("label", null, "Show label"), enabled),
            h("div", { class: "sp-tabs" }, AB.tabs(Object.keys(LS), "Text", show)),
            body,
            h("div", { class: "sp-cap" }, "Empty fields use graphty-element's defaults. Names come from the element; kinds, ranges and plain names here are the app's. ", AB.needsElement("graphty-element publishes only the label-style field names (LABEL_STYLE_FIELDS); full descriptors with kind, choices, range, default and plain name are filed.")),
            oq("The same popover serves node label, tooltip, edge label and both arrow captions: does a field that one of them ignores (Pointer on a caption?) show disabled or hide?"),
        ];
        el.append(beside(AB.popover({ title: "Node label style", body: content, width: 372 }), ["#ab-right .ab-aa", "#ab-right .ab-sline", "#ab-right .k-tabs"]));
        el.querySelector(".k-popover").classList.add("sp-pop", "sp-menu-surface");
    }

    // ---------- token edit: a value from "Why this look", written to Overrides ----------
    function tokenEdit(el) {
        const tok = document.querySelector("#ab-right .ab-token");
        const line = tok && tok.closest(".ab-why-line");
        const prop = (tok && tok.textContent) || "color";
        const from = (line && line.querySelector(".ab-why-name") && line.querySelector(".ab-why-name").textContent) || "Group 2";
        const raw = tok && tok.title && tok.title !== prop ? tok.title : "";
        const hexIn = raw.match(/#[0-9a-f]{6}/i);
        const value = hexIn ? hexIn[0] : raw.split(",")[0].trim() || (prop === "color" ? AB.fx.datasets.lesmis.groupColors["2"] : "");
        const isColor = /^#[0-9a-f]{6}$/i.test(value);
        const chit = isColor ? AB.chit(value) : null;
        const inp = h("input", { class: "sp-in" + (isColor ? " k-mono" : ""), type: "text", value: isColor ? value.slice(1) : value, "aria-label": prop + " for Valjean", placeholder: "value" });
        if (isColor) inp.addEventListener("input", () => /^[0-9a-f]{6}$/i.test(inp.value) && (chit.style.background = "#" + inp.value));
        setTimeout(() => inp.select(), 0);
        const body = [
            h("div", { class: "sp-row" }, h("label", null, "Now"), h("span", { class: "k-secondary k-ellipsis" }, "from " + from)),
            h("div", { class: "sp-row" }, h("label", null, prop[0].toUpperCase() + prop.slice(1)), isColor ? h("span", { class: "sp-color" }, chit, inp) : inp),
            h("div", { class: "sp-cap" }, "Changes Valjean only. " + from + " keeps its value for its other members."),
            oq("If Overrides already sets " + prop + " on Valjean, does Apply replace that value, or ask?"),
        ];
        const foot = [h("span", { class: "sp-foot-note" }, icon("layers", "sm"), " Writes to Overrides"), AB.button("Cancel", { kind: "ghost", onClick: () => AB.close() }), AB.button("Apply", { onClick: () => { done("Valjean's " + prop + " is set in Overrides, the top row of the tree."); AB.go("inspector-node", "edited"); } })];
        el.append(beside(AB.popover({ title: prop[0].toUpperCase() + prop.slice(1) + " on Valjean", body, foot, width: 280 }), ["#ab-right .ab-token", "#ab-right .ab-why"]));
    }

    const RENDER = {
        "plus-menu": (el) => plusMenu(el, ""),
        "plus-menu-search": (el) => plusMenu(el, "dash"),
        bind: bindPicker,
        palette: palettePicker,
        "palette-custom": customPalette,
        shape: shapePicker,
        choice: shapePicker,
        arrow: arrowPicker,
        pattern: patternPicker,
        color: colorPicker,
        "label-style": labelStyle,
        "token-edit": tokenEdit,
    };

    registerSection({
        id: "style-pickers",
        title: "Style pickers",
        region: "overlay",
        rail: "graph",
        frame: (state) => (state === "token-edit" ? { left: "graph-place/at-rest", right: "inspector-node/why-this-look" } : { left: "graph-place/at-rest", right: "inspector-group-set-path-row/style" }),
        // Esc and an outside click return to the inspector that opened the popover
        get closeTo() { return /token-edit/.test(location.hash) ? "inspector-node/why-this-look" : "inspector-group-set-path-row/style"; },
        states: [
            { id: "plus-menu", label: "Add a property" },
            { id: "plus-menu-search", label: "Add a property: typed \"dash\"" },
            { id: "bind", label: "Bind to data" },
            { id: "palette", label: "Palette" },
            { id: "palette-custom", label: "Custom palette" },
            { id: "shape", label: "Shape" },
            { id: "arrow", label: "Arrow type" },
            { id: "pattern", label: "Line pattern" },
            { id: "color", label: "Color" },
            { id: "choice", label: "Choice list (a shape)" },
            { id: "label-style", label: "Label style" },
            { id: "token-edit", label: "Edit a value (Why this look)" },
        ],
        render(el, state) {
            (RENDER[state] || RENDER["plus-menu"])(el);
        },
    });
})();
