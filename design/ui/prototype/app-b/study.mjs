#!/usr/bin/env node
// The skeleton as a study participant sees it: no review bar, no design notes, no section or state
// names. Run from design/ui/prototype/. A route is "<section>/<state>", "#/<section>/<state>" or
// "app-b/#/<section>/<state>"; with no state, the section's first.
//
//   node app-b/study.mjs --list                       every registered section/state: built or stub, region, dataset
//   node app-b/study.mjs --check <route> ...          exit 1 unless every route names a registered section and one
//                                                     of its states, renders with no stub, no render failure, no
//                                                     script error and no 404, and shows no review bar and no
//                                                     reviewer word (skeleton, not wired, stand-in) in text or a tooltip
//   node app-b/study.mjs --prove                      proves --check fails on an unknown section, an unknown state
//                                                     and a stub (a section with no render, planted for the run),
//                                                     and passes a good route; and that --try types into a focused
//                                                     box and fails with nothing focused, that shift- and ctrl-click
//                                                     select two rows, that a reviewer word is caught, and that an
//                                                     unknown step is refused
//   node app-b/study.mjs --counts                     exit 1 if a section file types a fixture count by hand (77 nodes,
//                                                     "of 254", count: 3000, AB.count(242, "row"), x ? 514 : 510)
//                                                     instead of reading AB.fx through AB.count;
//                                                     if a section writes a part of a whole its own way ("Filtered: 60
//                                                     of 77", "3,000 to 812 nodes", "3,000 -> 812", two numbers
//                                                     around an arrow icon); or if any skeleton
//                                                     file holds a banned scope string ("within 1%", "near #",
//                                                     "not used yet", "Change..."); or if a section assigns
//                                                     AB.projectCounts (register counts with AB.countSource); or if a
//                                                     string a participant can read holds a reviewer word (skeleton,
//                                                     not wired, not modeled, stand-in) outside a design note
//   node app-b/study.mjs --shoot [--dark] <route> ... participant-view PNGs: shots/app-b/<section>--<state>[--dark].png
//   node app-b/study.mjs --task <id> <route> ...      a task's routes in order: shots/tasks/<id>/01.png, 02.png, ...
//                                                     and shots/tasks/<id>/routes.json (the routes, in order). Exit 1,
//                                                     and no routes.json, unless every route draws one project. The PNG
//                                                     names carry no route, so a participant shown 01.png learns nothing
//                                                     from its name; routes.json is for graders and the preflight
//   node app-b/study.mjs --fresh <png or task id> ... exit 1 unless each PNG (each task's routes.json and every PNG
//                                                     it lists) exists and is newer than every file under app-b/
//   node app-b/study.mjs --try <out.png> <route or task:<id>> [--click "<name>" | --rclick "<name>" | --dblclick "<name>"
//                                                     | --shift-click "<name>" | --ctrl-click "<name>" | --alt-click "<name>"
//                                                     | --hover "<name>" | --hover-at x,y | --hover-icon <n> | --key <Key>
//                                                     | --type "<text>" | --expect "<text>" | --expect-not "<text>"] ...
//                                                     a participant's click-through: opens the route, does each step
//                                                     in order, saves what is on screen; prints the PNG path and what a
//                                                     participant would notice. <name> is what the control says or its
//                                                     tooltip name; a name several controls share prints "ambiguous"
//                                                     and takes the first: "<name>#2" takes the second, and
//                                                     "role=<role>:<name>" (role=treeitem:Louvain) only that role.
//                                                     Every hover prints the tooltip; --hover-at hovers a point and
//                                                     --hover-icon the nth icon-only control (counted in page
//                                                     order), for a tooltip whose name is not known. task:<id> starts at
//                                                     that task's first route without naming it. --rclick right-clicks;
//                                                     --dblclick double-clicks (rename); --shift-click, --ctrl-click
//                                                     and --alt-click hold that key (add to the selection, solo a row);
//                                                     --type types the text into what has focus, a key at a time, and
//                                                     exits 1 (typing nothing) when nothing that takes text has focus;
//                                                     --expect exits 1 unless that text (role=<role>, e.g. role=menu;
//                                                     selected=N, exactly N rows selected) is visible at that step,
//                                                     --expect-not unless it is gone: a click-through regression, which
//                                                     --check (direct loads) cannot see. A script error, a 404 or a
//                                                     reviewer word on screen or in a tooltip exits 1. An unknown step
//                                                     is refused (exit 2) before the browser opens
//   node app-b/study.mjs --matrix                     checks ../study/structure-comparison/state-matrix.md: every cell of
//                                                     its surface tables (no blank cell, no N/A without a reason, no
//                                                     BUILD left), the routes in backticks in the prose under the tables,
//                                                     every section of --list named by a table row, and every route
//                                                     passing --check, with focus inside any menu, popover or dialog
//
// A route may end in @1024 (in --check, --shoot, --try and --matrix): it opens in a 1024 x 768 window
// instead of 1440 x 900. Every 25 routes get a fresh browser context, and each context is closed.
//
// Pages are served from a throwaway loopback server (as kit/shoot.mjs does), so dev.ato.ms need not be up.
process.env.FC_FONTATIONS = "1"; // headless Chromium crashes on startup on this host without it

import { createServer } from "node:http";
import { readFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// Every run holds one of the shared browser slots (kit/with-browser.sh), so the design round as a
// whole never runs more than four browsers at once.
if (!process.env.BROWSER_SLOT) {
    const { spawnSync } = await import("node:child_process");
    const gate = new URL("../kit/with-browser.sh", import.meta.url).pathname;
    const r = spawnSync(gate, [process.execPath, ...process.argv.slice(1)], { stdio: "inherit" });
    process.exit(r.status ?? 1);
}


const here = dirname(fileURLToPath(import.meta.url));
const proto = resolve(here, "..");
const { chromium } = await import(resolve(proto, "../../../node_modules/playwright/index.mjs"));

const args = process.argv.slice(2);
const mode = args.find((a) => /^--(list|check|prove|shoot|task|fresh|try|matrix|counts)$/.test(a));
if (!mode) {
    console.error("usage: node app-b/study.mjs --list | --matrix | --counts | --check <route>... | --prove | --shoot [--dark] <route>... | --task <id> <route>... | --fresh <png|task id>... | --try <out.png> <route> [--click|--dblclick|--shift-click|--ctrl-click|--alt-click|--rclick|--hover name | --hover-at x,y | --hover-icon n | --key Key | --type text | --expect text]...");
    process.exit(2);
}
const dark = args.includes("--dark");
// "<route>@1024" opens in a 1024 x 768 window; routeOf drops the suffix for the registry lookup
const NARROW = /@1024$/;
const narrowOf = (r) => NARROW.test(String(r).trim());
const routeOf = (r) => String(r).trim().replace(NARROW, "").replace(/^https?:\/\/[^#]*#/, "").replace(/^(\.?\/)?(app-b\/?)?(index\.html)?#?\/?/, "").replace(/\/+$/, "");
const shown = (r) => routeOf(r) + (narrowOf(r) ? "@1024" : "");
const slug = (r) => (routeOf(r).replace(/\//g, "--") || "graph-place") + (narrowOf(r) ? "--1024" : "");

if (mode === "--fresh") {
    // The newest file of the skeleton: a render older than it may not show what the skeleton draws now.
    const newest = async (dir) => {
        let t = 0;
        for (const e of await readdir(dir, { withFileTypes: true })) t = Math.max(t, e.isDirectory() ? await newest(join(dir, e.name)) : (await stat(join(dir, e.name))).mtimeMs);
        return t;
    };
    const src = await newest(here);
    const bad = [];
    let n = 0;
    for (const a of args.filter((x) => !x.startsWith("--"))) {
        let pngs = [a];
        if (!a.endsWith(".png")) {
            const list = JSON.parse(await readFile(join(proto, "shots/tasks", a, "routes.json"), "utf8").catch(() => "null"));
            if (!list?.length) { bad.push(`task ${a}: no shots/tasks/${a}/routes.json (render it with --task)`); continue; }
            pngs = list.map((r, k) => `shots/tasks/${a}/${String(k + 1).padStart(2, "0")}.png`);
        }
        for (const p of pngs) {
            const s = await stat(join(proto, p)).catch(() => null);
            n++;
            if (!s) bad.push(`${p}: missing`);
            else if (s.mtimeMs < src) bad.push(`${p}: older than the newest file under app-b/`);
        }
    }
    for (const b of bad) console.log(b);
    console.log(`${bad.length} problem${bad.length === 1 ? "" : "s"} on ${n} render${n === 1 ? "" : "s"}`);
    process.exit(bad.length || !n ? 1 : 0);
}

if (mode === "--counts") {
    // Every node and edge count of every fixture dataset (20 or more, so small numbers are not flagged)
    const fx = JSON.parse(await readFile(join(here, "kit/fixtures.json"), "utf8"));
    const more = JSON.parse(await readFile(join(here, "kit/wide-nested.json"), "utf8"));
    const nums = new Set();
    for (const d of [...Object.values(fx.datasets), ...Object.values(more)]) for (const k of ["nodes", "edges", "records"]) if (d[k] >= 20) nums.add(d[k]);
    const alt = [...nums].flatMap((n) => [String(n), n.toLocaleString("en-US")]).filter((v, i, a) => a.indexOf(v) === i);
    const N = `(?:${alt.join("|")})`;
    // Every count anywhere in the fixtures (a value named nodes, edges, records, rows, count, total or
    // members, a nested document's record arrays, and every list of 20 or more): a literal one of these
    // inside AB.count(...) is typed by hand, and so is a three-digit one chosen by a ternary
    const deep = new Set();
    (function walk(o, k, d) {
        if (o == null || d > 8) return;
        if (typeof o === "number") { if (/^(nodes|edges|records|rows|count|total|members)$/i.test(k) && o >= 20 && Number.isInteger(o)) deep.add(o); return; }
        if (Array.isArray(o)) { if (o.length >= 20) deep.add(o.length); o.forEach((x) => walk(x, k, d + 1)); return; }
        if (typeof o === "object") for (const kk in o) walk(o[kk], k === "recordArrays" ? "count" : kk, d + 1);
    })({ fx, more }, "", 0);
    // The nested counts the shell derives at boot (app.js derivedCounts, AB.fx.datasets.nested.derived) are
    // fixture counts too: coauthor items, distinct coauthor pairs, affiliations, links to researchers.
    // ponytail: mirrors derivedCounts' four sums; change both together
    const NR = more.nested.document.data.researchers, nIds = new Set(NR.map((r) => r.id)), nPairs = new Set();
    NR.forEach((r) => r.relationships.coauthor_ids.forEach((c) => nPairs.add([r.id, c].sort().join(" "))));
    [NR.reduce((a, r) => a + r.relationships.coauthor_ids.length, 0), nPairs.size, NR.reduce((a, r) => a + (r.attributes.affiliations || []).length, 0),
        more.nested.document.links.filter((l) => nIds.has(l.target)).length].forEach((n) => n >= 20 && deep.add(n));
    const COUNT_CALL = /\b(?:AB|A)\.count\(([^,()]*(?:\([^()]*\)[^,()]*)*)(?:,[^)]*?\bof:\s*([^,})]+))?/g;
    const TERNARY = /\?\s*(\d{3,})\s*:|\?[^?:]*:\s*(\d{3,})\b(?!\s*(?:px|%|ms))/;
    const re = new RegExp(`(?<![\\w.,#-])${N}(?![\\w.,])\\s*(?:nodes?|edges?|links?|rows?|hosts|connections|accounts|records|proteins|patents|researchers|institutions)\\b|\\bof\\s+${N}(?![\\w.,])|\\b(?:count|total|nodes|edges)\\s*:\\s*["']?${N}(?![\\w.,])|["']${N}["']\\s*,\\s*["'](?:nodes|edges)["']`);
    // "Filtered: " before a count; a reduction written "a to b nodes" or "a -> b" (with a count beside it)
    const PART = /["'`]Filtered:\s*["'`]?\s*\+\s*(?:AB\.|A\.)?(?:count|fx|num)|["'`]Filtered:\s*[\d$]|\}\s*(?:to|->)\s*\$\{[^}]*\}\s*(?:nodes?|edges?|rows?)\b|\)\s*\+\s*["'`]\s*->\s*["'`]\s*\+\s*(?:AB\.)?(?:num|count|n|fmt)\(|(?:num|count|fmt|\bn)\([^()]*\)\)\s*,\s*icon\(["']arrow-right["']/;
    const BANNED = /within 1%|near #|not used yet|Change\.\.\./;
    const bad = [];
    for (const f of (await readdir(join(here, "sections"))).filter((x) => x.endsWith(".js")).sort()) {
        // comments may cite the fixtures' numbers: block comments keep their line breaks, line comments go
        const src = (await readFile(join(here, "sections", f), "utf8")).replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ""));
        src.split("\n").forEach((line, i) => {
            const code = line.replace(/(^|\s)\/\/.*$/, "");
            const m = code.match(re);
            if (m) bad.push(`sections/${f}:${i + 1}: "${m[0]}" is typed by hand; read it from AB.fx and write it with AB.count`);
            // AB.count(242, "row"), AB.count(x ? 242 : 0, ...), { of: 254 }: a fixture count typed into the formatter
            for (const c of code.matchAll(COUNT_CALL)) {
                const lit = ((c[1] + " " + (c[2] || "")).match(/(?<![\w.$])\d+(?![\w.])/g) || []).find((x) => deep.has(Number(x)));
                if (lit) bad.push(`sections/${f}:${i + 1}: "${c[0].slice(0, 60)}" types the fixture count ${lit} by hand; read it from the fixture`);
            }
            // NL.coPer === "item" ? 514 : 510 -- a fixture count picked by a ternary, either branch
            const q = code.indexOf("?");
            // a duration or a size picked by a ternary (loadMs = () => x ? 1500 : 200) is not a count
            if (TERNARY.test(code) && !/\w(?:Ms|Delay|Timeout|Width|Height)\b|\b(?:ms|delay|timeout|width|height)\b|setTimeout/.test(code)) for (const t of code.slice(q).matchAll(/[?:]\s*(\d{3,})\b(?!\s*(?:px|%|ms))/g)) {
                if (deep.has(Number(t[1]))) bad.push(`sections/${f}:${i + 1}: "${t[0].trim()}" types the fixture count ${t[1]} by hand; read it from the fixture`);
            }
            // a part of a whole is "60 of 77 nodes", from AB.count(n, noun, { of }), on every surface
            const w = code.match(PART);
            if (w) bad.push(`sections/${f}:${i + 1}: "${w[0]}" writes a part of a whole its own way; use AB.count(n, noun, { of })`);
            // a project's counts have one reader, the shell's, which adds every Remove from data
            if (/\bAB\.projectCounts\s*=(?!=)/.test(code)) bad.push(`sections/${f}:${i + 1}: assigns AB.projectCounts; register the project's counts with AB.countSource(dataset, fn)`);
        });
    }
    // the scope strings no surface may show, in the section files and the shell's
    for (const f of ["app.js", "lib.js", ...(await readdir(join(here, "sections"))).filter((x) => x.endsWith(".js")).map((x) => "sections/" + x)].sort()) {
        (await readFile(join(here, f), "utf8")).split("\n").forEach((line, i) => {
            const b = line.replace(/(^|\s)\/\/.*$/, "").match(BANNED);
            if (b) bad.push(`${f}:${i + 1}: "${b[0]}" may not appear on any surface; write the scope with AB.count`);
        });
    }
    // reviewer words in a string a participant can read (a notice, a tooltip, a label); a design note
    // (openQuestion, needsElement, designNote) is review-only, and so is the shell's review bar and map
    const WORDS = /\bskeleton\b|\bnot (?:wired|modell?ed)\b|\bstand-ins?\b/i;
    for (const f of ["app.js", "lib.js", ...(await readdir(join(here, "sections"))).filter((x) => x.endsWith(".js")).map((x) => "sections/" + x)].sort()) {
        const src = (await readFile(join(here, f), "utf8")).replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ""));
        src.split("\n").forEach((line, i) => {
            const code = line.replace(/(^|\s)\/\/.*$/, "");
            if (/\b(?:openQuestion|needsElement|designNote)\(|ab-rv-|ab-map-|served over HTTP/.test(code)) return;
            for (const m of code.matchAll(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g)) {
                // "skeleton" alone is a word a person may search for (the backbone of a graph)
                if (WORDS.test(m[0]) && !/^["'`]skeleton["'`]$/.test(m[0])) bad.push(`${f}:${i + 1}: ${m[0].slice(0, 90)} holds a reviewer word a participant would read; say what happens in the product, or "not available yet"`);
            }
        });
    }
    for (const b of bad) console.log(b);
    console.log(`${bad.length} problem${bad.length === 1 ? "" : "s"}: counts not written by AB.count, banned scope strings, reviewer words`);
    process.exit(bad.length ? 1 : 0);
}

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
    const file = join(proto, normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, ""));
    if (!file.startsWith(proto)) return res.writeHead(403).end();
    try { res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(await readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}/app-b/index.html`;
const browser = await chromium.launch();
// One context per window size, created on first use and closed by rotate(): a run gives every 25
// routes or fewer a fresh context, so no context lives long enough to grow.
const contexts = new Map();
async function contextFor(narrow) {
    if (contexts.has(narrow)) return contexts.get(narrow);
    const viewport = narrow ? { width: 1024, height: 768 } : { width: 1440, height: 900 };
    const c = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: dark ? "dark" : "light" });
    // The participant view: design notes hidden for good ("participant": the shell draws no review bar
    // and no Review button, and no click or key brings design notes back), and the review bar gone.
    await c.addInitScript((theme) => {
        // every page starts from a clean store, so a state one route remembers (the legend off, a
        // collapsed section) never carries into the next route a run opens in the same context
        // Pages of one context share localStorage and up to six load at once, so the participant
        // keys are never cleared: a clear() here once let another page read designNotes in the gap
        // and draw its design-note chips
        try {
            for (const k of Object.keys(localStorage)) if (k !== "ab.designNotes" && k !== "ab.theme") localStorage.removeItem(k);
            localStorage.setItem("ab.designNotes", "participant");
            localStorage.setItem("ab.theme", theme);
        } catch (e) { /* fine */ }
        addEventListener("DOMContentLoaded", () => document.head.append(Object.assign(document.createElement("style"), { textContent: "#ab-review{display:none!important}:root{--ab-review-h:0px!important}" })));
    }, dark ? "dark" : "light");
    contexts.set(narrow, c);
    return c;
}
async function rotate() {
    for (const c of contexts.values()) await c.close().catch(() => {});
    contexts.clear();
}
// Runs fn over the routes, `at` at a time, in batches of 25 or fewer, each batch in fresh contexts;
// returns the results in the order given
async function batched(routes, fn, at = 1) {
    const out = new Array(routes.length);
    for (let b = 0; b < routes.length; b += 25) {
        const chunk = routes.slice(b, b + 25);
        let next = 0;
        await Promise.all(Array.from({ length: Math.min(at, chunk.length) }, async () => { while (next < chunk.length) { const i = next++; out[b + i] = await fn(chunk[i]); } }));
        await rotate();
    }
    return out;
}

// Opens a route; returns what a checker needs. Never throws.
// plant: a section id served as a section file that registers no render (the --prove stub case)
async function open(route, plant) {
    const page = await (await contextFor(narrowOf(route))).newPage();
    if (plant) {
        await page.route("**/sections/manifest.json", async (rt) => { const r = await rt.fetch(); rt.fulfill({ response: r, json: [...(await r.json()), plant] }); });
        await page.route(`**/sections/${plant}.js`, (rt) => rt.fulfill({ contentType: "text/javascript", body: `registerSection({ id: "${plant}", title: "Planted stub", region: "left", states: ["only"] });` }));
    }
    const errors = [];
    page.on("pageerror", (e) => errors.push(`script error: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`console error: ${m.text().slice(0, 160)}`));
    page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url().replace(/^http:\/\/127\.0\.0\.1:\d+\//, "")}`));
    const r = routeOf(route);
    await page.goto(`${base}#/${r}`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => errors.push("did not settle in 30 s"));
    await page.waitForFunction(() => window.AB && AB.fx && (AB.route || document.body.dataset.page === "map"), null, { timeout: 15000 }).catch(() => errors.push("the skeleton never rendered"));
    let last = -1;
    for (let i = 0; i < 20; i++) {
        const n = await page.evaluate(() => document.body.innerHTML.length).catch(() => -1);
        if (n === last) break;
        last = n;
        await page.waitForTimeout(100);
    }
    return { page, errors, r };
}

// focus: true also fails a route that opens a menu, popover or dialog and leaves focus on the page body
async function check(route, focus, plant) {
    const { page, errors, r } = await open(route, plant);
    const [id, ...rest] = r.split("/");
    const want = rest.join("/");
    const info = await page.evaluate(([id, want]) => {
        const sec = AB.sections && AB.sections[id];
        const vis = (el) => el.checkVisibility?.() ?? !!el.offsetParent;
        const app = document.getElementById("ab-app");
        return {
            known: !!sec,
            states: sec ? sec.states.map((s) => s.id) : [],
            built: !!sec && typeof sec.render === "function",
            landed: AB.route ? `${AB.route.id}/${AB.route.state}` : location.hash,
            dataset: AB.route && AB.route.frame.dataset,
            stub: app ? [...app.querySelectorAll(".ab-stub-banner, .ab-stub-card, .ab-missing")].filter(vis).map((e) => e.textContent.trim().slice(0, 80)) : [],
            review: vis(document.getElementById("ab-review")),
            notes: [...document.querySelectorAll(".ab-design-note")].filter(vis).length,
            lostFocus: !!(AB.route && AB.route.frame.overlay && document.getElementById("ab-overlay").dataset.active === "true" && (!document.activeElement || document.activeElement === document.body)),
        };
    }, [id, want]).catch((e) => ({ known: false, states: [], err: e.message }));
    const leaked = await leaks(page);
    await page.close();
    const out = [];
    if (!info.known) out.push(`no section "${id}" (the manifest lists the sections; --list shows every route)`);
    else {
        if (want && !info.states.includes(want)) out.push(`section ${id} has no state "${want}" (its states: ${info.states.join(", ")})`);
        if (!info.built) out.push(`section ${id} is a stub (no render)`);
        const landed = info.landed.replace(/^#\//, "");
        if (!landed.startsWith(`${id}/`)) out.push(`opened ${landed}, not ${id} (redirected)`);
    }
    for (const s of info.stub ?? []) out.push(`shows a stub or a failed render: "${s}"`);
    if (info.review) out.push("the review bar shows (the participant view must hide it)");
    if (info.notes) out.push(`${info.notes} design note chip(s) show in the participant view`);
    for (const l of leaked) out.push(`a reviewer word shows to the participant: ${l}`);
    if (focus && info.lostFocus) out.push("a menu, popover or dialog is open and focus is on the page body");
    out.push(...errors);
    return { route: shown(route), dataset: info.dataset, problems: out };
}

async function shoot(route, file) {
    const { page, errors } = await open(route);
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await mkdir(dirname(file), { recursive: true });
    await page.screenshot({ path: file });
    errors.dataset = await page.evaluate(() => AB.route && AB.route.frame.dataset).catch(() => null);
    await page.close();
    return errors;
}

// ---------- --matrix: the state matrix (../study/structure-comparison/state-matrix.md) ----------
// Parses the matrix: every cell of the tables headed "Surface" and of the regressions table, and the
// routes in backticks in the prose between the first surface table and "Routes to build" (the
// build list, which repeats routes already in the cells). Prints each problem; returns the exit code.
const ROUTE = /^(BUILD )?([a-z0-9-]+\/[a-z0-9-]+(?:\/[a-z0-9-]+)*(?:@1024)?)$/;
function parseMatrix(text) {
    const lines = text.split("\n");
    const problems = [];
    const routes = new Map(); // route -> where it was named (first place)
    const named = new Set(); // sections a surface table row names
    let header = null, inBody = false, done = false;
    const add = (r, where) => { if (!routes.has(r)) routes.set(r, where); };
    // backticked routes in a piece of text: `x`, `BUILD x`, and BUILD `x` (a cell's prefix)
    const scan = (t, where, isCell) => {
        const found = [];
        for (const m of t.matchAll(/(BUILD\s+)?`([^`]+)`/g)) {
            const inner = m[2].trim();
            const rm = inner.match(ROUTE);
            if (!rm) continue;
            if (m[1] || rm[1]) problems.push(`${where}: still marked BUILD: ${rm[2]}`);
            else found.push(rm[2]);
        }
        if (isCell) found.forEach((r) => named.add(r.split("/")[0]));
        found.forEach((r) => add(r, where));
        return found;
    };
    lines.forEach((line, i) => {
        const at = `state-matrix.md:${i + 1}`;
        if (/^## Routes to build/.test(line)) done = true;
        if (done) return;
        if (!line.startsWith("|")) {
            header = null;
            if (inBody) scan(line, at, false);
            return;
        }
        const cells = line.split("|").slice(1, -1).map((c) => c.trim());
        if (!header) { header = cells; return; }
        if (cells.every((c) => /^-+$/.test(c))) return;
        if (header[0] === "Surface") {
            inBody = true;
            const surface = cells[0];
            if (cells.length !== header.length) problems.push(`${at}: ${surface}: ${cells.length - 1} state cells where the header has ${header.length - 1}`);
            cells.slice(1).forEach((c, k) => {
                const where = `${at} ${surface} / ${header[k + 1]}`;
                if (!c) return problems.push(`${where}: blank cell`);
                if (/^N\/A/.test(c)) { if (!/^N\/A:\s*\S/.test(c)) problems.push(`${where}: N/A with no reason`); return; }
                const got = scan(c, where, true);
                if (!got.length && !/BUILD/.test(c)) problems.push(`${where}: no route and no N/A: "${c.slice(0, 60)}"`);
            });
        } else if (header[0] === "Problem") {
            cells.slice(1).forEach((c) => scan(c, at + " (regressions)", false));
        }
    });
    return { problems, routes, named };
}
async function matrix() {
    const file = join(proto, "study/structure-comparison/state-matrix.md");
    const { problems, routes, named } = parseMatrix(await readFile(file, "utf8"));
    // every section of --list must be named by a table row
    const { page } = await open("map");
    const sections = await page.evaluate(() => AB.order.concat(Object.keys(AB.sections).filter((id) => !AB.order.includes(id))));
    await page.close();
    await rotate();
    for (const id of sections) if (!named.has(id)) problems.push(`section ${id} is in --list, and no row of the matrix names it`);
    const list = [...routes.keys()];
    const results = await batched(list, (r) => check(r, true), 6);
    let bad = 0;
    for (const c of results) {
        if (!c.problems.length) continue;
        bad++;
        for (const p of c.problems) problems.push(`app-b/#/${c.route} (${routes.get(c.route)}): ${p}`);
    }
    for (const p of problems) console.log(p);
    console.log(`${list.length} routes checked, ${bad} failed; ${problems.length} problem${problems.length === 1 ? "" : "s"} in all`);
    return problems.length ? 1 : 0;
}

// ---------- --try: a participant's steps ----------
const CLICKS = { "--click": {}, "--hover": {}, "--rclick": { button: "right" }, "--dblclick": {}, "--shift-click": { modifiers: ["Shift"] }, "--ctrl-click": { modifiers: ["Control"] }, "--alt-click": { modifiers: ["Alt"] } };
const STEPS = new Set([...Object.keys(CLICKS), "--hover-at", "--hover-icon", "--key", "--type", "--expect", "--expect-not"]);
// The key names keyboard.press knows (case matters: "Space", not "space"), each part of a chord such as Control+Shift+z
const KEYS = new Set(["Shift", "Control", "Alt", "Meta", "ControlOrMeta", "Enter", "Tab", "Backspace", "Delete", "Escape", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "Home", "End", "PageUp", "PageDown", "Insert", "ContextMenu", ...Array.from({ length: 12 }, (_, i) => "F" + (i + 1))]);
const keyOk = (v) => v.split(/\+(?!$)/).every((k) => k.length === 1 || KEYS.has(k) || /^(Key[A-Z]|Digit\d|Numpad\d)$/.test(k));
// Every step is known and has a value, before anything opens; returns the refusal, or null
function refuse(list) {
    for (let i = 0; i < list.length; i += 2) {
        const [a, v] = [list[i], list[i + 1]];
        if (!STEPS.has(a)) return `--try: unknown step "${a}"; steps: ${[...STEPS].join(", ")}`;
        if (v === undefined) return `--try: ${a} needs a value`;
        if (a === "--hover-at" && !/^\d+,\d+$/.test(v)) return `--try: --hover-at takes x,y in pixels, not "${v}"`;
        if (a === "--hover-icon" && !/^[1-9]\d*$/.test(v)) return `--try: --hover-icon takes a number from 1, not "${v}"`;
        if (a === "--key" && !keyOk(v)) return `--try: --key takes a key name such as Enter, Space, Escape, ArrowDown, F2, a, or a chord such as Control+f; not "${v}"`;
    }
    return null;
}
const ROLES = ["button", "link", "menuitem", "menuitemcheckbox", "tab", "treeitem", "switch", "option"];
// The control a click names: "<name>", "<name>#2" (the second of that name) or "role=<role>:<name>".
// Exact names before partial ones, controls before text; every match counted, so a name that is
// not unique says so instead of silently taking the first.
async function find(page, raw) {
    let name = raw, role = null, nth = 0;
    const r = raw.match(/^role=([a-z]+):(.+)$/);
    if (r) [role, name] = [r[1], r[2]];
    const n = name.match(/^(.*\S)#(\d+)$/);
    if (n) [name, nth] = [n[1], +n[2]];
    for (const exact of [true, false]) {
        const locs = role ? [page.getByRole(role, { name, exact })] : [...ROLES.map((x) => page.getByRole(x, { name, exact })), page.getByLabel(name, { exact }), page.getByText(name, { exact })];
        const seen = new Map(); // one entry per control: text inside a button is that button
        for (const loc of locs) {
            for (const el of await loc.filter({ visible: true }).elementHandles()) {
                const [key, desc] = await el.evaluate((e) => {
                    if (e.closest(".ab-tip, [aria-hidden=true]")) return [null]; // the tooltip bubble is not a control
                    const c = e.closest("button,a[href],input,select,textarea,label,tr,[tabindex],[role=button],[role=link],[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio],[role=tab],[role=treeitem],[role=switch],[role=option],[role=row],[role=checkbox],[role=radio]") || e;
                    c.dataset.tryKey ??= String((window.__tryKeys = (window.__tryKeys || 0) + 1));
                    const said = (c.getAttribute("aria-label") || c.innerText || c.dataset.tip || "").trim().replace(/\s+/g, " ").slice(0, 40);
                    return [c.dataset.tryKey, `${c.getAttribute("role") || c.tagName.toLowerCase()} "${said}"`];
                });
                if (key && !seen.has(key)) seen.set(key, { el, desc });
            }
        }
        const all = [...seen.values()];
        if (!all.length) continue;
        if (nth > all.length) return { miss: `"${raw}": only ${all.length} control${all.length === 1 ? " is" : "s are"} called "${name}" (${all.map((x) => x.desc).join(", ")})` };
        if (!nth && all.length > 1) console.log(`ambiguous: "${name}" matches ${all.length} controls (${all.map((x) => x.desc).join(", ")}); clicked the first`);
        return { el: all[Math.max(nth, 1) - 1].el };
    }
    return { miss: `nothing on screen is called "${name}"` };
}
// The tooltip on screen now, or null
const tooltip = (page) => page.evaluate(() => { const t = document.querySelector(".ab-tip:not([hidden])"); return t && t.checkVisibility() ? t.innerText.replace(/\s+/g, " ").trim() : null; });
// Reviewer words a participant must never read: visible text, tooltips, names and notices in the
// app (design notes are review-only and hidden in the participant view)
const REVIEWER = /\bskeleton\b|\bnot (?:wired|modell?ed)\b|\bstand-ins?\b/i;
const leaks = (page) => page.evaluate((src) => {
    const W = new RegExp(src, "i");
    const out = new Set();
    for (const root of [document.getElementById("ab-app"), document.getElementById("ab-notice"), document.querySelector(".ab-tip")].filter(Boolean)) {
        for (const el of [root, ...root.querySelectorAll("*")]) {
            if (el.closest(".ab-design-note") || !el.checkVisibility()) continue;
            for (const a of ["data-tip", "data-tip2", "aria-label", "aria-description", "placeholder"]) { const v = el.getAttribute(a); if (v && W.test(v)) out.add(`${a} "${v.slice(0, 100)}"`); }
            for (const t of el.childNodes) if (t.nodeType === 3 && W.test(t.textContent)) out.add(`text "${t.textContent.trim().slice(0, 100)}"`);
        }
    }
    return [...out];
}, REVIEWER.source).catch(() => []);
// Runs the steps on an open page; prints what a participant would notice; returns the exit code
async function run(page, list, errors = []) {
    let code = 0;
    const leaked = new Set();
    const look = async () => { for (const l of await leaks(page)) if (!leaked.has(l)) { leaked.add(l); console.log(`a reviewer word shows to the participant: ${l}`); code = 1; } };
    await look();
    for (let i = 0; i < list.length; i += 2) {
        const [a, v] = [list[i], list[i + 1]];
        if (a === "--expect" || a === "--expect-not") {
            // exit 1 unless that text is visible (role=<role> for a role, e.g. role=menu; selected=N for exactly
            // N selected rows), or for --expect-not unless it is gone
            let seen;
            const sel = v.match(/^selected=(\d+)$/);
            if (sel) {
                const n = await page.locator("[aria-selected=true]:not([role=tab])").filter({ visible: true }).count();
                seen = n === +sel[1];
                if (seen !== (a === "--expect")) console.log(`${n} row${n === 1 ? " is" : "s are"} selected; ${a === "--expect" ? "expected" : "expected other than"} ${sel[1]}`);
                if (seen !== (a === "--expect")) code = 1;
                continue;
            }
            const loc = v.startsWith("role=") ? page.getByRole(v.slice(5)) : page.getByText(v, { exact: false });
            // text in a field counts too: what --type put in a query or a name is on screen
            seen = (await loc.filter({ visible: true }).count()) > 0 || (!v.startsWith("role=") && await page.evaluate((w) => [...document.querySelectorAll("input, textarea")].some((f) => f.checkVisibility() && f.value.includes(w)), v));
            if (seen !== (a === "--expect")) { console.log(`${a === "--expect" ? "expected on screen, not there" : "expected gone, still on screen"}: "${v}"`); code = 1; }
            continue;
        }
        if (a in CLICKS) {
            const verb = a === "--hover" ? "hover" : a === "--dblclick" ? "dblclick" : "click";
            const f = await find(page, v);
            if (f.miss) console.log(f.miss);
            else await f.el[verb](Object.assign({ timeout: 3000 }, CLICKS[a])).catch((e) => console.log(`could not ${verb} "${v}": ${e.message.split("\n")[0]}`));
            await page.waitForTimeout(verb === "hover" ? 800 : 400); // a tooltip shows 500 ms after the pointer arrives
            if (verb === "hover" && !f.miss) console.log(`tooltip: ${JSON.stringify(await tooltip(page))}`);
        } else if (a === "--hover-at" || a === "--hover-icon") {
            // a tooltip read without knowing the control's name: by position, or the nth icon-only control
            let at = v.split(",").map(Number);
            if (a === "--hover-icon") {
                const icons = await page.locator("[data-tip]").filter({ visible: true }).evaluateAll((els) => els.filter((e) => !e.textContent.trim()).map((e) => { const b = e.getBoundingClientRect(); return [Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2)]; }));
                if (+v > icons.length) { console.log(`there are ${icons.length} icon-only controls on screen, no icon ${v}`); continue; }
                at = icons[+v - 1];
                console.log(`icon ${v} of ${icons.length}, at ${at.join(",")}`);
            }
            await page.mouse.move(at[0], at[1]);
            await page.waitForTimeout(800);
            console.log(`tooltip: ${JSON.stringify(await tooltip(page))}`);
        } else if (a === "--key") {
            await page.keyboard.press(v);
            await page.waitForTimeout(400);
        } else if (a === "--type") {
            // into what has focus, as a person types: each character a key press, so input handlers run.
            // Nothing that takes text has focus: typed nothing (the keys would fire shortcuts), exit 1
            const into = await page.evaluate(() => {
                const e = document.activeElement;
                if (e && (e.tagName === "TEXTAREA" || e.isContentEditable || (e.tagName === "INPUT" && !/^(checkbox|radio|button|submit|reset|range|color|file|image)$/.test(e.type)))) return null;
                return !e || e === document.body ? "the page" : `${e.getAttribute("role") || e.tagName.toLowerCase()} "${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 40)}"`;
            });
            if (into) { console.log(`nothing that takes text has focus (focus is on ${into}); typed nothing, not "${v}"`); code = 1; continue; }
            await page.keyboard.type(v, { delay: 20 });
            await page.waitForTimeout(400);
        }
        await look();
    }
    for (const e of errors) { console.log(e); code = 1; }
    return code;
}

let code = 0;
try {
    const rest = args.filter((a) => !/^--(list|check|prove|shoot|task|fresh|try|dark|matrix|counts)$/.test(a));
    if (mode === "--list") {
        const { page } = await open("map");
        const rows = await page.evaluate(() => AB.order.concat(Object.keys(AB.sections).filter((id) => !AB.order.includes(id))).flatMap((id) => {
            const s = AB.sections[id];
            const f = (st) => (typeof s.frame === "function" ? s.frame(st) : s.frame) || {};
            return s.states.map((st) => `app-b/#/${id}/${st.id}\t${typeof s.render === "function" ? "built" : "STUB"}\t${s.region}\t${f(st.id).dataset || "lesmis (or its left panel's)"}\t${s.title}: ${st.label}`);
        }));
        // Every dataset a frame can name (frame.dataset), whether or not a route uses it yet
        const sets = await page.evaluate(() => Object.entries(AB.fx.datasets).map(([k, d]) => `dataset ${k}\t${[d.nodes && d.nodes + " nodes", d.edges && d.edges + " edges", d.records && d.records + " records", d.tables && d.tables.length + " tables"].filter(Boolean).join(", ")}\t${d.title}`));
        await page.close();
        await rotate();
        console.log(rows.join("\n"));
        console.log(`${rows.length} routes`);
        console.log(sets.join("\n"));
    } else if (mode === "--check") {
        if (!rest.length) { console.log("checked nothing: exit 1"); code = 1; }
        let bad = 0;
        // six routes at a time; results print in the order given
        const results = await batched(rest, (r) => check(r), 6);
        for (const c of results) {
            for (const p of c.problems) console.log(`app-b/#/${c.route}: ${p}`);
            if (c.problems.length) bad++;
            else console.log(`ok   app-b/#/${c.route} (${c.dataset})`);
        }
        console.log(`${bad} of ${rest.length} routes failed`);
        if (bad) code = 1;
    } else if (mode === "--prove") {
        const cases = [
            ["a good route passes", "graph-place", true],
            ["an unknown section fails", "no-such-section/x", false],
            ["an unknown state fails", "graph-place/no-such-state", false],
        ];
        // A stub: every real section is built, so the run plants one (a section file with no render)
        cases.push(["a stub fails", "prove-stub/only", false, "prove-stub"]);
        for (const [name, r, pass, plant] of cases) {
            const c = await check(r, false, plant);
            const ok = pass ? !c.problems.length : c.problems.length > 0;
            console.log(`${ok ? "ok  " : "FAIL"} ${name}${c.problems.length ? `: ${c.problems[0]}` : ok ? "" : ": passed"}`);
            if (!ok) code = 1;
        }
        // --try: the steps reach the page, and a step that cannot be done fails the run
        const tries = [
            ["--type types into a focused box", "table-dock/transfers-nodes", ["--click", "ACC-633005", "--key", "Control+f", "--type", "zzq", "--expect", "zzq"], 0],
            ["--type with nothing that takes text focused fails", "table-dock/transfers-nodes", ["--type", "abc"], 1],
            ["a ctrl-click keeps two rows selected", "table-dock/transfers-nodes", ["--click", "ACC-633005", "--ctrl-click", "ACC-325714", "--expect", "selected=2"], 0],
            ["a shift-click adds a second row", "table-dock/transfers-nodes", ["--click", "ACC-633005", "--shift-click", "ACC-325714", "--expect", "selected=2"], 0],
            ["a plain click keeps one row selected", "table-dock/transfers-nodes", ["--click", "ACC-633005", "--click", "ACC-325714", "--expect", "selected=1"], 0],
        ];
        for (const [name, r, list, want] of tries) {
            const { page, errors } = await open(r);
            const got = await run(page, list, errors);
            await page.close();
            console.log(`${got === want ? "ok  " : "FAIL"} ${name}${got === want ? "" : `: exit ${got}, wanted ${want}`}`);
            if (got !== want) code = 1;
        }
        // a reviewer word on screen or in a tooltip is caught; one in a design note is not
        {
            const { page } = await open("graph-place");
            await page.evaluate(() => document.getElementById("ab-app").append(Object.assign(document.createElement("span"), { textContent: "Rename (not wired in the skeleton)" }), Object.assign(document.createElement("button"), { textContent: "x" }), AB.openQuestion("a stand-in")));
            await page.evaluate(() => document.querySelector("#ab-app > button:last-of-type").dataset.tip = "Sort (a stand-in)");
            const got = await leaks(page);
            await page.close();
            const ok = got.length === 2;
            console.log(`${ok ? "ok  " : "FAIL"} a reviewer word in text or a tooltip fails, one in a design note does not${ok ? "" : `: ${JSON.stringify(got)}`}`);
            if (!ok) code = 1;
        }
        // an unknown step is refused before a browser opens (this run holds the browser slot, so the child needs none)
        const { spawnSync } = await import("node:child_process");
        const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--try", "/dev/null", "graph-place", "--bogus", "x"], { encoding: "utf8" });
        const refused = child.status === 2 && /unknown step "--bogus"/.test(child.stderr);
        console.log(`${refused ? "ok  " : "FAIL"} an unknown step is refused with exit 2${refused ? "" : `: exit ${child.status} ${child.stderr.trim()}`}`);
        if (!refused) code = 1;
    } else if (mode === "--shoot") {
        await batched(rest, async (r) => {
            const file = join(proto, "shots/app-b", `${slug(r)}${dark ? "--dark" : ""}.png`);
            const e = await shoot(r, file);
            console.log(file);
            for (const x of e) console.error(`  ${r}: ${x}`);
            if (e.length) code = 1;
        });
    } else if (mode === "--task") {
        const [id, ...routes] = rest;
        if (!id || !routes.length) { console.error("--task needs an id and at least one route"); code = 2; }
        else {
            const dir = join(proto, "shots/tasks", id);
            const drawn = await batched([...routes.keys()], async (k) => {
                const r = routes[k];
                const file = join(dir, `${String(k + 1).padStart(2, "0")}.png`);
                const e = await shoot(r, file);
                console.log(file);
                for (const x of e) console.error(`  ${r}: ${x}`);
                if (e.length) code = 1;
                return e.dataset;
            });
            // One project from start to finish: a task whose routes draw two datasets is refused
            const sets = [...new Set(drawn)];
            if (sets.length > 1) {
                console.error(`the task's routes draw ${sets.length} projects (${sets.join(", ")}); a task keeps one from start to finish:`);
                routes.forEach((r, k) => console.error(`  ${shown(r)}: ${drawn[k]}`));
                console.error("no routes.json written");
                code = 1;
            } else await writeFile(join(dir, "routes.json"), JSON.stringify(routes.map(routeOf), null, 1) + "\n");
        }
    } else if (mode === "--matrix") {
        code = await matrix();
    } else if (mode === "--try") {
        // --try <out.png> <route> then steps; a step that finds nothing is reported and the run goes on.
        const out = rest[0];
        const route = rest[1];
        const start = route.startsWith("task:") ? JSON.parse(await readFile(join(proto, "shots/tasks", route.slice(5), "routes.json"), "utf8"))[0] : route;
        const list = args.slice(args.indexOf(route) + 1);
        const bad = refuse(list);
        if (bad) { console.error(bad); process.exit(2); }
        const { page, errors } = await open(start);
        code = await run(page, list, errors);
        await mkdir(dirname(resolve(out)), { recursive: true });
        await page.screenshot({ path: resolve(out) });
        await page.close();
        console.log(resolve(out));
    }
} finally {
    await rotate();
    await browser.close();
    server.close();
}
process.exitCode = code;
