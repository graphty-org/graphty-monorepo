#!/usr/bin/env node
// Renders pages of the prototype to PNGs in prototype/shots/ with Playwright's Chromium.
//
//   node kit/shoot.mjs index.html screens/start.html        (paths relative to prototype/)
//   node kit/shoot.mjs --dark screens/start.html             (dark theme: data-theme="dark")
//   node kit/shoot.mjs --width 1366 --height 768 screens/start.html
//   node kit/shoot.mjs --full storyboards/first-look.html    (the whole page, not one viewport)
//   node kit/shoot.mjs --out my-name.png screens/start.html  (one page, a chosen file name)
//   node kit/shoot.mjs "screens/frame-at-rest.html?dataset=ppi"   (a query string names the shot: ...-dataset-ppi.png)
//   node kit/shoot.mjs --study screens/find.html             (as a participant sees it: design notes hidden, ...--study.png)
//   node kit/shoot.mjs --touch screens/undo.html             (an iPad: 768 x 1024, touch, the participant view with its corner way out; ...--study--768-touch.png)
//   node kit/shoot.mjs --all --touch --study                 (every page check.mjs --all reads, in one run)
//   node kit/shoot.mjs --stale [--dry]                       (re-render every PNG older than its page or the kit; move the
//                                                             ones no page can re-render out of the top of shots/, below)
//   node kit/shoot.mjs --tasks [task-id ...]                 (every study task's screens, in order, as the participant sees
//                                                             them: study view, ?task=<id>; shots/tasks/<id>/NN-<page>.png)
//
// Every shot is recorded in shots/manifest.json (page, theme, size, study), so --stale can render it
// again; a PNG with no record is traced from its name, or from the page link around it in the gallery,
// a storyboard or a flow. A PNG only a study session cites is never re-rendered: it is what a
// participant saw, so --stale moves it to shots/record/ and points the sessions that cite it there.
// A PNG at the top of shots/ that no page state can render and nothing cites goes to shots/retired/.
// So every PNG left at the top of shots/ is re-rendered by --stale, and none stays older than its page.
//
// Pages are served from a throwaway loopback HTTP server so kit/icons.svg sprite references
// work exactly as they do at http://dev.ato.ms:9825/. Default viewport 1440 x 900 at scale 1.
// Output: shots/<page path with / as __, no .html>[--dark][--<width>].png, printed one per line.
process.env.FC_FONTATIONS = "1"; // headless Chromium crashes on startup on this host without it

import { createServer } from "node:http";
import { readFile, mkdir, readdir, rename, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// Every run holds one of the shared browser slots (kit/with-browser.sh), so the design round as a
// whole never runs more than four browsers at once.
if (!process.env.BROWSER_SLOT) {
    const { spawnSync } = await import("node:child_process");
    const gate = new URL("./with-browser.sh", import.meta.url).pathname;
    const r = spawnSync(gate, [process.execPath, ...process.argv.slice(1)], { stdio: "inherit" });
    process.exit(r.status ?? 1);
}


const here = dirname(fileURLToPath(import.meta.url));
const proto = resolve(here, "..");
const { chromium } = await import(resolve(proto, "../../../node_modules/playwright/index.mjs"));

const args = process.argv.slice(2);
const opt = { dark: false, width: 1440, height: 900, full: false, out: null, study: false, stale: false, dry: false, tasks: false, touch: false, all: false };
const pages = [];
for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dark") opt.dark = true;
    else if (a === "--full") opt.full = true;
    else if (a === "--width") opt.width = Number(args[++i]);
    else if (a === "--height") opt.height = Number(args[++i]);
    else if (a === "--out") opt.out = args[++i];
    else if (a === "--study") opt.study = true;
    else if (a === "--stale") opt.stale = true;
    else if (a === "--dry") opt.dry = true;
    else if (a === "--tasks") opt.tasks = true;
    // --touch is the iPad check of the participant view (with its way out in the corner), so it implies --study
    else if (a === "--touch") Object.assign(opt, { touch: true, study: true, width: 768, height: 1024 });
    else if (a === "--all") opt.all = true;
    else pages.push(a.replace(/^\.?\/?/, ""));
}
const shotsDir = join(proto, "shots");
const manifestPath = join(shotsDir, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8").catch(() => "{}"));
const nameOf = (p, o) => o.out ?? `${p.replace(/\.html(?=$|[?#])/, "").replace(/[/\\]/g, "__").replace(/[?#&=]+/g, "-")}${o.dark ? "--dark" : ""}${o.study ? "--study" : ""}${o.width !== 1440 ? `--${o.width}` : ""}${o.touch ? "-touch" : ""}.png`;
// --all: the pages kit/check.mjs --all reads.
if (opt.all) {
    for (const dir of ["storyboards", "flows", "screens", "study"]) for (const f of (await readdir(join(proto, dir))).sort()) if (f.endsWith(".html") && !f.endsWith(".template.html")) pages.push(`${dir}/${f}`);
    pages.push("index.html", "kit/template.html", "kit/index.html");
}
// One job per page: its options, and the file it writes.
const jobs = opt.tasks ? [] : pages.map((p) => ({ page: p, o: { ...opt } }));
if (opt.stale) jobs.push(...(await staleJobs()));
if (opt.tasks) {
    // The task ids given, else every task: its pages in order, each with ?task=<id>, in the study view.
    const { tasks } = JSON.parse(await readFile(join(here, "fixtures.json"), "utf8"));
    const ids = pages.splice(0).filter((p) => tasks[p]);
    for (const id of ids.length ? ids : Object.keys(tasks)) {
        tasks[id].pages.forEach((pg, k) => {
            const [path, hash = ""] = pg.split("#");
            const page = `${path}${path.includes("?") ? "&" : "?"}task=${id}${hash ? `#${hash}` : ""}`;
            const slug = `${path.replace(/^screens\//, "").replace(/\.html$/, "")}${hash ? `-${hash}` : ""}`;
            jobs.push({ page, o: { ...opt, study: true }, name: `tasks/${id}/${String(k + 1).padStart(2, "0")}-${slug}.png` });
        });
    }
}
if (opt.stale && opt.dry) {
    for (const j of jobs) console.log(`${j.name}  <-  ${j.page}${j.o.dark ? " --dark" : ""}${j.o.study ? " --study" : ""}${j.o.full ? " --full" : ""} ${j.o.width}x${j.o.height}${j.why ? `  (${j.why})` : ""}`);
    process.exit(0);
}
if (!jobs.length && opt.stale) { console.error("no stale shots"); process.exit(0); }
if (!jobs.length) {
    console.error("usage: node kit/shoot.mjs [--dark] [--study] [--width N] [--height N] [--full] [--out name.png] page.html ... | --stale [--dry]");
    process.exit(2);
}

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".woff2": "font/woff2", ".md": "text/plain" };
const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, "");
    const file = join(proto, path || "index.html");
    if (!file.startsWith(proto)) return res.writeHead(403).end();
    try {
        const body = await readFile(file.endsWith("/") ? join(file, "index.html") : file);
        res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
    } catch {
        res.writeHead(404).end("not found");
    }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
const failures = [];
try {
    await mkdir(shotsDir, { recursive: true });
    const contexts = new Map();
    const contextFor = async (o) => {
        const k = `${o.width}x${o.height}${o.dark ? "d" : ""}${o.study ? "s" : ""}${o.touch ? "t" : ""}`;
        if (!contexts.has(k)) {
            // --touch: an iPad in portrait; a page with no viewport tag lays out at 980 and is shown zoomed out, as Safari does.
            const c = await browser.newContext({ viewport: { width: o.width, height: o.height }, deviceScaleFactor: 1, colorScheme: o.dark ? "dark" : "light", ...(o.touch ? { hasTouch: true, isMobile: true } : {}) });
            // A touch shot opens the participant view by its address, so the facilitator's way out shows
            // in the corner as it does on the owner's iPad; other study shots hide it.
            if (o.study && !o.touch) await c.addInitScript(() => (window.__kitStudy = true));
            contexts.set(k, c);
        }
        return contexts.get(k);
    };
    for (const { page: p, o, name: fixed } of jobs) {
        const page = await (await contextFor(o)).newPage();
        const problems = [];
        page.on("pageerror", (e) => problems.push(`script error: ${e.message}`));
        page.on("response", (r) => r.status() >= 400 && problems.push(`${r.status()} ${r.url().replace(base, "")}`));
        const url = o.study && o.touch ? p.replace(/^([^#]*?)(\?[^#]*)?(#.*)?$/, (m, path, q = "", h = "") => `${path}${q ? `${q}&` : "?"}study${h}`) : p;
        // a page that never goes quiet (a frame that keeps loading) is shot as it stands, and named
        await page.goto(base + url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => problems.push("the page did not settle in 30 s; shot as it stood"));
        await page.evaluate((dark) => document.documentElement.setAttribute("data-theme", dark ? "dark" : "light"), o.dark);
        await page.evaluate(() => document.fonts.ready);
        if (o.study) await page.waitForFunction(() => window.kitFx !== undefined, null, { timeout: 5000 }).catch(() => {});
        const name = fixed ?? nameOf(p, o);
        const out = join(shotsDir, name);
        await mkdir(dirname(out), { recursive: true });
        await page.screenshot({ path: out, fullPage: o.full });
        manifest[name] = { page: p, dark: o.dark, study: o.study, width: o.width, height: o.height, full: o.full, ...(o.touch ? { touch: true } : {}) };
        console.log(out);
        for (const pr of problems) console.error(`  ${p}: ${pr}`);
        if (problems.length) failures.push(p);
        await page.close();
    }
} finally {
    await browser.close();
    server.close();
    const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
    await writeFile(manifestPath, JSON.stringify(sorted, null, 1) + "\n");
}
if (failures.length) process.exitCode = 1;

// --stale: every PNG in shots/ older than the page it shows or the kit it is drawn with.
async function staleJobs() {
    const moves = [];
    const kitTime = Math.max(...(await Promise.all(["kit.css", "cm.css", "kit.js", "fixtures.json", "alerts.json"].map((f) => stat(join(here, f)).then((x) => x.mtimeMs)))));
    // Where a PNG without a record came from: the page link wrapped around it on an owner-facing page.
    const linked = new Map();
    for (const dir of [".", "storyboards", "flows", "screens", "milestones"]) {
        for (const f of await readdir(join(proto, dir))) {
            if (!/\.(html|md)$/.test(f)) continue;
            const text = await readFile(join(proto, dir, f), "utf8");
            for (const m of text.matchAll(/<a [^>]*href="([^"]+\.html(?:[?#][^"]*)?)"[^>]*>\s*<img [^>]*src="(?:\.\.\/)?shots\/([^"]+\.png)"/g)) {
                const page = normalize(join(dir, m[1])).replace(/\\/g, "/");
                if (!linked.has(m[2])) linked.set(m[2], page);
            }
        }
    }
    const pngSize = async (f) => {
        const b = await readFile(f);
        return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    };
    const fromName = (name) => {
        // <page path, / as __>[-query][--dark][--study][--width].png
        let rest = name.replace(/\.png$/, "");
        const o = { dark: false, study: false, width: 1440, height: 900, full: false };
        if (rest.endsWith("-touch")) Object.assign(o, { touch: true, height: 1024 }), (rest = rest.slice(0, -6));
        const w = rest.match(/--(\d+)$/);
        if (w) (o.width = +w[1]), (rest = rest.slice(0, w.index));
        if (rest.endsWith("--study")) (o.study = true), (rest = rest.slice(0, -7));
        if (rest.endsWith("--dark")) (o.dark = true), (rest = rest.slice(0, -6));
        const path = rest.replace(/__/g, "/");
        for (let i = path.length; i > 0; i--) {
            if (path[i] !== undefined && path[i] !== "-") continue;
            const file = `${path.slice(0, i)}.html`;
            if (!existsSync(join(proto, file))) continue;
            const q = path.slice(i + 1);
            if (!q) return { page: file, o };
            if (!/^(dataset|task)-/.test(q)) return null; // a name chosen with --out: traced from its link instead
            const k = q.indexOf("-");
            return { page: `${file}?${k < 0 ? q : `${q.slice(0, k)}=${q.slice(k + 1)}`}`, o };
        }
        return null;
    };
    // PNGs an owner-facing page shows; one that cannot be traced to its page is listed, not guessed.
    const referenced = new Set();
    for (const dir of [".", "storyboards", "flows", "screens", "milestones", "study"]) {
        for (const f of await readdir(join(proto, dir))) {
            if (!/\.(html|md)$/.test(f) || (dir === "study" && f.endsWith(".md"))) continue;
            for (const m of (await readFile(join(proto, dir, f), "utf8")).matchAll(/shots\/([A-Za-z0-9_./#-]+\.png)/g)) referenced.add(m[1]);
        }
    }
    // A PNG a study session cites and no owner-facing page shows is the record of what a participant
    // saw: never rendered again.
    const record = new Set();
    for (const round of (await readdir(join(proto, "study"), { withFileTypes: true })).filter((d) => d.isDirectory() && d.name.startsWith("round-"))) {
        const dir = join(proto, "study", round.name, "sessions");
        for (const f of await readdir(dir).catch(() => [])) {
            for (const m of (await readFile(join(dir, f), "utf8")).matchAll(/shots\/([A-Za-z0-9_./#-]+\.png)/g)) if (!referenced.has(m[1])) record.add(m[1]);
        }
    }
    const untraced = [];
    const out = [];
    // Every text file of the prototype outside shots/ and tmp/, read once: what cites a PNG.
    let texts = null;
    const textFiles = async (dir = "") => {
        const found = [];
        for (const e of await readdir(join(proto, dir), { withFileTypes: true })) {
            const rel = dir ? `${dir}/${e.name}` : e.name;
            if (e.isDirectory()) { if (!["shots", "tmp", "node_modules"].includes(rel)) found.push(...(await textFiles(rel))); }
            else if (/\.(html|md|mjs|js|json|py)$/.test(e.name) && rel !== "kit/fixtures.json") found.push(rel);
        }
        return found;
    };
    const citedAnywhere = async (rel) => {
        texts ??= await Promise.all((await textFiles()).map(async (f) => ({ f, t: await readFile(join(proto, f), "utf8") })));
        return texts.some(({ t }) => t.includes(`shots/${rel}`) || t.includes(`"${rel}"`));
    };
    const walk = async (dir) => {
        for (const e of await readdir(join(shotsDir, dir), { withFileTypes: true })) {
            const rel = dir ? `${dir}/${e.name}` : e.name;
            // shots/tmp/ holds scratch renders (a task's own crops and trials), not gallery shots
            // shots/record/ and shots/retired/ hold what --stale moved out (below): never rendered again
            if (e.isDirectory()) { if (!["tmp", "record", "retired"].includes(rel)) await walk(rel); }
            else if (e.name.endsWith(".png")) {
                if (record.has(rel)) {
                    if (!dir) moves.push({ from: rel, to: `record/${rel}` });
                    continue;
                }
                const rec = manifest[rel];
                let job = rec ? { page: rec.page, o: { ...rec } } : fromName(rel);
                let why = rec ? "recorded" : job ? "from its name" : null;
                // A dark twin shows the same state as its light file.
                const twin = rel.replace(/--dark(?=[-.])|-dark(?=\.png$)/, "");
                if (!job && twin !== rel && linked.has(twin)) linked.set(rel, linked.get(twin));
                if (!job && linked.has(rel)) {
                    const size = await pngSize(join(shotsDir, rel));
                    job = { page: linked.get(rel), o: { dark: /--?dark/.test(rel), study: false, width: size.width, height: Math.min(size.height, 900), full: size.height > 900 } };
                    why = "from the page that links it";
                }
                if (!job) {
                    if (referenced.has(rel)) untraced.push(rel);
                    else if (!dir && !(await citedAnywhere(rel))) moves.push({ from: rel, to: `retired/${rel}` });
                    continue;
                }
                if (!rec && why === "from its name") {
                    const size = await pngSize(join(shotsDir, rel));
                    job.o.width = size.width;
                    job.o.full = size.height > (job.o.height = 900) && size.height !== 900;
                    if (size.height < 900) job.o.height = size.height;
                }
                const file = join(proto, job.page.replace(/[?#].*$/, ""));
                if (!existsSync(file)) continue;
                const t = (await stat(join(shotsDir, rel))).mtimeMs;
                if (t >= Math.max(kitTime, (await stat(file)).mtimeMs)) continue;
                out.push({ ...job, name: rel, why });
            }
        }
    };
    await walk("");
    if (moves.length) {
        for (const m of moves) console.error(`${opt.dry ? "would move" : "moved"} shots/${m.from} -> shots/${m.to}`);
        if (!opt.dry) {
            await mkdir(join(shotsDir, "record"), { recursive: true });
            await mkdir(join(shotsDir, "retired"), { recursive: true });
            for (const m of moves) await rename(join(shotsDir, m.from), join(shotsDir, m.to));
            // the sessions (and any round file) that cite a record now cite it where it lives
            const recs = moves.filter((m) => m.to.startsWith("record/"));
            texts ??= await Promise.all((await textFiles()).map(async (f) => ({ f, t: await readFile(join(proto, f), "utf8") })));
            for (const { f, t } of texts) {
                let n = t;
                for (const m of recs) n = n.split(`shots/${m.from}`).join(`shots/${m.to}`);
                if (n !== t) await writeFile(join(proto, f), n);
            }
        }
    }
    if (untraced.length) console.error(`not re-rendered, shown on a page but traced to no page state (render them with --out and they are recorded): ${untraced.join(", ")}`);
    return out;
}
