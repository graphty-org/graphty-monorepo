/* Bottom toolbar, version 2: four controls -- Select, Analyze, Quick actions, View mode.
   Path and Hand are gone (Path lives on the selection bar and Analyze > Find paths; a plain drag
   already pans or orbits). Flyouts render into the overlay region, so an outside click closes
   them. The XR hand menu mirrors the same controls plus a Rows page. Labels and keys come from
   AB.COMMANDS. Plain ASCII. */
(function () {
    document.head.append(h("style", null,
        ".tb-wrap{display:flex;flex-direction:column;align-items:center;gap:8px}" +
        ".tb-annot{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}" +
        ".tb-annot a{color:inherit}" +
        ".tb-face{min-width:44px}" +
        ".tb-hand{width:320px;max-height:calc(100vh - 140px);overflow:auto;padding:12px;border-radius:13px;background:#1e1e1e;color:#fff;color-scheme:dark;box-shadow:var(--cm-elevation-400)}" +
        ".tb-hand-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:600}" +
        ".tb-hand-needs{margin:0 0 8px;padding:6px 8px;border:1px dashed #ffffff4d;border-radius:8px;font-size:11px;color:#ffffffb2}" +
        ".tb-hand-needs .ab-needs{color:#ffffffcc}" +
        ".tb-hand .k-tab{color:#ffffffb2}.tb-hand .k-tab[aria-selected=true]{color:#fff}" +
        ".tb-hand-tools{display:grid;grid-template-columns:1fr;gap:4px}" +
        ".tb-hand-btn{display:flex;align-items:center;gap:12px;height:44px;padding:0 12px;border-radius:8px;background:#2c2c2c}" +
        ".tb-hand-btn:hover,.tb-hand-btn:focus-visible{background:var(--cm-bg-brand)}" +
        ".tb-hand-btn .tb-sub{margin-inline-start:auto;color:#ffffff99;font-size:11px}" +
        ".tb-hand-row{display:flex;align-items:center;gap:10px;height:44px;padding:0 4px 0 10px;border-radius:8px}" +
        ".tb-hand-row + .tb-hand-row{border-top:1px solid #383838}" +
        ".tb-hand-row[data-dim] .tb-name{color:#ffffff66}" +
        ".tb-hand-row .tb-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
        ".tb-hand-row .tb-count{color:#ffffff99;font-size:11px}" +
        ".tb-hand-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:8px;color:#fff}" +
        ".tb-hand-icon:hover,.tb-hand-icon:focus-visible{background:#383838}" +
        ".tb-hand-icon[aria-pressed=true]{background:var(--cm-bg-brand)}" +
        ".tb-hand .k-secondary{color:#ffffff99}"));

    const C = AB.COMMANDS;
    const clean = (label) => label.replace(/\.+$/, "");
    // The mode the last desktop state showed; a flyout opened from 2D keeps 2D under it.
    let lastMode = "3d";
    const restOf = (mode) => (mode === "2d" ? "2d" : "at-rest");
    const curMode = () => (AB.route && AB.route.frame && AB.route.frame.mode) || lastMode;
    let rowsPage = true; // the hand menu's page

    const oq = (text) => h("span", { class: "k-annot-tag", title: text }, "Open question: " + text);
    const annot = (text, id, state) => h("span", { class: "k-annot-tag" }, AB.link(id, state, text));

    // One Tab stop: arrows move between buttons, Alt+Down opens the focused button's flyout.
    function roving(bar) {
        // The View mode caret is a stop of its own, so arrows reach it as well as Alt+Down
        const stops = [...bar.querySelectorAll(".tb-tool, .k-tool-caret")];
        stops.forEach((s, i) => s.setAttribute("tabindex", i === 0 ? "0" : "-1"));
        bar.addEventListener("keydown", (e) => {
            const i = stops.indexOf(document.activeElement);
            if (i < 0) return;
            let n = -1;
            if (e.key === "ArrowRight") n = (i + 1) % stops.length;
            else if (e.key === "ArrowLeft") n = (i - 1 + stops.length) % stops.length;
            else if (e.key === "Home") n = 0;
            else if (e.key === "End") n = stops.length - 1;
            else if (e.key === "ArrowDown" && e.altKey && stops[i].dataset.flyout) { e.preventDefault(); AB.go("toolbar", stops[i].dataset.flyout); return; }
            if (n < 0) return;
            e.preventDefault();
            stops[i].setAttribute("tabindex", "-1");
            stops[n].setAttribute("tabindex", "0");
            stops[n].focus();
        });
    }

    function toolbar(state) {
        const mode = curMode();
        const rest = restOf(mode);
        const tool = (ic, c, o) => {
            o = o || {};
            const label = o.face || clean(c.label);
            const name = o.anchor || clean(c.label);
            return h("span", Object.assign({
                class: "k-tool k-tool-label tb-tool" + (o.face ? " tb-face" : ""), role: "button",
                "data-tool": name, "data-flyout": o.flyout || null,
                "aria-pressed": o.pressed ? "true" : "false",
                "aria-haspopup": o.flyout ? "menu" : null,
                "aria-label": o.face ? name + ", " + o.face : null,
                "aria-keyshortcuts": c.shortcut || null,
                title: name + (c.shortcut ? " (" + c.shortcut + ")" : "") + (o.flyout ? ". Alt+Down for more" : ""),
            }, AB.act({ go: o.go || c.go })), icon(ic, "lg"), h("span", { class: "ab-tlabel" }, label));
        };
        const caret = (label, s) => {
            const open = state === s;
            return h("span", Object.assign({ class: "k-tool-caret", role: "button", "aria-label": label, "aria-haspopup": "menu", "aria-expanded": String(open) }, AB.act({ go: open ? ["toolbar", rest] : ["toolbar", s] })), icon("chevron-down", "sm"));
        };
        const viewState = state === "view-mode-headset" ? "view-mode-headset" : "view-mode";
        const bar = h("div", { class: "k-toolbar", role: "toolbar", "aria-label": "Tools", "aria-orientation": "horizontal" },
            // No caret on Select until Lasso ships: a flyout with one live entry is not worth the width
            tool("mouse-pointer-2", C.select, { pressed: true, anchor: "Select", go: ["toolbar", rest] }),
            tool("flask-conical", C.analyze, { anchor: "Analyze" }),
            h("span", { class: "k-toolbar-sep" }),
            tool("zap", C["quick-actions"]),
            h("span", { class: "k-toolbar-sep" }),
            // The face click is the same toggle as key 5; the caret opens the flyout
            tool(mode === "2d" ? "square" : "box", C["view-mode"], { anchor: "View mode", flyout: viewState, face: mode === "2d" ? "2D" : "3D", go: ["toolbar", mode === "2d" ? "at-rest" : "2d"] }),
            caret("More view modes: VR and AR (Alt+Down)", viewState),
        );
        roving(bar);
        return bar;
    }

    // Review annotations above the bar, only on the toolbar's own states.
    function annotations(state) {
        if (!AB.route || AB.route.id !== "toolbar") return null;
        const a = [];
        if (state === "at-rest") a.push(annot("With something selected, the selection bar attaches here", "selection-bar", "two-nodes"));
        if (state === "labels-hidden") a.push(annot("Settings > Appearance > Toolbar labels: Never", "settings", "appearance"));
        if (state === "2d") a.push(annot("Fit, frame and zoom are in the Camera menu", "camera-menu", "2d"));
        if (state === "view-mode") a.push(h("span", { class: "k-annot-tag", title: "The app shows a plain reason; the check is graphty-element's isVRSupported() and isARSupported()" }, "Design note: the disabled reasons come from the element's VR and AR checks"));
        return a.length ? h("div", { class: "tb-annot" }, a) : null;
    }

    function flyout(state) {
        const rest = restOf(lastMode);
        const headset = state === "view-mode-headset";
        const xr = ["toolbar", "xr-hand-menu"];
        // Key 5 is one toggle, shown once: on the mode it would switch to
        return AB.menu({
            anchor: "[data-tool='View mode']", place: "above-start",
            items: [
                { label: "2D", shortcut: lastMode === "2d" ? null : "5", check: lastMode === "2d", go: ["toolbar", "2d"] },
                { label: "3D", shortcut: lastMode === "3d" ? null : "5", check: lastMode === "3d", go: ["toolbar", "at-rest"] },
                { sep: true },
                headset ? AB.cmd("enter-vr", { enabled: true, go: xr }) : AB.cmd("enter-vr"),
                headset ? AB.cmd("enter-ar", { enabled: true, go: xr }) : AB.cmd("enter-ar"),
            ],
        });
    }

    // Esc closes a flyout and returns focus to its button.
    function escToClose(el) {
        el.addEventListener("keydown", (e) => {
            if (e.key === "Escape") { e.stopPropagation(); AB.go("toolbar", restOf(lastMode)); }
        });
    }

    // ---------- the XR hand menu (a design target: the element has no in-headset menu) ----------
    function handMenu() {
        const L = AB.fx.datasets.lesmis;
        const multi = (cs) => h("span", { class: "ab-multi" }, cs.map((c) => AB.chit(c, true)));
        // The graph tree's top-level rows that have an eye, in paint order, Notes included
        const rows = [
            { name: "Notes", swatch: icon("message-square"), count: "2 nodes", eye: true },
            { name: "PageRank", swatch: AB.ramp("#ef7818", "#662506"), eye: true },
            { name: "Louvain, resolution 1.0", swatch: multi(["#E69F00", "#56B4E9", "#009E73"]), count: "6 groups", eye: true },
            { name: "Shortest paths", swatch: AB.chit("#D55E00"), count: "2 paths", eye: true },
            { name: "Watchlist", swatch: AB.chit("#CC79A7", true), count: "5", eye: true },
            { name: "For the report", swatch: icon("folder-open"), count: "3 rows", eye: true },
            { name: "Everything", swatch: icon("square-filled"), eye: true },
        ];
        let solo = null;
        const box = h("div", { class: "tb-hand", role: "menu", "aria-label": "Hand menu" });
        const hb = (ic, label, sub, o) => h("div", Object.assign({ class: "tb-hand-btn", role: "menuitem" }, AB.act(o)), icon(ic, "lg"), h("span", null, label), sub ? h("span", { class: "tb-sub" }, sub) : null);

        function tools() {
            return h("div", { class: "tb-hand-tools" },
                hb("mouse-pointer-2", "Select", null, { onClick: () => AB.flash("Select is the only pointer tool in a headset (not wired in the skeleton)") }),
                hb("flask-conical", "Analyze", "last settings", { go: C.analyze.go }),
                hb("zap", "Quick actions", null, { go: C["quick-actions"].go }),
                hb("headset", "View mode", "Exit VR", { go: ["toolbar", "at-rest"] }),
                h("div", { class: "k-secondary", style: "padding:6px 4px 0;font-size:11px" }, "Analyze runs each entry with its last settings, or its defaults, and names them before it runs. Option forms and styling wait for the desktop."));
        }
        function rowsList() {
            const list = h("div", { role: "list" });
            const draw = () => {
                list.replaceChildren(...rows.map((r) => {
                    const shown = solo ? solo === r : r.eye;
                    const eye = h("span", Object.assign({ class: "tb-hand-icon", role: "button", "aria-label": (r.eye ? "Hide " : "Show ") + r.name }, AB.act({ onClick: () => { r.eye = !r.eye; solo = null; draw(); } })), icon(r.eye ? "eye" : "eye-off", "lg"));
                    const so = h("span", Object.assign({ class: "tb-hand-icon", role: "button", "aria-pressed": String(solo === r), "aria-label": "Show only " + r.name }, AB.act({ onClick: () => { solo = solo === r ? null : r; draw(); } })), icon("target", "lg"));
                    return h("div", { class: "tb-hand-row", role: "listitem", "data-dim": shown ? null : "" }, r.swatch, h("span", { class: "tb-name" }, r.name), r.count ? h("span", { class: "tb-count" }, r.count) : null, so, eye);
                }));
            };
            draw();
            return [list, h("div", { class: "k-secondary", style: "padding-top:8px;font-size:11px" }, "Top-level rows in paint order. Reorder and style them at the desktop.")];
        }
        const body = h("div");
        const page = (rp) => { rowsPage = rp; body.replaceChildren(...[].concat(rp ? rowsList() : tools())); };
        box.append(
            h("div", { class: "tb-hand-head" }, icon("hand"), h("span", { class: "k-grow" }, "Hand menu"), h("span", { class: "k-secondary" }, L.frame.project)),
            h("div", { class: "tb-hand-needs" }, "Design target, not buildable yet: ", AB.needsElement("in-headset menu: page panels are not visible inside a headset, and graphty-element has no in-headset menu API; filed")),
            AB.tabs(["Tools", "Rows"], rowsPage ? "Rows" : "Tools", (n) => page(n === "Rows")),
            body);
        page(rowsPage);
        return box;
    }

    // ---------- keys the toolbar owns ----------
    // The shell owns Ctrl+K, Shift+A, P and ?; on the toolbar's own route, 5 toggles here instead
    // of the shell's "not wired" flash (capture phase, so the shell's handler never sees it).
    window.addEventListener("keydown", (e) => {
        const t = e.target;
        if (!AB.fx || document.body.dataset.page !== "app") return;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
        if (AB.store && AB.store.get("singleKeys") === "off") return; // Settings > Accessibility (WCAG 2.1.4)
        if (e.key === "v" || e.key === "V") AB.go("toolbar", restOf(curMode()));
        else if (e.key === "5" && AB.route && AB.route.id === "toolbar") {
            e.preventDefault();
            e.stopImmediatePropagation();
            AB.go("toolbar", curMode() === "2d" ? "at-rest" : "2d");
        }
    }, true);

    const FLYOUTS = ["view-mode", "view-mode-headset"];

    registerSection({
        id: "toolbar",
        title: "Toolbar",
        region: "toolbar",
        closeTo: "toolbar/at-rest",
        states: [
            { id: "at-rest", label: "At rest (3D)" },
            { id: "labels-hidden", label: "Labels hidden" },
            { id: "view-mode", label: "View mode, no headset" },
            { id: "view-mode-headset", label: "View mode, headset present" },
            { id: "2d", label: "2D active" },
            { id: "xr-hand-menu", label: "XR hand menu, Rows page" },
            { id: "session-ended", label: "Headset session ended" },
        ],
        frame(state) {
            if (FLYOUTS.includes(state)) return { overlay: "toolbar/" + state, mode: lastMode };
            if (state === "xr-hand-menu") return { top: false, rail: false, left: false, right: false, dock: false };
            if (state === "2d") return { mode: "2d" };
            return {};
        },
        render(el, state, ctx) {
            // "3d" was this section's state in version 1; 3D is now at rest
            if (state === "3d") state = "at-rest";
            if (ctx.region === "overlay") {
                const m = flyout(state);
                escToClose(m);
                el.append(m);
                return;
            }
            if (AB.route && AB.route.id === "toolbar" && !FLYOUTS.includes(state)) lastMode = state === "2d" ? "2d" : "3d";
            if (state === "xr-hand-menu") {
                if (ctx.region !== "toolbar") return;
                el.append(h("div", { class: "tb-wrap" }, h("div", { class: "tb-annot" }, annot("In a headset the toolbar becomes this hand menu; Exit VR returns to 3D", "toolbar", "at-rest")), handMenu()));
                return;
            }
            if (state === "labels-hidden") {
                const dock = document.getElementById("ab-toolbar");
                if (dock) dock.dataset.labels = "never";
            }
            const wrap = h("div", { class: "tb-wrap" }, annotations(state));
            if (state === "session-ended") {
                wrap.append(
                    h("div", { class: "tb-annot" }, oq("reason wording is graphty-element's")),
                    AB.notice("The headset session ended unexpectedly. The graph is back in 3D.", { label: "Enter VR", go: ["toolbar", "view-mode-headset"] }));
            }
            wrap.append(toolbar(state));
            el.append(wrap);
        },
    });
})();
