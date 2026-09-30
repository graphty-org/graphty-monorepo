/* Refined B skeleton: the shell. Hash routing, the persistent frame, the section loader,
   the "Where am I" line and the site map. Section files never edit this file. Plain ASCII. */
(function () {
    "use strict";
    const AB = window.AB;
    const { h, icon, go, href, act, append } = AB;

    // Which section stands in for each frame region when the route does not name one.
    const DEFAULT_FRAME = { top: true, rail: true, left: "graph-place", right: "inspector-nothing-selected", canvas: "canvas-and-states", toolbar: "toolbar", dock: "table-dock", overlay: null, workspace: null, full: null };
    const REGION_LABEL = { left: "Left panel", right: "Inspector", canvas: "Canvas", toolbar: "Toolbar", dock: "Table dock", overlay: "Menu or dialog", workspace: "Full canvas", full: "Whole window" };
    // What the frame's other regions show when the section works on the transfers data, not Les Miserables
    const DATASET_FRAME = { transactions: { canvas: "canvas-and-states/transfers", right: "path-tool-graph/nothing-selected", dock: "table-dock/transfers" } };
    const PLACES = { graph: ["Graph", "network", "graph-place"], data: ["Data", "database", "data-place"], notes: ["Notes", "sticky-note", "notes-place"], assistant: ["Assistant", "bot", "assistant-place"] };

    // ---------- persistent viewer conveniences (never required) ----------
    const store = {
        get(k) { try { return localStorage.getItem("ab." + k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem("ab." + k, v); } catch (e) { /* private window: fine */ } },
    };
    const shell = { dock: store.get("dock") || "open" };

    function setTheme(t) {
        if (t) document.documentElement.setAttribute("data-theme", t);
        store.set("theme", t || "");
    }
    function currentTheme() {
        const t = document.documentElement.getAttribute("data-theme");
        if (t) return t;
        return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    if (store.get("theme")) document.documentElement.setAttribute("data-theme", store.get("theme"));

    // ---------- routing ----------
    function parse() {
        const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
        return { id: parts[0] || "graph-place", state: parts.slice(1).join("/") || null };
    }
    function refOf(v) {
        if (!v) return null;
        const [id, ...rest] = String(v).split("/");
        return { id, state: rest.join("/") || null };
    }
    let route = null;

    AB.close = function () {
        if (!route) return;
        go(route.closeTo.id, route.closeTo.state);
    };
    AB.toggleDock = function () {
        shell.dock = shell.dock === "open" ? "closed" : "open";
        store.set("dock", shell.dock);
        render();
    };
    AB.flash = function (text) {
        const f = h("div", { class: "ab-flash" }, text);
        document.body.append(f);
        setTimeout(() => f.remove(), 2200);
    };
    AB.renderSection = function (ref, el) {
        const r = typeof ref === "string" ? refOf(ref) : ref;
        const sec = AB.sections[r.id];
        if (!sec) return append(el, [h("div", { class: "ab-missing" }, "Unknown section " + r.id)]);
        renderRegion(el, sec.region, r, false);
    };

    // ---------- baselines: the frame at rest, used where a region's default section is not built ----------
    const fxl = () => AB.fx.datasets.lesmis;
    const OWNER = { left: "graph-place", right: "inspector-nothing-selected", canvas: "canvas-and-states", toolbar: "toolbar", dock: "table-dock" };

    const baseline = {
        left(el) {
            const L = fxl();
            const groups = L.frame.legend.rows.map((g) => ({ name: "Group " + g.label, kindIcon: "circle-dot", swatch: AB.chit(g.color, true), count: g.count, eye: true, go: ["inspector-group-set-path-row", "group-" + g.label], menu: ["context-menus", "row"] }));
            groups.push({ name: L.frame.legend.other.title, kindIcon: "circle-dot", swatch: AB.chit(L.frame.legend.other.color, true), count: L.frame.legend.other.count, eye: true, go: ["inspector-group-set-path-row", "other"], menu: ["context-menus", "row"] });
            const rows = [
                { name: "Selection", kindIcon: "scan", pinned: true, count: "Nothing selected", eye: true, go: ["inspector-selection-and-everything", "selection"] },
                { name: "Betweenness", kindIcon: "chart-column", swatch: AB.ramp(), eye: false, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
                { name: "Degree", kindIcon: "hash", swatch: AB.ramp("#cfcfcf", "#4d4d4d"), eye: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
                { name: "group", kindIcon: h("span", { class: "ab-abc" }, "Abc"), swatch: h("span", { class: "ab-multi" }, L.frame.legend.rows.slice(0, 3).map((g) => AB.chit(g.color, true))), count: "10 groups", eye: true, open: false, children: groups, go: ["inspector-run-row", "style"], menu: ["context-menus", "run-row"] },
                { name: "Everything", kindIcon: "square", pinned: true, eye: true, go: ["inspector-selection-and-everything", "everything"] },
            ];
            el.append(
                placeHead("Graph"),
                h("div", { class: "ab-switcher" }, h("span", Object.assign({ class: "ab-switch-btn", role: "button" }, act({ go: ["graphs-switcher", "open"] })), icon("network"), h("span", { class: "k-ellipsis" }, L.frame.graphRow), icon("chevron-down", "sm")), h("span", { class: "k-grow" }), h("span", { class: "k-secondary k-num" }, L.nodes + " nodes")),
                h("div", { class: "ab-treebar" }, AB.field("Find rows", { icon: "search", go: ["commands-and-search", "find"] }), AB.iconButton("list-filter", "List options", { go: ["graph-place", "list-menu"] }), AB.iconButton("zap", "Analyze", { go: ["analyze-popover", "open"] })),
                h("div", { class: "k-scroll" }, AB.tree(rows), AB.section({ title: "Views", count: 0, collapsed: true, actions: AB.iconButton("plus", "Save view...", { go: ["zoom-and-view-menu", "2d"] }) })),
            );
        },
        right(el) {
            const L = fxl(), f = L.frame;
            const max = Math.max(...f.degreeBars);
            el.append(
                AB.inspector({
                    icon: "network", title: f.graphRow, kind: "Graph", meta: f.project + ", " + f.file,
                    body: [
                        AB.section("Overview",
                            AB.data("Nodes", String(L.nodes)), AB.data("Edges", L.edges + " (undirected)"), AB.data("Density", String(L.stats.density)),
                            AB.data(f.componentsName, f.components), AB.data("Isolated nodes", String(L.stats.isolated)), AB.data("Average degree", String(L.stats.averageDegree)),
                            h("div", { class: "ab-bars", title: f.degreeLabel }, f.degreeBars.map((b) => h("span", { style: `height:${Math.max(1, (b / max) * 100)}%` }))),
                            h("div", { class: "ab-cap k-secondary" }, f.degreeName + ". " + f.degreeLabel + "."),
                            AB.data("Edge weight", "value", { go: ["inspector-attribute-and-filter-step", "attribute"] }),
                            AB.data("Attributes", String(f.attributes), { go: ["data-place", "attributes"] })),
                        AB.section("Layout", AB.data("Method", "Force-directed"), AB.data("Dimension", "2D", { go: ["toolbar", "view-mode"] }), h("div", { class: "ab-pad" }, AB.button("Re-run layout", { kind: "secondary", onClick: () => AB.flash("Layout re-run (not wired in the skeleton)") }))),
                        AB.section("Statistics", AB.data("Modularity of group", String(L.stats.modularityOfGroups), { go: ["inspector-run-row", "data"] })),
                        AB.section({ title: "Notes", count: 0, actions: AB.iconButton("plus", "Add note", { go: ["notes-place", "all"] }) }, h("div", { class: "ab-pad k-secondary" }, "No notes about this graph yet.")),
                    ],
                }),
            );
        },
        canvas(el) {
            const L = fxl(), f = L.frame, a = L.anchors.selected;
            const stage = h("div", { class: "k-stage" }, AB.drawing("lesmis-groups-rest", f.altSized));
            const hot = h("span", { class: "ab-hot", style: `left:${a.x}%;top:${a.y}%`, title: a.id + ": group 2, degree 36", "aria-label": a.id });
            AB.nav(hot, "inspector-node", "why-this-look");
            hot.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); go("context-menus", "node"); });
            stage.append(hot);
            const legend = h("div", { class: "k-legend-card ab-legend" },
                h("div", { class: "k-lg-title" }, "group"),
                f.legend.rows.map((r) => AB.nav(h("div", { class: "k-lg-row" }, AB.chit(r.color), r.label, h("span", { class: "k-value" }, r.count)), "inspector-group-set-path-row", "group-" + r.label)),
                AB.nav(h("div", { class: "k-lg-row" }, AB.chit(f.legend.other.color), "Other", h("span", { class: "k-value" }, f.legend.other.count)), "inspector-group-set-path-row", "other"),
                h("div", { class: "k-lg-sub" }, "Other: " + f.legend.other.title),
                AB.nav(h("div", { class: "k-lg-title ab-lg-size" }, "Size: Degree ", f.sizeMarks.map((m) => h("span", { class: "ab-dot", style: `width:${m.px / 2}px;height:${m.px / 2}px`, title: "degree " + m.degree }))), "inspector-measure-row", "style"),
            );
            const zoom = h("span", Object.assign({ id: "ab-zoom", class: "k-btn k-btn-ghost ab-zoom", role: "button" }, act({ go: ["zoom-and-view-menu", "2d"] })), "100%", icon("chevron-down", "sm"));
            const help = h("span", Object.assign({ class: "k-help", role: "button", "aria-label": "Keyboard shortcuts" }, act({ go: ["commands-and-search", "shortcuts"] })), icon("circle-help"));
            el.append(stage, legend, zoom, help);
            el.addEventListener("contextmenu", (e) => { e.preventDefault(); go("context-menus", "canvas"); });
        },
        toolbar(el) {
            const tool = (name, label, target, o) => h("span", Object.assign({ class: "k-tool k-tool-label", role: "button", "data-tool": label, "aria-pressed": o && o.pressed ? "true" : "false", title: label + (o && o.key ? " (" + o.key + ")" : "") }, act({ go: target })), icon(name, "lg"), h("span", { class: "ab-tlabel" }, label));
            const caret = (label, target) => h("span", Object.assign({ class: "k-tool-caret", role: "button", "aria-label": label, "aria-haspopup": "menu" }, act({ go: target })), icon("chevron-down", "sm"));
            el.append(h("div", { class: "k-toolbar", role: "toolbar", "aria-label": "Tools" },
                tool("mouse-pointer-2", "Select", ["toolbar", "at-rest"], { pressed: true, key: "V" }), caret("Pointer tools", ["toolbar", "pointer-flyout"]),
                tool("route", "Path", ["path-tool", "armed"], { key: "P" }),
                tool("flask-conical", "Analyze", ["analyze-popover", "open"], { key: "A" }),
                h("span", { class: "k-toolbar-sep" }),
                tool("zap", "Quick actions", ["commands-and-search", "quick-actions"], { key: "Ctrl+K" }),
                h("span", { class: "k-toolbar-sep" }),
                tool("square", "2D", ["toolbar", "view-mode"], { key: "5" }), caret("View mode", ["toolbar", "view-mode"]),
            ));
        },
        dock(el) {
            const L = fxl();
            const tab = (label, state, sel) => h("span", Object.assign({ class: "k-tab", role: "tab", "aria-selected": String(!!sel) }, act({ go: ["table-dock", state] })), label);
            const rows = L.topByDegree.slice(0, 12);
            el.append(
                h("div", { class: "k-dock-tabs" }, h("span", { role: "tablist", class: "ab-tablist" }, tab("Nodes", "nodes", true), tab("Edges", "edges")), h("span", { class: "k-grow" }), AB.iconButton("search", "Find in table", { go: ["commands-and-search", "find"] }), AB.iconButton("ellipsis", "Table options", { go: ["table-dock", "nodes"] }), AB.dockToggle()),
                h("div", { class: "k-scope" }, "Full graph: " + L.nodes + " nodes. Sorted by degree."),
                h("div", { class: "k-table-wrap" }, h("table", { class: "k-table" },
                    h("thead", null, h("tr", null, h("th", null, "label"), h("th", null, "group ", h("span", { class: "k-profile" }, "10 values")), h("th", { class: "k-n" }, "degree ", h("span", { class: "k-profile" }, "1 to " + L.stats.maxDegree)), h("th", { class: "k-n" }, "betweenness ", h("span", { class: "k-profile" }, "0 to 0.57")))),
                    h("tbody", null, rows.map((r) => AB.nav(h("tr", null, h("td", { class: "k-id" }, r.label), h("td", null, AB.chit(L.groupColors[r.group] || "#808080"), String(r.group)), h("td", { class: "k-n" }, r.degree), h("td", { class: "k-n" }, r.betweenness)), "inspector-node", "why-this-look"))),
                )),
            );
        },
    };
    function placeHead(title, actions) {
        return h("div", { class: "ab-place-head" }, h("span", { class: "k-strong" }, title), h("span", { class: "k-grow" }), actions || null);
    }
    AB.placeHead = placeHead;

    // ---------- region rendering ----------
    function banner(sec) {
        return h("div", { class: "ab-stub-banner" }, "Not built yet: " + sec.title);
    }
    function placeholder(el, region, sec, state) {
        const st = sec.states.find((s) => s.id === state);
        const msg = h("div", { class: "ab-pad k-secondary" }, (st ? "State: " + st.label + ". " : "") + "This section is not built yet.");
        if (region === "left") el.append(placeHead(sec.title), msg);
        else if (region === "right") el.append(AB.inspector({ icon: "info", title: sec.title, kind: "", tabs: { Style: () => msg.cloneNode(true), Data: () => msg.cloneNode(true) } }));
        else if (region === "overlay") el.append(AB.popover({ title: sec.title, body: msg, place: "center" }));
        else el.append(h("div", { class: "ab-stub-card" }, h("div", { class: "k-strong" }, sec.title), msg, AB.link(route.closeTo.id, route.closeTo.state, "Back to the graph")));
    }
    function renderRegion(el, region, ref, isCurrent) {
        const sec = AB.sections[ref.id];
        if (!sec) { el.append(h("div", { class: "ab-stub-card" }, "Unknown section: " + ref.id)); return; }
        const state = ref.state || sec.states[0].id;
        if (typeof sec.render === "function") {
            try {
                sec.render(el, state, { state, region, section: sec, fx: AB.fx, renderSection: AB.renderSection, close: AB.close });
            } catch (err) {
                console.error(err);
                el.append(h("div", { class: "ab-stub-card" }, h("div", { class: "k-strong k-danger" }, sec.title + " failed to render"), h("pre", { class: "k-mono" }, String(err && err.stack || err))));
            }
            return;
        }
        // stub
        if (OWNER[region] === sec.id || (region === "toolbar" || region === "canvas" || region === "dock")) {
            if (baseline[region]) baseline[region](el);
            if (isCurrent) {
                if (region === "left" || region === "right") el.prepend(banner(sec));
                else if (region === "toolbar") el.prepend(h("div", { class: "k-secondary-bar" }, banner(sec)));
                else el.append(banner(sec));
            }
            return;
        }
        placeholder(el, region, sec, state);
    }

    // ---------- the page ----------
    const $ = (id) => document.getElementById(id);

    function railButton(key) {
        const [label, ic, target] = PLACES[key];
        return h("div", Object.assign({ class: "k-rail-btn", role: "button", "aria-pressed": String(route.rail === key), "data-place": key }, act({ go: [target] })), h("span", { class: "k-rail-pill" }, icon(ic)), label);
    }
    function renderRail(el) {
        el.append(
            h("div", Object.assign({ id: "ab-rail-menu", class: "k-rail-btn", role: "button", "aria-label": "Main menu", title: "Main menu" }, act({ go: ["main-menu", "file"] })), h("span", { class: "k-rail-pill" }, icon("menu"))),
            h("div", { class: "k-rail-sep" }),
            railButton("graph"), railButton("data"), railButton("notes"), railButton("assistant"),
        );
    }
    function renderTop(el) {
        const D = AB.fx.datasets[route.frame.dataset] || fxl();
        el.append(
            h("span", Object.assign({ id: "ab-project", class: "ab-project", role: "button", "aria-haspopup": "menu" }, act({ go: ["project-menu", "open"] })), h("span", { class: "k-ellipsis" }, D.frame.project), icon("chevron-down", "sm")),
            h("span", Object.assign({ class: "ab-privacy", role: "link" }, act({ go: ["data-place", "sent-and-saved"] })), icon("lock", "sm"), "Local only"),
            h("span", Object.assign({ id: "ab-filter", class: "k-chip k-chip-btn", role: "button", title: "Filters: what the graph is computed and drawn on" }, act({ go: ["data-place", "filters"] })), icon("funnel", "sm"), route.frame.chip, h("span", { class: "k-caret" }, icon("chevron-down", "sm"))),
            h("span", { class: "k-grow" }),
            AB.iconButton("undo-2", "Undo (Ctrl+Z)", { onClick: () => AB.flash("Nothing to undo") }),
            AB.iconButton("redo-2", "Redo (Ctrl+Shift+Z)", { onClick: () => AB.flash("Nothing to redo") }),
        );
    }
    function renderReview(el, sec, state) {
        const place = PLACES[route.rail] ? PLACES[route.rail][0] : "";
        const st = sec.states.find((s) => s.id === state) || sec.states[0];
        const crumbs = [place && route.frame.full == null ? AB.link(PLACES[route.rail][2], null, place) : null, REGION_LABEL[sec.region] || sec.region, h("b", null, sec.title), sec.states.length > 1 ? st.label : null].filter(Boolean);
        const bc = h("span", { class: "ab-crumbs" }, h("span", { class: "ab-rv-label" }, "Where am I:"));
        crumbs.forEach((c, i) => { if (i) bc.append(h("span", { class: "ab-sep" }, ">")); bc.append(c); });
        const states = h("span", { class: "ab-states" }, sec.states.length > 1 ? [h("span", { class: "ab-rv-label" }, "States:"), sec.states.map((s) => h("a", { href: href(sec.id, s.id), class: "ab-state", "aria-current": s.id === st.id ? "true" : null }, s.label))] : null);
        el.append(
            h("a", { href: "#/map", class: "ab-rv-title", title: "Site map" }, "Refined B skeleton"),
            bc, states, h("span", { class: "k-grow" }),
            h("a", { href: "#/map", class: "ab-rv-btn" }, "Site map"),
            h("span", { class: "ab-rv-btn", role: "button", tabindex: "0", on: { click: () => { setTheme(currentTheme() === "dark" ? "light" : "dark"); } } }, icon(currentTheme() === "dark" ? "sun" : "moon", "sm"), currentTheme() === "dark" ? "Light" : "Dark"),
            h("a", { href: "../index.html", class: "ab-rv-btn" }, "Gallery"),
        );
    }

    function renderMap() {
        document.body.dataset.page = "map";
        const main = $("ab-page");
        main.replaceChildren();
        const byRegion = {};
        AB.order.forEach((id) => { const s = AB.sections[id]; if (s) (byRegion[s.region] = byRegion[s.region] || []).push(s); });
        const order = ["full", "left", "right", "canvas", "toolbar", "dock", "overlay", "workspace"];
        main.append(h("h1", { class: "ab-map-h1" }, "Refined B skeleton: every section"),
            h("p", { class: "k-secondary ab-map-lede" }, "Click a section to open it inside the app frame; each state below it opens that state." + (AB.order.some((id) => AB.sections[id] && typeof AB.sections[id].render !== "function") ? " Sections marked \"not built yet\" show the frame at rest with a placeholder." : "")),
            h("p", { class: "k-secondary ab-map-lede" }, "Two data sets: the Graph place, Notes and most inspectors show Les Miserables; the Data place, the Path tool, version history and the many-groups states show the card and transfer data. The project name at the top left says which one is open, and the canvas, inspector and table follow it."));
        order.filter((r) => byRegion[r]).forEach((r) => {
            main.append(h("h2", { class: "ab-map-h2" }, REGION_LABEL[r] || r));
            const ul = h("ul", { class: "ab-map-list" });
            byRegion[r].forEach((s) => ul.append(h("li", null, h("a", { href: href(s.id), class: "ab-map-link" }, s.title), typeof s.render === "function" ? null : h("span", { class: "ab-map-stub" }, "not built yet"), h("span", { class: "ab-map-states" }, s.states.map((st) => h("a", { href: href(s.id, st.id) }, st.label))))));
            main.append(ul);
        });
        const rv = $("ab-review");
        rv.replaceChildren(h("a", { href: "#/map", class: "ab-rv-title" }, "Refined B skeleton"), h("span", { class: "ab-crumbs" }, h("span", { class: "ab-rv-label" }, "Where am I:"), h("b", null, "Site map")), h("span", { class: "k-grow" }), h("a", { href: "#/graph-place", class: "ab-rv-btn" }, "Open the app"), h("span", { class: "ab-rv-btn", role: "button", tabindex: "0", on: { click: () => { setTheme(currentTheme() === "dark" ? "light" : "dark"); renderMap(); } } }, currentTheme() === "dark" ? "Light" : "Dark"), h("a", { href: "../index.html", class: "ab-rv-btn" }, "Gallery"));
    }

    function render() {
        const p = parse();
        if (p.id === "map") return renderMap();
        document.body.dataset.page = "app";
        let sec = AB.sections[p.id];
        if (!sec) { location.replace("#/map"); return; }
        const state = p.state || sec.states[0].id;
        const frameOf = (s, st) => (typeof s.frame === "function" ? s.frame(st) : s.frame) || {};
        const extra = frameOf(sec, state);
        const frame = Object.assign({}, DEFAULT_FRAME, extra);
        frame[sec.region] = sec.id + "/" + state;
        const leftRef = refOf(frame.left);
        const leftSec = leftRef && AB.sections[leftRef.id];
        // The dataset and the filter chip follow the section, or else the left panel beside it:
        // a transfers place (Data, the Path tool) brings the transfers canvas, inspector and table.
        const leftExtra = leftSec && leftSec !== sec ? frameOf(leftSec, leftRef.state || leftSec.states[0].id) : {};
        frame.dataset = extra.dataset || leftExtra.dataset || "lesmis";
        frame.chip = extra.chip || leftExtra.chip || "Full graph";
        if (frame.dataset !== "lesmis") Object.entries(DATASET_FRAME[frame.dataset] || {}).forEach(([r, v]) => { if (!(r in extra) && sec.region !== r) frame[r] = v; });
        const railKey = sec.rail || (leftSec && leftSec.rail) || "graph";
        let closeTo = sec.closeTo ? refOf(sec.closeTo) : frame.full && sec.region !== "full" ? refOf(frame.full) : leftRef && leftRef.id !== sec.id ? leftRef : { id: PLACES[railKey][2], state: null };
        route = { id: sec.id, state, sec, frame, rail: railKey, closeTo };
        AB.route = route; // sections read route.frame to agree with their neighbors (the tree marks the row the inspector shows)

        const app = $("ab-app");
        app.dataset.full = frame.full ? "true" : "false";
        app.dataset.workspace = frame.workspace ? "true" : "false";
        app.dataset.left = frame.left ? "open" : "closed";
        app.dataset.right = frame.right ? "open" : "closed";
        $("ab-main").dataset.dock = !frame.dock ? "none" : shell.dock;

        const fill = (id, region) => {
            const el = $(id);
            el.replaceChildren();
            const ref = refOf(frame[region]);
            el.hidden = !ref;
            if (ref) renderRegion(el, region, ref, ref.id === sec.id);
        };
        $("ab-review").replaceChildren();
        renderReview($("ab-review"), sec, state);
        $("ab-top").replaceChildren();
        $("ab-top").hidden = !frame.top || !!frame.full;
        if (frame.top) renderTop($("ab-top"));
        $("ab-rail").replaceChildren();
        $("ab-rail").hidden = !frame.rail;
        if (frame.rail) renderRail($("ab-rail"));
        ["left", "right", "canvas", "toolbar", "dock", "workspace", "full", "overlay"].forEach((r) => fill("ab-" + r, r));
        // An overlay section that draws nothing (a "closed" state, a rename in place) lets clicks through
        $("ab-overlay").dataset.active = frame.overlay && $("ab-overlay").childElementCount ? "true" : "false";
        // move focus into an opened overlay, or back to the page
        const first = $("ab-overlay").querySelector("[tabindex='0'], input, .k-menu-item");
        if (first && frame.overlay) setTimeout(() => first.focus && first.focus(), 0);
    }
    AB.render = render;

    // ---------- keys and clicks the shell owns ----------
    document.addEventListener("keydown", (e) => {
        const t = e.target;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        if (e.key === "Escape" && route && route.id !== route.closeTo.id) { e.preventDefault(); AB.close(); }
        else if (e.key === "T" && e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); AB.toggleDock(); }
    });
    document.addEventListener("DOMContentLoaded", () => {
        $("ab-overlay").addEventListener("click", (e) => { if (e.target === $("ab-overlay") || e.target.classList.contains("ab-modal-wrap")) AB.close(); });
        matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
        new MutationObserver(() => route && document.body.dataset.page === "app" && renderReview(($("ab-review").replaceChildren(), $("ab-review")), route.sec, route.state)).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        boot();
    });
    window.addEventListener("hashchange", () => AB.fx && render());

    // ---------- boot: fixtures, then every section file in the manifest, in order ----------
    async function boot() {
        try {
            const [fx, manifest] = await Promise.all([fetch("kit/fixtures.json").then((r) => r.json()), fetch("sections/manifest.json").then((r) => r.json())]);
            AB.fx = fx;
            AB.order = manifest;
            await Promise.all(manifest.map((id) => new Promise((res) => {
                const s = document.createElement("script");
                s.src = "sections/" + id + ".js";
                s.onload = res;
                s.onerror = () => { console.error("Could not load sections/" + id + ".js"); res(); };
                document.head.append(s);
            })));
            manifest.forEach((id) => { if (!AB.sections[id]) registerSection({ id, title: id, region: "overlay" }); });
            render();
        } catch (err) {
            document.body.replaceChildren(h("pre", { class: "ab-pad" }, "The skeleton needs to be served over HTTP (it fetches its fixtures and section files).\n" + err));
        }
    }
})();
