#!/usr/bin/env node
// Checks prototype pages against WCAG 2.2 AA with axe-core, in light and dark.
//
//   node kit/a11y.mjs screens/start-screen.html flows/export.html   (paths relative to prototype/)
//   node kit/a11y.mjs --all                                          (every storyboard, flow, screen, study and kit page)
//   node kit/a11y.mjs --json out.json screens/x.html                 (also write the full result)
//
// Prints "page theme rule count: first example" per problem and a total. Landmark rules
// (region, landmark-*) are skipped: a page that shows several app frames side by side repeats
// main and nav by design. Exit code 1 when anything else is found.
process.env.FC_FONTATIONS = "1"; // headless Chromium crashes on startup on this host without it

import { createServer } from "node:http";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const proto = resolve(here, "..");
const repo = resolve(proto, "../../..");
const { chromium } = await import(resolve(repo, "node_modules/playwright/index.mjs"));
const pnpm = resolve(repo, "node_modules/.pnpm");
const axeDir = (await readdir(pnpm)).filter((d) => d.startsWith("axe-core@")).sort().pop();
const axeSrc = await readFile(join(pnpm, axeDir, "node_modules/axe-core/axe.min.js"), "utf8");

const args = process.argv.slice(2);
let json = null;
const pages = [];
for (let i = 0; i < args.length; i++) {
    if (args[i] === "--json") json = args[++i];
    else if (args[i] === "--all") {
        for (const dir of ["storyboards", "flows", "screens"]) {
            for (const f of (await readdir(join(proto, dir))).sort()) {
                if (f.endsWith(".html") && !f.endsWith(".template.html")) pages.push(`${dir}/${f}`);
            }
        }
        pages.push("index.html", "kit/template.html", "kit/index.html", "kit/canvas.html", "study/index.html", "study/style-stack-arm-a.html", "study/style-stack-arm-b.html");
    } else pages.push(args[i].replace(/^\.?\/?/, ""));
}
if (!pages.length) {
    console.error("usage: node kit/a11y.mjs [--json out.json] (--all | page.html ...)");
    process.exit(2);
}

const SKIP = new Set(["region", "landmark-one-main", "landmark-no-duplicate-main", "landmark-unique", "landmark-main-is-top-level", "landmark-complementary-is-top-level", "landmark-no-duplicate-banner", "landmark-no-duplicate-contentinfo"]);
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, "");
    const file = join(proto, path || "index.html");
    if (!file.startsWith(proto)) return res.writeHead(403).end();
    try {
        res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(await readFile(file));
    } catch {
        res.writeHead(404).end();
    }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
const all = [];
let total = 0;
try {
    for (const theme of ["light", "dark"]) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
        for (const p of pages) {
            const page = await context.newPage();
            await page.goto(base + p, { waitUntil: "networkidle" });
            await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
            await page.addScriptTag({ content: axeSrc });
            const found = await page.evaluate(async () => {
                const r = await window.axe.run(document, {
                    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
                    resultTypes: ["violations"],
                });
                // A target partly under an open menu is not a problem: the menu the reader opened
                // covers it until Esc or an outside click closes the menu.
                const underMenu = (n) => {
                    const rel = (n.any[0] || {}).relatedNodes || [];
                    return rel.length > 0 && rel.every((x) => document.querySelector(x.target.join(" "))?.closest("[role=menu], .k-menu"));
                };
                return r.violations.map((v) => ({ ...v, nodes: v.id === "target-size" ? v.nodes.filter((n) => !underMenu(n)) : v.nodes })).filter((v) => v.nodes.length).map((v) => ({
                    id: v.id,
                    nodes: v.nodes.map((n) => ({ target: n.target.join(" "), html: n.html.slice(0, 200), message: (n.any[0] || n.all[0] || n.none[0] || {}).message })),
                }));
            });
            for (const v of found.filter((v) => !SKIP.has(v.id))) {
                total += v.nodes.length;
                console.log(`${p} ${theme} ${v.id} ${v.nodes.length}: ${v.nodes[0].message ?? ""} ${v.nodes[0].html}`);
            }
            all.push({ page: p, theme, violations: found });
            await page.close();
        }
        await context.close();
    }
} finally {
    await browser.close();
    server.close();
}
console.log(`${total} problem${total === 1 ? "" : "s"} on ${pages.length} page${pages.length === 1 ? "" : "s"}, light and dark`);
if (json) await writeFile(json, JSON.stringify(all, null, 1));
if (total) process.exitCode = 1;
