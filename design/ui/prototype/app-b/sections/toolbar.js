/* Bottom toolbar: Select (pointer tools), Path, Analyze, Quick actions, View mode.
   The flyouts render into the overlay region (this section is also named there by `frame`), so
   the shell dims nothing and an outside click closes them. The XR hand menu is the same controls,
   in the same order, plus a Rows page. Plain ASCII. */
(function () {
    // Section-local styles (not in the shared kit).
    document.head.append(h("style", null,
        ".tb-wrap{display:flex;flex-direction:column;align-items:center;gap:8px}" +
        ".tb-annot{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}" +
        ".tb-annot a{color:inherit}" +
        ".tb-face{min-width:44px}" +
        ".tb-hand{width:320px;max-height:calc(100vh - 140px);overflow:auto;padding:12px;border-radius:13px;background:#1e1e1e;color:#fff;color-scheme:dark;box-shadow:var(--cm-elevation-400)}" +
        ".tb-hand-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:600}" +
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
        ".tb-hand-foot{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid #383838}" +
        ".tb-hand .k-secondary{color:#ffffff99}"));

    const POINTERS = {
        Select: { icon: "mouse-pointer-2", key: "V" },
        Lasso: { icon: "lasso", key: "Q" },
        Hand: { icon: "hand", key: "H" },
    };
    let pointer = "Select"; // the Select control's face shows the last pointer tool
    let dim = "2D";         // what the View mode control shows
    let rowsPage = true;    // the hand menu's page

    const oq = (text) => h("span", { class: "k-annot-tag", title: text }, "Open question: " + text);
    const annot = (text, id, state) => h("span", { class: "k-annot-tag" }, AB.link(id, state, text));

    function setPointer(name) {
        pointer = name;
        const st = dim === "3D" ? "3d" : "at-rest";
        if (location.hash === AB.href("toolbar", st)) AB.render(); else AB.go("toolbar", st);
    }

    // One Tab stop: arrows move between buttons, Alt+Down opens the focused button's flyout.
    function roving(bar) {
        const stops = [...bar.querySelectorAll(".tb-tool")];
        stops.forEach((s, i) => s.setAttribute("tabindex", i === 0 ? "0" : "-1"));
        bar.querySelectorAll(".k-tool-caret").forEach((c) => c.setAttribute("tabindex", "-1"));
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
        const tool = (ic, label, key, target, o) => h("span", Object.assign({
            class: "k-tool k-tool-label tb-tool" + (o && o.face ? " tb-face" : ""), role: "button",
            "data-tool": o && o.anchor || label, "data-flyout": o && o.flyout || null,
            "aria-pressed": o && o.pressed ? "true" : "false",
            "aria-haspopup": o && o.flyout ? "menu" : null,
            "aria-keyshortcuts": key, title: label + " (" + key + ")" + (o && o.flyout ? ". Alt+Down for more" : ""),
        }, AB.act({ go: target })), icon(ic, "lg"), h("span", { class: "ab-tlabel" }, label));
        const caret = (label, target, open) => h("span", Object.assign({ class: "k-tool-caret", role: "button", "aria-label": label, "aria-haspopup": "menu", "aria-expanded": String(!!open) }, AB.act({ go: target })), icon("chevron-down", "sm"));
        const p = POINTERS[pointer];
        const flyToggle = (s) => state === s ? [ "toolbar", dim === "3D" ? "3d" : "at-rest" ] : ["toolbar", s];
        const viewState = state === "view-mode-headset" ? "view-mode-headset" : "view-mode";
        const bar = h("div", { class: "k-toolbar", role: "toolbar", "aria-label": "Tools" },
            tool(p.icon, pointer, p.key, ["toolbar", dim === "3D" ? "3d" : "at-rest"], { pressed: true, anchor: "Select", flyout: "pointer-flyout" }),
            caret("Pointer tools", flyToggle("pointer-flyout"), state === "pointer-flyout"),
            tool("route", "Path", "P", ["path-tool", "armed"]),
            tool("flask-conical", "Analyze", "A", ["analyze-popover", "open"]),
            h("span", { class: "k-toolbar-sep" }),
            tool("zap", "Quick actions", "Ctrl+K", ["commands-and-search", "quick-actions"]),
            h("span", { class: "k-toolbar-sep" }),
            tool(dim === "3D" ? "box" : "square", dim, "5", ["toolbar", dim === "3D" ? "at-rest" : "3d"], { anchor: "View mode", flyout: viewState, face: true }),
            caret("View mode", flyToggle(viewState), state === viewState),
        );
        roving(bar);
        return bar;
    }

    // Review annotations above the bar: where the neighbors of this section are.
    function annotations(state) {
        // Only on the toolbar's own states; framing another section, the toolbar carries no review notes
        if (!AB.route || AB.route.id !== "toolbar") return null;
        const a = [];
        if (state === "at-rest") a.push(annot("With something selected, the selection bar attaches here", "selection-bar", "two-nodes"));
        if (state === "3d") a.push(annot("Camera presets (1, 3, 7) are in the zoom and view menu in 3D", "zoom-and-view-menu", "3d"));
        if (state === "view-mode") a.push(oq("reason wording comes from graphty-element"));
        return a.length ? h("div", { class: "tb-annot" }, a) : null;
    }

    function flyout(state) {
        if (state === "pointer-flyout") {
            return AB.menu({
                anchor: "[data-tool=Select]", place: "above-start",
                items: [
                    ...Object.keys(POINTERS).map((n) => ({ label: n, shortcut: POINTERS[n].key, check: n === pointer, onClick: () => setPointer(n) })),
                    { sep: true },
                    { heading: "Hold Space to pan" },
                ],
            });
        }
        const headset = state === "view-mode-headset";
        const reason = "No headset found. Connect one and reload.";
        return AB.menu({
            anchor: "[data-tool='View mode']", place: "above-start",
            items: [
                { label: "2D", shortcut: "5", check: dim === "2D", go: ["toolbar", "at-rest"] },
                { label: "3D", shortcut: "5", check: dim === "3D", go: ["toolbar", "3d"] },
                { sep: true },
                headset ? { label: "Enter VR", go: ["toolbar", "xr-hand-menu"] } : { label: "Enter VR", disabled: true, desc: reason },
                headset ? { label: "Enter AR", go: ["toolbar", "xr-hand-menu"] } : { label: "Enter AR", disabled: true, desc: "This device cannot show AR." },
            ],
        });
    }

    // Esc closes a flyout and returns focus to its button.
    function escToClose(el) {
        el.addEventListener("keydown", (e) => {
            if (e.key === "Escape") { e.stopPropagation(); AB.go("toolbar", dim === "3D" ? "3d" : "at-rest"); }
        });
    }

    // ---------- the XR hand menu ----------
    function handMenu() {
        const L = AB.fx.datasets.lesmis;
        // The graph tree's top-level rows that paint, in paint order (same rows as the Graph place at rest)
        const multi = (cs) => h("span", { class: "ab-multi" }, cs.map((c) => AB.chit(c, true)));
        const rows = [
            { name: "PageRank", swatch: AB.ramp("#ef7818", "#662506"), eye: true },
            { name: "Louvain, resolution 1.0", swatch: multi(["#E69F00", "#56B4E9", "#009E73"]), count: "6 groups", eye: true },
            { name: "Shortest paths", swatch: AB.chit("#D55E00"), count: "2 paths", eye: true },
            { name: "Watchlist", swatch: AB.chit("#CC79A7", true), count: "5", eye: true },
            { name: "For the report", swatch: icon("folder-open"), count: "3 rows", eye: true },
            { name: "Everything", swatch: AB.chit("#9e9e9e", true), eye: true },
        ];
        let solo = null;
        const box = h("div", { class: "tb-hand", role: "menu", "aria-label": "Hand menu" });
        const hb = (ic, label, sub, o) => h("div", Object.assign({ class: "tb-hand-btn", role: "menuitem" }, AB.act(o)), icon(ic, "lg"), h("span", null, label), sub ? h("span", { class: "tb-sub" }, sub) : null);

        function tools() {
            return h("div", { class: "tb-hand-tools" },
                hb("mouse-pointer-2", "Select", "Select, Hand", { onClick: () => AB.flash("Pointer tool chosen (not wired in the skeleton)") }),
                hb("route", "Path", "last settings", { go: ["path-tool", "armed"] }),
                hb("flask-conical", "Analyze", "last settings", { go: ["analyze-popover", "open"] }),
                hb("zap", "Quick actions", null, { go: ["commands-and-search", "quick-actions"] }),
                hb("box", "View mode", "Exit VR", { go: ["toolbar", "3d"] }),
                h("div", { class: "k-secondary", style: "padding:6px 4px 0;font-size:11px" }, "Path and Analyze run with each entry's last settings, or its defaults. Settings and styling wait for the desktop."));
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
            const markers = h("span", Object.assign({ class: "k-switch", role: "switch", "aria-checked": "true", "aria-label": "Note markers" }, AB.act({ onClick: (e) => { const t = e.currentTarget; t.setAttribute("aria-checked", String(t.getAttribute("aria-checked") !== "true")); } })));
            return [list,
                h("div", { class: "tb-hand-foot" }, markers, h("span", { class: "k-grow" }, "Note markers"), h("span", { class: "k-secondary" }, "Shift+N")),
                h("div", { class: "k-secondary", style: "padding-top:8px;font-size:11px" }, "Top-level rows in paint order. Reorder and style them at the desktop.")];
        }
        const body = h("div");
        const page = (rp) => { rowsPage = rp; body.replaceChildren(...[].concat(rp ? rowsList() : tools())); };
        box.append(
            h("div", { class: "tb-hand-head" }, icon("hand"), h("span", { class: "k-grow" }, "Hand menu"), h("span", { class: "k-secondary" }, L.frame.project)),
            AB.tabs(["Tools", "Rows"], rowsPage ? "Rows" : "Tools", (n) => page(n === "Rows")),
            body);
        page(rowsPage);
        return box;
    }

    // ---------- keys the toolbar owns (the shell keeps its own) ----------
    document.addEventListener("keydown", (e) => {
        const t = e.target;
        if (!AB.fx || document.body.dataset.page !== "app") return;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        const mod = e.ctrlKey || e.metaKey;
        if (mod && !e.shiftKey && !e.altKey && (e.key === "k" || e.key === "K")) { e.preventDefault(); AB.go("commands-and-search", "quick-actions"); return; }
        if (mod || e.altKey || e.shiftKey) return;
        const k = e.key.toLowerCase();
        if (k === "v") setPointer("Select");
        else if (k === "q") setPointer("Lasso");
        else if (k === "h") setPointer("Hand");
        else if (k === "p") AB.go("path-tool", "armed");
        else if (k === "a") AB.go("analyze-popover", "open");
        else if (k === "5") AB.go("toolbar", dim === "3D" ? "at-rest" : "3d");
    });

    const FLYOUTS = ["pointer-flyout", "view-mode", "view-mode-headset"];

    registerSection({
        id: "toolbar",
        title: "Toolbar",
        region: "toolbar",
        closeTo: "toolbar/at-rest",
        states: [
            { id: "at-rest", label: "At rest" },
            { id: "pointer-flyout", label: "Pointer tools open" },
            { id: "view-mode", label: "View mode, no headset" },
            { id: "view-mode-headset", label: "View mode, headset present" },
            { id: "3d", label: "3D active" },
            { id: "xr-hand-menu", label: "XR hand menu, Rows page" },
        ],
        frame(state) {
            if (FLYOUTS.includes(state)) return { overlay: "toolbar/" + state };
            if (state === "xr-hand-menu") return { top: false, rail: false, left: false, right: false, dock: false };
            return {};
        },
        render(el, state, ctx) {
            if (state === "at-rest") dim = "2D";
            if (state === "3d") dim = "3D";
            if (ctx.region === "overlay") {
                const m = flyout(state);
                escToClose(m);
                el.append(m);
                return;
            }
            if (state === "xr-hand-menu") {
                if (ctx.region !== "toolbar") return;
                el.append(h("div", { class: "tb-wrap" }, h("div", { class: "tb-annot" }, annot("In a headset the toolbar becomes this hand menu; Exit VR returns to 3D", "toolbar", "3d")), handMenu()));
                return;
            }
            el.append(h("div", { class: "tb-wrap" }, annotations(state), toolbar(state)));
        },
    });
})();
