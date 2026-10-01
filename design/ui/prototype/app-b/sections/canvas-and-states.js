/* Canvas and its states, version 3. The canvas holds only the drawing, the legend card (top left,
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
   hidden" keeps groups 2 and 8 painted and draws every other node as a plain gray stand-in for the
   element's unstyled node. Version 2 state ids (layout and legend states, camera moved, too-large)
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
`;
    if (!document.getElementById("cs-css")) document.head.append(h("style", { id: "cs-css" }, CSS));

    const L = () => AB.fx.datasets.lesmis;
    const C = () => AB.fx.datasets.citations;
    const n = (x) => Number(x).toLocaleString("en-US");
    const byLabel = (label) => L().rows.find((r) => r.label === label);

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
    // Nodes no row paints: a plain gray stand-in for however graphty-element draws an unstyled node
    function everythingHidden(doc, theme) {
        const keep = [groupColor("2"), groupColor("8")];
        const gray = theme === "dark" ? "#6E6E6E" : "#9E9E9E";
        nodePairs(doc).forEach((p) => { if (!keep.includes(p.fill)) p.c.setAttribute("fill", gray); });
    }
    const groupColor = (g) => L().groupColors[g].toUpperCase();

    // ---------- PageRank paint (see the header) ----------
    const PAGERANK = {"909.6,224.4":0.0428,"991.8,211.2":0.0056,"879.6,269.7":0.0103,"850.4,230.9":0.0103,"915.9,145.9":0.0056,"960.6,176.1":0.0056,"988.2,242.2":0.0056,"951.8,145.6":0.0056,"991.4,178.5":0.0056,"870.8,247.3":0.0056,"677.5,481.1":0.0037,"698.7,394.3":0.0754,"585.1,225.5":0.0053,"651.7,469.5":0.0037,"668.4,326.2":0.0037,"624.2,465.4":0.0037,"587.2,166.7":0.0156,"592.5,119.9":0.0126,"561.6,132.6":0.0126,"617.9,106.3":0.0126,"546.4,112.1":0.0126,"567,90.8":0.0126,"595.8,85.6":0.0126,"626.4,181":0.027,"785.3,352.8":0.0195,"789.4,393.1":0.0279,"587.1,378.9":0.0206,"755.4,392":0.0303,"739.9,241.2":0.0116,"642.6,349.5":0.0156,"548.3,179.2":0.0054,"674.3,294.9":0.0091,"699.4,457.8":0.0037,"716.9,323.1":0.0052,"651.4,400":0.0124,"630.5,375.6":0.0124,"605.3,385.3":0.0124,"635.2,425.1":0.0124,"606.8,415.6":0.0124,"731.4,371.4":0.0074,"550.7,572.1":0.0034,"848,423.2":0.0178,"853.2,355.6":0.0063,"595.1,314":0.0068,"749.2,196.7":0.0062,"752.6,148.9":0.0044,"1130,477.6":0.0053,"1054.2,497.5":0.0078,"820.6,539.7":0.0358,"557.8,457.8":0.015,"492.3,435.2":0.0053,"530.1,404.4":0.0163,"468.2,354.1":0.006,"426.2,392.9":0.0039,"524.4,445.2":0.0087,"750.6,530.6":0.0309,"530.1,529.3":0.0051,"800.4,553.3":0.0175,"777.8,559.5":0.0219,"789.9,588.3":0.0159,"795.8,635.6":0.0131,"767.9,611.1":0.0159,"800.4,605.2":0.0186,"827.3,576.1":0.0172,"764.2,584.6":0.019,"822.1,597":0.0172,"827.6,627.6":0.0145,"681,714.4":0.0033,"820.2,407.9":0.0167,"831.5,385":0.0167,"793.3,428.6":0.0166,"815.6,446.3":0.0152,"559.4,330.6":0.0068,"1006.2,572.9":0.0058,"990,619.7":0.0058,"866.6,438.6":0.0119,"854.9,597.3":0.0107};
    const PR_DOMAIN = [0.0033, 0.0754];
    const PR_STOPS = ["#ef7818", "#d85a09", "#b84203", "#8e3104", "#662506"]; // kit.css .k-ramp-measure
    function rampColor(v) {
        const t = Math.max(0, Math.min(1, (v - PR_DOMAIN[0]) / (PR_DOMAIN[1] - PR_DOMAIN[0]))) * (PR_STOPS.length - 1);
        const i = Math.min(PR_STOPS.length - 2, Math.floor(t)), f = t - i;
        const a = PR_STOPS[i].match(/\w\w/g).map((x) => parseInt(x, 16)), b = PR_STOPS[i + 1].match(/\w\w/g).map((x) => parseInt(x, 16));
        return "#" + a.map((x, k) => Math.round(x + (b[k] - x) * f).toString(16).padStart(2, "0")).join("");
    }
    function paintPagerank(doc) {
        doc.querySelectorAll("circle").forEach((c) => {
            const v = PAGERANK[c.getAttribute("cx") + "," + c.getAttribute("cy")];
            if (v != null && c.getAttribute("fill") !== "none") c.setAttribute("fill", rampColor(v));
        });
    }
    // Any Les Miserables drawing from the kit, painted as the tree at rest paints it. Other sections
    // that draw the Les Miserables canvas (the selection bar, the export preview) use this too.
    // after: an edit applied over the paint (the Overrides row wins over PageRank)
    AB.lesmisDrawing = (base, alt, edit, after) => derived(base, "pr-" + base + (edit ? "-" + edit.name : "") + (after ? "-" + after.name : ""), (doc, theme) => { if (edit) edit(doc, theme); paintPagerank(doc); if (after) after(doc, theme); }).map((img) => { img.alt = alt || ""; return img; });
    // Valjean's color set by hand (the node inspector's edited state), written to Overrides
    function valjeanOverride(doc) {
        doc.querySelectorAll("circle").forEach((c) => { if (c.getAttribute("cx") === "698.7" && c.getAttribute("cy") === "394.3" && c.getAttribute("fill") !== "none") c.setAttribute("fill", "#E41A1C"); });
    }

    // ---------- the canvas ----------
    // Hot spots on the drawing: Valjean (node) and the Fantine to Valjean edge.
    function hotspots() {
        const a = L().anchors.selected;
        const v = byLabel("Valjean");
        const node = AB.tip(h("span", { class: "ab-hot", style: `left:${a.x}%;top:${a.y}%` }), "Valjean", { second: `group ${v.group}, degree ${v.degree}` });
        AB.nav(node, "inspector-node", "why-this-look");
        node.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); AB.go("context-menus", "node"); });
        // midpoint of Fantine (626.4, 181) to Valjean (698.7, 394.3) in the 1200 x 800 drawing.
        // graphty-element cannot pick edges (Edge.ts: isPickable = false): the edge opens from the table.
        const EDGE_PICK = "Picking an edge on the canvas needs graphty-element. Open edges from the table.";
        // A design annotation, not a control: it explains a gap and hides with the design notes
        const edge = AB.tip(h("span", { class: "cs-edge", role: "note", "data-needs": "", "aria-label": "Fantine - Valjean: " + EDGE_PICK, style: "left:55.21%;top:35.96%" }), "Fantine - Valjean", { second: EDGE_PICK, label: false });
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

    // The legend for the drawing at rest: what wins color (PageRank) and size (Degree)
    function pagerankLegend() {
        const f = L().frame;
        const go = ["inspector-measure-row", "style"];
        return AB.legendCard([
            { title: "Color: PageRank", go, rows: [{ swatch: h("b", { class: "k-ramp k-ramp-measure" }), label: PR_DOMAIN[0] + " to " + PR_DOMAIN[1], go }] },
            { title: "Size: Degree", go: ["inspector-measure-row", "degree"], rows: [{ swatch: h("span", { class: "cs-dots" }, f.sizeMarks.map((m) => h("span", { class: "ab-dot", style: `width:${m.px / 2}px;height:${m.px / 2}px` }))), label: f.sizeMarks[0].degree + " to " + f.sizeMarks[f.sizeMarks.length - 1].degree, go: ["inspector-measure-row", "degree"] }] },
        ]);
    }

    function drawn(el, state) {
        const f = L().frame;
        const stage = h("div", { class: "k-stage", role: "group", tabindex: "0", "aria-label": f.altSized });
        const alt = "Les Miserables colored by PageRank, sized by degree";
        const edited = AB.route && AB.route.frame.right === "inspector-node/edited";
        stage.append(...AB.lesmisDrawing("lesmis-groups-rest", alt, state === "hidden-on-canvas" ? hideGroup0 : null, edited ? valjeanOverride : null));
        stage.append(...hotspots());
        AB.append(el, [stage, pagerankLegend()]);
        if (state === "less-detail") AB.notice("More than 10,000 nodes: drawn with less detail.", { label: "Limits", go: ["settings", "performance"] });
        if (state === "waiting-to-settle") AB.notice("Waiting for the layout to settle before capturing the image.", { label: "Cancel", go: ["export-image", "image"] });
    }

    // The transfers data, for the places that work on it (Data, the many-groups run, a full
    // selection): the density drawing, or colored by the March Louvain run with its legend
    function transfers(el, state) {
        const T = AB.fx.datasets.transactions;
        if (state !== "transfers-communities") {
            AB.append(el, [h("div", { class: "k-stage", role: "group", tabindex: "0", "aria-label": T.frame.altSized }, ...AB.drawing("transactions-density", T.frame.altSized)), AB.legendCard([])]);
            if (state === "selection-full") {
                AB.notice("Selection is full: the first 5,000 of " + n(T.edges) + " matching transfers are selected.", { label: "Narrow the query", go: ["select-where", "where-error"] });
                AB.announce("Selection is full: 5,000 of " + n(T.edges) + " matching transfers selected.");
            }
            return;
        }
        const lg = AB.fx.datasets.transactionsApril.legends.march;
        const run = ["inspector-run-row", "many-groups"];
        AB.append(el, [
            h("div", { class: "k-stage", role: "group", tabindex: "0", "aria-label": "Transfers, March: accounts colored by Louvain community" }, ...AB.drawing("transactions-march-communities", "Transfers, March: accounts colored by Louvain community")),
            AB.legendCard([{ title: "Color: Louvain", go: run, rows: lg.rows.map((r) => ({ swatch: r.color, label: r.name, count: n(r.count), go: run })), more: lg.other.communities + " more communities" }])]);
    }

    // Everything hidden: only the two kept sets paint; the legend lists only what paints
    function everything(el) {
        const g = (lab) => L().frame.legend.rows.find((r) => r.label === lab);
        const stage = h("div", { class: "k-stage", role: "group", tabindex: "0", "aria-label": "Les Miserables with Everything hidden: groups 2 and 8 painted, every other node drawn unstyled" });
        stage.append(...derived("lesmis-groups-onesize", "everything-hidden-v2", everythingHidden));
        const part = (lab) => ({ title: "Color: Group " + lab, go: ["inspector-group-set-path-row", "kept-2"], rows: [{ swatch: g(lab).color, label: g(lab).count + " nodes" }] });
        AB.append(el, [stage, AB.legendCard([part("2"), part("8")])]);
    }

    function loading(el) {
        el.append(card({
            icon: "loader-circle", title: "Reading " + L().frame.file,
            text: L().nodes + " nodes, " + L().edges + " edges...",
            extra: h("div", { class: "k-progress", role: "progressbar", "aria-label": "Reading", "aria-valuenow": "60" }, h("i", { style: "width:60%" })),
            secondary: AB.button("Cancel", { kind: "secondary", go: ["start-screen", "returning"] }),
        }));
    }

    function empty(el) {
        const add = AB.cmd("add-data");
        el.append(card({ icon: "database", title: "No nodes to draw", text: "This graph is empty.", primary: AB.button(add.label, { go: add.go }) }));
    }

    function refused(el) {
        const c = C();
        el.append(card({
            role: "alert", icon: "triangle-alert", title: "Too large to draw",
            text: c.file + " has " + n(c.nodes) + " nodes; a graph draws up to " + n(c.drawingLimit) + " nodes and 100,000 edges, so nothing was loaded.",
            primary: AB.button("Choose another file...", { go: ["load-step", "preview"] }),
            secondary: AB.button("Details", { kind: "ghost", go: ["load-step", "refused-too-large"] }),
        }));
    }

    function gpuLost(el) {
        el.append(card({
            role: "alert", icon: "circle-x", title: "Canvas not available",
            text: "The graphics device was lost. The rows, table and inspector are unchanged.",
            primary: AB.button("Restart viewer", { go: ["canvas-and-states", "drawn"] }),
        }));
    }

    const OLD = { "too-large": "refused-too-large", "layout-running": "drawn", "layout-paused": "drawn", "layout-settled": "drawn", "legend-open": "drawn", "camera-moved": "drawn" };
    const TRANSFERS = ["transfers", "transfers-communities", "selection-full"];
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
            if (state === "loading") return { left: "graph-place/empty", right: "inspector-nothing-selected/reading", dock: false };
            if (state === "gpu-lost") return { left: "graph-place/failed", right: "inspector-nothing-selected/overview" };
            if (state === "headset-ended") return { left: "graph-place/at-rest", toolbar: "toolbar/session-ended" };
            if (state === "waiting-to-settle") return { left: "graph-place/at-rest", toolbar: "toolbar/export-waiting" };
            if (state === "transfers") return { left: "data-place/at-rest" };
            if (state === "transfers-communities") return { left: "graph-place/many-groups", right: "inspector-run-row/many-groups" };
            if (state === "selection-full") return { dataset: "transactions", left: "graph-place/many-groups", right: false, dock: "table-dock/transfers" };
            return { left: "graph-place/at-rest" };
        },
        states: [
            { id: "drawn", label: "Drawn (Les Miserables)" },
            { id: "hidden-on-canvas", label: "Nodes hidden on canvas" },
            { id: "everything-hidden", label: "Everything hidden" },
            { id: "loading", label: "Loading" },
            { id: "empty", label: "Empty graph" },
            { id: "refused-too-large", label: "Load refused: too large" },
            { id: "gpu-lost", label: "GPU lost" },
            { id: "less-detail", label: "Notice: less detail above 10,000 nodes" },
            { id: "waiting-to-settle", label: "Notice: waiting for the layout to settle" },
            { id: "selection-full", label: "Notice: selection is full (5,000)" },
            { id: "headset-ended", label: "Notice: headset session ended" },
            { id: "transfers", label: "Transfers data (Data place)" },
            { id: "transfers-communities", label: "Transfers, colored by community" },
        ],
        render(el, state) {
            state = OLD[state] || state;
            if (state === "everything-hidden") everything(el);
            else if (state === "loading") loading(el);
            else if (state === "empty") empty(el);
            else if (state === "refused-too-large") refused(el);
            else if (state === "gpu-lost") gpuLost(el);
            else if (TRANSFERS.includes(state)) transfers(el, state);
            else drawn(el, state);
            el.oncontextmenu = (e) => { e.preventDefault(); AB.go("context-menus", "canvas"); };
        },
    });
})();
