#!/usr/bin/env node
// Measures two of the studio's bars on a production build of the graphty app (criteria.md):
//   bar 8, its axe part: axe-core on each core screen, tags wcag2a, wcag2aa, wcag21aa, wcag22aa;
//          a serious or critical violation fails the bar, the rest are reported
//   bar 9: the app's own words on screen at rest (Les Miserables loaded, nothing selected,
//          1440 x 900), data values, node names, numbers and the drawing left out
//
//   node bars.mjs <out dir> [--dist <build dir>]
//
// Writes <out dir>/bars.json (every violation with its nodes, every counted word) and prints a
// summary; exit 1 when either bar fails. Runs its own browser inside a shared browser slot. Pass a
// copy of graphty/dist with --dist to measure a build that a rebuild must not replace mid-run.
process.env.FC_FONTATIONS = "1"; // headless Chromium crashes on startup on this host without it

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../..");
const args = process.argv.slice(2);
if (!process.env.BROWSER_SLOT) {
    // run again inside the shared browser gate
    const r = spawnSync(join(here, "with-browser.sh"), [process.execPath, fileURLToPath(import.meta.url), ...args], {
        stdio: "inherit",
    });
    process.exit(r.status ?? 1);
}
const out = args[0] && !args[0].startsWith("--") ? resolve(args[0]) : null;
const di = args.indexOf("--dist");
const dist = resolve(di > 0 ? args[di + 1] : join(repo, "graphty/dist"));
if (!out || !existsSync(join(dist, "index.html"))) {
    console.error("usage: bars.mjs <out dir> [--dist <build dir>]  (the build dir holds index.html)");
    process.exit(2);
}
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const AXE = join(repo, "node_modules/axe-core/axe.min.js");
const FILES = join(here, "files");
const TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".wasm": "application/wasm",
    ".woff2": "font/woff2",
    ".gml": "text/plain",
};

const { chromium } = await import(join(repo, "node_modules/playwright/index.mjs"));
const http = createServer(async (req, res) => {
    const f = join(dist, normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, ""));
    if (!f.startsWith(dist)) return res.writeHead(403).end();
    try {
        const body = await readFile(f);
        res.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream" }).end(body);
    } catch {
        if (extname(f)) return res.writeHead(404).end();
        res.writeHead(200, { "content-type": "text/html" }).end(await readFile(join(dist, "index.html")));
    }
});
await new Promise((ok) => http.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${http.address().port}`;
const browser = await chromium.launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fresh = async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(origin + "/?next", { waitUntil: "networkidle" });
    await page.waitForSelector("main, [role=main]");
    await sleep(800);
    return page;
};

const screens = {};
const log = [];
async function axe(page, name) {
    await page.addScriptTag({ path: AXE }).catch(() => {});
    const r = await page.evaluate(
        (tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] }),
        TAGS,
    );
    screens[name] = r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => ({ target: n.target.join(" "), html: n.html.slice(0, 200), why: n.failureSummary })),
    }));
}
async function step(page, name, fn) {
    try {
        await fn();
        await sleep(900);
        await axe(page, name);
        log.push(`ok   ${name}`);
    } catch (e) {
        log.push(`MISS ${name}: ${e.message.split("\n")[0]}`);
    }
}
// bar 9: visible light-DOM text outside graphty-element, one entry per word, data words left out
const atRest = (page) =>
    page.evaluate(() => {
        const el = document.querySelector("graphty-element");
        const data = new Set();
        const add = (v) => {
            if (typeof v === "string" || typeof v === "number")
                for (const w of String(v).toLowerCase().split(/\s+/)) if (w) data.add(w);
        };
        for (const n of el?.getNodes?.() ?? []) {
            add(n.id);
            for (const v of Object.values(n.data ?? {})) add(v);
        }
        const words = [];
        const left = [];
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let t = walk.nextNode(); t; t = walk.nextNode()) {
            const p = t.parentElement;
            if (!p || p.closest("script, style, graphty-element, [role=tooltip]") || !p.checkVisibility()) continue;
            // text a screen reader hears but nobody sees (a visually hidden status line) is not on screen
            let clipped = false;
            for (let a = p; a && !clipped; a = a.parentElement) {
                const ar = a.getBoundingClientRect();
                clipped = getComputedStyle(a).overflow !== "visible" && (ar.width <= 1 || ar.height <= 1);
            }
            if (clipped) continue;
            const r = document.createRange();
            r.selectNodeContents(t);
            const b = r.getBoundingClientRect();
            if (
                b.width < 1 ||
                b.height < 1 ||
                b.right < 0 ||
                b.bottom < 0 ||
                b.left > innerWidth ||
                b.top > innerHeight
            )
                continue;
            for (const raw of t.textContent.split(/\s+/)) {
                const w = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
                if (!w) continue;
                if (/\d/.test(w) || data.has(w.toLowerCase())) left.push(w);
                else words.push(w);
            }
        }
        return { words, left };
    });

// 1. start screen with the usage card, then without it
let p = await fresh();
await axe(p, "start screen with the usage card");
const btn = (n) => p.getByRole("button", { name: n }).first();
await step(p, "start screen", () => btn("No thanks").click());
// 2. Les Miserables: the core path's screens
await step(p, "loaded Graph place", async () => {
    await btn(/Open the Les Miserables/).click();
    await p.waitForFunction(() => document.querySelector("graphty-element")?.getNodes?.().length > 0, null, {
        timeout: 30000,
    });
    await p.evaluate(() => document.querySelector("graphty-element").waitForStableFrame?.({ timeoutMs: 15000 }));
});
const rest = await atRest(p);
await step(p, "Analyze open", async () => {
    await p.evaluate(() => document.activeElement?.blur());
    await btn(/^Analyze/).click();
});
await step(p, "a finished run row", async () => {
    await p.keyboard.type("PageRank");
    await sleep(400);
    await p.keyboard.press("Enter");
    await sleep(600);
    await p.getByRole("button", { name: "Run", exact: true }).first().click();
    await sleep(3500);
});
await step(p, "Style tab with a label line", async () => {
    await p.getByRole("treeitem").filter({ hasText: "Everything" }).first().click();
    await p.getByRole("tab", { name: "Style" }).first().click();
    await btn("Add label line").click();
    await p.getByRole("option", { name: "name", exact: true }).first().click();
});
await step(p, "find box with results open", async () => {
    await p.evaluate(() => document.activeElement?.blur());
    await p.keyboard.press("/");
    await sleep(400);
    await p.keyboard.type("Javert");
});
await step(p, "a node's Values with its neighbors", async () => {
    await p.keyboard.press("ArrowDown");
    await p.keyboard.press("Enter");
    await sleep(600);
    await p.getByText("Degree", { exact: true }).first().click();
});
await step(p, "Export Image", () => p.keyboard.press("Control+e"));
await step(p, "Export Data", () => p.getByRole("dialog").getByText("Data", { exact: true }).first().click());
await step(p, "Data page", async () => {
    await p.keyboard.press("Escape");
    await btn("Data").click();
});
await step(p, "Save as", async () => {
    await btn("Graph").click();
    await p.keyboard.press("Control+s");
});
await p.context().close();
// 3. the refusal of a broken file
p = await fresh();
await btn("No thanks").click();
await step(p, "refusal of a broken file", async () => {
    const fc = p.waitForEvent("filechooser");
    await btn("Open project or file...").click();
    await (await fc).setFiles(join(FILES, "club-members.graphml"));
    await sleep(4000);
});
await browser.close();
http.close();

const build = readFileSync(join(dist, "index.html"), "utf8").match(/<meta name="graphty-build" content="([^"]*)"/)?.[1];
const bad = (v) => v.impact === "serious" || v.impact === "critical";
const failing = Object.values(screens).flat().filter(bad);
const missed = log.filter((l) => l.startsWith("MISS"));
await mkdir(out, { recursive: true });
await writeFile(
    join(out, "bars.json"),
    JSON.stringify({ build, measured: new Date().toISOString(), tags: TAGS, screens, wordsAtRest: rest }, null, 1) +
        "\n",
);
console.log(`build ${build}`);
console.log(log.join("\n"));
console.log("\nbar 8 (axe), per screen: serious or critical / all violations");
for (const [name, vs] of Object.entries(screens))
    console.log(
        `  ${name}: ${vs.filter(bad).length} / ${vs.length}${vs.length ? "  (" + vs.map((v) => `${v.id} ${v.impact} x${v.nodes.length}`).join(", ") + ")" : ""}`,
    );
console.log(
    `bar 9: ${rest.words.length} app words at rest (target <= 50); ${rest.left.length} data words and numbers left out`,
);
console.log(`  ${rest.words.join(" ")}`);
console.log(`\n${join(out, "bars.json")}`);
process.exit(failing.length || rest.words.length > 50 || missed.length ? 1 : 0);
