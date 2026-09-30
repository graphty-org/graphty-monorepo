/* Selection bar and the Neighborhood popover. While something is selected and no tool is armed, a
   second row sits directly above the toolbar (never beside the selection, so it never covers it).
   It carries verbs only; the same verbs are in the selection's context menu and inspector.
   This section also patches the canvas region it sits on: it swaps the drawing to the one that
   shows this selection, and adds the "not drawn" line after Hide on canvas. Plain ASCII. */
(function () {
    "use strict";
    const act = AB.act;
    const CSS = [
        ".sb-wrap { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; }",
        ".sb-bar { gap: 2px; padding: 4px; height: 40px; max-width: 100%; }",
        ".sb-bar .k-btn { height: 32px; padding: 0 8px; gap: 6px; white-space: nowrap; }",
        ".sb-bar .k-btn[aria-current='true'] { background: var(--cm-bg-hover); }",
        ".sb-sep { width: 1px; align-self: stretch; margin: 4px 2px; background: var(--cm-border); }",
        "@container main (max-width: 760px) { .sb-bar .sb-label { display: none; } .sb-bar .k-btn { padding: 0 8px; } }",
        ".sb-pop { position: absolute; bottom: calc(100% + 8px); width: 280px; z-index: 6; }",
        ".sb-pop .k-popover-body { padding: 8px 16px 12px; display: flex; flex-direction: column; gap: 10px; }",
        ".sb-line { display: flex; align-items: center; gap: 8px; }",
        ".sb-line .k-grow { color: var(--cm-text-secondary); }",
        ".sb-help { color: var(--cm-text-secondary); }",
        ".sb-actions { display: flex; flex-wrap: wrap; gap: 8px; }",
        ".sb-oq { display: inline-block; max-width: 280px; white-space: normal; }",
        ".sb-oqs { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; max-width: 100%; }",
        ".sb-notdrawn-float { position: absolute; left: 12px; bottom: 12px; z-index: 4; padding: 6px 10px; border-radius: 8px; background: var(--cm-bg); box-shadow: var(--cm-elevation-200); }",
    ].join("\n");
    if (!document.getElementById("sb-css")) document.head.append(h("style", { id: "sb-css" }, CSS));

    const oq = (text) => h("span", { class: "k-annot-tag sb-oq", title: "Open question: " + text }, "Open question: " + text);

    // The canvas drawing that shows each state's selection (fixture drawings only).
    const DRAWING = {
        "one-node": ["lesmis-groups-valjean", "Les Miserables colored by PageRank, Valjean selected"],
        "two-nodes": ["lesmis-groups-valjean", "Les Miserables colored by PageRank, Valjean selected"],
        neighborhood: ["lesmis-neighbors", "Les Miserables, Valjean selected with his 36 neighbors"],
        hidden: ["lesmis-groups-rest", "Les Miserables colored by PageRank"],
    };

    function patchCanvas(state) {
        const cv = document.getElementById("ab-canvas");
        if (!cv) return;
        const d = DRAWING[state];
        // The canvas paints as the tree does (PageRank at rest); only the selection marks change
        const imgs = cv.querySelectorAll(".k-stage img");
        if (imgs.length && AB.lesmisDrawing) { AB.lesmisDrawing(d[0], d[1]).forEach((img, i) => { if (imgs[i]) imgs[i].replaceWith(img); }); }
        cv.querySelectorAll(".sb-notdrawn").forEach((n) => n.remove());
        if (state !== "hidden") return;
        const line = h("div", { class: "k-notdrawn sb-notdrawn" }, "1 node not drawn (Valjean). ",
            h("a", Object.assign({ href: "#" }, act({ go: ["canvas-and-states", "drawn"] })), "Show all"));
        const card = cv.querySelector(".k-legend-card");
        if (card) card.append(line);
        else cv.append(h("div", { class: "sb-notdrawn-float" }, line));
    }

    function verb(ic, label, key, target, current) {
        const b = AB.button(h("span", { class: "sb-label" }, label), Object.assign({ kind: "ghost", icon: ic }, target));
        b.title = key ? label + " (" + key + ")" : label;
        b.setAttribute("aria-label", label);
        if (key) b.setAttribute("aria-keyshortcuts", key.replace(/Ctrl/g, "Control"));
        if (current) b.setAttribute("aria-current", "true");
        return b;
    }

    function bar(state, count) {
        const hidden = state === "hidden";
        const setMsg = count === 1 ? "Set of 1 node (Valjean) added to the top of the tree" : "Set of 2 nodes (Valjean, Javert) added to the top of the tree";
        return h("div", { class: "k-secondary-bar sb-bar", role: "toolbar", "aria-label": "Selection" },
            verb("bookmark-plus", "Create set", "Ctrl+G", { onClick: () => { AB.flash(setMsg); AB.go("graph-place", "at-rest"); } }),
            h("span", { class: "sb-sep" }),
            verb("maximize-2", "Expand", "E", { onClick: () => AB.flash("Expand (not wired in the skeleton)") }),
            verb("waypoints", "Neighborhood", "G", { go: ["selection-bar", "neighborhood"] }, state === "neighborhood"),
            hidden
                ? verb("eye", "Show on canvas", "Ctrl+Shift+H", { go: ["selection-bar", "one-node"] })
                : verb("eye-off", "Hide on canvas", "Ctrl+Shift+H", { go: ["selection-bar", "hidden"] }),
            h("span", { class: "sb-sep" }),
            verb("sticky-note", "Add note", "N", { go: ["notes-place", "writing"] }),
            verb("flask-conical", "Analyze these...", null, { go: ["analyze-popover", "open"] }),
        );
    }

    // The Neighborhood popover: Valjean's one hop is already selected; k hops grows it in place.
    function neighborhoodPopover() {
        const L = AB.fx.datasets.lesmis;
        let k = 1;
        const said = h("div", { class: "sb-help" });
        const btns = [1, 2, 3].map((n) => h("span", Object.assign({ role: "radio", tabindex: "0" }, act({ onClick: () => setK(n) })), String(n)));
        const stepName = h("b");
        function setK(n) {
            k = n;
            btns.forEach((b, i) => b.setAttribute("aria-checked", String(i + 1 === k)));
            said.textContent = k === 1
                ? "Selected: Valjean and his " + L.valjeanNeighbors + " neighbors."
                : "Selected: everyone within " + k + " hops of Valjean.";
            stepName.textContent = "Neighbors of Valjean, within " + k + (k === 1 ? " hop" : " hops");
        }
        setK(1);
        const back = () => AB.go("selection-bar", "one-node");
        return h("div", { class: "k-popover sb-pop", role: "dialog", "aria-label": "Neighborhood of Valjean" },
            h("div", { class: "k-popover-head" }, h("span", { class: "k-grow" }, "Neighborhood of Valjean"), AB.iconButton("x", "Close", { onClick: back })),
            h("div", { class: "k-popover-body" },
                h("div", { class: "sb-line" }, h("span", { class: "k-grow" }, "Hops"), h("span", { class: "k-seg", role: "radiogroup", "aria-label": "Hops" }, btns)),
                said,
                h("div", { class: "sb-actions" },
                    AB.button("Filter to neighbors", { icon: "funnel", onClick: () => { AB.flash("Filter step added: " + stepName.textContent + ". Ctrl+Z removes it."); AB.go("data-place", "filters"); } }),
                    AB.button("Done", { kind: "ghost", onClick: back })),
                h("div", { class: "sb-help" }, "Filter to neighbors adds one step, ", stepName, ", to ", link("data-place", "filters", "Filters"), ". Everything outside it leaves the canvas and the measures until you undo or turn the step off."),
            ),
        );
    }

    registerSection({
        id: "selection-bar",
        title: "Selection bar",
        region: "toolbar",
        rail: "graph",
        closeTo: "graph-place",
        states: [
            { id: "one-node", label: "One node selected" },
            { id: "two-nodes", label: "Two nodes selected" },
            { id: "neighborhood", label: "Neighborhood popover open" },
            { id: "hidden", label: "After Hide on canvas" },
        ],
        frame: (state) => ({
            left: "graph-place/at-rest",
            right: state === "two-nodes" ? "inspector-several-elements/two-nodes" : "inspector-node/why-this-look",
        }),
        render(el, state, ctx) {
            patchCanvas(state);
            const wrap = h("div", { class: "sb-wrap" });
            if (state === "one-node") wrap.append(h("div", { class: "sb-oqs" }, oq("what Expand does on a graph that is already fully loaded")));
            if (state === "hidden") {
                wrap.append(
                    AB.notice("Valjean hidden on canvas", { label: "Undo", go: ["selection-bar", "one-node"] }),
                    h("div", { class: "sb-oqs" }, oq("does a hidden node stay selected, keeping this bar")),
                );
            }
            const b = bar(state, state === "two-nodes" ? 2 : 1);
            const barBox = h("div", { style: "position:relative;max-width:100%" }, b);
            if (state === "neighborhood") {
                const pop = neighborhoodPopover();
                barBox.append(pop);
                requestAnimationFrame(() => {
                    const nb = b.querySelector("[aria-label='Neighborhood']");
                    const cv = document.getElementById("ab-canvas");
                    if (!nb || !cv) return;
                    // keep the popover inside the canvas, never over the inspector
                    const box = barBox.getBoundingClientRect(), c = cv.getBoundingClientRect();
                    const want = box.left + nb.offsetLeft;
                    const x = Math.max(c.left + 8, Math.min(want, c.right - pop.offsetWidth - 8));
                    pop.style.left = x - box.left + "px";
                });
            }
            wrap.append(barBox);
            el.append(wrap);
            ctx.renderSection("toolbar/at-rest", el);
        },
    });
})();
