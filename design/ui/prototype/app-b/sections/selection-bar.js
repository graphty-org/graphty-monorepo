/* Selection bar: while something is selected and no tool is armed, a second row sits directly
   above the toolbar (never beside the selection, so it never covers it). Verbs only; the same
   verbs are in the selection's context menu. One node: Steps away. Two nodes: Path between
   (Shortest path, Most flow, Weakest cut), with direction and weight meaning shown before Run.
   Expand is not drawn: with the data loaded it was Neighborhood at one hop, and its real meaning
   (fetching neighbors) needs a source the element does not have.
   This section also patches the canvas it sits on: the drawing for the selection, and the "not
   drawn" line after Hide on canvas. Plain ASCII. */
(function () {
    "use strict";
    const act = AB.act;
    const CSS = [
        ".sb-wrap { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; }",
        ".sb-bar { gap: 2px; padding: 4px; height: 40px; max-width: 100%; }",
        ".sb-bar .k-btn { height: 32px; padding: 0 8px; gap: 6px; white-space: nowrap; }",
        ".sb-bar .k-btn[aria-current='true'] { background: var(--cm-bg-hover); }",
        ".sb-bar .sb-needs .sb-label { color: var(--cm-text-tertiary); }",
        ".sb-sep { width: 1px; align-self: stretch; margin: 4px 2px; background: var(--cm-border); }",
        "@container main (max-width: 760px) { .sb-bar .sb-label { display: none; } }",
        ".sb-pop { position: absolute; bottom: calc(100% + 8px); z-index: 6; max-width: calc(100vw - 32px); }",
        ".sb-pop .k-popover-body { padding: 8px 16px 12px; display: flex; flex-direction: column; gap: 10px; }",
        ".sb-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }",
        ".sb-line > .sb-name { width: 72px; flex: none; color: var(--cm-text-secondary); }",
        ".sb-line > .k-grow { color: var(--cm-text-secondary); }",
        ".sb-help { color: var(--cm-text-secondary); }",
        ".sb-actions { display: flex; flex-wrap: wrap; gap: 8px; }",
        ".sb-choices { display: flex; flex-direction: column; gap: 2px; }",
        ".sb-choice { display: grid; grid-template-columns: 16px 1fr; column-gap: 8px; padding: 6px 8px; border-radius: 6px; cursor: pointer; }",
        ".sb-choice:hover { background: var(--cm-bg-hover); }",
        ".sb-choice[aria-checked='true'] { background: var(--cm-bg-selected, var(--cm-bg-hover)); box-shadow: inset 0 0 0 1px var(--cm-border-brand, var(--cm-border)); }",
        ".sb-choice .sb-desc { grid-column: 2; color: var(--cm-text-secondary); }",
        ".sb-choice b { font-weight: 600; }",
        ".sb-k-off { opacity: .45; cursor: not-allowed; }",
        ".sb-meaning { padding: 8px; border-radius: 6px; background: var(--cm-bg-secondary); }",
        ".sb-oq { display: inline-block; max-width: 300px; white-space: normal; }",
        ".sb-oqs { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; max-width: 100%; }",
        ".sb-notdrawn-float { position: absolute; left: 12px; bottom: 12px; z-index: 4; padding: 6px 10px; border-radius: 8px; background: var(--cm-bg); box-shadow: var(--cm-elevation-200); }",
    ].join("\n");
    if (!document.getElementById("sb-css")) document.head.append(h("style", { id: "sb-css" }, CSS));

    const oq = (text) => h("span", { class: "k-annot-tag sb-oq", title: "Open question: " + text }, "Open question: " + text);
    const HIDE_REASON = "graphty-element has no draw-only hide: today a hidden node also leaves the layout and the measures";

    // The canvas drawing that shows each state's selection (fixture drawings only).
    const VALJEAN = ["lesmis-groups-valjean", "Les Miserables colored by PageRank, Valjean selected"];
    const DRAWING = {
        "one-node": VALJEAN,
        "two-nodes": ["lesmis-groups-valjean", "Les Miserables colored by PageRank, Valjean and Javert selected"],
        "path-between-open": ["lesmis-groups-valjean", "Les Miserables colored by PageRank, Valjean and Javert selected"],
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
    function patchCanvas(state) {
        const cv = document.getElementById("ab-canvas");
        if (!cv) return;
        const d = DRAWING[state];
        const imgs = cv.querySelectorAll(".k-stage img");
        const two = state === "two-nodes" || state === "path-between-open";
        if (imgs.length && AB.lesmisDrawing) AB.lesmisDrawing(d[0], d[1], null, two ? ringJavert : null).forEach((img, i) => { if (imgs[i]) imgs[i].replaceWith(img); });
        cv.querySelectorAll(".sb-notdrawn, .sb-notdrawn-float").forEach((n) => n.remove());
        if (state !== "hidden") return;
        const line = h("div", { class: "k-notdrawn sb-notdrawn", role: "status" }, "1 node not drawn: hidden on canvas (Valjean). ",
            h("a", Object.assign({ role: "button" }, act({ go: ["selection-bar", "one-node"] })), "Select hidden"), ", ",
            h("a", Object.assign({ role: "button" }, act({ go: AB.COMMANDS["show-hidden"].go })), AB.COMMANDS["show-hidden"].label), " ",
            AB.needsElement(HIDE_REASON));
        const card = cv.querySelector(".k-legend-card");
        if (card) card.append(line);
        else cv.append(h("div", { class: "sb-notdrawn-float" }, line));
    }

    // One verb; label and key come from the command table where the command has several doors.
    function verb(ic, label, key, target, o) {
        o = o || {};
        const b = AB.button(h("span", { class: "sb-label" }, label), Object.assign({ kind: "ghost", icon: ic }, target));
        b.title = (key ? label + " (" + key + ")" : label) + (o.needs ? ". Needs graphty-element: " + o.needs : "");
        b.setAttribute("aria-label", label);
        if (key) b.setAttribute("aria-keyshortcuts", key.replace(/Ctrl/g, "Control"));
        if (o.current) b.setAttribute("aria-current", "true");
        if (o.popup) b.setAttribute("aria-haspopup", "dialog");
        if (o.needs) { b.classList.add("sb-needs"); b.setAttribute("aria-description", "needs graphty-element: " + o.needs); }
        return b;
    }
    const C = (id) => AB.COMMANDS[id];

    function bar(state) {
        const two = state === "two-nodes" || state === "path-between-open";
        const hidden = state === "hidden";
        const setMsg = two ? "Set of 2 nodes (Valjean, Javert) added to the top of the tree" : "Set of 1 node (Valjean) added to the top of the tree";
        return h("div", { class: "k-secondary-bar sb-bar", role: "toolbar", "aria-label": "Selection: " + (two ? "Valjean, Javert" : "Valjean") },
            verb("bookmark-plus", C("create-set").label, C("create-set").shortcut, { onClick: () => { AB.flash(setMsg); AB.go("graph-place", "at-rest"); } }),
            h("span", { class: "sb-sep" }),
            verb("waypoints", C("neighborhood").label, C("neighborhood").shortcut, { go: ["selection-bar", "neighborhood"] }, { current: state === "neighborhood", popup: true }),
            two
                ? verb("route", "Path between", null, { go: ["selection-bar", "path-between-open"] }, { current: state === "path-between-open", popup: true })
                : verb("layers", "Steps away", null, { onClick: () => { AB.flash("Steps away from Valjean added to the top of the tree: one group per step, breadth-first"); AB.go("graph-place", "at-rest"); } }),
            hidden
                ? verb("eye", "Show on canvas", C("hide-on-canvas").shortcut, { go: ["selection-bar", "one-node"] }, { needs: HIDE_REASON })
                : verb("eye-off", C("hide-on-canvas").label, C("hide-on-canvas").shortcut, { go: ["selection-bar", "hidden"] }, { needs: HIDE_REASON }),
            h("span", { class: "sb-sep" }),
            verb("sticky-note", C("add-note").label, C("add-note").shortcut, { go: ["notes-place", "writing"] }),
            verb("flask-conical", "Analyze these...", null, { go: ["analyze-popover", "open"] }, { popup: true }),
        );
    }

    function seg(label, items, pick, onPick) {
        return h("span", { class: "k-seg", role: "radiogroup", "aria-label": label }, items.map((it) => {
            const off = !!it.off;
            return h("span", Object.assign({ role: "radio", tabindex: off ? "-1" : "0", "aria-checked": String(it.id === pick), "aria-disabled": off ? "true" : null, class: off ? "sb-k-off" : null, title: it.title || null },
                act({ onClick: (e) => {
                    if (off) { AB.flash(it.title); return; }
                    const g = e.currentTarget.parentNode;
                    g.querySelectorAll("[role=radio]").forEach((x) => x.setAttribute("aria-checked", String(x === e.currentTarget)));
                    if (onPick) onPick(it.id);
                } })), it.label);
        }));
    }
    const NO_DIRECTION = "Les Miserables has no edge direction: every edge counts both ways";

    // ---------- Neighborhood: one hop is selected on G; the popover grows it in place ----------
    function neighborhoodPopover() {
        const L = AB.fx.datasets.lesmis;
        let k = 1;
        const said = h("div", { class: "sb-help", role: "status" });
        const stepName = h("b");
        function setK(n) {
            k = n;
            said.textContent = k === 1
                ? "Selected: Valjean and his " + L.valjeanNeighbors + " neighbors."
                : "Selected: everyone within " + k + " hops of Valjean.";
            stepName.textContent = "Neighbors of Valjean, within " + k + (k === 1 ? " hop" : " hops");
        }
        setK(1);
        const back = () => AB.go("selection-bar", "one-node");
        return h("div", { class: "k-popover sb-pop", role: "dialog", "aria-label": "Neighborhood of Valjean", style: "width:300px" },
            h("div", { class: "k-popover-head" }, h("span", { class: "k-grow" }, "Neighborhood of Valjean"), AB.iconButton("x", "Close", { onClick: back })),
            h("div", { class: "k-popover-body" },
                h("div", { class: "sb-line" }, h("span", { class: "sb-name" }, "Hops"), seg("Hops", [1, 2, 3].map((n) => ({ id: n, label: String(n) })), 1, setK)),
                h("div", { class: "sb-line" }, h("span", { class: "sb-name" }, "Direction"),
                    seg("Direction", [{ id: "in", label: "In", off: true, title: NO_DIRECTION }, { id: "out", label: "Out", off: true, title: NO_DIRECTION }, { id: "both", label: "Both" }], "both")),
                said,
                h("div", { class: "sb-actions" },
                    AB.button("Filter to neighbors", { icon: "funnel", onClick: () => { AB.flash("Filter step added: " + stepName.textContent + ". Ctrl+Z removes it."); AB.go("data-place", "filters"); } }),
                    AB.button("Done", { kind: "ghost", onClick: back })),
                h("div", { class: "sb-help" }, "Filter to neighbors adds one step, ", stepName, ", to ", link("data-place", "filters", "Filters"), ". Everything outside it leaves the canvas and the measures until you undo or turn the step off."),
            ),
        );
    }

    // ---------- Path between: three questions about two nodes ----------
    const CHOICES = {
        shortest: {
            icon: "route", label: "Shortest path",
            desc: "The fewest steps from Valjean to Javert, or the least total weight.",
            runs: "graphty-element's Dijkstra (Bellman-Ford when a weight is negative)",
            weights: [{ id: "none", label: "None" }, { id: "value", label: "value" }],
            weight: "none",
            meaning: { none: "Every edge counts as one step.", value: "A higher value means farther apart: the path avoids characters who share many chapters." },
            lands: ["Path added: Valjean to Javert, 1 edge. It paints on top of the tree.", ["inspector-group-set-path-row", "path-lesmis"]],
        },
        flow: {
            icon: "arrow-right", label: "Most flow",
            desc: "How much can move from Valjean to Javert when each edge carries up to its weight.",
            runs: "graphty-element's max flow",
            weights: [{ id: "value", label: "value" }],
            weight: "value",
            meaning: { value: "A higher value means more capacity: an edge can carry as many units as the chapters the two share." },
            lands: ["Most flow from Valjean to Javert added to the top of the tree: the edges that carry it paint.", ["graph-place", "at-rest"]],
        },
        cut: {
            icon: "scissors", label: "Weakest cut",
            desc: "The cheapest set of edges whose removal separates Valjean from Javert.",
            runs: "graphty-element's min cut",
            weights: [{ id: "none", label: "None" }, { id: "value", label: "value" }],
            weight: "value",
            meaning: { none: "Every edge costs one to cut: the fewest edges.", value: "A higher value costs more to cut: the cut goes where the fewest chapters are shared." },
            lands: ["Weakest cut between Valjean and Javert added to the top of the tree: the cut edges paint.", ["graph-place", "at-rest"]],
        },
    };

    function pathPopover() {
        let pick = "shortest";
        let weight = CHOICES[pick].weight;
        const back = () => AB.go("selection-bar", "two-nodes");
        const choiceList = h("div", { class: "sb-choices", role: "radiogroup", "aria-label": "Question" });
        const weightBox = h("span");
        const meaning = h("div", { class: "sb-meaning", role: "status" });
        const runsLine = h("div", { class: "sb-help" });
        const runBtn = AB.button("Run", { icon: "play", onClick: () => { const c = CHOICES[pick]; AB.flash(c.lands[0]); AB.go(c.lands[1][0], c.lands[1][1]); } });

        function paint() {
            const c = CHOICES[pick];
            choiceList.querySelectorAll(".sb-choice").forEach((x) => x.setAttribute("aria-checked", String(x.dataset.id === pick)));
            weightBox.replaceChildren(seg("Weight", c.weights, weight, (w) => { weight = w; paintMeaning(); }));
            paintMeaning();
            runsLine.textContent = "Runs " + c.runs + " on the full graph, " + AB.fx.datasets.lesmis.nodes + " nodes. The result lands as a row on top of the tree.";
        }
        function paintMeaning() {
            meaning.replaceChildren(h("b", null, weight === "none" ? "No weight. " : "Weight: value, the chapters two characters share. "), CHOICES[pick].meaning[weight]);
        }
        Object.keys(CHOICES).forEach((id) => {
            const c = CHOICES[id];
            choiceList.append(h("div", Object.assign({ class: "sb-choice", role: "radio", tabindex: "0", "data-id": id, "aria-checked": "false" },
                act({ onClick: () => { pick = id; weight = c.weight; paint(); } })),
                icon(c.icon, "sm"), h("b", null, c.label), h("span", { class: "sb-desc" }, c.desc)));
        });
        paint();

        return h("div", { class: "k-popover sb-pop", role: "dialog", "aria-label": "Path between Valjean and Javert", style: "width:340px" },
            h("div", { class: "k-popover-head" }, h("span", { class: "k-grow" }, "Valjean to Javert"), AB.iconButton("x", "Close", { onClick: back })),
            h("div", { class: "k-popover-body" },
                choiceList,
                h("div", { class: "sb-line" }, h("span", { class: "sb-name" }, "Direction"),
                    seg("Direction", [{ id: "follow", label: "Follow edges", off: true, title: NO_DIRECTION }, { id: "either", label: "Either way" }], "either")),
                h("div", { class: "sb-line" }, h("span", { class: "sb-name" }, "Weight"), weightBox),
                meaning,
                runsLine,
                h("div", { class: "sb-line" }, AB.needsElement("Reading a weight as strength (higher = closer) is not in graphty-element's path options; filed.")),
                h("div", { class: "sb-actions" }, runBtn, AB.button("Cancel", { kind: "ghost", onClick: back })),
                h("div", { class: "sb-help" }, "To pick the ends on the canvas instead, or to limit the scope, use ",
                    h("a", Object.assign({ role: "button" }, act({ go: C("find-paths").go })), C("find-paths").label), " (" + C("find-paths").shortcut + ")."),
            ),
        );
    }

    // Keep a popover over the canvas, above its verb, never over the inspector.
    function place(pop, barBox, b, label) {
        requestAnimationFrame(() => {
            const v = b.querySelector("[aria-label='" + label + "']");
            const cv = document.getElementById("ab-canvas");
            if (!v || !cv) return;
            const box = barBox.getBoundingClientRect(), c = cv.getBoundingClientRect();
            const want = box.left + v.offsetLeft;
            const x = Math.max(c.left + 8, Math.min(want, c.right - pop.offsetWidth - 8));
            pop.style.left = x - box.left + "px";
            pop.style.maxHeight = Math.max(160, box.top - c.top - 16) + "px";
            pop.style.overflow = "auto";
        });
    }

    registerSection({
        id: "selection-bar",
        title: "Selection bar",
        region: "toolbar",
        rail: "graph",
        closeTo: "graph-place",
        states: [
            { id: "one-node", label: "One node selected (Steps away)" },
            { id: "two-nodes", label: "Two nodes selected (Path between)" },
            { id: "path-between-open", label: "Path between: the three questions" },
            { id: "neighborhood", label: "Neighborhood popover open" },
            { id: "hidden", label: "After Hide on canvas" },
        ],
        frame: (state) => Object.assign({
            left: "graph-place/at-rest",
            right: state === "two-nodes" || state === "path-between-open" ? "inspector-several-elements/two-nodes" : "inspector-node/why-this-look",
        }, state === "path-between-open" || state === "neighborhood" ? { dock: false } : {}),
        render(el, state, ctx) {
            patchCanvas(state);
            const wrap = h("div", { class: "sb-wrap" });
            if (state === "hidden") {
                wrap.append(
                    AB.notice("Valjean hidden on canvas", { label: "Undo", go: ["selection-bar", "one-node"] }),
                    h("div", { class: "sb-oqs" }, oq("does a hidden node stay selected, keeping this bar")),
                );
            }
            const b = bar(state);
            const barBox = h("div", { style: "position:relative;max-width:100%" }, b);
            if (state === "neighborhood") { const p = neighborhoodPopover(); barBox.append(p); place(p, barBox, b, "Neighborhood"); }
            if (state === "path-between-open") { const p = pathPopover(); barBox.append(p); place(p, barBox, b, "Path between"); }
            wrap.append(barBox);
            el.append(wrap);
            ctx.renderSection("toolbar/at-rest", el);
        },
    });
})();
