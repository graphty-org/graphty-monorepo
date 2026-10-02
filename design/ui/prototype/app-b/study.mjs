#!/usr/bin/env node
// The skeleton as a study participant sees it: no review bar, no design notes, no section or state
// names. Run from design/ui/prototype/. A route is "<section>/<state>", "#/<section>/<state>" or
// "app-b/#/<section>/<state>"; with no state, the section's first.
//
//   node app-b/study.mjs --list                       every registered section/state: built or stub, region, dataset
//   node app-b/study.mjs --check <route> ...          exit 1 unless every route names a registered section and one
//                                                     of its states, renders with no stub, no render failure, no
//                                                     script error and no 404, and shows no review bar
//   node app-b/study.mjs --prove                      proves --check fails on an unknown section, an unknown state
//                                                     and a stub (a section with no render, planted for the run),
//                                                     and passes a good route
//   node app-b/study.mjs --counts                     exit 1 if a section file types a fixture count by hand (77 nodes,
//                                                     "of 254", count: 3000) instead of reading AB.fx through AB.count;
//                                                     if a section writes a part of a whole its own way ("Filtered: 60
//                                                     of 77", "3,000 to 812 nodes", "3,000 -> 812", two numbers
//                                                     around an arrow icon); or if any skeleton
//                                                     file holds a banned scope string ("within 1%", "near #",
//                                                     "not used yet", "Change..."); or if a section assigns
//                                                     AB.projectCounts (register counts with AB.countSource)
//   node app-b/study.mjs --shoot [--dark] <route> ... participant-view PNGs: shots/app-b/<section>--<state>[--dark].png
//   node app-b/study.mjs --task <id> <route> ...      a task's routes in order: shots/tasks/<id>/01.png, 02.png, ...
//                                                     and shots/tasks/<id>/routes.json (the routes, in order). Exit 1,
//                                                     and no routes.json, unless every route draws one project. The PNG
//                                                     names carry no route, so a participant shown 01.png learns nothing
//                                                     from its name; routes.json is for graders and the preflight
//   node app-b/study.mjs --fresh <png or task id> ... exit 1 unless each PNG (each task's routes.json and every PNG
//                                                     it lists) exists and is newer than every file under app-b/
//   node app-b/study.mjs --try <out.png> <route or task:<id>> [--click "<name>" | --rclick "<name>" | --hover "<name>" | --key <Key>
//                                                     | --expect "<text>" | --expect-not "<text>"] ...
//                                                     a participant's click-through: opens the route, does each step
//                                                     in order, saves what is on screen; prints only the PNG path.
//                                                     <name> is what the control says or its tooltip name; --hover
//                                                     shows the tooltip of an icon-only control. task:<id> starts at
//                                                     that task's first route without naming it. --rclick right-clicks;
//                                                     --expect exits 1 unless that text (or role=<role>, e.g. role=menu)
//                                                     is visible at that step, --expect-not unless it is gone: a
//                                                     click-through regression, which --check (direct loads) cannot see
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
    console.error("usage: node app-b/study.mjs --list | --matrix | --counts | --check <route>... | --prove | --shoot [--dark] <route>... | --task <id> <route>... | --fresh <png|task id>... | --try <out.png> <route> [--click name | --hover name | --key Key]...");
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
    for (const b of bad) console.log(b);
    console.log(`${bad.length} count${bad.length === 1 ? "" : "s"} not written by AB.count`);
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
        try { localStorage.setItem("ab.designNotes", "participant"); localStorage.setItem("ab.theme", theme); } catch (e) { /* fine */ }
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
        const { page } = await open(start);
        for (let i = args.indexOf(route) + 1; i < args.length; i++) {
            const a = args[i];
            if (a === "--expect" || a === "--expect-not") {
                // a click-through regression: exit 1 unless something visible has that text (role=<role> for a
                // role: role=menu is an open menu), or for --expect-not unless nothing does
                const what = args[++i];
                const loc = what.startsWith("role=") ? page.getByRole(what.slice(5)) : page.getByText(what, { exact: false });
                const seen = (await loc.filter({ visible: true }).count()) > 0;
                if (seen !== (a === "--expect")) { console.log(`${a === "--expect" ? "expected on screen, not there" : "expected gone, still on screen"}: "${what}"`); code = 1; }
                continue;
            }
            if (a === "--click" || a === "--hover" || a === "--rclick") {
                const verb = a === "--rclick" ? "click" : a.slice(2);
                const how = a === "--rclick" ? { button: "right", timeout: 3000 } : { timeout: 3000 };
                const name = args[++i];
                // the first visible control by that name: exact names before partial ones, controls before text
                let hit = false;
                for (const exact of [true, false]) {
                    for (const loc of [...["button", "link", "menuitem", "menuitemcheckbox", "tab", "treeitem", "switch", "option"].map((role) => page.getByRole(role, { name, exact })), page.getByLabel(name, { exact }), page.getByText(name, { exact })]) {
                        const el = loc.filter({ visible: true }).first();
                        if (!hit && (await el.count())) hit = await el[verb](how).then(() => true).catch(() => false);
                    }
                }
                if (!hit) console.log(`nothing on screen is called "${name}"`);
                await page.waitForTimeout(verb === "hover" ? 800 : 400); // a tooltip shows 500 ms after the pointer arrives
            } else if (a === "--key") {
                await page.keyboard.press(args[++i]);
                await page.waitForTimeout(400);
            }
        }
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
