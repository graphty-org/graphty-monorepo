#!/usr/bin/env node
// The kit check: fails when a page shows a number that is not the fixture's, names a fixture key
// that does not exist, has an icon button with no tooltip, or does not load kit/kit.js; and when
// two pages show different text for the same fixture value.
//
// It is also the gate every task screen passes before a study round (kit/README.md, "The gate"). Read
// from the RENDERED page, in the participant view, inside product frames, skipping any frame marked
// data-frame="before", it fails a page on:
//   1. a retired string, and 2. a required string missing from the page and state the term sheet
//      (kit/terms.json) maps it to;
//   3. a count kit/fixtures.json does not hold (the typed-count and data-fx checks below);
//   4. one capability drawn in two homes (twoHomes below);
// and on the old frame (oldChrome: the shell's rail, one right column, no avatar, no header Export).
//
//   node kit/check.mjs screens/frame-at-rest.html "screens/frame-at-rest.html?dataset=ppi"
//   node kit/check.mjs --all        (every storyboard, flow, screen and study page, the gallery and the kit pages;
//                                      also fails when any shot in shots/ is older than its page or the kit)
//   node kit/check.mjs --all --typed  (also list typed counts the fixtures do not hold; --strict fails on them)
//   node kit/check.mjs --tasks        (every study task's screens, each opened with ?task=<id>: fails when a
//                                      screen draws or binds another dataset, or types a count, direction,
//                                      weight or sample size its task's dataset does not hold)
//
// kit.js does the per-page work (kit/README.md, "kit.js"); this loads each page in Chromium and
// collects what kit.js found, plus every script error, so kit/shoot.mjs and this agree. It also
// checks that every task in kit/fixtures.json names a dataset and refs that exist. Exit code 1 on
// any problem.
process.env.FC_FONTATIONS = "1"; // headless Chromium crashes on startup on this host without it

import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const proto = resolve(here, "..");
const { chromium } = await import(resolve(proto, "../../../node_modules/playwright/index.mjs"));

const pages = [];
// Typed numbers are always checked: a count or statistic no fixture holds fails the check (it
// used to be a list behind --typed; --typed and --strict are kept as no-ops for old commands).
const typed = true;
const strict = true;
const tasksMode = process.argv.includes("--tasks");
// --task=<id>[,<id>]: with --tasks, only these tasks (an id that is not a task checks nothing, and fails).
const taskOnly = process.argv.find((a) => a.startsWith("--task="))?.slice(7).split(",") ?? null;
// --plant <page>@<from>@<to>[@*]: serve <page> with the first <from> (every <from>, with @*) replaced by
// <to>, to prove a check fails on a planted mismatch (kit/README.md, "The kit check"). Nothing on disk
// changes. <page> can be any served file, kit/kit.js included.
const plants = [];
for (let i = 2; i < process.argv.length; i++) if (process.argv[i] === "--plant") { const [pg, from, to, all] = process.argv[i + 1].split("@"); plants.push({ pg, from, to, all: all === "*" }); process.argv.splice(i, 2); i--; }
for (const a of process.argv.slice(2).filter((x) => !/^--(typed|strict|tasks|task=.*)$/.test(x))) {
    if (a !== "--all") pages.push(a.replace(/^\.?\/?/, ""));
    else {
        for (const dir of ["storyboards", "flows", "screens", "study"]) {
            for (const f of (await readdir(join(proto, dir))).sort()) if (f.endsWith(".html") && !f.endsWith(".template.html")) pages.push(`${dir}/${f}`);
        }
        pages.push("index.html", "kit/template.html", "kit/index.html");
    }
}
if (!pages.length && !tasksMode) {
    console.error("usage: node kit/check.mjs (--all | --tasks | page.html ...)");
    process.exit(2);
}

const problems = [];
let taskScreens = 0;
// Tasks: every one names a dataset and refs that resolve.
const fixtures = JSON.parse(await readFile(join(here, "fixtures.json"), "utf8"));
const get = (path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), fixtures);
for (const [id, t] of Object.entries(fixtures.tasks ?? {})) {
    if (!fixtures.datasets[t.dataset]) problems.push(`kit/fixtures.json task ${id}: no dataset ${t.dataset}`);
    if (!t.pages?.length) problems.push(`kit/fixtures.json task ${id}: no pages`);
    for (const pg of t.pages ?? []) if (!(await readFile(join(proto, pg.replace(/[?#].*$/, ""))).catch(() => null))) problems.push(`kit/fixtures.json task ${id}: page ${pg} does not exist`);
    for (const r of t.refs ?? []) if (get(r) === undefined) problems.push(`kit/fixtures.json task ${id}: ${r} does not resolve`);
}

// A plant whose anchor is gone would serve a 404 and read as "does not load kit/kit.js"; say so instead.
for (const pl of plants) {
    const t = await readFile(join(proto, pl.pg), "utf8").catch(() => "");
    if (!t.includes(pl.from)) { console.error(`--plant: ${pl.pg} has no "${pl.from}" (the anchor is stale)`); process.exit(2); }
}

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".woff2": "font/woff2", ".md": "text/plain" };
const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, "");
    const file = join(proto, path || "index.html");
    if (!file.startsWith(proto)) return res.writeHead(403).end();
    try {
        let body = await readFile(file); // read first: a failed read must still be able to answer 404
        for (const pl of plants) if (path === pl.pg) {
            const t = body.toString("utf8");
            if (!t.includes(pl.from)) throw new Error(`--plant: ${pl.pg} has no "${pl.from}"`);
            body = Buffer.from(pl.all ? t.split(pl.from).join(pl.to) : t.replace(pl.from, pl.to));
        }
        res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
    } catch {
        res.writeHead(404).end();
    }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}/`;

// The old frame, which kit/shell.mjs replaces. The frame is: a rail of main menu, Graph, Data,
// Results, Notes, Assistant; one right column; no avatar; no Export button in a header row; no
// Styles section in the Graph panel; no Note tool on the toolbar. A frame kept on purpose sits in [data-frame="before"] (or the
// older [data-shell-keep]). Runs in the page.
function oldChrome() {
    const out = new Set();
    const live = (el) => !el.closest('[data-shell-keep], [data-frame="before"]');
    const RAIL = "Graph,Data,Results,Notes,Assistant";
    for (const r of document.querySelectorAll(".k-rail")) {
        if (!live(r)) continue;
        const vis = (el) => el.checkVisibility?.() ?? !!el.offsetParent;
        const words = [...r.querySelectorAll(".k-rail-btn")].filter(vis).map((b) => (/asst-off/.test(b.className) || /^Assistant/.test(b.textContent.trim()) ? "Assistant" : b.textContent.trim().replace(/^\d+\s*/, ""))).filter((w) => w && w !== "Main menu");
        // A rail with only the main menu is the rail with no project open (the start screen).
        if (words.length && words.join() !== RAIL) out.add(`a rail of ${words.join(", ") || "nothing"} (the shell's is ${RAIL.replace(/,/g, ", ")})`);
    }
    for (const a of document.querySelectorAll(".k-app")) if (live(a) && a.querySelectorAll(".k-right").length > 1) out.add("two right columns");
    for (const a of document.querySelectorAll(".k-avatar")) if (live(a)) out.add("an avatar in the header");
    // The privacy line sits under the project name in every frame's left panel (kit/shell.mjs, step 2).
    for (const h of document.querySelectorAll(".k-app .k-panel-head")) if (live(h) && h.querySelector(".k-project") && !h.querySelector(".k-privacy")) out.add("no privacy line under the project name");
    // An avatar drawn in a page's own class: one capital letter in a round box in a header row.
    for (const el of document.querySelectorAll(".k-header1 *, .k-header2 *, .k-panel-head *, .k-right > div *")) {
        if (!live(el) || el.children.length || !/^[A-Z]$/.test(el.textContent.trim())) continue;
        const cs = getComputedStyle(el);
        if (parseFloat(cs.borderTopLeftRadius) >= Math.min(el.offsetWidth, el.offsetHeight) / 2 - 1 && el.offsetWidth > 12) out.add(`an avatar letter "${el.textContent.trim()}" in a header`);
    }
    for (const b of document.querySelectorAll(".k-header1 .k-btn, .k-header2 .k-btn")) if (live(b) && /^Export\b/.test(b.textContent.trim())) out.add("an Export button in the header");
    // There is no Note tool (decided 2026-09-28): a note starts from Add note... or the Notes panel.
    for (const u of document.querySelectorAll('.k-toolbar .k-tool use[href$="#sticky-note"]')) if (live(u)) out.add("a Note tool on the toolbar (there is no Note tool; a note starts from Add note...)");
    for (const h of document.querySelectorAll(".k-panel .k-section-head")) if (live(h) && !h.closest(".k-section[data-shell-keep]") && /^Styles\b/.test(h.textContent.trim())) out.add("Styles in the Graph panel");
    return [...out];
}

// The term sheet and the two-homes rules. `state` names a state (an element id, or a [data-state]
// tab the page switches by #hash); `retired` and `required` come from kit/terms.json. A retired
// string fails anywhere on the rendered page, prose included (a design note that describes a retired
// control as current misleads the owner as much as the control does); a required string counts only
// inside product frames, read in the participant view, so a design note cannot satisfy it; the
// two-homes rules read product frames. Runs in the page.
function termScan({ retired, required, state, exempt }) {
    const PRODUCT = "[data-kit-frame], .k-app, .k-menu, .k-popover, .k-modal, .k-toast, .k-tooltip, .k-tip, .k-canvas-card, .k-quick, .k-backdrop, .k-issue, .k-legend-card, .k-dock";
    for (const b of document.querySelectorAll('[data-frame="before"]')) b.style.setProperty("display", "none", "important");
    const vis = (el) => el.checkVisibility?.() ?? !!el.offsetParent;
    let root = document.body;
    if (state) {
        const t = document.getElementById(state);
        if (t) root = t.matches('section, figure, [class*="-state"]') ? t : t.closest('section[id], [class*="-state"]') ?? t;
        else if (!document.querySelector(`[data-state="${CSS.escape(state)}"]`)) return { missing: true };
    }
    const roots = root.matches(PRODUCT) || root.closest(PRODUCT) ? [root] : [...root.querySelectorAll(PRODUCT)].filter((el) => vis(el) && !el.parentElement.closest(PRODUCT));
    const text = roots.map((r) => r.innerText).join("\n");
    const all = exempt ? "" : root.innerText;
    const re = (t) => (t.re ? new RegExp(t.re, t.flags ?? "") : null);
    const snip = (m, x = text) => x.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/\s+/g, " ").trim();
    const found = [];
    for (const t of retired ?? []) {
        const m = t.text ? (all.indexOf(t.text) >= 0 ? { index: all.indexOf(t.text), 0: t.text } : null) : re(t).exec(all);
        if (m) found.push(`retired ${t.label ?? `"${t.text}"`}: "...${snip(m, all)}..."`);
    }
    const lacking = [];
    for (const t of required ?? []) {
        for (const x of t.text ?? []) if (!text.includes(x)) lacking.push(`"${x}"`);
        if (t.re && !re(t).test(text)) lacking.push(t.label);
    }
    // One capability, two homes.
    const homes = new Set();
    for (const r of roots) {
        for (const rc of [...(r.matches(".k-right") ? [r] : []), ...r.querySelectorAll(".k-right")]) {
            // the type line: a k-typerow, or an inspector mock's ins-type group ("TP53, Node")
            const typerow = rc.querySelector(".k-typerow")?.innerText.trim()
                || (/, ([^,]*)$/.exec(rc.querySelector(".ins-type")?.getAttribute("aria-label") ?? "")?.[1] ?? "");
            if (typerow && !/\bGraph$/.test(typerow)) continue;
            if ([...rc.querySelectorAll(".k-section-head")].some((h) => vis(h) && /^Results\b/.test(h.innerText.trim()))) homes.add("a Results section in the inspector with nothing selected, beside the Results rail place");
        }
        for (const d of [...(r.matches(".k-modal, .k-popover") ? [r] : []), ...r.querySelectorAll(".k-modal, .k-popover")]) {
            const head = d.querySelector(".k-modal-head, .k-popover-head")?.innerText.trim() ?? "";
            if (vis(d) && /^Apply\b/.test(head) && !d.innerText.includes("Use these styles")) homes.add(`a second Apply dialog ("${head.split("\n")[0]}" has no "Use these styles")`);
        }
    }
    const prev = /Previous selection(?! key)/.exec(text);
    if (prev) homes.add(`Previous selection beside the Ctrl+Z restore: "...${snip(prev)}..."`);
    return { found, lacking, homes: [...homes] };
}
// The scope formatter's rule (kit/README.md, "The scope formatter"): every count a participant reads
// is written by the formatter. Read in the participant view, inside product frames (a frame kept as
// "before" is skipped), a count is a number with a counted noun ("1,262 interactions", "56 of 300
// proteins"), "N of M" on its own ("27 of 77"), or a statistic after its label ("modularity 0.716");
// each number in it must sit inside an element the formatter wrote ([data-fx]). A threshold in
// prose ("past about 2,000 accounts") is design, not data. Table cells are rows from the fixtures and
// are not read here. Runs in the page; returns the counts it found unwritten.
function countScan() {
    const PRODUCT = "[data-kit-frame], .k-app, .k-menu, .k-popover, .k-modal, .k-toast, .k-tooltip, .k-canvas-card, .k-quick, .k-backdrop, .k-issue, .k-legend-card, .k-dock";
    const NOUNS = "nodes?|edges?|proteins?|accounts?|transfers?|characters?|patents?|components?|isolates?|interactions?|citations?|communit(?:y|ies)|neighbou?rs?|co-appearances?|rows?|members?|genes?|alerts?|merchants?|ties";
    const N = "\\d[\\d,]*(?:\\.\\d+)?";
    const RE = new RegExp(`(?<![\\w.#$/:-])${N}(?:[ \\u00a0]+of[ \\u00a0]+${N})?[ \\u00a0]+(?:${NOUNS})\\b(?![ \\u00a0]+(?:pairs|names))|(?<![\\w.#$/:-])${N}[ \\u00a0]+of[ \\u00a0]+${N}\\b(?![ \\u00a0]*(?:steps?|routes?|runs?|pages?|results?|replayed|from)\\b)|\\b(?:modularity|density|average degree|mean degree|max(?:imum)? degree|reciprocity|clustering coefficient|diameter)\\b[ \\t:=]*${N}`, "gi");
    // Design thresholds in prose; a range's upper end ("rows 1 to 7 of 1,863" is paging).
    const PROSE = /(about|over|under|up to|past|than|~|at least|at most|every|each|top|first|last|\d to)\s*$/i;
    const vis = (el) => el.checkVisibility?.() ?? !!el.offsetParent;
    const roots = [...document.querySelectorAll(PRODUCT)].filter((el) => vis(el) && !el.parentElement.closest(PRODUCT) && !el.closest('[data-frame="before"], [inert]'));
    const found = new Set();
    for (const root of roots) {
        const nodes = [];
        let text = "";
        let lastBlock = null;
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n; (n = w.nextNode()); ) {
            const el = n.parentElement;
            if (!el || el.closest('[data-kit], [data-frame="before"], [data-kit-note], table, svg, script, style, [aria-hidden="true"]') || !vis(el)) continue;
            let b = el;
            while (b !== root && /^(inline|inline-block|contents)$/.test(getComputedStyle(b).display)) b = b.parentElement;
            if ((lastBlock && b !== lastBlock) || n.previousSibling?.nodeName === "BR") text += "\n";
            lastBlock = b;
            nodes.push({ n, at: text.length });
            text += n.data;
        }
        const nodeAt = (i) => { let lo = 0, hi = nodes.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (nodes[m].at <= i) lo = m; else hi = m - 1; } return nodes[lo]?.n; };
        for (const m of text.matchAll(RE)) {
            if (PROSE.test(text.slice(Math.max(0, m.index - 14), m.index))) continue;
            // A place in a list is not a count: "rank 247 of 300", "neighbor 2 of 6", "row 3 of 40".
            if (/\b(rank|neighbou?r|row|item|selected|number)\s*$/i.test(text.slice(Math.max(0, m.index - 12), m.index))) continue;
            // 0 and 1 count nothing that can disagree between pages ("1 node", "0 rows dropped"), and a
            // stepper's position ("4 of 10" beside its arrows) is a place in a list, not a count.
            const lead = Number(m[0].match(/\d[\d,]*(?:\.\d+)?/)[0].replace(/,/g, ""));
            if (!/^[a-z]/i.test(m[0]) && lead <= 1) continue;
            if (nodeAt(m.index)?.parentElement?.closest('[class*="stepper"]')) continue;
            let bad = false;
            for (const d of m[0].matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
                const tn = nodeAt(m.index + d.index);
                // a parameter the reader set (a top-N length, a hop count) is typed, marked data-fx-param
                if (!tn?.parentElement?.closest("[data-fx], [data-fx-param]")) bad = true;
            }
            if (bad) found.add(m[0].replace(/\s+/g, " "));
        }
    }
    return [...found].slice(0, 40);
}
// The graph's own node and edge counts where the shell shows them, under `root`: the Graphs row,
// the table's scope line, and a reading labelled nodes or edges (Overview, Statistics, a load
// step's "What will load") while the filter chip reads Full graph (a filtered count only when it
// says "of" the whole). Runs in the page; both the page pass and --tasks compare them with the
// dataset's counts in kit/fixtures.json.
function graphCounts(root) {
    const vis = (el) => el.checkVisibility?.() ?? !!el.offsetParent;
    // The graph's own counts, where the shell shows them: the Graphs row, the table's scope
    // line, and Overview or Statistics while the filter chip reads Full graph (a filtered
    // count only when it says "of" the whole).
    // the last number that stands alone (not a year inside a file name, "accounts-2026-04.csv")
    const num = (s) => { const all = [...String(s).replace(/\([A-Z][a-z]+ \d{4} data\)/g, "").matchAll(/(?<![\w-])(\d[\d,]*)(?![\w-])/g)]; const m = all[all.length - 1]; return m ? Number(m[1].replace(/,/g, "")) : null; };
    const ofN = (s) => { const m = String(s).match(/\bof\s+(\d[\d,]*)/); return m ? Number(m[1].replace(/,/g, "")) : null; };
    const counts = [];
    const NODE = "nodes?|proteins?|accounts?|characters?|patents?|members?";
    const EDGE = "edges?|interactions?|transfers?|citations?|co-appearances?|ties?";
    const kind = (w) => (new RegExp(`^(${NODE})$`, "i").test(w) ? "nodes" : new RegExp(`^(${EDGE})$`, "i").test(w) ? "edges" : null);
    for (const app of root.querySelectorAll(".k-app")) {
        if (!vis(app)) continue;
        const chip = app.querySelector(".k-panel-head .k-chip-btn")?.innerText.trim() ?? "Full graph";
        const full = /^full graph$/i.test(chip);
        for (const sec of app.querySelectorAll(".k-panel .k-section")) {
            if (!/^graphs\b/i.test(sec.querySelector(".k-section-head")?.innerText.trim() ?? "")) continue;
            const rows = [...sec.querySelectorAll(".k-item")].filter(vis);
            const sel = rows.find((r) => r.getAttribute("aria-selected") === "true") ?? (rows.length === 1 ? rows[0] : null);
            const tr = sel?.querySelector(".k-trail")?.innerText.trim();
            if (tr && /^\d[\d,]*( [a-z]+)?$/i.test(tr) && (!/ /.test(tr) || kind(tr.split(" ")[1]) === "nodes")) counts.push({ what: "nodes", n: num(tr), where: "the Graphs row" });
        }
        for (const sc of app.querySelectorAll(".k-scope")) {
            if (!vis(sc)) continue;
            const t = sc.innerText;
            // "Full graph: 77 nodes." or "Filtered graph: 56 of 300 nodes"; not a set's or a path's own line,
            // and not "2,961 accounts in both months".
            const m = t.match(/^Full graph:\s*(\d[\d,]*)\s+([a-z-]+)(?=[.,;]|$)/i) ?? t.match(/^Filtered graph:\s*\S+\s+of\s+(\d[\d,]*)\s+([a-z-]+)(?=[.,;]|$)/i);
            if (m && kind(m[2])) counts.push({ what: kind(m[2]), n: Number(m[1].replace(/,/g, "")), where: "the table's scope line" });
        }
    }
    // A reading labelled nodes or edges (a metric, a data row) anywhere on the screen -- the
    // inspector's Overview, a load step's "What will load" -- except in an inspector that
    // describes a selection or a result, and a filtered count unless it says "of" the whole.
    for (const el of root.querySelectorAll(".k-metric, .k-data")) {
        if (!vis(el)) continue;
        const rc = el.closest(".k-right");
        if (rc && !/\bGraph$/.test(rc.querySelector(".k-typerow")?.innerText.trim() ?? "")) continue;
        if (el.closest(".k-popover, .k-menu, .k-tooltip")) continue;
        const label = (el.querySelector(".k-secondary, .k-name")?.innerText ?? "").trim().toLowerCase();
        const what = kind(label);
        if (!what) continue;
        const chip = el.closest(".k-app")?.querySelector(".k-panel-head .k-chip-btn")?.innerText.trim() ?? "Full graph";
        // A number bound to another state's fixture ("the months stacked", a filter's own count)
        // declares that state; kit.js has already checked it against the key it names.
        const key = el.querySelector("[data-fx]")?.dataset.fx ?? "";
        if (key && !/\.(frame\.)?(nodes|edges)$/.test(key)) continue;
        const v = (el.querySelector(".k-big, .k-value")?.innerText ?? "").trim();
        const n = ofN(v) ?? (/^full graph$/i.test(chip) ? num(v) : null);
        // A count bound to datasets.<id>.nodes names its own dataset; so does a frame inside [data-dataset].
        const ds = key.match(/^datasets\.(\w+)\./)?.[1] ?? el.closest("[data-dataset]")?.dataset.dataset;
        if (n != null) counts.push({ what, n, ds, where: `${el.closest(".k-modal") ? "the dialog's" : rc ? "the inspector's" : "the screen's"} ${label}` });
    }
    return counts;
}
// A degree label in a frame of a directed graph that does not say in, out or total. Runs in the page.
function bareDegree({ drawn, directed }) {
    const res = drawn.map(([re, ds]) => [new RegExp(re), ds]);
    const out = new Set();
    for (const app of document.querySelectorAll(".k-app")) {
        // every state a page stacks or switches to by an anchor, shown or not, is product
        if (app.closest('[data-frame="before"], [data-shell-keep]')) continue;
        const ds = new Set();
        for (const im of app.querySelectorAll("img")) { const path = new URL(im.src).pathname.replace(/^\//, "").replace(/^.*?(kit\/canvas\/|screens\/img\/|img\/)/, "$1"); const hit = res.find(([re]) => re.test(path)); if (hit) ds.add(hit[1]); }
        for (const el of app.querySelectorAll("[data-fx]")) { const m = el.dataset.fx.match(/^datasets\.([A-Za-z]+)\./); if (m) ds.add(m[1]); }
        const own = app.closest("[data-dataset]")?.dataset.dataset;
        if (own) { ds.clear(); ds.add(own); }
        if (!ds.size || ![...ds].every((d) => directed.includes(d))) continue;
        for (const el of app.querySelectorAll(".k-lg-title, .k-name, th, .k-legend, .k-metric > .k-secondary")) {
            const t = el.textContent.replace(/\s+/g, " ").trim();
            // a label whose row offers the choice ("Degree distribution" over Total, In, Out) says it
            const row = el.closest(".k-fieldrow");
            const opts = row ? [...row.querySelectorAll(".k-seg > *, [role=button], button, option")].map((x) => x.textContent.trim().toLowerCase()) : [];
            if (opts.includes("in") && opts.includes("out")) continue;
            for (const m of t.matchAll(/\bdegree\b/gi)) {
                const before = t.slice(0, m.index);
                if (/\b(in|out|total|weighted|in-|out-)[ -]?$/i.test(before) || /^degree([ -](in|out)\b|\s*\((total|in|out)\b)/i.test(t.slice(m.index))) continue;
                out.add(t.slice(0, 80));
            }
        }
    }
    return [...out];
}
// Two columns of one table never share a display name (content-design.md 5): "degree" over the
// filtered graph and "degree" over the full graph are "degree (filtered graph)" and "degree (full
// graph)". The name is the header's own text, without its profile line. Runs in the page.
function sameColumnNames() {
    const out = new Set();
    const nameOf = (th) => {
        const own = th.querySelector(".s-label, .s-gname");
        const c = (own ?? th).cloneNode(true);
        for (const x of c.querySelectorAll(".k-profile, [class*='profile'], .k-sub, small, svg, button, .k-icon-btn, [class*='hmenu']")) x.remove();
        return c.textContent.replace(/\s+/g, " ").trim().toLowerCase();
    };
    for (const thead of document.querySelectorAll(".k-app thead, [data-kit-frame] thead")) {
        if (thead.closest('[data-frame="before"], [data-shell-keep]')) continue;
        // a group row over the columns ("Degree", "Betweenness") is part of each column's name
        const groups = [];
        let leaf = null;
        for (const tr of thead.querySelectorAll("tr")) {
            if ([...tr.children].some((th) => Number(th.getAttribute("colspan") || 1) > 1)) {
                let col = 0;
                for (const th of tr.children) { const n = Number(th.getAttribute("colspan") || 1); for (let k = 0; k < n; k++) groups[col + k] = nameOf(th); col += n; }
            } else leaf = tr;
        }
        if (!leaf) continue;
        const names = [...leaf.children].map((th, k) => [groups[k], nameOf(th)].filter(Boolean).join(" / ")).filter(Boolean);
        for (const n of names) if (names.indexOf(n) !== names.lastIndexOf(n)) out.add(n);
    }
    return [...out];
}
// A drawing names its dataset by its file (kit/canvas/<dataset>-..., screens/img/...).
const DRAWN = [
    [/^(kit\/canvas\/)?lesmis-|^(screens\/)?img\/(lesmis-|table-dock-lesmis)/, "lesmis"],
    [/^(kit\/canvas\/)?karate-/, "karate"],
    [/^(kit\/canvas\/)?ppi-evidence-/, "ppiEvidence"],
    [/^(kit\/canvas\/)?ppi-|^(screens\/)?img\/(notes-ppi|results-panel-louvain)/, "ppi"],
    [/^(kit\/canvas\/)?transactions-(april|compare)-|^(screens\/)?img\/comparison-/, "transactionsApril"],
    [/^(kit\/canvas\/)?transactions-|^(screens\/)?img\/table-dock-transfers/, "transactions"],
    [/^(kit\/canvas\/)?citations-/, "citations"],
    [/^(kit\/canvas\/)?alerts-/, "alertsAugust"],
];
// Two months of the same accounts are one story: an April task may show March beside it.
const SAME = { transactionsApril: ["transactions"] };
const DEGREE_ARGS = { drawn: DRAWN.map(([re, ds]) => [re.source, ds]), directed: Object.keys(fixtures.datasets).filter((k) => fixtures.datasets[k].directed) };
const terms = JSON.parse(await readFile(join(here, "terms.json"), "utf8"));
const seen = new Map(); // "key|set" -> { text, page }
const rendered = new Map(); // page -> its text as drawn, so numbers a script writes are checked too
const browser = await chromium.launch();
try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    for (const p of pages) {
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(base + p, { waitUntil: "networkidle" });
        // a large page can reach networkidle before its deferred kit.js has run
        await page.waitForFunction(() => window.kitFx, null, { timeout: 10000 }).catch(() => {});
        const fx = await page.evaluate(() => (window.kitFx ? { bound: window.kitFx.bound, problems: window.kitFx.problems } : null));
        for (const o of await page.evaluate(oldChrome)) problems.push(`${p}: old frame: ${o} (node kit/shell.mjs ${p.replace(/[?#].*$/, "")})`);
        rendered.set(p, await page.evaluate(() => document.body.innerText));
        // A page that declares its one dataset (<body data-dataset>, or ?dataset=) shows that dataset's
        // node and edge counts wherever the shell states them. (A page that stacks several datasets is
        // checked per task, by --tasks.)
        {
            const ds = await page.evaluate(() => new URLSearchParams(location.search).get("dataset") ?? document.body.dataset.dataset ?? null);
            if (ds && fixtures.datasets[ds]) {
                for (const c of await page.evaluate(graphCounts, await page.evaluateHandle(() => document.body))) {
                    const d = c.ds && fixtures.datasets[c.ds] ? c.ds : ds;
                    const allowed = [d, ...(SAME[d] ?? [])].map((d) => fixtures.datasets[d]?.[c.what]).filter((x) => x != null);
                    if (allowed.length && !allowed.includes(c.n)) problems.push(`${p}: shows ${c.n.toLocaleString("en-US")} ${c.what} in ${c.where}; datasets.${d}.${c.what} is ${allowed[0].toLocaleString("en-US")}`);
                }
            }
        }
        // A count's bound markup written into an attribute (an alt, an aria-label) breaks the attribute.
        for (const a of await page.evaluate(() => [...document.querySelectorAll("*")].flatMap((el) => [...el.attributes].filter((x) => /<span|data-fx=/.test(x.value) || (/^data-fx-(of|noun|unit|digits|version)$/.test(x.name) && !el.hasAttribute("data-fx"))).map((x) => `${el.tagName.toLowerCase()} ${x.name}="${x.value.slice(0, 60)}"`)).slice(0, 5))) problems.push(`${p}: markup inside an attribute: ${a}`);
        if (!fx) problems.push(`${p}: does not load kit/kit.js`);
        for (const e of errors) if (!/kit problem/.test(e)) problems.push(`${p}: script error: ${e}`);
        for (const pr of fx?.problems ?? []) problems.push(`${p}: ${pr.replace(/^kit: /, "")}`);
        // A screen framed on the page (a storyboard's frames, a page that shows itself in frames) is a
        // page too: its kit problems count, named by the frame's address. Lazy frames are loaded first.
        if (await page.evaluate(() => { const l = [...document.querySelectorAll('iframe[loading="lazy"]')]; l.forEach((f) => (f.loading = "eager")); return l.length; })) {
            await page.waitForLoadState("networkidle").catch(() => {});
            await page.waitForTimeout(1500);
        }
        for (const fr of page.frames().slice(1)) {
            const fp = await fr.evaluate(() => window.kitFx?.problems ?? []).catch(() => []);
            const at = new URL(fr.url()).pathname.replace(/^\//, "") + new URL(fr.url()).search;
            for (const pr of fp) problems.push(`${p} (in the frame ${at}): ${pr.replace(/^kit: /, "")}`);
        }
        // Two pages, one fixture value, two texts: only possible when a page's own script rewrites a
        // bound number after kit.js, so this is the last line of defence.
        for (const b of fx?.bound ?? []) {
            const k = `${b.key}|${b.set}`;
            const prev = seen.get(k);
            if (!prev) seen.set(k, { text: b.text, page: p });
            else if (prev.text !== b.text) problems.push(`${p} shows "${b.text}" for ${b.key} where ${prev.page} shows "${prev.text}"`);
        }
        await page.close();
    }
    // The gate: the term sheet and the two-homes rules, read as a participant sees each page.
    const study = (p, hash = "") => `${p}${p.includes("?") ? "&" : "?"}study${hash ? `#${hash}` : ""}`;
    const load = async (url) => {
        const page = await context.newPage();
        await page.goto(base + url, { waitUntil: "networkidle" });
        await page.waitForFunction(() => window.kitFx, null, { timeout: 10000 }).catch(() => {});
        return page;
    };
    // Every state a page switches to by #hash or ?query (its state tabs and links) is loaded and read
    // too; states stacked as sections are all on the page at once.
    const statesOf = () => {
        const out = new Set();
        const own = location.pathname;
        for (const a of document.querySelectorAll("a[href]")) {
            const h = a.getAttribute("href");
            if (/^\?/.test(h)) out.add(h.replace(/([?&])study(?=&|$|#)/, "$1").replace(/^\?&/, "?").replace(/[?&](?=#|$)/, ""));
            else if (/^#[^&]/.test(h) && h !== "#study" && !document.getElementById(decodeURIComponent(h.slice(1).split("&")[0]))) out.add(h);
            else if (a.pathname === own && a.origin === location.origin && (a.search || a.hash)) {
                const q = a.search.replace(/([?&])study(?=&|$)/, "$1").replace(/[?&]$/, "").replace(/^\?&/, "?");
                if (q || (a.hash && a.hash !== "#study" && !document.getElementById(decodeURIComponent(a.hash.slice(1).split("&")[0])))) out.add(q + a.hash);
            }
        }
        for (const el of document.querySelectorAll("[data-state]")) if (/^[\w-]+$/.test(el.dataset.state)) out.add(`#${el.dataset.state}`);
        return [...out].slice(0, 60);
    };
    // The Esc rule (kit/README.md): in the participant view, Esc does one thing per press, innermost
    // first, and leaves the view only when nothing is open. Checked two ways on every page: from rest,
    // Esc pressed up to five times must leave (a page that uses the key with nothing to close traps the
    // facilitator); and after each control that opens something (a chip, a menu button, anything with
    // aria-haspopup or aria-expanded; at most six) is clicked, one Esc must not leave.
    const escRule = async (p) => {
        const url = p.includes("#") ? p.replace("#", `${p.split("#")[0].includes("?") ? "&" : "?"}study#`) : `${p}${p.includes("?") ? "&" : "?"}study`;
        const inStudy = (pg) => pg.evaluate(() => document.documentElement.hasAttribute("data-study") && window.__escProbe === 1).catch(() => false);
        const out = [];
        const openers = await (async () => {
            const pg = await load(url);
            const n = await pg.evaluate(() => {
                const vis = (el) => el.checkVisibility?.() ?? !!el.offsetParent;
                const els = [...document.querySelectorAll('.k-app .k-chip, .k-app [aria-haspopup]:not([aria-haspopup="false"]), .k-app [aria-expanded="false"], [data-kit-frame] [aria-haspopup]:not([aria-haspopup="false"]), [data-kit-frame] [aria-expanded="false"]')]
                    .filter((el) => vis(el) && !el.closest("a[href], [inert], [aria-disabled=true], [data-not-in-mock], [data-frame=before]"));
                els.forEach((el, i) => el.setAttribute("data-esc-probe", i));
                return els.map((el) => (el.getAttribute("aria-label") || el.textContent).replace(/\s+/g, " ").trim().slice(0, 40));
            });
            await pg.close();
            return n;
        })();
        // from rest
        {
            const pg = await load(url);
            await pg.evaluate(() => { window.__escProbe = 1; document.activeElement?.blur?.(); });
            let left = false;
            for (let i = 0; i < 5 && !left; i++) {
                await pg.keyboard.press("Escape");
                await pg.waitForTimeout(250);
                left = !(await inStudy(pg));
            }
            if (!left) out.push("Esc, pressed five times from rest, never leaves the participant view (a handler uses the key with nothing open)");
            await pg.close();
        }
        let tried = 0;
        for (let i = 0; i < openers.length && tried < 6; i++) {
            const pg = await load(url);
            const opened = await pg.evaluate(async (i) => {
                const el = [...document.querySelectorAll('.k-app .k-chip, .k-app [aria-haspopup]:not([aria-haspopup="false"]), .k-app [aria-expanded="false"], [data-kit-frame] [aria-haspopup]:not([aria-haspopup="false"]), [data-kit-frame] [aria-expanded="false"]')]
                    .filter((el) => (el.checkVisibility?.() ?? !!el.offsetParent) && !el.closest("a[href], [inert], [aria-disabled=true], [data-not-in-mock], [data-frame=before]"))[i];
                if (!el) return false;
                const kit = (n) => (n.nodeType === 1 ? n : n.parentElement)?.closest?.("[data-kit]");
                // What is open: expanded controls and shown overlays. A click that closes something (a
                // chip drawn open at rest) is not an opener.
                // (an inline disclosure, a "show list" button, is not an overlay: Esc does not close it)
                const openCount = () => document.querySelectorAll('[aria-expanded="true"][aria-haspopup]:not([aria-haspopup="false"])').length + [...document.querySelectorAll('.k-menu, .k-popover, .k-modal, .k-quick, [role="dialog"], [role="menu"], [role="listbox"]')].filter((x) => !x.closest("[data-kit]") && (x.checkVisibility?.() ?? !!x.offsetParent)).length;
                const before = openCount();
                const got = [];
                const mo = new MutationObserver((rs) => got.push(...rs));
                mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
                el.click();
                await new Promise((r) => setTimeout(r, 200));
                const rec = [...got, ...mo.takeRecords()].filter((r) => !kit(r.target) && !(r.type === "attributes" && /^(data-kit|tabindex$|data-esc)/.test(r.attributeName)));
                mo.disconnect();
                window.__escProbe = 1;
                return rec.length > 0 && openCount() > before && location.search.includes("study");
            }, i).catch(() => false);
            if (opened) {
                tried++;
                await pg.keyboard.press("Escape");
                await pg.waitForTimeout(300);
                if (!(await inStudy(pg))) out.push(`one Esc after opening "${openers[i]}" leaves the participant view: the handler that closed it did not call preventDefault()`);
            }
            await pg.close();
        }
        return out;
    };
    // One page's gate: the term sheet and two homes (every state, design prose included), the counts
    // the formatter did not write (every state, as a participant sees it) and the Esc rule. Pages run
    // six at a time; their problems are reported in page order.
    const gatePage = async (p) => {
        const out = [];
        const base0 = p.replace(/[?#].*$/, "");
        const first = await load(p);
        // A page that only redirects (a mock that moved) is read at its new address, on its own.
        if (new URL(first.url()).pathname !== `/${base0}`) { await first.close(); return out; }
        const variants = [...new Set((await first.evaluate(statesOf)).map((v) => (v.startsWith("#") ? `${p.replace(/#.*$/, "")}${v}` : `${base0}${v}`)))];
        const seenMsg = new Map(); // message -> the states that show it
        const exempt = terms.exempt.includes(base0);
        const note = (m, where) => (seenMsg.get(m) ?? seenMsg.set(m, []).get(m)).push(where);
        const scan = async (page, where) => {
            const r = await page.evaluate(termScan, { retired: terms.retired, exempt });
            for (const m of [...r.found, ...r.homes.map((h) => `two homes: ${h}`)]) note(m, where);
            // Degree on a directed graph is always labelled in, out or total (content-design.md 5).
            for (const d of await page.evaluate(bareDegree, DEGREE_ARGS)) note(`degree on a directed graph without in, out or total: "${d}"`, where);
            for (const d of await page.evaluate(sameColumnNames)) note(`two columns share the display name "${d}" (name each by what it counts over)`, where);
        };
        const counts = async (url, where) => {
            const [path, hash = ""] = url.split("#");
            const page = await load(study(path, hash));
            for (const c of await page.evaluate(countScan).catch(() => [])) note(`a count the formatter did not write: "${c}" (bind it: data-fx with data-fx-noun and data-fx-of, kit/README.md, "The scope formatter")`, where);
            await page.close();
        };
        await scan(first, "");
        await first.close();
        if (!exempt) await counts(p, "");
        for (const v of variants) {
            const [path, hash = ""] = v.split("#");
            const page = await load(hash ? `${path}#${hash}` : path);
            await scan(page, v.slice(base0.length));
            await page.close();
            if (!exempt) await counts(v, v.slice(base0.length));
        }
        for (const m of await escRule(p)) out.push(`${p}: Esc rule: ${m}`);
        for (const [m, where] of seenMsg) {
            const w = where.filter(Boolean);
            out.push(`${p}${where.includes("") ? "" : w[0]}: ${m}${w.length && where.includes("") ? "" : w.length > 1 ? ` (also in ${w.length - 1} more state${w.length > 2 ? "s" : ""})` : ""}`);
        }
        return out;
    };
    {
        const results = new Array(pages.length);
        let next = 0;
        await Promise.all(Array.from({ length: Math.min(6, pages.length) }, async () => {
            while (next < pages.length) {
                const i = next++;
                results[i] = await gatePage(pages[i]).catch((e) => [`${pages[i]}: the gate could not read the page: ${e.message.split("\n")[0]}`]);
            }
        }));
        for (const r of results) problems.push(...(r ?? []));
    }
    const bare = new Set(pages.map((p) => p.replace(/[?#].*$/, "")));
    for (const t of terms.required) {
        if (!bare.has(t.page)) continue;
        for (const st of t.states) {
            const page = await load(study(t.page, st));
            const r = await page.evaluate(termScan, { required: [t], state: st });
            await page.close();
            if (r.missing) problems.push(`${t.page}#${st}: required state not drawn (it must show ${[...(t.text ?? []).map((x) => `"${x}"`), ...(t.label ? [t.label] : [])].join(" and ")})`);
            else if (r.lacking.length) problems.push(`${t.page}#${st}: missing ${r.lacking.join(" and ")} (kit/terms.json: ${t.why})`);
        }
    }
    if (tasksMode) await checkTasks(context);
} finally {
    await browser.close();
    server.close();
}
// Typed counts: a number followed by a count noun ("1,904 edges") that no fixture holds anywhere.
// A heuristic (numbers under 10 and prose about other graphs slip
// through), so it is a list to work from, and fails the check only with --strict.
// ponytail: regex over the page text; bind the number with data-fx to take it off the list.
const warnings = [];
if (typed) {
    const alerts = JSON.parse(await readFile(join(here, "alerts.json"), "utf8"));
    const numsOf = (o, out = new Set()) => {
        // a measure as the formatter writes it (3 significant figures) is the fixture's number too
        if (typeof o === "number") out.add(String(o)).add(String(Number(o.toPrecision(3))));
        else if (typeof o === "string") for (const m of o.matchAll(/\d[\d,]*(?:\.\d+)?/g)) out.add(m[0].replace(/,/g, ""));
        else if (o && typeof o === "object") for (const v of Object.values(o)) numsOf(v, out);
        return out;
    };
    const sets = Object.fromEntries(Object.entries(fixtures.datasets).map(([k, v]) => [k, numsOf(v)]));
    sets.alerts = numsOf(alerts);
    sets.scenarios = numsOf(fixtures.scenarios ?? {});
    const all = new Set(Object.values(sets).flatMap((x) => [...x]));
    const dsOf = (name) => (name.startsWith("transactions-april") ? "transactionsApril" : name.startsWith("transactions-compare") ? null : name.split("-")[0]);
    // On one line (not a rule's bound above a table's label), and not "node pairs".
    const NOUN = /(\d[\d,]*(?:\.\d+)?)[ \u00a0]+(nodes?|edges?|proteins?|accounts?|transfers?|characters?|patents?|components?|isolates?|interactions?|citations?|communities|neighbou?rs?|hops?)\b(?![ \u00a0]+pairs)/gi;
    // A statistic by its label: "modularity 0.716", "Density: 0.0281", "components 3".
    const STAT = /(?<!\bas )\b(modularity|density|average degree|mean degree|max(?:imum)? degree|reciprocity|components|isolates|communities|clustering coefficient|diameter)\b[ \t:=]*(?:\n[ \t]*)?(\d[\d,]*(?:\.\d+)?(?:e-?\d+)?)(?![\d.])/gi; // e-notation: the formatter writes a measure under 0.001 as 6.02e-4
    for (const p of pages) {
        const html = await readFile(join(proto, p.replace(/[?#].*$/, "")), "utf8").catch(() => "");
        const drawn = [...new Set([...html.matchAll(/kit\/canvas\/([a-z0-9-]+)-(?:light|dark|\{theme\})\.svg/g)].map((m) => dsOf(m[1])))].filter((d) => d && sets[d]);
        const known = all; // a page may quote another graph; only a number no fixture holds is listed
        const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<\/?(div|p|li|td|th|tr|h\d|section|header|figure|figcaption|br)\b[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ") + "\n" + (rendered.get(p) ?? "");
        const n = (x) => x.replace(/,/g, "");
        // A threshold in prose ("past about 2,000 accounts") is design, not data.
        const prose = (m) => /(about|over|under|up to|past|than|~|at least|at most)\s*$/i.test(text.slice(Math.max(0, m.index - 12), m.index));
        const odd = [...new Set([
            ...[...text.matchAll(NOUN)].filter((m) => Number(n(m[1])) >= 10 && !known.has(n(m[1])) && !prose(m)).map((m) => `${m[1]} ${m[2]}`),
            ...[...text.matchAll(STAT)].filter((m) => !known.has(n(m[2])) && !known.has(String(Number(n(m[2]))))).map((m) => `${m[1]} ${m[2]}`),
        ])];
        if (odd.length) warnings.push(`${p}${drawn.length ? ` (draws ${drawn.join(", ")})` : ""}: ${odd.length} typed count${odd.length === 1 ? "" : "s"} not in the fixtures: ${odd.slice(0, 8).join("; ")}${odd.length > 8 ? "; ..." : ""}`);
    }
    if (!strict) for (const w of warnings) console.log(`typed: ${w}`);
    if (strict) problems.push(...warnings.map((w) => `typed: ${w}`));
}
// --tasks: one dataset per task, first screen to last. A drawing names its dataset by its file
// (kit/canvas/<dataset>-..., screens/img/...), a bound number by its fixture key.
async function checkTasks(context) {
    const numbersOf = (o, out = new Set()) => {
        // a measure as the formatter writes it (3 significant figures) is the fixture's number too
        if (typeof o === "number") out.add(String(o)).add(String(Number(o.toPrecision(3))));
        else if (typeof o === "string") for (const m of o.matchAll(/\d[\d,]*(?:\.\d+)?/g)) out.add(m[0].replace(/,/g, ""));
        else if (o && typeof o === "object") for (const v of Object.values(o)) numbersOf(v, out);
        return out;
    };
    const alertsJson = JSON.parse(await readFile(join(here, "alerts.json"), "utf8"));
    // A count on one line: a number, a space, a count noun (not "node pairs"; not two table cells).
    const NOUN = /(\d[\d,]*(?:\.\d+)?)[ \u00a0]+(nodes?|edges?|proteins?|accounts?|transfers?|characters?|patents?|components?|isolates?|interactions?|citations?|communities|neighbou?rs?|sources?)\b(?![ \u00a0]+pairs)/gi;
    const scenarioNumbers = numbersOf(fixtures.scenarios ?? {});
    const countClash = [];
    const countSeen = {};
    let n = 0;
    for (const [id, t] of Object.entries(fixtures.tasks)) {
        if (taskOnly && !taskOnly.includes(id)) continue;
        const ok = new Set([t.dataset, ...(SAME[t.dataset] ?? [])]);
        const known = numbersOf(fixtures.datasets[t.dataset]);
        for (const x of SAME[t.dataset] ?? []) numbersOf(fixtures.datasets[x], known);
        numbersOf(t, known);
        for (const r of t.refs ?? []) numbersOf(get(r), known); // what the task points at, in any dataset
        for (const x of scenarioNumbers) known.add(x);
        if (t.dataset === "alertsAugust") numbersOf(alertsJson, known);
        for (const pg of t.pages ?? []) {
            const [path, hash = ""] = pg.split("#");
            // A page that shows every dataset on purpose (the start screen's samples and recent projects).
            if (/<body[^>]*data-any-dataset/.test(await readFile(join(proto, path), "utf8"))) continue;
            // Read as a participant sees it: ?study hides the design notes.
            const url = `${path}${path.includes("?") ? "&" : "?"}task=${id}&study${hash ? `#${hash}` : ""}`;
            const shown = url.replace(/&study/, "");
            const page = await context.newPage();
            await page.goto(base + url, { waitUntil: "networkidle" });
            const old = await page.evaluate(oldChrome);
            const seenOnPage = await page.evaluate((gc) => {
                const graphCounts = new Function(`return (${gc})`)();
                const vis = (el) => el.checkVisibility?.() ?? !!el.offsetParent;
                // A page that stacks its states (sections) is read at the state the #hash names.
                const t = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
                let root = (t && (t.matches('section, [class*="-state"]') ? t : t.closest('section[id], [class*="-state"]'))) || document.body;
                // A state heading followed by its frame (<div class="x-state-h" id=...> then <div class="x-frame">):
                // the state runs to the next heading of the same class.
                if (root !== document.body && !root.querySelector(".k-app, [data-kit-frame]")) {
                    const box = document.createElement("div");
                    root.before(box);
                    for (let el = root, next; el && (el === root || el.className !== root.className); el = next) { next = el.nextElementSibling; box.append(el); }
                    root = box;
                }
                const imgs = [...root.querySelectorAll("img")].filter((el) => vis(el) && !el.closest(".k-thumbs, .ss-thumbs, .k-start, [data-any-dataset]")).map((el) => new URL(el.src).pathname.replace(/^\//, ""));
                // the start screen's samples show every dataset on purpose, their counts too
                const keys = [...root.querySelectorAll("[data-fx]")].filter((el) => vis(el) && !el.closest(".k-thumbs, .ss-thumbs, .k-start, [data-any-dataset]")).map((el) => el.dataset.fx).filter((k) => !k.includes("{ds}")); // {ds} is the task's own dataset
                for (const el of root.querySelectorAll(".k-thumbs, .ss-thumbs, [data-any-dataset]")) el.style.display = "none";
                // the state's own dataset (a section of a page of several says it), else the page's
                const own = !document.querySelector('[data-fx*="{ds}"]') && (root.closest("[data-dataset]")?.dataset.dataset ?? document.body.dataset.dataset);
                const text = root.innerText;
                const counts = graphCounts(root);
                const fxProblems = window.kitFx?.problems ?? [];
                return { imgs, keys, text, own, counts, fxProblems };
            }, graphCounts.toString());
            await page.close();
            const other = new Map();
            for (const src of seenOnPage.imgs) {
                const hit = DRAWN.find(([re]) => re.test(src));
                if (hit && !ok.has(hit[1])) other.set(hit[1], src.split("/").pop());
            }
            for (const k of seenOnPage.keys) {
                if ((t.refs ?? []).some((r) => k === r || k.startsWith(`${r}.`))) continue; // the task points there itself
                // April's fixture keeps March's side of every comparison under a "march" key: that is March.
                const ds = /^datasets\.transactionsApril\.(?:[\w.]*\.)?march(?:\.|$)/i.test(k) ? "transactions" : k.match(/^datasets\.([A-Za-z]+)\./)?.[1];
                if (ds && !ok.has(ds) && !other.has(ds)) other.set(ds, k);
            }
            if (seenOnPage.own && !ok.has(seenOnPage.own)) other.set(seenOnPage.own, "the page holds one dataset, <body data-dataset>");
            for (const [ds, why] of other) problems.push(`task ${id}: ${shown} shows ${ds}, not ${t.dataset} (${why})`);
            for (const o of old) problems.push(`task ${id}: ${shown} shows the old frame: ${o}`);
            for (const pr of seenOnPage.fxProblems) problems.push(`task ${id}: ${shown}: ${pr.replace(/^kit: /, "")}`);
            // One state, one set of counts: every screen of a task shows the graph the task loaded,
            // so its node and edge counts are the dataset's (or a dataset it shows beside it).
            for (const c of seenOnPage.counts) {
                const allowed = [...ok].map((d) => fixtures.datasets[d]?.[c.what]).filter((x) => x != null);
                if (t.dataset === "alertsAugust") allowed.push(alertsJson.bank[c.what]); // the same month for the whole bank
                if (allowed.length && !allowed.includes(c.n)) countClash.push({ id, shown, ...c, want: allowed[0], ds: t.dataset });
                else if (allowed.length) (countSeen[`${id}|${c.what}`] ??= new Set()).add(shown);
            }
            // A threshold in prose ("past about 2,000 accounts") is design, not data.
            const odd = [...new Set([...seenOnPage.text.matchAll(NOUN)].filter((m) => Number(m[1].replace(/,/g, "")) >= 10 && !known.has(m[1].replace(/,/g, "")) && !/(about|over|under|up to|past|than|~)\s*$/i.test(seenOnPage.text.slice(Math.max(0, m.index - 12), m.index))).map((m) => `${m[1]} ${m[2]}`))];
            if (odd.length) problems.push(`task ${id}: ${shown} types ${odd.length} count${odd.length === 1 ? "" : "s"} the ${t.dataset} fixtures do not hold: ${odd.slice(0, 6).join("; ")}${odd.length > 6 ? "; ..." : ""}`);
            const d = fixtures.datasets[t.dataset]?.directed;
            if (d === true && /\bundirected\b/i.test(seenOnPage.text) && !/\bdirected\b(?!\s*,?\s*un)/i.test(seenOnPage.text.replace(/undirected/gi, ""))) problems.push(`task ${id}: ${shown} says undirected; ${t.dataset} is directed`);
            if (d === false && /\bdirected\b/i.test(seenOnPage.text.replace(/undirected/gi, "")) && /(Direction|Edges)[^\n]{0,40}\bdirected\b/i.test(seenOnPage.text.replace(/undirected/gi, ""))) problems.push(`task ${id}: ${shown} says directed; ${t.dataset} is undirected`);
            n++;
        }
    }
    for (const c of countClash) {
        const agree = [...(countSeen[`${c.id}|${c.what}`] ?? [])].filter((x) => x !== c.shown);
        problems.push(`task ${c.id}: ${c.shown} shows ${c.n.toLocaleString("en-US")} ${c.what} in ${c.where}; datasets.${c.ds}.${c.what} is ${c.want.toLocaleString("en-US")}${agree.length ? `, as ${agree[0]} shows` : ""}`);
    }
    console.log(`checked ${n} task screen${n === 1 ? "" : "s"} of ${Object.keys(fixtures.tasks ?? {}).length} tasks`);
    // A gate that checked nothing passed nothing (round 6 ran on "0 problems on 0 pages").
    if (!n) problems.push("--tasks checked 0 task screens: kit/fixtures.json lists no task pages, or none could be read");
    taskScreens = n;
}
// --all: no shot in shots/ is older than its page or the kit (kit/README.md, "Screenshots"). A page
// that changed without being shot again fails here, so a stale PNG never reaches the gallery.
if (process.argv.includes("--all")) {
    const { execFileSync } = await import("node:child_process");
    const stale = execFileSync(process.execPath, [join(here, "shoot.mjs"), "--stale", "--dry"], { cwd: proto, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(Boolean);
    if (stale.length) problems.push(`${stale.length} shot${stale.length === 1 ? " is" : "s are"} older than its page or the kit (node kit/shoot.mjs --stale renders them again): ${stale.slice(0, 5).map((l) => l.split("  <-")[0]).join(", ")}${stale.length > 5 ? ", ..." : ""}`);
}
for (const pr of problems) console.log(pr);
console.log(`${problems.length} problem${problems.length === 1 ? "" : "s"} on ${pages.length} page${pages.length === 1 ? "" : "s"}${tasksMode ? ` and ${taskScreens} task screen${taskScreens === 1 ? "" : "s"}` : ""}; ${seen.size} fixture value${seen.size === 1 ? "" : "s"} bound`);
// A run that checked nothing is a failure, never a pass.
if (!pages.length && !taskScreens) { console.log("checked nothing: exit 1"); process.exitCode = 1; }
if (problems.length) process.exitCode = 1;
