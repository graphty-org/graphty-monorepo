/* Canvas and its states, version 4. Every data door on the canvas (the empty card, the too-large
   refusal's Choose another file... and Details) opens a Data page state. Version 3: The canvas holds only the drawing, the legend card (top left,
   AB.legendCard: shown or hidden only by the toolbar's Legend button and L) and the state cards. No
   buttons, chips or "?". One state card pattern: icon and title, one sentence, at most one primary
   and one secondary button; while a card shows, every toolbar button but Quick actions is disabled
   with "Nothing is drawn". One-line states (less detail, waiting to settle, selection full) are the
   shared notice. Elements hidden on canvas are reported in the tree's footer line, not here. Note
   markers are the tree's Notes row, a style layer like any other. Plain ASCII.

   What paints: at rest the tree's top painting row is PageRank, which colors every node, so the
   drawing is recolored at runtime with each node's PageRank on the measure ramp. PageRank here is
   the same computation as the measure inspector's: networkx les_miserables_graph, unweighted,
   damping 0.85, keyed by the node's position in the kit's drawings (every Les Miserables drawing
   places the 77 nodes identically).

   Numbers: Les Miserables, transfers and Patent citations from kit/fixtures.json; the limits
   (50,000 nodes, 100,000 edges, less detail above 10,000, selections up to 5,000) are
   graphty-element's DEFAULT_LIMITS. Two drawings are derived here at runtime from the kit's Les
   Miserables SVGs: "hidden on canvas" drops the 4 group-0 nodes and their edges; "Everything
   hidden" draws only groups 2 and 8 (their rows paint them) and no edges. At rest no row sizes the
   nodes, so every node is drawn at one size. Version 2 state ids (layout and legend states, camera moved, too-large)
   open the drawn state: the toolbar section owns the layout and legend states now. */
(function () {
    "use strict";
    const CSS = `
.cs-edge { position: absolute; width: 18px; height: 18px; border-radius: 50%; transform: translate(-50%, -50%); cursor: help; }
.cs-edge:hover { box-shadow: 0 0 0 2px var(--k-mark-out), 0 0 0 4px var(--k-mark-in); }
.cs-card { width: 360px; max-width: calc(100% - 32px); }
.cs-card .k-canvas-card-title .k-i { flex: none; }
.cs-danger { color: var(--cm-text-danger); }
.cs-dots { display: inline-flex; align-items: center; gap: 4px; }
.cs-true-box { display: inline-flex; justify-content: center; align-items: center; flex: none; }
/* the walk's focus pill, in the secondary bar's place right above the toolbar column */
.cs-pill { position: absolute; left: 50%; transform: translateX(-50%); z-index: 6; display: grid; gap: 4px; height: auto; min-width: 360px; max-width: calc(100% - 24px); box-sizing: border-box; padding: 8px 12px; font-size: 11px; line-height: 16px; white-space: nowrap; }
.cs-pr { display: flex; align-items: center; gap: 8px; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.cs-pill .k-seg { height: 20px; }
.cs-pill .cs-hint { display: block; white-space: normal; }
/* TEMPORARY until selection-bar.js drops its own walk readout ("Valjean, 36 connections"): while the
   pill shows, the pill is the one readout of the walk */
.ab-main:has(.cs-pill) #ab-toolbar .k-caption { display: none; }
`;
    if (!document.getElementById("cs-css")) document.head.append(h("style", { id: "cs-css" }, CSS));

    const L = () => AB.fx.datasets.lesmis;
    const C = () => AB.fx.datasets.citations;
    const n = (x) => AB.num(x); // the one number formatter
    const byLabel = (label) => L().rows.find((r) => r.label === label);
    // The legend card only when something paints: an unstyled drawing shows no card (the canvas carries
    // no controls, and an empty card read as a coloring control that did nothing)
    const legend = (parts) => (parts.length ? AB.legendCard(parts) : null);

    // ---------- derived drawings (cached per theme) ----------
    const cache = {};
    function derived(base, key, edit) {
        const imgs = ["light", "dark"].map((theme) => {
            const img = h("img", { class: "k-" + theme + "-only", alt: "" });
            const id = key + "-" + theme;
            const p = cache[id] || (cache[id] = fetch(`kit/canvas/${base}-${theme}.svg`).then((r) => r.text()).then((text) => {
                const doc = new DOMParser().parseFromString(text, "image/svg+xml");
                edit(doc, theme);
                return URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)], { type: "image/svg+xml" }));
            }));
            // A fetch cut short by a navigation is dropped from the cache, so the next draw retries it
            p.then((url) => { img.src = url; }).catch(() => { if (cache[id] === p) delete cache[id]; });
            return img;
        });
        return imgs;
    }
    // The node circles: each fill circle is followed by its outline ring.
    function nodePairs(doc) {
        const all = Array.from(doc.querySelectorAll("circle"));
        const pairs = [];
        for (let i = 0; i < all.length; i++) {
            const c = all[i];
            if (c.getAttribute("fill") === "none") continue;
            const ring = all[i + 1] && all[i + 1].getAttribute("fill") === "none" ? all[i + 1] : null;
            pairs.push({ c, ring, x: +c.getAttribute("cx"), y: +c.getAttribute("cy"), fill: c.getAttribute("fill").toUpperCase() });
        }
        return pairs;
    }
    function hideGroup0(doc) {
        const gone = nodePairs(doc).filter((p) => p.fill === L().groupColors["0"]);
        const at = (x, y) => gone.some((p) => Math.abs(p.x - x) < 0.2 && Math.abs(p.y - y) < 0.2);
        gone.forEach((p) => { p.c.remove(); if (p.ring) p.ring.remove(); });
        doc.querySelectorAll("line").forEach((l) => { if (at(+l.getAttribute("x1"), +l.getAttribute("y1")) || at(+l.getAttribute("x2"), +l.getAttribute("y2"))) l.remove(); });
        doc.querySelectorAll("text").forEach((t) => { const x = +t.getAttribute("x"), y = +t.getAttribute("y"); if (gone.some((p) => x - p.x > 0 && x - p.x < 30 && Math.abs(y - p.y - 4) < 3)) t.remove(); });
    }
    // Everything hidden: only what another row paints is drawn (groups 2 and 8). The other nodes and
    // every edge (Everything is what paints edges) are not drawn, but keep their places: they still
    // take part in the layout
    function everythingHidden(doc) {
        const keep = [groupColor("2"), groupColor("8")], gone = nodePairs(doc).filter((p) => !keep.includes(p.fill));
        gone.forEach((p) => { p.c.remove(); if (p.ring) p.ring.remove(); });
        doc.querySelectorAll("line").forEach((l) => l.remove());
        doc.querySelectorAll("text").forEach((t) => { const x = +t.getAttribute("x"), y = +t.getAttribute("y"); if (gone.some((p) => x - p.x > 0 && x - p.x < 30 && Math.abs(y - p.y - 4) < 3)) t.remove(); });
    }
    const groupColor = (g) => L().groupColors[g].toUpperCase();

    // ---------- PageRank paint (see the header) ----------
    const PAGERANK = {"909.6,224.4":0.0428,"991.8,211.2":0.0056,"879.6,269.7":0.0103,"850.4,230.9":0.0103,"915.9,145.9":0.0056,"960.6,176.1":0.0056,"988.2,242.2":0.0056,"951.8,145.6":0.0056,"991.4,178.5":0.0056,"870.8,247.3":0.0056,"677.5,481.1":0.0037,"698.7,394.3":0.0754,"585.1,225.5":0.0053,"651.7,469.5":0.0037,"668.4,326.2":0.0037,"624.2,465.4":0.0037,"587.2,166.7":0.0156,"592.5,119.9":0.0126,"561.6,132.6":0.0126,"617.9,106.3":0.0126,"546.4,112.1":0.0126,"567,90.8":0.0126,"595.8,85.6":0.0126,"626.4,181":0.027,"785.3,352.8":0.0195,"789.4,393.1":0.0279,"587.1,378.9":0.0206,"755.4,392":0.0303,"739.9,241.2":0.0116,"642.6,349.5":0.0156,"548.3,179.2":0.0054,"674.3,294.9":0.0091,"699.4,457.8":0.0037,"716.9,323.1":0.0052,"651.4,400":0.0124,"630.5,375.6":0.0124,"605.3,385.3":0.0124,"635.2,425.1":0.0124,"606.8,415.6":0.0124,"731.4,371.4":0.0074,"550.7,572.1":0.0034,"848,423.2":0.0178,"853.2,355.6":0.0063,"595.1,314":0.0068,"749.2,196.7":0.0062,"752.6,148.9":0.0044,"1130,477.6":0.0053,"1054.2,497.5":0.0078,"820.6,539.7":0.0358,"557.8,457.8":0.015,"492.3,435.2":0.0053,"530.1,404.4":0.0163,"468.2,354.1":0.006,"426.2,392.9":0.0039,"524.4,445.2":0.0087,"750.6,530.6":0.0309,"530.1,529.3":0.0051,"800.4,553.3":0.0175,"777.8,559.5":0.0219,"789.9,588.3":0.0159,"795.8,635.6":0.0131,"767.9,611.1":0.0159,"800.4,605.2":0.0186,"827.3,576.1":0.0172,"764.2,584.6":0.019,"822.1,597":0.0172,"827.6,627.6":0.0145,"681,714.4":0.0033,"820.2,407.9":0.0167,"831.5,385":0.0167,"793.3,428.6":0.0166,"815.6,446.3":0.0152,"559.4,330.6":0.0068,"1006.2,572.9":0.0058,"990,619.7":0.0058,"866.6,438.6":0.0119,"854.9,597.3":0.0107};
    const PR_DOMAIN = [0.0033, 0.0754];
    const PR_STOPS = ["#ef7818", "#d85a09", "#b84203", "#8e3104", "#662506"]; // kit.css .k-ramp-measure
    const rampColor = (v) => rampAt(Math.max(0, Math.min(1, (v - PR_DOMAIN[0]) / (PR_DOMAIN[1] - PR_DOMAIN[0]))));
    // The paint tree decides Color (AB.paintRows, top first): the top shown row that paints Color wins,
    // a hidden folder hides the rows inside it, and a row shown alone (AB.soloRow) is the only one shown.
    // Rows that paint Color here: PageRank (its ramp), Louvain (each node in its community's color, the
    // table's Louvain tab, AB.lesmisCommunities) and a Betweenness run (the fixtures' betweenness on its
    // ramp). Before any paint tree has drawn, the tree at rest's winner, PageRank.
    // ponytail: groups and sets paint only their own members, which the drawings already show
    const COLOR_ROW = /^(PageRank|Louvain|Betweenness( \d+)?)$/;
    const BT_RAMP = ["#fde7c8", "#E69F00"];
    function colorWinner() {
        if (!AB.paintRows.length) return "PageRank";
        if (AB.soloRow) return COLOR_ROW.test(AB.soloRow) ? AB.soloRow : null;
        let under = 0; // rows below this level sit inside a hidden folder
        for (const r of AB.paintRows) {
            if (under && r.level > under) continue;
            under = 0;
            if (!r.eye) { under = r.level; continue; }
            if (COLOR_ROW.test(r.name)) return r.name;
        }
        return null;
    }
    const btMax = () => Math.max(...L().rows.map((r) => r.betweenness));
    const btColor = (v) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(BT_RAMP[0].slice(i, i + 2), 16) * (1 - v) + parseInt(BT_RAMP[1].slice(i, i + 2), 16) * v).toString(16).padStart(2, "0")).join("");
    // A Size binding on Les Miserables (AB.paintOf: a bind icon's line or a Size by row) sizes each node
    // over the one size range, AB.SIZE_RANGE (px across), linear over the attribute's values
    const sizeBound = () => { const p = AB.paintOf("lesmis", "Size", "node"); return p && p.type === "num" ? p : null; };
    function sizeNodes(doc) {
        const p = sizeBound();
        if (!p) return;
        const keys = Object.keys(PAGERANK), v = L().rows.map((r) => Number(r[p.name])), lo = Math.min(...v), hi = Math.max(...v), at = {};
        L().rows.forEach((r, i) => { const t = hi > lo ? (v[i] - lo) / (hi - lo) : 0; at[keys[i]] = (AB.SIZE_RANGE[0] + t * (AB.SIZE_RANGE[1] - AB.SIZE_RANGE[0])) / 2 + 1; });
        doc.querySelectorAll("circle").forEach((c) => {
            const r = at[c.getAttribute("cx") + "," + c.getAttribute("cy")];
            if (r != null) c.setAttribute("r", String(c.getAttribute("fill") === "none" ? r + 0.7 : r));
        });
    }
    function paintRows(doc) {
        sizeNodes(doc);
        const win = colorWinner();
        if (win === "PageRank" || (win === "Louvain" && !AB.lesmisCommunities)) return paintPagerank(doc);
        if (!win) return;
        const keys = Object.keys(PAGERANK), color = {};
        if (win === "Louvain") AB.lesmisCommunities.forEach((c) => c.members.forEach((m) => { const i = L().rows.findIndex((r) => r.label === m); if (i >= 0) color[keys[i]] = c.color; }));
        else L().rows.forEach((r, i) => { color[keys[i]] = btColor(r.betweenness / btMax()); });
        doc.querySelectorAll("circle").forEach((c) => {
            const k = color[c.getAttribute("cx") + "," + c.getAttribute("cy")];
            if (k && c.getAttribute("fill") !== "none") c.setAttribute("fill", k);
        });
    }
    function paintPagerank(doc) {
        doc.querySelectorAll("circle").forEach((c) => {
            const v = PAGERANK[c.getAttribute("cx") + "," + c.getAttribute("cy")];
            if (v != null && c.getAttribute("fill") !== "none") c.setAttribute("fill", rampColor(v));
        });
    }
    // ---------- what the inspector holds: the layout method and each row's label lines ----------
    // The method lives in the graph's Layout group (#ins-method) and the label lines in a row's Style tab;
    // both are read from the page as last shown, so the drawing follows them after the panel closes.
    // A watcher (below) redraws the stage when either changes.
    let layoutMethod = "Spread Out";
    const labelRows = {}; // "<dataset>|<inspector title>" -> [{ pos, field, text }]
    const dsNow = () => (AB.route && AB.route.frame.dataset) || "lesmis";
    function readInputs() {
        const m = document.querySelector("#ins-method .k-grow");
        if (m && m.textContent.trim()) layoutMethod = m.textContent.trim();
        const st = document.querySelector("#ab-right .ab-style"), title = document.querySelector("#ab-right .ab-insp-head .k-name");
        const kind = st && st.querySelector("[aria-label='What the row paints'] [aria-checked='true']");
        if (!st || !title || (kind && /Edges/.test(kind.textContent))) return;
        labelRows[dsNow() + "|" + title.textContent.trim()] = [...st.querySelectorAll('.ab-sline[data-ch="node.label"][data-label]')]
            .filter((li) => !li.querySelector(".ab-sv .k-secondary")) // a draft line ("Pick an attribute") draws nothing
            .map((li) => { const v = li.querySelector(".ab-sv .k-grow"), t = v ? v.textContent.trim() : ""; return li.hasAttribute("data-bound") ? { pos: li.dataset.label, field: t } : { pos: li.dataset.label, text: t }; });
    }
    const labelsOf = (ds) => Object.keys(labelRows).filter((k) => k.startsWith(ds + "|") && labelRows[k].length).map((k) => ({ title: k.slice(ds.length + 1), lines: labelRows[k] }));
    const sigNow = () => { readInputs(); return JSON.stringify([layoutMethod, labelsOf(dsNow()), colorWinner(), (sizeBound() || {}).name]); };
    let restage = null, stageSig = "", pend = 0;
    new MutationObserver(() => {
        if (pend) return;
        pend = requestAnimationFrame(() => { pend = 0; if (!restage) return; const s = sigNow(); if (s !== stageSig) { stageSig = s; restage(); } });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });

    // Les Miserables laid out by each method, in row order (LM_POS is Spread Out, the kit's drawing).
    // ponytail: made-up geometry per method so a change can be seen and judged; the element computes the real ones
    let LM_ADJ = null; // neighbors in row order, read from the drawing's lines the first time one is laid out
    const KEY = (x, y) => +x + "," + +y;
    AB.lesmisAdj = () => LM_ADJ; // read by the several-elements inspector to count edges among picked nodes
    function lmAdj(doc) {
        if (LM_ADJ || !doc) return;
        const at = new Map(LM_POS.map(([x, y], i) => [KEY(x, y), i]));
        LM_ADJ = LM_POS.map(() => []);
        doc.querySelectorAll("line").forEach((l) => { const a = at.get(KEY(l.getAttribute("x1"), l.getAttribute("y1"))), b = at.get(KEY(l.getAttribute("x2"), l.getAttribute("y2"))); if (a != null && b != null) { LM_ADJ[a].push(b); LM_ADJ[b].push(a); } });
    }
    function depths(root) {
        const d = LM_POS.map((_, i) => (i === root ? 0 : -1)), q = [root];
        while (LM_ADJ && q.length) { const i = q.shift(); LM_ADJ[i].forEach((j) => { if (d[j] < 0) { d[j] = d[i] + 1; q.push(j); } }); }
        const far = Math.max(...d) + 1;
        return d.map((x) => (x < 0 ? far : x));
    }
    const lmCache = {};
    function lmPos(method) {
        method = method || layoutMethod;
        const ck = method + (LM_ADJ ? "+" : "");
        if (lmCache[ck]) return lmCache[ck];
        const P = LM_POS, rows = L().rows, idx = P.map((_, i) => i), out = [];
        const ring = (list, rx, ry) => list.forEach((i, k) => { const a = (k / list.length) * 2 * Math.PI - Math.PI / 2; out[i] = [600 + rx * Math.cos(a), 400 + ry * Math.sin(a)]; });
        const byKey = (key) => { const m = new Map(); idx.forEach((i) => { const k = key(i); if (!m.has(k)) m.set(k, []); m.get(k).push(i); }); return [...m.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]); };
        const spread = (n, k, lo, hi) => (n === 1 ? (lo + hi) / 2 : lo + (k * (hi - lo)) / (n - 1));
        const columns = (cols) => cols.forEach((list, c) => list.forEach((i, k) => { out[i] = [spread(cols.length, c, 160, 1040), spread(list.length, k, 70, 730)]; }));
        const root = rows.indexOf(byLabel("Valjean"));
        let seed = 7;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        if (method === "Spread Out, Flat") P.forEach(([x, y], i) => { out[i] = [600 + (x - 600) * 1.3, 400 + (y - 400) * 0.45]; });
        else if (method === "Ring") ring(idx, 360, 330);
        else if (method === "Rings from a Node") { const d = depths(root); byKey((i) => d[i]).forEach((list, lv) => (lv ? ring(list, 120 * lv, 105 * lv) : (out[list[0]] = [600, 400]))); }
        else if (method === "Tree") { const dd = depths(root), lv = byKey((i) => dd[i]); lv.forEach((list, d) => list.forEach((i, k) => { out[i] = [spread(list.length, k, 40, 1160), spread(lv.length, d, 90, 710)]; })); }
        else if (method === "Grid") idx.forEach((i) => { out[i] = [600 + ((i % 11) - 5) * 95, 400 + (Math.floor(i / 11) - 3) * 100]; });
        else if (method === "Concentric Rings") byKey((i) => rows[i].group).forEach((list, s) => ring(list, 40 + 32 * s, 36 + 29 * s));
        else if (method === "Spiral") idx.forEach((i) => { const r = 14 + 4.4 * i, t = i * 0.5; out[i] = [600 + r * Math.cos(t), 400 + r * Math.sin(t) * 0.92]; });
        else if (method === "Natural Grouping") { const g = byKey((i) => rows[i].group); g.forEach((list, c) => { const a = (c / g.length) * 2 * Math.PI - Math.PI / 2, cx = 600 + 400 * Math.cos(a), cy = 400 + 270 * Math.sin(a); list.forEach((i, k) => { const r = 15 * Math.sqrt(k), t = k * 2.39996; out[i] = [cx + r * Math.cos(t), cy + r * Math.sin(t)]; }); }); }
        else if (method === "No Crossings") P.forEach(([x, y], i) => { out[i] = [1200 - x, 800 - y]; });
        else if (method === "Scattered") idx.forEach((i) => { out[i] = [80 + rnd() * 1040, 60 + rnd() * 680]; });
        else if (method === "Two Columns") columns(byKey((i) => rows[i].group % 2));
        else if (method === "Columns by Group") columns(byKey((i) => rows[i].group));
        else return P; // Spread Out, Keep Positions
        return (lmCache[ck] = out);
    }
    // Moves every circle, line end and label of a Les Miserables drawing to the method's positions.
    // Each kit label first takes the index of its node (data-i), so label lines can replace it.
    function relayout(doc) {
        lmAdj(doc);
        const keys = LM_POS.map(([x, y]) => KEY(x, y)), at = new Map(keys.map((k, i) => [k, i]));
        doc.querySelectorAll("text").forEach((t) => {
            const x = +t.getAttribute("x"), y = +t.getAttribute("y");
            let best = -1, d = Infinity;
            LM_POS.forEach(([px, py], i) => { const e = Math.hypot(x - px, y - py); if (e < d) { d = e; best = i; } });
            if (best >= 0 && d < 60) t.setAttribute("data-i", best);
        });
        const to = lmPos();
        if (to === LM_POS) return;
        const f = (v) => v.toFixed(1), mv = (el, ax, ay) => { const i = at.get(KEY(el.getAttribute(ax), el.getAttribute(ay))); if (i != null) { el.setAttribute(ax, f(to[i][0])); el.setAttribute(ay, f(to[i][1])); } };
        doc.querySelectorAll("circle").forEach((c) => mv(c, "cx", "cy"));
        doc.querySelectorAll("line").forEach((l) => { mv(l, "x1", "y1"); mv(l, "x2", "y2"); });
        doc.querySelectorAll("text[data-i]").forEach((t) => { const i = +t.getAttribute("data-i"); t.setAttribute("x", f(+t.getAttribute("x") + to[i][0] - LM_POS[i][0])); t.setAttribute("y", f(+t.getAttribute("y") + to[i][1] - LM_POS[i][1])); });
    }
    // Label lines on the drawing: [dx, dy, anchor] per position, the offset in node radii
    const LABEL_AT = { Above: [0, -1, "middle"], Below: [0, 1, "middle"], Right: [1, 0, "start"], Left: [-1, 0, "end"], "Top left": [-1, -1, "end"], "Top right": [1, -1, "start"], "Bottom left": [-1, 1, "end"], "Bottom right": [1, 1, "start"], Center: [0, 0, "middle"] };
    const labelXY = (pos, x, y, r) => { const [dx, dy, anchor] = LABEL_AT[pos] || LABEL_AT.Above; return [x + dx * (r + 3), y + (dy < 0 ? -(r + 4) : dy > 0 ? r + 13 : 4), anchor]; };
    // One line's text on Les Miserables node i: its field's value, or its typed text
    function lmValue(i, l) {
        if (!l.field) return l.text || null;
        const r = L().rows[i], f = l.field.toLowerCase();
        // Note count: the node inspector's (Valjean has 2) plus notes saved in this page view
        if (f === "note count") return AB.num((r.label === "Valjean" ? 2 : 0) + (AB.sessionNotes || []).filter((x) => (x.about || []).some((t) => t.label === r.label)).length);
        if (f === "pagerank") return AB.num(PAGERANK[LM_POS[i].join(",")]);
        const v = f === "name" || f === "label" ? r.label : r[l.field] != null ? r[l.field] : r[f];
        return v == null ? null : typeof v === "number" ? AB.num(v) : String(v);
    }
    // Which nodes a row's label lines are on: a group's members, one node, else every node
    function lmScope(title) {
        const g = title.match(/^Group (\d+)$/), one = byLabel(title);
        return L().rows.map((r, i) => (g ? String(r.group) === g[1] : one ? r === one : true));
    }
    function drawLabels(doc) {
        const rows = labelsOf("lesmis"), texts = doc.querySelector("g[font-family]");
        if (!rows.length || !texts) return;
        const at = new Map(), to = lmPos(), ns = "http://www.w3.org/2000/svg";
        doc.querySelectorAll("circle").forEach((c) => { if (c.getAttribute("fill") !== "none") at.set(KEY(c.getAttribute("cx"), c.getAttribute("cy")), +c.getAttribute("r")); });
        rows.forEach(({ title, lines }) => {
            const scope = lmScope(title);
            scope.forEach((on, i) => {
                const r = on && at.get(KEY(to[i][0].toFixed(1), to[i][1].toFixed(1)));
                if (!r) return; // not in this row, or not drawn (hidden on canvas)
                texts.querySelectorAll(`text[data-i="${i}"]`).forEach((t) => t.remove()); // the row's lines replace the kit's name label
                lines.forEach((l) => {
                    const s = lmValue(i, l);
                    if (s == null) return;
                    const [x, y, anchor] = labelXY(l.pos, to[i][0], to[i][1], r), t = doc.createElementNS(ns, "text");
                    t.setAttribute("x", x.toFixed(1)); t.setAttribute("y", y.toFixed(1)); t.setAttribute("text-anchor", anchor); t.setAttribute("data-l", "");
                    t.textContent = s;
                    texts.append(t);
                });
            });
        });
    }
    // The other drawings get no layout of their own: each method turns the picture its own way (a
    // rotation, a scale and a mirror about the middle), so a change can be seen.
    // ponytail: a stand-in transform per method; the element lays the real graph out
    const TURNED = ["Spread Out, Flat", "Ring", "Rings from a Node", "Grid", "Concentric Rings", "Spiral", "Natural Grouping", "No Crossings", "Scattered", "Tree", "Two Columns", "Columns by Group"];
    function turn() {
        const k = TURNED.indexOf(layoutMethod) + 1;
        if (!k) return null;
        if (k === 1) return { a: 0, sx: 1.15, sy: 0.6 };
        return { a: k * 29, sx: k % 2 ? -0.7 : 0.7, sy: 0.7 };
    }
    // a point of a 1200 x 800 drawing, turned by the method (the drawings built here move their nodes with it)
    function turnPt([x, y]) {
        const t = turn();
        if (!t) return [x, y];
        const a = (t.a * Math.PI) / 180, dx = (x - 600) * t.sx, dy = (y - 400) * t.sy;
        return [600 + dx * Math.cos(a) - dy * Math.sin(a), 400 + dx * Math.sin(a) + dy * Math.cos(a)];
    }
    // the kit's pictures (the transfers, the registry) are turned as images
    function layoutTransform(stage) {
        const t = turn(), tf = !t ? "" : `rotate(${t.a}deg) scale(${t.sx}, ${t.sy})`;
        stage.querySelectorAll(":scope > img").forEach((img) => { img.style.transform = tf; });
    }

    // Any Les Miserables drawing from the kit, painted as the tree at rest paints it, laid out by the
    // method chosen and carrying the label lines. Other sections that draw the Les Miserables canvas
    // (the selection bar, the export preview) use this too.
    // after: an edit applied over the paint (the Overrides row wins over PageRank)
    AB.lesmisDrawing = (base, alt, edit, after) => { const s = sigNow(); return derived(base, "pr-" + base + (edit ? "-" + edit.name : "") + (after ? "-" + after.name : "") + "-" + s, (doc, theme) => { if (edit) edit(doc, theme); paintRows(doc); if (after) after(doc, theme); relayout(doc); drawLabels(doc); }).map((img) => { img.alt = alt || ""; return img; }); };
    // Valjean's color set by hand (the node inspector's edited state), written to Overrides
    function valjeanOverride(doc) {
        doc.querySelectorAll("circle").forEach((c) => { if (c.getAttribute("cx") === "698.7" && c.getAttribute("cy") === "394.3" && c.getAttribute("fill") !== "none") c.setAttribute("fill", "#E41A1C"); });
    }

    // ---------- the canvas ----------
    // Hot spots on the drawing: Valjean (node) and the Fantine to Valjean edge.
    function hotspots() {
        const v = byLabel("Valjean"), P = lmPos(), vp = P[L().rows.indexOf(v)], fp = P[L().rows.indexOf(byLabel("Fantine"))];
        const a = { x: +(vp[0] / 12).toFixed(2), y: +(vp[1] / 8).toFixed(2) };
        const node = AB.tip(h("span", { class: "ab-hot", style: `left:${a.x}%;top:${a.y}%` }), "Valjean", { second: `group ${v.group}, degree ${v.degree}` });
        // a click selects him as the walk does, so Shift+Arrow goes on from Valjean
        AB.selectHot(node, "lesmis", L().rows.indexOf(v));
        node.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); AB.go("context-menus", "node"); });
        // midpoint of Fantine (626.4, 181) to Valjean (698.7, 394.3) in the 1200 x 800 drawing.
        // graphty-element cannot pick edges (Edge.ts: isPickable = false): the edge opens from the table.
        // Notes are element API and enabled everywhere; noting an edge picked HERE is the one note
        // control that keeps the needs mark, because picking is a separate capability.
        const EDGE_PICK = "Picking an edge on the canvas, and so noting it from here, needs graphty-element. Open the edge from the table to note it.";
        // A design annotation, not a control: it explains a gap and hides with the design notes
        const edge = AB.tip(h("span", { class: "cs-edge", role: "note", "data-needs": "", "aria-label": "Fantine - Valjean: " + EDGE_PICK, style: `left:${((vp[0] + fp[0]) / 24).toFixed(2)}%;top:${((vp[1] + fp[1]) / 16).toFixed(2)}%` }), "Fantine - Valjean", { second: EDGE_PICK, label: false });
        return [node, edge];
    }

    // The one state card: icon and title, one sentence, at most one primary and one secondary button
    function card(o) {
        AB.toolbarDisabled = "Nothing is drawn";
        return h("div", { class: "k-canvas-card cs-card", role: o.role || "status", "aria-live": "polite" },
            h("div", { class: "k-canvas-card-title" }, icon(o.icon), h("span", null, o.title)),
            h("div", null, o.text),
            o.extra || null,
            h("div", { class: "k-canvas-card-acts" }, o.primary || null, o.secondary || null));
    }

    // ---------- a size layer's key ----------
    // The part is titled "Size: " plus the attribute's own name, the one name the hover, the walk and
    // the row use ("Size: degree" and "degree 34"). Five circles at round quantiles of the distinct
    // values, each at the size the drawing gives it: r(v) is the radius in the drawing's 1200-wide
    // viewBox, and trueSize() turns it into screen pixels from the stage's drawn width. The line under
    // them names the scale (square root: area follows the value; linear: the radius does), the range
    // with its column, and how the quantiles count repeated values.
    function sizeKey(name, vals, r, linear, go) {
        const nums = vals.filter((v) => typeof v === "number"), lo = Math.min(...nums), hi = Math.max(...nums);
        const rows = quantiles(nums).map((v) => ({ swatch: h("span", { class: "cs-true-box" }, h("span", { class: "ab-dot cs-true", "data-r": r(v) })), label: AB.num(v), go }));
        const col = name.length > SIZE_CUT ? AB.truncMiddle(name, SIZE_CUT).textContent : name;
        return { title: "Size: " + name, go, rows, sub: (linear ? "Linear scale (radius): " : "Square root scale (area): ") + AB.range(lo, hi, col) + ". Circles at quantiles of the distinct values; repeated values count once." };
    }
    // A size key's title takes the middle ellipsis at 24 characters, the cut the row's inspector header
    // uses, so the name reads the same in both; the full name is in its tooltip
    const SIZE_CUT = 24;
    function trueSize(stage, card) {
        if (!card || !card.querySelector(".cs-true")) return;
        card.querySelectorAll(".k-lg-title").forEach((t) => { const m = t.textContent.match(/^Size: (.+)$/); if (m && m[1].length > SIZE_CUT) t.replaceChildren("Size: ", AB.truncMiddle(m[1], SIZE_CUT)); });
        const set = () => {
            const k = stage.clientWidth / 1200;
            if (!k) return;
            const dots = [...card.querySelectorAll(".cs-true")], big = Math.max(...dots.map((d) => 2 * d.dataset.r * k));
            dots.forEach((d) => { d.style.width = d.style.height = (2 * d.dataset.r * k).toFixed(1) + "px"; d.parentNode.style.width = big.toFixed(1) + "px"; });
        };
        new ResizeObserver(set).observe(stage);
    }
    // Five round quantiles (0, 25, 50, 75 and 100 percent) of the DISTINCT values, so a value most
    // nodes share does not take every circle: the ends exact, the middle three rounded to two
    // significant digits (whole numbers for whole-number data), repeats dropped
    function quantiles(nums) {
        const d = [...new Set(nums)].sort((a, b) => a - b), whole = d.every(Number.isInteger);
        if (d.length <= 5) return d;
        const at = (q) => { const x = q * (d.length - 1), i = Math.floor(x); return d[i] + (d[Math.min(i + 1, d.length - 1)] - d[i]) * (x - i); };
        const nice = (v) => { const r = +v.toPrecision(2); return whole ? Math.round(r) : r; };
        return [...new Set([d[0], nice(at(0.25)), nice(at(0.5)), nice(at(0.75)), d[d.length - 1]])];
    }

    // The legend for the drawing: the Color winner (colorWinner). Nothing sizes the nodes at rest (one
    // size), so the card has no size part until a row sizes them.
    function pagerankLegend() {
        const win = colorWinner(), sz = sizeBound(), parts = [];
        if (win === "Louvain" && AB.lesmisCommunities) {
            const run = ["inspector-run-row", "style"];
            parts.push({ title: "Color: Louvain", go: run, rows: AB.lesmisCommunities.map((c) => ({ swatch: AB.chit(c.color, true), label: "Community " + c.n, count: AB.num(c.size), go: run })) });
        } else if (win && /^Betweenness/.test(win)) parts.push({ title: "Color: " + win, rows: [{ swatch: AB.ramp(BT_RAMP[0], BT_RAMP[1]), label: AB.range(0, btMax(), "Betweenness") }] });
        else if (win) {
            const go = ["inspector-measure-row", "style"];
            parts.push({ title: "Color: PageRank", go, rows: [{ swatch: h("b", { class: "k-ramp k-ramp-measure" }), label: AB.range(PR_DOMAIN[0], PR_DOMAIN[1], "PageRank"), go }] });
        }
        if (sz) parts.push({ title: "Size: " + sz.name }); // the legend adds the bound range under it
        return AB.legendCard(parts);
    }

    // What the size layer reads on one node, as hover and selection say it ("degree 36"). `cut`: the
    // name as the legend title and the row's inspector cut it (the hover bubble); spoken text keeps it whole
    function sizeValue(ds, i, cut) {
        const nm = (t) => (cut && t.length > SIZE_CUT ? AB.truncMiddle(t, SIZE_CUT).textContent : t);
        if (ds === "lesmis") return L().rows[i] ? "degree " + L().rows[i].degree : null;
        if (!["wide", "nested", "plainJson"].includes(ds)) return null;
        const g = otherGraph(ds);
        if (ds === "wide" && AB.route && SIZED.includes(AB.route.state)) return g.size[i] != null ? nm(LONG) + " " + AB.num(g.size[i]) : null;
        const p = AB.paintOf(ds, "Size", "node");
        if (!p || p.type !== "num" || g.ntab[i] !== p.table) return null;
        const v = AB.valueAt(g.nrec[i], p.name);
        return typeof v === "number" ? nm(p.name) + " " + AB.num(v) : null;
    }

    // ---------- the keyboard walk (graphty-element's canvas keys; owner decision for Shift+Arrow) ----------
    // With focus on the drawing, Shift+Arrow walks between NEIGHBORS: Shift+Down (or Shift+Right at the
    // start) steps into the neighbors of the node the walk is on, Shift+Right and Shift+Left go to the next
    // and previous neighbor of the node stepped from, and Shift+Enter (Shift+Up too) steps back along the
    // walk. Plain arrows stay graphty-element's camera keys (orbit in 3D, pan in 2D). O switches the
    // neighbor order (edge weight where the project sets a weight, degree, name), ] and [ walk the members
    // of a set holding the node, Space takes the node in or out of the selection. The first Esc ends the
    // walk and keeps the selection and focus on the drawing (the path is kept, so Shift+Arrow goes on from
    // it); the next Esc is the shell's: it clears the selection. Tab leaves the drawing.
    // Each step selects the node it lands on through the shell (AB.selectNode: the node inspector and
    // the selection bar). The focus pill above the toolbar shows the node's values, its place among the
    // neighbors and the order, with the order's switch.
    // ponytail: neighbor lists come from the drawings' edges here; graphty-element's walk reports them.
    // The transfers and the door entries are drawn without their edges, so their walk keeps going to the
    // nearest node in the direction pressed.
    let regSel = -1; // the package registry has no node inspector, so its walk keeps its own selection
    const CENTER = [600, 400];
    const LM_POS = Object.keys(PAGERANK).map((k) => k.split(",").map(Number)); // the drawing's circles, in row order
    // Les Miserables' neighbors, read once from the kit's drawing so the walk never waits for a redraw
    const lmReady = fetch("kit/canvas/lesmis-groups-rest-light.svg").then((r) => r.text()).then((t) => lmAdj(new DOMParser().parseFromString(t, "image/svg+xml"))).catch(() => {});
    const sunflower = (n, gap) => Array.from({ length: n }, (_, i) => { const r = gap * Math.sqrt(i), t = i * 2.39996; return [600 + r * Math.cos(t), 400 + r * Math.sin(t) * 0.92]; });
    function walkPos(ds) {
        if (ds === "lesmis") return lmPos();
        if (ds === "registry") return registryGeo().pos;
        if (["wide", "nested", "plainJson"].includes(ds)) return otherGraph(ds).pos;
        if (ds === "doorEntries") {
            if (!doorPos) doorSvg("light", AB.fx.datasets.doorEntries.loaded.per === "nodes");
            let p = 0, b = 0;
            return AB.walkList(ds).map((w) => (/door-ana$/.test(w.at) ? doorPos.dots[p++] : doorPos.B[b++]));
        }
        // ponytail: the transfers drawing is a density image with no node positions, so its accounts
        // sit on a made-up sunflower in file order; the element reports real positions
        return sunflower(AB.walkList(ds).length, 40);
    }
    // The node the selection holds on this drawing, or -1
    function current(ds) {
        if (ds === "registry") return regSel;
        if (AB.walked && AB.walked.dataset === ds) return AB.walked.index;
        // an inspector showing a node with no walk yet: the drawing's own hot spot node (Valjean, monitor-prod-iad-03)
        if (!String((AB.route && AB.route.frame.right) || "").startsWith("inspector-node/")) return -1;
        return ds === "lesmis" ? L().rows.indexOf(byLabel("Valjean")) : HOT[ds] ? HOT[ds](AB.fx.datasets[ds]) : -1;
    }
    function nextIn(pos, from, dx, dy, skip) {
        let best = -1, score = Infinity;
        pos.forEach((p, i) => {
            if (!p || skip(i)) return;
            const vx = p[0] - from[0], vy = p[1] - from[1], ahead = vx * dx + vy * dy;
            const side = Math.abs(vx * dy - vy * dx);
            if (ahead <= 0.5 || side > ahead) return;
            const s = ahead + 2 * side;
            if (s < score) { score = s; best = i; }
        });
        return best;
    }
    // ponytail: the skeleton holds names for 8 of the registry's packages, so a walked package is named by its place
    function registryName(i) { return "Package " + AB.num(i + 1) + " of " + AB.num(registryGeo().pos.length); }
    const nameAt = (ds, i) => (ds === "registry" ? registryName(i) : (AB.walkList(ds)[i] || {}).name || "");
    const walkLen = (ds) => (ds === "registry" ? registryGeo().pos.length : AB.walkList(ds).length);
    const degreeAt = (ds, i) => (ds === "lesmis" ? L().rows[i].degree : ds === "registry" ? registryGeo().deg[i] : (AB.walkList(ds)[i] || {}).neighbors || 0);
    // The edge column the project weighs its edges by (its Weight role), or null. Les Miserables weighs
    // its edges by value, as the graph inspector's Weight line says ("value, stronger")
    function weightCol(ds) {
        if (ds === "lesmis") return "value";
        if (!["wide", "nested", "plainJson"].includes(ds)) return null;
        const f = AB.fieldsOf(ds).flatMap((g) => g.fields || []).find((x) => /Weight/.test(x.usedBy || ""));
        return f ? f.name : null;
    }
    // Les Miserables' published edge values (networkx les_miserables_graph, Knuth 1993), in the order of
    // AB.fx.datasets.lesmis.edgeList; the kit's fixtures list the edges without them.
    // ponytail: typed here until the kit's fixture carries each edge's value; graphty-element reports them
    const LM_VALUES = "1 8 10 6 1 1 1 1 2 1 1 3 3 5 1 1 1 1 4 4 4 4 4 4 3 3 3 4 3 3 3 3 5 3 3 3 3 4 4 3 3 3 3 4 4 4 2 9 2 7 13 1 12 4 31 1 1 17 5 5 1 1 8 1 1 1 2 1 2 3 2 1 1 2 1 3 2 3 3 2 2 2 2 1 2 2 2 2 1 2 2 2 2 2 1 1 1 2 3 2 2 1 3 1 1 3 1 2 1 2 1 1 1 3 2 1 1 9 2 2 1 1 1 2 1 1 6 12 1 1 21 19 1 2 5 4 1 1 1 1 1 7 7 6 1 4 15 5 6 2 1 4 2 2 6 2 5 1 1 9 17 13 7 2 1 6 3 5 5 6 2 4 3 2 1 5 12 5 4 10 6 2 9 1 1 5 7 3 5 5 5 2 5 1 2 3 3 1 2 2 1 1 1 1 3 5 1 1 1 1 1 6 6 1 1 2 1 1 4 4 4 1 1 1 1 1 1 2 2 2 1 1 1 1 2 1 1 2 2 3 3 3 3 1 1 1 1 1 1 1 1 1 1 1".split(" ").map(Number);
    let lmWeight = null; // "a-b" (row ids) -> value
    function lmEdge(a, b) {
        if (!lmWeight) { lmWeight = new Map(); L().edgeList.forEach(([x, y], k) => { lmWeight.set(x + "-" + y, LM_VALUES[k]); lmWeight.set(y + "-" + x, LM_VALUES[k]); }); }
        const id = (i) => L().rows[i].id, v = lmWeight.get(id(a) + "-" + id(b));
        return v == null ? null : { value: v };
    }
    // Each node's neighbors as [index, edge record or null]; null where the drawing holds no edges
    const adjCache = {};
    function adjacency(ds) {
        if (ds === "lesmis") return LM_ADJ ? (adjCache.lesmis || (adjCache.lesmis = LM_ADJ.map((l, i) => l.map((j) => [j, lmEdge(i, j)])))) : null;
        if (ds === "registry") { const G = registryGeo(), out = G.pos.map(() => []); G.pairs.forEach(([a, b]) => { out[a].push([b, null]); out[b].push([a, null]); }); return out; }
        if (!["wide", "nested", "plainJson"].includes(ds)) return null;
        const g = otherGraph(ds);
        if (adjCache[ds] && adjCache[ds].g === g) return adjCache[ds].adj;
        const n = walkLen(ds), out = Array.from({ length: n }, () => []);
        // only nodes the walk can select (the nested project walks its researchers)
        g.edges.forEach(([a, b, rec]) => { if (a < n && b < n && a !== b) { out[a].push([b, rec]); out[b].push([a, rec]); } });
        adjCache[ds] = { g, adj: out };
        return out;
    }
    const ORDERS = { weight: "Edge weight", degree: "Degree", name: "Name" };
    const ORDER_WORD = { weight: "by edge weight, highest first", degree: "by degree, highest first", name: "by name, A to Z" };
    const ordersOf = (ds) => (weightCol(ds) ? ["weight", "degree", "name"] : ["degree", "name"]);
    // The neighbors of node i in the walk's order, each [index, weight or null], one entry per neighbor
    function neighbors(ds, i) {
        const adj = adjacency(ds);
        if (!adj || !adj[i]) return null;
        const col = weightCol(ds), best = new Map();
        adj[i].forEach(([j, rec]) => { const v = col && rec ? AB.valueAt(rec, col) : null, w = typeof v === "number" ? v : null; if (!best.has(j) || (w != null && (best.get(j) == null || w > best.get(j)))) best.set(j, w); });
        const byName = (a, b) => nameAt(ds, a[0]).localeCompare(nameAt(ds, b[0]));
        const l = [...best.entries()];
        if (W.order === "weight") l.sort((a, b) => (b[1] == null ? -Infinity : b[1]) - (a[1] == null ? -Infinity : a[1]) || byName(a, b));
        else if (W.order === "degree") l.sort((a, b) => degreeAt(ds, b[0]) - degreeAt(ds, a[0]) || byName(a, b));
        else l.sort(byName);
        return l;
    }
    // The sets a node can be walked through with ] and [, in the tree's order: Les Miserables' kept
    // groups and Top 9 by degree, the research network's kept set while its row shows
    function setsOf(ds) {
        if (ds === "lesmis") {
            const R = L().rows, cut = [...R].sort((a, b) => b.degree - a.degree)[8].degree, idx = (f) => R.map((r, i) => (f(r) ? i : -1)).filter((i) => i >= 0);
            return [{ name: "Group 2", members: idx((r) => r.group === 2) }, { name: "Group 8", members: idx((r) => r.group === 8) }, { name: "Top " + idx((r) => r.degree >= cut).length + " by degree", members: idx((r) => r.degree >= cut) }];
        }
        if (ds === "nested" && /nested-set$/.test((AB.route && AB.route.frame.left) || "")) return [{ name: SET.name, members: setMembers(AB.fx.datasets.nested) }];
        return [];
    }
    // The walk: its project, the path from its start (each step { i, set }: set names a ] or [ jump),
    // whether it is on, the order, and `off` while Space has taken the node out of the selection
    // `teach`: this walk is the project's first, so its pill carries the keys hint (null until the walk turns on);
    // `told`: the spoken hint has been said in this walk. The hint teaches once per project, remembered in this browser.
    const W = { ds: null, path: [], on: false, order: null, off: false, told: false, teach: null };
    function teachOnce(ds) {
        if (W.teach !== null) return;
        W.teach = AB.mem.get("walk.taught." + ds) !== "1";
        AB.mem.set("walk.taught." + ds, "1");
    }
    const top = () => W.path[W.path.length - 1];
    function startAt(ds, i) { Object.assign(W, { ds, path: i >= 0 ? [{ i, set: null }] : [], on: false, off: false, told: false, teach: null, order: W.ds === ds && W.order ? W.order : ordersOf(ds)[0] }); }
    // The entry with nothing selected: the drawn node with the most neighbors, ties to the first
    function entry(ds) { let best = 0; for (let i = 1; i < walkLen(ds); i++) if (degreeAt(ds, i) > degreeAt(ds, best)) best = i; return best; }
    // Keep the walk in step with the selection: another node selected some other way starts a new walk
    // there; a cleared selection ends it (the path is kept); the walked route opens two steps in
    function syncWalk(ds, state) {
        const sel = current(ds);
        if (W.ds !== ds) startAt(ds, sel);
        else if (sel >= 0 && (!top() || top().i !== sel)) startAt(ds, sel);
        else if (sel < 0 && !W.off) W.on = false;
        if (state === "walked" && sel >= 0 && W.path.length < 2) {
            const nb = neighbors(ds, sel), here = location.hash;
            if (nb && nb.length) { W.path = [{ i: nb[0][0], set: null }, { i: sel, set: null }]; W.on = true; W.told = true; teachOnce(ds); }
            else if (!nb && ds === "lesmis") lmReady.then(() => { if (location.hash === here && LM_ADJ) { syncWalk(ds, state); redrawPill(); } });
        }
    }
    const selectedNow = (ds, i) => current(ds) === i;
    // The node the walk is on (else the selected one) and whether it is selected
    function focusOn(ds) {
        const i = W.on && W.ds === ds && top() ? top().i : current(ds);
        return { i, sel: i >= 0 && selectedNow(ds, i) };
    }
    // Where the node the walk is on sits: "neighbor 3 of 10", "member 2 of 14 in Group 2", the start
    function placeOf(ds) {
        const k = W.path.length - 1, s = top();
        if (!s) return null;
        if (s.set) { const set = setsOf(ds).find((x) => x.name === s.set); return set ? { text: "member " + (set.members.indexOf(s.i) + 1) + " of " + set.members.length + " in " + s.set } : null; }
        if (k === 0) return { text: "start of the walk" };
        const from = W.path[k - 1].i, nb = neighbors(ds, from);
        if (!nb) return { text: "next node from " + nameAt(ds, from), from };
        const at = nb.findIndex((x) => x[0] === s.i);
        return { text: "neighbor " + (at + 1) + " of " + nb.length, from, w: at >= 0 ? nb[at][1] : null };
    }
    // The node's values, each named by its column ("degree 36", "group 2", "bytes_total_24h 4,120")
    function valuesOf(ds, i, p) {
        const out = [], col = weightCol(ds);
        if (p && p.w != null && col) out.push(col + " " + AB.num(p.w));
        if (ds === "lesmis") { const r = L().rows[i]; out.push("degree " + r.degree, "group " + r.group, "PageRank " + AB.num(PAGERANK[LM_POS[i].join(",")])); return out; }
        const sv = sizeValue(ds, i, true);
        if (sv) out.push(sv);
        out.push(AB.count(degreeAt(ds, i), "neighbor"));
        return out;
    }
    function say(ds, i, lead) {
        const p = placeOf(ds);
        return [lead, [nameAt(ds, i), p && p.text, p && p.from != null ? "from " + nameAt(ds, p.from) : null].filter(Boolean).join(", ") + ".", valuesOf(ds, i, p).join(", ") + (selectedNow(ds, i) ? ", selected." : ", not selected.")].filter(Boolean).join(" ");
    }
    // Land on node i: select it as the shell selects (or the registry's own selection), then announce
    function land(ds, i, lead) {
        W.on = true;
        W.off = false;
        teachOnce(ds);
        const first = W.teach && !W.told;
        W.told = true;
        const text = say(ds, i, lead) + (first ? " Shift+Enter goes back, O changes the order, Space selects, Esc ends the walk." : "");
        if (ds === "registry") { regSel = i; AB.render(); refocus(); }
        else AB.selectNode(ds, i);
        setTimeout(() => AB.announce(text), 150);
    }
    function redrawPill() { const el = document.querySelector("#ab-canvas"); if (el) drawPill(el); }
    // The walk's keys on one drawing. live() also names the project drawn, for clearClick
    let liveDs = null;
    function live(stage, ds, hidden, state) {
        liveDs = ds;
        syncWalk(ds, state);
        const skip = (j) => hidden && hidden(j);
        stage.addEventListener("keydown", (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const key = e.key, shift = e.shiftKey;
            const handled = () => { e.preventDefault(); e.stopPropagation(); };
            if (/^Arrow/.test(key) && !shift) { handled(); AB.flash((AB.route.frame.mode === "2d" ? "Arrows pan the view" : "Arrows orbit the camera") + ". Shift+Arrow walks to a neighbor."); return; }
            const back = shift && (key === "Enter" || key === "ArrowUp");
            if (back) {
                handled();
                if (W.path.length > 1) { W.path.pop(); land(ds, top().i, "Back to"); }
                else AB.announce(top() ? "At the start of the walk, " + nameAt(ds, top().i) + "." : "Shift+Down walks from " + nameAt(ds, entry(ds)) + ".");
                return;
            }
            if (shift && /^Arrow(Down|Right|Left)$/.test(key)) {
                handled();
                if (!walkLen(ds)) { AB.flash("Nothing is drawn to walk through"); return; }
                if (!W.path.length) W.path = [{ i: entry(ds), set: null }];
                const into = key === "ArrowDown" || (key === "ArrowRight" && (W.path.length === 1 || top().set));
                if (key === "ArrowLeft" && (W.path.length === 1 || top().set)) { AB.announce("Shift+Down walks into the neighbors of " + nameAt(ds, top().i) + "."); return; }
                const from = into ? top().i : W.path[W.path.length - 2].i, nb = neighbors(ds, from);
                if (!nb) {
                    // no edges drawn: the nearest node in the direction pressed
                    const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1] }[key], pos = walkPos(ds), cur = top().i;
                    const i = nextIn(pos, pos[cur] || CENTER, dir[0], dir[1], (j) => j === cur || skip(j));
                    if (i < 0) { AB.flash("No node further " + key.slice(5).toLowerCase()); return; }
                    W.path.push({ i, set: null });
                    land(ds, i);
                    return;
                }
                const list = nb.filter(([j]) => !skip(j));
                if (!list.length) { AB.announce(nameAt(ds, from) + " has no neighbors drawn."); return; }
                if (into) { W.path.push({ i: list[0][0], set: null }); land(ds, list[0][0]); return; }
                const at = list.findIndex((x) => x[0] === top().i), j = at + (key === "ArrowRight" ? 1 : -1);
                if (j < 0 || j >= list.length) { AB.announce(j < 0 ? "First neighbor of " + nameAt(ds, from) + "." : "Last neighbor of " + nameAt(ds, from) + "."); return; }
                top().i = list[j][0];
                land(ds, top().i);
                return;
            }
            if (key === " " && !shift) {
                handled();
                const s = top();
                if (!s) { AB.announce("Shift+Down walks from " + nameAt(ds, entry(ds)) + ". Space then selects the node the walk is on."); return; }
                W.on = true;
                if (selectedNow(ds, s.i)) {
                    W.off = true;
                    AB.announce(nameAt(ds, s.i) + " removed from the selection.");
                    if (ds === "registry") { regSel = -1; AB.render(); } else AB.clearSelection();
                    refocus();
                } else land(ds, s.i, "Selected:");
                return;
            }
            if ((key === "o" || key === "O") && !shift) {
                handled();
                const os = ordersOf(ds);
                setOrder(ds, os[(os.indexOf(W.order) + 1) % os.length]);
                return;
            }
            if (key === "]" || key === "[") {
                handled();
                const at = top() ? top().i : entry(ds), sets = setsOf(ds), s = top();
                const set = (s && s.set && sets.find((x) => x.name === s.set)) || sets.find((x) => x.members.includes(at));
                if (!set) { AB.announce(nameAt(ds, at) + " is in no set. ] and [ walk the members of a set."); return; }
                const cur = set.members.indexOf(at), n = set.members.length;
                const i = key === "]" ? (cur < 0 ? 0 : Math.min(n - 1, cur + 1)) : (cur < 0 ? n - 1 : Math.max(0, cur - 1));
                if (cur === i) { AB.announce((i === n - 1 ? "Last" : "First") + " member of " + set.name + "."); return; }
                if (!W.path.length) W.path = [{ i: at, set: null }];
                if (s && s.set === set.name) s.i = set.members[i];
                else W.path.push({ i: set.members[i], set: set.name });
                land(ds, set.members[i]);
                return;
            }
            if (key === "Escape" && W.on) {
                // the shell skips an Esc a handler took (defaultPrevented), so the selection stays
                e.preventDefault();
                W.on = false;
                W.off = false;
                const s = top();
                document.querySelectorAll("#ab-canvas .cs-pill").forEach((x) => x.remove());
                AB.announce("Walk ended" + (s ? " at " + nameAt(ds, s.i) : "") + ". Focus stays on the drawing; Esc again clears the selection.");
            }
        });
    }
    // A new order: the node stepped from is kept and the walk goes to its first neighbor in that order
    function setOrder(ds, o) {
        W.order = o;
        const k = W.path.length - 1;
        if (W.on && k > 0 && !top().set) {
            const nb = neighbors(ds, W.path[k - 1].i);
            if (nb && nb.length) { W.path = W.path.slice(0, k); W.path.push({ i: nb[0][0], set: null }); land(ds, nb[0][0], "Neighbors " + ORDER_WORD[o] + "."); return; }
        }
        AB.announce("Neighbors " + ORDER_WORD[o] + ".");
        redrawPill();
        refocus();
    }
    // The focus pill: the node the walk is on, its place, its values named by column, the order and its
    // switch, one line of keys. In the secondary bar's place, right above the toolbar and its selection bar.
    let placePill = null, noticeWatch = null;
    function drawPill(el) {
        el.querySelectorAll(".cs-pill").forEach((x) => x.remove());
        const ds = liveDs, s = top();
        if (!ds || W.ds !== ds || !W.on || !s) return;
        if (ds === "lesmis" && !LM_ADJ) { lmReady.then(() => { if (el.isConnected) drawPill(el); }); return; }
        const i = s.i, p = placeOf(ds), sel = selectedNow(ds, i), os = ordersOf(ds);
        const count = sel ? AB.count(1, "node") + " selected" : "nothing selected";
        const order = AB.seg(os.map((o) => [o, ORDERS[o]]), W.order, (o) => setOrder(ds, o), { label: "Neighbor order" });
        const pill = h("div", { class: "k-secondary-bar cs-pill", role: "group", "aria-label": "Walk: " + nameAt(ds, i) },
            h("div", { class: "cs-pr" }, h("b", null, nameAt(ds, i)), sel ? h("span", { class: "k-badge" }, "selected") : null, h("span", { class: "k-grow" }), h("span", { class: "k-secondary" }, count)),
            p ? h("div", { class: "cs-pr" }, h("span", { class: "k-num" }, p.text), p.from != null ? h("span", { class: "k-secondary" }, "from " + nameAt(ds, p.from)) : null) : null,
            h("div", { class: "cs-pr k-num" }, valuesOf(ds, i, p).join(", ")),
            h("div", { class: "cs-pr" }, h("span", null, "Neighbors by"), order, h("span", { class: "k-kbd" }, "O"), os.includes("weight") ? null : h("span", { class: "k-secondary" }, "no edge weight set")),
            W.teach ? h("div", { class: "cs-pr cs-hint k-secondary" }, "Shift+Arrow: next neighbor. Space: select. ?: keys.") : null);
        // a click on the switch keeps the walk: focus goes back to the drawing
        pill.addEventListener("mousedown", (e) => e.preventDefault());
        el.append(pill);
        // right above whatever the toolbar column shows (the selection bar, then the toolbar)
        // and above the notice while one shows (the notice sits in the same place), so it never hides the pill
        const place = () => {
            if (!pill.isConnected) return;
            const tb = document.getElementById("ab-toolbar"), c = el.getBoundingClientRect(), t = tb && tb.getBoundingClientRect();
            const nt = document.getElementById("ab-notice"), N = nt && nt.firstChild ? nt.getBoundingClientRect() : null;
            const top = Math.min(t && t.height ? t.top : c.bottom - 64, N && N.height ? N.top : Infinity);
            pill.style.bottom = c.bottom - top + 8 + "px";
        };
        placePill = place;
        const slot = document.getElementById("ab-notice");
        if (slot && !noticeWatch) (noticeWatch = new MutationObserver(() => requestAnimationFrame(() => requestAnimationFrame(() => placePill && placePill())))).observe(slot, { childList: true, attributes: true, attributeFilter: ["style"] });
        place();
        requestAnimationFrame(place);
        setTimeout(place, 120);
    }
    // A click on empty canvas clears the selection through the shell (AB.clearSelection, which raises
    // the one "Selection cleared" notice with Bring it back). The package registry keeps its own
    // selection (regSel), so its click clears that one here.
    let clearHandler = null;
    function clearClick(el) {
        if (clearHandler) el.removeEventListener("click", clearHandler);
        clearHandler = (e) => {
            const t = e.target;
            if (liveDs !== "registry" || regSel < 0 || t.closest("[data-picking]") || !(t.classList.contains("k-stage") || t.classList.contains("k-canvas") || t === el || (t.tagName === "IMG" && t.closest(".k-stage")))) return;
            regSel = -1;
            AB.render();
            refocus();
            AB.announce("Selection cleared");
        };
        el.addEventListener("click", clearHandler);
    }
    const refocus = () => setTimeout(() => { const s = document.querySelector("#ab-canvas .k-stage"); if (s) s.focus({ preventScroll: true }); }, 50);

    // Group 2's two label lines (the label-two state: name above, degree below, the owner's example),
    // drawn on its three nodes of highest degree so the picture matches the Label section (Valjean 36,
    // Bamatabois 8, Champmathieu 7; the drawing's circles are in row order).
    function groupTwoLabels(doc) {
        const pairs = nodePairs(doc), g2 = ["Valjean", "Bamatabois", "Champmathieu"].map((n) => pairs[L().rows.indexOf(byLabel(n))]);
        const texts = doc.querySelector("g[font-family]");
        if (!texts) return;
        texts.querySelectorAll("text").forEach((t) => { if (t.textContent.trim() === "Valjean") t.remove(); });
        const add = (x, y, s) => { const t = doc.createElementNS("http://www.w3.org/2000/svg", "text"); t.setAttribute("x", x); t.setAttribute("y", y); t.setAttribute("text-anchor", "middle"); t.textContent = s; texts.append(t); };
        [["Valjean", "36"], ["Bamatabois", "8"], ["Champmathieu", "7"]].forEach(([name, count], i) => {
            const p = g2[i];
            if (!p) return;
            const r = +p.c.getAttribute("r");
            add(p.x, p.y - r - 5, name);
            add(p.x, p.y + r + 14, count);
        });
    }
    // Label by degree: the new degree row writes Label Above on every node, so each circle carries its
    // degree (the drawing's circles are in the fixture's row order) and no name
    function degreeLabels(doc) {
        const texts = doc.querySelector("g[font-family]");
        if (!texts) return;
        texts.replaceChildren();
        const rows = L().rows;
        nodePairs(doc).forEach((p, i) => {
            if (!rows[i]) return;
            const t = doc.createElementNS("http://www.w3.org/2000/svg", "text");
            t.setAttribute("x", p.x); t.setAttribute("y", p.y - +p.c.getAttribute("r") - 4); t.setAttribute("text-anchor", "middle");
            t.textContent = String(rows[i].degree);
            texts.append(t);
        });
    }
    function drawn(el, state) {
        // The group's name says what the drawing and its legend show: PageRank color, and at rest no size
        // layer, so every node is drawn at one size
        const alt = "Les Miserables colored by PageRank, every node one size";
        const stage = h("div", { class: "k-stage", role: "group", tabindex: "0", "aria-label": alt });
        const edited = AB.route && AB.route.frame.right === "inspector-node/edited";
        const labelTwo = AB.route && AB.route.id === "inspector-group-set-path-row" && AB.route.state === "label-two";
        const labelBy = AB.route && AB.route.id === "inspector-group-set-path-row" && AB.route.state === "label-by";
        // The node the walk is on carries the selection ring, dashed while Space has taken it out of the
        // selection (the drawing's circles are in row order)
        syncWalk("lesmis", state);
        const fo = focusOn("lesmis"), w = fo.i, rk = "walk" + w + (fo.sel ? "" : "-focus");
        if (w >= 0) stage.setAttribute("aria-label", alt + "; " + nameAt("lesmis", w) + (fo.sel ? " selected, " : ", not selected, ") + sizeValue("lesmis", w));
        const walkRing = w < 0 ? null : { [rk]: (doc, theme) => { const p = nodePairs(doc)[w]; if (p) new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${ringSvg(p.x, p.y, +p.c.getAttribute("r"), theme, !fo.sel)}</svg>`, "image/svg+xml").documentElement.childNodes.forEach((c) => doc.documentElement.append(doc.importNode(c, true))); } }[rk];
        // the row's label lines, once its Style tab shows them, replace the state's own fixed labels
        const own = () => !labelsOf("lesmis").length;
        const draw = () => AB.lesmisDrawing("lesmis-groups-onesize", alt + (labelTwo ? "; Group 2 labeled with names above and degree below" : labelBy ? "; every node labeled with its degree above it" : "") + (layoutMethod !== "Spread Out" ? "; laid out by " + layoutMethod : "") + (w >= 0 ? "; " + nameAt("lesmis", w) + (fo.sel ? " selected" : " not selected") : ""), state === "hidden-on-canvas" ? hideGroup0 : labelTwo && own() ? groupTwoLabels : labelBy && own() ? degreeLabels : null, edited ? valjeanOverride : walkRing);
        let imgs = draw(), lg = null;
        stage.append(...imgs);
        // a new method or label line: the drawing and the hot spots move to it; a row shown alone: its legend too
        restage = () => {
            const now = draw(), old = stage.querySelectorAll(":scope > img");
            now.forEach((img, i) => (old[i] ? old[i].replaceWith(img) : stage.append(img)));
            imgs = now;
            stage.querySelectorAll(".ab-hot, .cs-edge").forEach((x) => x.remove());
            stage.append(...hotspots());
            const nl = pagerankLegend();
            if (lg && lg.isConnected && nl) { lg.replaceWith(nl); lg = nl; }
        };
        // The selection bar swaps in its Valjean-selected drawing for any one-node selection (selection-bar.js
        // patchCanvas); a walked node is not Valjean, so the walked drawing is put back after it
        if (w >= 0) setTimeout(() => stage.querySelectorAll("img").forEach((img, i) => { if (imgs[i] && img !== imgs[i]) img.replaceWith(imgs[i]); }), 0);
        stage.append(...hotspots());
        lg = pagerankLegend();
        AB.append(el, [stage, lg]);
        trueSize(stage, lg);
        // group 0 is not drawn while it is hidden on canvas, so the walk passes over it
        live(stage, "lesmis", state === "hidden-on-canvas" ? (j) => L().rows[j] && L().rows[j].group === 0 : null, state);
        // The walked route opens as the second Shift+Arrow left it: focus on the drawing, the node announced
        if (state === "walked" && AB.walked) setTimeout(() => { if (stage.isConnected) { stage.focus({ preventScroll: true }); AB.announce(say("lesmis", AB.walked.index, "Walking the drawing.")); } }, 100);
        // Past the drawing limit the drawing loses detail, never the data: the table stays open and usable
        // (paged, sorted by the result that paints), and the notice points to it
        if (state === "less-detail") {
            AB.openDock();
            AB.notice("More than 10,000 nodes: drawn with less detail. The table below lists every node, sorted by degree.", { label: "Go to table", onClick: () => { const t = document.querySelector("#ab-dock [role=grid], #ab-dock table, #ab-dock [tabindex='0']"); if (t) { if (!t.hasAttribute("tabindex")) t.tabIndex = -1; t.focus(); } } });
        }
        if (state === "waiting-to-settle") AB.notice("Waiting for the layout to settle before capturing the image.", { label: "Cancel", go: ["export-image", "image"] });
    }

    // The transfers data, for the places that work on it (Data, the many-groups run, a full
    // selection): the density drawing, or colored by the March Louvain run with its legend
    function transfers(el, state) {
        const T = AB.fx.datasets.transactions;
        if (state !== "transfers-communities") {
            const pth = pathShown("transactions");
            const st = h("div", { class: "k-stage", role: "group", tabindex: "0", "aria-label": T.frame.altSized }, ...AB.drawing("transactions-density", T.frame.altSized));
            live(st, "transactions");
            turns(st);
            AB.append(el, [st, legend(pth ? [pth.legend] : [])]);
            if (state === "selection-full") {
                AB.notice("Selection is full: the first 5,000 of " + n(T.edges) + " matching transfers are selected.", { label: "Narrow the query", go: ["select-where", "where-error"] });
                AB.announce("Selection is full: 5,000 of " + n(T.edges) + " matching transfers selected.");
            }
            return;
        }
        const lg = AB.fx.datasets.transactionsApril.legends.march;
        const run = ["inspector-run-row", "many-groups"];
        const st = h("div", { class: "k-stage", role: "group", tabindex: "0", "aria-label": "Transfers, March: accounts colored by Louvain community" }, ...AB.drawing("transactions-march-communities", "Transfers, March: accounts colored by Louvain community"));
        live(st, "transactions");
        turns(st);
        AB.append(el, [
            st,
            AB.legendCard([...(pathShown("transactions") ? [pathShown("transactions").legend] : []), { title: "Color: Louvain", go: run, rows: lg.rows.map((r) => ({ swatch: r.color, label: r.name, count: n(r.count), go: run })), more: lg.other.communities + " more communities" }])]);
    }

    // ---------- the door entries (AB.fx.datasets.doorEntries) ----------
    // One drawing for the loaded door-entries graph, unstyled (no row paints yet, so the legend card
    // says so): 412 people and 9 buildings, and 1,306 person-building edges (One edge per: Pair, the
    // 32 unmatched rows left out). The kit has no drawing of this data and is read-only, so the layout
    // is generated here, seeded so it never changes: each person sits outside a "home" building and
    // links to it and two or three others; the 14 people with no entries sit on the outer ring.
    // Colors are the kit's unstyled Les Miserables drawing's (lesmis-plain): nothing paints.
    // Each entry as a node (asNodes): an entry dot sits between its person and its building, so a
    // pair's entries overlap at the middle of the pair's line.
    function doorSvg(theme, asNodes) {
        const D = AB.fx.datasets.doorEntries, R = D.report;
        const bg = theme === "dark" ? "#1E1E1E" : "#F5F5F5";
        let seed = 7;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const nB = D.tables[1].rows, nP = D.tables[0].rows, nIso = R.people.noEntries, nE = R.entries.pairEdges; // a Row load draws the same picture: repeated entries overlap their pair's edge
        const B = Array.from({ length: nB }, (_, i) => { const a = (i / nB) * 2 * Math.PI; return [600 + 150 * Math.cos(a), 400 + 150 * Math.sin(a)]; });
        const linked = nP - nIso, extra = nE - 3 * linked; // every linked person has 3 buildings, `extra` of them a 4th
        const lines = [], dots = [], mids = [];
        for (let p = 0; p < nP; p++) {
            if (p >= linked) { const a = rnd() * 2 * Math.PI; dots.push([600 + 370 * Math.cos(a), 400 + 340 * Math.sin(a)]); continue; }
            const home = p % nB, a = (home / nB) * 2 * Math.PI + (rnd() - 0.5) * 0.62, r = 215 + rnd() * 120;
            const xy = [600 + r * Math.cos(a), 400 + r * Math.sin(a) * 0.95];
            dots.push(xy);
            const to = new Set([home]);
            while (to.size < (p < extra ? 4 : 3)) to.add(Math.floor(rnd() * nB));
            to.forEach((b) => {
                lines.push(`<line x1="${xy[0].toFixed(1)}" y1="${xy[1].toFixed(1)}" x2="${B[b][0].toFixed(1)}" y2="${B[b][1].toFixed(1)}"/>`);
                if (asNodes) mids.push([(xy[0] + B[b][0]) / 2, (xy[1] + B[b][1]) / 2]);
            });
        }
        // the layout method turns the drawing (see turnPt)
        dots.splice(0, dots.length, ...dots.map(turnPt));
        B.splice(0, B.length, ...B.map(turnPt));
        for (let k = 0; k < lines.length; k++) lines[k] = lines[k].replace(/x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"/, (m, a, b, c, d) => { const p = turnPt([+a, +b]), q = turnPt([+c, +d]); return `x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}"`; });
        mids.splice(0, mids.length, ...mids.map(turnPt));
        doorFirst = dots[0]; // Ana Ruiz, the first person: the drawing's hot spot
        doorPos = { dots, B }; // the walk's directions
        const dot = ([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#808080"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.75" fill="none" stroke="${bg}" stroke-width="1.5"/>`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="${bg}"/>` +
            `<g stroke="#808080" stroke-width="0.6" stroke-opacity="0.22">${lines.join("")}</g>` +
            `<g fill="#808080" fill-opacity="0.7">${mids.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.8"/>`).join("")}</g>${dots.concat(B).map(dot).join("")}</svg>`;
    }
    const doorUrl = {};
    let doorFirst = null, doorPos = null;
    function door(el) {
        const D = AB.fx.datasets.doorEntries;
        const alt = D.graphName + ": " + n(D.loadedTypes().total) + " nodes (" + (D.loadedTypes().entry ? "people, buildings and entries" : "people and buildings") + ") and " + n(D.loadedEdges()) + " edges, unstyled";
        const asNodes = D.loaded.per === "nodes";
        if (!doorFirst || doorPos.method !== layoutMethod) { doorSvg("light", false); doorPos.method = layoutMethod; }
        const imgs = ["light", "dark"].map((t) => { const k = t + (asNodes ? "-nodes" : "") + "|" + layoutMethod; return h("img", { class: "k-" + t + "-only", alt, src: doorUrl[k] || (doorUrl[k] = URL.createObjectURL(new Blob([doorSvg(t, asNodes)], { type: "image/svg+xml" }))) }); });
        const pth = pathShown("doorEntries");
        const stage = h("div", { class: "k-stage", role: "group", tabindex: "0", "aria-label": alt + (pth ? "; the path " + pth.name + " painted orange through B1" : "") }, ...imgs);
        if (pth) {
            // The path just found, over the drawing: its people sit outside B1 (B1 is the first building, at 750, 400)
            const two = /^B\d+$/.test(pth.to) || /^B\d+$/.test(pth.from);
            const pts = (two ? [[885, 352], [750, 400]] : [[885, 352], [750, 400], [893, 458]]).map(turnPt).map((p) => p.map((v) => +v.toFixed(1)));
            const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
            svg.setAttribute("viewBox", "0 0 1200 800");
            svg.setAttribute("aria-hidden", "true");
            svg.innerHTML = `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#D55E00" stroke-width="3"/>` + pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#D55E00"/>`).join("");
            stage.append(svg);
        }
        const hot = hotNode("doorEntries", doorFirst, 4, 0);
        if (hot) stage.append(hot);
        // the walked person or building carries the selection ring
        const wi = AB.walked && AB.walked.dataset === "doorEntries" ? AB.walked.index : -1, wp = wi >= 0 ? walkPos("doorEntries")[wi] : null;
        if (wp) {
            const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
            svg.setAttribute("viewBox", "0 0 1200 800");
            svg.setAttribute("aria-hidden", "true");
            svg.innerHTML = `<circle cx="${wp[0]}" cy="${wp[1]}" r="7" fill="none" stroke="var(--k-mark-in)" stroke-width="2"/><circle cx="${wp[0]}" cy="${wp[1]}" r="9" fill="none" stroke="var(--k-mark-out)" stroke-width="2"/>`;
            stage.append(svg);
            stage.setAttribute("aria-label", alt + "; " + AB.walked.name + " selected");
        }
        live(stage, "doorEntries");
        restage = () => { el.replaceChildren(); door(el); };
        AB.append(el, [stage, legend(pth ? [pth.legend] : [])]);
    }
    // The path a Find path just added on the door entries or the transfers, while the tree shows it, or
    // its inspector does beside another place (the Notes place while a note on it is written or saved)
    function pathShown(ds) {
        const left = (AB.route && AB.route.frame.left) || "", right = String((AB.route && AB.route.frame.right) || "");
        const inspected = ds === "doorEntries" ? right === "inspector-group-set-path-row/path-door-entries" : /^inspector-group-set-path-row\/path(-style|-reversed|-tied|-notes)?$/.test(right);
        if (!(ds === "doorEntries" ? /door-entries-path$/ : /path-found$/).test(left) && !inspected) return null;
        const lp = AB.lastPath && AB.lastPath.ds === ds ? AB.lastPath : null, P = AB.fx.datasets.transactions.setsAndPaths.path;
        const from = lp ? lp.from : ds === "doorEntries" ? "Ana Ruiz" : P.from.id, to = lp ? lp.to : ds === "doorEntries" ? "Priya Nair" : P.to.id;
        const go = ["inspector-group-set-path-row", ds === "doorEntries" ? "path-door-entries" : "path"];
        return { from, to, name: from + " to " + to, legend: { title: "Color: Shortest paths", go, rows: [{ swatch: "#D55E00", label: from + " to " + to, go }] } };
    }
    // Loading what the Data page set up, per data set (the Les Miserables file, the door-entries tables, the transfers)
    function loadingCard(ds) {
        const ne = (nodes, edges) => AB.count(nodes, "node") + ", " + AB.count(edges, "edge") + "...";
        if (ds === "doorEntries") {
            const D = AB.fx.datasets.doorEntries;
            return { title: "Reading " + AB.count(D.tables.length, "table"), text: D.tables.map((t) => t.file).join(", ") + ": " + ne(D.loadedTypes().total, D.loadedEdges()) };
        }
        if (ds === "transactions") { const T = AB.fx.datasets.transactions; return { title: "Reading " + T.frame.file, text: ne(T.nodes, T.edges) }; }
        if (ds === "registry") { const R = AB.fx.datasets[AB.registryDataset()]; return { title: "Reading " + R.file, text: ne(R.nodes, R.edges) }; }
        return { title: "Reading miserables.gexf", text: ne(L().nodes, L().edges) };
    }

    // Everything hidden: only the two kept sets paint; the legend lists only what paints
    function everything(el) {
        const g = (lab) => L().frame.legend.rows.find((r) => r.label === lab);
        const stage = h("div", { class: "k-stage", role: "group", tabindex: "0", "aria-label": "Les Miserables with Everything hidden: only groups 2 and 8 are drawn, painted by their rows; the other nodes are not drawn but still take part in the layout" });
        stage.append(...derived("lesmis-groups-onesize", "everything-hidden-v3", everythingHidden));
        const part = (lab) => ({ title: "Color: Group " + lab, go: ["inspector-group-set-path-row", "kept-2"], rows: [{ swatch: g(lab).color, label: AB.count(g(lab).count, "node") }] });
        // the walk goes only over what is drawn
        live(stage, "lesmis", (j) => L().rows[j] && ![2, 8].includes(L().rows[j].group));
        AB.append(el, [stage, AB.legendCard([part("2"), part("8")])]);
        AB.notice("Everything is hidden: only nodes another row paints are drawn. Hidden nodes still shape the layout; filter to leave them out.", { label: "Filter...", go: ["data-place", "filters"] });
    }

    function loading(el, ds) {
        const c = loadingCard(ds);
        el.append(card({
            icon: "loader-circle", title: c.title,
            text: c.text,
            extra: h("div", { class: "k-progress", role: "progressbar", "aria-label": "Reading", "aria-valuenow": "60" }, h("i", { style: "width:60%" })),
            secondary: AB.button("Cancel", { kind: "secondary", go: ["start-screen", "returning"] }),
        }));
    }

    function empty(el) {
        el.append(card({ icon: "database", title: "No nodes to draw", text: "This graph is empty.", primary: AB.button(AB.cmd("add-data").label, { go: AB.cmd("add-data").go }) }));
    }

    // The project file the start screen and Open recent list for the patent citations
    const PATENT = { file: "Patent citations 1999-2001.graphty", project: "Patent citations 1999-2001", graphRow: "Citations" };
    function refused(el, state) {
        const c = C();
        el.append(card({
            role: "alert", icon: "triangle-alert", title: "Too large to draw",
            text: (state === "refused-project" ? PATENT.file : c.file) + " has " + n(c.nodes) + " nodes; a graph draws up to " + n(c.drawingLimit) + " nodes and 100,000 edges, so nothing was loaded.",
            primary: AB.button("Choose another file...", { go: AB.cmd("add-data").go }),
            secondary: AB.button("Details", { kind: "ghost", go: ["data-page", "refused-too-large"] }),
        }));
    }

    function gpuLost(el) {
        el.append(card({
            role: "alert", icon: "circle-x", title: "Canvas not available",
            text: "The graphics device was lost. The rows, table and inspector are unchanged.",
            primary: AB.button("Restart viewer", { go: ["canvas-and-states", "drawn"] }),
        }));
    }

    // The selection ring (the kit's --k-mark-out over --k-mark-in, as SVG colors per theme)
    // dashed: the node the walk is on while it is not selected
    function ringSvg(x, y, r, theme, dashed) {
        const [out, inn] = theme === "dark" ? ["#ffffff", "#1a1a1a"] : ["#1a1a1a", "#ffffff"], d = dashed ? ' stroke-dasharray="3 3"' : "";
        return `<circle cx="${x}" cy="${y}" r="${r + 3}" fill="none" stroke="${inn}" stroke-width="2"${d}/><circle cx="${x}" cy="${y}" r="${r + 5}" fill="none" stroke="${out}" stroke-width="2"${d}/>`;
    }

    // ---------- the wide, nested and plain JSON projects (kit/wide-nested.json) ----------
    // One route draws the project in AB.route.frame.dataset, unstyled (gray, as the door entries): the
    // hosts and their connections, the nested document's researchers and institutions with every id
    // link, or the 12-node plain JSON graph. The kit has no drawing of these, so the layout is made
    // here and never changes: each node sits in a sunflower spiral around its cluster (a host's role,
    // a researcher's first institution, with the institution at the center); clusters sit on an
    // ellipse; nodes with no edges on an outer ring. Node order is the walk's (the shell's walkNodes),
    // so the walked node gets the ring. `sized` sizes the hosts by the 46-character attribute.
    // ponytail: positions are made up, not graphty-element's layout; the element draws the real one.
    const LONG = "vuln_count_critical_unremediated_over_30_days";
    // the states that size the hosts by LONG; hosts-legend-hover also shows the hot node's hover readout
    const SIZED = ["hosts-legend", "hosts-legend-hover"];
    const VULN_RANGE = [0.5, 3]; // the measure row's Size range (inspector-measure-row/long-name)
    const graphs = new Map();
    function otherGraph(ds) {
        const D = AB.fx.datasets[ds];
        const NL = ds === "nested" ? AB.nestedLoaded() : null, ck = ds + (NL ? JSON.stringify(NL) : "") + "|" + layoutMethod;
        if (graphs.has(ck)) return graphs.get(ck);
        // nrec, ntab: each node's record and table; a pair's third item is its edge record and table
        let ids, keys, pairs, nrec, ntab;
        if (ds === "wide") {
            ids = D.nodeRows.map((r) => r.id);
            keys = D.nodeRows.map((r) => r.role);
            nrec = D.nodeRows;
            ntab = ids.map(() => "hosts");
            pairs = D.edgeRows.map((e) => [e.source, e.target, e, "connections"]);
        } else if (ds === "nested") {
            const R = D.document.data.researchers, I = D.document.data.institutions;
            ids = R.map((r) => r.id).concat(I.map((i) => i.id));
            keys = R.map((r) => (r.attributes.affiliations[0] || {}).institution_id || "none").concat(I.map((i) => i.id));
            nrec = R.concat(I);
            ntab = R.map(() => "researchers").concat(I.map(() => "institutions"));
            pairs = [];
            // the edges the last Load made: co-authors (Several edges), affiliations (Several rows), links
            R.forEach((r) => {
                if (NL.co === "edges") r.relationships.coauthor_ids.forEach((c) => { if (r.id < c) pairs.push([r.id, c]); });
                if (NL.aff === "rows") r.attributes.affiliations.forEach((a) => pairs.push([r.id, a.institution_id]));
            });
            if (NL.links) D.document.links.forEach((l) => pairs.push([l.source, l.target, l, "links"]));
        } else {
            ids = D.document.nodes.map((r) => r.id);
            keys = ids.map(() => "all");
            nrec = D.document.nodes;
            ntab = ids.map(() => "nodes");
            pairs = D.document.links.map((l) => [l.source, l.target, l, "links"]);
        }
        const at = new Map(ids.map((id, i) => [id, i]));
        const edges = pairs.map(([a, b, rec, tab]) => [at.get(a), at.get(b), rec || null, tab || null]).filter(([a, b]) => a != null && b != null);
        const deg = ids.map(() => 0);
        edges.forEach(([a, b]) => { deg[a]++; deg[b]++; });
        // clusters in first-seen order; a nested institution leads its own cluster (the spiral's center)
        const clusters = new Map();
        const order = ds === "nested" ? ids.map((_, i) => i).sort((a, b) => (ids[b] === keys[b]) - (ids[a] === keys[a])) : ids.map((_, i) => i);
        order.forEach((i) => { if (deg[i] === 0 && ds !== "plainJson") return; const k = keys[i]; if (!clusters.has(k)) clusters.set(k, []); clusters.get(k).push(i); });
        const pos = [], C = Array.from(clusters.values());
        const one = C.length === 1, gap = ds === "nested" ? 11 : 9;
        C.forEach((members, c) => {
            const a = (c / C.length) * 2 * Math.PI - Math.PI / 2;
            const cx = one ? 600 : 600 + 420 * Math.cos(a), cy = one ? 400 : 400 + 270 * Math.sin(a);
            members.forEach((i, k) => {
                if (one) { const b = (k / members.length) * 2 * Math.PI - Math.PI / 2; pos[i] = [600 + 260 * Math.cos(b), 400 + 260 * Math.sin(b)]; return; }
                const r = gap * Math.sqrt(k), t = k * 2.39996;
                pos[i] = [cx + r * Math.cos(t), cy + r * Math.sin(t)];
            });
        });
        const iso = ids.map((_, i) => i).filter((i) => !pos[i]);
        iso.forEach((i, k) => { const a = (k / iso.length) * 2 * Math.PI - Math.PI / 4; pos[i] = [600 + 560 * Math.cos(a), 400 + 370 * Math.sin(a)]; });
        const g = { pos: pos.map(turnPt), edges, nrec, ntab, size: ds === "wide" ? D.nodeRows.map((r) => r[LONG]) : null };
        graphs.set(ck, g);
        return g;
    }
    // What Color by and Size by paint (AB.painted; a row wins over Everything's line): per node a fill
    // and a radius, per edge a stroke and a width, and the legend's parts. Numbers run on the measure
    // ramp, fit to the data; categories take Okabe-Ito by count, the eighth and later "other".
    const CATS = ["#E69F00", "#56B4E9", "#009E73", "#0072B2", "#D55E00", "#CC79A7", "#F0E442"], OTHER = "#B0B0B0";
    function paintOf(ds) {
        const g = otherGraph(ds), out = { fill: null, rad: null, stroke: null, width: null, parts: [], words: [] };
        const scalar = (v) => (v == null || v === "" || typeof v === "object" ? null : v);
        // a line bound on a set's inspector paints that set's members only (the set's "Paints 23 nodes"), not the table
        const only = (p) => (ds === "nested" && p.on === SET.go.join("/") ? new Set(setMembers(AB.fx.datasets.nested)) : null);
        const read = (p, recs, tabs) => { const o = only(p); return recs.map((r, i) => (tabs[i] === p.table && (!o || o.has(i)) ? scalar(AB.valueAt(r, p.name)) : null)); };
        const go = (p) => (p.on === "row" ? ["inspector-measure-row", "painted-" + p.prop.toLowerCase()] : p.on.split("/"));
        const fmt = AB.num;
        const spec = (p, vals) => {
            const nums = vals.filter((v) => typeof v === "number");
            const title = p.prop === "Color" ? "Color: " : p.element === "edge" ? "Width: " : "Size: ";
            if (p.type === "num" && nums.length) {
                const lo = Math.min(...nums), hi = Math.max(...nums), t = (v) => (hi > lo ? (v - lo) / (hi - lo) : 0.5);
                return { t: (v) => (typeof v === "number" ? t(v) : null), part: { title: title + p.name, go: go(p), rows: [{ swatch: p.prop === "Color" ? AB.ramp(PR_STOPS[0], PR_STOPS[4]) : null, label: AB.range(lo, hi, p.name.length > SIZE_CUT ? AB.truncMiddle(p.name, SIZE_CUT).textContent : p.name), go: go(p) }] } };
            }
            const c = {};
            vals.forEach((v) => { if (v != null) c[v] = (c[v] || 0) + 1; });
            const top = Object.entries(c).sort((a, b) => b[1] - a[1]), col = Object.fromEntries(top.map(([v], i) => [v, CATS[i] || OTHER]));
            return { col: (v) => (v == null ? null : col[v]), part: { title: title + p.name, go: go(p), rows: top.slice(0, 7).map(([v, k]) => ({ swatch: col[v], label: AB.truncMiddle(String(v), 24), count: AB.num(k), go: go(p) })), more: top.length > 7 ? top.length - 7 + " more values" : null } };
        };
        const color = (p, vals) => { const sp = spec(p, vals); out.parts.push(sp.part); return vals.map((v) => (sp.col ? sp.col(v) : sp.t(v) == null ? null : rampAt(sp.t(v)))); };
        const size = (p, vals, from, to) => {
            const sp = spec(p, vals), nums = vals.filter((v) => typeof v === "number");
            // a node size row's key: true-size circles at round values (a width row keeps its range line)
            if (sp.t && p.element !== "edge") out.parts.push(sizeKey(p.name, nums, (v) => from + sp.t(v) * (to - from), true, go(p)));
            else out.parts.push(sp.part);
            return vals.map((v) => (sp.t && sp.t(v) != null ? from + sp.t(v) * (to - from) : null));
        };
        const nc = AB.paintOf(ds, "Color", "node"), ns = AB.paintOf(ds, "Size", "node"), ec = AB.paintOf(ds, "Color", "edge"), es = AB.paintOf(ds, "Size", "edge");
        if (nc) { out.fill = color(nc, read(nc, g.nrec, g.ntab)); out.words.push("nodes colored by " + nc.name); }
        if (ns && ns.type === "num") { out.rad = size(ns, read(ns, g.nrec, g.ntab), 4 * VULN_RANGE[0], 4 * VULN_RANGE[1]); out.words.push("nodes sized by " + ns.name); }
        if (ec) { out.stroke = color(ec, read(ec, g.edges.map((e) => e[2]), g.edges.map((e) => e[3]))); out.words.push("edges colored by " + ec.name); }
        if (es && es.type === "num") { out.width = size(es, read(es, g.edges.map((e) => e[2]), g.edges.map((e) => e[3])), 0.5, 4); out.words.push("edges sized by " + es.name); }
        return out;
    }
    function rampAt(t) {
        const x = t * (PR_STOPS.length - 1), i = Math.min(PR_STOPS.length - 2, Math.floor(x)), f = x - i;
        const a = PR_STOPS[i].match(/\w\w/g).map((y) => parseInt(y, 16)), b = PR_STOPS[i + 1].match(/\w\w/g).map((y) => parseInt(y, 16));
        return "#" + a.map((y, k) => Math.round(y + (b[k] - y) * f).toString(16).padStart(2, "0")).join("");
    }
    function otherSvg(ds, theme, sized, walked, fill, paint, labs, keep) {
        const g = otherGraph(ds), bg = theme === "dark" ? "#1E1E1E" : "#F5F5F5", f = (x) => x.toFixed(1);
        const P = paint || {};
        const rad = (i) => (P.rad && P.rad[i] != null ? P.rad[i] : sized ? 4 * (VULN_RANGE[0] + (g.size[i] / 6) * (VULN_RANGE[1] - VULN_RANGE[0])) : ds === "plainJson" ? 7 : 4);
        if (P.fill) fill = Object.assign({}, fill || {}, Object.fromEntries(P.fill.map((c, i) => [i, c]).filter(([, c]) => c)));
        // a painted edge draws in its own color at full opacity; the rest stay the quiet gray
        const lines = g.edges.map(([a, b], k) => {
            if (keep && !(keep.has(a) && keep.has(b))) return "";
            const c = P.stroke && P.stroke[k], w = P.width && P.width[k];
            return `<line x1="${f(g.pos[a][0])}" y1="${f(g.pos[a][1])}" x2="${f(g.pos[b][0])}" y2="${f(g.pos[b][1])}"${c ? ` stroke="${c}" stroke-opacity="0.9"` : ""}${w != null ? ` stroke-width="${f(w)}"` : ""}/>`;
        }).join("");
        // the largest last, so a small node is never hidden under a large one
        const order = g.pos.map((_, i) => i).filter((i) => !keep || keep.has(i)).sort((a, b) => rad(b) - rad(a));
        const dots = order.map((i) => `<circle cx="${f(g.pos[i][0])}" cy="${f(g.pos[i][1])}" r="${rad(i)}" fill="${(fill && fill[i]) || "#808080"}" stroke="${bg}" stroke-width="1.5"/>`).join("");
        const ring = walked >= 0 && g.pos[walked] ? ringSvg(f(g.pos[walked][0]), f(g.pos[walked][1]), rad(walked), theme) : "";
        const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
        const text = (labs || []).map(([x, y, anchor, t]) => `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}">${esc(t)}</text>`).join("");
        const tg = text ? `<g font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="11" fill="${theme === "dark" ? "#E6E6E6" : "#1A1A1A"}" stroke="${bg}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${text}</g>` : "";
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="${bg}"/>` +
            `<g stroke="#808080" stroke-width="${ds === "plainJson" ? 1.5 : 0.6}" stroke-opacity="${ds === "plainJson" ? 0.6 : 0.25}">${lines}</g>${dots}${ring}${tg}</svg>`;
    }
    const otherUrl = {};
    // The nested project's kept set (graph-place/nested-set): machine learning researchers with more
    // than 500 citations in 5 years, read from the fixture as the set's inspector reads them
    const SET = { name: "Machine learning researchers, more than 500 cites in 5 years", color: "#009E73", go: ["inspector-group-set-path-row", "long-name"] };
    const setMembers = (D) => D.document.data.researchers.map((r, i) => (r.attributes.profile.field === "machine learning" && r.attributes.profile.metrics.citations.last_5_years > 500 ? i : -1)).filter((i) => i >= 0);
    // One node per drawing is a hot spot, as Valjean is on Les Miserables: a click selects it (its node
    // inspector and the selection bar), the same selection the canvas walk makes
    const HOT = { wide: (D) => D.nodeRows.findIndex((r) => r.hostname === "monitor-prod-iad-03"), nested: () => 0, plainJson: () => 0 };
    function hotNode(ds, xy, r, idx) {
        const i = idx != null ? idx : HOT[ds] ? HOT[ds](AB.fx.datasets[ds]) : -1, w = AB.walkList(ds)[i];
        if (!w || !xy) return null;
        // hover reads what the size layer reads on this node ("degree 34"), then its neighbors
        const hot = AB.tip(AB.selectHot(h("span", { class: "ab-hot", style: `left:${(xy[0] / 12).toFixed(2)}%;top:${(xy[1] / 8).toFixed(2)}%;width:${Math.max(14, r * 2 + 6)}px;height:${Math.max(14, r * 2 + 6)}px` }), ds, i), w.name, { second: [sizeValue(ds, i, true), AB.count(w.neighbors, "neighbor")].filter(Boolean).join(", ") });
        hot.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); AB.go("context-menus", "node"); });
        return hot;
    }
    function hosts(el, state) {
        const ds = state === "nested-set" ? "nested" : ["nested", "plainJson"].includes(AB.route && AB.route.frame.dataset) ? AB.route.frame.dataset : "wide";
        const D = AB.fx.datasets[ds], sized = SIZED.includes(state) && ds === "wide";
        // the filter steps that apply (frame.keep, from the Data place): only the hosts they leave are drawn
        const keepIds = ds === "wide" && AB.route && AB.route.frame.dataset === "wide" ? AB.route.frame.keep : null;
        const keep = keepIds ? new Set(otherGraph(ds).nrec.map((r, i) => (keepIds.has(r.id) ? i : -1)).filter((i) => i >= 0)) : null;
        // the ring marks the node the inspector shows: the walked one, else its state's own node (the hosts'
        // monitor-prod-iad-03, the first researcher or coauthor)
        syncWalk(ds, state);
        const walked = focusOn(ds).i;
        const walkedName = walked >= 0 ? (AB.walkList(ds)[walked] || {}).name : null;
        const NL = AB.nestedLoaded();
        const how = [NL.co === "edges" && "co-authorship", NL.aff === "rows" && "affiliation", NL.links && "links"].filter(Boolean);
        const what = ds === "wide" ? (keep ? n(keep.size) + " of " + n(D.nodes) + " hosts, the filter steps applied" : n(D.nodes) + " hosts and " + n(D.edges) + " connections")
            : ds === "nested" ? n((NL.researchers ? D.recordArrays["data.researchers[]"] : 0) + (NL.institutions ? D.recordArrays["data.institutions[]"] : 0)) + " researchers and institutions" + (how.length ? ", linked by " + how.join(", ").replace(/, ([^,]*)$/, " and $1") : "")
            : n(D.nodes) + " nodes and " + n(D.edges) + " edges";
        const set = state === "nested-set" ? setMembers(D) : null;
        const fill = set ? Object.fromEntries(set.map((i) => [i, SET.color])) : null;
        const paint = paintOf(ds);
        const alt = D.frame.project + ": " + what + (sized ? ", sized by " + LONG : set ? ", " + set.length + " researchers in the set colored green" : paint.words.length ? "" : ", unstyled") + (paint.words.length ? ", " + paint.words.join(", ") : "") + (walked >= 0 ? "; " + [walkedName + " selected", sizeValue(ds, walked)].filter(Boolean).join(", ") : "");
        // The label lines the Style tab holds, on every node that has the field; a label that would
        // overlap one already placed is left out (ponytail: greedy, by an estimated text width)
        const g1 = otherGraph(ds), radOf = (i) => (paint.rad && paint.rad[i] != null ? paint.rad[i] : sized ? 4 * (VULN_RANGE[0] + (g1.size[i] / 6) * (VULN_RANGE[1] - VULN_RANGE[0])) : ds === "plainJson" ? 7 : 4);
        const labs = [], boxes = [], lab = labelsOf(ds);
        lab.forEach(({ lines }) => g1.pos.forEach((p, i) => lines.forEach((l) => {
            if (keep && !keep.has(i)) return;
            let v = l.field ? AB.valueAt(g1.nrec[i], l.field) : l.text;
            if (v == null || v === "" || typeof v === "object") return;
            v = typeof v === "number" ? AB.num(v) : String(v);
            const [x, y, anchor] = labelXY(l.pos, p[0], p[1], radOf(i)), w = 6 * v.length, x0 = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2, b = [x0, y - 10, x0 + w, y + 2];
            if (boxes.some((o) => b[0] < o[2] && o[0] < b[2] && b[1] < o[3] && o[1] < b[3])) return;
            boxes.push(b);
            labs.push([x, y, anchor, v]);
        })));
        const imgs = ["light", "dark"].map((t) => {
            const k = [ds, JSON.stringify(ds === "nested" ? NL : ""), t, sized, walked, !!set, JSON.stringify(AB.painted[ds] || []), JSON.stringify(lab), keep ? [...keep].join(",") : ""].join("-");
            return h("img", { class: "k-" + t + "-only", alt: alt + (labs.length ? "; labeled" : ""), src: otherUrl[k] || (otherUrl[k] = URL.createObjectURL(new Blob([otherSvg(ds, t, sized, walked, fill, paint, labs, keep)], { type: "image/svg+xml" }))) });
        });
        const stage = h("div", { class: "k-stage", role: "group", tabindex: "0", "aria-label": alt }, ...imgs);
        const g0 = otherGraph(ds), hotI = HOT[ds] ? HOT[ds](D) : -1;
        const hot = hotNode(ds, g0.pos[hotI], paint.rad && paint.rad[hotI] != null ? paint.rad[hotI] : sized ? 4 * (VULN_RANGE[0] + (g0.size[hotI] / 6) * (VULN_RANGE[1] - VULN_RANGE[0])) : ds === "plainJson" ? 7 : 4);
        // once the walk moved on, the hot spot's hover ring would read as a second selection: it stays quiet
        if (hot && walked >= 0 && walked !== hotI) hot.setAttribute("data-quiet", "");
        if (hot) stage.append(hot);
        live(stage, ds);
        // a new method or label line: draw the project again
        restage = () => { el.replaceChildren(); hosts(el, state); };
        // once the set's Color line is bound, its members paint from that attribute: the legend lists that ramp, not the set's green
        const setBound = set && (AB.painted.nested || []).some((p) => p.prop === "Color" && p.on === SET.go.join("/"));
        if (set) { AB.append(el, [stage, AB.legendCard((setBound ? [] : [{ title: "Color: sets", go: SET.go, rows: [{ swatch: SET.color, label: SET.name, count: n(set.length), go: SET.go }] }]).concat(paint.parts))]); return; }
        if (!sized) { const lg = legend(paint.parts); AB.append(el, [stage, lg]); trueSize(stage, lg); return; }
        // The legend's title is the row's name, the attribute: middle ellipsis, the full name in its tooltip and accessible name
        const go = ["inspector-measure-row", "long-name"], g = otherGraph(ds);
        const card = AB.legendCard([sizeKey(LONG, g.size, (v) => 4 * (VULN_RANGE[0] + (v / 6) * (VULN_RANGE[1] - VULN_RANGE[0])), true, go)].concat(paint.parts));
        AB.append(el, [stage, card]);
        trueSize(stage, card);
        // the pointer resting on monitor-prod-iad-03: the one tooltip, reading the size layer's value
        if (state === "hosts-legend-hover" && hot) requestAnimationFrame(() => requestAnimationFrame(() => AB.showTip(hot)));
    }

    // The package registry Load makes (data-page/json-keyed): 1,204 packages, each depending on a few
    // popular ones, drawn on a sunflower with the most depended-on at the center.
    // ponytail: the dependencies are made up from a seeded generator; the fixture holds only 8 packages
    const registryUrl = {}, registryGeos = {};
    // where each package sits, its dependency edges and each one's neighbor count (the walk reads them too)
    function registryGeo() {
        const R = AB.fx.datasets[AB.registryDataset()], N = R.nodes, E = R.edges, key = N + "-" + E;
        if (registryGeos[key]) return registryGeos[key];
        let seed = 7;
        const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        const pos = sunflower(N, 11), pairs = [], nb = pos.map(() => new Set());
        for (let k = 0; k < E; k++) { const a = 1 + Math.floor(rnd() * (N - 1)), b = Math.floor(Math.pow(rnd(), 3) * a); pairs.push([a, b]); nb[a].add(b); nb[b].add(a); }
        return (registryGeos[key] = { pos, pairs, deg: nb.map((x) => x.size) });
    }
    function registrySvg(theme, sel) {
        const G = registryGeo(), bg = theme === "dark" ? "#1E1E1E" : "#F5F5F5", f = (x) => x.toFixed(1);
        const lines = G.pairs.map(([a, b]) => `<line x1="${f(G.pos[a][0])}" y1="${f(G.pos[a][1])}" x2="${f(G.pos[b][0])}" y2="${f(G.pos[b][1])}"/>`);
        const dots = G.pos.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="3" fill="#808080" stroke="${bg}" stroke-width="1"/>`).join("");
        const ring = sel >= 0 && G.pos[sel] ? ringSvg(f(G.pos[sel][0]), f(G.pos[sel][1]), 3, theme) : "";
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="${bg}"/><g stroke="#808080" stroke-width="0.5" stroke-opacity="0.12">${lines.join("")}</g>${dots}${ring}</svg>`;
    }
    // A drawing turned by the layout method, and turned again when it changes
    function turns(stage) { layoutTransform(stage); restage = () => layoutTransform(stage); }
    function registry(el) {
        const R = AB.fx.datasets[AB.registryDataset()];
        if (regSel >= R.nodes) regSel = -1;
        const alt = R.frame.project + ": " + n(R.nodes) + " packages" + (R.edges ? " and " + n(R.edges) + " dependencies" : ", no dependency edges") + ", unstyled" + (regSel >= 0 ? "; " + registryName(regSel) + " selected" : "");
        const imgs = ["light", "dark"].map((t) => { const k = [t, R.edges, regSel].join("-"); return h("img", { class: "k-" + t + "-only", alt, src: registryUrl[k] || (registryUrl[k] = URL.createObjectURL(new Blob([registrySvg(t, regSel)], { type: "image/svg+xml" }))) }); });
        const stage = h("div", { class: "k-stage", role: "group", tabindex: "0", "aria-label": alt }, ...imgs);
        live(stage, "registry");
        turns(stage);
        el.append(stage);
    }

    const OLD = { "too-large": "refused-too-large", "layout-running": "drawn", "layout-paused": "drawn", "layout-settled": "drawn", "legend-open": "drawn", "camera-moved": "drawn" };
    const TRANSFERS = ["transfers", "transfers-communities", "selection-full"];
    // How long a Load's reading card shows before the loaded graph. After a Load click it is short, so a
    // participant's next look (the study tool waits 400 ms after a click) finds the drawing; opened
    // directly (the page's first drawing) the card stays long enough to be seen
    let firstDraw = true;
    const loadMs = () => (firstDraw ? 1500 : 200);
    registerSection({
        id: "canvas-and-states",
        title: "Canvas and its states",
        region: "canvas",
        rail: "graph",
        closeTo: "graph-place",
        frame(state) {
            state = OLD[state] || state;
            if (state === "everything-hidden") return { left: "graph-place/everything-hidden", right: "inspector-selection-and-everything/everything" };
            if (state === "empty" || state === "refused-too-large") return { left: "graph-place/empty", right: false, dock: false };
            // A project file too large to draw: the header names that project, not the sample on screen before
            if (state === "refused-project") { const c = C(); if (!c.frame) Object.defineProperty(c, "frame", { value: { project: PATENT.project, graphRow: PATENT.graphRow }, enumerable: false, configurable: true }); return { dataset: "citations", left: "graph-place/empty", right: false, dock: false }; }
            if (state === "loading") return { left: "graph-place/empty", right: "inspector-nothing-selected/reading", dock: false };
            if (state === "door-entries-loading") return { dataset: "doorEntries", left: "graph-place/empty", right: false, dock: false };
            if (state === "transfers-loading") return { dataset: "transactions", left: "graph-place/empty", right: false, dock: false };
            if (state === "registry-loading") return { dataset: AB.registryDataset(), left: "graph-place/empty", right: false, dock: false };
            if (state === "registry") return { dataset: AB.registryDataset(), left: "graph-place/registry" };
            if (state === "door-entries") return { dataset: "doorEntries", left: "graph-place/door-entries" };
            if (state === "gpu-lost") return { left: "graph-place/failed", right: "inspector-nothing-selected/overview" };
            if (state === "headset-ended") return { left: "graph-place/at-rest", toolbar: "toolbar/session-ended" };
            if (state === "waiting-to-settle") return { left: "graph-place/at-rest", toolbar: "toolbar/export-waiting" };
            if (state === "transfers") return { left: "data-place/at-rest" };
            if (state === "transfers-communities") return { left: "graph-place/many-groups", right: "inspector-run-row/many-groups" };
            if (state === "selection-full") return { dataset: "transactions", left: "graph-place/many-groups", right: false, dock: "table-dock/transfers" };
            if (state === "hosts") { const was = AB.route && AB.route.frame.dataset, ds = ["nested", "plainJson"].includes(was) ? was : "wide"; return { dataset: ds, left: "graph-place/" + { wide: "wide", nested: "nested", plainJson: "plain-json" }[ds] }; }
            if (SIZED.includes(state)) return { dataset: "wide", left: "graph-place/wide-sized", right: "inspector-measure-row/long-name" };
            if (state === "nested-set") return { dataset: "nested", left: "graph-place/nested-set", right: "inspector-group-set-path-row/long-name" };
            if (state === "walked") return { left: "graph-place/at-rest", right: "inspector-node/why-this-look", walk: 2 };
            return { left: "graph-place/at-rest" };
        },
        states: [
            { id: "drawn", label: "Drawn (Les Miserables)" },
            { id: "hidden-on-canvas", label: "Nodes hidden on canvas" },
            { id: "everything-hidden", label: "Everything hidden" },
            { id: "loading", label: "Loading" },
            { id: "empty", label: "Empty graph" },
            { id: "refused-too-large", label: "Load refused: too large" },
            { id: "refused-project", label: "A project file too large to draw (patent citations)" },
            { id: "gpu-lost", label: "GPU lost" },
            { id: "less-detail", label: "Notice: less detail above 10,000 nodes" },
            { id: "waiting-to-settle", label: "Notice: waiting for the layout to settle" },
            { id: "selection-full", label: "Notice: selection is full (5,000)" },
            { id: "headset-ended", label: "Notice: headset session ended" },
            { id: "transfers", label: "Transfers data (Data place)" },
            { id: "transfers-communities", label: "Transfers, colored by community" },
            { id: "door-entries", label: "Door entries, as loaded (unstyled)" },
            { id: "door-entries-loading", label: "Loading the door-entries tables" },
            { id: "transfers-loading", label: "Loading the transfers" },
            { id: "registry-loading", label: "Loading the package registry" },
            { id: "registry", label: "The package registry, as loaded (unstyled)" },
            { id: "hosts", label: "Hosts (wide project), unstyled; the nested project's canvas too" },
            { id: "hosts-legend", label: "Hosts sized by a 46-character attribute, its legend" },
            { id: "hosts-legend-hover", label: "Hosts sized by a 46-character attribute, pointer on a host" },
            { id: "nested-set", label: "Research network: a kept set of 23 researchers colored green" },
            { id: "walked", label: "Les Miserables after two Shift+Arrow steps" },
        ],
        render(el, state) {
            state = OLD[state] || state;
            if (state !== "registry") regSel = -1; // a registry selection lasts while its drawing shows
            liveDs = null;
            restage = null;
            stageSig = sigNow();
            if (state === "everything-hidden") everything(el);
            else if (state === "loading") loading(el, "lesmis");
            else if (state === "door-entries-loading" || state === "transfers-loading") {
                // Load from the Data page ends on the loaded graph: the card shows, then the drawing
                // Both land on the Graph place with an empty tree; the transfers stay just loaded (no filter
                // steps, no runs) until a screen that starts with results opens
                // Add keeps the project as it was (its runs, layers and filter steps): only a new load is fresh
                const added = state === "transfers-loading" && AB.transfersAdded;
                AB.transfersAdded = false;
                if (state === "transfers-loading" && !added) AB.fx.datasets.transactions.fresh = true;
                // Reached without a Load (a direct link): it loads what the Data page opens on, One edge per Row, no weight
                const DE = AB.fx.datasets.doorEntries;
                if (state === "door-entries-loading" && !DE.loaded.byLoad) Object.assign(DE.loaded, { per: "row", add: null, fresh: true, weight: null, direction: "directed", byLoad: true });
                const to = state === "door-entries-loading" ? ["graph-place", "door-entries"] : added ? ["graph-place", "many-groups"] : ["graph-place", "transfers-loaded"], here = location.hash;
                loading(el, state === "door-entries-loading" ? "doorEntries" : "transactions");
                setTimeout(() => { if (location.hash !== here) return; AB.go(to[0], to[1]); if (added) setTimeout(() => AB.notice("Rows added: " + AB.count(AB.fx.datasets.transactions.edges, "transfer") + " in all"), 100); }, loadMs()); // after the new route draws
            }
            else if (state === "registry-loading") {
                const here = location.hash;
                loading(el, "registry");
                setTimeout(() => { if (location.hash === here) AB.go("graph-place", "registry"); }, loadMs());
            }
            else if (state === "registry") registry(el);
            else if (state === "door-entries") door(el);
            else if (state === "hosts" || SIZED.includes(state) || state === "nested-set") hosts(el, state);
            else if (state === "empty") empty(el);
            else if (state === "refused-too-large" || state === "refused-project") refused(el, state);
            else if (state === "gpu-lost") gpuLost(el);
            else if (TRANSFERS.includes(state)) transfers(el, state);
            else drawn(el, state);
            firstDraw = false;
            drawPill(el);
            el.oncontextmenu = (e) => { e.preventDefault(); AB.go("context-menus", "canvas"); };
            clearClick(el);
        },
    });
})();
