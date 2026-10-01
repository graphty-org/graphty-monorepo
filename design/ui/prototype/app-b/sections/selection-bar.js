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
    function patchCanvas(state) {
        const cv = document.getElementById("ab-canvas");
        const d = DRAWING[state];
        if (!cv || !d) return;
        const imgs = cv.querySelectorAll(".k-stage img");
        if (imgs.length && AB.lesmisDrawing) AB.lesmisDrawing(d[0], d[1], null, state === "two-nodes" ? ringJavert : state === "hidden" ? hideValjean : null).forEach((img, i) => { if (imgs[i]) imgs[i].replaceWith(img); });
        // "1 node not drawn" is said once, in the tree footer (graph-place), not again on the legend card
    }

    // Who is selected in each state
    const L = () => AB.fx.datasets.lesmis;
    const T = () => AB.fx.datasets.transactions.setsAndPaths;
    function subject(state) {
        if (state === "two-nodes") return { names: "Valjean, Javert", n: 2 };
        if (state === "five-nodes") return { names: "Valjean, Javert, Thenardier, Fantine, Cosette", n: 5 };
        if (state === "neighborhood-directed") return { names: T().merchant.id, n: 1, directed: true };
        return { names: "Valjean", n: 1 };
    }

    // After a commit: the result is the selected row; the notice keeps only Undo. The shell clears
    // the notice slot on every route, so the notice is raised once the new route has drawn.
    function commit(to, text, undo) {
        window.addEventListener("hashchange", () => AB.notice(text, { label: "Undo", go: undo }), { once: true });
        AB.go(to[0], to[1]);
    }

    function bar(state) {
        const s = subject(state);
        const hidden = state === "hidden";
        const back = state === "neighborhood-directed" ? ["selection-bar", "neighborhood-directed"] : ["selection-bar", state === "two-nodes" ? "two-nodes" : "one-node"];
        const setText = "Created set of " + s.n + (s.n === 1 ? " node" : " nodes");
        // The node menu's order (explore, then organize, then visibility, then notes), one command record per verb
        return AB.toolbarBar([
            AB.toolbarButton("target", C("neighborhood").label, { key: C("neighborhood").shortcut, popup: "dialog", open: state.startsWith("neighborhood"), go: ["selection-bar", s.directed ? "neighborhood-directed" : "neighborhood"] }),
            AB.toolbarButton("route", C("find-paths").label.replace(/\.\.\.$/, ""), { key: C("find-paths").shortcut, popup: "dialog", go: C("find-paths").go }),
            "sep",
            AB.toolbarButton(AB.ICON.createSet, C("create-set").label, { key: C("create-set").shortcut, onClick: () => commit(["graph-place", "at-rest"], setText, back) }),
            hidden
                ? AB.toolbarButton(AB.ICON.shown, "Show on canvas", { key: C("hide-on-canvas").shortcut, open: false, go: ["selection-bar", "one-node"] })
                : AB.toolbarButton(AB.ICON.hidden, C("hide-on-canvas").label, { key: C("hide-on-canvas").shortcut, open: false, go: ["selection-bar", "hidden"] }),
            "sep",
            AB.toolbarButton(AB.ICON.addNote, C("add-note").label, { key: C("add-note").shortcut, go: C("add-note").go }),
        ], "Selection: " + s.names);
    }

    // ---------- Neighborhood: G selects one hop; the popover grows it in place ----------
    function neighborhoodPopover(anchor, directed) {
        const who = directed ? T().merchant.id : "Valjean";
        let hops = 1, dir = "both";
        const said = h("div", { role: "status", style: "color:var(--cm-text-secondary);padding:0 16px 8px" });
        const hopsBox = h("span"), dirBox = h("span");
        const stepName = () => "Neighbors of " + who + ", " + (hops === 1 ? "1 hop" : "1 to " + hops + " hops") + (directed && dir !== "both" ? ", " + dir : "");
        function paint() {
            // AB.seg is redrawn on each pick; focus returns to the picked option so arrows keep working
            const again = (box) => { paint(); const f = box.querySelector("[aria-checked='true']"); if (f) f.focus(); };
            hopsBox.replaceChildren(AB.seg([1, 2, 3].map((n) => [n, String(n)]), hops, (n) => { hops = n; again(hopsBox); }, { label: "Hops" }));
            if (directed) dirBox.replaceChildren(AB.seg([["out", "Out"], ["in", "In"], ["both", "Both"]], dir, (d) => { dir = d; again(dirBox); }, { label: "Direction" }));
            // Counts only where the fixtures have them: Valjean's 36 neighbors; the 37 accounts that paid the merchant
            if (!directed) said.textContent = hops === 1 ? "Selected: Valjean and his " + L().valjeanNeighbors + " neighbors." : "Selected: everyone within " + hops + " hops of Valjean.";
            else if (hops === 1 && dir === "in") said.textContent = "Selected: " + who + " and the " + T().payers.count + " accounts that paid it.";
            else said.textContent = "Selected: " + who + " and every account within " + (hops === 1 ? "1 hop" : hops + " hops") + (dir === "out" ? " it pays." : dir === "in" ? " that pays it." : ", either way.");
        }
        paint();
        const back = ["selection-bar", directed ? "neighborhood-directed" : "neighborhood"];
        const p = AB.popover({
            anchor,
            title: "Neighborhood of " + who,
            width: 300,
            body: [
                AB.fieldRow("Hops", hopsBox, { popover: true }),
                directed ? AB.fieldRow("Direction", dirBox, { popover: true }) : null, // hidden on an undirected graph
                said,
            ],
            foot: [
                AB.button("Add as steps", { kind: "secondary", onClick: () => commit(["graph-place", "at-rest"], "Added " + stepName() + ": one group per hop", back) }),
                AB.button("Filter to neighbors", { onClick: () => commit(["data-place", "filters"], "Added filter step: " + stepName(), back) }),
            ],
        });
        // Closing keeps the selection (Esc never clears it). The shell's Esc does nothing here, because
        // closeTo is this same section, and its X and outside click go to the Les Miserables bar; so
        // Esc and the X are routed here, and the transfers popover closes to its own graph place.
        const out = directed ? ["graph-place", "many-groups"] : ["selection-bar", "one-node"];
        const shut = (e) => { e.preventDefault(); e.stopImmediatePropagation(); AB.go(out[0], out[1]); };
        p.addEventListener("keydown", (e) => { if (e.key === "Escape") shut(e); });
        const x = p.querySelector(".k-popover-head [aria-label='Close']");
        if (x) x.addEventListener("click", shut, true);
        return p;
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
        ],
        // The Neighborhood popover is this section's own overlay, so Esc, the X and a click outside close it
        frame: (state) => state === "neighborhood-directed"
            ? { dataset: "transactions", left: "graph-place/many-groups", right: false, dock: false, overlay: "selection-bar/neighborhood-directed" }
            : Object.assign({
                left: "graph-place/at-rest",
                right: state === "two-nodes" ? "inspector-several-elements/two-nodes" : state === "five-nodes" ? "inspector-several-elements/style" : "inspector-node/why-this-look",
            }, state === "neighborhood" ? { dock: false, overlay: "selection-bar/neighborhood" } : {}),
        render(el, state, ctx) {
            if (ctx.region === "overlay") {
                el.append(neighborhoodPopover(document.querySelector("#ab-toolbar [data-tool='Neighborhood']"), state === "neighborhood-directed"));
                return;
            }
            patchCanvas(state);
            const b = bar(state);
            const wrap = h("div", { style: "display:flex;flex-direction:column;align-items:center;gap:8px;max-width:100%" });
            if (state === "hidden") {
                AB.notice("Valjean hidden on canvas", { label: "Undo", go: ["selection-bar", "one-node"] });
                wrap.append(AB.openQuestion("Does a hidden node stay selected, keeping this bar?"));
            }
            wrap.append(b);
            el.append(wrap);
            ctx.renderSection("toolbar/at-rest", el);
        },
    });
})();
