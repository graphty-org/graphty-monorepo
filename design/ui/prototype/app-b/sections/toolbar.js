/* Bottom toolbar, version 3: five 32 px icon buttons, no text -- Analyze | Layout, View, Legend |
   Quick actions. Layout opens the graph's Layout group (AB.layoutGroup, the inspector's own
   component) as a popover above the bar, under one line that pauses or resumes; its icon still
   shows whether the layout is moving. Every name and key is in the one tooltip (AB.tip, via AB.toolbarButton). Select
   and the View mode button are gone: View opens view-flyout (camera, views, 2D/3D, VR, AR). In a
   headset the toolbar becomes the hand menu, which keeps text labels. Plain ASCII. */
(function () {
    document.head.append(h("style", null,
        ".tb-wrap{display:flex;flex-direction:column;align-items:center;gap:8px}" +
        ".tb-annot{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}" +
        ".tb-annot a{color:inherit}" +
        ".tb-hand{width:320px;max-height:calc(100vh - 140px);overflow:auto;padding:12px;border-radius:13px;background:var(--cm-bg-menu);color:var(--cm-text-menu);color-scheme:dark;box-shadow:var(--cm-elevation-400)}" +
        ".tb-hand-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:600}" +
        ".tb-hand-needs{margin:0 0 8px;padding:6px 8px;border:1px dashed var(--k-menu-ink3);border-radius:8px;font-size:11px;color:var(--cm-text-menu-secondary)}" +
        ".tb-hand-needs .ab-needs{color:var(--cm-text-menu)}" +
        ".tb-hand .k-tab{color:var(--cm-text-menu-secondary)}.tb-hand .k-tab[aria-selected=true]{color:var(--cm-text-menu)}" +
        ".tb-hand-tools{display:grid;grid-template-columns:1fr;gap:4px}" +
        ".tb-hand-btn{display:flex;align-items:center;gap:12px;height:44px;padding:0 12px;border-radius:8px;background:var(--cm-border-menu)}" +
        ".tb-hand-btn:hover,.tb-hand-btn:focus-visible{background:var(--cm-bg-brand)}" +
        ".tb-hand-btn .tb-sub{margin-inline-start:auto;color:var(--cm-text-menu-secondary);font-size:11px}" +
        ".tb-hand-row{display:flex;align-items:center;gap:10px;height:44px;padding:0 4px 0 10px;border-radius:8px}" +
        ".tb-hand-row + .tb-hand-row{border-top:1px solid var(--cm-border-menu)}" +
        ".tb-hand-row[data-dim] .tb-name{color:var(--cm-text-menu-disabled)}" +
        ".tb-hand-row .tb-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
        ".tb-hand-row .tb-count{color:var(--cm-text-menu-secondary);font-size:11px}" +
        ".tb-hand-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:8px;color:var(--cm-text-menu)}" +
        ".tb-hand-icon:hover,.tb-hand-icon:focus-visible{background:var(--cm-border-menu)}" +
        ".tb-hand-icon[aria-pressed=true]{background:var(--cm-bg-brand)}" +
        ".tb-hand .k-secondary{color:var(--cm-text-menu-secondary)}" +
        ".tb-lay .k-section-head{display:none}.tb-lay-run{display:flex;align-items:center;gap:8px}"));

    const TB = AB.toolbarButton;
    const LAYOUT = { "layout-paused": "paused", "layout-settled": "settled" }; // every other state: running
    const annot = (text, id, state) => h("span", { class: "k-annot-tag" }, AB.link(id, state, text));
    let entered = null; // the state last entered, so a toggle's redraw does not reset it
    let rowsPage = true; // the hand menu's page

    // The popover: one line that pauses or resumes, then the inspector's Layout group itself
    function layoutPopover() {
        const ds = AB.route && AB.route.frame.dataset;
        const run = h("span", { class: "tb-lay-run" });
        const paint = (refocus) => {
            const c = AB.cmd("layout");
            const btn = AB.button(c.label, { kind: "secondary", icon: AB.layoutState === "running" ? "pause" : "play", onClick: () => { AB.setLayout(AB.layoutState === "running" ? "paused" : "running"); paint(true); } });
            run.replaceChildren(h("span", { class: "k-grow" }, { running: "Running", paused: "Paused", settled: "Settled" }[AB.layoutState]), btn);
            if (refocus) btn.focus(); // focus stays in the popover, so Esc still closes it
        };
        paint();
        const p = AB.popover({ anchor: "#ab-toolbar [data-tool='Layout']", width: 300, title: "Layout",
            body: h("div", { class: "tb-lay" }, AB.fieldRow("Motion", run, { popover: true }), AB.layoutGroup(ds === "transactions" ? "transfers" : "layout")) });
        // Esc closes it: the shell's Esc skips a route whose closeTo is the same section
        p.addEventListener("keydown", (e) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); AB.close(); } });
        return p;
    }

    // The bar, from the shared helpers. Same as AB.mainToolbar() except where a state changes one
    // button: the View tooltip names the view the camera sits exactly on; an export disables Layout.
    function toolbar(state) {
        const mode = (AB.route && AB.route.frame.mode) || "3d";
        const layout = state === "export-waiting"
            ? TB("pause", "Layout", { tool: "Layout", disabled: "Waiting to capture the image" })
            : AB.layoutButton();
        return AB.toolbarBar([
            TB("flask-conical", "Analyze", { key: "Shift+A", popup: "dialog", go: ["analyze-popover", "open"] }),
            "sep",
            layout,
            TB(mode === "2d" ? AB.ICON.mode2d : AB.ICON.mode3d, state === "tooltip-focus" ? "View: Front" : "View", { tool: "View", popup: "menu", go: ["view-flyout", mode] }),
            AB.legendButton(),
            "sep",
            TB(AB.ICON.quickActions, "Quick actions", { key: "Ctrl+K", popup: "dialog", go: ["commands-and-search", "quick-actions"] }),
        ]);
    }

    // Review annotations above the bar, only on the toolbar's own route.
    function annotations(state) {
        if (!AB.route || AB.route.id !== "toolbar") return null;
        const a = [];
        if (state === "at-rest") a.push(annot("With something selected, the selection bar attaches here", "selection-bar", "two-nodes"));
        if (state === "layout-settled") a.push(AB.openQuestion("graphty-element to confirm: resuming after the layout settled continues from the current positions"));
        return a.length ? h("div", { class: "tb-annot" }, a) : null;
    }

    // The states that show a tooltip raise the shared one at once: on a button as if hovered, or by
    // keyboard focus on View.
    // (Export waiting raises none: its notice already says why, and a raised tooltip would cover it.)
    const TIP_ON = { "tooltip-hover": "Analyze", "nothing-drawn": "Analyze" };
    function raiseTip(state) {
        setTimeout(() => {
            const b = document.querySelector("#ab-toolbar [data-tool='" + (TIP_ON[state] || "View") + "']");
            if (!b) return;
            // A review state shows the tooltip at once (a reader hovering would wait the 500 ms delay)
            const over = () => AB.showTip(b);
            if (TIP_ON[state]) return over();
            // As if the reader tabbed in and pressed Right twice: the toolbar's one Tab stop moves to View
            // (roving tabindex), and the page counts as keyboard-driven, so the ring and the tooltip show
            b.closest("[role=toolbar]").querySelectorAll(".k-tool, .k-tool-caret").forEach((x) => (x.tabIndex = x === b ? 0 : -1));
            document.documentElement.dataset.input = "key";
            b.focus({ focusVisible: true });
            if (!b.matches(":focus-visible")) AB.showTip(b, true); // a browser without focusVisible
        }, 60);
    }

    // ---------- the XR hand menu (a design target: the element has no in-headset menu) ----------
    function handMenu() {
        const L = AB.fx.datasets.lesmis;
        const multi = (cs) => h("span", { class: "ab-multi" }, cs.map((c) => AB.chit(c, true)));
        // The graph tree's top-level rows that have an eye, in paint order, Notes included; counts as the tree shows them
        const rows = [
            { name: "Notes", swatch: icon(AB.ICON.note), count: "4", eye: true },
            { name: "PageRank", swatch: AB.ramp("#ef7818", "#662506"), eye: true },
            { name: "Louvain", swatch: multi(["#E69F00", "#56B4E9", "#009E73"]), count: AB.count(6, "group"), eye: true },
            { name: "Shortest paths", swatch: AB.chit("#D55E00"), eye: true },
            { name: "Watchlist", swatch: AB.chit("#CC79A7", true), count: "5", eye: true },
            { name: "For the report", swatch: icon("folder-open"), eye: true },
            { name: "Everything", swatch: icon("base-layer"), eye: true },
        ];
        let solo = null;
        const box = h("div", { class: "tb-hand", role: "dialog", "aria-label": "Hand menu" });
        const hb = (ic, label, sub, o) => h("div", Object.assign({ class: "tb-hand-btn", role: "button" }, AB.act(o)), icon(ic, "lg"), h("span", null, label), sub ? h("span", { class: "tb-sub" }, sub) : null);
        const body = h("div");

        function tools() {
            const running = AB.layoutState === "running";
            return h("div", { class: "tb-hand-tools" },
                hb("flask-conical", "Analyze", "last settings", { go: ["analyze-popover", "open"] }),
                hb(running ? "pause" : "play", "Layout", running ? "Pause" : "Resume", { onClick: () => { AB.setLayout(running ? "paused" : "running"); page(false); } }),
                hb(AB.ICON.mode3d, "View", "VR", { go: ["view-flyout", "3d"] }),
                hb(AB.ICON.legend, "Legend", AB.legendOn() ? "On" : "Off", { onClick: () => AB.setLegend(!AB.legendOn()) }),
                hb(AB.ICON.quickActions, "Quick actions", null, { go: ["commands-and-search", "quick-actions"] }),
                hb("x", "Exit", "back to 3D", { go: ["toolbar", "at-rest"] }),
                h("div", { class: "k-secondary", style: "padding:6px 4px 0;font-size:11px" }, "Analyze runs each entry with its last settings, or its defaults. Option forms and styling wait for the desktop."));
        }
        function rowsList() {
            const list = h("div", { role: "list" });
            const draw = () => {
                list.replaceChildren(...rows.map((r) => {
                    const shown = solo ? solo === r : r.eye;
                    const eye = AB.tip(h("span", Object.assign({ class: "tb-hand-icon", role: "button" }, AB.act({ onClick: () => { r.eye = !r.eye; solo = null; draw(); } })), icon(r.eye ? AB.ICON.shown : AB.ICON.hidden, "lg")), (r.eye ? "Hide " : "Show ") + r.name);
                    const so = AB.tip(h("span", Object.assign({ class: "tb-hand-icon", role: "button", "aria-pressed": String(solo === r) }, AB.act({ onClick: () => { solo = solo === r ? null : r; draw(); } })), icon("target", "lg")), "Show only this row");
                    return h("div", { class: "tb-hand-row", role: "listitem", "data-dim": shown ? null : "" }, r.swatch, h("span", { class: "tb-name" }, r.name), r.count ? h("span", { class: "tb-count" }, r.count) : null, so, eye);
                }));
            };
            draw();
            return [list, h("div", { class: "k-secondary", style: "padding-top:8px;font-size:11px" }, "Top-level rows in paint order. Reorder and style them at the desktop.")];
        }
        function page(rp) { rowsPage = rp; body.replaceChildren(...[].concat(rp ? rowsList() : tools())); }
        box.append(
            h("div", { class: "tb-hand-head" }, icon("hand"), h("span", { class: "k-grow" }, "Hand menu"), h("span", { class: "k-secondary" }, L.frame.project)),
            h("div", { class: "tb-hand-needs ab-review-only" }, "Design target, not buildable yet: ", AB.needsElement("in-headset menu: page panels are not visible inside a headset, and graphty-element has no in-headset menu API; filed")),
            AB.tabs(["Tools", "Rows"], rowsPage ? "Rows" : "Tools", (n) => page(n === "Rows")),
            body);
        page(rowsPage);
        return box;
    }

    // Old state ids (other sections may still link to them) open the bar at rest.
    const OLD = { "3d": "at-rest", "labels-hidden": "at-rest", "view-mode": "at-rest", "view-mode-headset": "at-rest" };

    registerSection({
        id: "toolbar",
        title: "Toolbar",
        region: "toolbar",
        closeTo: "toolbar/at-rest",
        states: [
            { id: "at-rest", label: "At rest (3D, layout running)" },
            { id: "tooltip-hover", label: "Tooltip on hover (Analyze)" },
            { id: "tooltip-focus", label: "Tooltip on keyboard focus (View)" },
            { id: "layout-paused", label: "Layout paused" },
            { id: "layout-settled", label: "Layout settled" },
            { id: "legend-off", label: "Legend off" },
            { id: "2d", label: "2D" },
            { id: "analyze-open", label: "Analyze open" },
            { id: "layout-open", label: "Layout open: the graph's Layout group as a popover" },
            { id: "nothing-drawn", label: "Nothing is drawn" },
            { id: "export-waiting", label: "Export waiting for the layout" },
            { id: "xr-hand-menu", label: "XR hand menu, Rows page" },
            { id: "session-ended", label: "Headset session ended" },
        ],
        frame(state) {
            if (state === "xr-hand-menu") return { top: false, rail: false, left: false, right: false, dock: false };
            if (state === "2d") return { mode: "2d" };
            if (state === "analyze-open") return { overlay: "analyze-popover/open" };
            if (state === "layout-open") return { overlay: "toolbar/layout-open" };
            if (state === "nothing-drawn") return { canvas: "canvas-and-states/empty", left: "graph-place/empty", right: false, dock: false };
            if (state === "export-waiting") return { canvas: "canvas-and-states/waiting-to-settle" };
            return {};
        },
        render(el, state, ctx) {
            state = OLD[state] || state;
            if (ctx.region === "overlay") return el.append(layoutPopover());
            if (!AB.route || AB.route.id !== "toolbar") entered = null;
            if (AB.route && AB.route.id === "toolbar" && entered !== state) {
                // Entering a state sets the layout and the legend it shows; toggles after that stick
                entered = state;
                // a popover opened from the bar (Analyze, Layout) leaves the layout as it was: opening it starts nothing
                if (!/-open$/.test(state)) AB.layoutState = LAYOUT[state] || "running";
                const legend = state !== "legend-off";
                if (AB.legendOn() !== legend) setTimeout(() => AB.setLegend(legend)); // redraws, so the canvas card agrees
                if (TIP_ON[state] || state === "tooltip-focus") raiseTip(state);
            }
            if (state === "nothing-drawn") AB.toolbarDisabled = "Nothing is drawn";
            if (state === "xr-hand-menu") {
                el.append(h("div", { class: "tb-wrap" }, h("div", { class: "tb-annot" }, annot("In a headset the toolbar becomes this hand menu; Exit returns to 3D", "toolbar", "at-rest")), handMenu()));
                return;
            }
            const wrap = h("div", { class: "tb-wrap" }, annotations(state));
            if (state === "session-ended") {
                wrap.append(
                    h("div", { class: "tb-annot" }, AB.openQuestion("the reason wording is graphty-element's")),
                    AB.notice("The headset session ended unexpectedly. The graph is back in 3D.", { label: "Enter VR", go: ["view-flyout", "3d"] }));
            }
            wrap.append(toolbar(state));
            el.append(wrap);
        },
    });
})();
