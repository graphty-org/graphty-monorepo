// For every story in two built Storybooks: which edges share an ordered endpoint pair (parallel
// edges), their rank and count, and where their drawn mesh sits. Prints one JSON line per story
// that has any parallel edge on either side, then a summary.
// usage: node parallel-probe.mjs <storybook-a> <storybook-b> [--add story,story]
// --add: in each named story, add two more copies of its first edge through graph.addEdges, then probe
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const [dirA, dirB, flag, list] = process.argv.slice(2);
const ADD = flag === "--add" ? list.split(",") : null;
const TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".wasm": "application/wasm",
    ".csv": "text/csv",
    ".svg": "image/svg+xml",
    ".png": "image/png",
};
function serve(dir) {
    const s = createServer(async (req, res) => {
        try {
            let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
            if (p === "/") p = "/index.html";
            const f = join(dir, p);
            if ((await stat(f)).isDirectory()) throw new Error("dir");
            res.writeHead(200, { "Content-Type": TYPES[extname(f)] ?? "application/octet-stream" });
            res.end(await readFile(f));
        } catch {
            res.writeHead(404);
            res.end();
        }
    });
    return new Promise((r) => s.listen(0, "127.0.0.1", () => r([s, s.address().port])));
}
const idsOf = async (d) =>
    Object.values(JSON.parse(await readFile(join(d, "index.json"), "utf8")).entries)
        .filter((e) => e.type === "story")
        .map((e) => e.id);
const [sa, pa] = await serve(dirA);
const [sb, pb] = await serve(dirB);
const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

async function probe(port, id) {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
    const page = await ctx.newPage();
    await page
        .goto(`http://127.0.0.1:${port}/iframe.html?id=${id}&viewMode=story`, { waitUntil: "load", timeout: 30000 })
        .catch(() => {});
    await page.waitForTimeout(5000);
    if (ADD) {
        await page.evaluate(async () => {
            const g = document.querySelector("graphty-element").graph;
            const e = [...g.getDataManager().edges.values()][0];
            await g.addEdges([
                { src: e.srcId, dst: e.dstId },
                { src: e.srcId, dst: e.dstId },
            ]);
        });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `parallel-${port === pa ? "base" : "head"}-${id}.png` });
    }
    const r = await page
        .evaluate(() => {
            const out = [];
            let edges = 0;
            for (const el of document.querySelectorAll("graphty-element")) {
                const g = el.graph;
                const map = g?.getDataManager?.().edges;
                if (!map) continue;
                const f = (v) => +v.toFixed(3);
                for (const e of map.values()) {
                    edges++;
                    if (e.parallelCount < 2) continue;
                    const m = e.mesh;
                    let box = null;
                    try {
                        m?.computeWorldMatrix?.(true);
                        const b = m?.getBoundingInfo?.().boundingBox;
                        if (b) box = [...b.minimumWorld.asArray(), ...b.maximumWorld.asArray()].map(f);
                    } catch {}
                    out.push({
                        src: String(e.srcId),
                        dst: String(e.dstId),
                        rank: e.parallelRank,
                        count: e.parallelCount,
                        box,
                    });
                }
            }
            return { edges, parallel: out };
        })
        .catch((err) => ({ error: String(err) }));
    await ctx.close();
    return r;
}
const ids = ADD ?? [...new Set([...(await idsOf(dirA)), ...(await idsOf(dirB))])];
let withParallel = 0;
let differing = 0;
for (const id of ids) {
    const a = await probe(pa, id);
    const b = await probe(pb, id);
    const has = (a.parallel?.length ?? 0) + (b.parallel?.length ?? 0) > 0;
    if (!has) continue;
    withParallel++;
    const same = JSON.stringify(a.parallel) === JSON.stringify(b.parallel);
    if (!same) differing++;
    console.log(JSON.stringify({ id, same, a, b }));
}
console.log(JSON.stringify({ stories: ids.length, withParallel, differing }));
await browser.close();
sa.close();
sb.close();
