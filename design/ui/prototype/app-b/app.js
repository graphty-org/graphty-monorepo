/* Refined B skeleton: the shell. Hash routing, the persistent frame, the section loader,
   the "Where am I" line and the site map. Section files never edit this file. Plain ASCII. */
(function () {
    "use strict";
    const AB = window.AB;
    const { h, icon, go, href, act, append } = AB;

    // Which section stands in for each frame region when the route does not name one.
    const DEFAULT_FRAME = { mode: "3d", top: true, rail: true, left: "graph-place", right: "inspector-nothing-selected", canvas: "canvas-and-states", toolbar: "toolbar", dock: "table-dock", overlay: null, workspace: null, full: null };
    const REGION_LABEL = { left: "Left panel", right: "Inspector", canvas: "Canvas", toolbar: "Toolbar", dock: "Table dock", overlay: "Menu or dialog", workspace: "Full canvas", full: "Whole window" };
    // What the frame's other regions show when the section works on the transfers data, not Les Miserables
    const DATASET_FRAME = { transactions: { canvas: "canvas-and-states/transfers", right: "inspector-nothing-selected/transfers", dock: "table-dock/transfers" } };
    const PLACES = { graph: ["Graph", "network", "graph-place"], data: ["Data", "database", "data-place"], views: ["Views", "bookmark", "views-place"], notes: ["Notes", "sticky-note", "notes-place"], assistant: ["Assistant", "bot", "assistant-place"] };

    // ---------- persistent viewer conveniences (never required) ----------
    const store = {
        get(k) { try { return localStorage.getItem("ab." + k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem("ab." + k, v); } catch (e) { /* private window: fine */ } },
    };
    // The table dock starts closed at rest; counts, "Show in table" and Shift+T open it
    const shell = { dock: store.get("dock") || "closed", panels: "shown" };
    AB.store = store; // Settings > Appearance writes "toolbarLabels" (auto, always, never)

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
    // Review only: "Design notes" (open questions and "needs graphty-element" marks) can be hidden for the persona build
    const notesHidden = () => store.get("designNotes") === "hidden";
    const applyNotes = () => document.documentElement.toggleAttribute("data-design-notes-hidden", notesHidden());
    applyNotes();

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
    let prevLeft = null;
    // Focus goes back to the control that opened an overlay when the overlay closes
    let opener = null;
    let closedOverlay = null; // the overlay section open before this render
    // The control that opens an overlay section: any element whose target is that section
    function refocusOpener(id) {
        if (!id || (document.activeElement && document.activeElement !== document.body)) return;
        const el = document.querySelector(`[data-nav^="#/${id}"]`) || (id === "camera-menu" && document.getElementById("ab-zoom")) || (id === "project-menu" && document.getElementById("ab-project")) || (id === "main-menu" && document.getElementById("ab-rail-menu"));
        if (el) el.focus();
    }
    const describe = (el) => el && el !== document.body ? { id: el.id || null, nav: el.dataset && el.dataset.nav || null, label: el.getAttribute("aria-label"), row: el.closest && el.closest("[data-row]") && el.closest("[data-row]").dataset.row } : null;
    function refocus(d) {
        if (!d) return false;
        const q = (sel) => { try { return document.querySelector(sel); } catch (e) { return null; } };
        const el = (d.id && document.getElementById(d.id)) || (d.row && q(`#ab-left [data-row="${d.row}"]`)) || (d.nav && q(`[data-nav="${d.nav}"]`)) || (d.label && q(`[aria-label="${d.label}"]`));
        if (el) el.focus();
        return !!el;
    }

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
                { name: "Selection", kindIcon: "scan", pinned: true, builtin: true, count: "Nothing selected", eye: true, go: ["inspector-selection-and-everything", "selection"] },
                { name: "Notes", kindIcon: "message-square", pinned: true, builtin: true, count: "2 nodes", eye: true, go: ["inspector-selection-and-everything", "notes"], menu: ["context-menus", "notes-row"] },
                { name: "Betweenness", kindIcon: "chart-column", swatch: AB.ramp(), eye: false, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
                { name: "Degree", kindIcon: "hash", swatch: AB.ramp("#cfcfcf", "#4d4d4d"), eye: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
                { name: "group", kindIcon: h("span", { class: "ab-abc" }, "Abc"), swatch: h("span", { class: "ab-multi" }, L.frame.legend.rows.slice(0, 3).map((g) => AB.chit(g.color, true))), count: "10 groups", eye: true, open: false, children: groups, go: ["inspector-run-row", "style"], menu: ["context-menus", "run-row"] },
                { name: "Everything", kindIcon: "square-filled", pinned: true, builtin: true, eye: true, go: ["inspector-selection-and-everything", "everything"] },
            ];
            el.append(
                placeHead("Graph"),
                h("div", { class: "ab-switcher" }, h("span", Object.assign({ class: "ab-switch-btn", role: "button" }, act({ go: ["graphs-switcher", "open"] })), icon("network"), h("span", { class: "k-ellipsis" }, L.frame.graphRow), icon("chevron-down", "sm")), h("span", { class: "k-grow" }), h("span", { class: "k-secondary k-num" }, L.nodes + " nodes")),
                h("div", { class: "ab-treebar" }, AB.field("Find rows", { icon: "search", go: ["commands-and-search", "find"] }), AB.iconButton("list-filter", "List options", { go: ["graph-place", "list-menu"] })),
                h("div", { class: "k-scroll" }, AB.tree(rows)),
            );
        },
        right(el) {
            const L = fxl(), f = L.frame;
            const max = Math.max(...f.degreeBars);
            el.append(
                AB.inspector({
                    icon: "network", title: f.graphRow, kind: "Graph", provenance: [f.file, "data-place", "sources-menu"], menu: ["context-menus", "canvas"],
                    body: [
                        AB.section({ title: "Overview", collapsible: true, key: "graph.overview" },
                            AB.data("Nodes", String(L.nodes)), AB.data("Edges", L.edges + " (undirected)"), AB.data("Density", String(L.stats.density)),
                            AB.data(f.componentsName, f.components), AB.data("Isolated nodes", String(L.stats.isolated)), AB.data("Average degree", String(L.stats.averageDegree)),
                            h("div", { class: "ab-bars", title: f.degreeLabel }, f.degreeBars.map((b) => h("span", { style: `height:${Math.max(1, (b / max) * 100)}%` }))),
                            h("div", { class: "ab-cap k-secondary" }, f.degreeName + ". " + f.degreeLabel + "."),
                            AB.data("Edge weight", "value", { go: ["inspector-attribute-and-filter-step", "attribute"] }),
                            AB.data("Attributes", String(f.attributes), { go: ["data-place", "attributes"] })),
                        AB.section({ title: "Statistics", collapsible: true, key: "graph.statistics" }, AB.data("Modularity of group", String(L.stats.modularityOfGroups), { go: ["inspector-run-row", "data"] })),
                        AB.section({ title: "Layout", collapsible: true, key: "graph.layout", summary: "Force-directed" }, AB.data("Method", "Force-directed")),
                        AB.section({ title: "Canvas", collapsible: true, key: "graph.canvas", summary: "Default background, overlapping labels shown" },
                            h("div", { class: "ab-cap k-secondary" }, "graphty-element settings, not a layer."),
                            AB.data("Background", "Default"), AB.data("Hide overlapping labels", "Off"), AB.data("Reframe when data changes", "On")),
                        AB.notesSection(0, ["notes-place", "about-graph"]),
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
            legend.prepend(h("span", { class: "ab-legend-x" }, AB.legendClose(legend)));
            const corner = h("div", { class: "ab-canvas-corner" }, AB.layoutChip("running"), AB.cameraFace());
            const help = h("span", Object.assign({ class: "k-help", role: "button", "aria-label": "Keyboard shortcuts" }, act({ go: ["commands-and-search", "shortcuts"] })), icon("circle-help"));
            el.append(stage, legend, corner, help);
            el.addEventListener("contextmenu", (e) => { e.preventDefault(); go("context-menus", "canvas"); });
        },
        toolbar(el) {
            const C = AB.COMMANDS;
            const tool = (name, c, o) => h("span", Object.assign({ class: "k-tool k-tool-label", role: "button", "data-tool": o && o.tool || c.label.replace(/\.+$/, ""), "aria-pressed": o && o.pressed ? "true" : "false", title: c.label.replace(/\.+$/, "") + (c.shortcut ? " (" + c.shortcut + ")" : "") }, act({ go: c.go })), icon(name, "lg"), h("span", { class: "ab-tlabel" }, o && o.face || c.label.replace(/\.+$/, "")));
            const caret = (label, target) => h("span", Object.assign({ class: "k-tool-caret", role: "button", "aria-label": label, "aria-haspopup": "menu" }, act({ go: target })), icon("chevron-down", "sm"));
            const mode = (AB.route && AB.route.frame.mode) || "3d";
            el.append(h("div", { class: "k-toolbar", role: "toolbar", "aria-label": "Tools" },
                tool("mouse-pointer-2", C.select, { pressed: true }),
                tool("flask-conical", C.analyze),
                h("span", { class: "k-toolbar-sep" }),
                tool("zap", C["quick-actions"]),
                h("span", { class: "k-toolbar-sep" }),
                tool(mode === "2d" ? "square" : "box", C["view-mode"], { face: mode === "2d" ? "2D" : "3D", tool: "View mode" }), caret("View mode", ["toolbar", "view-mode"]),
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
        return h("div", { class: "ab-place-head" }, h("h2", { class: "k-strong ab-place-title", tabindex: "-1" }, title), h("span", { class: "k-grow" }), actions || null);
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
            railButton("graph"), railButton("data"), railButton("views"), railButton("notes"), railButton("assistant"),
        );
    }
    function renderTop(el) {
        const D = AB.fx.datasets[route.frame.dataset] || fxl();
        el.append(
            h("h1", { class: "ab-h1" }, h("span", Object.assign({ id: "ab-project", class: "ab-project", role: "button", "aria-haspopup": "menu" }, act({ go: ["project-menu", "open"] })), h("span", { class: "k-ellipsis" }, D.frame.project), icon("chevron-down", "sm"))),
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
        // Review bar first in the DOM: one link past it, so a keyboard walk starts in the app
        el.append(h("a", { href: "#", class: "ab-rv-btn ab-skip", on: { click: (e) => { e.preventDefault(); const t = document.querySelector("#ab-rail [tabindex='0']"); if (t) t.focus(); } } }, "Skip to app"));
        crumbs.forEach((c, i) => { if (i) bc.append(h("span", { class: "ab-sep" }, ">")); bc.append(c); });
        const states = h("span", { class: "ab-states" }, sec.states.length > 1 ? [h("span", { class: "ab-rv-label" }, "States:"), sec.states.map((s) => h("a", { href: href(sec.id, s.id), class: "ab-state", "aria-current": s.id === st.id ? "true" : null }, s.label))] : null);
        el.append(
            h("a", { href: "#/map", class: "ab-rv-title", title: "Site map" }, "Refined B skeleton"),
            bc, states, h("span", { class: "k-grow" }),
            h("a", { href: "#/map", class: "ab-rv-btn" }, "Site map"),
            h("span", { class: "ab-rv-btn", role: "button", tabindex: "0", on: { click: () => { setTheme(currentTheme() === "dark" ? "light" : "dark"); } } }, icon(currentTheme() === "dark" ? "sun" : "moon", "sm"), currentTheme() === "dark" ? "Light" : "Dark"),
            h("span", { class: "ab-rv-btn", role: "switch", tabindex: "0", "aria-checked": String(notesHidden()), title: "Hide open questions and needs graphty-element marks (the persona build)", on: { click: () => { store.set("designNotes", notesHidden() ? "" : "hidden"); applyNotes(); renderReview(($("ab-review").replaceChildren(), $("ab-review")), route.sec, route.state); } } }, notesHidden() ? "Show design notes" : "Hide design notes"),
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
            h("p", { class: "ab-map-lede" }, h("a", { href: "START-HERE.html" }, "Start here: answers to the owner's eleven questions, with links into the skeleton")),
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
        // The rail lights the place the left panel shows; a section with no left panel names its own.
        const railKey = (sec.region !== "left" && leftSec && leftSec.rail) || sec.rail || "graph";
        let closeTo = sec.closeTo ? refOf(sec.closeTo) : frame.full && sec.region !== "full" ? refOf(frame.full) : leftRef && leftRef.id !== sec.id ? leftRef : { id: PLACES[railKey][2], state: null };
        const hadOverlay = !!(route && route.frame.overlay);
        const hadFocus = describe(document.activeElement);
        const prevId = route && route.id;
        const focusTool = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.tool;
        if (frame.overlay && !hadOverlay) opener = describe(document.activeElement);
        route = { id: sec.id, state, sec, frame, rail: railKey, closeTo };
        // A notice belongs to the screen that raised it
        document.querySelectorAll(".ab-flash, .gp-offer").forEach((f) => f.remove());
        AB.route = route; // sections read route.frame to agree with their neighbors (the tree marks the row the inspector shows)

        const app = $("ab-app");
        app.dataset.full = frame.full ? "true" : "false";
        app.dataset.workspace = frame.workspace ? "true" : "false";
        app.dataset.left = frame.left && shell.panels === "shown" ? "open" : "closed";
        app.dataset.right = frame.right && shell.panels === "shown" ? "open" : "closed";
        $("ab-main").dataset.dock = !frame.dock ? "none" : shell.dock;

        const keepLeft = AB.keepLeft && prevLeft && leftRef && prevLeft.id === leftRef.id;
        AB.keepLeft = false;
        prevLeft = leftRef;
        const fill = (id, region) => {
            if (region === "left" && keepLeft) return;
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
        $("ab-toolbar").dataset.labels = store.get("toolbarLabels") || "auto";
        ["left", "right", "canvas", "toolbar", "dock", "workspace", "full", "overlay"].forEach((r) => fill("ab-" + r, r));
        // An overlay section that draws nothing (a "closed" state, a rename in place) lets clicks through.
        // Some overlays draw a frame later (they wait for the regions' boxes), so check again then.
        const setActive = () => { $("ab-overlay").dataset.active = frame.overlay && $("ab-overlay").childElementCount ? "true" : "false"; };
        setActive();
        requestAnimationFrame(() => requestAnimationFrame(() => { if (route && route.frame === frame) setActive(); }));
        // move focus into an opened overlay, or back to the control that opened it
        const first = $("ab-overlay").querySelector("[data-autofocus], [aria-modal='true'] .k-modal-body :is([tabindex='0'], input, select, textarea), [tabindex='0']:not([aria-label='Close']), input, .k-menu-item");
        // Menus are placed (and made visible) a frame later, and a hidden element cannot take focus
        if (first && frame.overlay) requestAnimationFrame(() => requestAnimationFrame(() => { if (first.isConnected && !$("ab-overlay").contains(document.activeElement)) first.focus(); }));
        if (hadOverlay && !frame.overlay) {
            // No remembered opener (a direct link): fall back to the control that opens this overlay
            const was = closedOverlay;
            const d = opener;
            opener = null;
            setTimeout(() => refocus(d) || refocusOpener(was), 0);
        }
        closedOverlay = frame.overlay ? refOf(frame.overlay).id : null;
        // A modal dialog makes the app behind it inert (menus and popovers do not)
        const setInert = () => {
            const modal = !!$("ab-overlay").querySelector("[aria-modal='true'], .ab-modal-wrap");
            ["ab-top", "ab-rail", "ab-left", "ab-main", "ab-right", "ab-workspace", "ab-full"].forEach((id) => { const r = $(id); if (r) r.inert = modal && !r.contains($("ab-overlay")); });
        };
        setInert();
        requestAnimationFrame(setInert);
        // Focus was lost to the redraw (a toolbar toggle, a direct link): put it back where it was,
        // or on the place's heading, never on the page body
        if (!frame.overlay && !hadOverlay) setTimeout(() => {
            if (document.activeElement && document.activeElement !== document.body) return;
            const tool = focusTool && document.querySelector(`[data-tool="${focusTool}"]`);
            if (tool) return tool.focus();
            if (refocus(hadFocus)) return;
            // Back from a full-screen mode or another place: the control that opened it
            const prevSec = prevId && AB.sections[prevId];
            const opener2 = prevSec && prevId !== sec.id && (prevSec.region === "full" || prevSec.region === "workspace") && document.querySelector(`[data-nav^="#/${prevId}"]`);
            if (opener2 && opener2.offsetParent !== null) return opener2.focus();
            const head = document.querySelector("#ab-left:not([hidden]) .ab-place-title") || document.querySelector("#ab-right .ab-insp-head .k-name");
            if (head) head.focus({ preventScroll: true });
        }, 0);
        // An overlay that places itself a frame later: focus its first item then
        if (frame.overlay && !first) setTimeout(() => { const f = $("ab-overlay").querySelector(".k-menu-item:not([aria-disabled='true']), [tabindex='0'], input"); if (f && !$("ab-overlay").contains(document.activeElement)) f.focus(); }, 50);
    }
    AB.render = render;

    // ---------- keys and clicks the shell owns ----------
    document.addEventListener("keydown", (e) => {
        const t = e.target;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        const mod = e.ctrlKey || e.metaKey;
        const free = (t === document.body || (t && t.closest && t.closest("#ab-canvas"))) && store.get("singleKeys") !== "off";
        // App keys never use W, A, S, D, Q, E, the arrows, = or -: graphty-element's canvas keys.
        // F2 (rename) belongs to the tree and the inspector header.
        const keys = [
            [() => mod && !e.shiftKey && e.key === ",", () => go("settings", "you")],
            [() => mod && !e.shiftKey && (e.key === "k" || e.key === "K"), () => go("commands-and-search", "quick-actions")],
            [() => mod && !e.shiftKey && (e.key === "b" || e.key === "B"), () => { shell.panels = shell.panels === "shown" ? "hidden" : "shown"; render(); AB.announce(shell.panels === "shown" ? "Panels shown" : "Panels hidden. Ctrl+B shows them"); }],
            [() => free && !mod && e.shiftKey && (e.key === "A" || e.key === "a"), () => go("analyze-popover", "open")],
            [() => free && !mod && !e.shiftKey && !e.altKey && (e.key === "p" || e.key === "P"), () => go("path-tool", "armed")],
            [() => free && !mod && e.key === "?", () => go("commands-and-search", "shortcuts")],
            [() => free && !mod && !e.altKey && e.key === "5", () => { const b = document.querySelector('[data-tool="View mode"]'); if (b) { b.classList.add("ab-pulse"); setTimeout(() => b.classList.remove("ab-pulse"), 900); } AB.flash("View mode switches 2D and 3D (not wired in the skeleton)"); }],
            [() => free && !mod && e.shiftKey && e.key === "T", () => AB.toggleDock()],
        ];
        // F6 / Shift+F6: move between regions in their visual order (spec 3.8)
        if (e.key === "F6" && !mod) {
            e.preventDefault();
            const order = ["ab-rail", "ab-left", "ab-canvas", "ab-toolbar", "ab-dock", "ab-right"].map($).filter((r) => r && !r.hidden && r.offsetParent !== null);
            const cur = order.findIndex((r) => r.contains(document.activeElement));
            const next = order[(cur + (e.shiftKey ? -1 : 1) + order.length) % order.length];
            const target = next && (next.querySelector("[tabindex='0'], a[href], input") || next);
            if (target) { if (!target.hasAttribute("tabindex") && !/^(A|INPUT)$/.test(target.tagName)) target.tabIndex = -1; target.focus(); }
            return;
        }
        const hit = keys.find(([test]) => test());
        if (hit) { e.preventDefault(); hit[1](); }
        else if (e.key === "Escape" && route && route.id !== route.closeTo.id) { e.preventDefault(); AB.close(); }
    });
    document.addEventListener("DOMContentLoaded", () => {
        // A click on empty canvas clears the selection: back to the place at rest (nothing selected)
        $("ab-canvas").addEventListener("click", (e) => {
            const t = e.target;
            if (!route || t.closest(".pt-picking") || route.id === "path-tool" || !(t.classList.contains("k-stage") || t.classList.contains("k-canvas") || (t.tagName === "IMG" && t.closest(".k-stage")))) return;
            const place = PLACES[route.rail] ? PLACES[route.rail][2] : "graph-place";
            if (route.frame.right && refOf(route.frame.right).id !== "inspector-nothing-selected" || route.id !== place) go(place);
        });
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
