/* Inspector: one edge. Javert -- Valjean in Les Miserables (value 17, chapters shared), the one
   edge of the "Valjean to Javert" path row. Style tab: Why this look (collapsible; the rows that
   win a property, top first). Data tab: Summary (Direction, the attributes in use with the weight marked by a small
   scale icon, the results a run wrote to this edge, then "N more attributes"), Memberships,
   Notes (1 note: the fixture note about this edge; its meta line is the time alone, no author). Every verb is in the "..." menu, the edge's
   context menu. Plain ASCII. See ../README.md. */
(function () {
    "use strict";
    if (!document.querySelector("link[data-ie]")) document.head.append(h("link", { rel: "stylesheet", href: "sections/inspector-edge.css", "data-ie": "" }));
    const EVERY = ["inspector-selection-and-everything", "everything"];
    const PATH = ["inspector-group-set-path-row", "path-lesmis"];

    // The weight mark: a small scale icon after the weight attribute's name (spec 5.2), its meaning in
    // the tooltip, a link to where the weight is chosen. ponytail: the icon sprite has no "weight", so
    // lucide's is drawn here; it belongs in lib.js's EXTRA_ICONS and AB.ICON once a second place needs it.
    const WEIGHT_TIP = "set when loaded -- every run uses it unless the run picks another. Change it on the Data page";
    function weightMark(go) {
        const s = h("svg", { class: "k-i k-i-sm", viewBox: "0 0 24 24", "aria-hidden": "true" });
        s.innerHTML = '<circle cx="12" cy="5" r="3"/><path d="M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z"/>';
        const el = h("span", Object.assign({ class: "k-secondary", role: "link", style: "display:inline-flex;align-items:center;cursor:pointer" }, AB.act({ go })), s);
        return AB.tip(el, "Weight, " + WEIGHT_TIP);
    }
    const nameWithWeight = (name, go) => h("span", { style: "display:inline-flex;align-items:center;gap:4px" }, name, weightMark(go));

    function edge() {
        const L = AB.fx.datasets.lesmis;
        const by = Object.fromEntries(L.rows.map((r) => [r.label, r]));
        return { L, a: by.Javert, b: by.Valjean, value: 17, directed: !!L.directed }; // the table's Javert -- Valjean row
    }

    function styleTab() {
        return AB.whyThisLook([
            { name: "Valjean to Javert", swatch: "#D55E00", go: PATH, wins: ["color"], values: { color: "#D55E00, the path's color" } },
            // No Selection line: graphty-element's selectionStyle applies to nodes only (Node.ts)
            { name: "Everything", swatch: AB.icon("base-layer", "sm"), go: EVERY, wins: ["width", "pattern"], values: { width: "8", pattern: "Solid" } },
        ], { kind: "edge", element: "this edge" });
    }

    function dataTab(E, state) {
        const node = (n) => link("inspector-node", n.label === "Valjean" ? "why-this-look" : "data", n.label);
        const dir = E.directed ? "Directed" : "Undirected";
        const parts = AB.dataTab({
            Summary: {
                summary: dir.toLowerCase() + ", value " + E.value,
                body: [
                    AB.data("Direction", dir, { go: ["inspector-nothing-selected", "overview"] }),
                    AB.data("Ends", h("span", null, node(E.a), ", ", node(E.b))),
                    AB.data(nameWithWeight("value", ["data-page", "edit-graph-file"]), h("span", { class: "k-num" }, String(E.value))),
                    // Results: Shortest paths marked this edge as on its path (isInPath), so it carries a result
                    AB.data("In path", "yes, Shortest paths", { go: ["inspector-run-row", "data"] }),
                    // "N more attributes": value is the edge's one attribute and it is in use, so none are left
                    AB.empty("No more attributes"),
                    h("div", { class: "ab-cap" }, AB.openQuestion("Which end is listed first in an undirected graph: the file's order?")),
                ],
            },
            Memberships: { summary: "Valjean to Javert", body: [AB.row({ icon: "route", swatch: AB.chit("#D55E00"), label: "Valjean to Javert", go: PATH })] },
            Notes: { count: state === "no-notes" ? 0 : 1, target: ["notes-place", "about-selection"] },
        }, { kind: "edge" });
        // The meta line: the note's time (graphty-element stamps it), the full date in its tooltip.
        // No author: a name shows only when the project holds notes from two or more named people.
        const notes = parts[parts.length - 1].querySelector(".k-data");
        if (notes) notes.append(
            AB.tip(h("span", { class: "k-secondary", tabindex: "0" }, "Sep 28"), "Monday, September 28, 2026, 12:30", { label: false }));
        return parts;
    }

    // ---------- the door entries: the pair edge Ana Ruiz -> B1 (a door-entries note's target) ----------
    function doorPair(el) {
        const D = AB.fx.datasets.doorEntries, p = D.report.entries.pairSample[0], pair = D.loaded.per === "pair";
        const style = () => AB.whyThisLook([
            { name: "Everything", swatch: AB.icon("base-layer", "sm"), go: EVERY, wins: ["width", "pattern"], values: { width: "1", pattern: "Solid" } },
        ], { kind: "edge", element: "this edge" });
        const data = () => AB.dataTab({
            Summary: {
                summary: "directed, count " + p.count,
                body: [
                    AB.data("Direction", "Directed", { go: ["inspector-nothing-selected", "door-entries"] }),
                    AB.data("Ends", h("span", null, link("inspector-node", "door-ana", "Ana Ruiz"), " -> ", link("inspector-node", "door-b1", "B1"))),
                    pair ? AB.data(nameWithWeight("count", ["data-page", "edit-entries"]), h("span", { class: "k-num" }, String(p.count))) : null,
                    AB.data("time (earliest)", p.time.slice(0, 10)),
                    AB.data("time (latest)", p["time (latest)"].slice(0, 10)),
                ],
            },
            Notes: { count: AB.fx.datasets.doorEntries.hasNotes() ? 1 : 0, target: ["notes-place", "door-entries"] },
        }, { kind: "edge" });
        el.append(AB.inspector({
            icon: "spline", title: "Ana Ruiz -> B1", kind: "Edge, entries", kindKey: "edge", menu: ["context-menus", "edge"],
            renameDisabled: "An edge has no name field to store one in; the title is its two ends",
            tabs: { Style: style, Data: data }, tab: "Data",
        }));
    }


    // ---------- the IT estate: one connection, FL-271dc707, with 26 attributes ----------
    // The attributes in use (the field list's own In use: the key, the ends, the weight, the color)
    // come first; then one disclosure, "N more attributes", opening the field list in place with this
    // connection's value at each row's end; attributes with no value here are counted ("N empty").
    // The connection is one whose comment holds text. Counts are computed from the fixture.
    const WIDE_ID = "FL-271dc707";
    // a port, an id or a code is a label, not a quantity: no thousands separator
    function wideValue(v, name) {
        if (v == null) return null;
        if (typeof v === "number") return /(^|_)(port|id|code|year)$/.test(name || "") ? String(v) : v.toLocaleString("en-US");
        if (typeof v === "boolean") return v ? "true" : "false";
        if (/^\d{4}-\d\d-\d\dT/.test(v)) return v.slice(0, 16).replace("T", " ");
        return String(v);
    }
    function wideEdge(el) {
        const D = AB.fx.datasets.wide, e = D.edgeRows.find((r) => r.id === WIDE_ID);
        const hostOf = (id) => { const n = D.nodeRows.find((x) => x.id === id); return n ? AB.nameOf("wide", n) : id; };
        const fields = AB.fieldsOf("wide").find((g) => g.element === "edge").fields;
        const inUse = fields.filter((x) => x.usedBy && x.name !== "source" && x.name !== "target");
        const rest = fields.filter((x) => !x.usedBy);
        const filled = rest.filter((x) => e[x.name] != null), emptyN = rest.length - filled.length;
        const dir = D.directed ? "Directed" : "Undirected", arrow = D.directed ? " -> " : " -- ";
        const title = hostOf(e.source) + arrow + hostOf(e.target);
        // a value at the end of its row, end ellipsis, the whole value in its tooltip (as the node inspector)
        const valueOf = (x) => { const v = wideValue(e[x.name], x.name) || "no value"; return AB.tip(h("span", { class: "inn-val k-ellipsis", tabindex: "-1" }, v), v, { label: false }); };
        const used = inUse.map((x) => {
            const isWeight = x.name === "bytes_total_24h";
            const r = AB.data(isWeight ? nameWithWeight(x.name, ["data-place", "attributes-wide"]) : x.name,
                h("span", { class: x.name === "id" ? "k-mono" : "k-num" }, wideValue(e[x.name], x.name)));
            if (isWeight) r.classList.add("ie-keep");
            return r;
        });
        // "N more attributes": the node inspector's pattern -- the shared collapsible section holding
        // the field list (panel size) of this connection's own fields, each value at its row's end
        // the node inspector's styles for the same list (one layout for a node's and an edge's data)
        if (!document.querySelector("link[data-inn]")) document.head.append(h("link", { rel: "stylesheet", href: "sections/inspector-node.css", "data-inn": "" }));
        AB.mem.set("sec.data.edge.more", "1"); // open on this route, so the reader sees the values
        const X = AB.fx.datasets, key = "wide-edge:" + e.id;
        X[key] = X[key] || {};
        Object.defineProperty(X[key], "_fields", { value: [{ table: "connections", element: "edge", fields: filled.map((x) => Object.assign({}, x, { fill: null })) }], enumerable: false, configurable: true });
        const more = AB.section({ title: filled.length + " more attributes", collapsible: true, key: "data.edge.more", summary: emptyN + " empty, not listed" },
            h("div", { class: "k-secondary inn-empty" }, emptyN + " empty, not listed"),
            h("div", { class: "inn-more" }, AB.fieldList({ size: "panel", dataset: key, results: false, notes: false, label: "Attributes of this connection", empty: rest.filter((x) => e[x.name] == null).map((x) => x.name), emptyWhere: "on this connection", trail: valueOf, onPick: (name) => AB.openField("wide", name) })));
        const data = () => AB.dataTab({
            Summary: {
                summary: dir.toLowerCase() + ", " + e.protocol + ", " + wideValue(e.bytes_total_24h) + " bytes",
                body: [
                    AB.data("Direction", dir, { go: ["inspector-nothing-selected", "wide"] }),
                    AB.data("Ends", h("span", { style: "white-space:normal" }, hostOf(e.source), arrow, hostOf(e.target))),
                    ...used,
                    more,
                ],
            },
            Notes: { count: 0, target: ["notes-place", "empty"] },
        }, { kind: "edge" });
        const style = () => AB.whyThisLook([
            { name: "Everything", swatch: AB.icon("base-layer", "sm"), go: EVERY, wins: ["color", "width"], values: { color: "graphty-element's default", width: "graphty-element's default" } },
        ], { kind: "edge", element: "this connection" });
        el.append(AB.inspector({
            icon: "spline", title, kind: "Edge, connections", kindKey: "edge", menu: ["context-menus", "edge"],
            renameDisabled: "An edge has no name field to store one in; the title is its two ends",
            tabs: { Style: style, Data: data }, tab: "Data",
        }));
    }

    registerSection({
        id: "inspector-edge",
        title: "Inspector: one edge",
        region: "right",
        rail: "graph",
        frame: (state) => (state === "door-pair" ? { dataset: "doorEntries", left: "graph-place/door-entries", dock: "table-dock/door-entries" }
            : state === "wide-data" ? { dataset: "wide", left: "graph-place/at-rest", dock: "table-dock/wide" }
            : { left: "graph-place/at-rest", dock: "table-dock/edges" }),
        closeTo: "graph-place",
        states: [
            { id: "style", label: "Style tab (why this look)" },
            { id: "data", label: "Data tab" },
            { id: "no-notes", label: "Data tab, no notes" },
            { id: "door-pair", label: "Door entries: the pair Ana Ruiz -> B1" },
            { id: "wide-data", label: "IT estate: a connection with 26 attributes" },
        ],
        render(el, state) {
            if (state === "door-pair") return doorPair(el);
            if (state === "wide-data") return wideEdge(el);
            const E = edge();
            el.append(AB.inspector({
                icon: "spline",
                title: E.a.label + " -- " + E.b.label,
                kind: "Edge",
                kindKey: "edge",
                menu: ["context-menus", "edge"],
                renameDisabled: "An edge has no name field to store one in; the title is its two ends",
                tabs: { Style: styleTab, Data: () => dataTab(E, state) },
                tab: state === "style" ? "Style" : "Data",
            }));
        },
    });
})();
