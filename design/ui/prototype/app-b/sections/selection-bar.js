/* Selection bar, version 3: while something is selected, a second bar sits directly above the
   toolbar, drawn with the same 32 px icon buttons, tooltip and separators. Five verbs, in the node
   menu's order: Neighborhood, Path between, Create set, Hide on canvas (or Show on canvas), Add note. The same verbs are in
   the selection's context menu. The Neighborhood popover grows the one-hop selection to 1 to 3
   hops (and Out, In or Both on a directed graph) and commits as a filter step or as step groups.
   This section also patches the canvas it sits on: the drawing for the selection, and the "not
   drawn" line after Hide on canvas. Plain ASCII. */
(function () {
    "use strict";
    const act = AB.act;
    const C = (id) => AB.COMMANDS[id];

    // The canvas drawing that shows each Les Miserables state's selection (fixture drawings only).
    const DRAWING = {
        "one-node": ["lesmis-groups-valjean", "Les Miserables colored by PageRank, Valjean selected"],
        "two-nodes": ["lesmis-groups-valjean", "Les Miserables colored by PageRank, Valjean and Javert selected"],
        neighborhood: ["lesmis-neighbors", "Les Miserables, Valjean selected with his 36 neighbors"],
        hidden: ["lesmis-groups-rest", "Les Miserables colored by PageRank, Valjean not drawn"],
        "long-name": ["lesmis-groups-valjean", "Les Miserables colored by PageRank, Jean Valjean selected"],
        "long-name-path": ["lesmis-groups-valjean", "Les Miserables colored by PageRank, Jean Valjean selected"],
        "filtered-to-neighbors": ["lesmis-groups-valjean", "Les Miserables filtered to Valjean's neighbors"],
    };

    // Both selected nodes carry the selection ring: copy Valjean's two rings onto Javert
    function ringJavert(doc) {
        const V = [698.7, 394.3], J = ["755.4", "392"];
        const at = (c, x, y) => c.getAttribute("cx") === String(x) && c.getAttribute("cy") === String(y);
        const circles = [...doc.querySelectorAll("circle")];
        const vFill = circles.find((c) => at(c, V[0], V[1]) && c.getAttribute("fill") !== "none");
        const jFill = circles.find((c) => at(c, J[0], J[1]) && c.getAttribute("fill") !== "none");
        if (!vFill || !jFill) return;
        const dr = +jFill.getAttribute("r") - +vFill.getAttribute("r");
        const rings = circles.filter((c) => at(c, V[0], V[1]) && c.getAttribute("fill") === "none" && c.getAttribute("stroke-width") === "2");
        rings.forEach((r) => { const k = r.cloneNode(); k.setAttribute("cx", J[0]); k.setAttribute("cy", J[1]); k.setAttribute("r", String(+r.getAttribute("r") + dr)); r.parentNode.append(k); });
    }
    // Hidden on canvas: Valjean, his ring, his label and his edges are not drawn
    function hideValjean(doc) {
        const V = ["698.7", "394.3"];
        doc.querySelectorAll("circle").forEach((c) => { if (c.getAttribute("cx") === V[0] && c.getAttribute("cy") === V[1]) c.remove(); });
        doc.querySelectorAll("line").forEach((l) => { if ((l.getAttribute("x1") === V[0] && l.getAttribute("y1") === V[1]) || (l.getAttribute("x2") === V[0] && l.getAttribute("y2") === V[1])) l.remove(); });
        doc.querySelectorAll("text").forEach((t) => { if (t.textContent.trim() === "Valjean") t.remove(); });
    }
    // Filtered to neighbors: only the nodes within the step's hops of Valjean, and the edges among
    // them, are drawn (read from the drawing's own edges)
    function keepNear(hops) {
        const fn = (doc) => {
            const key = (x, y) => x + "," + y;
            const lines = [...doc.querySelectorAll("line")].map((l) => [l, key(l.getAttribute("x1"), l.getAttribute("y1")), key(l.getAttribute("x2"), l.getAttribute("y2"))]);
            let keep = new Set([key("698.7", "394.3")]);
            for (let i = 0; i < hops; i++) {
                const next = new Set(keep);
                lines.forEach(([, a, b]) => { if (keep.has(a)) next.add(b); if (keep.has(b)) next.add(a); });
                keep = next;
            }
            const pts = [];
            doc.querySelectorAll("circle").forEach((c) => { const k = key(c.getAttribute("cx"), c.getAttribute("cy")); if (keep.has(k)) pts.push([+c.getAttribute("cx"), +c.getAttribute("cy")]); else c.remove(); });
            lines.forEach(([l, a, b]) => { if (!keep.has(a) || !keep.has(b)) l.remove(); });
            // a label sits just right of its node, 4 px lower
            doc.querySelectorAll("text").forEach((t) => {
                const x = +t.getAttribute("x"), y = +t.getAttribute("y");
                if (!pts.some(([cx, cy]) => x - cx >= 0 && x - cx < 40 && Math.abs(y - 4 - cy) < 3)) t.remove();
            });
        };
        Object.defineProperty(fn, "name", { value: "keepNear" + hops });
        return fn;
    }
    function patchCanvas(state) {
        const cv = document.getElementById("ab-canvas");
        const d = DRAWING[state];
        // the node inspector's edited state draws its own canvas (Valjean in his Overrides color)
        // only the Les Miserables drawing has these selections; another project's canvas keeps its own
        if (!cv || !d || (AB.route && (AB.route.frame.right === "inspector-node/edited" || AB.route.frame.dataset !== "lesmis"))) return;
        const imgs = cv.querySelectorAll(".k-stage img");
        const f = state === FILTERED ? filteredOf() : null;
        if (f && f.who !== "Valjean") return;
        if (imgs.length && AB.lesmisDrawing) AB.lesmisDrawing(d[0], d[1], null, state === "two-nodes" ? ringJavert : state === "hidden" ? hideValjean : f ? keepNear(f.hops) : null).forEach((img, i) => { if (imgs[i]) imgs[i].replaceWith(img); });
        // "1 node not drawn" is said once, in the tree footer (graph-place), not again on the legend card
    }

    // A node whose name does not fit (60 characters): the bar's accessible name carries it whole; the
    // inspector header and the Path popover's From and To cut it with the end ellipsis (prose names
    // use k-ellipsis, never the middle one) and keep the full text in the tooltip. The bar itself
    // stays icons only, as the toolbar under it. To is a second long name, as picked on the canvas.
    const LONG = { from: "Jean Valjean, known as Madeleine, mayor of Montreuil-sur-Mer", to: "Inspector Javert of the Paris police, once a guard at Toulon" };
    const isLong = (state) => state === "long-name" || state === "long-name-path";
    function patchLongName() {
        const n = document.querySelector("#ab-right .ab-insp-head .k-name");
        if (!n || n.textContent === LONG.from) return;
        n.textContent = LONG.from;
        AB.tip(n, LONG.from, { label: false });
    }
    // The Path popover is path-popover's own; this state draws it and writes the two long names into
    // its From and To, again after each redraw (picking a field redraws the popover)
    function longPathPopover(el, ctx) {
        ctx.renderSection("path-popover/from-selection", el);
        const fill = () => el.querySelectorAll(".pp-pick").forEach((f) => {
            const which = /^From/.test(f.getAttribute("aria-label")) ? "from" : "to", label = which === "from" ? "From" : "To";
            const span = f.querySelector(".k-ellipsis");
            if (!span || span.textContent === LONG[which]) return;
            span.textContent = LONG[which];
            f.setAttribute("aria-label", label + ": " + LONG[which]);
            AB.tip(f, label + ": " + LONG[which], { label: false });
        });
        fill();
        const mo = new MutationObserver(fill);
        mo.observe(el, { childList: true, subtree: true });
        window.addEventListener("hashchange", () => mo.disconnect(), { once: true });
        // Esc, the X and a click outside close it to the long-name bar, not to Valjean's. The shell's
        // Esc skips a route that closes to its own section, so Esc and the X are routed here, as in
        // the Neighborhood popover
        if (AB.route) AB.route.closeTo = { id: "selection-bar", state: "long-name" };
        const shut = (e) => { if (e.type === "keydown" && e.key !== "Escape") return; e.preventDefault(); e.stopImmediatePropagation(); AB.close(); };
        el.addEventListener("keydown", shut);
        el.addEventListener("click", (e) => { if (e.target.closest(".k-popover-head [aria-label='Close']")) shut(e); }, true);
    }

    // Who is selected in each state
    const L = () => AB.fx.datasets.lesmis;
    const T = () => AB.fx.datasets.transactions.setsAndPaths;
    function subject(state) {
        if (state === "two-nodes") return { names: "Valjean, Javert", n: 2 };
        if (state === "five-nodes") return { names: "Valjean, Javert, Thenardier, Fantine, Cosette", n: 5 };
        if (state === "neighborhood-directed") return { names: T().merchant.id, n: 1, directed: true };
        if (isLong(state)) return { names: LONG.from, n: 1 };
        // one element: the one the inspector shows (a node the canvas walk reached, a door-entries person)
        const head = document.querySelector("#ab-right .ab-insp-head .k-name");
        return { names: (AB.walked && AB.walked.name) || (head && head.textContent.trim()) || "Valjean", n: 1 };
    }

    // The walk's readout, visible over the bar: the node and the number it is read with, named
    // ("Valjean, 36 connections"), never a bare number
    function readout(state) {
        if (state !== "one-node") return null;
        const ds = (AB.route && AB.route.frame.dataset) || "lesmis";
        const w = AB.walked && AB.walked.dataset === ds ? AB.walked : null;
        const name = subject(state).names;
        const n = w ? w.neighbors : ds === "lesmis" && name === "Valjean" ? L().valjeanNeighbors : null;
        if (n == null) return null;
        return h("div", { class: "k-caption", style: "padding:2px 8px;border-radius:5px;background:var(--cm-bg);box-shadow:var(--cm-field-shadow)" }, name + ", " + AB.count(n, "connection"));
    }

    // Filter to neighbors: one filter step, counted by the header's filter chip. The state draws the
    // last one committed (a direct visit: Valjean, 1 hop) over the panels it was committed from.
    const FILTERED = "filtered-to-neighbors";
    let filtered = null;
    const filteredOf = () => filtered || { ds: "lesmis", who: "Valjean", hops: 1, dir: "both", frame: null };
    function chipOf(f) {
        // counts only where the fixtures hold them: Valjean and his neighbors; the merchant and its payers
        const n = f.hops !== 1 ? null
            : f.ds === "lesmis" && f.who === "Valjean" ? [L().valjeanNeighbors + 1, L().nodes]
            : f.ds === "transactions" && f.who === T().merchant.id && f.dir === "in" ? [T().payers.count + 1, AB.fx.datasets.transactions.nodes] : null;
        return "Filtered: " + (n ? AB.count(n[0], "node", { of: n[1] }) : "neighbors of " + f.who);
    }
    function filteredFrame() {
        const f = filteredOf();
        const base = f.frame || { left: "graph-place/at-rest", right: "inspector-node/why-this-look" };
        return Object.assign({}, base, { chip: chipOf(f), filterOn: null });
    }

    // After a commit: the result is the selected row; the notice keeps only Undo. The shell clears
    // the notice slot on every route, so the notice is raised once the new route has drawn.
    function commit(to, text, undo) {
        window.addEventListener("hashchange", () => AB.notice(text, { label: "Undo", go: undo }), { once: true });
        AB.go(to[0], to[1]);
    }

    // One edge: Path between needs two nodes, and Neighborhood is a node's; Create set, Hide and Add note act on the edge
    function edgeBar() {
        const s = subject("one-edge");
        const here = [AB.route.id, AB.route.state];
        const ds = AB.route.frame.dataset;
        const tree = ["graph-place", AB.placeOf(ds, "graph") || "at-rest"];
        return AB.toolbarBar([
            AB.toolbarButton("route", C("find-paths").label.replace(/\.\.\.$/, ""), { key: C("find-paths").shortcut, popup: "dialog", disabled: "Select two nodes, or a node and a set; an edge has no path to find" }),
            "sep",
            AB.toolbarButton(AB.ICON.createSet, C("create-set").label, { key: C("create-set").shortcut, onClick: () => commit(tree, "Created set of 1 edge", here) }),
            AB.toolbarButton(AB.ICON.hidden, C("hide-on-canvas").label, { key: C("hide-on-canvas").shortcut, open: false, onClick: () => AB.notice(s.names + " hidden on canvas", { label: "Undo", go: here }) }),
            "sep",
            AB.toolbarButton(AB.ICON.addNote, C("add-note").label, { key: C("add-note").shortcut, onClick: () => AB.addNote() }),
        ], "Selection: " + s.names);
    }

    // Another project than Les Miserables (the door entries, the hosts, the researchers, ...): the bar's
    // verbs act on it and land in its own places; the transfers' Neighborhood keeps its directed state
    const other = () => { const ds = AB.route && AB.route.frame.dataset; return ds && ds !== "lesmis" ? ds : null; };
    function bar(state) {
        if (state === "one-edge") return edgeBar();
        const s = subject(state);
        const hidden = state === "hidden";
        const ds = other();
        const here = [AB.route.id, AB.route.state];
        const back = ds ? here : state === "neighborhood-directed" ? ["selection-bar", "neighborhood-directed"] : ["selection-bar", state === "two-nodes" ? "two-nodes" : isLong(state) ? "long-name" : "one-node"];
        const tree = ["graph-place", (ds && AB.placeOf(ds, "graph")) || "at-rest"];
        const setText = "Created set of " + s.n + (s.n === 1 ? " node" : " nodes");
        // The node menu's order (explore, then organize, then visibility, then notes), one command record per verb
        return AB.toolbarBar([
            AB.toolbarButton("target", C("neighborhood").label.replace(/\.\.\.$/, ""), { key: C("neighborhood").shortcut, popup: "dialog", open: state.startsWith("neighborhood"), go: ["selection-bar", s.directed || ds === "transactions" ? "neighborhood-directed" : "neighborhood"] }),
            AB.toolbarButton("route", C("find-paths").label.replace(/\.\.\.$/, ""), { key: C("find-paths").shortcut, popup: "dialog", open: state === "long-name-path", go: isLong(state) ? ["selection-bar", "long-name-path"] : C("find-paths").go }),
            "sep",
            AB.toolbarButton(AB.ICON.createSet, C("create-set").label, { key: C("create-set").shortcut, onClick: () => commit(tree, setText, back) }),
            hidden
                ? AB.toolbarButton(AB.ICON.shown, "Show on canvas", { key: C("hide-on-canvas").shortcut, open: false, go: ["selection-bar", "one-node"] })
                : AB.toolbarButton(AB.ICON.hidden, C("hide-on-canvas").label, { key: C("hide-on-canvas").shortcut, open: false, go: ["selection-bar", "hidden"] }),
            "sep",
            AB.toolbarButton(AB.ICON.addNote, C("add-note").label, { key: C("add-note").shortcut, onClick: () => AB.addNote() }),
        ], "Selection: " + s.names);
    }

    // ---------- Neighborhood: G selects one hop; the popover grows it in place ----------
    function neighborhoodPopover(anchor, directed) {
        const ds = !directed && other();
        // another project: the node the inspector shows, its own direction, and no counts the fixtures do not hold
        if (ds) directed = !!(AB.fx.datasets[ds] || {}).directed;
        const who = ds ? subject("one-node").names : directed ? T().merchant.id : "Valjean";
        let hops = 1, dir = "both";
        // Dated neighbors (directed transfers): only edges from this date on. graphty-element's
        // neighborhood takes depth and direction; the date is not one of its options yet
        const span = (AB.fx.datasets.transactions.attributes.find((a) => a.name === "timestamp (edge)") || {}).range || [];
        const day = (iso) => (iso || "").slice(0, 10);
        let from = day(span[0]);
        const fromBox = h("input", { type: "date", class: "k-field", style: "border:0;font:inherit;color-scheme:light dark", value: from, min: day(span[0]), max: day(span[1]), "aria-label": "From date",
            on: { change: (e) => { from = e.target.value || day(span[0]); paint(); } } });
        const timed = directed && (!ds || ds === "transactions");
        const dated = () => timed && from && from !== day(span[0]);
        const dateWord = () => new Date(from + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
        const said = h("div", { role: "status", style: "color:var(--cm-text-secondary);padding:0 16px 8px" });
        const hopsBox = h("span"), dirBox = h("span");
        const stepName = () => "Neighbors of " + who + ", " + (hops === 1 ? "1 hop" : "1 to " + hops + " hops") + (directed && dir !== "both" ? ", " + dir : "") + (dated() ? ", from " + dateWord() : "");
        function paint() {
            // AB.seg is redrawn on each pick; focus returns to the picked option so arrows keep working
            const again = (box) => { paint(); const f = box.querySelector("[aria-checked='true']"); if (f) f.focus(); };
            hopsBox.replaceChildren(AB.seg([1, 2, 3].map((n) => [n, String(n)]), hops, (n) => { hops = n; again(hopsBox); }, { label: "Hops" }));
            if (directed) dirBox.replaceChildren(AB.seg([["out", "Out"], ["in", "In"], ["both", "Both"]], dir, (d) => { dir = d; again(dirBox); }, { label: "Direction" }));
            // Counts only where the fixtures have them: Valjean's 36 neighbors; the 37 accounts that paid the merchant
            if (ds) said.textContent = "Selected: " + who + " and every node within " + (hops === 1 ? "1 hop" : hops + " hops") + (directed && dir === "out" ? " it points to." : directed && dir === "in" ? " that points to it." : ".");
            else if (!directed) said.textContent = hops === 1 ? "Selected: Valjean and his " + L().valjeanNeighbors + " neighbors." : "Selected: everyone within " + hops + " hops of Valjean.";
            else if (dated()) said.textContent = "Selected: " + who + " and every account within " + (hops === 1 ? "1 hop" : hops + " hops") + " by a transfer on or after " + dateWord() + ".";
            else if (hops === 1 && dir === "in") said.textContent = "Selected: " + who + " and the " + T().payers.count + " accounts that paid it.";
            else said.textContent = "Selected: " + who + " and every account within " + (hops === 1 ? "1 hop" : hops + " hops") + (dir === "out" ? " it pays." : dir === "in" ? " that pays it." : ", either way.");
        }
        paint();
        const back = ds ? ["selection-bar", "one-node"] : ["selection-bar", directed ? "neighborhood-directed" : "neighborhood"];
        const steps = ["graph-place", (ds && AB.placeOf(ds, "graph")) || "at-rest"];
        const p = AB.popover({
            anchor,
            title: "Neighborhood of " + who,
            width: 300,
            body: [
                AB.fieldRow("Hops", hopsBox, { popover: true }),
                AB.fieldRow("Direction", directed ? dirBox : h("span", { class: "k-caption" }, "Undirected graph"), { popover: true }),
                timed ? AB.fieldRow("From date", h("span", { style: "display:flex;align-items:center;gap:4px" }, fromBox, AB.needsElement("graphty-element's neighborhood takes depth and direction; a from date needs an edge time option")), { popover: true }) : null,
                said,
            ],
            foot: [
                AB.button("Add as steps", { kind: "secondary", onClick: () => commit(steps, "Added " + stepName() + ": one group per hop", back) }),
                AB.button("Filter to neighbors", { onClick: () => {
                    const fr = AB.route.frame;
                    // the panels it was committed from; the Les Miserables popover keeps Valjean's
                    filtered = { ds: ds || (directed ? "transactions" : "lesmis"), who, hops, dir: directed ? dir : "both",
                        frame: ds || directed ? { dataset: fr.dataset, left: fr.left, right: fr.right, canvas: fr.canvas, dock: false } : null };
                    commit(["selection-bar", FILTERED], "Added filter step: " + stepName(), back);
                } }),
            ],
        });
        // Closing keeps the selection (Esc never clears it). The shell's Esc does nothing here, because
        // closeTo is this same section, and its X and outside click go to the Les Miserables bar; so
        // Esc and the X are routed here, and the transfers popover closes to its own graph place.
        const out = ds ? ["selection-bar", "one-node"] : directed ? ["graph-place", "many-groups"] : ["selection-bar", "one-node"];
        const shut = (e) => { e.preventDefault(); e.stopImmediatePropagation(); AB.go(out[0], out[1]); };
        p.addEventListener("keydown", (e) => { if (e.key === "Escape") shut(e); });
        const x = p.querySelector(".k-popover-head [aria-label='Close']");
        if (x) x.addEventListener("click", shut, true);
        return p;
    }

    // On another project the one-node states keep its panels: the bar, its Neighborhood popover and Hide
    // act on the node the inspector shows, beside the same tree and canvas
    function keepProject(state) {
        const f = AB.route && AB.route.frame, ds = f && f.dataset;
        if (!ds || ds === "lesmis" || !["one-node", "neighborhood", "hidden"].includes(state)) return null;
        if (AB.route.id !== "selection-bar" && !(f.toolbar || "").startsWith("selection-bar/")) return null;
        const w = AB.walked && AB.walked.dataset === ds ? { walk: AB.walked.index + 1 } : {};
        return Object.assign({ dataset: ds, left: f.left, right: f.right, canvas: f.canvas }, w, state === "neighborhood" ? { dock: false, overlay: "selection-bar/neighborhood" } : { dock: f.dock });
    }
    registerSection({
        id: "selection-bar",
        title: "Selection bar",
        region: "toolbar",
        rail: "graph",
        closeTo: "selection-bar/one-node",
        states: [
            { id: "one-node", label: "One node selected" },
            { id: "two-nodes", label: "Two nodes selected" },
            { id: "five-nodes", label: "Five nodes selected" },
            { id: "neighborhood", label: "Neighborhood popover, undirected" },
            { id: "neighborhood-directed", label: "Neighborhood popover, directed (transfers)" },
            { id: "hidden", label: "After Hide on canvas" },
            { id: "one-edge", label: "One edge selected" },
            { id: "long-name", label: "One node with a 60-character name" },
            { id: "long-name-path", label: "Path between from the 60-character name" },
            { id: FILTERED, label: "After Filter to neighbors" },
        ],
        // The Neighborhood popover is this section's own overlay, so Esc, the X and a click outside close it
        frame: (state) => keepProject(state) || (state === FILTERED ? filteredFrame() : state === "neighborhood-directed"
            ? { dataset: "transactions", left: "graph-place/many-groups", right: false, dock: false, overlay: "selection-bar/neighborhood-directed" }
            : state === "one-edge" ? { left: "graph-place/at-rest", right: "inspector-edge/style", dock: "table-dock/edges" }
            : Object.assign({
                left: "graph-place/at-rest",
                right: state === "two-nodes" ? "inspector-several-elements/two-nodes" : state === "five-nodes" ? "inspector-several-elements/style" : "inspector-node/why-this-look",
            }, state === "neighborhood" ? { dock: false, overlay: "selection-bar/neighborhood" } : state === "long-name-path" ? { dock: false, overlay: "selection-bar/long-name-path" } : {})),
        render(el, state, ctx) {
            if (ctx.region === "overlay") {
                if (state === "long-name-path") return longPathPopover(el, ctx);
                el.append(neighborhoodPopover(document.querySelector("#ab-toolbar [data-tool='Neighborhood']"), state === "neighborhood-directed"));
                return;
            }
            patchCanvas(state);
            if (isLong(state)) patchLongName();
            const b = bar(state);
            const wrap = h("div", { style: "display:flex;flex-direction:column;align-items:center;gap:8px;max-width:100%" });
            if (state === "hidden") {
                AB.notice(subject("one-node").names + " hidden on canvas", { label: "Undo", go: ["selection-bar", "one-node"] });
                wrap.append(AB.openQuestion("Does a hidden node stay selected, keeping this bar?"));
            }
            // Notes are graphty-element API, except a note on an edge picked on the canvas
            if (state === "one-edge") wrap.append(AB.needsElement("graphty-element's notes attach to a node, a set or the graph; a note on an edge needs an edge subject"));
            const r = readout(state);
            if (r) wrap.append(r);
            wrap.append(b);
            el.append(wrap);
            ctx.renderSection("toolbar/at-rest", el);
        },
    });
})();
