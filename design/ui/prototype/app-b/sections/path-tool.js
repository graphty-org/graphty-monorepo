/* Path tool armed: a one-shot pointer mode on the transfers graph (March 2026).
   Click From, then To; the bar above the toolbar holds From, To, Direction, Weight with its
   meaning, Scope and Run. The found path lands as a child of one path run row and paints, and
   the tool returns to Select. Esc disarms.
   Besides "path-tool" (the toolbar region) this file registers four helper sections that are
   not in the manifest, so they stay off the site map: path-tool-canvas (the drawing with the
   pick marks), path-tool-tree (the transfers graph's tree), path-tool-graph (its inspector with
   nothing selected) and path-tool-flyout (the Path caret's menu). They exist only so the path states can draw the canvas, tree and inspector too.
   Plain ASCII. */
(function () {
    if (!document.getElementById("pt-style")) {
        const l = h("link", { id: "pt-style", rel: "stylesheet", href: "sections/path-tool.css" });
        document.head.append(l);
    }
    const T = () => AB.fx.datasets.transactions;
    const P = () => T().setsAndPaths.path;
    const fmt = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const oq = (text) => h("span", { class: "pt-oq", title: text }, "Open question");
    const RESULT = "Shortest paths, weighted by amount";

    // What each state has chosen so far
    const STEP = {
        armed: { active: "from" },
        flyout: { active: "from" },
        "picking-from": { active: "from", hover: "from" },
        "from-picked": { from: true, active: "to" },
        "picking-to": { from: true, active: "to", hover: "to" },
        ready: { from: true, to: true, meaning: true },
        found: { done: true },
    };

    // ---------- the bar ----------
    function endpoint(label, which, s) {
        const p = P()[which];
        const picked = s[which];
        const active = s.active === which;
        const val = picked
            ? h("span", { class: "pt-ep-val" }, AB.chit(which === "from" ? "var(--cm-text)" : "var(--cm-text-brand)", true), h("span", { class: "k-num" }, p.id))
            : h("span", { class: "pt-ep-hint" }, icon("crosshair", "sm"), active ? "Click a node or a set" : "After From");
        const back = which === "from" ? ["path-tool", "armed"] : ["path-tool", "from-picked"];
        return h("span", { class: "pt-group" },
            h("span", { class: "pt-lbl" }, label),
            h("span", Object.assign({ class: "k-field pt-ep", role: "button", "data-active": active ? "" : null, "aria-label": label + ": " + (picked ? p.id : "not picked") }, AB.act({ go: back })),
                val,
                picked ? h("span", Object.assign({ class: "pt-clear", role: "button", "aria-label": "Clear " + label }, AB.act({ go: back })), icon("x", "sm")) : null));
    }
    function seg(items, pressed) {
        return h("span", { class: "k-seg", role: "radiogroup" }, items.map((t) => h("span", Object.assign({ role: "radio", "aria-checked": String(t === pressed) }, AB.act({ onClick: (e) => {
            const g = e.currentTarget.parentNode;
            g.querySelectorAll("[role=radio]").forEach((x) => x.setAttribute("aria-checked", String(x === e.currentTarget)));
        } })), t)));
    }
    function bar(state) {
        const s = STEP[state];
        const ready = !!(s.from && s.to && s.meaning);
        const invert = h("span", Object.assign({ class: "k-check", role: "checkbox", "aria-checked": "false", "aria-label": "Invert the weight" }, AB.act({ onClick: (e) => {
            const c = e.currentTarget; c.setAttribute("aria-checked", String(c.getAttribute("aria-checked") !== "true"));
        } })));
        return h("div", { class: "k-secondary-bar pt-bar", role: "toolbar", "aria-label": "Path tool" },
            h("span", Object.assign({ class: "pt-entry", role: "button", "aria-haspopup": "menu", title: "Path query (the Path flyout)" }, AB.act({ go: ["path-tool", "flyout"] })), icon("route", "sm"), "Shortest path", icon("chevron-down", "sm")),
            h("span", { class: "pt-sep" }),
            endpoint("From", "from", s),
            endpoint("To", "to", s),
            h("span", { class: "pt-sep" }),
            h("span", { class: "pt-group" }, h("span", { class: "pt-lbl" }, "Direction"), seg(["Follow", "Either way"], "Follow")),
            h("span", { class: "pt-group" },
                h("span", { class: "pt-lbl" }, "Weight"),
                AB.field("amount", { caret: true, onClick: () => AB.flash("Weight: None, amount (not wired in the skeleton)") }),
                h("span", { class: "k-seg", role: "radiogroup", "aria-label": "What a higher amount means" },
                    ["higher = farther", "higher = stronger"].map((t, i) => h("span", Object.assign({ role: "radio", "aria-checked": String(!!s.meaning && i === 0) }, AB.act({ onClick: (e) => {
                        const g = e.currentTarget.parentNode;
                        g.querySelectorAll("[role=radio]").forEach((x) => x.setAttribute("aria-checked", String(x === e.currentTarget)));
                    } })), t))),
                h("label", { class: "pt-inv" }, invert, "Invert"),
                s.meaning ? null : oq("A higher amount has no default meaning: each run asks. Does Run wait until one is chosen, or does the entry carry a default?")),
            h("span", { class: "pt-group" }, h("span", { class: "pt-lbl" }, "Scope"), AB.field("Full graph, " + T().nodes.toLocaleString("en-US") + " nodes", { caret: true, go: ["data-place", "filters"] })),
            h("span", { class: "pt-sep" }),
            AB.button("Run", { icon: "play", disabled: !ready, go: ready ? ["path-tool", "found"] : null, onClick: ready ? null : () => AB.flash("Pick From and To first") }),
            AB.iconButton("x", "Cancel (Esc)", { go: ["toolbar", "at-rest"] }),
        );
    }

    // The toolbar under the bar, with Path pressed (or Select, once the result has landed)
    function toolbarUnder(el, ctx, pathOn) {
        const wrap = h("div");
        ctx.renderSection("toolbar/at-rest", wrap);
        const tb = wrap.querySelector(".k-toolbar") || wrap;
        const sel = tb.querySelector("[data-tool=Select]"), path = tb.querySelector("[data-tool=Path]");
        if (sel) sel.setAttribute("aria-pressed", String(!pathOn));
        if (path) {
            path.setAttribute("aria-pressed", String(pathOn));
            if (!path.nextElementSibling || !path.nextElementSibling.classList.contains("k-tool-caret"))
                path.after(h("span", Object.assign({ class: "k-tool-caret", role: "button", "aria-label": "Path queries", "aria-haspopup": "menu" }, AB.act({ go: ["path-tool", "flyout"] })), icon("chevron-down", "sm")));
        }
        // only the toolbar itself: the selection bar's slot is taken by this bar (or the notice)
        el.append(wrap.querySelector(".k-toolbar") || wrap);
    }

    registerSection({
        id: "path-tool",
        title: "Path tool armed",
        region: "toolbar",
        rail: "graph",
        closeTo: "toolbar/at-rest",
        states: [
            { id: "armed", label: "Armed" },
            { id: "flyout", label: "Flyout" },
            { id: "picking-from", label: "Picking From" },
            { id: "from-picked", label: "From picked" },
            { id: "picking-to", label: "Picking To" },
            { id: "ready", label: "Ready to run" },
            { id: "found", label: "Result landed in the tree" },
        ],
        frame: (state) => ({
            dataset: "transactions",
            left: "path-tool-tree/" + state,
            canvas: "path-tool-canvas/" + state,
            right: state === "found" ? "inspector-group-set-path-row/path" : "path-tool-graph/nothing-selected",
            dock: false,
            overlay: state === "flyout" ? "path-tool-flyout/open" : null,
        }),
        render(el, state, ctx) {
            if (state === "found") {
                const r = P().asDistance;
                el.append(AB.notice("Path added: " + P().from.id + " to " + P().to.id + ", " + r.hops + " hops, amount " + fmt(r.dollars), { label: "Undo", go: ["path-tool", "ready"] }));
                toolbarUnder(el, ctx, false);
                return;
            }
            el.append(bar(state));
            toolbarUnder(el, ctx, true);
        },
    });

    // ---------- the Path flyout ----------
    registerSection({
        id: "path-tool-flyout",
        title: "Path tool: queries",
        region: "overlay",
        closeTo: "path-tool/armed",
        states: ["open"],
        render(el) {
            el.append(AB.menu({
                anchor: ".pt-entry",
                place: "above-start",
                items: [
                    { heading: "Between two nodes" },
                    { label: "Shortest path", check: true, shortcut: "P", go: ["path-tool", "armed"], desc: "The fewest hops, or the least total weight" },
                    { label: "All shortest paths", go: ["path-tool", "armed"], desc: "Every route that ties for shortest" },
                    { label: "K shortest paths", go: ["path-tool", "armed"], desc: "The shortest few, in order" },
                    { label: "Flow between two nodes", go: ["path-tool", "armed"], desc: "How much can move from one to the other" },
                    { sep: true },
                    { label: "More in Analyze...", go: ["analyze-popover", "open"] },
                ],
            }));
        },
    });

    // ---------- the canvas: pick marks over the transfers drawing ----------
    function mark(a, text, kind) {
        return h("span", { class: "pt-mark", "data-kind": kind, style: `left:${a.x}%;top:${a.y}%` }, h("span", { class: "pt-mark-tag" }, text));
    }
    function tip(a, acc, verb) {
        return h("div", { class: "k-tooltip pt-tip", "data-flip": a.x > 50 ? "" : null, style: `left:${a.x}%;top:${a.y}%` },
            h("b", null, acc.id), h("br"),
            h("span", { class: "k-secondary" }, acc.kind + ", " + acc.country + ", degree " + acc.degree + (acc.flagged ? ", flagged" : "")), h("br"),
            verb);
    }
    const HINT = {
        armed: ["Click the node or set to start from.", "Esc cancels"],
        flyout: ["Click the node or set to start from.", "Esc cancels"],
        "picking-from": ["Click the node or set to start from.", "Esc cancels"],
        "from-picked": ["Now click where the path should end.", "Esc cancels"],
        "picking-to": ["Now click where the path should end.", "Esc cancels"],
        ready: ["Press Run, or Enter.", "Esc cancels"],
    };
    registerSection({
        id: "path-tool-canvas",
        title: "Path tool: canvas",
        region: "canvas",
        states: Object.keys(STEP),
        render(el, state) {
            const t = T(), sp = t.setsAndPaths, s = STEP[state];
            const zoom = h("span", Object.assign({ id: "ab-zoom", class: "k-btn k-btn-ghost ab-zoom", role: "button" }, AB.act({ go: ["zoom-and-view-menu", "2d"] })), state === "found" ? "300%" : "100%", icon("chevron-down", "sm"));
            if (state === "found") {
                const r = P().asDistance;
                const stage = h("div", { class: "k-stage" }, AB.drawing("transactions-path-cheapest", "The found path " + r.route.join(" to ") + ", zoomed to 300%"));
                const legend = h("div", { class: "k-legend-card ab-legend pt-legend" },
                    AB.nav(h("div", { class: "k-lg-title" }, RESULT), "inspector-group-set-path-row", "path"),
                    AB.nav(h("div", { class: "k-lg-row" }, h("span", { class: "pt-route-swatch" }), P().from.id + " to " + P().to.id, h("span", { class: "k-value" }, r.hops + " hops")), "inspector-group-set-path-row", "path"),
                    h("div", { class: "k-lg-sub k-num" }, "Total amount " + fmt(r.dollars)));
                el.append(stage, legend, zoom);
                return;
            }
            const stage = h("div", { class: "k-stage pt-picking" }, AB.drawing("transactions-density", t.frame.altSized));
            const a = sp.anchors;
            const hot = (anchor, next, label) => AB.nav(h("span", { class: "ab-hot", style: `left:${anchor.x}%;top:${anchor.y}%`, "aria-label": label }), "path-tool", next);
            if (s.active === "from") stage.append(hot(a.from, "from-picked", "Set From: " + P().from.id));
            if (s.active === "to") stage.append(hot(a.to, "ready", "Set To: " + P().to.id));
            if (s.from) stage.append(mark(a.from, "From", "from"));
            if (s.to) stage.append(mark(a.to, "To", "to"));
            if (s.hover === "from") stage.append(tip(a.from, P().from, "Click to start here"));
            if (s.hover === "to") stage.append(tip(a.to, P().to, "Click to end here"));
            const [line, esc] = HINT[state];
            el.append(stage, h("div", { class: "pt-hint", role: "status" }, icon("route", "sm"), line, h("span", { class: "k-kbd" }, "Esc"), h("span", { class: "k-secondary" }, esc.replace("Esc ", ""))), zoom);
        },
    });

    // ---------- the tree (left) and the graph inspector (right) for the transfers graph ----------
    function runRow(open) {
        const p = P();
        return {
            name: RESULT, kindIcon: "route", swatch: h("span", { class: "pt-route-swatch" }), count: "1 path", eye: true, open,
            go: ["inspector-group-set-path-row", "path"], menu: ["context-menus", "run-row"],
            children: [{ name: p.from.id + " to " + p.to.id, kindIcon: "route", swatch: h("span", { class: "pt-route-swatch" }), count: p.asDistance.hops + " hops", eye: true, selected: true, go: ["inspector-group-set-path-row", "path"], menu: ["context-menus", "row"] }],
        };
    }
    registerSection({
        id: "path-tool-tree",
        title: "Path tool: tree",
        region: "left",
        rail: "graph",
        states: Object.keys(STEP),
        render(el, state) {
            const t = T();
            const found = state === "found";
            const rows = [
                { name: "Selection", kindIcon: "scan", pinned: true, count: "Nothing selected", eye: true, go: ["inspector-selection-and-everything", "selection"] },
                found ? runRow(true) : null,
                { name: "Everything", kindIcon: "square", pinned: true, eye: true, go: ["inspector-selection-and-everything", "everything"] },
            ].filter(Boolean);
            el.append(
                AB.placeHead("Graph"),
                h("div", { class: "ab-switcher" }, h("span", Object.assign({ class: "ab-switch-btn", role: "button" }, AB.act({ go: ["graphs-switcher", "open"] })), icon("network"), h("span", { class: "k-ellipsis" }, t.graphName), icon("chevron-down", "sm")), h("span", { class: "k-grow" }), h("span", { class: "k-secondary k-num" }, t.nodes.toLocaleString("en-US") + " nodes")),
                h("div", { class: "ab-treebar" }, AB.field("Find rows", { icon: "search", go: ["commands-and-search", "find"] }), AB.iconButton("list-filter", "List options", { go: ["graph-place", "list-menu"] }), AB.iconButton("flask-conical", "Analyze", { go: ["analyze-popover", "open"] })),
                h("div", { class: "k-scroll" }, AB.tree(rows),
                    found ? h("div", { class: "ab-pad k-secondary pt-treenote" }, "The next path asked with the same settings joins this row as another child. ", oq("Do settings that differ start a second path run row, or a child with its own settings?")) : null),
            );
        },
    });
    registerSection({
        id: "path-tool-graph",
        title: "Path tool: graph inspector",
        region: "right",
        states: ["nothing-selected"],
        render(el) {
            // the graph inspector with nothing selected: picking an end is not a selection
            const t = T();
            el.append(AB.inspector({
                icon: "network", title: t.graphName, kind: "Graph", meta: t.frame.project + ", " + t.file,
                body: [
                    AB.section("Overview",
                        AB.data("Nodes", t.nodes.toLocaleString("en-US")), AB.data("Edges", t.edges.toLocaleString("en-US") + " (directed)"),
                        AB.data("Density", String(t.stats.density)), AB.data(t.frame.componentsName, t.frame.components),
                        AB.data("Average degree", String(t.stats.averageDegree)),
                        AB.data("Edge weight", "amount", { go: ["inspector-attribute-and-filter-step", "attribute"] }),
                        h("div", { class: "ab-cap k-secondary" }, "amount: " + t.frame.edgesLine.replace(/^directed; amount: /, "") + ".")),
                    AB.section({ title: "Notes", count: 0, actions: AB.iconButton("plus", "Add note", { go: ["notes-place", "all"] }) }, h("div", { class: "ab-pad k-secondary" }, "No notes about this graph yet.")),
                ],
            }));
        },
    });
})();
