/* Canvas and its states: the drawing with one legend (an entry selects the row that paints it; the
   card closes to a Legend chip), the "not drawn" line with Show hidden elements, the Camera menu
   face and the layout chip at the top right, and the state cards and one-line notices (loading,
   empty graph, load refused as too large, less detail, waiting to settle, selection full, GPU
   lost, headset session ended). Note markers are not drawn here: noted elements are painted by
   the tree's Notes row, a style layer like any other. Plain ASCII.

   What paints: at rest the tree's top painting row is PageRank, which colors every node, so the
   drawing is recolored at runtime with each node's PageRank on the measure ramp (the rows below it
   still match, and show through when its eye is off). PageRank here is the same computation as the
   measure inspector's: networkx les_miserables_graph, unweighted, damping 0.85, keyed by the node's
   position in the kit's drawings (every Les Miserables drawing places the 77 nodes identically).

   Numbers: Les Miserables, transfers and Patent citations from kit/fixtures.json; the limits
   (50,000 nodes, 100,000 edges, less detail above 10,000, selections up to 5,000) are
   graphty-element's DEFAULT_LIMITS. Two drawings are derived here at runtime from the kit's Les
   Miserables SVGs (nothing new is invented about the graph): "hidden on canvas" drops the 4
   group-0 nodes and their edges; "Everything hidden" keeps groups 2 and 8 painted and draws every
   other node as a plain gray stand-in for the element's unstyled node. The old state id
   "too-large" is read as "refused-too-large". Styles are injected once from this file. */
(function () {
    "use strict";
    const CSS = `
.cs-edge { position: absolute; width: 18px; height: 18px; border-radius: 50%; transform: translate(-50%, -50%); }
.cs-edge:hover, .cs-edge:focus-visible { box-shadow: 0 0 0 2px var(--k-mark-out), 0 0 0 4px var(--k-mark-in); }
.cs-legend .k-lg-row[data-off] { color: var(--cm-text-tertiary); }
.cs-legend .k-lg-row[data-off] .k-chit { opacity: .35; }
.cs-lg-foot { border-top: 1px solid var(--cm-border); margin-top: 4px; padding-top: 4px; }
.cs-card { width: 360px; max-width: calc(100% - 32px); }
.cs-card .k-canvas-card-title .k-i { flex: none; }
.cs-steps { display: grid; gap: 8px; margin: 4px 0; }
.cs-step { display: grid; gap: 4px; }
.cs-step-head { display: flex; gap: 8px; align-items: center; }
.cs-step-head .k-value { margin-inline-start: auto; color: var(--cm-text-secondary); font-variant-numeric: tabular-nums; }
.cs-step[data-wait] { color: var(--cm-text-tertiary); }
.cs-indet { position: relative; }
.cs-indet > i { width: 30%; animation: cs-slide 1.4s ease-in-out infinite; }
@keyframes cs-slide { from { transform: translateX(-100%); } to { transform: translateX(340%); } }
@media (prefers-reduced-motion: reduce) { .cs-indet > i { animation: none; width: 40%; } }
.cs-msg { padding: 6px 8px; border-radius: 5px; background: var(--cm-bg-secondary); color: var(--cm-text); }
.cs-msg .k-secondary { display: block; }
.cs-oq { align-self: start; justify-self: start; white-space: normal; }
.cs-danger { color: var(--cm-text-danger); }
.cs-lg-link { color: var(--cm-text-brand); text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
.cs-unstyled { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--cs-gray); flex: none; }
.cs-notdrawn .ab-needs { margin-inline-start: 4px; }
.cs-toast { position: absolute; left: 50%; bottom: 80px; transform: translateX(-50%); z-index: 4; display: grid; justify-items: center; gap: 6px; max-width: calc(100% - 32px); }
.cs-toast .k-toast { white-space: normal; }
.cs-toast .k-toast-action { white-space: nowrap; cursor: pointer; }
.cs-toast .k-progress.cs-indet { width: 80px; flex: none; }
.cs-card .ab-needs { white-space: normal; }
:root { --cs-gray: #9E9E9E; }
:root[data-theme="dark"] { --cs-gray: #6E6E6E; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --cs-gray: #6E6E6E; } }
`;
    if (!document.getElementById("cs-css")) document.head.append(h("style", { id: "cs-css" }, CSS));

    const L = () => AB.fx.datasets.lesmis;
    const C = () => AB.fx.datasets.citations;
    const n = (x) => Number(x).toLocaleString("en-US");
    const oq = (text) => h("span", { class: "k-annot-tag cs-oq", title: text }, "Open question: " + text);
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

    // ---------- canvas furniture ----------
    // The top right corner: the layout chip (only while a live layout runs, is paused, or has just
    // settled) and the Camera menu face. o: { layout, view, moved } or null for no corner.
    function corner(o) {
        o = o || {};
        return h("div", { class: "ab-canvas-corner" }, o.layout ? AB.layoutChip(o.layout) : null, AB.cameraFace({ view: o.view, moved: o.moved }));
    }
    function helpButton() {
        return h("span", Object.assign({ class: "k-help", role: "button", "aria-label": "Keyboard shortcuts", title: "Keyboard shortcuts (?)" }, AB.act({ go: ["commands-and-search", "shortcuts"] })), icon("circle-help"));
    }
    function legendRow(swatch, label, count, go, extra) {
        const r = h("div", Object.assign({ class: "k-lg-row", title: go ? "Select the row that paints this" : null }, extra || {}), swatch, label, count != null ? h("span", { class: "k-value" }, count) : null);
        return go ? AB.nav(r, go[0], go[1]) : r;
    }
    // Every legend card gets its close button; a closed card leaves the Legend chip
    function legendCard(...children) {
        const card = h("div", { class: "k-legend-card ab-legend cs-legend", role: "group", "aria-label": "Legend" });
        card.append(h("span", { class: "ab-legend-x" }, AB.legendClose(card)), ...children.filter((c) => c != null));
        return card;
    }
    // Draw the legend closed: press its own close button, so the chip is the shared one
    function closeLegend(card) {
        const x = card.querySelector(".ab-legend-x .k-icon-btn");
        if (x) x.click();
    }
    // A one-line notice above the toolbar
    function toast(...children) {
        return h("div", { class: "cs-toast" }, h("div", { class: "k-toast", role: "status" }, ...children));
    }
    const toastAct = (label, a) => h("span", Object.assign({ class: "k-toast-action", role: "button" }, AB.act(a)), label);

    const HIDE_REASON = "graphty-element has no draw-only hide: it needs a visible style property (or a hidden set it honors) that also hides incident edges. Filtering changes what is computed, which Hide on canvas must not.";

    // The legend for the drawing at rest: what wins color (PageRank), what the rows beneath it would
    // show, and size. opts.hidden0: group 0 is hidden on canvas.
    function pagerankLegend(opts) {
        const f = L().frame;
        return legendCard(
            AB.nav(h("div", { class: "k-lg-title", title: "Select the row that paints this" }, "Color: PageRank"), "inspector-measure-row", "style"),
            AB.nav(h("div", { class: "k-lg-row", title: "Select the row that paints this" }, h("b", { class: "k-ramp k-ramp-measure" }), h("span", { class: "k-num" }, PR_DOMAIN[0] + " to " + PR_DOMAIN[1])), "inspector-measure-row", "style"),
            AB.nav(h("div", { class: "k-lg-title ab-lg-size", title: "Select the row that paints this" }, "Size: Degree ", f.sizeMarks.map((m) => h("span", { class: "ab-dot", style: `width:${m.px / 2}px;height:${m.px / 2}px`, title: "degree " + m.degree }))), "inspector-measure-row", "style"),
            opts.hidden0
                ? h("div", { class: "k-notdrawn cs-notdrawn", role: "status" }, f.legend.rows.find((r) => r.label === "0").count + " nodes not drawn: hidden on canvas. ",
                    h("a", Object.assign({ role: "button" }, AB.act({ onClick: () => AB.flash("Selects the 4 hidden nodes (not wired in the skeleton)") })), "Select hidden"), ", ",
                    h("a", Object.assign({ role: "button" }, AB.act({ go: ["canvas-and-states", "drawn"] })), "Show hidden elements"),
                    AB.needsElement(HIDE_REASON))
                : null,
        );
    }

    // Hot spots on the drawing: Valjean (node) and the Fantine to Valjean edge.
    function hotspots() {
        const a = L().anchors.selected;
        const v = byLabel("Valjean");
        const node = h("span", { class: "ab-hot", style: `left:${a.x}%;top:${a.y}%`, title: `Valjean: group ${v.group}, degree ${v.degree}`, "aria-label": "Valjean" });
        AB.nav(node, "inspector-node", "why-this-look");
        node.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); AB.go("context-menus", "node"); });
        // midpoint of Fantine (626.4, 181) to Valjean (698.7, 394.3) in the 1200 x 800 drawing
        // graphty-element cannot pick edges (Edge.ts: isPickable = false): a click here says so, and the
        // edge inspector and menu open from the table
        const EDGE_PICK = "Picking an edge on the canvas needs graphty-element (edge meshes are not pickable). Open edges from the table.";
        const edge = h("span", { class: "cs-edge", role: "button", tabindex: "-1", style: "left:55.21%;top:35.96%", title: EDGE_PICK, "aria-label": "Edge Fantine to Valjean: " + EDGE_PICK });
        edge.addEventListener("click", (e) => { e.stopPropagation(); AB.flash(EDGE_PICK); });
        edge.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); AB.flash(EDGE_PICK); });
        return [node, edge];
    }

    function card(o) {
        return h("div", { class: "k-canvas-card cs-card", role: o.role || "status", "aria-live": "polite" },
            h("div", { class: "k-canvas-card-title" }, o.icon, h("span", null, o.title)),
            o.body,
            o.acts ? h("div", { class: "k-canvas-card-acts" }, o.acts) : null);
    }

    // ---------- the states ----------
    // What the corner shows per state of the Les Miserables drawing
    const CORNER = {
        "layout-running": { layout: "running" },
        "layout-paused": { layout: "paused" },
        "layout-settled": { layout: "settled" },
        "waiting-to-settle": { layout: "running" },
        "camera-moved": { moved: true },
    };
    // less-detail: no fixture graph lies between 10,000 and 50,000 nodes, so the notice is shown
    // over Les Miserables for placement only.
    function drawn(el, state) {
        const f = L().frame;
        const stage = h("div", { class: "k-stage", tabindex: "0", "aria-label": f.altSized });
        const alt = "Les Miserables colored by PageRank, sized by degree";
        const edited = AB.route && AB.route.frame.right === "inspector-node/edited";
        stage.append(...AB.lesmisDrawing("lesmis-groups-rest", alt, state === "hidden-on-canvas" ? hideGroup0 : null, edited ? valjeanOverride : null));
        stage.append(...hotspots());
        const legend = pagerankLegend({ hidden0: state === "hidden-on-canvas" });
        el.append(stage, legend, corner(CORNER[state]), helpButton());
        // The legend starts as its chip once three or more rows paint (the tree at rest); L or the chip opens it.
        // It stays open where it carries a state line (nodes not drawn) and in its own review state.
        if (state !== "legend-open" && state !== "hidden-on-canvas") closeLegend(legend);
        if (state === "less-detail") {
            el.append(toast("More than 10,000 nodes: drawn with less detail.", toastAct("Limits", { go: ["settings", "performance"] })),
                h("div", { class: "cs-toast", style: "bottom:136px" }, oq("which details graphty-element drops is not published")));
        }
        if (state === "waiting-to-settle") {
            el.append(h("div", { class: "cs-toast" }, h("div", { class: "k-toast", role: "status" },
                h("span", { class: "k-progress cs-indet", "aria-label": "Waiting for the layout to settle" }, h("i")),
                "Waiting for the layout to settle before capturing the image.",
                toastAct("Cancel", { go: ["export-image", "image"] }))));
        }
    }

    // The transfers data, for the places that work on it (Data, the many-groups run, a full
    // selection): the density drawing, or colored by the March Louvain run with its legend
    function transfers(el, state) {
        const T = AB.fx.datasets.transactions;
        if (state !== "transfers-communities") {
            el.append(h("div", { class: "k-stage", tabindex: "0", "aria-label": T.frame.altSized }, ...AB.drawing("transactions-density", T.frame.altSized)), corner(), helpButton());
            if (state === "selection-full") {
                el.append(toast(icon("triangle-alert", "sm"), "Selection is full: the first 5,000 of " + n(T.edges) + " matching transfers are selected.",
                    toastAct("Narrow the query", { go: ["select-where", "where-error"] }), toastAct("Limits", { go: ["settings", "performance"] })));
                AB.announce("Selection is full: 5,000 of " + n(T.edges) + " matching transfers selected.");
            }
            return;
        }
        const lg = AB.fx.datasets.transactionsApril.legends.march;
        const run = ["inspector-run-row", "many-groups"];
        el.append(
            h("div", { class: "k-stage", tabindex: "0", "aria-label": "Transfers, March: accounts colored by Louvain community" }, ...AB.drawing("transactions-march-communities", "Transfers, March: accounts colored by Louvain community")),
            legendCard(
                h("div", { class: "k-lg-title" }, "Louvain, weighted by amount"),
                lg.rows.map((r) => legendRow(AB.chit(r.color), r.name, n(r.count), run)),
                legendRow(AB.chit(AB.fx.canvas.otherGray), lg.other.communities + " more", n(lg.other.count), ["table-dock", "transfers"]),
                h("div", { class: "k-lg-sub" }, lg.other.holds + " share one color")),
            corner(), helpButton());
    }

    function everything(el) {
        const f = L().frame;
        const g = (lab) => f.legend.rows.find((r) => r.label === lab);
        const painted = g("2").count + g("8").count;
        const stage = h("div", { class: "k-stage", tabindex: "0", "aria-label": "Les Miserables with Everything hidden: groups 2 and 8 painted, every other node drawn unstyled" });
        stage.append(...derived("lesmis-groups-onesize", "everything-hidden-v2", everythingHidden));
        el.append(stage,
            legendCard(
                h("div", { class: "k-lg-title" }, "Group color ", h("span", { class: "k-secondary" }, "group")),
                legendRow(AB.chit(g("2").color), "Group 2 (kept)", g("2").count, ["inspector-group-set-path-row", "kept-2"]),
                legendRow(AB.chit(g("8").color), "Group 8 (kept)", g("8").count, ["inspector-group-set-path-row", "kept-8"]),
                h("div", { class: "k-lg-row cs-lg-foot" }, h("span", { class: "cs-unstyled" }), "Painted by no row", h("span", { class: "k-value" }, String(L().nodes - painted))),
                h("div", { class: "k-lg-sub" }, oq("how graphty-element draws an unstyled node")),
                h("div", { class: "k-lg-sub" }, AB.link("inspector-selection-and-everything", "everything", "Show Everything"))),
            corner(), helpButton());
    }

    function loading(el) {
        const f = L().frame;
        el.append(card({
            icon: icon("loader-circle"), title: "Reading " + f.file + " as JSON",
            body: [
                h("div", { class: "cs-steps" },
                    h("div", { class: "cs-step" }, h("div", { class: "cs-step-head" }, icon("check", "sm"), "Nodes", h("span", { class: "k-value" }, L().nodes + " read")), h("div", { class: "k-progress" }, h("i", { style: "width:100%" }))),
                    h("div", { class: "cs-step" }, h("div", { class: "cs-step-head" }, icon("loader-circle", "sm"), "Edges", h("span", { class: "k-value" }, "reading")), h("div", { class: "k-progress cs-indet" }, h("i"))),
                    h("div", { class: "cs-step", "data-wait": "" }, h("div", { class: "cs-step-head" }, icon("clock", "sm"), "Drawing", h("span", { class: "k-value" }, "waiting")), h("div", { class: "k-progress" }, h("i", { style: "width:0" })))),
                h("div", { class: "k-secondary" }, "The table and the inspector fill in as the data arrives. Cancel keeps nothing that has arrived."),
                oq("a drawing progress count needs an event from graphty-element"),
            ],
            acts: [AB.button("Cancel", { kind: "secondary", go: ["start-screen", "returning"] })],
        }), helpButton());
    }

    function empty(el) {
        const add = AB.cmd("add-data");
        el.append(card({
            icon: icon("database"), title: "No nodes to draw",
            body: [h("div", { class: "k-secondary" }, "This graph is empty. Add data in Data > Sources: open a file, paste rows, or load from an address."), oq("what the inspector shows for a graph with no nodes")],
            acts: [AB.button(add.label, { go: add.go })],
        }), helpButton());
    }

    function refused(el) {
        const c = C();
        el.append(card({
            role: "alert", icon: icon("triangle-alert"), title: "Load refused: too large to draw",
            body: [
                h("div", { class: "k-num" }, c.file + " has " + n(c.nodes) + " nodes and " + n(c.edges) + " edges. A graph draws up to " + n(c.drawingLimit) + " nodes and 100,000 edges, so graphty-element refused the load."),
                h("div", { class: "k-secondary" }, "Nothing was loaded, so nothing needs undoing. Load a smaller file, or keep only part of this one as it is read."),
                h("div", null, AB.needsElement("graphty-element cannot yet keep only part of a file while it reads it")),
            ],
            acts: [
                AB.button("Filter at import...", { disabled: true, onClick: () => AB.flash("Filter at import needs graphty-element") }),
                AB.button("Choose another file...", { kind: "secondary", go: ["data-place", "sources-menu"] }),
                AB.button("Details", { kind: "ghost", go: ["load-step", "refused-too-large"] }),
            ],
        }), helpButton());
    }

    function gpuLost(el) {
        el.append(card({
            role: "alert", icon: h("span", { class: "cs-danger" }, icon("circle-x")), title: "Canvas not available",
            body: [
                h("div", null, "The graphics device was lost, so the drawing stopped. The rows, the table and the inspector are unchanged."),
                h("div", { class: "cs-msg" }, h("span", { class: "k-secondary" }, "Closeness did not finish:"), "The GPU device was lost during the run. Nothing was computed on the CPU."),
                oq("the words above are graphty-element's own message; this wording is a stand-in"),
                oq("one card, or two, when the drawing and a run lose the device together"),
                h("div", { class: "k-secondary" }, "The Closeness row keeps its error, with Retry. ", AB.link("graph-place", "failed", "Show the row")),
            ],
            acts: [AB.button("Restart viewer", { onClick: () => AB.go("canvas-and-states", "drawn") }), AB.button("Details", { kind: "secondary", go: ["inspector-run-row", "failed"] })],
        }), helpButton());
    }

    const TRANSFERS = ["transfers", "transfers-communities", "selection-full"];
    registerSection({
        id: "canvas-and-states",
        title: "Canvas and its states",
        region: "canvas",
        rail: "graph",
        closeTo: "graph-place",
        frame(state) {
            if (state === "too-large") state = "refused-too-large";
            if (state === "everything-hidden") return { left: "graph-place/everything-hidden" };
            if (state === "empty" || state === "refused-too-large") return { left: "graph-place/empty", right: false, dock: false };
            if (state === "loading") return { left: "graph-place/empty" };
            if (state === "gpu-lost") return { left: "graph-place/failed" };
            if (state === "headset-ended") return { left: "graph-place/at-rest", toolbar: "toolbar/session-ended" };
            if (state === "transfers") return { left: "data-place/at-rest" };
            if (state === "transfers-communities") return { left: "graph-place/many-groups", right: "inspector-run-row/many-groups" };
            if (state === "selection-full") return { dataset: "transactions", left: "graph-place/many-groups", right: false, dock: "table-dock/transfers" };
            return { left: "graph-place/at-rest" };
        },
        states: [
            { id: "drawn", label: "Drawn (Les Miserables)" },
            { id: "layout-running", label: "Layout running" },
            { id: "layout-paused", label: "Layout paused" },
            { id: "layout-settled", label: "Layout settled" },
            { id: "legend-open", label: "Legend opened from its chip" },
            { id: "camera-moved", label: "Camera moved" },
            { id: "hidden-on-canvas", label: "Nodes hidden on canvas" },
            { id: "everything-hidden", label: "Everything hidden" },
            { id: "loading", label: "Loading" },
            { id: "empty", label: "Empty graph" },
            { id: "refused-too-large", label: "Load refused: too large" },
            { id: "less-detail", label: "Less detail above 10,000 nodes" },
            { id: "waiting-to-settle", label: "Waiting for the layout to settle" },
            { id: "selection-full", label: "Selection is full (5,000)" },
            { id: "gpu-lost", label: "GPU lost" },
            { id: "headset-ended", label: "Headset session ended" },
            { id: "transfers", label: "Transfers data (Data place)" },
            { id: "transfers-communities", label: "Transfers, colored by community" },
        ],
        render(el, state) {
            if (state === "too-large") state = "refused-too-large";
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
