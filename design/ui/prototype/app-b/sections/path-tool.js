/* Path pick mode: a one-shot pointer mode on the transfers graph (March 2026). No toolbar button:
   P or Analyze > Find paths arms it. A bar above the toolbar, in the selection bar's place, holds
   From, To, Direction, Weight (the element reads it as distance), Scope, Run and the Esc
   hint. Click From, then To; Run lands the path as a child of one path run row, it paints, and
   the pointer returns to Select. Esc disarms.
   Besides "path-tool" (the toolbar region) this file registers two helper sections that are not
   in the manifest, so they stay off the site map: path-tool-canvas (the drawing with the pick
   marks) and path-tool-tree (the transfers graph's tree). inspector-group-set-path-row draws
   them too. path-tool-graph is kept only as an alias of inspector-nothing-selected/transfers
   because recipe-apply still names it.
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
        const ready = !!(s.from && s.to);
        return h("div", { class: "k-secondary-bar pt-bar", role: "toolbar", "aria-label": "Path pick mode" },
            h("span", { class: "pt-entry" }, icon("route", "sm"), "Shortest path"),
            h("span", { class: "pt-sep" }),
            endpoint("From", "from", s),
            endpoint("To", "to", s),
            h("span", { class: "pt-sep" }),
            h("span", { class: "pt-group" }, h("span", { class: "pt-lbl" }, "Direction"), seg(["Follow", "Either way"], "Follow")),
            h("span", { class: "pt-group" },
                h("span", { class: "pt-lbl" }, "Weight"),
                AB.field("amount", { caret: true, onClick: () => AB.flash("Weight: None, amount (not wired in the skeleton)") }),
                // The same options as the selection bar's Path between: graphty-element's option schema,
                // which reads a weight only as distance. "Stronger" and Invert would be the app transforming weights.
                h("span", { class: "k-secondary" }, "higher = farther"),
                AB.needsElement("Reading a weight as strength (higher = closer) is not in graphty-element's path options; filed.")),
            h("span", { class: "pt-group" }, h("span", { class: "pt-lbl" }, "Scope"), AB.field("Full graph, " + T().nodes.toLocaleString("en-US") + " nodes", { caret: true, go: ["data-place", "filters"] })),
            h("span", { class: "pt-sep" }),
            AB.button("Run", { icon: "play", disabled: !ready, go: ready ? ["path-tool", "found"] : null, onClick: ready ? null : () => AB.flash("Pick From and To first") }),
            h("span", Object.assign({ class: "pt-esc", role: "button", title: "Leave the path pick mode" }, AB.act({ go: ["toolbar", "at-rest"] })), h("span", { class: "k-kbd" }, "Esc"), h("span", { class: "k-secondary" }, "cancels")),
        );
    }

    // The toolbar under the bar. The pick mode has no button of its own: while it is armed no pointer
    // tool is pressed; once the result lands, Select is again.
    function toolbarUnder(el, ctx, armed) {
        const wrap = h("div");
        ctx.renderSection("toolbar/at-rest", wrap);
        const tb = wrap.querySelector(".k-toolbar") || wrap;
        const sel = tb.querySelector("[data-tool=Select]");
        if (sel) sel.setAttribute("aria-pressed", String(!armed));
        const old = tb.querySelector("[data-tool=Path]"); // version 1 toolbar button, gone in version 2
        if (old) { if (old.nextElementSibling && old.nextElementSibling.classList.contains("k-tool-caret")) old.nextElementSibling.remove(); old.remove(); }
        el.append(tb); // only the toolbar itself: this bar (or the notice) takes the selection bar's slot
    }

    registerSection({
        id: "path-tool",
        title: "Path pick mode",
        region: "toolbar",
        rail: "graph",
        closeTo: "toolbar/at-rest",
        states: [
            { id: "armed", label: "Armed" },
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
            right: state === "found" ? "inspector-group-set-path-row/path" : "inspector-nothing-selected/transfers",
            dock: false,
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
    registerSection({
        id: "path-tool-canvas",
        title: "Path between: the pick mode",
        region: "canvas",
        states: Object.keys(STEP),
        render(el, state) {
            const t = T(), sp = t.setsAndPaths, s = STEP[state];
            const zoom = AB.cameraFace({ moved: state === "found" });
            if (state === "found") {
                const r = P().asDistance;
                const stage = h("div", { class: "k-stage" }, AB.drawing("transactions-path-cheapest", "The found path " + r.route.join(" to ") + ", framed"));
                const legend = h("div", { class: "k-legend-card ab-legend pt-legend" },
                    AB.nav(h("div", { class: "k-lg-title" }, RESULT), "inspector-group-set-path-row", "path"),
                    AB.nav(h("div", { class: "k-lg-row" }, h("span", { class: "pt-route-swatch" }), P().from.id + " to " + P().to.id, h("span", { class: "k-value" }, r.hops + " hops")), "inspector-group-set-path-row", "path"),
                    h("div", { class: "k-lg-sub k-num" }, "Total amount " + fmt(r.dollars)));
                el.append(stage, legend, h("div", { class: "ab-canvas-corner" }, zoom));
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
            el.append(stage, h("div", { class: "ab-canvas-corner" }, zoom));
        },
    });

    // ---------- the tree (left) for the transfers graph ----------
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
        title: "Path between: the found path in the tree",
        region: "left",
        rail: "graph",
        states: Object.keys(STEP),
        render(el, state) {
            const t = T();
            const found = state === "found";
            const rows = [
                { name: "Selection", kindIcon: "scan", pinned: true, builtin: true, count: "Nothing selected", eye: true, go: ["inspector-selection-and-everything", "selection"] },
                { name: "Notes", kindIcon: "message-square", pinned: true, builtin: true, count: "No notes", eye: true, go: ["inspector-selection-and-everything", "notes-row"], menu: ["context-menus", "notes-row"] },
                found ? runRow(true) : null,
                { name: "Everything", kindIcon: "square-filled", pinned: true, builtin: true, eye: true, go: ["inspector-selection-and-everything", "everything"] },
            ].filter(Boolean);
            el.append(
                AB.placeHead("Graph"),
                h("div", { class: "ab-switcher" }, h("span", Object.assign({ class: "ab-switch-btn", role: "button" }, AB.act({ go: ["graphs-switcher", "open"] })), icon("network"), h("span", { class: "k-ellipsis" }, t.graphName), icon("chevron-down", "sm")), h("span", { class: "k-grow" }), h("span", { class: "k-secondary k-num" }, t.nodes.toLocaleString("en-US") + " nodes")),
                h("div", { class: "ab-treebar" }, AB.field("Find rows", { icon: "search", go: ["commands-and-search", "find"] }), AB.iconButton("list-filter", "List options", { go: ["graph-place", "list-menu"] })),
                h("div", { class: "k-scroll" }, AB.tree(rows),
                    found ? h("div", { class: "ab-pad k-secondary pt-treenote" }, "The next path asked with the same settings joins this row as another child. ", oq("Do settings that differ start a second path run row, or a child with its own settings?")) : null),
            );
        },
    });
    // Alias kept for recipe-apply, which still names it: the transfers graph with nothing selected
    registerSection({
        id: "path-tool-graph",
        title: "Transfers graph, nothing selected",
        region: "right",
        states: ["nothing-selected"],
        render(el, state, ctx) { ctx.renderSection("inspector-nothing-selected/transfers", el); },
    });
})();
