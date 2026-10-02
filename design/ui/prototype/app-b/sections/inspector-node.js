/* Inspector: one node (Valjean in Les Miserables), in the shared inspector frame.
   Style tab: the collapsible "Why this look" list (spec 5.4) and nothing else: one line per row
   that wins a property, top first. Rows that match but win nothing are not listed; Memberships on
   the Data tab is their home. A token opens its property's popover (style-pickers/token-edit,
   "Valjean only -- writes to Overrides"); the edit lands in Overrides, which the tree then shows
   (the "edited" state), and Overrides' line clears with "-" on hover.
   Label positions stack like every property: each position is its own token on the line of the
   row that writes it ("Label above from Group 2", "Label below from Notes"). Labels keyed by position wait on graphty-element.
   Data tab: Summary (the file's attributes, then Results: rank, scope when run on a subset, bridges; Degree selects the neighbors),
   Memberships, Notes. Notes: Valjean's 2 fixture notes (notes-place n4, n5) carry no author, as
   most notes will not; the count is the one link to them, so no name appears here. Plain ASCII.
   See ../README.md. */
(function () {
    "use strict";

    const EDIT_COLOR = "#E41A1C"; // the analyst's own pick in the edited state; the tree's Overrides swatch
    const PR_COLOR = "#662506"; // Valjean's PageRank, 0.0754, the top of the ramp

    // ponytail: the shared whyThisLook() draws its closed summary on its own wrapping line under the
    // head; closed must take one line, so the summary moves into the head and ends in an ellipsis
    // (the full list stays in its tooltip). Belongs in lib.js / app.css for edges and several too.
    function whyLook(lines, opts) {
        const s = AB.whyThisLook(lines, opts), sum = s.querySelector(":scope > .ab-sec-sum"), grow = s.querySelector(":scope > .k-section-head > .k-grow");
        if (sum && grow) {
            sum.style.cssText = "display:block;flex:1 1 0;min-width:0;margin:0 0 0 8px;padding:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:400";
            grow.replaceWith(sum);
        }
        return s;
    }

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
        return whyLook(lines, { kind: "node", element: "Valjean",
            notes: ["Labels keyed by position (one token per position) need graphty-element's per-position label channels and explain() reporting them."] });
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
    function dataTab() {
        const L = AB.fx.datasets.lesmis;
        const v = L.rows.find((r) => r.label === "Valjean");
        const of = "#1 of " + AB.num(L.nodes);
        // Betweenness here ran sampled on the 60 nodes the first filter step keeps
        const kept = L.filterSteps.after.step1;
        const bw = L.filterSteps.betweennessOnStep1, bwAt = bw.findIndex((x) => x.label === "Valjean") + 1;
        const toMeasure = { go: ["inspector-measure-row", "data"] };
        const degree = AB.data("Degree", ranked(String(v.degree), of), { go: ["selection-bar", "neighborhood"] });
        AB.tip(degree, "Select Valjean's " + L.valjeanNeighbors + " neighbors", { label: false });
        const bridges = "On " + BRIDGES_TO.length + " bridge edges";
        return AB.dataTab({
            Summary: {
                summary: "group " + v.group + "; PageRank #1, Betweenness #" + bwAt + "-#" + (bwAt + 1) + ", Degree #1; " + bridges.toLowerCase(),
                body: [
                    subhead("From " + L.file),
                    AB.data("id", h("span", { class: "k-mono" }, v.id)),
                    AB.data("label", v.label),
                    AB.data("group", String(v.group), { go: ["inspector-group-set-path-row", "group-2"] }),
                    subhead("Results"),
                    AB.data("PageRank", ranked("0.0754", of), toMeasure),
                    AB.data("Betweenness", ranked(AB.num(bw[bwAt - 1].betweenness), "#" + bwAt + "-#" + (bwAt + 1), { sampled: true, scope: "on " + AB.num(kept) + " of " + AB.num(L.nodes) }), toMeasure),
                    degree,
                    AB.data("Bridges", bridges),
                    h("div", { class: "k-secondary", style: "padding:0 8px 4px 16px" }, "to " + BRIDGES_TO.join(", ")),
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
        // A person or building reached by the canvas walk shows its own row, as the header names it
        const W = AB.walked && AB.walked.dataset === "doorEntries" && AB.route && AB.route.frame.right === AB.walked.right ? AB.walked.name : null;
        const r = (W && tbl.sample.find((x) => (d.type === "person" ? x.name : x.bldg) === W)) || tbl.sample.find((x) => x[d.key] === d.id);
        const title = d.type === "person" ? r.name : r.bldg;
        const style = () => whyLook([
            { name: "Selection", swatch: AB.icon("scan", "sm"), go: ["inspector-selection-and-everything", "selection"], wins: ["color", "size"], values: { color: "#FFD700 at 40%", size: "1.45 times" } },
            { name: "Everything", swatch: AB.icon("base-layer", "sm"), go: ["inspector-selection-and-everything", "everything"], wins: ["shape"], values: { shape: "Faceted sphere, the default look" } },
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
            onRename: (name) => AB.flash("Renamed to " + name + " (sets this node's label; not wired in the skeleton)"),
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
        return AB.section({ title: count + " more attributes", collapsible: true, key: "data.node.more", summary: empty + " empty, not shown" },
            h("div", { class: "inn-empty k-secondary" }, empty + " empty, not shown"), h("div", { class: "inn-more" }, list));
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
            { name: "Selection", swatch: AB.icon("scan", "sm"), go: ["inspector-selection-and-everything", "selection"], wins: sized ? ["color"] : ["color", "size"], values: { color: "#FFD700 at 40%", size: "1.45 times" } },
            { name: "Everything", swatch: AB.icon("base-layer", "sm"), go: ["inspector-selection-and-everything", "everything"], wins: ["shape"], values: { shape: "Faceted sphere, the default look", color: "Gray, the default", size: "1, the default" } },
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
            onRename: (name) => AB.flash("Renamed to " + name + " (sets this node's label; not wired in the skeleton)"),
            tab: state === "wide-why" ? "Style" : "Data",
            tabs: { Style: () => wideStyle(r), Data: () => wideData(state) },
        }));
        if (state === "wide-more") setTimeout(() => { const f = el.querySelector(".ab-fl-find input"); if (f) f.focus(); }, 0);
    }

    // The nested researchers: a sub-object's fields sit under their parent (dotted paths in Summary,
    // the field list's folders in "N more"), tags is a list, and a value kept whole (affiliations,
    // addresses) reads as a collapsed tree under its row.
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
            const btn = h("span", { class: "inn-val inn-whole ab-link", role: "button", tabindex: "0", "aria-expanded": "false", "aria-label": "Expand " + x.name + ", " + sizeOf(v) }, sizeOf(v));
            AB.tip(btn, x.name + ", kept as one value", { label: false });
            const flip = (e) => {
                e.stopPropagation();
                const row = btn.closest("[data-fl-row]"), next = row.nextElementSibling;
                if (next && next.classList.contains("inn-tree")) { next.remove(); btn.setAttribute("aria-expanded", "false"); return; }
                row.after(wholeTree(v));
                btn.setAttribute("aria-expanded", "true");
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
        const ds = ownDataset("nested:" + rec.id, "researchers", others.filter((x) => !isEmpty(at(rec, x.name))));
        const dotted = (x) => (x.parent ? x.parent + "." + x.label : x.label);
        const list = AB.fieldList({ size: "panel", dataset: ds, results: false, notes: false, label: "Attributes with a value on " + AB.nameOf("nested", rec), empty: empty.map(dotted), emptyWhere: "on " + AB.nameOf("nested", rec), trail: nestedTrail(rec), onPick: (name) => AB.openField("nested", name) });
        // This state shows every folder open: open each in turn (a folder redraws the list when it opens)
        for (let i = 0, f; i < 20 && (f = list.querySelector(".ab-fl-folder[data-open=false]")); i++) f.click();
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
            onRename: (n) => AB.flash("Renamed to " + n + " (sets this node's label; not wired in the skeleton)"),
            tab: "Data",
            tabs: {
                Style: () => whyLook([
                    { name: "Selection", swatch: AB.icon("scan", "sm"), go: ["inspector-selection-and-everything", "selection"], wins: ["color", "size"], values: { color: "#FFD700 at 40%", size: "1.45 times" } },
                    { name: "Everything", swatch: AB.icon("base-layer", "sm"), go: ["inspector-selection-and-everything", "everything"], wins: ["shape"], values: { shape: "Faceted sphere, the default look" } },
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
            onRename: (n) => AB.flash("Renamed to " + n + " (sets this node's label; not wired in the skeleton)"),
            tab: "Data",
            tabs: {
                Style: () => whyLook([
                    { name: "Selection", swatch: AB.icon("scan", "sm"), go: ["inspector-selection-and-everything", "selection"], wins: ["color", "size"], values: { color: "#FFD700 at 40%", size: "1.45 times" } },
                    { name: "Everything", swatch: AB.icon("base-layer", "sm"), go: ["inspector-selection-and-everything", "everything"], wins: ["shape"], values: { shape: "Faceted sphere, the default look" } },
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
        el.append(AB.inspector({
            icon: "circle-dot", title: r.id, kind: "Node, account", kindKey: "node",
            menu: ["context-menus", "node"],
            onRename: (n) => AB.flash("Renamed to " + n + " (sets this node's label; not wired in the skeleton)"),
            tab: "Data",
            tabs: {
                Style: () => whyLook([
                    { name: "Selection", swatch: AB.icon("scan", "sm"), go: ["inspector-selection-and-everything", "selection"], wins: ["color", "size"], values: { color: "#FFD700 at 40%", size: "1.45 times" } },
                    { name: "Everything", swatch: AB.icon("base-layer", "sm"), go: ["inspector-selection-and-everything", "everything"], wins: ["shape"], values: { shape: "Faceted sphere, the default look" } },
                ], { kind: "node", element: r.id }),
                Data: () => AB.dataTab({
                    Summary: {
                        summary: r.kind + ", " + r.country + ", degree " + r.degree,
                        body: [subhead("From " + AB.fx.datasets.transactions.accountsFile), AB.data("id", h("span", { class: "k-mono" }, r.id))]
                            .concat(fromFile.map((c) => AB.data(c, val(c))), subhead("Results"), results.map((c) => AB.data(c, val(c)))),
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
            { name: "Notes", swatch: AB.icon(AB.ICON.note, "sm"), go: ["inspector-selection-and-everything", "notes-row"], wins: ["label below"], values: { "label below": "2, from Note count" } },
            { name: "PageRank", swatch: AB.ramp("#ef7818", "#662506"), go: ["inspector-measure-row", "style"], wins: ["color"], values: { color: PR_COLOR + ", 0.0754, highest" } },
            { name: BAD.row, swatch: AB.ramp("#cfcfcf", "#4d4d4d"), go: ["inspector-measure-row", "degree"], wins: ["size"], values: { size: "Nothing: " + BAD.path + " reads nothing" } },
            { name: "Group 2", swatch: AB.chit(AB.fx.datasets.lesmis.groupColors["2"], true), go: ["inspector-group-set-path-row", "label-two"], wins: ["label above"], values: { "label above": "Valjean, from label" } },
            { name: "Selection", swatch: AB.icon("scan", "sm"), go: ["inspector-selection-and-everything", "selection"], wins: ["color", "size"], values: { color: "#FFD700 at 40%", size: "1.45 times" } },
            { name: "Everything", swatch: AB.icon("base-layer", "sm"), go: ["inspector-selection-and-everything", "everything"], wins: ["shape"], values: { shape: "Faceted sphere, the default look" } },
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
        ],
        render(el, state) {
            if (!document.querySelector("link[data-inn]")) document.head.append(h("link", { rel: "stylesheet", href: "sections/inspector-node.css", "data-inn": "" }));
            if (DOOR[state]) return doorNode(el, state);
            if (WIDE[state]) return wideNode(el, state);
            if (state === "nested-data") return nestedNode(el);
            if (state === "plain-data") return plainNode(el);
            if (state === "transfers-node") return transfersNode(el);
            // The review states pin the remembered open or closed choice so each one is reachable
            if (state === "why-closed") AB.mem.set("sec.why.node", "0");
            else if (state !== "data") AB.mem.set("sec.why.node", "1");
            el.append(AB.inspector({
                icon: "circle-dot", title: "Valjean", kind: "Node", kindKey: "node",
                menu: ["context-menus", "node"],
                onRename: (name) => AB.flash("Renamed to " + name + " (sets this node's label; not wired in the skeleton)"),
                tab: state === "data" ? "Data" : "Style",
                tabs: { Style: () => (state === "why-unknown-path" ? unknownPathStyle() : styleTab(state)), Data: dataTab },
            }));
        },
    });
})();
