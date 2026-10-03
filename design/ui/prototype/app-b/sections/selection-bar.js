/* Selection bar, version 3: while something is selected, a second bar sits directly above the
   toolbar, drawn with the same 32 px icon buttons, tooltip and separators. Five verbs, in the node
   menu's order: Neighborhood, Path between, Create set, Hide on canvas (or Show on canvas), Add note. The same verbs are in
   the selection's context menu. The Neighborhood popover grows the selection from 1 edge away to
   1 to 3 edges away (and Out, In or Both on a directed graph) and commits as a filter step or as step groups.
   This section also patches the canvas it sits on: the drawing for the selection, and the "not
   drawn" line after Hide on canvas. Plain ASCII. */
(function () {
    "use strict";
    const act = AB.act;
    const C = (id) => AB.COMMANDS[id];

    // G opens Neighborhood (spec 2.3). The command record in lib.js carries no shortcut and app.js
    // binds no G yet, so the key is bound here, under the shell's single-key rule: not in a text
    // field, an open menu, popover, dialog or list box, nor with single keys off in Settings. It
    // presses the bar's own button, so G and the click are one door.
    // ponytail: move to app.js and COMMANDS.neighborhood.shortcut when the shell next changes.
    const NBR_KEY = C("neighborhood").shortcut || "G";
    document.addEventListener("keydown", (e) => {
        if (e.key !== "g" && e.key !== "G") return;
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.defaultPrevented) return;
        const t = e.target;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
        if (t && t.closest && t.closest("#ab-overlay, [role=menu], [role=dialog], [role=listbox], [role=combobox]")) return;
        if (AB.mem.get("singleKeys") === "off") return;
        const b = document.querySelector("#ab-toolbar [data-tool='Neighborhood']");
        e.preventDefault();
        if (b && b.getAttribute("aria-disabled") !== "true") b.click();
        else AB.flash("G shows a node's neighborhood: select a node first");
    });

    // The canvas drawing that shows each Les Miserables state's selection (fixture drawings only).
    const DRAWING = {
        "one-node": ["lesmis-groups-valjean", "Les Miserables colored by PageRank, Valjean selected"],
        "two-nodes": ["lesmis-groups-valjean", "Les Miserables colored by PageRank, Valjean and Javert selected"],
        neighborhood: ["lesmis-neighbors", "Les Miserables, Valjean selected with his 36 neighbors"],
        hidden: ["lesmis-groups-rest", "Les Miserables colored by PageRank, Valjean not drawn"],
        "long-name": ["lesmis-groups-valjean", "Les Miserables colored by PageRank, Jean Valjean selected"],
        "long-name-path": ["lesmis-groups-valjean", "Les Miserables colored by PageRank, Jean Valjean selected"],
        "filtered-to-neighbors": ["lesmis-groups-valjean", "Les Miserables filtered to Valjean's neighbors"],
    };

    // Both selected nodes carry the selection ring: copy Valjean's two rings onto Javert
    function ringJavert(doc) {
        const V = [698.7, 394.3], J = ["755.4", "392"];
        const at = (c, x, y) => c.getAttribute("cx") === String(x) && c.getAttribute("cy") === String(y);
        const circles = [...doc.querySelectorAll("circle")];
        const vFill = circles.find((c) => at(c, V[0], V[1]) && c.getAttribute("fill") !== "none");
        const jFill = circles.find((c) => at(c, J[0], J[1]) && c.getAttribute("fill") !== "none");
        if (!vFill || !jFill) return;
        const dr = +jFill.getAttribute("r") - +vFill.getAttribute("r");
        const rings = circles.filter((c) => at(c, V[0], V[1]) && c.getAttribute("fill") === "none" && c.getAttribute("stroke-width") === "2");
        rings.forEach((r) => { const k = r.cloneNode(); k.setAttribute("cx", J[0]); k.setAttribute("cy", J[1]); k.setAttribute("r", String(+r.getAttribute("r") + dr)); r.parentNode.append(k); });
    }
    // Hidden on canvas: the Les Miserables names Hide on canvas took out of sight, kept until shown
    // again, whatever is selected next. The tree footer and the canvas read AB.hiddenOnCanvas.
    const hiddenSet = AB.hiddenOnCanvas = AB.hiddenOnCanvas || new Set();
    // Where each character is drawn: the at-rest drawing marks no one, so its node circles are in row order
    let spots = null;
    fetch("kit/canvas/lesmis-groups-rest-light.svg").then((r) => r.text()).then((t) => {
        const doc = new DOMParser().parseFromString(t, "image/svg+xml");
        spots = [...doc.querySelectorAll("circle")].filter((c) => c.getAttribute("fill") !== "none").map((c) => [c.getAttribute("cx"), c.getAttribute("cy")]);
    }).catch(() => {});
    const spotOf = (name) => { const i = spots ? L().rows.findIndex((r) => r.label === name) : -1; return i >= 0 ? spots[i] : null; };
    // Each hidden node, its rings, its label and its edges are not drawn
    function hideNames(names, then) {
        const fn = (doc, theme) => {
            if (then) then(doc, theme);
            names.forEach((name) => {
                const V = spotOf(name);
                if (V) {
                    doc.querySelectorAll("circle").forEach((c) => { if (c.getAttribute("cx") === V[0] && c.getAttribute("cy") === V[1]) c.remove(); });
                    doc.querySelectorAll("line").forEach((l) => { if ((l.getAttribute("x1") === V[0] && l.getAttribute("y1") === V[1]) || (l.getAttribute("x2") === V[0] && l.getAttribute("y2") === V[1])) l.remove(); });
                }
                doc.querySelectorAll("text").forEach((t) => { if (t.textContent.trim() === name) t.remove(); });
            });
        };
        Object.defineProperty(fn, "name", { value: (then ? then.name : "") + "-hide-" + names.join("|") });
        return fn;
    }
    // Every Les Miserables drawing (canvas-and-states defines AB.lesmisDrawing, after this file loads)
    // leaves the hidden names out, whoever is selected next. canvas-and-states could read
    // AB.hiddenOnCanvas itself; until then the hiding is added here, around its drawing function.
    // The same wrapper applies a Filter to neighbors step on Valjean, so the canvas section's own
    // redraws (the walk ring, a new layout) keep only the nodes the step keeps.
    let inner = AB.lesmisDrawing;
    const hiding = (base, alt, edit, after) => {
        const f = lesmisFilter();
        if (f) {
            const keep = keepNear(f.hops, f.who), prev = after;
            after = prev ? Object.defineProperty((doc, theme) => { prev(doc, theme); keep(doc, theme); }, "name", { value: prev.name + "-" + keep.name }) : keep;
        }
        return inner(base, alt, edit, hiddenSet.size ? hideNames([...hiddenSet], after) : after);
    };
    Object.defineProperty(AB, "lesmisDrawing", { configurable: true, get: () => inner && hiding, set: (f) => { inner = f; } });

    // The Les Miserables names within `hops` edges of a node, the node first, read from the published
    // edges. The Neighborhood selection, its Covers line, the filter chip and the filtered drawing all
    // read this one list, so they never disagree.
    // ponytail: walked here over the fixture's edges; graphty-element's neighborhood returns the list
    function nearNames(who, hops) {
        const label = {};
        L().rows.forEach((r) => { label[r.id] = r.label; });
        let keep = new Set([who]);
        for (let i = 0; i < hops; i++) {
            const next = new Set(keep);
            L().edgeList.forEach(([a, b]) => { if (keep.has(label[a])) next.add(label[b]); if (keep.has(label[b])) next.add(label[a]); });
            keep = next;
        }
        return [...keep];
    }
    // Filtered to neighbors: only the nodes within the step's hops of its node, and the edges among
    // them, are drawn
    function keepNear(hops, who) {
        const fn = (doc) => {
            const key = (x, y) => x + "," + y;
            const lines = [...doc.querySelectorAll("line")].map((l) => [l, key(l.getAttribute("x1"), l.getAttribute("y1")), key(l.getAttribute("x2"), l.getAttribute("y2"))]);
            if (!spots) return;
            const keep = new Set(nearNames(who, hops).map(spotOf).filter(Boolean).map(([x, y]) => key(x, y)));
            const pts = [];
            doc.querySelectorAll("circle").forEach((c) => { const k = key(c.getAttribute("cx"), c.getAttribute("cy")); if (keep.has(k)) pts.push([+c.getAttribute("cx"), +c.getAttribute("cy")]); else c.remove(); });
            lines.forEach(([l, a, b]) => { if (!keep.has(a) || !keep.has(b)) l.remove(); });
            // a label sits just right of its node, 4 px lower
            doc.querySelectorAll("text").forEach((t) => {
                const x = +t.getAttribute("x"), y = +t.getAttribute("y");
                if (!pts.some(([cx, cy]) => x - cx >= 0 && x - cx < 40 && Math.abs(y - 4 - cy) < 3)) t.remove();
            });
        };
        Object.defineProperty(fn, "name", { value: "keepNear" + hops + "-" + who });
        return fn;
    }
    // A Les Miserables node other than Valjean is selected (the drawings with a selection all mark Valjean)
    const walkedOther = () => !!(AB.walked && AB.walked.dataset === "lesmis" && AB.walked.name !== "Valjean");
    function patchCanvas(state) {
        // ponytail: the selected node keeps its own ring; its neighbors get no ring until a drawing marks them
        if (state === "neighborhood" && walkedOther()) return;
        const cv = document.getElementById("ab-canvas");
        const d = DRAWING[state];
        // the node inspector's edited state draws its own canvas (Valjean in his Overrides color)
        // only the Les Miserables drawing has these selections; another project's canvas keeps its own
        if (!cv || !d || (AB.route && (AB.route.frame.right === "inspector-node/edited" || AB.route.frame.dataset !== "lesmis"))) return;
        const imgs = cv.querySelectorAll(".k-stage img");
        if (state === "two-nodes" && AB.tablePicks && AB.tablePicks.length > 2) return;
        const f = state === FILTERED ? filteredOf() : null;
        if (f && f.who !== "Valjean") return;
        // the filter itself is applied by the drawing wrapper above
        const after = state === "two-nodes" ? ringJavert : null;
        const alt = hiddenSet.size ? d[1].replace(/, Valjean not drawn$/, "") + ", " + [...hiddenSet].join(", ") + " not drawn" : d[1];
        if (imgs.length && AB.lesmisDrawing) AB.lesmisDrawing(d[0], alt, null, after).forEach((img, i) => { if (imgs[i]) imgs[i].replaceWith(img); });
        // "1 node not drawn" is said once, in the tree footer (graph-place), not again on the legend card
    }

    // A node whose name does not fit (60 characters): the bar's accessible name carries it whole; the
    // inspector header and the Path popover's From and To cut it with the end ellipsis (prose names
    // use k-ellipsis, never the middle one) and keep the full text in the tooltip. The bar itself
    // stays icons only, as the toolbar under it. To is a second long name, as picked on the canvas.
    const LONG = { from: "Jean Valjean, known as Madeleine, mayor of Montreuil-sur-Mer", to: "Inspector Javert of the Paris police, once a guard at Toulon" };
    const isLong = (state) => state === "long-name" || state === "long-name-path";
    function patchLongName() {
        const n = document.querySelector("#ab-right .ab-insp-head .k-name");
        if (!n || n.textContent === LONG.from) return;
        n.textContent = LONG.from;
        AB.tip(n, LONG.from, { label: false });
    }
    // The Path popover is path-popover's own; this state draws it and writes the two long names into
    // its From and To, again after each redraw (picking a field redraws the popover)
    function longPathPopover(el, ctx) {
        ctx.renderSection("path-popover/from-selection", el);
        const fill = () => el.querySelectorAll(".pp-pick").forEach((f) => {
            // only From and To: Scope is a pick field too, and keeps its own value
            const m = /^(From|To):/.exec(f.getAttribute("aria-label") || "");
            if (!m) return;
            const label = m[1], which = label.toLowerCase();
            const span = f.querySelector(".k-ellipsis");
            if (!span || span.textContent === LONG[which]) return;
            span.textContent = LONG[which];
            f.setAttribute("aria-label", label + ": " + LONG[which]);
            AB.tip(f, label + ": " + LONG[which], { label: false });
        });
        fill();
        const mo = new MutationObserver(fill);
        mo.observe(el, { childList: true, subtree: true });
        window.addEventListener("hashchange", () => mo.disconnect(), { once: true });
        // Esc, the X and a click outside close it to the long-name bar, not to Valjean's. The shell's
        // Esc skips a route that closes to its own section, so Esc and the X are routed here, as in
        // the Neighborhood popover
        if (AB.route) AB.route.closeTo = { id: "selection-bar", state: "long-name" };
        const shut = (e) => { if (e.type === "keydown" && e.key !== "Escape") return; e.preventDefault(); e.stopImmediatePropagation(); AB.close(); };
        el.addEventListener("keydown", shut);
        el.addEventListener("click", (e) => { if (e.target.closest(".k-popover-head [aria-label='Close']")) shut(e); }, true);
    }

    // Who is selected in each state
    const L = () => AB.fx.datasets.lesmis;
    const T = () => AB.fx.datasets.transactions.setsAndPaths;
    function subject(state) {
        if (state === "two-nodes") return AB.tablePicks && AB.tablePicks.length >= 2 ? { names: AB.tablePicks.join(", "), n: AB.tablePicks.length } : { names: "Valjean, Javert", n: 2 };
        if (state === "five-nodes") return { names: "Valjean, Javert, Thenardier, Fantine, Cosette", n: 5 };
        if (state === "neighborhood-directed") return { names: T().merchant.id, n: 1, directed: true };
        if (isLong(state)) return { names: LONG.from, n: 1 };
        // one element: the one the inspector shows (a node the canvas walk reached, a door-entries person)
        const head = document.querySelector("#ab-right .ab-insp-head .k-name");
        return { names: (AB.walked && AB.walked.name) || (head && head.textContent.trim()) || "Valjean", n: 1 };
    }

    // What Hide on canvas acts on: the rows Shift- or Ctrl-clicked in the table (the several-node
    // states), else the bar's subject. The table redraws when the inspector changes, so the rows
    // are counted as they are clicked.
    let picked = [];
    document.addEventListener("click", (e) => {
        const tr = e.target.closest && e.target.closest("#ab-dock tbody tr[data-who]");
        if (!tr) return;
        const who = tr.dataset.who;
        if (!(e.shiftKey || e.ctrlKey || e.metaKey)) picked = [who];
        else picked = picked.includes(who) ? picked.filter((x) => x !== who) : picked.concat(who);
    }, true);
    function selectedNames(state) {
        if (state === "two-nodes" && AB.tablePicks && AB.tablePicks.length > 1) return AB.tablePicks.slice();
        if (["two-nodes", "five-nodes"].includes(state) && picked.length > 1) return picked.slice();
        return subject(state).names.split(", ");
    }
    let lastSel = null, lastState = null;
    // Hide on canvas: what was selected before it joins the hidden set. Run from the frame too, so the
    // tree's footer (drawn before this bar) already counts it
    function hideSel() {
        // a row added to several selected ones keeps the same screen, so the rows are read again here
        lastSel = ["two-nodes", "five-nodes"].includes(lastState) ? selectedNames(lastState) : lastSel || selectedNames("one-node");
        if (other() === null) lastSel.forEach((n) => hiddenSet.add(n));
    }

    // Filter to neighbors: one filter step, counted by the header's filter chip. The state draws the
    // last one committed (a direct visit: Valjean, 1 hop) over the panels it was committed from.
    const FILTERED = "filtered-to-neighbors";
    let filtered = null;
    const filteredOf = () => filtered || { ds: "lesmis", who: "Valjean", hops: 1, dir: "both", frame: null };
    // The step on screen, on Les Miserables (the one drawing whose node positions this file knows)
    const lesmisFilter = () => {
        if (!AB.route || AB.route.id !== "selection-bar" || AB.route.state !== FILTERED) return null;
        const f = filteredOf();
        return f.ds === "lesmis" ? f : null;
    };
    function chipOf(f) {
        // counts only where the fixtures hold them: a listed node's degree (1 edge away, either way), and
        // the merchant's payers (its In step; the merchant's degree is not in the fixtures)
        const total = AB.projectCounts(f.ds) || {};
        const row = f.hops === 1 && f.dir === "both" && AB.walkList ? (AB.walkList(f.ds) || []).find((r) => r.name === f.who) : null;
        const n = f.ds === "lesmis" ? nearNames(f.who, f.hops).length
            : f.hops !== 1 ? null
            : f.ds === "transactions" && f.who === T().merchant.id && f.dir === "in" ? T().payers.count + 1
            : row && typeof row.neighbors === "number" ? row.neighbors + 1 : null;
        return n && total.nodes ? AB.count(n, "node", { of: total.nodes }) : "Filtered: neighbors of " + f.who;
    }
    // The transfers past the drawing limit stay a density drawing; the step keeps only the density
    // around the account, so the drawing visibly shrinks to the neighborhood. The shell redraws the
    // canvas after this bar, so the cut is a style rule on the stage, not an edit of its images.
    // ponytail: a fixed ellipse around the merchant's anchor; the element draws the real neighborhood
    function cutDensity() {
        const f = filteredOf(), r = 5 * f.hops;
        const a = (f.who === T().merchant.id && (T().anchors || {}).merchant) || { x: 50, y: 50 };
        const st = h("style", {}, `#ab-canvas .k-stage > img { clip-path: ellipse(${r}% ${r * 1.5}% at ${a.x}% ${a.y}%); }`);
        document.head.append(st);
        window.addEventListener("hashchange", () => st.remove(), { once: true });
    }
    function filteredFrame() {
        const f = filteredOf();
        const base = f.frame || { left: "graph-place/at-rest", right: "inspector-node/why-this-look" };
        return Object.assign({}, base, { chip: chipOf(f), filterOn: null });
    }

    // After a commit: the result is the selected row; the notice keeps only Undo. The shell clears
    // the notice slot on every route, so the notice is raised once the new route has drawn.
    function commit(to, text, undo) {
        window.addEventListener("hashchange", () => AB.notice(text, { label: "Undo", go: undo }), { once: true });
        AB.go(to[0], to[1]);
    }

    // A new set takes the next kind-plus-counter name and is announced where it lives
    const SET_TEXT = "Created 'Set 1' in Sets";

    // One edge: Neighborhood and Path between are a node's verbs, so the edge's bar leaves both out
    // (a contextual bar shows only what applies); Create set, Hide and Add note act on the edge
    function edgeBar() {
        const s = subject("one-edge");
        const here = [AB.route.id, AB.route.state];
        const ds = AB.route.frame.dataset;
        const tree = ["graph-place", AB.placeOf(ds, "graph") || "at-rest"];
        return AB.toolbarBar([
            AB.toolbarButton(AB.ICON.createSet, C("create-set").label, { key: C("create-set").shortcut, onClick: () => commit(tree, SET_TEXT, here) }),
            AB.toolbarButton(AB.ICON.hidden, C("hide-on-canvas").label, { key: C("hide-on-canvas").shortcut, open: false, onClick: () => AB.notice(s.names + " hidden on canvas", { label: "Undo", go: here }) }),
            "sep",
            AB.toolbarButton(AB.ICON.addNote, C("add-note").label, { key: C("add-note").shortcut, onClick: () => AB.addNote() }),
        ], "Selection: " + s.names);
    }

    // Another project than Les Miserables (the door entries, the hosts, the researchers, ...): the bar's
    // verbs act on it and land in its own places; the transfers' Neighborhood keeps its directed state
    const other = () => { const ds = AB.route && AB.route.frame.dataset; return ds && ds !== "lesmis" ? ds : null; };
    function bar(state) {
        if (state === "one-edge") return edgeBar();
        const s = subject(state);
        const hidden = state === "hidden";
        const ds = other();
        const here = [AB.route.id, AB.route.state];
        const back = ds ? here : state === "neighborhood-directed" ? ["selection-bar", "neighborhood-directed"] : ["selection-bar", state === "two-nodes" ? "two-nodes" : isLong(state) ? "long-name" : "one-node"];
        const tree = ["graph-place", (ds && AB.placeOf(ds, "graph")) || "at-rest"];
        // The node menu's order (explore, then organize, then visibility, then notes), one command record per verb
        return AB.toolbarBar([
            AB.toolbarButton("target", C("neighborhood").label.replace(/\.\.\.$/, ""), { key: NBR_KEY, popup: "dialog", open: state.startsWith("neighborhood"), go: ["selection-bar", s.directed || ds === "transactions" ? "neighborhood-directed" : "neighborhood"] }),
            AB.toolbarButton("route", C("find-paths").label.replace(/\.\.\.$/, ""), { key: C("find-paths").shortcut, popup: "dialog", open: state === "long-name-path", go: isLong(state) ? ["selection-bar", "long-name-path"] : C("find-paths").go }),
            "sep",
            AB.toolbarButton(AB.ICON.createSet, C("create-set").label, { key: C("create-set").shortcut, onClick: () => commit(tree, SET_TEXT, back) }),
            hidden
                ? AB.toolbarButton(AB.ICON.shown, "Show on canvas", { key: C("hide-on-canvas").shortcut, open: false, onClick: () => showAgain() })
                : AB.toolbarButton(AB.ICON.hidden, C("hide-on-canvas").label, { key: C("hide-on-canvas").shortcut, open: false, go: ["selection-bar", "hidden"] }),
            "sep",
            AB.toolbarButton(AB.ICON.addNote, C("add-note").label, { key: C("add-note").shortcut, onClick: () => AB.addNote() }),
        ], "Selection: " + s.names);
    }

    // Show on canvas and the notice's Undo: the names just hidden are drawn again
    function showAgain() {
        const names = lastSel || [];
        names.forEach((n) => hiddenSet.delete(n));
        // one character stays selected, as before Hide
        const i = names.length === 1 && other() === null ? L().rows.findIndex((r) => r.label === names[0]) : -1;
        if (i >= 0) AB.selectNode("lesmis", i); else AB.go("selection-bar", "one-node");
    }

    // ---------- Neighborhood: G selects one hop; the popover grows it in place ----------
    function neighborhoodPopover(anchor, directed) {
        const ds = !directed && other();
        // another project: the node the inspector shows, its own direction, and no counts the fixtures do not hold
        if (ds) directed = !!(AB.fx.datasets[ds] || {}).directed;
        const mine = !ds && !directed && walkedOther() ? AB.walked : null;
        const who = ds ? subject("one-node").names : directed ? (AB.walked && AB.walked.dataset === "transactions" ? AB.walked.name : T().merchant.id) : mine ? mine.name : "Valjean";
        const nbrs = !ds && !directed ? nearNames(who, 1).length - 1 : 0;
        let hops = 1, dir = "both";
        // An optional window on any date column of the project, a node's or an edge's: None by default,
        // so a project with no date column shows no Window line at all. graphty-element's neighborhood
        // takes depth and direction; a time window is not one of its options yet (the chip says so)
        const dsKey = ds || (directed ? "transactions" : "lesmis");
        const attrs = (AB.fx.datasets[dsKey] || {}).attributes || [];
        const dateCols = AB.fieldsOf(dsKey).flatMap((g) => g.fields.filter((f) => f.type === "time").map((f) => Object.assign({}, f, { element: g.element, table: g.table })));
        const day = (iso) => (iso || "").slice(0, 10);
        const spanOf = (f) => (attrs.find((a) => a.name === f.name || a.name === f.name + " (edge)") || {}).range || [];
        let col = null, from = "", to = "", pop = null;
        const winBox = h("span", { style: "display:flex;align-items:center;gap:4px;min-width:0" });
        const rangeBox = h("div");
        const dateBox = (label, get, set) => h("input", { type: "date", class: "k-field", style: "border:0;font:inherit;color-scheme:light dark", value: get(), min: day(spanOf(col)[0]) || null, max: day(spanOf(col)[1]) || null, "aria-label": label + " date, " + col.label,
            on: { change: (e) => { set(e.target.value); paint(); } } });
        function pickCol(f) {
            col = f;
            const s = f ? spanOf(f) : [];
            from = day(s[0]); to = day(s[1]);
            drawWindow();
            paint();
            // the popover grew or shrank by the From and To lines: place it above the toolbar again
            // ponytail: AB.position places once; a popover that changes height could re-place itself there
            if (pop) AB.position(pop, anchor, "auto");
        }
        function drawWindow() {
            const label = col ? col.label + " (" + col.table + ")" : "None";
            const pick = AB.field(label, { caret: true, onClick: (e) => AB.openFieldList(e.currentTarget, { label: "Date column",
                items: [{ label: "None", check: !col, onClick: () => pickCol(null) }].concat(dateCols.map((f) => ({ label: f.label, desc: "on each " + f.element + ", " + f.table, check: col && col.name === f.name, onClick: () => pickCol(f) }))) }) });
            pick.setAttribute("aria-label", "Window: " + label);
            winBox.replaceChildren(pick, AB.needsElement("graphty-element's neighborhood takes depth and direction; a window on a date column needs a time-range option"));
            rangeBox.replaceChildren(...(col ? [
                AB.fieldRow("From", dateBox("From", () => from, (v) => { from = v; }), { popover: true }),
                AB.fieldRow("To", dateBox("To", () => to, (v) => { to = v; }), { popover: true }),
            ] : []));
        }
        drawWindow();
        const dateWord = (d) => (d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "any date");
        const windowText = () => (col ? col.label + " " + dateWord(from) + " to " + dateWord(to) : "");
        const said = h("div", { role: "status", style: "color:var(--cm-text-secondary);padding:0 16px 8px" });
        const hopsBox = h("span"), dirBox = h("span");
        // Distance is counted in edges, the noun every domain shares ("hops" and "steps" are search aliases)
        const away = () => (hops === 1 ? "1 edge away" : "1 to " + hops + " edges away");
        const stepName = () => "Neighbors of " + who + ", " + away() + (directed && dir !== "both" ? ", " + dir : "") + (col ? ", " + windowText() : "");
        function paint() {
            // AB.seg is redrawn on each pick; focus returns to the picked option so arrows keep working
            const again = (box) => { paint(); const f = box.querySelector("[aria-checked='true']"); if (f) f.focus(); };
            hopsBox.replaceChildren(h("span", { style: "display:flex;align-items:center;gap:6px" }, AB.seg([1, 2, 3].map((n) => [n, String(n)]), hops, (n) => { hops = n; again(hopsBox); }, { label: "Distance in edges" }), h("span", { class: "k-caption" }, hops === 1 ? "edge away" : "edges away")));
            if (directed) dirBox.replaceChildren(AB.seg([["out", "Out"], ["in", "In"], ["both", "Both"]], dir, (d) => { dir = d; again(dirBox); }, { label: "Direction" }));
            // Counts only where the fixtures have them: Valjean's 36 neighbors; the 37 accounts that paid the merchant
            if (ds) said.textContent = "Covers: " + who + " and every node " + away() + (directed && dir === "out" ? " it points to" : directed && dir === "in" ? " that points to it" : "") + (col ? ", counting only " + (col.element === "edge" ? "edges" : "nodes") + " with " + windowText() : "") + ".";
            else if (!directed) said.textContent = hops === 1 ? "Covers: " + who + " and " + AB.count(nbrs, "neighbor") + "." : "Covers: " + who + " and " + AB.count(nearNames(who, hops).length - 1, "node") + " " + away() + ".";
            else if (col) said.textContent = "Covers: " + who + " and every account " + away() + (dir === "out" ? " that it pays" : dir === "in" ? " that pays it" : ", either way") + ", counting only " + (col.element === "edge" ? "transfers" : "accounts") + " with " + windowText() + ".";
            else if (hops === 1 && dir === "in" && who === T().merchant.id) said.textContent = "Covers: " + who + " and the " + T().payers.count + " accounts that paid it.";
            else said.textContent = "Covers: " + who + " and every account " + away() + (dir === "out" ? " that it pays." : dir === "in" ? " that pays it." : ", either way.");
        }
        paint();
        const back = ds ? ["selection-bar", "one-node"] : ["selection-bar", directed ? "neighborhood-directed" : "neighborhood"];
        const steps = ["graph-place", (ds && AB.placeOf(ds, "graph")) || "at-rest"];
        // Add as steps: one group row per distance (the breadth-first levels), on top of the tree under
        // the built-in rows, where graph-place draws AB.combinedRows. The node stays selected, so the
        // tree marks no other row. Only the Les Miserables tree reads AB.combinedRows today.
        function addSteps() {
            if (ds || directed) return commit(steps, "Added " + stepName() + ": one group per distance", back);
            const level = (d) => who + ", " + (d === 1 ? "1 edge away" : d + " edges away");
            const added = [1, 2, 3].slice(0, hops).map((d) => ({ id: "nbr-" + d, name: level(d), count: d === 1 ? nbrs : null, go: ["selection-bar", "one-node"] }));
            const names = added.map((r) => r.name);
            AB.combinedRows = (AB.combinedRows || []).filter((r) => !/^nbr-/.test(r.id)).concat(added);
            window.addEventListener("hashchange", () => AB.notice("Added " + AB.count(hops, "group row") + " on top of the tree, one per distance", { label: "Undo", onClick: () => {
                AB.combinedRows = AB.combinedRows.filter((r) => !names.includes(r.name));
                AB.go(back[0], back[1]);
            } }), { once: true });
            AB.go("selection-bar", "one-node");
        }
        const p = pop = AB.popover({
            anchor,
            title: "Neighborhood of " + who,
            width: 300,
            body: [
                AB.fieldRow("Distance", hopsBox, { popover: true }),
                AB.fieldRow("Direction", directed ? dirBox : h("span", { class: "k-caption" }, "Undirected graph"), { popover: true }),
                dateCols.length ? AB.fieldRow("Window", winBox, { popover: true }) : null,
                dateCols.length ? rangeBox : null,
                said,
            ],
            foot: [
                AB.button("Add as steps", { kind: "secondary", onClick: () => addSteps() }),
                AB.button("Filter to neighbors", { onClick: () => {
                    const fr = AB.route.frame;
                    // the panels it was committed from; the Les Miserables popover keeps Valjean's
                    // the Les Miserables step keeps the node it was opened on selected (Valjean on a direct visit)
                    filtered = { ds: ds || (directed ? "transactions" : "lesmis"), who, hops, dir: directed ? dir : "both",
                        frame: ds || directed ? { dataset: fr.dataset, left: fr.left, right: fr.right, canvas: fr.canvas, dock: false }
                            : mine ? { left: "graph-place/at-rest", right: mine.right, walk: mine.index + 1 } : null };
                    commit(["selection-bar", FILTERED], "Added filter step: " + stepName(), back);
                } }),
            ],
        });
        // Closing keeps the selection (Esc never clears it). The shell's Esc does nothing here, because
        // closeTo is this same section, and its X and outside click go to the Les Miserables bar; so
        // Esc and the X are routed here, and the transfers popover closes to its own graph place.
        // The Les Miserables popover closes to the neighborhood it selected, the inspector listing it
        const out = ds ? ["selection-bar", "one-node"] : directed ? ["graph-place", "many-groups"] : ["inspector-several-elements", "two-nodes"];
        if (!ds && !directed && AB.route) AB.route.closeTo = { id: out[0], state: out[1] };
        const shut = (e) => { e.preventDefault(); e.stopImmediatePropagation(); if (AB.route && AB.route.closeTo.id === out[0]) AB.close(); else AB.go(out[0], out[1]); };
        p.addEventListener("keydown", (e) => { if (e.key === "Escape") shut(e); });
        const x = p.querySelector(".k-popover-head [aria-label='Close']");
        if (x) x.addEventListener("click", shut, true);
        return p;
    }

    // Neighborhood selects one hop (spec): the node and its neighbors become the selection, which the
    // several-elements inspector lists (it reads AB.tablePicks, as from the node table)
    function selectNear(who) {
        AB.tablePicks = nearNames(who, 1);
        return "inspector-several-elements/two-nodes";
    }

    // On another project the one-node states keep its panels: the bar, its Neighborhood popover and Hide
    // act on the node the inspector shows, beside the same tree and canvas
    function keepProject(state) {
        const f = AB.route && AB.route.frame, ds = f && f.dataset;
        if (!ds || ds === "lesmis" || !["one-node", "neighborhood", "hidden"].includes(state)) return null;
        if (AB.route.id !== "selection-bar" && !(f.toolbar || "").startsWith("selection-bar/")) return null;
        const w = AB.walked && AB.walked.dataset === ds ? { walk: AB.walked.index + 1 } : {};
        return Object.assign({ dataset: ds, left: f.left, right: f.right, canvas: f.canvas }, w, state === "neighborhood" ? { dock: false, overlay: "selection-bar/neighborhood" } : { dock: f.dock });
    }
    // The selection is on the transfers (the walk or the panels): its Neighborhood is the directed one
    const onTransfers = () => (AB.walked ? AB.walked.dataset : AB.route && AB.route.frame.dataset) === "transactions";
    registerSection({
        id: "selection-bar",
        title: "Selection bar",
        region: "toolbar",
        rail: "graph",
        closeTo: "selection-bar/one-node",
        states: [
            { id: "one-node", label: "One node selected" },
            { id: "two-nodes", label: "Two nodes selected" },
            { id: "five-nodes", label: "Five nodes selected" },
            { id: "neighborhood", label: "Neighborhood popover, undirected" },
            { id: "neighborhood-directed", label: "Neighborhood popover, directed (transfers)" },
            { id: "hidden", label: "After Hide on canvas" },
            { id: "one-edge", label: "One edge selected" },
            { id: "long-name", label: "One node with a 60-character name" },
            { id: "long-name-path", label: "Path between from the 60-character name" },
            { id: FILTERED, label: "After Filter to neighbors" },
        ],
        // The Neighborhood popover is this section's own overlay, so Esc, the X and a click outside close it
        // Hide joins the hidden set here, before the canvas draws: the canvas puts its own drawing back
        // after the bar renders, so a hide added only in render() would leave the node drawn
        frame: (state) => (state === "hidden" && (!AB.route || AB.route.frame.dataset === "lesmis") ? hideSel() : null, keepProject(state)) || (state === FILTERED ? filteredFrame() : state === "neighborhood-directed" || (state === "neighborhood" && onTransfers())
            // the account the walk or a table row selected stays selected under the popover
            ? Object.assign({ dataset: "transactions", left: "graph-place/" + (AB.placeOf("transactions", "graph") || "many-groups"), right: false, dock: false, overlay: "selection-bar/neighborhood-directed" }, AB.walked && AB.walked.dataset === "transactions" ? { walk: AB.walked.index + 1 } : {})
            : state === "one-edge" ? { left: "graph-place/at-rest", right: "inspector-edge/style", dock: "table-dock/edges" }
            // Hide on canvas keeps the node it hid in the inspector (the walk stays on it), not Valjean
            : state === "hidden" && AB.walked && AB.walked.dataset === "lesmis" ? { left: "graph-place/at-rest", right: AB.walked.right, walk: AB.walked.index + 1 }
            // Neighborhood keeps the node the reader selected (found, clicked or walked to), not Valjean
            : state === "neighborhood" && walkedOther() ? { left: "graph-place/at-rest", right: selectNear(AB.walked.name), walk: AB.walked.index + 1, dock: false, overlay: "selection-bar/neighborhood" }
            : Object.assign({
                left: "graph-place/at-rest",
                right: state === "neighborhood" ? selectNear("Valjean") : state === "two-nodes" ? "inspector-several-elements/two-nodes" : state === "five-nodes" ? "inspector-several-elements/style" : "inspector-node/why-this-look",
            }, state === "neighborhood" ? { dock: false, overlay: "selection-bar/neighborhood" } : state === "long-name-path" ? { dock: false, overlay: "selection-bar/long-name-path" } : {})),
        render(el, state, ctx) {
            if (ctx.region === "overlay") {
                if (state === "long-name-path") return longPathPopover(el, ctx);
                el.append(neighborhoodPopover(document.querySelector("#ab-toolbar [data-tool='Neighborhood']"), state === "neighborhood-directed"));
                return;
            }
            // Hide on canvas (the bar, its key or a menu) hides what was selected before it: the walk
            // is cleared by then, so the selection is read on every other state of the bar
            if (state === "hidden") hideSel();
            else if (state !== "one-edge") { lastSel = selectedNames(state); lastState = state; }
            patchCanvas(state);
            if (state === FILTERED && filteredOf().ds === "transactions") cutDensity();
            if (isLong(state)) patchLongName();
            const b = bar(state);
            const wrap = h("div", { style: "display:flex;flex-direction:column;align-items:center;gap:8px;max-width:100%" });
            if (state === "hidden") {
                AB.notice(lastSel.join(", ") + " hidden on canvas", { label: "Undo", onClick: showAgain });
                wrap.append(h("div", { style: "display:flex;gap:6px;flex-wrap:wrap;justify-content:center" },
                    AB.needsElement("Hide on canvas only stops drawing: the node stays in the data, its results and the table. graphty-element needs a per-element visible flag that leaves layout and algorithms alone"),
                    AB.openQuestion("Does a hidden node stay selected, keeping this bar?")));
            }
            // Notes are graphty-element API, except a note on an edge picked on the canvas
            if (state === "one-edge") wrap.append(AB.needsElement("graphty-element's notes attach to a node, a set or the graph; a note on an edge needs an edge subject"));
            wrap.append(b);
            el.append(wrap);
            ctx.renderSection("toolbar/at-rest", el);
        },
    });
})();
