/* Graphs switcher, version 3: the dark menu under the Graph and Data places' title line. One line
   per graph (name and node count; how it was made is its tooltip): a click switches at once, a
   double-click (or F2) renames in place. Then Compare graphs... and New graph from... (one item;
   derived graphs need graphty-element's transform API, so it is drawn disabled with the mark and
   hidden in the user-test build). Loading a file as a new graph is the load dialog's "Load into:
   New graph". Plain ASCII. */
(function () {
    "use strict";
    const CSS = `
.gs-menu { width: 320px; }
.gs-graph .gs-name { flex: 1; min-width: 0; }
.gs-graph .k-value { margin-inline-start: auto; color: var(--k-menu-ink2); font-variant-numeric: tabular-nums; }
.gs-graph .ab-rename { width: 100%; }
`;
    if (!document.getElementById("gs-style")) document.head.append(h("style", { id: "gs-style" }, CSS));

    // Numbers from kit/fixtures.json: the Les Miserables graph, and its quotient by the 10 groups of
    // the "group" attribute (7 legend rows plus "Other", which is groups 6, 7 and 10).
    function graphs(fx, two) {
        const L = fx.datasets.lesmis;
        const groups = L.frame.legend.rows.length + L.frame.legend.other.title.split(/,| and /).length;
        const base = { name: L.frame.graphRow, nodes: L.nodes, how: L.nodes + " nodes, " + L.edges + " edges, from " + L.file, current: true };
        return two ? [base, { name: L.frame.graphRow + " by group", nodes: groups, how: "Made from " + L.frame.graphRow + " by Quotient by groups" }] : [base];
    }
    let list = null, lastState = null, timer = 0;
    const NO_TRANSFORM = "graphty-element has no transform API: extract, bipartite projection, quotient, combine and null-model sample would each make a new graph here";

    function graphItem(g, redraw) {
        const name = h("span", { class: "gs-name k-ellipsis" }, g.name);
        const item = h("div", Object.assign({ class: "k-menu-item gs-graph", role: "menuitemradio", "aria-checked": String(!!g.current), "aria-keyshortcuts": "F2" },
            AB.act({ onClick: (e) => {
                // a click switches; wait out a double-click's first click so a rename does not also switch
                clearTimeout(timer);
                if (e && e.detail > 1) return;
                timer = setTimeout(() => (g.current ? AB.close() : AB.flash("Switched to " + g.name + " (not wired in the skeleton)")), e && e.detail === 1 ? 250 : 0);
            } })),
            h("span", { class: "k-check-col" }, g.current ? icon("check", "sm") : null), name, h("span", { class: "k-value" }, g.nodes + " nodes"));
        AB.tip(item, g.how, { label: false });
        const rename = () => clearTimeout(timer) || AB.renameInPlace(name, { focusAfter: item, onSave: (n) => { g.name = n; redraw(); } });
        item.addEventListener("dblclick", (e) => { e.stopPropagation(); rename(); });
        item.addEventListener("keydown", (e) => { if (e.key === "F2") { e.preventDefault(); e.stopPropagation(); rename(); } });
        item.tabIndex = -1;
        return item;
    }

    registerSection({
        id: "graphs-switcher",
        title: "Graphs switcher",
        region: "overlay",
        rail: "graph",
        closeTo: "graph-place/at-rest",
        states: [
            { id: "open", label: "One graph" },
            { id: "two-graphs", label: "Two graphs" },
            { id: "new-graph-from", label: "New graph from (needs graphty-element)" },
            { id: "rename", label: "Renaming a graph" },
        ],
        render(el, state) {
            if (state !== lastState || !list) { list = graphs(AB.fx, state === "two-graphs" || state === "rename"); lastState = state; }
            // The menu's own items come from the shared menu; the graph lines are added on top
            const m = AB.menu({
                anchor: ".ab-graph-head .ab-switch-btn", place: "below-start", label: "Graphs in this project",
                items: [
                    { sep: true },
                    { label: "Compare graphs...", go: ["full-canvas-modes", "comparison"] },
                    { label: "New graph from...", needs: NO_TRANSFORM },
                ],
                back: ["graph-place", "at-rest"],
            });
            m.classList.add("gs-menu");
            const draw = () => { m.querySelectorAll(".gs-graph").forEach((x) => x.remove()); m.prepend(...list.map((g) => graphItem(g, draw))); };
            draw();
            el.append(m);
            if (state === "rename") requestAnimationFrame(() => requestAnimationFrame(() => { const it = m.querySelector(".gs-graph"); if (it) it.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })); }));
            if (state === "new-graph-from") requestAnimationFrame(() => requestAnimationFrame(() => { const it = m.querySelector("[data-needs]"); if (it) it.focus(); }));
        },
    });
})();
