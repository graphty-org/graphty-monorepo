// results-probe.mjs <sbA> <sbB> <prefix> : for every story whose id starts with <prefix>, read the
// finished algorithm runs (graph, node and edge values) from each build and print where they differ.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";
const [A, B, prefix] = process.argv.slice(2);
const T = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".csv": "text/csv",
    ".wasm": "application/wasm",
};
const serve = (dir) =>
    new Promise((r) => {
        const s = createServer(async (q, res) => {
            try {
                let p = normalize(decodeURIComponent(new URL(q.url, "http://x").pathname));
                if (p === "/") p = "/index.html";
                const f = join(dir, p);
                if ((await stat(f)).isDirectory()) throw 0;
                res.writeHead(200, { "Content-Type": T[extname(f)] ?? "application/octet-stream" });
                res.end(await readFile(f));
            } catch {
                res.writeHead(404);
                res.end();
            }
        });
        s.listen(0, "127.0.0.1", () => r(s.address().port));
    });
const ids = Object.values(JSON.parse(readFileSync(join(B, "index.json"), "utf8")).entries)
    .filter((e) => e.type === "story" && e.id.startsWith(prefix))
    .map((e) => e.id);
const pa = await serve(A),
    pb = await serve(B);
const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
async function read(port, id) {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${id}&viewMode=story`, { waitUntil: "load" });
    await page.waitForTimeout(7000);
    const runs = await page
        .evaluate(() => {
            const s = document.querySelector("graphty-element")?.session;
            if (!s) return null;
            return s.runs
                .list()
                .filter((e) => e.status === "succeeded")
                .map((e) => ({
                    algorithm: e.algorithm,
                    graph: e.result?.graph ?? null,
                    nodes: Object.fromEntries(s.data.nodes().map((n) => [String(n.id), e.result?.node(n.id) ?? null])),
                    edges: Object.fromEntries(
                        s.data.edges().map((d, i) => [`${d.source}->${d.target}#${i}`, e.result?.edge(d.id) ?? null]),
                    ),
                }));
        })
        .catch((err) => String(err));
    await ctx.close();
    return runs;
}
const j = (x) => JSON.stringify(x);
for (const id of ids) {
    const a = await read(pa, id),
        b = await read(pb, id);
    if (!Array.isArray(a) || !Array.isArray(b)) {
        console.log(id, "no session", j(a)?.slice(0, 80), j(b)?.slice(0, 80));
        continue;
    }
    const out = [];
    for (const ra of a) {
        const rb = b.find((x) => x.algorithm === ra.algorithm);
        if (!rb) {
            out.push(`${ra.algorithm}: missing on B`);
            continue;
        }
        const g = Object.keys({ ...ra.graph, ...rb.graph })
            .filter((k) => j(ra.graph?.[k]) !== j(rb.graph?.[k]))
            .map((k) => `${k}: ${j(ra.graph?.[k])} -> ${j(rb.graph?.[k])}`);
        const dn = Object.keys({ ...ra.nodes, ...rb.nodes }).filter((k) => j(ra.nodes[k]) !== j(rb.nodes[k]));
        const de = Object.keys({ ...ra.edges, ...rb.edges }).filter((k) => j(ra.edges[k]) !== j(rb.edges[k]));
        out.push(
            `${ra.algorithm}: graph ${g.length ? g.join("; ").slice(0, 400) : "same"}; nodes ${dn.length}/${Object.keys(ra.nodes).length} differ${
                dn.length
                    ? " e.g. " +
                      dn
                          .slice(0, 2)
                          .map((k) => `${k} ${j(ra.nodes[k])} -> ${j(rb.nodes[k])}`)
                          .join(" | ")
                          .slice(0, 300)
                    : ""
            }; edges ${de.length}/${Object.keys(ra.edges).length} differ${
                de.length
                    ? " e.g. " +
                      de
                          .slice(0, 8)
                          .map((k) => `${k} ${j(ra.edges[k])} -> ${j(rb.edges[k])}`)
                          .join(" | ")
                          .slice(0, 900)
                    : ""
            }`,
        );
    }
    console.log(id, "|", out.join(" || "));
}
await browser.close();
process.exit(0);
