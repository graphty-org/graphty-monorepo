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
.gs-many { max-height: 460px; }
.gs-many .gs-cmds { position: static !important; inset: auto !important; transform: none !important; width: auto; padding: 0; box-shadow: none; background: transparent; border: 0; flex: none; }
`;
    if (!document.getElementById("gs-style")) document.head.append(h("style", { id: "gs-style" }, CSS));

    // Numbers from kit/fixtures.json: the Les Miserables graph, and its quotient by the 10 groups of
    // the "group" attribute (7 legend rows plus "Other", which is groups 6, 7 and 10).
    // Another project lists its own one graph: its name, node count and source file
    function ownGraph(fx, ds) {
        const D = fx.datasets[ds], N = fx.datasets.nested;
        const nodes = ds === "doorEntries" ? D.loadedTypes().total : ds === "nested" ? N.recordArrays["data.researchers[]"] + N.recordArrays["data.institutions[]"] : D.nodes;
        const file = ds === "doorEntries" ? "people.csv, buildings.csv and entries.csv" : D.file;
        return [{ name: (D.frame && D.frame.graphRow) || D.graphName, nodes, how: nodes.toLocaleString("en-US") + " nodes, from " + file, current: true }];
    }
    function graphs(fx, two) {
        const ds = (AB.route && AB.route.frame.dataset) || "lesmis";
        if (ds !== "lesmis" && fx.datasets[ds]) return ownGraph(fx, ds);
        const L = fx.datasets.lesmis;
        const groups = L.frame.legend.rows.length + L.frame.legend.other.title.split(/,| and /).length;
        // the file the reader loaded, as the inspector, Data place and Data page name it (the fixture's
        // own `file` is the corpus the numbers were computed on)
        const base = { name: L.frame.graphRow, nodes: L.nodes, how: L.nodes + " nodes, " + L.edges + " edges, from miserables.gexf", current: true };
        return two ? [base, { name: L.frame.graphRow + " by group", nodes: groups, how: "Made from " + L.frame.graphRow + " by Quotient by groups" }] : [base];
    }
    // The transfers project with one graph per month (graphs-switcher/many): March 2026 is the
    // fixture's graph; the other months name their files and carry no counts the fixtures lack.
    const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    function months(fx) {
        const T = fx.datasets.transactions, out = [];
        for (let i = 0; i < 24; i++) {
            const t = 2026 * 12 + 2 - i, m = t % 12, y = Math.floor(t / 12); // March 2026 back to April 2024
            const file = "transfers-" + y + "-" + String(m + 1).padStart(2, "0") + ".csv";
            const name = T.graphName + ", " + MONTHS[m] + " " + y;
            out.push(i === 0 ? { name, current: true, how: T.nodes.toLocaleString("en-US") + " nodes, " + T.edges.toLocaleString("en-US") + " edges, from " + T.file } : { name, how: "From " + file });
        }
        return out;
    }
    // graphs-switcher/long-name: a 60-character name, end ellipsis in the switcher and the header
    const LONG = "Transfers over 10,000 between flagged accounts in March 2026";
    function longGraphs(fx) {
        const T = fx.datasets.transactions;
        return [{ name: LONG, current: true, nodes: T.nodes, how: T.nodes.toLocaleString("en-US") + " nodes, " + T.edges.toLocaleString("en-US") + " edges, from " + T.file },
            { name: T.graphName + ", February 2026", how: "From transfers-2026-02.csv" }];
    }
    // The header (the place's title line) names the graph the switcher has checked
    function nameHeader(name) {
        requestAnimationFrame(() => {
            const b = document.querySelector(".ab-graph-head .ab-switch-btn");
            if (!b) return;
            b.querySelector(".k-ellipsis").textContent = name;
            b.setAttribute("aria-label", name + ", graphs in this project");
        });
    }
    const TRANSFERS_FRAME = { own: true, dataset: "transactions", left: "graph-place/transfers-loaded" };
    const switchTo = (g) => (g.current ? AB.close() : AB.flash("Switched to " + g.name + " (not wired in the skeleton)"));

    let list = null, lastState = null, timer = 0;
    const NO_TRANSFORM = "graphty-element has no transform API: extract, bipartite projection, quotient, combine and null-model sample would each make a new graph here";

    function graphItem(g, redraw) {
        const name = h("span", { class: "gs-name k-ellipsis" }, g.name);
        const item = h("div", Object.assign({ class: "k-menu-item gs-graph", role: "menuitemcheckbox", "aria-checked": String(!!g.current), "aria-keyshortcuts": "F2" },
            AB.act({ onClick: (e) => {
                // a click switches; wait out a double-click's first click so a rename does not also switch
                clearTimeout(timer);
                if (e && e.detail > 1) return;
                timer = setTimeout(() => switchTo(g), e && e.detail === 1 ? 250 : 0);
            } })),
            h("span", { class: "k-check-col" }, g.current ? icon("check", "sm") : null), name, g.nodes != null ? h("span", { class: "k-value" }, g.nodes.toLocaleString("en-US") + " nodes") : null);
        // a name past what the menu shows (end ellipsis) leads its tooltip
        AB.tip(item, g.name.length > 32 ? g.name + ". " + g.how : g.how, { label: false });
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
            { id: "many", label: "Many graphs: one per month, with Find" },
            { id: "long-name", label: "A 60-character graph name" },
        ],
        frame: (state) => (state === "many" || state === "long-name" ? TRANSFERS_FRAME : {}),
        render(el, state) {
            const cmds = [{ label: "Compare graphs...", go: ["full-canvas-modes", "comparison"] }, { label: "New graph from...", needs: NO_TRANSFORM }];
            if (state === "many") {
                // Past 15 graphs: the field list at menu size, its word-start find over the graph names
                const gs = months(AB.fx);
                const box = AB.fieldList({ label: "Graphs in this project", items: gs.map((g) => ({ label: g.name, check: !!g.current, desc: g.how, onClick: () => switchTo(g) })) });
                const tail = AB.menu({ label: "Graph commands", items: cmds, back: ["graph-place", "transfers-loaded"] });
                tail.classList.add("gs-cmds");
                box.classList.add("gs-many");
                box.append(h("div", { class: "k-menu-sep", role: "separator" }), tail);
                // Tab from the find reaches the two commands (the field list's own Tab closes it)
                box.addEventListener("keydown", (e) => {
                    if (e.key === "Tab" && !tail.contains(e.target)) { e.preventDefault(); e.stopPropagation(); tail.querySelector(".k-menu-item").focus(); }
                    else if (e.key === "Tab") { e.preventDefault(); e.stopPropagation(); box.querySelector("input").focus(); }
                }, true);
                el.append(AB.position(box, ".ab-graph-head .ab-switch-btn", "below-start"));
                nameHeader(gs[0].name);
                requestAnimationFrame(() => requestAnimationFrame(() => { const f = box.querySelector("input"); if (f) f.focus(); }));
                return;
            }
            if (state !== lastState || !list || (AB.route && AB.route.frame.dataset) !== list.ds) { list = state === "long-name" ? longGraphs(AB.fx) : graphs(AB.fx, state === "two-graphs" || state === "rename"); list.ds = AB.route && AB.route.frame.dataset; lastState = state; }
            if (state === "long-name") nameHeader(LONG);
            // The menu's own items come from the shared menu; the graph lines are added on top
            const m = AB.menu({
                anchor: ".ab-graph-head .ab-switch-btn", place: "below-start", label: "Graphs in this project",
                items: [{ sep: true }].concat(cmds),
                back: state === "long-name" ? ["graph-place", "transfers-loaded"] : ["graph-place", "at-rest"],
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
