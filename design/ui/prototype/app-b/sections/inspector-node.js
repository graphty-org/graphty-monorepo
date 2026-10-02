/* Inspector: one node (Valjean in Les Miserables), in the shared inspector frame.
   Style tab: the collapsible "Why this look" list (spec 5.4) and nothing else: one line per row
   that wins a property, top first. Rows that match but win nothing are not listed; Memberships on
   the Data tab is their home. A token opens its property's popover (style-pickers/token-edit,
   "Valjean only -- writes to Overrides"); the edit lands in Overrides, which the tree then shows
   (the "edited" state), and Overrides' line clears with "-" on hover.
   Tokens use the Style tab's names (Color, Size, Shape, Label, Opacity); a label line's position is in its
   tooltip. Under a winning line, the rows it covers ("Covers Louvain, ... and Betweenness for Color").
   A node whose label is hidden to avoid overlap offers Show label anyway (label-hidden, label-shown).
   Data tab: Summary (the attributes in use, then Results: rank, scope when run on a subset, bridges;
   Degree selects the neighbors; then "N more attributes"), Memberships, Notes. Notes: Valjean's 2 fixture notes (notes-place n4, n5) carry no author, as
   most notes will not; the count is the one link to them, so no name appears here. Plain ASCII.
   See ../README.md. */
(function () {
    "use strict";

    const EDIT_COLOR = "#E41A1C"; // the analyst's own pick in the edited state; the tree's Overrides swatch
    const PR_COLOR = "#662506"; // Valjean's PageRank, 0.0754, the top of the ramp

    // ponytail: the shared whyThisLook() draws its closed summary on its own wrapping line under the
    // head; closed must take one line, so the summary moves into the head and ends in an ellipsis
    // (the full list stays in its tooltip). Belongs in lib.js / app.css for edges and several too.
    // ponytail: three more things the shared whyThisLook() does not draw yet, added here after it draws
    // (all belong in lib.js, for edges and several elements too):
    //   - a line's `covered` rows ({ name, go }) under it, inside the block: "Covers A, B and C for Color",
    //     every covered row named and a link;
    //   - every token of a line (the helper shows two, then "+N"), so Selection reads Color Size Opacity;
    //   - the eye-off glyph on a row not listed in the tree that still paints (spec 5.4).
    function whyLook(lines, opts) {
        const s = AB.whyThisLook(lines, opts), sum = s.querySelector(":scope > .ab-sec-sum"), grow = s.querySelector(":scope > .k-section-head > .k-grow");
        if (sum && grow) {
            sum.style.cssText = "display:block;flex:1 1 0;min-width:0;margin:0 0 0 8px;padding:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:400";
            grow.replaceWith(sum);
        }
        const winners = lines.filter((l) => l.wins && l.wins.length);
        s.querySelectorAll(".ab-why-line").forEach((row, i) => {
            const l = winners[i];
            if (!l) return;
            const more = row.querySelector(".ab-token-more");
            // each extra token is drawn by the helper itself (one line, one property), so it opens what a token opens
            if (more) more.replaceWith(...l.wins.slice(1).map((p) => {
                const t = AB.whyThisLook([Object.assign({}, l, { wins: [p], swatch: null })], opts).querySelector(".ab-token");
                t.tabIndex = -1;
                return t;
            }));
            // three tokens wrap inside their own right-aligned cell rather than run past the panel's edge
            if (more) {
                row.style.cssText += ";height:auto;min-height:24px;padding-block:2px";
                row.querySelector(".ab-why-tokens").style.cssText = "flex-wrap:wrap;justify-content:flex-end;row-gap:2px;max-width:80px";
            }
            if (l.hiddenRow) row.querySelector(".ab-why-marks").append(AB.tip(h("span", null, AB.icon(AB.ICON.hidden, "sm")), "Not listed in the tree; it still paints", { label: false }));
            if (l.covered && l.covered.length) {
                const names = l.covered.map((r) => (r.go ? AB.link(r.go[0], r.go[1], r.name, { class: "ab-link", tabindex: "-1" }) : r.name));
                const joined = names.flatMap((n, j) => (j === 0 ? [n] : [j === names.length - 1 ? " and " : ", ", n]));
                row.after(h("div", { role: "listitem", class: "k-secondary", style: "padding:0 8px 2px 40px;line-height:18px" }, "Covers ", joined, " for " + l.coveredFor));
            }
        });
        return s;
    }

    // The one Selection line every node shows while it is selected: read from the element's selection
    // state (selection is not a style layer), so it carries Color, Size and Opacity
    const selectionLine = (wins = ["color", "size", "opacity"]) => ({ name: "Selection", swatch: AB.icon("scan", "sm"), go: ["inspector-selection-and-everything", "selection"],
        wins, values: { color: "#FFD700", size: "1.45 times", opacity: "40%" } });
    const everythingLine = (values) => ({ name: "Everything", swatch: AB.icon("base-layer", "sm"), go: ["inspector-selection-and-everything", "everything"],
        wins: ["shape"], values: Object.assign({ shape: "Faceted sphere, the default look" }, values) });
    const prLine = (wins, value) => ({ name: "PageRank", swatch: AB.ramp("#ef7818", "#662506"), go: ["inspector-measure-row", "style"], wins, values: { color: value } });
    // Degree is not listed in the tree but still paints
    const degreeLine = (v) => ({ name: "Degree", swatch: AB.ramp("#cfcfcf", "#4d4d4d"), go: ["inspector-measure-row", "degree"], hiddenRow: true,
        wins: ["size"], values: { size: AB.num(v.degree) } });
    const group2Line = (wins, value) => ({ name: "Group 2", swatch: AB.chit(AB.fx.datasets.lesmis.groupColors["2"], true), go: ["inspector-group-set-path-row", "label-two"], wins, values: { label: value } });

    // The rows PageRank covers for Color on this node: the paint order's covered rows (AB.covers), less the
    // kept groups the node is not in.
    // ponytail: the shell's PAINT_ORDER leaves out Betweenness (the "For the report" folder's measure, Color
    // on every node), so it is added here; add it to PAINT_ORDER and drop this.
    function prCovers(v) {
        return AB.covers("PageRank", "Color", "lesmis").filter((r) => !/^Group \d+$/.test(r.name) || r.name === "Group " + v.group)
            .concat([{ name: "Betweenness", go: ["inspector-measure-row", "covered"] }]);
    }

    function styleTab(state) {
        // The node on screen: Valjean, or the one the canvas walk, Find or a table row selected
        const L = AB.fx.datasets.lesmis, wi = walkedOn("lesmis");
        const v = (wi != null && L.rows[wi]) || L.rows.find((r) => r.label === "Valjean"), own = v.label === "Valjean";
        const edited = state === "edited" && own;
        const notes = own ? 2 : PAIR_NOTE.includes(v.label) ? 1 : 0, pr = (AB.lesmisPR || [])[L.rows.indexOf(v)];
        const lines = [
            edited ? { name: "Overrides", swatch: EDIT_COLOR, go: ["inspector-selection-and-everything", "overrides"], overrides: true,
                wins: ["color"], values: { color: EDIT_COLOR + ", set on Valjean by hand" },
                covered: [{ name: "PageRank", go: ["inspector-measure-row", "style"] }].concat(prCovers(v)), coveredFor: "Color" } : null,
            // Two rows each write a label line; the token is the Style tab's Label, its position in the tooltip
            notes ? { name: "Notes", swatch: AB.icon(AB.ICON.note, "sm"), go: ["inspector-selection-and-everything", "notes-row"],
                wins: ["label"], values: { label: "Below: " + notes + ", from Note count" } } : null,
            Object.assign(prLine(edited ? [] : ["color"], own ? PR_COLOR + ", 0.0754, highest" : pr == null ? "From its PageRank, on the ramp" : AB.num(pr) + ", from its PageRank, on the ramp"), { covered: prCovers(v), coveredFor: "Color" }),
            degreeLine(v),
            // Group 2's label lines paint only Group 2's members
            v.group === 2 ? group2Line(["label"], "Above: " + v.label + ", from label") : null,
            selectionLine(),
            // graphty-element's defaults still win the shape
            everythingLine(),
        ].filter(Boolean);
        return whyLook(lines, { kind: "node", element: v.label,
            notes: ["Labels keyed by position (each label line its own position) need graphty-element's per-position label channels and explain() reporting them."] });
    }

    // ---------- a node whose label is hidden to avoid overlap, and Show label anyway ----------
    // graphty-element hides a label that would overlap another (an element-owned rule, shown locked when it
    // wins). Show label anyway writes the node to one user style layer, "Labels shown anyway (this file)",
    // where such labels are listed, reordered or removed.
    const HIDDEN_LABEL = "Labarre"; // a one-edge neighbor of Valjean; the drawing does not label it
    const SHOWN_ANYWAY = "Labels shown anyway (this file)";
    function labelStyle(state, v) {
        const shown = state === "label-shown";
        const g2 = { name: "Group 2", go: ["inspector-group-set-path-row", "label-two"] };
        const lines = [
            shown ? { name: SHOWN_ANYWAY, swatch: AB.icon("tag", "sm"), wins: ["label"], values: { label: "Above: " + v.label + ", from label" }, covered: [g2], coveredFor: "Label" }
                : { name: "Label overlap", swatch: AB.icon("tag", "sm"), locked: true, wins: ["label"], values: { label: "Hidden: it would overlap Valjean's label" }, covered: [g2], coveredFor: "Label" },
            prLine(["color"], "From its PageRank, on the ramp"),
            degreeLine(v),
            selectionLine(),
            everythingLine(),
        ];
        return whyLook(lines, { kind: "node", element: v.label,
            notes: ["Hiding a label to avoid overlap, and explain() reporting it as a locked line, need a label collision rule in graphty-element."] });
    }

    // The Summary's two parts: what the file holds, then what runs computed (never mixed)
    const subhead = (text) => h("div", { role: "heading", "aria-level": "4", class: "k-secondary", style: "height:28px;display:flex;align-items:center;padding:0 16px;font-weight:550" }, text);
    // A result's value, then its rank ("#1 of 77", or a range "#1-#2" from a sampled run), then the
    // scope it was computed on when that is not the whole graph ("on 60 of 77")
    function ranked(value, rank, o = {}) {
        const r = h("span", { class: "k-secondary", tabindex: o.sampled ? "0" : null }, "  " + rank);
        if (o.sampled) AB.tip(r, "Sampled run: the rank is a range", { label: false });
        // In a narrow inspector the scope wraps as a whole under the value, never mid-phrase
        return h("span", { style: "white-space:normal" }, h("span", { style: "white-space:nowrap" }, value, r), o.scope ? [" ", h("span", { class: "k-secondary", style: "white-space:nowrap" }, o.scope)] : null);
    }
    // Valjean is the only neighbor of these five, so each edge to them is a bridge (Les Miserables)
    const BRIDGES_TO = ["Labarre", "Mme.deR", "Isabeau", "Gervais", "Scaufflaire"];
    // Bridges is an edge measure: a node reads how many result edges it touches, and a node on none reads
    // so in words, never a blank or a zero. The fixture holds Valjean's bridges; a one-edge node's edge is
    // always a bridge; Myriel's household (Mlle.Baptistine, Mme.Magloire) closes triangles with Myriel and
    // Valjean, so it is on none. Any other node's bridges are not in the fixture, so the row is left out.
    const NOT_ON_BRIDGE = ["Mlle.Baptistine", "Mme.Magloire"];
    const bridgesOf = (v) => (v.label === "Valjean" ? BRIDGES_TO.length : v.degree === 1 ? 1 : NOT_ON_BRIDGE.includes(v.label) ? 0 : null);
    const bridgesText = (n) => (n ? "On " + AB.count(n, "bridge edge") : "Not on a bridge edge");
    // The file's own attributes on a Les Miserables node: the ones in use, each with its role tag, then
    // "N more attributes" (the rest; the ones with no value counted, not listed), as on every project
    function lesmisFile(L, v, go) {
        const fields = AB.fieldsOf("lesmis").find((g) => g.element === "node").fields;
        // degree's use (Size) is the Degree row, shown under Results with its rank
        const inUse = fields.filter((x) => x.usedBy && x.name !== "degree"), rest = fields.filter((x) => !x.usedBy);
        const empty = rest.filter((x) => isEmpty(v[x.name])), shown = rest.filter((x) => !isEmpty(v[x.name]));
        const ds = ownDataset("lesmis:" + v.id, "nodes", shown);
        const list = AB.fieldList({ size: "panel", dataset: ds, results: false, notes: false, label: "Attributes with a value on " + v.label, empty: empty.map((x) => x.name), emptyWhere: "on " + v.label, trail: (x) => valueTrail(v[x.name]), onPick: (n) => AB.openField("lesmis", n) });
        return {
            inUse: [subhead("From " + L.file), AB.data("id", h("span", { class: "k-mono" }, v.id))]
                .concat(inUse.map((x) => AB.data(withRole(x.name, x.usedBy), String(v[x.name]), x.name === "group" && go ? { go } : undefined))),
            more: rest.length ? moreSection(rest.length, empty.length, list) : null,
        };
    }
    function dataTab(state) {
        const L = AB.fx.datasets.lesmis, wi = walkedOn("lesmis");
        if (state === "data-no-bridge") return walkedData(L, L.rows.find((r) => r.label === NOT_ON_BRIDGE[0]));
        if (state === "label-hidden" || state === "label-shown") return walkedData(L, L.rows.find((r) => r.label === HIDDEN_LABEL));
        if (wi != null && L.rows[wi] && L.rows[wi].label !== "Valjean") return walkedData(L, L.rows[wi]);
        const v = L.rows.find((r) => r.label === "Valjean");
        const of = "#1 of " + AB.num(L.nodes);
        // Betweenness here ran sampled on the 60 nodes the first filter step keeps
        const kept = L.filterSteps.after.step1;
        const bw = L.filterSteps.betweennessOnStep1, bwAt = bw.findIndex((x) => x.label === "Valjean") + 1;
        const toMeasure = { go: ["inspector-measure-row", "data"] };
        const degree = AB.data("Degree", ranked(String(v.degree), of), { go: ["selection-bar", "neighborhood"] });
        AB.tip(degree, "Select Valjean's " + L.valjeanNeighbors + " neighbors", { label: false });
        const bridges = bridgesText(bridgesOf(v));
        const file = lesmisFile(L, v, ["inspector-group-set-path-row", "group-2"]);
        // Every row that contains Valjean, one home: the kept set of the top nodes by degree included
        const top = AB.covers("PageRank", "Color", "lesmis").find((r) => /^Top \d+ by degree$/.test(r.name));
        return AB.dataTab({
            Summary: {
                summary: "group " + v.group + "; PageRank #1, Betweenness #" + bwAt + "-#" + (bwAt + 1) + ", Degree #1; " + bridges.toLowerCase(),
                body: file.inUse.concat([
                    subhead("Results"),
                    AB.data("PageRank", ranked("0.0754", of), toMeasure),
                    AB.data("Betweenness", ranked(AB.num(bw[bwAt - 1].betweenness), "#" + bwAt + "-#" + (bwAt + 1), { sampled: true, scope: "on " + AB.num(kept) + " of " + AB.num(L.nodes) }), toMeasure),
                    degree,
                    AB.data("Bridges", bridges),
                    h("div", { class: "k-secondary", style: "padding:0 8px 4px 16px" }, "to " + BRIDGES_TO.join(", ")),
                    file.more,
                ]),
            },
            Memberships: {
                summary: "Community 1, Valjean to Javert, " + (top ? top.name + ", " : "") + "Watchlist, Group 2",
                body: [
                    AB.row({ icon: "circle-dot", swatch: AB.chit("#E69F00", true), label: "Community 1", go: ["inspector-group-set-path-row", "community-1"] }),
                    AB.row({ icon: "route", swatch: AB.chit("#D55E00"), label: "Valjean to Javert", go: ["inspector-group-set-path-row", "path-lesmis"] }),
                    top ? AB.row({ icon: AB.ICON.set, swatch: AB.chit("#F0E442", true), label: top.name, go: top.go }) : null,
                    AB.row({ icon: AB.ICON.set, swatch: AB.chit("#CC79A7", true), label: "Watchlist", go: ["inspector-group-set-path-row", "watchlist"] }),
                    AB.row({ icon: AB.ICON.set, swatch: AB.chit(L.groupColors["2"], true), label: "Group 2", go: ["inspector-group-set-path-row", "group-2"] }),
                ],
            },
            Notes: { count: 2, target: ["notes-place", "about-selection"] },
        }, { kind: "node" });
    }

    // Any other node the canvas walk reaches: its own fixture row (id, label, group, degree,
    // betweenness), ranked over all 77 rows, its PageRank from the Nodes table's column, the tree's
    // rows that hold it, its group, and the notes whose subject holds it.
    // The tree's rows a walked node belongs to (the at-rest tree's sets and paths; the same members their
    // inspectors list), and the notes whose subject holds it
    const IN_ROWS = [
        { label: "Watchlist", icon: "circle-check", color: "#CC79A7", round: true, go: ["inspector-group-set-path-row", "watchlist"], has: ["Thenardier", "Mme.Thenardier", "Valjean", "Javert", "Eponine"] },
        { label: "Valjean to Javert", icon: "route", color: "#D55E00", go: ["inspector-group-set-path-row", "path-lesmis"], has: ["Valjean", "Javert"] },
        { label: "Myriel to Javert", icon: "route", color: "#0072B2", go: ["inspector-group-set-path-row", "path-lesmis-2"], has: ["Myriel", "Valjean", "Javert"] },
    ];
    const PAIR_NOTE = ["Valjean", "Javert"]; // the Sep 28 note about Valjean and Javert
    function walkedData(L, v) {
        const rank = (k) => "#" + (L.rows.filter((r) => r[k] > v[k]).length + 1) + " of " + AB.num(L.nodes);
        const group = "Group " + v.group, nb = bridgesOf(v), file = lesmisFile(L, v);
        const PR = AB.lesmisPR || [], i = L.rows.indexOf(v), pr = PR[i];
        const prRank = pr == null ? null : "#" + (PR.filter((x) => x > pr).length + 1) + " of " + AB.num(L.nodes);
        const top = AB.covers("PageRank", "Color", "lesmis").find((r) => /^Top \d+ by degree$/.test(r.name));
        const inTop = top && AB.topN(L.rows, (r) => r.degree, Number(top.name.match(/\d+/)[0])).includes(v);
        const rows = IN_ROWS.filter((r) => r.has.includes(v.label));
        const rowOf = (r) => AB.row({ icon: r.icon, swatch: AB.chit(r.color, r.round), label: r.label, go: r.go });
        return AB.dataTab({
            Summary: {
                summary: "group " + v.group + "; Degree " + rank("degree").replace(/ of .*/, "") + (nb == null ? "" : "; " + bridgesText(nb).toLowerCase()),
                body: file.inUse.concat([
                    subhead("Results"),
                    pr == null ? null : AB.data("PageRank", ranked(AB.num(pr), prRank), { go: ["inspector-measure-row", "data"] }),
                    AB.data("Degree", ranked(String(v.degree), rank("degree"))),
                    nb == null ? null : AB.data("Bridges", bridgesText(nb)),
                    file.more,
                ]),
            },
            Memberships: {
                summary: rows.map((r) => r.label).concat(inTop ? [top.name] : [], [group]).join(", "),
                body: [
                    ...rows.map(rowOf),
                    inTop ? AB.row({ icon: AB.ICON.set, swatch: AB.chit("#F0E442", true), label: top.name, go: top.go }) : null,
                    AB.row({ icon: AB.ICON.set, swatch: AB.chit(L.groupColors[String(v.group)] || "#808080", true), label: group })],
            },
            Notes: { count: PAIR_NOTE.includes(v.label) ? 1 : 0, target: ["notes-place", "all"] },
        }, { kind: "node" });
    }

    // ---------- the door entries: a person or a building (the targets of the door-entries notes) ----------
    // Unstyled as loaded, so only Selection and Everything paint; the Data tab reads the fixture row
    const DOOR = { "door-ana": { type: "person", t: 0, key: "id", id: "1001" }, "door-b1": { type: "building", t: 1, key: "bldg", id: "B1" } };
    function doorNode(el, state) {
        const D = AB.fx.datasets.doorEntries, d = DOOR[state], tbl = D.tables[d.t];
        // A person or building reached by the canvas walk shows its own row, as the header names it
        const W = AB.walked && AB.walked.dataset === "doorEntries" && AB.route && AB.route.frame.right === AB.walked.right ? AB.walked.name : null;
        const r = (W && tbl.sample.find((x) => (d.type === "person" ? x.name : x.bldg) === W)) || tbl.sample.find((x) => x[d.key] === d.id);
        const title = d.type === "person" ? r.name : r.bldg;
        const style = () => whyLook([
            selectionLine(),
            everythingLine(),
        ], { kind: "node", element: title });
        const data = () => AB.dataTab({
            Summary: {
                summary: d.type + ", " + tbl.columns.filter((c) => c !== d.key).map((c) => c + " " + (r[c] || "none")).join(", "),
                body: [AB.data("type", d.type)].concat(tbl.columns.map((c) => {
                    const used = ((AB.fieldsOf("doorEntries")[d.t] || { fields: [] }).fields.find((x) => x.name === c) || {}).usedBy;
                    return AB.data(used ? withRole(c, used) : c, c === d.key ? h("span", { class: "k-mono" }, r[c]) : r[c] || "none");
                })),
            },
            Notes: { count: r[d.key] === d.id && AB.fx.datasets.doorEntries.hasNotes() ? 1 : 0, target: ["notes-place", "door-entries"] },
        }, { kind: "node" });
        el.append(AB.inspector({
            icon: d.type === "person" ? "user" : "building-2", title, kind: "Node, " + d.type, kindKey: "node",
            menu: ["context-menus", "node"],
            onRename: (name) => AB.flash("Renamed to " + name + ""),
            tab: "Data",
            tabs: { Style: style, Data: data },
        }));
    }

    // ---------- the wide hosts and the nested researchers (spec 5.2, version 5) ----------
    // The Data tab: the attributes in use, then one disclosure, "N more attributes", holding the field
    // list (panel size) of the attributes that have a value on this node, each with its value; the
    // ones with no value are counted ("10 empty"), not listed. In use is the element's usedBy (the
    // shell's USED_BY stand-in, through AB.fieldsOf), so every count here is read, never typed.
    const VULN = "vuln_count_critical_unremediated_over_30_days";
    const WIDE_HOST = "monitor-prod-iad-03"; // 6 critical vulnerabilities over 30 days, the most of any host
    const isEmpty = (v) => v == null || v === "" || (Array.isArray(v) && !v.length);
    const walkedOn = (ds) => {
        const W = AB.walked;
        return W && W.dataset === ds && AB.route && AB.route.frame.right === W.right ? W.index : null;
    };
    function wideRow() {
        const D = AB.fx.datasets.wide, i = walkedOn("wide");
        return i != null ? D.nodeRows[i] : D.nodeRows.find((r) => r.hostname === WIDE_HOST);
    }
    const fmt = (v) => (typeof v === "boolean" ? (v ? "yes" : "no") : /^\d{4}-\d\d-\d\dT/.test(String(v)) ? String(v).replace("T", " ").replace(/:\d\dZ$/, "") : String(v));
    // A value at the end of a field list row: end ellipsis, the whole value in its tooltip
    const valueTrail = (v) => AB.tip(h("span", { class: "inn-val k-ellipsis", tabindex: "-1" }, fmt(v)), fmt(v), { label: false });
    // "N more attributes": read-only, so the shared collapsible section, open or closed remembered per kind
    function moreSection(count, empty, list) {
        const none = empty ? empty + " empty, not shown" : null;
        return AB.section({ title: AB.count(count, "more attribute"), collapsible: true, key: "data.node.more", summary: none },
            none ? h("div", { class: "inn-empty k-secondary" }, none) : null, h("div", { class: "inn-more" }, list));
    }
    // ponytail: the field list takes no subset of a project's fields, so the attributes with a value on
    // this node (the shared field objects from AB.fieldsOf, fill dropped: one node has a value or not)
    // are handed to it as a dataset of their own, already resolved; a `fields` option on AB.fieldList
    // would replace this.
    function ownDataset(key, table, fields) {
        const D = AB.fx.datasets[key] || (AB.fx.datasets[key] = {});
        // redefined every time: what is in use follows the tree on screen (a Size row added, or not)
        Object.defineProperty(D, "_fields", { value: [{ table, element: "node", fields: fields.map((x) => Object.assign({}, x, { fill: null })) }], enumerable: false, configurable: true });
        return key;
    }
    // What uses a field, after its value: the field list's In use tag
    // What uses a field: the boxed role tag after the name, as the edge inspector and the field lists' grid draw it, on one line
    // The name is already cut in the middle by its caller, so it never takes a second, end ellipsis (inspector-node.css)
    const withRole = (label, word) => h("span", { class: "inn-role", style: "display:inline-flex;align-items:center;gap:6px;max-width:100%;vertical-align:middle" },
        h("span", { style: "flex:none;white-space:nowrap" }, label), h("span", { style: "flex:none" }, AB.roleTag(word, { second: "what uses this attribute" })));
    // A flat record's Data tab (a host, a plain JSON node): in use, then "N more attributes"
    function wideData(state, src = "wide", r = wideRow(), name = AB.nameOf(src, r)) {
        const g0 = AB.fieldsOf(src).find((g) => g.element === "node"), fields = g0.fields;
        const inUse = fields.filter((x) => x.usedBy), rest = fields.filter((x) => !x.usedBy);
        const empty = rest.filter((x) => isEmpty(r[x.name])), shown = rest.filter((x) => !isEmpty(r[x.name]));
        const ds = ownDataset(src + ":" + r.id, g0.table, shown);
        const list = AB.fieldList({ size: "panel", dataset: ds, results: false, notes: false, label: "Attributes with a value on " + name, empty: empty.map((x) => x.name), emptyWhere: "on " + name, query: state === "wide-more" ? "vu cr" : "", trail: (x) => valueTrail(r[x.name]), onPick: (n) => AB.openField(src, n) });
        return AB.dataTab({
            Summary: {
                summary: inUse.filter((x) => x.name !== "id").map((x) => fmt(r[x.name])).join(", "),
                body: inUse.map((x) => AB.data(withRole(AB.truncMiddle(x.name, 24), x.usedBy), x.name === "id" ? h("span", { class: "k-mono" }, r.id) : h("span", { style: "white-space:nowrap" }, fmt(r[x.name]))))
                    .concat(moreSection(rest.length, empty.length, list)),
            },
            Notes: { count: 0, target: ["notes-place", "empty"] },
        }, { kind: "node" });
    }
    function wideStyle(r) {
        const sized = AB.route && AB.route.frame.left === "graph-place/wide-sized";
        const why = whyLook([
            sized && { name: VULN, swatch: AB.ramp("#cfcfcf", "#4d4d4d"), go: ["inspector-measure-row", "long-name"], wins: ["size"], values: { size: "Size by " + VULN + ": " + r[VULN] } },
            // the one Selection look every project uses (Les Miserables' why-this-look)
            selectionLine(sized ? ["color", "opacity"] : undefined),
            everythingLine({ color: "Gray, the default", size: "1, the default" }),
        ].filter(Boolean), { kind: "node", element: AB.nameOf("wide", r) });
        // An attribute name takes the middle ellipsis (spec 5.4): the row named for its attribute
        why.querySelectorAll(".ab-why-name").forEach((n) => { if (n.textContent === VULN) n.replaceChildren(AB.truncMiddle(VULN, 22)); });
        return why;
    }
    function wideNode(el, state) {
        if (state === "wide-why") AB.mem.set("sec.why.node", "1");
        else { AB.mem.set("sec.data.node.summary", "1"); AB.mem.set("sec.data.node.more", state === "wide-more" ? "1" : "0"); }
        const r = wideRow();
        el.append(AB.inspector({
            icon: "cpu", title: AB.nameOf("wide", r), kind: "Node, host", kindKey: "node",
            menu: ["context-menus", "node"],
            onRename: (name) => AB.flash("Renamed to " + name + ""),
            tab: state === "wide-why" ? "Style" : "Data",
            tabs: { Style: () => wideStyle(r), Data: () => wideData(state) },
        }));
        if (state === "wide-more") setTimeout(() => { const f = el.querySelector(".ab-fl-find input"); if (f) f.focus(); }, 0);
    }

    // The nested researchers: a sub-object's values show under their dotted paths (in Summary and in
    // "N more", where a long path takes the middle ellipsis), tags is a list, and a value kept whole
    // (affiliations, addresses) reads as a collapsed tree under its row.
    function nestedRow() {
        const R = AB.fx.datasets.nested.document.data.researchers, i = walkedOn("nested");
        return i != null ? R[i] : R[0];
    }
    const at = (rec, rel) => rel.split(".").reduce((o, k) => (o == null ? o : o[k]), rec);
    // A value kept whole: its item count, then the collapsed tree under its row (native disclosure)
    function wholeTree(v) {
        const lines = (o) => Object.keys(o).map((k) => (o[k] && typeof o[k] === "object"
            ? h("details", { class: "inn-node" }, h("summary", null, Array.isArray(o) ? "item " + (+k + 1) : k, h("span", { class: "k-secondary" }, " " + sizeOf(o[k]))), lines(o[k]))
            : h("div", { class: "inn-leaf" }, h("span", { class: "k-secondary" }, k), " ", o[k] == null ? "none" : fmt(o[k]))));
        return h("div", { class: "inn-tree", role: "group" }, lines(v));
    }
    const sizeOf = (v) => (Array.isArray(v) ? (v.length === 1 ? "1 item" : v.length + " items") : "{" + Object.keys(v).length + " fields}");
    function nestedTrail(rec) {
        return (x) => {
            const v = at(rec, x.name);
            if (x.type === "list") return AB.tip(h("span", { class: "inn-val k-ellipsis" }, v.join(", ")), v.join(", "), { label: false });
            if (x.type !== "whole") return valueTrail(v);
            const chev = () => AB.icon(btn && btn.getAttribute("aria-expanded") === "true" ? "chevron-down" : "chevron-right", "sm");
            let btn = null;
            btn = h("span", { class: "inn-val inn-whole", style: "white-space:nowrap;gap:2px;flex:none", role: "button", tabindex: "0", "aria-expanded": "false", "aria-label": "Expand " + x.name + ", " + sizeOf(v) }, chev(), sizeOf(v));
            AB.tip(btn, x.name + ", kept as one value", { label: false });
            // the expander never clips: its row's name gives up the room (the field list cuts the name in the middle after this)
            requestAnimationFrame(() => { const n = btn.closest("[data-fl-row]"); if (n && n.querySelector(".ab-fl-name")) n.querySelector(".ab-fl-name").style.maxWidth = "52%"; });
            const flip = (e) => {
                e.stopPropagation();
                const row = btn.closest("[data-fl-row]"), next = row.nextElementSibling;
                if (next && next.classList.contains("inn-tree")) { next.remove(); btn.setAttribute("aria-expanded", "false"); btn.firstChild.replaceWith(chev()); return; }
                row.after(wholeTree(v));
                btn.setAttribute("aria-expanded", "true");
                btn.firstChild.replaceWith(chev());
            };
            btn.addEventListener("click", flip);
            btn.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), flip(e)));
            return btn;
        };
    }
    function nestedData() {
        const rec = nestedRow();
        const fields = AB.fieldsOf("nested").find((g) => g.table === "researchers").fields;
        // A Name built from several fields is one row, the Name, its parts in the tag
        const parts = AB.nameCols("nested", rec.type), joined = parts.length > 1;
        const inUse = fields.filter((x) => x.usedBy && !(joined && parts.includes(x.name)));
        const others = fields.filter((x) => !x.usedBy);
        const empty = others.filter((x) => isEmpty(at(rec, x.name)));
        const nameRow = joined ? [AB.data(withRole("Name", parts.map((c) => c.split(".").pop()).join(" + ")), AB.nameOf("nested", rec))] : [];
        // one flat list, each field named by its dotted path (x.name), so no folders
        const ds = ownDataset("nested:" + rec.id, "researchers", others.filter((x) => !isEmpty(at(rec, x.name))).map((x) => Object.assign({}, x, { parent: null, label: x.name })));
        const dotted = (x) => (x.parent ? x.parent + "." + x.label : x.label);
        const list = AB.fieldList({ size: "panel", dataset: ds, results: false, notes: false, label: "Attributes with a value on " + AB.nameOf("nested", rec), empty: empty.map(dotted), emptyWhere: "on " + AB.nameOf("nested", rec), trail: nestedTrail(rec), onPick: (name) => AB.openField("nested", name) });
        const rows = inUse.map((x) => AB.data(withRole(AB.truncMiddle(dotted(x), 26), x.usedBy), x.name === "id" ? h("span", { class: "k-mono" }, rec.id) : fmt(at(rec, x.name))));
        rows.splice(inUse.length && inUse[0].name === "id" ? 1 : 0, 0, ...nameRow); // the Name after the key
        return AB.dataTab({
            Summary: {
                summary: (joined ? [AB.nameOf("nested", rec)] : []).concat(inUse.filter((x) => x.name !== "id").map((x) => fmt(at(rec, x.name)))).join(", "),
                body: rows.concat(moreSection(others.length, empty.length, list)),
            },
            Notes: { count: 0, target: ["notes-place", "empty"] },
        }, { kind: "node" });
    }
    function nestedNode(el) {
        AB.mem.set("sec.data.node.summary", "1");
        AB.mem.set("sec.data.node.more", "1");
        const rec = nestedRow(), name = AB.nameOf("nested", rec);
        el.append(AB.inspector({
            icon: "user", title: name, kind: "Node, researcher", kindKey: "node",
            menu: ["context-menus", "node"],
            onRename: (n) => AB.flash("Renamed to " + n + ""),
            tab: "Data",
            tabs: {
                Style: () => whyLook([
                    selectionLine(),
                    everythingLine(),
                ], { kind: "node", element: name }),
                Data: nestedData,
            },
        }));
    }

    // The plain JSON project (Coauthors): one node of its node-link file, the walk's or the first
    function plainNode(el) {
        AB.mem.set("sec.data.node.summary", "1");
        const nodes = AB.fx.datasets.plainJson.document.nodes, i = walkedOn("plainJson");
        const r = nodes[i != null ? i : 0];
        el.append(AB.inspector({
            icon: "circle-dot", title: AB.nameOf("plainJson", r), kind: "Node", kindKey: "node",
            menu: ["context-menus", "node"],
            onRename: (n) => AB.flash("Renamed to " + n + ""),
            tab: "Data",
            tabs: {
                Style: () => whyLook([
                    selectionLine(),
                    everythingLine(),
                ], { kind: "node", element: AB.nameOf("plainJson", r) }),
                Data: () => wideData("plain-data", "plainJson", r),
            },
        }));
    }

    // ---------- the transfers: one account, the walk's or the first row ----------
    function transfersNode(el) {
        AB.mem.set("sec.data.node.summary", "1");
        const rows = AB.fx.datasets.transactions.rows, i = walkedOn("transactions");
        const r = rows[i != null ? i : 0];
        // The accounts file's own columns, then the run results; an empty alert column says so
        const fromFile = ["kind", "country", "riskScore", "flagged", "alertRule", "alertTime"], results = ["degree", "pagerank"];
        const val = (c) => (isEmpty(r[c]) ? h("span", { class: "k-secondary" }, "empty") : fmt(r[c]));
        // A directed weighted graph: the weighted in and out totals, named from the weight attribute
        // ("Total amount in"), never from a domain word. graphty-element does not compute them yet.
        const weight = AB.fieldsOf("transactions").flatMap((g) => g.fields).find((x) => x.usedBy === "Weight");
        const wName = weight ? String(weight.label || weight.name).replace(/ \(edge\)$/, "") : null;
        const totals = AB.fx.datasets.transactions.directed && wName ? ["in", "out"].map((d) => AB.data("Total " + wName + " " + d,
            h("span", null, h("span", { class: "k-secondary" }, "(not available yet) "), AB.needsElement("graphty-element computes a node's weighted in and out totals (the sum of the weight on its incoming and on its outgoing edges) on a directed weighted graph; it does not yet.")))) : [];
        el.append(AB.inspector({
            icon: "circle-dot", title: r.id, kind: "Node, account", kindKey: "node",
            menu: ["context-menus", "node"],
            onRename: (n) => AB.flash("Renamed to " + n + ""),
            tab: "Data",
            tabs: {
                Style: () => whyLook([
                    selectionLine(),
                    everythingLine(),
                ], { kind: "node", element: r.id }),
                Data: () => AB.dataTab({
                    Summary: {
                        summary: r.kind + ", " + r.country + ", degree " + r.degree,
                        body: [subhead("From " + AB.fx.datasets.transactions.accountsFile), AB.data("id", h("span", { class: "k-mono" }, r.id))]
                            .concat(fromFile.map((c) => AB.data(c, val(c))), subhead("Results"), results.map((c) => AB.data(c, val(c))), totals),
                    },
                    Notes: { count: 0, target: ["notes-place", "many"] },
                }, { kind: "node" }),
            },
        }));
    }

    // ---------- a row bound to a path that reads nothing (spec 11.4) ----------
    // graphty-element raises E_UNKNOWN_ATTRIBUTE with the path instead of painting nothing, and explain()
    // reports it on the line of the row it concerns: the problem block sits under that line.
    const BAD = { row: "Appearances", path: "appearances.total" };
    function unknownPathStyle() {
        const why = whyLook([
            { name: "Notes", swatch: AB.icon(AB.ICON.note, "sm"), go: ["inspector-selection-and-everything", "notes-row"], wins: ["label"], values: { label: "Below: 2, from Note count" } },
            { name: "PageRank", swatch: AB.ramp("#ef7818", "#662506"), go: ["inspector-measure-row", "style"], wins: ["color"], values: { color: PR_COLOR + ", 0.0754, highest" } },
            { name: BAD.row, swatch: AB.ramp("#cfcfcf", "#4d4d4d"), go: ["inspector-measure-row", "degree"], wins: ["size"], values: { size: "Nothing: " + BAD.path + " reads nothing" } },
            group2Line(["label"], "Above: Valjean, from label"),
            selectionLine(),
            everythingLine(),
        ], { kind: "node", element: "Valjean", notes: ["The error on a line needs graphty-element's styles.explain() to report E_UNKNOWN_ATTRIBUTE on the row it concerns."] });
        const tok = why.querySelector('[aria-label="Size from ' + BAD.row + '"]');
        const line = tok && tok.closest(".ab-why-line");
        if (line) line.after(h("div", { role: "listitem", class: "inn-why-problem" }, AB.problem({
            what: BAD.row + " reads nothing: no attribute at " + BAD.path,
            todo: "Valjean keeps the size beneath it. Bind Size to an attribute that exists.",
            action: { label: "Edit binding", go: ["style-pickers", "binding"] },
        })));
        return why;
    }

    const WIDE = { "wide-data": 1, "wide-more": 1, "wide-why": 1 };
    const OTHER_NODE = { "label-hidden": HIDDEN_LABEL, "label-shown": HIDDEN_LABEL, "data-no-bridge": NOT_ON_BRIDGE[0] };
    registerSection({
        id: "inspector-node",
        title: "Inspector: one node",
        region: "right",
        rail: "graph",
        // One node selected: the shell raises the selection bar (selection-bar/one-node) on every door that lands here
        frame: (state) => (DOOR[state] ? { dataset: "doorEntries", left: "graph-place/door-entries" }
            : state === "wide-why" ? { dataset: "wide", left: "graph-place/wide-sized", canvas: "canvas-and-states/hosts-legend" }
            : WIDE[state] ? { dataset: "wide", left: "graph-place/at-rest" }
                : state === "nested-data" ? { dataset: "nested", left: "graph-place/at-rest" }
                    : state === "plain-data" ? { dataset: "plainJson", left: "graph-place/at-rest" }
                    // no left panel: the account opens beside the transfers place the reader was in
                    : state === "transfers-node" ? { dataset: "transactions" }
                    // a state about another node than Valjean puts the canvas walk on it, so the drawing's
                    // selection ring and the selection bar name the node the inspector shows
                    : OTHER_NODE[state] ? { left: "graph-place/at-rest", walk: AB.fx.datasets.lesmis.rows.findIndex((r) => r.label === OTHER_NODE[state]) + 1 }
                    : { left: "graph-place/at-rest" }),
        closeTo: "graph-place",
        states: [
            { id: "why-this-look", label: "Style tab (why this look)" },
            { id: "why-closed", label: "Why this look closed" },
            { id: "data", label: "Data tab" },
            { id: "edited", label: "A property edited (Overrides)" },
            { id: "door-ana", label: "Door entries: a person (Ana Ruiz)" },
            { id: "door-b1", label: "Door entries: a building (B1)" },
            { id: "wide-data", label: "Hosts: Data tab, in use and \"N more attributes\"" },
            { id: "wide-more", label: "Hosts: \"N more attributes\" open, searched \"vu cr\"" },
            { id: "wide-why", label: "Hosts: Why this look with a long attribute name" },
            { id: "nested-data", label: "Nested JSON: a researcher's Data tab" },
            { id: "plain-data", label: "Plain JSON (Coauthors): a node's Data tab" },
            { id: "transfers-node", label: "Transfers: an account's Data tab" },
            { id: "why-unknown-path", label: "Why this look: a row whose path reads nothing" },
            { id: "label-hidden", label: "Label hidden to avoid overlap (Labarre): Show label anyway" },
            { id: "label-shown", label: "Label shown anyway (Labarre)" },
            { id: "data-no-bridge", label: "Data tab: a node on no bridge edge (Mlle.Baptistine)" },
        ],
        render(el, state) {
            if (!document.querySelector("link[data-inn]")) document.head.append(h("link", { rel: "stylesheet", href: "sections/inspector-node.css", "data-inn": "" }));
            if (DOOR[state]) return doorNode(el, state);
            if (WIDE[state]) return wideNode(el, state);
            if (state === "nested-data") return nestedNode(el);
            if (state === "plain-data") return plainNode(el);
            if (state === "transfers-node") return transfersNode(el);
            // The review states pin the remembered open or closed choice so each one is reachable
            const dataState = state === "data" || state === "data-no-bridge";
            if (state === "why-closed") AB.mem.set("sec.why.node", "0");
            else if (!dataState) AB.mem.set("sec.why.node", "1");
            if (dataState) AB.mem.set("sec.data.node.summary", "1");
            // Labarre selected any other way (the canvas walk, a table row) lands on why-this-look or data,
            // and gets the same hidden label and Show label anyway as its own state
            const wi = walkedOn("lesmis"), L = AB.fx.datasets.lesmis;
            const hidden = state === "label-hidden" || (wi != null && L.rows[wi] && L.rows[wi].label === HIDDEN_LABEL && state !== "label-shown");
            const label = hidden || state === "label-shown", labelState = hidden ? "label-hidden" : state;
            const v = L.rows.find((r) => r.label === (label ? HIDDEN_LABEL : state === "data-no-bridge" ? NOT_ON_BRIDGE[0] : "Valjean"));
            el.append(AB.inspector({
                icon: "circle-dot", title: v.label, kind: "Node", kindKey: "node",
                menu: ["context-menus", "node"],
                onRename: (name) => AB.flash("Renamed to " + name + ""),
                // a lasting state: the label stays hidden until the reader shows it anyway
                stateBar: hidden ? { text: "Label hidden to avoid overlap", why: "Show label anyway adds " + v.label + " to the style layer " + SHOWN_ANYWAY + ", where such labels are listed, reordered or removed.",
                    actions: [{ label: "Show label anyway", go: ["inspector-node", "label-shown"] }] } : null,
                tab: dataState ? "Data" : "Style",
                tabs: { Style: () => (state === "why-unknown-path" ? unknownPathStyle() : label ? labelStyle(labelState, v) : styleTab(state)), Data: () => dataTab(state) },
            }));
            // The layer's full name, which the tree and the Why this look line cut short
            if (state === "label-shown") el.append(AB.notice(v.label + "'s label added to " + SHOWN_ANYWAY, { label: "Undo", go: ["inspector-node", "label-hidden"] }));
        },
    });
})();
