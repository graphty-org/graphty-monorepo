// results-probe.mjs <sbA> <sbB> <prefix> : for every story whose id starts with <prefix>, read every
// algorithm run (status, graph, node and edge values) from each build and print where they differ.
// Runs pair up by algorithm name and by their place among that algorithm's runs, and every run of
// either build is reported: a run on one side only, a status that differs, or no runs at all.
// results-probe.mjs --self-test checks the comparison itself.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";
const j = (x) => JSON.stringify(x);
/** Key every run by algorithm name and its place among that algorithm's runs ("prim#0"). */
function keyed(runs) {
    const seen = new Map();
    return new Map(
        runs.map((r) => {
            const n = seen.get(r.algorithm) ?? 0;
            seen.set(r.algorithm, n + 1);
            return [`${r.algorithm}#${n}`, r];
        }),
    );
}
/** One line per run of either build; says so when neither build has a run. */
export function compareRuns(a, b) {
    const ka = keyed(a),
        kb = keyed(b);
    const keys = [...new Set([...ka.keys(), ...kb.keys()])];
    if (keys.length === 0) return ["no runs on either build"];
    return keys.map((k) => {
        const ra = ka.get(k),
            rb = kb.get(k);
        if (!ra) return `${k}: only on B (${rb.status})`;
        if (!rb) return `${k}: only on A (${ra.status})`;
        if (ra.status !== rb.status) return `${k}: status ${ra.status} -> ${rb.status}`;
        const g = Object.keys({ ...ra.graph, ...rb.graph })
            .filter((x) => j(ra.graph?.[x]) !== j(rb.graph?.[x]))
            .map((x) => `${x}: ${j(ra.graph?.[x])} -> ${j(rb.graph?.[x])}`);
        const dn = Object.keys({ ...ra.nodes, ...rb.nodes }).filter((x) => j(ra.nodes[x]) !== j(rb.nodes[x]));
        const de = Object.keys({ ...ra.edges, ...rb.edges }).filter((x) => j(ra.edges[x]) !== j(rb.edges[x]));
        const eg = (keysList, left, right, n, len) =>
            keysList.length
                ? " e.g. " +
                  keysList
                      .slice(0, n)
                      .map((x) => `${x} ${j(left[x])} -> ${j(right[x])}`)
                      .join(" | ")
                      .slice(0, len)
                : "";
        return `${k} ${ra.status}: graph ${g.length ? g.join("; ").slice(0, 400) : "same"}; nodes ${dn.length}/${Object.keys(ra.nodes).length} differ${eg(dn, ra.nodes, rb.nodes, 2, 300)}; edges ${de.length}/${Object.keys(ra.edges).length} differ${eg(de, ra.edges, rb.edges, 8, 900)}`;
    });
}
if (process.argv[2] === "--self-test") {
    const { strict: assert } = await import("node:assert");
    const run = (algorithm, status = "succeeded", v = 1) => ({
        algorithm,
        status,
        graph: {},
        nodes: { x: v },
        edges: {},
    });
    assert.deepEqual(compareRuns([], []), ["no runs on either build"]);
    assert.match(compareRuns([], [run("p")])[0], /^p#0: only on B \(succeeded\)$/);
    assert.match(compareRuns([run("p")], [])[0], /^p#0: only on A/);
    assert.match(compareRuns([run("p", "failed")], [run("p")])[0], /^p#0: status failed -> succeeded$/);
    const two = compareRuns([run("p"), run("p", "succeeded", 2)], [run("p"), run("p", "succeeded", 3)]);
    assert.equal(two.length, 2);
    assert.match(two[0], /nodes 0\/1 differ/);
    assert.match(two[1], /^p#1 succeeded: .*nodes 1\/1 differ/);
    console.log("self-test passed");
    process.exit(0);
}
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
            return s.runs.list().map((e) => ({
                algorithm: e.algorithm,
                status: e.status,
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
for (const id of ids) {
    const a = await read(pa, id),
        b = await read(pb, id);
    if (!Array.isArray(a) || !Array.isArray(b)) {
        console.log(id, "no session", j(a)?.slice(0, 80), j(b)?.slice(0, 80));
        continue;
    }
    console.log(id, "|", compareRuns(a, b).join(" || "));
}
await browser.close();
process.exit(0);
