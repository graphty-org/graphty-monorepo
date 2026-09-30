// Load one story N times and report the largest distance of any node from its data.position.
// usage: node fixed-probe.mjs <storybook> <story-id> <runs>
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";
const [dir, id, runs = "10"] = process.argv.slice(2);
const s = createServer(async (req, res) => {
    try {
        let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
        if (p === "/") p = "/index.html";
        const f = join(dir, p);
        if ((await stat(f)).isDirectory()) throw new Error();
        res.writeHead(200, {
            "Content-Type":
                { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" }[
                    extname(f)
                ] ?? "application/octet-stream",
        });
        res.end(await readFile(f));
    } catch {
        res.writeHead(404);
        res.end();
    }
});
await new Promise((r) => s.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
for (let i = 0; i < Number(runs); i++) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    await page.goto(`http://127.0.0.1:${s.address().port}/iframe.html?id=${id}&viewMode=story`);
    await page.waitForTimeout(6000);
    const r = await page.evaluate(() => {
        const g = document.querySelector("graphty-element")?.graph;
        let worst = 0,
            n = 0;
        for (const x of g.getDataManager().nodes.values()) {
            const p = x.data.position;
            if (!p) continue;
            n++;
            const d = Math.hypot(x.mesh.position.x - p.x, x.mesh.position.y - p.y, x.mesh.position.z - (p.z ?? 0));
            worst = Math.max(worst, d);
        }
        return { n, worst };
    });
    console.log(JSON.stringify({ run: i, ...r }));
    await page.close();
}
await browser.close();
s.close();
