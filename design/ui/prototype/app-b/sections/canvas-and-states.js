/* Canvas and its states: the drawing with one legend (an entry selects the row that paints it),
   note markers, the "not drawn" line with Show all, and the state cards (loading, empty graph,
   too large to draw, GPU lost). Plain ASCII.

   What paints: at rest the tree's top painting row is PageRank, which colors every node, so the
   drawing is recolored at runtime with each node's PageRank on the measure ramp (the rows below it
   still match, and show through when its eye is off). PageRank here is the same computation as the
   measure inspector's: networkx les_miserables_graph, unweighted, damping 0.85, keyed by the node's
   position in the kit's drawings (every Les Miserables drawing places the 77 nodes identically).

   Numbers: Les Miserables and Patent citations from kit/fixtures.json. Two drawings are derived
   here at runtime from the kit's Les Miserables SVGs (nothing new is invented about the graph):
   "hidden on canvas" drops the 4 group-0 nodes and their edges; "Everything hidden" keeps groups
   2 and 8 painted and turns every other node into a faint outline. In the too-large state this
   section also draws the table dock (the Patent citations nodes), since the shared table dock
   shows Les Miserables. Styles are injected once from this file. */
(function () {
    "use strict";
    const CSS = `
.cs-marker { position: absolute; display: inline-flex; align-items: center; gap: 2px; height: 18px; padding: 0 5px 0 4px; border-radius: 9px 9px 2px 9px; transform: translate(calc(-100% - 6px), calc(-100% - 2px)); background: var(--cm-bg); color: var(--cm-text); box-shadow: var(--cm-elevation-200), inset 0 0 0 1px var(--cm-border); font-size: 11px; line-height: 16px; font-weight: 550; font-variant-numeric: tabular-nums; cursor: pointer; z-index: 2; }
.cs-marker:hover, .cs-marker:focus-visible { background: var(--cm-bg-hover); }
.cs-marker .k-i { color: var(--cm-icon-secondary); }
.cs-edge { position: absolute; width: 18px; height: 18px; border-radius: 50%; transform: translate(-50%, -50%); }
.cs-edge:hover, .cs-edge:focus-visible { box-shadow: 0 0 0 2px var(--k-mark-out), 0 0 0 4px var(--k-mark-in); }
.cs-legend .k-lg-row[data-off] { color: var(--cm-text-tertiary); }
.cs-legend .k-lg-row[data-off] .k-chit { opacity: .35; }
.cs-outline { display: inline-block; width: 10px; height: 10px; border-radius: 50%; box-shadow: inset 0 0 0 1.3px var(--cm-icon-secondary); opacity: .7; flex: none; }
.cs-lg-link { color: var(--cm-text-brand); text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
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
.cs-scope { display: flex; align-items: center; gap: 8px; }
.cs-danger { color: var(--cm-text-danger); }
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
            p.then((url) => { img.src = url; }).catch((e) => console.error(e));
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
    function everythingHidden(doc, theme) {
        const keep = [groupColor("2"), groupColor("8")];
        const faint = theme === "dark" ? "#6E6E6E" : "#9E9E9E";
        nodePairs(doc).forEach((p) => {
            if (keep.includes(p.fill)) return;
            p.c.setAttribute("fill", "none");
            p.c.setAttribute("stroke", faint);
            p.c.setAttribute("stroke-width", "1.2");
            p.c.setAttribute("stroke-opacity", "0.8");
            if (p.ring) p.ring.remove();
        });
        const edges = doc.querySelector("g[stroke]");
        if (edges) edges.setAttribute("stroke-opacity", "0.25");
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
    function zoomButton() {
        return h("span", Object.assign({ id: "ab-zoom", class: "k-btn k-btn-ghost ab-zoom", role: "button", "aria-haspopup": "menu", title: "Zoom and view" }, AB.act({ go: ["zoom-and-view-menu", "2d"] })), "100%", icon("chevron-down", "sm"));
    }
    function helpButton() {
        return h("span", Object.assign({ class: "k-help", role: "button", "aria-label": "Keyboard shortcuts", title: "Keyboard shortcuts (?)" }, AB.act({ go: ["commands-and-search", "shortcuts"] })), icon("circle-help"));
    }
    function legendRow(swatch, label, count, go, extra) {
        const r = h("div", Object.assign({ class: "k-lg-row", title: go ? "Select the row that paints this" : null }, extra || {}), swatch, label, count != null ? h("span", { class: "k-value" }, count) : null);
        return go ? AB.nav(r, go[0], go[1]) : r;
    }

    // The legend for the drawing at rest: what wins color (PageRank), what the rows beneath it would
    // show, and size. opts.hidden0: group 0 is hidden on canvas.
    function pagerankLegend(opts) {
        const f = L().frame;
        return h("div", { class: "k-legend-card ab-legend cs-legend", role: "group", "aria-label": "Legend" },
            AB.nav(h("div", { class: "k-lg-title", title: "Select the row that paints this" }, "Color: PageRank"), "inspector-measure-row", "style"),
            AB.nav(h("div", { class: "k-lg-row", title: "Select the row that paints this" }, h("b", { class: "k-ramp k-ramp-measure" }), h("span", { class: "k-num" }, PR_DOMAIN[0] + " to " + PR_DOMAIN[1])), "inspector-measure-row", "style"),
            h("div", { class: "k-lg-sub" }, "Covers Louvain, Watchlist and Groups 2 and 8 for color. Hide its eye to see them."),
            AB.nav(h("div", { class: "k-lg-title ab-lg-size", title: "Select the row that paints this" }, "Size: Degree ", f.sizeMarks.map((m) => h("span", { class: "ab-dot", style: `width:${m.px / 2}px;height:${m.px / 2}px`, title: "degree " + m.degree }))), "inspector-measure-row", "style"),
            opts.hidden0
                ? h("div", { class: "k-notdrawn", role: "status" }, f.legend.rows.find((r) => r.label === "0").count + " nodes not drawn: hidden on canvas. ",
                    h("a", Object.assign({ role: "button" }, AB.act({ onClick: () => AB.flash("Selects the 4 hidden nodes (not wired in the skeleton)") })), "Select hidden"), ", ",
                    h("a", Object.assign({ role: "button" }, AB.act({ go: ["canvas-and-states", "drawn"] })), "Show all"))
                : h("div", { class: "cs-lg-foot" }, h("span", Object.assign({ class: "cs-lg-link", role: "link" }, AB.act({ go: ["table-dock", "nodes"] })), "Show in table")),
        );
    }

    // Note markers: notes about single elements, from the Notes place (Valjean 2, Javert 1).
    function markers() {
        const a = L().anchors;
        const mk = (anchor, count, label, go) => h("span", Object.assign({ class: "cs-marker", style: `left:${anchor.x}%;top:${anchor.y}%`, role: "link", "aria-label": count + (count > 1 ? " notes" : " note") + " about " + label, title: count + (count > 1 ? " notes" : " note") + " about " + label }, AB.act({ go })), icon("message-square", "sm"), String(count));
        return [mk(a.selected, 2, "Valjean", ["inspector-node", "data"]), mk(a.hover, 1, "Javert", ["notes-place", "all"])];
    }

    // Hot spots on the drawing: Valjean (node) and the Fantine to Valjean edge.
    function hotspots() {
        const a = L().anchors.selected;
        const v = byLabel("Valjean");
        const node = h("span", { class: "ab-hot", style: `left:${a.x}%;top:${a.y}%`, title: `Valjean: group ${v.group}, degree ${v.degree}`, "aria-label": "Valjean" });
        AB.nav(node, "inspector-node", "why-this-look");
        node.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); AB.go("context-menus", "node"); });
        // midpoint of Fantine (626.4, 181) to Valjean (698.7, 394.3) in the 1200 x 800 drawing
        const edge = h("span", { class: "cs-edge", style: "left:55.21%;top:35.96%", title: "Fantine to Valjean", "aria-label": "Edge Fantine to Valjean" });
        AB.nav(edge, "inspector-edge", "style");
        edge.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); AB.go("context-menus", "edge"); });
        return [node, edge];
    }

    function card(o) {
        return h("div", { class: "k-canvas-card cs-card", role: o.role || "status", "aria-live": "polite" },
            h("div", { class: "k-canvas-card-title" }, o.icon, h("span", null, o.title)),
            o.body,
            o.acts ? h("div", { class: "k-canvas-card-acts" }, o.acts) : null);
    }

    // ---------- the states ----------
    function drawn(el, state) {
        const f = L().frame;
        const stage = h("div", { class: "k-stage", tabindex: "0", "aria-label": f.altSized });
        const alt = "Les Miserables colored by PageRank, sized by degree";
        const edited = AB.route && AB.route.frame.right === "inspector-node/edited";
        stage.append(...AB.lesmisDrawing("lesmis-groups-rest", alt, state === "hidden-on-canvas" ? hideGroup0 : null, edited ? valjeanOverride : null));
        stage.append(...hotspots());
        if (state !== "markers-off") stage.append(...markers());
        el.append(stage, pagerankLegend({ hidden0: state === "hidden-on-canvas" }), zoomButton(), helpButton());
    }

    // The transfers data, for the places that work on it (Data, the many-groups run): the density
    // drawing, or colored by the March Louvain run with its legend
    function transfers(el, state) {
        const T = AB.fx.datasets.transactions;
        if (state === "transfers") {
            el.append(h("div", { class: "k-stage", tabindex: "0", "aria-label": T.frame.altSized }, ...AB.drawing("transactions-density", T.frame.altSized)), zoomButton(), helpButton());
            return;
        }
        const lg = AB.fx.datasets.transactionsApril.legends.march;
        const run = ["inspector-run-row", "many-groups"];
        el.append(
            h("div", { class: "k-stage", tabindex: "0", "aria-label": "Transfers, March: accounts colored by Louvain community" }, ...AB.drawing("transactions-march-communities", "Transfers, March: accounts colored by Louvain community")),
            h("div", { class: "k-legend-card ab-legend cs-legend", role: "group", "aria-label": "Legend" },
                h("div", { class: "k-lg-title" }, "Louvain, weighted by amount"),
                lg.rows.map((r) => legendRow(AB.chit(r.color), r.name, n(r.count), run)),
                legendRow(AB.chit(AB.fx.canvas.otherGray), lg.other.communities + " more", n(lg.other.count), ["table-dock", "transfers"]),
                h("div", { class: "k-lg-sub" }, lg.other.holds + " share one color")),
            zoomButton(), helpButton());
    }

    function everything(el) {
        const f = L().frame;
        const g = (lab) => f.legend.rows.find((r) => r.label === lab);
        const painted = g("2").count + g("8").count;
        const stage = h("div", { class: "k-stage", tabindex: "0", "aria-label": "Les Miserables with Everything hidden: groups 2 and 8 painted, every other node a faint outline" });
        stage.append(...derived("lesmis-groups-onesize", "everything-hidden", everythingHidden));
        stage.append(...markers());
        el.append(stage,
            h("div", { class: "k-legend-card ab-legend cs-legend", role: "group", "aria-label": "Legend" },
                h("div", { class: "k-lg-title" }, "Group color ", h("span", { class: "k-secondary" }, "group")),
                legendRow(AB.chit(g("2").color), "Group 2", g("2").count, ["inspector-group-set-path-row", "group-2"]),
                legendRow(AB.chit(g("8").color), "Group 8", g("8").count, ["inspector-group-set-path-row", "group-8"]),
                h("div", { class: "k-lg-row cs-lg-foot" }, h("span", { class: "cs-outline" }), "Painted by no row", h("span", { class: "k-value" }, String(L().nodes - painted))),
                h("div", Object.assign({ class: "k-lg-sub" }), AB.link("inspector-selection-and-everything", "everything", "Show Everything"))),
            zoomButton(), helpButton());
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
        }));
    }

    function empty(el) {
        el.append(card({
            icon: icon("database"), title: "No nodes to draw",
            body: [h("div", { class: "k-secondary" }, "This graph is empty. Add data to draw it: open a file, paste rows, or join a source in Data."), oq("what the inspector shows for a graph with no nodes")],
            acts: [AB.button("Add data...", { go: ["load-step", "preview"] }), AB.button("Paste data", { kind: "secondary", onClick: () => AB.flash("Paste data, Ctrl+V (not wired in the skeleton)") })],
        }), zoomButton(), helpButton());
    }

    function tooLarge(el) {
        const c = C();
        el.append(
            card({
                icon: icon("eye-off"), title: "Too large to draw",
                body: [
                    h("div", null, n(c.nodes) + " nodes is past the drawing limit of " + n(c.drawingLimit) + " nodes, so nothing is drawn."),
                    h("div", { class: "k-secondary" }, "The tree, the table and the inspector still work: run measures, find groups, sort and select. To draw a part, add a filter step."),
                ],
                acts: [AB.button("Narrow the graph...", { go: ["data-place", "filters"] }), AB.button("Open the table", { kind: "secondary", onClick: () => { const d = document.querySelector(".ab-main[data-dock='closed']"); if (d) AB.toggleDock(); else AB.flash("The table is open below"); } })],
            }),
            h("div", { class: "k-legend-card ab-legend cs-legend", role: "group", "aria-label": "Legend" },
                h("div", { class: "k-notdrawn", role: "status", style: "border-top:0;margin-top:0;padding-top:0" }, c.notDrawnLine + ". ", h("a", Object.assign({ role: "button" }, AB.act({ go: ["data-place", "filters"] })), "Narrow the graph..."))),
            zoomButton(), helpButton(),
        );
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
        }), zoomButton(), helpButton());
    }

    // The table dock in the too-large state: Patent citations, nothing drawn, every row works.
    function citationsDock(el, tab) {
        const c = C();
        const t = (label, id) => h("span", Object.assign({ class: "k-tab", role: "tab", "aria-selected": String(tab === id) }, AB.act({ onClick: () => { el.replaceChildren(); citationsDock(el, id); } })), label);
        const pick = (what) => () => AB.flash("Selects " + what + " (not wired in the skeleton)");
        const table = tab === "edges"
            ? h("table", { class: "k-table" }, h("thead", null, h("tr", null, h("th", null, "citing"), h("th", null, "cited"))),
                h("tbody", null, c.firstRows.map((r) => h("tr", Object.assign({}, AB.act({ onClick: pick(r.citing + " to " + r.cited) })), h("td", { class: "k-id" }, r.citing), h("td", { class: "k-id" }, r.cited)))))
            : h("table", { class: "k-table" }, h("thead", null, h("tr", null, h("th", null, "id"), h("th", { class: "k-n" }, "grantYear"), h("th", null, "category ", h("span", { class: "k-profile" }, c.profiles.category + " values")), h("th", { class: "k-n" }, "citationsReceived ", h("span", { class: "k-profile" }, c.profiles.citationsReceived.join(" to "))))),
                h("tbody", null, c.rows.slice(0, 12).map((r) => h("tr", Object.assign({}, AB.act({ onClick: pick("patent " + r.id) })), h("td", { class: "k-id" }, r.id), h("td", { class: "k-n" }, String(r.grantYear)), h("td", null, r.category), h("td", { class: "k-n" }, n(r.citationsReceived))))));
        el.append(
            h("div", { class: "k-dock-tabs" }, h("span", { role: "tablist", class: "ab-tablist" }, t("Nodes", "nodes"), t("Edges", "edges")), h("span", { class: "k-grow" }), AB.iconButton("search", "Find in table", { go: ["commands-and-search", "find"] }), AB.dockToggle()),
            h("div", { class: "k-scope cs-scope" }, tab === "edges" ? "Full graph: " + n(c.edges) + " edges, not drawn. First rows of " + c.file + "." : "Full graph: " + n(c.nodes) + " nodes, not drawn. Sorted by citationsReceived."),
            h("div", { class: "k-table-wrap" }, table),
        );
    }

    registerSection({
        id: "canvas-and-states",
        title: "Canvas and its states",
        region: "canvas",
        rail: "graph",
        closeTo: "graph-place",
        frame(state) {
            if (state === "everything-hidden") return { left: "graph-place/everything-hidden" };
            if (state === "empty") return { left: "graph-place/empty", right: false, dock: false };
            if (state === "loading") return { left: "graph-place/empty" };
            if (state === "too-large") return { left: "graph-place/empty", right: "inspector-nothing-selected/large", dock: "canvas-and-states/too-large" };
            if (state === "gpu-lost") return { left: "graph-place/failed" };
            if (state === "transfers") return { left: "data-place/at-rest" };
            if (state === "transfers-communities") return { left: "graph-place/many-groups", right: "inspector-run-row/many-groups" };
            return { left: "graph-place/at-rest" };
        },
        states: [
            { id: "drawn", label: "Drawn (Les Miserables)" },
            { id: "markers-off", label: "Note markers off" },
            { id: "hidden-on-canvas", label: "Nodes hidden on canvas" },
            { id: "everything-hidden", label: "Everything hidden" },
            { id: "loading", label: "Loading" },
            { id: "empty", label: "Empty graph" },
            { id: "too-large", label: "Too large to draw" },
            { id: "gpu-lost", label: "GPU lost" },
            { id: "transfers", label: "Transfers data (Data place)" },
            { id: "transfers-communities", label: "Transfers, colored by community" },
        ],
        render(el, state, ctx) {
            if (ctx.region === "dock") { citationsDock(el, "nodes"); return; }
            if (state === "everything-hidden") everything(el);
            else if (state === "loading") loading(el);
            else if (state === "empty") empty(el);
            else if (state === "too-large") tooLarge(el);
            else if (state === "gpu-lost") gpuLost(el);
            else if (state.startsWith("transfers")) transfers(el, state);
            else drawn(el, state);
            el.oncontextmenu = (e) => { e.preventDefault(); AB.go("context-menus", "canvas"); };
        },
    });
})();
