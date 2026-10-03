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
    const DATASET_FRAME = {
        transactions: { canvas: "canvas-and-states/transfers", right: "inspector-nothing-selected/transfers", dock: "table-dock/transfers" },
        doorEntries: { canvas: "canvas-and-states/door-entries", right: "inspector-nothing-selected/door-entries", dock: "table-dock/door-entries" },
        // The wide, nested and plain JSON projects share three routes, each drawn for AB.route.frame.dataset
        wide: { canvas: "canvas-and-states/hosts", right: "inspector-nothing-selected/wide", dock: "table-dock/wide" },
        nested: { canvas: "canvas-and-states/hosts", right: "inspector-nothing-selected/wide", dock: "table-dock/wide" },
        plainJson: { canvas: "canvas-and-states/hosts", right: "inspector-nothing-selected/wide", dock: "table-dock/wide" },
        registry: { canvas: "canvas-and-states/registry", right: "inspector-nothing-selected/registry", dock: false },
        // Two graph-file samples opened bare: the plain drawing, the overview, no table (no rows in the fixtures)
        karate: { canvas: "canvas-and-states/karate", right: "inspector-nothing-selected/karate", dock: false },
        ppi: { canvas: "canvas-and-states/ppi", right: "inspector-nothing-selected/ppi", dock: false },
    };
    // A just-loaded project has no saved views; the door entries have their own notes
    const RAIL_STATE = {
        lesmis: { data: "graph-file" },
        doorEntries: { graph: "door-entries", data: "door-entries", notes: "door-entries", views: "empty" },
        transactions: { graph: "many-groups", views: "empty" },
        wide: { graph: "wide", data: "attributes-wide", views: "empty", notes: "empty" },
        nested: { graph: "nested", data: "attributes-nested", views: "empty", notes: "empty" },
        plainJson: { graph: "plain-json", data: "plain-json", views: "empty", notes: "empty" },
        registry: { graph: "registry", data: "registry", views: "empty", notes: "empty" },
        karate: { graph: "karate", views: "empty", notes: "empty" },
        ppi: { graph: "ppi", views: "empty", notes: "empty" },
    };
    // The filter chip has one wording, written by AB.count: "60 of 77 nodes". A section's chip that
    // counts ("Filtered: 60 of 77 nodes", "812 of 3,000 nodes") is rewritten to it; any other text
    // ("Full graph", "Filtered: neighbors of X", where the fixtures hold no count) stays as given.
    function chipWording(chip) {
        const m = typeof chip === "string" && chip.match(/^(?:Filtered:\s*)?([\d,]+) of ([\d,]+) (\w+?)s?$/);
        return m ? AB.count(Number(m[1].replace(/,/g, "")), m[3], { of: Number(m[2].replace(/,/g, "")) }) : chip;
    }
    // The selection bar is raised in one place: a frame whose inspector shows elements gets the bar
    // for them unless the route names its own toolbar (section frames never set it themselves)
    function selectionBarFor(right) {
        const r = refOf(right);
        if (!r) return null;
        if (r.id === "inspector-node") return "selection-bar/one-node";
        if (r.id === "inspector-edge") return "selection-bar/one-edge";
        if (r.id === "inspector-several-elements") return r.state === "style" || r.state === "data" ? "selection-bar/five-nodes" : "selection-bar/two-nodes";
        return null;
    }
    const REGION_HEADING = { "ab-rail": "Places", "ab-left": "Left panel", "ab-canvas": "Graph drawing", "ab-toolbar": "Canvas toolbar", "ab-dock": "Table", "ab-right": "Inspector" };
    const PLACES = { graph: ["Graph", "network", "graph-place"], data: ["Data", "database", "data-place"], views: ["Views", "bookmark", "views-place"], notes: ["Notes", "message-square", "notes-place"], assistant: ["Assistant", "bot", "assistant-place"] };

    // ---------- persistent viewer conveniences (never required) ----------
    const store = {
        get(k) { try { return localStorage.getItem("ab." + k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem("ab." + k, v); } catch (e) { /* private window: fine */ } },
    };
    // The table dock starts closed at rest; counts, "Show in table" and Shift+T open it
    // mode: the view mode key 5 chose ("2d" or "3d"), over every frame until a route that names its own mode opens
    const shell = { dock: store.get("dock") || "closed", panels: "shown", mode: null };
    const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    AB.store = store;
    // Usage data (the owner's telemetry decision): off until the reader opts in, for this page view.
    // The header's privacy chip reads it; Settings > Privacy and the start screen's answer set it
    // with AB.setUsageData(on), which redraws the header. Their answered states imply it too.
    AB.usageData = false;
    AB.setUsageData = (on) => { AB.usageData = !!on; if (route && route.frame.top && !route.frame.full) { $("ab-top").replaceChildren(); renderTop($("ab-top")); } };
    const USAGE_STATE = { "settings/privacy": false, "settings/privacy-on": true, "start-screen/answered": true, "start-screen/declined": false, "start-screen/answered-choose": true, "start-screen/declined-choose": false };
    // This page view's project names and recent projects. A rename or Save as in the project menu sets
    // AB.projectNames[dataset], which the header reads. AB.visit.fresh is set by a first-launch start
    // screen: from then on the start screen's Recent lists only AB.visit.recents (what was opened or
    // saved in this page view, newest first), never the fixtures' returning reader's projects.
    AB.projectNames = {};
    AB.visit = { fresh: false, recents: [] };

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
    // Review only: "Design notes" (open questions, "needs graphty-element" marks, and menu items and
    // controls marked as needing graphty-element) can be hidden for the user-test build. With notes
    // hidden the review bar is hidden too (app.css). "participant" is the view study.mjs opens; it is
    // hidden notes under another name. Neither is a trap: the small Review button in the bottom left
    // corner and Esc with nothing open both bring the notes and the review bar back.
    const participant = () => store.get("designNotes") === "participant";
    const notesHidden = () => participant() || store.get("designNotes") === "hidden";
    const applyNotes = () => {
        document.documentElement.toggleAttribute("data-design-notes-hidden", notesHidden());
        document.documentElement.toggleAttribute("data-participant", participant());
        const c = document.getElementById("ab-leave-study");
        if (c) c.hidden = !notesHidden();
    };
    applyNotes();
    function setNotes(hidden) {
        store.set("designNotes", hidden ? "hidden" : "");
        applyNotes();
        if (route && document.body.dataset.page === "app") renderReview(($("ab-review").replaceChildren(), $("ab-review")), route.sec, route.state);
        AB.announce(hidden ? "Design notes hidden" : "Design notes shown");
    }

    // ---------- routing ----------
    function parse() {
        const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
        return { id: parts[0] || "graph-place", state: parts.slice(1).join("/") || null };
    }
    // Old routes in design notes keep working: the Camera menu folded into the View flyout, the path
    // pick mode into the Path popover, and the load step and the source inspector into the Data page.
    // A load-step state not listed keeps its name (detect-several, url, every refused-* state).
    const LOAD_STEP = { preview: "edge-list", checks: "entries", paired: "transfers", "edit-source-lost-fields": "edit-source-lost", remap: "edit-source" };
    const SOURCE = { file: "transfers", paired: "transfers", url: "url", "url-changed": "url", failed: "url", paste: "detect-several", replaced: "replace" };
    function redirect(p) {
        if (p.id === "camera-menu") return "#/view-flyout/3d";
        if (/^path-tool/.test(p.id)) return "#/path-popover/from-selection";
        if (p.id === "load-step") return href("data-page", p.state ? LOAD_STEP[p.state] || p.state : "entries");
        if (p.id === "inspector-source") return p.state === "derived" ? href("data-place", "derived") : href("data-page", SOURCE[p.state] || "transfers");
        return null;
    }
    function refOf(v) {
        if (!v) return null;
        const [id, ...rest] = String(v).split("/");
        return { id, state: rest.join("/") || null };
    }
    let route = null;
    let lastHash = null;
    let railCarry = false; // a rail place opened from a project that is not Les Miserables keeps that project
    let clearing = false; // the next render is a cleared selection: the inspector shows the graph
    let prevLeft = null;
    let prevRight = null;
    // Focus goes back to the control that opened an overlay when the overlay closes
    let opener = null;
    let closedOverlay = null; // the overlay section open before this render
    // The control that opens an overlay section: any element whose target is that section
    function refocusOpener(id) {
        if (!id || (document.activeElement && document.activeElement !== document.body)) return;
        const el = (id !== "settings" && document.querySelector(`[data-nav^="#/${id}"]`)) || (id === "view-flyout" && document.querySelector("[data-tool='View']")) || (id === "project-menu" && document.getElementById("ab-project")) || (id === "main-menu" && document.getElementById("ab-rail-menu"))
            // nothing on screen opens it (a direct link): the place's heading, never the page body
            || document.querySelector("#ab-left:not([hidden]) .ab-place-title") || document.querySelector("#ab-right .ab-insp-head .k-name");
        if (el) el.focus({ preventScroll: true });
    }
    const describe = (el) => el && el !== document.body ? { el, stage: !!(el.closest && el.closest("#ab-canvas .k-stage")), id: el.id || null, nav: el.dataset && el.dataset.nav || null, label: el.getAttribute("aria-label"), row: el.closest && el.closest("[data-row]") && el.closest("[data-row]").dataset.row, who: el.closest && el.closest("#ab-main tr[data-who]") && el.closest("#ab-main tr[data-who]").dataset.who } : null;
    AB.describeFocus = () => describe(document.activeElement);
    AB.refocus = (d) => refocus(d);
    function refocus(d) {
        if (!d) return false;
        const q = (sel) => { try { return document.querySelector(sel); } catch (e) { return null; } };
        const el = (d.el && d.el.isConnected && d.el) || (d.stage && q("#ab-canvas .k-stage")) || (d.id && document.getElementById(d.id)) || (d.row && q(`#ab-left [data-row="${d.row}"]`)) || (d.who && q(`#ab-main tr[data-who="${CSS.escape(d.who)}"]`)) || (d.nav && q(`[data-nav="${d.nav}"]`)) || (d.label && q(`[aria-label="${d.label}"]`));
        if (el) el.focus();
        return !!el;
    }

    // Closing an overlay keeps the panels as they are (no redraw), so focus returns to the very control
    // that opened it and a popover's live changes stay on screen
    AB.close = function () {
        if (!route) return;
        // a popover that changed what the panels show (a binding just made: AB.repaint) redraws them instead
        if (route.frame.overlay && !AB.repaint) AB.keepLeft = AB.keepRight = true;
        AB.repaint = false;
        go(route.closeTo.id, route.closeTo.state);
    };
    // Clear the selection: the selection is empty and the inspector shows the graph on screen as its
    // subject (the graph is never put into the selection). The left panel stays the place it was, in
    // the project on screen. The empty canvas and Escape both call this.
    AB.clearSelection = function () {
        AB.tablePicks = null; // the node table's picked rows (table-dock) go with the selection
        if (!route) return;
        const place = PLACES[route.rail] ? PLACES[route.rail][2] : "graph-place";
        const ds = route.frame.dataset, left = refOf(route.frame.left);
        // the left panel's own state, unless it is at-rest, which only means this project while the frame carries it
        const st = ds === "lesmis" ? (left && left.id === place ? left.state : RAIL_STATE.lesmis[route.rail] || null) : left && left.id === place && left.state !== "at-rest" ? left.state : (RAIL_STATE[ds] || {})[route.rail] || null;
        const right = refOf(route.frame.right);
        if (route.id === place && (!right || right.id === "inspector-nothing-selected")) return;
        // What was selected, for the notice: elements are counted, a row is named
        // (a row that holds nodes, such as a set or a group, is counted by its members too)
        const bar = selectionBarFor(route.frame.right);
        const N = { "selection-bar/one-node": [1, "node"], "selection-bar/one-edge": [1, "edge"], "selection-bar/two-nodes": [2, "node"], "selection-bar/five-nodes": [5, "node"] }[bar];
        const head = document.querySelector("#ab-right .ab-insp-head .k-name");
        const rowLi = document.querySelector('#ab-left [role=treeitem][aria-selected="true"]');
        const rowR = rowLi && rowLi._entry && rowLi._entry.r;
        const rowN = rowR && typeof rowR.count === "number" && !rowR.countTip && !rowR.countNoun ? rowR.count : null;
        const what = N ? AB.count(N[0], N[1]) : rowN != null ? AB.count(rowN, "node") : head ? head.textContent.trim() : null;
        const back = location.hash;
        clearing = true;
        // the tree is drawn again, so the row the inspector showed is no longer marked selected
        AB.keepLeft = false;
        AB.redrawLeft = true;
        afterRender = () => {
            // nothing is selected: no row of the left panel's tree is marked, whatever its state draws
            document.querySelectorAll('#ab-left [role=treeitem][aria-selected="true"]').forEach((x) => x.setAttribute("aria-selected", "false"));
            selSlot = { back, what };
            AB.notice("Selection cleared" + (what ? " (" + what + ")" : ""), { label: "Bring it back", onClick: () => restoreSelection() });
            AB.announce("Selection cleared" + (what ? " (" + what + ")" : "") + ". Ctrl+Z brings it back");
            redrawTop();
        };
        if (location.hash === href(place, st)) render(); else go(place, st);
    };
    let afterRender = null;
    // The cleared selection's slot ({ back, what }): while it is armed, Ctrl+Z, the header's Undo and the
    // notice's Bring it back restore only that selection and touch no undo or redo step. Any new
    // selection (a render) or undoable change (a notice with Undo) empties it.
    let selSlot = null;
    const redrawTop = () => { if (route && route.frame.top && !route.frame.full) { $("ab-top").replaceChildren(); renderTop($("ab-top")); } };
    AB.dropSelectionSlot = () => { if (selSlot) { selSlot = null; redrawTop(); } };
    function restoreSelection() {
        const s = selSlot;
        if (!s) return false;
        selSlot = null;
        const line = "Selection restored" + (s.what ? " (" + s.what + ")" : "");
        afterRender = () => { AB.notice(line); AB.announce(line); };
        if (location.hash === s.back) render(); else location.hash = s.back;
        return true;
    }
    const hasSelection = () => !!(route && !route.frame.overlay && !["workspace", "full"].includes(route.sec.region) && route.frame.right && refOf(route.frame.right).id !== "inspector-nothing-selected");
    AB.toggleDock = function () {
        shell.dock = shell.dock === "open" ? "closed" : "open";
        store.set("dock", shell.dock);
        render();
    };
    // Open the dock in place (a tab of the collapsed dock): no redraw, so the section keeps the tab it picks
    AB.openDock = function () {
        shell.dock = "open";
        store.set("dock", shell.dock);
        if ($("ab-main").dataset.dock === "closed") $("ab-main").dataset.dock = "open";
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
                { name: "Selection", kindIcon: "scan", pinned: true, builtin: true, eye: true, go: ["inspector-selection-and-everything", "selection"] },
                { name: "Notes", kindIcon: "message-square", pinned: true, builtin: true, count: 2, eye: true, go: ["inspector-selection-and-everything", "notes"], menu: ["context-menus", "notes-row"] },
                { name: "Betweenness", kindIcon: "chart-column", swatch: AB.ramp(), eye: false, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
                { name: "Degree", kindIcon: "hash", swatch: AB.ramp("#cfcfcf", "#4d4d4d"), eye: true, go: ["inspector-measure-row", "style"], menu: ["context-menus", "measure-row"] },
                { name: "group", kindIcon: h("span", { class: "ab-abc" }, "Abc"), swatch: h("span", { class: "ab-multi" }, L.frame.legend.rows.slice(0, 3).map((g) => AB.chit(g.color, true))), count: "10 groups", eye: true, open: false, children: groups, go: ["inspector-run-row", "style"], menu: ["context-menus", "run-row"] },
                { name: "Everything", kindIcon: "base-layer", pinned: true, builtin: true, eye: true, go: ["inspector-selection-and-everything", "everything"] },
            ];
            el.append(
                placeHead("Graph"),
                h("div", { class: "ab-switcher" }, h("span", Object.assign({ class: "ab-switch-btn", role: "button" }, act({ go: ["graphs-switcher", "open"] })), icon("network"), h("span", { class: "k-ellipsis" }, L.frame.graphRow), icon("chevron-down", "sm")), h("span", { class: "k-grow" }), h("span", { class: "k-secondary k-num" }, AB.count(L.nodes, "node"))),
                h("div", { class: "ab-treebar" }, AB.field("Find rows, elements, values", { icon: "search", onClick: () => focusFind() }), AB.iconButton("list-filter", "List options", { go: ["graph-place", "list-menu"] })),
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
                        AB.section({ title: "Summary", collapsible: true, key: "graph.summary" },
                            AB.data("Nodes", AB.num(L.nodes)), AB.data("Edges", AB.num(L.edges) + " (undirected)"), AB.data("Density", AB.num(L.stats.density)),
                            AB.data(f.componentsName, f.components), AB.data("Isolated nodes", AB.num(L.stats.isolated)), AB.data("Average degree", AB.num(L.stats.averageDegree)),
                            AB.tip(h("div", { class: "ab-bars" }, f.degreeBars.map((b) => h("span", { style: `height:${Math.max(1, (b / max) * 100)}%` }))), f.degreeLabel, { label: false }),
                            h("div", { class: "ab-cap k-secondary" }, f.degreeName + ". " + f.degreeLabel + "."),
                            AB.data("Edge weight", "value", { go: ["inspector-attribute-and-filter-step", "attribute"] }),
                            AB.data("Attributes", AB.num(f.attributes), { go: ["data-place", "attributes"] })),
                        AB.section({ title: "Statistics", collapsible: true, key: "graph.statistics" }, AB.data("Modularity of group", AB.num(L.stats.modularityOfGroups), { go: ["inspector-run-row", "data"] })),
                        AB.section({ title: "Layout", collapsible: true, key: "graph.layout", summary: "Force-directed" }, AB.data("Method", "Force-directed")),
                        AB.section({ title: "Canvas", collapsible: true, key: "graph.canvas", summary: "Default background" },
                            h("div", { class: "ab-cap k-secondary" }, "graphty-element settings, not a layer."),
                            AB.data("Background", "Default"), AB.data("Show all labels", AB.showAllLabels ? "On" : "Off"), AB.data("Reframe when data changes", "On")),
                        AB.notesSection(0, ["notes-place", "about-graph"]),
                    ],
                }),
            );
        },
        // The canvas carries no controls: the drawing, the legend card (top left) and state cards
        canvas(el) {
            const L = fxl(), f = L.frame, a = L.anchors.selected;
            const stage = h("div", { class: "k-stage" }, AB.drawing("lesmis-groups-rest", f.altSized));
            const hot = AB.tip(h("span", { class: "ab-hot" , style: `left:${a.x}%;top:${a.y}%` }), a.id, { second: "group 2, degree 36" });
            AB.selectHot(hot, "lesmis", L.rows.findIndex((r) => r.label === a.id));
            hot.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); go("context-menus", "node"); });
            stage.append(hot);
            const legend = AB.legendCard([
                { title: "Color: group", go: ["inspector-run-row", "style"], rows: f.legend.rows.map((r) => ({ swatch: r.color, label: "Group " + r.label, count: r.count, go: ["inspector-group-set-path-row", "group-" + r.label] })).concat([{ swatch: f.legend.other.color, label: "Other", count: f.legend.other.count, go: ["inspector-group-set-path-row", "other"] }]) },
                { title: h("span", { class: "ab-lg-size" }, "Size: Degree ", f.sizeMarks.map((m) => AB.tip(h("span", { class: "ab-dot", style: `width:${m.px / 2}px;height:${m.px / 2}px` }), "degree " + m.degree, { label: false }))), go: ["inspector-measure-row", "style"] },
            ]);
            append(el, [stage, legend]);
            el.addEventListener("contextmenu", (e) => { e.preventDefault(); go("context-menus", "canvas"); });
        },
        toolbar(el) {
            el.append(AB.mainToolbar());
        },
        dock(el) {
            const L = fxl();
            const tab = (label, state, sel) => h("span", Object.assign({ class: "k-tab", role: "tab", "aria-selected": String(!!sel) }, act({ go: ["table-dock", state] })), label);
            const rows = L.topByDegree.slice(0, 12);
            el.append(
                h("div", { class: "k-dock-tabs" }, h("span", { role: "tablist", class: "ab-tablist" }, tab("Nodes", "nodes", true), tab("Edges", "edges")), h("span", { class: "k-grow" }), AB.iconButton("search", "Find in table", { go: ["commands-and-search", "find"] }), AB.iconButton("ellipsis", "Table options", { go: ["table-dock", "nodes"] }), AB.dockToggle()),
                h("div", { class: "k-scope" }, "Full graph: " + AB.count(L.nodes, "node") + ", sorted by degree, highest first"),
                h("div", { class: "k-table-wrap" }, h("table", { class: "k-table" },
                    h("thead", null, h("tr", null, h("th", null, "label"), h("th", null, "group ", h("span", { class: "k-profile" }, "10 values")), h("th", { class: "k-n" }, "degree ", h("span", { class: "k-profile" }, "1 to " + L.stats.maxDegree)))),
                    h("tbody", null, rows.map((r) => h("tr", act({ onClick: () => AB.selectNode("lesmis", L.rows.findIndex((x) => x.label === r.label)) }), h("td", { class: "k-id" }, r.label), h("td", null, AB.chit(L.groupColors[r.group] || "#808080"), String(r.group)), h("td", { class: "k-n" }, r.degree)))),
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

    // A place's state for a project (the tree, Data, Views, Notes it opens on); null is the place's own default
    function placeOf(ds, key) {
        const fresh = ds === "transactions" && AB.fx.datasets.transactions.fresh;
        return ((fresh ? { graph: "transfers-loaded", data: "empty-filters", views: "empty" } : RAIL_STATE[ds]) || {})[key] || null;
    }
    AB.placeOf = placeOf;
    function railButton(key) {
        const [label, ic, target] = PLACES[key];
        // The rail stays in the project on screen: the door entries' Graph and Data places, the transfers' Graph place
        // A just-loaded transfers project has no runs and no filter steps yet
        // A new project with nothing loaded keeps its empty Graph and Data places, never the sample's
        const none = ["canvas-and-states/empty", "canvas-and-states/refused-project"].includes(route.frame.canvas) ? { graph: "empty", data: "no-sources" } : null;
        const st = none ? none[key] || placeOf(route.frame.dataset, key) : placeOf(route.frame.dataset, key);
        const a = act({ go: st ? [target, st] : [target] });
        // A place with no state of its own for this project (Assistant) opens over the project on screen
        if (route.frame.dataset !== "lesmis") {
            const click = a.on.click, kd = a.on.keydown, carry = () => { railCarry = location.hash !== href(target, st); };
            a.on = { click: (e) => { carry(); click(e); }, keydown: (e) => { if (e.key === "Enter" || e.key === " ") carry(); kd(e); } };
        }
        return h("div", Object.assign({ class: "k-rail-btn", role: "button", "aria-pressed": String(route.rail === key), "data-place": key }, a), h("span", { class: "k-rail-pill" }, icon(ic)), label);
    }
    function renderRail(el) {
        el.append(railButton("graph"), railButton("data"), railButton("views"), railButton("notes"), railButton("assistant"));
    }
    // Header, left to right (spec 9): main menu, project name, undo and redo, privacy chip, filter chip
    function renderTop(el) {
        const D0 = AB.fx.datasets[route.frame.dataset] || fxl();
        // A new project with nothing loaded is not the sample: it has no name yet. So is a file opened
        // as a new graph (frame.newProject) from the start screen or a direct link: no project is open
        const untitled = (route.frame.dataset === "lesmis" && route.frame.canvas === "canvas-and-states/empty")
            || (route.frame.newProject && (!AB.pageOpener || AB.pageOpener.startsWith("#/start-screen")));
        const D = untitled ? { frame: { project: "Untitled project" } }
            : AB.projectNames[route.frame.dataset] ? { frame: { project: AB.projectNames[route.frame.dataset] } } : D0;
        const menuBtn = AB.iconButton("menu", "Main menu", { go: ["main-menu", "open"] });
        menuBtn.id = "ab-rail-menu"; // the id is kept from version 2, when the button sat in the rail
        menuBtn.setAttribute("aria-haspopup", "menu");
        const project = h("span", Object.assign({ id: "ab-project", class: "ab-project", role: "button", "aria-label": D.frame.project + ", project menu", "aria-haspopup": "menu", "aria-keyshortcuts": "F2" }, act({ go: ["project-menu", "open"] })), h("span", { class: "k-ellipsis" }, D.frame.project), icon("chevron-down", "sm"));
        // Double-click or F2 renames the project in place, like every other name
        project.addEventListener("dblclick", (e) => { e.stopPropagation(); go("project-menu", "rename"); });
        AB.tip(project, "Project menu", { key: "F2", second: "Double-click or F2: rename", label: false });
        project.addEventListener("keydown", (e) => { if (e.key === "F2") { e.preventDefault(); go("project-menu", "rename"); } });
        append(el, [
            menuBtn,
            h("h1", { class: "ab-h1" }, project),
            AB.iconButton("undo-2", selSlot ? "Undo: restore selection" + (selSlot.what ? " (" + selSlot.what + ")" : "") : "Undo", { key: "Ctrl+Z", onClick: () => undoLast() }),
            AB.iconButton("redo-2", "Redo", { key: IS_MAC ? "Ctrl+Shift+Z" : "Ctrl+Shift+Z Ctrl+Y", onClick: () => redoLast() }),
            AB.tip(h("span", Object.assign({ class: "ab-privacy", role: "link" }, act({ go: ["settings", AB.usageData ? "privacy-on" : "privacy"] })), icon(AB.ICON.local, "sm"), AB.usageData ? "Usage data on, content masked" : "Local only"), "Privacy settings", { label: false }),
            // The filter chip always says what the graph shows: "Full graph", or "812 of 3,000 nodes" while
            // a filter step removes something. It is a button (a caret, a border) that opens the project's
            // filters, Data > Filters; its tooltip lists the steps that are off (frame.stepsOff)
            filterChip(),
            h("span", { class: "k-grow" }),
        ]);
    }
    // Where the chip opens: the project's filters. A Data place on screen already holds them (with any step
    // the reader just added); else the transfers' Filters, Les Miserables' degree steps, or the project's Data place
    // data-place's state holding the one step Filter to neighbors made
    const NEIGHBOR_STEP = "lesmis-neighbors";
    function chipDoor(chip) {
        const ds = route.frame.dataset, left = String(route.frame.left || "");
        if (chip === "Full graph") return ["data-place", placeOf(ds, "data")];
        // Filter to neighbors made one step: the chip opens a Data place holding only that step
        if (route.id === "selection-bar" && route.state === "filtered-to-neighbors") return ["data-place", NEIGHBOR_STEP];
        if (left.startsWith("data-place/")) return left.split("/");
        return ["data-place", ds === "transactions" ? "filters" : ds === "lesmis" ? "lesmis-filters" : placeOf(ds, "data")];
    }
    function filterChip() {
        // stepsOff null: the section did not say, so the tooltip claims nothing about the steps
        const chip = route.frame.chip || "Full graph", off = route.frame.stepsOff;
        const b = h("span", Object.assign({ id: "ab-filter", class: "ab-filter-chip", role: "button" }, act({ go: chipDoor(chip) })), icon("funnel", "sm"), h("span", null, chip), icon("chevron-down", "sm"));
        return AB.tip(b, "Filters" + (!off ? "" : off.length ? ", off: " + off.join("; ") : ", every step on"), { label: false });
    }
    function renderReview(el, sec, state) {
        if (participant()) return;
        const place = PLACES[route.rail] ? PLACES[route.rail][0] : "";
        const st = sec.states.find((s) => s.id === state) || sec.states[0];
        const crumbs = [place && route.frame.full == null ? AB.link(PLACES[route.rail][2], null, place) : null, REGION_LABEL[sec.region] || sec.region, h("b", null, sec.title), sec.states.length > 1 ? st.label : null].filter(Boolean);
        const bc = h("span", { class: "ab-crumbs" }, h("span", { class: "ab-rv-label" }, "Where am I:"));
        // Review bar first in the DOM: one link past it, so a keyboard walk starts in the app
        el.append(h("a", { href: "#", class: "ab-rv-btn ab-skip", on: { click: (e) => { e.preventDefault(); const t = document.querySelector("#ab-rail [tabindex='0']"); if (t) t.focus(); } } }, "Skip to app"));
        crumbs.forEach((c, i) => { if (i) bc.append(h("span", { class: "ab-sep" }, ">")); bc.append(c); });
        const states = h("span", { class: "ab-states" }, sec.states.length > 1 ? [h("span", { class: "ab-rv-label" }, "States:"), sec.states.map((s) => h("a", { href: href(sec.id, s.id), class: "ab-state", "aria-current": s.id === st.id ? "true" : null }, s.label))] : null);
        el.append(
            h("a", { href: "#/map", class: "ab-rv-title" }, "Refined B skeleton"),
            h("span", { class: "ab-rv-btn", role: "switch", tabindex: "0", "aria-checked": String(notesHidden()), on: { click: () => setNotes(!notesHidden()), keydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setNotes(!notesHidden()); } } } }, notesHidden() ? "Show design notes" : "Hide design notes"),
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
        // Every registered section: the manifest's, then any a section file registers beside its own (a popover)
        AB.order.concat(Object.keys(AB.sections).filter((id) => !AB.order.includes(id))).forEach((id) => { const s = AB.sections[id]; if (s) (byRegion[s.region] = byRegion[s.region] || []).push(s); });
        const order = ["full", "left", "right", "canvas", "toolbar", "dock", "overlay", "workspace"];
        main.append(h("h1", { class: "ab-map-h1" }, "Refined B skeleton: every section"),
            h("p", { class: "ab-map-lede" }, h("a", { href: "START-HERE.html" }, "Start here: version 5, the owner's decisions since version 3, with links into the skeleton")),
            h("p", { class: "k-secondary ab-map-lede" }, "Click a section to open it inside the app frame; each state below it opens that state." + (AB.order.some((id) => AB.sections[id] && typeof AB.sections[id].render !== "function") ? " Sections marked \"not built yet\" show the frame at rest with a placeholder." : "")),
            h("p", { class: "k-secondary ab-map-lede" }, "The data sets: the Graph place, Notes and most inspectors show Les Miserables; the Data place, the Path popover, version history and the many-groups states show the card and transfer data; the Data page shows door entries (people, buildings, entries) and the March transfers. Wide data (300 hosts with 69 attributes, 1,105 connections with 26) and nested JSON (a research network API export, a package registry, a small co-author file) have their own states, listed in study/structure-comparison/state-matrix.md. The project name at the top left says which one is open, and the canvas, inspector and table follow it."));
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
        const moved = redirect(p);
        if (moved) { location.replace(moved); return; }
        document.body.dataset.page = "app";
        let sec = AB.sections[p.id];
        if (!sec) { location.replace("#/map"); return; }
        const state = p.state || sec.states[0].id;
        const frameOf = (s, st) => (typeof s.frame === "function" ? s.frame(st) : s.frame) || {};
        // A link to a place's default state (the note-count bubble, "Back to the tree") from another
        // project opens that project's own state of the place, exactly as the rail button does, so no
        // door lands on Les Miserables from the transfers or the door entries
        const placeKey0 = Object.keys(PLACES).find((k) => PLACES[k][2] === sec.id);
        if (placeKey0 && route && route.frame.dataset !== "lesmis" && !["workspace", "full"].includes(route.sec.region) && state === sec.states[0].id && !frameOf(sec, state).dataset) {
            const own = placeOf(route.frame.dataset, placeKey0);
            if (own && own !== state && sec.states.some((x) => x.id === own)) { location.replace(href(sec.id, own)); return; }
            if (!own) railCarry = true;
        }
        // A section's own state for the project on screen (sec.stateFor(dataset, state)): a door that
        // names the generic state (P, Path between..., Analyze > Shortest path) lands on that project's
        if (sec.stateFor && route && route.frame.dataset) {
            const own = sec.stateFor(route.frame.dataset, state);
            if (own && own !== state) { location.replace(href(sec.id, own)); return; }
        }
        const extra = frameOf(sec, state);
        // The project on screen stays on screen. A menu, popover or dialog that names no data set (or
        // the same one) opens over the panels that were showing, and Esc goes back to them; a rail
        // place, or an inspector beside the same place, keeps the project and its left panel. Most
        // of those states are drawn for Les Miserables, so without this every door out of the door
        // entries or the transfers would switch the project under the reader.
        const was = route && route.frame.dataset !== "lesmis" && !["workspace", "full"].includes(route.sec.region) ? route : null;
        let carried = null;
        if (was && (!extra.dataset || extra.dataset === was.frame.dataset)) {
            // an overlay whose frame names its own panels (a result just added) draws them instead
            // (the table dock's Columns popover and Table options are dock states that name an overlay: the same rule)
            if ((sec.region === "overlay" || (sec.region === "dock" && extra.overlay)) && !extra.own) carried = "panels";
            // an inspector that names no left panel, or the same place (the tree's built-in rows name graph-place)
            else if (railCarry || (sec.region === "right" && (!extra.left || (refOf(extra.left).id === (refOf(was.frame.left) || {}).id)))) carried = "dataset";
        }
        railCarry = false;
        const frame = Object.assign({}, DEFAULT_FRAME, extra);
        // Key 5's view mode holds over every screen until a route that names its own mode is opened
        if (location.hash !== lastHash && "mode" in extra) shell.mode = null;
        lastHash = location.hash;
        if (carried === "panels") ["left", "right", "canvas", "dock", "toolbar", "mode"].forEach((r) => { frame[r] = was.frame[r]; });
        if (carried === "dataset" && sec.region === "right") frame.left = was.frame.left;
        // an inspector opened straight on a loaded project (a direct link) gets that project's own tree, not Les Miserables'
        else if (!carried && sec.region === "right" && extra.dataset && !extra.left && RAIL_STATE[extra.dataset] && RAIL_STATE[extra.dataset].graph) frame.left = "graph-place/" + RAIL_STATE[extra.dataset].graph;
        if (shell.mode) frame.mode = shell.mode;
        frame[sec.region] = sec.id + "/" + state;
        const leftRef = refOf(frame.left);
        const leftSec = leftRef && AB.sections[leftRef.id];
        // The dataset and the filter chip follow the section, or else the left panel beside it:
        // a transfers place (Data, the Path tool) brings the transfers canvas, inspector and table.
        const leftExtra = leftSec && leftSec !== sec ? frameOf(leftSec, leftRef.state || leftSec.states[0].id) : {};
        frame.dataset = extra.dataset || leftExtra.dataset || (carried ? was.frame.dataset : "lesmis");
        // A project's filter steps, as its Data place last left them (AB.projectFilter), hold on every place of that project
        const pf = (AB.projectFilter || {})[frame.dataset] || {};
        frame.chip = chipWording(extra.chip || leftExtra.chip || pf.chip || (carried ? was.frame.chip : "Full graph"));
        // How many nodes the graph on screen holds, for AB.count's set rule (null: all of them)
        const shownM = typeof frame.chip === "string" && frame.chip.match(/^([\d,]+) of [\d,]+ nodes?$/);
        frame.shown = shownM ? Number(shownM[1].replace(/,/g, "")) : null;
        // The names of the project's filter steps that are off, for the chip's tooltip
        frame.stepsOff = extra.stepsOff || leftExtra.stepsOff || pf.stepsOff || (carried ? was.frame.stepsOff : null) || null;
        // The attributes the project's filter steps read (on or off): the field lists' "Filter step" tag
        frame.filterOn = extra.filterOn || leftExtra.filterOn || pf.filterOn || (carried ? was.frame.filterOn : null) || null;
        // The node ids the filter steps that apply leave (a Set), where the Data place can say: the canvas draws only those
        frame.keep = extra.keep || leftExtra.keep || pf.keep || (carried ? was.frame.keep : null) || null;
        // The transfers with runs (not just loaded) draw their Louvain communities wherever the canvas is not named,
        // so the canvas agrees with the Results the Data place and the tree list
        const dsFrame = Object.assign({}, DATASET_FRAME[frame.dataset], frame.dataset === "transactions" && !AB.fx.datasets.transactions.fresh ? { canvas: "canvas-and-states/transfers-communities" } : {});
        if (frame.dataset !== "lesmis" && carried !== "panels") Object.entries(dsFrame).forEach(([r, v]) => { if (!(r in extra) && sec.region !== r) frame[r] = v; });
        // the canvas stays as it was drawn (communities, a legend) when an inspector opens beside the same project
        if (carried === "dataset" && sec.region === "right" && !("canvas" in extra)) frame.canvas = was.frame.canvas;
        if (clearing && sec.region !== "right") {
            frame.right = (DATASET_FRAME[frame.dataset] || {}).right || DEFAULT_FRAME.right;
            if (/^selection-bar/.test(frame.toolbar || "")) frame.toolbar = DEFAULT_FRAME.toolbar;
        }
        clearing = false;
        if (carried !== "panels" && sec.region !== "toolbar" && !("toolbar" in extra)) frame.toolbar = selectionBarFor(frame.right) || frame.toolbar;
        // frame.walk: n puts the canvas walk n steps along this project's nodes (a route drawn after Shift+Arrow)
        if (typeof extra.walk === "number") walkTo(frame.dataset, extra.walk - 1);
        else if (!walking) { walk.at = null; AB.walked = null; }
        walking = false;
        // The rail lights the place the left panel shows; a section with no left panel names its own.
        // A workspace page (the Data page) names its own place: no left panel shows beside it.
        const railKey = (sec.region === "workspace" && sec.rail) || (sec.region !== "left" && leftSec && leftSec.rail) || sec.rail || "graph";
        let closeTo = carried === "panels" ? (was.frame.overlay ? was.closeTo : { id: was.id, state: was.state }) : extra.own && leftRef ? leftRef : sec.closeTo ? refOf(sec.closeTo) : frame.full && sec.region !== "full" ? refOf(frame.full) : leftRef && leftRef.id !== sec.id ? leftRef : { id: PLACES[railKey][2], state: null };
        // In a loaded project (wide, nested, plain JSON) a place's at-rest names Les Miserables: close to the project's own state
        const placeKey = closeTo && Object.keys(PLACES).find((k) => PLACES[k][2] === closeTo.id);
        if (placeKey && ["wide", "nested", "plainJson", "registry", "karate", "ppi"].includes(frame.dataset) && (!closeTo.state || closeTo.state === "at-rest") && RAIL_STATE[frame.dataset][placeKey]) closeTo = { id: closeTo.id, state: RAIL_STATE[frame.dataset][placeKey] };
        // A menu, popover or dialog drawn over a selection closes back to that selection, never past it:
        // one Esc closes only the overlay, and the selection and panels stay as they were
        if (sec.region === "overlay" && !extra.own && carried !== "panels" && selectionBarFor(frame.right)) closeTo = refOf(frame.right);
        const hadOverlay = !!(route && route.frame.overlay);
        const hadFocus = describe(document.activeElement);
        const prevId = route && route.id;
        const prevState = route && route.state;
        const focusTool = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.tool;
        if (frame.overlay && !hadOverlay) opener = describe(document.activeElement);
        // A workspace page (the Data page, version history) remembers the screen that opened it: its
        // Cancel and Esc go back there (AB.pageHead). A direct link has no opener and uses closeTo.
        if (sec.region === "workspace" && (!route || route.id !== sec.id)) AB.pageOpener = route ? href(route.id, route.state) : null;
        AB.onPageCancel = null;
        route = { id: sec.id, state, sec, frame, rail: railKey, closeTo };
        if ((sec.id + "/" + state) in USAGE_STATE) AB.usageData = USAGE_STATE[sec.id + "/" + state];
        // A notice belongs to the screen that raised it; so does a cleared selection's slot
        selSlot = null;
        document.querySelectorAll(".gp-offer").forEach((f) => f.remove());
        $("ab-notice").replaceChildren();
        // A canvas section showing a state card sets this while it draws ("Nothing is drawn")
        AB.toolbarDisabled = null;
        AB.route = route; // sections read route.frame to agree with their neighbors (the tree marks the row the inspector shows)

        const app = $("ab-app");
        app.dataset.full = frame.full ? "true" : "false";
        app.dataset.workspace = frame.workspace ? "true" : "false";
        app.dataset.left = frame.left && shell.panels === "shown" ? "open" : "closed";
        app.dataset.right = frame.right && shell.panels === "shown" ? "open" : "closed";
        $("ab-main").dataset.dock = !frame.dock ? "none" : shell.dock;

        // Opening a menu or popover over the same panels keeps them as they were (no redraw), so what
        // the reader changed there (a label line just added) is still behind the popover and after it
        // AB.redrawLeft: an overlay that changed what the left panel lists (a row Find path added) draws it again
        const keepLeft = !AB.redrawLeft && prevLeft && leftRef && prevLeft.id === leftRef.id && (AB.keepLeft || (!!frame.overlay && prevLeft.state === leftRef.state));
        const keepRight = prevRight && prevRight === frame.right && (AB.keepRight || !!frame.overlay);
        AB.keepLeft = AB.keepRight = AB.redrawLeft = false;
        prevLeft = leftRef;
        prevRight = frame.right;
        const fill = (id, region) => {
            if ((region === "left" && keepLeft) || (region === "right" && keepRight)) {
                // the overlay that opened from here is gone: nothing in the kept panel is "open" any more
                $(id).querySelectorAll("[data-open]").forEach((x) => { x.removeAttribute("data-open"); if (x.getAttribute("aria-expanded") === "true") x.setAttribute("aria-expanded", "false"); });
                return;
            }
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
        if (afterRender) { const f = afterRender; afterRender = null; f(); }
        // Every region has a heading, so a keyboard or screen reader user hears which region holds focus
        Object.entries(REGION_HEADING).forEach(([id, text]) => {
            const r = $(id);
            if (r && !r.hidden && r.childElementCount && !r.querySelector(":scope h1, :scope h2, :scope [role=heading]")) r.prepend(h("h2", { class: "k-sr ab-region-h" }, text));
        });
        // An overlay section that draws nothing (a "closed" state, a rename in place) lets clicks through.
        // Some overlays draw a frame later (they wait for the regions' boxes), so check again then.
        const setActive = () => { $("ab-overlay").dataset.active = frame.overlay && $("ab-overlay").childElementCount ? "true" : "false"; };
        setActive();
        requestAnimationFrame(() => requestAnimationFrame(() => { if (route && route.frame === frame) setActive(); }));
        // move focus into an opened overlay, or back to the control that opened it
        // (never a control that is not drawn: a design-note chip hidden in the participant view)
        // (never a control that is not drawn, such as a design-note chip hidden in the participant view;
        // a dialog with nothing else to focus focuses its Close)
        const FIRST = "[data-autofocus], [aria-modal='true'] .k-modal-body :is([tabindex='0'], input, select, textarea), [tabindex='0']:not([aria-label='Close']), input, .k-menu-item";
        // a field marked data-autofocus wins over anything earlier in the DOM (the query, not the tabs above it)
        const drawnEl = (x) => x.getClientRects().length && !x.closest("[hidden]");
        const firstDrawn = () => [...$("ab-overlay").querySelectorAll("[data-autofocus]")].find(drawnEl) || [...$("ab-overlay").querySelectorAll(FIRST)].concat([...$("ab-overlay").querySelectorAll("[aria-modal='true'] [aria-label='Close']")]).find(drawnEl);
        const first = $("ab-overlay").querySelector(FIRST);
        // Menus are placed (and made visible) a frame later, and a hidden element cannot take focus
        if (first && frame.overlay) requestAnimationFrame(() => requestAnimationFrame(() => {
            if ($("ab-overlay").contains(document.activeElement)) return;
            const f = firstDrawn();
            if (f) f.focus();
        }));
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
        // Controls that write data-tip by hand get their label and key; the notice sits over the new bars
        AB.tipSweep(document.getElementById("ab-app"));
        // A pressed Legend button always draws a card: a canvas that drew none gets the shared one
        // (what paints, or "Nothing is colored or sized by a row")
        const legendFloor = () => {
            const cv = $("ab-canvas");
            if (route && route.frame === frame && !cv.hidden && cv.querySelector(".k-stage") && !cv.querySelector(".k-legend-card") && !AB.toolbarDisabled) { const card = AB.legendCard([]); if (card) cv.append(card); }
        };
        requestAnimationFrame(() => { AB.tipSweep(document.getElementById("ab-app")); AB.scrollStops(document.getElementById("ab-app")); AB.placeNotice(); legendFloor(); AB.fitMiddle(document.getElementById("ab-app")); });
        // Focus was lost to the redraw (a toolbar toggle, a direct link): put it back where it was,
        // or on the place's heading, never on the page body
        if (!frame.overlay && !hadOverlay) setTimeout(() => {
            if (document.activeElement && document.activeElement !== document.body) return;
            const tool = focusTool && document.querySelector(`[data-tool="${focusTool}"]`);
            if (tool) return tool.focus();
            if (refocus(hadFocus)) return;
            // Back from a full-screen mode or another place: the control that opened it
            const prevSec = prevId && AB.sections[prevId];
            // the exact row that opened it first (three Sources rows open three Data page states)
            const opener2 = prevSec && prevId !== sec.id && (prevSec.region === "full" || prevSec.region === "workspace") && (document.querySelector(`[data-nav="#/${prevId}/${prevState}"]`) || document.querySelector(`[data-nav^="#/${prevId}"]`));
            if (opener2 && opener2.offsetParent !== null) return opener2.focus();
            const head = document.querySelector("#ab-left:not([hidden]) .ab-place-title") || document.querySelector("#ab-right .ab-insp-head .k-name");
            if (head) head.focus({ preventScroll: true });
        }, 0);
        // An overlay that places itself a frame later: focus its first item then
        if (frame.overlay && !first) setTimeout(() => { const f = [...$("ab-overlay").querySelectorAll(".k-menu-item:not([aria-disabled='true']), [tabindex='0'], input")].find((x) => x.getClientRects().length && !x.closest("[hidden]")); if (f && !$("ab-overlay").contains(document.activeElement)) f.focus(); }, 50);
        runDone();
    }
    AB.render = render;

    // "/": focus the find box of the Graph place on screen, else open the project's Graph place first
    // With `text` (Quick actions' hand-off) the box takes it and lists its results, as if typed
    function focusFind(text) {
        const box = () => document.querySelector("#ab-left:not([hidden]) .ab-treebar input");
        const put = (b) => { if (!b) return; b.focus(); if (text != null) { b.value = text; b.dispatchEvent(new Event("input")); } };
        const graphShown = route && refOf(route.frame.left) && refOf(route.frame.left).id === "graph-place" && !route.frame.overlay;
        if (graphShown && box()) return put(box());
        go("graph-place", placeOf(route ? route.frame.dataset : "lesmis", "graph") || "at-rest");
        setTimeout(() => put(box()), 120);
    }
    AB.focusFind = focusFind;

    // The paint tree changed (an eye, a solo, a move, a delete: lib.js raises "ab:paint"): the canvas region
    // is drawn again at once, so the drawing and its legend follow the tree (AB.paintRows, AB.soloRow)
    document.addEventListener("ab:paint", () => {
        const cv = $("ab-canvas"), ref = route && refOf(route.frame.canvas);
        if (!ref || cv.hidden || route.sec.region === "canvas") return;
        cv.replaceChildren();
        renderRegion(cv, "canvas", ref, false);
        requestAnimationFrame(() => { if (!cv.querySelector(".k-legend-card") && cv.querySelector(".k-stage") && !AB.toolbarDisabled) { const card = AB.legendCard([]); if (card) cv.append(card); } AB.fitMiddle(cv); });
    });

    // A run finishes: a route that shows a run in progress moves on to its finished state after the
    // estimate the Run button gave ("Under a second"), unless the reader has gone elsewhere. Les
    // Miserables lands on graph-place/finished (the row on top, painting, with its legend); the transfers'
    // April rerun on its April result (inspector-run-row/finished); the door entries on their graph place,
    // the new row on top.
    const RUN_DONE = {
        "analyze-popover/running": { lesmis: "graph-place/finished", doorEntries: "graph-place/door-entries-finished" },
        "graph-place/running": { lesmis: "graph-place/finished" },
        "inspector-run-row/running": { transactions: "inspector-run-row/finished" },
        "graph-place/transfers-running": { transactions: "inspector-run-row/finished" },
        "graph-place/door-entries-running": { doorEntries: "graph-place/door-entries-finished" },
    };
    function runDone() {
        const to = route && RUN_DONE[route.id + "/" + route.state];
        const next = to && to[route.frame.dataset || "lesmis"];
        if (!next) return;
        const at = location.hash;
        setTimeout(() => { if (location.hash === at) go(...next.split("/")); }, 900);
    }

    // ---------- one node selected from the canvas or the table (AB.selectNode) ----------
    // The keyboard walk itself (Shift+Arrow) is canvas-and-states'. This keeps the walk's cursor and
    // the node list it walks (AB.walkList): each project's node rows in file order. A selection opens
    // the project's node inspector (with the selection bar, raised by the frame); the inspector's
    // header names the node (AB.walked, read by AB.inspector).
    // ponytail: neighbor counts are counted from the fixture rows here; the element reports them.
    const walk = { ds: null, at: null };
    let walking = false; // set by a step, so the render it causes keeps the cursor
    function walkNodes(ds) {
        const X = AB.fx.datasets, D = X[ds];
        if (!D) return [];
        // the walk names nodes by the Name role and counts the edges Load made, so a new Name or Load redraws it
        const nk = JSON.stringify([AB.nameCols(ds), ds === "nested" ? [AB.nestedLoaded().co, AB.nestedLoaded().links] : null]);
        if (D._walk && D._walk.nk === nk) return D._walk;
        const count = (pairs) => { const n = {}; pairs.forEach(([a, b]) => { (n[a] = n[a] || new Set()).add(b); (n[b] = n[b] || new Set()).add(a); }); return (id) => (n[id] ? n[id].size : 0); };
        let out = [];
        if (ds === "lesmis") out = D.rows.map((r) => ({ name: r.label, neighbors: r.degree, at: "inspector-node/why-this-look" }));
        else if (ds === "transactions") out = D.rows.map((r) => ({ name: r.id, neighbors: r.degree, at: "inspector-node/transfers-node" }));
        else if (ds === "doorEntries") {
            const [people, buildings, entries] = D.tables;
            const n = count(entries.sample.map((e) => [String(+e.person_id), e.building_id]));
            const seen = new Set();
            people.sample.forEach((p) => { if (!seen.has(p.name)) { seen.add(p.name); out.push({ name: p.name, neighbors: n(String(+p.id)), at: "inspector-node/door-ana" }); } });
            buildings.sample.forEach((b) => out.push({ name: b.bldg, neighbors: n(b.bldg), at: "inspector-node/door-b1" }));
        } else if (ds === "wide") {
            const n = count(D.edgeRows.map((e) => [e.source, e.target]));
            out = D.nodeRows.map((r) => ({ name: AB.nameOf("wide", r), neighbors: n(r.id), at: "inspector-node/wide-data" }));
        } else if (ds === "nested") {
            // the edges Load made: co-author items (when they became edges) and the links rows
            const R = D.document.data.researchers, NL = AB.nestedLoaded(), pairs = [];
            if (NL.co === "edges") R.forEach((r) => r.relationships.coauthor_ids.forEach((c) => pairs.push([r.id, c])));
            if (NL.links) D.document.links.forEach((l) => pairs.push([l.source, l.target]));
            const n = count(pairs);
            out = R.map((r) => ({ name: AB.nameOf("nested", r), neighbors: n(r.id), at: "inspector-node/nested-data" }));
        } else if (ds === "plainJson") {
            const n = count(D.document.links.map((l) => [l.source, l.target]));
            out = D.document.nodes.map((r) => ({ name: AB.nameOf("plainJson", r), neighbors: n(r.id), at: "inspector-node/plain-data" }));
        }
        out.nk = nk;
        Object.defineProperty(D, "_walk", { value: out, enumerable: false, configurable: true });
        return out;
    }
    function walkTo(ds, i) {
        const list = walkNodes(ds);
        if (!list.length) { walk.at = null; AB.walked = null; return null; }
        walk.ds = ds;
        walk.at = (i + list.length) % list.length;
        const node = list[walk.at];
        AB.walked = { dataset: ds, index: walk.at, name: node.name, neighbors: node.neighbors, right: node.at };
        return node;
    }
    // Select one node of a project as the walk does (a canvas hot spot, a table row): its node
    // inspector, the selection bar, and the walk's cursor on it
    AB.walkList = walkNodes;
    // opts.focus false: focus stays where the click was (a table row), not on the canvas
    AB.selectNode = (ds, i, opts) => {
        const node = walkTo(ds, i);
        if (!node) return;
        // opts.at: another state of the same inspector (Find opens a node on its Data tab)
        const [id, state] = ((opts && opts.at) || node.at).split("/");
        if (opts && opts.at) AB.walked.right = opts.at; // the inspector names the node on that state too
        walking = true;
        if (location.hash === href(id, state)) render();
        else go(id, state);
        // the canvas keeps focus, not the hot spot: its focus ring would read as a second selection
        if (!opts || opts.focus !== false) setTimeout(() => { const s = document.querySelector("#ab-canvas .k-stage"); if (s) s.focus({ preventScroll: true }); }, 100);
    };
    // A canvas hot spot that selects its node: a button, Enter or Space too
    AB.selectHot = (el, ds, i) => {
        el.setAttribute("role", "button");
        el.tabIndex = 0;
        el.addEventListener("click", (e) => { e.stopPropagation(); AB.selectNode(ds, i); });
        el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); AB.selectNode(ds, i); } });
        return el;
    };
    AB.walked = null;
    // The node whose label the drawing shows at a point (AB.drawnLabels) is selected; false: no label there
    async function labelClick(x, y) {
        const img = [...document.querySelectorAll("#ab-canvas .k-stage > img")].find((i) => i.checkVisibility());
        if (!img || !route) return false;
        const ds = route.frame.dataset || "lesmis";
        const hit = (await AB.drawnLabels(img)).find((l) => x >= l.x - 2 && x <= l.x + l.w + 2 && y >= l.y - 2 && y <= l.y + l.h + 2);
        const i = hit ? walkNodes(ds).findIndex((n) => n.name === hit.name) : -1;
        if (i < 0) return false;
        AB.selectNode(ds, i);
        return true;
    }

    // ---------- keys and clicks the shell owns ----------
    // Undo and Redo, one behavior for the header's buttons and Ctrl+Z / Ctrl+Shift+Z: the selection slot
    // first, then the notice's own change (its Undo or Redo), else "Nothing to undo"
    const noticeAction = (word) => [...document.querySelectorAll("#ab-notice .k-toast-action")].find((b) => b.textContent.trim() === word);
    function undoLast() { if (restoreSelection()) return; const u = noticeAction("Undo"); if (u) u.click(); else AB.flash("Nothing to undo"); }
    function redoLast() { const r = noticeAction("Redo"); if (r) r.click(); else AB.flash("Nothing to redo"); }
    document.addEventListener("keydown", (e) => {
        const t = e.target;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        if (e.key === "Escape" && e.defaultPrevented) return;
        const mod = e.ctrlKey || e.metaKey;
        // Single keys fire wherever focus is, except in a text field (above), an open menu, popover,
        // dialog or list box (they own their letters for typeahead), or on a page that replaces the
        // places (the Data page, the start screen), where nothing is selected to write about
        const popup = t && t.closest && t.closest("#ab-overlay, [role=menu], [role=dialog], [role=listbox], [role=combobox]");
        const page = route && AB.sections[route.id] && ["workspace", "full"].includes(AB.sections[route.id].region);
        const free = !popup && !page && store.get("singleKeys") !== "off";
        // App keys never use W, A, S, D, Q, E, the arrows, = or -: graphty-element's canvas keys.
        // F2 (rename) belongs to the tree, the inspector header and the project name. Ctrl+G groups
        // what is selected: in the tree a folder (New folder), elsewhere a set (the selection bar's Create set). T is not a key: the time slider opens from the table's options.
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        // A key the menus and the shortcuts sheet advertise: the same action as its button or menu item,
        // else a notice that says what it would do. Never the browser's own (Ctrl+S, Ctrl+O, Ctrl+E).
        const press = (sel, fallback) => () => { const b = document.querySelector(sel); if (b && b.getAttribute("aria-disabled") !== "true") b.click(); else AB.flash(fallback); };
        const stub = (text) => () => AB.flash(text + " (not available yet)");
        // Ctrl+Z and Ctrl+Shift+Z act on the notice's own change first (its Undo or Redo), then the header's
        const redo = redoLast;
        const keys = [
            [() => mod && !e.shiftKey && !e.altKey && k === "z", undoLast],
            [() => mod && e.shiftKey && !e.altKey && k === "z", redo],
            // Off macOS, Ctrl+Y is Redo too (on a Mac, Cmd+Y is the browser's history)
            [() => e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && k === "y" && !IS_MAC, redo],
            [() => mod && !e.shiftKey && !e.altKey && k === "o", () => go(...AB.COMMANDS["open-file"].go)],
            [() => mod && !e.shiftKey && !e.altKey && k === "s", () => AB.COMMANDS.save.onClick()],
            [() => mod && e.shiftKey && !e.altKey && k === "s", stub("Save as")],
            [() => mod && !e.shiftKey && !e.altKey && k === "e", () => go("export-dialog")],
            [() => free && mod && !e.shiftKey && !e.altKey && k === "a", () => go("inspector-selection-and-everything", "selection")],
            [() => free && mod && !e.shiftKey && !e.altKey && k === "g", () => (t && t.closest && t.closest("#ab-left [role=tree]") ? ((route.frame.dataset || "lesmis") === "lesmis" ? go(...AB.COMMANDS["new-folder"].go) : AB.flash("New folder (not available yet)")) : press("#ab-toolbar [data-tool='Create set']", "Ctrl+G creates a set from the selection: select something first")())],
            [() => free && mod && e.shiftKey && !e.altKey && k === "h", press("#ab-toolbar [data-tool='Hide on canvas'], #ab-toolbar [data-tool='Show on canvas']", "Ctrl+Shift+H hides the selection on canvas: select something first")],
            // "/" puts focus in the Graph place's find box (the one find), opening the project's Graph place when another place shows
            [() => free && !mod && !e.altKey && e.key === "/", () => focusFind()],
            [() => free && !mod && !e.shiftKey && !e.altKey && k === "i", stub("I inverts the selection")],
            [() => free && !mod && !e.shiftKey && !e.altKey && k === "f", stub("F frames the selection")],
            [() => free && !mod && !e.altKey && e.key === "0", stub("0 fits the graph to the view")],
            [() => free && !mod && !e.altKey && ["1", "3", "7"].includes(e.key), stub(e.key + " turns the camera to the " + { 1: "front", 3: "side", 7: "top" }[e.key])],
            [() => mod && !e.shiftKey && e.key === ",", () => go("settings", "general")],
            [() => mod && !e.shiftKey && (e.key === "k" || e.key === "K"), () => go("commands-and-search", "quick-actions")],
            [() => mod && !e.shiftKey && (e.key === "b" || e.key === "B"), () => { shell.panels = shell.panels === "shown" ? "hidden" : "shown"; render(); AB.announce(shell.panels === "shown" ? "Panels shown" : "Panels hidden. Ctrl+B shows them"); }],
            [() => free && !mod && e.shiftKey && (e.key === "A" || e.key === "a"), () => go("analyze-popover", "open")],
            [() => free && !mod && !e.shiftKey && !e.altKey && (e.key === "p" || e.key === "P"), () => go("path-popover", "from-selection")],
            [() => free && !mod && !e.shiftKey && !e.altKey && (e.key === "l" || e.key === "L"), () => AB.setLegend(!AB.legendOn())],
            [() => free && !mod && e.key === "?", () => go("commands-and-search", "shortcuts")],
            [() => free && !mod && !e.shiftKey && !e.altKey && (e.key === "n" || e.key === "N"), () => AB.addNote()],
            [() => free && !mod && !e.altKey && e.key === "5", () => { shell.mode = route.frame.mode === "2d" ? "3d" : "2d"; render(); AB.announce(shell.mode === "2d" ? "2D view" : "3D view"); }],
            [() => free && !mod && e.shiftKey && e.key === "T", () => AB.toggleDock()],
        ];
        // F6 / Shift+F6: move between regions in their visual order (spec 3.8)
        if (e.key === "F6" && !mod) {
            e.preventDefault();
            const order = ["ab-top", "ab-rail", "ab-left", "ab-canvas", "ab-toolbar", "ab-dock", "ab-right"].map($).filter((r) => r && !r.hidden && r.offsetParent !== null);
            const cur = order.findIndex((r) => r.contains(document.activeElement));
            const next = order[(cur + (e.shiftKey ? -1 : 1) + order.length) % order.length];
            const target = next && (next.querySelector("[tabindex='0'], a[href], input") || next);
            if (target) { if (!target.hasAttribute("tabindex") && !/^(A|INPUT)$/.test(target.tagName)) target.tabIndex = -1; target.focus(); }
            return;
        }
        const hit = keys.find(([test]) => test());
        if (hit) { e.preventDefault(); hit[1](); }
        else if (e.key === "Escape" && route && AB.onPageCancel && !route.frame.overlay) { e.preventDefault(); AB.onPageCancel(); }
        else if (e.key === "Escape" && route && route.frame.overlay && route.id !== route.closeTo.id) { e.preventDefault(); AB.close(); }
        else if (e.key === "Escape" && hasSelection()) { e.preventDefault(); AB.clearSelection(); }
        else if (e.key === "Escape" && route && route.id !== route.closeTo.id) { e.preventDefault(); AB.close(); }
        // Nothing open: with design notes hidden (the participant view too) Esc brings them back
        else if (e.key === "Escape" && route && notesHidden() && !route.frame.overlay) { e.preventDefault(); setNotes(false); }
    });
    document.addEventListener("DOMContentLoaded", () => {
        // A click on empty canvas clears the selection (focus stays on the drawing, so Shift+Arrow walks from here)
        $("ab-canvas").addEventListener("click", async (e) => {
            const t = e.target;
            if (!route || t.closest("[data-picking]") || !(t.classList.contains("k-stage") || t.classList.contains("k-canvas") || (t.tagName === "IMG" && t.closest(".k-stage")))) return;
            // a node's label drawn on the canvas selects that node, as a hot spot does
            if (await labelClick(e.clientX, e.clientY)) return;
            const stage = $("ab-canvas").querySelector(".k-stage");
            if (stage) stage.focus({ preventScroll: true });
            AB.clearSelection();
        });
        document.body.append(h("button", { id: "ab-leave-study", class: "ab-leave-study", type: "button", "aria-label": "Show design notes", hidden: !notesHidden() || null, on: { click: () => setNotes(false) } }, "Review"));
        $("ab-overlay").addEventListener("click", (e) => { if (e.target === $("ab-overlay") || e.target.classList.contains("ab-modal-wrap")) AB.close(); });
        matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
        new MutationObserver(() => route && document.body.dataset.page === "app" && renderReview(($("ab-review").replaceChildren(), $("ab-review")), route.sec, route.state)).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        boot();
    });
    window.addEventListener("hashchange", () => AB.fx && render());

    // ---------- the door-entries example (the owner's): three CSV files, one graph ----------
    // Shared by data-page, data-place, inspector-attribute-and-filter-step and context-menus, so no
    // count is typed twice. `report` stands in for graphty-element's match report object: the app
    // renders it and counts nothing. `model` holds the model strip for each choice on entries.
    // The published Les Miserables edge list (Knuth 1993; the edges ../kit/gen-canvas.mjs draws), as
    // "source-target" row ids: kit/fixtures.json holds only the rows, so the shell carries the edges and
    // every count over them (a group's edges) is read from here, never typed
    const LESMIS_EDGES = "1-0 2-0 3-0 3-2 4-0 5-0 6-0 7-0 8-0 9-0 11-10 11-3 11-2 11-0 12-11 13-11 14-11 15-11 17-16 18-16 18-17 19-16 19-17 19-18 20-16 20-17 20-18 20-19 21-16 21-17 21-18 21-19 21-20 22-16 22-17 22-18 22-19 22-20 22-21 23-16 23-17 23-18 23-19 23-20 23-21 23-22 23-12 23-11 24-23 24-11 25-24 25-23 25-11 26-24 26-11 26-16 26-25 27-11 27-23 27-25 27-24 27-26 28-11 28-27 29-23 29-27 29-11 30-23 31-30 31-11 31-23 31-27 32-11 33-11 33-27 34-11 34-29 35-11 35-34 35-29 36-34 36-35 36-11 36-29 37-34 37-35 37-36 37-11 37-29 38-34 38-35 38-36 38-37 38-11 38-29 39-25 40-25 41-24 41-25 42-41 42-25 42-24 43-11 43-26 43-27 44-28 44-11 45-28 47-46 48-47 48-25 48-27 48-11 49-26 49-11 50-49 50-24 51-49 51-26 51-11 52-51 52-39 53-51 54-51 54-49 54-26 55-51 55-49 55-39 55-54 55-26 55-11 55-16 55-25 55-41 55-48 56-49 56-55 57-55 57-41 57-48 58-55 58-48 58-27 58-57 58-11 59-58 59-55 59-48 59-57 60-48 60-58 60-59 61-48 61-58 61-60 61-59 61-57 61-55 62-55 62-58 62-59 62-48 62-57 62-41 62-61 62-60 63-59 63-48 63-62 63-57 63-58 63-61 63-60 63-55 64-55 64-62 64-48 64-63 64-58 64-61 64-60 64-59 64-57 64-11 65-63 65-64 65-48 65-62 65-58 65-61 65-60 65-59 65-57 65-55 66-64 66-58 66-59 66-62 66-65 66-48 66-63 66-61 66-60 67-57 68-25 68-11 68-24 68-27 68-48 68-41 69-25 69-68 69-11 69-24 69-27 69-48 69-41 70-25 70-69 70-68 70-11 70-24 70-27 70-41 70-58 71-27 71-69 71-68 71-70 71-11 71-48 71-41 71-25 72-26 72-27 72-11 73-48 74-48 74-73 75-69 75-68 75-25 75-48 75-41 75-70 75-71 76-64 76-65 76-66 76-63 76-62 76-48 76-58";
    const DOOR_ENTRIES = {
        title: "Door entries, March 2026",
        graphName: "Door entries",
        frame: { project: "Door entries, March 2026" },
        tables: [
            { file: "people.csv", name: "people", rows: 412, columns: ["id", "name", "dept", "badge"],
                sample: [
                    { id: "1001", name: "Ana Ruiz", dept: "Facilities", badge: "B-20417" },
                    { id: "1002", name: "Tomas Lindqvist", dept: "Research", badge: "B-20418" },
                    { id: "1003", name: "Grace Okafor", dept: "Finance", badge: "B-20425" },
                    { id: "0007", name: "Wei Chen", dept: "Research", badge: "B-19003" },
                    { id: "1188", name: "Priya Nair", dept: "Legal", badge: "B-21140" },
                    { id: "1188", name: "Priya Nair", dept: "Legal", badge: "B-21141" },
                    { id: "1214", name: "Marek Novak", dept: "Security", badge: "B-21302" },
                    { id: "1390", name: "Lena Fischer", dept: "Operations", badge: "B-21877" },
                ] },
            { file: "buildings.csv", name: "buildings", rows: 9, columns: ["bldg", "site", "floors"],
                sample: [
                    { bldg: "B1", site: "North campus", floors: "6" },
                    { bldg: "B2", site: "North campus", floors: "4" },
                    { bldg: "B3", site: "North campus", floors: "2" },
                    { bldg: "B4", site: "Riverside", floors: "12" },
                    { bldg: "B5", site: "Riverside", floors: "3" },
                    { bldg: "B6", site: "Riverside", floors: "1" },
                    { bldg: "B7", site: "Lab park", floors: "5" },
                    { bldg: "B8", site: "Lab park", floors: "2" },
                    { bldg: "B9", site: "Lab park", floors: "" },
                ] },
            { file: "entries.csv", name: "entries", rows: 4212, columns: ["person_id", "building_id", "time"],
                sample: [
                    { person_id: "1001", building_id: "B1", time: "2026-03-02T07:58:14Z" },
                    { person_id: "1002", building_id: "B7", time: "2026-03-02T08:03:41Z" },
                    { person_id: "7", building_id: "B4", time: "2026-03-02T08:11:09Z" },
                    { person_id: "1188", building_id: "B1", time: "2026-03-02T08:12:55Z" },
                    { person_id: "1001", building_id: "B1", time: "2026-03-02T12:40:02Z" },
                    { person_id: "1530", building_id: "B2", time: "2026-03-03T09:20:33Z" },
                    { person_id: "1214", building_id: "B12", time: "2026-03-03T22:47:18Z" },
                    { person_id: "1390", building_id: "B8", time: "2026-03-04T06:30:51Z" },
                ] },
        ],
        report: {
            entries: { rows: 4212, distinctPersonIds: 423, bothEnds: 4180, missingPeople: 25, missingBuildings: 7, missingRows: 32, pairEdges: 1306, leadingZeroKeys: 3,
                // the element's report after an Add choice (one row per unmatched value; each new node makes one new pair)
                added: { people: { bothEnds: 4205, pairEdges: 1331, people: 436, buildings: 9 }, bldg: { bothEnds: 4187, pairEdges: 1313, people: 411, buildings: 16 }, both: { bothEnds: 4212, pairEdges: 1338, people: 436, buildings: 16 } },
                // stand-in for data.preview under One edge per Pair: one sample row per pair, its time combined
                // to earliest and latest, and how many entries it merged (the derived count)
                pairSample: [
                    { person_id: "1001", building_id: "B1", time: "2026-03-02T07:58:14Z", "time (latest)": "2026-03-27T17:12:40Z", count: 22 },
                    { person_id: "1002", building_id: "B7", time: "2026-03-02T08:03:41Z", "time (latest)": "2026-03-26T08:01:12Z", count: 9 },
                    { person_id: "7", building_id: "B4", time: "2026-03-02T08:11:09Z", "time (latest)": "2026-03-02T08:11:09Z", count: 1 },
                    { person_id: "1188", building_id: "B1", time: "2026-03-02T08:12:55Z", "time (latest)": "2026-03-19T12:44:03Z", count: 6 },
                    { person_id: "1530", building_id: "B2", time: "2026-03-03T09:20:33Z", "time (latest)": "2026-03-03T09:20:33Z", count: 1 },
                    { person_id: "1214", building_id: "B12", time: "2026-03-03T22:47:18Z", "time (latest)": "2026-03-03T22:47:18Z", count: 1 },
                    { person_id: "1390", building_id: "B8", time: "2026-03-04T06:30:51Z", "time (latest)": "2026-03-24T06:29:58Z", count: 4 },
                ] },
            transfers: { reversePairs: 26 },
            people: { rows: 412, repeatedKeys: 1, noEntries: 14 },
            buildings: { rows: 9, siteNames: 3 },
        },
        // What the last Load (or Edit's Apply) chose for the entries: "pair" (the worked example),
        // "row", or "nodes" (each entry a node). The loaded graph's canvas, inspector, table and Data
        // place read its counts from here. fresh: the graph was just made from the files through the
        // new-graph door, so it holds no notes yet; the fixture notes belong to the edited project.
        loaded: { per: "pair", add: null, fresh: false },
        // The fixture notes (Ana Ruiz and B1, the pair edge, B12) exist only in the project that was edited
        hasNotes() { return !this.loaded.fresh; },
        // Edges: one per pair or per matched row; as nodes, one link edge per matched column, so
        // an entry whose person_id (25 rows) or building_id (7 rows) is unmatched has one edge
        loadedEdges() {
            const e = this.report.entries, k = this.loaded.add, a = (k && e.added[k]) || e;
            if (this.loaded.per === "nodes") return 2 * e.rows - (k === "people" || k === "both" ? 0 : e.missingPeople) - (k === "bldg" || k === "both" ? 0 : e.missingBuildings);
            return this.loaded.per === "row" ? a.bothEnds : a.pairEdges;
        },
        // The weight the last Load chose: count under Pair, none under Row or as nodes
        loadedWeight() { return this.loaded.per === "pair" ? "count" : null; },
        // The node counts per type after the last Load: { person, building, entry, total, base, added: { person, building } }.
        // base is the nodes each table makes before an Add choice: people.csv's rows less its repeated
        // keys (the first is kept), so 412 rows make 411 person nodes
        loadedTypes() {
            const e = this.report.entries, k = this.loaded.add;
            const base = { person: this.tables[0].rows - this.report.people.repeatedKeys, building: this.tables[1].rows };
            const added = { person: k === "people" || k === "both" ? e.missingPeople : 0, building: k === "bldg" || k === "both" ? e.missingBuildings : 0 };
            const t = { person: base.person + added.person, building: base.building + added.building, entry: this.loaded.per === "nodes" ? e.rows : 0, base, added };
            t.total = t.person + t.building + t.entry;
            return t;
        },
        model: {
            row: { strip: "person (411) --entries (4,180 edges from 4,212 rows)--> building (9)", tip: "entries.person_id = people.id; entries.building_id = buildings.bldg; one edge per row: 4,180 edges" },
            pair: { strip: "person (411) --entries (1,306 edges from 4,180 of 4,212 rows)--> building (9)", tip: "entries.person_id = people.id; entries.building_id = buildings.bldg; one edge per pair: 1,306 edges; weight: count" },
            entryAsNode: { strip: "person (411) <--person_id-- entry (4,212) --building_id--> building (9)", tip: "entry.person_id = people.id; entry.building_id = buildings.bldg; each entry is a node with two edges and its time" },
        },
    };

    // Counts the kit's fixtures imply but do not list, worked out once at boot so no section types them:
    // lesmis.edgeList and each legend row's `edges` (both ends in that group); nested.derived (below)
    function derivedCounts(X) {
        const L = X.lesmis, group = {};
        L.rows.forEach((r) => { group[r.id] = String(r.group); });
        L.edgeList = LESMIS_EDGES.split(" ").map((p) => p.split("-"));
        L.frame.legend.rows.forEach((g) => { g.edges = L.edgeList.filter(([a, b]) => group[a] === g.label && group[b] === g.label).length; });
        // The nested export's edge sources: coauthor_ids items, the distinct pairs they name, affiliations
        // items, and the links rows whose target is a researcher (the rest point at institutions)
        const N = X.nested, R = N.document.data.researchers, ids = new Set(R.map((r) => r.id)), pairs = new Set();
        R.forEach((r) => r.relationships.coauthor_ids.forEach((c) => pairs.add([r.id, c].sort().join(" "))));
        N.derived = {
            coauthorItems: R.reduce((a, r) => a + r.relationships.coauthor_ids.length, 0),
            coauthorPairs: pairs.size,
            affiliations: R.reduce((a, r) => a + (r.attributes.affiliations || []).length, 0),
            linksToResearchers: N.document.links.filter((l) => ids.has(l.target)).length,
        };
    }

    // ---------- boot: fixtures, then every section file in the manifest, in order ----------
    async function boot() {
        try {
            const [fx, manifest, more] = await Promise.all([fetch("kit/fixtures.json").then((r) => r.json()), fetch("sections/manifest.json").then((r) => r.json()), fetch("kit/wide-nested.json").then((r) => r.json())]);
            // The door-entries example lives in the shell (kit/ is read-only); every section reads this one copy
            fx.datasets.doorEntries = DOOR_ENTRIES;
            // wide (300 hosts, 60+ attributes), nested (an API's nested JSON) and plainJson (node-link): generated by ../kit/gen-wide-nested.mjs
            Object.assign(fx.datasets, more);
            // The karate club has no frame in the fixtures: its header and graph row name it as a loaded file does
            const K = fx.datasets.karate;
            K.frame = K.frame || { project: K.title, file: K.file, graphRow: "Club ties" };
            [K, fx.datasets.ppi].forEach((D) => { D.graphName = D.graphName || D.frame.graphRow; });
            derivedCounts(fx.datasets);
            // The transfers' 40 sample rows hold none of the busiest accounts, so a ranking would top out at 15
            // while the summary says 907: the ten by degree join the rows (after them, so row indexes hold)
            const Tx = fx.datasets.transactions;
            Tx.topByDegree.forEach((r) => { if (!Tx.rows.some((x) => x.id === r.id)) Tx.rows.push(Object.assign({}, r)); });
            AB.fx = fx;
            AB.order = manifest;
            const shared = AB.projectCounts;
            await Promise.all(manifest.map((id) => new Promise((res) => {
                const s = document.createElement("script");
                s.src = "sections/" + id + ".js";
                s.onload = res;
                s.onerror = () => { console.error("Could not load sections/" + id + ".js"); res(); };
                document.head.append(s);
            })));
            // A section that still assigns AB.projectCounts itself has its counts kept as the base, and the
            // shared reader (which adds every Remove from data) put back: register with AB.countSource instead
            if (AB.projectCounts !== shared) {
                const own = AB.projectCounts;
                Object.keys(AB.fx.datasets).forEach((ds) => AB.countSource(ds, own));
                AB.projectCounts = shared;
                console.warn("A section assigns AB.projectCounts; register a project's counts with AB.countSource(dataset, fn)");
            }
            manifest.forEach((id) => { if (!AB.sections[id]) registerSection({ id, title: id, region: "overlay" }); });
            render();
        } catch (err) {
            document.body.replaceChildren(h("pre", { class: "ab-pad" }, "The skeleton needs to be served over HTTP (it fetches its fixtures and section files).\n" + err));
        }
    }
})();
