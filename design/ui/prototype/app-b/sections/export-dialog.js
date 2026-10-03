/* Export dialog (spec 12.1): the one home of every output, about 760 x 560 so the canvas stays
   visible. Left: five outputs, one line each, one Tab stop with arrow keys, then Recent exports.
   Right: the chosen output -- title, one summary line, the settings grid, one callout, a preview.
   Footer: "Saved to this computer only; nothing is uploaded.", Cancel and the main button.

   Image and Video are drawn by the export-image and export-video sections inside this frame; the
   states "image" and "video" here draw those sections, so Export... (Ctrl+E) opens on Image.

   Shared, published for export-image and export-video (nothing else is shared):
   - AB.exportDialogFrame(activeId, body, foot): the dialog. activeId is image, video, report,
     recipe, data or recent. The footer note is added unless foot already carries it.
   - AB.exportHead(title, summary): the title and its one summary line.
   - AB.exportCallout(tone, ...children): the one callout above the preview (info, warning, error).
   - AB.exportDone(file): closes the dialog and shows the one notice naming the file.

   Old state ids other sections still link to are aliases: table -> data (node table),
   style -> recipe (Only the style), methods and findings-report -> report, figure and project ->
   image. Plain ASCII. Styles injected below. */
(function () {
    "use strict";
    const CSS = `
.ex-modal { width: min(760px, calc(100vw - 32px)); height: min(560px, calc(100vh - 56px)); max-height: none; }
.ex-modal .k-modal-body { flex: 1 1 auto; min-height: 0; padding: 0; overflow: hidden; display: grid; grid-template-columns: 164px minmax(0, 1fr); }
.ex-list { overflow: auto; border-right: 1px solid var(--cm-border); padding: 6px 0; display: flex; flex-direction: column; }
.ex-item { display: flex; align-items: center; gap: 8px; height: 28px; padding: 0 12px; cursor: pointer; border-radius: 0; outline-offset: -2px; }
.ex-item:hover { background: var(--cm-bg-hover, var(--cm-bg-secondary)); }
.ex-item[aria-selected="true"] { background: var(--cm-bg-selected, var(--cm-bg-secondary)); font-weight: 550; }
.ex-item[aria-disabled="true"] { color: var(--cm-text-tertiary); }
.ex-sep { height: 1px; background: var(--cm-border); margin: 6px 0; }
.ex-main { overflow: auto; padding: 12px 16px 16px 0; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.ex-main > * { flex: none; }
.ex-main .ab-frow { margin-bottom: 0; }
.ex-head { padding-left: 16px; }
.ex-title { font-size: 15px; font-weight: 550; line-height: 25px; }
.ex-sum { color: var(--cm-text-secondary); }
.ex-set { display: flex; flex-direction: column; gap: 8px; }
.ex-set .k-field { max-width: 260px; }
.ex-ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; min-height: 24px; }
.ex-chk { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; line-height: 24px; }
.ex-chk[data-disabled] { cursor: default; color: var(--cm-text-disabled); }
.ex-chk[data-disabled] .k-check { box-shadow: inset 0 0 0 1px var(--cm-border-disabled); }
.ex-callout { display: flex; gap: 8px; align-items: flex-start; margin-left: 16px; padding: 8px 10px; border-radius: 6px; background: var(--cm-bg-secondary); }
.ex-callout > svg, .ex-callout > .k-icon { flex: none; margin-top: 2px; }
.ex-callout[data-tone="warning"] { box-shadow: inset 3px 0 0 var(--cm-bg-warning); }
.ex-callout[data-tone="error"] { box-shadow: inset 0 0 0 1px var(--cm-border-danger-strong); }
.ex-callout ul { margin: 2px 0 0; padding-left: 16px; }
.ex-h { font-weight: 550; padding-left: 16px; margin-bottom: -6px; }
.ex-pre { margin: 0 0 0 16px; padding: 8px 10px; border-radius: 5px; background: var(--cm-bg-secondary); font: 11px/16px var(--cm-font-family-mono, monospace); white-space: pre; overflow: auto; }
.ex-dl { margin: 0 0 0 16px; display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 4px 8px; }
.ex-dl dt { color: var(--cm-text-secondary); }
.ex-dl dd { margin: 0; }
.ex-line { padding-left: 16px; }
.ex-recent { margin: 0 0 0 16px; display: flex; flex-direction: column; }
.ex-rec { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; gap: 4px 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--cm-border); }
.ex-rec .ex-sum { grid-column: 2; font-size: 11px; }
.ex-rec .k-btn { grid-row: 1 / span 2; grid-column: 3; }
.ex-check { margin-left: 16px; display: flex; flex-direction: column; gap: 8px; }
.ex-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; max-width: 560px; }
.ex-pair figure { margin: 0; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.ex-pair figcaption { color: var(--cm-text-secondary); font-size: 11px; line-height: 16px; }
.ex-pair .xi-preview { width: 100%; max-width: none; margin-left: 0; }
.ex-gray > img, .ex-gray > svg, .ex-gray .k-legend-card { filter: grayscale(1); }
.ex-check .ex-line, .ex-check .ex-steps { padding-left: 0; }
.ex-fix { display: flex; flex-wrap: wrap; gap: 4px 6px; align-items: baseline; }
.ex-code { font: 11px/16px var(--cm-font-family-mono, monospace); overflow-wrap: anywhere; }
.ex-look { max-width: 416px; }
.ex-steps { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 4px; padding-left: 16px; }
.ex-step { display: inline-flex; align-items: center; gap: 4px; }
.ex-footl { flex: 1 1 auto; min-width: 0; color: var(--cm-text-secondary); display: flex; gap: 6px; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
    if (!document.getElementById("ex-style")) document.head.append(h("style", { id: "ex-style" }, CSS));

    const NOTE = "Saved to this computer only; nothing is uploaded.";
    const L = () => AB.fx.datasets.lesmis;
    const n = (v) => Number(v).toLocaleString("en-US");
    const PROJECT = "les-miserables";
    const WATCH = ["Valjean", "Javert", "Thenardier", "Mme.Thenardier", "Eponine"]; // the Watchlist set row

    // The transfers project: March as loaded, April after the Data page's Replace (AB.replaceTransfers,
    // published by data-place). Its data export names the month in the file and, once April replaced
    // March, offers the "Compared with" column.
    const TX = () => AB.fx.datasets.transactions, TA = () => AB.fx.datasets.transactionsApril;
    const isTx = () => !!(AB.route && AB.route.frame.dataset === "transactions");
    const updated = () => isTx() && TX().file === TA().files.transfers.file;
    const period = (file) => file.match(/\d{4}-\d{2}/)[0];
    const monthName = (p) => new Date(+p.slice(0, 4), +p.slice(5) - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
    const EARLIER = () => period(TA().previous.file); // the version April replaced
    const FLAG = () => TX().flaggedAccounts[0]; // the alert-triage account, ACC-365386
    const projectFile = () => (isTx() ? "transfers_" + period(TX().file) : PROJECT);

    // ---------- the list ----------
    const LIST = [
        { id: "image", name: "Image", icon: "camera", go: ["export-image", "image"] },
        { id: "video", name: "Video", icon: "play", go: ["export-video", "still"] },
        { id: "report", name: "Report", icon: "book-open", go: ["export-dialog", "report"], needs: true },
        { id: "recipe", name: "Recipe", icon: "flask-conical", go: ["export-dialog", "recipe"] },
        { id: "data", name: "Data", icon: "database", go: ["export-dialog", "data"] },
        { sep: true },
        { id: "recent", name: "Recent exports", icon: "history", go: ["export-dialog", "recent-exports"] },
    ];
    let listHadFocus = false;

    function list(activeId) {
        const items = [];
        const el = h("div", { class: "ex-list", role: "listbox", "aria-label": "What to export" });
        LIST.forEach((it) => {
            if (it.sep) return el.append(h("div", { class: "ex-sep", role: "none" }));
            const on = it.id === activeId;
            const x = h("div", { class: "ex-item", role: "option", tabindex: on ? "0" : "-1", "aria-selected": String(on), "aria-disabled": it.needs ? "true" : null }, icon(it.icon), it.name);
            x.addEventListener("click", () => { listHadFocus = el.contains(document.activeElement); AB.go(it.go[0], it.go[1]); });
            items.push([x, it]);
            el.append(x);
        });
        el.addEventListener("keydown", (e) => {
            const i = items.findIndex(([x]) => x === document.activeElement);
            const d = { ArrowDown: 1, ArrowUp: -1, Home: -i, End: items.length - 1 - i }[e.key];
            if (i < 0 || d == null) return;
            e.preventDefault();
            const [, it] = items[(i + d + items.length) % items.length];
            listHadFocus = true;
            AB.go(it.go[0], it.go[1]);
        });
        if (listHadFocus) requestAnimationFrame(() => { const s = el.querySelector("[aria-selected=true]"); if (s) s.focus(); listHadFocus = false; });
        return el;
    }

    // ---------- the shared frame and parts ----------
    function frame(activeId, body, foot) {
        foot = [].concat(foot || []);
        const hasNote = foot.some((f) => f && f.textContent && f.textContent.includes("nothing is uploaded"));
        if (!hasNote) foot.unshift(h("span", { class: "ex-footl" }, icon("lock", "sm"), NOTE));
        if (activeId === "image" && body && body.querySelector) {
            const f = body.querySelector(":scope > .xi-fields");
            body.insertBefore(lookBlock(body), f);
        }
        const m = AB.modal({ title: "Export", body: [list(activeId === "from-row" ? "data" : activeId), body], foot });
        m.querySelector(".k-modal").classList.add("ex-modal");
        return m;
    }
    const head = (title, summary) => h("div", { class: "ex-head" }, h("div", { class: "ex-title", role: "heading", "aria-level": "3" }, title), summary ? h("div", { class: "ex-sum" }, summary) : null);
    const callout = (tone, ...kids) => h("div", { class: "ex-callout", "data-tone": tone, role: tone === "error" ? "alert" : null }, icon(tone === "info" ? "info" : "triangle-alert", "sm"), h("div", null, kids));
    function done(file) {
        AB.close();
        setTimeout(() => AB.notice(`Exported ${file} to Downloads`), 50);
    }
    Object.assign(AB, { exportDialogFrame: frame, exportHead: head, exportCallout: callout, exportDone: done });

    const row = (label, ...ctl) => AB.fieldRow(label, h("span", { class: "ex-ctl" }, ctl), { popover: true });
    let chkSeq = 0;
    // off: a reason the box cannot be checked yet; it stays focusable and the reason is drawn beside it
    function check(label, on, flip, off) {
        const id = "ex-chk-" + ++chkSeq;
        const text = h("span", { id }, label);
        const box = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(!!on), "aria-disabled": off ? "true" : null, "aria-labelledby": id, "aria-label": typeof label === "string" ? label : null });
        const wrap = h("label", { class: "ex-chk", "data-disabled": off ? "" : null }, box, text);
        if (off) flip = () => {};
        wrap.addEventListener("click", (e) => { e.preventDefault(); flip(); });
        box.addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); flip(); } });
        return wrap;
    }
    // A dropdown: a field that opens the one dark menu
    function dropdown(value, options, pick, label) {
        const f = AB.field(value, { caret: true });
        f.setAttribute("aria-label", label);
        f.setAttribute("aria-haspopup", "menu");
        f.addEventListener("click", (e) => { e.stopPropagation(); AB.openMenu(f, options.map((o) => (typeof o === "string" ? { label: o, check: o === value, onClick: () => pick(o) } : o))); });
        f.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " " || (e.altKey && e.key === "ArrowDown")) { e.preventDefault(); f.click(); } });
        return f;
    }

    // ---------- Image: the Look (Screen or Print), for this file only ----------
    // The Print look keeps a grayscale check (the owner's decision, 2026-09-28): the file is written as
    // the look draws it, and the preview shows it beside its grayscale version -- a check, not a gray
    // file. It reads the colors the image carries from the canvas's legend card (the card the image
    // copies): categorical colors are how a gray figure fails, so it names the categories that fall on
    // nearly the same gray (CIE lightness L* closer than GRAY_STEP) and, next to the preview, the way
    // to fix it (the painting row's palette); for a ramp it prints the value at each gray step. It never
    // touches the project's style rows. The frame adds it to the Image body (ponytail: export-image
    // should draw it among its own fields).
    const GRAY_STEP = 8, STEPS = 5;
    const rgbs = (css) => (css.match(/rgba?\([^)]*\)/g) || []).map((c) => c.match(/[\d.]+/g).slice(0, 3).map(Number));
    function lightness([r, g, b]) {
        const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        const Y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        return Y > 216 / 24389 ? 116 * Math.cbrt(Y) - 16 : (Y * 24389) / 27;
    }
    function grayOf(Ls) {
        const Y = Ls > 8 ? ((Ls + 16) / 116) ** 3 : (Ls * 27) / 24389;
        const c = Math.round(255 * (Y <= 0.0031308 ? 12.92 * Y : 1.055 * Y ** (1 / 2.4) - 0.055));
        return "#" + c.toString(16).padStart(2, "0").repeat(3);
    }
    const and = (xs) => (xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);
    // The legend card's parts: { title, cats: [{ label, rgb }], ramp: { stops: [rgb], lo, hi } }
    function legendParts() {
        const card = document.querySelector("#ab-canvas .k-legend-card");
        const parts = [];
        if (card) [...card.children].forEach((el) => {
            if (el.classList.contains("k-lg-title")) return parts.push({ title: el.textContent, cats: [], ramp: null });
            const p = parts[parts.length - 1];
            if (!p || !el.classList.contains("k-lg-row")) return;
            const sw = el.firstElementChild, label = (el.querySelector(".k-ellipsis") || el).textContent;
            const grad = sw && rgbs(getComputedStyle(sw).backgroundImage);
            const m = label.match(/(-?[\d.,]+) to (-?[\d.,]+)/);
            if (grad && grad.length > 1 && m) p.ramp = { stops: grad, lo: +m[1].replace(/,/g, ""), hi: +m[2].replace(/,/g, "") };
            else if (sw && sw.classList.contains("k-chit")) p.cats.push({ label, rgb: rgbs(getComputedStyle(sw).backgroundColor)[0] });
        });
        return parts;
    }
    function rampAt(stops, t) {
        const x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
        return stops[i].map((v, k) => v + (stops[i + 1][k] - v) * f);
    }
    const stepRow = (label, Ls) => h("span", { class: "ex-step", role: "listitem" }, AB.chit(grayOf(Ls)), label);
    // Where a colliding row's colors are changed: its Binding popover (palette). ponytail: Louvain only,
    // the one categorical row a Les Miserables image carries; another row gets the sentence and no link
    const FIX = { Louvain: ["inspector-run-row", "binding"] };
    function printPart() {
        const parts = legendParts();
        const cats = parts.flatMap((p) => p.cats.map((c) => ({ label: c.label, L: lightness(c.rgb), row: p.title.replace(/^Color: /, "") }))).sort((a, b) => b.L - a.L);
        // runs of neighbors closer than GRAY_STEP in lightness read as one gray
        const runs = [];
        cats.forEach((st, i) => (i && cats[i - 1].L - st.L < GRAY_STEP ? runs[runs.length - 1].push(st) : runs.push([st])));
        const alike = runs.filter((r) => r.length > 1), k = alike.reduce((t, r) => t + r.length, 0);
        const ramps = parts.filter((p) => p.ramp);
        const catLine = !cats.length ? `In gray, no categories need telling apart: ${ramps.length ? "the colors are " + and(ramps.map((p) => p.title.replace(/^Color: /, ""))) + ", a ramp" : "the image has no colors from a row"}.`
            : k ? `In gray, ${AB.count(k, "category", { of: cats.length, plural: "categories" })} cannot be told apart: ${alike.map((r) => and(r.map((x) => x.label))).join("; ")}.`
            : `In gray, all ${AB.count(cats.length, "category", { plural: "categories" })} can be told apart.`;
        const rows = [...new Set(alike.flat().map((x) => x.row))];
        const fix = k ? h("div", { class: "ex-line ex-fix" }, h("b", null, "To fix it:"),
            `give ${and(rows)} colors that differ in lightness, not only in hue.`,
            rows.filter((r) => FIX[r]).map((r) => AB.link(FIX[r][0], FIX[r][1], `Change ${r}'s palette`))) : null;
        return [
            h("div", { class: "ex-line", role: k ? "alert" : null }, catLine, " ", AB.needsElement("graphty-element draws the Print look and reports which colors fall on the same gray.")),
            fix,
            ramps.map((p) => [
                h("div", { class: "ex-line ex-sum" }, `The legend prints the value at each gray step (${p.title}):`),
                h("div", { class: "ex-steps", role: "list", "aria-label": "Gray steps: " + p.title },
                    Array.from({ length: STEPS }, (_, i) => stepRow(AB.num(p.ramp.lo + ((p.ramp.hi - p.ramp.lo) * i) / (STEPS - 1)), lightness(rampAt(p.ramp.stops, i / (STEPS - 1))))))]),
            cats.length ? [
                h("div", { class: "ex-line ex-sum" }, "The legend prints each category's value beside its gray:"),
                h("div", { class: "ex-steps", role: "list", "aria-label": "Gray steps: categories" }, cats.map((c) => stepRow(c.label, c.L)))] : null];
    }
    // The check, in the preview's place: the file as written beside its grayscale version, then what
    // the gray loses and the fix. Screen puts the one preview back.
    function grayCheck(body) {
        const old = body.querySelector(":scope > .ex-check");
        const p = (old || body).querySelector(".xi-preview");
        if (old) old.replaceWith(p);
        if (S.look !== "Print" || !p) return;
        const g = p.cloneNode(true);
        g.classList.add("ex-gray");
        const mine = [...p.querySelectorAll("img")], copies = [...g.querySelectorAll("img")];
        copies.forEach((c, i) => {
            c.alt = (c.alt || "").replace(/^Preview: /, "In gray: ");
            // a picture still on its way reaches the gray copy too
            if (!mine[i].getAttribute("src") || mine[i].hidden) mine[i].addEventListener("load", () => { c.src = mine[i].src; c.hidden = false; }, { once: true });
        });
        const wrap = h("div", { class: "ex-check", role: "group", "aria-label": "Grayscale check" });
        p.before(wrap);
        wrap.append(h("div", { class: "ex-pair" },
            h("figure", null, p, h("figcaption", null, "As written")),
            h("figure", null, g, h("figcaption", null, "In gray, as a black-and-white print shows it"))),
            ...printPart().flat(2).filter(Boolean));
    }
    function lookBlock(body) {
        grayCheck(body);
        const blk = h("div", { class: "ex-set ex-look" },
            AB.fieldRow("Look", h("span", { class: "ex-ctl" },
                AB.seg([["Screen", "Screen"], ["Print", "Print"]], S.look, (x) => {
                    S.look = x;
                    const nb = lookBlock(body);
                    blk.replaceWith(nb);
                    const r = nb.querySelector("[role=radio][aria-checked=true]");
                    if (r) r.focus();
                }, { label: "Look" }),
                h("span", { class: "ex-sum" }, S.look === "Print" ? "For this file only; the preview checks it in gray" : "For this file only")), { popover: true }));
        return blk;
    }

    // ---------- reader choices for this visit ----------
    const S = { format: "CSV", table: "Nodes", shape: "Generic", scope: "Full graph", cols: "Visible", onlyStyle: false, compare: true, look: "Screen", adv: {} };
    // A table export writes the columns the table shows (its one Columns state), so it needs no
    // picker of its own. table-dock keeps that state private, so this reads its Columns button
    // ("Columns: 7 of 7") on the active tab (a shell gap: table-dock should publish it on AB).
    const dockTab = () => { const t = document.querySelector("#ab-dock .td-tab[aria-selected=true]"); return t ? t.textContent.trim() : null; };
    function tableCols() {
        const b = document.querySelector("#ab-dock .td-cols");
        const m = b && b.textContent.match(/(\d+) of (\d+)/);
        return m && dockTab() === S.table ? { shown: +m[1], total: +m[2] } : null;
    }
    // Data opens on the table that is showing in the dock, and on Nodes when none is
    const showingTable = () => (dockTab() === "Edges" ? "Edges" : "Nodes");
    const isTable = () => S.format === "CSV" && S.table !== "Adjacency";
    // The open filter step (Les Miserables' first step, as graph-place/scope-mark shows it): a data
    // export opened with a step open starts from that step's edges
    const STEP = () => ({ name: L().filterSteps.steps[0], nodes: L().filterSteps.statsByState["1"].nodes, edges: L().filterSteps.statsByState["1"].edges });
    const stepOpen = () => !!(AB.route && AB.route.frame.dataset === "lesmis" && AB.route.frame.chip && AB.route.frame.chip !== "Full graph");
    let redraw = () => {};

    // ---------- Data: every format graphty-element writes (session.catalog.formats(), canExport) ----------
    // Writer options from catalog/formats.ts; the first ones show inline, the rest in Advanced.
    const FMT = {
        CSV: { ext: "csv", inline: [["Table", ["Edges", "Nodes", "Adjacency"], "table"], ["File shape", ["Generic", "Neo4j"], "shape"]],
            adv: [["Header names", ["Generic", "Gephi"]], ["Column separator", [",", ";", "Tab"]], ["Line ending", ["LF", "CRLF"]], ["Header row", true], ["Neutralize formulas", true, "Puts an apostrophe before a text cell that starts with =, +, - or @, so a spreadsheet does not run it"]] },
        JSON: { ext: "json", inline: [["Shape", ["node-link", "d3", "jgf", "cytoscape", "graphology", "vis"], "shape"]], adv: [["Indent", ["0", "2", "4"]]] },
        GraphML: { ext: "graphml", inline: [["Edge direction", ["undirected", "directed"], "shape"]], adv: [["Indent", true]] },
        GEXF: { ext: "gexf", inline: [["Version", ["1.3", "1.2"], "shape"]], adv: [] },
        GML: { ext: "gml", inline: [["Unwritable keys", ["error", "mangle"], "shape"]], adv: [["Weight key", ["value"]]] },
        DOT: { ext: "dot", inline: [["Graph name", ["Les Miserables"], "shape"]], adv: [["Strict graph", false], ["Indent", ["2 spaces", "Tab"]]] },
        "Pajek NET": { ext: "net", inline: [["Network header", true, null]], adv: [] },
    };
    // What the format cannot hold, worded from the element's lossNotes (graph-io's writers)
    function lossNotes() {
        // a project loaded from nested JSON: graph-io writes its flattened columns back as dotted keys (element-requirements-5.md, Deferred)
        if (AB.route && AB.route.frame.dataset === "nested") return ["Nested fields are written as flat dotted keys (\"attributes.profile.h_index\": 24), not in the nesting of " + AB.fx.datasets.nested.file + "."];
        if (isTx()) {
            if (S.format === "CSV" && S.table === "Edges") return ["The edge table holds transfers only: each account's kind, country, riskScore, flagged, degree and PageRank are not written. Choose Table: Nodes to keep them."];
            if (S.format === "CSV" && S.table === "Nodes") return ["The node table holds accounts only: the transfers, their amount and time are not written. Choose Table: Edges to keep them."];
            if (S.format === "CSV") return ["An adjacency table holds who sent to whom and the amount only; every account attribute and run result is not written."];
            return [];
        }
        const nodeCols = "label, group, degree, betweenness, PageRank, the Louvain community, the position and the drawn color and size";
        if (S.format === "CSV" && S.table === "Edges") return [`The edge table holds edges only: each node's ${nodeCols} are not written. Choose Table: Nodes to keep them.`];
        if (S.format === "CSV" && S.table === "Nodes") return [`The node table holds nodes only: the ${n(L().edges)} edges and their value are not written. Choose Table: Edges to keep them.`];
        if (S.format === "CSV") return ["An adjacency table holds who links to whom and the edge value only; every node attribute and run result is not written."];
        if (S.format === "Pajek NET") return ["Pajek has a slot for a label and a position per node: group, degree, betweenness, PageRank and the community are not written."];
        if (S.format === "DOT") return ["DOT has no attribute types: numbers are written as text."];
        return [];
    }
    // Rank as written by graphty-element's table export (a stand-in until it writes it): a whole
    // number, 1 = highest, tied rows share the lowest rank of their block; Tie = how many others share the value
    function rankOf(r) {
        const all = L().rows.map((x) => x.betweenness);
        return [all.filter((v) => v >= r.betweenness).length, all.filter((v) => v === r.betweenness).length - 1];
    }
    // A run's column header names its scope and method, as the table heads it (the runs read all of
    // Les Miserables, so a step's export still says "full graph"); quoted, since they hold a comma
    const RUN_H = {
        pagerank: '"pagerank (full graph, damping 0.85)"',
        betweenness: '"betweenness (full graph, exact)"',
        rank: '"betweenness rank (full graph, exact)"',
        tie: '"betweenness tie (full graph, exact)"',
        louvain: '"louvain community (full graph, resolution 1.0)"',
        // a sampled estimate (betweenness from 20 source nodes, as table-dock's sampled run): a rank range
        low: '"betweenness rank low (full graph, sampled from 20 sources)"',
        high: '"betweenness rank high (full graph, sampled from 20 sources)"',
    };
    // PageRank (unweighted, damping 0.85) of the first three fixture rows, as table-dock's PR list has them
    const PR3 = [0.0428, 0.00558, 0.0103];
    // The "Compared with" column: one value per row against the earlier version
    const cmpCol = () => "compared_with_" + EARLIER().replace("-", "_");
    const comparing = () => updated() && S.compare && isTable();
    function txPreview() {
        const ext = FMT[S.format].ext;
        if (ext !== "csv") return "No preview for this file type";
        const cmp = comparing() ? "," + cmpCol() : "";
        if (S.table === "Nodes" && updated()) {
            // two accounts in both months, one opened in April, one closed (a Watchlist member gone from April)
            const A = TA(), nw = A.newAccountFlows.accounts[0], gone = A.watchlist.notInCurrentData[0];
            return ["id,kind,country,degree,pagerank" + cmp]
                .concat(A.rows.slice(0, 2).map((r) => [r.id, r.kind, r.country, r.degree, r.pagerank].join(",") + (cmp && ",in both")))
                .concat([`${nw.id},...,${nw.degree},...` + (cmp && ",new"), `${gone},,,,` + (cmp && ",no longer present")]).join("\n") + "\n...";
        }
        if (S.table === "Nodes") return ["id,kind,country,riskScore,flagged,degree,pagerank"].concat(TX().rows.slice(0, 3).map((r) => [r.id, r.kind, r.country, r.riskScore, r.flagged, r.degree, r.pagerank].join(","))).join("\n") + "\n...";
        if (S.table === "Edges" && S.scope === "Selection") {
            const id = FLAG().id;
            return ["from_account,to_account,amount,timestamp"].concat(AB.fx.scenarios.exportDialog.ringTransferRows.filter((r) => r.from_account === id || r.to_account === id).map((r) => [r.from_account, r.to_account, r.amount, "..."].join(","))).join("\n") + "\n...";
        }
        if (S.table === "Edges") return ["from_account,to_account,amount,timestamp" + cmp].concat(updated() ? [] : TX().firstRows.slice(0, 3).map((r) => [r.from_account, r.to_account, r.amount, r.timestamp].join(","))).join("\n") + "\n...";
        return "," + TX().rows.slice(0, 3).map((r) => r.id).join(",") + ",...\n...";
    }
    function dataPreview() {
        if (isTx()) return txPreview();
        const rs = L().rows.slice(0, 3);
        const ext = FMT[S.format].ext;
        // the table's own columns, in its order; the rest of its header is not drawn in the skeleton
        // the key is always written (the table's Columns cannot hide it); a run's columns carry their scope and method
        if (ext === "csv" && S.table === "Nodes" && S.cols === "Visible") return ["id,label,group,degree," + RUN_H.pagerank + ",..."].concat(rs.map((r, i) => [r.id, r.label, r.group, r.degree, PR3[i]].join(",") + ",...")).join("\n") + "\n...";
        if (ext === "csv" && S.table === "Nodes") return ["id,label,group,degree," + [RUN_H.pagerank, RUN_H.betweenness, RUN_H.rank, RUN_H.tie, RUN_H.louvain].join(",") + ",x,y,color,size"].concat(rs.map((r, i) => [r.id, r.label, r.group, r.degree, PR3[i], r.betweenness].concat(rankOf(r)).join(",") + ",...")).join("\n") + "\n...";
        if (ext === "csv" && S.table === "Edges") return "source,target,value\n0,1,...\n...";
        if (ext === "csv") return ",Myriel,Napoleon,Mlle.Baptistine,...\nMyriel,0,1,...\n...";
        if (ext === "graphml") return ['<graphml xmlns="http://graphml.graphdrawing.org/xmlns">', '  <key id="label" for="node" attr.name="label" attr.type="string"/>', '  <key id="group" for="node" attr.name="group" attr.type="int"/>', `  <graph edgedefault="${S.adv.GraphML || "undirected"}">`]
            .concat(rs.map((r) => `    <node id="${r.id}"><data key="label">${r.label}</data><data key="group">${r.group}</data></node>`)).concat(["    ..."]).join("\n");
        if (ext === "json") return '{\n  "nodes": [\n' + rs.map((r) => `    { "id": "${r.id}", "label": "${r.label}", "group": ${r.group} }`).join(",\n") + ",\n    ...";
        if (ext === "dot") return 'graph "Les Miserables" {\n' + rs.map((r) => `  "${r.id}" [label="${r.label}", group=${r.group}];`).join("\n") + "\n  ...";
        if (ext === "net") return `*Vertices ${L().nodes}\n` + rs.map((r, i) => `${i + 1} "${r.label}"`).join("\n") + "\n...";
        if (ext === "gml") return "graph [\n  directed 0\n" + rs.map((r) => `  node [ id ${r.id} label "${r.label}" group ${r.group} ]`).join("\n") + "\n  ...";
        return '<gexf version="1.3">\n  <graph defaultedgetype="undirected">\n    <nodes>\n' + rs.map((r) => `      <node id="${r.id}" label="${r.label}"/>`).join("\n") + "\n      ...";
    }
    // Advanced: the one light popover. AB.popover's X and Esc call AB.close(), which would close
    // the whole dialog, so this popover is closed locally (a shell gap: a popover inside a modal).
    function advanced(anchor, f) {
        const lay = document.getElementById("ab-overlay");
        const body = h("div", null, f.adv.map(([label, v, why]) => {
            const key = S.format + "." + label;
            const cur = S.adv[key] != null ? S.adv[key] : Array.isArray(v) ? v[0] : v;
            const set = (x) => { S.adv[key] = x; pop.replaceWith((pop = advanced(anchor, f))); };
            const ctl = Array.isArray(v) ? AB.seg(v.map((o) => [o, o]), cur, set, { label }) : check(why ? h("span", { "data-tip": why }, "On") : "On", cur, () => set(!cur));
            return AB.fieldRow(label, ctl, { popover: true });
        }));
        let pop = AB.popover({ anchor, title: S.format + " options", body, width: 300, place: "right-start" });
        const close = () => { pop.remove(); document.removeEventListener("pointerdown", off, true); anchor.focus(); };
        const off = (e) => { if (!pop.contains(e.target) && e.target !== anchor) close(); };
        pop.querySelector(".k-popover-head .k-icon-btn").replaceWith(AB.iconButton("x", "Close", { key: "Esc", onClick: close }));
        pop.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } });
        setTimeout(() => document.addEventListener("pointerdown", off, true));
        lay.append(pop);
        requestAnimationFrame(() => { const x = pop.querySelector("[tabindex='0']"); if (x) x.focus(); });
        return pop;
    }
    // The summary's first words: what one row is and what it carries, from the settings and the
    // table's Columns ("every computed value" only while no computed column is left out)
    function what() {
        const N = isTx() ? "account" : "node", E = isTx() ? "transfer" : "edge";
        const tc = isTable() && S.cols === "Visible" ? tableCols() : null;
        const vals = tc && tc.shown < tc.total ? `with the ${AB.count(tc.shown, "column", { of: tc.total })} the table shows` : null;
        if (S.format !== "CSV") return `Every ${N} and ${E}, with every attribute and computed value`;
        if (S.table === "Nodes") return `One row per ${N}, ${vals || "with every computed value"}`;
        if (S.table === "Edges") return `One row per ${E}, ${vals || "with every " + E + " attribute"}`;
        return `One row and one column per ${N}, with the ${E} value`;
    }
    function dataBody(fromRow) {
        const f = FMT[S.format];
        const st = STEP();
        // the transfers: the data as loaded now (April after Replace), and the selected flagged account's own transfers
        const txN = updated() ? { nodes: TA().nodes, edges: TA().edges } : AB.projectCounts("transactions");
        const sel = () => `Selection: ${FLAG().id} and its ${AB.count(FLAG().degree, "transfer")}`;
        const scopeTxt = isTx() ? (S.scope === "Selection" ? sel() : `Full graph, ${AB.count(txN.nodes, "account")}, ${AB.count(txN.edges, "transfer")}`)
            : S.scope === "Watchlist" ? `Watchlist, ${WATCH.length} nodes` : S.scope === "Step" ? `${st.name}: ${AB.count(st.edges, "edge", { of: L().edges })}, among ${AB.count(st.nodes, "node")}` : `Full graph, ${L().nodes} nodes, ${n(L().edges)} edges`;
        const scopeOpts = isTx() ? ["Full graph"].concat(S.scope === "Selection" ? ["Selection"] : []) : ["Full graph", "Watchlist"].concat(stepOpen() ? ["Step"] : []);
        const scopeName = (o) => (o === "Watchlist" ? `Watchlist, ${WATCH.length} nodes` : o === "Step" ? "Open filter step: " + st.name : o === "Selection" ? sel() : o);
        const D = TA().versionDiff, earlier = monthName(EARLIER());
        const cmpWhat = S.table === "Nodes" ? `${AB.count(D.accountsKept, "account")} in both, ${n(D.accountsAdded)} new, ${n(D.accountsRemoved)} no longer present`
            : `${AB.count(D.transfersBoth, "transfer")} in both, ${n(D.transfersAdded)} new, ${n(D.transfersRemoved)} no longer present`;
        const tc = isTable() && S.cols === "Visible" ? tableCols() : null;
        const notes = (tc && tc.shown < tc.total ? [`The ${tc.total - tc.shown} columns the table hides are not written. Choose Columns: Every column to keep them.`] : []).concat(lossNotes());
        const inline = f.inline.map(([label, v, k]) => {
            if (!Array.isArray(v)) return row(label, check("On", true, () => AB.flash(label + " (not available yet)")));
            if (label === "Graph name" && isTx()) v = [TX().graphName];
            const cur = k === "table" ? S.table : S.adv[S.format] || v[0];
            const set = (x) => { if (k === "table") S.table = x; else S.adv[S.format] = x; redraw(); };
            return row(label, v.length <= 3 ? AB.seg(v.map((o) => [o, o]), cur, set, { label }) : dropdown(cur, v, set, label));
        });
        let advBtn = null;
        if (f.adv.length) {
            advBtn = AB.field("Advanced", { caret: true });
            advBtn.setAttribute("aria-haspopup", "dialog");
            AB.tip(advBtn, f.adv.map((a) => a[0]).join(", "), { label: false });
            advBtn.addEventListener("click", (e) => { e.stopPropagation(); advanced(advBtn, f); });
            advBtn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); advBtn.click(); } });
        }
        return h("div", { class: "ex-main" },
            head("Data", `${what()} - ${scopeTxt}${comparing() ? " - compared with " + earlier : ""} - ${S.format}`),
            h("div", { class: "ex-set" },
                row("Format", dropdown(S.format, Object.keys(FMT), (x) => { S.format = x; redraw(); }, "Format")),
                row("Scope", dropdown(scopeName(S.scope), scopeOpts.map((o) => ({ label: scopeName(o), check: o === S.scope, onClick: () => { S.scope = o; redraw(); } })), null, "Scope"),
                    S.scope !== "Full graph" ? AB.needsElement("exportGraph writes the whole graph; writing only a filter step's, a set's or the selection's elements needs graphty-element") : null),
                inline,
                isTable() ? row("Columns", AB.seg([["Visible", "Shown in the table"], ["All", "Every column"]], S.cols, (x) => { S.cols = x; redraw(); }, { label: "Columns" }),
                    h("span", { class: "ex-sum" }, S.cols === "All" ? "Hidden columns too" : tableCols() ? `${AB.count(tableCols().shown, "column", { of: tableCols().total })}, as the table's Columns shows them` : `As the ${S.table} table's Columns shows them`)) : null,
                updated() && isTable() ? row("Compared with", check(earlier, S.compare, () => { S.compare = !S.compare; redraw(); }),
                    h("span", { class: "ex-sum" }, `Adds a column ${cmpCol()}: ${cmpWhat}`))
                // one version so far: the same offer, off until an update with new data makes an earlier version
                : isTable() ? row("Compared with", check("Earlier version", false, null, true),
                    h("span", { class: "ex-sum" }, `Adds a column with each row's state against the earlier version: new, in both or no longer present. Offered after an update with new data; ${isTx() ? TX().file : L().file} has one version so far.`)) : null,
                advBtn ? row("", advBtn) : null),
            notes.length ? callout("warning", h("b", null, `${S.format} cannot hold everything`), h("ul", null, notes.map((t) => h("li", null, t)))) : null,
            h("div", { class: "ex-h" }, "Preview"),
            h("pre", { class: "ex-pre", tabindex: "0", "aria-label": "Preview of the exported data" }, dataPreview()),
            // the file's guarantees, after the preview, so the body keeps the one order every output has
            written(st, txN));
    }
    // What the file holds, said first, under the title: every row of the scope with no cap, the ids as
    // loaded, a run's columns headed with scope and method, and a rank as a number with its Tie
    // (or Rank low and Rank high for a sampled estimate) -- never "4=", which a spreadsheet reads as text
    function written(st, txN) {
        const dd = (t, ...d) => [h("dt", null, t), h("dd", null, d)];
        const tx = isTx(), N = tx ? "account" : "node", E = tx ? "transfer" : "edge";
        const full = tx ? txN : { nodes: L().nodes, edges: L().edges };
        // one side of the scope: the rows of that table
        const side = (nodes) => (S.scope === "Step" ? AB.count(nodes ? st.nodes : st.edges, nodes ? N : E, { of: nodes ? full.nodes : full.edges })
            : S.scope === "Watchlist" ? (nodes ? AB.count(WATCH.length, N) : `the ${E}s among its ${AB.count(WATCH.length, N)}`)
            : S.scope === "Selection" ? (nodes ? `${FLAG().id} and the accounts it sent to or received from` : AB.count(FLAG().degree, E))
            : AB.count(nodes ? full.nodes : full.edges, nodes ? N : E));
        const csv = FMT[S.format].ext === "csv";
        const inScope = !csv ? `${side(true)} and ${side(false)}` : S.table === "Adjacency" ? `${side(true)}, one row and one column each` : side(S.table === "Nodes");
        const firstId = tx ? TX().rows[0].id : L().rows[0].id;
        const code = (t) => h("span", { class: "ex-code" }, t);
        return [
            h("div", { class: "ex-h" }, "What is written"),
            h("dl", { class: "ex-dl" },
                dd("Rows", `Every one in the scope, with no cap: ${inScope}`),
                dd("Ids", "As loaded, never renumbered: ", code(`"${firstId}"`), tx ? "" : ` stays ${L().rows[0].label}'s id`),
                tx ? null : dd("Run columns", "Headed with the scope and method they were computed with: ", code(RUN_H.betweenness)),
                tx ? null : dd("Rank", "A whole number (1 = highest) with a separate Tie column, never \"4=\", so the column stays numeric in a spreadsheet. A sampled estimate writes a range instead: ", code(RUN_H.low + "," + RUN_H.high))),
        ];
    }
    const dataFile = () => `${projectFile()}${S.scope === "Watchlist" ? "_watchlist" : S.scope === "Step" ? "_degree-2-or-more" : S.scope === "Selection" ? "_" + FLAG().id.toLowerCase() : ""}${comparing() ? "_vs-" + EARLIER() : ""}${S.format === "CSV" ? "_" + S.table.toLowerCase() : ""}.${FMT[S.format].ext}`;

    // ---------- Recipe: the sender's side ----------
    // What travels, in the order it runs when applied: the open filter step, then the runs (which
    // read the filtered graph); the layout by name with its settings (inspector-nothing-selected's
    // Layout section: Spread Out, engine NGraph Force, seed 7).
    const RUNS = "Louvain (resolution 1.0, weighted by value), PageRank, Degree, Betweenness, Closeness, Shortest paths";
    function recipeBody() {
        const views = AB.SAVED_VIEWS;
        const step = stepOpen() ? STEP().name : null;
        const dd = (t, d) => [h("dt", null, t), h("dd", null, d)];
        return h("div", { class: "ex-main" },
            head("Recipe", S.onlyStyle ? "Only the style: the paint rows and their palettes - never your data" : "Styles, steps and the layout with its parameters - never your data"),
            h("div", { class: "ex-set" },
                row("Include", check("Only the style", S.onlyStyle, () => { S.onlyStyle = !S.onlyStyle; redraw(); })),
                row("File", h("span", null, S.onlyStyle ? `${PROJECT}.style` : `${PROJECT}.recipe`), AB.openQuestion("The recipe and style files' name endings"))),
            S.onlyStyle ? null : callout("info", "Applying it to other data runs each analysis again.", " ", AB.needsElement("Restoring the results without running again: graphty-element keeps no run records a recipe could restore without recomputing")),
            h("div", { class: "ex-h" }, "What the file holds"),
            h("p", { class: "ex-line", style: "margin:0" }, h("b", null, "No data inside. "), "What your recipient does: load a graph with a group column on its nodes and a value column on its edges, then Apply. Columns are matched by name."),
            h("dl", { class: "ex-dl" },
                S.onlyStyle ? null : [
                    dd("Order", step ? "Applied in this order: filter, then runs. The runs read the filtered graph." : "Applied in this order: filter, then runs. This project has no filter step, so the runs read the whole graph."),
                    step ? dd("1. Filter", step) : null,
                    dd((step ? "2. " : "") + "Runs", RUNS),
                    dd("Layout", "Spread Out, engine NGraph Force, seed 7. Positions are drawn again on the recipient's data."),
                    dd("Saved views", views.join(", ")),
                ],
                dd("Styles", "Every paint row in the tree, with the custom palettes they use"),
                dd("Needs", "group (node) and value (edge), from the recipient's data"),
                dd("Not included", L().file + " (named, not carried), node names and values, positions, the Watchlist's members, Overrides and notes: they name things in this data")));
    }

    // ---------- Report (disabled: title, one sentence, the mark; no settings, no preview) ----------
    // The spec asks for a "Methods text only" choice and also for a disabled output with no settings:
    // while Report is disabled, the sentence names the choice by its name and no control is drawn
    // (studio decision: a control would be a setting, which a disabled output does not show). The
    // participant view replaces the needs-graphty-element chip with the summary "Not available yet".
    function reportBody() {
        return h("div", { class: "ex-main" },
            head("Report", "Not available in this version"),
            h("p", { class: "ex-line", style: "margin:0" }, `One self-contained HTML file that opens offline and prints to PDF from the browser: a page per view in the tour, in tour order, each figure embedded, the notes and tables as real text, ${AB.legendOn() ? "the legend card as the canvas shows it" : "no legend card (the legend is off, as on the canvas)"}, and the methods text that says how every number was computed, with a choice, Methods text only, that writes just that text.`),
            h("div", { class: "ex-line" }, AB.needsElement("graphty-element keeps no run records a methods writer could read; writing the methods in the app would be the app describing the graph")));
    }

    // ---------- Recent exports ----------
    // Each row names the data version it was made from; Export again names the current one when it
    // differs. Les Miserables has one version (its file); the transfers case has March and April
    // (full-canvas-modes' version history: the March export, then April's data replaced it).
    let aprilDone = false;
    const month = (d) => d.title.replace(/^.*, (\w+) \d{4}$/, "$1") + " data";
    function recentRows() {
        if (AB.route && AB.route.frame.dataset === "transactions") {
            // the data as the project holds it now: March until the reader replaces it with April
            const X = AB.fx.scenarios.exportDialog, now = month(AB.fx.datasets.transactions), april = /^April/.test(now);
            // Export again writes a file on the data as it is now beside the March one: a new row, newest first
            const again = () => { aprilDone = true; redraw(); };
            return { now, rows: [
                aprilDone ? { file: "case-acc-233575_ring-pagerank_2026-0" + (april ? 4 : 3) + (april ? "" : "-2") + ".csv", what: `Data, CSV, ${april ? X.ringInApril : X.march.length} accounts of the Mule ring: PageRank with Rank and Tie, and the methods file`, when: "Just now", version: now, again } : null,
                { file: "case-acc-233575_ring-pagerank_2026-03.csv", what: `Data, CSV, ${X.march.length} accounts of the Mule ring: PageRank with Rank and Tie, and the methods file`, when: "Sep 28", version: "March data", again },
            ].filter(Boolean) };
        }
        const v = L().file;
        return { now: v, rows: [
            { file: `${PROJECT}_whole-cast.png`, what: "Image, PNG at 2x, Whole cast", when: "Today 10:14", version: v, go: ["export-image", "image"] },
            { file: `${PROJECT}_nodes.csv`, what: "Data, CSV node table, full graph", when: "Today 9:52", version: v, go: ["export-dialog", "data"], set: { format: "CSV", table: "Nodes", scope: "Full graph" } },
            { file: `${PROJECT}.recipe`, what: "Recipe, 6 runs, the layout and 3 saved views", when: "Yesterday 16:30", version: v, go: ["export-dialog", "recipe"], set: { onlyStyle: false } },
            { file: `${PROJECT}_tour.webm`, what: "Video, tour of saved views", when: "Sep 28 11:05", version: v, go: ["export-video", "tour"] },
        ] };
    }
    function recentBody() {
        const { now, rows } = recentRows();
        return h("div", { class: "ex-main" },
            head("Recent exports", `${AB.count(rows.length, "file")}, newest first - each was saved to Downloads`),
            h("div", { class: "ex-recent", role: "list" }, rows.map((r) => h("div", { class: "ex-rec", role: "listitem" },
                icon("file", "sm"), h("span", { class: "k-ellipsis" }, r.file),
                AB.button(r.version === now ? "Export again" : `Export again, on ${now}`, { kind: "secondary", onClick: r.again || (() => { Object.assign(S, r.set || {}); AB.go(r.go[0], r.go[1]); }) }),
                h("span", { class: "ex-sum" }, `${r.what} - ${r.when} - made from ${r.version}`)))),
            h("div", { class: "ex-line ex-sum" }, rows[0].again ? "Export again writes a new file with the same settings, on the data as it is now, and adds it here. The earlier file is kept." : "Export again opens the output with the same settings, on the data as it is now. The earlier file is kept."));
    }

    // ---------- the section ----------
    const ALIAS = { table: "data", style: "recipe", methods: "report", "findings-report": "report", figure: "image", project: "image" };
    function render(el, state, ctx, again) {
        redraw = () => { el.textContent = ""; render(el, state, ctx, true); };
        if (ALIAS[state]) {
            if (state === "table") Object.assign(S, { format: "CSV", table: "Nodes" });
            if (state === "style") S.onlyStyle = true;
            state = ALIAS[state];
        }
        if (state === "image-print") {
            S.look = "Print";
            // The Print check meets a figure painted by category: Louvain shown alone, by the tree's own
            // gesture (Alt-click on its eye, as graph-place/solo does for PageRank), so the tree, the canvas
            // and its legend agree; once the legend says Louvain, the dialog is drawn again from it
            if (!again && AB.soloRow !== "Louvain") requestAnimationFrame(() => {
                const li = document.querySelector('#ab-left .ab-trow[data-row="louvain"]'), eye = li && li.querySelector(".ab-eye");
                if (!eye) return;
                eye.dispatchEvent(new MouseEvent("click", { altKey: true, bubbles: true, detail: 1 }));
                let tries = 0;
                const wait = () => {
                    const t = document.querySelector("#ab-canvas .k-legend-card .k-lg-title");
                    if (t && /Louvain/.test(t.textContent)) return el.isConnected && redraw();
                    if (++tries < 60) setTimeout(wait, 50);
                };
                wait();
            });
        }
        if (state === "image" || state === "image-print") return ctx.renderSection("export-image/image", el);
        if (state === "video") return ctx.renderSection("export-video/still", el);
        // A door only fills a field: the Watchlist row's menu fills Scope (and the node table)
        if (!again && state === "from-row") Object.assign(S, { format: "CSV", table: "Nodes", scope: "Watchlist" });
        // Data opens on the table that is showing (Nodes by default); with a filter step open, over that step
        if (!again && (state === "data" || state === "filter-step")) Object.assign(S, { table: showingTable(), scope: stepOpen() ? "Step" : "Full graph" });
        // After April replaced March: the node table with the "Compared with" column. A selected flagged
        // account: its own edges, the transfers it sent and received
        if (!again && state === "data-updated") Object.assign(S, { format: "CSV", table: "Nodes", scope: "Full graph", compare: true });
        if (!again && state === "selection") Object.assign(S, { format: "CSV", table: "Edges", scope: "Selection" });
        if (state === "recent-updated") state = "recent-exports";
        if (!again && state === "recent-exports") aprilDone = false;
        const cancel = AB.button("Cancel", { kind: "ghost", onClick: () => AB.close() });
        let body, foot;
        if (state === "report") {
            body = reportBody();
            foot = [cancel, AB.button("Export", { icon: "download", disabled: "Needs graphty-element: a methods writer" })];
        } else if (state === "recipe") {
            body = recipeBody();
            foot = [cancel, AB.button("Export", { icon: "download", onClick: () => done(S.onlyStyle ? `${PROJECT}.style` : `${PROJECT}.recipe`) })];
        } else if (state === "recent-exports") {
            body = recentBody();
            foot = [AB.button("Close", { kind: "ghost", onClick: () => AB.close() })];
        } else {
            body = dataBody(state === "from-row");
            foot = [cancel, AB.button("Copy", { kind: "secondary", icon: "copy", onClick: () => AB.flash(`Copied ${dataFile()} to the clipboard`) }), AB.button("Export", { icon: "download", onClick: () => done(dataFile()) })];
        }
        el.append(frame(state === "recent-exports" ? "recent" : ["from-row", "filter-step", "data-updated", "selection"].includes(state) ? "data" : state, body, foot));
    }

    registerSection({
        id: "export-dialog",
        title: "Export dialog",
        region: "overlay",
        // The screen behind stays when it is Les Miserables with a filter step on (the export starts
        // from the step); opened directly, Data is over the full graph and filter-step over the step. Recent exports draws Les Miserables when opened from this dialog or Settings
        // over it; otherwise (a direct link, version history) the transfers case, the project with
        // two data versions.
        frame: (state) => {
            const was = AB.route && AB.route.frame;
            // Switching outputs inside the dialog keeps the screen behind as it was. Data opened directly
            // shows the graph as it is (Full graph); the filter-step state is the one with a step open
            const inDialog = was && ["export-dialog", "export-image", "export-video", "settings"].includes(AB.route.id);
            // The transfers after Replace: April is the data, March the earlier version
            if (state === "data-updated" || state === "recent-updated") {
                if (AB.replaceTransfers) AB.replaceTransfers();
                return { left: "graph-place/many-groups", dataset: "transactions" };
            }
            if (state === "selection") return { left: "graph-place/many-groups", dataset: "transactions" };
            // switching outputs inside the dialog over the transfers keeps the transfers behind it
            if (inDialog && was.dataset === "transactions") return { left: was.left, dataset: "transactions" };
            if (state === "filter-step") return { left: "graph-place/scope-mark" };
            if (state === "recent-exports") return was && was.dataset === "lesmis" && ["export-dialog", "export-image", "export-video", "settings"].includes(AB.route.id) ? { left: "graph-place/at-rest" } : { left: "graph-place/many-groups", dataset: "transactions" };
            if (was && was.dataset === "lesmis" && was.chip && was.chip !== "Full graph" && was.left) return { left: was.left };
            return { left: "graph-place/at-rest" };
        },
        closeTo: "graph-place",
        states: [
            { id: "image", label: "Image (the export-image section)" },
            { id: "image-print", label: "Image with the Print look (Louvain shown alone: colors that collide in gray)" },
            { id: "video", label: "Video (the export-video section)" },
            { id: "report", label: "Report, disabled" },
            { id: "recipe", label: "Recipe" },
            { id: "data", label: "Data" },
            { id: "filter-step", label: "Data, with a filter step open" },
            { id: "from-row", label: "Data from the Watchlist row's menu" },
            { id: "recent-exports", label: "Recent exports" },
            { id: "data-updated", label: "Data, after an update with new data (Compared with)" },
            { id: "selection", label: "Data with a flagged account selected (its transfers)" },
            { id: "recent-updated", label: "Recent exports, after the data changed" },
        ],
        render,
    });
})();
