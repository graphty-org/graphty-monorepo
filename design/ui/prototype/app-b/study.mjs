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
//                                                     and a stub, and passes a good route
//   node app-b/study.mjs --shoot [--dark] <route> ... participant-view PNGs: shots/app-b/<section>--<state>[--dark].png
//   node app-b/study.mjs --task <id> <route> ...      a task's routes in order: shots/tasks/<id>/01.png, 02.png, ...
//                                                     and shots/tasks/<id>/routes.json (the routes, in order). The PNG
//                                                     names carry no route, so a participant shown 01.png learns nothing
//                                                     from its name; routes.json is for graders and the preflight
//   node app-b/study.mjs --fresh <png or task id> ... exit 1 unless each PNG (each task's routes.json and every PNG
//                                                     it lists) exists and is newer than every file under app-b/
//   node app-b/study.mjs --try <out.png> <route or task:<id>> [--click "<name>" | --hover "<name>" | --key <Key>] ...
//                                                     a participant's click-through: opens the route, does each step
//                                                     in order, saves what is on screen; prints only the PNG path.
//                                                     <name> is what the control says or its tooltip name; --hover
//                                                     shows the tooltip of an icon-only control. task:<id> starts at
//                                                     that task's first route without naming it
//
// Pages are served from a throwaway loopback server (as kit/shoot.mjs does), so dev.ato.ms need not be up.
process.env.FC_FONTATIONS = "1"; // headless Chromium crashes on startup on this host without it

import { createServer } from "node:http";
import { readFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const proto = resolve(here, "..");
const { chromium } = await import(resolve(proto, "../../../node_modules/playwright/index.mjs"));

const args = process.argv.slice(2);
const mode = args.find((a) => /^--(list|check|prove|shoot|task|fresh|try)$/.test(a));
if (!mode) {
    console.error("usage: node app-b/study.mjs --list | --check <route>... | --prove | --shoot [--dark] <route>... | --task <id> <route>... | --fresh <png|task id>... | --try <out.png> <route> [--click name | --hover name | --key Key]...");
    process.exit(2);
}
const dark = args.includes("--dark");
const routeOf = (r) => String(r).trim().replace(/^https?:\/\/[^#]*#/, "").replace(/^(\.?\/)?(app-b\/?)?(index\.html)?#?\/?/, "").replace(/\/+$/, "");
const slug = (r) => routeOf(r).replace(/\//g, "--") || "graph-place";

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

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
    const file = join(proto, normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, ""));
    if (!file.startsWith(proto)) return res.writeHead(403).end();
    try { res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(await readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}/app-b/index.html`;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: dark ? "dark" : "light" });
// The participant view: design notes hidden (the shell's own switch) and the review bar gone.
await context.addInitScript((theme) => {
    try { localStorage.setItem("ab.designNotes", "hidden"); localStorage.setItem("ab.theme", theme); } catch (e) { /* fine */ }
    addEventListener("DOMContentLoaded", () => document.head.append(Object.assign(document.createElement("style"), { textContent: "#ab-review{display:none!important}:root{--ab-review-h:0px!important}" })));
}, dark ? "dark" : "light");

// Opens a route; returns what a checker needs. Never throws.
async function open(route) {
    const page = await context.newPage();
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

async function check(route) {
    const { page, errors, r } = await open(route);
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
    out.push(...errors);
    return { route: r, dataset: info.dataset, problems: out };
}

async function shoot(route, file) {
    const { page, errors } = await open(route);
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await mkdir(dirname(file), { recursive: true });
    await page.screenshot({ path: file });
    await page.close();
    return errors;
}

let code = 0;
try {
    const rest = args.filter((a) => !/^--(list|check|prove|shoot|task|fresh|try|dark)$/.test(a));
    if (mode === "--list") {
        const { page } = await open("map");
        const rows = await page.evaluate(() => AB.order.concat(Object.keys(AB.sections).filter((id) => !AB.order.includes(id))).flatMap((id) => {
            const s = AB.sections[id];
            const f = (st) => (typeof s.frame === "function" ? s.frame(st) : s.frame) || {};
            return s.states.map((st) => `app-b/#/${id}/${st.id}\t${typeof s.render === "function" ? "built" : "STUB"}\t${s.region}\t${f(st.id).dataset || "lesmis (or its left panel's)"}\t${s.title}: ${st.label}`);
        }));
        await page.close();
        console.log(rows.join("\n"));
        console.log(`${rows.length} routes`);
    } else if (mode === "--check") {
        if (!rest.length) { console.log("checked nothing: exit 1"); code = 1; }
        let bad = 0;
        // six routes at a time; results print in the order given
        const results = new Array(rest.length);
        let next = 0;
        await Promise.all(Array.from({ length: Math.min(6, rest.length) }, async () => { while (next < rest.length) { const i = next++; results[i] = await check(rest[i]); } }));
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
        // A stub: a manifest id with no section file registers as a render-less overlay. Plant one by
        // asking for a section the registry knows only if it has no render; if every section is built, say so.
        const { page } = await open("map");
        const stub = await page.evaluate(() => Object.values(AB.sections).find((s) => typeof s.render !== "function")?.id);
        await page.close();
        if (stub) cases.push(["a stub fails", stub, false]);
        else console.log("note: every section is built, so the stub case has nothing to try");
        for (const [name, r, pass] of cases) {
            const c = await check(r);
            const ok = pass ? !c.problems.length : c.problems.length > 0;
            console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `: ${c.problems.join("; ") || "passed"}`}`);
            if (!ok) code = 1;
        }
    } else if (mode === "--shoot") {
        for (const r of rest) {
            const file = join(proto, "shots/app-b", `${slug(r)}${dark ? "--dark" : ""}.png`);
            const e = await shoot(r, file);
            console.log(file);
            for (const x of e) console.error(`  ${r}: ${x}`);
            if (e.length) code = 1;
        }
    } else if (mode === "--task") {
        const [id, ...routes] = rest;
        if (!id || !routes.length) { console.error("--task needs an id and at least one route"); code = 2; }
        else {
            const dir = join(proto, "shots/tasks", id);
            for (const [k, r] of routes.entries()) {
                const file = join(dir, `${String(k + 1).padStart(2, "0")}.png`);
                const e = await shoot(r, file);
                console.log(file);
                for (const x of e) console.error(`  ${r}: ${x}`);
                if (e.length) code = 1;
            }
            await writeFile(join(dir, "routes.json"), JSON.stringify(routes.map(routeOf), null, 1) + "\n");
        }
    } else if (mode === "--try") {
        // --try <out.png> <route> then steps; a step that finds nothing is reported and the run goes on.
        const out = rest[0];
        const route = rest[1];
        const start = route.startsWith("task:") ? JSON.parse(await readFile(join(proto, "shots/tasks", route.slice(5), "routes.json"), "utf8"))[0] : route;
        const { page } = await open(start);
        for (let i = args.indexOf(route) + 1; i < args.length; i++) {
            const a = args[i];
            if (a === "--click" || a === "--hover") {
                const verb = a.slice(2);
                const name = args[++i];
                // the first visible control by that name: exact names before partial ones, controls before text
                let hit = false;
                for (const exact of [true, false]) {
                    for (const loc of [...["button", "link", "menuitem", "menuitemcheckbox", "tab", "treeitem", "switch", "option"].map((role) => page.getByRole(role, { name, exact })), page.getByLabel(name, { exact }), page.getByText(name, { exact })]) {
                        const el = loc.filter({ visible: true }).first();
                        if (!hit && (await el.count())) hit = await el[verb]({ timeout: 3000 }).then(() => true).catch(() => false);
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
    await browser.close();
    server.close();
}
process.exitCode = code;
