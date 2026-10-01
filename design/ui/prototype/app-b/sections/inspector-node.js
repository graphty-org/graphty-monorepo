/* Inspector: one node (Valjean in Les Miserables), in the shared inspector frame.
   Style tab: the collapsible "Why this look" list (spec 5.4) and nothing else: one line per row
   that wins a property, top first. Rows that match but win nothing are not listed; Memberships on
   the Data tab is their home. A token opens its property's popover (style-pickers/token-edit,
   "Valjean only -- writes to Overrides"); the edit lands in Overrides, which the tree then shows
   (the "edited" state), and Overrides' line clears with "-" on hover.
   Label positions stack like every property: each position is its own token on the line of the
   row that writes it ("Label above from Group 2", "Label below from Notes"). Labels keyed by position wait on graphty-element.
   Data tab: Summary (attributes, then results with rank; Degree selects the neighbors),
   Memberships, Notes. Notes: Valjean's 2 fixture notes (notes-place n4, n5) carry no author, as
   most notes will not; the count is the one link to them, so no name appears here. Plain ASCII.
   See ../README.md. */
(function () {
    "use strict";

    const EDIT_COLOR = "#E41A1C"; // the analyst's own pick in the edited state; the tree's Overrides swatch
    const PR_COLOR = "#662506"; // Valjean's PageRank, 0.0754, the top of the ramp

    function styleTab(state) {
        const edited = state === "edited";
        const lines = [
            edited ? { name: "Overrides", swatch: EDIT_COLOR, go: ["inspector-selection-and-everything", "overrides"], overrides: true,
                wins: ["color"], values: { color: EDIT_COLOR + ", set on Valjean by hand" } } : null,
            { name: "Notes", swatch: AB.icon(AB.ICON.note, "sm"), go: ["inspector-selection-and-everything", "notes-row"],
                wins: ["label below"], values: { "label below": "2, from Note count" } },
            { name: "PageRank", swatch: AB.ramp("#ef7818", "#662506"), go: ["inspector-measure-row", "style"],
                wins: edited ? [] : ["color"], values: { color: PR_COLOR + ", 0.0754, highest" } },
            // Degree is hidden from the list but still paints
            { name: "Degree", swatch: AB.ramp("#cfcfcf", "#4d4d4d"), go: ["inspector-measure-row", "degree"], hiddenRow: true,
                wins: ["size"], values: { size: "36, largest" } },
            // Two rows each write one label position, and both show: each position is its own token on its
            // row's line (labels keyed by position: a gap). Below is the Notes row's Note count, 2 for Valjean.
            { name: "Group 2", swatch: AB.chit(AB.fx.datasets.lesmis.groupColors["2"], true), go: ["inspector-group-set-path-row", "label-two"],
                wins: ["label above"], values: { "label above": "Valjean, from label" } },
            // Selection is read from the element's selection style, not from explain()
            { name: "Selection", swatch: AB.icon("scan", "sm"), go: ["inspector-selection-and-everything", "selection"],
                wins: ["color", "size"], values: { color: "#FFD700 at 40%", size: "1.45 times" } },
            // graphty-element's defaults still win the shape
            { name: "Everything", swatch: AB.icon("base-layer", "sm"), go: ["inspector-selection-and-everything", "everything"],
                wins: ["shape"], values: { shape: "Faceted sphere, the default look" } },
        ].filter(Boolean);
        return AB.whyThisLook(lines, { kind: "node", element: "Valjean",
            notes: ["Labels keyed by position (one token per position) need graphty-element's per-position label channels and explain() reporting them."] });
    }

    function dataTab() {
        const L = AB.fx.datasets.lesmis;
        const v = L.rows.find((r) => r.label === "Valjean");
        const rank = (value) => h("span", null, value, h("span", { class: "k-secondary" }, "  rank 1 of " + L.nodes));
        const toMeasure = { go: ["inspector-measure-row", "data"] };
        const degree = AB.data("Degree", rank(String(v.degree)), { go: ["selection-bar", "neighborhood"] });
        AB.tip(degree, "Select Valjean's " + L.valjeanNeighbors + " neighbors", { label: false });
        return AB.dataTab({
            Summary: {
                summary: "group " + v.group + ", PageRank 0.0754, degree " + v.degree,
                body: [
                    AB.data("id", h("span", { class: "k-mono" }, v.id)),
                    AB.data("label", v.label),
                    AB.data("group", String(v.group), { go: ["inspector-group-set-path-row", "group-2"] }),
                    AB.data("PageRank", rank("0.0754"), toMeasure),
                    AB.data("Betweenness", rank(String(v.betweenness)), toMeasure),
                    degree,
                ],
            },
            Memberships: {
                summary: "Community 1, Valjean to Javert, Watchlist, Group 2",
                body: [
                    AB.row({ icon: "circle-dot", swatch: AB.chit("#E69F00", true), label: "Community 1", go: ["inspector-group-set-path-row", "community-1"] }),
                    AB.row({ icon: "route", swatch: AB.chit("#D55E00"), label: "Valjean to Javert", go: ["inspector-group-set-path-row", "path-lesmis"] }),
                    AB.row({ icon: AB.ICON.set, swatch: AB.chit("#CC79A7", true), label: "Watchlist", go: ["inspector-group-set-path-row", "watchlist"] }),
                    AB.row({ icon: AB.ICON.set, swatch: AB.chit(L.groupColors["2"], true), label: "Group 2", go: ["inspector-group-set-path-row", "group-2"] }),
                ],
            },
            Notes: { count: 2, target: ["notes-place", "about-selection"] },
        }, { kind: "node" });
    }

    // ---------- the door entries: a person or a building (the targets of the door-entries notes) ----------
    // Unstyled as loaded, so only Selection and Everything paint; the Data tab reads the fixture row
    const DOOR = { "door-ana": { type: "person", t: 0, key: "id", id: "1001" }, "door-b1": { type: "building", t: 1, key: "bldg", id: "B1" } };
    function doorNode(el, state) {
        const D = AB.fx.datasets.doorEntries, d = DOOR[state], tbl = D.tables[d.t];
        const r = tbl.sample.find((x) => x[d.key] === d.id);
        const title = d.type === "person" ? r.name : r.bldg;
        const style = () => AB.whyThisLook([
            { name: "Selection", swatch: AB.icon("scan", "sm"), go: ["inspector-selection-and-everything", "selection"], wins: ["color", "size"], values: { color: "#FFD700 at 40%", size: "1.45 times" } },
            { name: "Everything", swatch: AB.icon("base-layer", "sm"), go: ["inspector-selection-and-everything", "everything"], wins: ["shape"], values: { shape: "Faceted sphere, the default look" } },
        ], { kind: "node", element: title });
        const data = () => AB.dataTab({
            Summary: {
                summary: d.type + ", " + tbl.columns.filter((c) => c !== d.key).map((c) => c + " " + (r[c] || "none")).join(", "),
                body: [AB.data("type", d.type)].concat(tbl.columns.map((c) => AB.data(c, c === d.key ? h("span", { class: "k-mono" }, r[c]) : r[c] || "none"))),
            },
            Notes: { count: AB.fx.datasets.doorEntries.hasNotes() ? 1 : 0, target: ["notes-place", "door-entries"] },
        }, { kind: "node" });
        el.append(AB.inspector({
            icon: d.type === "person" ? "user" : "building-2", title, kind: "Node, " + d.type, kindKey: "node",
            menu: ["context-menus", "node"],
            onRename: (name) => AB.flash("Renamed to " + name + " (sets this node's label; not wired in the skeleton)"),
            tab: "Data",
            tabs: { Style: style, Data: data },
        }));
    }

    registerSection({
        id: "inspector-node",
        title: "Inspector: one node",
        region: "right",
        rail: "graph",
        // One node selected: the selection bar (its verbs: Neighborhood, Path between, Create set, Hide, Add note)
        // sits above the toolbar on every door that lands here, as selection-bar/one-node draws it
        frame: (state) => (DOOR[state] ? { dataset: "doorEntries", left: "graph-place/door-entries" } : { left: "graph-place/at-rest", toolbar: "selection-bar/one-node" }),
        closeTo: "graph-place",
        states: [
            { id: "why-this-look", label: "Style tab (why this look)" },
            { id: "why-closed", label: "Why this look closed" },
            { id: "data", label: "Data tab" },
            { id: "edited", label: "A property edited (Overrides)" },
            { id: "door-ana", label: "Door entries: a person (Ana Ruiz)" },
            { id: "door-b1", label: "Door entries: a building (B1)" },
        ],
        render(el, state) {
            if (DOOR[state]) return doorNode(el, state);
            // The review states pin the remembered open or closed choice so each one is reachable
            if (state === "why-closed") AB.mem.set("sec.why.node", "0");
            else if (state !== "data") AB.mem.set("sec.why.node", "1");
            el.append(AB.inspector({
                icon: "circle-dot", title: "Valjean", kind: "Node", kindKey: "node",
                menu: ["context-menus", "node"],
                onRename: (name) => AB.flash("Renamed to " + name + " (sets this node's label; not wired in the skeleton)"),
                tab: state === "data" ? "Data" : "Style",
                tabs: { Style: () => styleTab(state), Data: dataTab },
            }));
        },
    });
})();
